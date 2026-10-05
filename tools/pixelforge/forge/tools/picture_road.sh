#!/bin/bash
# The picture road, end to end in the Forge app under xvfb: a picture dropped on Home goes to the Characters bench,
# which runs `character from-picture` (cut, measure, draft, sample materials, check, import, draw) and ends with the
# drafted model on the bench facing S, the painting beside it, the compare picture one choice away. Also shoots the
# in-app browser over a Downloads folder with a Midjourney sub-folder of long-named pictures (newest first).
#   GODOT=/path/to/godot PROJECT=/path/to/a/forge/project tools/pixelforge/forge/tools/picture_road.sh OUTDIR [WxH]
# PICTURE is the picture dropped (default: the bundled Keeper front, assets/styles/keeper_front.png). Writes
# OUTDIR/picture_road_{working,reference,compare,model}.png and OUTDIR/file_browser.png, prints the driver's lines
# and "errors N" (N must be 0) at the end.
set -u
OUT=${1:?OUTDIR}; RES=${2:-1280x720}
GODOT=${GODOT:-godot}; PROJECT=${PROJECT:?PROJECT}; PY=${PY:-python}
HERE=$(cd "$(dirname "$0")/.." && pwd)
PICTURE=${PICTURE:-$HERE/../assets/styles/keeper_front.png}
PICTURE=$(cd "$(dirname "$PICTURE")" && pwd)/$(basename "$PICTURE")
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
# a home with a Downloads/Midjourney folder, so the browser shows the places a Midjourney download lands in
FAKEHOME=$(mktemp -d); mkdir -p "$FAKEHOME/Downloads/Midjourney"
cp "$PICTURE" "$FAKEHOME/Downloads/Midjourney/derek_a_hooded_keeper_of_the_ossuary_with_a_lantern_and_a_long_robe_3f2a9c1e-7b1d-4c2e-9a0f-5d6e7f8a9b0c.png"
"$PY" -c "from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.argv[2])" "$PICTURE" "$FAKEHOME/Downloads/derek_the_same_keeper_as_a_turnaround_sheet_front_side_back_0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9.webp" 2>/dev/null || cp "$PICTURE" "$FAKEHOME/Downloads/keeper_download.png"
touch -d "2 days ago" "$FAKEHOME/Downloads/Midjourney/"*.png
SCRIPT=$(mktemp)
cat > "$SCRIPT" <<EOF
# the picture road: a picture dropped on Home becomes a character on the Characters bench
go home
wait 0.5
drop $PICTURE
wait 1.2
shot $OUT/picture_road_working.png
waitjob 300
wait 1.0
shot $OUT/picture_road_reference.png
choose Compare
wait 0.8
shot $OUT/picture_road_compare.png
tab Model
wait 0.8
shot $OUT/picture_road_model.png
tab Reference
wait 0.5
choose Start from a picture
wait 2.0
shot $OUT/file_browser.png
dumplog
quit
EOF
log=$(HOME=$FAKEHOME timeout 600 xvfb-run -a -s "-screen 0 ${RES}x24" "$GODOT" --path "$HERE" --rendering-driver opengl3 --resolution "$RES" \
  -- --nosound --project="$PROJECT" --python="$PY" ${GAME:+--game=$GAME} --script="$SCRIPT" 2>&1)
echo "$log" | grep -E "^(SCRIPT|SHOT|LOG   -> |LOG \\$)" | grep -v "LOG   PF_PROGRESS"
echo "errors $(echo "$log" | grep -cE 'SCRIPT ERROR|SHADER ERROR|handle_crash')"
rm -rf "$FAKEHOME" "$SCRIPT"
