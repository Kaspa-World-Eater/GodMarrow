"""Build an ecosystem's whole landkit set into the game: art/landkit/<set>/ with index.json naming each piece's role
(what a zone's sprite key becomes, world/landkit.gd). One command, every piece regenerated from its generator.

  python tools/landkit/build_set.py old_growth
"""
import os
import sys
import json
import glob
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "art_study"))
import log as logs          # noqa: E402
import deadwood             # noqa: E402
import rock                 # noqa: E402
import tree                 # noqa: E402
import flora                # noqa: E402
import giant                # noqa: E402
from kit import export      # noqa: E402

ROOT = os.path.join(HERE, "..", "..")


def canopy_shade(out, name, seed):
    """the crown overhead, felt on the floor: a dappled pool of shade about eleven yards across, lobed like the crown
    above it, with moonflecks through it; alpha in three steps, the 4x4 dither only where one step meets the next"""
    import numpy as np
    from PIL import Image
    from kit import KX, KY, vn, B4
    R = 5.5
    W, H = int(R * 2 * KX * 2) + 8, int(R * 2 * KY * 2) + 8
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    cx, cy = W / 2, H / 2
    u, v = (xx - cx) / (R * 2 * KX), (yy - cy) / (R * 2 * KY)       # world-ish, the iso ellipse made round
    gx, gy = (u + v), (v - u)                                       # back to ground yards / R
    ang = np.arctan2(gy, gx)
    lobe = 0.82 + 0.12 * np.sin(ang * 5 + seed) + 0.08 * np.sin(ang * 9 + seed * 2) + (vn(gx * 3 + seed, gy * 3) - 0.5) * 0.2
    d = np.hypot(gx, gy) * 1.4
    body = np.clip((lobe - d) / 0.25, 0, 1)
    clumps = vn(gx * 5 + seed * 3, gy * 5) * 0.6 + vn(gx * 11, gy * 11 + seed) * 0.4
    fleck = (clumps > 0.68) & (vn(gx * 17 + 5, gy * 17) > 0.45)       # where the leaves part
    a = body * (0.55 + (clumps - 0.5) * 0.3)
    a = np.where(fleck, a * 0.15, a)
    bay = B4[yy.astype(int) % 4, xx.astype(int) % 4]
    q = np.clip(np.floor(a / 0.18 + bay * 0.9), 0, 3) * 0.18           # three steps of shade, dithered where they meet
    rgba = np.dstack([np.full(q.shape, 0.03), np.full(q.shape, 0.03), np.full(q.shape, 0.06), q])
    Image.fromarray((rgba * 255).astype(np.uint8), "RGBA").save(os.path.join(out, name + ".webp"), lossless=True)
    json.dump(dict(kind="shade/canopy", foot=[cx, cy], size=[W, H], posts=[], cover=0.0),
              open(os.path.join(out, name + ".json"), "w"), indent=1)


