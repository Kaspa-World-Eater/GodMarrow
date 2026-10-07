"""Blood on the ground (landkit): the game's own blood effect (shaders/blood_pool.gdshader, Derek 2026-10-06: "blood can
borrow from the liquid fire"), the same method for scenes and generators, so blood is one thing everywhere.

It seeps out in a lobed edge with fingers that run further than the rest; deeper in the middle; its surface slowly
churns; snapped to a short red ramp (near-black clot, dark red, the body, a lit red) through the 4x4 ordered dither;
a wet rim of light on the side toward the lantern and a few glints; as it ages it darkens and browns and its edge
cracks dry. No red light: blood is dark and lit only by what lights it.

  shade(depth, px, py, sx, sy, T, dry, light_side, light)   -> colour (..., 3) for pixels inside the blood
  edge(px, py, seed)                                         -> how far it seeps here (yards, lobes and fingers)
"""
import numpy as np
from kit import vn, fbm

B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
C0, C1, C2, C3 = np.array([0.09, 0.01, 0.02]), np.array([0.24, 0.02, 0.04]), np.array([0.42, 0.04, 0.06]), np.array([0.6, 0.08, 0.08])
DRIED = np.array([0.16, 0.06, 0.04])
WET = np.array([0.86, 0.36, 0.3])


def edge(px, py, seed=0, reach=0.6):
    lobe = 0.75 + 0.35 * fbm(px * 2.2 + seed, py * 2.2)
    finger = np.clip((fbm(px * 6 + seed * 2, py * 6) - 0.45) * 2, 0, None) ** 2 * 0.6
    return reach * (lobe + finger)


def shade(depth, px, py, sx, sy, T=0.0, dry=0.0, light_side=None, light=None):
    """depth 0 (edge) .. 1 (heart); sx, sy the art-pixel coordinates (for the dither); dry 0..1 (per pixel or one);
    light_side: 0..1 how much this pixel's edge faces the lantern; light: 0..1 how lit it is (the scene's light)"""
    d = B4[(sy.astype(int)) % 4, (sx.astype(int)) % 4]
    churn = fbm(px * 2.0 + T * 0.15, py * 2.0 - T * 0.1)
    v = depth * 0.7 + churn * 0.35
    dry = np.broadcast_to(np.asarray(dry, float), depth.shape)
    lv = v * 3.6 + d * 0.8 - dry * 1.4
    cc = np.where((lv > 2.6)[..., None], C3, np.where((lv > 1.7)[..., None], C2, np.where((lv > 0.8)[..., None], C1, C0)))
    cc = cc * (1 - dry[..., None] * 0.6) + DRIED * dry[..., None] * 0.6
    wet = 1 - dry
    if light_side is not None:
        rim = (depth < 0.12) & (light_side * wet > 0.45 + d * 0.3)
        cc = np.where(rim[..., None], WET, cc)
    glint = (fbm(px * 5 + T * 0.4, py * 5) > 0.78) & (wet > 0.5) & (depth > 0.3)
    cc = np.where(glint[..., None], WET, cc)
    crack = (dry > 0.5) & (depth < 0.1) & (d < dry - 0.4)                  # a dried edge cracks
    cc = np.where(crack[..., None], cc * 0.55, cc)
    if light is not None:
        cc = cc * (0.35 + np.clip(light, 0, 1.2)[..., None] * 0.75)        # lit only by what lights it
    return cc
