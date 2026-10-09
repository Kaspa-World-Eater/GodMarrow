# The Jaw on the Ashen Moor (tools/art_study/moor_scene.py; tiles_moor.py; landkit/tooth.py): pass log

Brief in moor_scene.py's header from the Moor's lore (the cheek; the Jaw; the ring of teeth round the breathing pit;
black glass; the hide; the Sighing Lantern). Derek: more of the god in every place.
Tile passes: ash_0 1 (seam: ripples not periodic; too banded), 2 (whole-period ripples, quieter).
1. Graded: the ring of teeth reads as a place. FAIL: the wood engine's leaves and saplings all over the Moor; teeth
   read as speckled stone cones; gums separate red rings, not one jaw; the pit barely reads.
2. Forest life off for non-forest lands (engine flag); one swollen gum ridge under the whole ring (dark red flesh, ash
   in its folds, wet gleam, ash drifted over it in places); enamel smooth (broad tones, a long gloss on the moon side,
   a few long craze-lines, stain only near the gum); the pit's heart deep and dark.
   (pass 2 graded: the forest-life flag was never set in this scene; the gum blotched across the way in.)
3. Forest life off; the gum a clean ridge with the way in left open; ash drifted over it in broad tongues.
   Graded: the ring reads as a jaw in the ash. FAIL (worst): the teeth checkered (height-field normals flicker on a steep cone) and split in two flat halves (moon/lantern).
4. Teeth lit by their own true round normals, the engine's light smoothed across each body.
   Graded: teeth in broad smooth tones (the warm/cool seam is the lantern's temperature step, as the standard has it).
5. More of the god: hide patches larger and nearer with their torn ash edges; the eye in the ash (lids of hide, a
   jaundiced white threaded red, a dark wet iris, the moon in its pupil); veins breaching the ash, running in from
   the Moor to the gum, diving under it in places.
   Graded: the god everywhere now: a jaw of teeth in its gum, the eye in the ash looking up, hide where the ash blew off, veins running in. FAIL: hide patches flat pink carpets (no form, no hairs read); veins flat lines like paths; the eye a clean cartoon ellipse; the Broken Kneeler missing; the lantern a box.
6. The Broken Kneeler (landkit kneeler.py): a colossal robed stone figure kneeling toward the pit on the Jaw's rise, knees sunk in the ash, one arm broken at the elbow, the other hand at its breast, its head broken off and lying face up before it; robe folds, cracks, paler breaks, lichen, ash on the ledges.
   Graded: the Kneeler stood off the frame (only a slab showed).
7. The Kneeler brought into view beside the ring, kneeling toward the pit; the Sighing Lantern to the left to balance.
   Graded: the Kneeler stands at the ring's right, a hooded robed stone figure facing the pit; its robe folds render as dark slits like windows; the fallen head unclear. Still open: hide flat pink; veins read as paths; the eye too clean; the lantern a box; the molars' gum-line stain streaks read as grilles.

## Rules check after pass 7: brief/scale/form PASS; light PARTIAL (lantern a box); values PARTIAL (hide flat); paint PARTIAL; life not checked; tiles: ash, hide built (not yet exported). Worst: the hide.
8. The hide swells out of the ash as soft domes the moon models; the hide tile darker grey-mauve with long coarse hairs in tufts, pale tips.
   Graded: the hide reads as flesh (dark skin swelling from the ash, hairs).
9. The veins narrower, dark purple-black and swollen, lit on their backs with a shadow on the ash, branching, diving under the ash in places.
   Graded: the veins swollen dark cords branching in.
10. The Sighing Lantern drawn as a lantern (base plate, iron posts lit on the left, glass panes breathing, peaked cap, ring) with its breathing light on the air; its stone cut with the tenders' notches in tallies of five; the Kneeler's robe folds soft shaded bands, not cut slits.

## Rework (2026-10-07, stage 1 of docs/archive/REWORK_AND_SEEDS_PLAN.md)
- **The teeth:** now the ray-cast `fang.py` (the Gate's tooth), true forms with snapped tips, dentin and blood. The
  old `tooth.py` supplies only the gum at their feet. Molars are shorter, broader fangs (the first try, at 0.62 of the
  height, read as cracked eggshells).
- **The ash:** from the world-position generator `ground.ash`, not the retired tile. The hide patches still use
  their tile, a debt.
- **The eye in the ash:** the flat painted ellipse removed. The approved `eye.py` now rises from a bowl in the ash
  ringed by a swollen lip of hide ("a pool that looks back like an eye"). Failed first: set on the ash it read as a
  ball; sunk too deep, it vanished.
- **Graded:** C+ (no grade from Derek before). The ring reads as a jaw of real teeth; the eye looks up out of the
  ground.
