"""The Sunken Bog from a seed: the Long Back coiled through the whole zone as a maze (Derek 2026-10-08: "imagine a zone
sized map and how this will loop and curve throughout it like a maze while the player looks for exits"; "like the
maggot lair in Diablo 2, tight fighting broken up by larger areas"; "the area will feel open while the path is
constrictive, so we don't want too many random objects poking out everywhere. It's all about balance").

1. THE ZONE: 164 x 152 yd (the Sunken Bog's size), black water everywhere the Back and the shelves are not. Two exits
   on its edges (toward the Drowned Village and the Bog-Witch's Shack); the arrival at the first.
2. THE CHAMBERS, the larger places (art_study/bog_chambers.py): blue noise, spaced so a walk between two is a real
   stretch of tight fighting. Kinds, weighted: raw nature most, then ruins, the straw hut, the eye socket; the serpent's
   skull ONCE, deep (the farthest chamber from the arrival), the Back running into it.
3. THE MAZE: the chambers and exits joined by a spanning tree (every place reachable), then a few extra edges so
   loops let the player choose, then short dead-end spurs (the maze's false leads) ending in a broken-off Back.
   No two walks cross. Each walk is the Back: a curve that twists (bends of their own sharpness, now and then a hairpin)
   and whose width pinches and swells along it (3 to 5 yd: tight, then room to fight).
4. THE BALANCE: few things stand in the water, each with room round it: a drowned tree, a tipped snag, a stump on its
   mound, a tendril post, a great single rib; none near a walk's edge, none within sight of another of its kind.

  python tools/worldgen/bog.py SEED [OUT_DIR]     writes bog_sSEED.json (the plan) and bog_sSEED_map.png
"""
import os
import sys
import json
import numpy as np

W_ZONE, H_ZONE = 164, 152
KINDS = [("nature", 0.34), ("ruins", 0.2), ("hut", 0.16), ("socket", 0.16), ("worms", 0.14)]


def blue_noise(rng, n, spacing, w, h, margin, avoid=()):
    pts = []
    for _ in range(4000):
        if len(pts) >= n:
            break
        p = np.array([rng.uniform(margin, w - margin), rng.uniform(margin, h - margin)])
        if all(np.hypot(*(p - q)) > spacing for q in pts) and all(np.hypot(*(p - q)) > spacing * 0.8 for q in avoid):
            pts.append(p)
    return pts


def segs_cross(a, b, c, d):
    def ccw(p, q, r):
        return (r[1] - p[1]) * (q[0] - p[0]) > (q[1] - p[1]) * (r[0] - p[0])
    return ccw(a, c, d) != ccw(b, c, d) and ccw(a, b, c) != ccw(a, b, d)


def walk(rng, a, b, ra, rb):
    """the Back from chamber a's edge to b's: twisting (sines of their own size, now and then a hairpin), its width
    pinching and swelling along it"""
    d = b - a
    L = np.hypot(*d)
    t_ = d / L
    n_ = np.array([-t_[1], t_[0]])
    a2, b2 = a + t_ * ra * 0.8, b - t_ * rb * 0.8
    L2 = np.hypot(*(b2 - a2))
    m = max(int(L2 / 0.5), 8)
    s = np.linspace(0, 1, m)
    off = np.zeros(m)
    for k in range(rng.integers(2, 5)):
        amp = rng.uniform(2.0, 6.5) * min(1.0, L2 / 30)
        off += amp * np.sin(np.pi * s * rng.integers(1, 4) + rng.uniform(0, 6.3)) * np.sin(np.pi * s)
    if rng.random() < 0.35 and L2 > 25:                                   # a hairpin: it doubles back on itself
        c0 = rng.uniform(0.3, 0.7)
        off += rng.choice([-1, 1]) * 7.0 * np.exp(-((s - c0) / 0.08) ** 2)
    pts = a2[None] + (b2 - a2)[None] * s[:, None] + n_[None] * off[:, None]
    width = 3.0 + 2.0 * np.clip(0.5 + 0.6 * np.sin(s * np.pi * rng.uniform(1.5, 3.5) + rng.uniform(0, 6.3)), 0, 1)
    return pts, width


