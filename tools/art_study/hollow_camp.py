"""Cap Hollow, under the Ribcage Bough: a night scene in the Hollow Wood (Derek 2026-10-07: "a couple of derelict huts
around a bin fire with remains spread around ... a valleyish look in old growth, more god peeking through"). Built on
the judge scene's engine (wood_scene.py) through its hooks; every piece a landkit generator (hut.py, ...).

THE BRIEF, from the lore (docs/wiki/12-lore-notes.md, 12b-codex-interviews.md: the hunter; 11-codex-voices.md):
- Cap Hollow: "a hamlet of four fungus-picking families ... next to the hunter's hollow under the Ribcage Bough". Its
  families are gone. Two huts stand derelict in the valley's floor, roofs caved, doors gone, cap-strings sagging.
- The Ribcage Bough: the god's ribs stand up out of the valley's banks and arch in over the hollow; the valley is the
  god's opened chest. Where the banks have slumped its pale hide shows through the soil, veins under it running toward
  the ring. (More god peeking through.)
- The fire in an iron bin between the huts, burning low with no one left to feed it (as the candle in the tenth trunk
  burns): the scene's warm light, with the pilgrim's lantern; the moon cold above the ribs.
- The remains, spread round: "Fresh, it lies any way it fell. A day on, it lies with its head toward the ring. Three
  days, it's moved a hand toward it. I've marked them with sticks." Every body lies head toward the same far point,
  each with the hunter's marker stick.
- "The pickers put white caps on every flat stone": shrivelled white caps still on the flat stones; cloth strips tied
  to a tenth trunk, the bark growing over them.
True scale: huts 4 x 3 yd (ridge 2.6), the bin to a man's waist, the ribs a yard thick rising 10-14 yd.

  python tools/art_study/hollow_camp.py OUT.png|OUT.webp
"""
import os
import sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "landkit"))
import wood_scene as ws                      # noqa: E402
import hut as hutgen                         # noqa: E402
import bark                                  # noqa: E402
import relic                                 # noqa: E402
import remains                               # noqa: E402
from wood_ecosystem import vn, fbm           # noqa: E402
import wood_pale                             # noqa: E402  the Hollow Wood's trees (the vein-bark, its weeping eyes)

C = np.array([27.0, 13.0])                   # the camp's heart (the bin) in the wood's plan
AX = np.array([1.0, 1.0]) / np.sqrt(2)       # the valley runs toward the viewer (down the screen)
PERP = np.array([1.0, -1.0]) / np.sqrt(2)    # across it (left-right on the screen)
FLOOR_W, BANK_H, BANK_RUN = 7.4, 6.0, 4.0           # the floor holds the hamlet's ring; the banks climb six yards beyond it
ws.FOCUS = C + AX * 0.2
ws.HERO = C + AX * 2.4 - PERP * 0.9

R_BONE = ws.ramp("#1a1715", "#2c2724", "#433d38", "#5c554d", "#78706a", "#958b80", "#b2a798", "#cbc1b0")
R_SLAB = ws.ramp("#17141a", "#26222a", "#38323a", "#4d4648", "#655c5a", "#7e746c", "#978b7e")   # weathered vein-bark slabs
R_SHING = ws.ramp("#141114", "#211c1f", "#30292a", "#433a37", "#584c45")
R_FIELD = ws.ramp("#131218", "#221f27", "#343038", "#48434a", "#5f5958", "#787068")
R_MOSSC = ws.ramp("#0a110f", "#111c15", "#18281a", "#20341e", "#2c4423", "#3b5529")

# four families, four huts in a ring round the fire-yard, every door turned to the fire; the front left open
_HUT_AT = [(C - AX * 4.6 - PERP * 2.7, 11), (C - AX * 4.6 + PERP * 2.7, 23), (C - PERP * 5.1 + AX * 0.9, 37), (C + PERP * 5.1 + AX * 0.9, 41)]
HUTS = [(p_, float(np.arctan2(-(C - p_)[0], (C - p_)[1])), sd) for (p_, sd) in _HUT_AT]   # turn: the door (+y) faces C
HF = [hutgen.hut(s) for (_, _, s) in HUTS]
# the dead round the fire, every one with its head toward the ring in the east (world +x, a little -y: "the ring in the
# east"), each at its own age, each with the hunter's stick at its head
RING_DIR = np.arctan2(-0.35, 1.0)
DEAD = [(C + AX * 1.6 + PERP * 0.6, 0.2, 31), (C - AX * 2.3 + PERP * 0.4, 0.7, 32), (C + AX * 2.8 - PERP * 1.1, 0.45, 33),
        (C + AX * 4.2 + PERP * 0.5, 0.9, 34), (C + AX * 0.3 - PERP * 1.3, 0.05, 35)]   # on the open floor, clear of huts and bin
DL = [remains.layout(s, a) for (_, a, s) in DEAD]


def body_to_world(k, lx, ly):
    """the body's own frame -> world: its head (-x) toward the ring; the freshest a little off true"""
    c = DEAD[k][0]
    turn = RING_DIR + np.pi + (0.15 if k % 2 else -0.12) * (1 - DEAD[k][1])
    return c[0] + lx * np.cos(turn) - ly * np.sin(turn), c[1] + lx * np.sin(turn) + ly * np.cos(turn)


