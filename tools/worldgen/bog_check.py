"""Prove the Sunken Bog's generator: many seeds, each exported to the game's tiles and walked the way the game walks
(world/zone.gd: SOLID_TYPES; 8 neighbours, a diagonal only when both sides are open, as AStarGrid2D's
DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES). From the arrival, every chamber, the pit, every island, both exits, every
lantern, chest, shrine and the waystone must be reachable on foot; no monster may stand where no walker can reach;
and the walk from the start to each exit is measured.

  python tools/worldgen/bog_check.py [N_SEEDS=100] [FIRST=1] [OUT_DIR]
"""
import os
import sys
import json
import time
import numpy as np
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bog_export                            # noqa: E402

SOLID = bog_export.SOLID


def walk_from(grid, sx, sy):
    H, W = grid.shape
    open_ = ~np.isin(grid, list(SOLID))
    dist = np.full((H, W), -1, np.int32)
    q = deque([(sx, sy)])
    dist[sy, sx] = 0
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < W and 0 <= ny < H) or dist[ny, nx] >= 0 or not open_[ny, nx]:
                continue
            if dx and dy and not (open_[y, nx] and open_[ny, x]):
                continue                                                     # no squeezing between two solid corners
            dist[ny, nx] = dist[y, x] + 1
            q.append((nx, ny))
    return dist


def reached(dist, p, r=1):
    x, y = int(p[0]), int(p[1])
    H, W = dist.shape
    best = None
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if 0 <= x + dx < W and 0 <= y + dy < H and dist[y + dy, x + dx] >= 0:
                d = dist[y + dy, x + dx]
                best = d if best is None else min(best, d)
    return best


def check(seed, out_dir):
    t0 = time.time()
    path, N, Z, grid = bog_export.export(seed, out_dir)
    s = N["markers"]["start"]
    dist = walk_from(grid, int(s["x"]), int(s["y"]))
    probs = []
    for n in Z["nodes"]:
        r = int(n["r"] * 0.9) if n["kind"] not in ("exit",) else 2
        if reached(dist, n["p"], max(r, 2)) is None:
            probs.append("unreachable %s at %s" % (n["kind"], np.round(n["p"], 1).tolist()))
    for o in N["objects"]:
        if reached(dist, (o["x"], o["y"]), 2 if o["type"] in ("portal", "qobj") else 1) is None:
            probs.append("unreachable %s at (%.1f, %.1f)" % (o["type"], o["x"], o["y"]))
    stranded = sum(1 for m in N["monsters"] if reached(dist, (m["x"], m["y"]), 1) is None)
    if stranded:
        probs.append("%d monsters stranded" % stranded)
    walkable = int((dist >= 0).sum())
    open_total = int((~np.isin(grid, list(SOLID))).sum())
    exits = [reached(dist, (c["x"], c["y"]), 2) for c in N["connections"]]
    return dict(seed=seed, ok=not probs, problems=probs, places=len([n for n in Z["nodes"] if n["kind"] != "exit"]),
                objects=len(N["objects"]), monsters=len(N["monsters"]), walkable_tiles=walkable,
                unreachable_open_tiles=open_total - walkable, exit_walks=exits, secs=round(time.time() - t0, 1))


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    first = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(HERE, "out", "bog_check")
    rows = []
    for sd in range(first, first + n):
        r = check(sd, out)
        rows.append(r)
        print(sd, "OK" if r["ok"] else "FAIL", r["places"], r["objects"], r["monsters"], r["walkable_tiles"],
              r["unreachable_open_tiles"], r["exit_walks"], "; ".join(r["problems"])[:200], flush=True)
    ok = sum(r["ok"] for r in rows)
    print("PASSED %d / %d" % (ok, len(rows)))
    with open(os.path.join(out, "summary.json"), "w") as fh:
        json.dump(rows, fh, indent=1, default=int)
