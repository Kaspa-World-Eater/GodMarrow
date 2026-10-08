"""The Sunken Bog and the Long Back (study scene; log `tools/landkit/passes/spine_path.md`). The spine of a long-dead
serpent god lies winding through the bog and the people walk it as a causeway: "the Long Back", "Saint Uss's
Causeway", "Old Coil", "the Stair of the Drowned King", all half remembered and all wrong. Derek 2026-10-08: "an
ancient spine path ... covered in algae and dirt and mud ... wind[ing] through a swampy bog ... blackish mirror like
water that reflects ... wide enough for some free movement but also restrictive ... lots of plant life ... the
vertebrae sometimes poking through". The water's look is the Famine's (painted_swamp_god.py).

Built on the wood's engine (wood_scene.py) through its hooks, under MASTER_RULES: the Back, the bed and the hummocks
are height in the world (the depth effect, landkit serpent_spine.py, fen_ground.py); the colour is material only.

  python tools/art_study/bog_scene.py OUT.png [value]      value: the value-only test (rule 0.4), one grey material
"""
import os
import sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "landkit"))
import wood_scene as ws                      # noqa: E402
import serpent_spine                         # noqa: E402
import fen_ground                            # noqa: E402
import bog_plants                            # noqa: E402
import wisp_fire                             # noqa: E402
import drowned                               # noqa: E402
import vein_tree                             # noqa: E402
import fog as foggen                         # noqa: E402
import bone as bonegen                       # noqa: E402
import bog_structures                        # noqa: E402
import bog_causeway                          # noqa: E402

# hooks for the chamber scenes (art_study/bog_chambers.py): the bog's own scenes are this one with these filled
BED_MODS = []          # f(X, Y, bed) -> bed: the ground the chamber shapes (a shelf, a socket, a skull) before the Back
STRUCTS = []           # landkit bog_structures items: ("stump", ...), ("snag", ...), ("post", ...)
EXTRA_STAMPS = []      # f(X, Y, H, W) -> (H, part): more pieces (the hut, the ruins), part codes 40-79 painted by EXTRA_PAINT
EXTRA_PAINT = []       # f(img, W, px, py, pz, L, v, gl, part) -> img: their paint
EXTRA_LIVING = []      # more living layers (vines, tendrils, a pustule, the hut's fire)
from scipy.spatial import cKDTree            # noqa: E402
from kit import ramp, vn, fbm                # noqa: E402

C = np.array([20.0, 20.0])
AX = np.array([1.0, 1.0]) / np.sqrt(2)       # toward the viewer (down the screen)
PERP = np.array([1.0, -1.0]) / np.sqrt(2)    # across (screen right)
LEVEL = 0.0                                  # the bog's water table
VALUE_ONLY = False
LINES = []                                   # several walks (a maze window, worldgen/bog.py); LINE alone otherwise
CAUSEWAYS = []                               # the bog folk's board causeways: lines (landkit bog_causeway.py)
RIBWALKS = []                                # the great ribs walked as bridges of bone: lines (bog_causeway.rib_walk)
# the game's bake (worldgen/bog_bake.py) paints a whole zone in chunks, so nothing may hang on the frame:
FRAME_SHELF = True     # the study frame's marsh shelf rising toward its back (off: the land is only what the map says)
LINE_SEEDS = None      # each walk's own seed (its index in the whole maze), not its place in this window's list
LINE_ENDS = None       # per walk: (start, end) free ends that dive under the bog (serpent_spine.stamp sink_ends)
CAUSEWAY_SEEDS = None
RIB_SEEDS = None
PLACE_CELL = None      # yards: plants and loose bone placed per world cell, each cell its own seed (no seam between chunks)
THIN_NEAR = True       # thin the tall stems toward the camera (a framed still; the game's ground keeps them all)

ws.FOCUS = C.copy()
for _f in ("FOREST_LIFE", "MIST", "BEAMS", "GRASS", "FERNS", "LITTER_GEN", "LEAF_FALL"):
    setattr(ws, _f, False)
ws.NORMAL_BLUR = 0.0
ws.AIR = (16.0, 0.22)                        # open bog: the air thins slower and never veils the far bone
ws.AUTO_WARP = False
ws.HERO = C + AX * 1.2 - PERP * 0.3

# the Back's line: in from the lower left, a long bend, out to the upper right (screen), winding as a serpent lies
_t = np.linspace(-1.0, 1.0, 900)
LINE = C[None] + (PERP[None] * (_t * 17.0)[:, None]
                  + AX[None] * (np.sin(_t * 3.4 + 0.4) * 3.2 + _t * 2.0)[:, None])

# materials (hue-shifted: violet darks, warm lights)
R_BONE = ramp("#0c0a0a", "#171210", "#241b15", "#33271c", "#433424", "#55432f", "#69553c", "#7e6a4d")   # bog-stained bone, tea-dark
R_CROWN = ramp("#161413", "#27221e", "#3a332b", "#4f463a", "#665b4b", "#7e725e", "#968a72")              # the worn crowns, grey-ivory under the stain
R_ALGAE = ramp("#070908", "#0d110d", "#141a13", "#1c2418", "#252e1e", "#2f3824")                         # algae at the water line, dull
R_MOSS = ramp("#0b0d08", "#13170d", "#1d2212", "#272d17", "#31381c", "#3c4321", "#474e27")   # brown-olive bog moss (the fen lesson: not green)
R_MUD = ramp("#0b0807", "#140f0c", "#1f1712", "#2a2018", "#36291f", "#433327")
R_PEAT = ramp("#0b0908", "#15100d", "#201913", "#2c2219", "#392d21", "#46382a")
R_SEDGE = ramp("#0e0f08", "#1a1b0d", "#282911", "#383816", "#4a481c", "#5d5823", "#716a2c")
R_WATER = ramp("#020304", "#040507", "#06080a", "#090c0f", "#0d1115")   # peat-black (Derek: "darker")
R_DEAD = ramp("#0f0e0e", "#1b1918", "#292624", "#393431", "#4a443e", "#5c554d", "#6f675d", "#82796d")   # drowned wood, grey, wet-dark
R_PLANK = ramp("#100c09", "#1d1610", "#2b2117", "#3a2d1f", "#4a3a29", "#5a4834", "#6b5740")   # old oak boards, bog-darkened
R_STONE = ramp("#0e100f", "#1a1d1a", "#292d28", "#3a3f38", "#4c5249", "#5f655a", "#72786b")             # the village's stone, slimed
# balance (Derek: "the area will feel open while the path is constrictive ... not too many random objects poking out
# everywhere"): a few things stand in the water, each with room round it to be seen and mirrored
DROWNED_TREES = [(C + AX * 5.5 - PERP * 7.0, 0.42, 6.5, 41), (C + AX * 3.2 + PERP * 7.6, 0.45, 7.0, 43),
                 (C - AX * 3.2 + PERP * 4.5, 0.34, 5.2, 44)]
