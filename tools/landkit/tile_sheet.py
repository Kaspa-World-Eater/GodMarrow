"""The floor surfaces as game tiles (Derek 2026-10-07: "show me just the tiles as assets").

Each surface is painted by landkit ground.py from world position, so a tile is a window onto the generator at some
place on the map: a 320 x 160 iso diamond (about 9 yards across at the game's 36 x 18 per yard), here under a plain
moon from the upper left, no scene, no objects. The last row shows neighbouring tiles of the same surface cut from
one stretch of ground: each different, and they meet without a seam.

  python tile_sheet.py OUT.png
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
import ground as g

TW, TH, KX, KY = 320, 160, 18.0, 9.0
MOON = np.array([-0.62, 0.22, 0.75]) / np.linalg.norm([-0.62, 0.22, 0.75])


def tile_world(ox, oy):
    sy, sx = np.mgrid[0:TH, 0:TW].astype(float) + 0.5
    a = (sx - TW / 2) / KX
    b = (sy - TH / 2) / KY
    x, y = (a + b) / 2 + ox, (b - a) / 2 + oy
    mask = np.abs(sx - TW / 2) / (TW / 2) + np.abs(sy - TH / 2) / (TH / 2) <= 1.0
    return x, y, mask


def lit(alb, k=0.78):
    return np.clip(alb * k, 0, 1)


def surface(kind, ox, oy):
    x, y, mask = tile_world(ox, oy)
    if kind == "ash":
        col = lit(g.ash(x, y, 4))
    elif kind == "paving":
        col, _, _ = g.paving_poly(x, y, seed=2, moon=MOON)
    elif kind == "way":
        col, _, _ = g.paving_poly(x, y, seed=2, path=np.ones_like(x), moon=MOON)
    elif kind == "flesh":
        f, wet = g.flesh(x, y, seed=1, moon=MOON)
        col = lit(f, 0.9)
        col[wet] = np.minimum(col[wet] * 1.45 + 0.05, 1)
    elif kind == "cracked":                                               # the god coming up through the floor's cracks
        pav, _, _ = g.paving_poly(x, y, seed=2, moon=MOON)
        f, _ = g.flesh(x, y, seed=1, moon=MOON)
        wx = x + (g.fbm(x * 0.35 + 3, y * 0.35) - 0.5) * 1.6
        wy = y + (g.fbm(x * 0.35, y * 0.35 + 7) - 0.5) * 1.6
        c1, c2, _, _, _ = g.cells(wx, wy, 2.8, 91, 1.0)
        crack = (c2 - c1) * 0.5
        width = 0.1 + np.clip(g.fbm(x * 0.2 + 11, y * 0.2) - 0.45, 0, 1) * 1.6
        m = crack < width
        col = np.where(m[..., None], lit(f, 0.9), pav)
        rim = (crack >= width) & (crack < width + 0.08)
        col = np.where(rim[..., None], col * 0.55, col)
    elif kind == "under_ash":                                             # the paving running out under the ash
        pav, _, fj = g.paving_poly(x, y, seed=2, moon=MOON)
        a_ = lit(g.ash(x, y, 4))
        t = (x - ox + y - oy) / 9.0 + 0.5 + (g.fbm(x * 0.45, y * 0.45) - 0.5) * 0.9
        cover = np.clip((t - 0.25) * 1.6, 0, 1)
        cover = cover * cover * (3 - 2 * cover)
        cov = np.where(fj, np.clip(cover * 2.2, 0, 1), np.clip((cover - 0.15) * 1.4, 0, 1))
        col = a_ * cov[..., None] + pav * (1 - cov[..., None])
    out = np.zeros((TH, TW, 4))
    out[..., :3] = col
    out[..., 3] = mask
    return out


def main(o):
    rows = [[("ash", "Ash of the Moor"), ("paving", "Basalt paving"), ("way", "The old processional way")],
            [("cracked", "The god through the cracks"), ("flesh", "The god's flesh"), ("under_ash", "Paving under drifted ash")]]
    S = 3
    pad, lab = 24, 30
    W_ = (TW * S + pad) * 3 + pad
    H_ = (TH * S + pad + lab) * 2 + TH * S * 3 + pad * 2 + lab
    sheet = Image.new("RGB", (W_, H_), (12, 10, 13))
    d = ImageDraw.Draw(sheet)

    def put(img, cx, cy):
        im = Image.fromarray((img * 255).astype(np.uint8), "RGBA").resize((TW * S, TH * S), Image.NEAREST)
        sheet.paste(im, (cx, cy), im)

    for r, row in enumerate(rows):
        for c, (k, name) in enumerate(row):
            x0 = pad + c * (TW * S + pad)
            y0 = pad + r * (TH * S + pad + lab)
            d.text((x0, y0), name, fill=(228, 217, 195))
            put(surface(k, 40.0 + c * 31, 40.0 + r * 29), x0, y0 + lab)
    # neighbours: one stretch of paving cut into adjacent tiles, laid back together as the game would lay them
    y0 = pad + 2 * (TH * S + pad + lab)
    d.text((pad, y0), "Neighbouring paving tiles from one stretch of ground: each different, no seam", fill=(228, 217, 195))
    half_w, half_h = TW * S / 2, TH * S / 2
    step = TW / 2 / KX                                                    # one tile along an iso axis, in yards
    for (di, dj) in ((0, 0), (1, 0), (0, 1), (1, 1)):
        wx, wy = 80.0 + step * di, 80.0 + step * dj
        cx = int(W_ / 2 - half_w + (di - dj) * half_w)
        cy = int(y0 + lab + (di + dj) * half_h)
        put(surface("paving", wx, wy), cx, cy)
    sheet.save(o)
    print("saved", o)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tiles_sheet.png")
