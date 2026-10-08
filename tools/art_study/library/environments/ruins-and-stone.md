# Ruins and stone

What people built, and what time and the god did to it. Ruins are everywhere in the game: the Fallen Monastery, the
Drowned Village, the Fallen Watchtower, the barrows and crypts and the Famines in Act I; Reliquary Avenue and the
Buried Chapter-House in the Ossa (Act II); wayside chapels of the old road wherever it ran. The god's body meets
them from below: in the Hollow Wood "the roads were there first, and the Wood grew away from them the way skin grows
away from a nail"; in the Rib Crypts the flagstones lift as something breathes beneath; on the Moor the flesh comes up
through the joints of the old paving. Ruins are the god's scars, where it was worshipped.

## The real thing
The ecosystem chapter is [`ecosystems/cities_and_ruins.md`](../../ecosystems/cities_and_ruins.md): a ruin is a
building plus time. The roof goes first, then the floors, then the walls from the top down, course by course, with
rubble spilling outward; plants root in the joints (moss, grass, shrubs, then trees that split the walls). Roads keep
their line after their surface has gone.

The art chapters:
- [Chapter 1, detail and nuance](../../chapters/01-detail-and-nuance.md): detail is history; correlated variation;
  edges carry the story, interiors stay calm; old paving flags, weathered column stone, wrought iron.
- [Chapter 2, ruins, ash, rock and scree](../../chapters/02-ruins-ash-rock-scree.md): Pompeii paving and ruts;
  Doric drums, anathyrosis faces and cramp pits; colonnades that fall like dominoes along one direction; marble's
  inverted shading (black crust where rain never reaches, bleached tops); Angkor's roots following the joints (the
  template for the god's flesh); robbed abbey walls; collapsed walls falling mostly to one side; the cause masks.
- [Chapter 4, stone and caves](../../chapters/04-stone-and-caves.md): at 5 cm a pixel a stone is 8 to 12 px, so a
  smooth dome becomes rings of tone (pillow shading). Stones are **faceted solids**: a tilted top plane, 1 to 3 planar
  chips, a one-pixel bevel, a dark joint; three tones for a 10 px stone; normals never blurred.

**True scale of built things** (MASTER_RULES 5): built things have one fixed true size each, sized from real
buildings. A man is 2 yards. An ancient stone church of the old road is about 15 x 9 yards, walls a yard thick and 6
to 9 yards high, piers half a yard round; a course about 0.4 yd, a block about 0.9 yd long; a door about 1.5 yd wide.
Check every built piece against the hero beside it before painting.

## How it is built
**Causes first:** place the building whole, then age it (roof first, walls from the top, rubble outward), then let
the land's own ecosystem in by its rules (moss and fern in wet shade, grass in light, saplings on the rubble; in the
Wood, a bare ring where the roots turned aside). Every mark on the stone is placed by a cause mask, computed before
any colour: rain exposure, edge distance, water path, traffic path, wind, age, burial.

**Objects and methods:**
- The chapel (`landkit/ruin.py`, `chapel(seed)`): walls laid in real courses in each wall's own coordinates, piers,
  the fallen west arch, the altar block, lifted flags; [columns-ruins-iron](../objects/columns-ruins-iron.md).
- Columns and fallen drums (`column.py`, ray-marched Doric shafts, 20 flutes, drums off true, anathyrosis ends) and the
  gore pillar (`gore_pillar.py`): [columns-ruins-iron](../objects/columns-ruins-iron.md).
- The fallen bell (`relic.py`) and the Gate's forged iron (`gate.py`): [columns-ruins-iron](../objects/columns-ruins-iron.md).
- Paving, rubble and the locked craggy floor (`ground.paving_height`, `paving_poly`, `craggy_height`):
  [stones-rocks-paving](../objects/stones-rocks-paving.md), [ground-generators](../objects/ground-generators.md).
- [Form and depth](../methods/01-form-and-depth.md), [ray-casting](../methods/02-ray-casting.md),
  [light](../methods/04-light.md) (moonbeams through broken roofs, the candle in the tenth trunk),
  [values, ramps, dither](../methods/05-values-ramps-dither.md) (no dither on stone faces).

