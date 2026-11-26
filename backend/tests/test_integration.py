"""The real models on real pixels. Needs `python scripts/fetch_models.py` first."""

from pathlib import Path

import cv2
import numpy as np
import pytest

from frt_api.analyzer import EMOTIONS, MOODS, RACES, FaceAnalyzer, decode_image

BACKEND = Path(__file__).parent.parent
MODELS = BACKEND / "models"
PORTRAIT = Path(__file__).parent / "fixtures" / "portrait.jpg"

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        not (MODELS / "fairface.onnx").exists(),
        reason="models not downloaded; run: python scripts/fetch_models.py",
    ),
]


@pytest.fixture(scope="module")
def analyzer() -> FaceAnalyzer:
    return FaceAnalyzer(MODELS)


@pytest.fixture(scope="module")
def portrait() -> np.ndarray:
    return decode_image(PORTRAIT.read_bytes())


def test_portrait_yields_one_analysed_face(analyzer: FaceAnalyzer, portrait: np.ndarray) -> None:
    size, faces = analyzer.analyze(portrait)

    assert (size.width, size.height) == (512, 512)
    assert len(faces) == 1
    face = faces[0]
    assert 0 <= face.box.x <= 512 - face.box.width
    assert 0 <= face.box.y <= 512 - face.box.height
    assert 0.6 <= face.score <= 1.0

    attributes = face.attributes
    assert attributes is not None
    assert attributes.gender.label == "female"
    assert 15 <= attributes.age.estimate <= 50
    assert attributes.race.label in RACES
    assert attributes.emotion.label in EMOTIONS
    assert attributes.mood.label in MOODS
    # She is smiling broadly; the calibrated reading should say so with some conviction.
    assert attributes.mood.label == "up"
    assert attributes.mood.confidence > 0.6
    for confidence in (
        attributes.age.confidence,
        attributes.gender.confidence,
        attributes.race.confidence,
        attributes.emotion.confidence,
        attributes.mood.confidence,
    ):
        assert 0 < confidence <= 1


def test_image_without_a_face_yields_no_faces(analyzer: FaceAnalyzer) -> None:
    size, faces = analyzer.analyze(np.zeros((480, 640, 3), np.uint8))

    assert (size.width, size.height) == (640, 480)
    assert faces == []


def test_boxes_are_in_the_coordinates_of_the_upload(
    analyzer: FaceAnalyzer, portrait: np.ndarray
) -> None:
    _, [small] = analyzer.analyze(portrait)
    big_image = cv2.resize(portrait, (1600, 1600))
    size, [big] = analyzer.analyze(big_image)

    assert (size.width, size.height) == (1600, 1600)
    factor = 1600 / 512
    for small_centre, big_centre in (
        (small.box.x + small.box.width / 2, big.box.x + big.box.width / 2),
        (small.box.y + small.box.height / 2, big.box.y + big.box.height / 2),
    ):
        assert big_centre == pytest.approx(small_centre * factor, abs=0.05 * 1600)


def test_only_the_largest_face_is_analysed(analyzer: FaceAnalyzer, portrait: np.ndarray) -> None:
    small_copy = cv2.resize(portrait, (256, 256))
    canvas = np.zeros((512, 768, 3), np.uint8)
    canvas[:, :512] = portrait
    canvas[:256, 512:] = small_copy

    _, faces = analyzer.analyze(canvas)

    assert len(faces) == 2
    areas = [face.box.width * face.box.height for face in faces]
    assert areas == sorted(areas, reverse=True)
    assert faces[0].attributes is not None
    assert faces[1].attributes is None


def test_detect_finds_the_same_face_without_reading_it(
    analyzer: FaceAnalyzer, portrait: np.ndarray
) -> None:
    size, [found] = analyzer.detect(portrait)
    _, [analysed] = analyzer.analyze(portrait)

    assert (size.width, size.height) == (512, 512)
    assert found.box == analysed.box
    assert found.score == analysed.score
    assert found.attributes is None


def test_detect_reports_every_face_largest_first(
    analyzer: FaceAnalyzer, portrait: np.ndarray
) -> None:
    canvas = np.zeros((512, 768, 3), np.uint8)
    canvas[:, :512] = portrait
    canvas[:256, 512:] = cv2.resize(portrait, (256, 256))

    _, faces = analyzer.detect(canvas)

    assert len(faces) == 2
    assert faces[0].box.width > faces[1].box.width
    assert all(face.attributes is None for face in faces)


@pytest.mark.parametrize("shape", [(1, 1300, 3), (1, 3000, 3), (3000, 1, 3), (1, 1, 3)])
def test_sliver_of_an_image_is_analysed_without_crashing(
    analyzer: FaceAnalyzer, shape: tuple[int, int, int]
) -> None:
    size, faces = analyzer.analyze(np.zeros(shape, np.uint8))

    assert (size.height, size.width) == shape[:2]
    assert faces == []


def test_missing_models_name_the_fetch_script(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError, match="fetch_models.py"):
        FaceAnalyzer(tmp_path)


def test_the_real_app_loads_its_models_at_startup_and_analyses_the_portrait(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi.testclient import TestClient

    from frt_api.main import create_app

    monkeypatch.setenv("FRT_MODELS_DIR", str(MODELS))
    with TestClient(create_app()) as client:
        response = client.post(
            "/analyze", content=PORTRAIT.read_bytes(), headers={"Content-Type": "image/jpeg"}
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body["faces"]) == 1
    assert body["faces"][0]["attributes"]["gender"]["label"] == "female"
    assert body["ad_set"] in {"16-17", "18-25", "26-40", "41+"}
    assert len(body["ads"]) == 2
