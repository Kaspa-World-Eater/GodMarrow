"""Flat stones of the Hollow Wood, with the pickers' white caps (landkit). The lore: "The holy days are the Flat Days ...
Nobody hunts. The pickers put white caps on every flat stone"; and "the white caps hold a little light, the way a coal
holds it under ash, and they mean the ground is sound."

THE STONE (chapter 4, chapter 2): a sandstone slab split on its bedding, sunk into the peat:
- its top a plane at its own tilt (never a dome), with a bevel at the arris;
- one to three planar chips at its edges and corners, paler where fresh;
- its sides showing the bedding as bands;
- lichen rosettes on the dry top, their size telling its age;
- moss at the wet foot, on the side away from the moon.
FORM IS LAW: all of it height in the world.

THE CAPS: laid by hand, so placed as hands place things (a ring, or a row), never scattered. Each a small pale dome
with a darker gill-rim, glowing a little, like a banked coal.

  stamp(X, Y, H, c, size, yaw, seed) -> (H, part, info)    part: 1 top, 2 side, 3 chip
  paint(img, m, v, n, px, py, pz, part, info, side, moon)
  caps(info, seed) -> [(x, y, z)]                          the caps' places on its top
  draw_caps(img, to_px, dep, caps, T)                     the caps and their little light
"""
import numpy as np
from kit import vn, ramp
from rock import SANDST, MOSS, LICHEN

CAP_TOP = np.array([0.86, 0.87, 0.8])
CAP_RIM = np.array([0.42, 0.43, 0.38])
CAP_GLOW = np.array([0.16, 0.16, 0.13])
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def stamp(X, Y, H, c, size=1.0, yaw=0.0, seed=1):
    rr = np.random.default_rng(seed)
    RES = float(X[0, 1] - X[0, 0])
    x0, y0 = float(X[0, 0]), float(Y[0, 0])
    ci, cj = int(round((c[1] - y0) / RES)), int(round((c[0] - x0) / RES))
    w = int(1.2 * size / RES) + 3
    sl = (slice(max(ci - w, 0), ci + w), slice(max(cj - w, 0), cj + w))
    Xs, Ys = X[sl], Y[sl]
    g0 = float(np.median(H[sl]))
    cu, su = np.cos(yaw), np.sin(yaw)
    u = (Xs - c[0]) * cu + (Ys - c[1]) * su
    v = -(Xs - c[0]) * su + (Ys - c[1]) * cu
    # the outline: a convex polygon of 5 to 7 sides, longer than wide (split on its bedding)
    k = int(rr.integers(5, 8))
    angs = np.sort(rr.uniform(0, 2 * np.pi, k))
    ra, rb = 0.55 * size * rr.uniform(0.85, 1.1), 0.36 * size * rr.uniform(0.85, 1.1)
    inside = np.ones(u.shape, bool)
    edge = np.full(u.shape, 9.0)
    for a in angs:
        nx, ny = np.cos(a), np.sin(a)
        dist = ra * rb / np.hypot(rb * nx, ra * ny) * rr.uniform(0.9, 1.0)
        s = u * nx / 1.0 + v * ny - dist
        inside &= s < 0
        edge = np.minimum(edge, -s)
    th = rr.uniform(0.07, 0.14) * size                                   # how far it stands out of the peat (old: sunk deep)
    tilt = rr.uniform(-0.12, 0.12, 2)                                    # 3 to 7 degrees, its own way
    top = g0 + th + tilt[0] * u + tilt[1] * v
    top = top - np.clip(1 - edge / 0.045, 0, 1) * 0.03                   # the bevel at the arris
    part = np.where(inside, 1, 0)
    chips = []
    for q in range(int(rr.integers(1, 4))):                              # chips: planar cuts at its edges, paler where fresh
        a = angs[int(rr.integers(0, k))] + rr.uniform(-0.3, 0.3)
        nx, ny = np.cos(a), np.sin(a)
        reach = (ra if abs(nx) > abs(ny) else rb) * rr.uniform(0.55, 0.75)
        cut = g0 + th * rr.uniform(0.2, 0.6) + ((u * nx + v * ny) - reach) * -rr.uniform(0.35, 0.8)
        hit = inside & (cut < top)
        top = np.where(hit, cut, top)
        part = np.where(hit, 3, part)
        chips.append((nx, ny, reach))
    Hs = H[sl].copy()
    m = inside & (top > Hs)
    Hs = np.where(m, top, Hs)
    H = H.copy()
    H[sl] = Hs
    P = np.zeros(H.shape, int)
    P[sl] = np.where(m, part, 0)
    info = dict(c=np.array(c, float), yaw=yaw, g0=g0, th=th, tilt=tilt, ra=ra, rb=rb, seed=seed, size=size)
    return H, P, info


