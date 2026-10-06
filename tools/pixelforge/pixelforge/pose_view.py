"""A clip's skeleton drawn frame by frame from the front (x, y) and the side (z, y): a quick look while posing keys.

    python -m pixelforge.pose_view CLIP OUT.png [--frames 0,3,5] [--every 1]
"""
from __future__ import annotations

import argparse

import numpy as np
from PIL import Image, ImageDraw

from .joints import load_joints

COL = {"L": (90, 170, 255), "R": (255, 120, 90), "C": (230, 225, 210)}


def draw(tracks, clip: str, frames: list[int], cell: int = 220) -> Image.Image:
    im = Image.new("RGB", (cell * len(frames), cell * 2 + 16), (24, 22, 26))
    d = ImageDraw.Draw(im)
    for c, f in enumerate(frames):
        p, r = tracks.pose(clip, f)
        for row, (ax, sign) in enumerate([(0, -1.0), (2, 1.0)]):   # front: x to screen-left mirrored; side: z
            ox, oy = c * cell + cell // 2, row * cell + cell - 10
            k = cell / 2.0
            def P(j):
                return (ox + sign * p[j][ax] * k, oy - p[j][1] * k)
            for j, pa in enumerate(tracks.parents):
                if pa < 0:
                    continue
                n = tracks.names[j]
                col = COL["L"] if n.endswith(".L") else COL["R"] if n.endswith(".R") else COL["C"]
                d.line([P(pa), P(j)], fill=col, width=3)
            # the right hand's facing: where a held weapon would point (the bone's +Y)
            h = tracks.index["hand.R"]
            tip = p[h] + r[h][:, 1] * 0.6
            q = (ox + sign * tip[ax] * k, oy - tip[1] * k)
            d.line([P(h), q], fill=(250, 230, 120), width=2)
            d.line([(ox - cell // 2 + 4, oy), (ox + cell // 2 - 4, oy)], fill=(60, 56, 60))
        d.text((c * cell + 6, cell * 2 + 2), f"{clip} {f}", fill=(200, 200, 200))
    return im


def main(argv=None) -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("clip")
    ap.add_argument("out")
    ap.add_argument("--frames", default="")
    ap.add_argument("--every", type=int, default=1)
    a = ap.parse_args(argv)
    tr = load_joints()
    n = tr.frames(a.clip)
    fr = [int(x) for x in a.frames.split(",")] if a.frames else list(range(0, n, a.every))
    draw(tr, a.clip, fr).save(a.out)
    print("wrote", a.out, len(fr), "frames of", n)


if __name__ == "__main__":
    main()
