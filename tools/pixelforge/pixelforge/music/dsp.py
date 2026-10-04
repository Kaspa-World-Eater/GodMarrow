"""Small signal helpers shared by the synth and the renderer: filters, envelopes, the crunch and the hall."""

from __future__ import annotations

import math

import numpy as np

try:
    from scipy.signal import lfilter
except Exception as e:  # noqa: BLE001
    raise ImportError("pixelforge music needs scipy: pip install scipy") from e


def midi_hz(n: float) -> float:
    return 440.0 * 2.0 ** ((n - 69) / 12.0)


def biquad(kind: str, f: float, rate: int, q: float = 0.707, gain_db: float = 0.0):
    """RBJ biquad (b, a). `q` is linear here (0.707 = flat lowpass)."""
    f = float(np.clip(f, 10, rate / 2 - 50))
    w = 2 * math.pi * f / rate
    cw, sw = math.cos(w), math.sin(w)
    alpha = sw / (2 * max(q, 0.05))
    if kind == "lowpass":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]; a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "highpass":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]; a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bandpass":
        b = [alpha, 0, -alpha]; a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peaking":
        A = 10 ** (gain_db / 40)
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]; a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return b, a


def filt(x: np.ndarray, kind: str, f: float, rate: int, q: float = 0.707, gain_db: float = 0.0) -> np.ndarray:
    b, a = biquad(kind, f, rate, q, gain_db)
    return lfilter(b, a, x).astype(np.float32)


def sweep_filter(x: np.ndarray, kind: str, freqs: np.ndarray, rate: int, q: float = 0.707, block: int = 256) -> np.ndarray:
    """A filter whose cutoff moves: coefficients updated per block."""
    out = np.empty_like(x, dtype=np.float32)
    zi = np.zeros(2)
    n = len(x)
    for i in range(0, n, block):
        f = float(freqs[min(i, len(freqs) - 1)])
        b, a = biquad(kind, f, rate, q)
        y, zi = lfilter(b, a, x[i:i + block], zi=zi)
        out[i:i + block] = y
    return out


def adsr(n: int, rate: int, a: float, d: float, s: float, r: float, gate: float) -> np.ndarray:
    """Attack / decay / sustain / release over `n` samples with the key held `gate` seconds."""
    t = np.arange(n) / rate
    a = max(a, 0.001)
    e = np.minimum(t / a, 1.0)
    if d > 0:
        dec = np.clip((t - a) / d, 0, 1)
        e = np.where(t > a, 1.0 + (s - 1.0) * dec, e)
    else:
        e = np.where(t > a, s, e)
    rel = t > gate
    if rel.any():
        level_at_gate = float(np.interp(gate, t, e)) if gate > 0 else 1.0
        k = (t[rel] - gate) / max(r, 0.004)
        e[rel] = level_at_gate * np.exp(-k * 5.0)
    return e.astype(np.float32)


def exp_decay(n: int, rate: int, dur: float, start: float = 1.0) -> np.ndarray:
    t = np.arange(n) / rate
    return (start * np.exp(-t / max(dur, 1e-3) * 5.0)).astype(np.float32)


def osc(kind: str, f, n: int, rate: int, duty: float = 0.5, phase: float = 0.0) -> np.ndarray:
    """A plain waveform; `f` a number or a per-sample array (vibrato, bends)."""
    if np.ndim(f) == 0:
        ph = (np.arange(n) * (float(f) / rate) + phase) % 1.0
    else:
        ph = (np.cumsum(np.asarray(f, dtype=np.float64)[:n]) / rate + phase) % 1.0
    if kind == "sine":
        return np.sin(2 * np.pi * ph).astype(np.float32)
    if kind == "saw":
        return (2.0 * ph - 1.0).astype(np.float32)
    if kind == "square":
        return np.where(ph < 0.5, 1.0, -1.0).astype(np.float32)
    if kind == "pulse":
        return np.where(ph < duty, 1.0, -1.0).astype(np.float32)
    if kind == "tri":
        return (2.0 * np.abs(2.0 * ph - 1.0) - 1.0).astype(np.float32)
    raise ValueError(kind)


