# PixelForge Studio — the short guide

Turn Midjourney pictures into real pixel-art characters, animated, seen from 8 directions, ready for the game.
Runs on any Windows laptop. No graphics card needed. No paid tools. No Mixamo.

## Install (once)

1. Install **Python 3.11 or newer** from python.org. Tick **"Add Python to PATH"**.
2. Get the `tools/pixelforge` folder (it lives in the GodMarrow repository).
3. Double-click **`install.bat`**. It sets everything up and puts a **PixelForge Studio** icon on the desktop.
4. Double-click the icon. If it does not open, run **`PixelForge Studio.bat`** instead; a crash is written to
   `studio_error.log` next to it.

**Blender** (free) does the 3D part. You do not have to install it: step 5 has a **Download Blender for me**
button (380 MB, no installer). If you already have Blender, the app finds it.

## How a character is made

1. **New project** → pick an empty folder (one project per game).
2. **+ Add character** → name it, write one sentence about it.
3. **Step 1** → click **Copy A: sheet** → paste into Midjourney. You get front, side and back in one picture.
   Upscale it and save the PNG. (Copy **A2** for a four-view sheet: better 3D. Copy **C** for a single pixel-style
   picture: better colours.)
4. **Step 2** → choose that PNG as the character sheet (and the C picture if you made one).
5. Click **▶ Run all automatic steps** and wait. The log at the bottom shows what is happening. Filming from 8
   directions is the slow part (a few minutes on a laptop).
6. **Step 8 → Preview animation**: watch any move from any direction. **Save GIF** if you want to show someone.
7. **Step 9 → Export for Godmarrow**: type the kind name (for example `mystic`), click, and copy the files it names
   into the game's `art/sprites` folder. Other Godot games: **Export** gives a SpriteFrames and a scene.

## Fixing a bad cutout (step 3)

The automatic cutout is usually right. When it is not (background stuck to the figure, a sleeve cut off):

- Click **Edit front** (or side / back). Left-drag **erases**, right-drag **puts pixels back**, **Magic erase**
  removes one patch of colour with a click. **Undo** undoes. **Save**.
- Or **Open folder** and edit the PNG in any paint program, then **Reload**.
- If it found the wrong number of figures, set **Figures on the sheet** to 3 or 4 and run split again. Loosen the
  tolerance if background remains; tighten it if the figure loses parts.
- Then run steps 4 and 5 again (click them on the left).

## Quick path, one picture → one sprite

For a first look, bosses, portraits, items. No Blender. Click **★ Quick path** in the step list, pick the picture
and an animation (sway, hover, flame...), click **Make sprite + animate + export**.

## Other things the Forge makes (the **Tools** button)

Props and trees with sway, spell / aura / weather effects, inventory icons from one flat-lay picture, portraits,
iso ground tiles, UI frames, sound effects, music, recolours (champion / unique tints from one render), before/after
compares, a skill-tree editor, and a one-click install of the loaders into any Godot project. Each is a small form:
pick the picture, name it, press Run. An AI assistant can run every one from the command line too.

**Music** writes the game's score: a looping cue for every act's camp, wilds and depths, five boss cues and the
title, all played by synthesised instruments (a twelve-string, lutes, log drums, flutes, strings, horns, choir,
bells, drums, drones and wind) through a long reverb. Nothing is sampled or copied; every note is generated. Pick a
cue, press Run, and it plays; the picture is its waveform and spectrogram. Every cue has a **seed**: a different
number is a different tune for the same place, so you can audition tunes until one feels right. **Knobs** change
tempo (`bpm=90`), key (`root=45`), mode (`sc=phr` for darker, `sc=hij` for eastern), levels and the drone. To edit
everything at once choose the cue **sheet**: it writes `music_sheet.json` with every cue's knobs; change the numbers
in any text editor, then run **all** with that sheet. Loops are seamless (the reverb tail is folded into the start)
and every cue sits at the same loudness. Format `ogg` makes small files for the game when ffmpeg is installed;
otherwise WAV, which Godot also plays.

## Knobs you might touch

- **Settings → Quality style**: `godmarrow` (every colour kept, ~195 px tall) is the game's; `hd`, `16bit`, `8bit`
  exist for other projects.
- **Step 7 → Camera elevation**: 30° is Diablo II. 45° is more top-down.
- **Step 8 → outline**: the dark 1-pixel edge the game uses.

## When something goes wrong

- *"Blender was not found"* → step 5, **Download Blender for me**; or Settings → Blender path.
- *"could not identify a front view"* → the sheet's background was not plain enough, or the views touch. Set
  **Figures on the sheet**, loosen the tolerance, or import a separate front image.
- *The sprite looks wrong* → the fix is nearly always in step 3 (cutout) or the sheet itself (A-pose, arms away
  from the body, plain background). Fix the cutout, run step 5 again.
- Anything else: the Log panel shows exactly what ran. Paste it to Claude with `docs/GUIDE_AI.md`.

## Let an AI drive it

Everything the app does is also a command. Tell Claude:

> Read `docs/GUIDE_AI.md` in this repo, then finish the character *wraith* in
> the project at `C:\Users\me\MyGame`.

It can run every step, read the same `project.json`, and tell you when it needs
you (Midjourney images, Mixamo).
