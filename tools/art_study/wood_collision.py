"""Collision for every object in the old wood, in the game's own form: posts (circles in yards, world/zone.gd), which
a body slides round and the path-finder weighs (Derek: "the base of every tree should have collisions so the
character can't walk through it ... true for rocks, fallen trees ... we should be able to walk behind" the root plate).

- trees, the stump, the snag: one post at the trunk's foot, sized to the trunk and its flare (never the crown);
- rocks: the posts the landkit object exports (tools/landkit/rock.py; stones and clusters low enough to step over
  have none);
- logs: a row of posts down the length, tapering with the log; decay classes 1-3 block, the sunk soft classes 4-5 are
  humps a body steps over;
- the root plate: a thin wall of posts across its width only, so a body walks round its ends and behind it;
- grass, ferns, leaves, saplings: none (a body walks through; the grass parts).

The proof: the posts drawn over the scene, and a path found by A* from the hero to behind the root plate.

  python tools/art_study/wood_collision.py OUT.png
"""
import sys
import heapq
import numpy as np
from PIL import Image, ImageDraw
import wood_scene as ws
from wood_ecosystem import Wood

BODY_R = 0.25                     # the hero's body radius, yards (world/zone.gd move's default)


def posts_for(w):
    P = []                        # [x, y, r, what]
    for (tx, ty, kind, r, cr) in w.trees:
        P.append([tx, ty, r * (1.3 if kind in ("giant", "middle") else 1.1), kind])
    for (kind, rx, ry, seed) in w.rocks:
        meta = ws.rockgen.make(kind, seed)[5]
        from kit import posts_from
        F = ws.rockgen.make(kind, seed)[4]
        for (px, py, pr) in posts_from(F):
            P.append([rx + px, ry + py, pr, "rock"])
    for (ax, ay, bx, by, r, cls, plate) in w.logs:
        if cls <= 3:
            L = np.hypot(bx - ax, by - ay)
            n = max(2, int(L / (r * 1.1)))
            for k in range(n + 1):
                t = k / n
                P.append([ax + (bx - ax) * t, ay + (by - ay) * t, r * (1 - t * 0.35), "log %d" % cls])
        if plate:
            ux, uy = (bx - ax) / np.hypot(bx - ax, by - ay), (by - ay) / np.hypot(bx - ax, by - ay)
            for lat in np.linspace(-1.7, 1.7, 9):                             # a thin wall across its width
                P.append([ax - ux * 0.15 - uy * lat, ay - uy * 0.15 + ux * lat, 0.22, "root plate"])
    return P


def find_path(P, start, goal, res=0.1, pad=4.0):
    x0, y0 = min(start[0], goal[0]) - pad, min(start[1], goal[1]) - pad
    x1, y1 = max(start[0], goal[0]) + pad, max(start[1], goal[1]) + pad
    nx, ny = int((x1 - x0) / res), int((y1 - y0) / res)
    xs = x0 + (np.arange(nx) + 0.5) * res
    ys = y0 + (np.arange(ny) + 0.5) * res
    X, Y = np.meshgrid(xs, ys)
    block = np.zeros(X.shape, bool)
    for (px, py, pr, _) in P:
        block |= np.hypot(X - px, Y - py) < pr + BODY_R
    s = (int((start[1] - y0) / res), int((start[0] - x0) / res))
    g = (int((goal[1] - y0) / res), int((goal[0] - x0) / res))
    dist = {s: 0.0}
    prev = {}
    pq = [(0.0, s)]
    while pq:
        f, c = heapq.heappop(pq)                                         # f: cost so far + the guess still to go
        if c == g:
            break
        d = dist[c]                                                      # the cost so far is kept apart from f
        if f > d + np.hypot(c[0] - g[0], c[1] - g[1]) + 1e-9:
            continue
        for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            q = (c[0] + dj, c[1] + di)
            if not (0 <= q[0] < ny and 0 <= q[1] < nx) or block[q]:
                continue
            nd_ = d + np.hypot(dj, di)
            if nd_ < dist.get(q, 1e9):
                dist[q] = nd_
                prev[q] = c
                heapq.heappush(pq, (nd_ + np.hypot(q[0] - g[0], q[1] - g[1]), q))
    path = []
    c = g
    while c in prev:
        path.append((x0 + (c[1] + 0.5) * res, y0 + (c[0] + 0.5) * res))
        c = prev[c]
    return path[::-1]


def main(out):
    w = Wood()
    P = posts_for(w)
    W = ws.build(w)
    px, py, pz, SX, SY = ws.cast(W)
    globals()["w"] = w
    ws.w = w
    L = ws.shade(W, px, py, pz, SX, SY)
    img = ws.paint(W, px, py, pz, SX, SY, L)
    img = ws.living(img, w, W, px, py, pz, L)
    big = Image.fromarray((img * 255).astype(np.uint8)).resize((ws.GW * 4, ws.GH * 4), Image.NEAREST)
    big = ws.the_ossuarch(big, W, px, py)
    d = ImageDraw.Draw(big)
    for (x, y, r, what) in P:
        gz = float(w.H[int(np.clip(y / 0.1, 0, w.H.shape[0] - 1)), int(np.clip(x / 0.1, 0, w.H.shape[1] - 1))])   # the bare ground, not a trunk
        cx, cy = ws.to_px((x, y, gz))
        if not (-40 < cx < ws.GW + 40 and -40 < cy < ws.GH + 40):
            continue
        rx, ry = r * ws.KX * 1.414 * 4, r * ws.KY * 1.414 * 4
        d.ellipse([cx * 4 - rx, cy * 4 - ry, cx * 4 + rx, cy * 4 + ry], outline=(255, 70, 60), width=3)
    ax, ay = w.logs[0][0], w.logs[0][1]
    ux, uy = (w.logs[0][2] - ax), (w.logs[0][3] - ay)
    nrm = np.hypot(ux, uy)
    goal = (ax - ux / nrm * 1.4, ay - uy / nrm * 1.4)                       # behind the root plate, in its pit
    path = find_path(P, tuple(ws.HERO), goal)
    for (x, y) in path[::2]:
        gz = float(ws.look(W, W["H"], np.array(x), np.array(y)))
        cx, cy = ws.to_px((x, y, gz))
        d.ellipse([cx * 4 - 5, cy * 4 - 5, cx * 4 + 5, cy * 4 + 5], fill=(120, 230, 255))
    big.save(out)
    print("saved", out, len(P), "posts; path", len(path), "steps")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "wood_collision.png")
