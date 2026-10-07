"""The woodcutter's stump (landkit), the Blind Face's first new piece. A vein-tree felled by axe, years ago, that still
bleeds. Lore: "I took the eleventh ... it ran red down the blade and warm over my wrists." Built from chapter 5 (cut
wood and stumps); FORM IS LAW: every facet, check, splinter, bore, wedge and chip is height in the world.

- THE SECTION is the vein-tree's own (vein_tree._ridges/_lobe): lobed, the buttress flare cut off by the cut plane;
- THE CUT: the notch floor low on the fall side, sloping out; the back cut higher; the hinge between them torn into
  splinters standing up; both faces a field of axe facets (cells long across the cut, each its own tilted plane);
- CHECKS from the heart outward, one opened into the split where the wedge still stands; the sapwood slumped below
  the heart, the bark rind a little proud at the rim, the heart dished;
- THE BORES: inside each big ridge (a vein) a dark open bore. Two still well up wet; the rest are dried to crust.
  The blood is traced downhill over the real surface, off the ledge, down the flare's grooves, to pool at the foot;
- one wedge dropped on the litter; the chips thrown on the fall side, greyed and sunk.

  stamp(X, Y, H, c, R, fall, seed, north, others, cut) -> (H, part, info)
      part: 0 none, 1 cut face, 2 bark, 3 hinge splinters, 4 iron, 5 chips; -1 roots (vein_tree's)
      info: g0, R, ridges, fall, lumens [(x, y, r, wet)], B (blood depth 0..1), DRY (0 wet .. 1 dry), cut
  paint(img, m, v, n, px, py, pz, part, info, moon) -> img
"""
import numpy as np
from kit import vn, fbm, ramp, hexc
import vein_tree as vt
import bark
import blood

R_GREY = ramp("#151519", "#232328", "#35343a", "#4a4849", "#625e5b", "#7d7770", "#9a9287", "#b4ab9d")   # weathered silver
R_SAP = ramp("#161716", "#242522", "#353530", "#48483f", "#5e5c51", "#777264")                         # soft sapwood, algae
R_IRON = ramp("#0c0b0d", "#18161a", "#262224", "#38302e", "#4e423b", "#6a5a4e")
R_RUST = ramp("#2a140c", "#4a2414", "#6e381c", "#924e26")
R_MOSS = ramp("#0e130c", "#1a2213", "#29331a", "#3b4522", "#50592c")
LICHEN = hexc("#8a9184")
LITTER = ramp("#100c0a", "#1e1612", "#2e2119", "#402e20", "#553d29")
BORE = hexc("#0d0405")
WETBORE = hexc("#2c0508")
STAIN = hexc("#3b1712")
HA = 0.15                                    # the hinge's place along the fall (in radii from the heart)


def _wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def _hash(k, s):
    return (np.sin(k * 12.9898 + s * 78.233) * 43758.5453) % 1.0


def section(px, py, info):
    """rn: the distance from the heart over the section's lobed outline; th the angle; a, b along and across the fall"""
    cx, cy = info["c"]
    R = info["R"]
    dx, dy = px - cx, py - cy
    d = np.hypot(dx, dy)
    th = np.arctan2(dy, dx)
    lob = vt._lobe(th, info["ridges"])
    rt = R * (1 + lob - 0.06)
    rout = rt
    f = info["fall"]
    return d / np.maximum(rout, 1e-3), th, (dx * f[0] + dy * f[1]) / R, (-dx * f[1] + dy * f[0]) / R


