# Cap Hollow under the Ribcage Bough (tools/art_study/hollow_camp.py; tools/landkit/hut.py): pass log

Brief in hollow_camp.py's header, from the lore (Cap Hollow; the hunter; the Ribcage Bough; the remains that turn
their heads toward the ring; white caps on the flat stones).

1. Form: the valley, the clearing, two derelict huts, the fire bin, the ribs (their own depth-tested renderer).
   Graded: composition works (huts flanking the fire, the Ossuarch in its light, two great ribs framing the hollow).
   FAIL (worst first): the valley does not read (the floor so wide the frame sits on flat ground); hut walls read as
   wire mesh (fibre texture across, not along); roofs flat camo (no shingle courses, no visible cave-in); ribs smooth
   tusks (no bone detail).
2. A narrow floor, banks climbing six yards inside the frame; the huts along the floor against the banks; the slabs
   as weathered planks (fibres along the plank, a gap under each course, butt joints, lit top edge).
   Graded: WORSE. The banks show, but the composition broke (the near hut hides the fire, the open camp gone); the
   trees wore the old dark oak bark (this scene was not using the Hollow Wood's vein-bark: the same stand-in fault
   Derek called out on the church); walls still mesh (6 px courses make a grid); the ribs hidden behind the bank trees.
3. The Hollow Wood's trees shared by every scene (wood_pale.py: the 12-pass vein-bark, weeping eyes; the church scene
   now uses it too); huts back flanking the fire at the foot of each bank; walls of tall upright bark slabs (ragged
   tops, dark gaps, fibres running up); the ribs rising from the banks' brows, before the trees.
   Graded: composition right again (huts flanking the fire, ribs framing, a dying vein-tree weeping in the foreground).
   FAIL: black T-shapes all over the hut walls. Zoomed: pure black, i.e. unpainted. A ray striking a thin (0.22 yd)
   wall's face lands a hair outside the wall's material cells (no material, never painted); the two grids alias.
4. Where a hit has no material, look inward along the surface normal for the material and wall position it belongs to.
   Graded: walls read as upright bark slabs. FAIL (worst): the story is not there (no remains, caps, hide): a camp,
   not Cap Hollow. Roofs camo, cave-in unclear; ribs smooth tusks; the lantern-lit hut face washed flat.
5. The remains (tools/landkit/remains.py): a picker's skeleton at true size (skull, open ribcage, spine, pelvis, long
   bones in the rags it died in, sunk as the ground takes it, moss on the oldest), the hunter's stick at its head with
   a strip of cloth; five round the fire, each its own age, every head toward the ring in the east.
   Graded: the remains do not show (only the sticks, as long dashed lines). At true scale a yard is ~18 px: a skeleton
   ~32 px, its bones one pixel; the world grid (0.04 yd) is coarser than the bones, so the height field loses them.
6. The dead drawn as a pixel artist draws a skeleton at this size (one-pixel bones, the skull a few pixels with its
   sockets, ribs as short strokes, the rag a dark fill, the stick with its rust-red strip), every point placed from the
   body's layout in the world (remains.layout: the reusable asset), depth-tested, lit by the fire and the moon.
   Graded: the dead show, bones in the firelight, sticks at their heads. FAIL: white scribbles (lit to glare), the skull
   not separating, no contact with the ground, the rags lost.
7. Bones ivory (light held under glare), a one-pixel contact shadow under every bone, the skull a step brighter with
   black sockets, the rags a faded cloth.
   Graded: seated in the earth with their sticks; too grey to pick out; the black sockets dominate.
