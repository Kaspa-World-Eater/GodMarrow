"""The Red Water's beach by cause (study chapter 13; tools/landkit/passes/red_water_sand.md, pass 5): one function gives
the true height in yards at any point, shared by the build (beach3d) and the painter (paint_shore), and the maps the
painter needs: where the swash is, where the sand is glossy, wet, drying or dry.

The coast's own coordinates (shore_floor): s is the distance seaward, t along the shore.
  s > 69       the Red over a steep shelf, a submerged step at the break (69 to 70)
  66           the still-water line at this tide
  57.5 to 66   the beach face, steep (1 in 8), coarse black sand and pebbles, cut into cusps
  57           the berm crest, near vertical, at the high water
  42 to 56.5   the backshore, finer and drier, wind-rippled, rising gently to the logs
The cusps: horns of coarse pebbles pushed seaward and higher, bays of finer, wetter sand between, about 15 yd apart
(1.5 times the swash's reach), each its own.
Pure numpy, so it runs in Blender's Python and in ours."""
import math
import os
import numpy as np
import shore_floor as S
import shore_fine as SF

TIME = float(os.environ.get("GM_T", "0"))         # the loop's time 0..1
CALM = os.environ.get("GM_CALM", "0") == "1"       # the game's bake: the Red between beats (the game moves it itself)
WATER = 66.0                                       # the still-water line (s)
STEP_S = 69.6                                      # the submerged step where the break is
BERM_S = 57.2                                      # the berm crest at the high water
CUSP = 15.0                                        # the cusps' spacing along the shore (yards)


def _h1(i, s=0.0):
    v = np.sin(np.asarray(i) * 127.1 + s * 74.7) * 43758.5453
    return v - np.floor(v)


def _vn1(x, s=0.0):
    i = np.floor(x)
    f = x - i
    f = f * f * (3 - 2 * f)
    return _h1(i, s) * (1 - f) + _h1(i + 1, s) * f


def _vn2(x, y, s=0.0):
    ix, iy = np.floor(x), np.floor(y)
    fx, fy = x - ix, y - iy
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    def h(a, b):
        v = np.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453
        return v - np.floor(v)
    return (h(ix, iy) * (1 - fx) + h(ix + 1, iy) * fx) * (1 - fy) + (h(ix, iy + 1) * (1 - fx) + h(ix + 1, iy + 1) * fx) * fy


def chop(s, t, time):
    """the sea's small waves on the swell (real height, so the sky's glaze finds them facet by facet): short crests
    mostly along the shore, crossing a little, in patches where the wind roughens it; churned where the bore has passed"""
    w = 0.6 * (_vn2(s * 0.35, t * 0.35, 3.0) - 0.5)
    z = 0.0
    # (blood is thick: its viscosity damps the short waves first, so only long, low, slow ones are left)
    tc = heart(time)
    for lam, ang, amp, k in ((2.6, 0.25, 0.018, 1), (1.9, -0.5, 0.012, 1), (3.8, 0.6, 0.02, 1)):
        ph = 2 * np.pi * ((s * np.cos(ang) + t * np.sin(ang)) / lam + w - k * tc)
        z = z + amp * (0.5 + 0.5 * np.sin(ph)) ** 1.6
    patch = 0.55 + 0.9 * _vn2(s * 0.12 + 5, t * 0.12, 9.0)
    return z * patch


def cusp(t):
    """the cusps along the shore: (how far seaward the face is pushed here, how much higher; +1 at a horn, -1 in a bay),
    each cusp its own width and height"""
    ph = t / CUSP + 0.35 * np.sin(t * 0.07 + 1.1) + 0.25 * (_vn1(t / CUSP * 1.0, 3.0) - 0.5)
    c = np.cos(2 * np.pi * ph)
    amp = 0.8 + 0.4 * _vn1(t / CUSP, 7.0)
    return c * amp


