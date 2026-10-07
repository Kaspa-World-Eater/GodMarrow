# Master rules for art in Godmarrow

Derek, 2026-10-07: "give me the master list of rules you must follow, which needs to include reading the art
documents and techniques, and effects and ecosystems."

This is the one list. A 15-minute reminder points at it while work is under way. Before any piece of art is begun,
and again whenever the reminder fires, the work in progress is checked against every line here, in writing.

## 1. Read first (before any new piece, and again at each reminder)

| Read | For |
|---|---|
| **The lore of the area in work**, for inspiration: `docs/wiki/02-world-and-lore.md`, `docs/wiki/12-lore-notes.md`, `docs/wiki/mythology/` (the making and the fall, the faiths, the Pale Order, the callings, legends of the first lands), the codex voices (`docs/wiki/11-codex-voices.md`, `11a`, `12b`), the zone's own name, line and landmarks in `data/zones/`, and Derek's Lore Bible and Second Mouth docs | What this place was, who walked it, what the god's body is here, and the story details worth carving into it. A piece grows from its place's lore before its looks; find one true detail to put in |
| `docs/PAINTED_STANDARD.md` | The 14 painting rules, the masterwork rule, one-at-a-time-ten-passes, the 12-point checklist |
| `docs/wiki/01-rules-and-decisions.md` | The game's laws (words, light, lore, no animals) |
| `docs/wiki/06-art-direction.md` | The standard, the hero family, lighting and cinematography, the world's surface |
| `docs/wiki/07-art-pipelines.md` | How art is made here, and the rejected approaches never to repeat |
| `tools/art_study/STUDY.md` | Every study round and its lessons: weight, silhouettes, plate not tubes, anatomy, depth, the desert, trees, tiles, the old growth |
| `tools/art_study/STUDY.md` (effects library sections) | The effects method and Derek's list of effects |
| `tools/art_study/LIVING_LANDSCAPES.md` | How a landscape grows from a seed: causes first, maps from them, the floor last |
| `tools/art_study/ecosystems/README.md` and the land's own chapter | Shared rules (light rays by the hour, objects in combat) and that ecosystem's species, life and transitions |
| The best pieces, side by side | The Seer's Bowl title (`tools/title_study/`), the ruins (`painted_scene.py`), the dune, the old-growth judge scene (`wood_scene.py`) |
| The piece's own pass log (`tools/landkit/passes/`) | Where the work stands and what the last grade said |

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
3. **Form:** ray-cast, lit through normals; no flat stand-ins.
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
- **Collision at every base.** Walk around trunks, stones and logs; walk behind a root plate.
- **Objects in combat.** Every object has a cover height, a material and hp. Shots stop in what is taller than their
  flight. Fire takes dry wood and runs over the litter, and wet wood smoulders. Ice glazes and slows, lightning seeks
  the tallest, stone and bone shatter shots, water douses, and force breaks what is rotten.
- **The game's camera:** Diablo 2's proportion, with the pilgrim about an eighth of the screen's height.

## 6. Effects

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
