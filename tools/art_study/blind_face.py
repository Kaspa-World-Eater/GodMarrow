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
import beast_bones                           # noqa: E402
import fen_ground                            # noqa: E402
import wisp_fire                             # noqa: E402
import bark_face                             # noqa: E402
import rain as raingen                       # noqa: E402
from scipy import ndimage as nd              # noqa: E402
import bone as bonegen                       # noqa: E402
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
    fr = FACE_TREE + AX * 1.4                                                          # the Blind Face's crown died back: the moon comes down on it
    w.light = np.maximum(w.light, np.clip(1 - np.hypot(w.X - fr[0], w.Y - fr[1]) / 2.6, 0, 1) * 0.7)


def fen_floor(W, w):
    """the floor gone a little fen (Derek): peat, tussocks and hummocks as real height, still water levelled in the
    hollows (landkit fen_ground.py); everything after stands on it"""
    keep = W["tag"] == 0
    dH, water, level, tus = fen_ground.height(W["X"], W["Y"], seed=9, keep=keep)
    water &= np.hypot(W["X"] - ws.HERO[0], W["Y"] - ws.HERO[1]) > 1.2               # the pilgrim stands on firm ground
    H = W["H"] + dH
    lab, n = nd.label(water)
    if n:
        ring = nd.grey_dilation(lab, size=3) * (lab == 0)
        lev = np.array(nd.minimum(H, labels=ring, index=np.arange(1, n + 1)))
        pool_top = np.array(nd.maximum(H, labels=lab, index=np.arange(1, n + 1)))
        lev = np.minimum(lev - 0.01, pool_top)
        H = np.where(lab > 0, lev[np.maximum(lab - 1, 0)], H)                    # each pool lies level at its own rim
    W["H"] = H
    W["Hrest"] = np.where(keep, H, W["Hrest"])
    W["fen_water"] = lab > 0
    W["fen_tus"] = tus
    W["fen_depth"] = np.clip(nd.distance_transform_edt(lab > 0) * float(W["X"][0, 1] - W["X"][0, 0]) / 0.3, 0, 1)
    # the wisp-fires: a few points over the blood, each flaring at its own time
    WISPS.clear()
    rr = np.random.default_rng(77)
    deep = np.argwhere(W["fen_depth"] > 0.6)
    near = deep[np.hypot(W["X"][deep[:, 0], deep[:, 1]] - C[0], W["Y"][deep[:, 0], deep[:, 1]] - C[1]) < 9]
    if len(near):
        for k, idx in enumerate(rr.choice(len(near), size=min(7, len(near)), replace=False)):
            i, j = near[idx]
            WISPS.append((W["X"][i, j], W["Y"][i, j], H[i, j], k / 7.0 + rr.uniform(0, 0.08), 13 + k))


def fen_paint(img, W, px, py, pz, SX, SY, L, v, gl):
    wat = ws.look(W, W["fen_water"], px, py) > 0
    tus = ws.look(W, W["fen_tus"], px, py)
    dep_ = ws.look(W, W["fen_depth"], px, py)
    return fen_ground.paint(img, gl, v, px, py, wat, tus, T=ws.NOW, moon=L["moon"], depth=dep_, sx=SX, sy=SY, lamp=L["lamp"])


WISPS = []


RAIN = "rain" in sys.argv[2:]                                                      # python blind_face.py OUT.webp rain
RAIN_STATE = {}


def gentle_gust(T):
    """a gentle breeze (Derek: "a gentle breeze blowing"): a soft steady breath and a mild swell once a loop"""
    d = min(abs(T - 0.6), 1 - abs(T - 0.6))
    return 1.0 + 0.45 * np.exp(-(d / 0.14) ** 2)


def _openness(W):
    return lambda x, y: float(np.clip((ws.look(W, W["light"], np.array(x), np.array(y)) - 0.3) / 0.35, 0, 1))


def draw_rain(img, w, W, px, py, pz, L, T):
    """a very light rain at night (landkit rain.py), IN the world (Derek: "weather happens in the world, not on the
    world"): fine in the open, drips under the giants, each drop landing as a ring on the blood or a crown elsewhere;
    seen only where the lantern, the moon's gap or the candles light it"""
    gh = lambda x, y: float(ws.look(W, W["H"], np.array(x), np.array(y)))
    if not RAIN_STATE:
        RAIN_STATE["st"] = raingen.drops(91, C, n=620, span=10.0, top=7.0, openness=_openness(W))
    hero = np.array(ws.HERO, float)
    lamp = np.array([hero[0] + 0.25, hero[1] - 0.25, gh(*hero) + 0.7])

    def light(x, y, z):
        lv = 1.0 / (1 + (np.linalg.norm(np.array([x, y, z]) - lamp) / 2.2) ** 2)
        for (lx, ly, lz, rch) in ws.LIGHTS:
            lv += 0.7 / (1 + (np.linalg.norm(np.array([x, y, z]) - np.array([lx, ly, lz])) / rch) ** 2)
        can = float(ws.look(W, W["light"], np.array(x), np.array(y)))
        lv += np.clip(can - 0.45, 0, 1) * 0.6                                         # the moon, where the canopy opens
        return min(lv, 1.0)

    on_pool = lambda x, y: bool(ws.look(W, W["fen_water"], np.array(x), np.array(y)) > 0)
    return raingen.draw(img, ws.to_px, px + py, RAIN_STATE["st"], T, light, wind=(0.3, -0.3), ground=gh, on_pool=on_pool)


