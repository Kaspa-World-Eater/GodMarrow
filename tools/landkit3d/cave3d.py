"""The opening: the cave under the black cliffs (tools/landkit/passes/opening_cave.md). Where the game begins: a pool
of blood in the dark, where the Red seeps in under the cliffs; stairs cut up the column stumps between walls of
columns, great faces carved in them, a skeleton fixed to the wall holding out its weapon; the hall with the empty
throne set in the open mouth of a colossal face, the heap of everything the ones before left at its feet, the dark
mirrors holding the fires, and the door out through the cliff face.

Fingal's Cave on Staffa is the real thing: a sea cave in columnar basalt. Pass 5 (Derek: "The basalt is too uniform";
"There's no cinematography. No. Ambiance. It doesn't inspire wonder"; chapter 12): the columns are a power diagram of
every girth, rough drums with worn arrises and lost flakes, breakdown at the walls' feet; the faces are deep relief,
bigger than the pilgrim, each raked by its own wisp-fire (the Ice Age carvings were made to move in firelight); the
throne sits in the mouth of a face eight yards tall (Bomarzo's Orcus, the mouth in the rock with a seat inside), lit
from below by the two braziers, the hall's one subject; dark mirrors of obsidian ring the hall, a wisp candle before
each, so the fires multiply into the walls (Burke's infinity). The camera sees in as the game will: the roof and the
near walls are hidden from it (cut to stubs) but still shade."""
import math
import random
import numpy as np
import parts3d as P
import cliff3d as C

FLOOR_MODULE = "floor3d"
LAMPS = []
MIRRORS = []
LAMP_REF = 0.05
SAMPLES = 128                            # the fires' light must be clean: noise in it becomes noise of hue
WISP = (0.62, 0.80, 1.0)                 # the wisp-fire: white-blue (Derek: "The wisp light flame should be white blue")
RED = (1.0, 0.12, 0.06)                  # the pool's glow (Derek: "glowing red near the pool"; the one red light allowed)

POOL = (0.0, 0.0, 9.5, 7.4)              # the pool chamber: centre x, y and radii (yards)
STAIR = (-4.6, -0.2, -5.8, -19.5)        # the stairs: x from, x to, y from (bottom), y to (top)
HALL = (-1.9, -31.5, 11.0, 9.5)          # the hall, up and to the right, so the stair's carved wall never hides it
BASIN = (1.0, 0.7, 2.4)                  # the pool itself: centre and the radius of its deep heart
FLOOR_HALL = 6.0
STEPS = 17
DOOR = (5.9, -38.1)
AMBIENT = 0.05                           # nothing reaches in here: the fires make all the light (chapter 12, rule 2)
CARVE_H = 4.2                            # how high the builders dressed the hall's walls before they stopped
FACE_TH = math.radians(222.0)            # where the colossal face is cut in the hall's back wall


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
        return 0.05 + (k - 0.5) * 0.5
    x0, x1, y0, y1 = STAIR
    if x0 < x < x1 and y1 < y < y0:
        u = (y0 - y) / (y0 - y1)                                    # up the stairs, 0 to 1
        step = math.floor(u * STEPS) / STEPS
        return step * FLOOR_HALL + (k - 0.5) * 0.16
    if _ell(x, y, HALL) < 1.0:
        return FLOOR_HALL + (k - 0.5) * 0.12
    return None


def inside(x, y):
    return floor_at(x, y) is not None


def carved(x, y):
    """how made the cave is here: 0 in the pool chamber (raw basalt), rising up the stairs, 1 in the hall (Derek: "it
    becomes more carved and more")"""
    return min(1.0, max(0.0, (-y - 8.0) / 11.0))


def _hall_pt(th, r=1.0):
    cx, cy, rx, ry = HALL
    return cx + rx * r * math.cos(th), cy + ry * r * math.sin(th)


def hall_spot(th, r=0.985):
    x, y = _hall_pt(th, r)
    nx, ny = HALL[0] - x, HALL[1] - y
    nl = math.hypot(nx, ny)
    return x, y, nx / nl, ny / nl


# ---- the carved faces ----

def _vn(x, y, s=0):
    """smooth value noise (pure python, for the reliefs' wear)"""
    xi, yi = math.floor(x), math.floor(y)
    fx, fy = x - xi, y - yi
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    def h(i, j):
        v = math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453
        return v - math.floor(v)
    a, b, c, d = h(xi, yi), h(xi + 1, yi), h(xi, yi + 1), h(xi + 1, yi + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def _g(dx, dy, sx, sy):
    return math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2))


