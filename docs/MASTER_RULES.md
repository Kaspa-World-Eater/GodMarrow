# Master rules for art in Godmarrow

Derek, 2026-10-07: "give me the master list of rules you must follow, which needs to include reading the art
documents and techniques, and effects and ecosystems."

This is the one list. A 15-minute reminder points at it while work is under way. Before any piece of art is begun,
and again whenever the reminder fires, the work in progress is checked against every line here, in writing. Rules
live here; the reasons and the techniques live in the pages it names. *Rewritten 2026-10-08 with the 3D road, the
baked lands, the review pages and Derek's rulings since 2026-10-07.*

## The gate: the rules check before any new area or piece (Derek, 2026-10-07)

"That's why the ping is important before any new area is crafted." (Said after the Blind Face was begun without
reading the old-growth chapter, the ecosystem rules, the art chapters or the depth law, and was built from reused
pieces.)

The reminder fires only when the session is idle, so it cannot be trusted to catch the start of work. **Before the
first line of code or the first render of any new area, scene or object:**
1. Run the rules check yourself, in writing, at the top of the piece's pass log (`tools/landkit/passes/<piece>.md`),
   headed "Rules check, before pass 1".
2. List every document in section 1 read for this piece, with the one line from each that shapes it.
3. Confirm, line by line:
   - every object and surface is a new design for this place, nothing borrowed from another scene (2b.3);
   - everything with height is real form (section 0);
   - placement follows the ecosystem's causes (section 5).
4. Write the brief, show it to Derek, and wait for his go.

No check written, no work begun.

## 1. Read first (before any new piece, and again at each reminder)

| Read | For |
|---|---|
| **The lore of the area in work:** its area page in `docs/wiki/mythology/areas/`, the myths of its faiths in `docs/wiki/mythology/`, `docs/wiki/02-world-and-lore.md`, and the zone's own data in `data/zones/` | What this place was, who walked it, what the god's body is here, what happened there. A piece grows from its place's lore before its looks; put one true detail from it into the piece |
| **The area's review page and its notes** | Derek's grades and words on every piece so far (read them with ArtifactData) |
| `docs/wiki/06-art-direction.md` | The look: camera and scale, light and the dark, each land's look, figures |
| `docs/PAINTED_STANDARD.md` | How every pixel gets its colour |
| `docs/wiki/07-art-pipelines.md` | Which road makes the piece (the 3D road, the height engine, a baked land, a set, a character) and what was rejected |
| **`tools/art_study/library/`** (index: `library/README.md`) | THE TECHNIQUE LIBRARY: methods, environments, objects; how each thing is made, what worked, what failed, the code. Read the pages for the piece first |
| **`tools/art_study/chapters/`** and **`tools/art_study/reports/`** | Studies of the real world with recipes (one per subject), and one report per finished piece. Read every chapter and report that touches the piece |
| `tools/art_study/LIVING_LANDSCAPES.md`, `tools/art_study/ecosystems/` | How a land grows from a seed (causes first); each ecosystem's species, life and transitions |
| `docs/wiki/01-rules-and-decisions.md` | The game's laws (words, light, lore, no animals) and the dated decision log |
| The best pieces, side by side | The Seer's Bowl title (`tools/title_study/`), the pit of offering (the bog review page), the ruins (`painted_scene.py`), the dune |
| The piece's own pass log (`tools/landkit/passes/`) | Where the work stands and what the last grade said |

## 0. FORM IS LAW (Derek, 2026-10-07)

"Add the form rule to the rules. It's important because it gives depth and realness, not flat painted bullshit."

1. **Nothing is painted flat.** Everything that has height in the real world is built as real form: each paving
   stone's tilt, chips and proud edge, and the joint between stones; cracks; the flesh's lumps and folds; rubble,
   bones, roots, bark, ripples, drifts; roofs, eaves, frames, branches. Colour is never allowed to stand in for height.
2. **The light comes from the form.** The moon and every lamp light the geometry through its real normals; it casts
   real shadows onto its neighbours, hides what is behind it and catches light on its edges.
3. **Texture only for what is smaller than a pixel.** Grain, pores and fine speckle may be colour; anything a pixel or
   larger must be shape.
4. **The test, every pass:** take the colour away (value only, one material, one grey). The piece must still read as
   solid, deep and lit. If it goes flat, it fails.
5. **A generator that computes a height and then uses it only to shade a colour breaks this law.** The height must
   reach the world.
