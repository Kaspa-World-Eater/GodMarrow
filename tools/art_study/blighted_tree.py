"""Tree study, refinement: the old broadleaf of a dying world, and the forest floor under it (Derek 2026-10-06: "Our
world is a dark world, so the trees should have rot and pathogens ... render some tiles underneath it too in the new
art forms"). STUDY.md round 11. (In game text the word for it is blight or canker: "rot" is a banned word there.)

The tree is exercise 2's (tree_foliage.render, mode "raw", gives the buffers); this paints it sick:
- STAG-HEADED: the great limb highest in the crown has died back; its upper wood stands bare and silver-grey above
  the leaves, barkless, cracked along the grain, crusted with lichen;
- THE CROWN THINS: a share of the clumps gone (more sky holes); of those left, some yellowed (chlorosis), some
  killed rust-brown and still clinging, and leaf-spot on others (dead brown spots, each with a yellow halo);
- CANKERS: sunken wounds on the trunk and a great limb, each ringed by a swollen lip of callus, dark sap bleeding
  down below in a wet streak;
- BRACKET FUNGI in stacked shelves on the trunk, their tops lit and banded with growth rings, dark beneath;
- A HOLLOW at the foot of the trunk, dark inside, its rim lit;
- LICHEN on the tops of the limbs, MOSS on the roots and the foot;
- a colder, darker light: the moon, not the sun.

The forest floor (world-fixed, so it tiles): dark soil under a litter of fallen leaves (each leaf a shape, lit on one
side, in browns, rusts and dull ochres, thickest under the crown), moss in the damp near the trunk, a fallen dead
limb with mushrooms at its foot, a few dark tufts out past the crown's edge; the crown's dappled shadow over all.

  python tools/art_study/blighted_tree.py OUT.png
"""
import sys
import numpy as np
from PIL import Image
from tree_anatomy import Tree, vn, hexc, unit, to_screen, KX, KY, KZ, VIEW, SUN, hero, BARK
from tree_foliage import clumps_of, render, worley, _hash, LEAF
from forest_floor import Floor, paint_floor, living


def ramp(*cs):
    return np.array([hexc(c) for c in cs])


DEAD = ramp("#1e1e24", "#33333a", "#4c4b52", "#6b686c", "#8d8886", "#aea79f", "#cdc6ba")
SICK = ramp("#0e110f", "#1a2015", "#2b3119", "#43461e", "#615e28", "#837a32", "#a59742", "#c0b057")
RUST = ramp("#110b0b", "#21130f", "#371e13", "#522c18", "#70401d", "#8f5525", "#aa6e31", "#bd8644")
LICHEN = ramp("#2e3530", "#4a5446", "#6a755f", "#8c9579")
MOSS = ramp("#121b0e", "#1d2b16", "#2c3f1c", "#405523", "#576c2b")
FUNG = ramp("#24180f", "#463020", "#6e5232", "#977a50", "#bfa577", "#ddcca2")
SOIL = ramp("#110e10", "#1b1517", "#261e1b", "#33281f", "#423326", "#54412e")
LITTER_W = ramp("#2a1b13", "#3a261b", "#523622")
TWIG = ramp("#1a1414", "#3a2e28", "#6a5a4a")
FROND = ramp("#2a160e", "#4a2614", "#6a3a1a", "#8e5626", "#2c3a1e", "#44542a")   # dead rust, and the last green                     # the litter as washes: dark, mid, lit
LEAFFALL = ramp("#5a3420", "#4a3320", "#6a5226", "#3a3a1f", "#463733", "#77482a", "#2c201b")
WET = hexc("#120a0c")
CAP = ramp("#3a3028", "#8e8572", "#c6bda4", "#e2dbc8")
GRASS = ramp("#0f150f", "#18221a", "#253323", "#36462b")


