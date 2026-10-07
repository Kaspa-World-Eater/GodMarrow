"""The god's bone (landkit): great bones as true forms, ray-marched along the game's camera (as eye.py, fang.py).

  rib(a, b, rise, ra, rb, seed)     a great rib from point a to point b (xyz), bowed up by `rise`: a flattened section
                                    (ra across its face, rb through it), swelling to knobbed heads at both ends
  skull(c, size, face, seed)        a skull: cranium, brow, cheekbones, jaw, deep orbits, the nasal hole, teeth
  draw(img, zb, dep_scene, to_px, shapes, lights, moon)   ray-march and paint any list of them

Its surface is old bone left out under the sky (weathering as it really goes, stage by stage): grey-ivory, darker and
greener in the grime; cracks running ALONG the grain, the outer shell flaking from them in places; pits; where it is
broken the spongy bone shows, dark and honeycombed; dried sinew still binding its heads, brown and fibrous; old blood
seeped from its ends. The moon lights its top, the warm lights its flank; a lit rim where it turns from the light.
"""
import numpy as np
from kit import vn, ramp

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)
R_BONE = ramp("#151316", "#26221f", "#3b3530", "#544c43", "#6f665a", "#8b8171", "#a69c89", "#c2b8a2")
SPONGE = np.array([0.18, 0.13, 0.1])
SINEW = np.array([0.24, 0.13, 0.08])
GRIME = np.array([0.8, 0.86, 0.74])
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.47


def rib(a, b, rise, ra, rb, seed=1, n=40):
    a, b = np.array(a, float), np.array(b, float)
    s = np.linspace(0, 1, n)
    rr = np.random.default_rng(seed)
    pts = a[None] * (1 - s[:, None]) + b[None] * s[:, None]
    pts[:, 2] += np.sin(s * np.pi) * rise
    side = np.cross(b - a, [0, 0, 1.0])
    side /= np.linalg.norm(side)
    pts += side[None] * (np.sin(s * np.pi * 2 + rr.uniform(0, 6)) * 0.08)[:, None]    # not quite true: it warped
    head = 1 + 0.55 * (np.exp(-(s / 0.07) ** 2) + np.exp(-((1 - s) / 0.07) ** 2))      # the knobbed heads
    waist = 1 - 0.18 * np.sin(s * np.pi)
    return dict(kind="tube", pts=pts, ra=ra * head * waist, rb=rb * head * waist, side=side, seed=seed,
                brk=[rr.uniform(0.25, 0.75) for _ in range(2)])


def skull(c, size, face, seed=2):
    return dict(kind="skull", c=np.array(c, float), s=float(size), f=np.array(face, float) / np.linalg.norm(face), seed=seed)


def _tube(P, o):
    pts = o["pts"]
    A, B = pts[:-1], pts[1:]
    AB = B - A
    L2 = (AB * AB).sum(-1)
    sh = P.shape[:-1]
    Q = P.reshape(-1, 1, 3)
    t = np.clip(((Q - A[None]) * AB[None]).sum(-1) / L2[None], 0, 1)
    C = A[None] + AB[None] * t[..., None]
    off = Q - C
    side = o["side"]
    up = np.cross(AB / np.sqrt(L2)[:, None], side[None])
    ob = (off * side).sum(-1)
    on = (off * up[None]).sum(-1)
    k = np.arange(len(A))[None] + t
    s = k / (len(pts) - 1)
    ra = np.interp(s, np.linspace(0, 1, len(pts)), o["ra"])
    rb = np.interp(s, np.linspace(0, 1, len(pts)), o["rb"])
    tan = AB / np.sqrt(L2)[:, None]
    along = np.abs((off * tan[None]).sum(-1))                           # past a segment's end: count it
    d = np.maximum((np.hypot(ob / ra, on / rb) - 1) * np.minimum(ra, rb), along)
    i = np.argmin(d, axis=1)
    j = np.arange(len(i))
    return (d[j, i].reshape(sh), s[j, i].reshape(sh), np.arctan2(on[j, i], ob[j, i]).reshape(sh))


