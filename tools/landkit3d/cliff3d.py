"""The black cliffs that close the beach (tools/landkit/passes/black_cliffs.md): the Red Shore's piece 2, a headland of
columnar basalt (Reynisfjara's columns, chapter 10's headlands), built on the 3D road at the game's scale beside the
beach of piece 1 (redwater3d), so the two are seen together.

The columns are cells of one irregular hexagonal tiling (a hex lattice whose corners are each moved by their own hash,
shared by the cells that meet there, so the columns pack tight with no gaps), each extruded as a prism to a height set
by its cause: the wall standing tall inland of the beach's end, broken down toward the sand into a stair of stumps,
standing in the surf where the sea has cut it. Every column is crossed by joints (a real gap a few hundredths wide)
every yard or so; its top flat or gently cupped (the cupped ones at the foot hold the blood)."""
import math
import random
import numpy as np
import parts3d as P
import shore_floor as S
import shore_fine as SF
import redwater3d as RW

FLOOR_MODULE = "shore_fine"
LAMPS = []
T_END = 9.0                  # where the sand ends against the cliff (along the shore)
CELL = 0.62                  # a hex's corner radius, in yards (a column about a yard across)


def _h(i, j, s):
    v = math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453
    return v - math.floor(v)


def corner(i, j):
    """a corner of the hex lattice (in s, t), moved by its own hash so the tiling is irregular and still tight"""
    w = CELL * math.sqrt(3)
    s_ = i * CELL * 1.5
    t_ = j * w / 2.0
    return s_ + (_h(i, j, 1) - 0.5) * CELL * 0.55, t_ + (_h(i, j, 2) - 0.5) * CELL * 0.55


def cell_corners(ci, cj):
    """the six corners of hex cell (ci, cj) in the corner lattice (flat-topped hexes, offset rows)"""
    i0 = ci * 2
    j0 = cj * 2 + (ci % 2)
    return [corner(i0 - 1, j0), corner(i0, j0 - 1), corner(i0 + 1, j0 - 1), corner(i0 + 2, j0), corner(i0 + 1, j0 + 1), corner(i0, j0 + 1)]


Y_FACE = -49.0              # the headland's face runs along the game's x, so it looks toward the camera (a sheer face
                            # turned to the viewer, never seen edge-on); the cliff is everything beyond it


def face_dist(x, y):
    """how far into the headland (yards): the face wanders in bays and buttresses"""
    yf = Y_FACE + 1.6 * math.sin(x * 0.27) + 0.9 * math.sin(x * 0.71 + 1.3) + (_h(int(x * 0.5), 3, 12) - 0.5) * 0.8
    return yf - y


def column_height(s_, t_, k, x=0.0, y=0.0):
    """the cliff by cause: behind its face the wall stands 20 to 30 yd (its top out of frame); at its foot a short talus
    of stumps where columns broke and fell; out in the sea the waves have cut it to stumps and single columns"""
    d = face_dist(x, y)
    if d < 0:
        return 0.0
    wall = 22.0 + 6.0 * _h(int(s_ * 3), int(t_ * 3), 9)
    stair = 0.5 + d * 6.0 + k * 1.5                          # a short talus, then the sheer wall
    h = min(wall, stair)
    sea = s_ - 64.0                                          # past the waterline the sea has broken them down
    if sea > 0:
        h = min(h, max(0.4, 6.0 - sea * 0.6 + k * 2.0))
        if _h(int(s_ * 5), int(t_ * 5), 11) < 0.12 * min(sea, 5):
            h = 0.0                                          # gone, the sea between
    return h


