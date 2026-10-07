"""The Gate in the Flesh, on the Ashen Moor, where the god breaks the skin (Derek 2026-10-07: "a few large fangs busting
through in a line, with rot and fungus spreading across the ground like putrid flesh, a pulsating vein digs underground.
A couple of large mushrooms as trees and a pool of pus and blood"; "a cystic dark pore with ruin around it"; "the eye
should be 3 dimensional and slowly blink a pus filled blink then drips into the pool. Make the ground have living
movement, slow and pustulating"; "put a huge gate in the back, we will have a mini boss that emerges from it later; lots
of dimensionality to this place"). Built on the scene engine (wood_scene.py); every piece reusable (landkit tooth.py,
fungus.py; tiles_moor.py's ash and putrid flesh).

THE BRIEF. The Moor is the god's cheek (the lore); here it breaks open:
- at the back, a great swell of flesh, and set into it a GATE: two pylons of the god's vertebrae stacked one on another,
  an arch of bone across them, iron doors fallen ajar, the doorway black: something will come out of it;
- a line of great fangs bursting up through the ash, receding toward the gate, the ground heaved and torn round each;
- the putrid flesh spreading out over the ash like a disease of the skin, breathing slowly, pustules swelling,
  shining and bursting; pale fungal threads creeping ahead of it into the grey;
- a vein as thick as a man's leg arching up out of the ground and diving under, pulses running along it to the gate;
- two giant fungi standing like trees;
- a cystic pore, dark and deep, its rim taut and shining, a ruined stone ring round it pushed over by the swelling;
- the eye: a great eyeball bulging from a socket of flesh; it blinks slowly, its lids crusted with pus, and the pus
  drips from its lower lid into the pool below, pus and blood marbled, glossy, bubbling.
Depth: foreground (the cyst and its ruin, a fungus), middle (the eye and pool, the fangs), back (the gate in its swell).

  python tools/art_study/flesh_scene.py OUT.png [T] | OUT.webp
"""
import os
import sys
import numpy as np
from scipy import ndimage as nd
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "landkit"))
import wood_scene as ws                      # noqa: E402
import tiles_moor                            # noqa: E402
import tooth as toothgen                     # noqa: E402
import fungus                                # noqa: E402
import ground as groundgen                   # noqa: E402
import eye as eyegen                         # noqa: E402
import fang as fanggen                       # noqa: E402
import vessel                                # noqa: E402
import bone as bonegen                       # noqa: E402
import column as colgen                      # noqa: E402
import gate as gategen                       # noqa: E402
import deadplants                            # noqa: E402
import kit                                   # noqa: E402

# THE CAVERN. The courtyard lies in a cavern under the Moor (the lore: "the god held a room open inside itself, wide as
# the Moor ... and in the room knelt our grandmothers' grandmothers"). The roof is far overhead and out of sight; one
# ragged hole in it lets the moon down as a single shaft, the key light, falling between the pilgrim and the eye. All
# else is lit by what burns or festers down here: the lantern, the gate's ember glow, the pustules' sickly yellow.
ZC = 13.0                                    # the roof's height over the floor
ws.SUN = np.array([-0.36, 0.13, 0.92])
ws.SUN = ws.SUN / np.linalg.norm(ws.SUN)     # a high moon over the hole, still from the upper left (rule 11)
_SXY = ws.SUN[:2] / ws.SUN[2]
SHAFT_AT = None                              # set below once C is known: where the shaft's centre falls on the floor
from wood_ecosystem import vn, fbm           # noqa: E402

C = np.array([20.0, 19.0])
AX = np.array([1.0, 1.0]) / np.sqrt(2)       # toward the viewer (down the screen)
PERP = np.array([1.0, -1.0]) / np.sqrt(2)    # across (screen right)
ws.FOCUS = C + AX * 2.6
SHAFT_AT = C + AX * 8.4 + PERP * 2.2
HOLE = SHAFT_AT + _SXY * (ZC - 0.6)          # the hole in the roof, up the moon's direction from the floor
HOLE_R = 3.3


def shaft(x, y, z):
    """0..1: how much of the moon reaches a point, through the ragged hole far overhead"""
    qx = x + _SXY[0] * (ZC - z) - HOLE[0]
    qy = y + _SXY[1] * (ZC - z) - HOLE[1]
    a = np.arctan2(qy, qx)
    r = HOLE_R * (1 + (vn(np.cos(a) * 2 + 3, np.sin(a) * 2) - 0.5) * 0.5)
    d = np.hypot(qx, qy)
    return np.clip((r - d) / 0.6, 0, 1) * (z < ZC)


ws.MOONLIT = lambda px, py, pz, t: shaft(px, py, pz)
kit.SKY = lambda P: shaft(P[..., 0], P[..., 1], P[..., 2])
ws.HERO = C + AX * 8.2 - PERP * 0.8

GATE = C + AX * 0.9                          # the doorway's centre at the swell's foot
GATE_W, PYLON_R, PYLON_H = 5.0, 1.0, 4.6
POST_U, POST_HU, POST_HR, POST_H = 3.4, 0.9, 0.8, 8.5     # the megalith posts
# the teeth: one row across the back, the gate built into it; its posts are the two greatest fangs
FANGS = [(GATE + AX * 0.15 + PERP * o, h, r, 60 + i) for i, (o, h, r) in enumerate(
    [(-9.8, 4.6, 1.0), (-7.5, 5.8, 1.2), (-5.6, 7.2, 1.35), (5.6, 7.0, 1.35), (7.5, 6.0, 1.2), (9.8, 4.4, 1.0)])]
TF = [toothgen.tooth("fang", s, height=h, R=r, half=2.6) for (_, h, r, s) in FANGS]   # (their gum collars)
FG = []                                      # the fangs themselves (landkit fang.py), made in stamp()
PORE = (C + AX * 9.6 + PERP * 4.6, 1.7)
RUIN = []                                    # the cyst and its ruin: saved for later (Derek)
EYE = (C + AX * 8.6 + PERP * 3.4, 1.7)               # where the cyst was, looking up at the sky
POOL = (C + AX * 11.4 + PERP * 0.9, 1.6, 1.0)
SHROOMS = []                                 # the shaggy manes: kept in fungus.py, to refine as an asset later (Derek)
# the forgotten courtyard: a colonnade of fluted pillars marching to the gate, two rows; broken at every height, the ones
# by the eye snapped low where it broke through the floor; drums fallen across the flags
COLS = []
for _side, _hs in ((-1, (4.6, 2.2, 5.4, 1.4)), (1, (5.0, 3.6, 0.9, 0.6))):
    for _j, _a in enumerate((2.0, 4.7, 7.4, 10.1)):
        COLS.append((C + AX * _a + PERP * _side * 5.8, _hs[_j], 40 + _j + (_side > 0) * 10))
_FALL = (AX * 0.9 + PERP * 0.35) / np.linalg.norm(AX * 0.9 + PERP * 0.35)       # the quake threw it this way
_FALL_A = float(np.arctan2(_FALL[1], _FALL[0]))
_STUMP = C + AX * 7.4 + PERP * 5.8
DRUMS = [(_STUMP + _FALL * (1.25 + k * 0.82) + PERP * (0.08 * (-1) ** k), _FALL_A + (0.22, -0.15, 0.3)[k], 0.72) for k in range(3)] \
    + [(C + AX * 6.2 - PERP * 7.4, 2.6, 1.0)]
CAPITAL = _STUMP + _FALL * 4.3                                              # landed furthest, upside down
# the collapsed wall on the left (chapter 2, Rievaulx and every fallen wall): a ragged stump of dressed courses, its
# small core rubble heaped in a ridge at its foot, its big dressed blocks thrown further out, all half buried in ash
WALL_P = -8.7
YARD = (7.4, 1.0, 14.5)                       # half-width across, and its extent along the axis
VEIN = [EYE[0] + AX * 1.5 - PERP * 1.6, POOL[0] - AX * 1.6, C + AX * 3.6 - PERP * 1.2, C + AX * 3.0 - PERP * 2.4]
R_STONE = ws.ramp("#131218", "#211f28", "#312e37", "#443f46", "#5a5455", "#726a66", "#8d8379")
R_BONE = ws.ramp("#1a1715", "#2c2724", "#433d38", "#5c554d", "#78706a", "#958b80", "#b2a798", "#cbc1b0")
R_IRON = ws.ramp("#0b0a0c", "#151316", "#211d20", "#2e2829", "#3d3433")


