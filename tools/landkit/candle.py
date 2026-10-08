"""A candle standing on the ground (landkit), red wax, for the Blind Face's altar glade (Derek 2026-10-07: "a couple
sparingly on the ground outside of it"). True to scale a candle is a few pixels: a wax column two pixels wide, lit on
the side its own flame and the lantern reach, a teardrop flame of two or three pixels flickering, a little warm light
dithered round it, and the wax it has shed pooled at its foot. Hidden by whatever stands nearer.

  draw(img, to_px, dep, pos, height, T, seed)      pos (x, y, z) its foot; height in yards
"""
import numpy as np
from kit import ramp

R_WAX = ramp("#1c0507", "#36090d", "#560f14", "#78181c", "#9a2426", "#b83a36")
FLAME = (np.array([1.0, 0.93, 0.66]), np.array([1.0, 0.66, 0.24]), np.array([0.8, 0.3, 0.08]))
B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def draw(img, to_px, dep, pos, height, T=0.0, seed=1):
    GH, GW = img.shape[:2]
    x, y, z = pos
    fx, fy = to_px((x, y, z))
    ix, iy = int(round(fx)), int(round(fy))
    if not (0 <= iy < GH and 0 <= ix < GW) or x + y < dep[iy, ix] - 0.3:
        return img
    fl = 1 + 0.18 * np.sin(T * 6.283 * 3 + seed) + 0.08 * np.sin(T * 6.283 * 7 + seed * 2)
    hpx = max(2, int(round(height * 21)))
    # the warm light round it, dithered
    for dy in range(-hpx - 6, 4):
        for dx in range(-6, 7):
            jx, jy = ix + dx, iy + dy
            if 0 <= jy < GH and 0 <= jx < GW:
                g = max(0.0, 1 - np.hypot(dx / 1.4, (dy + hpx) / 1.0) / 6.5) ** 2 * fl
                if g > B4[jy % 4, jx % 4] * 0.8 + 0.05:
                    img[jy, jx] = np.clip(img[jy, jx] + np.array([0.3, 0.17, 0.07]) * g, 0, 1)
    # the wax it shed, pooled at its foot
    for dx in (-2, -1, 0, 1, 2):
        jx, jy = ix + dx, iy + (1 if abs(dx) == 2 else 0)
        if 0 <= jy < GH and 0 <= jx < GW:
            img[jy, jx] = R_WAX[2 if abs(dx) == 2 else 3]
    # the column: lit on its left (the flame above it, the lantern), shadowed right, a drip down its side
    for k in range(hpx):
        for dx, tone in ((0, 4), (1, 2)):
            jx, jy = ix + dx, iy - k
            if 0 <= jy < GH and 0 <= jx < GW:
                t_ = tone + (1 if k >= hpx - 1 else 0)
                img[jy, jx] = R_WAX[min(t_, len(R_WAX) - 1)]
    jx, jy = ix, iy - hpx + 2
    if 0 <= jy < GH and 0 <= jx < GW:
        img[jy, jx] = R_WAX[5]                                             # the drip catching the flame
    # the flame
    tip = iy - hpx
    for dy, dx, c in ((-1, 0, 0), (-2, 0, 1), (0, 0, 1), (-3, 0, 2)):
        if dy == -3 and fl < 1.05:
            continue
        jx, jy = ix + dx, tip + dy
        if 0 <= jy < GH and 0 <= jx < GW:
            img[jy, jx] = np.clip(FLAME[c] * min(fl, 1.1), 0, 1)
    return img
