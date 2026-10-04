"""The SNES-style voice set: named instrument presets over a dozen generators, and the drum kits.

`render_note(preset, midi, dur, vel, tone, rate, rng)` returns one mono note (its release tail included) at `rate`;
`drum_hit(kit, number, vel, tone, rate, rng)` one drum. Every preset is a dict in INSTRUMENTS: a `kind` (the
generator) and its parameters, so a new preset is a new line. `tone` 0..1 is the lane's brightness control and
means "duller .. brighter" for every kind.
"""

from __future__ import annotations

import math

import numpy as np

from . import dsp
from .dsp import adsr, exp_decay, filt, midi_hz, osc, sweep_filter
from .theory import DRUMS

# ------------------------------------------------------------------ presets
INSTRUMENTS: dict[str, dict] = {
    # strings
    "strings_warm": {"kind": "strings", "attack": 0.12, "release": 0.4, "cut": 1400, "family": "strings", "words": "a warm ensemble, slow bow"},
    "strings_dark": {"kind": "strings", "attack": 0.2, "release": 0.6, "cut": 800, "family": "strings", "words": "low strings, dark and slow"},
    "strings_fast": {"kind": "strings", "attack": 0.03, "release": 0.12, "cut": 2200, "family": "strings", "words": "short bowed strings for ostinatos"},
    "cello": {"kind": "strings", "attack": 0.08, "release": 0.3, "cut": 1000, "voices": 2, "family": "strings", "words": "a single cello, close"},
    # brass
    "brass_horn": {"kind": "brass", "attack": 0.06, "release": 0.25, "cut": 1500, "family": "brass", "words": "a French horn, round"},
    "brass_stab": {"kind": "brass", "attack": 0.015, "release": 0.08, "cut": 2600, "bend": 0.6, "family": "brass", "words": "a brass section's stab"},
    "trumpet": {"kind": "brass", "attack": 0.03, "release": 0.12, "cut": 3200, "bend": 0.4, "family": "brass", "words": "a trumpet, bright"},
    "tuba": {"kind": "brass", "attack": 0.05, "release": 0.2, "cut": 700, "family": "brass", "words": "a tuba's low breath"},
    # choir
    "choir_ahh": {"kind": "choir", "vowel": "a", "attack": 0.25, "release": 0.5, "family": "choir", "words": "a choir on 'ah'"},
    "choir_ooh": {"kind": "choir", "vowel": "o", "attack": 0.3, "release": 0.6, "family": "choir", "words": "a choir on 'oh', darker"},
    "choir_men": {"kind": "choir", "vowel": "u", "attack": 0.35, "release": 0.7, "family": "choir", "words": "men's voices, low and hollow"},
    # bells and mallets
    "bells_glass": {"kind": "glass", "decay": 2.4, "family": "bells", "words": "glass bells: the sparkle"},
    "bells_tubular": {"kind": "bell", "decay": 3.5, "family": "bells", "words": "tubular bells, church-sized"},
    "music_box": {"kind": "glass", "decay": 1.2, "bright": 1.4, "family": "bells", "words": "a music box, small and close"},
    "vibraphone": {"kind": "mallet", "decay": 1.6, "tremolo": 4.5, "family": "bells", "words": "a vibraphone with its motor on"},
    "marimba": {"kind": "mallet", "decay": 0.5, "tremolo": 0.0, "family": "bells", "words": "a marimba, woody"},
    "celesta": {"kind": "glass", "decay": 1.6, "bright": 1.1, "family": "bells", "words": "a celesta"},
    # organ and keys
    "organ_cathedral": {"kind": "organ", "bars": [1.0, 0.6, 0.4, 0.5, 0.2, 0.25], "attack": 0.04, "release": 0.25, "family": "organ", "words": "a cathedral organ, full"},
    "organ_reed": {"kind": "organ", "bars": [0.8, 0.3, 0.9, 0.2, 0.5, 0.1], "attack": 0.02, "release": 0.1, "family": "organ", "words": "a reed organ, nasal"},
    "piano_electric": {"kind": "epiano", "decay": 1.4, "family": "keys", "words": "an electric piano, FM-style"},
    "harpsichord": {"kind": "pluck", "bright": 0.9, "sustain": 0.25, "nasal": True, "family": "keys", "words": "a harpsichord"},
    # plucked
    "harp": {"kind": "pluck", "bright": 0.7, "sustain": 0.7, "family": "plucked", "words": "a harp, long ring"},
    "lute": {"kind": "pluck", "bright": 0.8, "sustain": 0.35, "nasal": True, "family": "plucked", "words": "a lute, nasal and quick"},
    "guitar_steel": {"kind": "pluck", "bright": 0.6, "sustain": 0.55, "family": "plucked", "words": "a steel-string guitar"},
    "pizzicato": {"kind": "pluck", "bright": 0.4, "sustain": 0.2, "family": "plucked", "words": "plucked strings, short"},
    # bass
    "bass_synth": {"kind": "bass", "cut": 900, "sub": 0.5, "family": "bass", "words": "a synth bass with a sub octave"},
    "bass_pick": {"kind": "pluckbass", "bright": 0.5, "family": "bass", "words": "a picked bass"},
    "bass_sub": {"kind": "subbass", "family": "bass", "words": "a sine sub bass, soft"},
    "bass_slap": {"kind": "bass", "cut": 2200, "sub": 0.2, "snap": 0.6, "family": "bass", "words": "a slap bass, snappy"},
    # leads
    "lead_square": {"kind": "chip", "wave": "square", "family": "lead", "words": "a square lead"},
    "lead_pulse25": {"kind": "chip", "wave": "pulse", "duty": 0.25, "family": "lead", "words": "a thin 25% pulse"},
    "lead_pulse12": {"kind": "chip", "wave": "pulse", "duty": 0.125, "family": "lead", "words": "a reedy 12.5% pulse"},
    "lead_saw": {"kind": "chip", "wave": "saw", "family": "lead", "words": "a saw lead, brighter"},
    "lead_tri": {"kind": "chip", "wave": "tri", "family": "lead", "words": "a triangle lead, soft"},
    "lead_sync": {"kind": "chip", "wave": "saw", "sync": True, "family": "lead", "words": "a hard-sync lead for synthwave"},
    # winds
    "flute_wood": {"kind": "flute", "breath": 0.35, "family": "winds", "words": "a wooden flute, breathy"},
    "flute_pan": {"kind": "flute", "breath": 0.6, "family": "winds", "words": "a pan flute, airy"},
    "ocarina": {"kind": "flute", "breath": 0.15, "family": "winds", "words": "an ocarina, pure"},
    "oboe": {"kind": "chip", "wave": "pulse", "duty": 0.3, "cut": 2600, "nasal": True, "family": "winds", "words": "an oboe-like double reed"},
    # pads
    "pad_dark": {"kind": "pad", "cut": 700, "attack": 0.5, "release": 1.0, "family": "pads", "words": "a dark breathing pad"},
    "pad_glass": {"kind": "pad", "cut": 2400, "attack": 0.3, "release": 0.8, "glass": True, "family": "pads", "words": "a glassy pad with chorus"},
    "pad_synthwave": {"kind": "pad", "cut": 1600, "attack": 0.08, "release": 0.4, "detune": 12, "family": "pads", "words": "a wide 80s pad"},
    "timpani": {"kind": "timpani", "family": "drums", "words": "a timpani roll's single hit"},
    # drum kits
    "drums_rock": {"kind": "kit", "kick_f": 60, "snare": 0.6, "weight": 1.0, "family": "drums", "words": "a rock kit with weight"},
    "drums_orch": {"kind": "kit", "kick_f": 48, "snare": 0.4, "weight": 1.2, "orch": True, "family": "drums", "words": "orchestral: timpani, field snare, cymbal"},
    "drums_chip": {"kind": "kit", "kick_f": 70, "snare": 0.8, "weight": 0.7, "chip": True, "family": "drums", "words": "a noise-channel kit"},
    "drums_taiko": {"kind": "kit", "kick_f": 42, "snare": 0.3, "weight": 1.4, "taiko": True, "family": "drums", "words": "taiko drums, deep"},
    "drums_electro": {"kind": "kit", "kick_f": 52, "snare": 0.7, "weight": 1.0, "electro": True, "family": "drums", "words": "an 80s drum machine"},
    "drums_brush": {"kind": "kit", "kick_f": 58, "snare": 0.35, "weight": 0.7, "brush": True, "family": "drums", "words": "brushes, quiet"},
}

