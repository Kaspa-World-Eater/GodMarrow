"""Rain (landkit effect; MASTER_RULES 8.4 "water: ripples, reflections, rain rings"). First made for the Blind Face at
night (Derek 2026-10-07: "this scene at night with a gentle breeze blowing and a very light rain"; then the law: "weather
happens in the world, not on the world", MASTER_RULES 6).

The real thing, at night:
- light rain is nearly invisible: a drop shows only where light catches it, as a short slanting streak;
- the CANOPY SHELTERS: in the open, the fine rain; under the trees, little comes through, gathered on the leaves into
  sparse heavier drips;
- every drop LANDS SOMEWHERE AND DOES SOMETHING THERE: on still liquid it rings (flattened by the view); on ground,
  stone, bone or stump it splashes a small crown;
- what it falls on is WET: darker, and catching the lantern and the moon in broken wet dabs (the painted standard:
  light broken into dabs, not a smooth sheen); water runs down the trunks along their channels (stemflow), beads
  trickling down where the light finds them. Hollows and niches stay dry.
The effects method: whole pixels, a short cool ramp, lit by the scene's own light, hidden by whatever stands nearer.

  drops(seed, centre, n, span, top, openness)  -> the rain (fixed drops, each its own phase: a seamless loop)
  draw(img, to_px, dep, st, T, light, wind, ground, on_pool, sky_ok)          the falling, the rings, the splashes
  wet(img, L, px, py, pz, T, ground_m, bark_m, trunk_c, dry_m)                the world made wet (before the grade)
"""
import numpy as np
from kit import vn

FALLS = 3                                    # each drop falls this many times a loop (the loop stays seamless)
STREAK = np.array([0.6, 0.66, 0.76])
RING = np.array([0.62, 0.5, 0.52])
SPLASH = np.array([0.66, 0.7, 0.78])


def drops(seed, centre, n=520, span=10.0, top=7.0, openness=None):
    """openness(x, y) -> 0 (closed canopy) .. 1 (open sky): the open gets the fine rain, the closed only drips"""
    rr = np.random.default_rng(seed)
    x = centre[0] + rr.uniform(-span, span, n)
    y = centre[1] + rr.uniform(-span, span, n)
    op = np.array([openness(a, b) for a, b in zip(x, y)]) if openness else np.ones(n)
    keep = rr.uniform(0, 1, n) < 0.18 + op * 0.82
    drip = op < 0.45                                                        # under the leaves: gathered into drips
    return dict(x=x[keep], y=y[keep], ph=rr.uniform(0, 1, n)[keep], drip=drip[keep], top=top, n=int(keep.sum()))


