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

# (name, genre, mood, key, tempo, bars, seed, title, words)
PIECES = [
    ("dungeon_sunken_stair", "dungeon_synth", "dark", "C# minor", 72, 32, 11, "The Sunken Stair", "organ and dark strings down a long stair; bells drip from above"),
    ("dungeon_candle_hall", "dungeon_synth", "eerie", "E phrygian", 66, 32, 23, "Candle Hall", "a phrygian hall, choir under, a music box far off"),
    ("gothic_black_cathedral", "gothic_orchestral", "dark", "D minor", 84, 32, 5, "Black Cathedral", "strings and horn in a stone vault, the field snare marching"),
    ("gothic_requiem_for_a_lantern", "gothic_orchestral", "sombre", "G minor", 78, 32, 17, "Requiem for a Lantern", "a slow requiem: cello line, choir, harp"),
    ("chip_lantern_run", "chiptune", "playful", "C major", 150, 32, 8, "Lantern Run", "a quick pulse lead over a triangle bass; the noise channel keeps time"),
    ("chip_crypt_crawler", "chiptune", "tense", "A minor", 140, 32, 31, "Crypt Crawler", "a minor-key chip tune with a running bass"),
    ("ambient_the_breathing_dark", "dark_ambient", "eerie", "F phrygian", 54, 24, 3, "The Breathing Dark", "pads and breath; a far bell now and then"),
    ("ambient_salt_and_bone", "dark_ambient", "dark", "B minor", 58, 24, 19, "Salt and Bone", "a low drone, a men's choir, nothing hurried"),
    ("battle_iron_teeth", "battle", "tense", "E minor", 152, 32, 12, "Iron Teeth", "driving kit, brass stabs, a saw lead, strings in sixteenths"),
    ("battle_the_charge", "battle", "heroic", "D minor", 160, 32, 44, "The Charge", "a heroic battle theme that climbs into its bridge"),
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
    ("explore_the_fen_road", "exploration", "hopeful", "D dorian", 108, 32, 14, "The Fen Road", "walking music: a steady bass, a curious lead"),
    ("explore_under_the_barrows", "exploration", "eerie", "G minor", 100, 32, 35, "Under the Barrows", "the same walk, in the dark"),
    ("synth_neon_crypt", "synthwave", "dark", "A minor", 112, 32, 10, "Neon Crypt", "octave bass, gated pads, a sync lead"),
    ("synth_lantern_drive", "synthwave", "heroic", "E minor", 118, 32, 39, "Lantern Drive", "the drum machine and a saw lead; the bridge lifts a third"),
]

FORGE_PIECES = ["forge_home", "forge_working", "forge_done"]


# ------------------------------------------------------------------ the Forge's own theme, written by hand
def _n(s, p, v=0.8, l=1.0):
    return {"s": int(s), "p": int(p), "v": float(v), "l": float(l)}


def _forge_base(title: str, seed: int) -> tuple[dict, C._Ctx]:
    s = S.new_song(title, tempo=72, key="C# minor", bars=4, genre="dungeon_synth", mood="dark", seed=seed)
    s["lanes"]["lead"].update({"instrument": "choir_ahh", "volume": 0.85, "tone": 0.45, "pan": 0.0})
    s["lanes"]["counter"].update({"instrument": "strings_dark", "volume": 0.75, "tone": 0.45, "pan": -0.3})
    s["lanes"]["pad"].update({"instrument": "organ_cathedral", "volume": 0.8, "tone": 0.4, "pan": 0.2})
    s["lanes"]["bass"].update({"instrument": "bass_sub", "volume": 0.45, "tone": 0.5, "pan": 0.0})
    s["lanes"]["sparkle"].update({"instrument": "bells_glass", "volume": 0.42, "tone": 0.7, "pan": 0.35})
    s["lanes"]["drums"].update({"instrument": "drums_taiko", "volume": 0.7, "tone": 0.4, "pan": -0.1})
    s["fx"].update({"reverb": 0.6, "reverb_size": 3.0, "echo": 0.3, "echo_beats": 1.5, "echo_feedback": 0.4, "echo_tone": 0.35, "crunch": 0.25, "bits": 14, "rate": 32000, "voices": 8})
    rules = dict(C.GENRES["dungeon_synth"])
    ctx = C._Ctx(S.normalise(s), rules, np.random.default_rng(seed), 0.9)
    s["patterns"] = {}
    return s, ctx


# the motif, in C# minor (MIDI): C#4 E4 D#4 C#4 | G#4 F#4 E4 | A4 G#4 F#4 E4 | D#4 E4 C#4
LEAD_A = [(0, 61, 6), (6, 64, 2), (8, 63, 4), (12, 61, 4), (16, 68, 6), (22, 66, 2), (24, 64, 8), (32, 69, 6), (38, 68, 2), (40, 66, 4), (44, 64, 4),
          (48, 63, 6), (54, 64, 2), (56, 61, 8)]
LEAD_A2 = [(0, 61, 6), (6, 64, 2), (8, 63, 4), (12, 61, 4), (16, 68, 6), (22, 66, 2), (24, 64, 4), (28, 66, 4), (32, 69, 4), (36, 71, 2), (38, 68, 2),
           (40, 66, 4), (44, 64, 4), (48, 63, 4), (52, 66, 2), (54, 64, 2), (56, 61, 8)]
