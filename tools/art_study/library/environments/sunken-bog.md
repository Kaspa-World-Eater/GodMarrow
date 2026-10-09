# The Sunken Bog

*The first land made by the whole method: lore, ecology, pieces graded on a review page, a seeded maze proved
walkable, baked, and in the game (2026-10-08). Its design and lore are in `docs/wiki/mythology/areas/sunken-bog.md`;
its history, every pass and grade, in `tools/landkit/passes/spine_path.md`; the study is
`chapters/08-serpent-spine-and-bog-water.md`; the landmark's lessons are in `reports/05-pit-of-offering.md`. This
page is the techniques.*

## The pieces and their code

| Piece | Code | What makes it work |
|---|---|---|
| **The scene** | `tools/art_study/bog_scene.py` | the bog engine: water, plants, the Back, the living layers; the bake's switches keep it seam-free |
| **The Back** | `tools/landkit/serpent_spine.py` | **Vertebrae:** many and alike, changing slowly along the body (chapter 8), each with its ribs. **The line:** varied in width, mostly overgrown, bone breaking through. Drawn whole (`WHOLE_LINE`), its free ends sinking under the bog (`ENDS`). **The bone's grain and speckle** are kept fine |
| **Water** | the scene's water | The Famine study's black mirror (`painted_swamp_god.py`): reflections marched up through the field, ripple wobble, sky streaks, a lip at the bank, duckweed drifts and lilies. **No iron film; no fog** |
| **Plants and the floor** | `tools/landkit/fen_ground.py` | Plant beds placed on a world cell: sedge, cotton grass, reeds, hummocks and pools, stumps with mud mounds, tipped snags with vines |
| **Board causeways** | `tools/landkit/bog_causeway.py` | Split planks laid across the way, each its own width, tilt and sag; some lost, some split; stakes every 1.6 yd, some snapped; brushwood under the ends; slime only where water touches |
| **Rib walks** | `bog_causeway.rib_walk` | A fallen great rib as a single-file bridge: its own flattened section, the crown worn flat, knobbed at the Back, sinking toward its tip, cracked and bitten |
| **Chambers** | `tools/art_study/bog_chambers.py NAME[:V]` | Nature, ruins, the straw hut, the eye socket, the skull, the Vein-Borers' ground, the islands, the pit. Each variant has its own place in the world (`set_origin`), so no two share a foreground |
| **The tendrils** | `tools/landkit/vessel.py` | The god's tendrils wrapped round something, now and then, with a pale, barely glowing pustule |
| **The maze** | `tools/worldgen/bog.py` | The Back as the spanning tree; causeways and rib walks as loops and dead ends; chambers by blue noise; the skull once, farthest from the arrival; three to five islands |
| **Into the game** | `bog_check.py`, `bog_export.py`, `bog_bake.py` | The walkability proof, the zone file, the chunked bake (method 10) |

## What worked

- **The value-only test:** "Passes" (Derek, A-).
- **The chambers:** the hut, the nature shelf, the rib walk ("Love it"), the ruins, the skull and the socket.
- **The pit of offering,** "exceptional". The landmark recipe was born here: shape, story by cause, its own material,
  one hidden-source light, age.
- **The water** as a fusion of the Famine's strength with the bog's true mirror.
- **Balance:** the zone feels open while the path is tight. The pieces are sparse variants, never objects poking out
  everywhere.

## What failed (traps)

- **Green spots that read flat and blobby, and moss that read as camouflage:** big even patches never work. Break
  them small and by cause.
- **Stone walls across the path:** they block the way completely. Ruins sit beside the walk, never across it.
- **Fog over the water:** "its ugly". Removed, and never added again.
- **An iron film on the water:** removed.
- **Too many ribs:** single large ribs now and then, as variants spread through the area.
- **Glints scattered as white speckle,** hiding the pit's runes: calm the glints.
- **A pit that read new,** like a clean concrete pool on a drum: lower it, settle it, drown its far side, rag its
  rim, take blocks away.
- **A shelf burying the Back where a walk crossed it:** the Back now rides on raised ground.
- **Every seam in the bake:** see method 10.

## Derek's rulings for this land

- The serpent god is long dead, with half-remembered, wrong names; "serpent" is allowed for it.
- The water should be the Famine's black mirror, with lots of plants.
- The vertebrae poke through only sometimes.
- The map is a maze like Diablo II's maggot lair, broken by open marsh chambers.
- Variants for every graded piece, for the seeded map.
- Red light at the pit's throat only.
- No fog.
- The bar is an A.
