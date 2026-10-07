"""The Jaw on the Ashen Moor: the ring of teeth below the Broken Kneeler, at night (Derek 2026-10-07: "pick another place
in Act 1 lore and do it ... more of the god peeking through from now on"). Built on the scene engine (wood_scene.py)
through its hooks, with the Moor's own ground tiles (tiles_moor.py) and its own objects (landkit tooth.py, ...).

THE BRIEF, from the lore (docs/wiki/02-world-and-lore.md; 11-codex-voices.md: the surveyor, the lantern-tenders, the
pilgrim's warnings):
- The Moor is the god's cheek, where it struck first. The surveyor: "The ground swells from the camp to a long rise I
  have marked the Jaw, and falls away steeply past the Broken Kneeler into a hollow"; "the ash is warm under the hand.
  I think the ground draws in with the cold and lets out with the warm, as a face does."
- "You'll pass the ring below the Broken Kneeler. Stones like teeth round a pit of ash, and something under the ash
  that breathes out when you breathe in." The stones ARE teeth: the god's, erupting from the cheek's ash, fangs and
  molars, enamel yellowed and crazed, the gum's flesh swollen round their feet.
- The pit of ash in the ring breathes: the ash lifts and settles, slower than you.
- Black glass where a Husk's blood ran into the ash; the hide showing through where the ash has blown thin (skin with
  pores and coarse hairs).
- The Sighing Lantern stands on its stone past the Stumps, and breathes, in and out, slower than you: the warm light.
- Open sky: no canopy on the Moor. The moon full on the ash.
True scale: teeth 2.5-4.5 yd, the ring about 11 yd across, the pit 6 yd.

  python tools/art_study/moor_scene.py OUT.png|OUT.webp
"""
import os
import sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "landkit"))
import wood_scene as ws                      # noqa: E402
import tiles_moor                            # noqa: E402
import tooth as toothgen                     # noqa: E402
import kneeler as kneelgen                   # noqa: E402
from wood_ecosystem import vn, fbm           # noqa: E402

C = np.array([20.0, 19.0])                   # the pit's heart
AX = np.array([1.0, 1.0]) / np.sqrt(2)       # toward the viewer (down the screen)
PERP = np.array([1.0, -1.0]) / np.sqrt(2)    # across (screen right)
RING_R, PIT_R = 5.4, 3.2
ws.FOCUS = C + AX * 1.4
ws.HERO = C + AX * 6.6 - PERP * 0.6
LANTERN = C + AX * 3.4 - PERP * 7.4
KNEEL_AT = C - AX * 0.6 + PERP * 7.6                # beside the ring on the rise, kneeling toward the pit
KF, KI = kneelgen.kneeler(3, s=1.0)
KNEEL_TURN = float(np.arctan2(*(C - KNEEL_AT)[::-1]))

# the teeth: fangs and molars alternating round the ring, a gap where the road comes in (toward the viewer)
TEETH = []
_rr = np.random.default_rng(5)
for i in range(11):
    a = -np.pi / 2 + (i + 0.5) / 11 * 2 * np.pi + _rr.normal(0, 0.06)
    p_ = C + np.array([np.cos(a), np.sin(a)]) * (RING_R + _rr.uniform(-0.4, 0.4))
    if np.dot(p_ - C, AX) > RING_R * 0.82:                            # the gap at the front: the way in
        continue
    kind = "fang" if i % 3 != 1 else "molar"
    TEETH.append((p_, kind, 50 + i))
