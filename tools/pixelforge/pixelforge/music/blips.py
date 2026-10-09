"""The Forge app's interface sounds, in the family's voice (tools/pixelforge/docs/track_notes/gui_look.md, "Motion and sound
discipline"): a square-wave cursor blip (higher for right and down, lower for left and up), a two-note confirm (a
single short bell click: never a sweep, never a laser), an iron scrape for a lever, a ratchet
tick for a wheel, a chain's clunk, a low thud for back, a soft bell for a finished job, a dull knock for a stopped
one, and a drop. Mono float32 at 44.1 kHz."""

from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

from . import dsp

RATE = 44100


def _notes(freqs: list[tuple[float, float]], kind: str = "square", vol: float = 0.5, decay: float = 0.06, gap: float = 0.0) -> np.ndarray:
    """Short notes in a row: ``freqs`` is [(hz, seconds), ...]; each note a plain wave with a quick decay, no sweep."""
    out = []
    for f, d in freqs:
        n = int(d * RATE)
        tt = np.arange(n) / RATE
        ph = 2 * math.pi * f * tt
        if kind == "square":
            w = np.sign(np.sin(ph))
        elif kind == "sine":
            w = np.sin(ph)
        elif kind == "bell":
            w = np.sin(ph) + 0.3 * np.sin(ph * 2.01) * np.exp(-tt / (d * 0.4)) + 0.12 * np.sin(ph * 3.0) * np.exp(-tt / 0.02)
        else:
            w = 2 * np.abs(2 * ((f * tt) % 1.0) - 1) - 1
        e = np.minimum(tt / 0.002, 1.0) * np.exp(-np.maximum(tt - (d - decay), 0) / (decay / 4))
        out.append((w * e * vol).astype(np.float32))
        if gap:
            out.append(np.zeros(int(gap * RATE), np.float32))
    return np.concatenate(out)


def _burst(dur: float, lo: float, hi: float, vol: float, rng, q: float = 2.0, attack: float = 0.004) -> np.ndarray:
    n = int(dur * RATE)
    tt = np.arange(n) / RATE
    fr = lo * (hi / lo) ** np.clip(tt / dur, 0, 1)
    sig = dsp.sweep_filter(rng.uniform(-1, 1, n).astype(np.float32), "bandpass", fr, RATE, q, block=256)
    e = np.minimum(tt / attack, 1.0) * np.exp(-tt / (dur * 0.45))
    return (sig * e * vol).astype(np.float32)


def _pad_to(x: np.ndarray, n: int) -> np.ndarray:
    return np.pad(x, (0, max(0, n - len(x))))[:n]


def forge_blips() -> dict[str, np.ndarray]:
    rng = np.random.default_rng(3)
    confirm = _notes([(659.26, 0.055)], "bell", vol=0.45, decay=0.035)                      # one short click of a bell, E5
    blips = {
        "cursor_hi": _notes([(880.0, 0.045), (1320.0, 0.04)], vol=0.35, decay=0.03),
        "cursor_lo": _notes([(660.0, 0.045), (990.0, 0.04)], vol=0.35, decay=0.03),
        "confirm": confirm,
        "back": _notes([(72.0, 0.16)], "sine", vol=0.7, decay=0.1) + _pad_to(_burst(0.05, 180, 90, 0.15, rng, q=1.5), int(0.16 * RATE)),
        "scrape": _burst(0.09, 900, 2600, 0.32, rng, q=6.0),
        "ratchet": np.concatenate([_burst(0.018, 2400, 1800, 0.5, rng, q=4.0, attack=0.0005), np.zeros(int(0.01 * RATE), np.float32)]),
        "clunk": _notes([(95.0, 0.12)], "sine", vol=0.6, decay=0.08) + _pad_to(_burst(0.05, 700, 300, 0.25, rng, q=3.0), int(0.12 * RATE)),
        "done": _notes([(1318.5, 0.5)], "bell", vol=0.3, decay=0.4) + _pad_to(_notes([(1975.5, 0.35)], "sine", vol=0.12, decay=0.3), int(0.5 * RATE)),
        "fail": _notes([(110.0, 0.14), (98.0, 0.18)], "triangle", vol=0.5, decay=0.1, gap=0.02),
        "drop": _notes([(60.0, 0.2)], "sine", vol=0.6, decay=0.15),
        "tab": _notes([(1046.5, 0.03), (1318.5, 0.035)], vol=0.3, decay=0.025),
    }
    out = {}
    for k, v in blips.items():
        v = v / max(float(np.abs(v).max()), 1e-6) * 0.6
        out[k] = v.astype(np.float32)
    return out


def write_blips(out_dir: str | Path, fmt: str = "wav") -> dict:
    """Write every UI sound as ``ui_<name>.wav`` (and ``.ogg`` with ``fmt`` ogg|both, where ffmpeg is installed)."""
    from .render import to_ogg

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    files, notes = [], []
    for name, x in forge_blips().items():
        wav = out_dir / f"ui_{name}.wav"
        pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(pcm.tobytes())
        if fmt in ("ogg", "both"):
            ogg = to_ogg(wav, quality=4)
            if ogg:
                files.append(ogg)
                if fmt == "ogg":
                    wav.unlink()
                continue
            notes.append("ffmpeg not found: wrote WAV")
        files.append(str(wav))
    r = {"ok": True, "files": files, "dir": str(out_dir)}
    if notes:
        r["notes"] = sorted(set(notes))
    return r
