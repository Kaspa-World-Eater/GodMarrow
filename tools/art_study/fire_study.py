"""Fire, studied on its own (the masterwork rule, Derek 2026-10-06: every detail individually crafted).

The cathedral's flames were teardrops: a symmetric shape with tongues pasted on, all alike. Real fire, and good
painted fire (Blasphemous, Dead Cells, the old Diablo II fire walls):
- a wide base hugging its fuel, brightest and most solid there; it narrows as it rises, but not evenly;
- tongues: the flame is torn into licks by turbulence that rises faster than the flame itself, so each lick stretches
  upward and thins; near the top they break off as detached pieces that shrink and go out;
- colour by heat, not by position alone: a small white-yellow core low in the middle, yellow, orange, a red edge, and
  the coolest tips darkening into smoke;
- the edges ragged and, at the cool outer parts, thin enough to see through (dithered, only there);
- motion: the turbulence races upward; the base breathes slowly; the whole leans with the wind more the higher it is.

This draws three: a small fire on a log, a roaring blaze, and fire eating a broadleaf crown from one side. Shown as an
animation.

  python tools/art_study/fire_study.py OUT.webp
"""
import sys
import numpy as np
from PIL import Image

_P = np.random.default_rng(5).random((1024, 1024))
B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16.0 + 1 / 32


def vn(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 1024, b % 1024]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def fbm(x, y):
    return vn(x, y) * 0.5 + vn(x * 2.03 + 7, y * 2.03 + 3) * 0.3 + vn(x * 4.1 + 1, y * 4.1 + 9) * 0.2


def hexc(s):
    s = s.lstrip("#")
    return [int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)]


FIRE = np.array([hexc(c) for c in ("#2a1410", "#5a1a0c", "#9a2a0c", "#d0500e", "#f08a1c", "#ffc040", "#fff0a8", "#fffbe8")])


def fire_field(xx, yy, base_pts, height, t, wind=-0.35, seed=0.0, breath=1.0):
    """the heat of a fire at each pixel: 0 nothing .. 1 white core.
    base_pts: the fuel's line (x, y) the fire stands on; height: px; wind: lean (px per px of rise, by height^2)"""
    heat = np.zeros_like(xx)
    bp = np.array(base_pts, float)
    # the fuel line: for each pixel, how far along and above it (taking the line as roughly horizontal)
    xs, ys = bp[:, 0], bp[:, 1]
    base_y = np.interp(xx, xs, ys, left=-9999, right=-9999)
    base_y = np.where(base_y < -9000, np.nan, base_y)
    rise = (base_y - yy) / height                                    # 0 at the fuel .. 1 at the reach
    span = (xs.max() - xs.min()) / 2
    cx = (xs.max() + xs.min()) / 2
    # the lean: the higher, the further downwind; a slow sway
    rise = np.nan_to_num(rise, nan=-1.0)
    lean = wind * height * np.clip(rise, 0, None) ** 2 + np.sin(t * 1.7 + seed + rise * 2) * np.clip(rise, 0, None) * 4
    # the turbulence races upward faster than the flame and is warped sideways, so licks stretch and tear
    q = (xx - lean) * 0.07
    r_ = yy * 0.045 + t * 2.4
    warp = fbm(q * 0.6 + seed, r_ * 0.5) * 2.0
    turb = fbm(q * 1.2 + warp + seed * 3, r_ * 1.1 - warp * 0.4)
    licks = fbm(q * 2.6 + seed, r_ * 2.0 + t * 1.5)
    # the body: wide at the fuel, narrowing irregularly as it rises
    across = np.abs(xx - lean - cx) / max(span, 1)
    width_k = 1.0 - np.clip(rise, 0, 1) * 0.75 + (turb - 0.5) * 0.5
    body = np.clip(1.15 - across / np.maximum(width_k, 0.05), 0, 1)
    # the heat: strongest low and central; lifted by the turbulence; torn into licks higher up
    core_ = np.exp(-(across / 0.35) ** 2) * np.exp(-((rise - 0.12) / 0.16) ** 2)   # a small hot heart, low and central
    h_ = body * (1 - np.clip(rise, 0, 1.4) * 0.85) * 1.02 * breath + core_ * 0.32
    h_ += (turb - 0.5) * 0.9 * np.clip(rise + 0.2, 0, 1)
    h_ -= np.clip(rise - 0.25, 0, 1) * (1 - licks) * 0.9                # licks: gaps tear open, pieces break off
    h_ = np.where(np.isnan(base_y) | (rise < -0.06), 0, h_)
    h_ -= np.clip(-rise, 0, 1) * 8                                   # nothing below the fuel
    return np.nan_to_num(np.clip(h_, 0, 1.2), nan=0.0)


