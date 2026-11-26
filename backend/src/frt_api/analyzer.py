"""Turn an image into faces and the attributes a model reads off the largest one."""

import math
import threading
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort
from numpy.typing import NDArray

from frt_api.schemas import Age, AgeBracket, Attributes, Box, Face, ImageSize, Label

Image = NDArray[np.uint8]  # H x W x 3, BGR

# FairFace's nine age brackets and the midpoint used for each in the estimate.
AGE_BRACKETS: tuple[tuple[int, int | None], ...] = (
    (0, 2),
    (3, 9),
    (10, 19),
    (20, 29),
    (30, 39),
    (40, 49),
    (50, 59),
    (60, 69),
    (70, None),
)
AGE_MIDPOINTS = (1, 6, 14.5, 24.5, 34.5, 44.5, 54.5, 64.5, 75)
# Output order of each model's head.
RACES = (
    "White",
    "Black",
    "Latino/Hispanic",
    "East Asian",
    "Southeast Asian",
    "Indian",
    "Middle Eastern",
)
GENDERS = ("male", "female")
# HSEmotion's eight outputs, in order. "contempt" is never reported: on labelled
# faces it was the answer for 5 % of them and right for none, and dropping it
# lifted accuracy from 53.0 % to 55.6 %.
_EMOTION_OUTPUTS = (
    "anger",
    "contempt",
    "disgust",
    "fear",
    "happiness",
    "neutral",
    "sadness",
    "surprise",
)
EMOTIONS = tuple(emotion for emotion in _EMOTION_OUTPUTS if emotion != "contempt")
_REPORTED = [index for index, emotion in enumerate(_EMOTION_OUTPUTS) if emotion in EMOTIONS]

# The model confuses neighbouring emotions (sad with afraid, angry with
# disgusted) far more than it confuses these four groups: 66 % right as moods
# against 56 % as single emotions.
MOODS = ("up", "low", "tense", "neutral")
_MOOD_OF_EMOTION = {
    "happiness": "up",
    "surprise": "up",
    "sadness": "low",
    "fear": "low",
    "anger": "tense",
    "disgust": "tense",
    "neutral": "neutral",
}
# How far to trust a mood reading: P(right) = sigmoid(slope * raw score + offset).
# The raw score is a poor guide on its own. On 700 labelled FER2013 faces the
# model said "up" with an average score of 0.53 and was right 82 % of the time,
# and said "tense" at 0.67 and was right 53 %. These per-mood fits cut the
# calibration error on held-out faces from 0.109 to 0.037.
_MOOD_CALIBRATION = {
    "up": (8.92, -3.02),
    "low": (1.47, -0.19),
    "tense": (6.57, -4.23),
    "neutral": (4.70, -1.40),
}


MAX_SIDE = 640  # longest side fed to the models
SCORE_THRESHOLD = 0.6  # YuNet detections below this are discarded
DETECTOR = "face_detection_yunet_2023mar.onnx"
FAIRFACE = "fairface.onnx"  # race, gender and age bracket in one pass
HSEMOTION = "enet_b2_8.onnx"
_IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], np.float32)
_IMAGENET_STD = np.array([0.229, 0.224, 0.225], np.float32)


class InvalidImage(ValueError):
    """The bytes are not an image this service can decode."""


def softmax(logits: NDArray[Any]) -> NDArray[np.float64]:
    shifted = np.asarray(logits, dtype=np.float64).ravel()
    exp = np.exp(shifted - shifted.max())
    return exp / exp.sum()  # type: ignore[no-any-return]


def age_from_probs(probs: NDArray[np.float64]) -> Age:
    """Most likely bracket, plus a single number: the probability-weighted midpoint."""
    top = int(np.argmax(probs))
    low, high = AGE_BRACKETS[top]
    return Age(
        # One decimal, rounded down: 17.97 must stay seventeen, in the readout
        # and when the ad set is chosen.
        estimate=math.floor(float(probs @ np.array(AGE_MIDPOINTS)) * 10) / 10,
        bracket=AgeBracket(min=low, max=high),
        confidence=float(probs[top]),
    )


def emotion_probs(outputs: NDArray[Any]) -> NDArray[np.float64]:
    """Probabilities over ``EMOTIONS`` from the model's eight raw outputs."""
    return softmax(np.asarray(outputs).ravel()[_REPORTED])


def mood_from_probs(probs: NDArray[np.float64]) -> Label:
    """Pool emotion probabilities into a mood, with a calibrated confidence."""
    scores = dict.fromkeys(MOODS, 0.0)
    for emotion, prob in zip(EMOTIONS, probs, strict=True):
        scores[_MOOD_OF_EMOTION[emotion]] += float(prob)
    mood = max(MOODS, key=lambda name: scores[name])
    slope, offset = _MOOD_CALIBRATION[mood]
    return Label(label=mood, confidence=1 / (1 + math.exp(-(slope * scores[mood] + offset))))


def clamp_box(x: float, y: float, w: float, h: float, width: int, height: int) -> Box | None:
    """Cut a box down to the part inside a ``width`` x ``height`` image."""
    left, top = max(0, int(x)), max(0, int(y))
    right, bottom = min(width, int(x + w)), min(height, int(y + h))
    if right <= left or bottom <= top:
        return None
    return Box(x=left, y=top, width=right - left, height=bottom - top)


def scale_box(box: Box, factor: float) -> Box:
    return Box(
        x=round(box.x * factor),
        y=round(box.y * factor),
        width=round(box.width * factor),
        height=round(box.height * factor),
    )


