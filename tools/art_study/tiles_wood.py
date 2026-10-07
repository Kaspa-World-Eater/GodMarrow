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
LITTER = [ramp("#130d16", "#22141c", "#3a1f1f", "#573020", "#774524", "#97602c", "#b47e3a", "#c99a50"),   # rust
          ramp("#110f17", "#1f1a1f", "#332a25", "#4b3d2a", "#655231", "#80693b", "#9b8247", "#b29a5a"),   # brown
          ramp("#0e1014", "#191d1a", "#262d1d", "#363f22", "#4a5228", "#5f6530", "#767a3a", "#8c8e48"),   # olive
          ramp("#121018", "#201b22", "#30282b", "#433833", "#574a40", "#6c5c4e", "#82705e", "#98856e")]   # old grey
MOSS = ramp("#0c140f", "#142116", "#1e311b", "#2b4321", "#3b5527")
TWIG = ramp("#120d0e", "#251c1a", "#3e3029", "#5c4a3c")
EARTH = ramp("#16121a", "#211b20", "#2d2427", "#3a2f2e", "#483a35", "#58473f", "#6a5649")   # cooler, greyer than the leaves
ROOT = ramp("#1a1210", "#3a2a20", "#5a4430")
PEBBLE = ramp("#1c1b20", "#2e2c31", "#433f43", "#5b5556", "#77706c")
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
    """the floor of a dying wood, designed as the dune was: big form in clean tones first, then leaves drawn one by
    one (hand-made stamps, litter_stamps.py) where the light falls on them, sparse and soft in the shade.
    Returns the albedo and the height."""
    from litter_stamps import LEAVES, TWIGS
    rr = np.random.default_rng(seed + 300)
    # ---- 1. the form: mounds of litter over roots and the hollows between, 20-60 px across
    hgt = (pfbm(XX, YY, 2, seed + 10) - 0.5) * 7.0 + (pfbm(XX, YY, 4, seed + 11) - 0.5) * 2.5
    hp_ = np.pad(hgt, 1, mode="wrap")
    gyf, gxf = np.gradient(hp_)
    nf = np.dstack([-gxf[1:-1, 1:-1], -gyf[1:-1, 1:-1] * 2.0, np.ones_like(hgt)])
    nf /= np.linalg.norm(nf, axis=2, keepdims=True)
    lit = np.clip((nf * LIGHT).sum(2), 0, 1)
    form = (lit - 0.62) * 0.45 + (hgt / 7.0) * 0.32                      # read by height more than slope (a high moon)
    # four clean tone groups across the form (dither only where one meets the next)
    lf1, lf2, lid = pworley(XX, YY, 900, seed + 31)                     # the old leaves underneath, a cell each
    leafjit = (_P[(lid * 31 + seed) % 4096] - 0.5) * 0.5                # each old leaf a little lighter or darker
    tone = np.clip(np.round((0.5 + form * 1.6) * 4 + leafjit + (BAY - 0.5) * 0.2), 0, 4).astype(int)   # 0..4
    base_i = np.array([1, 2, 3, 3, 4])[tone]                              # its index on a litter ramp
    # the ground's colour: a smooth blend between rust and brown (never hard regions), a touch of olive in the damp
    famf = pfbm(XX, YY, 2, seed + 17)
    wr = np.clip((famf - 0.35) / 0.3, 0, 1)
    wr = np.round(wr * 2 + (BAY - 0.5) * 0.3) / 2
    img = LITTER[0][base_i] * (1 - wr[..., None]) + LITTER[1][base_i] * wr[..., None]
    # the old leaves' edges: a dark seam where one meets the next, its upper-left rim a touch lit
    seam = (lf2 - lf1) < 0.6
    img[seam] = img[seam] * 0.8
    rimo = ((lf2 - lf1) > 0.6) & ((lf2 - lf1) < 1.3) & (tone >= 2) & (_P[(lid * 17) % 4096] > 0.5)
    img[rimo] = np.minimum(img[rimo] * 1.08, 1)
    # the hollows: humus showing, a clean dark shape
    hollow = (hgt < -2.4) & (pnoise(XX, YY, 40, 20, seed + 19) > 0.5)
    img[hollow] = HUMUS[np.clip(base_i[hollow] + 1, 0, len(HUMUS) - 1)]
    # ---- 2. the leaves, drawn one by one, spaced so each reads; dense and crisp on the lit slopes, sparse in shade
    taken = np.zeros((TH, TW), bool)
    placed = 0
    for _ in range(9000):
        x, y = rr.integers(0, TW), rr.integers(0, TH)
        g = tone[y, x]
        if rr.random() > [0.02, 0.04, 0.08, 0.13, 0.16][g]:
            continue
        wts = np.array([1, 1, 1, 0.7, 0.8, 0.6, 0.6, 0.7, 1.6, 1.4, 0.08, 1.2])          # oak and folded leaves most; a skeleton rarely
        st = LEAVES[rr.choice(len(LEAVES), p=wts / wts.sum())]
        if rr.random() < 0.5:
            st = [row[::-1].replace("H", "h").replace("D", "H").replace("h", "D") for row in st]   # mirrored: light still from the left
            st = [row.replace("H", "L") for row in st]
        h_, w_ = len(st), len(st[0])
        ys = [(y + j) % TH for j in range(h_)]
        xs = [(x + i) % TW for i in range(w_)]
        if taken[np.ix_([(y + j) % TH for j in range(-1, h_ + 1)], [(x + i) % TW for i in range(-1, w_ + 1)])].sum() > 0:
            continue
        fam = 0 if rr.random() > famf[y, x] else 1
        if rr.random() < 0.08:
            fam = 2 if rr.random() < 0.5 else 3
        rp = LITTER[fam]
        soft = g <= 1                                                     # in shade: the lights held down
        for j, row in enumerate(st):
            for i, ch in enumerate(row):
                if ch == ".":
                    continue
                py, px = ys[j], xs[i]
                if ch == "S":
                    if not taken[py, px]:
                        img[py, px] = img[py, px] * 0.72
                    continue
                if ch == "V":
                    img[py, px] = LITTER[3][int(np.clip(base_i[py, px] + 1, 0, 7))]   # a skeleton's veins, grey
                    taken[py, px] = True
                    continue
                off = {"H": 2, "L": 1, "B": 0, "D": -1, "P": 3, "V": 1}[ch]
                if soft:
                    off = min(off, 0) if off > 0 else off
                img[py, px] = rp[int(np.clip(base_i[py, px] + off, 0, len(rp) - 1))]
                taken[py, px] = True
        placed += 1
    # ---- 3. a few twigs, the same way
    for _ in range(3):
        st = TWIGS[rr.integers(0, len(TWIGS))]
        x, y = rr.integers(0, TW), rr.integers(0, TH)
        for j, row in enumerate(st):
            for i, ch in enumerate(row):
                if ch == ".":
                    continue
                py, px = (y + j) % TH, (x + i) % TW
                if ch == "S":
                    img[py, px] = img[py, px] * 0.65
                else:
                    img[py, px] = TWIG[{"L": 3, "B": 1}[ch]]
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
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST).save(path, **({"lossless": True} if path.endswith(".webp") else {}))


