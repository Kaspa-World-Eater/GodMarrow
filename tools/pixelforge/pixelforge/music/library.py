"""The library: premade pieces across genres, every one an editable song file (never audio), and the Forge's own
theme written by hand. `build_library()` writes them into pixelforge/music/library/ (committed); the Forge's
Library tab and `pixelforge music list` read them from there.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from . import compose as C, song as S, theory
from .theory import DRUMS

LIBRARY_DIR = Path(__file__).resolve().parent / "library"

# (name, genre, mood, key, tempo, bars, seed, title, words); the theme set is decided below: the dark minor-key
# genres are "godmarrow" (the game this forge serves), the bright ones "general" (other games)
PIECES = [
    ("dungeon_sunken_stair", "dungeon_synth", "dark", "C# minor", 72, 32, 11, "The Sunken Stair", "organ and dark strings down a long stair; bells drip from above"),
    ("dungeon_candle_hall", "dungeon_synth", "eerie", "E phrygian", 66, 32, 23, "Candle Hall", "a phrygian hall, choir under, a music box far off"),
    ("gothic_black_cathedral", "gothic_orchestral", "dark", "D minor", 84, 32, 5, "Black Cathedral", "strings and horn in a stone vault, the field snare marching"),
    ("gothic_requiem_for_a_lantern", "gothic_orchestral", "sombre", "G minor", 78, 32, 17, "Requiem for a Lantern", "a slow requiem: cello line, choir, harp"),
    ("gothic_the_crest_procession", "gothic_march", "dark", "D harmonic minor", 92, 32, 15, "The Crest Procession", "a gothic organ-and-choir march: chromatic harmony, chapel bells, the field snare, a deep hall"),
    ("chip_lantern_run", "chiptune", "playful", "C major", 150, 32, 8, "Lantern Run", "a quick pulse lead over a triangle bass; the noise channel keeps time (for a brighter game than this one)"),
    ("chip_crypt_crawler", "chiptune", "tense", "A minor", 140, 32, 31, "Crypt Crawler", "a minor-key chip tune with a running bass"),
    ("ambient_the_breathing_dark", "dark_ambient", "eerie", "F phrygian", 54, 24, 3, "The Breathing Dark", "pads and breath; a far bell now and then"),
    ("ambient_salt_and_bone", "dark_ambient", "dark", "B minor", 58, 24, 19, "Salt and Bone", "a low drone, a men's choir, nothing hurried"),
    ("battle_iron_teeth", "battle", "tense", "E minor", 152, 32, 12, "Iron Teeth", "driving kit, brass stabs, a saw lead, strings in sixteenths"),
    ("battle_the_charge", "battle", "dark", "D minor", 160, 32, 44, "The Charge", "a battle theme that climbs into its bridge"),
    ("boss_the_ossuarch", "boss", "dark", "G phrygian", 132, 32, 7, "The Ossuarch", "a pedal that will not move, tritones in the brass, the choir"),
    ("boss_hemomancer", "boss", "tense", "C# phrygian", 144, 32, 29, "Hemomancer", "faster, meaner; the hungarian minor in the bridge"),
    ("tavern_the_crooked_cup", "tavern", "playful", "G major", 118, 32, 4, "The Crooked Cup", "lute and flute over a shuffle, tambourine, a walking bass"),
    ("tavern_last_candle_inn", "tavern", "calm", "D mixolydian", 108, 32, 21, "Last Candle Inn", "a slower tavern tune, the oboe leading"),
    ("town_moor_camp", "town", "hopeful", "A dorian", 96, 32, 9, "Moor Camp", "harp and strings; the place you rest"),
    ("town_an_vhar_hold", "town", "calm", "F major", 88, 32, 37, "An-Vhar Hold", "a cold town, warm windows: flute over strings"),
    ("title_godmarrow", "title", "dark", "C# minor", 80, 40, 13, "Godmarrow", "the opening statement: horn theme, choir, bells, a bridge in the fourth"),
    ("title_the_lantern_wraith", "title", "sombre", "E minor", 76, 40, 41, "The Lantern Wraith", "strings carry the theme; the harp answers"),
    ("victory_the_gate_opens", "victory", "heroic", "D major", 132, 8, 6, "The Gate Opens", "a short fanfare and its cadence"),
    ("victory_small_mercy", "victory", "hopeful", "G lydian", 124, 8, 27, "Small Mercy", "a gentler win: bells over brass"),
    ("sorrow_the_empty_chair", "sorrow", "sombre", "A minor", 62, 32, 2, "The Empty Chair", "electric piano and cello, space between the notes"),
    ("sorrow_ash_letter", "sorrow", "dark", "F minor", 58, 32, 33, "Ash Letter", "a slow minor piece with a far choir"),
    ("explore_the_fen_road", "exploration", "sombre", "D minor", 104, 32, 14, "The Fen Road", "walking music in the dark: a steady bass, a wary lead"),
    ("explore_under_the_barrows", "exploration", "eerie", "G minor", 100, 32, 35, "Under the Barrows", "the same walk, further down"),
    ("epic_the_last_cairn", "barbarian_epic", "sombre", "D minor", 68, 32, 18, "The Last Cairn", "low brass and timpani, a male choir chanting under a broad melody over a pedal; tragic and grand"),
    ("acoustic_the_hanging_road", "dark_acoustic", "dark", "E phrygian", 74, 32, 24, "The Hanging Road", "a dark nylon-guitar figure that repeats and barely moves, a drone, distant drums; no release"),
    ("dread_the_deep_vein", "ambient_dread", "eerie", "F phrygian", 56, 24, 30, "The Deep Vein", "slow dread for the deep places: bass pulses, clustered pads, an alien choir, long silences"),
    ("rock_the_bone_stair", "gothic_rock", "tense", "A harmonic minor", 152, 32, 36, "The Bone Stair", "driving gothic rock: harpsichord figures, a sixteenth-note bass, a dark heroic line with turns"),
    ("synth_neon_crypt", "synthwave", "dark", "A minor", 112, 32, 10, "Neon Crypt", "octave bass, gated pads, a sync lead"),
    ("synth_lantern_drive", "synthwave", "heroic", "E minor", 118, 32, 39, "Lantern Drive", "the drum machine and a saw lead; the bridge lifts a third"),
]
GODMARROW_GENRES = {"dungeon_synth", "gothic_orchestral", "gothic_march", "barbarian_epic", "dark_acoustic", "ambient_dread", "gothic_rock", "dark_ambient", "battle", "boss", "sorrow", "exploration", "title"}


def theme_of(genre: str) -> str:
    return "godmarrow" if genre in GODMARROW_GENRES else "general"


FORGE_PIECES = ["forge_home", "forge_working", "forge_done"]


# ------------------------------------------------------------------ the Forge's own theme, written by hand
def _n(s, p, v=0.8, l=1.0):
    return {"s": int(s), "p": int(p), "v": float(v), "l": float(l)}


def _forge_base(title: str, seed: int) -> tuple[dict, C._Ctx]:
    """The Forge family's instruments: low brass for the broad melody, a male choir chanting under it, a gothic organ
    behind, a sub-bass drone (the one synth colour), chapel bells sparse and low in the mix, timpani far off."""
    s = S.new_song(title, tempo=66, key="C# minor", bars=4, genre="dungeon_synth", mood="dark", seed=seed)
    s["theme"] = "godmarrow"
    s["lanes"]["lead"].update({"instrument": "brass_low", "volume": 0.8, "tone": 0.42, "pan": 0.0})
    s["lanes"]["counter"].update({"instrument": "choir_chant", "volume": 0.62, "tone": 0.4, "pan": -0.3})
    s["lanes"]["pad"].update({"instrument": "organ_gothic", "volume": 0.62, "tone": 0.35, "pan": 0.25})
    s["lanes"]["bass"].update({"instrument": "bass_sub", "volume": 0.6, "tone": 0.45, "pan": 0.0})
    s["lanes"]["sparkle"].update({"instrument": "bells_chapel", "volume": 0.24, "tone": 0.5, "pan": 0.4})
    s["lanes"]["drums"].update({"instrument": "drums_epic", "volume": 0.7, "tone": 0.4, "pan": -0.1})
    s["fx"].update({"reverb": 0.6, "reverb_size": 3.2, "echo": 0.28, "echo_beats": 1.5, "echo_feedback": 0.4, "echo_tone": 0.35, "crunch": 0.3, "bits": 14, "rate": 32000, "voices": 8, "snes": 0.75})
    rules = dict(C.GENRES["dungeon_synth"])
    ctx = C._Ctx(S.normalise(s), rules, np.random.default_rng(seed), 0.9)
    s["patterns"] = {}
    return s, ctx


# the melody, in C# minor over i VI III VII (C#m A E B) with the bass holding C#: broad, slow, modal, tragic
LEAD_A = [(0, 61, 8), (8, 64, 4), (12, 63, 4), (16, 66, 8), (24, 64, 6), (30, 61, 2), (32, 59, 8), (40, 68, 4), (44, 66, 4), (48, 64, 4), (52, 63, 4), (56, 61, 8)]
# the second statement climbs: the same line with its third and fourth bars lifted to the fifth and the octave
LEAD_A2 = [(0, 61, 8), (8, 64, 4), (12, 63, 4), (16, 66, 8), (24, 68, 6), (30, 66, 2), (32, 71, 8), (40, 73, 4), (44, 71, 4), (48, 68, 4), (52, 66, 4), (56, 64, 8)]
# the bridge lifts: VI VII i v in the home key, moved up a minor third by its section
LEAD_B = [(0, 69, 8), (8, 71, 4), (12, 73, 4), (16, 71, 8), (24, 68, 8), (32, 66, 8), (40, 68, 4), (44, 69, 4), (48, 68, 6), (54, 66, 2), (56, 64, 8)]
CHORDS_A = [0, 5, 2, 6]      # i VI III VII  (C#m A E B)
CHORDS_B = [5, 6, 0, 4]      # VI VII i v, played +3


def _lead(notes, vel=0.8) -> list[dict]:
    return [_n(s, p, vel if s % 16 == 0 else vel - 0.1, max(l - 0.5, 0.5)) for s, p, l in notes]


def _chant(chords: list[int], bars: int, octave: int = 3, vel: float = 0.6, lead=None) -> list[dict]:
    """The choir's chant under the melody: the chord's root re-struck in a slow march rhythm, the fifth on the
    second half of the bar, never the lead's own note on the beat."""
    out = []
    for bar in range(bars):
        r = theory.degree_to_midi(1, "minor", chords[min(bar, len(chords) - 1)], octave)
        while r > 12 * (octave + 1) + 1 + 7:
            r -= 12
        for k, off in ((0, 0), (3, 0), (6, 0), (8, 7), (11, 7), (14, 0)):
            out.append(_n(bar * 16 + k, r + off, vel if k in (0, 8) else vel - 0.12, 2.5 if k < 14 else 1.5))
    return out


