#!/bin/bash
# Screenshot every screen and tab of the Forge app under xvfb (no GPU needed), for docs/screens/forgeapp/.
#   GODOT=/path/to/godot PROJECT=/path/to/a/forge/project tools/pixelforge/forge/tools/screens.sh OUTDIR [WxH]
# PROJECT is a Forge project folder (made if missing). KEEPER is the shape model to stand on the bench (default: the
# bundled Keeper); PAINTING a reference painting, GROUND and MUD ground textures, PANEL a painted panel, FLATLAY a
# flat lay, FRONT a front cutout: optional, each opens its bench with it. GAME is the game folder (default: found
# above the Forge). Each shot prints "name | errors N" (N must be 0). The app's test hooks are listed in
# forge/scripts/main.gd. ONLY=music shoots only the names that start with "music" (any prefix works).
set -u
OUT=${1:?OUTDIR}; RES=${2:-1280x720}
GODOT=${GODOT:-godot}; PROJECT=${PROJECT:?PROJECT}; PY=${PY:-python}
HERE=$(cd "$(dirname "$0")/.." && pwd)
KEEPER=${KEEPER:-$HERE/../assets/shapes/characters/keeper.shapes.json}
CHEST=${CHEST:-$HERE/../assets/shapes/objects/chest.shapes.json}
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)   # absolute: Godot resolves a relative --shot against the project folder
shoot() {  # name "args" seconds
  local name=$1 args=$2 t=$3
  [ -n "${ONLY:-}" ] && [[ "$name" != "$ONLY"* ]] && return 0
  local log; log=$(timeout 400 xvfb-run -a -s "-screen 0 ${RES}x24" "$GODOT" --path "$HERE" --rendering-driver opengl3 --resolution "$RES" \
    -- --nosound --project="$PROJECT" --python="$PY" ${GAME:+--game=$GAME} --shot="$OUT/$name.png" --shot_t=$t $args 2>&1)
  echo "$name | errors $(echo "$log" | grep -cE 'SCRIPT ERROR|SHADER ERROR|handle_crash')"
}
shoot home "--screen=home" 3
shoot home_moor "--screen=home --env=moor" 3
shoot home_snow "--screen=home --env=snow --light=1" 3
shoot characters_empty "--screen=characters" 3
for t in Reference Model Materials Motion Frames Export; do
  shoot characters_${t,,} "--screen=characters --model=$KEEPER --tab=$t ${PAINTING:+--painting=$PAINTING}" 12
done
shoot characters_advanced "--screen=characters --model=$KEEPER --tab=Motion --advanced" 12
# the editor on the Keeper's idle frames (S, E and N rendered first so Carry has somewhere to land)
for t in Paint Colour Layers History Carry Effects; do
  shoot editor_${t,,} "--screen=editor --model=$KEEPER --directions=S,E,N --tab=$t" 16
done
shoot creatures "--screen=creatures" 3
for t in Model Materials Behaviour Export; do
  shoot objects_${t,,} "--screen=objects --model=$CHEST --tab=$t --env=crypt" 8
done
for t in Shape Layers Looks Missile Export; do
  shoot effects_${t,,} "--screen=effects --tab=$t" 8
done
shoot tiles_empty "--screen=tiles" 3
[ -n "${GROUND:-}" ] && for t in Source Edges Variants Export; do shoot tiles_${t,,} "--screen=tiles --painting=$GROUND --tab=$t" 10; done
shoot interface_frames "--screen=interface ${PANEL:+--painting=$PANEL}" 8
[ -n "${FLATLAY:-}" ] && shoot interface_icons "--screen=interface --painting=$FLATLAY --tab=Icons" 10
[ -n "${FRONT:-}" ] && shoot interface_portraits "--screen=interface --painting=$FRONT --tab=Portraits" 10
shoot interface_fonts "--screen=interface --tab=Fonts" 3
shoot sound "--screen=sound" 6
for t in Tracks Pattern Song Library Export; do shoot music_${t,,} "--screen=music --tab=$t" 9; done
for t in Window Folders Style; do shoot settings_${t,,} "--screen=settings --tab=$t" 4; done
shoot settings_computer "--screen=settings --tab=3" 12
shoot log "--screen=home --log=1" 3
# the Claude line, with the mock Claude standing in for Claude Code (tests/claude_mock/*.jsonl); the walkthroughs in describe_walk*.txt
walk() {  # name script mock
  local name=$1 script=$2 mock=$3
  [ -n "${ONLY:-}" ] && [[ "$name" != "$ONLY"* ]] && return 0
  [ -f "$PROJECT/project.json" ] || "$PY" -m pixelforge.cli project new "$PROJECT" --name Forge --json >/dev/null
  local tmp; tmp=$(mktemp); sed "s#OUT#$OUT#g" "$HERE/tools/$script" > "$tmp"
  local log; log=$(PIXELFORGE_CLAUDE="mock:$HERE/../tests/claude_mock/$mock" PIXELFORGE_MOCK_DELAY=${MOCK_DELAY:-0.5} timeout 500 xvfb-run -a -s "-screen 0 ${RES}x24" \
    "$GODOT" --path "$HERE" --rendering-driver opengl3 --resolution "$RES" -- --nosound --project="$PROJECT" --python="$PY" ${GAME:+--game=$GAME} --script="$tmp" 2>&1)
  rm -f "$tmp"
  echo "$name | errors $(echo "$log" | grep -cE 'SCRIPT ERROR|SHADER ERROR|handle_crash') | shots $(echo "$log" | grep -c '^SHOT ')"
  [ -n "${VERBOSE:-}" ] && echo "$log" | grep -E 'SCRIPT|SHOT|LOG   ->|ERROR' | head -60
  return 0
}
walk describe_characters describe_walk.txt characters.jsonl
walk describe_music describe_walk_music.txt music.jsonl