def face_depth(X, Y, kind, wear, seed, pits):
    """the relief's height (in the face's own height H) at X across (-1..1) and Y up (-1.15..1.15). Carved to be read
    from far off in the dark, as the Bayon's faces at Angkor and the moai are: big simple planes, a brow that is a
    shelf, sockets cut deep under it to hold black, a long nose, the cheek falling away under the bone, a mouth or
    none (Derek: "Maybe they don't have a mouth or eyes or they look weird"); worn by the years only on the surface,
    never in the planes; "half" left unfinished where the builders stopped; "effaced" chiselled off by someone;
    "orcus" the colossal face whose mouth is a room (Bomarzo)"""
    ax = abs(X)
    e = (X / 0.64) ** 2 + (Y / 1.0) ** 2
    # the head: a flat front falling steeply at its sides (a plateau, so the features sit on a plane)
    head = 0.17 * max(0.0, 1.0 - e) ** 0.3
    f = 0.0
    # the brow: a shelf across the face, projecting, its underside cut back
    shelf = max(0.0, 1 - (ax / 0.56) ** 6)
    if 0.17 < Y < 0.42:
        f += 0.1 * shelf * min(1.0, (Y - 0.17) / 0.04) * min(1.0, (0.42 - Y) / 0.12)
    # the sockets: deep hollows under the shelf
    sock = {"eyeless": -0.2, "orcus": -0.26, "full": -0.13, "half": -0.13, "blind": -0.07, "closed": -0.09,
            "mouthless": -0.15, "effaced": -0.06}[kind]
    for sx in (-1, 1):
        dx, dy = X - sx * 0.27, Y - 0.08
        f += sock * math.exp(-((dx / 0.15) ** 4 + (dy / 0.1) ** 4))
        if kind in ("full", "half", "mouthless"):
            f += 0.1 * math.exp(-((dx / 0.075) ** 2 + (dy / 0.055) ** 2))              # the orb, no pupil
        if kind == "closed":
            # the lid: a heavy curve over the orb, its slit a dark line (the Bayon's sleep)
            f += 0.09 * math.exp(-((dx / 0.12) ** 2 + ((dy + 0.005) / 0.05) ** 2))
            if abs(dx) < 0.12:
                f -= 0.05 * math.exp(-((dy + 0.03 - 0.25 * dx * dx / 0.0144 * 0.04) / 0.012) ** 2)
    # the nose: long, from the brow to above the mouth, broadening, its tip proud
    if -0.3 < Y < 0.3:
        u = (0.3 - Y) / 0.6
        w = 0.045 + 0.075 * u
        f += (0.07 + 0.13 * u) * max(0.0, 1 - (ax / w) ** 2) * min(1.0, (Y + 0.3) / 0.05)
    f += 0.06 * math.exp(-((X / 0.12) ** 2 + ((Y + 0.27) / 0.05) ** 2))                 # the wings of the nose
    # the cheekbone, and the cheek falling away under it
    for sx in (-1, 1):
        f += 0.05 * math.exp(-(((X - sx * 0.4) / 0.12) ** 2 + ((Y + 0.0) / 0.09) ** 2))
        f -= 0.05 * math.exp(-(((X - sx * 0.32) / 0.12) ** 2 + ((Y + 0.28) / 0.12) ** 2))
    # the mouth: full lips, the slit between them cut deep, its corners lifted (the Bayon's smile)
    if kind in ("full", "eyeless", "half", "blind", "closed"):
        lip = max(0.0, 1 - (X / 0.25) ** 2)
        yc = -0.44 + 0.12 * X * X / 0.0625 * 0.25
        f += 0.06 * lip * math.exp(-((Y - yc - 0.035) / 0.04) ** 2)
        f += 0.07 * lip * math.exp(-((Y - yc + 0.045) / 0.045) ** 2)
        f -= 0.09 * lip * math.exp(-((Y - yc) / 0.016) ** 2)
    if kind == "mouthless":
        f += 0.02 * math.exp(-((X / 0.25) ** 2 + ((Y + 0.45) / 0.12) ** 2))             # smooth stone where it should be
    if kind == "orcus":
        mo = (X / 0.42) ** 2 + ((Y + 0.36) / 0.28) ** 2
        if mo < 1.0:
            f -= 0.48 * math.sqrt(1.0 - mo)                                             # the mouth: a room in the rock
        f += 0.06 * math.exp(-((math.sqrt(mo) - 1.0) / 0.06) ** 2)                      # the lips' rim
    # the chin, and the jaw's line
    f += 0.07 * math.exp(-((X / 0.2) ** 2 + ((Y + 0.72) / 0.1) ** 2))
    keep = 1.0 - 0.25 * wear
    if kind == "effaced":
        keep = 0.15                                                                     # cut away, on purpose
    inside_ = min(1.0, max(0.0, (1.12 - e) / 0.2))
    d = head + f * keep * inside_
    for (px, py, pr, pd) in pits:
        d -= pd * 0.5 * math.exp(-(((X - px) / pr) ** 2 + ((Y - py) / pr) ** 2))
    if kind == "effaced":
        d -= 0.03 * max(0.0, _vn(X * 9, Y * 9, seed) - 0.5) * 2 * inside_                 # the chisel's bites
    if kind == "half":
        s = min(1.0, max(0.0, (X - 0.05) / 0.12))                                       # the builders stopped here
        # the unfinished half in rough-hewn planes, as a quarry face is left
        Xw = X + (_vn(X * 2.5, Y * 2.5, seed + 11) - 0.5) * 0.35
        Yw = Y + (_vn(X * 2.5 + 9, Y * 2.5, seed + 12) - 0.5) * 0.35
        bx, by = math.floor(Xw * 5 + 0.5 * math.floor(Yw * 3.3)), math.floor(Yw * 3.3)
        hv = math.sin(bx * 12.9898 + by * 78.233 + seed) * 43758.5453
        hv -= math.floor(hv)
        rough = 0.12 + (hv - 0.5) * 0.06 + (Xw - bx / 5.0) * (0.1 * (hv - 0.3))
        d = d * (1 - s) + rough * s
    # the rock round it: rough, the face rising out of it as Lascaux's beasts rise out of their bulges
    surround = 0.02 + (_vn(X * 4, Y * 4, seed + 7) - 0.5) * 0.06 + (_vn(X * 11, Y * 11, seed + 8) - 0.5) * 0.02
    edge = max(0.0, max(abs(X) - 0.78, abs(Y) - 0.95) / 0.2)            # toward the panel's bounds it sinks back
    surround -= 0.2 * min(1.0, edge) ** 1.5
    d = max(d, surround * (1.0 - inside_ * 0.7))
    d += (_vn(X * 13, Y * 13, seed + 1) - 0.5) * (0.004 + 0.008 * wear)
    return d


def relief(name, c, nrm, H, kind, seed=0, mat="basalt", wear=0.5, wscale=0.55, back=0.6, nu=36, nv=44):
    """a face carved in the rock as true relief: a closed slab whose front is face_depth, standing on the plane through
    c with normal nrm (horizontal), H tall"""
    nx, ny = nrm
    tx, ty = -ny, nx
    rnd = random.Random(seed)
    pits = [(rnd.uniform(-0.9, 0.9), rnd.uniform(-1.0, 1.0), rnd.uniform(0.02, 0.06), rnd.uniform(0.01, 0.04))
            for _ in range(int(8 + 14 * wear))]
    verts = []
    for j in range(nv + 1):
        Y = -1.15 + 2.3 * j / nv
        for i in range(nu + 1):
            X = -1.0 + 2.0 * i / nu
            d = face_depth(X, Y, kind, wear, seed, pits)
            # the rim slopes back into the rock, so the carving rises out of a bulge of the living rock (as Lascaux's
            # beasts rise out of the wall's own swell) and never stands in a box
            b = min(1.0, max(0.0, max((abs(X) - 0.7) / 0.3, (abs(Y) - 0.98) / 0.17)))
            s = b * b * (3 - 2 * b)
            d = (d * (1 - s) + (-(back - 0.04) + (_vn(X * 7, Y * 7, seed + 5) - 0.5) * 0.08) * s) * H
            u, v = X * wscale * H, Y * 0.5 * H
            verts.append((c[0] + tx * u + nx * d, c[1] + ty * u + ny * d, c[2] + v))
    faces = []
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    # the border, carried back into the rock, and the back
    border = [i for i in range(nu + 1)] + [j * (nu + 1) + nu for j in range(1, nv + 1)] + \
             [nv * (nu + 1) + i for i in range(nu - 1, -1, -1)] + [j * (nu + 1) for j in range(nv - 1, 0, -1)]
    b0 = len(verts)
    for q in border:
        x, y, z = verts[q]
        dd = (x - c[0]) * nx + (y - c[1]) * ny
        verts.append((x - nx * (dd + back * H), y - ny * (dd + back * H), z))
    L = len(border)
    for k in range(L):
        faces.append((border[k], border[(k + 1) % L], b0 + (k + 1) % L, b0 + k))
    faces.append(tuple(b0 + k for k in range(L))[::-1])
    return P.outward(P.poly(name, verts, faces, mat))


# ---- the columns ----

def _radius(x, y):
    """each column's girth by where it cooled: thick colonnade and thin entablature in broad zones, never even"""
    s = 0.5 + 0.5 * math.sin(x * 0.33 + 0.8) * math.cos(y * 0.26 - 0.4)
    s = 0.6 * s + 0.4 * _vn(x * 0.45, y * 0.45, 3)
    rnd = _vn(x * 3.1, y * 3.1, 9)
    return 0.22 + 0.62 * s ** 1.4 + (rnd - 0.5) * 0.12


