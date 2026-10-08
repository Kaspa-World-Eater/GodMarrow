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
HU, HW = 1.05, 1.35                                  # the face's half-width (across the bark) and half-height, yards
R_ROT = ramp("#060303", "#100908", "#1b110c", "#281a12")
VEIN = np.array([0.4, 0.45, 0.56])


def relief(u, w):
    """the face, in yards proud of the bark (negative: sunk); u across, w up, both -1..1 over the face. Returns
    (f, eyes, mouth, lips, smooth): the healed eye-hollows, the mouth's opening, its lips, where the bark is stretched"""
    oval = np.clip(1 - (u ** 2 + (w * 0.95) ** 2), 0, 1)
    f = 0.06 * np.sqrt(oval)                                             # the whole face swelling out of the trunk
    wb = 0.40 + 0.09 * np.abs(u)                                          # the brow, frowning: low over the nose, rising out
    f = f + 0.13 * np.exp(-((w - wb) / 0.09) ** 2) * np.clip(1 - np.abs(u), 0, 1) ** 0.6
    eyes = np.zeros(u.shape, bool)
    for sg in (-1, 1):
        e = ((u - sg * 0.36) / 0.2) ** 2 + ((w - 0.2) / 0.12) ** 2
        f = f - 0.07 * np.exp(-e)                                         # the healed hollows: shallow, smooth
        eyes |= e < 1.3
        f = f + 0.07 * np.exp(-(((u - sg * 0.44) / 0.18) ** 2 + ((w + 0.02) / 0.12) ** 2))      # cheekbones
        f = f - 0.03 * np.exp(-(((u - sg * 0.38) / 0.16) ** 2 + ((w + 0.27) / 0.12) ** 2))      # hollow cheeks
    nose = np.exp(-(u / 0.08) ** 2) * np.clip((0.3 - w) / 0.1, 0, 1) * np.clip((w + 0.2) / 0.05, 0, 1)
    f = f + 0.11 * nose * (0.6 + np.clip(0.3 - w, 0, 1) * 0.8)
    f = f + 0.045 * np.exp(-((u / 0.11) ** 2 + ((w + 0.16) / 0.06) ** 2))                      # the nose's tip
    wm = -0.46 - 0.09 * u ** 2                                             # the mouth, half open, its corners drawn down
    mo = (u / 0.34) ** 2 + ((w - wm) / 0.085) ** 2
    mouth = mo < 1.0
    rm = np.sqrt(mo)
    lips = (~mouth) & (rm < 1.6)
    f = f + 0.06 * np.exp(-((rm - 1.18) / 0.2) ** 2) * (1 + 0.5 * (w < wm)) * (~mouth)      # the lips, the lower heavier
    f = np.where(mouth, -0.08 - 0.42 * np.sqrt(np.clip(1 - mo, 0, 1)), f)
    f = f + 0.07 * np.exp(-((u / 0.3) ** 2 + ((w + 0.84) / 0.12) ** 2))                       # the chin
    smooth = (f > 0.05) | eyes | lips
    return f * 1.5 * np.clip(oval * 3, 0, 1), eyes, mouth, lips, smooth            # bold enough to read at the far side of the glade


def draw(img, zb, dep_scene, to_px, canon, tree, a0c, zc, T, lights, moon, moonlit=0.6, seed=1, ambient=0.12, tol=0.4):
    GH, GW = img.shape[:2]
    cx, cy, R, sd, g0 = tree
    ridges = vt._ridges(np.random.default_rng(sd))

    def local(P):
        X, Y = canon(P[..., 0], P[..., 1], P[..., 2])
        dx, dy = X - cx, Y - cy
        d = np.hypot(dx, dy)
        th = np.arctan2(dy, dx)
        u = (((th - a0c + np.pi) % (2 * np.pi)) - np.pi) * R / HU
        w = (P[..., 2] - zc) / HW
        lob = vt._lobe(th, ridges)
        inside = np.clip(1 - np.maximum(np.abs(u), np.abs(w)), 0, 1)
        rt = R * (1 + lob - 0.06) - vt._channels(th, sd, R) * (1 - np.clip(inside * 4, 0, 1))   # stretched smooth over the face
        f, eyes, mouth, lips, smooth = relief(u, w)
        return d - rt - f, u, w, th, (eyes, mouth, lips, smooth, f)

    # the window round the face on screen
    a_w = a0c                                                             # (approximately: the warp turns it a little)
    pts = []
    for uu in (-1.2, 0, 1.2):
        for ww in (-1.2, 1.2):
            pts.append(to_px((cx + np.cos(a_w + uu * HU / R) * R * 1.3, cy + np.sin(a_w + uu * HU / R) * R * 1.3, zc + ww * HW)))
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
    d, u, w, th, (eyes, mouth, lips, smooth, f) = local(P)
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
    v = ambient * (1 - deep * 0.8) + ndl * moonlit * np.where(sh, 0.15, 1.0) * (1 - deep) * 0.95
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
    # under the healed eyes: veins, blue-grey, blurred, branching (chapter 3 section 4)
    for sg in (-1, 1):
        ex, ey = (u - sg * 0.36) / 0.2, (w - 0.2) / 0.12
        er = np.hypot(ex, ey)
        vein = (np.abs(np.sin(np.arctan2(ey, ex) * 4 + er * 5 + vn(ex * 2 + sg, ey * 2) * 4)) < 0.22) & (er < 1.4) & (er > 0.2)
        col = np.where(vein[..., None], col * 0.75 + VEIN * vb[..., None] * 0.35, col)
    # the mouth: rot dark with depth; far in, something wet
    rot = R_ROT[np.clip(((v * 0.8 + (1 - deep) * 0.2) * len(R_ROT)).astype(int), 0, len(R_ROT) - 1)]
    gleam = mouth & (deep > 0.6) & (vn(u * 30 + T * 0.4, w * 30) > 0.78)
    rot = np.where(gleam[..., None], np.array([0.36, 0.09, 0.09]), rot)
    col = np.where(mouth[..., None] & (f < -0.03)[..., None], rot, col)
    sub = img[ys, xs]
    sub[region] = np.clip(col[region], 0, 1)
    img[ys, xs] = sub
    zsub = zb[ys, xs]
    zsub[region] = (P[..., 0] + P[..., 1])[region]
    zb[ys, xs] = zsub
    return img
