"""The destroyed temple shrine (tools/landkit/passes/thai_temple.md), built as 3D forms: pass 1, the massing and the
parts that make it Thai, at true size (chapter 09: a village hall about 13 x 8 yd on a 1 yd platform, walls 4 yd,
ridge 9 to 10 yd, eaves out 1 to 1.5 yd; the Ossuarch is 2 yd).

The hall's long axis runs along x, its front gable and porch toward +x (screen right-down), so the camera sees the
front and the +y side (screen left-down). That side is the wet side: its upper roof has fallen in over half its length,
the rafters standing bare over empty air (the overhang a height field cannot make), its tiles in a heap at the foot.
"""
import math
import random
import parts3d as P

L0, L1 = -6.0, 4.5          # the hall's walls along x
HW = 3.2                    # half its width
WALL_T = 0.5
FLOOR = 1.0                 # the platform's top
EAVE_Z = 5.15
RIDGE_Z = 9.6


def platform():
    P.box("plat0", (-7.6, -4.7, 0.0), (7.6, 4.7, 0.38), "stucco")
    P.box("plat1", (-7.35, -4.45, 0.38), (7.35, 4.45, 0.72), "brick")
    P.box("plat2", (-7.15, -4.25, 0.72), (7.15, 4.25, FLOOR), "stucco")


def walls():
    t = WALL_T
    back = P.box("wall_back", (L0, -HW, FLOOR), (L0 + t, HW, EAVE_Z), "stucco")
    P.displace(back, 0.04, 0.5)
    for s, nm in ((-1, "wall_left"), (1, "wall_right")):
        w = P.box(nm, (L0, s * HW - (t if s > 0 else 0), FLOOR), (L1, s * HW + (0 if s > 0 else t), EAVE_Z), "stucco")
        P.displace(w, 0.04, 0.5)
        # tall narrow windows with black lacquer shutters, a little proud of the wall
        for x in (-4.4, -2.2, 0.0, 2.2):
            y = s * (HW + 0.03)
            P.box(nm + "_win%d" % int(x * 10), (x - 0.35, y - 0.06, FLOOR + 1.0), (x + 0.35, y + 0.06, FLOOR + 3.0), "lacquer")
    # the front wall with its door: two leaves, one fallen open on a single hinge
    P.box("front_l", (L1 - t, -HW, FLOOR), (L1, -0.9, EAVE_Z), "stucco")
    P.box("front_r", (L1 - t, 0.9, FLOOR), (L1, HW, EAVE_Z), "stucco")
    P.box("lintel", (L1 - t, -0.9, FLOOR + 3.0), (L1, 0.9, EAVE_Z), "stucco")
    P.box("door_l", (L1 - 0.05, -0.9, FLOOR), (L1 + 0.05, 0.0, FLOOR + 3.0), "lacquer")
    P.box("door_r", (L1, 0.0, FLOOR), (L1 + 0.1, 0.9, FLOOR + 3.0), "lacquer", rot_z=math.radians(-62), pivot=(L1, 0.9, FLOOR))


def porch():
    for y in (-2.5, -0.85, 0.85, 2.5):
        P.cylinder("col%d" % int(y * 10), (6.4, y, FLOOR), 0.2, EAVE_Z - FLOOR - 0.4, "stucco")
        # the lotus capital: a flared cup of petals
        P.tube("cap%d" % int(y * 10), [(6.4, y, EAVE_Z - 0.4), (6.4, y, EAVE_Z - 0.15), (6.4, y, EAVE_Z)], [0.2, 0.34, 0.3], "gold", 10)


COURSE = 0.24               # yd of slope per course of tiles