def height_st(s, t):
    """the beach's true height (yards) at (s, t)"""
    s = np.asarray(s, float)
    t = np.asarray(t, float)
    c = cusp(t)
    se = s - 1.3 * c                                  # horns push the face seaward, bays draw it in
    face = (WATER - se) / 8.0 + 0.1 * np.maximum(c, 0)
    # under the Red: the face runs on to the step, drops a yard, then the shelf goes down steeply (the deep water close in
    # is what makes the one heavy shore-break)
    k2 = np.clip((se - STEP_S) / 0.8, 0, 1)
    off = np.where(se < STEP_S, -(se - WATER) / 8.0,
                   -(STEP_S - WATER) / 8.0 - 1.0 * (k2 * k2 * (3 - 2 * k2)) - np.maximum(se - STEP_S - 0.8, 0) * 0.12)
    # the berm: near vertical at its crest, the backshore behind it rising gently to the logs
    crest = (WATER - BERM_S) / 8.0
    k = np.clip((BERM_S - se) / 0.55, 0, 1)
    berm = crest + 0.85 * (k * k * (3 - 2 * k))                 # (a real step, most of a yard: 2026-10-10)
    back = crest + 0.85 + (BERM_S - 0.55 - se) * 0.045
    z = np.where(se > WATER, off, np.where(se > BERM_S, face, np.where(se > BERM_S - 0.55, berm, back)))
    # a worn runnel down each cusp bay, where the backwash runs out
    bay = np.clip(-c, 0, 1) ** 2
    z = z - np.where((se > BERM_S) & (se < WATER + 1.5), 0.2 * bay, 0.0)
    # ridge and runnel on the low beach face: a bar the swash built and the trough behind it, along the shore
    rr = np.where((se > BERM_S + 1.0) & (se < WATER - 0.8), 0.16 * np.sin((se - BERM_S) * 1.1 + 0.4 * np.sin(t * 0.13)), 0.0)
    z = z + rr
    # ---- the dry sand's depth (MASTER_RULES 0.5b; Derek: "just so flat. Shouldn't it have depth profiles"): the
    # landform, the drift and the grain, all by cause. The one wind blows off the land out to sea (+s), so every dune's
    # gentle stoss faces the land and its steep slip face the sea; its crests run along the shore ----
    dry = np.clip((BERM_S - 1.0 - se) / 2.0, 0, 1)
    z = z + dry * dune_relief(s, t)
    # the grain: wind ripples over all the dry sand, stronger in the swales where the sand runs loose
    r = SF.ripple_phase(s, t) % 1.0
    loose = 0.55 + 0.45 * np.clip((_vn1(s * 0.3 + t * 0.21, 51.0) - 0.2) * 2.0, 0, 1)
    z = z + (SF.ripple_profile(r) - 0.5) * 0.14 * loose * dry           # (readable at the camera, 2026-10-10)
    # the footprints coming up out of the Red (the area page: the one true detail)
    dz, _ = prints(s, t)
    # the cove's edges: the talus apron at the cliffs' feet, the cleft's ramp
    return cove_ground(s, t, z + dz)


# the trail of bare prints coming up out of the Red, ahead of the pilgrim's own (the area page), wandering a little
TRAIL = [(65.5, 3.5), (61.0, 2.4), (57.0, 1.0), (53.5, -0.6), (50.5, -2.4)]
STRIDE = 0.72


def _foot_list():
    out = []
    k = 0
    for (s0, t0), (s1, t1) in zip(TRAIL[:-1], TRAIL[1:]):
        ln = math.hypot(s1 - s0, t1 - t0)
        ds, dt = (s1 - s0) / ln, (t1 - t0) / ln
        for i in range(int(ln / STRIDE)):
            side = 1 if k % 2 else -1
            k += 1
            cs = s0 + ds * (i + 0.5) * STRIDE - dt * side * 0.11
            ct = t0 + dt * (i + 0.5) * STRIDE + ds * side * 0.11
            out.append((cs, ct, ds, dt, side, k))
    return out


FEET = _foot_list()