def dirt_0(seed=0):
    """bare earth where the litter has been cleared: dark damp soil, fine roots running through it, small stones
    pressed in, a few leaves; its own gentle form"""
    from scipy import ndimage as nd
    hgt = (pfbm(XX, YY, 3, seed + 210) - 0.5) * 5.0 + (pfbm(XX, YY, 9, seed + 211) - 0.5) * 1.5
    hp_ = np.pad(hgt, 1, mode="wrap")
    gyf, gxf = np.gradient(hp_)
    nf = np.dstack([-gxf[1:-1, 1:-1], -gyf[1:-1, 1:-1] * 2.0, np.ones_like(hgt)])
    nf /= np.linalg.norm(nf, axis=2, keepdims=True)
    form = np.clip((nf * LIGHT).sum(2), 0, 1) - 0.62 + (hgt / 5.0) * 0.2
    crumb = (pnoise(XX, YY, 80, 40, seed + 212) - 0.5) * 0.06                 # the soil's crumb
    v = 0.5 + form * 0.8 + crumb + (BAY - 0.5) * 0.05
    img = EARTH[np.clip((v * len(EARTH)).astype(int), 0, len(EARTH) - 1)]
    # fine roots: thin, wandering, half-buried, catching the light on their upper side
    rr = np.random.default_rng(seed + 220)
    for k in range(7):
        x, y = rr.uniform(0, TW), rr.uniform(0, TH)
        ang = rr.uniform(0, 2 * np.pi)
        for i in range(rr.integers(20, 45)):
            ang += rr.normal(0, 0.25)
            x, y = x + np.cos(ang), y + np.sin(ang) * 0.5
            px, py = int(x) % TW, int(y) % TH
            img[py, px] = ROOT[1]
            if i % 2 == 0:
                img[(py - 1) % TH, px] = img[(py - 1) % TH, px] * 0.5 + ROOT[2] * 0.5
    # pebbles pressed into the soil: a lit crown, a dark crescent under
    for k in range(26):
        x, y = rr.uniform(0, TW), rr.uniform(0, TH)
        rx, ry = rr.uniform(0.8, 1.8), rr.uniform(0.5, 0.9)
        tone = rr.uniform(0.3, 0.6)
        for dy in range(-2, 3):
            for dx in range(-3, 4):
                px, py = int(x) + dx, int(y) + dy
                q = ((px + 0.5 - x) / rx) ** 2 + ((py + 0.5 - y) / ry) ** 2
                if q < 1:
                    up = (px + 0.5 - x) / rx * -0.5 + (py + 0.5 - y) / ry * -0.5
                    vv = tone + up * 0.3
                    img[py % TH, px % TW] = PEBBLE[int(np.clip(vv * len(PEBBLE), 0, len(PEBBLE) - 1))]
                elif q < 1.9 and py + 0.5 > y:
                    img[py % TH, px % TW] = img[py % TH, px % TW] * 0.65
    # a few leaves blown in
    for k in range(14):
        x, y = rr.uniform(0, TW), rr.uniform(0, TH)
        ang, f_ = rr.uniform(0, np.pi), rr.integers(0, 2)
        for u in np.arange(-2.5, 2.6, 0.5):
            for w_ in np.arange(-1.2, 1.21, 0.4):
                if abs(w_) > 1.3 * max(1 - (u / 2.6) ** 2, 0) ** 0.6:
                    continue
                px = int(x + u * np.cos(ang) - w_ * np.sin(ang)) % TW
                py = int(y + (u * np.sin(ang) + w_ * np.cos(ang)) * 0.5) % TH
                img[py, px] = LITTER[f_][3 if w_ < 0 else 2]
    return np.clip(img, 0, 1), hgt


