"""The old wood, painted from its ecosystem (wood_ecosystem.py) the way the ruins were painted: one height-field world
at true scale, ray-cast in the game's camera, lit by the moon through the canopy and by the hero's lantern, each with
its own shadows; then the living layers. Checked against docs/PAINTED_STANDARD.md's checklist before it is shown.

What is in the frame (from the plan): a giant fallen a few years ago (decay class 2: bark loosening, the log high on
its broken branches), its root plate standing on edge, taller than a man, the pit it tore out beside it; the gap it
opened overhead, bright, crowded with grass and saplings; a middle-aged tree and a young one; a stump; the litter
drifting against the log on the windward side; moss at the feet of things and on the mounds; ferns in the damp.

  python tools/art_study/wood_scene.py OUT.png
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from wood_ecosystem import Wood, fbm, vn
import tiles_wood as tw
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "landkit"))   # the reusable objects
import rock as rockgen

KX, KY, KZ = 18.0, 9.0, 21.0                  # world px per tile (x, y) and per yard of height (the game's camera)
GW, GH = 480, 270                             # the game's view in world px (1920x1080 at 4)
RES = 0.04                                    # yards per cell of the fine world grid
FOCUS = np.array([19.6, 25.0])                # the view's centre on the ground
HERO = np.array([18.6, 25.6])
hexc, ramp = tw.hexc, tw.ramp

R_BARK = ramp("#120f15", "#211a1c", "#302622", "#41332b", "#544235", "#6a5541", "#83694f", "#9c8262")
R_DEAD = ramp("#17171c", "#26252b", "#38363b", "#4e4a4c", "#67615f", "#837b75", "#a19789")
R_WOOD = ramp("#1a1210", "#33221a", "#523826", "#735135", "#946c48", "#b48c62")          # cut / broken wood
R_MOSS = ramp("#0b1210", "#132017", "#1d301b", "#2a4320", "#3b5726", "#516d2e", "#6a8538")
R_SOIL = ramp("#120d10", "#1f1716", "#2f221d", "#413026", "#55402f", "#6b523b")          # torn-up earth
R_ROOT = ramp("#1a1210", "#33251c", "#54402c", "#76603f")
FUNG_TOP = ramp("#2a1a12", "#4a2e1c", "#6c4a2c", "#8c6640")
FUNG_PORE = hexc("#b0a07e")
FUNG_RIM = hexc("#d8ccb0")
R_SKY = ramp("#0a0d16", "#111725", "#1a2234", "#263046")
MOON_C = np.array([0.6, 0.68, 0.88])
LAMP_C = np.array([1.0, 0.7, 0.38])
SUN = np.array([-0.62, 0.22, 0.75])           # the moon: from the screen's upper left (world -x, a little +y: rule 11)
SUN = SUN / np.linalg.norm(SUN)
DEPTH_V = np.array([1.0, 1.0, 2 * KY / KZ])
DEPTH_V = DEPTH_V / np.linalg.norm(DEPTH_V)


_CACHE = {}
_LIVE = {}                                                                 # the living layers' depths, for the hero


# hooks for other scenes built on this engine (ruin_scene.py); this scene sets none of them
WOOD_HOOKS = []          # f(w): change the plan before the world is built (clear ground, open the canopy)
BUILD_HOOKS = []         # f(W, w): stamp more into the built world
PAINTERS = {}            # kind -> f(img, m, v, n, px, py, pz, o, W, L): paint an object kind of another scene
LIGHTS = []              # (x, y, z, reach): more warm lights (a candle), cast like the lantern
LIVING = []              # f(img, w, W, px, py, pz, L, T): more living layers, drawn last
GROUND_LIFE_OK = None    # f(x, y) -> bool: where grass may grow (a ruin keeps its bare ring and its stone clear)
RIM = (1.35, (0.025, 0.025, 0.03))   # the moonlit rim on objects: strength and cool lift
FOREST_LIFE = True       # the wood's own living layers (the leaf fall, falling and skittering leaves, the wisp-fire)
NORMAL_BLUR = 1.0        # cells of blur on the height before its normals (a scene with small stones wants little: blur pillows)
MOONLIT = None           # f(px, py, pz, t) -> 0..1: a scene's own reach of the moon (a cavern's shaft)
GRASS = True             # the old scene's grass tufts in the gap (a scene with its own floor turns them off)
FERNS = True             # the old scene's ferns in the damp
GROUND = None            # f(img, W, px, py, pz, SX, SY, L, v, gl) -> img: another land's ground tiles over the wood's


def build(w):
    """the fine grid over the view: height, material, a tag per object, and per-object data"""
    x0, y0 = FOCUS - 15.0
    n = int(30.0 / RES)
    ii = (np.arange(n) + 0.5) * RES
    X, Y = np.meshgrid(x0 + ii, y0 + ii)
    # the ground from the plan (smooth), resampled
    from scipy.ndimage import map_coordinates
    gi = (Y / 0.1 - 0.5, X / 0.1 - 0.5)
    H = map_coordinates(w.H, gi, order=1, mode="nearest")
    H = H + (fbm(X * 0.9, Y * 0.9) - 0.5) * 0.06                       # the litter's own small relief
    mat = np.zeros(X.shape, int)                                         # 0 ground (litter), 1 moss, 2 bare, 3 water
    sample = lambda A: map_coordinates(A.astype(float), gi, order=0, mode="nearest")
    mat[sample(w.moss) > 0.5] = 1
    mat[sample(w.bare) > 0.5] = 2
    water = sample(w.pool) > 0.5
    light = map_coordinates(w.light, gi, order=1, mode="nearest")
    wet = map_coordinates(w.wet, gi, order=1, mode="nearest")
    tag = np.zeros(X.shape, int)                                         # 0 ground; 100+i trunks; 200+i logs; 300 plate
    obj = {}
    # logs, by decay class: how high they ride, how they look
    order_ = sorted(range(len(w.logs)), key=lambda i: -w.logs[i][5])     # the oldest first: the newest fell on top of them
    for li in order_:
        (ax, ay, bx, by, r, cls, plate) = w.logs[li]
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
        d = np.hypot(X - (ax + dx * t), Y - (ay + dy * t))
        rr_ = r * (1 - t * 0.35)                                         # it tapers toward the crown
        ride = {1: 1.15, 2: 0.95, 3: 0.55, 4: 0.3, 5: 0.0}[cls]          # held up on its branches .. sunk to a hump
        if cls == 5:
            top = H + np.sqrt(np.clip(1 - (d / (rr_ * 1.4)) ** 2, 0, 1)) * rr_ * 0.45
            m = d < rr_ * 1.4
        else:
            top = H + rr_ * ride + np.sqrt(np.clip(rr_ ** 2 - d ** 2, 0, None))
            if cls == 4:
                top = top - (vn(X * 3 + li, Y * 3) > 0.62) * rr_ * 0.25    # soft and blocky, split into cubes
            m = d < rr_
        m &= top > H
        H = np.where(m, top, H)
        tag[m] = 200 + li
        obj[200 + li] = dict(kind="log", cls=cls, a=np.array([ax, ay]), d=np.array([dx, dy]) / np.sqrt(L2), r=r)
        if plate:
            # the root plate: a disc of roots and earth stood on edge at the log's foot, across its axis
            ux, uy = dx / np.sqrt(L2), dy / np.sqrt(L2)
            along = (X - ax) * ux + (Y - ay) * uy
            lat = -(X - ax) * uy + (Y - ay) * ux
            Rp = 1.7
            disc = (np.abs(along + 0.15) < 0.22 + (fbm(X * 2, Y * 2) - 0.5) * 0.1) & (np.abs(lat) < Rp + 0.35)
            ang_p = np.arctan2(lat, 1.0)
            spikes = np.clip(np.sin(lat * 23 + fbm(lat * 3, 1) * 6) * 1.6 - 0.6, 0, 1) * 0.55       # roots snapped off, standing out
            clods = (fbm(lat * 4, 7) - 0.5) * 0.45
            ptop = H + 1.1 + np.sqrt(np.clip(Rp ** 2 - lat ** 2, 0, None)) * 0.85 + clods + spikes
            m2 = disc & (ptop > H)
            H = np.where(m2, ptop, H)
            tag[m2] = 300
            zc = float(H[int((ay - y0) / RES), int((ax - x0) / RES)]) if False else 0.0
            obj[300] = dict(kind="plate", a=np.array([ax, ay]), u=np.array([ux, uy]), r=r, ride=ride)
            # the broken branch stubs along the log: a class-2 giant has lost its twigs but not its limbs' stumps
            for t0 in (0.32, 0.55, 0.78):
                bx, by = ax + dx * t0, ay + dy * t0
                side_ = 1 if int(t0 * 10) % 2 else -1
                sl = r * (1 - t0 * 0.35) * 0.2
                rl = r * (1 - t0 * 0.35)
                g0 = H[int(np.clip((by - y0) / RES, 0, n - 1)), int(np.clip((bx - x0) / RES, 0, n - 1))]
                for k in range(14):
                    f = k / 13
                    off = rl * 0.25 + f * rl * 0.45                               # rising out of the log's top, within its width
                    sx_ = bx + (-uy) * side_ * off
                    sy_ = by + ux * side_ * off
                    d_ = np.hypot(X - sx_, Y - sy_)
                    zz = g0 + rl * ride + np.sqrt(max(rl ** 2 - off ** 2, 0)) + f * 0.35
                    mm_ = (d_ < sl) & (zz + np.sqrt(np.clip(sl ** 2 - d_ ** 2, 0, None)) > H)
                    H = np.where(mm_, zz + np.sqrt(np.clip(sl ** 2 - d_ ** 2, 0, None)), H)
                    tag[mm_] = 200 + li
    # rocks: each the landkit object itself (tools/landkit/rock.py), stamped into the world where the ecosystem put it
    RM = np.zeros(X.shape, int)
    for ri, (kind, rx, ry, seed) in enumerate(w.rocks):
        if abs(rx - FOCUS[0]) > 13 or abs(ry - FOCUS[1]) > 13:
            continue
        img_, mask_, n_, C_, F, meta = rockgen.make(kind, seed)
        lx, ly = X - rx, Y - ry
        inside = (np.abs(lx) < F.half) & (np.abs(ly) < F.half)
        fh = np.where(inside, F.at(F.H, lx, ly), -9.0)
        fm = np.where(inside, F.at(F.M, lx, ly, 0), 0)
        base = map_coordinates(H, ((ry - y0) / RES - 0.5, (rx - x0) / RES - 0.5), order=1) if False else H[int((ry - y0) / RES), int((rx - x0) / RES)]
        m = fh > 0.0
        H = np.where(m, np.maximum(H, base + fh), H)
        tag[m] = 400 + ri
        RM[m] = fm[m]
        obj[400 + ri] = dict(kind="rock", rp=rockgen.SANDST if kind == "slab" else rockgen.GRANITE, base=base)
    # trunks, snags, stumps: columns with flared feet and buttress ridges
    H_ground = H.copy()
    sway_m = np.zeros(X.shape, bool)
    for ti, (tx, ty, kind, r, cr) in enumerate(w.trees):
        if abs(tx - FOCUS[0]) > 13 or abs(ty - FOCUS[1]) > 13:
            continue
        d = np.hypot(X - tx, Y - ty)
        ang = np.arctan2(Y - ty, X - tx)
        nb = 5 if kind in ("giant", "middle") else 0
        butt = (np.cos(ang * nb + ti + np.sin(ang * 3 + ti) * 0.4) * 0.5 + 0.5) ** 7 if nb else 0   # root ridges, narrow and uneven
        flare = r * 1.25 + butt * r * 1.5
        hgt = {"giant": 16.0, "middle": 14.0, "young": 12.0, "snag": 7.0, "stump": 0.8}[kind]
        foot = d < flare
        # the flare: wide at the ground, reaching the trunk's own radius a yard up
        z_at = np.where(d <= r, hgt, np.clip((flare - d) / np.maximum(flare - r, 1e-3), 0, 1) ** 2.2 * (0.6 + butt * 0.9))   # a concave sweep up out of the roots
        if kind == "stump":
            z_at = np.where(d <= r, 0.8 + (fbm(X * 4, Y * 4) - 0.5) * 0.15 - np.clip(1 - d / (r * 0.6), 0, 1) * 0.25, z_at)
        if kind == "snag":
            z_at = np.where(d <= r, hgt - (fbm(ang * 2, 3) - 0.3) * 2.5, z_at)       # the broken top, jagged
        top = H + z_at
        m = foot & (top > H)
        H = np.where(m, top, H)
        tag[m] = 100 + ti
        if kind in ("giant", "middle", "young", "snag"):
            sway_m |= m
        obj[100 + ti] = dict(kind=kind, c=np.array([tx, ty]), r=r)
    # the litter, as the ecology lays it: banked into a drift against the windward side of every log (a real ridge,
    # a hand high, that catches the moon), deep and fresh in the pits, thin over the mounds
    from wood_ecosystem import WIND
    logm = (tag >= 200) & (tag < 300)
    sh_c = (-WIND[1] * 0.45 / RES, -WIND[0] * 0.45 / RES)
    up = nd.shift(logm.astype(float), sh_c, order=0)
    ridge = nd.gaussian_filter(up, 4) * (~logm)
    H = np.where(tag == 0, H + ridge * 0.16, H)
    litt = map_coordinates(w.litter, gi, order=1, mode="nearest") + ridge * 0.8
    rel = H - nd.gaussian_filter(H, 30)
    litt = litt - np.clip(rel, 0, None) * 1.5 + np.clip(-rel, 0, None) * 1.2
    bare = (rel > 0.12) & (tag == 0) & (litt < 0.45)
    mat[bare & (mat != 1)] = 2
    HT = np.where(sway_m, H, -50.0)                                        # the standing trees alone
    Hrest = np.where(sway_m, H_ground, H)                                   # everything else
    return dict(X=X, Y=Y, H=H, mat=mat, tag=tag, obj=obj, water=water, light=light, wet=wet, x0=x0, y0=y0, n=n, litt=litt, RM=RM,
                HT=HT, Hrest=Hrest)


def look(W, A, x, y, outside=None):
    """A at world (x, y); past the grid's edge, `outside` (for the height: empty space, so nothing is extruded)"""
    fi = (x - W["x0"]) / RES
    fj = (y - W["y0"]) / RES
    ci = np.clip(fi.astype(int), 0, W["n"] - 1)
    ri = np.clip(fj.astype(int), 0, W["n"] - 1)
    v = A[ri, ci]
    if outside is not None:
        v = np.where((fi < 0) | (fj < 0) | (fi >= W["n"]) | (fj >= W["n"]), outside, v)
    return v