def trail_dist(s, t):
    """how far from the trail's line (yards)"""
    s = np.asarray(s, float)
    t = np.asarray(t, float)
    best = np.full(np.shape(s), 99.0)
    for (s0, t0), (s1, t1) in zip(TRAIL[:-1], TRAIL[1:]):
        ds, dt = s1 - s0, t1 - t0
        ll = ds * ds + dt * dt
        u = np.clip(((s - s0) * ds + (t - t0) * dt) / ll, 0, 1)
        best = np.minimum(best, np.hypot(s - s0 - ds * u, t - t0 - dt * u))
    return best


def prints(s, t):
    """each bare foot pressed into the sand as real form: the heel deepest, the ball, five toes, the arch's shallow link
    on the outer side, and a low ridge of sand squeezed up round it. Returns (the height change, how deep the hollow is)"""
    s = np.asarray(s, float)
    t = np.asarray(t, float)
    dz = np.zeros(np.shape(s))
    dep = np.zeros(np.shape(s))
    near = trail_dist(s, t) < 0.5
    if not near.any():
        return dz, dep
    for (cs, ct, ds, dt, side, k) in FEET:
        u = (s - cs) * ds + (t - ct) * dt                    # along the foot, toward the toes
        v = (-(s - cs) * dt + (t - ct) * ds) * side          # across, the big toe on the inside
        box = (np.abs(u) < 0.22) & (np.abs(v) < 0.12) & near
        if not box.any():
            continue
        uu, vv = u[box], v[box]
        d = np.zeros(uu.shape)
        for cu, cv, ru, rv, dd in ((-0.085, 0.0, 0.058, 0.044, 0.05), (0.045, 0.006, 0.05, 0.048, 0.042),
                                   (-0.015, -0.022, 0.06, 0.024, 0.02)):
            q = ((uu - cu) / ru) ** 2 + ((vv - cv) / rv) ** 2
            d = np.maximum(d, dd * np.clip(1 - q, 0, 1) ** 0.5)
        for j, (tu, tv, tr) in enumerate(((0.112, 0.032, 0.019), (0.118, 0.008, 0.014), (0.113, -0.012, 0.013),
                                          (0.104, -0.03, 0.012), (0.09, -0.045, 0.011))):
            q = ((uu - tu) ** 2 + (vv - tv) ** 2) / tr ** 2
            d = np.maximum(d, 0.028 * np.clip(1 - q, 0, 1) ** 0.5)
        qf = (uu / 0.16) ** 2 + (vv / 0.072) ** 2
        rim = 0.013 * np.exp(-((np.sqrt(qf) - 1.12) / 0.13) ** 2) * (d <= 0)
        # the older prints (further from the water) a little softened by the wind
        soft = 1.0 if cs > 57.0 else 0.75
        dz[box] = np.minimum(dz[box], -d * soft) + rim * soft
        dep[box] = np.maximum(dep[box], d * soft)
    return dz, dep


def _dune(u, crest, h, stoss, lee):
    """one dune's cross-section along the wind (u: yards seaward of its crest): a long gentle stoss rising from the
    land, the crest a little rounded, the slip face dropping steep to the sea"""
    d = u - crest
    return h * np.where(d < 0, np.clip(1 + d / stoss, 0, 1) ** 1.6, np.clip(1 - d / lee, 0, 1) ** 1.2)