def vibrato(f: float, n: int, rate: int, depth: float = 0.004, hz: float = 5.2, onset: float = 0.15) -> np.ndarray:
    """A per-sample frequency with vibrato that comes in after `onset` seconds."""
    t = np.arange(n) / rate
    amount = np.clip((t - onset) / max(onset, 0.05), 0, 1) if onset > 0 else np.ones(n)
    return f * (1.0 + depth * amount * np.sin(2 * np.pi * hz * t))


# --------------------------------------------------------------- the crunch and the hall
def saturate(x: np.ndarray, amount: float) -> np.ndarray:
    """Soft saturation: the warm clip of a console's output stage. 0 = clean."""
    if amount <= 0:
        return x
    drive = 1.0 + 4.0 * amount
    return (np.tanh(x * drive) / math.tanh(min(drive, 6.0)) * (1.0 - 0.15 * amount)).astype(np.float32)


def bit_depth(x: np.ndarray, bits: int) -> np.ndarray:
    """Quantise to `bits` (16 is transparent; 8-12 is the old-hardware grain)."""
    if bits >= 16:
        return x
    levels = float(2 ** (bits - 1))
    return (np.round(np.clip(x, -1, 1) * levels) / levels).astype(np.float32)


def echo(x: np.ndarray, rate: int, time: float, feedback: float, level: float, tone: float = 0.5) -> np.ndarray:
    """The SPC's echo: a feedback delay with a lowpass in the loop (stereo in, stereo out, the echo added)."""
    if level <= 0 or time <= 0:
        return x
    d = max(1, int(time * rate))
    n = len(x)
    out = x.copy()
    buf = np.zeros_like(x)
    cut = 900 + tone * 5000
    b, a = biquad("lowpass", cut, rate, 0.6)
    fb = min(max(feedback, 0.0), 0.92)
    # block recursion, one delay length at a time
    zi = [np.zeros(2), np.zeros(2)]
    i = 0
    while i < n:
        j = min(i + d, n)
        src = x[i:j] + (buf[i - d:j - d] * fb if i >= d else 0.0)
        for c in range(2):
            src[:, c], zi[c] = lfilter(b, a, src[:, c], zi=zi[c])
        buf[i:j] = src
        i = j
    out[d:] += buf[:-d] * level
    return out.astype(np.float32)


def hall(x: np.ndarray, rate: int, size: float, level: float, rng: np.random.Generator) -> np.ndarray:
    """A gentle hall: convolution with a short decaying-noise impulse, lowpassed so it never hisses."""
    if level <= 0 or size <= 0:
        return x
    n_ir = int(rate * size)
    t = np.arange(n_ir) / n_ir
    ir = np.stack([rng.uniform(-1, 1, n_ir) * (1 - t) ** 2.4 for _ in range(2)], axis=1).astype(np.float32)
    ir[: int(rate * 0.01)] *= np.linspace(0, 1, int(rate * 0.01))[:, None]  # a little pre-delay
    for c in range(2):
        ir[:, c] = filt(ir[:, c], "lowpass", 3800.0, rate, 0.5)
    ir *= 1.0 / max(np.sqrt((ir ** 2).sum(axis=0)).max(), 1e-6)
    from numpy.fft import irfft, rfft

    n = len(x) + n_ir - 1
    nf = 1 << (n - 1).bit_length()
    wet = np.empty((n, 2), np.float32)
    for c in range(2):
        wet[:, c] = irfft(rfft(x[:, c], nf) * rfft(ir[:, c], nf), nf)[:n]
    out = np.zeros((n, 2), np.float32)
    out[: len(x)] = x
    out += wet * level * 0.9
    return out


def limiter(x: np.ndarray, ceiling: float = 0.92) -> np.ndarray:
    a = np.abs(x)
    over = a > ceiling
    return np.where(over, np.sign(x) * (ceiling + (1 - ceiling) * np.tanh((a - ceiling) / (1 - ceiling))), x).astype(np.float32)


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x.astype(np.float64) ** 2))) if len(x) else 0.0
