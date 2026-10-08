"""A hollow in a standing trunk (landkit), ray-marched along the game's camera: the mouth and the Niche Candle of the
Blind Face (Derek 2026-10-07: "on a different tree, create a mouth that looks like a hollow"; "candles inside the
hollow of another tree with depth so you can see it glowing"). From chapter 5 and the real thing: heart rot hollows the
trunk where a limb tore off, and the tree rolls WOUNDWOOD round the opening, smooth lips of new bark folding in over the
edge, which is what makes a hollow look like a mouth. FORM IS LAW: the lips are a rolled tube, the cavity a real
ellipsoid with depth, the candles real cylinders, all lit through their normals.

The trunk's face is taken as a plane at the hollow (fine for an opening narrower than the trunk); the scene's own bark
shows wherever the ray meets that plane, and this draws only the lips, the cavity and what stands in it.

  draw(img, zb, dep_scene, to_px, C, u, W, H, D, T, lights, moon, kind, candles, seed, ambient, moonlit)
      C: the opening's centre on the bark (x, y, z); u: the trunk's outward normal (x, y); W, H: half-width and
      half-height of the opening; D: how deep; kind: "mouth" (wide, the lower lip sagging, a wet gleam deep in the
      throat) or "niche" (tall, with a floor); candles: [(across, height, radius)] on the niche's floor (yards);
      lights: [(xyz, rgb, reach)]; returns (img, flames) with flames [(xyz, brightness)] for the scene's own lights
"""
import numpy as np
from kit import vn, ramp, hexc

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)
R_LIP = ramp("#17141a", "#28222a", "#3c3438", "#544a4a", "#6e625d", "#8a7c72", "#a69686")     # woundwood: smooth new bark
R_ROT = ramp("#070404", "#120a08", "#1e120c", "#2c1a10", "#3c2414", "#4e301a")                # punky heart rot
R_WAX = ramp("#2a241c", "#4a4032", "#6e604a", "#968466", "#bba684", "#d8c6a2")
R_REDWAX = ramp("#1c0507", "#36090d", "#560f14", "#78181c", "#9a2426", "#b83a36")     # red altar wax
R_SLAB = ramp("#120f10", "#1e191a", "#2c2526", "#3c3233", "#4e4241", "#62534f")      # the altar's stone
THROAT = hexc("#3a0a0c")
FLAME = (np.array([1.0, 0.93, 0.66]), np.array([1.0, 0.66, 0.24]), np.array([0.8, 0.3, 0.08]))


def _frame(u):
    u3 = np.array([u[0], u[1], 0.0]) / np.linalg.norm(u)
    e1 = np.array([-u3[1], u3[0], 0.0])
    return u3, e1


def rune_mask(xe, xz, rho, W, H):
    """a band of runes round the arch (Derek: "carve a ring of dark runes into the flesh of the tree around the
    hollow"): a hand's width outside the lips, following the arch exactly (the jambs, then the two lancet arcs meeting
    over the point), down both sides to the sill. Each glyph is strokes cut in the old way, standing across the band:
    a stem, a branch, a cross-stroke, a chevron; chosen glyph by glyph, no two neighbours alike"""
    ax_ = np.abs(xe)
    dist = np.where(xz < 0, ax_ - W, np.hypot(ax_ + 1.5 * W, xz) - 2.5 * W)       # how far outside the opening
    n = (dist - 0.32) / 0.12                                                       # across the band: -1 .. 1 (5 px tall: a rune must be pixels)
    t = np.where(xz < 0, xz, np.arctan2(xz, ax_ + 1.5 * W) * 2.5 * W)              # along the band, yards, up each side
    cw = 0.22                                                                      # a glyph, about 4 px wide
    cell = np.floor(t / cw) + (xe < 0) * 1000
    a = (t / cw - np.floor(t / cw)) - 0.5                                          # along the glyph: -0.5 .. 0.5
    h = (np.sin(cell * 12.9898) * 43758.5453) % 1.0
    h2 = (np.sin(cell * 78.233 + 1.3) * 12543.211) % 1.0
    lw = 0.2                                                                       # a stroke, a whole pixel
    stem = np.abs(a - (h - 0.5) * 0.25) < lw
    br = np.where(h2 < 0.25, np.abs(a - 0.5 * (n - 0.1)) < lw,
         np.where(h2 < 0.5, (np.abs(a + 0.5 * (n - 0.2)) < lw) & (n > -0.3),
         np.where(h2 < 0.75, np.abs(n - (h - 0.5) * 0.9) < lw * 2.0,
                  (np.abs(np.abs(a) - 0.45 * np.abs(n)) < lw) & (n > 0))))
    gap = np.abs(a) > 0.4                                                          # space between glyphs
    return (np.abs(n) < 0.95) & (stem | br) & ~gap & (xz > -H * 0.66)


