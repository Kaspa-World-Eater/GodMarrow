"""Paint the opening cave (cave3d.py's passes) by chapter 12's rules: a dark place lit only by its fires.

The shared painter (paint3d.py) lights a scene by the sky and lays the lamps over it; in a cave there is no sky, so here
the light IS the lamps: every surface's tone comes from the light that truly reaches it (the lamp pass, through the real
forms with their true shadows), stepped down a short ramp, so the stone shows its roughness only where a fire grazes
it and falls to black between the pools (rules 2 and 4). Each source is seen: the wisp-fire's flames are painted at
their lamps, ordinary orange fire (Derek, 2026-10-09; once white-blue wisp-fire), flickering, with a small aura on the stone behind and cold motes rising
(rules 3 and 10). The dark mirrors show what their reflection pass found: the fires again, deep in the walls.

  python tools/landkit3d/paint_cave.py PASSES_DIR OUT.(png|webp) [HERO_X HERO_Y HERO_Z FOCUS_X FOCUS_Y] [--frames 8]
"""
import os
import sys
import math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import paint3d as P3                                   # noqa: E402
from paint3d import R, tone, vn, fbm, B4, _frac        # noqa: E402
from scipy import ndimage as nd                       # noqa: E402

CAM = np.array([-0.612, -0.612, -0.5])                 # the camera's look (game coordinates)
VIEW = -CAM / np.linalg.norm(CAM)
WISP_C = np.array([1.0, 0.62, 0.3])
# the fire's own colours, hot to cool: the white-yellow heart, yellow, orange, the dark orange of the dying tips (never
# red: MASTER_RULES 6)
FL = [np.array(c) / 255.0 for c in ((255, 250, 222), (255, 222, 132), (250, 164, 62), (222, 104, 32), (150, 58, 22))]
LMAX = 30.0                                            # the light that is the ramp's top
ZONES = 6                                              # the bands of a pool of light
EXPO = 0.2                                             # the fires' reach: pools of light, black between (rule 2)
R_CARVED = P3.ramp("#120f0f", "#211c1a", "#332b27", "#473c35", "#5d4f45", "#756455", "#8e7b68", "#a8937d")
R_DUST = P3.ramp("#0e0d10", "#1b191b", "#2a2726", "#3b3734", "#4d4842", "#615a52")
R_OBS = P3.ramp("#030305", "#07070b", "#0c0d13", "#13151d", "#1c2029")


def _hash(a, s=0.0):
    return _frac(np.sin(a * 12.9898 + s * 78.233) * 43758.5453)


def projector(d):
    """the screen position of any world point, fitted to the position pass itself (exact for an ortho camera)"""
    pos, alpha = d["pos"], d["alpha"]
    gh, gw = alpha.shape
    jj, ii = np.nonzero(alpha > 0.5)
    sel = np.linspace(0, len(jj) - 1, min(len(jj), 6000)).astype(int)
    A = np.c_[pos[jj[sel], ii[sel]], np.ones(len(sel))]
    cx, *_ = np.linalg.lstsq(A, ii[sel] + 0.5, rcond=None)
    cy, *_ = np.linalg.lstsq(A, jj[sel] + 0.5, rcond=None)
    def proj(p):
        p = np.atleast_2d(p)
        q = np.c_[p, np.ones(len(p))]
        return q @ cx, q @ cy
    return proj


def flicker(lamps, t):
    """each fire's own breath (loops over t in 0..1): the wisp-fires swell and gutter slowly, never strobe; the pool's
    red breathes slower still"""
    out = []
    for i, L in enumerate(lamps):
        ph = _hash(np.float64(i), 3.0)
        if L[4] > 0.9 and L[5] < 0.3:                                   # the pool's red
            out.append(1.0 + 0.06 * math.sin(2 * math.pi * (t + ph)))
        else:
            out.append(1.0 + 0.15 * math.sin(2 * math.pi * (2 * t + ph)) + 0.09 * math.sin(2 * math.pi * (5 * t + 2 * ph))
                       + 0.06 * math.sin(2 * math.pi * (9 * t + 3 * ph)))
    return np.array(out)


def light_field(d, t):
    """the light at every pixel: the lamp pass, each fire's share flickered by its own breath (its share estimated by
    nearness, the pass carrying the shadows), in lamp-reference units; and the light's own colour"""
    pos = d["pos"]
    L = d["lamp"].astype(np.float64)
    lamps = d["lamps"]
    fk = flicker(lamps, t)
    wsum = np.zeros(pos.shape[:2])
    fsum = np.zeros(pos.shape[:2])
    for i, lp in enumerate(lamps):
        dd = ((pos - lp[:3]) ** 2).sum(2) + 0.3
        w = lp[3] / dd
        wsum += w
        fsum += w * fk[i]
    mult = fsum / (wsum + 1e-9)
    F = fsum / float(d["lamp_ref"])                                      # the falloff, shadows and form aside
    # the render's grain smoothed out of the light (its hue above all: a stray red sample is a red speck)
    L = np.stack([nd.median_filter(L[..., c], size=3) for c in range(3)], axis=2)
    lum = L.max(axis=2)
    zm = float(d["zoom"]) if "zoom" in d else 1.0                  # pixel sizes below were set on the old 4 px grid
    Ls = np.stack([nd.gaussian_filter(L[..., c], 2.0 * zm) for c in range(3)], axis=2)
    hue = Ls / (Ls.max(axis=2, keepdims=True) + 1e-9)
    ref = float(d["lamp_ref"])
    light = lum / ref * mult
    lit = light > 0.05
    c = float(np.median(light[lit] / (F[lit] + 1e-9))) if lit.any() else 1.0
    F = F * c
    return light, hue, fk, F