def stamp(X, Y, H, c, R=0.8, fall=(-1.0, 0.0), seed=111, north=(-0.7, -0.7), others=(), cut=0.58):
    RES = float(X[0, 1] - X[0, 0])
    x0, y0 = float(X[0, 0]), float(Y[0, 0])
    cx, cy = c
    g0 = float(H[int(round((cy - y0) / RES)), int(round((cx - x0) / RES))])
    trees = [(cx, cy, R, 0.0, seed)] + [tuple(t) for t in others]
    H_before = H.copy()
    H, tags = vt.stamp(X, Y, H, trees, north, seed=seed, only=[0])      # the species' roots and flare, braiding north
    part = np.where(tags == -1, -1, 0)
    rad = R * 4.5
    ia, ib = max(int((cy - rad - y0) / RES), 0), min(int((cy + rad - y0) / RES) + 1, X.shape[0])
    ja, jb = max(int((cx - rad - x0) / RES), 0), min(int((cx + rad - x0) / RES) + 1, X.shape[1])
    sl = (slice(ia, ib), slice(ja, jb))
    Xs, Ys, Hs = X[sl], Y[sl], H[sl].copy()
    fl = tags[sl] == 1
    H0 = H_before[sl]
    rr = np.random.default_rng(seed)
    ridges = vt._ridges(rr)                                             # the same draw vein_tree made: the same tree
    f = np.asarray(fall, float) / np.linalg.norm(fall)
    info = dict(c=(cx, cy), R=R, ridges=ridges, fall=f, cut=cut, g0=g0, seed=seed)
    rn, th, a, b = section(Xs, Ys, info)
    d = np.hypot(Xs - cx, Ys - cy)
    lob = vt._lobe(th, ridges)
    rt = R * (1 + lob - 0.06)
    rng = np.random.default_rng(seed + 1)
    # the stump's own flare, cut above the buttresses: a shoulder sweeping down into the roots, never a shelf
    flare = R * (1.1 + lob * 3.0)
    zfl = np.clip((flare - d) / np.maximum(flare - rt, 1e-3), 0, 1) ** 2.2 * (0.22 + lob * 1.1)
    Hs = np.where(fl, np.maximum(H0 + zfl, np.where(tags[sl] == -1, Hs, H0)), Hs)
    fl = fl & (zfl > 0.01)
    # ---- the cut: notch floor low and sloping out, the back cut higher and sloping out, the hinge between
    notch = a > HA + 0.04
    back = a < HA - 0.12
    zc = np.where(notch, cut - 0.14 - (a - HA) * 0.06 * R, np.where(back, cut - (HA - 0.12 - a) * 0.05 * R, cut))
    # axe facets: cells long across the cut, each a plane at its own tilt (chapter 5; chapter 4: planes, not domes)
    SA, SB = 0.36, 0.8
    ga = np.arange(-2.4, 2.5, SA)
    gb = np.arange(-2.4, 2.5, SB)
    seeds = np.array([(p + rng.uniform(-0.3, 0.3) * SA, q + rng.uniform(-0.3, 0.3) * SB) for p in ga for q in gb])
    tilt = rng.uniform(-0.26, 0.26, (len(seeds), 2)) * np.array([1.0, 0.4])
    off = rng.uniform(-0.02, 0.02, len(seeds))
    best = np.full(a.shape, 9e9)
    zf = np.zeros(a.shape)
    for k, (ca, cb) in enumerate(seeds):
        dd = ((a - ca) / SA) ** 2 + ((b - cb) / SB) ** 2
        w = dd < best
        best = np.where(w, dd, best)
        zf = np.where(w, tilt[k, 0] * (a - ca) * R + tilt[k, 1] * (b - cb) * R + off[k], zf)
    zc = zc + zf
    # the hinge torn: splinters standing up across the strip, each its own height
    hinge = ~notch & ~back
    kk = np.floor(b * R / 0.04)
    hv = _hash(kk, seed) * 0.6 + _hash(np.floor(a * R / 0.05) + kk * 3, seed + 1) * 0.4
    mid = np.clip(1 - np.abs(a - (HA - 0.04)) / 0.09, 0, 1)
    zc = np.where(hinge, cut + 0.04 + (0.35 + hv ** 2) * 0.22 * mid, zc)   # a crest of torn fibre, the stump's highest edge
    # the checks: from the heart outward, widest at the rim; one opened into the split
    split_ang = np.arctan2(-f[1], -f[0]) + 0.5
    angs = list(rng.uniform(-np.pi, np.pi, 3)) + [split_ang]
    split = np.zeros(a.shape, bool)
    for k, ak in enumerate(angs):
        is_split = k == len(angs) - 1
        r0 = 0.12 if is_split else rng.uniform(0.15, 0.5)
        tc = ak + 0.12 * np.sin(rn * 6 + k)
        lat = d * np.abs(_wrap(th - tc))
        wd = (0.035 + 0.03 * rn) if is_split else (0.012 + 0.018 * rn)
        ck = (lat < wd) & (rn > r0) & (rn < 1.05)
        zc = zc - ck * ((0.16 if is_split else 0.05) * np.clip(rn - r0 + 0.3, 0, 1) * (1 - lat / wd * 0.5))
        if is_split:
            split |= ck
    # the heart dished, the sapwood slumped below it (it rots first), the bark rind proud at the rim
    zc = zc - np.clip(1 - rn / 0.2, 0, 1) * 0.035
    zc = zc - ((rn > 0.78) & (rn < 0.95)) * 0.022 + (rn >= 0.95) * 0.012
    # the bores: one inside each big ridge, the vein's open lumen
    order_ = np.argsort(-ridges[2])
    lumens = []
    for k in order_[:5]:
        ang = ridges[0][k]
        r_at = R * (1 + ridges[2][k] - 0.06) * 0.9
        lx, ly = cx + np.cos(ang) * r_at, cy + np.sin(ang) * r_at
        lr = 0.07 + ridges[2][k] * 0.12
        lumens.append([lx, ly, lr, ((lx - cx) * f[0] + (ly - cy) * f[1]) / R])
        hole = np.hypot(Xs - lx, Ys - ly) < lr
        zc = np.where(hole, zc - 0.07, zc)
    wet_rank = sorted(range(len(lumens)), key=lambda i: -lumens[i][3])[:2]   # the two lowest, toward the notch, still weep
    lumens = [(l[0], l[1], l[2], i in wet_rank) for i, l in enumerate(lumens)]
    face = d <= rt
    Hs = np.where(face, g0 + zc, Hs)
    ps = part[sl].copy()
    ps[fl & ~face] = 2
    ps[face] = 1
    ps[face & hinge] = 3
    # ---- the wedge in the split, standing; its head mushroomed by the hammer
    sp = np.argwhere(split & face & (rn > 0.45) & (rn < 0.65))
    if len(sp):
        i_, j_ = sp[len(sp) // 2]
        wx, wy = Xs[i_, j_], Ys[i_, j_]
        u = np.array([np.cos(split_ang), np.sin(split_ang)])
        uu = (Xs - wx) * u[0] + (Ys - wy) * u[1]
        vv = -(Xs - wx) * u[1] + (Ys - wy) * u[0]
        body = (np.abs(uu) < 0.065) & (np.abs(vv) < 0.036)
        top = g0 + cut + 0.16 - np.clip((uu / 0.06) ** 2 + (vv / 0.034) ** 2, 0, 1) * 0.018 + uu * 0.08
        Hs = np.where(body, np.maximum(Hs, top), Hs)
        ps[body] = 4
        info["wedge"] = (wx, wy)
    # the dropped wedge, on the litter behind, half sunk
    q = np.array([cx, cy]) - f * R * 1.9 + np.array([-f[1], f[0]]) * 0.35
    ang = rng.uniform(-np.pi, np.pi)
    u = np.array([np.cos(ang), np.sin(ang)])
    uu = (Xs - q[0]) * u[0] + (Ys - q[1]) * u[1]
    vv = -(Xs - q[0]) * u[1] + (Ys - q[1]) * u[0]
    t_ = np.clip(uu / 0.2 + 0.5, 0, 1)
    body = (np.abs(uu) < 0.1) & (np.abs(vv) < 0.03 + 0.008 * (1 - t_))
    top = Hs + 0.004 + (1 - t_) * 0.045
    ps[body & (top > Hs)] = 4
    Hs = np.where(body, np.maximum(Hs, top), Hs)
    # ---- the chips, thrown on the fall side: flat slabs, tilted, greyed and sunk into the litter
    perp = np.array([-f[1], f[0]])
    for k in range(48):
        s = R * 1.05 + rng.gamma(2.0, 0.32)
        sd = rng.normal(0, 0.55)
        p = np.array([cx, cy]) + (f * np.cos(sd) + perp * np.sin(sd)) * s
        L = rng.uniform(0.08, 0.2)
        Wd = L * rng.uniform(0.35, 0.6)
        ca = rng.uniform(-np.pi, np.pi)
        u = np.array([np.cos(ca), np.sin(ca)])
        uu = (Xs - p[0]) * u[0] + (Ys - p[1]) * u[1]
        vv = -(Xs - p[0]) * u[1] + (Ys - p[1]) * u[0]
        el = (uu / (L / 2)) ** 2 + (vv / (Wd / 2)) ** 2 < 1
        if not el.any():
            continue
        tl = rng.uniform(-0.35, 0.35, 2)
        gz = float(np.median(Hs[el]))
        top = gz + rng.uniform(-0.005, 0.02) + tl[0] * uu + tl[1] * vv
        m = el & (top > Hs) & (ps == 0)
        Hs = np.where(m, top, Hs)
        ps[m] = 5
    # ---- the blood, traced downhill over the real surface from each bore, wet or long dried
    gy, gx = np.gradient(Hs, RES)
    B = np.zeros(Hs.shape)
    DRY = np.ones(Hs.shape)

    def splat(p, r, k, dry):
        jj, ii = (p[0] - Xs[0, 0]) / RES, (p[1] - Ys[0, 0]) / RES
        n_ = int(r / RES) + 2
        a0, a1 = max(int(ii) - n_, 0), min(int(ii) + n_ + 1, Hs.shape[0])
        b0, b1 = max(int(jj) - n_, 0), min(int(jj) + n_ + 1, Hs.shape[1])
        if a0 >= a1 or b0 >= b1:
            return
        w = (slice(a0, a1), slice(b0, b1))
        val = np.clip(1 - np.hypot(Xs[w] - p[0], Ys[w] - p[1]) / r, 0, 1) * k
        up = val > B[w]
        B[w] = np.where(up, val, B[w])
        DRY[w] = np.where(up, dry, DRY[w])

    for (lx, ly, lr, wet) in lumens:
        dry = 0.0 if wet else rng.uniform(0.75, 0.95)
        splat(np.array([lx, ly]), lr * 0.95, 0.75, dry)
        out = np.array([lx - cx, ly - cy])
        out /= np.linalg.norm(out)
        p = np.array([lx, ly]) + out * (lr + 0.03)
        h = out.copy()
        steps = 320 if wet else int(rng.uniform(40, 140))
        hist = []
        for k in range(steps):
            i_ = int(np.clip((p[1] - Ys[0, 0]) / RES, 0, Hs.shape[0] - 1))
            j_ = int(np.clip((p[0] - Xs[0, 0]) / RES, 0, Hs.shape[1] - 1))
            g = -np.array([gx[i_, j_], gy[i_, j_]])
            gn = np.linalg.norm(g)
            g = g / gn if gn > 0.04 else h
            h = h * 0.5 + g * 0.5
            h /= np.linalg.norm(h) + 1e-9
            p = p + h * 0.025
            splat(p, 0.022 + 0.02 * min(k / 50, 1), 0.75, dry)
            hist.append(p.copy())
            on_ground = ps[i_, j_] in (0, 5) and gn < 0.15
            stuck = len(hist) > 25 and np.linalg.norm(hist[-1] - hist[-25]) < 0.06
            if (on_ground and k > 8) or stuck:
                break
        if wet or k > 30:                                                   # where it stopped, it pooled
            reach = (0.17 if wet else 0.11) if on_ground else 0.05
            jj, ii = (p[0] - Xs[0, 0]) / RES, (p[1] - Ys[0, 0]) / RES
            n_ = int(reach * 2.4 / RES)
            a0, a1 = max(int(ii) - n_, 0), min(int(ii) + n_ + 1, Hs.shape[0])
            b0, b1 = max(int(jj) - n_, 0), min(int(jj) + n_ + 1, Hs.shape[1])
            w = (slice(a0, a1), slice(b0, b1))
            e = blood.edge(Xs[w], Ys[w], seed + int(lx * 7), reach)
            val = np.clip(1 - np.hypot(Xs[w] - p[0], Ys[w] - p[1]) / e, 0, 1) ** 1.1
            up = val > B[w]
            B[w] = np.where(up, val, B[w])
            DRY[w] = np.where(up, np.clip(dry + (1 - val) * 0.35, 0, 1), DRY[w])
    H = H.copy()
    H[sl] = Hs
    part[sl] = ps
    Bf = np.zeros(H.shape)
    Df = np.ones(H.shape)
    Bf[sl], Df[sl] = B, DRY
    info.update(lumens=lumens, B=Bf, DRY=Df)
    return H, part, info


def paint(img, m, v, n, px, py, pz, part, info, moon):
    if not m.any():
        return img
    rn, th, a, b = section(px, py, info)
    R, g0 = info["R"], info["g0"]
    v = 0.9 * (1 - np.exp(-np.clip(v, 0, None) * 1.4))                # the highlights rolled off, so a lit facet keeps its tone
    if part in (1, 3):
        var = (vn(a * 6 + 3, b * 2) - 0.5) * 0.06 + np.sin(rn * R * 38 + fbm(px * 3, py * 3) * 3) * 0.03   # growth zones
        gv = np.clip(0.03 + v * 0.8 + var, 0, 0.99)
        col = R_GREY[(gv * len(R_GREY)).astype(int)]
        sap = (rn > 0.78) & (rn < 0.95)
        col = np.where(sap[..., None], R_SAP[np.clip((gv * len(R_SAP)).astype(int), 0, len(R_SAP) - 1)], col)
        rind = rn >= 0.95
        col = np.where(rind[..., None], bark.R_BARK[np.clip((gv * 0.8 * len(bark.R_BARK)).astype(int), 0, len(bark.R_BARK) - 1)], col)
        heart = rn < 0.2
        col = np.where(heart[..., None], col * 0.8, col)
        if part == 3:                                                       # the torn hinge: silver fibres, dark between
            fib = vn(b * R * 26, pz * 9) < 0.35
            col = np.where(fib[..., None], col * 0.6, np.minimum(col * 1.12, 1))
        for (lx, ly, lr, wet) in info["lumens"]:
            dl = np.hypot(px - lx, py - ly)
            soak = np.clip(1 - (dl - lr) / (0.22 if wet else 0.12), 0, 1) ** 1.5 * (0.75 if wet else 0.45)
            col = col * (1 - soak[..., None]) + STAIN * np.clip(v * 1.6, 0.3, 1)[..., None] * soak[..., None]
            col = np.where((dl < lr)[..., None], WETBORE if wet else BORE, col)
            if wet:                                                     # the welling surface catches the light
                gl = (dl < lr * 0.8) & (vn(px * 40, py * 40) > 0.72) & (v > 0.3)
                col = np.where(gl[..., None], blood.WET * 0.75, col)
        back = a < HA - 0.12
        lich = back & (rn < 0.9) & (vn(px * 14 + 5, py * 14) > 0.8)          # crustose rosettes on the dry high face
        col = np.where(lich[..., None], LICHEN * np.clip(v * 1.3 + 0.15, 0.25, 1)[..., None], col)
        low = (a > 0.55) & (rn > 0.7) & (vn(px * 9, py * 9 + 4) > 0.5)        # moss on the low wet ledge's lip
        col = np.where(low[..., None], R_MOSS[np.clip((v * 0.8 * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)], col)
        img[m] = col[m]
    elif part == 2:
        along = pz - g0
        arc = th * R
        img, _ = bark.paint(img, m, np.zeros_like(m), np.clip(v * 0.78, 0, 0.99), n, arc, along, R, info["seed"], moon,
                            scars=False, top=4.0, dying=0.0, disease=0.6)
        fis = m & (vn(arc * 9.0 + 3, along * 1.4) < 0.3)                     # fissures along the grain, up the flare
        img[fis] = img[fis] * 0.62
        slough = m & ~fis & (vn(arc * 2.6 + 11, along * 3.5) > 0.7)          # bark fallen away in plates: grey wood
        img[slough] = R_GREY[np.clip((v[slough] * 0.7 * len(R_GREY)).astype(int), 0, len(R_GREY) - 1)]
        # contact: the litter banked over the foot, deeper on the side turned from the moon (rule 13)
        away = np.clip(-(n[..., 0] * moon[0] + n[..., 1] * moon[1]), 0, 1)
        bank = m & (along < 0.06 + away * 0.08 + (vn(px * 7, py * 7) - 0.5) * 0.08)
        lit = np.clip(v[bank] * 0.6, 0.05, 0.6)
        img[bank] = LITTER[np.clip((lit * len(LITTER)).astype(int), 0, len(LITTER) - 1)]
        leaf = bank & (vn(px * 30 + 1, py * 30) > 0.7)
        img[leaf] = img[leaf] * np.array([1.35, 1.1, 0.8])
    elif part == 4:
        iv = np.clip(v * 0.9, 0, 0.99)
        col = R_IRON[(iv * len(R_IRON)).astype(int)]
        rust = (vn(px * 30, py * 30 + pz * 10) > 0.55) | (n[..., 2] > 0.85) & (vn(px * 20, py * 20) > 0.4)
        col = np.where(rust[..., None], R_RUST[np.clip((iv * len(R_RUST)).astype(int), 0, len(R_RUST) - 1)], col)
        img[m] = col[m]
    elif part == 5:
        cv = np.clip(0.02 + v * 0.5 + (vn(px * 20, py * 20) - 0.5) * 0.08, 0, 0.99)
        col = R_GREY[(cv * len(R_GREY)).astype(int)]
        mossy = vn(px * 11 + 2, py * 11) > 0.62
        col = np.where(mossy[..., None], R_MOSS[np.clip((cv * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)], col)
        img[m] = col[m]
    return img


def paint_blood(img, px, py, B, DRY, light, T=0.0, look=None):
    """the blood over everything it ran on; B, DRY as looked up at each pixel's hit"""
    m = B > 0.04
    if not m.any():
        return img
    GH, GW = img.shape[:2]
    sy, sx = np.mgrid[0:GH, 0:GW]
    lt = np.clip(light[m], 0, 0.55)                                       # blood is dark: lit only so far (no ketchup)
    col = blood.shade(np.clip(B[m], 0, 1) * 0.62, px[m], py[m], sx[m], sy[m], T, DRY[m], light_side=lt, light=lt)
    img[m] = col
    return img
