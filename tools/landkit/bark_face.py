"""The Blind Face (landkit): a face grown over centuries in a vein-tree's bark, a landmark of the Hollow Wood ("the
Ribcage Bough, the Blind Face, the Niche Candle, the Sword-in-Root"). Brow, cheekbones, a nose ridge, a mouth half open,
a chin, and no eyes: the bark has healed smooth where they should be.

It is grown, not carved (chapter 5, chapter 6): bark pushed out over a swelling stretches smooth and pale, and stays
fissured in the hollows between, so the fissures flow round the features. FORM IS LAW: the face is relief on the trunk,
ray-marched in the trunk's own canonical frame (vein_tree.Warp), so it sits exactly on the warped bark; the mouth is a
real cavity, and the relief shades itself (it casts its own shadow under the moon's raking light).
The god, subtle: under the healed eyes, the faint blue-grey of veins beneath the bark; deep in the mouth, a wet gleam.

  draw(img, zb, dep_scene, to_px, canon, tree, a0c, zc, T, lights, moon, moonlit, seed)
      canon(x, y, z) -> canonical (x, y) of the tree (its lean and warp undone); tree: (cx, cy, R, seed, g0);
      a0c: the face's facing angle in the canonical frame; zc: the face's centre height (absolute)
"""
import numpy as np
from kit import vn, ramp
import vein_tree as vt
import bark

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)
HU, HW = 0.8, 1.55                                  # the face's half-width (across the bark) and half-height, yards
R_ROT = ramp("#060303", "#100908", "#1b110c", "#281a12")
VEIN = np.array([0.4, 0.45, 0.56])


def relief(u, w):
    """the face, grown from tree parts (chapter 7), in yards proud of the bark (negative: sunk); u across, w up, -1..1.
    Returns (f, eyes, mouth, lips, smooth, seam): the healed scars, the mouth's opening, its lips, where the bark is
    stretched smooth, and the seams where the scars closed"""
    edge = np.clip(1 - (np.abs(u) ** 2.2 + np.abs(w) ** 2.2), 0, 1)          # it recedes into the trunk at every edge
    f = -0.025 * np.sqrt(edge)                                             # the bark folding in round it, not swelling out
    eyes = np.zeros(u.shape, bool)
    seam = np.zeros(u.shape, bool)
    smooth = np.zeros(u.shape, bool)
    # THE EYES: two old branch scars, healed over. Asymmetric: the left higher and larger. A sunken oval, long along
    # the grain, ringed by a roll of woundwood, closed in the middle to a seam
    for (cu, cw, ru, rw, tilt) in ((-0.34, 0.36, 0.17, 0.2, 0.25), (0.31, 0.24, 0.14, 0.16, -0.35)):
        uu, ww = u - cu, w - cw
        uu, ww = uu * np.cos(tilt) - ww * np.sin(tilt), uu * np.sin(tilt) + ww * np.cos(tilt)
        e = np.sqrt((uu / ru) ** 2 + (ww / rw) ** 2)
        f = f - 0.07 * np.clip(1 - e, 0, 1) ** 0.7                          # the hollow
        f = f + 0.045 * np.exp(-((e - 1.0) / 0.22) ** 2)                    # the roll of woundwood round it
        eyes |= e < 1.25
        smooth |= (e > 0.7) & (e < 1.3)
        seam |= (np.abs(ww) < 0.022) & (np.abs(uu) < ru * 0.75)            # where the bark closed: a seam
        # THE GRIEF FOLD above each: a roll of woundwood rising toward the middle
        fu = (u - cu) / (ru * 1.6)
        fw = w - (cw + rw * 1.25 + 0.1 * np.sign(-cu) * (u - cu) * 1.4)    # inner ends higher: grief, not a frown
        f = f + 0.05 * np.exp(-(fw / 0.06) ** 2) * np.clip(1 - fu ** 2, 0, 1)
    # THE NOSE: a vein-ridge running down from between the scars, narrow, long, a little crooked
    nu = u - 0.02 - 0.04 * (0.3 - w)
    nose = np.exp(-(nu / 0.06) ** 2) * np.clip((0.3 - w) / 0.15, 0, 1) * np.clip((w + 0.22) / 0.08, 0, 1)
    f = f + 0.05 * nose
    # gaunt cheeks, one small burl (the right)
    for sg in (-1, 1):
        f = f - 0.03 * np.exp(-(((u - sg * 0.32) / 0.15) ** 2 + ((w + 0.08) / 0.2) ** 2))
    f = f + 0.04 * np.exp(-(((u - 0.42) / 0.1) ** 2 + ((w - 0.0) / 0.09) ** 2))
    smooth |= np.exp(-(((u - 0.42) / 0.1) ** 2 + (w / 0.09) ** 2)) > 0.5
    # THE MOUTH: a hollow, long and sagging, crooked (a moan), its lips rolled woundwood, the lower one hanging
    mu = (u - 0.06 + 0.08 * (w + 0.5)) / 0.2
    mc = -0.5 - 0.06 * mu                                                   # crooked: one corner lower
    mw = (w - mc) / np.where(w < mc, 0.24, 0.16)                           # it sags: longer below than above
    mo = mu ** 2 + mw ** 2
    mouth = mo < 1.0
    rm = np.sqrt(mo)
    lips = (~mouth) & (rm < 1.45)
    f = f + 0.05 * np.exp(-((rm - 1.15) / 0.18) ** 2) * (1 + 0.6 * (w < mc)) * (~mouth)
    smooth |= lips
    f = np.where(mouth, -0.06 - 0.4 * np.sqrt(np.clip(1 - mo, 0, 1)), f)
    return f * np.clip(edge * 4, 0, 1), eyes, mouth, lips, smooth, seam