def old_growth(out):
    roles = {}
    add = lambda role, name: roles.setdefault(role, []).append(name)
    # trees: two of each age (trunk + crown layers)
    plan = [("giant", 16, 2.6, 0.0), ("giant", 30, 1.2, 0.12), ("middle", 1, 0.6, 0.0), ("middle", 12, 1.9, 0.1),
            ("middle", 7, 2.2, 0.35), ("young", 40, 2.6, 0.0), ("young", 23, 0.6, 0.0), ("young", 5, 1.4, 0.0),
            ("sapling", 3, 1.0, 0.0), ("sapling", 9, 2.0, 0.0), ("sapling", 17, 0.3, 0.0)]
    for (age, seed, turn, thin) in plan:
        name = "tree_%s_%d" % (age, seed)
        img, trunk, crown, nm, meta = tree.make(age, seed, turn, thin)
        meta["layers"] = ["trunk", "crown"]
        tree.save(name, out, img, trunk, crown, nm, meta)
        add("tree_dying" if thin >= 0.3 else "tree_" + age, name)
        print("tree", name, flush=True)
    # the towering trees of the Hollow Wood (giant.py): six, so no two alike stand near each other
    for sd in range(1, 7):
        F, info = giant.make(sd)
        img, mask, n, C, meta = giant.render(F, info)
        export("towering_%d" % sd, out, img, mask, n, C, F, meta, shadow=False)
        add("tree_towering", "towering_%d" % sd)
        print("towering", sd, flush=True)
    for sd in range(1, 4):
        canopy_shade(out, "canopy_shade_%d" % sd, sd)
        add("canopy_shade", "canopy_shade_%d" % sd)
    for cls in (1, 2, 3, 4, 5):
        for s in (1, 2, 3):
            F, info = logs.make(cls, s * 10 + cls)
            img, mask, n, C = logs.render(F, info)
            meta = logs.meta_for(info)
            meta["axis"] = "x"
            name = "log_c%d_%d" % (cls, s)
            export(name, out, img, mask, n, C, F, meta)
            add("log", name)
            add("log_c%d" % cls, name)
    print("logs", flush=True)
    for s in (1, 2, 3):
        F, info = deadwood.root_plate(s)
        img, mask, n, C, meta = deadwood.paint_plate(F, info)
        meta["axis"] = "y"
        export("rootplate_%d" % s, out, img, mask, n, C, F, meta)
        add("rootplate", "rootplate_%d" % s)
        F, info = deadwood.stump(s + 10)
        img, mask, n, C, meta = deadwood.paint_stump(F, info)
        export("stump_%d" % s, out, img, mask, n, C, F, meta)
        add("stump", "stump_%d" % s)
        F, info = deadwood.snag(s + 20)
        img, mask, n, C, meta = deadwood.paint_snag(F, info)
        export("snag_%d" % s, out, img, mask, n, C, F, meta)
        add("snag", "snag_%d" % s)
    print("deadwood", flush=True)
    for kind, seeds in [("erratic", [1, 2, 3]), ("slab", [4, 5]), ("stone", [6, 7, 8]), ("cluster", [9, 10])]:
        for s in seeds:
            img, mask, n, C, F, meta = rock.make(kind, s)
            meta.setdefault("cover", float(meta.get("height", 1.0)))
            meta.setdefault("material", "stone")
            export("rock_%s_%d" % (kind, s), out, img, mask, n, C, F, meta)
            add("rock_" + kind, "rock_%s_%d" % (kind, s))
            add("rock", "rock_%s_%d" % (kind, s))
    print("rocks", flush=True)
    for s in range(1, 4):
        flora.save(flora.fern(s), "fern_%d" % s, out, True, (36, 42))
        flora.save(flora.fern(s + 10, bracken=True), "bracken_%d" % s, out, True, (42, 54))
        flora.save(flora.moss_cushion(s), "moss_%d" % s, out, False, (20, 18))
        flora.save(flora.mushrooms(s, pale=(s % 2 == 1)), "mushroom_%d" % s, out, False, (15, 17))
        for r in ("fern", "bracken", "moss", "mushroom"):
            add(r, "%s_%d" % (r, s))
    print("flora", flush=True)
    # the ground: the wood's floor tiles (tools/art_study/tiles_wood.py), in the game's 320x160
    import tiles_wood as tw
    gd = os.path.join(out, "ground")
    os.makedirs(gd, exist_ok=True)
    ground = {"main": [], "dirt": []}
    for k in range(2):
        t, _ = tw.main_0(seed=k * 101)
        tw.save(t, os.path.join(gd, "main_%d.webp" % k))
        ground["main"].append("ground/main_%d.webp" % k)
    d, _ = tw.dirt_0()
    tw.save(d, os.path.join(gd, "dirt_0.webp"))
    ground["dirt"].append("ground/dirt_0.webp")
    ground["road"] = []
    for k in range(2):                                     # the trodden way, in place of the old cobbles
        t, _ = tw.path_0(seed=k * 57)
        tw.save(t, os.path.join(gd, "path_%d.webp" % k))
        ground["road"].append("ground/path_%d.webp" % k)
    print("ground", flush=True)
    pieces = {}
    for f in sorted(glob.glob(os.path.join(out, "*.json"))):
        nm = os.path.basename(f)[:-5]
        if nm == "index":
            continue
        pieces[nm] = json.load(open(f))
    json.dump(dict(set="old_growth", roles=roles, pieces=pieces, ground=ground), open(os.path.join(out, "index.json"), "w"), indent=1)


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "old_growth"
    out = os.path.join(ROOT, "art", "landkit", which)
    os.makedirs(out, exist_ok=True)
    globals()[which](out)
    print("built", out)