def sicken(tree, clumps, seed=5):
    """the dead limb, the thinned and diseased crown, a fallen limb on the floor"""
    rr = np.random.default_rng(seed)
    pm = np.array(tree.piece_mass)
    tops = {}
    for (p, m) in tree.leafpts:
        tops.setdefault(m, []).append(p[2])
    dm = max(tops, key=lambda m: np.percentile(tops[m], 80))
    zcut = np.percentile(tops[dm], 35)
    dead = np.array([(pm[i] == dm and min(p0[2], p1[2]) > zcut) for i, (p0, p1, *_) in enumerate(tree.pieces)])
    deadc = np.mean([p for (p, m) in tree.leafpts if m == dm and p[2] > zcut], 0)
    kept, health = [], []
    for ci, (c, R, m) in enumerate(clumps):
        if m == dm and c[2] > zcut - 0.6:
            continue                                                    # nothing grows on the dead wood
        if rr.random() < 0.12:
            continue                                                    # the crown thins
        kept.append((c, R, m))
        sick = vn(np.array(c[0] * 0.22 + 5), np.array(c[1] * 0.22 + c[2] * 0.15))
        near = np.linalg.norm(c - deadc)
        if near < 2.6 and rr.random() < 0.7:
            health.append(2)                                            # killed, clinging, at the die-back's edge
        elif sick > 0.58:
            health.append(1 if rr.random() < 0.75 else 3)               # the yellowed region, some of it spotted
        else:
            health.append(0 if rr.random() < 0.9 else 3)
    # a great limb that fell long ago, lying in the litter: grey, barkless, broken at both ends
    n0 = len(tree.pieces)
    a = np.array([3.6, -2.2, 0.0])
    d = unit(np.array([0.9, 0.45, 0.0]))
    L, r0 = 5.4, 0.32
    for i in range(8):
        f0, f1 = i / 8, (i + 1) / 8
        p0 = a + d * L * f0 + np.array([0, 0, r0 * (1 - f0 * 0.5) * 0.55])
        p1 = a + d * L * f1 + np.array([0, 0, r0 * (1 - f1 * 0.5) * 0.55]) + np.array([0, 0, 0.03 * np.sin(i)])
        tree.pieces.append((p0, p1, r0 * (1 - f0 * 0.5), r0 * (1 - f1 * 0.5), L * f0, L * f1, 9.0))
        tree.piece_mass.append(-2)
    for k, (f, side) in enumerate([(0.3, 1), (0.55, -1), (0.75, 1)]):
        p0 = a + d * L * f + np.array([0, 0, r0 * 0.9])
        dd = unit(d * 0.5 + np.array([-d[1], d[0], 0]) * side + np.array([0, 0, 0.5]))
        tree.pieces.append((p0, p0 + dd * 0.7, r0 * 0.45, r0 * 0.25, 0.0, 0.7, 9.0))
        tree.piece_mass.append(-2)
    dead = np.concatenate([dead, np.ones(len(tree.pieces) - n0, bool)])
    n1 = len(tree.pieces)
    base = tree.pieces[0][0]
    for k in range(7):
        az = k * 0.9 + rr.normal(0, 0.2)
        d2 = np.array([np.cos(az), np.sin(az), 0.0])
        p = base + d2 * 0.55
        r_ = 0.24 * rr.uniform(0.7, 1.1)
        Lr = rr.uniform(2.2, 4.0)
        steps = 9
        for i in range(steps):
            d2 = unit(d2 + np.array([rr.normal(0, 0.25), rr.normal(0, 0.25), 0]))
            q = p + d2 * Lr / steps
            r2 = r_ * (1 - (i + 1) / steps * 0.8)
            tree.pieces.append((p + np.array([0, 0, r_ * 0.35]), q + np.array([0, 0, r2 * 0.35]), r_, r2, Lr * i / steps, Lr * (i + 1) / steps, 9.0))
            tree.piece_mass.append(-3)
            p, r_ = q, r2
    dead = np.concatenate([dead, np.zeros(len(tree.pieces) - n1, bool)])
    return dead, kept, np.array(health), dm


