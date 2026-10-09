"""Act I's forests from seed, our own way (docs/archive/REWORK_AND_SEEDS_PLAN.md, stage 3; Derek 2026-10-07: "dialing in asset
placement and creating the code that does it perfectly from seed is very important").

Not a port of the browser's generator (its saplings came in clumps and the game turned one in five into a stump: the
"stumps all grouped up and a lot of small trees"). Written from the ecosystem rules (tools/art_study/ecosystems/
old_growth_forest.md, LIVING_LANDSCAPES.md) and the forest feel (towering trees with their crowns out of frame, open
corridors, small trees mostly dead, no clumps, nothing repeating):

1. THE BONES: a zone keeps everything the game needs from its exported map (walls, ground, exits, arrivals, lanterns,
   chests, waystones, landmarks, monsters); only its forest is replaced.
2. THE WAYS FIRST: the cheapest walkable paths between every arrival, exit, lantern, chest, waystone and landmark,
   following the old roads where they run, kept clear and wide enough to fight on; clearings round the lanterns,
   landmarks, arrivals and monster packs.
3. PLACEMENT BY RULE, blue noise (each kind its own spacing, from each other and from the kinds already placed):
   giants far apart (their crowns tower out of frame), middle-aged between them, small trees mostly dead poles in the
   shade, snags among the giants, stumps only near the ways (woodcutters walked there) and never together, stones
   sparse, the dying (the god's eyes in the bark) a few per zone, as the lore keeps them.
4. VARIETY: every piece takes the variant least used within a screen's reach, so no two the same stand in one view.
5. THE NUMBERS: open area, spacing, the worst clump, repeats within a screen, every way still walkable.

  python tools/worldgen/forest.py ZONE SEED [OUT_DIR]     writes ZONE_sSEED.json.gz (the game's format), a map and the numbers
"""
import os
import sys
import json
import gzip
import heapq
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SET = "hollow_wood"
FOREST_KEYS = ("sp_oldgrowth_", "rk")                                 # the browser's forest sprites, replaced
SCREEN = 14.0                                                          # yards: no two of a variant this close

# kind: (role in the set, spacing from its own kind, spacing from bigger kinds, share of free ground per 100 sq yd)
RULES = [
    ("giant", "tree_giant", 8.0, 0.0, 1.0),
    ("dying", "tree_dying", 30.0, 8.0, 0.0),                           # placed by count, below
    ("middle", "tree_middle", 4.6, 5.0, 1.4),
    ("snag", "snag", 7.0, 3.5, 0.25),
    ("pole", "tree_young", 3.0, 2.6, 1.3),
    ("stump", "stump", 9.0, 2.5, 0.0),                                 # near the ways only, by count
    ("stone", "rock", 4.5, 1.6, 0.35),
]
RADIUS = {"giant": 1.3, "dying": 1.2, "middle": 0.75, "snag": 0.7, "pole": 0.25, "stump": 0.9, "stone": 0.4}


def rle(cells, n):
    out = np.empty(n, np.int32)
    i = 0
    for k in range(0, len(cells), 2):
        out[i:i + cells[k + 1]] = cells[k]
        i += cells[k + 1]
    return out


def load(zone, seed):
    p = os.path.join(ROOT, "data", "zones", "%s_s%d.json.gz" % (zone, seed))
    with gzip.open(p, "rt", encoding="utf-8") as fh:
        return json.load(fh)


def bones(Z):
    w, h = Z["grid"]["w"], Z["grid"]["h"]
    grid = rle(Z["grid"]["cells"], w * h).reshape(h, w)
    gcls = rle(Z["ground"]["classes"], w * h).reshape(h, w)
    tex = Z["ground"]["texKeys"]
    road = np.isin(gcls, [int(k) for k, v in tex.items() if v in ("road", "flags")])
    walk = grid == 0
    return w, h, grid, walk, road


def points_of_interest(Z):
    pts = []
    for v in Z.get("arrive", {}).values():
        pts.append((v["x"], v["y"], 2.5))
    for c in Z.get("connections", []):
        pts.append((c["x"], c["y"], 3.0))
    for o in Z.get("objects", []):
        pts.append((o["x"], o["y"], 3.5))
    for lm in Z.get("landmarks", []):
        pts.append((lm["cx"] + 0.5, lm["cy"] + 0.5, 4.5))
    for pk in Z.get("packs", []):
        pts.append((pk["x"], pk["y"], 3.0))
    return pts