TF = [toothgen.tooth(k, s) for (_, k, s) in TEETH]
HIDE_PATCHES = [(C + AX * 5.2 - PERP * 4.6, 2.6, 1.6), (C - AX * 2.0 - PERP * 7.6, 2.0, 1.3), (C + AX * 8.6 + PERP * 1.4, 1.8, 1.1)]
EYE = (C + AX * 7.4 + PERP * 4.9, 1.25, 0.8)                         # "a pool that looks back like an eye"
VEINS = [(C + AX * 9.0 - PERP * 1.5, 0), (C + AX * 6.0 + PERP * 8.0, 1), (C - AX * 3.0 + PERP * 8.5, 2)]
GLASS = [(C + AX * 3.0 - PERP * 3.4, 0.9, 0.5), (C + AX * 7.8 + PERP * 2.0, 0.7, 0.45), (C - AX * 0.8 + PERP * 6.4, 1.1, 0.55)]


def shape_plan(w):
    """the cheek: open ash, no Wood. A long swell rising behind (the Jaw), the pit sunk in the ring's heart"""
    w.trees, w.logs, w.rocks = [], [], []
    w.light = np.ones_like(w.light)                                    # open sky
    w.gap = (-100.0, -100.0, 1.0)                                      # no canopy gap, no shafts
    for name in ("fern", "sapl", "shrooms", "grass", "moss", "bare", "pool"):
        a_ = getattr(w, name, None)
        if isinstance(a_, np.ndarray) and a_.dtype == bool:
            setattr(w, name, np.zeros_like(a_))
        elif isinstance(a_, list):
            setattr(w, name, [])
    q = (w.X - C[0]) * AX[0] + (w.Y - C[1]) * AX[1]
    d = np.hypot(w.X - C[0], w.Y - C[1])
    H = 0.0 * w.H + np.clip(-(q + 3.0) / 12.0, 0, 1) ** 1.5 * 3.5            # the rise behind: the Jaw
    H = H + (fbm(w.X * 0.25, w.Y * 0.25) - 0.5) * 0.8                    # the cheek's swell
    pit = np.clip(1 - d / PIT_R, 0, 1)
    H = H - pit ** 1.6 * 1.3                                             # the pit of ash
    rim = np.exp(-((d - PIT_R) / 0.9) ** 2) * 0.35
    # the jaw's gum: one swollen ridge of flesh under the whole ring of teeth, breaking the ash
    gum = np.exp(-((d - RING_R) / 1.1) ** 2) * 0.55
    w.H = H + rim + gum
    w.wet = np.clip(pit * 0.8, 0, 1)                                     # the pit's mist


def to_tooth(k, x, y):
    c = TEETH[k][0]
    a = TEETH[k][2] * 0.7
    dx, dy = x - c[0], y - c[1]
    return dx * np.cos(a) + dy * np.sin(a), -dx * np.sin(a) + dy * np.cos(a)


