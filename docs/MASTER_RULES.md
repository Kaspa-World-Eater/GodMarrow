# Master rules for art in Godmarrow

Derek, 2026-10-07: "give me the master list of rules you must follow, which needs to include reading the art
documents and techniques, and effects and ecosystems."

This is the one list. A 15-minute reminder points at it while work is under way. Before any piece of art is begun,
and again whenever the reminder fires, the work in progress is checked against every line here, in writing.

## The gate: the rules check before any new area or piece (Derek, 2026-10-07)

"That's why the ping is important before any new area is crafted." (After the Blind Face was begun without reading
the old-growth chapter, the ecosystem rules, the art chapters or the depth law, and built from reused pieces.)

The 15-minute reminder only fires when the session is idle, so it cannot be trusted to catch the start of work.
Before the first line of code or the first render of any new area, scene or object:
1. Run the rules check myself, in writing, at the top of the piece's pass log (`tools/landkit/passes/<piece>.md`),
   headed "Rules check, before pass 1".
2. It lists every document in section 1 read for this piece (the area's lore, the ecosystem chapter, the art
   chapters, the reports, LIVING_LANDSCAPES), with the one line from each that shapes the piece.
3. It confirms, line by line: every object and ground surface is a new design for this place (2b.3), nothing
   borrowed from another scene; everything with height is built under FORM IS LAW and the depth effect (section 0);
   placement follows the ecosystem's causes (section 5).
4. Then the brief, then show Derek the brief and wait for his go.
No check written, no work begun.

## 1. Read first (before any new piece, and again at each reminder)

| Read | For |
|---|---|
| **The lore of the area in work**, for inspiration: `docs/wiki/02-world-and-lore.md`, `docs/wiki/12-lore-notes.md`, `docs/wiki/mythology/` (the making and the fall, the faiths, the Pale Order, the callings, legends of the first lands), the codex voices (`docs/wiki/11-codex-voices.md`, `11a`, `12b`), the zone's own name, line and landmarks in `data/zones/`, and Derek's Lore Bible and Second Mouth docs | What this place was, who walked it, what the god's body is here, and the story details worth carving into it. A piece grows from its place's lore before its looks; find one true detail to put in |
| `docs/PAINTED_STANDARD.md` | The 14 painting rules, the masterwork rule, one-at-a-time-ten-passes, the 12-point checklist |
| `docs/wiki/01-rules-and-decisions.md` | The game's laws (words, light, lore, no animals) |
| `docs/wiki/06-art-direction.md` | The standard, the hero family, lighting and cinematography, the world's surface |
| `docs/wiki/07-art-pipelines.md` | How art is made here, and the rejected approaches never to repeat |
| **`tools/art_study/library/`** (index: `library/README.md`) | THE TECHNIQUE LIBRARY (Derek, 2026-10-07): methods, environments, objects; how each thing is made, what worked, what failed, the rulings and grades, the code. Read the pages for the piece first; it says which older notes are superseded |
| **`tools/art_study/chapters/`** (index: `chapters/README.md`) and **`tools/art_study/reports/`** (one report per piece: what worked, what failed, why) | The art library (Derek, 2026-10-07): one chapter per study of the real world (detail and nuance; ruins, ash, rock and scree; teeth, sinew and muscle; more to come), each with procedural recipes. Read every chapter that touches the piece before starting it, and check it against them |
| `tools/art_study/STUDY.md` | Every study round and its lessons: weight, silhouettes, plate not tubes, anatomy, depth, the desert, trees, tiles, the old growth |
| `tools/art_study/STUDY.md` (effects library sections) | The effects method and Derek's list of effects |
| `tools/art_study/LIVING_LANDSCAPES.md` | How a landscape grows from a seed: causes first, maps from them, the floor last |
| `tools/art_study/ecosystems/README.md` and the land's own chapter | Shared rules (light rays by the hour, objects in combat) and that ecosystem's species, life and transitions |
| The best pieces, side by side | The Seer's Bowl title (`tools/title_study/`), the ruins (`painted_scene.py`), the dune, the old-growth judge scene (`wood_scene.py`) |
| The piece's own pass log (`tools/landkit/passes/`) | Where the work stands and what the last grade said |

