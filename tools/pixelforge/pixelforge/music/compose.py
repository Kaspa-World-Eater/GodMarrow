"""The composer: a new piece from (genre, mood, key, tempo, length, seed), with real harmony.

What it writes, per genre: a chord progression (one chord a bar), a two-bar motif that the lead states and then
develops (sequenced over the next chords, varied, inverted in the bridge), a counter-line that answers the lead in
its rests and moves against it, a pad voiced for smooth movement between chords, a bass that pedals, walks or
pumps, a sparkle lane of high arpeggios, drums from a pattern table with fills, and a structure of sections
(intro, A, A2, bridge in a new key, A3, end) chained to the asked length. Everything comes from one seeded
generator, so the same inputs are the same piece. The same generators regenerate one bar or one lane of an
existing pattern for the editor.
"""

from __future__ import annotations

import copy

import numpy as np

from . import song as S, theory
from .theory import DRUMS

# ------------------------------------------------------------------ the tables
# drum patterns: 16 characters a bar, x = hit, o = soft, . = rest
DRUM_PATTERNS = {
    "rock": {"kick": "x...x...x...x...", "snare": "....x.......x...", "hat": "x.o.x.o.x.o.x.o."},
    "rock_drive": {"kick": "x..x..x...x.x...", "snare": "....x.......x..o", "hat": "x.x.x.x.x.x.x.x."},
    "march": {"kick": "x.......x.......", "snare": "x..ox..ox..ox.oo", "hat": "................"},
    "battle": {"kick": "x..x..x.x..x..x.", "snare": "....x..o....x.oo", "hat": "x.x.x.x.x.x.x.x.", "tom_low": "..............x."},
    "boss": {"kick": "x.x...x.x.x...x.", "snare": "....x.......x...", "tom_low": "......x.......xx", "hat": "o.o.o.o.o.o.o.o."},
    "taiko_slow": {"kick": "x.......o.......", "tom_low": "......o.........", "stick": "....o.......o..."},
    "heartbeat": {"kick": "x.o.............", "stick": "................"},
    "waltz_feel": {"kick": "x.....x.....x...", "hat": "..o.o...o.o...o.", "stick": "...x.......x...."},
    "tavern": {"kick": "x...x...x...x...", "tambourine": "..x...x...x...x.", "hat": "x.x.x.x.x.x.x.x.", "clap": "....x.......x..."},
    "town": {"kick": "x.......x.......", "hat": "..o...o...o...o.", "shaker": "x.x.x.x.x.x.x.x."},
    "synthwave": {"kick": "x...x...x...x...", "snare": "....x.......x...", "hat": "..x...x...x...x.", "clap": "....x.......x..."},
    "chip": {"kick": "x...x...x..xx...", "snare": "....x.......x...", "hat": "x.x.x.x.x.x.x.x."},
    "victory": {"kick": "x...x...x...x...", "snare": "x.o.x.o.x.o.xxxx", "crash": "x...............", "hat": "..x...x...x...x."},
    "sorrow": {"kick": "x...............", "tom_low": "........o.......", "ride": "....o.......o..."},
    "ambient": {"tom_low": "x...............", "ride": "........o......."},
    "none": {},
}

