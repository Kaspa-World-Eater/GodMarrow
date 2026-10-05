#!/bin/bash
# The character loop, end to end, with the mock Claude: the Keeper's front painting through `pixelforge character author`
# (three rounds, the generator script per round, the compare picture, the round scores), idle and walk rendered in all
# eight directions, the set exported into a scratch copy of the game, a headless game screenshot on the Moor with the new
# skin, and the Forge's own walkthrough (the painting dropped on Home, the rounds' words on the state line, the model
# beside the painting, Compare). Prints the numbers and "errors N" per stage (N must be 0).
#   GODOT=/path/to/godot GAME=/path/to/the/game/checkout tools/pixelforge/forge/tools/acceptance.sh OUTDIR
# PICTURE is the painting (default: the bundled Keeper front, assets/styles/keeper_front.png). Writes OUTDIR/acceptance_*.png.
set -u
OUT=${1:?OUTDIR}; RES=${2:-1280x720}
GODOT=${GODOT:-godot}; PY=${PY:-python}
HERE=$(cd "$(dirname "$0")/.." && pwd)                 # tools/pixelforge/forge
PF=$(cd "$HERE/.." && pwd)                              # tools/pixelforge
GAME=${GAME:-$(cd "$PF/../.." && pwd)}                  # the game checkout (project.godot at its root)
PICTURE=${PICTURE:-$PF/assets/styles/keeper_front.png}
PICTURE=$(cd "$(dirname "$PICTURE")" && pwd)/$(basename "$PICTURE")
mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
WORK=$(mktemp -d); PROJECT=$WORK/project; SCRATCH=$WORK/game
export PYTHONPATH=$PF${PYTHONPATH:+:$PYTHONPATH}
export PIXELFORGE_CLAUDE=mock:$PF/tests/claude_mock/author.jsonl PIXELFORGE_MOCK_DELAY=${MOCK_DELAY:-0.05} PIXELFORGE_NO_UPDATE=1
fail=0
stage() { echo "== $*"; }

# 1. the loop: the painting through author with the mock (three rounds, rising scores)
stage "author: $PICTURE"
"$PY" -m pixelforge.cli project new "$PROJECT" --name Acceptance --json >/dev/null
"$PY" -m pixelforge.cli character author keeper --painting "$PICTURE" -p "$PROJECT" --json > "$WORK/author.json" 2> "$WORK/author.err"
"$PY" - "$WORK/author.json" <<'EOF' || fail=$((fail+1))
import json, sys
r = json.load(open(sys.argv[1]))
assert r["ok"], r.get("error")
scores = [h["score"] for h in r["rounds"]]
print("rounds", len(scores), "scores", scores, "best", r["best"], "stopped:", r["stopped"])
assert scores == sorted(scores) and len(scores) == 3, "the mock's scores must rise over three rounds"
import shutil, os
shutil.copy(r["compare"], os.path.join(os.path.dirname(sys.argv[1]), "compare.png"))
EOF
cp "$WORK/compare.png" "$OUT/acceptance_compare.png" 2>/dev/null
echo "painting untouched: $(cmp -s "$PICTURE" "$PROJECT/characters/keeper/source/painting.png" && echo yes || { echo NO; fail=$((fail+1)); })"
echo "progress lines: $(grep -c '^PF_PROGRESS step=author' "$WORK/author.err")"
echo "errors $fail"

# 2. idle and walk in eight directions, the contact sheet
stage "render idle and walk, 8 directions"
"$PY" -m pixelforge.cli project render-shapes keeper --clips idle,walk -p "$PROJECT" --json > "$WORK/render.json" 2>/dev/null || fail=$((fail+1))
"$PY" - "$WORK/render.json" <<'EOF' || fail=$((fail+1))
import json, sys
r = json.load(open(sys.argv[1])); assert r["ok"], r
print("clips", r["clips"], "directions", len(r["directions"]), "frames", r["frames"], "seconds", r["seconds"])
assert set(r["clips"]) == {"idle", "walk"} and len(r["directions"]) == 8
EOF
"$PY" -m pixelforge.cli shapes sheet "$PROJECT/characters/keeper/shapes/keeper.shapes.json" -o "$OUT/acceptance_idle_walk.png" --clips idle,walk --columns 8 --json >/dev/null 2>&1 || fail=$((fail+1))
echo "errors $fail"