DROWNED_WALLS = [(C + AX * 4.6 + PERP * 4.8, 0.6, 4.2, 2.3, 51), (C - AX * 2.6 - PERP * 6.2, 2.0, 3.2, 1.5, 52)]
GREY = ramp("#0d0d0d", "#191919", "#262626", "#343434", "#434343", "#535353", "#646464", "#767676")   # the scene's own range


def plan(w):
    w.trees, w.logs, w.rocks, w.sapl, w.shrooms = [], [], [], [], []
    w.H = w.H * 0.0
    for name in ("fern", "grass", "moss", "bare", "pool"):
        a_ = getattr(w, name, None)
        if isinstance(a_, np.ndarray) and a_.dtype == bool:
            setattr(w, name, np.zeros_like(a_))
    w.light = np.ones(w.X.shape)
    w.gap = (-100.0, -100.0, 1.0)


def stamp(W, w):
    X, Y = W["X"], W["Y"]
    # the bog's bed and its hummocks (fen_ground's relief): most of it under the black water, a marsh shelf rising on
    # the far side where the Back goes through open ground
    dH, _, _, tus = fen_ground.height(X, Y, seed=11)
    shelf = np.clip(((X - C[0]) * -AX[0] + (Y - C[1]) * -AX[1] - 4.0) / 4.0, 0, 1)   # rising toward the back of the frame
    if not FRAME_SHELF:
        shelf = shelf * 0.0
    bed = LEVEL - 0.42 + dH * 1.3 + shelf * 0.5 + (fbm(X * 0.12, Y * 0.12) - 0.5) * 0.4
    for f_ in BED_MODS:
        bed = f_(X, Y, bed)
    if LINES:                                                                # a maze window: several walks of the Back
        H, part, info = bed.copy(), np.zeros(X.shape, int), None
        for li, ln in enumerate(LINES):
            H2, p2, inf2 = serpent_spine.stamp(X, Y, H, ln, LEVEL, seed=5 + (LINE_SEEDS[li] if LINE_SEEDS else li),
                                               sink_ends=LINE_ENDS[li] if LINE_ENDS else (False, False))
            take = p2 > 0
            H = np.where(take | (H2 > H), H2, H)
            part = np.where(take, p2, part)
            if info is None:
                info = inf2
            else:
                for k_ in ("crown", "wet", "cush", "cav", "stain", "expose"):
                    info[k_] = np.where(take, inf2[k_], info[k_])
                info["boot"] = np.where(take, inf2["boot"], info["boot"])
                info["v"] = np.where(np.abs(inf2["v"]) < np.abs(info["v"]), inf2["v"], info["v"])
    else:
        H, part, info = serpent_spine.stamp(X, Y, bed, LINE, LEVEL, seed=5)
    DT = [(p_[0], p_[1], r, h, sd) for (p_, r, h, sd) in DROWNED_TREES]
    # the ruins keep off the Back (Derek: "those stone walls will just block the path completely"): a wall that would
    # touch the walk is moved out across the water until it stands clear of it
    kd = cKDTree(LINE)
    walls = []
    for (p_, a, ln, h, sd) in DROWNED_WALLS:
        c_ = np.array(p_, float)
        for _ in range(40):
            ends = [c_ + np.array([np.cos(a), np.sin(a)]) * ln * f for f in np.linspace(-0.6, 0.6, 9)]
            dmin, idx = kd.query(np.array(ends))
            if dmin.min() > serpent_spine.W_W * 1.35 + 1.4:
                break
            near_pt = LINE[idx[np.argmin(dmin)]]
            away = c_ - near_pt
            c_ = c_ + away / (np.linalg.norm(away) + 1e-6) * 0.4
        walls.append((c_[0], c_[1], a, ln, h, sd))
    H, dpart, tid = drowned.stamp(X, Y, H, DT, walls, LEVEL)
    # no tree is a perfect tube (Derek): each drowned trunk is the warped column (taper, swell, sway, twist)
    ws.TRUNK_WARP = vein_tree.Warp(DT, [LEVEL - 0.2] * len(DT), tag0=800)
    for i, (x_, y_, r_, h_, sd_) in enumerate(DT):
        W["obj"][800 + i] = dict(kind="drowned", c=np.array([x_, y_]), r=r_, dying=0.0)
    part = np.where(dpart > 0, 0, part)
    H, spart = bog_structures.stamp(X, Y, H, STRUCTS, LEVEL)
    for ci, cl in enumerate(CAUSEWAYS):
        H, cp = bog_causeway.stamp(X, Y, H, cl, LEVEL, seed=31 + (CAUSEWAY_SEEDS[ci] if CAUSEWAY_SEEDS else ci))
        spart = np.where(cp > 0, cp, spart)
    for ri, rl in enumerate(RIBWALKS):
        H, rp = bog_causeway.rib_walk(X, Y, H, rl, LEVEL, seed=41 + (RIB_SEEDS[ri] if RIB_SEEDS else ri))
        spart = np.where(rp > 0, rp, spart)
    for f_ in EXTRA_STAMPS:
        H, ep = f_(X, Y, H, W)
        spart = np.where(ep > 0, ep, spart)
    part = np.where((spart > 0) & (spart != 32), 0, part)
    dpart = np.where(spart > 0, 0, dpart)
    W["bog_st"] = spart
    W["bog_dr"] = dpart
    water = (H < LEVEL) & (part == 0) & (dpart == 0) & (spart == 0)
    drowned_stone = (H < LEVEL) & np.isin(spart, (80, 81, 83, 85))          # a sunk platform's stones go under the water
    water = water | drowned_stone
    W["H"] = np.where(water, LEVEL, H)
    W["Hrest"] = W["H"].copy()
    W["HT"] = np.full(H.shape, -50.0)
    W["tag"] = np.where(tid >= 0, 800 + tid, 0)
    W["water"] = np.zeros(H.shape, bool)                                    # the engine's own water off: this bog paints its own
    W["bog_part"] = part
    W["bog_water"] = water
    W["bog_depth"] = np.clip(LEVEL - H, 0, 2)
    W["bog_crown"] = info["crown"]
    W["bog_wet"] = info["wet"]
    W["bog_tus"] = tus
    W["bog_bed"] = bed
    W["bog_v"] = np.abs(info["v"])
    if PLACE_CELL and LINES:
        # the zone's bake: the true distance to the nearest walk. The offset across a walk runs on past its end along
        # its tangent, where the next chunk, without that walk in reach, would not see it (a seam in the duckweed)
        d_, _ = cKDTree(np.concatenate(LINES)).query(np.stack([X.ravel(), Y.ravel()], 1))
        W["bog_v"] = d_.reshape(X.shape)
    W["bog_cush"] = info["cush"]
    W["bog_boot"] = info["boot"]
    W["bog_stain"] = info["stain"]
    W["bog_cav"] = info["cav"]
    W["bog_expose"] = info["expose"]


def _r(rp, t):
    if VALUE_ONLY:                                                           # rule 0.4: one material, one grey, everywhere
        rp = GREY
    return rp[np.clip((t * len(rp)).astype(int), 0, len(rp) - 1)]


