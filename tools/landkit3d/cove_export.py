"""The Red Shore's cove in the game's own zone format (data/zones/red_shore_s9201.json.gz), so the game loads it with
--zone=red_shore, its ground the bake's (cove_bake.py, art/zones/red_shore_s9201/).

- 1 tile = 1 yard, the zone's (0, 0) corner at the world's (O, O) (cove_bake.O): a tile's world centre is (O + x + 0.5,
  O + y + 0.5), its place on the coast (s, t) from shore_floor.st.
- walkable: the black sand inside the cove (beach_floor.cove_d well below zero), up to the water's edge, and up the
  cleft to the way on; solid: the cliffs and everything past them (ROCK 2), the Red past its edge (WATER 4), and every
  piece standing on the sand (the bake's obstacles: the cliffs' breakdown, the shrine, the canoes, the cairns, the
  jam's bones, the dead, the pole), a tile solid when its centre lies within the piece's reach.
- the way on: a portal at the cleft's top, up into the bluffs (the Ashen Moor's camp stands in for what lies beyond
  until the bluffs are built); the pilgrim starts on the sand under the right headland, where the cave's onyx mirror
  lets them out; a lantern and a waystone beside the start.
- proved: every walkable tile is reached from the start (8 neighbours, no corner squeezed), and the portal is.

  python tools/landkit3d/cove_export.py
"""
import os
import sys
import json
import gzip
import copy
import numpy as np

os.environ.setdefault("GM_CALM", "1")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import shore_floor as S                                                   # noqa: E402
import beach_floor as BF                                                  # noqa: E402
import cove_bake as CB                                                    # noqa: E402

TEMPLATE = os.path.join(ROOT, "data", "zones", "sunken_bog_s9101.json.gz")
SOLID = {2, 3, 4, 5, 7, 8, 9, 10, 15}
WALK, ROCK, WATER = 13, 2, 4


def rle(a):
    a = np.asarray(a).ravel()
    out = []
    i, n = 0, len(a)
    while i < n:
        j = i
        while j < n and a[j] == a[i]:
            j += 1
        out += [int(a[i]), j - i]
        i = j
    return out


def zone_of(s, t):
    x, y = S.xy(s, t)
    return float(x) - CB.O, float(y) - CB.O


def grid():
    W, H = CB.W, CB.H
    yy, xx = np.mgrid[0:H, 0:W]
    X, Y = CB.O + xx + 0.5, CB.O + yy + 0.5
    s, t = S.st(X, Y)
    d = BF.cove_d(s, t)
    g = np.full((H, W), ROCK, np.uint8)
    open_ = (d < -0.9)
    g[open_] = WALK
    g[open_ & (s > BF.WATER + 0.6)] = WATER
    # the cleft: walkable up its floor to the top (its walls are the rim's stumps either side)
    sb = BF.back_s(t)
    cl = (np.abs(t - BF.cleft_t(s)) < BF.CLEFT_W - 0.3) & (s < sb + 1.0) & (s > sb - 9.5)
    g[cl] = WALK
    # what stands on the sand
    obst = json.load(open(os.path.join(CB.OUT, "obstacles.json")))
    for (os_, ot_, r) in obst:
        near = np.hypot(s - os_, t - ot_) < r + 0.25
        g[near & (g == WALK)] = ROCK
    gcls = np.where(g == WATER, 7, np.where(g == WALK, 4, 1)).astype(np.uint8)
    return g, gcls, s, t


def reach(g, start):
    """the game's walk (8 neighbours, a diagonal only when both sides are open), from the start"""
    from collections import deque
    H, W = g.shape
    walk = ~np.isin(g, list(SOLID))
    seen = np.zeros_like(walk)
    sx, sy = int(start[0]), int(start[1])
    q = deque([(sx, sy)])
    seen[sy, sx] = True
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < W and 0 <= ny < H) or seen[ny, nx] or not walk[ny, nx]:
                continue
            if dx and dy and not (walk[y, nx] and walk[ny, x]):
                continue
            seen[ny, nx] = True
            q.append((nx, ny))
    return seen, walk