FAMILIES = ["strings", "brass", "choir", "bells", "organ", "keys", "plucked", "bass", "lead", "winds", "pads", "drums"]


def instrument_table() -> list[dict]:
    return [{"name": k, "family": v.get("family", ""), "words": v.get("words", ""), "drums": v.get("kind") == "kit"} for k, v in INSTRUMENTS.items()]


def is_kit(name: str) -> bool:
    return INSTRUMENTS.get(name, {}).get("kind") == "kit"


def _n(dur: float, rel: float, rate: int) -> int:
    return max(int((dur + rel) * rate), 8)


def _vel(v: float) -> float:
    return float(np.clip(v, 0.0, 1.0)) ** 1.4


# ------------------------------------------------------------------ generators
def _strings(p, midi, dur, vel, tone, rate, rng):
    rel = p.get("release", 0.4)
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    sig = np.zeros(n, np.float32)
    dets = (-7, 0, 6) if p.get("voices", 3) == 3 else (-4, 4)
    for c in dets:
        fv = dsp.vibrato(f * 2 ** (c / 1200), n, rate, 0.003, 5.0 + c * 0.03, 0.25)
        sig += osc("saw", fv, n, rate, phase=rng.random())
    sig /= len(dets)
    cut = p.get("cut", 1400) * (0.5 + tone * 1.5)
    t = np.arange(n) / rate
    sweep = cut * (0.45 + 0.55 * np.clip(t / max(p.get("attack", 0.1) * 2, 0.05), 0, 1))
    sig = sweep_filter(sig, "lowpass", sweep, rate, 0.8, block=512)
    return sig * adsr(n, rate, p.get("attack", 0.1), 0.3, 0.85, rel, dur) * _vel(vel)