def paint(img, m, v, n, px, py, pz, part, info, side, moon):
    if not m.any():
        return img
    rr_ = vn(px * 3 + info["seed"], py * 3)
    sv = np.clip(v * 0.85 + (rr_ - 0.5) * 0.06, 0, 0.99)
    col = SANDST[(sv * len(SANDST)).astype(int)]
    bed = (np.sin((pz - info["g0"]) * 90 + vn(px * 2, py * 2) * 2) > 0.55) & side       # bedding bands down its sides
    col = np.where(bed[..., None], col * 0.8, col)
    if part == 3:                                                                      # a chip: fresh stone, paler
        col = SANDST[np.clip(((sv + 0.12) * len(SANDST)).astype(int), 0, len(SANDST) - 1)]
    away = np.clip(-(n[..., 0] * moon[0] + n[..., 1] * moon[1]), 0, 1)
    mossy = side & (pz - info["g0"] < 0.05 + away * 0.06) & (vn(px * 12, py * 12) > 0.4)
    col = np.where(mossy[..., None], MOSS[np.clip((v * 0.7 * len(MOSS)).astype(int), 0, len(MOSS) - 1)], col)
    if part == 1:                                                                      # lichen rosettes on the dry top
        lic = (vn(px * 10 + 7, py * 10) > 0.74) & ~side
        ring = lic & (vn(px * 10 + 7, py * 10) < 0.78)                                 # the pale growing ring
        col = np.where(lic[..., None], LICHEN[np.clip((v * 0.9 * len(LICHEN)).astype(int), 0, len(LICHEN) - 1)] * 0.8, col)
        col = np.where(ring[..., None], LICHEN[-1] * np.clip(v * 1.2, 0.3, 1)[..., None], col)
    img[m] = col[m]
    return img


def caps(info, seed=1):
    """laid by hand: a ring on the bigger stones, a row on the smaller; evenly, the way hands set things down"""
    rr = np.random.default_rng(seed)
    c, yaw = info["c"], info["yaw"]
    cu, su = np.cos(yaw), np.sin(yaw)
    pts = []
    if info["size"] > 0.9:
        n = int(rr.integers(6, 9))
        for i in range(n):
            a = 2 * np.pi * i / n
            u, v = np.cos(a) * info["ra"] * 0.5, np.sin(a) * info["rb"] * 0.5
            pts.append((u, v))
    else:
        n = int(rr.integers(3, 6))
        for i in range(n):
            pts.append(((i - (n - 1) / 2) * info["ra"] * 0.32, 0.0))
    out = []
    for (u, v) in pts:
        x, y = c[0] + u * cu - v * su, c[1] + u * su + v * cu
        z = info["g0"] + info["th"] + info["tilt"][0] * u + info["tilt"][1] * v + 0.025
        out.append((x, y, z))
    return out


def draw_caps(img, to_px, dep, caps_, T=0.0):
    GH, GW = img.shape[:2]
    for k, (x, y, z) in enumerate(caps_):
        sx, sy = to_px((x, y, z))
        ix, iy = int(round(sx)), int(round(sy))
        if not (0 <= iy < GH and 0 <= ix < GW) or x + y < dep[iy, ix] - 0.25:
            continue
        br = 0.85 + 0.15 * np.sin(T * 6.283 + k * 1.3)                    # it breathes a little, a coal under ash
        # the little light, dithered round it
        for dy in range(-3, 4):
            for dx in range(-4, 5):
                jx, jy = ix + dx, iy + dy
                if 0 <= jy < GH and 0 <= jx < GW:
                    g = max(0.0, 1 - np.hypot(dx / 1.6, dy) / 3.6) ** 2 * br
                    if g > B4[jy % 4, jx % 4] * 0.7 + 0.05:
                        img[jy, jx] = np.clip(img[jy, jx] + CAP_GLOW * g * 1.4, 0, 1)
        # the cap: a pale dome two pixels wide, its gill-rim darker beneath
        for (dx, dy, c_) in ((0, -1, CAP_TOP), (1, -1, CAP_TOP * 0.9), (0, 0, CAP_RIM), (1, 0, CAP_RIM * 0.85)):
            jx, jy = ix + dx, iy + dy
            if 0 <= jy < GH and 0 <= jx < GW:
                img[jy, jx] = np.clip(c_ * br, 0, 1)
    return img
