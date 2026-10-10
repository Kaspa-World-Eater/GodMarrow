# Godmarrow's tools (`tools/`)

The art and data tools behind the game. Run Python with `tools/pixelforge/.venv/Scripts/python` from the project root
(never the Windows Store python). Blender is `C:/Program Files/Blender Foundation/Blender 4.5/blender.exe`. Folders
marked "other sessions" are worked on elsewhere: read them, do not edit them from here.

| Folder | What it is for | Main entry points | Its docs |
|---|---|---|---|
| `landkit3d/` | **The 3D road, the current build method:** scenes built as real forms in Blender, rendered to data passes, painted to the painted standard, measured, baked into the game's ground, exported as zones | `blend_scene.py`, `blend_tiles.py`; scenes `beach3d.py`, `cave3d.py`; painters `paint_shore.py`, `paint_cave.py`, `paint3d.py`; `cine_check.py`; `cove_bake.py`, `cave_bake.py`; `cove_export.py`, `cave_export.py` | `landkit3d/README.md` (the module index) |
| `landkit/` | Reusable object generators (trees, rocks, logs, bones, the god's eye and fangs, ruins...), ground generators and in-world effects (rain, fog, blood, wisp-fire), and the set baker that puts them in `art/landkit/<set>/`. Also every piece's pass log | `build_set.py old_growth`, `bake.py set OUT`, one-piece scripts (`tree.py OUT_DIR`, `rock.py`, `log.py`...) | `landkit/README.md`; pass logs in `landkit/passes/` |
| `art_study/` | The art library and the height engine's scenes: studies of real things, one report per finished piece, methods, environments, objects; the scene engine (`wood_scene.py`) and scene scripts (`bog_scene.py`, `bog_chambers.py`, `flesh_scene.py`...) | `wood_scene.py`, `bog_scene.py`, `bog_chambers.py` | `art_study/library/README.md`, `chapters/README.md`, `reports/README.md`, `STUDY.md`, `LIVING_LANDSCAPES.md`, `ecosystems/README.md` |
| `worldgen/` | Our own seeded map generators (the Sunken Bog's maze, the forests, the bare camp), their walkability proofs, and the bog's land bake | `bog.py`, `bog_export.py`, `bog_bake.py`, `bog_check.py`, `forest.py`, `camp_export.py` | `worldgen/README.md` |
| `anim/` | Animation checks | `contact_sheet.py SPRITE [view] [out.png]`: a clip's frames side by side, the change per step, loop seams | its docstring; `docs/animation/` |
| `title_study/` | The Seer's Bowl title chapel rebuilt in Python to learn its method (the quality bar); its lights split into layers for the title shader; normal maps for sprite sheets | `chapel.py OUT.png`, `chapel_light.py`, `normals.py SHEET.png` | the docstrings (`chapel.py` lists the lessons) |
| `pixelforge/` | Derek's character tool (shape sprites in 8 directions, the Forge app) and the Python venv every tool here uses. Other sessions | `pixelforge` CLI, `PixelForge.bat` | `pixelforge/README.md`, `pixelforge/CLAUDE.md`, `pixelforge/docs/GUIDE_AI.md` |
| `paintover/` | Hand paint-over passes on rendered character frames, by body part (2026-10-05). Other sessions | `px_ossuarch.py --preview OUT.png`, `detail_*.py`, `kit.py` (shared) | the docstrings |
| `terrain/` | Repaints the old tile ground textures (`assets/ground/set0/<land>/`) by hand-written rules; `original/` keeps the textures it replaced | `paint_ground.py` | its docstring |
| `marrowpress/` | An older pixel-art animation press: deforms a painted concept along a bone rig (`rigs/`, `anims/`) | `press.py` | its docstring |
| `zone_export/` | Exports the retired browser build's maps into `data/zones/` (the old way maps were made) | `export.mjs`, `check.py`, `compare.mjs` | `zone_export/README.md` (written while the browser was the source of truth) |
| `wiki/` | Builds the old one-page HTML wiki. Its paths (`/home/claude/...`) are from another machine | `gen_wiki.py` | its docstring |
| `done/` | Finished one-off scripts and data kept for the record (the original music, renames) | none | none |

**Loose scripts in `tools/`** (one-off builders from the Godot port, 2026-09-30 to 10-04; each docstring says how to
run it):
- data: `codex_to_bb.py` with `codex_extra.py` (the Codex to `data/codex.json`), `reading_src.py` (the Reading,
  `data/reading.json`), `reading_data.py`, `exp_fate.js`, `fate_zcap.py`, `exp_cards.js`, `skill_trees.py`,
  `icons_g1.py`;
- art and sound through PixelForge: `make_fx.py`, `make_music.py`, `make_world_art.py`, `make_buildings.py` (with
  `pf_paint.py`), `make_props3d.py`, `make_tiles3d.py`, `port_concept.py`, `title_cut.py`, `title_pix.py`,
  `extract_assets.py`, `render_mus.js`;
- tests: `smoke.sh` (run before calling a change done: `GODOT=<console exe> tools/smoke.sh OUT.txt`) and `survey.sh`
  (one order's skills, one by one);
- `shell.html` is the same file as `wiki/shell.html`.
