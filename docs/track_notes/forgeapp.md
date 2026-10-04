# track/forgeapp — the Forge app (PixelForge for people)

**What it is.** `tools/pixelforge/forge/`, a Godot 4.7 project built to the approved mockup
(`docs/mockups/forge_app_v8.html`, the notes in `gui_look.md`): full screen, integer scaled from a 640x360 canvas, an
ornate pixel frame with a blackletter banner, the picture window above (the thing on the bench standing in a chosen
ground: dungeon, crypt, moor, fen, snow, plain; torches whose light breathes, motes, the sprite's own lights cast on
the backdrop), the text box below with the bench's tabs on its rim, a state line, a rack of pixel-drawn levers and
wheels, the choices line with a pixel-arrow selector (the one animated thing in the chrome), the foot line (project,
style, hint, the ground picker). Ember-gold accent, bone text, iron frames. Dungeon-synth loops (`forge_home`,
`forge_working`, `forge_done`) and square-wave blips, both from `music.py`. Keyboard, mouse and gamepad. Pixel
dissolve between screens (4 steps at 24 fps). No pop-ups: file choosers are the only dialogs, questions are Yes / No
in the choices line, errors are one plain line. `pixelforge forge` / `PixelForge.bat` start it;
`pixelforge/forge_launch.py` finds (or fetches) Godot and passes the interpreter and the game folder.

**The rule it keeps.** The app only runs `python -m pixelforge.cli ... --json` (`forge/scripts/backend.gd`: a thread
per command, lines drained on the main thread, `PF_PROGRESS` parsed, the last JSON object is the result). Nothing
of the pipeline is reimplemented, so the AI road (CLI, MCP) and the person's road are the same road, and a character's
model file is the same `.shapes.json` both edit.

**The benches (2026-10-04, on main).** Home (nine choices, Describe it, drops open the matching bench).
Characters: Reference (model beside a painting, the checks), Model (part / solid / material cyclers, move x y z, size,
tone, hang, hide), Materials (ramp rows, hue / lightness / contrast / steps in OK-HSL over the imported ramp, each
light's glow kind / hue / strength / pulse / radius, Randomise, Champion), Motion (clip, facing, lag, sway, hang, turn
step, move step, camera; Render clip, Render all), Frames (timeline, hold, delete, mirror, paint, onion skin, fps),
Export (Export sheets, Put it in the game, See it in the game, Take it out). Objects: the same engine without bones
(chest, skull, dead tree examples), Behaviour (camera, world scale, shadow, height), Export (PNGs with foot anchors,
S or all eight, the objects.json entry). Effects: Shape, Layers (a spell from presets), Looks, Missile, Export.
Tiles: Source, Edges, Variants, Export. Interface: Frames (ui9), Icons, Portraits, Fonts. Sound: the eighteen pads.
Music: the rack and the cue cards. Settings: Window, Folders, Style (cards with animated strips), This computer.
Every bench: Keep, Render all, Undo (JSON snapshots of `state`), Reset, Start over (one question in the window),
Advanced (plain sliders with finer steps and the fine values).

**Verified (cloud, xvfb, no GPU).** `forge/tools/screens.sh`: 37 screens at 1280x720, 0 SCRIPT ERRORs
(`docs/screens/forgeapp/`); `tools/check_scripts.gd`: 20 scripts, 0 failed; the Keeper walkthrough through
`--script` (drop the model, still, idle S and E, Render all in 75 s, the Frames tab, Export sheets), 0 errors; 161
pytest green (`tests/test_forge.py` 13).

**Under construction (said on the bench).** Creatures: the beast rig (four legs, tail, wings) is not in the engine;
the bench is the characters' bench on the humanoid skeleton. Not in the Forge by design: the painting road (cutouts,
Blender, Mixamo) and the full editors (cutout, skin with layers and the clone brush, colour, effects, spell designer
with layers, skill tree) stay in the classic Tk Studio (`pixelforge studio`, the "(classic)" icon). The Frames tab's
Paint is single pixels through `skin` ops; the Fix-up and Play tiles of the first build are gone.

**What remains.**
- *The laptop.* Nothing here ran on Windows: the first run should be watched (the Godot download into `tools/godot`,
  the native file dialog, the first *Put it in the game* and the game's import pass, a gamepad).
- *Put it in the game / See it in the game* were run on this branch on 2026-10-01 (object and character roads) and
  the code is unchanged since; not re-run in this round (the game's import pass takes minutes under xvfb).
- *Creatures*: the beast rig in the engine, then this bench takes it (clips for quadrupeds, wings, tails).
- *Looks*: when track/fxlook lands, the Effects Looks tab gets its presets as a second row (`pixelforge looks --json`).
- *Objects in the world*: Put it in the game adds to `objects.json`; See it stands it beside the hero (`--place`);
  placing it for good is the world builder's job.
- *Drag-and-drop from a browser* is a file drop only when the browser hands a file; a URL drop could come later.
- *Music to the game* writes OGG only when ffmpeg is installed, else WAV; the game plays either.
