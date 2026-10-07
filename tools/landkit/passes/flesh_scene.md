# The Gate in the Flesh, Ashen Moor (tools/art_study/flesh_scene.py; landkit tooth.py, fungus.py; tiles_moor putrid_0)
Derek's design (2026-10-07): fangs in a line, putrid flesh and fungus spreading, a pulsing vein diving underground, giant
fungi as trees, a pool of pus and blood, a cystic pore with a ruin round it, a 3D eye blinking pus into the pool, the
ground pustulating slowly, a huge gate at the back for a mini boss. The Jaw (moor_scene.py) and Cap Hollow kept to return to.
Tile putrid_0: 1 camo (big hard patches, slot blisters, cross mould); 2 finer mottle, dithered edges, round blisters, fuzz.
1. Graded: the cyst strong; fangs, a fungus, the flesh spreading, pylons. FAIL: the gate cropped (arch off-frame);
   pustules read as little yellow mushrooms everywhere; the vein separate red worms (one from inside the pore); the
   lantern-lit ash confetti-noisy; the right fungus's cap off-frame.
2. Camera back; pylons four vertebrae (the arch in frame); pustules fewer, flesh-coloured yellowing at their heads; the
   vein in long dark arcs from the cyst's rim; the ash tile's scatter halved; the fungi moved into frame.
   Graded: arch still off-frame; pylons read as wedding cakes; doorway a slit; vein floats; ash confetti.
3. Gate forward 1.5 yd, doorway 3.2 yd; pylons as vertebrae (a body, transverse wings, a spine jutting forward), darker stained bone; the vein humps out of the ground; the ash quieted.
   Graded: the gate reads (bone arch over a black doorway, doors ajar, pylons in the swell). The white dash grid on the ash is my thread pattern (a lattice over too wide a band), not the ash.
4. Threads as sparse wandering contour lines, only in a narrow band where the flesh creeps into the ash.
   Graded: the ash clean, threads wandering. FAIL: the eye an egg (flat yellow ball, no lids at rest, no socket), the pool hidden behind the cyst's ruin.
5. The eye larger and moved into the open with its pool; heavy fleshy lids always there (the upper over a third, coming down in the blink), pus crusted on both margins, the socket's crease; the white round, off-white yellowing to the rim, bloodshot threads, a rheumy iris, the wet glint.
   Graded: the eye reads as an eye in its socket. Derek: "looks pretty bad so far. Remove the cyst, we can save that for
   later. The mushrooms should be shaggy manes"; "the teeth should run horizontal with the gate built into them";
   "make the eye where the cyst was, looking up, and include the folds and everything in the flesh".
6. The cyst removed (in git history); the teeth one row across the back, diminishing outward, the gate built into it
   (its posts the two greatest fangs, the arch from fang to fang, the doors between); the eye where the cyst was,
   looking straight up, lying in the ground, set in concentric folds of flesh with radial wrinkles shaped into the
   height field; the fungi giant shaggy manes in groups (fungus.draw_shaggy: shaggy upturned scales, brown crown, the
   rim dissolving into dripping ink).
   Graded: big step: the row of teeth with the gate built in, shaggy manes in groups, the eye looking up from its folds.
   Derek: "is the ground a tile? Needs to look more alive with the mycelium threading in and out".
7. The flat contour threads replaced by living mycelium strands from the manes' feet, the eye's folds and the fangs:
   above ground with a shadow, diving in through small dark holes and surfacing, branching, a slow glow travelling
   along them, the tips creeping as the loop runs.
   Graded: the mycelium nets the whole ground like scribble, dotted.
8. Fewer, shorter strands, continuous lines (finer steps), each fading as it reaches away from where it grew.
   Graded (pass 8): the mycelium calmer, threading in and out. Derek: "the eye should be elliptical and seen slightly
   from the side, looking up, so we can see the vitreous fluid transparency"; "do 40 refinement passes with increased
   detail, adhere to the rules" (passes 9-48; a written rules check every five passes).
9. The eye an almond seen a little from the side, gazing up: the iris high on the ball, foreshortened, its fibres
   radiating and a dark limbal ring; over it the cornea's clear dome (the iris seen through it, a refraction line at its
   foot, a cold sky fresnel rim, the gloss and a fainter reflection); heavy folded upper lid, raw lower lid, pus on both.
   Graded (9): the eye an ellipse gazing up through a glossy cornea, in a crater of folds; but small, flat, lids unclear.