# the bridge motif inverted, played a fourth up by the section (F# minor): C#4 A3 B3 C#4 | F#3 G#3 A3 | ...
LEAD_B = [(0, 61, 6), (6, 57, 2), (8, 59, 4), (12, 61, 4), (16, 54, 6), (22, 56, 2), (24, 57, 8), (32, 52, 6), (38, 54, 2), (40, 56, 4), (44, 57, 4),
          (48, 59, 6), (54, 57, 2), (56, 56, 8)]
COUNTER_A = [(0, 56, 8), (8, 54, 4), (12, 52, 4), (16, 52, 8), (24, 51, 8), (32, 59, 8), (40, 56, 8), (48, 59, 6), (54, 57, 2), (56, 56, 8)]
COUNTER_B = [(0, 56, 8), (8, 57, 8), (16, 54, 8), (24, 57, 8), (32, 56, 8), (40, 59, 8), (48, 52, 8), (56, 51, 8)]
BASS_A = [(0, 37, 16), (16, 33, 16), (32, 40, 16), (48, 35, 8), (56, 42, 8)]           # C#2 A1 E2 B1 F#2
BASS_B = [(0, 37, 16), (16, 33, 16), (32, 30, 8), (40, 32, 8), (48, 35, 16)]            # C#2 A1 F#1 G#1 B1
CHORDS_A = [0, 5, 2, 6]      # i VI III VII  (C#m A E B)
CHORDS_B = [0, 5, 3, 6]      # played +5: F#m D B C#  (the iv key)


def _lead(notes, vel=0.8) -> list[dict]:
    return [_n(s, p, vel if s % 16 == 0 else vel - 0.1, l - 0.5) for s, p, l in notes]


def _sparkle_hand(ctx: C._Ctx, chords: list[int], bars: int, density: float = 1.0) -> list[dict]:
    """High bells on chord tones, off the beat, falling then rising; quiet and sparse."""
    out = []
    for bar in range(bars):
        tones = sorted({t for t in ctx.chord_tones(chords[min(bar, len(chords) - 1)], 6)})
        pattern = [(2, 2), (6, 1), (10, 0), (13, 2)] if bar % 2 == 0 else [(3, 0), (7, 1), (11, 2)]
        for k, (s, i) in enumerate(pattern):
            if ctx.rng.random() < density:
                out.append(_n(bar * 16 + s, tones[i % len(tones)] + (12 if (bar + k) % 3 == 0 else 0), 0.42 + 0.1 * ctx.rng.random(), 3.0))
    return out


def _taiko(bars: int, soft: bool = False) -> list[dict]:
    out = []
    for bar in range(bars):
        b = bar * 16
        if bar % 2 == 0:
            out.append(_n(b, DRUMS["kick"], 0.55 if soft else 0.8, 1))
        out.append(_n(b + 8, DRUMS["tom_low"], 0.4 if soft else 0.55, 1))
        if bar % 4 == 3:
            out.append(_n(b + 12, DRUMS["stick"], 0.45, 1))
            out.append(_n(b + 14, DRUMS["stick"], 0.5, 1))
    return out


def _heartbeat(bars: int) -> list[dict]:
    out = []
    for bar in range(bars):
        b = bar * 16
        out += [_n(b, DRUMS["kick"], 0.75, 1), _n(b + 2, DRUMS["kick"], 0.45, 1), _n(b + 8, DRUMS["tom_low"], 0.45, 1), _n(b + 12, DRUMS["stick"], 0.4, 1)]
    return out


def forge_home() -> dict:
    """The Forge's theme: dungeon synth in C# minor at 72, near the reference's key and darkness, with the bells as
    the one bright thing. Sections: intro, A (the motif), A2 (its variation), B (inverted, in the iv key), A3."""
    s, ctx = _forge_base("Forge, at rest", 21)
    pad_a = C.pad_for(ctx, CHORDS_A, 4, "whole")
    pad_b = C.pad_for(ctx, CHORDS_B, 4, "whole")
    s["patterns"]["intro"] = {"bars": 4, "chords": CHORDS_A, "notes": {"lead": [], "counter": _lead(COUNTER_A, 0.6), "pad": pad_a, "bass": [_n(a, b, 0.8, c) for a, b, c in BASS_A],
                                                                       "sparkle": _sparkle_hand(ctx, CHORDS_A, 4, 0.6), "drums": _taiko(4, soft=True)}}
    s["patterns"]["A"] = {"bars": 4, "chords": CHORDS_A, "notes": {"lead": _lead(LEAD_A), "counter": _lead(COUNTER_A, 0.6), "pad": pad_a, "bass": [_n(a, b, 0.8, c) for a, b, c in BASS_A],
                                                                   "sparkle": _sparkle_hand(ctx, CHORDS_A, 4, 0.8), "drums": _taiko(4)}}
    s["patterns"]["A2"] = {"bars": 4, "chords": CHORDS_A, "notes": {"lead": _lead(LEAD_A2, 0.85), "counter": _lead(COUNTER_A, 0.62), "pad": pad_a, "bass": [_n(a, b, 0.8, c) for a, b, c in BASS_A],
                                                                    "sparkle": _sparkle_hand(ctx, CHORDS_A, 4, 1.0), "drums": _taiko(4)}}
    s["patterns"]["B"] = {"bars": 4, "chords": CHORDS_B, "notes": {"lead": _lead(LEAD_B, 0.78), "counter": _lead(COUNTER_B, 0.6), "pad": pad_b, "bass": [_n(a, b, 0.8, c) for a, b, c in BASS_B],
                                                                   "sparkle": _sparkle_hand(ctx, CHORDS_B, 4, 0.8), "drums": _taiko(4, soft=True)}}
    s["sections"] = [{"name": "intro", "pattern": "intro", "repeat": 1, "transpose": 0}, {"name": "A", "pattern": "A", "repeat": 1, "transpose": 0},
                     {"name": "A2", "pattern": "A2", "repeat": 1, "transpose": 0}, {"name": "B", "pattern": "B", "repeat": 1, "transpose": 5},
                     {"name": "A3", "pattern": "A2", "repeat": 1, "transpose": 0}]
    s["words"] = "dungeon synth: organ and dark strings in C# minor, a choir carrying the motif, glass bells high above; the bridge in the fourth"
    return S.normalise(s)


