"""The song: what the editor edits, what the composer writes and what the renderer plays. One JSON file.

    {
      "title": "Forge, at rest", "genre": "dungeon_synth", "mood": "dark", "seed": 7,
      "tempo": 72, "root": 1, "scale": "minor", "scale_lock": true,
      "lanes": {"lead": {"instrument": "flute_wood", "volume": 0.8, "tone": 0.5, "pan": 0.0, "mute": false, "solo": false}, ...},
      "patterns": {"A": {"bars": 4, "notes": {"lead": [{"s": 0, "p": 61, "v": 0.8, "l": 4}], "drums": [...]}}},
      "sections": [{"name": "verse", "pattern": "A", "repeat": 2, "transpose": 0}],
      "fx": {"rate": 32000, "bits": 16, "voices": 8, "crunch": 0.2, "echo": 0.25, "echo_beats": 0.75, "echo_feedback": 0.35,
             "reverb": 0.3, "reverb_size": 1.6, "master": 1.0}
    }

A bar is 16 steps (4/4, a step a sixteenth). A note: `s` its step inside the pattern, `p` its pitch (MIDI; a drum
number on the drums lane), `v` its velocity 0..1, `l` its length in steps, `o` an offset in steps (humanise).
Lanes are fixed: lead, counter, pad, bass, sparkle, drums. Sections chain patterns; `transpose` moves a section's
notes (not the drums) by semitones, which is how a bridge changes key.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

from . import theory

STEPS_PER_BAR = 16
LANES = ["lead", "counter", "pad", "bass", "sparkle", "drums"]
LANE_DEFAULT_INSTRUMENT = {"lead": "lead_square", "counter": "strings_dark", "pad": "pad_dark", "bass": "bass_synth",
                           "sparkle": "bells_glass", "drums": "drums_rock"}
# each lane's natural octave for the editor's "note" cycler and the composer
LANE_OCTAVE = {"lead": 5, "counter": 4, "pad": 4, "bass": 2, "sparkle": 6, "drums": 0}

FX_DEFAULTS = {"rate": 32000, "bits": 16, "voices": 8, "crunch": 0.2, "echo": 0.25, "echo_beats": 0.75, "echo_feedback": 0.35,
               "echo_tone": 0.5, "reverb": 0.3, "reverb_size": 1.6, "master": 1.0, "snes": 0.7}
FX_FIELDS = {
    "rate": "sample rate: 32000 is the SNES's, 44100 is CD",
    "bits": "bit depth 6..16: fewer bits is more crunch",
    "voices": "how many notes may sound at once (8 like the SNES; 0 = no limit)",
    "crunch": "soft saturation 0..1: the warm distortion of the hardware's output stage",
    "echo": "echo level 0..1",
    "echo_beats": "echo time in beats (0.75 is a dotted eighth)",
    "echo_feedback": "how many repeats, 0..0.9",
    "echo_tone": "echo brightness 0..1 (the SPC's echo filter)",
    "reverb": "hall level 0..1",
    "reverb_size": "hall length in seconds, 0.3..4",
    "master": "the whole mix's gain before the limiter",
    "snes": "SNES-ness 0..1: band-limits every voice like a looped sample through the SPC's Gaussian filter, adds its grain and echo, caps the voices at 8 past 0.5; 0.7 sounds like the console without turning to mush",
}


class SongError(ValueError):
    pass


def lane_defaults(name: str) -> dict:
    return {"instrument": LANE_DEFAULT_INSTRUMENT.get(name, "lead_square"), "volume": 0.8, "tone": 0.5, "pan": 0.0,
            "mute": False, "solo": False}


def new_song(title: str = "Untitled", tempo: float = 110.0, key: str = "A minor", bars: int = 4, genre: str = "", mood: str = "",
             seed: int = 1) -> dict:
    """An empty song with one pattern 'A' of `bars` bars and one section playing it."""
    root, scale = theory.parse_key(key)
    return {
        "title": title, "genre": genre, "mood": mood, "seed": int(seed),
        "tempo": float(tempo), "root": int(root), "scale": scale, "scale_lock": True,
        "lanes": {ln: lane_defaults(ln) for ln in LANES},
        "patterns": {"A": {"bars": int(max(1, bars)), "notes": {ln: [] for ln in LANES}}},
        "sections": [{"name": "A", "pattern": "A", "repeat": 1, "transpose": 0}],
        "fx": dict(FX_DEFAULTS),
    }


def normalise(song: dict) -> dict:
    """Fill what an older or hand-written file leaves out; check what must be there."""
    if not isinstance(song, dict):
        raise SongError("a song is a JSON object")
    s = copy.deepcopy(song)
    s.setdefault("title", "Untitled")
    s.setdefault("genre", "")
    s.setdefault("mood", "")
    s.setdefault("seed", 1)
    s.setdefault("theme", "")
    s["tempo"] = float(s.get("tempo", 110.0))
    if not 20 <= s["tempo"] <= 300:
        raise SongError(f"tempo {s['tempo']} is outside 20..300")
    if "key" in s and "root" not in s:
        s["root"], s["scale"] = theory.parse_key(str(s.pop("key")))
    s["root"] = int(s.get("root", 9)) % 12
    s["scale"] = theory.scale_name(str(s.get("scale", "minor")))
    s["scale_lock"] = bool(s.get("scale_lock", True))
    lanes = s.get("lanes", {})
    s["lanes"] = {ln: {**lane_defaults(ln), **(lanes.get(ln, {}) or {})} for ln in LANES}
    pats = s.get("patterns", {})
    if not pats:
        raise SongError("a song needs at least one pattern")
    for name, p in pats.items():
        p["bars"] = int(max(1, p.get("bars", 1)))
        if p.get("chords") is not None:
            ch = [int(c) for c in p["chords"]]
            p["chords"] = (ch + [ch[-1] if ch else 0] * p["bars"])[: p["bars"]]
        notes = p.get("notes", {})
        p["notes"] = {ln: [normalise_note(n, ln) for n in (notes.get(ln, []) or [])] for ln in LANES}
        for ln in LANES:
            p["notes"][ln].sort(key=lambda n: (n["s"], n["p"]))
    s["patterns"] = pats
    secs = s.get("sections") or [{"name": k, "pattern": k, "repeat": 1, "transpose": 0} for k in list(pats)[:1]]
    for sec in secs:
        sec.setdefault("name", sec.get("pattern", "A"))
        if sec.get("pattern") not in pats:
            raise SongError(f"section {sec.get('name')!r} plays a pattern that is not there: {sec.get('pattern')!r}")
        sec["repeat"] = int(max(1, sec.get("repeat", 1)))
        sec["transpose"] = int(sec.get("transpose", 0))
    s["sections"] = secs
    s["fx"] = {**FX_DEFAULTS, **(s.get("fx", {}) or {})}
    s["fx"]["rate"] = int(s["fx"]["rate"])
    s["fx"]["bits"] = int(min(16, max(4, s["fx"]["bits"])))
    s["fx"]["voices"] = int(max(0, s["fx"]["voices"]))
    return s


def normalise_note(n, lane: str) -> dict:
    if isinstance(n, (list, tuple)):
        n = dict(zip(("s", "p", "v", "l", "o"), n))
    out = {"s": int(n.get("s", 0)), "p": int(n.get("p", 60)), "v": float(n.get("v", 0.8)), "l": float(n.get("l", 1.0))}
    out["v"] = min(1.0, max(0.05, out["v"]))
    out["l"] = max(0.25, out["l"])
    if n.get("o"):
        out["o"] = float(n["o"])
    return out


def load(path: str | Path) -> dict:
    try:
        return normalise(json.loads(Path(path).read_text(encoding="utf-8")))
    except json.JSONDecodeError as e:
        raise SongError(f"{path} is not valid JSON: {e}") from e


def save(song: dict, path: str | Path) -> str:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(normalise(song), indent=1), encoding="utf-8")
    return str(p)


def dumps(song: dict) -> str:
    return json.dumps(normalise(song), indent=1)


# --------------------------------------------------------------- measures
def pattern_steps(song: dict, name: str) -> int:
    return song["patterns"][name]["bars"] * STEPS_PER_BAR


def section_bars(song: dict, i: int) -> int:
    sec = song["sections"][i]
    return song["patterns"][sec["pattern"]]["bars"] * sec["repeat"]


def total_bars(song: dict) -> int:
    return sum(section_bars(song, i) for i in range(len(song["sections"])))


def step_seconds(song: dict) -> float:
    return 60.0 / float(song["tempo"]) / 4.0


def bar_seconds(song: dict) -> float:
    return step_seconds(song) * STEPS_PER_BAR


def total_seconds(song: dict) -> float:
    return total_bars(song) * bar_seconds(song)


def key_text(song: dict) -> str:
    return theory.key_name(song["root"], song["scale"])


def summary(song: dict) -> dict:
    """The facts a list or a card shows: JSON-safe."""
    notes = sum(len(v) for p in song["patterns"].values() for v in p["notes"].values())
    return {"title": song.get("title", ""), "genre": song.get("genre", ""), "mood": song.get("mood", ""), "theme": song.get("theme", ""), "tempo": song["tempo"],
            "key": key_text(song), "bars": total_bars(song), "seconds": round(total_seconds(song), 1), "patterns": list(song["patterns"]),
            "sections": [f"{s['name']}:{s['pattern']}x{s['repeat']}" + (f"{s['transpose']:+d}" if s["transpose"] else "") for s in song["sections"]],
            "notes": notes, "instruments": {ln: song["lanes"][ln]["instrument"] for ln in LANES}, "seed": song.get("seed", 1)}


def notes_in_bar(song: dict, pattern: str, lane: str, bar: int) -> list[dict]:
    lo, hi = bar * STEPS_PER_BAR, (bar + 1) * STEPS_PER_BAR
    return [n for n in song["patterns"][pattern]["notes"][lane] if lo <= n["s"] < hi]


def sounding_lanes(song: dict) -> list[str]:
    """Solo wins; else every unmuted lane."""
    solo = [ln for ln in LANES if song["lanes"][ln].get("solo")]
    if solo:
        return solo
    return [ln for ln in LANES if not song["lanes"][ln].get("mute")]
