"""Does the baked bog look like where you can walk? (Derek: "it makes sense visually".) For a seed baked by
bog_bake.py, every tile of the exported zone (bog_export.py) is looked up in the painted ground where the game draws it
(lifted onto its floor, as core/iso.gd lifts a body): a walkable tile must show ground (bone, peat, boards, stone) at
one of its four half-yard points, and a tile of open water must show water at its middle. The misses are counted and
drawn over the whole zone (a thing standing in the water, a drowned trunk or a giant rib, is neither), which is written out at half the engine's scale with the walkable tiles marked.

  python tools/worldgen/bog_seen.py SEED [OUT.png]
"""
import os
import sys
import json
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bog_export                            # noqa: E402
import bog_bake as bb                        # noqa: E402


def compose(d, idx):
    """the whole ground at the engine's scale, alpha kept (255 land, 254 water, 0 outside)"""
    x0, y0 = idx["origin"]
    cw, ch = idx["chunk"]
    na = max(c["a"] for c in idx["chunks"]) + 1
    nb = max(c["b"] for c in idx["chunks"]) + 1
    big = np.zeros((nb * ch, na * cw, 4), np.uint8)
    for c in idx["chunks"]:
        im = np.array(Image.open(os.path.join(d, c["file"])).convert("RGBA"))
        big[c["b"] * ch:(c["b"] + 1) * ch, c["a"] * cw:(c["a"] + 1) * cw] = im
    up = np.zeros(big.shape[:2], bool)                                       # what stands up (the sorted bands)
    for c in idx["chunks"]:
        if not c.get("up"):
            continue
        at = np.array(Image.open(os.path.join(d, c["up"])).convert("RGBA"))
        for b in c["bands"]:
            m = at[b["ay"]:b["ay"] + b["h"], :b["w"], 3] > 127
            r0, c0 = c["b"] * ch + b["y"], c["a"] * cw + b["x"]
            up[r0:r0 + b["h"], c0:c0 + b["w"]] |= m
    big[up & (big[..., 3] == 255), 3] = 253                                   # a thing standing there, not ground
    return big, x0, y0


def seen(seed, out=None):
    d = os.path.join(bb.OUT_ROOT, "sunken_bog_s%d" % seed)
    idx = json.load(open(os.path.join(d, "index.json")))
    big, x0, y0 = compose(d, idx)
    hz = idx["height"]
    hg = np.array(Image.open(os.path.join(d, hz["file"]))).astype(float) * hz["k"] + hz["z0"]
    import tempfile
    _, N, Z, grid = bog_export.export(seed, tempfile.mkdtemp())
    H, W = grid.shape
    walk = ~np.isin(grid, list(bog_export.SOLID))

    def alpha_at(x, y):
        z = hg[int(np.clip(round(y / 0.5), 0, hg.shape[0] - 1)), int(np.clip(round(x / 0.5), 0, hg.shape[1] - 1))]
        ex = (x - y) * bb.KX - x0
        ey = (x + y) * bb.KY - z * bb.KZ - y0
        i, j = int(ey), int(ex)
        if not (0 <= i < big.shape[0] and 0 <= j < big.shape[1]):
            return 0
        return big[i, j, 3]

    miss_walk, miss_water = [], []
    n_walk = n_water = 0
    for ty in range(H):
        for tx in range(W):
            if walk[ty, tx]:
                n_walk += 1
                pts = [(tx + 0.25, ty + 0.25), (tx + 0.75, ty + 0.25), (tx + 0.25, ty + 0.75), (tx + 0.75, ty + 0.75)]
                if not any(alpha_at(*p) in (253, 255) for p in pts):
                    miss_walk.append((tx, ty))
            elif grid[ty, tx] == 4:
                n_water += 1
                if alpha_at(tx + 0.5, ty + 0.5) == 255:
                    miss_water.append((tx, ty))
    res = dict(seed=seed, walkable=n_walk, walkable_shown_as_water=len(miss_walk),
               water=n_water, water_shown_as_ground=len(miss_water),
               walk_ok=round(1 - len(miss_walk) / max(n_walk, 1), 4), water_ok=round(1 - len(miss_water) / max(n_water, 1), 4))
    if out:
        img = Image.fromarray(big[..., :3].copy())
        dr = ImageDraw.Draw(img)

        def at(x, y):
            z = hg[int(np.clip(round(y / 0.5), 0, hg.shape[0] - 1)), int(np.clip(round(x / 0.5), 0, hg.shape[1] - 1))]
            return (x - y) * bb.KX - x0, (x + y) * bb.KY - z * bb.KZ - y0
        for ty in range(0, H):
            for tx in range(0, W):
                if walk[ty, tx]:
                    sx, sy = at(tx + 0.5, ty + 0.5)
                    dr.point((sx, sy), fill=(90, 200, 220))
        for (tx, ty) in miss_walk:
            sx, sy = at(tx + 0.5, ty + 0.5)
            dr.rectangle((sx - 2, sy - 1, sx + 2, sy + 1), outline=(255, 60, 40))
        for (tx, ty) in miss_water:
            sx, sy = at(tx + 0.5, ty + 0.5)
            dr.rectangle((sx - 2, sy - 1, sx + 2, sy + 1), outline=(255, 220, 40))
        s0 = N["markers"]["start"]
        sx, sy = at(s0["x"], s0["y"])
        dr.ellipse((sx - 6, sy - 3, sx + 6, sy + 3), outline=(255, 255, 255))
        img.save(out)
        img.resize((img.width // 2, img.height // 2), Image.LANCZOS).save(out.replace(".png", "_half.png"))
    return res


if __name__ == "__main__":
    r = seen(int(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else None)
    print(json.dumps(r))
