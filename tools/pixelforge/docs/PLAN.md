# PixelForge and Godmarrow: the plan

## What PixelForge is
A game-art forge for pixel games, driven by a person in a full-screen, game-like app or by an AI through the same
commands. It makes characters, creatures, objects, effects, tiles, interface, sounds and music from a description
or a reference painting, through a style preset, and writes files a game loads. It is not tied to Godmarrow:
every Godmarrow-specific rule lives in the Godmarrow preset and the game's own data, never in the Forge's code.

## Principles (standing)
- Animation means frames. Real frames per clip per direction, rendered from one model, never pixels slid sideways.
- Characters are 3D solids with materials rendered as pixel art (tools/pixelforge/docs/track_notes/shapes_3d.md); flat things
  (icons, effects, props without depth) are 2D shapes with the same shading. Paintings are references, not sources.
- One look per game, set by a preset: figure height, palette, outline, bands, materials, frame counts.
- In-window for humans (no pop-ups, racks of knobs, tabs, reset and start over, adult tone); any way for the AI.
- Nothing is a dead end: every output can be edited by hand (frame editor, Aseprite interchange) and re-exported.
- Every piece is reviewed as a first-time user before it merges; the game is used read-only as a viewer.

## Phases
1. **Engine for characters** (next): the 3D-solid renderer, the file format, the material library, binding to the
   motion clips, 8 directions and a turntable, the Keeper as the proof at 76 and 120 px. Then creatures the same way.
2. **The Forge app**: the full-screen Godot front end with quests, the 1-bit dungeon look and dungeon-synth music,
   the racks (music, spells, tiles), tabs, reset, the frame editor, the compare screen, the style page.
   (track/forgeapp has the shell; the specs are in tools/pixelforge/docs/track_notes/.)
3. **Objects, effects, tiles through the same renderer**: props as solids, effects as shapes with the looks
   (track/fxlook), tiles and ground from paintings, so the whole world shares one shading, outline and light.
4. **Godmarrow rebuilt by swapping files**: category by category, the game running throughout: heroes, creatures,
   props and buildings, ground, effects, interface. The two game-side changes: figure scale to the preset's
   height and the console presentation (tracks scale and gamefeel, specified, not started).
5. **Other games**: a new preset, a new material library, a new project folder; the add-on and export format are
   shared. The Forge's own guide carries a "new game in an afternoon" walkthrough as the test of this.

## What gets kept, demoted, dropped (decided 2026-10-02)
Kept: presets, palette engine, motion clips and joint export, game export and add-on, effects generators and
looks, music and sound engines, tiles/UI/icons/portraits, describe-it, CLI/MCP/ops, the Forge app shell.
Demoted to reference: Midjourney paintings and prompts, cutout tools, the skin and colour editors (become material
and ramp editors). Dropped from the character road: the Blender hull, the painting conversion ("readable
pixels"), the 2D puppet from cutouts, the still-path sway for characters.

## Salvaging Godmarrow
Unchanged: skills, items, stats, zones, quests, AI, audio, interface logic, lighting, saves. Replaced by swapping
files the game already loads by name: art/sprites, art/objects, art/tiles, art/fx, art/ui, portraits. Rebuilt
rather than swapped: the procedural stand-in props and effects. On hold until the Forge is mastered.

## How to measure "mastered"
A stranger opens the Forge, drops a painting, and has a character walking in 8 directions in the game within an
hour, looking like the Morbid / Eitr references at game size; an AI does the same from one sentence; both can
make an object, an effect and a tune the same way; and a second game's preset produces a different look from the
same files.

## Working method: mock first (added 2026-10-02)
Before a team builds a screen, a tool page, or a new game's look, a mockup is made and approved: a self-contained
HTML page (docs/mockups/) with real assets standing in, the real framing, controls and motion rules, reviewed in a
few rounds of "change this". The approved mockup is the brief; the build is judged against it with screenshots.
Mockups are cheap (an hour), builds are not. The Forge app's approved mockup is docs/mockups/forge_app_v8.html.

## A second game in this style
The Forge's menu framing (ornate pixel frame, banner, picture window, text box, pixel levers and wheels, selector
blip, flame-anchored light) is a reusable skin: it becomes a Godot theme and scene set shipped with the Forge's
add-on, so a new game can open with the same presentation and its own palette and ornaments. When the owner starts
the next game, the first step is a mockup of its home screen in this framing, then its style preset.
