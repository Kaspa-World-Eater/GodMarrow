"""Ground painted where it lies (landkit). Derek 2026-10-07: "tiles look terrible and reused, rule was every piece
unique and a work of art".

So no ground is a stamped tile. Every surface here is painted from its own world position: the same call at another
place on the map gives other ground, never a repeat. The ground is a generator the game calls for each map (per chunk,
by world coordinates), not a picture copied across the floor.

  ash(px, py, seed)                        -> albedo          the Moor's ash: drifts, crusted plates, cinders, bone grit
  flags(qa, qp, px, py, seed)              -> albedo, height  laid flagstones, each stone its own (size, tone, tilt, chips,
                                                              cracks, sunk or lifted or gone), ash in the joints
  flesh(px, py, seed, moon)                -> albedo, wet     the god's skin breaking through: lumps, creases, veins,
                                                              bruise and rot, a wet sheen on the swollen tops
"""
import numpy as np
from kit import vn, fbm


def h1(i, j, s=0):
    """a hash of integer cells to [0, 1)"""
    i = np.asarray(i, np.int64)
    j = np.asarray(j, np.int64)
    h = (i * 374761393 + j * 668265263 + s * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0x1000000)


def cells(x, y, size, seed=0, jit=0.85):
    """worley cells: distance to the nearest and second-nearest point, the nearest's id and centre"""
    gx, gy = x / size, y / size
    ix, iy = np.floor(gx).astype(np.int64), np.floor(gy).astype(np.int64)
    f1 = np.full(x.shape, 9.0)
    f2 = np.full(x.shape, 9.0)
    cid = np.zeros(x.shape, np.int64)
    cx = np.zeros(x.shape)
    cy = np.zeros(x.shape)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            ax, ay = ix + dx, iy + dy
            px_ = ax + 0.5 + (h1(ax, ay, seed) - 0.5) * jit
            py_ = ay + 0.5 + (h1(ax, ay, seed + 7) - 0.5) * jit
            d = np.hypot(gx - px_, gy - py_)
            nearer = d < f1
            f2 = np.where(nearer, f1, np.minimum(f2, d))
            f1 = np.where(nearer, d, f1)
            cid = np.where(nearer, ax * 73856093 ^ ay * 19349663, cid)
            cx = np.where(nearer, px_ * size, cx)
            cy = np.where(nearer, py_ * size, cy)
    return f1 * size, f2 * size, cid, cx, cy


def _mix(a, b, t):
    return a * (1 - t[..., None]) + b * t[..., None]


ASH_COOL = np.array([0.27, 0.27, 0.29])
ASH_WARM = np.array([0.33, 0.31, 0.29])
ASH_DARK = np.array([0.14, 0.13, 0.13])
ASH_PALE = np.array([0.44, 0.43, 0.41])


