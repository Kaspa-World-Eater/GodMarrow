"""The Red Water and the black sand (tools/landkit/passes/red_water_sand.md): the Red Shore's first piece, at the game's
scale. A fine ground mesh holding the sand's own small forms (shore_fine: ripples, swash ridges, the footprints coming
up out of the water), the sea as a real surface (swells, the breaker line, the swash sheet), and what the tide left on
its line: kelp, and a pilgrim's cloak and staff."""
import math
import random
import numpy as np
import parts3d as P
import shore_floor as S
import shore_fine as SF

FLOOR_MODULE = "shore_fine"
LAMPS = []


def _st_grid(name, s0, s1, t0, t1, res, zfun, mat, keep=None):
    ss = np.arange(s0, s1, res)
    ts = np.arange(t0, t1, res)
    Sg, Tg = np.meshgrid(ss, ts)
    X, Y = S.xy(Sg, Tg)
    Z = zfun(Sg, Tg)
    ns, nt = len(ss), len(ts)
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1).tolist()
    faces = []
    K = None if keep is None else keep(Sg, Tg).ravel()
    for j in range(nt - 1):
        for i in range(ns - 1):
            a = j * ns + i
            if K is not None and not (K[a] and K[a + 1] and K[a + ns] and K[a + ns + 1]):
                continue                                            # under the sand: no face, no shard
            faces.append((a, a + ns, a + ns + 1, a + 1))
    me = P.bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(faces))
    me.update()
    return P._link(name, me, mat)


def ground():
    _st_grid("sand", 44.0, 76.0, -12.5, 12.5, 0.05, lambda s, t: SF.height(*S.xy(s, t)), "ground")


def sea():
    def keep(s, t):
        x, y = S.xy(s, t)
        return SF.water(s, t)[0] > SF.height(x, y) - 0.1
    # fine where the film runs thin over the sand (its edge and the cusps' lobes), coarser out on the swells
    _st_grid("red_water_shallows", 60.0, 70.0, -16.0, 16.0, 0.05, lambda s, t: SF.water(s, t)[0], "blood", keep)
    _st_grid("red_water", 69.96, 110.0, -16.0, 16.0, 0.1, lambda s, t: SF.water(s, t)[0], "blood", keep)


def curl_profile(k):
    """the breaker's cross-section (ds seaward of its line, dz above the sea) at a phase k along the shore: the back
    rising slow and heavy, the crest, the lip thrown forward over a dark hollow and curling down; where k is low the
    lip has already fallen and the wave is a slumped wall of foam"""
    lip = 0.35 + 0.65 * k                                             # how far the lip has thrown forward
    h = 0.75 + 0.45 * k
    return [(2.6, 0.0), (1.5, h * 0.3), (0.7, h * 0.7), (0.2, h * 0.96), (-0.25 * lip, h), (-0.6 * lip, h * 0.9),
            (-0.85 * lip, h * 0.68), (-0.92 * lip, h * 0.45), (-0.8 * lip, h * 0.3), (-0.55 * lip, h * 0.33)]


def breaker():
    """the line of breakers folding late (the area page), as real form on the 3D road: a sheet swept along the shore
    through its cross-section, the curl changing slowly along its length, sections already collapsed"""
    ts = np.arange(-16.0, 16.0, 0.12)
    rows = []
    for t_ in ts:
        bs = 73.8 + 0.8 * math.sin(t_ / 5.0)
        # the curl peels along the shore over the loop: it folds late and falls slowly
        k = 0.5 + 0.5 * math.sin(t_ / 3.3 + 1.0 - 2 * math.pi * SF.TIME) * math.cos(t_ / 7.1)
        prof = curl_profile(max(0.0, min(1.0, k)))
        row = []
        for ds, dz in prof:
            x, y = S.xy(bs + ds, t_)
            base = float(SF.water(np.array([bs + 2.6]), np.array([t_]))[0][0]) if ds > 2.5 else 0.0
            row.append((x, y, dz + base))
        rows.append(row)
    n = len(rows[0])
    verts = [p for row in rows for p in row]
    faces = []
    for j in range(len(rows) - 1):
        for i in range(n - 1):
            a = j * n + i
            faces.append((a, a + 1, a + n + 1, a + n))
    me = P.bpy.data.meshes.new("breaker")
    me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(faces))
    me.update()
    o = P._link("breaker", me, "blood")
    m = o.modifiers.new("solid", "SOLIDIFY")
    m.thickness = 0.04


