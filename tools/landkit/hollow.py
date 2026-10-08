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
THROAT = hexc("#3a0a0c")
FLAME = (np.array([1.0, 0.93, 0.66]), np.array([1.0, 0.66, 0.24]), np.array([0.8, 0.3, 0.08]))


def _frame(u):
    u3 = np.array([u[0], u[1], 0.0]) / np.linalg.norm(u)
    e1 = np.array([-u3[1], u3[0], 0.0])
    return u3, e1


def _sdf(Q, W, H, D, kind, candles):
    """Q (..., 3) in the hollow's frame: (out of the bark, across, up). Returns (distance, part):
    part 1 lip, 2 cavity wall, 3 floor, 4 candle, 0 the bark plane"""
    xu, xe, xz = Q[..., 0], Q[..., 1], Q[..., 2]
    Hm = np.where(xz < 0, H * (1.45 if kind == "mouth" else 1.0), H)               # the mouth's lower lip sags
    if kind == "mouth":
        Hm = Hm * (1 - 0.18 * (xe / W) ** 2 * (xz > 0))                           # the upper lip's corners drawn down
    rho = np.sqrt((xe / W) ** 2 + (xz / Hm) ** 2)
    rl = min(W, H) * (0.34 if kind == "mouth" else 0.22)                             # the rolled woundwood, thick on the mouth
    dcurve = (rho - 1.0) * np.minimum(W, Hm)
    ring = np.sqrt(dcurve ** 2 + (xu - rl * 0.25) ** 2) - rl
    cd = D * 0.5
    k = np.sqrt(((xu + cd) / D) ** 2 + (xe / (W * 1.15)) ** 2 + (xz / (Hm * 1.15)) ** 2)
    cav = (k - 1.0) * min(D, W, H)
    outer = np.minimum(xu, ring)
    solid = np.maximum(outer, -cav)
    part = np.where(-cav > outer, 2, np.where(ring < xu, 1, 0))
    if kind == "niche":
        fl = np.maximum(xz + H * 0.62, xu)                                         # a flat floor inside, the sill
        part = np.where(fl < solid, 3, part)
        solid = np.minimum(solid, fl)
        for (ce, ch, cr) in candles:
            dz_ = xz - (-H * 0.62 + ch / 2)
            dc = np.maximum(np.hypot(xu + D * 0.42, xe - ce) - cr, np.abs(dz_) - ch / 2)
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
    if kind == "niche":
        for i, (ce, ch, cr) in enumerate(candles):
            fl = 1 + 0.18 * np.sin(T * 6.283 * 3 + i * 1.7) + 0.08 * np.sin(T * 6.283 * 7 + i)
            fp = C + u3 * (-D * 0.42) + e1 * ce + ez * (-H * 0.62 + ch + 0.05)
            flames.append((fp, fl))
            lv = fp - P
            ld = np.linalg.norm(lv, axis=-1)
            k_ = np.clip((N * lv).sum(-1) / (ld + 1e-6), 0, 1) ** 0.8 / (1 + (ld / (0.35 * fl)) ** 2)
            warm += k_[..., None] * np.array([1.0, 0.62, 0.26]) * 0.9
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
    rotv = np.clip(lum * 1.1 + (1 - inside) ** 2 * 0.28 + (vn(Q[..., 1] * 20 + seed, Q[..., 2] * 20) - 0.5) * 0.08, 0, 0.99)   # lit at the rim, dark deeper in
    rot = R_ROT[(rotv * len(R_ROT)).astype(int)]
    if kind == "mouth":                                                            # deep in the throat, something wet and red
        throat = np.clip((inside - 0.55) * 2.5, 0, 1)[..., None]
        rot = rot * (1 - throat * 0.6) + THROAT * np.clip(lum * 2.2 + 0.15, 0, 1)[..., None] * throat * 0.6
        gleam = (inside > 0.6) & (vn(Q[..., 1] * 40, Q[..., 2] * 40 + T * 0.6) > 0.8) & (lum > 0.04)
        rot = np.where(gleam[..., None], np.array([0.5, 0.16, 0.14]), rot)
    else:                                                                           # soot on the niche's roof over the flames
        soot = np.clip((Q[..., 2] - H * 0.2) / (H * 0.6), 0, 1) * (np.abs(Q[..., 1]) < W * 0.6)
        rot = rot * (1 - soot[..., None] * 0.6)
    col = np.where((part == 2)[..., None], np.minimum(rot * 1.0 + warm * 0.25, 1), col)
    flv = np.clip(lum * 1.05, 0, 0.99)
    col = np.where((part == 3)[..., None], R_ROT[(flv * len(R_ROT)).astype(int)] * 1.1, col)
    waxv = np.clip(lum * 1.2 + 0.05, 0, 0.99)
    col = np.where((part == 4)[..., None], R_WAX[(waxv * len(R_WAX)).astype(int)], col)
    if kind == "niche":                                                             # the wax run over the sill
        run = (part == 1) & (Q[..., 2] < -H * 0.6) & (np.abs(np.sin(Q[..., 1] * 31 + seed)) > 0.82)
        col = np.where(run[..., None], R_WAX[np.clip((waxv * 0.85 * len(R_WAX)).astype(int), 0, len(R_WAX) - 1)], col)
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
