# Godmarrow

A grimdark isometric action RPG on the corpse of a dead god, made in Godot 4.7. It has Diablo II's structure, Path of
Exile's depth and Dark Souls' feel. This is the game; the old browser build in `web/` is retired, and only its
exported data and some art live on here.

## Play it

- **Windows:** `Play Godmarrow.bat` in this folder. The Desktop folder "Godmarrow Game" has two shortcuts to it:
  "Play Godmarrow", and "Start in the Sunken Bog". Arguments after the file name are passed to the game.
- **Or** open `project.godot` in Godot 4.7.2 and press F5.
- **The renderer is Compatibility** (OpenGL), so it runs on almost anything.
- **The laptop** plays the same game: it updates from GitHub `main`.

## Read first

| File | What it is |
|---|---|
| `CLAUDE.md` | for Claude sessions: what to read and the rules that never bend |
| `docs/README.md` | **the map of every document** |
| `docs/HANDOFF.md` | the state of the game and the work in progress |
| `docs/wiki/00-start-here.md` | the design wiki: rules, world, myths, systems, art, tech |
| `docs/MASTER_RULES.md` | the art laws, read before any art |

## Where things are

| Folder | What lives there |
|---|---|
| `core/` | the game scene (`main.gd`), the autoloads, combat, hero stats, the body board, saving, the iso projection (`iso.gd`), the test hooks |
| `entities/` | the hero, creatures (`ai/` holds one file per behaviour), missiles, the lantern, shadows, sprites |
| `skills/` | the skill book and one folder per calling, with its effects |
| `items/` | items, rolling and dropping, the bag, tooltips, trading |
| `world/` | a zone and what fills it: the baked lands (`baked_ground.gd`), the dark and its light, weather, sound, the far creatures' sleep (`sleepers.gd`); `objects/` for lanterns, waystones, people and errands |
| `ui/` | the HUD, every panel, the title, the Reading, the Codex |
| `shaders/` | the baked ground's shader (normals, wind, water) and the rest |
| `data/` | the tables the code reads: zones (`world.json`), monsters, skills, items, the Codex |
| `art/` | sprites, UI, the voice lines (`art/ui/`), and **the baked lands** (`art/zones/<zone>_s<seed>/`) |
| `audio/` | sound and music |
| `tests/` | test benches |
| `tools/` | everything that makes the art and the data (below) |
| `docs/` | the documents (start at `docs/README.md`) |
| `legacy/`, `web/` | the first prototype and the retired browser build, kept for reference; Godot ignores them |

**The tools that make the art:**

| Tool | What it does |
|---|---|
| `tools/landkit3d/` | **the 3D road**: Blender, driven from Python, builds forms in the game's camera, and our painter paints them |
| `tools/landkit/` | the height engine: lands and objects as real height, lit and painted; `passes/` holds every piece's graded passes |
| `tools/worldgen/` | the seeded maps (the bog's maze), their walkability proof, and the land bake into game chunks |
| `tools/zone_export/` | writes a seeded map as a zone file the game loads |
| `tools/art_study/` | the art library (`library/`), the study chapters (`chapters/`), the reports per piece (`reports/`), and the scene scripts |
| `tools/pixelforge/` | PixelForge: the characters as shape sprites (`.shapes.json`), rendered to 8-direction sprite sheets. Python, with its own `docs/` |
| `tools/smoke.sh` | the smoke test: every calling, the panels, the title and a champion fight |

## Test hooks

Arguments after `--` start the game in a chosen state:
- `--cls=ossumancer --new --zone=sunken_bog --lvl=12` start a calling, in a zone, at a level;
- `--perf` prints the frame rate and counts every second;
- `--off=dark,atmos` switches layers off.

The full list is in `docs/wiki/13-godot.md`, and how to run the tests is in `docs/wiki/08-tech-and-build.md`.