def courses(name, segs, lo, hi):
    """a roof layer as its courses of tiles, each lapped over the one below it: its lower edge stands a little proud,
    so every course is a real step the light catches (a sawtooth down the slope), not a flat plane painted with lines.
    lo, hi: (y, z) of the layer's eave edge and its top edge; segs: the stretches along x it covers"""
    (y0, z0), (y1, z1) = lo, hi
    length = math.hypot(y1 - y0, z1 - z0)
    n = max(1, int(length / COURSE))
    verts, faces = [], []
    for (a, b) in segs:
        for i in range(n):
            f0 = i / n
            f1 = min(1.0, (i + 1) / n + 0.04)
            ya, za = y0 + (y1 - y0) * f0, z0 + (z1 - z0) * f0 + 0.055      # the course's lower edge, lifted proud
            yb, zb = y0 + (y1 - y0) * f1, z0 + (z1 - z0) * f1
            k = len(verts)
            verts += [(a, ya, za), (b, ya, za), (b, yb, zb), (a, yb, zb)]
            faces.append((k, k + 1, k + 2, k + 3))
    if verts:
        P.poly(name, verts, faces, "tile", 0.06)


def gable_roof(tag, x0, x1, half, eave_z, ridge_z, broken=None):
    """a tier: each side two overlapping layers with the Thai step between them; broken=(xa, xb) takes the upper layer
    of the +y side away over that stretch, leaving the rafters bare"""
    mid = half * 0.45
    zb = eave_z + (ridge_z - eave_z) * 0.55
    for s in (-1, 1):
        # the lower layer: from the eave up past the step
        # the lower layer, from the eave up past the step; then the upper layer set a little above it (the broken line)
        courses("%s_lo%d" % (tag, s), [(x0, x1)], (s * half, eave_z), (s * (mid - 0.25), zb + 0.25))
        segs = [(x0, x1)]
        if broken and s == 1:
            segs = [(x0, broken[0]), (broken[1], x1)]
        courses("%s_up%d" % (tag, s), [g for g in segs if g[1] - g[0] > 0.2], (s * (mid + 0.05), zb + 0.05), (0.0, ridge_z))
    # the ridge beam
    P.box(tag + "_ridge", (x0, -0.12, ridge_z - 0.05), (x1, 0.12, ridge_z + 0.18), "tile")
    if broken:
        # the fallen stretch: rafters bare over the hall, purlins across them, a few still holding tiles
        xa, xb = broken
        n = int((xb - xa) / 0.55)
        for i in range(n + 1):
            x = xa + i * (xb - xa) / max(n, 1)
            sag = 0.25 * math.sin(math.pi * i / max(n, 1))
            P.tube("%s_raft%d" % (tag, i), [(x, 0.0, ridge_z - 0.05), (x, mid * 0.5, (ridge_z + zb) / 2 - sag), (x, mid + 0.1, zb + 0.1)],
                   [0.07, 0.07, 0.07], "wood", 6)
        for j, f in enumerate((0.3, 0.65)):
            y = mid * f
            z = ridge_z - (ridge_z - zb) * f - 0.1
            P.box("%s_purl%d" % (tag, j), (xa, y - 0.05, z - 0.05), (xb, y + 0.05, z + 0.05), "wood")


