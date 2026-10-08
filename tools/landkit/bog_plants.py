"""The Sunken Bog's plants (landkit), drawn as true thin forms in the world, each its own, and each MIRRORED in the
black water (Derek 2026-10-08: "lots of plant life", the Famine's water: "blackish mirror like water that reflects").
From chapter 8 and the wetlands chapter: the water table decides everything (a few inches separate reed, sedge and
moss), so each plant is placed by the depth of the water where it roots, never scattered.

- REED (Phragmites): tall stems, 1.5 to 2.6 yd, in the shallows (0 to 0.45 yd of water) and along the Back's flanks;
  each stem with a few long blades leaving it, a feathered plume at the top, dead straw and late green mixed; they
  lean together with the one wind.
- SEDGE: arching tussocks of blades, 0.4 to 0.9 yd, on the hummocks, the marsh and the Back's cover.
- LILY PADS: flat discs with a notch, lying on still open water (0.3 to 1.2 yd deep) in sheltered water; a lit rim on
  the moon's side, now and then a pale flower.
- DUCKWEED: mats of tiny fronds drifted into the lee of things (against the Back, among the reeds), breaking the
  mirror.

  draw(img, zb, dep, to_px, plants, light, water_px, mirror_level)   plants from place(); water_px: the water mask
  place(rng, depth_at, part_at, box) -> list of plants
"""
import numpy as np

REED_G = np.array([0.28, 0.33, 0.16])        # late green
REED_S = np.array([0.5, 0.44, 0.3])          # dead straw
REED_R = np.array([0.14, 0.12, 0.08])        # the dark wet foot
PLUME = np.array([0.42, 0.34, 0.3])          # the feathered head, dusk-purple-brown
SEDGE = np.array([0.32, 0.33, 0.15])
SEDGE_D = np.array([0.42, 0.37, 0.22])
PAD = np.array([0.16, 0.22, 0.1])
PAD_RIM = np.array([0.3, 0.38, 0.18])
FLOWER = np.array([0.78, 0.76, 0.7])
WEED = np.array([0.15, 0.19, 0.08])          # duckweed at night: olive, not lawn-green
WIND = np.array([0.32, -0.12])


def _put(img, zb, dep, ix, iy, d, col, tol=0.3):
    GH, GW = img.shape[:2]
    if not (0 <= iy < GH and 0 <= ix < GW):
        return
    if d < dep[iy, ix] - tol or d < zb[iy, ix] - 0.05:
        return
    img[iy, ix] = np.clip(col, 0, 1)
    zb[iy, ix] = max(zb[iy, ix], d)


def _stroke(img, zb, dep, to_px, a, b, c0, c1, lv, water, level, n=None):
    """a thin stroke in the world, and its mirror image in the water below it (darker and cooler, on water only)"""
    a, b = np.asarray(a, float), np.asarray(b, float)
    GH, GW = img.shape[:2]
    n = n or max(2, int(np.linalg.norm(b - a) * 36))
    for k in range(n + 1):
        f = k / n
        P = a + (b - a) * f
        col = (c0 * (1 - f) + c1 * f) * lv
        sx, sy = to_px(tuple(P))
        _put(img, zb, dep, int(round(sx)), int(round(sy)), P[0] + P[1], col)
        if level is not None and P[2] > level:
            mx, my = to_px((P[0], P[1], 2 * level - P[2]))
            ix, iy = int(round(mx)), int(round(my))
            if 0 <= iy < GH and 0 <= ix < GW and water[iy, ix] and dep[iy, ix] >= P[0] + P[1] - 0.3:
                img[iy, ix] = np.clip(img[iy, ix] * 0.35 + col * np.array([0.5, 0.56, 0.66]), 0, 1)


def reed(img, zb, dep, to_px, root, h, seed, lv, water, level):
    rr = np.random.default_rng(seed)
    for i in range(int(rr.integers(3, 8))):
        b0 = np.array(root, float) + np.array([rr.normal(0, 0.12), rr.normal(0, 0.12), 0])
        L = h * rr.uniform(0.6, 1.0)
        dead = rr.random() < 0.55
        top_c = REED_S if dead else REED_G
        lean = WIND * rr.uniform(0.08, 0.2) + rr.normal(0, 0.04, 2)
        tip = b0 + np.array([lean[0] * L, lean[1] * L, L])
        mid = b0 + np.array([lean[0] * L * 0.35, lean[1] * L * 0.35, L * 0.55])
        _stroke(img, zb, dep, to_px, b0, mid, REED_R, top_c * 0.9, lv, water, level)
        _stroke(img, zb, dep, to_px, mid, tip, top_c * 0.9, top_c, lv, water, level)
        for j in range(int(rr.integers(1, 4))):                              # long blades leaving the stem
            f = rr.uniform(0.25, 0.7)
            s0 = b0 + (tip - b0) * f
            ang = rr.uniform(0, 2 * np.pi)
            bl = L * rr.uniform(0.18, 0.32)
            e = s0 + np.array([np.cos(ang) * bl * 0.8, np.sin(ang) * bl * 0.8, -bl * 0.25])
            _stroke(img, zb, dep, to_px, s0, e, top_c * 0.85, top_c * 0.7, lv, water, level)
        if rr.random() < 0.7:                                                # the plume
            for q in range(5):
                p0 = tip + np.array([rr.normal(0, 0.03), rr.normal(0, 0.03), -q * 0.05])
                p1 = p0 + np.array([WIND[0] * 0.18 + rr.normal(0, 0.03), WIND[1] * 0.18, -0.06])
                _stroke(img, zb, dep, to_px, p0, p1, PLUME, PLUME * 0.8, lv, water, level, n=4)


