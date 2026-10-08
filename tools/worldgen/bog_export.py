"""The Sunken Bog from a seed, written in the game's own zone format (data/zones/sunken_bog_sSEED.json.gz), so the game
loads it with --zone=sunken_bog --zseed=SEED. The plan comes from bog.py (the Back, the causeways, the rib walks, the
chambers, the pit, the islands); this turns it into tiles:

- 1 tile = 1 yard (the game's grid). A tile is walkable when any of its four half-yard plan cells is land, so the
  narrow rib walks and causeways stay joined; deep water is the game's WATER (4), solid.
- grid codes: shelves MUD (13), the Back FLAGS (14), causeways ROAD (1), ribs FLAGS (14), the pit's throat ROCK (3);
  ground classes per tile from the same plan (fen texKeys).
- the zone's own furniture from the template export (sunken_bog_s1001): its ambient, theme, links; its monsters are
  moved onto this map's walkable ground in packs at the chambers and along the walks.
- portals to the Drowned Village and the Bog-Witch's Shack at the plan's two exits, each with a landing pad and an
  arrival two tiles in; lanterns at the huts and the pit, a waystone at the start, chests on the islands, shrines in the
  open marsh.

  python tools/worldgen/bog_export.py SEED [SEED ...]       writes data/zones/sunken_bog_sSEED.json.gz
"""
import os
import sys
import json
import gzip
import copy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
sys.path.insert(0, HERE)
import bog                                   # noqa: E402

TEMPLATE = os.path.join(ROOT, "data", "zones", "sunken_bog_s1001.json.gz")
BAKED = os.path.join(ROOT, "art", "zones")                                   # bog_bake.py's output, per seed
SOLID = {2, 3, 4, 5, 7, 8, 9, 10, 15}


def rle(a):
    a = np.asarray(a).ravel()
    out = []
    i = 0
    n = len(a)
    while i < n:
        j = i
        while j < n and a[j] == a[i]:
            j += 1
        out += [int(a[i]), j - i]
        i = j
    return out


def tiles(Z):
    """the plan's half-yard raster to whole-yard tiles: a tile is land if any of its cells is"""
    land = Z["land"]
    h2, w2 = land.shape
    W, H = bog.W_ZONE, bog.H_ZONE
    L = np.zeros((H, W), np.uint8)
    for dy in (0, 1):
        for dx in (0, 1):
            sub = land[dy:2 * H:2, dx:2 * W:2][:H, :W]
            L = np.maximum(L, sub)
    return L


