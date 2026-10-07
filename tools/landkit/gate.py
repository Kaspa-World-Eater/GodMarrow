"""The gate in the god's mouth (landkit). Derek 2026-10-07: "the gate needs to look more brutal and imposing and
ancient"; "the gate should have extruded iron bars". The lore: the mouth was "a door, warm and wet, that opened and
shut", and the people "walked out on the breath"; inside the god "knelt our grandmothers' grandmothers ... they knelt
all day and they knelt all night". Built from the art library: chapter 1 (wrought iron), chapter 2 (megaliths,
weathering by cause).

Ray-marched along the game's camera, as eye.py and fang.py:
- POSTS: two megaliths of black basalt, 1.8 yd wide and 8 tall, rough-hewn (faces not true, arrises broken), leaning a
  little; across each, a carved frieze of kneeling figures in a long file, worn nearly smooth; ash on the ledges, the
  god's flesh climbing from the foot, grey lichen on the dry faces; rust running down below each hinge pin.
- LEAVES: grilles of forged square bars, slightly irregular; flat rails riveted at every crossing; a heavy frame; spear
  points on the bars' tops. One leaf ajar; the other torn off its upper hinge and sagging, its far corner sunk in the
  flesh. The iron dark and scaled, rust blooming where water sat (rail tops, crossings, the bottom), flaking along
  the grain (wrought iron splits in fibres), pitted; a dull broad sheen.

  post(base_xy, u_axis, r_axis, base_z, half_u, half_r, height, seed)
  leaf(hinge_xy, closed_dir, open_dir, base_z, width, height, open_angle, sag, seed)
  draw(img, zb, dep_scene, to_px, shapes, lights, moon, ambient)
"""
import numpy as np
from kit import vn, fbm, ramp, skylit

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)
R_BASALT = ramp("#0c0b10", "#16141a", "#211e24", "#2d292e", "#3b3639", "#4c4646", "#605856")
R_IRON = ramp("#08080a", "#121114", "#1c1a1c", "#292523", "#38302b", "#4a3e35")
RUST = np.array([0.46, 0.21, 0.08])
RUST_D = np.array([0.24, 0.1, 0.05])
FLESH = np.array([0.27, 0.08, 0.1])
ASHC = np.array([0.42, 0.41, 0.4])
LICHEN = np.array([0.4, 0.41, 0.37])
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.47


def post(base, u_axis, r_axis, z0, hu, hr, height, seed=1, hinge_u=None):
    return dict(kind="post", b=np.array(base, float), eu=np.array(u_axis, float), er=np.array(r_axis, float),
                z0=float(z0), hu=hu, hr=hr, h=height, seed=seed, hinge_u=hinge_u)


def leaf(hinge, closed_dir, open_dir, z0, width, height, ang, sag=0.0, seed=2):
    cd, od = np.array(closed_dir, float), np.array(open_dir, float)
    ew = cd * np.cos(ang) + od * np.sin(ang)
    en = np.array([-ew[1], ew[0]])
    return dict(kind="leaf", h0=np.array(hinge, float), ew=ew, en=en, z0=float(z0), w=width, h=height, sag=sag, seed=seed)


# ---------------------------------------------------------------------------------------------------- the kneelers
def _caps(px, py, ax, ay, bx, by, r):
    abx, aby = bx - ax, by - ay
    t = np.clip(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby), 0, 1)
    return np.hypot(px - ax - abx * t, py - ay - aby * t) - r


def kneeler(x, y, k):
    """a kneeling figure in profile, bent forward, hands raised together; x across 0..0.55, y up 0..0.75 (yards)"""
    lean = 0.04 * np.sin(k * 2.3)
    d = np.hypot(x - 0.36 - lean, y - 0.62) - 0.075                                     # the head, bowed
    d = np.minimum(d, _caps(x, y, 0.22, 0.24, 0.31 + lean, 0.52, 0.085))               # the back, bent
    d = np.minimum(d, _caps(x, y, 0.2, 0.2, 0.4, 0.18, 0.07))                          # the thigh
    d = np.minimum(d, _caps(x, y, 0.08, 0.05, 0.4, 0.06, 0.05))                        # the shin on the ground
    d = np.minimum(d, _caps(x, y, 0.33 + lean, 0.48, 0.47 + lean, 0.6, 0.032))         # the arms, raised
    return d


