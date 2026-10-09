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

- **The forms are built in the game's own coordinates:** yards on the ground, height up. They are built under one
  parent that flips the game's mirrored axis and squashes height to the game's ratio, scaled (1, −1, 0.952).
- **The camera** is orthographic at the game's exact angle and pixel scale, so a 3D render lines up with the iso grid
  pixel for pixel. A scene's frame is given in the game's own terms: focus, width, height.
- **Blender renders data only:** normals, world position, ambient occlusion, a material index per surface, the direct
  light and the alpha. These go into one `passes.npz`.
- **Our painter paints the data** (`paint3d.py`), the way it paints a height field: ramps, dither, materials by cause,
  lit lips, a tooth fixed to the world. **Nothing of Blender's own shading reaches the screen.** That is what keeps it
  from the cheap 3D look Derek forbids.
- **Renders are fast:** the whole temple takes 8 seconds. A piece can be rebuilt and repainted many times a pass.

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

From the trial's open list:
- the roof: its repair tiles and missing tiles are a checker of square patches, a pixel grid;
- the stair's readability (the treads and risers are lost under brick, moss and leaves);
- the giant trees round the temple;
- drizzle and wet sheen, by material;
- the guardian and the candle's hidden light.

The temple's next passes also carry the Red Shore's fusion details: carved cedar face-posts at the porch, and
eye-like ovoids among the gable's flames (`docs/wiki/mythology/areas/the-red-shore.md`).

## Parts

`tools/landkit3d/parts3d.py` holds the reusable parts (boxes, polygons, slabs, bent tubes, spheres, cylinders,
displaced relief) and the material table. A new built piece is a new scene file that uses them, the way `temple3d.py`
does: one function per part, everything placed by cause.
