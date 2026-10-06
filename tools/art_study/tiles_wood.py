"""The wood's ground tiles, crafted one at a time (Derek 2026-10-06: "Are you using tiles from in game? If not you need
to craft some to perfection first ... 1 at a time. And with enough variety to create the scene seamlessly and
beautiful").

The game's format (world/zone.gd, shaders/ground_iso.gdshader): each ground class is a seamless 320x160 texture,
anchored to the world in SCREEN space at 2 texels per world px (so one texture spans 160x80 world px, about 4.4
tiles across); two "main" variants are mixed by a slow noise; class borders are frayed. These are painted in whole
world pixels (160x80, doubled), every pattern periodic on that domain so the four edges meet.

Because the texture lies in screen space, the ground it shows is foreshortened 2:1: a round thing on the ground is an
ellipse twice as wide as tall, and the height field's slope in screen-y counts double.

Tile 1, main_0: the floor of a dying wood.
- FORM: a soft height field: drifts of fallen leaves a finger deep, shallow scoops between, a few stones' crowns
  breaking through; lit from the upper left (the painted standard's iso light), only enough to give form: the game
  lights it again with the hour and the lanterns.
- LITTER: leaves at their true size (a leaf is 2-4 world px), lying in clusters, each a small shape lit on its
  upper-left edge, in browns, rusts and dull olives, darker in the scoops where the old ones blacken;
- BETWEEN: dark humus showing in the gaps; twigs (thin, lit along one side); a few cups of moss; little enough that no
  one thing is remembered when the tile repeats.

  python tools/art_study/tiles_wood.py OUT_DIR
"""
import os
import sys
import numpy as np
from PIL import Image

TW, TH = 160, 80                                                       # world px; doubled to 320x160 for the game
YY, XX = np.mgrid[0:TH, 0:TW].astype(float)
B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16.0 + 1 / 32
BAY = B4[YY.astype(int) % 4, XX.astype(int) % 4]
_P = np.random.default_rng(71).random((4096,))


