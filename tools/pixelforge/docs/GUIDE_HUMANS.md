# PixelForge — the short guide

Make real pixel-art characters, animated, seen from 8 directions, ready for the game; and objects, spells, tiles,
icons, portraits, frames, sounds and music. Runs on any Windows laptop. No graphics card needed. No paid tools. No
Mixamo.

**Characters are made as shape models** (the **Characters** bench below, or `pixelforge shapes` from a prompt): a
small file of solids on a standard skeleton that the Forge draws as pixel art and moves with the motion clips, at the
game's hero size. A painting is the reference the model is measured against, not the thing that gets cut up. The
older way (cut the painting out, build a 3D figure in Blender, film it) is still in the classic Studio and in the
`pixelforge hero` command, which says so when you run it; it is for props and for comparison, not for a character.

## The Forge app (start here)

Double-click **PixelForge** on the desktop (or `PixelForge.bat` in the `tools\pixelforge` folder; from a prompt,
`pixelforge forge`). It gets the latest version first, then opens full screen in an old dungeon-menu framing: an
ornate pixel frame, a picture window above (the thing on the bench, standing in a dungeon, crypt, moor, fen, snow or a
plain grey ground, chosen at the foot of the screen), and a text box below with the bench's words, its levers and
wheels, and its choices. Home has nine choices and a describe line:

**Characters · Creatures · Objects · Effects · Tiles and ground · Interface · Sound · Music · Settings**

The arrow keys, Enter and a gamepad (d-pad, A, B, LB/RB for the tabs) work everywhere; so does the mouse. **Esc** (or
B) goes back. **F11** switches between full screen and a window. **Ctrl+L** opens the log (exactly what ran and what
it said; Ctrl+C copies it). Every bench has tabs along the top of the text box and the same bottom line: **Keep**,
**Render all**, **Undo**, **Reset** (this tab's levers back to their defaults), **Start over** (one plain question,
inside the window) and **Advanced** (the same values as plain sliders with finer steps).

**Characters** (the heart of it). A character is a *shape model*, a `.shapes.json` file of solids with materials,
rendered as pixel art by the engine and moved by the motion clips (idle, walk, run, attack, cast, hit, death) from
eight directions. Drop a model file on the window (`assets\shapes\characters\keeper.shapes.json` is the Keeper) or
press *Start from the Keeper*. The tabs: **Reference** (the model beside a reference painting, with the checks that
say what to change), **Model** (pick a part and a solid, move and scale it, change its material, hide it),
**Materials** (every material's colour ramp with hue, lightness, contrast and steps; each light's glow kind, colour,
strength, pulse and radius; *Randomise* for a variant, *Champion* saves a recolour beside the model), **Motion** (the
clip and the facing, the lag, sway and hang of the loose parts, the turn and move steps, the camera; *Render clip*
draws the one you are looking at, **Render all** every clip in every direction), **Frames** (the frame strip: hold or
delete a frame, mirror a direction, paint a pixel, onion skin), **Export** (*Export sheets* writes the game's sheets;
*Put it in the game* copies them into the game's art; *See it in the game* opens the game with the character on the
moor; *Take it out* puts the earlier files back). Every edit is written into the model file, so an assistant editing
the same file by hand sees what you did, and you see what it did.

**Objects.** The same engine without bones: a chest, a skull, a dead tree (examples on the bench), or any object's
shape model. Model and Materials as above; **Behaviour** has the camera, the world scale, the shadow and the height;
**Export** writes the PNGs with foot anchors (S alone, or all eight facings) and the entry for the game's object list.

**Effects.** **Shape** picks a procedural effect (wisp, fire, smoke, burst, nova, bolt and the rest) in a palette,
with its size, frames, speed, bands, glow and haze; **Layers** builds a whole spell from stacked effects (presets to
start from); **Looks** is the palette row; **Missile** the flying things with their headings; **Export** puts it in the
game's effects and plays it at the hero. *From a painting* (or a drop) reads a painted effect instead.

