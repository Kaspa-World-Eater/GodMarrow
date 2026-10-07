"""The wood's scatter and living layers, crafted piece by piece (Derek 2026-10-06: "Add bare patches and sticks and
stones and grass clumps ... like a real forest floor"; "the environment ... needs a ton of work" to feel alive).

Scatter pieces are sprites the zone lays over the ground (world/zone.gd _scatter: still litter in one batch, grass in
its own layer with sway frames), so they never repeat with the tiles.

1. GRASS CLUMPS (this pass): tired grass of a dying wood. Each blade a tapered stroke from a dark pooled root to a
   lit tip (the meadow's method), the clump tallest in its heart and fanning out; living blades blue-green at the root
   and yellow-green at the tip, a third of them dead straw; blades leaning toward the upper-left light take a step of
   light. Three sway frames (the engine's format), the tips moving most.
Living layers in the preview: grass swaying in a wave that rolls with the wind; leaves skittering across the floor in
the gusts, tumbling; leaves drifting down from the canopy with their shadows closing on them as they land; spores
turning in the lantern's light; the lantern breathing.

  python tools/art_study/scatter_wood.py OUT_DIR
"""
import os
import sys
import numpy as np
from PIL import Image
import tiles_wood as tw
from litter_stamps import LEAVES

hexc, ramp = tw.hexc, tw.ramp
BLADE = ramp("#0c1414", "#142219", "#1f331d", "#2f4722", "#435c28", "#5e7330", "#7c8a3c")      # living: blue-green to warm
STRAW = ramp("#1a1412", "#2e241a", "#4a3a24", "#68552f", "#88723c", "#a48d4c")                 # dead blades


def grass_clump(seed, frames=3):
    """one clump of grass as `frames` RGBA sprites (sway -1, 0, +1); its root at the bottom centre"""
    rr = np.random.default_rng(seed)
    W, H = 30, 22
    rx, ry = W // 2, H - 3
    nb = rr.integers(14, 26)
    blades = []
    for _ in range(nb):
        x0 = rx + rr.normal(0, 3.0)
        h = rr.uniform(6, 16) * np.exp(-((x0 - rx) / 6.0) ** 2) + 2
        lean = (x0 - rx) * 0.09 + rr.normal(0.1, 0.18)
        dead = rr.random() < 0.33
        blades.append((x0, h, lean, dead, rr.uniform(0.6, 1.4)))
    blades.sort(key=lambda b: b[1])                                       # short ones behind... drawn first
    out = []
    for f in range(frames):
        sway = (f - (frames - 1) / 2) * 0.22
        img = np.zeros((H, W, 4))
        # the pooled dark at the root: the ground darkened where the clump stands
        yy, xx = np.mgrid[0:H, 0:W]
        base = ((xx - rx) / 6.5) ** 2 + ((yy - ry - 0.5) / 1.6) ** 2 < 1
        img[base] = [0, 0, 0, 0.45]
        for (x0, h, lean, dead, flex) in blades:
            rp = STRAW if dead else BLADE
            px, py = x0, float(ry)
            n = int(h)
            for k in range(1, n + 1):
                t = k / h
                x = x0 + (lean + sway * flex) * h * t * t
                y = ry - k
                lit = (lean + sway * flex) < 0.05                          # leaning toward the upper-left light
                tone = int(np.clip(t * (len(rp) - 1.5) + (1 if lit else 0), 0, len(rp) - 1))
                for (ix, iy) in _line(px, py, x, y):
                    if 0 <= ix < W and 0 <= iy < H:
                        img[iy, ix] = [*rp[tone], 1.0]
                        if t < 0.3 and not dead and 0 <= ix + 1 < W:          # the blade's foot is wider
                            img[iy, ix + 1] = [*rp[max(tone - 1, 0)], 1.0]
                px, py = x, y
        out.append(img)
    return out


def _line(x0, y0, x1, y1):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    return [(int(round(x0 + (x1 - x0) * k / n)), int(round(y0 + (y1 - y0) * k / n))) for k in range(1, n + 1)]