10. The eye larger (1.7 yd); the upper lid thick folded hide, pus and coarse hairs along its margin.
11. The ball shaded round: the upper lid's shadow on it, a wet line along the lower lid.
12. The pool: a dried yellow-brown crust round it, rings spreading where the drops fall.
   Graded (10-12): almond lids with pus and hairs, the iris high on a glossy ball, a crusted pool.
   Derek: "pull the shaggy manes and refine them as an asset later, just add some broken pillars instead, give some
   structure to the place so it feels like an important forgotten courtyard"; "the eye should be more bulbous".
13. The eye bulbous: swelling up out of its socket, rounder, a strong round falloff, the lids stretched over it.
14. The shaggy manes out (kept in fungus.py); the courtyard floor in old flags (the church_flags game tile) with
    ash drifted over it at its edges and the flesh spreading across it.
15. A colonnade of fluted pillars on plinths, two rows to the gate, broken at every height, those by the eye snapped low.
16. Fallen drums lying across the flags.
   Graded (13-16): it reads as an important forgotten courtyard now: flags under ash and flesh, a colonnade of broken pillars, the gate in its row of teeth, the bulbous eye. FAIL: the drums read as boxes; the pool a gold bowl (the crust too yellow, the hollow too deep); a red arc of vein floats left of centre; the plinths stained flat red.
17. The fallen drums round: a cylinder's light across them, flutes along them, ash in the grooves.
18. The pool shallow and level, its crust thin and dark.
19. The vein seated: dimmer skin, its shadow on the ground, fine capillaries branching off it pulsing faintly.
20. The flesh on the plinths patchy with a creeping edge.

