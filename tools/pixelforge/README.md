# PixelForge

An all-in-one forge for making a Godot game's art on a normal laptop: no graphics card, no paid tools, no
browser steps. Paint in Midjourney (or anything), and PixelForge turns it into animated 8-direction characters,
props, effects, icons, tiles, UI and sounds, with the files Godot loads. Built for *Godmarrow* (a Diablo II style
game); every piece is generic except one exporter.

## What it does

| Need | Command | Studio |
|---|---|---|
| Character: painting → 3D figure → 46 clips → 8 directions → pixel frames → game files | `pixelforge project …` | Steps 1-9 |
| Fix a cutout by hand | — | Step 3 → Edit |
| Judge the motion | `project` + `preview_gif` | Step 7/8 → Preview |
| Props and buildings from 3D models (kits, grown trees), lit and graded like the game | `pixelforge prop3d` | — |
| Ground tiles rendered in 3D with the same light, lit transitions | `pixelforge tiles3d` | — |
| Props from paintings with sway, foot points | `pixelforge prop` | Tools |
| Spell / aura / fire / smoke / impact sheets (17 kinds, 13 palettes) | `pixelforge vfx` | Tools |
| Inventory icons from one flat-lay painting | `pixelforge icons` | Tools |
| Portraits | `pixelforge portrait` | Tools |
| Iso ground tiles + transitions + TileSet | `pixelforge tiles` | Tools |
| UI frames (9-slice + StyleBox) | `pixelforge ui9` | Tools |
| Sound effects (synthesised, WAV) | `pixelforge sfx` | Tools |
| Recolours (champion / unique tints) | `pixelforge recolor` | Tools |
| Before / after check | `pixelforge compare` | Tools |
| Skill-tree editor | `pixelforge skilltree` | Tools |
| Loaders for any Godot project | `pixelforge godot-addon <project>` | Tools |
| Is this machine ready? | `pixelforge doctor` | install.bat |
| An AI running all of it | `pixelforge mcp`, `docs/GUIDE_AI.md` | — |

## Install (Windows)

1. Python 3.11+ from python.org, tick *Add Python to PATH*.
2. Double-click `install.bat`. It makes a private environment, checks the machine, and puts a desktop icon.
3. Double-click **PixelForge Studio**. Step 5 downloads Blender (free, 380 MB) for you if none is installed.

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

`pixelforge/api.py` is the pipeline (one function per step). `gui.py` (Studio), `cli.py`, `mcp_server.py` wrap it.
Image maths: `grid.py`, `palette.py`, `quantize.py`, `cleanup.py`, `pixelate.py`, `animate.py`, `transform.py`,
`sheet.py`, `model_spec.py`. Tools: `props.py`, `vfx.py`, `icons.py`, `portrait.py`, `tiles.py`, `ui9.py`, `sfx.py`,
`recolor.py`, `compare.py`, `skilltree.py`, `doctor.py`. Blender-side: `pixelforge/blender/` (no Pillow there).
Godot-side: `godot_addon/pixelforge/` (`PFSpriteSet`, `PFFx`, `PFObjects`). Docs: `docs/GUIDE_HUMANS.md`,
`docs/GUIDE_AI.md`, `docs/TOOL_IDEAS.md`, `NOTES.md`. Tests: `pytest` (52).

## Rules it keeps

All colour distance in OKLab. A transform never invents a colour outside the sprite's palette. Every step returns a
JSON-serialisable dict and prints `PF_OK` from Blender. Glow only where the game allows it.