PACKED = ramp("#17131a", "#221c21", "#2e2629", "#3b3231", "#4a3f3b", "#5a4e48", "#6c5f57", "#7f7066")   # earth trodden hard
RBARK = ramp("#16110f", "#2a201b", "#41332a")                                 # a root's bark, darker than the soil's lights
WOODP = ramp("#2a1d16", "#4a3324", "#6e5038", "#93714f", "#b39370")                  # root bark rubbed to the wood
WET = ramp("#0d0e14", "#151820", "#20242d", "#2e333c")                               # water standing in a hollow


def path_0(seed=0):
    """the trodden way through the wood: earth packed hard and worn smooth by feet, crazed into plates where it has
    dried; the litter kicked off it (a few leaves trodden flat); water standing in a puddle or two with the sky in
    its far rim and a ring of slick mud; stones the feet have bared and worn flat; and the roots that cross it, thick
    and half-buried, lit along their backs, dark in their bellies, scuffed to pale wood where the feet strike.
    Designed the way main_0 was: the form in four clean tones first (dither only where one meets the next), then
    each thing drawn into it. No ruts: a path runs every way across the tiles, so nothing here may point."""
    from litter_stamps import LEAVES
    rr = np.random.default_rng(seed + 400)
    # ---- 1. the form: broad, shallow, packed; the light reads its height more than its slope
    hgt = (pfbm(XX, YY, 2, seed + 401) - 0.5) * 4.0 + (pfbm(XX, YY, 5, seed + 402) - 0.5) * 1.0
    hp_ = np.pad(hgt, 1, mode="wrap")
    gyf, gxf = np.gradient(hp_)
    nf = np.dstack([-gxf[1:-1, 1:-1], -gyf[1:-1, 1:-1] * 2.0, np.ones_like(hgt)])
    nf /= np.linalg.norm(nf, axis=2, keepdims=True)
    lit = np.clip((nf * LIGHT).sum(2), 0, 1)
    form = (lit - 0.62) * 0.5 + (hgt / 4.0) * 0.36
    # the hard earth crazed into plates, each a touch its own tone
    f1, f2, pid = pworley(XX, YY, 140, seed + 405)
    pj = (_P[(pid * 37 + seed) % 4096] - 0.5) * 0.45
    tone = np.clip(np.round((0.5 + form * 1.7) * 4 + pj + (BAY - 0.5) * 0.2), 0, 4).astype(int)
    base_i = np.array([1, 2, 3, 4, 5])[tone]
    img = PACKED[base_i].copy()
    dry = (hgt > 0.5) & (pnoise(XX, YY, 6, 3, seed + 407) > 0.45)              # crazed only on the driest crowns
    crack = dry & ((f2 - f1) < 0.45)
    img[crack] = PACKED[np.clip(base_i[crack] - 2, 0, 7)]
    plate_rim = dry & ((f2 - f1) > 0.55) & ((f2 - f1) < 1.25) & (tone >= 2)
    img[plate_rim] = PACKED[np.clip(base_i[plate_rim] + 1, 0, 7)]
    # polish: the highest crowns rubbed to a cooler grey
    polish = (hgt > 1.0) & (tone >= 3) & (pnoise(XX, YY, 20, 10, seed + 406) > 0.5)
    img[polish] = img[polish] * 0.8 + np.array([0.45, 0.43, 0.43]) * 0.2
    # damp in the low places: darker, a little cold
    damp = hgt < -0.9
    img[damp] = img[damp] * 0.8 + np.array([0.04, 0.05, 0.08]) * 0.2
    # ---- 2. puddles: a slick ring of mud, the water, the sky in its far rim, a dark lip on the near bank
    wob_f = pnoise(XX, YY, 32, 16, seed + 410)
    for k in range(2):
        cx, cy = rr.uniform(0, TW), rr.uniform(0, TH)
        rx, ry = rr.uniform(7, 12), rr.uniform(3.0, 4.6)
        def q_at(px, py):
            return ((px + 0.5 - cx) / rx) ** 2 + ((py + 0.5 - cy) / ry) ** 2 + (wob_f[py % TH, px % TW] - 0.5) * 0.5
        for dy in range(-7, 8):
            for dx in range(-16, 17):
                px, py = int(cx) + dx, int(cy) + dy
                q = q_at(px, py)
                X_, Y_ = px % TW, py % TH
                if q < 1.0:
                    img[Y_, X_] = WET[int(np.clip(1 + (1 - q) * 2.6, 0, 3))]
                    if q_at(px, py - 1) >= 1.0:                                       # the far rim: the sky in it
                        img[Y_, X_] = np.array([0.33, 0.37, 0.44]) if abs(dx) < rx * 0.6 else WET[3]
                elif q < 1.7:
                    img[Y_, X_] = PACKED[1] if (px + py) % 3 else PACKED[0]          # slick mud round it
                    if q_at(px, py - 1) < 1.0:
                        img[Y_, X_] = PACKED[0]                                     # the near lip, in shadow
    # ---- 3. roots across it: centrelines first, then every pixel by its distance to them
    for k in range(3):
        x, y = rr.uniform(0, TW), rr.uniform(0, TH)
        ang = rr.uniform(0, 2 * np.pi)
        wid = rr.uniform(3.6, 5.4)
        n = int(rr.integers(80, 130))
        pts = []
        for i in range(n):
            ang += rr.normal(0, 0.09) + np.sin(i * 0.11 + k) * 0.03
            x, y = x + np.cos(ang), y + np.sin(ang) * 0.5
            pts.append((x, y, wid * (0.35 + 0.65 * np.sin(np.pi * i / (n - 1)) ** 0.5)))
        P = np.array(pts)
        lo_x, hi_x = int(P[:, 0].min() - 6), int(P[:, 0].max() + 7)
        lo_y, hi_y = int(P[:, 1].min() - 5), int(P[:, 1].max() + 6)
        gy, gx = np.mgrid[lo_y:hi_y, lo_x:hi_x].astype(float) + 0.5
        best = np.full(gx.shape, 1e9)
        side = np.zeros(gx.shape)
        wloc = np.zeros(gx.shape)
        along = np.zeros(gx.shape)
        for i, (px_, py_, w_) in enumerate(P):
            dd = np.hypot(gx - px_, (gy - py_) * 2.0)
            m = dd < best
            best = np.where(m, dd, best)
            side = np.where(m, gy - py_, side)
            wloc = np.where(m, w_, wloc)
            along = np.where(m, i, along)
        body = best < wloc
        u = np.clip(side * 2.0 / np.maximum(wloc, 0.5), -1, 1)                   # -1 its back (up the screen) .. +1 its belly
        rt = np.where(u < -0.55, 2, np.where(u < 0.25, 1, 0))
        sc_k = (along.astype(int) * 7 + k * 13) % 29
        scuff = body & (u > -0.75) & (u < -0.05) & (sc_k < 4) & (wloc > wid * 0.7)   # worn pale in a few spots on its back
        shadow = ~body & (best < wloc + 1.6) & (side > 0)
        for (yy, xx) in zip(*np.nonzero(body | shadow)):
            Y_, X_ = (yy + lo_y) % TH, (xx + lo_x) % TW
            if body[yy, xx]:
                img[Y_, X_] = WOODP[2 if u[yy, xx] < -0.4 else 1] if scuff[yy, xx] else RBARK[rt[yy, xx]]
            else:
                img[Y_, X_] = img[Y_, X_] * 0.55
    # ---- 4. stones bared and worn flat: a broad lit top, a bevel, a hard dark edge under
    for k in range(5):
        x, y = rr.uniform(0, TW), rr.uniform(0, TH)
        rx, ry = rr.uniform(3.6, 6.2), rr.uniform(1.9, 3.0)
        tone_s = rr.uniform(0.42, 0.62)
        for dy in range(-5, 6):
            for dx in range(-8, 9):
                px, py = int(x) + dx, int(y) + dy
                q = ((px + 0.5 - x) / rx) ** 2 + ((py + 0.5 - y) / ry) ** 2
                if q < 1:
                    top = q < 0.45
                    v_ = tone_s + (0.18 if top else 0.0) - (py + 0.5 - y) / ry * 0.1 - (px + 0.5 - x) / rx * 0.06
                    img[py % TH, px % TW] = PEBBLE[int(np.clip(v_ * len(PEBBLE), 0, len(PEBBLE) - 1))]
                elif q < 1.8 and py + 0.5 > y:
                    img[py % TH, px % TW] = img[py % TH, px % TW] * 0.55
    # ---- 5. heel scuffs on the dry ground: a dark crescent, its inner edge caught by the light
    for k in range(14):
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        if hgt[y, x] < -0.3:
            continue
        for dx in range(-2, 3):
            img[(y + (1 if abs(dx) == 2 else 0)) % TH, (x + dx) % TW] *= 0.72
            if abs(dx) < 2:
                img[(y - 1) % TH, (x + dx) % TW] = np.minimum(img[(y - 1) % TH, (x + dx) % TW] * 1.12, 1)
    # ---- 6. a few leaves trodden flat into it, one tone down, broken
    for k in range(9):
        st = LEAVES[rr.integers(0, len(LEAVES))]
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        rp = LITTER[rr.integers(0, 3)]
        for j, row in enumerate(st):
            for i, ch in enumerate(row):
                if ch in ".SV" or rr.random() < 0.2:
                    continue
                off = {"H": 2, "L": 1, "B": 0, "D": -1, "P": 2}.get(ch, 0)
                img[(y + j) % TH, (x + i) % TW] = rp[int(np.clip(2 + off, 0, 7))]
    return np.clip(img, 0, 1), hgt