def paint(R, tree, clumps, health, dead, W, H, ox, oy, F, lamp):
    kind, nrm, P3 = R.kind, R.nrm, R.P3
    lm, bm, gm = kind == 2, kind == 1, kind == 0
    SX, SY, gx, gy = R.SX, R.SY, R.gx, R.gy
    ndl = np.clip((nrm * SUN).sum(-1), 0, 1)
    shadowed = R.shadowed
    lv = np.where(shadowed & lm, ndl * 0.45, np.where(shadowed, ndl * 0.2, ndl))
    img = np.zeros((H, W, 3))
    pid = R.pid
    pm = np.array(tree.piece_mass)
    isdead = bm & dead[np.clip(pid, 0, len(dead) - 1)]
    piece_m = np.where(bm, pm[np.clip(pid, 0, len(pm) - 1)], -9)
    # ---- the forest floor (forest_floor.py), lit by the moon and the lantern; the lantern lights the tree too
    img, info = paint_floor(img, R, F, lamp)
    lamp_k = info["lamp"]
    # ---- bark: living, and dead
    sv, tv, rad, width = R.sval, R.tval, R.rad, R.width
    sky = np.clip(nrm[..., 2], 0, 1) * 0.1
    grain = vn(tv * 26 + sv * 0.6, sv * 2.2)
    furrow = (grain < 0.36) & (rad > 0.035) & (width > 2.2)
    ridge = (grain > 0.7) & (rad > 0.035) & (width > 2.2)
    bv = 0.17 + lv * 0.62 + sky - furrow * 0.16 + ridge * 0.06 - np.clip(1 - P3[..., 2] / 0.6, 0, 1) * 0.1
    bv = bv + lamp_k * 1.0
    bi = np.clip((bv * len(BARK)).astype(int), 0, len(BARK) - 1)
    img[bm] = BARK[bi[bm]]
    # dead wood: silver-grey, no furrows, long cracks along the grain
    crack = (vn(tv * 40, sv * 0.8) < 0.22) & (width > 1.5)
    dv = 0.32 + lv * 0.62 + sky - crack * 0.2
    dv = np.where(piece_m == -2, dv - 0.22, dv)
    img[isdead] = DEAD[np.clip((dv * len(DEAD)).astype(int), 0, len(DEAD) - 1)][isdead]
    # cankers: on the trunk and on one great limb; a sunken wound, a callus lip, sap bleeding down
    trunk = bm & (piece_m == -1) & (rad > 0.25)
    limb = bm & (piece_m >= 0) & (rad > 0.12) & ~isdead
    cankers = [(trunk, 2.4, 0.15, 0.32), (trunk, 4.6, -0.35, 0.24), (limb, 6.0, 0.05, 0.16), (limb, 8.5, -0.05, 0.12)]
    for (mask, s_c, t_c, sz) in cankers:
        d = np.hypot((sv - s_c) / (sz * 1.7), (tv - t_c) / sz)
        wound = mask & (d < 0.62)
        lip = mask & (d >= 0.62) & (d < 1.0)
        img[lip] = BARK[np.clip(bi[lip] + 2, 0, len(BARK) - 1)]
        img[wound] = BARK[np.clip(bi[wound] - 3, 0, len(BARK) - 1)] * 0.8
        wig = np.sin(sv * 5 + s_c) * sz * 0.15
        bleed = mask & (sv < s_c - sz * 0.9) & (sv > s_c - sz * 5.5) & (np.abs(tv - t_c - wig) < sz * 0.22 * np.clip((sv - (s_c - sz * 5.5)) / (sz * 4), 0.25, 1))
        img[bleed] = WET
        glint = bleed & (ndl > 0.5) & (vn(sv * 9, tv * 9) > 0.75)
        img[glint] = hexc("#4e4048")
    # the hollow at the foot: dark within, its rim lit on the upper edge
    hs = np.clip(1 - ((sv - 1.05) / 0.85) ** 2, 0, 1)
    hol = bm & (piece_m == -1) & (np.abs(tv - 0.1) < 0.34 * np.sqrt(hs)) & (sv > 0.25) & (sv < 1.85)
    img[hol] = np.where((np.abs(tv - 0.1) < 0.24 * np.sqrt(hs))[hol][:, None], hexc("#07050a"), hexc("#1c1418"))
    rimh = bm & (piece_m == -1) & ~hol & (np.abs(tv - 0.1) < 0.42 * np.sqrt(hs)) & (sv > 0.25) & (sv < 1.95) & (ndl > 0.4)
    img[rimh] = BARK[np.clip(bi[rimh] + 2, 0, len(BARK) - 1)]
    # lichen on the tops of limbs (and thickest on the dead), moss on the roots and the foot
    lich = bm & (nrm[..., 2] > 0.25) & (vn(P3[..., 0] * 2.4 + P3[..., 2], P3[..., 1] * 2.4) > np.where(isdead & (piece_m != -2), 0.45, 0.66)) & (vn(P3[..., 0] * 8, P3[..., 2] * 8) > 0.38) & ~hol
    lvv = 0.2 + lv * 0.75
    img[lich] = LICHEN[np.clip((lvv * len(LICHEN)).astype(int), 0, len(LICHEN) - 1)][lich]
    footm = bm & (P3[..., 2] < 0.7) & (nrm[..., 2] > 0.0) & (vn(P3[..., 0] * 3, P3[..., 1] * 3 + P3[..., 2]) > 0.55) & ~hol & ~isdead
    img[footm] = MOSS[np.clip(((0.15 + lv * 0.5) * len(MOSS)).astype(int), 0, len(MOSS) - 1)][footm]
    thin = bm & (width < 0.75)
    img[thin] = img[thin] * 0.6 + SOIL[2] * 0.4
    # ---- bracket fungi: stacked shelves on the trunk's lit side
    rr = np.random.default_rng(9)
    trunk_pieces = [i for i, m in enumerate(tree.piece_mass) if m == -1 and tree.pieces[i][2] > 0.25]
    for (hz, az, n_sh) in [(1.9, 2.1, 3), (3.3, 1.5, 2), (2.6, 3.3, 2)]:
        best = min(trunk_pieces, key=lambda i: abs((tree.pieces[i][0][2] + tree.pieces[i][1][2]) / 2 - hz))
        p0, p1, r0, r1 = tree.pieces[best][:4]
        c = (p0 + p1) / 2
        o = unit(np.array([np.cos(az), np.sin(az), 0.0]))
        if o @ VIEW < 0.15:
            continue
        anchor = c + o * (r0 + r1) / 2
        ax, ay = to_screen(anchor, ox, oy)
        ov = np.array([o[0] * KX - o[1] * KX, (o[0] + o[1]) * KY])
        ov = ov / (np.linalg.norm(ov) + 1e-9)
        for k in range(n_sh):
            w = 9.0 - k * 2.2 + rr.uniform(-1, 1)
            t_ = w * 0.34
            cx, cy = ax + ov[0] * w * 0.55, ay + k * 5.5 + ov[1] * w * 0.3
            u, v = (SX + 0.5 - cx) / w, (SY + 0.5 - cy) / t_
            top = (u * u + v * v) < 1
            under_ = ((u * u + ((SY + 0.5 - cy - 1.6) / t_) ** 2) < 1) & ~top
            band = np.hypot(SX + 0.5 - ax, (SY + 0.5 - ay - k * 5.5) * 2.4)
            ring = (np.sin(band * 1.3) > 0.55)
            lvk = np.clip(0.55 + (-u - v) * 0.25, 0, 1)
            fi = np.clip((lvk * len(FUNG)).astype(int) - ring, 0, len(FUNG) - 1)
            edge = top & ((u * u + v * v) > 0.72)
            img[under_] = FUNG[1]
            img[top] = FUNG[fi[top]]
            img[edge & (v < 0)] = FUNG[5]
            shad = ((u * u + ((SY + 0.5 - cy - 3.2) / t_) ** 2) < 1) & ~top & ~under_ & bm
            img[shad] *= 0.6
    # ---- the leaves, sick
    clid = R.clid
    hh = np.where(clid >= 0, health[np.clip(clid, 0, len(health) - 1)], 0)
    massid, mcent, mrad, nm = R.massid, R.mcent, R.mrad, R.nm
    inner = np.clip(1 - np.linalg.norm(P3 - mcent[np.clip(massid, 0, nm - 1)], axis=-1) / mrad[np.clip(massid, 0, nm - 1)], 0, 1)
    v = 0.17 + lv * 0.6 + np.clip(nrm[..., 2], 0, 1) * 0.1 - inner * 0.12
    grp = np.where(v > 0.66, 3, np.where(v > 0.47, 2, np.where(v > 0.3, 1, 0)))
    base = np.array([2, 3, 4, 6])[grp]
    w1, w2, wx, wy = worley(SX, SY, 4.4, 11)
    gap = (w2 - w1) < 0.7
    sd = wx * -0.7 + wy * -0.7
    tex = np.where(gap, -1, np.where(sd > 0.9, 1, np.where(sd < -1.4, -1, 0)))
    tex = np.where(grp >= 2, tex, np.where(grp == 1, np.where(gap & (vn(SX * 0.3, SY * 0.3) > 0.5), -1, 0), 0))
    li = np.clip(base + tex, 0, 7)
    leafcol = np.where((hh == 1)[..., None], SICK[li], np.where((hh == 2)[..., None], RUST[li], LEAF[li]))
    img[lm] = leafcol[lm]
    # leaf-spot: dead brown spots, each with a yellowed halo, on the lit planes of spotted clumps
    s1, s2, sx_, sy_ = worley(SX + 3, SY + 7, 5.0, 29)
    spot_c = _hash(np.floor((SX + 3 - sx_) / 5).astype(int), np.floor((SY + 7 - sy_) / 5).astype(int), 3) > 0.55
    spot = lm & (hh == 3) & spot_c & (grp >= 1)
    img[spot & (s1 < 1.1)] = hexc("#2a1a10")
    img[spot & (s1 >= 1.1) & (s1 < 1.9)] = SICK[np.clip(li + 1, 0, 7)][spot & (s1 >= 1.1) & (s1 < 1.9)]
    below_open = (np.roll(kind, -2, axis=0) != 2) | (np.roll(kind, -3, axis=0) != 2)
    bounce = lm & (grp <= 1) & below_open & (nrm[..., 2] < 0.1)
    img[bounce] = img[bounce] * 1.18
    rimk = lm & (R.edge01 > 0.82) & (grp >= 2) & (ndl > 0.55)
    img[rimk] = img[rimk] * 1.12
    # warm where the lantern reaches the tree
    wl = (bm | lm) & (lamp_k > 0.12)
    img[wl] = img[wl] * np.array([1.12, 1.0, 0.8])
    img = living(img, R, F, info, ox, oy, np.random.default_rng(13))
    # the moon's cold over all: a dark world
    img = img * np.array([0.86, 0.89, 0.97])
    return img