6. **How it is done, by road:**
   - **The height engine** (ground, terrain, water, the bog): every surface generator has two outputs, a height
     (yards) and a colour. The height goes into the world height field at the grid's resolution (0.04 yd) before the
     scene is cast and lit; the colour is only the material, never its own light. Relief is true to the thing and
     placed by its cause, and things standing on it take their ground from the same height. **Stones are tilted
     planes with chips and a bevel, never domes** (chapter 4).
   - **The 3D road** (anything that overhangs or encloses: roofs and eaves, porches, hut frames, arches, branches,
     hanging moss): the form is real 3D geometry at true size in Blender. Its normals, positions, occlusion and the
     moon's shadow are what the painter paints from (`tools/landkit3d`). The temple trial proved it: as a height
     field, the eaves fill solid to the ground.
   - **Never blur normals** into pillows.

## 0b. Locked techniques (keep or improve only; one shared place each)

| Technique | Where it lives | Locked by Derek |
|---|---|---|
| **The craggy floor:** old paving heaved and tipped by something beneath, every stone a lit top and a shaded face casting on its neighbour | `tools/landkit/ground.py` `craggy_height` (`CRAGGY`) | 2026-10-07: "the craggy look looked really good, lock that tech for later areas" |
| **The god's eye** | `tools/landkit/eye.py` | 2026-10-07: "eye looks great" |
| **The landmark method:** the pit of offering's shape, story by cause, obsidian, hidden red light, age | `tools/art_study/bog_chambers.py` (`sacrifice_pit`, `pit_paint`, `pit_racks`, `pit_tendrils`); report 05 | 2026-10-08: "exceptional ... really take note of what you did" |

## 2. How the work is done

1. **One piece at a time.** Nothing new is started until the piece in work is finished.
2. **Ten passes.** Every piece gets at least ten numbered painting-and-refining passes before it is shown as finished
   or placed. Each pass is graded in writing against the checklist (section 4) and fixes the worst failure the last
   grade found. The log lives in `tools/landkit/passes/<piece>.md`.
3. **Masterwork, never a factory.** Nothing skipped, nothing rushed. No mock-up is shown as a result, and no primitive
   stands in for a real form (no cones for trees, tubes for limbs or trunks, blobs for crowns).
4. **The brief comes first, from the area's lore** and from the real thing (botany, anatomy, geology, ecology,
   architecture), with every detail given its reason, built from the cause rather than the surface.
5. **Show the honest grade.** Say what still fails. A piece that fails a checklist line is not shown as finished.
6. **Code may run alongside.** Placement, generation and engine work may be finished while a piece is in work, but no
   second piece of art is begun.
7. **Every area has its own review page** (Derek, 2026-10-08: "let's make that the standard"):
   - each piece is shown with its image or loop, Claude's grade, what was done and what still fails;
   - Derek's grade buttons and notes are saved in the page;
   - his notes are read and logged before the next pass, and the same page is updated as pieces improve.
8. **On every reminder, improve** (Derek, 2026-10-08: "on the pings, decide what you can improve too"): after the
   written check, make the most valuable improvement, render it and log it.
9. **The workbench at milestones** (Derek, 2026-10-07): when a scene passes, an area is baked or generated, or an old
   scene is reworked, the workbench artifact is updated (the new in place of the old) and the link reshared.

## 2b. Scenes make the game's assets; masterpieces are locked (Derek, 2026-10-07)

"Every time I ask you to create a scene, every object must be made to perfection because when you're done creating
these unique objects, we can reuse them ... I've decided it's a masterpiece. You can lock in everything you made which
means that they always need to be perfect. All this will become assets for the game."

0. **This covers everything in a scene, not only objects:**
   - objects and materials;
   - environmental conditions (damp, the night air, weather, the hour);
   - lighting (the moon, the lantern, candles, rims, temperature);
   - animation and movement (wind, grass, flames, glows);
   - ecosystem rules (what grows where and why).

   Each is a reusable system made to perfection in its own graded passes.
1. **A scene is a commission for unique objects, not a picture.** Every object in it is built as a reusable game asset:
   - a landkit or 3D-road generator with its sprite, normal map, collision, cover and material;
   - or a part of a baked land.

   Nothing is painted for the scene alone.
2. Every object is made to perfection the first time, with its own graded passes. None is background, and none is a
   stand-in to fix later.
3. **Every scene is unique, and its objects are new designs.** Many scenes build a library of one-of-a-kind pieces;
   variants are made once a piece is graded, so the seeded maps never repeat.
4. **Masterpieces lock.** When Derek calls a scene a masterpiece (or a technique exceptional), its objects are locked:
   - they are canonical game assets, used as they are;
   - any later change must keep or raise their quality, never lower it;
   - shared parts live in one place (`tools/landkit/bark.py`, `parts3d.py`), so an improvement reaches every use.
5. **Until Derek says so, a scene and its objects are still in work.**
6. **The ground is unique everywhere.** Every ground surface is a generator that paints each place from its own world
   position, so no two yards of any map are alike; the generator is the asset. For the game, a land's ground is baked
   chunk by chunk from world coordinates (the Sunken Bog: `tools/worldgen/bog_bake.py`), with the transitions read
   from the same maps. **Never a fixed tile with variants.**