def valley_q(x, y):
    """across the valley (yd from its axis through the camp) and along it"""
    return (x - C[0]) * PERP[0] + (y - C[1]) * PERP[1], (x - C[0]) * AX[0] + (y - C[1]) * AX[1]


def shape_plan(w):
    """the valley: a floor four yards wide, banks rising five yards either side; the Wood stands on the banks and
    back from the camp; the canopy opened a little over the hollow"""
    q, a = valley_q(w.X, w.Y)
    rise = np.clip((np.abs(q) - FLOOR_W) / BANK_RUN, 0, 1)
    w.H = w.H + rise ** 1.6 * BANK_H + (fbm(w.X * 0.4, w.Y * 0.4) - 0.5) * 0.6 * rise
    keep = lambda x, y: abs(valley_q(x, y)[0]) > FLOOR_W + 1.0 or np.hypot(x - C[0], y - C[1]) > 13
    w.trees = [t for t in w.trees if keep(t[0], t[1])]
    w.logs = [lg for lg in w.logs if all(keep(lg[0] + (lg[2] - lg[0]) * f, lg[1] + (lg[3] - lg[1]) * f) for f in np.linspace(0, 1, 20))]
    w.rocks = [r for r in w.rocks if keep(r[1], r[2])]
    # the Wood in frame: giants on the banks' lower slopes and at the valley's far end, towering over the hamlet
    for (al, ac, r_) in [(-3.0, -1, 0.95), (2.5, -1, 0.8), (-6.5, 1, 1.0), (1.2, 1, 0.85), (-11.0, 0, 1.05), (-9.5, -0.45, 0.8), (-10.0, 0.5, 0.9)]:
        p_ = C + AX * al + PERP * (ac * (FLOOR_W + 1.1) if abs(ac) == 1 else ac * FLOOR_W)
        w.trees.append((float(p_[0]), float(p_[1]), "giant", r_, 8.0))
    near = np.clip(1 - np.hypot(w.X - C[0], w.Y - C[1]) / 9.0, 0, 1)
    w.light = w.light * (1 - near) + 0.4 * near
    w.gap = (C[0] - 1.5, C[1] - 2.0, 4.0)
    fl = np.abs(q) < FLOOR_W
    for name in ("fern", "sapl", "shrooms", "grass"):
        a_ = getattr(w, name, None)
        if isinstance(a_, np.ndarray) and a_.dtype == bool:
            setattr(w, name, a_ & ~(fl & (np.hypot(w.X - C[0], w.Y - C[1]) < 7)))


def to_hut(k, x, y):
    c, turn, _ = HUTS[k]
    dx, dy = x - c[0], y - c[1]
    return dx * np.cos(turn) + dy * np.sin(turn), -dx * np.sin(turn) + dy * np.cos(turn)


def stamp(W, w):
    X, Y = W["X"], W["Y"]
    H = W["H"].copy()
    for k, (F, info) in enumerate(HF):
        lx, ly = to_hut(k, X, Y)
        inside = (np.abs(lx) < F.half) & (np.abs(ly) < F.half)
        fh = np.where(inside, F.at(F.H, lx, ly), -9.0)
        c = HUTS[k][0]
        base = float(W["H"][int((c[1] - W["y0"]) / ws.RES), int((c[0] - W["x0"]) / ws.RES)])
        m = fh > -1.0
        H = np.where(m, np.maximum(H, base + fh), H)
        W["tag"] = np.where(m, 800 + k, W["tag"])
        W["obj"][800 + k] = dict(kind="hut", k=k, base=base)
    # the bin: an iron drum to a man's waist, its fire sunk in its mouth
    d = np.hypot(X - C[0], Y - C[1])
    base = float(W["H"][int((C[1] - W["y0"]) / ws.RES), int((C[0] - W["x0"]) / ws.RES)])
    drum = d < 0.42
    H = np.where(drum, np.maximum(H, base + np.where(d < 0.36, 0.78, 0.92)), H)
    W["tag"] = np.where(drum, 850, W["tag"])
    W["obj"][850] = dict(kind="bin", base=base)
    W["H"] = H
    W["Hrest"] = np.where(W["HT"] > -40, W["Hrest"], H)
    camp = (d < 4.5 + (fbm(X * 1.2, Y * 1.2) - 0.5) * 1.5) & (W["tag"] == 0)
    W["mat"] = np.where(camp, 2, W["mat"])                                # trodden earth round the fire
    _WORLD["W"] = W
    ws.LIGHTS.append((C[0], C[1], base + 1.25, 3.4))                      # the fire: the scene's warm heart


_WORLD = {}