def stamp(W, w):
    X, Y = W["X"], W["Y"]
    H = W["H"].copy()
    for k, (F, info) in enumerate(TF):
        lx, ly = to_tooth(k, X, Y)
        inside = (np.abs(lx) < F.half) & (np.abs(ly) < F.half)
        fh = np.where(inside, F.at(F.H, lx, ly), -9.0)
        c = TEETH[k][0]
        base = float(W["H"][int((c[1] - W["y0"]) / ws.RES), int((c[0] - W["x0"]) / ws.RES)]) - 0.25
        m = (fh > 0.0) & (base + fh > H)
        H = np.where(m, base + fh, H)
        W["tag"] = np.where(m, 700 + k, W["tag"])
        W["obj"][700 + k] = dict(kind="tooth", k=k, base=base)
    # the Broken Kneeler, facing the pit
    dx, dy = X - KNEEL_AT[0], Y - KNEEL_AT[1]
    klx, kly = dx * np.cos(KNEEL_TURN) + dy * np.sin(KNEEL_TURN), -dx * np.sin(KNEEL_TURN) + dy * np.cos(KNEEL_TURN)
    inside = (np.abs(klx) < KF.half) & (np.abs(kly) < KF.half)
    kh = np.where(inside, KF.at(KF.H, klx, kly), -9.0)
    kb = float(W["H"][int((KNEEL_AT[1] - W["y0"]) / ws.RES), int((KNEEL_AT[0] - W["x0"]) / ws.RES)]) - 0.3
    mk = (kh > 0.0) & (kb + kh > H)
    H = np.where(mk, kb + kh, H)
    W["tag"] = np.where(mk, 770, W["tag"])
    W["obj"][770] = dict(kind="kneeler", base=kb)
    # the Sighing Lantern's stone: a squat block, a man's waist high
    lx, ly = X - LANTERN[0], Y - LANTERN[1]
    st = (np.abs(lx) < 0.45) & (np.abs(ly) < 0.45)
    g = float(W["H"][int((LANTERN[1] - W["y0"]) / ws.RES), int((LANTERN[0] - W["x0"]) / ws.RES)])
    H = np.where(st, np.maximum(H, g + 0.85 - (np.maximum(np.abs(lx), np.abs(ly)) > 0.38) * 0.05), H)
    W["tag"] = np.where(st, 760, W["tag"])
    W["obj"][760] = dict(kind="lstone", base=g)
    W["H"] = H
    W["Hrest"] = H
    W["HT"] = np.full_like(H, -50.0)
    ws.LIGHTS.append((LANTERN[0], LANTERN[1], g + 1.25, 2.8))
    # where the ground shows the god: hide patches, black glass
    hide = np.zeros(X.shape, bool)
    for (c, ra, rb) in HIDE_PATCHES:
        e = ((X - c[0]) / ra) ** 2 + ((Y - c[1]) / rb) ** 2 + (vn(X * 2.5, Y * 2.5) - 0.5) * 0.6
        hide |= e < 1
    glass = np.zeros(X.shape, bool)
    for (c, ra, rb) in GLASS:
        e = ((X - c[0]) / ra) ** 2 + ((Y - c[1]) / rb) ** 2 + (vn(X * 4, Y * 4) - 0.5) * 0.7
        glass |= e < 1
    W["hide"], W["glass"] = hide & (W["tag"] == 0), glass & (W["tag"] == 0)
    d = np.hypot(X - C[0], Y - C[1])
    dirn = ((X - C[0]) * AX[0] + (Y - C[1]) * AX[1]) / np.maximum(d, 1e-3)
    W["gum"] = (np.abs(d - RING_R) < 1.15 + (vn(X * 1.2, Y * 1.2) - 0.5) * 0.4) & (W["tag"] == 0) & (dirn < 0.8)   # the way in: no gum


_TILES = {}


