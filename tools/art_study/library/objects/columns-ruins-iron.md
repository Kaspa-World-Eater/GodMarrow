# Columns, ruins and iron

What hands built, before the Wood and before the fall: the wayside chapels of the old road, roofless, their walls
broken course by course; the courtyard colonnade under the Moor where "the god held a room open inside itself ... and
in the room knelt our grandmothers' grandmothers"; the Gate in the god's mouth, "a door, warm and wet, that opened and
shut"; and the iron that rusts in them all (the gate's grilles, the fallen bell, the woodcutter's wedge). Built things
have one fixed true size each (Derek: "ruins and fortresses will be fixed"). This page covers `column.py`, `ruin.py`,
`relic.py`, `gate.py` and `gore_pillar.py`.

## The real thing
- **Chapter 2, [ruins, ash, rock and scree](../../chapters/02-ruins-ash-rock-scree.md):**
  - **Greek drums** 0.5 to 1.5 m, dry-laid; Doric 20 shallow flutes meeting at sharp arrises, which chip and sugar
    round first ("soft-ribbed"); **anathyrosis** (a smooth contact band, a rough-picked centre, a square socket): the
    single most recognisable real-ruin detail;
  - **earthquake falls** (Baalbek, Palmyra): drums in a domino line along one fall direction, the capital furthest,
    often face down; standing columns' drums offset a few cm;
  - **inverted shading** (marble and limestone): bleached sugary tops where rain falls, black crust under ledges and in
    lee flute bottoms, streaks below every ledge; this is the cue for "centuries old";
  - **cramps and dowels:** iron set in lead, hacked out (ragged pits) or rusted and swelled, with rust runs below;
  - **robbed walls** (Rievaulx): neat facing in places, the lumpy core where it was taken; stepped wall tops capped
    with turf and moss.
- **Chapter 1, [detail and nuance](../../chapters/01-detail-and-nuance.md), wrought iron:** bars forged square or round,
  never ruler-straight, each a real extruded form with its own cast shadow; crossings punched or collared and riveted;
  spear-point finials; pintle hinges leaded into stone; corrosion in layers (dark scale, orange bloom where water sits,
  delamination along the fibres like split wood, pits, rust streaks down the stone); low albedo, a dull broad sheen.
- **Chapter 4:** rough-hewn faces are tool facets 1 to 3 px wide, each its own tone; broken faces a few large planes.
- **MASTER_RULES 5, true size:** a church of the old road about 15 x 9 yd, walls a yard thick and 6 to 9 yd high, piers
  half a yard round, courses about 0.4 yd, blocks about 0.9 yd long, a door about 1.5 yd wide.

## How it is made
All of these are ray-marched along the game's camera (view `(1, 1, 2*9/21)`, as `eye.py`), with a shared z-buffer and
a depth tolerance against the scene; see [ray-casting](../methods/02-ray-casting.md).

**`tools/landkit/column.py`** (`shaft(base, R, height, seed)`, `drum(centre, axis, R, length, seed)`,
`draw(..., ground, ambient=0.14, tol=0.6)`):
- form: `_flute` gives 20 (`NFL`) shallow scallops with wear softening the arrises; drums shifted a few cm off true;
  hairline drum joints; the top broken on a tilted rough plane, paler; a fallen drum's end shows the anathyrosis band,
  rough centre and square socket;
- colour by cause masks: rain-exposed faces (normal truly up) bleached and sugary; sheltered flute bottoms and the
  undersides black crust (`CRUST`); streaks down from the break and joints; pale ash (`ASHF`) packed in the low flutes
  up to the drift line; a damp salt band with pits at the foot; dowel rust (`RUST`); `R_LIME` limestone, shadows
  blue-violet, never black.

**`tools/landkit/ruin.py:chapel(seed, length, width, thick, full)`:** a wayside chapel as a height field with
materials and wall ids, so the painter lays real courses in each wall's own coordinates (`COURSE = 0.45`); the roof
gone, walls broken block by block (each top block 0 to 3 courses gone), the west arch fallen onto its threshold, the
piers snapped at every height but one, the altar block at the east end, flags lifted. The scene (`ruin_scene.py`)
paints ancient ashlar: even courses of many block lengths, worn round edges, each block its own stone and temperature,
spalled faces, water stains below broken tops, lichen rosettes on moonward faces, joints softened where the mortar went;
piers with a square plinth, a round moulding and a fluted shaft of drums (12 flutes) sheared on a tilted plane; jambs
of dressed stone, a worn sill, the arch's voussoirs as true wedges with a moulding band and a keystone with an incised
eye.

**`tools/landkit/relic.py`** (`bell(seed, mouth, height)`, `paint_bell`, `stain`): the fallen iron bell, 1.2 yd across
the mouth, resting mouth-down where it fell (fallen bells come to rest so), sunk only a hand so the flared lip shows,
tilted where one side bit deeper: crown with the loop's stub, shoulder, slim waist, flare, thick lip, a raised
sound-bow, a worn inscription band, a crack from the lip, the clapper rolled apart; near-black iron (`RUST` ramp) with
orange only in small bloomed scabs (`SCAB`); its rust bled into the stone in two dithered steps.

**`tools/landkit/gate.py`** (`post(...)`, `leaf(...)`, `draw(..., ambient=0.1)`):
- **posts:** two black basalt megaliths 1.8 x 1.6 x 8.5 yd, rough-hewn in chisel facets over a slow bulge, leaning a
  little, out of the frame; a frieze of kneeling figures (`kneeler`, `frieze`) worn nearly smooth, cut twice as deep
  after it vanished; ash on the ledges, flesh climbing from the foot, small grey lichen, rust below each hinge pin;