## Rules check after pass 20 (re-read MASTER_RULES 2b and the checklist)
Lore: the Moor as the god's cheek; Derek's design. Light PARTIAL: only the lantern; no warm/coloured local light casting
(the gate's deep glow will be it). 2b.1 FAIL: the eye, pillars, drums and gate are painted in the scene file, not landkit
assets yet (to move in later passes). Tiles PASS (ash, putrid, flags). Life NOT CHECKED (animate before the end).
Worst first: the pool, the floating vein, the light.
   Graded (17-20): drums rounder, plinths patchy; the pool still a gold dish; the vein's last arc floats on the swell.
21. The pool mostly blood, the pus in dull sour streaks.
22. The vein ends diving into the floor before the swell.
23. The gate's deep glow: something breathing red far in the doorway, a warm-red light on the doorway's edges and the
    ground before it.
24. The fangs' enamel: a gloss line, long craze-lines, the gum's swollen collar at each foot.
   Derek: "Eye is rated at d- needs a ton more work"; "tiles look terrible and reused, rule was every piece unique
   and a work of art".
25. No stamped tiles: the ground is painted where it lies (landkit ground.py): ash with drifts, crusted cracked
    plates, cinders and bone grit; flagstones laid course by course, every stone its own size, tone, tilt, chips,
    cracks, sunk or gone; the flesh in swollen lumps, deep creases, two nets of veins, bruise and rot, wet tops.
26. The eye rebuilt as a true ball (landkit eye.py), ray-cast along the camera: the white yellowing to its rim,
    branching vessels, the lids as shells over it with an almond opening that closes in the blink.
27. The cornea a clear dome: each ray refracted through it to find the iris (fibres, crypts, collarette, limbal
    ring, pupil); fresnel sky at its rim; sharp highlights of the moon and the warm lights.
28. The lids: folded skin, the margin crusted with pus, coarse hairs, the wet meniscus, the caruncle.
   Graded (25-28): the eye a ball at last, the cornea clear, but it stares at us, the lids a black band; the ash
   cracks a hex lattice; the flags a brick wall; the pool lay on the socket's folds and read as a gold bell.
29. The pool moved off the socket and its hollow levelled.
30. The eye gazes up and a little aside; its pupil smaller. The lids made flesh: folds running along them, the
    margin rolled and raw, veins, a red warmth of light through thin skin, a dull sheen, longer coarse lashes.
    The ash cracks wander (warped cells, broken lines); the flags lie in wandering hand-laid courses, bigger, their
    tones wider apart, their joints thinner and ash-packed, their edges ragged.
   Graded (29-30): lids flesh at last, the pool level; but the ball sits on the ground like a helmet, the flesh
   near it a pink glitter, the pool's marbling one big gold sign.
   Derek: "Getting better but this whole scene will need a lot of work, and make notes on the final product with the
   organic parts when I pass it" -> passes/organic_notes.md, kept as I go.
31. The eye sunk into its socket, the socket's ring raised round it; the lids' foot darkened into the flesh.
32. The flesh calmer: larger lumps, few pores, finer veins, the wet sheen only on the tops that face the light.
33. The pool finely marbled, mostly blood, the pus in thin streaks.
   Graded (31-33): the eye in its socket now, the flesh calmer; but a plinth's ghost lies over the eye, it shrank,
   the far lid unseen so the ball's top is bare; the pus reads as gold leaf.
34. The eye moved clear of the plinth and made larger; the lids thicker, standing proud of the ball, the far lid
    rising over the eye's top; the opening narrower; the cornea's dome forward to clear them.
35. The pus dull and sour in thinner streaks.
   Graded (34-35): the eye reads at last, an eye in thick folded lids; the white a cold grey; the pus a thin line;
   the drips straight lines through the air.
36. The white sallow and sick: warmer, blotched, yellowing to the lids, twice the vessels, a flush round each.
37. Pus welling in glossy beads along the lower margin, crusted thick in the corners.
38. The pus runs over the folds' own surface from the lower lid down into the pool, a wet trail behind each drop.
   Graded (36-38): the white sallow, pus runs reading down the folds into the pool; the pool's hard rim a rug.
39. The pool's edge soaked into the flesh: the crust patchy, the rim soft, a meniscus catching light on its far edge.
40. RULES CHECK (written, every 5 passes), against MASTER_RULES section 4:
    1 Brief: the eye's brief met at last (3D, bulbous, elliptical opening, from the side, looking up, fluid seen through,
      pus blink and runs into the pool, in folds). 2 Scale: eye about 3 yd across beside the Ossuarch, true.
    3 Form: the eye is ray-cast now; the ground lit per pixel. FAILS: the fangs are still flat banded cones, the vein a
      flat pink pipe, the iron doors flat panels, the columns smooth and blue-grey.
    4 Light: moon plus the gate's glow and lamp; the eye takes both in its cornea. 5 Values: the flesh field too busy at
      mid-distance; the back swell needs a quieter tone group.
    7 Paint: ground now unique everywhere (no tile, rule 11 met by having no tile at all).
    8 Contact: the lids' foot into the socket; still weak where columns meet flags.
    10 Life: blink, runs, pool rings, breathing wave, vein pulse: not yet checked animated.
    11 Seen as the player: Ossuarch for scale, game camera. 12 Skeptic: worst difference now the fangs, then the vein.
   Lore read for the fangs: the hermit of the Fallen Watchtower, "a ring of broken stones there, shaped like teeth,
   round a pit of warm ash ... There was a sandal at the edge, and blood dried on the stones"; and "black glass forms
   where a Husk's blood ran into the ash". Rules check: section 6 says no red light; the gate's red glow broke it.
41. The fangs ray-marched (landkit fang.py): an oval section, five ridges and a keel, the snapped tip showing
    dentin, growth lines, crazing, stain in the grooves, tartar at the gum, blood smeared low and running in
    threads to beads, gloss and a lit rim; the height field sampled from the same shape for shadows. The gate's
    glow made a dim amber (no red light).
   Graded (41): real form at last, but the blood ketchup-bright and everywhere, a dither checker over all the
   enamel, the shape a flared traffic cone.
42. The fang's body full and near-parallel low, tapering hard to a point that hooks back and aside; the dither only
    where tones meet; the blood dark red-black, a low smear and a few thin threads.
   Graded (42): fangs at last, ivory, hooked, wet; but a chrome stripe down the shade side, the checker still in
   broad areas, the tartar a tan band, a clean line where they meet the flesh.