## 2c. Study first, then report what was learned (Derek, 2026-10-07)

1. **Study the real thing first.** Before a piece is built, the real things in it are studied from real sources
   (photographs, geology, anatomy, archaeology, architecture, craft) and written as a chapter in
   `tools/art_study/chapters/` (with sources and recipes), or an existing chapter is read.
2. **An extensive report for every piece**, in `tools/art_study/reports/<NN-piece>.md`, kept as the work goes and
   finished when Derek passes it. It holds:
   - what the studies taught;
   - every technique tried, what worked and what failed (and why), with Derek's words and grades;
   - the traps;
   - what carries to later pieces.
3. **Read the reports before a new piece,** so failed techniques are not tried again.

## 3. The painting rules (in full in `docs/PAINTED_STANDARD.md`)

1. Broad flat tones from a short ramp: large shapes of one tone, not speckle. Big forms 6 to 8 tones, small things 3
   to 4, plus near-black.
2. Dither lightly, and only where one tone meets another.
3. Pigment pools at a wash's wet edge: a dark band inside it, then a lit lip.
4. Surfaces are laid in long dry-brush strokes along the form, the wind or the flow.
5. Highlights are a loaded brush dragged across, never square dabs.
6. A paper tooth under everything, fixed to the world and not to the screen.
7. Whole world pixels (the 4 px art grid).
8. Still alive: everything moves a little in the one wind (`core/gust.gd`); glows breathe.
9. Hue-shift every ramp: darks lean violet-blue, lights lean warm.
10. Light tells the story: a cool key (the moon) and a warm local light (lantern, fire), each casting real shadows,
    with temperature tinting the tone in steps.
11. The light comes from the screen's upper left (world −x, a little +y).
12. Form before texture (section 0); texture after it, and gentle.
13. Contact: darkness where things meet the ground; grass, moss and litter over the feet of things; a lit rim against
    what is behind.
14. Detail where it counts: lit edges, chips, carving and moss on the props; the shade kept flat.

## 4. The checklist (every pass, every line, in writing)

1. **Brief:** from the lore and the real thing, every detail with its reason, one true detail from the area's lore.
2. **Scale:** true size from the game's projection (a yard is 18 × 9 art px on the ground and 21 px of height), with
   the Ossuarch beside it.
3. **Form (section 0, the law):** every feature with height is real form (height field or 3D), lit through its
   normals, casting and catching shadow. The value-only test passes. No flat stand-ins.
4. **Light:** the area's light:
   - the moon, or the overcast sky in the first area;
   - a warm local light, with both casting shadows;
   - flecks where a canopy is.
5. **Values:** big shapes in three to five clean tone groups first; texture subordinate and following the form.
6. **Ramps:** hue-shifted, 6 to 8 tones for big forms and 3 to 4 for small things.
7. **Paint:** broad tones, dry-brush strokes, pooled wet edges, lit lips, a world-fixed tooth, dither only at edges.
8. **Contact:** occlusion, things growing over feet, lit rims.
9. **Detail where it counts:** drawn shapes on the lit side and the silhouette; the shade kept flat.
10. **Life:** it moves in the one wind; nothing pasted.
11. **Seen as the player sees it:** the game's camera, zoom and lighting, with the Ossuarch for scale. For anything
    going into the game, a capture in the game itself; no visible repeat.
12. **Skeptic round:** side by side with the best pieces; the worst difference fixed first.

## 5. The world: scale, objects, ecosystems

- **True scale, and large.** The pilgrim is small inside a big world; a person is about 2 yards. Plants are a
  population of species, shapes and ages; built things have one fixed true size each, sized from real buildings.
  Check every piece against the Ossuarch beside it before painting.
- **The forest is felt from under it.**
  - Forest trees tower overhead with their crowns above the frame; the canopy shows as light and shadow on the floor.
  - Small trees are mostly dead, or seedlings.
  - Nothing small and leafy crowds the screen.
- **Everything is a reusable object,** generated with its sprite, normal map, height, shadow, collision posts and
  combat data. A scene only arranges them.
- **Ecosystems decide placement.**
  - Causes are placed first (trees by age, falls, pits, gaps, water tables).
  - The light and wet maps follow from them, and the floor is read off those maps.
  - Noise only picks exact positions.
- **Layouts breathe:**
  - spacing rules, so nothing clumps;
  - open ways and clearings built by the generator;
  - enough variants that no repeat is visible;
  - balance: few stray objects, so open areas feel open and paths feel constrictive where they should.
- **See-through is total.** Any object standing between the camera and the pilgrim vanishes completely while it hides
  them.
- **The god shows through, by the area's lore.** Its bones, hide, veins, eyes, teeth and blood are in the ground, the
  stone and the trees; more of it the deeper you go. In the first area, only a hint.
