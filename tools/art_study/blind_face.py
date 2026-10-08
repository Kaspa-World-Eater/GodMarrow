"""The Blind Face, in the Hollow Wood (Derek 2026-10-07: "lets just get another unique old growth scene made"; after the
generator's wood looked bad: "stumps all grouped up and a lot of small trees"). Built on the wood's engine
(wood_scene.py) through its hooks, under MASTER_RULES (section 0, FORM IS LAW; the forest feel: towering trees with
their tops out of frame, open corridors, small trees mostly dead, no clumps).

THE BRIEF, from the Hollow Wood's lore (docs/wiki/02-world-and-lore.md, 11-codex-voices.md, 12b):
- "The Hollow Wood is the god's veins stood up as pale trees"; the surveyor: "I followed three trunks by their roots and
  their lean. Each ran downhill, and each joined another, and all of them bent toward one place in the north of the
  Wood. The Root Deep opens there." So the giants lean north (up the screen), their roots braid downhill and join.
- A landmark: THE BLIND FACE. One giant has grown, over centuries, a vast face in its bark: brow, cheekbones, a mouth
  half open, and no eyes, the bark healed smooth where they should be. It is carved form, not paint (section 0).
- "Every tenth trunk holds something the god was carrying"; the woodcutter: "I took the eleventh ... it ran red down
  the blade and warm over my wrists". One stump, cut, still weeping red, the wedges left in it.
- "Luminous fungi in three colours"; "the grey is good in broth, the other two you leave".
- "Flat Days in the Hollow Wood: when the ash lies still, nobody hunts, white caps are laid on every flat stone."
- Night: the moon through the canopy's gaps; the pilgrim's lantern.

  python tools/art_study/blind_face.py OUT.png [T] | OUT.webp
"""
import os
import sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "landkit"))
import wood_scene as ws                      # noqa: E402
import wood_pale                             # noqa: E402
import vein_tree                             # noqa: E402
import vein_stump                            # noqa: E402
import eye as eyegen                         # noqa: E402
import hollow                                # noqa: E402
import bark                                  # noqa: E402
from wood_ecosystem import vn, fbm           # noqa: E402

wood_pale.install()
wood_pale.DYING_IN_FIVE = ()                 # no random weeping sockets here: this glade's eyes are designed (the eye tree below)
wood_pale.DISEASE = (0.7, 0.45)              # older: canker, galls, lichen thick on the old
C = np.array([20.0, 20.0])                   # the glade's heart
AX = np.array([1.0, 1.0]) / np.sqrt(2)       # toward the viewer (down the screen)
PERP = np.array([1.0, -1.0]) / np.sqrt(2)    # across (screen right)
FACE_TREE = C - AX * 5.2 + PERP * 0.6        # the Blind Face, at the glade's back
STUMP = C + AX * 2.0 + PERP * 1.6            # the woodcutter's eleventh trunk, in the glade's moon, near the lantern
FALL = AX * 0.6 - PERP * 0.8                 # it was felled toward the open glade: the notch and the chips this side
ws.FOCUS = C - AX * 0.4
ws.GRASS = False                             # the old scene's grass, ferns and mushrooms are reused: off until this floor's own
ws.FERNS = False
ws.NORMAL_BLUR = 0.6                         # facets and splinters keep their edges (chapter 4: never blur normals into pillows)
ws.HERO = C + AX * 3.6 - PERP * 1.6