43. The warm highlight soft and weak in the shade (no chrome); dither only right at tone borders; the tartar patchy;
    the flesh climbing each fang's foot, lumpy and wet, with a dark lip where it ends.
   Graded (43): the fangs clean ivory, the flesh climbing them; but its edge a smooth band.
44. The flesh's edge on each fang torn and ragged, tongues of it reaching up the enamel.
45. The vein rebuilt (landkit vessel.py): a true lit tube of dense spheres along a meandering 3D path that dives
    under the ground (hidden by depth) and humps out; blue-violet skin striated along it, valves swelling every
    yard and more, the pulse a travelling bulge with a dull red flush, the moon along its top, warm light on its flank.
   Graded (44-45): the fang's flesh ragged; the vein round and lit at last, but a thin hose with hooked ends lying
   on the flesh, too straight.
46. The vein thicker and mostly a half-buried ridge under the skin, arching clear only at its crests and diving
    right under at its troughs; meandering on its own scale; the flesh pressed dark along both its sides.
   Graded (46): thick and lying in the flesh, but in grub segments (valve creases), each dive ending in a round cap.
47. The valves a faint swelling far apart, no crease; the skin closing over the vein wherever it nears the ground,
    so it sinks into the flesh rather than ending.
   Graded (47): overcorrected: the skin swallowed nearly all of the vein.
48. The ridge raised (its top two-thirds above the skin), the skin closing only right at the ground line.
   RULES CHECK at 48 (end of the 40-pass run), MASTER_RULES section 4:
    1 Brief: met for eye, fangs, vein, pool, gate, courtyard; the lore's sandal and black glass NOT yet placed.
    3 Form: eye, fangs, vein now true 3D (eye.py, fang.py, vessel.py). FAILS: doors flat panels, columns smooth and
      blue, the bone arch a plain tube.
    5 Values: the flesh field still busy at mid-distance.
    7 Paint: ground unique everywhere (ground.py); the fangs' flesh skirt a regular red sawtooth (worst new fault).
    8 Contact: fangs' feet in flesh (too regular), the vein pressed into the flesh; columns on flags still weak.
    10 Life: still not checked animated (blink, runs, pulse, breathing, gate glow).
    11 MASTER_RULES 2b.6 (tiles 320x160 with variants) conflicts with Derek's newer "every piece unique": ground.py
      generates per world position; asked Derek to confirm the rule change before rewriting 2b.6.
    12 Skeptic, worst first: the fang skirts, then the doors and arch, then the columns.
   RULES CHECK (reminder): re-read MASTER_RULES and the Moor's lore (the hermit's tooth-ring; black glass from blood
   in ash). Checklist as at 48; the worst failure is 7/8, the fangs' flesh an even red sawtooth skirt.
49. The fangs' flesh edge set by world position (not the angle round the fang), so no two fangs or sides match;
    it frays upward in patches; darker, the ground's own flesh, bruised in places.
   Graded (49): fixed: each fang's flesh its own, uneven, frayed, dark. Next worst: the doors and the bone arch.
   Derek: "The ground teeth and tiles need more work. Eye looks great, document it"; "yes" (the ground rule);
   "the bone sucks too, I agree". The eye documented in full (organic_notes.md) and marked approved; MASTER_RULES
   2b.6 rewritten: ground is a world-position generator, every piece unique, no fixed tiles.
   Derek: "and the bone sucks too, I agree"; "good lore catch, feel free"; "the rock sucks too".
   Order of work now: the bone arch, the teeth, the ground, the stone (pillars, drums, plinths, blocks), then the
   lore's sandal and black glass.