def ash(px, py, seed=0):
    """the Moor's ash: broad drifts banked by the wind, crusted plates cracking where it has dried, cinders and grit of
    bone; quiet as a whole (open ground stays quiet), alive up close"""
    w = np.array([0.94, 0.34])                                           # the wind's run across the Moor
    al = px * w[0] + py * w[1]
    ac = -px * w[1] + py * w[0]
    broad = fbm(px * 0.11 + seed, py * 0.11)                              # the big pools of tone
    col = _mix(ASH_COOL, ASH_WARM, np.clip(broad * 1.6 - 0.3, 0, 1))
    ml = np.array([-0.94, 0.34])                                         # toward the moon on the ground (world -x, a little +y)

    def surf(x, y):
        a1 = x * w[0] + y * w[1]
        c1 = -x * w[1] + y * w[0]
        big = vn(a1 * 0.3 + seed * 3, c1 * 1.4) * 0.6 + vn(a1 * 0.7 + 9, c1 * 3.0) * 0.25
        rip = np.sin(c1 * 8 + vn(a1 * 0.6, c1 * 0.6) * 5) * 0.035 * (vn(x * 0.3 + 11, y * 0.3) > 0.5)
        return big + rip
    hgt = surf(px, py)
    slope = (hgt - surf(px + ml[0] * 0.08, py + ml[1] * 0.08)) / 0.08     # >0: falling toward the moon = facing it
    lit_ = np.clip(0.5 + slope * 1.6, 0, 1)
    col = col * (0.78 + lit_[..., None] * 0.4)
    crest = slope > 0.22
    col = np.where(crest[..., None], col * 1.08, col)                   # the lit crests of the drifts
    drift = hgt
    ripple = np.sin(ac * 9 + vn(al * 0.6, ac * 0.6) * 5)                  # wind ripples, faint, only on the soft drift
    soft = vn(px * 0.3 + 11, py * 0.3) > 0.5
    # crust: plates of dried ash, cracked; only where it has crusted
    wx = px + (fbm(px * 0.9 + 3, py * 0.9) - 0.5) * 0.9                  # warped, so no lattice shows
    wy = py + (fbm(px * 0.9, py * 0.9 + 8) - 0.5) * 0.9
    f1, f2, cid, _, _ = cells(wx, wy, 0.55 + vn(px * 0.2, py * 0.2) * 0.5, seed + 31, 1.0)
    crusted = (fbm(px * 0.25 + 40, py * 0.25) > 0.6) & ~soft
    plate = (h1(cid, 3, seed) - 0.5) * 0.12
    col = np.where(crusted[..., None], col * (1 + plate[..., None]), col)
    crack = crusted & ((f2 - f1) < 0.012 + vn(px * 7, py * 7) * 0.022) & (vn(px * 2.3, py * 2.3) > 0.25)
    col = np.where(crack[..., None], _mix(col, ASH_DARK, np.full(px.shape, 0.75)), col)
    lip = crusted & ((f2 - f1) >= 0.035) & ((f2 - f1) < 0.07)
    col = np.where(lip[..., None], col * 1.08, col)                      # the plate's lifted lip, catching light
    # grit: cinders (dark, a few), bone (pale, rarer); each speck its own
    g1, _, gid, _, _ = cells(px, py, 0.16, seed + 77, 1.0)
    r = h1(gid, 1, seed)
    cinder = (r < 0.018) & (g1 < 0.02 + h1(gid, 2, seed) * 0.02)
    bone = (r > 0.985) & (g1 < 0.03)
    col = np.where(cinder[..., None], ASH_DARK * 0.8, col)
    col = np.where(bone[..., None], ASH_PALE * 1.25, col)
    grain = (vn(px * 23 + seed, py * 23) - 0.5) * 0.07                   # the paper's tooth, fixed to the world
    return np.clip(col * (1 + grain[..., None]), 0, 1)


STONE = np.array([0.35, 0.33, 0.31])
STONE_B = np.array([0.31, 0.31, 0.33])                                    # a bluer bed of the same stone


def _bounds(n, lo, hi, seed, base, var):
    """irregular widths laid end to end from lo"""
    rr = np.random.default_rng(seed)
    b = [lo]
    while b[-1] < hi:
        b.append(b[-1] + base * (1 + rr.uniform(-var, var)))
    return np.array(b)


STONE_FAMILY = np.array([[0.38, 0.345, 0.3], [0.33, 0.325, 0.33], [0.37, 0.315, 0.27], [0.35, 0.33, 0.31]])   # buff, grey, rusted, plain
LICHEN = np.array([0.43, 0.44, 0.39])


