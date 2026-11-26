import random
from collections.abc import Iterator

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from frt_api.ad_catalogue import CATALOGUE, MOOD_PITCHES
from frt_api.ads import MoodTargeting
from frt_api.main import MAX_UPLOAD_BYTES, create_app
from frt_api.schemas import Age, AgeBracket, Attributes, Box, Face, ImageSize, Label


def _png(width: int = 8, height: int = 6) -> bytes:
    ok, encoded = cv2.imencode(".png", np.zeros((height, width, 3), np.uint8))
    assert ok
    return encoded.tobytes()


def _face(age: float, mood: str = "up", sure: float = 0.8) -> Face:
    return Face(
        box=Box(x=1, y=2, width=3, height=4),
        score=0.9,
        attributes=Attributes(
            age=Age(estimate=age, bracket=AgeBracket(min=30, max=39), confidence=0.7),
            gender=Label(label="female", confidence=0.99),
            race=Label(label="East Asian", confidence=0.8),
            emotion=Label(label="happiness", confidence=0.4),
            mood=Label(label=mood, confidence=sure),
        ),
    )


class FakeAnalyzer:
    def __init__(self, faces: list[Face] | None = None, error: Exception | None = None) -> None:
        self.faces = faces or []
        self.error = error
        self.calls = 0
        self.detections = 0

    def analyze(self, image: np.ndarray) -> tuple[ImageSize, list[Face]]:
        self.calls += 1
        if self.error:
            raise self.error
        height, width = image.shape[:2]
        return ImageSize(width=width, height=height), self.faces

    def detect(self, image: np.ndarray) -> tuple[ImageSize, list[Face]]:
        self.detections += 1
        if self.error:
            raise self.error
        height, width = image.shape[:2]
        bare = [face.model_copy(update={"attributes": None}) for face in self.faces]
        return ImageSize(width=width, height=height), bare


def _client(analyzer: FakeAnalyzer) -> TestClient:
    targeter = MoodTargeting(CATALOGUE, MOOD_PITCHES, random.Random(0))
    return TestClient(create_app(analyzer, targeter), raise_server_exceptions=False)


def _post(client: TestClient, body: bytes, content_type: str | None = "image/png"):  # type: ignore[no-untyped-def]
    headers = {"Content-Type": content_type} if content_type else {}
    return client.post("/analyze", content=body, headers=headers)


def test_health() -> None:
    response = _client(FakeAnalyzer()).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_a_face_comes_back_with_attributes_and_targeted_ads() -> None:
    response = _post(_client(FakeAnalyzer([_face(30)])), _png(8, 6))

    assert response.status_code == 200
    body = response.json()
    assert body["image"] == {"width": 8, "height": 6}
    assert body["faces"] == [
        {
            "box": {"x": 1, "y": 2, "width": 3, "height": 4},
            "score": 0.9,
            "attributes": {
                "age": {"estimate": 30, "bracket": {"min": 30, "max": 39}, "confidence": 0.7},
                "gender": {"label": "female", "confidence": 0.99},
                "race": {"label": "East Asian", "confidence": 0.8},
                "emotion": {"label": "happiness", "confidence": 0.4},
                "mood": {"label": "up", "confidence": 0.8},
            },
        }
    ]
    assert body["ad_set"] == "26-40"
    assert body["mood"] == "up"
    assert len(body["ads"]) == 2
    assert body["ads"][0] != body["ads"][1]
    in_the_set = {ad.id for ad in CATALOGUE.for_age(30).ads}
    for ad in body["ads"]:
        assert ad["id"] in in_the_set
        assert ad["label"] == MOOD_PITCHES["up"][ad["id"]]


def test_a_neutral_or_unsure_reading_is_targeted_by_age_alone() -> None:
    for mood, sure in (("neutral", 0.9), ("tense", 0.3)):
        body = _post(_client(FakeAnalyzer([_face(30, mood, sure)])), _png()).json()

        assert body["mood"] is None
        ordinary = [{"id": ad.id, "label": ad.label} for ad in CATALOGUE.for_age(30).ads]
        assert all(ad in ordinary for ad in body["ads"])


