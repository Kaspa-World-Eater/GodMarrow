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
    thick = 0.22 + (fbm(X * 2, Y * 2) - 0.5) * 0.1
    disc = (np.abs(X) < thick) & (np.abs(Y) < R + 0.35)
    spikes = np.clip(np.sin(Y * 23 + fbm(Y * 3, 1) * 6) * 1.6 - 0.6, 0, 1) * 0.55
    clods = (fbm(Y * 4, 7) - 0.5) * 0.45
    top = 1.1 + np.sqrt(np.clip(R ** 2 - Y ** 2, 0, None)) * 0.85 + clods + spikes
    m = disc & (top > 0.3)
    F.H = np.where(m, top, F.H)
    F.M[m] = 1
    zc = 1.0
    return F, dict(R=R, zc=zc, seed=seed)


def paint_plate(F, info):
    top = 1.1 + info["R"] * 0.85 + 1.0
    C = cast(F, top)
    n, side = normals(F, C, exag=1.0)
    sh = moon_shadow(F, C, n)
    a = ao(F, C)
    v = light(n, sh, a, side)
    mask = C["got"] & (C["pz"] > -0.05)
    bay = B4[C["SY"].astype(int) % 4, C["SX"].astype(int) % 4]
    py, pz = C["py"], C["pz"]
    dz = pz - info["zc"]
    ang = np.arctan2(dz, py)
    rad = np.hypot(py, dz)
    roots = np.zeros(mask.shape, bool)
    lit_edge = np.zeros(mask.shape, bool)
    rr = np.random.default_rng(info["seed"])
    for k in range(13):
        a0 = -np.pi * 0.05 + k * (np.pi * 1.1 / 12) + rr.normal(0, 0.06)
        wob = np.sin(rad * 3 + k) * 0.08
        dd = (((ang - a0 - wob + np.pi) % (2 * np.pi)) - np.pi)
        dist = np.abs(dd) * rad
        wid = np.clip(0.16 - rad * 0.06, 0.04, 0.16) * rr.uniform(0.7, 1.2)
        rk = mask & (dist < wid) & (rad > 0.3)
        roots |= rk
        lit_edge |= rk & (dist > wid * 0.5) & (dd > 0)
    soil = mask & ~roots
    img = paint(SOIL, v * 0.75 - 0.05 + (vn(py * 12, pz * 12) - 0.5) * 0.12, soil, bay)
    img[roots] = paint(ROOT, v * 0.9 + (vn(rad * 6, ang * 3) - 0.5) * 0.1, roots, bay)[roots]
    img[lit_edge] = np.minimum(img[lit_edge] * 1.3, 1)
    stones = soil & (vn(py * 11, pz * 11) > 0.85)
    img[stones] = paint(PEB, v + 0.1, stones)[stones]
    # the butt where the log was: a dark round heart at the hub, its torn wood pale round it
    hub = mask & (rad < 0.42)
    img[hub] = paint(WOOD, v * 0.8 - (rad < 0.25) * 0.25, hub)[hub]
    img = rim(img, mask, C, 1.2)
    posts = [[0.0, round(y, 3), 0.22] for y in np.linspace(-info["R"], info["R"], 9)]
    meta = dict(kind="deadwood/root_plate", height=float(top - 1.0), radius_yd=float(info["R"]), sway=0.0, posts=posts,
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
