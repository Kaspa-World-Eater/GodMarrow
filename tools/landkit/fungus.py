"""Giant fungi that stand like trees (landkit; Derek 2026-10-07: "a couple of large mushrooms as trees"). On the god's
putrid flesh the decay grows tall: a fruiting body five to seven yards high.

THE FORM: a pale swollen stalk rising from a bulb sunk in the flesh, fibrous, bruised where it is old; a torn ring (the
veil's remnant) hanging from it under the cap; the cap a broad dome, darker at its crown, its skin cracked into scales
and spotted with pale warts, its rim curling down; under it the gills, fine and dark, radiating; drips of slime from the
rim. Drawn per pixel, depth-tested against the world (a cap overhangs its stalk: a height field cannot hold it), lit by
the moon from the upper left and any warm light.

  draw(img, zb, dep_scene, to_px, base_xyz, height, cap_r, seed, moon, warm=None)
"""
import numpy as np
from kit import ramp, vn

R_STALK = ramp("#2a2622", "#433c35", "#615649", "#80735f", "#9c8e77", "#b3a68d", "#c8bca2")
R_CAP = ramp("#1a0f0e", "#2e1814", "#46241b", "#603224", "#7a432d", "#935838", "#a96d45")
R_GILL = ramp("#120c0b", "#21150f", "#33221a")
WART = np.array([0.78, 0.73, 0.62])


def _shade(nn, moon, warm_dir, warm_k):
    lm = max(0.0, float(nn @ moon))
    lw = max(0.0, float(nn @ warm_dir)) * warm_k if warm_dir is not None else 0.0
    return lm, lw


