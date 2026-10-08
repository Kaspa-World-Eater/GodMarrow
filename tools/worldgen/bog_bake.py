"""Bake a generated Sunken Bog for the game: the whole zone (worldgen/bog.py, exported by bog_export.py) painted through
the bog scene's engine (art_study/bog_scene.py, bog_chambers.py) at the game's camera, chunk by chunk, into
art/zones/sunken_bog_s<SEED>/ for world/bog_ground.gd:

  c<A>_<B>.webp     the ground: every pixel of the render at the engine's scale (the game draws it at 4, nearest);
                    alpha 255 land, 254 open water (the game moves it), 0 past the zone's edge
  c<A>_<B>_up.webp  what stands up off the ground (the hut, the stones, the racks, the drowned trunks, the reeds, the
                    loose bone): its pixels cut into bands by their depth in the world, stacked into one atlas, so each
                    band sorts with the hero and the creatures (the ground image keeps them too, under it all)
  index.json        the chunks, their bands, and the living things the game draws itself (the wisp-fire in the hut's
                    pit, the pit's red throat)

Each chunk is the centre of a larger frame (the margin keeps every blur and every reflection whole), and nothing in the
paint hangs on the frame: plants and loose bone are placed per world cell, every walk keeps its own seed, the study
frame's shelf is off. So the chunks meet without a seam.

  python tools/worldgen/bog_bake.py SEED [JOBS=6] [ONLY=a,b;a,b]
"""
import os
import sys
import json
import time
import tempfile
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "art_study"))
sys.path.insert(0, os.path.join(HERE, "..", "landkit"))

KX, KY, KZ = 18.0, 9.0, 21.0                 # engine px per yard (art_study/wood_scene.py); the game is 4 times this
SCALE = 4
CW, CH = 320, 176                            # a chunk, engine px (1280 x 704 in the game)
MX, MY = 80, 48                              # its margin each side in the frame painted
GW, GH = CW + 2 * MX, CH + 2 * MY
OFF = np.array([200.0, 200.0])               # the zone in the engine's world (as worldgen/bog_preview.py)
HZ0, HK = -0.5, 0.01                         # the height map's byte: z = v * HK + HZ0 yards
BAND = 0.5                                   # yards of depth (x + y) per sorted band of the tall layer
OUT_ROOT = os.path.join(ROOT, "art", "zones")
# the pieces that stand up off what is walked (their part codes in bog_scene's W["bog_st"]): the bog structures' stump,
# heart, log, root plate and post; the hut's wall, ring, stack, hull, its trellis posts and door; the ruins' walls; the
# pit's altar and standing stones. Floors (the hut's hollow, the ruins' old floor, the pit's rings, the boards) are not.
TALL = (30, 31, 33, 34, 35, 40, 42, 44, 45, 46, 47, 55, 84, 85)


def grid_of(w, h):
    """the chunk grid over the zone's screen: engine px, the zone's (0, 0) corner at the origin"""
    x0 = int(np.floor(-h * KX / 16.0)) * 16
    y0 = -128                                                                # room above for what stands on the far edge
    nx = int(np.ceil((w * KX - x0) / CW))
    ny = int(np.ceil(((w + h) * KY - y0) / CH))
    keep = []
    for b in range(ny):
        for a in range(nx):
            ex = x0 + a * CW + np.linspace(0, CW, 9)
            ey = y0 + b * CH + np.linspace(0, CH + 6.0 * KZ, 13)             # a thing south of it may stand up into it
            u, v = np.meshgrid(ex / KX, ey / KY)
            x, y = (u + v) / 2, (v - u) / 2
            if ((x > -3) & (x < w + 3) & (y > -3) & (y < h + 3)).any():
                keep.append((a, b))
    return x0, y0, nx, ny, keep


