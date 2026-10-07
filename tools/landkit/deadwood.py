"""The standing and uprooted dead of the old wood: root plate, stump, snag (landkit;
tools/art_study/ecosystems/old_growth_forest.md).

ROOT PLATE: what a giant tears up as it falls. A disc of roots and earth stood on edge, taller than a man; thick roots
  radiating from the butt like spokes and snapped at the rim; dark earth packed between them, stones held in the
  roots; a ragged crown of root ends along its top. Seen from the side the log lay (its face); its back is the torn
  earth over the pit. Collision: a thin wall across its width (walk round its ends and behind it). Cover: full.
STUMP: a flared foot on buttress roots; bark up its sides (the grain, moss on the north side); a broken top, jagged,
  its growth rings showing, its heart crumbled to soft brown (foxfire in it at night). Collision: one post.
SNAG: a dead tree still standing, seven yards: silver wood split with long fine cracks, dark holes where the wood has
  gone, strips of bark still clinging low down, the top broken jagged; tiers of bracket fungi up its moon side.
  Collision: one post. Cover: full. Lightning seeks it; fire takes it like a torch; force can fell it.

  python tools/landkit/deadwood.py OUT_DIR
"""
import sys
import numpy as np
from kit import Field, cast, normals, moon_shadow, ao, light, paint, rim, export, ramp, vn, fbm, B4, MOON, KX, KY, KZ

BARK = ramp("#120f15", "#211a1c", "#302622", "#41332b", "#544235", "#6a5541", "#83694f", "#9c8262")
DEAD = ramp("#17171c", "#26252b", "#38363b", "#4e4a4c", "#67615f", "#837b75", "#a19789")
WOOD = ramp("#1a1210", "#33221a", "#523826", "#735135", "#946c48", "#b48c62", "#cfa87a")
MOSS = ramp("#0b120f", "#121d14", "#1a2a18", "#24381c", "#304621", "#3e5427", "#4e632d", "#5f7234")
SOIL = ramp("#120d10", "#1f1716", "#2f221d", "#413026", "#55402f", "#6b523b")
ROOT = ramp("#1a1210", "#33251c", "#54402c", "#76603f", "#927a52")
PEB = ramp("#1c1b20", "#2e2c31", "#433f43", "#5b5556", "#77706c")
FUNG_TOP = ramp("#2a1a12", "#4a2e1c", "#6c4a2c", "#8c6640")
FUNG_RIM = np.array([0.85, 0.8, 0.69])
FUNG_PORE = np.array([0.69, 0.63, 0.49])


def bark_paint(v, along, arc, mask, bay, n, dim=1.0):
    grain = vn(arc * 15.0 + along * 0.35, along * 1.6)
    fine = vn(arc * 34.0 + along * 0.5, along * 3.6)
    furrow = (grain < 0.32) | ((fine < 0.22) & (grain < 0.45))
    ridge = (grain > 0.68) & (fine > 0.45)
    plates = (vn(arc * 2.6 + 5, along * 0.9) - 0.5) * 0.12
    bv = v * dim + plates - furrow * 0.18 + ridge * 0.1
    img = paint(BARK, bv, mask, bay)
    away = np.clip(-(n[..., 0] * MOON[0] + n[..., 1] * MOON[1]), 0, 1)
    mossy = mask & (along < 0.35 + away * 1.4 + (vn(arc * 4, along * 2) - 0.5) * 0.6) & (vn(arc * 6, along * 3) > 0.42)
    img[mossy] = paint(MOSS, v * 0.75 + (fine - 0.5) * 0.12, mossy)[mossy]
    return img


def root_plate(seed):
    rr = np.random.default_rng(seed)
    R = rr.uniform(1.4, 1.9)
    F = Field(R + 0.5, res=0.025)
    X, Y = F.X, F.Y
    # thicker at the hub where the root collar is, thin at the rim; the crown a ragged line of clods, not steps
    thick = 0.16 + 0.22 * np.clip(1 - np.abs(Y) / R, 0, 1) + (fbm(X * 2, Y * 2) - 0.5) * 0.06
    disc = (np.abs(X) < thick) & (np.abs(Y) < R + 0.2)
    clods = (fbm(Y * 2.2 + seed, 7) - 0.5) * 0.5 + (fbm(Y * 6 + seed, 3) - 0.5) * 0.16
    top = 1.05 + np.sqrt(np.clip(R ** 2 - Y ** 2, 0, None)) * 0.85 + clods
    m = disc & (top > 0.3)
    F.H = np.where(m, top, F.H)
    F.M[m] = 1
    return F, dict(R=R, zc=1.0, seed=seed)


