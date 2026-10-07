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
from wood_ecosystem import vn, fbm           # noqa: E402

wood_pale.install()
wood_pale.DYING_IN_FIVE = (0,)               # the god shows subtly here: one tree in five weeps, not two (Derek: "subtly")
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
    H, tags = vein_tree.stamp(W["X"], W["Y"], W["H"], VT, NORTH, seed=7)
    W["H"] = H
    W["Hrest"] = np.where(tags < 0, H, W["Hrest"])                                 # the roots are ground; the trunks stand on it (the bark measures up from it)
    W["HT"] = np.where(tags > 0, H, W["HT"])
    for i, (x, y, r, h, sd) in enumerate(VT):
        W["tag"] = np.where(tags == 1 + i, 600 + i, W["tag"])
        W["tag"] = np.where(tags == -(1 + i), 640 + i, W["tag"])
        W["obj"][600 + i] = dict(kind="veintree", c=np.array([x, y]), r=r)
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


def paint_vein(img, m, v, n, px, py, pz, o, W, L):
    return wood_pale.pale_bark(img, m, v, n, px, py, pz, o)


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
ws.LIVING.append(grim)
ws.BUILD_HOOKS.insert(0, stamp_vein_trees)
ws.BUILD_HOOKS.insert(1, stamp_stump)
ws.PAINTERS["vstump"] = paint_stump
ws.PAINTERS["veintree"] = paint_vein
ws.PAINTERS["veinroot"] = paint_vein

if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "blind_face.png"
    if o.endswith(".webp"):
        ws.animate(o)
    else:
        ws.main(o)
