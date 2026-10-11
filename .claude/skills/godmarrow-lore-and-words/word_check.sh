#!/bin/bash
# Godmarrow's word laws, checked: every line of the given files with a banned word, a retired name or a forbidden form.
#   bash .claude/skills/godmarrow-lore-and-words/word_check.sh FILE [FILE ...]
# Each hit needs judgment (code identifiers, art notes, a word quoted in a rule); in the bible and in player-facing
# text, fix it. Names ("the [verb]-ers", "the [past participle]") are not machine-checked: read for them.
# Exit 0 when nothing is found, 1 when something is.
set -u
[ $# -ge 1 ] || { echo "usage: word_check.sh FILE [FILE ...]"; exit 2; }
FILES=("$@")
found=0
check() {  # label, extended regex (case-insensitive, whole words)
  local label=$1 rx=$2 out
  out=$(grep -n -i -w -E "$rx" "${FILES[@]}" 2>/dev/null)
  if [ -n "$out" ]; then
    echo "== $label"
    echo "$out" | cut -c1-200 | head -40
    found=1
  fi
}
check "banned words (01, Words and lore)" "cooldowns?|dps|procs?|aggro|loot(s|ed|ing)?|buffs?|nerfs?|stun(s|ned)?|lightning|mana|rot|rots|rotting|rotten|cells?|virus|dna|organisms?|biology"
check "the Silence is never the Hush (and the Reading never says hush)" "the hush|hush(ed)?"
check "the Pale, never white" "white"
check "every morning is a mourning" "mornings?"
check "the word Derek banned on 2026-10-11 (say path, way through, opening, break, space between)" "g[a]ps?"
check "retired names" "weeping maiden|wet nurse|polished heart|laden board|brotherhood|the five"
check "real-world words" "pennies|penny|miles?|country|friday"
check "animals (only insects, the moor's crows, the bog's serpent god)" "fireflies|firefly|wolf|wolves|dogs?|hounds?|rats?|horses?|birds?|fish|snakes?|deer|fox|foxes|owls?|ravens?"
check "hard numbers of time, dates" "[0-9]+ (years?|centuries|decades|winters|ages)|(year|age) [0-9]+"
if [ "$found" = 0 ]; then echo "word check: nothing found"; exit 0; fi
exit 1