def _setup(Z, joins, focus):
    """the scene for one frame: every walk, piece and prop that can reach it, with the switches for the bake"""
    import bog_scene as bs
    import bog_chambers as bc
    import wood_scene as ws
    c = np.array(focus, float)
    ws.GW, ws.GH = GW, GH
    ws._CACHE.clear()
    ws.FOCUS = c.copy()
    bc.C = c
    bs.C = c
    bs.FRAME_SHELF = False
    bs.PLACE_CELL = 4.0
    import fen_ground
    fen_ground.CELL = 4.0                                                    # the bed's tussocks too
    import serpent_spine
    serpent_spine.WHOLE_LINE = True                                          # the vertebrae counted from each walk's start
    bs.THIN_NEAR = False
    ws.AIR = (16.0, 0.0)                                                     # the game lays its own night over the ground
    ws.MOONLIT = None                                                        # no cloud frozen on it
    ws.SNAP_GRID = True                                                      # every chunk on the one world lattice
    ws.HERO = c + np.array([400.0, 400.0])                                   # no lantern in the bake: the game's own lights it
    inside = lambda p, r: abs(p[0] + OFF[0] - c[0]) < 15 + r and abs(p[1] + OFF[1] - c[1]) < 15 + r
    # every walk within reach of the frame: the lee of the Back (where the duckweed drifts), the stems kept off it and
    # the loose bone all read the distance to the nearest walk, so a walk just past the edge must still be counted
    walks = [(i, w_) for i, w_ in enumerate(Z["walks"]) if any(inside(p, 8) for p in w_["pts"][::3])]
    backs = [(i, w_) for i, w_ in walks if w_["kind"] == "back"]
    cws = [(i, w_) for i, w_ in walks if w_["kind"] == "causeway"]
    ribs = [(i, w_) for i, w_ in walks if w_["kind"] == "rib"]
    bs.LINES = [w_["pts"] + OFF for _, w_ in backs]
    bs.LINE_SEEDS = [i for i, _ in backs]
    jl = [(1000 + k, np.array(j_)) for k, j_ in enumerate(joins) if inside(j_[0], 4) or inside(j_[1], 4)]
    bs.CAUSEWAYS[:] = [w_["pts"] + OFF for _, w_ in cws] + [np.linspace(j_[0], j_[1], 40) + OFF for _, j_ in jl]
    bs.CAUSEWAY_SEEDS = [i for i, _ in cws] + [k for k, _ in jl]
    bs.RIBWALKS[:] = [w_["pts"] + OFF for _, w_ in ribs]
    bs.RIB_SEEDS = [i for i, _ in ribs]
    if not bs.LINES:                     # no walk near: one far out of the world, never the last frame's (a worker
        bs.LINES = [np.linspace([-900.0, -900.0], [-880.0, -900.0], 40)]   # paints many chunks; a stale LINE is a ghost)
        bs.LINE_SEEDS = [999]
    bs.LINE = bs.LINES[0]
    mods, stamps, paints, living, fx = [], [], [], [], []
    for n in Z["nodes"]:
        if not inside(n["p"], n.get("r", 3.0) + 9.0):
            continue
        p = n["p"] + OFF
        if n["kind"] == "exit":                                              # the portal's landing: a little firm ground
            mods.append(bc.shelf(p[0], p[1], 3.4, rise=0.16, seed=int(p[0]) % 97))
            continue
        if n["kind"] != "pit":
            mods.append(bc.shelf(p[0], p[1], n["r"], rise=0.16, seed=int(p[0]) % 97))
        if n["kind"] == "hut":
            pit = p + bs.AX * 2.6 + bs.PERP * 0.6
            stamps.append(bc.straw_hut(p[0], p[1], pit_at=pit))
            paints.append(bc.hut_paint)
            living.append(bc.fire_trellis(pit[0], pit[1]))
        elif n["kind"] == "socket":
            stamps.append(bc.eye_socket(p[0], p[1]))
            paints.append(bc.socket_paint)
            living.append(bc.socket_eye)
        elif n["kind"] == "skull":
            stamps.append(bc.serpent_skull(p[0], p[1], 0.0))
            paints.append(bc.skull_paint)
        elif n["kind"] == "ruins":
            stamps.append(bc.ruins(p[0], p[1], 0.75))
            paints.append(bc.ruins_paint)
        elif n["kind"] == "worms":
            stamps.append(bc.worm_ground(p[0], p[1], seed=int(p[0]) % 97))
            paints.append(bc.worm_paint)
        elif n["kind"] == "pit":
            stamps.append(bc.sacrifice_pit(p[0], p[1], seed=int(p[1]) % 97))
            paints.append(bc.pit_paint)
            living += [bc.pit_tendrils, bc.pit_racks]
        elif n["kind"] == "island_hut":
            stamps.append(bc.straw_hut(p[0], p[1], R=1.6, pit_at=p + bs.AX * 1.8, seed=int(p[0]) % 7 + 7, ruined=True))
            paints.append(bc.hut_paint)
        elif n["kind"] == "island_mire":
            stamps.append(bc.mire_pit(p[0], p[1], seed=int(p[1]) % 97))
            paints.append(bc.mire_paint)
            living.append(bc.mire_things)
    bs.BED_MODS[:] = [raster_shelf(Z)] + mods
    bs.EXTRA_STAMPS[:] = stamps
    bs.EXTRA_PAINT[:] = paints
    structs, trees, ribs_ = [], [], []
    for q in Z["props"]:
        if not inside(q["p"], 1.0):
            continue
        p = q["p"] + OFF
        if q["kind"] == "drowned_tree":
            trees.append((p, 0.38, 5.5, int(p[0] * 7) % 997))
        elif q["kind"] == "snag":
            structs.append(("snag", p[0], p[1], float(p[1] % 6.28), 6.0, 0.34, int(p[0] * 3) % 997))
        elif q["kind"] == "stump":
            structs.append(("stump", p[0], p[1], 0.5, int(p[1] * 5) % 997))
        elif q["kind"] == "tendril_post":
            structs.append(("post", p[0], p[1], 0.22, 1.8, int(p[0] + p[1]) % 997))
            living.append(bc.tendrils_round_post(p[0], p[1], 1.8, int(p[0]) % 97))
        elif q["kind"] == "giant_rib":
            ribs_.append((p, float(p[0] % 6.28), 5.5, 0.0, int(p[1]) % 97))
    bs.STRUCTS[:] = structs
    bs.DROWNED_TREES = trees
    bs.DROWNED_WALLS = []
    bs.GIANT_RIBS = ribs_
    bs.EXTRA_LIVING[:] = living
    ws.LIVING[:] = [bs.mirror, bs.giant_rib_mirror, bs.plants, bs.bone_litter, bs.giant_ribs, bs.struct_living]
    return bs, ws


