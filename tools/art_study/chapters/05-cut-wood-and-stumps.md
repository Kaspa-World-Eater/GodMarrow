# Chapter 5: cut wood and stumps (2026-10-07)

For the woodcutter's stump in the Blind Face. Lore: "I took the eleventh ... it ran red down the blade and warm over my
wrists." Studied from how trees were felled by axe before saws, and how stumps age.

## 1. How an axe fells a tree, and what it leaves
- **The notch (face cut), on the side the tree is to fall:** a V chopped in, its lower face near level and its upper
  face at about 45 degrees. The upper face leaves with the tree. What stays on the stump is the lower face: a ledge
  sloping slightly down and out.
- **The back cut, from the far side, a little higher than the notch floor.** By axe this is a second, smaller notch.
  The stump keeps its lower face too, so its two halves stand at two heights, the back half higher.
- **The hinge (holding wood):** a strip across the trunk between the two cuts, left uncut so the tree pivots on it.
  When the tree goes, the hinge tears. It leaves a **ridge of torn fibres and splinters** standing up across the
  stump, the tallest thing on it, silver and stringy.
- **Chop marks:** every axe blow leaves a flat, slightly dished facet with a sharp ridge where it meets the next blow.
  A face cut by axe is a field of small planes, each tilted its own way, banded across the cut. A saw cut is flat and
  scored. Axe faces are **faceted**, which is exactly chapter 4's rule for stone (planes, not domes).
- **Chips:** each blow throws a chip, a flat slab 5 to 15 cm long and a finger thick, mostly on the notch side in front
  of the stump. Old chips grey, curl, sink into the litter and moss over.
- **Height:** old fellers cut at knee to waist height. On buttressed giants they cut **springboard slots** into the
  flare and stood above the buttresses. The stump keeps the slots. (They don't fit a height field, so they're not used
  here, but they are the real thing.)
- **Wedges:** iron wedges were driven into the back cut to tip the tree, and into checks to split rounds. A battered
  wedge has a **mushroomed head** (the steel spread by the hammer), lit on its rolled lip and rusting orange where
  water sits.

## 2. How a stump ages
- **Weathering:** sunlight breaks down lignin in the surface. Within a year or two the cut face goes from tan to
  **silver-grey**, and the soft early wood erodes faster than the hard late wood, so the rings stand up as fine ridges.
  Those are under a pixel here, so they show as colour.
- **Checks:** wood shrinks about twice as much round the rings as across them, so the cut face splits in **radial
  cracks from the heart outward**, widest at the rim, a few wide ones and more hairlines. One check can open into a
  split.
- **Sapwood rots first.** The pale outer band softens, goes punky and mossy, and slumps below the harder heartwood. The
  bark loosens and stands as a rim, or falls off in plates.
- **The heart:** in many species the heart rots out to a crumbly hollow. In oak the heartwood lasts and the sapwood
  goes first.
- **Moss and lichen:** moss on the shaded, wet, low parts of the stump and its notch ledge; crustose lichen rosettes on
  the dry high face. Their size tells the age.
- **A buttressed stump's cut shows its flare:** the section is lobed, not round. The rings follow the lobes.
- **Fungi:** brackets and clusters on stumps 2 to 10 years old, at the cut rim and the foot.

## 3. In Godmarrow (the vein-tree's stump)
- **The section is a vein in cross-section.** The vein-tree's ridges are veins, so the cut face shows a dark lumen (the
  vessel's open bore) inside each ridge, just within the bark. That is the god, subtle: the rings are wood's, the holes
  are a body's.
- **It still weeps, years later.** Two lumens still well up wet and dark. The older ones have dried to brown crust. The
  blood runs downhill over the chop facets, off the low notch ledge, down the flare's grooves, and pools at the foot
  (landkit `blood.py`, the game's blood effect). The wood round the wet bores is stained red-brown, soaked in.
- **The wedges left behind:** one iron wedge still standing in the split he was opening when it bled, and one dropped
  on the litter. The woodcutter left in a hurry.

## 4. Recipe (form first; MASTER_RULES section 0)
1. **Section:** the vein-tree's own ridges (`vein_tree._ridges`, `_lobe`), the flare cut off by the cut plane, so the
   section is lobed.
2. **The cut plane:** the notch floor low, sloping out; the back cut higher; the hinge strip between them. Each is a
   field of axe facets (cells long across the cut, each a tilted plane), all in the height field.
3. **Checks** as real grooves, with one opened into a split holding the wedge. The heart slightly dished, a lumen as a
   real hole in each big ridge, and the bark rind a little proud at the rim.
4. **Hinge splinters:** thin columns of different heights across the strip.
5. **Chips:** small tilted planes on the notch side, sunk into the ground.
6. **Colour by cause:**
   - silver-grey weathered wood;
   - the sapwood band paler and green with algae;
   - the bark rind dark;
   - stain round the wet bores;
   - moss on the low wet ledge, lichen on the high dry back cut.
7. **Blood:** traced downhill on the real height field from each bore until it pools; wet or dry by bore.