def _layout(qa, qp, seed):
    """where each slab lies: wandering courses of random-rectangular paving, every slab its own size"""
    qa = qa + (fbm(qp * 0.12 + seed, 3.3) - 0.5) * 1.4                   # the courses wander as they were laid by hand
    qp = qp + (fbm(qa * 0.2 + seed, 7.7) - 0.5) * 0.5
    rows = _bounds(0, -30, 60, seed + 5, 1.3, 0.35)
    ri = np.clip(np.searchsorted(rows, qa) - 1, 0, len(rows) - 2)
    r0, r1 = rows[ri], rows[ri + 1]
    va = (qa - r0) / (r1 - r0)
    off = h1(ri, 9, seed) * 1.7
    length = 1.5 + h1(ri, 4, seed) * 0.9
    sq = (qp + off) / length
    si = np.floor(sq).astype(np.int64)
    fr = sq - si
    left = fr < (h1(ri, si, seed + 2) - 0.5) * 0.5
    si = np.where(left, si - 1, si)
    fr = np.where(left, fr + 1, fr)
    past = fr > 1 + (h1(ri, si + 1, seed + 2) - 0.5) * 0.5
    si = np.where(past, si + 1, si)
    fr = np.where(past, fr - 1, fr)
    lo = (h1(ri, si, seed + 2) - 0.5) * 0.5
    hi = 1 + (h1(ri, si + 1, seed + 2) - 0.5) * 0.5
    vb = (fr - lo) / (hi - lo)
    A = r1 - r0
    B = (hi - lo) * length
    return dict(sid=ri * 1009 + si, va=va, vb=vb, A=A, B=B)


def _stone(qa, qp, px, py, seed, heave, path):
    """one slab's real surface, in yards: settled, tipped, its arrises rounded where feet went and sharp elsewhere,
    dished by wear, spalled, cracked with the pieces offset; the joint below it all"""
    L = _layout(qa, qp, seed)
    sid, va, vb, A, B = L["sid"], L["va"], L["vb"], L["A"], L["B"]
    fate = h1(sid, 15, seed)
    sunk = (fate > 0.88) & (fate < 0.955)
    gone = fate >= 0.955
    hv = np.zeros(qa.shape) if heave is None else heave
    settle = (h1(sid, 30, seed) - 0.5) * 0.06 - sunk * 0.05 + hv * h1(sid, 31, seed) * 0.16
    ta = (h1(sid, 13, seed) - 0.5) * 0.05 + np.sign(h1(sid, 13, seed) - 0.5) * hv * 0.12
    tb = (h1(sid, 14, seed) - 0.5) * 0.05 + np.sign(h1(sid, 14, seed) - 0.5) * hv * 0.12
    h = settle + ta * (va - 0.5) * A + tb * (vb - 0.5) * B
    ea, eb = A * np.minimum(va, 1 - va), B * np.minimum(vb, 1 - vb)
    ed = np.minimum(ea, eb) + (vn(px * 9 + seed, py * 9) - 0.5) * 0.025
    gap = 0.022 + h1(sid, 16, seed) * 0.03 + hv * 0.04
    # corner bites
    for k, (ca, cb) in enumerate(((0, 0), (0, 1), (1, 0), (1, 1))):
        bite = h1(sid, 20 + k, seed) ** 3 * 0.28
        ed = np.minimum(ed, (A * np.abs(va - ca) + B * np.abs(vb - cb)) * 0.8 - bite + gap * (bite > 0.01) * 0 + 0.0 * k
                        + np.where(bite > 0.02, 0.0, 9.0))
    rr_ = 0.025 + path * 0.07                                            # arrises: round on the path, sharp off it
    h = h - np.clip(1 - (ed - gap) / rr_, 0, 1) ** 2 * rr_ * 0.55
    rad2 = ((va - 0.5) * 2) ** 2 + ((vb - 0.5) * 2) ** 2
    dish = path * 0.035 * np.clip(1 - rad2 * 0.8, 0, 1)
    h = h - dish
    # spalls: shallow scalloped hollows with sharp rims
    spall = np.zeros(qa.shape, bool)
    for k in range(2):
        on = h1(sid, 40 + k, seed) > 0.55
        cu, cv = h1(sid, 42 + k, seed), h1(sid, 44 + k, seed)
        r = 0.07 + h1(sid, 46 + k, seed) * 0.16
        d = np.hypot((va - cu) * A, (vb - cv) * B) + (vn(px * 14 + k * 7, py * 14) - 0.5) * 0.05
        inside = on & (d < r)
        h = h - np.where(inside, 0.014 * np.clip((r - d) / 0.025, 0, 1), 0)
        spall |= inside
    # a crack across the short span (more of them where the flesh heaves), the far piece dropped
    ck = h1(sid, 17, seed) < 0.3 + hv * 0.6
    long_a = A > B
    u_ = np.where(long_a, va, vb)
    w_ = np.where(long_a, vb, va)
    cpos = 0.25 + h1(sid, 18, seed) * 0.5 + (vn(w_ * 3 + h1(sid, 19, seed) * 50, 0.5) - 0.5) * 0.3
    span = np.where(long_a, A, B)
    cd = (u_ - cpos) * span
    crack = ck & (np.abs(cd) < 0.012)
    h = h - np.where(ck & (cd > 0), 0.01 + hv * 0.03, 0) - np.where(crack, 0.03, 0)
    joint = ed < gap
    h = np.where(joint, -0.07, h)
    h = np.where(gone, -0.05 + (vn(px * 2, py * 2) - 0.5) * 0.02, h)
    return h, dict(L, ed=ed, gap=gap, joint=joint, gone=gone, sunk=sunk, spall=spall, crack=crack, ck=ck, cd=cd,
                   dish=dish, settle=settle)


