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
60. The colonnade rebuilt from chapter 2 (landkit column.py, ray-marched): Doric shafts of 20 flutes, arrises worn soft, drums shifted off true, hairline drum joints, the top broken on a rough tilted plane and paler; rain exposure bleaching up-facing faces, black crust in the sheltered flute bottoms, streaks down from the break, pale ash packed in the low flutes, a damp salt band with pits at the foot, rust from a dowel joint; the fallen drums half sunk with their anathyrosis faces (smooth band, rough centre, square socket).
   Graded (60): true columns at last; but the shade side flat blue with the flutes lost, the bleaching wrapping the tops like a sock.
61. Sky light and the ground's warmth in the shade, the flute bottoms shut in more, bleaching only on faces that truly look up.
   Graded (61): true old columns, the fallen drums' faces read; the moon-turned-away faces still flat and dark. Next in the stone: the drums in a domino fall line, the rubble ridge; then the teeth from chapter 3.

   Derek (after 61): "A+ on the gore. The teeth still look lacking. And the ruins need more going on. The stone tiles
   look too similar. Throw a little dead plant life into the scene. And some gore tendrils running up the pillars with
   pustules emitting a sickly yellow light. And let's turn this into a cavern. The cinematography is lacking."
   Lore for the cavern: "The god held a room open inside itself, wide as the Moor and wider ... and in the room knelt
   our grandmothers' grandmothers"; the courtyard lies in that room under the Moor.
62. A CAVERN: the roof far overhead, one ragged hole letting the moon down as a single shaft (the scene's own
    moonlight hook in the engine; kit.SKY so every ray-cast piece is lit only where the shaft reaches); the ground's
    ambient low (darkness off the light); walls of columnar basalt rising out of sight round the courtyard; two
    great stalagmites and a lesser one framing the near corners.
   Graded (62): the mood at once (darkness, the fangs and columns caught in light, the lantern's pool); but no shaft
   on the floor: with the low moon the hole sat over the side wall, which shadowed everything; the stalagmites flat
   black cones.
63. A high moon (still from the upper left) so the hole stands over the courtyard; the beam made visible in the
    air (summed along each line of sight, uneven, drifting) with 420 motes of dust and ash drifting down through it.
   Graded (63): the beam and dust there, but the dust a starfield, the beam faint, the shaft's pool on dark flesh
   unseen; and the fangs and columns still glowing as under an open sky: the moon's highlight, rim and the fangs' tip
   glow were not gated by the shaft.
64. The moon's highlight, rim and tip glow gated by the shaft in every piece; the shaft turned onto the eye (the
    star), the pilgrim at the edge of its light, wider and brighter; the beam fuller; the dust a few soft motes.
   Bug (64): the columns' and drums' ground was read at their centres AFTER they were stamped into the height field, so each shaft began on top of its own column and the drums floated; the old flat paint showed beneath. Fixed: the ground saved at stamping.
   Graded (64): a scene at last: the eye glistening in the moon's shaft, the pilgrim at the edge of its light, the beam with dust, darkness round, the stalagmites framing. (The fangs measured dark, 0.1-0.2: the preview misled.) Next: the gore tendrils up the pillars with pustules giving a sickly yellow light; the stalagmites need form.
65. Gore tendrils up the pillars (Derek): raw-flesh ropes out of the ground at each plinth, spiralling up the shafts,
    thinning to creeping tips, a branch forking off the other way (vessel.py with a gore ramp and taper); pustules
    along them (chapter 3): tense domes, a creamy yellow centre under a glossy cap with a wet glint, a red halo, each
    breathing slowly; each a sickly yellow light on the ground and on every ray-cast piece, its glow hanging in the air.
   Graded (65): the pustules' light flooded the whole cavern yellow (25 lights reaching yards, summed), the fangs washed; the tendrils thin red threads, unreadable.
66. Each pustule's light a small local pool (short reach, weak), on the ray-cast pieces too; the tendrils thicker, the pustules larger, the air's glow fainter.
   Graded (66): the pustules read as glowing yellow beads on red tendrils climbing the pillars, each a small sickly pool; the moon's shaft still keeps the eye the star. Tendrils could be meatier and more fibrous (chapter 3). Next: the gate (Derek approved the plan).
   RULES CHECK (reminder, 66): MASTER_RULES and the Moor's lore re-read (the kneelers who sang inside the god: the gate's frieze). Checklist: 3 Form: the gate the last flat stand-in (box doors, a passage); worst by Derek's order now: the gate (approved).
