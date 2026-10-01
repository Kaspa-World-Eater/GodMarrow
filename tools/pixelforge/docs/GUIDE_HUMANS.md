# PixelForge Studio — the short guide

Turn Midjourney pictures into real pixel-art characters, animated, seen from 8 directions, ready for the game.
Runs on any Windows laptop. No graphics card needed. No paid tools. No Mixamo.

## Install (once)

1. Install **Python 3.11 or newer** from python.org. Tick **"Add Python to PATH"**.
2. Get the `tools/pixelforge` folder (it lives in the GodMarrow repository).
3. Double-click **`install.bat`**. It sets everything up and puts a **PixelForge Studio** icon on the desktop.

**Playing the game.** The **Godmarrow** icon on the desktop (made by `install.bat`; or `Play Godmarrow.bat` in the
Godmarrow folder) gets the latest version first, finds Godot 4 or downloads it (free, once), and starts the game.

**Updating.** The Studio checks for a newer version when it opens and shows one bar, **Update and restart**. The same
is on the Settings page, and **`Update PixelForge.bat`** in the folder does it from outside the app. The game and
the Forge live in one folder, so one update brings both.
4. Double-click the icon. If it does not open, run **`PixelForge Studio.bat`** instead; a crash is written to
   `studio_error.log` next to it.

**Blender** (free) does the 3D part. You do not have to install it: step 5 has a **Download Blender for me**
button (380 MB, no installer). If you already have Blender, the app finds it.

## The window

One window, nothing pops up. On the left: **Home**, the **character** with its nine steps and the quick path, the
**editors** (Cutout, Skin, Colour, Effects on a sprite, Spell designer), the **tools** (Describe it, Effects and
spells, Objects and tiles, Icons / portraits / UI, Sounds and music, More tools) and **Game**, **Settings**, **Help**.
The page on the right changes; long pages scroll; pictures have Fit / 1x / 2x / 4x / + / − under them. The status
line at the bottom says what is happening and what stopped it; **Log ▴** opens the detail. A step that needs you
says so on its page, in gold.

Keys: **Ctrl+P** open a painting · **F5** run every automatic step · **Ctrl+T** tools · **Ctrl+D** describe it ·
**Ctrl+Z / Ctrl+Y** undo and redo in the editors · **Ctrl+S** save · **+ / −** zoom · **Ctrl+L** the log · **Esc** back.

## How a character is made

1. **Home → Open a painting…** (or drag the PNG onto the window). The character is named after the file, the picture
   is brought in (a wide picture is a sheet of views, a tall one a single front view) and every automatic step runs.
   A project folder is made for you in Documents the first time.
2. Watch the status line. It stops at **step 5** the first time: click **Download Blender for me** (free, 380 MB, no
   installer), then **▶ Continue**. Filming from 8 directions (step 7) is the slow part: minutes on a laptop.
3. **Step 3** shows the cutouts with **Edit**, **Skin** and **Colour** under each. **Step 8** plays the animation
   (clip, facing, speed, Save GIF). **Step 9** writes the game files: type the kind name (for example `keeper`) and
   click **Export game atlas**; then **▶ Preview in game**.

The other way round: **Add a character by name** first. **Step 1** writes the Midjourney prompts (click **Copy A2:
4-view sheet** and paste it into Midjourney; upscale the result and save it as a PNG). **Step 2** brings that PNG in.
Copy **A3** for a plan sheet (top view and underside) when the character has a wide hat or shoulders; copy **C** for a
single pixel-style picture (better colours).

**Continue** always does the next right thing: it opens the next step and runs it when it is automatic. **Run all
automatic steps** does every remaining step in one go. **Redo from here** marks this step and the later ones not done so
they run again (after you fixed a cutout, press it on step 4). **Start over** throws away the character's cutouts,
model, renders, frames and exports after one question on the page; the painting and the description stay.

## Fixing a bad cutout (step 3)

The automatic cutout is usually right. When it is not (background stuck to the figure, a sleeve cut off), click
**Edit** under that view. The cutout editor is a page with a toolbar on the left:

- **E Erase** (left drag; right drag restores) · **R Restore** from the raw crop · **✦ Magic erase**: click a patch
  of one colour and it goes (tolerance on the top bar).
- **W Wand**, **L Lasso** (click round a part, double-click to close), **▭ Rectangle**: a selection. **Shift+click
  adds** to it, **Alt+click takes away**, a plain click starts over. Then **Erase** / **Restore** / **Invert** the
  selection on the right; **Delete** erases it; **Esc** deselects.
