"""The forest floor under the blighted tree, made the way the ruins, the meadow and the dune were made (Derek
2026-10-06: "apply the same diligence to those tiles as you used with all of the other stuff ... that level of detail
and significance and beauty").

FORM FIRST: the floor is a height field on a world grid (5 cm cells), so every bump, hollow and stone is lit through
its own normals and casts its own shadow:
- the ground rolls gently; the trunk stands on the low mound of its own roots;
- hummocks of moss rise here and there, a hand high;
- a hollow holds standing water from the last rain;
- stones lie half-sunk, mossed on top.
MATERIALS, each with its own hue-shifted ramp and its own brushwork:
- leaf litter (the dying crown's fall): warm browns, mottled in clumps of fallen leaves, a dry brush across;
- moss: cushions on the hummocks, on the stone tops and over the roots; their edges pooled dark, then a lit lip;
- bare damp earth round the water;
- the water: the night sky in it, the moon dragged across in strokes, the lantern's glow broken by ripples; its shore
  a dark pooled band and a thin lit lip;
- stone: cool grey, its upper-left edge lit, moss and lichen on its crown.
TWO LIGHTS: the cold moon (and the tree's shadow, dappled), and the warm lantern the hero carries, falling off over a
few yards, casting its own shadows from the stones: the light tells where he stands.
LIVING LAYERS, drawn piece by piece: grass in tufts (each blade a tapered stroke, dark at the root, lit at the tip, as
the meadow), dead bracken (arching fronds with paired leaflets), mushrooms in clusters (domed caps lit on top, the
gills dark beneath), single fallen leaves where the lantern shows them, twigs.
"""
import numpy as np
from scipy import ndimage as nd
from tree_anatomy import vn, hexc, unit, to_screen, KX, KY, KZ, VIEW, SUN

EXT, RES = 14.0, 0.05
NG = int(2 * EXT / RES)
LITTER, MOSS, EARTH, WATER, STONE = 0, 1, 2, 3, 4
WATER_LEVEL = -0.075


def ramp(*cs):
    return np.array([hexc(c) for c in cs])


RAMPS = {
    LITTER: ramp("#120c10", "#1e1416", "#2c1d1a", "#3d281f", "#523524", "#6b4629", "#875c33", "#a0763f"),
    MOSS: ramp("#0b1210", "#132017", "#1d301b", "#2a4220", "#3b5525", "#516a2c", "#6c8236"),
    EARTH: ramp("#0d0a0e", "#171215", "#221a1b", "#2f2420", "#3d2f27", "#4e3c2f"),
    STONE: ramp("#121219", "#1e1e27", "#2d2c36", "#403e47", "#57535a", "#716b6d", "#8f8780"),
}
WATER_SKY = ramp("#0a0d16", "#111725", "#1a2234", "#263046")
MOONGLINT = hexc("#9aa6b8")
LAMP = hexc("#f0b860")
BLADE = ramp("#0c120e", "#16211a", "#24351f", "#3a4e26", "#5a6a30", "#8a8a44")
FROND = ramp("#2a160e", "#4a2614", "#6a3a1a", "#8e5626", "#2c3a1e", "#44542a")
CAP = ramp("#2a2220", "#5e5146", "#9a8a72", "#c8b998", "#e8dcc0")
LEAVES = ramp("#5a3420", "#4a3320", "#6a5226", "#3a3a1f", "#77482a", "#2c201b")


def fbm(x, y):
    return vn(x, y) * 0.55 + vn(x * 2.1 + 9, y * 2.1 + 9) * 0.3 + vn(x * 4.3 + 3, y * 4.3 + 3) * 0.15