- **leaves:** grilles of forged square bars, flat rails riveted at every crossing, a heavy frame, spear points; one
  ajar, one torn off its upper hinge and sagging into the flesh; dark scale, rust blooming where water sat, flaking along
  the grain, a dull broad sheen (`R_IRON`, `RUST`, `RUST_D`);
- **light adds, then tints:** lights raise the value before the ramp, so black basalt can be lit at all.

**`tools/landkit/gore_pillar.py`:** a Doric shaft from `column.shaft` (radius 0.5 on a 0.45 yd plinth) with gore
tendrils climbing it (`climb`: two ropes spiralling up from the ground, each with a branch forking the other way) and
pustules (2 to 4 per rope) each a sickly yellow light (`SICKC`); see [tendrils and vessels](tendrils-and-vessels.md).

**Iron elsewhere:** the woodcutter's wedge in `vein_stump.py` (25 cm, `R_IRON` with `R_RUST` where water sits, its
head mushroomed); the Sighing Lantern on the Moor (`moor_scene.py`: base plate, iron posts lit on the left, breathing
panes, peaked cap).

## Variants and parameters
| Piece | Size | Key parameters |
|---|---|---|
| Doric shaft / fallen drum | R 0.5 yd typical | `height`, `axis`, `burial` in `draw` |
| Chapel | 15 x 9 yd nave, walls 1.1 yd, 6.5 to 9 yd high | `length`, `width`, `thick`, `full` |
| Fallen bell | 1.2 yd mouth | `mouth`, `height` |
| Gate post / leaf | 1.8 x 1.6 x 8.5 yd; doorway 5 yd | `open_angle`, `sag`, `hinge_u` |
| Gore pillar | shaft plus tendrils | `height`, `seed`; preview `landkit/previews/gore_pillar_42.png` |

## What worked
- **Columns from chapter 2 with every mark by its cause** (Gate passes 60 to 61): "true columns at last".
- **Sky light and ground bounce in the shade** brought the flutes back.
- **The church at true scale** with the Ossuarch tiny at the door; walls toward the camera broken low (2.6, 3.6 yd),
  far walls high (9, 8 yd), so the eye goes in.
- **Ancient ashlar** (ruin pass 12): many block lengths, worn edges, each block its own stone, stains and lichen.
- **The bell upright, mouth-down,** sunk a hand: its silhouette (crown, shoulder, waist, flare) reads.
- **The gate backlit** by an ember glow deep in the passage (two then three sources), so the bars stand black against
  it; banked offering-fires (the lore's "Bank it, Tam. Ash over the coals") light the kneelers from below.
- **Light adds, then tints** (bug of Gate pass 69).
- **Things removed are kept:** the pillars became `gore_pillar.py`; `column.py` stays when the drums left the scene.

## What failed, and why (traps)
- **Exposure that leaned on occlusion** bleached the column tops "like a sock"; bleach only faces that truly look up.
- **Open-sky terms left on in a cavern:** the pillars glowed as under an open sky (Derek: "the pillars look really weird
  and out of place now"). Re-light every piece when the scene's premise changes.
- **Fallen drums as boxes;** then the drums and the capital hidden under foreground stalagmites.
- **Modern brick:** equal blocks, a regular half-bond, clean edges, one tone a block (ruin pass 11); then striped
  identical bed joints (pass 12).
- **The bell on its side:** a barrel or pumpkin with no waist, too evenly orange; then sunk too deep (a helmet).
- **The gate small and polite;** then lichen as camouflage blotches, the frieze under a pixel and unlit, the grille
  black on black, the rib a plank.
- **Bug: in `gate.py` the lights only multiplied** the stone's colour, so black basalt stayed black however lit.
- **The gate's red glow** broke "no red light"; made a dim amber.
- **Bug: columns' ground read after stamping,** so each shaft began on top of its own column and the drums floated.
  Read an object's ground before it is stamped.
- **A fallen arch-stone landed on the pilgrim's spot:** a pedestal.

## Derek's rulings and grades (verbatim)
- 2026-10-07: "ruins must be true to scale"; "The stone needs more work."
- 2026-10-07: "I agree, it also needs the forlorn looks of desolation, and maybe an ancient rusted away relic. And the
  rock is a reused asset."
- 2026-10-07: "The gate needs to look more brutal and imposing and ancient"; "the gate should have extruded iron bars".
- 2026-10-07: "And the ruins need more going on."
- 2026-10-07: "pull the pillars out, and keep the tendril on them, turn them into assets"; "remove the other rock
  pillar, and the broken pillar"; "remove the drums too".
- 2026-10-07: "still looks mono toned and flat, and so does the bone and gate pillars".
- 2026-10-07: "yeah the arch should be higher above the door"; "move it higher".

## Where it is used
- [Ruins and stone](../environments/ruins-and-stone.md): the night ruin in the Hollow Wood (`ruin_scene.py`).
- [Caves and the organic deep](../environments/caves-and-the-organic-deep.md): the Gate in the Flesh (`flesh_scene.py`),
  the gate, the colonnade (since removed), the gore pillar as an asset.

## Status
- **Church ruin:** 24 passes, no Derek grade; worst open: the bell's readability, then the jambs, the light, motion,
  export as game objects (the chapel is one generator, not yet separate pieces with sprites and combat data).
- **Columns:** passes 60 to 61 and 79; pulled from the scene, kept. **Gate:** passes 67 to 103, imposing at last; the
  rib arch and its height still being set by Derek.
- **Return to (MASTER_RULES 8.1):** metal and armour; the same iron study should feed the Ossuarch's plate.
- **Duplicates to merge:** the chapel's fluted piers (`ruin_scene.py`, 12 flutes) and `column.shaft` (20 flutes); the
  iron ramps in `gate.py`, `relic.py` and `vein_stump.py` (one wrought-iron material).