67. THE GATE rebuilt (landkit gate.py, Derek's approved plan; lore: the mouth's door, the kneelers): two megalith posts of
    black basalt (1.8 x 1.6 x 8.5 yd, rough-hewn, leaning a little, out of the frame), a frieze of kneeling figures in a
    long file across each, worn nearly smooth; ash on the ledges, flesh climbing from the foot, lichen, rust running
    down below each hinge pin; a 5-yard doorway; two grille leaves of forged square bars (rails riveted at every
    crossing, a heavy frame, spear points), one ajar, one torn off its upper hinge and sagging into the flesh; the iron
    scaled, rust blooming where water sat, flaking along the grain. The fangs re-spaced so the posts stand between
    them; the rib lashed across the posts' faces as a trophy, the skull hung at its middle.
   Graded (67): imposing at last (two black megaliths out of the frame, the rib lashed across); but lichen in camouflage blotches, the frieze unseen (relief under a pixel, in darkness), the grille lost black on black.
68. The grille backlit: the ember glow stronger and a second light deeper in the passage, so the bars stand black against it; the frieze cut twice as deep; tendrils climb the posts too, their pustules lighting the kneelers from below; lichen small and few.
   Graded (68): the grille reads, black bars and rust against the ember glow deep in the passage; tendrils and pustules climb the posts. Still failing: the kneelers' frieze unseen (its face turned from every light); the rib reads as a plank; the leaves' rails and spear points lost in the dark.
   RULES CHECK (reminder, 68): rules and lore re-read; the lore's banked fire ("Bank it, Tam. Ash over the coals") answers the worst failure, the unlit frieze.
69. Banked offering-fires at the posts' feet: coals glowing through a crust of ash, a thread of smoke leaning in the draught, their low warm light thrown up the posts onto the kneelers; the rib rounder (no plank), bowed more.
   Bug (69): in gate.py the lights only multiplied the stone's colour, so black basalt stayed black however lit. Fixed: light adds to the value before the ramp, then tints.
   Graded (69): the posts read as carved black stone in the fires' low light, the kneelers' file shows across the band; the grille reads as forged iron (bars, rails, rust). The sagging leaf's rust a little too orange; the kneelers could be crisper.
   Derek: "Continue". The teeth next ("still look lacking"), from chapter 3.
70. The fangs from chapter 3: a rounded labial ridge with a groove each side and the keel behind (no even ridges);
    the tooth's gradient, saturated dentin-yellow at the gum to cool translucent blue-grey at the tip, the tip glowing
    when lit from behind; perikymata following the scalloped neck line, only in raking light; abrasion scratches up
    the face; the whole fangs worn to a polished facet with a brown dentin cup; the broken ones showing a glassy
    enamel rim, ringed dentin stained pink-violet by the god's blood, the dark pulp canal; tartar chalky cream ledges;
    the gum an inflamed glossy knife-edge collar, a black band where it drew back; light adds, then tints.
   Graded (70): the gradient and form there, but the fangs blazing orange-yellow, as if on fire: the added light (pustules, fires) too strong, the warm tint and the dentin colour stacked on it.
71. The added light halved and capped, the warm tint softer, the dentin less saturated.
   Graded (71): the gradient reads (warm dentin at the base to cool blue-grey up the fang), round, the front ridge lit; but the gum collar a jagged magenta sawtooth.
72. The gum's edge a smooth scallop following the neck line (up on the sides, down front and back), barely frayed; the collar a thin glossy band.
   Graded (72): the gum reads: a smooth scalloped collar, a thin glossy inflamed line dipping front and back, the dark band where it drew back; the fangs warm dentin at the gum to cool enamel up the shaft. Still to judge in better light: the perikymata, the facet's cup, the break's rings (most fangs stand in the dark).
73. No two stones alike (Derek: "the stone tiles look too similar"): big slabs with patches of small repair cobbles;
    mostly basalt, with pale pitted limestone slabs robbed from older work, red tuff, and a few re-used carved slabs
    with worn lines; each stone its own fate (cracked across with the far piece dropped, sunk under drifted ash, or
    gone to an ash-filled pit).
   Graded (73): the stones vary (paler slabs, repair cobbles, cracks), but the pustules' light tints the whole yard olive-green, flattening it.
74. The pustules' light on the ground halved: a local glow, not a wash.
   Graded (74): the yard reads as varied old basalt paving again, the sick light local; the whole shot holds (the gate backlit at the back, pustules on the pillars, the eye in the shaft).
75. Dead plant life (Derek; landkit deadplants.py): it grew only where the moon came down, in the joints, and died:
    46 tufts of dead grass round the shaft's footprint (straw blades bent and some snapped, pale where the moon or the
    lamp catch them, dark beyond); two dried thorn bushes by the fallen drums (forking twigs, thorns); a dead vine up
    the front pillar, its leaves curled brown. Each a true thin 3D stroke, depth-tested.
   Graded (75): the dead grass tufts read in the joints round the shaft and in the lantern's pool (first: none placed, the shaft falls on flesh; and all of it near-black off the light); the thorn bushes and the vine too dark to read where they stand. Next: let the thorns and vine catch a light; then more going on in the ruins.
   RULES CHECK (reminder, 75): rules and lore re-read; checklist: the ruins thin (Derek: "the ruins need more going on"): the worst open item. Chapter 2: a collapsed wall (stump, near rubble ridge, far dressed blocks), drums in one fall line, the capital furthest, islands of stone in ash.
