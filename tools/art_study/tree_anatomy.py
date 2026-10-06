"""Tree study, exercise 1: the skeleton of a bare broadleaf tree (Derek 2026-10-06: "study trees next and learn to
draw them"). See tools/art_study/STUDY.md, round 11.

The tree is grown, not drawn: a 3D branching built on how trees really grow, then shown three ways, in the game's view
at its true scale (a yard is a 36x18 tile, 22 px of screen per yard of height):
  1 gesture: the limbs as lines weighted by their thickness, the way a draughtsman finds the tree first;
  2 volume: the same limbs as round forms in three flat values (light, half, shade), no texture;
  3 painted: bark furrows running with the grain, dark collars in the crotches, light from the upper left with the
    limbs' shadows on each other and on the ground, roots flaring and diving, the ground under it.

Growth rules (the botany in STUDY.md):
- area is conserved at a fork (r^2 = r1^2 + r2^2), so the taper is continuous;
- at a fork the larger child carries on nearly straight, the smaller leaves at a wider angle;
- each fork turns about 137 degrees round the axis, so the tree is never flat;
- decurrent: the trunk loses itself in a few great limbs that spread;
- limbs reach up toward the light, long ones sag and turn up at the tip; the trunk leans a little and twists;
- the trunk flares into buttress roots that run out and dive.

  python tools/art_study/tree_anatomy.py OUT.png
"""
import sys
import numpy as np
from PIL import Image

RNG0 = np.random.default_rng(3)
_P = RNG0.random((1024, 1024))


def vn(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 1024, b % 1024]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def hexc(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)])


# bark: darks lean violet, lights warm grey-ochre
BARK = np.array([hexc(c) for c in ("#120e16", "#211a22", "#33282c", "#4a3b38", "#625044", "#7e6a54", "#9c8a6c", "#bcae8e")])
GROUND = np.array([hexc(c) for c in ("#17151c", "#24211f", "#353024", "#4a432c", "#615737", "#7b6f45")])
PAPER = hexc("#d9d1c0")
INK = hexc("#2a2228")

KX, KY, KZ = 18.0, 9.0, 22.0                                            # screen px per yard (x, y, height)
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW /= np.linalg.norm(VIEW)                                            # toward the camera
SUN = np.array([-0.62, 0.3, 0.72])
SUN /= np.linalg.norm(SUN)                                              # from the screen's upper left


def unit(v):
    return v / np.linalg.norm(v)


