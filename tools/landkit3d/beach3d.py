"""The Red Water and the black sand, rebuilt from study chapter 13 (tools/landkit/passes/red_water_sand.md, pass 5).

Everything with height is real form (MASTER_RULES 0): the beach's profile by cause (beach_floor: the step, the steep
face cut into cusps, the berm, the backshore), the pebbles and cobbles the waves sorted onto the horns and the berm,
the one heavy shore-break peeling from the headland (an unbroken swell, a curling lip with its hollow under it, the bore
of foam lumps), the swash sheet with a real step at its front, the glossy film the backwash leaves (a mirror, so the
reflection pass shows the cliffs and the dead in it), the wrack lines, the drift-log jam, the dead the Red gave back,
and the black cliffs (this module's cove_cliffs, on cliff3d's rough prisms) closing the cove. Only what is smaller than a pixel is painted
(paint_shore.py): the lace, the grain, the stain.

  blender --background --python blend_scene.py -- beach3d OUT -48.44 -42.78 480 340     (GM_T sets the wave's time)
"""
import os
import json
import math
import random
import types
import zlib
import numpy as np
import parts3d as P
import shore_floor as S
import beach_floor as BF
import redwater3d as RW
import cliff3d as C

FLOOR_MODULE = "beach_floor"
LAMPS = []
SAMPLES = 48
FOCUS_ST = (64.5, -4.0)                      # the frame's centre on the shore (s, t)
T0, T1 = -66.0, 66.0                         # the stretch of shore built (along t): the whole cove (beach_floor.COVE_T)
CALM = os.environ.get("GM_CALM", "0") == "1"  # the game's bake: no breaking wave frozen in the ground (the game moves the Red)
OBSTACLES = []                                # (s, t, r): what stands on the walkable sand, for the zone's grid (cove_export)


def _gz(x, y):
    return float(BF.height(np.array([x]), np.array([y]))[0])


def _gst(s, t):
    return float(BF.height_st(np.array([s]), np.array([t]))[0])


def st_grid(name, s0, s1, t0, t1, res, zfun, mat, keep=None):
    """a mesh over the shore's own grid: zfun(S, T) the height; keep(S, T, Z) which vertices are wanted (a face needs all
    four)"""
    ss = np.arange(s0, s1 + 1e-6, res)
    ts = np.arange(t0, t1 + 1e-6, res)
    Sg, Tg = np.meshgrid(ss, ts)
    X, Y = S.xy(Sg, Tg)
    Z = zfun(Sg, Tg)
    ns, nt = len(ss), len(ts)
    K = None if keep is None else keep(Sg, Tg, Z).ravel()
    a = (np.arange(nt - 1)[:, None] * ns + np.arange(ns - 1)[None, :]).ravel()
    quads = np.stack([a, a + ns, a + ns + 1, a + 1], 1)
    if K is not None:
        quads = quads[K[quads].all(1)]
    if not len(quads):
        return None
    used = np.unique(quads)
    remap = -np.ones(ns * nt, np.int64)
    remap[used] = np.arange(len(used))
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)[used].tolist()
    faces = remap[quads].tolist()
    me = P.bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(faces))
    me.update()
    return P._link(name, me, mat)


# ---- the ground and the water ----

def ground():
    # the sand; along the trail of prints a finer mesh, so each bare foot is real form (heel, ball, toes, the ridge)
    st_grid("sand", 49.9, 74.0, T0, T1, 0.07, BF.height_st, "ground", lambda s, t, z: BF.trail_dist(s, t) > 0.3)
    st_grid("sand_back", -12.0, 50.0, T0 - 6.0, T1 + 6.0, 0.12, BF.height_st, "ground")
    s_lo = min(p[0] for p in BF.TRAIL) - 0.5
    s_hi = max(p[0] for p in BF.TRAIL) + 0.5
    t_lo = min(p[1] for p in BF.TRAIL) - 0.5
    t_hi = max(p[1] for p in BF.TRAIL) + 0.5
    st_grid("sand_prints", s_lo, s_hi, t_lo, t_hi, 0.015, BF.height_st, "ground", lambda s, t, z: BF.trail_dist(s, t) < 0.36)


def sea():
    """the Red: the swash sheet and the bore fine where they run thin over the sand, the swell coarser out past the
    step; only where the water stands above the sand"""
    def zf(s, t):
        return BF.sea_z(s, t)[0]
    def keep(s, t, z):
        return z > BF.height_st(s, t) + 0.003
    st_grid("red_shallows", 57.0, 72.6, T0 - 6.0, T1 + 6.0, 0.07, zf, "pool", keep)
    st_grid("red_sea", 72.0, 100.0, T0 - 6.0, T1 + 6.0, 0.14, zf, "pool", keep)
    # the Red on out to the zone's edge, and round the headlands' outer sides
    st_grid("red_far", 99.6, 165.0, -80.0, 80.0, 0.4, zf, "pool")
    st_grid("red_wings_l", 40.0, 100.0, -80.0, T0 - 5.6, 0.3, zf, "pool", keep)
    st_grid("red_wings_r", 40.0, 100.0, T1 + 5.6, 80.0, 0.3, zf, "pool", keep)


def film():
    """the glossy film (chapter 13, section 4): the seepage face low on the beach, always running wet, glossier and
    higher in the bays; and the strip the backwash has just left behind it as it draws down, before it sinks in. A
    mirror a breath above the sand, so the reflection pass sees the cliffs and the dead in it"""
    def zf(s, t):
        return BF.height_st(s, t) + 0.004
    def keep(s, t, z):
        c = BF.cusp(t)
        fr, top, ps, rising = BF.swash_front(t)
        seep = s > BF.WATER - 1.9 - 1.0 * np.clip(-c, 0, 1) + 0.4 * np.clip(c, 0, 1)
        left = (~rising) & (ps > 0.3) & (s > fr - 2.2 * np.clip(1.0 - (ps - 0.3) * 0.9, 0.35, 1)) & (s <= fr + 0.1)
        return (seep | left) & (s < BF.WATER + 1.0)
    st_grid("gloss", 56.0, 67.0, T0, T1, 0.06, zf, "mirror", keep)


def lip():
    """the curl (chapter 13, section 1): where this stretch of the crest is between 0.27 and 0.37 of its life the lip is
    thrown forward over its own face, a real overhang with the hollow under it in shadow, falling as it goes; swept along
    the shore, so the curl begins as a sharpening crest on the left and lands in the bore on the right"""
    ts = np.arange(T0, T1, 0.1)
    rows = []
    for t_ in ts:
        ph = float(BF.phase(np.array([t_]))[0])
        if not (0.265 <= ph < 0.37):
            if len(rows) > 2:
                _sheet(rows)
            rows = []
            continue
        k = (ph - 0.265) / 0.105
        sc, H = BF.crest(np.array([min(ph, 0.36)]), np.array([t_]))
        sc, H = float(sc[0]), float(H[0])
        # blood is thick: the front does not throw a lip but bulges and sags over on itself, a heavy rounded roll
        # closing on a small dark crease, sinking as it goes (Derek: "blood is thick and viscous")
        L = 1.0 * k ** 0.8 * (0.9 + 0.2 * float(BF._vn1(np.array([t_ * 0.7]), 61.0)))
        back = [(3.0, 0.57), (2.0, 0.78), (1.2, 0.91), (0.5, 0.985), (0.0, 1.0)]
        sag = 1.0 - 0.35 * k
        fwd = [(-0.25 * L, 1.03 * sag), (-0.55 * L, 1.0 * sag), (-0.8 * L, 0.9 * sag), (-0.96 * L, 0.74 * sag),
               (-1.0 * L, 0.57 * sag), (-0.9 * L, 0.44 * sag), (-0.7 * L, 0.4 * sag + 0.1 * k)]
        row = []
        for ds, fz in back + fwd:
            x, y = S.xy(sc + ds, t_)
            row.append((x, y, fz * H))
        rows.append(row)
    if len(rows) > 2:
        _sheet(rows)


def _sheet(rows):
    n = len(rows[0])
    verts = [p for row in rows for p in row]
    faces = [(j * n + i, j * n + i + 1, (j + 1) * n + i + 1, (j + 1) * n + i) for j in range(len(rows) - 1) for i in range(n - 1)]
    name = "lip%d" % (zlib.crc32(str(verts[0]).encode()) % 1000)
    me = P.bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(faces))
    me.update()
    o = P._link(name, me, "pool")
    m = o.modifiers.new("solid", "SOLIDIFY")
    m.thickness = 0.12


