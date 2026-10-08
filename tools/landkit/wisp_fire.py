"""Wisp-fire on the blood (landkit effect), for the Blind Face's pools (Derek 2026-10-07: "dark blood with the
occasional wisp of white fire flaring up as a small will-o'-the-wisp, St. Elmo's fire thingy"). The game calls it
wisp-fire (never an animal word). Now and then, over a pool of the god's blood, a small cold flame stands up off the
surface, flickers, leans with the air, and goes out.

The effects method (MASTER_RULES 6): a value field (the flame's teardrop, torn by moving noise) snapped to a short ramp
(white core, pale blue-white, a dim blue-grey edge) with the 4x4 ordered dither only at its border, in whole pixels.
It lights what is round it (a pale cold pool on the blood beneath, a few pixels) and shows in the blood below it as a
broken reflection. Restrained: small, rare, one or two burning at a time.

  draw(img, to_px, dep, wisps, T, pool=None)   wisps: [(x, y, z, phase, seed)]; pool(sx, sy) -> True on the blood
"""
import numpy as np
from kit import vn

B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
CORE = np.array([0.96, 0.97, 1.0])
BODY = np.array([0.72, 0.8, 0.96])
EDGE = np.array([0.36, 0.42, 0.58])
GLOW = np.array([0.2, 0.23, 0.3])
LIFE = 0.3                                   # a wisp burns for this share of the loop, then rests


def draw(img, to_px, dep, wisps, T, pool=None):
    GH, GW = img.shape[:2]
    for (x, y, z, ph, sd) in wisps:
        life = ((T + ph) % 1.0) / LIFE
        if life >= 1.0:
            continue
        env = np.sin(np.pi * life) ** 0.7                                   # it flares, burns, and goes out
        sx, sy = to_px((x, y, z))
        hgt = 3.0 + 5.0 * env                                              # px tall
        wid = 1.2 + 1.3 * env
        lean = np.sin(T * 6.283 * 2 + sd) * 0.8 * env
        x0, x1 = int(sx - 6), int(sx + 7)
        y0, y1 = int(sy - hgt - 3), int(sy + 6)
        x0, x1, y0, y1 = max(x0, 0), min(x1, GW), max(y0, 0), min(y1, GH)
        if x0 >= x1 or y0 >= y1:
            continue
        ys, xs = np.mgrid[y0:y1, x0:x1]
        if (x + y) < dep[int(np.clip(sy, 0, GH - 1)), int(np.clip(sx, 0, GW - 1))] - 0.6:
            continue                                                       # hidden behind something nearer
        # the cold glow on the blood round its foot, and its broken reflection below
        dd = np.hypot((xs - sx) / 1.6, (ys - sy) * 1.0)
        g = np.clip(1 - dd / 6.0, 0, 1) ** 2 * env * 0.9
        on = np.ones(xs.shape, bool) if pool is None else pool(xs, ys)
        d = B4[ys % 4, xs % 4]
        gm = on & (g > d * 0.6 + 0.12)
        img[ys[gm], xs[gm]] = np.clip(img[ys[gm], xs[gm]] + GLOW * g[gm][:, None] * 1.5, 0, 1)
        refl = on & (ys > sy) & (ys < sy + hgt * 0.6) & (np.abs(xs - sx) < wid) & ((ys + xs) % 2 == 0)
        img[ys[refl], xs[refl]] = np.clip(img[ys[refl], xs[refl]] * 0.5 + BODY * 0.35 * env, 0, 1)
        # the flame: a teardrop standing up, torn at its tip by moving noise
        u = (xs - sx - lean * np.clip((sy - ys) / hgt, 0, 1)) / wid
        w = (sy - ys) / hgt                                                 # 0 at its foot, 1 at the tip
        shape = 1 - np.sqrt(u ** 2 / np.clip(1 - w, 0.05, 1) ** 1.4 + ((w - 0.3) / 0.75) ** 2)
        tear = (vn(xs * 0.9 + sd, ys * 0.9 + np.sin(2 * np.pi * T * 6) * 3.0) - 0.5) * 0.5 * np.clip(w, 0, 1)
        val = np.where((w > -0.15) & (w < 1.15), shape + tear, -1)
        col = np.where((val > 0.55)[..., None], CORE, np.where((val > 0.28)[..., None], BODY, EDGE))
        edge = (val > 0.0) & (val < 0.12)
        draw_m = (val > 0.12) | (edge & (d < 0.5))                          # dither only at its border
        img[ys[draw_m], xs[draw_m]] = col[draw_m] * (0.6 + 0.4 * env)
    return img