def ground(img, W, px, py, pz, SX, SY, L, v, gl):
    part = ws.look(W, W["bog_part"], px, py)
    water = ws.look(W, W["bog_water"], px, py) & gl
    crown = ws.look(W, W["bog_crown"], px, py)
    wet = ws.look(W, W["bog_wet"], px, py)
    tus = ws.look(W, W["bog_tus"], px, py)
    vv = np.clip(v, 0, 0.99)
    col = np.zeros(img.shape)
    if VALUE_ONLY:                                                           # rule 0.4: one grey material, the form alone
        col = _r(GREY, vv * 0.95)
        col[water] = _r(GREY, vv[water] * 0.3)
        img[gl] = col[gl]
        return img
    land = gl & ~water
    peat = _r(R_PEAT, vv * 0.9)
    sedge = _r(R_SEDGE, vv * 0.95 + (vn(px * 6, py * 6) - 0.5) * 0.1)
    col = np.where(((tus > 0.15) & (part == 0))[..., None], sedge, peat)
    # open ground by the water table (chapter 8: hummock and hollow): black wet peat in the hollows, a sphagnum lawn of
    # dulled reds and greens between, brown moss and old heather on the hummock tops
    hgt_w = pz - LEVEL
    lawn = (hgt_w > 0.04) & (hgt_w < 0.2) & (part == 0) & (tus <= 0.15)
    sph = np.where((vn(px * 3.1 + 7, py * 3.1) > 0.5)[..., None], np.array([0.17, 0.11, 0.09]), np.array([0.13, 0.16, 0.08]))
    sph = sph * (0.45 + vv[..., None] * 0.9) * (1 + (vn(px * 17, py * 17)[..., None] - 0.5) * 0.3)
    col = np.where(lawn[..., None], sph, col)
    topm = (hgt_w >= 0.2) & (part == 0) & (tus <= 0.15)
    col = np.where(topm[..., None], _r(R_MOSS, vv * 0.85 + (vn(px * 9, py * 9) - 0.5) * 0.12) * np.array([1.05, 0.95, 0.85]), col)
    wetp = (hgt_w <= 0.04) & (part == 0)
    col = np.where(wetp[..., None], _r(R_PEAT, vv * 0.6), col)
    tide = wet < 0.05 + (vn(px * 3, py * 3) - 0.5) * 0.06                    # a thin band at the water line: algae on the bone
    stain = ws.look(W, W["bog_stain"], px, py)                              # every vertebra its own stain and wear
    cav = ws.look(W, W["bog_cav"], px, py)
    # the bone's colour follows its form: the peat's tea-black stain settles in every hollow, joint and pit; the
    # crowns, keels and rims are worn paler by feet and weather; between, a mottle of old stain in broad patches
    hollow_k = np.clip(-cav / 0.05, 0, 1)
    crest_k = np.clip(cav / 0.04, 0, 1)
    mott = (vn(px * 2.3 + 5, py * 2.3) - 0.5) * 0.14 + (vn(px * 26, py * 26) - 0.5) * 0.04     # the fine pitting, as colour
    tb = vv * 0.9 + mott + (stain - 0.5) * 0.16 - hollow_k * 0.22
    bone = _r(R_BONE, tb)
    crn = _r(R_CROWN, vv * 0.92 + mott * 0.6)
    bcol = np.where(((crown > 0.6) | (crest_k > 0.6))[..., None], crn, bone)
    flake = (vn(px * 13 + 2, py * 13) > 0.74) & (crest_k > 0.2)            # flakes of the outer shell gone: paler, a dark edge
    bcol[flake] = np.minimum(bcol[flake] * 1.12 + 0.02, 1)
    bcol = np.where(tide[..., None], _r(R_ALGAE, vv * 0.95), bcol)
    dr = ws.look(W, W["bog_dr"], px, py)
    wetz = pz - LEVEL
    streak = (vn(px * 7 + py * 7, wetz * 0.9) - 0.5) * 0.18                   # long checks running up the dead wood
    dead = _r(R_DEAD, vv * 0.9 + streak)
    dead = np.where((wetz < 0.32)[..., None], _r(R_ALGAE, vv * 0.95), dead)
    stone = _r(R_STONE, vv * 0.92 + (vn(px * 5, py * 5) - 0.5) * 0.1)
    joint = ((wetz % 0.4) < 0.035) | ((vn(px * 2.2 + py * 2.2, np.floor(wetz / 0.4) * 3.1) * 9) % 1.0 < 0.06)
    stone = np.where(joint[..., None], stone * 0.55, stone)
    stone = np.where((wetz < 0.36)[..., None], _r(R_ALGAE, vv * 0.95), stone)
    wetglint = (((part == 1) & (crown > 0.4)) | (part == 4)) & (L["moon"] > 0.62) & (vn(px * 21, py * 7) > 0.68)
    isb = (part == 1) | (part == 4)
    col = np.where(isb[..., None], bcol, col)
    col = np.where(wetglint[..., None], np.minimum(col * 1.25 + 0.05, 1), col)
    mossy = part == 2
    cush = ws.look(W, W["bog_cush"], px, py)                                 # the colour follows the form: moss on the cushions'
    mc = _r(R_MOSS, vv * 0.92 + (vn(px * 11, py * 11) - 0.5) * 0.1)          # domes, wet peat and mud in the lows between
    pc = _r(R_PEAT, vv * 0.9 + (vn(px * 7, py * 7) - 0.5) * 0.08)
    blend = np.clip((cush - 0.012) / 0.03, 0, 1)
    edge_n = vn(px * 19, py * 19) - 0.5                                      # ragged edges, never a blob's outline
    cov = np.where((blend + edge_n * 0.5 > 0.5)[..., None], mc, pc)
    bared = ws.look(W, W["bog_expose"], px, py) > 0.35                       # on a bared stretch the growth is only dark
    cov = np.where(bared[..., None], _r(R_MUD, vv * 0.85 + edge_n * 0.12), cov)   # peat packed in the joints, not moss
    col = np.where(mossy[..., None], cov, col)
    boot = ws.look(W, W["bog_boot"], px, py) & mossy | ws.look(W, W["bog_boot"], px, py) & (part == 3)
    col[boot] = _r(R_WATER, 0.3 + L["moon"][boot] * 0.3)                     # bootholes the mud let go of, holding black water
    col = np.where((part == 3)[..., None], _r(R_MUD, vv * 0.9), col)
    col = np.where((dr == 10)[..., None], dead, col)
    st = ws.look(W, W["bog_st"], px, py)
    if (st > 0).any():
        streak2 = (vn(px * 9 + py * 3, wetz * 1.4) - 0.5) * 0.16
        wood = _r(R_DEAD, vv * 0.88 + streak2)
        wood = np.where((wetz < 0.25)[..., None], _r(R_ALGAE, vv * 0.95), wood)
        mossy_top = (vn(px * 7, py * 7) > 0.5) & (wetz > 0.25)
        logc = np.where(mossy_top[..., None], _r(R_MOSS, vv * 0.9), wood)
        mound = np.where((vn(px * 6 + 3, py * 6) > 0.45)[..., None], _r(R_MOSS, vv * 0.9 + (vn(px * 15, py * 15) - 0.5) * 0.1),
                         _r(R_PEAT, vv * 0.9))
        dirt = _r(R_MUD, vv * 0.9 + (vn(px * 12, py * 12) - 0.5) * 0.14)
        rootl = np.abs(np.sin(px * 23 + np.sin(py * 9) * 2 + wetz * 6)) < 0.18      # roots strung through the plate's dirt
        plate = np.where(rootl[..., None], _r(R_DEAD, vv * 0.8), dirt)
        col = np.where((st == 30)[..., None], wood, col)
        col = np.where((st == 31)[..., None], _r(R_MUD, vv * 0.5), col)
        col = np.where((st == 32)[..., None], mound, col)
        col = np.where((st == 33)[..., None], logc, col)
        col = np.where((st == 34)[..., None], plate, col)
        col = np.where((st == 35)[..., None], _r(R_DEAD, vv * 0.85 + streak2), col)
        # the causeway: old split planks, each its own grey-brown, darker at its worn edges, slimed low; stakes; brush
        pid = np.floor((px * 0.71 + py * 0.71) / 0.25)
        pv = ((np.sin(pid * 12.9) * 4375.5) % 1.0 - 0.5) * 0.18
        grain = (vn(px * 2 + pid, py * 40) - 0.5) * 0.08
        plank = _r(R_PLANK, vv * 0.92 + pv + grain)
        plank = np.where((wetz < 0.025)[..., None], _r(R_ALGAE, vv * 0.95), plank)   # slime only where it touches water
        col = np.where((st == 60)[..., None], plank, col)
        col = np.where((st == 61)[..., None], _r(R_DEAD, vv * 0.75), col)
        col = np.where((st == 62)[..., None], _r(R_MUD, vv * 0.8 + 0.08), col)
        # the rib walk: the Back's own bone, its walked crown worn pale, slimed where the water reaches it
        rmot = (vn(px * 2.3 + 5, py * 2.3) - 0.5) * 0.14 + (vn(px * 26, py * 26) - 0.5) * 0.04
        rib = np.where((wetz > 0.22)[..., None], _r(R_CROWN, vv * 0.92 + rmot), _r(R_BONE, vv * 0.9 + rmot))
        rib = np.where((wetz < 0.06)[..., None], _r(R_ALGAE, vv * 0.95), rib)
        col = np.where((st == 64)[..., None], rib, col)
        col = np.where((st == 65)[..., None], _r(R_MUD, vv * 0.6), col)
        for f_ in EXTRA_PAINT:
            col = f_(col, W, px, py, pz, L, vv, gl, st)
    col = np.where(((dr == 11) | (dr == 12))[..., None], stone, col)
    # the black water: still and level; what lies over it comes in mirror() once everything is painted
    wcol = _r(R_WATER, 0.2 + (vn(px * 0.25, py * 0.25) - 0.5) * 0.16)
    col = np.where(water[..., None], wcol, col)
    img[gl] = col[gl]
    return img


