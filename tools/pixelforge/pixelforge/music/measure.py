"""Measure a piece of audio the way the music reference was measured: loudness, spectral balance, key, tempo.

    pixelforge music measure docs/refs/forge_music_reference.mp3 forge/assets/audio/forge_home.ogg

Anything ffmpeg can read, or a WAV directly. Numbers only; no judgement."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

from .theory import NOTE_NAMES

BANDS = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def load_audio(path: str | Path, rate: int = 22050) -> tuple[np.ndarray, int]:
    """Mono float64 at `rate` (WAV read directly when it already is mono/stereo PCM; else through ffmpeg)."""
    p = Path(path)
    if p.suffix.lower() == ".wav":
        with wave.open(str(p)) as w:
            sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
            x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64) / 32768
        if ch > 1:
            x = x.reshape(-1, ch).mean(axis=1)
        if sr != rate:
            x = np.interp(np.arange(0, len(x), sr / rate), np.arange(len(x)), x)
        return x, rate
    exe = shutil.which("ffmpeg")
    if not exe:
        raise RuntimeError("ffmpeg is needed to read anything but WAV")
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "a.wav"
        subprocess.run([exe, "-v", "error", "-y", "-i", str(p), "-ac", "1", "-ar", str(rate), str(tmp)], check=True)
        return load_audio(tmp, rate)


def measure(path: str | Path) -> dict:
    x, sr = load_audio(path)
    out = {"file": str(path), "seconds": round(len(x) / sr, 2), "rms": round(float(np.sqrt(np.mean(x ** 2))), 4), "peak": round(float(np.abs(x).max()), 3)}
    N, hop = 4096, 1024
    if len(x) < N * 2:
        return out
    win = np.hanning(N)
    frames = np.lib.stride_tricks.sliding_window_view(x, N)[::hop] * win
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    freqs = np.fft.rfftfreq(N, 1 / sr)
    mean = spec.mean(0)
    tot = mean.sum() + 1e-12
    out["bands_db"] = {f"{lo}-{hi}": round(float(10 * np.log10(mean[(freqs >= lo) & (freqs < hi)].sum() / tot + 1e-12)), 1) for lo, hi in BANDS if lo < sr / 2}
    out["centroid_hz"] = round(float((freqs * mean).sum() / mean.sum()), 1)
    cents = (freqs[None, :] * spec).sum(1) / (spec.sum(1) + 1e-12)
    out["centroid_median_hz"] = round(float(np.median(cents)), 1)
    # key: a chroma profile against Krumhansl's major and minor templates
    chroma = np.zeros(12)
    m = (freqs > 60) & (freqs < 4000)
    midi = 69 + 12 * np.log2(freqs[m] / 440)
    np.add.at(chroma, np.round(midi).astype(int) % 12, mean[m])
    chroma /= chroma.max() + 1e-12
    scores = []
    for k in range(12):
        scores.append((float(np.corrcoef(chroma, np.roll(_MAJ, k))[0, 1]), f"{NOTE_NAMES[k]} major"))
        scores.append((float(np.corrcoef(chroma, np.roll(_MIN, k))[0, 1]), f"{NOTE_NAMES[k]} minor"))
    scores.sort(reverse=True)
    out["key"] = scores[0][1]
    out["key_candidates"] = [{"key": k, "score": round(s, 3)} for s, k in scores[:3]]
    out["chroma"] = {NOTE_NAMES[i]: round(float(chroma[i]), 2) for i in range(12)}
    # tempo: autocorrelation of the onset envelope
    env = np.sqrt(spec[:, (freqs > 50) & (freqs < 5000)].sum(1))
    d = np.diff(env)
    d[d < 0] = 0
    d -= d.mean()
    ac = np.correlate(d, d, "full")[len(d) - 1:]
    fps = sr / hop
    cands = []
    for bpm in range(50, 200):
        lag = int(round(60 * fps / bpm))
        if lag < len(ac):
            cands.append((float(ac[lag] / (ac[0] + 1e-12)), bpm))
    cands.sort(reverse=True)
    best = cands[0] if cands else None
    # the strongest lag is often the half or double of the felt tempo: prefer the strongest in 80..170 when it is close
    inside = [c for c in cands if 80 <= c[1] <= 170]
    if best and inside and inside[0][0] >= best[0] * 0.6 and abs(inside[0][1] - best[1]) > 8:
        best = inside[0]
    out["tempo_bpm"] = best[1] if best else None
    out["tempo_strength"] = round(best[0], 3) if best else None
    out["tempo_candidates"] = [{"bpm": b, "score": round(sc, 3)} for sc, b in cands[:5]]
    out["onsets_per_second"] = round(float((d > np.percentile(d, 90)).sum() / (len(d) / fps)), 2)
    return out


def compare(reference: str | Path, *others: str | Path) -> dict:
    ref = measure(reference)
    rows = [measure(o) for o in others]
    for r in rows:
        r["vs_reference"] = {"centroid_ratio": round(r["centroid_hz"] / max(ref["centroid_hz"], 1), 2), "rms_ratio": round(r["rms"] / max(ref["rms"], 1e-6), 2),
                             "same_key": r["key"] == ref["key"]}
    return {"ok": True, "reference": ref, "pieces": rows}
