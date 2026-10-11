---
name: godmarrow-capture
description: Use to run or launch the Godmarrow game and see a change in it - in-game screenshots or frame strips with the Ossuarch stood at a zone tile (--zone, --new, --cls=ossumancer, --at, --hour, --shot, --shot_t, --shot_n, --shot_dt and the other look hooks), A/B captures with env switches, stitching frames into a grid with the venv Python and PIL, and looking at the result before reporting or grading.
---

# Capture the game and look at it

Every art or code change that shows on screen is checked in the game itself, at the game's camera, with the Ossuarch
for scale (MASTER_RULES checklist 11; Derek's rule: test captures use the Ossuarch only). A capture is not a mock-up:
never show a render made outside the game as the game.

## Paths

```bash
cd /c/Users/derek/GodMarrow
G=/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe
PY=tools/pixelforge/.venv/Scripts/python
SPW=$(cygpath -m "$SP")      # the scratchpad in C:/ form: Godot and Python need Windows paths in their arguments
```

Never run `Play Godmarrow.bat` from a session: it runs `git pull --ff-only` on the shared tree first. It is Derek's
launcher (it passes its arguments to the game, e.g. `--zone=sunken_bog`).

## 1. One capture

```bash
timeout 120 "$G" --path . -- --zone=opening_cave --new --cls=ossumancer --at=7,9 \
  --shot="$SPW/cave_mirror.png" --shot_t=6 > "$SP/cave_mirror.log" 2>&1
grep -iE "SCRIPT ERROR|SHADER ERROR|Parse Error|Invalid call|Invalid access" -A4 "$SP/cave_mirror.log" | head -20
```

- `--shot=PATH`: save the screen and quit. Needs a window (never `--headless`). The picture is the window,
  1600 x 900.
- `--shot_t=S`: seconds before the shot (default 4). Use 5 to 6 so the zone, the bake and the live systems settle.
- `--at=x,y`: the pilgrim stood there, in zone tiles (kept a step clear of folk and portals).
- `--new`: a fresh pilgrim. Without it an existing save loads and the capture may show somewhere else.
- `--hour=0..1`: the hour (0.15 is night). A zone entered straight from `--zone` runs the normal clock. The cove's
  held dawn (`holdPhase` 0.978 in its zone file) applies only when you come out of the cave's mirror, so pass
  `--hour=0.978` to see the cove as the player first does.

The helper `shot.sh` in this folder does the above, converts the path, sizes the timeout and greps the log:

```bash
bash .claude/skills/godmarrow-capture/shot.sh opening_cave 7,9 "$SP/cave_mirror.png"
SHOT_N=8 SHOT_DT=0.65 bash .claude/skills/godmarrow-capture/shot.sh red_shore 72,53 "$SP/sea/live.png" --hour=0.978
```

## 2. A strip of frames (motion, loops, flicker, the heartbeat)

```bash
timeout 150 "$G" --path . -- --zone=red_shore --new --cls=ossumancer --at=72,53 \
  --shot="$SPW/sea/live.png" --shot_t=6 --shot_n=8 --shot_dt=0.65 > "$SP/sea/log.txt" 2>&1
```

- `--shot_n=N` writes `live_0.png` ... `live_{N-1}.png` (numbered from 0, beside the given name), `--shot_dt`
  seconds apart (default 0.25).
- Match the spacing to the motion: the Red's beat wants about 0.65 to 0.9 s; the opening (crawl, retch, rise) about
  1.2 s; flame flicker 0.1 to 0.25 s.

## 3. Stitch and look

```bash
$PY .claude/skills/godmarrow-capture/grid.py "$SPW/sea/live_grid.png" "$SPW"/sea/live_*.png --cols 2 --width 800 --label
$PY .claude/skills/godmarrow-capture/grid.py "$SPW/mouth.png" "$SPW/cv.png" --crop 600,0,1320,400 --scale 2 --nearest
```

- `--crop X0,Y0,X1,Y1` cuts the same box from every frame; `--width W` or `--scale S` sizes each cell;
  `--nearest` keeps hard pixels when enlarging (use it to judge the 2x2 grid and the dither); `--label` writes the
  file name on each cell.
- Then **look**: open the sheet with the Read tool (it shows images). Crop to the region you changed before reading,
  so the detail is visible and the context stays small.
- Describe what you see plainly and honestly in the pass log, and grade it against the checklist.

For one-off crops, the same thing inline (paths inside Python code must be `C:/...`, never `/c/...`):

```bash
$PY -c "
from PIL import Image
Image.open('$SPW/n.png').crop((500,0,1300,500)).resize((1600,1000), Image.NEAREST).save('$SPW/n_z.png')"
```

## 4. A/B: the same moment with and without

Diagnose by looking, never by guessing twice (memory "look, don't guess"): when a fix shows no change, build a view
that isolates the cause before trying another fix.

- Same `--at`, same `--shot_t`, one switch flipped, then stitch the two side by side with `grid.py`.
- Env switches already in the code: `GM_NO_SEA=1` (no live Red), `GM_SEA_DEBUG=1|2` (the sea's debug colours),
  `GM_NOHUD=1`, `GM_NOSLOSH=1` (the pool's slosh), `GM_POOLDUMP=PATH` (dumps the pool simulation), `GM_READ_FX=0|1`.
- Game switches: `--baked=0` (no baked land), `--landkit=0`, `--hide=dark,atmos,sky` (judge paint without the
  night's overlay), `--nolm`, `--darkflat`, `--nolamp`, `--show=collision` (red diamonds solid tiles, yellow rings
  posts), `--off=dark,atmos,sky,far,hud,sound`.
- A temporary switch you add for a diagnosis is removed again (or kept with a comment saying what it is for) before
  you commit.

## 5. Other look hooks (`core/test_hooks.gd`, `docs/wiki/13-godot.md` section 10)

| Hook | What it shows |
|---|---|
| `--use=stranger` (a role or an object type) | used as a click would use it, 1.5 s in (with `--shot`, to see what follows) |
| `--goto=x,y` | the pilgrim walks there (a portal, a stair, a gate on the way) |
| `--near=log\|rootplate\|stump\|snag\|tree\|rock [--near_n=N] [--near_off=X,Y]` | stand beside the Nth nearest landkit piece |
| `--covertest` (with `--near`) | shots loosed through the piece |
| `--demo [--trace]` | the pilgrim fights by itself (ignores the save) |
| `--panel=skills\|inv\|char\|board\|journal` | a panel open |
| `--fx=NAME[,NAME]`, `--place=NAME` | PixelForge effects or objects at the pilgrim |
| `--lakefx`, `--bonefx`, `--bloodfx`, `--icefx`, `--zap`, `--radfx`, `--voidfx`, `--miasmafx`, `--slashfx`, `--meleefx`, `--meadowfx`, `--snowfx`, `--groundfire`, `--wildfire`, `--impacts`, `--weather` | the effect benches round the pilgrim |
| `--title`, `--reading` | the title; a new pilgrim's Reading |

Places used recently (zone tiles; check the zone file's markers if a zone was re-exported):
- `opening_cave`: the pool start (12.5, 40.5); beside the Stranger `--at=6.5,9.5`; the mirror `--at=7,9`;
  the hall `--at=11,20`.
- `red_shore`: the sea view `--at=72,53`.
- Read any zone's start and objects:
  `$PY -c "import gzip,json; d=json.load(gzip.open('data/zones/red_shore_s9201.json.gz')); print(d['markers']['start'], [(o.get('type'),o.get('x'),o.get('y')) for o in d['objects']])"`

## Gotchas

- In `opening_cave` a new pilgrim is the newborn and the opening plays (under the blood, crawl, slip, retch, rise)
  before the player has it; `--no_opening` skips it. In play, Esc or Space skips it.
- `--demo` pilgrims who die wake at the camp, so a late capture can show the camp.
- New or rebaked art shows only after an import: `timeout 300 "$G" --headless --path . --import > /dev/null 2>&1`.
- A capture opens a window on Derek's screen for its run; keep them short and few while he is using the PC.
- Keep captures in the scratchpad. Only files meant as records go in `docs/screens/` (dated), and only when asked.
- For a live 3D body alone (no world), use the look test in the `godmarrow-live-3d-character` skill.