def _drone(pitch: int, bars: int) -> list[dict]:
    return [_n(b * 16, pitch, 0.8, 31.5) for b in range(0, bars, 2)]


def _sparkle_hand(ctx: C._Ctx, chords: list[int], bars: int, density: float = 1.0) -> list[dict]:
    """A few bells on chord tones, off the beat; quiet and sparse: one or two a bar at most."""
    out = []
    for bar in range(bars):
        tones = sorted({t for t in ctx.chord_tones(chords[min(bar, len(chords) - 1)], 5)})
        pattern = [(6, 1), (13, 2)] if bar % 2 == 0 else [(11, 0)]
        for k, (s, i) in enumerate(pattern):
            if ctx.rng.random() < density:
                out.append(_n(bar * 16 + s, tones[i % len(tones)] + (12 if (bar + k) % 3 == 0 else 0), 0.42 + 0.1 * ctx.rng.random(), 3.0))
    return out


def _timpani(bars: int, soft: bool = False) -> list[dict]:
    out = []
    for bar in range(bars):
        b = bar * 16
        out.append(_n(b, DRUMS["timpani"], 0.55 if soft else 0.8, 1))
        if bar % 2 == 1:
            out.append(_n(b + 8, DRUMS["tom_low"], 0.45, 1))
        if bar % 4 == 3 and not soft:
            out += [_n(b + 12, DRUMS["timpani"], 0.5, 1), _n(b + 14, DRUMS["timpani"], 0.6, 1)]
    return out