def _brass(p, midi, dur, vel, tone, rate, rng):
    rel = p.get("release", 0.2)
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    t = np.arange(n) / rate
    bend = p.get("bend", 0.3)
    fv = f * 2 ** (-bend * np.exp(-t / 0.04) / 12) * (1 + 0.003 * np.clip((t - 0.3) / 0.3, 0, 1) * np.sin(2 * np.pi * 5.5 * t))
    sig = osc("saw", fv, n, rate) * 0.7 + osc("square", fv * 1.002, n, rate) * 0.3
    cut0 = p.get("cut", 1500) * (0.5 + tone * 1.4)
    sweep = 300 + (cut0 - 300) * np.clip(t / max(p.get("attack", 0.05) * 1.5, 0.02), 0, 1) * (1 - 0.25 * np.clip((t - 0.3) / 1.0, 0, 1))
    sig = sweep_filter(sig, "lowpass", sweep, rate, 1.3, block=256)
    return sig * adsr(n, rate, p.get("attack", 0.05), 0.2, 0.8, rel, dur) * _vel(vel)


VOWELS = {"a": [(730, 1.0), (1090, 0.5), (2440, 0.25)], "o": [(570, 1.0), (840, 0.45), (2410, 0.2)], "u": [(300, 1.0), (870, 0.3), (2240, 0.12)]}