def ground(img, W, px, py, pz, SX, SY, L, v, gl):
    """the Moor's own ground: the ash tile laid where the world puts it, the hide tile where the ash has blown thin,
    black glass where a Husk's blood ran; lit by the moon and the warm lights"""
    if "ash" not in _TILES:
        _TILES["ash"] = tiles_moor.ash_0(0)[0]
        _TILES["hide"] = tiles_moor.hide_0(0)[0]
    gx = ((px - py) * ws.KX).astype(int)
    gy = ((px + py) * ws.KY).astype(int)
    ash, hide = _TILES["ash"], _TILES["hide"]
    k = (0.3 + L["moon"][..., None] * 0.85 * np.array([0.86, 0.9, 1.05]) + L["lamp"][..., None] * 1.5 * np.array([1.15, 0.85, 0.55])) * (1 - L["ao"][..., None] * 0.35)
    alb = ash[gy % ash.shape[0], gx % ash.shape[1]]
    hm = ws.look(W, W["hide"], px, py) > 0
    alb = np.where(hm[..., None], hide[gy % hide.shape[0], gx % hide.shape[1]], alb)
    # the pit: the ash darker and warmer toward its heart (the flesh below still cooling)
    d = np.hypot(px - C[0], py - C[1])
    pk = np.clip(1 - d / PIT_R, 0, 1) ** 1.2
    alb = alb * (1 - pk[..., None] * 0.35) + np.array([0.2, 0.09, 0.07]) * pk[..., None] * 0.35
    # the gum ridge: the jaw's flesh under the ash, swollen and dark red, ash caked in its folds, wet where the moon finds it
    gmask = ws.look(W, W["gum"], px, py) > 0
    gv = np.clip(v * 0.8 + 0.06 + (vn(px * 6, py * 6) - 0.5) * 0.1, 0, 0.99)
    gcol = toothgen.R_GUM[np.clip((gv * len(toothgen.R_GUM)).astype(int), 0, len(toothgen.R_GUM) - 1)]
    fold = np.abs(np.sin(np.arctan2(py - C[1], px - C[0]) * 40 + vn(px * 2, py * 2) * 5)) < 0.15
    gcol = np.where(fold[..., None], gcol * 0.5 + np.array([0.17, 0.15, 0.15]) * 0.5, gcol)
    ashed = vn(px * 0.9 + 7, py * 0.9) > 0.66                          # ash drifted over the gum in broad tongues
    alb = np.where((gmask & ~ashed)[..., None], gcol / np.maximum(k, 0.3) * 0.9, alb)
    pk2 = np.clip(1 - d / (PIT_R * 0.8), 0, 1)                          # the pit's heart: deep, dark
    alb = alb * (1 - pk2[..., None] * 0.45)
    # the hide's torn edge: the ash lipped up round it, a dark undercut below, its upper rim lit
    hm2 = hm.astype(float)
    from scipy import ndimage as nd_
    near = nd_.binary_dilation(hm, iterations=2) & ~hm
    alb = np.where(near[..., None], alb * 0.55, alb)
    # the veins breaching the ash: raised cords of dark mauve running in from the Moor to the jaw's gum
    for (p0, sd) in VEINS:
        t = np.clip(((px - p0[0]) * (C[0] - p0[0]) + (py - p0[1]) * (C[1] - p0[1])) / np.hypot(*(C - p0)) ** 2, 0, 1)
        qx, qy = p0[0] + (C[0] - p0[0]) * t, p0[1] + (C[1] - p0[1]) * t
        perp = np.array([-(C - p0)[1], (C - p0)[0]]) / np.hypot(*(C - p0))
        wig = np.sin(t * 11 + sd) * 0.35 + np.sin(t * 27 + sd * 2) * 0.1
        dd = (px - qx - perp[0] * wig) * perp[0] + (py - qy - perp[1] * wig) * perp[1]
        dist_c = np.hypot(px - C[0], py - C[1])
        w_ = 0.16 * (1 - t * 0.5)
        cord = (np.abs(dd) < w_) & (dist_c > RING_R + 0.6) & (vn(t * 9 + sd, 1) > 0.25)      # it dives under the ash in places
        top = cord & (dd < -w_ * 0.3)
        alb = np.where(cord[..., None], np.array([0.2, 0.11, 0.16]), alb)
        alb = np.where(top[..., None], np.array([0.38, 0.24, 0.3]), alb)
        sh_ = (np.abs(dd - w_ * 1.3) < w_ * 0.4) & (dist_c > RING_R + 0.6)
        alb = np.where(sh_[..., None], alb * 0.55, alb)
    out = img.copy()
    out[gl] = np.clip(alb * k, 0, 1)[gl]
    # the eye in the ash: lids of hide, a jaundiced white threaded red, a dark wet iris, the pupil, the moon in it
    ec, ea, eb = EYE
    ex = ((px - ec[0]) * PERP[0] + (py - ec[1]) * PERP[1]) / ea
    ey = ((px - ec[0]) * AX[0] + (py - ec[1]) * AX[1]) / eb
    er = np.hypot(ex, ey)
    lid = gl & (er >= 1.0) & (er < 1.4)
    white = gl & (er < 1.0)
    iris = gl & (np.hypot(ex * 1.0, ey * 1.0) < 0.5)
    pupil = gl & (np.hypot(ex, ey) < 0.22)
    out[lid] = np.clip(tiles_moor.HIDE[3] * k[lid] * np.where(ey[lid] < 0, 1.15, 0.6)[:, None], 0, 1)
    out[white] = np.clip(np.array([0.62, 0.56, 0.36]) * k[white] * (0.75 + (1 - er[white]) * 0.3)[:, None], 0, 1)
    vein_e = white & (np.abs(np.sin(np.arctan2(ey, ex) * 8 + er * 5)) < 0.13) & (er > 0.55)
    out[vein_e] = out[vein_e] * 0.5 + np.array([0.45, 0.07, 0.06]) * 0.5
    out[iris] = np.clip(np.array([0.16, 0.13, 0.08]) * k[iris] * 1.2, 0, 1)
    out[pupil] = np.array([0.01, 0.01, 0.015])
    glint = gl & (np.hypot(ex + 0.18, ey + 0.22) < 0.1)
    out[glint] = np.array([0.8, 0.82, 0.86])
    crease = gl & (np.abs(er - 1.0) < 0.06)
    out[crease] = out[crease] * 0.4
    wetg = gl & gmask & ~ashed & (L["moon"] > 0.5) & (vn(px * 15, py * 15) > 0.78)
    out[wetg] = np.minimum(out[wetg] * 1.5 + 0.05, 1)
    gm = gl & (ws.look(W, W["glass"], px, py) > 0)
    glint = gm & (vn(px * 7, py * 7) > 0.72)
    out[gm] = np.array([0.03, 0.025, 0.035])
    out[glint] = np.array([0.42, 0.45, 0.55])
    rimg = gm & ~np.roll(gm, 1, 0)
    out[rimg] = np.array([0.2, 0.2, 0.24])
    return out