def plan(w):
    """the glade, designed, not scattered: six giants, two of middle age far back; open corridors between them all; no
    living saplings. The stump, the snags, the fallen giant and the stones come back one at a time as this scene's own"""
    t = []
    VT.clear()                                                                      # the vein-trees: this scene's own (landkit vein_tree.py)
    VT.append((FACE_TREE[0], FACE_TREE[1], 1.3, 17.0, 101))                          # the Blind Face's tree
    for k, (a, p, r) in enumerate(((-3.0, -6.2, 1.0), (-1.5, 6.4, 1.05), (3.2, -8.4, 0.9), (4.4, 8.6, 0.95), (9.0, -6.8, 1.1),
                                   (-9.5, -3.0, 0.55), (-9.0, 4.2, 0.6))):
        q = C + AX * a + PERP * p
        VT.append((q[0], q[1], r, 16.0 if r > 0.8 else 13.0, 102 + k))
    w.trees = t
    lt = np.ones(w.X.shape)                                                         # the canopy from these trees, not the old ones
    for (x, y, r, h, sd) in VT:
        lt = lt - np.clip(1 - np.hypot(w.X - x, w.Y - y) / (r * 6.0), 0, 1) * 0.22
    w.light = np.clip(lt, 0.45, 1)
    w.logs = []                                                                     # the engine's logs and plate are reused: gone until this scene's own are made
    w.rocks = []                                                                    # the engine's rocks likewise
    w.sapl = []
    w.shrooms = []
    for name in ("grass",):                                                      # nothing green lives on this floor (Derek: "darker and grimmer, older")
        a_ = getattr(w, name, None)
        if isinstance(a_, np.ndarray) and a_.dtype == bool:
            setattr(w, name, np.zeros_like(a_))
    d = np.hypot(w.X - C[0], w.Y - C[1])
    w.light = np.maximum(w.light * 0.7, np.clip(1 - d / 6.0, 0, 1) * 0.55)          # the glade a little open to the moon
    w.gap = (C[0], C[1], 5.0)


VT = []
NORTH = -AX                                                                         # "all of them bent toward one place in the north"


def stamp_vein_trees(W, w):
    grounds = [float(ws.look(W, W["Hrest"], np.array(x), np.array(y))) for (x, y, r, h, sd) in VT]
    ws.TRUNK_WARP = vein_tree.Warp(VT, grounds)                                    # no tube: taper, swell, wander, twist (chapter 6)
    H, tags = vein_tree.stamp(W["X"], W["Y"], W["H"], VT, NORTH, seed=7)
    W["H"] = H
    W["Hrest"] = np.where(tags < 0, H, W["Hrest"])                                 # the roots are ground; the trunks stand on it (the bark measures up from it)
    W["HT"] = np.where(tags > 0, H, W["HT"])
    for i, (x, y, r, h, sd) in enumerate(VT):
        W["tag"] = np.where(tags == 1 + i, 600 + i, W["tag"])
        W["tag"] = np.where(tags == -(1 + i), 640 + i, W["tag"])
        W["obj"][600 + i] = dict(kind="veintree", c=np.array([x, y]), r=r, vt=i)
        W["obj"][640 + i] = dict(kind="veinroot", c=np.array([x, y]), r=r * 0.2)


STUMP_INFO = {}


def stamp_stump(W, w):
    """the woodcutter's stump (landkit vein_stump.py), its roots braiding north to the vein-trees"""
    H, part, info = vein_stump.stamp(W["X"], W["Y"], W["H"], STUMP, R=0.8, fall=FALL, seed=211, north=NORTH, others=VT,
                                     cut=0.58)
    W["H"] = H
    W["Hrest"] = np.where(part != 0, H, W["Hrest"])
    W["tag"] = np.where(part == -1, 645, W["tag"])
    W["obj"][645] = dict(kind="veinroot", c=np.array(STUMP), r=0.16)
    for k in range(1, 6):
        W["tag"] = np.where(part == k, 670 + k, W["tag"])
        W["obj"][670 + k] = dict(kind="vstump", part=k, c=np.array(STUMP), r=0.8)
    STUMP_INFO.update(info)


def paint_stump(img, m, v, n, px, py, pz, o, W, L):
    return vein_stump.paint(img, m, v, n, px, py, pz, o["part"], STUMP_INFO, ws.SUN)


