"""What stands in the Sunken Bog besides its water and its Back (landkit), from chapter 8 sections 5 and 6 (Derek
2026-10-08: "a rotting stump with a mound of dirt around it ... a snag that's tipped over sideways in the water, vines
hanging off it ... occasionally hints of the tendrils wrapped around something with a pale, barely glowing flesh
pustule"). Each is rare, placed by its cause, and each is height in the world (FORM IS LAW), so it stands in the
black mirror.

- THE ROTTING STUMP on its root-mound: a carr tree died on the pedestal of its own roots; the stump stands on a mound
  of root, peat and dirt above the water, roots ridging out from it, its top snapped and its heart rotted into a hollow.
- THE TIPPED SNAG: shallow roots on saturated peat let go; the trunk lies along the water half sunk, tapering to its
  broken crown; at its foot the root plate stands torn up on its edge, dirt still held in it; behind the plate, the
  pit it tore out has filled with water. (Its limb snags and the vines that hang from it are drawn as strokes.)
- THE TENDRIL POST: an old mooring post of the bog folk, gone grey; the god's tendrils have wound up it, and in their
  grip a pustule of pale flesh barely glows (drawn: tendrils by landkit vessel.py, the pustule by pustule()).

  stamp(X, Y, H, items, level) -> (H, part)   items: [("stump", x, y, R, seed) | ("snag", x, y, ang, L, R, seed) |
      ("post", x, y, r, h, seed)]; part: 30 stump wood, 31 rotted heart, 32 mound, 33 log, 34 root plate, 35 post
  snag_strokes(items, level) -> [(a, b, kind)]   limbs and hanging vines, for the scene to draw and mirror
  pustule(img, zb, dep, to_px, c, r, T, moon)   a pale glowing pustule, a lit sphere with a faint bloom
"""
import numpy as np
from kit import vn, fbm
import vein_tree


def stamp(X, Y, H, items, level=0.0):
    H = H.copy()
    part = np.zeros(X.shape, int)

    def put(z, code, m):
        nonlocal H, part
        up = m & (z > H)
        H = np.where(up, z, H)
        part = np.where(up, code, part)

    for it in items:
        if it[0] == "stump":
            _, x, y, R, sd = it
            d = np.hypot(X - x, Y - y)
            th = np.arctan2(Y - y, X - x)
            near = d < R * 3.2
            if not near.any():
                continue
            # the mound: root, peat and dirt, its roots ridging out from the stump into the water
            roots = np.zeros(X.shape)
            rr = np.random.default_rng(sd)
            for a in rr.uniform(0, 2 * np.pi, int(rr.integers(4, 8))):
                da = np.abs(((th - a + np.pi) % (2 * np.pi)) - np.pi)
                roots = np.maximum(roots, np.clip(1 - da / 0.22, 0, 1) * np.clip(1 - d / (R * 3.0), 0, 1) * 0.18)
            mound = level + 0.5 * np.clip(1 - (d / (R * 2.4)) ** 2, 0, 1) + roots + (fbm(X * 1.3 + sd, Y * 1.3) - 0.5) * 0.12 - 0.08
            put(mound, 32, near)
            lob = (vn(th * 1.8 + sd, 3.0) - 0.5) * 0.3
            r = R * (1 + lob)
            top = level + 0.42 + R * rr.uniform(1.1, 2.2) + vein_tree.broken_top(X, Y, x, y, R, sd) * 0.6
            heart = d < r * 0.62
            put(np.where(heart, top - R * 0.9, top), 30, near & (d < r))
            part = np.where(near & heart & (part == 30), 31, part)
        elif it[0] == "snag":
            _, x, y, ang, L, R, sd = it
            ca, sa = np.cos(ang), np.sin(ang)
            u = (X - x) * ca + (Y - y) * sa
            v = -(X - x) * sa + (Y - y) * ca
            f = np.clip(u / L, 0, 1)
            rad = R * (1 - 0.55 * f) * (1 + (vn(u * 2.0 + sd, 1.0) - 0.5) * 0.12)
            zc = level - rad * 0.35 + (1 - f) * 0.2                       # half sunk, its foot riding higher
            on = (u > 0) & (u < L * (0.9 + 0.1 * vn(v * 9 + sd, 2.0))) & (np.abs(v) < rad)
            put(zc + np.sqrt(np.clip(rad ** 2 - v ** 2, 0, None)), 33, on)
            # the root plate torn up on its edge at the foot: a disc of root and dirt standing across the trunk
            Rp = R * 2.6
            w_ = v
            disc = (np.abs(u + 0.15) < 0.22) & (np.abs(w_) < Rp)
            ztop = level - Rp * 0.25 + np.sqrt(np.clip(Rp ** 2 - w_ ** 2, 0, None)) * (0.9 + (vn(w_ * 3 + sd, 4.0) - 0.5) * 0.25)
            put(ztop, 34, disc)
            # the pit it tore out, behind the plate, now full of water
            pit = ((u + 0.15 + Rp * 0.55) / (Rp * 0.5)) ** 2 + (w_ / (Rp * 0.85)) ** 2 < 1
            H = np.where(pit & (part == 0), np.minimum(H, level - 0.3), H)
        elif it[0] == "post":
            _, x, y, r, h, sd = it
            d = np.hypot(X - x, Y - y)
            top = level + h - (vn(X * 20 + sd, Y * 20) - 0.5) * 0.08
            put(top, 35, d < r * (1 + (vn(np.arctan2(Y - y, X - x) * 2 + sd, 1.0) - 0.5) * 0.25))
    return H, part