def _sdf(Q, W, H, D, kind, candles):
    """Q (..., 3) in the hollow's frame: (out of the bark, across, up). Returns (distance, part):
    part 1 lip, 2 cavity wall, 3 floor, 4 candle, 0 the bark plane"""
    xu, xe, xz = Q[..., 0], Q[..., 1], Q[..., 2]
    Hm = np.where(xz < 0, H * (1.45 if kind == "mouth" else 1.0), H)               # the mouth's lower lip sags
    if kind == "mouth":
        Hm = Hm * (1 - 0.18 * (xe / W) ** 2 * (xz > 0))                           # the upper lip's corners drawn down
    rho = np.sqrt((xe / W) ** 2 + (xz / Hm) ** 2)
    if kind == "altar":                                                            # a pointed arch (Derek): straight jambs, an equilateral arch
        Ht = 2.0 * W                                                                 # a lancet: arcs of 2.5 W, the apex sharp
        hw = np.where(xz < 0, W, np.sqrt(np.clip((2.5 * W) ** 2 - xz ** 2, 0, None)) - 1.5 * W)
        rho = np.maximum(np.abs(xe) / np.clip(hw, 1e-3, None), -xz / (H * 0.7))
        rho = np.where(xz > Ht, 9.0, rho)
        Hm = np.where(xz < 0, H * 0.7, Ht)
    rl = min(W, H) * (0.34 if kind == "mouth" else 0.22)                             # the rolled woundwood, thick on the mouth
    dcurve = (rho - 1.0) * np.minimum(W, Hm)
    ring = np.sqrt(dcurve ** 2 + (xu - rl * 0.25) ** 2) - rl
    cd = D * 0.5
    kv = 1.6 if kind == "altar" else 1.15                                          # the altar's arch, not the bowl, shapes its top
    k = np.sqrt(((xu + cd) / D) ** 2 + (xe / (W * (1.4 if kind == "altar" else 1.15))) ** 2 + (xz / (Hm * kv)) ** 2)
    cav = (k - 1.0) * min(D, W, H)
    if kind == "altar":                                                            # the cavity follows the arch straight back
        cav = np.maximum(cav, (rho - 1.0) * min(W, H) * 0.9)
    outer = np.minimum(xu, ring)
    rune = np.zeros(xu.shape, bool)
    if kind == "altar":
        rune = rune_mask(xe, xz, rho, W, H)                                        # a ring of runes cut round the arch
        outer = np.where(rune & (ring >= xu), np.minimum(xu + 0.05, ring), outer)        # the cut: the bark taken away 5 cm deep
    solid = np.maximum(outer, -cav)
    part = np.where(-cav > outer, 2, np.where(ring < xu, 1, np.where(rune & (xu < 0.002), 7, 0)))
    if kind in ("niche", "altar"):
        fl = np.maximum(xz + H * 0.62, xu)                                         # a flat floor inside, the sill
        part = np.where(fl < solid, 3, part)
        solid = np.minimum(solid, fl)
        if kind == "altar":                                                        # the altar: a stone slab set in the hollow
            sb = np.maximum(np.maximum(np.abs(xu + D * 0.5) - D * 0.28, np.abs(xe) - W * 0.62), np.abs(xz + H * 0.62 - 0.11) - 0.11)
            part = np.where(sb < solid, 5, part)
            solid = np.minimum(solid, sb)
            zf = -H * 0.62                                                         # CENTURIES OF WAX: mounds where it ran and set
            for k, (mu, me, rx, rz) in enumerate(((-0.12, -0.42, 0.13, 0.07), (-0.1, 0.4, 0.15, 0.08), (-0.2, -0.05, 0.12, 0.05),
                                                  (-0.3, 0.55, 0.1, 0.1), (-0.32, -0.56, 0.11, 0.09), (-0.06, 0.12, 0.09, 0.04))):
                km = np.sqrt(((xu - mu) / rx) ** 2 + ((xe - me) / rx) ** 2 + ((xz - zf) / rz) ** 2)
                dm = (km - 1.0) * min(rx, rz)
                part = np.where(dm < solid, 8, part)
                solid = np.minimum(solid, dm)
            for k in range(4):                                                     # stalagmites of wax where the drips fall
                de = (k - 1.5) * W * 0.36 + 0.04 * np.sin(k * 2.1)
                du = -D * (0.3 + 0.12 * (k % 2))
                hg = 0.1 + 0.05 * (k % 3)
                tz = np.clip((xz - zf) / hg, 0, 1)
                dd = np.maximum(np.hypot(xu - du, xe - de) - 0.035 * (1 - tz) - 0.004, np.maximum(zf - 0.02 - xz, xz - zf - hg))
                part = np.where(dd < solid, 8, part)
                solid = np.minimum(solid, dd)
            for k in range(4):                                                     # the sap seeping from the roof, setting as it falls
                de = (k - 1.5) * W * 0.36 + 0.04 * np.sin(k * 2.1)
                L_ = 0.08 + 0.05 * ((k * 37) % 5)
                top_ = (np.sqrt(max((2.5 * W) ** 2 - (abs(de) + 1.5 * W) ** 2, 0.0)) * 0.95) if kind == "altar" else H * 0.95
                tz = np.clip((top_ - xz) / L_, 0, 1)
                dd = np.hypot(xu + D * (0.3 + 0.12 * (k % 2)), xe - de) - 0.016 * (1 - tz) - 0.003
                dr = np.maximum(dd, np.maximum(xz - top_ - 0.3, top_ - L_ - xz))
                part = np.where(dr < solid, 6, part)
                solid = np.minimum(solid, dr)
        for c_ in candles:
            ce, ch, cr = c_[:3]
            cu = c_[3] if len(c_) > 3 else -D * 0.42
            cb = c_[4] if len(c_) > 4 else 0.0                                     # its base above the floor
            dz_ = xz - (-H * 0.62 + cb + ch / 2)
            dc = np.maximum(np.hypot(xu - cu, xe - ce) - cr, np.abs(dz_) - ch / 2)
            part = np.where(dc < solid, 4, part)
            solid = np.minimum(solid, dc)
    return solid, part


