"""The Red Shore: the village and its coast (tools/landkit/passes/red_shore_village.md), pass 1, the massing. The whole
layout as forms, each placed by its cause, so every piece has its place before it is taken to its own grade:
  the Red Water, the black sand, the drift logs at the storm line, the old canoes, the sea stacks;
  the low bluff and the spruce fringe leaning out to sea; the river's ravine and the path down;
  on the terrace the palisade (highest on the water side, breached at the wet end), the ring of hide huts, the fire
  pit of the dead, the temple (passed: placed as it is, its stair facing the fire), the giants round it.
Coordinates: game yards; shore_floor gives s (seaward) and t (along the shore).
"""
import math
import random
import numpy as np
import bpy
import parts3d as P
import shore_floor as S
import temple3d as T

FLOOR_MODULE = "shore_floor"
LAMPS = []
VS, VT, VR = S.VILLAGE


def gz(x, y):
    return float(S.height(np.array([x]), np.array([y]))[0])


def at(s, t):
    return S.xy(s, t)


def ground():
    res = 0.3
    xs = np.arange(-95.0, 80.0, res)
    ys = np.arange(-95.0, 80.0, res)
    X, Y = np.meshgrid(xs, ys)
    P.grid("ground", xs, ys, S.height(X, Y), "ground")
    # the Red Water: one heavy surface to the edge of the world (its swells and surf are its own piece)
    n = 4
    pts = []
    for s_, t_ in ((S.SEA_S - 4.0, -120.0), (S.SEA_S - 4.0, 120.0), (200.0, 120.0), (200.0, -120.0)):
        x, y = at(s_, t_)
        pts.append((x, y, 0.0))
    P.poly("red_water", pts[::-1] if False else pts, [(0, 3, 2, 1)], "blood")
    # the river's water down its bed
    for k in range(140):
        s_ = -60.0 + k * 1.0
        if s_ > S.SEA_S - 2:
            break
        rt = float(S.river_t(np.array(s_)))
        lvl = float(S.river_bed(np.array(s_))) + 0.12
        w = 1.2 if s_ < S.BACK_S else 2.5
        quad = [at(s_, rt - w), at(s_, rt + w), at(s_ + 1.02, rt + w), at(s_ + 1.02, rt - w)]
        P.poly("river%d" % k, [(x, y, lvl) for x, y in quad], [(0, 3, 2, 1)], "water")


def driftlogs():
    """whole trees thrown up by the storms, bleached, lying roughly along the shore at the storm line, some with their
    root wads, the oldest half buried at the backshore, the newest lowest and loosest (chapter 10)"""
    rnd = random.Random(12)
    for i in range(70):
        s_ = rnd.uniform(S.LOGS_S + 0.5, S.DRY_S - 0.5)
        t_ = rnd.uniform(-75, 75)
        if abs(t_ - float(S.river_t(np.array(s_)))) < 9:
            continue
        ang = rnd.uniform(-0.35, 0.35)
        ln = rnd.uniform(7, 24)
        r = rnd.uniform(0.35, 1.0)
        a = (s_ - math.sin(ang) * ln / 2, t_ - math.cos(ang) * ln / 2)
        b = (s_ + math.sin(ang) * ln / 2, t_ + math.cos(ang) * ln / 2)
        pa, pb = at(*a), at(*b)
        za, zb = gz(*pa) + r * 0.55, gz(*pb) + r * 0.5
        P.tube("dlog%d" % i, [(pa[0], pa[1], za), (pb[0], pb[1], zb)], [r, r * 0.6], "cedar", 10)
        if rnd.random() < 0.3:
            for k in range(9):
                aa = 2 * math.pi * k / 9
                tip = (pa[0] + math.cos(aa) * r * 2.6 * 0.3, pa[1] + math.sin(aa) * r * 2.6 * 0.3, za + math.sin(aa) * r * 2.4)
                P.tube("droot%d_%d" % (i, k), [(pa[0], pa[1], za), tip], [r * 0.32, 0.03], "cedar", 6)


def canoes():
    """the shore folk's old canoes, untouched a hundred years, upturned above the logs (the area page)"""
    for k, t_ in enumerate((-12.0, -8.5, 6.0, 16.0)):
        s_ = S.BACK_S + 4.0 + (k % 2) * 0.8
        x, y = at(s_, t_)
        o = P.sphere("canoe%d" % k, (x, y, gz(x, y) + 0.1), 1.0, "cedar", scale=(4.2, 0.65, 0.42))
        o.rotation_euler = (0, 0, math.radians(-45 + (k - 1.5) * 4))


