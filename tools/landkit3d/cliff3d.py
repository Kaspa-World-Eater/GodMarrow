"""The black cliffs that close the beach (tools/landkit/passes/black_cliffs.md): the Red Shore's piece 2, a headland of
columnar basalt (Reynisfjara's columns, chapter 10's headlands), built on the 3D road at the game's scale beside the
beach of piece 1 (redwater3d), so the two are seen together.

The columns are cells of one irregular hexagonal tiling (a hex lattice whose corners are each moved by their own hash,
shared by the cells that meet there, so the columns pack tight with no gaps), each extruded as a prism to a height set
by its cause: the wall standing tall inland of the beach's end, broken down toward the sand into a stair of stumps,
standing in the surf where the sea has cut it. Every column is crossed by joints (a real gap a few hundredths wide)
every yard or so; its top flat or gently cupped (the cupped ones at the foot hold the blood)."""
import math
import zlib
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
    rnd = random.Random(zlib.crc32(name.encode()) % 100000)
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
    cliffs_v2()


# ---- columns that are not uniform (Derek, 2026-10-09: "The basalt is too uniform"; chapter 12, section 5) ----

def seeds(x0, x1, y0, y1, radius, keep, seed=7):
    """column centres by dart throwing, each with its own radius from radius(x, y) (the cooling decided each column's
    girth: thick in the colonnade, thin where it cooled fast), packed so no two overlap; keep(x, y) says where columns
    are wanted at all"""
    rnd = random.Random(seed)
    cell = 0.25
    grid = {}
    pts = []
    tries = int((x1 - x0) * (y1 - y0) * 22)
    reach = int(math.ceil(2.4 / cell))
    for _ in range(tries):
        x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        if not keep(x, y):
            continue
        r = radius(x, y)
        gi, gj = int(math.floor(x / cell)), int(math.floor(y / cell))
        ok = True
        for i in range(gi - reach, gi + reach + 1):
            for j in range(gj - reach, gj + reach + 1):
                for (px, py, pr) in grid.get((i, j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < (0.86 * (r + pr)) ** 2:
                        ok = False
                        break
                if not ok:
                    break
            if not ok:
                break
        if ok:
            grid.setdefault((gi, gj), []).append((x, y, r))
            pts.append((x, y, r))
    return pts


def _clip(poly, mx, my, dx, dy):
    """keep the side of the line through (mx, my), normal (dx, dy), that the seed is on"""
    res = []
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        da = (a[0] - mx) * dx + (a[1] - my) * dy
        db = (b[0] - mx) * dx + (b[1] - my) * dy
        if da <= 0:
            res.append(a)
        if (da <= 0) != (db <= 0):
            t = da / (da - db)
            res.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return res


def cells(pts, gap=0.03):
    """each seed's cell of the power diagram (a Voronoi weighted by each column's own girth): the polygons pack tight
    with every size of column, 4 to 8 sided as the real ones; each shrunk by a joint's gap"""
    grid = {}
    for k, (x, y, r) in enumerate(pts):
        grid.setdefault((int(math.floor(x)), int(math.floor(y))), []).append(k)
    out = []
    for k, (x, y, r) in enumerate(pts):
        poly = [(x - 2.5, y - 2.5), (x + 2.5, y - 2.5), (x + 2.5, y + 2.5), (x - 2.5, y + 2.5)]
        gi, gj = int(math.floor(x)), int(math.floor(y))
        for i in range(gi - 3, gi + 4):
            for j in range(gj - 3, gj + 4):
                for q in grid.get((i, j), ()):
                    if q == k or not poly:
                        continue
                    qx, qy, qr = pts[q]
                    dx, dy = qx - x, qy - y
                    d2 = dx * dx + dy * dy
                    if d2 > 9.0:
                        continue
                    # the power bisector: |p - a|^2 - ra^2 = |p - b|^2 - rb^2
                    c = (d2 + r * r - qr * qr) / (2.0 * d2)
                    poly = _clip(poly, x + dx * c, y + dy * c, dx, dy)
        if len(poly) < 3:
            continue
        cx = sum(p[0] for p in poly) / len(poly)
        cy = sum(p[1] for p in poly) / len(poly)
        sh = []
        for (px, py) in poly:
            dx, dy = px - cx, py - cy
            L = math.hypot(dx, dy) + 1e-9
            sh.append((px - dx / L * gap, py - dy / L * gap))
        merged = []
        for p in sh:
            if not merged or math.hypot(p[0] - merged[-1][0], p[1] - merged[-1][1]) > 0.09:
                merged.append(p)
        if len(merged) > 3 and math.hypot(merged[0][0] - merged[-1][0], merged[0][1] - merged[-1][1]) < 0.09:
            merged.pop()
        if len(merged) >= 3:
            out.append((k, (cx, cy), r, merged))
    return out


def rough_prism(name, pts, z0, z1, mat, seed=0, cup=0.0, broken=0.0, lean=(0.0, 0.0), age=0.5, drum=(0.45, 1.3),
                build=True):
    """a basalt column as the real ones are (chapter 12 section 5; Fingal's Cave, the Causeway): drums of uneven height,
    each joint a real gap, the drum tops domed or cupped (ball and socket); every face spalled and a little bellied or
    hollow; the arrises rounded and chipped by age (age 0 fresh, 1 worn smooth); a big flake gone here and there. Its top
    flat, cupped or broken off at a slant. Returns the mesh object (or the raw verts and faces with build=False)"""
    rnd = random.Random((zlib.crc32(name.encode()) & 0xFFFFF) + seed * 7919)
    n = len(pts)
    cx0 = sum(p[0] for p in pts) / n
    cy0 = sum(p[1] for p in pts) / n
    # every edge split near its middle, so a face can belly or hollow and lose a flake
    ring0 = []
    for k in range(n):
        a, b = pts[k], pts[(k + 1) % n]
        ring0.append((a[0] - cx0, a[1] - cy0, 1))                 # 1: a corner (an arris)
        f = rnd.uniform(0.38, 0.62)
        ring0.append((a[0] + (b[0] - a[0]) * f - cx0, a[1] + (b[1] - a[1]) * f - cy0, 0))
    m = len(ring0)
    verts, faces = [], []
    z = z0
    while z < z1 - 0.05:
        zt = min(z1, z + rnd.uniform(*drum))
        if z1 - zt < 0.25:
            zt = z1
        top = zt >= z1 - 1e-6
        sh = rnd.uniform(0.93, 0.995)
        ox, oy = rnd.uniform(-0.025, 0.025) + lean[0] * z, rnd.uniform(-0.025, 0.025) + lean[1] * z
        tw = rnd.uniform(-0.04, 0.04)
        ct, st_ = math.cos(tw), math.sin(tw)
        flake = rnd.randrange(m) if rnd.random() < 0.35 else -9     # a flake gone from this drum's face
        mid = z + 0.02 + (zt - z) * rnd.uniform(0.35, 0.65)
        rings = []
        for h, zz in enumerate((z + 0.02, mid, zt - 0.02)):
            ring = []
            for k, (x, y, corner) in enumerate(ring0):
                L = math.hypot(x, y) + 1e-9
                inset = rnd.uniform(0.0, 0.025)                          # spall
                if corner:
                    inset += (0.02 + 0.06 * age) * (1.6 if h != 1 else 1.0) * rnd.uniform(0.6, 1.3)   # the arris worn
                    if rnd.random() < 0.15:
                        inset += rnd.uniform(0.05, 0.12)                    # a corner knocked off
                elif h == 1:
                    inset += rnd.uniform(-0.03, 0.035)                      # the face bellied or hollow
                if abs(k - flake) <= 1 and h >= 1:
                    inset += rnd.uniform(0.06, 0.13)
                s = max(0.4, (L * sh - inset) / L)
                xr, yr = (x * ct - y * st_) * s, (x * st_ + y * ct) * s
                zz_ = zz
                if top and h == 2 and broken > 0:
                    # broken where a drum parted at its cross-joint (Derek: no slanted wedges, "doesn't make any
                    # sense"): the top stays level, its rim chipped back and a corner or two knocked off
                    xr, yr = xr * (1.0 - 0.08 * broken), yr * (1.0 - 0.08 * broken)
                    if corner and rnd.random() < 0.3 + 0.3 * broken:
                        s2 = 1.0 - rnd.uniform(0.06, 0.14)                 # a corner knocked off: chipped back level,
                        xr, yr = xr * s2, yr * s2                           # never dropped (a dropped corner tilts the top)
                if h == 2 and not top:
                    zz_ -= rnd.uniform(0.0, 0.03)                           # the joint opens unevenly
                if h == 1:
                    zz_ += rnd.uniform(-0.012, 0.012)
                ring.append((cx0 + xr + ox, cy0 + yr + oy, zz_))
            rings.append(ring)
        base = len(verts)
        for ring in rings:
            verts.extend(ring)
        for h in range(2):
            for k in range(m):
                a, b = base + h * m + k, base + h * m + (k + 1) % m
                faces.append((a, b, b + m, a + m))
        faces.append(tuple(range(base, base + m))[::-1])
        # the drum's top: a ball, a socket, or the column's own top
        ci = len(verts)
        if top:
            # the column's own top: a joint face, gently domed or cupped (ball and socket), cupped deeper to hold blood
            dzc = -cup if cup > 0 else rnd.uniform(-0.006, 0.01)          # near flat: a top facet-fanned to a raised
                                                                          # centre shades as a pyramid of wedges
        else:
            dzc = rnd.choice((-1, 1)) * rnd.uniform(0.02, 0.06)
        tz = sum(v[2] for v in rings[2]) / m
        verts.append((cx0 + ox, cy0 + oy, tz + dzc))
        for k in range(m):
            a, b = base + 2 * m + k, base + 2 * m + (k + 1) % m
            faces.append((a, b, ci))
        z = zt
    if not build:
        return verts, faces
    return P.poly(name, verts, faces, mat)


def chunk(name, c, size, mat, seed=0, flat=0.6, tilt=0.6):
    """a fallen piece of basalt as the real ones fall (Derek: no wedges): a whole drum, five to seven sided, parted from
    its column at the joints, lying on its side or standing as it landed, settled into what it lies on; a thin slab
    (flat < 0.3) lies flat. Never tipped at a random slant"""
    rnd = random.Random((zlib.crc32(name.encode()) & 0xFFFFF) + seed)
    k = rnd.randint(5, 7)
    pts = []
    for i in range(k):
        a = 2 * math.pi * i / k + rnd.uniform(-0.2, 0.2)
        r = size * rnd.uniform(0.85, 1.05)
        pts.append((math.cos(a) * r, math.sin(a) * r))
    slab = flat < 0.3
    h = size * (rnd.uniform(0.3, 0.5) if slab else rnd.uniform(1.1, 2.0))
    v, f = rough_prism(name, pts, 0.0, h, mat, seed, age=0.8, drum=(h + 1, h + 2), build=False)
    lying = (not slab) and rnd.random() < 0.6
    ax = (math.pi / 2 + rnd.uniform(-0.06, 0.06)) if lying else rnd.uniform(-0.05, 0.05)
    az = rnd.uniform(0, 6.28)
    out = []
    for (x, y, z) in v:
        z -= h * 0.5
        y, z = y * math.cos(ax) - z * math.sin(ax), y * math.sin(ax) + z * math.cos(ax)
        x, y = x * math.cos(az) - y * math.sin(az), x * math.sin(az) + y * math.cos(az)
        rest = size * 0.92 if lying else h * 0.5
        out.append((c[0] + x, c[1] + y, c[2] + z + rest - 0.06))
    return P.poly(name, out, f, mat)


def cliffs_v2():
    """the black cliffs remade with the cave's basalt (report 07; Derek graded the hex cliffs D+: "too clean and
    regular ... the talus is a row of tidy hexagonal stubs"): columns of every girth from one power diagram in the
    shore's own coordinates, rough drums worn and flaked, the wall breaking at its foot into stumps of every height, a
    real talus of fallen drums and breakdown on the sand, columns cut down by the sea where they stand in the surf"""
    def radius(s_, t_):
        x, y = S.xy(s_, t_)
        d = face_dist(x, y)
        thick = 0.5 + 0.5 * math.sin(s_ * 0.21 + 1.3) * math.cos(t_ * 0.17)
        r = 0.32 + 0.55 * thick ** 1.3 + (_h(int(s_ * 3), int(t_ * 3), 31) - 0.5) * 0.12
        return r * (1.15 if d > 2.0 else 1.0)                     # the high wall's colonnade thicker
    def keep(s_, t_):
        x, y = S.xy(s_, t_)
        d = face_dist(x, y)
        return -0.5 < d < 7.0
    pts = seeds(28.0, 84.0, -12.0, 30.0, radius, keep, seed=21)
    made = 0
    rnd = random.Random(5)
    for k, (cs_, ct_), r, poly in cells(pts):
        cx_, cy_ = S.xy(cs_, ct_)
        kk = _h(k, 7, 5)
        hgt = column_height(cs_, ct_, kk, cx_, cy_)
        if hgt <= 0.0:
            continue
        xy = [S.xy(a, b) for a, b in poly]
        g = float(SF.height(np.array([cx_]), np.array([cy_]))[0])
        d = face_dist(cx_, cy_)
        lean = ((_h(k, 1, 21) - 0.5) * 0.025, (_h(k, 2, 22) - 0.5) * 0.025)
        age = 0.45 + 0.45 * _h(k, 3, 7)
        cup = 0.06 if (hgt < 3.0 and _h(k, 4, 6) < 0.5) else 0.0
        broken = 0.0 if (cup or hgt > 15) else (_h(k, 5, 24) * 0.8 if _h(k, 6, 25) < 0.75 else 0.0)
        if hgt > 15 and _h(k, 8, 26) < 0.1:
            hgt = 3.0 + _h(k, 9, 27) * 8.0                             # a column fallen out of the wall: a recess
            broken = 0.7
        z0 = min(g, 0.0) - 1.5
        z1 = max(g, 0.0) + hgt
        if z1 - z0 > 9.0:
            # the high wall: the colonnade below, the entablature's thin crooked columns above it
            split = z0 + 6.0 + _h(k, 10, 28) * 4.0
            rough_prism("cw%d" % k, xy, z0, split, "basalt", k, 0.0, 0.0, lean, age, drum=(1.4, 3.4))
            r2 = random.Random(k)
            subs = [xy]
            for _ in range(2):
                nxt = []
                for p in subs:
                    cxp = sum(q[0] for q in p) / len(p)
                    cyp = sum(q[1] for q in p) / len(p)
                    a = r2.uniform(0, math.pi)
                    for sgn in (1, -1):
                        h_ = _clip(p, cxp, cyp, sgn * math.cos(a), sgn * math.sin(a))
                        if len(h_) >= 3:
                            nxt.append(h_)
                subs = nxt
            for q, sub in enumerate(subs):
                rough_prism("ce%d_%d" % (k, q), sub, split, z1 - r2.uniform(0, 2.5), "basalt", k * 7 + q, 0.0, 0.0,
                            ((r2.random() - 0.5) * 0.06, (r2.random() - 0.5) * 0.06), 0.4, drum=(0.4, 0.9))
        else:
            rough_prism("cs%d" % k, xy, z0, z1, "basalt", k, cup, broken, lean, age, drum=(0.5, 1.6))
        made += 1
        if cup and cs_ > 55:
            z = z1 - 0.05
            P.poly("cuppool%d" % k, [(x, y, z) for x, y in xy][::-1], [tuple(range(len(xy)))], "blood")
        # breakdown at the foot of the high wall: fallen drums and broken blocks on the sand
        if 0.0 < d < 2.5 and rnd.random() < 0.5:
            for q in range(rnd.randint(1, 3)):
                fx_, fy_ = cx_ + rnd.uniform(-1.5, 1.5), cy_ + rnd.uniform(0.6, 3.0)
                if face_dist(fx_, fy_) > -0.2:
                    continue
                gg = float(SF.height(np.array([fx_]), np.array([fy_]))[0])
                chunk("cb%d_%d" % (k, q), (fx_, fy_, gg), rnd.uniform(0.18, 0.55), "basalt", k * 3 + q)
    return made
