"""Fen ground under old growth (landkit): the Blind Face's floor (Derek 2026-10-07: "for the tiles make them a little
fen like"). Where old wood goes wet it becomes carr: black peat, sedge tussocks standing as mounds, sphagnum and brown
mosses on the hummocks, leaves matted dark into the wet, and still black water in every hollow, lying level. A world-
position generator (MASTER_RULES 2b.6): every yard its own. FORM IS LAW: the hummocks and tussocks are height in the
world; the water is levelled at its own table; colour is only the material.

  height(X, Y, seed, keep)          -> (dH, water, level): the relief to add where keep, the water mask, its level
  paint(img, m, v, px, py, water, T) -> img           the material by place, under the scene's light v
"""
import numpy as np
from scipy import ndimage as nd
from kit import vn, fbm, ramp
import blood

R_PEAT = ramp("#0b0908", "#140f0c", "#1d1611", "#281e17", "#34271d", "#433226")
R_LEAF = ramp("#120c09", "#1f140e", "#2e1d13", "#3e2817", "#50341d", "#634024")     # matted wet leaves
R_SPHAG = ramp("#121209", "#1c1c10", "#272615", "#33311b", "#403c21", "#4f4828")    # moss on the hummocks: brown mosses, ochre, dulled by night
R_STRAW = ramp("#1c1812", "#2d271c", "#403727", "#564a33", "#6d5e41", "#857350")    # dead sedge
R_WATER = ramp("#05070a", "#0a0e13", "#10161c", "#182029", "#222c37")


def _tussocks(X, Y, seed, n_per=0.22):
    """sedge tussocks: domed mounds 0.25 to 0.4 yd across, standing 0.12 to 0.28 yd, spaced as plants space"""
    rr = np.random.default_rng(seed)
    x0, x1, y0, y1 = X.min(), X.max(), Y.min(), Y.max()
    n = int((x1 - x0) * (y1 - y0) * n_per)
    out = np.zeros(X.shape)
    tag = np.zeros(X.shape)
    RES = float(X[0, 1] - X[0, 0])
    for k in range(n):
        cx, cy = rr.uniform(x0, x1), rr.uniform(y0, y1)
        r = rr.uniform(0.13, 0.22)
        h = rr.uniform(0.12, 0.28)
        i0, j0 = int((cy - y0) / RES), int((cx - x0) / RES)
        w = int(r * 1.6 / RES) + 2
        sl = (slice(max(i0 - w, 0), i0 + w), slice(max(j0 - w, 0), j0 + w))
        d = np.hypot(X[sl] - cx, Y[sl] - cy)
        ang = np.arctan2(Y[sl] - cy, X[sl] - cx)
        rr_ = r * (1 + 0.18 * np.sin(ang * 5 + k))                       # tufted, never a perfect dome
        z = np.clip(1 - (d / rr_) ** 2, 0, 1) ** 0.6 * h
        out[sl] = np.maximum(out[sl], z)
        tag[sl] = np.where(z > 0.01, np.maximum(tag[sl], z / h), tag[sl])
    return out, tag


def height(X, Y, seed=5, keep=None):
    low = (fbm(X * 0.45 + seed, Y * 0.45) - 0.5) * 0.34                   # hummock and hollow, a yard or two across
    mid = (fbm(X * 1.4, Y * 1.4 + seed) - 0.5) * 0.08
    tus, ttag = _tussocks(X, Y, seed)
    wetness = np.clip((0.5 - fbm(X * 0.3 + 7, Y * 0.3)) * 3.0, 0, 1)      # where the carr is wettest, tussocks thrive
    dH = low + mid + tus * (0.3 + wetness * 0.7)
    if keep is not None:
        dH = np.where(keep, dH, 0.0)
    level = np.full(X.shape, -0.05)                                       # the water table under the glade
    water = (low + mid < -0.06) & (tus * (0.3 + wetness * 0.7) < 0.02)
    if keep is not None:
        water &= keep
    water = nd.binary_opening(water, iterations=2)
    return dH, water, level, ttag * (0.3 + wetness * 0.7)