def spec_glints(d, light, wet):
    """small sharp highlights toward each fire on wet or worn stone (chapter 4: a few glints say "wet" better than any
    texture; chapter 12: the dark's sparkle)"""
    pos, n = d["pos"], d["normal"]
    best = np.zeros(pos.shape[:2])
    for lp in d["lamps"]:
        l = lp[:3] - pos
        dist = np.linalg.norm(l, axis=2) + 1e-6
        l = l / dist[..., None]
        h = l + VIEW
        h /= np.linalg.norm(h, axis=2, keepdims=True)
        s = np.clip((n * h).sum(2), 0, 1) ** 90 * lp[3] / (dist ** 2 + 1.0) / 30.0
        best = np.maximum(best, s)
    return (best > 0.35) & (light > 0.15) & wet


def paint(d, t=0.0):
    n, pos, mat, ao, alpha = d["normal"], d["pos"], d["mat"], d["ao"], d["alpha"]
    obj = d["obj"] if "obj" in d else np.zeros(mat.shape, np.int32)
    gh, gw = mat.shape
    X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
    up = n[..., 2]
    dith = B4[np.arange(gh)[:, None] % 4, np.arange(gw)[None, :] % 4]
    light, hue, fk, F = light_field(d, t)
    amb = float(d["ambient"]) * 0.5 * ao ** 2
    # the light's tone: falls off fast and saturates near the fire (the stone a step from the flame is its lightest)
    # logarithmic, as the eye sees: the turn of a carving toward or from a fire stays readable right beside the flame
    # the light zones defined (Derek: "more defines light zones"; rule 10): the falloff stepped into bands, each wider
    # than the one inside it (equal steps in the log of the light), the edge between two a narrow dither; the form's
    # own turn to the fire and its shadows kept whole inside each band
    # the zones from the light itself, blurred (the pool of light), the form as the light over that blur (the local
    # turn of every surface to its fire): near any fire, at any distance, the form survives inside its band (an estimate
    # of the falloff from the lamps alone saturated the faces flat beside close fires)
    # the falloff from the lamps (it keeps the big shapes: a great face's sockets are not mistaken for the pool's
    # edge), calibrated locally to the light that truly arrives, so beside a close fire it does not saturate the form
    # (kept at 16 px on the 2 x 2 grid on purpose: scaled with the zoom it flattened the faces beside their fires)
    c_loc = (nd.gaussian_filter(light, 16.0) + 0.02) / (nd.gaussian_filter(F, 16.0) + 0.02)
    Fl = F * c_loc
    Fn = np.clip(np.log1p(Fl * EXPO) / np.log1p(LMAX * EXPO), 0, 1) ** 1.15
    Fz = np.floor(Fn * ZONES + (dith - 0.5) * 0.08 + 0.5) / ZONES
    shade = np.clip(light / (Fl + 1e-3), 0, 1.6) ** 1.05
    # the faint fringe of a pool stays continuous (a carving's turn must still read there), the bands crisp above it
    T = np.maximum(Fz, Fn * 0.75) * shade + amb
    # the shadow is not black but the weak light of everything lit nearby (Gurney); the contacts stay darkest
    T = T + 0.075 * np.clip(ao, 0, 1) ** 2
    # quiet darks: the dither only where there is light to step (rule 7)
    dith = np.where(T < 0.16, 0.5, dith)
    oh = _hash(obj.astype(np.float64))                                # each object (each column, each flag) its own
    oh2 = _hash(obj.astype(np.float64), 7.0)
    wall = np.abs(up) < 0.4
    along = np.where(np.abs(n[..., 0]) > np.abs(n[..., 1]), Y, X)
    img = np.zeros((gh, gw, 3))
    wet = np.zeros((gh, gw), bool)
    pool_d = np.hypot(X - 1.0, Y - 0.7)
    for k, name in P3.MAT.items():
        m = mat == k
        if not m.any():
            continue
        tm = T[m]
        if name in ("basalt", "dressed", "carved"):
            # each column its own step of value and its own lean of hue (the cooling made each its own); laid in
            # strokes along the column on the faces, across the tops; a stain by cause (rust running from the joints,
            # pale zeolite in the crevices); the fresh-cut dressed stone a breath lighter and tooled
            tb = tm * (0.78 + 0.42 * oh[m]) + (oh2[m] - 0.5) * 0.04 * np.clip(tm * 4, 0, 1)
            st_w = vn(along[m] * 5.0 + oh[m] * 13, Z[m] * 0.5) - 0.5
            st_t = vn((X[m] + Y[m]) * 3.0 + oh[m] * 7, (X[m] - Y[m]) * 0.8) - 0.5
            tb = tb + np.where(wall[m], st_w, st_t) * 0.16 * np.clip(tm * 2, 0, 1)
            if name == "carved" and False:
                # the chisel: short parallel strokes in the stone's own plane, turning with the surface (each plane
                # worked from its own side), seen only where the light rakes them
                nxm, nym, nzm = n[m][:, 0], n[m][:, 1], n[m][:, 2]
                ang = np.arctan2(nym, nxm) * 2.0 + nzm * 3.0
                cu = X[m] * np.cos(ang) + Y[m] * np.sin(ang) + Z[m] * 0.7
                cv = -X[m] * np.sin(ang) + Y[m] * np.cos(ang) + Z[m] * 0.4
                strokes = (np.abs(_frac(cu * 11.0 + vn(cv * 2.0, cu * 0.5) * 0.8) - 0.5) < 0.16) & (vn(cv * 6.0 + 3, cu * 6.0) > 0.4)
                tb = np.where(strokes & (tm > 0.2), tb - 0.035, tb)
                bite = (vn(X[m] * 23 + Z[m] * 11, Y[m] * 23 - Z[m] * 7) > 0.83) & (tm > 0.25)
                tb = np.where(bite, tb + 0.08, tb)                     # a fresh bite, paler, where the iron struck
            if name == "dressed":
                # gritty (Derek: "give them a bit more grit"), but worn smooth where countless feet have climbed
                wf = np.zeros(int(m.sum()))
                for (x0, y0, x1, y1, hw) in (d["worn"] if "worn" in d else []):
                    dx, dy = x1 - x0, y1 - y0
                    ll = dx * dx + dy * dy + 1e-9
                    tt = np.clip(((X[m] - x0) * dx + (Y[m] - y0) * dy) / ll, 0, 1)
                    dd_ = np.hypot(X[m] - x0 - dx * tt, Y[m] - y0 - dy * tt)
                    wf = np.maximum(wf, np.exp(-(dd_ / hw) ** 2) * (up[m] > 0.6))
                gk = 1.0 - wf * 0.85
                grit = vn(X[m] * 37 + Z[m] * 13, Y[m] * 37 - Z[m] * 11)
                tb = np.where((grit > 0.74) & (tm > 0.12), tb + 0.09 * gk, tb)
                tb = np.where((grit < 0.22) & (tm > 0.08), tb - 0.1 * gk, tb)
                grit2 = vn(X[m] * 71 + 3, Y[m] * 71 + Z[m] * 71)
                tb = np.where((grit2 > 0.8) & (tm > 0.1), tb - 0.06 * gk, tb)
                pit = vn(X[m] * 9 + 5, Y[m] * 9 + Z[m] * 9) > 0.8
                tb = np.where(pit, tb - 0.07 * gk, tb)
                tb = tb + wf * 0.05 * np.clip(tm * 3, 0, 1)             # the worn way a breath paler, matte
            if name == "carved":
                # finished smooth by hand (Derek: "make them smooth like they were hand carved to a smooth finish, to offer
                # contrast to the rough walls"): one even stone, no per-block steps, no strokes, a soft polish. Defined
                # (Derek, 2026-10-09: "the faces to be a little bit more defined"): a steeper turn from the lit planes to
                # the shade, and every crease (the sockets, the lids, the lips, the nostrils) holding its own dark
                # a curve that rolls off in the highlights, so a face beside its fire keeps its brow, nose and lips
                # turning instead of washing out to the ramp's top (the steeper curve blew them to one orange mass)
                tb = 0.92 * np.tanh(np.clip(tm, 0, 3) * 1.15)
                tb = tb * (0.6 + 0.4 * np.clip(ao[m], 0, 1) ** 1.6)
            if name == "dressed":
                tooled = wall[m] & (np.abs(_frac(Z[m] * 8.0 + vn(X[m] * 3, Y[m] * 3) * 0.6) - 0.5) < 0.09)
                tb = np.where(tooled, tb - 0.05 * np.clip(tm * 3, 0, 1), tb) * 1.08
            if name == "carved":
                # the faces are a paler, warmer stone than the rough dark walls, finished smooth (Derek's reference: the
                # carved face light against the dark broken rock round it; his "contrast to the rough walls")
                col = tone(R_CARVED, np.clip(tb * 1.15, 0, 0.999), dith[m], band=0.04)
            else:
                col = tone(R["basalt"], tb * 1.05, dith[m], band=0.1)
            if name == "carved":
                wet[m] = True                                             # the polish takes a highlight of the fire
            # rust weeping down from the joints, in long thin runs
            rust = wall[m] & (vn(along[m] * 7.0 + oh[m] * 31, Z[m] * 0.3) > 0.74) & (oh2[m] > 0.35) & (tm > 0.18)
            col = np.where(rust[:, None], col * 0.55 + tone(R["rust"], tb * 1.2, dith[m]) * 0.45, col)
            # pale mineral in the crevices, where a light finds it
            zeo = (ao[m] < 0.55) & (vn(X[m] * 19 + Z[m] * 7, Y[m] * 19 - Z[m] * 7) > 0.8) & (tm > 0.12)
            col = np.where(zeo[:, None], col * 0.4 + np.array([0.52, 0.55, 0.56]) * (0.35 + tm[:, None]) * 0.6, col)
            # wet near the blood: darker and holding glints
            wz = (pool_d[m] < 5.2) & (Z[m] < 1.0)
            col = np.where(wz[:, None], col * 0.82, col)
            wet[m] = wz                                                  # the steps are not reflective (Derek)
        elif name == "cutrock":
            col = tone(R["basalt"], 0.02 + oh[m] * 0.07 + tm * 0.3, dith[m], band=0.05)
            rimc = np.zeros(m.shape, bool)
            rimc[m] = True
            rim = rimc & ~nd.binary_erosion(rimc, iterations=1)
            col = np.where(rim[m][:, None], tone(R["basalt"], 0.12 + tm * 0.6, dith[m]), col)
        elif name == "pool":
            import blood as BL
            full = np.zeros(m.shape, bool)
            full[m] = True
            # depth from the edge in world terms: 18 px at the old 4 px grid, scaled by the render's zoom (on the 2 x 2 grid
            # the unscaled depth saturated, and the whole pool took the brightest red, flat)
            zm_ = float(d["zoom"]) if "zoom" in d else 1.0
            dep = np.clip(nd.distance_transform_edt(full)[m] / (18.0 * zm_), 0, 1)
            breathe = fk[[i for i, lp in enumerate(d["lamps"]) if lp[4] > 0.9 and lp[5] < 0.3]].mean() if len(d["lamps"]) else 1.0
            lvp = dep * 1.1 * breathe + (fbm(X[m] * 0.8, Y[m] * 0.8) - 0.5) * 0.08 + (dith[m] - 0.5) * 0.1
            # its glow cut well down (Derek: "Reduce the blood glow"): near black, only a dull red heart
            col = np.where((lvp > 0.9)[:, None], BL.C2 * 0.62, np.where((lvp > 0.5)[:, None], BL.C1 * 0.8, BL.C0 * 0.85))
            # the congealed skin at its edge, wrinkling, browner, where it has stood and thickened
            skin_e = dep < 0.22
            wr = np.abs(_frac(vn(X[m] * 2.5, Y[m] * 2.5) * 7.0 + fbm(X[m] * 4, Y[m] * 4) * 2.0) - 0.5) < 0.07
            col = np.where((skin_e & wr)[:, None], BL.C0 * 0.45, np.where(skin_e[:, None], col * 0.75 + np.array([0.07, 0.025, 0.02]) * 0.25, col))
            # where the streams strike: rings spreading, and a pink froth heaving
            for (spx, spy, spz) in (d["spouts"] if "spouts" in d else []):
                dsp = np.hypot(X[m] - spx, Y[m] - spy)
                for rk in range(3):
                    rr_ = ((t * 2 + rk / 3.0) % 1.0) * 1.3
                    ring = (np.abs(dsp - rr_) < 0.035 + 0.02 * rr_) & (vn(X[m] * 9, Y[m] * 9) > 0.3)
                    col = np.where(ring[:, None], col * 0.5 + BL.C2 * 0.6 * (1.2 - rr_ * 0.6), col)
                froth = (dsp < 0.42) & (vn(X[m] * 14 + t * 3, Y[m] * 14 - t * 2) > 0.5 - 0.25 * (1 - dsp / 0.42))
                col = np.where(froth[:, None], np.array([0.42, 0.17, 0.19]) * (0.6 + 0.4 * vn(X[m] * 30, Y[m] * 30))[:, None], col)
            # a slow skin drifting on the blood
            skin = vn(X[m] * 2.2 + t * 0.6, Y[m] * 5.0 - t * 0.3) > 0.74
            col = np.where(skin[:, None], BL.C1 * 0.9 + np.array([0.02, 0.015, 0.02]), col)
            clot = (vn(X[m] * 4.0 + 40, Y[m] * 4.0) > 0.8) & (vn(X[m] * 11.0, Y[m] * 11.0) > 0.4)
            col = np.where(clot[:, None], BL.C0 * 0.7, col)
            img[m] = col
            continue
        elif name == "blood":
            # blood pouring and lying in clots: dark, wet, the flow running down it in lighter strands that move;
            # the clots' tops a skin with a dull sheen
            flow = vn(X[m] * 9.0 + Y[m] * 9.0, Z[m] * 3.0 + t * 8.0)
            tb = tm * 0.9 + np.where(up[m] > 0.6, -0.05, (flow - 0.5) * 0.25 * np.clip(tm * 3, 0, 1))
            col = tone(R["blood"], np.clip(tb, 0, 1) * 1.2, dith[m], band=0.1)
            # wet blood on lit stone: dark red-black, and a sharp glint where the fire catches the run's crown (Derek:
            # the faces' blood must read against the firelit carving)
            crown = (np.abs(n[m][:, 2]) < 0.5) & (tm > 0.5) & (vn(X[m] * 31 + Z[m] * 23, Y[m] * 31) > 0.6)
            col = np.where(crown[:, None], np.array([0.62, 0.2, 0.14]), col)
            wet[m] = True
            img[m] = col
            continue
        elif name == "voidmirror":
            # it reflects nothing but darkness: the deepest black there is in the frame, a faint cold rim at its edge
            full = np.zeros(m.shape, bool)
            full[m] = True
            edge_v = full & ~nd.binary_erosion(full, iterations=2)
            col = np.where(edge_v[m][:, None], np.array([0.05, 0.06, 0.09]) + tm[:, None] * 0.08, np.array([0.006, 0.006, 0.01]))
            img[m] = col
            continue
        elif name == "mirror":
            col = tone(R_OBS, np.clip(tm * 0.6, 0, 0.99), dith[m])        # filled below from the reflection
        elif name == "ash":
            col = tone(R_DUST, tm * 0.95 + (vn(X[m] * 6, Y[m] * 6) - 0.5) * 0.08 * np.clip(tm * 3, 0, 1), dith[m], band=0.1)
        elif name == "rust":
            col = tone(R["rust"], tm * 1.15, dith[m])
            flake = (vn(X[m] * 14.0 + Z[m] * 9.0, Y[m] * 14.0 - Z[m] * 9.0) > 0.7) & (tm > 0.25)
            col = np.where(flake[:, None], tone(R["rust"], tm * 1.15 + 0.22, dith[m]), col)
            wet[m] = True                                             # old metal still takes a glint of the fire
        elif name == "iron":
            # dark iron, the blades and helms: near black, its edges and glints catching the fires (light on dark)
            col = tone(R["iron"], tm * 1.3, dith[m])
            wet[m] = True
        elif name in ("corpse", "cloth") and name in R:
            # the dead (body3d) and their cloaks turned with the five tones of form (MASTER_RULES 0.5c; Derek: "Bodies
            # look bad"): a fire a few yards off lights a body almost evenly, so the turn of every limb and fold is
            # laid over the light it gets, scaled by that light, so the darks stay dark
            import paint_shore as PS
            ft = PS.form_tones(n[m], ao[m], np.ones(int(m.sum())))
            tb = np.clip(tm * (1.0 + 1.8 * ft) + 0.025 * ft, 0, None)
            col = tone(R[name], tb * (0.9 + 0.2 * oh[m]), dith[m])
        elif name in R:
            col = tone(R[name], tm * (0.9 + 0.2 * oh[m]), dith[m])
        elif name == "boxpaint":
            col = tone(R["ochre"], tm, dith[m])
        else:
            col = tone(R["stone"], tm, dith[m])
        # the light's own colour on what it lights: the lit stone takes the fire's hue, the dark keeps the ramp's
        # violet-blue
        s = np.clip(tm * 1.5, 0, 1)[:, None] * 0.8
        hm = hue[m] / (hue[m].max(axis=1, keepdims=True) + 1e-9)
        col = col * (1 - s) + col * hm * 1.25 * s
        # right by the fire the stone goes pale with it
        # (only right beside a flame, and following the form, so a carving's shadows stay dark: the flat wash it was
        # erased the faces in the pool chamber)
        hot = (np.clip((light[m] - 6.0) * 0.06, 0, 0.3) * np.clip(tm * 1.4, 0, 1))[:, None]
        col = col * (1 - hot) + (WISP_C * 0.75 * hm + 0.05) * hot * np.clip(tm * 1.3, 0, 1)[:, None]
        img[m] = col
    img = fine_detail(img, d, T, mat, X, Y, Z, n, ao, up, wall)
    # the weeping (rule 37, ancient): water has seeped from every socket and crevice of the carved and the raw rock for
    # longer than anyone remembers, and run down the face below it, leaving long dark mineral tears, a pale crust at
    # their lips where a fire finds them
    stone = ((mat == 20) | (mat == 27)) & wall
    crev = stone & (ao < 0.42)
    run = np.zeros((gh, gw))
    acc = crev.astype(float)
    colv = vn(np.arange(gw)[None, :] * 0.35 + 0.0 * np.arange(gh)[:, None], np.zeros((gh, gw)) + 3.0)
    for k in range(1, 22):
        acc = np.roll(acc, 1, axis=0) * (0.9 + 0.08 * colv)
        acc[0, :] = 0
        run = np.maximum(run, acc)
    weep = stone & ~crev & (run > 0.45) & (vn(X * 3.0 + Y * 3.0, Z * 0.15) > 0.35)
    img = np.where(weep[..., None], img * 0.62, img)
    lipm = weep & ~np.roll(weep, 1, axis=1) & (T > 0.2)
    img = np.where(lipm[..., None], np.clip(img * 1.0 + np.array([0.05, 0.06, 0.06]) * T[..., None], 0, 1), img)
    # the form's edges where a fire grazes them: the lip toward the light a step up (texture only where light grazes)
    ndf = np.zeros((gh, gw))
    ndf[:-1, :] += np.linalg.norm(n[1:, :] - n[:-1, :], axis=2)
    ndf[:, :-1] += np.linalg.norm(n[:, 1:] - n[:, :-1], axis=2)
    edge = (ndf > 0.55) & (mat != 24) & (mat != 26) & (mat != 28) & (mat != 30)
    up_lip = np.zeros((gh, gw), bool)
    up_lip[1:, :] = T[1:, :] > T[:-1, :] + 0.05
    img = np.where((edge & (T > 0.12))[..., None], np.clip(img * 1.25 + 0.015, 0, 1), img)
    # the carvings defined: their lit lips a step brighter, the far lip of every turn a step darker
    cv_ = (mat == 30)
    # (the hard lit and dark lips on the carvings are gone: Derek saw "a weird orange squish line"; the faces are smooth)
    # glints
    g = spec_glints(d, light, wet)
    img = np.where(g[..., None], np.clip(img * 0.4 + WISP_C * 0.85 * hue / (hue.max(2, keepdims=True) + 1e-9), 0, 1), img)
    # beyond the built walls is the rock itself, seen from above: dark, a step above black (rule 4), never a hole
    img = np.where((alpha > 0.5)[..., None], img, tone(R["basalt"], np.full((gh, gw), 0.1), np.full((gh, gw), 0.5)))
    proj = projector(d)
    img = mirrors(img, d, proj, fk)
    # (the blood holds no reflections: Derek, 2026-10-09, "Remove the reflections from the blood pool"; pool_gloss is kept
    # below, unused)
    img = fires(img, d, proj, fk, t)
    # black is a note, not a fill (rule 4): the darkenings above never take a surface below its ramp's darkest swatch,
    # except in the contacts (the darkest note) and the onyx mirror (black by its nature)
    floor_ = (alpha > 0.5) & (ao > 0.32) & (mat != 31)
    img = np.where(floor_[..., None], np.maximum(img, np.array([0.047, 0.045, 0.058])), img)
    tooth = (vn(X * 31 + Z * 17, Y * 31 - Z * 17) - 0.5) * 0.05 * np.clip(T * 3, 0, 1)
    img = np.clip(img * (1 + tooth[..., None]), 0, 1)
    return img, alpha