def wrack():
    """the high-water line's wrack (chapter 10): kelp heaped and strewn, and what the Red gave back"""
    rnd = random.Random(4)
    for i in range(90):
        t_ = rnd.uniform(-13, 13)
        line = S.FORE_S - 1.0 if i < 60 else S.FORE_S - 4.5
        s_ = line + 0.5 * float(np.sin(t_ * 0.4)) + rnd.uniform(-0.4, 0.4)
        x, y = S.xy(s_, t_)
        z = float(SF.height(np.array([x]), np.array([y]))[0])
        a = rnd.uniform(0, 2 * math.pi)
        ln = rnd.uniform(0.4, 1.4)
        pts = [(x + math.cos(a) * ln * u + math.sin(u * 5 + i) * 0.08, y + math.sin(a) * ln * u, z + 0.025) for u in (0, 0.33, 0.66, 1.0)]
        P.tube("kelp%d" % i, pts, [0.03, 0.035, 0.03, 0.015], "kelp", 5)
    # a pilgrim's cloak, sodden and sprawled, and the staff a little above it, where the tide left them
    cs, ct = S.FORE_S - 0.8, -4.2
    verts, faces = [], []
    nu, nv = 14, 10
    for j in range(nv):
        for i in range(nu):
            u, v = i / (nu - 1), j / (nv - 1)
            s_ = cs + (v - 0.5) * 1.1 + 0.12 * math.sin(u * 7.0)
            t_ = ct + (u - 0.5) * 1.6 + 0.1 * math.sin(v * 5.0)
            x, y = S.xy(s_, t_)
            fold = 0.05 * max(0.0, math.sin(u * 9.0 + v * 2.0)) + 0.07 * math.exp(-((u - 0.3) ** 2 + (v - 0.6) ** 2) / 0.03)
            verts.append((x, y, float(SF.height(np.array([x]), np.array([y]))[0]) + 0.02 + fold))
    for j in range(nv - 1):
        for i in range(nu - 1):
            a = j * nu + i
            faces.append((a, a + nu, a + nu + 1, a + 1))
    P.poly("cloak", verts, faces, "cloth")
    p0, p1 = S.xy(cs - 1.4, ct - 1.6), S.xy(cs - 0.9, ct + 0.3)
    z0 = float(SF.height(np.array([p0[0]]), np.array([p0[1]]))[0])
    z1 = float(SF.height(np.array([p1[0]]), np.array([p1[1]]))[0])
    P.tube("staff", [(p0[0], p0[1], z0 + 0.04), (p1[0], p1[1], z1 + 0.04)], [0.035, 0.03], "wood", 6)


def _body_xy(s0, t0, yaw, u, w):
    ss = s0 + u * math.cos(yaw) - w * math.sin(yaw)
    tt = t0 + u * math.sin(yaw) + w * math.cos(yaw)
    return S.xy(ss, tt)


def _gz(x, y):
    return float(SF.height(np.array([x]), np.array([y]))[0])


