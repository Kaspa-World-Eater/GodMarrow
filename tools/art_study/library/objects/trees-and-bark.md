# Trees and bark

The Hollow Wood's trees are the god's veins stood up as pale trees: "pale, straight, close in the grain", "warm a hand's
depth in", every trunk running downhill by its roots and bending north toward the Root Deep, every tenth trunk holding
something the god was carrying. They tower: an old broadleaf is 15 to 25 m with a trunk 1 to 2 m across, so at the
game's camera the crown is always above the frame and the canopy is felt only as light and shade on the floor. The god
is dying, so the trees are dying too: limb scars that open into weeping eyes, cankers, galls, sap that runs as dark
blood. This page covers the trunk (`vein_tree.py` and its `Warp`), the shared bark (`bark.py`, installed through
`wood_pale.py`), the older trees (`giant.py`, `tree.py`, the engine's own bark) and the tree studies behind them.

## The real thing
- **Chapter 6, [old-growth trunks](../../chapters/06-old-growth-trunks.md)** (Douglas fir, redcedar, spruce):
  - bark up to a foot thick at the base, split by deep furrows between great ridges joined by narrow cross ridges, a
    braided net, never parallel lines; furrows deepest at the foot, shallower and smoother up the bole;
  - **butt swell** to about 1.5 times breast-height width in the lowest metres, then a slow, nearly straight taper
    (a Douglas fir loses about a third of its diameter over 30 m), with swellings at old collars and burls;
  - **spiral grain:** the twist grows with the tree's size, so the channels wind round the oldest trunks;
  - **fluting:** lobes and channels that begin, deepen and fade with height;
  - the silhouette is never a straight line, and the axis is never straight (lean, sweep, a kink at a lost leader).
- **At game scale** (a yard is 18 px across, 21 px tall): a 2-yard trunk is about 36 px; a 10 to 15 cm furrow is 2 to
  3 px, so the channels are real geometry with their own shadow. Taper over a screen of trunk is only 5 to 10 percent;
  the outline's 1 to 2 px waver is what kills the tube.
- **STUDY round 11** (tree botany): area is conserved at every fork (r² = r1² + r2²); the smaller branch leaves at 40
  to 70 degrees; each fork turns about 137 degrees round the axis; broadleaves are decurrent; a crown is three to seven
  lit masses, sky holes, detail only on the lit side and silhouette.
- **Chapter 7, [faces in trees](../../chapters/07-faces-in-trees.md):** limb scars, woundwood and burls are the parts
  that make faces; see [eyes](eyes.md).

## How it is made
**Form.** `tools/landkit/vein_tree.py:stamp` writes each trunk once into the world height field as a straight
canonical column (see [the warped column](../methods/03-warped-column.md) and
[form and depth](../methods/01-form-and-depth.md)):
- **The section is lobed:** `_ridges` gives 5 to 8 vein-ridges per tree (width 0.16 to 0.3 rad, amplitude 0.12 to
  0.26), summed as Gaussians by `_lobe`; the radius is `R * (1 + lobe - 0.06) - _channels(...)`.
- **The channels:** `_channels` cuts 9 to 16 narrow furrows (width 0.035 to 0.08 rad, depth 0.04 to 0.09 R), each
  its own; the twist carries pairs past each other, which makes the cross ridges.
- **The flare:** buttresses run out along the ridges to `R * (1.15 + lobe * 6.0)`, falling concave
  (`(...)**2.4`) into the ground.
- **The roots:** from each ridge facing north (dot with north above 0.15), a cord runs on half buried and
  meandering (steps of 0.12 yd, radius `R * 0.16..0.24`, thinning to 45 percent), steering to the nearest tree foot
  within 9 yd that lies north of it, so the Wood braids into itself. Roots never write over a standing trunk.
- **`vein_tree.Warp`** gives each tree its own height functions: radius scale `s(z) = (1 + 0.16 e^(-z/1.1)) *
  (1 - 0.008 z) * (1 + s1 sin + s2 sin)` (two slow swellings, 2 to 4.5 and 1 to 3 percent, on 3 to 6 and 1.5 to 3 yd
  wavelengths); an axis offset (lean 0.008 to 0.022 yd a yard plus a sweep of 0.12 to 0.3 yd over 8 to 14 yd); a twist
  of 0.05 to 0.11 rad a yard (about 3 to 6 degrees) scaled by `0.6 + 0.4 R`, 60 percent of trees turning one way.
- The engine's `TRUNK_WARP` hook (`wood_scene.py`): in `cast` every ray point near a trunk is sent through the wind's
  lean, then `to_canon`; in `shade` the normal is turned back out by `normal_back`. Anything placed on a trunk (eyes,
  hollows, tendrils) is found on the canonical column and carried out with `Warp.from_canon`.

**Colour.** `tools/landkit/bark.py:paint` is the one bark for every Hollow Wood trunk (the game's `giant.py`, and every
scene on the wood engine through `tools/art_study/wood_pale.py:install`):
- `R_BARK` (8 tones, `#16131a` to `#c2b5a3`): pale skin smooth as beech, grain and furrow from stretched value noise,
  damp streaks;
- **the veins** (`bark.veins`, drawn once in the bole's own arc-height sheet at 0.02 yd and looked up): raised cords
  in `R_VEIN`, warm and bruised; a thin cord (under 3 px) is one clean tone; the lit edge and the thin shadow come in
  only where the cord is wide enough on screen (`px_per_yd * 0.09 >= 3`), and only where the bark faces the eye
  (facing above 0.45); width in proportion to the trunk (`r / 0.9`, clamped 0.3 to 1.2);
- **limb scars** as beech carries them (dark oval, a lit lip above, the chevron brow), 2 to 4 per trunk in
  `scar_band` (4.5 to 15 yd by default), never overlapping (see [eyes](eyes.md));
- **sap is dark blood:** every scar weeps 1 to 3 runs (`SAP`, `SAP_OLD`), glossy red-black where fresh, crusting
  brown and thinning as it dries;
- **dying and disease** are levels a scene sets (`dying`, `disease`; 0 keeps older scenes as they were): cankers
  (sunken lesions with swollen cracked callus rims, bleeding black-red), galls (lumps lit on top), peeling flaps over
  raw flesh-dark wood; the dying tree's scars open into eyes;
- the ground's wet drawn up into the foot, deeper on the side turned from the moon; faint grey-green lichen on the lit
  side.

**Light.** `bark.form_value`: a pale trunk keeps its grey in shade (lit third, a core, the floor's light thrown back on
the far edge; shade floor 0.34, from the giant passes). The channels' walls are lit through real normals and cast their
own shadow. See [light](../methods/04-light.md).

**Life.** Trees lean in the one wind (`wood_scene.lean`); stemflow runs down the channels in rain (`rain.wet`); the
eyes blink. See [living layers](../methods/07-living-layers.md).

## Variants and parameters
| Piece | Where | Notes |
|---|---|---|
| Vein-tree, warped | `landkit/vein_tree.py` (`stamp`, `Warp`) | the current standard; per tree `(x, y, girth, height, seed)` |
| Shared bark | `landkit/bark.py:paint` | `scars`, `scar_band`, `px_per_yd`, `dying`, `disease`, `eyes` |
| Wood-engine install | `art_study/wood_pale.py` | `pale_bark`, `tree_eyes`; used by the church ruin and Cap Hollow |
| Towering game tree | `landkit/giant.py:make` | `HGT = 16`; its own copy of the veins; heart-rot hollow at the foot on some |
| Broadleaf with crown | `landkit/tree.py:make` | ages sapling 0.32, young 0.55, middle 0.95, giant 1.55; trunk and crown layers |
| Engine's old bark | `art_study/wood_scene.py:paint_bark` | the judge scene's oak-like bark (fissure cells along the grain) |
| Studies | `tree_anatomy.py`, `tree_foliage.py`, `blighted_tree.py`, `tree_study*.py` | skeleton, crown masses, blight, burning |

## What worked
- **The warped column.** One stamped column plus per-height warp gives taper, swell, wander and twist in every
  direction; the painted fissures wind with the twist for free.
- **Lighting the pale trunk as a value structure** (lit third, core, bounce) instead of a dark tube in canopy shade.
- **Fading the bole into the canopy's dark** from 9 to 15 yd through the dither: no top ever shows, and far trunks fade
  before they cross the frame (giant pass 11).
- **Veins as a few distinct cords** (four or five, rarely branching), not a branching net.
- **One bark in one place** (`bark.py`): every fix reached the game's trees and every scene at once.
- **Decay by level** (`dying`, `disease`) so a scene opts in and the older scenes keep their look.

## What failed, and why (traps)
- **Primitive stand-ins:** cones, then blob crowns on stick limbs, then a straight tube (giant pass 1). Derek: "trees
  look like shit, don't use conifers". A trunk is a warped column, never a tube.
- **Veins branching often and wide** made the pale bole read dark violet-red (giant pass 4).
- **Shade floor too low** (0.16): a pale tree read dark (giant pass 5). Keep pale bark's grey in shade (0.34).
- **The vein stripe on thin trees** (ruin passes 7 to 10): a cord 1 to 2 px wide given a lit edge, dark middle and
  shadow breaks into a checker; on a 0.31 yd trunk the giant's vein width is a fat band. Fixed by one-tone thin cords,
  facing above 0.45, width in proportion to girth.
- **A hard ring at the collar** where the flare's normals switched to the bole's; blend through the collar.
- **Moss on the roots as green camouflage** (the bole's north-moss rule painting them); and long straight flat root
  blades lying on the litter. Roots are bark-coloured, bent, shorter (1.6 to 2.8 yd), with litter over their flanks.
- **The 15-line stand-in bark** in the church scene: "the bark on the trees in your scene looks weak and unrefined".
  Cap Hollow first wore the old dark oak bark: the same fault. Every Wood scene now installs `wood_pale`.
- **Bug: trunks written into the resting ground,** so the bark measured "along" from 17 yd and painted every trunk in
  the canopy's dark (Blind Face pass 2).
- **Bug: the stump's roots overwrote a trunk's resting ground,** which put the altar 18 yd up its tree. Roots never
  write over a standing trunk; placed things take their ground from the warp's record (`g0`).
- **Stills skip the trunk lookup** (`cast` with no time); the hook forces `t = 0`.
- **Build-hook order:** insert the scene's hooks as one ordered list (floor, trees, stump, then what grows on trees).
- **A twist turns a feature edge-on:** choose a facing in the world, then undo the twist for the canonical angle.
- **A height field holds only a downward-closed solid:** a section that changes with height must be a warp, and a limb
  held out in the air must not be stamped (it becomes a column to the ground).
- **Too faithful a canopy** ("5% of daylight") leaves trunks as navy poles; keep a moonlit baseline, sky fill, bounce
  and a moon rim (one continuous line; tinted rims broke into cyan dashes).

## Derek's rulings and grades (verbatim)
- 2026-10-06: "study trees next and learn to draw them"; "trees come in many forms, many shapes, many species, many age
  groups. This is true for all plants. Whereas ruins and fortresses will be fixed."
- 2026-10-06: "Our world is a dark world, so the trees should have rot and pathogens"; "the bark on the trees looks
  pretty bad ... needs two or three more refinement passes minimum".
- 2026-10-07: "If we are in a forest, I want the trees to tower over head ... we probably won't see the tops".
- 2026-10-07: "the bark on the trees in your scene looks weak and unrefined".
- 2026-10-07: "sap in the world will look like dark blood"; "I like the idea of some more dying trees having weeping
  eyes. Brings the dead god more into it."; "Add an eye or two and some disease to the trees."
- 2026-10-07: "i want this part to be dark and grimmer, older, with the god aspects showing up subtly".
- 2026-10-07: "No tree is a perfect tube like you've made. They have changes in thickness. They taper, they twist ...
  channels running down the bark that give it kind of a wavy shape."
- 2026-10-07: **"great job on the turning trees. More realistic and not just tubes"**; "we're going to have to go back
  and edit our old assets with this new information".

## Where it is used
- [The ritual glade](../environments/the-vigil.md) (`vigil.py`): six warped vein-trees, the eye tree, the
  altar tree, the alcove trees, tendrils on five trunks.
- [Old-growth wood](../environments/old-growth-wood.md): the judge scene (`wood_scene.py`, engine bark), Cap Hollow
  (`hollow_camp.py`, `wood_pale`, dying 3 in 5), the church ruin (`ruin_scene.py`, `wood_pale`, dying 2 in 5).
- The game's old-growth set (`build_set.py old_growth`): `tree.py` at four ages and `giant.py`.

## Status
- **Warped vein-trees:** 6 passes, **B** (Derek, above). Owed four more passes.
- **Shared bark:** 12 graded passes (`passes/giant.md`), then the ruin and Cap Hollow refinements; no Derek grade on
  its own.
- **To rework with the warp and channels** (MASTER_RULES 8.7): the judge scene (`wood_scene.paint_bark` trunks), Cap
  Hollow, `tree.py` and `giant.py`. Until then they are tubes with painted bark.
- **Duplicates to merge:** `giant.py` keeps its own `veins` and `R_BARK`/`R_VEIN` copies of `bark.py`'s; the engine's
  `wood_scene.R_BARK` and `paint_bark` are a second bark for the old broadleaf. One trunk generator (`vein_tree` +
  `Warp`) and one bark (`bark.py`) should serve them all.
- **Not built:** the understorey tree, nurse-log rows and stilted trees, the stag-headed giant as its own object (the
  altar tree's broken canopy is only an opened crown).
