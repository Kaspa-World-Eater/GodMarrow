# PixelForge: what it is for, what to keep, what to drop

For the session that takes PixelForge over. Read this before `docs/HANDOFF.md` §7 and before
`tools/pixelforge/docs/GUIDE_AI.md`. It is the owner's direction after four weeks of building, set on 2026-10-05.

## 1. The one sentence

PixelForge is the tool Claude draws with. Claude hand-authors every character as a shape model, the way a sculptor
builds a full 3D figure, against a Midjourney painting. PixelForge turns that model into a playable game character:
eight directions, every animation clip, a locked palette, a hand-fixable frame set, an export the game reads. The
same tool generates effects, music, tiles and interface pieces from a sentence. The owner opens the Forge, describes
what he wants or drops a picture, and Claude does the rest through the Forge.

## 2. What is needed (keep, finish, polish)

**The character road, in this order and no other**
1. The owner drops a painting on the Characters bench, or types a sentence on the describe line.
2. The Forge hands it to Claude Code on the owner's PC (`pixelforge/claude_bridge.py`; `pixelforge character author`
   on `track/refine`, merging into main as it lands).
3. Claude authors the shape model from scratch against the painting: writes a Python generator script in the
   character's folder, runs it, renders front/side/back stills, looks at the compare picture, edits, repeats for three
   rounds or until the silhouette overlap target is met. This is exactly how the Hemomancer was made
   (`docs/concepts/hemomancer/shapes/README.md`, `make_hemomancer_shapes.py`, 173 shapes, three rounds). The
   authoring prompt (`prompts_author.py`) carries that method, the parts kit, the traps, the style rules.
4. The Forge renders the finished model in eight directions and every clip (`shapes.py`, `shape_rig.py`, the motion
   library), writes part-id masks per frame, shows it on the bench with the painting beside it.
5. The owner or Claude fixes pixels in the editor; carry propagates the fix through every frame by part.
6. Export writes the sheets, the JSON and the skins entry into the game (`godmarrow_export.py`).

**Everything on main that serves that road**
- The shape engine, the rig, the parts kit (`shape_parts.py`), validation and its warnings, part ids, compare.
- The editor: pencil, brush, fills, shapes, wand, lasso, clone across frames and directions, layers, onion skin,
  reference overlay, unlimited undo, carry by part, effect anchors, the colour picker with both lock modes, typed
  numbers on every lever, the in-app file browser, Exit, the window toggle.
- Claude on every bench: the describe line, progress, highlight, Undo, prompts with Copy, Midjourney through Chrome.
- The effects engine (`pixelforge/effects/`, 80 node ops, 33 library effects including the weird ones) and the
  Effects bench driven by it.
- The music engine (`pixelforge/music/`: composer across genres, SNES voice set, the SNES lever, the library tagged by
  theme) and the Music bench.
- The job runner and the tool adapters (`jobs.py`, `pixelforge/tools/`) and the free-tool table in the guides.
- Style presets and the palette lock; the game export; the project layout; the self-updating launchers.
- The Forge app itself in the approved look: dungeon framing, ember gold, levers, the selector and its quiet sounds,
  ember means clickable, the hint line, the "?" overlay, breadcrumbs.

**Still to do, in order**
1. Land `track/refine`: the authoring loop, the bench flow, `claude doctor`, `acceptance.sh`.
2. The owner runs the Keeper on his machine from his painting. That is the acceptance test. If the result is at the
   Hemomancer's level, the road works. If not, say so and stop; no further rebuilds of the character road.
3. The frame art's fidelity round: carved stone, iron bands, animated sconces, worn wood, per-environment materials.
   The look pass so far fixed affordances; the art itself still reads plain.
4. The clean rewrite: one package, one pipeline, one set of names, dead roads removed; the manuals (User Manual,
   Operator Manual for AI, Reference, Art Direction, Developer Guide) written as a shipped product with no history.

## 3. What is not needed (drop, never rebuild)

- **Any automatic drawing of a character.** The measure-and-draft road (`character from-picture`'s draft step), the
  old inflated-cutout road through Blender (`pixelforge hero` without `--cutout`), the painting projection
  experiments, the quick-sprite on a dropped picture. The owner: "Claude hand drawing was better than the automatic
  shit." "Let's not waste any more time with PixelForge trying to draw." Measure, cutout and compare stay as tools
  Claude may call; nothing drawn by them is ever shown as a result.
- **Pixelating or converting a dropped picture.** A dropped picture is the reference and nothing else: shown as it is,
  stored untouched.
- **Mesh services and image-to-3D** (Tripo and the like). The owner pays for nothing new. Shapes are the model road.
- **Reinventing free tools.** No more general editor features beyond repaint, carry and anchors (Aseprite,
  LibreSprite, Pixelorama exist and are adapters); no tracker ambitions beyond what the Music bench has (Furnace
  exists); no node canvas. Before building a step, check the free-tool table in the guides and tell the owner when a
  tool exists.
- **Mock-ups and new directions** unless the owner asks. Build the list above; report with pictures; merge.
- **The game and the lore.** Other sessions own them: `docs/GAME_HANDOFF.md`, `docs/codex/LORE_REWRITE_GUIDE.md`.
  The Diablo 2 bridge (`pixelforge/d2/`) exists and is merged; use only if the owner asks.

## 4. How to work

- Worktrees on `track/<name>` branches, one build per agent, commit and push after every slice (an interruption kills
  background agents; uncommitted work is lost). Merge to main only after: pytest green, `check_scripts.gd`,
  `test_editor.gd`, `test_scene.gd`, and `screens.sh` with 0 errors. The owner's desktop icon pulls main on launch.
- Every commit ends with the attribution footer used in this repository's recent commits. No model names anywhere in
  content. Never print or commit tokens. British "colour". No pop-ups. Keep the approved look and readability.
- Tell the owner plainly what works, what is unverified, and what failed. Show pictures. Never show an automatic
  draft as a result.
- Godot for headless checks: `tools/godot/Godot_v4.7.2-stable_linux.x86_64` (fetch per `forge_launch.py` if absent).
  Tests: `cd tools/pixelforge && PIXELFORGE_NO_UPDATE=1 python -m pytest -q`.

## 5. The owner's standard, in his words

- "I just want PixelForge to be excellent and usable."
- "Animating means having frames and animating."
- "Nothing flashes."
- "Keep the SNES look and interface, and readable."
- "I want to be able to just type something and Claude figures it out. I want Claude to work autonomously."
- "Claude hand drawing was better." "Claude will just be pinged to draw the shape file model by hand, just like the
  human, fully 3D. The Forge will just handle the frames and effects generation."