def ways(walk, road, pts, rng):
    """the cheapest walkable paths between the points of interest (a tree joining them all), following the roads"""
    h, w = walk.shape
    cost = np.where(walk, np.where(road, 1.0, 2.2), np.inf) + rng.random((h, w)) * 0.3
    clear = np.zeros((h, w), bool)
    targets = [(int(np.clip(round(y), 0, h - 1)), int(np.clip(round(x), 0, w - 1))) for (x, y, r) in pts]
    targets = [t for t in targets if walk[t]]
    if not targets:
        return clear
    joined = {targets[0]}
    dist = np.full((h, w), np.inf)
    prev = -np.ones((h, w, 2), np.int32)
    pq = [(0.0, targets[0])]
    dist[targets[0]] = 0
    while pq:                                                          # one sweep from the first point
        d, (y, x) = heapq.heappop(pq)
        if d > dist[y, x]:
            continue
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and np.isfinite(cost[yy, xx]):
                nd_ = d + cost[yy, xx] * (1.414 if dx and dy else 1.0)
                if nd_ < dist[yy, xx]:
                    dist[yy, xx] = nd_
                    prev[yy, xx] = (y, x)
                    heapq.heappush(pq, (nd_, (yy, xx)))
    for t in targets[1:]:                                              # each point back along its path
        y, x = t
        guard = 0
        while (y, x) not in joined and prev[y, x][0] >= 0 and guard < w * h:
            clear[y, x] = True
            joined.add((y, x))
            y, x = prev[y, x]
            guard += 1
    from scipy import ndimage as nd
    clear = nd.binary_dilation(clear, iterations=2)                    # wide enough to fight on (about 5 yd)
    from scipy import ndimage as nd2
    return clear | (nd2.binary_erosion(road, iterations=1) & walk)              # the old roads' middles stay clear


def clearings(shape, pts):
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.zeros(shape, bool)
    for (x, y, r) in pts:
        m |= np.hypot(xx + 0.5 - x, yy + 0.5 - y) < r
    return m


def blue_noise(free, rng, count, spacing, placed, sep, cand_mask=None, weight=None, tries=30):
    """Poisson-disk placement: each new point at least `spacing` from its own kind and `sep[k]` from each placed kind"""
    h, w = free.shape
    ok = free if cand_mask is None else free & cand_mask
    cand = np.argwhere(ok)
    if len(cand) == 0 or count <= 0:
        return []
    out = []
    order = rng.permutation(len(cand))
    if weight is not None:
        wv = weight[cand[:, 0], cand[:, 1]] + 1e-3
        order = np.argsort(-(wv * rng.random(len(cand)) ** 0.5))
    for i in order:
        if len(out) >= count:
            break
        y, x = cand[i]
        px, py = x + rng.uniform(0.15, 0.85), y + rng.uniform(0.15, 0.85)
        good = True
        for (qx, qy) in out:
            if (qx - px) ** 2 + (qy - py) ** 2 < spacing * spacing:
                good = False
                break
        if good:
            for (kind, s_) in sep.items():
                for (qx, qy) in placed.get(kind, []):
                    if (qx - px) ** 2 + (qy - py) ** 2 < s_ * s_:
                        good = False
                        break
                if not good:
                    break
        if good:
            out.append((px, py))
    return out


def assign_variants(items, roles, rng):
    """each piece the variant of its role least used within SCREEN yards, ties broken by the seed"""
    used = []
    out = []
    for (kind, x, y) in items:
        names = roles.get(RULE_ROLE[kind], [])
        if not names:
            continue
        near = {}
        for (nm, ux, uy) in used:
            if (ux - x) ** 2 + (uy - y) ** 2 < SCREEN * SCREEN:
                near[nm] = near.get(nm, 0) + 1
        best = min(names, key=lambda nm: (near.get(nm, 0), rng.random()))
        used.append((best, x, y))
        out.append((kind, best, x, y))
    return out


RULE_ROLE = {k: r for (k, r, a, b, c) in RULES}


def _piece_list():
    import importlib.util
    spec = importlib.util.spec_from_file_location("bake_defs", os.path.join(ROOT, "tools", "landkit", "bake.py"))
    src = open(spec.origin, encoding="utf-8").read()
    a = src.index("def hollow_wood_pieces():")
    b = src.index("def build(out):")
    ns = {"np": np}
    exec(src[a:b], ns)
    return ns["hollow_wood_pieces"]()