def snag_strokes(items, level=0.0):
    """the tipped snags' limb stubs pointing up, and the vines and creepers hanging off them into the water"""
    out = []
    for it in items:
        if it[0] != "snag":
            continue
        _, x, y, ang, L, R, sd = it
        rr = np.random.default_rng(sd + 3)
        ca, sa = np.cos(ang), np.sin(ang)
        for j in range(int(rr.integers(2, 5))):                          # limb stubs, broken, up out of the log
            f = rr.uniform(0.25, 0.85)
            rad = R * (1 - 0.55 * f)
            b0 = np.array([x + ca * L * f, y + sa * L * f, level + rad * 0.6])
            side = rr.choice([-1, 1])
            b1 = b0 + np.array([-sa * side * rr.uniform(0.2, 0.6), ca * side * rr.uniform(0.2, 0.6), rr.uniform(0.6, 1.6)])
            out.append((b0, b1, "limb"))
        for j in range(int(rr.integers(4, 9))):                          # vines hanging off it into the water
            f = rr.uniform(0.1, 0.9)
            rad = R * (1 - 0.55 * f)
            side = rr.choice([-1, 1])
            b0 = np.array([x + ca * L * f - sa * side * rad * 0.8, y + sa * L * f + ca * side * rad * 0.8, level + rad * 0.5])
            b1 = b0 + np.array([-sa * side * 0.15, ca * side * 0.15, -(rad * 0.5 + 0.1)])
            out.append((b0, b1, "vine"))
    return out


def pustule(img, zb, dep, to_px, c, r, T, moon, glow=(0.78, 0.8, 0.66)):
    """a pustule of the god's pale flesh in the tendrils' grip: a lit sphere, its skin taut and veined, a cold pale glow
    from within that breathes slowly; a faint bloom on what is near (never red light, MASTER_RULES 6)"""
    GH, GW = img.shape[:2]
    sx, sy = to_px(tuple(c))
    R = r * 18 * 1.41
    br = 0.75 + 0.25 * np.sin(2 * np.pi * T)
    x0, x1 = int(sx - R * 3), int(sx + R * 3) + 1
    y0, y1 = int(sy - R * 3), int(sy + R * 3) + 1
    x0, x1, y0, y1 = max(x0, 0), min(x1, GW), max(y0, 0), min(y1, GH)
    if x0 >= x1 or y0 >= y1:
        return img
    ys, xs = np.mgrid[y0:y1, x0:x1]
    dx, dy = (xs - sx) / R, (ys - sy) / R
    dd = dx * dx + dy * dy
    bloom = np.clip(1 - np.sqrt(dd) / 3.0, 0, 1) ** 2 * 0.22 * br
    img[ys, xs] = np.clip(img[ys, xs] + np.array(glow)[None, None] * bloom[..., None] * 0.35, 0, 1)
    on = dd < 1
    nz = np.sqrt(np.clip(1 - dd, 0, 1))
    lam = np.clip(-dx * moon[0] - dy * moon[1] * 0.5 + nz * moon[2], 0, 1)
    vein = (np.abs(np.sin(dx * 9 + dy * 4 + np.sin(dy * 7) * 2)) < 0.12) & (dd > 0.15)
    col = np.array([0.5, 0.48, 0.42])[None, None] * (0.35 + lam[..., None] * 0.5) + np.array(glow)[None, None] * (0.25 * br * nz[..., None])
    col = np.where(vein[..., None], col * 0.6, col)
    d0 = c[0] + c[1]
    for (iy, ix) in zip(*np.nonzero(on)):
        Y, Xp = ys[iy, ix], xs[iy, ix]
        if d0 >= dep[Y, Xp] - 0.4 and d0 >= zb[Y, Xp] - 0.05:
            img[Y, Xp] = np.clip(col[iy, ix], 0, 1)
            zb[Y, Xp] = d0
    return img