def corpse(k, s0, t0, yaw, rot, sink, flung):
    """one of the dead the Red gave back (the area page: "the washed-up dead along the strand"; Derek: "bodies embedded
    into the shoreline. Rotting corpses"), lying face down as the water left it, sunk a little into the wet sand:
    drowned and bloated (rot 0), rotting (1) or gone to bone (2), the arms flung forward or by its sides. Since
    2026-10-09 every dead is the one shared body (body3d.py; Derek: "Bodies look bad")"""
    import body3d as B
    x, y = S.xy(s0, t0)
    d0 = S.xy(s0 + math.cos(yaw), t0 + math.sin(yaw))
    wy = math.atan2(d0[1] - y, d0[0] - x)
    B.body("corpse%d" % k, "prone_reach" if flung else "prone", ("bloat", "rot", "bone")[min(rot, 2)], x, y, wy,
           lambda a, b: _gz(a, b) - sink, seed=k * 7 + 3)


def corpses():
    # where the Red left them: in the swash, on the wet foreshore, along the wrack line; the trail of prints between
    for k, (s0, t0, yaw, rot, sink, flung) in enumerate((
            (63.6, -2.5, 0.5, 0, 0.05, True), (64.3, 7.8, -1.9, 1, 0.06, False), (58.7, -6.3, 2.6, 2, 0.05, True),
            (56.2, 5.6, 1.2, 0, 0.04, False), (51.4, -8.6, -0.4, 1, 0.04, True), (60.4, 9.6, 0.2, 0, 0.07, False))):
        corpse(k, s0, t0, yaw, rot, sink, flung)


def things():
    """what the Red gives back and the sea sorts (chapter 10: everything on a beach is sorted by the waves' energy):
    black basalt cobbles in a band at the old high water and strewn below it, each a tilted stone with its own shape
    (chapter 04: never domes); the bones of the dead, broken and scattered, a jaw, a long bone, vertebrae; and the
    pilgrims' things: a lantern on its side, a bowl, a sandal, a coil of rope, beads come off their string"""
    rnd = random.Random(17)
    for i in range(140):
        band = rnd.random() < 0.6
        s_ = (S.FORE_S - 1.4 + rnd.gauss(0, 0.5)) if band else rnd.uniform(52.5, 64.0)
        t_ = rnd.uniform(-12.5, 12.5)
        x, y = S.xy(s_, t_)
        r = rnd.uniform(0.05, 0.16) * (1.3 if band else 0.8)
        o = P.sphere("cobble%d" % i, (x, y, _gz(x, y) + r * 0.25), r, "basalt",
                     scale=(1.0, rnd.uniform(0.6, 0.9), rnd.uniform(0.35, 0.55)))
        o.rotation_euler = (rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25), rnd.uniform(0, 3.14))
    for i in range(26):
        s_, t_ = rnd.uniform(50.0, 64.5), rnd.uniform(-12.5, 12.5)
        x, y = S.xy(s_, t_)
        z = _gz(x, y)
        a = rnd.uniform(0, math.pi)
        kind = rnd.random()
        if kind < 0.45:                                             # a long bone, its knuckled ends
            ln = rnd.uniform(0.25, 0.45)
            p0 = (x - math.cos(a) * ln / 2, y - math.sin(a) * ln / 2, z + 0.02)
            p1 = (x + math.cos(a) * ln / 2, y + math.sin(a) * ln / 2, z + 0.02)
            P.tube("lbone%d" % i, [p0, p1], [0.022, 0.02], "bone", 6)
            P.sphere("lknob%d_a" % i, p0, 0.035, "bone", scale=(1, 1, 0.7))
            P.sphere("lknob%d_b" % i, p1, 0.03, "bone", scale=(1, 1, 0.7))
        elif kind < 0.75:                                           # vertebrae, a few in a broken run
            for k in range(rnd.randint(2, 5)):
                P.sphere("vert%d_%d" % (i, k), (x + math.cos(a) * k * 0.07, y + math.sin(a) * k * 0.07, z + 0.02), 0.03, "bone",
                         scale=(0.8, 1.3, 0.7))
        else:                                                       # a jaw, half sunk
            P.tube("jaw%d" % i, [(x - 0.08, y, z + 0.01), (x, y + 0.07, z + 0.03), (x + 0.08, y, z + 0.01)], [0.018, 0.022, 0.018], "bone", 5)
    # the pilgrims' things
    lx, ly = S.xy(55.5, -1.6)
    o = P.cylinder("lantern", (lx, ly, _gz(lx, ly) + 0.08), 0.08, 0.22, "iron", sides=8)
    o.rotation_euler = (1.45, 0.0, 0.6)
    bx, by = S.xy(57.4, 3.6)
    P.sphere("bowl", (bx, by, _gz(bx, by) + 0.02), 0.1, "wood", scale=(1.0, 1.0, 0.45))
    sx_, sy_ = S.xy(53.2, 7.1)
    P.sphere("sandal", (sx_, sy_, _gz(sx_, sy_) + 0.01), 0.13, "cloth", scale=(1.0, 0.42, 0.12))
    cx, cy = S.xy(51.8, -3.0)
    pts = [(cx + 0.18 * math.cos(u) * (1 - u / 20), cy + 0.18 * math.sin(u) * (1 - u / 20), _gz(cx, cy) + 0.02 + u * 0.002) for u in np.linspace(0, 14, 40)]
    P.tube("rope", pts, [0.016] * len(pts), "straw", 5)
    for k in range(9):
        a = k * 0.7
        px, py = S.xy(56.2 + math.cos(a) * 0.3 + k * 0.05, -0.4 + math.sin(a) * 0.25)
        P.sphere("bead%d" % k, (px, py, _gz(px, py) + 0.015), 0.018, "gold")