def stacks():
    """dark basalt stacks standing out in the red, piled from joint blocks, notched at the foot, crowned with a little
    soil and a sheared spruce (chapter 10)"""
    rnd = random.Random(5)
    for k, (s_, t_, hgt, rad) in enumerate(((80, -40, 22, 6), (92, -18, 30, 8), (74, 22, 14, 4), (100, 40, 26, 7))):
        x0, y0 = at(s_, t_)
        z = -1.0
        while z < hgt:
            hb = rnd.uniform(2.0, 4.0)
            rr = rad * rnd.uniform(0.8, 1.0) * (0.7 if z < 1.5 else 1.0)          # the wave-cut notch at its foot
            ox, oy = rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6)
            P.cylinder("stack%d_%d" % (k, int(z * 10)), (x0 + ox, y0 + oy, z), rr, hb, "basalt", sides=7)
            z += hb
        P.sphere("stackcap%d" % k, (x0, y0, z), rad * 0.9, "moss", scale=(1.0, 1.0, 0.3))


def fringe():
    """the spruce fringe on the bluff's lip, sheared on the landward side by the one wind going out to sea, so each
    wedge rises toward the water and every trunk leans out over the sand (the area page: an uncanny thing)"""
    rnd = random.Random(8)
    for i in range(26):
        s_ = rnd.uniform(S.BLUFF_S - 3.0, S.BLUFF_S + 0.5)
        t_ = rnd.uniform(-75, 75)
        if abs(t_ - float(S.river_t(np.array(s_)))) < 6:
            continue
        x, y = at(s_, t_)
        z0 = gz(x, y)
        hgt = rnd.uniform(5, 11) * (0.6 + (s_ - S.BLUFF_S + 3.0) / 8.0)
        lean = rnd.uniform(0.25, 0.45)
        top = at(s_ + hgt * lean, t_ + rnd.uniform(-1, 1))
        P.tube("fr_trunk%d" % i, [(x, y, z0 - 0.3), (top[0], top[1], z0 + hgt)], [0.35, 0.12], "wood", 7)
        c = at(s_ + hgt * lean * 0.85, t_)
        o = P.sphere("fr_crown%d" % i, (c[0], c[1], z0 + hgt * 0.8), hgt * 0.38, "moss", scale=(1.0, 0.75, 0.55))


def giants():
    """the old growth's giants round the village, Sitka spruce and cedar 3 to 4 yards across, their crowns far out of
    frame (cut here at 16 yards for the massing view), never in clumps"""
    rnd = random.Random(3)
    placed = []
    tries = 0
    while len(placed) < 34 and tries < 900:
        tries += 1
        s_, t_ = rnd.uniform(-70, S.BLUFF_S - 5.0), rnd.uniform(-75, 75)
        if math.hypot(s_ - VS, t_ - VT) < VR + 4 or abs(t_ - float(S.river_t(np.array(s_)))) < 7:
            continue
        if any(math.hypot(s_ - a, t_ - b) < 11 for a, b in placed):
            continue
        placed.append((s_, t_))
        x, y = at(s_, t_)
        r = rnd.uniform(1.5, 2.1)
        z0 = gz(x, y)
        P.tube("giant%d" % len(placed), [(x, y, z0 - 0.5), (x, y, z0 + 2.0), (x, y, z0 + 16.0)], [r * 1.35, r, r * 0.85], "wood", 14)
    return placed


def palisade():
    """split cedar posts, sharpened, lashed: highest on the water side; rebuilt with whatever was left; breached at the
    wet end by the river, where the posts went soft; the gate facing the way down, flanked by face-posts"""
    rnd = random.Random(14)
    gate_a = math.atan2(S.GATE[1] - VT, S.GATE[0] - VS)
    wet_a = math.atan2(-25.0 - VT, 10.0 - VS)
    n = int(2 * math.pi * VR / 0.48)
    for k in range(n):
        a = 2 * math.pi * k / n
        if abs(math.atan2(math.sin(a - gate_a), math.cos(a - gate_a))) < 0.06:
            continue                                                          # the gateway
        breach = abs(math.atan2(math.sin(a - wet_a), math.cos(a - wet_a))) < 0.16
        s_, t_ = VS + math.cos(a) * VR, VT + math.sin(a) * VR
        x, y = at(s_, t_)
        z0 = gz(x, y)
        seaward = 0.5 + 0.5 * math.cos(a)
        hgt = 2.6 + 1.6 * seaward + rnd.uniform(-0.2, 0.2)
        if breach:
            if rnd.random() < 0.6:
                ang = rnd.uniform(0, 2 * math.pi)
                P.tube("pal_down%d" % k, [(x, y, z0 + 0.15), (x + math.cos(ang) * hgt, y + math.sin(ang) * hgt, z0 + 0.15)], [0.2, 0.16], "cedar", 6)
            continue
        P.tube("pal%d" % k, [(x, y, z0 - 0.6), (x, y, z0 + hgt - 0.35), (x, y, z0 + hgt)], [0.22, 0.2, 0.02], "cedar", 6)
    for side in (-1, 1):
        a = gate_a + side * 0.075
        s_, t_ = VS + math.cos(a) * VR, VT + math.sin(a) * VR
        x, y = at(s_, t_)
        P.cylinder("gatepost%d" % side, (x, y, gz(x, y) - 0.5), 0.42, 6.0, "cedar", sides=10)


