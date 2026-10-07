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

AGES = {"young": 0.55, "middle": 0.95, "giant": 1.55}


def grow(age, seed, turn, thin=0.0):
    tree = Tree(seed, scale=AGES[age], turn=turn)
    cl = clumps_of(tree)
    if thin > 0:
        rr = np.random.default_rng(seed + 7)
        cl = [c for c in cl if rr.random() > thin]
    return tree, cl


def make(age, seed, turn, thin=0.0):
    tree, cl = grow(age, seed, turn, thin)
    P = np.array([p for (p0, p1, *_) in tree.pieces for p in (p0, p1)])
    top = P[:, 2].max() + 2.0
    spread = max(np.abs(P[:, 0]).max(), np.abs(P[:, 1]).max()) + 2.0
    W = int(spread * 2 * (KX + KY) * 1.1) + 20
    H = int(top * KZ + spread * 2 * KY) + 20
    ox, oy = W / 2, H - spread * KY - 6
    R = render(tree, cl, "raw", W, H, ox, oy)
    img = render(tree, cl, "painted", W, H, ox, oy)
    obj = R.kind > 0
    # the crown's base: the lowest leaf above the trunk; the trunk layer is the wood below it
    leaf = R.kind == 2
    zcrown = float(np.percentile(R.P3[..., 2][leaf], 5)) if leaf.any() else top
    crown = obj & ((R.kind == 2) | (R.P3[..., 2] > zcrown))
    trunk = obj & ~crown
    n = R.nrm
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