def gable_trim(tag, x, half, eave_z, ridge_z, snapped=False, front=True):
    """the gable's face and its serpent: the gilded na ban, the lamyong bargeboards with their bai raka teeth, the
    hang hong heads curling up at the eaves, and the chofa at the peak"""
    dx = 0.1 if front else -0.1
    P.poly(tag + "_naban", [(x - dx, -half * 0.8, eave_z), (x - dx, half * 0.8, eave_z), (x - dx, 0.0, ridge_z - 0.2)], [(0, 1, 2)], "gold", 0.08)
    for s in (-1, 1):
        a = (x, s * half, eave_z + 0.1)
        b = (x, 0.0, ridge_z + 0.15)
        P.tube("%s_lamyong%d" % (tag, s), [a, b], [0.11, 0.11], "gold", 6)
        # the bai raka: blade teeth along the serpent's back, standing out of the gable's plane
        n = 11
        for i in range(1, n):
            f = i / n
            px, py, pz = x, a[1] * (1 - f), a[2] + (b[2] - a[2]) * f
            P.tube("%s_raka%d_%d" % (tag, s, i), [(px, py, pz), (px, py + s * 0.12, pz + 0.32)], [0.06, 0.005], "gold", 4)
        # the hang hong: the serpent's head, curling up at the eave's end
        P.tube("%s_hong%d" % (tag, s), [a, (x, s * (half + 0.25), eave_z + 0.05), (x, s * (half + 0.42), eave_z + 0.35),
                                          (x, s * (half + 0.3), eave_z + 0.6)], [0.11, 0.1, 0.08, 0.02], "gold", 6)
    # the chofa: a slender horn rising and curving back from the peak
    if snapped:
        P.tube(tag + "_chofa", [(x, 0.0, ridge_z + 0.1), (x + 0.3, 0.0, ridge_z - 0.4), (x + 0.45, 0.0, ridge_z - 1.2)],
               [0.09, 0.07, 0.02], "gold", 6)
    else:
        P.tube(tag + "_chofa", [(x, 0.0, ridge_z + 0.1), (x + dx * 1.5, 0.0, ridge_z + 0.7), (x + dx * 0.5, 0.0, ridge_z + 1.3),
                                (x - dx * 2.5, 0.0, ridge_z + 1.55)], [0.1, 0.08, 0.05, 0.01], "gold", 6)


def roofs():
    # the main tier: over the hall, its +y upper layer fallen in over the hall's middle
    gable_roof("main", L0 - 0.7, L1 + 0.5, HW + 1.25, EAVE_Z, RIDGE_Z, broken=(-3.4, 1.6))
    gable_trim("main_f", L1 + 0.5, HW + 1.25, EAVE_Z, RIDGE_Z, front=True)
    gable_trim("main_b", L0 - 0.7, HW + 1.25, EAVE_Z, RIDGE_Z, snapped=True, front=False)
    # the porch tier, lower and narrower, stepping down in front (the Thai tiers)
    gable_roof("porch", L1 + 0.4, 7.35, HW + 0.6, EAVE_Z - 0.35, RIDGE_Z - 1.4)
    gable_trim("porch_f", 7.35, HW + 0.6, EAVE_Z - 0.35, RIDGE_Z - 1.4, front=True)
    # the eave brackets under the main tier's front corners
    for y in (-HW, HW):
        P.tube("brk%d" % int(y), [(L1 + 0.2, y, EAVE_Z - 1.0), (L1 + 0.4, y * 1.2, EAVE_Z - 0.3), (L1 + 0.5, y * 1.32, EAVE_Z)],
               [0.07, 0.06, 0.05], "wood", 5)


def stair():
    for i in range(4):
        z = FLOOR - (i + 1) * 0.25
        P.box("step%d" % i, (7.6 + i * 0.5, -1.2, 0.0), (7.6 + (i + 1) * 0.5, 1.2, z + 0.25), "stucco")
    # the naga balustrades: the serpent's body down each side, its hooded head rearing at the foot; one head broken
    for s in (-1, 1):
        body = [(7.5, s * 1.45, FLOOR + 0.35), (8.6, s * 1.45, 0.75), (9.7, s * 1.45, 0.4), (10.2, s * 1.45, 0.55)]
        P.tube("naga%d" % s, body, [0.17, 0.17, 0.17, 0.16], "stucco", 8)
        if s < 0:
            P.tube("naga_head%d" % s, [(10.2, s * 1.45, 0.55), (10.35, s * 1.45, 1.0), (10.3, s * 1.45, 1.35)], [0.17, 0.2, 0.12], "stucco", 8)
            P.sphere("naga_hood%d" % s, (10.25, s * 1.45, 1.3), 0.42, "stucco", scale=(0.35, 1.0, 0.85))
        else:
            # broken off: the head lies in the mud beside the stair
            P.sphere("naga_hood%d" % s, (10.9, s * 2.2, 0.15), 0.42, "stucco", scale=(0.9, 0.35, 0.8))


