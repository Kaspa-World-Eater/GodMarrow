"""A night scene in the Hollow Wood: a chapel of the old road, older than the Wood (Derek 2026-10-07: "another old
growth scene, night, a ruined ancient building overgrown with vines, old growth, extreme detail and cinematography,
the works"). Built on the judge scene's engine (wood_scene.py: one height-field world, ray-cast, the moon and the
lantern each casting shadows, the living layers) through its hooks; the ruin's form is the landkit generator
tools/landkit/ruin.py, stamped into the world as the rocks are.

THE BRIEF, from the Hollow Wood's lore (docs/wiki/02-world-and-lore.md, 11-codex-voices.md, the hunter):
- The trees are the god's veins stood up as pale trees, warm a hand's depth in; every root combed one way.
- "The roads were there first, and the Wood grew away from them the way skin grows away from a nail": the great
  trees stand back from the chapel's walls, a ring of bare earth round its foundations where their roots turned aside.
  The stones themselves are not the Wood's: moss on every top, dark creepers hanging down the faces.
- The three lights on the ground: white caps where the ground is sound (along the walls outside), blue caps in a ring
  on the nave floor (something hollow under it: a crypt), red caps in the altar's split (the god still bleeding).
- Every tenth trunk holds something the god was carrying: the tree by the door holds a candle, still lit, the bark
  drawn back from its flame. It is the scene's warm light, with the pilgrim's lantern.
- Roofless: the moon falls into the nave in shafts through the mist; the night air deepens behind.
- The Ossuarch stands on the threshold, among the stones of the fallen arch.

  python tools/art_study/ruin_scene.py OUT.png|OUT.webp
"""
import os
import sys
import numpy as np
from scipy import ndimage as nd
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "landkit"))
import wood_scene as ws                      # noqa: E402
import ruin                                  # noqa: E402
import bark                                  # noqa: E402
from wood_ecosystem import vn, fbm           # noqa: E402

C = np.array([15.0, 13.0])                   # the church's centre in the wood's plan
SEED = 3
ws.FOCUS = np.array([13.0, 17.0])
ws.HERO = np.array([15.0, 22.15])            # on the threshold, among the arch's fallen stones

R_STONE = ws.ramp("#131218", "#211f28", "#312e37", "#443f46", "#5a5455", "#726a66", "#8d8379", "#a69a8b")
R_MOSSW = ws.ramp("#0a110f", "#111c15", "#18281a", "#20341e", "#2c4423", "#3b5529", "#4d6731")
R_IVY = ws.ramp("#070c0b", "#0d1712", "#142216", "#1c2f1a", "#283e1f", "#365027")
R_PALE = ws.ramp("#16131a", "#28232a", "#3d3639", "#554c4b", "#6f655f", "#8b7f75", "#a89a8c", "#c2b5a3")
R_VEIN = ws.ramp("#1d1218", "#33202a", "#4d3036", "#694643")

# the walls toward the camera broken low, the far ones standing high: the eye looks in (walls: 0 and 2 far, 1 and 3,
# the door's, near)
FR, FI = ruin.chapel(SEED, full=(9.0, 2.6, 8.0, 3.6))


def to_local(x, y):
    """world -> the chapel's own frame (its length runs along world y; the door faces the viewer, +y)"""
    return -(y - C[1]), (x - C[0])


def footprint_dist(x, y):
    lx, ly = to_local(x, y)
    hx, hy = FI["length"] / 2 + FI["thick"] / 2, FI["width"] / 2 + FI["thick"] / 2
    return np.maximum(np.abs(lx) - hx, np.abs(ly) - hy)              # < 0 inside the walls' outer line


