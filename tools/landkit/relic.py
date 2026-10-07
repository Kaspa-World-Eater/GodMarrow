"""Relics of the old road (landkit): things older than the Wood, left where they fell.

THE FALLEN BELL (resting mouth-down where it fell; see bell()). From the Hollow Wood's lore (the hunter): "If you hear a bell in the Wood, keep walking. Ours are all
grown shut." This one fell before the Wood could take it: an iron church bell, 1.2 yd across the mouth, dropped when
its bell-cote came down centuries ago. It lies on its side, half sunk in the floor it broke, its mouth a dark hollow;
iron rusted almost away, black-brown with flaking orange scabs and pits, a crack running up from the lip; an
inscription band round the shoulder, its raised letters worn smooth; its hanging loop broken to a stub; the rust
bled into the stone round it; the clapper lying apart where it rolled.

One painter for the game's sprite and the scenes (paint_bell, in the bell's own coordinates).

  F, info = bell(seed)       F.H heights (local), F.M materials
  paint_bell(img, m, v, n, lx, ly, lz, M, info)
"""
import numpy as np
from kit import Field, ramp, vn, fbm

IRON, MOUTH, CLAPPER, STAIN = 1, 2, 3, 4
RUST = ramp("#0e0a0b", "#18100f", "#221613", "#2d1c16", "#3a2419", "#4a2d1d", "#5c3822", "#704429")   # iron, near black-brown
SCAB = ramp("#3a1d10", "#512814", "#683418", "#80421d")


def bell(seed=1, mouth=1.2, height=1.15):
    """the bell resting mouth-down where it fell, half sunk in the floor it broke, tilted where one side of its lip
    bit deeper; its silhouette (crown, shoulder, waist, the flare to the lip) reads at any size"""
    rr = np.random.default_rng(seed)
    F = Field(1.4, res=0.02)
    X, Y = F.X, F.Y
    R = mouth / 2
    # the profile, lip (z 0) to crown (z height): a thick lip, the flare, a slim waist, the shoulder, the head
    zs = np.linspace(0, 1, 200)
    rs_ = R * (1.0 - 0.38 * (1 - (1 - zs) ** 3.2) - 0.04 * np.sin(zs * np.pi * 0.9))
    rs_ = np.where(zs > 0.86, rs_ * (1 - (zs - 0.86) / 0.14 * 0.55), rs_)       # the shoulder rounding into the head
    zz = zs * height
    sink = rr.uniform(0.1, 0.15)                                                  # sunk a hand into the broken floor: the lip shows
    tilt = (rr.uniform(0.08, 0.16), rr.uniform(0, 2 * np.pi))                    # one side of the lip bit deeper
    d = np.hypot(X, Y)
    # the bell's top surface over each ground point: the highest z where the profile still reaches that radius
    order = np.argsort(rs_)
    zt = np.interp(d, rs_[order], zz[order], left=height, right=-9.0)
    zt = np.where(d <= rs_.min(), height + np.sqrt(np.clip(rs_.min() ** 2 - d ** 2, 0, None)) * 0.35, zt)   # the crown's dome
    tl = (X * np.cos(tilt[1]) + Y * np.sin(tilt[1])) * tilt[0]
    top = zt - sink + tl
    m = (d < R * 1.04) & (top > 0.02)
    # the broken stub of its hanging loop on the crown
    stub = (np.abs(X) < 0.05) & (np.abs(Y) < 0.13)
    top = np.where(stub, np.maximum(top, height - sink + 0.12), top)
    m |= stub
    H = np.where(m, top, -9.0)
    M = np.where(m, IRON, 0)
    # the clapper, fallen out of it when it broke: a shaft and a ball, rolled away
    cx, cy = R + 0.5, rr.uniform(-0.3, 0.3)
    cl = np.hypot(X - cx, Y - cy) < 0.13
    H = np.where(cl, np.maximum(H, 0.06 + np.sqrt(np.clip(0.13 ** 2 - (X - cx) ** 2 - (Y - cy) ** 2, 0, None))), H)
    shaft = (np.abs(Y - cy - (X - cx) * 0.35) < 0.035) & (X > cx - 0.55) & (X < cx)
    H = np.where(shaft & (H < 0.05), 0.05, H)
    M = np.where(cl | shaft, CLAPPER, M)
    F.H, F.M = H, M
    return F, dict(seed=seed, mouth=mouth, height=height, sink=sink, crack_ang=rr.uniform(-1.0, 1.0),
                   stain_r=mouth * 0.95, R=R)


def paint_bell(img, m, v, n, lx, ly, lz, M, info, side):
    """the bell, in its own coordinates (lx, ly across the ground from its axis; lz up from the floor)"""
    zb = lz + info["sink"]                                                       # height up the bell from its lip
    t = np.clip(zb / info["height"], 0, 1)
    ang = np.arctan2(ly, lx)
    iron = m & ((M == 1) | (M == 3))
    pit = (vn(ang * 12, zb * 40) > 0.8) * -0.08
    scab_n = vn(ang * 4 + 3, zb * 9)
    iv = v * 0.95 + 0.04 + (vn(ang * 2, zb * 4) - 0.5) * 0.1 + pit
    img[iron] = RUST[np.clip((iv[iron] * len(RUST)).astype(int), 0, len(RUST) - 1)]
    scab = iron & (scab_n > 0.77) & (vn(ang * 1.5 + 9, zb * 3) > 0.45)    # the bloom: few, small, brown-orange
    img[scab] = SCAB[np.clip((v[scab] * 0.9 * len(SCAB)).astype(int), 0, len(SCAB) - 1)]
    under = iron & side & (scab_n > 0.63) & (scab_n <= 0.7)
    img[under] = img[under] * 0.65                                               # each scab's undercut
    # the inscription band round the shoulder: raised letters worn almost smooth
    band = iron & side & (np.abs(t - 0.74) < 0.035)
    img[band] = img[band] * 0.82
    letters = band & (np.sin(ang * 46) > 0.4) & (vn(ang * 20, 1) > 0.35)
    img[letters] = np.minimum(img[letters] * 1.4, 1)
    # the sound-bow: a raised ring just above the lip, lit on its upper edge
    bow = iron & side & (np.abs(t - 0.12) < 0.025)
    img[bow] = np.minimum(img[bow] * 1.25, 1)
    # the crack, from the lip up toward the waist
    crack = iron & side & (t < 0.6) & (np.abs(ang - info["crack_ang"] - np.sin(t * 9) * 0.05) < 0.05 * (1.4 - t))
    img[crack] = RUST[0]
    return img


def stain(img, ground_mask, lx, ly, info):
    """the rust bled into the stone round it: an orange-brown halo, darkest close, in two dithered steps"""
    r_ = np.hypot(lx / 1.3, ly / 0.9)
    k = np.clip(1 - r_ / info["stain_r"], 0, 1)
    k = k * (vn(lx * 6, ly * 6) * 0.6 + 0.6)
    st = ground_mask & (k > 0.25)
    img[st] = img[st] * (1 - k[st, None] * 0.45) + np.array([0.3, 0.14, 0.06]) * k[st, None] * 0.45
    return img
