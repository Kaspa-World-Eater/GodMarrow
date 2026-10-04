"""The renderer: a song (or one bar of it) to stereo float32, fast enough that an edit is heard at once.

The chain is the SNES's in spirit: every note is one voice; with `fx.voices` set (8 by default) a ninth note cuts
the oldest sounding one; lanes are mixed with volume and pan; the sum goes through soft saturation (`crunch`), the
bit depth, the SPC-style echo (a feedback delay with a lowpass in the loop) and a gentle hall, then a limiter.
"""

from __future__ import annotations

import math
import time
from pathlib import Path

import numpy as np

from . import dsp, song as S, synth

TARGET_RMS = 0.10
TAIL_SECONDS = 3.0


# ------------------------------------------------------------------ the timeline
def timeline(song: dict) -> list[dict]:
    """Every bar the song plays, in order: {section, pattern, pattern_bar, transpose, repeat}."""
    out = []
    for si, sec in enumerate(song["sections"]):
        pat = song["patterns"][sec["pattern"]]
        for rep in range(sec["repeat"]):
            for b in range(pat["bars"]):
                out.append({"section": si, "name": sec["name"], "pattern": sec["pattern"], "pattern_bar": b, "transpose": sec["transpose"], "repeat": rep})
    return out


def pattern_plan(song: dict, pattern: str, transpose: int = 0) -> list[dict]:
    pat = song["patterns"][pattern]
    return [{"section": -1, "name": pattern, "pattern": pattern, "pattern_bar": b, "transpose": transpose, "repeat": 0} for b in range(pat["bars"])]


def section_bar_index(song: dict, section: int, bar: int) -> int:
    """The absolute bar of `bar` inside section `section`."""
    before = sum(S.section_bars(song, i) for i in range(min(section, len(song["sections"]))))
    return before + bar


def events_for(song: dict, plan: list[dict], lanes: list[str] | None = None) -> list[dict]:
    """Notes of the planned bars as events with `t` in steps from the plan's start: {lane, t, p, v, l, preset}."""
    lanes = lanes if lanes is not None else S.sounding_lanes(song)
    out = []
    for bi, bar in enumerate(plan):
        pat = song["patterns"][bar["pattern"]]
        lo, hi = bar["pattern_bar"] * S.STEPS_PER_BAR, (bar["pattern_bar"] + 1) * S.STEPS_PER_BAR
        for ln in lanes:
            lane = song["lanes"][ln]
            for n in pat["notes"].get(ln, []):
                if not lo <= n["s"] < hi:
                    continue
                t = bi * S.STEPS_PER_BAR + (n["s"] - lo) + float(n.get("o", 0.0))
                p = n["p"] if ln == "drums" else n["p"] + bar["transpose"]
                out.append({"lane": ln, "t": t, "p": int(p), "v": float(n["v"]), "l": float(n["l"]), "preset": lane["instrument"],
                            "vol": float(lane["volume"]), "tone": float(lane["tone"]), "pan": float(lane["pan"])})
    out.sort(key=lambda e: (e["t"], e["lane"]))
    return out