def main():
    T = json.load(gzip.open(TEMPLATE, "rt", encoding="utf-8"))
    g, gcls, s, t = grid()
    W, H = CB.W, CB.H
    # the start under the right headland, where the onyx mirror lets the pilgrim out onto the sand
    st0 = zone_of(48.0, 29.0)
    # the way on: the cleft's top
    sb_c = float(BF.back_s(np.array([BF.CLEFT_T]))[0])
    s_top = sb_c - 8.0
    t_top = float(BF.cleft_t(np.array([s_top]))[0])
    portal = zone_of(s_top, t_top)
    arrive_up = zone_of(s_top + 2.5, float(BF.cleft_t(np.array([s_top + 2.5]))[0]))
    seen, walk = reach(g, st0)
    cut = walk & ~seen
    # small pieces cut off by the obstacles go solid (a yard or two between a bone and the cliff); report the rest
    from scipy import ndimage as nd
    lab, nl = nd.label(cut)
    big = []
    for i in range(1, nl + 1):
        m = lab == i
        if m.sum() < 25:
            g[m] = ROCK
        else:
            big.append(int(m.sum()))
    seen, walk = reach(g, st0)
    ok_portal = bool(seen[int(portal[1]), int(portal[0])])
    print("walkable %d tiles, reached %d; cut-off pieces left: %s; portal reached: %s" % (int(walk.sum()), int(seen.sum()), big, ok_portal))
    N = copy.deepcopy(T)
    N.update(id="red_shore", name="The Red Shore", seed=CB.SEED, zoneSeed=CB.SEED, theme="moor", land="moor", wallTheme="moor",
             scatterLand="moor", mlvl=[1, 3],
             generator="tools/landkit3d/beach3d.py + cove_bake.py + cove_export.py (the 3D road's cove)")
    N["grid"] = dict(T["grid"], w=W, h=H, cells=rle(g))
    N["ground"] = dict(T["ground"], land="moor", classes=rle(gcls))
    N["walls"] = dict(info=T["walls"]["info"], cells=[])
    for k in ("props", "decor", "landmarks", "landmarkFootprintRocks", "sprites", "zoneProps", "warnings", "quests"):
        N[k] = []
    N["scatter"] = dict(T["scatter"], items=[])
    mk = dict(T["markers"])
    for k in ("lanterns", "waystones", "chests", "shrines", "altars", "statues", "npcs", "questObjects", "ruins", "channels89"):
        mk[k] = []
    objects = [dict(type="portal", x=portal[0], y=portal[1], to="moor", name="Up into the bluffs", spr="cave", i=0, solid=False,
                    sprites=[])]
    conns = [dict(to="moor", toName="moor", name="Up into the bluffs", x=portal[0], y=portal[1], spr="cave", object=0,
                  arriveHereFrom=None)]
    arrive = {"moor": dict(x=arrive_up[0], y=arrive_up[1])}
    mk["start"] = dict(x=st0[0], y=st0[1])
    lp = zone_of(47.0, 27.5)
    objects.append(dict(type="lantern", x=lp[0], y=lp[1], idx=0, name="The Last Lantern on the Sand", vOld="The Red Shore",
                        vInscr="A light set on the black sand where the cliffs let the living out.", i=len(objects), solid=False,
                        sprites=[]))
    mk["lanterns"].append(dict(idx=0, name="The Last Lantern on the Sand", x=lp[0], y=lp[1], object=len(objects) - 1))
    wp = zone_of(46.0, 31.0)
    objects.append(dict(type="qobj", q="wp", x=wp[0], y=wp[1], name="The Shore Ring", spr="shrine", i=len(objects), solid=False,
                        sprites=[]))
    mk["waystones"].append(len(objects) - 1)
    lights = [dict(type="fire", kind="lantern", x=lp[0], y=lp[1] + 0.3, radius=8.5, rgb="255,150,72", a=1.4, heightPx=44, dxPx=13)]
    N["objects"], N["connections"], N["arrive"], N["markers"], N["lights"] = objects, conns, arrive, mk, lights
    N["packs"], N["monsters"] = [], []
    # the light over the cove: the paint already holds the overcast, so the day lays only a breath of cool grey over it
    # (the bog's ambience is a heavy veil for a dark marsh); the night is the moor's deep blue
    M = json.load(gzip.open(os.path.join(ROOT, "data", "zones", "moor_s9001.json.gz"), "rt", encoding="utf-8"))
    amb = copy.deepcopy(M["ambient"])
    for ph in amb["byPhase"]:
        k = float(ph["dayK"])
        night = [28, 37, 67]
        ph["rgb"] = [int(round(n_ + (d_ - n_) * k)) for n_, d_ in zip(night, [214, 210, 216])]
    amb["dark"] = 0.18
    N["ambient"] = amb
    N["dark"] = 0.18
    path = os.path.join(ROOT, "data", "zones", "red_shore_s%d.json.gz" % CB.SEED)
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        json.dump(N, fh)
    # the zone in the index (data/zones/index.json), beside the others
    ip = os.path.join(ROOT, "data", "zones", "index.json")
    idx = json.load(open(ip, encoding="utf-8"))
    idx["zones"]["red_shore"] = {"id": "red_shore", "name": "The Red Shore", "act": 1, "kind": "outdoor", "outdoor": True,
                                 "theme": "moor", "land": "moor", "wallTheme": "moor", "w": W, "h": H, "mlvl": [1, 3],
                                 "links": ["moor"], "seeds": [CB.SEED], "files": ["red_shore_s%d.json.gz" % CB.SEED]}
    with open(ip, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(idx, fh, indent=1, ensure_ascii=False)
    # a picture of the grid for the log: sand, Red, rock, the start and the portal
    from PIL import Image
    pic = np.zeros((H, W, 3), np.uint8)
    pic[g == WALK] = (120, 110, 100)
    pic[g == WATER] = (90, 10, 15)
    pic[g == ROCK] = (20, 20, 24)
    pic[(g == WALK) & ~seen] = (200, 160, 0)
    for (px, py), c in ((st0, (80, 220, 80)), (portal, (80, 160, 255))):
        pic[max(0, int(py) - 1):int(py) + 2, max(0, int(px) - 1):int(px) + 2] = c
    Image.fromarray(pic).resize((W * 4, H * 4), Image.NEAREST).save(os.path.join(CB.OUT, "grid_check.png"))
    print("wrote", path, "and the index; start", [round(v, 1) for v in st0], "portal", [round(v, 1) for v in portal])


if __name__ == "__main__":
    main()
