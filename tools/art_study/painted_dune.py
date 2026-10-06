"""Bone desert, ground 1 of 6: the Bleached Dune. One piece, to the painted standard (docs/PAINTED_STANDARD.md).

Derek 2026-10-06: "Build the desert tiles, bone desert from the lore", then "do them one at a time, like the rules".

The brief, from the lore:
- The Barrens of Ossa are the god's bones laid bare: "the long white ridges in the far lands are its bones". The sand
  is bone gone to dust, which the Pale Order holds sacred and gives to the wind. So the sand is not yellow: it is
  ivory and chalk, warm where the sun holds it, lavender in the shade, under the palest sky on the Hide.
- The dune "whiter than the rest, smooth as a brow" (the Drowned Caravan): the dunes are smooth, skin-like swells.
- Pilgrims walk the Ossa; the wind takes their tracks.

The design, element by element:
- FORM (rule 12): one height field: a broad swell (light and shade in big bands), then wind ripples, asymmetric as
  real ones are (a long gentle stoss facing the wind, a short steep lee), their crests sinuous, forking and dying out;
  ripples fade on the swell's smooth brows. Lit by a pale sun from the upper left (rule 11), with cast shadow off each
  ripple's lee.
- PAINT: a short hue-shifted ramp of bone dust (rule 9); tones quantised, dither only nudging the boundaries (rule 2);
  the ripples laid as long dry-brush strokes along their crests (rule 4); heavier grit pooled in each trough like
  pigment at a wet edge, a lit lip on each crest (rule 3); a broad paper tooth fixed to the world (rule 6).
- STORY (rule 14, kept quiet: this is open ground): a pilgrim's footprints crossing, half filled by the wind; rare
  flecks of bone not yet ground fine.
- LIFE (rule 8): the wind lifts dust off the crests in thin streaks that run downwind.

Generated from world coordinates, so it tiles to any size without seams.

  python tools/art_study/painted_dune.py OUT.webp
"""
import sys
import numpy as np
from PIL import Image

RNG = np.random.default_rng(31)
_P = RNG.random((1024, 1024))
B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16.0 + 1 / 32


def vn(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 1024, b % 1024]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def fbm(x, y):
    return vn(x, y) * 0.55 + vn(x * 2.1 + 9, y * 2.1 + 9) * 0.3 + vn(x * 4.3 + 3, y * 4.3 + 3) * 0.15


def hexc(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)])


# bone dust: shade leans lavender (the pale sky fills it), light leans warm ivory (the sun)
DUST = np.array([hexc(c) for c in ("#4a4058", "#685d72", "#8a7f8c", "#aca1a4", "#c9bfb6", "#e0d7c6", "#efe8d6", "#faf5e8")])
GRIT = hexc("#5e5048")                                                 # the heavier grains, darker, browner
FLECK = hexc("#fffaf0")
# the vertebra's own bone: warmer and older than the dust round it, umber in its shade, pitted
BONE = np.array([hexc(c) for c in ("#2c2026", "#4a3a38", "#6e5a4c", "#94806a", "#b8a488", "#d6c6a6", "#ece0c4", "#fbf4e2")])

TILES = 8                                                             # the field shown: TILES x TILES
TW, TH = 36, 18                                                        # one tile (a yard) in world px: core/iso.gd
W, H = TILES * TW + 8, TILES * TH + 30
SY, SX = np.mgrid[0:H, 0:W].astype(float)
OX, OY = W / 2, 18
# each art pixel straight down onto the ground plane (open ground: no need to cast rays)
WX = ((SY + 0.5 - OY) / (TH / 2) + (SX + 0.5 - OX) / (TW / 2)) / 2
WY = ((SY + 0.5 - OY) / (TH / 2) - (SX + 0.5 - OX) / (TW / 2)) / 2
INSIDE = (WX >= 0) & (WY >= 0) & (WX < TILES) & (WY < TILES)
BAY = B4[SY.astype(int) % 4, SX.astype(int) % 4]

WIND = np.array([0.92, 0.39])                                          # blowing toward the screen's lower right
WIND /= np.linalg.norm(WIND)
LAM = 0.42                                                             # ripple spacing, in tiles


def along_across(x, y):
    return x * WIND[0] + y * WIND[1], -x * WIND[1] + y * WIND[0]


_dr = np.random.default_rng(12)
DISLOC = [(_dr.uniform(0.5, 7.5), _dr.uniform(0.5, 7.5), 1 if k % 2 else -1) for k in range(9)]


