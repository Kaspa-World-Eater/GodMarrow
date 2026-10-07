# The Blind Face (tools/art_study/blind_face.py), the Hollow Wood

Derek (2026-10-07): "so far all we really have is old growth right. i know when you generated the map there were
stumps all grouped up and a lot of small trees and it looked bad. so first, lets just get another unique old growth
scene made."

## Rules check, before the rebuild (written late: it was skipped before pass 1, the failure that caused the reused pieces)

**Read for this piece**, and the line from each that shapes it:
- **Hollow Wood lore:** the trunks are the god's veins stood up pale, running downhill and joining north. The
  woodcutter's eleventh trunk bled. There are fungi in three colours, white caps on flat stones on Flat Days, and the
  Blind Face.
- **`ecosystems/old_growth_forest.md`:**
  - every age at once;
  - gaps are the heartbeat;
  - dead wood is half the forest (snags with bracket tiers, logs in five decay classes, nurse logs, pit and mound);
  - the floor is in layers (litter, fermentation, humus), drifting against things and thin on mounds;
  - fungi fruit on the dead;
  - no animals, so the dead are only softened.
- **`ecosystems/README.md`:** rays only with a low light, an opening and something in the air. Every object
  exports cover, material and hp.
- **`LIVING_LANDSCAPES.md`:** causes first (falls, pits, gaps), then the light and wet maps, then the floor read off
  them. Nothing painted as a surface.
- **MASTER_RULES:**
  - §0 FORM IS LAW, with the depth effect: height into the world at 0.04 yd, `selfshade=False`, the value-only test;
  - §2b.3: every object is a new design for this scene;
  - §2b.6: the ground is a world-position generator;
  - §5: towering trees, small ones dead, open corridors;
  - sap is dark blood;
  - more of the god in every place, here kept subtle (Derek).
- **Chapter 1:** detail is history; correlated variation; edges carry it, interiors stay calm.
- **Chapter 2:**
  - age reads at the edges (fresh pale breaks on dark rinds);
  - lichen size reads as age;
  - cause masks (rain, water path, burial).
- **Chapter 3:** veins wander and fork in Y's with cross-links, never a perfect tree; dried vessels are black-brown
  threads. This is for the roots and the vein-ridges.
- **Chapter 4:**
  - stone as tilted planes with planar chips and a bevel, never domes;
  - three tones for a 10 px stone;
  - a contact seam;
  - normals never blurred;
  - the edge pass.
- **Report 1:**
  - build from the real thing, not imagination;
  - sink things into their ground;
  - one rule for the whole place;
  - true-scale small things need quiet ground and light;
  - variety means species, not one stamp.

**Line by line, now:**
- **Reused (fails 2b.3), all to be replaced:**
  - the engine's snags with their brackets;
  - the stump;
  - the rock;
  - the logs (fallen giant and hump);
  - the floor litter, the old wood tiles' generator.
- **Form law:** the vein-trees and roots pass. The floor fails: litter is painted colour on a smooth sheet.
- **Ecosystem causes:** the fall has no pit and gap logic of its own, there are no nurse logs, and the floor's layers
  are not derived from this glade's light and wet. All fail.

## The brief for the rebuild (each piece new, form first, in this order, one at a time)
1. **The woodcutter's stump:**
   - a vein-tree cut at knee height: the fluted section shows in its cut face (ridges as lobes, dark heartwood
     veins);
   - the axe's notch faces and the wedges left in it;
   - dark blood weeping from the cut and run down the flutes (the blood effect);
   - a chip pile at its foot.
2. **Flat stones with white caps (Flat Day):**
   - a few flat slabs of the Wood's own stone, built as tilted planes with chips (chapter 4);
   - lichen sized by age;
   - small white caps set on them by hand, a real custom.
3. **The decayed vein-tree snags:** dead vein-trees, the bark sloughed off the ridges first, grey bone-hard wood,
   broken tops. Bracket tiers on the shaded side, new for this wood, fed on what the god carried.
4. **The three fungi:** grey (eaten), and two that glow (left alone), each its own form and its own host (log, root,
   snag).
5. **The fallen giant:**
   - a vein-tree log, its flutes along it;
   - its root plate on edge, torn from the braided roots, so the cords hang broken;
   - the pit and the gap of light it made;
   - a nurse row of seedlings on an older log.
6. **The floor:**
   - derived from the light and wet maps;
   - litter as real height (drifts on the windward side of logs, deep in the pit, thin on mounds);
   - humus dark in the lows;
   - moss on class 3+ wood and at the feet of giants;
   - the roots breaking through;
   - painted from world position.
7. **Then the Blind Face itself:** brow, cheekbones and a half-open mouth carved into the bark as height, the eyes
   healed smooth. Subtle: it is seen, not announced.

