---
name: godmarrow-safe-commit
description: Use for every git commit or push in the Godmarrow repo (C:\Users\derek\GodMarrow, shared by several sessions at once) - staging only your own files by name, the files never to commit, the attribution line, line endings, no destructive git, the secret scan before a push, and when to push to main (which updates Derek's laptop).
---

# Commit and push safely in the shared tree

The tree is shared: other sessions (PixelForge, the paint-over tools, concept work, another art session's bake) have
uncommitted changes in it at the same time as you. CLAUDE.md: "Commit only your own files, by name, and end each
message with the attribution line." "No destructive git." "Push only when Derek wants it."

## 1. See what is yours

```bash
cd /c/Users/derek/GodMarrow
git status --short                     # everything changed in the tree, yours and others'
git diff --stat -- <file>              # how big a change is
git diff -- <file> | head -80          # whose it is: do you recognise every hunk?
git log --oneline -3 -- <file>         # who touched it last
```

A file is yours to commit only if every change in it is yours. If a file holds your change and someone else's
(another session's hunks), do not commit it whole and do not revert their part: leave it, and say so in your report.
(`git add -p` is interactive and is not available here.)

**Never commit** (they belong to other sessions, or must never be public):
- other sessions' work in progress, for example (check `git status` each time, the list changes):
  `art/sprites/ossuarch_hd.json` and `.png`, `tools/paintover/*` (`detail_*.py`, `kit.py`, `px_ossuarch.py`),
  `docs/concepts/shrine_keeper/make_keeper_shapes.py`, `tools/pixelforge/assets/shapes/characters/keeper_hd.shapes.json`
  and `ossuarch.shapes.json`, `tools/pixelforge/pixelforge/blender/rig_model.py`, and another session's bake output
  in `art/zones/<zone>_s<seed>/`;
- anything from Cursemark (the assets were in `/cursemark/`, gitignored; the `cm_*.gd` loaders already in git are
  code only; never add Cursemark art, data or sound);
- `android_build.tgz` (it holds the Android signing key);
- keys, tokens, passwords. The PixelLab token lives only in `~/.pixellab/token`, the Hugging Face token only in
  `~/.huggingface/token`: never print or copy them. Never read `_secrets`;
- studies of other games' art (`tools/art_study/private/`, gitignored);
- scratch files: captures, logs, bake WORK_DIRs belong in the session scratchpad, never in the repo.

## 2. Stage by name

```bash
git add tools/landkit3d/cave3d.py art/zones/opening_cave_s9301 data/zones/opening_cave_s9301.json.gz
git diff --cached --stat               # exactly the files you meant, nothing else
```

- Never `git add -A`, `git add .`, `git add -u` or `git commit -a`.
- A directory may be staged whole only when every change under it is yours (check `git status --short <dir>`).
- Art files come with their Godot `.import` files (`foo.webp` and `foo.webp.import`).
- `.gitignore` ignores any file whose name contains `token` (except `*token*.gd`): name files so.

## 3. Commit

```bash
git commit -q -F - <<'EOF'
<One plain sentence of what changed, in the game's own terms: "The cave rebaked without the hall's left row of pillars">

<Optional body: Derek's words if he asked for it, the proof (smoke 12/0, 60 fps, every tile aligned, the walk
proved), what still fails.>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log --oneline -1
```

- The last line is the attribution line given in the session's system reminder (as of 2026-10-11:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). If the session gives a different one, use that.
- Plain words, no jargon; Derek reads the log. Keep the word laws (`godmarrow-lore-and-words`), the g-a-p word
  among them (Derek, 2026-10-11).
- One piece of work a commit; commit when a step is proved, not at the end of the day.
- Never `--no-verify`, never amend a commit already pushed; prefer a new commit.

## 4. Line endings

`core.autocrlf` is false: files keep the endings they are written with. The tree mixes LF and CRLF
(`tools/landkit3d/README.md` lists each module's). Keep each file's own endings when you edit it; write new files
with LF. Check:

```bash
tools/pixelforge/.venv/Scripts/python -c "import sys; b=open(sys.argv[1],'rb').read(); print(b.count(b'\r\n'), b.count(b'\n'))" FILE
# two equal numbers = CRLF; first 0 = LF
```

A new file of yours that came out CRLF: `sed -i 's/\r$//' FILE` (only your own files). In a Python patch, open with
`newline=""` and write back with the same endings you found.

## 5. No destructive git

No `reset --hard`, no `push --force`, no bare `git stash` (it would take other sessions' work), no `checkout -- <file>`
or `restore` on files that are not yours, no `clean`, no `rebase -i`, no branch deletions. Nothing that throws away
work in the tree. Deletions of files on the PC go to the Recycle Bin and need Derek's yes (08 section 7).

## 6. Push (only when Derek wants the laptop to have it)

The PC works on `main`, tracking `origin/main` (`push.default upstream`); the repo is public
(https://github.com/Kaspa-World-Eater/GodMarrow). Derek's laptop pulls `main` at every launch, so a push changes what
he plays next.

```bash
bash .claude/skills/godmarrow-safe-commit/push_check.sh          # what would go, and the secret scan
bash .claude/skills/godmarrow-safe-commit/push_check.sh --push   # the same, then git push if the scan is clean
```

By hand:

```bash
git fetch -q origin && git status -sb | head -1                  # ahead N, behind 0 wanted
git diff --stat origin/main..HEAD | tail -5                      # what would go
git diff origin/main..HEAD | grep -E "^\+" | grep -cE "hf_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|OPENSSH) PRIVATE"   # must print 0
git push
```

- Auth is the GitHub CLI's login (`gh auth setup-git`). Never type a password or paste a token.
- If the push is rejected (behind, or auth), stop and report the exact error. Never force-push, never change the
  remote or the credentials.
