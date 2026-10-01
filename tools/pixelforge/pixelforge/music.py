"""Godmarrow's score, rendered offline: an original live-synthesised soundtrack in the manner of Diablo II's
(the craft, never the tunes), ported from the browser's `zz_zz_music96.js` so the Godot game hears the same music.

Twenty-one cues (five acts x town / wild / deep, five bosses, the title), each a seeded motif stated, answered,
varied and brought home, played by: a fingerpicked Karplus-Strong twelve-string, harmonics, bells, mallets, log
drums, a big drum, darbuka (dum / tek / shaker), a breathy flute, detuned strings, a low horn, a men's choir sung
through vowel formants, wind, drones, reversed swells, scrapes, clangs, drips, breath. Every note goes through a
cue bus (dry, a reverb send, a delay send), a 5.5 s convolution reverb, a ping-pong-ish delay and a soft
compressor. Loops are seamless: the tail is folded into the head.

    pixelforge music a1_town -o art/music --seconds 120           # one cue -> a1_town.wav (stereo 44.1 kHz)
    pixelforge music all --act 1                                  # the Act I set + bosses + title
    pixelforge music a1_wild --set bpm=64 --set root=48 --seed 5  # the editor: any cue field, any seed
    pixelforge music --sheet cues.json                            # a whole cue sheet of overrides

Needs numpy and scipy (filters). Writes WAV; Godot imports WAV as is (or convert to OGG with ffmpeg where present).
"""

from __future__ import annotations

import json
import math
import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

try:
    from scipy.signal import lfilter
except Exception as e:  # noqa: BLE001
    raise ImportError("pixelforge music needs scipy: pip install scipy") from e

RATE = 44100
NOTE = lambda n: 440.0 * 2.0 ** ((n - 69) / 12.0)  # noqa: E731
SC = {"aeol": [0, 2, 3, 5, 7, 8, 10], "dor": [0, 2, 3, 5, 7, 9, 10], "phr": [0, 1, 3, 5, 7, 8, 10],
      "hij": [0, 1, 4, 5, 7, 8, 10], "hmin": [0, 2, 3, 5, 7, 8, 11], "pmin": [0, 3, 5, 7, 10]}


def deg(sc, d):
    n = len(sc)
    o = math.floor(d / n)
    i = ((d % n) + n) % n
    return sc[i] + 12 * o


# ------------------------------------------------------------------ dsp helpers
def biquad(kind: str, f: float, q: float = 1.0, gain_db: float = 0.0):
    """RBJ biquad coefficients (b, a). ``q`` follows Web Audio's BiquadFilterNode: in dB for lowpass and highpass,
    linear for bandpass and peaking (so the browser's numbers can be used as they are)."""
    f = float(np.clip(f, 10, RATE / 2 - 100))
    if kind in ("lowpass", "highpass"):
        q = 10 ** (q / 20)
    w = 2 * math.pi * f / RATE
    cw, sw = math.cos(w), math.sin(w)
    alpha = sw / (2 * q)
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
    b = np.array(b) / a[0]; a = np.array(a) / a[0]
    return b, a


def filt(x: np.ndarray, kind: str, f: float, q: float = 1.0, gain_db: float = 0.0) -> np.ndarray:
    b, a = biquad(kind, f, q, gain_db)
    return lfilter(b, a, x).astype(np.float32)


def sweep_filter(x: np.ndarray, kind: str, freqs: np.ndarray, q: float = 1.0, block: int = 1024) -> np.ndarray:
    """A filter whose cutoff moves: coefficients updated per block (fine for LFOs and ramps)."""
    out = np.empty_like(x)
    zi = np.zeros(2)
    for i in range(0, len(x), block):
        b, a = biquad(kind, float(freqs[min(i, len(freqs) - 1)]), q)
        y, zi = lfilter(b, a, x[i:i + block], zi=zi)
        out[i:i + block] = y
    return out.astype(np.float32)


def env(n: int, a: float, peak: float, dur: float, rel: float) -> np.ndarray:
    """linear attack to peak, hold, exponential release to ~0 at dur (the browser's env())."""
    t = np.arange(n) / RATE
    ia = max(int(a * RATE), 1)
    hold_end = max(a, dur - rel)
    e = np.where(t < a, t / a, 1.0) * peak
    rel_mask = t > hold_end
    k = np.clip((t[rel_mask] - hold_end) / max(dur - hold_end, 1e-3), 0, 1)
    e[rel_mask] = peak * (0.0001 / peak) ** k if peak > 0 else 0
    e[t > dur] = 0
    return e.astype(np.float32)


def exp_decay(n: int, start: float, dur: float) -> np.ndarray:
    t = np.arange(n) / RATE
    return (start * (0.0001 / max(start, 1e-6)) ** np.clip(t / dur, 0, 1)).astype(np.float32)


# ------------------------------------------------------------------ the mix
@dataclass
class Mix:
    seconds: float
    rng: np.random.Generator
    dry: np.ndarray = field(init=False)
    rev_in: np.ndarray = field(init=False)
    dly_in: np.ndarray = field(init=False)

    def __post_init__(self):
        n = int(self.seconds * RATE) + RATE * 8
        self.dry = np.zeros((n, 2), np.float32)
        self.rev_in = np.zeros((n, 2), np.float32)
        self.dly_in = np.zeros((n, 2), np.float32)
        self.noise = self.rng.uniform(-1, 1, RATE * 2).astype(np.float32)
        self.bus_gain = 1.0
        self.bus_ds = 0.0

    def out(self, sig: np.ndarray, t: float, pan: float = 0.0, send: float = 0.0) -> None:
        """A mono signal into the cue bus at time t: dry 0.75, reverb send 0.8, delay send (bus + per note)."""
        i0 = int(t * RATE)
        if i0 >= len(self.dry):
            return
        sig = sig[: len(self.dry) - i0] * self.bus_gain
        pan = float(np.clip(pan, -1, 1))
        l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
        st = np.stack([sig * l, sig * r], axis=1)
        n = len(st)
        self.dry[i0:i0 + n] += st * 0.75
        self.rev_in[i0:i0 + n] += st * 0.8
        ds = self.bus_ds + send
        if ds > 0:
            self.dly_in[i0:i0 + n] += st * ds

    def noise_src(self, dur: float) -> np.ndarray:
        n = int(dur * RATE) + 1
        start = int(self.rng.random() * 1.5 * RATE)
        reps = n // len(self.noise) + 2
        return np.tile(self.noise, reps)[start:start + n]


# ------------------------------------------------------------------ instruments
_ks_cache: dict = {}


def ks_buf(freq: float, bright: float, sus: float, rev: bool, rng) -> np.ndarray:
    k = (round(freq * 4), bright, sus, rev)
    if k in _ks_cache:
        return _ks_cache[k]
    rate = 24000
    n = int(rate * (2 + sus * 3))
    p = max(2, int(round(rate / freq)))
    ring = np.empty(p, np.float32)
    lp = 0.0
    w = rng.uniform(-1, 1, p)
    for i in range(p):
        lp = lp + bright * (w[i] - lp)
        ring[i] = lp
    damp = 0.4965 + sus * 0.003
    d = np.empty(n, np.float32)
    # the string loop: y[i] = damp * (ring[i] + ring[i+1]); vectorised one period at a time
    buf = ring.copy()
    for start in range(0, n, p):
        m = min(p, n - start)
        d[start:start + m] = buf[:m]
        nxt = damp * (buf + np.roll(buf, -1))
        buf = nxt.astype(np.float32)
    if rev:
        d = d[::-1].copy()
    # resample 24 kHz -> RATE
    x = np.interp(np.arange(0, n, rate / RATE), np.arange(n), d).astype(np.float32)
    _ks_cache[k] = x
    return x


