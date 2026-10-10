# Method 09: the 3D road

*Derek, 2026-10-08, after the temple trial: "absolutely fucking crushed with the 3d, beautiful the painting and
details have a long ways to go but this is the way." Built things and anything that overhangs are made as real 3D
forms and painted our way. The commands and file layout are in `docs/wiki/07-art-pipelines.md` section 2; the
trial's passes are in `tools/landkit/passes/thai_temple.md`. This page is what the road teaches.*

## Why it exists

The height engine stores one height for each spot on the ground. That is right for ground, water, and bone half-sunk
in mud: anything that is one surface seen from above. It is wrong for anything that overhangs. The trial built the same
temple both ways and painted both the same way:
- **As a height field (grade D):** the eaves filled down to the ground, the walls and columns vanished, the gable
  became a wall, and the ferns became lumps.
- **As 3D forms (B-, after six passes):** every tier, eave, column, stair rail and fern read as itself.

Every overhang in a height field needs its own special case. In 3D, it is simply there.

The 3D road is not AI-generated 3D, which was tried and rejected for characters (`godmarrow-art-road`). Characters
stay on the shape-sprite road in PixelForge. This road is for the world's built things: temples, huts, walls, frames,
trees with branches, hanging moss.

## How it fits the game

*Updated 2026-10-09: the road now takes whole areas into the game.* A scene renders in aligned tiles, is painted, and is
cut into the game's chunks (ground, depth-sorted tall bands, normal maps, a height map, a block map), exactly the format
the Sunken Bog's land bake made; an exporter writes the zone, proves it walkable and places the start, ways out,
lights and folk. The Red Shore's cove (`cove_bake.py`, `cove_export.py`) was the first; the opening cave
(`cave_bake.py`, `cave_export.py`) the second. The whole chain is `docs/wiki/07-art-pipelines.md` section 2; every
module is in `tools/landkit3d/README.md`.

## What the passes taught

1. **Mass first, paint second.** Pass 1's massing read at once, and its paint failed (camouflage blotches, too bright,
   too green). Get the forms right, then spend the passes on the paint.
2. **Damage by cause, small and ragged.** Stucco falls by rising damp low on the wall and by the drip line high up,
   in small ragged losses. Big even patches read as camouflage.
3. **Model what catches light.** Tiles laid as real stepped courses, lapped course over course, catch the light on
   every course. Painted courses never will.
4. **Small plants as 3D clumps.** The sword ferns along the drip line, built as clumps, cast and catch light as ferns
   do; painted ferns lie flat.
5. **Lips where the form turns:** a lit lip on top edges and a dark lip under them. The data passes say exactly where
   the form turns, so the painter can lay them precisely.
6. **The floor is a height by cause, shared by the build and the painter** (pass 7, `floor3d.py`). One function gives
   the floor's true height and its cause maps from world position. The Blender build meshes it (0.1 yd cells), and the
   painter reads the same maps.
   - Pass 5's moss carpet, painted on a flat box, was colour standing in for height.
   - The causes now make the ground: old windthrows (pit and slumped mound), the kept ground swept low with the
     sweepings banked past its boundary stones, the runoff trench, the worn way, the rubble bank and cushion colonies.
   - The Hollow Wood's litter generator paints the leaves, fed drifts by cause. Its own noise drifts made hard brown
     pools in pass 5, and barren humus patches under this overcast in pass 7.
7. **No flat faces where detail belongs.** The gable was a flat triangle and read as a black hole. Carved relief as
   real geometry fixed it (a border, a medallion, kanok flames on dark wood), with the gilt showing on the carving.
8. **The hero stands where the eye can see him,** for scale. In pass 1 he stood inside the hall, hidden.
9. **Moss is form.** Moss chosen by a threshold on noise is camouflage at any size. Moss bound to its real cushions,
   with leaves lying over the rims, thins cushion by cushion and never ends in an edge.
10. **Everything on the ground takes its foot from the ground's height** (`floor3d.height`), and whatever stands is set
    into the floor. Without that, tiles floated and the stair's serpents hung in the air.
11. **A second look at the sky** (`blend_scene.sky_passes`, about 2 seconds): a sun straight down gives shelter (what
    the rain reaches), and occlusion out to 12 yd gives skyview (how much of the overcast a surface sees). The weather's
    work goes only where the rain falls, and enclosed places go dark (the hall's inside, the porch's depth). A ray per
    pixel from Python did the same in 65 seconds.
12. **Walls fail by cause** (pass 8: rising damp with its salt tide, exposed edges first, run-off under the sills,
    settlement cracks from the windows' corners with the sheet beside each dropped). Each loss is real at its edges:
    a lit lip on the plaster's broken top, a thin shadow under its lower edge, grey-black lichen round what stays.
13. **The material's own lightness.** Lime holds the light, so the whitewash takes a step above stone at the same
    light; without it the walls sank to the floor's value. A big flat surface lies in flat tones with a narrow dither
    band (`tone(band=...)`). Otherwise its light sits between two tones and the whole plane stipples.

## Still to learn

- **Done since the temple:** the painter at the painted standard (reports 07 and 08), real stone (`cliff3d`), the export
  to the game (above), ground depth at three scales and the five tones of form (MASTER_RULES 0.5b, 0.5c), the 2 x 2
  grid.
- **Still open:**
  - the Red's true heartbeat loop and live fire inside a baked zone (the bake holds one frame);
  - one shared, properly built corpse for every area;
  - the parts kits for the rest of the Red Shore (the hide hut, the palisade, the fire pit, the giant trees);
  - the seeded zones (MASTER_RULES section 5): a generator per land on the 3D road.

## Parts

`tools/landkit3d/parts3d.py` holds the reusable parts (boxes, polygons, slabs, bent tubes, spheres, cylinders,
displaced relief) and the material table. A new built piece is a new scene file that uses them, the way `temple3d.py`
does: one function per part, everything placed by cause.