def _choir(p, midi, dur, vel, tone, rate, rng):
    rel = p.get("release", 0.5)
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    src = np.zeros(n, np.float32)
    for c in (-11, 0, 12):
        fv = dsp.vibrato(f * 2 ** (c / 1200), n, rate, 0.005, 4.6 + rng.random() * 0.8, 0.3)
        src += osc("saw", fv, n, rate, phase=rng.random())
    src /= 3
    sig = np.zeros(n, np.float32)
    for fr, a in VOWELS.get(p.get("vowel", "a"), VOWELS["a"]):
        sig += filt(src, "bandpass", fr * (0.85 + tone * 0.3), rate, 6.0) * a * 3.0
    sig = filt(sig, "lowpass", 2500 + tone * 2500, rate, 0.7)
    return sig * adsr(n, rate, p.get("attack", 0.25), 0.4, 0.9, rel, dur) * _vel(vel) * 0.9


def _glass(p, midi, dur, vel, tone, rate, rng):
    decay = p.get("decay", 2.4) * (0.7 + tone * 0.6)
    n = max(int(decay * 1.1 * rate), int((dur + 0.3) * rate))
    f = midi_hz(midi)
    br = p.get("bright", 1.0)
    sig = osc("sine", f, n, rate) * exp_decay(n, rate, decay)
    sig += osc("sine", f * 2.01, n, rate) * exp_decay(n, rate, decay * 0.6) * 0.25 * br
    sig += osc("sine", f * 3.0, n, rate) * exp_decay(n, rate, 0.05) * 0.2 * br   # the strike
    t = np.arange(n) / rate
    sig *= np.minimum(t / 0.003, 1.0)
    return (sig * _vel(vel) * 0.8).astype(np.float32)


def _bell(p, midi, dur, vel, tone, rate, rng):
    decay = p.get("decay", 3.5) * (0.7 + tone * 0.6)
    n = max(int(decay * 1.05 * rate), int((dur + 0.3) * rate))
    f = midi_hz(midi)
    sig = np.zeros(n, np.float32)
    for r, a, d in ((1.0, 1.0, 1.0), (2.0, 0.5, 0.7), (2.76, 0.4, 0.55), (5.4, 0.2, 0.3), (8.93, 0.12, 0.18)):
        sig += osc("sine", f * r, n, rate) * exp_decay(n, rate, decay * d) * a
    t = np.arange(n) / rate
    sig *= np.minimum(t / 0.004, 1.0)
    return (sig * _vel(vel) * 0.5).astype(np.float32)


def _mallet(p, midi, dur, vel, tone, rate, rng):
    decay = p.get("decay", 1.0) * (0.6 + tone * 0.8)
    n = max(int(decay * 1.1 * rate), int((dur + 0.2) * rate))
    f = midi_hz(midi)
    sig = osc("sine", f, n, rate) * exp_decay(n, rate, decay)
    sig += osc("sine", f * 3.93, n, rate) * exp_decay(n, rate, decay * 0.2) * 0.35
    sig += osc("sine", f * 9.2, n, rate) * exp_decay(n, rate, 0.04) * 0.15
    trem = p.get("tremolo", 0.0)
    if trem:
        t = np.arange(n) / rate
        sig *= 1 - 0.35 * (0.5 + 0.5 * np.sin(2 * np.pi * trem * t))
    t = np.arange(n) / rate
    sig *= np.minimum(t / 0.002, 1.0)
    return (sig * _vel(vel) * 0.8).astype(np.float32)


def _organ(p, midi, dur, vel, tone, rate, rng):
    rel = p.get("release", 0.2)
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    bars = p.get("bars", [1.0, 0.6, 0.4, 0.5, 0.2, 0.25])
    ratios = (1, 2, 3, 4, 6, 8)
    sig = np.zeros(n, np.float32)
    for i, (r, a) in enumerate(zip(ratios, bars)):
        w = a * (1.0 if i < 2 else 0.4 + tone * 1.2)
        for c in (-3, 3):
            sig += osc("sine", f * r * 2 ** (c / 1200), n, rate, phase=rng.random()) * w * 0.5
    sig /= sum(bars)
    sig = filt(sig, "lowpass", 2400 + tone * 5000, rate, 0.6)
    return sig * adsr(n, rate, p.get("attack", 0.03), 0.0, 1.0, rel, dur) * _vel(vel) * 0.9


