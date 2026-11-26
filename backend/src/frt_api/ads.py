"""Ad targeting: the model and the rules.

Two rules, behind one interface. :class:`AgeTargeting` picks from the ad set
for the viewer's age. :class:`MoodTargeting` does the same, then leans towards
ads pitched at the viewer's mood and swaps in the slogan written for it.

The data lives in :mod:`frt_api.ad_catalogue`. This module only knows what
valid data looks like and how to pick from it.
"""

import math
import random
from bisect import bisect_right
from collections.abc import Iterable, Iterator, Mapping
from dataclasses import dataclass, replace
from enum import StrEnum
from itertools import pairwise
from typing import Protocol

ADS_PER_VIEWER = 2
# A mood is targeted only when the reading is more likely right than wrong. The
# confidence it is compared with is calibrated (see analyzer._MOOD_CALIBRATION).
MIN_MOOD_CONFIDENCE = 0.5


class Mood(StrEnum):
    """What an advertiser would do with an emotion: comfort, soothe or celebrate."""

    LOW = "low"
    TENSE = "tense"
    UP = "up"


def read_mood(label: str, confidence: float) -> Mood | None:
    """The mood worth targeting, or None for a neutral, unknown or doubtful reading."""
    if confidence < MIN_MOOD_CONFIDENCE or label not in Mood:
        return None
    return Mood(label)


@dataclass(frozen=True, slots=True)
class Ad:
    id: str  # also the stem of its picture, which the frontend owns
    label: str


@dataclass(frozen=True, slots=True)
class AgeBand:
    """A range of ages in whole years, both ends included. No ``oldest`` means no upper end."""

    youngest: int
    oldest: int | None

    def __post_init__(self) -> None:
        if self.youngest < 0:
            raise ValueError(f"an age band cannot start below 0, got {self.youngest}")
        if self.oldest is not None and self.oldest < self.youngest:
            raise ValueError(f"age band ends ({self.oldest}) before it starts ({self.youngest})")

    @property
    def key(self) -> str:
        """The band's public name, as it appears in the API: ``"16-17"``, ``"41+"``."""
        return f"{self.youngest}+" if self.oldest is None else f"{self.youngest}-{self.oldest}"

    def __contains__(self, years: int) -> bool:
        return self.youngest <= years and (self.oldest is None or years <= self.oldest)


@dataclass(frozen=True, slots=True)
class AdSet:
    """The ads an advertiser would show to one age band."""

    band: AgeBand
    ads: tuple[Ad, ...]

    def __post_init__(self) -> None:
        if len(self.ads) < ADS_PER_VIEWER:
            raise ValueError(f"ad set {self.band.key} needs at least {ADS_PER_VIEWER} ads")
        if len({ad.id for ad in self.ads}) != len(self.ads):
            raise ValueError(f"ad set {self.band.key} lists an ad more than once")


@dataclass(frozen=True, slots=True)
class Viewer:
    """What the models read off a face, as far as targeting cares."""

    age: float
    mood: Mood | None = None


@dataclass(frozen=True, slots=True)
class Targeting:
    """What one viewer is shown, and what it was chosen for."""

    ad_set: str
    mood: Mood | None  # None when mood played no part
    ads: tuple[Ad, ...]


class AdCatalogue:
    """Ad sets whose bands cover every age from birth, each age exactly once.

    That is checked on construction, so a catalogue with a gap, an overlap or a
    missing end cannot exist, and looking up an age cannot fail.
    """

    def __init__(self, ad_sets: Iterable[AdSet]) -> None:
        ordered = tuple(sorted(ad_sets, key=lambda ad_set: ad_set.band.youngest))
        if not ordered:
            raise ValueError("a catalogue needs at least one ad set")
        if ordered[0].band.youngest != 0:
            raise ValueError("the catalogue must start at age 0")
        for younger, older in pairwise(ordered):
            if younger.band.oldest is None or older.band.youngest != younger.band.oldest + 1:
                raise ValueError(
                    f"gap or overlap between ad sets {younger.band.key} and {older.band.key}"
                )
        if ordered[-1].band.oldest is not None:
            raise ValueError("the oldest ad set must be open-ended")
        self._ad_sets = ordered
        self._starts = [ad_set.band.youngest for ad_set in ordered]

    def __iter__(self) -> Iterator[AdSet]:
        return iter(self._ad_sets)

    def for_age(self, age: float) -> AdSet:
        """The ad set for an estimated age.

        The estimate is rounded down: a face judged 17.5 is treated as a minor
        and never lands in the set with tobacco, gambling and spirits.
        """
        years = max(0, math.floor(age))
        return self._ad_sets[bisect_right(self._starts, years) - 1]


class TargetingRule(Protocol):
    """A way of choosing ads for a viewer. The API depends on this, not on a rule."""

    def target(self, viewer: Viewer) -> Targeting: ...


class AgeTargeting:
    """Two ads at random from the set for the viewer's age."""

    def __init__(self, catalogue: AdCatalogue, rng: random.Random | None = None) -> None:
        self._catalogue = catalogue
        self._rng = rng or random.Random()

    def target(self, viewer: Viewer) -> Targeting:
        ad_set = self._catalogue.for_age(viewer.age)
        ads = self._rng.sample(ad_set.ads, ADS_PER_VIEWER)
        return Targeting(ad_set=ad_set.band.key, mood=None, ads=tuple(ads))


# For each mood, the slogan written for an ad: mood -> ad id -> slogan.
MoodPitches = Mapping[Mood, Mapping[str, str]]


class MoodTargeting:
    """Age chooses the set; mood chooses within it and rewrites the slogan.

    Ads with a slogan for the viewer's mood come first, in random order, then
    the rest. Mood never widens the choice beyond the age set, so it cannot
    bring a minor an ad their age band does not have.
    """

    def __init__(
        self, catalogue: AdCatalogue, pitches: MoodPitches, rng: random.Random | None = None
    ) -> None:
        known = {ad.id for ad_set in catalogue for ad in ad_set.ads}
        unknown = {ad_id for slogans in pitches.values() for ad_id in slogans} - known
        if unknown:
            raise ValueError(f"mood slogans for ads not in the catalogue: {sorted(unknown)}")
        self._catalogue = catalogue
        self._pitches = pitches
        self._rng = rng or random.Random()
        self._by_age = AgeTargeting(catalogue, self._rng)

    def target(self, viewer: Viewer) -> Targeting:
        if viewer.mood is None:
            return self._by_age.target(viewer)
        ad_set = self._catalogue.for_age(viewer.age)
        slogans = self._pitches.get(viewer.mood, {})
        pitched = [ad for ad in ad_set.ads if ad.id in slogans]
        ordinary = [ad for ad in ad_set.ads if ad.id not in slogans]
        self._rng.shuffle(pitched)
        self._rng.shuffle(ordinary)
        chosen = (pitched + ordinary)[:ADS_PER_VIEWER]
        return Targeting(
            ad_set=ad_set.band.key,
            mood=viewer.mood,
            ads=tuple(replace(ad, label=slogans.get(ad.id, ad.label)) for ad in chosen),
        )