def paint_plate(F, info):
    R, zc = info["R"], info["zc"]
    top = 1.05 + R * 0.85 + 1.0
    C = cast(F, top)
    n, side = normals(F, C, exag=1.0)
    sh = moon_shadow(F, C, n)
    a = ao(F, C)
    v = light(n, sh, a, side)
    mask = C["got"] & (C["pz"] > -0.05)
    bay = B4[C["SY"].astype(int) % 4, C["SX"].astype(int) % 4]
    py, pz = C["py"], C["pz"]
    face = mask & side & (np.abs(n[..., 0]) > 0.6)                      # the torn face, where the roots are
    crown_top = mask & ~side                                             # its top edge: the forest floor torn up with it
    dz = pz - zc
    ang = np.arctan2(dz, py)
    rad = np.hypot(py, dz)
    rr = np.random.default_rng(info["seed"])
    # ---- the soil packed between the roots: dark, clotted, stones held in it, fine root hairs through it
    img = paint(SOIL, v * 0.8 + (vn(py * 9, pz * 9) - 0.5) * 0.16, mask, bay)
    clot = face & (vn(py * 5 + 3, pz * 5) > 0.62)
    img[clot] = img[clot] * 1.12
    stones = face & (vn(py * 11, pz * 11) > 0.86)
    img[stones] = paint(PEB, v + 0.12 + (vn(py * 40, pz * 40) - 0.5) * 0.1, stones)[stones]
    # ---- the roots, painted round (a height field cannot carry relief on a face): each a body with its back lit
    #      toward the moon, its belly dark, and a shadow cast on the soil beside it; they branch as they go out
    L2 = np.array([-0.45, 0.89])                                         # the light across the face: up, a little to -y
    roots = []
    for k in range(13):
        a0 = -np.pi * 0.06 + k * (np.pi * 1.12 / 12) + rr.normal(0, 0.06)
        w0 = rr.uniform(0.11, 0.17)
        roots.append((a0, 0.3, R * rr.uniform(0.85, 1.05), w0, k))
        if rr.random() < 0.6:                                            # a branch from its middle
            roots.append((a0 + rr.choice([-1, 1]) * rr.uniform(0.18, 0.32), R * rr.uniform(0.35, 0.55), R * rr.uniform(0.8, 1.0), w0 * 0.55, k + 50))
    for k in range(6):                                                   # the lower roots, down into the clotted earth
        a0 = (-rr.uniform(0.15, 0.75)) if k % 2 else (np.pi + rr.uniform(0.15, 0.75))
        roots.append((a0, 0.3, rr.uniform(0.55, 0.95), rr.uniform(0.07, 0.11), k + 90))
    body = np.zeros(mask.shape, bool)
    tone = np.zeros(mask.shape)
    shade = np.zeros(mask.shape, bool)
    for (a0, r0_, r1_, w0, kk) in roots:
        wob = np.sin(rad * 2.6 + kk) * 0.07
        dd = ((ang - a0 - wob + np.pi) % (2 * np.pi)) - np.pi
        across = dd * rad                                                # signed distance from its centreline (yd)
        t = np.clip((rad - r0_) / max(r1_ - r0_, 1e-3), 0, 1)
        wid = w0 * (1 - t * 0.65)
        on = face & (np.abs(across) < wid) & (rad > r0_) & (rad < r1_)
        nperp = np.stack([-np.sin(a0), np.cos(a0)])                       # the root's own sideways, in the face
        side_lit = (nperp[0] * L2[0] + nperp[1] * L2[1]) * np.sign(across)
        u_ = np.abs(across) / np.maximum(wid, 1e-3)
        tv = 0.55 + side_lit * u_ * 0.45 - u_ ** 3 * 0.15 - (0.06 if kk >= 90 else 0.0)   # the lower ones half in earth
        body |= on
        tone = np.where(on, tv, tone)
        # its shadow on the soil: just past its dark side
        sh_ = face & ~on & (np.abs(across) < wid + 0.06) & (rad > r0_) & (rad < r1_) & (side_lit < 0)
        shade |= sh_
    img[shade & ~body] = img[shade & ~body] * 0.55
    ri = np.clip(((v * 0.35 + tone * 0.75) * len(ROOT)).astype(int), 0, len(ROOT) - 1)
    img[body] = ROOT[ri[body]]
    # ---- the root collar at the hub: the trunk's foot still on it, bark flaring out into the great roots
    hub = face & (rad < 0.42)
    hv = v * 0.8 + 0.08 * np.cos(ang * 7) - (rad < 0.2) * 0.1
    img[hub] = bark_paint(hv, rad * 3, ang * 0.4, hub, bay, n, 1.0)[hub]
    # ---- the crown: the floor's mat torn up with it, moss and litter overhanging the soil
    mat = crown_top | (face & (pz > (1.05 + np.sqrt(np.clip(R ** 2 - py ** 2, 0, None)) * 0.85) - 0.22))
    img[mat] = paint(MOSS, v * 0.9 + (vn(py * 14, pz * 14) - 0.5) * 0.15, mat, bay)[mat]
    lit_ = mat & (vn(py * 10 + 4, pz * 10) > 0.72)
    img[lit_] = paint(ramp("#2a1712", "#45281a", "#5e3820", "#784a28"), v * 0.9, lit_)[lit_]
    lip = face & ~mat & np.roll(mat, 1, axis=0)                           # the dark lip under the overhang
    img[lip] = img[lip] * 0.5
    img = rim(img, mask, C, 1.2)
    # ---- drawn out past the silhouette: root ends snapped at the rim, some drooping; root hairs hanging below
    fx, fy = C["foot"]
    Hh, Ww = mask.shape
    for k in range(18):
        a0 = rr.uniform(-0.15, np.pi + 0.15)
        r_ = R * rr.uniform(0.9, 1.08)
        y0, z0 = np.cos(a0) * r_, zc + np.sin(a0) * r_
        sx, sy = (0 - y0) * KX + fx, (0 + y0) * KY - z0 * KZ + fy
        Ln = rr.uniform(3, 10)
        droop = rr.uniform(0.0, 0.9) if a0 > 0.3 and a0 < np.pi - 0.3 else rr.uniform(0.3, 1.2)
        dxs, dys = -np.cos(a0) * KX / 18.0, -np.sin(a0) * 1.0
        for i in range(int(Ln)):
            f = i / max(Ln - 1, 1)
            xx = int(round(sx + dxs * i))
            yy = int(round(sy + dys * i + droop * i * f * 0.6))
            if 0 <= yy < Hh and 0 <= xx < Ww:
                img[yy, xx] = ROOT[2 if (i < Ln * 0.5 and dys < 0) else 1] if f < 0.85 else ROOT[0]
                mask[yy, xx] = True
    under = face & ~np.roll(face, -1, axis=0) & (pz > 0.25)
    ys, xs = np.nonzero(under)
    for (y, x) in zip(ys, xs):
        if rr.random() > 0.12:
            continue
        for j in range(1, int(rr.integers(2, 7))):
            if y + j < Hh and not mask[y + j, x]:
                img[y + j, x] = ROOT[0] * 0.8
                mask[y + j, x] = True
    posts = [[0.0, round(y, 3), 0.22] for y in np.linspace(-R, R, 9)]
    meta = dict(kind="deadwood/root_plate", height=float(top - 1.0), radius_yd=float(R), sway=0.0, posts=posts,
                cover=float(top - 1.0), material="earth_roots", hp=80)
    return img, mask, n, C, meta


