"""Rocks of Godmarrow's old woods, as reusable objects (landkit; Derek: "every rock every grass like everything").

The brief:
- ERRATIC: a granite boulder a yard or two across, carried by ice an age ago, rounded by the weather but keeping a few
  broad worn facets; sunk a third into the ground. Moss caps it thickly (moss maps the wet and the still: the top,
  the north side, the crevices); lichen rosettes mark the lit faces (crustose: a pale growing ring, a grey-green heart;
  now and then a rust-orange crust); the damp of the ground climbs a dark wet line round its foot.
- SLAB: sandstone split along its bedding: flat-topped, angular, its edges chipped, a crack running through, tilted
  where it settled; moss in the crack and along its top edge.
- STONE: half a yard, rounded, half-buried, a moss cap.
- CLUSTER: three to six stones lying together, the small ones round the large.
Form first: facets are cutting planes softened by weathering (a smooth minimum), moss is a raised cushion, cracks are
cut into the height; then the painted light (the moon), then the materials, each with a hue-shifted ramp.

  python tools/landkit/rock.py OUT_DIR
"""
import sys
import os
import numpy as np
from scipy import ndimage as nd
from kit import Field, cast, normals, moon_shadow, ao, light, paint, rim, export, ramp, hexc, vn, fbm, B4, MOON

GRANITE = ramp("#13131a", "#202029", "#302f38", "#43404a", "#58545b", "#706a6e", "#8a8282", "#a49a94")
SANDST = ramp("#17121a", "#271e22", "#3a2c2b", "#4f3d35", "#66503f", "#7f664c", "#9a7e5c", "#b1956c")
MOSS = ramp("#0b120f", "#121d14", "#1a2a18", "#24381c", "#304621", "#3e5427", "#4e632d", "#5f7234")   # deep olive at night
LICHEN = ramp("#3c443a", "#58624f", "#76806a", "#96a088")
RUST = ramp("#4a2a18", "#6e3e1e", "#94582a")
STONE, MOSSM, LICH, LICH_O, CRACK = 1, 2, 3, 4, 5


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def boulder(F, rr, cx, cy, rx, ry, hgt, sink, facets=5, wear=0.08, ang=0.0):
    """a weathered boulder: an ellipsoid, cut by facet planes, the cuts rounded by the weather; sunk into the ground"""
    X, Y = F.X - cx, F.Y - cy
    u = X * np.cos(ang) + Y * np.sin(ang)
    v = -X * np.sin(ang) + Y * np.cos(ang)
    q = (u / rx) ** 2 + (v / ry) ** 2
    body = np.sqrt(np.clip(1 - q, 0, 1)) * hgt
    for k in range(facets):
        a = rr.uniform(0, 2 * np.pi)
        tilt = rr.uniform(0.6, 1.6)                                       # how steep the facet
        d = rr.uniform(0.55, 0.85)
        plane = (d * max(rx, ry) - (u * np.cos(a) + v * np.sin(a))) * tilt * hgt / max(rx, ry) + hgt * rr.uniform(0.5, 0.8)
        body = smin(body, plane, wear * hgt)
    top_cut = hgt * rr.uniform(0.82, 0.95)                                # a worn flat crown
    body = smin(body, np.full_like(body, top_cut), wear * hgt * 1.5)
    pits = (fbm(F.X * 9 + cx * 3, F.Y * 9) - 0.5) * 0.025 * hgt
    h = body + pits - sink * hgt
    m = (q < 1) & (h > 0)
    F.H = np.where(m, np.maximum(F.H, h), F.H)
    F.M[m] = STONE
    return m


def cracks(F, rr, m, n=2, depth=0.05):
    """frost-split cracks: wandering lines cut into the stone"""
    for _ in range(n):
        a = rr.uniform(0, np.pi)
        off = rr.uniform(-0.2, 0.2)
        line = np.abs((F.X * np.cos(a) + F.Y * np.sin(a)) - off + (fbm(F.X * 4, F.Y * 4) - 0.5) * 0.12)
        c = m & (line < 0.012)
        F.H = np.where(c, F.H - depth, F.H)
        F.M[c] = CRACK


