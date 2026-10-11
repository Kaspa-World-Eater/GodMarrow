---
name: godmarrow-smoke-and-perf
description: Use before calling any Godmarrow change done (GDScript, shaders, zones, bakes, UI, data), and whenever asked to test the game. Runs the quick parse check, the smoke test (tools/smoke.sh, which runs the 2x2 grid check first), the --perf frame-rate check, and the opening's flow test, all with the Windows console Godot, and explains how to read each result.
---

# Verify a change: parse, smoke, frame rate, flow

CLAUDE.md's testing law: before calling a change done, run the smoke test and check the frame rate with `--perf`.
Test captures and runs use the Ossuarch (`--cls=ossumancer`).

## Paths (Git Bash, from the repo root)

```bash
cd /c/Users/derek/GodMarrow
G=/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe   # the _console exe: its output can be read
PY=tools/pixelforge/.venv/Scripts/python                                        # never the Windows Store python
SP=<the session scratchpad>                                                     # reports go here, never in the repo
```

- `tools/smoke.sh`'s built-in default Godot is an old Linux path. Always pass `GODOT="$G"`.
- Godot needs Windows-form paths in its own arguments (`C:/Users/...`). Convert with `cygpath -m "$SP"`. Bash itself
  is fine with `/c/...`.
- Always wrap Godot in `timeout`: a hung run otherwise blocks the shell.

## 1. Quick parse check (seconds)

```bash
timeout 120 "$G" --headless --path . --quit 2>&1 | grep -E "SCRIPT ERROR|Parse Error|SHADER ERROR" -A3 | head -20
```

No output means every script loaded. If you added art files, a `.glb`, or a script with `class_name`, import first.
A plain launch does not see a new global class until the editor's import has run:

```bash
timeout 300 "$G" --headless --path . --import > /dev/null 2>&1
```

## 2. The smoke test (several minutes)

```bash
GODOT="$G" timeout 1500 tools/smoke.sh "$SP/smoke.txt" > /dev/null 2>&1
head -1 "$SP/smoke.txt"                      # the 2x2 grid check's verdict
grep -c "| errors 0 |" "$SP/smoke.txt"       # want 12
grep -E "\| errors [1-9]" -A12 "$SP/smoke.txt"  # want nothing
```

What it runs (`tools/smoke.sh`):
1. `tools/check_2x2.py` (see the `godmarrow-2x2-grid` skill). Line 1 must read `2x2 check: ok`. The
   `debt:` lines under it are known and listed on purpose; six are open as of 2026-10-11 (the bog's old bake, the
   landkit sets). A hit makes line 1 read `2x2 check: N hit(s)` and fails the run.
2. For each order (animancer, monk, miasmancer, ossumancer): a level-15 pilgrim with every skill at 5 in an arena of
   six creatures for 12 s, on `--zone=fen --seed=7`.
3. Champions with deeds; the count sigils; the five panels (skills, inv, char, board, journal) on `red_shore`; the title.

Reading it:
- 12 lines with `errors 0` is a pass. Report it as **"Smoke 12/0"** in the pass log and the commit message.
- `dealt:` lists the skills that did damage. The damage numbers vary from run to run, but the set of skills should not
  shrink compared with a run before your change. A skill dropping out of the list is a regression even with 0 errors.
- Under a failing line, the next lines (indented) are the first errors with two lines of context each.
- Run it before and after a cleanup and compare the two reports.

## 3. The frame rate (needs a window, never `--headless`)

```bash
ps -W | grep -ciE "blender(\.exe)?$|python(\.exe)?$"     # 0 wanted: a bake on every core skews the numbers
timeout 60 "$G" --path . -- --zone=red_shore --new --cls=ossumancer --at=72,53 --perf > "$SP/perf.txt" 2>&1
grep "^PERF" "$SP/perf.txt" | tail -5
```

- Each second prints `PERF fps N proc X ms phys X ms draws N items N nodes N mons N`. Ignore the first two or three
  lines (loading).
- The bar is **60 fps in a baked land** (the cave and the cove hold 60; a baked land draws about 300 draw calls).
  The old procedural moor drew about 3,400 draw calls and ran near 45.
- A number taken while a Python bake or Blender runs is not valid. The newborn's "55 fps" in its pass 1 was taken
  during the cove bake; without it, the cave ran at 60. Say so if you had to measure during a bake.
- To find what costs the frame: `--off=dark,atmos,sky,far,hud,sound` switches whole systems off. Env switches give
  an A/B of one feature, for example `GM_NO_SEA=1` turns off the live Red (`world/baked_ground.gd`). Run the same
  place twice, with and without, and compare the PERF lines.
- Pick the place where the cost is: the cove's sea view `--at=72,53`; the cave with the newborn
  `--zone=opening_cave --new` (it starts in the pool).

## 4. The opening's flow test

Run it when touching the cave, the newborn, the Reading, the mirror or the start-up in `core/main.gd`:

```bash
GM_READ_ACT=all timeout 300 "$G" --path . -- --zone=opening_cave --new --reading --flowtest > "$SP/flow.txt" 2>&1
grep "FLOW\|SCRIPT ERROR" -A2 "$SP/flow.txt" | head -20
```

It prints a `FLOW` line at each step (`core/test_hooks.gd` `_flowtest`): `risen` (in `opening_cave`, nascent),
`unread at the mirror` (must still be `opening_cave`), `read` (still `opening_cave`: nothing moves the pilgrim), and
`through: zone red_shore ... hud bar true`. A failure prints `FLOW opening never ended`,
`FLOW the Reading never ended` or `FLOW the mirror never took it`.

## 5. Other checks by kind of change

| Change | Check | Reads |
|---|---|---|
| Esc, menus, panels | `--esctest` (I, then Esc three times) | `ESC after ...: panel ..., pause ...` lines |
| Clicks on raised ground, a lift map | `--isotest` | `ISO tiles N, off by more than half a tile M, worst ...` (want M near 0) |
| A walk that stalls, a stair, a portal | `--goto=x,y --walklog` | `WALK t.. tp .. moved ..` each second for 20 s |
| Creature taming in a zone | `--ranks` | `RANKS zone {rank: n} uniques: [...]` |
| A zone's old generated maps | `$PY tools/zone_export/check.py [zone]` | every exit, lantern, waystone, chest and shrine reachable |
| The bog's generator | `$PY tools/worldgen/bog_check.py 100 1 OUT` | 100 seeds out of 100 |
| Whether the game loads a zone at all | `timeout 120 "$G" --headless --path . --quit-after 90 -- --zone=ID` | no SCRIPT ERROR |

Godot's own flags (`--headless`, `--path`, `--quit`, `--quit-after N`, `--fixed-fps`, `-s`) go **before** the `--`;
the game's own (`--zone=...`, `--perf`) go **after** it.

## 6. The helper

`verify.sh` in this folder runs steps 1 and 2, and step 3 when given a zone and a tile:

```bash
bash .claude/skills/godmarrow-smoke-and-perf/verify.sh "$SP/verify" [ZONE X,Y]
```

`DRY=1` prints the commands without running them.

## Gotchas

- An existing save is loaded unless `--new` is given. A `--demo` pilgrim who dies wakes at the camp.
- `--perf` and captures open a game window on Derek's screen for their run. Running the game while Derek plays, or
  while a bake runs, slows everything (`docs/wiki/08-tech-and-build.md` section 8).
- Do not call the change done with smoke errors, or with a frame rate below 60 in a baked land that you caused.
  Report plainly what still fails.