def stump(seed):
    rr = np.random.default_rng(seed)
    r = rr.uniform(0.4, 0.65)
    hgt = rr.uniform(0.6, 1.1)
    F = Field(r * 2.6, res=0.02)
    X, Y = F.X, F.Y
    d = np.hypot(X, Y)
    ang = np.arctan2(Y, X)
    lobe = np.floor(((ang + seed + np.pi) % (2 * np.pi)) / (2 * np.pi) * 5)
    reach = 0.45 + 0.55 * ((lobe * 0.618 + seed * 0.31) % 1.0)          # each root its own length
    butt = (np.cos(ang * 5 + seed + np.sin(ang * 3) * 0.4) * 0.5 + 0.5) ** 5 * reach
    flare = r * 1.15 + butt * r * 1.0
    z = np.where(d <= r, hgt + (fbm(X * 4, Y * 4) - 0.5) * 0.2 * hgt - np.clip(1 - d / (r * 0.55), 0, 1) * 0.2,
                 np.clip((flare - d) / np.maximum(flare - r, 1e-3), 0, 1) ** 2.2 * (0.5 + butt * 0.8))
    # the broken top: jagged splinters on one side where it snapped
    jag = (d <= r) & (np.cos(ang - 2.0) > 0.4) & (vn(ang * 8, 3) > 0.5)
    z = np.where(jag, z + 0.15 + vn(ang * 13, 5) * 0.25, z)
    m = z > 0.01
    F.H = np.where(m, z, F.H)
    F.M[m] = np.where((d <= r)[m], 2, 1)
    return F, dict(r=r, hgt=hgt, seed=seed)