def paint_fire(rgb, heat, bay):
    """heat to colour: a small white core, yellow, orange, a red edge; the coolest parts thin and see-through"""
    lv = np.clip(heat ** 1.25 * 7.4 - 0.3 + (bay - 0.5) * 0.5, -1, 7.99)
    solid = lv >= 1.0
    thin = (lv >= 0.0) & (lv < 1.0) & (bay < lv * 0.7 + 0.1)    # the cool edge: dithered, the night through it
    idx = np.clip(lv.astype(int), 0, 7)
    out = rgb.copy()
    out[solid] = FIRE[idx[solid]]
    out[thin] = out[thin] * 0.35 + FIRE[np.clip(idx[thin] + 1, 0, 7)] * 0.65
    return out


def glow(rgb, heat, k=0.5):
    """the fire's light on the night round it: a soft stepped warm halo"""
    from scipy import ndimage
    g = ndimage.gaussian_filter(heat, 9)
    lv = np.round(np.clip(g * 2.2, 0, 0.6) * 5) / 5
    return rgb * (1 - lv[..., None] * k) + rgb * np.array([2.2, 1.3, 0.6]) * lv[..., None] * k + np.array([0.12, 0.04, 0.0]) * lv[..., None]


def frame(t, W=360, H=200):
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    bay = B4[yy.astype(int) % 4, xx.astype(int) % 4]
    rgb = np.zeros((H, W, 3)) + np.array(hexc("#0a0809"))
    rgb[yy > 170] = np.array(hexc("#14100e"))
    # 1. a small fire on a log
    log = (np.abs(yy - 168) < 4) & (np.abs(xx - 60) < 26)
    h1 = fire_field(xx, yy, [(36, 165), (84, 165)], 46, t, seed=1.0, breath=0.95 + 0.05 * np.sin(t * 3))
    # 2. a roaring blaze
    h2 = fire_field(xx, yy, [(120, 172), (150, 168), (190, 170), (230, 172)], 150, t, seed=4.0, breath=1.0 + 0.06 * np.sin(t * 2.3))
    # 3. a broadleaf crown, fire eating it from its right side
    crown_c = (300, 96)
    cd = np.hypot((xx - crown_c[0]) / 40, (yy - crown_c[1]) / 30)
    crown = cd < 0.85 + (vn(xx * 0.18, yy * 0.18) - 0.5) * 0.5
    trunk = (np.abs(xx - 300 - (yy - 170) * 0.05) < 3.5 - (170 - yy) * 0.01) & (yy > 110) & (yy < 172)
    fuel3 = [(272, 92), (284, 80), (300, 72), (318, 70), (334, 78), (342, 92)]
    h3 = fire_field(xx, yy, fuel3, 62, t, seed=7.0) * np.clip((xx - 278) / 34, 0, 1) ** 1.5
    heat = np.maximum(np.maximum(h1, h2), h3)
    rgb = glow(rgb, heat)
    rgb[log] = np.array(hexc("#2a1810")) * (1 + (np.sin(xx[log] * 0.9 + t * 2) > 0.7)[:, None] * np.array([3.0, 1.4, 0.4]))
    rgb[trunk] = np.array(hexc("#1a110c"))
    leaf = crown & ~(h3 > 0.2)
    lv = np.clip(0.25 + (vn(xx * 0.3, yy * 0.3) - 0.5) * 0.4 + np.clip((xx - 290) / 60, 0, 1) * 0.5, 0, 0.99)
    leafc = np.array([hexc(c) for c in ("#070806", "#0f120c", "#1a1d12", "#2e2414", "#4a2a12")])
    rgb[leaf] = leafc[(lv[leaf] * 5).astype(int)]
    ember = crown & ~(h3 > 0.2) & (vn(xx * 0.12 + t * 0.3, yy * 0.12 - t * 0.6) > 0.58) & (xx > 288)
    ev = vn(xx * 0.5 + t * 2, yy * 0.5)
    rgb[ember] = np.where((ev[ember] > 0.6)[:, None], FIRE[4], FIRE[2])        # the crown smouldering in patches
    rgb = paint_fire(rgb, heat, bay)
    return np.clip(rgb, 0, 1)


def main(out):
    ims = [Image.fromarray((frame(i / 12.0) * 255).astype(np.uint8)).resize((360 * 3, 200 * 3), Image.NEAREST) for i in range(36)]
    ims[0].save(out, save_all=True, append_images=ims[1:], duration=83, loop=0, quality=88)
    ims[6].save(out.replace(".webp", ".png"))
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "fire_study.webp")