def free_forest_tiles(Z):
    """the browser stood a solid tile under every forest sprite; with its forest gone, those tiles are open ground"""
    w, h = Z["grid"]["w"], Z["grid"]["h"]
    grid = rle(Z["grid"]["cells"], w * h).reshape(h, w)
    for s_ in Z["sprites"]:
        if str(s_.get("key", "")).startswith(FOREST_KEYS):
            tl = s_.get("tile", [int(s_["x"]), int(s_["y"])])
            if 0 <= tl[1] < h and 0 <= tl[0] < w and grid[tl[1], tl[0]] not in (5, 7):     # never a cliff or a wall
                grid[tl[1], tl[0]] = 0
    flat = grid.reshape(-1)
    cells = []
    i = 0
    while i < len(flat):
        j = i
        while j < len(flat) and flat[j] == flat[i]:
            j += 1
        cells += [int(flat[i]), j - i]
        i = j
    Z = dict(Z)
    Z["grid"] = dict(Z["grid"], cells=cells)
    return Z


CARRIED = ("bell", "skull", "candle", "ribs", "lantern")


def tenth_trunks(way, pts, chosen, rng, reach=4.0):
    """the hunters' count (the Hollow Wood's lore: "Count the trunks as you walk, because every tenth one has grown round
    something"): the trunks a walker passes, counted in the order the way reaches them from the zone's first point,
    and every tenth grown round a thing the god was carrying. Returns {index in chosen: what it holds}"""
    from scipy import ndimage as nd
    h, w = way.shape
    if not way.any() or not pts:
        return {}
    y0, x0 = int(np.clip(round(pts[0][1]), 0, h - 1)), int(np.clip(round(pts[0][0]), 0, w - 1))
    if not way[y0, x0]:                                                  # start at the way cell nearest the first point
        yy, xx = np.nonzero(way)
        k = int(np.argmin((yy - y0) ** 2 + (xx - x0) ** 2))
        y0, x0 = int(yy[k]), int(xx[k])
    along = np.full((h, w), np.inf)                                      # walked distance along the ways
    along[y0, x0] = 0
    q = [(0.0, y0, x0)]
    while q:
        d, y, x = heapq.heappop(q)
        if d > along[y, x]:
            continue
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and way[yy, xx]:
                nd_ = d + (1.414 if dx and dy else 1.0)
                if nd_ < along[yy, xx]:
                    along[yy, xx] = nd_
                    heapq.heappush(q, (nd_, yy, xx))
    dist, (iy, ix) = nd.distance_transform_edt(~np.isfinite(along), return_indices=True)
    passed = []
    for i, (kind, name, x, y) in enumerate(chosen):
        if kind not in ("giant", "middle"):                              # the trunks a walker counts (the dying already hold eyes)
            continue
        cy, cx = int(np.clip(y, 0, h - 1)), int(np.clip(x, 0, w - 1))
        if dist[cy, cx] <= reach:
            passed.append((float(along[iy[cy, cx], ix[cy, cx]]), i))
    passed.sort()
    out = {}
    start = int(rng.integers(0, 10))                                     # where the count began is the hunters' own
    for n, (_, i) in enumerate(passed):
        if (n + start) % 10 == 9:
            out[i] = CARRIED[int(rng.integers(0, len(CARRIED)))]
    return out