**Tiles and ground.** Drop a painted ground texture: iso diamonds with variants; a second texture makes the edge tiles.
**Interface.** A painted panel becomes a stretching 9-slice frame; one flat-lay painting becomes inventory icons; a
front-view cutout becomes portraits. **Sound.** Eighteen pads with pitch, length, grit, tone and the wave; Play hears
it, Keep puts it in the game. **Music.** Every place in the game as a cue, with a rack of real controls (tempo, key,
mode, metre, tune, wind, echo, the drone); Play renders twenty seconds; Keep writes the loop into the game.

**Describe it.** The line on Home takes plain words: "a hooded necromancer with a skull-topped staff burning green"
drafts a shape model and opens the Characters bench with it; "a wisp lantern spell, pale blue, slow, with embers"
opens Effects with it playing; "a slow sombre act 2 wilds tune" opens the music rack on that cue.

**Under construction** (the bench says so itself, in gold, and nothing on it crashes):
- **Creatures.** The beast rig (four legs, a tail, wings) is not in the engine yet. The bench is the characters'
  bench; a creature dropped there stands on the humanoid skeleton.
- **The painting road** (a Midjourney sheet cut out, carved in Blender, filmed and pixelated) is not in the Forge:
  it is the classic Studio's, below. The Forge's Reference tab shows a painting beside the model, nothing more.
- **The fix-up editors** (the cutout editor, the skin editor with layers and the clone brush, the colour editor)
  stay in the classic Studio. The Forge's Frames tab paints single pixels only.
- **The Play tile** is gone; *See it in the game* on a bench does the same with the thing you made.

**Settings** has the window / full screen switch, the window's scale, the sounds and the music with their levels,
reduced motion, the project and game folders, Blender (for the classic road), the style preset cards with animated
examples, and what this computer has.

Everything the app makes lands in a project folder it creates for you (Documents\PixelForge\Forge) and, when you
say so, in the game's art. An AI assistant can do every one of these things through the command line; the app and the
assistant never disagree, because the app only ever runs the same commands.

## Install (once)

1. Install **Python 3.11 or newer** from python.org. Tick **"Add Python to PATH"**.
2. Get the `tools/pixelforge` folder (it lives in the GodMarrow repository).
3. Double-click **`install.bat`**. It sets everything up and puts two icons on the desktop: **PixelForge** (the
   full-screen app above) and **PixelForge Studio (classic)** (the older window described below). The app needs
   Godot 4 (free); it finds the one the game uses, or fetches it the first time.

**Playing the game.** The **Godmarrow** icon on the desktop (made by `install.bat`; or `Play Godmarrow.bat` in the
Godmarrow folder) gets the latest version first, finds Godot 4 or downloads it (free, once), and starts the game.

**Updating.** PixelForge updates itself every time it opens: the program pulls the latest version (a quiet
`git pull`), installs anything new, and restarts on the new code before the window appears. This happens whichever
icon starts it, old or new, because the update is inside the program, not the shortcut. An icon made by an older
`install.bat` opens the Forge too (the classic window is `pixelforge studio --classic`). **`Update PixelForge.bat`**
does the same by hand. The game and the Forge live in one folder, so one update brings both.
4. Double-click an icon. If the app does not open, run **`PixelForge.bat`**; if the classic window does not, run
   **`PixelForge Studio.bat`**; a crash is written to `studio_error.log` next to it.

**Blender** (free) does the 3D part. You do not have to install it: step 5 has a **Download Blender for me**
button (380 MB, no installer). If you already have Blender, the app finds it.

## The classic Studio (the older window)

Everything below is the older window, **PixelForge Studio (classic)**: a step list on the left, forms, every editor and
tool. The app above covers the everyday jobs; the Studio keeps the full editors (cutout, skin with layers and the
clone brush, colour, effects with per-view attachments, the spell designer, the skill-tree editor) and every tool form.

### How a character was made on the old road

This is the cutout → Blender road. Characters are shape models now (see "Characters drawn by code" below and the
Characters bench); these steps stay for props, portraits and comparison.