def moss_cap(F, rr, m, amount=0.6, thick=0.035):
    """moss where it would grow: the top and the north (far, shaded) side, thickest in the hollows of the crown;
    a raised cushion with a lumpy surface"""
    Hs = nd.gaussian_filter(np.where(F.H < -5, 0, F.H), 2)
    gy, gx = np.gradient(Hs, F.res)
    flat = 1 / np.sqrt(1 + gx ** 2 + gy ** 2)
    north = np.clip(-gy * 0.3 - gx * 0.2 + 0.0, 0, 1)                     # facing away from the moon
    k = flat * 0.8 + north * 0.6 + (fbm(F.X * 3 + 5, F.Y * 3) - 0.5) * 0.9
    hol = np.clip((nd.gaussian_filter(Hs, 6) - Hs) * 40, 0, 0.5)
    mm = m & (k + hol > 1.35 - amount) & (F.H > F.H[m].max() * 0.35)
    lump = (fbm(F.X * 14, F.Y * 14) - 0.4) * thick
    F.H = np.where(mm, F.H + thick * 0.6 + lump, F.H)
    F.M[mm] = MOSSM
    return mm


def lichen(F, rr, m, n=14, orange=0.2):
    """crustose lichen rosettes on the exposed, lit stone"""
    Hs = nd.gaussian_filter(np.where(F.H < -5, 0, F.H), 2)
    gy, gx = np.gradient(Hs, F.res)
    up = 1 / np.sqrt(1 + gx ** 2 + gy ** 2)
    pts = np.argwhere(m & (F.M == STONE) & (up > 0.55))
    if len(pts) == 0:
        return
    for k in rr.choice(len(pts), min(n, len(pts)), replace=False):
        j, i = pts[k]
        cx, cy = F.X[j, i], F.Y[j, i]
        r = rr.uniform(0.03, 0.07)
        d = np.hypot(F.X - cx, F.Y - cy) / r + (fbm(F.X * 20 + k, F.Y * 20) - 0.5) * 0.4
        ring = m & (F.M == STONE) & (d < 1) & (up > 0.45)
        F.M[ring] = LICH_O if rr.random() < orange else LICH


def render(F, top, rp, seed):
    C = cast(F, top)
    n, side = normals(F, C, exag=1.2)
    sh = moon_shadow(F, C, n)
    a = ao(F, C)
    v = light(n, sh, a, side)
    mask = C["got"] & (C["pz"] > -0.05)
    M = F.at(F.M, C["px"], C["py"], 0)
    bay = B4[C["SY"].astype(int) % 4, C["SX"].astype(int) % 4]
    px, py, pz = C["px"], C["py"], C["pz"]
    # the stone: its own grain (mineral flecks, faint), and broad weathering stains running down the faces
    fleck = (vn(px * 60, py * 60 + pz * 60) > 0.86) * 0.06 - (vn(px * 55 + 9, py * 55) > 0.88) * 0.06
    stain = (fbm(px * 2 + pz * 0.5, py * 2) - 0.5) * 0.1 - side * (vn(px * 30 - py * 30, pz * 3) > 0.7) * 0.06
    wetline = np.clip(1 - pz / 0.09, 0, 1) * 0.12                          # the ground's damp climbing its foot
    vs = v + fleck + stain - wetline
    img = paint(rp, vs, mask & ((M == STONE) | (M == CRACK) | (M == 0)), bay)
    cr = mask & (M == CRACK)
    img[cr] = rp[0]
    lip = mask & (np.roll(cr, 1, axis=0) | np.roll(cr, 1, axis=1)) & ~cr  # a crack's lit upper lip
    img[lip] = np.minimum(img[lip] * 1.25, 1)
    mm = mask & (M == MOSSM)
    cush = (vn(px * 30, py * 30) - 0.5) * 0.14
    img[mm] = paint(MOSS, v * 0.9 + cush, mm, bay)[mm]
    under = mm & ~np.roll(mm, -1, axis=0)                                  # the moss cushion's dark lower edge
    img[under] = img[under] * 0.7
    lm = mask & (M == LICH)
    img[lm] = paint(LICHEN, v * 0.9 + 0.15, lm)[lm]
    lo = mask & (M == LICH_O)
    img[lo] = paint(RUST, v * 0.8 + 0.1, lo)[lo]
    img = rim(img, mask, C, 1.25)
    # the moon's temperature on the stone, stepped: lit faces a touch warm-grey, the shade a touch violet
    litk = (v > 0.6)[..., None]
    img = np.where(mask[..., None], np.where(litk, img * np.array([1.03, 1.0, 0.96]), img * np.array([0.96, 0.97, 1.05])), img)
    return img, mask, n, C


