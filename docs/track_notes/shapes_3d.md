# Refinement: shape sprites are 3D primitives, not 2D polygons

Reference: `docs/refs/necromancer_3d_breakdown.html` (the build log of the necromancer through 13 versions; its
v13 renders 48 real views of a 3D model) and `docs/refs/necromancer_3d_turn.png` (eight of those views). The
page's own history is the argument: 2D polygons (v4-v7) looked right from the front; faking other angles by
narrowing them (v12) was rejected as "squish or cheating"; consistent angles needed a real model (v13).

What v13 does, and what PixelForge adopts from it:
- The character is 61 signed-distance primitives: ellipsoids, capsules with changing radius, rounded boxes, and
  elliptical rings around the body axis (coat, cape, tabard, belt, crown) with ragged hems from a sawtooth around
  the circumference, holes from a hash, cut-outs by angle (the open front of the coat, the cape kept to the back).
  Each primitive has a material function of position (gold trim where the coat opens, a crimson sash in an angle
  band, rivets, cracks that glow, a sigil on the back) and a bump function (fold ridges, fur clumps).
- Voxelise once on a 76 x 130 x 44 grid; keep a two-voxel surface shell; each voxel stores a normal from the
  primitive's own distance gradient (shells take the outer surface's normal), a ramp, a tone offset, flags.
- A frame = rotate the shell about the body axis, z-buffer it (front faces first, inner faces only where nothing
  else landed, so linings show), shade each pixel with the SAME pixel-art rules as the 2D sprite: one fixed light
  from the top-left, palette index from the dot product, metals keep their brightest tone for near-direct facing,
  contours where a neighbouring pixel belongs to a different part 2.2 voxels further back, a 1-px outline,
  emissives stamped last, point lights using each pixel's real depth and rotated normal with three dithered mix
  bands, a checkerboard floor shadow. 48 views at 12 fps, a few ms each.

Why this is the refinement PixelForge needs:
1. Eight directions come free and consistent. The 2D plan's weakest step (view variants, mirrored arms, nearest
   authored view for diagonals) disappears: every direction is a real view of one model.
2. Animation stays real frames: bind each primitive to a bone of the motion clips (a capsule for an upper arm
   follows the upper-arm bone's transform; the coat and cape are rings whose hem functions take the hips' motion
   and a lag), re-voxelise or ray-march per frame, render. Cloth lag, hat bob and cords are hem/bump functions
   of velocity. Weight and follow-through come from the clips.
3. It is the 3D road without the Blender road's failure: the model is deliberate primitives with materials and
   crisp pixel shading, not an inflated painting with a texture smeared on; and it is pure numpy, no Blender,
   so it runs on the owner's laptop.
4. The pixel look is preserved by construction: fixed light, palette ramps, contours, outline, emissives, Bayer
   bands. The renderer's per-pixel normal and depth buffers also give the game's normal/depth passes for free.
5. Authoring stays "the AI writes a file": the primitive list with materials is what the page's author wrote; the
   page proves an AI writes it in minutes. A painting is the reference for proportions, materials and colours.

Changes to the shape-sprite track (docs/track_notes/shape_sprites.md) before it resumes:
- `shapes.py` renders 3D primitives (SDF) to a voxel shell and then to pixels with the recipe above; the 2D
  polygon renderer from the first page stays as the fast path for flat things (icons, effects, props without
  depth) and shares the shading rules.
- The `.shapes.json` format gains 3D primitive kinds (ellipsoid, capsule, box, ring-with-hem, carve), material
  functions expressed as rules (by angle band, by height band, by pattern), bump kinds (folds, fur, lames,
  scratches), and a `bone` per primitive for the motion clips.
- Directions: render the 8 game views from the one model (and any angle the Forge app wants, e.g. a turntable
  preview); drop the per-view variant authoring.
- Proof: the Keeper as ~60-100 primitives from her painting (wide brim as a flat ring, crown, wrappings as a
  carved hood, lacquered plates, cords as capsules, gourds as ellipsoids, layered skirt rings with ragged hems),
  rendered idle and walk in 8 directions at 76 and 120 px, plus a 48-frame turntable; the frame editor edits
  primitives (position, radii, material) with the same live render.
- Performance target: a frame under 50 ms in numpy at 120 px (vectorised voxelisation per primitive bounding box;
  or ray-march the SDF directly per pixel with the pixel grid as the ray grid, which skips voxelisation).