def lean(x, y, z, t):
    """how far a standing tree has leaned at height z (yards), toward the wind (the screen's right: world +x, -y):
    a slow sway, each tree in its own phase, much more in the gust, little at the foot and most at the crown"""
    A = 0.025 * np.sin(2 * np.pi * t * 2 + x * 0.7 + y * 0.4) + 0.09 * (gust(t) - 1.0) * (1 + 0.3 * np.sin(x * 1.3 - y))
    k = A * np.clip(z / 10.0, 0, 1.6) ** 2
    # in whole pixels: the lean moves the wood rigidly a pixel at a time, so its bark never shimmers (on a thin trunk a
    # sub-pixel lean resamples most of the tree each frame); the shift on screen is purely sideways, 1.414 * k * KX px
    px_shift = np.round(1.414 * k * KX)
    k = px_shift / (1.414 * KX)
    return k * 0.707, -k * 0.707


def cast(W, t=None):
    """every screen pixel down into the world: the point it meets (t: the trees lean with the wind at that time)"""
    SY, SX = np.mgrid[0:GH, 0:GW].astype(float)
    ox = GW / 2 - (FOCUS[0] - FOCUS[1]) * KX
    oy = GH / 2 - (FOCUS[0] + FOCUS[1]) * KY
    px = np.zeros((GH, GW))
    py = np.zeros((GH, GW))
    pz = np.full((GH, GW), -1.0)
    got = np.zeros((GH, GW), bool)
    zs = np.concatenate([np.arange(17.0, 3.0, -0.08), np.arange(3.0, -2.6, -0.015)])
    for z in zs:
        u = (SX - ox) / KX
        v = (SY - oy + z * KZ) / KY
        x, y = (u + v) / 2, (v - u) / 2
        if t is None:
            hit = ~got & (look(W, W["H"], x, y, -50.0) >= z)
            px[hit], py[hit], pz[hit] = x[hit], y[hit], z
            got |= hit
            continue
        lx, ly = lean(x, y, z, t)
        tx_, ty_ = x - lx, y - ly
        hit_t = ~got & (look(W, W["HT"], tx_, ty_, -50.0) >= z)
        hit_r = ~got & ~hit_t & (look(W, W["Hrest"], x, y, -50.0) >= z)
        px[hit_t], py[hit_t], pz[hit_t] = tx_[hit_t], ty_[hit_t], z
        px[hit_r], py[hit_r], pz[hit_r] = x[hit_r], y[hit_r], z
        got |= hit_t | hit_r
    return px, py, pz, SX, SY