def test_a_sad_face_is_pitched_comfort() -> None:
    body = _post(_client(FakeAnalyzer([_face(30, "low", 0.7)])), _png()).json()

    assert body["mood"] == "low"
    assert all(ad["label"] == MOOD_PITCHES["low"][ad["id"]] for ad in body["ads"])


def test_a_seventeen_and_a_half_year_old_gets_the_minors_set() -> None:
    body = _post(_client(FakeAnalyzer([_face(17.5)])), _png()).json()
    assert body["ad_set"] == "16-17"


def test_no_face_means_no_ads() -> None:
    response = _post(_client(FakeAnalyzer()), _png())

    assert response.status_code == 200
    body = response.json()
    assert body["faces"] == []
    assert body["ads"] == []
    assert body["ad_set"] is None
    assert body["mood"] is None


@pytest.mark.parametrize("content_type", ["text/plain", "application/json", "image/gif", None])
def test_unsupported_content_type_is_refused(content_type: str | None) -> None:
    analyzer = FakeAnalyzer()
    assert _post(_client(analyzer), _png(), content_type).status_code == 415
    assert analyzer.calls == 0


@pytest.mark.parametrize("content_type", ["image/jpeg", "image/png", "image/webp"])
def test_content_type_parameters_and_case_are_tolerated(content_type: str) -> None:
    response = _post(_client(FakeAnalyzer()), _png(), content_type.upper() + "; charset=binary")
    assert response.status_code == 200


def test_upload_over_the_limit_is_refused() -> None:
    analyzer = FakeAnalyzer()
    response = _post(_client(analyzer), b"x" * (MAX_UPLOAD_BYTES + 1))
    assert response.status_code == 413
    assert analyzer.calls == 0


def test_upload_exactly_at_the_limit_is_read() -> None:
    # Junk, so it fails to decode, but it was not refused for size.
    assert _post(_client(FakeAnalyzer()), b"x" * MAX_UPLOAD_BYTES).status_code == 422


