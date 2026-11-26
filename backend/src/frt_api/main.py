"""The HTTP surface: one stateless endpoint that analyses one image.

Nothing is stored. The upload lives in memory for the length of the request and
is never written to disk or logged.
"""

import logging
import os
import threading
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Protocol

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from frt_api.ad_catalogue import CATALOGUE, MOOD_PITCHES
from frt_api.ads import MoodTargeting, TargetingRule, Viewer, read_mood
from frt_api.analyzer import FaceAnalyzer, Image, InvalidImage, decode_image
from frt_api.schemas import (
    AdOut,
    AnalyzeResponse,
    DetectedFace,
    DetectResponse,
    Face,
    ImageSize,
)

MAX_UPLOAD_BYTES = 2 * 1024 * 1024
ACCEPTED_TYPES = ("image/jpeg", "image/png", "image/webp")
DEFAULT_CORS_ORIGINS = "http://localhost:5173"
API_PREFIX = "/api"

logger = logging.getLogger(__name__)


class Analyzer(Protocol):
    def analyze(self, image: Image) -> tuple[ImageSize, list[Face]]: ...

    def detect(self, image: Image) -> tuple[ImageSize, list[Face]]: ...


async def _read_capped(request: Request) -> bytes:
    """Read the body, giving up as soon as it is known to exceed the limit."""
    too_large = HTTPException(413, f"image larger than {MAX_UPLOAD_BYTES} bytes")
    declared = request.headers.get("content-length", "")
    if declared.isdigit() and int(declared) > MAX_UPLOAD_BYTES:
        raise too_large
    body = bytearray()
    async for chunk in request.stream():
        body += chunk
        if len(body) > MAX_UPLOAD_BYTES:
            raise too_large
    return bytes(body)


_ERRORS: dict[int | str, dict[str, Any]] = {
    413: {"description": "Image larger than 2 MB"},
    415: {"description": "Not JPEG, PNG or WebP"},
    422: {"description": "Body is not a decodable image"},
    500: {"description": "Analysis failed"},
}
_BINARY_BODY = {
    "requestBody": {
        "required": True,
        "content": {
            kind: {"schema": {"type": "string", "format": "binary"}} for kind in ACCEPTED_TYPES
        },
    }
}


def create_app(analyzer: Analyzer | None = None, targeter: TargetingRule | None = None) -> FastAPI:
    """Build the app.

    Tests inject a fake ``analyzer`` and a seeded ``targeter``; production loads
    the models at startup and targets by age and mood from the built-in catalogue.
    """
    rule = targeter or MoodTargeting(CATALOGUE, MOOD_PITCHES)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        if analyzer is None:  # loaded at startup, not import, so tooling can import the app
            app.state.analyzer = FaceAnalyzer(Path(os.environ.get("FRT_MODELS_DIR", "models")))
        yield

    app = FastAPI(
        title="FRT in Advertising API",
        version="2.0.0",
        summary="Guess age, gender, race and emotion from a face, and the ads that would follow.",
        lifespan=lifespan,
    )
    if analyzer is not None:
        app.state.analyzer = analyzer
    origins = os.environ.get("FRT_CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    # ponytail: one image decoded and analysed at a time. A decoded upload is
    # tens of megabytes, so decoding every queued request at once would multiply
    # that by the number in flight. Use a small semaphore if throughput matters.
    one_at_a_time = threading.Lock()

    async def faces_in(request: Request, *, read_attributes: bool) -> tuple[ImageSize, list[Face]]:
        """Check, read and decode the upload, then find its faces. Raises the HTTP errors."""
        content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
        if content_type not in ACCEPTED_TYPES:
            raise HTTPException(415, f"send one of: {', '.join(ACCEPTED_TYPES)}")
        data = await _read_capped(request)
        analyzer: Analyzer = request.app.state.analyzer

        def work() -> tuple[ImageSize, list[Face]]:
            with one_at_a_time:
                image = decode_image(data)
                return analyzer.analyze(image) if read_attributes else analyzer.detect(image)

        what = "analysis" if read_attributes else "detection"
        try:
            return await run_in_threadpool(work)
        except InvalidImage:
            raise HTTPException(422, "body is not a decodable image") from None
        except Exception:
            # Answered here, not by the server's last-resort handler, so the
            # response keeps its CORS headers and the browser can read it.
            logger.exception("%s failed", what)
            raise HTTPException(500, f"{what} failed") from None

    router = APIRouter()

    @router.get("/health")
    async def health() -> dict[str, str]:  # async: must answer even when every worker is busy
        return {"status": "ok"}

    @router.post("/analyze", responses=_ERRORS, openapi_extra=_BINARY_BODY)
    async def analyze(request: Request) -> AnalyzeResponse:
        """Analyse one image, sent as the raw request body with its own Content-Type."""
        size, faces = await faces_in(request, read_attributes=True)
        attributes = faces[0].attributes if faces else None
        if attributes is None:
            return AnalyzeResponse(image=size, faces=faces, ad_set=None, mood=None, ads=[])
        viewer = Viewer(
            age=attributes.age.estimate,
            mood=read_mood(attributes.mood.label, attributes.mood.confidence),
        )
        targeting = rule.target(viewer)
        return AnalyzeResponse(
            image=size,
            faces=faces,
            ad_set=targeting.ad_set,
            mood=targeting.mood,
            ads=[AdOut(id=ad.id, label=ad.label) for ad in targeting.ads],
        )

    @router.post("/detect", responses=_ERRORS, openapi_extra=_BINARY_BODY)
    async def detect(request: Request) -> DetectResponse:
        """Find the faces in one image and nothing more. Fast enough to follow a moving face."""
        size, faces = await faces_in(request, read_attributes=False)
        return DetectResponse(
            image=size, faces=[DetectedFace(box=face.box, score=face.score) for face in faces]
        )

    app.include_router(router)
    # The same routes again under /api. Behind CloudFront the site and the API
    # share one domain and are told apart by this prefix; answering under it
    # here means nothing between the browser and this app has to rewrite paths.
    app.include_router(router, prefix=API_PREFIX, include_in_schema=False)
    return app


app = create_app()