class Floor:
    def __init__(self, seed=3, hollow=(-3.4, 2.4), keep_clear=()):
        rr = np.random.default_rng(seed)
        i = (np.arange(NG) + 0.5) * RES - EXT
        X, Y = np.meshgrid(i, i, indexing="xy")                          # X[row, col]: col is x, row is y
        H = (fbm(X * 0.16, Y * 0.16) - 0.5) * 0.16
        d0 = np.hypot(X, Y)
        H += 0.13 * np.exp(-(d0 / 1.7) ** 2)                              # the trunk's root mound
        mat = np.full(X.shape, LITTER)
        tag = np.zeros(X.shape, int)
        # moss hummocks
        hum = np.zeros(X.shape)
        for k in range(9):
            a, r = rr.uniform(0, 2 * np.pi), rr.uniform(2.6, 9.0)
            cx, cy = np.cos(a) * r, np.sin(a) * r
            rad = rr.uniform(0.5, 1.1)
            d = np.hypot(X - cx, (Y - cy) * rr.uniform(0.8, 1.25)) / rad + (fbm(X * 2 + k, Y * 2) - 0.5) * 0.5
            hum = np.maximum(hum, np.clip(1 - d ** 2, 0, 1) * rr.uniform(0.1, 0.18))
        H += hum
        mat[hum > 0.035] = MOSS
        # the hollow and its water
        hx, hy = hollow
        dh = np.hypot(X - hx, (Y - hy) * 1.25) + (fbm(X * 1.4, Y * 1.4) - 0.5) * 0.7
        H -= 0.17 * np.clip(1 - (dh / 1.9) ** 2, 0, 1) ** 1.2
        mat[(dh < 2.3) & (mat == LITTER)] = EARTH
        # stones, half-sunk
        for k in range(7):
            a, r = rr.uniform(0, 2 * np.pi), rr.uniform(2.2, 8.5)
            cx, cy = np.cos(a) * r, np.sin(a) * r
            if any(np.hypot(cx - kx, cy - ky) < 1.6 for kx, ky in keep_clear):
                continue
            ra, rb, th = rr.uniform(0.25, 0.5), rr.uniform(0.2, 0.36), rr.uniform(0, np.pi)
            u = (X - cx) * np.cos(th) + (Y - cy) * np.sin(th)
            v = -(X - cx) * np.sin(th) + (Y - cy) * np.cos(th)
            q = (u / ra) ** 2 + (v / rb) ** 2 + (fbm(X * 3 + k, Y * 3) - 0.5) * 0.35
            sh = np.sqrt(np.clip(1 - q, 0, 1)) * rr.uniform(0.2, 0.32) + H - 0.05
            m = (q < 1) & (sh > H)
            H = np.where(m, sh, H)
            mat[m] = STONE
            tag[m] = k + 1
        self.X, self.Y, self.H, self.mat, self.tag = X, Y, H, mat, tag
        self.Hs = nd.gaussian_filter(H, 1.2)
        gyy, gxx = np.gradient(self.Hs, RES)
        n = np.dstack([-gxx * 3.0, -gyy * 3.0, np.ones_like(H)])        # relief exaggerated for the light
        self.N = n / np.linalg.norm(n, axis=2, keepdims=True)
        self.AO = np.clip((nd.gaussian_filter(H, 10) - H) * 6.0, -0.4, 1)   # hollows darker, crowns lighter

    def idx(self, x, y):
        ci = np.clip(((x + EXT) / RES).astype(int), 0, NG - 1)
        ri = np.clip(((y + EXT) / RES).astype(int), 0, NG - 1)
        return ri, ci

    def h(self, x, y):
        return self.H[self.idx(x, y)]

    def cast(self, W, H, ox, oy):
        """each screen pixel down onto the floor (a short vertical march): points and normals"""
        SY, SX = np.mgrid[0:H, 0:W].astype(float)
        px = np.zeros((H, W))
        py = np.zeros((H, W))
        pz = np.full((H, W), -0.3)
        got = np.zeros((H, W), bool)
        for z in np.arange(0.42, -0.3, -0.01):
            x = ((SY - oy + z * KZ) / KY + (SX - ox) / KX) / 2
            y = ((SY - oy + z * KZ) / KY - (SX - ox) / KX) / 2
            new = ~got & (self.h(x, y) >= z)
            px[new], py[new], pz[new] = x[new], y[new], z
            got |= new
        rest = ~got
        x = ((SY - oy - 0.3 * KZ) / KY + (SX - ox) / KX) / 2
        y = ((SY - oy - 0.3 * KZ) / KY - (SX - ox) / KX) / 2
        px[rest], py[rest] = x[rest], y[rest]
        pts = np.stack([px, py, pz], -1)
        return pts, self.N[self.idx(px, py)]