SKY = np.array([0.06, 0.075, 0.1])          # the night sky in the water where nothing stands over it
R_SKYW = ramp("#040608", "#080d10", "#0e161a", "#172227", "#243238", "#35464d")   # the sky as the water shows it (the Famine's ramp, darker)


def mirror(img, w, W, px, py, pz, L, T=0.0):
    """the black mirror (the Famine's method, painted_swamp_god.py): from each water pixel the mirrored view ray is
    marched up through the world's height until it meets something; the painted image is read where that point
    stands, then darkened and cooled (peat water), broken by slow ripples. Nothing below the first hand's depth shows"""
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    if not water.any():
        return img
    wy_, wx_ = np.nonzero(water)
    x0, y0 = px[water], py[water]
    rip = (vn(x0 * 1.7 + T * 2, y0 * 1.7) - 0.5) * 0.06 + (vn(x0 * 5.0, y0 * 5.0 - T * 3) - 0.5) * 0.025
    x0, y0 = x0 + rip, y0 - rip
    hit = np.zeros(x0.shape, bool)
    hx, hy, hz = np.zeros(x0.shape), np.zeros(x0.shape), np.zeros(x0.shape)
    up = 2 * ws.KY / ws.KZ                                                   # the reflected ray rises as the view falls
    for k in range(1, 160):
        t = k * 0.035
        x, y, z = x0 - t, y0 - t, np.full(x0.shape, LEVEL + t * up)
        h = ws.look(W, W["H"], x, y, outside=-9.0)
        new = (~hit) & (h >= z)
        hx[new], hy[new], hz[new] = x[new], y[new], z[new]
        hit |= new
    # THE FUSION (Derek 2026-10-08: "a fusion of its water and this one", the Famine's water, painted_swamp_god.py, with
    # this bog's true reflection march):
    # - from the Famine: the reflection strong (0.68 of what stands over it, the rest a dark teal), WOBBLED sideways by
    #   the slow ripples a pixel or two as they pass (its life); the sky where nothing stands, dark, broken by sparse
    #   horizontal streaks of the night sky's light (its shimmer); a dark lip where the water meets bank or bone;
    # - from this bog: the reflection is marched through the world's true height, so the trunks, the bone, the ribs
    #   and the drowned walls all stand in it; and the gas breaking out of the peat, its rings spreading slow
    a2 = 2 * np.pi * T
    ripple = ((vn(x0 * 3 + np.cos(a2) * 0.7, y0 * 9 + np.sin(a2) * 0.7) - 0.5) * 2.0
              + np.sin((x0 + y0) * 14 - a2 * 2) * 0.6)
    sx, sy = ws.to_px((hx, hy, hz))
    sx = np.clip(np.round(sx + ripple * 1.2).astype(int), 0, img.shape[1] - 1)
    sy = np.clip(np.round(sy).astype(int), 0, img.shape[0] - 1)
    s1 = vn(x0 * 1.2 + np.sin(a2) * 0.3, y0 * 6 + T * 0.2) > 0.84            # the sky's light, in horizontal streaks
    s2 = vn(x0 * 1.6 + 5 - np.cos(a2) * 0.3, y0 * 10) > 0.94
    sky_v = 0.1 + s1 * 0.16 + s2 * 0.22 + (vn((x0 - 6) * 0.09 + T * 0.4, (y0 - 6) * 0.09) - 0.5) * 0.06
    sky = R_SKYW[np.clip((sky_v * len(R_SKYW)).astype(int), 0, len(R_SKYW) - 1)] * np.array([0.9, 1.0, 1.15])
    refl = img[sy, sx]
    out = np.where(hit[:, None], refl * 0.68 + np.array([0.024, 0.063, 0.059]) * 0.32 * 0.6, sky)
    # the gas: here and there a bubble breaks and its ring spreads, slow, then gone
    cell = 2.3
    gi, gj = np.floor(x0 / cell), np.floor(y0 / cell)
    hs = lambda a, b, k: (np.sin(a * 12.99 + b * 78.23 + k * 37.7) * 43758.55) % 1.0
    bx = (gi + 0.2 + 0.6 * hs(gi, gj, 1)) * cell
    by = (gj + 0.2 + 0.6 * hs(gi, gj, 2)) * cell
    live = hs(gi, gj, 3) < 0.4
    ph = (T + hs(gi, gj, 4)) % 1.0
    rr_ = np.hypot(x0 - bx, (y0 - by)) - ph * 0.9
    ring = live & (np.abs(rr_) < 0.035) & (ph < 0.85)
    out = np.where(ring[:, None], out + np.array([0.06, 0.07, 0.08]) * (1 - ph)[:, None], out)
    pop = live & (np.hypot(x0 - bx, y0 - by) < 0.05) & (ph < 0.08)
    out = np.where(pop[:, None], np.array([0.2, 0.22, 0.24]), out)
    # the dark lip where the water meets the bank or the bone (the Famine's: the line that seats a thing in water)
    lip = (~np.roll(water, -1, 0)) | (~np.roll(water, 1, 1))
    out = np.where(lip[wy_, wx_][:, None], out * 0.55, out)
    img[wy_, wx_] = np.clip(out, 0, 1)
    return img