1. **New project** → pick an empty folder (one project per game).
2. **+ Add character** → name it, write one sentence about it.
3. **Step 1** → click **Copy A: sheet** → paste into Midjourney. You get front, side and back in one picture.
   Upscale it and save the PNG. (Copy **A2** for a four-view sheet: better 3D. Copy **A3** for a plan sheet, top view and underside,
   when the character has a wide hat or shoulders: the camera looks down on everyone, and this is the only view that paints the top. Copy **C** for a single pixel-style
   picture: better colours.)
4. **Step 2** → choose that PNG as the character sheet (and the C picture if you made one).
5. Click **▶ Run all automatic steps** and wait. The log at the bottom shows what is happening. Filming from 8
   directions is the slow part (a few minutes on a laptop).
6. **Step 8 → Preview animation**: watch any move from any direction. **Save GIF** if you want to show someone.
7. **Step 9 → Export for Godmarrow**: type the kind name (for example `mystic`), click, and copy the files it names
   into the game's `art/sprites` folder. Other Godot games: **Export** gives a SpriteFrames and a scene.

### Fixing a bad cutout (step 3)

The automatic cutout is usually right. When it is not (background stuck to the figure, a sleeve cut off):

- Click **Edit front** (or side / back). Left-drag **erases**, right-drag **puts pixels back**, **Magic erase**
  removes one patch of colour with a click. **Undo** undoes. **Save**.
- Or **Open folder** and edit the PNG in any paint program, then **Reload**.
- If it found the wrong number of figures, set **Figures on the sheet** to 3 or 4 and run split again. Loosen the
  tolerance if background remains; tighten it if the figure loses parts.
- Then run steps 4 and 5 again (click them on the left).

### Quick path, one picture → one sprite

For a first look, bosses, portraits, items. No Blender. Click **★ Quick path** in the step list, pick the picture
and an animation (sway, hover, flame...), click **Make sprite + animate + export**.

### The Continue button

The step list marks what is done (grey tick), what is next (teal arrow) and what is still to do. **Continue** opens the
next step and runs it when it is automatic; it only stops on the two steps that need you (the prompts and the
pictures). **Run all automatic steps** does every remaining step in one go. The bar at the bottom shows what is
happening; the log shows the details. Checks that found something are listed under the buttons in gold.

### Other things the Forge makes (the **Tools** button)

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

### Describe it, get it
## Characters drawn by code (shape sprites)

Since October 2026 a character does not have to start from a painting. A **shape sprite** is a small text file
(`.shapes.json`) that lists the pieces of a figure (a hat as a cone, a head as an egg, arms and legs as capsules, a
coat as a ring with a ragged hem) with a colour ramp each, and which bone of the body each piece rides. The Forge
draws it as pixel art with the same shading rules for everything (one light from the top left, dark lines between
pieces, a thin outline, glowing eyes and flames drawn last, a dithered shadow on the ground) and plays the library's
motion clips on it (24 of them, idle, walk, run, attack, cast, hit, death and more), so every clip comes out as real
frames from all eight directions, with skirts, veils and cords hanging from the body and swinging after it, the feet
on the ground and the hat on the head. The pieces move the way a hand would draw them: by whole pixels, holding a
pose until it has somewhere to go, so nothing crawls or boils between frames. No Blender, no Mixamo, a few seconds
per clip. One file serves both sizes: the small-size variant keeps the silhouette and drops the detail. Objects (a chest, a skull, a dead tree)
are the same kind of file without bones, rendered as a still with a foot point for the game.

The painting is the reference for the costume, not the source. Writing the file is a job for the AI assistant (the
necromancer and the Keeper under `assets/shapes/` are the examples); you judge the result and ask for changes in
plain words ("the hat is too bright", "make the skirt longer"). To look: `pixelforge shapes preview FILE --clip walk
--direction E` makes a GIF; `pixelforge shapes sheet FILE -o sheet.png` a contact sheet; `pixelforge shapes
turntable FILE -o turn.gif` a spin. To put one in the game: `pixelforge project import-shapes <character> FILE -p
<project folder>`, then **render-shapes** and **export-game** as usual (the step-by-step list for an assistant is
`docs/GUIDE_SESSION.md` in the game repository). "Describe it" can draft a starting file from a sentence
(`pixelforge shapes draft "a knight in steel plate with a sword and a crimson cape" -o knight.shapes.json`): a
mannequin with the right pieces, to be shaped by hand or by the assistant.