def stump_blood(img, w, W, px, py, pz, L, T):
    B = ws.look(W, STUMP_INFO["B"], px, py)
    D = ws.look(W, STUMP_INFO["DRY"], px, py)
    lit = np.clip(L["moon"] * 0.9 + L["lamp"] * 1.4 + 0.1, 0, 1.2)
    return vein_stump.paint_blood(img, px, py, B, D, lit, T)


EYE_TREE = 2                                                                       # which vein-tree watches (the glade's right)
EYES = []


def place_eyes(W, w):
    """the eye tree (Derek: "two eyeballs oriented differently on the tree, bulbous, slowly blinking or looking
    around"): two of the god's eyes grown into one trunk, well apart, each sunk into the bark it pushed through"""
    EYES.clear()
    x, y, r, h, sd = VT[EYE_TREE]
    c = np.array([x, y])
    g0 = float(ws.look(W, W["Hrest"], np.array(x), np.array(y)))
    for (off, zh, R, ph) in ((-0.62, 2.4, 0.36, 0.08), (0.58, 4.5, 0.3, 0.58)):
        ang = np.pi / 4 + off - ws.TRUNK_WARP._at(ws.TRUNK_WARP.t[EYE_TREE], g0 + zh)[3]   # toward the camera, turned aside (undoing the twist)
        u = np.array([np.cos(ang), np.sin(ang)])
        ts = r
        for t_ in np.arange(r * 0.4, r * 3.0, 0.02):                                 # the fluted bark's surface on that line
            q = c + u * t_
            if float(ws.look(W, W["HT"], np.array(q[0]), np.array(q[1]), -50.0)) < g0 + zh:
                ts = t_
                break
        Pc = c + u * ts
        wx_, wy_, tw = ws.TRUNK_WARP.from_canon(EYE_TREE, Pc[0], Pc[1], g0 + zh)
        uw = np.array([np.cos(ang + tw), np.sin(ang + tw)])
        EYES.append(dict(c=c, ang=ang, u=uw, P=np.array([wx_, wy_]), z=g0 + zh, zr=zh, R=R, ph=ph, g0=g0, r=r, yaw0=ang + tw))


MOUTH_TREE = 4                                                                     # the mouth: the great trunk at the glade's right edge, facing in
NICHE_TREE = 5                                                                     # the Niche Candle: the great tree in front, by the path
HOLLOWS = []


def _surface(W, c, r, ang, z):
    u = np.array([np.cos(ang), np.sin(ang)])
    for t_ in np.arange(r * 0.4, r * 3.0, 0.02):
        q = c + u * t_
        if float(ws.look(W, W["HT"], np.array(q[0]), np.array(q[1]), -50.0)) < z:
            return c + u * t_, u
    return c + u * r, u


