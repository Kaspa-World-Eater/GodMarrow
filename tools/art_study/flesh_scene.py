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
from wood_ecosystem import vn, fbm           # noqa: E402

C = np.array([20.0, 19.0])
AX = np.array([1.0, 1.0]) / np.sqrt(2)       # toward the viewer (down the screen)
PERP = np.array([1.0, -1.0]) / np.sqrt(2)    # across (screen right)
ws.FOCUS = C + AX * 2.6
ws.HERO = C + AX * 8.2 - PERP * 0.8

GATE = C + AX * 0.9                          # the doorway's centre at the swell's foot
GATE_W, PYLON_R, PYLON_H = 3.2, 1.0, 4.6
# the teeth: one row across the back, the gate built into it; its posts are the two greatest fangs
FANGS = [(GATE + AX * 0.15 + PERP * o, h, r, 60 + i) for i, (o, h, r) in enumerate(
    [(-9.6, 3.6, 0.85), (-7.4, 4.6, 1.0), (-4.9, 5.8, 1.2), (-2.75, 7.2, 1.35), (2.75, 7.0, 1.35), (4.9, 6.0, 1.2), (7.4, 4.4, 1.0), (9.6, 3.4, 0.85)])]
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
DRUMS = [(C + AX * 8.9 + PERP * 7.1, 0.5, 1.1), (C + AX * 11.6 + PERP * 6.4, 1.9, 0.9), (C + AX * 6.2 - PERP * 7.4, 2.6, 1.0)]
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
    # the iron doors, fallen ajar into the passage: each a great leaf leaning back
    for sgn in (-1, 1):
        hu = sgn * GATE_W / 2
        a = 0.55
        t = (u - hu) * -sgn * np.cos(a) + r * np.sin(a)
        nrm = -(u - hu) * -sgn * np.sin(a) + r * np.cos(a)
        m = (t > 0) & (t < GATE_W / 2 * 0.95) & (np.abs(nrm) < 0.09) & (r > -0.1)
        hd = gbase + 3.6 - t * 0.6
        mm = m & (hd > H)
        H = np.where(mm, hd, H)
        W["tag"] = np.where(mm, 765 + (sgn > 0), W["tag"])
        W["obj"][765 + (sgn > 0)] = dict(kind="door", base=gbase)
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
    W["thread"] = (spread > -0.08) & (spread <= 0.15)                       # a narrow band where it creeps into the ash
    e = ((X - POOL[0][0]) / POOL[1]) ** 2 + ((Y - POOL[0][1]) / POOL[2]) ** 2
    W["pool"] = (e + (vn(X * 3, Y * 3) - 0.5) * 0.3) < 1
    W["pore"] = np.full(X.shape, 99.0)
    W["doorway"] = (np.abs(u) < GATE_W / 2) & (r > -0.2)
    W["gate_r"] = r
    W["gate_u"] = u
    W["gbase"] = gbase
    ws.LIGHTS.append((GATE[0] - AX[0] * 0.6, GATE[1] - AX[1] * 0.6, gbase + 1.2, 3.2))   # the glow from within the gate


_TILES = {}
ws_T = [0.0]                                 # the loop's time, for the ground's own motion


def ground(img, W, px, py, pz, SX, SY, L, v, gl):
    k = (0.3 + L["moon"][..., None] * 0.85 * np.array([0.86, 0.9, 1.05]) + L["lamp"][..., None] * 1.5 * np.array([1.15, 0.85, 0.55])) * (1 - L["ao"][..., None] * 0.35)
    alb = groundgen.ash(px, py, seed=4)
    qa = (px - C[0]) * AX[0] + (py - C[1]) * AX[1]
    qp = (px - C[0]) * PERP[0] + (py - C[1]) * PERP[1]
    yard = (np.abs(qp) < YARD[0] + (vn(qa * 0.5, 3) - 0.5) * 1.6) & (qa > YARD[1]) & (qa < YARD[2])
    fcol, fh = groundgen.flags(qa, qp, px, py, seed=2)
    drift = fbm(px * 0.45, py * 0.45) > 0.6 - np.clip(np.abs(qp) - 4.5, 0, 3) * 0.08   # ash drifted over the flags
    lay = yard & ~drift
    k = np.where(lay[..., None], k * (1 + fh[..., None] * 2.5), k)
    alb = np.where(lay[..., None], fcol, alb)
    edge_ = yard & drift & (fbm(px * 0.45, py * 0.45) < 0.66 - np.clip(np.abs(qp) - 4.5, 0, 3) * 0.08)
    alb = np.where(edge_[..., None], alb * 0.6 + fcol * 0.4, alb)              # the stones showing through thin ash
    pm = ws.look(W, W["putrid"], px, py) > 0
    pcol, pwet = groundgen.flesh(px, py, seed=1, moon=ws.SUN)
    alb = np.where(pm[..., None], pcol, alb)
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
    out = np.where(deep[..., None], out + np.array([0.26, 0.14, 0.05]) * (glow_ * br_)[..., None], out)
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


def living_flesh(img, w, W, px, py, pz, L, T):
    ws_T[0] = T
    GH, GW = img.shape[:2]
    dep = px + py
    zb = np.full((GH, GW), -1e9)
    lts = [((lx, ly, lz), (0.95, 0.6, 0.32), rch * 1.4) for (lx, ly, lz, rch) in ws.LIGHTS]
    for f in sorted(FG, key=lambda q: q["c"][0] + q["c"][1]):           # the fangs, ray-marched (landkit fang.py)
        fanggen.draw(img, zb, dep, ws.to_px, f, lts, ws.SUN, ambient=0.15)
    gh = lambda x, y: float(ws.look(W, W["H"], np.array(x), np.array(y)))
    on_flesh = ws.look(W, W["putrid"], px, py) > 0
    # the flesh breathes: a slow swell of light and dark rolling across it
    wave = np.sin(T * 2 * np.pi - (px * 0.6 + py * 0.4)) * 0.5 + 0.5
    br = on_flesh & (W["tag"][0, 0] == W["tag"][0, 0]) & (ws.look(W, W["tag"], px, py) == 0)
    img[br] = img[br] * (0.88 + 0.18 * wave[br])[:, None]
    # the gate's arch (landkit bone.py): a great rib of the god laid from fang to fang over the doors, its heads bound
    # to the teeth with old sinew; a skull hung at its keystone, looking out over the courtyard
    gb = W["gbase"]
    pa = GATE + PERP * -2.35 - AX * 0.15
    pb = GATE + PERP * 2.35 - AX * 0.15
    arch = bonegen.rib((pa[0], pa[1], gb + 3.95), (pb[0], pb[1], gb + 3.85), 0.85, 0.42, 0.3, seed=12)
    kp = GATE - AX * 0.02
    sk = bonegen.skull((kp[0], kp[1], gb + 4.55), 0.62, (AX[0] + 0.1, AX[1], -0.35), seed=4)
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
ws.GROUND = ground
ws.FOREST_LIFE = False
ws.LIVING.append(mycelium)
ws.LIVING.append(living_flesh)


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