def bore():
    """stage A foam (chapter 13, section 3): the broken wave's whitewater as solid lumps, bright and heaped, a short
    shadow forward; biggest where the lip has just landed, smaller as the bore runs in; a low roll of foam on the swash's
    front while it runs up. Each lump its own, churning from frame to frame"""
    k = 0
    for t_ in np.arange(T0, T1, 0.16):
        ph = float(BF.phase(np.array([t_]))[0])
        if 0.34 <= ph < 0.53:
            bf, hb = BF.bore_front(np.array([ph]), np.array([t_]))
            bf, hb = float(bf[0]), float(hb[0])
            fresh = np.clip(1.0 - (ph - 0.36) / 0.12, 0.25, 1.0)
            rnd = random.Random(int(t_ * 100) * 7 + int(ph * 40))
            for q in range(rnd.randint(7, 12)):
                ds = rnd.uniform(0.0, 1.8) ** 1.4
                s_ = bf + ds
                tt = t_ + rnd.uniform(-0.15, 0.15)
                zw, g = BF.sea_z(np.array([s_]), np.array([tt]))
                # thick froth heaped in one rolling mass: many small lumps packed together and a few large
                r = (rnd.uniform(0.05, 0.11) if rnd.random() < 0.75 else rnd.uniform(0.13, 0.22)) * fresh * (1.0 if ds < 0.5 else 0.7)
                x, y = S.xy(s_, tt)
                P.sphere("foam%d" % k, (x, y, float(zw[0]) + r * 0.05), r, "foam",
                         scale=(rnd.uniform(1.4, 2.2), rnd.uniform(0.9, 1.3), rnd.uniform(0.3, 0.5)),
                         rot=(rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 6.28)))
                k += 1
    # the swash's running front: a low roll of foam, lumpy along its length
    for t_ in np.arange(T0, T1, 0.16):
        fr, top, ps, rising = BF.swash_front(np.array([t_]))
        if not bool(rising[0]) or ps[0] < 0.02:
            continue
        rnd = random.Random(int(t_ * 1000) + 3)
        s_ = float(fr[0]) + rnd.uniform(0.02, 0.15)
        x, y = S.xy(s_, t_)
        r = rnd.uniform(0.05, 0.1) * (1.0 - 0.6 * float(ps[0]) / 0.2)
        P.sphere("roll%d" % k, (x, y, _gst(s_, t_) + 0.03), r, "foam", scale=(1.4, 1.0, 0.5),
                 rot=(0.0, 0.0, rnd.uniform(0, 6.28)))
        k += 1


# ---- what the waves sorted ----

ICO_V = None
ICO_F = None


def _ico():
    global ICO_V, ICO_F
    if ICO_V is None:
        p = (1 + 5 ** 0.5) / 2
        v = [(-1, p, 0), (1, p, 0), (-1, -p, 0), (1, -p, 0), (0, -1, p), (0, 1, p), (0, -1, -p), (0, 1, -p),
             (p, 0, -1), (p, 0, 1), (-p, 0, -1), (-p, 0, 1)]
        ICO_V = np.array(v, float) / math.sqrt(1 + p * p)
        ICO_F = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6),
                 (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10),
                 (8, 6, 7), (9, 8, 1)]
    return ICO_V, ICO_F


def pebbles():
    """chapter 13, section 4: pebbles (one or two pixels) and cobbles (two to five), rounded, gathered where the swash
    leaves the coarse: on the cusps' horns, along the berm's crest, at the cliff's foot; sparse in the bays. The pebbles
    one mesh (thousands), the cobbles each its own stone"""
    V, F = _ico()
    rnd = random.Random(29)
    verts, faces = [], []
    n = 0
    for _ in range(int(26000 * (T1 - T0) / 27.0)):
        s_, t_ = rnd.uniform(52.0, 66.3), rnd.uniform(T0, T1)
        if float(BF.cove_d(np.array([s_]), np.array([t_]))[0]) > -0.6:
            continue
        c = float(BF.cusp(np.array([t_]))[0])
        x, y = S.xy(s_, t_)
        foot = C.face_dist(x, y)
        horn = max(0.0, c) ** 1.5 * (1.0 if 57.5 < s_ < 65.8 else 0.0)
        berm = math.exp(-((s_ - (BF.BERM_S + 0.15 + 0.6 * c)) / 0.45) ** 2)
        cliff = 1.0 if -3.0 < foot < 0.3 else 0.0
        p = (0.02 + 0.55 * horn + 0.6 * berm + 0.7 * cliff) * (0.3 if s_ > BF.WATER - 2.0 else 1.0)
        if rnd.random() > p:
            continue
        r = rnd.uniform(0.028, 0.055)
        sc = (rnd.uniform(0.9, 1.3), rnd.uniform(0.7, 1.0), rnd.uniform(0.45, 0.7))
        a = rnd.uniform(0, 6.28)
        ca, sa = math.cos(a), math.sin(a)
        z0 = _gz(x, y) + r * 0.2
        base = len(verts)
        for vx, vy, vz in V:
            jx = vx * sc[0] * (1 + rnd.uniform(-0.12, 0.12))
            jy = vy * sc[1] * (1 + rnd.uniform(-0.12, 0.12))
            verts.append((x + (jx * ca - jy * sa) * r, y + (jx * sa + jy * ca) * r, z0 + vz * sc[2] * r))
        faces.extend([(base + a_, base + b_, base + c_) for a_, b_, c_ in F])
        n += 1
    o = P.poly("pebbles", verts, faces, "stone")
    o.data.polygons.foreach_set("use_smooth", [True] * len(faces))
    for i in range(int(420 * (T1 - T0) / 27.0)):
        s_, t_ = rnd.uniform(53.0, 66.0), rnd.uniform(T0, T1)
        if float(BF.cove_d(np.array([s_]), np.array([t_]))[0]) > -0.6:
            continue
        c = float(BF.cusp(np.array([t_]))[0])
        x, y = S.xy(s_, t_)
        foot = C.face_dist(x, y)
        horn = max(0.0, c) ** 2 * (1.0 if 58.0 < s_ < 65.5 else 0.0)
        berm = math.exp(-((s_ - (BF.BERM_S + 0.2)) / 0.5) ** 2)
        if rnd.random() > 0.05 + 0.5 * horn + 0.5 * berm + (0.8 if -3.0 < foot < 0.3 else 0.0):
            continue
        r = rnd.uniform(0.08, 0.2)
        if r > 0.15:
            OBSTACLES.append((s_, t_, r))
        P.sphere("cobble%d" % i, (x, y, _gz(x, y) + r * 0.22), r, "stone",
                 scale=(1.0, rnd.uniform(0.65, 0.9), rnd.uniform(0.4, 0.6)),
                 rot=(rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), rnd.uniform(0, 6.28)))
    return n


def wrack():
    """the wrack (chapter 13, section 4): a broken line of kelp and splinters at the last high tide, a few of the dead's
    bones in it; an older, higher, sparser storm line, dried to grey, against the logs"""
    rnd = random.Random(41)
    for i in range(600):
        storm = i >= 430
        t_ = rnd.uniform(T0, T1)
        if abs(t_) > float(BF.side_t(np.array([55.0]))[0]) - 1.5:
            continue
        line = (BF.BERM_S - 4.3 + 0.8 * math.sin(t_ * 0.21)) if storm else float(BF.high_tide(np.array([t_]))[0])
        if not storm and BF._vn1(np.array([t_ * 0.35]), 71.0)[0] < 0.35:
            continue                                                   # the line is broken: gaps where it is bare
        s_ = line + rnd.gauss(0, 0.25)
        x, y = S.xy(s_, t_)
        z = _gz(x, y)
        a = rnd.uniform(0, 2 * math.pi)
        ln = rnd.uniform(0.3, 1.3)
        pts = [(x + math.cos(a) * ln * u + math.sin(u * 5 + i) * 0.07, y + math.sin(a) * ln * u, z + 0.022) for u in (0, 0.33, 0.66, 1.0)]
        P.tube("kelp%d" % i, pts, [0.028, 0.032, 0.026, 0.012], "kelp" if not storm else "straw", 5)
        if rnd.random() < 0.25:
            # a splinter of bone
            b = rnd.uniform(0, math.pi)
            l2 = rnd.uniform(0.2, 0.6)
            P.tube("spl%d" % i, [(x, y, z + 0.02), (x + math.cos(b) * l2, y + math.sin(b) * l2, z + 0.02)], [0.025, 0.012], "bone", 5)
    for i in range(40):
        t_ = rnd.uniform(T0 + 8, T1 - 8)
        s_ = float(BF.high_tide(np.array([t_]))[0]) + rnd.gauss(0, 0.4)
        x, y = S.xy(s_, t_)
        z = _gz(x, y)
        a = rnd.uniform(0, math.pi)
        ln = rnd.uniform(0.25, 0.45)
        p0 = (x - math.cos(a) * ln / 2, y - math.sin(a) * ln / 2, z + 0.02)
        p1 = (x + math.cos(a) * ln / 2, y + math.sin(a) * ln / 2, z + 0.02)
        P.tube("lbone%d" % i, [p0, p1], [0.022, 0.02], "bone", 6)
        P.sphere("lknob%d_a" % i, p0, 0.034, "bone", scale=(1, 1, 0.7))
        P.sphere("lknob%d_b" % i, p1, 0.03, "bone", scale=(1, 1, 0.7))


