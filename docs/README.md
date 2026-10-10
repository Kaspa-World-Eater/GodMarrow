# The map of Godmarrow's documents and tools

*Rewritten 2026-10-09. Every document and tool, where it lives, and when to read it. When two documents disagree,
Derek's newest dated ruling in `wiki/01-rules-and-decisions.md` wins; then the newer document.*

## Start here

| Document | When to read it |
|---|---|
| `../CLAUDE.md` | every session: what to read, the laws that never bend |
| `HANDOFF.md` | every session: the state of the game, how Derek works, the work in progress, open questions |
| `wiki/01-rules-and-decisions.md` | before any change: Derek's laws and the dated decision log |

## The rules for making things

| Document | What it is |
|---|---|
| `MASTER_RULES.md` | **the art laws**, read before every piece: the gate (a written rules check first), form is law (ground depth at three scales, the five tones of form), cinematography, scenes make assets, the map policy, effects; section 8 is the order of the work |
| `PAINTED_STANDARD.md` | the painting manual: broad tones, dry-brush strokes, the 2 x 2 grid, turning every form, what failed |
| `CINEMATOGRAPHY.md` | depth, light and atmosphere: why they matter, how a room is made, 39 rules each testable on a still frame (`tools/landkit3d/cine_check.py` measures them) |
| `animation/` | **everything that moves:** Lasseter's principles for our sprites, how a clip is made (why first, the timing sheet, layers, eight views, the pose test), every clip, the world's motion (plants, water, fire, the Red), the checklist, and where our animations stand |
| `../tools/landkit/passes/*.md` | one log per piece: its rules check, brief, every pass and its grade, Derek's notes (`red_water_sand.md` the cove, `opening_cave.md` the cave, `spine_path.md` the bog, `thai_temple.md` the temple) |
| `wiki/09-backlog-and-open-questions.md` | the plan beyond the current piece, what is parked, what Derek still decides |

## The lore

| Document | What it is |
|---|---|
| `wiki/mythology/README.md` | **the makers' bible:** how it is written, its laws, the index. Start here for any lore |
| `wiki/mythology/00-the-deep-lore.md` | the truth beneath everything, for us only: everything is told, the Silence, mantles, the cards, the cycle, the pilgrim |
| `wiki/mythology/01` to `07` | the ages (in order, no dates); every people's beginning; the age of the Ythraal; the Held Space and the death; the Age of the Last Breath; the ends of the world; who is who (the faiths, the peoples, the mantles as cards, the callings) |
| `wiki/mythology/areas/` | one page per Act I zone: what is told of it, and a brief for building it. Read it before building the zone |
| `wiki/in-game-texts/` | texts for the player to find, in the world's own voices |
| `wiki/mythology/backstage.md` | not lore: the old digest of every source, with what has since been retired at its head |

## The design wiki (`wiki/`)

`wiki/00-start-here.md` lists every page.
- **The game:** `04` systems and combat; `05-class-*` the callings; `14` the mechanics checklist; `15` the body board;
  `16` the Errant Ways.
- **The look and the making:** `06` art direction; `07` the art pipelines (the 3D road, bakes, characters); `10` the
  study of great games.
- **The machine:** `08` tech and build (running, testing, git, delivering to the laptop); `13` the code's architecture.
- **Older lore pages** (`02`, `11`, `11a`, `12`, `12b`): written before the bible; where they disagree, the bible wins.

## The tools (`../tools/`)

`../tools/README.md` indexes every tool folder. The ones used most:

| Folder | What it is |
|---|---|
| `landkit3d/` | **the 3D road:** scenes built in Blender, the painters, the checks, the bakes and zone exporters (module index in its `README.md`) |
| `landkit/` | object generators, the set baker, and every piece's pass log (`passes/`) |
| `art_study/` | the art library: `chapters/` (studies of real things), `reports/` (one per finished piece), `library/` (methods, objects, environments), the height engine's scenes |
| `worldgen/` | our map generators and the bog's land bake |
| `anim/` | animation tools: `contact_sheet.py` (a clip's frames side by side, change per step, loop seams) |
| `pixelforge/` | Derek's character tool (its own `docs/` and `CLAUDE.md`) |

## Other folders here

| Folder | What it holds |
|---|---|
| `concepts/` | concept art and shape scripts per character and creature |
| `midjourney/` | Midjourney batches (reference only; Derek's settings are never changed) |
| `screens/` | dated screenshots kept as records |
| `refs/`, `mockups/` | references and mockups for the forge |
| `archive/` | **retired documents**, kept for the record: old hand-offs, the old Act I plan, the porting notes, the mythology of 2026-10-05 |
