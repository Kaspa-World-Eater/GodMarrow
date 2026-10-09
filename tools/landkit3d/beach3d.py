"""The Red Water and the black sand, rebuilt from study chapter 13 (tools/landkit/passes/red_water_sand.md, pass 5).

Everything with height is real form (MASTER_RULES 0): the beach's profile by cause (beach_floor: the step, the steep
face cut into cusps, the berm, the backshore), the pebbles and cobbles the waves sorted onto the horns and the berm,
the one heavy shore-break peeling from the headland (an unbroken swell, a curling lip with its hollow under it, the bore
of foam lumps), the swash sheet with a real step at its front, the glossy film the backwash leaves (a mirror, so the
reflection pass shows the cliffs and the dead in it), the wrack lines, the drift-log jam, the dead the Red gave back,
and the black cliffs (cliff3d.cliffs_v2) closing the beach on the right. Only what is smaller than a pixel is painted
(paint_shore.py): the lace, the grain, the stain.

  blender --background --python blend_scene.py -- beach3d OUT -48.44 -42.78 480 340     (GM_T sets the wave's time)
"""
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
T0, T1 = -16.0, 11.0                         # the stretch of shore built (along t)


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
    st_grid("sand", 43.0, 74.0, T0, T1, 0.06, BF.height_st, "ground")


def sea():
    """the Red: the swash sheet and the bore fine where they run thin over the sand, the swell coarser out past the
    step; only where the water stands above the sand"""
    def zf(s, t):
        return BF.sea_z(s, t)[0]
    def keep(s, t, z):
        return z > BF.height_st(s, t) + 0.003
    st_grid("red_shallows", 57.0, 72.6, T0, T1, 0.06, zf, "pool", keep)
    st_grid("red_sea", 72.0, 96.0, T0, T1, 0.12, zf, "pool", keep)


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
            for q in range(rnd.randint(3, 6)):
                ds = rnd.uniform(0.0, 1.8) ** 1.4
                s_ = bf + ds
                tt = t_ + rnd.uniform(-0.15, 0.15)
                zw, g = BF.sea_z(np.array([s_]), np.array([tt]))
                r = rnd.uniform(0.08, 0.22) * fresh * (1.0 if ds < 0.5 else 0.7)          # thick froth, heaped, no spray
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
    for _ in range(26000):
        s_, t_ = rnd.uniform(52.0, 66.3), rnd.uniform(T0, T1)
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
    for i in range(420):
        s_, t_ = rnd.uniform(53.0, 66.0), rnd.uniform(T0, T1)
        c = float(BF.cusp(np.array([t_]))[0])
        x, y = S.xy(s_, t_)
        foot = C.face_dist(x, y)
        horn = max(0.0, c) ** 2 * (1.0 if 58.0 < s_ < 65.5 else 0.0)
        berm = math.exp(-((s_ - (BF.BERM_S + 0.2)) / 0.5) ** 2)
        if rnd.random() > 0.05 + 0.5 * horn + 0.5 * berm + (0.8 if -3.0 < foot < 0.3 else 0.0):
            continue
        r = rnd.uniform(0.08, 0.2)
        P.sphere("cobble%d" % i, (x, y, _gz(x, y) + r * 0.22), r, "stone",
                 scale=(1.0, rnd.uniform(0.65, 0.9), rnd.uniform(0.4, 0.6)),
                 rot=(rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), rnd.uniform(0, 6.28)))
    return n


def wrack():
    """the wrack (chapter 13, section 4): a broken line of kelp and splinters at the last high tide, a few of the dead's
    bones in it; an older, higher, sparser storm line, dried to grey, against the logs"""
    rnd = random.Random(41)
    for i in range(170):
        storm = i >= 120
        t_ = rnd.uniform(T0, T1)
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
            # a splinter of wood
            b = rnd.uniform(0, math.pi)
            l2 = rnd.uniform(0.2, 0.6)
            P.tube("spl%d" % i, [(x, y, z + 0.02), (x + math.cos(b) * l2, y + math.sin(b) * l2, z + 0.02)], [0.025, 0.012], "cedar", 5)
    for i in range(14):
        t_ = rnd.uniform(T0, T1)
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