def export(seed, out_dir=None):
    Z = bog.generate(seed)
    T = json.load(gzip.open(TEMPLATE, "rt", encoding="utf-8"))
    W, H = bog.W_ZONE, bog.H_ZONE
    L = tiles(Z)
    # landing pads at the exits (the plan's walks start a little in; the portal must stand on ground)
    exits = [n for n in Z["nodes"] if n["kind"] == "exit"]
    yy, xx = np.mgrid[0:H, 0:W]
    for e in exits:
        L[np.hypot(xx + 0.5 - e["p"][0], yy + 0.5 - e["p"][1]) < 3.2] = np.maximum(
            L[np.hypot(xx + 0.5 - e["p"][0], yy + 0.5 - e["p"][1]) < 3.2], 1)
    grid = np.full((H, W), 4, np.uint8)                                       # deep water
    grid[L == 1] = 13                                                         # shelves: mud
    grid[L == 2] = 14                                                         # the Back: flags
    grid[L == 3] = 1                                                          # causeways: road
    grid[L == 4] = 14                                                         # ribs: flags
    gcls = np.full((H, W), 7, np.uint8)                                       # texKey 7 water
    gcls[L == 1] = 4                                                          # mud
    gcls[L == 2] = 6                                                          # flags
    gcls[L == 3] = 5                                                          # road
    gcls[L == 4] = 6
    pit = [n for n in Z["nodes"] if n["kind"] == "pit"]
    for n in pit:                                                             # the throat: solid, the rings walkable
        d = np.hypot(xx + 0.5 - n["p"][0], yy + 0.5 - n["p"][1])
        grid[d < 8.0] = 14
        gcls[d < 8.0] = 6
        grid[d < 8.0 * 0.32] = 3
    # what stands on the land (bog_bake.py's block map, when the seed is baked): the hut, the ruins' walls, the pit's
    # stones and altar, stumps and posts are solid where they stand; a tile goes when its middle is under one, or
    # three of its corners
    bp = os.path.join(BAKED, "sunken_bog_s%d" % seed, "block.png")
    if os.path.exists(bp):
        from PIL import Image
        A = np.array(Image.open(bp))

        def under(B):
            mid = B[1:2 * H:2, 1:2 * W:2]
            corners = B[0:2 * H:2, 0:2 * W:2].astype(int) + B[0:2 * H:2, 2::2] + B[2::2, 0:2 * W:2] + B[2::2, 2::2]
            return mid, corners
        mid, corners = under(A > 200)
        stand = (mid | (corners >= 3)) & ~np.isin(grid, list(SOLID))
        grid[stand] = 2
        # and where the painted world is open water (an eye socket's pool, the pit's drowned side, the Back's crown
        # narrower than the plan's band), no one walks: the tile is water when its middle and three corners are
        mid, corners = under((A > 100) & (A < 200))
        wet = mid & (corners >= 3) & ~np.isin(grid, list(SOLID))
        grid[wet] = 4
        gcls[wet] = 7
    rng = np.random.default_rng(seed * 31 + 7)
    # EVERY PIECE OF LAND JOINED (the check found pieces cut off at the yard grid): tiny fragments go back under the
    # water; anything bigger is joined to the land the start stands on by a short board causeway, straight to the
    # nearest reached tile; repeated until one land remains
    from scipy import ndimage as nd
    e0 = exits[0]["p"]
    Z["joins"] = []                                                           # (from, to) in yards: the bake lays boards there
    for _ in range(40):
        walk = ~np.isin(grid, list(SOLID))
        lab, nl = nd.label(walk)                                             # 4-connected: the strict reading
        sx, sy = int(np.clip(e0[0], 0, W - 1)), int(np.clip(e0[1], 0, H - 1))
        cand = np.argwhere(lab > 0)
        k0 = cand[np.argmin((cand[:, 0] - sy) ** 2 + (cand[:, 1] - sx) ** 2)]
        main = lab == lab[k0[0], k0[1]]
        sizes = nd.sum(walk, lab, range(1, nl + 1))
        cut = [i + 1 for i in range(nl) if (i + 1) != lab[k0[0], k0[1]]]
        if not cut:
            break
        mpts = np.argwhere(main)
        for c in cut:
            m = lab == c
            if sizes[c - 1] < 15:
                grid[m] = 4
                gcls[m] = 7
                continue
            pts = np.argwhere(m)
            sub = pts[:: max(1, len(pts) // 60)]
            dmat = ((sub[:, None, :] - mpts[None, ::max(1, len(mpts) // 4000), :]) ** 2).sum(-1)
            i, j = np.unravel_index(np.argmin(dmat), dmat.shape)
            a_, b_ = sub[i], mpts[::max(1, len(mpts) // 4000)][j]
            n_ = int(max(abs(a_ - b_).max(), 1)) * 2
            Z["joins"].append(((a_[1] + 1.0, a_[0] + 1.0), (b_[1] + 1.0, b_[0] + 1.0)))
            for t in np.linspace(0, 1, n_ + 1):
                yx = np.round(a_ + (b_ - a_) * t).astype(int)
                for dy in (0, 1):
                    for dx in (0, 1):
                        yy_, xx_ = min(yx[0] + dy, H - 1), min(yx[1] + dx, W - 1)
                        if grid[yy_, xx_] == 4:
                            grid[yy_, xx_] = 1
                            gcls[yy_, xx_] = 5
    walk = ~np.isin(grid, list(SOLID))

    def nearest_walk(p, rmax=8):
        x0, y0 = int(p[0]), int(p[1])
        for r in range(0, rmax):
            cand = [(x0 + dx, y0 + dy) for dy in range(-r, r + 1) for dx in range(-r, r + 1)
                    if max(abs(dx), abs(dy)) == r and 0 <= x0 + dx < W and 0 <= y0 + dy < H and walk[y0 + dy, x0 + dx]]
            if cand:
                c = cand[int(rng.integers(0, len(cand)))]
                return (c[0] + 0.5, c[1] + 0.5)
        return None

    N = copy.deepcopy(T)
    N["seed"] = seed
    N["generator"] = "tools/worldgen/bog.py + bog_export.py (ours: the Long Back's maze)"
    N["grid"] = dict(T["grid"], w=W, h=H, cells=rle(grid))
    N["ground"] = dict(T["ground"], classes=rle(gcls))
    N["walls"] = dict(info=T["walls"]["info"], cells=[])
    for k in ("props", "decor", "landmarks", "landmarkFootprintRocks", "sprites", "zoneProps", "warnings"):
        N[k] = []
    N["scatter"] = dict(T["scatter"], items=[])
    # the zone's furniture
    objects, lights = [], []
    mk = dict(T["markers"])
    for k in ("lanterns", "waystones", "chests", "shrines", "altars", "statues", "npcs", "questObjects", "ruins", "channels89"):
        mk[k] = []
    links = [("drowned_village", "Back to the Drowned Village", "gate"), ("bogwitch_shack", "To the Bog-Witch's Shack", "cave")]
    conns, arrive = [], {}
    for e, (to, nm, spr) in zip(exits, links):
        px_, py_ = nearest_walk(e["p"])
        inward = np.array([W / 2, H / 2]) - np.array([px_, py_])
        inward = inward / np.linalg.norm(inward)
        a = nearest_walk(np.array([px_, py_]) + inward * 2.5)
        objects.append(dict(type="portal", x=px_, y=py_, to=to, name=nm, spr=spr, i=len(objects), solid=False, sprites=[]))
        conns.append(dict(to=to, toName=to, name=nm, x=px_, y=py_, spr=spr, object=len(objects) - 1, arriveHereFrom=None))
        arrive[to] = dict(x=a[0], y=a[1])
    mk["start"] = dict(arrive["drowned_village"])
    names = ["The Staked Light", "The Long Back's Lamp", "The Coil Light", "Lamp of the Drowned King", "The Boatman's Light"]
    lamp_at = [n for n in Z["nodes"] if n["kind"] in ("hut", "pit")] + [n for n in Z["nodes"] if n["kind"] == "nature"][:2]
    s0 = mk["start"]
    lamp_at = [dict(p=np.array([s0["x"] + 1.5, s0["y"] - 1.0]), kind="start")] + lamp_at
    for k, n in enumerate(lamp_at[:5]):
        p = nearest_walk(n["p"] + (np.array([0.0, 0.0]) if n["kind"] == "start" else np.array([0.0, n.get("r", 3) * 0.5])))
        if p is None:
            continue
        objects.append(dict(type="lantern", x=p[0], y=p[1], idx=k, name=names[k], vOld="Sunken Bog",
                            vInscr="A light on a pole of bone, set where the Long Back can be found again.", i=len(objects), solid=False, sprites=[]))
        mk["lanterns"].append(dict(idx=k, name=names[k], x=p[0], y=p[1], object=len(objects) - 1))
        lights.append(dict(type="fire", kind="lantern", x=p[0], y=p[1] + 0.3, radius=8.5, rgb="255,150,72", a=1.4, heightPx=44, dxPx=13))
    p = nearest_walk(np.array([s0["x"] + 2.5, s0["y"] + 1.0]))
    objects.append(dict(type="qobj", q="wp", x=p[0], y=p[1], name="Chalked Waystone", spr="shrine", i=len(objects), solid=False, sprites=[]))
    mk["waystones"].append(len(objects) - 1)
    for n in [n for n in Z["nodes"] if n["kind"].startswith("island")]:
        p = nearest_walk(n["p"])
        if p:
            objects.append(dict(type="chest", x=p[0], y=p[1], open=False, ilvl=10, i=len(objects), solid=False, sprites=[]))
            mk["chests"].append(len(objects) - 1)
    for n in [n for n in Z["nodes"] if n["kind"] in ("nature", "socket")][:3]:
        p = nearest_walk(n["p"])
        if p:
            objects.append(dict(type="shrine", x=p[0], y=p[1], used=False, kind=["stone", "wisp", "arcana"][len(mk["shrines"]) % 3],
                                i=len(objects), solid=False, sprites=[]))
            mk["shrines"].append(len(objects) - 1)
    # the living lights the bake leaves to the game (worldgen/bog_bake.py fx_of): the cold wisp-fire in each hut's pit,
    # pale and small; the pit's throat, its red glow from below (Derek's ruling: red light at the pit only)
    AX_ = np.array([1.0, 1.0]) / np.sqrt(2)
    PERP_ = np.array([1.0, -1.0]) / np.sqrt(2)
    for n in Z["nodes"]:
        if n["kind"] == "hut":
            q = np.array(n["p"], float) + AX_ * 2.6 + PERP_ * 0.6
            lights.append(dict(type="raw", x=round(float(q[0]), 2), y=round(float(q[1]), 2), radiusPx=70, rgb="150,185,235"))
        elif n["kind"] == "pit":
            lights.append(dict(type="raw", x=round(float(n["p"][0]), 2), y=round(float(n["p"][1]), 2), radiusPx=150, rgb="190,40,28"))
    N["objects"], N["connections"], N["arrive"], N["markers"], N["lights"] = objects, conns, arrive, mk, lights
    # monsters: the template's packs moved onto this map, at the chambers and along the walks (none near the start)
    spots = [n["p"] for n in Z["nodes"] if n["kind"] not in ("exit",)]
    for w_ in Z["walks"]:
        if len(w_["pts"]) > 40:
            spots.append(w_["pts"][len(w_["pts"]) // 2])
    spots = [sp for sp in spots if np.hypot(sp[0] - s0["x"], sp[1] - s0["y"]) > 18]
    packs, mons = [], []
    for k, pk in enumerate(T["packs"]):
        if not spots:
            break
        c = spots[k % len(spots)] + rng.normal(0, 1.5, 2)
        c = nearest_walk(c)
        if c is None:
            continue
        pk2 = dict(pk, x=c[0], y=c[1])
        packs.append(pk2)
        for m in [m for m in T["monsters"] if m["pack"] == pk["id"]]:
            q = nearest_walk(np.array(c) + rng.normal(0, 1.0, 2), 5)
            if q:
                mons.append(dict(m, x=round(q[0], 3), y=round(q[1], 3), i=len(mons)))
    N["packs"], N["monsters"] = packs, mons
    out_dir = out_dir or os.path.join(ROOT, "data", "zones")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "sunken_bog_s%d.json.gz" % seed)
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        json.dump(N, fh)
    return path, N, Z, grid


if __name__ == "__main__":
    for a in sys.argv[1:]:
        p, N, Z, g = export(int(a))
        print(p, "objects", len(N["objects"]), "monsters", len(N["monsters"]))
