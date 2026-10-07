"""Dead plant life (landkit). Derek 2026-10-07: "throw a little dead plant life into the scene".

Where a thing grew tells why: in a cavern, only where the moon came down (the shaft's footprint), and only in the
joints where fines and damp gathered. So the dead grows there, and nowhere else. Each piece is drawn as true thin
3D strokes (a blade, a twig) placed in the world, depth-tested against the scene, lit by the moon where the shaft
reaches it and by the warm lights.

  grass(img, zb, dep, to_px, root_xyz, n_blades, height, seed, light)   a dead tuft: straw blades, bent and broken
  thorn(img, zb, dep, to_px, root_xyz, height, seed, light)             a dried thorn bush: forking twigs, thorns
  vine(img, zb, dep, to_px, path_xyz, seed, light)                      a dead vine along a path: stem, curled leaves
  light(P) -> 0..1 brightness at a point (the caller's: the shaft, the lamps)
"""
import numpy as np

STRAW = np.array([0.62, 0.56, 0.4])
STRAW_D = np.array([0.36, 0.3, 0.2])
TWIG = np.array([0.32, 0.25, 0.2])
LEAF = np.array([0.4, 0.27, 0.15])


def _dot(img, zb, dep, to_px, P, col, tol=0.25):
    GH, GW = img.shape[:2]
    sx, sy = to_px(tuple(P))
    ix, iy = int(round(sx)), int(round(sy))
    if not (0 <= iy < GH and 0 <= ix < GW):
        return
    d = P[0] + P[1]
    if d < dep[iy, ix] - tol or d < zb[iy, ix] - 0.05:
        return
    img[iy, ix] = np.clip(col, 0, 1)
    zb[iy, ix] = max(zb[iy, ix], d)


def _stroke(img, zb, dep, to_px, a, b, c0, c1, light, n=None):
    a, b = np.array(a, float), np.array(b, float)
    n = n or max(2, int(np.linalg.norm(b - a) * 40))
    for k in range(n + 1):
        f = k / n
        P = a + (b - a) * f
        lv = light(P)
        _dot(img, zb, dep, to_px, P, (c0 * (1 - f) + c1 * f) * (0.28 + lv * 0.9))


def grass(img, zb, dep, to_px, root, n, height, seed, light, wind=(0.3, -0.1)):
    rr = np.random.default_rng(seed)
    root = np.array(root, float)
    for i in range(n):
        a = rr.uniform(0, 6.283)
        lean = rr.uniform(0.15, 0.6)
        L = height * rr.uniform(0.5, 1.0)
        base = root + np.array([np.cos(a), np.sin(a), 0]) * rr.uniform(0, 0.05)
        broken = rr.random() < 0.3
        pts = [base]
        for k in range(1, 6):
            f = k / 5
            if broken and f > 0.6:                                     # snapped, the top folded over and hanging
                pts.append(pts[-1] + np.array([np.cos(a) * 0.05 + wind[0] * 0.03, np.sin(a) * 0.05, -L * 0.12]))
                continue
            pts.append(base + np.array([np.cos(a) * lean * f * f * L + wind[0] * f * f * L * 0.4,
                                        np.sin(a) * lean * f * f * L + wind[1] * f * f * L * 0.4, L * f]))
        for k in range(len(pts) - 1):
            _stroke(img, zb, dep, to_px, pts[k], pts[k + 1], STRAW_D if k == 0 else STRAW * (0.85 + 0.1 * k / 5), STRAW, light, n=6)


def thorn(img, zb, dep, to_px, root, height, seed, light):
    rr = np.random.default_rng(seed)

    def branch(p, d, L, depth):
        q = p + d * L
        _stroke(img, zb, dep, to_px, p, q, TWIG * 0.8, TWIG, light)
        for k in range(int(L * 12)):                                        # thorns along it
            f = rr.uniform(0.1, 0.9)
            tp = p + d * L * f
            side = np.cross(d, [0, 0, 1.0]) * rr.choice([-1, 1])
            _stroke(img, zb, dep, to_px, tp, tp + side * 0.05 + d * 0.02, TWIG, TWIG * 1.2, light, n=2)
        if depth < 4:
            for _ in range(int(rr.integers(2, 4))):
                nd = d + rr.normal(0, 0.55, 3)
                nd[2] = abs(nd[2]) * 0.8 + 0.1
                nd /= np.linalg.norm(nd)
                branch(q, nd, L * rr.uniform(0.55, 0.75), depth + 1)

    for _ in range(int(rr.integers(3, 5))):
        d = np.array([rr.normal(0, 0.4), rr.normal(0, 0.4), 1.0])
        d /= np.linalg.norm(d)
        branch(np.array(root, float), d, height * 0.4, 0)


def vine(img, zb, dep, to_px, path, seed, light):
    rr = np.random.default_rng(seed)
    path = np.array(path, float)
    for k in range(len(path) - 1):
        _stroke(img, zb, dep, to_px, path[k], path[k + 1], TWIG, TWIG * 0.9, light, n=4)
        if rr.random() < 0.35:                                              # a dead leaf, curled, on a short stalk
            side = rr.normal(0, 1, 3)
            side[2] = -abs(side[2]) * 0.5
            side /= np.linalg.norm(side)
            lp = path[k] + side * 0.07
            _stroke(img, zb, dep, to_px, path[k], lp, TWIG, LEAF, light, n=3)
            for j in range(3):
                _dot(img, zb, dep, to_px, lp + rr.normal(0, 0.025, 3), LEAF * (0.7 + rr.random() * 0.5) * (0.28 + light(lp) * 0.9))