def _blades(verts, faces, x, y, z, ln, lean, bend, w):
    """one blade of grass as a thin tapered ribbon of three segments, bent over by the wind (into the mesh being built)"""
    pts = []
    for k in range(4):
        u = k / 3.0
        pts.append((x + lean[0] * ln * u + bend[0] * ln * u * u, y + lean[1] * ln * u + bend[1] * ln * u * u,
                    z + ln * u * (1.0 - 0.35 * u * u)))
    base = len(verts)
    for k, (px, py, pz) in enumerate(pts):
        ww = w * (1.0 - k / 3.5)
        verts.append((px - ww * 0.7, py + ww * 0.7, pz))
        verts.append((px + ww * 0.7, py - ww * 0.7, pz))
    for k in range(3):
        a_ = base + 2 * k
        faces.append((a_, a_ + 1, a_ + 3, a_ + 2))


def driftwood():
    """the drift wood (2026-10-10, Derek: the beach "empty, flat and lifeless"; BF.DRIFT gives where each lies, and its
    drift of sand): thrown up by the storms, bleached and checked, half sunk in the sand, each its own: forked branches,
    small logs broken at the ends, root wads with their roots splayed, warped planks. The things a foot to a few yards
    long that make a beach a beach"""
    rnd = random.Random(1207)
    for i, (s_, t_, ang, ln, r, kind) in enumerate(BF.DRIFT):
        x0, y0 = S.xy(s_, t_)
        dsx, dsy = S.xy(s_ + math.sin(ang) * 0.5, t_ + math.cos(ang) * 0.5)
        ux, uy = dsx - x0, dsy - y0
        ul = math.hypot(ux, uy) or 1.0
        ux, uy = ux / ul, uy / ul

        def along(u, off=0.0):
            x, y = x0 + ux * u * ln + (-uy) * off, y0 + uy * u * ln + ux * off
            return (x, y, _gz(x, y))
        sink = -0.35 * r                                              # half sunk in the sand
        if kind in ("log", "branch"):
            n = 5
            pts, rad = [], []
            for k in range(n):
                u = k / (n - 1) - 0.5
                x, y, z = along(u, 0.06 * math.sin(k * 1.7 + i) * (1 if kind == "branch" else 0.4))
                pts.append((x, y, z + r + sink + 0.02 * rnd.uniform(-1, 1)))
                rad.append(r * (1.0 - (0.45 if kind == "branch" else 0.15) * (k / (n - 1))) * rnd.uniform(0.9, 1.08))
            P.tube("dw%d" % i, pts, rad, "cedar", 8)
            if kind == "branch":
                for q in range(rnd.randint(1, 3)):
                    u0 = rnd.uniform(-0.3, 0.35)
                    side = rnd.choice((-1, 1))
                    x, y, z = along(u0)
                    bl = ln * rnd.uniform(0.25, 0.45)
                    ex, ey, ez = along(u0 + 0.18, side * bl)
                    P.tube("dwb%d_%d" % (i, q), [(x, y, z + r * 0.9 + sink), ((x + ex) / 2, (y + ey) / 2, z + r * 1.3 + sink),
                                                 (ex, ey, ez + r * 0.5)], [r * 0.6, r * 0.45, r * 0.22], "cedar", 6)
            else:
                OBSTACLES.extend([(s_ + math.sin(ang) * ln * u, t_ + math.cos(ang) * ln * u, r + 0.12) for u in (-0.4, -0.13, 0.13, 0.4)])
        elif kind == "rootwad":
            x, y, z = along(-0.5)
            stub = [along(-0.5 + 0.1 * k) for k in range(5)]
            P.tube("rwl%d" % i, [(px, py, pz + r * 0.8 + sink) for px, py, pz in stub], [r, r * 0.95, r * 0.9, r * 0.85, r * 0.8], "cedar", 8)
            for q in range(9):                                       # the root plate: roots splayed round the butt
                aq = 2 * math.pi * q / 9 + rnd.uniform(-0.25, 0.25)
                rl = r * rnd.uniform(2.5, 4.2)
                p1 = (x - ux * r * 0.3 + math.cos(aq) * rl * 0.5 * uy, y - uy * r * 0.3 - math.cos(aq) * rl * 0.5 * ux,
                      z + r * 0.8 + math.sin(aq) * rl * 0.5 + sink)
                p2 = (x - ux * r * 0.6 + math.cos(aq) * rl * uy, y - uy * r * 0.6 - math.cos(aq) * rl * ux,
                      max(z + 0.03, z + r * 0.8 + math.sin(aq) * rl + sink))
                P.tube("rwr%d_%d" % (i, q), [(x, y, z + r * 0.8 + sink), p1, p2], [r * 0.4, r * 0.22, r * 0.06], "cedar", 5)
            OBSTACLES.append((s_, t_, r * 3.0))
        else:                                                        # a plank, warped, lying on the sand
            x, y, z = along(0.0)
            P.box("dwp%d" % i, (x - ln / 2, y - 0.14, z - 0.02), (x + ln / 2, y + 0.14, z + r), "cedar",
                  rot_z=math.atan2(uy, ux))


def kelp_heaps():
    """heaps of kelp and wrack left at the high tide line, piled where the swash dropped them: half a yard to a yard
    across, a tangle of fronds and stipes and bulbs"""
    rnd = random.Random(77)
    for h in range(34):
        t_ = rnd.uniform(T0 + 3, T1 - 3)
        if abs(t_) > float(BF.side_t(np.array([58.0]))[0]) - 2.0:
            continue
        s_ = float(BF.high_tide(np.array([t_]))[0]) + rnd.gauss(0, 0.35)
        cx, cy = S.xy(s_, t_)
        R = rnd.uniform(0.3, 0.6)
        for q in range(rnd.randint(14, 26)):
            a = rnd.uniform(0, 6.28)
            d = R * math.sqrt(rnd.random())
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
            z = _gz(x, y) + 0.03 + 0.18 * (1.0 - d / R) * rnd.random()
            b = rnd.uniform(0, 6.28)
            l = rnd.uniform(0.3, 0.9)
            pts = [(x + math.cos(b) * l * u + math.sin(u * 4 + q) * 0.06, y + math.sin(b) * l * u + math.cos(u * 3 + q) * 0.06,
                    z + 0.04 * math.sin(u * 3.0)) for u in (0, 0.33, 0.66, 1.0)]
            P.tube("kh%d_%d" % (h, q), pts, [0.045, 0.05, 0.04, 0.02], "kelp", 5)
            if rnd.random() < 0.3:
                P.sphere("khb%d_%d" % (h, q), pts[-1], 0.05, "kelp", scale=(1, 1, 0.8))


def cobble_patches():
    """cobbles gathered in the blowout pans on the backshore, where the wind took the sand and left the stones (the
    floor's pans): a fist to a head in size, rounded, sitting in the hollow"""
    rnd = random.Random(91)
    n = 0
    for _ in range(18000):
        s_, t_ = rnd.uniform(BF.BACK0 + 2.0, 55.0), rnd.uniform(T0, T1)
        if float(BF.cove_d(np.array([s_]), np.array([t_]))[0]) > -1.0:
            continue
        pan = float(BF._vn2(np.array([s_ * 0.33 + 9.0]), np.array([t_ * 0.33]), 75.0)[0])
        if pan < 0.72 or rnd.random() > (pan - 0.72) * 4.0:
            continue
        x, y = S.xy(s_, t_)
        r = rnd.uniform(0.07, 0.24)
        P.sphere("cbp%d" % n, (x, y, _gz(x, y) + r * 0.25), r, "stone", scale=(1.0, rnd.uniform(0.65, 0.95), rnd.uniform(0.45, 0.65)),
                 rot=(rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), rnd.uniform(0, 6.28)))
        n += 1
        if r > 0.18:
            OBSTACLES.append((s_, t_, r))
        if n >= 460:
            break
    return n