- **C Clone**: Alt+click the place to copy from, then paint where it should go (repairs a torn hem with the
  painting's own pixels). **S Smooth** softens an edge.
- **Undo / Redo**, **Before** (the picture as it was opened), **Fit / 1x / 2x / 4x**, **Revert to automatic**,
  **Save** (the first save keeps a `.bak`), **Save ops as JSON** (for an AI to replay), **Back to step 3**.

Or **Open folder** and edit the PNG in any paint program, then **Reload**. If the split found the wrong number of
figures, set **Figures on the sheet** and run it again; loosen the tolerance if background remains, tighten it if
the figure loses parts. Then **Redo from here** on step 4.

## Quick path, one picture → one sprite

For a first look, bosses, portraits, items. No Blender. Click **★ Quick path** on the left, pick the picture and an
animation (sway, hover, flame…), click **Make sprite + animate + export**.

## Skin, Colour, Effects on a sprite, Spell designer

**Skin** (under each cutout on step 3; on the finished set on step 9; the Skin page for any PNG): a paint program
over the picture. **P Pick + recolour**: click a colour, widen **Range** until the highlight covers what you mean (both
eyes, the whole trim), click a swatch or type a hex on the right, tune **Light / Chroma / Hue**, **Apply**. The shading
stays; only the colour moves. **B Brush** (the colour on the right; opacity on the top bar), **G Glow** (a soft light
that spills a little past the edge: eyes, the lantern, runes), **I Lightness**, **S Smooth**, **E Erase**, **R
Restore**, **C Clone**, the **W / L / ▭** selections with Shift and Alt, **✎ Eyedropper**. **Layers** on the right
(add, hide, reorder, merge, opacity); Save flattens the visible ones. A selection can be **named** (eye_left, lantern,
hood) and later edits can target it by name, from the window or from the command line. Every stroke is an operation;
**Save ops as JSON** writes them so an AI assistant can replay or adapt them (`pixelforge skin`, the `edit_skin` tool).

**Colour** (the same places): the small colour fix. Click the colour, widen the range, pick the new colour, Apply,
Save. On a cutout the change goes into the model and every frame; on a finished atlas every frame changes at once.

**Effects on a sprite** (step 9, or the page for any exported set): drag an effect from the list (smoke, wisp,
embers, fire, glow rings…) and drop it where it belongs, for example on an eye; set its colours, size, glow and
whether it sits behind the body. Place it per view or **Copy to all views** (left-facing views mirror). **Preview**
plays the idle clip with the effects on; **Save** writes them into the set and renders the sheets; **In the game**
shows them on the hero.

**Spell designer**: a spell is layers of effects. Start from a preset (fireball, ward, soul drain, bone shatter,
lightning strike, bone spear hit, frost nova, fire wall, corpse burst), add or remove layers, and turn each layer's
knobs (kind, colours, scale, position, rotation, start, speed, opacity, blend, seed) while the preview loops.
**Randomise** gives new seeds, **Reset** a layer, **Undo / Redo**, **Keep** exports the strip and the JSON the game
plays plus a GIF, **In the game** plays it on the hero. A painted Midjourney effect joins as a layer of kind `image`.

## The tools

**Tools** are one workbench with tabs along the top: **Effects** (looping spell, aura, fire, smoke and impact sheets;
painted Midjourney effects made into game effects), **Spells**, **Objects** (props and trees from paintings or sheets,
and the style-locked prompts to paint them), **Tiles**, **Icons**, **Portraits**, **UI**, **Sounds** (pads: click one
to hear it, Keep writes them all), **Music** (the rack: pick a place, turn the knobs, Play a 20-second audition, Render
this cue or every cue, write the sheet), **More** (recolour, compare, the skill trees, the Godot add-on). Each tab keeps
its state while you switch; each tool shows what it made under its Run button.

**Music** writes the game's score: a looping cue for every act's camp, wilds and depths, five boss cues and the
title, all played by synthesised instruments (a twelve-string, lutes, log drums, flutes, strings, horns, choir,
bells, drums, drones and wind) through a long reverb. Nothing is sampled or copied; every note is generated. Every
cue has a **Tune (seed)** knob: another number is another tune for the same place. Tempo, key, mode (phrygian for
darker, hijaz for eastern), level, wind, echo are knobs; double-click one to reset it. Loops are seamless and every
cue sits at the same loudness. Format `ogg` makes small files when ffmpeg is installed; otherwise WAV, which Godot
also plays.

## Describe it, get it

**Describe it, get it** (Home, the Tools group, or Ctrl+D): say what you want in plain words and the Forge drafts it
and opens it on the right page. "A wisp lantern spell, pale blue, slow, with embers" becomes a spell in the spell
designer with those layers. "Make the left eye teal with a pale glow" finds the eye on the chosen picture and opens
the skin editor with the change made (Undo if it read you wrong). "A grave knight with a rusted helm" gives the
Midjourney prompt (copied to the clipboard). "A slow sombre act 2 wilds tune with more wind" renders and plays that
cue. It is a draft from a vocabulary of colours, effects, places and moods, not a mind-reader; an AI assistant
connected to the Forge can write anything the vocabulary does not cover.

## Game

The **Game** page launches Godmarrow on the moor (or another zone) with a sprite set on the hero, the effects you
choose playing at them, and the attached effects from the Effects page; **Take a screenshot** runs the game for a
few seconds, saves a picture and shows it on the page; **Play the game** runs `Play Godmarrow.bat` (which gets the
latest version and finds or downloads Godot). Godot is found automatically; otherwise Settings has the path.

## Settings

The open project's style, Blender path, directions and render size; **Open another project**, **New project**,
**Forget this project** (the folder stays); the game folder and the Godot program; drag-and-drop status; **Check
for updates** and **Update and restart**.

**Painted effects (Midjourney spell and missile art).** Paint the effect in Midjourney with the `missile`, `effect` or
`spell_frames` world prompt (one shape on black), then Tools > Effects > Painted effect: a missile spins, sheds chips
of its own colours and gets 16 headings; a single frame becomes a breathing or flickering loop or a one-shot that grows
and dissolves; a strip of key frames loops as painted. The result is a game effect like any other: attach it to a
character, play it in the game, or put it in the spell designer as an `image` layer under generated embers and glow.

**Bone armour and auras.** Orbiting fragments round a character, in two halves: the half nearer the camera attaches in
front of the body and the far half behind it ("Behind the body" on the Effects page), so the pieces pass round the
figure. Presets `bone_armor` and `bone_shard_aura` in the spell designer; new ones are a row of numbers.

**Missiles.** The Effects tool has structured projectiles: bone spear, teeth, ice bolt, fire bolt, built like the
classic action-RPG missiles (a spinning spear body, chips of bone flying round it, a trail, a glow); every pixel is
generated. Set "rotations" to 16 or 32 to get a sheet with the spear facing every direction, which the game picks from
by heading.

**A-pose or T-pose?** Either works. The prompts ask for an A-pose (arms a little away from the body) because
Midjourney paints shoulders and sleeves more naturally that way and the carve separates the arms fine. Copy **A4**
gives a T-pose sheet when a character's arms keep merging with the body; the skeleton fits both.

## What the Forge checks for you

After cutting out, carving and filming, the Forge runs automatic checks and writes the result in the step notes and the log: white
specks left inside a figure, loose bits that would float, dark cloth the cut-out dropped, views of different heights, lines
sticking out of the carve, white pixels or size jumps in the frames. Small white specks inside dark cloth are painted the
cloth's colour automatically. `pixelforge project check <character>` prints the same list any time.

## Knobs you might touch

- **Settings → Quality style**: `godmarrow` (every colour kept, ~195 px tall) is the game's; `hd`, `16bit`, `8bit`
  exist for other projects.
- **Step 7 → Camera elevation**: 30° is Diablo II. 45° is more top-down.
- **Step 8 → outline**: the dark 1-pixel edge the game uses.

## When something goes wrong

- *"Blender was not found"* → step 5, **Download Blender for me**; or Settings → Blender.
- *"could not identify a front view"* → the sheet's background was not plain enough, or the views touch. Set
  **Figures on the sheet**, loosen the tolerance, or import a separate front image.
- *The sprite looks wrong* → the fix is nearly always in step 3 (cutout) or the sheet itself (A-pose, arms away
  from the body, plain background). Fix the cutout, run step 5 again.
- Anything else: **Log ▴** at the bottom shows exactly what ran. Paste it to an AI assistant with `docs/GUIDE_AI.md`.

## Let an AI drive it

Everything the app does is also a command. Tell Claude:

> Read `docs/GUIDE_AI.md` in this repo, then finish the character *wraith* in
> the project at `C:\Users\me\MyGame`.

It can run every step, read the same `project.json`, and tell you when it needs
you (Midjourney images, Mixamo).