def flags(qa, qp, px, py, seed=0, heave=None, moon=np.array([-0.62, 0.22, 0.75])):
    """old paving, built as real form (STUDY.md round 14): each slab its own height (settled, tipped, the proud edge
    against its neighbour), arrises rounded where feet went and sharp elsewhere, dished by wear with water lying in the
    dishes, spalls with sharp rims and paler stone inside, cracks with the pieces offset; lit through its own normals.
    Its colour set by the same causes: its bed (buff, grey, rusted) with bedding lines, paler and smoother on the path,
    tooled off it, darker and glinting where wet, grime at the low edges, lichen rosettes on the high dry stones, dark
    ash in the joints. Returns colour (already lit by the moon on its small forms), height, joints."""
    path = np.clip((fbm(px * 0.3 + 7, py * 0.3) - 0.45) * 4, 0, 1)        # where feet went, long ago
    e = 0.025
    h, I = _stone(qa, qp, px, py, seed, heave, path)
    hx, _ = _stone(qa + e, qp, px + e, py, seed, heave, path)
    hy, _ = _stone(qa, qp + e, px, py + e, seed, heave, path)
    n = np.dstack([-(hx - h) / e, -(hy - h) / e, np.ones(h.shape)])
    n = n / np.linalg.norm(n, axis=2, keepdims=True)
    flat = max(float(moon[2]), 0.1)
    ndl = np.clip((n * moon).sum(2), 0, 1)
    shade = np.clip((0.3 + ndl) / (0.3 + flat), 0.35, 1.7)
    sid, va, vb, A, B = I["sid"], I["va"], I["vb"], I["A"], I["B"]
    fam = STONE_FAMILY[(h1(sid, 11, seed) * 4).astype(int) % 4]
    col = fam * (0.82 + h1(sid, 12, seed)[..., None] * 0.3)
    ang = h1(sid, 33, seed) * np.pi
    bedc = (va * A * np.cos(ang) + vb * B * np.sin(ang))
    bedl = np.sin(bedc * (9 + h1(sid, 34, seed) * 10) + vn(bedc * 2, h1(sid, 35, seed) * 9) * 3)
    col = col * (1 + bedl[..., None] * 0.035)                             # bedding lines across the slab
    rust = (h1(sid, 11, seed) * 4).astype(int) % 4 == 2
    col = np.where((rust & (bedl > 0.6))[..., None], col * np.array([1.06, 0.96, 0.86]), col)
    col = col * (1 + path[..., None] * 0.09)                             # worn paler on the path
    tool = (path < 0.2) & (h1(sid, 36, seed) > 0.45) & (np.sin((va * A + vb * B) * 55) > 0.82)
    col = np.where(tool[..., None], col * 0.93, col)                     # tooling, surviving off the path
    col = np.where(I["spall"][..., None], col * 1.12 + 0.01, col)       # fresh stone in the spalls
    low = np.clip(1 - (I["ed"] - I["gap"]) / 0.14, 0, 1) * (I["settle"] < 0)
    col = col * (1 - low[..., None] * np.array([0.25, 0.28, 0.3]))       # grime gathered at the low edges
    lich = (I["settle"] > 0.01) & (path < 0.15) & (h1(sid, 37, seed) > 0.6)
    lc = cells(px, py, 0.35, seed + 50, 1.0)
    rosette = lich & (lc[0] < 0.04 + h1(lc[2], 1, seed) * 0.06) & (h1(lc[2], 2, seed) > 0.5)
    col = np.where(rosette[..., None], _mix(col, LICHEN, np.where(lc[0] < 0.02, 0.4, 0.75)), col)
    wet = (I["dish"] > 0.02) & (fbm(px * 0.8 + 3, py * 0.8) > 0.5)
    col = np.where(wet[..., None], col * 0.68, col)                     # water lying in the dishes
    grain = (vn(px * 26 + seed, py * 26) - 0.5) * 0.05 * (1 - path)
    col = col * (1 + grain[..., None]) * shade[..., None]
    hv_ = (n + np.array([0.7, 0.7, 0.6])) / 1.0
    hv_ = (moon + np.array([0.62, 0.62, 0.48]))
    hv_ = hv_ / np.linalg.norm(hv_)
    spec = np.clip((n * hv_).sum(2), 0, 1) ** 60
    col = col + np.where(wet, spec * 0.35 + 0.02, spec * 0.03)[..., None] * np.array([0.8, 0.85, 0.95])
    cr = I["crack"]
    col = np.where(cr[..., None], col * 0.3, col)
    a_ = ash(px, py, seed + 3)
    col = np.where(I["sunk"][..., None], _mix(col, a_, np.clip(vn(px * 3, py * 3) * 1.2 - 0.2, 0, 1)), col)
    col = np.where(I["gone"][..., None], a_ * 0.8, col)
    jd = np.clip(1 - I["ed"] / np.maximum(I["gap"], 1e-3), 0, 1)
    jc = _mix(a_ * 0.55, ASH_DARK * 0.55, jd)
    col = np.where((I["joint"] & ~I["gone"])[..., None], jc, col)
    return np.clip(col, 0, 1), h, I["joint"] & ~I["gone"]


