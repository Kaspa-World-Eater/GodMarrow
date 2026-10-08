"""The old-growth floor (landkit ground generator), replacing the retired fixed leaf tiles (MASTER_RULES 2b.6: the ground
is a world-position generator, every yard its own). From the old-growth chapter: the floor is in layers, this year's
litter over the fermentation layer over the black greasy humus; the litter drifts against things and into the pits and
thins on the mounds, where the humus shows; moss maps the wet and the still; bare mineral soil on the fresh mounds.

Its depth comes from the ecology's own map (w.litter, the drifts and pits stamped by the engine as real height); this
paints the material only, quietly (the lesson of the Vigil's floor: broad patches, ramps near in hue, so the ground
rests the eye and the things on it read). The fallen leaves themselves are the engine's placed scatter, drawn over it.

  paint(img, m, v, px, py, litt, mat, lamp) -> img      litt: litter depth 0..1+; mat: 0 litter, 1 moss, 2 bare soil
"""
import numpy as np
from kit import vn, ramp

R_HUMUS = ramp("#0c0908", "#150f0c", "#1f1611", "#2a1e16", "#36271c", "#433022")    # black greasy humus, showing where thin
R_LITTER = ramp("#120c09", "#1d140e", "#2a1c12", "#382517", "#47301c", "#573a21", "#674528")   # the litter: deep, a warm brown
R_SOIL = ramp("#16120f", "#221b16", "#30261e", "#3e3127", "#4d3d31")                # bare mineral soil on the fresh mounds
R_MOSS = ramp("#0b100b", "#121a11", "#1a2516", "#23301b", "#2d3c20", "#384825")      # moss: deep olive at night


def paint(img, m, v, px, py, litt, mat, lamp=None):
    if not m.any():
        return img
    vv = np.clip(v, 0, 0.99)
    patch = vn(px * 1.6, py * 1.6) * 0.7 + vn(px * 5.0, py * 5.0) * 0.3              # broad patches: a quiet ground
    deep = np.clip((litt - 0.45) * 2.2 + (patch - 0.5) * 0.6, 0, 1)
    hum = R_HUMUS[np.clip((vv * len(R_HUMUS)).astype(int), 0, len(R_HUMUS) - 1)]
    lit_ = R_LITTER[np.clip(((vv * 0.95 + deep * 0.08) * len(R_LITTER)).astype(int), 0, len(R_LITTER) - 1)]
    col = np.where((deep > 0.35)[..., None], lit_, hum)
    soil = R_SOIL[np.clip((vv * len(R_SOIL)).astype(int), 0, len(R_SOIL) - 1)]
    col = np.where((mat == 2)[..., None], soil, col)
    cush = (vn(px * 9, py * 9) - 0.5) * 0.1                                          # moss cushions, a little relief in tone
    moss = R_MOSS[np.clip(((vv * 0.85 + cush) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)]
    col = np.where((mat == 1)[..., None], moss, col)
    if lamp is not None:                                                             # the lantern warms what it reaches
        warm = np.clip(lamp - 0.1, 0, 1.2)[..., None] * np.array([0.5, 0.24, 0.03])
        col = col * (1 + warm * 0.8)
    img[m] = np.clip(col[m], 0, 1)
    return img