def dune_grass():
    """dead dune grass on the crests and the windward slopes of the dunes, where the sand holds still enough for it:
    clumps of pale, wiry blades bent over seaward by the one wind, the clumps catching the sand (they are what builds
    the hummocks). One mesh for all of it"""
    rnd = random.Random(55)
    verts, faces = [], []
    n = 0
    for _ in range(26000):
        s_, t_ = rnd.uniform(BF.BACK0 + 2.0, 46.0), rnd.uniform(T0, T1)
        if float(BF.cove_d(np.array([s_]), np.array([t_]))[0]) > -1.5:
            continue
        d0 = float(BF.dune_relief(np.array([s_]), np.array([t_]))[0])
        if d0 < 0.6 or rnd.random() > min(1.0, (d0 - 0.6) * 0.9):
            continue
        x, y = S.xy(s_, t_)
        z = _gz(x, y) - 0.02
        wx, wy = S.xy(s_ + 1.0, t_)
        wx, wy = wx - x, wy - y                                       # downwind: seaward
        for b in range(rnd.randint(7, 14)):
            a = rnd.uniform(0, 6.28)
            rr = rnd.uniform(0.0, 0.16)
            bx, by = x + math.cos(a) * rr, y + math.sin(a) * rr
            ln = rnd.uniform(0.25, 0.65)
            lean = (math.cos(a) * 0.25 + wx * 0.25, math.sin(a) * 0.25 + wy * 0.25)
            bend = (wx * rnd.uniform(0.3, 0.7), wy * rnd.uniform(0.3, 0.7))
            _blades(verts, faces, bx, by, z, ln, lean, bend, 0.012)
        n += 1
        if n >= 760:
            break
    if verts:
        o = P.poly("dunegrass", verts, faces, "straw")
        o.data.polygons.foreach_set("use_smooth", [True] * len(faces))
    return n


def bones_jam():
    """the bone jam (Derek, 2026-10-09: "Turn the logs into bones"): where a coast piles its drift logs, the Red has
    thrown up giant bones and the storms have jammed them at the back of the beach, piled crosswise as logs pile: long
    bones with a ball head on a neck at one end and two knuckles at the other, ribs (some arching out of the sand, both
    ends buried), vertebrae tipped on their sides. Old, pitted and split along the grain (paint_shore). Whose they are is
    never said"""
    rnd = random.Random(53)
    laid = []

    def gz_on(x, y, r):
        z = _gz(x, y) + r * 0.7
        for (lx, ly, lz, lr) in laid:
            dd = math.hypot(lx - x, ly - y)
            if dd < lr + r * 0.9:
                z = max(z, lz + (lr + r) * 0.8 * math.sqrt(max(0.0, 1 - (dd / (lr + r)) ** 2)) + 0.02)
        return z

    def long_bone(i, s_c, t_c, ln, r0, yaw):
        ns = 11
        pts, radii = [], []
        bend = rnd.uniform(-0.15, 0.15)
        for k in range(ns):
            u = k / (ns - 1) - 0.5
            s_ = s_c + u * ln * math.sin(yaw) + bend * (1 - 4 * u * u)
            t_ = t_c + u * ln * math.cos(yaw)
            x, y = S.xy(s_, t_)
            # the shaft waisted in its middle, flaring toward both ends
            r = r0 * (0.82 + 0.75 * (2 * abs(u)) ** 3)
            pts.append((x, y, 0.0))
            radii.append(r)
        # a bone is rigid (Derek: some "doing an accordion thing ... doesn't make any sense"): it lies as one straight
        # piece on what is under it, resting on the two supports that bracket its middle (the ground, or a bone it
        # crosses): the edge of the upper hull of what it must clear that spans its centre
        need = [gz_on(p[0], p[1], r) for p, r in zip(pts, radii)]
        us = [k / (ns - 1) for k in range(ns)]
        hull = []
        for k in range(ns):
            while len(hull) >= 2:
                (u1, z1), (u2, z2) = hull[-2], hull[-1]
                if (z2 - z1) * (us[k] - u1) <= (need[k] - z1) * (u2 - u1):
                    hull.pop()
                else:
                    break
            hull.append((us[k], need[k]))
        ua, za, ub, zb = hull[0][0], hull[0][1], hull[-1][0], hull[-1][1]
        for (u1, z1), (u2, z2) in zip(hull[:-1], hull[1:]):
            if u1 <= 0.5 <= u2:
                ua, za, ub, zb = u1, z1, u2, z2
                break
        slope = (zb - za) / max(ub - ua, 1e-6)
        zs = [za + slope * (u - ua) for u in us]                            # a hull edge's line clears every point
        pts = [(p[0], p[1], z) for p, z in zip(pts, zs)]
        P.tube("bone%d" % i, pts, radii, "bone", 12)
        # one end: a ball head on a short neck, turned off the axis; the other: two knuckles side by side
        (x0, y0, z0), (x1, y1, z1) = pts[0], pts[1]
        dx, dy = x0 - x1, y0 - y1
        dl = math.hypot(dx, dy) + 1e-9
        dx, dy = dx / dl, dy / dl
        nx, ny = -dy, dx
        hx, hy = x0 + dx * r0 * 1.2 + nx * r0 * 1.1, y0 + dy * r0 * 1.2 + ny * r0 * 1.1
        P.tube("bneck%d" % i, [(x0, y0, z0), (hx, hy, z0 + r0 * 0.3)], [radii[0] * 0.8, r0 * 0.75], "bone", 10)
        P.sphere("bhead%d" % i, (hx + nx * r0 * 0.4, hy + ny * r0 * 0.4, z0 + r0 * 0.35), r0 * 1.35, "bone", scale=(1, 1, 0.95))
        (x0, y0, z0), (x1, y1, z1) = pts[-1], pts[-2]
        dx, dy = x0 - x1, y0 - y1
        dl = math.hypot(dx, dy) + 1e-9
        dx, dy = dx / dl, dy / dl
        nx, ny = -dy, dx
        for sgn in (-1, 1):
            P.sphere("bknuck%d_%d" % (i, sgn), (x0 + dx * r0 * 0.6 + nx * sgn * r0 * 0.75, y0 + dy * r0 * 0.6 + ny * sgn * r0 * 0.75,
                                                  z0 - r0 * 0.1), r0 * 1.05, "bone", scale=(1.25, 0.95, 0.9))
        for p, r in zip(pts, radii):
            laid.append((p[0], p[1], p[2], r))

    def rib(i, s0, t0, span, yaw, h, lean, r0):
        """a rib arching out of the sand, both ends buried, leaning; flattened as a rib is (two tubes side by side)"""
        pts, radii = [], []
        for k in range(15):
            u = k / 14.0
            s_ = s0 + (u - 0.5) * span * math.sin(yaw)
            t_ = t0 + (u - 0.5) * span * math.cos(yaw)
            arch = math.sin(math.pi * u) ** 0.85
            s_ += math.cos(yaw) * h * arch * math.sin(lean)
            t_ -= math.sin(yaw) * h * arch * math.sin(lean)
            x, y = S.xy(s_, t_)
            pts.append((x, y, _gz(x, y) - 0.2 + h * arch * math.cos(lean)))
            radii.append(r0 * (1.0 - 0.4 * u))
        # a rib is broad and flat: a second strand beside the first, across the arch, makes the blade
        side = []
        for k, (x, y, z) in enumerate(pts):
            ox, oy = S.xy(s0 + math.cos(yaw) * r0 * 1.1, t0 - math.sin(yaw) * r0 * 1.1)
            bx, by = S.xy(s0, t0)
            side.append((x + ox - bx, y + oy - by, z - r0 * 0.15))
        P.tube("rib%d" % i, pts, radii, "bone", 9)
        P.tube("ribb%d" % i, side, [r * 0.9 for r in radii], "bone", 9)

    def vertebra(i, s_, t_, r):
        """a vertebra the size of a cask, tipped over: its body, the arch, the long spine and the two side processes"""
        x, y = S.xy(s_, t_)
        z = _gz(x, y)
        a = rnd.uniform(0, 6.28)
        ca, sa = math.cos(a), math.sin(a)
        tip = rnd.uniform(0.9, 1.4)                           # lying on its side
        ax = (ca * math.cos(tip), sa * math.cos(tip), math.sin(tip))
        c = (x, y, z + r * 0.75)
        P.tube("vbody%d" % i, [(c[0] - ax[0] * r * 0.4, c[1] - ax[1] * r * 0.4, c[2] - ax[2] * r * 0.4),
                               (c[0] + ax[0] * r * 0.4, c[1] + ax[1] * r * 0.4, c[2] + ax[2] * r * 0.4)],
               [r, r * 0.95], "bone", 14)
        ox, oy = -sa, ca                                     # the arch and the spine leave the body sideways
        P.tube("vspine%d" % i, [(c[0] + ox * r * 0.8, c[1] + oy * r * 0.8, c[2] + 0.1),
                                (c[0] + ox * r * 2.2, c[1] + oy * r * 2.2, z + r * 0.25)], [r * 0.32, r * 0.14], "bone", 8)
        for sgn in (-1, 1):
            P.tube("vside%d_%d" % (i, sgn), [(c[0] + ox * r * 0.7, c[1] + oy * r * 0.7, c[2]),
                                             (c[0] + ox * r * 0.9 + ca * sgn * r * 1.4, c[1] + oy * r * 0.9 + sa * sgn * r * 1.4,
                                              c[2] + sgn * 0.05)], [r * 0.22, r * 0.12], "bone", 7)
        laid.append((x, y, z + r * 0.75, r))

    # ways through the jam (Derek, 2026-10-10: "we need paths occasionaly between the large bones to explore easier"):
    # every so often along the shore a gap three or four yards wide, where the storms left the bones lying apart, so the
    # backshore and the beach are joined by more than the jam's ends
    gaps = [(-47.0, 1.9), (-27.5, 1.7), (-1.5, 2.0), (17.0, 1.8), (37.5, 1.9), (56.0, 1.7)]

    def in_gap(t_lo, t_hi):
        return any(t_hi > g - w and t_lo < g + w for g, w in gaps)

    n = 0
    for i in range(48):
        t_c = rnd.uniform(T0 + 6, T1 - 6)
        s_c = rnd.uniform(44.0, 49.5) if i < 38 else rnd.uniform(50.0, 52.0)
        if float(BF.cove_d(np.array([s_c]), np.array([t_c]))[0]) > -6.0:
            continue
        ln_ = rnd.uniform(5.0, 10.0)
        r_ = rnd.uniform(0.2, 0.34)
        yaw_ = rnd.gauss(0, 0.35)
        half = 0.5 * ln_ * abs(math.cos(yaw_)) + r_ * 2.5
        if in_gap(t_c - half, t_c + half):
            continue
        long_bone(n, s_c, t_c, ln_, r_, yaw_)
        for u in np.linspace(-0.5, 0.5, max(2, int(ln_ / 1.2))):
            OBSTACLES.append((s_c + u * ln_ * math.sin(yaw_), t_c + u * ln_ * math.cos(yaw_), r_ * 1.3 + 0.1))
        n += 1
    # a run of ribs arching out of the sand where one side of a ribcage lies buried, and others strewn
    s0, t0 = 51.2, -10.5
    for k in range(4):
        OBSTACLES.append((s0 - k * 0.25, t0 + k * 1.25, 0.4))
        rib(k, s0 - k * 0.25, t0 + k * 1.25, rnd.uniform(3.2, 4.2), 0.25 + rnd.uniform(-0.08, 0.08), rnd.uniform(1.3, 2.1),
            rnd.uniform(0.25, 0.5), rnd.uniform(0.2, 0.26))
    for k in range(4, 14):
        rs_, rt_, rsp = rnd.uniform(45.0, 50.5), rnd.uniform(T0 + 8, T1 - 8), rnd.uniform(2.5, 4.0)
        ryaw, rh, rlean, rr0 = rnd.uniform(-0.6, 0.6), rnd.uniform(0.4, 0.9), rnd.uniform(0.9, 1.3), rnd.uniform(0.17, 0.22)
        if in_gap(rt_ - rsp * 0.6, rt_ + rsp * 0.6):
            continue
        rib(k, rs_, rt_, rsp, ryaw, rh, rlean, rr0)
    for k in range(14):
        vs, vt = rnd.uniform(45.5, 52.5), rnd.uniform(T0 + 8, T1 - 8)
        vr = rnd.uniform(0.5, 0.75)
        if in_gap(vt - 1.6, vt + 1.6):
            continue
        vertebra(k, vs, vt, vr)
        OBSTACLES.append((vs, vt, 0.9))


