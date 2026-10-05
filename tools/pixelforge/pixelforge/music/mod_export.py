"""One of our songs as a ProTracker .mod, the four-channel tracker format Furnace (and every tracker since 1990) opens.

    export_mod("current.song.json", "current.mod") -> {"ok", "mod", "patterns", "samples", "channels", "dropped"}

What goes where: lead (+ sparkle when the lead is silent) on channel 1, counter (+ pad) on channel 2, bass on channel
3, drums on channel 4. Each instrument is a looped single-cycle wave (32 samples: at ProTracker's C-2 that sounds C4,
so MIDI 60 sits on C-2 and the three tracker octaves cover MIDI 36..71; notes outside are moved an octave), the drums
are short PCM hits from our own synth at the Amiga rate. Velocity is a Cxx volume, note ends are a volume 0 where
nothing new starts, the tempo is Fxx on the first row. A bar of our 16 steps is 16 rows; a pattern holds 64, so four
of our bars make one tracker pattern. Nothing here needs Furnace; it only needs numpy and the song.
"""

from __future__ import annotations

import struct
from pathlib import Path

import numpy as np

from . import song as S
from . import synth

PERIODS = [856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453,
           428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226,
           214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113]
MIDI_BASE = 36                 # MIDI 36 (C2) is the tracker's C-1; MIDI 60 (C4) its C-2 with a 32-sample cycle
AMIGA_RATE = 8287              # samples per second at C-2 (period 428)
CYCLE = 32
ROWS = 64
CHANNELS = [("lead", "sparkle"), ("counter", "pad"), ("bass",), ("drums",)]
WAVE_OF = {"square": "square", "chip": "square", "pulse": "pulse", "saw": "saw", "strings": "saw", "brass": "saw", "bass": "saw",
           "sine": "sine", "flute": "sine", "pad": "triangle", "choir": "triangle", "organ": "organ", "bell": "sine", "glass": "sine", "pluck": "saw"}


def _wave(kind: str) -> np.ndarray:
    t = np.arange(CYCLE) / CYCLE
    if kind == "square":
        w = np.where(t < 0.5, 1.0, -1.0)
    elif kind == "pulse":
        w = np.where(t < 0.25, 1.0, -1.0)
    elif kind == "saw":
        w = 2.0 * t - 1.0
    elif kind == "triangle":
        w = 1.0 - 4.0 * np.abs(t - 0.5)
    elif kind == "organ":
        w = np.sin(2 * np.pi * t) * 0.6 + np.sin(4 * np.pi * t) * 0.3 + np.sin(8 * np.pi * t) * 0.1
    else:
        w = np.sin(2 * np.pi * t)
    return np.clip(np.round(w * 100.0), -127, 127).astype(np.int8)


def wave_kind(instrument: str) -> str:
    name = instrument.lower()
    for key, kind in WAVE_OF.items():
        if key in name:
            return kind
    return "square"


def _drum_sample(kit: str, number: int, rng) -> np.ndarray:
    x = synth.drum_hit(kit, int(number), 0.9, 0.5, AMIGA_RATE, rng)
    x = np.asarray(x, dtype=np.float64)
    if x.ndim > 1:
        x = x.mean(axis=1)
    x = x[: min(len(x), 12000)]
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    if peak > 0:
        x = x / peak
    out = np.clip(np.round(x * 120.0), -127, 127).astype(np.int8)
    if len(out) % 2:
        out = np.append(out, np.int8(0))
    return out if len(out) >= 2 else np.zeros(2, np.int8)


def _note(midi: int) -> int:
    """The period for a MIDI pitch, octaves outside the tracker's three folded in."""
    i = int(midi) - MIDI_BASE
    while i < 0:
        i += 12
    while i >= len(PERIODS):
        i -= 12
    return PERIODS[i]


def _cell(sample: int, period: int, effect: int = 0, param: int = 0) -> bytes:
    return bytes([((sample & 0xF0)) | ((period >> 8) & 0x0F), period & 0xFF, ((sample & 0x0F) << 4) | (effect & 0x0F), param & 0xFF])


