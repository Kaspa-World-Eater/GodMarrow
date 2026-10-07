"""Tree study, exercise 2: the crown in leaf (Derek 2026-10-06: "first master the design of a single tree, the painting
and texture. The foliage."). STUDY.md round 11.

The skeleton is exercise 1's tree (tree_anatomy.Tree), at true scale. The foliage grows where the twigs end:
- the twig ends are gathered into CLUMPS (one per 0.8 yd of crown), each a rough ball of leaves on its twigs;
- the clumps belong to MASSES, one per great limb, and the light is laid on the mass as one form first, the clump
  second: the painter's rule that a crown is three to seven big lit shapes, not a bunch of grapes;
- the silhouette of every clump is broken by leaf-shaped notches; sky holes are left where clumps do not meet, and the
  limbs show through them;
- values in four groups (lit, half, shade, core); leaf texture (small leaves, each lit on its upper left and dark on
  its lower right, with dark gaps between) only on the lit and half planes, the shade kept flat;
- the crown shades itself (upper clumps over lower) and throws a dappled shadow on the trunk and the ground, with
  flecks of light coming through.

Shown as: 1 masses (each mass one flat tone), 2 values (the four groups), 3 painted; and the game's own view.

  python tools/art_study/tree_foliage.py OUT.png
"""
import sys
from types import SimpleNamespace
import numpy as np
from PIL import Image
from tree_anatomy import Tree, vn, hexc, unit, to_screen, BARK, GROUND, KX, KY, KZ, VIEW, SUN, hero

LEAF = np.array([hexc(c) for c in ("#0a1013", "#111d1d", "#1a2c23", "#273d27", "#3a5029", "#55652d", "#7a7b36", "#a39647")])
RIGHT = unit(np.array([1.0, -1.0, 0.0]))
UPV = unit(np.cross(VIEW, RIGHT))                                       # screen-up, in the world
if UPV[2] < 0:
    UPV = -UPV


def clumps_of(tree, cell=0.62, seed=4):
    rr = np.random.default_rng(seed)
    pts = np.array([p for p, m in tree.leafpts])
    ms = np.array([m for p, m in tree.leafpts])
    key = np.floor(pts / cell).astype(int)
    out = {}
    for k, p, m in zip(map(tuple, key), pts, ms):
        out.setdefault((k, m), []).append(p)
    cl = []
    for (k, m), ps in out.items():
        ps = np.array(ps)
        c = ps.mean(0) + np.array([0, 0, 0.15])
        spread = np.sqrt(((ps - ps.mean(0)) ** 2).sum(1).mean()) if len(ps) > 1 else 0.2
        R = np.clip(0.62 + spread * 0.6 + len(ps) * 0.012, 0.6, 1.25) * rr.uniform(0.9, 1.1)
        cl.append((c, R, int(m)))
    # the crown is a shell: no leaves grow deep in its own shade, nor low on the trunk under it
    top = max(c[2] for c, R, m in cl)
    cen = np.mean([c for c, R, m in cl], 0)
    far = np.percentile([np.linalg.norm((c - cen) * [1, 1, 1.3]) for c, R, m in cl], 90)
    keep = []
    for c, R, m in cl:
        shell = np.linalg.norm((c - cen) * [1, 1, 1.3]) / far
        if c[2] < top * 0.56 or shell < 0.32:
            continue
        keep.append((c, R, m))
    return keep


def worley(x, y, size, seed):
    """small leaves: distance to the nearest and second-nearest leaf centre, and the vector to the nearest"""
    gx, gy = np.floor(x / size).astype(int), np.floor(y / size).astype(int)
    f1 = np.full(x.shape, 9e9)
    f2 = np.full(x.shape, 9e9)
    vx = np.zeros(x.shape)
    vy = np.zeros(x.shape)
    for ox in (-1, 0, 1):
        for oy in (-1, 0, 1):
            cx, cy = gx + ox, gy + oy
            jx = _hash(cx, cy, seed)
            jy = _hash(cx, cy, seed + 7)
            px, py = (cx + jx) * size, (cy + jy) * size
            d = np.hypot(x - px, (y - py) * 1.25)
            nearer = d < f1
            f2 = np.where(nearer, f1, np.minimum(f2, d))
            vx = np.where(nearer, x - px, vx)
            vy = np.where(nearer, y - py, vy)
            f1 = np.where(nearer, d, f1)
    return f1, f2, vx, vy


