# track/forgeapp — the Forge app (PixelForge for people)

**What it is.** `tools/pixelforge/forge/`, a Godot 4.7 project: full screen, the game's fonts and 9-slice frames,
near-black / bone / iron / dull teal (the next thing to do) / dull gold (warnings), amber only on the boot lantern.
Nine tiles on Home, a Describe-it bar, a guided path per tile (progress strip, one big action a screen, a picture, a
"what happens next" line, an Advanced fold with the step's real flags, a log drawer), a custom cursor, soft Kenney
sounds, transitions, keyboard and gamepad focus. `pixelforge forge` / `PixelForge.bat` start it;
`pixelforge/forge_launch.py` finds (or fetches) Godot and passes the interpreter and the game folder.

**The rule it keeps.** The app only runs `python -m pixelforge.cli ... --json` (`forge/scripts/backend.gd`: a thread
per command, lines drained on the main thread, `PF_PROGRESS` parsed, the last JSON object is the result). Nothing
of the pipeline is reimplemented, so the AI road (CLI, MCP) and the person's road are the same road.

**CLI additions made for it.** `project run` per-step flags (`--tolerance --views --colors --model-mode --height
--clips --per-clip --actions --outline`), `project preview-gif`, `game-preview --play` and `--import` (a headless
`godot --import` so the game sees new files), `pixelforge forge`; `api.build_model(mode=...)` and a `model/<name>_hull.png`
written before Blender runs; `find_godot` also looks in `tools/godot` (where "Play Godmarrow.bat" downloads it).

**Verified here (cloud, xvfb, no GPU).** Every screen screenshotted at 1280x720 and 1366x768 (`docs/screens/forgeapp/`):
boot, home (with the gamepad focus ring on the first tile), every path's first screen, the character path after a real
drop of the Keeper's sheet (cut out and colours ran live; Build stopped on the Blender card, as it will on a fresh
laptop), the finished Keeper's preview with the direction dial, the spell path with a frost nova playing and its
Advanced fold open, an object (barrel) cut out, tiles laid, a portrait, the music listener, the fix-up canvas,
Settings, Play. `--autoput` runs "Put it in the game" + the game import + "Take a screenshot" by itself; the spell
and character roads were run that way against a scratch copy of the game. 96 pytest tests green (9 new in
`tests/test_forge.py`); `godot --headless --path tools/pixelforge/forge --script res://tools/check_scripts.gd` parses
all 20 scripts.

**Review fixes (2026-10-01, same branch).** The launchers (`pixelforge forge`, PixelForge.bat, the desktop icon) handed
the app its own folder as "the game" (the Forge has a project.godot too), so Play would have relaunched the app and
"Put it in the game" would have written into `tools/pixelforge/forge`: `forge_launch.game_dir()` now climbs from
`tools/pixelforge` and refuses the Forge, `backend.gd` refuses any project named PixelForge, and a test asserts the
command carries `--game=<repository root>`. Describe-it sent every painting prompt to Make a character: world prompts
now open the path for their kind (object, tiles, UI, spell), each with a *Copy the prompt* button (`quest.prompt_card`).
The Settings switch follows the header button and F11 (`app.window_changed`). A stopped step restores the big
button's own words and job; the card's *Try again* is the one retry. `game-preview --shot` past its time limit is
a plain error (`--timeout`, `PIXELFORGE_GAME_TIMEOUT`), not a traceback. The Advanced fold scrolls into view when
opened and the scroll bar can be seen. `--shot` reads the window back from the screen (letterbox and all).
`screens.sh` absolutises OUT; `tools/godot/` is ignored. The game got a `--place=NAME` hook (core/test_hooks.gd) so the
object road's "See it in the game" shows the object beside the hero, and `--autoput` runs that road end to end.

**Next direction (not done here): the look.** `docs/track_notes/gui_look.md` on main (the owner's reference,
`docs/refs/forge_gui_reference.png`) asks for an old-school dungeon text-adventure framing: one ink-and-bone palette,
dithered 1-bit pixel art, an ornate hand-drawn border, the step's words in a text box in a narrative tone, a pixel
cursor glyph for the chosen button, and dungeon-synth music with sparkling bells (`forge_home`, `forge_working`,
`forge_done` cues in `music.py`). The app's structure (tiles, paths, strip, Advanced, log, backend) stays; the theme
(`theme.gd`), the frames in `forge/assets/ui`, the transitions and the sounds are what that pass replaces.

**How the Tk Studio relates.** It is the classic fallback: `pixelforge studio`, the "PixelForge Studio (classic)"
desktop icon install.bat still makes, and a button in the app's Settings and in the fix-up path. track/ui owns it
(`gui.py`, `tools_window.py`, untouched here). The app covers the common jobs end to end; the Studio keeps the full
editors (cutout editor with magic erase and restore brushes, skin editor with layers and the clone brush, colour
editor, effects editor with per-view attachments, spell designer with layers, the skill-tree editor, every tool form).
When those editors are rebuilt (track/ui), the app's fix-up path and spell path should open them in place, or the
editors should move into Godot screens; until then the app sends the person to the classic window for them.

**What remains.**
- *Blender steps live in the app.* Only the fast steps ran in the cloud (Blender here is a 10-minute CPU shim); the
  model/rig/render screens were exercised to the "waiting for Blender" card and through their result pictures, not a
  full filmed run from inside the app. On the laptop the chain runs on its own; watch the first full run.
- *Looks.* The spell path's "look" is the vfx palettes; when track/fxlook lands, add its presets as a second row
  (`pixelforge looks --json`).
- *Objects in the world.* "Put it in the game" adds the object to `objects.json` and "See it in the game" stands it
  beside the hero (`--place`, a look only); placing it for good is the world builder's job (`world/objects`).
- *The native file dialog.* Godot's `use_native_dialog` gives the Windows dialog; under Linux without a portal it
  falls back to the themed Godot dialog. Fine on the laptop; untested there.
- *Drag-and-drop from a browser* (dragging a Midjourney image straight from Discord) is a file drop only when the
  browser hands a file; otherwise the person saves it first. Could accept a URL drop later.
- *Fix-up tools* are the point tools (recolour, glow, erase, restore, smooth) plus Undo; lasso, regions by name, the
  clone brush and layers stay in the classic skin editor until track/ui's editors exist.
- *Gamepad*: focus navigation works through Godot's defaults (d-pad / left stick, A = accept, B = back); the
  file dialog and the LineEdit need a mouse or keyboard.
- *Music to the game* writes OGG only when ffmpeg is installed, else WAV; the game plays either (`soundscape.gd`).
