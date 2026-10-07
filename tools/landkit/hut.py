"""The huts of Cap Hollow (landkit). THE LORE: "a hamlet of four fungus-picking families in the Hollow Wood, next to
the hunter's hollow under the Ribcage Bough" (docs/wiki/12-lore-notes.md, the hunter's interview). The pickers "never
cut" the living trunks, so a picker's hut is built of what the Wood lets fall: a footing of dry-laid fieldstone, walls
of bark slabs and root-wood stacked between corner posts of old fallen limb, a steep roof of bark shingles weighted
with stones. Now derelict: the families are gone; one end of the roof has caved into the dark inside, its shingles
slid to the ground; the door is gone from its gap; the strings where caps were hung to dry still sag under the eaves.

True scale: about 4 x 3 yd, the walls 1.7 yd, the ridge 2.6 yd; a man stoops at the door.

  F, info = hut(seed)     F.H heights, F.M materials, F.U (distance along its wall), F.W (wall id)
"""
import numpy as np
from kit import Field, vn, fbm

FOOT, WALL, POST, ROOF, HOLE, SHINGLE, SILL, RAFTER, RIDGE, FLOORI, DOOR = 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11


def hut(seed=1, length=4.0, width=3.0, wall_h=1.7, ridge=2.6):
    rr = np.random.default_rng(seed)
    F = Field(max(length, width) / 2 + 1.4, res=0.025)
    X, Y = F.X, F.Y
    hx, hy, th = length / 2, width / 2, 0.22
    H = np.full(X.shape, -9.0)
    M = np.zeros(X.shape, int)
    # the floor inside: packed earth, in its own dark
    flr = (np.abs(X) < hx) & (np.abs(Y) < hy)
    H = np.where(flr, 0.03, H)
    M = np.where(flr, FLOORI, M)
    W = np.full(X.shape, -1)
    U = np.zeros(X.shape)
    # the walls: a stone footing to 0.45, bark slabs above; each wall its own sag; the door's gap in the front (+y)
    walls = [(-hx, -hy, hx, -hy), (hx, -hy, hx, hy), (hx, hy, -hx, hy), (-hx, hy, -hx, -hy)]
    door_u = rr.uniform(0.35, 0.6) * length
    for k, (ax, ay, bx, by) in enumerate(walls):
        L = np.hypot(bx - ax, by - ay)
        dx, dy = (bx - ax) / L, (by - ay) / L
        u = (X - ax) * dx + (Y - ay) * dy
        v_ = -(X - ax) * dy + (Y - ay) * dx
        m = (u > -th) & (u < L + th) & (np.abs(v_) < th / 2 + 0.02)
        sid = np.floor(u / 0.42 + np.sin(u * 1.7 + k) * 0.25)
        top = wall_h - (fbm(u * 0.8 + k * 5, 2) - 0.5) * 0.35 - np.clip(np.sin(u / L * np.pi) * 0.12, 0, 1) \
            + ((np.sin(sid * 7.3 + k) * 4375.5) % 1.0 - 0.5) * 0.22        # each upright slab its own ragged top
        if k == 2:
            top = np.where(np.abs(u - door_u) < 0.42, 0.0, top)          # the doorway: the door gone
        upd = m & (top > H)
        H = np.where(upd, top, H)
        M = np.where(upd, np.where(top < 0.05, SILL, WALL), M)
        W = np.where(upd, k, W)
        U = np.where(upd, u, U)
    # corner posts of old fallen limb, a hand above the walls
    for (cx, cy) in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)):
        d = np.hypot(X - cx, Y - cy)
        m = d < 0.15
        H = np.where(m, np.maximum(H, wall_h + 0.15 + rr.uniform(-0.1, 0.1)), H)
        M = np.where(m, POST, M)
    # the footing shows below the slabs: the wall pixels low down are stone (painted by height, see M FOOT band)
    # the roof: a steep gable along the length; its east end caved into the dark inside
    inside = (np.abs(X) < hx + 0.25) & (np.abs(Y) < hy + 0.3)
    roof = wall_h + (hy + 0.3 - np.abs(Y)) * ((ridge - wall_h) / (hy + 0.3)) + (vn(X * 3, Y * 3) - 0.5) * 0.05
    cave_x = rr.uniform(0.0, 0.8)
    sag = np.clip((X - cave_x) / (hx - cave_x + 0.25), 0, 1)            # the cave-in, deepening toward the end
    roof = roof - sag ** 1.4 * (ridge + 0.4)
    hole = inside & (sag > 0.35) & (np.abs(Y) < hy - 0.15) & (np.abs(X) < hx - 0.1)
    roof_m = inside & ~hole & (roof > 0.3)
    H = np.where(roof_m, np.maximum(H, roof), H)
    M = np.where(roof_m & (roof >= H - 1e-6), ROOF, M)
    # the ridge log along the top
    rlog = inside & ~hole & (np.abs(Y) < 0.1) & (np.abs(X) < hx + 0.3)
    rz = ridge + 0.06 - sag ** 1.4 * (ridge + 0.4)
    H = np.where(rlog & (rz > H), rz, H)
    M = np.where(rlog & (rz >= H - 1e-6), RIDGE, M)
    # the rafters across the hole: poles snapped short at different lengths, sagging toward the break
    roof0 = wall_h + (hy + 0.3 - np.abs(Y)) * ((ridge - wall_h) / (hy + 0.3))
    for j, rx_ in enumerate(np.arange(cave_x + 0.25, hx, 0.55)):
        reach = rr.uniform(0.25, 0.85) * (hy + 0.3)
        side_ = rr.choice([-1, 1])
        pole = (np.abs(X - rx_) < 0.05) & (side_ * Y > hy + 0.3 - reach) & (side_ * Y < hy + 0.3) & hole
        pz_ = roof0 - np.clip((hy + 0.3 - side_ * Y) / reach, 0, 1) ** 2 * 0.5
        H = np.where(pole, np.maximum(H, pz_), H)
        M = np.where(pole, RAFTER, M)
    # inside the hole: the dark floor, the fallen shingles heaped in it
    H = np.where(hole, np.maximum(np.where(H > -1, H, -9), 0.05 + (vn(X * 6, Y * 6) > 0.6) * 0.15), H)
    M = np.where(hole & (M != WALL) & (M != POST) & (M != RAFTER), HOLE, M)
    # shingles slid off the caved end, lying on the ground beside it
    for k in range(int(rr.integers(10, 16))):
        sx, sy = hx + rr.uniform(0.1, 1.1), rr.uniform(-hy - 0.4, hy + 0.4)
        a = rr.uniform(0, np.pi)
        lx = (X - sx) * np.cos(a) + (Y - sy) * np.sin(a)
        ly = -(X - sx) * np.sin(a) + (Y - sy) * np.cos(a)
        m = (np.abs(lx) < 0.22) & (np.abs(ly) < 0.12) & (H < 0.06)
        H = np.where(m, 0.04 + rr.uniform(0, 0.03), H)
        M = np.where(m, SHINGLE, M)
    # the door: broken, each its own way (hanging ajar from its last hinge, fallen across the threshold, leaning in its
    # frame); a plank slab of bark the height of a stooping man
    kind = ["ajar", "fallen", "leaning"][seed % 3]
    hx_d = -hx + door_u                                               # the doorway's middle on the front wall (y = +hy)
    if kind == "ajar":
        a = rr.uniform(0.7, 1.1)
        hpx, hpy = hx_d - 0.42, hy
        t = (X - hpx) * np.cos(a) + (Y - hpy) * np.sin(a)
        nrm = -(X - hpx) * np.sin(a) + (Y - hpy) * np.cos(a)
        dm = (t > 0) & (t < 0.82) & (np.abs(nrm) < 0.04)
        H = np.where(dm, np.maximum(H, 1.55), H)
        M = np.where(dm, DOOR, M)
    elif kind == "fallen":
        dm = (np.abs(X - hx_d) < 0.42) & (Y > hy + 0.12) & (Y < hy + 1.7)
        H = np.where(dm & (H < 0.07), 0.07, H)
        M = np.where(dm, DOOR, M)
    else:
        dm = (np.abs(X - hx_d - 0.15) < 0.36) & (np.abs(Y - hy + 0.15) < 0.05)
        H = np.where(dm, np.maximum(H, 1.3), H)
        M = np.where(dm, DOOR, M)
    # the windows: one in each end wall and one in the back, broken (painted on the wall's face: a dark opening, its frame,
    # its split shutter; a height field cannot hollow a wall under its lintel)
    windows = [(0, length * rr.uniform(0.35, 0.65)), (1, width * 0.5), (3, width * 0.5)]
    F.H, F.M, F.W, F.U = H, M, W, U
    return F, dict(windows=windows, door=kind, seed=seed, length=length, width=width, wall_h=wall_h, ridge=ridge, door_u=door_u, cave_x=cave_x)
