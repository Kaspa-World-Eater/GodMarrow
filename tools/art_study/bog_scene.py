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
from scipy.spatial import cKDTree            # noqa: E402
from kit import ramp, vn, fbm                # noqa: E402

C = np.array([20.0, 20.0])
AX = np.array([1.0, 1.0]) / np.sqrt(2)       # toward the viewer (down the screen)
PERP = np.array([1.0, -1.0]) / np.sqrt(2)    # across (screen right)
LEVEL = 0.0                                  # the bog's water table
VALUE_ONLY = False

ws.FOCUS = C.copy()
for _f in ("FOREST_LIFE", "MIST", "BEAMS", "GRASS", "FERNS", "LITTER_GEN", "LEAF_FALL"):
    setattr(ws, _f, False)
ws.NORMAL_BLUR = 0.0
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
R_STONE = ramp("#0e100f", "#1a1d1a", "#292d28", "#3a3f38", "#4c5249", "#5f655a", "#72786b")             # the village's stone, slimed
# balance (Derek: "the area will feel open while the path is constrictive ... not too many random objects poking out
# everywhere"): a few things stand in the water, each with room round it to be seen and mirrored
DROWNED_TREES = [(C + AX * 5.5 - PERP * 7.0, 0.42, 6.5, 41), (C + AX * 3.2 + PERP * 7.6, 0.45, 7.0, 43),
                 (C - AX * 3.2 + PERP * 4.5, 0.34, 5.2, 44)]
DROWNED_WALLS = [(C + AX * 4.6 + PERP * 4.8, 0.6, 4.2, 2.3, 51), (C - AX * 2.6 - PERP * 6.2, 2.0, 3.2, 1.5, 52)]
GREY = ramp("#111111", "#222222", "#333333", "#444444", "#555555", "#666666", "#777777", "#888888", "#999999", "#aaaaaa")


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
    bed = LEVEL - 0.42 + dH * 1.3 + shelf * 0.5 + (fbm(X * 0.12, Y * 0.12) - 0.5) * 0.4
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
    W["bog_dr"] = dpart
    water = (H < LEVEL) & (part == 0) & (dpart == 0)
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
    W["bog_cush"] = info["cush"]
    W["bog_boot"] = info["boot"]
    W["bog_stain"] = info["stain"]
    W["bog_cav"] = info["cav"]
    W["bog_expose"] = info["expose"]


def _r(rp, t):
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
        col = _r(GREY, vv * 0.9)
        col[water] = _r(GREY, vv[water] * 0.3)
        img[gl] = col[gl]
        return img
    land = gl & ~water
    peat = _r(R_PEAT, vv * 0.9)
    sedge = _r(R_SEDGE, vv * 0.95 + (vn(px * 6, py * 6) - 0.5) * 0.1)
    col = np.where(((tus > 0.15) & (part == 0))[..., None], sedge, peat)
    tide = wet < 0.05 + (vn(px * 3, py * 3) - 0.5) * 0.06                    # a thin band at the water line: algae on the bone
    stain = ws.look(W, W["bog_stain"], px, py)                              # every vertebra its own stain and wear
    cav = ws.look(W, W["bog_cav"], px, py)
    # the bone's colour follows its form: the peat's tea-black stain settles in every hollow, joint and pit; the
    # crowns, keels and rims are worn paler by feet and weather; between, a mottle of old stain in broad patches
    hollow_k = np.clip(-cav / 0.05, 0, 1)
    crest_k = np.clip(cav / 0.04, 0, 1)
    mott = (vn(px * 2.3 + 5, py * 2.3) - 0.5) * 0.14 + (vn(px * 9, py * 9) - 0.5) * 0.05
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
    isb = (part == 1) | (part == 4)
    col = np.where(isb[..., None], bcol, col)
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