def _smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def _skull(P, o):
    s, f = o["s"], o["f"]
    up = np.array([0, 0, 1.0])
    rt = np.cross(f, up)
    rt /= np.linalg.norm(rt)
    q = P - o["c"]
    x, y, z = (q * rt).sum(-1) / s, (q * f).sum(-1) / s, (q * up).sum(-1) / s
    cran = np.sqrt(x ** 2 + (y + 0.15) ** 2 * 1.1 + (z - 0.15) ** 2) - 0.62
    face = np.sqrt((x * 1.25) ** 2 + ((y - 0.25) * 1.3) ** 2 + ((z + 0.25) * 1.15) ** 2) - 0.5
    d = _smin(cran, face, 0.18)
    cheek = np.sqrt((np.abs(x) - 0.38) ** 2 + (y - 0.3) ** 2 * 2 + (z + 0.12) ** 2 * 3) - 0.16
    d = _smin(d, cheek, 0.08)
    jaw = np.maximum(np.sqrt((x * 1.4) ** 2 + ((y - 0.3) * 1.2) ** 2 + ((z + 0.62) * 2.2) ** 2) - 0.42, -(z + 0.5))
    d = _smin(d, jaw, 0.06)
    orb = np.sqrt((np.abs(x) - 0.24) ** 2 + (y - 0.62) ** 2 + (z + 0.02) ** 2) - 0.2
    nose = np.sqrt((x * 2.2) ** 2 + (y - 0.7) ** 2 + ((z + 0.3) * 1.2) ** 2) - 0.13
    d = np.maximum(d, -orb)
    d = np.maximum(d, -nose)
    return d * s, x, y, z


def sdf(P, o):
    if o["kind"] == "tube":
        return _tube(P, o)[0]
    return _skull(P, o)[0]


def _bounds(o, to_px):
    if o["kind"] == "tube":
        r = max(o["ra"].max(), o["rb"].max())
        ps = [to_px(tuple(p)) for p in o["pts"]]
    else:
        r = o["s"] * 1.1
        ps = [to_px(tuple(o["c"]))]
    xs = [p[0] for p in ps]
    ys = [p[1] for p in ps]
    pad = r * KX * 1.6 + 3
    return int(min(xs) - pad), int(max(xs) + pad), int(min(ys) - pad), int(max(ys) + pad)