def sema():
    rnd = random.Random(9)
    pts = [(-8.6, -5.6), (0.0, -5.8), (8.6, -5.6), (8.8, 0.0), (8.6, 5.6), (0.0, 5.8), (-8.6, 5.6), (-8.8, 0.0)]
    toppled = {2, 5, 6}
    for i, (x, y) in enumerate(pts):
        P.box("sema_base%d" % i, (x - 0.32, y - 0.32, 0.0), (x + 0.32, y + 0.32, 0.28), "stone")
        if i in toppled:
            P.sphere("sema%d" % i, (x + rnd.uniform(-0.6, 0.6), y + rnd.uniform(-0.6, 0.6), 0.1), 0.5, "stone", scale=(0.55, 0.9, 0.18))
        else:
            P.sphere("sema%d" % i, (x, y, 0.75), 0.5, "stone", scale=(0.5, 0.14, 0.95))


def guardian():
    """a stone guardian at the door, a head taller than a man, its club grounded; a pale root grown round its head"""
    x, y = 5.4, -2.0
    P.box("g_legs", (x - 0.35, y - 0.3, FLOOR), (x + 0.35, y + 0.3, FLOOR + 1.1), "stone")
    P.tube("g_body", [(x, y, FLOOR + 1.0), (x, y, FLOOR + 1.8), (x, y, FLOOR + 2.25)], [0.5, 0.48, 0.38], "stone", 10)
    P.sphere("g_head", (x, y, FLOOR + 2.55), 0.3, "stone")
    P.tube("g_crown", [(x, y, FLOOR + 2.75), (x, y, FLOOR + 3.3)], [0.22, 0.01], "stone", 8)
    P.tube("g_club", [(x + 0.45, y + 0.35, FLOOR), (x + 0.45, y + 0.35, FLOOR + 1.9)], [0.07, 0.12], "stone", 8)
    # the god's hint: a pale root coming up out of the platform's joint and round the head, as the banyan holds a head
    pts, rad = [], []
    for k in range(26):
        f = k / 25
        a = f * 4.2 * math.pi
        r = 0.36 + 0.05 * math.sin(f * 9)
        pts.append((x + 0.9 - f * 0.9 + math.cos(a) * r * min(1, f * 3), y + 0.6 - f * 0.6 + math.sin(a) * r * min(1, f * 3),
                    FLOOR + f * 2.7))
        rad.append(0.12 - 0.07 * f)
    P.tube("root", pts, rad, "root", 7)


def spirit_house():
    x, y = 11.8, 6.0
    P.tube("sp_pillar", [(x, y, 0.0), (x + 0.12, y, 1.4)], [0.1, 0.09], "wood", 8)
    P.box("sp_floor", (x - 0.45, y - 0.4, 1.4), (x + 0.65, y + 0.4, 1.5), "wood", tilt=("Y", math.radians(8), (x, y, 1.4)))
    P.box("sp_house", (x - 0.3, y - 0.28, 1.5), (x + 0.45, y + 0.28, 1.95), "stucco", tilt=("Y", math.radians(8), (x, y, 1.4)))
    for s in (-1, 1):
        P.quad_slab("sp_roof%d" % s, (x - 0.4, s * 0.45 + y, 1.95), (x + 0.55, s * 0.45 + y, 1.95), (x + 0.55, y, 2.35), (x - 0.4, y, 2.35),
                    "tile", 0.06)
    P.tube("sp_chofa", [(x + 0.55, y, 2.35), (x + 0.65, y, 2.6)], [0.03, 0.005], "gold", 4)