def paint_floor(img, R, F, lamp, t=0.0):
    """the floor's pixels, painted; R is the tree render's raw buffers (made over F's ground)"""
    gm = R.kind == 0
    P = R.P3
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    W_, H_ = img.shape[1], img.shape[0]
    ri, ci = F.idx(x, y)
    mat = F.mat[ri, ci]
    water = gm & (F.H[ri, ci] < WATER_LEVEL)
    n = R.nrm
    # the moon: its light, the tree's dappled shadow, the floor's own shadows (stones, hummocks)
    ndl = np.clip((n * SUN).sum(-1), 0, 1)
    own = np.zeros(gm.shape, bool)
    for k in range(1, 14):
        s = k * 0.06
        own |= F.h(x + SUN[0] * s, y + SUN[1] * s) > z + SUN[2] * s * 0.9 + 0.01
    moon = ndl * np.where(R.shadowed | own, 0.18, 1.0)
    # the lantern: warm, falling off over a few yards, its own shadows from the stones
    lv = lamp[None, None, :] - P
    ld = np.linalg.norm(lv, axis=-1)
    lu = lv / ld[..., None]
    lshad = np.zeros(gm.shape, bool)
    for k in range(1, 12):
        f = k / 12
        q = P + lv * f
        lshad |= F.h(q[..., 0], q[..., 1]) > q[..., 2] + 0.01
    lamp_k = np.clip((n * lu).sum(-1), 0, 1) ** 0.8 / (1 + (ld / 1.6) ** 2) * np.where(lshad, 0.15, 1.0)
    lamp_k *= 1.0 + 0.06 * np.sin(t * 9.0)
    ao = F.AO[ri, ci]
    v = 0.1 + moon * 0.4 + lamp_k * 1.1 - ao * 0.25
    # brushwork per material, fixed to the world
    brush = (vn(x * 1.8 + y * 0.5, y * 7.0 - x * 2.0) - 0.5) * 0.035                    # a dry brush across
    mottle = (vn(x * 1.4, y * 1.4) - 0.5) * 0.06 + (vn(x * 5, y * 5) - 0.5) * 0.03      # drifts of fallen leaves
    bay = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4)[R.SY.astype(int) % 4, R.SX.astype(int) % 4] / 16.0
    v = v + (bay - 0.5) * 0.035
    cushion = (vn(x * 9, y * 9) - 0.5) * 0.1                                               # moss cushions
    va = v + np.where(mat == LITTER, brush + mottle, np.where(mat == MOSS, cushion, brush * 0.6))
    out = img.copy()
    for m in (LITTER, MOSS, EARTH, STONE):
        rp = RAMPS[m]
        mm = gm & (mat == m) & ~water
        out[mm] = rp[np.clip((va[mm] * len(rp)).astype(int), 0, len(rp) - 1)]
    # stone: its crown mossed, its upper-left edge lit
    st = gm & (mat == STONE) & ~water
    crown = st & (n[..., 2] > 0.8) & (vn(x * 6, y * 6) > 0.45)
    rp = RAMPS[MOSS]
    out[crown] = rp[np.clip(((va[crown] - 0.04) * len(rp)).astype(int), 0, len(rp) - 1)]
    edge = st & ~np.roll(st, 1, axis=1) | st & ~np.roll(st, 1, axis=0)
    rpS = RAMPS[STONE]
    out[edge & (moon > 0.4)] = rpS[np.clip(((va[edge & (moon > 0.4)] + 0.14) * len(rpS)).astype(int), 0, len(rpS) - 1)]
    # moss edges: a pooled dark band just inside, then a lit lip on the sunward side
    mossm = gm & (mat == MOSS)
    inner = nd.binary_erosion(mossm, iterations=1)
    band = mossm & ~inner
    out[band] = out[band] * 0.72
    lip = band & (np.roll(~mossm, 1, axis=1) | np.roll(~mossm, 1, axis=0)) & (moon > 0.3)
    out[lip] = out[lip] * 1.5
    # the water: the night sky, the moon dragged across in strokes, the lantern's glow broken by ripples
    if water.any():
        sky = WATER_SKY[np.clip(((0.35 + (vn(x * 0.8, y * 0.8) - 0.5) * 0.3) * 4).astype(int), 0, 3)]
        out[water] = sky[water]
        ripple = vn(x * 2.0 - t * 0.3, y * 9.0 + t * 0.5)
        glint = water & (ripple > 0.72) & (vn(x * 0.7 + 3, y * 0.7) > 0.5) & ~R.shadowed
        out[glint] = out[glint] * 0.4 + MOONGLINT * 0.6
        # the lantern's reflection: seen where the eye's ray off the water would meet the lamp
        lamp_s = np.array(to_screen(lamp * np.array([1, 1, -1]) + np.array([0, 0, 2 * WATER_LEVEL]), 0, 0))
        sx, sy = R.SX, R.SY
        ox_ = sx - (P[..., 0] - P[..., 1]) * KX
        oy_ = sy - ((P[..., 0] + P[..., 1]) * KY - P[..., 2] * KZ)
        rx, ry = lamp_s[0] + ox_, lamp_s[1] + oy_
        refl = water & (np.hypot((sx - rx) * 0.8, (sy - ry) * 0.35) < 9) & (ripple > 0.45)
        out[refl] = out[refl] * 0.4 + LAMP * 0.6
        # the shore: a dark pooled band in the water's edge, a thin lit lip on the earth
        wet_in = water & ~nd.binary_erosion(water, iterations=2)
        out[wet_in] = out[wet_in] * 0.6
        lip_w = gm & ~water & nd.binary_dilation(water, iterations=1)
        out[lip_w] = out[lip_w] * 1.35
    # light temperature, stepped: warm where the lantern wins, cool where only the moon reaches
    warm = gm & (lamp_k > 0.12)
    out[warm] = out[warm] * np.array([1.12, 1.0, 0.8]) + LAMP * np.clip(lamp_k[warm] - 0.12, 0, 0.5)[:, None] * 0.25
    cool = gm & (lamp_k <= 0.12) & (moon < 0.25)
    out[cool] = out[cool] * np.array([0.92, 0.95, 1.08])
    return out, dict(moon=moon, lamp=lamp_k, mat=mat, water=water)