# ------------------------------------------------------------------ rendering
def render_plan(song: dict, plan: list[dict], *, loop: bool = False, lanes: list[str] | None = None, tail: float = TAIL_SECONDS,
                normalise: bool = False, seed: int | None = None) -> np.ndarray:
    """Stereo float32 at `fx.rate` of the planned bars; with `loop` the tail past the end folds into the head."""
    fx = song["fx"]
    rate = int(fx["rate"])
    step = S.step_seconds(song)
    body_n = int(round(len(plan) * S.STEPS_PER_BAR * step * rate))
    total_n = body_n + int(tail * rate)
    rng = np.random.default_rng((seed if seed is not None else int(song.get("seed", 1))) * 7919 + 11)
    events = events_for(song, plan, lanes)
    snes = float(np.clip(fx.get("snes", 0.7), 0.0, 1.0))
    voices = int(fx.get("voices", 8))
    if snes >= 0.5 and voices == 0:
        voices = 8
    # every voice as a looped sample through the SPC's output: band-limited, a little grain
    voice_cut = 16000.0 - snes * 9500.0
    if voice_cut > rate / 2 - 200:
        voice_cut = rate / 2 - 200
    # render every note, in time order, stealing the oldest voice past the limit
    rendered: list[tuple[int, np.ndarray, dict]] = []     # (start sample, mono signal, event)
    active: list[int] = []                                # indices into `rendered` still sounding
    for e in events:
        i0 = int(round(e["t"] * step * rate))
        if i0 >= total_n:
            continue
        gate = max(e["l"] * step - 0.01, 0.03)
        sig = synth.render_note(e["preset"], e["p"], gate, e["v"], e["tone"], rate, rng)
        if snes > 0.05 and len(sig) > 8:
            sig = dsp.filt(sig, "lowpass", voice_cut, rate, 0.7)
            sig = (sig + snes * 0.25 * (np.tanh(sig * 2.2) / 2.2 - sig)).astype(np.float32)
        active = [k for k in active if rendered[k][0] + len(rendered[k][1]) > i0]
        if voices > 0 and len(active) >= voices:
            oldest = min(active, key=lambda k: rendered[k][0])
            s0, sg, _ = rendered[oldest]
            cut = max(i0 - s0, 0)
            fade = min(int(0.006 * rate), len(sg) - cut)
            if cut < len(sg):
                sg = sg[:cut + fade].copy()
                if fade > 0:
                    sg[cut:] *= np.linspace(1.0, 0.0, fade, dtype=np.float32)
                rendered[oldest] = (s0, sg, rendered[oldest][2])
            active.remove(oldest)
        rendered.append((i0, sig, e))
        active.append(len(rendered) - 1)
    mix = np.zeros((total_n, 2), np.float32)
    for i0, sig, e in rendered:
        m = min(len(sig), total_n - i0)
        if m <= 0:
            continue
        pan = float(np.clip(e["pan"], -1, 1))
        gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
        g = e["vol"] * 0.2
        mix[i0:i0 + m, 0] += sig[:m] * g * gl
        mix[i0:i0 + m, 1] += sig[:m] * g * gr
    out = master(mix, song, rng)
    if loop and body_n > 0 and len(out) > body_n:
        tail_part = out[body_n:]
        m = min(len(tail_part), body_n)
        body = out[:body_n].copy()
        body[:m] += tail_part[:m]
        out = body
    if normalise:
        out = normalise_rms(out)
    return dsp.limiter(out)


def master(mix: np.ndarray, song: dict, rng) -> np.ndarray:
    fx = song["fx"]
    rate = int(fx["rate"])
    snes = float(np.clip(fx.get("snes", 0.7), 0.0, 1.0))
    x = dsp.saturate(mix, float(fx.get("crunch", 0.2)) + snes * 0.08)
    x = dsp.bit_depth(x, min(int(fx.get("bits", 16)), int(round(16 - 4 * snes))))
    beat = 60.0 / float(song["tempo"])
    x = dsp.echo(x, rate, float(fx.get("echo_beats", 0.75)) * beat, float(fx.get("echo_feedback", 0.35)), float(fx.get("echo", 0.25)) * (1.0 + 0.3 * snes), float(fx.get("echo_tone", 0.5)) * (1.0 - 0.3 * snes))
    if snes > 0.05:
        for c in range(2):
            x[:, c] = dsp.filt(x[:, c], "lowpass", 16000.0 - snes * 8000.0, rate, 0.6)
    x = dsp.hall(x, rate, float(fx.get("reverb_size", 1.6)), float(fx.get("reverb", 0.3)), rng)
    x = x[: len(mix)]
    return (x * float(fx.get("master", 1.0))).astype(np.float32)


def normalise_rms(x: np.ndarray, target: float = TARGET_RMS) -> np.ndarray:
    r = dsp.rms(x)
    return (x * (target / r)).astype(np.float32) if r > 1e-6 else x


def render_song(song: dict, *, loop: bool = True, normalise: bool = True, lanes: list[str] | None = None) -> np.ndarray:
    return render_plan(song, timeline(song), loop=loop, lanes=lanes, normalise=normalise)


def render_bar(song: dict, section: int, bar: int, *, loop: bool = True, lanes: list[str] | None = None) -> np.ndarray:
    """One bar of a section (bar counted inside the section), looping; what the editor plays after an edit."""
    tl = timeline(song)
    i = min(max(section_bar_index(song, section, bar), 0), len(tl) - 1)
    return render_plan(song, [tl[i]], loop=loop, lanes=lanes)


def render_bars(song: dict, start_bar: int, bars: int, *, loop: bool = True, lanes: list[str] | None = None) -> np.ndarray:
    tl = timeline(song)
    plan = tl[max(start_bar, 0): max(start_bar, 0) + max(bars, 1)]
    return render_plan(song, plan or tl[:1], loop=loop, lanes=lanes)


def render_pattern(song: dict, pattern: str, *, loop: bool = True, lanes: list[str] | None = None, transpose: int = 0) -> np.ndarray:
    return render_plan(song, pattern_plan(song, pattern, transpose), loop=loop, lanes=lanes)


def render_section(song: dict, section: int, *, loop: bool = True, lanes: list[str] | None = None) -> np.ndarray:
    tl = [b for b in timeline(song) if b["section"] == section]
    return render_plan(song, tl or timeline(song)[:1], loop=loop, lanes=lanes)