class Tree:
    """a list of limb pieces: (p0, p1, r0, r1, s0, s1, fork) in yards; s = length along the limb (for the bark);
    fork = the distance of p0 from the fork it grew from (for the crotch collar)"""

    def __init__(self, seed=7, scale=2.6, turn=0.0):
        self.rr = np.random.default_rng(seed)
        self.k = scale
        self.pieces = []
        self.forks = []                                                 # (point, radius) of every fork
        self.piece_mass = []                                            # each piece's great limb (-1: trunk, roots)
        self.leafpts = []                                               # (point, mass): where leaves grow (twig ends)
        base = np.array([0.0, 0.0, -0.05])
        lean = unit(np.array([0.12, -0.08, 1.0]))
        # the foot flares into the roots before the trunk proper
        K = scale
        self.pieces.append((base, base + lean * 0.5 * K, 0.5 * K, 0.37 * K, 0.0, 0.5 * K, 9.0))
        self.piece_mass.append(-1)
        self.limb(base + lean * 0.5 * K, lean, 0.37 * K, 2.4 * K, 0, 0.5 * K, 0.0, mass=-1)
        # buttress roots: run out from the flare and dive
        for k in range(6):
            az = k * 1.05 + self.rr.normal(0, 0.25)
            d = unit(np.array([np.cos(az), np.sin(az), -0.35]))
            p0 = base + np.array([0, 0, 0.35 * K])
            mid = p0 + d * 0.55 * K + np.array([0, 0, -0.22 * K])
            end = mid + unit(d + np.array([0, 0, -0.6])) * 0.7 * K
            self.pieces.append((p0, mid, 0.22 * K, 0.11 * K, 0.0, 0.5 * K, 9.0))
            self.pieces.append((mid, end, 0.11 * K, 0.03 * K, 0.5 * K, 1.2 * K, 9.0))
            self.piece_mass += [-1, -1]
        # turn the whole tree on its trunk (a painter chooses the angle: no great limb pointed down the line of sight)
        if turn:
            c, s_ = np.cos(turn), np.sin(turn)
            R = np.array([[c, -s_, 0], [s_, c, 0], [0, 0, 1.0]])
            self.pieces = [(R @ a, R @ b, r0, r1, s0, s1, fk) for (a, b, r0, r1, s0, s1, fk) in self.pieces]
            self.forks = [(R @ a, r) for (a, r) in self.forks]
            self.leafpts = [(R @ a, m) for (a, m) in self.leafpts]

    def limb(self, p, d, r, L, depth, s, phi, mass=0, r_in=None):
        rr = self.rr
        n = max(3, int(L / 0.3))
        r_end = r * (0.86 if depth else 0.8)
        q = p
        for i in range(n):
            f = (i + 1) / n
            # reach up toward the light; long thin limbs sag under their weight; a little wander
            sag = min(L / max(r, 0.01) * 0.004, 0.12) * (0.6 - f)
            up = 0.03 + 0.06 * np.clip(1 - r / 0.12, 0, 1)
            d = unit(d + np.array([0, 0, up - sag]) + rr.normal(0, 0.07, 3))
            q2 = q + d * (L / n)
            ra, rb = r + (r_end - r) * (i / n), r + (r_end - r) * f
            if r_in is not None:                                       # the leader takes over the parent's width
                ba, bb = max(0.0, 1 - i / 2.0), max(0.0, 1 - (i + 1) / 2.0)
                ra, rb = ra * (1 - ba) + r_in * ba, rb * (1 - bb) + r_in * bb
            self.pieces.append((q, q2, ra, rb, s + L * i / n, s + L * f, L * i / n))
            self.piece_mass.append(mass)
            if rb < 0.03:
                self.leafpts.append((q2, mass))
            q = q2
        s += L
        if r_end < 0.009 or depth > 16:
            return
        self.forks.append((q, r_end))
        # the fork: area conserved; the larger child carries on, the smaller turns out wider
        k = 4 if (depth == 0) else (3 if rr.random() < 0.15 else 2)
        fr = rr.dirichlet({2: [3.0, 1.6], 3: [2.2, 2.0, 1.6], 4: [3.0, 2.8, 2.6, 2.4]}[k])
        fr = np.sort(fr)[::-1]
        # the fork swells, then tapers into the leader: no open end
        rc0 = r_end * np.sqrt(fr[0])
        side = unit(np.cross(d, np.array([0.31, 0.17, 0.93])))
        up2 = unit(np.cross(side, d))
        phi += np.radians(137.5)
        for j in range(k):
            rc = r_end * np.sqrt(fr[j])
            ang = np.radians(18 + 55 * (1 - fr[j] / fr[0]) + rr.normal(0, 6)) if j else np.radians(rr.uniform(8, 20))
            if depth == 0:
                ang = np.radians(rr.uniform(8, 16) if j == 0 else rr.uniform(38, 55))   # the leader, and the great limbs
            ph = phi + j * 2 * np.pi / k
            out = unit(side * np.cos(ph) + up2 * np.sin(ph))
            dc = unit(d * np.cos(ang) + out * np.sin(ang))
            Lc = L * rr.uniform(0.7, 0.86) * (fr[j] / fr[0]) ** 0.25
            if depth == 0:
                Lc = rr.uniform(2.0, 2.6) * self.k
            Lc = max(Lc, 0.22)
            q0 = q - d * (j * 0.3 * self.k if depth == 0 else 0.0)           # great limbs staggered down the trunk
            if j:
                q0 = q0 - dc * rc * 0.9                                      # born inside the parent, not stuck on
            self.limb(q0, dc, rc, Lc, depth + 1, s, ph, j if depth == 0 else mass, r_end if j == 0 else None)


