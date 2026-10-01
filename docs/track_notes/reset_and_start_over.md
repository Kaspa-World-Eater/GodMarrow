# Reset and start over, everywhere

Every quest and every editor in the Forge app (and the classic Studio) needs an obvious way back to a clean state,
never destructive by accident:

- **Start over** on a quest: a button on every quest screen that throws away this character / object / spell /
  cue's work (its folder under the project) after one plain confirmation inside the window ("Start the Keeper over?
  Her painting is kept."), keeping the painting and the description. Backed by `api.reset_character(project, name,
  keep_sources=True)` (to add: deletes views, palette, model, frames, renders, exports, clears `done` and `notes`).
- **Redo from here** on each step: redo this step and everything after it (clears `done` for that step onward).
- **Reset a knob / a screen**: double-click a knob resets it; "Reset all" on the music rack and on each editor
  returns the defaults (`default_sheet()`; the editors' Restore).
- **Undo/Redo** in every editor (Ctrl+Z / Ctrl+Y and buttons), and "Revert to saved" (the `.bak` the skin ops keep).
- **Start a new project** and **Forget this project** (removes it from the recent list; the folder stays).
- **Reset the game's art for this thing**: when something was "put in the game", "Take it out of the game" restores
  the previous files (export_game keeps a `.prev` copy before overwriting art/sprites, art/fx, audio).
- Same from the command line and MCP: `pixelforge reset <character> [--step split] [--all]`, `project forget`,
  `export-game --undo`.