def dead():
    """the dead the Red gives back (the area page: "the beach of the dead"), as the water left them: one in the swash,
    turned by each wave, one on the face, one at the high-tide line in the wrack, one rotted to its ribs against the
    logs"""
    RW._gz = _gz
    for k, (s0, t0, yaw, rot, sink, flung) in enumerate((
            (63.4, -9.4, 0.5, 0, 0.05, True), (61.2, 1.6, -1.9, 1, 0.06, False), (57.6, -12.2, 2.6, 0, 0.04, True),
            (54.8, 3.4, 1.2, 2, 0.04, False), (52.6, -6.8, -0.4, 1, 0.04, True))):
        RW.corpse(k, s0, t0, yaw, rot, sink, flung)
        OBSTACLES.append((s0, t0, 0.7))
    # a pilgrim's staff and lantern lost at the high-tide line
    p0, p1 = S.xy(57.2, -1.8), S.xy(57.9, -0.2)
    P.tube("staff", [(p0[0], p0[1], _gz(*p0) + 0.04), (p1[0], p1[1], _gz(*p1) + 0.04)], [0.035, 0.03], "wood", 6)
    lx, ly = S.xy(56.4, -2.9)
    o = P.cylinder("lantern", (lx, ly, _gz(lx, ly) + 0.08), 0.08, 0.22, "iron", sides=8)
    o.rotation_euler = (1.45, 0.0, 0.6)


def drowned():
    """the dead in the Red (Derek: "Don't forget the bodies in the water"; the area page: whatever goes into the Red
    comes back): bodies riding the thick surface, face down with only the back and shoulders out, one face up, one half
    sunk with its cloak spread round it, one rolled in the bore's froth, one at the swash's edge with the tongue running
    round it. Each rides the heave and sways on the beat, a little toward the shore on each surge and back"""
    hb = BF.heart()
    for k, (s0, t0, yaw, up, sink, cloak, roll) in enumerate((
            (68.2, -7.6, 0.6, False, 0.0, True, 0.0), (71.6, -11.2, -0.9, True, 0.03, False, 0.0),
            (73.6, -2.2, 1.9, False, 0.05, False, 0.0), (67.3, 2.6, -2.2, False, 0.0, False, 0.9),
            (65.7, -10.4, 2.8, False, 0.0, True, 0.0), (69.4, -27.5, 1.1, False, 0.02, False, 0.0),
            (67.0, 19.5, -0.4, True, 0.03, True, 0.0), (72.8, 30.5, 2.2, False, 0.05, False, 0.0),
            (70.2, 11.0, -1.6, False, 0.02, False, 0.0))):
        ph = 0.37 * k
        s0 = s0 - 0.35 * math.sin(2 * math.pi * (hb + ph))
        yaw = yaw + 0.12 * math.sin(2 * math.pi * (hb * 2 + ph))

        def surf(u, w):
            ss = s0 + u * math.cos(yaw) - w * math.sin(yaw)
            tt = t0 + u * math.sin(yaw) + w * math.cos(yaw)
            zw, g = BF.sea_z(np.array([ss]), np.array([tt]))
            return float(max(zw[0], g[0] + 0.05))

        def at(u, w, z):
            x, y = RW._body_xy(s0, t0, yaw, u, w)
            return (x, y, surf(u, w) + z - sink)

        # the one shared body (body3d.py), riding the surface face down (or up), mostly under it: only the back, the
        # shoulders and the hood break the blood
        import body3d as B
        x0, y0 = S.xy(s0, t0)
        d0 = S.xy(s0 + math.cos(yaw), t0 + math.sin(yaw))
        wy = math.atan2(d0[1] - y0, d0[0] - x0)

        def floating(x, y, sink=sink):
            ss, tt = S.st(x, y)
            zw, g = BF.sea_z(np.array([ss]), np.array([tt]))
            return float(max(zw[0], g[0] + 0.05)) - 0.1 - sink
        B.body("drowned%d" % k, "supine" if up else ("prone_reach" if k % 2 else "prone"), "bloat", x0, y0, wy + roll,
               floating, seed=100 + k, cloak=cloak or k % 3 == 0)

def cove_column_height(s_, t_, d, k):
    """the cove's basalt by cause and by the camera: the headlands at the sides stand 20 to 28 yd (their tops out of
    frame); where they run out into the Red the sea has cut them to stumps and single columns; the back wall and its
    rounded corners stand between the camera and the sand, so (as Diablo II cuts its near walls) they are shown cut
    down: a rim of broken stumps 2 to 5 yd tall, stepping up inland like a pavement of column tops; round the cleft the
    stumps stand above its ramp so it reads as a cut climbing into the bluffs"""
    if d < -0.3:
        return 0.0
    wall = 22.0 + 6.0 * C._h(int(s_ * 3), int(t_ * 3), 9)
    stair = 0.5 + max(d, 0.0) * 5.0 + k * 1.5
    h = min(wall, stair)
    near = (s_ < BF.COVE_MID + 4.0) and (abs(t_) < float(BF.side_t(np.array([s_]))[0]) + 2.5)
    if near:
        cap = 2.2 + max(d, 0.0) * 0.45 + k * 1.2
        if abs(t_ - float(BF.cleft_t(np.array([s_]))[0])) < BF.CLEFT_W + 4.0 and s_ < float(BF.back_s(np.array([t_]))[0]) + 3.0:
            ramp = float(BF.height_st(np.array([s_]), np.array([float(BF.cleft_t(np.array([s_]))[0])]))[0])
            cap = max(cap, ramp + 3.0 + k * 1.2)
            # the gateposts (2026-10-10, Derek: "an exit on the beach, a gap in the basalt we can walk though"): the
            # columns flanking the cleft stand tall over its ramp, so the way out reads as a gap through the low rim
            if abs(t_ - float(BF.cleft_t(np.array([s_]))[0])) < BF.CLEFT_W + 1.9:
                cap = max(cap, ramp + 5.4 + k * 1.8)
            h = max(min(h, cap), ramp + 2.0 - max(float(BF.height_st(np.array([s_]), np.array([t_]))[0]), 0.0))
        h = min(h, cap)
    sea = s_ - 64.0
    if sea > 0:
        h = min(h, max(0.4, 6.0 - sea * 0.45 + k * 2.0))
        if C._h(int(s_ * 5), int(t_ * 5), 11) < 0.1 * min(sea, 6):
            h = 0.0
    return h


