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
