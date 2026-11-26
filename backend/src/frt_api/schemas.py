"""Shapes of the API's JSON. The frontend's types in ``src/api.ts`` mirror these."""

from pydantic import BaseModel


class Box(BaseModel):
    """A face's bounding box, in pixels of the image as uploaded."""

    x: int
    y: int
    width: int
    height: int


class AgeBracket(BaseModel):
    min: int
    max: int | None  # None for the open-ended oldest bracket


class Age(BaseModel):
    estimate: float
    bracket: AgeBracket
    confidence: float


class Label(BaseModel):
    label: str
    confidence: float


class Attributes(BaseModel):
    age: Age
    gender: Label
    race: Label
    emotion: Label  # the single most likely emotion, with the model's own raw score
    mood: Label  # emotions pooled into up / low / tense / neutral, confidence calibrated


class Face(BaseModel):
    box: Box
    score: float
    attributes: Attributes | None  # only the largest face is analysed


class ImageSize(BaseModel):
    width: int
    height: int


class AdOut(BaseModel):
    id: str
    label: str


class AnalyzeResponse(BaseModel):
    image: ImageSize
    faces: list[Face]  # largest first
    ad_set: str | None  # the age band targeted, e.g. "26-40"
    mood: str | None  # the mood targeted, if any: "low", "tense" or "up"
    ads: list[AdOut]


class DetectedFace(BaseModel):
    box: Box
    score: float


class DetectResponse(BaseModel):
    image: ImageSize
    faces: list[DetectedFace]  # largest first