# genre -> how to compose. progressions are scale degrees (0 = the root), one chord a bar
GENRES: dict[str, dict] = {
    "dungeon_synth": {
        "words": "slow, dark, hall-wide; organ and strings, bells high over a drone bass", "tempo": (62, 80),
        "scales": ["minor", "phrygian", "dorian"], "progressions": [[0, 5, 2, 6], [0, 3, 6, 0], [0, 5, 3, 6], [0, 6, 5, 4]],
        "bridge": [[3, 0, 6, 4], [5, 2, 3, 0], [1, 4, 0, 6]], "modulate": [3, -4, 5],
        "instruments": {"lead": ["flute_wood", "choir_ahh", "lead_tri"], "counter": ["strings_dark", "cello"], "pad": ["organ_cathedral", "pad_dark", "choir_men"],
                        "bass": ["bass_sub", "bass_synth"], "sparkle": ["bells_glass", "celesta", "music_box"], "drums": ["drums_taiko"]},
        "drums": "taiko_slow", "bass": "pedal", "sparkle": "sparse", "lead_density": 0.45, "lead_octave": 5, "counter": "answer", "pad_rhythm": "whole",
        "chord_kind": "triad", "fx": {"reverb": 0.55, "reverb_size": 2.6, "echo": 0.3, "echo_beats": 1.5, "crunch": 0.25, "bits": 14, "rate": 32000},
        "structure": ["intro", "A", "A2", "B", "A3", "end"],
    },
    "gothic_orchestral": {
        "words": "strings and brass in a cathedral, choir under, timpani with weight", "tempo": (76, 100),
        "scales": ["minor", "harmonic_minor"], "progressions": [[0, 5, 3, 4], [0, 3, 6, 4], [0, 6, 5, 4], [0, 2, 5, 4]],
        "bridge": [[3, 6, 2, 4], [5, 3, 0, 4]], "modulate": [3, 5, -2],
        "instruments": {"lead": ["strings_warm", "brass_horn", "choir_ahh"], "counter": ["cello", "tuba", "brass_horn"], "pad": ["choir_men", "strings_dark", "organ_cathedral"],
                        "bass": ["cello", "tuba", "bass_sub"], "sparkle": ["harp", "bells_tubular", "celesta"], "drums": ["drums_orch"]},
        "drums": "march", "bass": "root5", "sparkle": "arp8", "lead_density": 0.55, "lead_octave": 5, "counter": "answer", "pad_rhythm": "whole",
        "chord_kind": "seventh", "fx": {"reverb": 0.5, "reverb_size": 2.4, "echo": 0.15, "crunch": 0.2, "bits": 16, "rate": 32000},
        "structure": ["intro", "A", "A2", "B", "A3", "end"],
    },
    "chiptune": {
        "words": "pulse leads, a triangle bass, the noise channel; bright and quick", "tempo": (128, 160),
        "scales": ["major", "minor", "mixolydian"], "progressions": [[0, 3, 4, 0], [0, 5, 3, 4], [5, 3, 0, 4], [0, 4, 5, 3]],
        "bridge": [[3, 4, 0, 0], [1, 4, 5, 2]], "modulate": [5, 7, -5],
        "instruments": {"lead": ["lead_square", "lead_pulse25", "lead_pulse12"], "counter": ["lead_pulse12", "lead_tri", "lead_pulse25"], "pad": ["lead_pulse25", "organ_reed"],
                        "bass": ["lead_tri", "bass_synth"], "sparkle": ["lead_square", "music_box"], "drums": ["drums_chip"]},
        "drums": "chip", "bass": "pump", "sparkle": "arp16", "lead_density": 0.8, "lead_octave": 5, "counter": "answer", "pad_rhythm": "stab8",
        "chord_kind": "triad", "fx": {"reverb": 0.08, "reverb_size": 0.5, "echo": 0.2, "echo_beats": 0.5, "crunch": 0.3, "bits": 10, "rate": 32000, "voices": 6},
        "structure": ["A", "A2", "B", "A3", "end"],
    },
    "dark_ambient": {
        "words": "almost no pulse; low pads, breath, far bells", "tempo": (50, 66),
        "scales": ["phrygian", "minor", "hungarian_minor"], "progressions": [[0, 0, 1, 0], [0, 5, 0, 6], [0, 1, 0, 3]],
        "bridge": [[3, 3, 0, 0], [6, 5, 0, 0]], "modulate": [-4, 1, 3],
        "instruments": {"lead": ["choir_ooh", "pad_glass", "flute_pan"], "counter": ["strings_dark", "choir_men"], "pad": ["pad_dark", "choir_men"],
                        "bass": ["bass_sub"], "sparkle": ["bells_glass", "bells_tubular"], "drums": ["drums_taiko", "drums_brush"]},
        "drums": "ambient", "bass": "pedal", "sparkle": "sparse", "lead_density": 0.25, "lead_octave": 4, "counter": "sustain", "pad_rhythm": "whole",
        "chord_kind": "add9", "fx": {"reverb": 0.7, "reverb_size": 3.5, "echo": 0.35, "echo_beats": 2.0, "crunch": 0.15, "bits": 16, "rate": 32000},
        "structure": ["intro", "A", "B", "A2", "end"],
    },
    "battle": {
        "words": "driving drums, brass stabs, a saw lead, strings running sixteenths", "tempo": (138, 170),
        "scales": ["minor", "harmonic_minor", "phrygian"], "progressions": [[0, 0, 5, 4], [0, 6, 5, 4], [0, 3, 5, 4], [0, 1, 0, 4]],
        "bridge": [[3, 4, 5, 4], [5, 6, 0, 4]], "modulate": [5, 3, 7],
        "instruments": {"lead": ["lead_saw", "brass_stab", "trumpet", "lead_square"], "counter": ["strings_fast", "brass_horn", "lead_pulse25"], "pad": ["strings_fast", "brass_stab", "organ_reed"],
                        "bass": ["bass_synth", "bass_slap", "bass_pick"], "sparkle": ["harpsichord", "lead_pulse12", "strings_fast"], "drums": ["drums_rock", "drums_orch"]},
        "drums": "battle", "bass": "pump", "sparkle": "arp16", "lead_density": 0.85, "lead_octave": 5, "counter": "answer", "pad_rhythm": "stab8",
        "chord_kind": "triad", "fx": {"reverb": 0.2, "reverb_size": 1.0, "echo": 0.2, "echo_beats": 0.5, "crunch": 0.4, "bits": 12, "rate": 32000},
        "structure": ["A", "A2", "B", "A3", "A", "end"],
    },
    "boss": {
        "words": "heavier and stranger than battle: tritones, the choir, a pedal that will not move", "tempo": (120, 150),
        "scales": ["phrygian", "hungarian_minor", "harmonic_minor"], "progressions": [[0, 1, 0, 6], [0, 0, 1, 4], [0, 5, 1, 0], [0, 6, 1, 4]],
        "bridge": [[3, 1, 4, 4], [6, 1, 0, 0]], "modulate": [1, 6, -5],
        "instruments": {"lead": ["brass_stab", "lead_sync", "organ_reed", "trumpet"], "counter": ["choir_ahh", "strings_fast", "tuba"], "pad": ["choir_men", "organ_cathedral", "strings_dark"],
                        "bass": ["bass_synth", "tuba", "bass_slap"], "sparkle": ["harpsichord", "bells_tubular", "lead_pulse12"], "drums": ["drums_rock", "drums_taiko", "drums_orch"]},
        "drums": "boss", "bass": "octaves", "sparkle": "arp8", "lead_density": 0.7, "lead_octave": 4, "counter": "answer", "pad_rhythm": "half",
        "chord_kind": "power", "fx": {"reverb": 0.3, "reverb_size": 1.6, "echo": 0.25, "echo_beats": 0.75, "crunch": 0.5, "bits": 12, "rate": 32000},
        "structure": ["intro", "A", "A2", "B", "A3", "A2", "end"],
    },
    "tavern": {
        "words": "a lute and a flute over a shuffle, tambourine, a friendly major key", "tempo": (104, 128),
        "scales": ["major", "mixolydian", "dorian"], "progressions": [[0, 3, 4, 0], [0, 5, 3, 4], [0, 4, 3, 4], [0, 0, 3, 4]],
        "bridge": [[3, 0, 3, 4], [5, 1, 4, 0]], "modulate": [5, -5, 7],
        "instruments": {"lead": ["flute_wood", "lute", "ocarina", "oboe"], "counter": ["lute", "guitar_steel", "pizzicato"], "pad": ["organ_reed", "guitar_steel", "harpsichord"],
                        "bass": ["bass_pick", "pizzicato", "tuba"], "sparkle": ["harp", "vibraphone", "music_box"], "drums": ["drums_brush", "drums_rock"]},
        "drums": "tavern", "bass": "walk", "sparkle": "offbeat", "lead_density": 0.75, "lead_octave": 5, "counter": "answer", "pad_rhythm": "stab8",
        "chord_kind": "triad", "fx": {"reverb": 0.2, "reverb_size": 0.9, "echo": 0.1, "crunch": 0.2, "bits": 16, "rate": 32000},
        "structure": ["A", "A2", "B", "A3", "end"],
    },
    "town": {
        "words": "calm and kind: harp, strings, a gentle flute; the place you rest", "tempo": (84, 108),
        "scales": ["major", "lydian", "dorian"], "progressions": [[0, 5, 3, 4], [0, 2, 3, 4], [0, 3, 0, 4], [5, 3, 0, 4]],
        "bridge": [[1, 4, 0, 5], [3, 4, 5, 2]], "modulate": [5, -3, 7],
        "instruments": {"lead": ["flute_wood", "ocarina", "harp", "strings_warm"], "counter": ["strings_warm", "cello", "guitar_steel"], "pad": ["strings_warm", "pad_glass", "organ_reed"],
                        "bass": ["bass_pick", "cello", "bass_sub"], "sparkle": ["harp", "celesta", "vibraphone"], "drums": ["drums_brush"]},
        "drums": "town", "bass": "root5", "sparkle": "arp8", "lead_density": 0.55, "lead_octave": 5, "counter": "answer", "pad_rhythm": "whole",
        "chord_kind": "seventh", "fx": {"reverb": 0.35, "reverb_size": 1.6, "echo": 0.15, "crunch": 0.15, "bits": 16, "rate": 32000},
        "structure": ["intro", "A", "A2", "B", "A3", "end"],
    },
    "title": {
        "words": "the piece that opens the game: a slow statement, then the theme in full", "tempo": (72, 96),
        "scales": ["minor", "dorian", "harmonic_minor"], "progressions": [[0, 5, 3, 6], [0, 3, 5, 4], [0, 6, 3, 4], [0, 5, 6, 4]],
        "bridge": [[3, 6, 0, 4], [5, 3, 1, 4]], "modulate": [3, 5, -4],
        "instruments": {"lead": ["brass_horn", "strings_warm", "choir_ahh", "flute_wood"], "counter": ["cello", "strings_dark", "choir_ooh"], "pad": ["strings_warm", "choir_men", "organ_cathedral"],
                        "bass": ["cello", "bass_sub", "tuba"], "sparkle": ["bells_glass", "harp", "celesta"], "drums": ["drums_orch", "drums_taiko"]},
        "drums": "march", "bass": "pedal", "sparkle": "arp8", "lead_density": 0.5, "lead_octave": 5, "counter": "answer", "pad_rhythm": "whole",
        "chord_kind": "seventh", "fx": {"reverb": 0.5, "reverb_size": 2.4, "echo": 0.2, "echo_beats": 1.0, "crunch": 0.2, "bits": 16, "rate": 32000},
        "structure": ["intro", "A", "A2", "B", "A3", "end"],
    },
    "victory": {
        "words": "a short fanfare: brass, a rising line, the cadence and the chord", "tempo": (120, 144),
        "scales": ["major", "lydian", "mixolydian"], "progressions": [[0, 3, 4, 0], [0, 5, 3, 4], [3, 4, 0, 0]],
        "bridge": [[1, 4, 0, 0]], "modulate": [5, 7],
        "instruments": {"lead": ["trumpet", "brass_stab", "lead_square"], "counter": ["brass_horn", "strings_fast"], "pad": ["brass_horn", "strings_warm", "organ_reed"],
                        "bass": ["tuba", "bass_synth", "bass_pick"], "sparkle": ["bells_glass", "harp", "vibraphone"], "drums": ["drums_orch", "drums_rock"]},
        "drums": "victory", "bass": "root5", "sparkle": "arp8", "lead_density": 0.8, "lead_octave": 5, "counter": "answer", "pad_rhythm": "half",
        "chord_kind": "triad", "fx": {"reverb": 0.3, "reverb_size": 1.4, "echo": 0.1, "crunch": 0.25, "bits": 16, "rate": 32000},
        "structure": ["A", "end"],
    },
    "sorrow": {
        "words": "a slow minor piece: piano, cello, a far choir; space between the notes", "tempo": (56, 76),
        "scales": ["minor", "dorian", "harmonic_minor"], "progressions": [[0, 5, 3, 4], [0, 2, 5, 4], [0, 6, 3, 0], [5, 3, 0, 4]],
        "bridge": [[3, 0, 5, 4], [1, 4, 0, 0]], "modulate": [3, -4, -2],
        "instruments": {"lead": ["piano_electric", "cello", "flute_wood", "choir_ooh"], "counter": ["cello", "strings_dark", "piano_electric"], "pad": ["strings_dark", "choir_men", "pad_dark"],
                        "bass": ["cello", "bass_sub", "bass_pick"], "sparkle": ["piano_electric", "celesta", "bells_glass"], "drums": ["drums_brush", "drums_taiko"]},
        "drums": "sorrow", "bass": "pedal", "sparkle": "sparse", "lead_density": 0.4, "lead_octave": 5, "counter": "sustain", "pad_rhythm": "whole",
        "chord_kind": "seventh", "fx": {"reverb": 0.55, "reverb_size": 2.8, "echo": 0.2, "echo_beats": 1.5, "crunch": 0.1, "bits": 16, "rate": 32000},
        "structure": ["intro", "A", "A2", "B", "A3", "end"],
    },
    "exploration": {
        "words": "walking music: a steady pulse, a curious lead, the chords always moving on", "tempo": (96, 120),
        "scales": ["dorian", "minor", "mixolydian", "lydian"], "progressions": [[0, 6, 5, 3], [0, 3, 6, 4], [0, 2, 3, 6], [0, 5, 6, 4]],
        "bridge": [[3, 6, 2, 4], [5, 1, 3, 6]], "modulate": [5, -4, 7, 3],
        "instruments": {"lead": ["lead_tri", "flute_wood", "harp", "ocarina"], "counter": ["pizzicato", "lute", "strings_warm"], "pad": ["pad_glass", "strings_warm", "organ_reed"],
                        "bass": ["bass_pick", "bass_synth", "pizzicato"], "sparkle": ["marimba", "harp", "music_box"], "drums": ["drums_brush", "drums_rock"]},
        "drums": "town", "bass": "walk", "sparkle": "arp8", "lead_density": 0.6, "lead_octave": 5, "counter": "answer", "pad_rhythm": "half",
        "chord_kind": "seventh", "fx": {"reverb": 0.3, "reverb_size": 1.4, "echo": 0.2, "echo_beats": 0.75, "crunch": 0.2, "bits": 16, "rate": 32000},
        "structure": ["intro", "A", "A2", "B", "A3", "end"],
    },
    "synthwave": {
        "words": "octave bass, gated pads, a sync lead, the drum machine", "tempo": (100, 124),
        "scales": ["minor", "dorian", "mixolydian"], "progressions": [[0, 5, 3, 6], [0, 3, 5, 6], [5, 6, 0, 3], [0, 6, 5, 3]],
        "bridge": [[3, 6, 5, 4], [1, 5, 3, 6]], "modulate": [3, -2, 5],
        "instruments": {"lead": ["lead_sync", "lead_saw", "lead_square"], "counter": ["lead_pulse25", "piano_electric", "strings_fast"], "pad": ["pad_synthwave", "pad_glass", "organ_reed"],
                        "bass": ["bass_synth", "bass_slap"], "sparkle": ["piano_electric", "bells_glass", "lead_pulse12"], "drums": ["drums_electro"]},
        "drums": "synthwave", "bass": "octaves", "sparkle": "arp16", "lead_density": 0.65, "lead_octave": 5, "counter": "answer", "pad_rhythm": "stab8",
        "chord_kind": "seventh", "fx": {"reverb": 0.3, "reverb_size": 1.8, "echo": 0.35, "echo_beats": 0.75, "echo_feedback": 0.45, "crunch": 0.3, "bits": 12, "rate": 32000},
        "structure": ["intro", "A", "A2", "B", "A3", "end"],
    },
}

