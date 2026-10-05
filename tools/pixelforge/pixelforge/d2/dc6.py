"""DC6: Diablo 2's run-length sprite format (interface art, items, missiles, some objects; the game converts DCCs
into this in memory). Header: i32 version (6), u32 flags (1), u32 encoding (0), 4 bytes termination (EE EE EE EE),
u32 directions, u32 frames per direction; u32 frame pointers; per frame: u32 flip, u32 width, u32 height, i32 offset
x, i32 offset y (the bottom row), u32 unknown, u32 next block, u32 length, the rows bottom to top (a byte 0x80 ends a
row, a byte with bit 0x80 skips (b & 0x7f) transparent pixels, else b raw pixels follow), then 3 terminator bytes."""
from __future__ import annotations

import struct

import numpy as np

from .dcc import DCC, Frame

TERMINATION = b"\xee\xee\xee\xee"
TERMINATOR = b"\xee\xee\xee"


class DC6Error(ValueError):
    pass


def decode(data: bytes) -> DCC:
    if len(data) < 24:
        raise DC6Error("not a DC6 file (too short)")
    version, flags, encoding = struct.unpack_from("<iII", data, 0)
    ndirs, fpd = struct.unpack_from("<II", data, 16)
    if version != 6 or ndirs == 0 or fpd == 0 or ndirs * fpd > 100000:
        raise DC6Error("not a DC6 file (the header does not read as one)")
    ptrs = struct.unpack_from(f"<{ndirs * fpd}I", data, 24)
    dirs: list[list[Frame]] = []
    for d in range(ndirs):
        frames = []
        for f in range(fpd):
            p = ptrs[d * fpd + f]
            flip, w, h, ox, oy, unknown, nxt, length = struct.unpack_from("<IIIiiIII", data, p)
            px = np.zeros((h, w), np.uint8)
            body = data[p + 32:p + 32 + length]
            x, y, i = 0, h - 1, 0
            while i < len(body) and y >= 0:
                b = body[i]; i += 1
                if b == 0x80:
                    y -= 1; x = 0
                elif b & 0x80:
                    x += b & 0x7F
                else:
                    px[y, x:x + b] = np.frombuffer(body[i:i + b], np.uint8)[: max(0, min(b, w - x))]
                    i += b; x += b
            if flip:
                px = px[::-1]
            frames.append(Frame(px, ox, oy - h + 1))
        dirs.append(frames)
    return DCC(dirs, version)


def encode_rows(pixels: np.ndarray) -> bytes:
    out = bytearray()
    for row in pixels[::-1]:
        opaque = row != 0
        end = int(np.nonzero(opaque)[0].max()) + 1 if opaque.any() else 0
        x = 0
        while x < end:
            o = bool(opaque[x])
            n = 0
            while x < end and n < 127 and bool(opaque[x]) == o:
                x += 1; n += 1
            if o:
                out.append(n); out += bytes(row[x - n:x])
            else:
                out.append(0x80 | n)
        out.append(0x80)
    return bytes(out)


def encode(dcc: DCC) -> bytes:
    ndirs = len(dcc.directions)
    fpd = dcc.frames_per_direction
    frames = [f if (f.width and f.height) else Frame(np.zeros((1, 1), np.uint8), f.left, f.top) for d in dcc.directions for f in d]
    bodies = [encode_rows(f.pixels) for f in frames]
    head = struct.pack("<iII", 6, 1, 0) + TERMINATION + struct.pack("<II", ndirs, fpd)
    p = len(head) + 4 * len(frames)
    ptrs = []
    for b in bodies:
        ptrs.append(p); p += 32 + len(b) + 3
    out = bytearray(head) + struct.pack(f"<{len(ptrs)}I", *ptrs)
    for i, (f, b) in enumerate(zip(frames, bodies)):
        nxt = ptrs[i + 1] if i + 1 < len(ptrs) else p
        out += struct.pack("<IIIiiIII", 0, f.width, f.height, f.left, f.bottom, 0, nxt, len(b)) + b + TERMINATOR
    return bytes(out)