def _near(x, y):
    """the room nearest a wall point: (highest floor, lowest floor) within a few yards, or None"""
    hi, lo = None, None
    for d in (0.8, 1.6, 2.4):
        for ox, oy in ((-d, -d), (d, d), (-d, d), (d, -d), (-d, 0), (d, 0), (0, -d), (0, d)):
            fr = floor_at(x + ox, y + oy)
            if fr is not None:
                hi = fr if hi is None else max(hi, fr)
                lo = fr if lo is None else min(lo, fr)
        if hi is not None:
            return hi, lo
    return None


CUTS = []                                       # where a relief stands: (x, y, nx, ny, half-width, z-from, z-to)


def _in_cut(x, y):
    for (cx, cy, nx, ny, hw, z0, z1) in CUTS:
        dd = (x - cx) * nx + (y - cy) * ny
        aa = -(x - cx) * ny + (y - cy) * nx
        if -2.2 < dd < 1.2 and abs(aa) < hw * 0.74:
            return (z0, z1)
    return None


def _split(poly, rnd, depth=2):
    """a wall column's upper part breaks into the entablature: thin, crooked columns fanned every way"""
    if depth == 0 or len(poly) < 3:
        return [poly]
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    a = rnd.uniform(0, math.pi)
    dx, dy = math.cos(a), math.sin(a)
    p1 = C._clip(poly, cx, cy, dx, dy)
    p2 = C._clip(poly, cx, cy, -dx, -dy)
    out = []
    for p in (p1, p2):
        if len(p) >= 3:
            out += _split(p, rnd, depth - 1)
    return out


def columns():
    """the cave's rock: every column a cell of one power diagram of every girth (chapter 12, section 5), the floor's
    stumps in the pool chamber and the lower stairs, the walls round the rooms, cut low on the camera's side; tall walls
    break at four or five yards into the entablature's thin crooked columns, which rise out of the light"""
    def keep(x, y):
        f = floor_at(x, y)
        if f is not None:
            return carved(x, y) <= 0.4 and _ell(x, y, HALL) > 1.0
        return _near(x, y) is not None
    pts = C.seeds(-27.0, 17.0, -47.0, 13.0, _radius, keep, seed=11)
    rnd = random.Random(2)
    for k, (cx, cy), r, poly in C.cells(pts):
        h1 = C._h(int(cx * 7), int(cy * 7), 5)
        f = floor_at(cx, cy, h1)
        lean = ((C._h(k, 1, 21) - 0.5) * 0.02, (C._h(k, 2, 22) - 0.5) * 0.02)
        age = 0.35 + 0.5 * C._h(k, 3, 7)
        if f is not None:
            cup = 0.05 if h1 < 0.3 else 0.0
            broken = 0.3 * C._h(k, 4, 24) if C._h(k, 5, 25) < 0.3 else 0.0
            C.rough_prism("st%d" % k, poly, -2.0, f, "basalt", k, cup, broken, lean, age, drum=(0.35, 0.9))
            continue
        near = _near(cx, cy)
        if near is None:
            continue
        near_room, near_low = near
        camera_side = any(inside(cx - d, cy - d) for d in (1.0, 2.0, 3.0, 4.5, 6.0, 8.0, 10.0, 13.0, 16.0))
        if camera_side:
            hgt = near_low + 0.45 + h1 * 0.25
            C.rough_prism("wc%d" % k, poly, -2.0, hgt, "cutrock", k, 0.0, 0.0, lean, age)
            continue
        hgt = near_room + 10.0 + h1 * 3.0
        z0 = -2.0
        if near_room > FLOOR_HALL - 0.5:
            z0 = FLOOR_HALL + CARVE_H - 0.1                      # above the temple's carved walls, the raw columns
        cut = _in_cut(cx, cy)
        split_at = near_room + 4.2 + h1 * 1.5
        spans = [(z0, min(hgt, split_at))]
        if cut:
            spans = [(z0, cut[0]), (cut[1], min(hgt, split_at))]
        for q, (za, zb) in enumerate(spans):
            if zb - za > 0.2:
                C.rough_prism("wl%d_%d" % (k, q), poly, za, zb, "basalt", k + q, 0.0, 0.0, lean, age, drum=(1.2, 3.2))
        # the entablature above: the column splits into thin ones, each leaning its own way
        top0 = max(split_at, cut[1] if cut else 0.0)
        if hgt > top0 + 0.5:
            r2 = random.Random(k)
            for q, sub in enumerate(_split(poly, r2, 2 if r > 0.4 else 1)):
                ln = ((r2.random() - 0.5) * 0.08, (r2.random() - 0.5) * 0.08)
                C.rough_prism("we%d_%d" % (k, q), sub, top0, hgt - r2.uniform(0, 1.5), "basalt", k * 5 + q, 0.0,
                              0.0, ln, 0.4, drum=(0.25, 0.6))
        # breakdown at the wall's foot (only where the rock is raw)
        if carved(cx, cy) < 0.5 and rnd.random() < 0.45:
            for q in range(rnd.randint(1, 3)):
                for d in (0.6, 0.9, 1.3):
                    ox, oy = rnd.uniform(-1, 1), rnd.uniform(-1, 1)
                    px, py = cx + ox * d, cy + oy * d
                    ff = floor_at(px, py)
                    if ff is not None and ff > -0.2:
                        sz = rnd.uniform(0.12, 0.38)
                        C.chunk("bd%d_%d" % (k, q), (px, py, ff), sz, "basalt", k * 3 + q)
                        break


def fallen_drums():
    """drums fallen from the roof's columns, lying on the floor where they broke, half sunk among the stumps"""
    rnd = random.Random(19)
    placed = 0
    tries = 0
    while placed < 9 and tries < 400:
        tries += 1
        x, y = rnd.uniform(-9, 9), rnd.uniform(-7, 7)
        f = floor_at(x, y)
        if f is None or _ell(x, y, POOL) > 0.85 or math.hypot(x - BASIN[0], y - BASIN[1]) < BASIN[2] + 1.6:
            continue
        r = rnd.uniform(0.3, 0.55)
        k = rnd.randint(5, 7)
        poly = [(math.cos(2 * math.pi * i / k + rnd.uniform(-0.2, 0.2)) * r, math.sin(2 * math.pi * i / k) * r) for i in range(k)]
        ln = rnd.uniform(0.7, 1.6)
        v, fc = C.rough_prism("fd%d" % placed, poly, 0.0, ln, "basalt", placed, age=0.7, drum=(ln + 1, ln + 2), build=False)
        yaw = rnd.uniform(0, math.pi)
        tilt = rnd.uniform(-0.15, 0.15)
        out = []
        for (px, py, pz) in v:
            pz -= ln / 2
            # lay it down: its length along the yaw, a little tipped
            a = pz
            b = px
            px2 = a * math.cos(yaw) - py * math.sin(yaw)
            py2 = a * math.sin(yaw) + py * math.cos(yaw)
            out.append((x + px2, y + py2, f + r * 0.8 + b + a * tilt))
        P.outward(P.poly("fd%d" % placed, out, fc, "basalt"))
        placed += 1