def paint_hut(img, m, v, n, px, py, pz, o, W, L):
    k = o["k"]
    F, info = HF[k]
    lx, ly = to_hut(k, px, py)
    M = F.at(F.M, lx, ly, 0)
    U = F.at(F.U, lx, ly, 0.0)
    # a ray that strikes a thin wall's face lands a hair outside the wall's own cells: look a little way in along the
    # surface normal for the material it belongs to (else those pixels stay unpainted, black, in an aliased grid)
    for step in (0.04, 0.08, 0.12):
        miss = m & (M == 0)
        if not miss.any():
            break
        ix, iy = to_hut(k, px - n[..., 0] * step, py - n[..., 1] * step)
        M = np.where(miss, F.at(F.M, ix, iy, 0), M)
        U = np.where(miss, F.at(F.U, ix, iy, 0.0), U)
    h = pz - o["base"]
    side = L["side"]
    sv = np.clip(v * 0.95 + 0.04, 0, 0.8)
    # walls: bark slabs stacked in rows, each slab its own length and grey; the stone footing below
    wall = m & (M == hutgen.WALL)
    row = np.floor(h / 0.28)
    seg = np.floor((U + (row % 3) * 0.37) / 0.7)
    jit = (np.sin(seg * 12.99 + row * 78.2 + k * 3.1) * 43758.5) % 1.0
    fr = h / 0.28 - row
    slab = wall & side & (h >= 0.45)
    # tall slabs of fallen bark stood upright (the pickers take only what the Wood lets fall): each slab its own width
    # and grey, fibres running up it, a dark gap between slabs, its edge toward the moon catching the light
    su = U / 0.42 + np.sin(U * 1.7 + k) * 0.25
    sid = np.floor(su)
    sfr = su - sid
    sj = (np.sin(sid * 12.99 + k * 3.1) * 43758.5) % 1.0
    fib = (vn(U * 12 + sid, h * 1.4) - 0.5) * 0.06
    sl_v = sv + (sj - 0.5) * 0.14 + fib - (sfr < 0.1) * 0.2 + (sfr > 0.88) * 0.06
    img[slab] = R_SLAB[np.clip((sl_v * len(R_SLAB)).astype(int), 0, len(R_SLAB) - 1)][slab]
    foot = wall & side & (h < 0.45)
    st_i = np.floor(U / 0.3 + np.floor(h / 0.15) * 0.5)
    st_v = sv + ((np.sin(st_i * 7.7 + np.floor(h / 0.15) * 3.3) * 4375.5) % 1.0 - 0.5) * 0.14
    fj = (((U / 0.3 + np.floor(h / 0.15) * 0.5) % 1.0) < 0.12) | ((h / 0.15) % 1.0 < 0.18)
    img[foot] = R_FIELD[np.clip(((st_v - fj * 0.2) * len(R_FIELD)).astype(int), 0, len(R_FIELD) - 1)][foot]
    # the broken windows: a dark opening under its frame, a split shutter plank hanging askew across the dark
    for (wk, wu) in info["windows"]:
        win = wall & side & (F.at(F.W, lx, ly, -1) == wk) & (np.abs(U - wu) < 0.3) & (h > 0.75) & (h < 1.3)
        frame = wall & side & (F.at(F.W, lx, ly, -1) == wk) & (np.abs(U - wu) < 0.37) & (h > 0.68) & (h < 1.38) & ~win
        img[frame] = R_SLAB[np.clip(((sv + 0.05) * len(R_SLAB)).astype(int), 0, len(R_SLAB) - 1)][frame]
        dark = np.array([0.03, 0.025, 0.03]) + np.clip(L["lamp"], 0, 0.6)[..., None] * np.array([0.12, 0.06, 0.02])
        img[win] = dark[win]
        plank = win & (np.abs((U - wu) * 1.0 - (h - 1.02) * 0.9 + (k % 2) * 0.1) < 0.06)   # the shutter, split and askew
        img[plank] = R_SLAB[np.clip(((sv - 0.02) * len(R_SLAB)).astype(int), 0, len(R_SLAB) - 1)][plank]
        nail = plank & (np.abs(U - wu + 0.2) < 0.03)
        img[nail] = relic.RUST[3]
    wtop = wall & ~side
    img[wtop] = R_MOSSC[np.clip(((v * 0.85) * len(R_MOSSC)).astype(int), 0, len(R_MOSSC) - 1)][wtop]
    post = m & (M == hutgen.POST)
    img[post] = R_SLAB[np.clip(((sv - 0.06) * len(R_SLAB)).astype(int), 0, len(R_SLAB) - 1)][post]
    # roof: bark shingles in courses down the slope, mossed, weighted with stones
    roof = m & (M == hutgen.ROOF)
    # shingle courses down the slope: each course's lip casting a dark line on the one below, its top catching light
    slope = (info["width"] / 2 + 0.3 - np.abs(ly)) / 0.3
    course = np.floor(slope)
    cf = slope - course
    sh_i = np.floor(lx / 0.36 + (course % 2) * 0.5 + np.sin(course * 2.1) * 0.2)
    sh_j = (np.sin(sh_i * 9.1 + course * 3.7 + k) * 4375.5) % 1.0
    shut = ((lx / 0.36 + (course % 2) * 0.5 + np.sin(course * 2.1) * 0.2) - sh_i) < 0.08
    rv = sv + (sh_j - 0.5) * 0.06 + (cf > 0.78) * 0.07 - (cf < 0.22) * 0.18 - shut * 0.06
    img[roof] = R_SHING[np.clip((rv * len(R_SHING)).astype(int), 0, len(R_SHING) - 1)][roof]
    # moss in clumps on the shaded slope (the side away from the moon), each clump a dark edge and a lit crown
    shade_side = (ly * np.sin(HUTS[k][1] + 0.6)) > 0
    clump = vn(lx * 2.2 + k * 3, ly * 2.2)
    rmoss = roof & (clump > np.where(shade_side, 0.5, 0.72))
    mv = v * 0.8 + (clump - 0.6) * 0.5 + (vn(lx * 15, ly * 15) - 0.5) * 0.08
    img[rmoss] = R_MOSSC[np.clip((mv * len(R_MOSSC)).astype(int), 0, len(R_MOSSC) - 1)][rmoss]
    medge = roof & (clump > np.where(shade_side, 0.46, 0.68)) & ~rmoss
    img[medge] = img[medge] * 0.7
    ridge_ = m & (M == hutgen.RIDGE)
    img[ridge_] = R_SLAB[np.clip(((sv - 0.08 + (vn(lx * 20, 1) - 0.5) * 0.08) * len(R_SLAB)).astype(int), 0, len(R_SLAB) - 1)][ridge_]
    raft = m & (M == hutgen.RAFTER)
    img[raft] = R_SLAB[np.clip(((sv - 0.1) * len(R_SLAB)).astype(int), 0, len(R_SLAB) - 1)][raft]
    # the cave-in: the dark inside
    flr = m & ((M == hutgen.FLOORI) | (M == hutgen.HOLE))
    img[flr] = (np.array([0.035, 0.03, 0.035]) + np.clip(L["lamp"], 0, 0.5)[..., None] * np.array([0.14, 0.07, 0.03]))[flr]
    door = m & (M == hutgen.DOOR)
    pl = np.floor(lx * 6 + ly * 6)                                   # its planks
    dv = sv - 0.02 + ((np.sin(pl * 7.1 + k) * 4375.5) % 1.0 - 0.5) * 0.1 - (((lx * 6 + ly * 6) - pl) < 0.15) * 0.12
    img[door] = R_SLAB[np.clip((dv * len(R_SLAB)).astype(int), 0, len(R_SLAB) - 1)][door]
    sg = m & (M == hutgen.SHINGLE)
    img[sg] = R_SHING[np.clip(((sv - 0.04) * len(R_SHING)).astype(int), 0, len(R_SHING) - 1)][sg]
    sill = m & (M == hutgen.SILL)
    img[sill] = R_FIELD[np.clip((sv * len(R_FIELD)).astype(int), 0, len(R_FIELD) - 1)][sill]
    return img


