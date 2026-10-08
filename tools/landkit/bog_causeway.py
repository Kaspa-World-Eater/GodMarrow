"""The bog folk's causeway (landkit): old boards laid across the Sunken Bog where the Long Back does not run (Derek
2026-10-08: "branches ... the long ribs and the bog folk's sunken board causeways"; the brief: "Branches leave it as the
long ribs and as the bog folk's sunken board causeways"). Built as such trackways really are (the bog's own prehistory:
plank roads laid on brushwood and pegged down): split planks laid ACROSS the way side by side, each its own length,
width, tilt and sag; stakes driven down beside it every few planks to hold it; brushwood between. Old: planks gone in
places (a gap to step over, the black water showing), some sunk at one end, some split; slimed where the water stands.
Narrower than the Back: a yard and a half, a single file. FORM IS LAW: every plank and stake is height in the world.

  stamp(X, Y, H, line, level, seed) -> (H, part)   part: 60 plank, 61 stake, 62 brushwood under the planks
"""
import numpy as np
from scipy.spatial import cKDTree
from kit import vn


def _h(k, salt, seed):
    x = np.sin((np.asarray(k, float) * 12.9898 + salt * 78.233 + seed * 3.17)) * 43758.5453
    return x - np.floor(x)


def stamp(X, Y, H, line, level=0.0, seed=3, half=0.8):
    line = np.asarray(line, float)
    seg = np.diff(line, axis=0)
    sl = np.hypot(seg[:, 0], seg[:, 1])
    s_at = np.concatenate([[0.0], np.cumsum(sl)])
    tree = cKDTree(line)
    d, i = tree.query(np.stack([X.ravel(), Y.ravel()], 1))
    i = np.clip(i, 0, len(line) - 2)
    t = seg[i] / sl[i, None]
    rel = np.stack([X.ravel(), Y.ravel()], 1) - line[i]
    s = (s_at[i] + (rel * t).sum(1)).reshape(X.shape)
    v = (-rel[:, 0] * t[:, 1] + rel[:, 1] * t[:, 0]).reshape(X.shape)
    d = d.reshape(X.shape)
    H = H.copy()
    part = np.zeros(X.shape, int)
    near = d < half + 0.6
    if not near.any():
        return H, part
    # the planks: across the way, each its own width (0.2 to 0.3 yd), its own reach either side, tilt and sag
    pw = 0.25
    k = np.floor(s / pw)
    u = s / pw - k
    reach_l = half * (0.8 + 0.35 * _h(k, 1, seed))
    reach_r = half * (0.8 + 0.35 * _h(k, 2, seed))
    on = near & (u > 0.08) & (((v >= 0) & (v < reach_l)) | ((v < 0) & (-v < reach_r)))
    gone = _h(k, 3, seed) < 0.08                                           # a plank lost: black water between
    split = (_h(k, 4, seed) < 0.18) & (np.abs(u - 0.5) < 0.06)             # split along its length
    sink = (_h(k, 5, seed) - 0.5) * 0.16 * v / half + (_h(k, 6, seed) - 0.5) * 0.06   # one end sunk, each its own level
    sag = -0.05 * (np.sin(s * 0.35 + seed) * 0.5 + 0.5)                    # the whole way sags between its stakes
    z = level + 0.1 + sink + sag + (vn(X * 14 + seed, Y * 14) - 0.5) * 0.012 - split * 0.04
    edge = np.clip(np.minimum(u - 0.08, 1 - u) / 0.12, 0, 1)               # rounded plank edges, worn
    z = z - (1 - edge) * 0.02
    mp = on & ~gone & (z > H)
    H = np.where(mp, z, H)
    part[mp] = 60
    # brushwood beneath: a low mat of sticks either side, under the planks' ends, sunk in the peat
    bw = near & ~mp & (d < half + 0.35) & (np.abs(np.sin((X + Y) * 23 + vn(X * 3, Y * 3) * 6)) < 0.35)
    bz = level + 0.03 + (vn(X * 9, Y * 9) - 0.5) * 0.04
    mb = bw & (bz > H)
    H = np.where(mb, bz, H)
    part[mb] = 62
    # stakes: driven beside the way every few planks, alternating sides, some leaning, some snapped short
    sk = np.floor(s / 1.6)
    side = np.where(sk % 2 == 0, 1.0, -1.0)
    su = s - (sk + 0.5) * 1.6
    sv = v - side * (half + 0.12)
    dd = np.hypot(su, sv)
    tall = np.where(_h(sk, 7, seed) < 0.3, 0.15, 0.45 + 0.4 * _h(sk, 8, seed))
    ms = near & (dd < 0.07) & (level + tall > H)
    H = np.where(ms, level + tall - dd * 0.6, H)
    part[ms] = 61
    return H, part


