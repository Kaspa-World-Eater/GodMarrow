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

TILES = 8                                                             # the field shown: TILES x TILES
TW, TH = 36, 18                                                        # one tile (a yard) in world px: core/iso.gd
W, H = TILES * TW + 8, TILES * TH + 8
SY, SX = np.mgrid[0:H, 0:W].astype(float)
OX, OY = W / 2, 4
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


def ripple_phase(x, y):
    a, c = along_across(x, y)
    # crests wander (low warp) and fork (a faster warp that tears the phase so two crests run into one)
    return a / LAM + (fbm(x * 0.22, y * 0.22) - 0.5) * 3.0 + (vn(c * 0.9 + 4, a * 0.25) - 0.5) * 1.1


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


def height(x, y):
    a, c = along_across(x, y)
    swell = np.sin((a * 0.75 + c * 0.2) + (fbm(x * 0.15 + 3, y * 0.15) - 0.5) * 2.4) * 0.3
    brow = np.clip((swell / 0.3 + 0.15) * 1.6, 0, 1)                   # the smooth brows: ripples fade on the swell's tops
    rk = np.clip((fbm(x * 0.3 + 7, y * 0.3) - 0.42) / 0.1, 0, 1)
    amp = 0.03 * rk * rk * (3 - 2 * rk) * (1 - brow * 0.85)
    h = swell + ripple_profile(ripple_phase(x, y) % 1.0) * amp
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
    return h


def ground(t):
    x, y = WX, WY
    e = 0.02
    h = height(x, y)
    hx_ = (height(x + e, y) - height(x - e, y)) / (2 * e)
    hy_ = (height(x, y + e) - height(x, y - e)) / (2 * e)
    n = np.dstack([-hx_ * 2.2, -hy_ * 2.2, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    sun = np.array([-0.6, 0.38, 0.70])
    sun /= np.linalg.norm(sun)
    ndl = np.clip((n * sun).sum(2), 0, 1)
    # cast shadow: march toward the sun across the ripples (they are low: short march)
    shade = np.zeros_like(h, bool)
    for k in range(1, 9):
        s = k * 0.03
        shade |= height(x + sun[0] * s, y + sun[1] * s) > h + sun[2] * s * 0.18 + 0.002
    lit = np.where(shade, ndl * 0.3, ndl)
    sky = n[..., 2] * 0.16                                              # the pale sky fills every face a little
    a, c = along_across(x, y)
    r = ripple_phase(x, y) % 1.0
    # paint: the ripples laid as dry-brush strokes along the crests; a broad paper tooth fixed to the world
    stroke = (vn(c * 0.8 + 11, a * 4.0) - 0.5) * 0.045
    tooth = (vn(x * 1.4, y * 1.4) - 0.5) * 0.05 + (vn(x * 4.5 + 5, y * 4.5) - 0.5) * 0.025
    v = 0.12 + lit * 0.72 + sky + stroke + tooth
    v = v + (BAY - 0.5) * 0.05                                          # dither: only tips values already near a step
    idx = np.clip((v * len(DUST)).astype(int), 0, len(DUST) - 1)
    rgb = DUST[idx]
    # the sun's temperature: the lit tones a step warmer, the shade a step cooler (in steps, as mixed)
    warmk = (lit > 0.55)[..., None]
    rgb = np.where(warmk, rgb * np.array([1.025, 1.0, 0.955]), rgb * np.array([0.975, 0.985, 1.03]))
    # pooled grit in the troughs (the heavy grains settle where the lee meets the next stoss), a lit lip on each crest
    rippled = fbm(x * 0.3 + 7, y * 0.3) > 0.5
    trough = rippled & (r < 0.1)
    rgb[trough] = rgb[trough] * 0.82 + GRIT * 0.18
    lip = rippled & (r > 0.66) & (r < 0.72) & (lit > 0.5)
    rgb[lip] = DUST[np.clip(idx[lip] + 1, 0, len(DUST) - 1)]
    # flecks of bone not yet ground fine: rare, each a pale point with its shadow pixel below it
    fl = (vn(x * 5.1, y * 5.1) > 0.965) & (vn(x * 31.0, y * 31.0) > 0.8) & (r > 0.2) & (r < 0.65)
    rgb[fl] = FLECK
    below = np.roll(fl, 1, axis=0) & ~fl
    rgb[below] = DUST[2]
    # the wind: dust lifting off the crests in thin streaks running downwind, stepped see-through
    drift = vn(a * 0.7 - t * 3.0, c * 7.0) * 0.7 + vn(a * 1.6 - t * 5.0, c * 13.0) * 0.3
    crest = np.clip(1 - np.abs(r - 0.72) / 0.35, 0, 1) * rippled
    dust = np.clip((drift - 0.62) * 4, 0, 1) * (0.35 + crest * 0.65)
    a1 = np.where(dust > 0.6, 0.45, np.where(dust > 0.25, 0.22, 0.0)) * (BAY < 0.85)
    rgb = rgb * (1 - a1[..., None]) + DUST[7] * a1[..., None]
    # the edge of the field: the sheet behind it (the game's dark), with a contact line
    out = np.zeros((H, W, 3)) + hexc("#16131a")
    out[INSIDE] = rgb[INSIDE]
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