def mirrors(img, d, proj, fk):
    """what each dark mirror shows: the reflection pass gives the point it sees; a fire there is a fire in the mirror
    (the fires multiplied into the walls), a lit thing on screen is itself again, darkened by the obsidian; anything the
    frame doesn't hold is black"""
    if "refl" not in d or d["refl"].shape[-1] < 4:
        return img
    refl = d["refl"]
    mm = (d["mat"] == 28)
    if not mm.any():
        return img
    out = img.copy()
    pos = d["pos"]
    gh, gw = mm.shape
    jj, ii = np.nonzero(mm)
    hit = refl[jj, ii, 3] > 0.5
    P_ = refl[jj, ii, :3]
    sx, sy = proj(P_)
    sxi = np.clip(sx.astype(int), 0, gw - 1)
    syi = np.clip(sy.astype(int), 0, gh - 1)
    onscreen = (sx >= 0) & (sx < gw) & (sy >= 0) & (sy < gh)
    same = np.linalg.norm(pos[syi, sxi] - P_, axis=1) < 0.35
    seen = hit & onscreen & same
    col = np.where(seen[:, None], img[syi, sxi] * np.array([0.62, 0.66, 0.74]), 0.0)
    # the fires in the mirror
    for i, lp in enumerate(d["lamps"]):
        if lp[4] > 0.9 and lp[5] < 0.3:
            continue
        size = flame_size(lp[3])
        dd = np.linalg.norm(P_ - lp[:3], axis=1)
        k = hit & (dd < size * 1.6)
        if k.any():
            q = dd[k] / (size * 1.6)
            c = np.where((q < 0.3)[:, None], FL[0], np.where((q < 0.6)[:, None], FL[1], FL[2]))
            col[k] = np.clip(c * 0.95 * fk[i], 0, 1)
    # the obsidian's own: a breath of sheen at the rim toward the light
    base = img[jj, ii]
    out[jj, ii] = np.clip(col + base * 0.5, 0, 1)
    return out