def draw(img, zb, dep_scene, to_px, shapes, lights, moon, ambient=0.15, tol=0.5):
    GH, GW = img.shape[:2]
    ox, oy = to_px((0.0, 0.0, 0.0))
    for o in shapes:
        x0, x1, y0, y1 = _bounds(o, to_px)
        x0, x1, y0, y1 = max(0, x0), min(GW, x1), max(0, y0), min(GH, y1)
        if x1 <= x0 or y1 <= y0:
            continue
        ys, xs = np.mgrid[y0:y1, x0:x1]
        zc = (o["pts"][:, 2].mean() if o["kind"] == "tube" else o["c"][2])
        a_ = (xs + 0.5 - ox) / KX
        b_ = (ys + 0.5 - oy + zc * KZ) / KY
        P0 = np.dstack([(a_ + b_) / 2, (b_ - a_) / 2, np.full(xs.shape, zc)])
        span = 6.0
        O = P0 + VIEW * span
        t = np.zeros(xs.shape)
        alive = np.ones(xs.shape, bool)
        hit = np.zeros(xs.shape, bool)
        for _ in range(90):
            if not alive.any():
                break
            P = O - VIEW * t[..., None]
            d = np.full(xs.shape, 9.0)
            d[alive] = sdf(P[alive], o)
            nh = alive & (d < 0.004)
            hit |= nh
            alive &= ~nh
            t = np.where(alive, t + np.maximum(d * 0.8, 0.005), t)
            alive &= t < span * 2
        if not hit.any():
            continue
        P = O - VIEW * t[..., None]
        depth = P[..., 0] + P[..., 1]
        vis = hit & (depth >= dep_scene[ys, xs] - tol) & (depth > zb[ys, xs])
        if not vis.any():
            continue
        Pv = P[vis]
        e = 0.006
        N = np.stack([sdf(Pv + np.array(dv), o) - sdf(Pv - np.array(dv), o)
                      for dv in ([e, 0, 0], [0, e, 0], [0, 0, e])], -1)
        N /= np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9
        seed = o["seed"]
        if o["kind"] == "tube":
            _, s, th = _tube(Pv, o)
            u1, u2 = s * 40, th * 2
            ends = np.minimum(s, 1 - s)
        else:
            _, x, y, z = _skull(Pv, o)
            u1, u2 = x * 9 + z * 3, y * 9
            ends = np.ones(len(Pv))
        ndl = np.clip(N @ moon, 0, 1)
        val = ambient + ndl * 0.6
        warm = np.zeros((len(Pv), 3))
        hm = (moon + VIEW) / np.linalg.norm(moon + VIEW)
        spec = np.clip(N @ hm, 0, 1) ** 24 * 0.12
        for (lp, lc, reach) in lights:
            v_ = np.array(lp) - Pv
            dist = np.linalg.norm(v_, axis=-1)
            att = 1 / (1 + (dist / reach) ** 2)
            warm += (np.clip((N * (v_ / dist[:, None])).sum(-1), 0, 1) * att)[:, None] * np.array(lc) * 0.8
        # cavities darken (orbits, nose, the underside): ambient occlusion from the distance a little way out
        occ = np.clip(sdf(Pv + N * 0.12, o) / 0.12, 0, 1)
        val = val * (0.55 + 0.45 * occ)
        yx = (ys[vis], xs[vis])
        bay = BAYER[yx[0] % 4, yx[1] % 4]
        q = val * len(R_BONE)
        q = np.where(np.abs(q - np.round(q)) < 0.08, q + bay * 0.7, q)
        col = R_BONE[np.clip(q, 0, len(R_BONE) - 1).astype(int)]
        # weathering: cracks along the grain, the shell flaking from them, pits, grime in the low places
        crack = np.abs(vn(u2 * 3 + seed, u1 * 0.15) - 0.5) < 0.018
        flake = (np.abs(vn(u2 * 3 + seed, u1 * 0.15) - 0.5) < 0.06) & (vn(u1 * 0.5, u2 * 4) > 0.62)
        col = np.where(flake[:, None], col * 0.82, col)
        col = np.where(crack[:, None], col * 0.45, col)
        pit = vn(u1 * 3 + seed, u2 * 5) > 0.82
        col = np.where(pit[:, None], col * 0.7, col)
        grime = np.clip((0.55 - occ) * 2, 0, 1) + np.clip(-N[:, 2], 0, 1) * 0.5
        col = col * (1 - np.clip(grime, 0, 1)[:, None] * (1 - GRIME) * 0.6)
        if o["kind"] == "tube":
            for b_s in o["brk"]:                                          # where the shell broke: the spongy bone
                spg = (np.abs(s - b_s) < 0.035 + vn(th * 3, b_s * 9) * 0.03) & (vn(s * 60, th * 8) > 0.3) & (N[:, 2] > -0.2)
                col = np.where(spg[:, None], SPONGE * (0.6 + val[:, None]) * (0.7 + (vn(s * 300, th * 30)[:, None] > 0.5) * 0.5), col)
            sin_ = (ends < 0.12 + vn(th * 2 + seed, 1) * 0.06) & (np.sin(th * 14 + s * 90) > -0.2)
            col = np.where(sin_[:, None], SINEW * (0.55 + val[:, None] * 0.9) * (0.8 + (np.sin(th * 30 + s * 200) > 0)[:, None] * 0.35), col)
            seep = (ends < 0.2) & (vn(th * 4 + 9, s * 30) > 0.58) & ~sin_ & (N[:, 2] < 0.4)
            col = np.where(seep[:, None], col * np.array([0.6, 0.35, 0.3]), col)
        col = col * (1 + warm * 1.3) + spec[:, None]
        rim = (np.clip(1 - N @ VIEW, 0, 1) ** 3) * (N[:, 0] < 0)
        col = col + rim[:, None] * np.array([0.1, 0.11, 0.13])
        img[yx] = np.clip(col, 0, 1)
        zb[yx] = depth[vis]
    return img
