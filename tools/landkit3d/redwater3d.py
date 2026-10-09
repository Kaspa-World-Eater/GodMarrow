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
        k = 0.5 + 0.5 * math.sin(t_ / 3.3 + 1.0) * math.cos(t_ / 7.1)
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
    into the shoreline. Rotting corpses"): a body lying face down as the water left it, sunk into the wet sand, drowned
    and bloated, or rotted to its ribs and skull; a pilgrim's rag over it. Built as forms at a person's true size"""
    def at(u, w, z):
        x, y = _body_xy(s0, t0, yaw, u, w)
        return (x, y, _gz(x, y) + z - sink)
    d0, d1 = S.xy(s0 + math.cos(yaw), t0 + math.sin(yaw)), S.xy(s0, t0)
    ang = math.atan2(d0[1] - d1[1], d0[0] - d1[0])
    bloat = 1.25 if rot == 0 else 1.0
    tag = "corpse%d" % k
    flesh = "corpse"
    if rot < 2:
        o = P.sphere(tag + "_torso", at(0.0, 0.0, 0.14), 1.0, flesh, scale=(0.4, 0.24 * bloat, 0.17 * bloat))
        o.rotation_euler = (0, 0, ang)
        o = P.sphere(tag + "_hips", at(-0.42, 0.0, 0.12), 1.0, flesh, scale=(0.2, 0.21 * bloat, 0.14 * bloat))
        o.rotation_euler = (0, 0, ang)
        P.sphere(tag + "_head", at(0.6, 0.04, 0.09), 0.115 * bloat, flesh, scale=(1.1, 0.9, 0.85))
    else:
        # rotted to the bone: the spine and the ribs' arcs standing out of the sand, the skull turned aside
        P.tube(tag + "_spine", [at(-0.45, 0, 0.06), at(0.0, 0, 0.1), at(0.45, 0, 0.08)], [0.035, 0.035, 0.03], "bone", 6)
        for r in range(9):
            u = 0.4 - r * 0.075
            for side in (-1, 1):
                P.tube("%s_rib%d_%d" % (tag, r, side), [at(u, 0, 0.1), at(u - 0.04, side * 0.16, 0.16), at(u - 0.07, side * 0.24, 0.02)],
                       [0.014, 0.012, 0.008], "bone", 4)
        P.sphere(tag + "_skull", at(0.62, 0.1, 0.07), 0.1, "bone", scale=(1.2, 0.9, 0.9))
        P.sphere(tag + "_pelvis", at(-0.5, 0, 0.05), 0.13, "bone", scale=(0.8, 1.3, 0.5))
    limb = flesh if rot < 2 else "bone"
    lr = (0.055 if rot < 2 else 0.025) * bloat
    for side in (-1, 1):
        # the arms: one flung up past the head, the other along the side (or both flung, as the water dropped it)
        if flung or side > 0:
            P.tube("%s_arm%d" % (tag, side), [at(0.3, side * 0.24, 0.12), at(0.62, side * 0.36, 0.06), at(0.9, side * 0.32, 0.03)],
                   [lr, lr * 0.9, lr * 0.75], limb, 6)
        else:
            P.tube("%s_arm%d" % (tag, side), [at(0.3, side * 0.25, 0.12), at(0.02, side * 0.32, 0.05), at(-0.28, side * 0.3, 0.03)],
                   [lr, lr * 0.9, lr * 0.75], limb, 6)
        P.tube("%s_leg%d" % (tag, side), [at(-0.55, side * 0.11, 0.1), at(-1.0, side * 0.15, 0.06), at(-1.42, side * 0.2, 0.03)],
               [lr * 1.4, lr * 1.1, lr * 0.85], limb, 6)
    # a rag of a pilgrim's cloak over the back, plastered to it, torn
    verts, faces = [], []
    nu, nv = 8, 6
    for j in range(nv):
        for i in range(nu):
            u = -0.55 + 1.0 * i / (nu - 1)
            w = -0.3 + 0.6 * j / (nv - 1)
            x, y = _body_xy(s0, t0, yaw, u, w)
            body = max(0.0, 1.0 - (u / 0.6) ** 2 - (w / 0.3) ** 2)
            verts.append((x, y, _gz(x, y) - sink + 0.04 + (0.3 if rot < 2 else 0.12) * body ** 0.5 * bloat))
    for j in range(nv - 1):
        for i in range(nu - 1):
            if (i * 7 + j * 3 + k) % 5 == 0:
                continue
            a = j * nu + i
            faces.append((a, a + nu, a + nu + 1, a + 1))
    P.poly(tag + "_rag", verts, faces, "cloth")


def corpses():
    # where the Red left them: in the swash, on the wet foreshore, along the wrack line; the trail of prints between
    for k, (s0, t0, yaw, rot, sink, flung) in enumerate((
            (63.6, -2.5, 0.5, 0, 0.05, True), (64.3, 7.8, -1.9, 1, 0.06, False), (58.7, -6.3, 2.6, 2, 0.05, True),
            (56.2, 5.6, 1.2, 0, 0.04, False), (51.4, -8.6, -0.4, 1, 0.04, True), (60.4, 9.6, 0.2, 0, 0.07, False))):
        corpse(k, s0, t0, yaw, rot, sink, flung)


def build(root, material):
    P.init(root, material)
    ground()
    sea()
    breaker()
    wrack()
    corpses()