def dune_relief(s, t):
    """the backshore's landforms and drifts, by cause (yards of height added to the profile). (2026-10-10, Derek: the sand
    "still looks like flat ass ... empty, flat and lifeless. Not like a beach at all", "using depth profiles ... to make
    it look like it's rising falling": everything here made big enough to read at the game's camera under a soft light,
    slopes kept walkable, about one in two at the steepest)"""
    s = np.asarray(s, float)
    t = np.asarray(t, float)
    # the landform. The foredune behind the storm line, two yards and more, its crest wandering, breached by blowouts
    # where the wind found a gap and scooped it out to below the sand round it
    fc = 40.5 + 2.2 * np.sin(t * 0.09 + 0.4) + 1.6 * (_vn1(t * 0.23, 61.0) - 0.5)
    fh = 2.0 + 0.9 * _vn1(t * 0.17, 63.0)
    blow = np.clip((_vn1(t * 0.11, 65.0) - 0.6) * 4.0, 0, 1)
    fore = _dune(s, fc, fh * (1 - 0.8 * blow), 9.0, 4.2)
    fore = fore - 0.6 * blow * np.exp(-((s - fc - 1.0) / 2.6) ** 2)
    # dunes and swales inland of it, each its own height and crest line, the swales between them deep enough to hide in
    ph = (s - 26.0) / 9.0 + 0.45 * np.sin(t * 0.07 + 1.3) + 0.7 * (_vn1(t * 0.12 + s * 0.05, 67.0) - 0.5)
    fr = ph - np.floor(ph)
    low = 1.35 * (0.55 + 0.45 * _vn1(t * 0.2 + np.floor(ph) * 3.1, 69.0)) * np.where(fr < 0.68, (fr / 0.68) ** 1.5, ((1 - fr) / 0.32) ** 1.2)
    low = low * np.clip((fc - 3.0 - s) / 3.0, 0, 1)
    # the whole backshore rolls: broad hummocky ground under everything, a yard of rise and fall across ten
    roll = 0.75 * (_vn2(s * 0.09, t * 0.09, 81.0) - 0.5) + 0.35 * (_vn2(s * 0.21, t * 0.21, 83.0) - 0.5)
    # the jam's swale: the bones lie in a hollow the storms scoured between the beach and the dune
    swale = -0.7 * np.exp(-((s - 47.0) / 3.4) ** 2) * (0.7 + 0.3 * _vn1(t * 0.2, 71.0))
    # the drift. Hummocks where a tuft of wrack or a stone held the sand, half a yard; small blowout pans scooped between
    hum = 0.45 * np.clip((_vn2(s * 0.5, t * 0.5, 73.0) - 0.55) * 2.6, 0, 1)
    pan = -0.35 * np.clip((_vn2(s * 0.33 + 9.0, t * 0.33, 75.0) - 0.7) * 3.5, 0, 1)
    # drifts round what stands, and round every piece of drift wood: a scour hollow on the windward (land) side, a sand
    # tail on the lee (seaward), the sand banked along a log's land side and scoured round its ends
    drift = np.zeros_like(s)
    for (ps, pt, r) in STANDING + [(d[0], d[1], d[4] * 2.2) for d in DRIFT]:
        ds, dt = s - ps, t - pt
        drift = drift - 0.45 * r * np.exp(-((ds + r * 1.4) ** 2 + (dt * 0.8) ** 2) / (r * r * 1.2))
        tail = np.clip(ds / (r * 6.0), 0, 1)
        drift = drift + 0.38 * r * np.exp(-(dt / (r * (1.0 - 0.5 * tail))) ** 2) * np.where(ds > 0, (1 - tail) ** 1.4, 0.0)
    return fore + low + roll + swale + hum + pan + drift


# what stands on the dry sand and shapes its drifts (s, t, reach): the shrine and the cairns (beach3d)
STANDING = [(37.5, 7.5, 1.0), (33.0, -10.0, 0.5), (41.5, 21.0, 0.5), (30.5, 28.5, 0.5), (45.0, -31.0, 0.6), (35.5, -2.5, 0.5)]


