"""A burning broadleaf tree, studied on its own (the masterwork rule). Three states side by side: catching (the fire
taking one side of the crown), engulfed (the crown a mass of fire, the limbs black inside it), burnt bare (a black
skeleton, embers glowing along its limbs, smoke still rising).

A tree, designed, not a cone or a blob:
- the trunk flares at its foot into roots, leans a little, forks low into two or three great limbs that fork again
  into branches and twigs; each limb tapers, the forks narrower than what they come from; the bark lit on the side
  toward the fire, ridged;
- the crown is a few large masses (one per great limb), each built of lumpy clusters at the branch ends; the sky shows
  through the gaps between masses and branches cross the gaps; the masses are darker underneath and inside, lit on
  their upper edges and the side toward the light;
- the fire (fire_study.py's) stands on the burning masses' upper edges, so it rises out of the leaves; leaves near it
  curl to embers; the burnt masses are gone, leaving black branches with ember seams.

  python tools/art_study/tree_study.py OUT.webp
"""
import sys
import numpy as np
from PIL import Image
from fire_study import vn, fbm, hexc, FIRE, fire_field, paint_fire, glow, B4

BARK = np.array([hexc(c) for c in ("#050404", "#0e0907", "#1a110c", "#2a1b12", "#3e2818", "#5a3a20")])
LEAF = np.array([hexc(c) for c in ("#050605", "#0b0e09", "#12170e", "#1c2313", "#283017", "#38391a")])


class Tree:
    def __init__(self, x, y, ht, seed):
        self.x, self.y, self.ht, self.seed = x, y, ht, seed
        rr = np.random.default_rng(seed)
        self.segs = []                                                # (x0, y0, x1, y1, w0, w1, depth)
        self.ends = []
        lean = rr.normal(0, 0.08)
        trunk_top = (x + np.sin(lean) * ht * 0.32, y - ht * 0.34)
        self.segs.append((x, y, trunk_top[0], trunk_top[1], ht * 0.075, ht * 0.06, 0))
        self.masses = []
        n_limbs = 3
        for k in range(n_limbs):
            a = -np.pi / 2 + (k - (n_limbs - 1) / 2) * 0.62 + rr.normal(0, 0.1)
            self._limb(rr, trunk_top, a, ht * rr.uniform(0.3, 0.38), ht * 0.05, 1, k)
        # roots flaring at the foot
        for k in range(4):
            a = np.pi * (0.15 + k * 0.23)
            self.segs.append((x, y - 2, x + np.cos(a) * ht * 0.09, y + 2 + np.sin(a) * 2, ht * 0.04, 1.0, 0))

    def _limb(self, rr, p, a, L, w, depth, mass):
        q = (p[0] + np.cos(a) * L, p[1] + np.sin(a) * L)
        self.segs.append((p[0], p[1], q[0], q[1], w, w * 0.7, depth))
        if depth >= 4:
            self.ends.append((q[0], q[1], mass))
            return
        for k in range(2):
            self._limb(rr, q, a + (k - 0.5) * rr.uniform(0.5, 0.9) + rr.normal(0, 0.12), L * rr.uniform(0.6, 0.78),
                       max(0.8, w * 0.66), depth + 1, mass)


def draw_segs(rgb, tree, xx, yy, lit_dir, burnt, t):
    for (x0, y0, x1, y1, w0, w1, depth) in tree.segs:
        d = np.array([x1 - x0, y1 - y0])
        L2 = (d * d).sum() + 1e-6
        tt = np.clip(((xx - x0) * d[0] + (yy - y0) * d[1]) / L2, 0, 1)
        dist = np.hypot(xx - x0 - tt * d[0], yy - y0 - tt * d[1])
        w = (w0 + (w1 - w0) * tt) / 2
        m = dist < w + 0.3
        side = ((xx - x0 - tt * d[0]) * lit_dir) / np.maximum(w, 0.5)       # -1..1 across, toward the light
        ridges = (np.sin((xx * 0.2 + yy * 1.1)) > 0.6) & (w > 2)
        lv = np.clip(1.5 + side * 1.6 - ridges * 0.8, 0, 5).astype(int)
        rgb[m] = BARK[lv[m]]
        if burnt:
            emb = m & (vn(xx * 0.5 + depth * 3, yy * 0.5 + t * 0.6) > 0.7) & (side > -0.3)
            rgb[emb] = np.where((np.sin(t * 6 + xx[emb]) > 0)[:, None], FIRE[4], FIRE[3])


