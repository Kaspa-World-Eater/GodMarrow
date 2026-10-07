"""Ruins of the old road's chapels (landkit). Built from the Hollow Wood's lore (docs/wiki/11-codex-voices.md, the
hunter): "the roads were there first, and the Wood grew away from them the way skin grows away from a nail". A
wayside chapel of the old road, older than the Wood: its roof long gone, walls broken down course by course, the
west door's arch fallen onto its own threshold, the nave's piers snapped at every height but one, the altar block
still at the east end, the floor's flags lifted. Over the stones themselves: moss on every top, dark creepers
hanging down the faces. A ring of blue caps on the nave floor tells of something hollow under it.

Exports the form as a height field with materials and, per pixel, which wall it belongs to and where along it, so
the stone can be laid in real courses (the painter works in the wall's own coordinates).

  F, info = ruin.chapel(seed)   F.H heights, F.M materials, F.W wall ids; info["walls"] [(ax, ay, bx, by, thick)]
"""
import numpy as np
from kit import Field, vn, fbm

FLOOR, BLOCK, PIER, STEP, ALTAR, RUBBLE, FLAG = 1, 2, 3, 4, 5, 6, 7
COURSE = 0.45                                                         # a course of stone, yards


def chapel(seed=1, length=15.0, width=9.0, thick=1.1, full=(6.5, 8.5, 7.5, 9.0)):
    rr = np.random.default_rng(seed)
    F = Field(max(length, width) / 2 + 2.5, res=0.04)
    X, Y = F.X, F.Y
    F.W = np.full(X.shape, -1)
    F.U = np.zeros(X.shape)                                          # distance along its wall
    hx, hy = length / 2, width / 2
    # the floor of the nave: a low platform of flags, a hand above the ground, lifted here and there
    inside = (np.abs(X) < hx) & (np.abs(Y) < hy)
    flag_i = np.floor((X + 50) / 0.62) + np.floor((Y + 50) / 0.62) * 97
    lift = (vn(flag_i * 0.37, 3) > 0.82) * rr.uniform(0.04, 0.09)
    H = np.where(inside, 0.12 + lift + (vn(X * 2, Y * 2) - 0.5) * 0.02, -9.0)
    M = np.where(inside, FLAG, 0)
    # the walls: north, south, east (with the altar inside it), west (the door); each broken down course by course
    walls = [(-hx, -hy, hx, -hy), (-hx, hy, hx, hy), (hx, -hy, hx, hy), (-hx, -hy, -hx, hy)]
    full = list(full)                                                 # what each still stands to at its best (yd): an
                                                                      # ancient church of the old road, true scale
    wid = np.full(X.shape, -1)
    U = np.zeros(X.shape)
    for k, (ax, ay, bx, by) in enumerate(walls):
        L = np.hypot(bx - ax, by - ay)
        dx, dy = (bx - ax) / L, (by - ay) / L
        u = (X - ax) * dx + (Y - ay) * dy
        v_ = -(X - ax) * dy + (Y - ay) * dx
        m = (u > -thick / 2) & (u < L + thick / 2) & (np.abs(v_) < thick / 2)
        # the break: high at one end, stepping down course by course, a gap where it fell right out
        prof = full[k] * (0.55 + 0.45 * np.cos(np.clip(u / L, 0, 1) * np.pi * rr.uniform(0.8, 1.6) + rr.uniform(0, 3)))
        prof = prof + (fbm(u * 0.6 + k * 7, 3) - 0.5) * 1.6
        prof = np.floor(np.clip(prof, 0.3, None) / COURSE) * COURSE
        # each block of the top course loose or gone on its own
        bi = np.floor(u / 0.9 + (np.floor(prof / COURSE) % 2) * 0.5)
        loose = np.floor(vn(bi * 0.53 + k * 3.1, 1) ** 1.5 * 3.6)              # each block of the top gone or not, 0-3 courses
        prof = prof - loose * COURSE * (vn(bi * 1.7 + k, 2) > 0.35)
        if k == 3:                                                    # the west door: its arch fell
            door = np.abs(u - L / 2) < 0.8                            # a door 1.6 yd wide
            prof = np.where(door, 0.0, prof)
        if k == 1:                                                    # a window broken through the south wall
            win = (np.abs(u - L * 0.62) < 0.75) & (prof > 3.6)
            prof = np.where(win, np.minimum(prof, 2.2), prof)
        h = np.where(m, np.maximum(prof, 0.0), -9.0)
        upd = m & (h > H)
        H = np.where(upd, h, H)
        M = np.where(upd, BLOCK, M)
        wid = np.where(upd, k, wid)
        U = np.where(upd, u, U)
    # the door's threshold: two worn steps up into the nave, and the arch's stones lying where they fell
    for s_ in range(2):
        st = (np.abs(Y) < 1.1) & (X < -hx - thick / 2 + 0.05 - s_ * 0.45) & (X > -hx - thick / 2 - 0.45 - s_ * 0.45)
        H = np.where(st, np.maximum(H, 0.24 - s_ * 0.12), H)
        M = np.where(st & (H <= 0.25), STEP, M)
    piers = []
    for side in (-1, 1):                                              # two rows of piers, all snapped but one
        for j in range(4):
            cx, cy = -hx + length * (0.22 + j * 0.19), side * (hy - 2.2)
            r = 0.5
            tall = (side == 1 and j == 1)
            h0 = 8.5 if tall else rr.uniform(0.8, 4.2)
            # stone breaks on a plane: the top sheared off at a tilt, a little rough along the fracture
            ta = rr.uniform(0, 2 * np.pi)
            tilt = rr.uniform(0.35, 0.9)
            top = h0 + ((X - cx) * np.cos(ta) + (Y - cy) * np.sin(ta)) * tilt + (vn((X - cx) * 9 + j, (Y - cy) * 9) - 0.5) * 0.08
            d = np.hypot(X - cx, Y - cy)
            m = d < r
            H = np.where(m, np.maximum(H, top), H)
            M = np.where(m, PIER, M)
            # its foot: a square plinth half a yard high, a round moulding on it
            plinth = (np.maximum(np.abs(X - cx), np.abs(Y - cy)) < r + 0.24) & ~m
            H = np.where(plinth, np.maximum(H, 0.5), H)
            M = np.where(plinth, PIER, M)
            torus = (d < r + 0.11) & ~m
            H = np.where(torus, np.maximum(H, 0.5 + np.sqrt(np.clip(0.11 ** 2 - (d - r) ** 2, 0, None)) * 1.4), H)
            M = np.where(torus, PIER, M)
            piers.append((cx, cy, r, tall))
    # the altar: one long block at the east end, its top split
    alt = (np.abs(X - (hx - 1.8)) < 0.5) & (np.abs(Y) < 1.2)            # an altar a yard high, a man's reach
    H = np.where(alt, np.maximum(H, 1.0 - (np.abs(Y) < 0.06) * 0.2), H)
    M = np.where(alt, ALTAR, M)
    # fallen stones: the arch's voussoirs on the threshold, blocks fallen outward from the breaks, half in the litter
    blocks = []
    for k in range(int(rr.integers(22, 30))):
        if k < 5:                                                     # the arch's stones, fallen to either side of the
            cx, cy = -hx - rr.uniform(0.9, 2.6), rr.choice([-1, 1]) * rr.uniform(1.1, 2.4)   # door; its way kept clear
        else:
            side = rr.choice([-1, 1])
            cx, cy = rr.uniform(-hx, hx), side * (hy + rr.uniform(0.9, 3.2))
        a = rr.uniform(0, np.pi)
        sx, sy = rr.uniform(0.45, 0.85), rr.uniform(0.3, 0.45)
        lx = (X - cx) * np.cos(a) + (Y - cy) * np.sin(a)
        ly = -(X - cx) * np.sin(a) + (Y - cy) * np.cos(a)
        m = (np.abs(lx) < sx / 2) & (np.abs(ly) < sy / 2)
        top = rr.uniform(0.18, 0.4) - (np.abs(lx) > sx / 2 - 0.05) * 0.04 - (np.abs(ly) > sy / 2 - 0.05) * 0.04   # worn corners
        H = np.where(m, np.maximum(H, top), H)
        M = np.where(m, RUBBLE, M)
        blocks.append((cx, cy, a, sx, sy))
    F.H, F.M, F.W, F.U = H, M, wid, U
    info = dict(seed=seed, length=length, width=width, thick=thick, walls=walls, piers=piers, blocks=blocks,
                door=(-hx - thick / 2 - 0.9, 0.0), crypt=(rr.uniform(-1.0, 1.5), rr.uniform(-0.8, 0.8)), full=full)
    return F, info