def _drift_list():
    """the drift wood (built by beach3d.driftwood, its drifts here): thrown up by the storms and left where the sea
    could carry it, so most along the storm line and against the foredune's foot, some far up in the swales, a few
    stranded on the berm; each (s, t, angle, length, radius, kind): branch, log, root wad or plank"""
    rnd = np.random.default_rng(1207)
    out = []
    tries = 0
    while len(out) < 90 and tries < 4000:
        tries += 1
        band = rnd.random()
        if band < 0.4:
            s_ = BERM_S - 4.3 + rnd.normal(0, 0.9)              # the storm line
        elif band < 0.65:
            s_ = 41.0 + rnd.normal(0, 1.2)                      # the foredune's foot
        elif band < 0.9:
            s_ = rnd.uniform(27.0, 39.0)                        # the swales
        else:
            s_ = BERM_S + rnd.uniform(0.3, 2.5)                 # stranded on the berm
        t_ = rnd.uniform(-34.0, 34.0)
        if abs(s_ - 47.0) < 3.5 and abs(t_) < 22.0:
            continue                                            # the bone jam's hollow is its own
        if any(abs(s_ - a) < 2.5 and abs(t_ - b) < 2.5 for a, b, _ in STANDING):
            continue
        if any(abs(s_ - d[0]) < 1.6 and abs(t_ - d[1]) < 1.6 for d in out):
            continue
        k = rnd.random()
        kind = "branch" if k < 0.45 else ("log" if k < 0.7 else ("rootwad" if k < 0.85 else "plank"))
        ln = {"branch": rnd.uniform(1.2, 3.2), "log": rnd.uniform(2.0, 4.5), "rootwad": rnd.uniform(1.4, 2.6),
              "plank": rnd.uniform(1.0, 2.4)}[kind]
        r = {"branch": rnd.uniform(0.05, 0.11), "log": rnd.uniform(0.16, 0.3), "rootwad": rnd.uniform(0.2, 0.32),
             "plank": rnd.uniform(0.05, 0.08)}[kind]
        ang = rnd.normal(0.0, 0.5) + (0.0 if band < 0.65 else rnd.uniform(-1.2, 1.2))   # laid along the shore, mostly
        out.append((float(s_), float(t_), float(ang), float(ln), float(r), kind))
    return out


DRIFT = _drift_list()


def height(x, y):
    s, t = S.st(np.asarray(x, float), np.asarray(y, float))
    return height_st(s, t)



# ---- the sea in time (chapter 13 sections 1, 2, 8): one wave's life at every place along the shore ----
# The break peels from the headland (large t, the cliff on the right) toward the open beach: at one instant the crest is
# unbroken to the left, curling in the middle, a bore of foam to the right. phase(t) is where this place is in the life
# of the wave: 0 the swell far out, 0.30 the lip thrown, 0.36 the impact, the bore running in to the water's edge by
# 0.47, then the swash up the face and the long backwash, until the next swell.
# the swell comes IN, toward the beach (Derek: "The wave should be coming in not from the side"): a long stretch of crest
# breaks almost at once, only an irregular wobble along it (the break a little earlier off the cusps' horns and the
# headland), never a peel running sideways across the screen
PEEL = 400.0                                       # yards along the shore the break would peel in one period (barely)
BREAK_S = 70.8                                     # where the crest throws its lip (just seaward of the step)


# The Red moves on a dying heartbeat (Derek, 2026-10-09: "rather slow as it's based on dying heart beats not normal
# speeds and blood is thick and viscous"): one loop is one beat. The sea's clock runs in two surges, the beat and a
# weaker second beat close behind it, then crawls through a long stillness while everything drains.
_X = np.linspace(0.0, 1.0, 2001)


def _pulse(x, c, w):
    d = (x - c + 0.5) % 1.0 - 0.5
    return np.exp(-(d / w) ** 2)


_RATE = 0.28 + 2.6 * _pulse(_X, 0.06, 0.045) + 1.3 * _pulse(_X, 0.27, 0.035)
_CLOCK = np.concatenate([[0.0], np.cumsum((_RATE[1:] + _RATE[:-1]) * 0.5 * np.diff(_X))])
_CLOCK /= _CLOCK[-1]


def heart(time=None):
    """the sea's own time 0..1 through one beat: quick in the two surges, crawling between"""
    time = TIME if time is None else time
    return float(np.interp(time % 1.0, _X, _CLOCK))


def beat(time=None):
    """how hard the heart is pushing now (0..1): the beat, the weaker second beat, nothing between"""
    time = TIME if time is None else time
    x = np.array(time % 1.0)
    return float(_pulse(x, 0.06, 0.045) + 0.5 * _pulse(x, 0.27, 0.035))


def phase(t, time=None):
    t = np.asarray(t, float)
    return (heart(time) + t / PEEL + 0.07 * (_vn1(t * 0.12, 41.0) - 0.5) + 0.03 * (_vn1(t * 0.5, 43.0) - 0.5)) % 1.0


