"""The opening cave in the game's own zone format (data/zones/opening_cave_s9301.json.gz), its ground the bake's
(cave_bake.py, art/zones/opening_cave_s9301/), so the game loads it with --zone=opening_cave, and a new pilgrim starts
in it on trial (--cave, GM_START=cave or user://start_in_cave; core/main.gd _start_zone).

- 1 tile = 1 yard, the zone's (0, 0) corner at the world's (OX, OY) (cave_bake); a tile's centre is (OX + x + 0.5,
  OY + y + 0.5), its walk read from the bake's block map (the half-yard lattice at the tile's centre).
- walkable: the floors (the pool's stumps, the blood itself, which the pilgrim wades, the stairs, the hall's flags);
  solid: the rock, and whatever stands at a body's height (the bake took it from the render).
- the pilgrim starts in the pool's heart, where it rises; the Stranger stands on the top step beside the onyx mirror and
  opens the Reading; the mirror is the way out, onto the Red Shore's sand under the right headland.
- the fires are the zone's lights (their light is already in the paint, so the game's are gentle: they light the
  pilgrim and move with the flicker).
- proved: every walkable tile is reached from the start, and the Stranger's step and the mirror are; if not,
  nothing is written (grid_check.png shows where the walk fails, in yellow).

  python tools/landkit3d/cave_export.py
"""
import os
import sys
import json
import math
import gzip
import copy
import glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import cave_bake as CB                                                    # noqa: E402
from cove_export import rle, reach, SOLID                                  # noqa: E402

CV = CB.CV
TEMPLATE = os.path.join(ROOT, "data", "zones", "sunken_bog_s9101.json.gz")
WALK, ROCK = 13, 2


def zone_of(x, y):
    return float(x) - CB.OX, float(y) - CB.OY


def grid():
    bl = np.asarray(Image.open(os.path.join(CB.OUT, "block.png")))
    W, H = CB.W, CB.H
    yy, xx = np.mgrid[0:H, 0:W]
    lat = bl[2 * yy + 1, 2 * xx + 1]
    g = np.where(lat == 255, ROCK, WALK).astype(np.uint8)
    # the stairs walked their whole width (Derek, 2026-10-10: the way up to the face "has no area to move in, feels like
    # hes stuck in a tunnel"): the block map's lattice left a strip three tiles wide down the middle of a stair four and
    # a half yards wide; every tile whose centre lies on the stair, and on its landing, is walked
    cx_ = CB.OX + xx + 0.5
    cy_ = CB.OY + yy + 0.5
    x0, x1, y0, y1 = CV.STAIR
    on_stair = (cx_ > x0 + 0.15) & (cx_ < x1 - 0.15) & (cy_ < y0 + 0.4) & (cy_ > y1 - 3.4)
    g = np.where(on_stair, WALK, g).astype(np.uint8)
    gcls = np.where(lat == 128, 7, np.where(g == WALK, 4, 1)).astype(np.uint8)
    return g, gcls