def paint_stump(F, info):
    C = cast(F, info["hgt"] + 0.6)
    n, side = normals(F, C, exag=1.0)
    hit_side = side & (np.hypot(C["px"], C["py"]) > info["r"] * 0.7)
    rn = np.dstack([C["px"], C["py"], np.zeros_like(C["px"])])
    rn /= np.linalg.norm(rn, axis=2, keepdims=True) + 1e-9
    n = np.where(hit_side[..., None], rn, n)
    sh = moon_shadow(F, C, n)
    a = ao(F, C)
    v = light(n, sh, a, side)
    mask = C["got"] & (C["pz"] > -0.05)
    bay = B4[C["SY"].astype(int) % 4, C["SX"].astype(int) % 4]
    px, py, pz = C["px"], C["py"], C["pz"]
    ang = np.arctan2(py, px)
    d = np.hypot(px, py)
    topm = mask & ~side & (d < info["r"])
    sidem = mask & ~topm
    img = bark_paint(v, pz, ang * info["r"], sidem, bay, n, 0.9)
    rings = np.sin(d * 55) > 0.4
    tv = v * 0.95 - rings * 0.08
    img[topm] = paint(WOOD, tv, topm, bay)[topm]
    heart = topm & (d < info["r"] * 0.55)
    img[heart] = paint(SOIL, v * 0.7 + (vn(px * 30, py * 30) - 0.5) * 0.15, heart)[heart]   # crumbled to soft brown
    img = rim(img, mask, C, 1.2)
    meta = dict(kind="deadwood/stump", height=float(info["hgt"]), radius_yd=float(info["r"]), sway=0.0,
                posts=[[0.0, 0.0, round(info["r"] * 1.15, 3)]], cover=float(info["hgt"]), material="wood_dead_wet", hp=None,
                foxfire=[[0.0, 0.0, round(info["r"] * 0.55, 3)]])
    return img, mask, n, C, meta


def snag(seed):
    rr = np.random.default_rng(seed)
    r = rr.uniform(0.35, 0.6)
    hgt = rr.uniform(5.0, 7.5)
    F = Field(r * 2.4, res=0.02)
    X, Y = F.X, F.Y
    d = np.hypot(X, Y)
    ang = np.arctan2(Y, X)
    butt = (np.cos(ang * 5 + seed) * 0.5 + 0.5) ** 7
    flare = r * 1.2 + butt * r * 1.0
    topz = hgt - (fbm(ang * 2, 3) - 0.3) * 2.0 - (vn(ang * 6, 1) > 0.6) * 0.6
    z = np.where(d <= r, topz, np.clip((flare - d) / np.maximum(flare - r, 1e-3), 0, 1) ** 2.2 * (0.5 + butt * 0.7))
    m = z > 0.01
    F.H = np.where(m, z, F.H)
    F.M[m] = 1
    return F, dict(r=r, hgt=hgt, seed=seed)


