"""The Reading's spread (data/reading_spread.json), read by ui/reading.gd.

Derek, 2026-10-09: "come up with a way to weave a story from the card draw and how they lay/formation and let the
player interact with them more, hide the plus minus and other stats. We want this to be blind ... The only one they'll
know for sure is the class." So: one deck, the twenty-two mantles of the bible (mythology/07-who-is-who.md, the
"cards" of data/reading.json); a spread laid like a body on the cloth; for each place three cards drawn blind from
the fanned deck and turned over, one of them chosen, landing upright or reversed; the Stranger speaks to each card in its place, and at
the end weaves the whole spread into one telling. What each card does in each place stays hidden (ui/reading.gd takes
it from the old pools of data/reading.json, by card and place and which way up).

The Stranger's words are in tools/reading/words.py (third pass, 2026-10-10: the lowland rhyme to open, the bridges
between the draws, a reversal line of its own for every card, every card's reading in every place with its subtext).

  python tools/reading/spread_data.py
"""
import os
import json
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import words as W  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# the places of the spread, in the order they are drawn (the crown is the calling, face up from the start)
PLACES = [
    dict(id="brow", name="The Brow", what=W.PLACE_WHAT["brow"], pool="cards"),
    dict(id="heart", name="The Heart", what=W.PLACE_WHAT["heart"], pool="seeks"),
    dict(id="lhand", name="The Left Hand", what=W.PLACE_WHAT["lhand"], pool="answers"),
    dict(id="rhand", name="The Right Hand", what=W.PLACE_WHAT["rhand"], pool="sacs"),
    dict(id="belly", name="The Belly", what=W.PLACE_WHAT["belly"], pool="fears"),
    dict(id="feet", name="The Feet", what=W.PLACE_WHAT["feet"], pool="roads"),
    dict(id="under", name="Under You, in the Red", what=W.PLACE_WHAT["under"], pool="cards"),
]