_SHELF = {}


def raster_shelf(Z):
    """the map's own shelves (worldgen/bog.py's land raster, code 1, the same cells bog_export.py walks on): the peat
    rises just out of the water wherever the plan says shelf, its edge where the plan's edge is, so what is painted
    as ground is what can be walked"""
    from scipy import ndimage as nd
    from scipy.ndimage import map_coordinates
    from kit import fbm
    key = id(Z)
    if key not in _SHELF:
        _SHELF.clear()
        _SHELF[key] = nd.gaussian_filter((Z["land"] == 1).astype(float), 1.0)
    m = _SHELF[key]

    def mod(X, Y, bed):
        import bog_scene as bs
        k = map_coordinates(m, ((Y - OFF[1]) / 0.5 - 0.5, (X - OFF[0]) / 0.5 - 0.5), order=1, mode="constant", cval=0.0)
        rise = np.clip((k - 0.36) / 0.2, 0, 1)
        top = bs.LEVEL - 0.08 + rise * 0.22 + (fbm(X * 0.6 + 9, Y * 0.6) - 0.5) * 0.08
        return np.where(rise > 0, np.maximum(bed, top), bed)
    return mod


def fx_of(Z):
    """what the game draws alive itself, in zone yards"""
    import bog_scene as bs
    out = []
    for n in Z["nodes"]:
        p = np.array(n["p"], float)
        if n["kind"] == "hut":
            q = p + bs.AX * 2.6 + bs.PERP * 0.6
            out.append(dict(kind="wisp_fire", x=round(float(q[0]), 2), y=round(float(q[1]), 2)))
        elif n["kind"] == "pit":
            out.append(dict(kind="pit_throat", x=round(float(p[0]), 2), y=round(float(p[1]), 2), r=2.6))
    return out