def pool_sim_field(pool, spouts, NX=192, NY=96):
    """the pool's simulation field (world/pool_life.gd; Derek, 2026-10-10: "a blood pool that flows like it has an
    underground source that swells it and sloshes it, with the blood flowing from the faces into it like real water"):
    over a screen rect round the pool, at NX x NY cells, which cells are blood (open to the waves) and which are the
    stumps and the shore (they reflect them), read from the bake's own painted chunks (alpha 254 blood); and the steady
    flow of the blood from where the faces pour and the spring wells up, round the stumps and out across the pool (a
    potential flow solved on the cells, its walls the stumps). Written as pool_sim.png: R, G the flow (0.5 still), B
    the blood mask. Returns the rect (screen px) and the file"""
    idx = json.load(open(os.path.join(CB.OUT, "index.json")))
    sc = float(idx["scale"])
    cw, ch = idx["chunk"]
    def scr(tx, ty):
        return (tx - ty) * 72.0, (tx + ty) * 36.0 - float(pool["surface"]) * 84.0
    cx, cy = scr(pool["cx"], pool["cy"])
    R = float(pool["r_shore"]) + 1.6
    hw, hh = R * 102.0, R * 51.0
    x0, y0 = cx - hw, cy - hh
    cell = (2 * hw / NX, 2 * hh / NY)
    mask = np.zeros((NY, NX), np.uint8)
    imgs = {}
    for c in idx["chunks"]:
        px, py = c["pos"]
        w_, h_ = 4.0 * cw, 4.0 * ch
        if px > x0 + 2 * hw or py > y0 + 2 * hh or px + w_ < x0 or py + h_ < y0:
            continue
        im = np.asarray(Image.open(os.path.join(CB.OUT, c["file"])).convert("RGBA"))
        imgs[c["file"]] = (px, py, im)
    for j in range(NY):
        for i in range(NX):
            sx, sy = x0 + (i + 0.5) * cell[0], y0 + (j + 0.5) * cell[1]
            for (px, py, im) in imgs.values():
                u, v = int((sx - px) / sc), int((sy - py) / sc)
                if 0 <= v < im.shape[0] and 0 <= u < im.shape[1]:
                    if im[v, u, 3] == 254:
                        mask[j, i] = 1
                    break
    # the flow: sources where the faces pour and at the spring, an even sink over all the blood, walls at the stumps
    src = np.zeros((NY, NX))
    def put(tx, ty, k):
        sx, sy = scr(tx, ty)
        i, j = int((sx - x0) / cell[0]), int((sy - y0) / cell[1])
        for dj in range(-2, 3):
            for di in range(-2, 3):
                if 0 <= j + dj < NY and 0 <= i + di < NX and mask[j + dj, i + di]:
                    src[j + dj, i + di] += k / 25.0
    for spt in spouts:
        put(spt["x"], spt["y"], 1.0)
    put(pool["cx"], pool["cy"], 2.0)
    m = mask.astype(bool)
    src[m] -= src[m].sum() / max(1, m.sum())
    phi = np.zeros((NY, NX))
    for _ in range(2500):
        pp = np.pad(phi, 1, mode="edge")
        mp = np.pad(m, 1, constant_values=False)
        nb = []
        for dj, di in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            q = pp[1 + dj:NY + 1 + dj, 1 + di:NX + 1 + di]
            qm = mp[1 + dj:NY + 1 + dj, 1 + di:NX + 1 + di]
            nb.append(np.where(qm, q, phi))                       # a wall: no flow across it (its value mirrors)
        phi = np.where(m, (sum(nb) + src * 4.0) / 4.0, 0.0)
    # the gradient between blood cells only (across a wall there is no flow)
    def d1(a_, ax):
        fwd = np.roll(a_, -1, ax) - a_
        bwd = a_ - np.roll(a_, 1, ax)
        mf = m & np.roll(m, -1, ax)
        mb = m & np.roll(m, 1, ax)
        return np.where(mf & mb, (fwd + bwd) / 2, np.where(mf, fwd, np.where(mb, bwd, 0.0)))
    gx, gy = d1(phi, 1), d1(phi, 0)
    vx, vy = -gx * m, -gy * m
    mag = np.sqrt(vx ** 2 + vy ** 2)
    k = 1.0 / max(np.percentile(mag[m], 95), 1e-6)
    vx, vy = np.clip(vx * k, -1, 1), np.clip(vy * k, -1, 1)
    out = np.dstack([(vx * 0.5 + 0.5) * 255, (vy * 0.5 + 0.5) * 255, mask * 255, np.full((NY, NX), 255)]).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(os.path.join(CB.OUT, "pool_sim.png"))
    print("pool sim: %dx%d cells, %d of blood" % (NX, NY, int(m.sum())))
    return dict(file="pool_sim.png", rect=[round(x0, 1), round(y0, 1), round(2 * hw, 1), round(2 * hh, 1)], nx=NX, ny=NY)


def nearest_walk(g, p):
    H, W = g.shape
    best, bd = None, 1e9
    for y in range(H):
        for x in range(W):
            if g[y, x] == WALK:
                d = (x + 0.5 - p[0]) ** 2 + (y + 0.5 - p[1]) ** 2
                if d < bd:
                    best, bd = (x + 0.5, y + 0.5), d
    return best