def _heartbeat(bars: int) -> list[dict]:
    out = []
    for bar in range(bars):
        b = bar * 16
        out += [_n(b, DRUMS["timpani"], 0.6, 1), _n(b + 2, DRUMS["tom_low"], 0.35, 1)]
        if bar % 2 == 1:
            out.append(_n(b + 8, DRUMS["tom_low"], 0.4, 1))
    return out


def _pad_chords(ctx: C._Ctx, chords: list[int]) -> list[dict]:
    return C.pad_for(ctx, chords, len(chords), "whole")


def forge_home() -> dict:
    """The Forge's theme: dungeon synth in mood, slow and tragic. A sub-bass drone, a male choir chanting the roots, a
    gothic organ holding the chords, timpani far off, and a broad modal melody in low brass; the melody is stated,
    stated again climbing, lifted a minor third in the bridge, then home; a bell or two a bar, low. C# minor at 66."""
    s, ctx = _forge_base("Forge, at rest", 21)
    pad_a, pad_b = C.pad_for(ctx, CHORDS_A, 4, "whole"), C.pad_for(ctx, CHORDS_B, 4, "whole")
    chant_a, chant_b = _chant(CHORDS_A, 4), _chant(CHORDS_B, 4)
    drone_a, drone_b = _drone(37, 4), _drone(33, 4)
    s["patterns"]["intro"] = {"bars": 4, "chords": CHORDS_A, "notes": {"lead": [], "counter": _chant(CHORDS_A, 4, 3, 0.5), "pad": pad_a, "bass": drone_a,
                                                                       "sparkle": [], "drums": _timpani(4, soft=True)}}
    s["patterns"]["A"] = {"bars": 4, "chords": CHORDS_A, "notes": {"lead": _lead(LEAD_A), "counter": chant_a, "pad": pad_a, "bass": drone_a,
                                                                   "sparkle": _sparkle_hand(ctx, CHORDS_A, 4, 0.5), "drums": _timpani(4)}}
    s["patterns"]["A2"] = {"bars": 4, "chords": CHORDS_A, "notes": {"lead": _lead(LEAD_A2, 0.86), "counter": chant_a, "pad": pad_a, "bass": drone_a,
                                                                    "sparkle": _sparkle_hand(ctx, CHORDS_A, 4, 0.7), "drums": _timpani(4)}}
    s["patterns"]["B"] = {"bars": 4, "chords": CHORDS_B, "notes": {"lead": _lead(LEAD_B, 0.84), "counter": chant_b, "pad": pad_b, "bass": drone_b,
                                                                   "sparkle": _sparkle_hand(ctx, CHORDS_B, 4, 0.5), "drums": _timpani(4, soft=True)}}
    s["sections"] = [{"name": "intro", "pattern": "intro", "repeat": 1, "transpose": 0}, {"name": "A", "pattern": "A", "repeat": 1, "transpose": 0},
                     {"name": "A2", "pattern": "A2", "repeat": 1, "transpose": 0}, {"name": "B", "pattern": "B", "repeat": 1, "transpose": 3},
                     {"name": "A3", "pattern": "A2", "repeat": 1, "transpose": 0}]
    s["words"] = "dungeon synth in mood, slow and tragic: a drone, a chanting choir and a gothic organ under a broad low-brass melody, timpani far off, a bell or two; the bridge lifts a minor third"
    return S.normalise(s)


