"""The towering trees of the Hollow Wood. THE LORE (docs/wiki/02-world-and-lore.md, the codex voices): "the god's
veins stood up as pale trees"; the trunks are "pale, straight, close in the grain", "warm a hand's depth in", and a saw
in one "ran red down the blade"; their roots "each ran downhill, and each joined another, and all of them bent toward
one place in the north", the Root Deep; luminous fungi grow in three colours (the grey is eaten, the other two left
alone); "every tenth trunk holds something the god was carrying". So: pale bone-grey skin, smooth as beech, with
veins standing up out of it and branching as they climb, a bruised warmth in them; roots long on the downhill side,
all bending one way.

The towering trees of the old wood (landkit; Derek 2026-10-07: "If we are in a forest, I want the trees to tower
over head ... we probably won't see the tops"). One trunk, its crown always above the frame: at the game's zoom the
screen is about 13 yards of trunk tall, so a 24-yard bole never shows its top. The crown is felt, not drawn: the
trunk darkens and cools as it climbs into the canopy's shade, with moon-flecks where the leaves part.

The bole, as the study trees had it (tools/art_study/wood_scene.py, the bark Derek preferred):
- never quite round: fluted, a little wider one way than the other;
- a concave flare sweeping up out of five to seven buttress roots, reaching the trunk's own girth a yard up;
- surface roots snaking out over the floor two to four yards, low enough to step over, mossed along their backs;
- bark by the grain method: long fissure cells running up and twisting, lit ridges, plates, damp streaks, moss
  climbing the side turned from the moon, pale lichen on the lit side;
- the dark world's rot: on some, a hollow opened at the foot (heart-rot), its lip lit, black inside.

  python tools/landkit/giant.py OUT_DIR
"""
import sys
import numpy as np
from kit import Field, cast, normals, moon_shadow, ao, light, paint, rim, export, ramp, vn, fbm, B4, MOON

R_BARK = ramp("#16131a", "#28232a", "#3d3639", "#554c4b", "#6f655f", "#8b7f75", "#a89a8c", "#c2b5a3")   # pale vein-wood
R_VEIN = ramp("#1d1218", "#33202a", "#4d3036", "#694643", "#86604f")                          # the vein: bruised, warm
DOWN = np.array([0.35, -1.0]) / np.hypot(0.35, 1.0)        # downhill, toward the Root Deep (world -y is north)
R_MOSS = ramp("#0b1210", "#132017", "#1d301b", "#2a4320", "#3b5726", "#516d2e", "#6a8538")
HGT = 16.0                     # its seen height: above 15 yd it is gone into the canopy


def make(seed):
    rr = np.random.default_rng(seed)
    r = rr.uniform(0.75, 1.15)
    nb = int(rr.integers(5, 8))
    reach = rr.uniform(1.6, 2.8)
    F = Field(r * 2.2 + reach, res=0.03)
    X, Y = F.X, F.Y
    d = np.hypot(X, Y)
    ang = np.arctan2(Y, X)
    # the bole: fluted, a little oval
    rb = r * (1 + 0.05 * np.sin(ang * 2 + seed) + 0.035 * np.sin(ang * nb * 2 + seed * 3) + 0.02 * np.sin(ang * 11))
    butt = (np.cos(ang * nb + seed + np.sin(ang * 3 + seed) * 0.4) * 0.5 + 0.5) ** 7
    flare = rb * 1.25 + butt * rb * 1.5
    z = np.where(d <= rb, HGT, np.clip((flare - d) / np.maximum(flare - rb, 1e-3), 0, 1) ** 2.2 * (0.6 + butt * 0.9))
    root_m = np.zeros(X.shape, bool)
    # surface roots: out of the buttresses, snaking over the floor, sinking as they go
    for k in range(nb):
        a0 = (2 * np.pi * k - seed) / nb + rr.normal(0, 0.1)
        down = np.cos(a0) * DOWN[0] + np.sin(a0) * DOWN[1]               # 1 facing downhill .. -1 uphill
        if down < -0.4 and rr.random() < 0.6:
            continue
        x, y, a = np.cos(a0) * r * 1.3, np.sin(a0) * r * 1.3, a0
        L = reach * rr.uniform(0.7, 1.0) * (0.35 + 0.65 * max(down, 0.0) + 0.15)
        steps = int(L / 0.08)
        bendk = rr.uniform(-1, 1) * 0.06                                 # each root bends its own way, steadily
        for i in range(steps):
            toward = np.arctan2(DOWN[1], DOWN[0])
            a += bendk * 0.5 + np.sin(toward - a) * 0.025 + rr.normal(0, 0.06)   # all bending toward the Root Deep
            x, y = x + np.cos(a) * 0.08, y + np.sin(a) * 0.08
            f = i / steps
            w = 0.34 * (1 - f) ** 0.6 + 0.14                                # blunt: it dives, it does not point
            hz = 0.17 * (1 - f) ** 1.1 * np.clip((1 - f) / 0.3, 0, 1) ** 0.5    # sinking into the floor at its end
            dd = np.hypot(X - x, Y - y)
            on = dd < w
            zz = hz * np.sqrt(np.clip(1 - (dd / w) ** 2, 0, 1))
            upd = on & (zz > z)
            z = np.where(upd, zz, z)
            root_m |= upd
    m = z > 0.01
    F.H = np.where(m, z, F.H)
    F.M[m] = np.where(root_m[m], 2, 1)
    cav = rr.random() < 0.45
    return F, dict(r=r, seed=seed, cav=cav, cav_ang=rr.uniform(0.2, 1.4), cav_h=rr.uniform(1.1, 2.0))


