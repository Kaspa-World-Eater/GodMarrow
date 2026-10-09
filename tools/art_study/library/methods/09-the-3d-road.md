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
6. **The floor needs its own generator.** The Hollow Wood's litter generator laid its own humus base and made hard
   brown pools. A cushion-moss carpet worked, each clump in two tones with a lit lip, with leaves placed one by one by
   world position, thick in the drifts and thinning out with no edge.
7. **No flat faces where detail belongs.** The gable was a flat triangle and read as a black hole. Carved relief as
   real geometry fixed it (a border, a medallion, kanok flames on dark wood), with the gilt showing on the carving.
8. **The hero stands where the eye can see him,** for scale. In pass 1 he stood inside the hall, hidden.

## Still to learn

From the trial's open list:
- the floor's evenness: broad tone shapes and real hummocks;
- the giant trees round the temple;
- drizzle and wet sheen, by material;
- the guardian and the candle's hidden light.

The temple's next passes also carry the Red Shore's fusion details: carved cedar face-posts at the porch, and
eye-like ovoids among the gable's flames (`docs/wiki/mythology/areas/the-red-shore.md`).

## Parts

`tools/landkit3d/parts3d.py` holds the reusable parts (boxes, polygons, slabs, bent tubes, spheres, cylinders,
displaced relief) and the material table. A new built piece is a new scene file that uses them, the way `temple3d.py`
does: one function per part, everything placed by cause.
