"""Fallen logs of the old wood, in their five decay classes (landkit; tools/art_study/ecosystems/old_growth_forest.md).

The brief (Maser's decay classes, as the scene taught them):
1 FRESH: bark tight and fissured with the grain, round, riding high on its own broken limbs; snapped limb stubs
  standing up along its back.
2 LOOSENING: bark loosening, small plates lifted to show pale wood; the twigs gone, a few round stubs left; sagging.
3 SLOUGHING: bark falling away in plates off grey wood split along its grain; settling into the ground; moss starting
  in strips along the top, following the grain.
4 SOFT: sunk and blocky, split into cubes; moss over most of it; pale brown wood showing at the cubical breaks;
  foxfire in the softest wood at night.
5 HUMP: a soft ridge of crumb under moss; only its shape says a tree lay here.
Every log ends in broken ends: a snapped end jagged and splintered, showing the pale inner wood; the far end tapering.
Form first (a height field: a round tapering body riding at its class's height, its ends broken), then the painted
light (the moon), then each material with its hue-shifted ramp.

Combat (tools/art_study/ecosystems/README.md, "Objects in combat"): cover to its top; material dead wood, dry
(classes 1-3, it burns) or wet (4-5, it smoulders); classes 3-5 can be broken.

  python tools/landkit/log.py OUT_DIR
"""
import sys
import numpy as np
from kit import Field, cast, normals, moon_shadow, ao, light, paint, rim, export, ramp, vn, fbm, B4, MOON

BARK = ramp("#120f15", "#211a1c", "#302622", "#41332b", "#544235", "#6a5541", "#83694f", "#9c8262")
DEAD = ramp("#17171c", "#26252b", "#38363b", "#4e4a4c", "#67615f", "#837b75", "#a19789")
WOOD = ramp("#1a1210", "#33221a", "#523826", "#735135", "#946c48", "#b48c62", "#cfa87a")
MOSS = ramp("#0b120f", "#121d14", "#1a2a18", "#24381c", "#304621", "#3e5427", "#4e632d", "#5f7234")
BARKM, WOODM, DEADM, MOSSM, ENDM = 1, 2, 3, 4, 5
RIDE = {1: 1.15, 2: 0.95, 3: 0.55, 4: 0.3, 5: 0.0}


