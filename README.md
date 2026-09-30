# Godmarrow (Godot 4.7)

A grimdark isometric action RPG on the corpse of a dead god. This is the main build; the old web build is retired
and only its exported data and art live on here. The design wiki is the "Godmarrow Wiki" page (project docs `wiki/*`).

## Run it
- Play: `Play Godmarrow (Godot).bat` on the Desktop, or open `project.godot` in Godot 4.7.2 and press F5.
- Renderer: Compatibility (OpenGL), so it runs on almost anything.

## Where the code is
| Folder | What lives there |
|---|---|
| `core/` | The game scene (`main.gd`), the autoloads (`data`, `game`, `bus`, `settings`), combat, hero stats, the body board (`arcana.gd`), saving, the iso grid, shared light textures and art catalogue. |
| `entities/` | The hero, creatures, missiles, the lantern, shadows, sprites; champion deeds (`affixes.gd`, `affix_fx.gd`); the Ossuarch's count sigil. |
| `entities/ai/` | `brain.gd` (what every creature shares) and one file per behaviour (`ai_husk`, `ai_kiter`, `ai_boss` ...); `ai_world.gd` holds a zone's shared hazards. |
| `skills/` | `skill_book.gd` (points, levels, slots) and one file per ported order, with its own effects in a folder beside it. |
| `items/` | Items, rolling and dropping loot, the bag, the ground, tooltips, the town's trades. |
| `world/` | A zone and what fills it: the dark and its light, weather, atmosphere, sound, scatter, walls; `objects/` for lanterns, waystones, NPCs and errands. |
| `ui/` | The HUD and bar, every panel, the title (its three stages in `title_stage/`), the Reading, the Codex. `uikit.gd` is the shared look. |
| `fx/` | Small shared effects: blood, flame flicker, the orb rings. |
| `data/` | The tables (skills, classes, monsters, items, zones) the code reads. `tools/skill_trees.py` is the source of the skill trees. |
| `art/`, `assets/`, `audio/`, `shaders/`, `fonts/` | Art, sound and shaders. |
| `tests/` | Test benches (`ai_test.tscn`, sound and board tests). |
| `tools/` | Generators (skill trees, icons, the Codex, the wiki page, concept-to-sprite), `smoke.sh` (run before and after any change), and `done/` for one-off scripts kept for the record. |
| `legacy/` | The first prototype, kept for reference; Godot ignores it. |

## Test hooks (user args after `--`)
`--cls=ID --new --zone=ID --lvl=N --learn=all:N --autocast --arena=N --arena_kind=K --arena_live --arena_rank=champion
--affix=Name --sigils --seed=N --panel=skills|inv|char|board|journal --title --title_scene=stranger|bowl|fire --skin=KIND`.
`tools/smoke.sh OUT.txt` runs every order, the panels, the title and a champion fight, and reports script errors.