def ripple_phase(x, y):
    a, c = along_across(x, y)
    fork = sum(sg * np.arctan2(y - dy, x - dx) / (2 * np.pi) for dx, dy, sg in DISLOC)
    # crests wander (low warp) and fork (a faster warp that tears the phase so two crests run into one)
    return a / LAM + fork + (fbm(x * 0.22, y * 0.22) - 0.5) * 3.0 + (vn(c * 0.9 + 4, a * 0.25) - 0.5) * 1.1


def ripple_profile(r):
    """the stoss rises gently over 72% of a wavelength, the lee drops in the last 28%"""
    return np.where(r < 0.72, r / 0.72, (1 - r) / 0.28)


# the footprints: one pilgrim, walking up the field, the prints softened and half-filled by the wind
_rng = np.random.default_rng(5)
_path_t = np.linspace(-1, TILES + 1, 200)
_path = np.stack([0.3 + _path_t * 0.8, 2.2 + _path_t * 0.55 + np.sin(_path_t * 0.55) * 0.6], 1)  # with the wind, across the crests
PRINTS = []
_step, _acc = 0.42, 0.0
for i in range(1, len(_path)):
    seg = _path[i] - _path[i - 1]
    _acc += np.linalg.norm(seg)
    if _acc >= _step:
        _acc = 0.0
        d = seg / np.linalg.norm(seg)
        side = 1 if len(PRINTS) % 2 else -1
        PRINTS.append((_path[i] + np.array([-d[1], d[0]]) * 0.11 * side, d, float(np.clip(_path_t[i] / TILES, 0, 1))))


VERT = (5.7, 2.4, 0.5)                                                  # where it lies, and its turn


def _seg(u, v, p0, p1, w0, w1):
    """distance-based blade from p0 to p1, width w0 tapering to w1; returns 0..1 thickness"""
    d = np.array(p1) - np.array(p0)
    L = np.hypot(*d)
    tt = np.clip(((u - p0[0]) * d[0] + (v - p0[1]) * d[1]) / (L * L), 0, 1)
    px, py = p0[0] + d[0] * tt, p0[1] + d[1] * tt
    w = w0 + (w1 - w0) * tt
    return np.clip(1 - (np.hypot(u - px, v - py) / w) ** 2, 0, 1)


def bone_h(x, y):
    vx, vy, th = VERT
    SC = 2.3                                                            # a god's vertebra: about a yard long
    u = ((x - vx) * np.cos(th) + (y - vy) * np.sin(th)) / SC
    v = (-(x - vx) * np.sin(th) + (y - vy) * np.cos(th)) / SC
    # the body (centrum): a short drum, its end face cupped so a ring of rim catches the light
    d = np.hypot(u / 1.0, v / 0.85)
    centrum = np.sqrt(np.clip(1 - (d / 0.21) ** 2, 0, 1)) * 0.12
    centrum = centrum - np.clip(1 - (d / 0.13) ** 2, 0, 1) * 0.03
    # the arch behind it, thick, round the canal (the canal left open: sand and shadow in it)
    ring = np.hypot(u - 0.29, v / 0.9)
    arch = np.clip(1 - np.abs(ring - 0.1) / 0.055, 0, 1) ** 0.5 * 0.09
    # the processes: broad blades, swelling to knobbed ends (bone thickens where muscle held it)
    def blade(p0, p1, w0, w1, hgt, knob):
        b = _seg(u, v, p0, p1, w0, w1) ** 0.5 * hgt
        k = np.sqrt(np.clip(1 - (np.hypot(u - p1[0], v - p1[1]) / knob) ** 2, 0, 1)) * hgt * 1.05
        return np.maximum(b, k)
    spine = blade((0.38, 0.0), (0.74, 0.1), 0.085, 0.05, 0.075, 0.06)
    wing1 = blade((0.24, 0.07), (0.3, 0.33), 0.08, 0.05, 0.07, 0.065)
    wing2 = blade((0.24, -0.07), (0.33, -0.32), 0.08, 0.05, 0.07, 0.065) * np.clip((0.3 + v) / 0.12 + 0.6, 0.0, 1)  # its tip sinking into the sand
    return np.maximum.reduce([centrum, arch, spine, wing1, wing2]) * 1.9