def gravel():
    """the grit and small breakdown over the raw floor, thickest at the walls' feet"""
    rnd = random.Random(23)
    n = 0
    for _ in range(4000):
        if n >= 420:
            break
        x, y = rnd.uniform(-10, 10), rnd.uniform(-20, 8)
        f = floor_at(x, y)
        if f is None or carved(x, y) > 0.45 or f < -0.15 or _ell(x, y, HALL) < 1.0:
            continue
        nearw = _near(x + 0.0, y) is not None and any(floor_at(x + ox, y + oy) is None for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)))
        if not nearw and rnd.random() < 0.6:
            continue
        C.chunk("gv%d" % n, (x, y, f), rnd.uniform(0.04, 0.11), "basalt", n, tilt=1.2)
        n += 1


def stairs_cut():
    """the upper steps cut true by the builders: treads squared, each worn hollow down its middle where the feet went,
    the nosing rounded off; dust drifted against each riser (the lowest steps stay rough stumps: the raw becoming the
    made as you climb)"""
    x0, x1, y0, y1 = STAIR
    rnd = random.Random(8)
    for i in range(STEPS):
        ya = y0 - (y0 - y1) * i / STEPS
        yb = y0 - (y0 - y1) * (i + 1) / STEPS
        if carved(0.0, (ya + yb) / 2) <= 0.4:
            continue
        top = FLOOR_HALL * i / STEPS
        for k, (a, b, dz) in enumerate(((x0, x0 + 0.9, 0.0), (x0 + 0.9, x1 - 0.9, -0.06), (x1 - 0.9, x1, 0.0))):
            P.box("step%d_%d" % (i, k), (a, yb, -2.0), (b, ya - 0.06, top + dz), "dressed")
            P.box("nose%d_%d" % (i, k), (a, ya - 0.08, -2.0), (b, ya, top + dz - 0.05), "dressed")   # the worn nosing
        # dust against the riser
        for q in range(3):
            px = rnd.uniform(x0 + 0.2, x1 - 0.2)
            P.sphere("sdust%d_%d" % (i, q), (px, yb + 0.12, top), rnd.uniform(0.18, 0.4), "ash", scale=(1.6, 0.6, 0.18))


def hall_floor():
    """the hall's floor of great dressed flags squared to the throne, each its own tilt by a finger, some cracked
    through, some gone, the joints open; dust drifted where no foot goes"""
    cx, cy, rx, ry = HALL
    ux, uy = -0.7071, -0.7071
    ax, ay = 0.7071, -0.7071
    rnd = random.Random(31)
    for i in range(-9, 10):
        for j in range(-12, 13):
            w, l = 1.05 * rnd.uniform(0.9, 1.1), 1.45 * rnd.uniform(0.85, 1.12)
            off = 0.5 * l if j % 2 else 0.0
            px = cx + ux * (i * l + off) + ax * j * w
            py = cy + uy * (i * l + off) + ay * j * w
            if _ell(px, py, HALL) > 0.97:
                continue
            if rnd.random() < 0.05:
                P.sphere("fdust%d_%d" % (i, j), (px, py, FLOOR_HALL - 0.12), 0.55, "ash", scale=(1.0, 1.0, 0.2))
                continue                                            # a flag gone, the hole full of dust
            pieces = [(0.0, 1.0)]
            if rnd.random() < 0.18:
                cut = rnd.uniform(0.3, 0.7)
                pieces = [(0.0, cut), (cut, 1.0)]                   # cracked through
            for q, (s0, s1) in enumerate(pieces):
                hw = w / 2 - 0.04
                la, lb = -l / 2 + 0.04 + (l - 0.08) * s0 + (0.02 if q else 0), -l / 2 + 0.04 + (l - 0.08) * s1 - (0.02 if q == 0 and len(pieces) > 1 else 0)
                tw = rnd.uniform(-0.05, 0.05)
                u2 = (ux * math.cos(tw) - uy * math.sin(tw), ux * math.sin(tw) + uy * math.cos(tw))
                a2 = (-u2[1], u2[0])
                z = FLOOR_HALL + rnd.uniform(-0.035, 0.02)
                tz = [rnd.uniform(-0.035, 0.035) for _ in range(4)]
                corners = [(px + u2[0] * su + a2[0] * sa * hw, py + u2[1] * su + a2[1] * sa * hw)
                           for su, sa in ((la, -1), (lb, -1), (lb, 1), (la, 1))]
                verts = [(x, y, z - 0.4) for x, y in corners] + [(x, y, z + tz[t]) for t, (x, y) in enumerate(corners)]
                faces = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
                P.outward(P.poly("flag%d_%d_%d" % (i, j, q), verts, faces, "dressed"))
    # dust drifted against the walls and round the pillars' feet
    for k in range(60):
        th = rnd.uniform(math.radians(140), math.radians(310))
        x, y = _hall_pt(th, rnd.uniform(0.86, 0.95))
        P.sphere("hdust%d" % k, (x, y, FLOOR_HALL - 0.02), rnd.uniform(0.4, 0.9), "ash", scale=(1.3, 1.0, 0.16))


def _face_span():
    """the colossal face's place on the back wall: its centre, its normal toward the hall"""
    x, y, nx, ny = hall_spot(FACE_TH, 0.93)
    return x, y, nx, ny