def moonlit(px, py, pz, t):
    """light tells the story (MASTER_RULES 3.10): no canopy over the bog, but high thin cloud drifting across the moon,
    so broad pools of moonlight move over the water and the Back and the rest lies a step darker. Stepped, never a
    smooth gradient, with the 4x4 dither only at the pools' edges"""
    a = 2 * np.pi * t
    c = fbm(px * 0.045 + np.cos(a) * 0.35 + 3.0, py * 0.045 + np.sin(a) * 0.35) * 0.75 + vn(px * 0.13 - t, py * 0.13) * 0.25
    k = np.clip((c - 0.42) * 9.0 + 0.5, 0, 1)                                 # a steep edge: the dither stays a thin seam
    gh, gw = px.shape
    bay = ws.tw.B4[(np.arange(gh)[:, None] % 4), (np.arange(gw)[None, :] % 4)]
    k = np.where((k > 0.3) & (k < 0.7), (k > bay).astype(float), np.round(k))
    return 0.62 + 0.42 * k


ws.MOONLIT = moonlit
ws.WOOD_HOOKS[:] = [plan]
ws.BUILD_HOOKS[:] = [stamp]
def _ps(x, y, k):
    """a plant's own seed: by where it stands when the zone is painted in chunks (the same reed on both sides of a
    chunk's edge), by its place in the list in a single frame (as the graded stills were painted)"""
    return int(abs(x * 7919.0 + y * 104729.0)) % 99991 + 900 if PLACE_CELL else 900 + k


def plants(img, w, W, px, py, pz, L, T=0.0):
    """lots of plant life, each placed by the water table, drawn far to near, each mirrored in the black water"""
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    # duckweed: mats drifted into the lee of the Back and among the reeds, lying on the water, breaking the mirror
    vb = ws.look(W, W["bog_v"], px, py)
    dd = ws.look(W, W["bog_depth"], px, py)
    lee = np.clip(1 - (vb - 2.0) / 2.5, 0, 1) + np.clip(0.5 - dd, 0, 1) * 0.6
    drift = vn(px * 0.45 + py * 0.9 + 3, py * 0.45 - px * 0.2) * 0.55 + vn(px * 3, py * 3) * 0.25 + lee * 0.4   # drifted, combed by the wind
    mat = water & (drift > 0.82)
    if "no_weed" in W:                                                       # the orbits of the skull: black, unbroken
        nw = ws.look(W, W["no_weed"], px, py)
        mat &= ~nw
    edge = water & (drift > 0.76) & ~mat
    speck = vn(px * 23, py * 23) > 0.45
    img[mat & speck] = bog_plants.WEED * (0.55 + L["moon"][mat & speck, None] * 0.5)
    img[mat & ~speck] = img[mat & ~speck] * 0.55 + bog_plants.WEED * 0.3
    sp2 = edge & (vn(px * 31, py * 31) > 0.7)                                 # loose fronds at a mat's edge
    img[sp2] = bog_plants.WEED * 0.7
    # floating sphagnum rafts in the shallows: dulled red and green, ragged, distinct from the duckweed
    noweed = ws.look(W, W["no_weed"], px, py) if "no_weed" in W else np.zeros(water.shape, bool)
    raft = water & (dd < 0.35) & ~noweed & ((vn(px * 0.7 + 21, py * 0.7) * 0.7 + vn(px * 6, py * 6) * 0.3) > 0.72) & ~mat
    rc = np.where((vn(px * 9, py * 9) > 0.5)[..., None], np.array([0.2, 0.13, 0.1]), np.array([0.15, 0.18, 0.09]))
    img[raft] = rc[raft] * (0.55 + L["moon"][raft, None] * 0.5)
    rng = np.random.default_rng(31)
    fx, fy = ws.FOCUS
    box = (fx - 13, fy - 13, fx + 13, fy + 13)
    da = lambda x, y: float(ws.look(W, W["bog_depth"], np.array(x), np.array(y)))
    def pa(x, y):
        stv = int(ws.look(W, W["bog_st"], np.array(x), np.array(y)))
        if stv in (70, 71):
            return 0 if rng.random() < 0.35 else 9                           # the churned peat: a few dead tufts survive
        if stv > 0 and stv != 32:
            return 9                                                         # nothing grows on the wood, the hut, the bone
        return int(ws.look(W, W["bog_part"], np.array(x), np.array(y)))
    ca = lambda x, y: float(ws.look(W, W["bog_v"], np.array(x), np.array(y))) / 3.0
    if PLACE_CELL:                                                           # the zone's bake: per world cell, its own seed
        items, cs = [], float(PLACE_CELL)
        for gx in range(int(np.floor(box[0] / cs)), int(np.ceil(box[2] / cs))):
            for gy in range(int(np.floor(box[1] / cs)), int(np.ceil(box[3] / cs))):
                rng = np.random.default_rng((gx * 7919 + gy * 104729 + 31) % (2 ** 32))   # pa() draws on this one too
                items += bog_plants.place(rng, da, pa, ca, (gx * cs, gy * cs, gx * cs + cs, gy * cs + cs),
                                          n_try=int(round(9000 * cs * cs / 676.0)))
    else:
        items = bog_plants.place(rng, da, pa, ca, box)
    # the near water stays open (MASTER_RULES 5: nothing tall and leafy crowds the screen; the game ghosts what stands
    # before the pilgrim, but the frame should not be a wall of stems): tall plants thin out toward the camera
    hd = ws.HERO[0] + ws.HERO[1]
    rk = np.random.default_rng(77)
    if THIN_NEAR:
        items = [it for it in items if not (it[0] in ("reed", "bulrush") and it[1] + it[2] > hd + 1.5
                                            and rk.random() < np.clip((it[1] + it[2] - hd - 1.5) / 3.0, 0, 0.92))]
    # the walk stays legible: no tall stems within a few yards of the Back (they stand off it, in the open water)
    items = [it for it in items if not (it[0] in ("reed", "bulrush")
                                        and float(ws.look(W, W["bog_v"], np.array(it[1]), np.array(it[2]))) < 4.8)]
    for q, (p_, r, h, sd) in enumerate(DROWNED_TREES):                     # a few dead limbs left on each drowned tree
        rl = np.random.default_rng(sd)
        for j in range(int(rl.integers(1, 4))):
            z0 = LEVEL + h * rl.uniform(0.45, 0.8)
            a = rl.uniform(0, 2 * np.pi)
            ln = rl.uniform(0.6, 1.6)
            b0 = np.array([p_[0] + np.cos(a) * r * 0.8, p_[1] + np.sin(a) * r * 0.8, z0])
            b1 = b0 + np.array([np.cos(a) * ln, np.sin(a) * ln, rl.uniform(-0.2, 0.7) * ln])
            gx_, gy_ = ws.to_px(tuple(b0))
            i_, j_ = int(np.clip(gy_, 0, ws.GH - 1)), int(np.clip(gx_, 0, ws.GW - 1))
            lv_ = 0.35 + float(L["moon"][i_, j_]) * 0.5
            items.append(("limb", (b0, b1), 0, lv_))
    items.sort(key=lambda it: (it[1][0][0] + it[1][0][1]) if it[0] == "limb" else it[1] + it[2])
    zb = np.full(img.shape[:2], -1e9)
    dep = px + py
    for k, (kind, x, y, h) in enumerate(items):
        if kind == "limb":
            b0, b1 = x
            bog_plants._stroke(img, zb, dep, ws.to_px, b0, b1, R_DEAD[4], R_DEAD[5], h, water, LEVEL)
            bog_plants._stroke(img, zb, dep, ws.to_px, b0 + np.array([0, 0, 0.03]), b1 + np.array([0, 0, 0.02]), R_DEAD[5], R_DEAD[6], h, water, LEVEL)
            continue
        g = float(ws.look(W, W["H"], np.array(x), np.array(y)))
        sx, sy = ws.to_px((x, y, g))
        i, j = int(np.clip(sy, 0, ws.GH - 1)), int(np.clip(sx, 0, ws.GW - 1))
        lv = 0.32 + float(L["moon"][i, j]) * 0.55 + float(L["lamp"][i, j]) * 0.9
        if kind == "reed":
            bog_plants.reed(img, zb, dep, ws.to_px, (x, y, max(g, LEVEL)), h, _ps(x, y, k), lv, water, LEVEL)
        elif kind == "sedge":
            bog_plants.sedge(img, zb, dep, ws.to_px, (x, y, g), h, _ps(x, y, k), lv, water, LEVEL)
        elif kind == "bulrush":
            bog_plants.bulrush(img, zb, dep, ws.to_px, (x, y, max(g, LEVEL)), h, _ps(x, y, k), lv, water, LEVEL)
        elif kind == "horsetail":
            bog_plants.horsetail(img, zb, dep, ws.to_px, (x, y, max(g, LEVEL)), h, _ps(x, y, k), lv, water, LEVEL)
        elif kind == "cotton":
            bog_plants.cotton(img, zb, dep, ws.to_px, (x, y, g), h, _ps(x, y, k), lv, water, LEVEL)
        elif kind == "bogbean":
            bog_plants.bogbean(img, ws.to_px, (x, y, LEVEL), _ps(x, y, k), lv, water)
        else:
            bog_plants.pad(img, ws.to_px, (x, y, LEVEL), h, _ps(x, y, k), lv, water)
    return img