def group(time=None):
    """the wave group's envelope: this wave's height against its peers"""
    time = TIME if time is None else time
    return 0.9 + 0.12 * math.sin(2 * math.pi * time * 0.37 + 1.0)


def break_s(t):
    """where the lip is thrown: a little seaward toward the headland, where the swell bends round and steepens first"""
    return BREAK_S + 0.5 * np.clip((np.asarray(t, float) - 2.0) / 6.0, 0, 1)


def crest(ph, t):
    """the unbroken crest's place (s) and height (yards) at phase ph < 0.38"""
    sb = break_s(t)
    sc = np.where(ph < 0.3, sb + (0.3 - ph) * 40.0, sb - (ph - 0.3) * 8.0)
    # the crest is never even along the shore: it humps and sags, and stands a little forward or back, so the face is
    # broken into broad facets that each take the grey sky their own way
    t = np.asarray(t, float)
    sc = sc + 1.1 * (_vn1(t * 0.17, 73.0) - 0.5) + 0.4 * (_vn1(t * 0.6, 79.0) - 0.5)
    H = (0.45 + 1.15 * np.clip(ph / 0.3, 0, 1) ** 2) * group() * (0.78 + 0.38 * _vn1(t * 0.21, 71.0))
    return sc, H


def bore_front(ph, t):
    """the bore's front (s) and height after the lip lands: from the impact to the water's edge by phase 0.47"""
    sb = break_s(t)
    k = np.clip((ph - 0.36) / 0.11, 0, 1)
    return sb - 1.2 - k * (sb - 1.2 - WATER), 0.5 * group() * (1 - 0.55 * k)


def swash_front(t, time=None):
    """how far up the beach (s) the swash reaches now: ballistic (fast, slowing, a pause, sliding back slower), its front
    lobed (it runs further up the bays), each cusp cell a little its own. Returns (the front now, this wave's top reach,
    the swash's own phase 0..1, rising or not)"""
    t = np.asarray(t, float)
    cell = np.floor(t / CUSP + 0.5)
    ps = (phase(t, time) - 0.47 + 0.04 * _h1(cell, 11.0)) % 1.0
    # up fast and slowing, a pause, then sliding back and speeding up; drawn down below the still line before the next
    # bore, baring the step's lip
    # a thick liquid's tongue: up slower and less far, a pause, the backwash slower still
    k = np.clip((ps - 0.32) / 0.55, 0, 1)
    up = np.where(ps < 0.24, np.sin(np.clip(ps / 0.24, 0, 1) * np.pi / 2), np.where(ps < 0.32, 1.0, np.cos(k * np.pi / 2) ** 0.8))
    reach = (2.9 + 1.2 * _h1(cell, 13.0) - 1.0 * cusp(t)) * group(time)
    draw = 0.45 * np.sin(np.clip((ps - 0.87) / 0.13, 0, 1) * np.pi) * (ps > 0.87)
    return WATER - up * reach + draw, WATER - reach, ps, ps < 0.24


def last_limit(t):
    """the highest the swash has reached in the last waves: the wet sand's upper edge, lobed by the cusps"""
    t = np.asarray(t, float)
    return WATER - 4.9 + 1.1 * cusp(t) + 0.4 * (_vn1(t * 0.3, 21.0) - 0.5)


def high_tide(t):
    """the last high tide's line, where the stain and the wrack end"""
    t = np.asarray(t, float)
    return BERM_S - 0.4 + 0.7 * (_vn1(t * 0.12, 31.0) - 0.5)