def clear_plan(w):
    """the Wood stands back from what hands laid: no trunk, log or stone within the walls or the ring round them;
    the canopy open over the roofless nave"""
    keep = lambda x, y, r: footprint_dist(np.array(x), np.array(y)) > r
    w.trees = [t for t in w.trees if keep(t[0], t[1], 2.2)]
    # the forest towers (Derek: small trees mostly dead): the young become snags or go
    w.trees = [((t[0], t[1], "snag", 0.45, 0.0) if t[2] == "young" and int(t[0] * 7 + t[1] * 3) % 3 == 0 else t)
               for t in w.trees if t[2] != "young" or int(t[0] * 7 + t[1] * 3) % 3 == 0]
    # the tenth trunk by the door, in the frame: it holds the candle
    w.trees.append((C[0] - 3.4, C[1] + FI["length"] / 2 + 2.4, "middle", 0.5, 5.0))
    logs = []
    for lg in w.logs:
        ax, ay, bx, by = lg[:4]
        pts = [(ax + (bx - ax) * f, ay + (by - ay) * f) for f in np.linspace(0, 1, 30)]
        reach_ = 2.6 if lg[6] else 0.8                               # a root plate stands tall: keep it off the door
        near_door = min(np.hypot(px_ - ws.HERO[0], py_ - ws.HERO[1]) for (px_, py_) in pts) < (5.0 if lg[6] else 3.0)
        if all(keep(px_, py_, reach_) for (px_, py_) in pts) and not near_door:
            logs.append(lg)
    w.logs = logs
    w.rocks = [r for r in w.rocks if keep(r[1], r[2], 1.5)]
    fd = footprint_dist(w.X, w.Y)
    open_ = np.clip(1 - fd / 3.0, 0, 1)
    w.light = w.light * (1 - open_) + 0.42 * open_                  # a clearing at night is still dim; the shafts carry it
    w.gap = (C[0] - 0.4, C[1] - 0.6, 4.0)
    for name in ("fern", "sapl", "shrooms", "grass"):
        a = getattr(w, name, None)
        if isinstance(a, np.ndarray) and a.dtype == bool:
            setattr(w, name, a & (fd > 1.8))


def stamp(W, w):
    """the chapel into the built world: its heights over the ground, its tag (600), its materials; the bare ring"""
    X, Y = W["X"], W["Y"]
    lx, ly = to_local(X, Y)
    inside = (np.abs(lx) < FR.half) & (np.abs(ly) < FR.half)
    fh = np.where(inside, FR.at(FR.H, lx, ly), -9.0)
    fm = np.where(inside, FR.at(FR.M, lx, ly, 0), 0)
    gi = int((C[1] - W["y0"]) / ws.RES), int((C[0] - W["x0"]) / ws.RES)
    base = float(W["H"][gi])
    m = fh > -1.0
    H = W["H"].copy()
    H = np.where(m, np.maximum(H, base + fh), H)
    W["H"] = H
    W["Hrest"] = np.where(W["HT"] > -40, W["Hrest"], H)
    W["Hrest"] = np.where(m, np.maximum(W["Hrest"], base + fh), W["Hrest"])
    W["tag"] = np.where(m, 600, W["tag"])
    W["RU"] = np.where(m, fm, 0)
    W["obj"][600] = dict(kind="ruin", base=base)
    fd = footprint_dist(X, Y)
    ring = (fd > 0) & (fd < 1.6 + (fbm(X * 1.5, Y * 1.5) - 0.5) * 0.8) & (W["tag"] == 0)
    W["mat"] = np.where(ring, 2, W["mat"])                            # bare earth: the roots turned aside