def make(cls, seed, length=None, radius=None):
    rr = np.random.default_rng(seed)
    L = length or rr.uniform(3.5, 6.5)
    r0 = radius or rr.uniform(0.3, 0.55)
    F = Field(L / 2 + r0 + 0.4, res=0.025)
    X, Y = F.X, F.Y
    u = X / L + 0.5                                                       # 0 at the butt .. 1 at the far end
    taper = 1 - np.clip(u, 0, 1) * 0.35
    r = r0 * taper
    bend = np.sin(u * 2.4 + seed) * 0.08 * L / 5                           # a log is never quite straight
    d = np.abs(Y - bend)
    inside = (u >= 0) & (u <= 1)
    ride = RIDE[cls]
    if cls == 5:
        # a low mound that wanders: wider and higher here, slumped there; its ends dissolve into the floor
        wv = 1 + 0.22 * np.sin(u * 7.3 + seed) + (fbm(X * 0.9 + seed, Y * 0.2 + 3) - 0.5) * 0.5
        hv = 0.75 + 0.3 * np.sin(u * 4.1 + seed * 2) + (fbm(X * 1.3, Y * 0.3 + 9) - 0.5) * 0.4
        endf = np.clip(np.minimum(u, 1 - u) / 0.14, 0, 1) ** 0.6
        W5 = np.maximum(r * 1.5 * wv * (0.55 + 0.45 * endf), 1e-3)
        prof = np.clip(1 - (d / W5) ** 2, 0, 1)
        top = prof ** 0.8 * r * 0.5 * hv * endf
        top = top + (vn(X * 9 + seed, Y * 9) - 0.5) * 0.045 * prof              # moss cushions
        m = (u > -0.02) & (u < 1.02) & (top > 0.012)
    else:
        top = r * ride + np.sqrt(np.clip(r ** 2 - d ** 2, 0, None))
        if cls == 4:
            cube = ((np.sin(X * 9) > 0.9) | (np.sin(np.arcsin(np.clip((Y - bend) / np.maximum(r, 1e-3), -1, 1)) * 7) > 0.93))
            top = top - cube * r * 0.12 - (vn(X * 3, Y * 3) > 0.62) * r * 0.2
        m = inside & (d < r)
    # the broken butt end: jagged, splinters standing out of the break
    jag = (vn(Y * 14 + seed, 3) - 0.5) * 0.35 + (np.sin(Y * 40) > 0.6) * 0.12
    if cls < 5:
        m &= u > 0.0 + np.clip(jag, -0.02, 0.4) * (0.6 / L)
    # the far end: snapped too, a little less
    if cls < 5:
        m &= u < 1.0 - np.clip((vn(Y * 11 - seed, 7) - 0.5) * 0.25, -0.02, 0.3) * (0.6 / L)
    F.H = np.where(m, top, F.H)
    end_zone = m & ((u < 0.6 / L * 0.5 + 0.02) | (u > 1 - 0.6 / L * 0.5 - 0.02)) & (cls < 5)
    # broken limb stubs on the fresher logs: rising out of the top within its width (a height field cannot overhang)
    if cls <= 2:
        for t0 in rr.uniform(0.2, 0.85, 3 if cls == 1 else 2):
            side = rr.choice([-1, 1])
            sl = r0 * (1 - t0 * 0.35) * rr.uniform(0.16, 0.24)
            for k in range(12):
                f = k / 11
                off = r0 * (1 - t0 * 0.35) * (0.25 + f * 0.4) * side
                cx, cy = (t0 - 0.5) * L + f * 0.15, np.sin(t0 * 2.4 + seed) * 0.08 * L / 5 + off
                dd = np.hypot(X - cx, Y - cy)
                rl = r0 * (1 - t0 * 0.35)
                zz = rl * ride + np.sqrt(max(rl ** 2 - off ** 2, 0)) + f * (0.45 if cls == 1 else 0.3)
                mm = (dd < sl) & (zz + np.sqrt(np.clip(sl ** 2 - dd ** 2, 0, None)) > F.H)
                F.H = np.where(mm, zz + np.sqrt(np.clip(sl ** 2 - dd ** 2, 0, None)), F.H)
                F.M[mm] = WOODM if k == 11 else BARKM                     # the snapped tip pale
    base = {1: BARKM, 2: BARKM, 3: DEADM, 4: MOSSM, 5: MOSSM}[cls]
    F.M = np.where(m & (F.M == 0), base, F.M)
    F.M[end_zone] = ENDM
    return F, dict(L=L, r=r0, cls=cls, bend_seed=seed)