## Describe it, get it

The **Describe it…** button (also Ctrl+D, and Tools > Describe it): say what you want in plain words and the Forge
drafts it and opens it in the right editor. "Draw a hooded necromancer with a bone staff as shapes" drafts a shape
sprite (see above). "A wisp lantern spell, pale blue, slow, with embers" becomes a spell in
the spell designer with those layers. "Make the left eye teal with a pale glow" finds the eye on the chosen picture
and opens the skin editor with the change made (Undo if it read you wrong). "A grave knight with a rusted helm" gives
the Midjourney prompt. "A slow sombre act 2 wilds tune with more wind" renders and plays that cue. It is a draft from
a vocabulary of colours, effects, places and moods, not a mind-reader; an AI assistant connected to the Forge can
write anything the vocabulary does not cover.

### Preview in game

**▶ Preview in game** (step 9, Tools > Preview in game, or the Tools menu) launches the game on the moor with the
character's exported set on the hero, the effects you attached playing on them, or any effect by name, so judging
happens in the real light and scale. Godot is found automatically; if not, set `PIXELFORGE_GODOT` to its path. With
"screenshot" ticked it saves a picture after four seconds and quits instead.

### Skins and spells

**Skin editor** (step 3 under each cutout as "Skin", step 9 on the finished set, Tools > Skin editor for any PNG):
a paint-program toolbar. Pick + recolour is the colour editor's eyedropper. Brush paints a colour; Glow adds a soft
light that spills a little past the edge; Erase and Restore take pixels away and bring the original back; Smooth
softens a patch; Region lets you click round a part (an eye, the lantern, the hood), name it, and recolour it by name
later. Every stroke is an operation; "Save ops as JSON" writes them out so an AI assistant can replay or adapt them
with the edit_skin tool, and the same operations run from the command line (`pixelforge skin`).

**A-pose or T-pose?** Either works. The prompts ask for an A-pose (arms a little away from the body) because Midjourney paints shoulders and sleeves more naturally that way and the carve separates the arms fine. Copy **A4** gives a T-pose sheet when a character's arms keep merging with the body; the skeleton fits both.

**Painted effects (Midjourney spell and missile art).** Paint the effect in Midjourney with the `missile`, `effect` or
`spell_frames` world prompt (one shape on black), then Tools > Painted effect: a missile spins, sheds chips of its own
colours and gets 16 headings; a single frame becomes a breathing or flickering loop or a one-shot that grows and
dissolves; a strip of key frames loops as painted. The result is a game effect like any other: attach it to a
character, play it in the game, or put it in the spell designer as an `image` layer under generated embers and glow.

**Bone armour and auras.** Orbiting fragments round a character, in two halves: the half nearer the camera attaches in
front of the body and the far half behind it (the effects editor has a "Behind the body" tick), so the pieces pass
round the figure. Presets `bone_armor` and `bone_shard_aura` in the spell designer; new ones are a row of numbers.

**Selections and the clone brush.** A selection is built the way you would expect: the magic wand picks the patch of one
colour you click, **Shift+click** adds another patch or lasso to it, **Alt+click** takes one away, and a plain click starts
over. Name it and every later edit (recolour, glow, erase, lightness) can target it by name. The **clone brush** repairs a
spot with the painting's own pixels: Alt+click the place to copy from, then paint where it should go; the offset holds
along the stroke, as a clone stamp does, and nothing is ever copied from bare background.

**Layers in the skin editor.** The Layers panel adds, hides, reorders and merges layers; every stroke lands on the
selected layer and Save flattens the visible ones into the file. The ops list records which layer each stroke went on.

