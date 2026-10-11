#!/bin/bash
# Read a 3D-road bake log (cove_bake.py / cave_bake.py, and the exporters run after them) and say plainly what it shows:
# the render's exit, every tile's alignment, the chunks written, the walk proof, and any error.
#   bash .claude/skills/godmarrow-bake-3d-zone/bake_log_check.sh LOG [LOG ...]
set -u
[ $# -ge 1 ] || { echo "usage: bake_log_check.sh LOG [LOG ...]"; exit 2; }
status=0
for LOG in "$@"; do
  echo "== $LOG"
  [ -f "$LOG" ] || { echo "no such log"; status=1; continue; }
  grep -E "^zone [0-9]+x[0-9]+" "$LOG" | head -1
  grep -E "^rendered " "$LOG" | tail -1
  if grep -qE "^rendered .*\(exit [1-9]" "$LOG"; then echo "RENDER FAILED: Blender exited non-zero"; status=1; fi
  # alignment: 0.00 is good, nan is an empty tile, anything else is a real offset
  n_ok=$(grep -E "aligned to -?0\.00, -?0\.00 px" "$LOG" | sed -E 's/^ *(t[0-9]+_[0-9]+):.*/\1/' | sort -u | wc -l)
  n_nan=$(grep -E "aligned to nan, nan px" "$LOG" | sed -E 's/^ *(t[0-9]+_[0-9]+):.*/\1/' | sort -u | wc -l)
  bad=$(grep -E "aligned to " "$LOG" | grep -vE "aligned to (-?0\.00, -?0\.00|nan, nan) px" | sort -u)
  echo "tiles aligned at 0.00: $n_ok; empty tiles (nan, nothing to align): $n_nan"
  if [ -n "$bad" ]; then echo "MISALIGNED tiles (the chunks will not meet):"; echo "$bad"; status=1; fi
  grep -E "^wrote " "$LOG"
  # the exporters' walk proofs
  while IFS= read -r line; do
    echo "$line"
    w=$(echo "$line" | sed -nE 's/^walkable ([0-9]+) tiles, reached ([0-9]+).*/\1 \2/p')
    if [ -n "$w" ]; then
      read -r nw nr <<< "$w"
      [ "$nw" = "$nr" ] || { echo "WALK PROOF FAILS: $nw walkable, $nr reached"; status=1; }
    fi
    echo "$line" | grep -qE "portal reached: False|: False" && { echo "WALK PROOF FAILS: a way out or a figure is not reached"; status=1; }
  done < <(grep -E "^walkable " "$LOG")
  grep -E "^pool sim" "$LOG"
  if grep -qE "Traceback|Error" "$LOG"; then
    echo "ERRORS:"
    grep -nE "Traceback|Error" "$LOG" | grep -v "RuntimeWarning" | head -8
    grep -q "exceeds WebP limit" "$LOG" && echo "(the WebP limit: an _up band atlas over 16383 px; see the skill, step 4)"
    status=1
  fi
done
exit $status