## Its scenes
- **The painted ruins, `art_study/painted_scene.py`** (2026-10-06; earlier sketch `painted_ruins.py`). A broken
  pillar, a wall fragment, gravestones, rubble, grass and a puddle, as one height field ray-cast in iso under the moon
  and a flickering brazier. Derek on the first ruins: "I think you can do better on the environment and ruins, refine
  it all." The result became the painted standard's reference (`docs/PAINTED_STANDARD.md`) and one of the best pieces
  MASTER_RULES sets side by side. It predates the form law and still shades some detail into colour.
- **The night chapel in the Hollow Wood, `art_study/ruin_scene.py`** (log `landkit/passes/ruin_scene.md`, 24
  passes). A roofless chapel older than the Wood, at true scale (15 x 9 yd nave, walls 1.1 yd thick and 6.5 to 9 yd
  high, piers 0.5 yd, a 1.6 yd door); the bare ring round it; a ring of blue caps over the crypt; the candle in the
  tenth trunk; weeping eyes on the dying trees; the fallen bell, rebuilt upright mouth-down, sunk a hand. Ancient
  ashlar (blocks of many lengths, worn round, each its own stone, spalls, stains, lichen); piers with plinth, moulding,
  fluted drums and plane-sheared tops; a desolation grade. No overall grade from Derek; the last skeptic round: weaker
  light drama than the judge scene, stronger story.
- **The Gate in the Flesh courtyard, `flesh_scene.py`**: Pompeii paving, a Doric colonnade, a collapsed wall, rubble,
  the gate of basalt megaliths and forged bars. See [caves-and-the-organic-deep](caves-and-the-organic-deep.md).

## What worked
- Building from a real ruin, not imagination: the Pompeii paving read as paving at the first render, which no tweaking
  of invented flags had done; the columns from chapter 2 read as old at once.
- Ashlar with even courses but blocks of many lengths, each its own stone and temperature: not modern brick.
- Walls toward the camera broken low and far walls high, so the eye goes into the nave.
- Dressed blocks keep a crisp arris with faces darker than their tops: blocks, not lumps.
- Chisel facets on rough-hewn faces, each a small plane in its own tone; columnar basalt prisms for cave and gate rock.
- The hero stands on one whole level surface (`settle_hero`), and that surface never hides him.

## What failed (traps)
- Domed, pillowed stones (chapter 2's Pompeii recipe): cartoony. **Superseded by chapter 4's tilted planes.**
- Flags laid square to the screen read as a brick wall; lay them on the world's axes (diamonds).
- Every bed joint dark and identical: stripes. A floor whose neighbours jump in tone: a checkerboard (halve the steps).
- An exposure mask leaning on occlusion bleached a column's whole top "like a sock"; the shade side with no sky or
  bounce lost its flutes in flat blue.
- Pieces lit for an open sky left so when the scene became a cavern: a collage. Re-light everything when the premise
  changes.
- The bell at its true 22 px on its side read as a barrel or a pumpkin; resting mouth-down, sunk too deep, a helmet.
- A reused boulder in the chapel (fails 2b.3); a 15-line stand-in bark on its trees.
- A root plate and log from the plan standing in the doorway: keep the threshold clear (no log within 4 yd, no plate
  within 5).

## Derek's rulings (verbatim)
- "I think you can do better on the environment and ruins, refine it all."
- "trees come in many forms ... Whereas ruins and fortresses will be fixed. True to scale."
- "ruins must be true to scale"; "the bark on the trees in your scene looks weak and unrefined".
- "the hero is standing through the ground and rock that he should be walking on, so if it curves, he must follow
  along. The stone needs more work."
- "I agree, it also needs the forlorn looks of desolation, and maybe an ancient rusted away relic. And the rock is a
  reused asset."
- "the gate should have extruded iron bars"; "The gate needs to look more brutal and imposing and ancient".
- "the stone tiles look too similar"; "so why can't we apply that to everything? look at the flat shitty texture of
  the back walls".
- "The craggy look looked really good. Lock that tech for later areas." (MASTER_RULES 0b)

## Status and what is next
- The chapel is in work at pass 24. Worst open: the bell's readability, then the reused boulder (to become a fallen
  capital), the jambs, the moonbeam and candle in frame, motion, and export.
- The church floor tile (`tiles_ruin.py`, `church_flags`) is the retired tile road; the floor should move to a
  world-position generator with faceted stones.
- None of the ruin pieces are exported as game objects yet (sprites, collision, combat data);
  `cities_and_ruins.md` lists the set still to craft: wall segments by age, graves, braziers, wells, timber frames,
  roof states.