def paste(dst, spr, x, y, k_light):
    """the sprite with its root at (x, y), lit by the light there (k_light: rgb multiplier)"""
    h, w = spr.shape[:2]
    x0, y0 = int(x) - w // 2, int(y) - h + 3
    for j in range(h):
        yy = y0 + j
        if not (0 <= yy < dst.shape[0]):
            continue
        for i in range(w):
            xx = x0 + i
            a = spr[j, i, 3]
            if a <= 0 or not (0 <= xx < dst.shape[1]):
                continue
            if spr[j, i, :3].sum() == 0:                                  # the root's pool: darken the ground
                dst[yy, xx] *= (1 - a)
            else:
                dst[yy, xx] = spr[j, i, :3] * k_light
    return dst


def lights(GW, GH, hero, t):
    """the moon (flat, cold) and the lantern's stepped, breathing pool: an rgb multiplier per pixel"""
    yy, xx = np.mgrid[0:GH, 0:GW].astype(float)
    lpx, lpy = hero[0] + 8, hero[1]
    breath = 1 + 0.05 * np.sin(t * 2 * np.pi * 2) + 0.03 * np.sin(t * 2 * np.pi * 5 + 1)
    dist = np.hypot(lpx - xx, (lpy - yy) * 2.0)
    lamp = 1 / (1 + (dist / (90.0 * breath)) ** 2.2)
    bay = np.tile(tw.B4, (GH // 4 + 1, GW // 4 + 1))[:GH, :GW]
    step = np.round(np.clip(lamp * 1.3 + (bay - 0.5) * 0.1, 0, 1.2) * 6) / 6
    return 0.42 * np.array([0.62, 0.68, 0.86]) + step[..., None] * np.array([1.0, 0.72, 0.4]) * 1.25


def leaf_sprite(st, rp, base=4):
    """a litter stamp as an RGBA sprite (for leaves in the air and blowing)"""
    h, w = len(st), len(st[0])
    img = np.zeros((h, w, 4))
    for j, row in enumerate(st):
        for i, ch in enumerate(row):
            if ch in ".S":
                continue
            off = {"H": 2, "L": 1, "B": 0, "D": -1, "P": 3, "V": 1}[ch]
            img[j, i] = [*rp[int(np.clip(base + off, 0, len(rp) - 1))], 1.0]
    return img


def scene(out_dir, n_frames=24):
    os.makedirs(out_dir, exist_ok=True)
    mains = [tw.main_0(seed=k * 101)[0] for k in range(4)]
    dirt, _ = tw.dirt_0()
    GW, GH = 480, 270
    big = tw.compose(mains, dirt, GW=GW + 240, GH=GH + 160)
    ground = big[80:80 + GH, 120:120 + GW]
    rr = np.random.default_rng(5)
    clumps = [grass_clump(s) for s in range(8)]
    hero = (240, 150)
    # where the grass stands: drifts of clumps, never on the hero, more at the bare earth's edges
    spots = []
    for _ in range(9):
        cx, cy = rr.uniform(20, GW - 20), rr.uniform(20, GH - 10)
        for _ in range(rr.integers(2, 6)):
            x, y = cx + rr.normal(0, 18), cy + rr.normal(0, 8)
            if np.hypot(x - hero[0], (y - hero[1]) * 2) < 30 or not (5 < x < GW - 5 and 12 < y < GH - 2):
                continue
            spots.append((x, y, rr.integers(0, len(clumps))))
    spots.sort(key=lambda s: s[1])
    # leaves blowing across in the gusts, and leaves falling from the canopy
    blow = [(rr.uniform(0, GW), rr.uniform(0, GH), rr.uniform(2.0, 4.5), rr.integers(0, len(LEAVES)), rr.integers(0, 2)) for _ in range(9)]
    fall = [(rr.uniform(40, GW - 40), rr.uniform(20, GH - 20), rr.uniform(0, 1), rr.integers(0, len(LEAVES)), rr.integers(0, 2)) for _ in range(5)]
    motes = [(rr.uniform(-60, 60), rr.uniform(-40, 30), rr.uniform(0, 1), rr.uniform(0.6, 1.4)) for _ in range(16)]
    frames = []
    for fi in range(n_frames):
        t = fi / n_frames
        L = lights(GW, GH, hero, t)
        img = ground.copy()
        # leaves skittering along the ground with the wind, tumbling (each step a different stamp)
        for (x0, y0, sp, si, fam) in blow:
            x = (x0 + sp * fi * 3) % (GW + 20) - 10
            y = y0 + np.sin(fi * 0.7 + x0) * 2
            st = LEAVES[(si + fi // 2) % len(LEAVES)]
            spr = leaf_sprite(st, tw.LITTER[fam], 4)
            paste(img, spr, x, y, 1.0)
        # grass: a wave rolls across with the wind
        for (x, y, ci) in spots:
            wave = np.sin(2 * np.pi * t * 2 - x * 0.025)
            f = 0 if wave < -0.35 else (2 if wave > 0.35 else 1)
            paste(img, clumps[ci][f], x, y, 1.0)
        img = img * L
        # the hero, his shadow, his lantern
        img = hero_draw(img, hero, t)
        # leaves falling from the canopy: drifting side to side, their shadows closing on them as they come down
        for (x0, yl, ph, si, fam) in fall:
            u = (t + ph) % 1.0
            hgt = (1 - u) * 90
            x = x0 + np.sin(u * 9 + ph * 6) * 8
            sy = yl
            img[int(sy) % GH, int(x) % GW] *= 0.6
            spr = leaf_sprite(LEAVES[(si + int(u * 12)) % len(LEAVES)], tw.LITTER[fam], 5)
            k = L[int(np.clip(sy, 0, GH - 1)), int(np.clip(x, 0, GW - 1))]
            paste(img, spr, x, sy - hgt, k)
        # spores turning in the lantern light
        for (dx, dy, ph, sp) in motes:
            u = (t * sp + ph) % 1.0
            mx = hero[0] + 8 + dx + np.sin(u * 6.28 + ph * 9) * 5
            my = hero[1] - 15 + dy - u * 30
            if 0 <= int(mx) < GW and 0 <= int(my) < GH and (fi + int(ph * 10)) % 5 != 0:
                img[int(my), int(mx)] = np.minimum(img[int(my), int(mx)] * 0.3 + np.array([1.0, 0.85, 0.55]) * 0.7, 1)
        frames.append(Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST))
    frames[0].save(os.path.join(out_dir, "wood_alive.webp"), save_all=True, append_images=frames[1:], duration=110, loop=0, lossless=True)
    frames[0].save(os.path.join(out_dir, "wood_alive.png"))
    # the clumps alone, large, on the ground
    sheet = np.zeros((26, 8 * 32, 3)) + ground[0:26, 0:8 * 32]
    for i, c in enumerate(clumps):
        paste(sheet, c[1], i * 32 + 16, 24, 1.0)
    Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8)).resize((sheet.shape[1] * 6, sheet.shape[0] * 6), Image.NEAREST).save(os.path.join(out_dir, "grass_sheet.png"))


def hero_draw(img, hero, t):
    GH, GW = img.shape[:2]
    yy, xx = np.mgrid[0:GH, 0:GW].astype(float)
    hx, hy = hero
    u, w_ = xx - hx, hy - yy
    body = ((w_ >= 0) & (w_ < 32) & (np.abs(u) < 3.0 + (32 - w_) * 0.12)) | (np.hypot(u - 0.5, w_ - 34.5) < 3.4) | ((w_ > 24) & (w_ < 32) & (np.abs(u) < 6.2 - (w_ - 24) * 0.3))
    shadow = (np.hypot((u + 7) / 10.0, (w_ + 1) / 2.2) < 1) & ~body
    img[shadow] *= 0.55
    img[body] = hexc("#14111a")
    img[body & ~np.roll(body, 1, axis=1)] = hexc("#6a4a3a")
    img[np.hypot(u - 8, w_ - 15) < 1.6] = hexc("#f4c070")
    return img


if __name__ == "__main__":
    scene(sys.argv[1] if len(sys.argv) > 1 else ".")
    print("saved")
