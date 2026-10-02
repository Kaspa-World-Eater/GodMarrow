# The Forge app's look: old-school dungeon text-adventure framing

Reference: `docs/refs/forge_gui_reference.png` (the owner: "i want the gui to look something like this with sweet
old school mystery dungeon bit style music"). What it is:

- A near-black screen with ONE palette: ink black and a pale bone-grey, nothing else (two or three tones at most;
  teal only for the focused control). The whole UI is 1-bit-ish pixel art: dithered shading, no gradients, no
  anti-aliasing, pixel fonts only.
- An ornate hand-drawn pixel border round everything: a thick frame with thorned/bony corner flourishes, the title in
  a blackletter-style pixel font on a banner at the top of the frame. Panels inside are framed the same way.
- A picture window in the upper part (in the reference, a dungeon corridor; for the Forge: the thing being made,
  the preview, or a dungeon-corridor idle scene on Home with the quest tiles as objects in it) drawn in the same
  1-bit dithered style.
- A text box below in a pixel serif, narrative tone ("two torches flicker on the far side of the room..."): the
  Forge's "what happens next" and the checks' notes are written and shown like this, as if a dungeon master were
  describing the step. Buttons are text in the same box, chosen with the d-pad or the mouse, the chosen one marked
  with a pixel cursor glyph (a sword, a hand), not a glowing rectangle.
- Transitions: a pixel dissolve or a torch-flicker fade. Cursor: a pixel hand or dagger.
- Music: "sweet old-school mystery-dungeon bit-style" chip music, looping, quiet: square/triangle leads over a soft
  minor progression, gentle arpeggios, a slow 90-110 bpm, Shiren/Mystery Dungeon and early Zelda-dungeon feel,
  warm not grim; make it with `music.py` (a new "forge" cue family, chiptune instruments: pulse 12.5/25/50%,
  triangle bass, noise percussion) and ship 2-3 loops (home, working, done) plus UI blips in the same voice.
- Still a tool: the picture window is where previews, frame strips, racks of knobs (drawn as pixel dials) and the
  drop target live; the text box is where the step's words and choices live. Full screen, integer scaled.

## Music reference (the owner's upload)

`docs/refs/forge_music_reference.mp3` (a Pixabay dungeon-synth track, reference only, not to ship). The owner:
"maybe not so distorted and some sparkly high notes but stuff like this". Measured: 107 s, loud for ambient
(RMS 0.13), very dark spectrum (median spectral centroid about 275 Hz: nearly all energy under 1 kHz), tonal centre
around C#, slow drifting pads with no real beat. So the Forge's music family is DUNGEON SYNTH, not chiptune:
- slow (60-80 bpm or free time), long detuned pad chords in C# minor / phrygian, a low drone, soft noise wash,
  plenty of hall reverb and a slow echo;
- cleaner than the reference: no distortion or clipping, the low end tidy (high-pass the pads at ~60 Hz), master
  RMS about 0.09 like the game's cues;
- the "sparkly high notes": a bell / music-box / glass-pluck voice (sine with a short bright attack, long decay,
  shimmer reverb) playing sparse pentatonic or minor-scale arpeggios and occasional high trills in the 1-4 kHz
  range, quiet, as the one bright thing over the dark pads, with the spectral centroid landing around 600-900 Hz
  overall;
- three loops (home, working, done) sharing one motif, 90-120 s, seamless, plus matching UI blips (a soft bell
  for confirm, a low thud for back).
Built in `music.py` as a "forge" cue family with its own instruments, rendered by the same path as the game's cues
(`pixelforge music forge_home` etc.), knobs on the music rack.

## Correction from the owner (2026-10-02): aesthetic, not quests

"We are keeping the gamified aesthetic. We don't necessarily need the quest thing; it's more the aesthetic of
PixelForge itself having that old-school Super Nintendo feel while being a highly technical program that is easy
for humans and for AIs in their own way."

So: drop the quest framing (no "quests", no progress strips dressed as level selects, no narrative hand-holding).
Keep the look and feel: full screen, integer-scaled pixel rendering, the 1-bit dungeon frame and pixel fonts, the
dungeon-synth music and bell/thud sounds, pixel cursor, gamepad and keyboard, transitions. Inside that skin the
Forge is a straightforward professional tool: Home with the nine things it makes as tiles; each one opens a
workbench with tabs; every workbench is picker / live preview / knobs / bottom bar (Keep, Reset, Start over,
Undo); Advanced is a fold, not a mode; text is adult and precise (docs/track_notes/tone.md). A person clicks
through it; an AI drives the same functions by CLI and MCP and never needs the window.

## Correction (2026-10-02): not 1-bit

"It doesn't have to be one bit. It can be more sophisticated than that." The reference image set the framing
(ornate pixel border, picture window above, text below, pixel fonts), not the colour budget. Use a full
16-bit-era palette: the game's own near-black, bone, iron and dull teal with a dull gold for warnings, dithered
gradients where they help, shaded frames with a lit edge, coloured icons on the tiles, live previews in full
colour. Think a polished SNES RPG menu or a late-'90s PC tool with a pixel skin, not a Game Boy.

## From the mockup round (2026-10-02)
Approved direction: the reference's framing (ornate pixel frame with thorned edges and skull corners, blackletter
banner, picture window above, text box with choices and dials below). Accent is NOT teal in the Forge app: use a
dull ember gold / bone for pointers and values (the game keeps teal for its own next-action; the Forge is warmer).
The app has its own ambient effects: torches that flicker (light pools breathing on the stone, flames that move),
motes drifting up, a faint glow under the thing on the bench, pixel-dissolve transitions; all respecting reduced
motion. Drag and drop stays: a picture dropped anywhere starts a build, and the frame answers while a file hovers
("A painting hovers over the bench. Let it fall...").