def sea_z(s, t, time=None):
    """the Red's surface (yards) at (s, t): the swell shoaling and steepening, the trough drawn down before it, the bore
    running in, and the swash sheet over the sand (centimetres deep, a lip at its front). Also the sand's height there,
    so the caller keeps only the water above it"""
    s = np.asarray(s, float)
    t = np.asarray(t, float) + np.zeros_like(s)
    ph = phase(t, time)
    g = height_st(s, t)
    z = np.zeros_like(s)
    sc, H = crest(np.minimum(ph, 0.38), t)
    unb = ph < 0.5
    wf = np.clip(2.8 - 2.0 * np.clip(ph / 0.3, 0, 1), 0.85, 2.8)          # thick: it never sharpens to an edge
    ds = s - sc
    hump = H * np.exp(-(ds / np.where(ds < 0, wf, 4.0)) ** 2)
    # thick blood: the roll sinks into the bore along a stretch of the crest, never a sheer step
    kc = np.clip((ph - 0.34) / 0.14, 0, 1)
    hump = hump * (1 - kc * kc * (3 - 2 * kc))
    trough = 0.2 * H * np.exp(-((s - (sc - wf * 1.9)) / 1.3) ** 2)
    z = z + np.where(unb & (not CALM), hump - trough, 0.0)
    # the bore: a front of broken water and foam, its height falling off behind it
    bf, hb = bore_front(ph, t)
    inb = (ph >= 0.34) & (ph < 0.6)
    k = np.clip((s - bf) / 0.3 + 1.0, 0, 1)
    bore = hb * (k * k * (3 - 2 * k)) * np.exp(-np.maximum(s - bf, 0) / 2.4) * np.clip(1 - (ph - 0.47) / 0.13, 0, 1)
    z = z + np.where(inb & (not CALM), bore, 0.0)
    # the chop on the open water; the bore's back churned in lumps (the foam itself is form: beach3d.bore)
    open_ = np.clip((s - WATER + 0.3) / 1.5, 0, 1)
    churn = np.where(inb, 0.06 * (_vn2(s * 1.2, t * 1.2 - heart(time) * 3, 13.0) - 0.4)
                     * np.clip(1 - np.abs(s - bf - 1.2) / 2.5, 0, 1), 0.0)
    z = z + (chop(s, t, TIME if time is None else time) + churn) * open_
    # the swash sheet over the face, up to its front; a lip at the front while it runs up, thinning on the backwash
    fr, top, ps, rising = swash_front(t, time)
    if CALM:                                                    # between beats: the coat lying halfway up, draining
        fr = WATER - 0.45 * (WATER - top)
        rising = np.zeros_like(fr, bool)
    # a thick liquid's front is blunt and raised: the tongue stands a hand high at its nose and rolls forward on it
    film = np.where(rising, 0.05 + 0.06 * np.exp(-((s - fr - 0.28) / 0.32) ** 2),
                    0.03 + 0.02 * np.clip((s - fr) / 2.0, 0, 1) + 0.025 * np.exp(-((s - fr - 0.2) / 0.25) ** 2))
    sheet = (s >= fr) & (s < WATER + 2.0)
    z = np.where(sheet, np.maximum(z, g + film), z)
    return z, g


def foam_age(s, t, time=None):
    """how long since the bore's foam was laid here, in wave periods (the foam thins and tears into lace as it ages:
    stage B)"""
    s = np.asarray(s, float)
    ph = phase(t, time)
    sb = break_s(t)
    # the phase at which the bore passed this place (seaward of the water's edge), or the swash front did (above it)
    pb = np.where(s > WATER, 0.36 + np.clip((sb - 1.2 - s) / (sb - 1.2 - WATER), 0, 1) * 0.11,
                  0.47 + 0.24 * np.arcsin(np.clip((WATER - s) / 4.0, 0, 1)) / (np.pi / 2))
    return (ph - pb) % 1.0


# ---- the cove (Derek, 2026-10-09): four screens along the shore, two screens of sand inland to a back wall of basalt
# cliffs that curves round at both ends into headlands running out into the Red; one cleft in the back wall is the only
# way on, up into the bluffs ----
COVE_T = 39.0                                      # the headlands' inner faces stand about this far along the shore
COVE_MID = 50.0                                    # where the back wall's curve meets the straight headlands (s)
CLEFT_T = -24.0                                    # the cleft through the back wall (t at the wall)
CLEFT_W = 2.8                                      # its half width at the floor (yards)


def back_s(t):
    """the back wall's foot (s): two screens inland of the water, wandering in bays and buttresses"""
    t = np.asarray(t, float)
    return 24.0 + 2.0 * np.sin(t * 0.11 + 0.7) + 1.4 * (_vn1(t * 0.3, 91.0) - 0.5)