def paint_tooth(img, m, v, n, px, py, pz, o, W, L):
    k = o["k"]
    F, info = TF[k]
    lx, ly = to_tooth(k, px, py)
    M = F.at(F.M, lx, ly, 0)
    for step in (0.03, 0.06):
        miss = m & (M == 0)
        if not miss.any():
            break
        ix, iy = to_tooth(k, px - n[..., 0] * step, py - n[..., 1] * step)
        M = np.where(miss, F.at(F.M, ix, iy, 0), M)
    # the light on a tooth, as the form has it: a cone's true round normal (not the height field's flicker between top
    # and side, which breaks into a checker on a steep slope), and the engine's light smoothed across the body so the
    # moon and the lantern turn round it instead of splitting it into two flat halves
    from scipy import ndimage as nd_
    ca = TEETH[k][2] * 0.7
    d_ = np.hypot(lx, ly) + 1e-6
    slope = info["height"] / max(info["R"], 0.3) * 0.62
    nl = np.dstack([lx / d_ * slope, ly / d_ * slope, np.ones_like(lx)])
    nl /= np.linalg.norm(nl, axis=2, keepdims=True)
    nw = np.dstack([nl[..., 0] * np.cos(ca) - nl[..., 1] * np.sin(ca), nl[..., 0] * np.sin(ca) + nl[..., 1] * np.cos(ca), nl[..., 2]])
    moon_an = np.clip((nw * ws.SUN).sum(2), 0, 1)
    mf = m.astype(float)
    vs = nd_.gaussian_filter(v * mf, 2.2) / np.maximum(nd_.gaussian_filter(mf, 2.2), 1e-3)
    v2 = np.where(m, vs * 0.55 + (0.12 + moon_an * 0.62) * 0.45, v)
    return toothgen.paint_tooth(img, m, v2, nw, lx, ly, pz - o["base"], M, info, L["side"])


R_FIELD = ws.ramp("#131218", "#221f27", "#343038", "#48434a", "#5f5958", "#787068")


