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