BASALT = np.array([0.24, 0.24, 0.255])          # Vesuvian lava, fresh (#3c3d3f-#55534f)
BASALT_POL = np.array([0.4, 0.41, 0.44])        # polished by feet, bluer (#6a6c70)
BASALT_RIND = np.array([0.3, 0.26, 0.22])       # the old weathered rind, warm
FINES = np.array([0.5, 0.49, 0.47])             # pale ash fines packed in the joints


def _poly(px, py, seed, heave, path):
    """the polygon paving's height (chapter 2, Pompeii): irregular 4-7 sided stones 0.45-1 yd, fitted tight, each
    pillowed by wear with its arrises rounded, settled its own way, tipped and lifted by the flesh pushing under"""
    wx = px + (vn(px * 0.9 + seed, py * 0.9) - 0.5) * 0.35                # warped so no lattice shows
    wy = py + (vn(px * 0.9, py * 0.9 + seed + 4) - 0.5) * 0.35
    f1, f2, cid, cx, cy = cells(wx, wy, 0.78, seed + 61, 1.0)
    ed = (f2 - f1) * 0.5                                                   # yards to the stone's edge
    gap = 0.008 + h1(cid, 3, seed) * 0.01 + heave * 0.06
    rr_ = 0.05 + path * 0.05                                              # rounder on the processional way
    pillow = np.clip((ed - gap) / rr_, 0, 1)
    pillow = pillow * pillow * (3 - 2 * pillow)
    h = pillow * (0.035 + path * 0.015)
    settle = (h1(cid, 4, seed) - 0.5) * 0.04 + heave * h1(cid, 5, seed) * 0.18
    ta = (h1(cid, 6, seed) - 0.5) * 0.04 + np.sign(h1(cid, 6, seed) - 0.5) * heave * 0.22
    tb = (h1(cid, 7, seed) - 0.5) * 0.04 + np.sign(h1(cid, 7, seed) - 0.5) * heave * 0.22
    h = h + settle + ta * (wx - cx) + tb * (wy - cy)
    joint = ed < gap
    h = np.where(joint, -0.05, h)
    return h, dict(ed=ed, gap=gap, cid=cid, joint=joint, settle=settle, f1=f1)


