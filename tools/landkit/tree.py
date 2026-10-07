"""Trees of the old wood as reusable objects (landkit), grown and painted by the tree studies
(tools/art_study/tree_anatomy.py, tree_foliage.py: real growth rules, the crown lit as masses, leaf texture on the
light) at true scale, then cut into the two layers the game needs:
  <name>.webp          the TRUNK layer: the trunk and the low limbs, sorted by depth at the foot, collision there
  <name>_crown.webp    the CROWN layer: leaves and the limbs among them, drawn over everything nearer its foot;
                       it sways with the wind (cm_prop_lit.gdshader's sway) and thins while the hero is under it
                       (world/see_through.gd)
  each with its normal map (_n), and a json: foot, collision post, cover, material, sway, the crown's base height.
Ages: young (scale 0.55), middle (0.95), giant (1.55). Health: well, or blighted (the crown thinned).

  python tools/landkit/tree.py OUT_DIR
"""
import os
import sys
import json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "art_study"))
from tree_anatomy import Tree, KX, KY, KZ, VIEW            # noqa: E402
from tree_foliage import clumps_of, render                 # noqa: E402

# the old wood's leaves: darker and colder than the study's sunlit ramp, the lights olive, never yellow (a grim wood)
GRIM = np.array([[int(c[i:i + 2], 16) / 255 for i in (1, 3, 5)] for c in (
    "#0a1113", "#101b1a", "#17271f", "#1f3223", "#2a3f27", "#38502c", "#4b5f31", "#61703b")])
LICHEN = np.array([[int(c[i:i + 2], 16) / 255 for i in (1, 3, 5)] for c in ("#3c463a", "#5b6753", "#7d8a70", "#9aa68a")])
AGES = {"sapling": 0.32, "young": 0.55, "middle": 0.95, "giant": 1.55}


def grow(age, seed, turn, thin=0.0):
    tree = Tree(seed, scale=AGES[age], turn=turn)
    cl = clumps_of(tree)
    rr = np.random.default_rng(seed + 7)
    if thin > 0:
        cl = [c for c in cl if rr.random() > thin]
    # not a bunch of grapes: clumps of many sizes, and on the crown's outside small sprays of leaves hanging off the
    # big clumps, so its edge is lace and not a row of bumps
    cl = [(c, R * float(np.exp(rr.normal(0, 0.24))), m) for (c, R, m) in cl]
    cen = np.mean([c for c, R, m in cl], 0)
    far = np.percentile([np.linalg.norm((c - cen)[:2]) for c, R, m in cl], 65)
    extra = []
    for (c, R, m) in cl:
        out_ = (c - cen) * np.array([1.0, 1.0, 0.0])
        if np.linalg.norm(out_) < far:
            continue
        out_ /= np.linalg.norm(out_) + 1e-9
        for k in range(rr.integers(1, 3)):
            side = np.array([-out_[1], out_[0], 0.0]) * rr.uniform(-0.8, 0.8)
            p = c + (out_ + side) * R * rr.uniform(0.75, 1.05) + np.array([0, 0, -R * rr.uniform(0.2, 0.55)])
            extra.append((p, R * rr.uniform(0.32, 0.5), m))
    return tree, cl + extra