def height(x, y, want_bone=False):
    a, c = along_across(x, y)
    va, vc = along_across(VERT[0], VERT[1])
    da, dc = a - va, c - vc
    tail = 0.09 * np.exp(-(dc / (0.45 + np.clip(da, 0, None) * 0.1)) ** 2) * np.exp(-np.clip(da - 1.0, 0, None) / 1.4) * np.clip((da - 0.5) / 0.5, 0, 1)
    scour = -0.04 * np.exp(-((np.hypot(da + 0.2, dc * 0.8) - 0.75) / 0.22) ** 2) * (da < 0.3)
    swell = np.sin((a * 0.75 + c * 0.2) + (fbm(x * 0.15 + 3, y * 0.15) - 0.5) * 2.4) * 0.3
    brow = np.clip((swell / 0.3 + 0.15) * 1.6, 0, 1)                   # the smooth brows: ripples fade on the swell's tops
    rk = np.clip((fbm(x * 0.3 + 7, y * 0.3) - 0.42) / 0.1, 0, 1)
    amp = 0.03 * rk * rk * (3 - 2 * rk) * (1 - brow * 0.85)
    near = np.clip((np.hypot(da, dc) - 0.6) / 1.0, 0, 1)                         # the ripples die out round the bone
    h = swell + ripple_profile(ripple_phase(x, y) % 1.0) * amp * near + tail + scour
    for (p, d, age) in PRINTS:
        fill = 1.0 - age * 0.8
        u = (x - p[0]) * d[0] + (y - p[1]) * d[1]
        v = -(x - p[0]) * d[1] + (y - p[1]) * d[0]
        # a foot: the ball and toes wide at the front, the arch pinched, the heel a smaller round behind
        wid = 0.055 + 0.02 * np.clip(u / 0.12, -1, 1)
        e = (u / 0.2) ** 2 + (v / wid) ** 2
        heel = np.exp(-(((u + 0.13) / 0.05) ** 2 + (v / 0.045) ** 2))
        toe = np.exp(-(((u - 0.14) / 0.04) ** 2 + (v / 0.06) ** 2))
        h = h - (np.clip(1.2 - e, 0, 1) * 0.028 + heel * 0.012 + toe * 0.01) * fill                  # pressed in, the heel deepest
        h = h + np.exp(-((np.sqrt(e) - 1.3) / 0.25) ** 2) * 0.01 * fill      # a low rim of pushed sand
    bone = swell + bone_h(x, y) - 0.05                                     # the bone stands where it clears the sand
    if want_bone:
        return bone > h + 0.004
    return np.maximum(h, bone)


_STILL = {}


