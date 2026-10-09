# The Red Shore: the village and its coast (the first town, the starting area)

Derek, 2026-10-09: "push it all, then do the study, then build the first town starting area"; "We'll make the village
pretty coastal. The Olympic peninsula will be how we model it in and the Olympic rainforest."

## Rules check, before pass 1

**Read for this piece, and the one line from each that shapes it:**

| Read | The line |
|---|---|
| `docs/MASTER_RULES.md` (in full; section 0 now has terrain on the 3D road) | Sheer rock, bluffs and overhangs are 3D; plain ground is a height by cause in one shared function |
| `docs/wiki/mythology/areas/the-red-shore.md` | "The one image: the pilgrim small on a black beach, the red going out to the end of the world, and behind, up through the bent trees, the smoke of a fire that is still burning the dead" |
| `docs/wiki/mythology/05-the-last-breath.md` (the shore folk) and `../../in-game-texts/08-the-shore-folk.md` | The dead go to the fire, never to the water; whatever goes into the Red comes back |
| Chapter 10, the Olympic coast | The bands from the surf inland, each by its cause; the fringe here leans to sea (the one wind goes out) |
| Chapter 11, Northwest Coast forms | Cedar and the adze's mark; human faces only; forms, never crests or stories |
| Chapter 09 and the temple's pass log | The temple is built and passed (Derek's A); it is placed, not rebuilt |
| `tools/art_study/ecosystems/rainforest.md`, `old_growth_forest.md` | Pit and mound, nurse logs, wet is everything |
| The library: the 3D road (`methods/09-the-3d-road.md`), ground generators | Floors by cause, shared by the build and the paint; moss on its cushions; the sky passes |
| Report 05 (the pit of offering) | The landmark method, for the fire pit of the dead |
| Report 06 (the temple trial) | Never decide a material by noise at the scale of yards |
| Derek's rulings: true scale, forest feel, ground alive, weather in the world, objects in combat, no fog, no red light | The pilgrim small in a big world; crowns out of frame; never a calm floor |

**Confirmed:**
- every object and surface is a new design for this place, except the temple (passed, placed as it is);
- everything with height is real form (the 3D road for the bluff, logs, stacks, huts, palisade; the ground as a
  height by cause);
- placement follows the coast's causes (chapter 10) and the village's story (the area page).

## The brief

**The land, from the water inland** (a seaward distance `s`, the coast running across the screen from upper right to
lower left, the Red Water at the top, so the pilgrim looks up the screen to the sea as the one image asks):
1. **The Red Water** (s > 40): blood to the edge of the world, flat and heavy, its colour its own (a deep red-brown,
   near black in the troughs), never glowing.
2. **The foreshore** (32 to 40): black sand, wet and glossy, red-black where the surf has left it, beach cusps,
   backwash rills.
3. **The dry black sand** (26 to 32): grey-black, wind-rippled, the tide lines of dried red film, a cobble berm.
4. **The drift logs at the storm line** (20 to 26): silver logs piled shore-parallel, root wads, sand drifted against
   them; the old canoes upturned above them.
5. **The backshore** (17 to 20): dune grass and salal.
6. **A low bluff** (14 to 17), "pretty coastal": four or five yards of raw grey sand and gravel, a turf lip, hanging
   roots, a fallen spruce down it; the spruce fringe on its top, sheared and leaning OUT to sea.
7. **The river mouth** on the left: a stream comes down from the forest, cuts the bluff, braids across the sand to the
   red; the path down to the beach follows it.
8. **The terrace and the village** (below 14): the village close behind the fringe, with the sea showing through the
   gaps.
9. **The old growth** inland: Sitka spruce and cedar giants, crowns out of frame.

**The village** (inside a palisade about 26 yards across its radius):
- the fire pit of the dead at its heart;
- a ring of round hide huts round it;
- the temple on the inland side, its stair facing the fire;
- the palisade highest on the water side, breached at the wet end by the stream, its gate facing the path down,
  flanked by face-posts;
- spirit houses at the giants' feet outside;
- the merchant's corner by the temple steps.

**The order of work** (one piece at a time, MASTER_RULES section 2):
1. **Pass 1, the massing:** the whole layout as forms, so every piece has its place and its cause.
2. **Then each piece to its grade**, in section 8's order: the Red Water and the black sand; the drift logs and stacks;
   the giant trees and the fringe; the hide hut; the palisade; the fire pit of the dead; the merchant's corner.
3. **Then the land is laid out from a seed,** baked, and placed in the game.

## Pass 1: the massing (2026-10-09)

**The layout as forms** (`tools/landkit3d/village3d.py`, `shore_floor.py`). Review page:
https://claude.ai/artifact/UiDv3XxS7TmkW5v3ahzTDn
- **The ground** is one height by cause (`shore_floor.maps`), shared by the build and the paint, like the temple's
  `floor3d`:
  - the bands from the sea inland (the Red Water past s 66, the foreshore to 52, the dry sand to 42, the drift logs to
    32, the backshore to 26, a low bluff of about 4.6 yd to 22, then the terrace);
  - beach cusps, rills and a cobble berm;
  - the river's ravine and braids;
  - the path from the gate down the river's bank;
  - the old growth's windthrows and cushions inland, gentled on the village's kept ground.
- **The runner learned three things:** `--zoom` for overviews; the scene's own floor module (`FLOOR_MODULE`, saved as
  `floor` in the passes, so the painter reads the right ground); and the scene's `LAMPS`.
- **The temple** (passed) is placed as it is with its own build, turned so its stair faces the fire. Its candle comes
  with it.
- **New materials:** blood (the Red Water), hide, cedar (weathered silver and the drift logs), basalt, ash. The sand
  is painted by its wetness.

**What failed on the way:** the first layout's beach was a thin strip under the village, against the brief ("much of
it is the sand and the coast"). The bands were widened about 1.6 times and the village moved inland.

**Grade: C+, a layout, not art.** Every form is a stand-in that gets its own passes:
- the sea stacks are stacked discs;
- the fringe is lollipops;
- the giants are cut-off columns (cut at 16 yd for the overview);
- the huts are domes and poles;
- the sea is a flat red plane;
- the dry sand is a flat grey.

Also, the temple-specific rules in `paint3d` (the stair's treads, the roof's eaves, the hall's leaves) use the temple's
own coordinates. They must move to object-local coordinates before the village is painted closely.

**Next:** the Red Water and the black sand, at the game's scale with the Ossuarch, as the first piece.