def paint_bin(img, m, v, n, px, py, pz, o, W, L):
    h = pz - o["base"]
    side = L["side"]
    ang = np.arctan2(py - C[1], px - C[0])
    iv = v * 0.9 + 0.05 + (vn(ang * 4, h * 9) - 0.5) * 0.1 - (np.abs(h - 0.3) < 0.03) * 0.1 - (np.abs(h - 0.62) < 0.03) * 0.1
    img[m] = relic.RUST[np.clip((iv * len(relic.RUST)).astype(int), 0, len(relic.RUST) - 1)][m]
    scab = m & side & (vn(ang * 6 + 2, h * 12) > 0.74)
    img[scab] = relic.SCAB[np.clip((v[scab] * len(relic.SCAB)).astype(int), 0, len(relic.SCAB) - 1)]
    # holes punched round its belly for the draught: the fire showing through
    holes = m & side & (np.abs(h - 0.18) < 0.05) & (np.sin(ang * 9) > 0.7)
    img[holes] = np.array([1.0, 0.55, 0.18])
    # its mouth: the embers, a crust of ash over red
    mouth = m & ~side & (np.hypot(px - C[0], py - C[1]) < 0.36)
    em = vn(px * 30, py * 30)
    img[mouth] = np.where((em[mouth] > 0.55)[:, None], np.array([0.95, 0.42, 0.12]), np.array([0.32, 0.12, 0.06]))
    rim = m & ~side & ~mouth
    img[rim] = relic.RUST[5]
    return img


def rib_list():
    """the Ribcage Bough's ribs, the same every time: [(side, j, base xy, height, reach, broken, r0)]"""
    rr = np.random.default_rng(77)
    out = []
    for side_ in (-1, 1):
        for j in range(5):
            along = -6.0 + j * 3.1 + rr.uniform(-0.4, 0.4)
            base = C + PERP * side_ * (FLOOR_W + 1.2 + rr.uniform(0, 0.5)) + AX * along   # from the banks' brows
            out.append((side_, j, base, rr.uniform(9.5, 13.5), rr.uniform(3.5, 6.0), rr.uniform(0.62, 0.95), rr.uniform(0.55, 0.75)))
    return out


RIBS = rib_list()


