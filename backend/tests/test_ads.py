import random

import pytest

from frt_api.ad_catalogue import CATALOGUE, MOOD_PITCHES
from frt_api.ads import (
    Ad,
    AdCatalogue,
    AdSet,
    AgeBand,
    AgeTargeting,
    Mood,
    MoodTargeting,
    Viewer,
    read_mood,
)

V1_IMAGE_STEMS = {
    "alcopop", "beer", "car", "cbd", "cigarettes", "fastfood", "gambling", "hardliqueur",
    "medicine", "mobilegame", "sweater", "sweets", "tech", "toys", "vape", "wine", "workout",
}  # fmt: skip

A, B, C = Ad("a", "A!"), Ad("b", "B!"), Ad("c", "C!")


def _set(youngest: int, oldest: int | None) -> AdSet:
    return AdSet(AgeBand(youngest, oldest), (A, B))


class TestAgeBand:
    def test_closed_band_is_named_by_its_ends(self) -> None:
        assert AgeBand(16, 17).key == "16-17"

    def test_open_band_is_named_with_a_plus(self) -> None:
        assert AgeBand(41, None).key == "41+"

    def test_contains_both_of_its_ends_and_nothing_outside(self) -> None:
        band = AgeBand(11, 15)
        assert [years in band for years in (10, 11, 15, 16)] == [False, True, True, False]

    def test_open_band_contains_every_older_age(self) -> None:
        assert 150 in AgeBand(41, None)
        assert 40 not in AgeBand(41, None)

    @pytest.mark.parametrize(("youngest", "oldest"), [(-1, 5), (10, 9)])
    def test_impossible_band_is_refused(self, youngest: int, oldest: int) -> None:
        with pytest.raises(ValueError):
            AgeBand(youngest, oldest)


class TestAdSet:
    def test_needs_enough_ads_to_show_two(self) -> None:
        with pytest.raises(ValueError, match="at least 2"):
            AdSet(AgeBand(0, None), (A,))

    def test_refuses_the_same_ad_twice(self) -> None:
        with pytest.raises(ValueError, match="more than once"):
            AdSet(AgeBand(0, None), (A, B, Ad("a", "A again")))


class TestAdCatalogue:
    def test_accepts_sets_in_any_order(self) -> None:
        catalogue = AdCatalogue([_set(18, None), _set(0, 17)])
        assert [ad_set.band.key for ad_set in catalogue] == ["0-17", "18+"]

    def test_refuses_a_gap_between_bands(self) -> None:
        with pytest.raises(ValueError, match="gap or overlap"):
            AdCatalogue([_set(0, 10), _set(12, None)])

    def test_refuses_overlapping_bands(self) -> None:
        with pytest.raises(ValueError, match="gap or overlap"):
            AdCatalogue([_set(0, 10), _set(10, None)])

    def test_must_start_at_birth(self) -> None:
        with pytest.raises(ValueError, match="start at age 0"):
            AdCatalogue([_set(3, None)])

    def test_must_have_no_oldest_age(self) -> None:
        with pytest.raises(ValueError, match="open-ended"):
            AdCatalogue([_set(0, 99)])

    def test_only_the_last_band_may_be_open_ended(self) -> None:
        with pytest.raises(ValueError, match="gap or overlap"):
            AdCatalogue([_set(0, None), _set(18, None)])

    def test_refuses_to_be_empty(self) -> None:
        with pytest.raises(ValueError):
            AdCatalogue([])

    @pytest.mark.parametrize(
        ("age", "key"),
        [
            (0, "0-10"), (10, "0-10"), (10.9, "0-10"), (-3, "0-10"),
            (11, "11-15"), (15.9, "11-15"),
            (16, "16-17"), (17.5, "16-17"), (17.99, "16-17"),
            (18, "18-25"), (25.9, "18-25"),
            (26, "26-40"), (40.5, "26-40"),
            (41, "41+"), (99, "41+"), (150, "41+"),
        ],
    )  # fmt: skip
    def test_age_is_rounded_down_into_its_band(self, age: float, key: str) -> None:
        assert CATALOGUE.for_age(age).band.key == key


class TestReadMood:
    @pytest.mark.parametrize(
        ("label", "mood"), [("low", Mood.LOW), ("tense", Mood.TENSE), ("up", Mood.UP)]
    )
    def test_a_mood_the_model_is_probably_right_about_is_targeted(
        self, label: str, mood: Mood
    ) -> None:
        assert read_mood(label, 0.8) is mood

    def test_a_neutral_face_has_no_mood_to_exploit(self) -> None:
        assert read_mood("neutral", 0.9) is None

    def test_a_reading_more_likely_wrong_than_right_is_ignored(self) -> None:
        assert read_mood("tense", 0.49) is None
        assert read_mood("tense", 0.5) is Mood.TENSE

    def test_a_mood_it_does_not_know_is_ignored(self) -> None:
        assert read_mood("bored", 0.9) is None


