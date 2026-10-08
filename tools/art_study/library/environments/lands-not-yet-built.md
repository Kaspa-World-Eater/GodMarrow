# Lands not yet built

Every land the game needs that has an ecosystem chapter but no finished scene in the current standard: the bone
deserts of Ossa (Act II, the god's bones laid bare), the Frigid Heights of An-Vhar (Act IV, its breath) with their
conifer woods, the Hide's younger deciduous woods and wet gullies (Act I), the Weeping Mangroves of Shog-Mire (Act III,
its flesh and blood), and the dead and burning forests that can occur in any wooded land. This page says what exists
for each, what the chapter already decides, and what would be needed. The method for all of them is the same
(`LIVING_LANDSCAPES.md`): study the real thing, write its rules, build its maps (causes first), then craft its pieces
one at a time under MASTER_RULES, starting with the rules check.

## The real thing
Each land's ecology is in its chapter under [`ecosystems/`](../../ecosystems/README.md):
[deserts](../../ecosystems/deserts.md), [highlands](../../ecosystems/highlands.md),
[conifer forest](../../ecosystems/conifer_forest.md), [deciduous forest](../../ecosystems/deciduous_forest.md),
[rainforest](../../ecosystems/rainforest.md), [dead forest](../../ecosystems/dead_forest.md),
[burning forest](../../ecosystems/burning_forest.md), [transitions](../../ecosystems/transitions.md),
[the organic deep](../../ecosystems/organic_deep.md). Shared rules from the README: light rays only with a low light,
an opening and something in the air (rays through dust in the Ossa's rib-shade, through blown snow on the heights,
long and thin through conifer spires, orange through smoke); and every object exports cover, material and hp.

## How it is built (what each land needs)

### The bone deserts of Ossa (Act II)
- **Exists:** `art_study/painted_dune.py`, the Bleached Dune, ground 1 of 6. Derek: "pretty good"; in chapter 4 he
  set it as the bar: "your desert sands look great". `art_study/painted_bone_desert.py` is the six-at-once sketch
  (dune, chalk flat, bone bedrock, bone scree, marrow seep, sand over bone), kept only as the list.
- **Lessons, STUDY round 10:** one ground at a time ("do them one at a time, like the rules"); scale is the first fact
  (the 36 x 18 tile; at the wrong scale ripples broke into dashes); a feature is there or not (a sharp mask, never a
  field of dying half-ripples); specks are not detail; story marks cross the grain (footprints run with the wind,
  across the ripples); ripples fork in Y-junctions; one god's vertebra, half buried with its scour and tail, said
  "bone".
- **Chapter rules:** the wind map makes the ground (ripples across it, scour upwind of every obstacle, tails
  downwind, streaks off the crests); bone breaks through where the dust lies thin; marrow seeps where bone cracks;
  life only at the oasis. The sand is ivory and chalk, lavender in shade, under the palest sky.
- **Needed:** the five other grounds as world-position generators with real height, the standing ribs (forty men
  high, never meeting), marrow seeps, chalk plates, cairns and cups, the Dry Oasis.

### Highlands and ice (Act IV)
- **Exists:** `shaders/snowfield.gdshader` only. Chapter: alpine meadow, scree, snow and ice; wind strips ridges and
  piles snow in the lee; frost shatters rock to scree; rime grows into the wind; chime-winds; bells, prayer-flags,
  glass where the god's breath froze.