def to_screen(p, ox, oy):
    return (p[0] - p[1]) * KX + ox, (p[0] + p[1]) * KY - p[2] * KZ + oy


def render(tree, mode, W=680, H=820, ox=None, oy=None):
    ox = W / 2 + 20 if ox is None else ox
    oy = H - 70 if oy is None else oy
    SY, SX = np.mgrid[0:H, 0:W].astype(float)
    # the ground plane first (z = 0) into the depth buffer
    gx = ((SY - oy) / KY + (SX - ox) / KX) / 2
    gy = ((SY - oy) / KY - (SX - ox) / KX) / 2
    gpts = np.stack([gx, gy, np.zeros_like(gx)], -1)
    zbuf = (gpts @ VIEW)
    ground = np.ones_like(gx, bool)                                     # the ground fills the view, as in the game
    zbuf = np.where(ground, zbuf, -1e9)
    nrm = np.zeros((H, W, 3))
    P3 = np.where(ground[..., None], gpts, 0)
    sval = np.zeros((H, W))                                             # along the limb (bark)
    tval = np.zeros((H, W))                                             # round the limb
    rad = np.zeros((H, W))
    isbark = np.zeros((H, W), bool)
    width = np.zeros((H, W))
    for (p0, p1, r0, r1, s0, s1, fk) in tree.pieces:
        seglen = np.linalg.norm(p1 - p0)
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
            dd = np.hypot(off[..., 0], off[..., 1]) / rpx
            inside = dd <= 1.0
            if rpx < 0.8:
                inside = dd <= 0.9
            cr = np.clip(across, -1, 1)
            q = np.sqrt(np.clip(1 - cr * cr, 0, 1))
            n3 = b1[None, None, :] * cr[..., None] + b2[None, None, :] * q[..., None]
            pt = c[None, None, :] + n3 * r
            dep = pt @ VIEW
            upd = inside & (dep > zbuf[y0:y1, x0:x1])
            zbuf[y0:y1, x0:x1][upd] = dep[upd]
            nrm[y0:y1, x0:x1][upd] = n3[upd]
            P3[y0:y1, x0:x1][upd] = pt[upd]
            sval[y0:y1, x0:x1][upd] = s0 + (s1 - s0) * f
            tval[y0:y1, x0:x1][upd] = np.arctan2(cr, q)[upd] * r
            rad[y0:y1, x0:x1][upd] = r
            width[y0:y1, x0:x1][upd] = rpx
            isbark[y0:y1, x0:x1][upd] = True
    if mode == "gesture":
        img = np.zeros((H, W, 3)) + PAPER
        # each limb a line, weighted by its thickness: the centre band of every limb only
        img[isbark & (rad > 0.0)] = PAPER * 0.55 + INK * 0.45
        core = isbark & (np.abs(tval) < np.maximum(rad * 0.35, 0.012))
        img[core] = INK
        gl = ground & ~isbark & (np.abs(np.hypot(gx, gy) - 4.3) < 0.07)
        img[gl] = PAPER * 0.6 + INK * 0.4
        return img
    # shadow map from the sun: every limb sample splatted into sun space
    su = unit(np.cross(SUN, np.array([0, 0, 1.0])))
    sv = unit(np.cross(su, SUN))
    RES = 0.04
    SMN = 900
    smap = np.full((SMN, SMN), -1e9)
    for (p0, p1, r0, r1, s0, s1, fk) in tree.pieces:
        if p1[2] < 0 and p0[2] < 0:
            continue
        n = int(max(2, np.linalg.norm(p1 - p0) / RES))
        f = np.linspace(0, 1, n + 1)
        cs = p0[None] + (p1 - p0)[None] * f[:, None]
        rs = r0 + (r1 - r0) * f
        for c, r in zip(cs, rs):
            u_, v_ = c @ su / RES + SMN / 2, c @ sv / RES + SMN / 2
            k = max(int(r / RES), 0)
            ui, vi = int(u_), int(v_)
            a0_, a1_ = max(ui - k, 0), min(ui + k + 1, SMN)
            b0_, b1_ = max(vi - k, 0), min(vi + k + 1, SMN)
            if a1_ > a0_ and b1_ > b0_:
                smap[a0_:a1_, b0_:b1_] = np.maximum(smap[a0_:a1_, b0_:b1_], c @ SUN + r)
    pu = (P3 @ su / RES + SMN / 2).astype(int).clip(0, SMN - 1)
    pv = (P3 @ sv / RES + SMN / 2).astype(int).clip(0, SMN - 1)
    shadowed = smap[pu, pv] > (P3 @ SUN) + np.where(isbark, rad * 1.6 + 0.03, 0.03)
    ndl = np.clip((nrm * SUN).sum(-1), 0, 1)
    img = np.zeros((H, W, 3)) + hexc("#100e14")
    if mode == "volume":
        lv = np.where(shadowed, 0.0, ndl)
        tone = np.where(lv > 0.55, 2, np.where(lv > 0.18, 1, 0))
        flat = np.array([hexc("#2b2430"), hexc("#5c4c48"), hexc("#a8977a")])
        img[isbark] = flat[tone[isbark]]
        gm = ground & ~isbark
        img[gm] = np.where(shadowed[gm][:, None], hexc("#26231e"), hexc("#46402e"))
        return img
    # ---- painted
    lv = np.where(shadowed & isbark, ndl * 0.25, ndl)
    sky = np.clip(nrm[..., 2], 0, 1) * 0.12
    # bark furrows run with the grain (along s), twisting slightly; deep on thick wood, gone on twigs
    grain = vn(tval * 26 + sval * 0.6, sval * 2.2)
    furrow = (grain < 0.36) & (rad > 0.035) & (width > 2.2)
    ridge = (grain > 0.7) & (rad > 0.035) & (width > 2.2)
    # the crotch collar: dark wrinkles where a fork meets its parent; ambient occlusion
    ao = np.zeros((H, W))
    for (fp, fr) in tree.forks:
        dist = np.linalg.norm(P3 - fp[None, None, :], axis=-1)
        ao = np.maximum(ao, np.clip(1 - dist / (fr * 2.6 + 0.02), 0, 1))
    zbase = np.clip(1 - P3[..., 2] / 0.6, 0, 1) * isbark                # the foot of the trunk darker: contact
    v = 0.2 + lv * 0.7 + sky - ao * 0.22 - zbase * 0.12 - furrow * 0.18 + ridge * 0.07
    v = v + (vn(P3[..., 0] * 9 + P3[..., 2] * 3, P3[..., 1] * 9) - 0.5) * 0.06
    bi = np.clip((v * len(BARK)).astype(int), 0, len(BARK) - 1)
    img[isbark] = BARK[bi[isbark]]
    # the light's temperature in steps: lit bark a touch warm, shade a touch violet
    warm = isbark & (lv > 0.5)
    img[warm] = img[warm] * np.array([1.05, 1.0, 0.92])
    cool = isbark & (lv < 0.15)
    img[cool] = img[cool] * np.array([0.95, 0.96, 1.08])
    # a lit rim on the sunward silhouette of the thick limbs: where the limb's edge turns to the light
    rim = isbark & (ndl > 0.7) & (np.abs(nrm @ VIEW) < 0.35) & ~shadowed & (width > 1.6)
    img[rim] = BARK[7]
    # the ground: earth with dry-brush strokes, darker toward the trunk, the tree's shadow laid across it
    gm = ground & ~isbark
    gdist = np.hypot(gx, gy)
    stroke = vn(gx * 0.35 + gy * 0.12, gy * 1.6 - gx * 0.5) * 0.6 + vn(gx * 0.9, gy * 0.9) * 0.4
    gv = 0.46 + (stroke - 0.5) * 0.09 - np.clip(1 - gdist / 1.4, 0, 1) * 0.15 - shadowed * 0.26
                 # fading out at the patch's edge
    gi = np.clip((gv * len(GROUND)).astype(int), 0, len(GROUND) - 1)
    img[gm] = GROUND[gi[gm]]
    thin = isbark & (width < 0.75)
    behind = np.where(ground[..., None], GROUND[np.clip(gi, 0, len(GROUND) - 1)], hexc("#100e14"))
    img[thin] = img[thin] * 0.6 + behind[thin] * 0.4
    return img


