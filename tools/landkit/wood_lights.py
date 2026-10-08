"""The three lights on the ground of the Hollow Wood (landkit). The lore (a Wood voice): "Learn the three lights on the
ground, or leave the Wood. The white caps hold a little light, the way a coal holds it under ash, and they mean the
ground is sound. The blue ones grow over something hollow. Step round them. The red ones grow where the god is still
bleeding underneath. Eat none of them." (Another voice: "teal caps for the young, ghost-blue for the tall, amber where
something lies dead". The Wood's people disagree, as people do.)

So they are placed by cause, not scattered:
- WHITE on sound, dry ground: the hummocks, well away from the blood;
- BLUE over hollow ground: round the feet of the hollowed trees (the altar, the alcoves);
- RED where the god bleeds beneath: at the blood's margins.
Clusters of three to seven, each cap a small dome two pixels across with a darker gill-rim. The white and the blue
hold a little light and lay it on the ground round them; the red only smoulder in their own flesh (no red light:
MASTER_RULES 6).

  place(rng, sound, hollow, bleeding, ground) -> [(x, y, z, kind)]     the three are given as lists of (x, y) seeds
  draw(img, to_px, dep, caps, T)
"""
import numpy as np

COL = {"white": (np.array([0.9, 0.91, 0.84]), np.array([0.45, 0.46, 0.4]), np.array([0.22, 0.22, 0.17])),
       "blue": (np.array([0.55, 0.72, 0.95]), np.array([0.2, 0.27, 0.4]), np.array([0.08, 0.14, 0.26])),
       "red": (np.array([0.62, 0.14, 0.12]), np.array([0.26, 0.05, 0.05]), None)}
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def place(rng, seeds, ground):
    """seeds: [(x, y, kind)] where a cluster grows; each becomes three to seven caps close round it"""
    out = []
    for (x, y, kind) in seeds:
        n = int(rng.integers(5, 10))
        for k in range(n):
            a = rng.uniform(0, 2 * np.pi)
            r = abs(rng.normal(0, 0.14))
            cx, cy = x + np.cos(a) * r, y + np.sin(a) * r
            out.append((cx, cy, ground(cx, cy) + 0.02, kind, float(rng.uniform(0.7, 1.2))))
    return out


def draw(img, to_px, dep, caps, T=0.0):
    GH, GW = img.shape[:2]
    order = sorted(range(len(caps)), key=lambda i: caps[i][0] + caps[i][1])
    for i in order:
        x, y, z, kind, size = caps[i]
        sx, sy = to_px((x, y, z))
        ix, iy = int(round(sx)), int(round(sy))
        if not (0 <= iy < GH and 0 <= ix < GW) or x + y < dep[iy, ix] - 0.25:
            continue
        top, rim, glow = COL[kind]
        br = 0.85 + 0.15 * np.sin(T * 6.283 + i * 1.7)                     # it breathes a little
        if glow is not None:
            for dy in range(-3, 4):
                for dx in range(-5, 6):
                    jx, jy = ix + dx, iy + dy
                    if 0 <= jy < GH and 0 <= jx < GW:
                        g = max(0.0, 1 - np.hypot(dx / 1.6, dy) / 4.0) ** 2 * br
                        if g > B4[jy % 4, jx % 4] * 0.7 + 0.06:
                            img[jy, jx] = np.clip(img[jy, jx] + glow * g * 1.3, 0, 1)
        cells = ((0, -1, top), (1, -1, top * 0.85), (0, 0, rim)) if size < 0.9 else ((0, -1, top), (1, -1, top * 0.9), (0, 0, rim), (1, 0, rim * 0.85))
        for (dx, dy, c_) in cells:
            jx, jy = ix + dx, iy + dy
            if 0 <= jy < GH and 0 <= jx < GW:
                img[jy, jx] = np.clip(c_ * br, 0, 1)
    return img
