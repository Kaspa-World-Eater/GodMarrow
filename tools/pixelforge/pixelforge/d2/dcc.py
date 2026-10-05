"""DCC: Diablo 2's cell-coded animation format (characters, monsters, objects).

A DCC holds one animation of N directions by M frames of palette indices (no palette: the act's ``pal.dat`` gives the
colours; index 0 is transparent). Every direction is cut into 4x4 cells on a grid anchored at the direction's box;
a cell may hold at most 4 distinct indices (0 counted), coded as a stack of ascending index codes plus 1 or 2 bits a
pixel; a cell equal to the last thing drawn in that place is one bit. The layout follows Paul Siramy's description
of the format as the community decoders (OpenDiablo2, pd2-sprite-studio) read it:

    byte signature 0x74, byte version (6), byte directions, u32 frames per direction, u32 tag (1), u32 final DC6
    size, u32 byte offset per direction; then per direction: u32 outsize coded, 2 bits compression flags, 7 x 4-bit
    width codes (variable0, width, height, x offset, y offset, optional bytes, coded bytes), the frame headers, the
    optional bytes (byte aligned), 20-bit stream sizes (equal cells when flag 2, pixel mask, encoding type and raw
    pixels when flag 1), 256 bits of used palette indices, then the streams back to back: equal cells, pixel mask,
    encoding type, raw pixels, pixel codes and displacements.

The game's own decoder (D2CMP.dll) is stricter than the community ones: a frame's *coded bytes* must be its size as
DC6 run-length data, a direction's *outsize coded* the sum of (coded bytes + 35), the file's *final DC6 size*
24 + the sum of (coded bytes + 39), no frame over 256 px a side, no 0x0 frame, and no direction over about 5,400
cells; wrong sizes stop the game with "Sprite Decompression Error". The encoder here writes those values.
"""
from __future__ import annotations

import struct
from dataclasses import dataclass, field

import numpy as np

from .bits import BitReader, BitWriter

SIGNATURE = 0x74
VERSION = 6
CRAZY_BITS = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 26, 28, 30, 32]
PIXEL_MASK_COUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4]
MAX_FRAME_SIDE = 256
MAX_DIRECTION_CELLS = 5400
CELL = 4


@dataclass
class Frame:
    """One frame: palette indices (height, width), ``left`` and ``top`` relative to the unit's origin (its feet;
    y grows down the screen, so a standing figure has a negative top and a bottom row near 0)."""
    pixels: np.ndarray
    left: int = 0
    top: int = 0

    @property
    def width(self) -> int:
        return int(self.pixels.shape[1])

    @property
    def height(self) -> int:
        return int(self.pixels.shape[0])

    @property
    def bottom(self) -> int:
        """The bottom row (what the file stores as the y offset)."""
        return self.top + self.height - 1


@dataclass
class DCC:
    directions: list[list[Frame]]
    version: int = VERSION
    final_dc6_size: int = 0

    @property
    def frames_per_direction(self) -> int:
        return len(self.directions[0]) if self.directions else 0


class DCCError(ValueError):
    pass


# ---------------------------------------------------------------- cells
def _split(first_offset: int, size: int) -> list[int]:
    """Cell sizes along one axis of a frame whose edge sits ``first_offset`` px past the direction grid line."""
    first = CELL - (first_offset % CELL)
    if size - first <= 1:
        return [size]
    tmp = size - first - 1
    n = 2 + tmp // CELL
    if tmp % CELL == 0:
        n -= 1
    sizes = [first] + [CELL] * (n - 2) + [size - first - CELL * (n - 2)]
    return sizes


def _frame_cells(fl: int, ft: int, fw: int, fh: int, dl: int, dt: int) -> tuple[list[tuple[int, int, int, int]], int, int, int, int]:
    """Cells of a frame (x0, y0, w, h relative to the direction box), their counts, and the direction-cell column
    and row of the first cell."""
    ws = _split(fl - dl, fw)
    hs = _split(ft - dt, fh)
    cells = []
    y = ft - dt
    for h in hs:
        x = fl - dl
        for w in ws:
            cells.append((x, y, w, h))
            x += w
        y += h
    return cells, len(ws), len(hs), (fl - dl) // CELL, (ft - dt) // CELL


