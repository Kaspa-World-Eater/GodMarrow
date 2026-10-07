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
TF = [toothgen.tooth("fang", s, height=h, R=r, half=2.6) for (_, h, r, s) in FANGS]
PORE = (C + AX * 9.6 + PERP * 4.6, 1.7)
RUIN = []                                    # the cyst and its ruin: saved for later (Derek)
EYE = (C + AX * 8.4 + PERP * 4.4, 1.7)               # where the cyst was, looking up at the sky
POOL = (C + AX * 10.4 + PERP * 2.6, 1.6, 1.0)
SHROOMS = []                                 # the shaggy manes: kept in fungus.py, to refine as an asset later (Derek)
# the forgotten courtyard: a colonnade of fluted pillars marching to the gate, two rows; broken at every height, the ones
# by the eye snapped low where it broke through the floor; drums fallen across the flags
COLS = []
for _side, _hs in ((-1, (4.6, 2.2, 5.4, 1.4)), (1, (5.0, 3.6, 0.9, 0.6))):
    for _j, _a in enumerate((2.0, 4.7, 7.4, 10.1)):
        COLS.append((C + AX * _a + PERP * _side * 5.8, _hs[_j], 40 + _j + (_side > 0) * 10))
DRUMS = [(C + AX * 8.9 + PERP * 7.1, 0.5, 1.1), (C + AX * 11.6 + PERP * 6.4, 1.9, 0.9), (C + AX * 6.2 - PERP * 7.4, 2.6, 1.0)]
YARD = (7.4, 1.0, 14.5)                       # half-width across, and its extent along the axis
VEIN = [EYE[0] + AX * 1.5 - PERP * 1.6, POOL[0] - AX * 1.6, C + AX * 2.6 - PERP * 1.2, GATE + AX * 1.2]
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
    H = H + 0.55 * np.exp(-((d - EYE[1] * 1.25) / 0.45) ** 2) + folds + wrink - np.clip(1 - d / (EYE[1] * 1.1), 0, 1) * 0.35
    e = ((X - POOL[0][0]) / POOL[1]) ** 2 + ((Y - POOL[0][1]) / POOL[2]) ** 2
    H = H - np.clip(1 - e, 0, 1) * 0.35                                 # the pool's hollow
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
    for k, (F, info) in enumerate(TF):
        lx, ly = to_fang(k, X, Y)
        inside = (np.abs(lx) < F.half) & (np.abs(ly) < F.half)
        fh = np.where(inside, F.at(F.H, lx, ly), -9.0)
        base = gat(FANGS[k][0]) - 0.35
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
    W["gbase"] = gbase


_TILES = {}
ws_T = [0.0]                                 # the loop's time, for the ground's own motion


