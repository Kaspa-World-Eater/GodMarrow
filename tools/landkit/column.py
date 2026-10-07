"""Old columns and their fallen drums (landkit), built from the art library's chapter 2 (ruins: Delphi, Olympia,
Baalbek, Palmyra; marble and limestone decay). Ray-marched along the game's camera (as eye.py, fang.py, bone.py).

  shaft(base_xyz, R, height, seed)                  a standing Doric shaft, broken at the top
  drum(centre_xyz, axis_xy, R, length, seed)        a fallen drum lying on its side
  draw(img, zb, dep_scene, to_px, shapes, lights, moon, burial)   ray-march and paint them

THE FORM. Drums 0.5 to 1.5 m stacked dry; 20 shallow flutes meeting at arrises, which weather chips and sugars round,
so an old shaft is soft-ribbed, not crisp; each drum shifted a few cm off true by old quakes; a hairline at each drum
joint; the top broken on a tilted rough plane, the break conchoidal and paler (fresh against the old skin). A fallen
drum shows its end face: the smooth contact band round the rim (anathyrosis), the recessed rough-picked centre, the
square socket of the old wooden pin.

THE SURFACE, placed by cause (chapter 2's cause masks):
- rain exposure (the normal up and open): bleached pale and sugary-granular; sheltered (flute bottoms on the lee side,
  under the break's overhang, the underside of a fallen drum): black crust;
- streaks running down from the break and from each drum joint;
- burial: pale ash packed in the flute bottoms up to the drift line at the foot; above it the stone;
- rising damp: a dark band at the foot, salt-eaten honeycomb pits in it;
- a dowel's rust running down from a drum joint here and there.
Pale limestone, lit cool by the moon and warm by the lantern; shadows blue-violet, never black.
"""
import numpy as np
from kit import vn, ramp, skylit

KX, KY, KZ = 18.0, 9.0, 21.0
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)
R_LIME = ramp("#17151d", "#26232c", "#3a3539", "#524b4a", "#6d655d", "#8a8073", "#a69b89", "#c1b6a0")
CRUST = np.array([0.1, 0.09, 0.085])
ASHF = np.array([0.52, 0.51, 0.49])
RUST = np.array([0.42, 0.22, 0.1])
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.47
NFL = 20


def shaft(base, R, height, seed=1):
    rr = np.random.default_rng(seed)
    drums, z = [], 0.0
    while z < height + 1.0:
        dh = rr.uniform(0.55, 0.85)
        drums.append((z, z + dh, rr.normal(0, 0.03), rr.normal(0, 0.03)))     # each shifted a little off true
        z += dh
    return dict(kind="shaft", b=np.array(base, float), R=R, h=height, seed=seed, drums=drums,
                tilt=(rr.uniform(-0.5, 0.5), rr.uniform(-0.5, 0.5)), rust=rr.integers(0, max(1, len(drums) - 1)))


def drum(centre, axis, R, length, seed=2):
    a = np.array([axis[0], axis[1], 0.0])
    a /= np.linalg.norm(a)
    return dict(kind="drum", c=np.array(centre, float), a=a, R=R, L=length, seed=seed)


def _flute(th, R, depth, wear):
    """the fluted radius: shallow scallops meeting at arrises; wear softens the arrises"""
    ph = ((th * NFL / (2 * np.pi)) % 1.0) - 0.5                        # -0.5..0.5 across one flute, arris at +-0.5
    sc = np.sqrt(np.clip(1 - (2 * ph) ** 2, 0, 1))                       # the scallop's depth profile
    arr = np.clip(1 - (0.5 - np.abs(ph)) / 0.12, 0, 1)                    # near the arris
    return R - depth * sc - wear * arr ** 2 * depth * 0.8


def _shaft_sdf(P, o):
    b, R = o["b"], o["R"]
    q = P - b
    z = q[..., 2]
    dx = np.zeros(z.shape)
    dy = np.zeros(z.shape)
    joint = np.full(z.shape, 9.0)
    for (z0, z1, ox, oy) in o["drums"]:
        m = (z >= z0) & (z < z1)
        dx = np.where(m, ox, dx)
        dy = np.where(m, oy, dy)
        joint = np.minimum(joint, np.minimum(np.abs(z - z0), np.abs(z - z1)))
    x, y = q[..., 0] - dx, q[..., 1] - dy
    th = np.arctan2(y, x)
    wear = 0.6 + (vn(th * 3 + o["seed"], z * 0.8) - 0.5) * 0.8
    r = _flute(th, R, R * 0.05, wear)
    r = r - np.exp(-joint / 0.015) * 0.012                              # the drum joint's hairline
    d = (np.hypot(x, y) - r) * 0.85
    top = o["h"] + x * o["tilt"][0] * 0.4 + y * o["tilt"][1] * 0.4 + (vn(x * 3 + o["seed"], y * 3) - 0.5) * 0.35 \
        + (vn(x * 11, y * 11 + o["seed"]) - 0.5) * 0.06
    d = np.maximum(d, z - top)
    return np.maximum(d, -z - 0.3), th, z, joint, top