MOODS: dict[str, dict] = {
    "dark": {"tempo": 0.92, "scales": ["minor", "phrygian", "harmonic_minor", "hungarian_minor"], "density": 0.9, "octave": 0},
    "hopeful": {"tempo": 1.0, "scales": ["major", "dorian", "lydian", "mixolydian"], "density": 1.0, "octave": 0},
    "tense": {"tempo": 1.08, "scales": ["phrygian", "harmonic_minor", "minor"], "density": 1.15, "octave": 0},
    "calm": {"tempo": 0.88, "scales": ["major", "dorian", "lydian", "pentatonic_major"], "density": 0.7, "octave": 0},
    "heroic": {"tempo": 1.05, "scales": ["major", "mixolydian", "dorian"], "density": 1.1, "octave": 0},
    "sombre": {"tempo": 0.85, "scales": ["minor", "dorian", "harmonic_minor"], "density": 0.7, "octave": -1},
    "playful": {"tempo": 1.1, "scales": ["major", "mixolydian", "pentatonic_major"], "density": 1.2, "octave": 1},
    "eerie": {"tempo": 0.9, "scales": ["phrygian", "hungarian_minor", "whole_tone", "minor"], "density": 0.6, "octave": 1},
}

# rhythm pools for the two-bar motif: step lengths that sum to 32 (a 0 length is a rest of the next value)
RHYTHMS = {
    "slow": [[8, 4, 4, 12, 4], [4, 4, 8, 8, 8], [6, 2, 8, 4, 4, 8], [8, 8, 4, 4, 8], [4, 2, 2, 8, 4, 4, 8], [12, 4, 8, 8]],
    "mid": [[4, 2, 2, 4, 4, 2, 2, 4, 8], [2, 2, 4, 4, 4, 2, 2, 12], [3, 3, 2, 4, 4, 4, 4, 8], [4, 4, 2, 2, 4, 6, 2, 8], [2, 2, 2, 2, 8, 4, 4, 8], [6, 2, 4, 4, 2, 2, 4, 8]],
    "fast": [[2, 2, 2, 2, 4, 4, 2, 2, 2, 2, 8], [1, 1, 2, 2, 2, 4, 4, 2, 2, 4, 8], [2, 1, 1, 2, 2, 4, 4, 2, 2, 4, 8], [3, 1, 2, 2, 4, 4, 2, 2, 4, 8], [2, 2, 4, 2, 2, 4, 2, 2, 2, 2, 8]],
}