def ground(img, W, px, py, pz, SX, SY, L, v, gl):
    if "ash" not in _TILES:
        _TILES["ash"] = tiles_moor.ash_0(0)[0]
        _TILES["putrid"] = tiles_moor.putrid_0(0)[0]
    gx = ((px - py) * ws.KX).astype(int)
    gy = ((px + py) * ws.KY).astype(int)
    ash, pu = _TILES["ash"], _TILES["putrid"]
    k = (0.3 + L["moon"][..., None] * 0.85 * np.array([0.86, 0.9, 1.05]) + L["lamp"][..., None] * 1.5 * np.array([1.15, 0.85, 0.55])) * (1 - L["ao"][..., None] * 0.35)
    alb = ash[gy % ash.shape[0], gx % ash.shape[1]]
    alb = alb * 0.55 + ash.reshape(-1, 3).mean(0) * 0.45                    # quiet: open ground stays quiet
    if "flags" not in _TILES:
        import tiles_ruin
        _TILES["flags"] = tiles_ruin.church_flags(seed=0)[0]
    fl = _TILES["flags"]
    qa = (px - C[0]) * AX[0] + (py - C[1]) * AX[1]
    qp = (px - C[0]) * PERP[0] + (py - C[1]) * PERP[1]
    yard = (np.abs(qp) < YARD[0]) & (qa > YARD[1]) & (qa < YARD[2])
    drift = vn(px * 0.7, py * 0.7) > 0.62 + np.clip(np.abs(qp) - 5.5, 0, 2) * -0.2   # ash drifted over the flags
    alb = np.where((yard & ~drift)[..., None], fl[gy % fl.shape[0], gx % fl.shape[1]] * 0.9, alb)
    pm = ws.look(W, W["putrid"], px, py) > 0
    alb = np.where(pm[..., None], pu[gy % pu.shape[0], gx % pu.shape[1]], alb)
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
    sheen = gl & rim & (L["moon"] > 0.55) & (vn(px * 12, py * 12) > 0.66)
    out[sheen] = np.minimum(out[sheen] * 1.6 + 0.06, 1)
    pl = gl & (ws.look(W, W["pool"], px, py) > 0)
    marb = np.sin((px - POOL[0][0]) * 3.0 + vn(px * 1.5, py * 1.5) * 6 + np.sin(py * 2.2) * 2)
    mix = np.clip(marb * 0.5 + 0.5, 0, 1) ** 1.5
    col = np.array([0.66, 0.58, 0.28]) * mix[..., None] + np.array([0.24, 0.03, 0.04]) * (1 - mix[..., None])
    out[pl] = np.clip(col * (0.45 + L["moon"][..., None] * 0.4 + L["lamp"][..., None] * 0.8), 0, 1)[pl]
    gloss = pl & (vn(px * 6 + 3, py * 6) > 0.74)
    out[gloss] = np.minimum(out[gloss] * 1.5 + 0.08, 1)
    crust = gl & ~pl & nd.binary_dilation(pl, iterations=2)                 # the dried crust round it, yellow-brown
    out[crust] = np.clip(np.array([0.36, 0.28, 0.12]) * (0.5 + L["moon"][crust][:, None] * 0.6), 0, 1)
    dr = np.hypot((px - POOL[0][0]) / POOL[1], (py - POOL[0][1]) / POOL[2])
    ring = pl & (np.abs(np.sin(dr * 14 - ws_T[0] * 6.28 * 2)) < 0.08) & (dr < 0.8)
    out[ring] = np.minimum(out[ring] * 1.25, 1)                              # rings spreading where the drops fall
    edge = pl & ~nd.binary_erosion(pl, iterations=2)
    out[edge] = out[edge] * 0.5
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
    gh = lambda x, y: float(ws.look(W, W["H"], np.array(x), np.array(y)))
    on_flesh = ws.look(W, W["putrid"], px, py) > 0
    # the flesh breathes: a slow swell of light and dark rolling across it
    wave = np.sin(T * 2 * np.pi - (px * 0.6 + py * 0.4)) * 0.5 + 0.5
    br = on_flesh & (W["tag"][0, 0] == W["tag"][0, 0]) & (ws.look(W, W["tag"], px, py) == 0)
    img[br] = img[br] * (0.88 + 0.18 * wave[br])[:, None]
    # the gate's arch: a bone spanning the pylons' tops, sagging, cracked; a skull set at its keystone
    gb = W["gbase"]
    cu0, cu1 = -2.4, 2.4                                                  # from fang to fang
    for i in range(160):
        s = i / 159
        uu = cu0 + (cu1 - cu0) * s
        zz = gb + PYLON_H + np.sin(s * np.pi) * 1.1 - 0.15
        p = GATE + PERP * uu - AX * 0.1
        r = 0.55 * (1 - 0.25 * np.sin(s * np.pi))
        sx, sy = ws.to_px((p[0], p[1], zz))
        rx, ry = r * 18, r * 14
        for yy in range(int(sy - ry - 1), int(sy + ry + 2)):
            for xx in range(int(sx - rx - 1), int(sx + rx + 2)):
                if not (0 <= yy < GH and 0 <= xx < GW):
                    continue
                u_, v_ = (xx + 0.5 - sx) / rx, (yy + 0.5 - sy) / ry
                q2 = u_ * u_ + v_ * v_
                if q2 > 1:
                    continue
                d = p[0] + p[1] + np.sqrt(1 - q2) * r
                if d < dep[yy, xx] - 0.2 or d <= zb[yy, xx]:
                    continue
                zb[yy, xx] = d
                lm = max(0.0, -u_ * 0.5 - v_ * 0.6 + np.sqrt(1 - q2) * 0.55)
                val = 0.2 + lm * 0.55 + (vn(s * 50, u_ * 3) - 0.5) * 0.06 - (abs(np.sin(s * 30)) < 0.05) * 0.15
                img[yy, xx] = R_BONE[int(np.clip(val * len(R_BONE), 0, len(R_BONE) - 1))]
    # the keystone skull: a dome, two black sockets, the nasal hole, a row of teeth
    kp = GATE - AX * 0.05
    sx, sy = ws.to_px((kp[0], kp[1], gb + PYLON_H + 1.1 + 0.2))
    for yy in range(int(sy - 11), int(sy + 9)):
        for xx in range(int(sx - 10), int(sx + 11)):
            if not (0 <= yy < GH and 0 <= xx < GW):
                continue
            u_, v_ = (xx + 0.5 - sx) / 10.0, (yy + 0.5 - sy) / 10.0
            if u_ * u_ + (v_ * 1.1) ** 2 > 1:
                continue
            lm = max(0.0, -u_ * 0.5 - v_ * 0.6 + 0.5)
            col = R_BONE[int(np.clip((0.3 + lm * 0.55) * len(R_BONE), 0, len(R_BONE) - 1))]
            if np.hypot(abs(u_) - 0.38, v_ - 0.05) < 0.2:
                col = np.array([0.01, 0.0, 0.0])
            if np.hypot(u_, v_ - 0.35) < 0.1:
                col = np.array([0.03, 0.01, 0.01])
            if v_ > 0.6 and abs(u_) < 0.45:
                col = R_BONE[6] if (xx % 2) else R_BONE[2]
            img[yy, xx] = col
            zb[yy, xx] = 1e9
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
    # the vein: up out of the ground and under again, pulses running along it to the gate
    n_ = len(VP)
    for i in range(n_):
        s = i / (n_ - 1)
        lift = max(0.0, np.sin(s * np.pi * 3.5 + 0.4)) * 0.26        # humping out of the ground, never floating
        if lift <= 0.02:
            continue
        x, y = VP[i]
        g = gh(x, y)
        pulse = np.exp(-((((s * 6 - T * 2) % 1.0) - 0.5) / 0.08) ** 2)
        r = 0.2 * (1 + 0.45 * pulse)
        z = g + lift
        sx, sy = ws.to_px((x, y, z))
        rx, ry = r * 18, r * 15
        for yy in range(int(sy - ry - 1), int(sy + ry + 2)):
            for xx in range(int(sx - rx - 1), int(sx + rx + 2)):
                if not (0 <= yy < GH and 0 <= xx < GW):
                    continue
                u_, v_ = (xx + 0.5 - sx) / rx, (yy + 0.5 - sy) / ry
                q2 = u_ * u_ + v_ * v_
                if q2 > 1:
                    continue
                d = x + y + np.sqrt(1 - q2) * r
                if v_ * r + (z - r) * 0 > (lift - 0.05) * 1.0 and v_ > 0.4 and lift < r:
                    continue
                if d < dep[yy, xx] - 0.25 or d <= zb[yy, xx]:
                    continue
                zb[yy, xx] = d
                lm = max(0.0, -u_ * 0.6 - v_ * 0.6 + np.sqrt(1 - q2) * 0.5)
                col = np.array([0.12, 0.03, 0.07]) + np.array([0.22, 0.05, 0.08]) * lm + np.array([0.3, 0.03, 0.04]) * pulse * 0.8
                if v_ < -0.55 and u_ < 0:
                    col = col + 0.12
                img[yy, xx] = np.clip(col * (0.6 + L["lamp"][yy, xx] * 1.2 + L["moon"][yy, xx] * 0.4), 0, 1)
    # the eye, three-dimensional, bulging from its socket; its slow pus-filled blink
    ec, er_ = EYE
    g = gh(ec[0], ec[1])
    sx0, sy0 = ws.to_px((ec[0], ec[1], g + er_ * 0.95))            # it swells up out of its socket
    R = er_ * 18.0
    blink = np.clip(1 - np.abs((T - 0.62) / 0.13), 0, 1) ** 0.8
    # the eye is an almond lying in its folds, seen a little from the side, gazing up at the sky: the iris sits high on
    # the ball, foreshortened to an ellipse; over it the cornea bulges, clear as glass, so the iris is seen through the
    # fluid (a band of refraction at its edge, the wet gloss on its dome, the sky's cold light caught in it)
    for yy in range(int(sy0 - R - 2), int(sy0 + R + 2)):
        for xx in range(int(sx0 - R - 2), int(sx0 + R + 2)):
            if not (0 <= yy < GH and 0 <= xx < GW):
                continue
            u_, v_ = (xx + 0.5 - sx0) / R, (yy + 0.5 - sy0) / (R * 0.82)
            almond = 0.74 * max(0.0, 1 - u_ * u_) ** 0.5                    # the lids' opening, stretched over the bulge
            q2 = u_ * u_ + (v_ / 1.0) ** 2
            if q2 > 1.15 or abs(u_) > 1:
                continue
            nz = np.sqrt(max(0.0, 1 - min(q2, 1)))
            upper = -almond + blink * almond * 2.05                        # the upper lid comes down over it all in the blink
            lower = almond
            if v_ < upper:                                                 # the upper lid: heavy hide, its folds above
                dl = upper - v_
                fold = abs(np.sin(dl * 11 + u_ * 1.5)) < 0.2
                col = np.array([0.32, 0.17, 0.18]) * (0.45 + nz * 0.6 + np.clip(0.25 - dl, 0, 0.25)) * (0.7 if fold else 1.0)
                if v_ > upper - 0.1:
                    col = np.array([0.66, 0.58, 0.28]) * (0.8 + nz * 0.3)   # pus crusted on its margin
                    if (xx * 7 + yy * 3) % 5 == 0:
                        col = np.array([0.08, 0.05, 0.05])                  # coarse hairs along the margin
            elif v_ > lower:                                               # the lower lid: swollen, raw
                col = np.array([0.45, 0.14, 0.15]) * (0.5 + nz * 0.6)
                if v_ < lower + 0.08:
                    col = np.array([0.72, 0.62, 0.3])                       # pus welling along it
            else:
                ic = np.array([0.05, -0.3])                                # the iris high on the ball (it looks up)
                du, dv = (u_ - ic[0]) / 0.42, (v_ - ic[1]) / 0.24          # foreshortened: an ellipse
                ir = np.hypot(du, dv)
                lm = max(0.0, -u_ * 0.55 - v_ * 0.55 + nz * 0.8) ** 1.3          # a ball: strong round falloff
                if ir < 0.33:
                    col = np.array([0.01, 0.01, 0.015])                    # the pupil
                elif ir < 1.0:
                    ang_ = np.arctan2(dv, du)
                    stri = 0.85 + 0.25 * (abs(np.sin(ang_ * 18 + ir * 3)) > 0.6)   # the iris's fibres, radiating
                    col = np.array([0.32, 0.22, 0.09]) * (0.55 + lm * 0.55) * stri
                    if ir > 0.85:
                        col = col * 0.6                                     # its dark limbal ring
                else:
                    yel = np.clip((abs(u_) + abs(v_)) / 1.2, 0, 1)
                    lm = lm * (0.55 + 0.45 * np.clip((v_ - upper) / 0.35, 0, 1))      # the lid's shadow on the ball
                    col = (np.array([0.8, 0.76, 0.64]) * (1 - yel) + np.array([0.6, 0.5, 0.22]) * yel) * (0.35 + lm * 0.75)
                    ang2 = np.arctan2(v_ - ic[1], u_ - ic[0])
                    if ir > 1.3 and abs(np.sin(ang2 * 6 + np.sin(ir * 3) * 1.5)) < 0.09:
                        col = col * 0.45 + np.array([0.55, 0.05, 0.05]) * 0.55   # bloodshot threads
                # the cornea: a clear dome over the iris; through it the iris (above), at its edge the refraction band,
                # on it the gloss and the sky
                if ir < 1.18:
                    edge = np.clip((ir - 0.95) / 0.23, 0, 1)
                    col = col * (1 - 0.35 * edge) + np.array([0.55, 0.6, 0.68]) * 0.35 * edge   # the fresnel rim, cold sky
                    if 0.98 < ir < 1.08:
                        col = col * 0.7                                     # the refraction line where dome meets white
                    if np.hypot(du + 0.35, dv + 0.45) < 0.22:
                        col = np.array([0.95, 0.96, 0.98])                  # the gloss on the dome
                    elif np.hypot(du - 0.4, dv - 0.35) < 0.12:
                        col = col * 0.6 + np.array([0.7, 0.75, 0.8]) * 0.4   # a second, faint reflection
            if upper < v_ < lower and lower - v_ < 0.07:
                col = col * 0.7 + np.array([0.8, 0.78, 0.7]) * 0.3            # the wet line along the lower lid
            img[yy, xx] = np.clip(col * (0.7 + L["lamp"][yy, xx] * 0.9), 0, 1)
    for dq in range(3):                                                  # the pus dripping into the pool
        u0 = -0.3 + dq * 0.3
        ph = (T * 1.5 + dq * 0.37) % 1.0
        x0, y0 = int(sx0 + u0 * R), int(sy0 + R * 0.75)
        tx, ty = ws.to_px((POOL[0][0] - 0.4 + dq * 0.3, POOL[0][1] - 0.3, gh(POOL[0][0], POOL[0][1])))
        for j in range(int(ph * 14)):
            f = j / 14
            jx, jy = int(x0 + (tx - x0) * f), int(y0 + (ty - y0) * f)
            if 0 <= jy < GH and 0 <= jx < GW:
                img[jy, jx] = np.array([0.6, 0.53, 0.26]) * (0.8 + 0.2 * (j % 2))
        jx, jy = int(x0 + (tx - x0) * ph), int(y0 + (ty - y0) * ph) + 1
        if 0 <= jy < GH and 0 <= jx < GW:
            img[jy, jx] = np.array([0.82, 0.74, 0.4])
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
    flesh = m & (h < 0.5 + vn(ang * 3 + o["h"], 1) * 0.9)
    img[flesh] = img[flesh] * 0.3 + np.array([0.3, 0.12, 0.15]) * 0.7 * np.clip(v[flesh] + 0.35, 0, 1)[:, None]
    return img


def paint_drum(img, m, v, n, px, py, pz, o, W, L):
    dirv = np.array([np.cos(o["a"]), np.sin(o["a"])])
    acr = -(px - o["c"][0]) * dirv[1] + (py - o["c"][1]) * dirv[0]
    flute = np.cos(np.arcsin(np.clip(acr / 0.5, -1, 1)) * 10) > 0.45
    sv = np.clip(v * 0.9 + 0.05 - flute * 0.08, 0, 0.85)
    img[m] = R_STONE[np.clip((sv * len(R_STONE)).astype(int), 0, len(R_STONE) - 1)][m]
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
