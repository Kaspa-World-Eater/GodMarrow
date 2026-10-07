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
R_SKY = ramp("#0a0d16", "#111725", "#1a2234", "#263046")
MOON_C = np.array([0.6, 0.68, 0.88])
LAMP_C = np.array([1.0, 0.7, 0.38])
SUN = np.array([-0.62, 0.22, 0.75])           # the moon: from the screen's upper left (world -x, a little +y: rule 11)
SUN = SUN / np.linalg.norm(SUN)
DEPTH_V = np.array([1.0, 1.0, 2 * KY / KZ])
DEPTH_V = DEPTH_V / np.linalg.norm(DEPTH_V)


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
    for li, (ax, ay, bx, by, r, cls, plate) in enumerate(w.logs):
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
            obj[300] = dict(kind="plate", a=np.array([ax, ay]), u=np.array([ux, uy]))
    # trunks, snags, stumps: columns with flared feet and buttress ridges
    for ti, (tx, ty, kind, r, cr) in enumerate(w.trees):
        if abs(tx - FOCUS[0]) > 13 or abs(ty - FOCUS[1]) > 13:
            continue
        d = np.hypot(X - tx, Y - ty)
        ang = np.arctan2(Y - ty, X - tx)
        nb = 5 if kind in ("giant", "middle") else 0
        butt = (np.cos(ang * nb + ti) * 0.5 + 0.5) ** 3 if nb else 0
        flare = r * (1 + 0.6 * np.exp(-0 / 1.0)) + butt * r * 0.6
        hgt = {"giant": 16.0, "middle": 14.0, "young": 12.0, "snag": 7.0, "stump": 0.8}[kind]
        foot = d < flare
        # the flare: wide at the ground, reaching the trunk's own radius a yard up
        z_at = np.where(d <= r, hgt, np.clip((flare - d) / np.maximum(flare - r, 1e-3), 0, 1) * 1.0)
        if kind == "stump":
            z_at = np.where(d <= r, 0.8 + (fbm(X * 4, Y * 4) - 0.5) * 0.15 - np.clip(1 - d / (r * 0.6), 0, 1) * 0.25, z_at)
        if kind == "snag":
            z_at = np.where(d <= r, hgt - (fbm(ang * 2, 3) - 0.3) * 2.5, z_at)       # the broken top, jagged
        top = H + z_at
        m = foot & (top > H)
        H = np.where(m, top, H)
        tag[m] = 100 + ti
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
    return dict(X=X, Y=Y, H=H, mat=mat, tag=tag, obj=obj, water=water, light=light, wet=wet, x0=x0, y0=y0, n=n, litt=litt)


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


def cast(W):
    """every screen pixel down into the world: the point it meets"""
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
        hit = ~got & (look(W, W["H"], x, y, -50.0) >= z)
        px[hit], py[hit], pz[hit] = x[hit], y[hit], z
        got |= hit
    return px, py, pz, SX, SY


