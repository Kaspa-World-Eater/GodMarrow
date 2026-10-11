#!/bin/bash
# Verify a Godmarrow change: the parse check, the smoke test (12 sections, 0 errors, the 2x2 check first), and,
# given a zone and a tile, the frame rate there.
#   bash .claude/skills/godmarrow-smoke-and-perf/verify.sh OUT_DIR [ZONE X,Y]
# OUT_DIR: where the reports go (the session scratchpad, never the repo).
# env: GODOT (the console exe), DRY=1 (print the commands only).
set -u
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
G=${GODOT:-/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe}
OUT=${1:?usage: verify.sh OUT_DIR [ZONE X,Y]}
ZONE=${2:-}
AT=${3:-}
run() {  # print, then run unless DRY
  echo "+ $*"
  [ -n "${DRY:-}" ] || "$@"
}
[ -x "$G" ] || { echo "no Godot at $G"; exit 2; }
mkdir -p "$OUT"

echo "== parse"
run bash -c "timeout 120 '$G' --headless --path . --quit > '$OUT/parse.txt' 2>&1"
if [ -z "${DRY:-}" ]; then
  if grep -qE "SCRIPT ERROR|Parse Error|SHADER ERROR" "$OUT/parse.txt"; then
    grep -E "SCRIPT ERROR|Parse Error|SHADER ERROR" -A3 "$OUT/parse.txt" | head -20
    echo "parse: FAIL"
  else
    echo "parse: ok"
  fi
fi

echo "== smoke (several minutes)"
run bash -c "GODOT='$G' timeout 1500 tools/smoke.sh '$OUT/smoke.txt' > /dev/null 2>&1"
if [ -z "${DRY:-}" ]; then
  head -1 "$OUT/smoke.txt"
  ok=$(grep -c "| errors 0 |" "$OUT/smoke.txt")
  bad=$(grep -cE "\| errors [1-9]" "$OUT/smoke.txt")
  echo "smoke: $ok sections with 0 errors, $bad with errors (want 12 and 0)"
  grep -E "\| errors [1-9]" -A12 "$OUT/smoke.txt" | head -40
fi

if [ -n "$ZONE" ] && [ -n "$AT" ]; then
  echo "== perf at $ZONE $AT (opens a window)"
  busy=$(ps -W 2>/dev/null | grep -ciE "blender(\.exe)?$|python(\.exe)?$")
  [ "$busy" -gt 0 ] && echo "note: $busy Python/Blender processes are running; a bake skews the frame rate"
  run bash -c "timeout 60 '$G' --path . -- --zone='$ZONE' --new --cls=ossumancer --at='$AT' --perf > '$OUT/perf.txt' 2>&1"
  [ -n "${DRY:-}" ] || grep "^PERF" "$OUT/perf.txt" | tail -5
fi
