# The night ruin in the Hollow Wood (tools/art_study/ruin_scene.py, tools/landkit/ruin.py): pass log

Brief in ruin_scene.py's header, from the Hollow Wood's lore (the hunter's account).

1. First render. Reads: walls in courses, ivy, the tall pier, flags, the blue-cap ring, a moonbeam. FAIL (worst first):
   a root plate and log from the plan sit over the doorway (door, Ossuarch and candle tree lost); not night (the open
   canopy floods it like day); the trees flat white strips (no round light); the stepped wall tops a layer cake of
   green and beige bands; the tall pier a plain ringed tube.
2. Root plates kept 2.6 yd off the walls; the clearing's light held to 0.5 (the shafts carry it); pale bark lit round
   (lit third, core, bounce) and darkening as it climbs.
   Graded: trees now lit round. FAIL: the root plate still at the door (it clears the walls but stands where the
   pilgrim does); still bright (I only raised the canopy light; where the plan was lit it stays lit).
3. No log within 4 yd of the threshold (5 for a root plate); the clearing set to a night level; the wall tops broken
   block by block (each top block 0-3 courses gone) instead of terraces; moss in patches on the tops over bare stone.
   (Derek: "the bark on the trees in your scene looks weak and unrefined" — it was a 15-line stand-in, against the
   masterwork rule; "ruins must be true to scale"; see-through total.)
4. The church at true scale (15 x 9 yd nave, walls 1.1 yd thick and 6.5-9 yd high, piers 0.5 yd round, the tall one
   8.5 yd, a 1.6 yd door, an altar a yard high); the trees' bark the shared 12-pass vein-bark (tools/landkit/bark.py).
   Graded: true scale reads (the Ossuarch tiny at the door), coursed walls, creepers, flags, piers. FAIL (worst
   first): the near tall wall hides the nave; stone by the lantern washed to flat beige; thin young trees are pale
   poles striped with crowded veins (and small trees should be mostly dead); the candle not in frame.
5. Walls toward the camera broken low (2.6, 3.6 yd), far walls high (9, 8 yd); the stone's light held under the
   ramp's top; young trees become snags or go; the tenth trunk with its candle set by the door in frame.
   Graded: the eye goes in now (nave, piers, flags, the blue-cap ring, mist, the candle in its trunk). FAIL: the
   threshold a lantern-lit camo of moss and engine grass tufts; far walls cropped; dotted red-pink rims on the pale
   trunks (the scene's x1.35 moon rim dithered over warm bark).
6. A ground-life rule (grass only beyond 2.4 yd of the walls: the bare ring stays bare, the steps stay stone); the
   moon rim soft and cool for pale trunks; steps mossed only in their cracks; the camera nudged north; a breathing
   warm halo of candlelight on the bark round the flame.
   Graded: far wall in frame, piers into the misted nave, blue ring, bare ring bare. FAIL (worst): the pilgrim on a
   raised mossy lit slab (a fallen arch-stone landed on his spot): reads as a pedestal.
7. The voussoirs fall to either side of the door as a collapsed arch drops them; the threshold's way kept clear.
   Graded: the pilgrim on the ground at the threshold. The zoom finds the trunk stripe: a vein lying along the
   silhouette, where the bark turns from the eye, squashed into a long checkered line.
8. Shared bark (bark.py, so the game's trees gain it too): veins shown only where the bark faces the eye.
   Graded: the stripe remains. Tested by elimination (veins off: gone; rims off: stays): the veins, but as cords only
   1-2 px wide on screen, too narrow for a lit edge + dark middle + shadow, which break into a checker.
9. Shared bark: a thin cord is one clean warm-dark tone following the trunk's light; edge and shadow only where a
   cord is wide enough on screen to carry them; cords only where the bark faces the eye well (facing > 0.45).
   Graded: stripe persists. Measured (normals, facing, cord mask per pixel): on a 0.31 yd trunk a cord is 5 px wide
   across its face, the giants' vein width on a thin tree: a fat dark band, not a vein.
10. Shared bark: vein width in proportion to the trunk (r / 0.9, 0.3..1.2).
   Derek: "the hero is standing through the ground and rock that he should be walking on, so if it curves, he must
   follow along. The stone needs more work." Five refinements asked for.
11. The hero stands on the highest surface within his footprint (stand_height), and the surface he stands on (within
    his footprint, no higher than his soles) never hides him; the engine's rule, so every scene keeps it.
   Graded: he stands on the surface. Stone FAIL: walls read as modern brick (equal blocks, regular half-bond, clean
   edges, every block one tone).
12. Ancient ashlar: even courses but blocks of many lengths with joints where they fell; edges worn round; each block
    its own stone, warmer or cooler; spalled faces; water stains running down from the broken tops; lichen rosettes
    (grey-green, a few rust) on the moonward faces.
   Graded: blocks differ (tone, temperature, stains, lichen, spalls). FAIL: bed joints dark and identical every course
   (striped); vertical joints barely read; the piers plain drums.
13. Joints softened and broken where mortar is gone, vertical joints wider; the piers as architecture: square plinth,
    round moulding, a fluted shaft of drums (twelve flutes), the top sheared on one tilted plane with a paler rough
    fracture.
   Graded: piers read as architecture (plinth, moulding, fluted drums, plane-sheared tops); joints no longer stripe.
   FAIL: the nave floor a perfect evenly lit grid, and (Derek's new rule) not a game tile.
14. The church floor as a game tile (tools/art_study/tiles_ruin.py, church_flags, seamless 320x160): flags 0.89 yd
    dividing the iso period exactly, each its own stone and temperature, some laid double, broad trodden wear, cracks
    with lit lips, sunk damp flags, now and then one gone to earth, moss in the joints, leaves drifted. The scene lays
    it under its own light; the wood's ground set takes it as its flags (build_set.py).
   Derek: "he still looks like he's going through the stone mound because it's become transparent." Measured: he
   stood astride a step's edge (half his footprint on the step top at 0.34, half over ground falling to -0.14); the
   max height lifted him over thin air, and not hiding anything below his soles made the step look transparent.
15. A body stands on one whole level surface (engine rule settle_hero): if the footprint straddles an edge he takes
    the nearest level spot within half a yard; he stands at its median height; only that surface is kept from
    hiding him.

## Rules check after pass 15 (2026-10-07, the 15-minute reminder; every checklist line)
Lore detail in the piece: yes (the Wood grows away from what hands laid: the bare ring; the blue caps over the hollow;
the tenth trunk's candle; the pale vein-trees).
1. Brief: PASS (written from the hunter's account and real church building).
2. Scale: PASS (15 x 9 yd church, walls 1.1 yd, piers 0.5 yd, the Ossuarch 2 yd at the door).
3. Form: PASS (all ray-cast height fields; piers with plinth, moulding, sheared tops).
4. Light: PARTIAL. Moon and lantern cast shadows; the candle casts but has slipped out of frame; the moonbeam is
   faint, not cinematic.
5. Values: FAIL (worst). The nave floor's flags jump too far in tone between neighbours: a checkerboard. The doorway
   is lantern-lit camouflage, not clean tone groups.
6. Ramps: PASS (stone, moss, ivy, pale bark, vein: hue-shifted, 6-8 tones).
7. Paint: PARTIAL. Joints pooled, lit lips on cracks, but wall faces still lean on noise texture over stroke.
8. Contact: PASS (moss at the feet of walls and piers, the bare ring, AO, the hero on his step).
9. Detail where it counts: PARTIAL. Piers and lit wall faces detailed; the door, jambs and fallen arch are thin.
10. Life: NOT CHECKED in motion since pass 1 (animate() not run with the ruin; candle flicker, caps breathing, mist).
11. Seen as the player sees it: PARTIAL. Study camera, Ossuarch for scale; the church tile not yet seen in the game.
12. Skeptic round: against the old-growth judge scene, this one is flatter in light (no strong beams) and busier in
    the floor.
Section 2b: the new pieces are still scene-local in places (the church walls, piers and altar are one generator,
ruin.py, but not yet exported as separate landkit objects with sprites, collision and combat data).
Next when Derek says go (worst first): 1) the floor's checkerboard (closer tones), 2) the doorway and its fallen arch,
3) the moonbeam and candle in frame, 4) the ruin's pieces exported as game objects, 5) the church tile seen in game,
6) run it animated.
Section 8 (to return to): metal and armour, the environment agenda, repainting the effects, the effects still to
build, melee.
   Derek: "I agree, it also needs the forlorn looks of desolation, and maybe an ancient rusted away relic. And the rock
   is a reused asset." (Taken as go for the plan: floor, doorway, the relic, a unique piece for the boulder, beams.)
16. Floor: flag tones and temperatures between neighbours halved (a floor, not a board). Desolation: grey leaves no
    one has swept, drifted against the inside of the walls and the piers' feet; a desolation grade (colour drained
    toward cold grey wherever the warm lights do not reach, the night a step deeper; lantern and candle untouched).
   Graded: desolation reads (cold grey drained colour, unswept leaves at the piers and walls); the floor a floor.
   Derek: "sap in the world will look like dark blood" (MASTER_RULES section 5).
17. Shared bark: every limb scar weeps one to three runs of dark-blood sap down the pale skin, glossy red-black and
    beaded on the moon side where fresh, crusting brown and thinning as it dries (game trees and scenes alike).
   Graded: an eye weeping blood down the pale vein-tree; uncanny, right for the Wood.
18. The doorway: jambs stand (dressed stones, taller and cleaner than the walls), a worn sill stone across the door,
    the arch's stones as true wedges with a carved moulding band, the keystone with an incised eye (the old faith's
    hint, echoing the vein-trees' eyes).
   Graded: the jambs frame the Ossuarch at the door (a gateway); their faces still too clean for their age.
   Derek: "I like the idea of some more dying trees having weeping eyes. Brings the dead god more into it." (next)
19. The relic: the fallen iron bell (tools/landkit/relic.py, one painter for game and scene), on its side half sunk
    in the nave floor, mouth a dark hollow, rusted almost away (scabs, pits), the crack from the lip, the inscription
    band worn smooth, the loop broken to a stub, the clapper apart, its rust bled into the flags.
   Graded: the bell reads as a dark rust blob half hidden behind a pier (too dark, wrongly placed).
   Derek: "a yellowing gross eye weeping, leaking blood sap" on more dying trees.
20. Shared bark: a dying level; a dying tree's scars open into weeping eyes (swollen bark lids, jaundiced white with
    bloodshot veins, rheumy milky iris, wet glint, raw red lower lid, long fresh runs of blood sap); two in five of the
    scene's trees dying, their eyes lower on the bole. The bell moved into the open nave and lit truer.
   Graded: weeping eyes on the dying trees, the dead god in the Wood; but the eye ~6 px (reads as a sore), the runs
   step like a ladder; the bell visible but half behind the right jamb and mouth-on (a dark dome).