WISPS = [(3.0, 3.5, 0.15, 11), (-3.0, 5.5, 0.5, 12), (6.0, -1.5, 0.82, 13)]   # fewer (Derek: "tone down the wisp fire"),
                                                                             # over the open water before the Back
GHOST = np.array([0.66, 0.74, 0.86])


def wisps(img, w, W, px, py, pz, L, T=0.4):
    """the wisp-fire, toned down (Derek 2026-10-08: "tone down the wisp fire and they should have a ghostly drift before
    going away"): each is a small pale cold light low over the black water, no flame, only a soft core and a faint halo.
    It wakes, drifts slowly along the water leaving a thin ghost of itself behind, and as it goes it rises, thins and
    is gone; it lays a faint pale pool on the water under it and shows again, dimmer, in the mirror. Stepped alphas,
    dithered only at the edges (the effects method)."""
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    dep = px + py
    GH, GW = img.shape[:2]
    bay = ws.tw.B4[(np.arange(GH)[:, None] % 4), (np.arange(GW)[None, :] % 4)]
    LIFE = 0.8                                                               # alive for this share of the loop

    def where(a, p, ph, sd, f):
        """the wisp at the share f of its life: drifting along, wandering, rising as it fades"""
        drift = np.array([np.cos(sd * 1.7), np.sin(sd * 1.7)]) * 2.4 * f
        wob = np.array([np.sin(f * 9 + sd) * 0.25, np.cos(f * 7 + sd * 2) * 0.2])
        x, y = ws.FOCUS[0] + a + drift[0] + wob[0], ws.FOCUS[1] + p + drift[1] + wob[1]
        z = LEVEL + 0.35 + 0.08 * np.sin(f * 11 + sd) + np.clip((f - 0.6) / 0.4, 0, 1) ** 1.6 * 1.3
        return x, y, z

    def dot(cx, cy, r, alpha, col, mask=None):
        x0, x1 = int(max(cx - r - 1, 0)), int(min(cx + r + 2, GW))
        y0, y1 = int(max(cy - r - 1, 0)), int(min(cy + r + 2, GH))
        if x0 >= x1 or y0 >= y1:
            return
        ys, xs = np.mgrid[y0:y1, x0:x1]
        d = np.hypot(xs - cx, (ys - cy) * 1.2) / max(r, 0.5)
        a = np.where(d < 0.45, alpha, np.where(d < 1.0, alpha * 0.45 * (bay[ys, xs] > 0.45), 0.0))
        if mask is not None:
            a = a * mask[ys, xs]
        img[ys, xs] = img[ys, xs] * (1 - a[..., None]) + col * a[..., None]

    for (a, p, ph, sd) in WISPS:
        f = ((T + ph) % 1.0) / LIFE
        if f >= 1.0:
            continue
        env = np.clip(f / 0.15, 0, 1) * np.clip((1 - f) / 0.4, 0, 1)            # wakes quickly, fades slowly
        x, y, z = where(a, p, ph, sd, f)
        if float(ws.look(W, W["bog_water"], np.array(x), np.array(y))) < 0.5 and f < 0.6:
            continue                                                         # it keeps over the water
        sx, sy = ws.to_px((x, y, z))
        if not (0 <= sx < GW and 0 <= sy < GH) or (x + y) < dep[int(sy), int(sx)] - 0.6:
            continue
        thin = 1 - 0.6 * np.clip((f - 0.6) / 0.4, 0, 1)                        # it thins as it rises away
        # the ghost it leaves behind: a few faint dots along the way it came, fainter the further back
        for k in range(1, 7):
            fk = f - k * 0.025
            if fk <= 0:
                break
            gx, gy, gz = where(a, p, ph, sd, fk)
            gsx, gsy = ws.to_px((gx, gy, gz))
            dot(gsx, gsy, 1.4, 0.24 * env * (1 - k / 7.0), GHOST)
        # the faint pale pool it lays on the water, and its reflection, dimmer
        _, wl = ws.to_px((x, y, LEVEL))
        dot(sx, wl, 5.0 * thin, 0.07 * env, GHOST, water)
        dot(sx, 2 * wl - sy, 1.6 * thin, 0.22 * env, GHOST * 0.8, water)
        # the light itself: a small soft core and a faint halo, no flame
        dot(sx, sy, 4.0 * thin, 0.24 * env, GHOST)
        dot(sx, sy, 1.8 * thin, 0.8 * env, np.array([0.86, 0.9, 0.98]))
    return img


