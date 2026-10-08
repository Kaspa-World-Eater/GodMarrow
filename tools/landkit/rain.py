"""Rain (landkit effect; MASTER_RULES 8.4 "water: ripples, reflections, rain rings"). First made for the Blind Face at
night (Derek 2026-10-07: "this scene at night with a gentle breeze blowing and a very light rain").

The real thing, at night: light rain is nearly invisible. A drop is seen only where light catches it, as a short
slanting streak (its fall during the eye's moment): in the lantern's pool, in the moon's gap, near a candle. Dark air
shows nothing. The drops slant with the wind. Where they land on still liquid they ring (a small ring that opens and
fades, flattened by the view); on ground or bark, a pixel's flick. The effects method: whole pixels, a short cool ramp,
lit by the scene's own light, hidden by whatever stands nearer.

  drops(seed, centre, n, span, top)          -> the rain's state (fixed drops, each its own phase; a seamless loop)
  draw(img, to_px, dep, state, T, light, wind, ground, on_pool, rings)
      light(x, y, z) -> 0..1 how lit the air is there; wind: (x, y) yards of drift over a fall;
      ground(x, y) -> height; on_pool(x, y) -> True on still liquid; rings: [(x, y, z, phase)] where drops ring
"""
import numpy as np

FALLS = 3                                    # each drop falls this many times a loop (the loop stays seamless)
STREAK = np.array([0.6, 0.66, 0.76])
RING = np.array([0.62, 0.5, 0.52])


def drops(seed, centre, n=420, span=11.0, top=7.0):
    rr = np.random.default_rng(seed)
    return dict(x=centre[0] + rr.uniform(-span, span, n), y=centre[1] + rr.uniform(-span, span, n),
                ph=rr.uniform(0, 1, n), top=top, n=n)


def draw(img, to_px, dep, st, T, light, wind=(0.35, -0.35), ground=None, on_pool=None, rings=()):
    GH, GW = img.shape[:2]
    out = img.copy()
    f = (T * FALLS + st["ph"]) % 1.0                                       # how far down its fall each drop is
    g = np.array([ground(x, y) for x, y in zip(st["x"], st["y"])]) if ground else np.zeros(st["n"])
    z = g + st["top"] * (1 - f)
    x = st["x"] + wind[0] * f
    y = st["y"] + wind[1] * f
    dz = st["top"] * 0.11                                                   # the streak: its fall in the eye's moment
    for i in range(st["n"]):
        if z[i] - g[i] < 0.05:
            continue
        lv = light(x[i], y[i], z[i])
        if lv < 0.08:
            continue                                                        # dark air: unseen
        sx0, sy0 = to_px((x[i], y[i], z[i]))
        sx1, sy1 = to_px((x[i] - wind[0] * 0.11, y[i] - wind[1] * 0.11, z[i] + dz))
        L = int(max(abs(sx1 - sx0), abs(sy1 - sy0))) + 1
        for k in range(min(L, 5)):
            u = k / max(L - 1, 1)
            px_, py_ = int(round(sx0 + (sx1 - sx0) * u)), int(round(sy0 + (sy1 - sy0) * u))
            if 0 <= py_ < GH and 0 <= px_ < GW and x[i] + y[i] >= dep[py_, px_] - 0.05:
                a = lv * (0.65 if k == 0 else 0.4 * (1 - u))                # brightest at its head
                out[py_, px_] = np.clip(out[py_, px_] * (1 - a * 0.5) + STREAK * a, 0, 1)
    # rings on the still liquid: each opens over a short time and fades, flattened 2:1 by the view
    for (rx, ry, rz, ph) in rings:
        age = ((T * FALLS + ph) % 1.0) / 0.35
        if age >= 1.0:
            continue
        lv = max(light(rx, ry, rz), 0.15)
        sx, sy = to_px((rx, ry, rz))
        rad = 0.6 + age * 3.2
        for a in np.linspace(0, 2 * np.pi, 18, endpoint=False):
            px_, py_ = int(round(sx + np.cos(a) * rad)), int(round(sy + np.sin(a) * rad * 0.5))
            if 0 <= py_ < GH and 0 <= px_ < GW and (on_pool is None or on_pool(px_, py_)):
                k = (1 - age) * lv * (0.55 if np.sin(a) < 0 else 0.3)       # the far rim catches the light
                out[py_, px_] = np.clip(out[py_, px_] * (1 - k * 0.4) + RING * k * 0.5, 0, 1)
    return out
