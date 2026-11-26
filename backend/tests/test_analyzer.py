import cv2
import numpy as np
import pytest

from frt_api.analyzer import (
    EMOTIONS,
    MOODS,
    InvalidImage,
    age_from_probs,
    clamp_box,
    decode_image,
    emotion_probs,
    mood_from_probs,
    scale_box,
    softmax,
)
from frt_api.schemas import AgeBracket, Box


def _png(pixels: np.ndarray) -> bytes:
    ok, encoded = cv2.imencode(".png", pixels)
    assert ok
    return encoded.tobytes()


def _one_hot(index: int) -> np.ndarray:
    probs = np.zeros(9)
    probs[index] = 1.0
    return probs


def test_softmax_of_equal_logits_is_uniform() -> None:
    assert softmax(np.array([0.0, 0.0])).tolist() == [0.5, 0.5]


def test_softmax_survives_large_logits() -> None:
    probs = softmax(np.array([1000.0, 0.0]))
    assert probs.sum() == pytest.approx(1.0)
    assert probs[0] == pytest.approx(1.0)


def test_age_with_all_mass_on_one_bracket() -> None:
    age = age_from_probs(_one_hot(3))
    assert age.estimate == pytest.approx(24.5)
    assert age.bracket == AgeBracket(min=20, max=29)
    assert age.confidence == pytest.approx(1.0)


def test_age_estimate_is_the_weighted_midpoint() -> None:
    probs = np.zeros(9)
    probs[2] = probs[3] = 0.5
    age = age_from_probs(probs)
    assert age.estimate == pytest.approx(19.5)
    assert age.bracket == AgeBracket(min=10, max=19)
    assert age.confidence == pytest.approx(0.5)


def test_oldest_bracket_has_no_upper_bound() -> None:
    assert age_from_probs(_one_hot(8)).bracket == AgeBracket(min=70, max=None)


def test_box_past_the_top_left_is_clamped() -> None:
    assert clamp_box(-10, -5, 50, 50, 100, 100) == Box(x=0, y=0, width=40, height=45)


def test_box_past_the_bottom_right_is_clamped() -> None:
    assert clamp_box(90, 90, 50, 50, 100, 100) == Box(x=90, y=90, width=10, height=10)


def test_box_entirely_outside_is_dropped() -> None:
    assert clamp_box(120, 10, 30, 30, 100, 100) is None


def test_scale_box_maps_model_coordinates_back_to_the_upload() -> None:
    assert scale_box(Box(x=10, y=20, width=30, height=40), 2.0) == Box(
        x=20, y=40, width=60, height=80
    )


def test_garbage_is_not_an_image() -> None:
    with pytest.raises(InvalidImage):
        decode_image(b"not an image")


def test_empty_bytes_are_not_an_image() -> None:
    with pytest.raises(InvalidImage):
        decode_image(b"")


def test_greyscale_decodes_to_three_channels() -> None:
    assert decode_image(_png(np.zeros((2, 2), np.uint8))).shape == (2, 2, 3)


def test_transparent_png_decodes_to_three_channels() -> None:
    assert decode_image(_png(np.zeros((2, 2, 4), np.uint8))).shape == (2, 2, 3)


def test_small_file_that_decodes_to_a_huge_image_is_rejected() -> None:
    bomb = _png(np.zeros((6000, 6000), np.uint8))
    assert len(bomb) < 2 * 1024 * 1024
    with pytest.raises(InvalidImage):
        decode_image(bomb)


def test_importing_the_package_after_cv2_fails_loudly() -> None:
    # OpenCV reads its decode size limit once, at import. Imported first, it
    # would run without the limit, so the package refuses to load.
    import subprocess
    import sys

    result = subprocess.run(
        [sys.executable, "-c", "import cv2, frt_api"], capture_output=True, text=True
    )

    assert result.returncode != 0
    assert "import frt_api before cv2" in result.stderr


