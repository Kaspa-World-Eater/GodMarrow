"""The god's eye (landkit). APPROVED by Derek 2026-10-07 ("Eye looks great, document it"): the full record is
in tools/landkit/passes/organic_notes.md; changes must keep or raise it.
 Derek 2026-10-07: "the eye should be 3 dimensional and slowly blink a pus filled blink";
"elliptical and seen slightly from the side, looking up, so we can see the vitreous fluid transparency"; "more
bulbous"; the eye at D-: "needs a ton more work".

A real 3D eye, ray-cast per pixel along the game's own view (orthographic, the iso camera), not painted flat:
- the BALL: a sphere; its white yellowed and wet, its vessels branching in from the lids' edges, thinning toward the
  iris; a warm subsurface flush at its rim; the lids' shadow on it near their margins;
- the CORNEA: a clear dome bulging over the iris (a smaller sphere set forward along the gaze); the iris is seen
  THROUGH it (each ray is refracted into the eye and finds the iris plane), a fresnel reflection of the cold sky on its
  rim, sharp highlights of the moon and of each warm light;
- the IRIS: a plane inside the eye across the gaze: radiating fibres, dark crypts, the collarette ring, the limbal ring,
  the pupil;
- the LIDS: shells over the ball, an almond opening that closes in the blink; folded skin, its margin crusted with pus
  and set with coarse hairs, the wet meniscus where lid meets ball, the pink caruncle in the inner corner.

  draw(img, zb, dep_scene, to_px, centre, R, gaze, blink, lights, moon, seed)
     lights: [(position xyz, colour rgb, reach yd)]; returns img; writes zb (larger = nearer the viewer)
"""
import numpy as np
from kit import vn

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)                                  # toward the camera