def generate(seed):
    rng = np.random.default_rng(seed * 4241 + 17)
    exits = [np.array([2.0, rng.uniform(30, H_ZONE - 30)]), np.array([rng.uniform(30, W_ZONE - 30), 2.0])]
    n_ch = int(rng.integers(8, 12))
    chambers = blue_noise(rng, n_ch, 30.0, W_ZONE, H_ZONE, 14, avoid=exits)
    arrival = exits[0]
    far = int(np.argmax([np.hypot(*(c - arrival)) for c in chambers]))
    kinds = []
    for i in range(len(chambers)):
        if i == far:
            kinds.append("skull")
        else:
            cap = dict(hut=2, socket=2, ruins=3, worms=2)                   # the set pieces stay rare in a zone
            r = rng.random()
            acc = 0
            pick = "nature"
            for k, p in KINDS:
                acc += p
                if r <= acc:
                    pick = k
                    break
            if kinds.count(pick) >= cap.get(pick, 99):
                pick = "nature"
            kinds.append(pick)
    radii = [rng.uniform(7.5, 11.0) for _ in chambers]
    nodes = [dict(p=c, kind=k, r=r) for c, k, r in zip(chambers, kinds, radii)]
    nodes += [dict(p=e, kind="exit", r=2.0) for e in exits]
    N = len(nodes)
    D = np.array([[np.hypot(*(nodes[i]["p"] - nodes[j]["p"])) for j in range(N)] for i in range(N)])
    # a spanning tree (Prim), then extra edges for loops; no two edges cross
    edges = []

    def ok(i, j):
        for (a, b) in edges:
            if len({a, b, i, j}) == 4 and segs_cross(nodes[i]["p"], nodes[j]["p"], nodes[a]["p"], nodes[b]["p"]):
                return False
        return True
    inside = {0}
    while len(inside) < N:
        best = None
        for i in inside:
            for j in range(N):
                if j in inside or (nodes[i]["kind"] == "exit" and nodes[j]["kind"] == "exit"):
                    continue
                if ok(i, j) and (best is None or D[i, j] < best[0]):
                    best = (D[i, j], i, j)
        if best is None:
            break
        edges.append((best[1], best[2]))
        inside.add(best[2])
    cand = sorted([(D[i, j], i, j) for i in range(N) for j in range(i + 1, N)
                   if (i, j) not in edges and (j, i) not in edges and "exit" not in (nodes[i]["kind"], nodes[j]["kind"])])
    loops = 0
    for (dd, i, j) in cand:
        if loops >= max(2, N // 4) or dd > 60:
            continue
        if ok(i, j):
            edges.append((i, j))
            loops += 1
    walks = []
    n_tree = N - 1
    for ei, (i, j) in enumerate(edges):
        pts, wd = walk(rng, nodes[i]["p"], nodes[j]["p"], nodes[i]["r"], nodes[j]["r"])
        # the loops are the bog folk's board causeways, laid later between places the Back already joined (a second
        # kind of way: narrow, single file, its own look); the Back is the tree that joins everything
        kind = "causeway" if ei >= n_tree else "back"
        if kind == "causeway":
            wd = np.full(len(wd), 1.6)
        walks.append(dict(a=i, b=j, pts=pts, width=wd, spur=False, kind=kind))
    # dead-end spurs: the maze's false leads, the Back broken off in the water
    for i in range(N):
        if nodes[i]["kind"] == "exit" or rng.random() > 0.45:
            continue
        ang = rng.uniform(0, 2 * np.pi)
        end = nodes[i]["p"] + np.array([np.cos(ang), np.sin(ang)]) * rng.uniform(16, 26)
        if not (6 < end[0] < W_ZONE - 6 and 6 < end[1] < H_ZONE - 6):
            continue
        pts, wd = walk(rng, nodes[i]["p"], end, nodes[i]["r"], 0.0)
        r_ = rng.random()                                                  # the false leads: boards going nowhere, a great
        kind = "causeway" if r_ < 0.35 else ("rib" if r_ < 0.7 else "back")   # rib running out over the water, or the Back
        wd = np.full(len(wd), 1.6 if kind == "causeway" else 1.3) if kind != "back" else wd * np.linspace(1, 0.6, len(wd))
        walks.append(dict(a=i, b=-1, pts=pts, width=wd, spur=True, kind=kind))
    res = 0.5
    gw, gh = int(W_ZONE / res), int(H_ZONE / res)
    yy, xx = np.mgrid[0:gh, 0:gw] * res
    from scipy import ndimage as nd

    def raster():
        """the land: a grid at 0.5 yd; the Back and the shelves; the rest water"""
        land = np.zeros((gh, gw), np.uint8)                                 # 0 water, 1 shelf, 2 back, 3 boards, 4 rib
        for nd_ in nodes:
            if nd_["kind"] == "exit":
                continue
            c, r = nd_["p"], nd_["r"]
            ang = np.arctan2(yy - c[1], xx - c[0])
            rr = r * (1 + 0.18 * np.sin(ang * 3 + c[0]) + 0.1 * np.sin(ang * 5 + c[1]))
            land[np.hypot(xx - c[0], yy - c[1]) < rr] = 1
        for wk in walks:
            for p, w_ in zip(wk["pts"][::2], wk["width"][::2]):
                m = np.hypot(xx - p[0], yy - p[1]) < w_ / 2
                land[m] = {"causeway": 3, "rib": 4}.get(wk["kind"], 2)
        return land

    def board(a, b, rng_):
        """a causeway from a to b, twisting a little, 1.6 yd"""
        d_ = b - a
        L_ = np.hypot(*d_)
        n_ = np.array([-d_[1], d_[0]]) / max(L_, 1e-6)
        t_ = np.linspace(0, 1, max(int(L_ / 0.5), 8))
        off = np.sin(t_ * np.pi * rng_.uniform(1, 2.5) + rng_.uniform(0, 6)) * rng_.uniform(0.8, 2.2) * np.sin(np.pi * t_)
        pts_ = a[None] + d_[None] * t_[:, None] + n_[None] * off[:, None]
        return pts_, np.full(len(t_), 1.6)

    # THE PIT OF OFFERING (Derek): in the largest open water, the landmark ringed by a coil of the Back, joined to the maze
    land = raster()
    water = land == 0
    dist = nd.distance_transform_edt(water) * res
    margin = (xx > 16) & (xx < W_ZONE - 16) & (yy > 16) & (yy < H_ZONE - 16)
    dd = np.where(margin, dist, 0)
    k_ = int(np.argmax(dd))
    pit = None
    if dd.flat[k_] >= 11.0:
        pc = np.array([xx.flat[k_], yy.flat[k_]])
        a0 = rng.uniform(0, 2 * np.pi)
        a = np.linspace(a0, a0 + 2 * np.pi * 0.88, 700)
        rad = 10.3 - np.linspace(0, 0.9, len(a))
        coil = np.stack([pc[0] + np.cos(a) * rad, pc[1] + np.sin(a) * rad], 1)
        walks.append(dict(a=-2, b=-2, pts=coil, width=np.full(len(coil), 3.6), spur=False, kind="back"))
        # the coil joins the maze: a walk of the Back from the coil's open end to the nearest walk or chamber
        tail = coil[-1]
        best = None
        for wk in walks[:-1]:
            if wk["kind"] != "back":
                continue
            dd_ = np.hypot(*(wk["pts"] - tail).T)
            q = int(np.argmin(dd_))
            if best is None or dd_[q] < best[0]:
                best = (dd_[q], wk["pts"][q])
        if best is not None:
            pts_, wd_ = walk(rng, tail, best[1], 0.0, 0.0)
            walks.append(dict(a=-2, b=-1, pts=pts_, width=wd_, spur=False, kind="back"))
        nodes.append(dict(p=pc, kind="pit", r=8.4))
        pit = pc
    # ISLANDS (Derek: "board walks ... shooting off to islands of ruined huts or swampy pits"): a few humps out in the
    # water off the walks, each reached by its own board causeway; ruined huts and sucking mires in turn
    land = raster()
    water = land == 0
    dist = nd.distance_transform_edt(water) * res
    n_isl = int(rng.integers(3, 6))
    isl_k = 0
    for _ in range(600):
        if isl_k >= n_isl:
            break
        p_ = np.array([rng.uniform(10, W_ZONE - 10), rng.uniform(10, H_ZONE - 10)])
        gi, gj = int(p_[1] / res), int(p_[0] / res)
        if not water[gi, gj] or dist[gi, gj] < 5.5 or dist[gi, gj] > 14:
            continue
        if any(np.hypot(*(p_ - n["p"])) < n["r"] + 9 for n in nodes):
            continue
        best = None                                                         # the nearest walk, where the boards leave it
        for wk in walks:
            if wk["kind"] == "rib":
                continue
            dd_ = np.hypot(*(wk["pts"] - p_).T)
            q = int(np.argmin(dd_))
            if best is None or dd_[q] < best[0]:
                best = (dd_[q], wk["pts"][q])
        if best is None or best[0] > 18:
            continue
        kind = "island_hut" if isl_k % 2 == 0 else "island_mire"
        r_isl = rng.uniform(2.8, 3.6)
        start = best[1]
        end = p_ - (p_ - start) / np.linalg.norm(p_ - start) * (r_isl * 0.8)
        pts_, wd_ = board(start, end, rng)
        walks.append(dict(a=-3, b=len(nodes), pts=pts_, width=wd_, spur=True, kind="causeway"))
        nodes.append(dict(p=p_, kind=kind, r=r_isl))
        isl_k += 1
    land = raster()
    # the balance: few things in the water, each with room round it
    water = land == 0
    dist = nd.distance_transform_edt(water) * res
    props = []
    for kind, n, spacing in (("drowned_tree", 9, 22), ("snag", 6, 26), ("stump", 6, 26), ("tendril_post", 3, 40), ("giant_rib", 4, 34)):
        placed = 0
        for _ in range(3000):
            if placed >= n:
                break
            p = np.array([rng.uniform(4, W_ZONE - 4), rng.uniform(4, H_ZONE - 4)])
            gi, gj = int(p[1] / res), int(p[0] / res)
            if not water[gi, gj] or dist[gi, gj] < 3.0 or dist[gi, gj] > 9.0:
                continue                                                    # in the water, near the walks to be seen
            if any(np.hypot(*(p - q["p"])) < (spacing if q["kind"] == kind else 6.0) for q in props):
                continue
            props.append(dict(kind=kind, p=p))
            placed += 1
    return dict(seed=seed, nodes=nodes, walks=walks, land=land, res=res, props=props, edges=edges, loops=loops)


def numbers(Z):
    land, res = Z["land"], Z["res"]
    back = (land >= 2).sum() * res * res
    shelf = (land == 1).sum() * res * res
    total = land.size * res * res
    length = sum(np.hypot(*np.diff(w["pts"], axis=0).T).sum() for w in Z["walks"])
    widths = np.concatenate([w["width"] for w in Z["walks"]])
    return dict(chambers=sum(1 for n in Z["nodes"] if n["kind"] != "exit"), kinds=[n["kind"] for n in Z["nodes"]],
                walks=len([w for w in Z["walks"] if not w["spur"]]),
                causeways=len([w for w in Z["walks"] if w["kind"] == "causeway"]),
                ribs=len([w for w in Z["walks"] if w["kind"] == "rib"]), loops=Z["loops"], spurs=len([w for w in Z["walks"] if w["spur"]]),
                back_length_yd=round(float(length)), tight_share=round(float((widths < 3.8).mean()), 2),
                walkable_share=round(float((back + shelf) / total), 3), props=len(Z["props"]))


def draw_map(Z, out):
    from PIL import Image, ImageDraw
    land = Z["land"]
    S = 4
    col = np.zeros(land.shape + (3,), np.uint8)
    col[land == 0] = (10, 13, 17)
    col[land == 1] = (58, 54, 36)
    col[land == 2] = (150, 136, 108)
    col[land == 3] = (110, 82, 52)
    col[land == 4] = (205, 196, 170)
    im = Image.fromarray(col).resize((land.shape[1] * S // 1, land.shape[0] * S // 1), Image.NEAREST)
    d = ImageDraw.Draw(im)
    k = S / Z["res"]
    cc = dict(nature=(110, 140, 70), ruins=(150, 160, 150), hut=(190, 150, 80), socket=(200, 200, 190), skull=(230, 220, 190),
              exit=(220, 80, 60), pit=(200, 40, 40), island_hut=(190, 150, 80), island_mire=(120, 100, 80), worms=(170, 60, 60))
    for n in Z["nodes"]:
        x, y = n["p"] * k
        d.ellipse((x - 9, y - 9, x + 9, y + 9), outline=cc[n["kind"]], width=3)
        d.text((x + 12, y - 6), n["kind"], fill=cc[n["kind"]])
    pc = dict(drowned_tree=(120, 120, 120), snag=(110, 90, 70), stump=(140, 110, 60), tendril_post=(180, 60, 120), giant_rib=(220, 210, 180))
    for p in Z["props"]:
        x, y = p["p"] * k
        d.rectangle((x - 3, y - 3, x + 3, y + 3), fill=pc[p["kind"]])
    im.save(out)


if __name__ == "__main__":
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
    os.makedirs(out, exist_ok=True)
    Z = generate(seed)
    nums = numbers(Z)
    draw_map(Z, os.path.join(out, "bog_s%d_map.png" % seed))
    plan = dict(seed=seed, numbers=nums,
                nodes=[dict(kind=n["kind"], x=round(float(n["p"][0]), 2), y=round(float(n["p"][1]), 2), r=round(float(n["r"]), 2)) for n in Z["nodes"]],
                walks=[dict(a=w["a"], b=w["b"], spur=w["spur"], kind=w["kind"], pts=np.round(w["pts"][::4], 2).tolist(), width=np.round(w["width"][::4], 2).tolist()) for w in Z["walks"]],
                props=[dict(kind=p["kind"], x=round(float(p["p"][0]), 2), y=round(float(p["p"][1]), 2)) for p in Z["props"]])
    with open(os.path.join(out, "bog_s%d.json" % seed), "w") as fh:
        json.dump(plan, fh)
    print(json.dumps(nums))