def place_hollows(W, w):
    """the mouth (Derek: "a mouth that looks like a hollow") and the Niche Candle (the lore's landmark; Derek: "candles
    inside the hollow of another tree with depth so you can see it glowing"), landkit hollow.py"""
    HOLLOWS.clear()
    view = np.array([1.0, 1.0]) / np.sqrt(2)
    for (ti, kind, zh, Wd, Hd, Dd, cand) in (
            (MOUTH_TREE, "mouth", 1.9, 0.6, 0.27, 0.7, ()),
            (NICHE_TREE, "niche", 1.25, 0.3, 0.42, 0.55, ((-0.15, 0.13, 0.028), (-0.05, 0.22, 0.034), (0.05, 0.1, 0.026),
                                                         (0.15, 0.17, 0.03), (0.0, 0.06, 0.03)))):
        x, y, r, h, sd = VT[ti]
        c = np.array([x, y])
        g0 = float(ws.look(W, W["Hrest"], np.array(x), np.array(y)))
        to_glade = (C - c) / np.linalg.norm(C - c)
        fd = view * 0.78 + to_glade * 0.22                                        # it faces us, leaning a little into the glade
        tw0 = ws.TRUNK_WARP._at(ws.TRUNK_WARP.t[ti], g0 + zh)[3]                  # the trunk's twist there: face the world way
        P, u = _surface(W, c, r, np.arctan2(fd[1], fd[0]) - tw0, g0 + zh)
        px_, py_, tw = ws.TRUNK_WARP.from_canon(ti, P[0], P[1], g0 + zh)              # out through the trunk's warp
        ax_, ay_, _ = ws.TRUNK_WARP.from_canon(ti, c[0], c[1], g0 + zh)
        u = np.array([u[0] * np.cos(tw) - u[1] * np.sin(tw), u[0] * np.sin(tw) + u[1] * np.cos(tw)])
        P = np.array([px_, py_])
        HOLLOWS.append(dict(kind=kind, C=np.array([P[0], P[1], g0 + zh]), u=u, W=Wd, H=Hd, D=Dd, candles=cand, zr=zh,
                            axis=np.array([ax_, ay_])))
        if kind == "niche":                                                         # the glow spilling out over the bark and the floor
            q = P + u * 0.3
            ws.LIGHTS.append((q[0], q[1], g0 + zh - 0.1, 1.6))


def draw_hollows(img, w, W, px, py, pz, L, T):
    GH, GW = img.shape[:2]
    dep = px + py
    zb = np.full((GH, GW), -1e9)
    hero = np.array(ws.HERO, float)
    hg = float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1])))
    lts = [((hero[0] + 0.25, hero[1] - 0.25, hg + 0.7), (0.95, 0.6, 0.32), 2.6 * 1.4)]
    for k, hl in enumerate(HOLLOWS):
        lx_, ly_ = ws.lean(np.array(hl["C"][0]), np.array(hl["C"][1]), np.array(hl["zr"]), T)
        sh = np.array([float(lx_), float(ly_), 0.0])
        C = hl["C"] + sh
        img, _ = hollow.draw(img, zb, dep, ws.to_px, C, hl["u"], hl["W"], hl["H"], hl["D"], T, lts, ws.SUN, kind=hl["kind"],
                             candles=hl["candles"], seed=61 + k, ambient=0.1, moonlit=0.5, axis=hl["axis"] + sh[:2])
    return img


def tree_eyes(img, w, W, px, py, pz, L, T):
    GH, GW = img.shape[:2]
    dep = px + py
    zb = np.full((GH, GW), -1e9)
    hero = np.array(ws.HERO, float)
    hg = float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1])))
    lts = [((hero[0] + 0.25, hero[1] - 0.25, hg + 0.7), (0.95, 0.6, 0.32), 2.6 * 1.4)]
    view = np.array([1.0, 1.0, 0.0]) / np.sqrt(2)
    for k, e in enumerate(EYES):
        p = e["P"] - e["u"] * e["R"] * 0.72                                          # sunk deep: the lids grow out of the bark, only the bulge stands out
        lx_, ly_ = ws.lean(np.array(p[0]), np.array(p[1]), np.array(e["zr"]), T)
        centre = (p[0] + float(lx_), p[1] + float(ly_), e["z"])
        # it looks around, slowly: the gaze wanders across and up and down, each eye on its own time
        yaw = e["yaw0"] + 0.5 * np.sin(2 * np.pi * (T + e["ph"])) - 0.25 * np.sign(e["ang"] - np.pi / 4)
        pitch = 0.1 + 0.22 * np.sin(2 * np.pi * (T + e["ph"] * 1.7) + 1.3)
        gz = np.array([np.cos(yaw), np.sin(yaw), pitch]) + view * 0.35
        tb = ((T + e["ph"]) % 1.0) - 0.8                                             # one slow blink a loop, at its own time
        blink = np.clip(1 - abs(tb) / 0.11, 0, 1) ** 0.7
        eyegen.draw(img, zb, dep, ws.to_px, centre, e["R"], gz, blink, lts, ws.SUN, seed=41 + k, ambient=0.24,
                    aperture=(1.0, 0.7))
    return img