def hexc(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def ramp(*cs):
    return np.array([hexc(c) for c in cs])


def _h(ix, iy, seed):
    return _P[(ix * 73856093 ^ iy * 19349663 ^ seed * 83492791) % 4096]


def pnoise(x, y, cx, cy, seed=0):
    """value noise periodic on the tile: cx x cy lattice cells across it (screen-y squashed by the domain itself)"""
    fx, fy = x / TW * cx, y / TH * cy
    ix, iy = np.floor(fx).astype(int), np.floor(fy).astype(int)
    tx, ty = fx - ix, fy - iy
    u, v = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    def h(a, b):
        return _h(a % cx, b % cy, seed)
    return (h(ix, iy) * (1 - u) + h(ix + 1, iy) * u) * (1 - v) + (h(ix, iy + 1) * (1 - u) + h(ix + 1, iy + 1) * u) * v


def pfbm(x, y, c, seed=0):
    """periodic fbm; c lattice cells across the tile at the base octave (the tile is 2:1, so 2c x c)"""
    return (pnoise(x, y, 2 * c, c, seed) * 0.55 + pnoise(x, y, 4 * c, 2 * c, seed + 1) * 0.3
            + pnoise(x, y, 8 * c, 4 * c, seed + 2) * 0.15)


def wrapd(a, b, period):
    d = np.abs(a - b) % period
    return np.minimum(d, period - d)


def scatter(n, seed, rng=None):
    rr = np.random.default_rng(seed)
    return rr.uniform(0, TW, n), rr.uniform(0, TH, n), rr


SOIL = ramp("#0b090c", "#141013", "#1d1617", "#271d1b", "#33261f")
HUMUS = ramp("#140d0d", "#1e1412", "#2a1b16", "#37241b", "#452e21", "#553826")   # the dark between, one step under the leaves
LITTER = [ramp("#1a1010", "#2d1a14", "#45281a", "#5e3820", "#784a28", "#93602f"),     # rust-brown
          ramp("#17120e", "#2a2016", "#40301c", "#574224", "#6f552c", "#886a36"),     # dull ochre-brown
          ramp("#121310", "#1e2116", "#2c311b", "#3c4220", "#4e5427", "#62652e"),     # olive, the last green ones
          ramp("#140f10", "#221a19", "#332623", "#45342d", "#584238", "#6c5244")]     # grey-brown, old and dry
MOSS = ramp("#0c140f", "#142116", "#1e311b", "#2b4321", "#3b5527")
TWIG = ramp("#120d0e", "#251c1a", "#3e3029", "#5c4a3c")
STONE = ramp("#16161c", "#24232b", "#35333b", "#4a464c", "#625c5e")
LIGHT = np.array([-0.6, -0.5, 0.62])                                     # screen upper left (the y here is screen-down)
LIGHT = LIGHT / np.linalg.norm(LIGHT)


def pworley(x, y, n, seed):
    """periodic cells: distance to the nearest and second-nearest of n scattered points (wrapping), and its index"""
    px, py, _ = scatter(n, seed)
    f1 = np.full(x.shape, 1e9)
    f2 = np.full(x.shape, 1e9)
    idx = np.zeros(x.shape, int)
    for k in range(n):
        d = np.hypot(wrapd(x, px[k], TW), wrapd(y, py[k], TH) * 2.0)
        nearer = d < f1
        f2 = np.where(nearer, f1, np.minimum(f2, d))
        idx = np.where(nearer, k, idx)
        f1 = np.where(nearer, d, f1)
    return f1, f2, idx


def main_0(seed=0):
    """the floor of a dying wood: a carpet of fallen leaves in layers, the old dark ones under the new;
    returns the albedo and the height (for the light)"""
    from scipy import ndimage as nd
    # ---- form: drifts a finger deep and the scoops between
    hgt = (pfbm(XX, YY, 2, seed + 10) - 0.5) * 6.0 + (pfbm(XX, YY, 5, seed + 11) - 0.5) * 2.0
    hp_ = np.pad(hgt, 1, mode="wrap")
    gyf, gxf = np.gradient(hp_)
    nf = np.dstack([-gxf[1:-1, 1:-1], -gyf[1:-1, 1:-1] * 2.0, np.ones_like(hgt)])
    nf /= np.linalg.norm(nf, axis=2, keepdims=True)
    form = np.clip((nf * LIGHT).sum(2), 0, 1) - 0.62 + (hgt / 9.0) * 0.25          # lit faces and drift tops up, scoops down
    # ---- humus under all, dark
    hv = 0.38 + form * 0.8 + (BAY - 0.5) * 0.05
    img = HUMUS[np.clip((hv * len(HUMUS)).astype(int), 0, len(HUMUS) - 1)]
    layer = np.full((TH, TW), -1.0)
    # ---- the leaves, laid in order: the oldest first (darkest, blackening), the newest last (lighter, lit rims)
    famf = pfbm(XX, YY, 2, seed + 17)                                    # which leaves this part of the floor gets
    cover = np.clip(0.9 + (pfbm(XX, YY, 4, seed + 18) - 0.5) * 0.6, 0, 1)
    rr = np.random.default_rng(seed + 60)
    N = 3600
    lx, ly = rr.uniform(0, TW, N), rr.uniform(0, TH, N)
    ts = np.sort(rr.uniform(0, 1, N))                                    # the order of their falling
    for k in range(N):
        cx, cy, t = lx[k], ly[k], ts[k]
        ci, cj = int(cx) % TW, int(cy) % TH
        if rr.random() > cover[cj, ci]:
            continue
        # this leaf's kind: drawn from the local mix, so kinds mingle leaf by leaf (no hard regions)
        fm = famf[cj, ci]
        pr = np.array([0.45 + (0.5 - fm) * 0.5, 0.45, 0.03 + max(fm - 0.6, 0) * 0.5, 0.07])
        pr = np.clip(pr, 0.02, None)
        fam = rr.choice(4, p=pr / pr.sum())
        rp = LITTER[fam]
        ang = rr.uniform(0, np.pi)
        ln, wd = rr.uniform(2.5, 4.5), rr.uniform(1.2, 2.0)
        off = t * 0.08 + rr.uniform(-0.035, 0.035)
        for dy in range(-3, 4):
            for dx in range(-4, 5):
                px, py = int(cx) + dx, int(cy) + dy
                ux, uy = px + 0.5 - cx, (py + 0.5 - cy) * 2.0
                u = ux * np.cos(ang) + uy * np.sin(ang)
                w_ = -ux * np.sin(ang) + uy * np.cos(ang)
                if abs(u) > ln:
                    continue
                half = wd * max(1 - (u / ln) ** 2, 0) ** 0.6
                if abs(w_) > half:
                    continue
                pi, pj = px % TW, py % TH
                vv = 0.46 + form[pj, pi] * 0.85 + off
                if t > 0.8 and form[pj, pi] > 0.0 and (w_ < -half * 0.5 or u < -ln * 0.65):
                    vv += 0.14                                          # a new leaf's upper-left rim
                if abs(w_) < 0.35 and ln > 3.2:
                    vv -= 0.06                                          # the midrib
                img[pj, pi] = rp[int(np.clip(vv * len(rp), 0, len(rp) - 1))]
                layer[pj, pi] = t
    # each leaf lies a hair above the one beneath: where a newer leaf's edge meets an older, the older is shadowed
    lay = layer
    newer = np.roll(np.roll(lay, 1, axis=0), 1, axis=1)
    shad = (newer > lay + 0.04) & (lay >= 0)
    img[shad] = img[shad] * 0.72                                        # a crisp hair of shadow under each newer leaf
    hgt = hgt + np.clip(layer, 0, 1) * 0.35                              # the newest leaves stand a little proud
    # ---- twigs: few, long enough to read
    tx_, ty_, tr = scatter(6, seed + 70)
    for k in range(len(tx_)):
        ang = tr.uniform(-0.6, 0.6) + (0 if k % 2 else 0.9)
        ln = tr.uniform(9, 16)
        for i in range(int(ln * 1.5)):
            f = i / (ln * 1.5)
            px = int(tx_[k] + np.cos(ang) * ln * f) % TW
            py = int(ty_[k] + np.sin(ang) * ln * f * 0.5 + np.sin(f * 6) * 0.4) % TH
            img[py, px] = TWIG[1]
            if i % 3 != 2:
                img[(py - 1) % TH, px] = img[(py - 1) % TH, px] * 0.4 + TWIG[3] * 0.6
            img[(py + 1) % TH, px] = img[(py + 1) % TH, px] * 0.7
            hgt[py, px] += 0.3
    return np.clip(img, 0, 1), hgt


def lit_preview(alb, hgt, path, hero_at=(240, 150), t=0.0):
    """the tile laid across a game-size view (480 x 270 world px at 4 screen px each) under the game's lights:
    the cold moon from the upper left and the hero's lantern, both through the tile's own height; the light stepped
    as a painter mixes it"""
    GW, GH = 480, 270
    A = np.tile(alb, (GH // TH + 2, GW // TW + 2, 1))[:GH, :GW]
    Hh = np.tile(hgt, (GH // TH + 2, GW // TW + 2))[:GH, :GW]
    yy, xx = np.mgrid[0:GH, 0:GW].astype(float)
    n = np.zeros((GH, GW, 3))
    n[..., 2] = 1
    moon = np.full((GH, GW), 0.5)
    lpx, lpy = hero_at[0] + 8, hero_at[1]                                # the lantern over the ground at his side
    lz = 15.0                                                            # its height, px
    v = np.dstack([lpx - xx, (lpy - yy) * 2.0, np.full_like(xx, lz)])   # to the lamp (ground depth doubled)
    dist = np.linalg.norm(v, axis=2)
    lamp = np.clip((n * v).sum(2) / dist, 0, 1) ** 0.3 / (1 + (dist / 90.0) ** 2.2) * (1 + 0.05 * np.sin(t * 9))
    bay = np.tile(B4, (GH // 4 + 1, GW // 4 + 1))[:GH, :GW]
    m_step = np.full((GH, GW), 0.42)
    l_step = np.round(np.clip(lamp * 1.3 + (bay - 0.5) * 0.1, 0, 1.2) * 6) / 6
    moon_c = np.array([0.62, 0.68, 0.86])
    lamp_c = np.array([1.0, 0.72, 0.4])
    out = A * (m_step[..., None] * moon_c + l_step[..., None] * lamp_c * 1.25)
    # the hero for scale (38 px), his lantern
    hx, hy = hero_at
    u, w_ = xx - hx, hy - yy
    body = ((w_ >= 0) & (w_ < 32) & (np.abs(u) < 3.0 + (32 - w_) * 0.12)) | (np.hypot(u - 0.5, w_ - 34.5) < 3.4) | ((w_ > 24) & (w_ < 32) & (np.abs(u) < 6.2 - (w_ - 24) * 0.3))
    shadow = (np.hypot((u + 7) / 10.0, (w_ + 1) / 2.2) < 1) & ~body
    out[shadow] *= 0.55
    out[body] = hexc("#14111a")
    out[body & ~np.roll(body, 1, axis=1)] = hexc("#6a4a3a")
    lampm = np.hypot(u - 8, w_ - 15) < 1.6
    out[lampm] = hexc("#f4c070")
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST).save(path)


def save(img, path):
    Image.fromarray((img * 255).astype(np.uint8)).resize((TW * 2, TH * 2), Image.NEAREST).save(path)


def preview(img, path):
    """3 x 3 repeats at the game's zoom (4 screen px per world px), so the seams and the repetition show"""
    big = np.tile(img, (3, 3, 1))
    Image.fromarray((big * 255).astype(np.uint8)).resize((big.shape[1] * 4, big.shape[0] * 4), Image.NEAREST).save(path)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    t, h = main_0()
    save(t, os.path.join(out, "wood_main_0.webp"))
    preview(t, os.path.join(out, "wood_main_0_tiled.png"))
    lit_preview(t, h, os.path.join(out, "wood_main_0_lit.png"))
    print("saved")
