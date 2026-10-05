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
it said; Ctrl+C copies it). Every bench has tabs along the top of the text box (wooden signs; the lit one is the tab
you are on) and the same bottom line: **Keep**, **Render all**, **Undo**, **Reset** (this tab's levers back to their
defaults), **Start over** (one plain question, inside the window), **Advanced** (the same values as plain sliders with
finer steps) and **?**.

**What you can click.** Ember gold means you can click or change it; bone and grey are labels. Choices sit on small
iron plaques; the one in hand has a gold edge and the dagger beside it. Levers, wheels and chain pulls light up and
get a gold outline when the pointer is over them (the pointer becomes a hand; a grab hand while you drag). A value
under a lever, or a `< value >` on a line, can be typed: click it and a caret appears.

**The hint line.** The line on the wooden sill at the foot always names the thing in hand (or under the pointer) and
how to change it: "size · drag up or down, scroll, or click the value to type". Look there whenever you are unsure.

**The "?" choice.** On every bench, **?** (also the small plate on the title line) lays labelled callouts over the
bench: a tag by every group and lever saying how it is worked, and the keys. Any key or click clears it. It shows
itself the first time you open each bench.

**Where you are.** The title line reads like a path: **< back**, then the screens under this one, then this screen
and its tab. Click any earlier name to go back there; **< back** is always there.

**The ground.** The picture window shows the thing on the bench standing in a place: dungeon, crypt, moor, fen, snow
or a plain grey (for judging colours), chosen on the sill's right. The frame round the window is carved from that
place's stone (the crypt's green-grey, the moor's brown, the snow's frosted blue-grey) and its torches throw that
place's light; the **scene light** lever on the bench still turns the window's own light off, to the sprite's own
lights only, or on.

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
it, Keep puts it in the game. **Music.** A music editor: tracks, a 16-step grid with a piano roll, the song's parts, a library of premade
pieces across genres, and Keep as a game cue. The full manual is below, "The Music bench".

**Describe it.** The line on Home takes plain words: "a hooded necromancer with a skull-topped staff burning green"
drafts a shape model and opens the Characters bench with it; "a wisp lantern spell, pale blue, slow, with embers"
opens Effects with it playing; "a slow sombre act 2 wilds tune" opens the music rack on that cue.

**Under construction** (the bench says so itself, in gold, and nothing on it crashes):
- **Creatures.** The beast rig (four legs, a tail, wings) is not in the engine yet. The bench is the characters'
  bench; a creature dropped there stands on the humanoid skeleton.
- **The painting road** (a Midjourney sheet cut out, carved in Blender, filmed and pixelated) is not in the Forge:
  it is the classic Studio's, below. The Forge's Reference tab shows a painting beside the model, nothing more.
- **The cutout editor** (the painting road's masks) stays in the classic Studio. The pixel editor itself is in the
  Forge now: see *The editor* below.
- **The Play tile** is gone; *See it in the game* on a bench does the same with the thing you made.

### The editor

*Edit* on a character's **Frames** tab opens the pixel editor on that clip and direction (every frame the engine
rendered); *Edit* on the Effects, Tiles and Interface export tabs opens it on the picture that bench made; a picture
dropped on the editor opens too. The picture window is the canvas: the wheel zooms in whole steps about the pointer,
a middle-drag (or the pan tool, or Space and drag) pans, a left click uses the tool, a right click picks the colour
under the pointer. The tabs along the text box:

- **Paint.** The tools as pixel icons with their keys: **pencil** (P), **brush** (B, size with `[` and `]` or the size
  cycler), **eraser** (E), **fill** (G; contiguous, or global with the fill cycler or alt-click), **line** (N),
  **rect** (U) and **ellipse** (O; outline or filled with the shape cycler), **wand** (W; the tolerance cycler is an
  OKLab distance), **lasso** (L), **select** (M, a rectangle), **move** (V; drag the selection, alt-drag copies, the
  arrow keys nudge it, shift for tens), **clone** (S; alt-click sets the source, then paint; the offset follows the
  brush; the source may be another frame or direction, chosen on the Carry tab), **pick** (I, the eyedropper: anything
  on screen, the reference too), **pan** (H). Shift adds to a selection, alt subtracts; Ctrl+A selects all, Ctrl+D
  none, Ctrl+I inverts, Delete clears the selection, Esc drops it. X swaps the two colours. `,` and `.` step frames.
  Under the tools: the frame strip (click a frame; drag a thumbnail to reorder the clip), then *Save*, *Undo*, *Redo*,
  *Select all*, *Deselect*, *Clear*, *Mirror*. Every cycler's value can be typed: click the number, type, Enter (arrows
  step, shift for tens). That goes for every lever and wheel in the app too: click the value under it.
