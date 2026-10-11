"""Measure sounds: length, peak and RMS level, and where the energy sits by frequency band.

  tools/pixelforge/.venv/Scripts/python .claude/skills/godmarrow-sound/spectrum.py FILE.wav [FILE.wav ...]

Reads PCM .wav files (8, 16 or 32 bit integer, mono or stereo; stereo is mixed to mono), as written by
tools/body3d_test/fire_wav.gd. Paths are Windows paths (C:/...). Prints one block per file.
"""
import sys
import wave

import numpy as np

BANDS = [(0, 100), (100, 300), (300, 1000), (1000, 3000), (3000, 8000), (8000, 1e9)]


def read(path):
    with wave.open(path, "rb") as w:
        n, ch, sw, rate = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(n)
    if sw == 1:
        x = (np.frombuffer(raw, np.uint8).astype(np.float64) - 128.0) / 128.0
    elif sw == 2:
        x = np.frombuffer(raw, "<i2").astype(np.float64) / 32768.0
    elif sw == 4:
        x = np.frombuffer(raw, "<i4").astype(np.float64) / 2147483648.0
    else:
        raise ValueError("unsupported sample width %d" % sw)
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    return x, rate


def db(v):
    return 20.0 * np.log10(max(v, 1e-12))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        try:
            x, rate = read(p)
        except (OSError, ValueError, wave.Error) as e:
            print(p, "unreadable:", e)
            continue
        if len(x) == 0:
            print(p, "empty")
            continue
        spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
        f = np.fft.rfftfreq(len(x), 1.0 / rate)
        tot = spec.sum() or 1.0
        parts = []
        for lo, hi in BANDS:
            share = spec[(f >= lo) & (f < hi)].sum() / tot
            name = ("%d-%d Hz" % (lo, hi)) if hi < 1e9 else (">%d Hz" % lo)
            parts.append("%s %4.1f%%" % (name, 100.0 * share))
        under300 = spec[f < 300].sum() / tot
        print("%s\n  %.2f s at %d Hz; peak %.1f dBFS, RMS %.1f dBFS; under 300 Hz %.1f%%\n  %s" % (
            p, len(x) / rate, rate, db(np.abs(x).max()), db(np.sqrt((x * x).mean())), 100.0 * under300,
            "; ".join(parts)))


if __name__ == "__main__":
    main()