def generate(zone, seed, template_seed=1001):
    Z = free_forest_tiles(load(zone, template_seed))
    rng = np.random.default_rng(seed * 7919 + 13)
    w, h, grid, walk, road = bones(Z)
    pts = points_of_interest(Z)
    way = ways(walk, road, pts, rng)
    clr = clearings(walk.shape, pts)
    from scipy import ndimage as nd
    near_wall = nd.binary_dilation(~walk, iterations=1)
    free = walk & ~way & ~clr & ~near_wall
    near_way = nd.binary_dilation(way, iterations=7) & ~nd.binary_dilation(way, iterations=2)
    # the light: where giants stand thick it is dark; gaps are where they are not (computed as they are placed)
    placed = {}
    area = free.sum() / 100.0
    ip = os.path.join(ROOT, "art", "landkit", SET, "index.json")
    if os.path.exists(ip):
        with open(ip, encoding="utf-8") as fh:
            roles = json.load(fh)["roles"]
    else:                                                               # the set still baking: its names from its definition
        sys.path.insert(0, os.path.join(ROOT, "tools", "landkit"))
        roles = {}
        for nm, (role, spec) in _piece_list().items():
            roles.setdefault(role, []).append(nm)
    for (kind, role, own, sep_big, dens) in RULES:
        sep = {}
        for k2 in placed:
            sep[k2] = max(sep_big, RADIUS[k2] + RADIUS[kind] + 0.6)
        if kind == "dying":
            count = int(rng.integers(2, 5))                             # the god's eyes in the bark: a few, as the lore keeps them
            pts_ = blue_noise(free, rng, count, own, placed, sep)
        elif kind == "stump":
            count = int(rng.integers(5, 10))                            # the woodcutters' work, by the ways, never together
            pts_ = blue_noise(free, rng, count, own, placed, sep, cand_mask=near_way)
        elif kind == "pole":
            dark = np.zeros(free.shape)                                 # small trees die in the giants' shade
            for (gx, gy) in placed.get("giant", []):
                yy, xx = np.ogrid[0:h, 0:w]
                dark = np.maximum(dark, np.clip(1 - np.hypot(xx - gx, yy - gy) / 7.0, 0, 1))
            pts_ = blue_noise(free, rng, int(area * dens * 0.6), own, placed, sep, weight=dark)
        else:
            pts_ = blue_noise(free, rng, int(area * dens), own, placed, sep)
        placed[kind] = pts_
    items = [(k, x, y) for k, L in placed.items() for (x, y) in L]
    items.sort(key=lambda t: (t[1] + t[2], t[0]))
    chosen = assign_variants(items, roles, rng)
    # the new forest, in the game's sprite form; everything else of the zone kept
    keep = [s for s in Z["sprites"] if not str(s.get("key", "")).startswith(FOREST_KEYS)]
    carried = tenth_trunks(way, pts, chosen, rng)
    new = []
    for i, (kind, name, x, y) in enumerate(chosen):
        sp = dict(key="lk:" + name, set=SET, x=round(x, 3), y=round(y, 3), flip=bool(rng.random() < 0.5),
                  scale=1, d=round(x + y, 3), src="world", item=kind, tile=[int(x), int(y)])
        if i in carried:
            sp["carried"] = carried[i]                                   # the piece to come (passes/hollow_wood_seeded.md, brief 4)
        new.append(sp)
    Z2 = dict(Z)
    Z2["sprites"] = keep + new
    Z2["seed"] = seed
    Z2["generator"] = "tools/worldgen/forest.py (ours, from the ecosystem rules)"
    return Z, Z2, dict(walk=walk, way=way, clear=clr, free=free, placed=placed, chosen=chosen, w=w, h=h, grid=grid,
                       carried=carried)


def numbers(info):
    """the checks: open area, spacing, the worst clump, repeats within a screen, ways walkable"""
    walk, placed, chosen = info["walk"], info["placed"], info["chosen"]
    blocked = np.zeros(walk.shape, bool)
    h, w = walk.shape
    yy, xx = np.mgrid[0:h, 0:w]
    for k, L in placed.items():
        for (x, y) in L:
            r = RADIUS[k]
            y0, y1, x0, x1 = int(max(y - r - 1, 0)), int(min(y + r + 2, h)), int(max(x - r - 1, 0)), int(min(x + r + 2, w))
            blocked[y0:y1, x0:x1] |= np.hypot(xx[y0:y1, x0:x1] + 0.5 - x, yy[y0:y1, x0:x1] + 0.5 - y) < r
    open_area = float((walk & ~blocked).sum() / max(walk.sum(), 1))
    trees = [(x, y) for k in ("giant", "dying", "middle", "snag", "pole") for (x, y) in placed.get(k, [])]
    T = np.array(trees) if trees else np.zeros((0, 2))
    clump = 0
    nn = []
    for i in range(len(T)):
        d = np.hypot(T[:, 0] - T[i, 0], T[:, 1] - T[i, 1])
        clump = max(clump, int((d < 4.0).sum() - 1))
        d[i] = 1e9
        nn.append(float(d.min()) if len(T) > 1 else 0.0)
    rep = 0
    for i in range(len(chosen)):
        for j in range(i + 1, len(chosen)):
            if chosen[i][1] == chosen[j][1] and (chosen[i][2] - chosen[j][2]) ** 2 + (chosen[i][3] - chosen[j][3]) ** 2 < SCREEN ** 2:
                rep += 1
    stumps = placed.get("stump", [])
    st_nn = min((np.hypot(a[0] - b[0], a[1] - b[1]) for i, a in enumerate(stumps) for b in stumps[i + 1:]), default=0.0)
    counts = {k: len(v) for k, v in placed.items()}
    return dict(open_area=round(open_area, 3), counts=counts, tree_nearest_mean=round(float(np.mean(nn)) if nn else 0, 2),
                tree_nearest_min=round(float(np.min(nn)) if nn else 0, 2), worst_clump_within_4yd=clump,
                same_variant_within_a_screen=rep, stumps_nearest=round(float(st_nn), 2),
                ways_share=round(float(info["way"].sum() / max(walk.sum(), 1)), 3))