def cove_cliffs():
    """the cove's basalt (report 07's columns): every girth from one power diagram over the cliff band round the cove,
    rough drums worn and flaked, the high headlands with the entablature's thin crooked columns above the colonnade,
    breakdown on the sand at their feet"""
    C.SF = types.SimpleNamespace(height=BF.height)

    def radius(s_, t_):
        thick = 0.5 + 0.5 * math.sin(s_ * 0.21 + 1.3) * math.cos(t_ * 0.17)
        return 0.34 + 0.55 * thick ** 1.3 + (C._h(int(s_ * 3), int(t_ * 3), 31) - 0.5) * 0.12

    def keep(s_, t_):
        d = float(BF.cove_d(np.array([s_]), np.array([t_]))[0])
        return -0.3 < d < 7.0 and s_ < 88.0

    pts = C.seeds(-8.0, 90.0, T0 - 8.0, T1 + 8.0, radius, keep, seed=23)
    rnd = random.Random(7)
    made = 0
    for k, (cs_, ct_), r, poly in C.cells(pts):
        # basalt is five and six sided and near round in plan: a sliver cell (seen from above it reads as a wedge, Derek:
        # "the triangle shaped wedges are bad") is left out, a crevice between its neighbours
        pa = np.array(poly)
        ev = np.linalg.eigvalsh(np.cov((pa - pa.mean(0)).T))
        if len(poly) < 4 or ev[1] > 3.2 * max(ev[0], 1e-6):
            continue
        d = float(BF.cove_d(np.array([cs_]), np.array([ct_]))[0])
        kk = C._h(k, 7, 5)
        hgt = cove_column_height(cs_, ct_, d, kk)
        if hgt <= 0.0:
            continue
        cx_, cy_ = S.xy(cs_, ct_)
        xy = [S.xy(a, b) for a, b in poly]
        g = _gz(cx_, cy_)
        lean = ((C._h(k, 1, 21) - 0.5) * 0.025, (C._h(k, 2, 22) - 0.5) * 0.025)
        age = 0.45 + 0.45 * C._h(k, 3, 7)
        cup = 0.06 if (hgt < 3.0 and C._h(k, 4, 6) < 0.5) else 0.0
        broken = 0.0 if (cup or hgt > 15) else (C._h(k, 5, 24) * 0.8 if C._h(k, 6, 25) < 0.75 else 0.0)
        z0 = min(g, 0.0) - 1.5
        z1 = max(g, 0.0) + hgt
        if z1 - z0 > 9.0 and hgt > 12.0:                                # only the high headlands' upper tier splits
            split = z0 + 6.0 + C._h(k, 10, 28) * 4.0
            C.rough_prism("cw%d" % k, xy, z0, split, "basalt", k, 0.0, 0.0, lean, age, drum=(1.4, 3.4))
            r2 = random.Random(k)
            subs = [xy]
            for _ in range(2):
                nxt = []
                for p in subs:
                    cxp = sum(q[0] for q in p) / len(p)
                    cyp = sum(q[1] for q in p) / len(p)
                    a = r2.uniform(0, math.pi)
                    for sgn in (1, -1):
                        h_ = C._clip(p, cxp, cyp, sgn * math.cos(a), sgn * math.sin(a))
                        if len(h_) >= 3:
                            nxt.append(h_)
                subs = nxt
            for q, sub in enumerate(subs):
                # (2026-10-10, Derek: "the bluff wall has a wedge basalt"): the random cuts through the upper tier left
                # three-sided and sliver pieces that read as wedges; only the four-sided-and-more, near-round ones stand,
                # the rest left as crevices
                sa = np.array(sub)
                if len(sub) < 4:
                    continue
                sev = np.linalg.eigvalsh(np.cov((sa - sa.mean(0)).T))
                if sev[1] > 3.0 * max(sev[0], 1e-6):
                    continue
                C.rough_prism("ce%d_%d" % (k, q), sub, split, z1 - r2.uniform(0, 2.5), "basalt", k * 7 + q, 0.0, 0.0,
                              ((r2.random() - 0.5) * 0.06, (r2.random() - 0.5) * 0.06), 0.4, drum=(0.4, 0.9))
        else:
            C.rough_prism("cs%d" % k, xy, z0, z1, "basalt", k, cup, broken, lean, age, drum=(0.5, 1.6))
        made += 1
        OBSTACLES.append((cs_, ct_, r + 0.15))
        # breakdown on the sand at the foot of the cliff
        if -0.3 < d < 1.2 and rnd.random() < 0.35 and cs_ < 66.0:
            for q in range(rnd.randint(1, 3)):
                ds_, dt_ = rnd.uniform(0.8, 3.0), rnd.uniform(-1.5, 1.5)
                # step out of the rock toward the open sand (down the field of cove_d)
                e = 0.5
                gs = float(BF.cove_d(np.array([cs_ + e]), np.array([ct_]))[0] - BF.cove_d(np.array([cs_ - e]), np.array([ct_]))[0])
                gt = float(BF.cove_d(np.array([cs_]), np.array([ct_ + e]))[0] - BF.cove_d(np.array([cs_]), np.array([ct_ - e]))[0])
                gl = math.hypot(gs, gt) + 1e-9
                fs_, ft_ = cs_ - gs / gl * ds_ - gt / gl * dt_, ct_ - gt / gl * ds_ + gs / gl * dt_
                if float(BF.cove_d(np.array([fs_]), np.array([ft_]))[0]) > -0.4:
                    continue
                fx_, fy_ = S.xy(fs_, ft_)
                size = rnd.uniform(0.18, 0.55)
                C.chunk("cb%d_%d" % (k, q), (fx_, fy_, _gz(fx_, fy_)), size, "basalt", k * 3 + q)
                OBSTACLES.append((fs_, ft_, size + 0.1))
    return made


def cleft_gate():
    """the candle hollows in the gateposts (BF.gate_niches): a carved frame set into each face that looks into the cleft
    (a sill, two jambs and a lintel of cut rock, a dark back), its recess left in shadow, three or four wax stubs of
    their own heights on the sill, the wax run down over its lip. The flames are the game's (lit live, world/live_flames)"""
    made = 0
    for i, (s_, t_, z, side) in enumerate(BF.gate_niches()):
        x0, y0 = S.xy(s_, t_)
        x1, y1 = S.xy(s_, t_ - side * 0.2)                       # one step across, into the cleft
        nx, ny = x1 - x0, y1 - y0
        nl = math.hypot(nx, ny)
        nx, ny = nx / nl, ny / nl                                 # out of the wall, across the cleft
        ux, uy = -ny, nx                                          # along the wall
        rot = math.atan2(uy, ux)
        W, H, D = 0.62, 0.72, 0.34

        def at(u, n_, zz):
            return (x0 + ux * u + nx * n_, y0 + uy * u + ny * n_, zz)

        def slab(name, u0, u1, n0, n1, z0, z1, mat):
            v = [at(u0, n0, z0), at(u1, n0, z0), at(u1, n1, z0), at(u0, n1, z0),
                 at(u0, n0, z1), at(u1, n0, z1), at(u1, n1, z1), at(u0, n1, z1)]
            f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
            P.poly(name, v, f, mat)

        slab("nback%d" % i, -W / 2 - 0.12, W / 2 + 0.12, -D, -D + 0.06, z - 0.1, z + H + 0.1, "cutrock")
        slab("nsill%d" % i, -W / 2 - 0.12, W / 2 + 0.12, -D, 0.1, z - 0.12, z, "cutrock")
        slab("nlint%d" % i, -W / 2 - 0.14, W / 2 + 0.14, -D, 0.12, z + H, z + H + 0.16, "cutrock")
        slab("njl%d" % i, -W / 2 - 0.14, -W / 2, -D, 0.1, z, z + H, "cutrock")
        slab("njr%d" % i, W / 2, W / 2 + 0.14, -D, 0.1, z, z + H, "cutrock")
        rnd = random.Random(900 + i)
        for q in range(rnd.randint(3, 4)):
            u = -W / 2 + 0.12 + q * (W - 0.24) / 3.0 + rnd.uniform(-0.04, 0.04)
            hgt = rnd.uniform(0.08, 0.26)
            cx, cy, cz = at(u, -D / 2 + rnd.uniform(-0.05, 0.05), z)
            P.cylinder("ncand%d_%d" % (i, q), (cx, cy, cz), rnd.uniform(0.03, 0.045), hgt, "bone", sides=8)
        # the wax run over the sill's lip
        P.tube("nwax%d" % i, [at(-0.05, 0.08, z), at(-0.04, 0.12, z - 0.05), at(-0.03, 0.12, z - 0.16)], [0.03, 0.025, 0.018], "bone", 6)
        made += 1
    return made


