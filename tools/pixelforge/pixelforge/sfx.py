"""Sound effects, synthesised (no samples, no GPU): hits, bone clicks, pours, glass, thuds, whooshes, UI ticks.

A tiny jsfxr-style synth in numpy: one voice (square / saw / sine / triangle / noise), pitch slide, vibrato,
attack-sustain-decay, a one-pole low-pass, bit-crush and a touch of reverb tail. Writes 16-bit mono WAV, 44.1 kHz,
which Godot imports as is. Presets are tuned low and dry for a grim game: nothing chirps.

    pixelforge sfx hit -o art/sfx            # one preset
    pixelforge sfx all -o art/sfx --seed 3   # every preset, with a seeded variation each
"""

from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

RATE = 44100


def _env(n: int, attack: float, sustain: float, decay: float) -> np.ndarray:
    a, s, d = (int(x * RATE) for x in (attack, sustain, decay))
    a, s, d = max(a, 1), max(s, 0), max(d, 1)
    e = np.concatenate([np.linspace(0, 1, a), np.ones(s), np.linspace(1, 0, d) ** 1.5])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def synth(
    wave_kind: str = "square", freq: float = 220.0, slide: float = 0.0, vibrato: float = 0.0, vib_speed: float = 6.0,
    attack: float = 0.005, sustain: float = 0.05, decay: float = 0.2, lowpass: float = 0.35, crush: int = 0,
    duty: float = 0.5, noise_mix: float = 0.0, tail: float = 0.0, gain: float = 0.8, seed: int = 0,
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int((attack + sustain + decay) * RATE)
    t = np.arange(n) / RATE
    f = freq * (2.0 ** (slide * t)) * (1 + vibrato * np.sin(2 * math.pi * vib_speed * t))
    phase = np.cumsum(f) / RATE
    frac = phase % 1.0
    if wave_kind == "square":
        v = np.where(frac < duty, 1.0, -1.0)
    elif wave_kind == "saw":
        v = 2 * frac - 1
    elif wave_kind == "triangle":
        v = 4 * np.abs(frac - 0.5) - 1
    elif wave_kind == "sine":
        v = np.sin(2 * math.pi * phase)
    else:
        v = rng.uniform(-1, 1, n)
    if noise_mix > 0:
        v = v * (1 - noise_mix) + rng.uniform(-1, 1, n) * noise_mix
    v = v * _env(n, attack, sustain, decay)
    if lowpass < 1.0:   # one-pole
        a = float(np.clip(lowpass, 0.01, 1.0))
        out = np.empty_like(v)
        acc = 0.0
        for i, x in enumerate(v):
            acc += a * (x - acc)
            out[i] = acc
        v = out
    if crush > 0:
        q = 2 ** crush
        v = np.round(v * q) / q
    if tail > 0:   # a short comb reverb
        d = int(0.031 * RATE)
        out = np.concatenate([v, np.zeros(int(tail * RATE))])
        for i in range(d, len(out)):
            out[i] += out[i - d] * 0.45 * tail
        v = out
    v = v / max(np.abs(v).max(), 1e-6) * gain
    return v.astype(np.float32)


PRESETS = {
    "hit":        dict(wave_kind="noise", freq=0, attack=0.002, sustain=0.02, decay=0.14, lowpass=0.25, crush=5, gain=0.9),
    "heavy_hit":  dict(wave_kind="noise", freq=0, attack=0.003, sustain=0.05, decay=0.3, lowpass=0.12, crush=4, tail=0.15),
    "bone_click": dict(wave_kind="square", freq=900, slide=-12, attack=0.001, sustain=0.0, decay=0.06, lowpass=0.6, crush=6),
    "bone_break": dict(wave_kind="noise", freq=0, attack=0.001, sustain=0.03, decay=0.22, lowpass=0.4, crush=5, tail=0.1),
    "thud":       dict(wave_kind="sine", freq=70, slide=-6, attack=0.002, sustain=0.04, decay=0.25, lowpass=0.5),
    "whoosh":     dict(wave_kind="noise", freq=0, attack=0.06, sustain=0.03, decay=0.18, lowpass=0.18),
    "pour":       dict(wave_kind="noise", freq=0, attack=0.08, sustain=0.3, decay=0.25, lowpass=0.08, gain=0.5),
    "glass":      dict(wave_kind="sine", freq=1400, slide=-2, vibrato=0.01, vib_speed=30, attack=0.001, sustain=0.02, decay=0.5, lowpass=0.9, tail=0.3, gain=0.6),
    "cast":       dict(wave_kind="triangle", freq=160, slide=4, vibrato=0.03, vib_speed=9, attack=0.03, sustain=0.1, decay=0.35, lowpass=0.5, tail=0.2),
    "wisp":       dict(wave_kind="sine", freq=520, slide=1.5, vibrato=0.05, vib_speed=5, attack=0.08, sustain=0.2, decay=0.4, lowpass=0.8, gain=0.45, tail=0.3),
    "pickup":     dict(wave_kind="triangle", freq=330, slide=6, attack=0.002, sustain=0.03, decay=0.12, lowpass=0.7, gain=0.6),
    "ui_tick":    dict(wave_kind="square", freq=600, slide=-4, attack=0.001, sustain=0.0, decay=0.04, lowpass=0.5, crush=6, gain=0.5),
    "ui_open":    dict(wave_kind="triangle", freq=220, slide=2, attack=0.01, sustain=0.05, decay=0.2, lowpass=0.4, gain=0.5),
    "death_rattle": dict(wave_kind="square", freq=90, slide=-3, vibrato=0.2, vib_speed=18, attack=0.01, sustain=0.2, decay=0.5, lowpass=0.2, crush=4, duty=0.3),
    "lantern_light": dict(wave_kind="noise", freq=0, attack=0.02, sustain=0.1, decay=0.4, lowpass=0.3, noise_mix=1.0, tail=0.25, gain=0.5),
    "step_stone": dict(wave_kind="noise", freq=0, attack=0.001, sustain=0.01, decay=0.07, lowpass=0.3, crush=5, gain=0.5),
    "step_soft":  dict(wave_kind="noise", freq=0, attack=0.004, sustain=0.01, decay=0.09, lowpass=0.15, gain=0.4),
    "coin":       dict(wave_kind="sine", freq=1800, slide=-1, attack=0.001, sustain=0.01, decay=0.25, lowpass=0.9, tail=0.2, gain=0.5),
}


def write_wav(samples: np.ndarray, path: str | Path) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


def make_sfx(name: str, out_dir: str | Path, *, seed: int = 0, variations: int = 1, **overrides) -> dict:
    names = list(PRESETS) if name == "all" else [name]
    written = []
    for nm in names:
        if nm not in PRESETS:
            raise ValueError(f"unknown preset {nm}; choose from {sorted(PRESETS)}")
        for v in range(variations):
            params = {**PRESETS[nm], **overrides}
            rng = np.random.default_rng(seed * 1000 + v)
            if v > 0:   # small seeded variation so repeated hits do not sound stamped out
                params["freq"] = params.get("freq", 0) * float(rng.uniform(0.93, 1.07))
                params["decay"] = params["decay"] * float(rng.uniform(0.9, 1.1))
            params["seed"] = seed * 1000 + v
            path = Path(out_dir) / (f"{nm}.wav" if variations == 1 else f"{nm}_{v + 1}.wav")
            write_wav(synth(**params), path)
            written.append(str(path))
    return {"ok": True, "files": written}