def paint_snag(F, info):
    C = cast(F, info["hgt"] + 0.5)
    n, side = normals(F, C, exag=1.0)
    hit_side = side
    rn = np.dstack([C["px"], C["py"], np.zeros_like(C["px"])])
    rn /= np.linalg.norm(rn, axis=2, keepdims=True) + 1e-9
    n = np.where(hit_side[..., None], rn, n)
    sh = moon_shadow(F, C, n)
    a = ao(F, C)
    v = light(n, sh, a, side)
    mask = C["got"] & (C["pz"] > -0.05)
    bay = B4[C["SY"].astype(int) % 4, C["SX"].astype(int) % 4]
    px, py, pz = C["px"], C["py"], C["pz"]
    ang = np.arctan2(py, px)
    arc = ang * info["r"]
    grain = vn(arc * 14.0 + pz * 0.2, pz * 0.9)
    fine = vn(arc * 40.0, pz * 2.4)
    crack = (grain < 0.25) | (fine < 0.12)
    ridge = grain > 0.7
    dv = v + 0.04 - crack * 0.2 + ridge * 0.08 + (vn(arc * 3, pz * 0.6) - 0.5) * 0.08
    img = paint(DEAD, dv, mask, bay)
    holes = mask & (vn(ang * 4, pz * 2.5) > 0.86)
    img[holes] = np.array([0.04, 0.03, 0.035])
    barkl = mask & (pz < 1.4 + vn(ang * 3, 1) * 1.2) & (vn(ang * 5, pz * 1.5) > 0.5)
    img[barkl] = bark_paint(v, pz, arc, barkl, bay, n, 0.85)[barkl]
    img = rim(img, mask, C, 1.25)
    # bracket tiers up its moon side (drawn on: they jut out, which a height field cannot hold)
    fx, fy = C["foot"]
    rr = np.random.default_rng(info["seed"])
    for tier in range(rr.integers(3, 6)):
        az = rr.uniform(1.0, 2.2)
        zt = rr.uniform(1.0, min(4.5, info["hgt"] - 1.0))
        p = (np.cos(az) * info["r"], np.sin(az) * info["r"])
        sx, sy = (p[0] - p[1]) * KX + fx, (p[0] + p[1]) * KY + fy - zt * KZ
        for sh_i in range(rr.integers(2, 4)):
            w_ = rr.uniform(4.5, 7.0) - sh_i * 1.4
            cxs, cys = sx - w_ * 0.45, sy + sh_i * 5.5
            for dyy in range(-int(w_ * 0.5) - 1, 4):
                for dxx in range(-int(w_) - 1, int(w_) + 2):
                    u, vv = dxx / w_, dyy / (w_ * 0.42)
                    r2 = u * u + vv * vv
                    i_, j_ = int(cys + dyy), int(cxs + dxx)
                    if not (0 <= i_ < img.shape[0] and 0 <= j_ < img.shape[1]):
                        continue
                    if dyy <= 0 and r2 <= 1:
                        band = int(np.hypot(dxx, dyy * 2.2) / 1.6) % 2
                        lit_ = np.clip(0.55 - u * 0.25 - vv * 0.3, 0, 0.99)
                        col = FUNG_TOP[int(lit_ * 4)] * (0.85 if band else 1.0)
                        if r2 > 0.7:
                            col = FUNG_RIM * (1.0 if u < 0.3 else 0.8)
                        img[i_, j_] = col
                        mask[i_, j_] = True
                    elif dyy == 1 and abs(u) <= 1:
                        img[i_, j_] = FUNG_PORE * 0.75
                        mask[i_, j_] = True
                    elif dyy in (2, 3) and abs(u) <= 0.9 and mask[i_, j_]:
                        img[i_, j_] *= 0.6
    meta = dict(kind="deadwood/snag", height=float(info["hgt"]), radius_yd=float(info["r"]), sway=0.6,
                posts=[[0.0, 0.0, round(info["r"] * 1.15, 3)]], cover=float(info["hgt"]), material="wood_dead_dry", hp=120,
                lightning_rod=True)
    return img, mask, n, C, meta


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "deadwood"
    for s in (1, 2):
        F, info = root_plate(s)
        img, mask, n, C, meta = paint_plate(F, info)
        export("rootplate_%d" % s, out, img, mask, n, C, F, meta)
        F, info = stump(s + 10)
        img, mask, n, C, meta = paint_stump(F, info)
        export("stump_%d" % s, out, img, mask, n, C, F, meta)
        F, info = snag(s + 20)
        img, mask, n, C, meta = paint_snag(F, info)
        export("snag_%d" % s, out, img, mask, n, C, F, meta)
        print("deadwood", s)