def sea_columns():
    """lone basalt columns standing in the Red (Derek: "Add random columns of basalt in the water sparsely"; and
    2026-10-10, "the beach can also have a few more single columns of basalt in the surf and water"): where the
    headlands once ran further out, single columns and little clusters the sea has cut free, each its own height,
    their feet in the surf, the blood standing in their cupped tops; a few stand in the surf itself"""
    rnd = random.Random(61)
    placed = 0
    tries = 0
    spots = []
    while placed < 17 and tries < 700:
        tries += 1
        s_, t_ = (rnd.uniform(64.5, 69.0) if placed % 3 == 2 else rnd.uniform(69.0, 86.0)), rnd.uniform(T0 + 4.0, T1 - 4.0)
        if any(math.hypot(s_ - a, t_ - b) < 7.0 for a, b in spots):
            continue
        spots.append((s_, t_))
        n = 1 if rnd.random() < 0.6 else rnd.randint(2, 4)
        for q in range(n):
            a = rnd.uniform(0, 6.28)
            cs_, ct_ = s_ + (math.cos(a) * 0.9 if q else 0.0), t_ + (math.sin(a) * 0.9 if q else 0.0)
            sides = rnd.randint(5, 7)
            r = rnd.uniform(0.45, 0.8)
            pts = []
            for i in range(sides):
                aa = 2 * math.pi * i / sides + rnd.uniform(-0.25, 0.25)
                rr = r * rnd.uniform(0.82, 1.08)
                pts.append(S.xy(cs_ + math.cos(aa) * rr, ct_ + math.sin(aa) * rr))
            g = _gst(cs_, ct_)
            hgt = rnd.uniform(1.5, 6.5) * (1.0 if q == 0 else 0.6)
            cup = 0.07 if rnd.random() < 0.5 else 0.0
            o = C.rough_prism("seacol%d_%d" % (placed, q), pts, g - 1.0, max(g, 0.0) + hgt, "basalt", placed * 13 + q, cup,
                              0.0 if cup else rnd.uniform(0.0, 0.6), ((rnd.random() - 0.5) * 0.04, (rnd.random() - 0.5) * 0.04),
                              rnd.uniform(0.6, 0.9), drum=(0.5, 1.4))
            if cs_ < 70.0:
                OBSTACLES.append((cs_, ct_, r + 0.15))                 # in the surf: walked round, never through
            if cup:
                xy = pts
                P.poly("seacup%d_%d" % (placed, q), [(x, y, max(g, 0.0) + hgt - 0.08) for x, y in xy][::-1], [tuple(range(len(xy)))], "blood")
        placed += 1
    return placed


def _drum_poly(cs_, ct_, r, sides, rnd):
    pts = []
    for i in range(sides):
        a = 2 * math.pi * i / sides + rnd.uniform(-0.25, 0.25)
        rr = r * rnd.uniform(0.85, 1.08)
        pts.append(S.xy(cs_ + math.cos(a) * rr, ct_ + math.sin(a) * rr))
    return pts


def shrine():
    """an old crumbled basalt shrine (Derek: "an old crumbled basalt shrine ... sparsely to give it more identity"): a
    spirit house of the shore folk, raised above the storm line where they could reach it dry, on a stump of three column
    drums; its little house of slabs on corner posts, the roof's back slab fallen in and the front one slid off onto the
    sand; a face worn smooth in the niche, looking at the sea; a ring of low standing drums round it, half of them
    toppled; and across its step a line of worn tools, the old ward (a tool worn with work is the one thing of the god's
    world nothing that comes up will cross)"""
    s0, t0 = 37.5, 7.5
    rnd = random.Random(101)
    g = _gst(s0, t0)
    # the pedestal: three drums of one old column
    C.rough_prism("shrine_stump", _drum_poly(s0, t0, 0.62, 6, rnd), g - 0.4, g + 1.25, "basalt", 3, 0.0, 0.0, (0.0, 0.0), 0.85,
                  drum=(0.38, 0.5))
    OBSTACLES.append((s0, t0, 0.9))
    top = g + 1.25
    # the house: a floor slab, four corner posts, the back roof slab fallen in across the floor
    corners = [(-0.42, -0.36), (0.42, -0.36), (0.42, 0.36), (-0.42, 0.36)]
    fl = [S.xy(s0 + a, t0 + b) for a, b in [(-0.55, -0.48), (0.55, -0.48), (0.55, 0.48), (-0.55, 0.48)]]
    P.poly("shrine_floor", [(x, y, top + 0.08) for x, y in fl], [(0, 1, 2, 3)], "basalt", thick=0.1)
    for k, (a, b) in enumerate(corners):
        h_ = 0.55 if k != 2 else 0.22                                        # one post broken off short
        C.rough_prism("shrine_post%d" % k, _drum_poly(s0 + a, t0 + b, 0.08, 5, rnd), top + 0.08, top + 0.08 + h_, "basalt",
                      k, 0.0, 0.08 if k == 2 else 0.0, (0.0, 0.0), 0.7, drum=(0.2, 0.3))
    ra = [S.xy(s0 - 0.5, t0 - 0.5), S.xy(s0 + 0.45, t0 - 0.5), S.xy(s0 + 0.45, t0 + 0.5), S.xy(s0 - 0.5, t0 + 0.5)]
    P.poly("shrine_roof_fallen", [(ra[0][0], ra[0][1], top + 0.55), (ra[1][0], ra[1][1], top + 0.22), (ra[2][0], ra[2][1], top + 0.16),
                                  (ra[3][0], ra[3][1], top + 0.52)], [(0, 1, 2, 3)], "basalt", thick=0.07)
    # the front roof slab slid off onto the sand, broken in two
    for q, (ds, dt) in enumerate(((1.25, -0.2), (1.55, 0.45))):
        x, y = S.xy(s0 + ds, t0 + dt)
        gz = _gz(x, y)
        C.chunk("shrine_slab%d" % q, (x, y, gz), 0.32, "basalt", 40 + q, flat=0.18, tilt=0.35)
    # the face in the niche, worn smooth, turned to the sea
    fx_, fy_ = S.xy(s0 + 0.2, t0)
    P.sphere("shrine_face", (fx_, fy_, top + 0.32), 0.17, "carved", scale=(0.55, 1.0, 1.25))
    nx, ny = S.xy(s0 + 0.36, t0)
    P.sphere("shrine_face_nose", (nx, ny, top + 0.3), 0.04, "carved", scale=(1.2, 0.7, 1.3))
    # the ring of low standing drums, half toppled
    for k in range(7):
        a = 2 * math.pi * k / 7 + 0.3
        ss, tt = s0 + math.cos(a) * 2.6, t0 + math.sin(a) * 2.6
        x, y = S.xy(ss, tt)
        if k % 2 == 0:
            C.rough_prism("shrine_ring%d" % k, _drum_poly(ss, tt, 0.28, 5, rnd), _gz(x, y) - 0.2, _gz(x, y) + rnd.uniform(0.45, 0.75),
                          "basalt", 60 + k, 0.0, rnd.uniform(0, 0.2), (0.0, 0.0), 0.8, drum=(0.3, 0.45))
            OBSTACLES.append((ss, tt, 0.4))
        else:
            C.chunk("shrine_ring%d" % k, (x, y, _gz(x, y)), 0.3, "basalt", 60 + k, flat=0.7, tilt=1.2)
            OBSTACLES.append((ss, tt, 0.35))
    # the worn tools across the step, seaward: a mattock, an adze, a hoe, a spade, their handles grey, the iron rusted
    for q in range(4):
        ss, tt = s0 + 1.0, t0 - 0.75 + q * 0.5
        x0_, y0_ = S.xy(ss - 0.25, tt + rnd.uniform(-0.05, 0.05))
        x1_, y1_ = S.xy(ss + 0.35, tt + rnd.uniform(-0.05, 0.05))
        z_ = _gz(x0_, y0_) + 0.03
        P.tube("shrine_tool%d" % q, [(x0_, y0_, z_), (x1_, y1_, z_)], [0.022, 0.02], "wood", 6)
        P.box("shrine_toolhead%d" % q, (x1_ - 0.05, y1_ - 0.08, z_ - 0.02), (x1_ + 0.05, y1_ + 0.08, z_ + 0.03), "rust",
              rot_z=rnd.uniform(-0.3, 0.3))