def genre_table() -> list[dict]:
    return [{"name": k, "words": v["words"], "tempo": list(v["tempo"]), "scales": v["scales"], "drums": v["drums"], "bass": v["bass"]} for k, v in GENRES.items()]


# ------------------------------------------------------------------ helpers
class _Ctx:
    """What every generator needs: the song's key, the rng, the genre's rules."""

    def __init__(self, song: dict, rules: dict, rng: np.random.Generator, density: float = 1.0):
        self.song, self.rules, self.rng, self.density = song, rules, rng, density
        self.root, self.scale = song["root"], song["scale"]

    def chord_tones(self, degree: int, octave: int = 4) -> list[int]:
        return theory.chord(self.root, self.scale, degree, octave, self.rules.get("chord_kind", "triad"))

    def nearest_chord_tone(self, pitch: int, degree: int) -> int:
        tones = sorted({t % 12 for t in self.chord_tones(degree)})
        best = min(range(pitch - 6, pitch + 7), key=lambda m: (0 if m % 12 in tones else 99) + abs(m - pitch))
        return best

    def step_scale(self, pitch: int, steps: int) -> int:
        return theory.step_in_scale(pitch, steps, self.root, self.scale)

    def clamp(self, pitch: int, lo: int, hi: int) -> int:
        while pitch < lo:
            pitch += 12
        while pitch > hi:
            pitch -= 12
        return pitch

    def choice(self, seq):
        return seq[int(self.rng.integers(len(seq)))]


def _note(s, p, v=0.8, l=1.0) -> dict:
    return {"s": int(s), "p": int(p), "v": round(float(v), 3), "l": float(l)}


def _pattern_chords(song: dict, pattern: str) -> list[int]:
    pat = song["patterns"][pattern]
    if pat.get("chords"):
        return list(pat["chords"])
    # infer from the pad's lowest note per bar, else the tonic
    out = []
    for b in range(pat["bars"]):
        pads = [n for n in pat["notes"].get("pad", []) if b * 16 <= n["s"] < (b + 1) * 16]
        if pads:
            low = min(n["p"] for n in pads)
            d, _ = theory.midi_to_degree(song["root"], song["scale"], low)
            out.append(d % len(theory.SCALES[song["scale"]]))
        else:
            out.append(0)
    return out


