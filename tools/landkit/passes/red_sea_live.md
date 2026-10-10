# The Red, live (the cove's sea in real 3D)

`world/red_sea.gd`, `shaders/red_sea.gdshaderinc`, `red_sea.gdshader` (the surface), `red_sea_lip.gdshader` (the
roll), `red_sea_body.gdshader` (the drowned riding it); the field `tools/landkit3d/sea_field.py`; the bodies
`tools/landkit3d/drowned_glb.py`. The wave model is beach_floor.py's, the one the Blender loops showed.

Derek, 2026-10-10: "what happened to the cool sideways blood foam tide, that effect looked good for foam, we need to
enhance the blood ocean much much more"; "The ocean didn't look like it moved at all"; then, on the first pass, "the
ocen animation is chunky and needs a lot more work"; "Keep refining everything". His go on the plan: "Yes".

## Rules check, before pass 1 (written late: pass 1 was begun on Derek's go before this was set down; set down before pass 2)

Read for this piece, with the line from each that shapes it:
- **The area's lore** (`docs/wiki/mythology/areas/the-red-shore.md`): "the tide was its heartbeat, and whatever goes
  into the Red comes back"; "the Red is a mirror nobody can cover". The one true detail: the surface is a lacquer
  mirror of the grey dawn, and the dead ride it in.
- **Chapter 13, tide, surf and black sand:** one heavy break close in, peeling along the crest; the swash a ballistic,
  lobed tongue with a raised lit step; foam a life cycle (heaps, then lace that is holes in a sheet, never lines);
  white scarce (over 10 to 15% reads as drawn); overcast means no sun glints; the backs of the swells catch the sky,
  the faces go dark; fresh foam pale rose, draining salmon-maroon, dried crust brown.
- **Chapter 13, 6b (Derek's ruling):** a dying heartbeat; viscous: no chop, no spray, the roll sags; the foam holds.
- **Memory, Red Water motion:** slow, on a dying heartbeat; no chop; a sagging roll; a slow blunt swash.
- **`docs/PAINTED_STANDARD.md`:** stepped tones, hue-shifted ramps, dither only at the steps' edges, on the 2 x 2 grid.
- **`docs/CINEMATOGRAPHY.md`:** slow moving light; texture only where light grazes; depth by value.
- **`docs/animation/04-the-world-moves.md`:** the world moves on its own clocks, eased, never a loop that shows.
- **MASTER_RULES 6:** no red light (the sea makes none; the wisps' glow is theirs); effects live in the world.

Line by line:
- **New design for this place:** yes. The waves are this cove's own (its break, its cusps, its step), run live from the
  same model the cove's loops were made with; nothing borrowed from the cave's pool.
- **Real form:** yes. The surface is a real heightfield in 3D (the swells, the roll as a real overhang strip, the bore,
  the swash sheet over the true sand to the centimetre), lit through its own normals; the dead are real 3D bodies.
- **By cause:** the break where the step is; the swash by the cusps; foam born at the break and the bore, collecting
  at the columns.

## Pass 1 (2026-10-10): the sea live

- The grid in its own 3D world, projected by the game's own iso, at the art pixel; a window slid with the camera
  (3 fps).
- The heart's clock on the CPU; the wave model ported; the roll; the bore; the swash over the field's true sand.
- Foam by age (heaps, strands); collars at the columns; the nine drowned riding the surface point by point.
- **Grade C+.** It moves and has the loops' bones: the diagonal break, the heap of foam behind it. Against
  chapter 13 it fails in four places:
  1. sun glints, under an overcast dawn;
  2. lace drawn as lines, where the study says holes in a sheet;
  3. too much near-white foam;
  4. the swash's step has no lit lip and the film is no mirror.

## Pass 2 (2026-10-10)

(below)
- No sun glints (the dawn is overcast): the swells' backs take the grey dome's sheen, their faces go dark.
- The foam rebuilt as chapter 13 has it: a mat laid along the break, lumpy, its tone from its own small relief;
  holes punched in it that grow and stretch along the drift until it is lace of holes, then scraps, then gone; its ramp
  walking from pale rose to salmon-maroon to crust brown as it ages. The near-white measured at 0.7 to 8.4% of the sea
  through a beat (the study's limit is 10 to 15%).
- The thin film over the sand the lightest wet value, the sky in it (the lore's "mirror nobody can cover").
- No spray: the crest's spill and the roll's froth thinned to a skin.
- **Grade B-.** A beat now reads as the heartbeat: the rise, the roll, the mat sweeping in sideways, the lace, the
  drain, the stillness. Still owed: the roll's froth draws in vertical bars; the Red's sound is still the old swash's.
