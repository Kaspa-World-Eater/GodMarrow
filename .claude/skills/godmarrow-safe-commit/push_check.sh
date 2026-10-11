#!/bin/bash
# Before a push to Godmarrow's public main: where the branch stands, what would go, and a scan of the added lines for
# keys and tokens. With --push, pushes only if the scan is clean and nothing is behind.
#   bash .claude/skills/godmarrow-safe-commit/push_check.sh [--push]
set -u
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel) || exit 2
cd "$ROOT" || exit 2
br=$(git branch --show-current)
up=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null) || { echo "no upstream for $br"; exit 2; }
git fetch -q origin 2>&1 | tail -2
read -r behind ahead < <(git rev-list --left-right --count "$up...HEAD")
echo "branch $br -> $up: ahead $ahead, behind $behind"
if [ "$ahead" = "0" ]; then echo "nothing to push"; exit 0; fi
echo "commits that would go:"
git log --oneline "$up..HEAD" | head -20
echo "files:"
git diff --stat "$up..HEAD" | tail -12
# never a key or token in what goes public (the patterns, not any value)
hits=$(git diff "$up..HEAD" | grep -E "^\+" | grep -cE "hf_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY")
big=$(git diff --name-only "$up..HEAD" | grep -iE "android_build\.tgz|\.keystore$|\.jks$|/_secrets/|^cursemark/|art_study/private/" || true)
echo "secret scan: $hits suspicious added line(s)"
[ -n "$big" ] && echo "FILES THAT MUST NEVER BE PUBLIC:" && echo "$big"
if [ "$hits" != "0" ] || [ -n "$big" ]; then echo "do not push: look at the lines above"; exit 1; fi
if [ "${1:-}" = "--push" ]; then
  if [ "$behind" != "0" ]; then echo "behind $up by $behind: not pushing (no force; report it)"; exit 1; fi
  git push 2>&1 | tail -3
  exit "${PIPESTATUS[0]}"
fi
