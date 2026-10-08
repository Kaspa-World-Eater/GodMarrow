"""The Bleached Dune, rebuilt by FORM IS LAW (a rival to painted_dune.py; Derek 2026-10-07: "the dune tiles look really
good, can they be improved? ... create your own sand tile and let's compare them").

Same land, same camera, same bone-dust ramp and the same half-buried vertebra and pilgrim's prints as painted_dune.py,
so the two can be judged side by side. What changes, from the real thing:
- A TRUE DUNE, not a swell: a long gentle stoss (about 10 degrees) climbing into the wind to a sharp brink, then a SLIP
  FACE at the angle of repose (about 34 degrees) where sand avalanches; the brink wanders, as real crest lines do.
- MEGARIPPLES on the stoss: coarse-grained ripples about 0.8 yd apart and 4 to 6 cm high (real wind ripples, a few cm
  apart, are under a pixel at this scale; megaripples are the ripples a yard-scale camera can truly see). Asymmetric
  (gentle stoss, steep lee), sinuous, forking, dying out near the brink. NONE on the slip face, which avalanching keeps
  smooth.
- GRAINFLOW TONGUES down the slip face: lobes where sand has avalanched, fanning into toes at its foot.
- The coarse grains gather on the RIPPLE CRESTS (as they do in granule ripples), not in the troughs.
- All of it is height, lit by a LOW SUN (raking light shows the relief), with cast shadows. No painted lips or troughs:
  the light finds the form (MASTER_RULES 0). Colour only for what is under a pixel (the grains).
- LIFE: sand streams off the brink like smoke and falls over the slip face; grains hop across the stoss in short
  arcs (saltation); every motion periodic in the loop.

  python tools/art_study/dune_form.py OUT.webp        (also writes OUT_compare.png: the old dune beside this one)
"""
import sys
import numpy as np
from PIL import Image
import painted_dune as pd

W, H, TW, TH, OX, OY, TILES = pd.W, pd.H, pd.TW, pd.TH, pd.OX, pd.OY, pd.TILES
SY, SX = pd.SY, pd.SX
vn, fbm, DUST, BONE = pd.vn, pd.fbm, pd.DUST, pd.BONE
GRAIN = pd.hexc("#6a5a50")                                             # the coarse grains, darker, browner
WIND = pd.WIND
B4 = pd.B4
SUN = np.array([-0.72, 0.34, 0.5])                                     # a low sun from the upper left: raking
SUN = SUN / np.linalg.norm(SUN)
RLAM = 0.8                                                             # megaripple spacing, yards
BONE_SHIFT = (2.6, 0.6)                                                # the vertebra moved onto the windward slope


def along_across(x, y):
    return x * WIND[0] + y * WIND[1], -x * WIND[1] + y * WIND[0]


def brink(c):
    """where the crest line runs: it wanders, as real brinks do"""
    return 6.4 + 0.55 * np.sin(c * 0.75 + 0.6) + (fbm(c * 0.35 + 5, 2.0) - 0.5) * 0.9


def dune(x, y):
    """the dune itself and, separately, how far up the slip face each point is (0 off it)"""
    a, c = along_across(x, y)
    ab = brink(c)
    top = 0.95
    stoss = top - np.clip(ab - a, 0, None) * 0.18                         # about 10 degrees up into the wind
    slip = top - np.clip(a - ab, 0, None) * 0.67                          # about 34 degrees: the angle of repose
    hd = np.where(a < ab, stoss, slip)
    k = 0.06                                                              # the brink: sharp, just softened
    hd = hd - k * np.exp(-((a - ab) / k) ** 2) * 0.35
    floor = -0.15 + (fbm(x * 0.2 + 9, y * 0.2) - 0.5) * 0.1              # the interdune flat
    hd = np.maximum(hd, floor)
    on_slip = (a > ab) & (hd > floor + 0.02)
    return hd, a, c, ab, on_slip


def ripple_phase(x, y, a, c):
    fork = sum(sg * np.arctan2(y - dy, x - dx) / (2 * np.pi) for dx, dy, sg in pd.DISLOC[:6])
    return a / RLAM + fork * 0.6 + (fbm(x * 0.2, y * 0.2) - 0.5) * 2.2 + (vn(c * 0.6 + 4, a * 0.2) - 0.5) * 0.8


def ripple_profile(r):
    return np.where(r < 0.7, r / 0.7, (1 - r) / 0.3)                     # gentle stoss, steep lee