def old_numbers(Z):
    """the same checks on the browser's forest, for comparison"""
    sp = [s for s in Z["sprites"] if str(s.get("key", "")).startswith(FOREST_KEYS)]
    trees = np.array([(s["x"], s["y"]) for s in sp if "oldgrowth" in s["key"] and "stump" not in s["key"]] or [(0, 0)])
    clump = 0
    nn = []
    for i in range(len(trees)):
        d = np.hypot(trees[:, 0] - trees[i, 0], trees[:, 1] - trees[i, 1])
        clump = max(clump, int((d < 4.0).sum() - 1))
        d[i] = 1e9
        nn.append(float(d.min()))
    small = sum(1 for s in sp if "young" in s["key"] or "sapling" in s["key"])
    return dict(sprites=len(sp), small_trees=small, tree_nearest_mean=round(float(np.mean(nn)), 2), worst_clump_within_4yd=clump)


def draw_map(info, Z_old, out_png, title=""):
    """a map: walls dark, the ways pale, clearings faint, every piece a dot by kind and size; the old forest beside"""
    from PIL import Image, ImageDraw
    w, h = info["w"], info["h"]
    S = 5
    col = {"giant": (60, 140, 70), "dying": (200, 60, 60), "middle": (90, 170, 90), "snag": (150, 150, 150),
           "pole": (110, 110, 110), "stump": (190, 140, 80), "stone": (130, 130, 170)}

    def base():
        im = Image.new("RGB", (w * S, h * S), (34, 30, 28))
        a = np.zeros((h, w, 3), np.uint8)
        a[info["walk"]] = (58, 52, 46)
        a[info["clear"] & info["walk"]] = (72, 66, 58)
        a[info["way"]] = (110, 98, 78)
        a[~info["walk"]] = (16, 14, 14)
        return Image.fromarray(a).resize((w * S, h * S), Image.NEAREST)

    new = base()
    d = ImageDraw.Draw(new)
    for k, L in info["placed"].items():
        for (x, y) in L:
            r = max(RADIUS[k] * S, 1.5)
            d.ellipse((x * S - r, y * S - r, x * S + r, y * S + r), fill=col[k])
    for i, what in info.get("carried", {}).items():                    # the tenth trunks, ringed in gold
        kind, name, x, y = info["chosen"][i]
        r = RADIUS[kind] * S + 3
        d.ellipse((x * S - r, y * S - r, x * S + r, y * S + r), outline=(230, 190, 70), width=2)
    old = base()
    d2 = ImageDraw.Draw(old)
    for s in Z_old["sprites"]:
        k = str(s.get("key", ""))
        if not k.startswith(FOREST_KEYS):
            continue
        kind = "giant" if "ancient" in k or "mature" in k else "pole" if ("young" in k or "sapling" in k) else \
            "stump" if "stump" in k else "snag" if ("dead" in k or "snag" in k) else "stone" if k.startswith("rk") else "middle"
        r = max(RADIUS[kind] * S, 1.5)
        d2.ellipse((s["x"] * S - r, s["y"] * S - r, s["x"] * S + r, s["y"] * S + r), fill=col[kind])
    sheet = Image.new("RGB", (w * S * 2 + 20, h * S + 30), (12, 11, 12))
    sheet.paste(old, (0, 30))
    sheet.paste(new, (w * S + 20, 30))
    dd = ImageDraw.Draw(sheet)
    dd.text((8, 8), "the browser's forest (old)", fill=(220, 210, 190))
    dd.text((w * S + 28, 8), "ours, from the ecosystem rules  " + title, fill=(220, 210, 190))
    sheet.save(out_png)


if __name__ == "__main__":
    zone = sys.argv[1] if len(sys.argv) > 1 else "hollow_wood"
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, "tools", "worldgen", "out")
    os.makedirs(out, exist_ok=True)
    Z, Z2, info = generate(zone, seed)
    nums = numbers(info)
    nums_old = old_numbers(Z)
    with gzip.open(os.path.join(out, "%s_s%d.json.gz" % (zone, seed)), "wt", encoding="utf-8") as fh:
        json.dump(Z2, fh)
    draw_map(info, Z, os.path.join(out, "%s_s%d_map.png" % (zone, seed)), "seed %d" % seed)
    with open(os.path.join(out, "%s_s%d_numbers.json" % (zone, seed)), "w") as fh:
        json.dump(dict(new=nums, old=nums_old), fh, indent=1)
    print(json.dumps(dict(new=nums, old=nums_old), indent=1))
