"""The 2 x 2 grid guard (MASTER_RULES section 3 rule 7: "Whole world pixels: the 2 x 2 art grid").

Every art pixel in the game is a 2 x 2 block of screen px. The browser build drew in 4-px cells (its "world px",
Iso.WPX = 4 screen units), and its ports kept doing it. Derek, 2026-10-10: "we need to eliminate the 4x4 shit from
ever happening again". This scans the shaders and the game's scripts for a DRAWING cell of 4 screen px and fails on
any it finds.

  tools/pixelforge/.venv/Scripts/python tools/check_2x2.py      (run first by tools/smoke.sh)

Scanned: shaders/*.gdshader, and the .gd files under world/, fx/, entities/, ui/, skills/ (never web/, Cursemark
paths, cm_ files or .godot/). Prints each hit as file:line and exits 1 if there are any.

Iso.WPX is also a unit (a web world px is 4 screen units: positions, radii, heights, offsets). Those uses are fine and
are not matched. What is matched is a 4 used as the SIZE of a drawn pixel or the step of a snapping grid:
  floor(x / 4.0) * 4.0, (v / 4.0).floor() * 4.0, rect_size / 4.0, cell = 4.0, PX := 4.0, W := 4.0,
  Vector2(4, 4) / vec2(4.0) / Rect2(x, y, 4, 4) as a pixel, (WPX, WPX) as a rect size or snap step, WPX inside a draw_rect,
  get_size() * WPX (a texture drawn at 4 per texel), scale = Vector2.ONE * WPX.
A line that is a genuine non-cell use carries an opt-out comment with its reason:
  # 2x2-ok: <reason>        (GDScript)
  // 2x2-ok: <reason>       (shaders)
A known 4-px use that is waiting on other work (e.g. art baked at 4 px per texel, due a rebake) is marked
  # 2x2-debt: <reason>       (or // 2x2-debt: in a shader)
and is listed as a debt on every run (it does not fail the check, but it is never hidden).
A 4 x 4 Bayer MATRIX (B4[16], % 4, & 3) is the dither's pattern, not a pixel size, and is never matched; its cells
must still be 2 px.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GD_DIRS = ["world", "fx", "entities", "ui", "skills"]
SKIP = ("web", "cursemark", ".godot")

FOUR = r"4(?:\.0*)?\b"
PATTERNS = [
    # a 4-px snapping grid: floor(x / 4.0) * 4.0, (v / 4.0).floor() * 4.0, x / 4.0).ceil() * 4.0
    ("4-px snap", re.compile(r"/\s*" + FOUR + r"\s*\)\s*(?:\.\s*(?:floor|ceil|round)\s*\(\s*\))?\s*\*\s*" + FOUR)),
    # a shader's cell from the rect: rect_size / 4.0
    ("4-px cell from rect", re.compile(r"rect_size\s*/\s*" + FOUR)),
    # a cell index of 4 px: floor(px / 4.0), floor(UV * size / 4.0)
    ("4-px cell index", re.compile(r"floor\s*\([^()]*(?:\([^()]*\)[^()]*)*/\s*4\.0*\s*\)")),
    # cell / pixel constants of 4
    ("4-px cell constant", re.compile(
        r"(?i)\b(?:const\s+|var\s+)?(?:float\s+|int\s+)?(?:[a-z_]*cell[a-z_]*|[a-z_]*px|w|ap|grid|pix|pixel|cs)\s*:?=\s*"
        + FOUR + r"\s*(?:;|#|//|$)")),
    # a 4 x 4 pixel: Vector2(4, 4), Vector2(4.0, 4.0), vec2(4.0), vec2(4.0, 4.0)
    ("4 x 4 pixel", re.compile(r"\b(?:Vector2i?|vec2)\s*\(\s*" + FOUR + r"\s*(?:,\s*" + FOUR + r"\s*)?\)")),
    # a 4 x 4 rect: Rect2(x, y, 4, 4), Rect2i(x * 4, y * 4, 4, 4)
    ("4 x 4 rect", re.compile(r"\bRect2i?\s*\([^;]*,\s*" + FOUR + r"\s*,\s*" + FOUR + r"\s*\)")),
    # the web's world px as a size or a snap step: (WPX, WPX)
    ("WPX x WPX", re.compile(r"\bWPX\s*,\s*(?:Iso\.)?WPX\s*\)")),
    # the web's world px inside a draw_rect (a pixel drawn 4 px wide)
    ("WPX in draw_rect", re.compile(r"draw_rect\s*\(.*\bWPX\b")),
    # a texture drawn at 4 screen px per texel
    ("texture at 4 per texel", re.compile(r"get_size\s*\(\s*\)\s*\*\s*(?:Iso\.)?WPX\b")),
    ("sprite at 4 per texel", re.compile(r"\bscale\s*=\s*Vector2\.ONE\s*\*\s*(?:Iso\.)?WPX\b")),
]
OPT_OUT = re.compile(r"(?:#|//)\s*2x2-ok:\s*\S")
DEBT = re.compile(r"(?:#|//)\s*2x2-debt:\s*\S")


def files():
    out = sorted((ROOT / "shaders").glob("*.gdshader"))
    for d in GD_DIRS:
        out += sorted((ROOT / d).rglob("*.gd"))
    # never web/, .godot/ or the Cursemark fork (its paths, and its cm_ files: Cursemark's own art at its own pixel)
    return [f for f in out if not any(s in part.lower() for part in f.relative_to(ROOT).parts for s in SKIP)
            and not f.name.startswith("cm_")]


def strip_comment(line: str, shader: bool) -> str:
    # the code part of the line (a comment may mention "4 px" freely)
    mark = "//" if shader else "#"
    quote = ""
    for i, ch in enumerate(line):
        if quote:
            if ch == quote and line[i - 1] != "\\":
                quote = ""
        elif ch in "\"'":
            quote = ch
        elif line.startswith(mark, i):
            return line[:i]
    return line


def main() -> int:
    hits, debts = [], []
    for f in files():
        shader = f.suffix == ".gdshader"
        for n, line in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if OPT_OUT.search(line):
                continue
            code = strip_comment(line, shader)
            for name, rx in PATTERNS:
                if rx.search(code):
                    where = f"{f.relative_to(ROOT).as_posix()}:{n}"
                    if DEBT.search(line):
                        debts.append(f"debt: {where}: {line.split('2x2-debt:', 1)[1].strip()[:120]}")
                    else:
                        hits.append(f"{where}: {name}: {line.strip()[:140]}")
                    break
    for d in debts:
        print(d)
    for h in hits:
        print(h)
    if hits:
        print(f"2x2 check: {len(hits)} hit(s): a drawing cell of 4 px (MASTER_RULES 3.7); move it to the 2 x 2 grid, "
              "or mark a genuine non-cell use with '2x2-ok: <reason>'")
        return 1
    print("2x2 check: ok" + (f" ({len(debts)} known debt(s) listed above, each due its own fix)" if debts else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