- **Sap is dark blood, everywhere.** Wherever a tree weeps, it runs and dries like dark blood.
- **Collision at every base.** Walk around trunks, stones and logs; walk behind a root plate.
- **Objects in combat.** Every object has a cover height, a material and hit points:
  - shots stop in what is taller than their flight;
  - fire takes dry wood and runs over the litter; wet wood smoulders;
  - ice glazes; lightning seeks the tallest;
  - stone and bone shatter shots;
  - water douses; force breaks what is rotten.
- **The game's camera:** Diablo II's proportion, the pilgrim about an eighth of the screen's height.

## 6. Effects

- **Weather happens IN the world, not ON it** (Derek, 2026-10-07):
  - rain wets what it falls on, runs down trunks (stemflow), drips from lips, rings on still water and splashes by
    material;
  - canopies shelter;
  - rain is seen only where light catches it;
  - wind moves what it touches;
  - snow settles on tops.
- **No fog or mist layers.** Derek removed the popping mist on 2026-10-05 and the bog's fog over the water on
  2026-10-08 ("its ugly, so just that shit"). If fog ever returns at his word, it lies in the lows and acts in the
  world.
- **One method under all effects:** a value field snapped to a short ramp with the ordered dither, in whole world
  pixels, lit by the scene and lighting it.
- **Restrained and purposeful,** in the manner of Diablo II Resurrected:
  - no glow for its own sake, though glow is fine on magic, lanterns and wisps;
  - nothing pasted over the screen;
  - every danger plainly seen.
- **No red light,** except the pit of offering's throat (Derek's ruling for that landmark).
- **Effects live in the world:** they run, pool, stain, scorch and are lit, and meet the objects by material. Size
  noise to the sprite's own texel grid. A pool must run out past the body that hides it.

## 7. The game's laws that art must keep

- **No animals or animal words** (banned words are listed in the wiki's rules):
  - foxfire and wisp-fire, never fireflies;
  - insects are allowed (Derek, 2026-10-07);
  - the Sunken Bog's long-dead serpent god may be called a serpent (his ruling).
- **Lore is hinted, never explained.** Any lore in the game is spoken only by in-world voices.
- **Never reduce the user's colours, and never a cheap "3D look".** The 3D road's form is painted, never shown raw.
- **Test captures use the Ossuarch only.**

## 8. Unfinished work to return to

Derek, 2026-10-07: "go back and finish the other stuff we were working on before the ecosystems, the effects, metal
etc." In order of his latest word (2026-10-08: "finish the bog first, and then we will discuss how the game begins"):

1. **The first area, the Red Shore** (Derek, 2026-10-08; its lore and brief in
   `docs/wiki/mythology/areas/the-red-shore.md`, the memory `godmarrow-first-area-vision`), built on the 3D road. In
   this order:
   - the study chapters first:
     - the Olympic coast (black sand, sea stacks, drift logs, the spruce fringe, bluffs, river mouths);
     - Northwest Coast forms (plank, post, canoe, woven bark), taken as forms only: no animal crests, no real nation's
       crests, stories or ceremonies;
   - the temple to an A (the painter's weaknesses first, then the fusion details);
   - the Red Water and the black sand (blood that is red by colour, never by glow);
   - the drift logs and sea stacks;
   - the giant trees and the wind-bent fringe;
   - the hide hut kit;
   - the palisade;
   - the fire pit of the dead (the landmark method);
   - the merchant's corner;
   - the land laid out from a seed, from the water inland, then baked and placed in the game.
2. **A full play run of Act I's main path,** to find what breaks, drags or kills unfairly.
3. **The new main music:** Middle-Eastern in the manner of Diablo II, dark, a touch of Muay Thai's sarama.
4. **The wisp-fire's live cold flame in the game** (the bog's hut pit has only its light).
5. **Metal and armour:** the Ossuarch's black iron and bone as plate with its own silhouettes, edges, bevels,
   filigree and engraving; the shield's face; the normal sheet.
6. **The environment agenda in the painted standard:** snow, grass, ruins and stone, cloth, pulsing flesh, shadows,
   wisps.
7. **Repaint every effect already made in the painted standard:** fire, ice, lightning, bone, acid, blood, miasma,
   souls, wisps, radiance, absence, slashes, threads, the title.
8. **The effects still to build:** soul magic, water, blood lakes, shadows, sand, every order's skill-tree types.
9. **Melee:** the styles and the special melee skills, once the Ossuarch's skills are final. The Ossuarch is finished
   before any other calling.
10. **Older trees with the warped column,** and the Hollow Wood's trees' white stripes; some trees mostly straight.
11. **Old scenes and lands rebuilt by the bog's method,** zone by zone through Act I, with the area lore as the
    brief.