def paving_poly(px, py, seed=0, heave=None, path=None, moon=np.array([-0.62, 0.22, 0.75])):
    """dark basalt polygon paving, built from chapter 2: pillowed stones, hairline joints packed with pale ash, the old
    processional way polished paler and bluer and catching the moon, the weathered rind warm on stones off the way,
    sparse vesicle pits, rare lichen on the high dry stones; where the flesh heaves under, the stones lift and tip
    and the joints open. Lit through its own normals. Returns colour, height, joints."""
    hv = np.zeros(px.shape) if heave is None else heave
    pth = np.zeros(px.shape) if path is None else path
    e = 0.025
    h, I = _poly(px, py, seed, hv, pth)
    hx, _ = _poly(px + e, py, seed, hv, pth)
    hy, _ = _poly(px, py + e, seed, hv, pth)
    n = np.dstack([-(hx - h) / e, -(hy - h) / e, np.ones(h.shape)])
    n = n / np.linalg.norm(n, axis=2, keepdims=True)
    ndl = np.clip((n * moon).sum(2), 0, 1)
    shade = np.clip((0.25 + ndl) / (0.25 + max(float(moon[2]), 0.1)), 0.3, 1.8)
    cid = I["cid"]
    tone = 0.85 + h1(cid, 8, seed) * 0.3
    col = BASALT * tone[..., None]
    rind = (1 - pth) * np.clip(1 - I["ed"] / 0.12, 0, 1) * 0.6 + (1 - pth) * 0.25
    col = _mix(col, BASALT_RIND * tone[..., None], np.clip(rind * (h1(cid, 9, seed) > 0.3), 0, 1))
    col = _mix(col, BASALT_POL, np.clip(pth * (0.5 + 0.5 * np.clip(I["ed"] / 0.2, 0, 1)), 0, 1))   # polished most in the middle
    ves = (vn(px * 40 + seed, py * 40) > 0.83) & (pth < 0.6)
    col = np.where(ves[..., None], col * 0.7, col)                       # vesicles, gas holes in the lava
    lc = cells(px, py, 0.3, seed + 70, 1.0)
    lich = (pth < 0.1) & (I["settle"] > 0.0) & (h1(cid, 10, seed) > 0.75) & (lc[0] < 0.035 + h1(lc[2], 1, seed) * 0.05) & (h1(lc[2], 2, seed) > 0.6)
    col = np.where(lich[..., None], _mix(col, np.array([0.46, 0.47, 0.42]), np.full(px.shape, 0.7)), col)
    grain = (vn(px * 24 + seed, py * 24) - 0.5) * 0.06 * (1 - pth)
    col = col * (1 + grain[..., None]) * shade[..., None]
    hm = moon + np.array([0.62, 0.62, 0.48])
    hm = hm / np.linalg.norm(hm)
    spec = np.clip((n * hm).sum(2), 0, 1) ** 40
    col = col + (spec * (0.04 + pth * 0.3))[..., None] * np.array([0.75, 0.8, 0.95])   # the polish catching the moon
    a_ = ash(px, py, seed + 3)
    deep = np.clip(1 - I["ed"] / np.maximum(I["gap"], 1e-3), 0, 1)
    jc = _mix(FINES * (0.8 + vn(px * 9, py * 9)[..., None] * 0.3), a_ * 0.5, deep * 0.4 + hv * 0.6)   # pale fines, darker where opened
    col = np.where(I["joint"][..., None], jc, col)
    return np.clip(col, 0, 1), h, I["joint"]