- **Needed:** rime-crusted rock, scree fans (chapter 2's recipe: concave cone, biggest blocks at the toe), drifts,
  glass shards and passes, cushion plants, prayer-flag lines, bells, cairns; snow that settles on the tops of things
  (MASTER_RULES 6).

### Conifer forest (Act IV foothills; dark stands on the Hide's high ground)
- **Exists:** nothing. Derek ruled conifers out of the broadleaf tree study ("trees look like shit, don't use
  conifers"); the chapter puts them where they belong, on An-Vhar's slopes.
- **Needed:** spire conifers by age and wind-bend, krummholz, dead-branch skirts, beard lichen, windthrow in rows
  across the wind, a needle-mat ground, snow-laden variants. The warped column ([method](../methods/03-warped-column.md))
  carries straight over: chapter 6 was studied from Douglas fir.

### Deciduous forest (Act I: Fern Gully, the Pilgrim Road, the groves)
- **Exists:** most of its objects through the old growth ([old-growth-wood](old-growth-wood.md)); the meadow shader.
- **Chapter rules:** more even ages, one main canopy, few giants and little dead wood (classes 1 to 3); groves that
  clear into meadows (52 to 82% open ground); shrubs and bramble on the lit edge; Fern Gully damp, ferns and moss on
  every stone.
- **Needed:** middle-aged broadleaf trees, understorey and holly-like shrubs, bramble, bracken drifts, spring carpets,
  the grove-to-meadow edge. The open question: how the Hide's ordinary trees relate to the Hollow Wood's pale
  vein-trees.

### Rainforest (Act III mangroves; the Hide's wettest gullies)
- **Exists:** nothing. Chapter: wet is everything (moss and fern rising with the wet map until every surface is
  green); nurse logs with stilted rows; in the mangrove, trees on prop roots only where the water is shallow, in
  blood-dark water that pulses, bark weeping, moss giving way to a pink-grey slick that breathes.
- **Needed:** moss-curtained giants, hanging moss, limb ferns, nurse logs, prop-root mangroves, weeping bark; the
  blood water from the glade's pools ([fen-and-carr](fen-and-carr.md)) grown into a lake that pulses.

### Dead forest (the Widow's Stumps, the Burnt Heath's stands, drowned woods, the blight)
- **Exists:** snags and stumps in `landkit/deadwood.py`, logs by decay class in `log.py`, the vein-tree stump
  ([stumps-and-deadwood](../objects/stumps-and-deadwood.md)); `blighted_tree.py` as a study.
- **Chapter rules:** how many stand dead and where follows the cause (fire whole stands, flood below the water line,
  blight in patches); falls follow the snags' age; the dead canopy lets the light in, so the herb layer surges; no
  animals, so the fungi own the snags.
- **Needed:** snags by stage and cause (blight-silver, charred, drowned), the silver weathered-wood material,
  broken-topped spires, the Widow's Stumps worn by the ash wind.

### Burning forest (an event in any wood)
- **Exists:** `art_study/fire_study.py` (painted fire) and `tree_study.py` (the burning tree); the fire-spread system
  is designed (half-tile cells of fuel, moisture and heat; driven by the one wind, slope and embers; stages catching,
  burning, smouldering, ash) but not built.
- **Needed:** burning variants of every tree and log by stage, embers and smoke, charred materials, ash ground with
  white ghosts of what burned (chapter 2); the fuel and moisture maps read from the ecosystem's own maps.

## Its scenes
Only the desert has painted pieces: `painted_dune.py` (passed) and `painted_bone_desert.py` (a sketch). No other land
here has a scene.

## What worked
- The dune's designed value structure: big forms each lit in one clean tone, texture subordinate and following the
  form, a few story details at legible size. It is why the dune passed and the first wood tiles did not.
- Story marks that cross the grain, and one large true detail (the vertebra) over many specks.

## What failed (traps)
- Making six grounds at once, each half-designed (round 10); never again.
- Drawing at the study tile size instead of the game's: everything breaks into dashes.
- The dune's own method is older than the form law: round 10 shaded flat ground by projecting each pixel onto the
  plane and put the ripples' form into colour. Round 10 is marked superseded on this point (library README), so a
  rebuilt dune must carry its ripples and swell as real height.
- Bone first drawn as "a cookie on stick legs": processes at least 3 px, weight on the lower contour.

## Derek's rulings (verbatim)
- "Build the desert tiles, bone desert from the lore", then "do them one at a time, like the rules".
- "refine it again" (the dune's refine pass).
- "a section of the repository called ecosystems and art ... sub-chapters like old growth forests, rainforests,
  deciduous forests, conifer forests, dead forests, burning forests ... different zones having their own ecosystem
  types, different species, the transition areas ... as we delve deeper into the more organic parts of the world ...
  the desert types, cities and ruins."
- "light rays occasionally ... based on the time of day ... as a rule when seed generating".
- "the objects should also interact with missile attacks and spells in realistic ways, which will improve the strategy
  aspect of gameplay".

## Status and what is next
- Derek's order is to finish Act I first, so none of the Act II to V lands is next. In Act I the deciduous groves,
  Fern Gully, the dead stands of the Moor and Heath, and the burnt ground are the lands still to build.
- Each starts with its own rules check, its ecosystem chapter re-read, and one piece at a time with ten passes.
