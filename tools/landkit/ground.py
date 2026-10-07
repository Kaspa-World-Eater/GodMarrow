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
    drift = vn(al * 0.35 + seed * 3, ac * 2.2)                            # drifts: long, banked along the wind
    col = col * (0.88 + drift[..., None] * 0.2)
    ripple = np.sin(ac * 9 + vn(al * 0.6, ac * 0.6) * 5)                  # wind ripples, faint, only on the soft drift
    soft = vn(px * 0.3 + 11, py * 0.3) > 0.5
    col = np.where((soft & (ripple > 0.7))[..., None], col * 1.06, col)
    col = np.where((soft & (ripple < -0.8))[..., None], col * 0.93, col)
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
    cinder = (r < 0.07) & (g1 < 0.02 + h1(gid, 2, seed) * 0.025)
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


def flags(qa, qp, px, py, seed=0):
    """flagstones laid in courses across the courtyard: each course its own depth, each stone its own length, tone,
    tilt; the corners chipped, some cracked across, some sunk and filled with ash, a few gone; ash and grime packed in
    the joints; the stones worn round at their edges. Returns the albedo and each stone's small rise (for the
    caller's light)."""
    qa = qa + (fbm(qp * 0.12 + seed, 3.3) - 0.5) * 1.4                   # the courses wander as they were laid by hand
    qp = qp + (fbm(qa * 0.2 + seed, 7.7) - 0.5) * 0.5
    rows = _bounds(0, -30, 60, seed + 5, 1.3, 0.35)
    ri = np.clip(np.searchsorted(rows, qa) - 1, 0, len(rows) - 2)
    r0, r1 = rows[ri], rows[ri + 1]
    va = (qa - r0) / (r1 - r0)                                           # across the course 0..1
    # along the course: each course its own run of stone lengths, offset by its own amount
    off = h1(ri, 9, seed) * 1.7
    length = 1.5 + h1(ri, 4, seed) * 0.9
    sq = (qp + off) / length
    si = np.floor(sq).astype(np.int64)
    # stones vary in length: shift the joint by a per-joint amount
    jshift = (h1(ri, si, seed + 2) - 0.5) * 0.5
    fr = sq - si
    left = fr < jshift
    si = np.where(left, si - 1, si)
    fr = np.where(left, fr + 1, fr)
    jnext2 = (h1(ri, si + 1, seed + 2) - 0.5) * 0.5
    past = fr > 1 + jnext2
    si = np.where(past, si + 1, si)
    fr = np.where(past, fr - 1, fr)
    lo = (h1(ri, si, seed + 2) - 0.5) * 0.5
    hi = 1 + (h1(ri, si + 1, seed + 2) - 0.5) * 0.5
    vb = (fr - lo) / (hi - lo)                                           # along the stone 0..1
    sid = ri * 1009 + si
    # the stone's own make
    tone = 0.66 + h1(sid, 11, seed) * 0.42
    bed = h1(sid, 12, seed) > 0.7
    base = np.where(bed[..., None], STONE_B, STONE) * tone[..., None]
    tilt_a = (h1(sid, 13, seed) - 0.5) * 0.25
    tilt_b = (h1(sid, 14, seed) - 0.5) * 0.25
    rise = tilt_a * (va - 0.5) + tilt_b * (vb - 0.5)
    fate = h1(sid, 15, seed)
    sunk = (fate > 0.86) & (fate < 0.95)
    gone = fate >= 0.95
    # the joint: a gap at each edge, wider where the stones have shifted; the edges worn round
    wa = (r1 - r0) * np.minimum(va, 1 - va)                               # yards to the course's edge
    wb = (hi - lo) * length * np.minimum(vb, 1 - vb)                      # yards to the stone's end
    gap = 0.02 + h1(sid, 16, seed) * 0.03
    ed = np.minimum(wa, wb) + (vn(px * 6 + seed, py * 6) - 0.5) * 0.05   # ragged, worn edges
    # chipped corners: each corner its own bite
    cbite = np.zeros(qa.shape)
    for k, (ca, cb) in enumerate(((0, 0), (0, 1), (1, 0), (1, 1))):
        bite = h1(sid, 20 + k, seed) ** 3 * 0.32
        da = (r1 - r0) * np.abs(va - ca)
        db = (hi - lo) * length * np.abs(vb - cb)
        cbite = np.maximum(cbite, bite - (da + db) * 0.8 - (vn(qa * 9 + k, qp * 9) - 0.5) * 0.06)
    joint = (ed < gap) | (cbite > 0)
    col = base * (1 + rise[..., None] * 1.3)
    wear = np.clip(1 - (ed - gap) / 0.09, 0, 1)                          # rounded off at the edges: darker as it falls
    col = col * (1 - wear[..., None] * 0.22)
    # the surface: worn smooth in the middle, pitted, stained
    pit = vn(px * 14 + seed, py * 14) > 0.8
    col = np.where(pit[..., None], col * 0.84, col)
    stain = fbm(px * 0.6 + 50, py * 0.6) - 0.45
    col = col * (1 - np.clip(stain, 0, 0.3)[..., None] * np.array([0.5, 0.65, 0.7]))
    grain = (vn(px * 30 + seed, py * 30) - 0.5) * 0.08 + (vn(qa * 3 + 1, qp * 3) - 0.5) * 0.05
    col = col * (1 + grain[..., None])
    # cracks across some: a wandering line from edge to edge
    ck = h1(sid, 17, seed) > 0.62
    cpos = 0.25 + h1(sid, 18, seed) * 0.5 + (vn(vb * 4 + h1(sid, 19, seed) * 50, 0.5) - 0.5) * 0.35
    crack = ck & (np.abs(va - cpos) < 0.022 / np.maximum(r1 - r0, 0.3))
    col = np.where(crack[..., None], col * 0.42, col)
    # sunk: settled into the ash, ash blown over it; gone: only ash where it was
    a_ = ash(px, py, seed + 3)
    col = np.where(sunk[..., None], _mix(col * 0.8, a_, np.clip(vn(px * 3, py * 3) * 1.2 - 0.1, 0, 1)), col)
    col = np.where(gone[..., None], a_ * 0.82, col)
    jc = _mix(ASH_DARK * 1.2, a_ * 0.75, vn(px * 5, py * 5))
    col = np.where((joint & ~gone)[..., None], jc, col)
    height = np.where(joint | gone, -0.04, np.where(sunk, -0.03, rise * 0.1))
    return np.clip(col, 0, 1), height


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
