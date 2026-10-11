#!/bin/bash
# One in-game capture of Godmarrow (or a strip of them): a new Ossuarch stood at a zone tile, the screen saved, the log
# checked for errors.
#   bash .claude/skills/godmarrow-capture/shot.sh ZONE X,Y OUT.png [more game args ...]
# env: SHOT_T  seconds before the first frame (default 6)
#      SHOT_N  frames (default 1); a strip writes OUT_0.png .. OUT_{N-1}.png beside OUT
#      SHOT_DT seconds between frames (default 0.5)
#      GODOT   the console exe; DRY=1 prints the command only
# More game args go after the -- as they are: --hour=0.978 --hide=dark --show=collision --no_opening ...
# Needs a window: never --headless. The log is written beside OUT as OUT.log.
set -u
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
G=${GODOT:-/c/Users/derek/OneDrive/Desktop/Godot/Godot_v4.7.2-stable_win64_console.exe}
ZONE=${1:?usage: shot.sh ZONE X,Y OUT.png [game args]}
AT=${2:?usage: shot.sh ZONE X,Y OUT.png [game args]}
OUT=${3:?usage: shot.sh ZONE X,Y OUT.png [game args]}
shift 3
T=${SHOT_T:-6}
N=${SHOT_N:-1}
DT=${SHOT_DT:-0.5}
mkdir -p "$(dirname "$OUT")"
WOUT=$(cygpath -m "$OUT")                     # Godot wants C:/... paths
LOG="${OUT%.png}.log"
# the run's length: the wait, the frames, and a minute and a half to load
LIM=$(awk -v t="$T" -v n="$N" -v d="$DT" 'BEGIN { printf "%d", t + n * d + 90 }')
ARGS=(--path . -- --zone="$ZONE" --new --cls=ossumancer --at="$AT" --shot="$WOUT" --shot_t="$T")
if [ "$N" -gt 1 ]; then
  ARGS+=(--shot_n="$N" --shot_dt="$DT")
fi
ARGS+=("$@")
echo "+ timeout $LIM $G ${ARGS[*]}"
[ -n "${DRY:-}" ] && exit 0
[ -x "$G" ] || { echo "no Godot at $G"; exit 2; }
timeout "$LIM" "$G" "${ARGS[@]}" > "$LOG" 2>&1
code=$?
errs=$(grep -ciE "SCRIPT ERROR|SHADER ERROR|Parse Error|Invalid call|Invalid access" "$LOG")
echo "exit $code; $errs error line(s) in $LOG"
grep -iE "SCRIPT ERROR|SHADER ERROR|Parse Error|Invalid call|Invalid access" -A4 "$LOG" | head -20
if [ "$N" -gt 1 ]; then
  ls -1 "${OUT%.png}"_*.png 2>/dev/null
else
  ls -1 "$OUT" 2>/dev/null || echo "no picture written (did the zone load? read $LOG)"
fi
