"""The god's fang (landkit). Derek 2026-10-07: "a few large fangs busting through in a line"; "the teeth should run
horizontal with the gate built into them". The lore (a hermit of the Moor, cut in charcoal): "a ring of broken stones
there, shaped like teeth, round a pit of warm ash ... blood dried on the stones".

A true form, ray-marched along the game's camera (as eye.py), never a painted cone:
- the SHAPE: an oval section (a canine is thicker front to back than across), swelling a little above the gum, tapering
  to a point that hooks back as the spine bends, five low ridges running its length and a sharp keel (the carina) up
  its back; the tip snapped on most, the break rough and showing the dentin;
- the ENAMEL: old ivory, yellowing toward the root, the tip thin and glassy (light comes through it); fine growth lines
  ringing it (perikymata), long craze-lines up it, brown stain settled in its grooves, a crust of tartar at the gum;
  wet and glossy, a sharp highlight of the moon and of each warm light, a lit rim where it turns from the light;
- the BLOOD: it tore up through the skin, so the flesh's blood is smeared on its lower third and runs down it in
  threads that end in beads; fresh blood glossy and red-black, old blood crusted brown.

  sdf(p, f)                       signed distance to fang f (local: u toward the viewer, w across, z up from its base)
  heightfield(X, Y, f, base)      the tallest solid point over each ground cell (for the scene's shadows, collision)
  draw(img, zb, dep_scene, to_px, f, lights, moon, ambient)   ray-march and paint it in place

  f = make(centre_xy, base_z, height, R, seed, ax, perp)  (ax: the unit ground direction toward the viewer)
"""
import numpy as np
from kit import vn, ramp, skylit

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)

R_ENAMEL = ramp("#17141a", "#2a2629", "#433c38", "#5f5546", "#7f7258", "#9e8f6d", "#bcac86", "#d6c9a4")
R_DENTIN = ramp("#2a1f14", "#4a3721", "#6e5532", "#8f7346")
TARTAR = np.array([0.42, 0.38, 0.27])
BLOOD_FRESH = np.array([0.13, 0.015, 0.025])
BLOOD_OLD = np.array([0.12, 0.06, 0.04])
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.47


def h1_(seed):
    return np.random.default_rng(seed + 991).random()


def make(centre, base, height, R, seed, ax, perp):
    rr = np.random.default_rng(seed)
    return dict(c=np.array(centre, float), base=float(base), h=float(height), R=float(R), seed=int(seed),
                ax=np.array(ax, float), perp=np.array(perp, float),
                bend=rr.uniform(0.18, 0.3), lean=rr.choice([-1, 1]) * rr.uniform(0.08, 0.18),
                snap=rr.uniform(0.74, 0.92) if rr.random() < 0.7 else 1.0, twist=rr.uniform(0, 6.28),
                tilt=(rr.uniform(-0.6, 0.6), rr.uniform(-0.6, 0.6)), spall=rr.uniform(0, 6.28),
                split=rr.random() < 0.4, split_a=rr.uniform(-2.5, 2.5),
                runs=[(rr.uniform(-np.pi, np.pi), rr.uniform(0.14, 0.4), rr.uniform(0.012, 0.03)) for _ in range(6)])


def _local(p, f):
    d = p[..., :2] - f["c"]
    u = d[..., 0] * f["ax"][0] + d[..., 1] * f["ax"][1]
    w = d[..., 0] * f["perp"][0] + d[..., 1] * f["perp"][1]
    z = p[..., 2] - f["base"]
    return u, w, z


def _frame(u, w, z, f):
    h = f["h"]
    t = np.clip(z / h, 0, 1)
    du = u + f["bend"] * h * t ** 2.4                                    # the spine hooks back toward the gate
    dw = w - f["lean"] * h * t ** 2.4
    th = np.arctan2(dw, du)
    return t, du, dw, th