SKIN = np.array([0.36, 0.12, 0.14])
RAW = np.array([0.5, 0.2, 0.22])
BRUISE = np.array([0.22, 0.09, 0.17])
ROT = np.array([0.38, 0.34, 0.17])
CREASE = np.array([0.1, 0.02, 0.04])
VEIN = np.array([0.2, 0.05, 0.13])


def flesh(px, py, seed=0, moon=np.array([-0.62, 0.22, 0.75])):
    """the god's skin breaking through the ash: swollen lumps of every size, deep creases between the larger folds,
    veins netting it, bruised and rotting in patches; the tops of the swellings wet and shining. Returns the albedo
    and a wet mask (where the caller adds the sheen)."""
    # the broad colouring: raw, bruised, rotting, by place
    b = fbm(px * 0.2 + seed, py * 0.2)
    r = fbm(px * 0.35 + 20, py * 0.35 + seed)
    col = _mix(SKIN, RAW, np.clip((b - 0.45) * 3, 0, 1))
    col = _mix(col, BRUISE, np.clip((0.42 - b) * 4, 0, 1))
    col = _mix(col, ROT, np.clip((r - 0.6) * 4, 0, 0.8))
    # the lumps: each a small dome, lit from the moon's side
    f1, f2, cid, cx, cy = cells(px, py, 0.5 + vn(px * 0.3, py * 0.3) * 0.3, seed + 3, 0.9)
    rad = (f1 + f2) * 0.5 + 1e-4
    t = np.clip(f1 / rad, 0, 1)
    dome = np.sqrt(np.clip(1 - t * t, 0, 1))
    nx, ny = (px - cx) / rad, (py - cy) / rad
    lit = np.clip(nx * moon[0] + ny * moon[1] + dome * moon[2], 0, 1)
    col = col * (0.62 + lit[..., None] * 0.55) * (0.9 + h1(cid, 5, seed)[..., None] * 0.2)
    seam = (f2 - f1) < 0.03
    col = np.where(seam[..., None], col * 0.6, col)
    # the larger folds: deep creases
    g1, g2, _, _, _ = cells(px, py, 1.5, seed + 9, 0.95)
    deep = (g2 - g1) < 0.07 + vn(px * 3, py * 3) * 0.05
    col = np.where(deep[..., None], _mix(col, CREASE, np.clip(1 - (g2 - g1) / 0.12, 0, 1)), col)
    # the veins: two nets, coarse and fine, raised a little (a pale edge on the lit side)
    for sc, wd in ((0.55, 0.03), (1.6, 0.016)):
        q = vn(px * sc + seed * 2, py * sc) - 0.5
        q2 = vn(px * sc * 0.6 + 77, py * sc * 0.6) - 0.5
        ln = (np.abs(q) < wd) & (q2 > -0.1)
        col = np.where(ln[..., None], _mix(col, VEIN, np.full(px.shape, 0.7)), col)
    # pores and weeping spots
    p1, _, pid, _, _ = cells(px, py, 0.2, seed + 13, 1.0)
    pore = (h1(pid, 2, seed) < 0.08) & (p1 < 0.016)
    col = np.where(pore[..., None], CREASE, col)
    weep = (h1(pid, 3, seed) > 0.96) & (p1 < 0.05)
    col = np.where(weep[..., None], ROT * 1.4, col)
    wet = (dome > 0.82) & (lit > 0.78) & (vn(px * 3 + seed, py * 3) > 0.45)
    return np.clip(col, 0, 1), wet