# ------------------------------------------------------------------ files
def write_wav(x: np.ndarray, path: str | Path, rate: int) -> str:
    import wave

    Path(path).parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2 if x.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(int(rate))
        w.writeframes(pcm.tobytes())
    return str(path)


def to_ogg(wav: str | Path, ogg: str | Path | None = None, quality: int = 3) -> str | None:
    """WAV -> OGG Vorbis with ffmpeg when it is installed; None when it is not."""
    import shutil
    import subprocess

    exe = shutil.which("ffmpeg")
    if not exe:
        return None
    ogg = Path(ogg) if ogg else Path(wav).with_suffix(".ogg")
    r = subprocess.run([exe, "-v", "error", "-y", "-i", str(wav), "-c:a", "libvorbis", "-q:a", str(quality), str(ogg)], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {r.stderr.strip()[:300]}")
    return str(ogg)


def export(song: dict, out_dir: str | Path, name: str | None = None, *, fmt: str = "wav", loop: bool = True, preview: bool = True,
           png: bool = True, normalise: bool = True) -> dict:
    """Render the whole song to <out_dir>/<name>.wav|.ogg (+ .png preview, + the song JSON beside it)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    name = name or slug(song.get("title", "song"))
    t0 = time.perf_counter()
    x = render_song(song, loop=loop, normalise=normalise)
    secs = time.perf_counter() - t0
    rate = int(song["fx"]["rate"])
    wav = out_dir / f"{name}.wav"
    write_wav(x, wav, rate)
    files, notes = [], []
    if fmt in ("ogg", "both"):
        ogg = to_ogg(wav)
        if ogg:
            files.append(ogg)
            if fmt == "ogg":
                wav.unlink()
        else:
            notes.append("ffmpeg not found: wrote WAV (Godot plays WAV; install ffmpeg for smaller OGG files)")
    if fmt != "ogg" or not files:
        files.append(str(wav))
    r = {"ok": True, "files": files, "name": name, "seconds": round(len(x) / rate, 2), "render_seconds": round(secs, 2), "rate": rate,
         "rms": round(dsp.rms(x), 4), "song": S.save(song, out_dir / f"{name}.song.json"), "dir": str(out_dir)}
    if png:
        r["png"] = preview_png(x, out_dir / f"{name}.png", rate)
    if notes:
        r["notes"] = notes
    return r


def slug(s: str) -> str:
    out = "".join(ch.lower() if ch.isalnum() else "_" for ch in s).strip("_")
    while "__" in out:
        out = out.replace("__", "_")
    return out or "song"


def preview_png(x: np.ndarray, path: str | Path, rate: int) -> str:
    """A picture of the piece: waveform on top, spectrogram below (log frequency, 20 Hz .. 10 kHz)."""
    from PIL import Image

    n = len(x)
    W, HW, HS = 900, 110, 190
    mono = x.mean(axis=1) if x.ndim == 2 else x
    img = Image.new("RGB", (W, HW + HS + 4), (12, 12, 14))
    px = img.load()
    for i, col in enumerate(np.array_split(mono, W)):
        if len(col) == 0:
            continue
        lo, hi = float(col.min()), float(col.max())
        y0, y1 = int(HW / 2 - hi * HW / 2), int(HW / 2 - lo * HW / 2)
        for y in range(max(0, y0), min(HW, y1 + 1)):
            px[i, y] = (214, 206, 186)
    frame, hop = 2048, max(1, n // W)
    win = np.hanning(frame).astype(np.float32)
    freqs = np.fft.rfftfreq(frame, 1 / rate)
    rows = np.geomspace(20, min(10000, rate / 2 - 1), HS)
    idx = np.searchsorted(freqs, rows)
    for i in range(W):
        s0 = min(i * hop, max(0, n - frame))
        seg = mono[s0:s0 + frame]
        if len(seg) < frame:
            seg = np.pad(seg, (0, frame - len(seg)))
        mag = np.abs(np.fft.rfft(seg * win)) * (2 / win.sum())
        db = 20 * np.log10(mag[np.minimum(idx, len(mag) - 1)] + 1e-6)
        lvl = np.clip((db + 72) / 72, 0, 1)
        for r in range(HS):
            v = float(lvl[r])
            if v < 0.5:
                c = (int(12 + v * 2 * 30), int(12 + v * 2 * 90), int(14 + v * 2 * 80))
            else:
                w = (v - 0.5) * 2
                c = (int(42 + w * 190), int(102 + w * 60), int(94 - w * 70))
            px[i, HW + 4 + (HS - 1 - r)] = c
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return str(path)