def eye_sap(img, m, v, n, px, py, pz, o):
    """the bloody sap weeping from each eye's lower lid down the bark: glossy red-black near it, crusting brown lower;
    a stain soaked into the bark round the socket"""
    for k, e in enumerate(EYES):
        c, r = e["c"], e["r"]
        ang = np.arctan2(py - c[1], px - c[0])
        da = (((ang - e["ang"]) + np.pi) % (2 * np.pi) - np.pi) * r
        dz = pz - e["z"]
        ell = (da / (e["R"] * 1.7)) ** 2 + (dz / (e["R"] * 1.5)) ** 2
        halo = m & (ell < 1.0)
        img[halo] = img[halo] * (0.55 + 0.45 * ell[halo])[:, None] * np.array([1.0, 0.82, 0.8])
        rs = np.random.default_rng(71 + k)
        for q in range(4):
            a_r = rs.uniform(-0.55, 0.55) * e["R"]
            L_r = rs.uniform(1.0, 3.2)
            z0 = e["z"] - e["R"] * 0.75
            f_ = np.clip((z0 - pz) / L_r, 0, 1)
            wig = np.sin(pz * 2.0 + q * 2.1) * 0.03 + np.sin(pz * 0.8 + k) * 0.025
            wr = 0.055 - f_ * 0.035
            run = m & (pz < z0) & (pz > z0 - L_r) & (np.abs(da - a_r - wig) < wr)
            fresh = run & (f_ < 0.5)
            img[run] = bark.SAP_OLD[np.clip(((v[run] * 0.6 + 0.15) * len(bark.SAP_OLD)).astype(int), 0, len(bark.SAP_OLD) - 1)]
            img[fresh] = bark.SAP[np.clip(((v[fresh] * 0.75 + 0.12) * len(bark.SAP)).astype(int), 0, len(bark.SAP) - 1)]
            bead = fresh & (np.abs(da - a_r - wig) < wr * 0.35) & (v > 0.35)
            img[bead] = np.minimum(img[bead] * 1.8 + np.array([0.08, 0.02, 0.02]), 1)
    return img


def paint_vein(img, m, v, n, px, py, pz, o, W, L):
    img = wood_pale.pale_bark(img, m, v, n, px, py, pz, o)
    if o.get("vt") == EYE_TREE:
        img = eye_sap(img, m, v, n, px, py, pz, o)
    return img


def grim(img, w, W, px, py, pz, L, T):
    """dark, grim, old (Derek): the colour drained toward ash and umber, the night deep; light only where the moon and the
    lantern truly reach"""
    lum = img.mean(2, keepdims=True)
    lit = np.clip(L["moon"] * 0.8 + L["lamp"] * 1.2, 0, 1)[..., None]
    img = lum + (img - lum) * (0.42 + lit * 0.35)
    img = img * (0.62 + lit * 0.45) * np.array([0.96, 0.95, 0.98])
    return np.clip(img, 0, 1)


ws.WOOD_HOOKS.append(plan)
ws.LIVING.append(stump_blood)
ws.LIVING.append(tree_eyes)
ws.LIVING.append(draw_hollows)
ws.LIVING.append(grim)
ws.BUILD_HOOKS.insert(0, stamp_vein_trees)
ws.BUILD_HOOKS.insert(1, stamp_stump)
ws.BUILD_HOOKS.insert(2, place_eyes)
ws.BUILD_HOOKS.insert(3, place_hollows)
ws.PAINTERS["vstump"] = paint_stump
ws.PAINTERS["veintree"] = paint_vein
ws.PAINTERS["veinroot"] = paint_vein

if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "blind_face.png"
    if o.endswith(".webp"):
        ws.animate(o)
    else:
        ws.main(o)