def shade(W, px, py, pz, SX, SY, t=0.0):
    H, tag = W["H"], W["tag"]
    Hs = nd.gaussian_filter(H, NORMAL_BLUR) if NORMAL_BLUR > 0 else H
    gy_, gx_ = np.gradient(Hs, RES)
    hh = look(W, H, px, py)
    tg = look(W, tag, px, py)
    side = pz < hh - 0.06                                                  # met a wall (trunk, log side, plate face)
    nx, ny = -look(W, gx_, px, py), -look(W, gy_, px, py)
    n_top = np.dstack([nx * 1.6, ny * 1.6, np.ones_like(px)])
    n_top /= np.linalg.norm(n_top, axis=2, keepdims=True)
    hz = np.hypot(nx, ny) + 1e-6
    n_side = np.dstack([nx / hz, ny / hz, np.zeros_like(px)])
    n = np.where(side[..., None], n_side, n_top)
    # true round normals on trunks and logs
    for k, o in W["obj"].items():
        m = tg == k
        if not m.any():
            continue
        if o["kind"] in ("giant", "middle", "young", "snag", "stump"):
            d = np.dstack([px - o["c"][0], py - o["c"][1], np.zeros_like(px)])
            d /= np.linalg.norm(d, axis=2, keepdims=True) + 1e-9
            n = np.where((m & side)[..., None], d, n)
        elif o["kind"] == "log":
            rel = np.dstack([px - o["a"][0], py - o["a"][1]])
            along = rel[..., 0] * o["d"][0] + rel[..., 1] * o["d"][1]
            perp = np.dstack([rel[..., 0] - o["d"][0] * along, rel[..., 1] - o["d"][1] * along, (pz - look(W, nd.gaussian_filter(H * 0 + H, 0), px, py) * 0 - (pz - o["r"]) * 0)])
            lat = rel[..., 0] * -o["d"][1] + rel[..., 1] * o["d"][0]
            q = np.clip(lat / o["r"], -1, 1)
            nl = np.dstack([-o["d"][1] * q, o["d"][0] * q, np.sqrt(1 - q * q)])
            n = np.where(m[..., None], nl, n)
    # the moon through the canopy: the gap bright, the rest dim but for flecks that move as the leaves move
    canopy = look(W, W["light"], px, py)
    ox_, oy_ = np.cos(t * 6.283) * 0.9, np.sin(t * 6.283) * 0.6           # the canopy swaying overhead, a loop
    flk = (vn(px * 1.3 + ox_, py * 1.3 + oy_) > 0.7)
    leafsh = vn(px * 0.55 + ox_ * 0.7, py * 0.55 + oy_ * 0.7) * 0.6 + vn(px * 1.4 + ox_, py * 1.4 + oy_) * 0.4
    moonlit = np.clip(0.42 + canopy * 0.75, 0, 1) + flk * 0.24 * (canopy < 0.6)       # forms must still read under the leaves (flecks 40% fainter)
    if MOONLIT is not None:
        moonlit = MOONLIT(px, py, pz, t)
    ndl = np.clip((n * SUN).sum(2), 0, 1)
    sx0, sy0, sz0 = px + n[..., 0] * 0.12, py + n[..., 1] * 0.12, pz + n[..., 2] * 0.12
    sh = np.zeros_like(px, bool)
    for k in range(1, 70):
        s = k * 0.08
        sh |= look(W, H, sx0 + SUN[0] * s, sy0 + SUN[1] * s, -50.0) > sz0 + SUN[2] * s + 0.03
    moon = ndl * np.where(sh, 0.12, 1.0) * np.clip(moonlit, 0, 1)
    moon = moon * np.where((leafsh > 0.62) & (canopy > 0.45), 0.89, 1.0)   # a hint of moving leaf shadow (40% fainter)
    # the lantern
    lamp = np.array([HERO[0] + 0.25, HERO[1] - 0.25, look(W, H, np.array(HERO[0]), np.array(HERO[1])) + 0.7])
    lx0, ly0, lz0 = px + n[..., 0] * 0.12, py + n[..., 1] * 0.12, pz + n[..., 2] * 0.12
    lv = np.dstack([lamp[0] - px, lamp[1] - py, lamp[2] - pz])
    ld = np.linalg.norm(lv, axis=2)
    lu = lv / ld[..., None]
    lsh = np.zeros_like(px, bool)
    for k in range(1, 24):
        f = k / 24
        lsh |= look(W, H, lx0 + (lamp[0] - lx0) * f, ly0 + (lamp[1] - ly0) * f, -50.0) > lz0 + (lamp[2] - lz0) * f + 0.03
    breath = 1 + 0.09 * np.sin(t * 6.28 * 2) + 0.05 * np.sin(t * 6.28 * 5 + 1) + 0.04 * np.sin(t * 6.28 * 11)
    lampk = np.clip((n * lu).sum(2), 0, 1) ** 0.7 / (1 + (ld / (2.6 * breath)) ** 2) * np.where(lsh, 0.1, 1.0)
    for (cx_, cy_, cz_, reach_) in LIGHTS:                                # more warm lights, cast as the lantern is
        lp = np.array([cx_, cy_, cz_])
        lv2 = np.dstack([lp[0] - px, lp[1] - py, lp[2] - pz])
        ld2 = np.linalg.norm(lv2, axis=2)
        lu2 = lv2 / ld2[..., None]
        lsh2 = np.zeros_like(px, bool)
        for k in range(1, 24):
            f = k / 24
            lsh2 |= look(W, H, lx0 + (lp[0] - lx0) * f, ly0 + (lp[1] - ly0) * f, -50.0) > lz0 + (lp[2] - lz0) * f + 0.03
        flick = 1 + 0.12 * np.sin(t * 6.28 * 3 + cx_) + 0.06 * np.sin(t * 6.28 * 7)
        lampk = lampk + np.clip((n * lu2).sum(2), 0, 1) ** 0.7 / (1 + (ld2 / (reach_ * flick)) ** 2) * np.where(lsh2, 0.08, 1.0)
    ao = np.clip((nd.gaussian_filter(H, 8) - H) * 2.5, 0, 1)
    ao_px = look(W, ao, px, py) * (~side)
    return dict(n=n, side=side, tg=tg, moon=moon, lamp=lampk, ao=ao_px, ndl=ndl, sh=sh, canopy=canopy)