def hall_walls():
    """the temple cut into the living rock round the hall's back: dressed walls to four yards, pilasters, a frieze of
    small faces, the dark mirrors, a cornice, and above it the raw columns where the builders stopped; the colossal face
    breaks through it all"""
    th0, th1 = math.radians(150), math.radians(300)
    n = 40
    kinds = ["blind", "eyeless", "closed", "mouthless", "full", "half", "eyeless", "blind", "closed", "mouthless"]
    fx, fy, fnx, fny = _face_span()
    for k in range(n):
        ta = th0 + (th1 - th0) * k / n
        tb = th0 + (th1 - th0) * (k + 1) / n
        tm = (ta + tb) / 2
        mx, my = _hall_pt(tm, 0.995)
        if math.hypot(mx - fx, my - fy) < 4.6:
            continue                                                # the colossal face is cut here
        a_in, b_in = _hall_pt(ta, 1.0), _hall_pt(tb, 1.0)
        a_out, b_out = _hall_pt(ta, 1.12), _hall_pt(tb, 1.12)
        z0, z1 = FLOOR_HALL - 0.4, FLOOR_HALL + CARVE_H
        verts = [(a_in[0], a_in[1], z0), (b_in[0], b_in[1], z0), (b_out[0], b_out[1], z0), (a_out[0], a_out[1], z0),
                 (a_in[0], a_in[1], z1), (b_in[0], b_in[1], z1), (b_out[0], b_out[1], z1), (a_out[0], a_out[1], z1)]
        faces = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        P.outward(P.poly("cwall%d" % k, verts, faces, "dressed"))
        nx, ny = HALL[0] - mx, HALL[1] - my
        nl = math.hypot(nx, ny)
        nx, ny = nx / nl, ny / nl
        if k % 3 == 0:
            px, py = mx + nx * 0.18, my + ny * 0.18
            P.box("pil%d" % k, (px - 0.28, py - 0.28, z0), (px + 0.28, py + 0.28, z1), "dressed", rot_z=math.atan2(ny, nx))
            P.box("pilcap%d" % k, (px - 0.36, py - 0.36, z1 - 0.3), (px + 0.36, py + 0.36, z1), "dressed", rot_z=math.atan2(ny, nx))
            P.box("pilbase%d" % k, (px - 0.36, py - 0.36, FLOOR_HALL), (px + 0.36, py + 0.36, FLOOR_HALL + 0.3), "dressed", rot_z=math.atan2(ny, nx))
        elif k not in MIRROR_SEGS:
            relief("frieze%d" % k, (mx + nx * 0.02, my + ny * 0.02, FLOOR_HALL + 3.1), (nx, ny), 0.95,
                   kinds[k % len(kinds)], 900 + k, "dressed", 0.7, nu=18, nv=22)
    pts = [(*_hall_pt(th0 + (th1 - th0) * q / 60.0, 0.985), FLOOR_HALL + CARVE_H - 0.05) for q in range(61)]
    pts = [p for p in pts if math.hypot(p[0] - fx, p[1] - fy) > 4.2]
    seg = [pts[0]]
    for p in pts[1:]:
        if math.hypot(p[0] - seg[-1][0], p[1] - seg[-1][1]) > 1.0:
            P.tube("cornice%d" % len(seg), seg, [0.14] * len(seg), "dressed", 6) if len(seg) > 1 else None
            seg = []
        seg.append(p)
    if len(seg) > 1:
        P.tube("cornice_end", seg, [0.14] * len(seg), "dressed", 6)


MIRROR_SEGS = (5, 8, 28, 32)            # the hall wall's segments that hold the dark mirrors (two each side of the face)


def mirror(name, c, nrm, r, seed):
    """a dark mirror of polished obsidian (the smoking mirror; chapter 12): a disc a little dished, set in a ring of
    dressed stone with human teeth set round it, a plate behind seating it in the wall"""
    nx, ny = nrm
    tx, ty = -ny, nx
    n = 32
    verts = [(c[0] - nx * 0.02, c[1] - ny * 0.02, c[2])]
    for i in range(n):
        a = 2 * math.pi * i / n
        verts.append((c[0] + tx * math.cos(a) * r + nx * 0.03, c[1] + ty * math.cos(a) * r + ny * 0.03, c[2] + math.sin(a) * r))
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    o = P.poly(name, verts, faces, "mirror")
    MIRRORS.append((c[0], c[1], c[2], nx, ny, 0.0, r))
    ring = [(c[0] + tx * math.cos(2 * math.pi * i / 40) * (r + 0.07) + nx * 0.04,
             c[1] + ty * math.cos(2 * math.pi * i / 40) * (r + 0.07) + ny * 0.04,
             c[2] + math.sin(2 * math.pi * i / 40) * (r + 0.07)) for i in range(41)]
    P.tube(name + "_ring", ring, [0.075] * 41, "dressed", 6)
    plate = [(c[0] + tx * math.cos(2 * math.pi * i / 24) * (r + 0.22) - nx * 0.06,
              c[1] + ty * math.cos(2 * math.pi * i / 24) * (r + 0.22) - ny * 0.06,
              c[2] + math.sin(2 * math.pi * i / 24) * (r + 0.22)) for i in range(24)]
    P.poly(name + "_plate", plate, [tuple(range(24))], "dressed", 0.1)
    for i in range(14):
        a = 2 * math.pi * (i + 0.5) / 14
        P.sphere("%s_tooth%d" % (name, i), (c[0] + tx * math.cos(a) * (r + 0.17) + nx * 0.06,
                                            c[1] + ty * math.cos(a) * (r + 0.17) + ny * 0.06,
                                            c[2] + math.sin(a) * (r + 0.17)), 0.035, "bone", scale=(0.8, 0.8, 1.2))
    return o


CAM = (-0.612, -0.612, -0.5)            # the camera's look in game coordinates (down the screen's up, 30 degrees down)


def candle_before(name, c, nrm, f, w=18.0):
    """the wisp candle on its stone before a mirror, set where the mirror shows it to whoever stands below: on the
    camera's ray through the mirror's heart, reflected (so the mirror holds a second flame)"""
    nx, ny = nrm
    dx, dy, dz = CAM
    dn = dx * nx + dy * ny
    rx, ry, rz = dx - 2 * dn * nx, dy - 2 * dn * ny, dz
    s = (c[2] - (f + 1.05)) / -rz
    qx, qy = c[0] + rx * s, c[1] + ry * s
    P.box(name + "_stone", (qx - 0.22, qy - 0.22, f - 0.1), (qx + 0.22, qy + 0.22, f + 0.9), "dressed", rot_z=math.atan2(ny, nx))
    rnd = random.Random(len(name))
    for i in range(4):
        P.sphere("%s_wax%d" % (name, i), (qx + rnd.uniform(-0.15, 0.15), qy + rnd.uniform(-0.15, 0.15), f + 0.9), rnd.uniform(0.05, 0.09),
                 "bone", scale=(1.0, 1.0, 0.7))
        P.tube("%s_run%d" % (name, i), [(qx + rnd.uniform(-0.2, 0.2), qy + rnd.uniform(-0.2, 0.2), f + 0.9),
                                        (qx + rnd.uniform(-0.23, 0.23), qy + rnd.uniform(-0.23, 0.23), f + rnd.uniform(0.3, 0.75))],
               [0.025, 0.012], "bone", 4)
    P.cylinder(name + "_wick", (qx, qy, f + 0.9), 0.045, 0.12, "bone", sides=6)
    flame(name, qx, qy, f + 1.05, 0.1, w)


def flame(name, x, y, z, size, w):
    """the wisp-fire itself: its light as a real lamp, its body unseen by the camera (its look is the painter's effect)
    but seen in the mirrors"""
    P.sphere(name + "_flame", (x, y, z + size * 0.6), size, "flame", scale=(0.8, 0.8, 2.0))
    LAMPS.append((x, y, z + size * 0.6, w, WISP))


def torch(name, x, y, z, nx, ny, w=60.0):
    """a wisp-fire torch: a rusted iron bracket out of the wall, a cup, the cold flame"""
    P.tube(name + "_arm", [(x, y, z - 0.25), (x + nx * 0.25, y + ny * 0.25, z - 0.1), (x + nx * 0.32, y + ny * 0.32, z)], [0.03, 0.03, 0.03], "rust", 5)
    P.sphere(name + "_cup", (x + nx * 0.34, y + ny * 0.34, z + 0.03), 0.09, "rust", scale=(1, 1, 0.6))
    P.tube(name + "_ring", [(x - ny * 0.08, y + nx * 0.08, z - 0.3), (x + ny * 0.08, y - nx * 0.08, z - 0.3)], [0.03, 0.03], "rust", 5)
    flame(name, x + nx * 0.34, y + ny * 0.34, z + 0.08, 0.09, w)


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
    P.tube("sk_iron1", [at(-0.2, 0.55, 0.05), at(0.2, 0.55, 0.05)], [0.025, 0.025], "rust", 5)
    P.tube("sk_iron2", [at(-0.62, 0.82, 0.04), at(-0.48, 0.92, 0.04)], [0.025, 0.025], "rust", 5)
    P.tube("sk_sword", [at(0.36, 0.42, 0.62), at(0.36, 0.5, 1.5)], [0.035, 0.008], "rust", 4)
    P.tube("sk_guard", [at(0.2, 0.4, 0.66), at(0.52, 0.4, 0.66)], [0.02, 0.02], "rust", 4)


