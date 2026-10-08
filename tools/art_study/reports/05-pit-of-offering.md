# Report 05: the pit of offering (the Sunken Bog's landmark)

Derek, 2026-10-08, after the third pass: "You've done an excellent fucking job with the sacrificial pit area. Really
take note of what you did because exceptional." This report records what was done and why it worked, so that every
landmark after it starts from the same method.

Code: `tools/art_study/bog_chambers.py`:
- `sacrifice_pit` (form);
- `pit_paint` (material, blood, runes, glow);
- `pit_racks` (iron racks and haze);
- `pit_tendrils`;
- `scene_pit`.

Placed in every generated zone by `tools/worldgen/bog.py`. Pass log: `tools/landkit/passes/spine_path.md`.

## The brief (Derek's own words)

He asked for:
- a large stone platform, partially sunk, ringed by a coil of the serpent's bone;
- concentric circles of stone around a deep pit going down into the abyss;
- gore and tendrils creeping up the side;
- ruins that say this was a place of sacrifice.

His C- notes then added:
- refine the textures and depths of the stone;
- forgotten broken metal racks;
- runes carved into the stone;
- make the stone obsidian;
- a pulsating red glow from the hole, its source out of sight;
- blood stains as if a thousand were sacrificed, their blood channelled down gutters into the hole to feed the god.

## What was done, in the order it was built

1. **One strong shape that reads from the game's camera.** The platform is four rings stepping down to a round throat that drops seven yards into the dark. From the iso view the eye goes straight to the hole: the concentric rings are arrows pointing at it. Everything after is laid on this shape and never competes with it.
2. **The story, told by cause, in layers that are each a real thing:**
   - five **gutters** cut across the rings toward the lip (real height: the cut);
   - the **blood** follows the gutters and gravity: soaked heaviest near the pit and in the gutters, run down the risers and the outer wall in tongues, fresher in a few places. Its density is a field (distance to the pit, distance to each gutter, a flow noise), not a scatter of decals;
   - the **altar** stands at the one place it would be, where the first gutter meets the lip;
   - **standing stones** ring the rim, snapped to jagged tops; four **iron racks** stand on the outer ring (rusted, broken, one toppled, chains hanging);
   - **runes**, a band of glyphs cut round every ring, each glyph its own two or three strokes, filled with dried blood that catches the light;
   - the god's **tendrils** climb up out of the throat over the inner rings.
   Nothing is there without a reason the viewer can read.
3. **A material made for the place: obsidian.** Near black with a violet-green depth. It breaks in conchoidal shells, built as real height: rippled scars on the blocks, chipped edges. Glints are rare, only where a face turns fully to the moon. The first try put glints everywhere and the stone read as gravel; holding them back is what made it read as glass.
4. **One dramatic light from a hidden source.** A red glow pulses up the throat from below, out of sight; it lights the far wall that faces us and warms the lip, with a faint red haze over the hole. It is the only warm light in a cold night scene, and it sits where the story is, so the whole frame points at it. (This was Derek's ruling over MASTER_RULES 6, "no red light", for this landmark.)
5. **Age and setting.** The platform has settled and tilted, its far side drowned under the black water (stones below the water line become water and mirror). Its rim is ragged, blocks are missing, moss creeps over the outer rings, and the serpent's spine coils almost all the way round it. It belongs to the bog and is old.

## What failed on the way (and the fix)

- **Pass 1 read new:** a clean concrete pool on a drum. Fix: sink, tilt, drown one side, break the rim, take blocks out, add moss.
- **The first moss read as camouflage blotches.** It was later covered by the obsidian and blood pass. Lesson: on a dark landmark, moss is a minor note.
- **Glints everywhere read as gravel.** Fix: rare, larger, and only on faces turned fully to the moon.
- **Runes lost in the speckle.** Fix: larger glyphs, filled with a lighter dried blood.
- **The throat read a little like flames:** vertical teeth along the top of the red. The cause is geometric: a steep wall seen from above lands each pixel column at a very different depth. Colouring by depth made streaks, so the throat is now coloured by angle round the pit. The teeth that remain come from the seam between the inner wall and the lip; still open.

## The method, for every landmark after this

1. **Shape** that reads from the game's camera, pointing at the focus.
2. **Story by cause**, laid in layers, each a real thing (cut, flow, object, mark), with density fields rather than scatter.
3. **A material made for the place**, with its true structure as height (obsidian's shells) and its highlights held back.
4. **One hidden-source light** at the focus, in a dark scene.
5. **Age and setting**: settled, broken, overgrown and tied into its land.
6. **Show Derek early, take his notes, and rework the same day.**