def _radius(t, th, f):
    r = f["R"] * np.clip(1 - t ** 1.7, 0, 1) ** 0.95 * (1 + 0.08 * np.exp(-((t - 0.12) / 0.12) ** 2))
    a_ = np.abs(th)
    r = r * (1 + 0.07 * np.exp(-(th / 0.32) ** 2) - 0.035 * np.exp(-((a_ - 0.62) / 0.16) ** 2))   # the labial ridge, its grooves
    r = r * (1 + 0.07 * np.exp(-((((th - np.pi) + np.pi) % (2 * np.pi) - np.pi) / 0.22) ** 2) * (1 - t))   # the keel
    return r


def sdf(p, f):
    u, w, z = _local(p, f)
    t, du, dw, th = _frame(u, w, z, f)
    r = _radius(t, th, f)
    d = (np.hypot(du, dw / 0.84) - r) * 0.72
    if f["snap"] < 1:                                                    # the break: tilted, jagged, a spall out of one side
        top = f["h"] * f["snap"] + du * f["tilt"][0] + dw * f["tilt"][1] + (vn(du * 2.5 + f["seed"], dw * 2.5) - 0.5) * 0.55 \
            + (vn(du * 9, dw * 9) - 0.5) * 0.12
        d = np.maximum(d, z - top)
        sp = np.array([np.cos(f["spall"]), np.sin(f["spall"])]) * f["R"] * 0.4
        zs = f["h"] * f["snap"] - f["R"] * 0.35
        scoop = np.sqrt((du - sp[0]) ** 2 + (dw - sp[1]) ** 2 + ((z - zs) * 0.7) ** 2) - f["R"] * 0.42
        d = np.maximum(d, -scoop)
    else:
        d = np.maximum(d, z - f["h"])
        nf = np.array([-0.45, 0.12, 0.88])
        nf = nf / np.linalg.norm(nf)
        d = np.maximum(d, (du * nf[0] + dw * nf[1] + (z - f["h"] * 0.9) * nf[2]))   # the worn facet
    chip = np.sqrt(((th - np.pi + np.pi) % (2 * np.pi) - np.pi) ** 2 * 4 + ((z % 1.3) - 0.65) ** 2 * 6) - 0.25
    d = np.maximum(d, -(chip * f["R"] * 0.4 + 0.02 * (vn(z * 3 + f["seed"], 1) < 0.6)))
    return np.maximum(d, -z - 0.5)


def heightfield(X, Y, f, n=70):
    top = np.full(X.shape, -9.0)
    for z in np.linspace(0, f["h"], n):
        P = np.dstack([X, Y, np.full(X.shape, f["base"] + z)])
        top = np.where(sdf(P, f) < 0, f["base"] + z, top)
    return top