def _is_accepted_format(data: bytes) -> bool:
    """JPEG, PNG or WebP by signature, whatever the Content-Type header claimed."""
    return (
        data.startswith(b"\xff\xd8\xff")
        or data.startswith(b"\x89PNG\r\n\x1a\n")
        or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")
    )


def decode_image(data: bytes) -> Image:
    """Decode to 3-channel BGR whatever the source's colour mode."""
    if not _is_accepted_format(data):  # keeps OpenCV's other decoders out of reach
        raise InvalidImage("not a JPEG, PNG or WebP image")
    try:
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    except cv2.error as exc:  # corrupt, or over OPENCV_IO_MAX_IMAGE_PIXELS
        raise InvalidImage(str(exc)) from exc
    if image is None:
        raise InvalidImage("not a decodable image")
    return image  # type: ignore[return-value]


def _model_input(face: Image, size: int) -> NDArray[np.float32]:
    """Resize to ``size`` squared, RGB, ImageNet-normalised, batch of one, channels first."""
    rgb = cv2.cvtColor(cv2.resize(face, (size, size)), cv2.COLOR_BGR2RGB)
    normalised = (rgb.astype(np.float32) / 255 - _IMAGENET_MEAN) / _IMAGENET_STD
    return np.transpose(normalised, (2, 0, 1))[np.newaxis].astype(np.float32)


def _top(labels: tuple[str, ...], logits: NDArray[Any]) -> Label:
    probs = softmax(logits)
    best = int(np.argmax(probs))
    return Label(label=labels[best], confidence=float(probs[best]))


class FaceAnalyzer:
    """Holds the three models; one instance serves every request."""

    def __init__(self, models_dir: Path) -> None:
        missing = [
            name for name in (DETECTOR, FAIRFACE, HSEMOTION) if not (models_dir / name).exists()
        ]
        if missing:
            raise FileNotFoundError(
                f"{', '.join(missing)} not found in {models_dir}; "
                "run: python scripts/fetch_models.py"
            )
        options = ort.SessionOptions()
        options.log_severity_level = 3  # errors only
        providers = ["CPUExecutionProvider"]
        self._detector = cv2.FaceDetectorYN.create(
            str(models_dir / DETECTOR), "", (320, 320), SCORE_THRESHOLD
        )
        self._fairface = ort.InferenceSession(str(models_dir / FAIRFACE), options, providers)
        self._emotion = ort.InferenceSession(str(models_dir / HSEMOTION), options, providers)
        # ponytail: one lock around inference. The detector is stateful, and ONNX
        # Runtime already spreads a single call over every core, so parallel calls
        # would gain little. Use a pool of analysers if throughput ever matters.
        self._lock = threading.Lock()

    def detect(self, image: Image) -> tuple[ImageSize, list[Face]]:
        """Find faces, largest first, without reading anything off them.

        A few milliseconds, against tens for :meth:`analyze`: cheap enough to
        call several times a second to follow a moving face.
        """
        return self._run(image, read_attributes=False)

    def analyze(self, image: Image) -> tuple[ImageSize, list[Face]]:
        """Find faces, largest first. Only the largest gets attributes."""
        return self._run(image, read_attributes=True)

    def _run(self, image: Image, *, read_attributes: bool) -> tuple[ImageSize, list[Face]]:
        height, width = image.shape[:2]
        factor = max(1.0, max(width, height) / MAX_SIDE)
        small = image
        if factor > 1:
            # At least one pixel each way: a 3000 x 1 sliver must not resize to nothing.
            target = (max(1, round(width / factor)), max(1, round(height / factor)))
            small = cv2.resize(image, target, interpolation=cv2.INTER_AREA)  # type: ignore[assignment]
        small_height, small_width = small.shape[:2]

        with self._lock:
            self._detector.setInputSize((small_width, small_height))
            _, detections = self._detector.detect(small)
            found: list[tuple[Box, float]] = []
            for row in detections if detections is not None else []:
                x, y, w, h = (float(value) for value in row[:4])
                box = clamp_box(x, y, w, h, small_width, small_height)
                if box is not None:
                    found.append((box, min(1.0, float(row[14]))))
            found.sort(key=lambda item: item[0].width * item[0].height, reverse=True)
            attributes = None
            if read_attributes and found:
                attributes = self._attributes(small, found[0][0])

        faces = []
        for index, (box, score) in enumerate(found):
            scaled = scale_box(box, factor)
            in_upload = clamp_box(scaled.x, scaled.y, scaled.width, scaled.height, width, height)
            faces.append(
                Face(
                    box=in_upload or scaled,
                    score=score,
                    attributes=attributes if index == 0 else None,
                )
            )
        return ImageSize(width=width, height=height), faces

    def _attributes(self, image: Image, box: Box) -> Attributes:
        # The detector's box with no padding: padding costs FairFace up to 30
        # points of race accuracy (see docs/paper/2026-update.md, section 3).
        face = image[box.y : box.y + box.height, box.x : box.x + box.width]
        race, gender, age = self._fairface.run(None, {"input": _model_input(face, 224)})
        (emotion,) = self._emotion.run(None, {"input": _model_input(face, 260)})
        emotions = emotion_probs(emotion)
        top = int(np.argmax(emotions))
        return Attributes(
            age=age_from_probs(softmax(age)),
            gender=_top(GENDERS, gender),
            race=_top(RACES, race),
            emotion=Label(label=EMOTIONS[top], confidence=float(emotions[top])),
            mood=mood_from_probs(emotions),
        )