def main(out):
    tree = Tree(16, scale=1.55, turn=2.6)
    clumps = clumps_of(tree)
    dead, clumps, health, dm = sicken(tree, clumps)
    W, H = 720, 620
    ox, oy = W / 2 - 30, H - 110
    F = Floor(keep_clear=[(0, 0), (1.8, 2.2), (5.5, -1.0)])
    at = (1.8, 2.2)
    lamp = np.array([at[0] + 0.21, at[1] - 0.21, float(F.h(np.array(at[0]), np.array(at[1]))) + 0.68])
    R = render(tree, clumps, "raw", W, H, ox, oy, ground=F.cast(W, H, ox, oy))
    img = hero(paint(R, tree, clumps, health, dead, W, H, ox, oy, F, lamp), "painted", W, H, ox, oy, at=at)
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((W * 2, H * 2), Image.NEAREST).save(out)
    hp = np.array([-1.5, -5.5, 0.0])
    GW, GH = 480, 270
    gox = GW / 2 - (hp[0] - hp[1]) * KX
    goy = GH / 2 + 19 - (hp[0] + hp[1]) * KY
    lamp = np.array([hp[0] + 0.21, hp[1] - 0.21, float(F.h(np.array(hp[0]), np.array(hp[1]))) + 0.68])
    R = render(tree, clumps, "raw", GW, GH, gox, goy, ground=F.cast(GW, GH, gox, goy))
    game = hero(paint(R, tree, clumps, health, dead, GW, GH, gox, goy, F, lamp), "painted", GW, GH, gox, goy, at=hp[:2])
    Image.fromarray((np.clip(game, 0, 1) * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST).save(out.replace(".png", "_game.png"))
    print("saved", out, "dead limb", dm)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "blighted_tree.png")