ws.WOOD_HOOKS[:] = [plan]
ws.BUILD_HOOKS[:] = [stamp]
def plants(img, w, W, px, py, pz, L, T=0.0):
    """lots of plant life, each placed by the water table, drawn far to near, each mirrored in the black water"""
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    # duckweed: mats drifted into the lee of the Back and among the reeds, lying on the water, breaking the mirror
    vb = ws.look(W, W["bog_v"], px, py)
    dd = ws.look(W, W["bog_depth"], px, py)
    lee = np.clip(1 - (vb - 2.0) / 2.5, 0, 1) + np.clip(0.5 - dd, 0, 1) * 0.6
    drift = vn(px * 0.45 + py * 0.9 + 3, py * 0.45 - px * 0.2) * 0.55 + vn(px * 3, py * 3) * 0.25 + lee * 0.4   # drifted, combed by the wind
    mat = water & (drift > 0.82)
    edge = water & (drift > 0.76) & ~mat
    speck = vn(px * 23, py * 23) > 0.45
    img[mat & speck] = bog_plants.WEED * (0.55 + L["moon"][mat & speck, None] * 0.5)
    img[mat & ~speck] = img[mat & ~speck] * 0.55 + bog_plants.WEED * 0.3
    sp2 = edge & (vn(px * 31, py * 31) > 0.7)                                 # loose fronds at a mat's edge
    img[sp2] = bog_plants.WEED * 0.7
    # floating sphagnum rafts in the shallows: dulled red and green, ragged, distinct from the duckweed
    raft = water & (dd < 0.35) & ((vn(px * 0.7 + 21, py * 0.7) * 0.7 + vn(px * 6, py * 6) * 0.3) > 0.72) & ~mat
    rc = np.where((vn(px * 9, py * 9) > 0.5)[..., None], np.array([0.2, 0.13, 0.1]), np.array([0.15, 0.18, 0.09]))
    img[raft] = rc[raft] * (0.55 + L["moon"][raft, None] * 0.5)
    rng = np.random.default_rng(31)
    fx, fy = ws.FOCUS
    box = (fx - 13, fy - 13, fx + 13, fy + 13)
    da = lambda x, y: float(ws.look(W, W["bog_depth"], np.array(x), np.array(y)))
    pa = lambda x, y: int(ws.look(W, W["bog_part"], np.array(x), np.array(y)))
    ca = lambda x, y: float(ws.look(W, W["bog_v"], np.array(x), np.array(y))) / 3.0
    items = bog_plants.place(rng, da, pa, ca, box)
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
            bog_plants.reed(img, zb, dep, ws.to_px, (x, y, max(g, LEVEL)), h, 900 + k, lv, water, LEVEL)
        elif kind == "sedge":
            bog_plants.sedge(img, zb, dep, ws.to_px, (x, y, g), h, 900 + k, lv, water, LEVEL)
        elif kind == "bulrush":
            bog_plants.bulrush(img, zb, dep, ws.to_px, (x, y, max(g, LEVEL)), h, 900 + k, lv, water, LEVEL)
        elif kind == "horsetail":
            bog_plants.horsetail(img, zb, dep, ws.to_px, (x, y, max(g, LEVEL)), h, 900 + k, lv, water, LEVEL)
        elif kind == "cotton":
            bog_plants.cotton(img, zb, dep, ws.to_px, (x, y, g), h, 900 + k, lv, water, LEVEL)
        elif kind == "bogbean":
            bog_plants.bogbean(img, ws.to_px, (x, y, LEVEL), 900 + k, lv, water)
        else:
            bog_plants.pad(img, ws.to_px, (x, y, LEVEL), h, 900 + k, lv, water)
    return img


WISPS = [(2.0, 1.6, 0.0, 11), (-5.5, 3.0, 0.21, 12), (6.5, -4.0, 0.43, 13), (-2.0, -6.5, 0.67, 14), (9.0, 3.5, 0.82, 15)]
wisp_fire.LIFE = 0.7


def wisps(img, w, W, px, py, pz, L, T=0.4):
    """the wisp-fire: small cold flames drifting low over the black water in wandering paths, gathering and parting,
    each lighting the water under it and shown again, upside down and dimmer, in the mirror"""
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    dep = px + py
    GH, GW = img.shape[:2]
    for (a, p, ph, sd) in WISPS:
        th = 2 * np.pi * (T + ph)
        x = ws.FOCUS[0] + a + np.sin(th + sd) * 1.6 + np.sin(th * 2 + sd * 3) * 0.5     # a wandering loop
        y = ws.FOCUS[1] + p + np.cos(th * 1 + sd * 2) * 1.2
        if float(ws.look(W, W["bog_water"], np.array(x), np.array(y))) < 0.5:
            continue                                                         # only over the water
        z = LEVEL + 0.5 + 0.25 * np.sin(th * 3 + sd)
        tmp = np.zeros_like(img)
        tmp = wisp_fire.draw(tmp, ws.to_px, np.full(dep.shape, -1e9), [(x, y, z, -T + 0.35, sd)], T,
                             pool=lambda xs, ys: water[np.clip(ys, 0, GH - 1), np.clip(xs, 0, GW - 1)])
        lit = tmp.sum(2) > 0.02
        sx, sy = ws.to_px((x, y, z))
        if (x + y) < dep[int(np.clip(sy, 0, GH - 1)), int(np.clip(sx, 0, GW - 1))] - 0.6:
            continue
        img[lit] = np.maximum(img[lit], tmp[lit])
        _, wl = ws.to_px((x, y, LEVEL))                                      # the mirror: the flame turned over the water line
        rr_, cc_ = np.nonzero(lit & (np.arange(GH)[:, None] < wl))
        mr = np.round(2 * wl - rr_).astype(int)
        ok = (mr >= 0) & (mr < GH)
        rr_, cc_, mr = rr_[ok], cc_[ok], mr[ok]
        ok = water[mr, cc_]
        img[mr[ok], cc_[ok]] = np.clip(img[mr[ok], cc_[ok]] * 0.5 + tmp[rr_[ok], cc_[ok]] * 0.45, 0, 1)
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


ws.LIVING[:] = [mirror, giant_rib_mirror, plants, giant_ribs, bog_fog, wisps]
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
    out_ = sys.argv[1] if len(sys.argv) > 1 else "bog_scene.png"
    if out_.endswith(".webp"):
        ws.animate(out_, int(sys.argv[2]) if len(sys.argv) > 2 else 12)
    else:
        ws.main(out_)