def prism(name, pts, z0, z1, mat, cup=0.0, lean=(0.0, 0.0), broken=0.0, proud=(0.0, 0.0)):
    """a basalt column from z0 to z1 over its corner polygon, as the real ones stand (chapter 04; Reynisfjara):
    stacked in blocks a yard or so tall, each joint a real gap, each block a little shifted and turned on the one below
    and a little narrower or wider, so the joints never line up across the column; its edges chipped where a block
    has lost a corner; the whole column leaning a degree or two and standing a little proud of its neighbours or set
    back. Its top flat, gently cupped, or broken off at a slant (broken > 0 is the slant's drop, in yards)"""
    n = len(pts)
    verts, faces = [], []
    rnd = random.Random(hash(name) % 100000)
    cx0 = sum(p[0] for p in pts) / n + proud[0]
    cy0 = sum(p[1] for p in pts) / n + proud[1]
    rel = [(x - (cx0 - proud[0]), y - (cy0 - proud[1])) for x, y in pts]
    z = z0
    while z < z1 - 0.05:
        zt = min(z1, z + rnd.uniform(0.6, 1.5))
        base = len(verts)
        sh = rnd.uniform(0.9, 0.985)                                 # this block's own girth
        dx, dy = rnd.uniform(-0.03, 0.03) + lean[0] * z, rnd.uniform(-0.03, 0.03) + lean[1] * z
        tw = rnd.uniform(-0.05, 0.05)                                # and its own small turn
        ct, st_ = math.cos(tw), math.sin(tw)
        ring = []
        for k, (x, y) in enumerate(rel):
            chip = 0.82 if rnd.random() < 0.18 else 1.0               # a corner knocked off this block
            xr, yr = (x * ct - y * st_) * sh * chip, (x * st_ + y * ct) * sh * chip
            ring.append((cx0 + xr + dx, cy0 + yr + dy))
        top = zt >= z1 - 0.01
        for (x, y) in ring:
            verts.append((x, y, z + 0.025))
        for k, (x, y) in enumerate(ring):
            zz = zt - 0.025
            if top and broken > 0:
                # broken off at a slant: the top falls away across the column
                u = ((x - cx0) * math.cos(tw * 9) + (y - cy0) * math.sin(tw * 9)) / 0.6
                zz -= broken * (0.5 + 0.5 * max(-1.0, min(1.0, u)))
            verts.append((x, y, max(zz, z + 0.08)))
        for k in range(n):
            a, b = base + k, base + (k + 1) % n
            faces.append((a, b, b + n, a + n))
        faces.append(tuple(range(base, base + n))[::-1])
        if top and cup > 0:
            ci = len(verts)
            verts.append((cx0 + dx, cy0 + dy, zt - 0.025 - cup))
            for k in range(n):
                a, b = base + n + k, base + n + (k + 1) % n
                faces.append((a, b, ci))
        else:
            faces.append(tuple(range(base + n, base + 2 * n)))
        z = zt
    return P.poly(name, verts, faces, mat)


def cliffs():
    rnd = random.Random(3)
    made = 0
    for ci in range(int(28 / (CELL * 3.0)), int(84 / (CELL * 3.0))):              # a cell spans two corner steps in s
        for cj in range(int(-12 / (CELL * math.sqrt(3))), int(30 / (CELL * math.sqrt(3)))):
            cs = cell_corners(ci, cj)
            s_ = sum(p[0] for p in cs) / 6
            t_ = sum(p[1] for p in cs) / 6
            k = _h(ci, cj, 5)
            cx_, cy_ = S.xy(s_, t_)
            hgt = column_height(s_, t_, k, cx_, cy_)
            if hgt <= 0.0:
                continue
            xy = [S.xy(a, b) for a, b in cs]
            gx, gy = S.xy(s_, t_)
            g = float(SF.height(np.array([gx]), np.array([gy]))[0])
            cup = 0.06 if (hgt < 3.0 and _h(ci, cj, 6) < 0.5) else 0.0
            # each column its own lean (a degree or two), standing proud of the face or set back, the stumps at the
            # foot broken off at a slant
            lean = ((_h(ci, cj, 21) - 0.5) * 0.02, (_h(ci, cj, 22) - 0.5) * 0.02)
            pr = (_h(ci, cj, 23) - 0.5) * 0.35
            broken = 0.0 if (cup or hgt > 15) else (_h(ci, cj, 24) * 0.7 if _h(ci, cj, 25) < 0.7 else 0.0)
            if hgt > 15 and _h(ci, cj, 26) < 0.08:
                hgt = 3.0 + _h(ci, cj, 27) * 8.0                       # a column fallen out of the wall: a recess
                broken = 0.6
            prism("col%d_%d" % (ci, cj), [(x, y) for x, y in xy], min(g, 0.0) - 1.5, max(g, 0.0) + hgt, "basalt", cup,
                  lean, broken, (0.0, pr))
            made += 1
            # the blood standing in a cupped top at the foot
            if cup and s_ > 55:
                z = max(g, 0.0) + hgt - 0.05
                P.poly("cuppool%d_%d" % (ci, cj), [(x, y, z) for x, y in xy][::-1], [tuple(range(6))], "blood")
    # fallen blocks at the foot, lying where they broke off
    for i in range(40):
        x = rnd.uniform(-48, -28)
        y = Y_FACE + rnd.uniform(0.5, 3.5)
        if face_dist(x, y) > -0.3:
            continue
        g = float(SF.height(np.array([x]), np.array([y]))[0])
        r = rnd.uniform(0.35, 0.6)
        pts = [(x + math.cos(a) * r, y + math.sin(a) * r) for a in np.linspace(0, 2 * math.pi, 7)[:-1] + rnd.uniform(0, 1)]
        prism("block%d" % i, pts, g - 0.25, g + rnd.uniform(0.3, 0.9), "basalt")     # set into the sand where it fell
    return made


def build(root, material):
    P.init(root, material)
    RW._st_grid("sand", 38.0, 76.0, -8.0, 17.0, 0.06, lambda s, t: SF.height(*S.xy(s, t)), "ground")
    RW.sea()
    RW.breaker()
    RW.wrack()
    RW.corpses()
    RW.things()
    RW.floating()
    cliffs()