def _hash(a, b, s):
    h = (a * 374761393 + b * 668265263 + s * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return (h & 0xFFFF) / 65535.0


def render(tree, clumps, mode, W, H, ox, oy, ground=None, leaf=None):
    """ground: optional (points, normals) per pixel from a shaped floor (forest_floor.cast); flat otherwise.
    leaf: another leaf ramp (tools/landkit/tree.py gives the game's darker one)"""
    LF = LEAF if leaf is None else leaf
    SY, SX = np.mgrid[0:H, 0:W].astype(float)
    if ground is None:
        gx = ((SY - oy) / KY + (SX - ox) / KX) / 2
        gy = ((SY - oy) / KY - (SX - ox) / KX) / 2
        gpts = np.stack([gx, gy, np.zeros_like(gx)], -1)
        gnrm = np.zeros((H, W, 3))
        gnrm[..., 2] = 1
    else:
        gpts, gnrm = ground
        gx, gy = gpts[..., 0], gpts[..., 1]
    zbuf = gpts @ VIEW
    kind = np.zeros((H, W), int)                                        # 0 ground, 1 bark, 2 leaf
    nrm = gnrm.copy()
    P3 = gpts.copy()
    rad = np.zeros((H, W))
    width = np.zeros((H, W))
    sval = np.zeros((H, W))
    tval = np.zeros((H, W))
    # ---- bark (as exercise 1)
    pid = np.full((H, W), -1)
    for pi, (p0, p1, r0, r1, s0, s1, fk) in enumerate(tree.pieces):
        t = unit(p1 - p0)
        b1 = np.cross(t, VIEW)
        if np.linalg.norm(b1) < 1e-6:
            continue
        b1 = unit(b1)
        b2 = unit(np.cross(b1, t))
        if b2 @ VIEW < 0:
            b2 = -b2
        a0 = np.array(to_screen(p0, ox, oy))
        a1 = np.array(to_screen(p1, ox, oy))
        nst = int(max(2, np.linalg.norm(a1 - a0) / 0.7))
        bs = np.array([b1[0] * KX - b1[1] * KX, (b1[0] + b1[1]) * KY - b1[2] * KZ])
        bsl = np.linalg.norm(bs)
        for i in range(nst + 1):
            f = i / nst
            c = p0 + (p1 - p0) * f
            r = r0 + (r1 - r0) * f
            sx, sy = to_screen(c, ox, oy)
            rpx = max(r * bsl, 0.45)
            x0, x1 = int(max(sx - rpx - 1, 0)), int(min(sx + rpx + 2, W))
            y0, y1 = int(max(sy - rpx - 1, 0)), int(min(sy + rpx + 2, H))
            if x1 <= x0 or y1 <= y0:
                continue
            yy, xx = SY[y0:y1, x0:x1], SX[y0:y1, x0:x1]
            off = np.stack([xx + 0.5 - sx, yy + 0.5 - sy], -1)
            across = (off @ (bs / bsl)) / rpx
            inside = np.hypot(off[..., 0], off[..., 1]) / rpx <= (1.0 if rpx >= 0.8 else 0.9)
            cr = np.clip(across, -1, 1)
            q = np.sqrt(np.clip(1 - cr * cr, 0, 1))
            n3 = b1[None, None, :] * cr[..., None] + b2[None, None, :] * q[..., None]
            pt = c[None, None, :] + n3 * r
            dep = pt @ VIEW
            upd = inside & (dep > zbuf[y0:y1, x0:x1])
            zbuf[y0:y1, x0:x1][upd] = dep[upd]
            nrm[y0:y1, x0:x1][upd] = n3[upd]
            P3[y0:y1, x0:x1][upd] = pt[upd]
            kind[y0:y1, x0:x1][upd] = 1
            pid[y0:y1, x0:x1][upd] = pi
            rad[y0:y1, x0:x1][upd] = r
            width[y0:y1, x0:x1][upd] = rpx
            sval[y0:y1, x0:x1][upd] = s0 + (s1 - s0) * f
            tval[y0:y1, x0:x1][upd] = np.arctan2(cr, q)[upd] * r
    # ---- leaves: each clump a rough ball, its edge cut into leaves
    nm = max(m for _, _, m in clumps) + 1
    mcent = np.array([np.mean([c for c, R, m in clumps if m == k] or [np.zeros(3)], 0) for k in range(nm)])
    mrad = np.array([max([np.linalg.norm(c - mcent[k]) + R for c, R, m in clumps if m == k] or [1.0]) for k in range(nm)])
    massid = np.full((H, W), -1)
    clid = np.full((H, W), -1)
    edge01 = np.zeros((H, W))
    PXR = 24.0
    for ci, (c, R, m) in enumerate(clumps):
        sx, sy = to_screen(c, ox, oy)
        rp = R * PXR
        x0, x1 = int(max(sx - rp * 1.2, 0)), int(min(sx + rp * 1.2 + 1, W))
        y0, y1 = int(max(sy - rp * 1.2, 0)), int(min(sy + rp * 1.2 + 1, H))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = SY[y0:y1, x0:x1], SX[y0:y1, x0:x1]
        dx, dy = (xx + 0.5 - sx) / rp, (yy + 0.5 - sy) / rp
        d = np.hypot(dx, dy)
        # the edge cut into leaves: notches the size of a leaf cluster, deeper below (leaves hang)
        lf1, lf2, _, _ = worley(xx + ci * 31.0, yy + ci * 17.0, 3.6, 5)
        cut = np.clip(lf1 / 3.0, 0, 1) * 0.16 + vn(xx * 0.15 + ci * 13.1, yy * 0.15 + ci * 7.3) * 0.12
        lobe = 0.92 + 0.07 * np.cos(np.arctan2(dy, dx) * 4 + ci) - cut - np.clip(dy, 0, 1) * 0.06
        inside = d < lobe
        nz = np.sqrt(np.clip(1 - np.minimum(d / np.maximum(lobe, 0.3), 1) ** 2, 0, 1))
        n3 = RIGHT[None, None, :] * dx[..., None] + UPV[None, None, :] * (-dy)[..., None] + VIEW[None, None, :] * nz[..., None]
        n3 /= np.linalg.norm(n3, axis=-1, keepdims=True)
        pt = c[None, None, :] + n3 * R
        dep = pt @ VIEW
        upd = inside & (dep > zbuf[y0:y1, x0:x1])
        zbuf[y0:y1, x0:x1][upd] = dep[upd]
        # the light on the MASS first: blend the clump's own roundness into the mass's
        nmass = pt - mcent[m][None, None, :]
        nmass /= np.linalg.norm(nmass, axis=-1, keepdims=True) + 1e-9
        nb = nmass * 0.8 + n3 * 0.2                                     # the mass leads; the clump only modulates
        nb /= np.linalg.norm(nb, axis=-1, keepdims=True)
        nrm[y0:y1, x0:x1][upd] = nb[upd]
        P3[y0:y1, x0:x1][upd] = pt[upd]
        kind[y0:y1, x0:x1][upd] = 2
        massid[y0:y1, x0:x1][upd] = m
        clid[y0:y1, x0:x1][upd] = ci
        edge01[y0:y1, x0:x1][upd] = (d / np.maximum(lobe, 0.3))[upd]
    # ---- shadow map from the sun: bark and leaves
    su = unit(np.cross(SUN, np.array([0, 0, 1.0])))
    sv = unit(np.cross(su, SUN))
    RES, SMN = 0.04, 1000
    smap = np.full((SMN, SMN), -1e9)
    def splat(c, r, top):
        u_, v_ = c @ su / RES + SMN / 2, c @ sv / RES + SMN / 2
        k = max(int(r / RES), 0)
        ui, vi = int(u_), int(v_)
        a0_, a1_ = max(ui - k, 0), min(ui + k + 1, SMN)
        b0_, b1_ = max(vi - k, 0), min(vi + k + 1, SMN)
        if a1_ > a0_ and b1_ > b0_:
            if k > 3:
                uu, vv = np.mgrid[a0_:a1_, b0_:b1_]
                disc = np.hypot(uu - u_, vv - v_) <= k
                blk = smap[a0_:a1_, b0_:b1_]
                blk[disc] = np.maximum(blk[disc], top)
            else:
                smap[a0_:a1_, b0_:b1_] = np.maximum(smap[a0_:a1_, b0_:b1_], top)
    for (p0, p1, r0, r1, s0, s1, fk) in tree.pieces:
        if p1[2] < 0 and p0[2] < 0:
            continue
        n = int(max(2, np.linalg.norm(p1 - p0) / RES))
        for f in np.linspace(0, 1, n + 1):
            c = p0 + (p1 - p0) * f
            r = r0 + (r1 - r0) * f
            splat(c, r, c @ SUN + r)
    for (c, R, m) in clumps:
        splat(c, R * 0.82, c @ SUN + R * 0.6)
    pu = (P3 @ su / RES + SMN / 2).astype(int).clip(0, SMN - 1)
    pv = (P3 @ sv / RES + SMN / 2).astype(int).clip(0, SMN - 1)
    bias = np.where(kind == 2, 0.55, np.where(kind == 1, rad * 1.6 + 0.03, 0.03))
    shadowed = smap[pu, pv] > (P3 @ SUN) + bias
    # sun-flecks: light coming through the gaps in the leaves, on the ground and the trunk
    fleck = shadowed & (kind != 2) & (vn(P3[..., 0] * 1.7 + 3, P3[..., 1] * 1.7) > 0.74)
    shadowed = shadowed & ~fleck
    if mode == "raw":                                                  # the buffers, for another painter
        return SimpleNamespace(**locals())
    ndl = np.clip((nrm * SUN).sum(-1), 0, 1)
    lv = np.where(shadowed & (kind == 2), ndl * 0.45, np.where(shadowed, ndl * 0.22, ndl))
    lm = kind == 2
    bm = kind == 1
    gm = kind == 0
    img = np.zeros((H, W, 3))
    # ground (as exercise 1, quiet)
    stroke = vn(gx * 0.35 + gy * 0.12, gy * 1.6 - gx * 0.5) * 0.6 + vn(gx * 0.9, gy * 0.9) * 0.4
    gdist = np.hypot(gx, gy)
    gv = 0.46 + (stroke - 0.5) * 0.09 - np.clip(1 - gdist / 1.4, 0, 1) * 0.15 - shadowed * 0.24
    gi = np.clip((gv * len(GROUND)).astype(int), 0, len(GROUND) - 1)
    img[gm] = GROUND[gi[gm]]
    # bark
    sky = np.clip(nrm[..., 2], 0, 1) * 0.12
    grain = vn(tval * 26 + sval * 0.6, sval * 2.2)
    furrow = (grain < 0.36) & (rad > 0.035) & (width > 2.2)
    ridge = (grain > 0.7) & (rad > 0.035) & (width > 2.2)
    bv = 0.2 + lv * 0.7 + sky - furrow * 0.18 + ridge * 0.07 - np.clip(1 - P3[..., 2] / 0.6, 0, 1) * 0.12
    bi = np.clip((bv * len(BARK)).astype(int), 0, len(BARK) - 1)
    img[bm] = BARK[bi[bm]]
    thin = bm & (width < 0.75)
    img[thin] = img[thin] * 0.6 + GROUND[2] * 0.4
    if mode == "masses":
        tones = np.array([hexc(c) for c in ("#3f5a2c", "#2c4a34", "#55663a", "#36503a", "#4a5e30", "#2f4630")])
        img[lm] = tones[massid[lm] % len(tones)]
        return img
    # leaves: four value groups
    inner = np.clip(1 - np.linalg.norm(P3 - mcent[np.clip(massid, 0, nm - 1)], axis=-1) / mrad[np.clip(massid, 0, nm - 1)], 0, 1)
    v = 0.2 + lv * 0.62 + np.clip(nrm[..., 2], 0, 1) * 0.12 - inner * 0.12
    grp = np.where(v > 0.66, 3, np.where(v > 0.47, 2, np.where(v > 0.3, 1, 0)))
    if mode == "values":
        flat = np.array([hexc(c) for c in ("#1a2c23", "#273d27", "#45592c", "#8a8a40")])
        img[lm] = flat[grp[lm]]
        return img
    base = np.array([2, 3, 4, 6])[grp]                                  # each group's tone on the ramp
    # leaf texture on the lit and half planes only: little leaves lit upper-left, dark lower-right, dark gaps
    f1, f2, vx, vy = worley(SX, SY, 4.4, 11)
    gap = (f2 - f1) < 0.7
    leaf_lit = (vx * -0.7 + vy * -0.7) > 0.9
    leaf_dark = (vx * -0.7 + vy * -0.7) < -1.4
    tex = np.where(gap, -1, np.where(leaf_lit, 1, np.where(leaf_dark, -1, 0)))
    tex = np.where(grp >= 2, tex, np.where(grp == 1, np.where(gap & (vn(SX * 0.3, SY * 0.3) > 0.5), -1, 0), 0))
    li = np.clip(base + tex, 0, len(LEAF) - 1)
    li = np.clip(li, 0, len(LF) - 1)
    img[lm] = LF[li[lm]]
    # the outer rim of the lit clumps catches the light (leaves edge-on to the sun), the shade side stays flat
    rimk = lm & (edge01 > 0.82) & (grp >= 2) & (ndl > 0.55)
    img[rimk] = LF[np.clip(li[rimk] + 1, 0, len(LF) - 1)]
    below_open = (np.roll(kind, -2, axis=0) != 2) | (np.roll(kind, -3, axis=0) != 2)
    bounce = lm & (grp <= 1) & below_open & (nrm[..., 2] < 0.1)   # only the mass's lower silhouette
    img[bounce] = LF[np.clip(li[bounce] + 1, 0, len(LF) - 1)] * np.array([1.08, 1.02, 0.9])
    # the light's temperature in steps
    warm = lm & (grp == 3)
    img[warm] = img[warm] * np.array([1.06, 1.02, 0.9])
    cool = (lm | bm) & (grp <= 0)
    img[cool] = img[cool] * np.array([0.94, 0.98, 1.08])
    return img


def main(out):
    tree = Tree(16, scale=1.55, turn=2.6)
    clumps = clumps_of(tree)
    W, H = 640, 580
    ox, oy = W / 2 - 10, H - 60
    panels = [hero(render(tree, clumps, m, W, H, ox, oy), "painted", W, H, ox, oy) for m in ("masses", "values", "painted")]
    sheet = np.concatenate([np.pad(p, ((6, 6), (6, 6), (0, 0)), constant_values=0.08) for p in panels], 1)
    Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8)).resize((sheet.shape[1] * 2 // 2, sheet.shape[0] * 2 // 2), Image.NEAREST).save(out)
    Image.fromarray((np.clip(panels[2], 0, 1) * 255).astype(np.uint8)).resize((W * 2, H * 2), Image.NEAREST).save(out.replace(".png", "_painted.png"))
    hp = np.array([-1.5, -5.5, 0.0])
    GW, GH = 480, 270
    gox = GW / 2 - (hp[0] - hp[1]) * KX
    goy = GH / 2 + 19 - (hp[0] + hp[1]) * KY
    game = hero(render(tree, clumps, "painted", GW, GH, gox, goy), "painted", GW, GH, gox, goy, at=hp[:2])
    Image.fromarray((np.clip(game, 0, 1) * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST).save(out.replace(".png", "_game.png"))
    print("saved", out, len(clumps), "clumps")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tree_foliage.png")
