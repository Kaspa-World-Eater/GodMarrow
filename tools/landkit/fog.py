"""Ground fog (landkit weather; MASTER_RULES 6: "fog lies in the lows"). Night air over wet ground cools and its fog
settles where the ground is lowest: in the hollows of the carr, over the pools, never on the hummocks or up the
trunks. It drifts with the one wind, slowly, in see-through stepped layers (the effects method: a value field snapped
to two or three alphas, dithered only at its edges), and it is lit by what lights the air: the moon where the canopy
opens, warm near the lantern and the altar's candles.

  draw(img, px, py, pz, low, T, moon, warm, wind)
      low: 0..1 per pixel, how low and wet the ground is there; moon, warm: the scene's light there
"""
import numpy as np
from kit import fbm

B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def draw(img, px, py, pz, low, T, moon, warm, wind=(0.3, -0.3), thick=1.0):
    GH, GW = img.shape[:2]
    sy, sx = np.mgrid[0:GH, 0:GW]
    d = B4[sy % 4, sx % 4]
    a = 2 * np.pi * T
    # a loop: the field slides along the wind and comes back (two layers, out of step)
    f1 = fbm(px * 0.45 - np.cos(a) * 0.8 * wind[0] * 3, py * 0.45 - np.sin(a) * 0.8 * wind[1] * 3)
    f2 = fbm(px * 1.1 + np.sin(a) * 0.6, py * 1.1 - np.cos(a) * 0.6 + 4)
    dens = np.clip((f1 * 0.65 + f2 * 0.35 - 0.42) * 2.6, 0, 1) * np.clip(low, 0, 1) * thick
    alpha = np.where(dens > 0.6, 0.2, np.where(dens > 0.3, 0.11, np.where(dens > 0.12, 0.05, 0.0)))
    alpha = np.where((dens > 0.1) & (dens < 0.16) & (d > 0.5), 0.0, alpha)            # dithered only at its edges
    col = np.array([0.4, 0.44, 0.52]) * (0.3 + np.clip(moon, 0, 1)[..., None] * 0.6) + warm[..., None] * np.array([0.9, 0.55, 0.25])
    return img * (1 - alpha[..., None]) + np.clip(col, 0, 1) * alpha[..., None]