def compose(mains, dirt, GW=960, GH=540, seed=1):
    """the ground as the game would lay it, with the tricks against repetition:
    - the world cut into jittered patches (~3 tiles), each taking one of the main variants at its own random offset;
    - the patches' borders frayed by a warp, so no edge is straight;
    - a macro wash far larger than a tile: wetter and darker here, redder and drier there, greener in the damp;
    - bare patches (the dirt class) in irregular shapes, the litter banked a little lighter round them, the edge of
      the earth pooled dark."""
    yy, xx = np.mgrid[0:GH, 0:GW].astype(float)
    rr = np.random.default_rng(seed)
    # jittered patch centres (voronoi), each a variant and an offset
    cell = 110.0
    gx_, gy_ = np.meshgrid(np.arange(-1, GW / cell + 2), np.arange(-1, GH / (cell * 0.5) + 2))
    cx = (gx_ + rr.uniform(0.15, 0.85, gx_.shape)).ravel() * cell
    cy = (gy_ + rr.uniform(0.15, 0.85, gy_.shape)).ravel() * cell * 0.5
    var = rr.integers(0, len(mains), cx.size)
    offx, offy = rr.integers(0, TW, cx.size), rr.integers(0, TH, cx.size)
    wx = xx + (vn2(xx / 23, yy / 12, 3) - 0.5) * 22                     # the fray
    wy = yy + (vn2(xx / 23 + 7, yy / 12, 4) - 0.5) * 11
    best = np.full((GH, GW), 1e9)
    pid = np.zeros((GH, GW), int)
    for k in range(cx.size):
        d = np.hypot(wx - cx[k], (wy - cy[k]) * 2.0)
        m = d < best
        best = np.where(m, d, best)
        pid = np.where(m, k, pid)
    out = np.zeros((GH, GW, 3))
    for k in np.unique(pid):
        m = pid == k
        tx = ((xx[m] + offx[k]) % TW).astype(int)
        ty = ((yy[m] + offy[k]) % TH).astype(int)
        out[m] = mains[var[k]][ty, tx]
    # bare patches: irregular, frayed
    from scipy import ndimage as nd
    bare_f = vn2(xx / 110, yy / 55, 11) * 0.6 + vn2(xx / 30, yy / 15, 12) * 0.28 + vn2(xx / 9, yy / 4.5, 13) * 0.12
    core = bare_f > 0.7
    # the edge is not a line: leaves stray over the earth, thinning leaf by leaf (a leaf-sized cell decides each)
    dist = nd.distance_transform_edt(core)                                 # how far inside the bare ground
    leafcell = _Q[(np.floor(xx / 3.0).astype(int) * 7) % 512, (np.floor(yy / 1.5).astype(int) * 13) % 512]
    bare = core & (leafcell < np.clip(dist / 7.0, 0, 1) * 1.1)
    dx_ = (xx % TW).astype(int)
    dy_ = (yy % TH).astype(int)
    out[bare] = dirt[dy_[bare], dx_[bare]]
    over = np.roll(np.roll(~bare, 1, axis=0), 1, axis=1) & bare            # a hair of shadow where a leaf's edge overhangs
    out[over] = out[over] * 0.8
    # the macro wash
    wet = vn2(xx / 380, yy / 190, 21)
    warm = vn2(xx / 300, yy / 150, 22)
    out = out * (0.82 + wet[..., None] * 0.3)
    out = out * (1 + (warm[..., None] - 0.5) * np.array([0.16, 0.0, -0.12]))
    green = np.clip((vn2(xx / 260, yy / 130, 23) - 0.62) * 3, 0, 1)
    out = out * (1 + green[..., None] * np.array([-0.08, 0.1, -0.05]))
    return np.clip(out, 0, 1)