def make(age, seed, turn, thin=0.0):
    tree, cl = grow(age, seed, turn, thin)
    P = np.array([p for (p0, p1, *_) in tree.pieces for p in (p0, p1)])
    top = P[:, 2].max() + 2.0
    spread = max(np.abs(P[:, 0]).max(), np.abs(P[:, 1]).max()) + 2.0
    W = int(spread * 2 * (KX + KY) * 1.1) + 20
    H = int(top * KZ + spread * 2 * KY) + 20
    ox, oy = W / 2, H - spread * KY - 6
    R = render(tree, cl, "raw", W, H, ox, oy, leaf=GRIM)
    img = render(tree, cl, "painted", W, H, ox, oy, leaf=GRIM)
    obj = R.kind > 0
    # beard lichen hanging from the undersides of the limbs, pale grey-green strands (old growth's own sign), more
    # on the dying; each strand belongs to the layer of the limb it hangs from
    rr = np.random.default_rng(seed + 31)
    strands = np.zeros(obj.shape, int)                                  # 0 none, 1 trunk layer, 2 crown layer
    under = (R.kind == 1) & (np.roll(R.kind, -1, axis=0) == 0) & (R.P3[..., 2] > 1.6) & (R.width < 2.6)
    ys, xs = np.nonzero(under)
    p_hang = 0.035 + thin * 0.08
    taken_x = set()
    for (y, x) in zip(ys, xs):
        if rr.random() > p_hang or any(abs(x - t) < 4 for t in taken_x if True):
            continue
        taken_x.add(x)
        # a tuft: three to six strands from neighbouring pixels of the limb, long in the middle, short at its sides
        n_ = int(rr.integers(3, 7))
        for k in range(n_):
            sx = x + k - n_ // 2
            if not (0 <= sx < obj.shape[1]) or not under[min(max(y + int(rr.integers(-1, 2)), 0), obj.shape[0] - 1), sx] and k not in (n_ // 2,):
                pass
            mid = 1 - abs(k - (n_ - 1) / 2) / max((n_ - 1) / 2, 1)
            L = int(3 + mid * rr.integers(5, 12) + rr.integers(0, 3))
            drift = rr.choice([-1, 0, 0, 1])
            for j in range(1, L + 1):
                yy, xx = y + j, sx + (drift if j > L * 0.6 else 0)
                if not (0 <= yy < obj.shape[0] and 0 <= xx < obj.shape[1]) or obj[yy, xx]:
                    break
                if (j + k) % 5 == 4 and j > 3 and rr.random() < 0.3:
                    continue                                              # gaps: strands, not a curtain
                tone = 3 - int(j / L * 1.6) - (1 if k % 2 else 0)
                img[yy, xx] = LICHEN[int(np.clip(tone, 0, 3))]
                strands[yy, xx] = 2 if R.P3[y, x, 2] > 0 else 1
    obj0 = obj.copy()
    obj = obj | (strands > 0)
    # the crown's base: the lowest leaf above the trunk; the trunk layer is the wood below it
    leaf = R.kind == 2
    zcrown = float(np.percentile(R.P3[..., 2][leaf], 5)) if leaf.any() else top
    crown = (obj0 & ((R.kind == 2) | (R.P3[..., 2] > zcrown)))
    hang_crown = np.zeros(obj.shape, bool)
    for (y, x) in zip(*np.nonzero(strands > 0)):                          # a strand goes with the limb above it
        y0 = y
        while y0 > 0 and not obj0[y0, x]:
            y0 -= 1
        hang_crown[y, x] = crown[y0, x]
    crown = crown | hang_crown
    trunk = obj & ~crown
    n = R.nrm.copy()
    n[strands > 0] = VIEW                                               # a strand faces the eye
    sr = (n[..., 0] - n[..., 1]) / np.sqrt(2)
    su = n[..., 2] * 0.85 - (n[..., 0] + n[..., 1]) / np.sqrt(2) * 0.5
    sz = (n * VIEW).sum(2)
    nm = np.dstack([sr, su, sz])
    nm /= np.linalg.norm(nm, axis=2, keepdims=True) + 1e-9
    r_trunk = float(tree.pieces[0][2])
    meta = dict(kind="tree/%s" % age, age=age, seed=int(seed), turn=float(turn), thin=float(thin), foot=[ox, oy],
                size=[W, H], height=float(top - 2.0), crown_base=zcrown, sway=1.6 if age != "giant" else 1.2,
                posts=[[0.0, 0.0, round(r_trunk * 1.25, 3)]], cover=float(top - 2.0), material="wood_living",
                hp=None if age != "young" else 40, lightning_rod=(age == "giant"))
    return img, trunk, crown, nm, meta


def save(name, out, img, trunk, crown, nm, meta):
    os.makedirs(out, exist_ok=True)
    for layer, m in (("", trunk), ("_crown", crown)):
        Image.fromarray((np.dstack([np.clip(img, 0, 1), m.astype(float)]) * 255).astype(np.uint8), "RGBA").save(
            os.path.join(out, name + layer + ".webp"), lossless=True)
        Image.fromarray((np.dstack([nm * 0.5 + 0.5, m.astype(float)]) * 255).astype(np.uint8), "RGBA").save(
            os.path.join(out, name + layer + "_n.webp"), lossless=True)
    json.dump(meta, open(os.path.join(out, name + ".json"), "w"), indent=1)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "trees"
    plan = [("giant", 16, 2.6, 0.0), ("giant", 30, 1.2, 0.12), ("middle", 1, 0.6, 0.0), ("middle", 12, 1.9, 0.1),
            ("young", 40, 2.6, 0.0), ("young", 23, 0.6, 0.0)]
    for i, (age, seed, turn, thin) in enumerate(plan):
        img, trunk, crown, nm, meta = make(age, seed, turn, thin)
        save("tree_%s_%d" % (age, i), out, img, trunk, crown, nm, meta)
        print("tree", age, seed, meta["size"])