def _epiano(p, midi, dur, vel, tone, rate, rng):
    decay = p.get("decay", 1.4)
    rel = 0.2
    n = _n(min(dur, decay * 1.5), rel, rate)
    f = midi_hz(midi)
    t = np.arange(n) / rate
    index = (0.8 + tone * 2.0) * np.exp(-t / 0.25) * _vel(vel) ** 0.5
    mod = np.sin(2 * np.pi * f * 1.0 * t) * index
    carrier = np.sin(2 * np.pi * f * t + mod)
    sig = carrier.astype(np.float32) * exp_decay(n, rate, decay)
    sig += osc("sine", f * 2.0, n, rate) * exp_decay(n, rate, decay * 0.3) * 0.12
    return sig * adsr(n, rate, 0.002, 0.0, 1.0, rel, dur) * _vel(vel)


_ks_cache: dict = {}


def _ks(freq: float, bright: float, sustain: float, rate: int, seconds: float, rng) -> np.ndarray:
    """Karplus-Strong: a filtered noise burst in a ring of one period; vectorised a period at a time."""
    key = (round(freq * 2), round(bright, 2), round(sustain, 2), rate, round(seconds, 1))
    if key in _ks_cache:
        return _ks_cache[key]
    n = int(seconds * rate)
    p = max(2, int(round(rate / freq)))
    w = np.random.default_rng(int(freq * 100) & 0xFFFF).uniform(-1, 1, p).astype(np.float32)
    ring = np.empty(p, np.float32)
    lp = 0.0
    for i in range(p):
        lp = lp + bright * (w[i] - lp)
        ring[i] = lp
    damp = 0.496 + sustain * 0.0035
    out = np.empty(n, np.float32)
    buf = ring
    for start in range(0, n, p):
        m = min(p, n - start)
        out[start:start + m] = buf[:m]
        buf = (damp * (buf + np.roll(buf, -1))).astype(np.float32)
    if len(_ks_cache) > 512:
        _ks_cache.clear()
    _ks_cache[key] = out
    return out


def _pluck(p, midi, dur, vel, tone, rate, rng):
    sus = p.get("sustain", 0.5)
    seconds = min(0.6 + sus * 3.0, max(dur + 0.4, 0.8))
    f = midi_hz(midi)
    sig = _ks(f, min(0.95, p.get("bright", 0.6) * (0.6 + tone * 0.8)), sus, rate, seconds, rng).copy()
    n = len(sig)
    if p.get("nasal"):
        sig = filt(sig, "peaking", 1300, rate, 1.2, 8.0)
    sig = filt(sig, "lowpass", 1800 + tone * 4500, rate, 0.7)
    sig *= adsr(n, rate, 0.001, 0.0, 1.0, 0.12, dur + 0.05)
    return sig * _vel(vel) * 0.9


def _pluckbass(p, midi, dur, vel, tone, rate, rng):
    f = midi_hz(midi)
    seconds = max(dur + 0.3, 0.6)
    sig = _ks(f, 0.35 + tone * 0.4, 0.6, rate, seconds, rng).copy()
    n = len(sig)
    sig = filt(sig, "lowpass", 500 + tone * 1500, rate, 0.8)
    sig *= adsr(n, rate, 0.001, 0.0, 1.0, 0.08, dur + 0.02)
    return sig * _vel(vel) * 1.1


