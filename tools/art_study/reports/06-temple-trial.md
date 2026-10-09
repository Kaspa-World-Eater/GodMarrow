# 06 The temple trial

**The piece:** the Red Shore's destroyed temple hall, the first piece built on the 3D road. The code is in
`tools/landkit3d/` (`temple3d.py`, `floor3d.py`, `parts3d.py`, `paint3d.py`); the pass log is
`tools/landkit/passes/thai_temple.md`; the review page is https://claude.ai/artifact/T28WGqopEAxcLm6v68hBer. Status: in
work, pass 8, **B** (the floor and the walls B+). Derek has not graded it yet.

## What the studies taught

**Chapter 09: Thai temples and spirit houses.**
- **The roof is the temple:** tiers stepping down to the porch, serpent bargeboards with their blade teeth, curling
  heads at the eaves and horned finials.
- **Stucco fails first,** baring the brick in irregular continents. Then the brick's joints erode and grow moss.
- **The roof goes first of all in a wet forest:** the tiles slide in sheets and the rafters stand bare.
- **The eight boundary stones** mark the sacred ground.

**The ecosystems (old growth, rainforest).**
- The floor is pit and mound: each fallen giant leaves its pit and its slumped root plate.
- The litter drifts into the pits and thins on the mounds, and rain stands in the old pits.
- In a rainforest, wet is everything: moss on every surface.

**The lore.**
- The founder ruled that the stair be swept every morning, and now it has not been swept. That one true detail is in
  the piece.
- The root round the guardian's head is the god's hint.

## Techniques: what worked

- **Real form for everything that overhangs** (the 3D road). As a height field, the same temple filled solid to the
  ground (graded D).
- **Tiles as real lapped courses,** so the light catches every course.
- **Carved relief as geometry,** never a flat painted face (the gable, pass 6).
- **Damage by cause, small and ragged:** rising damp low on the wall, the drip line high.
- **The floor as a height by cause, shared by the build and the painter** (`floor3d`, pass 7). The paint follows the
  real form because both read one function.
- **Moss bound to its real cushions,** with leaves lying over the rims.
- **Litter drifts by cause** through `litter_ground`, every leaf its own.
- **Water levelled below its rim,** with the far bank's dark mirrored along the far edge.
- **The occlusion pass as a map of shelter:** where the wind can't reach, the leaves pile up, as in the unswept
  stair's corners.
- **The walls by cause** (pass 8): rising damp with its salt tide, exposed edges first, run-off under the sills,
  settlement cracks with the sheet beside each dropped. Lit lips, shadow and lichen at every loss's edge.
- **A sky render:** shelter (a sun straight down) and skyview (occlusion out to 12 yd), so moss, wet and the dark of
  enclosed places go where they belong.
- **The material's own lightness:** whitewash a step above stone at the same light. Big flat surfaces get a narrow
  dither band, so they lie in flat tones.

## Techniques: what failed, and why

- **Camouflage, three times:**
  1. the walls' stucco losses as big even patches (pass 1);
  2. the floor's moss chosen by noise (passes 1 and 7);
  3. the walls again, still, in value as well as colour.

  Every time, a threshold on noise decided a material at the scale of yards. The cure is a cause at the scale of the
  thing itself: a cushion, a damp line, a drip.
- **A painted moss carpet on a flat box** (pass 5): colour standing in for height.
- **The Hollow Wood's generator left to its own noise** made hard brown pools in pass 5, and barren humus under this
  overcast in pass 7.
- **Sine lobes for a natural outline** came out as a symbol (a heart, a bat).
- **Things placed at fixed heights:** tiles floated, and the stair's serpents hung in the air.
- **One albedo for every material:** the whitewash sank to the floor's value, and the walls stopped being the light
  shape.
- **The edge rule on round things:** a column's roundness counted as a corner, and the columns striped like candy
  canes. Only sharp turns count.
- **A walk painted like a wall:** near-white plaster under brown leaves read as dirt on snow.

## Traps

- A formula of the form `max(h, k*h + extra)` lifts every negative height. Check the minimum of the field after every
  change; a pool's level gives it away.
- The camera sees only some of the ground. Map the visible ground from the passes before placing a landmark (in pass
  7 the visible floor was four bands round the temple).
- The approved generators are shared: change them only by adding parameters with unchanged defaults, and prove it
  pixel for pixel against the committed version.

## What carries to later pieces

- **Every built piece gets a floor module by cause** in the manner of `floor3d`: the same function for the mesh and
  the paint, and the feet of everything taken from it.
- **Moss, damage and litter are decided at the scale of the thing that makes them,** never by noise at the scale of
  yards.
- **One true detail from the lore,** built where the eye goes: the unswept stair, the broom where it slid off the
  bottom step.