def pool_gloss(img, d, proj, fk, t):
    """the blood's surface is glossy (blood in the dark holds every light): what the reflection pass found in it, the
    wisp-fires broken by the slow skin and dimmed through the red, the lit stone faint; a trembling where the streams
    strike"""
    if "refl" not in d or d["refl"].shape[-1] < 4:
        return img
    mm = d["mat"] == 24
    if not mm.any():
        return img
    out = img.copy()
    pos, refl = d["pos"], d["refl"]
    gh, gw = mm.shape
    jj, ii = np.nonzero(mm)
    hit = refl[jj, ii, 3] > 0.5
    P_ = refl[jj, ii, :3]
    X, Y = pos[jj, ii, 0], pos[jj, ii, 1]
    # the skin breaks the reflection up; the trembling where the streams strike shifts it
    keep = vn(X * 3.0 + t * 0.5, Y * 6.0) < 0.62
    sx, sy = proj(P_)
    sxi = np.clip(sx.astype(int), 0, gw - 1)
    syi = np.clip(sy.astype(int), 0, gh - 1)
    seen = hit & keep & (sx >= 0) & (sx < gw) & (sy >= 0) & (sy < gh) & (np.linalg.norm(pos[syi, sxi] - P_, axis=1) < 0.4)
    add = np.where(seen[:, None], img[syi, sxi] * np.array([0.22, 0.1, 0.11]), 0.0)
    for i, lp in enumerate(d["lamps"]):
        if lp[4] > 0.9 and lp[5] < 0.3:
            continue
        size = flame_size(lp[3])
        dd = np.linalg.norm(P_ - lp[:3], axis=1)
        k = hit & keep & (dd < size * 0.55)
        if k.any():
            # a highlight on a dark liquid keeps the light's own colour: a small glint of the fire
            add[k] = FL[1] * 0.6 * fk[i]
    out[jj, ii] = np.clip(img[jj, ii] + add, 0, 1)
    return out


