#!/bin/bash
# Smoke test: run before and after any cleanup and compare the two reports.
#   tools/smoke.sh OUT.txt
# For each ported order: a level-15 pilgrim with every skill at 5 casts at six tireless creatures for 12 s.
# The report lists script errors, and which skills dealt damage (the damage numbers vary run to run; the set should not).
# Then: the title, each panel, a champion fight with deeds, and the count sigils, each checked for script errors.
# Before all of it: tools/check_2x2.py, the 2 x 2 grid guard ("2x2 check: ok", or each 4-px cell it found).
cd "$(dirname "$0")/.."
GODOT=${GODOT:-/opt/godot/Godot_v4.7.2-stable_linux.x86_64}
OUT=${1:-/tmp/smoke.txt}; : > "$OUT"
# first, the 2 x 2 grid (MASTER_RULES 3.7): no drawing cell of 4 px anywhere in the shaders or the game's scripts
PY=${PY:-tools/pixelforge/.venv/Scripts/python}
[ -x "$PY" ] || [ -x "$PY.exe" ] || PY=python3
grid=$("$PY" tools/check_2x2.py 2>&1)
echo "$grid" | tail -1 >> "$OUT"
echo "$grid" | sed '$d' | sed 's/^/    /' >> "$OUT"
run() {  # name, frames (arena runs quit on their own), args...
  local name=$1 frames=$2; shift 2
  local log; log=$(timeout 200 "$GODOT" --headless --path . --fixed-fps 30 --quit-after "$frames" -- "$@" 2>&1 < /dev/null)
  local errs; errs=$(echo "$log" | grep -cE "SCRIPT ERROR|Parse Error|Invalid call|Invalid access")
  local skills; skills=$(echo "$log" | grep -oE '"[a-z_0-9]+": [0-9.]+' | grep -v _spent | awk -F'"' '$3+0>0 || $3 ~ /[1-9]/ {print $2}' | sort -u | tr '\n' ' ')
  echo "$name | errors $errs | dealt: $skills" >> "$OUT"
  echo "$log" | grep -E "SCRIPT ERROR|Parse Error|Invalid call|Invalid access" -A2 | head -12 | sed 's/^/    /' >> "$OUT"
}
for cls in animancer monk miasmancer ossumancer; do
  run "order $cls" 100000 --zone=fen --seed=7 --new --cls=$cls --lvl=15 --learn=all:5 --autocast --arena=6 --arena_kind=hollow --arena_t=12
done
run "champions + deeds" 100000 --seed=7 --new --zone=fen --cls=monk --arena=4 --arena_kind=hollow --arena_live --arena_rank=champion --arena_t=10
run "count sigils" 100000 --new --zone=fen --cls=monk --arena=4 --arena_kind=hollow --sigils --arena_t=5
for p in skills inv char board journal; do
  run "panel $p" 240 --zone=red_shore --cls=animancer --panel=$p
done
run "title" 240 --title
cat "$OUT"