def _bass(p, midi, dur, vel, tone, rate, rng):
    rel = 0.08
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    sig = osc("square", f, n, rate) * 0.6 + osc("saw", f * 0.5, n, rate) * p.get("sub", 0.5) + osc("sine", f, n, rate) * 0.3
    t = np.arange(n) / rate
    cut0 = p.get("cut", 900) * (0.5 + tone * 1.5)
    snap = p.get("snap", 0.3)
    sweep = cut0 * (0.35 + (0.65 + snap) * np.exp(-t / 0.08))
    sig = sweep_filter(sig, "lowpass", sweep, rate, 1.1, block=128)
    return sig * adsr(n, rate, 0.004, 0.25, 0.75, rel, dur) * _vel(vel) * 0.9


def _subbass(p, midi, dur, vel, tone, rate, rng):
    rel = 0.15
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    sig = osc("sine", f, n, rate) * 0.85 + osc("tri", f, n, rate) * (0.15 + tone * 0.3)
    sig = filt(sig, "lowpass", 300 + tone * 600, rate, 0.7)
    return sig * adsr(n, rate, 0.02, 0.0, 1.0, rel, dur) * _vel(vel) * 1.1


def _chip(p, midi, dur, vel, tone, rate, rng):
    rel = p.get("release", 0.06)
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    fv = dsp.vibrato(f, n, rate, 0.0045, 5.6, 0.18)
    wave = p.get("wave", "square")
    if p.get("sync"):
        t = np.arange(n) / rate
        master = (t * fv[0]) % 1.0
        ratio = 1.5 + tone * 1.5 + 0.3 * np.sin(2 * np.pi * 0.7 * t)
        sig = (2 * ((master * ratio) % 1.0) - 1).astype(np.float32)
    else:
        sig = osc(wave, fv, n, rate, duty=p.get("duty", 0.5))
    if p.get("nasal"):
        sig = filt(sig, "peaking", 1100, rate, 1.5, 7.0)
    sig = filt(sig, "lowpass", p.get("cut", 3000) * (0.5 + tone * 2.2), rate, 0.7)
    return sig * adsr(n, rate, 0.004, 0.08, 0.85, rel, dur) * _vel(vel) * 0.55


def _flute(p, midi, dur, vel, tone, rate, rng):
    rel = 0.15
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    fv = dsp.vibrato(f, n, rate, 0.006, 5.0, 0.3)
    sig = osc("sine", fv, n, rate) + osc("sine", fv * 2, n, rate) * (0.12 + tone * 0.25) + osc("tri", fv, n, rate) * 0.1
    breath = p.get("breath", 0.35)
    noise = rng.uniform(-1, 1, n).astype(np.float32)
    noise = filt(noise, "bandpass", f * 2, rate, 5.0) * breath * 1.5
    t = np.arange(n) / rate
    sig = sig * adsr(n, rate, 0.06, 0.1, 0.9, rel, dur) + noise * adsr(n, rate, 0.03, 0.2, 0.6, rel * 0.6, dur) * (1 + 1.5 * np.exp(-t / 0.08))
    return (sig * _vel(vel) * 0.7).astype(np.float32)


def _pad(p, midi, dur, vel, tone, rate, rng):
    rel = p.get("release", 1.0)
    n = _n(dur, rel, rate)
    f = midi_hz(midi)
    det = p.get("detune", 6)
    sig = np.zeros(n, np.float32)
    for c in (-det, det):
        sig += osc("saw" if not p.get("glass") else "tri", f * 2 ** (c / 1200), n, rate, phase=rng.random())
    if p.get("glass"):
        sig += osc("sine", f * 2, n, rate) * 0.4
    sig /= 2.2
    t = np.arange(n) / rate
    cut = p.get("cut", 700) * (0.5 + tone * 1.6)
    breathe = cut * (1 + 0.35 * np.sin(0.4 * t + rng.random() * 6))
    sig = sweep_filter(sig, "lowpass", np.maximum(breathe, 80), rate, 1.2, block=1024)
    sig = filt(sig, "highpass", 60, rate, 0.7)
    return sig * adsr(n, rate, p.get("attack", 0.5), 0.0, 1.0, rel, dur) * _vel(vel)


