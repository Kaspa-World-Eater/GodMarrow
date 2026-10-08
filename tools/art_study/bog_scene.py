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
R_ALGAE = ramp("#070a08", "#0e140f", "#162016", "#1f2c1b", "#2a3a21", "#364a27")                         # algae below the tide line
R_MOSS = ramp("#0b0d08", "#13170d", "#1d2212", "#272d17", "#31381c", "#3c4321", "#474e27")   # brown-olive bog moss (the fen lesson: not green)
R_MUD = ramp("#0b0807", "#140f0c", "#1f1712", "#2a2018", "#36291f", "#433327")
R_PEAT = ramp("#0b0908", "#15100d", "#201913", "#2c2219", "#392d21", "#46382a")
R_SEDGE = ramp("#0e0f08", "#1a1b0d", "#282911", "#383816", "#4a481c", "#5d5823", "#716a2c")
R_WATER = ramp("#040507", "#07090c", "#0b0e12", "#101419", "#161b21")
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
    water = (H < LEVEL) & (part == 0)
    W["H"] = np.where(water, LEVEL, H)
    W["Hrest"] = W["H"].copy()
    W["HT"] = np.full(H.shape, -50.0)
    W["tag"] = np.zeros(H.shape, int)
    W["water"] = np.zeros(H.shape, bool)                                    # the engine's own water off: this bog paints its own
    W["bog_part"] = part
    W["bog_water"] = water
    W["bog_depth"] = np.clip(LEVEL - H, 0, 2)
    W["bog_crown"] = info["crown"]
    W["bog_wet"] = info["wet"]
    W["bog_tus"] = tus
    W["bog_bed"] = bed
    W["bog_v"] = np.abs(info["v"])


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
    tide = wet < 0.16                                                        # below the old water line: algae on the bone
    bone = _r(R_BONE, vv * 0.92 + (vn(px * 4, py * 4) - 0.5) * 0.08)
    crn = _r(R_CROWN, vv * 0.92)
    bcol = np.where((crown > 0.6)[..., None], crn, bone)
    bcol = np.where(tide[..., None], _r(R_ALGAE, vv * 0.95), bcol)
    isb = (part == 1) | (part == 4)
    col = np.where(isb[..., None], bcol, col)
    mossy = part == 2
    patch = vn(px * 1.3 + 4, py * 1.3)                                       # moss, sedge and mud in patches, not a lawn
    mc = _r(R_MOSS, vv * 0.9 + (vn(px * 9, py * 9) - 0.5) * 0.14)
    sc = _r(R_SEDGE, vv * 0.85 + (vn(px * 14, py * 5) - 0.5) * 0.16)
    uc = _r(R_MUD, vv * 0.9 + (vn(px * 7, py * 7) - 0.5) * 0.1)
    cov = np.where((patch > 0.62)[..., None], sc, np.where((patch < 0.32)[..., None], uc, mc))
    col = np.where(mossy[..., None], cov, col)
    col = np.where((part == 3)[..., None], _r(R_MUD, vv * 0.9), col)
    # the black water: still and level; what lies over it comes in mirror() once everything is painted
    wcol = _r(R_WATER, 0.2 + (vn(px * 0.25, py * 0.25) - 0.5) * 0.16)
    col = np.where(water[..., None], wcol, col)
    img[gl] = col[gl]
    return img


SKY = np.array([0.06, 0.075, 0.1])          # the night sky in the water where nothing stands over it


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
    sx, sy = ws.to_px((hx, hy, hz))
    sx = np.clip(np.round(sx).astype(int), 0, img.shape[1] - 1)
    sy = np.clip(np.round(sy).astype(int), 0, img.shape[0] - 1)
    # the night sky where nothing stands over the water: moonlit cloud drifting, seen far off along the reflected ray
    cl = vn((x0 - 6) * 0.09 + T * 0.4, (y0 - 6) * 0.09) * 0.7 + vn(x0 * 0.3 - T, y0 * 0.3) * 0.3
    sky = SKY[None] + np.clip(cl - 0.45, 0, 1)[:, None] * np.array([0.16, 0.17, 0.19])
    refl = np.where(hit[:, None], img[sy, sx], sky)
    base = img[wy_, wx_]
    out = base * 0.45 + refl * np.array([0.5, 0.55, 0.62])                    # darker and cooler than what it shows
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
    mat = water & ((vn(px * 0.9 + 3, py * 0.9) * 0.6 + vn(px * 4, py * 4) * 0.4 + lee * 0.35) > 0.78)
    speck = vn(px * 23, py * 23) > 0.42
    img[mat & speck] = bog_plants.WEED * (0.6 + L["moon"][mat & speck, None] * 0.6)
    img[mat & ~speck] = img[mat & ~speck] * 0.6 + bog_plants.WEED * 0.25
    rng = np.random.default_rng(31)
    fx, fy = ws.FOCUS
    box = (fx - 13, fy - 13, fx + 13, fy + 13)
    da = lambda x, y: float(ws.look(W, W["bog_depth"], np.array(x), np.array(y)))
    pa = lambda x, y: int(ws.look(W, W["bog_part"], np.array(x), np.array(y)))
    ca = lambda x, y: float(ws.look(W, W["bog_v"], np.array(x), np.array(y))) / 3.0
    items = bog_plants.place(rng, da, pa, ca, box)
    items.sort(key=lambda it: it[1] + it[2])
    zb = np.full(img.shape[:2], -1e9)
    dep = px + py
    for k, (kind, x, y, h) in enumerate(items):
        g = float(ws.look(W, W["H"], np.array(x), np.array(y)))
        sx, sy = ws.to_px((x, y, g))
        i, j = int(np.clip(sy, 0, ws.GH - 1)), int(np.clip(sx, 0, ws.GW - 1))
        lv = 0.32 + float(L["moon"][i, j]) * 0.55 + float(L["lamp"][i, j]) * 0.9
        if kind == "reed":
            bog_plants.reed(img, zb, dep, ws.to_px, (x, y, max(g, LEVEL)), h, 900 + k, lv, water, LEVEL)
        elif kind == "sedge":
            bog_plants.sedge(img, zb, dep, ws.to_px, (x, y, g), h, 900 + k, lv, water, LEVEL)
        else:
            bog_plants.pad(img, ws.to_px, (x, y, LEVEL), h, 900 + k, lv, water)
    return img


ws.LIVING[:] = [mirror, plants]
ws.GROUND = ground

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "value":
        VALUE_ONLY = True
    ws.main(sys.argv[1] if len(sys.argv) > 1 else "bog_scene.png")
