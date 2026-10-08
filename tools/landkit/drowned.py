"""What stands out of the Sunken Bog's water (landkit): the drowned trees and the drowned walls (Derek 2026-10-08:
"ruins and drowned trees will also stick out of the water"). The lore: the Drowned Village sank when the well brought
up water that "kept coming, to the sills and the lintels and the bell"; past it "the Fen gives up pretending to be
water and becomes the Sunken Bog". So the bog's ruins are that village's outskirts, its walls going under course by
course toward the village, and its trees are the carr the rising water killed.

FORM IS LAW: both are height in the world, lit by the engine, and so they stand in the black mirror.
- THE DROWNED TREE: a carr alder or willow killed by the water. Bleached grey, the bark long gone in plates, the wood
  checked by long fissures. Its foot is swollen where it stood in the wet, and it is snapped off at its own height
  (vein_tree.broken_top: the hinge, splinters, the rotted heart). A green-black slime band rises from the water line.
- THE DROWNED WALL: a stub of the village's outer wall, laid in courses (0.4 yd, blocks about 0.9 yd), broken down
  course by course to a ragged stepped top, with fallen blocks round its foot, half sunk.

  stamp(X, Y, H, trees, walls, level) -> (H, part, tid)   tid: which tree (-1 none), for the warp and the painter   trees: [(x, y, R, height, seed)]; walls: [(x, y, angle, length,
      height, seed)]; part: 10 a drowned tree, 11 a wall's stone, 12 a fallen block
"""
import numpy as np
from kit import vn, fbm
import vein_tree


def stamp(X, Y, H, trees, walls, level=0.0):
    H = H.copy()
    part = np.zeros(X.shape, int)
    tid = np.full(X.shape, -1)
    for i, (tx, ty, R, hgt, sd) in enumerate(trees):
        near = (np.abs(X - tx) < R * 3) & (np.abs(Y - ty) < R * 3)
        if not near.any():
            continue
        x, y = X[near], Y[near]
        d = np.hypot(x - tx, y - ty)
        th = np.arctan2(y - ty, x - tx)
        lob = (vn(th * 1.6 + sd, 2.0) - 0.5) * 0.3 + (vn(th * 6.0 + sd, 5.0) - 0.5) * 0.08     # never round
        fiss = np.clip(1 - np.abs(np.sin(th * (5 + sd % 4) + sd)) / 0.12, 0, 1) * 0.06           # long checks in the wood
        r = R * (1 + lob) - R * fiss
        top = level + hgt + vein_tree.broken_top(x, y, tx, ty, R, sd)
        foot = R * 1.7                                                       # swollen where it stood in the wet
        skirt = level + 0.55 * np.clip((foot - d) / (foot - r + 1e-6), 0, 1) ** 1.6 - 0.25
        z = np.where(d < r, top, np.where(d < foot, skirt, -9.0))
        hn = H[near]
        up = z > hn
        hn[up] = z[up]
        H[near] = hn
        pn = part[near]
        pn[up] = 10
        part[near] = pn
        tn = tid[near]
        tn[up] = i
        tid[near] = tn
    for (wx, wy, ang, ln, hgt, sd) in walls:
        rr = np.random.default_rng(sd)
        ca, sa = np.cos(ang), np.sin(ang)
        u = (X - wx) * ca + (Y - wy) * sa
        v = -(X - wx) * sa + (Y - wy) * ca
        thick = 0.45
        on = (np.abs(u) < ln / 2) & (np.abs(v) < thick)
        # broken down course by course: each block's top its own, stepping down toward the wall's broken ends
        course = 0.4
        blk = np.floor(u / 0.9 + 50)
        fall = np.clip(1 - np.abs(u) / (ln / 2), 0, 1) ** 0.6
        blk_h = hgt * fall * (0.55 + 0.45 * ((np.sin(blk * 12.9 + sd) * 4375.5) % 1.0))
        top = level + np.floor(blk_h / course) * course + 0.15
        top = top - (vn(u * 9 + sd, v * 9) - 0.5) * 0.06                     # worn edges
        z = np.where(on, top, -9.0)
        up = z > H
        H = np.where(up, z, H)
        part = np.where(up, 11, part)
        for b in range(int(rr.integers(4, 9))):                              # fallen blocks round its foot, half sunk
            bu, bv = rr.uniform(-ln / 2 - 0.6, ln / 2 + 0.6), rr.choice([-1, 1]) * rr.uniform(0.7, 1.8)
            bx, by = wx + bu * ca - bv * sa, wy + bu * sa + bv * ca
            ba = rr.uniform(0, np.pi)
            bu_ = (X - bx) * np.cos(ba) + (Y - by) * np.sin(ba)
            bv_ = -(X - bx) * np.sin(ba) + (Y - by) * np.cos(ba)
            bm = (np.abs(bu_) < 0.42) & (np.abs(bv_) < 0.22)
            bz = level + rr.uniform(-0.1, 0.25) + bu_ * rr.uniform(-0.15, 0.15)
            up = bm & (bz > H)
            H = np.where(up, bz, H)
            part = np.where(up, 12, part)
    return H, part, tid
