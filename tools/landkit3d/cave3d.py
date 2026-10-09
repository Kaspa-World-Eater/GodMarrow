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

POOL = (0.0, 0.0, 6.0, 4.6)              # the pool chamber: centre x, y and radii (yards)
STAIR = (-2.9, -0.1, -3.6, -12.0)        # the stairs: x from, x to, y from (bottom), y to (top)
HALL = (-1.2, -19.5, 7.0, 6.0)           # the hall, up and to the right, so the stair's carved wall never hides it
BASIN = (0.6, 0.4, 3.1)                  # the pool itself: centre and radius
FLOOR_HALL = 4.6
THRONE = (-4.6, -23.2)
DOOR = (2.6, -24.6)


def _ell(x, y, e):
    cx, cy, rx, ry = e
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def floor_at(x, y, k=0.5):
    """the floor's height where a column stump stands, or None where the rock is solid (a wall)"""
    if _ell(x, y, POOL) < 1.0:
        db = math.hypot(x - BASIN[0], y - BASIN[1])
        if db < BASIN[2]:
            return -0.75 + (0.35 if k > 0.8 else 0.0)              # under the blood, a few stumps rising near the top
        return 0.05 + (k - 0.5) * 0.45
    x0, x1, y0, y1 = STAIR
    if x0 < x < x1 and y1 < y < y0:
        u = (y0 - y) / (y0 - y1)                                    # up the stairs, 0 to 1
        step = math.floor(u * 13.0) / 13.0
        return step * FLOOR_HALL + (k - 0.5) * 0.14
    if _ell(x, y, HALL) < 1.0:
        return FLOOR_HALL + (k - 0.5) * 0.12
    return None


def inside(x, y):
    return floor_at(x, y) is not None


def columns():
    rnd = random.Random(2)
    for ci in range(-14, 6):
        for cj in range(-46, 16):
            cs = C.cell_corners(ci, cj)
            cx = sum(p[0] for p in cs) / 6
            cy = sum(p[1] for p in cs) / 6
            if cx < -16 or cx > 9 or cy < -27 or cy > 7:
                continue
            k = C._h(ci, cj, 5)
            f = floor_at(cx, cy, k)
            pts = [(a, b) for a, b in cs]
            lean = ((C._h(ci, cj, 21) - 0.5) * 0.015, (C._h(ci, cj, 22) - 0.5) * 0.015)
            if f is not None:
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
            camera_side = any(inside(cx - d, cy - d) for d in (1.0, 2.0, 3.0, 4.5, 6.0, 8.0, 10.0))
            # a cut wall stops just above the lowest floor it would hide; a far wall stands out of frame
            hgt = (near_low + 0.45 + k * 0.2) if camera_side else (near_room + 9.0 + k * 2.0)
            # a cut wall is solid rock seen from above (the iso convention): its own material, painted near black
            C.prism("wall%d_%d" % (ci, cj), pts, -2.0, hgt, "cutrock" if camera_side else "basalt", 0.0, lean, 0.0,
                    (0.0, (C._h(ci, cj, 23) - 0.5) * 0.2))


def roof():
    """the cave's roof: hidden from the camera, but it keeps the sky out, so the dark is the cave's own"""
    o = P.box("roof", (-20.0, -30.0, 10.5), (12.0, 10.0, 11.5), "basalt")
    o.visible_camera = False


def pool():
    """the Red come in under the cliffs: the blood standing in the basin, level, its edge soaking into the stone"""
    n = 40
    pts = [(BASIN[0] + math.cos(2 * math.pi * k / n) * BASIN[2], BASIN[1] + math.sin(2 * math.pi * k / n) * BASIN[2], -0.18) for k in range(n)]
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


def build(root, material):
    P.init(root, material)
    columns()
    roof()
    pool()
    # the wisp-fires: two by the pool, three up the stairs on the wall the camera sees, three in the hall
    for i, (x, y, z, nx, ny) in enumerate(((-4.6, -1.6, 1.9, 0.75, 0.66), (-1.6, -4.4, 1.9, 0.66, 0.75),
                                           (-3.15, -6.0, 3.6, 1.0, 0.0), (-3.15, -10.0, 5.6, 1.0, 0.0),
                                           (-7.0, -21.6, FLOOR_HALL + 2.2, 0.75, 0.66), (-2.2, -25.0, FLOOR_HALL + 2.2, 0.6, 0.8),
                                           (-7.9, -17.0, FLOOR_HALL + 2.2, 1.0, 0.1))):
        torch("torch%d" % i, x, y, z, nx, ny)
    # the faces: up the stair wall the camera sees, round the hall's back walls; distinct, blunt, some wrong
    kinds = ["eyeless", "mouthless", "blank", "full", "half", "mouthless", "blank", "eyeless", "full", "half", "blank", "mouthless"]
    spots = [(-3.15, -4.6, 2.3, 1.0, 0.0), (-3.15, -7.6, 3.9, 1.0, 0.0), (-3.15, -9.0, 4.8, 1.0, 0.0), (-3.15, -11.2, 6.0, 1.0, 0.0),
             (-6.6, -23.0, FLOOR_HALL + 2.0, 0.7, 0.7), (-3.4, -25.4, FLOOR_HALL + 2.3, 0.6, 0.8), (-7.9, -19.6, FLOOR_HALL + 1.6, 0.9, 0.4),
             (-8.0, -18.0, FLOOR_HALL + 2.8, 1.0, 0.2), (-0.6, -25.6, FLOOR_HALL + 1.5, 0.55, 0.85), (1.0, -25.2, FLOOR_HALL + 2.7, 0.5, 0.86),
             (-1.6, -5.0, 1.6, 0.6, 0.8), (-4.5, -1.2, 1.4, 0.75, 0.66)]
    for i, (x, y, z, nx, ny) in enumerate(spots):
        face("face%d" % i, x, y, z, nx, ny, kinds[i % len(kinds)], 0.42 + 0.12 * ((i * 7) % 3) / 2)
    skeleton(-3.0, -8.4, 4.3, 1.0, 0.0)
    throne()
    door()