def _timpani(p, midi, dur, vel, tone, rate, rng):
    n = int(1.6 * rate)
    f = midi_hz(midi)
    t = np.arange(n) / rate
    fv = f * (1 + 0.5 * np.exp(-t / 0.05))
    sig = osc("sine", fv, n, rate) * exp_decay(n, rate, 1.2) + osc("sine", fv * 1.5, n, rate) * exp_decay(n, rate, 0.6) * 0.3
    thump = filt(rng.uniform(-1, 1, n).astype(np.float32), "lowpass", 300 + tone * 600, rate, 0.8) * exp_decay(n, rate, 0.08) * 0.8
    return ((sig + thump) * _vel(vel) * 0.9).astype(np.float32)


GENERATORS = {"strings": _strings, "brass": _brass, "choir": _choir, "glass": _glass, "bell": _bell, "mallet": _mallet, "organ": _organ,
              "epiano": _epiano, "pluck": _pluck, "pluckbass": _pluckbass, "bass": _bass, "subbass": _subbass, "chip": _chip,
              "flute": _flute, "pad": _pad, "timpani": _timpani}


def render_note(preset: str, midi: int, dur: float, vel: float, tone: float, rate: int, rng: np.random.Generator) -> np.ndarray:
    """One mono note of `preset` at `rate`, the release tail included. Unknown presets fall back to a square lead."""
    p = INSTRUMENTS.get(preset) or INSTRUMENTS["lead_square"]
    if p["kind"] == "kit":
        return drum_hit(preset, midi, vel, tone, rate, rng)
    gen = GENERATORS[p["kind"]]
    out = gen(p, float(midi), max(float(dur), 0.02), vel, float(np.clip(tone, 0, 1)), rate, rng)
    return np.nan_to_num(out).astype(np.float32)


# ------------------------------------------------------------------ drums
def _noise(n, rng, bits: int = 0) -> np.ndarray:
    x = rng.uniform(-1, 1, n).astype(np.float32)
    if bits:
        x = dsp.bit_depth(x, bits)
    return x


