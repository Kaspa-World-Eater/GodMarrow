# PixelForge — the short guide

Turn Midjourney pictures into real pixel-art characters, animated, seen from 8 directions, ready for the game; and
objects, spells, tiles, icons, portraits, frames, sounds and music. Runs on any Windows laptop. No graphics card
needed. No paid tools. No Mixamo.

## The Forge app (start here)

Double-click **PixelForge** on the desktop (or `PixelForge.bat` in the `tools\pixelforge` folder). It opens full
screen, in the game's own look, and shows nine tiles:

**Make a character · Make an object · Make a spell or effect · Make tiles and ground · Make icons, portraits and UI ·
Make sounds and music · Fix up a picture · Play the game · Settings**

Pick a tile and follow the path. Every screen has one big teal button (the next thing to do), a picture of what you
get, a line saying what happens next, and a strip along the top showing where you are. **Esc** (or the gamepad's B
button) always goes one screen back. The arrow keys, Enter and a gamepad work everywhere; so does the mouse.

**Make a character.** Drop your painting onto the window (or press *Choose a painting*). That is all you set up: the
Forge cuts the figure out, locks its colours, builds the 3D figure, gives it its moves, films it from 8 directions,
turns the film into pixels and packs the game files, one after another, lighting up the strip as it goes. Filming is
the slow part (ten minutes or more on a laptop). Then you see it walk: turn the dial to any direction, pick a move.
Press **Put it in the game**, then **See it in the game**: the game opens with your character on the moor.
The first time, the Build step stops with a card: Blender does the 3D part. Press **Download Blender for me** (free,
380 MB, no installer) and the path carries on by itself. There is also a "no 3D for now" road that makes a still
sprite that breathes.

**Make an object.** Drop a painting of a barrel, a gravestone, a dead tree, a banner. It is cut out, given its
footprint, and pressed to the game's pixels. Choose whether it stays still, sways like a tree, flutters like a banner
or flickers like a flame, then put it in the game's object list.

**Make a spell or effect.** Pick a shape (missile, nova, wall, burst, armour, and more) or one of the game's whole
spells, then a look (the game's colour ramps). Watch it play. Put it in the game and **See it**: it plays at the hero
on the moor.

**Make tiles and ground.** Drop a painted ground texture; it becomes iso diamonds with variants and edge tiles.
**Make icons, portraits and UI.** Icons from one flat-lay painting; a portrait from a front view; a stretching
frame from a painted panel. **Make sounds and music.** Pick a place in the game, hear its cue, ask for another tune,
keep it; or make the eighteen small sounds. **Fix up a picture.** Click where the fix goes: recolour (the shading
stays), glow, erase, restore the original, smooth. Undo takes a click back; Keep saves it with the original beside it.

**Describe it.** The bar at the top of the first screen takes plain words: "a wisp lantern spell, pale blue, slow,
with embers" opens the spell path with that spell playing; "make the left eye teal with a pale glow" opens the fix-up
path; "a grave knight with a rusted helm" gives you the painting prompt; "a slow sombre act 2 wilds tune" renders it.

**Advanced, not hidden.** Every screen has an *Advanced* fold with the step's real settings and their usual values
(the same ones the command line takes), closed until you open it. **Log** at the top right shows exactly what ran.
**Settings** has the window / full screen switch (also F11), the sounds, the folders, what this computer has, and
the button to open **PixelForge Studio (classic)**, the older window with every form.

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

**Updating.** The Studio checks for a newer version when it opens and shows one button, **Update and restart**. The same
is in Help > Update PixelForge, and **`Update PixelForge.bat`** in the folder does it from outside the app. The game and
the Forge live in one folder, so one update brings both.
4. Double-click an icon. If the app does not open, run **`PixelForge.bat`**; if the classic window does not, run
   **`PixelForge Studio.bat`**; a crash is written to `studio_error.log` next to it.

**Blender** (free) does the 3D part. You do not have to install it: step 5 has a **Download Blender for me**
button (380 MB, no installer). If you already have Blender, the app finds it.

## The classic Studio (the older window)

Everything below is the older window, **PixelForge Studio (classic)**: a step list on the left, forms, every editor and
tool. The app above covers the everyday jobs; the Studio keeps the full editors (cutout, skin with layers and the
clone brush, colour, effects with per-view attachments, the spell designer, the skill-tree editor) and every tool form.

### How a character is made

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

The **Describe it…** button (also Ctrl+D, and Tools > Describe it): say what you want in plain words and the Forge
drafts it and opens it in the right editor. "A wisp lantern spell, pale blue, slow, with embers" becomes a spell in
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
