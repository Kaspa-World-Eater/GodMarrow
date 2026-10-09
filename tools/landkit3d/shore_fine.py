"""The Red Shore's ground at the scale of a footprint (tools/landkit/passes/red_water_sand.md): shore_floor's bands with
the sand's own small forms as real height, for meshes fine enough to hold them (0.06 yd):
  the dry sand's wind ripples (the one wind goes out to sea, so the crests run along the shore, their steep faces
  seaward), fading where the sand is damp;
  the swash's lobed limits, each a thin ridge of what it dropped;
  the footprints coming up out of the water (the area page): bare, a trail from the waterline up the wet sand, each
  print a shallow hollow that holds a little of the red.
Also the sea's surface (water()), shared by the build and the paint so the paint knows how deep the red is anywhere."""
import math
import numpy as np
import shore_floor as S
import floor3d as F3

# the trail of prints (s, t): from where the water is to the dry sand, wandering a little
TRAIL = [(65.5, 3.5), (61.0, 2.4), (57.0, 1.0), (53.5, -0.6), (50.5, -2.4)]
STEP = 0.72                                        # a stride
WATERLINE = 66.0                                   # where the sand meets the red at this tide


def swash_limit(t):
    """how far up the beach the swash runs, in lobes set by the cusps"""
    return 62.6 + 0.9 * np.cos(2 * math.pi * t / 9.0) + 0.3 * np.sin(t / 2.3)


def _prints(s, t):
    dep = np.zeros(np.shape(s))
    mask = np.zeros(np.shape(s), bool)
    k = 0
    for (s0, t0), (s1, t1) in zip(TRAIL[:-1], TRAIL[1:]):
        ln = math.hypot(s1 - s0, t1 - t0)
        ds, dt = (s1 - s0) / ln, (t1 - t0) / ln
        n = int(ln / STEP)
        for i in range(n):
            side = 1 if k % 2 else -1
            k += 1
            cs = s0 + ds * (i + 0.5) * STEP - dt * 0.0 + (-dt) * 0.0
            ct = t0 + dt * (i + 0.5) * STEP
            # the foot sits a hand to the side of the line it walks
            cs += -dt * side * 0.11
            ct += ds * side * 0.11
            u = ((s - cs) * ds + (t - ct) * dt) / 0.14             # along the foot
            v = (-(s - cs) * dt + (t - ct) * ds) / 0.06
            q = u * u + v * v
            heel = np.clip(1 - q, 0, 1)
            dep = np.maximum(dep, heel ** 0.6 * (0.045 if s0 > 55 else 0.035))
            mask |= q < 1.0
    return dep, mask


def detail(s, t):
    dry = 1.0 - F3.smooth(S.FORE_S - 1.5, S.FORE_S + 1.0, s)
    dry = dry * (s > S.BACK_S)
    ph = s / 0.34 + 0.7 * np.sin(t * 0.7) + 2.0 * F3.vnoise(t * 0.25, s * 0.25)
    f = ph - np.floor(ph)
    saw = np.where(f < 0.7, f / 0.7, (1 - f) / 0.3)                 # gentle windward slope, steep lee face seaward
    rip = (saw - 0.5) * 0.065 * dry * (0.5 + 0.5 * F3.vnoise(s * 0.6, t * 0.6))
    lim = swash_limit(t)
    ridge = 0.012 * np.exp(-((s - lim) / 0.05) ** 2) * (s > S.FORE_S)
    dep, mask = _prints(s, t)
    return rip + ridge - dep, mask


def maps(x, y):
    M = S.maps(x, y)
    s, t = M["s"], M["t"]
    dh, prints = detail(s, t)
    M["h"] = M["h"] + dh
    M["print"] = prints.astype(float)
    M["swash"] = ((s > swash_limit(t)) & (s < WATERLINE + 2.0)).astype(float)
    return M


def height(x, y):
    return maps(x, y)["h"]


def water(s, t):
    """the Red Water's surface: long swells running in, steepening to a line of breakers that fold late, slack toward
    the shore; up the beach the thin swash sheet over the sand to its lobed limit; elsewhere under the sand (hidden)"""
    x, y = S.xy(s, t)
    g = height(x, y)
    a = 0.5 * F3.smooth(WATERLINE + 2.5, WATERLINE + 9.0, s)        # the shallows lie slack: a clean waterline
    ph = 2 * math.pi * (s + 0.4 * np.sin(t / 7.0) + 0.6 * F3.vnoise(t * 0.08, 2.0)) / 9.0
    swell = a * ((0.5 + 0.5 * np.sin(ph)) ** 2.2 - 0.3)
    bs = 73.8 + 0.8 * np.sin(t / 5.0)                              # the breaker line, out past the swash
    d = s - bs
    crest = 0.6 * np.where(d < 0, np.exp(-(d / 0.7) ** 2), np.exp(-(d / 1.8) ** 2))    # steep landward face
    sea = swell + crest * F3.smooth(WATERLINE + 3.5, WATERLINE + 6.0, s)
    film = g + 0.02
    up = (s > swash_limit(t)) & (g >= sea)
    return np.where(g < sea, sea, np.where(up, film, g - 0.3)), crest