def stamp_rib_bases(W, w):
    """where a rib bursts out of the bank the ground heaves up round it: torn earth heaped in a ring, clods thrown"""
    X, Y = W["X"], W["Y"]
    for (side_, j, base, height, reach, broken, r0) in RIBS:
        d = np.hypot(X - base[0], Y - base[1])
        heave = 0.55 * np.exp(-((d - r0 * 0.9) / 0.7) ** 2) * (d > r0 * 0.6) + (vn(X * 5 + j, Y * 5) > 0.7) * (d < r0 * 2.2) * 0.1
        m = (heave > 0.02) & (W["tag"] == 0)
        W["H"] = np.where(m, W["H"] + heave, W["H"])
        W["Hrest"] = np.where(m & (W["HT"] < -40), W["H"], W["Hrest"])
        W["mat"] = np.where(m & (heave > 0.08), 2, W["mat"])          # torn earth


def ribs(img, w, W, px, py, pz, L, T):
    """the Ribcage Bough: the god's ribs standing up out of the banks and arching in over the hollow. Drawn as curved
    bone, depth-tested against the world (a height field cannot hold an arch), lit by the moon and the fire. Bone that
    reads as bone: flattened in section, pores and long cracks with its grain, flaking; at its base stained dark by the
    earth it burst from, roots gripping it, tatters of the god's hide still clinging; its snapped tip showing the
    honeycomb of marrow inside"""
    GH, GW = img.shape[:2]
    dep_scene = px + py
    zb = np.full((GH, GW), -1e9)
    fire = np.array(ws.to_px((C[0], C[1], 1.4)))
    moon_s = np.array([-0.62, -0.55, 0.56])
    moon_s /= np.linalg.norm(moon_s)
    for (side_, j, base, height, reach, broken, r0) in RIBS:
        bz = float(ws.look(W, W["H"], np.array(base[0]), np.array(base[1]))) - 0.5
        steps = 300
        tatter_side = 1 if j % 2 else -1
        for i in range(steps):
            s_ = i / (steps - 1) * broken
            p = np.array([base[0], base[1], bz]) + np.array([0, 0, 1.0]) * height * np.sin(s_ * np.pi / 2) \
                + np.r_[PERP * -side_ * reach * (1 - np.cos(s_ * np.pi / 2)) ** 1.1, 0]
            r = r0 * (1 - s_ * 0.35)
            sx, sy = ws.to_px(p)
            rx, ry = r * 18.0, r * 12.5                                   # a rib is flatter than it is wide
            x0, x1 = int(sx - rx - 1), int(sx + rx + 2)
            y0, y1 = int(sy - ry - 1), int(sy + ry + 2)
            if x1 < 0 or y1 < 0 or x0 >= GW or y0 >= GH:
                continue
            d_rib = p[0] + p[1]
            tip = i >= steps - 4
            low = np.clip(1 - (p[2] - bz) / 1.6, 0, 1)                    # how near the earth it burst from
            for yy in range(max(y0, 0), min(y1, GH)):
                for xx in range(max(x0, 0), min(x1, GW)):
                    u, v_ = (xx + 0.5 - sx) / rx, (yy + 0.5 - sy) / ry
                    q = u * u + v_ * v_
                    if q > 1:
                        continue
                    nz = np.sqrt(1 - q)
                    front = d_rib + nz * r * 1.2
                    if front < dep_scene[yy, xx] - 0.2 or front <= zb[yy, xx]:
                        continue
                    zb[yy, xx] = front
                    nn = np.array([u, v_, nz])
                    lm = max(0.0, float(nn @ moon_s))
                    fd = np.array([fire[0] - xx, fire[1] - yy, 30.0])
                    dist = np.linalg.norm(fd[:2])
                    lf = max(0.0, float(nn @ (fd / np.linalg.norm(fd)))) / (1 + (dist / 120.0) ** 2)
                    grain = (vn(s_ * 60 + j * 7, u * 3) - 0.5) * 0.05
                    crack = (np.abs(np.sin(u * 3.2 + vn(s_ * 6 + j, 1) * 4)) < 0.05) * -0.14    # long cracks with the grain
                    pore = (vn(s_ * 140 + j, u * 18) > 0.84) * -0.07
                    flake = (vn(s_ * 30 + side_ * 3 + j, u * 5) > 0.82) * 0.06
                    val = 0.22 + lm * 0.5 + grain + crack + pore + flake - (1 - nz) * 0.08
                    col = R_BONE[int(np.clip(val * len(R_BONE), 0, len(R_BONE) - 1))]
                    if tip and nz > 0.35:                                 # the break: the honeycomb of marrow
                        cell = vn(u * 9 + j, v_ * 9) > 0.55
                        col = R_BONE[2] * (0.6 if cell else 1.1)
                    if low > 0:                                           # stained by the earth it burst from
                        col = col * (1 - low * 0.55) + np.array([0.12, 0.08, 0.05]) * low * 0.55
                        if abs(np.sin(u * 2.5 + p[2] * 7 + j)) < 0.12 and p[2] - bz < 1.4:   # roots gripping it
                            col = np.array([0.16, 0.11, 0.08]) * (0.6 + lm)
                    if 0.12 < (p[2] - bz) < 2.6 and u * tatter_side > 0.15 and vn(s_ * 40 + j, u * 6) > 0.45:
                        col = R_HIDE[int(np.clip((0.25 + lm * 0.5) * len(R_HIDE), 0, len(R_HIDE) - 1))]   # the hide's tatters
                    elif v_ < -0.2 and vn(s_ * 30 + j, u * 4 + side_) > 0.6 and s_ < 0.7:
                        col = R_MOSSC[int(np.clip((0.3 + lm * 0.5) * len(R_MOSSC), 0, len(R_MOSSC) - 1))]
                    col = col * (1 + lf * np.array([1.2, 0.75, 0.4]))
                    img[yy, xx] = np.clip(col, 0, 1)
    return img


