# PixelForge

An all-in-one forge for making a Godot game's art on a normal laptop: no graphics card, no paid tools, no
browser steps. Paint in Midjourney (or anything), and PixelForge turns it into animated 8-direction characters,
props, effects, icons, tiles, UI and sounds, with the files Godot loads. Built for *Godmarrow* (a Diablo II style
game); every piece is generic except one exporter.

## What it does

| Need | Command | Studio |
|---|---|---|
| Character: painting → 3D figure → 46 clips → 8 directions → pixel frames → game files | `pixelforge project …` | Steps 1-9 |
| Character without Blender (the pixel road): painting → parts with pivots → posed by the same clips from 8 directions → pixel frames → game files | `pixelforge puppet run`, `pixelforge run <c> --road pixel` | Steps 1-9 (road: pixel) |
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
| Music: 21 seeded looping cues, a knob sheet to edit, WAV/OGG, spectrograms | `pixelforge music` | Tools |
| Describe it, get it: plain words -> a spell, a skin edit, a prompt or a music cue | `pixelforge describe` | Describe it… |
| Preview in game: the set, its attached effects or any effect on the hero in Godot | `pixelforge game-preview` | step 9 / Tools |
| Skin editor: paint-program toolbar (recolour, brush, glow, erase, restore, regions); every stroke replayable by an AI | Studio steps 3 and 9, `pixelforge skin` | Tools |
| Painted effects: Midjourney spell / missile art -> animated game effects | `pixelforge effect` | Tools |
| Bone armour / shard auras orbiting a character, in front and behind | spell presets | Tools |
| Missiles (bone spear, teeth, ice bolt, fire bolt) with rotation sheets | `pixelforge vfx <kind> --rotations 16` | Tools |
| Spell designer: layered effects with live preview | `pixelforge spell` | Tools |
| Colour editor: pick a colour, give it a new one, shading kept | Studio steps 3 and 9 | Tools |
| Effects editor: drag smoke, glow, embers onto a sprite, per view | Studio step 9 | Tools |
| Recolours (champion / unique tints) | `pixelforge recolor` | Tools |
| Before / after check | `pixelforge compare` | Tools |
| Skill-tree editor | `pixelforge skilltree` | Tools |
| Loaders for any Godot project | `pixelforge godot-addon <project>` | Tools |
| Looks: seven presets (Godmarrow, gothic hi-res, rendered ARPG, SNES 16-bit, handheld, modern indie, painterly) fixing figure height, palette, outline, shading, grade, effects, loops and tiles; animated examples | `pixelforge styles [--demo OUT]`, `project set --style` | Style page |
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

**The pixel road** needs no Blender: each view is cut into parts with pivots along a skeleton fitted to its
silhouette (head with the hat, torso, arms, legs, feet, a skirt as a garment); the motion library's joint tracks
(exported once into `assets/animations/joints.json.gz`) pose the parts per frame from every direction with the
same camera; the hem follows the legs and lags the hips, the hat lags the head; the frames go through the same
pixelate and export steps. Minutes on a laptop, real frames for every clip.

## Layout

`pixelforge/api.py` is the pipeline (one function per step). `gui.py` (Studio), `cli.py`, `mcp_server.py` wrap it.
Image maths: `grid.py`, `palette.py`, `quantize.py`, `cleanup.py`, `pixelate.py`, `animate.py`, `transform.py`,
`sheet.py`, `model_spec.py`, `rig.py` (skeleton fits), `puppet.py` (the pixel road). Tools: `props.py`, `vfx.py`, `icons.py`, `portrait.py`, `tiles.py`, `ui9.py`, `sfx.py`, `music.py`, `color_editor.py`, `skin_ops.py`, `skin_editor.py`, `fx_editor.py`, `spell.py`, `spell_designer.py`, `effect_art.py`, `describe.py`, `game_preview.py`, `checks.py`,
`recolor.py`, `compare.py`, `skilltree.py`, `doctor.py`. Looks: `styles.py` (the preset table), `style_demo.py` (the animated examples in `assets/styles/`). Blender-side: `pixelforge/blender/` (no Pillow there).
Godot-side: `godot_addon/pixelforge/` (`PFSpriteSet`, `PFFx`, `PFObjects`). Docs: `docs/GUIDE_HUMANS.md`,
`docs/GUIDE_AI.md`, `docs/DESIGN.md`, `docs/TOOL_IDEAS.md`. Tests: `pytest`.

## Rules it keeps

All colour distance in OKLab. A transform never invents a colour outside the sprite's palette. Every step returns a
JSON-serialisable dict and prints `PF_OK` from Blender. Glow only where the game allows it.
