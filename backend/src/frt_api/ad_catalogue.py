"""The invented ads: who is shown what, and what they are told.

Pure data: to change the targeting, edit this file. What valid data looks like
is enforced by :mod:`frt_api.ads` when the app starts.

``CATALOGUE`` (ads by age band) is carried over unchanged from v1.
``MOOD_PITCHES`` is new in v2; v1 left it as a TODO ("for different emotions use
the same files but with different labels").
"""

from frt_api.ads import Ad, AdCatalogue, AdSet, AgeBand, Mood, MoodPitches


def _ad_set(youngest: int, oldest: int | None, *ads: tuple[str, str]) -> AdSet:
    return AdSet(AgeBand(youngest, oldest), tuple(Ad(id, label) for id, label in ads))


CATALOGUE = AdCatalogue(
    [
        _ad_set(
            0,
            10,
            ("fastfood", "Too delicious to be true!"),
            ("sweets", "Sweeter than fruits!"),
            ("toys", "Never get bored again"),
            ("mobilegame", "Start now and get 100 coins for free!"),
        ),
        _ad_set(
            11,
            15,
            ("fastfood", "Too delicious to be true!"),
            ("sweets", "Lift your spirits!"),
            ("mobilegame", "Start now and get 100 coins free!"),
            ("tech", "No one can beat your new Smartphone!"),
            ("sweater", "Catch everyone's attention!"),
        ),
        _ad_set(
            16,
            17,
            ("mobilegame", "Start now and get 100 coins free!"),
            ("tech", "No one can beat your new Smartphone!"),
            ("sweater", "Catch everyone's attention!"),
            ("beer", "Wanna be cool?"),
            ("alcopop", "Lots of fun: Just like you."),
            ("fastfood", "Too delicious to be true!"),
            ("sweets", "Lift your spirits!"),
            ("wine", "Special moments call for special drinks:"),
        ),
        _ad_set(
            18,
            25,
            ("tech", "No one can beat your new Smartphone!"),
            ("sweater", "Catch everyone's attention!"),
            ("beer", "Share a cold one!"),
            ("alcopop", "Lots of fun: Just like you."),
            ("wine", "Special moments call for special drinks:"),
            ("cigarettes", "Best friendships start with this:"),
            ("vape", "Join the trend with style"),
            ("hardliqueur", "Get the party to the next level!"),
            ("gambling", "Start now and double your money in a week!"),
            ("fastfood", "Best. Taste. Ever."),
            ("sweets", "Lift your spirits!"),
            ("mobilegame", "Start now and get 100 coins free!"),
            ("cbd", "Open your mind with us:"),
        ),
        _ad_set(
            26,
            40,
            ("beer", "Cold one after work?"),
            ("wine", "Enter the weekend with style"),
            ("mobilegame", "Start now and get 100 coins free!"),
            ("vape", "Time to give up cigarettes?"),
            ("sweets", "Your friend's kid would love it..."),
            ("fastfood", "You don't have to cook, save your precious time:"),
            ("tech", "Chips that actually improve your life."),
            ("hardliqueur", "On the rocks?"),
            ("sweater", "Your new charming and cozy knitted favorite:"),
            ("gambling", "Start now and double your money in a week!"),
            ("cbd", "Soothe your mind and be happier!"),
            ("cigarettes", "Faithful companion:"),
            ("car", "Freedom to go wherever you please, whenever:"),
            ("workout", "Get in the best shape of your life"),
        ),
        _ad_set(
            41,
            None,
            ("beer", "Cold one after work?"),
            ("wine", "Enter the weekend with style"),
            ("mobilegame", "Start now and get 100 coins free!"),
            ("vape", "Time to give up cigarettes?"),
            ("sweets", "Your friend's kid would love it..."),
            ("fastfood", "You don't have to cook, save your precious time:"),
            ("tech", "Chips that actually improve your life."),
            ("hardliqueur", "On the rocks?"),
            ("sweater", "Your new charming and cozy knitted favorite:"),
            ("gambling", "Invest your money now, never too late"),
            ("cbd", "Soothe your mind and be happier!"),
            ("cigarettes", "Faithful companion:"),
            ("car", "Freedom to go wherever you please, whenever:"),
            ("medicine", "A magical cure!"),
            ("workout", "Get in the best shape of your life"),
        ),
    ]
)

# The same product, a different line, depending on the mood read off the face.
# An ad with no line for a mood keeps its ordinary slogan and is shown less.
MOOD_PITCHES: MoodPitches = {
    # Sad or afraid: sell comfort.
    Mood.LOW: {
        "sweets": "Feeling down? Something sweet helps.",
        "fastfood": "Bad day? You deserve a treat.",
        "toys": "A friend who is always there.",
        "mobilegame": "Forget everything for a while.",
        "tech": "Treat yourself. You need it.",
        "sweater": "Wrap yourself in comfort.",
        "beer": "Rough day? Take the edge off.",
        "alcopop": "Turn that frown upside down.",
        "wine": "Unwind. You have earned a glass.",
        "hardliqueur": "Leave the day behind.",
        "cigarettes": "Take a moment for yourself.",
        "vape": "Breathe out the stress.",
        "cbd": "Calm is one drop away.",
        "gambling": "Your luck is about to change.",
        "car": "Drive away from it all.",
        "medicine": "Feel like yourself again.",
        "workout": "Sweat it out. Feel better.",
    },
    # Angry, disgusted or contemptuous: sell release.
    Mood.TENSE: {
        "sweets": "Something sweet to cool down.",
        "fastfood": "Hangry? Fixed in five minutes.",
        "toys": "Squeeze tight. Feel better.",
        "mobilegame": "Smash something. Virtually.",
        "tech": "Tune them all out.",
        "beer": "Let it go. Have a cold one.",
        "hardliqueur": "Cool down. On the rocks.",
        "cigarettes": "Step outside. Light one.",
        "vape": "Breathe. Just breathe.",
        "cbd": "Take the edge off.",
        "gambling": "Show them who wins.",
        "car": "Leave them all behind.",
        "workout": "Angry? Take it out on the weights.",
    },
    # Happy or surprised: sell the impulse.
    Mood.UP: {
        "sweets": "Share the joy. Share the sweets.",
        "fastfood": "Celebrate with the big menu.",
        "toys": "More fun. More friends.",
        "mobilegame": "On a roll? Keep winning.",
        "tech": "You deserve the upgrade.",
        "sweater": "Look as good as you feel.",
        "beer": "Good mood? Make it a round.",
        "alcopop": "Keep the party going!",
        "wine": "Celebrate. Open the good bottle.",
        "hardliqueur": "Make tonight unforgettable.",
        "gambling": "Feeling lucky? You are.",
        "car": "You are glowing. Drive like it.",
        "workout": "Ride the high. Go further.",
    },
}