def fire_life(img, w, W, px, py, pz, L, T):
    """the fire in the bin: tongues out of its mouth, sparks rising, a thread of smoke"""
    GH, GW = img.shape[:2]
    base = W["obj"][850]["base"]
    rr = np.random.default_rng(5)
    for k in range(7):
        ph = rr.uniform(0, 1)
        a = rr.uniform(0, 2 * np.pi)
        ox, oy = np.cos(a) * 0.18, np.sin(a) * 0.18
        hgt = 0.35 + 0.25 * (0.5 + 0.5 * np.sin((T + ph) * 6.28 * 3))
        for i in range(10):
            f = i / 9
            x, y, z = C[0] + ox * (1 - f), C[1] + oy * (1 - f), base + 0.85 + f * hgt
            sx, sy = ws.to_px((x + np.sin(T * 6.28 * 4 + ph * 9 + f * 3) * 0.04 * f, y, z))
            ix, iy = int(round(sx)), int(round(sy))
            if 0 <= iy < GH and 0 <= ix < GW:
                col = (1.0, 0.92, 0.6) if f < 0.3 else ((1.0, 0.66, 0.24) if f < 0.65 else (0.85, 0.3, 0.1))
                img[iy, ix] = col
    for k in range(10):
        u = (T * rr.uniform(0.6, 1.4) + rr.uniform(0, 1)) % 1.0
        x, y, z = C[0] + rr.uniform(-0.3, 0.3) + np.sin(u * 7 + k) * 0.15, C[1] + rr.uniform(-0.3, 0.3), base + 1.0 + u * 3.0
        sx, sy = ws.to_px((x, y, z))
        ix, iy = int(round(sx)), int(round(sy))
        if 0 <= iy < GH and 0 <= ix < GW and u < 0.85:
            img[iy, ix] = np.minimum(img[iy, ix] * 0.4 + np.array([1.0, 0.6, 0.2]) * 0.8, 1)
    return img


def keep_world(W, w):
    _WORLD["W"] = W


wood_pale.install()
wood_pale.DYING_IN_FIVE = (0, 1, 2)          # this valley's trees: three in five dying, weeping
wood_pale.DISEASE = (1.0, 0.45)              # cankers, galls, peeling: worst on the dying
ws.WOOD_HOOKS += [shape_plan]
ws.BUILD_HOOKS += [stamp, stamp_rib_bases]
ws.PAINTERS["hut"] = paint_hut
ws.PAINTERS["bin"] = paint_bin


