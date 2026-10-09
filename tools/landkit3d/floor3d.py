"""The temple's forest floor, placed by cause (tools/art_study/ecosystems/old_growth_forest.md: pit and mound, the
floor in layers, litter drifting into pits and thinning on mounds, rain standing in old pits; rainforest.md: wet is
everything; chapter 09 and the area lore: the eight boundary stones mark the kept ground, the stair swept every morning
until the keepers were gone).

One function gives the true height in yards and the cause maps at any world point, so the 3D build (temple3d: the
ground mesh, and everything set on the ground takes its foot from the same height) and the painter (paint3d: what the
ground is made of) read the same floor. FORM IS LAW: every hummock, pit, bank and rut is real height here; the painter
only gives it its material. Pure numpy, so it runs in Blender's Python and in ours.

The causes, in the order they happened:
1. the old growth's floor: centuries of windthrows, each a pit where the roots stood and a slumped mound beside it where
   the root plate fell, all softened by humus; cushion moss over everything, thickest on the mounds;
2. the kept ground: inside the boundary stones the keepers levelled and swept the earth for centuries, so it lies lower
   than the forest's humus round it, and the sweepings banked up just outside the stones in a low ring;
3. the platform's runoff: the water sheeting off its tiers has cut a shallow trench along its foot, with a lip of
   splashed soil beyond;
4. the worn way: feet went from the stair's foot out toward the shore, and wore the moss off a sunken track;
5. the fallen roof: the tiles that slid off the wet side lie in a rubble bank against the platform's foot;
6. the one recent windthrow near the hall (a pit still holding rain) in the open ground on the wet side.
"""
import math
import numpy as np

# the boundary stones (temple3d.sema) stand at x = +-8.8, y = +-5.8; the kept ground runs a little beyond them
KEPT_X, KEPT_Y = 9.4, 6.4
KEPT_FALL = 2.4                         # yards over which the kept ground gives way to the forest's floor
KEPT_LOW = -0.13                        # how far below the forest's humus the swept ground lies
PLAT_X, PLAT_Y = 7.6, 4.7               # the platform's foot (temple3d.platform)
STAIR = (7.6, 10.2, 1.7)                # the stair and its serpents: x from, x to, half width
PATH = [(9.9, 0.0), (11.2, 0.35), (12.3, 1.6), (13.1, 3.8), (13.7, 6.8), (14.0, 10.0)]
RUBBLE = (-3.9, 2.1, 1.7)               # the tile bank against the wet side's foot: x from, x to, how far out
# the recent windthrow on the wet side: where the tree stood (its pit), the way it fell (its plate's slumped mound)
THROW = dict(pit=(-0.6, 10.6), fall=(-0.97, -0.24), pit_r=(1.35, 1.0), depth=0.55, mound_h=0.62, mound_r=(1.9, 1.05))


def _hash(ix, iy, s):
    h = np.sin(ix * 127.1 + iy * 311.7 + s * 74.7) * 43758.5453
    return h - np.floor(h)


def vnoise(x, y, s=0.0):
    xi, yi = np.floor(x), np.floor(y)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    a, b = _hash(xi, yi, s), _hash(xi + 1, yi, s)
    c, d = _hash(xi, yi + 1, s), _hash(xi + 1, yi + 1, s)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v


def fbm(x, y, s=0.0, o=3):
    a, f, tot, w = 0.0, 1.0, 0.0, 0.55
    for k in range(o):
        a = a + vnoise(x * f + k * 9.1, y * f + k * 4.7, s + k) * w
        tot += w
        f *= 2.07
        w *= 0.5
    return a / tot


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _bump(x, y, cx, cy, rx, ry, ang):
    """a soft mound with no edge: 1 at its centre, 0 past its radii (rx along ang, ry across it)"""
    c, s = np.cos(ang), np.sin(ang)
    dx, dy = x - cx, y - cy
    a = (dx * c + dy * s) / rx
    b = (-dx * s + dy * c) / ry
    q = np.clip(1.0 - (a * a + b * b), 0.0, 1.0)
    return q * q