8. Bones ivory a step up; the offerings: flat stones round the camp, each with shrivelled white caps still glowing
   faintly (the Flat Days' offering).
   Graded: the remains read (ivory skeletons, their sticks), the white caps glow on their stone. FAIL: one body inside
   the caved-in hut (shows through the roof's hole: bones floating at the roofline); the god barely shows through.
9. That body into the open. The god's hide in the valley's banks: slumps where the soil slid away, pale hide beneath
   (pores, deep creases, dark veins running downhill toward the ring, a split weeping blood-sap), the torn lip of soil
   hanging over each slump's upper edge.
   Graded: the hide is there but too small and too high (faint pinkish slabs behind the bank trees); two bodies too
   near the huts' walls and cave-ins (they read as misplaced).
10. The dead on the open floor only, clear of huts and bin; the slumps larger and low on the banks where the eye meets
    them.

## Rules check after pass 10 (the reminder; every checklist line)
Lore in the piece: Cap Hollow's pickers gone, the Ribcage Bough, the dead turning their heads to the ring with the
hunter's sticks, white caps on the flat stone, the hide and its veins toward the ring, the weeping vein-trees.
1 Brief PASS. 2 Scale PASS (huts 4x3, ribs 10-14 yd, bodies 1.8 yd). 3 Form PARTIAL (ribs smooth tusks).
4 Light PARTIAL (the fire leads; ribs cast no shadows; no moon shafts through the ribs). 5 Values PARTIAL (the
lantern-lit hut face washed flat; roofs camo). 6 Ramps PASS. 7 Paint PARTIAL. 8 Contact PASS (bones seated, stones).
9 Detail PARTIAL (ribs, roofs). 10 Life NOT CHECKED (animate). 11 As the player sees it: PARTIAL. 12 Skeptic: the
church has the stronger stone; this one the stronger story.
2b: tiles not yet built (trodden ash; hide through soil); objects not exported to the game.
Worst failure: the ribs (the god's presence carries the scene). Waiting for Derek's go.
   Derek: "The huts need a lot of work and why would a fire be between [huts], they should be around it. Add an eye or
   two and some disease to the trees. Base of ribs looks bad. Everything needs more detail and refinement x10."
11. Layout: four families, four huts in a ring round the fire-yard (13 yd floor), every door turned to the fire, the
    front left open for the pilgrim; stones re-placed round the yard.
   Graded: reads as a hamlet now (four huts round the fire-yard, the dead round the fire, the ribs framing). FAIL: the
   huts are blocky masses, roofs striped camo; trees out of frame.
12. Roofs: shingle courses that read (each lip's dark line on the course below, the top catching light, staggered
    shingles), the ridge log, moss in clumps on the shaded slope (dark edge, lit crown), the cave-in with rafters
    snapped short across the dark.
   Graded: roofs read (courses on the lit slope, moss heavy on the shaded). FAIL: a flat green slab in the doorway
   (no floor inside: the forest floor showed through); no openings in the walls.
   Derek: "huts should be open too, with doors and broken windows."
13. Inside: a packed-earth floor in its own dark (the fire's glow reaching in a little). Doors broken, each its own
    way (hanging ajar from its last hinge, fallen across the threshold, leaning in its frame), of bark planks.
    Windows in the end walls and the back: a dark opening under its frame, the split shutter hanging askew, a rusted
    nail.
   Graded: the huts open (a broken window with its split shutter, a door fallen across a threshold); walls still
   monotone grey sheds; almost no trees in frame (the wider floor pushed the Wood out of view); trees need eyes and
   disease (Derek).
14. The Wood in frame: giants on the banks' lower slopes and at the valley's far end. Disease in the shared bark
    (bark.py, a scene sets its level; 0 keeps older scenes as they were): cankers (sunken lesions, swollen cracked
    callus rims, bleeding black-red), galls (lumpy swellings), peeling flaps off raw flesh-dark wood. Three in five
    of this valley's trees dying and weeping.
   Graded: the Wood in frame but its trunks at the edges behind ribs and huts (disease barely reads here: a giant
   brought forward later, on its own pass). Derek's explicit note: the rib bases look bad.
15. The ribs: the ground heaves round each base (torn earth in a ring, clods); at the base the bone stained dark by
    the earth, roots gripping it, the god's hide in tatters on one side; bone that reads as bone (flatter in section,
    pores, long cracks with the grain, flaking); the snapped tip showing the honeycomb of marrow.

## Rules check after pass 15
Lore: Cap Hollow's four families (four huts), the hunter's sticks and the dead turning to the ring, the Flat Days'
white caps, the Ribcage Bough, the hide and veins, weeping and diseased vein-trees.
1 Brief PASS. 2 Scale PASS. 3 Form PARTIAL (huts boxy). 4 Light PARTIAL (fire leads; ribs cast no shadow). 5 Values
PARTIAL (hut walls flat grey planes). 6 Ramps PASS. 7 Paint PARTIAL. 8 Contact PARTIAL (rib bases abrupt). 9 Detail
PARTIAL (trees' disease out of view; foreground empty). 10 Life NOT CHECKED. 11 As played PARTIAL. 12 Skeptic: story
strong, surfaces weaker than the church's stone.
2b: tiles not built; objects not exported.
Worst: the huts' walls (Derek: "the huts need a lot of work"). Derek asked for x10 refinement: continuing.
16. Hut walls weathered: slabs leaning (gaps widening upward), a few fallen out to the dark inside, rot creeping up
    from the foot, moss climbing in tongues from the footing, grey lichen on the moonlit slabs.
   Graded: the moonlit hut (right) reads weathered (moss tongues, rot, lichen, a slab gone); the shaded hut (left) still a dark striped plane (its face away from moon and fire).
17. Shaded walls keep the sky's cold fill and the fire's light off the yard (slabs readable a step darker, not a black
    plane); a dying diseased giant brought into view at the yard's front left.
   Graded: the shaded hut readable; the giant at front left shows a jaundiced weeping eye bleeding sap down the pale bark. It now hides most of the left hut, and the eye's yellow ring is loud at this size (next: tone the ring, move the giant a yard out).
18. The giant a yard and a half out (the left hut back in view); the eye's jaundiced white sallow, not lit yellow
    (shared bark: the church's weeping eyes calm the same way, an improvement in the one place).
   Graded: the left hut back in view; the giant at the frame's left with two weeping eyes and cankers bleeding; the eyes still read yellow-orange in the firelight (the fire's warm tint on top of the sallow white), acceptable as 'yellowing gross eye'.