Lore read: the Hollow Wood's trunks are the god's veins stood up as pale trees, running downhill and joining, all bent
toward the north where the Root Deep opens; every tenth trunk holds something the god was carrying; the woodcutter's
eleventh trunk "ran red down the blade and warm over my wrists"; luminous fungi in three colours (the grey good in
broth, the other two left); Flat Days, white caps laid on every flat stone; the landmarks the Ribcage Bough (used by
Cap Hollow), the Blind Face, the Niche Candle (the church's candle tree is too like it), the Sword-in-Root. Chosen:
THE BLIND FACE, a giant grown a vast face in its bark, no eyes, the bark healed smooth over them.

1. The glade designed, not scattered: six giants (the Blind Face's at the back, 1.3 yd girth), two of middle age far
   back, two dead snags, one cut stump (the woodcutter's), the fallen giant with its plate, one old moss hump, no living
   saplings, open corridors. The shared pale bark fixed for a fresh log (it had no centre).
   Graded (1): old growth at once: pale trunks towering out of frame, an open glade under a moonbeam, no clumps, no
   crowd of small trees. The Blind Face's tree still plain bark; the fallen giant out of frame.
   Derek: "you are reusing assets in this scene, against the rules" (MASTER_RULES 2b.3: every scene's objects are new designs; shared materials such as the bark stay in one place).
2. The vein-trees (landkit vein_tree.py, this scene's own): fluted trunks, vein-ridges up their whole height (each tree its own count and angles), buttresses flaring along the ridges, root cords from the downhill buttresses running north and steering to braid into the next tree's; the canopy light from these trees. Graded: the fluting and buttresses read; far too dark (the canopy recomputed too dense); the roots not reading yet. Still reused, to replace next: the snags with their brackets, the stump, the rock, the floor's litter, the logs.
   Graded (3, after the fix): the vein-trees pale, fluted, buttressed (the bug: the trunks had been written into the resting ground, so the bark measured up from 17 yd and painted them all in the canopy's dark).
   Derek: "i want this part to be dark and grimmer, older, with the god aspects showing up subtly".
4. Darker, grimmer, older: one tree in five weeping (the god subtle), canker and lichen thick on the old; no green on the floor; a grim grade (colour drained toward ash and umber, the night deep, light only where the moon and the lantern reach).

## Piece 1: the woodcutter's stump (`tools/landkit/vein_stump.py`)

**Rules check, before pass 1:**
- **Read:**
  - chapter 5 (written for it): notch, back cut, hinge splinters, axe facets as planes, checks, weathering, the
    lumens;
  - chapter 4: facets, not domes;
  - chapter 1: wrought iron (the wedge);
  - the blood effect (`landkit/blood.py`);
  - the old-growth chapter (stumps among the dead, fungi on them);
  - report 1 (sink into the ground; small things on quiet ground in light).
- **New design:** yes. Nothing borrowed from the engine's stump. The vein-tree's own ridges give the section (same
  species, same shared code), and the bark is the shared material (`bark.py`).
- **Form:** every facet, check, splinter, bore, wedge and chip is height in the world.
- **Cause:** the tree was felled toward the glade, so the chips lie on that side. Blood is traced downhill on the
  real surface.
- **Scale:** cut at 0.6 yd (knee height on the 2-yard hero), girth 1.6 yd across the flare.

**Passes:**
1. Built from chapter 5. **Graded F:**
   - clamping the vein-tree's tall flare at the cut made a flat cream shelf toward the hero, one white blob in the
     value test;
   - the blood trace stuck on the face and pooled there in bright red blobs (the report's "ketchup");
   - the facets were too small to read;
   - the wedge was lost.
2. The stump's own modest flare (a shoulder into the roots, never a shelf). Bigger, steeper axe facets (0.24 x 0.55
   radii, up to 20 degrees). Normal blur 0.6. Blood thinner and darker, pooling only on the ground. **Graded D:** it
   reads as a stump (the low notch ledge, the higher back cut, checks, the ragged hinge), but it's the brightest
   thing in the frame, cream, and the pool is a round blob.
3. Greyer (the cut face ramp scaled down), chips darker, the wedge bigger (25 cm, as a real splitting wedge), the runs
   wider, the pool smaller. **Graded D+:** grey and sitting in the scene. The lantern-lit lobe still saturates flat.
4. Highlights rolled off (`0.9 * (1 - exp(-1.4 v))`) so a lit facet keeps its tone. Bores bigger (2 px), the wet
   ones dark wet red with a glint where they well. The pool held dark (light capped, depth scaled). **Graded C-:** the
   runs show as thin dark-red lines down the flare to the foot; the lobe has facets. Found white specks at the
   bottom right: the engine's mushrooms (reused).
5. The engine's mushrooms, grass and ferns turned off (new `GRASS`/`FERNS` switches in `wood_scene.py`, default on, so
   other scenes keep theirs). **Graded C:** the glade is darker and older. The stump reads at knee height beside the
   hero. Value test: lit top, lit lobes, dark flank, solid. Still failing: the hinge splinters and the wedge don't
   read, the pool is a dithered block, and the engine's moss sits round the foot (the floor, piece 6).
6. The top simplified to three planes (chapter 4: a face about 30 px wide holds three tones): bigger facets (0.36 x
   0.8 radii) at gentler tilts, three checks plus the split, the hinge raised into a crest of torn fibre (the stump's
   highest edge). **Graded C:** the notch face, the hinge crest and the back cut read; the wedge's rust shows. The
   flare lobes toward the lantern are flat cream sheets.
7. Bark darker, fissured along the grain up the flare, plates sloughed to grey wood, the litter banked over the foot
   (deeper away from the moon). **Graded C:** contact made; the lobes have grain.
8. Sapwood ramp greyed (it read as moss). **Graded C.** Value test passes: lit top, lit lobes, dark flank.
9. The loop, 24 frames: no shimmer on the facets. The lantern breathes, the moonflecks move, the blood churns faintly.
   **Graded C:** alive and stable.
10. **Skeptic round** beside the vein-trees and the Gate's eye (B+). The worst difference: the story's small parts
    (the bores, the standing wedge) are about 2 px at true scale, so the stump reads as "a stump with blood" and not
    yet as a vein cut open. Next: the bores as a ring of dark mouths a pixel larger, with a lit wet lip; the pool
    soaked into the litter, not a dithered block. **Graded C overall.** Shown to Derek for his grade.