def still():
    """everything that does not move, painted once"""
    if _STILL:
        return _STILL
    KZ = 22.0
    x, y = WX.copy(), WY.copy()
    got = np.zeros_like(WX, bool)
    for z in np.arange(0.62, -0.42, -0.02):
        px = ((SY + 0.5 + z * KZ - OY) / (TH / 2) + (SX + 0.5 - OX) / (TW / 2)) / 2
        py = ((SY + 0.5 + z * KZ - OY) / (TH / 2) - (SX + 0.5 - OX) / (TW / 2)) / 2
        hh = height(px, py)
        new = ~got & (hh >= z)
        x[new], y[new] = px[new], py[new]
        got |= new
    _STILL["xy"] = (x, y)
    e = 0.02
    h = height(x, y)
    hx_ = (height(x + e, y) - height(x - e, y)) / (2 * e)
    hy_ = (height(x, y + e) - height(x, y - e)) / (2 * e)
    n = np.dstack([-hx_ * 2.2, -hy_ * 2.2, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    sun = np.array([-0.6, 0.38, 0.70])
    sun /= np.linalg.norm(sun)
    ndl = np.clip((n * sun).sum(2), 0, 1)
    # cast shadow: march toward the sun (long enough for the bone's shadow to fall across the sand)
    shade = np.zeros_like(h, bool)
    for k in range(1, 22):
        s_ = k * 0.03
        shade |= height(x + sun[0] * s_, y + sun[1] * s_) > h + sun[2] * s_ * 0.4 + 0.002
    lit = np.where(shade, ndl * 0.3, ndl)
    sky = n[..., 2] * 0.16                                              # the pale sky fills every face a little
    a, c = along_across(x, y)
    r = ripple_phase(x, y) % 1.0
    bone = height(x, y, want_bone=True)
    # contact: the sand darkens where it meets the bone
    from scipy import ndimage as nd
    near_bone = nd.binary_dilation(bone, iterations=2) & ~bone
    # paint: dry-brush strokes along the crests; broad washes laid wet, a paper tooth fixed to the world
    stroke = (vn(c * 0.8 + 11, a * 4.0) - 0.5) * 0.045
    wash = (fbm(x * 0.17 + 20, y * 0.17 + 4) - 0.5) * 0.12
    tooth = (vn(x * 1.4, y * 1.4) - 0.5) * 0.05 + (vn(x * 4.5 + 5, y * 4.5) - 0.5) * 0.025
    jitter = (vn(c * 1.6 + 3, a * 9.0) - 0.5) * 0.07                   # tone edges broken by the brush, not a grid
    v = 0.12 + lit * 0.72 + sky + stroke + wash + tooth + jitter
    v = np.where(near_bone, v - 0.12, v)
    idx = np.clip((v * len(DUST)).astype(int), 0, len(DUST) - 1)
    rgb = DUST[idx]
    # pigment pooled where a wash ends: a darker band just inside the swell's shade, where light turns to shadow
    sw_lit = np.clip(0.12 + lit * 0.72 + sky + wash, 0, 1)
    pool = (sw_lit > 0.5) & (sw_lit < 0.56) & ~bone
    rgb[pool] = DUST[np.clip(idx[pool] - 1, 0, len(DUST) - 1)]
    # the sun's temperature: the lit tones a step warmer, the shade a step cooler (in steps, as mixed)
    warmk = (lit > 0.55)[..., None]
    rgb = np.where(warmk, rgb * np.array([1.025, 1.0, 0.955]), rgb * np.array([0.975, 0.985, 1.03]))
    # grit pooled in the troughs, a lit lip along each crest's sunward side
    rippled = fbm(x * 0.3 + 7, y * 0.3) > 0.5
    trough = rippled & (r < 0.1) & ~bone
    rgb[trough] = rgb[trough] * 0.82 + GRIT * 0.18
    lip = rippled & (r > 0.58) & (r < 0.72) & (lit > 0.4) & ~bone
    rgb[lip] = DUST[np.clip(idx[lip] + 1, 0, len(DUST) - 1)]
    # flecks of bone not yet ground fine: rare
    fl = (vn(x * 5.1, y * 5.1) > 0.965) & (vn(x * 31.0, y * 31.0) > 0.8) & (r > 0.2) & (r < 0.65)
    rgb[fl] = FLECK
    below = np.roll(fl, 1, axis=0) & ~fl
    rgb[below] = DUST[2]
    # the vertebra: its own ramp, lit by the same sun; pitted; a dark line where it turns from the light
    vb = np.clip(0.1 + lit * 0.8 + sky * 0.6 + (vn(x * 14, y * 14) - 0.5) * 0.08, 0, 0.999)
    bi = (vb * len(BONE)).astype(int)
    pits = bone & (vn(x * 30 + 7, y * 30) > 0.78)
    bi = np.where(pits, np.maximum(bi - 2, 0), bi)
    rgb[bone] = BONE[bi[bone]]
    under = bone & ~np.roll(bone, -1, axis=0)                           # the lower contour only: weight, not a wire
    rgb[under & (lit < 0.6)] = BONE[2]
    rim = bone & ~nd.binary_erosion(bone) & (lit >= 0.5)
    rgb[rim] = BONE[7]
    _STILL.update(rgb=rgb, a=a, c=c, r=r, rippled=rippled, bone=bone)
    return _STILL


def ground(t):
    st = still()
    rgb = st["rgb"].copy()
    a, c, r = st["a"], st["c"], st["r"]
    # the wind: dust lifting off the crests in thin streaks running downwind, stepped see-through; it parts
    # round the bone and spills past it
    drift = vn(a * 0.7 - t * 3.0, c * 7.0) * 0.7 + vn(a * 1.6 - t * 5.0, c * 13.0) * 0.3
    crest = np.clip(1 - np.abs(r - 0.72) / 0.35, 0, 1) * st["rippled"]
    dust = np.clip((drift - 0.62) * 4, 0, 1) * (0.35 + crest * 0.65)
    a1 = np.where(dust > 0.6, 0.45, np.where(dust > 0.25, 0.22, 0.0)) * (BAY < 0.85) * ~st["bone"]
    rgb = rgb * (1 - a1[..., None]) + DUST[7] * a1[..., None]
    x, y = st["xy"]
    inside = (x >= 0) & (y >= 0) & (x < TILES) & (y < TILES)
    out = np.zeros((H, W, 3)) + hexc("#16131a")
    out[inside] = rgb[inside]
    return np.clip(out, 0, 1)


def main(out):
    frames = []
    for i in range(24):
        f = ground(i / 24.0)
        frames.append(Image.fromarray((f * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST))
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=90, loop=0, quality=92)
    frames[0].save(out.replace(".webp", ".png"))
    # one tile, close: 4x4 tiles cut from the middle at 8x
    big = Image.fromarray((ground(0.0) * 255).astype(np.uint8))
    cx, cy = W // 2, H // 2
    big.crop((cx - 54, cy - 27, cx + 54, cy + 27)).resize((108 * 8, 54 * 8), Image.NEAREST).save(out.replace(".webp", "_close.png"))
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dune.webp")