# great single ribs standing out of the water (Derek 2026-10-08: "some large single ribs poking out of the water
# occasionally"): the serpent's ribs that broke from the Back and sank, one end down in the peat, the other curving up
# out of the water and snapped; true bone (landkit bone.py, ray-marched, so the arch has air under it) and mirrored
GIANT_RIBS = [(C - AX * 1.0 + PERP * 10.5, 2.5, 6.0, 0.0, 62)]               # (where, its heading, its span, a snapped
                                                                             # end's height: 0 = both ends down, an arch)


def _ribs(level_mirror=None):
    out = []
    for (p_, ang, ln, ht, sd) in GIANT_RIBS:
        a = np.array([p_[0], p_[1], LEVEL - 0.45])
        b = a + np.array([np.cos(ang) * ln, np.sin(ang) * ln, ht + (0.0 if ht == 0 else 0.45)])
        rise = ln * 0.55 if ht == 0 else 0.9 + ht * 0.3                     # an arch climbs well clear of the water
        r = bonegen.rib(tuple(a), tuple(b), rise, 0.24, 0.32, seed=sd)
        if level_mirror is not None:
            r["pts"] = r["pts"].copy()
            r["pts"][:, 2] = 2 * level_mirror - r["pts"][:, 2]
        out.append(r)
    return out


def giant_rib_mirror(img, w, W, px, py, pz, L, T=0.0):
    """the ribs in the black mirror, laid into the water before anything floats on it"""
    GH, GW = img.shape[:2]
    dep = px + py
    hero = np.array(ws.HERO, float)
    g = float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1])))
    lts = [((hero[0] + 0.25, hero[1] - 0.25, g + 0.7), (0.95, 0.6, 0.32), 2.6 * 1.4)]
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    # the mirror first: the ribs turned over the water line, drawn apart and laid into the water darker and cooler
    # bog bone, not the Moor's: tea-stained and slimed, no dried sinew or old blood at its heads (the peat took them)
    keep = (bonegen.R_BONE, bonegen.SINEW)
    bonegen.R_BONE, bonegen.SINEW = R_CROWN, np.array([0.1, 0.09, 0.07])
    keep_sp = bonegen.SPONGE
    bonegen.SPONGE = np.array([0.08, 0.07, 0.06])
    tmp = np.zeros_like(img)
    hit = np.full((GH, GW), -1e9)
    bonegen.draw(tmp, hit, np.full((GH, GW), -1e9), ws.to_px, _ribs(LEVEL), lts, ws.SUN, ambient=0.12)
    m = water & (hit > -1e8)
    img[m] = np.clip(img[m] * 0.35 + tmp[m] * np.array([0.42, 0.46, 0.55]), 0, 1)
    bonegen.R_BONE, bonegen.SINEW = keep
    bonegen.SPONGE = keep_sp
    return img


def giant_ribs(img, w, W, px, py, pz, L, T=0.0):
    """the ribs themselves, drawn after the pads and weed that float on the water, so the bone stands over them"""
    GH, GW = img.shape[:2]
    dep = px + py
    hero = np.array(ws.HERO, float)
    g = float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1])))
    lts = [((hero[0] + 0.25, hero[1] - 0.25, g + 0.7), (0.95, 0.6, 0.32), 2.6 * 1.4)]
    keep = (bonegen.R_BONE, bonegen.SINEW)
    bonegen.R_BONE, bonegen.SINEW = R_CROWN, np.array([0.1, 0.09, 0.07])
    keep_sp = bonegen.SPONGE
    bonegen.SPONGE = np.array([0.08, 0.07, 0.06])
    zb = np.full((GH, GW), -1e9)
    shapes = _ribs()
    shapes.sort(key=lambda o: -(o["pts"][:, 0] + o["pts"][:, 1]).mean())
    bonegen.draw(img, zb, dep, ws.to_px, shapes, lts, ws.SUN, ambient=0.12)
    bonegen.R_BONE, bonegen.SINEW = keep
    bonegen.SPONGE = keep_sp
    return img


def bog_fog(img, w, W, px, py, pz, L, T=0.0):
    """a light fog, mostly see-through, lying over the water (Derek: "a light, mostly translucent fog over the water";
    MASTER_RULES 6: fog lies in the lows), drifting slowly in the one wind, thinning up the Back and gone on its crown"""
    water = ws.look(W, W["bog_water"], px, py).astype(float)
    low = np.clip(water * 0.85 + np.clip(0.35 - (pz - LEVEL), 0, 0.35) * 1.2, 0, 1)
    return foggen.draw(img, px, py, pz, low, T, L["moon"], np.zeros(px.shape), thick=1.5)


def struct_living(img, w, W, px, py, pz, L, T=0.0):
    """the snags' limbs and hanging vines (mirrored), and whatever the chamber adds"""
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    zb = np.full(img.shape[:2], -1e9)
    dep = px + py
    for (a, b, kind) in bog_structures.snag_strokes(STRUCTS, LEVEL):
        gx_, gy_ = ws.to_px(tuple(a))
        i_, j_ = int(np.clip(gy_, 0, ws.GH - 1)), int(np.clip(gx_, 0, ws.GW - 1))
        lv_ = 0.35 + float(L["moon"][i_, j_]) * 0.5
        if kind == "limb":
            bog_plants._stroke(img, zb, dep, ws.to_px, a, b, R_DEAD[3], R_DEAD[5], lv_, water, LEVEL)
        else:
            bog_plants._stroke(img, zb, dep, ws.to_px, a, b, np.array([0.12, 0.16, 0.08]), np.array([0.18, 0.24, 0.1]), lv_, water, LEVEL)
    for f_ in EXTRA_LIVING:
        img = f_(img, w, W, px, py, pz, L, T)
    return img


def value_only(img, w, W, px, py, pz, L, T=0.0):
    """the value test's last step: whatever still carries a colour (the floating weed, the pads, the bone's own ramp,
    the wisp-fire) goes to the one grey, so the test shows the form and nothing else"""
    if not VALUE_ONLY:
        return img
    g = img.mean(2, keepdims=True)
    return np.repeat(g, 3, axis=2)