def make(kind, seed):
    rr = np.random.default_rng(seed)
    if kind == "erratic":
        rx, ry = rr.uniform(0.7, 1.15), rr.uniform(0.6, 0.95)
        F = Field(max(rx, ry) + 0.25)
        hgt = rr.uniform(1.0, 1.5)
        m = boulder(F, rr, 0, 0, rx, ry, hgt, sink=rr.uniform(0.25, 0.4), facets=rr.integers(4, 7), wear=0.1, ang=rr.uniform(0, np.pi))
        cracks(F, rr, m, n=rr.integers(1, 3), depth=0.06)
        lichen(F, rr, m, n=20)
        moss_cap(F, rr, m, amount=rr.uniform(0.45, 0.75))
        rp, top, radius = GRANITE, hgt, max(rx, ry) * 0.85
    elif kind == "slab":
        rx, ry = rr.uniform(0.6, 1.0), rr.uniform(0.35, 0.55)
        F = Field(max(rx, ry) + 0.25)
        hgt = rr.uniform(0.35, 0.55)
        m = boulder(F, rr, 0, 0, rx, ry, hgt * 2.2, sink=0.55, facets=rr.integers(5, 8), wear=0.03, ang=rr.uniform(0, np.pi))
        tilt = (F.X * rr.uniform(-0.15, 0.15) + F.Y * rr.uniform(-0.1, 0.1))
        F.H = np.where(m, np.minimum(F.H, hgt + tilt), F.H)               # its flat bedding top, tilted
        cracks(F, rr, m, n=1, depth=0.08)
        lichen(F, rr, m, n=10, orange=0.35)
        moss_cap(F, rr, m, amount=0.35, thick=0.025)
        rp, top, radius = SANDST, hgt + 0.2, max(rx, ry) * 0.8
    elif kind == "stone":
        r = rr.uniform(0.22, 0.38)
        F = Field(r + 0.15)
        hgt = r * rr.uniform(0.8, 1.1)
        m = boulder(F, rr, 0, 0, r, r * rr.uniform(0.75, 1.0), hgt, sink=rr.uniform(0.35, 0.5), facets=3, wear=0.12, ang=rr.uniform(0, np.pi))
        lichen(F, rr, m, n=5)
        moss_cap(F, rr, m, amount=rr.uniform(0.3, 0.6), thick=0.02)
        rp, top, radius = GRANITE, hgt, r * 0.8
    else:                                                                   # cluster
        F = Field(0.75)
        ms = np.zeros(F.X.shape, bool)
        big = rr.uniform(0.25, 0.35)
        ms |= boulder(F, rr, 0, 0, big, big * 0.85, big, sink=0.4, facets=3, wear=0.12, ang=rr.uniform(0, np.pi))
        for k in range(rr.integers(3, 6)):
            a = rr.uniform(0, 2 * np.pi)
            d = rr.uniform(big + 0.05, big + 0.35)
            r = rr.uniform(0.07, 0.16)
            ms |= boulder(F, rr, np.cos(a) * d, np.sin(a) * d * 0.9, r, r * 0.8, r * 0.9, sink=0.45, facets=2, wear=0.15, ang=a)
        lichen(F, rr, ms, n=6)
        moss_cap(F, rr, ms, amount=0.5, thick=0.02)
        rp, top, radius = GRANITE, big + 0.1, big + 0.2
    img, mask, n, C = render(F, top + 0.1, rp, seed)
    meta = dict(kind="rock/" + kind, seed=int(seed), height=float(top), radius_yd=float(radius), sway=0.0)
    return img, mask, n, C, F, meta


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "rocks"
    for kind, seeds in [("erratic", [1, 2, 3]), ("slab", [4, 5]), ("stone", [6, 7, 8]), ("cluster", [9, 10])]:
        for s in seeds:
            img, mask, n, C, F, meta = make(kind, s)
            export("rock_%s_%d" % (kind, s), out, img, mask, n, C, F, meta)
            print("rock", kind, s)