def flame_size(w):
    return min(0.42, 0.16 + 0.0028 * w)                                 # a candle's, a torch's; a brazier is many tongues


def tongues(w):
    """a brazier burns as a bowl of tongues, a torch or a candle as one"""
    return [(0.0, 1.0)] if w < 150 else [(-1.1, 0.7), (-0.45, 0.95), (0.25, 1.0), (0.9, 0.75), (1.5, 0.55)]


def _tongue_mask(xx, yy, cx, cy, w, h, seed, t):
    """one tongue of fire: a teardrop pointing up, narrower above its middle, its edge ragged by a noise that moves
    with time (a flame's edge is never the same twice)"""
    du = (xx - cx) / (w * 0.5 + 1e-6)
    dv = (cy - yy) / (h * 0.5 + 1e-6)                                    # up is positive
    narrow = np.where(dv > 0, 1.0 - np.clip(dv, 0, 1) * 0.75, 1.0)
    q = np.sqrt((du / np.maximum(narrow, 0.08)) ** 2 + dv ** 2)
    rag = (vn(xx * 0.55 + seed * 7.1, yy * 0.4 + t * 9.0 + seed) - 0.5) * 0.55
    return q, q < 1.0 + rag


def fires(img, d, proj, fk, t):
    """each wisp-fire seen (rule 3), painted as fire is (saint11: "each fire wave starts brighter and on the bottom";
    "the wave top fades in a pointy shape"; "I divide the flame in base and particles ... the base change the shape
    but keeps volume"; "ember flicks and moves slightly"): a bright base that holds its volume; tongues born at the
    base, rising, narrowing to points and tearing off, their edges ragged and never the same twice; white at the heart,
    pale cyan, cold blue, the tips dying violet-blue; embers flicking up and dying within a yard; an aura on the stone
    close behind. Hidden by whatever stands nearer the camera"""
    gh, gw = img.shape[:2]
    pos = d["pos"]
    depth = (pos * CAM).sum(2)
    depth = np.where(d["alpha"] > 0.5, depth, 1e9)
    yy, xx = np.mgrid[0:gh, 0:gw]
    dith = B4[yy % 4, xx % 4]
    out = img.copy()
    zoom = float(d["zoom"]) if "zoom" in d else 1.0
    for i, lp in enumerate(d["lamps"]):
        if lp[4] > 0.9 and lp[5] < 0.3:
            continue                                                     # the pool's glow has no flame
        size = flame_size(lp[3])
        base = lp[:3] - np.array([0, 0, size * 0.55])
        sx, sy = proj(base)
        sx, sy = float(sx[0]), float(sy[0])
        if not (-40 < sx < gw + 40 and -40 < sy < gh + 40):
            continue
        ph = float(_hash(np.float64(i), 5.0))
        brazier = lp[3] >= 150
        hpx = size * 2.4 * 21.0 * zoom * (0.92 + 0.1 * fk[i])
        wpx = max(2.4, size * 1.3 * 25.0 * zoom) * (1.6 if brazier else 1.0)
        ldepth = float((lp[:3] * CAM).sum())
        # a fire hidden from the eye shows no aura either (it lights the stone, which the lamp pass already does)
        lx, ly = proj(lp[:3])
        lxi, lyi = int(np.clip(lx[0], 0, gw - 1)), int(np.clip(ly[0], 0, gh - 1))
        if depth[lyi, lxi] < ldepth - 0.3:
            continue
        # the aura on the stone near it (only on what is truly near the fire), stepped
        r0 = wpx * (2.0 if not brazier else 2.4)
        y0, y1 = int(max(0, sy - hpx * 3.2 - r0)), int(min(gh, sy + r0 * 1.6))
        x0, x1 = int(max(0, sx - r0 * 2.4)), int(min(gw, sx + r0 * 2.4))
        if y1 <= y0 or x1 <= x0:
            continue
        sub = (slice(y0, y1), slice(x0, x1))
        X_, Y_ = xx[sub].astype(float), yy[sub].astype(float)
        cy = sy - hpx * 0.4
        rr = np.hypot(X_ - sx, (Y_ - cy) * 1.15)
        near = np.linalg.norm(pos[sub] - lp[:3], axis=2) < 1.6
        a = np.exp(-(rr / r0) ** 2) * fk[i]
        aq = np.floor(a * 3 + dith[sub] * 0.5) / 3
        out[sub] = np.where((near & (aq > 0))[..., None], np.clip(out[sub] + WISP_C * 0.14 * aq[..., None], 0, 1), out[sub])
        vis = depth[sub] > ldepth - 0.25
        heat = np.zeros(X_.shape)                                        # 0 none, then rising: tip, body, inner, heart
        # the base: holds its volume, its shape breathing
        bw = wpx * (0.6 + 0.08 * math.sin(2 * math.pi * (3 * t + ph)))          # a small hot seat; the tongues carry the shape
        bh = hpx * 0.3
        q, m = _tongue_mask(X_, Y_, sx, sy - bh * 0.45, bw, bh, i, t)
        heat = np.where(m, np.maximum(heat, np.where(q < 0.45, 4, np.where(q < 0.75, 3, 2))), heat)
        # the tongues: born at the base, rising, narrowing, tearing off
        n_t = 7 if brazier else 4
        for k in range(n_t):
            p = (t * (2 + (k % 2)) + k / n_t + ph) % 1.0
            sway = math.sin(2 * math.pi * (p * 0.9 + ph + k * 0.31)) * wpx * 0.42 * p
            off = ((k + 0.5) / n_t - 0.5) * wpx * (1.1 if brazier else 0.75)
            # separate tongues licking up with dark between them, taller, narrowing to points (Derek: "the flames look
            # not great": they had merged into one soft teardrop)
            tw = bw * (0.46 - 0.32 * p) * (0.8 if brazier else 1.0)
            th = hpx * (0.75 + 0.35 * (1 - p))
            tcy = sy - bh * 0.3 - p * hpx * 0.95 - th * 0.35
            q, m = _tongue_mask(X_, Y_, sx + off + sway, tcy, tw, th, i * 13 + k, t)
            hot = np.where(p < 0.35, np.where(q < 0.4, 4, np.where(q < 0.7, 3, 2)),
                           np.where(p < 0.7, np.where(q < 0.5, 3, 2), 1))
            heat = np.where(m, np.maximum(heat, hot), heat)
        cols = [None, FL[4], FL[3], FL[2], FL[1]]
        core = (heat >= 4) & (np.hypot(X_ - sx, (Y_ - (sy - bh * 0.4)) * 0.8) < bw * 0.22)
        draw = (heat > 0) & vis
        layer = out[sub].copy()
        for lv in (1, 2, 3, 4):
            sel = draw & (heat == lv)
            if lv == 1:
                sel &= dith[sub] > 0.35                                  # the dying tips half there: ethereal
            layer = np.where(sel[..., None], cols[lv], layer)
        layer = np.where((core & vis)[..., None], FL[0], layer)
        out[sub] = layer
        # the heat shimmer (the game's fire method, radiant_blaze.gdshader): above and round the fire the scene behind
        # bends a little, in whole pixels, and the air glows a breath warm
        sy0, sy1 = int(min(gh, max(0, sy - hpx * 3.2))), int(min(gh, max(0, sy - hpx * 0.75)))
        sx0, sx1 = int(max(0, sx - wpx * 1.3)), int(min(gw, sx + wpx * 1.3))
        if sy1 > sy0 and sx1 > sx0:
            for yy_ in range(sy0, sy1):
                hgt = (sy - yy_) / (hpx * 3.2)
                amp = (1.0 - hgt) * 1.6
                sh = int(round(math.sin(yy_ * 0.7 + t * 2 * math.pi * 3 + ph * 6) * amp))
                if sh:
                    row = out[yy_, sx0:sx1].copy()
                    out[yy_, sx0:sx1] = np.roll(row, sh, axis=0)
                out[yy_, sx0:sx1] = np.clip(out[yy_, sx0:sx1] + np.array([0.025, 0.012, 0.0]) * (1 - hgt), 0, 1)
        # embers: sparks flicking up from the fire, twinkling, dying within a yard or so
        n_e = 22 if brazier else 11
        for k in range(n_e):
            o1 = float(_hash(np.float64(i * 31 + k), 9.0))
            o2 = float(_hash(np.float64(i * 31 + k), 11.0))
            o3 = float(_hash(np.float64(i * 31 + k), 13.0))
            pe = (t * (1 + (k % 3 == 0)) + o1) % 1.0
            if pe > 0.9:
                continue
            ex = sx + (o2 - 0.5) * wpx * 1.1 + (o3 - 0.5) * wpx * 2.2 * pe + math.sin(2 * math.pi * (pe * 2.5 + o3)) * 1.6
            ey = sy - hpx * 0.6 - pe * 21.0 * zoom * (1.0 + 0.6 * o2)
            mx, my = int(round(ex)), int(round(ey))
            if not (0 <= mx < gw and 0 <= my < gh) or depth[my, mx] <= ldepth - 0.25:
                continue
            if (pe * 9.0 + o1 * 5) % 1.0 < 0.22:
                continue                                                  # it winks out a moment
            out[my, mx] = FL[0] if pe < 0.25 else (FL[1] if pe < 0.55 else FL[3])
            if k % 3 == 0 and pe < 0.5 and my + 1 < gh:
                out[my + 1, mx] = FL[2]                                   # a streak: the spark moving fast
    return out