def paint(img, m, v, px, py, water, tus, T=0.0, moon=None, depth=None, sx=None, sy=None, lamp=None, path=None):
    """m: the ground pixels; v: the scene's light there; water: the pool mask there; tus: tussock-ness there.
    depth (0 at a pool's edge .. 1 deep), sx, sy (art pixels): the pools are BLOOD (Derek: "I want the puddles here
    to be blood ... dark blood"), the game's blood effect (blood.py) laid to the lake test's rules (shaders/lake.gdshader):
    the pigment pooled dark at the wet edge then a lit lip, the light broken into dabs, clots drifting, a skin that
    wrinkles slowly, a duller, heavier gloss"""
    if not m.any():
        return img
    vv = np.clip(v, 0, 0.99)
    peat = R_PEAT[np.clip((vv * 0.9 * len(R_PEAT)).astype(int), 0, len(R_PEAT) - 1)]
    leaf = R_LEAF[np.clip((vv * len(R_LEAF)).astype(int), 0, len(R_LEAF) - 1)]
    sph = R_SPHAG[np.clip((vv * len(R_SPHAG)).astype(int), 0, len(R_SPHAG) - 1)]
    straw = R_STRAW[np.clip((vv * 1.05 * len(R_STRAW)).astype(int), 0, len(R_STRAW) - 1)]
    lv = vn(px * 7.0, py * 7.0) * 0.6 + vn(px * 19, py * 19) * 0.4        # leaves matted in patches, broken small
    sv = fbm(px * 2.2 + 3, py * 2.2)                                      # moss on the higher, drier places
    col = np.where((lv > 0.45)[..., None], leaf, peat)
    edge_n = (vn(px * 6 + 11, py * 6) - 0.5) * 0.12                         # ragged cushion edges, not blobs
    col = np.where(((sv + edge_n > 0.64) & (tus < 0.2))[..., None], sph, col)
    strand = np.abs(np.sin(px * 41 + py * 17 + vn(px * 3, py * 3) * 6)) > 0.35
    col = np.where(((tus > 0.25) & strand)[..., None], straw, col)
    col = np.where(((tus > 0.25) & ~strand)[..., None], straw * 0.55, col)
    if path is not None:                                                    # a way trodden for generations, overgrown now
        trod = R_PEAT[np.clip(((vv * 1.05 + 0.08) * len(R_PEAT)).astype(int), 0, len(R_PEAT) - 1)]
        grown = vn(px * 5 + 2, py * 5) > 0.35 + path * 0.45                 # moss creeping back in from its edges
        col = np.where(((path > 0.35) & ~grown)[..., None], trod, col)
    if depth is not None:
        lt = np.clip(v * 0.5, 0.04, 0.38)                                  # dark blood: lit only so far (Derek: "dark blood")
        side_ = np.clip((lamp if lamp is not None else v) * 1.5, 0, 1)
        wat = blood.shade(np.clip(depth, 0, 1) * 0.5, px, py, sx, sy, T, 0.0, light_side=side_ * 0.7, light=lt)
        wet_edge = depth < 0.12                                             # the pigment pooled dark at the wet edge
        wat = np.where(wet_edge[..., None], blood.C0 * 0.9, wat)
        clot = (fbm(px * 4.0 + T * 0.05, py * 4.0 - T * 0.03) > 0.68) & (depth > 0.25)    # clots drifting
        wat = np.where(clot[..., None], blood.C0 * 1.2 + np.array([0.02, 0.0, 0.0]), wat)
        skin = (np.abs(np.sin(px * 13 + py * 7 + fbm(px * 2, py * 2 + T * 0.02) * 9)) < 0.1) & (depth > 0.2)
        wat = np.where(skin[..., None], wat * 0.8, wat)                      # the skin, wrinkling slowly
        if moon is not None:                                                 # the moon in it: broken dabs, dull and heavy
            dab = (moon > 0.5) & (vn(px * 2.2 - T * 0.1, py * 2.2) > 0.68) & (vn(px * 11, py * 11) > 0.5) & ~clot
            wat = np.where(dab[..., None], np.array([0.42, 0.2, 0.2]) * np.clip(moon, 0, 1)[..., None] + blood.C1 * 0.5, wat)
    else:
        # the water: black, still, the sky in it dark, the moon's light laid on it in a broken streak
        wv = np.clip(0.25 + (vn(px * 0.8 + T * 0.05, py * 0.8) - 0.5) * 0.3, 0, 0.99)
        wat = R_WATER[(wv * len(R_WATER)).astype(int)]
        if moon is not None:
            glint = (moon > 0.55) & (vn(px * 2.2 - T * 0.3, py * 2.2) > 0.66) & (vn(px * 11, py * 11) > 0.45)   # a broken sheen
            wat = np.where(glint[..., None], np.array([0.42, 0.46, 0.55]) * np.clip(moon, 0, 1)[..., None], wat)
    col = np.where(water[..., None], wat, col)
    lip = ~water & nd.binary_dilation(water, iterations=1)               # the wet lip round it, stained
    col = np.where(lip[..., None], col * 0.5 + (blood.C1 * 0.4 if depth is not None else 0), col)
    img[m] = col[m]
    return img
