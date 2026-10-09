# Method 10: baking a land

*A whole zone painted for the game, chunk by chunk, so that it stands in the game as it stood on the review page. The
Sunken Bog was the first (2026-10-08). The commands, file formats and the game's side are in
`docs/wiki/07-art-pipelines.md` section 4 and `docs/wiki/13-godot.md`; the bog's history is in
`tools/landkit/passes/spine_path.md`. This page is what the bake teaches.*

## The shape of it

1. **A generator lays out the zone from a seed.** For the bog: the Back as the spanning tree, the causeways and rib
   walks as loops and dead ends, the chambers by blue noise, the pit, the islands.
2. **A proof walks it.** It walks the way the game walks: eight neighbours, never squeezing between two solid
   corners. From the arrival it must reach every chamber, the landmark, every island, both exits, every object and
   every creature. It runs on a hundred seeds, not one.
3. **The bake paints it** through the same scene engine the review pages use, in chunks. Each chunk is painted from a
   larger frame, so no blur or reflection is cut at its edge. For each chunk it writes:
   - the ground and its normal map;
   - an atlas of the tall bands and their normals.
   
   For the whole zone it writes:
   - the floor's height (`height.png`);
   - what blocks walking (`block.png`);
   - an index.
4. **The game loads it:**
   - the ground lit by the lantern through its normals;
   - the tall bands sorted in depth with the creatures;
   - the hero lifted onto the floor's height;
   - the plants bending in the wind.

## What the bake teaches

**No seams.** Nothing in the paint may depend on where the frame is. Every seam found in the bog came from something
that did:
- a placement grid that started at the frame's corner;
- plant seeds taken from the frame;
- a line drawn only as far as the frame;
- a tangent measured inside the frame;
- a table indexed from the frame's edge.

Each was closed by a switch that only the bake turns on, so that review scenes stay as they were:
- placement on a world cell;
- seeds from world position;
- the whole line, always;
- the grid snapped to the world.

**To find seams, render frames centred on them.** A seam is invisible in a chunk and obvious across two.

**The proof checks what you see as well as where you walk.** The first visual check found a quarter of the walkable
ground painted as water (the shelves drowned once their frames were switched off). The fix rasterised the shelves
into the walk map itself. Then it found the eye socket's pool and a narrow stretch of the Back, and those were fixed
from the water map. **Walkable ground must look walkable, and water must block.**

**Height is real in the game too.**
- The floor's height lifts every body onto it, and turns screen positions back into ground positions by iterating.
- The tall bands sort at their depth minus their lift, so a body behind a raised bone goes behind it.
- Directions stay unlifted.

**Mark what moves.** Plants are marked in the band normals so the shader bends them in the wind. The ground under them
is baked without them, so no frozen copy shows through. The plants' sway is captured between "before plants" and
"after plants" in the scene's order.

**Water is its own alpha.** Land, water and outside are told apart in the ground's alpha, so the shader can swell and
glint the water alone.

**A bake is heavy.** It took the CPU and made the game crawl (6 fps). Run bakes at idle priority, or pause them while
playing. **The game's own cost** was 580 creatures awake at once; the far ones now sleep beyond 30 yards, as Diablo
II's do (`world/sleepers.gd`). The bog runs at 60 fps.

**A paused bake is a half-changed land.** Chunks in a new format beside an index in the old one break the zone.
Restore the committed chunks (`git checkout` of that zone's folder) before playing, and finish or discard the bake.

## For the next land

The bog's tools are written for the bog (`tools/worldgen/bog*.py`). The next land (the Red Shore, or the Hollow Wood)
should lift the shared parts out first:
- the chunker;
- the band sorter;
- the normal export;
- the height and block maps;
- the proof.

Keep only the land's own generator and scene new.