def bone_litter(img, w, W, px, py, pz, L, T=0.0):
    """the serpent everywhere in the mud (Derek 2026-10-08: "the open mud should have more vegetation and skeleton
    pieces in it"): small pieces of the god's bone half sunk in the peat of the shelves and banks: lengths of broken rib,
    splinters, a loose vertebra's knob; bog-stained, their tops worn paler; sparse, never on a walk, never in the water;
    true bone (landkit bone.py), lying as things lie, each its own way"""
    fx, fy = ws.FOCUS
    worm = W.get("worm")
    if PLACE_CELL:                                                           # the zone's bake: each world cell its own few
        cs = float(PLACE_CELL)
        cells = [(gx, gy) for gx in range(int(np.floor((fx - 12) / cs)), int(np.ceil((fx + 12) / cs)))
                 for gy in range(int(np.floor((fy - 12) / cs)), int(np.ceil((fy + 12) / cs)))]
    else:
        cells = [None]
    shapes = []
    for cell in cells:
        if cell is None:
            rng = np.random.default_rng(int(ws.FOCUS[0] * 7 + ws.FOCUS[1] * 3) % 9973)
            want, box, bub = 22, (fx - 12, fy - 12, fx + 12, fy + 12), (worm["bub"] if worm else [])
        else:
            rng = np.random.default_rng((cell[0] * 6151 + cell[1] * 93911 + 57) % (2 ** 32))
            box = (cell[0] * cs, cell[1] * cs, cell[0] * cs + cs, cell[1] * cs + cs)
            want = int(rng.poisson(22 * cs * cs / 576.0))
            bub = [b_ for b_ in (worm["bub"] if worm else []) if box[0] <= b_[0] < box[2] and box[1] <= b_[1] < box[3]]
        shapes += _bone_cell(W, rng, want, box, bub)
    if not shapes:
        return img
    _draw_bones(img, W, px, py, shapes)
    return img


def _bone_cell(W, rng, want, box, bub):
    shapes = []
    tries = 0
    start = len(shapes)
    while len(shapes) - start < want and tries < 5000:
        tries += 1
        if bub and rng.random() < 0.4:                                       # where the worms took things under: more bone
            b_ = bub[int(rng.integers(0, len(bub)))]
            x, y = b_[0] + rng.normal(0, 1.2), b_[1] + rng.normal(0, 1.2)
        else:
            x, y = rng.uniform(box[0], box[2]), rng.uniform(box[1], box[3])
        if bool(ws.look(W, W["bog_water"], np.array(x), np.array(y))):
            continue
        pt = int(ws.look(W, W["bog_part"], np.array(x), np.array(y)))
        stv = int(ws.look(W, W["bog_st"], np.array(x), np.array(y)))
        if pt == 1 or pt == 4 or (stv > 0 and stv not in (32, 70, 71)):
            continue                                                         # not on the bone of the walk, not on a piece
        if pt == 0 and float(ws.look(W, W["bog_v"], np.array(x), np.array(y))) < 3.0:
            continue
        g = float(ws.look(W, W["H"], np.array(x), np.array(y)))
        ang = rng.uniform(0, 2 * np.pi)
        kind = rng.random()
        if kind < 0.55:                                                      # a broken length of rib, bowed, half sunk
            ln = rng.uniform(0.7, 1.6)
            a = (x, y, g - 0.05)
            b = (x + np.cos(ang) * ln, y + np.sin(ang) * ln, g - 0.12)
            shapes.append(bonegen.rib(a, b, rng.uniform(0.08, 0.2), 0.09, 0.12, seed=int(rng.integers(1, 9999))))
        elif kind < 0.85:                                                    # splinters, a few together
            for q in range(int(rng.integers(2, 4))):
                a2 = ang + rng.normal(0, 0.8)
                ln = rng.uniform(0.25, 0.55)
                ox, oy = rng.normal(0, 0.25, 2)
                a = (x + ox, y + oy, g - 0.03)
                b = (x + ox + np.cos(a2) * ln, y + oy + np.sin(a2) * ln, g - 0.06)
                shapes.append(bonegen.rib(a, b, 0.03, 0.05, 0.065, seed=int(rng.integers(1, 9999))))
        else:                                                                # a loose vertebra's knob, sunk to its middle
            shapes.append(bonegen.rib((x, y, g - 0.18), (x + np.cos(ang) * 0.35, y + np.sin(ang) * 0.35, g - 0.2),
                                      0.05, 0.22, 0.24, seed=int(rng.integers(1, 9999))))
    return shapes


def _draw_bones(img, W, px, py, shapes):
    GH, GW = img.shape[:2]
    dep = px + py
    hero = np.array(ws.HERO, float)
    gh = float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1])))
    lts = [((hero[0] + 0.25, hero[1] - 0.25, gh + 0.7), (0.95, 0.6, 0.32), 2.6 * 1.4)]
    keep = (bonegen.R_BONE, bonegen.SINEW, bonegen.SPONGE)
    bonegen.R_BONE, bonegen.SINEW, bonegen.SPONGE = R_CROWN, np.array([0.08, 0.07, 0.06]), np.array([0.07, 0.06, 0.05])
    zb = np.full((GH, GW), -1e9)                                             # worn pale where it lies above the peat
    shapes.sort(key=lambda o: -(o["pts"][:, 0] + o["pts"][:, 1]).mean())
    bonegen.draw(img, zb, dep, ws.to_px, shapes, lts, ws.SUN, ambient=0.22, plain=True)
    bonegen.R_BONE, bonegen.SINEW, bonegen.SPONGE = keep


# no fog over the water (Derek 2026-10-08: "its ugly, so just that shit" -- taken out of the bog entirely; bog_fog stays
# below only as a record of what was tried)
ws.LIVING[:] = [mirror, giant_rib_mirror, plants, bone_litter, giant_ribs, struct_living, wisps, value_only]
ws.GROUND = ground


def paint_drowned(img, m, v, n, px, py, pz, o, W, L):
    """the drowned wood: grey, the bark long gone, long checks running up it, a green-black slime band from the water"""
    vv = np.clip(v, 0, 0.99)
    wetz = pz - LEVEL
    ang = np.arctan2(py - o["c"][1], px - o["c"][0])
    check = np.abs(np.sin(ang * 7 + o["r"] * 31 + vn(wetz * 0.7, ang) * 2)) < 0.12              # deep checks along the grain
    t = vv * 0.9 + (vn(ang * 3 + o["r"] * 9, wetz * 0.8) - 0.5) * 0.14 - check * 0.18
    col = _r(R_DEAD, t)
    bark = vn(ang * 2.2, wetz * 0.5 + o["r"] * 7) > 0.68                   # a few plates of old bark still holding, darker
    col[bark] = _r(R_DEAD, t * 0.7)[bark]
    slime = wetz < 0.32 + (vn(ang * 4, 1.0) - 0.5) * 0.1
    col[slime] = _r(R_ALGAE, vv * 0.95)[slime]
    img[m] = col[m]
    return img


ws.PAINTERS["drowned"] = paint_drowned
ws.RIM_EXTRA = tuple(range(800, 810))

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "value":
        VALUE_ONLY = True
        bog_plants.GREY = True
    out_ = sys.argv[1] if len(sys.argv) > 1 else "bog_scene.png"
    if out_.endswith(".webp"):
        ws.animate(out_, int(sys.argv[2]) if len(sys.argv) > 2 else 12)
    else:
        ws.main(out_)