def _sample_header(name: str, length: int, volume: int, loop_start: int, loop_len: int) -> bytes:
    return name.encode("ascii", "replace")[:22].ljust(22, b"\0") + struct.pack(">HBBHH", length // 2, 0, volume, loop_start // 2, max(loop_len // 2, 1))


def export_mod(song_path: str | Path, out: str | Path) -> dict:
    song = S.load(song_path)
    rng = np.random.default_rng(int(song.get("seed", 1)))
    # samples: one per instrument on the melodic lanes, one per drum number used
    samples: list[tuple[str, np.ndarray, int, int]] = []     # (name, data, loop_start, loop_len)
    index: dict[str, int] = {}

    def melodic(lane: str) -> int:
        inst = str(song["lanes"].get(lane, {}).get("instrument", "lead_square"))
        key = "m:" + inst
        if key not in index:
            if len(samples) >= 31:
                return index.get("m:" + S.LANE_DEFAULT_INSTRUMENT.get(lane, "lead_square"), 1)
            samples.append((inst[:22], _wave(wave_kind(inst)), 0, CYCLE))
            index[key] = len(samples)
        return index[key]

    def drum(number: int) -> int:
        kit = str(song["lanes"].get("drums", {}).get("instrument", "drums_rock"))
        key = f"d:{kit}:{number}"
        if key not in index:
            if len(samples) >= 31:
                return 0
            samples.append((f"{kit[:14]}_{number}", _drum_sample(kit, number, rng), 0, 2))
            index[key] = len(samples)
        return index[key]

    tempo = int(round(float(song.get("tempo", 120))))
    tempo = min(max(tempo, 32), 255)
    dropped = 0
    # the song's sections, expanded, into rows per channel
    rows: list[list[bytes | None]] = []     # rows[row][channel] -> cell bytes or None (empty)
    ends: list[set[int]] = []                # rows at which a note on a channel ends (volume 0 unless a note starts)
    for sec in song.get("sections", []):
        pat = song["patterns"].get(sec.get("pattern", "A"))
        if not pat:
            continue
        steps = int(pat.get("bars", 1)) * S.STEPS_PER_BAR
        trans = int(sec.get("transpose", 0))
        for _ in range(max(1, int(sec.get("repeat", 1)))):
            base = len(rows)
            rows.extend([[None] * 4 for _ in range(steps)])
            ends.extend([set() for _ in range(steps)])
            for ch, lanes in enumerate(CHANNELS):
                for lane in lanes:
                    ln = song["lanes"].get(lane, {})
                    if ln.get("mute"):
                        continue
                    vol_lane = float(ln.get("volume", 0.8))
                    for n in sorted(pat.get("notes", {}).get(lane, []), key=lambda x: int(x.get("s", 0))):
                        r = base + int(n.get("s", 0))
                        if r >= len(rows):
                            continue
                        if rows[r][ch] is not None:
                            dropped += 1          # the channel's first lane keeps the row (sparkle and pad fill the gaps)
                            continue
                        vel = max(1, min(64, int(round(float(n.get("v", 0.8)) * vol_lane * 64))))
                        if lane == "drums":
                            s = drum(int(n.get("p", 36)))
                            if s == 0:
                                dropped += 1
                                continue
                            rows[r][ch] = _cell(s, _note(60), 0xC, vel)
                        else:
                            s = melodic(lane)
                            rows[r][ch] = _cell(s, _note(int(n.get("p", 60)) + trans), 0xC, vel)
                            end = r + max(1, int(n.get("l", 1)))
                            if end < len(rows):
                                ends[end].add(ch)
    for r, chans in enumerate(ends):
        for ch in chans:
            if rows[r][ch] is None:
                rows[r][ch] = _cell(0, 0, 0xC, 0)
    if not rows:
        rows = [[None] * 4]
    # the first row carries the tempo on the first channel without a note... or on top of it (the effect columns are free)
    first = rows[0][0]
    if first is None:
        rows[0][0] = _cell(0, 0, 0xF, tempo)
    else:
        rows[0][0] = first[:2] + bytes([(first[2] & 0xF0) | 0xF, tempo])
    n_pat = max(1, min(128, -(-len(rows) // ROWS)))
    pattern_bytes = bytearray()
    for p in range(n_pat):
        for r in range(ROWS):
            i = p * ROWS + r
            for ch in range(4):
                cell = rows[i][ch] if i < len(rows) else None
                pattern_bytes += cell if cell is not None else b"\0\0\0\0"
    # the file
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    data = bytearray()
    data += str(song.get("title", "Untitled")).encode("ascii", "replace")[:20].ljust(20, b"\0")
    for i in range(31):
        if i < len(samples):
            name, wave, ls, ll = samples[i]
            data += _sample_header(name, len(wave), 64, ls, ll)
        else:
            data += _sample_header("", 0, 0, 0, 0)
    data += bytes([n_pat, 127]) + bytes(list(range(n_pat)) + [0] * (128 - n_pat)) + b"M.K."
    data += pattern_bytes
    for name, wave, ls, ll in samples:
        data += wave.tobytes()
    out.write_bytes(bytes(data))
    return {"ok": True, "mod": str(out), "patterns": n_pat, "rows": len(rows), "samples": len(samples), "channels": 4, "tempo": tempo, "dropped": dropped,
            "note": "four channels: lead+sparkle, counter+pad, bass, drums; notes that collided on a channel were dropped" if dropped else ""}


def read_header(path: str | Path) -> dict:
    """The title, sample names, pattern count and the first row's cells (a check, and what the tests read back)."""
    b = Path(path).read_bytes()
    title = b[:20].rstrip(b"\0").decode("ascii", "replace")
    names = [b[20 + i * 30: 20 + i * 30 + 22].rstrip(b"\0").decode("ascii", "replace") for i in range(31)]
    n = b[950]
    tag = b[1080:1084].decode("ascii", "replace")
    cells = []
    for ch in range(4):
        c = b[1084 + ch * 4: 1088 + ch * 4]
        sample = (c[0] & 0xF0) | (c[2] >> 4)
        period = ((c[0] & 0x0F) << 8) | c[1]
        cells.append({"sample": sample, "period": period, "effect": c[2] & 0x0F, "param": c[3]})
    return {"title": title, "samples": [x for x in names if x], "patterns": n, "tag": tag, "first_row": cells}