# 3. export into a scratch copy of the game, and a headless game screenshot with the skin
stage "export into a scratch copy of the game at $GAME"
mkdir -p "$SCRATCH"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude .git --exclude docs --exclude web --exclude tools --exclude legacy --exclude _refs --exclude .godot "$GAME/" "$SCRATCH/"
else
  (cd "$GAME" && tar --exclude=.git --exclude=docs --exclude=web --exclude=tools --exclude=legacy --exclude=_refs --exclude=.godot -cf - .) | (cd "$SCRATCH" && tar -xf -)
fi
IMPORTED=${IMPORTED:-$GAME/.godot}   # an imported .godot cache (this checkout's, or another's) saves the minutes a fresh import takes
[ -d "$IMPORTED" ] && cp -r "$IMPORTED" "$SCRATCH/.godot" 2>/dev/null
"$PY" -m pixelforge.cli project export-game keeper --kind keeper --name Keeper --out "$SCRATCH/art/sprites" -p "$PROJECT" --json > "$WORK/export.json" 2>/dev/null || fail=$((fail+1))
"$PY" - "$WORK/export.json" <<'EOF' || fail=$((fail+1))
import json, sys
r = json.load(open(sys.argv[1])); assert r["ok"], r
print("exported", r["kind"], "frames", r["color"]["frames"], "sheet", r["color"]["sheet"], "skins", r.get("skins"), "warnings", r.get("warnings"))
EOF
"$PY" -m pixelforge.cli game-preview --skin keeper --game "$SCRATCH" --godot "$GODOT" --shot "$OUT/acceptance_game.png" --shot-t 6 --timeout 900 --json > "$WORK/game.json" 2>&1 || fail=$((fail+1))
"$PY" - "$WORK/game.json" <<'EOF' || fail=$((fail+1))
import json, sys
t = open(sys.argv[1]).read(); r = json.loads(t[t.index("{"):t.rindex("}") + 1])
print("game shot", r.get("png"), "virtual display", r.get("virtual_display"), "returncode", r.get("returncode"))
assert r.get("ok") and r.get("png"), r.get("error", "")
EOF
echo "errors $fail"

# 4. the Forge: the painting dropped on Home, the rounds, the model beside the painting, Compare (the walkthrough)
stage "the bench walkthrough"
SCRIPT=$(mktemp); sed -e "s#OUT#$OUT#g" -e "s#PICTURE#$PICTURE#g" "$HERE/tools/author_walk.txt" | sed 's#author_\([a-z]*\)\.png#acceptance_bench_\1.png#' > "$SCRIPT"
FPROJ=$WORK/forge_project; "$PY" -m pixelforge.cli project new "$FPROJ" --name Forge --json >/dev/null
log=$(timeout 900 xvfb-run -a -s "-screen 0 ${RES}x24" "$GODOT" --path "$HERE" --rendering-driver opengl3 --resolution "$RES" \
  -- --nosound --project="$FPROJ" --python="$PY" --game="$SCRATCH" --script="$SCRIPT" 2>&1)
echo "$log" | grep -E "^(SHOT|LOG   -> )" | grep -v PF_PROGRESS | head -12
werr=$(echo "$log" | grep -cE 'SCRIPT ERROR|SHADER ERROR|handle_crash'); echo "walkthrough errors $werr"; fail=$((fail+werr))
rm -f "$SCRIPT"

# 5. the no-Claude state: the plain line and Use as reference only
stage "the bench without Claude"
PIXELFORGE_CLAUDE=none timeout 300 xvfb-run -a -s "-screen 0 ${RES}x24" "$GODOT" --path "$HERE" --rendering-driver opengl3 --resolution "$RES" \
  -- --nosound --project="$FPROJ" --python="$PY" --screen=characters --pictures="$PICTURE" --shot="$OUT/acceptance_bench_no_claude.png" --shot_t=8 > "$WORK/noclaude.log" 2>&1
nerr=$(grep -cE 'SCRIPT ERROR|SHADER ERROR|handle_crash' "$WORK/noclaude.log"); echo "no-claude errors $nerr"; fail=$((fail+nerr))

echo "== pictures"; ls "$OUT"/acceptance_*.png
echo "errors $fail"
[ "${KEEP:-}" = "1" ] && echo "work kept at $WORK" || rm -rf "$WORK"
exit $fail