def pluck(mx: Mix, t, midi, vel, pan, bright=0.55, sus=0.5, rev=False, slide=0.0, detune=0.0, nasal=False, lp=3200, send=0.25, length=4.5):
    buf = ks_buf(NOTE(midi), bright, sus, rev, mx.rng)
    n = int(length * RATE)
    sig = buf[:n].copy() if len(buf) >= n else np.pad(buf, (0, n - len(buf)))
    if slide or detune:
        rate = np.ones(n, np.float32) * (1 + detune)
        if slide:
            k = np.arange(n) / RATE
            rate *= np.where(k < 0.09, 2 ** (slide / 12 * (1 - k / 0.09)), 1.0)
        pos = np.cumsum(rate)
        sig = np.interp(pos, np.arange(n), sig).astype(np.float32)
    if nasal:
        sig = filt(sig, "peaking", 1300, 1.2, 9)
    sig = filt(sig, "lowpass", lp)
    mx.out(sig * vel, t, pan, send)


def gtr(mx, t, midi, vel, pan):
    pluck(mx, t, midi, vel, pan, bright=0.5, sus=0.6)
    if midi < 64:
        pluck(mx, t + 0.012, midi + 12, vel * 0.32, -pan, bright=0.7, sus=0.4, detune=0.004)


def tone(mx, t, f, dur, vol, kind="sine", a=0.01, pan=0.0, detune_cents=0.0):
    n = int((dur + 0.05) * RATE)
    ph = 2 * math.pi * f * (2 ** (detune_cents / 1200)) * np.arange(n) / RATE
    if kind == "sine":
        w = np.sin(ph)
    elif kind == "square":
        w = np.sign(np.sin(ph))
    elif kind == "sawtooth":
        w = 2 * ((ph / (2 * math.pi)) % 1.0) - 1
    else:
        w = 2 * np.abs(2 * ((ph / (2 * math.pi)) % 1.0) - 1) - 1
    tt = np.arange(n) / RATE
    e = np.where(tt < a, tt / a, 1.0) * vol * (0.0001 / max(vol, 1e-6)) ** np.clip((tt - a) / max(dur - a, 1e-3), 0, 1)
    mx.out((w * e).astype(np.float32), t, pan)


def harmonic(mx, t, midi, vel, pan):
    tone(mx, t, NOTE(midi + 12), 3.5, vel * 0.5, "sine", 0.004, pan)
    tone(mx, t, NOTE(midi + 24), 2.2, vel * 0.18, "sine", 0.004, -pan)


def bell(mx, t, midi, vol, pan):
    f = NOTE(midi)
    for r, v, d in ((1, 1, 6), (2.0, 0.5, 4), (2.76, 0.4, 3.2), (5.4, 0.2, 1.8), (8.93, 0.12, 1.1)):
        tone(mx, t, f * r, d, vol * v, "sine", 0.003, pan)


def mallet(mx, t, midi, vol, pan):
    f = NOTE(midi)
    tone(mx, t, f, 0.9, vol, "sine", 0.002, pan)
    tone(mx, t, f * 3.93, 0.18, vol * 0.35, "sine", 0.001, pan)
    tone(mx, t, f * 9.2, 0.06, vol * 0.12, "sine", 0.001, pan)


def logdrum(mx, t, midi, vol, pan):
    n = int(0.5 * RATE)
    tt = np.arange(n) / RATE
    f = NOTE(midi) * np.where(tt < 0.03, 1.5 * (1 / 1.5) ** (tt / 0.03), 1.0)
    w = np.sin(2 * math.pi * np.cumsum(f) / RATE)
    mx.out((w * exp_decay(n, vol, 0.45)).astype(np.float32), t, pan)


def drum(mx, t, vol, f=80.0, length=0.9, snap=0.5, nlp=700.0, pan=0.0):
    n = int((length + 0.05) * RATE)
    tt = np.arange(n) / RATE
    f0 = f * 1.9 * (1 / 1.9) ** np.clip(tt / 0.06, 0, 1)
    f0 = np.where(tt > 0.06, f * (0.7 ** np.clip((tt - 0.06) / max(length - 0.06, 1e-3), 0, 1)), f0)
    body = np.sin(2 * math.pi * np.cumsum(f0) / RATE) * exp_decay(n, vol, length)
    mx.out(body.astype(np.float32), t, pan)
    ns = filt(mx.noise_src(0.25), "lowpass", nlp)
    m = min(len(ns), int(0.25 * RATE))
    mx.out((ns[:m] * exp_decay(m, vol * snap, 0.2)).astype(np.float32), t, pan)


def dum(mx, t, vol, pan):
    drum(mx, t, vol, f=95, length=0.45, snap=0.25, pan=pan)


def tek(mx, t, vol, pan):
    ns = filt(mx.noise_src(0.12), "bandpass", 3200, 1.4)
    m = int(0.12 * RATE)
    mx.out((ns[:m] * exp_decay(m, vol, 0.07)).astype(np.float32), t, pan)
    tone(mx, t, 680, 0.07, vol * 0.4, "triangle", 0.001, pan)


def shaker(mx, t, vol, pan):
    ns = filt(mx.noise_src(0.1), "highpass", 6000)
    m = int(0.1 * RATE)
    tt = np.arange(m) / RATE
    e = np.where(tt < 0.01, tt / 0.01, 1.0) * vol * (0.0001 / max(vol, 1e-6)) ** np.clip((tt - 0.01) / 0.08, 0, 1)
    mx.out((ns[:m] * e).astype(np.float32), t, pan)


def flute(mx, t, midi, dur, vol, pan):
    n = int((dur + 0.05) * RATE)
    tt = np.arange(n) / RATE
    f = NOTE(midi)
    vib = f * 0.012 * np.clip(tt / min(0.5, dur * 0.4), 0, 1) * np.sin(2 * math.pi * 5.2 * tt)
    w = np.sin(2 * math.pi * np.cumsum(f + vib) / RATE)
    mx.out((w * env(n, 0.09, vol, dur, min(0.4, dur * 0.4))).astype(np.float32), t, pan, 0.2)
    ns = filt(mx.noise_src(dur + 0.05)[:n], "bandpass", f * 2, 6)
    mx.out((ns * env(n, 0.05, vol * 0.5, dur, 0.2)).astype(np.float32), t, pan)


def strings(mx, t, midi, dur, vol, pan, bright=1500.0):
    n = int((dur + 0.1) * RATE)
    f = NOTE(midi)
    sig = np.zeros(n, np.float32)
    for dt in (-9, 0, 8):
        ph = (f * 2 ** (dt / 1200)) * np.arange(n) / RATE
        sig += (2 * (ph % 1.0) - 1).astype(np.float32)
    sig = filt(sig / 3, "lowpass", bright, 0.5)
    mx.out(sig * env(n, min(1.2, dur * 0.35), vol, dur, min(1.5, dur * 0.4)), t, pan)


def horn(mx, t, midi, dur, vol, pan):
    n = int((dur + 0.1) * RATE)
    f = NOTE(midi)
    tt = np.arange(n) / RATE
    ph = lambda c: (f * 2 ** (c / 1200)) * tt  # noqa: E731
    saw = 2 * (ph(4) % 1.0) - 1
    sq = np.sign(np.sin(2 * math.pi * ph(-6))) * 0.35
    sig = (saw + sq).astype(np.float32) / 1.35
    cut = np.where(tt < 0.25, 250 + (900 - 250) * tt / 0.25, 900 + (650 - 900) * np.clip((tt - 0.25) / max(dur - 0.25, 1e-3), 0, 1))
    sig = sweep_filter(sig, "lowpass", cut, 1.2)
    mx.out(sig * env(n, 0.18, vol, dur, min(0.8, dur * 0.4)), t, pan)