def frieze(s, t, seed):
    """relief height (0..1) of the file of kneelers across a face: s along the face, t up from the band's foot"""
    sp = 0.62
    k = np.floor(s / sp)
    x = s - k * sp
    d = kneeler(x, t, k + seed)
    wear = 0.55 + 0.45 * vn(s * 2 + seed, t * 3)                                         # worn nearly smooth
    return np.clip(-d / 0.035, 0, 1) * wear


# ---------------------------------------------------------------------------------------------------- the SDFs
def _post_sdf(P, o):
    q = P - np.array([o["b"][0], o["b"][1], o["z0"]])
    u = q[..., 0] * o["eu"][0] + q[..., 1] * o["eu"][1]
    r = q[..., 0] * o["er"][0] + q[..., 1] * o["er"][1]
    z = q[..., 2]
    u = u - z * 0.02                                                                      # leaning a little
    # rough-hewn (chapter 4): the faces cut in chisel facets, each a small flat plane at its own angle, so each takes its
    # own tone in the light; over a slow bulge where the block was never squared true
    import ground as _g
    fs_ = u + r * 1.3
    c1, c2, cid, ccx, ccz = _g.cells(fs_, z, 0.34, o["seed"] + 40, 0.9)
    tl = (_g.h1(cid, 1, o["seed"]) - 0.5) * 0.35 * (fs_ - ccx) + (_g.h1(cid, 2, o["seed"]) - 0.5) * 0.35 * (z - ccz)
    facet = 0.035 + tl - np.clip(0.02 - (c2 - c1) * 0.5, 0, None) * 1.5          # each scoop a plane; a ridge where scoops meet
    rough = (fbm(u * 0.6 + o["seed"], z * 0.6 + r) - 0.5) * 0.12 + facet
    dx = np.abs(u) - o["hu"] - rough
    dy = np.abs(r) - o["hr"] - rough
    dz = np.abs(z - o["h"] / 2) - o["h"] / 2
    rr = 0.14
    out = np.sqrt(np.maximum(dx + rr, 0) ** 2 + np.maximum(dy + rr, 0) ** 2) - rr
    d = np.maximum(out + np.minimum(np.maximum(dx, dy), 0), dz)
    # the frieze on the front face (toward the viewer, r < 0): the figures stand proud of a sunk band
    band = (z > 2.1) & (z < 2.95) & (r < 0)
    rel = frieze(u + o["hu"] + o["seed"] * 0.23, z - 2.15, o["seed"])
    d = d + np.where(band, 0.1 - rel * 0.1, 0)                                           # sunk band, figures proud
    groove = (np.abs(z - 2.08) < 0.03) | (np.abs(z - 2.98) < 0.03)
    d = d + np.where(groove & (r < 0), 0.02, 0)
    return d * 0.8, u, r, z, rel * band


def _leaf_sdf(P, o):
    q = P[..., :2] - o["h0"]
    a = q[..., 0] * o["ew"][0] + q[..., 1] * o["ew"][1]
    b = q[..., 0] * o["en"][0] + q[..., 1] * o["en"][1]
    z = P[..., 2] - o["z0"]
    if o["sag"]:                                                                          # torn off the upper hinge: it hangs, tipped
        c, s_ = np.cos(o["sag"]), np.sin(o["sag"])
        a, z = a * c - z * s_, a * s_ + z * c
    W_, H_ = o["w"], o["h"]
    sp, rb = 0.34, 0.06
    inz = (z > 0) & (z < H_)
    k = np.clip(np.round((a - sp / 2) / sp), 0, int(W_ / sp) - 1)
    ac = a - (k * sp + sp / 2) - (vn(k * 3.1 + o["seed"], z * 0.6) - 0.5) * 0.04           # forged: not ruler-straight
    bar = np.maximum(np.abs(ac), np.abs(b)) - rb
    bar = np.maximum(bar, -z)
    tip = np.maximum(np.maximum(np.abs(ac), np.abs(b)) - rb * 2.2 * np.clip(1 - (z - H_) / 0.32, 0, 1), np.abs(z - H_ - 0.16) - 0.16)
    bar = np.minimum(np.where(z <= H_, bar, 9.0), tip)                                    # the spear points
    d = bar
    for zr in (0.25, H_ * 0.38, H_ * 0.72, H_ - 0.12):                                     # the flat rails
        rail = np.maximum(np.maximum(np.abs(z - zr) - 0.07, np.abs(b) - 0.05), np.maximum(-a, a - W_))
        d = np.minimum(d, rail)
        riv = np.sqrt(ac ** 2 + (z - zr) ** 2 + np.maximum(np.abs(b) - 0.05, 0) ** 2) - 0.06
        d = np.minimum(d, riv)
    for af in (0.0, W_):                                                                  # the heavy frame's stiles
        stile = np.maximum(np.maximum(np.abs(a - af) - 0.09, np.abs(b) - 0.07), np.maximum(-z, z - H_ - 0.05))
        d = np.minimum(d, stile)
    box = np.maximum(np.maximum(-a - 0.2, a - W_ - 0.2), np.maximum(-z - 0.1, z - H_ - 0.5))
    d = np.maximum(d, box)
    return d * 0.85, a, b, z