def render(F, info):
    C = cast(F, HGT + 0.5)
    n, side = normals(F, C, exag=1.0)
    px, py, pz = C["px"], C["py"], C["pz"]
    d = np.hypot(px, py)
    ang = np.arctan2(py, px)
    bole = side & (pz > 0.9)
    rn = np.dstack([px, py, np.zeros_like(px)])
    rn /= np.linalg.norm(rn, axis=2, keepdims=True) + 1e-9
    kb = np.clip((pz - 0.5) / 0.9, 0, 1)[..., None] * side[..., None]     # the flare's normals blend into the bole's
    n = n * (1 - kb) + rn * kb
    n /= np.linalg.norm(n, axis=2, keepdims=True) + 1e-9
    sh = moon_shadow(F, C, n)
    a = ao(F, C)
    v = light(n, sh, a, side)
    ndl = n[..., 0] * MOON[0] + n[..., 1] * MOON[1]
    back = np.clip(-ndl, 0, 1)
    vb = 0.34 + np.clip(ndl, 0, 1) ** 0.8 * 0.62 + (ndl > 0.15) * 0.05 + back ** 3 * 0.08 - np.clip(-ndl, 0, 0.4) * 0.12   # a pale trunk keeps its grey in shade
    v = np.where(side, v * (1 - kb[..., 0]) + vb * kb[..., 0], v)
    mask = C["got"] & (pz > -0.05)
    mask &= ~(~side & (pz > HGT - 1.0))                                   # never the cut top: the bole runs on up
    bay = B4[C["SY"].astype(int) % 4, C["SX"].astype(int) % 4]
    M = F.at(F.M, px, py, 0)
    # the canopy over it: the bole darkens and cools as it climbs into the crown's shade; moon-flecks where it parts
    up = np.clip((pz - 4.0) / 14.0, 0, 1)
    fleck = (vn(ang * 3 + 7, pz * 0.35) > 0.8) & (pz > 3)
    v = v * (1 - up * 0.3) + fleck * 0.1 * (1 - up * 0.5)
    arc = ang * info["r"]
    along = pz
    img = np.zeros(mask.shape + (3,))
    grain = vn(arc * 15.0 + along * 0.35, along * 1.6)
    fine = vn(arc * 34.0 + along * 0.5, along * 3.6)
    furrow = (grain < 0.32) | ((fine < 0.22) & (grain < 0.45))
    ridge = (grain > 0.68) & (fine > 0.45)
    plates = (vn(arc * 2.6 + 5, along * 0.9) - 0.5) * 0.12
    streak = (vn(arc * 7.0, along * 0.25 + 3) > 0.78) * -0.07
    skin = (vn(arc * 3.0, along * 0.5) - 0.5) * 0.06 + (vn(arc * 20, along * 6) - 0.5) * 0.03
    bv = v + skin + streak * 0.6 - (furrow & (grain < 0.2)) * 0.05
    wood = mask
    img[wood] = R_BARK[np.clip((bv * len(R_BARK)).astype(int), 0, len(R_BARK) - 1)][wood]
    # the veins: raised cords rising from the roots and branching as they climb; dark and warm in the cord, lit along
    # the edge toward the moon, a thin shadow on the far side
    vd, vside = veins(info, arc, along)
    cord = wood & bole & (vd < 1.0)
    vt = np.clip(v * 0.75 + (vside * (ndl > 0)) * 0.25, 0, 0.99)
    img[cord] = R_VEIN[np.clip((vt[cord] * len(R_VEIN)).astype(int), 0, len(R_VEIN) - 1)]
    vlit = cord & (vside < -0.3) & (ndl > 0.1)
    img[vlit] = np.minimum(R_BARK[np.clip((v[vlit] * len(R_BARK)).astype(int) + 1, 0, len(R_BARK) - 1)] * 1.05, 1)
    vsh = wood & bole & (vd >= 1.0) & (vd < 1.7) & (vside > 0)
    img[vsh] = img[vsh] * 0.8
    away = np.clip(-(n[..., 0] * MOON[0] + n[..., 1] * MOON[1]), 0, 1)     # the side turned from the moon
    damp = wood & (along < 0.35 + away * 0.5 + (vn(arc * 5, 1) - 0.5) * 0.3)
    img[damp] = img[damp] * np.array([0.78, 0.78, 0.82])                   # the wet of the ground drawn up into it
    mossy = wood & (M == 2) & ~side & (vn(px * 5, py * 5) > 0.86) & (pz < 0.12)   # a trace of moss low in the creases
    img[mossy] = R_MOSS[np.clip(((v[mossy] * 0.45 + (fine[mossy] - 0.5) * 0.1) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 4)]
    lit_side = np.clip(n[..., 0] * MOON[0] + n[..., 1] * MOON[1], 0, 1)
    rootm = wood & (M == 2)
    low = np.clip(1 - pz / 0.17, 0, 1)
    img[rootm] = img[rootm] * (1 - low[rootm] * 0.35)[:, None]             # darker as it goes under
    LITTER = ramp("#2a1712", "#45281a", "#5e3820", "#784a28", "#95602f")
    reach_ = np.hypot(px, py) / (info["r"] * 1.3 + 2.8)
    over = rootm & (vn(px * 9 + 2, py * 9) > 0.78 - low * 0.35 - np.clip(reach_ - 0.5, 0, 1) * 0.5)
    img[over] = LITTER[np.clip((v[over] * 0.9 * len(LITTER)).astype(int), 0, len(LITTER) - 1)]
    lich = wood & ~mossy & ~cord & (lit_side > 0.2) & (vn(arc * 4 + 9, along * 2.5) > 0.83) & (pz < 12)
    img[lich] = img[lich] * np.array([0.92, 1.0, 0.92])                   # faint grey-green lichen on the pale skin
    # the scars where limbs fell, as beech carries them: a dark oval with a raised lip lit on its upper side, and the
    # chevron "brow" above it; on the god's veins they look back like eyes
    rs = np.random.default_rng(info["seed"] + 13)
    circ = 2 * np.pi * info["r"]
    for k in range(int(rs.integers(2, 5))):
        a_s, z_s = rs.uniform(-0.6, 0.9) * info["r"], rs.uniform(4.5, 15.0)    # mostly on the side we see
        w_s = rs.uniform(0.2, 0.3)
        da = ((arc - a_s + circ / 2) % circ) - circ / 2
        dz = along - z_s
        e = (da / w_s) ** 2 + (dz / (w_s * 0.55)) ** 2
        hole = bole & (e < 1.0)
        lip = bole & (e >= 1.0) & (e < 2.0)
        img[lip] = np.minimum(img[lip] * np.where(dz[lip] > 0, 1.28, 0.7)[:, None], 1)
        img[hole] = R_BARK[1] * np.where(e[hole] < 0.45, 0.55, 0.9)[:, None]
        brow = bole & (np.abs(da) < w_s * 1.7) & (np.abs(dz - (w_s * 0.85 + np.abs(da) * 0.4)) < 0.05)
        img[brow] = img[brow] * 0.72
    # the skin's stretch: faint wrinkles across it, closest at the foot and round the scars
    wrin = bole & (np.sin(along * 38 + vn(arc * 2, along * 0.6) * 9) > 0.93) & (vn(arc * 3, along * 0.8) > 0.45 + np.clip(along / 12, 0, 0.4))
    img[wrin] = img[wrin] * 0.86
    # heart-rot: a hollow opened at the foot, black inside, its lip lit and the wood round it softened
    if info["cav"]:
        da = np.abs(((ang - info["cav_ang"] + np.pi) % (2 * np.pi)) - np.pi)
        shape = da * info["r"] / 0.38 + (pz / info["cav_h"]) ** 2
        hole = bole & (shape < 1.0) | (side & (pz <= 0.9) & (shape < 1.0) & (d < info["r"] * 1.6))
        lip = (bole | side) & (shape >= 1.0) & (shape < 1.35)
        img[lip] = np.minimum(img[lip] * 1.3 + 0.03, 1)
        inside = hole & (shape < 0.75)
        img[hole] = np.array([0.05, 0.035, 0.03])
        img[inside] = np.array([0.02, 0.015, 0.015])
        punk = lip & (vn(ang * 30, pz * 30) > 0.6)
        img[punk] = ramp("#341a10", "#4f2817", "#6c3a20")[1]
    img = rim(img, mask, C, 1.2)
    img, mask, n = taper_lean(img, mask, n, C, info)
    # the canopy swallows it: from 9 yards up the bole darkens into the crown's shade and dissolves through the
    # dither, gone by 15; no top is ever seen, and a far trunk does not run across the frame
    from kit import KZ
    fy = C["foot"][1]
    yy = np.arange(mask.shape[0])[:, None] * np.ones((1, mask.shape[1]))
    zrow = (fy - yy) / KZ
    k = np.clip((zrow - 9.0) / 6.0, 0, 1)
    img = img * (1 - k[..., None] * 0.55) + np.array([0.04, 0.04, 0.06]) * k[..., None] * 0.55
    bay = B4[(yy.astype(int)) % 4, np.arange(mask.shape[1])[None, :] % 4]
    mask = mask & (k < 1 - bay * 0.999)
    meta = dict(kind="tree/towering", height=HGT, radius_yd=float(info["r"]), sway=0.0,
                posts=[[0.0, 0.0, round(info["r"] * 1.3, 3)]], cover=HGT, material="wood_living", hp=None,
                lightning_rod=True, crown="above")
    return img, mask, n, C, meta


def veins(info, arc, along):
    """distance (in cord-widths) to the nearest vein, and which side of it (-1 the lit side .. +1 the far side); the
    veins drawn once in the bole's own (arc, height) sheet and looked up"""
    rr = np.random.default_rng(info["seed"] + 77)
    r = info["r"]
    circ = 2 * np.pi * r
    RES = 0.02
    nA, nZ = int(circ / RES) + 1, int(24.0 / RES) + 1
    D = np.full((nZ, nA), 9.0)
    S = np.zeros((nZ, nA))
    gz, ga = np.mgrid[0:nZ, 0:nA].astype(float) * RES
    def cord(a0, z0, z1, w0, depth):
        a, z = a0, z0
        while z < z1:
            a += rr.normal(0, 0.012) + np.sin(z * 0.7 + a0) * 0.004
            w = w0 * (1 - (z - z0) / max(z1 - z0, 1e-3) * 0.4)
            j0, j1 = int(max((z - 0.3) / RES, 0)), int(min((z + 0.3) / RES, nZ - 1))
            da = ((ga[j0:j1] - a + circ / 2) % circ) - circ / 2
            dd = np.hypot(da, (gz[j0:j1] - z) * 0.35) / w
            m = dd < D[j0:j1]
            D[j0:j1] = np.where(m, dd, D[j0:j1])
            S[j0:j1] = np.where(m, np.sign(da), S[j0:j1])
            z += 0.05
            if depth < 1 and rr.random() < 0.004:                       # it branches as it climbs
                cord(a + rr.choice([-1, 1]) * w * 0.8, z, min(z + rr.uniform(2, 7), 24.0), w * 0.7, depth + 1)
    for k in range(int(rr.integers(4, 6))):
        cord(rr.uniform(0, circ), 0.0, rr.uniform(10, 24), rr.uniform(0.065, 0.11), 0)
    ai = np.clip(((arc % circ) / RES).astype(int), 0, nA - 1)
    zi = np.clip((along / RES).astype(int), 0, nZ - 1)
    return D[zi, ai], S[zi, ai]


def taper_lean(img, mask, n, C, info):
    from kit import KZ
    fx, fy = C["foot"]
    H_, W_ = mask.shape
    rr = np.random.default_rng(info["seed"] + 5)
    lean = rr.uniform(-1, 1) * 0.6                                       # yards of lean at the top of the frame
    bend = rr.uniform(-1, 1) * 0.35
    out_i, out_m, out_n = np.zeros_like(img), np.zeros_like(mask), np.zeros_like(n)
    xs = np.arange(W_)
    for y in range(H_):
        z = (fy - y) / KZ                                                # height of the bole at this row (yards)
        if z < 2.0:
            out_i[y], out_m[y], out_n[y] = img[y], mask[y], n[y]
            continue
        f = (z - 2.0) / 22.0
        s_ = 1.0 - 0.28 * f                                              # narrower as it climbs
        off = (lean * f + bend * np.sin(f * np.pi)) * 18.0
        src = np.round(fx + (xs - fx - off) / s_).astype(int)
        ok = (src >= 0) & (src < W_)
        out_i[y][ok], out_m[y][ok], out_n[y][ok] = img[y][src[ok]], mask[y][src[ok]], n[y][src[ok]]
    return out_i, out_m, out_n


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "giants"
    for s in (1, 2, 3):
        F, info = make(s)
        img, mask, n, C, meta = render(F, info)
        export("giant_%d" % s, out, img, mask, n, C, F, meta, shadow=False)
        print("giant", s, img.shape)
