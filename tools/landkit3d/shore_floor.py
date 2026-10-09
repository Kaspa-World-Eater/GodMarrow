"""The Red Shore's ground, by cause (chapter 10, the Olympic coast; tools/landkit/passes/red_shore_village.md): one
function gives the true height in yards and the cause maps at any world point, shared by the 3D build (village3d:
the ground mesh, and the feet of everything on it) and the painter (paint3d, through the passes' "floor" name).

The coast runs across the screen: s is the distance seaward (the Red Water at the top of the screen), t the distance
along the shore. From the sea inland, the bands of a temperate rainforest coast:
  s > 40      the Red Water over a sea floor going down
  32 to 40    the foreshore: black sand, wet and glossy, beach cusps and backwash rills
  26 to 32    the dry black sand, a cobble berm at the old high water
  20 to 26    the storm line, where the drift logs lie
  17 to 20    the backshore: dune grass and salal
  14 to 17    a low bluff (Derek: "pretty coastal"), raw and steep
  below 14    the terrace: the village's kept ground, then the old growth's floor
A river comes down from the forest on the left, cuts a ravine through the terrace and the bluff, and braids across the
sand to the red. Pure numpy, so it runs in Blender's Python and in ours.
"""
import math
import numpy as np
import floor3d as F3                                  # the old growth's own floor (windthrows, cushions) inland

R2 = math.sqrt(2.0)
VILLAGE = (-6.0, 0.0, 27.0)                          # the village's centre (s, t) and the kept ground's radius
# the bands (Derek: much of the area is the sand and the coast): where each begins, going inland from the sea
SEA_S, FORE_S, DRY_S, LOGS_S, BACK_S, BLUFF_S = 66.0, 52.0, 42.0, 32.0, 26.0, 22.0
GATE = (17.1, -14.5)                                  # the palisade's gate (s, t), facing the way down
PATH = [GATE, (19.8, -20.0), (22.8, -25.5), (27.5, -27.5), (34.0, -26.0)]


def st(x, y):
    return -(x + y) / R2, (x - y) / R2


def xy(s, t):
    return (t - s) / R2, (-s - t) / R2


def _smooth(e0, e1, v):
    return F3.smooth(e0, e1, v)


def river_t(s):
    """the river's line along the shore: it comes down on the left and swings as it crosses the sand"""
    return -31.0 + 3.0 * np.sin(s / 9.0) + np.where(s > BACK_S, (s - BACK_S) * 0.25, 0.0)


def river_bed(s):
    return np.interp(s, [-60, -10, 20, 25, 34, 52, 66, 90], [6.6, 5.0, 3.2, 1.6, 1.0, 0.4, -0.1, -1.2])


def profile(s):
    """the land's height across the bands, before the river and the village"""
    sea = -(s - SEA_S) * 0.06
    fore = (SEA_S - s) / (SEA_S - FORE_S) * 1.0
    dry = 1.0 + (FORE_S - s) / (FORE_S - DRY_S) * 0.6
    logs = 1.6 + (DRY_S - s) / (DRY_S - LOGS_S) * 0.6
    back = 2.2 + (LOGS_S - s) / (LOGS_S - BACK_S) * 0.4
    k = np.clip((BACK_S - s) / (BACK_S - BLUFF_S), 0, 1)
    bluff = 2.6 + 4.6 * (k * k * (3 - 2 * k)) ** 0.7               # a raw face, steepest near its lip
    terr = 7.2 + (BLUFF_S - s) * 0.035
    return np.select([s >= SEA_S, s >= FORE_S, s >= DRY_S, s >= LOGS_S, s >= BACK_S, s >= BLUFF_S],
                     [sea, fore, dry, logs, back, bluff], terr)