def test_image_over_twelve_megapixels_is_rejected() -> None:
    with pytest.raises(InvalidImage):
        decode_image(_png(np.zeros((3000, 4100), np.uint8)))


def test_twelve_megapixel_photo_is_accepted() -> None:
    assert decode_image(_png(np.zeros((3000, 4000), np.uint8))).shape == (3000, 4000, 3)


@pytest.mark.parametrize("extension", [".bmp", ".tiff"])
def test_formats_the_api_does_not_accept_are_not_decoded(extension: str) -> None:
    ok, encoded = cv2.imencode(extension, np.zeros((4, 4, 3), np.uint8))
    assert ok
    with pytest.raises(InvalidImage):
        decode_image(encoded.tobytes())


@pytest.mark.parametrize("extension", [".jpg", ".png", ".webp"])
def test_the_three_accepted_formats_decode(extension: str) -> None:
    ok, encoded = cv2.imencode(extension, np.zeros((4, 4, 3), np.uint8))
    assert ok
    assert decode_image(encoded.tobytes()).shape == (4, 4, 3)


def test_age_estimate_is_never_rounded_up_across_a_birthday() -> None:
    # Raw estimate 17.97: shown and targeted as seventeen, not eighteen.
    probs = np.zeros(9)
    probs[2], probs[3] = 0.653, 0.347
    assert age_from_probs(probs).estimate == pytest.approx(17.9)


def _emotions(**probs: float) -> np.ndarray:
    return np.array([probs.get(emotion, 0.0) for emotion in EMOTIONS])


class TestEmotionProbs:
    def test_contempt_is_never_reported(self) -> None:
        # Model order: anger, contempt, disgust, fear, happiness, neutral, sadness, surprise.
        contempt_wins = np.array([0.0, 9.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0])

        probs = emotion_probs(contempt_wins)

        assert "contempt" not in EMOTIONS
        assert len(probs) == len(EMOTIONS) == 7
        assert probs.sum() == pytest.approx(1.0)
        assert EMOTIONS[int(probs.argmax())] == "happiness"


class TestMoodFromProbs:
    def test_emotions_are_pooled_into_four_moods(self) -> None:
        assert MOODS == ("up", "low", "tense", "neutral")
        assert mood_from_probs(_emotions(happiness=0.4, surprise=0.3, sadness=0.3)).label == "up"
        assert mood_from_probs(_emotions(sadness=0.3, fear=0.3, happiness=0.4)).label == "low"
        assert mood_from_probs(_emotions(anger=0.3, disgust=0.3, happiness=0.4)).label == "tense"
        assert mood_from_probs(_emotions(neutral=0.6, happiness=0.4)).label == "neutral"

    def test_a_happy_reading_is_trusted_more_than_its_raw_score(self) -> None:
        # On labelled faces "up" is right 4 times in 5 even at a raw score of 0.5.
        mood = mood_from_probs(
            _emotions(happiness=0.35, surprise=0.15, sadness=0.5 / 2, fear=0.5 / 2)
        )
        assert mood.label == "up"
        assert mood.confidence == pytest.approx(0.81, abs=0.02)

    def test_an_angry_reading_is_trusted_less_than_its_raw_score(self) -> None:
        # On labelled faces "tense" at a raw score of 0.5 is right about 1 time in 4.
        mood = mood_from_probs(_emotions(anger=0.3, disgust=0.2, happiness=0.3, neutral=0.2))
        assert mood.label == "tense"
        assert mood.confidence == pytest.approx(0.28, abs=0.02)

    def test_a_strong_laugh_reads_as_nearly_certain(self) -> None:
        assert (
            mood_from_probs(_emotions(happiness=0.6, surprise=0.15, neutral=0.25)).confidence > 0.95
        )

    def test_confidence_stays_a_probability(self) -> None:
        for emotion in EMOTIONS:
            assert 0 < mood_from_probs(_emotions(**{emotion: 1.0})).confidence < 1
