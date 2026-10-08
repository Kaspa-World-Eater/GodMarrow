"""See a window of a generated Sunken Bog (worldgen/bog.py) as the player will: the walks of the Long Back that pass
through it, the chamber shelves and their set pieces, the sparse things in the water, through the bog scene's engine
(art_study/bog_scene.py, bog_chambers.py) at the game's camera with the Ossuarch.

  python tools/worldgen/bog_preview.py SEED X Y OUT.png      X, Y: the window's centre in zone yards
"""
import os
import sys
import json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "art_study"))
import bog                                   # noqa: E402
import bog_scene as bs                       # noqa: E402
import bog_chambers as bc                    # noqa: E402
import wood_scene as ws                      # noqa: E402

OFF = np.array([200.0, 200.0])               # the zone placed in the world away from the study scenes' seeds


def render(seed, cx, cy, out):
    Z = bog.generate(seed)
    c = np.array([cx, cy]) + OFF
    bc.C = c
    bs.C = c
    ws.FOCUS = c.copy()
    near = lambda p, r: np.hypot(*(np.array(p) + OFF - c)) < r
    bs.LINES = [w["pts"] + OFF for w in Z["walks"] if any(near(p, 22) for p in w["pts"][::6])]
    bs.LINE = bs.LINES[0] if bs.LINES else bs.LINE
    mods, stamps, paints, living = [], [], [], []
    for n in Z["nodes"]:
        if n["kind"] == "exit" or not near(n["p"], 24):
            continue
        p = n["p"] + OFF
        mods.append(bc.shelf(p[0], p[1], n["r"], rise=0.16, seed=int(p[0]) % 97))
        if n["kind"] == "hut":
            pit = p + bs.AX * 2.6 + bs.PERP * 0.6
            stamps.append(bc.straw_hut(p[0], p[1], pit_at=pit))
            paints.append(bc.hut_paint)
            living.append(bc.pit_fire(pit[0], pit[1]))
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
    bs.BED_MODS[:] = mods
    bs.EXTRA_STAMPS[:] = stamps
    bs.EXTRA_PAINT[:] = paints
    structs, trees, ribs = [], [], []
    for q in Z["props"]:
        if not near(q["p"], 15):
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
            ribs.append((p, float(p[0] % 6.28), 5.5, 0.0, int(p[1]) % 97))
    bs.STRUCTS[:] = structs
    bs.DROWNED_TREES = trees
    bs.DROWNED_WALLS = []
    bs.GIANT_RIBS = ribs
    bs.EXTRA_LIVING[:] = living
    # the hero on the nearest walk
    best = None
    for ln in bs.LINES:
        d = np.hypot(*(ln - c).T)
        i = int(np.argmin(d))
        if best is None or d[i] < best[0]:
            best = (d[i], ln[i])
    ws.HERO = best[1] + bs.AX * 0.2 if best else c
    ws.main(out)


if __name__ == "__main__":
    render(int(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4])