def draw_dead(img, w, W, px, py, pz, L, T):
    """the dead, drawn as a pixel artist draws a skeleton at this size (one-pixel bones, a few for the skull and its
    sockets), every point placed from the body's layout in the world, depth-tested, lit by the fire and the moon"""
    GH, GW = img.shape[:2]
    dep = px + py
    def lightk(ix, iy):
        return min(0.38 + L["moon"][iy, ix] * 0.5 + L["lamp"][iy, ix] * 0.7, 0.95)   # ivory, never glare
    def plot(x, y, z, col, k_extra=1.0, shadow=False):
        sx, sy = ws.to_px((x, y, z))
        ix, iy = int(round(sx)), int(round(sy))
        if 0 <= iy < GH and 0 <= ix < GW and dep[iy, ix] <= x + y + 0.25:
            if shadow and iy + 1 < GH:                                  # each bone seated in the earth: a dark pixel under it
                img[iy + 1, ix] = img[iy + 1, ix] * 0.55
            img[iy, ix] = np.clip(np.array(col) * lightk(ix, iy) * k_extra, 0, 1)
            return ix, iy
        return None
    for k, lay in enumerate(DL):
        c = DEAD[k][0]
        g = float(ws.look(W, W["H"], np.array(c[0]), np.array(c[1])))
        age = lay["age"]
        bone_c = remains.R_BONE[6] * (1 - age * 0.12)                # ivory in the firelight
        # the rag first: a dark irregular fill under the bones
        rag = np.array(lay["rag"])
        for lx in np.arange(rag[:, 0].min(), rag[:, 0].max(), 0.03):
            for ly in np.arange(-0.27, 0.27, 0.03):
                if abs(ly) > 0.2 + vn(lx * 8 + k, 1) * 0.06 or vn(lx * 9 + k * 7, ly * 9) < age * 0.55:
                    continue
                x, y = body_to_world(k, lx, ly)
                plot(x, y, g + 0.03, np.array([0.3, 0.24, 0.22]) * (0.85 + vn(lx * 20, ly * 20) * 0.3))   # a faded cloth
        for (kind, pts, wdt) in lay["parts"]:
            if kind in ("skull", "pelvis", "jaw"):
                (lx, ly, lz), r = pts[0], wdt
                for ax in np.arange(-r, r + 0.001, 0.025):
                    for ay in np.arange(-r * 0.8, r * 0.8 + 0.001, 0.025):
                        if (ax / r) ** 2 + (ay / (r * 0.8)) ** 2 > 1:
                            continue
                        x, y = body_to_world(k, lx + ax, ly + ay)
                        lit = (1.35 if kind == "skull" else 1.1) if (ax + ay) < 0 else 0.85
                        plot(x, y, g + lz, bone_c * lit, shadow=True)
                if kind == "skull":                                    # the sockets, looking toward the ring
                    for sy_ in (-0.035, 0.035):
                        x, y = body_to_world(k, lx - 0.04, ly + sy_)
                        plot(x, y, g + lz + 0.02, (0.0, 0.0, 0.0), 1.0)
                continue
            for a_, b_ in zip(pts[:-1], pts[1:]):
                n_ = max(int(np.hypot(b_[0] - a_[0], b_[1] - a_[1]) / 0.03), 2)
                for t in np.linspace(0, 1, n_):
                    lx, ly = a_[0] + (b_[0] - a_[0]) * t, a_[1] + (b_[1] - a_[1]) * t
                    x, y = body_to_world(k, lx, ly)
                    plot(x, y, g + a_[2] + (b_[2] - a_[2]) * t, bone_c * (0.9 if kind == "rib" else 1.0), shadow=True)
        # the hunter's stick at its head, a strip of rust-red cloth knotted to it
        sx_, sy_, sh = lay["stick"]
        x, y = body_to_world(k, sx_, sy_)
        for z in np.arange(0, sh, 0.045):
            plot(x, y, g + z, remains.R_STICK[2] if z < sh * 0.9 else remains.R_STICK[3])
        for d in (0.0, 0.05):
            plot(x + d, y - d * 0.3, g + sh * 0.78, remains.R_STRIP[2])
    return img


ws.LIVING.append(draw_dead)

# the offerings: "the pickers put white caps on every flat stone" (the Flat Days); flat stones round the camp, each with
# its shrivelled caps still glowing faintly white; and cloth strips tied round a tenth trunk, the bark growing over them
STONES = [(C + AX * 3.4 + PERP * 2.6, 0.42, 41), (C - AX * 2.0 - PERP * 3.2, 0.36, 42), (C + AX * 2.0 - PERP * 3.0, 0.4, 43)]


def stamp_stones(W, w):
    X, Y = W["X"], W["Y"]
    for i, (c, r, sd) in enumerate(STONES):
        d = np.hypot(X - c[0], Y - c[1])
        g = float(W["H"][int((c[1] - W["y0"]) / ws.RES), int((c[0] - W["x0"]) / ws.RES)])
        m = d < r * (1 + (vn(X * 5 + sd, Y * 5) - 0.5) * 0.25)
        top = g + 0.22 - (d / r) ** 4 * 0.12
        W["H"] = np.where(m, np.maximum(W["H"], top), W["H"])
        W["Hrest"] = np.where(m & (W["HT"] < -40), np.maximum(W["Hrest"], top), W["Hrest"])
        W["tag"] = np.where(m, 880 + i, W["tag"])
        W["obj"][880 + i] = dict(kind="flatstone", c=c, base=g, r=r)


def paint_flatstone(img, m, v, n, px, py, pz, o, W, L):
    sv = np.clip(v * 0.95 + 0.06 + (vn(px * 20, py * 20) - 0.5) * 0.06, 0, 0.8)
    img[m] = R_FIELD[np.clip((sv * len(R_FIELD)).astype(int), 0, len(R_FIELD) - 1)][m]
    lich = m & (vn(px * 13 + 5, py * 13) > 0.78)
    img[lich] = img[lich] * 0.6 + np.array([0.4, 0.44, 0.36]) * 0.4
    return img


def draw_offerings(img, w, W, px, py, pz, L, T):
    GH, GW = img.shape[:2]
    dep = px + py
    rr = np.random.default_rng(9)
    for (c, r, sd) in STONES:
        g = float(ws.look(W, W["H"], np.array(c[0]), np.array(c[1]))) + 0.01
        for q in range(int(rr.integers(4, 8))):
            a, rad = rr.uniform(0, 2 * np.pi), rr.uniform(0, r * 0.6)
            x, y = c[0] + np.cos(a) * rad, c[1] + np.sin(a) * rad
            for dz, col in ((0.0, (0.55, 0.53, 0.46)), (0.04, (0.86, 0.85, 0.78))):     # a shrivelled white cap: stem, crown
                sx, sy = ws.to_px((x, y, g + dz))
                ix, iy = int(round(sx)), int(round(sy))
                if 0 <= iy < GH and 0 <= ix < GW and dep[iy, ix] <= x + y + 0.3:
                    img[iy, ix] = col
            sx, sy = ws.to_px((x, y, g + 0.05))                          # its faint glow, a banked coal of white
            for dx_, dy_ in ((-1, 0), (1, 0), (0, -1)):
                ix, iy = int(round(sx)) + dx_, int(round(sy)) + dy_
                if 0 <= iy < GH and 0 <= ix < GW and (ix + iy) % 2 == 0:
                    img[iy, ix] = np.minimum(img[iy, ix] + np.array([0.05, 0.06, 0.06]), 1)
    return img


