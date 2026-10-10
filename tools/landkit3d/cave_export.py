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
    gcls = np.where(lat == 128, 7, np.where(g == WALK, 4, 1)).astype(np.uint8)
    return g, gcls


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
        lights.append(dict(type="fire", kind="brazier" if w >= 120 else "candles", x=zx, y=zy, radius=rad, rgb=rgb, a=0.55,
                           heightPx=int(round(max(0.0, z - fl) * 21)), dxPx=0))
    N["objects"], N["connections"], N["arrive"], N["markers"], N["lights"] = objects, conns, {}, mk, lights
    N["packs"], N["monsters"] = [], []
    M = json.load(gzip.open(os.path.join(ROOT, "data", "zones", "moor_s9001.json.gz"), "rt", encoding="utf-8"))
    amb = copy.deepcopy(M["ambient"])
    for ph in amb["byPhase"]:
        ph["rgb"] = [205, 198, 200]                                   # underground: no hour reaches in; the paint is the light
    amb["dark"] = 0.22
    N["ambient"] = amb
    N["dark"] = 0.22
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