def canoes():
    """the shore folk's old canoes (the area page: "upturned, grey and split, from when the dead were given to the Red"):
    long dugouts turned keel up above the tide line, gone silver, split along their grain, a plank sprung, the tall prow
    of one carved as the serpent's head"""
    for k, (s0, t0, yaw, ln) in enumerate(((50.5, -18.0, 0.18, 6.8), (49.2, 23.5, -0.12, 5.9))):
        nu, nv = 18, 9
        verts, faces = [], []
        for i in range(nu):
            u = i / (nu - 1) - 0.5
            taper = math.sqrt(max(0.0, 1.0 - (2 * u) ** 2)) ** 0.7
            rise = 0.35 * (2 * abs(u)) ** 4                                   # the ends sweep up into prows
            for j in range(nv):
                a = math.pi * j / (nv - 1)
                w = -math.cos(a) * 0.48 * taper
                hgt = math.sin(a) * 0.42 * (0.35 + 0.65 * taper)
                ss = s0 + u * ln * math.sin(yaw) + w * math.cos(yaw)
                tt = t0 + u * ln * math.cos(yaw) - w * math.sin(yaw)
                x, y = S.xy(ss, tt)
                verts.append((x, y, _gst(s0, t0) + hgt + rise - 0.06))
        for i in range(nu - 1):
            for j in range(nv - 1):
                if k == 0 and i in (9, 10) and j in (3, 4):
                    continue                                                  # a sprung plank: a hole in the hull
                faces.append((i * nv + j, i * nv + j + 1, (i + 1) * nv + j + 1, (i + 1) * nv + j))
        o = P.poly("canoe%d" % k, verts, faces, "cedar")
        m = o.modifiers.new("solid", "SOLIDIFY")
        m.thickness = 0.05
        OBSTACLES.append((s0, t0, ln * 0.35))
        OBSTACLES.append((s0 + ln * 0.3 * math.sin(yaw), t0 + ln * 0.3 * math.cos(yaw), 0.6))
        OBSTACLES.append((s0 - ln * 0.3 * math.sin(yaw), t0 - ln * 0.3 * math.cos(yaw), 0.6))
        if k == 0:
            # the prow carved as the serpent's head, raised, its jaw open
            ps, pt = s0 + 0.5 * ln * math.sin(yaw), t0 + 0.5 * ln * math.cos(yaw)
            x, y = S.xy(ps, pt)
            z = _gst(s0, t0) + 0.7
            P.tube("canoe_prow", [(x, y, z - 0.35), (x, y, z), S.xy(ps + 0.1 * math.sin(yaw), pt + 0.25 * math.cos(yaw)) + (z + 0.2,)],
                   [0.12, 0.1, 0.08], "cedar", 7)
            hx, hy = S.xy(ps + 0.15 * math.sin(yaw), pt + 0.42 * math.cos(yaw))
            P.sphere("canoe_prow_head", (hx, hy, z + 0.24), 0.14, "cedar", scale=(1.5, 0.8, 0.8))


def cairns():
    """pilgrims' cairns of column drums stacked on the backshore, each a few drums smaller as they go up, one fallen"""
    rnd = random.Random(113)
    spots = [(33.0, -10.0), (41.5, 21.0), (30.5, 28.5), (45.0, -31.0), (35.5, -2.5)]
    for k, (s0, t0) in enumerate(spots):
        x, y = S.xy(s0, t0)
        z = _gz(x, y) - 0.1
        n = rnd.randint(3, 5)
        r = rnd.uniform(0.32, 0.42)
        if k == 3:
            for q in range(n):                                                # fallen: its drums strewn
                fx_, fy_ = S.xy(s0 + rnd.uniform(-0.9, 0.9), t0 + rnd.uniform(-0.9, 0.9))
                C.chunk("cairn%d_%d" % (k, q), (fx_, fy_, _gz(fx_, fy_)), r * (1 - q * 0.12), "basalt", 80 + q, flat=0.5)
            OBSTACLES.append((s0, t0, 0.8))
            continue
        for q in range(n):
            rr = r * (1 - q * 0.14)
            hq = rnd.uniform(0.22, 0.32)
            ds, dt = rnd.uniform(-0.04, 0.04), rnd.uniform(-0.04, 0.04)
            C.rough_prism("cairn%d_%d" % (k, q), _drum_poly(s0 + ds, t0 + dt, rr, rnd.randint(5, 7), rnd), z, z + hq, "basalt",
                          90 + k * 7 + q, 0.0, 0.0, (0.0, 0.0), 0.8, drum=(hq + 1, hq + 2))
            z += hq + 0.01
        OBSTACLES.append((s0, t0, r + 0.15))


def memorial_pole():
    """a memorial pole of stacked faces (the area page: "on the headland, memorial poles of stacked human faces looking
    out to sea, each capped with a little tiered roof"): a grey cedar pole at the foot of the left headland, faces
    one above another turned to the Red, the lowest worn almost away, a little tiered roof at its top, leaning"""
    s0, t0 = 57.5, -34.5
    x, y = S.xy(s0, t0)
    z0 = _gz(x, y) - 0.3
    hgt = 6.0
    lean = S.xy(s0 + 0.25, t0 + 0.1)
    pts = [(x + (lean[0] - x) * u, y + (lean[1] - y) * u, z0 + hgt * u) for u in np.linspace(0, 1, 7)]
    P.tube("pole", pts, [0.33, 0.31, 0.3, 0.29, 0.28, 0.27, 0.26], "cedar", 12)
    OBSTACLES.append((s0, t0, 0.55))
    # the faces: a brow, two sockets left hollow by the carving, a nose, a mouth, every metre or so up the pole
    for k in range(5):
        u = 0.12 + k * 0.17
        cx, cy, cz = (x + (lean[0] - x) * u, y + (lean[1] - y) * u, z0 + hgt * u)
        fs, ft = S.st(np.array(cx), np.array(cy))
        fx_, fy_ = S.xy(float(fs) + 0.28, float(ft))
        wear = 0.5 if k == 0 else 1.0
        P.sphere("pole_brow%d" % k, (fx_, fy_, cz + 0.22), 0.1 * wear, "cedar", scale=(0.6, 2.4, 0.6))
        P.sphere("pole_nose%d" % k, (fx_, fy_, cz + 0.02), 0.07 * wear, "cedar", scale=(1.0, 0.7, 1.6))
        mx, my = S.xy(float(fs) + 0.26, float(ft))
        P.sphere("pole_mouth%d" % k, (mx, my, cz - 0.2), 0.06 * wear, "cedar", scale=(0.7, 2.0, 0.6))
    # the little tiered roof
    tx, ty, tz = pts[-1]
    for q, (r, dz) in enumerate(((0.55, 0.0), (0.38, 0.22), (0.22, 0.4))):
        P.sphere("pole_roof%d" % q, (tx, ty, tz + dz + 0.1), r, "cedar", scale=(1.0, 1.0, 0.28))


def more_dead():
    """the washed-up dead along the whole strand (the area page): on the face, in the wet band, at the high-tide line in
    the wrack, against the bone jam; sparse, each as the water left it"""
    RW._gz = _gz
    rnd = random.Random(127)
    k = 10
    for _ in range(9):
        t_ = rnd.uniform(T0 + 6, T1 - 6)
        if -14 < t_ < 6:
            continue                                                          # the review frame's own dead are there
        s_ = rnd.choice((rnd.uniform(60.0, 64.5), rnd.uniform(56.5, 58.5), rnd.uniform(51.0, 54.0)))
        if float(BF.cove_d(np.array([s_]), np.array([t_]))[0]) > -2.0:
            continue
        RW.corpse(k, s_, t_, rnd.uniform(-3.1, 3.1), rnd.randint(0, 2), rnd.uniform(0.03, 0.06), rnd.random() < 0.5)
        OBSTACLES.append((s_, t_, 0.7))
        k += 1


def build(root, material):
    P.init(root, material)
    del OBSTACLES[:]
    ground()
    sea()
    film()
    if not CALM:
        lip()
        bore()
    pebbles()
    wrack()
    bones_jam()
    dead()
    more_dead()
    drowned()
    shrine()
    canoes()
    cairns()
    memorial_pole()
    cove_cliffs()
    sea_columns()
    cleft_gate()
    driftwood()
    kelp_heaps()
    cobble_patches()
    dune_grass()
    if os.environ.get("GM_OBST"):
        with open(os.environ["GM_OBST"], "w") as fh:
            json.dump([[round(a, 2), round(b, 2), round(c, 2)] for a, b, c in OBSTACLES], fh)