76. More going on in the ruins (chapter 2): a collapsed wall on the left (a ragged stump of dressed courses, its top
    stepped block by block; its small core rubble heaped in a ridge at its foot; its big dressed blocks thrown further
    out; all half sunk in ash, ash on their tops, lichen, the courses cut in the stump's face); the fallen column's
    drums laid in ONE fall line from its stump, the capital upside down where it landed furthest (abacus slab, the
    cushioned echinus).
   Graded (76): the ruins built but unseen: the wall and rubble, and the drums' fall line, lie under the two great foreground stalagmites (flat black blobs).
77. The stalagmites smaller and pushed deep into the corners (framing, not swallowing); the fall line turned toward us; the wall brought in.
   Graded (77): the ruins show: the wall's stump at the far left with its rubble heaped behind the front pillar, the fallen column's drums in a line toward the lower right with the capital furthest. The stalagmites now out of frame entirely: the near corners lost their dark framing (to restore, smaller). The rubble reads as lumps more than dressed blocks.
   RULES CHECK (reminder, 77): rules and lore re-read. Worst open: the corners lost their framing; the cave rock painted as ground ash; the thorns and vine unlit.
78. Two smaller stalagmites back in the near corners; the cave walls and stalagmites painted as basalt rock (not the ground's ash); the dead plants catch the pustules' light.
   Derek: "The pillars look really weird and out of place now ... the painted texture and lighting is wrong, and the plants in the tiles don't look unique and novel"; "It's a good scene but nothing really blends smoothly. It all looks patchy and jumbled together"; "update the workbench with an animated picture of the area".
78. The cave walls and stalagmites painted as basalt rock; two smaller stalagmites back in the corners; the dead plants catch the pustules' light.
79. The pillars in the cavern's light: no open-sky term (gated by the shaft), light adding, the bleached caps gone; one air: a dim haze deepening into the cavern and one gentle grade; the flesh's edge feathering as a thin film over the stones.
80. The dead plants each their own (Derek: "don't look unique and novel"): tussocks of many fine blades dark at the root and pale at the tip, leaning with the draught, some flattened; single stalks with burst seed heads; dead ferns curled in on themselves; dead stems fallen in a jumble; straw, grey, brown or blackened; lit no brighter than the stones.
   Graded (79-80): the pillars sit in the cavern's dark now, the haze pulls the far things together; the plants each their own (tussock, curled fern, fallen stems, seed stalks) and quiet in the floor's light. Blending still to push: the flesh/paving and ash/paving edges, the rubble's lumps.
81. Blending: the paving runs out under the ash gradually, no hard edge: thick ash, then thin ash with the stones' tops showing and the joints still full (ash fills the lows first), then bare paving.
   Derek: "pull the pillars out, and keep the tendril on them, turn them into assets. Add some bits and pieces of skeleton. Then work on making everything cohesive. So everything looks ancient except this weird biological stuff coming through the cracks in the floor. This area can be an entrance to an underground area later after we fight the gatekeeper."
82. The pillars out, kept as the asset landkit/gore_pillar.py (shaft, tendrils, pustules; preview in landkit/previews); no tendrils on the gate posts. The flesh only through the cracks: a network of great fractures across the old floor, hairline far off, opening into wounds at the eye, the fangs' roots, the pool and the vein; the mound behind the gate old basalt rock; the paving across the whole floor to the gate's foot.
   Derek: "The sheets are fine too. We can have both."
83. Both (Derek): the cracks, and sheets of flesh welled up out of the bigger fractures and spilled over the stones. Graded (82-83): cohesive at last: ancient paving across the whole floor to the gate, the old rock behind it, the god breaking up through the cracks into wounds at the eye and the fangs' roots. Next: the bits and pieces of skeleton.
84. Bits and pieces of skeleton (Derek; landkit remains.scatter and a shared plotter): a skull rolled off on its own, long bones apart, loose ribs, runs of vertebrae, hips; five groups where their story puts them (at the gate's foot; by the eye, the flesh taking them; in the rubble; in the lantern's pool; by the great fang with the hermit's sandal and the blood dried on the stones).
   Graded (84): the bones drawn at true size but unread: pale specks on busy flesh. Moved the lantern's group onto the stones, the bone brighter (ivory under any light).
   RULES CHECK (reminder, 84): rules and lore re-read. Worst for blending: the rubble, capital, wall stump and cave rock lit as under open sky (pale grey, pasted); the fangs' gum skirts bright flat red.
85. The rubble and cave rock lit only by the cavern's light (the moon's shaft, the lamps); the fangs' gum the floor's own dark flesh, the collar dimmer.
   Graded (85): the rubble and rock sit in the dark now, the fangs' gums the floor's flesh; the flesh at the gate posts' feet still bright paint-red in the fires' light: darkened to the floor's.
