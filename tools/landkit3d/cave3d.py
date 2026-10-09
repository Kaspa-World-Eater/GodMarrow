"""The opening: the cave under the black cliffs (tools/landkit/passes/opening_cave.md). Where the game begins: a pool
of blood in the dark, where the Red seeps in under the cliffs; stairs cut up the column stumps between walls of
columns, faces carved in them, a skeleton fixed to the wall holding out its weapon; the hall with the empty throne,
the heap of everything the ones before left at its feet, and the door of white light out through the cliff face.

Fingal's Cave on Staffa is the real thing: a sea cave in columnar basalt, its walls columns, its floor broken stumps.
The columns are the cliffs' own (cliff3d.prism, the same rock). The camera sees in as the game will: the roof and the
near walls are hidden from it (cut to stubs) but still shade, so the light is the cave's own: blue wisp-fire in
rusted iron holders, and the white of the door."""
import math
import random
import numpy as np
import parts3d as P
import cliff3d as C

FLOOR_MODULE = "floor3d"
LAMPS = []
LAMP_REF = 0.05
WISP = (0.33, 0.58, 1.0)                 # the wisp-fire's cold blue
DAY = (0.92, 0.94, 1.0)                  # the grey day at the door, white after the dark

# Derek, pass 2: "Make it bigger": every room about 1.6 times the first, the climb longer
POOL = (0.0, 0.0, 9.5, 7.4)              # the pool chamber: centre x, y and radii (yards)
STAIR = (-4.6, -0.2, -5.8, -19.5)        # the stairs: x from, x to, y from (bottom), y to (top)
HALL = (-1.9, -31.5, 11.0, 9.5)          # the hall, up and to the right, so the stair's carved wall never hides it
BASIN = (1.0, 0.7, 2.4)                  # the pool itself: centre and the radius of its deep heart
FLOOR_HALL = 6.0
STEPS = 17
THRONE = (-7.9, -36.5)
DOOR = (5.9, -38.1)
AMBIENT = 0.3                            # the overcast reaches nowhere in here (darker: Derek)
RED = (1.0, 0.12, 0.06)                  # the pool's glow (Derek: "glowing red near the pool"; the one red light allowed)


def _ell(x, y, e):
    cx, cy, rx, ry = e
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def floor_at(x, y, k=0.5):
    """the floor's height where a column stump stands, or None where the rock is solid (a wall)"""
    if _ell(x, y, POOL) < 1.0:
        db = math.hypot(x - BASIN[0], y - BASIN[1])
        if db < BASIN[2]:
            return -0.75 + (0.5 if k > 0.85 else 0.0)              # under the blood, a stump or two rising as islands
        if db < BASIN[2] + 1.3:
            return -0.32 + k * 0.42                                 # the shore: stumps in and out of the blood
        return 0.05 + (k - 0.5) * 0.45
    x0, x1, y0, y1 = STAIR
    if x0 < x < x1 and y1 < y < y0:
        u = (y0 - y) / (y0 - y1)                                    # up the stairs, 0 to 1
        step = math.floor(u * STEPS) / STEPS
        return step * FLOOR_HALL + (k - 0.5) * 0.14
    if _ell(x, y, HALL) < 1.0:
        return FLOOR_HALL + (k - 0.5) * 0.12
    return None


def inside(x, y):
    return floor_at(x, y) is not None


def columns():
    rnd = random.Random(2)
    for ci in range(-15, 10):
        for cj in range(-45, 13):
            cs = C.cell_corners(ci, cj)
            cx = sum(p[0] for p in cs) / 6
            cy = sum(p[1] for p in cs) / 6
            if cx < -26 or cx > 16 or cy < -46 or cy > 12:
                continue
            k = C._h(ci, cj, 5)
            f = floor_at(cx, cy, k)
            pts = [(a, b) for a, b in cs]
            lean = ((C._h(ci, cj, 21) - 0.5) * 0.015, (C._h(ci, cj, 22) - 0.5) * 0.015)
            if f is not None:
                if carved(cx, cy) > 0.4:
                    C.prism("st%d_%d" % (ci, cj), pts, -2.0, f - 0.45, "basalt")     # under the cut floor
                    continue
                cup = 0.05 if k < 0.3 else 0.0
                broken = 0.25 * C._h(ci, cj, 24) if C._h(ci, cj, 25) < 0.35 else 0.0
                C.prism("st%d_%d" % (ci, cj), pts, -2.0, f, "basalt", cup, lean, broken)
                continue
            # a wall: only near a room; near walls (a room up the screen from it) cut to a low stub, far walls tall
            near_room, near_low = None, None
            for d in (0.8, 1.6, 2.4):
                for ox, oy in ((-d, -d), (d, d), (-d, d), (d, -d), (-d, 0), (d, 0), (0, -d), (0, d)):
                    fr = floor_at(cx + ox, cy + oy)
                    if fr is not None:
                        near_room = fr if near_room is None else max(near_room, fr)
                        near_low = fr if near_low is None else min(near_low, fr)
                if near_room is not None:
                    break
            if near_room is None:
                continue
            # cut down any wall that would stand between the camera and a room (the see-through rule): a room
            # anywhere up the screen within the wall's own reach
            camera_side = any(inside(cx - d, cy - d) for d in (1.0, 2.0, 3.0, 4.5, 6.0, 8.0, 10.0, 13.0, 16.0))
            # a cut wall stops just above the lowest floor it would hide; a far wall stands out of frame
            hgt = (near_low + 0.45 + k * 0.2) if camera_side else (near_room + 9.0 + k * 2.0)
            # a cut wall is solid rock seen from above (the iso convention): its own material, painted near black
            z0 = -2.0
            if not camera_side and near_room > FLOOR_HALL - 0.5:
                z0 = FLOOR_HALL + CARVE_H - 0.1                      # above the temple's carved walls, the raw columns
            C.prism("wall%d_%d" % (ci, cj), pts, z0, hgt, "cutrock" if camera_side else "basalt", 0.0, lean, 0.0,
                    (0.0, (C._h(ci, cj, 23) - 0.5) * 0.2))