class TestAgeTargeting:
    def test_picks_two_different_ads_from_the_matching_set(self) -> None:
        targeting = AgeTargeting(CATALOGUE, random.Random(0)).target(Viewer(age=30))

        assert targeting.ad_set == "26-40"
        assert len(targeting.ads) == 2
        assert targeting.ads[0] != targeting.ads[1]
        assert set(targeting.ads) <= set(CATALOGUE.for_age(30).ads)

    def test_is_reproducible_for_a_seed(self) -> None:
        first = AgeTargeting(CATALOGUE, random.Random(7)).target(Viewer(age=20))
        second = AgeTargeting(CATALOGUE, random.Random(7)).target(Viewer(age=20))
        assert first == second

    def test_draws_afresh_on_every_call(self) -> None:
        rule = AgeTargeting(CATALOGUE, random.Random(1))
        assert len({rule.target(Viewer(age=30)).ads for _ in range(20)}) > 1

    def test_takes_no_notice_of_mood(self) -> None:
        targeting = AgeTargeting(CATALOGUE, random.Random(0)).target(Viewer(30, Mood.LOW))

        assert targeting.mood is None
        assert set(targeting.ads) <= set(CATALOGUE.for_age(30).ads)


SMALL = AdCatalogue([AdSet(AgeBand(0, None), (A, B, C))])


class TestMoodTargeting:
    def test_without_a_mood_it_targets_by_age_alone(self) -> None:
        rule = MoodTargeting(CATALOGUE, MOOD_PITCHES, random.Random(0))

        targeting = rule.target(Viewer(age=30))

        assert targeting.mood is None
        assert targeting.ad_set == "26-40"
        assert set(targeting.ads) <= set(CATALOGUE.for_age(30).ads)

    def test_prefers_ads_pitched_at_the_mood_and_uses_their_slogan(self) -> None:
        rule = MoodTargeting(SMALL, {Mood.LOW: {"a": "Sad? A.", "c": "Sad? C."}}, random.Random(0))

        for _ in range(20):
            targeting = rule.target(Viewer(age=30, mood=Mood.LOW))
            assert targeting.mood is Mood.LOW
            assert set(targeting.ads) == {Ad("a", "Sad? A."), Ad("c", "Sad? C.")}

    def test_fills_up_with_an_ordinary_ad_when_only_one_is_pitched(self) -> None:
        rule = MoodTargeting(SMALL, {Mood.UP: {"b": "Happy? B."}}, random.Random(0))

        targeting = rule.target(Viewer(age=30, mood=Mood.UP))

        assert Ad("b", "Happy? B.") in targeting.ads
        assert len(set(targeting.ads)) == 2
        assert set(targeting.ads) - {Ad("b", "Happy? B.")} <= {A, C}

    def test_still_reports_the_mood_when_nothing_is_pitched_at_it(self) -> None:
        targeting = MoodTargeting(SMALL, {}, random.Random(0)).target(Viewer(30, Mood.TENSE))

        assert targeting.mood is Mood.TENSE
        assert set(targeting.ads) <= {A, B, C}
        assert len(set(targeting.ads)) == 2

    def test_is_reproducible_for_a_seed(self) -> None:
        viewer = Viewer(age=22, mood=Mood.UP)
        first = MoodTargeting(CATALOGUE, MOOD_PITCHES, random.Random(3)).target(viewer)
        second = MoodTargeting(CATALOGUE, MOOD_PITCHES, random.Random(3)).target(viewer)
        assert first == second

    def test_refuses_a_slogan_for_an_ad_the_catalogue_does_not_have(self) -> None:
        with pytest.raises(ValueError, match="nope"):
            MoodTargeting(SMALL, {Mood.LOW: {"nope": "?"}})


class TestTheCatalogueCarriedOverFromV1:
    def test_has_v1s_six_bands_and_set_sizes(self) -> None:
        assert [(s.band.key, len(s.ads)) for s in CATALOGUE] == [
            ("0-10", 4), ("11-15", 5), ("16-17", 8), ("18-25", 13), ("26-40", 14), ("41+", 15),
        ]  # fmt: skip

    def test_every_ad_has_a_picture_and_a_slogan(self) -> None:
        for ad_set in CATALOGUE:
            for ad in ad_set.ads:
                assert ad.id in V1_IMAGE_STEMS
                assert ad.label.strip()

    def test_minors_are_not_offered_tobacco_gambling_or_spirits(self) -> None:
        restricted = {"cigarettes", "vape", "hardliqueur", "gambling", "cbd"}
        for ad_set in CATALOGUE:
            if ad_set.band.key in ("0-10", "11-15", "16-17"):
                assert not restricted & {ad.id for ad in ad_set.ads}


class TestMoodPitches:
    def test_every_mood_has_slogans_and_only_for_real_ads(self) -> None:
        assert set(MOOD_PITCHES) == set(Mood)
        for slogans in MOOD_PITCHES.values():
            assert set(slogans) <= V1_IMAGE_STEMS
            assert all(slogan.strip() for slogan in slogans.values())

    def test_every_age_band_has_two_ads_for_every_mood(self) -> None:
        # Otherwise the mood would change nothing for that band.
        for ad_set in CATALOGUE:
            for mood, slogans in MOOD_PITCHES.items():
                pitched = [ad for ad in ad_set.ads if ad.id in slogans]
                assert len(pitched) >= 2, (ad_set.band.key, mood)

    @pytest.mark.parametrize("mood", list(Mood))
    def test_mood_never_brings_minors_tobacco_gambling_or_spirits(self, mood: Mood) -> None:
        restricted = {"cigarettes", "vape", "hardliqueur", "gambling", "cbd"}
        rule = MoodTargeting(CATALOGUE, MOOD_PITCHES, random.Random(0))
        for age in (5, 13, 16, 17.9):
            for _ in range(50):
                shown = {ad.id for ad in rule.target(Viewer(age, mood)).ads}
                assert not restricted & shown