# the mantles: the bible's phrase for each (who wears it upright, and reversed), its aspect (the card faces' sigils,
# tools/reading/card_fronts.py), and who wears it now; the last two (his old lines) are kept for the record only
M = [
    ("unwritten", "silence", "the one who ends the turn", "the one who begins the next", "nobody yet",
     "Nothing on it. Good. It'll write itself in somebody else's hand.",
     "Turned over and still blank. That's the worst kind of full."),
    ("pilgrim", "silence", "the one who walks and does not know why", "the one who has stopped", "the pilgrim",
     "The Pilgrim. Walking. Doesn't know where. Never stopped one yet.",
     "Stopped. Sat down by the road. They do that, near the end. Or the start."),
    ("digger", "bone", "the one who buries", "the one who digs them up", "the Ossuary Matron",
     "The Hands. It's buried more than it remembers. The hands remember.",
     "Digging the other way now. Up. Mind what comes up with it."),
    ("veil", "soul", "the one drawn to the light that burns it", "the one already burned", "the moths with the pale faces",
     "The Singed Veil. Goes to every light that burns it. The moths have the right of it.",
     "Already burned. Not much left to be drawn to anything."),
    ("swaddling", "flesh", "the one who is carried", "the knife that cut the cloth", "every child the Deep asks for",
     "The Swaddling. Carried. Somebody's always carried, on the Hide. Somebody always carries.",
     "The knife that cut the cloth. Somebody had to."),
    ("gleaner", "bone", "the one who ends", "the one who keeps it under", "Old Scythe, in its pit",
     "The Gleaner. Old Scythe. Comes round once an age, and never misses one.",
     "The one who keeps the Gleaner under. Heavy work. Counted work."),
    ("saint", "flesh", "the one who suffers to be believed", "the crowd that came to watch", "the girl in the iron",
     "The Weeping Saint. Suffers, so it's believed. Works every time.",
     "The crowd that came to watch her. Always a crowd. Never a face in it."),
    ("scholar", "soul", "the one who reads until it is read", "the eyes in the Needle", "the Citadel's oldest reader",
     "The Scholar's Eye. Reads until it's read. Careful what it reads here.",
     "The eyes in the Needle. Don't look back at them. ...It looked."),
    ("hanged", "soul", "the one a breath behind", "the one a breath ahead", "the Drowned Twin",
     "The Hanged Twin. A breath behind it, on the far side of every still water.",
     "A breath ahead. That one's worse. It knows where it's going."),
    ("knot", "flesh", "the one that eats to keep", "the one that is eaten", "the Second Mouth",
     "The Knot of Mouths. Eats to keep. Keeps to eat. Round it goes.",
     "The one that's eaten. Someone has to be the meal."),
    ("wick", "breath", "the one that burns down to give light", "the dark at the edge of the light", "every soul in a lantern",
     "The Wick. Burns down for a little light. Every lantern's got one in it.",
     "The dark at the edge of the light. Always just there. Patient."),
    ("mourner", "flesh", "the one who cuts her hair", "the one who is mourned", "the Grandmother of the Red",
     "The Mourner. Cuts her hair for what the Red took. The Red's never short of hair.",
     "The one who's mourned. ...Somebody cut their hair for it already."),
    ("key", "bone", "the one who locks the count", "the one who opens it", "the Ossuarch",
     "The Ossuary Key. Locks the count. Nine, and nine, and nine.",
     "The one who opens it. Somebody always does. That's why there's a key."),
    ("cup", "bone", "the one who asks at the door", "the house that answers", "the Ghauul, knocking for marrow",
     "The Beggar's Cup. Knocks at the door. Asks for marrow. Asks nicely.",
     "The house that answers. Don't answer."),
    ("bell", "breath", "the one who rings under the water", "the bell rung in tune", "the drowned king's court",
     "The Drowned Bell. Rings under the water. Only the drowned hear it, and they keep time.",
     "Rung in tune at last. That should frighten anybody."),
    ("coin", "silence", "the one who sells at the end of the world", "the one who buys", "the merchant",
     "The First Coin. Sold at the end of the world. Somebody's always selling.",
     "The one who buys. What did it buy? ...Don't tell me."),
    ("kiln", "flesh", "the one that hardens what is given to it", "the one that cracks", "the Deep",
     "The Kiln. Hardens what's given it. Goes in soft. Doesn't come out soft.",
     "The one that cracks. Something always cracks in the firing."),
    ("loom", "soul", "the one who unpicks", "the one who reweaves", "the Veiled Crone",
     "The Unravelling Loom. Somebody's picking it out, thread by thread. Not me.",
     "The one who weaves it back. Badly. There'll be lumps."),
    ("lanternwright", "breath", "the one who keeps what is lost", "the one who lets it go", "nobody now",
     "The Lantern-Wright. Keeps what's lost. Nobody makes lanterns now. Nobody.",
     "Lets it go. The light goes out of the top, they say, like breath."),
    ("choir", "breath", "the one who holds the note", "the rest between notes", "the Choir, under the crypts",
     "The Drowned Choir. Holds the note. Been holding it a long, long while.",
     "The rest between the notes. Listen. ...There. That."),
    ("tithe", "bone", "the one who owes", "the one who comes to collect", "the Tithed, every one left",
     "The Tithe. Owes. Everyone left owes. A tenth of the hide, every time.",
     "The one who comes to collect. Knock, knock."),
    ("crown", "silence", "the one whose orders are never obeyed", "the city that would obey if it could",
     "the Man in the Rust, on the dark moon",
     "The Hollow Crown. Gives orders nobody obeys. Up on the brown moon, still giving them.",
     "The city that would obey if it could. Can't. Never could."),
]

CALLING_NAME = {"ossumancer": "The Ossuarch", "animancer": "The Hollow Mystic", "hemomancer": "The Red Penitent",
                "miasmancer": "The Shrine Keeper", "monk": "The Empty Hand"}
ASPECT_WORD = {"bone": "bone", "soul": "thread", "flesh": "flesh", "breath": "breath", "silence": "quiet"}
TALE_ORDER = ["open", "feet", "brow", "heart", "belly", "lhand", "rhand", "under"]
REGIONS = ("head", "hands", "low")