def chunk(seed, a, b, x0, y0, Z, joins, out_dir, w, h):
    """paint one chunk and write its ground and its sorted tall layer"""
    import bog_plants
    import bone as bonegen
    from scipy import ndimage as nd
    ex = x0 + a * CW + CW / 2.0                                              # its centre, engine px from the zone's corner
    ey = y0 + b * CH + CH / 2.0
    fx = (ex / KX + ey / KY) / 2.0 + OFF[0]
    fy = (ey / KY - ex / KX) / 2.0 + OFF[1]
    bs, ws = _setup(Z, joins, (fx, fy))
    # what every stroke drew, and how deep in the world: the tall layer sorts by it
    SD = np.full((GH, GW), -1e9)
    put0, draw0 = bog_plants._put, bonegen.draw

    def put(img, zb, dep, ix, iy, d, col, tol=0.3):
        before = zb[iy, ix] if (0 <= iy < GH and 0 <= ix < GW) else None
        put0(img, zb, dep, ix, iy, d, col, tol)
        if before is not None and zb[iy, ix] != before and zb.shape == SD.shape:
            SD[iy, ix] = max(SD[iy, ix], zb[iy, ix])

    def draw(img, zb, dep_scene, to_px, shapes, *ar, **kw):
        before = zb.copy()
        r = draw0(img, zb, dep_scene, to_px, shapes, *ar, **kw)
        ch = zb != before
        SD[ch] = np.maximum(SD[ch], zb[ch])
        return r
    bog_plants._put, bonegen.draw = put, draw
    try:
        wd = ws.Wood()
        for f in ws.WOOD_HOOKS:
            f(wd)
        W = ws.build(wd)
        for f in ws.BUILD_HOOKS:
            f(W, wd)
        px, py, pz, SX, SY = ws.cast(W)
        L = ws.shade(W, px, py, pz, SX, SY)
        img = ws.paint(W, px, py, pz, SX, SY, L)
        img = ws.living(img, wd, W, px, py, pz, L)
    finally:
        bog_plants._put, bonegen.draw = put0, draw0
    # the floor under each point: the ground with every narrow thing taken off it (an opening two yards wide)
    k = int(round(2.0 / ws.RES))
    floor = nd.grey_dilation(nd.grey_erosion(W["H"], size=(k, k)), size=(k, k))
    zf = nd.gaussian_filter(np.maximum(floor, bs.LEVEL), 0.4 / ws.RES)        # what a body stands on: the game lifts it so
    hz = pz - ws.look(W, floor, px, py)
    st = ws.look(W, W["bog_st"], px, py)
    tall = np.isin(st, TALL) | ((hz > 0.45) & ~ws.look(W, W["bog_water"], px, py)) | (L["tg"] >= 800)
    stroke = SD > -1e8
    upper = tall | stroke
    depth = np.where(stroke, SD, px + py) - OFF.sum()
    # the order the game sorts by: a body's depth less its lift (world/bog_ground.gd, core/iso.gd: lifted onto the
    # floor, KZ / KY screen rows per yard of height), so a band and a body on the same floor sort as their depths
    sortk = depth - (KZ / KY) * ws.look(W, zf, px, py)
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0) & ~stroke
    zx, zy = px - OFF[0], py - OFF[1]
    outside = (zx < -2.5) | (zy < -2.5) | (zx > w + 2.5) | (zy > h + 2.5)
    sl = (slice(MY, MY + CH), slice(MX, MX + CW))
    rgb = np.clip(img[sl], 0, 1)
    alpha = np.where(outside[sl], 0, np.where(water[sl], 254, 255)).astype(np.uint8)
    name = "c%d_%d" % (a, b)
    os.makedirs(out_dir, exist_ok=True)
    Image.fromarray(np.dstack([(rgb * 255).astype(np.uint8), alpha]), "RGBA").save(
        os.path.join(out_dir, name + ".webp"), lossless=True, method=6)
    # the tall layer: one band per half yard of depth, each cropped to its own box, stacked
    up = upper[sl] & ~outside[sl]
    dep = sortk[sl]
    bands = []
    if up.any():
        kb = np.floor(dep / BAND).astype(int)
        parts, hy = [], 0
        for kk in np.unique(kb[up]):
            m = up & (kb == kk)
            ys, xs = np.nonzero(m)
            if len(ys) < 3:
                continue
            r0, r1, c0, c1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            tile = np.zeros((r1 - r0, CW, 4), np.uint8)
            tile[:, c0:c1, :3] = (rgb[r0:r1, c0:c1] * 255).astype(np.uint8)
            tile[:, c0:c1, 3] = m[r0:r1, c0:c1] * 255
            parts.append(tile[:, c0:c1])
            bands.append(dict(d=round((kk + 0.5) * BAND, 2), x=int(c0), y=int(r0), w=int(c1 - c0), h=int(r1 - r0), ay=int(hy)))
            hy += r1 - r0
        if parts:
            wmax = max(p_.shape[1] for p_ in parts)
            atlas = np.zeros((hy, wmax, 4), np.uint8)
            for p_, bd in zip(parts, bands):
                atlas[bd["ay"]:bd["ay"] + bd["h"], :bd["w"]] = p_
            Image.fromarray(atlas, "RGBA").save(os.path.join(out_dir, name + "_up.webp"), lossless=True, method=6)
    # the floor's height on the half-yard lattice, where this chunk shows it
    gx, gy = np.meshgrid(np.arange(0, 2 * w + 1), np.arange(0, 2 * h + 1))
    zx_, zy_ = gx * 0.5, gy * 0.5
    sx_, sy_ = (zx_ - zy_) * KX, (zx_ + zy_) * KY
    ex0, ey0 = x0 + a * CW, y0 + b * CH
    mine = (sx_ >= ex0) & (sx_ < ex0 + CW) & (sy_ >= ey0) & (sy_ < ey0 + CH)
    hz_ = ws.look(W, zf, zx_[mine] + OFF[0], zy_[mine] + OFF[1])
    # and what no one walks through there: a standing piece's foot (the hut, a wall, a stone, a stump, a post)
    st_ = ws.look(W, W["bog_st"], zx_[mine] + OFF[0], zy_[mine] + OFF[1])
    hh_ = ws.look(W, W["H"], zx_[mine] + OFF[0], zy_[mine] + OFF[1])
    bl_ = np.isin(st_, TALL) & (hh_ > bs.LEVEL + 0.25)
    wt_ = ws.look(W, W["bog_water"], zx_[mine] + OFF[0], zy_[mine] + OFF[1]).astype(bool)   # painted as open water
    return dict(a=a, b=b, file=name + ".webp", up=(name + "_up.webp") if bands else "", bands=bands,
                pos=[SCALE * (x0 + a * CW) - SCALE / 2.0, SCALE * (y0 + b * CH) - SCALE / 2.0],
                _h=(gx[mine].astype(np.int16), gy[mine].astype(np.int16), hz_.astype(np.float32), bl_, wt_))


