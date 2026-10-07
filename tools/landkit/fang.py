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
from kit import vn, ramp

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)

R_ENAMEL = ramp("#17141a", "#2a2629", "#433c38", "#5f5546", "#7f7258", "#9e8f6d", "#bcac86", "#d6c9a4")
R_DENTIN = ramp("#2a1f14", "#4a3721", "#6e5532", "#8f7346")
TARTAR = np.array([0.42, 0.38, 0.27])
BLOOD_FRESH = np.array([0.13, 0.015, 0.025])
BLOOD_OLD = np.array([0.12, 0.06, 0.04])
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.47


def make(centre, base, height, R, seed, ax, perp):
    rr = np.random.default_rng(seed)
    return dict(c=np.array(centre, float), base=float(base), h=float(height), R=float(R), seed=int(seed),
                ax=np.array(ax, float), perp=np.array(perp, float),
                bend=rr.uniform(0.18, 0.3), lean=rr.choice([-1, 1]) * rr.uniform(0.08, 0.18),
                snap=rr.uniform(0.78, 0.93) if rr.random() < 0.8 else 1.0, twist=rr.uniform(0, 6.28),
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
    r = r * (1 + 0.035 * np.cos(5 * th + f["twist"]))                   # the long ridges
    r = r * (1 + 0.07 * np.exp(-((((th - np.pi) + np.pi) % (2 * np.pi) - np.pi) / 0.22) ** 2) * (1 - t))   # the keel
    return r


def sdf(p, f):
    u, w, z = _local(p, f)
    t, du, dw, th = _frame(u, w, z, f)
    r = _radius(t, th, f)
    d = (np.hypot(du, dw / 0.84) - r) * 0.72
    top = f["h"] * f["snap"] + (vn(du * 6 + f["seed"], dw * 6) - 0.5) * 0.18 * (f["snap"] < 1)
    d = np.maximum(d, z - np.where(f["snap"] < 1, top, f["h"]))
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
    ndl = np.clip((N * moon).sum(-1), 0, 1)
    val = ambient + ndl * 0.62
    warm = np.zeros(SX.shape + (3,))
    spec = np.zeros(SX.shape)
    Hm = (moon + VIEW) / np.linalg.norm(moon + VIEW)
    spec += np.clip((N * Hm).sum(-1), 0, 1) ** 70 * 0.9
    for (lp, lc, reach) in lights:
        v_ = np.array(lp) - P
        dist = np.linalg.norm(v_, axis=-1)
        ul = v_ / dist[..., None]
        att = 1 / (1 + (dist / reach) ** 2)
        warm += (np.clip((N * ul).sum(-1), 0, 1) * att)[..., None] * np.array(lc) * 0.9
        hv = (ul + VIEW) / np.linalg.norm(ul + VIEW, axis=-1, keepdims=True)
        spec += np.clip((N * hv).sum(-1), 0, 1) ** 30 * att * 0.22
    bounce = np.clip(-N[..., 2], 0, 1) * 0.12 + np.exp(-z / 0.6) * 0.06   # the flesh's red light from below
    ao = 1 - np.exp(-np.maximum(z, 0) / 0.45) * 0.45
    val = val * ao
    # the enamel: snapped to its ramp, the ordered dither only where tones meet
    bay = BAYER[ys % 4, xs % 4]
    peri = np.sin(z * 34 + vn(th * 2, z) * 2) * 0.025 * (ndl > 0.2)       # growth lines ringing it, seen in the light
    grooves = np.cos(5 * th + f["twist"])
    v2 = val + peri - (grooves < -0.55) * 0.05
    q = v2 * len(R_ENAMEL)
    near_edge = np.abs(q - np.round(q)) < 0.07                             # dither only at a tone's border
    idx = np.clip(np.where(near_edge, q + bay * 0.7, q), 0, len(R_ENAMEL) - 1).astype(int)
    col = R_ENAMEL[idx]
    age = np.clip(1 - tt * 1.6, 0, 1)                                     # yellowing toward the root
    col = col * (1 - age[..., None] * np.array([0.0, 0.06, 0.2]))
    thin = np.clip((tt - 0.62) / 0.3, 0, 1)                               # the glassy tip: light comes through it
    col = col * (1 - thin[..., None] * 0.25) + np.array([0.5, 0.46, 0.38]) * thin[..., None] * 0.3
    craze = (np.abs(vn(th * 7 + seed, z * 0.7) - 0.5) < 0.012) & (tt < 0.85)
    col = np.where(craze[..., None], col * 0.72, col)
    stain = (grooves < -0.55) & (vn(th * 3 + seed, z * 1.5) > 0.42) & (tt < 0.6)
    col = np.where(stain[..., None], col * np.array([0.82, 0.7, 0.52]), col)
    tart = (z < 0.2 + vn(th * 4 + seed, 1) * 0.3) & (vn(th * 9 + seed, z * 4) > 0.4)   # patchy, not a band
    col = np.where(tart[..., None], TARTAR * (0.6 + val[..., None] * 0.6) * (0.85 + (vn(th * 30, z * 30)[..., None] - 0.5) * 0.4), col)
    # the snapped tip: the break, rough, the dentin showing, darker in its pits
    brk = (f["snap"] < 1) & (z > f["h"] * f["snap"] - 0.22) & (N[..., 2] > 0.55)
    di = np.clip((val * 0.9 + (vn(du * 20, dw * 20) - 0.5) * 0.3) * len(R_DENTIN), 0, len(R_DENTIN) - 1).astype(int)
    col = np.where(brk[..., None], R_DENTIN[di], col)
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
    climb_h = 0.3 + vn(th * 3 + seed, 5) * 0.5 + vn(th * 11 + seed, 7) * 0.25 + np.clip(vn(th * 6 + 40, 2) - 0.7, 0, 1) * 2.4
    climb = z < climb_h
    lump = vn(th * 14 + seed, z * 9)
    fl = np.array([0.3, 0.1, 0.12]) * (0.55 + val[..., None] * 0.9) * (0.8 + lump[..., None] * 0.45)
    col = np.where(climb[..., None], fl, col)
    lipf = (z >= climb_h) & (z < climb_h + 0.06)
    col = np.where(lipf[..., None], col * 0.45, col)                       # its shadow on the enamel just above
    blood = blood & ~climb
    gloss = np.where(blood, 1.6, np.where(brk | tart, 0.15, np.where(climb, 0.8, 1.0)))
    col = col * (1 + bounce[..., None] * np.array([1.4, 0.3, 0.3])) + warm * col * np.where(blood, 0.5, 1.4)[..., None]
    col = col + (spec * gloss)[..., None] * np.array([0.9, 0.92, 1.0])
    rim = (np.clip(1 - (N * VIEW).sum(-1), 0, 1) ** 3) * (N[..., 0] < 0)  # a lit rim on the moon's side, against the dark
    col = col + rim[..., None] * np.array([0.12, 0.13, 0.16])
    col = np.clip(col, 0, 1)
    img[ys[vis], xs[vis]] = col[vis]
    zb[ys[vis], xs[vis]] = depth[vis]
    return img