def stone_value(v, a, b, c):
    """per-block tone, from a hash of its indices"""
    return (np.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1.0


_TILES = {}


def paint_ruin(img, m, v, n, px, py, pz, o, W, L):
    side = L["side"]
    lx, ly = to_local(px, py)
    RU = ws.look(W, W["RU"], px, py)
    wid = FR.at(FR.W, lx, ly, -1)
    U = FR.at(FR.U, lx, ly, 0.0)
    h = pz - o["base"]
    top_h = FR.at(FR.H, lx, ly, 0.0)
    bay = ws.tw.B4[(np.arange(m.shape[0])[:, None] % 4), (np.arange(m.shape[1])[None, :] % 4)]
    sv = np.minimum(v * 0.95 + 0.04, 0.74)                               # stone keeps its coursing even in the lantern's glare
    # ---- walls: ancient ashlar in the wall's own coordinates. Courses even (the masons kept their levels), but each
    # block its own length and its joints where they fell; edges worn round by centuries; each block its own stone,
    # warmer or cooler; some faces spalled where the skin fell away; water stains running down from the broken tops;
    # lichen blooming on the faces the moon finds
    wall = m & (RU == ruin.BLOCK)
    course = np.floor(h / ruin.COURSE)
    fh = h / ruin.COURSE - course
    # block joints: a run of lengths per course, from a hashed walk along it (0.55..1.5 yd)
    cu = U + stone_value(0, course, wid, 3) * 1.7                      # each course starts its run elsewhere
    seg = np.floor(cu / 0.52)
    starts = (stone_value(0, seg, course, 23) > 0.42)                 # where a joint falls
    fseg = cu / 0.52 - seg
    joint_v = starts & (fseg < 0.13)
    bid = np.where(starts, seg, seg - 1) + course * 131 + wid * 977
    jit = (stone_value(0, bid, 1, 1) - 0.5) * 0.14
    warm = stone_value(0, bid, 2, 5)                                  # some blocks warmer, some colder
    edge_round = np.clip(1 - np.minimum(fh, 1 - fh) / 0.16, 0, 1) ** 2  # worn edges darken toward the joint
    joint_h = fh < 0.08 + (vn(U * 6, course) - 0.5) * 0.06            # the bed joint, uneven where mortar fell out
    joint = joint_h | joint_v
    spall = (stone_value(0, bid, 3, 9) > 0.86) & (vn(U * 5, h * 5) > 0.45)   # the skin fallen off a face
    tex = (vn(U * 6, h * 6) - 0.5) * 0.05 + (vn(U * 20, h * 20) - 0.5) * 0.03
    pits = (vn(U * 34, h * 34) > 0.86) * -0.06
    wv = sv + jit + tex + pits - edge_round * 0.07 + (fh > 0.84) * 0.05 - spall * 0.09
    face = wall & side
    idx = np.clip((wv * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)
    col = R_STONE[idx]
    col = col * np.where((warm > 0.66)[..., None], np.array([1.05, 1.0, 0.93]), np.where((warm < 0.25)[..., None], np.array([0.94, 0.98, 1.06]), 1.0))
    img[face] = col[face]
    jm = face & (joint_h | joint_v)
    jm = jm & ~(joint_h & (vn(U * 4 + course, course * 1.3) > 0.62))  # where the mortar has gone the courses run together
    img[jm] = R_STONE[np.clip(((sv - 0.17) * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][jm]   # pigment pooled in the joint
    spl = face & spall & (fh < 0.22) & ~jm                           # a spall's lower lip catches the light
    img[spl] = np.minimum(img[spl] * 1.15, 1)
    # water stains: dark streaks running down from the broken tops, where rain has run for centuries
    stain = face & (vn(U * 7.5 + wid, 0.5) > 0.62) & ((top_h - h) < 0.6 + vn(U * 3, 2) * 2.6) & (vn(U * 7.5 + wid, h * 0.35) > 0.4)
    img[stain] = img[stain] * np.array([0.82, 0.84, 0.86])
    # lichen on the faces the moon finds: pale grey-green rosettes, a few rust ones
    lit_f = np.clip(n[..., 0] * ws.SUN[0] + n[..., 1] * ws.SUN[1], 0, 1)
    lich = face & (lit_f > 0.25) & (vn(U * 11 + 3, h * 11) > 0.84) & ~jm
    img[lich] = img[lich] * 0.55 + np.array([0.46, 0.5, 0.42]) * 0.45
    rust = face & (lit_f > 0.25) & (vn(U * 13 + 9, h * 13 + 4) > 0.9) & ~jm
    img[rust] = img[rust] * 0.5 + np.array([0.55, 0.36, 0.18]) * 0.5
    # the wall tops: rubble core under a cap of moss
    tops = wall & ~side & (vn(px * 4 + 2, py * 4) > 0.38)               # moss in patches on the broken tops, not a cap
    img[wall & ~side] = R_STONE[np.clip(((sv - 0.04 + (vn(px * 12, py * 12) - 0.5) * 0.1) * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][wall & ~side]
    img[tops] = R_MOSSW[np.clip(((v * 0.9 + (vn(px * 14, py * 14) - 0.5) * 0.14) * len(R_MOSSW)).astype(int), 0, len(R_MOSSW) - 1)][tops]
    peek = tops & (vn(px * 9 + 3, py * 9) > 0.74)
    img[peek] = R_STONE[np.clip(((v + 0.05) * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][peek]
    # moss creeping down from the top in tongues, and up from the foot in the joints
    tongue = 0.2 + vn(U * 2.6 + wid * 3, 1.0) ** 2 * 1.1
    drip = face & ((top_h - h) < tongue) & (vn(U * 7, h * 3) > 0.32)
    img[drip] = R_MOSSW[np.clip(((v * 0.85 + (vn(U * 16, h * 16) - 0.5) * 0.12) * len(R_MOSSW)).astype(int), 0, len(R_MOSSW) - 1)][drip]
    footm = face & (h < 0.7 + vn(U * 3, 2) * 0.5) & (joint | (vn(U * 10, h * 10) > 0.7))
    img[footm] = R_MOSSW[np.clip(((v * 0.8) * len(R_MOSSW)).astype(int), 0, len(R_MOSSW) - 1)][footm]
    # creepers: dark stems hanging down the faces from the tops, ivy leaves along them, lit where the moon finds them
    cell = np.floor(U / 0.42 + wid * 13)
    alive = stone_value(0, cell, wid, 7) > 0.45
    u0 = (cell - wid * 13 + 0.5) * 0.42 + np.sin(h * 2.6 + cell) * 0.08
    length = 0.8 + stone_value(0, cell, wid, 9) * 2.6
    hang = face & alive & ((top_h - h) < length)
    stem = hang & (np.abs(U - u0) < 0.035)
    leaf = hang & (np.abs(U - u0) < 0.17) & (vn(U * 15 + cell, h * 15) > 0.5) & (vn(U * 5, h * 5 + cell) > 0.35)
    lit_l = np.clip(n[..., 0] * ws.SUN[0] + n[..., 1] * ws.SUN[1], 0, 1)
    iv = v * 0.8 + (vn(U * 30, h * 30) - 0.5) * 0.12 + lit_l * 0.1
    img[leaf] = R_IVY[np.clip((iv * len(R_IVY)).astype(int), 0, len(R_IVY) - 1)][leaf]
    leaf_edge = leaf & ~np.roll(leaf, 1, axis=1) & (lit_l > 0.2)
    img[leaf_edge] = np.minimum(img[leaf_edge] * 1.35, 1)
    img[stem & ~leaf] = R_IVY[1]
    # ---- the piers: drums with their joints, flutes on the face, moss at the foot
    pier = m & (RU == ruin.PIER)
    # which pier, and where round it: the flutes are cut in its own frame
    pcx = np.zeros(lx.shape)
    pcy = np.zeros(lx.shape)
    best = np.full(lx.shape, 9.0)
    for (cx_, cy_, r_, tall_) in FI["piers"]:
        d_ = np.hypot(lx - cx_, ly - cy_)
        nb = d_ < best
        best = np.where(nb, d_, best)
        pcx, pcy = np.where(nb, cx_, pcx), np.where(nb, cy_, pcy)
    pang = np.arctan2(ly - pcy, lx - pcx)
    shaft = pier & (best < 0.52) & (h > 0.62)
    drum = np.floor((h - 0.62) / 0.7)
    pj = shaft & (((h - 0.62) / 0.7 - drum) < 0.07)
    flute = shaft & (np.cos(pang * 12) > 0.55)                        # twelve flutes: each groove turned from the light
    pv = sv + (stone_value(0, drum, pcx * 7 + pcy, 3) - 0.5) * 0.08 + (vn(pang * 3, h * 6) - 0.5) * 0.04
    pv = pv - flute * 0.1 + (shaft & (np.cos(pang * 12) < -0.6)) * 0.04
    img[pier] = R_STONE[np.clip((pv * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][pier]
    img[pj & side] = R_STONE[np.clip(((sv - 0.17) * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][pj & side]
    frac = pier & ~side & (best < 0.52) & (h > 0.7)                    # the fracture: fresher, paler stone, rough
    img[frac] = R_STONE[np.clip(((v + 0.08 + (vn(lx * 30, ly * 30) - 0.5) * 0.12) * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][frac]
    plin = pier & (best >= 0.52) & side                                 # the plinth's faces: one block each, worn
    img[plin] = R_STONE[np.clip(((sv - 0.04 + (vn(lx * 8, h * 8) - 0.5) * 0.08) * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][plin]
    pm = pier & ((~side & ~frac & (vn(lx * 9, ly * 9) > 0.35)) | (side & (h < 0.3 + vn(lx * 8, ly * 8) * 0.35)))
    img[pm] = R_MOSSW[np.clip(((v * 0.85) * len(R_MOSSW)).astype(int), 0, len(R_MOSSW) - 1)][pm]
    # ---- the nave floor: the game's own church-floor tile (tiles_ruin.church_flags), laid where the world puts it
    # (its screen position on the ground plane) and lit by this scene's moon, lantern and candle
    flag = m & (RU == ruin.FLAG)
    if "flags" not in _TILES:
        import tiles_ruin
        _TILES["flags"] = tiles_ruin.church_flags(seed=0)[0]
    T_ = _TILES["flags"]
    gx_s = ((px - py) * ws.KX) % T_.shape[1]
    gy_s = ((px + py) * ws.KY) % T_.shape[0]
    alb = T_[gy_s.astype(int) % T_.shape[0], gx_s.astype(int) % T_.shape[1]]
    lightk = np.clip(0.5 + v * 1.05, 0.35, 1.45)
    img[flag] = np.clip(alb[flag] * lightk[flag][:, None], 0, 1)
    # ---- steps, altar, fallen stones
    for mat_, darker in ((ruin.STEP, -0.02), (ruin.ALTAR, 0.0), (ruin.RUBBLE, -0.04)):
        mm = m & (RU == mat_)
        rv = sv + darker + (vn(px * 9, py * 9 + pz * 9) - 0.5) * 0.08
        img[mm] = R_STONE[np.clip((rv * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][mm]
        mtop = mm & ~side & (vn(px * 7 + mat_, py * 7) > (0.72 if mat_ == ruin.STEP else 0.5))   # steps: moss only in the cracks
        img[mtop] = R_MOSSW[np.clip(((v * 0.85) * len(R_MOSSW)).astype(int), 0, len(R_MOSSW) - 1)][mtop]
    worn = m & (RU == ruin.STEP) & ~side & (np.abs(lx - (-FI["length"] / 2 - 0.6)) < 1.0) & (np.abs(ly) < 0.5)
    img[worn] = np.minimum(img[worn] * 1.12, 1)                     # the treads worn pale in their middle
    return img


def pale_bark(img, m, v, n, px, py, pz, o, along=None, arc=None, lichen=True):
    """the Hollow Wood's trees in this scene: the same bark as the game's towering trees (tools/landkit/bark.py,
    twelve graded passes), at each tree's own girth, lit by this scene's moon, lantern and candle"""
    if along is None:
        ang = np.arctan2(py - o["c"][1], px - o["c"][0])
        arc = ang * o["r"]
        W = _WORLD["W"]
        ground = float(ws.look(W, W["Hrest"], np.array(o["c"][0]), np.array(o["c"][1])))
        along = pz - ground
    bole = m & (n[..., 2] < 0.35) & (along > 0.9)                       # its round side, above the flare
    seed = int(abs(o["c"][0] * 131 + o["c"][1] * 71)) % 997
    form = bark.form_value(n, ws.SUN)
    vb = np.clip(form * (0.55 + v * 0.75), 0, 0.99)                     # the pale form, under this scene's own light
    vb = vb * (1 - np.clip((along - 5.0) / 14.0, 0, 0.32))                # climbing into the canopy's shade
    img, _ = bark.paint(img, m, bole, vb, n, arc, along, max(o["r"], 0.25), seed, ws.SUN,
                        scar_band=(2.5, 11.0), top=18.0)
    return img


_WORLD = {}


def keep_world(W, w):
    _WORLD["W"] = W


# the tenth trunk by the door: a candle in its bark, still lit
CANDLE_TREE = None


def place_candle(w):
    global CANDLE_TREE
    door = np.array([C[0], C[1] + FI["length"] / 2 + 1.0])
    best = w.trees[-1]                                                  # the tenth trunk set by the door
    ang = np.arctan2(ws.FOCUS[1] + 6 - best[1], ws.FOCUS[0] + 6 - best[0])   # on the side toward the viewer
    CANDLE_TREE = (best[0] + np.cos(ang) * best[3], best[1] + np.sin(ang) * best[3], 1.55)


def candle_light(W, w):
    if CANDLE_TREE is not None:
        gx, gy, z = CANDLE_TREE
        base = float(ws.look(W, W["H"], np.array(gx), np.array(gy)))
        ws.LIGHTS.append((gx, gy, base + z + 0.12, 1.6))


def living_ruin(img, w, W, px, py, pz, L, T):
    """the candle, the three caps' lights"""
    GH, GW = img.shape[:2]
    dep_px = px + py
    def put(x, y, z, col, a=1.0):
        sx, sy = ws.to_px((x, y, z))
        ix, iy = int(round(sx)), int(round(sy))
        if 0 <= iy < GH and 0 <= ix < GW and dep_px[iy, ix] <= x + y + 0.25:
            img[iy, ix] = img[iy, ix] * (1 - a) + np.array(col) * a
    # the candle in the tenth trunk: the niche the bark drew back from, wax run down, the flame
    if CANDLE_TREE is not None:
        gx, gy, z = CANDLE_TREE
        base = float(ws.look(W, W["H"], np.array(gx), np.array(gy)))
        for dz in np.arange(-0.25, 0.38, 0.05):
            for dl in np.arange(-0.16, 0.17, 0.05):
                if (dl / 0.16) ** 2 + (dz / 0.36) ** 2 < 1:
                    put(gx + dl * 0.7, gy - dl * 0.7, base + z + dz, (0.05, 0.03, 0.03), 0.92)
        for dz in np.arange(-0.2, 0.05, 0.05):
            put(gx, gy, base + z + dz, (0.86, 0.8, 0.66))
        for k in range(3):
            put(gx + 0.04 * (k - 1), gy - 0.04 * (k - 1), base + z - 0.25 - k * 0.08, (0.8, 0.74, 0.6))
        fl = 0.5 + 0.5 * np.sin(T * 6.28 * 3) * np.sin(T * 6.28 * 7 + 1)
        put(gx, gy, base + z + 0.06, (0.35, 0.45, 0.9))            # the blue root of the flame
        put(gx, gy, base + z + 0.11, (1.0, 0.86, 0.52))
        put(gx, gy, base + z + 0.16 + fl * 0.04, (1.0, 0.72, 0.3))
        put(gx + 0.02 * np.sin(T * 6.28 * 5), gy, base + z + 0.22 + fl * 0.05, (0.9, 0.42, 0.15), 0.7)
        # its light on the bark round it: a warm halo, stepped and dithered, breathing with the flame
        csx, csy = ws.to_px((gx, gy, base + z + 0.12))
        for dy_ in range(-7, 8):
            for dx_ in range(-6, 7):
                d_ = np.hypot(dx_, dy_ * 0.9)
                ix, iy = int(round(csx)) + dx_, int(round(csy)) + dy_
                if 1.5 < d_ < 7 and 0 <= iy < GH and 0 <= ix < GW and dep_px[iy, ix] <= gx + gy + 0.6:
                    k_ = (1 - d_ / 7) ** 1.6 * (0.8 + 0.2 * fl)
                    if k_ > 0.12 + ((ix * 3 + iy * 5) % 4) * 0.06:
                        img[iy, ix] = np.minimum(img[iy, ix] * (1 + k_ * 0.9) + np.array([0.09, 0.05, 0.0]) * k_, 1)
    # the three caps: white along the walls outside (sound ground), blue in a ring over the crypt, red in the altar
    rr = np.random.default_rng(31)
    hx, hy = FI["length"] / 2, FI["width"] / 2
    caps = []
    for k in range(26):
        s = rr.uniform(-1, 1)
        side_ = rr.integers(0, 4)
        if side_ < 2:
            lx_, ly_ = s * hx, (hy + 0.7 + rr.uniform(0, 0.8)) * (1 if side_ == 0 else -1)
        else:
            lx_, ly_ = (hx + 0.7 + rr.uniform(0, 0.8)) * (1 if side_ == 2 else -1), s * hy
        if side_ == 3 and abs(ly_) < 1.4:
            continue
        caps.append((lx_, ly_, (0.82, 0.84, 0.8)))
    cx_, cy_ = FI["crypt"]
    for k in range(18):
        a = k / 18 * 6.283 + rr.normal(0, 0.08)
        caps.append((cx_ + np.cos(a) * 0.95, cy_ + np.sin(a) * 0.95, (0.42, 0.62, 1.0)))
    for k in range(4):
        caps.append((hx - 1.8 + rr.uniform(-0.1, 0.1), rr.uniform(-0.1, 0.1), (0.95, 0.25, 0.2)))
    breathe = 0.85 + 0.15 * np.sin(T * 6.28)
    for (lx_, ly_, col) in caps:
        x, y = C[0] + ly_, C[1] - lx_
        base = float(ws.look(W, W["H"], np.array(x), np.array(y)))
        put(x, y, base + 0.04, tuple(np.array(col) * 0.6), 1.0)
        put(x, y, base + 0.09, col, 0.9 * breathe)
        sx, sy = ws.to_px((x, y, base))
        for dx_, dy_ in ((-1, 0), (1, 0), (0, 1), (-1, 1), (1, 1)):
            ix, iy = int(round(sx)) + dx_, int(round(sy)) + dy_
            if 0 <= iy < GH and 0 <= ix < GW and (ix + iy) % 2 == 0 and dep_px[iy, ix] <= x + y + 0.3:
                img[iy, ix] = np.minimum(img[iy, ix] + np.array(col) * 0.07 * breathe, 1)
    return img


ws.paint_bark = pale_bark
ws.GROUND_LIFE_OK = lambda x, y: bool(footprint_dist(np.array(x), np.array(y)) > 2.4)   # the bare ring stays bare
ws.RIM = (1.12, (0.01, 0.015, 0.035))                                # a soft, cool moon edge on the pale trunks
ws.WOOD_HOOKS += [clear_plan, place_candle]
ws.BUILD_HOOKS += [stamp, candle_light, keep_world]
ws.PAINTERS["ruin"] = paint_ruin
ws.LIVING.append(living_ruin)

if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "ruin_scene.png"
    ws.animate(o) if o.endswith(".webp") else ws.main(o)
