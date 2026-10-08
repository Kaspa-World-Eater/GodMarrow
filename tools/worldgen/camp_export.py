"""The bare camp (Derek, 2026-10-08: the Ashen Moor is "fucking trash"; "wipe it, keep a bare camp ... make it very
basic so we can finish the bog"). Act I's town reduced to a small open clearing: the camp's people (Esk, Ysolde,
Brannoc, the Stranger, Maren), the stash, the camp lantern and the waystone, and the five roads out. No creatures, no
props. A stand-in until the first area is rebuilt (the destroyed village in the old growth: memory
godmarrow-first-area-vision); it keeps the game's spine whole meanwhile.

  python tools/worldgen/camp_export.py      -> data/zones/moor_s9001.json.gz
"""
import os
import json
import gzip
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
TEMPLATE = os.path.join(ROOT, "data", "zones", "moor_s1001.json.gz")
SEED = 9001
W = H = 48
C = np.array([24.0, 24.0])

# the camp's people round its lantern, where the old camp kept them (relative to the lantern)
PEOPLE = [
    dict(type="qobj", q="npc", role="giver", name="Warden-Crone Esk", spr="vendor", at=(-3.0, -4.0)),
    dict(type="qobj", q="npc", role="healer", name="Sister Ysolde, Tallow-Nurse", spr="vendor", at=(-5.0, 1.0)),
    dict(type="qobj", q="npc", role="smith", name="Brannoc of the Nail", spr="vendor", at=(-3.0, 4.0)),
    dict(type="qobj", q="npc", role="stranger", name="The Stranger", spr="vendor", at=(2.0, 1.0)),
    dict(type="qobj", q="npc", role="stash", name="The Reliquary Chest", spr="chest", at=(0.0, -4.0)),
    dict(type="vendor", name="Maren the Gravekeeper", at=(-5.0, -2.0)),
]
# the five roads out, each toward its own side of the clearing
ROADS = [("sighing_ridge", "North to the Sighing Ridge", "gate", (6.5, 6.5)),
         ("fen", "Road to the Drowned Fen", "gate", (40.5, 6.5)),
         ("hollow_wood", "Path to the Hollow Wood", "gate", (41.5, 24.5)),
         ("crypt", "Hollow Crypt", "cave", (40.5, 41.5)),
         ("barrow", "Old Barrow", "cave", (6.5, 41.5))]


def rle(a):
    a = np.asarray(a).ravel()
    out, i = [], 0
    while i < len(a):
        j = i
        while j < len(a) and a[j] == a[i]:
            j += 1
        out += [int(a[i]), j - i]
        i = j
    return out


def export():
    T = json.load(gzip.open(TEMPLATE, "rt", encoding="utf-8"))
    N = dict(T)
    grid = np.zeros((H, W), np.uint8)                                         # open ground
    grid[0, :] = grid[-1, :] = grid[:, 0] = grid[:, -1] = 2                   # the clearing's edge
    N["grid"] = dict(T["grid"], w=W, h=H, cells=rle(grid))
    N["ground"] = dict(T["ground"], classes=rle(np.ones((H, W), np.uint8)))
    N["walls"] = dict(T["walls"], cells=[])
    N["seed"] = SEED
    for k in ("props", "decor", "landmarks", "zoneProps", "monsters", "packs", "sprites", "landmarkFootprintRocks"):
        N[k] = []
    N["scatter"] = {}
    objects = []
    lamp = C + np.array([0.0, 0.0])
    objects.append(dict(type="lantern", x=float(lamp[0]), y=float(lamp[1]), idx=0, name="Lantern Camp", i=0, solid=False, sprites=[]))
    for p in PEOPLE:
        o = {k: v for k, v in p.items() if k != "at"}
        o.update(x=float(lamp[0] + p["at"][0]), y=float(lamp[1] + p["at"][1]), i=len(objects), solid=False, sprites=[])
        objects.append(o)
    objects.append(dict(type="qobj", q="wp", name="Chalked Waystone", spr="shrine", x=float(lamp[0] + 2.5), y=float(lamp[1] - 2.5),
                        vInscr="Kindled by pilgrims. Touch it, and every lit waystone on the Hide knows your step.",
                        i=len(objects), solid=False, sprites=[]))
    wp = len(objects) - 1
    conns, arrive = [], {}
    for to, name, spr, (x, y) in ROADS:
        objects.append(dict(type="portal", x=x, y=y, to=to, name=name, spr=spr, i=len(objects), solid=False, sprites=[]))
        conns.append(dict(to=to, toName=name, name=name, x=x, y=y, spr=spr, object=len(objects) - 1, arriveHereFrom=None))
        inward = (C - np.array([x, y])) / np.linalg.norm(C - np.array([x, y]))
        a = np.array([x, y]) + inward * 2.5
        arrive[to] = dict(x=round(float(a[0]), 2), y=round(float(a[1]), 2))
    start = dict(x=float(lamp[0] + 1.0), y=float(lamp[1] + 3.0))
    arrive["moor"] = start
    N["objects"], N["connections"], N["arrive"] = objects, conns, arrive
    mk = {k: (None if not isinstance(v, list) else []) for k, v in T["markers"].items()}
    mk.update(start=start, safeCircle=dict(x=int(C[0]), y=int(C[1]), r=12), lanterns=[dict(idx=0, name="Lantern Camp", x=float(lamp[0]), y=float(lamp[1]), object=0)],
              waystones=[wp], npcs=[i for i, o in enumerate(objects) if o["type"] in ("vendor",) or o.get("q") == "npc"])
    N["markers"] = mk
    N["lights"] = [dict(type="fire", kind="lantern", x=float(lamp[0]), y=float(lamp[1]) + 0.3, radius=8.5, rgb="255,150,72", a=1.4, heightPx=44, dxPx=13)]
    path = os.path.join(ROOT, "data", "zones", "moor_s%d.json.gz" % SEED)
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        json.dump(N, fh)
    return path


if __name__ == "__main__":
    print(export())
