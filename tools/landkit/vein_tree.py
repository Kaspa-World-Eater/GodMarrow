"""The vein-tree of the Hollow Wood (landkit), new for the Blind Face (Derek 2026-10-07: "you are reusing assets in this
scene, against the rules"). The lore: the Wood's trunks are "the god's veins stood up as pale trees"; the surveyor:
"I followed three trunks by their roots and their lean. Each ran downhill, and each joined another, and all of them
bent toward one place in the north of the Wood." FORM IS LAW: every ridge, flare and root is height in the world,
lit by the scene; the shared pale bark (wood_pale / bark.py) paints it, as a material shared in one place.

- THE TRUNK is not round: raised vein-ridges run up its whole height (5 to 8, each tree its own count and angles,
  some doubled where two veins run together), grooves between them;
- THE FOOT flares out along those ridges into buttresses, sweeping down concave into the ground;
- THE ROOTS: from the buttresses on its downhill (northern) side, cords run on, half buried, meandering, toward the
  north; each steers to meet the nearest root or foot of the next tree that way, so the trees braid into one another.

  stamp(X, Y, H, trees, north, seed) -> (H, tags)   trees: [(x, y, girth yd, height yd, seed)]; north: unit xy;
      only: the indices to stamp (the others are only targets for the roots);
      tags: an int array, 1 + tree index on its trunk and flare, -(1 + tree index) on its roots, 0 elsewhere
"""
import numpy as np
from kit import vn, fbm


def _ridges(rr):
    n = int(rr.integers(5, 9))
    ang = np.sort(rr.uniform(0, 2 * np.pi, n))
    wid = rr.uniform(0.16, 0.3, n)
    amp = rr.uniform(0.12, 0.26, n)
    return ang, wid, amp


def _lobe(theta, ridges):
    ang, wid, amp = ridges
    out = np.zeros(theta.shape)
    for a, w, m in zip(ang, wid, amp):
        d = ((theta - a + np.pi) % (2 * np.pi)) - np.pi
        out = out + m * np.exp(-(d / w) ** 2)
    return out


def stamp(X, Y, H, trees, north, seed=1, only=None):
    tags = np.zeros(X.shape, int)
    H = H.copy()
    north = np.asarray(north, float) / np.linalg.norm(north)
    feet = [(t[0], t[1]) for t in trees]
    for i, (tx, ty, R, hgt, sd) in enumerate(trees):
        if only is not None and i not in only:                             # the rest only as targets for its roots
            continue
        rr = np.random.default_rng(sd)
        ridges = _ridges(rr)
        near = (np.abs(X - tx) < R * 6) & (np.abs(Y - ty) < R * 6)
        if not near.any():
            continue
        Xn, Yn = X[near], Y[near]
        d = np.hypot(Xn - tx, Yn - ty)
        th = np.arctan2(Yn - ty, Xn - tx)
        lob = _lobe(th, ridges)
        r_t = R * (1 + lob - 0.06)                                          # the fluted bole: ridges proud, grooves between
        flare = R * (1.15 + lob * 6.0)                                      # the buttresses run out along the ridges
        g0 = H[near]
        z = np.where(d <= r_t, hgt, np.clip((flare - d) / np.maximum(flare - r_t, 1e-3), 0, 1) ** 2.4 * (0.4 + lob * 3.2))
        z = z + (vn(Xn * 3 + sd, Yn * 3) - 0.5) * 0.04 * (d > r_t)
        top = g0 + z
        m = (d < flare) & (top > H[near])
        Hn = H[near]
        Hn[m] = top[m]
        H[near] = Hn
        tg = tags[near]
        tg[m] = 1 + i
        tags[near] = tg
        # the roots: from the ridges facing north, on toward the next tree that way, half buried, meandering
        ang, wid, amp = ridges
        for a in ang:
            dirv = np.array([np.cos(a), np.sin(a)])
            if dirv @ north < 0.15:
                continue
            p = np.array([tx, ty]) + dirv * R * 2.4
            heading = dirv * 0.5 + north * 0.5
            tgt = None
            best = 9e9
            for j, (fx, fy) in enumerate(feet):
                if j == i:
                    continue
                v = np.array([fx, fy]) - p
                dist = np.linalg.norm(v)
                if v @ north > 0.5 * dist and dist < best and dist < 9.0:
                    best, tgt = dist, np.array([fx, fy])
            rad = R * rr.uniform(0.16, 0.24)
            L = (best if tgt is not None else rr.uniform(3.0, 5.5))
            steps = int(L / 0.12)
            for k in range(steps):
                f = k / max(steps - 1, 1)
                want = (tgt - p) / (np.linalg.norm(tgt - p) + 1e-6) if tgt is not None else north
                heading = heading * 0.9 + want * 0.1 + np.array([-heading[1], heading[0]]) * np.sin(k * 0.35 + sd) * 0.04
                heading = heading / np.linalg.norm(heading)
                p = p + heading * 0.12
                rk = rad * (1 - 0.55 * f)
                box = (np.abs(X - p[0]) < rk * 2) & (np.abs(Y - p[1]) < rk * 2)
                if not box.any():
                    continue
                dd = np.hypot(X[box] - p[0], Y[box] - p[1])
                lift = np.sqrt(np.clip(1 - (dd / rk) ** 2, 0, 1)) * rk * (0.75 - 0.35 * f)   # half buried, sinking as it goes
                hb = H[box]
                tb = tags[box]
                cand = hb + 0 * lift
                ground_here = hb - np.where(tb < 0, 0, 0)
                newz = ground_here + lift
                mm = (dd < rk) & (tb == 0)
                hb[mm] = np.maximum(hb[mm], newz[mm])
                tb[mm] = -(1 + i)
                H[box] = hb
                tags[box] = tb
    return H, tags