def _job(args):
    seed, a, b, x0, y0, out_dir, Z = args
    import bog
    t0 = time.time()
    r = chunk(seed, a, b, x0, y0, Z, Z.get("joins", []), out_dir, bog.W_ZONE, bog.H_ZONE)
    r["secs"] = round(time.time() - t0, 1)
    return r


def bake(seed, jobs=6, only=None):
    import bog
    import bog_export
    from multiprocessing import Pool
    out_dir = os.path.join(OUT_ROOT, "sunken_bog_s%d" % seed)
    os.makedirs(out_dir, exist_ok=True)
    _, _, Z, grid = bog_export.export(seed, tempfile.mkdtemp())
    w, h = bog.W_ZONE, bog.H_ZONE
    x0, y0, nx, ny, keep = grid_of(w, h)
    if only:
        keep = [k_ for k_ in keep if k_ in only]
    print("seed", seed, "chunks", len(keep), "of", nx * ny, flush=True)
    t0 = time.time()
    rows = []
    with Pool(jobs) as pool:
        for r in pool.imap_unordered(_job, [(seed, a, b, x0, y0, out_dir, Z) for a, b in keep]):
            rows.append(r)
            print("  c%d_%d %ss  bands %d  (%d/%d, %.0fs)" % (r["a"], r["b"], r["secs"], len(r["bands"]), len(rows), len(keep), time.time() - t0), flush=True)
    rows.sort(key=lambda r: (r["b"], r["a"]))
    # the floor heights, one byte a half yard: z = v * K + Z0 yards (the game lifts what stands there by it)
    hp = os.path.join(out_dir, "height.png")
    hg = np.array(Image.open(hp)) if (only and os.path.exists(hp)) else np.full((2 * h + 1, 2 * w + 1), int(-HZ0 / HK), np.uint8)
    bp = os.path.join(out_dir, "block.png")
    bg = np.array(Image.open(bp)) if (only and os.path.exists(bp)) else np.zeros((2 * h + 1, 2 * w + 1), np.uint8)
    for r in rows:
        gx_, gy_, z_, b_, w_ = r.pop("_h")
        hg[gy_, gx_] = np.clip(np.round((z_ - HZ0) / HK), 0, 255).astype(np.uint8)
        bg[gy_, gx_] = np.where(b_, 255, np.where(w_, 128, 0))
    Image.fromarray(hg, "L").save(hp)
    Image.fromarray(bg, "L").save(bp)                  # bog_export.py: 255 a standing piece (solid), 128 painted water
    # the block map can cut a shelf in two, and the exporter then joins the halves by boards: lay those boards too
    if not only:
        _, _, Z2, _ = bog_export.export(seed, tempfile.mkdtemp())
        j1 = [tuple(map(tuple, j_)) for j_ in Z.get("joins", [])]
        j2 = [tuple(map(tuple, j_)) for j_ in Z2.get("joins", [])]
        moved = [j_ for j_ in j1 if j_ not in j2] + [j_ for j_ in j2 if j_ not in j1]
        if moved:
            redo = set()
            for (pa, pb) in moved:
                for t in np.linspace(0, 1, 12):
                    x, y = np.array(pa) + (np.array(pb) - np.array(pa)) * t
                    for dx in (-6, 0, 6):
                        for dy in (-6, 0, 6):
                            ex, ey = (x + dx - y - dy) * KX, (x + dx + y + dy) * KY
                            redo.add((int((ex - x0) // CW), int((ey - y0) // CH)))
            redo = [k_ for k_ in keep if k_ in redo]
            print("joins moved", moved, "-> rebaking", len(redo), "chunks", flush=True)
            with Pool(jobs) as pool:
                for r in pool.imap_unordered(_job, [(seed, a, b, x0, y0, out_dir, Z2) for a, b in redo]):
                    r.pop("secs", None)
                    r.pop("_h", None)
                    rows = [q for q in rows if (q["a"], q["b"]) != (r["a"], r["b"])] + [r]
            Z = Z2
    path = os.path.join(out_dir, "index.json")
    old = {}
    if only and os.path.exists(path):
        old = {(c["a"], c["b"]): c for c in json.load(open(path))["chunks"]}
    for r in rows:
        r.pop("secs", None)
        old[(r["a"], r["b"])] = r
    idx = dict(zone="sunken_bog", seed=seed, w=w, h=h, scale=SCALE, chunk=[CW, CH], origin=[x0, y0], band=BAND,
               chunks=[old[k_] for k_ in sorted(old, key=lambda k_: (k_[1], k_[0]))], fx=fx_of(Z),
               height=dict(file="height.png", res=0.5, z0=HZ0, k=HK, lift=KZ * SCALE),
               baked="tools/worldgen/bog_bake.py through art_study/bog_scene.py")
    with open(path, "w", newline="\n") as fh:
        json.dump(idx, fh, indent=0)
    print("wrote", path, "in %.0fs" % (time.time() - t0))
    return idx


if __name__ == "__main__":
    sd = int(sys.argv[1])
    jb = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    on = [tuple(int(v) for v in s_.split(",")) for s_ in sys.argv[3].split(";")] if len(sys.argv) > 3 else None
    bake(sd, jb, on)