_Q = np.random.default_rng(99).random((512, 512))


def vn2(x, y, seed):
    """world-scale value noise (not periodic) for the composition"""
    x = x + seed * 17.3
    y = y + seed * 9.1
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _Q[a % 512, b % 512]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def light_view(base, path, hero_at, crop=None, zoom=4, t=0.0):
    """the ground under the game's lights (flat cold moon, the hero's lantern, stepped) with the hero for scale"""
    GH, GW = base.shape[:2]
    yy, xx = np.mgrid[0:GH, 0:GW].astype(float)
    lpx, lpy = hero_at[0] + 8, hero_at[1]
    dist = np.hypot(lpx - xx, (lpy - yy) * 2.0)
    lamp = 1 / (1 + (dist / 90.0) ** 2.2)
    bay = np.tile(B4, (GH // 4 + 1, GW // 4 + 1))[:GH, :GW]
    l_step = np.round(np.clip(lamp * 1.3 + (bay - 0.5) * 0.1, 0, 1.2) * 6) / 6
    out = base * (0.42 * np.array([0.62, 0.68, 0.86]) + l_step[..., None] * np.array([1.0, 0.72, 0.4]) * 1.25)
    hx, hy = hero_at
    u, w_ = xx - hx, hy - yy
    body = ((w_ >= 0) & (w_ < 32) & (np.abs(u) < 3.0 + (32 - w_) * 0.12)) | (np.hypot(u - 0.5, w_ - 34.5) < 3.4) | ((w_ > 24) & (w_ < 32) & (np.abs(u) < 6.2 - (w_ - 24) * 0.3))
    shadow = (np.hypot((u + 7) / 10.0, (w_ + 1) / 2.2) < 1) & ~body
    out[shadow] *= 0.55
    out[body] = hexc("#14111a")
    out[body & ~np.roll(body, 1, axis=1)] = hexc("#6a4a3a")
    out[np.hypot(u - 8, w_ - 15) < 1.6] = hexc("#f4c070")
    if crop is not None:
        x0, y0, cw, ch = crop
        out = out[y0:y0 + ch, x0:x0 + cw]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).resize((out.shape[1] * zoom, out.shape[0] * zoom), Image.NEAREST).save(path, **({"lossless": True} if path.endswith(".webp") else {}))


def save(img, path):
    Image.fromarray((img * 255).astype(np.uint8)).resize((TW * 2, TH * 2), Image.NEAREST).save(path, **({"lossless": True} if path.endswith(".webp") else {}))


def preview(img, path):
    """3 x 3 repeats at the game's zoom (4 screen px per world px), so the seams and the repetition show"""
    big = np.tile(img, (3, 3, 1))
    Image.fromarray((big * 255).astype(np.uint8)).resize((big.shape[1] * 4, big.shape[0] * 4), Image.NEAREST).save(path, **({"lossless": True} if path.endswith(".webp") else {}))


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    mains = []
    for k in range(4):
        t, h = main_0(seed=k * 101)
        save(t, os.path.join(out, "wood_main_%d.webp" % k))
        mains.append(t)
    d, _ = dirt_0()
    save(d, os.path.join(out, "wood_dirt_0.webp"))
    preview(d, os.path.join(out, "wood_dirt_0_tiled.png"))
    g = compose(mains, d)
    light_view(g, os.path.join(out, "wood_wide.png"), (480, 290), zoom=2)
    light_view(g, os.path.join(out, "wood_game.png"), (480, 290), crop=(240, 155, 480, 270), zoom=4)
    print("saved")
