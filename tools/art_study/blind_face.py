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
from wood_ecosystem import vn, fbm           # noqa: E402

wood_pale.install()
C = np.array([20.0, 20.0])                   # the glade's heart
AX = np.array([1.0, 1.0]) / np.sqrt(2)       # toward the viewer (down the screen)
PERP = np.array([1.0, -1.0]) / np.sqrt(2)    # across (screen right)
FACE_TREE = C - AX * 5.2 + PERP * 0.6        # the Blind Face, at the glade's back
STUMP = C + AX * 1.4 + PERP * 3.4            # the woodcutter's eleventh trunk
ws.FOCUS = C - AX * 0.4
ws.HERO = C + AX * 3.6 - PERP * 1.6


def plan(w):
    """the glade, designed, not scattered: six giants, two of middle age far back, two dead snags, one cut stump; the
    fallen giant and one old moss hump; open corridors between them all; no living saplings"""
    t = []
    t.append((FACE_TREE[0], FACE_TREE[1], "giant", 1.3, 9.0))                       # the Blind Face
    for (a, p, r) in ((-3.0, -6.2, 1.0), (-1.5, 6.4, 1.05), (3.2, -8.4, 0.9), (4.4, 8.6, 0.95), (9.0, -6.8, 1.1)):
        q = C + AX * a + PERP * p
        t.append((q[0], q[1], "giant", r, 8.0))
    for (a, p) in ((-9.5, -3.0), (-9.0, 4.2)):
        q = C + AX * a + PERP * p
        t.append((q[0], q[1], "middle", 0.4, 4.5))
    for (a, p) in ((-1.8, 3.4), (6.4, -3.2)):
        q = C + AX * a + PERP * p
        t.append((q[0], q[1], "snag", 0.35, 0.0))
    t.append((STUMP[0], STUMP[1], "stump", 0.55, 0.0))
    w.trees = t
    a0 = C - AX * 2.0 + PERP * 4.6                                                  # the fallen giant, its plate on edge
    ang = np.arctan2((-AX * 0.35 + PERP)[1], (-AX * 0.35 + PERP)[0])
    logs = [(a0[0], a0[1], a0[0] + np.cos(ang) * 13, a0[1] + np.sin(ang) * 13, 0.8, 2, True)]
    b0 = C + AX * 5.5 - PERP * 7.0                                                  # an old one, a moss hump
    logs.append((b0[0], b0[1], b0[0] + 6.0 * AX[0] * 0.3 - 6.0 * PERP[0], b0[1] + 6.0 * AX[1] * 0.3 - 6.0 * PERP[1], 0.5, 4, False))
    w.logs = logs
    w.sapl = []
    d = np.hypot(w.X - C[0], w.Y - C[1])
    w.light = np.maximum(w.light * 0.7, np.clip(1 - d / 6.0, 0, 1) * 0.55)          # the glade a little open to the moon
    w.gap = (C[0], C[1], 5.0)


ws.WOOD_HOOKS.append(plan)

if __name__ == "__main__":
    o = sys.argv[1] if len(sys.argv) > 1 else "blind_face.png"
    if o.endswith(".webp"):
        ws.animate(o)
    else:
        ws.main(o)
