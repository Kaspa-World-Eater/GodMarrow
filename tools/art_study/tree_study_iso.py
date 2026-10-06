"""The burning-tree study in Godmarrow's own camera (Derek: "change the POV to Godmarrow's camera style").

The game's view is a high three-quarter iso (a tile 16 x 8 px, 8 px of screen per tile of height). A side-view tree
cannot just be tilted into it, so here the trees are built in 3D and projected:
- each tree: a trunk with a lean, forking in 3D into limbs and branches (round in section, tapering), carrying its
  crown as leaf-clusters, each a round mass in space; from this angle the crowns' tops show and they hide the upper
  trunks;
- one z-buffer, so near things cover far ones properly;
- lit by a cold moon from the upper left and by the fires (each burning crown is a light), stepped and warm;
- the ground: painted grass in strokes, scorched to ash round the burning trees, coals glowing, the trees' firelit
  shadows lying across it;
- three trees: catching, engulfed, burnt bare (fire_study.py's fire standing on the burning crowns' tops).

  python tools/art_study/tree_study_iso.py OUT.webp
"""
import sys
import numpy as np
from PIL import Image
from fire_study import vn, fbm, hexc, FIRE, fire_field, paint_fire, B4

W, H = 420, 300
PX = 8.0                                     # px per tile across, and per tile of height
CX0, CY0 = 230.0, 168.0
YY, XX = np.mgrid[0:H, 0:W].astype(float)
BAY = B4[YY.astype(int) % 4, XX.astype(int) % 4]

BARK = np.array([hexc(c) for c in ("#050404", "#0e0907", "#1a110c", "#2a1b12", "#3e2818", "#5a3a20")])
LEAF = np.array([hexc(c) for c in ("#050605", "#0b0e09", "#12170e", "#1c2313", "#283017", "#38391a", "#4a4a20")])
GRASS = np.array([hexc(c) for c in ("#07090a", "#0e1310", "#161e14", "#222b18", "#33391e", "#4a4a26")])
ASH = np.array([hexc(c) for c in ("#0a0908", "#141210", "#201d1a", "#2e2a26", "#403a34")])


def to_screen(x, y, z):
    return (x - y) * PX + CX0, (x + y) * PX * 0.5 - z * PX + CY0


def depth_of(x, y, z):
    return x + y + z * 0.9                                             # nearer the camera = larger


class Tree:
    def __init__(self, x, y, ht, seed, state):
        self.x, self.y, self.ht, self.state = x, y, ht, state
        rr = np.random.default_rng(seed)
        self.rr = rr
        self.segs = []                                                  # 3D segments (p0, p1, r0, r1)
        self.clusters = []                                              # (centre, radius, mass id)
        lean = np.array([rr.normal(0, 0.15), rr.normal(0, 0.15)])
        top = np.array([x + lean[0], y + lean[1], ht * 0.42])
        self.segs.append((np.array([x, y, 0.0]), top, ht * 0.05, ht * 0.038))
        # the crown: a broad dome of space above the trunk, the leaf-clusters scattered through it, each joined to
        # the trunk by a branch that forks off a great limb (three limbs, one per mass)
        Rc, Hc = ht * 0.4, ht * 0.32
        cz = ht * 0.42 + Hc * 0.75
        limb_dirs = [k * 2.1 + rr.normal(0, 0.25) for k in range(3)]
        limb_ends = []
        for k, az in enumerate(limb_dirs):
            e = top + np.array([np.cos(az) * Rc * 0.45, np.sin(az) * Rc * 0.45, Hc * 0.55])
            self.segs.append((top, e, ht * 0.032, ht * 0.022))
            limb_ends.append(e)
        for i in range(64):
            a = rr.uniform(0, 2 * np.pi)
            rad = Rc * np.sqrt(rr.uniform(0.15, 1.0))
            zz = cz + rr.uniform(-0.55, 0.65) * Hc * (1 - (rad / Rc) ** 2 * 0.6)
            c = np.array([x + lean[0] + np.cos(a) * rad, y + lean[1] + np.sin(a) * rad, zz])
            mass = int(np.argmin([abs(((a - az + np.pi) % (2 * np.pi)) - np.pi) for az in limb_dirs]))
            le = limb_ends[mass]
            mid = (le + c) / 2 + np.array([0, 0, 0.3])
            self.segs.append((le, mid, ht * 0.016, ht * 0.012))
            self.segs.append((mid, c, ht * 0.012, ht * 0.007))
            self.clusters.append((c, ht * rr.uniform(0.055, 0.085), mass))

    def _limb(self, p, az, elev, L, r, depth, mass):
        d = np.array([np.cos(az) * np.cos(elev), np.sin(az) * np.cos(elev), np.sin(elev)])
        q = p + d * L
        self.segs.append((p, q, r, r * 0.7))
        if depth >= 3:
            self.clusters.append((q + np.array([0, 0, 0.15 * self.ht * 0.1]), self.ht * self.rr.uniform(0.11, 0.15), mass))
            return
        for k in range(2):
            self._limb(q, az + (k - 0.5) * self.rr.uniform(0.6, 1.0), max(0.25, elev - self.rr.uniform(0.0, 0.3)),
                       L * self.rr.uniform(0.62, 0.78), max(0.02, r * 0.66), depth + 1, mass)