def paint_lstone(img, m, v, n, px, py, pz, o, W, L):
    sv = np.clip(v * 0.9 + 0.06 + (vn(px * 20, py * 20 + pz * 20) - 0.5) * 0.06, 0, 0.85)
    img[m] = R_FIELD[np.clip((sv * len(R_FIELD)).astype(int), 0, len(R_FIELD) - 1)][m]
    return img


def living_moor(img, w, W, px, py, pz, L, T):
    """the Sighing Lantern breathing on its stone; the pit's ash lifting and settling as it breathes"""
    GH, GW = img.shape[:2]
    dep = px + py
    def put(x, y, z, col, a=1.0):
        sx, sy = ws.to_px((x, y, z))
        ix, iy = int(round(sx)), int(round(sy))
        if 0 <= iy < GH and 0 <= ix < GW and dep[iy, ix] <= x + y + 0.3:
            img[iy, ix] = img[iy, ix] * (1 - a) + np.array(col) * a
    breath = 0.5 + 0.5 * np.sin(T * 6.28)                              # slower than you
    g = W["obj"][760]["base"] + 0.85
    for dz in np.arange(0.0, 0.42, 0.04):                               # the lantern: iron frame, glass, the flame
        for dl in (-0.12, 0.12):
            put(LANTERN[0] + dl * 0.7, LANTERN[1] - dl * 0.7, g + dz, (0.08, 0.07, 0.07))
    for dz in np.arange(0.05, 0.36, 0.04):
        for dl in (-0.06, 0.0, 0.06):
            put(LANTERN[0] + dl * 0.7, LANTERN[1] - dl * 0.7, g + dz, (1.0, 0.72, 0.34), 0.5 + 0.4 * breath)
    put(LANTERN[0], LANTERN[1], g + 0.46, (0.12, 0.1, 0.1))
    # the pit breathes: ash lifting on the out-breath, a low haze over its heart
    rr = np.random.default_rng(11)
    for q in range(60):
        a, r = rr.uniform(0, 2 * np.pi), rr.uniform(0, PIT_R * 0.85)
        x, y = C[0] + np.cos(a) * r, C[1] + np.sin(a) * r
        gz = float(ws.look(W, W["H"], np.array(x), np.array(y)))
        z = gz + breath * rr.uniform(0.1, 0.9) * (1 - r / PIT_R)
        sx, sy = ws.to_px((x, y, z))
        ix, iy = int(round(sx)), int(round(sy))
        if 0 <= iy < GH and 0 <= ix < GW:
            img[iy, ix] = np.minimum(img[iy, ix] * 0.6 + np.array([0.42, 0.4, 0.4]) * 0.4, 1)
    return img


ws.WOOD_HOOKS += [shape_plan]
ws.BUILD_HOOKS += [stamp]
ws.PAINTERS["tooth"] = paint_tooth
ws.PAINTERS["lstone"] = paint_lstone


def paint_kneel(img, m, v, n, px, py, pz, o, W, L):
    dx, dy = px - KNEEL_AT[0], py - KNEEL_AT[1]
    klx, kly = dx * np.cos(KNEEL_TURN) + dy * np.sin(KNEEL_TURN), -dx * np.sin(KNEEL_TURN) + dy * np.cos(KNEEL_TURN)
    M = KF.at(KF.M, klx, kly, 0)
    c, s_ = np.cos(KNEEL_TURN), np.sin(KNEEL_TURN)
    nl = np.dstack([n[..., 0] * c + n[..., 1] * s_, -n[..., 0] * s_ + n[..., 1] * c, n[..., 2]])
    return kneelgen.paint_kneeler(img, m, v, nl, klx, kly, pz - o["base"], M, KI, L["side"])


ws.PAINTERS["kneeler"] = paint_kneel
ws.GROUND = ground
ws.FOREST_LIFE = False                       # no Wood on the Moor: no leaf fall
ws.LIVING.append(living_moor)

if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "moor_scene.png"
    ws.animate(o) if o.endswith(".webp") else ws.main(o)
