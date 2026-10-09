"""Paint the opening cave (cave3d.py's passes) by chapter 12's rules: a dark place lit only by its fires.

The shared painter (paint3d.py) lights a scene by the sky and lays the lamps over it; in a cave there is no sky, so here
the light IS the lamps: every surface's tone comes from the light that truly reaches it (the lamp pass, through the real
forms with their true shadows), stepped down a short ramp, so the stone shows its roughness only where a fire grazes
it and falls to black between the pools (rules 2 and 4). Each source is seen: the wisp-fire's flames are painted at
their lamps, white-blue, flickering and ethereal (Derek), with a small aura on the stone behind and cold motes rising
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
WISP_C = np.array([0.62, 0.80, 1.0])
# the wisp-fire's own colours, hot to cool: white heart, pale cyan, the cold blue body, its dying edge
FL = [np.array(c) / 255.0 for c in ((246, 251, 255), (204, 236, 255), (140, 200, 255), (84, 148, 245), (46, 88, 200))]
LMAX = 30.0                                            # the light that is the ramp's top
EXPO = 0.3                                             # the fires' reach: pools of light, black between (rule 2)
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
            out.append(1.0 + 0.11 * math.sin(2 * math.pi * (2 * t + ph)) + 0.06 * math.sin(2 * math.pi * (5 * t + 2 * ph))
                       + 0.04 * math.sin(2 * math.pi * (9 * t + 3 * ph)))
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
    # the render's grain smoothed out of the light (its hue above all: a stray red sample is a red speck)
    L = np.stack([nd.median_filter(L[..., c], size=3) for c in range(3)], axis=2)
    lum = L.max(axis=2)
    Ls = np.stack([nd.gaussian_filter(L[..., c], 2.0) for c in range(3)], axis=2)
    hue = Ls / (Ls.max(axis=2, keepdims=True) + 1e-9)
    ref = float(d["lamp_ref"])
    return lum / ref * mult, hue, fk


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
    light, hue, fk = light_field(d, t)
    amb = float(d["ambient"]) * 0.5 * ao ** 2
    # the light's tone: falls off fast and saturates near the fire (the stone a step from the flame is its lightest)
    # logarithmic, as the eye sees: the turn of a carving toward or from a fire stays readable right beside the flame
    T = np.clip(np.log1p(light * EXPO) / np.log1p(LMAX * EXPO), 0, 1) ** 1.15 + amb
    # the shadow is not black but the weak light of everything lit nearby (Gurney); the contacts stay darkest
    T = T + 0.09 * np.clip(ao, 0, 1) ** 2
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
        if name in ("basalt", "dressed"):
            # each column its own step of value and its own lean of hue (the cooling made each its own); laid in
            # strokes along the column on the faces, across the tops; a stain by cause (rust running from the joints,
            # pale zeolite in the crevices); the fresh-cut dressed stone a breath lighter and tooled
            tb = tm * (0.78 + 0.42 * oh[m]) + (oh2[m] - 0.5) * 0.04 * np.clip(tm * 4, 0, 1)
            st_w = vn(along[m] * 5.0 + oh[m] * 13, Z[m] * 0.5) - 0.5
            st_t = vn((X[m] + Y[m]) * 3.0 + oh[m] * 7, (X[m] - Y[m]) * 0.8) - 0.5
            tb = tb + np.where(wall[m], st_w, st_t) * 0.16 * np.clip(tm * 2, 0, 1)
            if name == "dressed":
                tooled = wall[m] & (np.abs(_frac(Z[m] * 8.0 + vn(X[m] * 3, Y[m] * 3) * 0.6) - 0.5) < 0.09)
                tb = np.where(tooled, tb - 0.05 * np.clip(tm * 3, 0, 1), tb) * 1.08
            col = tone(R["basalt"], tb * 1.05, dith[m], band=0.1)
            # rust weeping down from the joints, in long thin runs
            rust = wall[m] & (vn(along[m] * 7.0 + oh[m] * 31, Z[m] * 0.3) > 0.74) & (oh2[m] > 0.35) & (tm > 0.18)
            col = np.where(rust[:, None], col * 0.55 + tone(R["rust"], tb * 1.2, dith[m]) * 0.45, col)
            # pale mineral in the crevices, where a light finds it
            zeo = (ao[m] < 0.55) & (vn(X[m] * 19 + Z[m] * 7, Y[m] * 19 - Z[m] * 7) > 0.8) & (tm > 0.12)
            col = np.where(zeo[:, None], col * 0.4 + np.array([0.52, 0.55, 0.56]) * (0.35 + tm[:, None]) * 0.6, col)
            # wet near the blood: darker and holding glints
            wz = (pool_d[m] < 5.2) & (Z[m] < 1.0)
            col = np.where(wz[:, None], col * 0.82, col)
            wet[m] = wz | ((name == "dressed") & (up[m] > 0.8) & (vn(X[m] * 0.6, Y[m] * 0.6) > 0.55))
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
            dep = np.clip(nd.distance_transform_edt(full)[m] / 18.0, 0, 1)
            breathe = fk[[i for i, lp in enumerate(d["lamps"]) if lp[4] > 0.9 and lp[5] < 0.3]].mean() if len(d["lamps"]) else 1.0
            lvp = dep * 1.1 * breathe + (fbm(X[m] * 0.8, Y[m] * 0.8) - 0.5) * 0.08 + (dith[m] - 0.5) * 0.1
            # it glows from its depths, the room's one subject (rule 1): the heart a hot red, held short of ketchup
            col = np.where((lvp > 0.95)[:, None], BL.C3 * 0.9, np.where((lvp > 0.62)[:, None], BL.C2, np.where((lvp > 0.3)[:, None], BL.C1 * 1.15, BL.C0)))
            # a slow skin drifting on the blood
            skin = vn(X[m] * 2.2 + t * 0.6, Y[m] * 5.0 - t * 0.3) > 0.74
            col = np.where(skin[:, None], BL.C1 * 1.35 + np.array([0.03, 0.03, 0.05]), col)
            clot = (vn(X[m] * 4.0 + 40, Y[m] * 4.0) > 0.8) & (vn(X[m] * 11.0, Y[m] * 11.0) > 0.4)
            col = np.where(clot[:, None], BL.C0 * 0.7, col)
            img[m] = col
            continue
        elif name == "mirror":
            col = tone(R_OBS, np.clip(tm * 0.6, 0, 0.99), dith[m])        # filled below from the reflection
        elif name == "ash":
            col = tone(R_DUST, tm * 0.95 + (vn(X[m] * 6, Y[m] * 6) - 0.5) * 0.08 * np.clip(tm * 3, 0, 1), dith[m], band=0.1)
        elif name in ("rust", "iron"):
            col = tone(R["rust"], tm * 1.15, dith[m])
            flake = (vn(X[m] * 14.0 + Z[m] * 9.0, Y[m] * 14.0 - Z[m] * 9.0) > 0.7) & (tm > 0.25)
            col = np.where(flake[:, None], tone(R["rust"], tm * 1.15 + 0.22, dith[m]), col)
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
        hot = np.clip((light[m] - 1.6) * 0.25, 0, 0.45)[:, None]
        col = col * (1 - hot) + (WISP_C * 0.75 * hm + 0.05) * hot
        img[m] = col
    # the form's edges where a fire grazes them: the lip toward the light a step up (texture only where light grazes)
    ndf = np.zeros((gh, gw))
    ndf[:-1, :] += np.linalg.norm(n[1:, :] - n[:-1, :], axis=2)
    ndf[:, :-1] += np.linalg.norm(n[:, 1:] - n[:, :-1], axis=2)
    edge = (ndf > 0.55) & (mat != 24) & (mat != 26) & (mat != 28)
    up_lip = np.zeros((gh, gw), bool)
    up_lip[1:, :] = T[1:, :] > T[:-1, :] + 0.05
    img = np.where((edge & (T > 0.12))[..., None], np.clip(img * 1.25 + 0.015, 0, 1), img)
    # glints
    g = spec_glints(d, light, wet)
    img = np.where(g[..., None], np.clip(img * 0.4 + WISP_C * 0.85 * hue / (hue.max(2, keepdims=True) + 1e-9), 0, 1), img)
    # beyond the built walls is the rock itself, seen from above: dark, a step above black (rule 4), never a hole
    img = np.where((alpha > 0.5)[..., None], img, tone(R["basalt"], np.full((gh, gw), 0.1), np.full((gh, gw), 0.5)))
    proj = projector(d)
    img = mirrors(img, d, proj, fk)
    img = fires(img, d, proj, fk, t)
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
            c = np.where((q < 0.35)[:, None], FL[1], np.where((q < 0.65)[:, None], FL[2], FL[3]))
            col[k] = c * 0.8 * fk[i]
    # the obsidian's own: a breath of sheen at the rim toward the light
    base = img[jj, ii]
    out[jj, ii] = np.clip(col + base * 0.5, 0, 1)
    return out


def flame_size(w):
    return min(0.42, 0.16 + 0.0028 * w)                                 # a candle's, a torch's; a brazier is many tongues


def tongues(w):
    """a brazier burns as a bowl of tongues, a torch or a candle as one"""
    return [(0.0, 1.0)] if w < 150 else [(-1.1, 0.7), (-0.45, 0.95), (0.25, 1.0), (0.9, 0.75), (1.5, 0.55)]


def fires(img, d, proj, fk, t):
    """each wisp-fire seen (rule 3): a flame painted at its lamp, white at the heart and cold blue at the edge,
    swaying and flickering on its own breath, its tongues tearing off; a small aura on the stone close behind it; cold
    motes rising and dying within a yard. Hidden by whatever stands nearer the camera"""
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
        if not (-30 < sx < gw + 30 and -30 < sy < gh + 30):
            continue
        ph = float(_hash(np.float64(i), 5.0))
        hpx = size * 2.4 * 21.0 * zoom * (0.9 + 0.12 * math.sin(2 * math.pi * (3 * t + ph)) + 0.06 * math.sin(2 * math.pi * (7 * t + ph * 2)))
        wpx = max(2.2, size * 1.3 * 25.0 * zoom)
        ldepth = float((lp[:3] * CAM).sum())
        # the aura on the stone near it (only on what is truly near the fire), stepped
        r0 = wpx * (2.2 if lp[3] < 150 else 3.4)
        y0, y1 = int(max(0, sy - hpx - r0 * 2)), int(min(gh, sy + r0 * 2))
        x0, x1 = int(max(0, sx - r0 * 2.5)), int(min(gw, sx + r0 * 2.5))
        if y1 <= y0 or x1 <= x0:
            continue
        sub = (slice(y0, y1), slice(x0, x1))
        cy = sy - hpx * 0.4
        rr = np.hypot(xx[sub] - sx, (yy[sub] - cy) * 1.15)
        near = np.linalg.norm(pos[sub] - lp[:3], axis=2) < 1.6
        a = np.exp(-(rr / r0) ** 2) * fk[i]
        aq = np.floor(a * 3 + dith[sub] * 0.5) / 3
        out[sub] = np.where((near & (aq > 0))[..., None], np.clip(out[sub] + WISP_C * 0.16 * aq[..., None], 0, 1), out[sub])
        # the air's own glow round the flame (the ethereal: the fire hangs in a breath of its own light)
        a2 = np.exp(-(rr / (wpx * 1.4)) ** 2)
        a2q = (a2 > 0.35 + dith[sub] * 0.3) & (depth[sub] > ldepth - 0.2)
        out[sub] = np.where(a2q[..., None], np.clip(out[sub] * 0.7 + FL[3] * 0.45, 0, 1), out[sub])
        # the flame (a brazier's many tongues, each on its own breath)
        vis = depth[sub] > ldepth - 0.25
        for q_, (ox, hs) in enumerate(tongues(lp[3])):
            ph2 = ph + q_ * 0.37
            hq = hpx * hs * (0.85 + 0.2 * math.sin(2 * math.pi * (3 * t + ph2)))
            v = (sy - yy[sub]) / hq                                      # 0 at its foot, 1 at its tip
            sway = (0.55 * math.sin(2 * math.pi * (2 * t + ph2)) + 0.3 * math.sin(2 * math.pi * (5 * t + ph2 * 3))) * wpx * 0.35
            u = (xx[sub] - sx - ox * wpx - sway * np.clip(v, 0, 1) ** 1.5) / wpx
            width = np.where((v > 0) & (v < 1), np.sin(np.pi * np.clip(v, 0, 1) ** 0.65) * (1 - np.clip(v, 0, 1)) ** 0.25 * 0.55, 0)
            q = np.abs(u) / (width + 1e-6)
            inside = (q < 1.0) & (width > 0.02)
            c = np.where((q < 0.3)[..., None] & (v < 0.55)[..., None], FL[0],
                         np.where((q < 0.55)[..., None], FL[1], np.where((q < 0.8)[..., None], FL[2], FL[3])))
            edge = (q > 0.8) & (dith[sub] > 0.5)                         # the edge half there: ethereal
            draw = inside & vis
            out[sub] = np.where((draw & ~edge)[..., None], c, np.where((draw & edge)[..., None], out[sub] * 0.4 + FL[3] * 0.6, out[sub]))
        # a tongue torn off above the tip, now and then
        tv = (2 * t + ph) % 1.0
        if tv < 0.5:
            ty_ = sy - hpx * (1.05 + tv * 0.9)
            tx_ = sx + sway * 1.3
            tr = np.hypot((xx[sub] - tx_) / (wpx * 0.22), (yy[sub] - ty_) / (wpx * 0.45))
            tk = (tr < 1.0) & vis
            out[sub] = np.where(tk[..., None], FL[2] * (1 - tv) + out[sub] * tv, out[sub])
        # cold motes rising, dying within a yard
        for k in range(4):
            mp = float(_hash(np.float64(i * 7 + k), 9.0))
            life = (t * (1 + k % 2) + mp) % 1.0
            mx = int(round(sx + math.sin(2 * math.pi * (life * 1.5 + mp)) * wpx * 0.9 + (mp - 0.5) * wpx))
            my = int(round(sy - hpx - life * 21.0 * zoom * 1.1))
            if 0 <= mx < gw and 0 <= my < gh and life < 0.85 and depth[my, mx] > ldepth - 0.25:
                out[my, mx] = FL[1] if life < 0.4 else FL[3]
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
        ims[0].save(out, save_all=True, append_images=ims[1:], duration=140, loop=0, lossless=True)
    else:
        ims[0].save(out)
    print("saved", out)


if __name__ == "__main__":
    main()