def sdf(P, o):
    return _post_sdf(P, o)[0] if o["kind"] == "post" else _leaf_sdf(P, o)[0]


def _box(o, to_px):
    if o["kind"] == "post":
        cs = []
        for su in (-1, 1):
            for sr in (-1, 1):
                for zz in (0, o["h"]):
                    xy = o["b"] + o["eu"] * su * (o["hu"] + 0.3) + o["er"] * sr * (o["hr"] + 0.3)
                    cs.append(to_px((xy[0], xy[1], o["z0"] + zz)))
    else:
        cs = []
        for aa in (-0.3, o["w"] + 0.3):
            for bb in (-0.3, 0.3):
                for zz in (-0.3, o["h"] + 0.6):
                    xy = o["h0"] + o["ew"] * aa + o["en"] * bb
                    cs.append(to_px((xy[0], xy[1], o["z0"] + zz)))
    xs = [c[0] for c in cs]
    ys = [c[1] for c in cs]
    pad = 3 if o["kind"] == "post" else 3 + abs(o["sag"]) * 60
    return int(min(xs) - pad), int(max(xs) + pad), int(min(ys) - pad), int(max(ys) + pad)


def draw(img, zb, dep_scene, to_px, shapes, lights, moon, ambient=0.1, tol=0.6):
    GH, GW = img.shape[:2]
    ox, oy = to_px((0.0, 0.0, 0.0))
    hm = (moon + VIEW) / np.linalg.norm(moon + VIEW)
    for o in shapes:
        x0, x1, y0, y1 = _box(o, to_px)
        x0, x1, y0, y1 = max(0, x0), min(GW, x1), max(0, y0), min(GH, y1)
        if x1 <= x0 or y1 <= y0:
            continue
        ys, xs = np.mgrid[y0:y1, x0:x1]
        zc = o["z0"] + o["h"] / 2
        a_ = (xs + 0.5 - ox) / KX
        b_ = (ys + 0.5 - oy + zc * KZ) / KY
        P0 = np.dstack([(a_ + b_) / 2, (b_ - a_) / 2, np.full(xs.shape, zc)])
        span = 9.0
        O = P0 + VIEW * span
        t = np.zeros(xs.shape)
        alive = np.ones(xs.shape, bool)
        hit = np.zeros(xs.shape, bool)
        for _ in range(140):
            if not alive.any():
                break
            P = O - VIEW * t[..., None]
            d = np.full(xs.shape, 9.0)
            d[alive] = sdf(P[alive], o)
            nh = alive & (d < 0.003)
            hit |= nh
            alive &= ~nh
            t = np.where(alive, t + np.maximum(d * 0.85, 0.004), t)
            alive &= t < span * 2
        P = O - VIEW * t[..., None]
        depth = P[..., 0] + P[..., 1]
        vis = hit & (depth >= dep_scene[ys, xs] - tol) & (depth > zb[ys, xs])
        if not vis.any():
            continue
        Pv = P[vis]
        e = 0.004
        N = np.stack([sdf(Pv + np.array(dv), o) - sdf(Pv - np.array(dv), o) for dv in ([e, 0, 0], [0, e, 0], [0, 0, e])], -1)
        N /= np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9
        sk = skylit(Pv)
        ndl = np.clip(N @ moon, 0, 1) * sk
        occ = np.clip(sdf(Pv + N * 0.05, o) / 0.05, 0, 1)
        warm = np.zeros((len(Pv), 3))
        for (lp, lc, reach) in lights:
            v_ = np.array(lp) - Pv
            dist = np.linalg.norm(v_, axis=-1)
            att = 1 / (1 + (dist / reach) ** 2)
            warm += (np.clip((N * (v_ / dist[:, None])).sum(-1), 0, 1) * att)[:, None] * np.array(lc)
        wl = warm.mean(1)                                                            # light adds: dark stone lit is no longer dark
        val = (ambient + ndl * 0.6 + wl * 1.1 + np.clip(N[:, 2], 0, 1) * 0.03) * (0.55 + 0.45 * occ)
        yx = (ys[vis], xs[vis])
        seed = o["seed"]
        if o["kind"] == "post":
            R = R_BASALT
            _, u, r, z, rel = _post_sdf(Pv, o)
            q = val * len(R)
            q = np.where(np.abs(q - np.round(q)) < 0.04, q + BAYER[yx[0] % 4, yx[1] % 4] * 0.7, q)
            col = R[np.clip(q, 0, len(R) - 1).astype(int)]
            col = col * (1 + rel[:, None] * 0.35)                                         # the figures, catching what light there is
            tool = np.sin((u + z) * 26 + vn(u * 2, z * 2) * 3) > 0.85                      # the old tooling, faint
            col = np.where((tool & (rel < 0.1))[:, None], col * 0.9, col)
            ledge = (N[:, 2] > 0.6)
            col = np.where(ledge[:, None], col * 0.4 + ASHC * 0.6 * (0.4 + val[:, None]), col)   # ash on every ledge
            lc = vn(u * 14 + seed, z * 14)
            lich = (N[:, 2] < 0.5) & (lc > 0.86) & (vn(u * 2 + 9, z * 2) > 0.55) & (z > 1.0)   # small rosettes, few
            col = np.where(lich[:, None], col * 0.5 + LICHEN * 0.5 * (0.5 + val[:, None]), col)
            climb = z < 0.5 + vn(u * 2 + seed, r * 2) * 0.9
            col = np.where(climb[:, None], FLESH * (0.35 + val[:, None] * 0.8) * (0.8 + vn(u * 9, z * 9)[:, None] * 0.4), col)   # as dark as the floor's flesh
            if o["hinge_u"] is not None:                                                  # rust running down below each hinge pin
                for zp in (0.8, 5.6):
                    run = (np.abs(u - o["hinge_u"]) < 0.12 + (zp - z) * 0.03) & (z < zp) & (z > zp - 1.6 - vn(u * 5, zp) * 1.2) & (r < 0.1)
                    fade = np.clip((z - (zp - 2.8)) / 2.8, 0, 1)
                    col = np.where(run[:, None], col * (1 - fade[:, None] * 0.6) + RUST_D * fade[:, None] * 0.6, col)
        else:
            R = R_IRON
            _, a, b, z = _leaf_sdf(Pv, o)
            q = val * len(R)
            col = R[np.clip(q, 0, len(R) - 1).astype(int)]
            scale = vn(a * 12 + seed, z * 12) > 0.6
            col = np.where(scale[:, None], col * 0.75, col)                               # black scale
            wetm = (N[:, 2] > 0.5) | (z < 0.35)
            bloom = wetm & (vn(a * 9 + seed, z * 9) > 0.35)
            col = np.where(bloom[:, None], RUST * (0.3 + val[:, None] * 1.1) * (0.75 + vn(a * 30, z * 30)[:, None] * 0.5), col)
            fib = np.abs(np.sin(a * 140 + vn(a * 4, z * 0.8) * 6)) < 0.18                  # the grain splitting, like wood
            col = np.where((fib & (vn(a * 3 + 7, z * 0.5) > 0.6))[:, None], col * 0.7 + RUST_D * 0.3, col)
            runs = (z < 3.0) & (np.abs(np.sin(a * 31 + seed)) > 0.96)
            col = np.where(runs[:, None], col * 0.7 + RUST_D * 0.3, col)
        col = col * (1 + (warm - wl[:, None]) * 1.6)                                 # tinted by the light's colour
        spec = np.clip(N @ hm, 0, 1) ** (12 if o["kind"] == "leaf" else 30) * (0.08 if o["kind"] == "leaf" else 0.03) * sk
        col = col + spec[:, None]
        rim = (np.clip(1 - N @ VIEW, 0, 1) ** 3) * (N[:, 0] < 0) * sk
        col = col + rim[:, None] * np.array([0.08, 0.09, 0.11])
        img[yx] = np.clip(col, 0, 1)
        zb[yx] = depth[vis]
    return img
