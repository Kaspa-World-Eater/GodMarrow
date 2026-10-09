# Godmarrow: read first

Godmarrow is Derek's grimdark isometric action RPG, in Godot 4.7.2 at the repo root. The old browser build in `web/`
is retired. Never port it one to one (Derek: the one-to-one porting "has been a disaster"); take the idea and design
our own version.

**Before touching anything, read:**
1. `docs/HANDOFF.md`: the state of the game, how Derek works, the work in progress.
2. `docs/README.md`: the map of every document.
3. `docs/wiki/01-rules-and-decisions.md`: Derek's laws and the dated decision log. The newest ruling wins.

**Then, by the kind of work:**
- **Art:**
  - `docs/MASTER_RULES.md`: its gate comes first, a written rules check before any new piece;
  - the area's lore in `docs/wiki/mythology/areas/`;
  - `docs/PAINTED_STANDARD.md`;
  - the art library in `tools/art_study/library/`, with its chapters and reports.
- **Lore:**
  - `docs/wiki/mythology/README.md`: the makers' bible, and how it is written;
  - `docs/wiki/mythology/00-the-deep-lore.md`: the truth beneath everything, never stated in the game;
  - `docs/wiki/mythology/backstage.md`: everything decided, with sources.
- **Code:**
  - `docs/wiki/13-godot.md`;
  - `docs/wiki/08-tech-and-build.md`, for running, testing, committing and delivering.

## The laws that never bend (the full list is in `01`)

**How to work:**
- Say the plan first for big changes, and wait for a go.
- One piece at a time, graded honestly, and Derek grades it on the area's review page.
- Report plainly. Check facts before stating them.

**The art:**
- **Real form under the paint, never flat** (MASTER_RULES section 0):
  - built things and anything that overhangs are made as 3D forms in Blender (`tools/landkit3d`);
  - ground and lands are made in the height engine;
  - all of it is painted to the painted standard.
- True scale, the pilgrim small in a big world.
- No fog or mist layers.
- No red light, except the Sunken Bog's pit throat.
- No animals, except insects, the moor's crows and the bog's serpent god.
- **Characters are shape sprites in PixelForge** (`tools/pixelforge/`; run it with Python from that folder;
  `.gdignore` keeps Godot out):
  - `.shapes.json` solids on the standard skeleton, at the game's hero height (the `godmarrow` preset, 195 px);
  - rendered as pixel art and moved by motion clips in 8 directions;
  - a painting is the reference a shape file is measured against (`shapes measure`, `shapes compare`), never the
    source;
  - the old cutout, Blender and Mixamo road is retired.
  
  Its guide is `tools/pixelforge/docs/GUIDE_AI.md`.

**Lore:**
- The bible is for us: myths told as myths, with depth of time. The gods are unknowable, and the faiths' gods are
  masks.
- In-game writing uses the world's own voices, readable, with rival tellings.
- World-building only: no story or quests.
- No little towns or villages. Never "the Hush".

**Secrets:**
- Never print or commit tokens: the PixelLab token lives only in `~/.pixellab/token`, the Hugging Face token only in
  `~/.huggingface/token`.
- Never read `_secrets`. Never type passwords.
- `android_build.tgz` never goes on GitHub, and nothing from Cursemark is ever committed.

**Git:**
- The PC works on `main`, and a push updates Derek's laptop. Push only when Derek wants it.
- Commit only your own files, by name, and end each message with the attribution line. Other sessions' changes share
  this working tree.
- No destructive git.

**Testing:**
- Before calling a change done, run the smoke test (`GODOT=<console exe> tools/smoke.sh OUT.txt`) and check the frame
  rate with `--perf`.
- Test captures use the Ossuarch (`--cls=ossumancer`).