def floating():
    """the dead the Red has not yet given back: one face down in the shallows, rising and falling, and a cloak
    spread on the water beside it; rafts of dark foam drifting"""
    for k, (s0, t0, yaw) in enumerate(((68.2, -5.0, 0.9), (70.1, 6.3, -0.4))):
        def at(u, w, z):
            x, y = _body_xy(s0, t0, yaw, u, w)
            return (x, y, float(SF.water(np.array([s0 + u * math.cos(yaw)]), np.array([t0 + u * math.sin(yaw)]))[0][0]) + z)
        d0, d1 = S.xy(s0 + math.cos(yaw), t0 + math.sin(yaw)), S.xy(s0, t0)
        ang = math.atan2(d0[1] - d1[1], d0[0] - d1[0])
        o = P.sphere("float%d_torso" % k, at(0, 0, 0.04), 1.0, "corpse", scale=(0.42, 0.28, 0.12))
        o.rotation_euler = (0, 0, ang)
        P.sphere("float%d_head" % k, at(0.62, 0.0, 0.0), 0.12, "corpse", scale=(1.1, 0.9, 0.6))
        for side in (-1, 1):
            P.tube("float%d_arm%d" % (k, side), [at(0.3, side * 0.26, 0.02), at(0.55, side * 0.5, -0.01), at(0.7, side * 0.62, -0.03)],
                   [0.06, 0.055, 0.045], "corpse", 6)
            P.tube("float%d_leg%d" % (k, side), [at(-0.5, side * 0.12, 0.0), at(-1.0, side * 0.2, -0.03), at(-1.35, side * 0.24, -0.05)],
                   [0.075, 0.06, 0.05], "corpse", 6)
        verts = []
        for j in range(5):
            for i in range(7):
                u, w = -0.6 + i * 0.22, -0.55 + j * 0.27
                x, y = _body_xy(s0, t0, yaw, u, w)
                verts.append((x, y, at(u, w, 0.0)[2] + 0.015 + 0.08 * max(0.0, 1 - (u / 0.6) ** 2 - (w / 0.35) ** 2)))
        faces = [(j * 7 + i, j * 7 + i + 1, (j + 1) * 7 + i + 1, (j + 1) * 7 + i) for j in range(4) for i in range(6) if (i + j + k) % 4]
        P.poly("float%d_cloak" % k, verts, faces, "cloth")


def build(root, material):
    P.init(root, material)
    ground()
    sea()
    breaker()
    wrack()
    corpses()
    things()
    floating()