def logs():
    """the drift-log jam (chapter 13, section 4; Rialto, Ruby): giant trees the storms threw up past the berm, stripped
    and silvered, jammed and piled on each other along the back of the beach, some with their root wads"""
    rnd = random.Random(53)
    laid = []
    for i in range(15):
        t_c = rnd.uniform(T0 - 3, T1 + 2)
        s_c = rnd.uniform(44.0, 49.5) if i < 13 else rnd.uniform(50.0, 52.5)
        r0 = rnd.uniform(0.24, 0.5)
        ln = rnd.uniform(6.0, 13.0)
        yaw = rnd.gauss(0, 0.32)
        ns = 9
        pts, radii = [], []
        bend = rnd.uniform(-0.25, 0.25)
        for k in range(ns):
            u = k / (ns - 1) - 0.5
            s_ = s_c + u * ln * math.sin(yaw) + bend * (1 - 4 * u * u)
            t_ = t_c + u * ln * math.cos(yaw)
            x, y = S.xy(s_, t_)
            r = r0 * (1.0 - 0.35 * (u + 0.5)) * (1 + 0.05 * math.sin(k * 2.3 + i))
            z = _gz(x, y) + r * 0.75
            for (lx, ly, lz, lr) in laid:
                dd = math.hypot(lx - x, ly - y)
                if dd < lr + r * 0.9:
                    z = max(z, lz + (lr + r) * 0.8 * math.sqrt(max(0.0, 1 - (dd / (lr + r)) ** 2)) + 0.02)
            pts.append((x, y, z))
            radii.append(r)
        o = P.tube("log%d" % i, pts, radii, "cedar", 14)
        for (x, y, z), r in zip(pts, radii):
            laid.append((x, y, z, r))
        if rnd.random() < 0.4:
            # a root wad at the butt: the stubs of the roots spread round it, broken
            bx, by, bz = pts[0]
            dx, dy = pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]
            dl = math.hypot(dx, dy) + 1e-9
            dx, dy = dx / dl, dy / dl
            for q in range(rnd.randint(6, 10)):
                a = rnd.uniform(0, 2 * math.pi)
                ex, ey = -dy * math.cos(a), dx * math.cos(a)
                ez = math.sin(a)
                rl = rnd.uniform(0.8, 2.0) * r0 * 2
                tip = (bx + (ex * 0.8 + dx * 0.4) * rl, by + (ey * 0.8 + dy * 0.4) * rl, max(bz + ez * rl * 0.8, _gz(bx, by) + 0.05))
                mid = ((bx + tip[0]) / 2 + rnd.uniform(-0.1, 0.1), (by + tip[1]) / 2, (bz + tip[2]) / 2 + 0.1)
                P.tube("root%d_%d" % (i, q), [(bx, by, bz), mid, tip], [r0 * 0.35, r0 * 0.2, 0.03], "cedar", 7)


def dead():
    """the dead the Red gives back (the area page: "the beach of the dead"), as the water left them: one in the swash,
    turned by each wave, one on the face, one at the high-tide line in the wrack, one rotted to its ribs against the
    logs"""
    RW._gz = _gz
    for k, (s0, t0, yaw, rot, sink, flung) in enumerate((
            (63.4, -9.4, 0.5, 0, 0.05, True), (61.2, 1.6, -1.9, 1, 0.06, False), (57.6, -12.2, 2.6, 0, 0.04, True),
            (54.8, 3.4, 1.2, 2, 0.04, False), (52.6, -6.8, -0.4, 1, 0.04, True))):
        RW.corpse(k, s0, t0, yaw, rot, sink, flung)
    # a pilgrim's staff and lantern lost at the high-tide line
    p0, p1 = S.xy(57.2, -1.8), S.xy(57.9, -0.2)
    P.tube("staff", [(p0[0], p0[1], _gz(*p0) + 0.04), (p1[0], p1[1], _gz(*p1) + 0.04)], [0.035, 0.03], "wood", 6)
    lx, ly = S.xy(56.4, -2.9)
    o = P.cylinder("lantern", (lx, ly, _gz(lx, ly) + 0.08), 0.08, 0.22, "iron", sides=8)
    o.rotation_euler = (1.45, 0.0, 0.6)


def cliffs():
    C.SF = types.SimpleNamespace(height=BF.height)        # the columns stand on the new beach
    return C.cliffs_v2()


def build(root, material):
    P.init(root, material)
    ground()
    sea()
    film()
    lip()
    bore()
    pebbles()
    wrack()
    logs()
    dead()
    cliffs()