def main():
    T = json.load(gzip.open(TEMPLATE, "rt", encoding="utf-8"))
    g, gcls = grid()
    W, H = CB.W, CB.H
    fx, fy, nx, ny = CV._face_span()
    sx, sy = -ny, nx
    start = nearest_walk(g, zone_of(CV.BASIN[0] + 0.4, CV.BASIN[1] + 0.3))
    stranger = nearest_walk(g, zone_of(fx + nx * 2.8 + sx * 1.8, fy + ny * 2.8 + sy * 1.8))
    mirror = nearest_walk(g, zone_of(fx + nx * 2.2, fy + ny * 2.2))
    seen, walk = reach(g, start)
    cut = walk & ~seen
    from scipy import ndimage as nd
    lab, nl = nd.label(cut)
    for i in range(1, nl + 1):
        m = lab == i
        if m.sum() < 12:
            g[m] = ROCK
    seen, walk = reach(g, start)
    ok = {k: bool(seen[int(p[1]), int(p[0])]) for k, p in (("stranger", stranger), ("mirror", mirror))}
    print("walkable %d tiles, reached %d; reached: %s; start %s, stranger %s, mirror %s" % (
        int(walk.sum()), int(seen.sum()), ok, start, stranger, mirror))
    pic = np.zeros((H, W, 3), np.uint8)
    pic[g == WALK] = (120, 110, 100)
    pic[gcls == 7] = (90, 10, 15)
    pic[g == ROCK] = (20, 20, 24)
    pic[(g == WALK) & ~seen] = (200, 160, 0)                          # walkable but never reached: the proof fails there
    for (px, py), c in ((start, (80, 220, 80)), (stranger, (220, 200, 80)), (mirror, (80, 160, 255))):
        pic[int(py), int(px)] = c
    Image.fromarray(pic).resize((W * 8, H * 8), Image.NEAREST).save(os.path.join(CB.OUT, "grid_check.png"))
    if not all(ok.values()) or (walk & ~seen).any():
        sys.exit("not proved, nothing written: see %s" % os.path.join(CB.OUT, "grid_check.png"))
    N = copy.deepcopy(T)
    N.update(id="opening_cave", name="Under the Black Cliffs", seed=CB.SEED, zoneSeed=CB.SEED, theme="crypt", land="crypt",
             wallTheme="crypt", scatterLand="crypt", mlvl=[1, 1],
             generator="tools/landkit3d/cave3d.py + cave_bake.py + cave_export.py (the 3D road's opening cave)")
    N["grid"] = dict(T["grid"], w=W, h=H, cells=rle(g))
    N["ground"] = dict(T["ground"], land="crypt", classes=rle(gcls))
    N["walls"] = dict(info=T["walls"]["info"], cells=[])
    for k in ("props", "decor", "landmarks", "landmarkFootprintRocks", "sprites", "zoneProps", "warnings", "quests"):
        N[k] = []
    N["scatter"] = dict(T["scatter"], items=[])
    mk = dict(T["markers"])
    for k in ("lanterns", "waystones", "chests", "shrines", "altars", "statues", "npcs", "questObjects", "ruins", "channels89"):
        mk[k] = []
    objects = [dict(type="portal", x=mirror[0], y=mirror[1], to="red_shore", name="The dark mirror", spr="cave", i=0, solid=False,
                    sprites=[]),
               dict(type="qobj", q="npc", role="stranger", name="The Stranger", x=stranger[0], y=stranger[1], i=1, solid=False,
                    sprites=[], reading=True)]
    mk["npcs"] = [1]
    conns = [dict(to="red_shore", toName="red_shore", name="The dark mirror", x=mirror[0], y=mirror[1], spr="cave", object=0,
                  arriveHereFrom=None)]
    mk["start"] = dict(x=start[0], y=start[1])
    mk["safeCircle"] = dict(x=W / 2.0, y=H / 2.0, r=float(max(W, H)))
    lamps = None
    for pz in sorted(glob.glob(os.path.join(sys.argv[1] if len(sys.argv) > 1 else "", "t*", "passes.npz"))):
        lamps = np.load(pz, allow_pickle=True)["lamps"]
        break
    lights = []
    wz, _, near, _ = CB.walk_grid()
    for lp in (lamps if lamps is not None else []):
        x, y, z, w = (float(v) for v in lp[:4])
        r, gg, b = (float(v) for v in lp[4:7])
        red = gg < 0.3
        zx, zy = zone_of(x, y)
        if not (0 <= zx < W and 0 <= zy < H):
            continue
        rad = round(min(7.0, 1.2 + 0.45 * w ** 0.5), 2)
        rgb = "%d,%d,%d" % (int(255 * r), int(255 * gg * (0.9 if red else 1.0)), int(255 * b))
        if red:
            # the pool's own glow (Derek: "glowing red near the pool"): a pool of light only, no flame to draw
            lights.append(dict(type="raw", x=zx, y=zy, radiusPx=round(rad * 25.456 * 0.32, 1), rgb=rgb))
            continue
        # a flame painted into the bake: the game lays its pool, its halo, embers and smoke at the flame's true height
        # over the floor a body stands on there (engine px, 21 a yard), and lets it breathe with the gust
        fl = float(CB.at(wz, np.array([x]), np.array([y]))[0])
        if not np.isfinite(fl):
            fl = float(CB.at(near, np.array([x]), np.array([y]))[0])
        fl = fl if np.isfinite(fl) else (CV.floor_at(x, y) or 0.0)
        # zAbs: the flame's own height in the world (yards), so its live flame stands where the fire is even where the
        # floor under it is the stair's and the lift's is the hall's (the great face's sconces had floated off)
        lights.append(dict(type="fire", kind="brazier" if w >= 120 else "candles", x=zx, y=zy, radius=rad, rgb=rgb, a=0.55,
                           heightPx=int(round(max(0.0, z - fl) * 21)), dxPx=0, zAbs=round(float(z), 2)))
    N["objects"], N["connections"], N["arrive"], N["markers"], N["lights"] = objects, conns, {}, mk, lights
    N["packs"], N["monsters"] = [], []
    amb = json.load(open(os.path.join(HERE, "ambient_outdoor.json"), encoding="utf-8"))   # the hours' light (once the moor's)
    for ph in amb["byPhase"]:
        ph["rgb"] = [205, 198, 200]                                   # underground: no hour reaches in; the paint is the light
    amb["dark"] = 0.22
    N["ambient"] = amb
    N["dark"] = 0.22
    # the stair's true steps (Derek, 2026-10-10: the walk up "is like a weird floating slide rather than taking steps"):
    # the floor's lattice blends them into a ramp, so the stair's footprint and count go in for the walker to follow
    sx0, sy0 = zone_of(CV.STAIR[0], CV.STAIR[2])
    sx1, sy1 = zone_of(CV.STAIR[1], CV.STAIR[3])
    N["stairs"] = [dict(x0=sx0, x1=sx1, y0=sy0, y1=sy1, steps=CV.STEPS, z0=0.0, z1=CV.FLOOR_HALL)]
    # the pool, alive in the game (Derek, 2026-10-10: the blood "moves chunky", the drips' ripples "are frozen", "depth to
    # the pool so we sink when we go in or out", "ripples in the blood when we step in it"): its heart and shore (the
    # wading depth: the surface over the floor, deepest at the heart, nothing past the shore), and where the blood out of
    # the faces' mouths strikes it (world/pool_life.gd rings the surface there, and wherever a body moves in it)
    bcx, bcy = zone_of(CV.BASIN[0], CV.BASIN[1])
    N["pool"] = dict(cx=bcx, cy=bcy, r_deep=CV.BASIN[2], r_shore=CV.BASIN[2] + 1.3, surface=CB.POOL_Z, floor_deep=-0.75)
    sp = []
    for ang in (200.0, 228.0, 256.0):                                  # the mascarons' ropes (cave3d.spouting_faces)
        a_ = math.radians(ang)
        sp.append(zone_of(CV.BASIN[0] + math.cos(a_) * (CV.BASIN[2] - 0.55), CV.BASIN[1] + math.sin(a_) * (CV.BASIN[2] - 0.55)))
    for (x_, y_, nx_, ny_, ux_, uy_, ln_) in CV.OOZE_FACES:             # the plain faces' tongues (cave3d.ooze_faces)
        sp.append(zone_of(CV.BASIN[0] - ux_ * (CV.BASIN[2] + 0.4), CV.BASIN[1] - uy_ * (CV.BASIN[2] + 0.4)))
    N["spouts"] = [dict(x=round(a_, 2), y=round(b_, 2)) for a_, b_ in sp]
    N["pool"]["sim"] = pool_sim_field(N["pool"], N["spouts"])
    # candles (Derek, 2026-10-10: "add a few candles around in the cave main area and on the stairs to add a little light
    # an ambiance"): left by those who came before, in small clusters on the chamber's floor round the pool (never in the
    # blood) and at the stair's side ends every few steps; each a small warm light, drawn live (world/live_flames.gd)
    rnd = np.random.default_rng(9302)
    cands = []
    for ang in np.linspace(0.0, 2 * math.pi, 18, endpoint=False) + rnd.uniform(-0.12, 0.12, 18):   # (doubled, Derek 2026-10-10)
        rr = CV.BASIN[2] + 2.0 + rnd.uniform(0.0, 1.6)
        cx_, cy_ = CV.BASIN[0] + math.cos(ang) * rr, CV.BASIN[1] + math.sin(ang) * rr * 0.9
        f_ = CV.floor_at(cx_, cy_)
        if f_ is None or CV._ell(cx_, cy_, CV.POOL) > 0.9 or abs(cx_ - (CV.STAIR[0] + CV.STAIR[1]) / 2) < 3.0 and cy_ < CV.STAIR[2] + 1.0:
            continue
        cands.append((cx_, cy_, f_))
    for i in range(1, CV.STEPS - 1, 2):
        u_ = (i + 0.5) / CV.STEPS
        sy_ = CV.STAIR[2] - (CV.STAIR[2] - CV.STAIR[3]) * u_
        sx_ = (CV.STAIR[0] + 0.35) if (i // 2) % 2 == 0 else (CV.STAIR[1] - 0.35)
        cands.append((sx_, sy_, CV.floor_at(sx_, sy_) or 0.0))
    # and the hall's floor before the dais (Derek, 2026-10-10: "the bottom area needs candles"): clusters left on the
    # flags, kept off the worn way up to the face and off the dais
    hx_, hy_, hrx, hry = CV.HALL
    got = 0
    for k_ in range(200):
        if got >= 22:
            break
        a_ = rnd.uniform(0, 2 * math.pi)
        rr = math.sqrt(rnd.uniform(0.08, 0.85))
        cx_, cy_ = hx_ + math.cos(a_) * hrx * rr, hy_ + math.sin(a_) * hry * rr
        f_ = CV.floor_at(cx_, cy_)
        if f_ is None or f_ < CV.FLOOR_HALL - 0.5 or CV.dais_at(cx_, cy_) is not None:
            continue
        if abs(cx_ - hx_) < 1.6:                                       # the worn way up the middle
            continue
        if any(math.hypot(cx_ - a, cy_ - b) < 1.8 for a, b, _ in cands):
            continue
        cands.append((cx_, cy_, f_))
        got += 1
    # (Derek, 2026-10-10: "remove 25% of the candles but increase the light they produce by 50%")
    cands = [c_ for k_, c_ in enumerate(cands) if k_ % 4 != 3]
    for cx_, cy_, f_ in cands:
        zx_, zy_ = zone_of(cx_, cy_)
        lights.append(dict(type="fire", kind="floorcandles", x=round(zx_, 2), y=round(zy_, 2), radius=3.0, rgb="255,150,64",
                           a=0.9, heightPx=4, dxPx=0, zAbs=round(float(f_) + 0.2, 2)))
    N["lights"] = lights
    N["sunless"] = True                                               # no sun throws a shadow down here (entities/sil_shadow.gd)
    path = os.path.join(ROOT, "data", "zones", "opening_cave_s%d.json.gz" % CB.SEED)
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        json.dump(N, fh)
    # the Red Shore takes the pilgrim in from the mirror at its start, under the right headland
    rp = os.path.join(ROOT, "data", "zones", "red_shore_s9201.json.gz")
    R = json.load(gzip.open(rp, "rt", encoding="utf-8"))
    R.setdefault("arrive", {})["opening_cave"] = dict(R["markers"]["start"])
    with gzip.open(rp, "wt", encoding="utf-8") as fh:
        json.dump(R, fh)
    ip = os.path.join(ROOT, "data", "zones", "index.json")
    raw = open(ip, encoding="utf-8", newline="").read()
    idx = json.loads(raw)
    idx["zones"]["opening_cave"] = {"id": "opening_cave", "name": "Under the Black Cliffs", "act": 1, "kind": "dungeon",
                                    "outdoor": False, "theme": "crypt", "land": "crypt", "wallTheme": "crypt", "w": W, "h": H,
                                    "mlvl": [1, 1], "links": ["red_shore"], "seeds": [CB.SEED],
                                    "files": ["opening_cave_s%d.json.gz" % CB.SEED]}
    rs = idx["zones"].get("red_shore")
    if rs is not None and "opening_cave" not in rs.get("links", []):
        rs["links"] = list(rs.get("links", [])) + ["opening_cave"]
    out = json.dumps(idx, indent=1, ensure_ascii=False)
    if raw.endswith("\n"):
        out += "\n"
    with open(ip, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(out)
    print("wrote", path, "lights", len(lights))


if __name__ == "__main__":
    main()