def height(x, y, want=False):
    hd, a, c, ab, on_slip = dune(x, y)
    r = ripple_phase(x, y, a, c) % 1.0
    near_brink = np.clip((ab - a - 0.25) / 1.2, 0, 1)                    # they die out toward the brink
    patch = np.clip((fbm(x * 0.28 + 7, y * 0.28) - 0.22) / 0.15, 0, 1)                # over most of the stoss
    amp = 0.05 * near_brink * patch * (a < ab)
    h = hd + ripple_profile(r) * amp
    # grainflow tongues down the slip face, fanning into toes at its foot
    tng = (np.sin(c * 2.6 + fbm(c * 0.8, 1.0) * 4) * 0.5 + 0.5) ** 3                  # broad lobes of avalanched sand
    down = np.clip((a - ab) / 1.4, 0, 1)
    h = h + tng * 0.06 * on_slip * down * (0.4 + down)
    foot = np.exp(-((hd - (-0.15)) / 0.12) ** 2) * (a > ab)                           # the toes fanning out at its foot
    h = h + foot * tng * 0.05
    # the vertebra and the prints: the same story as painted_dune
    va, vc = along_across(pd.VERT[0], pd.VERT[1])
    for (p, d, age) in pd.PRINTS:
        fill = 1.0 - age * 0.8
        u = (x - p[0]) * d[0] + (y - p[1]) * d[1]
        v = -(x - p[0]) * d[1] + (y - p[1]) * d[0]
        wid = 0.055 + 0.02 * np.clip(u / 0.12, -1, 1)
        e = (u / 0.2) ** 2 + (v / wid) ** 2
        heel = np.exp(-(((u + 0.13) / 0.05) ** 2 + (v / 0.045) ** 2))
        toe = np.exp(-(((u - 0.14) / 0.04) ** 2 + (v / 0.06) ** 2))
        h = h - (np.clip(1.2 - e, 0, 1) * 0.03 + heel * 0.014 + toe * 0.012) * fill
        h = h + np.exp(-((np.sqrt(e) - 1.3) / 0.25) ** 2) * 0.012 * fill
    bone = hd + pd.bone_h(x + BONE_SHIFT[0], y + BONE_SHIFT[1]) - 0.05              # on the stoss, not the slip face
    if want:
        return bone > h + 0.004, r, amp, on_slip, tng
    return np.maximum(h, bone)


_STILL = {}


def still():
    if _STILL:
        return _STILL
    KZ = 22.0
    x, y = pd.WX.copy(), pd.WY.copy()
    got = np.zeros_like(x, bool)
    for z in np.arange(1.2, -0.4, -0.015):                                # ray-cast down onto the height
        px = ((SY + 0.5 + z * KZ - OY) / (TH / 2) + (SX + 0.5 - OX) / (TW / 2)) / 2
        py = ((SY + 0.5 + z * KZ - OY) / (TH / 2) - (SX + 0.5 - OX) / (TW / 2)) / 2
        hh = height(px, py)
        new = ~got & (hh >= z)
        x[new], y[new] = px[new], py[new]
        got |= new
    e = 0.015
    h = height(x, y)
    hx_ = (height(x + e, y) - height(x - e, y)) / (2 * e)
    hy_ = (height(x, y + e) - height(x, y - e)) / (2 * e)
    n = np.dstack([-hx_, -hy_, np.ones_like(h)])                          # the true normal: no exaggeration
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    ndl = np.clip((n * SUN).sum(2), 0, 1)
    shade = np.zeros_like(h, bool)
    for k in range(1, 40):
        s_ = k * 0.03
        shade |= height(x + SUN[0] * s_, y + SUN[1] * s_) > h + SUN[2] * s_ + 0.002
    lit = np.where(shade, 0.0, ndl)
    sky = np.clip(n[..., 2], 0, 1) * 0.18                                # the pale sky fills every face
    bone, r, amp, on_slip, tng = height(x, y, want=True)
    v = 0.1 + lit * 0.78 + sky + (vn(x * 1.3, y * 1.3) - 0.5) * 0.03     # a paper tooth, fixed to the world, faint
    q = v * len(DUST)
    d = B4[SY.astype(int) % 4, SX.astype(int) % 4]
    frac = q - np.floor(q)
    q = np.where(np.abs(frac - 0.5) > 0.44, q + (d - 0.5) * 0.25, q)     # dither only at tone borders, narrow
    idx = np.clip(q.astype(int), 0, len(DUST) - 1)
    rgb = DUST[idx]
    warm = (lit > 0.5)[..., None]                                         # the sun's temperature, in steps
    rgb = np.where(warm, rgb * np.array([1.025, 1.0, 0.955]), rgb * np.array([0.975, 0.985, 1.03]))
    grains = (amp > 0.01) & (r > 0.55) & (r < 0.72) & (vn(x * 40, y * 40) > 0.55)   # coarse grains on the crests
    rgb[grains] = rgb[grains] * 0.84 + GRAIN * 0.16
    fl = (vn(x * 5.1, y * 5.1) > 0.965) & (vn(x * 31.0, y * 31.0) > 0.8) & ~on_slip
    rgb[fl] = pd.FLECK
    from scipy import ndimage as nd
    near_bone = nd.binary_dilation(bone, iterations=2) & ~bone
    rgb[near_bone] = rgb[near_bone] * 0.86
    vb = np.clip(0.1 + lit * 0.8 + sky * 0.6 + (vn(x * 14, y * 14) - 0.5) * 0.08, 0, 0.999)
    bi = (vb * len(BONE)).astype(int)
    pits = bone & (vn(x * 30 + 7, y * 30) > 0.78)
    bi = np.where(pits, np.maximum(bi - 2, 0), bi)
    rgb[bone] = BONE[bi[bone]]
    a, c = along_across(x, y)
    _STILL.update(rgb=rgb, x=x, y=y, a=a, c=c, ab=brink(c), on_slip=on_slip, bone=bone, h=h)
    return _STILL