def chains(x, y, z, k, floor=FLOOR_HALL, step=0.12):
    """a rusted chain hanging from the dark, its links as real loops, the end lying where it lands"""
    rnd = random.Random(k)
    n = int((z - floor) / step) + rnd.randint(2, 6)
    for i in range(n):
        zz = z - i * step
        if zz < floor + 0.05:
            zz = floor + 0.03
            x += 0.1
        P.sphere("ch%d_%d" % (k, i), (x + (0.02 if i % 2 else -0.02), y, zz), 0.05, "rust", scale=(0.4 if i % 2 else 1.0, 1.0 if i % 2 else 0.4, 1.0))


def throne():
    """the empty throne (Derek: "The throne sucks too"): set in the open mouth of a face eight yards tall, cut into a
    mass of the raw columns at the head of the nave (Bomarzo's Orcus: the mouth in the rock with a seat inside). Its
    sockets are empty and lit from below by the two braziers, the brightest fires in the hall. A dais of five worn
    steps; the seat too big for a man; an iron circlet left on it; chains hanging out of the dark into the mouth; the
    heap of everything the ones before left, spilling down the steps (Conan's tomb: "just like the movie"); the
    Stranger's wax and cards on the step"""
    fx, fy, nx, ny = _face_span()
    sx, sy = -ny, nx
    f = FLOOR_HALL
    H = 8.0
    # the dais, five steps of dressed stone, each worn hollow where the feet went
    for k in range(5):
        dep = 6.2 - k * 1.05
        wid = 8.4 - k * 1.1
        z1 = f + 0.28 * (k + 1)
        cx, cy = fx + nx * (dep / 2 - 0.6), fy + ny * (dep / 2 - 0.6)
        corners = [(cx + nx * a * dep / 2 + sx * b * wid / 2, cy + ny * a * dep / 2 + sy * b * wid / 2) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        verts = [(x, y, f - 0.5) for x, y in corners] + [(x, y, z1) for x, y in corners]
        faces = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        P.outward(P.poly("dais%d" % k, verts, faces, "dressed"))
    top = f + 1.4
    # the colossal face: its lower lip at the dais top, so the mouth is the throne room
    cz = top + 0.36 * 0.5 * H + 0.28 * 0.5 * H - 0.25
    CUTS.append((fx, fy, nx, ny, 0.55 * H, f - 2.0, cz + 0.6 * H))
    relief("orcus", (fx, fy, cz), (nx, ny), H, "orcus", 4242, "basalt", 0.55, back=0.75, nu=64, nv=76)
    # the seat inside the mouth, too big for a man, and the floor of the mouth carried in from the dais
    mx, my = fx - nx * 1.1, fy - ny * 1.1
    P.box("mouthfloor", (mx - 1.8, my - 1.8, f), (mx + 1.8, my + 1.8, top), "dressed", rot_z=math.atan2(ny, nx))
    P.box("seat", (mx - 0.75, my - 1.3, top), (mx + 0.75, my + 1.3, top + 1.05), "dressed", rot_z=math.atan2(ny, nx))
    P.box("seatback", (mx - 1.45, my - 1.3, top), (mx - 0.85, my + 1.3, top + 2.4), "dressed", rot_z=math.atan2(ny, nx))
    # the circlet left on the seat: a ring of rusted iron with seven points
    cxr, cyr, czr = mx + nx * 0.2, my + ny * 0.2, top + 1.08
    ring = [(cxr + math.cos(2 * math.pi * i / 24) * 0.24, cyr + math.sin(2 * math.pi * i / 24) * 0.24, czr) for i in range(25)]
    P.tube("circlet", ring, [0.03] * 25, "rust", 5)
    for i in range(7):
        a = 2 * math.pi * i / 7
        P.tube("circ_pt%d" % i, [(cxr + math.cos(a) * 0.24, cyr + math.sin(a) * 0.24, czr), (cxr + math.cos(a) * 0.26, cyr + math.sin(a) * 0.26, czr + 0.14)],
               [0.022, 0.004], "rust", 4)
    # chains hanging out of the dark into the mouth
    for k, (a, b) in enumerate(((-0.9, 0.4), (0.7, -0.2), (1.3, 0.9))):
        chains(mx + sx * a + nx * b, my + sy * a + ny * b, top + 9.0, 700 + k, floor=top + (1.05 if abs(a) < 1.0 else 0.0))
    # the braziers: wisp-fire in iron bowls on tall tripods at the dais' foot, lighting the face from below
    for k, side in enumerate((-1, 1)):
        bx, by = fx + nx * 3.4 + sx * side * 4.8, fy + ny * 3.4 + sy * side * 4.8
        for i in range(3):
            a = i * 2.094 + 0.3
            P.tube("tbz%d_leg%d" % (k, i), [(bx + math.cos(a) * 0.45, by + math.sin(a) * 0.45, f), (bx + math.cos(a) * 0.14, by + math.sin(a) * 0.14, f + 1.05)],
                   [0.035, 0.028], "rust", 5)
        P.sphere("tbz%d_bowl" % k, (bx, by, f + 1.1), 0.46, "rust", scale=(1.0, 1.0, 0.42))
        P.sphere("tbz%d_ash" % k, (bx, by, f + 1.21), 0.38, "ash", scale=(1.0, 1.0, 0.2))
        flame("tbz%d" % k, bx, by, f + 1.25, 0.3, 170.0)
    # the heap, spilling down the steps: a mound of rotted mail and scale, everything else on it and round it
    hx, hy = fx + nx * 5.4, fy + ny * 5.4
    P.sphere("heapmound", (hx, hy, f - 0.35), 2.3, "ash", scale=(1.35, 1.0, 0.4))
    rnd = random.Random(9)
    ca, sa_ = math.cos(math.atan2(ny, nx)), math.sin(math.atan2(ny, nx))
    def mound_z(x, y):
        dx, dy = x - hx, y - hy
        u = (dx * ca + dy * sa_) / (2.3 * 1.35)
        v = (-dx * sa_ + dy * ca) / 2.3
        q = 1 - u * u - v * v
        dais = 0.0
        along = (x - fx) * nx + (y - fy) * ny
        if along < 5.6:
            dais = 0.28 * min(5, int((5.6 - along) / 1.05) + 1)
        return f + max(dais, -0.35 + 0.4 * 2.3 * math.sqrt(max(0.0, q)))
    for i in range(240):
        r = rnd.uniform(0, 1) ** 0.7 * 2.9
        a = rnd.uniform(0, 2 * math.pi)
        x, y = hx + math.cos(a) * r * 1.2, hy + math.sin(a) * r
        z = mound_z(x, y)
        kind = rnd.random()
        b = rnd.uniform(0, math.pi)
        if kind < 0.16:                                            # a sword driven in, upright or leaning
            ln = rnd.uniform(0.8, 1.15)
            lx, ly = math.cos(b) * rnd.uniform(0, 0.4), math.sin(b) * rnd.uniform(0, 0.4)
            p0 = (x, y, z - 0.25)
            p1 = (x + lx, y + ly, z + ln * 0.85)
            P.tube("heap_us%d" % i, [p0, p1], [0.035, 0.008], "rust", 4)
            gx, gy, gz = x + lx * 0.6, y + ly * 0.6, z + ln * 0.55
            P.tube("heap_ug%d" % i, [(gx - math.sin(b) * 0.15, gy + math.cos(b) * 0.15, gz), (gx + math.sin(b) * 0.15, gy - math.cos(b) * 0.15, gz)], [0.02, 0.02], "rust", 4)
            P.sphere("heap_up%d" % i, (x + lx * 0.95, y + ly * 0.95, z + ln * 0.82), 0.035, "rust")
        elif kind < 0.36:                                          # a sword lying
            ln = rnd.uniform(0.7, 1.0)
            p0, p1 = (x - math.cos(b) * ln / 2, y - math.sin(b) * ln / 2, z), (x + math.cos(b) * ln / 2, y + math.sin(b) * ln / 2, z + rnd.uniform(-0.1, 0.2))
            P.tube("heap_sw%d" % i, [p0, p1], [0.03, 0.006], "rust", 4)
            P.tube("heap_gd%d" % i, [(p0[0] - math.sin(b) * 0.13, p0[1] + math.cos(b) * 0.13, p0[2]),
                                     (p0[0] + math.sin(b) * 0.13, p0[1] - math.cos(b) * 0.13, p0[2])], [0.018, 0.018], "rust", 4)
        elif kind < 0.44:                                          # a spear, leaning on the heap or the steps
            ln = rnd.uniform(1.8, 2.5)
            P.tube("heap_sp%d" % i, [(x, y, z), (x + math.cos(b) * 0.9, y + math.sin(b) * 0.9, z + ln)], [0.025, 0.02], "wood", 4)
            P.tube("heap_sph%d" % i, [(x + math.cos(b) * 0.9, y + math.sin(b) * 0.9, z + ln), (x + math.cos(b) * 1.02, y + math.sin(b) * 1.02, z + ln + 0.32)], [0.035, 0.004], "rust", 4)
        elif kind < 0.6:                                           # a helm, with its rim
            P.sphere("heap_hm%d" % i, (x, y, z + 0.08), 0.15, "rust", scale=(1.0, 0.9, 0.85))
            P.sphere("heap_hr%d" % i, (x, y, z + 0.02), 0.19, "rust", scale=(1.0, 0.95, 0.15))
        elif kind < 0.74:                                          # a shield, leaning
            P.sphere("heap_sh%d" % i, (x, y, z + 0.25), 0.34, "rust", scale=(1.0, 0.12, 1.0), rot=(rnd.uniform(-0.6, 0.6), 0, b))
        elif kind < 0.82:                                          # a skull
            P.sphere("heap_sk%d" % i, (x, y, z + 0.08), 0.1, "bone", scale=(1.1, 0.9, 0.95))
        elif kind < 0.92:                                          # long bones
            P.tube("heap_bn%d" % i, [(x, y, z), (x + math.cos(b) * 0.42, y + math.sin(b) * 0.42, z + 0.05)], [0.026, 0.022], "bone", 5)
        else:                                                      # rotted cloth over the heap
            verts = [(x + math.cos(b + q * 1.57) * 0.5, y + math.sin(b + q * 1.57) * 0.4, z + rnd.uniform(-0.05, 0.08)) for q in range(4)]
            P.poly("heap_cl%d" % i, verts, [(0, 1, 2, 3)], "cloth", 0.01)
    # the Stranger's wax at the dais' left foot, burned down over years, and his cards on the lowest step
    rnd = random.Random(77)
    wx, wy = fx + nx * 5.2 - sx * 3.0, fy + ny * 5.2 - sy * 3.0
    for i in range(14):
        a = rnd.uniform(0, 6.28)
        P.sphere("wax%d" % i, (wx + math.cos(a) * rnd.uniform(0, 0.7), wy + math.sin(a) * rnd.uniform(0, 0.7), f + 0.3), rnd.uniform(0.07, 0.17), "bone",
                 scale=(1.0, 1.0, 0.7))
    cards(wx + nx * 0.6 + sx * 0.8, wy + ny * 0.6 + sy * 0.8, f + 0.29, math.atan2(ny, nx))


def cards(x, y, z, ang):
    """the Stranger's cards laid on the dais step: the nine of the reading in its spread, face down, one turned"""
    spread = [(0, 0), (0, 0.32), (0, -0.32), (0.45, 0), (-0.45, 0), (0.9, 0.32), (0.9, -0.32), (-0.9, 0.32), (-0.9, -0.32)]
    for i, (a, b) in enumerate(spread):
        cx = x + a * math.cos(ang) - b * math.sin(ang)
        cy = y + a * math.sin(ang) + b * math.cos(ang)
        P.box("card%d" % i, (cx - 0.11, cy - 0.07, z), (cx + 0.11, cy + 0.07, z + 0.012), "boxpaint" if i else "bone", rot_z=ang + (i % 3 - 1) * 0.1)


def pillars():
    """two rows of squared pillars cut from the rock, the nave between them leading to the throne, rising into the dark
    of the roof (out of frame); chains from some, their feet chipped"""
    cx, cy = HALL[0], HALL[1]
    ux, uy = -0.7071, -0.7071
    ax, ay = 0.7071, -0.7071
    for row in (-1, 1):
        for i, du in enumerate((-3.6, 0.8, 5.0)):
            px = cx + ux * du + ax * row * 5.6
            py = cy + uy * du + ay * row * 5.6
            P.box("pillar%d_%d" % (row, i), (px - 0.42, py - 0.42, FLOOR_HALL), (px + 0.42, py + 0.42, FLOOR_HALL + 12.0), "dressed", rot_z=math.radians(45))
            P.box("pbase%d_%d" % (row, i), (px - 0.56, py - 0.56, FLOOR_HALL), (px + 0.56, py + 0.56, FLOOR_HALL + 0.4), "dressed", rot_z=math.radians(45))
            P.box("pcap%d_%d" % (row, i), (px - 0.52, py - 0.52, FLOOR_HALL + 4.6), (px + 0.52, py + 0.52, FLOOR_HALL + 4.95), "dressed", rot_z=math.radians(45))
            if (i + row) % 2 == 0:
                chains(px + 0.5, py + 0.5, FLOOR_HALL + 4.5, 300 + i * 3 + row)


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
    relief("doorface", (dx + nx * 0.3, dy + ny * 0.3, FLOOR_HALL + 3.3), (nx, ny), 0.55, "closed", 77, "dressed", 0.6, nu=14, nv=18)


def roof():
    """the cave's roof: hidden from the camera, but it keeps the sky out, so the dark is the cave's own"""
    o = P.box("roof", (-30.0, -50.0, 15.5), (18.0, 14.0, 16.5), "basalt")
    o.visible_camera = False


def pool():
    """the Red come in under the cliffs: the blood standing in the basin, level, its edge soaking into the stone"""
    n = 40
    rr = BASIN[2] + 1.6
    pts = [(BASIN[0] + math.cos(2 * math.pi * k / n) * rr, BASIN[1] + math.sin(2 * math.pi * k / n) * rr, -0.12) for k in range(n)]
    P.poly("pool", pts, [tuple(range(n))], "pool")


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
            P.sphere("pb%d_torso" % k, at(0, 0, 0.12), 1.0, fl, scale=(0.45, 0.3, 0.2), rot=(0, 0, yaw))
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
    """at the pool's edge, the ones who came up and did not stand: rib cages half sunk in the blood, skulls, long bones
    (the Stranger: "the ones who came up before you and didn't stand")"""
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
    for i in range(rnd.randint(3, 6)):
        ox, oy = x + rnd.uniform(0.15, 0.6), y + rnd.uniform(-0.6, 0.6)
        P.cylinder("of_c%d_%d" % (k, i), (ox, oy, f), 0.035, rnd.uniform(0.05, 0.16), "bone", sides=6)
    for i in range(rnd.randint(4, 9)):
        P.sphere("of_t%d_%d" % (k, i), (x + rnd.uniform(0.1, 0.7), y + rnd.uniform(-0.6, 0.6), f + 0.01), 0.018, "bone")
    for i in range(rnd.randint(1, 4)):
        P.cylinder("of_g%d_%d" % (k, i), (x + rnd.uniform(0.1, 0.6), y + rnd.uniform(-0.5, 0.5), f), 0.03, 0.008, "gold", sides=8)


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
    P.box("niche%d" % k, (x - 0.3, y - 0.3, z), (x + 0.3, y + 0.3, z + 0.6), "lacquer", rot_z=math.atan2(ny, nx))
    P.sphere("nskull%d" % k, (x + nx * 0.22, y + ny * 0.22, z + 0.12), 0.11, "bone", scale=(1.0, 1.0, 1.1))


FACE_TURN = (0.74, 0.67)               # the stair faces turned on the wall to look down the stairs at whoever climbs
STAIR_FACES = ((-8.5, "half", 2.3), (-12.6, "eyeless", 2.5), (-17.2, "closed", 2.6))   # y, kind, height (yards)


def build(root, material):
    P.init(root, material)
    # the great faces of the stairs first: the wall's columns are cut back where they stand
    wx = STAIR[0] - 0.05
    for i, (y, kind, H) in enumerate(STAIR_FACES):
        f = floor_at(STAIR[0] + 0.4, y) or 0.0
        cz = f + 0.35 + 0.575 * H
        CUTS.append((wx, y, 1.0, 0.0, 0.62 * H, f - 2.0, cz + 0.6 * H))
    fx, fy, fnx, fny = _face_span()
    CUTS.append((fx, fy, fnx, fny, 0.55 * 8.0, -2.0, FLOOR_HALL + 9.0))
    columns()
    fallen_drums()
    gravel()
    roof()
    pool()
    pool_dead()
    pool_bodies()
    # the pool's own red glow, low over the blood (the one red light allowed); past it, only the wisp-fires
    # low in the basin, so the stumps round it take the glow and the walls beyond stay the wisp-fire's (Derek: "The
    # only light after the pool comes from the wisp fire torches")
    LAMPS.append((BASIN[0], BASIN[1], -0.06, 220.0, RED))
    LAMPS.append((BASIN[0] - 1.5, BASIN[1] + 0.9, -0.08, 100.0, RED))
    LAMPS.append((BASIN[0] + 1.2, BASIN[1] - 1.1, -0.08, 100.0, RED))
    # the stair faces, each raked by a wisp-fire beside it (chapter 12: carved to move in firelight)
    for i, (y, kind, H) in enumerate(STAIR_FACES):
        f = floor_at(STAIR[0] + 0.4, y) or 0.0
        cz = f + 0.35 + 0.575 * H
        relief("sface%d" % i, (wx + 0.25, y, cz), FACE_TURN, H, kind, 50 + i, "basalt", 0.6 if i else 0.85, back=0.9)
        offerings(wx + 0.5, y, f, 100 + i)
    # each face raked by its own fire from its up-stair side, at the brow's height: the nose throws its shadow over the
    # cheek, a socket half black (chapter 12: carved to be seen in moving light)
    f = floor_at(STAIR[0] + 0.4, -6.4) or 0.0
    torch("torch0", wx + 0.15, -6.4, f + 2.0, 1.0, 0.0, 80.0)
    for i, (y, kind, H) in enumerate(STAIR_FACES):
        ty = y - 0.62 * H - 0.25
        f = floor_at(STAIR[0] + 0.4, ty) or 0.0
        fz = (floor_at(STAIR[0] + 0.4, y) or 0.0) + 0.35 + 0.575 * H
        torch("torch%d" % (i + 1), wx + 0.15, ty, fz + 0.15 * H, 1.0, 0.0, 85.0)
    f = floor_at(STAIR[0] + 0.4, -15.2) or 0.0
    skeleton(wx + 0.3, -15.2, f + 1.5, 1.0, 0.0)
    stairs_cut()
    hall_floor()
    hall_walls()
    pillars()
    # the dark mirrors, a wisp candle before each
    th0, th1 = math.radians(150), math.radians(300)
    for k in MIRROR_SEGS:
        tm = th0 + (th1 - th0) * (k + 0.5) / 40
        x, y, nx, ny = hall_spot(tm, 0.99)
        c = (x + nx * 0.05, y + ny * 0.05, FLOOR_HALL + 2.2)
        mirror("mirror%d" % k, c, (nx, ny), 0.72, k)
        candle_before("mcandle%d" % k, c, (nx, ny), FLOOR_HALL, 20.0)
    # two dim torches far round the hall, so its edges are found, not lit
    for i, th in enumerate((math.radians(160), math.radians(290))):
        x, y, nx, ny = hall_spot(th, 0.975)
        torch("htorch%d" % i, x, y, FLOOR_HALL + 2.2, nx, ny, 40.0)
    for k, th in enumerate([math.radians(155 + 9 * q) for q in range(16)]):
        x, y, nx, ny = hall_spot(th, 0.985)
        if math.hypot(x - fx, y - fy) < 4.8:
            continue
        if k % 4 == 1:
            rags(400 + k, x, y, FLOOR_HALL + CARVE_H - 0.2, nx, ny)
        if k % 5 == 3:
            niche(500 + k, x + nx * 0.02, y + ny * 0.02, FLOOR_HALL + 1.0, nx, ny)
    door_frame()
    throne()