def _drum_sdf(P, o):
    q = P - o["c"]
    a = o["a"]
    s = (q * a).sum(-1)
    rad = q - a * s[..., None]
    up = np.array([0, 0, 1.0])
    side = np.cross(a, up)
    th = np.arctan2((rad * up).sum(-1), (rad * side).sum(-1))
    r = _flute(th, o["R"], o["R"] * 0.05, 0.8)
    d_side = np.linalg.norm(rad, axis=-1) - r
    end = np.abs(s) - o["L"] / 2
    rr_ = np.linalg.norm(rad, axis=-1) / o["R"]
    recess = (rr_ < 0.8) * 0.012                                          # the rough centre sits back from the band
    sock = (np.abs((rad * side).sum(-1)) < o["R"] * 0.09) & (np.abs((rad * up).sum(-1)) < o["R"] * 0.09)
    end = end + recess + sock * 0.05
    d = np.maximum(d_side * 0.85, end)
    return d, th, s, rr_


def sdf(P, o):
    return _shaft_sdf(P, o)[0] if o["kind"] == "shaft" else _drum_sdf(P, o)[0]


def _box(o, to_px):
    if o["kind"] == "shaft":
        pts = [o["b"], o["b"] + np.array([0, 0, o["h"] + 0.3])]
        r = o["R"] * 1.4
    else:
        pts = [o["c"] - o["a"] * o["L"] / 2, o["c"] + o["a"] * o["L"] / 2]
        r = o["R"] * 1.4
    ps = [to_px(tuple(p)) for p in pts]
    return (int(min(p[0] for p in ps) - r * KX - 2), int(max(p[0] for p in ps) + r * KX + 2),
            int(min(p[1] for p in ps) - r * KX - 2), int(max(p[1] for p in ps) + r * KX + 2))