def forge_working() -> dict:
    """The sparser variation for a running job: the drone, the chant and a heartbeat; the melody's first phrase now and then."""
    s, ctx = _forge_base("Forge, working", 22)
    s["lanes"]["lead"]["volume"] = 0.6
    thin = [_n(s_, p, 0.65, max(l - 0.5, 0.5)) for s_, p, l in LEAD_A if s_ < 32]
    s["patterns"]["W"] = {"bars": 4, "chords": CHORDS_A, "notes": {"lead": thin, "counter": _chant(CHORDS_A, 4, 3, 0.5), "pad": C.pad_for(ctx, CHORDS_A, 4, "whole"),
                                                                   "bass": _drone(37, 4), "sparkle": [], "drums": _heartbeat(4)}}
    s["patterns"]["W2"] = {"bars": 4, "chords": CHORDS_B, "notes": {"lead": [], "counter": _chant(CHORDS_B, 4, 3, 0.5), "pad": C.pad_for(ctx, CHORDS_B, 4, "whole"),
                                                                    "bass": _drone(33, 4), "sparkle": _sparkle_hand(ctx, CHORDS_B, 4, 0.4), "drums": _heartbeat(4)}}
    s["sections"] = [{"name": "W", "pattern": "W", "repeat": 2, "transpose": 0}, {"name": "W2", "pattern": "W2", "repeat": 1, "transpose": 3}]
    s["words"] = "the theme thinned to its drone, its chant and a heartbeat, for a job that is running"
    return S.normalise(s)