VOW = {"a": [(730, 1), (1090, 0.5), (2440, 0.25)], "o": [(570, 1), (840, 0.45), (2410, 0.2)], "u": [(300, 1), (870, 0.3), (2240, 0.12)]}


def choir(mx, t, midi, dur, vol, pan, vowel="a"):
    n = int((dur + 0.1) * RATE)
    f = NOTE(midi)
    tt = np.arange(n) / RATE
    src = np.zeros(n, np.float32)
    for dt in (-12, 0, 11):
        lfo = 1 + 0.004 * np.sin(2 * math.pi * (4.6 + mx.rng.random() * 0.8) * tt + mx.rng.random() * 6)
        ph = np.cumsum(f * 2 ** (dt / 1200) * lfo) / RATE
        src += (2 * (ph % 1.0) - 1).astype(np.float32)
    src *= 0.5 / 3
    sig = np.zeros(n, np.float32)
    for fr, a in VOW.get(vowel, VOW["a"]):
        sig += filt(src, "bandpass", fr, 9) * a * 3
    mx.out(sig * env(n, min(1.8, dur * 0.4), vol, dur, min(2, dur * 0.45)), t, pan)


def swell(mx, t, dur, vol, lo, hi, pan):
    n = int(dur * RATE)
    tt = np.arange(n) / RATE
    fr = lo * (hi / lo) ** np.clip(tt / dur, 0, 1)
    sig = sweep_filter(mx.noise_src(dur)[:n], "bandpass", fr, 3)
    e = np.where(tt < dur * 0.97, 0.0001 * (vol / 0.0001) ** (tt / (dur * 0.97)), vol * (1 - (tt - dur * 0.97) / (dur * 0.03)))
    mx.out((sig * e).astype(np.float32), t, pan)


def scrape(mx, t, dur, vol, pan):
    n = int(dur * RATE)
    tt = np.arange(n) / RATE
    f0 = 900 + mx.rng.random() * 1800
    fr = f0 + (f0 * (0.6 + mx.rng.random() * 0.9) - f0) * tt / dur
    ns = mx.noise_src(dur)[:n]
    sig = sweep_filter(ns, "bandpass", fr, 18) + filt(ns, "bandpass", f0 * 1.51, 22)
    mx.out(sig * env(n, dur * 0.3, vol, dur, dur * 0.5), t, pan)


def clang(mx, t, vol, pan):
    f = 180 + mx.rng.random() * 90
    for i, r in enumerate((1, 2.41, 3.77, 5.93, 8.1)):
        tone(mx, t, f * r, 2.4 - i * 0.35, vol / (i + 1.2), "square", 0.001, pan)


def drip(mx, t, vol, pan):
    n = int(0.2 * RATE)
    tt = np.arange(n) / RATE
    f = 1300 + mx.rng.random() * 900
    fr = f * 0.6 * (1 / 0.6) ** np.clip(tt / 0.05, 0, 1)
    w = np.sin(2 * math.pi * np.cumsum(fr) / RATE)
    mx.out((w * exp_decay(n, vol, 0.16)).astype(np.float32), t, pan)


def breath(mx, t, dur, vol, pan):
    n = int(dur * RATE)
    sig = filt(mx.noise_src(dur)[:n], "bandpass", 500, 1.1)
    mx.out(sig * env(n, dur * 0.45, vol, dur, dur * 0.5), t, pan)


# ------------------------------------------------------------------ beds
class Drone:
    """Four voices (saw, saw +7 c, sine -12, tri +7 -4 c) through a slow-LFO lowpass; the root glides on setDrone."""

    def __init__(self, midi: int, vol: float, lpf: float, kind: str = ""):
        self.events = [(0.0, midi)]
        self.vol, self.lpf, self.kind = vol, lpf, kind

    def set(self, t: float, midi: int) -> None:
        self.events.append((t, midi))

    def render(self, mx: Mix, seconds: float) -> None:
        n = int(seconds * RATE)
        tt = np.arange(n) / RATE
        # the root over time: setTargetAtTime with tau 1.2 s
        root = np.full(n, float(self.events[0][1]), np.float32)
        cur = float(self.events[0][1])
        for i, (t, m) in enumerate(self.events[1:], 1):
            i0 = int(t * RATE)
            seg = tt[i0:] - t
            root[i0:] = m + (root[i0] - m) * np.exp(-seg / 1.2)
        sig = np.zeros(n, np.float32)
        for off, kind, cents, w in ((0, "saw", 0, 1.0), (0, "saw", 7, 1.0), (-12, "sine", 0, 1.0), (7, "tri", -4, 1.0)):
            f = NOTE(root + off) * 2 ** (cents / 1200)
            ph = np.cumsum(f) / RATE
            if kind == "saw":
                v = 2 * (ph % 1.0) - 1
            elif kind == "sine":
                v = np.sin(2 * math.pi * ph)
            else:
                v = 2 * np.abs(2 * (ph % 1.0) - 1) - 1
            sig += v.astype(np.float32) * w   # four full-scale oscillators summed, as in the browser
        if self.kind == "dist":
            sig = np.tanh(sig * 4).astype(np.float32)
        lfo = self.lpf + self.lpf * 0.45 * np.sin(2 * math.pi * (0.05 + mx.rng.random() * 0.05) * tt)
        sig = sweep_filter(sig, "lowpass", np.maximum(lfo, 30), 3, block=4096)
        mx.out(sig * self.vol, 0.0, 0.0)


def wind(mx: Mix, seconds: float, vol: float, f0: float = 420.0) -> None:
    n = int(seconds * RATE)
    tt = np.arange(n) / RATE
    fr = f0 + f0 * 0.6 * np.sin(2 * math.pi * 0.09 * tt)
    sig = sweep_filter(mx.noise_src(seconds)[:n], "bandpass", np.maximum(fr, 40), 2.2, block=4096)
    g = vol + vol * 0.8 * np.sin(2 * math.pi * 0.061 * tt)
    mx.out((sig * g).astype(np.float32), 0.0, 0.0)


# ------------------------------------------------------------------ motifs
def _rng32(seed: int):
    a = seed & 0xFFFFFFFF

    def r():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return r


def motif(seed: int, span: int, count: int):
    r = _rng32(seed)
    m = []
    d = int(r() * 3)
    lens = [2, 1, 1, 2, 3, 1, 2, 4]
    for _ in range(count):
        m.append({"d": d, "l": lens[int(r() * len(lens))]})
        d += [-2, -1, -1, 1, 1, 2, 3, -3][int(r() * 8)]
        d = max(-2, min(span, d))
    m[-1]["l"] = max(3, m[-1]["l"])
    return m


def phrase(m, variant):
    out = []
    shift = [0, 2, 0, -1][variant % 4]
    for i, n in enumerate(m):
        d = n["d"] + shift
        if variant % 4 == 2 and i == len(m) - 1:
            d = 0
        if variant % 4 == 3 and i == 1:
            d += 1
        out.append({"d": d, "l": n["l"]})
    return out


class Melody:
    def __init__(self, mot):
        self.mot, self.var, self.state = mot, 0, None

    def at(self, s, play):
        if self.state is None or self.state["done"]:
            if s != 0:
                return
            self.var += 1
            self.state = {"notes": phrase(self.mot, self.var), "i": 0, "wait": 0, "done": False}
        m = self.state
        if m["wait"] > 0:
            m["wait"] -= 1
            return
        if m["i"] >= len(m["notes"]):
            m["done"] = True
            return
        n = m["notes"][m["i"]]
        play(n["d"], n["l"])
        m["wait"] = n["l"] - 1
        m["i"] += 1
        if m["i"] >= len(m["notes"]):
            m["done"] = True