def draw(img, zb, dep_scene, to_px, shapes, lights, moon, ground=None, ambient=0.14, tol=0.6):
    GH, GW = img.shape[:2]
    ox, oy = to_px((0.0, 0.0, 0.0))
    hm = (moon + VIEW) / np.linalg.norm(moon + VIEW)
    for o in shapes:
        x0, x1, y0, y1 = _box(o, to_px)
        x0, x1, y0, y1 = max(0, x0), min(GW, x1), max(0, y0), min(GH, y1)
        if x1 <= x0 or y1 <= y0:
            continue
        ys, xs = np.mgrid[y0:y1, x0:x1]
        zc = (o["b"][2] + o["h"] / 2) if o["kind"] == "shaft" else o["c"][2]
        a_ = (xs + 0.5 - ox) / KX
        b_ = (ys + 0.5 - oy + zc * KZ) / KY
        P0 = np.dstack([(a_ + b_) / 2, (b_ - a_) / 2, np.full(xs.shape, zc)])
        span = 6.0
        O = P0 + VIEW * span
        t = np.zeros(xs.shape)
        alive = np.ones(xs.shape, bool)
        hit = np.zeros(xs.shape, bool)
        for _ in range(100):
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
        e = 0.005
        N = np.stack([sdf(Pv + np.array(dv), o) - sdf(Pv - np.array(dv), o) for dv in ([e, 0, 0], [0, e, 0], [0, 0, e])], -1)
        N /= np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9
        seed = o["seed"]
        ndl = np.clip(N @ moon, 0, 1) * skylit(Pv)
        lit = np.clip((ndl - 0.03) / 0.25, 0, 1)
        val = ambient + lit * 0.4 + ndl * 0.25
        occ = np.clip(sdf(Pv + N * 0.06, o) / 0.06, 0, 1)                  # flute bottoms and joints a little shut in
        sk = skylit(Pv)
        sky = np.clip(N[:, 2] * 0.5 + 0.5, 0, 1) * 0.1 * (1 - lit) * sk     # the sky's soft light in the shade: only under the open sky
        refl = np.clip(-N[:, 2] * 0.5 + 0.5, 0, 1) * 0.04 * (1 - lit)       # light thrown up from the ground
        warm = np.zeros((len(Pv), 3))
        for (lp, lc, reach) in lights:
            v_ = np.array(lp) - Pv
            dist = np.linalg.norm(v_, axis=-1)
            att = 1 / (1 + (dist / reach) ** 2)
            warm += (np.clip((N * (v_ / dist[:, None])).sum(-1), 0, 1) * att)[:, None] * np.array(lc) * 0.8
        wl = warm.mean(1)
        val = (val + sky + refl + np.clip(wl, 0, 0.5) * 0.55) * (0.5 + 0.5 * occ)   # light adds; flute bottoms shut in
        yx = (ys[vis], xs[vis])
        q = val * len(R_LIME)
        q = np.where(np.abs(q - np.round(q)) < 0.04, q + BAYER[yx[0] % 4, yx[1] % 4] * 0.7, q)
        col = R_LIME[np.clip(q, 0, len(R_LIME) - 1).astype(int)]
        # causes: rain exposure (up and open) bleaches and sugars; shelter crusts black
        expo = np.clip((N[:, 2] - 0.45) * 2, 0, 1) * occ                   # only faces that truly look up
        sugar = (vn(Pv[:, 0] * 30 + seed, Pv[:, 1] * 30 + Pv[:, 2] * 30) - 0.5) * 0.12 * expo
        col = col * (1 + expo[:, None] * 0.05 + sugar[:, None] * 0.5)
        shelter = np.clip(0.55 - occ, 0, 1) * 2 * (N[:, 0] + N[:, 1] < 0.4)
        if o["kind"] == "drum":
            shelter = np.maximum(shelter, np.clip(-N[:, 2] - 0.2, 0, 1))    # its underside
        crust = shelter * (vn(Pv[:, 0] * 6 + seed, Pv[:, 2] * 6 + Pv[:, 1] * 6) > 0.35)
        col = col * (1 - crust[:, None] * 0.55) + CRUST * crust[:, None] * 0.3
        if o["kind"] == "shaft":
            _, th, z, joint, top = _shaft_sdf(Pv, o)
            brk = z > top - 0.12
            col = np.where(brk[:, None], col * 1.05, col)                   # the fresh break, a little paler
            streak = (np.abs(np.sin(th * 23 + seed)) > 0.93) & (z > top - 1.6 - vn(th * 4, 1) * 1.2) & ~brk
            col = np.where(streak[:, None], col * 0.72, col)                # runs down from the break
            fb = (np.abs(((th * NFL / (2 * np.pi)) % 1.0) - 0.5) > 0.33) == False
            drift = 0.35 + vn(th * 2 + seed, 3) * 0.35
            ashy = fb & (z < drift)
            col = np.where(ashy[:, None], ASHF * (0.6 + val[:, None] * 0.7), col)   # pale ash packed in the flutes
            damp = np.clip(1 - z / 0.55, 0, 1)
            col = col * (1 - damp[:, None] * 0.35)
            honey = (damp > 0.3) & (vn(th * 14 + seed, z * 14) > 0.7)
            col = np.where(honey[:, None], col * 0.55, col)                 # salt pits at the foot
            z0r = o["drums"][o["rust"]][1]
            rust = (np.abs(np.sin(th * 2 + seed)) > 0.9) & (z < z0r) & (z > z0r - 0.5 - vn(th, 2) * 0.4)
            col = np.where(rust[:, None], col * 0.6 + RUST * 0.4 * (0.5 + val[:, None]), col)
        else:
            _, th, s, rr_ = _drum_sdf(Pv, o)
            face = np.abs(s) > o["L"] / 2 - 0.03
            rough = face & (rr_ < 0.8)
            col = np.where(rough[:, None], col * (0.82 + (vn(Pv[:, 0] * 25, Pv[:, 1] * 25 + Pv[:, 2] * 25)[:, None] - 0.5) * 0.3), col)
            band = face & (rr_ >= 0.8)
            col = np.where(band[:, None], col * 1.1, col)                   # the smooth contact band
        col = col * (1 + (warm - wl[:, None]) * 0.8) + (refl[:, None] * np.array([0.5, 0.2, 0.18]))   # tinted by the light; the flesh's warmth below
        spec = np.clip(N @ hm, 0, 1) ** 20 * 0.05 * sk
        col = col + spec[:, None]
        rim = (np.clip(1 - N @ VIEW, 0, 1) ** 3) * (N[:, 0] < 0) * sk
        col = col + rim[:, None] * np.array([0.08, 0.09, 0.11])
        img[yx] = np.clip(col, 0, 1)
        zb[yx] = depth[vis]
    return img