def forge_done() -> dict:
    """A short cadence of the motif: its last phrase over VII then i held; four bars (the music bench's, not a step's)."""
    s, ctx = _forge_base("Forge, done", 23)
    s["tempo"] = 62
    chords = [6, 0, 0, 0]
    pad = C.pad_for(ctx, chords, 4, "whole")
    lead = [_n(0, 64, 0.8, 3.5), _n(4, 63, 0.72, 3.5), _n(8, 61, 0.85, 7.5), _n(16, 61, 0.7, 15.5), _n(32, 56, 0.55, 31.0)]
    counter = _chant(chords, 2, 3, 0.55) + [_n(32, 49, 0.5, 15.5), _n(48, 44, 0.45, 15.5)]
    bass = [_n(0, 35, 0.8, 16), _n(16, 37, 0.85, 48)]
    sparkle = [_n(18, 80, 0.3, 4.0), _n(24, 76, 0.26, 4.0), _n(40, 73, 0.24, 6.0)]
    drums = [_n(0, DRUMS["timpani"], 0.6, 1), _n(12, DRUMS["timpani"], 0.5, 1), _n(14, DRUMS["timpani"], 0.6, 1), _n(16, DRUMS["timpani"], 0.9, 1), _n(16, DRUMS["crash"], 0.3, 1)]
    s["patterns"]["D"] = {"bars": 4, "chords": chords, "notes": {"lead": lead, "counter": counter, "pad": pad, "bass": bass, "sparkle": sparkle, "drums": drums}}
    s["sections"] = [{"name": "D", "pattern": "D", "repeat": 1, "transpose": 0}]
    s["words"] = "the cadence: the melody's last phrase, the tonic held"
    return S.normalise(s)


FORGE_BUILDERS = {"forge_home": forge_home, "forge_working": forge_working, "forge_done": forge_done}


# ------------------------------------------------------------------ building and reading
def build_piece(name: str) -> dict:
    if name in FORGE_BUILDERS:
        return FORGE_BUILDERS[name]()
    for n, genre, mood, key, tempo, bars, seed, title, words in PIECES:
        if n == name:
            s = C.compose(genre, mood, key, tempo, bars, seed, title)
            s["words"] = words
            s["theme"] = theme_of(genre)
            return S.normalise(s)
    raise KeyError(name)


def build_library(out_dir: str | Path | None = None) -> dict:
    """Write every piece as <name>.song.json plus library.json (the index)."""
    out = Path(out_dir) if out_dir else LIBRARY_DIR
    out.mkdir(parents=True, exist_ok=True)
    index = []
    for name in [p[0] for p in PIECES] + FORGE_PIECES:
        s = build_piece(name)
        S.save(s, out / f"{name}.song.json")
        index.append({"name": name, "file": f"{name}.song.json", **S.summary(s), "words": s.get("words", "")})
    (out / "library.json").write_text(json.dumps({"pieces": index}, indent=1), encoding="utf-8")
    return {"ok": True, "dir": str(out), "count": len(index), "pieces": [i["name"] for i in index]}


def list_pieces(genre: str | None = None, library_dir: str | Path | None = None, theme: str | None = None) -> list[dict]:
    """The index (built on the fly from the files when library.json is missing), filtered by genre."""
    d = Path(library_dir) if library_dir else LIBRARY_DIR
    idx = d / "library.json"
    rows: list[dict]
    if idx.exists():
        rows = json.loads(idx.read_text(encoding="utf-8")).get("pieces", [])
    else:
        rows = []
        for f in sorted(d.glob("*.song.json")):
            try:
                s = S.load(f)
            except Exception:  # noqa: BLE001
                continue
            rows.append({"name": f.name.replace(".song.json", ""), "file": f.name, **S.summary(s), "words": s.get("words", "")})
    if genre:
        rows = [r for r in rows if r.get("genre") == genre]
    if theme and theme != "all":
        rows = [r for r in rows if r.get("theme") == theme]
    return rows


def genres_in_library() -> list[str]:
    seen = []
    for r in list_pieces():
        if r["genre"] not in seen:
            seen.append(r["genre"])
    return seen


def load_piece(name: str, library_dir: str | Path | None = None) -> dict:
    d = Path(library_dir) if library_dir else LIBRARY_DIR
    p = d / (name if name.endswith(".song.json") else f"{name}.song.json")
    if not p.exists():
        names = ", ".join(r["name"] for r in list_pieces(library_dir=d))
        raise FileNotFoundError(f"no library piece named {name!r}; pieces: {names}")
    return S.load(p)


def key_of(name: str) -> str:
    return theory.key_name(*theory.parse_key(name))