def _basis(g):
    g = g / np.linalg.norm(g)
    a = np.array([0.0, 0.0, 1.0]) if abs(g[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    e1 = np.cross(g, a)
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(g, e1)
    return g, e1, e2


def _sphere(o, d, c, r):
    """nearest-to-camera hit of rays o + t d (d toward the camera) with a sphere: largest t; nan where missed"""
    oc = o - c
    b = (oc * d).sum(-1)
    cc = (oc * oc).sum(-1) - r * r
    disc = b * b - cc
    t = -b + np.sqrt(np.where(disc > 0, disc, np.nan))
    return t


def vessels(seed, n=11):
    """branching vessels on the white, in the gaze frame (polar angle from the gaze axis, azimuth): from near the lids'
    edge (polar ~95 deg) inward to the limbus (~28 deg), forking"""
    rr = np.random.default_rng(seed)
    pts = []
    def grow(ph, th, w, depth):
        while ph > 0.55:
            pts.append((ph, th, w))
            ph -= 0.02
            th += rr.normal(0, 0.03)
            w *= 0.985
            if depth < 2 and rr.random() < 0.03:
                grow(ph, th + rr.choice([-1, 1]) * 0.12, w * 0.7, depth + 1)
    for k in range(n):
        th0 = rr.uniform(0, 2 * np.pi)
        if abs(np.sin(th0)) > 0.85:                                   # most come in from the corners, as they do
            th0 = th0 + 0.6
        grow(rr.uniform(1.5, 1.7), th0, rr.uniform(0.022, 0.034), 0)
    return np.array(pts)


def draw(img, zb, dep_scene, to_px, centre, R, gaze, blink, lights, moon, seed=1, aperture=(0.95, 0.5), ambient=0.18):
    GH, GW = img.shape[:2]
    c = np.array(centre, float)
    g, e1, e2 = _basis(np.array(gaze, float))
    ox, oy = to_px((0.0, 0.0, 0.0))
    sx0, sy0 = to_px(tuple(c))
    rad = int(R * 18 * 1.35) + 3
    ys, xs = np.mgrid[max(0, int(sy0 - rad * 1.2)):min(GH, int(sy0 + rad * 1.2)), max(0, int(sx0 - rad)):min(GW, int(sx0 + rad))]
    if ys.size == 0:
        return img
    SX, SY = xs + 0.5, ys + 0.5
    z0 = c[2]
    a_ = (SX - ox) / KX
    b_ = (SY - oy + z0 * KZ) / KY
    O = np.dstack([(a_ + b_) / 2, (b_ - a_) / 2, np.full(SX.shape, z0)]) - VIEW * 3 * R   # start behind the eye
    D = np.broadcast_to(VIEW, O.shape)
    # ---- the hits: the lid shell, the ball, the cornea
    Rl = R * 1.13
    t_lid = _sphere(O, D, c, Rl)
    t_ball = _sphere(O, D, c, R)
    cc = c + g * R * 0.66
    Rc = R * 0.5
    t_cor = _sphere(O, D, cc, Rc)
    P_lid = O + D * t_lid[..., None]
    nl = (P_lid - c) / Rl
    la, lb = (nl * e1).sum(-1), (nl * e2).sum(-1)
    lg = (nl * g).sum(-1)
    W_, H_ = aperture
    open_h = H_ * (1 - blink) * np.clip(1 - (la / W_) ** 2, 0, 1) ** 0.6
    centre_b = -H_ * 0.15 * blink                                      # the upper lid comes further down
    in_ap = (lg > 0) & (np.abs(lb - centre_b) < open_h)
    lid_hit = np.isfinite(t_lid) & ~in_ap
    # inside the aperture: the nearer of ball and cornea
    tb = np.where(np.isfinite(t_ball), t_ball, -np.inf)
    tc = np.where(np.isfinite(t_cor), t_cor, -np.inf)
    eye_hit = np.isfinite(t_lid) & in_ap & (np.isfinite(t_ball) | np.isfinite(t_cor))
    cor = eye_hit & (tc > tb)
    t_use = np.where(lid_hit, t_lid, np.where(cor, tc, tb))
    P = O + D * t_use[..., None]
    depth = P[..., 0] + P[..., 1]
    visible = (lid_hit | eye_hit) & (depth >= dep_scene[ys, xs] - 0.4) & (depth > zb[ys, xs])
    # ---- lighting helper
    def shade(N, P_, spec_pow=0.0, spec_k=0.0):
        L_ = np.clip((N * moon).sum(-1), 0, 1)[..., None] * np.array([0.62, 0.68, 0.82])
        H_v = moon + VIEW
        H_v = H_v / np.linalg.norm(H_v)
        S_ = np.clip((N * H_v).sum(-1), 0, 1) ** spec_pow * spec_k if spec_k else 0.0
        out = np.full(N.shape, ambient) + L_
        spec = np.zeros(N.shape)
        if spec_k:
            spec = S_[..., None] * np.array([0.8, 0.85, 0.95])
        for (lp, lc, reach) in lights:
            v_ = np.array(lp) - P_
            dist = np.linalg.norm(v_, axis=-1)
            u_ = v_ / dist[..., None]
            att = 1 / (1 + (dist / reach) ** 2)
            out = out + np.clip((N * u_).sum(-1), 0, 1)[..., None] * np.array(lc) * att[..., None] * 1.6
            if spec_k:
                hv = u_ + VIEW
                hv = hv / np.linalg.norm(hv, axis=-1, keepdims=True)
                spec = spec + (np.clip((N * hv).sum(-1), 0, 1) ** spec_pow * spec_k * att)[..., None] * np.array(lc)
        return out, spec
    col = np.zeros(SX.shape + (3,))
    # ---- the lids: folded skin over the ball; the margin crusted with pus and coarse hairs; the caruncle
    edge_d = np.abs(np.abs(lb - centre_b) - open_h)                     # distance from the margin (on the shell)
    sgn = np.sign(lb - centre_b)
    # folds: ridges running along the lid, parallel to its margin; the margin itself rolled toward the opening
    fq = edge_d * 26 + vn(la * 4 + seed, lb * 4) * 2.2
    fold_h = np.sin(fq) * np.exp(-edge_d / 0.5)
    roll = np.clip(1 - edge_d / 0.09, 0, 1) ** 1.5
    tilt = (np.cos(fq) * 0.55 * np.exp(-edge_d / 0.5) + roll * 0.9) * sgn
    Nl = nl - e2[None, None, :] * tilt[..., None] * 0.6
    bump = vn(la * 40 + seed, lb * 40) - 0.5
    Nl = Nl + e1[None, None, :] * bump[..., None] * 0.25
    Nl = Nl / np.linalg.norm(Nl, axis=-1, keepdims=True)
    lit_l, spec_l = shade(Nl, P_lid, 18, 0.35)
    tone = 0.88 + (vn(la * 9 + seed, lb * 9) - 0.5) * 0.35
    skin = np.array([0.5, 0.25, 0.24]) * tone[..., None]
    skin = skin * (1 - np.clip(-fold_h, 0, 1)[..., None] * 0.45)          # the folds' valleys dark
    skin = skin + np.array([0.12, 0.0, 0.02]) * roll[..., None]           # raw and red toward the margin
    vein_l = (np.abs(vn(la * 7 + 50, lb * 7) - 0.5) < 0.03) & (edge_d < 0.6)
    skin = np.where(vein_l[..., None], np.array([0.28, 0.08, 0.16]), skin)
    margin = edge_d < 0.06
    bead = vn(la * 14 + seed * 3, 2.0)
    pus = (margin & (vn(la * 25 + 3, lb * 25) > 0.35)) | ((edge_d < 0.06 + np.clip(bead - 0.55, 0, 1) * 0.3) & (sgn > 0) & (lg > 0))
    pus = pus | ((edge_d < 0.14) & (np.abs(la) > W_ * 0.7) & (lg > 0))       # crusted thick in the corners
    skin = np.where(margin[..., None], np.array([0.42, 0.16, 0.16]), skin)
    skin = np.where(pus[..., None], np.array([0.58, 0.5, 0.22]) * (0.85 + (vn(la * 40, lb * 40)[..., None] - 0.5) * 0.4), skin)
    lash = np.sin(la * 70 + seed + edge_d * 30 * sgn) > 0.8                  # coarse lashes, leaning out of the margin
    hair = (edge_d < 0.22) & (edge_d > 0.04) & lash & (lg > 0) & (vn(la * 12, 3) > 0.35)
    skin = np.where(hair[..., None], np.array([0.06, 0.04, 0.04]), skin)
    car = (la < -W_ * 0.82) & (np.abs(lb - centre_b) < open_h + 0.08) & (lg > 0)
    skin = np.where(car[..., None], np.array([0.6, 0.28, 0.3]), skin)          # the caruncle, wet pink
    sss = np.array([0.1, 0.02, 0.02])                                   # light through thin skin: a red warmth
    low = np.clip(1 - (P_lid[..., 2] - c[2] + R * 0.2) / (R * 0.75), 0, 1)   # the foot of the lid, into the socket
    lidc = (skin * lit_l + sss + spec_l * (0.6 + pus[..., None] * 1.6)) * (1 - low[..., None] * 0.6)   # pus glossy
    col = np.where(lid_hit[..., None], lidc, col)
    # ---- the ball: the yellowed white, the vessels, the lids' shadow, wet
    Pb = O + D * t_ball[..., None]
    Nb = (Pb - c) / R
    bg = np.clip((Nb * g).sum(-1), -1, 1)
    ph = np.arccos(bg)
    th = np.arctan2((Nb * e2).sum(-1), (Nb * e1).sum(-1))
    lit_b, spec_b = shade(Nb, Pb, 40, 0.9)
    white = np.array([0.84, 0.74, 0.5]) * (1 - np.clip((ph - 0.6) / 1.0, 0, 1)[..., None] * 0.2)
    sick = vn(ph * 5 + seed, th * 3) 
    white = white * (1 + (sick[..., None] - 0.5) * np.array([0.1, 0.14, 0.3]))          # blotched, uneven
    white = white * np.array([1.0, 0.96, 0.82]) ** np.clip(ph * 1.4, 0, 2)[..., None]   # yellowing toward the rim
    V = vessels(seed, 22)
    vd = np.full(SX.shape, 9.0)
    vw = np.zeros(SX.shape)
    for (pp, tt, ww) in V:
        dd = np.hypot(ph - pp, ((th - tt + np.pi) % (2 * np.pi) - np.pi) * np.sin(ph))
        m_ = dd < vd
        vd = np.where(m_, dd, vd)
        vw = np.where(m_, ww, vw)
    vessel = vd < vw
    white = np.where(vessel[..., None], np.array([0.58, 0.08, 0.08]), white)
    halo = (vd < vw * 3.2) & ~vessel                                    # the flush round each vessel
    white = np.where(halo[..., None], white * np.array([1.0, 0.82, 0.78]), white)
    lidsh = np.clip(1 - edge_d / 0.22, 0, 1) * (np.abs(lb - centre_b) < open_h + 0.02)
    ball_col = white * lit_b * (1 - lidsh[..., None] * 0.55) + spec_b
    menisc = (edge_d < 0.035) & in_ap
    ball_col = np.where(menisc[..., None], np.minimum(ball_col * 1.4 + 0.08, 1), ball_col)
    # ---- the cornea: refract into the eye, find the iris plane; fresnel sky; highlights
    Pc = O + D * t_cor[..., None]
    Nc = (Pc - cc) / Rc
    inc = -D
    eta = 1 / 1.34
    cosi = np.clip(-(inc * Nc).sum(-1), -1, 1)
    k = 1 - eta * eta * (1 - cosi ** 2)
    T_ = eta * inc + (eta * cosi - np.sqrt(np.clip(k, 0, None)))[..., None] * Nc        # refracted, into the eye
    ip = c + g * R * 0.72                                               # the iris plane
    denom = (T_ * g).sum(-1)
    tt_ = ((ip - Pc) * g).sum(-1) / np.where(np.abs(denom) > 1e-4, denom, 1e-4)
    Q = Pc + T_ * tt_[..., None]
    qa, qb = ((Q - ip) * e1).sum(-1), ((Q - ip) * e2).sum(-1)
    qr = np.hypot(qa, qb) / R
    qth = np.arctan2(qb, qa)
    iris_r, pupil_r = 0.42, 0.1 + 0.02 * (1 - blink)
    fib = 0.75 + 0.35 * (np.abs(np.sin(qth * 26 + vn(qr * 9, qth * 3) * 3)) > 0.55)
    crypt = (vn(qth * 7 + seed, qr * 14) > 0.78) & (qr > pupil_r + 0.06)
    iris = np.array([0.36, 0.25, 0.1]) * fib[..., None]
    iris = np.where(crypt[..., None], iris * 0.45, iris)
    coll = np.abs(qr - (pupil_r + 0.09)) < 0.018
    iris = np.where(coll[..., None], iris * 1.35, iris)
    limb = qr > iris_r - 0.05
    iris = np.where(limb[..., None], iris * 0.45, iris)
    iris = np.where((qr < pupil_r)[..., None], np.array([0.01, 0.01, 0.012]), iris)
    beyond = qr > iris_r                                                 # through the clear dome's edge: the white
    lit_i, _ = shade(np.broadcast_to(g, Q.shape), Q)
    seen = np.where(beyond[..., None], white * lit_b, iris * lit_i * 0.85)
    fres = (0.04 + 0.96 * (1 - np.clip(cosi, 0, 1)) ** 5)[..., None]
    sky = np.array([0.42, 0.48, 0.58])
    _, spec_c = shade(Nc, Pc, 140, 2.2)
    cor_col = seen * (1 - fres) + sky * fres + spec_c
    eye_col = np.where(cor[..., None], cor_col, ball_col)
    col = np.where((eye_hit & ~lid_hit)[..., None], eye_col, col)
    col = np.clip(col, 0, 1)
    vis = visible
    img[ys[vis], xs[vis]] = col[vis]
    zb[ys[vis], xs[vis]] = depth[vis]
    return img