def hero(img, mode, W, H, ox=None, oy=None, at=(2.6, 3.4)):
    ox = W / 2 + 20 if ox is None else ox
    oy = H - 70 if oy is None else oy
    hx, hy = to_screen(np.array([at[0], at[1], 0.0]), ox, oy)
    SY, SX = np.mgrid[0:H, 0:W].astype(float)
    u, v = SX - hx, hy - SY                                              # v: height above the feet, in px
    head = np.hypot(u - 0.5, v - 34.5) < 3.4
    robe = (v >= 0) & (v < 32) & (np.abs(u) < 3.0 + (32 - v) * 0.12)
    shoulder = (v > 24) & (v < 32) & (np.abs(u) < 6.2 - (v - 24) * 0.3)
    body = head | robe | shoulder
    lamp = np.hypot(u - 7.5, v - 15) < 1.6
    chain = (np.abs(u - 7.0) < 0.6) & (v > 16) & (v < 22)
    if mode == "gesture":
        img[body | chain] = INK
        img[lamp] = INK
        return img
    img[body] = hexc("#14111a")
    rim = body & ~np.roll(body, 1, axis=1)                              # the left edge, toward the light
    img[rim] = hexc("#5e5262")
    img[chain] = hexc("#2a2430")
    img[lamp] = hexc("#e8b860")
    glow = (np.hypot(u - 7.5, (v - 15) * 1.0) < 7) & ~body & ~lamp
    img[glow] = img[glow] * 0.8 + hexc("#e8b860") * 0.2
    shadow = (np.hypot((u + 6) / 9.0, (v + 1) / 2.0) < 1) & ~body
    img[shadow] *= 0.7
    return img


def main(out):
    tree = Tree(7)
    panels = [hero(render(tree, m), m, 680, 820) for m in ("gesture", "volume", "painted")]
    sheet = np.concatenate([np.pad(p, ((6, 6), (6, 6), (0, 0)), constant_values=0.08) for p in panels], 1)
    im = Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8))
    im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(out)
    big = Image.fromarray((np.clip(panels[2], 0, 1) * 255).astype(np.uint8))
    big.resize((big.width * 2, big.height * 2), Image.NEAREST).save(out.replace(".png", "_painted.png"))
    # the game's own view: a 1920x1080 screen is 480x270 world px at 4 screen px each, the camera on the hero
    hp = np.array([-2.5, -7.5, 0.0])                                    # the hero behind the tree, its crown over him
    GW, GH = 480, 270
    gox = GW / 2 - (hp[0] - hp[1]) * KX
    goy = GH / 2 + 19 - (hp[0] + hp[1]) * KY
    game = hero(render(tree, "painted", GW, GH, gox, goy), "painted", GW, GH, gox, goy, at=hp[:2])
    Image.fromarray((np.clip(game, 0, 1) * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST).save(out.replace(".png", "_game.png"))
    print("saved", out, len(tree.pieces), "pieces")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tree_anatomy.png")