def line(put, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for k in range(n + 1):
        f = k / max(n, 1)
        put(int(round(x0 + (x1 - x0) * f)), int(round(y0 + (y1 - y0) * f)), col)


def living(img, R, F, info, ox, oy, rr, tree_r=1.0):
    """grass tufts, dead bracken, mushrooms, fallen leaves where the lantern shows them, twigs"""
    kind, P = R.kind, R.P3
    H_, W_ = kind.shape
    moon, lamp_k, mat, water = info["moon"], info["lamp"], info["mat"], info["water"]

    def put(ix, iy, col):
        if 0 <= ix < W_ and 0 <= iy < H_ and kind[iy, ix] == 0 and not water[iy, ix]:
            img[iy, ix] = col
            return True
        return False

    def lightat(ix, iy):
        ix, iy = min(max(ix, 0), W_ - 1), min(max(iy, 0), H_ - 1)
        return moon[iy, ix] * 0.6 + lamp_k[iy, ix] * 1.4
    # ---- grass: a few drifts of full tufts, out where the moon reaches the floor, none under the crown's heart
    drifts = []
    while len(drifts) < 9:
        cx, cy = rr.uniform(-11, 11), rr.uniform(-11, 11)
        if np.hypot(cx, cy) > 4.0:
            drifts.append((cx, cy))
    for (dx_, dy_) in drifts:
        for _ in range(rr.integers(3, 7)):
            cx, cy = dx_ + rr.normal(0, 0.8), dy_ + rr.normal(0, 0.6)
            sx, sy = to_screen(np.array([cx, cy, float(F.h(np.array(cx), np.array(cy)))]), ox, oy)
            ix, iy = int(sx), int(sy)
            if not (0 <= ix < W_ and 0 <= iy < H_) or kind[iy, ix] != 0 or water[iy, ix] or mat[iy, ix] == STONE:
                continue
            for b_ in range(rr.integers(10, 20)):
                bx = ix + rr.normal(0, 2.2)
                hgt = rr.uniform(6, 14) * np.exp(-((bx - ix) / 4.5) ** 2)        # tallest in the tuft's heart
                lean = (bx - ix) * 0.18 + rr.normal(0.25, 0.25)                 # the blades fan out, and the wind leans them
                px_, py_ = bx, iy
                for k in range(1, int(hgt) + 1):
                    f = k / hgt
                    qx, qy = bx + lean * hgt * f * f, iy - k
                    lit = lightat(int(qx), iy)
                    tone = np.clip(int((0.1 + f * 0.5 + lit * 0.55) * len(BLADE)), 0, len(BLADE) - 1)
                    line(put, px_, py_, qx, qy, BLADE[tone])
                    px_, py_ = qx, qy
    # ---- dead bracken: arching fronds, paired leaflets shortening to the tip
    for (cx, cy) in [(-2.4, 4.6), (5.2, 0.8), (-5.0, -1.8), (2.8, 5.8), (6.4, -4.6), (-1.0, -6.4), (-6.5, 4.0)]:
        for f_ in range(rr.integers(6, 11)):
            ang = rr.uniform(0, 2 * np.pi)
            ln, hgt = rr.uniform(0.7, 1.2), rr.uniform(0.35, 0.65)
            p0 = np.array([cx + rr.normal(0, 0.3), cy + rr.normal(0, 0.3), 0.0])
            p0[2] = F.h(np.array(p0[0]), np.array(p0[1]))
            dg = np.array([np.cos(ang), np.sin(ang), 0.0])
            side = np.array([-dg[1], dg[0], 0.0])
            green = rr.random() < 0.25
            for i in range(28):
                tt = i / 27
                pt = p0 + dg * ln * tt + np.array([0, 0, hgt * 4 * tt * (1 - tt) * (1.0 if tt < 0.5 else 1.2) - 0.08 * tt])
                sx, sy = to_screen(pt, ox, oy)
                lit = lightat(int(sx), int(sy))
                if i:
                    line(put, psx, psy, sx, sy, (FROND[4] if green else FROND[1]) * (0.7 + lit))
                psx, psy = sx, sy
                if tt > 0.1 and i % 2 == 0:
                    pl = 0.22 * (1 - tt) ** 0.7
                    for sg in (-1, 1):
                        q = pt + side * sg * pl + dg * 0.08 + np.array([0, 0, -0.1])
                        qx, qy = to_screen(q, ox, oy)
                        c = (FROND[5] if sg < 0 else FROND[4]) if green else (FROND[3] if sg < 0 else FROND[2])
                        line(put, sx, sy, qx, qy, c * (0.6 + lit * 0.9))
    # ---- mushrooms in clusters: at the trunk's foot, on the fallen limb's end, by the stones
    for (cx, cy, n_) in [(0.9, 1.2, 6), (-1.1, 0.9, 4), (3.9, -1.9, 7), (-0.6, -1.3, 3)]:
        for k in range(n_):
            px, py = cx + rr.normal(0, 0.22), cy + rr.normal(0, 0.18)
            pz = float(F.h(np.array(px), np.array(py)))
            sx, sy = to_screen(np.array([px, py, pz]), ox, oy)
            ix, iy = int(sx), int(sy)
            if not (3 <= ix < W_ - 3 and 6 <= iy < H_ - 2) or kind[iy, ix] != 0:
                continue
            size = rr.choice([1, 1, 2, 2, 3])
            stem = size + 1
            lit = lightat(ix, iy)
            k_ = 0.55 + lit * 0.9
            for j in range(stem):
                put(ix, iy - j, CAP[1] * k_)
            top = iy - stem
            for dx in range(-size, size + 1):
                put(ix + dx, top, CAP[0] * k_)                           # the gills, dark beneath the cap
            for dx in range(-size, size + 1):
                put(ix + dx, top - 1, CAP[2] * k_)
            for dx in range(-size + 1, size):
                put(ix + dx, top - 2, CAP[3] * k_)
            put(ix - max(size - 1, 0), top - 2 if size > 1 else top - 1, np.minimum(CAP[4] * k_, 1))   # the lit crown
            put(ix + 1, iy + 1, img[min(iy + 1, H_ - 1), min(ix + 1, W_ - 1)] * 0.6)                   # its shadow
    # ---- single fallen leaves where the lantern shows them, a few in the moonlit flecks
    for _ in range(2600):
        lx, ly = rr.uniform(0, W_), rr.uniform(0, H_)
        ix, iy = int(lx), int(ly)
        if kind[iy, ix] != 0 or water[iy, ix] or mat[iy, ix] == STONE:
            continue
        lit = lamp_k[iy, ix] * 1.6 + moon[iy, ix] * 0.35
        if rr.random() > lit:
            continue
        ang = rr.uniform(0, np.pi)
        ln, wd = rr.uniform(2.0, 3.2), rr.uniform(0.8, 1.2)
        c = LEAVES[rr.integers(0, len(LEAVES))] * (0.55 + lit * 0.7)
        for u in np.arange(-ln, ln + 0.01, 0.5):
            w = wd * np.clip(1 - (u / ln) ** 2, 0, 1) ** 0.6
            for vv in np.arange(-w, w + 0.01, 0.5):
                qx = lx + u * np.cos(ang) - vv * np.sin(ang)
                qy = ly + (u * np.sin(ang) + vv * np.cos(ang)) * 0.5
                put(int(qx), int(qy), c * (0.75 if abs(vv) < 0.3 else (1.12 if vv < 0 else 1.0)))
    return img