def wet_world(img, w, W, px, py, pz, L, T):
    """the rain's work on the world: wet ground and stump darker, catching the lights in dabs; stemflow down the
    trunks (the face and the eyes too); the hollows, drawn after, stay dry"""
    tg = L["tg"]
    ground_m = (tg == 0) | ((tg >= 670) & (tg < 680)) | (tg == 645)
    bark_m = (tg >= 600) & (tg < 600 + len(VT))
    cx = np.array([v[0] for v in VT])
    cy = np.array([v[1] for v in VT])
    rr_ = np.array([v[2] for v in VT])

    def trunk_c(X, Y):
        k = np.clip(tg - 600, 0, len(VT) - 1)
        return np.arctan2(Y - cy[k], X - cx[k]), rr_[k]
    return raingen.wet(img, L, px, py, pz, T, ground_m, bark_m, trunk_c)


def draw_wisps(img, w, W, px, py, pz, L, T):
    """the wisp-fire on the blood (landkit wisp_fire.py): drawn last, it is light"""
    pool = lambda xs, ys: (ws.look(W, W["fen_water"], px[ys, xs], py[ys, xs]) > 0) & (L["tg"][ys, xs] == 0)
    return wisp_fire.draw(img, ws.to_px, px + py, WISPS, T, pool=pool)


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
        fd = view * (0.97 if kind == "mouth" else 0.78) + to_glade * (0.03 if kind == "mouth" else 0.22)   # it faces us (the mouth full on), leaning into the glade
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


BONES = ((0.8, -2.2, 0.4, 1.0), (-1.8, 0.4, 0.9, 1.15), (4.7, 0.6, 0.15, 0.9), (-0.6, -4.8, 0.7, 1.0))   # (along, across, age, size)


def draw_bones(img, w, W, px, py, pz, L, T):
    """the Wood's dead (landkit beast_bones.py): horned beasts, heads to the north, the older sunk deeper"""
    GH, GW = img.shape[:2]
    dep = px + py
    zb = np.full((GH, GW), -1e9)
    gh = lambda x, y: float(ws.look(W, W["H"], np.array(x), np.array(y)))
    hero = np.array(ws.HERO, float)
    lts = [((hero[0] + 0.25, hero[1] - 0.25, gh(*hero) + 0.7), (0.95, 0.6, 0.32), 2.6 * 1.4)]
    lts += [((lx, ly, lz), (0.95, 0.6, 0.32), rch * 1.4) for (lx, ly, lz, rch) in ws.LIGHTS]
    shapes = []
    for k, (a, p, age, size) in enumerate(BONES):
        q = C + AX * a + PERP * p
        shapes += beast_bones.beast(q, NORTH, gh, age=age, size=size, seed=300 + k * 50)
    shapes.sort(key=lambda o: -((o["pts"][:, 0] + o["pts"][:, 1]).mean() if o["kind"] == "tube" else o["c"][0] + o["c"][1]))
    bonegen.draw(img, zb, dep, ws.to_px, shapes, lts, ws.SUN, ambient=0.14)
    return img


FACE_AT = (62.0, 2.0)                                                              # the face: its facing (degrees, world) and centre height


def draw_face(img, w, W, px, py, pz, L, T):
    """the Blind Face itself (landkit bark_face.py): grown in the bark of the giant at the glade's back"""
    GH, GW = img.shape[:2]
    x, y, r, h, sd = VT[0]
    g0 = float(ws.TRUNK_WARP.t[0]["g0"])
    zc = g0 + FACE_AT[1]
    a0 = np.radians(FACE_AT[0])
    a0c = a0 - ws.TRUNK_WARP._at(ws.TRUNK_WARP.t[0], zc)[3]

    def canon(X, Y, Z):
        lx, ly = ws.lean(X, Y, Z, T)
        return ws.TRUNK_WARP.to_canon_one(0, X - lx, Y - ly, Z)

    fp = np.array([x, y]) + np.array([np.cos(a0), np.sin(a0)]) * r * 1.5
    ml = float(np.clip(0.42 + ws.look(W, W["light"], np.array(fp[0]), np.array(fp[1])) * 0.75, 0, 1))
    zb = np.full((GH, GW), -1e9)
    return bark_face.draw(img, zb, px + py, ws.to_px, canon, (x, y, r, sd, g0), a0c, zc, T, [], ws.SUN, moonlit=ml, seed=5)


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
ws.LIVING.append(draw_bones)
ws.LIVING.append(stump_blood)
ws.LIVING.append(tree_eyes)
ws.LIVING.append(draw_hollows)
ws.LIVING.append(draw_face)
ws.LIVING.append(grim)
ws.LIVING.append(draw_wisps)
if RAIN:
    ws.gust = gentle_gust
    ws.LIVING.insert(ws.LIVING.index(draw_hollows), wet_world)
    ws.LIVING.append(draw_rain)
ws.BUILD_HOOKS[0:0] = [fen_floor, stamp_vein_trees, stamp_stump, place_eyes, place_hollows]   # in this order: floor, trees, stump, then what grows on the trees
ws.GROUND = fen_paint
ws.PAINTERS["vstump"] = paint_stump
ws.PAINTERS["veintree"] = paint_vein
ws.PAINTERS["veinroot"] = paint_vein

if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "blind_face.png"
    if o.endswith(".webp"):
        ws.animate(o)
    else:
        ws.main(o)