- **Colour.** The picker: a hue by lightness field at the saturation lever's value, the hex line, the sprite's palette
  as swatches (click one; the current slot is framed) and the words for the colour under the pointer: slot, hex,
  OKLab. The **palette lock** is on by default: *locked* snaps anything you paint to the nearest palette colour and
  says which; *open* lets a new colour in knowingly and counts what was added (the added swatches are ringed in gold).
  The palette is the frame set's own colours.
- **Layers.** Each frame has a base (the file), a paint layer (what you add; kept beside the frame) and any layers you
  add; click a layer's name to paint on it, its value to show or hide it; the opacity lever, *Merge down*, *Delete
  layer*, *Lock*, *Mirror* and *Flip* (the whole frame, or the selection). The **reference painting** is a dimmable
  overlay (the reference lever, or drop a painting on the editor); **onion skin** shows the previous and next frames.
- **History.** Every change, without limit, as a list: click one to go back to it (the later ones stay, greyed, until
  you change something new). Undo is Ctrl+Z, redo Ctrl+Y or Ctrl+Shift+Z.
- **Carry.** Paint on one frame, then *Carry to this clip*, *Carry to the other directions* or *Carry everywhere*: the
  last change on this frame is laid on the other frames by part where the render wrote part masks, else by position
  (a painted pixel lands where the target has the figure; an erased one where it has a pixel). The strip shows every
  frame it landed on with the count; it is one history entry, so *Undo* takes it all back. The clone source cycler
  lives here too.
- **Effects.** The library (the effects bench's kinds and spell presets): drag one onto the figure to anchor it there;
  it follows the clip and the directions. Drag an anchor to move it, its edge to scale, its handle to rotate; drag it
  off the figure to detach; right-click it for its levers (scale, rotation, strength, speed). Anchors are saved in the
  frame data (`frames/anchors.json`); *Bake anchors* writes the list beside the export and into the export's JSON (the
  game does not read them yet).

*Save* (Ctrl+S) flattens the visible layers into the frame files, so the export and the game see what you painted.
Leaving with unsaved work asks once, on the text box's own line.

**Choosing a file** anywhere opens the Forge's own browser in the text box: Pictures, Downloads, Desktop, Documents,
the project and recent files on the left, the folder's entries with thumbnails in the middle (the highlighted picture
shows in the picture window), the filter cycler (pictures, models, sounds, everything) at the top right, the typed
path at the foot. **Exit** is on Home and in the top line, beside the window / full screen switch.

**Settings** has the window / full screen switch, the window's scale, the sounds (a lever with three stops: off,
quiet, full; quiet is the default and keeps only the cursor blip, the select click and the back thud; nothing ever
sounds when a step finishes), the music, their levels,
reduced motion, the project and game folders, Blender (for the classic road), the style preset cards with animated
examples, and what this computer has.

Everything the app makes lands in a project folder it creates for you (Documents\PixelForge\Forge) and, when you
say so, in the game's art. An AI assistant can do every one of these things through the command line; the app and the
assistant never disagree, because the app only ever runs the same commands.

## Claude on the bench