# ------------------------------------------------------------------ the lead
def motif(ctx: _Ctx, chords: list[int], speed: str, octave: int) -> list[dict]:
    """Two bars of melody over chords[0:2]: a rhythm from the pool, a contour that walks the scale and lands on
    chord tones at the strong beats, the phrase ending on a chord tone with a long note."""
    rhythm = list(ctx.choice(RHYTHMS[speed]))
    lo, hi = 12 * (octave + 1) + ctx.root - 3, 12 * (octave + 1) + ctx.root + 14
    pitch = ctx.choice(ctx.chord_tones(chords[0], octave))
    pitch = ctx.clamp(pitch, lo, hi)
    notes, s, direction = [], 0, 1
    for i, ln in enumerate(rhythm):
        bar = min(s // 16, len(chords) - 1)
        strong = s % 8 == 0
        last = i == len(rhythm) - 1
        if i > 0:
            r = ctx.rng.random()
            if last:
                pitch = ctx.nearest_chord_tone(pitch, chords[bar])
                if ctx.rng.random() < 0.5:
                    pitch = ctx.nearest_chord_tone(pitch + (-3 if direction > 0 else 3), chords[bar])
            elif r < 0.6:
                pitch = ctx.step_scale(pitch, direction)
            elif r < 0.85:
                pitch = ctx.step_scale(pitch, 2 * direction)
            else:
                tones = [t for t in ctx.chord_tones(chords[bar], octave) if abs(t - pitch) <= 7] or ctx.chord_tones(chords[bar], octave)
                pitch = ctx.choice(tones) + (12 if ctx.rng.random() < 0.15 and pitch < hi - 12 else 0)
            if strong and not last and ctx.rng.random() < 0.7:
                pitch = ctx.nearest_chord_tone(pitch, chords[bar])
            if pitch >= hi - 2:
                direction = -1
            elif pitch <= lo + 2:
                direction = 1
            elif ctx.rng.random() < 0.3:
                direction = -direction
            pitch = ctx.clamp(pitch, lo, hi)
        rest = (not strong) and ctx.rng.random() < (0.12 / max(ctx.density, 0.3)) and not last and i > 0
        if not rest:
            vel = 0.85 if strong else 0.65 + 0.15 * ctx.rng.random()
            notes.append(_note(s, pitch, vel, ln - (0.5 if ln > 1 and not last else 0.0)))
        s += ln
    return notes


def develop(ctx: _Ctx, mot: list[dict], chords: list[int], from_degree: int, to_degree: int, cadence: bool = True, invert: bool = False) -> list[dict]:
    """The motif again, moved in the scale to sit on another chord (a sequence), inverted when asked; the last note
    pulled to a chord tone of the final chord (the cadence)."""
    shift = (to_degree - from_degree)
    out = []
    first = mot[0]["p"] if mot else 60
    for n in mot:
        p = n["p"]
        if invert:
            d0, _ = theory.midi_to_degree(ctx.root, ctx.scale, first)
            d, _ = theory.midi_to_degree(ctx.root, ctx.scale, p)
            p = theory.step_in_scale(first, -(d - d0), ctx.root, ctx.scale)
        p = ctx.step_scale(p, shift)
        out.append({**n, "p": p})
    if cadence and out:
        bar = min(out[-1]["s"] // 16, len(chords) - 1)
        out[-1]["p"] = ctx.nearest_chord_tone(out[-1]["p"], chords[bar])
        out[-1]["l"] = max(out[-1]["l"], 6.0)
    return out


def ornament(ctx: _Ctx, notes: list[dict], chords: list[int]) -> list[dict]:
    """A variation: long notes split with a neighbour note, the climax lifted an octave, accents moved."""
    out = []
    top = max((n["p"] for n in notes), default=60)
    for n in notes:
        if n["l"] >= 4 and ctx.rng.random() < 0.5:
            half = n["l"] / 2
            nb = ctx.step_scale(n["p"], -1 if ctx.rng.random() < 0.6 else 1)
            out.append({**n, "l": half - 0.5})
            out.append(_note(n["s"] + half, nb, n["v"] * 0.8, half))
        elif n["p"] == top and ctx.rng.random() < 0.35 and n["p"] + 12 < 96:
            out.append({**n, "p": n["p"] + 12, "v": min(1.0, n["v"] + 0.1)})
        else:
            out.append({**n, "v": min(1.0, max(0.3, n["v"] + (ctx.rng.random() - 0.5) * 0.1))})
    return out


def lead_for_pattern(ctx: _Ctx, chords: list[int], speed: str, octave: int, mot: list[dict] | None = None, variation: str = "state") -> tuple[list[dict], list[dict]]:
    """A 4-bar lead over `chords`: the motif (bars 1-2) and its development (bars 3-4). Returns (notes, motif)."""
    mot = mot or motif(ctx, chords, speed, octave)
    bars = max(len(chords), 2)
    notes = list(mot) if variation != "bridge" else develop(ctx, mot, chords, chords[0], chords[0], cadence=False, invert=True)
    if bars >= 4:
        dev = develop(ctx, mot, chords[2:], chords[0], chords[2], cadence=True, invert=variation == "bridge" and ctx.rng.random() < 0.5)
        for n in dev:
            notes.append({**n, "s": n["s"] + 32})
    if variation == "vary":
        notes = ornament(ctx, notes, chords)
    lo = 12 * (octave + 1) + ctx.root - 5
    for n in notes:
        n["p"] = ctx.clamp(n["p"], lo, lo + 24)
    return notes, mot


# ------------------------------------------------------------------ the other lanes
def counter_for(ctx: _Ctx, lead: list[dict], chords: list[int], bars: int, mode: str, octave: int) -> list[dict]:
    """A line against the lead: in the lead's rests and under its long notes, moving the other way, chord tones on
    the strong beats, never the lead's own pitch class on the same step (no parallel octaves)."""
    out = []
    if mode == "none":
        return out
    occupied = np.zeros(bars * 16, bool)
    lead_at = {}
    for n in lead:
        for k in range(int(n["s"]), min(bars * 16, int(n["s"] + n["l"]))):
            occupied[k] = True
            lead_at[k] = n["p"]
    pitch = ctx.chord_tones(chords[0], octave)[0]
    last_lead = None
    for bar in range(bars):
        ch = chords[min(bar, len(chords) - 1)]
        if mode == "sustain":
            tones = ctx.chord_tones(ch, octave)
            p = ctx.nearest_chord_tone(pitch, ch) if bar else tones[0]
            if any(lead_at.get(bar * 16 + k, -1) % 12 == p % 12 for k in range(0, 16, 4)):
                p = tones[1] if len(tones) > 1 else p
            out.append(_note(bar * 16, p, 0.55, 15.0))
            pitch = p
            continue
        s = bar * 16
        while s < (bar + 1) * 16:
            free = not occupied[s]
            held = occupied[s] and s in lead_at and (s % 8 == 4) and any(occupied[s - k] for k in range(1, 4) if s - k >= 0)
            if free or held:
                ln = 2.0 if free and not occupied[min(s + 2, bars * 16 - 1)] else 4.0 if held else 2.0
                lead_p = lead_at.get(s - 1, lead_at.get(s))
                if lead_p is not None and last_lead is not None:
                    direction = -1 if lead_p > last_lead else 1 if lead_p < last_lead else ctx.choice([-1, 1])
                else:
                    direction = ctx.choice([-1, 1])
                pitch = ctx.step_scale(pitch, direction * (1 if ctx.rng.random() < 0.7 else 2))
                if s % 8 == 0 or ctx.rng.random() < 0.3:
                    pitch = ctx.nearest_chord_tone(pitch, ch)
                lp = lead_at.get(s)
                if lp is not None and lp % 12 == pitch % 12:
                    tones = ctx.chord_tones(ch, octave)
                    pitch = next((t for t in tones if t % 12 != lp % 12), pitch)
                pitch = ctx.clamp(pitch, 12 * (octave + 1) + ctx.root - 7, 12 * (octave + 1) + ctx.root + 12)
                if ctx.rng.random() < 0.85 * ctx.density + 0.1:
                    out.append(_note(s, pitch, 0.5 + 0.2 * ctx.rng.random(), ln - 0.25))
                s += int(ln)
                last_lead = lead_p if lead_p is not None else last_lead
            else:
                last_lead = lead_at.get(s, last_lead)
                s += 1
    return out


def pad_for(ctx: _Ctx, chords: list[int], bars: int, rhythm: str, prev: list[int] | None = None) -> list[dict]:
    out = []
    low, high = 12 * 4 + ctx.root - 4, 12 * 5 + ctx.root + 7
    for bar in range(bars):
        ch = chords[min(bar, len(chords) - 1)]
        voiced = theory.smooth_voicing(prev, ctx.chord_tones(ch, 4), low, high)
        prev = voiced
        if rhythm == "whole":
            slots = [(0, 15.5)]
        elif rhythm == "half":
            slots = [(0, 7.5), (8, 7.5)]
        else:  # stab8: on the off-eighths, short
            slots = [(k, 1.5) for k in range(0, 16, 2)]
        for s, ln in slots:
            vel = 0.6 if rhythm != "stab8" else (0.6 if s % 4 == 0 else 0.45)
            for i, p in enumerate(voiced):
                out.append(_note(bar * 16 + s, p, vel * (1.0 if i == 0 else 0.9), ln))
    return out


def bass_for(ctx: _Ctx, chords: list[int], bars: int, style: str) -> list[dict]:
    out = []
    octave = 2
    for bar in range(bars):
        ch = chords[min(bar, len(chords) - 1)]
        nxt = chords[min(bar + 1, len(chords) - 1)] if bar + 1 < bars else chords[0]
        root = theory.degree_to_midi(ctx.root, ctx.scale, ch, octave)
        root = ctx.clamp(root, 12 * 3 + ctx.root - 7, 12 * 3 + ctx.root + 5)
        fifth = root + 7
        third = theory.degree_to_midi(ctx.root, ctx.scale, ch + 2, octave)
        third = ctx.clamp(third, root, root + 11)
        next_root = ctx.clamp(theory.degree_to_midi(ctx.root, ctx.scale, nxt, octave), 12 * 3 + ctx.root - 7, 12 * 3 + ctx.root + 5)
        b = bar * 16
        if style == "pedal":
            out.append(_note(b, root, 0.8, 15.5))
            if bar % 4 == 3:
                out[-1]["l"] = 7.5
                out.append(_note(b + 8, fifth if ctx.rng.random() < 0.6 else root - 12 + 12, 0.7, 7.5))
        elif style == "root5":
            out.append(_note(b, root, 0.85, 7.5))
            out.append(_note(b + 8, fifth if bar % 2 == 0 else third, 0.7, 7.5))
        elif style == "walk":
            approach = next_root - 1 if next_root > root else next_root + 1
            for k, p in enumerate((root, third, fifth, approach)):
                out.append(_note(b + 4 * k, p, 0.8 if k == 0 else 0.65, 3.5))
        elif style == "pump":
            for k in range(8):
                out.append(_note(b + 2 * k, root if k % 2 == 0 else root + (12 if k % 4 == 1 else 7 if ctx.rng.random() < 0.5 else 12), 0.85 if k % 2 == 0 else 0.6, 1.5))
        elif style == "octaves":
            for k in range(16):
                out.append(_note(b + k, root if k % 2 == 0 else root + 12, 0.8 if k % 4 == 0 else 0.6, 0.8))
        else:  # arpeggio
            for k, p in enumerate((root, fifth, root + 12, fifth)):
                out.append(_note(b + 4 * k, p, 0.8 if k == 0 else 0.6, 3.5))
    return out


def sparkle_for(ctx: _Ctx, chords: list[int], bars: int, style: str) -> list[dict]:
    out = []
    if style == "none":
        return out
    for bar in range(bars):
        ch = chords[min(bar, len(chords) - 1)]
        tones = ctx.chord_tones(ch, 6)
        tones = [ctx.clamp(t, 12 * 6 + ctx.root - 5, 12 * 7 + ctx.root + 7) for t in tones]
        tones = sorted(set(tones))
        b = bar * 16
        if style == "arp16":
            seq = tones + [t + 12 for t in tones]
            pat = ctx.choice(["up", "updown", "down"])
            order = seq if pat == "up" else seq[::-1] if pat == "down" else seq + seq[-2:0:-1]
            for k in range(16):
                out.append(_note(b + k, order[k % len(order)], 0.42 if k % 4 else 0.55, 0.9))
        elif style == "arp8":
            seq = tones + [tones[0] + 12]
            for k in range(8):
                out.append(_note(b + 2 * k, seq[k % len(seq)], 0.45 if k % 2 else 0.58, 1.8))
        elif style == "offbeat":
            for k in range(2, 16, 4):
                out.append(_note(b + k, ctx.choice(tones) + 12, 0.5, 1.5))
        else:  # sparse: two to four high notes a bar, long
            n = 2 + int(ctx.rng.integers(3))
            steps = sorted(ctx.rng.choice(16, size=n, replace=False).tolist())
            for k, s in enumerate(steps):
                p = ctx.choice(tones) + (12 if ctx.rng.random() < 0.4 else 0)
                out.append(_note(b + s, p, 0.42 + 0.15 * ctx.rng.random(), 4.0))
                if ctx.rng.random() < 0.35 and s + 2 < 16:
                    out.append(_note(b + s + 2, ctx.step_scale(p, 2 if ctx.rng.random() < 0.5 else -2), 0.35, 3.0))
    return out


def drums_for(ctx: _Ctx, bars: int, pattern: str, intensity: float = 1.0, fill: bool = True, crash_first: bool = False) -> list[dict]:
    out = []
    pat = DRUM_PATTERNS.get(pattern, DRUM_PATTERNS["rock"])
    for bar in range(bars):
        b = bar * 16
        for drum, line in pat.items():
            for k, ch in enumerate(line[:16]):
                if ch == ".":
                    continue
                vel = (0.9 if ch == "x" else 0.55) * intensity
                if drum == "hat" and ctx.rng.random() < 0.1:
                    continue
                out.append(_note(b + k, DRUMS.get(drum, 42), min(1.0, vel), 1.0))
        if fill and bar % 4 == 3 and pattern not in ("none", "ambient", "sorrow", "heartbeat"):
            for k in range(12, 16):
                if ctx.rng.random() < 0.8:
                    out.append(_note(b + k, DRUMS["snare"] if k % 2 == 0 else DRUMS["tom_mid"], 0.5 + 0.1 * (k - 12), 1.0))
        if crash_first and bar == 0 and pattern not in ("none", "ambient", "heartbeat"):
            out.append(_note(b, DRUMS["crash"], 0.7 * intensity, 1.0))
    return out


# ------------------------------------------------------------------ the whole piece
def resolve(genre: str, mood: str) -> tuple[dict, dict]:
    g = GENRES.get(genre)
    if g is None:
        raise ValueError(f"unknown genre {genre!r}; genres: {', '.join(GENRES)}")
    m = MOODS.get(mood or "", {"tempo": 1.0, "scales": [], "density": 1.0, "octave": 0})
    if mood and mood not in MOODS:
        raise ValueError(f"unknown mood {mood!r}; moods: {', '.join(MOODS)}")
    return g, m


def compose(genre: str = "dungeon_synth", mood: str = "", key: str | None = None, tempo: float | None = None, bars: int = 32,
            seed: int = 1, title: str | None = None) -> dict:
    """A whole piece. `key` like 'C# minor' (its scale wins over the genre's when given), `bars` the length to aim for."""
    rules, mood_rules = resolve(genre, mood)
    rng = np.random.default_rng(int(seed) * 104729 + sum(ord(c) for c in genre) * 31 + sum(ord(c) for c in (mood or "")))
    if key:
        root, scale = theory.parse_key(key)
    else:
        root = int(rng.integers(12))
        prefer = [s for s in rules["scales"] if s in mood_rules["scales"]] or rules["scales"]
        scale = prefer[int(rng.integers(len(prefer)))]
    lo, hi = rules["tempo"]
    bpm = float(tempo) if tempo else float(int(rng.integers(lo, hi + 1)) * mood_rules["tempo"])
    bpm = float(np.clip(round(bpm), 40, 240))
    song = S.new_song(title or f"{genre.replace('_', ' ')} {seed}", tempo=bpm, key=theory.key_name(root, scale), bars=4, genre=genre, mood=mood, seed=seed)
    song["fx"].update(rules.get("fx", {}))
    for ln in S.LANES:
        opts = rules["instruments"][ln]
        song["lanes"][ln]["instrument"] = opts[int(rng.integers(len(opts)))]
        song["lanes"][ln]["pan"] = {"lead": 0.0, "counter": -0.3, "pad": 0.2, "bass": 0.0, "sparkle": 0.35, "drums": -0.1}[ln]
        song["lanes"][ln]["volume"] = {"lead": 0.85, "counter": 0.6, "pad": 0.55, "bass": 0.8, "sparkle": 0.5, "drums": 0.8}[ln]
    ctx = _Ctx(song, rules, rng, mood_rules["density"])
    density = rules["lead_density"] * mood_rules["density"]
    speed = "fast" if density > 0.72 else "mid" if density > 0.45 else "slow"
    octave = rules["lead_octave"] + mood_rules["octave"]
    prog = list(ctx.choice(rules["progressions"]))
    bridge = list(ctx.choice(rules["bridge"]))
    shift = int(ctx.choice(rules["modulate"]))
    song["patterns"] = {}
    # A: the statement
    lead, mot = lead_for_pattern(ctx, prog, speed, octave)
    song["motif"] = [dict(n) for n in mot]
    _fill_pattern(ctx, song, "A", prog, lead, intensity=0.9)
    # A2: the variation
    lead2, _ = lead_for_pattern(ctx, prog, speed, octave, mot, "vary")
    _fill_pattern(ctx, song, "A2", prog, lead2, intensity=1.0)
    # B: the bridge, written in the home key and lifted by the section's transpose
    leadb, _ = lead_for_pattern(ctx, bridge, speed, octave, mot, "bridge")
    _fill_pattern(ctx, song, "B", bridge, leadb, intensity=1.0, pad_rhythm=("half" if rules["pad_rhythm"] == "whole" else rules["pad_rhythm"]))
    # A3: the return, full
    lead3, _ = lead_for_pattern(ctx, prog, speed, octave, mot, "vary")
    _fill_pattern(ctx, song, "A3", prog, lead3, intensity=1.0, crash=True, sparkle_style=("arp8" if rules["sparkle"] == "sparse" else rules["sparkle"]))
    # intro: the bed without the lead; end: the cadence
    _fill_pattern(ctx, song, "intro", prog, [], intensity=0.6, counter_mode="none", sparkle_style=("sparse" if rules["sparkle"] != "none" else "none"))
    _ending(ctx, song, prog)
    structure = list(rules["structure"])
    sections = []
    for name in structure:
        sec = {"name": name, "pattern": name, "repeat": 1, "transpose": shift if name == "B" else 0}
        sections.append(sec)
    song["sections"] = sections
    _fit_length(song, bars)
    return S.normalise(song)


def _fill_pattern(ctx: _Ctx, song: dict, name: str, chords: list[int], lead: list[dict], intensity: float = 1.0, counter_mode: str | None = None,
                  pad_rhythm: str | None = None, sparkle_style: str | None = None, crash: bool = False) -> None:
    rules = ctx.rules
    bars = len(chords)
    pat = {"bars": bars, "chords": list(chords), "notes": {ln: [] for ln in S.LANES}}
    pat["notes"]["lead"] = lead
    pat["notes"]["counter"] = counter_for(ctx, lead, chords, bars, counter_mode or rules["counter"], rules["lead_octave"] - 1) if lead or (counter_mode or rules["counter"]) == "sustain" else []
    pat["notes"]["pad"] = pad_for(ctx, chords, bars, pad_rhythm or rules["pad_rhythm"])
    pat["notes"]["bass"] = bass_for(ctx, chords, bars, rules["bass"])
    pat["notes"]["sparkle"] = sparkle_for(ctx, chords, bars, sparkle_style or rules["sparkle"])
    pat["notes"]["drums"] = drums_for(ctx, bars, rules["drums"], intensity, fill=True, crash_first=crash)
    song["patterns"][name] = pat


def _ending(ctx: _Ctx, song: dict, prog: list[int]) -> None:
    """Two bars: the dominant (or the last chord) then the tonic held, the lead on the tonic, a last sparkle run."""
    rules = ctx.rules
    dom = 4 if theory.chord_quality(ctx.root, ctx.scale, 4) in ("major", "minor") else prog[-1]
    chords = [dom, 0]
    tonic = theory.degree_to_midi(ctx.root, ctx.scale, 0, rules["lead_octave"])
    lead = [_note(0, ctx.nearest_chord_tone(tonic + 4, dom), 0.8, 7.5), _note(8, ctx.step_scale(tonic, 1), 0.7, 7.5), _note(16, tonic, 0.9, 15.5)]
    pat = {"bars": 2, "chords": chords, "notes": {ln: [] for ln in S.LANES}}
    pat["notes"]["lead"] = lead
    pat["notes"]["counter"] = [_note(0, ctx.nearest_chord_tone(tonic - 12 + 7, dom), 0.55, 15.5), _note(16, ctx.chord_tones(0, rules["lead_octave"] - 1)[1], 0.6, 15.5)]
    pat["notes"]["pad"] = pad_for(ctx, chords, 2, "whole")
    pat["notes"]["bass"] = bass_for(ctx, chords, 2, "pedal")
    tones = ctx.chord_tones(0, 6)
    pat["notes"]["sparkle"] = [_note(16 + k * 2, tones[k % len(tones)] + 12 * (k // len(tones)), 0.5, 2.0) for k in range(6)] if rules["sparkle"] != "none" else []
    drums = [_note(0, DRUMS["kick"], 0.9, 1), _note(8, DRUMS["snare"], 0.6, 1), _note(12, DRUMS["snare"], 0.7, 1), _note(14, DRUMS["snare"], 0.8, 1),
             _note(16, DRUMS["kick"], 1.0, 1), _note(16, DRUMS["crash"], 0.8, 1)]
    pat["notes"]["drums"] = drums if rules["drums"] not in ("none", "ambient") else [_note(16, DRUMS["kick"], 0.7, 1)]
    song["patterns"]["end"] = pat


def _fit_length(song: dict, bars: int) -> None:
    """Repeat the main sections until the piece is about `bars` long (never shorter than one pass)."""
    total = sum(song["patterns"][s["pattern"]]["bars"] * s["repeat"] for s in song["sections"])
    grow = [s for s in song["sections"] if s["name"] in ("A", "A2", "A3", "B")]
    k = 0
    while total < bars and grow and k < 40:
        s = grow[k % len(grow)]
        s["repeat"] += 1
        total += song["patterns"][s["pattern"]]["bars"]
        k += 1


# ------------------------------------------------------------------ for the editor: one bar, one lane
def generate_lane(song: dict, pattern: str, lane: str, seed: int | None = None, bar: int | None = None) -> dict:
    """Regenerate one lane of a pattern (or one bar of it) in the song's genre; returns the song."""
    song = S.normalise(song)
    rules, mood_rules = resolve(song.get("genre") or "exploration", song.get("mood") or "")
    rng = np.random.default_rng((seed if seed is not None else int(song.get("seed", 1))) * 7 + S.LANES.index(lane) + 1)
    ctx = _Ctx(song, rules, rng, mood_rules["density"])
    pat = song["patterns"][pattern]
    chords = _pattern_chords(song, pattern)
    bars = pat["bars"]
    density = rules["lead_density"] * mood_rules["density"]
    speed = "fast" if density > 0.72 else "mid" if density > 0.45 else "slow"
    octave = rules["lead_octave"] + mood_rules["octave"]
    if lane == "lead":
        if bars >= 4 or bar is not None:
            notes, _ = lead_for_pattern(ctx, chords[:4] if bars >= 4 else chords + chords, speed, octave)
        else:
            notes = motif(ctx, chords + chords, speed, octave)
        notes = [n for n in notes if n["s"] < bars * 16]
    elif lane == "counter":
        notes = counter_for(ctx, pat["notes"]["lead"], chords, bars, rules["counter"] if rules["counter"] != "none" else "answer", octave - 1)
    elif lane == "pad":
        notes = pad_for(ctx, chords, bars, rules["pad_rhythm"])
    elif lane == "bass":
        notes = bass_for(ctx, chords, bars, rules["bass"])
    elif lane == "sparkle":
        notes = sparkle_for(ctx, chords, bars, rules["sparkle"] if rules["sparkle"] != "none" else "arp8")
    else:
        notes = drums_for(ctx, bars, rules["drums"] if rules["drums"] != "none" else "rock", 1.0)
    if bar is None:
        pat["notes"][lane] = notes
    else:
        lo, hi = bar * 16, (bar + 1) * 16
        keep = [n for n in pat["notes"][lane] if not lo <= n["s"] < hi]
        new = [n for n in notes if lo <= n["s"] < hi]
        if not new and notes:   # the generator wrote fewer bars than the pattern has: take its first bar
            new = [{**n, "s": n["s"] % 16 + lo} for n in notes if n["s"] < 16]
        pat["notes"][lane] = sorted(keep + new, key=lambda n: (n["s"], n["p"]))
    return S.normalise(song)


def generate_bar(song: dict, pattern: str, bar: int, seed: int | None = None, lanes: list[str] | None = None) -> dict:
    for ln in lanes or S.LANES:
        song = generate_lane(song, pattern, ln, seed, bar)
    return song


def regenerate(song: dict, seed: int) -> dict:
    """The same genre, mood, key and tempo with another seed (the dice)."""
    return compose(song.get("genre") or "exploration", song.get("mood") or "", theory.key_name(song["root"], song["scale"]), song["tempo"],
                   S.total_bars(song), seed, song.get("title"))


def copy_song(song: dict) -> dict:
    return copy.deepcopy(song)