def shade(W, px, py, pz, SX, SY, t=0.0):
    H, tag = W["H"], W["tag"]
    Hs = nd.gaussian_filter(H, 1.0)
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
    flk = (vn(px * 1.3 + np.sin(t * 6.28) * 0.4, py * 1.3 + np.cos(t * 6.28) * 0.3) > 0.7)
    moonlit = np.clip(0.42 + canopy * 0.75, 0, 1) + flk * 0.4 * (canopy < 0.6)        # forms must still read under the leaves
    ndl = np.clip((n * SUN).sum(2), 0, 1)
    sx0, sy0, sz0 = px + n[..., 0] * 0.12, py + n[..., 1] * 0.12, pz + n[..., 2] * 0.12
    sh = np.zeros_like(px, bool)
    for k in range(1, 70):
        s = k * 0.08
        sh |= look(W, H, sx0 + SUN[0] * s, sy0 + SUN[1] * s, -50.0) > sz0 + SUN[2] * s + 0.03
    moon = ndl * np.where(sh, 0.12, 1.0) * np.clip(moonlit, 0, 1)
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
    breath = 1 + 0.05 * np.sin(t * 6.28 * 2) + 0.03 * np.sin(t * 6.28 * 5)
    lampk = np.clip((n * lu).sum(2), 0, 1) ** 0.7 / (1 + (ld / (2.6 * breath)) ** 2) * np.where(lsh, 0.1, 1.0)
    ao = np.clip((nd.gaussian_filter(H, 8) - H) * 2.5, 0, 1)
    ao_px = look(W, ao, px, py) * (~side)
    return dict(n=n, side=side, tg=tg, moon=moon, lamp=lampk, ao=ao_px, ndl=ndl, sh=sh, canopy=canopy)


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
    mains = [tw.main_0(seed=k * 101)[0] for k in range(4)]
    dirt, _ = tw.dirt_0()
    floor = tw.compose(mains, dirt, GW=GW, GH=GH)
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
    img[mossm] = R_MOSS[np.clip(((v + cush) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)][mossm]
    lowr = mossm & ~np.roll(mossm, -1, axis=0) & ~np.roll(mossm, -1, axis=1)
    img[lowr] *= 0.8
    upl = mossm & ~np.roll(mossm, 1, axis=0) & ~np.roll(mossm, 1, axis=1)
    img[upl] = np.minimum(img[upl] * 1.2, 1)
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
            ang = np.arctan2(py - o["c"][1], px - o["c"][0])
            furrow = (np.sin(ang * (16 if o["kind"] == "giant" else 9) + vn(pz * 0.7, ang * 2) * 2.0) > 0.5)    # deep fissures up the bark
            ridge = (np.sin(ang * (16 if o["kind"] == "giant" else 9) + vn(pz * 0.7, ang * 2) * 2.0) < -0.6)
            bv = v - furrow * 0.2 + ridge * 0.08 + (vn(ang * 6, pz * 4) - 0.5) * 0.06
            img[m] = R_BARK[np.clip((bv * len(R_BARK)).astype(int), 0, len(R_BARK) - 1)][m]
            low = m & (pz < 0.6 + (vn(ang * 3, pz) - 0.5) * 0.5) & (vn(ang * 5, pz * 3) > 0.4)   # moss on the foot
            img[low] = R_MOSS[np.clip((v[low] * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)]
        elif o["kind"] == "snag":
            ang = np.arctan2(py - o["c"][1], px - o["c"][0])
            crack = np.sin(ang * 11 + vn(pz * 0.5, ang) * 3) > 0.75                 # long cracks up the grey wood
            holes = (vn(ang * 4, pz * 2.5) > 0.86)
            dv = v + 0.04 - crack * 0.2
            img[m] = R_DEAD[np.clip((dv * len(R_DEAD)).astype(int), 0, len(R_DEAD) - 1)][m]
            img[m & holes] = hexc("#0a0809")
        elif o["kind"] == "stump":
            topm = m & ~side
            sidem = m & side
            ring = np.sin(np.hypot(px - o["c"][0], py - o["c"][1]) * 40) > 0.4
            img[topm] = R_WOOD[np.clip(((v - ring * 0.08) * len(R_WOOD)).astype(int), 0, len(R_WOOD) - 1)][topm]
            heart = topm & (np.hypot(px - o["c"][0], py - o["c"][1]) < o["r"] * 0.55)
            img[heart] = R_SOIL[1]                                                  # the soft heart gone to crumb
            img[sidem] = R_BARK[np.clip((v[sidem] * len(R_BARK)).astype(int), 0, len(R_BARK) - 1)]
        elif o["kind"] == "log":
            cls = o["cls"]
            rel_a = (px - o["a"][0]) * o["d"][0] + (py - o["a"][1]) * o["d"][1]
            if cls <= 2:
                lat = (px - o["a"][0]) * -o["d"][1] + (py - o["a"][1]) * o["d"][0]
                around = np.arcsin(np.clip(lat / o["r"], -1, 1))
                fiss = np.sin(around * 14 + vn(rel_a * 1.5, around * 2) * 3.0) > 0.6     # fissures along the grain
                loose = (vn(rel_a * 2.2 + 4, around * 3) > 0.84)                      # small plates of bark lifted away
                bv = v * 0.8 - fiss * 0.16
                img[m] = R_BARK[np.clip((bv * len(R_BARK)).astype(int), 0, len(R_BARK) - 1)][m]
                bare_w = m & loose
                img[bare_w] = R_WOOD[np.clip(((v[bare_w] - 0.05) * len(R_WOOD)).astype(int), 0, len(R_WOOD) - 1)]
            elif cls == 3:
                img[m] = R_DEAD[np.clip((v * len(R_DEAD)).astype(int), 0, len(R_DEAD) - 1)][m]
                mm = m & (n[..., 2] > 0.6) & (vn(px * 3, py * 3) > 0.45)
                img[mm] = R_MOSS[np.clip((v[mm] * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)]
            else:
                img[m] = R_MOSS[np.clip(((v + (vn(px * 5, py * 5) - 0.5) * 0.12) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)][m]
        elif o["kind"] == "plate":
            # torn earth on its face, roots snapped off and hanging, a thin crust of moss on its top edge
            img[m] = R_SOIL[np.clip((v * len(R_SOIL)).astype(int), 0, len(R_SOIL) - 1)][m]
            rootl = m & (vn(px * 7 + pz * 3, pz * 9) > 0.66)
            img[rootl] = R_ROOT[np.clip(((v[rootl] + 0.1) * len(R_ROOT)).astype(int), 0, len(R_ROOT) - 1)]
            stones = m & (vn(px * 11, pz * 11) > 0.85)
            img[stones] = tw.PEBBLE[np.clip(((v[stones] + 0.1) * len(tw.PEBBLE)).astype(int), 0, len(tw.PEBBLE) - 1)]
    # ---- the light's temperature, stepped
    warm = L["lamp"] > 0.15
    img[warm & (tg != 0)] = img[warm & (tg != 0)] * np.array([1.15, 1.0, 0.78])
    cool = (L["lamp"] <= 0.15) & (tg != 0)
    img[cool] = img[cool] * np.array([0.95, 0.97, 1.05])
    # ---- rims: an object's edge against what is behind it, where the moon reaches it
    dep = px + py
    left_far = (np.roll(tg, 1, axis=1) != tg) & (np.roll(dep, 1, axis=1) < dep - 0.4)
    rim = (tg != 0) & (left_far | np.roll(left_far, -1, axis=1) & (tg == np.roll(tg, -1, axis=1)))
    img[rim] = np.minimum(img[rim] * 1.5 + np.array([0.03, 0.035, 0.05]), 1)
    return np.clip(img, 0, 1)


def to_px(p3):
    ox = GW / 2 - (FOCUS[0] - FOCUS[1]) * KX
    oy = GH / 2 - (FOCUS[0] + FOCUS[1]) * KY
    return (p3[0] - p3[1]) * KX + ox, (p3[0] + p3[1]) * KY + oy - p3[2] * KZ


def living(img, w, W, px, py, pz, L):
    """drawn piece by piece; each lit by the light where it stands, hidden by what is nearer the camera"""
    from forest_floor import FROND, CAP
    from scatter_wood import grass_clump, paste
    rr = np.random.default_rng(21)
    dep = px + py
    gh = lambda x, y: float(look(W, W["H"], np.array(x), np.array(y)))

    def light_at(x, y):
        sx, sy = to_px((x, y, gh(x, y)))
        i, j = int(np.clip(sy, 0, GH - 1)), int(np.clip(sx, 0, GW - 1))
        return 0.3 + L["moon"][i, j] * 0.9 + L["lamp"][i, j] * 1.6, (i, j)

    def put(sx, sy, col, depth):
        i, j = int(sy), int(sx)
        if 0 <= i < GH and 0 <= j < GW and dep[i, j] <= depth + 0.15:
            img[i, j] = col
    # first the fresh fall (everything that grows comes up through it): leaves placed by the ecology, thick where the litter lies deep and in the drifts, few where
    # it is thin; each a drawn stamp, lit by the light where it lies
    from litter_stamps import LEAVES
    litt_px = look(W, W["litt"], px, py)
    tgm0 = look(W, W["tag"], px, py)
    for _ in range(int(GW * GH / 9)):
        sx, sy = rr.integers(2, GW - 8), rr.integers(2, GH - 6)
        if tgm0[sy, sx] != 0:
            continue
        dl = litt_px[sy, sx]
        if rr.random() > np.clip((dl - 0.7) * 1.6, 0.03, 0.85):
            continue
        st = LEAVES[rr.integers(0, len(LEAVES) - 1)]
        fam = 0 if rr.random() < 0.55 else 1
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
    # ferns: in the damp, in clumps of fronds arching out
    fernpts = np.argwhere(w.fern[::6, ::6]) * 0.6 + 0.05
    for (yy, xx) in fernpts[rr.permutation(len(fernpts))[:60]]:
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
                x, y = xx + dg[0] * ln * t, yy + dg[1] * ln * t
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
    tgm = look(W, W["tag"], px, py) != 0                                # never drawn over a trunk, a log, the plate
    # grass and saplings in the gap: crowding its brightest heart, thinning to its edge, in tufts
    gx, gy, gr = w.gap
    clumps = [grass_clump(s) for s in range(6)]
    centres = [(gx + rr.normal(0, gr * 0.3), gy + rr.normal(0, gr * 0.3)) for _ in range(9)]
    pts = []
    for (cx, cy) in centres:
        for _ in range(rr.integers(3, 9)):
            pts.append((cx + rr.normal(0, 0.6), cy + rr.normal(0, 0.45)))
    pts.sort(key=lambda q: q[0] + q[1])
    for (x, y) in pts:
        if look(W, W["tag"], np.array(x), np.array(y)) != 0 or abs(x - FOCUS[0]) > 9 or abs(y - FOCUS[1]) > 9:
            continue
        k, (i, j) = light_at(x, y)
        sx, sy = to_px((x, y, gh(x, y)))
        paste_d(clumps[rr.integers(0, 6)][1], sx, sy, min(k, 1.3), x + y)
    for (x, y) in w.sapl:
        if abs(x - FOCUS[0]) > 9 or abs(y - FOCUS[1]) > 9 or look(W, W["tag"], np.array(x), np.array(y)) != 0:
            continue
        k, _ = light_at(x, y)
        hgt = rr.uniform(0.8, 1.8)
        z0 = gh(x, y)
        b = to_px((x, y, z0))
        tp = to_px((x + 0.05, y, z0 + hgt))
        for q in np.linspace(0, 1, 30):
            put(b[0] + (tp[0] - b[0]) * q, b[1] + (tp[1] - b[1]) * q, R_BARK[3] * k, x + y)
        for lf in range(10):                                            # a sapling's few leaves, in pairs up the stem
            q = rr.uniform(0.35, 1.0)
            cx, cy = b[0] + (tp[0] - b[0]) * q, b[1] + (tp[1] - b[1]) * q
            sd = rr.choice([-1, 1])
            for d in range(3):
                put(cx + sd * (d + 1), cy - d * 0.5, np.array([0.3, 0.42, 0.18]) * k * (1.2 if sd < 0 else 0.85), x + y)
    # mushrooms on the stump's foot and on the old logs
    for (x, y) in w.shrooms:
        if abs(x - FOCUS[0]) > 9 or abs(y - FOCUS[1]) > 9:
            continue
        k, _ = light_at(x, y)
        sx, sy = to_px((x, y, gh(x, y)))
        for n_ in range(rr.integers(1, 4)):
            ox_, oy_ = sx + rr.integers(-3, 4), sy + rr.integers(-1, 2)
            size = rr.choice([1, 2])
            for j in range(size + 1):
                put(ox_, oy_ - j, CAP[1] * k, x + y)
            for dx in range(-size, size + 1):
                put(ox_ + dx, oy_ - size - 1, CAP[0] * k, x + y)
                put(ox_ + dx, oy_ - size - 2, CAP[3] * k, x + y)
            put(ox_ - 1, oy_ - size - 2, np.minimum(CAP[4] * k, 1), x + y)
    return np.clip(img, 0, 1)


def hero_at(img, W, px, py):
    ox = GW / 2 - (FOCUS[0] - FOCUS[1]) * KX
    oy = GH / 2 - (FOCUS[0] + FOCUS[1]) * KY
    hz = float(look(W, W["H"], np.array(HERO[0]), np.array(HERO[1])))
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


def main(out):
    w = Wood()
    W = build(w)
    px, py, pz, SX, SY = cast(W)
    L = shade(W, px, py, pz, SX, SY)
    globals()["w"] = w
    img = paint(W, px, py, pz, SX, SY, L)
    img = living(img, globals()["w"], W, px, py, pz, L)
    img = hero_at(img, W, px, py)
    Image.fromarray((img * 255).astype(np.uint8)).resize((GW * 4, GH * 4), Image.NEAREST).save(out)
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "wood_scene.png")