# ------------------------------------------------------------------ cues
@dataclass
class Cue:
    key: str
    bpm: float
    steps: int
    root: int
    sc: list
    drone: tuple | None
    seed: int
    step: object
    gain: float = 1.0
    wind: float = 0.0
    windF: float = 420.0
    ds: float = 0.0
    prog: list | None = None


def _cues() -> dict[str, Cue]:
    C: dict[str, Cue] = {}

    def a1_town(mx, t, s, bar, c, st):
        ch = c.prog[bar % len(c.prog)]
        r = c.root + deg(c.sc, ch) - (12 if ch > 3 else 0)
        if s == 0:
            st["drone"].set(t, r - 12)
        voice = [c.root + x for x in (deg(c.sc, ch + 4) - 12, deg(c.sc, ch + 7) - 12, deg(c.sc, ch + 9) - 12, deg(c.sc, ch + 11) - 12)]
        k = [0, 1, 2, 3, 2, 1][s]
        if s == 0:
            gtr(mx, t, r - 12, 0.5, -0.2)
        elif mx.rng.random() > 0.06:
            gtr(mx, t, voice[k], 0.26 + mx.rng.random() * 0.06, (k - 1.5) * 0.25)
        sec = (bar // 8) % 3
        if sec == 1:
            st["mel"].at(s, lambda d, l: gtr(mx, t, c.root + 12 + deg(c.sc, d), 0.3, 0.25))
        if sec == 2 and s == 0 and bar % 2 == 0:
            harmonic(mx, t, r + 12, 0.05, 0.3)

    C["a1_town"] = Cue("a1_town", 132, 6, 50, SC["dor"], (38, 0.03, 300), 11, a1_town, gain=0.8, wind=0.007, ds=0.35, prog=[0, 0, 6, 5, 0, 0, 3, 4])

    def a1_wild(mx, t, s, bar, c, st):
        sec = (bar // 6) % 4
        if s == 0 and bar % 4 == 0:
            st["drone"].set(t, c.root - 12 + [0, -2, -4, -5][(bar // 4) % 4])
        if sec == 3:
            if s == 0 and mx.rng.random() < 0.25:
                swell(mx, t, 3, 0.03, 200, 1800, mx.rng.random() - 0.5)
            return
        if s == 0 and mx.rng.random() < 0.55:
            gtr(mx, t, c.root - 12 + deg(c.sc, [0, 4, 5, 3][bar % 4]), 0.34, -0.3)
        if s == 4 and mx.rng.random() < 0.35:
            harmonic(mx, t, c.root + deg(c.sc, [4, 2, 6, 0][int(mx.rng.random() * 4)]), 0.06, 0.35)
        if sec in (0, 2):
            st["mel"].at(s, lambda d, l: gtr(mx, t, c.root + deg(c.sc, d), 0.22, 0.2) if mx.rng.random() < 0.85 else None)
        if s == 6 and bar % 3 == 2:
            pluck(mx, t, c.root + deg(c.sc, 4), 0.3, 0.4, rev=True, sus=0.4, length=3, send=0.1)
        if s == 0 and bar % 8 == 5:
            swell(mx, t, 2.6, 0.035, 150, 2400, -0.4)

    C["a1_wild"] = Cue("a1_wild", 70, 8, 50, SC["aeol"], (38, 0.028, 240), 12, a1_wild, gain=1.3, wind=0.018)

    def a1_deep(mx, t, s, bar, c, st):
        if s == 0 and bar % 4 == 0:
            st["drone"].set(t, c.root - 12 + [0, 1, 0, -2][(bar // 4) % 4])
        beat = (bar // 8) % 3 == 1
        if beat and s in (0, 1):
            drum(mx, t, 0.18 if s else 0.26, f=52, length=0.6, snap=0.2)
        if s == 0 and mx.rng.random() < 0.4:
            pluck(mx, t, c.root + deg(c.sc, 0 if mx.rng.random() < 0.5 else 1), 0.38, -0.2, sus=0.7, bright=0.35)
        if s == 3 and mx.rng.random() < 0.12:
            bell(mx, t, c.root + 36 + deg(c.sc, int(mx.rng.random() * 5)), 0.02, mx.rng.random() - 0.5)
        if s == 5 and mx.rng.random() < 0.1:
            scrape(mx, t, 2.5 + mx.rng.random() * 2, 0.025, mx.rng.random() * 1.6 - 0.8)
        if s == 0 and bar % 6 == 3:
            strings(mx, t, c.root + 12, 7, 0.018, -0.3, 700); strings(mx, t, c.root + 13, 7, 0.014, 0.3, 700)
        if s == 2 and bar % 5 == 1:
            swell(mx, t, 3.4, 0.03, 100, 900, 0.3)
        if s == 6 and mx.rng.random() < 0.18:
            breath(mx, t, 3, 0.03, mx.rng.random() - 0.5)

    C["a1_deep"] = Cue("a1_deep", 58, 8, 38, SC["phr"], (26, 0.05, 180), 13, a1_deep, wind=0.005, windF=220)

    def a2_town(mx, t, s, bar, c, st):
        if s == 0 and bar % 8 == 0:
            st["drone"].set(t, c.root - 12)
        pat = ["D", "", "t", "t", "D", "", "t", ""]
        if pat[s] == "D":
            dum(mx, t, 0.3, -0.1)
        elif pat[s] == "t" and mx.rng.random() > 0.1:
            tek(mx, t, 0.12, 0.25)
        if s % 2 == 1 and mx.rng.random() < 0.2:
            tek(mx, t, 0.05, 0.4)
        sec = (bar // 4) % 4
        if sec == 0:
            if s % 2 == 0:
                pluck(mx, t, c.root + deg(c.sc, [0, 1, 2, 1][s // 2]), 0.26, 0.2, nasal=True, bright=0.8, sus=0.3, slide=-1 if s == 4 else 0)
        else:
            def play(d, l):
                m = c.root + 12 + deg(c.sc, d)
                pluck(mx, t, m, 0.3, 0.15, nasal=True, bright=0.85, sus=0.3, slide=-1 if mx.rng.random() < 0.3 else 0)
                if l >= 3:
                    pluck(mx, t + 0.11, m, 0.14, 0.2, nasal=True, bright=0.85, sus=0.3)
            st["mel"].at(s, play)
        if s == 0 and bar % 4 == 0:
            pluck(mx, t, c.root - 12, 0.36, -0.3, nasal=True, bright=0.6, sus=0.7)

    C["a2_town"] = Cue("a2_town", 208, 8, 50, SC["hij"], (38, 0.024, 420), 21, a2_town, wind=0.006, windF=900)

    def a2_wild(mx, t, s, bar, c, st):
        sec = (bar // 6) % 3
        if s == 0:
            dum(mx, t, 0.2, 0)
        if s == 5 and sec != 2:
            dum(mx, t, 0.1, 0.2)
        if sec == 2:
            if s == 0 and mx.rng.random() < 0.3:
                swell(mx, t, 3.5, 0.03, 300, 3000, 0)
            return
        st["mel"].at(s, lambda d, l: pluck(mx, t, c.root + deg(c.sc, d), 0.3, 0.2, nasal=True, bright=0.8, sus=0.6,
                                           slide=((-1 if mx.rng.random() < 0.5 else -2) if mx.rng.random() < 0.4 else 0)) if mx.rng.random() < 0.8 else None)
        if s == 4 and bar % 4 == 3:
            choir(mx, t, c.root + deg(c.sc, 4), 5, 0.012, -0.4, "o")

    C["a2_wild"] = Cue("a2_wild", 84, 8, 50, SC["hij"], (38, 0.026, 300), 22, a2_wild, gain=1.2, wind=0.027, windF=700)

    def a2_deep(mx, t, s, bar, c, st):
        if s == 0 and bar % 4 == 0:
            st["drone"].set(t, c.root - 12 + [0, 1, 0, 4][(bar // 4) % 4])
        if s == 0 and bar % 3 == 0:
            choir(mx, t, c.root + 12 + deg(c.sc, [0, 1, 4][bar % 3]), 7, 0.014, mx.rng.random() - 0.5, "u")
        if s in (0, 3) and mx.rng.random() < 0.3:
            dum(mx, t, 0.09, -0.4)
        if s == 6 and mx.rng.random() < 0.25:
            tek(mx, t, 0.04, 0.5)
        if s == 2 and bar % 5 == 2:
            pluck(mx, t, c.root + 12 + deg(c.sc, 1), 0.28, 0.3, rev=True, nasal=True, sus=0.6, send=0.1)
        if s == 4 and mx.rng.random() < 0.1:
            scrape(mx, t, 3, 0.02, mx.rng.random() - 0.5)
        if s == 1 and mx.rng.random() < 0.08:
            bell(mx, t, c.root + 36 + deg(c.sc, 2), 0.018, 0.4)

    C["a2_deep"] = Cue("a2_deep", 60, 8, 38, SC["hij"], (26, 0.05, 200), 23, a2_deep, wind=0.006, windF=300)

    def a3_town(mx, t, s, bar, c, st):
        if s == 0 and bar % 2 == 0:
            ch = [0, 3, 1, 4][(bar // 2) % 4]
            strings(mx, t, c.root + deg(c.sc, ch), 3.8, 0.02, -0.3, 1100); strings(mx, t, c.root + deg(c.sc, ch + 2), 3.8, 0.015, 0.3, 1100)
            st["drone"].set(t, c.root - 12 + deg(c.sc, ch))
        if mx.rng.random() > 0.12:
            mallet(mx, t, c.root + 12 + deg(c.sc, [0, 2, 1, 3, 2, 4, 3, 1][s]), 0.05 if s % 2 else 0.08, (s - 3.5) / 5)
        if (bar // 4) % 2 == 1:
            st["mel"].at(s, lambda d, l: flute(mx, t, c.root + 12 + deg(c.sc, d), 0.34 * l + 0.2, 0.03, 0.2))
        if s % 4 == 2:
            shaker(mx, t, 0.015, 0.5)

    C["a3_town"] = Cue("a3_town", 150, 8, 52, SC["pmin"], (40, 0.02, 350), 31, a3_town, gain=1.9, wind=0.004)

    def a3_wild(mx, t, s, bar, c, st):
        on = (bar // 4) % 4 != 3
        if on:
            if s % 3 == 0:
                logdrum(mx, t, c.root + (7 if s % 6 else 0), 0.14, -0.3)
            if s % 4 == 0:
                logdrum(mx, t, c.root + 12, 0.1, 0.35)
            if s in (0, 7):
                drum(mx, t, 0.2, f=60, length=0.5, snap=0.3)
            if s % 2 == 1 and mx.rng.random() < 0.3:
                shaker(mx, t, 0.02, 0.4)
        if (bar // 4) % 4 >= 1:
            st["mel"].at(s, lambda d, l: flute(mx, t, c.root + 24 + deg(c.sc, d), 0.2 * l + 0.25, 0.035, -0.2))
        if s == 0 and bar % 8 == 6:
            flute(mx, t, c.root + 31, 2.4, 0.03, 0.5)

    C["a3_wild"] = Cue("a3_wild", 132, 12, 45, SC["pmin"], (33, 0.03, 260), 32, a3_wild, gain=1.3, wind=0.007, windF=350)

    def a3_deep(mx, t, s, bar, c, st):
        if mx.rng.random() < 0.09:
            drip(mx, t + mx.rng.random() * 0.2, 0.03, mx.rng.random() * 1.6 - 0.8)
        if s == 0 and bar % 2 == 0:
            logdrum(mx, t, c.root, 0.14, -0.2)
        if s == 3 and bar % 4 == 1:
            logdrum(mx, t, c.root + 1, 0.1, 0.3)
        if s == 0 and bar % 4 == 2:
            flute(mx, t, c.root + 12 + deg(c.sc, [1, 4, 0][bar % 3]), 3, 0.022, 0.3)
        if s == 4 and bar % 6 == 0:
            strings(mx, t, c.root + 12, 6, 0.016, 0, 600)
        if s == 6 and mx.rng.random() < 0.12:
            breath(mx, t, 2.5, 0.025, mx.rng.random() - 0.5)

    C["a3_deep"] = Cue("a3_deep", 66, 8, 40, SC["phr"], (28, 0.045, 220), 33, a3_deep, gain=1.1)

    def a4_town(mx, t, s, bar, c, st):
        ch = c.prog[bar % len(c.prog)]
        if s == 0:
            r = c.root + deg(c.sc, ch)
            st["drone"].set(t, r - 12)
            strings(mx, t, r - 12, 4.3, 0.028, -0.4, 1300); strings(mx, t, c.root + deg(c.sc, ch + 2), 4.3, 0.022, 0.1, 1300); strings(mx, t, c.root + deg(c.sc, ch + 4), 4.3, 0.018, 0.4, 1500)
            if bar % 2 == 0:
                choir(mx, t, r - 12, 8.4, 0.02, -0.2, "o")
            if bar % 4 == 0:
                drum(mx, t, 0.22, f=55, length=1.4, snap=0.3)
        if (bar // 8) % 2 == 1:
            st["mel"].at(s, lambda d, l: horn(mx, t, c.root + deg(c.sc, d), 0.8 * l, 0.045, 0.15))
        if s == 4 and bar % 8 == 7:
            bell(mx, t, c.root + 24, 0.03, 0.4)

    C["a4_town"] = Cue("a4_town", 76, 8, 48, SC["aeol"], (36, 0.02, 280), 41, a4_town, gain=1.9, wind=0.012, windF=600, prog=[0, 5, 2, 6, 0, 3, 4, 4])

    def a4_wild(mx, t, s, bar, c, st):
        if s == 0 and bar % 2 == 0:
            r = c.root + deg(c.sc, [0, 5, 3, 6][(bar // 2) % 4])
            choir(mx, t, r - 12, 8, 0.02, -0.3, "a"); choir(mx, t, r - 5, 8, 0.012, 0.3, "o"); st["drone"].set(t, r - 12)
        if s == 0 and bar % 4 == 1:
            drum(mx, t, 0.18, f=50, length=1.6, snap=0.2)
        if (bar // 6) % 3 == 1:
            st["mel"].at(s, lambda d, l: horn(mx, t, c.root + deg(c.sc, d), 0.9 * l, 0.04, 0.5))
        if s == 6 and mx.rng.random() < 0.08:
            bell(mx, t, c.root + 24 + deg(c.sc, 4), 0.02, -0.5)

    C["a4_wild"] = Cue("a4_wild", 66, 8, 48, SC["aeol"], (36, 0.03, 260), 42, a4_wild, gain=1.3, wind=0.030, windF=800)

    def a4_deep(mx, t, s, bar, c, st):
        if s == 0 and bar % 3 == 0:
            bell(mx, t, c.root + 24, 0.03, -0.3); bell(mx, t + 0.9, c.root + 25, 0.022, 0.3)
        if s == 0 and bar % 2 == 1:
            choir(mx, t, c.root, 7, 0.018, -0.2, "u"); choir(mx, t, c.root + 1, 7, 0.014, 0.2, "u")
        if s == 4 and mx.rng.random() < 0.2:
            breath(mx, t, 3, 0.03, mx.rng.random() - 0.5)
        if s == 0 and bar % 4 == 0:
            drum(mx, t, 0.14, f=45, length=1.8, snap=0.15)

    C["a4_deep"] = Cue("a4_deep", 56, 8, 45, SC["phr"], (33, 0.045, 200), 43, a4_deep, wind=0.009, windF=300)

    def a5_town(mx, t, s, bar, c, st):
        if s == 0 and bar % 2 == 0:
            ch = [0, 3, 5, 4][(bar // 2) % 4]
            r = c.root + deg(c.sc, ch)
            choir(mx, t, r - 12, 8.2, 0.02, -0.3, "a"); choir(mx, t, c.root + deg(c.sc, ch + 2), 8.2, 0.016, 0.1, "a"); choir(mx, t, c.root + 12 + deg(c.sc, ch + 4), 8.2, 0.012, 0.4, "o")
            st["drone"].set(t, r - 12)
        if s == 3 and mx.rng.random() < 0.15:
            bell(mx, t, c.root + 36 + deg(c.sc, [0, 4, 2][bar % 3]), 0.014, 0.4)

    C["a5_town"] = Cue("a5_town", 60, 8, 50, SC["dor"], (38, 0.02, 260), 51, a5_town, gain=2.4)

    def a5_wild(mx, t, s, bar, c, st):
        if s in (0, 3):
            drum(mx, t, 0.2 if s else 0.32, f=42, length=0.9, snap=0.6, nlp=1200)
        if s == 0 and bar % 2 == 0:
            st["drone"].set(t, c.root - 12 + [0, 1, 0, 6][(bar // 2) % 4])
        if s == 6 and mx.rng.random() < 0.3:
            clang(mx, t, 0.04, mx.rng.random() * 1.4 - 0.7)
        if s == 0 and bar % 4 == 2:
            choir(mx, t, c.root + 12, 6, 0.018, -0.3, "a"); choir(mx, t, c.root + 13, 6, 0.016, 0.3, "a"); choir(mx, t, c.root + 18, 6, 0.012, 0, "o")
        if s == 4 and bar % 3 == 1:
            scrape(mx, t, 2.5, 0.035, mx.rng.random() - 0.5)
        if s == 2 and bar % 4 == 3:
            swell(mx, t, 2.2, 0.05, 80, 1400, 0)
        if s == 5 and bar % 2 == 1:
            pluck(mx, t, c.root + deg(c.sc, 1), 0.32, 0.3, rev=True, sus=0.5, bright=0.4)

    C["a5_wild"] = Cue("a5_wild", 92, 8, 38, SC["phr"], (26, 0.05, 520, "dist"), 52, a5_wild)
    C["a5_deep"] = Cue("a5_deep", 72, 8, 38, SC["phr"], (24, 0.055, 380, "dist"), 53, a5_wild)

    def boss(act):
        def step(mx, t, s, bar, c, st):
            pat, alt = [1, 0, 0, 1, 0, 0, 1, 0], [1, 0, 1, 0, 0, 1, 0, 1]
            if (alt if bar % 4 == 3 else pat)[s]:
                drum(mx, t, 0.42 if s == 0 else 0.28, f=58, length=0.8, snap=0.55)
            if s % 2 == 1 and mx.rng.random() < 0.3:
                drum(mx, t, 0.1, f=110, length=0.25, snap=0.4, pan=0.3)
            r = c.root + [0, 0, 1, 0, 0, 0, 1, -2][bar % 8]
            if s % 2 == 0:
                strings(mx, t, r + (12 if s == 6 else 0), 0.28, 0.03, -0.25, 1100)
            if s == 0:
                st["drone"].set(t, r - 12)
            if s == 0 and bar % 2 == 0:
                choir(mx, t, c.root + 12, 1.8, 0.025, -0.3, "a"); choir(mx, t, c.root + 13, 1.8, 0.02, 0.3, "a")
            if act == 2 and s % 2 == 1:
                tek(mx, t, 0.08, 0.35)
            if act == 3 and s % 3 == 0:
                logdrum(mx, t, c.root + 12, 0.1, 0.4)
            if act == 4 and s == 0 and bar % 4 == 0:
                horn(mx, t, c.root, 2.2, 0.05, 0.1)
            if act == 5 and s == 4 and mx.rng.random() < 0.5:
                clang(mx, t, 0.04, mx.rng.random() - 0.5)
            if s == 7 and bar % 8 == 7:
                swell(mx, t, 0.9, 0.05, 200, 4000, 0)
        root = {2: 38, 3: 40, 4: 36}.get(act, 38)
        return Cue(f"boss{act}", 150, 8, root, SC["phr"], (26, 0.04, 700 if act == 5 else 400, "dist" if act == 5 else ""), 60 + act, step)

    for a in (1, 2, 3, 4, 5):
        C[f"boss{a}"] = boss(a)
    t_ = C["a1_town"]
    C["title"] = Cue("title", 110, t_.steps, t_.root, t_.sc, t_.drone, 11, t_.step, gain=t_.gain, wind=0.012, ds=t_.ds, prog=t_.prog)
    return C


CUES = _cues()


# ------------------------------------------------------------------ rendering
def _impulse(sec: float, decay: float, rng) -> np.ndarray:
    n = int(RATE * sec)
    t = np.arange(n) / n
    return np.stack([rng.uniform(-1, 1, n) * (1 - t) ** decay for _ in range(2)], axis=1).astype(np.float32)


def _convolve_stereo(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    from numpy.fft import irfft, rfft

    n = len(x) + len(ir) - 1
    nf = 1 << (n - 1).bit_length()
    out = np.empty((n, 2), np.float32)
    for c in range(2):
        out[:, c] = irfft(rfft(x[:, c], nf) * rfft(ir[:, c], nf), nf)[:n]
    return out


def _delay(x: np.ndarray, time: float = 0.42, fb: float = 0.32, lp: float = 2600.0) -> np.ndarray:
    d = int(time * RATE)
    out = np.zeros_like(x)
    b, a = biquad("lowpass", lp)
    buf = x.copy()
    for k in range(1, 8):   # the feedback loop unrolled: each echo filtered again, gain fb^k
        shifted = np.zeros_like(x)
        shifted[d * k:] = buf[: len(x) - d * k] if d * k < len(x) else 0
        for c in range(2):
            shifted[:, c] = lfilter(b, a, shifted[:, c])
        out += shifted * (fb ** (k - 1))
        buf = shifted
    return out


def _compress(x: np.ndarray, thr_db=-18.0, ratio=3.0, attack=0.02, release=0.4) -> np.ndarray:
    mono = np.abs(x).max(axis=1)
    envl = np.empty_like(mono)
    # block-wise envelope follower (fast enough): per 64 samples, so the time constants are per block
    blk = 64
    ga, gr = math.exp(-blk / (attack * RATE)), math.exp(-blk / (release * RATE))
    e = float(mono[:blk].max()) if len(mono) else 0.0
    for i in range(0, len(mono), blk):
        peak = float(mono[i:i + blk].max())
        coef = ga if peak > e else gr
        e = coef * e + (1 - coef) * peak
        envl[i:i + blk] = e
    db = 20 * np.log10(np.maximum(envl, 1e-6))
    over = np.maximum(db - thr_db, 0)
    gain_db = -over * (1 - 1 / ratio)
    return x * (10 ** (gain_db / 20))[:, None]


def render_cue(key: str, seconds: float = 120.0, seed: int | None = None, overrides: dict | None = None, jitter: float = 0.015, loop: bool = True) -> np.ndarray:
    """Stereo float32 of ``seconds``; with ``loop`` the reverb tail is folded into the head so it loops seamlessly."""
    if key not in CUES:
        raise ValueError(f"unknown cue {key}; choose from {sorted(CUES)}")
    base = CUES[key]
    c = Cue(**{**base.__dict__})
    for k, v in (overrides or {}).items():
        if k == "sc" and isinstance(v, str):
            v = SC[v]
        if k == "drone" and isinstance(v, (list, tuple)):
            v = tuple(v)
        setattr(c, k, v)
    if seed is not None:
        c.seed = seed
    rng = np.random.default_rng(c.seed * 1000 + 7)
    _ks_cache.clear()
    mx = Mix(seconds, rng)
    mx.bus_gain = c.gain
    mx.bus_ds = c.ds
    st = {"mel": Melody(motif(c.seed * 7919, len(c.sc) + 2, 7)), "drone": Drone(*c.drone) if c.drone else None}
    t, s, bar = 0.35, 0, 0
    dur = 60.0 / c.bpm
    while t < seconds - 1:
        c.step(mx, t, s, bar, c, st)
        s += 1
        if s >= c.steps:
            s, bar = 0, bar + 1
        t += dur * (1 + (rng.random() - 0.5) * 2 * jitter)
    if st["drone"] is not None:
        st["drone"].render(mx, seconds)
    if c.wind:
        wind(mx, seconds, c.wind, c.windF)
    # effects: delay -> master and reverb; reverb -> master; compressor
    dly = _delay(mx.dly_in) * 0.3
    rev = _convolve_stereo(mx.rev_in + dly, _impulse(5.5, 2.6, rng)) * 0.62
    n = len(mx.dry)
    master = mx.dry + dly
    master[: min(n, len(rev))] += rev[:n]
    master = _compress(master)
    master = master[: int((seconds + 6) * RATE)]
    body = master[: int(seconds * RATE)].copy()
    if loop:
        tail = master[int(seconds * RATE):]
        m = min(len(tail), len(body))
        body[:m] += tail[:m]
    return _master(body)


TARGET_RMS = 0.09      # about -21 dBFS, where the browser's compressor (with its makeup gain) sat the score


def _master(x: np.ndarray) -> np.ndarray:
    """Every cue at the same loudness: scale to TARGET_RMS, then a soft limiter folds the peaks above 0.9."""
    rms = float(np.sqrt((x ** 2).mean())) or 1.0
    y = x * (TARGET_RMS / rms)
    a = np.abs(y)
    over = a > 0.9
    y = np.where(over, np.sign(y) * (0.9 + 0.09 * np.tanh((a - 0.9) / 0.09)), y)
    return y.astype(np.float32)


def write_wav(x: np.ndarray, path: str | Path) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


def make_music(key: str, out_dir: str | Path, *, seconds: float = 120.0, seed: int | None = None, overrides: dict | None = None,
               act: int | None = None, sheet: dict | str | Path | None = None, fmt: str = "wav", preview: bool = True,
               log=None) -> dict:
    """``key``: a cue, 'all', or 'act' with ``act`` (that act's town/wild/deep/boss). ``sheet``: a sheet dict or path,
    {cue: {knob: value}}. ``fmt``: wav | ogg | both (ogg needs ffmpeg; falls back to wav with a note).
    Writes <cue>.wav/.ogg, <cue>.png (waveform + spectrogram) and music.json (the manifest a game loads from)."""
    if isinstance(sheet, (str, Path)):
        sheet = load_sheet(sheet)
    if key == "all":
        keys = list(CUES)
    elif key == "act":
        a = act or 1
        keys = [k for k in CUES if k.startswith(f"a{a}_") or k == f"boss{a}"]
    else:
        if key not in CUES:
            raise ValueError(f"unknown cue {key!r}; cues: {', '.join(CUES)}")
        keys = [key]
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    files, notes, entries = [], [], {}
    manifest_path = out_dir / "music.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"cues": {}}
    for k in keys:
        ov = {**(sheet or {}).get(k, {}), **(overrides or {})}
        if log:
            log(f"rendering {k} ({seconds:.0f} s)")
        x = render_cue(k, seconds, seed, ov)
        wav = out_dir / f"{k}.wav"
        write_wav(x, wav)
        entry = {"file": wav.name, "seconds": seconds, "loop": True, "seed": seed if seed is not None else CUES[k].seed,
                 "act": CUE_INFO.get(k, (k, 0, "", ""))[1], "place": CUE_INFO.get(k, (k, 0, "", ""))[2], "knobs": ov}
        if fmt in ("ogg", "both"):
            ogg = to_ogg(wav)
            if ogg:
                entry["file"] = Path(ogg).name
                if fmt == "ogg":
                    wav.unlink()
                files.append(ogg)
            else:
                notes.append("ffmpeg not found: wrote WAV (Godot plays WAV; install ffmpeg for smaller OGG files)")
        if fmt != "ogg" or "file" not in entry or entry["file"].endswith(".wav"):
            files.append(str(wav))
        if preview:
            entry["png"] = preview_png(x, out_dir / f"{k}.png")
        entries[k] = entry
    manifest["cues"].update(entries)
    manifest["rate"] = RATE
    manifest_path.write_text(json.dumps(manifest, indent=1))
    r = {"ok": True, "files": files, "cues": keys, "json": str(manifest_path), "dir": str(out_dir)}
    if preview:
        r["png"] = entries[keys[-1]]["png"]
    if notes:
        r["notes"] = sorted(set(notes))
    return r


# ------------------------------------------------------------------ the editor layer
# What a person (or the Studio) edits: one JSON "sheet" with every cue's knobs. Render it, listen, change a number,
# render again. Melodies, instruments and rules live above; the sheet changes tempo, key, mode, seed, levels, drone.

CUE_INFO = {
    "a1_town": ("Moor camp", 1, "town", "a fingerpicked twelve-string over a drone, slow compound metre, reverb-drenched"),
    "a1_wild": ("Moor wilds", 1, "wild", "long silences, wind, a detuned drone, lone harmonics, reversed-guitar swells"),
    "a1_deep": ("Barrows and crypts", 1, "deep", "sub drone, dissonant clusters, scrapes, a heartbeat, a far bell"),
    "a2_town": ("Barrens camp", 2, "town", "an oud-like lute in hijaz over darbuka and frame drum"),
    "a2_wild": ("Barrens wastes", 2, "wild", "wind, a lone lute line, dum-tek drums far off"),
    "a2_deep": ("Barrens tombs", 2, "deep", "sub drone, nasal lute clusters, breath, a slow drum"),
    "a3_town": ("Shog-Mire village", 3, "town", "log drums in three-against-four, a breathy wooden flute, soft marimba"),
    "a3_wild": ("Shog-Mire swamp", 3, "wild", "drips, shaker, a low flute, drones under rain"),
    "a3_deep": ("Shog-Mire temple", 3, "deep", "log drums far down, breath, a bell, a phrygian drone"),
    "a4_town": ("An-Vhar hold", 4, "town", "slow strings, a low horn, a men's choir, bells"),
    "a4_wild": ("An-Vhar snows", 4, "wild", "cold strings, wind, horn calls, a far bell"),
    "a4_deep": ("An-Vhar keep", 4, "deep", "choir and sub drone, mallets, dread"),
    "a5_town": ("The Descent, the last camp", 5, "town", "a distorted drone, dissonant choir, slow clangs"),
    "a5_wild": ("The Descent, the inferno", 5, "wild", "industrial booms, clangs, scrape, a choir under it"),
    "a5_deep": ("The Descent, the pit", 5, "deep", "the drone distorted, booms, choir stabs"),
    "boss1": ("Boss, Act I", 1, "boss", "drums like thunder, a low phrygian ostinato, choir stabs"),
    "boss2": ("Boss, Act II", 2, "boss", "the same, in hijaz, with the hand drums"),
    "boss3": ("Boss, Act III", 3, "boss", "the same, with the log drums"),
    "boss4": ("Boss, Act IV", 4, "boss", "the same, with the horn and the choir"),
    "boss5": ("Boss, Act V", 5, "boss", "the same, distorted"),
    "title": ("Title", 0, "title", "the Moor tune, slower, with more air"),
}

# field -> (what it does, in plain words)
FIELDS = {
    "bpm": "tempo, beats per minute (slower is more sombre)",
    "steps": "steps per bar (6 is a lilting compound metre, 8 is straight)",
    "root": "the key, as a MIDI note (50 = D; 12 higher is an octave up)",
    "sc": "the mode: aeol (minor), dor (dorian), phr (phrygian, dark), hij (hijaz, eastern), hmin (harmonic minor), pmin (pentatonic minor)",
    "seed": "which tune: every seed is a different motif for the same place",
    "gain": "the cue's level before the master (1.0 = as written)",
    "wind": "level of the wind bed (0 = none)",
    "windF": "the wind's centre pitch in Hz (lower is a bigger, colder wind)",
    "ds": "how much of the cue goes to the echo (0..1)",
    "drone": "[note, level, lowpass Hz, kind]: the drone under everything; kind 'dist' is the Descent's distorted one",
}
SHEET_FIELDS = tuple(FIELDS)


def cue_table() -> list[dict]:
    """Every cue with its knobs, JSON-safe: for the CLI's list, the Studio's table and an AI's overview."""
    rows = []
    for k, c in CUES.items():
        title, act, place, desc = CUE_INFO.get(k, (k, 0, "", ""))
        rows.append({"key": k, "title": title, "act": act, "place": place, "description": desc, **_knobs(c)})
    return rows


def _knobs(c: Cue) -> dict:
    sc_name = next((n for n, v in SC.items() if v == c.sc), "aeol")
    return {"bpm": c.bpm, "steps": c.steps, "root": c.root, "sc": sc_name, "seed": c.seed, "gain": c.gain,
            "wind": c.wind, "windF": c.windF, "ds": c.ds, "drone": list(c.drone) if c.drone else None}


def default_sheet() -> dict:
    """The editable sheet: {"_help": {...}, cue: {knob: value}}. Save it, change numbers, render with it."""
    return {"_help": {"what": "One entry per cue. Change a number, render again. Delete a key to keep the default.",
                      "fields": FIELDS, "modes": list(SC)},
            **{k: _knobs(c) for k, c in CUES.items()}}


def write_sheet(path: str | Path) -> dict:
    sheet = default_sheet()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(sheet, indent=1))
    return {"ok": True, "sheet": str(path), "cues": [k for k in sheet if not k.startswith("_")]}


def load_sheet(path: str | Path) -> dict:
    data = json.loads(Path(path).read_text())
    return {k: v for k, v in data.items() if not k.startswith("_") and isinstance(v, dict)}


def parse_overrides(items) -> dict:
    """"bpm=90 sc=phr drone=[38,0.03,300]" -> typed dict (for --set and the Studio)."""
    out = {}
    for it in items or []:
        if not it or "=" not in it:
            continue
        k, v = it.split("=", 1)
        k, v = k.strip(), v.strip()
        if k not in FIELDS:
            raise ValueError(f"unknown knob {k!r}; knobs: {', '.join(FIELDS)}")
        if k == "sc":
            if v not in SC:
                raise ValueError(f"unknown mode {v!r}; modes: {', '.join(SC)}")
            out[k] = v
        elif k == "drone":
            out[k] = tuple(json.loads(v))
        elif k in ("steps", "root", "seed"):
            out[k] = int(float(v))
        else:
            out[k] = float(v)
    return out


def preview_png(x: np.ndarray, path: str | Path, seconds_shown: float | None = None) -> str:
    """A picture of the cue: waveform on top, spectrogram below (log frequency, 20 Hz .. 10 kHz). Pillow only."""
    from PIL import Image

    n = len(x)
    W, HW, HS = 900, 110, 190
    mono = x.mean(axis=1)
    img = Image.new("RGB", (W, HW + HS + 4), (12, 12, 14))
    px = img.load()
    # waveform: min/max per column, bone on near-black
    cols = np.array_split(mono, W)
    for i, col in enumerate(cols):
        if len(col) == 0:
            continue
        lo, hi = float(col.min()), float(col.max())
        y0, y1 = int(HW / 2 - hi * HW / 2), int(HW / 2 - lo * HW / 2)
        for y in range(max(0, y0), min(HW, y1 + 1)):
            px[i, y] = (214, 206, 186)
    # spectrogram: 2048-point frames, hann, log-frequency rows, teal-to-amber by level
    frame, hop = 2048, max(1, n // W)
    win = np.hanning(frame).astype(np.float32)
    freqs = np.fft.rfftfreq(frame, 1 / RATE)
    rows = np.geomspace(20, 10000, HS)
    idx = np.searchsorted(freqs, rows)
    for i in range(W):
        s0 = min(i * hop, max(0, n - frame))
        seg = mono[s0:s0 + frame]
        if len(seg) < frame:
            seg = np.pad(seg, (0, frame - len(seg)))
        mag = np.abs(np.fft.rfft(seg * win)) * (2 / win.sum())   # a full-scale sine reads 0 dB
        db = 20 * np.log10(mag[np.minimum(idx, len(mag) - 1)] + 1e-6)
        lvl = np.clip((db + 72) / 72, 0, 1)
        for r in range(HS):
            v = float(lvl[r])
            # near-black -> dull teal -> bone -> amber
            if v < 0.5:
                c = (int(12 + v * 2 * 30), int(12 + v * 2 * 90), int(14 + v * 2 * 80))
            else:
                w = (v - 0.5) * 2
                c = (int(42 + w * 190), int(102 + w * 60), int(94 - w * 70))
            px[i, HW + 4 + (HS - 1 - r)] = c
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return str(path)


def to_ogg(wav: str | Path, ogg: str | Path | None = None, quality: int = 3) -> str | None:
    """WAV -> OGG Vorbis with ffmpeg when it is installed (Godot loops OGG; WAV also works). None if no ffmpeg."""
    import shutil
    import subprocess

    exe = shutil.which("ffmpeg")
    if not exe:
        return None
    ogg = Path(ogg) if ogg else Path(wav).with_suffix(".ogg")
    r = subprocess.run([exe, "-v", "error", "-y", "-i", str(wav), "-c:a", "libvorbis", "-q:a", str(quality), str(ogg)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {r.stderr.strip()[:300]}")
    return str(ogg)


def play(path: str | Path) -> bool:
    """Play a WAV with whatever the machine has (winsound on Windows, afplay on a Mac, aplay/ffplay/paplay on Linux)."""
    import shutil
    import subprocess
    import sys

    path = str(path)
    if sys.platform.startswith("win"):
        import winsound

        winsound.PlaySound(path, winsound.SND_FILENAME | winsound.SND_ASYNC)
        return True
    for cmd in (["afplay", path], ["paplay", path], ["aplay", "-q", path], ["ffplay", "-nodisp", "-autoexit", "-v", "quiet", path]):
        if shutil.which(cmd[0]):
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
    return False