def rib_walk(X, Y, H, line, level=0.0, seed=5, half=0.62):
    """A RIB WALK (the brief: "branches leave it as the long ribs"): one of the serpent's great ribs fallen and lying
    along the bog, broad enough to walk, a yard and a quarter across: a single-file bridge of bone over the black water.
    Its section is the rib's own (a flattened oval, broad on top, the walked crown worn flat); along its length it
    curves (the rib's own bow), rises out of the water near its knobbed head where it left the Back and sinks toward its
    far end; cracked across, a chunk gone here and there; the grain running its length.
      returns (H, part): part 64 the rib's bone, 65 its broken ends' spongy bone"""
    line = np.asarray(line, float)
    seg = np.diff(line, axis=0)
    sl = np.hypot(seg[:, 0], seg[:, 1])
    s_at = np.concatenate([[0.0], np.cumsum(sl)])
    L = s_at[-1]
    tree = cKDTree(line)
    d, i = tree.query(np.stack([X.ravel(), Y.ravel()], 1))
    i = np.clip(i, 0, len(line) - 2)
    t = seg[i] / sl[i, None]
    rel = np.stack([X.ravel(), Y.ravel()], 1) - line[i]
    s = (s_at[i] + (rel * t).sum(1)).reshape(X.shape)
    v = (-rel[:, 0] * t[:, 1] + rel[:, 1] * t[:, 0]).reshape(X.shape)
    d = d.reshape(X.shape)
    H = H.copy()
    part = np.zeros(X.shape, int)
    f = np.clip(s / max(L, 1e-3), 0, 1)
    w = half * (1.0 + 0.45 * np.exp(-(s / 0.9) ** 2)) * (1 - 0.25 * f)    # the knobbed head, tapering away
    on = (d < w + 0.02) & (s > -0.3) & (s < L)
    q = np.clip(np.abs(v) / np.maximum(w, 0.05), 0, 1)
    sect = np.sqrt(np.clip(1 - q ** 2.6, 0, 1))                            # broad on top, rounding to its sides
    top = level + 0.42 * (1 - f) ** 0.8 + 0.06 - 0.12 * f                  # high by the Back, sinking to its tip
    crack = (_h(np.floor(s / 1.1), 1, seed) < 0.6) & (np.abs((s % 1.1) - 0.55 - v * 0.3) < 0.045)   # cracks across, slanted
    bite = (_h(np.floor(s / 2.2), 2, seed) < 0.25) & (np.hypot((s % 2.2) - 1.1, v - np.sign(_h(np.floor(s / 2.2), 3, seed) - 0.5) * w * 0.8) < 0.3)
    grain = np.abs(np.sin(v * 40 + vn(s * 0.8, v * 2) * 3)) < 0.08
    worn = (vn(s * 1.1 + seed, v * 3) - 0.5) * 0.06                       # the walked crown unevenly worn, dished
    z = top - (1 - sect) * 0.32 - crack * 0.08 - bite * 0.25 - grain * 0.015 + worn + (vn(X * 9 + seed, Y * 9) - 0.5) * 0.02
    m = on & (z > H)
    H = np.where(m, z, H)
    part[m] = 64
    part[m & (bite | ((L - s) < 0.25))] = 65
    return H, part