def draw(img, zb, dep_scene, to_px, base, height, cap_r, seed, moon, warm=None):
    """base: (x, y, z) of the stalk's foot; zb: a depth buffer the caller keeps (larger = nearer the viewer)"""
    GH, GW = img.shape[:2]
    rr = np.random.default_rng(seed)
    lean = np.array([rr.uniform(-0.25, 0.25), rr.uniform(-0.25, 0.25)])
    warm_dir, warm_k = (None, 0.0) if warm is None else warm
    bx, by, bz = base
    r0 = cap_r * 0.24
    # ---- the stalk: a column of discs, swollen at the bulb, narrowing, then flaring a little under the cap
    steps = 120
    ring_t = rr.uniform(0.68, 0.78)
    for i in range(steps):
        t = i / (steps - 1)
        z = bz + t * height
        cx, cy = bx + lean[0] * t * t, by + lean[1] * t * t
        r = r0 * (1.0 + 0.9 * np.exp(-(t / 0.12) ** 2) - 0.18 * t + 0.25 * max(0, t - 0.9) / 0.1)
        sx, sy = to_px((cx, cy, z))
        rx, ry = r * 18.0, r * 9.0
        for yy in range(int(sy - ry - 1), int(sy + ry + 2)):
            for xx in range(int(sx - rx - 1), int(sx + rx + 2)):
                if not (0 <= yy < GH and 0 <= xx < GW):
                    continue
                u, v_ = (xx + 0.5 - sx) / rx, (yy + 0.5 - sy) / ry
                if u * u + v_ * v_ > 1 or v_ < 0:                        # only the near half of each disc
                    continue
                d = cx + cy + v_ * r
                if d < dep_scene[yy, xx] - 0.25 or d <= zb[yy, xx]:
                    continue
                zb[yy, xx] = d
                nn = np.array([u * 0.7 - 0.0, -u * 0.7, 0.0]) + np.array([0.0, 0.0, 0.1])
                nn = np.array([u, v_ * 0.3, 0.2]) / np.linalg.norm([u, v_ * 0.3, 0.2])
                lm, lw = _shade(np.array([nn[0] * 0.707 + nn[1] * 0.707 * 0, -nn[0] * 0.707, nn[2]]), moon, warm_dir, warm_k)
                fib = (vn(u * 6 + seed, t * 40) - 0.5) * 0.08
                bruise = (vn(u * 3 + 7, t * 6) > 0.7) * -0.12 * (1 - t)
                val = 0.2 + lm * 0.6 + fib + bruise - (1 - abs(u)) * 0.0
                col = R_STALK[int(np.clip(val * len(R_STALK), 0, len(R_STALK) - 1))]
                if abs(t - ring_t) < 0.035 and v_ > 0.2:                 # the torn ring hanging from it
                    col = R_STALK[5] if (xx % 3) else R_STALK[3]
                if t < 0.08:                                             # the bulb sunk in the flesh: dark, wet
                    col = col * 0.6 + np.array([0.12, 0.05, 0.06]) * 0.4
                img[yy, xx] = np.clip(col * (1 + lw * np.array([1.0, 0.7, 0.4])), 0, 1)
    # ---- the cap: a dome over the top; the gills seen under its near rim
    top = np.array([bx + lean[0], by + lean[1], bz + height])
    sx0, sy0 = to_px(tuple(top))
    capH = cap_r * 0.55
    rx, ry = cap_r * 18.0 * 1.414 / 1.414, cap_r * 9.0 * 1.0
    for yy in range(int(sy0 - capH * 21 - ry - 2), int(sy0 + ry + 4)):
        for xx in range(int(sx0 - rx - 2), int(sx0 + rx + 3)):
            if not (0 <= yy < GH and 0 <= xx < GW):
                continue
            u = (xx + 0.5 - sx0) / rx
            if abs(u) > 1:
                continue
            # the ellipse of the rim at this column, and the dome's profile above it
            rim_dy = ry * np.sqrt(max(0.0, 1 - u * u))
            dome_top = capH * 21 * np.sqrt(max(0.0, 1 - u * u)) ** 0.8
            yl = yy + 0.5 - sy0
            curl = 3.0 * (1 - abs(u))                                    # the rim curling down
            if -dome_top - rim_dy * 0.2 <= yl <= rim_dy + curl:
                under = yl > rim_dy * 0.15 and yl > 0                     # the gills, seen under the near rim
                d = top[0] + top[1] + (yl / ry) * cap_r * 0.5 + 0.4
                if d < dep_scene[yy, xx] - 0.3 or d <= zb[yy, xx]:
                    continue
                zb[yy, xx] = d
                if under:
                    gill = (int((u + 1) * 40) % 2 == 0)
                    col = R_GILL[1 if gill else 0] * (1 + (1 - abs(u)) * 0.3)
                else:
                    hz = np.clip((-yl) / (dome_top + 1e-3), 0, 1)        # up the dome
                    nn = np.array([u * 0.8, -0.5 + hz * 0.2, 0.3 + hz * 0.7])
                    nn /= np.linalg.norm(nn)
                    lm = max(0.0, nn[0] * -0.62 + nn[2] * 0.75 + nn[1] * -0.2)
                    lw = 0.0
                    if warm_dir is not None:
                        lw = max(0.0, float(nn @ warm_dir)) * warm_k
                    scale = (vn(u * 9 + seed, hz * 6) > 0.62) * -0.1          # the skin cracked into scales
                    val = 0.18 + lm * 0.6 + hz * 0.05 + scale
                    col = R_CAP[int(np.clip(val * len(R_CAP), 0, len(R_CAP) - 1))]
                    if hz > 0.75:
                        col = col * 0.8                                  # darker at the crown
                    if vn(u * 14 + seed * 3, hz * 9) > 0.86:
                        col = WART * (0.55 + lm * 0.6)                   # pale warts
                    col = col * (1 + lw * np.array([1.0, 0.7, 0.4]))
                img[yy, xx] = np.clip(col, 0, 1)
    # slime drips from the rim
    for k in range(int(rr.integers(4, 9))):
        u = rr.uniform(-0.8, 0.8)
        xx = int(sx0 + u * rx)
        y0 = int(sy0 + ry * np.sqrt(1 - u * u) + 2)
        for j in range(int(rr.integers(2, 6))):
            if 0 <= y0 + j < GH and 0 <= xx < GW:
                img[y0 + j, xx] = np.array([0.45, 0.42, 0.3]) * (1 - j * 0.12)
    return img


R_SHAG = ramp("#2a2726", "#4a4642", "#6e6862", "#958d84", "#b8b0a5", "#d3ccbf", "#e6e0d4")   # the shaggy mane's white
R_INK = ramp("#050405", "#0e0b0d", "#1c1619")                                                   # its dissolving rim