def forge_working() -> dict:
    """The sparser variation for a running job: the counter carries the motif over a heartbeat; no choir."""
    s, ctx = _forge_base("Forge, working", 22)
    s["tempo"] = 76
    s["lanes"]["lead"]["instrument"] = "strings_dark"
    s["lanes"]["lead"]["volume"] = 0.6
    pad_a = C.pad_for(ctx, CHORDS_A, 4, "half")
    thin_lead = [_n(s_, p, 0.6, l - 0.5) for s_, p, l in LEAD_A if s_ % 16 in (0, 8)]
    s["patterns"]["W"] = {"bars": 4, "chords": CHORDS_A, "notes": {"lead": thin_lead, "counter": _lead(COUNTER_A, 0.62), "pad": pad_a, "bass": [_n(a, b, 0.8, c) for a, b, c in BASS_A],
                                                                   "sparkle": _sparkle_hand(ctx, CHORDS_A, 4, 0.5), "drums": _heartbeat(4)}}
    s["patterns"]["W2"] = {"bars": 4, "chords": CHORDS_B, "notes": {"lead": [], "counter": _lead(COUNTER_B, 0.6), "pad": C.pad_for(ctx, CHORDS_B, 4, "half"), "bass": [_n(a, b, 0.8, c) for a, b, c in BASS_B],
                                                                    "sparkle": _sparkle_hand(ctx, CHORDS_B, 4, 0.5), "drums": _heartbeat(4)}}
    s["sections"] = [{"name": "W", "pattern": "W", "repeat": 2, "transpose": 0}, {"name": "W2", "pattern": "W2", "repeat": 1, "transpose": 5}]
    s["words"] = "the theme thinned to its bones over a heartbeat, for a job that is running"
    return S.normalise(s)


def forge_done() -> dict:
    """A short cadence: the dominant, then the tonic held with the bells falling; four bars that loop quietly."""
    s, ctx = _forge_base("Forge, done", 23)
    s["tempo"] = 66
    chords = [4, 0, 0, 0]       # G#m -> C#m held
    pad = C.pad_for(ctx, chords, 4, "whole")
    # the raised leading tone in the dominant (B#), written out
    for n in pad:
        if n["s"] == 0 and n["p"] % 12 == 11:
            n["p"] += 1
    lead = [_n(0, 63, 0.75, 7.5), _n(8, 60, 0.7, 7.5), _n(16, 61, 0.85, 31.0)]
    counter = [_n(0, 56, 0.6, 15.5), _n(16, 52, 0.6, 15.5), _n(32, 56, 0.55, 31.0)]
    bass = [_n(0, 32, 0.8, 16), _n(16, 37, 0.85, 48)]
    tones = [61 + 24, 64 + 24, 68 + 24, 61 + 36]
    sparkle = [_n(16 + k * 2, tones[(3 - k) % 4] + (12 if k < 2 else 0), 0.5 - 0.04 * k, 3.0) for k in range(6)] + [_n(40, 85, 0.4, 4), _n(48, 88, 0.38, 4), _n(56, 92, 0.36, 6)]
    drums = [_n(0, DRUMS["kick"], 0.6, 1), _n(16, DRUMS["kick"], 0.8, 1), _n(16, DRUMS["crash"], 0.35, 1)]
    s["patterns"]["D"] = {"bars": 4, "chords": chords, "notes": {"lead": lead, "counter": counter, "pad": pad, "bass": bass, "sparkle": sparkle, "drums": drums}}
    s["sections"] = [{"name": "D", "pattern": "D", "repeat": 1, "transpose": 0}]
    s["words"] = "the cadence: the dominant, the tonic held, the bells falling"
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


def list_pieces(genre: str | None = None, library_dir: str | Path | None = None) -> list[dict]:
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