## 0. FORM IS LAW (Derek, 2026-10-07)

"Add the form rule to the rules. It's important because it gives depth and realness, not flat painted bullshit."
(After the Gate in the Flesh's floor: "it's 1 dimensional, there's no depth to it, no 3D, which is why everything looks
so flat.")

1. **Nothing is painted flat.** Everything that has height in the real world is built as real geometry:
   - each paving stone's dome, tilt and proud edge, and the joint between stones;
   - cracks;
   - the flesh's lumps and folds;
   - rubble, bones, roots, bark, ripples, drifts.
   It goes either into the scene's height field at fine resolution or into a ray-cast form. Colour is never allowed
   to stand in for height.
2. **The light comes from the form.** The moon and every lamp light the geometry through its real normals. It casts
   real shadows onto its neighbours, hides what is behind it, and catches light on its edges. A stone shades the joint
   beside it because it stands above it, not because the joint was painted dark.
3. **Texture only for what is smaller than a pixel.** Grain, pores and fine speckle may be colour. Anything a pixel
   or larger must be shape.
4. **The test, every pass:** take the colour away (render the value only, one material, one grey). The piece must
   still read as solid, deep and lit, stone as stone, flesh as flesh. If it goes flat without its colour, it is flat
   painted, and it fails.
5. A generator that computes a height (a stone's dome, a ripple) and then uses it only to shade a colour **breaks this
   law**. The height must reach the world, so the renderer lights it.

6. **How it is done: the depth effect** (Derek, 2026-10-07: "Much better ... have the rules updated with the depth effect
   here"; the Gate in the Flesh, passes 89 and 90):
   - every surface generator has two outputs, a **height** (yards) and a **colour**. The height goes into the scene's
     world height field at the world grid's resolution (0.04 yd, under a pixel), added to the ground under it, before
     the scene is cast and lit (`ground.paving_height`, `ground.flesh_height`, `ground.craggy_height`);
   - the colour generator is called with `selfshade=False`: it gives only the material (its bed, its wear, its stain),
     never its own light; the engine lights it from the real normals, with the moon's and the lamps' shadows;
   - relief is true to the thing (worn paving: domes a few cm, a stone standing a few cm proud of the next; heaved
     ground: far more), and the heave is placed by its cause (near what pushes up, not everywhere);
   - things standing on it (rubble, bones, plants) take their ground from the same height, so nothing floats;
   - check it with the value-only test (point 4).

## 0b. Locked techniques (keep or improve only; one shared place each)

| Technique | Where it lives | Locked by Derek |
|---|---|---|
| **The craggy floor:** old paving heaved and tipped by something beneath, every stone a lit top and a shaded face casting on its neighbour | `tools/landkit/ground.py` `craggy_height` (`CRAGGY`) | 2026-10-07, "the craggy look looked really good, lock that tech for later areas" |
| **The god's eye** (B+) | `tools/landkit/eye.py` | 2026-10-07, "eye looks great" |

## 2. How the work is done

1. **One piece at a time.** Nothing new is started until the piece in work is finished.
2. **Ten passes.** Every piece gets at least ten numbered painting-and-refining passes before it is shown or placed.
   Each pass is graded in writing against the checklist (section 4) and fixes the worst failure the last grade found.
   The log lives in `tools/landkit/passes/<piece>.md`.
3. **Masterwork, never a factory.** Nothing skipped, nothing rushed. No mock-up is shown as a result, and no primitive
   stands in for a real form (no cones for trees, tubes for limbs or trunks, blobs for crowns).
4. **The brief comes first, from the area's lore.** The lore of the place in work is read for inspiration before every new piece (section 1), and the brief is written from it and from the real thing (botany, anatomy, geology, ecology),
   with every detail given its reason, and built from the cause rather than the surface.
5. **Show the honest grade.** Say what still fails. A piece that fails a checklist line is not shown as finished.
6. **Code may run alongside.** Placement, generation and engine work may be finished while a piece is in work, but no
   second piece of art is begun.

## 2b. Scenes make the game's assets; masterpieces are locked (Derek, 2026-10-07)

"Every time I ask you to create a scene, every object must be made to perfection because when you're done creating
these unique objects, we can reuse them ... Each one unique ... I've decided it's a masterpiece. You can lock in
everything you made which means that they always need to be perfect. All this will become assets for the game."

0. **This covers everything in a scene, not only objects** (Derek: "not ... just bark or trees but ... all objects,
   stone, environmental conditions, lighting, animation, movement, ecosystem rules. Everything"): objects and
   materials (stone, masonry, wood, bark, plants, fungi, litter, water, earth); environmental conditions (mist, damp,
   the night air, weather, the hour); lighting (the moon and its shadows, moonbeams and rays by the hour, lantern and
   candle and their flicker, canopy flecks, rims, temperature); animation and movement (wind and gusts, grass, flames,
   drifting mist, spores and leaves, breathing glows); ecosystem rules (what grows where and why, spacing, corridors,
   clearings, roots, decay). Each is a reusable system made to perfection in its own graded passes; when a scene is
   called a masterpiece all of it locks, and from then on it can only stay or improve, in one shared place.
1. A scene is a commission for unique objects, not a picture. Every object in it (each wall, pier, stone, tree, candle,
   cap, tuft) is built as a reusable game asset in `tools/landkit/` (sprite, normal map, collision, combat data);
   nothing is painted for the scene alone.
2. Every object is made to perfection the first time, with its own ten graded passes. None is background and none is
   a stand-in to fix later.
3. Every scene is unique, and its objects are new designs; many scenes build a library of one-of-a-kind pieces.
4. When Derek calls a scene a masterpiece, its objects are locked: they are canonical game assets, used as they are.
   Any later change must keep or raise their quality, never lower it. Shared parts (the bark, the stone) live in one
   place (`tools/landkit/bark.py`, ...) so an improvement reaches every use.
5. Until Derek says so, a scene and its objects are still in work.
6. **A scene builds the game's ground too, and every piece of it is unique** (Derek, 2026-10-07: "build scenes, which
   also means building the reusable tiles for the game"; then "tiles look terrible and reused, rule was every piece
   unique and a work of art"; and "yes" to this rule). No ground is a stamped picture repeated across the floor.
   Every ground surface (ash, flags, flesh, litter, earth) is a generator in `tools/landkit/ground.py` that paints
   each place from its own world position, so no two yards of any map are alike; the generator is the asset. For
   the game it bakes each map's ground chunk by chunk from world coordinates (every chunk different), with the
   transitions between surfaces read from the same maps, painted to the standard, never a fixed tile with variants
   and never painted straight into a picture. The old fixed tiles (`tools/art_study/tiles_*.py`) are retired for
   new scenes.

## 2c. Study first, then report what was learned (Derek, 2026-10-07)

"Study famous ruins and ashen grounds and the forms of different types of rocks and scree"; "study teeth and sinew
and muscle"; "make chapters in the art repository"; "write an extensive report on what you learn from your studies
for this particular piece and any piece going forward, and techniques. You applied things that failed and things
that worked."

1. **Study the real thing first.** Before a piece is built, the real things in it are studied from real sources
   (photographs, geology, anatomy, archaeology, craft) and written as a chapter in `tools/art_study/chapters/`, or
   an existing chapter is read. A piece is built from the chapters' recipes: form from causes, colour from the same
   causes, texture last.
2. **An extensive report for every piece.** Each piece (scene or object) has its own report in
   `tools/art_study/reports/<piece>.md`, kept as the work goes and finished when Derek passes it. It holds:
   - what the studies taught that mattered for this piece, chapter by chapter;
   - **every technique tried**, with **what worked** and **what failed**, why it failed (the cause, not only the
     symptom), and how it was fixed, with Derek's words and grades;
   - the bugs and traps (in code and in method) so they are never repeated;
   - what carries to every later piece: the lessons, and the reusable landkit parts.
   The report is not the pass log: the log records each pass, the report draws the lessons out of it.
3. **Read the reports before a new piece**, with the chapters, so failed techniques are not tried again.

## 3. The painting rules (from `docs/PAINTED_STANDARD.md`)

1. Broad flat tones from a short ramp: large shapes of one tone, not speckle.
2. Dither lightly, and only where one tone meets another.
3. Pigment pools at a wash's wet edge: a dark band inside it, then a lit lip.
4. Surfaces are laid in long dry-brush strokes along the form, the wind or the flow.
5. Highlights are a loaded brush dragged across, never square dabs.
6. A paper tooth under everything, fixed to the world and not to the screen.
7. Whole world pixels (the 4 px art grid).
8. Still alive: everything moves a little in the one wind (`core/gust.gd`); glows breathe.
9. Hue-shift every ramp: darks lean violet-blue, lights lean warm; six to eight tones per material.
10. Light tells the story: a cool key (the moon) and a warm local light (lantern, fire), each casting real shadows,
    with the temperature tinting the tone in steps.
11. The light comes from the screen's upper left (world -x, a little +y).
12. Form before texture: a height field or model, ray-cast and lit through normals; texture after it, and gentle.
13. Contact: darkness where things meet the ground, grass, litter and moss over the feet of things, and a lit rim
    against what is behind.
14. Detail where it counts: lit edges, chips, carving and moss on the props, while the open ground stays quiet.

From the title (the quality bar): shapes are height fields, real point lights, AO from height minus its blur, values
snapped to one short ramp with the ordered dither, hand-placed story details, contact shadows and living layers that
are lit by the scene and light it.

## 4. The checklist (every pass, every line, in writing)

1. **Brief:** from the lore and the real thing, every detail with its reason.
2. **Scale:** true size from the game's projection (a yard is a 36x18 tile, about 21 px of height per yard), with the
   hero beside it.
3. **Form (section 0, the law):** every feature with height is real geometry (height field or ray-cast) lit through its
   normals, casting and catching shadow; the value-only test passes (no colour, still solid and deep). No flat stand-ins.
4. **Light:** the moon and a warm local light, both casting shadows; flecks where a canopy is.
5. **Values:** big shapes in three to five clean tone groups first; texture subordinate and following the form.
6. **Ramps:** hue-shifted, six to eight tones per material.
7. **Paint:** broad tones, dry-brush strokes, pooled wet edges, lit lips, a world-fixed tooth, dither only at edges.
8. **Contact:** AO, things growing over feet, lit rims.
9. **Detail where it counts:** drawn shapes on the lit side and the silhouette; the shade kept flat.
10. **Life:** it moves in the one wind; nothing pasted.
11. **Seen as the player sees it:** the game's camera, zoom and lighting, with the Ossuarch for scale; a tile tiled
    with no visible repeat.
12. **Skeptic round:** side by side with the best pieces; the worst difference fixed first.

## 5. The world: scale, objects, ecosystems

- **True scale, and large.** The hero is small inside a big world. An old broadleaf stands 15 to 25 m with a trunk 1
  to 2 m across; a person is about 2 yards. Plants are a population of species, shapes and ages. Built things
  (ruins, fortresses) have one fixed true size each.
- **The forest is felt from under it.** Forest trees tower overhead with their crowns above the frame; the canopy shows
  as light and shadow on the floor. Small trees are mostly dead, or seedlings. Nothing small and leafy crowds the
  screen.
- **Everything is a reusable object.** Every tree, rock, log, grass clump and fern is a parametric generator in
  `tools/landkit/` that exports a sprite, normal map, height, shadow, collision posts and combat data. A scene is
  only an arrangement of them; nothing is painted straight into a scene.
- **Ecosystems decide placement.** Causes are placed first (trees by age, falls, pits, gaps), the light and wet maps
  follow from them, and the floor is read off those maps. Noise only picks exact positions.
- **Layouts breathe.** Spacing rules, so nothing clumps; open corridors and clearings built by the generator; enough
  variants that no repeat is visible.
- **Light rays by the hour:** a low sun or moon, an opening, and something in the air to catch it.
- **Built things at true scale, sized from real buildings.** A man is 2 yards. An ancient stone church of the old
  road is about 15 x 9 yards, its walls a yard thick and 6 to 9 yards high, its piers half a yard round; a course
  of stone about 0.4 yd, a block about 0.9 yd long; a door about 1.5 yd wide. Check every built piece against the
  hero beside it before painting.
- **See-through is total.** Any object standing between the camera and the pilgrim vanishes completely while it
  hides them, for every object, small ones too (Derek, 2026-10-07).
- **More of the god in every place** (Derek, 2026-10-07, after Cap Hollow graded C+): the dead god's body shows
  through the world in every scene, more than a hint: its bones, hide, veins, eyes, teeth and blood in the ground,
  the stone and the trees, always as the lore of that place describes it.
- **Sap is dark blood, everywhere in the world** (Derek, 2026-10-07). Wherever a tree weeps (a wound, a limb scar, a
  cut, a crack, a tapped trunk) it runs and dries like dark blood: deep red-black, glossy where fresh, crusted brown
  where old. The lore agrees ("it ran red down the blade and warm over my wrists"; the hunter's "sour red sap").
- **Collision at every base.** Walk around trunks, stones and logs; walk behind a root plate.
- **Objects in combat.** Every object has a cover height, a material and hp. Shots stop in what is taller than their
  flight. Fire takes dry wood and runs over the litter, and wet wood smoulders. Ice glazes and slows, lightning seeks
  the tallest, stone and bone shatter shots, water douses, and force breaks what is rotten.
- **The game's camera:** Diablo 2's proportion, with the pilgrim about an eighth of the screen's height.

## 6. Effects

- **Weather happens IN the world, not ON it** (Derek, 2026-10-07). Weather is never a layer over the picture.
  Every drop, flake or gust falls somewhere and does something there, by material:
  - **Rain:** wets what it falls on. Surfaces darken and catch the lights in broken wet dabs. Water runs down trunks
    along their channels (stemflow), drips from lips and ledges, rings on still liquid, and splashes on ground,
    stone and bone.
  - **Canopy shelters:** fine rain in the open, sparse heavy drips under the trees; hollows, niches and roofs stay
    dry.
  - **Light:** rain is seen only where light catches it.
  - **Wind:** moves what it touches (grass, leaves, flames, mist) and slants what falls.
  - **Snow:** settles on the tops of things.
  - **Fog:** lies in the lows.

- One method under them all: a value field (warped noise) snapped to a short ramp with the ordered dither, in whole
  world pixels, lit by the scene and lighting it. The liquid fire and the heat shimmer are the bar for detail.
- Restrained and purposeful, in the manner of Diablo II Resurrected. No glow for its own sake, nothing pasted over the
  screen, every danger plainly seen, and no red light.
- Effects live in the world: they run, pool, stain, scorch and are lit, and they meet the objects by material.
- Size noise to the sprite's own texel grid. Hold a creature's death frame while an effect plays on it. A pool must run
  out past the body that hides it.

## 7. The game's laws that art must keep

- No animals or animal words (foxfire and wisp-fire, never fireflies). The banned words are listed in the wiki's rules.
- Lore is hinted, never explained; any lore is spoken only by in-world voices.
- Never reduce the user's colours, and never a cheap "3D look" (a slight one done correctly is fine).
- Test captures use the Ossuarch only.

## 8. Unfinished work to return to (from before the ecosystems)

Derek, 2026-10-07: "go back and finish the other stuff we were working on before the ecosystems, the effects,
metal etc." These come back once the forest's current piece has had its ten passes:

1. **Metal and armour:** the Ossuarch's black iron and bone rebuilt as plate with its own silhouettes, with edges,
   bevels, filigree and engraving instead of tubes. His iron ramp is already brightened (study: "the iron"); the
   shield's face and the normal sheet need rebuilding with the keyed strike.
2. **The environment agenda in the painted standard:** snow, grass, ruins and stone, cloth, pulsing flesh, armour plates
   with their own silhouettes, shadows, the skill-tree effect types, and wisps.
3. **Repaint every effect already made** in the painted standard: fire, ice, lightning, bone, acid, blood, miasma,
   souls, wisps, radiance, absence, slashes, threads, and the title.
4. **The effects still to build** from Derek's list: soul magic, water (ripples, reflections, rain rings), blood lakes,
   shadows, sand, and every order's skill-tree types.
5. **Melee:** the styles and the special melee skills, done once the Ossuarch's skills are finalised. The Ossuarch is
   finished before any other class.
6. **Cursemark props' shader:** Derek to decide whether to fix its colour squaring.
7. **Rework every older tree with the warped column** (Derek, 2026-10-07: "we're going to have to go back and edit
   our old assets with this new information"): the judge scene, Cap Hollow, `tree.py` and `giant.py`. See chapter 6,
   section 4.