def vein_path(n=420):
    pts = np.array(VEIN)
    out = []
    for i in range(len(pts) - 1):
        for t in np.linspace(0, 1, n // (len(pts) - 1), endpoint=False):
            p0, p1 = pts[i], pts[i + 1]
            mid = (p0 + p1) / 2 + np.array([-(p1 - p0)[1], (p1 - p0)[0]]) * 0.18 * (1 if i % 2 else -1)
            out.append((1 - t) ** 2 * p0 + 2 * (1 - t) * t * mid + t * t * p1)
    return np.array(out)


VP = vein_path()


def gate_q(x, y):
    """the gate's frame: u across it (screen right), r back into the swell"""
    return (x - GATE[0]) * PERP[0] + (y - GATE[1]) * PERP[1], -((x - GATE[0]) * AX[0] + (y - GATE[1]) * AX[1])


def shape_plan(w):
    w.trees, w.logs, w.rocks = [], [], []
    w.light = np.ones_like(w.light)
    w.gap = (-100.0, -100.0, 1.0)
    for name in ("fern", "sapl", "shrooms", "grass", "moss", "bare", "pool"):
        a_ = getattr(w, name, None)
        if isinstance(a_, np.ndarray) and a_.dtype == bool:
            setattr(w, name, np.zeros_like(a_))
        elif isinstance(a_, list):
            setattr(w, name, [])
    X, Y = w.X, w.Y
    H = (fbm(X * 0.25, Y * 0.25) - 0.5) * 0.9
    # the great swell of flesh behind, rising five yards, the gate cut into its foot
    u, r = gate_q(X, Y)
    swell = np.clip((r + 0.2) / 2.5, 0, 1) ** 0.8 * 5.0 * np.clip(1 - np.abs(u) / 14.0, 0.35, 1)
    swell = swell + (fbm(X * 0.6, Y * 0.6) - 0.5) * 0.8 * np.clip(r, 0, 1)
    door = (np.abs(u) < GATE_W / 2) & (r > -0.2)
    swell = np.where(door, 0.0, swell)                                   # the doorway: a passage into the swell
    H = H + swell
    for (p, h, rr_, s) in FANGS:                                         # heaved, torn ground round each fang
        d = np.hypot(X - p[0], Y - p[1])
        H = H + 0.6 * np.exp(-((d - rr_ * 1.25) / 0.8) ** 2)
    d = np.hypot(X - EYE[0][0], Y - EYE[0][1])                          # the eye's socket, in folds of flesh
    ang = np.arctan2(Y - EYE[0][1], X - EYE[0][0])
    out_ = np.clip(d - EYE[1] * 1.15, 0, None)
    folds = 0.16 * np.sin(out_ * 5.5 - 0.6 + np.sin(ang * 3 + d) * 0.6) * np.exp(-out_ / 1.8)   # concentric folds
    wrink = 0.05 * np.sin(ang * 14 + d * 2) * np.exp(-out_ / 1.0) * (out_ > 0)                  # radial wrinkles
    H = H + 0.85 * np.exp(-((d - EYE[1] * 1.0) / 0.5) ** 2) + folds + wrink - np.clip(1 - d / (EYE[1] * 1.1), 0, 1) * 0.35
    e = ((X - POOL[0][0]) / POOL[1]) ** 2 + ((Y - POOL[0][1]) / POOL[2]) ** 2
    lvl = float(H[np.unravel_index(np.argmin(e), e.shape)]) - 0.12
    m_ = np.clip((1.35 - e) / 0.5, 0, 1)
    H = H * (1 - m_) + np.minimum(H, lvl) * m_                           # the pool's hollow: its surface level
    # the cavern's walls: columnar basalt rising out of sight round the courtyard, the god's flesh in their seams
    qa_ = (X - C[0]) * AX[0] + (Y - C[1]) * AX[1]
    qp_ = (X - C[0]) * PERP[0] + (Y - C[1]) * PERP[1]
    wall_d = np.abs(qp_) - (10.5 + (fbm(qa_ * 0.25, 7) - 0.5) * 3.0 + np.clip(qa_ - 9, 0, None) * 0.25)
    wall = np.clip(wall_d / 1.6, 0, 1) ** 0.7 * (12 + fbm(X * 0.5, Y * 0.5) * 3)
    cols_ = (vn(X * 1.4 + 5, Y * 1.4) > 0.5) * 0.25 * (wall > 0.5)            # columnar jointing: faceted steps
    H = np.maximum(H, wall + cols_)
    w.cave = wall > 0.4
    # two great stalagmites in the near corners: dark shapes framing the shot
    for (pa, pp, hh, rr0, sd) in ((14.9, -9.0, 4.6, 0.95, 3), (15.5, 8.9, 5.4, 1.05, 4)):
        p0 = C + AX * pa + PERP * pp
        d = np.hypot(X - p0[0], Y - p0[1]) * (1 + (fbm(X * 1.2 + sd, Y * 1.2) - 0.5) * 0.5)
        stal = hh * np.clip(1 - d / rr0, 0, 1) ** 0.55
        H = np.maximum(H, stal)
        w.cave = w.cave | (stal > 0.3)
    w.H = H
    w.wet = np.clip(1 - np.abs(r - 0.5) / 3.0, 0, 1) * 0.6               # mist lying at the swell's foot


def to_fang(k, x, y):
    c, a = FANGS[k][0], FANGS[k][3] * 0.7
    dx, dy = x - c[0], y - c[1]
    return dx * np.cos(a) + dy * np.sin(a), -dx * np.sin(a) + dy * np.cos(a)


def stamp(W, w):
    X, Y = W["X"], W["Y"]
    H = W["H"].copy()
    gat = lambda p: float(W["H"][int((p[1] - W["y0"]) / ws.RES), int((p[0] - W["x0"]) / ws.RES)])
    FG.clear()
    for k, (F, info) in enumerate(TF):
        lx, ly = to_fang(k, X, Y)
        inside = (np.abs(lx) < F.half) & (np.abs(ly) < F.half)
        gum = np.where(inside & (F.at(F.M, lx, ly, 0) == toothgen.GUM), F.at(F.H, lx, ly), -9.0)
        base = gat(FANGS[k][0]) - 0.35
        f = fanggen.make(FANGS[k][0], base, FANGS[k][1], FANGS[k][2], FANGS[k][3], AX, PERP)
        FG.append(f)
        near = np.hypot(X - f["c"][0], Y - f["c"][1]) < f["R"] * 1.3 + f["h"] * 0.25
        en = np.full(X.shape, -9.0)
        en[near] = fanggen.heightfield(X[near][None, :], Y[near][None, :], f)[0] - base
        fh = np.maximum(gum, en)
        m = (fh > 0.0) & (base + fh > H)
        H = np.where(m, base + fh, H)
        W["tag"] = np.where(m, 700 + k, W["tag"])
        W["obj"][700 + k] = dict(kind="tooth", k=k, base=base)
    gbase = gat(GATE + AX * 0.3)
    u, r = gate_q(X, Y)
    for i, (p, hgt, sd) in enumerate(COLS):
        d = np.hypot(X - p[0], Y - p[1])
        g = gat(p)
        top = g + hgt - (fbm(X * 3 + sd, Y * 3) - 0.3) * 0.6 * (hgt > 1.0)   # the break, jagged
        shaft = d < 0.5
        plinth = (np.maximum(np.abs((X - p[0]) * AX[0] + (Y - p[1]) * AX[1]), np.abs((X - p[0]) * PERP[0] + (Y - p[1]) * PERP[1])) < 0.78) & ~shaft
        for msk, z in ((shaft, top), (plinth, np.full(X.shape, g + 0.45))):
            mm = msk & (z > H)
            H = np.where(mm, z, H)
            W["tag"] = np.where(mm, 790 + i, W["tag"])
        W["obj"][790 + i] = dict(kind="column", base=g, c=p, h=hgt)
    qa_ = (X - C[0]) * AX[0] + (Y - C[1]) * AX[1]
    qp_ = (X - C[0]) * PERP[0] + (Y - C[1]) * PERP[1]
    rr = np.random.default_rng(77)
    # the stump: coursed dressed blocks 0.45 high, 0.9 long; its top stepped and ragged, block by block
    on_wall = (np.abs(qp_ - WALL_P) < 0.45) & (qa_ > 1.5) & (qa_ < 10.5)
    blk = np.floor((qa_ - 1.5) / 0.9).astype(int)
    course_h = np.array([rr.integers(1, 5) for _ in range(12)]) * 0.45 + 0.1
    wtop = np.where(on_wall, course_h[np.clip(blk, 0, 11)] + gat(C + AX * 6 + PERP * WALL_P) - 0.2, -9.0)
    m = on_wall & (wtop > H)
    H = np.where(m, wtop, H)
    W["tag"] = np.where(m, 870, W["tag"])
    W["obj"][870] = dict(kind="rubble", fam=1, base=0.0, wall=True)
    # the rubble: the near ridge of small core stones, then the big dressed blocks thrown out
    k_ = 0
    for j in range(150):
        big = j < 22
        a_ = rr.uniform(2.0, 10.0)
        off = rr.uniform(0.55, 1.4) if not big else rr.uniform(1.3, 2.4)        # small ones near, big ones far
        p = C + AX * a_ + PERP * (WALL_P + off)
        if big:
            hx, hy, hz = rr.uniform(0.35, 0.5), rr.uniform(0.2, 0.26), rr.uniform(0.18, 0.24)
        else:
            hx = hy = rr.uniform(0.08, 0.17)
            hz = hx * rr.uniform(0.7, 1.1)
        yaw = rr.uniform(0, np.pi)
        lx = (X - p[0]) * np.cos(yaw) + (Y - p[1]) * np.sin(yaw)
        ly = -(X - p[0]) * np.sin(yaw) + (Y - p[1]) * np.cos(yaw)
        box = np.maximum(np.abs(lx) - hx, np.abs(ly) - hy)
        if not (box < 0.05).any():
            continue
        rnd = 0.04 if big else 0.06
        prof = np.clip(-box / rnd, 0, 1) ** 0.5
        g = gat(p) - hz * rr.uniform(0.25, 0.6)                                # sunk in the ash
        top = g + hz * 2 * prof + (vn(X * 8 + j, Y * 8) - 0.5) * (0.02 if big else 0.05)
        m = (box < 0) & (top > H)
        H = np.where(m, top, H)
        W["tag"] = np.where(m, 871 + k_, W["tag"])
        W["obj"][871 + k_] = dict(kind="rubble", fam=int(rr.integers(0, 3)), base=g, wall=False, big=big)
        k_ += 1
    # the capital, upside down where it landed furthest: the square abacus slab, the cushioned echinus under it
    d = np.hypot(X - CAPITAL[0], Y - CAPITAL[1])
    lx = (X - CAPITAL[0]) * np.cos(_FALL_A) + (Y - CAPITAL[1]) * np.sin(_FALL_A)
    ly = -(X - CAPITAL[0]) * np.sin(_FALL_A) + (Y - CAPITAL[1]) * np.cos(_FALL_A)
    g = gat(CAPITAL)
    ech = np.where(d < 0.62, g + 0.15 + np.sqrt(np.clip(0.62 ** 2 - d ** 2, 0, None)) * 0.55, -9.0)
    aba = np.where(np.maximum(np.abs(lx), np.abs(ly)) < 0.72, g + 0.15 + 0.3 * np.clip((0.72 - np.maximum(np.abs(lx), np.abs(ly))) / 0.05, 0, 1), -9.0)
    cap = np.maximum(ech, np.where(d < 0.62, -9.0, aba))
    m = cap > H
    H = np.where(m, cap, H)
    W["tag"] = np.where(m, 869, W["tag"])
    W["obj"][869] = dict(kind="rubble", fam=1, base=g, wall=False, big=True)
    cave = getattr(w, "cave", None)                                       # the cavern's rock: walls and stalagmites, basalt
    if cave is not None:
        import wood_ecosystem as we_
        ri = np.clip(np.round(W["Y"] / we_.RES - 0.5).astype(int), 0, cave.shape[0] - 1)
        ci = np.clip(np.round(W["X"] / we_.RES - 0.5).astype(int), 0, cave.shape[1] - 1)
        m = cave[ri, ci] & (W["tag"] == 0)
        W["tag"] = np.where(m, 868, W["tag"])
        W["obj"][868] = dict(kind="rubble", fam=0, base=0.0, wall=False, big=True)
    for i, (p, a, L_) in enumerate(DRUMS):
        dirv = np.array([np.cos(a), np.sin(a)])
        along = (X - p[0]) * dirv[0] + (Y - p[1]) * dirv[1]
        acr = -(X - p[0]) * dirv[1] + (Y - p[1]) * dirv[0]
        m = (np.abs(along) < L_ / 2) & (np.abs(acr) < 0.5)
        g = gat(p)
        z = g + 0.5 + np.sqrt(np.clip(0.25 - acr ** 2, 0, None)) - 0.15
        mm = m & (z > H)
        H = np.where(mm, z, H)
        W["tag"] = np.where(mm, 810 + i, W["tag"])
        W["obj"][810 + i] = dict(kind="drum", base=g, c=p, a=a)
    # the megalith posts (landkit gate.py draws them; here their mass for shadows and for what they hide)
    for sgn in (-1, 1):
        m = (np.abs(u - sgn * POST_U) < POST_HU) & (np.abs(r) < POST_HR)
        H = np.where(m, np.maximum(H, gbase + POST_H - 0.3), H)
        W["tag"] = np.where(m, 765 + (sgn > 0), W["tag"])
        W["obj"][765 + (sgn > 0)] = dict(kind="rwall", base=gbase, a=0.0, p=GATE)
    # the ruin round the cyst
    for i, (p, a) in enumerate(RUIN):
        tang = np.array([-np.sin(a), np.cos(a)])
        rad = np.array([np.cos(a), np.sin(a)])
        lu = (X - p[0]) * tang[0] + (Y - p[1]) * tang[1]
        lr = (X - p[0]) * rad[0] + (Y - p[1]) * rad[1]
        L = 1.2 + (i % 3) * 0.35
        m = (np.abs(lu) < L / 2) & (np.abs(lr) < 0.36)
        g = gat(p)
        top = g + 1.3 - (fbm(lu * 1.5 + i, 3) - 0.3) * 1.1 + lr * (0.25 + (i % 2) * 0.3) * 1.5
        top = np.floor((top - g) / 0.32) * 0.32 + g
        mm = m & (top > H)
        H = np.where(mm, top, H)
        W["tag"] = np.where(mm, 780 + i, W["tag"])
        W["obj"][780 + i] = dict(kind="rwall", base=g, a=a, p=p)
    W["H"] = H
    W["Hrest"] = H
    W["HT"] = np.full_like(H, -50.0)
    spread = np.zeros(X.shape)
    for (p, h, rr_, s) in FANGS:
        spread = np.maximum(spread, 1 - np.hypot(X - p[0], Y - p[1]) / (rr_ + 2.4))
    for (p, rad_) in ((EYE[0], 4.4), (POOL[0], 2.8), (GATE + AX * 0.6, 4.2)):
        spread = np.maximum(spread, 1 - np.hypot(X - p[0], Y - p[1]) / rad_)
    for q in VP[::6]:
        spread = np.maximum(spread, 1 - np.hypot(X - q[0], Y - q[1]) / 1.4)
    spread = np.maximum(spread, np.clip(r, 0, 1) * 0.8)                   # the swell itself: flesh
    spread = spread + (fbm(X * 0.8, Y * 0.8) - 0.5) * 0.5
    W["putrid"] = spread > 0.15
    W["fdist"] = nd.distance_transform_edt(~W["putrid"]) * ws.RES        # yards to the nearest flesh
    W["thread"] = (spread > -0.08) & (spread <= 0.15)                       # a narrow band where it creeps into the ash
    e = ((X - POOL[0][0]) / POOL[1]) ** 2 + ((Y - POOL[0][1]) / POOL[2]) ** 2
    W["pool"] = (e + (vn(X * 3, Y * 3) - 0.5) * 0.3) < 1
    W["pore"] = np.full(X.shape, 99.0)
    W["doorway"] = (np.abs(u) < GATE_W / 2) & (r > -0.2)
    W["gate_r"] = r
    W["gate_u"] = u
    W["gbase"] = gbase
    # gore tendrils up the pillars: raw flesh ropes out of the ground at each plinth, spiralling up the shafts, thinner
    # branches forking off; pustules along them, each a sickly yellow light (Derek: "some gore tendrils running up the
    # pillars with pustules emitting a sickly yellow light")
    SICK.clear()
    W["tendrils"] = []
    climbers = [(p, hgt, sd, W["obj"][790 + i]["base"], 0.6) for i, (p, hgt, sd) in enumerate(COLS)]
    climbers += [(GATE + PERP * sg * POST_U - AX * 0.0, 3.4, 300 + (sg > 0), gbase - 0.3, 1.25) for sg in (-1, 1)]
    for (p, hgt, sd, g, prad) in climbers:
        if hgt < 1.0:
            continue
        rr = np.random.default_rng(sd + 500)
        for k in range(2):
            a0 = rr.uniform(0, 2 * np.pi)
            spin = rr.choice([-1, 1]) * rr.uniform(0.9, 1.6)
            top = g + 0.6 + rr.uniform(0.5, 1.0) * (hgt - 0.8)
            pts = []
            for s_ in np.linspace(0, 1, 90):
                if s_ < 0.12:                                                    # out of the ground and up the plinth
                    f_ = s_ / 0.12
                    rad, z = prad + 0.45 - f_ * 0.45, g - 0.15 + f_ * 0.62
                else:
                    f_ = (s_ - 0.12) / 0.88
                    rad, z = prad, g + 0.47 + f_ * (top - g - 0.47)
                a = a0 + spin * (z - g) + np.sin(s_ * 17 + sd) * 0.12
                pts.append((p[0] + np.cos(a) * rad, p[1] + np.sin(a) * rad, z))
            pts = np.array(pts)
            W["tendrils"].append((pts, 0.15 + rr.uniform(0, 0.05), sd * 10 + k))
            j0 = int(rr.integers(30, 70))                                         # a branch forking off, the other way
            bp = []
            for s_ in np.linspace(0, 1, 40):
                z = pts[j0][2] + s_ * rr.uniform(0.8, 1.4)
                a = np.arctan2(pts[j0][1] - p[1], pts[j0][0] - p[0]) - spin * s_ * 1.6
                bp.append((p[0] + np.cos(a) * (prad - 0.02), p[1] + np.sin(a) * (prad - 0.02), min(z, top + 0.3)))
            W["tendrils"].append((np.array(bp), 0.08, sd * 10 + k + 5))
            for j in rr.choice(np.arange(15, 88), size=int(rr.integers(2, 5)), replace=False):
                q = pts[j]
                out = np.array([q[0] - p[0], q[1] - p[1], 0.0])
                out /= np.linalg.norm(out) + 1e-9
                pr = rr.uniform(0.1, 0.2)
                SICK.append((q + out * (0.08 + pr * 0.55), pr, rr.uniform(0, 6.28)))
    ws.LIGHTS.append((GATE[0] - AX[0] * 0.6, GATE[1] - AX[1] * 0.6, gbase + 1.2, 3.2))   # the glow from within the gate
    ws.LIGHTS.append((GATE[0] - AX[0] * 2.2, GATE[1] - AX[1] * 2.2, gbase + 2.4, 4.5))   # and deeper in: it backlights the grille
    # the banked offering-fires at the posts' feet (the lore: "Bank it, Tam. Ash over the coals ... we keep the fire
    # low on the Cheek"): their low light thrown up the posts' faces onto the kneelers
    for sg in (-1, 1):
        fp = GATE + PERP * sg * POST_U + AX * (POST_HR + 0.9)
        FIRES.append(fp)
        ws.LIGHTS.append((fp[0], fp[1], gbase + 0.35, 2.6))


_TILES = {}
SICK = []                                    # the pustules' sickly lights: (position xyz, radius, phase)
FIRES = []                                   # the banked offering-fires at the posts' feet
SICKC = np.array([0.72, 0.8, 0.22])
ws_T = [0.0]                                 # the loop's time, for the ground's own motion


def ground(img, W, px, py, pz, SX, SY, L, v, gl):
    sick = np.zeros(px.shape)
    for (q, pr, ph) in SICK:
        d2 = (px - q[0]) ** 2 + (py - q[1]) ** 2 + (pz - q[2]) ** 2
        sick += 1 / (1 + d2 / (0.55 + pr * 2.5) ** 2) * (0.25 + pr * 1.5)   # a small sickly pool round each
    k = (np.clip(sick, 0, 1.0)[..., None] * 0.2 * SICKC + 0.09 + L["moon"][..., None] * 1.35 * np.array([0.86, 0.9, 1.05]) + L["lamp"][..., None] * 1.5 * np.array([1.15, 0.85, 0.55])) * (1 - L["ao"][..., None] * 0.35)
    alb = groundgen.ash(px, py, seed=4)
    qa = (px - C[0]) * AX[0] + (py - C[1]) * AX[1]
    qp = (px - C[0]) * PERP[0] + (py - C[1]) * PERP[1]
    yard = (np.abs(qp) < YARD[0] + (vn(qa * 0.5, 3) - 0.5) * 1.6) & (qa > YARD[1]) & (qa < YARD[2])
    fd = ws.look(W, W["fdist"], px, py)
    heave = np.clip(1 - fd / 1.3, 0, 1) ** 1.6                            # the flesh pushing up under the stones, near it
    way = np.clip(1 - (np.abs(qp) - 1.2 - (vn(qa * 0.4, 5) - 0.5) * 0.8) / 1.2, 0, 1) * (qa > YARD[1] - 1)   # the old processional way to the gate
    fcol, fh, fj = groundgen.paving_poly(px, py, seed=2, heave=heave, path=way, moon=ws.SUN)
    pcol0, _ = groundgen.flesh(px, py, seed=1, moon=ws.SUN)
    fcol = np.where((fj & (heave > 0.3 + (vn(px * 2, py * 2) - 0.5) * 0.3))[..., None], pcol0 * 0.8, fcol)   # flesh in the joints
    drift = fbm(px * 0.45, py * 0.45) > 0.67 - np.clip(np.abs(qp) - 4.5, 0, 3) * 0.08  # ash drifted over the flags
    lay = yard & ~drift
    alb = np.where(lay[..., None], fcol, alb)
    edge_ = yard & drift & (fbm(px * 0.45, py * 0.45) < 0.69 - np.clip(np.abs(qp) - 4.5, 0, 3) * 0.08)
    alb = np.where(edge_[..., None], alb * 0.6 + fcol * 0.4, alb)              # the stones showing through thin ash
    pm = ws.look(W, W["putrid"], px, py) > 0
    pcol, pwet = groundgen.flesh(px, py, seed=1, moon=ws.SUN)
    alb = np.where(pm[..., None], pcol, alb)
    fd_ = ws.look(W, W["fdist"], px, py)                                    # its edge feathers: a thin film of flesh over the stone
    feather = np.clip(1 - fd_ / 0.5, 0, 1) * (vn(px * 4 + 2, py * 4) * 0.6 + 0.4) * ~pm
    alb = alb * (1 - feather[..., None] * 0.6) + pcol * 0.75 * feather[..., None] * 0.6
    # the fungal threads: sparse wandering lines (contours of a slow noise), only in the band where the flesh creeps
    # (the mycelium is drawn as living strands, threading in and out of the ground: see mycelium())
    d = ws.look(W, W["pore"], px, py)
    r = PORE[1]
    rim = (d > r * 0.65) & (d < r * 1.45)
    taut = np.array([0.36, 0.14, 0.17]) * (0.8 + 0.4 * np.clip(1 - np.abs(d - r) / (r * 0.4), 0, 1))[..., None]
    alb = np.where(rim[..., None], taut, alb)
    lipm = (d > r * 0.6) & (d < r * 0.72)
    alb = np.where(lipm[..., None], np.array([0.62, 0.55, 0.3]), alb)
    hole = d <= r * 0.6
    depth_ = np.clip(1 - d / (r * 0.6), 0, 1)
    alb = np.where(hole[..., None], np.array([0.06, 0.02, 0.03]) * (1 - depth_[..., None] * 0.9), alb)
    out = img.copy()
    out[gl] = np.clip(alb * k, 0, 1)[gl]
    # the doorway: the passage into the swell going to black within a yard or two
    dw = ws.look(W, W["doorway"], px, py) > 0
    gr = ws.look(W, W["gate_r"], px, py)
    dark = np.clip((gr + 0.3) / 1.6, 0, 1)
    out = np.where(dw[..., None], out * (1 - dark[..., None]) + np.array([0.01, 0.0, 0.01]) * dark[..., None], out)
    # within the doorway, far in: a deep red breathing glow (something waits there)
    deep = dw & (gr > 0.6)
    br_ = 0.75 + 0.25 * np.sin(ws_T[0] * 6.28)
    glow_ = np.clip(1 - np.abs(gr - 1.6) / 1.4, 0, 1) * (1 - np.clip(np.abs(ws.look(W, W["gate_u"], px, py)) / (GATE_W / 2), 0, 1) ** 2)
    out = np.where(deep[..., None], out + np.array([0.42, 0.22, 0.07]) * (glow_ * br_)[..., None], out)
    wet_ = gl & pm & pwet
    out[wet_] = np.minimum(out[wet_] * 1.45 + np.array([0.05, 0.04, 0.05]), 1)   # the swollen tops wet and shining
    sheen = gl & rim & (L["moon"] > 0.55) & (vn(px * 12, py * 12) > 0.66)
    out[sheen] = np.minimum(out[sheen] * 1.6 + 0.06, 1)
    pl = gl & (ws.look(W, W["pool"], px, py) > 0)
    marb = np.sin((px - POOL[0][0]) * 7.0 + vn(px * 3.5, py * 3.5) * 7 + np.sin(py * 5.1) * 2)
    mix = np.clip(marb * 0.5 + 0.5, 0, 1) ** 1.5
    mix = np.clip(mix - 0.55, 0, 1) * 1.6                                  # mostly blood, pus in thin streaks
    col = np.array([0.34, 0.3, 0.15]) * mix[..., None] + np.array([0.17, 0.02, 0.03]) * (1 - mix[..., None])
    out[pl] = np.clip(col * (0.45 + L["moon"][..., None] * 0.4 + L["lamp"][..., None] * 0.8), 0, 1)[pl]
    gloss = pl & (vn(px * 6 + 3, py * 6) > 0.74)
    out[gloss] = np.minimum(out[gloss] * 1.5 + 0.08, 1)
    crust = gl & ~pl & nd.binary_dilation(pl, iterations=2)                 # the dried crust round it, yellow-brown
    crust = crust & (vn(px * 4, py * 4) > 0.45)
    out[crust] = out[crust] * 0.55 + np.array([0.12, 0.05, 0.04]) * 0.45   # a patchy dark crust, soaked into the flesh
    dr = np.hypot((px - POOL[0][0]) / POOL[1], (py - POOL[0][1]) / POOL[2])
    ring = pl & (np.abs(np.sin(dr * 14 - ws_T[0] * 6.28 * 2)) < 0.08) & (dr < 0.8)
    out[ring] = np.minimum(out[ring] * 1.25, 1)                              # rings spreading where the drops fall
    edge = pl & ~nd.binary_erosion(pl, iterations=1)
    out[edge] = out[edge] * 0.7
    far = edge & (np.roll(pl, 2, axis=0) == False)                        # the meniscus catching light on the far edge
    out[far] = np.minimum(out[far] * 1.5 + 0.04, 1)
    return out


def paint_tooth(img, m, v, n, px, py, pz, o, W, L):
    k = o["k"]
    F, info = TF[k]
    lx, ly = to_fang(k, px, py)
    M = F.at(F.M, lx, ly, 0)
    for step in (0.03, 0.06):
        miss = m & (M == 0)
        if not miss.any():
            break
        ix, iy = to_fang(k, px - n[..., 0] * step, py - n[..., 1] * step)
        M = np.where(miss, F.at(F.M, ix, iy, 0), M)
    ca = FANGS[k][3] * 0.7
    d_ = np.hypot(lx, ly) + 1e-6
    slope = info["height"] / max(info["R"], 0.3) * 0.62
    nl = np.dstack([lx / d_ * slope, ly / d_ * slope, np.ones_like(lx)])
    nl /= np.linalg.norm(nl, axis=2, keepdims=True)
    nw = np.dstack([nl[..., 0] * np.cos(ca) - nl[..., 1] * np.sin(ca), nl[..., 0] * np.sin(ca) + nl[..., 1] * np.cos(ca), nl[..., 2]])
    moon_an = np.clip((nw * ws.SUN).sum(2), 0, 1)
    mf = m.astype(float)
    vs = nd.gaussian_filter(v * mf, 2.2) / np.maximum(nd.gaussian_filter(mf, 2.2), 1e-3)
    v2 = np.where(m, vs * 0.55 + (0.12 + moon_an * 0.62) * 0.45, v)
    img = toothgen.paint_tooth(img, m, v2, nw, lx, ly, pz - o["base"], M, info, L["side"])
    h = pz - o["base"]
    gl_ = m & L["side"] & (v2 > 0.5) & (np.abs(np.sin(np.arctan2(ly, lx) - 2.5)) < 0.07) & (h > info["height"] * 0.3)
    img[gl_] = np.minimum(img[gl_] * 1.3 + 0.05, 1)                        # the gloss line down the enamel
    craze = m & L["side"] & (np.abs(np.sin(np.arctan2(ly, lx) * 11 + h * 1.3 + vn(lx, ly) * 2)) < 0.03)
    img[craze] = img[craze] * 0.75                                          # long craze-lines in the enamel
    collar = m & (h < 0.95) & (h > 0.55)
    img[collar] = img[collar] * 0.3 + np.array([0.42, 0.13, 0.15]) * 0.7 * np.clip(v2[collar] + 0.3, 0, 1)[:, None]   # the gum's collar
    climb = m & (h < 0.6 + vn(lx * 3, ly * 3) * 0.8)                  # the flesh climbing its foot
    img[climb] = tiles_moor.PUTRID[np.clip(((v2 * 0.8) * 7).astype(int), 0, 6)][climb]
    run = m & L["side"] & (np.abs(np.sin(np.arctan2(ly, lx) * 5 + 1.3)) < 0.06) & (h < info["height"] * 0.45)
    img[run] = np.array([0.22, 0.03, 0.04])                            # blood run from where it broke the skin
    return img


def paint_pylon(img, m, v, n, px, py, pz, o, W, L):
    """a vertebra stacked on a vertebra: each drum's rim lit, the dark seam of the disc between, spurs, foramina"""
    h = pz - o["base"]
    j = np.floor(h / 1.12)
    f = h / 1.12 - j
    u, r = gate_q(px, py)
    ang = np.arctan2(r - 0.1, u - o["cu"])
    bv = v * 0.8 + 0.02 + (vn(ang * 4 + j, f * 3) - 0.5) * 0.06 - (f < 0.1) * 0.3 + (f > 0.82) * 0.05
    img[m] = R_BONE[np.clip((bv * len(R_BONE)).astype(int), 0, len(R_BONE) - 1)][m]
    stain = m & (vn(ang * 2 + 3, h * 0.8) > 0.45)                       # old bone, stained by the flesh it stood in
    img[stain] = img[stain] * np.array([0.82, 0.74, 0.66])
    disc = m & (f < 0.1)
    img[disc] = np.array([0.24, 0.1, 0.11]) * np.clip(v[disc] + 0.3, 0, 1)[:, None]   # the cartilage between, raw
    hole = m & (np.hypot(np.sin(ang * 3) * 0.6, f - 0.5) < 0.1)                        # the foramina, dark
    img[hole] = img[hole] * 0.25
    crack = m & (np.abs(np.sin(ang * 7 + h * 2)) < 0.03)
    img[crack] = img[crack] * 0.5
    flesh = m & (h < 0.9 + vn(ang * 3, 1) * 0.8)
    img[flesh] = tiles_moor.PUTRID[np.clip(((v[flesh] * 0.8) * 7).astype(int), 0, 6)]
    return img


def paint_door(img, m, v, n, px, py, pz, o, W, L):
    h = pz - o["base"]
    u, r = gate_q(px, py)
    iv = np.clip(v * 0.7 + 0.03, 0, 0.9)
    img[m] = R_IRON[np.clip((iv * len(R_IRON)).astype(int), 0, len(R_IRON) - 1)][m]
    band = m & (np.abs(((h / 0.9) % 1.0) - 0.5) < 0.08)                 # its iron bands
    img[band] = np.minimum(img[band] * 1.5 + 0.02, 1)
    rivet = band & (np.abs(np.sin(u * 14)) > 0.97)
    img[rivet] = np.array([0.32, 0.28, 0.26])
    rust = m & (vn(u * 9, h * 9) > 0.72)
    img[rust] = img[rust] * 0.5 + np.array([0.3, 0.13, 0.06]) * 0.5
    return img


def paint_rwall(img, m, v, n, px, py, pz, o, W, L):
    a = o["a"]
    tang = np.array([-np.sin(a), np.cos(a)])
    lu = (px - o["p"][0]) * tang[0] + (py - o["p"][1]) * tang[1]
    h = pz - o["base"]
    course = np.floor(h / 0.32)
    bi = np.floor(lu / 0.6 + (course % 2) * 0.5)
    jit = (np.sin(bi * 12.9 + course * 78.2 + a * 9) * 4375.5) % 1.0
    joint = ((lu / 0.6 + (course % 2) * 0.5) - bi < 0.08) | ((h / 0.32 - course) < 0.12)
    sv = np.clip(v * 0.9 + 0.06 + (jit - 0.5) * 0.12 - joint * 0.2, 0, 0.85)
    img[m] = R_STONE[np.clip((sv * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][m]
    crack = m & (np.abs(np.sin(lu * 4 + h * 6 + a)) < 0.04)
    img[crack] = img[crack] * 0.45
    flesh = m & (h < 0.5 + vn(lu * 3, a) * 0.7)
    img[flesh] = img[flesh] * 0.35 + np.array([0.3, 0.12, 0.15]) * 0.65 * np.clip(v[flesh] + 0.3, 0, 1)[:, None]
    return img


R_GORE = ws.ramp("#12060a", "#2a0b12", "#45121c", "#641c26", "#842a30", "#a33d3a", "#c25a4a")


def pustules(img, zb, dep, T):
    """each pustule a tense dome: a creamy yellow centre under a thin glossy cap, a red halo round it; it glows a
    sickly yellow, breathing slowly, and its glow hangs in the air round it (chapter 3)"""
    GH, GW = img.shape[:2]
    glow = np.zeros((GH, GW))
    for (q, pr, ph) in SICK:
        breath = 0.72 + 0.28 * np.sin(T * 6.283 + ph)
        sx, sy = ws.to_px(tuple(q))
        rp = max(pr * 18, 1.2)
        hit = False
        for yy in range(int(sy - rp * 2.2), int(sy + rp * 2.2) + 1):
            for xx in range(int(sx - rp * 2.2), int(sx + rp * 2.2) + 1):
                if not (0 <= yy < GH and 0 <= xx < GW):
                    continue
                u, v = (xx + 0.5 - sx) / rp, (yy + 0.5 - sy) / rp
                r2 = u * u + v * v
                dd = q[0] + q[1] + 0.3
                if r2 <= 1:
                    if dd < zb[yy, xx] - 0.4 or dd < dep[yy, xx] - 0.6:
                        continue
                    hit = True
                    k = np.sqrt(1 - r2)
                    col = np.array([0.95, 0.88, 0.55]) * (0.55 + 0.45 * k) * (0.6 + 0.5 * breath)
                    if r2 > 0.6:
                        col = col * 0.7 + np.array([0.5, 0.2, 0.1]) * 0.3            # the cap's thin edge, reddening
                    if (u + 0.35) ** 2 + (v + 0.4) ** 2 < 0.07:
                        col = np.array([1.0, 0.98, 0.9])                          # the wet glint on the cap
                    img[yy, xx] = np.clip(col, 0, 1)
                    zb[yy, xx] = max(zb[yy, xx], dd)
                elif r2 <= 2.4 and dd >= zb[yy, xx] - 0.5:
                    img[yy, xx] = img[yy, xx] * 0.7 + np.array([0.42, 0.06, 0.06]) * 0.3   # the red halo
        if hit:
            R_ = int(rp * 7 + 4)
            y0, y1, x0, x1 = max(0, int(sy) - R_), min(GH, int(sy) + R_), max(0, int(sx) - R_), min(GW, int(sx) + R_)
            yy, xx = np.mgrid[y0:y1, x0:x1]
            glow[y0:y1, x0:x1] += np.exp(-((xx - sx) ** 2 + ((yy - sy) * 1.3) ** 2) / (R_ * 0.45) ** 2) * breath * (0.4 + pr * 2)
    img += np.clip(glow, 0, 1.0)[..., None] * SICKC * 0.1                  # the glow hanging in the air
    np.clip(img, 0, 1, out=img)


def living_flesh(img, w, W, px, py, pz, L, T):
    ws_T[0] = T
    GH, GW = img.shape[:2]
    dep = px + py
    zb = np.full((GH, GW), -1e9)
    lts = [((lx, ly, lz), (0.95, 0.6, 0.32), rch * 1.4) for (lx, ly, lz, rch) in ws.LIGHTS]
    lts = lts + [(tuple(q), tuple(SICKC * (0.18 + pr * 1.0)), 0.7 + pr * 2.5) for (q, pr, ph) in SICK]
    for f in sorted(FG, key=lambda q: q["c"][0] + q["c"][1]):           # the fangs, ray-marched (landkit fang.py)
        fanggen.draw(img, zb, dep, ws.to_px, f, lts, ws.SUN, ambient=0.15)
    # the gate (landkit gate.py): two megaliths, a grille leaf ajar and one torn off its upper hinge and sagging
    gb_ = W["gbase"]
    gshapes = []
    for sgn in (-1, 1):
        gshapes.append(gategen.post(GATE + PERP * sgn * POST_U, PERP, -AX, gb_ - 0.3, POST_HU, POST_HR, POST_H, seed=70 + (sgn > 0),
                                    hinge_u=-sgn * POST_HU))
    gshapes.append(gategen.leaf(GATE - PERP * (POST_U - POST_HU), PERP, -AX, gb_ - 0.05, 2.45, 6.2, 0.6, 0.0, seed=81))
    gshapes.append(gategen.leaf(GATE + PERP * (POST_U - POST_HU), -PERP, -AX, gb_ - 0.35, 2.45, 6.2, 1.15, 0.16, seed=82))
    gategen.draw(img, zb, dep, ws.to_px, gshapes, lts, ws.SUN)
    # the colonnade and its fallen drums (landkit column.py, from chapter 2)
    shapes = []
    for i, (p, hgt, sd) in enumerate(COLS):
        g0 = W["obj"][790 + i]["base"]                                   # the ground under it, before it was stamped
        shapes.append(colgen.shaft((p[0], p[1], g0 + 0.45), 0.5, max(hgt - 0.45, 0.3), seed=sd))
    for i, (p, a, L_) in enumerate(DRUMS):
        g0 = W["obj"][810 + i]["base"]
        shapes.append(colgen.drum((p[0], p[1], g0 + 0.32), (np.cos(a), np.sin(a)), 0.5, L_, seed=90 + i))
    colgen.draw(img, zb, dep, ws.to_px, sorted(shapes, key=lambda o: (o.get("b", o.get("c"))[0] + o.get("b", o.get("c"))[1])), lts, ws.SUN, ambient=0.07)
    for (tp, tr, tsd) in W["tendrils"]:                                  # the gore tendrils: raw flesh, wet, pulsing
        vessel.draw(img, zb, dep, ws.to_px, tp, tr, T, lts, ws.SUN, seed=tsd, tol=0.35, ramp_=R_GORE, taper=True)
    pustules(img, zb, dep, T)
    # the dead plant life (Derek): it grew only where the moon came down, in the joints, and died (landkit deadplants.py)
    gh_ = lambda x, y: float(ws.look(W, W["H"], np.array(x), np.array(y)))
    lamp = np.array([ws.HERO[0] + 0.25, ws.HERO[1] - 0.25, gh_(ws.HERO[0], ws.HERO[1]) + 0.7])

    def plight(P):
        lv = shaft(P[0], P[1], P[2]) * 0.9
        dl = np.linalg.norm(P - lamp)
        lv += 0.6 / (1 + (dl / 2.4) ** 2)
        for fp in FIRES:
            lv += 0.5 / (1 + (np.hypot(P[0] - fp[0], P[1] - fp[1]) / 1.6) ** 2)
        for (q, pr, ph) in SICK:                                           # the pustules' sickly light too
            lv += 0.45 / (1 + (np.linalg.norm(P - q) / (0.6 + pr * 2)) ** 2)
        return min(lv, 1.2)
    pr_ = np.random.default_rng(404)
    put = 0
    for _ in range(400):
        if put >= 60:
            break
        a, rd = pr_.uniform(0, 6.283), np.sqrt(pr_.uniform(0, 1)) * 5.5
        cx_ = SHAFT_AT if pr_.random() < 0.5 else np.array(ws.HERO)        # round the shaft's edge and in the lantern's pool
        x, y = cx_[0] + np.cos(a) * rd, cx_[1] + np.sin(a) * rd
        if ws.look(W, W["putrid"], np.array(x), np.array(y)) > 0 or ws.look(W, W["tag"], np.array(x), np.array(y)) != 0:
            continue                                                       # not on the flesh, not on a stone object
        if np.hypot(x - ws.HERO[0], y - ws.HERO[1]) < 0.5:
            continue
        put += 1
        deadplants.grass(img, zb, dep, ws.to_px, (x, y, gh_(x, y)), int(pr_.integers(4, 9)), pr_.uniform(0.25, 0.5), 500 + put, plight)
    for k_, (pa_, pp_) in enumerate(((6.6, -6.6), (11.2, 5.4))):               # dried thorn bushes by the fallen drums
        q = C + AX * pa_ + PERP * pp_
        deadplants.thorn(img, zb, dep, ws.to_px, (q[0], q[1], gh_(q[0], q[1])), 0.9 + k_ * 0.3, 600 + k_, plight)
    cp, chg, csd = COLS[2]                                                 # a dead vine up the front pillar on the left
    g0 = W["obj"][792]["base"]
    vp = [(cp[0] + np.cos(0.4 + z * 2.1) * 0.56, cp[1] + np.sin(0.4 + z * 2.1) * 0.56, g0 + 0.45 + z) for z in np.linspace(0, chg - 0.8, 70)]
    deadplants.vine(img, zb, dep, ws.to_px, vp, 700, plight)
    print('dead plants: tufts', put) if os.environ.get('PLDBG') else None
    for k_, fp in enumerate(FIRES):                                       # the banked fires: coals under a crust of ash, a thread of smoke
        g0 = gh(fp[0], fp[1]) if False else W["gbase"]
        rr = np.random.default_rng(900 + k_)
        for c_ in range(40):
            a, rd = rr.uniform(0, 6.283), np.sqrt(rr.uniform(0, 1)) * 0.45
            x, y = fp[0] + np.cos(a) * rd, fp[1] + np.sin(a) * rd * 0.8
            sx, sy = ws.to_px((x, y, g0 + 0.08 + (0.45 - rd) * 0.2))
            ix, iy = int(round(sx)), int(round(sy))
            if not (0 <= iy < GH and 0 <= ix < GW) or dep[iy, ix] > x + y + 0.3:
                continue
            heat = 0.5 + 0.5 * np.sin(T * 6.283 * rr.uniform(1, 3) + c_)
            if rr.random() < 0.55:
                img[iy, ix] = np.array([0.32, 0.3, 0.29]) * (0.6 + heat * 0.3)            # the ash crust over them
            else:
                img[iy, ix] = np.clip(np.array([0.9, 0.38, 0.08]) * (0.5 + heat * 0.6), 0, 1)   # a coal showing through
        for j in range(26):                                               # the thread of smoke, leaning in the draught
            z = g0 + 0.3 + j * 0.12
            x = fp[0] + np.sin(j * 0.5 + T * 6.283) * 0.06 + j * 0.012
            sx, sy = ws.to_px((x, fp[1], z))
            ix, iy = int(round(sx)), int(round(sy))
            if 0 <= iy < GH and 0 <= ix < GW and dep[iy, ix] <= x + fp[1] + 0.3:
                img[iy, ix] = img[iy, ix] * 0.8 + np.array([0.3, 0.29, 0.3]) * 0.2 * (1 - j / 26)
    gh = lambda x, y: float(ws.look(W, W["H"], np.array(x), np.array(y)))
    on_flesh = ws.look(W, W["putrid"], px, py) > 0
    # the flesh breathes: a slow swell of light and dark rolling across it
    wave = np.sin(T * 2 * np.pi - (px * 0.6 + py * 0.4)) * 0.5 + 0.5
    br = on_flesh & (W["tag"][0, 0] == W["tag"][0, 0]) & (ws.look(W, W["tag"], px, py) == 0)
    img[br] = img[br] * (0.88 + 0.18 * wave[br])[:, None]
    # the gate's arch (landkit bone.py): a great rib of the god laid from fang to fang over the doors, its heads bound
    # to the teeth with old sinew; a skull hung at its keystone, looking out over the courtyard
    gb = W["gbase"]
    pa = GATE + PERP * -(POST_U + 0.3) + AX * (POST_HR + 0.35)
    pb = GATE + PERP * (POST_U + 0.3) + AX * (POST_HR + 0.35)
    arch = bonegen.rib((pa[0], pa[1], gb + 4.6), (pb[0], pb[1], gb + 4.45), 0.85, 0.32, 0.36, seed=12)
    kp = GATE + AX * (POST_HR + 0.45)
    sk = bonegen.skull((kp[0], kp[1], gb + 4.45), 0.62, (AX[0] + 0.1, AX[1], -0.35), seed=4)
    bonegen.draw(img, zb, dep, ws.to_px, [arch, sk], lts, ws.SUN)
    # pustules on the flesh: each swells, shines, bursts, heals
    rr = np.random.default_rng(71)
    ys, xs = np.nonzero(W["putrid"][::4, ::4])
    pick = rr.choice(len(ys), size=min(70, len(ys)), replace=False)
    for q in pick:
        x = W["x0"] + (xs[q] * 4 + 2) * ws.RES
        y = W["y0"] + (ys[q] * 4 + 2) * ws.RES
        ph = (T + rr.uniform(0, 1)) % 1.0
        size = rr.uniform(0.5, 0.85)
        g = gh(x, y)
        sx, sy = ws.to_px((x, y, g))
        ix, iy = int(round(sx)), int(round(sy))
        if not (3 <= iy < GH - 3 and 3 <= ix < GW - 3) or dep[iy, ix] > x + y + 0.3:
            continue
        if ws.look(W, W["tag"], np.array(x), np.array(y)) != 0:
            continue
        k_ = 0.4 + L["moon"][iy, ix] * 0.6 + L["lamp"][iy, ix] * 1.2
        if ph < 0.8:
            r = int(round(1 + 2.4 * size * ph / 0.8))
            for dy in range(-r, 1):
                for dx in range(-r - 1, r + 2):
                    if (dx / (r + 1)) ** 2 + (dy / r) ** 2 <= 1:
                        col = np.array([0.46, 0.3, 0.22]) if dy > -r * 0.6 else np.array([0.62, 0.5, 0.3])   # flesh swelling, yellowing at its head
                        img[iy + dy, ix + dx] = np.clip(col * k_, 0, 1)
            img[iy - r, ix - 1] = np.minimum(np.array([0.95, 0.92, 0.8]) * k_, 1)
            img[iy + 1, ix - r: ix + r + 1] = img[iy + 1, ix - r: ix + r + 1] * 0.6
        elif ph < 0.9:
            for dx in range(-2, 3):
                img[iy, ix + dx] = np.array([0.05, 0.02, 0.02])
            for s_ in range(6):
                a = s_ * 1.05 + ph * 9
                jx, jy = ix + int(np.cos(a) * 4), iy + int(np.sin(a) * 2)
                if 0 <= jy < GH and 0 <= jx < GW:
                    img[jy, jx] = np.clip(np.array([0.7, 0.62, 0.3]) * k_, 0, 1)
        else:
            img[iy, ix - 1: ix + 2] = np.array([0.08, 0.03, 0.04])
    # the vein (landkit vessel.py): a true tube, threading in and out of the ground, its pulse running to the gate
    if "vein3" not in W:
        W["vein3"] = vessel.path(VP[::2], gh, seed=5, humps=2.5, depth=0.6, lift=0.42, r0=0.3)
    vessel.draw(img, zb, dep, ws.to_px, W["vein3"], 0.3, T, lts, ws.SUN, seed=5, ground=gh)
    # capillaries: fine dark threads branching off the vein into the ground, pulsing faintly with it
    cr = np.random.default_rng(55)
    for i in range(0, len(VP), 9):
        x, y = VP[i]
        a = cr.uniform(0, 2 * np.pi)
        pulse = np.exp(-((((i / len(VP)) * 6 - T * 2) % 1.0 - 0.5) / 0.08) ** 2)
        for j in range(int(cr.integers(6, 20))):
            a += cr.normal(0, 0.4)
            x, y = x + np.cos(a) * 0.06, y + np.sin(a) * 0.06
            sx, sy = ws.to_px((x, y, gh(x, y)))
            ix, iy = int(round(sx)), int(round(sy))
            if 0 <= iy < GH and 0 <= ix < GW and dep[iy, ix] <= x + y + 0.3 and zb[iy, ix] < -1e8:
                img[iy, ix] = img[iy, ix] * 0.45 + np.array([0.2, 0.04, 0.07]) * (0.55 + pulse * 0.6)
    # the eye (landkit eye.py): a true ball, ray-cast along the camera; it bulges up out of its socket, gazing at the sky
    # and a little toward us, so the iris is seen through the cornea's clear dome from the side
    ec, er_ = EYE
    g = gh(ec[0], ec[1])
    Ry = er_ * 0.95
    centre = (ec[0], ec[1], g + Ry * 0.12)
    blink = np.clip(1 - np.abs((T - 0.62) / 0.13), 0, 1) ** 0.8
    gz = np.array([AX[0] * 0.25 + PERP[0] * 0.3, AX[1] * 0.25 + PERP[1] * 0.3, 1.0])
    eyegen.draw(img, zb, dep, ws.to_px, centre, Ry, gz, blink, lts, ws.SUN, seed=3, ambient=0.16, aperture=(0.84, 0.4))
    sx0, sy0 = ws.to_px(centre)
    R = Ry * 18.0 * 0.62
    # the pus runs: out of the lower lid's margin, down the socket's folds over their own surface, into the pool
    toward = POOL[0] - ec
    toward = toward / np.linalg.norm(toward)
    side = np.array([-toward[1], toward[0]])
    for dq in range(4):
        start = ec + toward * Ry * 1.05 + side * (dq - 1.5) * 0.35
        end = POOL[0] - toward * 0.5 + side * (dq - 1.5) * 0.25
        ph = (T * 1.2 + dq * 0.29) % 1.0
        n_ = 60
        for j in range(n_):
            f = j / (n_ - 1)
            q = start + (end - start) * f + side * np.sin(f * 7 + dq) * 0.12
            z = gh(q[0], q[1]) + 0.03
            sx, sy = ws.to_px((q[0], q[1], z))
            ix, iy = int(round(sx)), int(round(sy))
            if not (0 <= iy < GH and 0 <= ix < GW) or dep[iy, ix] > q[0] + q[1] + 0.25 or zb[iy, ix] > q[0] + q[1] + 0.25:
                continue
            fresh = f < ph                                                   # wet behind the drop, a dull trail ahead
            if fresh:
                img[iy, ix] = img[iy, ix] * 0.3 + np.array([0.5, 0.44, 0.2]) * 0.7 * (0.75 + L["moon"][iy, ix] * 0.5)
            elif j % 3 == 0:
                img[iy, ix] = img[iy, ix] * 0.7 + np.array([0.3, 0.26, 0.12]) * 0.3
        q = start + (end - start) * ph + side * np.sin(ph * 7 + dq) * 0.12
        sx, sy = ws.to_px((q[0], q[1], gh(q[0], q[1]) + 0.06))
        ix, iy = int(round(sx)), int(round(sy))
        if 1 <= iy < GH - 1 and 1 <= ix < GW - 1:
            img[iy, ix - 1:ix + 1] = np.array([0.62, 0.56, 0.28])          # the drop itself, swelling as it goes
            img[iy - 1, ix - 1] = np.array([0.9, 0.86, 0.62])
    for q in range(10):                                                  # the pool's bubbles
        ph = (T * 2 + rr.uniform(0, 1)) % 1.0
        a, rd = rr.uniform(0, 2 * np.pi), rr.uniform(0, 0.8)
        x, y = POOL[0][0] + np.cos(a) * rd * POOL[1], POOL[0][1] + np.sin(a) * rd * POOL[2]
        sx, sy = ws.to_px((x, y, gh(x, y)))
        ix, iy = int(round(sx)), int(round(sy))
        if 2 <= iy < GH - 2 and 2 <= ix < GW - 2 and ph < 0.85:
            r = int(1 + ph * 2)
            img[iy - r: iy + 1, ix - r: ix + r + 1] = img[iy - r: iy + 1, ix - r: ix + r + 1] * 0.6 + np.array([0.5, 0.42, 0.22]) * 0.4
            img[iy - r, ix - 1] = np.array([0.9, 0.86, 0.7])
    moon = np.array([-0.62, 0.22, 0.75])
    moon = moon / np.linalg.norm(moon)
    lk = lambda ix, iy: 0.45 + L["moon"][min(iy, GH - 1), min(ix, GW - 1)] * 0.45 + L["lamp"][min(iy, GH - 1), min(ix, GW - 1)] * 1.0
    for (p, hgt, sd) in sorted(SHROOMS, key=lambda q: q[0][0] + q[0][1]):
        fungus.draw_shaggy(img, zb, dep, ws.to_px, (p[0], p[1], gh(p[0], p[1]) - 0.1), hgt, sd, moon, light_at=lk)
    return img


def strands():
    """the mycelium's strands: from every shaggy mane's foot and from the flesh's edge, wandering out over the ash,
    branching; each step above or under the ground; the same strands every frame"""
    rr = np.random.default_rng(404)
    out = []
    starts = [(p, 5) for (p, h, sd) in SHROOMS] + [(EYE[0] + np.array([np.cos(a), np.sin(a)]) * 3.6, 1) for a in np.linspace(0, 6.28, 8)]
    starts += [(f[0] + np.array([np.cos(a), np.sin(a)]) * (f[2] + 1.6), 1) for f in FANGS for a in (1.2,)]
    for (p0, n) in starts:
        for k in range(n):
            x, y = p0[0] + rr.normal(0, 0.2), p0[1] + rr.normal(0, 0.2)
            a = rr.uniform(0, 2 * np.pi)
            pts = []
            for i in range(int(rr.integers(50, 150))):
                a += rr.normal(0, 0.2)
                x, y = x + np.cos(a) * 0.045, y + np.sin(a) * 0.045
                pts.append((x, y))
                if rr.random() < 0.012:                                    # a branch
                    b_a = a + rr.choice([-1, 1]) * rr.uniform(0.5, 1.1)
                    bx, by = x, y
                    bp = []
                    for j in range(int(rr.integers(15, 50))):
                        b_a += rr.normal(0, 0.3)
                        bx, by = bx + np.cos(b_a) * 0.045, by + np.sin(b_a) * 0.045
                        bp.append((bx, by))
                    out.append((np.array(bp), rr.uniform(0, 6.28)))
            out.append((np.array(pts), rr.uniform(0, 6.28)))
    return out


STRANDS = None


def mycelium(img, w, W, px, py, pz, L, T):
    """the mycelium threading in and out of the ground: a pale strand running over the ash with a dark line of shadow
    under it, then diving into the ground through a small dark hole and coming up again further on; a slow glow of
    something travelling along it; its tips creeping"""
    global STRANDS
    if STRANDS is None:
        STRANDS = strands()
    GH, GW = img.shape[:2]
    dep = px + py
    for (pts, ph) in STRANDS:
        n_ = len(pts)
        grow = int(n_ * (0.82 + 0.18 * (0.5 + 0.5 * np.sin(2 * np.pi * T + ph))))   # the tips creeping
        prev_under = True
        for i in range(grow):
            x, y = pts[i]
            under = np.sin(i * 0.13 + ph * 3) < -0.35                      # where it dives into the ground
            g = float(ws.look(W, W["H"], np.array(x), np.array(y)))
            sx, sy = ws.to_px((x, y, g + (0.0 if under else 0.04)))
            ix, iy = int(round(sx)), int(round(sy))
            if not (0 <= iy < GH - 1 and 0 <= ix < GW) or dep[iy, ix] > x + y + 0.3:
                prev_under = under
                continue
            if ws.look(W, W["tag"], np.array(x), np.array(y)) != 0:
                prev_under = under
                continue
            if under != prev_under:
                img[iy, ix] = np.array([0.03, 0.02, 0.02])                  # the hole where it goes in or comes out
                img[iy + 1, ix] = img[iy + 1, ix] * 0.5
            elif not under:
                glow = np.exp(-((((i / max(n_, 1)) - T * 1.0 + ph) % 1.0 - 0.5) / 0.05) ** 2)
                k_ = 0.45 + L["moon"][iy, ix] * 0.45 + L["lamp"][iy, ix] * 1.0
                fade = 1 - i / max(n_, 1) * 0.65                          # thinning as it reaches out
                col = np.array([0.6, 0.58, 0.5]) * k_ * fade + np.array([0.2, 0.25, 0.16]) * glow
                img[iy, ix] = np.clip(img[iy, ix] * (1 - fade * 0.85) + col * 0.85, 0, 1)
                img[iy + 1, ix] = img[iy + 1, ix] * 0.6                    # its shadow on the ground
            prev_under = under
    return img


ws.WOOD_HOOKS += [shape_plan]
ws.BUILD_HOOKS += [stamp]
ws.PAINTERS["tooth"] = paint_tooth
ws.PAINTERS["pylon"] = paint_pylon
ws.PAINTERS["door"] = paint_door
ws.PAINTERS["rwall"] = paint_rwall


def paint_column(img, m, v, n, px, py, pz, o, W, L):
    """a fluted pillar of the forgotten courtyard: drums with their joints, twenty flutes, the break paler and rough,
    ash on the ledges, the flesh climbing its plinth"""
    side = L["side"]
    h = pz - o["base"]
    d = np.hypot(px - o["c"][0], py - o["c"][1])
    ang = np.arctan2(py - o["c"][1], px - o["c"][0])
    shaft = m & (d < 0.52)
    drum = np.floor((h - 0.45) / 0.8)
    jt = ((h - 0.45) / 0.8 - drum) < 0.06
    flute = np.cos(ang * 20) > 0.45
    ndl = np.clip(np.cos(ang - 2.8) * 0.6 + 0.4, 0, 1)                      # round: lit from the moon's side
    sv = 0.18 + ndl * 0.5 + (v - 0.4) * 0.3 - flute * 0.08 + (np.sin(drum * 12.9 + o["h"]) * 0.03)
    img[shaft] = R_STONE[np.clip((sv * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][shaft]
    img[shaft & jt & side] = R_STONE[1]
    brk = shaft & ~side & (h > 0.6)
    img[brk] = R_STONE[np.clip(((v + 0.12) * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][brk]
    pl = m & ~shaft
    img[pl] = R_STONE[np.clip(((v * 0.85 + 0.04) * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][pl]
    ashy = m & ~side & (vn(px * 6, py * 6) > 0.4)
    img[ashy] = img[ashy] * 0.5 + np.array([0.34, 0.32, 0.31]) * 0.5
    reach = 0.3 + vn(ang * 3 + o["h"], 1) * 0.9
    flesh = m & (h < reach) & (vn(px * 5 + o["h"], py * 5 + h * 3) > 0.35)
    img[flesh] = img[flesh] * 0.35 + np.array([0.3, 0.12, 0.15]) * 0.65 * np.clip(v[flesh] + 0.35, 0, 1)[:, None]
    lip = m & (np.abs(h - reach) < 0.05)
    img[lip] = img[lip] * 0.6                                             # its creeping edge
    return img


def paint_drum(img, m, v, n, px, py, pz, o, W, L):
    """a fallen drum of a pillar: round across its length (the moon on its upper flank), its flutes running along it,
    its broken end pale and rough, ash in its grooves, half sunk in the drift"""
    dirv = np.array([np.cos(o["a"]), np.sin(o["a"])])
    along = (px - o["c"][0]) * dirv[0] + (py - o["c"][1]) * dirv[1]
    acr = -(px - o["c"][0]) * dirv[1] + (py - o["c"][1]) * dirv[0]
    th = np.arcsin(np.clip(acr / 0.5, -1, 1))
    zz = np.cos(th)
    nrm = np.dstack([-dirv[1] * np.sin(th), dirv[0] * np.sin(th), zz])
    ndl = np.clip((nrm * ws.SUN).sum(2), 0, 1)
    flute = np.cos(th * 10) > 0.5
    sv = 0.16 + ndl * 0.55 - flute * 0.09 + (v - 0.4) * 0.2
    img[m] = R_STONE[np.clip((sv * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][m]
    end = m & L["side"] & (np.abs(np.abs(along) - (np.abs(along).max() if m.any() else 0)) < 0.06)
    groove = m & flute & (vn(along * 6, th * 3) > 0.5)
    img[groove] = img[groove] * 0.6 + np.array([0.3, 0.29, 0.28]) * 0.4
    return img


ws.PAINTERS["column"] = paint_column
ws.PAINTERS["drum"] = paint_drum
R_RUBBLE = [ws.ramp("#0e0d12", "#1a181e", "#27242a", "#36323a", "#47424a", "#5a5459"),          # basalt
            ws.ramp("#17151d", "#26232c", "#3a3539", "#524b4a", "#6d655d", "#8a8073"),          # pale limestone
            ws.ramp("#130b0c", "#231314", "#341d1b", "#4a2a24", "#5f3a2f", "#764b3a")]          # red tuff


def paint_rubble(img, m, v, n, px, py, pz, o, W, L):
    R = R_RUBBLE[o["fam"]]
    hh = vn(px * 3 + o["fam"] * 7, py * 3) * 0.12
    sv = np.clip(v * 0.95 + hh - 0.04 + L["lamp"] * 0.5, 0, 0.99)
    img[m] = R[np.clip((sv * len(R)).astype(int), 0, len(R) - 1)][m]
    top = m & (n[..., 2] > 0.85) & (vn(px * 7, py * 7) > 0.45)
    img[top] = img[top] * 0.45 + np.array([0.36, 0.35, 0.34]) * 0.55 * np.clip(v[top] + 0.35, 0, 1)[:, None]   # ash on the tops
    lich = m & (vn(px * 13 + 3, py * 13 + pz * 13) > 0.83)
    img[lich] = img[lich] * 0.6 + np.array([0.4, 0.41, 0.37]) * 0.4 * np.clip(v[lich] + 0.3, 0, 1)[:, None]
    if o.get("wall"):
        qa_ = (px - C[0]) * AX[0] + (py - C[1]) * AX[1]
        course = (np.abs(((pz + 0.1) / 0.45) % 1.0) < 0.07) | (np.abs((((qa_ - 1.5) / 0.9) + np.floor((pz + 0.1) / 0.45) * 0.5) % 1.0) < 0.05)
        img[m & course & L["side"]] = img[m & course & L["side"]] * 0.45      # the courses and joints of the dressed blocks
    return img


ws.PAINTERS["rubble"] = paint_rubble
ws.GROUND = ground
ws.FOREST_LIFE = False
ws.LIVING.append(mycelium)
ws.LIVING.append(living_flesh)

VIEW = np.array([1.0, 1.0, 2 * 9 / 21])
VIEW = VIEW / np.linalg.norm(VIEW)


def beam(img, w, W, px, py, pz, L, T):
    """the moon's shaft made visible: the air in it lit (summed along each pixel's line of sight from the surface up to
    the roof), and motes of ash and dust drifting down through it, glinting as they turn"""
    GH, GW = img.shape[:2]
    acc = np.zeros(px.shape)
    for k in range(60):
        s = 0.25 + k * 0.42
        x, y, z = px + VIEW[0] * s, py + VIEW[1] * s, pz + VIEW[2] * s
        acc += shaft(x, y, z) * (z < ZC) * (0.75 + 0.5 * vn(x * 0.7 + T * 0.6, z * 0.7 - y * 0.3))   # the air uneven, drifting
    acc = acc * 0.42
    fall = np.clip(1 - pz / ZC, 0.5, 1)
    img = img + (acc * 0.03 * fall)[..., None] * np.array([0.55, 0.62, 0.78])
    rr = np.random.default_rng(31)
    dep = px + py
    for i in range(170):
        z0 = rr.uniform(0.2, ZC - 0.5)
        z = (z0 - T * rr.uniform(0.6, 1.6) * 1.0) % (ZC - 0.3) + 0.2                  # drifting down, a loop
        a, r = rr.uniform(0, 6.283), np.sqrt(rr.uniform(0, 1)) * HOLE_R * 0.95
        x = HOLE[0] - _SXY[0] * (ZC - z) + np.cos(a) * r + np.sin(T * 6.283 + i) * 0.08
        y = HOLE[1] - _SXY[1] * (ZC - z) + np.sin(a) * r
        sx, sy = ws.to_px((x, y, z))
        ix, iy = int(round(sx)), int(round(sy))
        if not (0 <= iy < GH and 0 <= ix < GW) or dep[iy, ix] > x + y + 0.2:
            continue
        glint = 0.5 + 0.5 * np.sin(T * 6.283 * rr.uniform(2, 5) + i)
        big = rr.random() < 0.15                                             # flakes of ash among the dust
        c = (np.array([0.7, 0.72, 0.78]) if big else np.array([0.8, 0.84, 0.95])) * (0.12 + glint * 0.3) * shaft(x, y, z)
        img[iy, ix] = np.minimum(img[iy, ix] + c, 1)
        if big and ix + 1 < GW:
            img[iy, ix + 1] = np.minimum(img[iy, ix + 1] + c * 0.5, 1)
    return np.clip(img, 0, 1)


def atmosphere(img, w, W, px, py, pz, L, T):
    """one air for the whole cavern: a dim haze deepening with distance, so the far things sink back together, and one
    gentle grade so every material sits in one palette (Derek: "nothing really blends smoothly")"""
    dep = px + py
    dn = (dep - dep.min()) / max(np.ptp(dep), 1e-6)
    a = 0.42 * (1 - dn) ** 1.6
    haze = np.array([0.055, 0.04, 0.05])
    img = img * (1 - a[..., None]) + haze * a[..., None]
    lum = img.mean(2, keepdims=True)
    img = lum + (img - lum) * 0.86                                         # one palette: a little less of each colour's own
    img = img * np.array([1.02, 0.985, 0.97])
    return np.clip(img, 0, 1)


ws.LIVING.append(atmosphere)
ws.LIVING.append(beam)


def still(o, T0=0.0):
    from PIL import Image
    w = ws.Wood()
    for f in ws.WOOD_HOOKS:
        f(w)
    W = ws.build(w)
    for f in ws.BUILD_HOOKS:
        f(W, w)
    ws.settle_hero(W)
    px, py, pz, SX, SY = ws.cast(W)
    L = ws.shade(W, px, py, pz, SX, SY, T0)
    ws.w = w
    img = ws.paint(W, px, py, pz, SX, SY, L, T0)
    img = ws.living(img, w, W, px, py, pz, L, T0)
    big = Image.fromarray((img * 255).astype(np.uint8)).resize((ws.GW * 4, ws.GH * 4), Image.NEAREST)
    ws.the_ossuarch(big, W, px, py).save(o)
    print("saved", o)


if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "flesh_scene.png"
    ws.animate(o) if o.endswith(".webp") else still(o, float(sys.argv[2]) if len(sys.argv) > 2 else 0.0)