def draw(img, zb, dep_scene, to_px, C, u, W, H, D, T, lights, moon, kind="mouth", candles=(), seed=1, ambient=0.12,
         moonlit=0.6, tol=0.5, axis=None, rc=None):
    """axis, rc: the trunk's centre (x, y) and radius at the hollow; when given, the hollow wraps round the trunk's
    cylinder instead of a flat face (a wide mouth on a round trunk)"""
    GH, GW = img.shape[:2]
    C = np.array(C, float)
    u3, e1 = _frame(u)
    ez = np.array([0.0, 0.0, 1.0])
    sx0, sy0 = to_px(tuple(C))
    ox, oy = to_px((0.0, 0.0, 0.0))
    rx = int((W + D) * KX * 1.6) + 4
    ry = int((H + D) * KZ * 1.4) + 4
    y0_, y1_ = max(0, int(sy0 - ry)), min(GH, int(sy0 + ry))
    x0_, x1_ = max(0, int(sx0 - rx)), min(GW, int(sx0 + rx))
    if y0_ >= y1_ or x0_ >= x1_:
        return img, []
    ys, xs = np.mgrid[y0_:y1_, x0_:x1_]
    SX, SY = xs + 0.5, ys + 0.5
    a_ = (SX - ox) / KX
    b_ = (SY - oy + C[2] * KZ) / KY
    O = np.dstack([(a_ + b_) / 2, (b_ - a_) / 2, np.full(SX.shape, C[2])])        # on the camera ray, at the hollow's height
    span = (W + H + D) * 2.0
    O = O + VIEW * span                                                            # start in front, march away from the camera

    if axis is not None:
        ax_ = np.array(axis, float)
        a0 = np.arctan2(C[1] - ax_[1], C[0] - ax_[0])
        r0 = np.hypot(C[0] - ax_[0], C[1] - ax_[1]) if rc is None else rc

    def local(P):
        if axis is None:
            q = P - C
            return np.stack([(q * u3).sum(-1), (q * e1).sum(-1), (q * ez).sum(-1)], -1)
        dx, dy = P[..., 0] - ax_[0], P[..., 1] - ax_[1]
        rr = np.hypot(dx, dy)
        da = (np.arctan2(dy, dx) - a0 + np.pi) % (2 * np.pi) - np.pi
        return np.stack([rr - r0, da * r0, P[..., 2] - C[2]], -1)

    t = np.zeros(SX.shape)
    t_in = np.full(SX.shape, np.nan)                                               # where the ray passed into the trunk's face
    hit = np.zeros(SX.shape, bool)
    for _ in range(90):
        P = O - VIEW * t[..., None]
        Lq = local(P)
        t_in = np.where(np.isnan(t_in) & (Lq[..., 0] < 0), t, t_in)
        d, _p = _sdf(Lq, W, H, D, kind, candles)
        hit |= (d < 0.003) & ~hit
        t = np.where(hit, t, t + np.maximum(d * 0.8, 0.004))
        if (t > span * 2).all():
            break
    P = O - VIEW * t[..., None]
    Q = local(P)
    d, part = _sdf(Q, W, H, D, kind, candles)
    draw_m = hit & (part > 0) & (t < span * 2)
    depth = P[..., 0] + P[..., 1]
    Pin = O - VIEW * np.where(np.isnan(t_in), t, t_in)[..., None]
    d_in = np.where(part >= 2, Pin[..., 0] + Pin[..., 1], depth)                   # inside: seen through the opening
    draw_m &= d_in >= dep_scene[ys, xs] - tol
    draw_m &= depth > zb[ys, xs]
    if not draw_m.any():
        return img, []
    # normals from the distance field, in world space
    eps = 0.006
    grad = []
    for ax in range(3):
        dv = np.zeros(3)
        dv[ax] = eps
        dp, _ = _sdf(local(P + dv), W, H, D, kind, candles)
        dm, _ = _sdf(local(P - dv), W, H, D, kind, candles)
        grad.append(dp - dm)
    N = np.stack(grad, -1)
    N = N / (np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9)
    inside = np.clip(-Q[..., 0] / D, 0, 1)                                          # how deep in: the moon fades in the hollow
    # the light: the moon (fading inward), the lantern and fires, and the candles inside
    lit = np.clip((N * moon).sum(-1), 0, 1) * moonlit * (1 - inside) ** 2 * 0.9
    warm = np.zeros(SX.shape + (3,))
    for (lp, lc, reach) in lights:
        lv = np.array(lp) - P
        ld = np.linalg.norm(lv, axis=-1)
        k_ = np.clip((N * lv).sum(-1) / (ld + 1e-6), 0, 1) / (1 + (ld / reach) ** 2) * (1 - inside * 0.85)
        warm += k_[..., None] * np.array(lc)
    flames = []
    if kind in ("niche", "altar"):
        for i, c_ in enumerate(candles):
            ce, ch, cr = c_[:3]
            cu = c_[3] if len(c_) > 3 else -D * 0.42
            cb = c_[4] if len(c_) > 4 else 0.0
            fl = 1 + 0.18 * np.sin(T * 6.283 * 3 + i * 1.7) + 0.08 * np.sin(T * 6.283 * 7 + i)
            fp = C + u3 * cu + e1 * ce + ez * (-H * 0.62 + cb + ch + 0.05)
            if axis is not None:                                                    # on a wrapped hollow: round the trunk
                ang_ = a0 + ce / r0
                rad_ = r0 + cu
                fp = np.array([ax_[0] + np.cos(ang_) * rad_, ax_[1] + np.sin(ang_) * rad_, fp[2]])
            flames.append((fp, fl))
            lv = fp - P
            ld = np.linalg.norm(lv, axis=-1)
            k_ = np.clip((N * lv).sum(-1) / (ld + 1e-6), 0, 1) ** 0.8 / (1 + (ld / (0.35 * fl)) ** 2)
            warm += k_[..., None] * np.array([1.0, 0.62, 0.26]) * (0.9 if kind == "niche" else 0.2)
    v = ambient * (1 - inside * 0.7) + lit
    vw = v[..., None] * np.array([0.62, 0.68, 0.82]) + warm
    lum = np.clip(vw.mean(-1), 0, 0.99)
    col = np.zeros(SX.shape + (3,))
    # the lips: woundwood, smooth, folded in concentric rolls along the opening
    ang = np.arctan2(Q[..., 2] / H, Q[..., 1] / W)
    folds = np.sin(np.hypot(Q[..., 1] / W, Q[..., 2] / H) * 26 + vn(ang * 3 + seed, 1) * 3) * 0.05
    ndl = np.clip((N * moon).sum(-1), 0, 1)
    lipv = np.clip(0.2 + ndl * moonlit * 0.75 + warm.mean(-1) * 1.1 + folds + (vn(ang * 6, seed) - 0.5) * 0.05, 0, 0.99)   # pale like the bark it grew from
    col = np.where((part == 1)[..., None], R_LIP[(lipv * len(R_LIP)).astype(int)], col)
    base_v = np.clip(v.mean(-1) if v.ndim == 3 else v, 0, 1)
    rotv = np.clip(base_v * 1.1 + (1 - inside) ** 2 * 0.28 + (vn(Q[..., 1] * 20 + seed, Q[..., 2] * 20) - 0.5) * 0.08, 0, 0.99)   # lit at the rim, dark deeper in (the warm light tints it after)
    rot = R_ROT[(rotv * len(R_ROT)).astype(int)]
    if kind == "mouth":                                                            # deep in the throat, something wet and red
        throat = np.clip((inside - 0.55) * 2.5, 0, 1)[..., None]
        rot = rot * (1 - throat * 0.6) + THROAT * np.clip(lum * 2.2 + 0.15, 0, 1)[..., None] * throat * 0.6
        gleam = (inside > 0.6) & (vn(Q[..., 1] * 40, Q[..., 2] * 40 + T * 0.6) > 0.8) & (lum > 0.04)
        rot = np.where(gleam[..., None], np.array([0.5, 0.16, 0.14]), rot)
    else:                                                                           # soot on the niche's roof over the flames
        soot = np.clip((Q[..., 2] - H * 0.2) / (H * 0.6), 0, 1) * (np.abs(Q[..., 1]) < W * 0.6)
        rot = rot * (1 - soot[..., None] * 0.6)
    wt = warm / (1 + warm.mean(-1, keepdims=True))                                   # many flames: rolled off, never a flat glow
    col = np.where((part == 2)[..., None], np.minimum(rot + rot * wt * 2.2 + wt * 0.08, 1), col)   # the rot tinted near each flame
    flv = np.clip(lum * 1.05, 0, 0.99)
    col = np.where((part == 3)[..., None], R_ROT[(flv * len(R_ROT)).astype(int)] * 1.1, col)
    waxv = np.clip(lum * 1.2 + 0.05, 0, 0.99)
    WR = R_REDWAX if kind == "altar" else R_WAX
    drip = (part == 4) & (np.abs(np.sin(np.arctan2(Q[..., 1], Q[..., 0]) * 7 + seed)) > 0.8)   # drips down each candle
    col = np.where((part == 4)[..., None], WR[(waxv * len(WR)).astype(int)], col)
    col = np.where(drip[..., None], WR[np.clip(((waxv + 0.15) * len(WR)).astype(int), 0, len(WR) - 1)], col)
    if kind == "altar":                                                             # the slab, and the wax pooled over it
        sl_ = R_SLAB[np.clip((lum * 1.1 * len(R_SLAB)).astype(int), 0, len(R_SLAB) - 1)]
        pooled = (Q[..., 2] < -H * 0.62 + 0.19) & (vn(Q[..., 1] * 18 + seed, Q[..., 0] * 18) > 0.5)   # wax run down the slab's face
        col = np.where((part == 5)[..., None], np.where(pooled[..., None], WR[np.clip((waxv * 0.9 * len(WR)).astype(int), 0, len(WR) - 1)], sl_), col)
        # THE RUNE SPIRAL cut into the slab's top: a spiral of runes, blood dried in its grooves, bone stuck to it
        su, se = (Q[..., 0] + D * 0.5) / 0.55, Q[..., 1] / W
        rs_ = np.hypot(se, su * 1.6)
        ths = np.arctan2(su * 1.6, se)
        arm = ((rs_ / 0.11) - ths / (2 * np.pi)) % 1.0
        on_top = (part == 5) & (Q[..., 2] > -H * 0.62 + 0.19)
        groove = on_top & (rs_ < 0.5) & (np.abs(arm - 0.5) > 0.36) & (np.sin(ths * 11 + rs_ * 20) > -0.55)   # broken into runes
        tick = on_top & (rs_ < 0.5) & (np.abs(arm - 0.5) > 0.2) & (np.abs(np.sin(ths * 11 + rs_ * 20)) < 0.12)
        mark = groove | tick
        bloodc = np.array([0.2, 0.02, 0.03]) * np.clip(lum * 2 + 0.3, 0.3, 1.2)[..., None]
        col = np.where(mark[..., None], bloodc, col)
        bone = on_top & (rs_ < 0.55) & (vn(Q[..., 1] * 60 + seed, Q[..., 0] * 60) > 0.86)
        col = np.where(bone[..., None], np.array([0.72, 0.67, 0.56]) * np.clip(lum * 1.4 + 0.25, 0.3, 1)[..., None], col)
        wet_ = on_top & (rs_ < 0.6) & (vn(Q[..., 1] * 25, Q[..., 0] * 25 + 3) > 0.7) & ~mark
        col = np.where(wet_[..., None], col * 0.6 + np.array([0.18, 0.02, 0.03]), col)
        col = np.where((part == 6)[..., None], WR[np.clip(((waxv + 0.1) * len(WR)).astype(int), 0, len(WR) - 1)], col)
        wv8 = np.clip(waxv * 0.95 + (vn(Q[..., 1] * 30, Q[..., 2] * 30 + Q[..., 0] * 10) - 0.5) * 0.12, 0, 0.99)   # set wax, layer on layer
        col = np.where((part == 8)[..., None], WR[(wv8 * len(WR)).astype(int)], col)
        floorwax = (part == 3) & (vn(Q[..., 1] * 12, Q[..., 0] * 12 + seed) > 0.4)
        col = np.where(floorwax[..., None], WR[np.clip((waxv * 0.85 * len(WR)).astype(int), 0, len(WR) - 1)], col)
    if kind in ("niche", "altar"):                                                  # the wax run over the sill
        run = (part == 1) & (Q[..., 2] < -H * 0.6) & (np.abs(np.sin(Q[..., 1] * 31 + seed)) > (0.5 if kind == "altar" else 0.82))
        col = np.where(run[..., None], WR[np.clip((waxv * 0.85 * len(WR)).astype(int), 0, len(WR) - 1)], col)
    if kind == "altar":                                                             # the runes: cut dark into the flesh of the tree
        cutv = np.clip(lum * 0.5 + 0.05, 0, 0.99)
        flesh = np.array([0.13, 0.025, 0.03]) * (0.4 + cutv[..., None] * 1.2)            # dark: the raw flesh of the vein in the cut
        col = np.where((part == 7)[..., None], flesh, col)
    sub = img[ys, xs]
    sub[draw_m] = np.clip(col[draw_m], 0, 1)
    img[ys, xs] = sub
    zsub = zb[ys, xs]
    zsub[draw_m] = depth[draw_m]
    zb[ys, xs] = zsub
    # the flames: a teardrop of two or three pixels, white-gold at the core, flickering, seen only where not hidden
    for (fp, fl) in flames:
        fx, fy = to_px(tuple(fp))
        for dy_ in range(-3, 1):
            for dx_ in (-1, 0, 1):
                if abs(dx_) > (1 if dy_ > -2 else 0):
                    continue
                if dy_ < -2 and fl < 1.05:
                    continue
                ix, iy = int(round(fx + dx_)), int(round(fy + dy_))
                if 0 <= iy < GH and 0 <= ix < GW and fp[0] + fp[1] >= dep_scene[iy, ix] - tol:
                    c_ = FLAME[0] if (dx_ == 0 and dy_ in (-1, -2)) else (FLAME[1] if dx_ == 0 else FLAME[2])
                    img[iy, ix] = np.clip(c_ * min(fl, 1.1), 0, 1)
    return img, flames