def side_t(s):
    """the headlands' inner faces (|t|), wandering as they run out into the Red"""
    s = np.asarray(s, float)
    return COVE_T + 2.5 * np.sin(s * 0.17 + 0.4) + 1.2 * (_vn1(s * 0.4, 93.0) - 0.5)


def cleft_t(s):
    """the cleft's line: it leaves the back wall and climbs inland, bending a little"""
    s = np.asarray(s, float)
    return CLEFT_T + 0.18 * (24.0 - s) + 1.2 * np.sin((24.0 - s) * 0.2)


def cove_d(s, t):
    """how far into the cliff mass (yards): negative on the open sand and the sea inside the cove, positive in the rock.
    The back wall's corners are rounded into the headlands (a superellipse), the cleft cut through the back wall"""
    s = np.asarray(s, float)
    t = np.asarray(t, float)
    sb = back_s(t)
    tw = side_t(s)
    a = np.abs(t) / tw
    b = np.maximum(COVE_MID - s, 0.0) / np.maximum(COVE_MID - sb, 1.0)
    g = (a ** 6 + b ** 6) ** (1.0 / 6.0)
    d = (g - 1.0) * np.where(s < COVE_MID, 16.0, tw * 0.6)
    # the cleft: a slot through the back wall and on inland, its floor a talus ramp up into the bluffs
    inl = (s < sb + 3.0) & (s > sb - 10.0)
    dc = np.abs(t - cleft_t(s)) - (CLEFT_W + 0.6 * np.clip((sb + 3.0 - s) / 6.0, 0, 1) - 0.6)
    return np.where(inl, np.minimum(d, dc), d)


def gate_niches():
    """the way out (Derek, 2026-10-10: "dont forget to include an exit on the beach, a gap in the basalt we can walk
    though. with candle hollow in the walls"): hollows cut into the gateposts' faces that look into the cleft, three a
    side, about chest high over its ramp, each with a few wax stubs; the builder carves them (beach3d.cleft_gate), the
    exporter lights them (cove_export: their flames drawn live in the game). Each (s, t, z, side): side is +1 or -1, the
    wall the hollow is cut into, its face looking across the cleft"""
    out = []
    for side in (1.0, -1.0):
        for k, ds in enumerate((1.6, -0.6, -2.9)):
            sb = float(back_s(np.array([CLEFT_T]))[0])
            s_ = sb + ds + (0.35 if side > 0 else -0.25)
            tc = float(cleft_t(np.array([s_]))[0])
            t_ = tc + side * (CLEFT_W + 0.05)
            z = float(height_st(np.array([s_]), np.array([tc]))[0]) + 1.15 + 0.12 * k
            out.append((s_, t_, z, side))
    return out


def in_cleft(s, t):
    s = np.asarray(s, float)
    t = np.asarray(t, float)
    sb = back_s(t)
    return (s < sb + 1.0) & (s > sb - 10.0) & (np.abs(t - cleft_t(s)) < CLEFT_W + 1.0)


def cove_ground(s, t, z):
    """the ground's rise at the cove's edges: a talus apron of breakdown at the cliffs' feet, and the cleft's floor
    climbing inland as a walkable ramp (about 1 in 3, the steepest a pilgrim takes without hands)"""
    s = np.asarray(s, float)
    t = np.asarray(t, float)
    d = cove_d(s, t)
    reach = 5.0 + 3.0 * _vn1(t * 0.35, 75.0) + 1.5 * _vn1(t * 1.1, 77.0)  # sand banked against the rim in tongues
    k = np.clip(1.0 + d / reach, 0, 1)
    z = z + (1.1 + 0.7 * _vn1(t * 0.5, 79.0)) * k * k
    sb = back_s(t)
    ramp = np.clip((sb + 1.0 - s) / 6.0, 0, 1.6) + 2.6
    return np.where(in_cleft(s, t) & (s < sb + 1.0), np.maximum(z, ramp), z)