Every bench has a line at the foot of the text box marked **Claude:** (press `/` to jump to it). Type what you want
in plain words and press Enter: *"slower, 76 bpm, darker"* on Music, *"a hooded necromancer with a skull-topped
staff, a longer cape"* on Characters, *"a slow pale wisp with embers"* on Effects, *"more variants, fewer colours"*
on Tiles. Claude Code (Anthropic's command-line assistant) takes the line and does the work through PixelForge's own
tools on the same project folder: it cannot do anything the levers cannot, and everything it does is one command
you could have run. While it works the title line reads **Claude: working** in a pulsing ember and the progress
strip says what it is doing right now (*drafting the model*, *setting tempo 76*). When it is done the bench reloads:
a new model stands in the window, the levers it moved light up for a moment, new notes are ringed on the grid, and
its one or two sentences of notes sit on the state line. **Undo** takes the whole run back, files included (the
bench keeps a snapshot of its files before every run). On Characters the result also brings the Midjourney prompts
for the figure: the *prompt* cycler on the Reference tab picks one, **Copy prompt** puts it on the clipboard.

**What you need, once.** Claude Code installed and signed in: install it from claude.com/claude-code, open a
terminal, run `claude`, sign in with your Anthropic account, close it. `install.bat` then tells Claude Code about
PixelForge's tools (`claude mcp add pixelforge`); the Forge does the same on its first launch if it finds it has not
been done. The title line tells you where you stand: **Claude: ready**, **Claude: not found (install Claude Code)**
or **Claude: not signed in**. A line typed before it is ready answers with the same sentence and the fix.

**When it fails.** The bench says so in one plain line, never a pop-up: *Claude Code was not found...*, *not signed
in...*, *Claude did not finish within 600 s; it was stopped...*, *Claude stopped at the spending limit for one job*.
Every run is written to `<project>\claude\logs\` (`pixelforge claude log` prints the last one; Ctrl+L shows the
Forge's own log). One job may spend up to 3 dollars of your plan's usage by default (`PIXELFORGE_CLAUDE_BUDGET`
changes it). A long sentence is fine; a vague one gets a vague result. Say what, not how: Claude knows the tools.

## Midjourney through your browser

Claude Code can drive your own Chrome through the **Claude in Chrome** extension, so the Characters bench can send its
prompt to Midjourney and bring the painting back without you copying anything: **Paint it in Midjourney** on the
Reference tab (Objects has **Fetch a turnaround** and **Fetch a prop sheet of nine**). The painting lands on the
Reference tab beside the model when it is done.

**First run, step by step.**
1. Install the Claude in Chrome extension from the Chrome Web Store (version 1.0.36 or later) and sign in to it with
   the same Anthropic account as Claude Code. Chrome or Edge; not inside WSL.
2. Sign in to midjourney.com in that same Chrome and leave Chrome open. The extension uses your logged-in tabs.
3. In a terminal, run `claude --chrome` once, press Enter on the one-time dialog, and ask it to *open midjourney.com*:
   the first time, the extension asks you to allow Claude on that site; allow it (the site permissions live in the
   extension's settings). Type `/chrome` in that session: it should read *Status: Enabled, Extension: Installed*. Close it.
4. In the Forge, with a model on the Characters bench, choose **Paint it in Midjourney**. The state line says *Watch
   the browser*: a new Chrome tab opens on midjourney.com, the prompt is typed in with the bench's clay view attached
   as the image prompt, the grid is waited for, the best variation (or all four when the choice says so) is
   upscaled, and the files are downloaded into `<project>\characters\<name>\reference\`. One job at a time, at a
   human pace; it can take a few minutes. Do not touch that tab while it works.

**What to do when it fails.** The bench says which it was:
- *Chrome is not connected to Claude Code* — Chrome is not open, the extension is not installed or not signed in, or the
  pairing was never done (step 3). Restart Chrome and run `claude --chrome` once more; `/chrome` in it has *Reconnect
  extension*.
- *Midjourney asked for a sign-in or a check* — do it in the tab yourself (Claude never passes sign-ins or checks),
  then choose the button again.
- *Midjourney gave nothing back* — the grid never finished or the download was refused; look at the tab, and at the log.
- Chrome integration needs a sign-in with your Anthropic account (a plan: Pro, Max, Team or Enterprise); it is off when
  Claude Code runs on an API key or a long-lived token.

The fallback is always there: **Copy prompt**, paste it in Midjourney yourself, upscale, save the PNG, and drop the
file on the bench. The bench says so whenever the browser road is closed.

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

**Music** in the classic Studio's Tools window is the game's older score (21 looping cues: `music a1_town`,
`music all`, the cue sheet). The Forge app has the music editor proper; it is described next.

## The Music bench (the Forge app)

Open **Music** on Home. The Forge's own theme is on the bench: a *song* of six lanes (lead, counter, pad, bass,
sparkle, drums), *patterns* of 16-step bars, and *parts* (sections) that chain the patterns into a piece. Everything
you do is written to `<project>/music/current.song.json`; **Keep** renders it into the game. The picture window
is the editor's canvas; the text box holds the controls. **Space** plays and stops on every tab; the running cursor
is a one-pixel line. What plays is the **loop** cycler: *bar* (the bar shown, the quickest way to hear an edit),
*pattern* (every bar of it), *section* (one part), *song* (all of it). While it plays, each change renders the bar
again in well under its length and the sound swaps on the beat.

**Tracks.** One column per lane in the picture: instrument, note count, level meter, pan, tone, `m` for muted, `s`
for solo. Click a column (or the *lane* cycler) to pick it. *instrument* cycles the named SNES-style presets of that
lane's family: strings (warm, dark, fast, cello), brass (horn, stab, trumpet, tuba), choir (ahh, ooh, men), bells
(glass, tubular, music box, vibraphone, marimba, celesta), organ (cathedral, reed), keys (electric piano,
harpsichord), plucked (harp, lute, steel guitar, pizzicato), bass (synth, pick, sub, slap), leads (square, pulse 25,
pulse 12, saw, triangle, sync), winds (wooden flute, pan flute, ocarina, oboe), pads (dark, glass, synthwave); the
drums lane cycles kits (rock, orchestral, chip, taiko, electro, brush). Levers, each with its number under it:
**level** 0-100, **tone** (duller to brighter), **pan** (L 100 .. centre .. R 100). Chain pulls: **mute**, **solo**
(solo wins). The **SNES** lever is the whole song's SNES-ness: it band-limits every voice like a looped sample
through the console's output filter, adds its grain and echo and caps the voices at eight; 70 is where it sounds like
the console without turning to mush, 0 is clean. *Hear lane* plays the lane alone; *Generate lane* writes a new line
for it in the song's genre; *Clear lane* empties it in the current pattern. *Reset* puts the lane's levers back to
level 80, tone 50, centre.

**Pattern.** The picture shows the chosen bar: the six lanes as rows of sixteen cells (notes as bars, brighter for
louder) and under them the piano roll of the chosen lane (rows are semitones, the scale's rows lit, the root marked
and named; for the drums the rows are kick, snare, stick, clap, hat, open hat, three toms, crash, ride). **Click**
a cell to place a note of the current *length* and *velocity* (a click on a note removes it; right-click removes);
the mouse wheel scrolls the roll by pitch, shift-wheel by octaves; a click on a lane row picks the lane. **Keyboard:**
*Grid* (or **G**) hands the keys to the grid: arrows move the cursor (left and right past the bar's edge turn the
bar), **Enter** places or removes, **Delete** removes, **[ ]** change the note's length, **- =** its velocity,
**PgUp PgDn** jump an octave, **Tab** the next lane, **Esc** gives the keys back to the choices. Cyclers: *pattern*,
*bar*, *lane*, *note* (the pitch the keyboard places; with the lock on it steps through the scale), *length* (a
quarter step to a whole bar), *velocity* 10-100, *lock* (scale lock: a placed or transposed note snaps to the key;
off, any note), *loop*. The operations line: **Place** (the cursor's note), **Copy bar / Paste bar** (the lane's
bar, pasted into the bar shown), **Up / Down** (a scale step), **Octave + / -**, **Reverse** (the bar backwards),
**Double** (the pattern twice as fast, repeated to fill), **Halve** (twice as slow; the pattern grows), **Humanise**
(small timing and loudness changes), **Quantise** (back onto the grid), **Clear bar**, **Generate bar** (the
composer writes the bar in every lane over the pattern's chords), **Generate lane**, **Add pattern** (a copy of this
one, chained at the end). Undo is everywhere (Ctrl+Z, the Undo choice).

**Song.** The picture shows the parts as boxes in a row (name, pattern, repeats, `+n` when a part is transposed:
that is how a bridge changes key), a bar ruler and the playhead. Cyclers: *part*, *plays* (which pattern), *x*
(repeats), *shift* (semitones), *key* (the root), *scale* (major, minor, dorian, phrygian, lydian, mixolydian,
harmonic minor, hungarian minor, phrygian dominant, pentatonics, blues, whole tone). Levers: **tempo** 40-200 bpm,
**crunch** (soft saturation: the warm distortion of the old hardware's output stage), **bits** 4-16, **echo** (the
SPC-style echo), **hall** and **hall size**, **voices** (how many notes may sound at once; 8 is the SNES, "all" is
no limit) and the **32 kHz** pull (off is 44.1 kHz). Choices: *Play part*, *Play all*, *Add part* (after this one),
*Remove*, *Left / Right* (move it), *New pattern* (empty, four bars, chained). *Reset* puts the sound back to clean
defaults.

**Library.** The premade pieces in two sets: *godmarrow* (the game's dark set: dungeon synth, gothic orchestral,
gothic march, barbarian epic, dark acoustic, ambient dread, gothic rock, dark ambient, battle, boss, sorrow,
exploration, title; all minor-mode, in the late-SNES orchestral voices) and *general* (bright pieces for other games:
chiptune, tavern, town, victory, synthwave), plus the Forge's own loops. The *set* cycler opens on the game's set
for a gothic project and has *show all*; *genre* filters further;
**Enter** on a name loads it onto the bench (it is a song, not a recording: everything in it can be edited). To
write a new piece choose a *genre*, a *mood* (dark, hopeful, tense, calm, heroic, sombre, playful, eerie) and a
*seed*, then **Compose**; **Dice** rolls another seed. A composed piece has a chord progression, a motif the lead
states and develops, a counter-line answering it, a pad, a bass that pedals or walks, a sparkle lane of high
arpeggios, drums with fills, and a bridge in another key.

**Export.** Type the cue's *name* (the field; Enter keeps it). **Keep** writes `<name>.ogg` and `<name>.song.json`
into the game's `audio/music`, as a seamless loop at the game's loudness. *Save song* writes the song file alone
into the project's music folder; *WAV* and *OGG* render there too and show the waveform and spectrogram. *Play
whole* renders and plays the entire piece.

*Start over* puts the Forge's theme back on the bench; what was kept in the game stays. Every control here is one
`pixelforge music ...` command (GUIDE_AI lists them), so an assistant can do the same without the window.

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

The painting is the reference for the costume, not the source, and the Forge can read it: **measure** takes the
figure's widths from the front, side and back views and sizes the starting model to them, **sample materials** takes
the painting's colours into the model's ramps, and **compare** puts painting and model side by side at one height so
you can see what is still off (`pixelforge shapes measure`, `sample-materials`, `compare`; the assistant runs them).
Writing the file is a job for the AI assistant (the necromancer, the Keeper and the Hemomancer under `assets/shapes/`
are the examples); you judge the result and ask for changes in plain words ("the hat is too bright", "make the skirt
longer"). To look: `pixelforge shapes preview FILE --clip walk
--direction E` makes a GIF; `pixelforge shapes sheet FILE -o sheet.png` a contact sheet; `pixelforge shapes
turntable FILE -o turn.gif` a spin. To put one in the game: `pixelforge project import-shapes <character> FILE -p
<project folder>`, then **render-shapes** and **export-game** as usual (the step-by-step list for an assistant is
`docs/GUIDE_SESSION.md` in the game repository). "Describe it" can draft a starting file from a sentence
(`pixelforge shapes draft "a knight in steel plate with a sword and a crimson cape" -o knight.shapes.json`): a
mannequin with the right pieces, to be shaped by hand or by the assistant. It knows the pieces the Hemomancer needed
(a spiked crown, locs, chains, shackles, a plank skirt, spiked greaves, rivets, a back cape) and builds them from a kit,
so the next character with any of them starts with them in place.

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

- **Godmarrow**: the game's own look, 195 px tall, every colour kept, the dark edge. The default: a character made
  as a shape model renders at this size unless you pick another, and *Export sheets* warns when a set is not this tall.
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