def render(F, info):
    cls = info["cls"]
    top = info["r"] * (RIDE[cls] + 1.0) + 0.6
    C = cast(F, top)
    n, side = normals(F, C, exag=1.0)
    sh = moon_shadow(F, C, n)
    a = ao(F, C)
    v = light(n, sh, a, side)
    mask = C["got"] & (C["pz"] > -0.05)
    M = F.at(F.M, C["px"], C["py"], 0)
    bay = B4[C["SY"].astype(int) % 4, C["SX"].astype(int) % 4]
    px, py, pz = C["px"], C["py"], C["pz"]
    L, r0 = info["L"], info["r"]
    u = px / L + 0.5
    rloc = np.maximum(r0 * (1 - np.clip(u, 0, 1) * 0.35), 1e-3)
    bend = np.sin(u * 2.4 + info["bend_seed"]) * 0.08 * L / 5
    around = np.arcsin(np.clip((py - bend) / rloc, -1, 1))
    arc, along = around * rloc, px
    zc = rloc * RIDE[cls]
    body = mask & (pz <= zc + rloc + 0.02) & (cls < 5) & (M != WOODM)
    phi = np.arctan2(pz - zc, py - bend)
    nb = np.dstack([np.zeros_like(phi), np.cos(phi), np.sin(phi)])
    n = np.where(body[..., None], nb, n)
    sh = moon_shadow(F, C, n)
    v = light(n, sh, a, side)
    v = np.where(body, v + np.clip(-np.sin(phi), 0, 1) * 0.05, v)            # light thrown back up off the ground underneath
    img = np.zeros(mask.shape + (3,))
    # bark, with the grain: long fissure cells running along the log, fine furrows, lit ridges, plates
    grain = vn(arc * 15.0 + along * 0.35, along * 1.6)
    fine = vn(arc * 34.0 + along * 0.5, along * 3.6)
    furrow = (grain < 0.32) | ((fine < 0.22) & (grain < 0.45))
    ridge = (grain > 0.68) & (fine > 0.45)
    plates = (vn(arc * 2.6 + 5, along * 0.9) - 0.5) * 0.12
    bm = mask & (M == BARKM)
    bv = v * (0.85 if cls == 1 else 0.75) + plates - furrow * 0.18 + ridge * 0.1
    img[bm] = paint(BARK, bv, bm, bay)[bm]
    if cls == 2:
        lifted = bm & (vn(along * 2.2 + 4, around * 3) > 0.82)               # small plates lifted, pale wood beneath
        img[lifted] = paint(WOOD, v * 0.75, lifted)[lifted]
    # grey dead wood (class 3): split along its grain; bark plates still clinging, their lifted edges casting shadow
    dm = mask & (M == DEADM)
    split = np.sin(around * 16 + vn(along * 1.2, around * 2) * 3) > 0.7
    dv = v - split * 0.18 + (vn(along * 4, around * 8) - 0.5) * 0.06
    img[dm] = paint(DEAD, dv, dm, bay)[dm]
    cling = dm & (vn(along * 1.6 + 7, around * 2.2) > 0.6)
    img[cling] = paint(BARK, v * 0.75, cling)[cling]
    pe = cling & ~np.roll(cling, -1, axis=0)
    img[pe] *= 0.65
    if cls == 3:                                                            # moss starting in strips on top, along the grain
        strip = dm & (np.abs(around) < 0.5) & (vn(along * 0.7, around * 5) > 0.42)
        img[strip] = paint(MOSS, v * 0.85 + (vn(along * 9, around * 9) - 0.5) * 0.1, strip)[strip]
    # moss (class 4-5): cushions over the soft wood; pale cubes of wood at the breaks
    mm = mask & (M == MOSSM)
    img[mm] = paint(MOSS, v * 0.9 + (vn(along * 6, around * 6) - 0.5) * 0.12, mm, bay)[mm]
    if cls == 5:
        hmax = max(float(pz[mm].max()) if mm.any() else 0.1, 0.05)
        cush = vn(px * 9 + info["bend_seed"], py * 9)
        seam = mm & (cush < 0.3)                                              # the dark between the cushions
        img[seam] = img[seam] * 0.72
        crest = mm & (cush > 0.68) & (v > 0.55)                               # each cushion's lit crown
        img[crest] = np.minimum(img[crest] * 1.12, 1)
        # where the moss has torn: the punky red-brown wood of the log itself, crumbling
        punk = mm & (vn(px * 1.6 + 11, py * 1.6) > 0.8) & (pz > hmax * 0.35)
        PUNK = ramp("#1d0e0a", "#341a10", "#4f2817", "#6c3a20", "#87502c")
        img[punk] = paint(PUNK, v * 0.85 + (vn(px * 30, py * 30) - 0.5) * 0.18, punk)[punk]
        # the litter: lying on it here and there, banked thick against its flanks
        low = 1 - np.clip(pz / hmax, 0, 1)
        leaves = mm & ~punk & (vn(px * 9 + 3, py * 9) > 0.9 - low ** 1.5 * 0.55)
        LIT = ramp("#2a1712", "#45281a", "#5e3820", "#784a28", "#95602f")
        img[leaves] = paint(LIT, v * 0.85 + (vn(px * 21, py * 21) - 0.5) * 0.2, leaves)[leaves]
        caps = mm & (vn(px * 23 + 7, py * 23) > 0.955) & (pz > hmax * 0.4)   # small pale caps, few
        img[caps] = paint(ramp("#5e5146", "#9a8a72", "#c8b998"), v * 1.1, caps)[caps]
    if cls == 4:
        cu, cv = along * 3.2, arc * 4.0                                     # blocks about a third of a yard
        gi, gj = np.floor(cu + vn(cv, 3) * 0.6), np.floor(cv + vn(cu, 5) * 0.6)
        fu, fv = cu + vn(cv, 3) * 0.6 - gi, cv + vn(cu, 5) * 0.6 - gj
        crack = mm & ((fu < 0.08) | (fv < 0.1))
        img[crack] = img[crack] * 0.55
        opened = mm & ~crack & (((gi * 7 + gj * 13) % 5) == 0)              # a block broken open: pale soft wood
        img[opened] = paint(WOOD, v * 0.72 + (vn(along * 20, arc * 20) - 0.5) * 0.08, opened)[opened]
    # the broken ends: pale splintered inner wood, its growth rings, dark in the heart
    em = mask & (M == ENDM)
    rings = np.sin(np.hypot(py - bend, pz - info["r"] * RIDE[cls]) * 60) > 0.3
    heart = np.hypot(py - bend, pz - info["r"] * RIDE[cls]) < rloc * 0.25
    ev = v * 0.95 - rings * 0.08 - heart * 0.2 + (vn(py * 30, pz * 30) - 0.5) * 0.1
    img[em] = paint(WOOD if cls <= 3 else MOSS, ev, em, bay)[em]
    wm = mask & (M == WOODM)
    img[wm] = paint(WOOD, v * 1.05, wm)[wm]
    img = rim(img, mask, C, 1.25)
    litk = (v > 0.6)[..., None]
    img = np.where(mask[..., None], np.where(litk, img * np.array([1.03, 1.0, 0.96]), img * np.array([0.96, 0.97, 1.05])), img)
    return img, mask, n, C