21. Weeping eyes 2.4x (an eye big enough to be one); runs wander slowly; the bell turned three-quarters, clear of
    the jamb.
   (The bell solved into place from the frame: on the nave axis inside the door, where the pilgrim looks.)
   Graded: the eye reads as an eye; the bell visible but reads as a barrel or pumpkin (no waist, no flare) and too
   evenly orange.
22. The bell's true form (a slim waist flaring hard to a thick lip, the shoulder stepping in to the head) and iron
    (near black-brown, orange only in bloomed scabs).
   Graded: at its true size (~22 px) a bell on its side does not read; the mouth dominates, the lantern pushes orange.
23. The bell rebuilt upright, resting mouth-down where it fell (fallen bells come to rest so), half sunk in the broken
    floor, tilted where one side of the lip bit deeper: crown with the loop's stub, shoulder, slim waist, flare, thick
    lip, a raised sound-bow; near-black iron, orange only where it bloomed, the worn inscription band, the crack from
    the lip; the clapper rolled away.
   Graded: the silhouette reads (crown, shoulder, sides); sunk too deep (the flare and lip buried: a helmet), the
   scabs too big and orange.
24. Sunk only a hand, so the flared lip shows; the bloom fewer, smaller, browner.

## Rules check after pass 24 (the 15-minute reminder; every checklist line)
Re-read MASTER_RULES (incl. 2b everything-in-a-scene, 2b.6 tiles, sap is dark blood, see-through total, true scale).
Lore detail in the piece: the bell ("If you hear a bell in the Wood ... ours are all grown shut"), the weeping eyes on
the god's veins, the bare ring where the Wood grew away from what hands laid, the blue caps over the hollow.
1. Brief: PASS.  2. Scale: PASS.  3. Form: PASS (the bell upright now, its silhouette still weak).
4. Light: PARTIAL (moonbeam faint; candle out of view).
5. Values: PARTIAL (the floor calm now; the bell does not separate from the flags; the jambs' faces flat).
6. Ramps: PASS (iron re-ramped near black-brown).  7. Paint: PARTIAL (walls lean on noise over stroke).
8. Contact: PASS (stains, drifts, moss at feet, the hero on his step).
9. Detail where it counts: PARTIAL (the bell's rings; the jambs).
10. Life: NOT CHECKED in motion (animate() not run since pass 1).
11. Seen as the player sees it: PARTIAL (the church floor tile not yet seen in the game).
12. Skeptic round vs the judge scene: weaker light drama; stronger story (bell, eyes, door).
2b: the boulder is a reused asset (must go: the fallen capital); the ruin, bell and capital not yet exported as game
objects (sprites, collision, combat data).
Worst failure: the bell's readability (it is the scene's focal relic). Then the boulder, the jambs, the light, motion,
export.
Section 8 in view: metal and armour, the environment agenda, repainting the effects, the effects still to build, melee.

## Rework (2026-10-07, stage 1 of docs/archive/REWORK_AND_SEEDS_PLAN.md)
- **From the engine:** the pale trunks warped and channelled; normals unblurred; the forest floor round the chapel
  from `litter_ground.py`.
- **The nave floor:** the retired tile (`tiles_ruin.church_flags`, a flat picture) replaced by real stones, the new
  shared `ground.flags_height`, by chapter 4:
  - coursed flags, each course offset and its own flag length;
  - each flag a plane at its own tilt and settle, with a bevel and planar chips;
  - some sunk, some cracked across with the far piece dropped, a few gone to earth;
  - joints between, packed with leaf-mould and moss creeping out of them.
  - All of it height in the world, so the moon and the candle light each flag through its real normal.
- **Graded:** C+ (it was C). The floor reads as old laid stone, not a texture. Its worst failure stands: the bell.