def frame(t, trees):
    rgb = np.zeros((H, W, 3))
    zbuf = np.full((H, W), -1e9)
    kind = np.zeros((H, W), int)                                        # 0 sky, 1 ground, 2 bark, 3 leaf
    nx_ = np.zeros((H, W))
    ny_ = np.zeros((H, W))
    nz_ = np.ones((H, W))
    mass_of = np.full((H, W), -1)
    tree_of = np.full((H, W), -1)
    # ---- the ground: the plane z = 0 seen from the camera
    gy_ = (YY - CY0) / (PX * 0.5)
    gx_ = (XX - CX0) / PX
    wx = (gy_ + gx_) / 2
    wy = (gy_ - gx_) / 2
    ground = (wx > -6) & (wx < 22) & (wy > -6) & (wy < 22)
    zbuf[ground] = depth_of(wx, wy, 0)[ground]
    kind[ground] = 1
    # ---- the trees: segments as round tapered limbs, clusters as round masses, into the z-buffer
    for ti, tr in enumerate(trees):
        for (p0, p1, r0, r1) in tr.segs:
            n = int(max(4, np.linalg.norm(p1 - p0) * 6))
            for i in range(n + 1):
                f = i / n
                p = p0 + (p1 - p0) * f
                r = (r0 + (r1 - r0) * f) * PX
                sx, sy = to_screen(*p)
                x0, x1 = int(max(sx - r - 1, 0)), int(min(sx + r + 2, W))
                y0, y1 = int(max(sy - r - 1, 0)), int(min(sy + r + 2, H))
                if x1 <= x0 or y1 <= y0:
                    continue
                yy, xx = YY[y0:y1, x0:x1], XX[y0:y1, x0:x1]
                dx, dy = (xx - sx) / max(r, 0.6), (yy - sy) / max(r, 0.6)
                inside = dx * dx * 1.0 < 1.0
                inside &= np.abs(dy) < 1.0 + 0.5
                dep = depth_of(*p) + np.sqrt(np.clip(1 - dx * dx, 0, 1)) * r / PX
                upd = inside & (dep > zbuf[y0:y1, x0:x1]) & (np.abs(dx) <= 1)
                zbuf[y0:y1, x0:x1][upd] = dep[upd]
                kind[y0:y1, x0:x1][upd] = 2
                nx_[y0:y1, x0:x1][upd] = dx[upd]
                ny_[y0:y1, x0:x1][upd] = 0
                nz_[y0:y1, x0:x1][upd] = np.sqrt(np.clip(1 - dx[upd] ** 2, 0, 1))
                tree_of[y0:y1, x0:x1][upd] = ti
        if tr.state == 2:
            continue
        for ci, (c, rad, mi) in enumerate(tr.clusters):
            sx, sy = to_screen(*c)
            r = rad * PX
            x0, x1 = int(max(sx - r * 1.4, 0)), int(min(sx + r * 1.4, W))
            y0, y1 = int(max(sy - r * 1.4, 0)), int(min(sy + r * 1.4, H))
            if x1 <= x0 or y1 <= y0:
                continue
            yy, xx = YY[y0:y1, x0:x1], XX[y0:y1, x0:x1]
            lump = vn(xx * 0.3 + ci * 7, yy * 0.3 + ti * 5) * 0.55 + vn(xx * 0.8, yy * 0.8) * 0.3
            dx, dy = (xx - sx) / r, (yy - sy) / r
            dd = np.hypot(dx, dy)
            leafcut = vn(xx * 1.3 + ci * 3, yy * 1.3) * 0.35
            inside = dd < 0.72 + lump * 0.35 + leafcut
            nz = np.sqrt(np.clip(1 - np.minimum(dd, 1) ** 2, 0, 1))
            dep = depth_of(*c) + nz * rad
            upd = inside & (dep > zbuf[y0:y1, x0:x1])
            zbuf[y0:y1, x0:x1][upd] = dep[upd]
            kind[y0:y1, x0:x1][upd] = 3
            nx_[y0:y1, x0:x1][upd] = dx[upd]
            ny_[y0:y1, x0:x1][upd] = dy[upd]
            nz_[y0:y1, x0:x1][upd] = nz[upd]
            mass_of[y0:y1, x0:x1][upd] = mi
            tree_of[y0:y1, x0:x1][upd] = ti
    # ---- the fires: on the burning crowns' tops; their light
    heat = np.zeros((H, W))
    lights = []
    for ti, tr in enumerate(trees):
        if tr.state == 2:
            continue
        burning = [2] if tr.state == 0 else [0, 1, 2]
        for mi in burning:
            mm = (tree_of == ti) & (mass_of == mi) & (kind == 3)
            if mm.sum() < 20:
                continue
            ys, xs = np.nonzero(mm)
            cols = np.unique(xs)[::2]
            top = np.array([(c, ys[xs == c].min() + 3) for c in cols], float)
            if len(top) > 9:
                k_ = 9
                pad = np.pad(top[:, 1], k_ // 2, mode="edge")
                top[:, 1] = np.convolve(pad, np.ones(k_) / k_, mode="valid")[:len(top)]
            if len(top) > 2:
                heat = np.maximum(heat, fire_field(XX, YY, [tuple(q) for q in top], 34 + len(cols) * 0.8, t, seed=ti * 5 + mi) * (0.9 if tr.state == 0 else 1.0))
                if tr.state == 1:
                    gaps = vn(XX * 0.16 + mi * 5, YY * 0.16) * 0.6 + vn(XX * 0.45, YY * 0.45 - t * 0.8) * 0.4
                    heat = np.maximum(heat, np.where(mm, np.clip((gaps - 0.5) * 2.4, 0, 1) * 0.6, 0))
            cx_, cy_ = xs.mean(), ys.min()
            lights.append((cx_, cy_, 1.0 if tr.state == 1 else 0.6))
    # ---- shade
    L = np.array([-0.55, -0.55, 0.63])
    L /= np.linalg.norm(L)
    nrm = np.dstack([nx_, ny_, nz_])
    moon = np.clip((nrm * L).sum(2), 0, 1)
    warm = np.zeros((H, W))
    for (lx, ly, st) in lights:
        d = np.hypot((XX - lx) / 1.0, (YY - ly) * 1.3)
        toward = np.clip((nx_ * (lx - XX) + ny_ * (ly - YY)) / (d + 1e-3) * 0.7 + nz_ * 0.5, 0, 1)
        warm += st * toward / (1 + (d / 70.0) ** 2) * (1 + 0.15 * np.sin(t * 9 + lx))
    warm = np.clip(warm, 0, 1.4)
    wl = np.round(np.clip(warm, 0, 1) * 4) / 4
    # ground: grass strokes, scorched round the burning trees, coals, the trees' shadows thrown away from the fire
    gm = kind == 1
    gst = vn((wx + wy) * 2.2, (wx - wy) * 9.0)
    scorch = np.zeros((H, W))
    for tr in trees:
        if tr.state >= 1:
            scorch = np.maximum(scorch, np.clip(1 - np.hypot(wx - tr.x, wy - tr.y) / (3.2 + tr.state * 0.6) + (fbm(wx * 0.8, wy * 0.8) - 0.5) * 0.6, 0, 1))
    v = 0.12 + (gst - 0.5) * 0.18 + (fbm(wx * 0.4, wy * 0.4) - 0.5) * 0.15 + wl * 0.45 + (BAY - 0.5) * 0.03
    g_col = GRASS[np.clip((v * 6).astype(int), 0, 5)]
    a_col = ASH[np.clip((v * 5).astype(int), 0, 4)]
    gc = np.where((scorch > 0.35)[..., None], a_col, g_col)
    coal = gm & (scorch > 0.55) & (vn(wx * 3, wy * 3) > 0.62) & (vn(wx * 9, wy * 9) > 0.45)
    rgb[gm] = gc[gm]
    rgb[coal] = np.where((np.sin(t * 5 + wx[coal] * 7) > 0)[:, None], FIRE[3], FIRE[2])
    # shadows: each tree's silhouette thrown on the ground away from the brightest fire, and from the moon
    sil = (kind >= 2)
    shadow = np.zeros((H, W), bool)
    for (lx, ly, st) in lights[:1]:
        pass
    sh_m = np.roll(np.roll(sil, 10, axis=1), 6, axis=0) & gm
    rgb[sh_m & (BAY < 0.8)] *= 0.55
    # bark: lit on its side toward the fire, ridged; the burnt tree's limbs seamed with embers
    bm = kind == 2
    ridge = (np.sin(XX * 0.25 + YY * 1.1) > 0.5)
    bv = np.clip(1.2 + nx_ * -1.0 + moon * 1.5 + wl * 2.5 - ridge * 0.6, 0, 5.99)
    rgb[bm] = BARK[bv[bm].astype(int)]
    burnt_t = [ti for ti, tr in enumerate(trees) if tr.state == 2]
    emb = bm & np.isin(tree_of, burnt_t) & (vn(XX * 0.5, YY * 0.5 + t * 0.6) > 0.68)
    rgb[emb] = np.where((np.sin(t * 6 + XX[emb]) > 0)[:, None], FIRE[4], FIRE[3])
    # leaves: dark masses, lit on their tops by the moon and on the fire's side warm, dark beneath and inside
    lm = kind == 3
    lump = vn(XX * 0.3, YY * 0.3)
    lv = np.clip(0.12 + moon * 0.38 - ny_ * 0.14 + (lump - 0.5) * 0.3 + wl * 0.28, 0, 0.99)
    lc = LEAF[(lv * 7).astype(int)]
    lc = np.where((wl > 0.4)[..., None], lc * np.array([1.45, 1.1, 0.75]), lc)
    gapd = lm & (vn(XX * 0.9, YY * 0.9) > 0.8)                         # dark gaps between leaves
    lc[gapd] = LEAF[0]
    rgb[lm] = lc[lm]
    # outline where a crown or a limb meets what is behind it, heavier below
    rgb[kind == 0] = np.array(hexc("#0b0909"))
    rgb = paint_fire(rgb, heat, BAY)
    # smoke from the burnt tree, soft
    for tr in trees:
        if tr.state != 2:
            continue
        sx, sy = to_screen(tr.x, tr.y, tr.ht * 0.6)
        rise = np.clip(sy - YY, 0, None)
        cx = sx - rise * 0.5
        dens = np.clip(1 - np.abs(XX - cx) / (5 + rise * 0.3) + (fbm(XX * 0.03 + t * 0.2, YY * 0.025 + t * 0.5) - 0.5) * 1.2, 0, 1) * (rise > 0) * np.clip(1 - rise / 160, 0, 1)
        a_ = np.where(dens > 0.6, 0.4, np.where(dens > 0.3, 0.22, np.where(dens > 0.1, 0.08, 0)))
        rgb = rgb * (1 - a_[..., None]) + np.array(hexc("#2e2826")) * a_[..., None]
    return np.clip(rgb, 0, 1)


def main(out):
    trees = [Tree(1.0, 14.0, 11.0, 4, 0), Tree(9.0, 7.0, 12.0, 9, 1), Tree(16.5, 0.5, 11.0, 15, 2)]
    ims = [Image.fromarray((frame(i / 12.0, trees) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST) for i in range(30)]
    ims[0].save(out, save_all=True, append_images=ims[1:], duration=83, loop=0, quality=88)
    ims[5].save(out.replace(".webp", ".png"))
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tree_study_iso.webp")
