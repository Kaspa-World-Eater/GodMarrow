# 08 · Running, testing and shipping the game

*Rewritten 2026-10-08. The browser build, its Electron and Android wrappers and the zip-sync to the Desktop are retired;
what they were is in `docs/archive/`. This page is how the game is run, tested, committed and delivered today. The
code's architecture is page 13.*

## 1. The machines

- **Derek's PC** (where Claude Code runs), Windows 11:
  - an Intel Core Ultra 7 255U, a 15 W laptop-class chip with built-in Intel graphics, 32 GB of memory;
  - the repository at `C:\Users\derek\GodMarrow`;
  - Godot at `C:\Users\derek\OneDrive\Desktop\Godot\Godot_v4.7.2-stable_win64.exe` (and `_console.exe` for runs whose
    output you want to read).
- **Derek's laptop:** plays the game from its own clone, which updates itself from GitHub at every launch.
- **The OneDrive Desktop** is shared between the machines.

## 2. Playing

- **The desktop folder `Godmarrow Game`** holds two shortcuts, both with the Godmarrow icon:
  - **Play Godmarrow:** the title, then the saved pilgrim or a new one;
  - **Start in the Sunken Bog:** the saved pilgrim, straight into the bog.
- Both run `Play Godmarrow.bat` in the repository. It does three things:
  1. `git pull --ff-only`, so the game is the latest on GitHub;
  2. finds Godot (`PIXELFORGE_GODOT`, `tools\godot`, the PATH, then the usual places, the OneDrive Desktop's `Godot`
     folder among them);
  3. starts it with any arguments it was given passed on to the game (`--zone=sunken_bog`, and so on).
- **The first launch after a big update is slow:** Godot imports the new art once.

## 3. The tools on the PC

| Tool | Where | For |
|---|---|---|
| Godot 4.7.2 | `OneDrive\Desktop\Godot\` | the game, headless runs, captures |
| Python with numpy, scipy, Pillow | `tools\pixelforge\.venv\Scripts\python` | every art and map tool |
| Blender 4.5 LTS | `C:\Program Files\Blender Foundation\Blender 4.5\blender.exe` | the 3D road (`tools/landkit3d`), run in the background from code |
| Git, the GitHub CLI | on the PATH | commits, pushes |
| Chrome | Claude in Chrome | Midjourney (Derek signs in himself), reading pages |

The Python tools are run from the repository's root, for example
`tools/pixelforge/.venv/Scripts/python tools/worldgen/bog_check.py 100 1 OUT`.

## 4. Running the game from the command line

```
G=/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe
$G --path . -- --zone=sunken_bog --cls=ossumancer --hour=0.15 --shot=OUT.png --shot_t=8   # a capture
$G --path . -- --zone=moor --cls=ossumancer --demo --trace                                 # watch it fight
$G --path . -- --zone=sunken_bog --perf                                                    # what a frame costs
$G --headless --path . --quit-after 90 -- --zone=moor                                      # does it load?
```

- The user arguments after `--` are listed in page 13, section 10.
- **Test captures use the Ossuarch only** (`--cls=ossumancer`; Derek's rule).
- **A capture can be misleading:**
  - an existing save is loaded unless `--new` is given;
  - a demo pilgrim who dies wakes at the camp, so a capture taken after that shows the camp;
  - `--demo` ignores the save.

## 5. Testing

| Test | Command | Passes when |
|---|---|---|
| Smoke | `GODOT=$G tools/smoke.sh OUT.txt` (its default Godot path is the old Linux one) | every calling, the panels, the title and a champion fight run with 0 script errors |
| A zone's maps | `python tools/zone_export/check.py [zone]` | every map: every exit, lantern, waystone, chest and shrine reachable |
| The bog's generator | `python tools/worldgen/bog_check.py 100 1 OUT` | 100 seeds out of 100: every chamber, island, the pit, both exits, every object and monster reachable on foot, walked the way the game walks (8 neighbours, no corner squeezing) |
| A baked land against its map | `python tools/worldgen/bog_seen.py SEED OUT.png` | the walkable tiles show ground where the game draws them (98% on seed 9101) and the water shows water (99%); the overlay marks the misses |
| Performance | `--perf` in the game | 60 frames a second in a baked land; the old moor ran near 45 after the sleepers |
| Look | `--shot` captures, side by side with the review page's images | Derek's grade |

## 6. Git and GitHub

- **The repository is public:** https://github.com/Kaspa-World-Eater/GodMarrow.
- **The PC works on `main`**, tracking `origin/main` (`push.default upstream`), so `git push` publishes. Pushing is
  what updates the laptop, so push when Derek wants the laptop to have it.
- **Commit only your own files.** Other sessions may have uncommitted work in the tree (PixelForge, the paint-over
  tools, concept files). Stage files by name, never with `git add -A`.
- **Commit messages** end with the attribution line given in the session (currently
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- **Never commit or push:**
  - keys, tokens, passwords;
  - `android_build.tgz` (it holds the Android signing key);
  - anything from Cursemark (the files are gone; the rule stands);
  - studies of other games' art (`tools/art_study/private/`).
- **No destructive git** on the real clone: no hard resets, no force pushes, no bare `git stash`.

## 7. Security and the PC (standing rules)

- The PixelLab token lives only in `~/.pixellab/token`; the Hugging Face token only in
  `C:\Users\derek\.huggingface\token`. Never print or commit either.
- Never read `_secrets\github_token.txt` (the safety system blocks it anyway).
- Never type passwords: Derek signs in to Midjourney, Mixamo and GitHub himself.
- **Downloads and deletions on the PC need Derek's permission:**
  - list what and why, then wait for his yes;
  - send deletions to the Recycle Bin;
  - never delete his PixelLab characters or project documents.
- **The OneDrive Desktop's `Godmarrow\_archive`** (a full backup, with the Android signing key) and **`_secrets`**
  stay untouched.
- **Never change Derek's Midjourney settings:** his profile `anngqkz`, stylize 350 to 750, weird 130 to 550.

## 8. Performance notes

- **The sleepers:** far creatures freeze. This took the moor from about 30 to about 45 frames a second on this chip.
- **Baked lands are cheap to draw** (about 300 draw calls, 60 frames a second). The old procedural zones are not:
  the moor drew about 3,400 draw calls from its props and scatter. Draw calls are the next cost to cut.
- **Background work slows the game:** a Python bake or a big render running on every core makes a session laggy.
  Run bakes when Derek isn't playing, or at idle priority.
