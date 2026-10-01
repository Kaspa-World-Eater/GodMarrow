# PixelForge

An all-in-one forge for making a Godot game's art on a normal laptop: no graphics card, no paid tools, no
browser steps. Paint in Midjourney (or anything), and PixelForge turns it into animated 8-direction characters,
props, effects, icons, tiles, UI and sounds, with the files Godot loads. Built for *Godmarrow* (a Diablo II style
game); every piece is generic except one exporter.

## What it does

| Need | Command | Studio |
|---|---|---|
| Character: painting → 3D figure → 46 clips → 8 directions → pixel frames → game files | `pixelforge project …` | Steps 1-9 |
| Fix a cutout by hand (erase, restore, magic erase, wand / lasso with Shift and Alt, clone) | `pixelforge skin` (ops) | Step 3 → Edit (the Cutout page) |
| Start a character over, or redo from a step | `pixelforge project reset` | Start over / Redo from here |
| Judge the motion | `project` + `preview_gif` | Steps 7 and 8 play the clip on the page |
| Props and buildings from 3D models (kits, grown trees), lit and graded like the game | `pixelforge prop3d` | — |
| Ground tiles rendered in 3D with the same light, lit transitions | `pixelforge tiles3d` | — |
| Props from paintings with sway, foot points | `pixelforge prop` | Tools |
| Spell / aura / fire / smoke / impact sheets (17 kinds, 13 palettes) | `pixelforge vfx` | Tools |
| Inventory icons from one flat-lay painting | `pixelforge icons` | Tools |
| Portraits | `pixelforge portrait` | Tools |
| Iso ground tiles + transitions + TileSet | `pixelforge tiles` | Tools |
| UI frames (9-slice + StyleBox) | `pixelforge ui9` | Tools |
| Sound effects (synthesised, WAV) | `pixelforge sfx` | Tools |
| Music: 21 seeded looping cues, a knob sheet to edit, WAV/OGG, spectrograms | `pixelforge music` | Tools |
| Describe it, get it: plain words -> a spell, a skin edit, a prompt or a music cue | `pixelforge describe` | Describe it page (Ctrl+D) |
| Preview in game: the set, its attached effects or any effect on the hero in Godot; screenshots; play | `pixelforge game-preview` | Game page |
| Skin editor: paint-program toolbar (recolour, brush, glow, erase, restore, clone, selections, layers, regions); every stroke replayable by an AI | `pixelforge skin` | Skin page (steps 3 and 9) |
| Painted effects: Midjourney spell / missile art -> animated game effects | `pixelforge effect` | Tools |
| Bone armour / shard auras orbiting a character, in front and behind | spell presets | Tools |
| Missiles (bone spear, teeth, ice bolt, fire bolt) with rotation sheets | `pixelforge vfx <kind> --rotations 16` | Tools |
| Spell designer: layered effects with live preview, knobs, randomise, undo | `pixelforge spell` | Spell designer page |
| Colour editor: pick a colour, give it a new one, shading kept | `pixelforge skin` (recolor op) | Colour page (steps 3 and 9) |
| Effects editor: drag smoke, glow, embers onto a sprite, per view | `fx_editor.save_attachments` | Effects on a sprite page (step 9) |
| Recolours (champion / unique tints) | `pixelforge recolor` | Tools |
| Before / after check | `pixelforge compare` | Tools |
| Skill-tree editor | `pixelforge skilltree` | Tools |
| Loaders for any Godot project | `pixelforge godot-addon <project>` | Tools |
| Is this machine ready? | `pixelforge doctor` | install.bat |
| An AI running all of it | `pixelforge mcp`, `docs/GUIDE_AI.md` | — |

## Install (Windows)

1. Python 3.11+ from python.org, tick *Add Python to PATH*.
2. Double-click `install.bat`. It makes a private environment, checks the machine, and puts a desktop icon.
3. Double-click **PixelForge Studio**. Open a painting (or drop one on the window); step 5 downloads Blender (free, 380 MB)
   for you if none is installed. Drag-and-drop needs `tkinterdnd2` (`pip install tkinterdnd2`; install.bat does it).

Any OS: `pip install -e .` then `pixelforge doctor`.

## The character pipeline, in one paragraph

A turnaround sheet (front, side, back, optionally three-quarter) is split and cut out with soft edges. A visual
hull is carved from the silhouettes; the bundled, skinned CC0 mannequin is posed to the sheet's A-pose, shrink-
wrapped onto that hull and painted with the views in that pose, so it keeps clean knees, elbows and hands and the
46 library clips play on it directly (robes with no visible legs keep the carved hull and a retargeted rig). Blender
films it orthographically from 30° above at 8 yaws, sampling only the frames the game keeps, with optional normal
and depth passes; the frames are pressed to pixels with a locked OKLab palette and a fixed scale; the exporter
packs them into Godot SpriteFrames or the game's atlas with foot anchors.

## Layout

`pixelforge/api.py` is the pipeline (one function per step). `studio/` is the desktop app (one window: `app.py` the
shell, `pages_*.py` one module per page family, `editor_core.py` the editors' headless model, `widgets.py`, `theme.py`;
`gui.py` forwards to it), `cli.py` and `mcp_server.py` wrap the same functions.
Image maths: `grid.py`, `palette.py`, `quantize.py`, `cleanup.py`, `pixelate.py`, `animate.py`, `transform.py`,
`sheet.py`, `model_spec.py`. Tools: `props.py`, `vfx.py`, `icons.py`, `portrait.py`, `tiles.py`, `ui9.py`, `sfx.py`, `music.py`, `color_editor.py`, `skin_ops.py`, `skin_editor.py`, `fx_editor.py`, `spell.py`, `spell_designer.py`, `effect_art.py`, `describe.py`, `game_preview.py`, `checks.py`,
`recolor.py`, `compare.py`, `skilltree.py`, `doctor.py`. Blender-side: `pixelforge/blender/` (no Pillow there).
Godot-side: `godot_addon/pixelforge/` (`PFSpriteSet`, `PFFx`, `PFObjects`). Docs: `docs/GUIDE_HUMANS.md`,
`docs/GUIDE_AI.md`, `docs/DESIGN.md`, `docs/TOOL_IDEAS.md`. Tests: `pytest`.

## Rules it keeps

All colour distance in OKLab. A transform never invents a colour outside the sprite's palette. Every step returns a
JSON-serialisable dict and prints `PF_OK` from Blender. Glow only where the game allows it.