def maps(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    s, t = st(x, y)
    h = profile(s)
    # the sand's own shapes: beach cusps in the swash, a cobble berm at the old high water, rills down the foreshore
    swash = _smooth(FORE_S, FORE_S + 3.0, s) * (1 - _smooth(SEA_S - 2.0, SEA_S + 0.5, s))
    h = h + swash * 0.06 * (F3.fbm(t * 0.12, s * 0.05, 44.0) - 0.5)        # cusps only as a faint unevenness
    berm = np.exp(-((s - (FORE_S - 1.0)) / 0.9) ** 2) * (0.4 + 0.3 * F3.vnoise(t * 0.3, 3.0))
    h = h + berm
    # (no drawn rills: real wet sand is smooth; Derek: "those curvy lines look ridiculous")
    # inland: the old growth's floor, gentled on the kept ground of the village
    vs, vt, vr = VILLAGE
    dv = np.hypot(s - vs, t - vt)
    kept = 1.0 - _smooth(vr - 3.0, vr + 4.0, dv)
    terrace = s < BLUFF_S
    old = F3._windthrows(x * 1.0 + 300.0, y * 1.0 - 200.0)[0] + (F3.fbm(x / 3.2, y / 3.2, 7.0) - 0.5) * 0.5
    old = old * _smooth(BLUFF_S - 1.0, BLUFF_S - 4.0, s)
    h = h + np.where(terrace, old * (1 - kept) + (F3.fbm(x * 0.8, y * 0.8, 9.0) - 0.5) * 0.05 * kept, 0.0)
    cush = F3._cushions(x, y, np.clip((1 - kept) * terrace * 1.0 + kept * terrace * 0.3, 0, 1))
    h = h + cush
    # the river: a ravine through the terrace and the bluff, braids across the sand
    rt = river_t(s)
    w = np.where(s < BLUFF_S - 2, 3.0, np.where(s < BACK_S + 3, 3.5 + (s - BLUFF_S + 2) * 0.6, 8.0 + (s - BACK_S - 3) * 0.3))
    d = np.abs(t - rt)
    bed = river_bed(s) - np.where(s > BACK_S, 0.12 * (np.abs(np.sin((t - rt) * 1.3)) < 0.4), 0.0)
    bank = np.clip(d / w, 0, 1)
    wall = np.where(s < BACK_S, bank ** 1.6, bank ** 1.2)
    cut = d < w
    h = np.where(cut, bed + (h - bed) * wall, h)
    river = (d < w * 0.55) & (s < SEA_S)
    # the path from the village's gate (on the water side, toward the river) to the ravine's bank and down to the sand
    path = np.zeros_like(h)
    for (s0, t0), (s1, t1) in zip(PATH[:-1], PATH[1:]):
        dd = F3._seg_d(s, t, s0, t0, s1, t1)
        path = np.maximum(path, _smooth(1.5, 0.5, dd))
    h = h - path * 0.08
    # the zones, for the paint
    sea = s >= SEA_S
    wet = np.clip((s - FORE_S + 0.5) / 4.0, 0, 1) * (s < SEA_S)
    sand = (s >= BACK_S) & ~sea
    grass = (s >= BACK_S) & (s < LOGS_S - 1.0)
    logs = (s >= LOGS_S) & (s < DRY_S)
    bluffm = (s >= BLUFF_S) & (s < BACK_S)
    wrack = ((np.abs(s - (FORE_S - 1.0 + 0.5 * F3.vnoise(t * 0.4, 1.0))) < 0.3)
             | (np.abs(s - (FORE_S - 4.5 + 0.8 * F3.vnoise(t * 0.25, 5.0))) < 0.22))
    return dict(h=h, s=s, t=t, kept=kept * terrace, wild=(1 - kept) * terrace, sand=sand.astype(float), wet=wet,
                grass=grass.astype(float), logs=logs.astype(float), bluff=bluffm.astype(float), river=river.astype(float),
                wrack=(wrack & sand).astype(float), path=path, sea=sea.astype(float), cushion=cush,
                litter=np.clip(0.45 * terrace * (1 - kept) + 0.3 * kept * terrace, 0, 1),
                moss=np.clip(0.5 * terrace, 0, 1), trench=np.zeros_like(h), hollow=np.zeros_like(h),
                mound=np.zeros_like(h), rubble=np.zeros_like(h), open=np.ones_like(h))


def height(x, y):
    return maps(x, y)["h"]