def test_oversized_upload_without_a_content_length_is_cut_off() -> None:
    def chunks() -> Iterator[bytes]:
        for _ in range(MAX_UPLOAD_BYTES // 65536 + 2):
            yield b"x" * 65536

    analyzer = FakeAnalyzer()
    response = _client(analyzer).post(
        "/analyze", content=chunks(), headers={"Content-Type": "image/png"}
    )
    assert response.status_code == 413
    assert analyzer.calls == 0


@pytest.mark.parametrize("body", [b"definitely not an image", b""])
def test_undecodable_body_is_refused(body: bytes) -> None:
    analyzer = FakeAnalyzer()
    assert _post(_client(analyzer), body, "image/jpeg").status_code == 422
    assert analyzer.calls == 0


def test_default_cors_allows_the_local_dev_server() -> None:
    response = _client(FakeAnalyzer()).options(
        "/analyze",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_origins_come_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FRT_CORS_ORIGINS", "https://a.example, https://b.example")
    client = _client(FakeAnalyzer())

    allowed = _post_from(client, "https://b.example")
    refused = _post_from(client, "http://localhost:5173")

    assert allowed.headers["access-control-allow-origin"] == "https://b.example"
    assert "access-control-allow-origin" not in refused.headers


def _post_from(client: TestClient, origin: str):  # type: ignore[no-untyped-def]
    return client.post(
        "/analyze", content=_png(), headers={"Content-Type": "image/png", "Origin": origin}
    )


def test_analyser_failure_is_a_generic_500_the_browser_can_read() -> None:
    client = _client(FakeAnalyzer(error=RuntimeError("secret internal detail")))

    response = _post_from(client, "http://localhost:5173")

    assert response.status_code == 500
    assert "secret internal detail" not in response.text
    assert response.json() == {"detail": "analysis failed"}
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_openapi_documents_the_binary_request_body() -> None:
    schema = _client(FakeAnalyzer()).get("/openapi.json").json()
    content = schema["paths"]["/analyze"]["post"]["requestBody"]["content"]
    assert set(content) == {"image/jpeg", "image/png", "image/webp"}


def test_images_are_decoded_one_at_a_time(monkeypatch: pytest.MonkeyPatch) -> None:
    # A decoded image is tens of megabytes. Decoding every queued request at
    # once would multiply that by the number of requests in flight.
    import threading
    import time

    import frt_api.main

    decoding = 0
    most_at_once = 0
    counter = threading.Lock()
    real_decode = frt_api.main.decode_image

    def slow_decode(data: bytes) -> np.ndarray:
        nonlocal decoding, most_at_once
        with counter:
            decoding += 1
            most_at_once = max(most_at_once, decoding)
        time.sleep(0.02)
        with counter:
            decoding -= 1
        return real_decode(data)

    monkeypatch.setattr(frt_api.main, "decode_image", slow_decode)
    client = _client(FakeAnalyzer())
    body = _png()

    threads = [threading.Thread(target=_post, args=(client, body)) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert most_at_once == 1


def _detect(client: TestClient, body: bytes, content_type: str | None = "image/png"):  # type: ignore[no-untyped-def]
    headers = {"Content-Type": content_type} if content_type else {}
    return client.post("/detect", content=body, headers=headers)


def test_detect_returns_where_the_faces_are_and_nothing_else() -> None:
    analyzer = FakeAnalyzer([_face(30)])

    response = _detect(_client(analyzer), _png(8, 6))

    assert response.status_code == 200
    assert response.json() == {
        "image": {"width": 8, "height": 6},
        "faces": [{"box": {"x": 1, "y": 2, "width": 3, "height": 4}, "score": 0.9}],
    }
    assert analyzer.detections == 1
    assert analyzer.calls == 0  # the slow models were not run


def test_detect_with_no_face_is_an_empty_list() -> None:
    assert _detect(_client(FakeAnalyzer()), _png()).json()["faces"] == []


def test_detect_refuses_what_analyze_refuses() -> None:
    client = _client(FakeAnalyzer())

    assert _detect(client, _png(), "text/plain").status_code == 415
    assert _detect(client, b"x" * (MAX_UPLOAD_BYTES + 1)).status_code == 413
    assert _detect(client, b"not an image", "image/jpeg").status_code == 422


def test_detect_failure_is_a_generic_500() -> None:
    response = _detect(_client(FakeAnalyzer(error=RuntimeError("secret detail"))), _png())

    assert response.status_code == 500
    assert response.json() == {"detail": "detection failed"}


class TestTheApiPrefix:
    """Behind CloudFront the API is routed by path, so it must answer under /api unchanged."""

    def test_health_answers_under_api(self) -> None:
        response = _client(FakeAnalyzer()).get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_analyze_answers_under_api(self) -> None:
        response = _client(FakeAnalyzer([_face(30)])).post(
            "/api/analyze", content=_png(), headers={"Content-Type": "image/png"}
        )
        assert response.status_code == 200
        assert response.json()["ad_set"] == "26-40"

    def test_detect_answers_under_api(self) -> None:
        response = _client(FakeAnalyzer([_face(30)])).post(
            "/api/detect", content=_png(), headers={"Content-Type": "image/png"}
        )
        assert response.status_code == 200
        assert len(response.json()["faces"]) == 1

    def test_errors_are_the_same_under_api(self) -> None:
        response = _client(FakeAnalyzer()).post(
            "/api/analyze", content=b"x", headers={"Content-Type": "text/plain"}
        )
        assert response.status_code == 415

    def test_the_documentation_lists_each_route_once(self) -> None:
        schema = _client(FakeAnalyzer()).get("/openapi.json").json()
        assert set(schema["paths"]) == {"/health", "/analyze", "/detect"}
