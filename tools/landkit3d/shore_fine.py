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
import os
TIME = float(os.environ.get("GM_T", "0"))           # the loop's time 0..1 (the animation frames)
SWASH_RUN = 1.2 * math.sin(2 * math.pi * TIME)       # the swash runs up and draws back once a loop


def swash_limit(t):
    """how far up the beach the swash runs, in lobes set by the cusps"""
    return 62.6 + (F3.fbm(t * 0.21 + 3.0, 1.0 + TIME * 0.0, 45.0) - 0.5) * 2.6 - SWASH_RUN


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


LAM = 0.62                                         # a ripple's spacing on the dry black sand, in yards
_dr = np.random.default_rng(12)
DISLOC = [(_dr.uniform(44, 60), _dr.uniform(-12, 12), 1 if k % 2 else -1) for k in range(14)]


def ripple_phase(s, t):
    """as the dune's (painted_dune.ripple_phase): the one wind goes out to sea, so the crests run along the shore; they
    wander on a slow warp and fork where the phase tears round a dislocation, two crests running into one"""
    # (no forced forks: their pinwheels bent the crests into chevrons; the slow warp alone makes them wander)
    return s / LAM + (F3.fbm(s * 0.16, t * 0.12, 41.0) - 0.5) * 2.2 + (F3.vnoise(t * 0.5 + 4, s * 0.2, 42.0) - 0.5) * 0.8


def ripple_profile(r):
    """the stoss rises gently over 72% of a wavelength (from the land, where the wind comes from), the lee drops"""
    return np.where(r < 0.72, r / 0.72, (1 - r) / 0.28)


def rippled(s, t):
    """the ripples fade on the smooth brows and where the sand is damp (patches, not everywhere)"""
    dry = 1.0 - F3.smooth(S.FORE_S - 3.0, S.FORE_S - 0.5, s)
    return dry * (s > S.BACK_S) * F3.smooth(0.38, 0.55, F3.fbm(s * 0.3 + 7, t * 0.3, 43.0))


def detail(s, t):
    r = ripple_phase(s, t) % 1.0
    rip = (ripple_profile(r) - 0.5) * 0.085 * rippled(s, t)
    lim = swash_limit(t)
    ridge = 0.0 * lim                                             # no drawn swash lines
    dep, mask = _prints(s, t)
    return rip + ridge - dep, mask


def maps(x, y):
    M = S.maps(x, y)
    s, t = M["s"], M["t"]
    dh, prints = detail(s, t)
    M["h"] = M["h"] + dh
    M["print"] = prints.astype(float)
    M["swash"] = ((s > swash_limit(t)) & (s < WATERLINE + 2.0)).astype(float)
    M["ripple"] = ripple_phase(s, t) % 1.0
    M["rippled"] = rippled(s, t)
    return M


def height(x, y):
    return maps(x, y)["h"]


def water(s, t):
    """the Red Water's surface: long swells running in, steepening to a line of breakers that fold late, slack toward
    the shore; up the beach the thin swash sheet over the sand to its lobed limit; elsewhere under the sand (hidden)"""
    x, y = S.xy(s, t)
    g = height(x, y)
    a = 0.5 * F3.smooth(WATERLINE + 2.5, WATERLINE + 9.0, s)        # the shallows lie slack: a clean waterline
    ph = 2 * math.pi * ((s + 0.4 * np.sin(t / 7.0) + 0.6 * F3.vnoise(t * 0.08, 2.0)) / 9.0 + TIME)   # one swell a loop
    swell = a * ((0.5 + 0.5 * np.sin(ph)) ** 2.2 - 0.3)
    # a second set crossing at an angle, shorter: the sea heavy and irregular, never even bands
    ph2 = 2 * math.pi * ((s * math.cos(0.45) + t * math.sin(0.45)) / 5.5 + TIME * 2)
    swell = swell + a * 0.35 * ((0.5 + 0.5 * np.sin(ph2 + 1.3)) ** 2 - 0.3)
    bs = 73.8 + 0.8 * np.sin(t / 5.0)                              # the breaker line, out past the swash
    d = s - bs
    crest = 0.35 * np.where(d < 0, np.exp(-(d / 0.9) ** 2), np.exp(-(d / 1.8) ** 2))   # the curl itself is 3D
    sea = swell + crest * F3.smooth(WATERLINE + 3.5, WATERLINE + 6.0, s)
    film = g + 0.02
    up = (s > swash_limit(t)) & (g >= sea)
    return np.where(g < sea, sea, np.where(up, film, g - 0.3)), crest