def meta_for(info):
    cls = info["cls"]
    h = info["r"] * (RIDE[cls] + 1.0) if cls < 5 else info["r"] * 0.45
    posts = []
    if cls <= 3:                                                            # a row down its length; 4-5 are stepped over
        n_ = max(2, int(info["L"] / (info["r"] * 1.1)))
        for k in range(n_ + 1):
            t = k / n_
            posts.append([round((t - 0.5) * info["L"], 3), round(np.sin(t * 2.4 + info["bend_seed"]) * 0.08 * info["L"] / 5, 3),
                          round(info["r"] * (1 - t * 0.35), 3)])
    return dict(kind="log/class%d" % cls, height=float(h), radius_yd=float(info["r"]), sway=0.0, posts=posts,
                cover=float(h), material="wood_dead_dry" if cls <= 3 else "wood_dead_wet",
                hp=(None if cls <= 2 else int(60 if cls == 3 else 25)), length_yd=float(info["L"]))


if __name__ == "__main__":
    import os
    out = sys.argv[1] if len(sys.argv) > 1 else "logs"
    for cls in (1, 2, 3, 4, 5):
        for s in (1, 2):
            F, info = make(cls, s * 10 + cls)
            img, mask, n, C = render(F, info)
            meta = meta_for(info)
            export("log_c%d_%d" % (cls, s), out, img, mask, n, C, F, meta)
            print("log", cls, s, "posts", len(__import__("kit").posts_from(F)))
