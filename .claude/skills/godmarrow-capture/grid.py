"""Stitch captures into one sheet to look at (or to show Derek): a grid of cells, each cropped and sized the same.

  tools/pixelforge/.venv/Scripts/python .claude/skills/godmarrow-capture/grid.py OUT.png IMG [IMG ...]
      [--cols N] [--crop X0,Y0,X1,Y1] [--width W | --scale S] [--nearest] [--label] [--bg R,G,B]

  --cols N      cells per row (default: up to 4, fewer for fewer images)
  --crop        the same box cut from every image, in its own pixels (a game capture is 1600 x 900)
  --width W     each cell scaled to W px wide (aspect kept); --scale S multiplies instead
  --nearest     nearest-neighbour scaling: hard pixels, for judging the 2 x 2 grid and the dither
  --label       the file's name written in the cell's corner
  --bg          the colour behind cells of different sizes (default 0,0,0)

Paths are Windows paths (C:/...): this runs in the Windows venv Python, which does not read Git Bash's /c/... form.
Images are taken in the order given; a shell glob sorts live_10 before live_2, so name strips with --shot_n under 10
or list the files in order.
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("images", nargs="+")
    ap.add_argument("--cols", type=int, default=0)
    ap.add_argument("--crop", default="")
    ap.add_argument("--width", type=int, default=0)
    ap.add_argument("--scale", type=float, default=0.0)
    ap.add_argument("--nearest", action="store_true")
    ap.add_argument("--label", action="store_true")
    ap.add_argument("--bg", default="0,0,0")
    a = ap.parse_args()
    box = tuple(int(v) for v in a.crop.split(",")) if a.crop else None
    if box is not None and len(box) != 4:
        sys.exit("--crop wants X0,Y0,X1,Y1")
    rs = Image.NEAREST if a.nearest else Image.LANCZOS
    cells = []
    for p in a.images:
        try:
            im = Image.open(p).convert("RGBA")
        except OSError as e:
            print("skipped", p, e)
            continue
        if box:
            im = im.crop(box)
        if a.width:
            k = a.width / im.width
            im = im.resize((a.width, max(1, round(im.height * k))), rs)
        elif a.scale:
            im = im.resize((max(1, round(im.width * a.scale)), max(1, round(im.height * a.scale))), rs)
        if a.label:
            d = ImageDraw.Draw(im)
            name = os.path.basename(p)
            d.rectangle((0, 0, 7 * len(name) + 8, 16), fill=(0, 0, 0, 200))
            d.text((4, 2), name, fill=(235, 225, 200, 255))
        cells.append(im)
    if not cells:
        sys.exit("no images")
    cols = a.cols or min(4, len(cells))
    rows = (len(cells) + cols - 1) // cols
    cw = max(c.width for c in cells)
    ch = max(c.height for c in cells)
    bg = tuple(int(v) for v in a.bg.split(",")) + (255,)
    sheet = Image.new("RGBA", (cw * cols, ch * rows), bg)
    for i, c in enumerate(cells):
        sheet.alpha_composite(c, ((i % cols) * cw, (i // cols) * ch))
    sheet.convert("RGB").save(a.out)
    print("%s: %d cells, %d x %d" % (a.out, len(cells), sheet.width, sheet.height))


if __name__ == "__main__":
    main()
