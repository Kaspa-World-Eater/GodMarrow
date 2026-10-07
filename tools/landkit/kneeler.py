"""The Broken Kneeler (landkit). THE LORE (docs/wiki/11-codex-voices.md): "Out on the Moor stands the Broken Kneeler,
the stone one. There are others, of flesh, on their knees in the crypt-mouths and on the road, praying, and they never
finish ... It is listening for how." The surveyor: the ground "falls away steeply past the Broken Kneeler into a
hollow"; the ring of teeth lies below it.

A colossal stone figure kneeling, five yards high as it kneels, facing the pit below it: robed, its knees sunk in the
ash, its shins and feet behind; its hands were raised and clasped at its chest, one arm broken at the elbow and gone;
its head broken off at the neck and lying in the ash before it, face up. Weathered: the carving softened, cracks, the
breaks paler and rougher than the worn stone, lichen on its moonward faces, ash drifted on every ledge.

  F, info = kneeler(seed)      F.H heights, F.M materials (STONE, BREAK, HEAD), local x toward what it faces
  paint_kneeler(img, m, v, n, lx, ly, lz, M, info, side)
"""
import numpy as np
from kit import Field, ramp, vn, fbm

STONE, BREAK, HEAD = 1, 2, 3
R_KSTONE = ramp("#131217", "#201e24", "#2e2b31", "#3f3b3f", "#524d4f", "#686161", "#7f7774", "#968c86")


def kneeler(seed=1, s=1.0):
    rr = np.random.default_rng(seed)
    F = Field(3.4 * s, res=0.03)
    X, Y = F.X / s, F.Y / s
    H = np.full(X.shape, -9.0)
    M = np.zeros(X.shape, int)

    def ell(xc, yc, zc, rx, ry, rz, mat=STONE, cut=None):
        nonlocal H, M
        q = 1 - ((X - xc) / rx) ** 2 - ((Y - yc) / ry) ** 2
        z = zc + rz * np.sqrt(np.clip(q, 0, None))
        if cut is not None:
            z = np.minimum(z, cut)
        m = (q > 0) & (z > H) & (z > 0.02)
        H = np.where(m, z, H)
        M = np.where(m, mat if cut is None else np.where(z >= cut - 1e-6, BREAK, mat), M)
    for sg in (-1, 1):
        ell(-0.6, sg * 0.5, 0.0, 1.05, 0.42, 0.42)                      # shins along the ground
        ell(-1.55, sg * 0.5, 0.0, 0.32, 0.3, 0.35)                     # the feet behind
        ell(0.45, sg * 0.5, 0.15, 0.6, 0.48, 0.55)                     # the knees, sunk in the ash
        ell(0.1, sg * 0.45, 0.9, 0.55, 0.46, 0.9)                      # the thighs rising to the hips
    ell(-0.1, 0.0, 1.6, 0.75, 0.95, 0.6)                               # the lap, the robe's fall over the knees
    ell(0.05, 0.0, 2.5, 0.62, 0.88, 1.15)                              # the torso, leaning toward the pit
    for sg in (-1, 1):
        ell(0.1, sg * 0.86, 3.55, 0.4, 0.36, 0.35)                     # the shoulders
    ell(0.3, 0.72, 2.85, 0.32, 0.3, 0.6)                               # the right upper arm, down
    ell(0.75, 0.25, 2.85, 0.32, 0.26, 0.35)                            # the right forearm, raised to the chest
    ell(0.95, 0.0, 3.0, 0.26, 0.24, 0.28)                              # the hand at the breast
    ell(0.3, -0.72, 2.85, 0.32, 0.3, 0.55, cut=3.2)                    # the left arm: broken at the elbow, gone
    ell(0.2, 0.0, 3.85, 0.28, 0.28, 0.4, cut=4.15)                     # the neck: broken off
    # the head, fallen in the ash before it, face up, a little turned
    hx, hy = 1.9, rr.uniform(0.5, 0.9)
    ell(hx, hy, 0.0, 0.5, 0.42, 0.5, HEAD)
    F.H = np.where(H > -1, H * s, H)
    F.M = M
    return F, dict(seed=seed, s=s, head=(hx * s, hy * s))


def paint_kneeler(img, m, v, n, lx, ly, lz, M, info, side):
    s = info["s"]
    z = lz / s
    st = m & (M == STONE)
    # robe folds: long soft grooves down the torso and the lap, the carving softened by weather
    foldk = 0.9 + 0.1 * np.sin(ly / s * 8 + vn(ly, z * 0.5) * 2)        # soft shaded folds, not cut slits
    folds = st & side & (z > 0.8) & (z < 3.4)
    sv = v * 0.95 + 0.05 + (vn(lx * 7, ly * 7 + z * 7) - 0.5) * 0.05
    img[st] = R_KSTONE[np.clip((sv[st] * len(R_KSTONE)).astype(int), 0, len(R_KSTONE) - 1)]
    img[folds] = img[folds] * foldk[folds][:, None]
    crack = st & (np.abs(np.sin(lx * 3 + z * 5 + vn(ly * 2, z) * 4)) < 0.035) & (vn(lx * 2 + 3, z) > 0.55)
    img[crack] = img[crack] * 0.5
    lit = np.clip(n[..., 0] * -0.62 + n[..., 1] * 0.22, 0, 1)
    lich = st & (lit > 0.2) & (vn(lx * 9 + 5, ly * 9 + z * 9) > 0.8)
    img[lich] = img[lich] * 0.6 + np.array([0.42, 0.45, 0.37]) * 0.4
    ash = st & ~side & (vn(lx * 5, ly * 5) > 0.35)                     # ash drifted on every ledge
    img[ash] = img[ash] * 0.4 + np.array([0.36, 0.34, 0.33]) * 0.6
    br = m & (M == BREAK)
    bv = v + 0.12 + (vn(lx * 25, ly * 25) - 0.5) * 0.14
    img[br] = R_KSTONE[np.clip((bv[br] * len(R_KSTONE)).astype(int), 0, len(R_KSTONE) - 1)]
    # the fallen head, face up: brow, the hollows of the eyes, the nose worn to a ridge, the mouth a line
    hd = m & (M == HEAD)
    hx, hy = info["head"]
    u, w = (lx - hx) / (0.5 * s), (ly - hy) / (0.42 * s)
    hv = v * 0.95 + 0.06
    img[hd] = R_KSTONE[np.clip((hv[hd] * len(R_KSTONE)).astype(int), 0, len(R_KSTONE) - 1)]
    eyes = hd & (np.hypot(u + 0.1, np.abs(w) - 0.32) < 0.15)
    img[eyes] = img[eyes] * 0.35
    nose = hd & (np.abs(w) < 0.07) & (u > -0.15) & (u < 0.25)
    img[nose] = np.minimum(img[nose] * 1.2, 1)
    mouth = hd & (np.abs(u - 0.45) < 0.05) & (np.abs(w) < 0.22)
    img[mouth] = img[mouth] * 0.45
    return img