50. The arch a great rib (landkit bone.py), ray-marched: a flattened section, knobbed heads gripping the two fangs,
    a slight warp; weathered as bone really goes (cracks along the grain, the shell flaking, pits, grime low,
    spongy bone at two breaks, dried sinew binding its heads, old blood seeping); lowered into the frame above the
    doors. A skull ray-marched at its keystone (cranium, cheekbones, jaw, deep orbits, nasal hole), looking out.
   Derek grades the eye B+ (recorded in organic_notes.md). Graded (50): the rib read as a dark brown gable: a bug in the tube distance (the along-axis offset dropped) painted it all as end-sinew; fixed.
   Graded (50 fixed): the rib reads as bone, bound with sinew, the skull at its keystone; but the whole gate small and polite. Derek: "The gate needs to look more brutal and imposing and ancient".
   RULES CHECK (reminder, 50): MASTER_RULES and the Moor's lore re-read (the mouth "a door, warm and wet, that opened
   and shut"; the pilgrims "walked out on the breath and fell down on the cheek" -> the gate's brief, awaiting
   Derek's go). Checklist: 3 Form: eye, fangs, vein, arch true 3D; stone and doors not. 5 Values: fangs lack clear
   tone groups (speckled light side, flat grey shade). 7 Paint: fang enamel noisy. Worst now by Derek's order: teeth.
51. The fangs: each its own fate (a tilted jagged break with a spall scooped from one side, or split the whole
    length, or whole), chips bitten from the keel; clean tone groups (light, half, core shadow, the flesh's warm
    light thrown up into the shade); growth lines only in the light; stain only down grooves and keel.
52. The fangs quieter: crazing few and long, growth lines faint, the dither only right at tone borders; broad tones carry the form.
   Graded (51-52): the fangs read as painted ivory: broad light, a firm turn, warm reflected light in the shade, each broken its own way. Still to do: their shade side a little flat; snapped caps could be rougher.
   RULES CHECK (reminder, 52): rules and lore re-read. The ground graded: the ash flat dirty concrete with too many
   black cinder dots and no form; the flags pale smeared slabs, no stone readable; the flesh still glittering by
   the socket. Worst: the ash and the flags.
53. The ash given form: drifts and wind ripples lit on the moon's side and shaded on the far side, the crests lit;
    cinders a quarter as many.
54. Each flagstone reads: a bright lip on its moonward edges, a dark fall on its near and right edges; the stone
    darker and more varied, worn paler where feet went long ago.
   Graded (53-54): the ash has form (drifts lit, few cinders); the flags still smeared: pale joints, a thin ash wash over too much.
55. The flags' joints darker and a little wider, packed with old ash; the drift over the yard pulled back, its thin edge narrower.
   Derek: "The ground looks pretty bad still". Why: the flags ran square to the screen, so in this camera they
   read as a brick wall painted flat; the flesh one same-sized net everywhere, no big shapes; no transitions, only
   hard cut-outs. Plan: A the flags re-laid; B the edges feathered; C the flesh in big folds.
56. The flags laid on the world's own axes (diamonds in this camera: a floor); near the flesh the stones heave,
    tip and crack, and the flesh comes up through their joints first.
57. The paving rebuilt as real form (STUDY chapter 1): each slab its own height (settle, tip, proud edges), arrises round on the path and sharp off it, dished by wear with water lying, spalls, offset cracks; lit through its own normals; colour from the same causes (bed, path, tooling, grime, lichen, wet). Better, still far from real. Derek ordered real-world studies first (chapters 02, 03).
   RULES CHECK (reminder, 57): MASTER_RULES (now with 2c: study first, a report per piece) and the Moor's lore
   re-read; chapters 1-3 read. Checklist: 3 Form: the paving height-first now, stone pillars and doors still not;
   5 Values: the yard pale and busy against the dark Moor; 7 Paint: joints all one width and colour; 8 Contact: the
   flesh meets the paving in a cut-out. Worst (Derek: "the stones and tiles look awful"): the paving. Applying
   chapter 2: Pompeii's pillowed basalt polygons, pale ash in the joints, a polished processional way, the flesh
   through the joints first (Angkor).
58. The courtyard paving rebuilt from chapter 2 (Pompeii): dark basalt polygons, pillowed, arrises round, hairline joints of pale ash, the processional way polished pale and bluer catching the moon, a warm weathered rind off the way, vesicles, rare lichen; the flesh lifting and tipping the stones near it. Reads as real paving at last.
   Graded (58): the flesh in every joint across the yard (its reach too far) and the joints too wide: cobbles, not Pompeii.
59. The heave only near the flesh; the joints hairline elsewhere, pale ash in them.
   Graded (59): reads as real lava paving: tight pillowed basalt, hairline pale joints, the flesh coming up through the joints only near its edge, the way polished. Next: stone sizes too even; the pillars and drums (chapter 2).