def ground(t):
    st = still()
    rgb = st["rgb"].copy()
    a, c, ab = st["a"], st["c"], st["ab"]
    p2 = 2 * np.pi * t
    # sand streaming off the brink like smoke, carried out over the slip face and falling (stepped, see-through)
    past = a - ab
    plume = (past > -0.15) & (past < 1.6)
    flow = vn(past * 2.2 - np.cos(p2) * 1.5, c * 5.0 + np.sin(p2) * 1.5) * 0.6 + vn(past * 4.5 - np.sin(p2) * 2.0, c * 9.0) * 0.4
    dens = np.clip((flow - 0.55) * 3.2, 0, 1) * np.clip(1 - past / 1.6, 0, 1) * plume
    a1 = np.where(dens > 0.55, 0.42, np.where(dens > 0.22, 0.2, 0.0)) * (pd.BAY < 0.85) * ~st["bone"]
    rgb = rgb * (1 - a1[..., None]) + DUST[7] * a1[..., None]
    # saltation: grains hopping across the stoss in short arcs, a pixel each, catching the sun
    rr = np.random.default_rng(77)
    for k in range(70):
        x0, y0 = rr.uniform(0, TILES), rr.uniform(0, TILES)
        ph = rr.uniform(0, 1)
        u = (t * 3 + ph) % 1.0                                              # three hops a loop
        hop = 0.5
        px_ = x0 + WIND[0] * u * hop
        py_ = y0 + WIND[1] * u * hop
        z = np.sin(np.pi * u) * 0.12 + float(height(np.array(px_), np.array(py_)))
        sx = (px_ - py_) * (TW / 2) + OX
        sy = (px_ + py_) * (TH / 2) + OY - z * 22.0
        ix, iy = int(round(sx)), int(round(sy))
        if 0 <= iy < H and 0 <= ix < W and np.sin(np.pi * u) > 0.15:
            rgb[iy, ix] = DUST[7]
    x, y = st["x"], st["y"]
    inside = (x >= 0) & (y >= 0) & (x < TILES) & (y < TILES)
    out = np.zeros((H, W, 3)) + pd.hexc("#16131a")
    out[inside] = rgb[inside]
    return np.clip(out, 0, 1)


def main(out):
    frames = []
    for i in range(24):
        f = ground(i / 24.0)
        frames.append(Image.fromarray((f * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST))
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=90, loop=0, quality=92)
    frames[0].save(out.replace(".webp", ".png"))
    old = Image.fromarray((pd.ground(0.0) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST)
    cmp_ = Image.new("RGB", (W * 6 + 12, H * 3), (20, 18, 24))
    cmp_.paste(old, (0, 0))
    cmp_.paste(frames[0], (W * 3 + 12, 0))
    cmp_.save(out.replace(".webp", "_compare.png"))
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dune_form.webp")