# ---------------------------------------------------------------- decoding
def decode(data: bytes) -> DCC:
    if len(data) < 15 or data[0] != SIGNATURE:
        raise DCCError("not a DCC file (the first byte is not 0x74)")
    version = data[1]
    ndirs = data[2]
    fpd = struct.unpack_from("<I", data, 3)[0]
    tag, final = struct.unpack_from("<II", data, 7)
    offsets = struct.unpack_from(f"<{ndirs}I", data, 15)
    dirs = [_decode_direction(data, off, fpd) for off in offsets]
    return DCC(dirs, version, final)


def _decode_direction(data: bytes, offset: int, fpd: int) -> list[Frame]:
    br = BitReader(data, offset * 8)
    br.bits(32)                                      # outsize coded
    flags = br.bits(2)
    v0b, wb, hb, xb, yb, ob, cb = (CRAZY_BITS[br.bits(4)] for _ in range(7))
    heads = []
    for _ in range(fpd):
        br.bits(v0b)
        w = br.bits(wb)
        h = br.bits(hb)
        xo = br.signed(xb)
        yo = br.signed(yb)
        nopt = br.bits(ob)
        br.bits(cb)
        bottom_up = br.bit()
        top = yo if bottom_up else yo - h + 1
        heads.append((w, h, xo, top, nopt, bottom_up))
    if any(hd[4] for hd in heads):
        br.align()
        for hd in heads:
            br.skip(8 * hd[4])
    ec_size = br.bits(20) if flags & 2 else 0
    pm_size = br.bits(20)
    et_size = rp_size = 0
    if flags & 1:
        et_size = br.bits(20)
        rp_size = br.bits(20)
    entries = [i for i in range(256) if br.bit()]
    ec = br.copy(); br.skip(ec_size)
    pm = br.copy(); br.skip(pm_size)
    et = br.copy(); br.skip(et_size)
    rp = br.copy(); br.skip(rp_size)
    pcd = br.copy()

    dl = min(hd[2] for hd in heads); dt = min(hd[3] for hd in heads)
    dr = max(hd[2] + hd[0] for hd in heads); db = max(hd[3] + hd[1] for hd in heads)
    dw, dh = dr - dl, db - dt
    ncx = 1 + (dw - 1) // CELL
    ncy = 1 + (dh - 1) // CELL
    layouts = [_frame_cells(hd[2], hd[3], hd[0], hd[1], dl, dt) for hd in heads]

    # stage 1: the pixel buffer (one entry per coded frame cell: up to 4 palette-entry codes)
    buffer: list[list] = []                  # [values(4), frame, cell_index]
    cell_buffer: list = [None] * (ncx * ncy)
    for fi, (cells, nbw, nbh, cx0, cy0) in enumerate(layouts):
        for ci in range(len(cells)):
            cx = cx0 + ci % nbw
            cy = cy0 + ci // nbw
            cur = cx + cy * ncx
            old = cell_buffer[cur]
            if old is not None:
                tmp = ec.bit() if ec_size > 0 else 0
                if tmp:
                    continue                        # equal cell: nothing coded for this frame cell
                mask = pm.bits(4)
            else:
                mask = 0x0F
            n = PIXEL_MASK_COUNT[mask]
            enc = et.bit() if (n and et_size > 0) else 0
            stack = [0, 0, 0, 0]
            last = 0
            decoded = 0
            for i in range(n):
                if enc:
                    stack[i] = rp.bits(8)
                else:
                    stack[i] = last
                    d = pcd.bits(4)
                    stack[i] += d
                    while d == 15:
                        d = pcd.bits(4)
                        stack[i] += d
                if stack[i] == last:
                    stack[i] = 0
                    break
                last = stack[i]
                decoded += 1
            vals = [0, 0, 0, 0]
            k = decoded - 1
            for i in range(4):
                if mask & (1 << i):
                    if k >= 0:
                        vals[i] = stack[k]; k -= 1
                    else:
                        vals[i] = 0
                else:
                    vals[i] = old[0][i]
            entry = [vals, fi, ci]
            buffer.append(entry)
            cell_buffer[cur] = entry
    for e in buffer:
        e[0] = [entries[v] if v < len(entries) else 0 for v in e[0]]

    # stage 2: paint the frames from the direction bitmap
    bmp = np.zeros((dh, dw), dtype=np.uint8)
    last_cell = [None] * (ncx * ncy)      # (x0, y0, w, h) last painted at this direction cell
    frames = []
    pb = 0
    for fi, (cells, nbw, nbh, cx0, cy0) in enumerate(layouts):
        w, h, xo, top, _, bottom_up = heads[fi]
        fx, fy = xo - dl, top - dt
        for ci, (x0, y0, cw, ch) in enumerate(cells):
            cur = (x0 // CELL) + (y0 // CELL) * ncx
            lc = last_cell[cur]
            entry = buffer[pb] if pb < len(buffer) else None
            if entry is None or entry[1] != fi or entry[2] != ci:
                if lc is None or lc[2] != cw or lc[3] != ch:
                    bmp[y0:y0 + ch, x0:x0 + cw] = 0
                else:
                    bmp[y0:y0 + ch, x0:x0 + cw] = bmp[lc[1]:lc[1] + ch, lc[0]:lc[0] + cw].copy()
            else:
                vals = entry[0]
                if vals[0] == vals[1]:
                    bmp[y0:y0 + ch, x0:x0 + cw] = vals[0]
                else:
                    nb = 1 if vals[1] == vals[2] else 2
                    block = np.empty((ch, cw), dtype=np.uint8)
                    for yy in range(ch):
                        for xx in range(cw):
                            block[yy, xx] = vals[pcd.bits(nb)]
                    bmp[y0:y0 + ch, x0:x0 + cw] = block
                pb += 1
            last_cell[cur] = (x0, y0, cw, ch)
        px = bmp[fy:fy + h, fx:fx + w].copy()
        if bottom_up:
            px = px[::-1]
        frames.append(Frame(px, xo, top))
    return frames


# ---------------------------------------------------------------- encoding
def dc6_coded_size(pixels: np.ndarray) -> int:
    """A frame's size as DC6 run-length rows: what the game sizes its decode buffers from."""
    size = 0
    for row in pixels:
        opaque = row != 0
        end = int(np.nonzero(opaque)[0].max()) + 1 if opaque.any() else 0
        x = 0
        while x < end:
            o = bool(opaque[x])
            n = 0
            while x < end and n < 127 and bool(opaque[x]) == o:
                x += 1; n += 1
            size += 1 + n if o else 1
        size += 1
    return size


def _bits_index(max_unsigned: int) -> int:
    for i, b in enumerate(CRAZY_BITS):
        if max_unsigned < (1 << b):
            return i
    return 15


def _signed_bits_index(values) -> int:
    values = list(values)
    for i, b in enumerate(CRAZY_BITS):
        if b == 0:
            if all(v == 0 for v in values):
                return i
            continue
        if all(-(1 << (b - 1)) <= v < (1 << (b - 1)) for v in values):
            return i
    return 15


def cell_violations(frames: list[Frame], dl: int, dt: int) -> int:
    """How many cells of these frames hold more than 4 distinct indices on a grid anchored at (dl, dt)."""
    n = 0
    for f in frames:
        if f.width == 0 or f.height == 0:
            continue
        cells, *_ = _frame_cells(f.left, f.top, f.width, f.height, dl, dt)
        fx, fy = f.left - dl, f.top - dt
        for x0, y0, w, h in cells:
            if len(np.unique(f.pixels[y0 - fy:y0 - fy + h, x0 - fx:x0 - fx + w])) > 4:
                n += 1
    return n


def reduce_cell(block: np.ndarray, lab: np.ndarray | None) -> tuple[np.ndarray, int]:
    """A cell's indices reduced to at most 4 (0 always kept when present; the rest the most frequent; the others
    mapped to the nearest kept colour in OKLab when the palette's ``lab`` is given, by index distance otherwise).
    Returns the block and the number of pixels changed."""
    vals, counts = np.unique(block, return_counts=True)
    if len(vals) <= 4:
        return block, 0
    order = vals[np.argsort(-counts, kind="stable")]
    if 0 in vals:
        keep = [0] + [int(v) for v in order if v != 0][:3]
    else:
        keep = [int(v) for v in order[:4]]
    out = block.copy()
    changed = 0
    for v in vals:
        if int(v) in keep:
            continue
        cands = [k for k in keep if k != 0] or keep
        if lab is not None:
            d = [float(((lab[v] - lab[k]) ** 2).sum()) for k in cands]
        else:
            d = [abs(int(v) - k) for k in cands]
        best = cands[int(np.argmin(d))]
        m = block == v
        out[m] = best
        changed += int(m.sum())
    return out, changed


def encode(dcc: DCC, lab: np.ndarray | None = None) -> tuple[bytes, dict]:
    """Encode a DCC. ``lab`` (256, 3) is the act palette in OKLab for the 4-colour cell reduction. Returns the bytes
    and a report: cells reduced, pixels changed, the sizes."""
    if not dcc.directions:
        raise DCCError("a DCC needs at least one direction")
    fpd = len(dcc.directions[0])
    if any(len(d) != fpd for d in dcc.directions):
        raise DCCError("every direction must have the same number of frames")
    for d in dcc.directions:
        for f in d:
            if f.width > MAX_FRAME_SIDE or f.height > MAX_FRAME_SIDE:
                raise DCCError(f"a frame is {f.width}x{f.height} px; the game's decoder stops on any frame over {MAX_FRAME_SIDE} px a side. "
                               "Render the character smaller (Diablo 2 heroes stand about 75 px tall).")
    report = {"directions": len(dcc.directions), "frames_per_direction": fpd, "cells_reduced": 0, "pixels_changed": 0, "direction_cells": []}
    blobs, coded_all = [], []
    for frames in dcc.directions:
        blob, coded, rep = _encode_direction(frames, lab)
        blobs.append(blob); coded_all.append(coded)
        report["cells_reduced"] += rep["cells_reduced"]; report["pixels_changed"] += rep["pixels_changed"]
        report["direction_cells"].append(rep["cells"])
    header = 15 + 4 * len(blobs)
    final = 24 + sum(c + 39 for coded in coded_all for c in coded)
    out = bytearray(struct.pack("<BBBIII", SIGNATURE, dcc.version, len(blobs), fpd, 1, final)[:15])
    p = header
    offs = []
    for b in blobs:
        offs.append(p); p += len(b)
    out += struct.pack(f"<{len(offs)}I", *offs)
    for b in blobs:
        out += b
    report["bytes"] = len(out); report["final_dc6_size"] = final
    return bytes(out), report


def _encode_direction(frames_in: list[Frame], lab: np.ndarray | None) -> tuple[bytes, list[int], dict]:
    frames = [f if (f.width and f.height) else Frame(np.zeros((1, 1), np.uint8), f.left, f.top) for f in frames_in]
    min_l = min(f.left for f in frames); min_t = min(f.top for f in frames)
    # anchor the cell grid where the fewest cells break the 4-colour rule (0..3 px of transparent padding)
    best = (min_l, min_t, cell_violations(frames, min_l, min_t))
    if best[2] > 0:
        for py in range(CELL):
            for px in range(CELL):
                if (px, py) == (0, 0):
                    continue
                v = cell_violations(frames, min_l - px, min_t - py)
                if v < best[2]:
                    best = (min_l - px, min_t - py, v)
                if v == 0:
                    break
            if best[2] == 0:
                break
    al, at = best[0], best[1]
    if al < min_l:
        i = next(k for k, f in enumerate(frames) if f.left == min_l)
        f = frames[i]
        px = np.zeros((f.height, f.width + (min_l - al)), np.uint8); px[:, min_l - al:] = f.pixels
        frames[i] = Frame(px, al, f.top)
    if at < min_t:
        i = next(k for k, f in enumerate(frames) if f.top == min_t)
        f = frames[i]
        px = np.zeros((f.height + (min_t - at), f.width), np.uint8); px[min_t - at:, :] = f.pixels
        frames[i] = Frame(px, f.left, at)
    dl = min(f.left for f in frames); dt = min(f.top for f in frames)
    dr = max(f.left + f.width for f in frames); dbm = max(f.top + f.height for f in frames)
    dw, dh = dr - dl, dbm - dt
    ncx = 1 + (dw - 1) // CELL; ncy = 1 + (dh - 1) // CELL
    if ncx * ncy > MAX_DIRECTION_CELLS:
        raise DCCError(f"a direction spans {ncx * ncy} cells of 4x4 px (its frames together cover {dw}x{dh} px); the game's decoder overruns past "
                       f"about {MAX_DIRECTION_CELLS}. Render the character smaller or split the clip.")
    layouts = [_frame_cells(f.left, f.top, f.width, f.height, dl, dt) for f in frames]
    # cell contents after the 4-colour reduction
    rep = {"cells_reduced": 0, "pixels_changed": 0, "cells": ncx * ncy}
    cell_px: list[list[np.ndarray]] = []
    reduced_frames = []
    for f, (cells, *_r) in zip(frames, layouts):
        fx, fy = f.left - dl, f.top - dt
        px = f.pixels.copy()
        blocks = []
        for x0, y0, w, h in cells:
            sl = (slice(y0 - fy, y0 - fy + h), slice(x0 - fx, x0 - fx + w))
            block, changed = reduce_cell(px[sl], lab)
            if changed:
                rep["cells_reduced"] += 1; rep["pixels_changed"] += changed
                px[sl] = block
            blocks.append(block)
        cell_px.append(blocks)
        reduced_frames.append(px)
    used = {0}
    for blocks in cell_px:
        for b in blocks:
            used.update(int(v) for v in np.unique(b))
    values = sorted(used)
    code = {v: i for i, v in enumerate(values)}

    ec, pm, pc1, pc2 = BitWriter(), BitWriter(), BitWriter(), BitWriter()
    bmp = np.zeros((dh, dw), np.uint8)
    seen = [False] * (ncx * ncy)
    last_cell: list = [None] * (ncx * ncy)
    for fi, (cells, nbw, nbh, cx0, cy0) in enumerate(layouts):
        for ci, (x0, y0, w, h) in enumerate(cells):
            cur = (cx0 + ci % nbw) + (cy0 + ci // nbw) * ncx
            block = cell_px[fi][ci]
            if seen[cur]:
                lc = last_cell[cur]
                if lc is not None and lc[2] == w and lc[3] == h:
                    reuse = bmp[lc[1]:lc[1] + h, lc[0]:lc[0] + w]
                else:
                    reuse = np.zeros((h, w), np.uint8)
                if np.array_equal(reuse, block):
                    ec.bits(1, 1)
                    bmp[y0:y0 + h, x0:x0 + w] = block
                    last_cell[cur] = (x0, y0, w, h)
                    continue
                ec.bits(0, 1)
                pm.bits(0x0F, 4)
            seen[cur] = True
            bmp[y0:y0 + h, x0:x0 + w] = block
            codes = sorted({code[int(v)] for v in np.unique(block)} - {0})
            last = 0
            for v in codes:
                d = v - last
                while d >= 15:
                    pc1.bits(15, 4); d -= 15
                pc1.bits(d, 4)
                last = v
            if len(codes) < 4:
                pc1.bits(0, 4)
            vals = [0, 0, 0, 0]
            for i, v in enumerate(reversed(codes)):
                vals[i] = v
            if vals[0] != vals[1]:
                nb = 1 if vals[1] == vals[2] else 2
                lookup = {v: i for i, v in reversed(list(enumerate(vals)))}   # the first index of each value
                for v in block.reshape(-1):
                    pc2.bits(lookup[code[int(v)]], nb)
            last_cell[cur] = (x0, y0, w, h)

    coded = [dc6_coded_size(px) for px in reduced_frames]
    v0i = 0
    wi = _bits_index(max(f.width for f in frames)); hi = _bits_index(max(f.height for f in frames))
    xi = _signed_bits_index(f.left for f in frames); yi = _signed_bits_index(f.bottom for f in frames)
    oi = 0; ci_ = _bits_index(max(coded))
    bw = BitWriter()
    bw.bits(sum(c + 35 for c in coded), 32)
    bw.bits(2, 2)
    for i in (v0i, wi, hi, xi, yi, oi, ci_):
        bw.bits(i, 4)
    for f, c in zip(frames, coded):
        bw.bits(f.width, CRAZY_BITS[wi]); bw.bits(f.height, CRAZY_BITS[hi])
        bw.signed(f.left, CRAZY_BITS[xi]); bw.signed(f.bottom, CRAZY_BITS[yi])
        bw.bits(c, CRAZY_BITS[ci_]); bw.bits(0, 1)
    if ec.pos >= 1 << 20 or pm.pos >= 1 << 20:
        raise DCCError("a direction is too large to code (a stream passed 2^20 bits); render the character smaller")
    bw.bits(ec.pos, 20); bw.bits(pm.pos, 20)
    for i in range(256):
        bw.bits(1 if i in used else 0, 1)
    for s in (ec, pm, pc1, pc2):
        bw.append(s)
    bw.align()
    return bw.bytes(), coded, rep