CARVE_H = 4.2                            # how high the builders dressed the hall's walls before they stopped


def carved(x, y):
    """how made the cave is here: 0 in the pool chamber (raw basalt), rising up the stairs, 1 in the hall (Derek: "it
    becomes more carved and more")"""
    return min(1.0, max(0.0, (-y - 8.0) / 11.0))


def _hall_pt(th, r=1.0):
    cx, cy, rx, ry = HALL
    return cx + rx * r * math.cos(th), cy + ry * r * math.sin(th)


def stairs_cut():
    """the upper steps cut true by the builders: treads and risers squared, each tread worn hollow down its middle where
    the feet went (the lowest steps stay rough stumps: the cave turns from the raw to the made as you climb)"""
    x0, x1, y0, y1 = STAIR
    for i in range(STEPS):
        ya = y0 - (y0 - y1) * i / STEPS
        yb = y0 - (y0 - y1) * (i + 1) / STEPS
        if carved(0.0, (ya + yb) / 2) <= 0.4:
            continue
        top = FLOOR_HALL * i / STEPS
        # a tread in three strips, the middle worn lower
        for k, (a, b, dz) in enumerate(((x0, x0 + 0.9, 0.0), (x0 + 0.9, x1 - 0.9, -0.05), (x1 - 0.9, x1, 0.0))):
            P.box("step%d_%d" % (i, k), (a, yb, -2.0), (b, ya, top + dz), "dressed")


