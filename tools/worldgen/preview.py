"""See a generated forest as the player will (stage 3): any spot of a zone made by forest.py, rendered through the scene
engine (tools/art_study/wood_scene.py) at the game's camera with the Ossuarch for scale, from the same pieces the set
bakes (landkit bake.py: the same seeds give the same warped trunks, stumps and stones). The ways show as trodden
ground; the floor is the old-growth litter generator.

  python tools/worldgen/preview.py ZONE_sSEED.json.gz X Y OUT.png
"""
import os
import sys
import json
import gzip
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(ROOT, "tools", "landkit"))
sys.path.insert(0, os.path.join(ROOT, "tools", "art_study"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wood_scene as ws          # noqa: E402
import wood_pale                 # noqa: E402
import vein_tree                 # noqa: E402
import vein_stump                # noqa: E402
import flat_stone                # noqa: E402
import forest                    # noqa: E402

wood_pale.install()
AX = np.array([1.0, 1.0]) / np.sqrt(2)
NORTH = -AX


def render(zone_file, cx, cy, out):
    with gzip.open(zone_file, "rt", encoding="utf-8") as fh:
        Z = json.load(fh)
    pieces = forest._piece_list()
    mine = [s for s in Z["sprites"] if str(s.get("key", "")).startswith("lk:")]
    near = [s for s in mine if abs(s["x"] - cx) < 14 and abs(s["y"] - cy) < 14]
    trees, stumps, stones = [], [], []
    for s in near:
        nm = s["key"][3:]
        role, spec = pieces[nm]
        if spec["kind"] in ("vein_tree", "vein_snag"):
            trees.append((s["x"], s["y"], spec, nm))
        elif spec["kind"] == "vein_stump":
            stumps.append((s["x"], s["y"], spec))
        elif spec["kind"] == "flat_stone":
            stones.append((s["x"], s["y"], spec))
    _, _, grid, walk, road = forest.bones(Z)
    ws.FOCUS = np.array([cx, cy], float)
    ws.HERO = np.array([cx + 1.5, cy + 1.0])
    ws.GRASS = ws.FERNS = ws.MIST = ws.BEAMS = False
    ws.FOREST_LIFE = False
    ws.NORMAL_BLUR = 0.0
    ws.RIM_EXTRA = tuple(range(1000, 1100))
    VT = [(x, y, sp["girth"], sp["height"], sp["seed"]) for (x, y, sp, nm) in trees]

    def plan(w):
        w.trees, w.logs, w.rocks, w.sapl, w.shrooms = [], [], [], [], []
        w.H = w.H * 0.0
        for name in ("fern", "grass", "moss", "bare", "pool"):            # nothing of the old plan's own floor
            a_ = getattr(w, name, None)
            if isinstance(a_, np.ndarray) and a_.dtype == bool:
                setattr(w, name, np.zeros_like(a_))
        lt = np.ones(w.X.shape)
        for (x, y, r, h, sd) in VT:                                     # the giants' crowns shade the floor
            lt = lt - np.clip(1 - np.hypot(w.X - x, w.Y - y) / (r * 6.0), 0, 1) * 0.2
        w.light = np.clip(lt, 0.45, 1)
        w.gap = (-100.0, -100.0, 1.0)

    def stamp(W, w):
        X, Y = W["X"], W["Y"]
        ii = np.clip(Y.astype(int), 0, grid.shape[0] - 1)
        jj = np.clip(X.astype(int), 0, grid.shape[1] - 1)
        way = forest.ways  # noqa: F841 (the ways come from the zone's ground: its roads)
        from scipy import ndimage as nd
        mid = nd.binary_erosion(road, iterations=1)                         # the worn way: trodden down its middle, soft at its edges
        tr = mid[ii, jj] & (ws.vn(X * 1.3, Y * 1.3) > 0.32)
        W["mat"] = np.where(tr & (W["tag"] == 0), 2, W["mat"])
        grounds = [float(ws.look(W, W["Hrest"], np.array(x), np.array(y))) for (x, y, r, h, sd) in VT]
        ws.TRUNK_WARP = vein_tree.Warp(VT, grounds, tag0=1000) if VT else None
        H, tags = vein_tree.stamp(X, Y, W["H"], VT, NORTH, seed=7, root_reach=3.5)   # a forest's roots stay near their trees
        for i, (x, y, sp, nm) in enumerate(trees):
            if sp.get("broken"):
                top = grounds[i] + sp["height"] * sp["broken"] + vein_tree.broken_top(X, Y, x, y, sp["girth"], sp["seed"])
                H = np.where(tags == 1 + i, np.minimum(H, top), H)
        W["H"] = H
        W["Hrest"] = np.where(tags < 0, H, W["Hrest"])
        W["HT"] = np.where(tags > 0, H, W["HT"])
        for i, (x, y, sp, nm) in enumerate(trees):
            W["tag"] = np.where(tags == 1 + i, 1000 + i, np.where(tags == -(1 + i), 2000 + i, W["tag"]))
            W["obj"][1000 + i] = dict(kind="veintree", c=np.array([x, y]), r=sp["girth"], dying=1.0 if sp.get("dying") else 0.0)
            W["obj"][2000 + i] = dict(kind="veinroot", c=np.array([x, y]), r=sp["girth"] * 0.2, dying=0.0)
        for k, (x, y, sp) in enumerate(stumps):
            H2, part, info = vein_stump.stamp(X, Y, W["H"], (x, y), R=sp["girth"], fall=sp["fall"], seed=sp["seed"], north=NORTH, cut=sp["cut"])
            W["H"] = H2
            W["Hrest"] = np.where(part != 0, H2, W["Hrest"])
            for p_ in range(1, 6):
                W["tag"] = np.where(part == p_, 3000 + k * 10 + p_, W["tag"])
                W["obj"][3000 + k * 10 + p_] = dict(kind="vstump", part=p_, c=np.array([x, y]), r=sp["girth"], info=info)
        for k, (x, y, sp) in enumerate(stones):
            H2, part, info = flat_stone.stamp(X, Y, W["H"], (x, y), size=sp["size"], yaw=sp["yaw"], seed=sp["seed"])
            W["H"] = H2
            W["Hrest"] = np.where(part > 0, H2, W["Hrest"])
            for p_ in (1, 2, 3):
                W["tag"] = np.where(part == p_, 4000 + k * 10 + p_, W["tag"])
                W["obj"][4000 + k * 10 + p_] = dict(kind="flatstone", part=p_, info=info, c=info["c"], r=sp["size"] * 0.5)

    ws.WOOD_HOOKS[:] = [plan]
    ws.BUILD_HOOKS[:] = [stamp, wood_pale.keep_world]
    ws.LIVING[:] = [wood_pale.tree_eyes]
    ws.PAINTERS["veintree"] = lambda img, m, v, n, px, py, pz, o, W, L: wood_pale.pale_bark(img, m, v, n, px, py, pz, o)
    ws.PAINTERS["veinroot"] = ws.PAINTERS["veintree"]
    ws.PAINTERS["vstump"] = lambda img, m, v, n, px, py, pz, o, W, L: vein_stump.paint(img, m, v, n, px, py, pz, o["part"], o["info"], ws.SUN)
    ws.PAINTERS["flatstone"] = lambda img, m, v, n, px, py, pz, o, W, L: flat_stone.paint(img, m, v, n, px, py, pz, o["part"], o["info"], L["side"], ws.SUN)
    ws.main(out)


if __name__ == "__main__":
    render(sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4])
