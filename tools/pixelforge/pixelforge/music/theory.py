"""Harmony for the composer and the editor: scales, keys, chords, progressions, snapping to a scale.

Pitches are MIDI numbers (60 = C4, 69 = A4 = 440 Hz). A *degree* is an index into a scale (0 = the root); degrees
may run below 0 or past the scale's length, which moves by octaves. Roman numerals are derived from the scale, so
the same progression reads `i VI III VII` in a minor key and `I vi iii vii°` in a major one.
"""

from __future__ import annotations

import math

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_NAMES = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#", "Cb": "B", "Fb": "E"}

SCALES: dict[str, list[int]] = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "phrygian": [0, 1, 3, 5, 7, 8, 10],
    "lydian": [0, 2, 4, 6, 7, 9, 11],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "harmonic_minor": [0, 2, 3, 5, 7, 8, 11],
    "hungarian_minor": [0, 2, 3, 6, 7, 8, 11],
    "phrygian_dominant": [0, 1, 4, 5, 7, 8, 10],
    "pentatonic_minor": [0, 3, 5, 7, 10],
    "pentatonic_major": [0, 2, 4, 7, 9],
    "blues": [0, 3, 5, 6, 7, 10],
    "whole_tone": [0, 2, 4, 6, 8, 10],
    "chromatic": list(range(12)),
}
# the scales a key signature names ("A minor", "D dorian"); the rest are reachable by their full name
SCALE_ALIASES = {"min": "minor", "aeolian": "minor", "aeol": "minor", "maj": "major", "ionian": "major", "dor": "dorian",
                 "phr": "phrygian", "hmin": "harmonic_minor", "pmin": "pentatonic_minor", "pmaj": "pentatonic_major",
                 "hij": "phrygian_dominant", "hijaz": "phrygian_dominant"}


def scale_name(s: str) -> str:
    s = s.strip().lower().replace(" ", "_").replace("-", "_")
    s = SCALE_ALIASES.get(s, s)
    if s not in SCALES:
        raise ValueError(f"unknown scale {s!r}; scales: {', '.join(SCALES)}")
    return s


