#!/bin/bash
# Screenshot every screen of the Forge app under xvfb (no GPU needed), for docs/screens/forgeapp/.
#   GODOT=/path/to/godot PROJECT=/path/to/a/forge/project tools/pixelforge/forge/tools/screens.sh OUTDIR [WxH]
# PROJECT should hold a finished character (the Keeper copy) so the preview and put-in-game screens have something
# to show; a sheet painting at $SHEET, an object painting at $OBJECT, a ground texture at $GROUND are optional.
# Each shot: "name | errors N" (N must be 0). The app's test hooks are documented in forge/scripts/main.gd.
set -u
OUT=${1:?OUTDIR}; RES=${2:-1280x720}
GODOT=${GODOT:-godot}; PROJECT=${PROJECT:?PROJECT}
HERE=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)   # absolute: Godot resolves a relative --shot against the project folder
shoot() {  # name "args" seconds
  local name=$1 args=$2 t=$3
  local log; log=$(timeout 400 xvfb-run -a -s "-screen 0 ${RES}x24" "$GODOT" --path "$HERE" --rendering-driver opengl3 --windowed --resolution "$RES" \
    -- --windowed --nosound --project="$PROJECT" ${GAME:+--game=$GAME} --godot="$GODOT" --shot="$OUT/$name.png" --shot_t=$t $args 2>&1)
  echo "$name | errors $(echo "$log" | grep -cE 'SCRIPT ERROR|caller thread|handle_crash')"
}
shoot boot "--screen=boot" 1.6
shoot home "--screen=home" 2.5
shoot settings "--screen=settings" 6
shoot play "--screen=play" 3
shoot character "--screen=character" 5
[ -n "${CHARACTER:-}" ] && shoot character_preview "--screen=character --character=$CHARACTER" 7
[ -n "${SHEET:-}" ] && shoot character_drop "--screen=character --drop=$SHEET" 40
shoot object "--screen=object" 3
[ -n "${OBJECT:-}" ] && shoot object_cut "--screen=object --drop=$OBJECT" 12
shoot spell "--screen=spell" 3
shoot spell_play "--screen=spell --shape=nova --look=frost --play" 12
shoot spell_advanced "--screen=spell --shape=wisp --look=wisp --play --advanced" 12
shoot tiles "--screen=tiles" 3
[ -n "${GROUND:-}" ] && shoot tiles_cut "--screen=tiles --drop=$GROUND" 16
shoot ui "--screen=ui" 3
shoot sound "--screen=sound" 3
shoot sound_listen "--screen=sound --cue=a1_wild --silent" 16
shoot fix "--screen=fix" 5