def draw(img, zb, dep_scene, to_px, f, lights, moon, ambient=0.16, tol=0.7):
    GH, GW = img.shape[:2]
    ox, oy = to_px((0.0, 0.0, 0.0))
    bx, by = to_px((f["c"][0], f["c"][1], f["base"]))
    tx_, ty_ = to_px((f["c"][0], f["c"][1], f["base"] + f["h"]))
    pad = int(f["R"] * 1.3 * KX) + 3
    y0, y1 = max(0, int(ty_) - pad), min(GH, int(by) + pad)
    x0, x1 = max(0, int(bx) - pad - int(f["h"] * 0.3 * KX)), min(GW, int(bx) + pad + int(f["h"] * 0.3 * KX))
    if y1 <= y0 or x1 <= x0:
        return img
    ys, xs = np.mgrid[y0:y1, x0:x1]
    SX, SY = xs + 0.5, ys + 0.5
    zc = f["base"] + f["h"] * 0.5
    a_ = (SX - ox) / KX
    b_ = (SY - oy + zc * KZ) / KY
    P0 = np.dstack([(a_ + b_) / 2, (b_ - a_) / 2, np.full(SX.shape, zc)])
    span = f["h"] * 0.9 + f["R"] * 2
    O = P0 + VIEW * span
    D = -VIEW
    t = np.zeros(SX.shape)
    hit = np.zeros(SX.shape, bool)
    alive = np.ones(SX.shape, bool)
    for _ in range(110):
        P = O + D * t[..., None]
        d = sdf(P, f)
        newhit = alive & (d < 0.004)
        hit |= newhit
        alive &= ~newhit
        t = np.where(alive, t + np.maximum(d, 0.006), t)
        alive &= t < span * 2.2
        if not alive.any():
            break
    P = O + D * t[..., None]
    depth = P[..., 0] + P[..., 1]
    vis = hit & (depth >= dep_scene[ys, xs] - tol) & (depth > zb[ys, xs])
    if not vis.any():
        return img
    e = 0.006
    N = np.dstack([sdf(P + np.array([e, 0, 0]), f) - sdf(P - np.array([e, 0, 0]), f),
                   sdf(P + np.array([0, e, 0]), f) - sdf(P - np.array([0, e, 0]), f),
                   sdf(P + np.array([0, 0, e]), f) - sdf(P - np.array([0, 0, e]), f)])
    N = N / (np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9)
    u, w, z = _local(P, f)
    tt, du, dw, th = _frame(u, w, z, f)
    seed = f["seed"]
    # light: the moon (cool), each warm light, a little ambient; a warm bounce from the flesh below
    ndl = np.clip((N * moon).sum(-1), 0, 1) * skylit(P)
    lit = np.clip((ndl - 0.04) / 0.22, 0, 1)                            # a clean turn from light to shade
    val = ambient + lit * 0.42 + ndl * 0.22
    refl = np.clip(-N[..., 2] * 0.5 + 0.5, 0, 1) * (1 - lit) * np.clip(1 - z / (f['h'] * 0.8), 0, 1)
    val = val + refl * 0.1                                               # the flesh's light thrown up into the shade
    warm = np.zeros(SX.shape + (3,))
    spec = np.zeros(SX.shape)
    Hm = (moon + VIEW) / np.linalg.norm(moon + VIEW)
    sk = skylit(P)
    spec += np.clip((N * Hm).sum(-1), 0, 1) ** 70 * 0.9 * sk
    for (lp, lc, reach) in lights:
        v_ = np.array(lp) - P
        dist = np.linalg.norm(v_, axis=-1)
        ul = v_ / dist[..., None]
        att = 1 / (1 + (dist / reach) ** 2)
        warm += (np.clip((N * ul).sum(-1), 0, 1) * att)[..., None] * np.array(lc) * 0.9
        hv = (ul + VIEW) / np.linalg.norm(ul + VIEW, axis=-1, keepdims=True)
        spec += np.clip((N * hv).sum(-1), 0, 1) ** 30 * att * 0.22
    wl = warm.mean(-1)
    val = val + np.clip(wl, 0, 0.5) * 0.55                               # light adds; then it tints
    bounce = refl * 0.35 + np.exp(-z / 0.6) * 0.06                       # the flesh's red light from below, in the shade
    ao = 1 - np.exp(-np.maximum(z, 0) / 0.45) * 0.45
    val = val * ao
    # the enamel: snapped to its ramp, the ordered dither only where tones meet
    bay = BAYER[ys % 4, xs % 4]
    cej = 0.35 + 0.3 * np.abs(np.sin(th))                                # the neck line: up on the sides, down front and back
    lum = np.clip(ndl + wl, 0, 1)
    rake = np.clip(4 * lum * (1 - lum), 0, 1)                             # raking light: where the light just grazes
    peri = np.sin((z - cej) * 24 + vn(th * 2, z) * 1.5) * 0.05 * rake * np.clip(1 - tt * 1.3, 0, 1)
    grooves = -np.exp(-((np.abs(th) - 0.62) / 0.16) ** 2) * 2               # the grooves by the ridge
    v2 = val + peri - (grooves < -0.55) * 0.04
    q = v2 * len(R_ENAMEL)
    near_edge = np.abs(q - np.round(q)) < 0.035                            # dither only right at a tone's border
    idx = np.clip(np.where(near_edge, q + bay * 0.7, q), 0, len(R_ENAMEL) - 1).astype(int)
    col = R_ENAMEL[idx]
    g_ = np.clip((tt - 0.12) / 0.7, 0, 1)
    g_ = g_ * g_ * (3 - 2 * g_)
    tint = np.array([1.05, 0.95, 0.76]) * (1 - g_[..., None]) + np.array([0.86, 0.93, 1.06]) * g_[..., None]
    col = col * tint                                                      # dentin through thin enamel at the neck; glassy enamel at the tip
    thin = np.clip((tt - 0.6) / 0.32, 0, 1)
    back = np.zeros(SX.shape)                                             # light from behind passing through the thin tip
    for (lp, lc, reach) in lights:
        v_ = np.array(lp) - P
        dist = np.linalg.norm(v_, axis=-1)
        back += np.clip(-(N * (v_ / dist[..., None])).sum(-1), 0, 1) / (1 + (dist / reach) ** 2)
    back += np.clip(-(N * moon).sum(-1), 0, 1) * sk
    col = col + np.array([0.42, 0.48, 0.55])[None, None, :] * (thin * np.clip(back, 0, 1) * 0.45)[..., None]
    scratch = (np.abs(np.sin(th * 70 + vn(z * 0.4, th * 3) * 3)) > 0.975) & (tt < 0.6) & (vn(th * 9, z * 0.3) > 0.5)
    col = np.where(scratch[..., None], col * 1.08 + 0.01, col)              # scored as it pushed up through the ground
    if f['snap'] >= 1:                                                    # the worn facet: polished, a brown dentin cup in it
        nf = np.array([-0.45, 0.12, 0.88]) / np.linalg.norm([-0.45, 0.12, 0.88])
        fac = (np.abs(du * nf[0] + dw * nf[1] + (z - f['h'] * 0.9) * nf[2]) < 0.012) & (tt > 0.75)
        cup = fac & (np.hypot(du + 0.0, dw) < _radius(tt, th, f) * 0.45)
        col = np.where(fac[..., None], col * 1.12 + 0.02, col)
        col = np.where(cup[..., None], np.array([0.42, 0.3, 0.16]) * (0.4 + val[..., None] * 0.9), col)
    craze = (np.abs(vn(th * 4 + seed, z * 0.35) - 0.5) < 0.007) & (tt < 0.8) & (vn(th * 2, z * 0.2 + 5) > 0.45)   # few, long
    if f['split']:
        sa = (((th - f['split_a'] - np.sin(z * 1.3) * 0.15) + np.pi) % (2 * np.pi)) - np.pi
        craze = craze | (np.abs(sa) * _radius(tt, th, f) < 0.035)                 # split the whole length
    col = np.where(craze[..., None], col * 0.72, col)
    keel = np.abs(((th - np.pi + np.pi) % (2 * np.pi)) - np.pi) < 0.25
    stain = ((grooves < -0.7) | keel) & (vn(th * 2 + seed, z * 0.8) > 0.35) & (tt < 0.55)
    col = np.where(stain[..., None], col * np.array([0.82, 0.7, 0.52]), col)
    tart = (z < 0.2 + vn(th * 4 + seed, 1) * 0.3) & (vn(th * 9 + seed, z * 4) > 0.4)   # patchy, not a band
    col = np.where(tart[..., None], np.array([0.62, 0.58, 0.44]) * (0.35 + val[..., None] * 0.9) * (0.85 + (vn(th * 30, z * 30)[..., None] - 0.5) * 0.4), col)
    # the snapped tip: the break, rough, the dentin showing, darker in its pits
    brk = (f["snap"] < 1) & (z > f["h"] * f["snap"] - f["R"] * 0.8) & ((N[..., 2] > 0.45) | (sdf(P - N * 0.05, f) > -0.01))
    rr_ = np.hypot(du, dw / 0.84) / np.maximum(_radius(tt, th, f), 1e-3)
    ring = 0.88 + 0.12 * np.sin(rr_ * 30 + vn(th * 2, rr_ * 3) * 2)
    di = np.clip((val * 0.9 * ring + (vn(du * 20, dw * 20) - 0.5) * 0.12) * len(R_DENTIN), 0, len(R_DENTIN) - 1).astype(int)
    dent = R_DENTIN[di] * 0.65 + np.array([0.5, 0.33, 0.4]) * 0.35 * (0.4 + val[..., None])   # the god's blood soaked in
    dent = np.where((rr_ > 0.86)[..., None], np.array([0.62, 0.66, 0.7]) * (0.35 + val[..., None] * 0.9), dent)   # the enamel rim
    dent = np.where((rr_ < 0.2)[..., None], np.array([0.05, 0.02, 0.025]), dent)                                  # the pulp canal
    col = np.where(brk[..., None], dent, col)
    # the blood: smeared on the lower third, running down in threads that end in beads
    smear = (z < f["h"] * (0.08 + vn(th * 2.5 + seed, 2) * 0.16)) & (vn(th * 5 + seed, z * 2) > 0.55) & ~tart
    blood = smear.copy()
    old = smear & (vn(th * 3, z * 3 + 9) > 0.55)
    for (rt, top, wd) in f["runs"]:
        ang = (((th - rt) + np.pi) % (2 * np.pi)) - np.pi
        rad_ = _radius(tt, th, f)
        across = np.abs(ang) * rad_
        zt = f["h"] * top
        wob = (vn(z * 3 + rt * 10, rt) - 0.5) * 0.03
        wd = wd * 0.7
        run = (np.abs(across + wob) < wd) & (z < zt) & (z > zt - f["h"] * 0.2)
        bead = (np.hypot(across + wob, (z - (zt - f["h"] * 0.2)) * 0.8) < wd * 1.8)
        blood |= run | bead
    bl = np.where(old[..., None], BLOOD_OLD, BLOOD_FRESH) * (0.6 + val[..., None] * 0.6)
    col = np.where(blood[..., None], bl, col)
    wx, wy = P[..., 0], P[..., 1]
    climb_h = 0.25 + 0.3 * np.abs(np.sin(th)) + vn(wx * 1.3 + seed, wy * 1.3) * 0.45 + np.clip(vn(wx * 2.1 + 40, wy * 2.1) - 0.66, 0, 1) * 2.0   # the gum's scallop
    fray = (vn(wx * 7 + seed, z * 5 + wy * 7) - 0.5) * 0.08
    climb = z < climb_h + fray
    lump = vn(th * 14 + seed, z * 9)
    fl = np.array([0.2, 0.065, 0.08]) * (0.35 + val[..., None] * 0.7) * (0.8 + lump[..., None] * 0.4)   # the floor's own flesh, as dark
    fl = np.where((vn(wx * 4, wy * 4 + z) > 0.62)[..., None], fl * np.array([0.8, 0.9, 1.25]), fl)   # bruised in patches
    col = np.where(climb[..., None], fl, col)
    edge_ = climb & (z > climb_h + fray - 0.07)
    col = np.where(edge_[..., None], np.array([0.46, 0.15, 0.21]) * (0.3 + val[..., None] * 0.8), col)   # the collar, swollen, inflamed
    recede = h1_(seed) > 0.5
    lipf = ~climb & (z < climb_h + fray + (0.13 if recede else 0.04))
    col = np.where(lipf[..., None], np.array([0.09, 0.1, 0.07]) * (0.6 + val[..., None]) if recede else col * 0.5, col)   # the black band where it drew back
    blood = blood & ~climb
    gloss = np.where(blood, 1.6, np.where(brk | tart, 0.15, np.where(edge_, 1.8, np.where(climb, 0.8, 1.0))))
    col = col * (1 + bounce[..., None] * np.array([1.4, 0.3, 0.3])) * (1 + (warm - wl[..., None]) * 0.7)
    col = col + (spec * gloss)[..., None] * np.array([0.9, 0.92, 1.0])
    rim = (np.clip(1 - (N * VIEW).sum(-1), 0, 1) ** 3) * (N[..., 0] < 0) * sk   # a lit rim on the moon's side, against the dark
    col = col + rim[..., None] * np.array([0.12, 0.13, 0.16])
    col = np.clip(col, 0, 1)
    img[ys[vis], xs[vis]] = col[vis]
    zb[ys[vis], xs[vis]] = depth[vis]
    return img
