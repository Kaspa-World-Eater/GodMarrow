#!/bin/bash
# Re-export a live 3D body, import it, run the look test and stitch the look sheet.
#   bash .claude/skills/godmarrow-live-3d-character/remake.sh OUT_DIR [BUILDER] [GLB_DIR]
# BUILDER: the Blender builder (default tools/landkit3d/newborn3d.py); GLB_DIR: where its glb goes
# (default art/characters3d/newborn). OUT_DIR: the look frames and look.png (the scratchpad, never the repo).
# env: NO_EXPORT=1 skips the Blender export (look at the glb as it is); DRY=1 prints the commands only.
# The look test (tools/body3d_test/look.gd) loads art/characters3d/newborn/newborn.glb; for another body, point it there.
set -u
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
OUT=${1:?usage: remake.sh OUT_DIR [BUILDER] [GLB_DIR]}
BUILDER=${2:-tools/landkit3d/newborn3d.py}
GLB_DIR=${3:-art/characters3d/newborn}
B=${BLENDER:-"/c/Program Files/Blender Foundation/Blender 4.5/blender.exe"}
G=${GODOT:-/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe}
PY=tools/pixelforge/.venv/Scripts/python
WOUT=$(cygpath -m "$OUT")
run() { echo "+ $*"; [ -n "${DRY:-}" ] || "$@"; }

if [ -z "${NO_EXPORT:-}" ]; then
  echo "== export (every clip)"
  run bash -c "timeout 900 '$B' --background --python '$BUILDER' -- glb '$GLB_DIR' 2>&1 | grep -E '^glb|^caul|^one skin|^stroke uv|Error|Traceback|line [0-9]' || true"
fi
echo "== import"
run bash -c "timeout 300 '$G' --headless --path . --import 2>&1 | grep -iE 'error' | head -5 || true"
echo "== look test"
run rm -rf "$OUT"
run mkdir -p "$OUT"
run bash -c "timeout 180 '$G' --path . -s tools/body3d_test/look.gd -- '$WOUT' 2>&1 | grep -iE 'error' | head -5 || true"
[ -n "${DRY:-}" ] && exit 0
# the sheet: a row per heading, a column per shot, in the order look.gd wrote them
"$PY" - "$WOUT" <<'PY'
import os, sys
from PIL import Image
out = sys.argv[1]
fs = [f for f in os.listdir(out) if f.endswith(".png") and f != "look.png"]
if not fs:
    sys.exit("no look frames: did the import or the look test fail?")
fs.sort(key=lambda f: os.path.getmtime(os.path.join(out, f)))
heads = ["front", "side", "down", "back"]
shots = []
for f in fs:
    stem, _, head = f[:-4].rpartition("_")
    if head in heads and stem not in shots:          # (other pictures in the folder are left out)
        shots.append(stem)
C = 260
sheet = Image.new("RGBA", (C * len(shots), C * len(heads)), (120, 120, 120, 255))
for i, s in enumerate(shots):
    for j, h in enumerate(heads):
        p = os.path.join(out, "%s_%s.png" % (s, h))
        if os.path.exists(p):
            sheet.alpha_composite(Image.open(p).convert("RGBA").crop((30, 40, 290, 300)), (i * C, j * C))
sheet.save(os.path.join(out, "look.png"))
print(os.path.join(out, "look.png"), len(shots), "shots x", len(heads), "headings:", " ".join(shots))
PY
