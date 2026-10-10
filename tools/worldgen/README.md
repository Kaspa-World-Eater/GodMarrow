# worldgen (`tools/worldgen/`)

Our own seeded map generators, written from the rulings and the ecosystem studies, not ported from the browser
(memory: "Godmarrow: our own versions"; `docs/archive/REWORK_AND_SEEDS_PLAN.md`, stage 3). Each writes zones in the
game's own format (`data/zones/<zone>_s<seed>.json.gz`) and proves them walkable the way the game walks (8 neighbours,
a diagonal only when both sides are open). The Sunken Bog is also baked here into a painted land (`art/zones/`). The
3D road's areas are baked and exported in `tools/landkit3d/` instead, in the same formats.

Run with `tools/pixelforge/.venv/Scripts/python` from the project root. All files are LF. Default output folder for
plans and maps: `tools/worldgen/out/`.

| File | What it is | Run |
|---|---|---|
| `bog.py` | The Sunken Bog's plan from a seed: the Long Back coiled through the zone as a maze, the chambers, the pit, the causeways, the rib walks, the islands, two exits | `python tools/worldgen/bog.py SEED [OUT_DIR]` -> `bog_sSEED.json` and `bog_sSEED_map.png` |
| `bog_export.py` | Turns a bog plan into the game's zone file (tiles, ground classes, furniture) | `python tools/worldgen/bog_export.py SEED [SEED ...]` -> `data/zones/sunken_bog_sSEED.json.gz` |
| `bog_check.py` | Proves the bog generator over many seeds: every chamber, the pit, every island, both exits, every lantern, chest, shrine and the waystone reachable; no monster out of reach | `python tools/worldgen/bog_check.py [N_SEEDS=100] [FIRST=1] [OUT_DIR]` |
| `bog_bake.py` | Bakes a bog seed for the game: the whole zone painted chunk by chunk through the bog scene's engine (`tools/art_study/bog_scene.py`, `bog_chambers.py`); re-runs the plan and export itself | `python tools/worldgen/bog_bake.py SEED [JOBS=6] [ONLY=a,b;a,b]` -> `art/zones/sunken_bog_s<SEED>/` |
| `bog_seen.py` | Checks that a baked bog looks like where you can walk: walkable tiles must show ground, open water must show water | `python tools/worldgen/bog_seen.py SEED [OUT.png]` |
| `bog_preview.py` | A window of a generated bog as the player sees it, with the Ossuarch | `python tools/worldgen/bog_preview.py SEED X Y OUT.png` (X, Y in zone yards) |
| `forest.py` | Act I's forests from a seed: towering trees, open corridors, no clumps, nothing repeating | `python tools/worldgen/forest.py ZONE SEED [OUT_DIR]` -> `ZONE_sSEED.json.gz`, a map and the numbers |
| `preview.py` | A spot of a forest zone rendered through the scene engine (`tools/art_study/wood_scene.py`) with the same pieces the landkit set bakes | `python tools/worldgen/preview.py ZONE_sSEED.json.gz X Y OUT.png` |
| `camp_export.py` | The bare camp: Act I's town cut to a clearing with its people, stash, lantern, waystone and five roads out. A stand-in until the first area is rebuilt | `python tools/worldgen/camp_export.py` -> `data/zones/moor_s9001.json.gz` |

`python` above means `tools/pixelforge/.venv/Scripts/python`.

**The bog, in order:** `bog.py SEED` (look at the map), `bog_check.py` (the generator holds over many seeds),
`bog_export.py SEED` (the zone file), `bog_bake.py SEED` (the painted land), `bog_seen.py SEED` (picture and walk
agree). In the game: `--zone=sunken_bog --zseed=SEED`. The baked land is read by `world/baked_ground.gd` (the
docstring of `bog_bake.py` still names `world/bog_ground.gd`, which no longer exists).

Pass logs: `tools/landkit/passes/spine_path.md`, `hollow_wood_seeded.md`. Map policy (memory, 2026-10-09): fixed set
pieces plus seeded wild lands from a graded pool of 3 to 5 baked seeds per zone.