def draw(img, to_px, dep, st, T, light, wind=(0.35, -0.35), ground=None, on_pool=None):
    GH, GW = img.shape[:2]
    out = img.copy()
    f = (T * FALLS + st["ph"]) % 1.0                                        # how far down its fall each drop is
    xl = st["x"] + wind[0]                                                  # where each lands (the same every fall)
    yl = st["y"] + wind[1]
    gl = np.array([ground(a, b) for a, b in zip(xl, yl)]) if ground else np.zeros(st["n"])
    g0 = np.array([ground(a, b) for a, b in zip(st["x"], st["y"])]) if ground else np.zeros(st["n"])
    x = st["x"] + wind[0] * f
    y = st["y"] + wind[1] * f
    z = g0 + (gl - g0) * f + st["top"] * (1 - f)
    for i in range(st["n"]):
        drip = st["drip"][i]
        # ---- the drop, falling: seen only where light catches it
        if z[i] - gl[i] > 0.05:
            lv = light(x[i], y[i], z[i])
            if lv >= 0.08:
                dz = st["top"] * (0.16 if drip else 0.11)
                sx0, sy0 = to_px((x[i], y[i], z[i]))
                sx1, sy1 = to_px((x[i] - wind[0] * 0.11, y[i] - wind[1] * 0.11, z[i] + dz))
                L = int(max(abs(sx1 - sx0), abs(sy1 - sy0))) + 1
                for k in range(min(L, 6 if drip else 5)):
                    u = k / max(L - 1, 1)
                    px_, py_ = int(round(sx0 + (sx1 - sx0) * u)), int(round(sy0 + (sy1 - sy0) * u))
                    if 0 <= py_ < GH and 0 <= px_ < GW and x[i] + y[i] >= dep[py_, px_] - 0.05:
                        a = lv * ((0.8 if drip else 0.65) if k == 0 else 0.4 * (1 - u))
                        out[py_, px_] = np.clip(out[py_, px_] * (1 - a * 0.5) + STREAK * a, 0, 1)
        # ---- where it lands, it does something: a ring on liquid, a crown on anything else
        age = f[i] / 0.35                                                   # just after its last landing
        if age >= 1.0:
            continue
        lp = (xl[i], yl[i], gl[i])
        lv = light(*lp)
        sx, sy = to_px(lp)
        ix, iy = int(round(sx)), int(round(sy))
        if not (0 <= iy < GH and 0 <= ix < GW) or xl[i] + yl[i] < dep[iy, ix] - 0.3:
            continue                                                        # it landed behind something
        if on_pool is not None and on_pool(xl[i], yl[i]):
            rad = 0.6 + age * (3.6 if drip else 2.8)
            for a in np.linspace(0, 2 * np.pi, 18, endpoint=False):
                px_, py_ = int(round(sx + np.cos(a) * rad)), int(round(sy + np.sin(a) * rad * 0.5))
                if 0 <= py_ < GH and 0 <= px_ < GW:
                    k = (1 - age) * max(lv, 0.15) * (0.55 if np.sin(a) < 0 else 0.3)     # the far rim catches the light
                    out[py_, px_] = np.clip(out[py_, px_] * (1 - k * 0.4) + RING * k * 0.5, 0, 1)
        elif age < 0.25 and lv > 0.12:                                      # a crown: a few beads thrown up and out
            s = age / 0.25
            for (dx, dy) in ((-1, -1), (1, -1), (0, -2)) if drip else ((-1, -1), (1, -1)):
                px_, py_ = ix + int(round(dx * (1 + s))), iy + int(round(dy * (1 - s * 0.5)))
                if 0 <= py_ < GH and 0 <= px_ < GW:
                    k = (1 - s) * lv * 0.6
                    out[py_, px_] = np.clip(out[py_, px_] * (1 - k * 0.5) + SPLASH * k, 0, 1)
    return out


def wet(img, L, px, py, pz, T, ground_m, bark_m, trunk_c, dry_m=None, amount=1.0):
    """the world made wet by the rain (before the scene's grade):
    - every rained-on surface a little darker (wet absorbs);
    - flat wet ground and tops catch the lantern (warm) and the moon (cool) in broken dabs;
    - on the trunks, stemflow: water films down the channels, beads trickling down where the light finds them.
    trunk_c(px, py) -> (angle round the trunk, its girth) for bark pixels; dry_m: what stays dry (hollows, niches)"""
    n = L["n"]
    lamp = np.clip(L["lamp"], 0, 1.5)
    moon = np.clip(L["moon"], 0, 1)
    rained = (ground_m | bark_m) if dry_m is None else (ground_m | bark_m) & ~dry_m
    out = img.copy()
    out[rained] = out[rained] * (1 - 0.12 * amount)
    up = np.clip(n[..., 2], 0, 1)
    dab = (vn(px * 9.0, py * 9.0) > 0.55) & (vn(px * 23 + 3, py * 23) > 0.4)          # the wet film, broken
    warm = rained & ground_m & dab & (lamp > 0.22) & (up > 0.6)
    out[warm] = np.clip(out[warm] + np.array([0.5, 0.4, 0.28]) * (lamp[warm] ** 1.5 * 0.35 * amount)[:, None], 0, 1)
    cool = rained & ground_m & dab & (moon > 0.45) & (up > 0.7) & ~warm
    out[cool] = np.clip(out[cool] + np.array([0.3, 0.36, 0.46]) * (moon[cool] * 0.18 * amount)[:, None], 0, 1)
    if bark_m.any():
        ang, r = trunk_c(px, py)
        arc = ang * r
        film = bark_m & (vn(arc * 16.0, pz * 0.4) > 0.7)                   # water films running down the channels
        lit = np.clip(moon * 0.6 + lamp, 0, 1)
        out[film] = np.clip(out[film] * 0.85 + np.array([0.12, 0.13, 0.16]) * lit[film][:, None] * amount, 0, 1)
        bead = film & (((pz * 0.9 + T * 2 + vn(arc * 7, 1.0) * 3.0) % 1.0) < 0.07) & (lit > 0.2)
        out[bead] = np.clip(out[bead] + np.array([0.4, 0.43, 0.5]) * lit[bead][:, None] * 0.6, 0, 1)
    return out
