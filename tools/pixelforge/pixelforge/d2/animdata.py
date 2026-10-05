"""``data/global/AnimData.d2``: frames per direction and speed for every COF. 256 hash blocks (the block is the sum
of the upper-cased name's bytes mod 256), each a u32 count then records of 8-byte name, u32 frames per direction,
u32 speed (256 = 25 frames a second; fps = 25 * speed / 256) and 144 bytes of trigger codes, one per frame.

The free tool for this file is the ``d2animdata`` package (pip, MIT); it is used when installed, and a built-in
reader and writer of the same struct stands in when it is not (``tool`` in every result says which)."""
from __future__ import annotations

import struct
from pathlib import Path

RECORD = struct.Struct("<8sII144B")
BASE_FPS = 25.0
BASE_SPEED = 256


def hash_name(name: str) -> int:
    return sum(name.upper().encode("ascii", "replace")) % 256


def speed_for_fps(fps: float) -> int:
    return max(1, int(round(float(fps) * BASE_SPEED / BASE_FPS)))


def fps_for_speed(speed: int) -> float:
    return BASE_FPS * int(speed) / BASE_SPEED


def _tool():
    try:
        import d2animdata  # type: ignore
        return d2animdata
    except ImportError:
        return None


def read(path: str | Path) -> tuple[list[dict], str]:
    """All records as ``{"name", "frames", "speed", "triggers": {frame: code}}`` in file order, and the tool used."""
    data = Path(path).read_bytes()
    tool = _tool()
    if tool is not None:
        recs = tool.loads(data)
        return [{"name": r.cof_name, "frames": r.frames_per_direction, "speed": r.animation_speed, "triggers": dict(r.triggers)} for r in recs], "d2animdata"
    out = []
    p = 0
    for _ in range(256):
        if p + 4 > len(data):
            break
        n = struct.unpack_from("<I", data, p)[0]; p += 4
        for _ in range(n):
            name, frames, speed, *codes = RECORD.unpack_from(data, p); p += RECORD.size
            out.append({"name": name.split(b"\0", 1)[0].decode("ascii", "replace"), "frames": frames, "speed": speed,
                        "triggers": {i: c for i, c in enumerate(codes) if c}})
    return out, "built-in"


def write(records: list[dict], path: str | Path) -> str:
    tool = _tool()
    path = Path(path)
    if tool is not None:
        recs = [tool.Record(cof_name=r["name"], frames_per_direction=int(r["frames"]), animation_speed=int(r["speed"]),
                            triggers={int(k): int(v) for k, v in r.get("triggers", {}).items()}) for r in records]
        path.write_bytes(bytes(tool.dumps(recs)))
        return "d2animdata"
    blocks: list[list[bytes]] = [[] for _ in range(256)]
    for r in records:
        codes = [0] * 144
        for k, v in r.get("triggers", {}).items():
            if 0 <= int(k) < 144:
                codes[int(k)] = int(v)
        blocks[hash_name(r["name"])].append(RECORD.pack(r["name"].encode("ascii")[:8].ljust(8, b"\0"), int(r["frames"]), int(r["speed"]), *codes))
    out = bytearray()
    for b in blocks:
        out += struct.pack("<I", len(b))
        for rec in b:
            out += rec
    path.write_bytes(bytes(out))
    return "built-in"


def upsert(records: list[dict], name: str, frames: int, speed: int, triggers: dict | None = None) -> list[dict]:
    """Replace every record of ``name`` with one (the game reads the first; one is unambiguous), or add it."""
    name = name.upper()
    new = {"name": name, "frames": int(frames), "speed": int(speed), "triggers": {int(k): int(v) for k, v in (triggers or {}).items()}}
    out = []
    placed = False
    for r in records:
        if r["name"].upper() == name:
            if not placed:
                out.append(new); placed = True
            continue
        out.append(r)
    if not placed:
        out.append(new)
    return out


def find(records: list[dict], name: str) -> dict | None:
    name = name.upper()
    for r in records:
        if r["name"].upper() == name:
            return r
    return None