def hall_floor():
    """the hall's floor of dressed flags, squared to the throne, each its own tilt and height by a finger, the joints
    open where they have settled"""
    cx, cy, rx, ry = HALL
    ux, uy = -0.7071, -0.7071                                     # toward the throne
    ax, ay = 0.7071, -0.7071
    rnd = random.Random(31)
    for i in range(-14, 15):
        for j in range(-19, 20):
            w, l = 0.68 * rnd.uniform(0.85, 1.12), 0.95 * rnd.uniform(0.8, 1.15)
            off = 0.5 * l if j % 2 else 0.0
            if rnd.random() < 0.07:
                continue                                            # a flag gone: the dark of the stumps beneath
            px = cx + ux * (i * l + off) + ax * j * w
            py = cy + uy * (i * l + off) + ay * j * w
            if _ell(px, py, HALL) > 0.97:
                continue
            hw, hl = w / 2 - 0.035, l / 2 - 0.035
            tw = rnd.uniform(-0.06, 0.06)
            ux2, uy2 = ux * math.cos(tw) - uy * math.sin(tw), ux * math.sin(tw) + uy * math.cos(tw)
            ax2, ay2 = -uy2, ux2
            z = FLOOR_HALL + rnd.uniform(-0.03, 0.02)
            tz = [rnd.uniform(-0.04, 0.04) for _ in range(4)]
            corners = [(px + ux2 * su * hl + ax2 * sa * hw, py + uy2 * su * hl + ay2 * sa * hw) for su, sa in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            verts = [(x, y, z - 0.4) for x, y in corners] + [(x, y, z + tz[q]) for q, (x, y) in enumerate(corners)]
            faces = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
            P.poly("flag%d_%d" % (i, j), verts, faces, "dressed")


def hall_walls():
    """the temple cut into the living rock round the hall's back: dressed walls to four yards, pilasters, a frieze of
    faces between them, a cornice, and above it the raw columns where the builders stopped"""
    th0, th1 = math.radians(150), math.radians(300)
    n = 40
    rnd = random.Random(5)
    kinds = ["blank", "eyeless", "full", "mouthless", "full", "half", "eyeless", "blank", "full", "mouthless"]
    for k in range(n):
        ta = th0 + (th1 - th0) * k / n
        tb = th0 + (th1 - th0) * (k + 1) / n
        a_in, b_in = _hall_pt(ta, 1.0), _hall_pt(tb, 1.0)
        a_out, b_out = _hall_pt(ta, 1.12), _hall_pt(tb, 1.12)
        z0, z1 = FLOOR_HALL - 0.4, FLOOR_HALL + CARVE_H
        verts = [(a_in[0], a_in[1], z0), (b_in[0], b_in[1], z0), (b_out[0], b_out[1], z0), (a_out[0], a_out[1], z0),
                 (a_in[0], a_in[1], z1), (b_in[0], b_in[1], z1), (b_out[0], b_out[1], z1), (a_out[0], a_out[1], z1)]
        faces = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        P.poly("cwall%d" % k, verts, faces, "dressed")
        tm = (ta + tb) / 2
        mx, my = _hall_pt(tm, 0.995)
        cxh, cyh = HALL[0], HALL[1]
        nx, ny = cxh - mx, cyh - my
        nl = math.hypot(nx, ny)
        nx, ny = nx / nl, ny / nl
        if k % 3 == 0:
            # a pilaster: a squared pier standing proud of the wall, a base and a capital
            px, py = mx + nx * 0.18, my + ny * 0.18
            P.box("pil%d" % k, (px - 0.28, py - 0.28, z0), (px + 0.28, py + 0.28, z1), "dressed", rot_z=math.atan2(ny, nx))
            P.box("pilcap%d" % k, (px - 0.36, py - 0.36, z1 - 0.3), (px + 0.36, py + 0.36, z1), "dressed", rot_z=math.atan2(ny, nx))
            P.box("pilbase%d" % k, (px - 0.36, py - 0.36, FLOOR_HALL), (px + 0.36, py + 0.36, FLOOR_HALL + 0.3), "dressed", rot_z=math.atan2(ny, nx))
        else:
            face("frieze%d" % k, mx + nx * 0.06, my + ny * 0.06, FLOOR_HALL + 2.6, nx, ny, kinds[k % len(kinds)], 0.4)
    # the cornice: a moulding along the top of the carving
    pts = [(*_hall_pt(th0 + (th1 - th0) * q / 40.0, 0.985), FLOOR_HALL + CARVE_H - 0.05) for q in range(41)]
    P.tube("cornice", pts, [0.14] * len(pts), "dressed", 6)


def pillars():
    """two rows of squared pillars cut from the rock, rising into the dark of the roof (out of frame)"""
    cx, cy = HALL[0], HALL[1]
    ux, uy = -0.7071, -0.7071
    ax, ay = 0.7071, -0.7071
    for row in (-1, 1):
        for i, du in enumerate((-3.6, 0.8, 5.0)):
            px = cx + ux * du + ax * row * 5.6
            py = cy + uy * du + ay * row * 5.6
            P.box("pillar%d_%d" % (row, i), (px - 0.38, py - 0.38, FLOOR_HALL), (px + 0.38, py + 0.38, FLOOR_HALL + 12.0), "dressed", rot_z=math.radians(45))
            P.box("pbase%d_%d" % (row, i), (px - 0.5, py - 0.5, FLOOR_HALL), (px + 0.5, py + 0.5, FLOOR_HALL + 0.35), "dressed", rot_z=math.radians(45))


def door_frame():
    """the door out, framed: two jambs and a lintel cut from the rock, a face in the lintel looking down at whoever
    leaves"""
    dx, dy = DOOR
    nx, ny = HALL[0] - dx, HALL[1] - dy
    nl = math.hypot(nx, ny)
    nx, ny = nx / nl, ny / nl
    tx, ty = -ny, nx
    for side in (-1, 1):
        jx, jy = dx + tx * side * 0.9, dy + ty * side * 0.9
        P.box("jamb%d" % side, (jx - 0.25, jy - 0.25, FLOOR_HALL - 0.2), (jx + 0.25, jy + 0.25, FLOOR_HALL + 3.0), "dressed", rot_z=math.atan2(ny, nx))
    P.box("lintel_door", (dx - 1.3, dy - 0.3, FLOOR_HALL + 3.0), (dx + 1.3, dy + 0.3, FLOOR_HALL + 3.6), "dressed", rot_z=math.atan2(ty, tx))
    face("doorface", dx + nx * 0.32, dy + ny * 0.32, FLOOR_HALL + 3.3, nx, ny, "full", 0.3)


def roof():
    """the cave's roof: hidden from the camera, but it keeps the sky out, so the dark is the cave's own"""
    o = P.box("roof", (-30.0, -50.0, 13.5), (18.0, 14.0, 14.5), "basalt")
    o.visible_camera = False


def pool():
    """the Red come in under the cliffs: the blood standing in the basin, level, its edge soaking into the stone"""
    # one level over the basin and its shore: the stumps above it make the shoreline, hex by hex, with islands
    n = 40
    rr = BASIN[2] + 1.6
    pts = [(BASIN[0] + math.cos(2 * math.pi * k / n) * rr, BASIN[1] + math.sin(2 * math.pi * k / n) * rr, -0.12) for k in range(n)]
    P.poly("pool", pts, [tuple(range(n))], "pool")


def torch(name, x, y, z, nx, ny, w=60.0):
    """a wisp-fire torch: a rusted iron bracket out of the wall, a cup, the cold flame (its light only, the flame is its
    own effect in the game)"""
    P.tube(name + "_arm", [(x, y, z - 0.25), (x + nx * 0.25, y + ny * 0.25, z - 0.1), (x + nx * 0.32, y + ny * 0.32, z)], [0.03, 0.03, 0.03], "rust", 5)
    P.sphere(name + "_cup", (x + nx * 0.34, y + ny * 0.34, z + 0.03), 0.09, "rust", scale=(1, 1, 0.6))
    P.tube(name + "_ring", [(x - ny * 0.08, y + nx * 0.08, z - 0.3), (x + ny * 0.08, y - nx * 0.08, z - 0.3)], [0.03, 0.03], "rust", 5)
    LAMPS.append((x + nx * 0.34, y + ny * 0.34, z + 0.22, w, WISP))


def face(name, x, y, z, nx, ny, kind, size=0.5):
    """a face cut in the rock (chapter 11's forms, worn blunt): an ovoid, a brow, a nose; eyes and a mouth or not
    (Derek: "Maybe they don't have a mouth or eyes or they look weird"); the eye of the beholder does the rest"""
    ang = math.atan2(ny, nx)
    tx, ty = -ny, nx                                               # across the face
    o = P.sphere(name + "_ovoid", (x, y, z), size, "basalt", scale=(0.16, 0.78, 1.0))
    o.rotation_euler = (0, 0, ang)
    def at(a, h, d):
        return (x + tx * a * size + nx * d, y + ty * a * size + ny * d, z + h * size)
    P.tube(name + "_brow", [at(-0.55, 0.3, 0.1), at(0.0, 0.38, 0.13), at(0.55, 0.3, 0.1)], [0.05, 0.06, 0.05], "basalt", 6)
    P.tube(name + "_nose", [at(0.0, 0.25, 0.12), at(0.0, -0.15, 0.2)], [0.05, 0.08], "basalt", 6)
    if kind in ("full", "mouthless", "half"):
        for side in ((-1, 1) if kind != "half" else (-1,)):
            P.sphere("%s_eye%d" % (name, side), at(side * 0.3, 0.12, 0.09), size * 0.13, "lacquer", scale=(0.4, 1.0, 0.7))
    if kind in ("full", "eyeless"):
        P.tube(name + "_mouth", [at(-0.28, -0.42, 0.1), at(0.0, -0.46, 0.12), at(0.28, -0.42, 0.1)], [0.04, 0.05, 0.04], "basalt", 6)
        P.tube(name + "_lips", [at(-0.2, -0.44, 0.12), at(0.2, -0.44, 0.12)], [0.012, 0.012], "lacquer", 4)


def skeleton(x, y, z, nx, ny):
    """a skeleton fixed to the wall with iron, holding its weapon out over the stairs (the weapon falls when the pilgrim
    passes: the starting weapon)"""
    tx, ty = -ny, nx
    def at(a, h, d):
        return (x + tx * a + nx * d, y + ty * a + ny * d, z + h)
    P.sphere("sk_skull", at(0.0, 0.62, 0.12), 0.11, "bone", scale=(0.9, 0.9, 1.0))
    P.tube("sk_spine", [at(0.0, 0.5, 0.08), at(0.0, -0.1, 0.08)], [0.03, 0.03], "bone", 5)
    for r in range(6):
        h = 0.42 - r * 0.07
        for side in (-1, 1):
            P.tube("sk_rib%d_%d" % (r, side), [at(0, h, 0.1), at(side * 0.13, h - 0.02, 0.16), at(side * 0.18, h - 0.06, 0.07)], [0.012, 0.01, 0.008], "bone", 4)
    P.tube("sk_pelvis", [at(-0.14, -0.12, 0.08), at(0.0, -0.18, 0.12), at(0.14, -0.12, 0.08)], [0.03, 0.035, 0.03], "bone", 5)
    for side in (-1, 1):
        P.tube("sk_leg%d" % side, [at(side * 0.1, -0.18, 0.08), at(side * 0.12, -0.6, 0.1), at(side * 0.12, -1.0, 0.08)], [0.025, 0.022, 0.02], "bone", 5)
    P.tube("sk_armL", [at(-0.18, 0.42, 0.08), at(-0.42, 0.62, 0.06), at(-0.55, 0.85, 0.06)], [0.022, 0.02, 0.018], "bone", 5)
    P.tube("sk_armR", [at(0.18, 0.42, 0.08), at(0.3, 0.35, 0.3), at(0.36, 0.4, 0.55)], [0.022, 0.02, 0.018], "bone", 5)
    # the iron that holds it: a band at the neck, one at the wrist
    P.tube("sk_iron1", [at(-0.2, 0.55, 0.05), at(0.2, 0.55, 0.05)], [0.025, 0.025], "rust", 5)
    P.tube("sk_iron2", [at(-0.62, 0.82, 0.04), at(-0.48, 0.92, 0.04)], [0.025, 0.025], "rust", 5)
    # its weapon held out over the stairs: a sword, the blade toward the pilgrim
    P.tube("sk_sword", [at(0.36, 0.42, 0.62), at(0.36, 0.5, 1.5)], [0.035, 0.008], "rust", 4)
    P.tube("sk_guard", [at(0.2, 0.4, 0.66), at(0.52, 0.4, 0.66)], [0.02, 0.02], "rust", 4)


def throne():
    """the empty throne of black basalt on its dais of three steps; at its feet the heap of everything left by the
    ones who came up the stairs before (Conan's tomb: "just like the movie"); the Stranger's place on the step beside"""
    tx, ty = THRONE
    f = FLOOR_HALL
    ang = math.radians(45.0)                                       # it faces the camera (down the screen)
    for k, (w, d) in enumerate(((3.4, 3.0), (2.7, 2.3), (2.0, 1.6))):
        o = P.box("dais%d" % k, (tx - w / 2, ty - d / 2, f - 0.5), (tx + w / 2, ty + d / 2, f + 0.28 * (k + 1)), "basalt")
        o.rotation_euler = (0, 0, ang)
        o.location = (tx - tx * math.cos(ang) + ty * math.sin(ang), ty - tx * math.sin(ang) - ty * math.cos(ang), 0)
    zt = f + 0.84
    def rot(a, b):
        return (tx + a * math.cos(ang) - b * math.sin(ang), ty + a * math.sin(ang) + b * math.cos(ang))
    seat = [rot(-0.55, -0.5), rot(0.55, -0.5), rot(0.55, 0.45), rot(-0.55, 0.45)]
    C.prism("throne_seat", seat, zt, zt + 0.55, "basalt")
    back = [rot(-0.6, -0.75), rot(0.6, -0.75), rot(0.6, -0.45), rot(-0.6, -0.45)]
    C.prism("throne_back", back, zt, zt + 2.6, "basalt")
    for side in (-1, 1):
        arm = [rot(side * 0.55 - 0.12, -0.5), rot(side * 0.55 + 0.12, -0.5), rot(side * 0.55 + 0.12, 0.45), rot(side * 0.55 - 0.12, 0.45)]
        C.prism("throne_arm%d" % side, arm, zt, zt + 0.95, "basalt")
    # an empty ovoid cut in the back where a face should be
    bx, by = rot(0.0, -0.4)
    face("throne_face", bx, by, zt + 2.05, math.cos(ang + math.pi / 2), math.sin(ang + math.pi / 2), "blank", 0.32)
    # the heap
    rnd = random.Random(9)
    hx, hy = rot(0.0, 2.6)
    for i in range(70):
        r = rnd.uniform(0, 1.7) ** 0.8
        a = rnd.uniform(0, 2 * math.pi)
        x, y = hx + math.cos(a) * r * 1.4, hy + math.sin(a) * r
        z = f + max(0.0, 0.7 - r * 0.45) + rnd.uniform(0, 0.12)
        kind = rnd.random()
        b = rnd.uniform(0, math.pi)
        if kind < 0.35:                                            # a sword
            ln = rnd.uniform(0.7, 1.0)
            p0, p1 = (x - math.cos(b) * ln / 2, y - math.sin(b) * ln / 2, z), (x + math.cos(b) * ln / 2, y + math.sin(b) * ln / 2, z + rnd.uniform(-0.2, 0.3))
            P.tube("heap_sw%d" % i, [p0, p1], [0.03, 0.006], "rust", 4)
            P.tube("heap_gd%d" % i, [(p0[0] - math.sin(b) * 0.13, p0[1] + math.cos(b) * 0.13, p0[2]),
                                     (p0[0] + math.sin(b) * 0.13, p0[1] - math.cos(b) * 0.13, p0[2])], [0.018, 0.018], "rust", 4)
        elif kind < 0.5:                                           # a spear, leaning
            ln = rnd.uniform(1.6, 2.2)
            P.tube("heap_sp%d" % i, [(x, y, f), (x + math.cos(b) * 0.6, y + math.sin(b) * 0.6, f + ln)], [0.025, 0.02], "wood", 4)
            P.tube("heap_sph%d" % i, [(x + math.cos(b) * 0.6, y + math.sin(b) * 0.6, f + ln), (x + math.cos(b) * 0.68, y + math.sin(b) * 0.68, f + ln + 0.3)], [0.035, 0.004], "rust", 4)
        elif kind < 0.68:                                          # a helm
            P.sphere("heap_hm%d" % i, (x, y, z + 0.05), 0.16, "rust", scale=(1.0, 0.9, 0.8))
        elif kind < 0.83:                                          # a shield
            o = P.sphere("heap_sh%d" % i, (x, y, z + 0.05), 0.32, "rust", scale=(1.0, 1.0, 0.12))
        else:                                                      # bones, a skull
            if rnd.random() < 0.4:
                P.sphere("heap_sk%d" % i, (x, y, z + 0.08), 0.1, "bone", scale=(1.1, 0.9, 0.9))
            else:
                P.tube("heap_bn%d" % i, [(x, y, z), (x + math.cos(b) * 0.4, y + math.sin(b) * 0.4, z + 0.05)], [0.025, 0.022], "bone", 5)


def door():
    """the way out: a doorway cut through the cliff, full of the grey day, white after the dark"""
    dx, dy = DOOR
    LAMPS.append((dx + 1.2, dy + 1.2, FLOOR_HALL + 1.5, 900.0, DAY))


def wall_spot(x, y, side_x=None):
    """a point on the stairs' carved wall (the west wall, which looks toward the camera), at the floor's height there"""
    f = floor_at(STAIR[0] + 0.4, y) or 0.0
    return STAIR[0] - 0.05, y, f


def hall_spot(th, r=0.985):
    x, y = _hall_pt(th, r)
    nx, ny = HALL[0] - x, HALL[1] - y
    nl = math.hypot(nx, ny)
    return x, y, nx / nl, ny / nl


def pool_bodies():
    """three who came up out of the blood and did not stand: face down across the shore stumps, half in the blood,
    drowned and bloated, one gone to its bones (they look exactly as the pilgrim did a moment before)"""
    for k, (x0, y0, yaw, rot) in enumerate(((-1.7, 2.6, 0.4, 0), (3.6, -1.3, 2.4, 2), (-0.6, -2.4, -1.1, 0))):
        c, s_ = math.cos(yaw), math.sin(yaw)
        def at(u, w, z):
            x, y = x0 + u * c - w * s_, y0 + u * s_ + w * c
            f = floor_at(x, y) or 0.0
            return (x, y, max(f, -0.12) + z)
        fl = "corpse" if rot < 2 else "bone"
        if rot < 2:
            o = P.sphere("pb%d_torso" % k, at(0, 0, 0.12), 1.0, fl, scale=(0.45, 0.3, 0.2))
            o.rotation_euler = (0, 0, yaw)
            o.location = (o.location[0], o.location[1], o.location[2])
            P.sphere("pb%d_head" % k, at(0.66, 0.02, 0.08), 0.14, fl, scale=(1.1, 0.9, 0.85))
        else:
            P.tube("pb%d_spine" % k, [at(-0.5, 0, 0.06), at(0.5, 0, 0.08)], [0.035, 0.03], "bone", 6)
            for r in range(9):
                for sd in (-1, 1):
                    P.tube("pb%d_rib%d_%d" % (k, r, sd), [at(0.4 - r * 0.08, 0, 0.1), at(0.36 - r * 0.08, sd * 0.18, 0.17), at(0.32 - r * 0.08, sd * 0.26, 0.02)],
                           [0.015, 0.012, 0.008], "bone", 4)
            P.sphere("pb%d_skull" % k, at(0.68, 0.1, 0.08), 0.12, "bone", scale=(1.2, 0.9, 0.95))
        lr = 0.07 if rot < 2 else 0.03
        for sd in (-1, 1):
            P.tube("pb%d_arm%d" % (k, sd), [at(0.32, sd * 0.28, 0.1), at(0.7, sd * 0.42, 0.05), at(1.05, sd * 0.36, 0.03)], [lr, lr * 0.9, lr * 0.75], fl, 6)
            P.tube("pb%d_leg%d" % (k, sd), [at(-0.6, sd * 0.12, 0.08), at(-1.1, sd * 0.17, 0.05), at(-1.55, sd * 0.22, 0.02)], [lr * 1.3, lr * 1.05, lr * 0.85], fl, 6)


def pool_dead():
    """at the pool's edge, the ones who came up and did not stand: rib cages half sunk in the blood, skulls, long bones,
    a hand still on the stone (the Stranger: "the ones who came up before you and didn't stand")"""
    rnd = random.Random(41)
    bx, by, br = BASIN
    for i in range(16):
        a = rnd.uniform(0, 2 * math.pi)
        r = br + rnd.uniform(-0.9, 0.9)
        x, y = bx + math.cos(a) * r, by + math.sin(a) * r
        f = floor_at(x, y) or 0.0
        z = max(f, -0.18) + 0.02
        kind = rnd.random()
        if kind < 0.35:
            P.sphere("pd_skull%d" % i, (x, y, z + 0.06), 0.1, "bone", scale=(1.1, 0.9, 0.9))
        elif kind < 0.65:
            for k in range(7):
                for sd in (-1, 1):
                    P.tube("pd_rib%d_%d_%d" % (i, k, sd), [(x + k * 0.07, y, z + 0.1), (x + k * 0.07 - 0.03, y + sd * 0.16, z + 0.12),
                                                         (x + k * 0.07 - 0.06, y + sd * 0.22, z - 0.04)], [0.012, 0.01, 0.007], "bone", 4)
            P.tube("pd_spine%d" % i, [(x - 0.05, y, z + 0.08), (x + 0.5, y, z + 0.08)], [0.025, 0.022], "bone", 5)
        else:
            b = rnd.uniform(0, math.pi)
            P.tube("pd_bone%d" % i, [(x, y, z), (x + math.cos(b) * 0.42, y + math.sin(b) * 0.42, z + 0.03)], [0.026, 0.022], "bone", 5)


def offerings(x, y, f, k):
    """at the foot of a face, what pilgrims left it: candle stubs (cold), teeth, a few coins"""
    rnd = random.Random(k)
    for i in range(rnd.randint(2, 5)):
        ox, oy = x + rnd.uniform(0.15, 0.6), y + rnd.uniform(-0.45, 0.45)
        P.cylinder("of_c%d_%d" % (k, i), (ox, oy, f), 0.035, rnd.uniform(0.05, 0.16), "bone", sides=6)
    for i in range(rnd.randint(3, 8)):
        P.sphere("of_t%d_%d" % (k, i), (x + rnd.uniform(0.1, 0.7), y + rnd.uniform(-0.5, 0.5), f + 0.01), 0.018, "bone")
    for i in range(rnd.randint(1, 4)):
        P.cylinder("of_g%d_%d" % (k, i), (x + rnd.uniform(0.1, 0.6), y + rnd.uniform(-0.4, 0.4), f), 0.03, 0.008, "gold", sides=8)


def chains(x, y, z, k):
    """a rusted chain hanging from a pillar, its links as real loops, the end lying on the flags"""
    rnd = random.Random(k)
    n = rnd.randint(12, 20)
    for i in range(n):
        zz = z - i * 0.12
        if zz < FLOOR_HALL + 0.05:
            zz = FLOOR_HALL + 0.03
            x += 0.1
        P.sphere("ch%d_%d" % (k, i), (x + (0.02 if i % 2 else -0.02), y, zz), 0.05, "rust", scale=(0.4 if i % 2 else 1.0, 1.0 if i % 2 else 0.4, 1.0))


def rags(k, x, y, z, nx, ny):
    """rotted cloth hanging from the cornice, torn into strips"""
    tx, ty = -ny, nx
    rnd = random.Random(k)
    for i in range(5):
        a = (i - 2) * 0.16
        ln = rnd.uniform(1.0, 2.6)
        verts = [(x + tx * (a - 0.06) + nx * 0.05, y + ty * (a - 0.06) + ny * 0.05, z), (x + tx * (a + 0.06) + nx * 0.05, y + ty * (a + 0.06) + ny * 0.05, z),
                 (x + tx * (a + 0.04) + nx * 0.12, y + ty * (a + 0.04) + ny * 0.12, z - ln), (x + tx * (a - 0.05) + nx * 0.12, y + ty * (a - 0.05) + ny * 0.12, z - ln)]
        P.poly("rag%d_%d" % (k, i), verts, [(0, 1, 2, 3)], "cloth", 0.01)


def niche(k, x, y, z, nx, ny):
    """a niche cut in the dressed wall, a skull in it"""
    tx, ty = -ny, nx
    P.box("niche%d" % k, (x - 0.3, y - 0.3, z), (x + 0.3, y + 0.3, z + 0.6), "lacquer", rot_z=math.atan2(ny, nx))
    P.sphere("nskull%d" % k, (x + nx * 0.22, y + ny * 0.22, z + 0.12), 0.11, "bone", scale=(1.0, 1.0, 1.1))


def brazier(k, x, y):
    """a cold brazier of rusted iron on three legs, ash in its bowl"""
    for i in range(3):
        a = i * 2.094
        P.tube("brz%d_leg%d" % (k, i), [(x + math.cos(a) * 0.35, y + math.sin(a) * 0.35, FLOOR_HALL), (x + math.cos(a) * 0.12, y + math.sin(a) * 0.12, FLOOR_HALL + 0.9)],
               [0.03, 0.025], "rust", 5)
    P.sphere("brz%d_bowl" % k, (x, y, FLOOR_HALL + 0.95), 0.32, "rust", scale=(1.0, 1.0, 0.45))
    P.sphere("brz%d_ash" % k, (x, y, FLOOR_HALL + 1.04), 0.26, "ash", scale=(1.0, 1.0, 0.2))


def cards(x, y, z, ang):
    """the Stranger's cards laid on the dais step: the nine of the reading in its spread, face down, one turned"""
    spread = [(0, 0), (0, 0.32), (0, -0.32), (0.45, 0), (-0.45, 0), (0.9, 0.32), (0.9, -0.32), (-0.9, 0.32), (-0.9, -0.32)]
    for i, (a, b) in enumerate(spread):
        cx = x + a * math.cos(ang) - b * math.sin(ang)
        cy = y + a * math.sin(ang) + b * math.cos(ang)
        P.box("card%d" % i, (cx - 0.11, cy - 0.07, z), (cx + 0.11, cy + 0.07, z + 0.012), "boxpaint" if i else "bone", rot_z=ang + (i % 3 - 1) * 0.1)


def build(root, material):
    P.init(root, material)
    columns()
    roof()
    pool()
    pool_dead()
    # the pool's own red glow, low over the blood (the one red light allowed); past it, only the wisp-fires
    LAMPS.append((BASIN[0], BASIN[1], 0.2, 70.0, RED))                # the glow stays near the pool
    LAMPS.append((BASIN[0] - 1.4, BASIN[1] + 0.8, 0.15, 25.0, RED))
    pool_bodies()
    # one wisp-fire at the stairs' foot, then up the carved wall, then round the hall
    torch("torch0", STAIR[0] - 0.05, -6.6, 2.0, 1.0, 0.0, 70.0)
    for i, y in enumerate((-10.2, -14.4, -18.4)):
        x, yy, f = wall_spot(0, y)
        torch("torch%d" % (i + 1), x, yy, f + 2.1, 1.0, 0.0, 70.0)
    for i, th in enumerate((math.radians(165), math.radians(205), math.radians(245), math.radians(285))):
        x, y, nx, ny = hall_spot(th, 0.975)
        torch("htorch%d" % i, x, y, FLOOR_HALL + 2.0, nx, ny, 80.0)
    # the faces up the carved wall: half cut low down, whole near the top (the raw becoming the made)
    for i, (y, kind) in enumerate(((-7.4, "half"), (-8.8, "blank"), (-11.6, "half"), (-12.9, "eyeless"), (-15.6, "mouthless"),
                                   (-16.9, "full"), (-19.0, "full"))):
        x, yy, f = wall_spot(0, y)
        face("sface%d" % i, x, yy, f + 2.4, 1.0, 0.0, kind, 0.8 + 0.15 * (i % 2))
        offerings(x + 0.05, yy, f, 100 + i)
    x, y, f = wall_spot(0, -13.6)
    skeleton(x + 0.05, y, f + 1.5, 1.0, 0.0)
    stairs_cut()
    hall_floor()
    hall_walls()
    pillars()
    # chains from the pillars, rags from the cornice, niches with skulls, cold braziers by the dais
    cx, cy = HALL[0], HALL[1]
    for k, du in enumerate((-3.6, 0.8, 5.0)):
        for row in (-1, 1):
            px = cx - 0.7071 * du + 0.7071 * row * 5.6
            py = cy - 0.7071 * du - 0.7071 * row * 5.6
            if (k + row) % 2 == 0:
                chains(px + 0.45, py + 0.45, FLOOR_HALL + 2.6, 300 + k * 3 + row)
    for k, th in enumerate([math.radians(155 + 9 * q) for q in range(16)]):
        x, y, nx, ny = hall_spot(th, 0.985)
        if k % 4 == 1:
            rags(400 + k, x, y, FLOOR_HALL + CARVE_H - 0.2, nx, ny)
        if k % 5 == 3:
            niche(500 + k, x + nx * 0.02, y + ny * 0.02, FLOOR_HALL + 1.0, nx, ny)
    tx, ty = THRONE
    brazier(1, tx + 2.6, ty - 0.4)
    brazier(2, tx - 0.4, ty + 2.6)
    # wax mounds at the throne's foot (the Stranger's candles, burned down over years), his cards on the step
    rnd = random.Random(77)
    for i in range(9):
        a = rnd.uniform(-0.6, 1.8)
        P.sphere("wax%d" % i, (tx + 1.7 + math.cos(a) * 0.5, ty + 1.7 + math.sin(a) * 0.5, FLOOR_HALL + 0.02), rnd.uniform(0.08, 0.16), "bone",
                 scale=(1.0, 1.0, 0.6))
    cards(tx + 2.2, ty + 1.2, FLOOR_HALL + 0.3, math.radians(45))
    door_frame()
    throne()