def _seg_d(x, y, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    t = np.clip(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0.0, 1.0)
    return np.hypot(x - ax - t * vx, y - ay - t * vy)


def path_d(x, y):
    d = np.full(np.shape(x), 99.0)
    for (a, b) in zip(PATH[:-1], PATH[1:]):
        d = np.minimum(d, _seg_d(x, y, a[0], a[1], b[0], b[1]))
    return d


def plat_d(x, y):
    """distance from the platform's and the stair's foot (0 under them)"""
    d1 = np.hypot(np.maximum(np.abs(x) - PLAT_X, 0), np.maximum(np.abs(y) - PLAT_Y, 0))
    sx = np.maximum(np.maximum(STAIR[0] - x, x - STAIR[1]), 0)
    d2 = np.hypot(sx, np.maximum(np.abs(y) - STAIR[2], 0))
    return np.minimum(d1, d2)


def kept(x, y):
    """1 on the ground the keepers swept, 0 in the forest; its edge ragged where the moss crept in"""
    d = np.hypot(np.maximum(np.abs(x) - KEPT_X, 0), np.maximum(np.abs(y) - KEPT_Y, 0))
    d = d + (fbm(x * 0.35, y * 0.35, 3.0) - 0.5) * 1.6
    return 1.0 - smooth(0.0, KEPT_FALL, d)


def _windthrows(x, y):
    """the old growth's own relief: in each 6.5 yd cell, most often, one old windthrow, its pit where the roots stood and
    its root plate slumped to a mound on the side it fell; the older, the lower and wider. Returns (height, pit depth)"""
    h = np.zeros(np.shape(x))
    pit = np.zeros(np.shape(x))
    cs = 6.5
    ix0, iy0 = np.floor(x / cs), np.floor(y / cs)
    for oi in (-1, 0, 1):
        for oj in (-1, 0, 1):
            ix, iy = ix0 + oi, iy0 + oj
            here = _hash(ix, iy, 1.0) < 0.72
            cx = (ix + 0.2 + 0.6 * _hash(ix, iy, 2.0)) * cs
            cy = (iy + 0.2 + 0.6 * _hash(ix, iy, 3.0)) * cs
            ang = _hash(ix, iy, 4.0) * 2 * math.pi
            age = _hash(ix, iy, 5.0)
            mr = 1.2 + 1.1 * age
            pr = 0.9 + 0.6 * age
            mh = 0.8 - 0.45 * age
            pd = 0.46 - 0.26 * age
            ca, sa = np.cos(ang), np.sin(ang)
            mound = _bump(x, y, cx + ca * mr * 0.8, cy + sa * mr * 0.8, mr * 0.75, mr * 1.25, ang)
            hole = _bump(x, y, cx - ca * pr * 0.5, cy - sa * pr * 0.5, pr * 0.8, pr * 1.15, ang)
            h = h + np.where(here, mh * mound - pd * hole, 0.0)
            pit = pit + np.where(here, pd * hole, 0.0)
    return h, pit


def _throw(x, y):
    """the recent windthrow on the wet side: its pit still deep and holding rain, its plate slumped beside it"""
    px, py = THROW["pit"]
    fx, fy = THROW["fall"]
    ang = math.atan2(fy, fx)
    rx, ry = THROW["pit_r"]
    # the hole the roots tore out is ragged: lobed where the big roots came up, the lobes its own
    th = np.arctan2(y - py, x - px)
    lobes = 0.85 + 0.42 * fbm(np.cos(th) * 1.3 + 5.0, np.sin(th) * 1.3 + 2.0, 31.0, 2)
    hole = _bump(px + (x - px) / lobes, py + (y - py) / lobes, px, py, rx, ry * 1.25, ang) ** 0.7
    mrx, mry = THROW["mound_r"]
    mx, my = px + fx * (rx + mrx * 0.55), py + fy * (rx + mrx * 0.55)
    # the plate stood on edge across the fall line, so its mound is long across it and steep on the pit's side
    mound = _bump(x, y, mx, my, mry, mrx * 1.3, ang)
    steep = np.clip(1.0 + ((x - mx) * fx + (y - my) * fy) / mry * 0.35, 0.6, 1.2)
    return THROW["mound_h"] * mound * steep - THROW["depth"] * hole, THROW["depth"] * hole


def _cushions(x, y, amount):
    """cushion moss in colonies: where a colony has taken (the wet, the buried wood) the cushions crowd and grow into
    one another, many small and a few big; between colonies the floor is flat litter. amount (0..1) by place"""
    h = np.zeros(np.shape(x))
    cs = 0.75
    colony = smooth(0.42, 0.68, fbm(x * 0.22 + 4.0, y * 0.22 - 3.0, 19.0, 2))
    ix0, iy0 = np.floor(x / cs), np.floor(y / cs)
    for oi in (-1, 0, 1):
        for oj in (-1, 0, 1):
            ix, iy = ix0 + oi, iy0 + oj
            cx = (ix + 0.15 + 0.7 * _hash(ix, iy, 11.0)) * cs
            cy = (iy + 0.15 + 0.7 * _hash(ix, iy, 12.0)) * cs
            big = _hash(ix, iy, 13.0) ** 2.2
            r = 0.2 + 0.5 * big
            hh = 0.03 + 0.16 * big
            here = _hash(ix, iy, 15.0) < 0.15 + 0.8 * colony
            b = _bump(x, y, cx, cy, r, r * (0.7 + 0.5 * _hash(ix, iy, 16.0)), _hash(ix, iy, 17.0) * 3.0)
            h = np.maximum(h, np.where(here, hh * b, 0.0))
    return h * amount


def _rubble(x, y):
    """the tiles that slid off the fallen roof, banked against the wet side's foot: highest at the foot, ragged"""
    x0, x1, out = RUBBLE
    along = smooth(x0 - 0.6, x0 + 0.9, x) * (1 - smooth(x1 - 0.9, x1 + 0.6, x))
    d = np.maximum(y - PLAT_Y, 0.0)
    reach = out * (0.75 + 0.5 * fbm(x * 0.9, 3.0, 21.0))
    prof = np.clip(1.0 - d / reach, 0.0, 1.0) ** 1.4
    rough = 0.75 + 0.5 * vnoise(x * 3.1, y * 3.1, 22.0)
    return 0.62 * along * prof * rough * (y > PLAT_Y - 0.3)


def maps(x, y):
    """the floor at world points (yards): its height and what made it, every map 0..1 unless said"""
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    k = kept(x, y)
    wild = 1.0 - k
    # the forest's own floor: windthrows old and new, a long soft roll of humus over buried wood
    wt, pit = _windthrows(x, y)
    th, tpit = _throw(x, y)
    roll = (fbm(x / 3.2, y / 3.2, 7.0) - 0.5) * 0.5
    forest = wt + th + roll
    pd = plat_d(x, y)
    near = smooth(5.5, 1.0, pd)                                # the old windthrows end where the keepers' ground began
    forest = forest * (1.0 - 0.8 * near)
    # the kept ground: levelled and swept low; the sweepings banked just past the stones
    edge = np.hypot(np.maximum(np.abs(x) - KEPT_X, 0), np.maximum(np.abs(y) - KEPT_Y, 0))
    bank = 0.26 * np.exp(-((edge - 1.3) / 0.9) ** 2) * (0.7 + 0.6 * fbm(x * 0.5, y * 0.5, 8.0))
    swept = KEPT_LOW + (fbm(x * 0.8, y * 0.8, 9.0) - 0.5) * 0.04
    h = k * swept + wild * forest + bank
    # the platform's runoff: a trench along its foot and a lip of splashed soil beyond it
    trench = -0.075 * np.exp(-((pd - 0.28) / 0.17) ** 2) + 0.03 * np.exp(-((pd - 0.7) / 0.22) ** 2)
    h = h + trench * (pd > 0)
    # the worn way: sunk and smoothed, a rut down its middle where the water runs
    wd = path_d(x, y)
    worn = smooth(1.05, 0.35, wd)
    rut = smooth(0.28, 0.0, np.abs(wd - 0.18 * np.sin(x * 2.1)))
    h = h * (1 - worn * 0.85) + worn * (KEPT_LOW - 0.07) - rut * 0.03
    rub = _rubble(x, y)
    h = h + rub                                                # the tiles lie on whatever was there
    # the moss's cushions: thick on the wild floor and the mounds, few and small on the kept ground, none on the way
    mound = np.clip((wt + th) * 2.0, 0.0, 1.0)
    cush_amt = (0.35 + 0.65 * wild + 0.4 * mound) * (1 - worn) * (1 - smooth(0.05, 0.3, rub))
    cush = _cushions(x, y, np.clip(cush_amt, 0, 1.3))
    h = h + cush
    # the causes' own maps, for the paint
    pit_all = np.clip((pit * wild + tpit) / 0.35, 0.0, 1.0)
    trench_m = np.exp(-((pd - 0.28) / 0.2) ** 2) * (pd > 0)
    hollow = np.clip(pit_all + 0.6 * trench_m, 0.0, 1.0)
    # the litter: the keepers have been gone a few autumns, so the kept ground holds a thin fall; the forest's flats
    # more; the pits and the trench the most; the mounds shed it
    litter = np.clip(0.36 + 0.7 * hollow + 0.16 * wild - 0.55 * mound, 0.0, 1.0)
    litter = litter * (1 - worn * 0.9)
    moss = np.clip(0.35 + 0.6 * mound + 0.35 * np.clip(cush / 0.08, 0, 1) + 0.25 * wild - 0.5 * hollow, 0.0, 1.0)
    wet = np.clip(0.8 * hollow + 0.9 * worn * rut + 0.5 * trench_m, 0.0, 1.0)
    # the canopy: the giants stand back from the kept ground, so the sky reaches it; out under them it is dim
    sky_open = 1.0 - 0.3 * smooth(0.5, 7.0, edge)
    return dict(h=h, kept=k, wild=wild, litter=litter, moss=moss, cushion=cush, wet=wet, path=worn, rut=rut * worn, rubble=np.clip(rub / 0.3, 0, 1),
                hollow=hollow, mound=mound, open=sky_open, trench=trench_m)


def height(x, y):
    return maps(x, y)["h"]


def pools(x0, x1, y0, y1):
    """rain standing in the pits deep enough to hold it: (cx, cy, radius, level) for each, its level a little under the
    pit's rim; the water mesh is a disc at that level and the floor above it hides the rest"""
    out = []
    px, py = THROW["pit"]
    xs = np.linspace(px - 1.6, px + 1.6, 65)
    X, Y = np.meshgrid(xs, np.linspace(py - 1.6, py + 1.6, 65))
    H = height(X, Y)
    out.append((px, py, 1.7, _level(H, X - px, Y - py, 1.7, float(H.min()) + THROW["depth"] * 0.45)))
    cs = 6.5
    for ix in range(int(math.floor(x0 / cs)) - 1, int(math.floor(x1 / cs)) + 2):
        for iy in range(int(math.floor(y0 / cs)) - 1, int(math.floor(y1 / cs)) + 2):
            if _hash(ix, iy, 1.0) >= 0.72:
                continue
            age = _hash(ix, iy, 5.0)
            pd = 0.46 - 0.26 * age
            if pd < 0.33:
                continue
            cx = (ix + 0.2 + 0.6 * _hash(ix, iy, 2.0)) * cs
            cy = (iy + 0.2 + 0.6 * _hash(ix, iy, 3.0)) * cs
            ang = _hash(ix, iy, 4.0) * 2 * math.pi
            pr = 0.9 + 0.6 * age
            qx, qy = cx - math.cos(ang) * pr * 0.5, cy - math.sin(ang) * pr * 0.5
            if float(kept(np.array(qx), np.array(qy))) > 0.3:
                continue
            xs = np.linspace(qx - 1.5, qx + 1.5, 49)
            X, Y = np.meshgrid(xs, np.linspace(qy - 1.5, qy + 1.5, 49))
            H = height(X, Y)
            out.append((qx, qy, pr * 1.3, _level(H, X - qx, Y - qy, pr * 1.3, float(H.min()) + pd * 0.35)))
    return [p for p in out if p[3] is not None]


def _level(H, dx, dy, r, want):
    """the water can stand no higher than the lowest point of the ring the disc reaches, or it would spill out flat"""
    ring = np.abs(np.hypot(dx, dy) - r) < 0.1
    rim = float(H[ring].min()) - 0.04
    lvl = min(want, rim)
    return lvl if lvl > float(H.min()) + 0.06 else None