def paint_bark(img, m, v, n, px, py, pz, o, along=None, arc=None, lichen=True):
    """old broadleaf bark, as the big study trees had it (tree_anatomy.py): fissures as long cells running with the
    wood and twisting a little, deep on the thick trunk; lit ridges between; plates at a larger scale (some darker,
    some lighter); moss climbing the north side from the foot; pale lichen blotches on the lit side; damp streaks
    running down. along/arc: coordinates on the wood (yards); for a standing trunk, height and arc round it."""
    if along is None:
        ang = np.arctan2(py - o["c"][1], px - o["c"][0])
        arc = ang * o["r"]
        along = pz
    grain = vn(arc * 15.0 + along * 0.35, along * 1.6)                  # long cells up the trunk, twisting
    fine = vn(arc * 34.0 + along * 0.5, along * 3.6)
    furrow = (grain < 0.32) | ((fine < 0.22) & (grain < 0.45))
    ridge = (grain > 0.68) & (fine > 0.45)
    plates = (vn(arc * 2.6 + 5, along * 0.9) - 0.5) * 0.12                # bark plates, a little lighter or darker
    streak = (vn(arc * 7.0, along * 0.25 + 3) > 0.78) * -0.07              # damp running down
    bv = v + plates + streak - furrow * 0.18 + ridge * 0.1
    img[m] = R_BARK[np.clip((bv * len(R_BARK)).astype(int), 0, len(R_BARK) - 1)][m]
    deep = m & furrow & (grain < 0.18)
    img[deep] = R_BARK[1]                                                   # the bottom of the deepest fissures
    away = np.clip(-(n[..., 0] * SUN[0] + n[..., 1] * SUN[1]), 0, 1)     # the side turned from the moon (north)
    mossy = m & (along < 0.5 + away * 1.6 + (vn(arc * 4, along * 2) - 0.5) * 0.8) & (vn(arc * 6, along * 3) > 0.42) & ~(furrow & (grain < 0.25))
    img[mossy] = R_MOSS[np.clip(((v[mossy] * 0.75 + (fine[mossy] - 0.5) * 0.12) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 2)]
    lit_side = np.clip(n[..., 0] * SUN[0] + n[..., 1] * SUN[1], 0, 1)
    lich = m & ~mossy & (lit_side > 0.3) & (vn(arc * 5 + 9, along * 4) > 0.8) & ~furrow & lichen
    img[lich] = np.array([0.42, 0.46, 0.4]) * np.clip(v[lich] * 1.2 + 0.2, 0.3, 1)[:, None]
    return img


def paint(W, px, py, pz, SX, SY, L, t=0.0):
    tg, side, n = L["tg"], L["side"], L["n"]
    mat = look(W, W["mat"], px, py)
    water = look(W, W["water"], px, py) & (tg == 0)
    bay = tw.B4[SY.astype(int) % 4, SX.astype(int) % 4]
    skyfill = np.clip(n[..., 2], 0, 1) * 0.08 + np.clip(-n[..., 0] * 0.6 + n[..., 1] * 0.2, 0, 1) * 0.06
    bounce = side * (0.1 + np.clip(n[..., 0] + n[..., 1], 0, 1.4) * 0.05)      # the floor's light thrown back onto walls
    v = 0.16 + L["moon"] * 0.7 + skyfill + bounce + L["lamp"] * 1.1 - L["ao"] * 0.25 + (bay - 0.5) * 0.05
    img = np.zeros((GH, GW, 3))
    # ---- the ground: the wood's tiles (litter), moss, bare earth, water
    if "floor" not in _CACHE:                                          # the tiles are painted once
        mains = [tw.main_0(seed=k * 101)[0] for k in range(4)]
        _CACHE["dirt"], _ = tw.dirt_0()
        _CACHE["floor"] = tw.compose(mains, _CACHE["dirt"], GW=GW, GH=GH)
    floor, dirt = _CACHE["floor"], _CACHE["dirt"]
    gl = (tg == 0) & ~water
    k_light = (0.25 + L["moon"][..., None] * 0.9 * MOON_C + L["lamp"][..., None] * 1.5 * LAMP_C) * (1 - L["ao"][..., None] * 0.35)
    # the litter's depth on the tile: deep and fresh (warmer, lighter, the new leaves on top), thin (the dark humus showing)
    litt = look(W, W["litt"], px, py)
    deep = np.clip((litt - 0.75) * 2.5, 0, 1)
    thin = np.clip((0.5 - litt) * 3, 0, 1)
    eco = floor * (1 + deep[..., None] * np.array([0.22, 0.12, 0.0])) * (1 - thin[..., None] * 0.3)
    # the bare mineral soil of the mounds: the dirt tile, a cooler grey-brown
    barem = gl & (mat == 2)
    dx_ = (SX % tw.TW).astype(int)
    dy_ = (SY % tw.TH).astype(int)
    eco[barem] = dirt[dy_[barem], dx_[barem]] * 1.1
    img[gl] = (eco * k_light)[gl]
    mossm = gl & (mat == 1)
    cush = (vn(px * 9, py * 9) - 0.5) * 0.12
    img[mossm] = R_MOSS[np.clip(((v * 0.62 + cush) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 2)][mossm]   # deep olive at night, as on the rocks
    lowr = mossm & ~np.roll(mossm, -1, axis=0) & ~np.roll(mossm, -1, axis=1)
    img[lowr] *= 0.8
    upl = mossm & ~np.roll(mossm, 1, axis=0) & ~np.roll(mossm, 1, axis=1)
    img[upl] = np.minimum(img[upl] * 1.2, 1)
    if GROUND is not None:
        img = GROUND(img, W, px, py, pz, SX, SY, L, v, gl)
    if water.any():
        img[water] = R_SKY[np.clip(((0.4 + (vn(px * 0.6, py * 0.6) - 0.5) * 0.4) * 4).astype(int), 0, 3)][water]
        glint = water & (vn(px * 2 - t, py * 8) > 0.74) & (L["canopy"] > 0.4)
        img[glint] = img[glint] * 0.4 + np.array([0.6, 0.66, 0.78]) * 0.6
        shore = water & ~nd.binary_erosion(water, iterations=2)
        img[shore] *= 0.6
    # ---- the objects
    for k, o in W["obj"].items():
        m = tg == k
        if not m.any():
            continue
        if o["kind"] in ("giant", "middle", "young"):
            img = paint_bark(img, m, v, n, px, py, pz, o)
        elif o["kind"] == "snag":
            ang = np.arctan2(py - o["c"][1], px - o["c"][0])
            arc = ang * o["r"]
            grain = vn(arc * 14.0 + pz * 0.2, pz * 0.9)                         # weathered silver grain, long
            fine = vn(arc * 40.0, pz * 2.4)
            crack = (grain < 0.25) | (fine < 0.12)
            ridge = (grain > 0.7)
            holes = (vn(ang * 4, pz * 2.5) > 0.86)
            dv = v + 0.04 - crack * 0.2 + ridge * 0.08 + (vn(arc * 3, pz * 0.6) - 0.5) * 0.08
            img[m] = R_DEAD[np.clip((dv * len(R_DEAD)).astype(int), 0, len(R_DEAD) - 1)][m]
            img[m & holes] = hexc("#0a0809")
            barkl = m & (pz < 1.4 + vn(ang * 3, 1) * 1.2) & (vn(ang * 5, pz * 1.5) > 0.5)
            img[barkl] = R_BARK[np.clip(((v[barkl] * 0.85) * len(R_BARK)).astype(int), 0, len(R_BARK) - 1)]
        elif o["kind"] == "stump":
            topm = m & ~side
            sidem = m & side
            ring = np.sin(np.hypot(px - o["c"][0], py - o["c"][1]) * 40) > 0.4
            img[topm] = R_WOOD[np.clip(((v - ring * 0.08) * len(R_WOOD)).astype(int), 0, len(R_WOOD) - 1)][topm]
            heart = topm & (np.hypot(px - o["c"][0], py - o["c"][1]) < o["r"] * 0.55)
            img[heart] = R_SOIL[1]                                                  # the soft heart gone to crumb
            img = paint_bark(img, sidem, v * 0.9, n, px, py, pz, o)
        elif o["kind"] == "log":
            cls = o["cls"]
            rel_a = (px - o["a"][0]) * o["d"][0] + (py - o["a"][1]) * o["d"][1]
            if cls <= 2:
                lat = (px - o["a"][0]) * -o["d"][1] + (py - o["a"][1]) * o["d"][0]
                around = np.arcsin(np.clip(lat / o["r"], -1, 1))
                img = paint_bark(img, m, v * 0.72, n, px, py, pz, o, along=rel_a, arc=around * o["r"], lichen=False)   # damp in the litter: darker
                bare_w = m & (vn(rel_a * 2.2 + 4, around * 3) > 0.84)                  # small plates of bark lifted away
                img[bare_w] = R_WOOD[np.clip(((v[bare_w] - 0.05) * len(R_WOOD)).astype(int), 0, len(R_WOOD) - 1)]
            else:
                lat3 = (px - o["a"][0]) * -o["d"][1] + (py - o["a"][1]) * o["d"][0]
                around = np.arcsin(np.clip(lat3 / o["r"], -1, 1))
                if cls == 3:
                    # bark sloughing in plates off grey wood split along its grain; moss starting in strips on top
                    split = np.sin(around * 16 + vn(rel_a * 1.2, around * 2) * 3) > 0.7
                    wood = v - split * 0.18 + (vn(rel_a * 4, around * 8) - 0.5) * 0.06
                    img[m] = R_DEAD[np.clip((wood * len(R_DEAD)).astype(int), 0, len(R_DEAD) - 1)][m]
                    plates = m & (vn(rel_a * 1.6 + 7, around * 2.2) > 0.6)
                    img[plates] = R_BARK[np.clip(((v[plates] * 0.8) * len(R_BARK)).astype(int), 0, len(R_BARK) - 1)]
                    pe = plates & ~np.roll(plates, -1, axis=0)
                    img[pe] *= 0.65                                                 # each plate's lifted edge, its shadow
                    strip = m & (np.abs(around) < 0.5) & (vn(rel_a * 0.7, around * 5) > 0.42)
                    img[strip] = R_MOSS[np.clip(((v[strip] * 0.9 + (vn(rel_a * 9, around * 9)[strip] - 0.5) * 0.1) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)]
                else:
                    # soft and sunk under moss; blocky cubical breaks show the pale brown wood beneath
                    img[m] = R_MOSS[np.clip(((v * 0.95 + (vn(rel_a * 6, around * 6) - 0.5) * 0.12) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)][m]
                    cube = m & ((np.sin(rel_a * 9) > 0.92) | (np.sin(around * 7) > 0.94)) & (vn(rel_a * 2, around * 2) > 0.55)
                    img[cube] = R_WOOD[np.clip(((v[cube] * 0.7) * len(R_WOOD)).astype(int), 0, len(R_WOOD) - 1)]
        elif o["kind"] == "rock":
            rm = look(W, W["RM"], px, py)
            rpz = pz - o["base"]
            fleck = (vn(px * 60, py * 60 + pz * 60) > 0.86) * 0.06 - (vn(px * 55 + 9, py * 55) > 0.88) * 0.06
            stain = (fbm(px * 2 + pz * 0.5, py * 2) - 0.5) * 0.1
            wetl = np.clip(1 - rpz / 0.09, 0, 1) * 0.12
            st = m & ((rm == rockgen.STONE) | (rm == 0))
            img[st] = o["rp"][np.clip(((v + fleck + stain - wetl) * len(o["rp"])).astype(int), 0, len(o["rp"]) - 1)][st]
            cr = m & (rm == rockgen.CRACK)
            img[cr] = o["rp"][0]
            ms = m & (rm == rockgen.MOSSM)
            img[ms] = rockgen.MOSS[np.clip(((v * 0.9 + (vn(px * 30, py * 30) - 0.5) * 0.14) * len(rockgen.MOSS)).astype(int), 0, len(rockgen.MOSS) - 1)][ms]
            li = m & (rm == rockgen.LICH)
            img[li] = rockgen.LICHEN[np.clip(((v * 0.9 + 0.15) * 4).astype(int), 0, 3)][li]
            lo = m & (rm == rockgen.LICH_O)
            img[lo] = rockgen.RUST[np.clip(((v * 0.8 + 0.1) * 3).astype(int), 0, 2)][lo]
        elif o["kind"] in PAINTERS:
            img = PAINTERS[o["kind"]](img, m, v, n, px, py, pz, o, W, L)
        elif o["kind"] == "plate":
            # the root plate seen behind the log's butt: thick roots radiating from the butt like spokes, snapped at the
            # rim; dark packed earth between them; stones held in the roots; clods still clinging
            lat = (px - o["a"][0]) * -o["u"][1] + (py - o["a"][1]) * o["u"][0]
            base_z = look(W, W["H"], np.array(o["a"][0] - o["u"][0] * 1.0), np.array(o["a"][1] - o["u"][1] * 1.0))
            zc = base_z + o["r"] * o["ride"] + 0.15
            dz = pz - zc
            ang = np.arctan2(dz, lat)
            rad = np.hypot(lat, dz)
            roots = np.zeros_like(px, bool)
            edge_lit = np.zeros_like(px, bool)
            rrs = np.random.default_rng(3)
            for k in range(13):
                a0 = -np.pi * 0.05 + k * (np.pi * 1.1 / 12) + rrs.normal(0, 0.06)
                wob = np.sin(rad * 3 + k) * 0.08
                dist = np.abs(((ang - a0 - wob + np.pi) % (2 * np.pi)) - np.pi) * rad
                wid = np.clip(0.16 - rad * 0.06, 0.04, 0.16) * rrs.uniform(0.7, 1.2)
                r_k = m & (dist < wid) & (rad > 0.3)
                roots |= r_k
                edge_lit |= m & (dist < wid) & (dist > wid * 0.55) & (((ang - a0 - wob + np.pi) % (2 * np.pi)) - np.pi > 0)
            soil = m & ~roots
            sv = v * 0.75 - 0.05 + (vn(px * 12, pz * 12) - 0.5) * 0.12
            img[soil] = R_SOIL[np.clip((sv * len(R_SOIL)).astype(int), 0, len(R_SOIL) - 1)][soil]
            rv = v * 0.9 + (vn(rad * 6, ang * 3) - 0.5) * 0.1
            img[roots] = R_ROOT[np.clip((rv * len(R_ROOT)).astype(int), 0, len(R_ROOT) - 1)][roots]
            el = roots & edge_lit
            img[el] = np.minimum(img[el] * 1.3, 1)
            stones = m & (vn(px * 11, pz * 11) > 0.85)
            img[stones] = tw.PEBBLE[np.clip(((v[stones] + 0.1) * len(tw.PEBBLE)).astype(int), 0, len(tw.PEBBLE) - 1)]
    # ---- the night air: the further from the viewer, the more cool dark air between (stepped, dithered)
    far = np.clip(((HERO[0] + HERO[1]) - 2.5 - (px + py)) / 10.0, 0, 0.45)   # the air begins behind the gap's heart
    far = np.round((far + (bay - 0.5) * 0.08) * 8) / 8
    img = img * (1 - far[..., None]) + np.array([0.06, 0.075, 0.11]) * far[..., None]
    # ---- the light's temperature, stepped
    warm = L["lamp"] > 0.15
    img[warm & (tg != 0)] = img[warm & (tg != 0)] * np.array([1.15, 1.0, 0.78])
    cool = (L["lamp"] <= 0.15) & (tg != 0)
    img[cool] = img[cool] * np.array([0.95, 0.97, 1.05])
    # ---- rims: an object's edge against what is behind it, where the moon reaches it
    dep = px + py
    lit_side = np.clip(n[..., 0] * SUN[0] + n[..., 1] * SUN[1], 0, 1)
    for k in np.unique(tg):
        if k == 0 or k >= 400:
            continue
        mk = tg == k
        edge = mk & ~np.roll(mk, 1, axis=1) & (np.roll(dep, 1, axis=1) < dep - 0.3)
        rim = edge
        img[rim] = np.minimum(img[rim] * RIM[0] + np.array(RIM[1]), 1)
    return np.clip(img, 0, 1)


def to_px(p3):
    ox = GW / 2 - (FOCUS[0] - FOCUS[1]) * KX
    oy = GH / 2 - (FOCUS[0] + FOCUS[1]) * KY
    return (p3[0] - p3[1]) * KX + ox, (p3[0] + p3[1]) * KY + oy - p3[2] * KZ


def gust(T):
    """the one wind: a steady breath, and once a loop a gust passes through (rises and falls over a fifth of the loop)"""
    d = min(abs(T - 0.6), 1 - abs(T - 0.6))
    return 1.0 + 1.6 * np.exp(-(d / 0.09) ** 2)


def drift(fn, T, period=1.0):
    """a seamless looping drift: two copies of a moving field, cross-faded so frame 0 and the last frame meet"""
    return fn(T) * (1 - T) + fn(T - period) * T


def living(img, w, W, px, py, pz, L, t=0.0):
    T = t                                                                # the loop's time (t is reused below)
    """drawn piece by piece; each lit by the light where it stands, hidden by what is nearer the camera"""
    from forest_floor import FROND, CAP
    from scatter_wood import grass_clump, paste
    rr = np.random.default_rng(21)
    dep = px + py
    bay_l = tw.B4[(np.arange(GH)[:, None] % 4), (np.arange(GW)[None, :] % 4)]
    gh = lambda x, y: float(look(W, W["H"], np.array(x), np.array(y)))

    def light_at(x, y):
        sx, sy = to_px((x, y, gh(x, y)))
        i, j = int(np.clip(sy, 0, GH - 1)), int(np.clip(sx, 0, GW - 1))
        return 0.3 + L["moon"][i, j] * 0.9 + L["lamp"][i, j] * 1.6, (i, j)

    LDEP = np.full((GH, GW), -1e9)
    _LIVE["ldep"] = LDEP
    _LIVE["pz"] = pz

    def put(sx, sy, col, depth):
        i, j = int(sy), int(sx)
        if 0 <= i < GH and 0 <= j < GW and dep[i, j] <= depth + 0.15:
            img[i, j] = col
            LDEP[i, j] = max(LDEP[i, j], depth)
    # first the fresh fall (everything that grows comes up through it): leaves placed by the ecology, thick where the litter lies deep and in the drifts, few where
    # it is thin; each a drawn stamp, lit by the light where it lies
    from litter_stamps import LEAVES
    litt_px = look(W, W["litt"], px, py)
    tgm0 = look(W, W["tag"], px, py)
    rf_ = np.random.default_rng(101)                                      # its own sequence, the same every frame
    NC = int(GW * GH / 9) if FOREST_LIFE else 0
    c_sx, c_sy = rf_.integers(2, GW - 8, NC), rf_.integers(2, GH - 6, NC)
    c_r, c_st, c_fam = rf_.random(NC), rf_.integers(0, len(LEAVES) - 1, NC), rf_.random(NC)
    for q in range(NC):
        sx, sy = int(c_sx[q]), int(c_sy[q])
        if tgm0[sy, sx] != 0:
            continue
        dl = litt_px[sy, sx]
        if c_r[q] > np.clip((dl - 0.7) * 1.6, 0.03, 0.85):
            continue
        st = LEAVES[int(c_st[q])]
        fam = 0 if c_fam[q] < 0.55 else 1
        k = 0.3 + L["moon"][sy, sx] * 0.9 + L["lamp"][sy, sx] * 1.6
        rp = tw.LITTER[fam]
        for j, row in enumerate(st):
            for i, ch in enumerate(row):
                yy_, xx_ = sy + j, sx + i
                if ch == "." or not (0 <= yy_ < GH and 0 <= xx_ < GW) or tgm0[yy_, xx_] != 0:
                    continue
                if ch == "S":
                    img[yy_, xx_] *= 0.75
                    continue
                off = {"H": 2, "L": 1, "B": 0, "D": -1, "P": 3, "V": 1}[ch]
                img[yy_, xx_] = rp[int(np.clip(3 + off, 0, 7))] * k
    rr = np.random.default_rng(202)                                       # the ferns' own sequence
    # ferns: in the damp, in clumps of fronds arching out
    fernpts = []
    for _ in range(4000):
        x, y = FOCUS[0] + rr.uniform(-8, 8), FOCUS[1] + rr.uniform(-8, 8)
        wv = float(look(W, W["wet"], np.array(x), np.array(y)))
        lv_ = float(look(W, W["light"], np.array(x), np.array(y)))
        if look(W, W["tag"], np.array(x), np.array(y)) == 0 and not look(W, W["water"], np.array(x), np.array(y))                 and rr.random() < np.clip((wv - 0.45) * 2.0, 0, 1) * (lv_ < 0.65) * 0.25:
            fernpts.append((y, x))
        if len(fernpts) >= 40:
            break
    fernpts = fernpts if FERNS else []
    fernpts.sort(key=lambda q: q[0] + q[1])
    for (yy, xx) in fernpts:
        if abs(xx - FOCUS[0]) > 9 or abs(yy - FOCUS[1]) > 9:
            continue
        k, _ = light_at(xx, yy)
        for f in range(rr.integers(5, 9)):
            a = rr.uniform(0, 2 * np.pi)
            ln, hg = rr.uniform(0.5, 0.9), rr.uniform(0.3, 0.55)
            dg = np.array([np.cos(a), np.sin(a)])
            prev = None
            for i in range(18):
                t = i / 17
                swy = np.sin(2 * np.pi * T * 2 - (xx - yy) * 0.9) * 0.16 * t * t * gust(T)
                x, y = xx + dg[0] * ln * t + swy, yy + dg[1] * ln * t - swy
                z = gh(xx, yy) + hg * 4 * t * (1 - t) * (1 if t < 0.5 else 1.15)
                sx, sy = to_px((x, y, z))
                col = FROND[4] * k * 0.9
                if prev is not None:
                    for q in np.linspace(0, 1, 3):
                        put(prev[0] + (sx - prev[0]) * q, prev[1] + (sy - prev[1]) * q, col, x + y)
                if t > 0.1 and i % 2 == 0:
                    pl = 0.16 * (1 - t) ** 0.7
                    for sg in (-1, 1):
                        lx, ly = x - dg[1] * pl * sg, y + dg[0] * pl * sg
                        qx, qy = to_px((lx, ly, z - 0.06))
                        c2 = (FROND[5] if sg < 0 else FROND[4]) * k
                        for q in np.linspace(0, 1, 3):
                            put(sx + (qx - sx) * q, sy + (qy - sy) * q, c2, lx + ly)
                prev = (sx, sy)
    def paste_d(spr, sx, sy, k, depth):
        h_, w_ = spr.shape[:2]
        x0, y0 = int(sx) - w_ // 2, int(sy) - h_ + 3
        for j in range(h_):
            for i in range(w_):
                a = spr[j, i, 3]
                yy_, xx_ = y0 + j, x0 + i
                if a <= 0 or not (0 <= yy_ < GH and 0 <= xx_ < GW) or dep[yy_, xx_] > depth + 0.15:
                    continue
                if spr[j, i, :3].sum() == 0:
                    img[yy_, xx_] *= (1 - a)
                else:
                    img[yy_, xx_] = spr[j, i, :3] * k
                    LDEP[yy_, xx_] = max(LDEP[yy_, xx_], depth)
    tgm = look(W, W["tag"], px, py) != 0                                # never drawn over a trunk, a log, the plate
    rr = np.random.default_rng(303)                                       # the grass's own sequence
    # grass and saplings in the gap: crowding its brightest heart, thinning to its edge, in tufts
    gx, gy, gr = w.gap
    clumps = [grass_clump(s) for s in range(6)]
    centres = [(gx + rr.normal(0, gr * 0.3), gy + rr.normal(0, gr * 0.3)) for _ in range(9)]
    pts = []
    for (cx, cy) in centres:
        for _ in range(rr.integers(3, 9)):
            pts.append((cx + rr.normal(0, 0.6), cy + rr.normal(0, 0.45)))
    pts = pts if GRASS else []
    pts.sort(key=lambda q: q[0] + q[1])
    for (x, y) in pts:
        if look(W, W["tag"], np.array(x), np.array(y)) != 0 or abs(x - FOCUS[0]) > 9 or abs(y - FOCUS[1]) > 9:
            continue
        if GROUND_LIFE_OK is not None and not GROUND_LIFE_OK(x, y):
            continue
        k, (i, j) = light_at(x, y)
        sx, sy = to_px((x, y, gh(x, y)))
        wave = np.sin(2 * np.pi * T * 2 - (x - y) * 0.9) * gust(T)      # a wave rolling across with the wind
        fr_ = 0 if wave < -0.3 else (2 if wave > 0.3 else 1)
        paste_d(clumps[rr.integers(0, 6)][fr_], sx, sy, min(k, 1.3), x + y)
    rr = np.random.default_rng(404)                                       # the saplings' own sequence
    for (x, y) in w.sapl:
        if abs(x - FOCUS[0]) > 9 or abs(y - FOCUS[1]) > 9 or look(W, W["tag"], np.array(x), np.array(y)) != 0:
            continue
        k, _ = light_at(x, y)
        hgt = rr.uniform(0.8, 1.8)
        z0 = gh(x, y)
        b = to_px((x, y, z0))
        sw_ = np.sin(2 * np.pi * T * 2 - (x - y) * 0.9) * 0.14 * gust(T)
        tp = to_px((x + 0.05 + sw_, y - sw_, z0 + hgt))
        for q in np.linspace(0, 1, 30):
            put(b[0] + (tp[0] - b[0]) * q, b[1] + (tp[1] - b[1]) * q, R_BARK[3] * k, x + y)
        for lf in range(10):                                            # a sapling's few leaves, in pairs up the stem
            q = rr.uniform(0.35, 1.0)
            cx, cy = b[0] + (tp[0] - b[0]) * q, b[1] + (tp[1] - b[1]) * q
            sd = rr.choice([-1, 1])
            for d in range(3):
                put(cx + sd * (d + 1), cy - d * 0.5, np.array([0.3, 0.42, 0.18]) * k * (1.2 if sd < 0 else 0.85), x + y)
    # bracket fungi in tiers up the snags, on the side the camera sees: a snag's signature
    for k, o in W["obj"].items():
        if o["kind"] != "snag":
            continue
        cx_, cy_ = o["c"]
        rr2 = np.random.default_rng(int(cx_ * 10))
        for tier in range(rr2.integers(3, 6)):
            az = rr2.uniform(1.0, 2.2)                                         # on the moon side the camera sees
            zt = rr2.uniform(1.0, 4.5)
            p0 = np.array([cx_ + np.cos(az) * o["r"], cy_ + np.sin(az) * o["r"], gh(cx_ + o["r"] * 2.5, cy_ + o["r"] * 2.5) + zt])   # from the ground beside it, not its own top
            lx_, ly_ = lean(np.array(p0[0]), np.array(p0[1]), np.array(zt), T)   # the snag leans; so do its brackets
            sx, sy = to_px((p0[0] + float(lx_), p0[1] + float(ly_), p0[2]))
            k_, _ = light_at(cx_ + np.cos(az) * (o["r"] + 0.3), cy_ + np.sin(az) * (o["r"] + 0.3))
            for sh_i in range(rr2.integers(2, 4)):
                w_ = rr2.uniform(6.5, 10.0) - sh_i * 1.6                   # half-width of the shelf, px
                cxs, cys = sx - w_ * 0.45, sy + sh_i * 5.5                  # it juts out toward the moon side
                depth_k = p0[0] + p0[1] + 0.3
                for dy in range(-int(w_ * 0.5) - 1, 4):
                    for dx in range(-int(w_) - 1, int(w_) + 2):
                        u, v_ = dx / w_, dy / (w_ * 0.42)
                        r2 = u * u + v_ * v_
                        if dy <= 0 and r2 <= 1:                              # the top: a half-disc, banded with growth
                            band = int(np.hypot(dx, dy * 2.2) / 1.6) % 2
                            lit_ = np.clip(0.55 - u * 0.25 - v_ * 0.3, 0, 0.99)
                            col = FUNG_TOP[int(lit_ * 4)] * (0.85 if band else 1.0)
                            if r2 > 0.7:
                                col = FUNG_RIM * (1.0 if u < 0.3 else 0.8)       # the pale growing margin
                            put(cxs + dx, cys + dy, np.minimum(col * k_ * 1.5, 1), depth_k)
                        elif dy in (1,) and abs(u) <= 1:                       # the pale pores beneath
                            put(cxs + dx, cys + dy, FUNG_PORE * k_ * 0.75, depth_k)
                        elif dy in (2, 3) and abs(u) <= 0.9:                   # its shadow on the wood
                            i_, j_ = int(cys + dy), int(cxs + dx)
                            if 0 <= i_ < GH and 0 <= j_ < GW:
                                img[i_, j_] *= 0.6
    rr = np.random.default_rng(505)                                       # the fungi's own sequence
    # fungi in clusters: on the old logs, round the stump and the snag's foot (the only decomposers there are)
    spots = list(w.shrooms)
    for k_o, o_ in W["obj"].items():
        if o_["kind"] in ("stump", "snag"):
            for q in range(5):
                a_ = rr.uniform(-0.6, 2.2)
                spots.append((o_["c"][0] + np.cos(a_) * (o_["r"] + 0.25), o_["c"][1] + np.sin(a_) * (o_["r"] + 0.25)))
        if o_["kind"] == "log" and o_["cls"] in (3, 4):
            for q in range(10):
                t_ = rr.uniform(0.1, 0.9)
                spots.append((o_["a"][0] + o_["d"][0] * t_ * 8 + -o_["d"][1] * o_["r"] * 1.1, o_["a"][1] + o_["d"][1] * t_ * 8 + o_["d"][0] * o_["r"] * 1.1))
    for (x, y) in spots:
        if abs(x - FOCUS[0]) > 9 or abs(y - FOCUS[1]) > 9:
            continue
        k, _ = light_at(x, y)
        sx, sy = to_px((x, y, gh(x, y)))
        for n_ in range(rr.integers(2, 6)):
            ox_, oy_ = sx + rr.integers(-3, 4), sy + rr.integers(-1, 2)
            size = rr.choice([1, 2])
            for j in range(size + 1):
                put(ox_, oy_ - j, CAP[1] * k, x + y)
            for dx in range(-size, size + 1):
                put(ox_ + dx, oy_ - size - 1, CAP[0] * k, x + y)
                put(ox_ + dx, oy_ - size - 2, CAP[3] * k, x + y)
            put(ox_ - 1, oy_ - size - 2, np.minimum(CAP[4] * k, 1), x + y)
    # leaves drifting down out of the canopy, swaying side to side; their shadows close on them as they come down
    from litter_stamps import LEAVES
    rf = np.random.default_rng(91)
    for q in range(22 if FOREST_LIFE else 0):
        lx, ly = FOCUS[0] + rf.uniform(-7, 7), FOCUS[1] + rf.uniform(-7, 7)
        ph = rf.uniform(0, 1)
        u = (T + ph) % 1.0
        z = (1 - u) * 6.0
        sw = np.sin(u * 14 + ph * 7) * 0.35 + u * 0.8 * gust(T)
        g = gh(lx, ly)
        sx_, sy_ = to_px((lx + sw, ly - sw, g))
        if 0 <= int(sy_) < GH and 0 <= int(sx_) < GW:
            img[int(sy_), int(sx_)] *= 0.55 + 0.4 * (z / 6)
        lsx, lsy = to_px((lx + sw, ly - sw, g + z))
        k_, _ = light_at(lx, ly)
        st = LEAVES[(q + int(u * 16)) % len(LEAVES)]                       # tumbling: a different face each step
        rp = tw.LITTER[q % 2]
        for j, row in enumerate(st):
            for i, ch in enumerate(row):
                if ch in ".S":
                    continue
                yy_, xx_ = int(lsy) + j - 2, int(lsx) + i - 3
                if 0 <= yy_ < GH and 0 <= xx_ < GW:
                    img[yy_, xx_] = rp[int(np.clip(4 + {"H": 2, "L": 1, "B": 0, "D": -1, "P": 3, "V": 1}[ch], 0, 7))] * min(k_, 1.4)
    g_now = gust(T)
    rb = np.random.default_rng(57)
    for q in range(26 if FOREST_LIFE else 0):
        bx, by = FOCUS[0] + rb.uniform(-8, 8), FOCUS[1] + rb.uniform(-8, 8)
        run = (T * 3.0 + rb.uniform(0, 1)) % 1.0                         # each leaf's skitter across the floor
        k_lift = np.clip((g_now - 1.3) / 1.0, 0, 1)
        if k_lift <= 0:
            continue
        ex, ey = bx + run * 2.2 * k_lift, by - run * 2.2 * k_lift          # blown toward the screen's right
        hop = abs(np.sin(run * 12)) * 0.25 * k_lift
        g = gh(ex, ey)
        sx_, sy_ = to_px((ex, ey, g + hop))
        st = LEAVES[(q + int(run * 10)) % len(LEAVES)]
        k_, _ = light_at(ex, ey)
        for j, row in enumerate(st):
            for i, ch in enumerate(row):
                if ch in ".S":
                    continue
                yy_, xx_ = int(sy_) + j - 2, int(sx_) + i - 3
                if 0 <= yy_ < GH and 0 <= xx_ < GW and dep[yy_, xx_] <= ex + ey + 0.2:
                    img[yy_, xx_] = tw.LITTER[q % 2][int(np.clip(4 + {"H": 2, "L": 1, "B": 0, "D": -1, "P": 3, "V": 1}[ch], 0, 7))] * min(k_, 1.4)
    # the ground mist: low wisps drifting with the wind through the hollows and the gap, see-through, stepped
    wetv = look(W, W["wet"], px, py)
    low = np.clip(1 - (pz - look(W, W["H"], px, py) * 0) / 0.9, 0, 1) * (pz < 1.2)
    def field(TT):
        return fbm(px * 0.35 - TT * 1.6, py * 0.35 + TT * 1.6) * 0.65 + fbm(px * 0.9 - TT * 2.4, py * 0.9 + TT * 2.4) * 0.35
    mist = drift(field, T)
    dens = np.clip((mist - 0.5) * 3.0 + wetv * 0.4 - 0.15, 0, 1) * low
    a_ = np.where(dens > 0.55, 0.18, np.where(dens > 0.25, 0.096, 0.0)) * (bay_l > 0.2)    # 40% lighter (Derek)
    img = img * (1 - a_[..., None]) + np.array([0.42, 0.46, 0.55]) * (0.35 + L["moon"][..., None] * 0.6 + L["lamp"][..., None] * np.array([1.2, 0.9, 0.5])) * a_[..., None]
    # foxfire: the fungi in the softest dead wood (class 4-5 logs, the stump's crumbled heart) glow a faint cold
    # blue-green in the dark, breathing slowly; only in shade, never where moon or lantern light is on it
    tgx = look(W, W["tag"], px, py)
    soft = np.zeros_like(tgx, bool)
    for k_o, o_ in W["obj"].items():
        if (o_["kind"] == "log" and o_["cls"] >= 4) or o_["kind"] == "stump":
            soft |= tgx == k_o
    dark = (L["moon"] < 0.25) & (L["lamp"] < 0.08)
    spot = soft & dark & (vn(px * 9, py * 9 + pz * 9) > 0.72) & (vn(px * 2.5, py * 2.5) > 0.45)
    breath_f = 0.7 + 0.3 * np.sin(2 * np.pi * T + px[spot] * 0.5)
    img[spot] = np.clip(img[spot] * 0.4 + np.array([0.28, 0.62, 0.52])[None, :] * breath_f[:, None] * 0.6, 0, 1)
    # a wisp-fire: a small cold flame drifting low over the damp ground, there for part of the loop, then gone
    wis = 0.5 * (1 - np.cos(2 * np.pi * np.clip((T - 0.15) / 0.55, 0, 1)))    # fades in and out
    if wis > 0.02 and FOREST_LIFE:
        u = np.clip((T - 0.15) / 0.55, 0, 1)
        wx = FOCUS[0] - 3.6 + u * 2.0 + np.sin(u * 9) * 0.3          # low over the damp hollows, left of the log
        wy = FOCUS[1] + 2.6 + np.sin(u * 5 + 1) * 0.6
        wz = gh(wx, wy) + 0.55 + np.sin(u * 13) * 0.12
        cx_, cy_ = to_px((wx, wy, wz))
        gx_, gy_ = to_px((wx, wy, gh(wx, wy)))
        yy0, xx0 = np.mgrid[0:GH, 0:GW]
        # its cold light on the ground beneath, stepped
        dg = np.hypot((xx0 - gx_) / 26.0, (yy0 - gy_) / 13.0)
        pool_k = np.where(dg < 0.45, 0.22, np.where(dg < 0.8, 0.11, np.where(dg < 1.0, 0.05, 0))) * wis
        pool_k = np.where(dep <= wx + wy + 0.5, pool_k, 0)
        img = img + np.array([0.25, 0.55, 0.6]) * pool_k[..., None]
        # the flame: a teardrop of cold fire, a white heart, a stepped halo, motes trailing behind on the wind
        for dyy in range(-7, 4):
            for dxx in range(-4, 5):
                rr_ = np.hypot(dxx / (2.4 if dyy < 0 else 2.8), dyy / (5.5 if dyy < 0 else 2.6))
                i_, j_ = int(cy_) + dyy, int(cx_) + dxx
                if not (0 <= i_ < GH and 0 <= j_ < GW) or dep[i_, j_] > wx + wy + 0.4:
                    continue
                flick = 0.15 * np.sin(T * 40 + dyy)
                if rr_ < 0.45 + flick * 0.3:
                    img[i_, j_] = img[i_, j_] * (1 - wis) + np.array([0.86, 1.0, 0.95]) * wis
                elif rr_ < 0.85 + flick:
                    img[i_, j_] = img[i_, j_] * (1 - 0.8 * wis) + np.array([0.35, 0.85, 0.78]) * 0.8 * wis
                elif rr_ < 1.5:
                    img[i_, j_] = img[i_, j_] * (1 - 0.25 * wis) + np.array([0.2, 0.5, 0.5]) * 0.25 * wis
        for q in range(6):
            tq = ((T * 3 + q / 6) % 1.0)
            mx, my = cx_ - tq * 14 + np.sin(tq * 8 + q) * 2, cy_ - 3 - tq * 6
            if 0 <= int(my) < GH and 0 <= int(mx) < GW and tq < 0.8:
                img[int(my), int(mx)] = img[int(my), int(mx)] * 0.4 + np.array([0.5, 0.95, 0.85]) * 0.6 * wis * (1 - tq)
    # ---- moonbeams: cinematic shafts slanting down through the canopy gap at the moon's angle, a bright core and a
    # defined edge; hidden by whatever stands in front of them; mist and spores lit as they pass through
    gx_, gy_, gr_ = w.gap
    yy0, xx0 = np.mgrid[0:GH, 0:GW].astype(float)
    beam_k = np.zeros((GH, GW))
    for (bx, by, wdt, strength) in [(gx_ - 2.4, gy_ - 1.2, 0.95, 1.0), (gx_ - 0.2, gy_ + 0.6, 0.5, 0.7)]:
        g0 = np.array([bx, by, gh(bx, by)])
        top = g0 + SUN * 22.0                                            # back up the light toward the moon
        a = np.array(to_px(g0))
        b = np.array(to_px(top))
        ab = b - a
        L2 = (ab ** 2).sum()
        tpar = np.clip(((xx0 - a[0]) * ab[0] + (yy0 - a[1]) * ab[1]) / L2, 0, 1)
        dx, dy = xx0 - (a[0] + ab[0] * tpar), yy0 - (a[1] + ab[1] * tpar)
        perp = np.hypot(dx, dy)
        half = wdt * KX * (1.0 + 0.25 * (1 - tpar))                         # a little wider where it lands
        breathe = 0.85 + 0.15 * np.sin(2 * np.pi * T + bx)
        core = perp < half * 0.45
        body = perp < half
        edge = (perp < half * 1.25) & (bay_l > 0.5)                        # a dithered soft lip, one band wide
        k = np.where(core, 1.0, np.where(body, 0.62, np.where(edge, 0.3, 0.0))) * strength * breathe
        k *= np.clip(tpar * 6, 0, 1) * np.clip((1 - tpar) * 3, 0, 1) + (tpar < 0.03) * 0.0
        beam_depth = (bx + by) - tpar * 22.0 * (SUN[0] + SUN[1])             # how far along the beam each pixel lies
        k = np.where(dep > beam_depth + 0.6, 0.0, k)                        # anything nearer than the beam is not lit by it
        beam_k = np.maximum(beam_k, k)
        # where it lands: a pool of moonlight on the floor, stepped
        pd_ = np.hypot((xx0 - a[0]) / (half * 1.4 + 1e-3), (yy0 - a[1]) / (half * 0.7 + 1e-3))
        pool_b = np.where(pd_ < 0.6, 0.42, np.where(pd_ < 0.9, 0.24, np.where(pd_ < 1.1, 0.1, 0.0))) * strength * breathe   # the beam as it was (Derek)
        img = img + np.array([0.55, 0.62, 0.75]) * pool_b[..., None] * np.clip(1 - np.abs(dep - (bx + by)) / 1.5, 0, 1)[..., None]
    img = img * (1 - beam_k[..., None] * 0.36) + np.array([0.66, 0.74, 0.88]) * beam_k[..., None] * 0.36
    # the mist where it crosses a beam: lit
    lit_mist = (a_ > 0) & (beam_k > 0.2)
    img[lit_mist] = np.minimum(img[lit_mist] + np.array([0.12, 0.14, 0.17]) * beam_k[lit_mist][:, None], 1)
    # spores drifting through the beams, each a point of light while it is inside one
    rs = np.random.default_rng(606)
    for q in range(70):
        u = (T * rs.integers(1, 3) + rs.uniform(0, 1)) % 1.0
        sx0, sy0 = rs.uniform(0, GW), rs.uniform(0, GH)
        mx, my = (sx0 + u * 18 + np.sin(u * 6.28 + q) * 3) % GW, (sy0 - u * 10) % GH
        i_, j_ = int(my), int(mx)
        if beam_k[i_, j_] > 0.3:
            img[i_, j_] = np.minimum(img[i_, j_] * 0.4 + np.array([0.85, 0.9, 1.0]) * 0.7 * beam_k[i_, j_], 1)
    # spores turning slowly in the lantern's light, each catching it a moment and gone
    lamp = (HERO[0] + 0.25, HERO[1] - 0.25)
    for q in range(16):
        ph = rf.uniform(0, 1)
        u = (T * rf.integers(1, 3) + ph) % 1.0
        ax_, ay_ = lamp[0] + rf.uniform(-1.2, 1.2), lamp[1] + rf.uniform(-1.2, 1.2)
        zz = gh(*lamp) + 0.3 + u * 1.8
        sx_, sy_ = to_px((ax_ + np.sin(u * 6.28 + ph * 9) * 0.25, ay_, zz))
        if 0 <= int(sy_) < GH and 0 <= int(sx_) < GW and np.sin(u * 3.14) > 0.25:
            img[int(sy_), int(sx_)] = np.minimum(img[int(sy_), int(sx_)] * 0.3 + np.array([1.0, 0.82, 0.5]) * 0.75, 1)
    for f in LIVING:
        img = f(img, w, W, px, py, pz, L, T)
    return np.clip(img, 0, 1)


def _footprint(W, x, y):
    fa = np.linspace(0, 2 * np.pi, 12, endpoint=False)
    return look(W, W["H"], np.concatenate([[x], x + np.cos(fa) * 0.22]), np.concatenate([[y], y + np.sin(fa) * 0.22]))


def settle_hero(W):
    """a body stands on one whole surface, never astride a ledge: if his footprint straddles an edge (a step, a stone,
    a bank), he takes the nearest level spot within half a yard, wholly on the step or wholly on the ground"""
    global HERO
    best, bd = None, 9.0
    for r in np.arange(0.0, 0.55, 0.05):
        for a in np.linspace(0, 2 * np.pi, max(1, int(r * 40)), endpoint=False):
            x, y = HERO[0] + np.cos(a) * r, HERO[1] + np.sin(a) * r
            h = _footprint(W, x, y)
            if np.ptp(h) < 0.06 and r < bd:
                best, bd = (x, y), r
        if best is not None:
            break
    if best is not None:
        HERO = np.array(best)


def stand_height(W):
    """he stands ON the surface under him, following it as it rises and falls (settle_hero has put him on one whole
    surface)"""
    return float(np.median(_footprint(W, HERO[0], HERO[1])))


def the_ossuarch(big, W, px, py, anim="idle/front_l/0"):
    """the game's own Ossuarch (art/sprites/ossuarch_hd), drawn as the game draws a hero: at screen resolution, the
    sheet scaled by Iso.FIG (0.78), his foot on his tile; hidden wherever something nearer the camera stands"""
    import json
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "art", "sprites")
    meta = json.load(open(os.path.join(root, "ossuarch_hd.json")))
    sheet = Image.open(os.path.join(root, "ossuarch_hd.png")).convert("RGBA")
    _, x, y, w, h, dx, dy = meta["idx"][anim]
    fr = sheet.crop((x, y, x + w, y + h))
    nsheet = Image.open(os.path.join(root, "ossuarch_hd_n.png")).convert("RGBA")
    nfr = nsheet.crop((x, y, x + w, y + h))
    k = 0.78
    fr = fr.resize((max(1, int(w * k)), max(1, int(h * k))), Image.NEAREST)
    nfr = nfr.resize(fr.size, Image.NEAREST)
    ox = GW / 2 - (FOCUS[0] - FOCUS[1]) * KX
    oy = GH / 2 - (FOCUS[0] + FOCUS[1]) * KY
    hz = stand_height(W)
    fx = ((HERO[0] - HERO[1]) * KX + ox) * 4
    fy = ((HERO[0] + HERO[1]) * KY + oy - hz * KZ) * 4
    X0, Y0 = int(fx + dx * k), int(fy + dy * k)
    a = np.array(fr).astype(float) / 255
    # lit as shaders/hero_lit.gdshader lights him: the lantern at his side, the cold sky rim, the night's ambient
    nn = np.array(nfr).astype(float) / 255
    nv = nn[..., :3] * 2 - 1
    nv[..., 1] = -nv[..., 1]
    nv /= np.linalg.norm(nv, axis=2, keepdims=True) + 1e-9
    lamp_dir = np.array([0.55, 0.15, 0.8])
    lamp_dir /= np.linalg.norm(lamp_dir)
    lam = np.clip((nv * lamp_dir).sum(2), 0, 1)
    sky = np.clip((nv * (np.array([-0.6, -0.7, 0.4]) / np.linalg.norm([-0.6, -0.7, 0.4]))).sum(2), 0, 1)
    lit = 0.55 * np.array([0.78, 0.82, 0.95]) + (0.3 + 0.6 * lam)[..., None] * np.array([1.0, 0.82, 0.6]) * 0.75
    a[..., :3] = a[..., :3] * lit + np.array([0.5, 0.6, 0.85]) * (sky ** 4)[..., None] * 0.12
    dep = (px + py)
    hd = HERO[0] + HERO[1]
    front = dep > hd + 0.35
    if "pz" in _LIVE:                                                   # what he stands on never hides him
        under = (np.hypot(px - HERO[0], py - HERO[1]) < 0.3) & (np.abs(_LIVE["pz"] - hz) < 0.06)   # only the surface he is on
        front &= ~under
    if "ldep" in _LIVE:
        front |= _LIVE["ldep"] > hd + 0.05                                  # grass and ferns standing nearer than his feet
    nearer = np.kron(front, np.ones((4, 4))).astype(bool)
    B = np.array(big).astype(float) / 255
    # his weight on the ground: a soft dark pool under his feet, the litter pressed (stepped, as painted)
    yyg, xxg = np.mgrid[0:B.shape[0], 0:B.shape[1]]
    dd = np.hypot((xxg - fx) / 34.0, (yyg - fy) / 10.0)
    pool = np.where(dd < 0.6, 0.55, np.where(dd < 1.0, 0.75, 1.0))
    pool = np.where(nearer, 1.0, pool)
    B[..., :3] *= pool[..., None]
    hh, ww = a.shape[:2]
    for j in range(hh):
        yy = Y0 + j
        if not (0 <= yy < B.shape[0]):
            continue
        for i in range(ww):
            xx = X0 + i
            if not (0 <= xx < B.shape[1]) or a[j, i, 3] < 0.5 or nearer[yy, xx]:
                continue
            B[yy, xx, :3] = a[j, i, :3]
    # his shadow, cast by the lantern he carries low at his side, and the moon's, falling to the lower right
    return Image.fromarray((np.clip(B, 0, 1) * 255).astype(np.uint8))


def hero_at(img, W, px, py):
    ox = GW / 2 - (FOCUS[0] - FOCUS[1]) * KX
    oy = GH / 2 - (FOCUS[0] + FOCUS[1]) * KY
    hz = stand_height(W)
    hx = (HERO[0] - HERO[1]) * KX + ox
    hy = (HERO[0] + HERO[1]) * KY + oy - hz * KZ
    SY, SX = np.mgrid[0:GH, 0:GW].astype(float)
    u, w_ = SX - hx, hy - SY
    body = ((w_ >= 0) & (w_ < 32) & (np.abs(u) < 3.0 + (32 - w_) * 0.12)) | (np.hypot(u - 0.5, w_ - 34.5) < 3.4) | ((w_ > 24) & (w_ < 32) & (np.abs(u) < 6.2 - (w_ - 24) * 0.3))
    in_front = (px + py) <= (HERO[0] + HERO[1]) + 0.3                   # what stands nearer the camera hides him
    body &= in_front
    shadow = (np.hypot((u + 7) / 10.0, (w_ + 1) / 2.2) < 1) & ~body & in_front
    img[shadow] *= 0.55
    img[body] = hexc("#14111a")
    img[body & ~np.roll(body, 1, axis=1)] = hexc("#6a4a3a")
    img[(np.hypot(u - 8, w_ - 15) < 1.6) & in_front] = hexc("#f4c070")
    return img


def animate(out, n=24):
    w = Wood()
    for f in WOOD_HOOKS:
        f(w)
    W = build(w)
    for f in BUILD_HOOKS:
        f(W, w)
    settle_hero(W)
    px, py, pz, SX, SY = cast(W)
    globals()["w"] = w
    frames = []
    for i in range(n):
        t = i / n
        px, py, pz, SX, SY = cast(W, t)                                     # the trees lean with the wind
        L = shade(W, px, py, pz, SX, SY, t)
        img = paint(W, px, py, pz, SX, SY, L, t)
        img = living(img, w, W, px, py, pz, L, t)
        big = Image.fromarray((img * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST)
        frames.append(the_ossuarch(big, W, px, py, "idle/front_l/%d" % (i % 8)))
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=110, loop=0, lossless=True)
    frames[0].save(out.replace(".webp", ".png"))
    print("saved", out)


def main(out):
    w = Wood()
    for f in WOOD_HOOKS:
        f(w)
    W = build(w)
    for f in BUILD_HOOKS:
        f(W, w)
    settle_hero(W)
    px, py, pz, SX, SY = cast(W)
    L = shade(W, px, py, pz, SX, SY)
    globals()["w"] = w
    img = paint(W, px, py, pz, SX, SY, L)
    img = living(img, globals()["w"], W, px, py, pz, L)
    big = Image.fromarray((img * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST)
    big = the_ossuarch(big, W, px, py)
    big.save(out)
    print("saved", out)


if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "wood_scene.png"
    animate(o) if o.endswith(".webp") else main(o)