ws.BUILD_HOOKS.append(stamp_stones)

# the god under the valley: where the banks have slumped its hide shows through the soil (more god peeking through)
R_HIDE = ws.ramp("#1c1418", "#2e2226", "#463538", "#5f4a4a", "#7a615c", "#94796f", "#ab9084")
R_VEINH = ws.ramp("#120a12", "#1f1220", "#2e1a2c", "#3f2436")
SLUMPS = []
_rs = np.random.default_rng(13)
for side_ in (-1, 1):
    for j in range(3):
        along_ = -5.0 + j * 4.2 + _rs.uniform(-0.8, 0.8)
        across_ = side_ * (FLOOR_W + _rs.uniform(0.3, 1.2))            # low on the bank, where the eye meets it
        SLUMPS.append((C + AX * along_ + PERP * across_, _rs.uniform(1.6, 2.4), _rs.uniform(0.9, 1.4), side_, j))


def stamp_hide(W, w):
    X, Y = W["X"], W["Y"]
    for i, (c, ra, rb, side_, j) in enumerate(SLUMPS):
        a = (X - c[0]) * AX[0] + (Y - c[1]) * AX[1]
        q = (X - c[0]) * PERP[0] + (Y - c[1]) * PERP[1]
        e = (a / ra) ** 2 + (q / rb) ** 2 + (vn(X * 3 + i, Y * 3) - 0.5) * 0.5
        m = (e < 1) & (W["tag"] == 0)
        W["H"] = np.where(m, W["H"] - 0.05 * (1 - e), W["H"])        # the soil slid away: the hide a little sunk
        W["Hrest"] = np.where(m & (W["HT"] < -40), W["H"], W["Hrest"])
        W["tag"] = np.where(m, 890 + i, W["tag"])
        W["obj"][890 + i] = dict(kind="hide", c=c, ra=ra, rb=rb, side=side_, i=i)


def paint_hide(img, m, v, n, px, py, pz, o, W, L):
    c, ra, rb, i = o["c"], o["ra"], o["rb"], o["i"]
    a = (px - c[0]) * AX[0] + (py - c[1]) * AX[1]
    q = (px - c[0]) * PERP[0] + (py - c[1]) * PERP[1]
    e = (a / ra) ** 2 + (q / rb) ** 2 + (vn(px * 3 + i, py * 3) - 0.5) * 0.5
    hv = np.clip(v * 0.85 + 0.12 + (vn(px * 6, py * 6) - 0.5) * 0.08, 0, 0.95)
    img[m] = R_HIDE[np.clip((hv * len(R_HIDE)).astype(int), 0, len(R_HIDE) - 1)][m]
    pores = m & (vn(px * 55 + i, py * 55) > 0.82)                    # the pores, close and dark
    img[pores] = img[pores] * 0.7
    crease = m & (np.abs(np.sin(a * 5.0 + vn(px, py) * 3 + q * 1.5)) < 0.07)   # deep creases across the hide
    img[crease] = img[crease] * 0.55
    # its veins: dark, branching, running downhill toward the ring (the whole Wood's roots lie so)
    vv = np.abs(np.sin((px * np.sin(RING_DIR) - py * np.cos(RING_DIR)) * 3.1 + vn(px * 1.3, py * 1.3) * 4))
    vein = m & (vv < 0.06) & (e < 0.85)
    img[vein] = R_VEINH[np.clip((v[vein] * len(R_VEINH)).astype(int), 0, len(R_VEINH) - 1)]
    # where it has split: a weep of blood-sap
    split = m & (e < 0.4) & (np.abs(np.sin(a * 2.3 + i)) < 0.04)
    img[split] = np.array([0.22, 0.03, 0.04])
    # the torn lip of soil hanging over the slump's upper edge, dark and crumbling
    lip = m & (e > 0.8) & (q * o["side"] > 0)
    img[lip] = img[lip] * 0.2 + np.array([0.12, 0.08, 0.06]) * 0.8
    return img


ws.BUILD_HOOKS.append(stamp_hide)
ws.PAINTERS["hide"] = paint_hide
ws.PAINTERS["flatstone"] = paint_flatstone
ws.LIVING.append(draw_offerings)
ws.LIVING += [ribs, fire_life]
ws.GROUND_LIFE_OK = lambda x, y: bool(np.hypot(x - C[0], y - C[1]) > 4.5)

if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "hollow_camp.png"
    ws.animate(o) if o.endswith(".webp") else ws.main(o)