def crown_masses(tree, xx, yy):
    """the crown: one large mass per great limb, built of lumpy clusters at its branch ends"""
    masses = []
    for mi in range(3):
        pts = [(x, y) for (x, y, m) in tree.ends if m == mi]
        mask = np.zeros_like(xx, bool)
        for (x, y) in pts:
            r = tree.ht * 0.13
            lump = vn(xx * 0.25 + x, yy * 0.25 + y) * 0.6 + vn(xx * 0.7, yy * 0.7) * 0.4
            mask |= np.hypot((xx - x) / r, (yy - y) / (r * 0.8)) < 0.7 + lump * 0.5
        masses.append(mask)
    return masses


def frame(t, W=500, H=260):
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    bay = B4[yy.astype(int) % 4, xx.astype(int) % 4]
    rgb = np.zeros((H, W, 3)) + np.array(hexc("#0b0909"))
    ground = yy > 236
    rgb[ground] = np.array(hexc("#151110"))
    heat_all = np.zeros((H, W))
    layers = []
    for k, (tx, state) in enumerate([(90, 0), (255, 1), (415, 2)]):
        tree = Tree(tx, 236, 150, 11 + k * 3)
        masses = crown_masses(tree, xx, yy)
        heat = np.zeros((H, W))
        burning = [False, False, False]
        if state == 0:
            burning = [False, False, True]
        elif state == 1:
            burning = [True, True, True]
        for mi, mm in enumerate(masses):
            if not burning[mi] or not mm.any():
                continue
            ys, xs = np.nonzero(mm)
            # the fire stands on the mass's upper edge
            cols = np.unique(xs)
            topline = [(c, ys[xs == c].min() + 4) for c in cols[::3]]
            if len(topline) > 2:
                heat = np.maximum(heat, fire_field(xx, yy, topline, 40 + (len(cols) * 0.5), t, seed=k * 3 + mi) * (0.9 if state == 0 else 1.0))
                if state == 1:                                          # engulfed: fire standing on rows all through the crown
                    for band in (0.35, 0.65):
                        row = []
                        for c in cols[::3]:
                            ycol = ys[xs == c]
                            row.append((c, ycol.min() + (ycol.max() - ycol.min()) * band))
                        heat = np.maximum(heat, fire_field(xx, yy, row, 30, t + band * 3, seed=k * 3 + mi + band * 10) * 0.85)
                # fire inside the mass: seams of heat between the clumps, the strongest near the top where it breaks out
                ridge = 1 - np.abs(vn(xx * 0.09 + t * 0.25 + mi, yy * 0.11 - t * 0.7) * 2 - 1)
                inner = np.clip((ridge - 0.6) * 2.6, 0, 1) * np.clip(1.1 - (yy - ys.min()) / 70.0, 0.3, 1)
                heat = np.maximum(heat, np.where(mm, inner * 0.8, 0))
        heat_all = np.maximum(heat_all, heat)
        layers.append((tree, masses, burning, state, heat))
    rgb = glow(rgb, heat_all, 0.6)
    for (tree, masses, burning, state, heat) in layers:
        draw_segs(rgb, tree, xx, yy, 1.0, state == 2, t)
        if state == 2:
            continue
        for mi, mm in enumerate(masses):
            if burning[mi] and state == 1:
                continue                                                # engulfed: the leaves are fire now
            lump = vn(xx * 0.3, yy * 0.3)
            ys_ = np.where(mm, yy, np.inf)
            topy = np.min(ys_, axis=0)
            depth_in = np.clip((yy - topy[None, :]) / 30.0, 0, 1)        # darker underneath and inside
            near_fire = np.clip(heat * 2, 0, 1)
            lv = np.clip(0.55 - depth_in * 0.45 + (lump - 0.5) * 0.35 + near_fire * 0.6, 0, 0.99)
            col = LEAF[(lv * 6).astype(int)]
            col = np.where((near_fire > 0.3)[..., None], col * np.array([2.4, 1.3, 0.6]), col)   # lit by the fire beside it
            curl = mm & (near_fire > 0.5) & (vn(xx * 0.6 + t, yy * 0.6) > 0.55)
            rgb[mm] = col[mm]
            rgb[curl] = FIRE[3]
    # smoke rising off the burnt tree
    sm = (np.abs(xx - 415 + (236 - yy) * 0.4) < 6 + (236 - yy) * 0.12) & (yy < 150) & (fbm(xx * 0.05 + t * 0.3, yy * 0.04 + t * 0.6) > 0.5)
    rgb[sm & (bay < 0.6)] = rgb[sm & (bay < 0.6)] * 0.5 + np.array(hexc("#2a2422")) * 0.5
    rgb = paint_fire(rgb, heat_all, bay)
    return np.clip(rgb, 0, 1)


def main(out):
    ims = [Image.fromarray((frame(i / 12.0) * 255).astype(np.uint8)).resize((500 * 3, 260 * 3), Image.NEAREST) for i in range(30)]
    ims[0].save(out, save_all=True, append_images=ims[1:], duration=83, loop=0, quality=88)
    ims[5].save(out.replace(".webp", ".png"))
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tree_study.webp")