def draw(img, zb, dep_scene, to_px, canon, tree, a0c, zc, T, lights, moon, moonlit=0.6, seed=1, ambient=0.12, tol=0.4,
         relief_fn=None, hu=None, hw=None, extra=None):
    """relief_fn(u, w) -> (f, eyes, mouth, lips, smooth, seam): any relief grown in the bark (default: the old face);
    hu, hw: its half-width and half-height; extra(col, u, w, vb, T) -> col: more paint (tears)"""
    relief_ = relief if relief_fn is None else relief_fn
    HU_ = HU if hu is None else hu
    HW_ = HW if hw is None else hw
    GH, GW = img.shape[:2]
    cx, cy, R, sd, g0 = tree
    ridges = vt._ridges(np.random.default_rng(sd))

    def local(P):
        X, Y = canon(P[..., 0], P[..., 1], P[..., 2])
        dx, dy = X - cx, Y - cy
        d = np.hypot(dx, dy)
        th = np.arctan2(dy, dx)
        u = (((th - a0c + np.pi) % (2 * np.pi)) - np.pi) * R / HU_
        w = (P[..., 2] - zc) / HW_
        lob = vt._lobe(th, ridges)
        inside = np.clip(1 - np.maximum(np.abs(u), np.abs(w)), 0, 1)
        rt = R * (1 + lob - 0.06) - vt._channels(th, sd, R) * 0.7                       # the bark's channels run on through the face
        f, eyes, mouth, lips, smooth, seam = relief_(u, w)
        return d - rt - f, u, w, th, (eyes, mouth, lips, smooth, f, seam)

    # the window round the face on screen
    a_w = a0c                                                             # (approximately: the warp turns it a little)
    pts = []
    for uu in (-1.2, 0, 1.2):
        for ww in (-1.2, 1.2):
            pts.append(to_px((cx + np.cos(a_w + uu * HU_ / R) * R * 1.3, cy + np.sin(a_w + uu * HU_ / R) * R * 1.3, zc + ww * HW_)))
    xs_, ys_ = [p[0] for p in pts], [p[1] for p in pts]
    x0, x1 = max(0, int(min(xs_) - 30)), min(GW, int(max(xs_) + 30))
    y0, y1 = max(0, int(min(ys_) - 10)), min(GH, int(max(ys_) + 10))
    if x0 >= x1 or y0 >= y1:
        return img
    ys, xs = np.mgrid[y0:y1, x0:x1]
    ox, oy = to_px((0.0, 0.0, 0.0))
    a_ = (xs + 0.5 - ox) / KX
    b_ = (ys + 0.5 - oy + zc * KZ) / KY
    O = np.dstack([(a_ + b_) / 2, (b_ - a_) / 2, np.full(xs.shape, zc)]) + VIEW * (R * 3.0)
    t = np.zeros(xs.shape)
    t_in = np.full(xs.shape, np.nan)
    hit = np.zeros(xs.shape, bool)
    for _ in range(150):
        P = O - VIEW * t[..., None]
        d, u, w, th, _x = local(P)
        t_in = np.where(np.isnan(t_in) & (d + _x[4] < 0), t, t_in)          # where it passed the bark's own line
        hit |= (d < 0.004) & ~hit
        t = np.where(hit, t, t + np.maximum(d * 0.4, 0.004))
        if (t > R * 7).all():
            break
    P = O - VIEW * t[..., None]
    d, u, w, th, (eyes, mouth, lips, smooth, f, seam) = local(P)
    region = hit & (np.abs(u) < 1.0) & (np.abs(w) < 1.0) & (t < R * 7)
    Pc = O - VIEW * np.fmin(t, np.where(np.isnan(t_in), t, t_in))[..., None]
    region &= (Pc[..., 0] + Pc[..., 1]) >= dep_scene[ys, xs] - tol
    region &= (P[..., 0] + P[..., 1]) > zb[ys, xs]
    if not region.any():
        return img
    eps = 0.008
    g = []
    for ax in range(3):
        dv = np.zeros(3)
        dv[ax] = eps
        g.append(local(P + dv)[0] - local(P - dv)[0])
    N = np.stack(g, -1)
    N = N / (np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9)
    # the moon rakes across it; the relief shadows itself
    sh = np.zeros(xs.shape, bool)
    Q = P + N * 0.01
    for k in range(1, 14):
        sh |= local(Q + moon * (k * 0.035))[0] < 0
    ndl = np.clip((N * moon).sum(-1), 0, 1)
    deep = np.clip(-f / 0.3, 0, 1)
    v = (ambient + 0.06) * (1 - deep * 0.85) + ndl * moonlit * np.where(sh, 0.3, 1.0) * (1 - deep) * 0.7   # soft light: read by its darks
    for (lp, lc, reach) in lights:
        lv = np.array(lp) - P
        ld = np.linalg.norm(lv, axis=-1)
        v = v + np.clip((N * lv).sum(-1) / (ld + 1e-6), 0, 1) / (1 + (ld / reach) ** 2) * 0.8 * (1 - deep)
    # the bark: fissures along the grain, flowing round the features, gone where it is stretched smooth over them
    arc = th * R
    grain = vn(arc * 15.0 + P[..., 2] * 0.35 + f * 20, P[..., 2] * 1.6)
    furrow = (grain < 0.3) & ~smooth
    vb = np.clip(v * 0.85 + 0.08 + smooth * 0.05 - furrow * 0.16 + (vn(arc * 3, P[..., 2] * 0.6) - 0.5) * 0.05, 0, 0.99)
    col = bark.R_BARK[(vb * len(bark.R_BARK)).astype(int)]
    col = np.where(seam[..., None], col * 0.45, col)                         # the closed seams: dark lines
    # round the healed scars: veins, blue-grey, blurred, branching (chapter 3 section 4)
    for (cu, cw) in ((-0.34, 0.36), (0.31, 0.24)):
        ex, ey = (u - cu) / 0.22, (w - cw) / 0.24
        er = np.hypot(ex, ey)
        vein = (np.abs(np.sin(np.arctan2(ey, ex) * 4 + er * 5 + vn(ex * 2 + cu, ey * 2) * 4)) < 0.2) & (er < 1.5) & (er > 1.0)
        col = np.where(vein[..., None], col * 0.75 + VEIN * vb[..., None] * 0.35, col)
    # sap, dark as blood, drooling from the mouth's low corner down the bark
    du = u - (0.06 + 0.17) - np.sin(w * 9) * 0.015
    drool = (np.abs(du) < 0.03 + 0.02 * np.clip(-0.62 - w, 0, 1)) & (w < -0.6) & (w > -1.0) & ~mouth
    col = np.where(drool[..., None], bark.SAP[np.clip(((v * 0.7 + 0.1) * len(bark.SAP)).astype(int), 0, len(bark.SAP) - 1)], col)
    # the mouth: rot dark with depth; far in, something wet
    rot = R_ROT[np.clip(((v * 0.8 + (1 - deep) * 0.2) * len(R_ROT)).astype(int), 0, len(R_ROT) - 1)]
    gleam = mouth & (deep > 0.6) & (vn(u * 30 + np.sin(2 * np.pi * T) * 0.4, w * 30) > 0.78)
    rot = np.where(gleam[..., None], np.array([0.36, 0.09, 0.09]), rot)
    col = np.where(mouth[..., None] & (f < -0.03)[..., None], rot, col)
    grown = (np.abs(f) > 0.003) | seam                                                   # only where it rises or sinks: no patch
    if extra is not None:
        col0 = col.copy()
        col = extra(col, u, w, vb, T)
        grown |= np.any(np.abs(col - col0) > 1e-6, axis=-1)
    region &= grown
    sub = img[ys, xs]
    sub[region] = np.clip(col[region], 0, 1)
    img[ys, xs] = sub
    zsub = zb[ys, xs]
    zsub[region] = (P[..., 0] + P[..., 1])[region]
    zb[ys, xs] = zsub
    return img
