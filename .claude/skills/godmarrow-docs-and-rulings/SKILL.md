---
name: godmarrow-docs-and-rulings
description: Use when Derek gives a ruling or a grade, when a Godmarrow piece or area is finished, when the state of the game or the work in progress changes, when a tool's usage changes, or when two documents disagree - where each kind of knowledge is written (the decision log, CLAUDE.md, MASTER_RULES, HANDOFF, the docs map, tool READMEs, pass logs, reports), how it is written, and how to patch files without breaking their line endings.
---

# Keeping the documents true

Every session starts by reading `CLAUDE.md`, `docs/HANDOFF.md` and `docs/README.md`, so they must say what is true
today. When two documents disagree, Derek's newest dated ruling in `docs/wiki/01-rules-and-decisions.md` wins, then
the newer document.

## Where each thing goes

| What happened | Where it is written | How |
|---|---|---|
| Derek rules on anything | `docs/wiki/01-rules-and-decisions.md`, "Decision log (newest first)" | a new entry at the top: `- **YYYY-MM-DD, <subject> (<context>):** <the ruling>`, his words verbatim in quotes, sub-bullets for the parts. If it changes a standing law, also change the law's own section above the log |
| A law that never bends changes | `CLAUDE.md`, "The laws that never bend" | short; the full text stays in `01` |
| An art law, the order of the art work | `docs/MASTER_RULES.md` (section 8 is the order: mark a piece `(**done** YYYY-MM-DD, Derek: "...")`) | and `docs/PAINTED_STANDARD.md` / `docs/CINEMATOGRAPHY.md` for their subjects |
| The state of the game, the work in progress, open questions | `docs/HANDOFF.md` | **rewrite in place, never append a log** ("keep it current (replace, don't append a log)"); sections 4 (state), 5 (work in progress, review page links), 8 (open questions for Derek). Older hand-offs live in `docs/archive/` |
| A new or retired document or tool folder | `docs/README.md` (the map), `tools/README.md` | one row each |
| A 3D-road module added or changed | `tools/landkit3d/README.md` | its row in the module index (with its EOL), the Gotchas, the pipeline |
| Code architecture, a new test hook | `docs/wiki/13-godot.md` (section 10 lists the user args) and the head comment of `core/test_hooks.gd` | |
| Running, testing, git, the machines | `docs/wiki/08-tech-and-build.md` | |
| Each art piece's work | `tools/landkit/passes/<piece>.md` (`godmarrow-art-passes`) | |
| A finished piece | `tools/art_study/reports/NN-<piece>.md` and its row in `reports/README.md` | what worked, what failed, why |
| A study of the real thing | `tools/art_study/chapters/NN-<subject>.md` and `chapters/README.md` | |
| A technique worth keeping | `tools/art_study/library/` (methods, environments, objects) | |
| Anything that moves | `docs/animation/` (its README indexes the pages) | |
| Lore | `docs/wiki/mythology/` (the bible), `docs/wiki/in-game-texts/` (`godmarrow-lore-and-words`) | |
| Something retired | moved to `docs/archive/` (never deleted), with a line in the map | |

## How the documents are written

- Plain English in short sentences; Derek reads them. Lists over walls of text. No jargon in anything he reads.
- A dated italic line under each page's title says when it was last rewritten and why
  (`*Rewritten 2026-10-09. ...*`).
- Rulings carry Derek's exact words in quotes, with the date. Never paraphrase a ruling into something he did not say.
- Report what is, not what was planned: "done" only when Derek called it done.
- The word laws hold in documents too (`godmarrow-lore-and-words`), the g-a-p word among them.
- Facts are checked before they are written (`ls`, `grep`, running the tool), never guessed.

## Patching a file safely

Most of the tree is LF; some files are CRLF (see `tools/landkit3d/README.md`'s EOL column). Keep each file's own
endings. The Edit tool is fine for small changes. For a scripted multi-place change, use this pattern (each old text
must occur exactly once, so a patch never lands twice or in the wrong place):

```python
def patch(p, R):
    s = open(p, encoding="utf8", newline="").read()
    nl = "\r\n" if "\r\n" in s else "\n"
    s = s.replace("\r\n", "\n")
    for a, b in R:
        assert s.count(a) == 1, (p, a[:70])
        s = s.replace(a, b)
    open(p, "w", encoding="utf8", newline="").write(s.replace("\n", nl))
```

Run it with `tools/pixelforge/.venv/Scripts/python - <<'EOF' ... EOF` from the repo root. New files are LF.

## Then

Commit the documents with the work they describe, by name (`godmarrow-safe-commit`). Documents other sessions are
editing at the same time (check `git status`) are left to them.