def huts():
    """a ring of round huts of bent poles with pale hides lashed over them, smoke holes at the top, each door facing the
    fire with a carved cedar face-post beside it; some burned to their ribs, some fallen in"""
    rnd = random.Random(21)
    for k in range(9):
        a = 2 * math.pi * k / 9 + 0.2
        s_, t_ = VS + math.cos(a) * 13.5, VT + math.sin(a) * 13.5
        if math.hypot(s_ - (VS - 15), t_ - VT) < 11:
            continue                                                         # the temple's ground
        x, y = at(s_, t_)
        z0 = gz(x, y)
        r = rnd.uniform(2.2, 2.7)
        state = rnd.choice(("whole", "whole", "whole", "burned", "fallen"))
        for j in range(12):
            b = 2 * math.pi * j / 12
            pa = (x + math.cos(b) * r, y + math.sin(b) * r, z0 - 0.2)
            pm = (x + math.cos(b) * r * 0.75, y + math.sin(b) * r * 0.75, z0 + 2.1)
            pt = (x + math.cos(b) * 0.35, y + math.sin(b) * 0.35, z0 + 2.9)
            if state == "fallen" and j % 3:
                continue
            P.tube("hut%d_pole%d" % (k, j), [pa, pm, pt], [0.07, 0.06, 0.05], "wood", 5)
        if state != "burned":
            P.sphere("hut%d_hide" % k, (x, y, z0 - 0.1), r * 0.98, "hide", scale=(1.0, 1.0, 1.15 if state == "whole" else 0.6))
        da = math.atan2(VT - t_, VS - s_)
        dx, dy = at(s_ + math.cos(da) * (r + 0.4), t_ + math.sin(da) * (r + 0.4))
        P.cylinder("hut%d_post" % k, (dx, dy, gz(dx, dy) - 0.3), 0.22, 2.8, "cedar", sides=8)


def fire_pit():
    """the fire pit of the dead (its own landmark pass to come): a ring of fieldstones, a low ash mound inside, a worn
    ramp where the bearers carried the dead up; the only warm light in the village"""
    x, y = at(VS, VT)
    z0 = gz(x, y)
    rnd = random.Random(2)
    for k in range(26):
        a = 2 * math.pi * k / 26
        P.sphere("pitstone%d" % k, (x + math.cos(a) * 3.2, y + math.sin(a) * 3.2, z0 + 0.1), 0.42 + rnd.uniform(-0.08, 0.1), "basalt",
                 scale=(1.0, 0.8, 0.6))
    P.sphere("ashmound", (x, y, z0 - 0.3), 3.0, "ash", scale=(1.0, 1.0, 0.22))
    LAMPS.append((x, y, z0 + 1.0, 900.0))


def temple():
    """the temple, passed (Derek's A): its own build placed as it is, on the inland side, its stair facing the fire"""
    before = set(bpy.data.objects.keys())
    T.platform()
    T.walls()
    T.porch()
    T.roofs()
    T.stair()
    T.guardian()
    T.interior()
    T.spirit_house()
    new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]
    s0, t0 = VS - 15.5, VT
    x0, y0 = at(s0, t0)
    z0 = gz(x0, y0) - 0.05
    # the temple's own +x (its front) turned to face the fire: toward +s on this coast
    fx, fy = at(s0 + 1.0, t0)
    ang = math.atan2(fy - y0, fx - x0)
    for o in new:
        o.rotation_euler = (0.0, 0.0, ang)
        o.location = (x0, y0, z0)
    for (lx, ly, lz, w) in T.LAMPS:
        c, s_ = math.cos(ang), math.sin(ang)
        LAMPS.append((x0 + lx * c - ly * s_, y0 + lx * s_ + ly * c, z0 + lz, w))


def build(root, material):
    P.init(root, material)
    ground()
    driftlogs()
    canoes()
    stacks()
    fringe()
    giants()
    palisade()
    huts()
    fire_pit()
    temple()