def siege():
    """the last stand on the platform: spears down, a broken shield, bones at the stair"""
    rnd = random.Random(4)
    for i in range(5):
        x, y = rnd.uniform(1.5, 6.8), rnd.uniform(-3.8, 3.8)
        a = rnd.uniform(0, math.pi)
        P.tube("spear%d" % i, [(x, y, FLOOR + 0.05), (x + math.cos(a) * 1.8, y + math.sin(a) * 1.8, FLOOR + 0.05)], [0.03, 0.03], "wood", 5)
    P.sphere("shield", (3.0, 2.6, FLOOR + 0.06), 0.45, "wood", scale=(1, 1, 0.08))
    for i in range(6):
        x, y = rnd.uniform(9.5, 11.5), rnd.uniform(-2.0, 2.0)
        a = rnd.uniform(0, math.pi)
        P.tube("bone%d" % i, [(x, y, 0.06), (x + math.cos(a) * 0.45, y + math.sin(a) * 0.45, 0.06)], [0.05, 0.04], "bone", 5)


def tile_heap():
    """the fallen upper roof's tiles, slid into a heap along the wet side's foot"""
    rnd = random.Random(7)
    for i in range(70):
        x = rnd.uniform(-3.6, 1.8)
        y = HW + rnd.uniform(0.6, 2.2)
        z = max(0.0, 0.5 - (y - HW - 0.6) * 0.25) + rnd.uniform(0, 0.25)
        a = rnd.uniform(0, math.pi)
        P.box("tile%d" % i, (x - 0.2, y - 0.1, z), (x + 0.2, y + 0.1, z + 0.05), "tile", rot_z=a,
              tilt=("X", rnd.uniform(-0.6, 0.6), (x, y, z)))


def ground():
    g = P.box("ground", (-30.0, -30.0, -0.3), (30.0, 30.0, 0.0), "ground")
    P.displace(g, 0.12, 1.2, subdiv=5)


def build(root, material):
    P.init(root, material)
    ground()
    platform()
    walls()
    porch()
    roofs()
    stair()
    sema()
    guardian()
    spirit_house()
    siege()
    tile_heap()


def ferns():
    """sword ferns, the rainforest's floor (the Olympic rain forest): each a clump of arching fronds, set where the wet
    stays: thick along the platform's foot and the wall's drip line, thinning out into the clearing"""
    rnd = random.Random(21)
    spots = []
    for i in range(60):
        side = rnd.random()
        if side < 0.45:                                           # along the platform's foot, the drip line
            x = rnd.uniform(-8.2, 7.8)
            y = rnd.choice((-1, 1)) * rnd.uniform(4.9, 6.2)
        elif side < 0.65:
            x = rnd.choice((-1, 1)) * rnd.uniform(8.0, 9.4)
            y = rnd.uniform(-5.0, 5.0)
            if x > 0 and abs(y) < 2.3:
                continue                                          # the stair's way stays open
        else:                                                     # scattered out into the clearing
            x, y = rnd.uniform(-14, 14), rnd.uniform(-12, 12)
            if abs(x) < 8.5 and abs(y) < 5.5:
                continue
        spots.append((x, y))
    for k, (x, y) in enumerate(spots):
        s = rnd.uniform(0.6, 1.1)
        for f in range(rnd.randint(7, 11)):
            a = rnd.uniform(0, 2 * math.pi)
            ln = rnd.uniform(0.7, 1.2) * s
            rise = rnd.uniform(0.45, 0.75) * s
            pts = []
            for j in range(5):
                u = j / 4
                pts.append((x + math.cos(a) * ln * u, y + math.sin(a) * ln * u, 0.02 + rise * math.sin(u * math.pi * 0.85)))
            P.tube("fern%d_%d" % (k, f), pts, [0.07 * s, 0.08 * s, 0.07 * s, 0.05 * s, 0.01], "moss", 4)


_build0 = build


def build(root, material):
    _build0(root, material)
    ferns()