def sedge(img, zb, dep, to_px, root, h, seed, lv, water, level):
    rr = np.random.default_rng(seed)
    for i in range(int(rr.integers(9, 20))):
        a = rr.uniform(0, 2 * np.pi)
        L = h * rr.uniform(0.5, 1.0)
        out = rr.uniform(0.2, 0.55)
        b0 = np.array(root, float) + np.array([rr.normal(0, 0.05), rr.normal(0, 0.05), 0])
        c = SEDGE_D if rr.random() < 0.35 else SEDGE
        prev = b0
        for k in range(1, 5):                                                # an arching blade
            f = k / 4
            P = b0 + np.array([np.cos(a) * out * L * f + WIND[0] * f * 0.1 * L, np.sin(a) * out * L * f + WIND[1] * f * 0.1 * L,
                               L * (f - f * f * out * 0.9)])
            _stroke(img, zb, dep, to_px, prev, P, c * (0.55 + 0.45 * (k - 1) / 4), c * (0.55 + 0.45 * k / 4), lv, water, level, n=5)
            prev = P


def pad(img, to_px, c, r, seed, lv, water):
    """a lily pad lying on the water: a flat disc with its notch; lit rim on the moon's side; a flower now and then"""
    rr = np.random.default_rng(seed)
    GH, GW = img.shape[:2]
    notch = rr.uniform(0, 2 * np.pi)
    cx, cy = to_px((c[0], c[1], c[2]))
    rx, ry = r * 18 * 1.41, r * 9 * 1.41
    for iy in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for ix in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if not (0 <= iy < GH and 0 <= ix < GW) or not water[iy, ix]:
                continue
            u, v = (ix - cx) / max(rx, 0.5), (iy - cy) / max(ry, 0.5)
            d = u * u + v * v
            if d > 1:
                continue
            ang = np.arctan2(v, u)
            if abs(((ang - notch + np.pi) % (2 * np.pi)) - np.pi) < 0.28 and d > 0.05:
                continue
            col = PAD_RIM if (d > 0.6 and u < 0 and v < 0) else PAD * (0.85 + 0.3 * (1 - d))
            img[iy, ix] = np.clip(col * lv, 0, 1)
    if rr.random() < 0.12:
        fx, fy = int(round(cx + rx * 0.2)), int(round(cy - ry * 0.3))
        for (ox, oy) in ((0, 0), (1, 0), (0, -1), (-1, 0)):
            if 0 <= fy + oy < GH and 0 <= fx + ox < GW:
                img[fy + oy, fx + ox] = np.clip(FLOWER * (lv + 0.2), 0, 1)


def _bed(x, y):
    """where a reed bed has taken: a few beds, not a wall (MASTER_RULES 5: nothing small and leafy crowds the screen)"""
    from kit import vn
    return vn(x * 0.22 + 5.0, y * 0.22) * 0.7 + vn(x * 0.7, y * 0.7 + 2.0) * 0.3


def _colony(x, y):
    from kit import vn
    return vn(x * 0.35 + 17.0, y * 0.35) * 0.75 + vn(x * 1.1, y * 1.1 + 9.0) * 0.25


def place(rng, depth_at, part_at, cover_at, box, n_try=9000):
    """by the water table: reed in beds in the shallows, sedge on the hummocks and the Back's growth, pads on still
    open water, never on the walked crown"""
    (x0, y0, x1, y1) = box
    out = []
    for _ in range(n_try):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        d, p, cv = depth_at(x, y), part_at(x, y), cover_at(x, y)
        r = rng.random()
        if p == 0 and 0.05 < d < 0.4 and _bed(x, y) > 0.62 and r < 0.1:
            out.append(("reed", x, y, float(rng.uniform(1.5, 2.6))))
        elif p == 0 and d <= 0.0 and r < 0.18:
            out.append(("sedge", x, y, float(rng.uniform(0.4, 0.9))))
        elif p == 3 and cv > 0.6 and r < 0.012:
            out.append(("reed", x, y, float(rng.uniform(1.2, 2.0))))
        elif p == 2 and cv > 0.2 and r < 0.09:                            # sedge tufts in the Back's growth, off the walked middle
            out.append(("sedge", x, y, float(rng.uniform(0.35, 0.7))))
        elif p == 0 and 0.3 < d < 1.2 and _colony(x, y) > 0.6 and r < 0.12:      # pads grow in colonies
            out.append(("pad", x, y, float(rng.uniform(0.08, 0.32) * (0.7 + _colony(x, y) * 0.5))))
    return out