def draw_shaggy(img, zb, dep_scene, to_px, base, height, seed, moon, warm=None, light_at=None):
    """a SHAGGY MANE (Coprinus comatus), giant: a slender white stalk; the cap a tall closed bell half the height,
    wrapped in shaggy, upturned white scales, each curling out with a dark shadow beneath; its crown smooth and brown;
    its rim turning black and dissolving into ink that drips and pools at its foot (it eats itself as it ages).
    Drawn as a stack of discs, near half only, depth-tested; light_at(ix, iy) -> the scene's light at a pixel"""
    GH, GW = img.shape[:2]
    rr = np.random.default_rng(seed)
    bx, by, bz = base
    lean = np.array([rr.uniform(-0.3, 0.3), rr.uniform(-0.3, 0.3)])
    cap0 = height * rr.uniform(0.42, 0.5)
    capR = height * rr.uniform(0.13, 0.16)
    ink = rr.uniform(0.12, 0.28)
    stalkR = capR * 0.32
    steps = 220
    for i in range(steps):
        t = i / (steps - 1)
        z = t * height
        f = t ** 1.5
        cx, cy = bx + lean[0] * f, by + lean[1] * f
        if z < cap0:
            r = stalkR * (1.25 - 0.25 * z / cap0 + 0.6 * np.exp(-(z / (height * 0.04)) ** 2))
            part = "stalk"
        else:
            k = (z - cap0) / (height - cap0)
            r = capR * np.sqrt(max(0.0, 1 - k ** 2.4)) * (1.0 + 0.08 * (1 - k))
            part = "cap"
        if r < 0.02:
            continue
        sx, sy = to_px((cx, cy, bz + z))
        rx, ry = r * 18.0, r * 9.0
        for yy in range(int(sy - 1), int(sy + ry + 2)):
            for xx in range(int(sx - rx - 1), int(sx + rx + 2)):
                if not (0 <= yy < GH and 0 <= xx < GW):
                    continue
                u, v_ = (xx + 0.5 - sx) / rx, (yy + 0.5 - sy) / ry
                if u * u + v_ * v_ > 1 or v_ < 0:
                    continue
                d = cx + cy + v_ * r
                if d < dep_scene[yy, xx] - 0.25 or d <= zb[yy, xx]:
                    continue
                zb[yy, xx] = d
                lm = max(0.0, -u * 0.75 + 0.35)
                if part == "stalk":
                    val = 0.25 + lm * 0.6 + (vn(u * 4 + seed, z * 3) - 0.5) * 0.05
                    col = R_SHAG[int(np.clip(val * len(R_SHAG), 0, len(R_SHAG) - 1))]
                    if z < height * 0.05:
                        col = col * 0.55 + np.array([0.12, 0.05, 0.06]) * 0.45
                else:
                    k = (z - cap0) / (height - cap0)
                    ang = np.arcsin(np.clip(u, -1, 1))
                    row = (z / (height * 0.035) + vn(ang * 3 + seed, z * 0.3) * 0.8)
                    fr = row - np.floor(row)
                    sc = np.floor(ang * 9 + np.floor(row) * 0.5)
                    lift_ = ((sc * 7.3 + np.floor(row) * 3.1) % 1.0)
                    val = 0.3 + lm * 0.58
                    if fr < 0.28:
                        val -= 0.22 + lift_ * 0.1
                    elif fr > 0.8 and lift_ > 0.4:
                        val += 0.1
                    col = R_SHAG[int(np.clip(val * len(R_SHAG), 0, len(R_SHAG) - 1))]
                    if k > 0.86:
                        col = np.array([0.42, 0.3, 0.2]) * (0.55 + lm * 0.6)
                    if k < ink:
                        col = R_INK[int(np.clip((lm * 0.6) * 3, 0, 2))]
                    elif k < ink + 0.06:
                        col = col * 0.5 + np.array([0.05, 0.04, 0.05]) * 0.5
                if light_at is not None:
                    col = col * light_at(xx, yy)
                img[yy, xx] = np.clip(col, 0, 1)
    sx0, sy0 = to_px((bx, by, bz + cap0))
    for q in range(int(rr.integers(6, 12))):
        u = rr.uniform(-0.9, 0.9)
        xx = int(sx0 + u * capR * 18)
        y0 = int(sy0 + capR * 9 * np.sqrt(max(0, 1 - u * u)))
        for j in range(int(rr.integers(3, 14))):
            if 0 <= y0 + j < GH and 0 <= xx < GW:
                img[y0 + j, xx] = R_INK[1]
    fx, fy = to_px((bx, by, bz))
    for yy in range(int(fy - 3), int(fy + 5)):
        for xx in range(int(fx - 22), int(fx + 23)):
            if 0 <= yy < GH and 0 <= xx < GW and ((xx - fx) / 22) ** 2 + ((yy - fy - 1) / 4) ** 2 < 1 and zb[yy, xx] < -1e8:
                img[yy, xx] = img[yy, xx] * 0.25
    return img