# what each card does in each place, upright and reversed: the hidden effects (Derek, 2026-10-10: "the cards should also
# offer resistance + and - to the element types in the game, fire, miasma, magic etc"; "feels like we get more positive
# than negative, should be balanced"). Every card in every place both gives and takes: upright it leans a little to the
# good, reversed it takes more than it gives, so that a whole hand (the calling's own card included) comes out about
# even (tools/reading/balance_check.py simulates it). Only keys the game applies (core/hero_stats.gd, entities/):
# the resistances are res (magic), res_fire, res_cold and res_poison (shown as miasma). Each step keeps to the law
# (docs/wiki/01: every percent effect 1% at most; attributes 2, armour and poise 4, life per kill 1; life and the
# calling's own resource 10). Worth of a step: data/reading.json "value" x the step.
STEP = {"vit": 2, "spi": 2, "con": 2, "armor": 4, "stam": 4, "lok": 1, "life": 10, "mana": 10}
PLACE_KEYS = {
    "brow": ["res", "armor", "stam", "lrad", "mf", "res_fire", "res_cold"],
    "heart": ["dmg", "xp", "gold", "mf", "fcr", "spi", "raised"],
    "lhand": ["armor", "con", "lok", "potion", "res_poison", "raised", "res_fire"],
    "rhand": ["frw", "gold", "xp", "regen", "potion", "hpPct", "res"],
    "belly": ["res_fire", "res_cold", "res_poison", "res", "hpPct", "vit"],
    "feet": ["frw", "stam", "lrad", "dmg_day", "dmg_night", "res_cold"],
    "under": ["vit", "spi", "con", "life", "mana", "hpPct", "dmg", "res"],
}
ASPECT_KEYS = {
    "bone": ["con", "armor", "raised", "res_cold"],
    "flesh": ["vit", "life", "hpPct", "res_poison"],
    "soul": ["spi", "res", "fcr", "mana"],
    "breath": ["regen", "frw", "res_poison", "lrad"],
    "silence": ["dmg_night", "res", "mf", "stam"],
}
RESISTS = ["res", "res_fire", "res_cold", "res_poison"]
UP_LEAN = 0.10           # upright: worth given minus worth taken
REV_LEAN = 0.95          # reversed: worth taken minus worth given


def _pair(rng, gives, takes, lean, worth):
    """the give and the take whose worths differ by nearest the lean (a few near-best, picked among by the card)"""
    best = []
    for g in gives:
        for t in takes:
            if g == t:
                continue
            best.append((abs(worth(g) - worth(t) - lean), g, t))
    best.sort()
    near = [b for b in best if b[0] <= best[0][0] + 0.15][:12]
    _, g, t = near[rng.randrange(len(near))]
    return g, t


def card_fx(mid, aspect, value):
    import zlib, random
    worth = lambda k: float(value.get(k, 0.0)) * STEP.get(k, 1)
    out = {}
    for pid, keys in PLACE_KEYS.items():
        rng = random.Random(zlib.crc32(("%s|%s" % (mid, pid)).encode()))
        pool = list(dict.fromkeys(keys + ASPECT_KEYS[aspect]))
        # the belly is where the fears sit: one of its two always a resistance (in the other place too, now and then)
        g, t = _pair(rng, pool, keys, UP_LEAN, worth)
        if pid == "belly" and g not in RESISTS and t not in RESISTS:
            g, t = _pair(rng, pool, RESISTS, UP_LEAN, worth)
        tg, tt = _pair(rng, keys, pool, -REV_LEAN, worth)
        if pid == "belly" and tg not in RESISTS and tt not in RESISTS:
            tg, tt = _pair(rng, RESISTS, pool, -REV_LEAN, worth)
        out[pid] = [{g: STEP.get(g, 1), t: -STEP.get(t, 1)}, {tg: STEP.get(tg, 1), tt: -STEP.get(tt, 1)}]
    return out


def main():
    with open(os.path.join(ROOT, "data", "reading.json"), encoding="utf-8") as fh:
        value = json.load(fh).get("value", {})
    ms = []
    pids = [p["id"] for p in PLACES]
    for (i, a, o, r, w, _sy, _sr) in M:
        mn = W.MEANS[i]
        assert sorted(mn) == sorted(pids), i
        assert sorted(W.TURNED[i]) == sorted(REGIONS), i
        ms.append(dict(id=i, aspect=a, one=o, rev=r, wears=w,
                       mean={k: [list(v[0]), list(v[1])] for k, v in mn.items()},
                       turned=W.TURNED[i], fx=card_fx(i, a, value)))
    # every reading its own: no short or sub said twice anywhere in the deck
    seen = {}
    for m in ms:
        for k, v in m["mean"].items():
            for way in v:
                for txt in way:
                    assert txt not in seen, (m["id"], k, txt, seen.get(txt))
                    assert ":" not in txt, txt
                    seen[txt] = (m["id"], k)
    d = dict(places=PLACES, rhyme=W.RHYME, rhyme_aside=W.RHYME_ASIDE, crown_say=W.CROWN_SAY, deck_open=W.DECK_OPEN,
             bridge=W.BRIDGE, shapes=W.SHAPES, aspect_word=ASPECT_WORD, close_sum=W.CLOSE_SUM, tale=W.TALE,
             tale_order=TALE_ORDER, calling=W.CALLING, calling_name=CALLING_NAME, mantles=ms)
    p = os.path.join(ROOT, "data", "reading_spread.json")
    with open(p, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(d, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    print("wrote", p, len(ms), "mantles,", len(seen), "readings")


if __name__ == "__main__":
    main()