def main():
    args = [a for a in sys.argv[1:]]
    frames = 1
    if "--frames" in args:
        frames = int(args[args.index("--frames") + 1])
        del args[args.index("--frames"):args.index("--frames") + 2]
    pdir, out = args[0], args[1]
    d = dict(np.load(os.path.join(pdir, "passes.npz")))
    hero = tuple(float(v) for v in args[2:5]) if len(args) > 4 else None
    focus = tuple(float(v) for v in args[5:7]) if len(args) > 6 else (0.0, 0.0)
    ims = []
    for f in range(frames):
        img, alpha = paint(d, f / frames)
        gh, gw = img.shape[:2]
        big = np.repeat(np.repeat(img, 4, 0), 4, 1)
        if hero:
            big = P3.place_hero(big, d, hero, focus, gw, gh)
        ims.append(Image.fromarray((np.clip(big, 0, 1) * 255).astype(np.uint8)))
    if out.endswith(".webp") and frames > 1:
        ims[0].save(out, save_all=True, append_images=ims[1:], duration=90, loop=0, lossless=True)
    else:
        ims[0].save(out)
    print("saved", out)



def _h2(a, b):
    return np.modf(np.abs(np.sin(a * 12.9898 + b * 78.233) * 43758.5453))[0]


def fine_detail(img, d, T, mat, X, Y, Z, n, ao, up, wall):
    """the small life of the rock and the blood (Derek, 2026-10-09: "a lack of fine detail on the rocks and in the
    blood in the cave like where's the lichen and cracks and grit and dust"): hairline cracks with a lit lip where a
    fire grazes them, grit on what faces up, dust settled in the sheltered hollows, pale crusts of lichen in patches on
    the raw basalt; in the blood, clotted flecks, small bubbles and the wrinkles of its skin. All of it scaled by the
    light that reaches it, so it shows only where light grazes (CINEMATOGRAPHY rule 4) and the dark stays quiet"""
    lit = np.clip(T * 2.2, 0, 1)[..., None]
    stone = (mat == 20) | (mat == 26) | (mat == 27)
    raw = (mat == 20) | (mat == 26)
    # cracks: two octaves of hairline, the finer only where the coarse has split the face
    c1 = np.abs(vn(X * 1.7 + Z * 0.9, Y * 1.7 - Z * 0.6) - 0.5) < 0.013
    c2 = (np.abs(vn(X * 4.3 + 7.0, Y * 4.3 + Z * 2.0) - 0.5) < 0.009) & (vn(X * 0.6, Y * 0.6 + Z * 0.4) > 0.45)
    crack = stone & (c1 | c2)
    img = np.where(crack[..., None], img * 0.5, img)
    lip = np.zeros(crack.shape, bool)
    lip[:-1, :] = crack[1:, :] & ~crack[:-1, :]
    img = np.where((lip & stone)[..., None], np.clip(img * (1.0 + 0.22 * lit), 0, 1), img)
    # grit on what faces up: a speckle of light and dark grains, a few hundredths of a yard
    gh_ = _h2(np.floor(X * 26.0), np.floor(Y * 26.0) + np.floor(Z * 26.0) * 0.37)
    flat = stone & (up > 0.55)
    img = np.where((flat & (gh_ > 0.93))[..., None], np.clip(img + 0.07 * lit, 0, 1), img)
    img = np.where((flat & (gh_ < 0.07))[..., None], img * 0.82, img)
    # dust settled where nothing walks and nothing drips: on what faces up, in the sheltered, in soft drifts
    dk = np.clip((vn(X * 0.9 + 3.0, Y * 0.9) - 0.42) * 2.4, 0, 1) * np.clip((ao - 0.5) * 2.5, 0, 1)
    dust = np.array([0.33, 0.3, 0.28]) * np.clip(T * 1.6 + 0.05, 0, 1)[..., None]
    kd = (flat * dk * 0.42)[..., None]
    img = img * (1 - kd) + dust * kd
    # lichen: pale grey-green crusts in patches on the raw basalt, dotted, where any light has ever reached
    patch = (vn(X * 5.2 + Z * 3.1, Y * 5.2 - Z * 1.7) > 0.8) & (vn(X * 0.8, Y * 0.8 + Z * 0.5) > 0.5)
    dots = vn(X * 26.0 + Z * 19.0, Y * 26.0 - Z * 15.0) > 0.52
    lich = raw & patch & dots & (T > 0.04)
    lcol = np.array([0.43, 0.46, 0.37]) * (0.3 + 0.7 * np.clip(T * 1.8, 0, 1))[..., None]
    img = np.where(lich[..., None], img * 0.55 + lcol * 0.45, img)
    # the blood: clotted flecks, small bubbles at the surface, the fine wrinkles of its skin
    pool = (mat == 24) | (mat == 17)
    bh = _h2(np.floor(X * 30.0), np.floor(Y * 30.0))
    img = np.where((pool & (bh < 0.08))[..., None], img * 0.55, img)
    bub = pool & (bh > 0.985) & (up > 0.6)
    img = np.where(bub[..., None], np.clip(img * 1.3 + np.array([0.05, 0.015, 0.015]) * lit, 0, 1), img)
    wr = pool & (np.abs(vn(X * 6.0 + 11.0, Y * 6.0) - 0.5) < 0.02)
    img = np.where(wr[..., None], img * 0.72, img)
    return img


if __name__ == "__main__":
    main()