**Missiles.** The Effects tool has structured projectiles: bone spear, teeth, ice bolt, fire bolt. They are built like the classic action-RPG missiles (a spinning spear body, chips of bone flying round it, a trail, a glow) and every pixel is generated. Set "rotations" to 16 or 32 to get a sheet with the spear facing every direction, which the game picks from by heading; new missiles are a few numbers in a table.

**Spell designer** (Tools > Spell designer): a spell is layers of effects. Start from a preset (fireball, ward, soul drain, bone shatter, lightning strike, bone spear hit, frost nova, fire wall,
corpse burst), add or remove layers, and set each layer's kind, colours, size, position,
rotation, start frame, speed, opacity and blend (normal or add) while the preview loops. Export writes the strip and
the JSON the game plays, plus a GIF and the editable spell file, so a spell is placed in the game exactly like any
effect and attached to a character with the effects editor.

### Colours and effects, by hand

**Colour editor** (step 3 under each cutout, step 9 on the finished set, Tools > Colour editor for any PNG): click a
colour on the picture, widen the range until the highlight covers what you mean (both eyes, the whole trim), click
New colour and pick one. The shading stays; only the colour changes. The sliders tune lightness, chroma and hue; "Only
near the click" limits it to one spot. Apply, then Save (the original is kept as a .bak). On a cutout the change goes
into the model and every frame; on a finished atlas every frame changes at once.

**Effects editor** (step 9, Character menu, or Tools > Effects editor): drag an effect from the list (smoke, wisp,
embers, fire, glow rings...) and drop it where it belongs, for example on an eye, with a colour set and a size. Place it
per view, or place it once and copy to all views (left-facing views mirror). Preview plays the idle clip with the
effects on. Save writes the placements into the sprite set and the effect sheets into the effects folder; the Godot
add-on spawns them at the right spot for whichever way the character faces.

### What the Forge checks for you

After cutting out, carving and filming, the Forge runs automatic checks and writes the result in the step notes and the log: white
specks left inside a figure, loose bits that would float, dark cloth the cut-out dropped, views of different heights, lines
sticking out of the carve, white pixels or size jumps in the frames. Small white specks inside dark cloth are painted the
cloth's colour automatically. `pixelforge project check <character>` prints the same list any time.

### Knobs you might touch
## The look (styles)

A **style** is one choice that fixes everything about how a painting becomes game art: how tall a figure stands in
pixels, how many colours it keeps, whether it has a dark outline, flat shading bands or the painting's own shading, how
punchy the colours are, how soft the edges are, how effects glow, how many frames a loop has and how fast it plays,
and the size of a ground tile. Seven looks ship, each with an animated example of the Shrine Keeper in that look
(`assets/styles/<look>.gif`; all of them side by side with their numbers in `assets/styles/styles_sheet.png`):

- **Godmarrow**: the game's own look, 195 px tall, every colour kept, the dark edge.
- **Gothic hi-res**: large finely drawn figures (120 px), dark gothic palette, soft shading, no outline.
- **Rendered ARPG**: 76 px figures that look rendered, cool dark palette of 28 colours, no outline.
- **SNES 16-bit**: chunky 56 px figures, 16 colours, hard outline, three flat shading bands in clean colour areas
  (specks are tidied into the area round them), short loops, no glow.
- **Handheld 32-bit**: small bright 40 px figures, 15 colours, hard outline, the same clean areas.
- **Modern indie pixel**: 80 px, saturated accents, four shading bands, smooth twelve-frame loops.
- **Painterly hi-bit**: 144 px, 96 colours, almost the painting.

Pick one in **Settings → Style** (or `pixelforge project set --style snes` from a prompt) and run the palette,
pixelate and export steps again; the whole project takes the new look. One character can have its own
(`--character`). Every number behind a look can be changed: `pixelforge styles` prints them all.

## Knobs you might touch

- **Settings → Style**: the look (above). `godmarrow` is the game's; the others are for comparing and for other games.
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