def note_name(midi: int, octave: bool = True) -> str:
    """60 -> 'C4'; the octave can be left off for a pitch class."""
    m = int(round(midi))
    return NOTE_NAMES[m % 12] + (str(m // 12 - 1) if octave else "")


def parse_note(s: str, default_octave: int = 4) -> int:
    """'C#4' / 'Bb3' / 'A' / '61' -> MIDI."""
    t = str(s).strip()
    if t.lstrip("-").isdigit():
        return int(t)
    name, rest = t[:1].upper(), t[1:]
    if rest[:1] in ("#", "b"):
        name += rest[0]
        rest = rest[1:]
    name = FLAT_NAMES.get(name, name)
    if name not in NOTE_NAMES:
        raise ValueError(f"not a note: {s!r}")
    octv = int(rest) if rest.strip() else default_octave
    return NOTE_NAMES.index(name) + 12 * (octv + 1)


def parse_key(s: str) -> tuple[int, str]:
    """'C# minor' / 'A' / 'D dorian' / 'Eb major' -> (root pitch class 0..11, scale name)."""
    parts = str(s).strip().split()
    if not parts:
        raise ValueError("an empty key")
    root = parse_note(parts[0], 0) % 12
    sc = scale_name(" ".join(parts[1:])) if len(parts) > 1 else "minor"
    return root, sc


def key_name(root: int, scale: str) -> str:
    return f"{NOTE_NAMES[root % 12]} {scale.replace('_', ' ')}"


def degree_to_midi(root: int, scale: str, degree: int, octave: int = 4) -> int:
    """Degree `degree` of the scale on `root` (a pitch class), in `octave` (C4-based), degrees wrapping by octaves."""
    sc = SCALES[scale_name(scale)]
    n = len(sc)
    o, d = divmod(int(degree), n)
    return (root % 12) + 12 * (octave + 1) + sc[d] + 12 * o


def midi_to_degree(root: int, scale: str, midi: int) -> tuple[int, int]:
    """The nearest scale degree of `midi` (ties go up) and the semitone error."""
    sc = SCALES[scale_name(scale)]
    pc = (midi - root) % 12
    best, err = 0, 99
    for i, step in enumerate(sc):
        e = min((pc - step) % 12, (step - pc) % 12)
        if e < err or (e == err and step > sc[best] and (step - pc) % 12 <= 6):
            best, err = i, e
    octave_part = (midi - root - sc[best] + 6) // 12
    return octave_part * len(sc) + best, err


def in_scale(root: int, scale: str, midi: int) -> bool:
    return (midi - root) % 12 in SCALES[scale_name(scale)]


def snap(midi: int, root: int, scale: str, direction: int = 0) -> int:
    """The nearest note of the scale (`direction` -1 rounds down, +1 up, 0 nearest; a tie goes up)."""
    midi = int(round(midi))
    if in_scale(root, scale, midi):
        return midi
    up, down = midi, midi
    while not in_scale(root, scale, up):
        up += 1
    while not in_scale(root, scale, down):
        down -= 1
    if direction > 0:
        return up
    if direction < 0:
        return down
    return up if (up - midi) <= (midi - down) else down


def step_in_scale(midi: int, steps: int, root: int, scale: str) -> int:
    """Move `steps` scale degrees from `midi` (snapped first)."""
    m = snap(midi, root, scale)
    d, _ = midi_to_degree(root, scale, m)
    return degree_to_midi(root, scale, d + steps, -1)


def chord(root: int, scale: str, degree: int, octave: int = 3, kind: str = "triad", inversion: int = 0) -> list[int]:
    """Chord tones built in thirds from the scale: triad | seventh | power | sus4 | add9; `inversion` lifts the lowest
    notes an octave."""
    if kind == "power":
        offs = [0, 4]  # root and fifth (two scale thirds up)
    elif kind == "seventh":
        offs = [0, 2, 4, 6]
    elif kind == "sus4":
        offs = [0, 3, 4]
    elif kind == "add9":
        offs = [0, 2, 4, 8]
    else:
        offs = [0, 2, 4]
    notes = [degree_to_midi(root, scale, degree + o, octave) for o in offs]
    for _ in range(inversion % len(notes)):
        notes = notes[1:] + [notes[0] + 12]
    return notes


def chord_quality(root: int, scale: str, degree: int) -> str:
    """'major' | 'minor' | 'dim' | 'aug' from the third and fifth of the scale chord."""
    a, b, c = chord(root, scale, degree, 3)
    third, fifth = (b - a) % 12, (c - a) % 12
    if third == 4 and fifth == 8:
        return "aug"
    if third == 3 and fifth == 6:
        return "dim"
    return "major" if third == 4 else "minor" if third == 3 else "other"


def roman(root: int, scale: str, degree: int) -> str:
    """The chord's roman numeral: upper case major, lower case minor, ° diminished, + augmented."""
    numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"]
    n = len(SCALES[scale_name(scale)])
    q = chord_quality(root, scale, degree)
    name = numerals[degree % n] if degree % n < len(numerals) else str(degree % n + 1)
    if q in ("minor", "dim"):
        name = name.lower()
    return name + ("°" if q == "dim" else "+" if q == "aug" else "")


def smooth_voicing(prev: list[int] | None, notes: list[int], low: int = 48, high: int = 72) -> list[int]:
    """The inversion and octave of `notes` that moves least from `prev` and stays inside [low, high]."""
    best, best_cost = None, math.inf
    for inv in range(len(notes)):
        voiced = notes[inv:] + [n + 12 for n in notes[:inv]]
        for shift in (-24, -12, 0, 12, 24):
            cand = [n + shift for n in voiced]
            if min(cand) < low or max(cand) > high:
                continue
            if prev:
                cost = sum(min(abs(c - p) for p in prev) for c in cand) + abs(sum(cand) / len(cand) - sum(prev) / len(prev)) * 0.5
            else:
                cost = abs(sum(cand) / len(cand) - (low + high) / 2)
            if cost < best_cost:
                best, best_cost = cand, cost
    return best or notes


# --------------------------------------------------------------- drum numbers (General MIDI, as every tracker uses)
DRUMS = {"kick": 36, "snare": 38, "stick": 37, "clap": 39, "hat": 42, "hat_open": 46, "tom_low": 41, "tom_mid": 45,
         "tom_high": 48, "crash": 49, "ride": 51, "tambourine": 54, "cowbell": 56, "timpani": 47, "shaker": 70}
DRUM_NAMES = {v: k for k, v in DRUMS.items()}