def drum_hit(kit: str, number: int, vel: float, tone: float, rate: int, rng: np.random.Generator) -> np.ndarray:
    k = INSTRUMENTS.get(kit) or INSTRUMENTS["drums_rock"]
    w = k.get("weight", 1.0)
    chip = k.get("chip", False)
    bits = 4 if chip else 0
    v = _vel(vel)
    name = {v_: n_ for n_, v_ in DRUMS.items()}.get(int(number), "kick" if number < 40 else "hat")
    if name in ("kick", "timpani") or (name.startswith("tom") and k.get("taiko")):
        f0 = k.get("kick_f", 60) * (1.0 if name == "kick" else 1.6 if name == "tom_high" else 1.25 if name == "tom_mid" else 1.0)
        length = (0.5 if not k.get("taiko") else 0.9) * (0.8 + tone * 0.4) * (1.6 if name == "timpani" else 1.0)
        n = int((length + 0.1) * rate)
        t = np.arange(n) / rate
        fv = f0 * (1 + (2.2 if k.get("electro") else 1.4) * np.exp(-t / 0.045))
        body = osc("sine" if not chip else "tri", fv, n, rate) * exp_decay(n, rate, length) * w
        click = filt(_noise(n, rng, bits), "lowpass", 600 + tone * 2000, rate) * exp_decay(n, rate, 0.015) * (0.5 if not k.get("taiko") else 0.9)
        if k.get("orch") or name == "timpani":
            body += osc("sine", fv * 1.5, n, rate) * exp_decay(n, rate, length * 0.5) * 0.3
        sig = (body + click) * v
        return dsp.saturate(sig, 0.25).astype(np.float32)
    if name == "snare":
        length = 0.22 * (0.8 + tone * 0.5) * (1.5 if k.get("orch") else 1.0)
        n = int((length + 0.05) * rate)
        t = np.arange(n) / rate
        noise = filt(_noise(n, rng, bits), "bandpass", 1800 + tone * 2000, rate, 0.7) * exp_decay(n, rate, length) * k.get("snare", 0.6) * 1.6
        if k.get("brush"):
            noise = filt(noise, "lowpass", 3000, rate) * 0.8
        tonal = osc("tri", 185 * (1 + 0.6 * np.exp(-t / 0.02)), n, rate) * exp_decay(n, rate, 0.12) * (0.7 if not k.get("electro") else 1.0)
        return ((noise + tonal) * v * w * 0.9).astype(np.float32)
    if name in ("hat", "hat_open", "shaker", "tambourine"):
        length = {"hat": 0.06, "hat_open": 0.35, "shaker": 0.09, "tambourine": 0.3}[name] * (0.7 + tone * 0.6)
        n = int((length + 0.03) * rate)
        x = filt(_noise(n, rng, bits), "highpass", 6000 + tone * 3000, rate)
        if name == "tambourine":
            x += filt(_noise(n, rng), "bandpass", 5500, rate, 4.0) * 1.5
        env_ = exp_decay(n, rate, length)
        if name == "shaker":
            t = np.arange(n) / rate
            env_ *= np.minimum(t / 0.02, 1.0)
        return (x * env_ * v * 0.45 * (0.6 if k.get("brush") else 1.0)).astype(np.float32)
    if name.startswith("tom"):
        f0 = {"tom_low": 90, "tom_mid": 130, "tom_high": 180}[name] * (1.0 if not k.get("orch") else 0.8)
        n = int(0.5 * rate)
        t = np.arange(n) / rate
        fv = f0 * (1 + 0.8 * np.exp(-t / 0.05))
        sig = osc("sine", fv, n, rate) * exp_decay(n, rate, 0.4) * w + filt(_noise(n, rng, bits), "lowpass", 1500, rate) * exp_decay(n, rate, 0.03) * 0.4
        return (sig * v * 0.9).astype(np.float32)
    if name in ("crash", "ride"):
        length = (1.8 if name == "crash" else 1.1) * (0.6 + tone * 0.8)
        n = int(length * rate)
        x = filt(_noise(n, rng, bits), "highpass", 3500, rate) * exp_decay(n, rate, length)
        if name == "ride":
            x = x * 0.5 + osc("sine", 3100, n, rate) * exp_decay(n, rate, 0.9) * 0.2 + osc("sine", 5200, n, rate) * exp_decay(n, rate, 0.5) * 0.12
        return (x * v * 0.5).astype(np.float32)
    if name == "clap":
        n = int(0.3 * rate)
        x = filt(_noise(n, rng, bits), "bandpass", 1400, rate, 1.0)
        e = np.zeros(n, np.float32)
        for k_, at in enumerate((0.0, 0.011, 0.022)):
            i0 = int(at * rate)
            e[i0:] = np.maximum(e[i0:], exp_decay(n - i0, rate, 0.02 if k_ < 2 else 0.2))
        return (x * e * v * 0.8).astype(np.float32)
    if name == "cowbell":
        n = int(0.35 * rate)
        x = (osc("square", 562, n, rate) + osc("square", 845, n, rate) * 0.8) * exp_decay(n, rate, 0.3)
        return (filt(x, "bandpass", 1200, rate, 1.0) * v * 0.6).astype(np.float32)
    # stick / rim and anything else: a short woody knock
    n = int(0.08 * rate)
    x = filt(_noise(n, rng, bits), "bandpass", 2500 + tone * 2000, rate, 2.0) * exp_decay(n, rate, 0.03)
    x += osc("sine", 900, n, rate) * exp_decay(n, rate, 0.02) * 0.5
    return (x * v * 0.7).astype(np.float32)
