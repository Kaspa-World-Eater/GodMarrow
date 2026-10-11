---
name: godmarrow-art-passes
description: Use before and during any new Godmarrow art piece, area, scene, object, effect, character or animation, and on every 15-minute RULES CHECK reminder - the MASTER_RULES gate ("Rules check, before pass 1" in tools/landkit/passes/<piece>.md), the brief from the area's lore, the ten graded passes, the written 13-line checklist, cine_check and the value-only test, skeptic rounds, reading Derek's grades and notes from the area's review page, and the study chapter and report when a piece is done.
---

# One art piece: the gate, the passes, the grades

Derek's method (MASTER_RULES sections "The gate", 2 and 4; memory: rules gate, art not a factory, look don't guess):
one piece at a time, made to his A, graded honestly in writing, never a mock-up shown as a result.

## 1. The gate (before the first line of code or the first render)

"No check written, no work begun." The 15-minute reminder fires only when the session is idle, so it never catches
the start of work: run the check yourself.

1. **Read** (MASTER_RULES section 1 is the full table):
   - `docs/MASTER_RULES.md` in full;
   - the area's lore: `docs/wiki/mythology/areas/<area>.md` (the cove and cave: `the-red-shore.md`), the myths of its
     faiths, `docs/wiki/mythology/00-the-deep-lore.md`;
   - `docs/PAINTED_STANDARD.md`, `docs/CINEMATOGRAPHY.md`, `docs/wiki/06-art-direction.md`, `docs/wiki/07-art-pipelines.md`;
   - `docs/animation/` for anything that moves (02 the method, 05 the checklist, 07 the body in motion);
   - `tools/landkit3d/README.md` (the 3D road) and `tools/README.md`;
   - the art library: `tools/art_study/library/README.md` (methods, environments, objects), every chapter in
     `tools/art_study/chapters/` and report in `tools/art_study/reports/` that touches the piece,
     `tools/art_study/LIVING_LANDSCAPES.md` and `tools/art_study/ecosystems/` for land;
   - `docs/wiki/01-rules-and-decisions.md` (the newest dated ruling wins);
   - the area's review page notes (section 5) and the piece's own pass log, if it exists.
2. **Write** at the top of `tools/landkit/passes/<piece>.md` (new files LF) the section
   `## Rules check, before pass 1`: each document read, with the one line from it that shapes this piece; then
   confirm line by line:
   - every object and surface is a new design for this place, nothing borrowed from another scene (2b.3);
   - everything with height is real form (section 0: Blender on the 3D road, or the height engine for ground);
   - placement follows the ecosystem's causes (section 5);
   - the one true detail from the area's lore that goes into the piece.
3. **The study first** (2c): if no chapter covers the real thing (anatomy, geology, botany, architecture), write
   `tools/art_study/chapters/NN-<subject>.md` from real sources with recipes, and read it back for the brief.
4. **The brief** (`## The brief`): what it is, every detail with its reason, built from the cause, at true scale with
   the pilgrim small in it. Show Derek the brief and **wait for his go**. If work was begun on his go before the check
   was written, write it anyway and say so in its heading ("written late").

`pass-log-template.md` in this folder has the headings to copy.

## 2. The passes (at least ten)

Each pass is `## Pass N (YYYY-MM-DD): <what it is>` and fixes the worst failure the last grade found:
- what was built or changed, with the files;
- what it looks like **in the game** or at the game's camera, with the Ossuarch for scale (`godmarrow-capture`);
- its numbers (cine_check, frame rate, smoke) where they apply;
- **Grade** A to D (with + and -), honest; then **Worst open, in order**.

Log failures too: an idea dropped and why (the newborn's hood, pass 3), a fix that showed nothing and what the
diagnosis found. After one fix fails to show, build a diagnostic view before the next try: colour the model by
material, a plain grey geometry close-up, an A/B with a feature switched off, check the import's timestamps, check
the export itself.

## 3. The checklist after each pass (MASTER_RULES section 4, in writing)

Heading: `## Rules check (after pass N)`. Then **Read:** (what changed in MASTER_RULES and the lore since the last
check; `git log --oneline -3 -- docs/MASTER_RULES.md docs/wiki/mythology/areas/`), **The checklist:** every line
numbered, Passes / Fails / Partly, with the reason:

1. Brief, with the lore's one true detail.
2. Scale: true size (on the 2 x 2 grid a yard is 36 x 18 art px on the ground, 42 of height), the Ossuarch beside it.
3. Form (the law): real form lit through its normals; the value-only test passes; ground depth at three scales
   (0.5b); every rounded thing turned with the five tones of form (0.5c).
4. Light: the area's key (the overcast sky in the first area, the moon elsewhere) and a warm local light, both casting.
5. Values: three to five clean tone groups first.
6. Ramps: hue-shifted, 6 to 8 tones for big forms, 3 to 4 for small.
7. Paint: broad tones, dry-brush strokes along the form, pooled wet edges, lit lips, a world-fixed tooth, dither only
   at tone edges.
8. Contact: occlusion, things over feet, lit rims.
9. Detail where it counts: lit side and silhouette; the shade kept flat.
10. Life: it moves in the one wind; nothing pasted.
11. Seen as the player sees it: the game's camera and light; for game pieces the bake aligned (0.00 px every tile),
    the walk proved by the exporter, a capture in the game, no visible repeat.
12. Skeptic round: side by side with the best pieces (the Seer's Bowl title, the pit of offering, the ruins, the dune,
    the temple's A); fix the worst difference first.
13. Cinematography (`docs/CINEMATOGRAPHY.md`): paste `cine_check.py`'s report.

End with **Worst failure first: N.** and the plan for the next pass.

The measurements:

```bash
PY=tools/pixelforge/.venv/Scripts/python
$PY tools/landkit3d/cine_check.py FRAME.png [--exterior]      # PASS/FAIL for rules 1, 2, 4, 5, 6, 7, 22, 27 (interior by default)
$PY tools/landkit3d/value_render.py PASSES_DIR OUT.png [SCALE] # the value-only test from a render's passes
$PY tools/anim/contact_sheet.py SPRITE [view] [out.png]       # a sprite clip's frames, change per step, loop seams
```

## 4. The laws a piece must keep (the short list; the full ones are in MASTER_RULES and 01)

- Nothing painted flat; colour never stands in for height. No primitive stand-ins (tubes for limbs, cones for trees).
- No fog or mist layers. No red light, except the pit of offering's throat in the Sunken Bog and the opening cave's
  blood pool glow; the blood never glows.
- No animals but insects, the moor's crows and the bog's serpent god. Sap is dark blood.
- The 2 x 2 art grid (`godmarrow-2x2-grid`). Light from the screen's upper left. Hue-shifted ramps.
- True scale, the pilgrim small; towering trees with their tops off screen; floors dense with litter, never calm.
- Weather acts on the world by material (wet, stemflow, shelter), never a layer over it.
- Characters are live 3D bodies (`godmarrow-live-3d-character`); AI-made characters and 3D are rejected.
- A scene Derek calls a masterpiece is locked: it only stays or improves, in one shared place (2b).

## 5. Derek's grades and notes (the review pages)

Every area has one review page (memory: review pages standard). Derek grades each piece A to D and leaves notes;
they are saved in the page's database. Read them before the next pass, log them in the pass log
(`## Derek, YYYY-MM-DD: <grade>` with his words verbatim in quotes), act on every one, then update **the same page**
(new image in place of the old, honest grade, what still fails). Never make a new page per pass.

| Page | URL | Collection |
|---|---|---|
| the Red Shore (cave and cove) | https://claude.ai/artifact/UiDv3XxS7TmkW5v3ahzTDn | `grades` |
| the Sunken Bog | https://claude.ai/artifact/Bp6bCHbLWiWt3MMnqfLznY | `grades` |
| the temple trial | https://claude.ai/artifact/T28WGqopEAxcLm6v68hBer | read the page first to confirm its collection |
| the Myths and Lands (lore) | https://claude.ai/artifact/FJszffP2zc6C48vyDHH9ja | `notes` |

Reading them (the `ArtifactData` tool; load it with ToolSearch if it is deferred):

```json
{"action": "query", "url": "https://claude.ai/artifact/UiDv3XxS7TmkW5v3ahzTDn", "collection": "grades", "query": {"limit": 50}}
```

Each grade document holds `grade`, `note` and `at` (keyed by the piece's id). To update a page, read it first with
the `Artifact` tool (`action: read`), change it, and publish to the same URL. A new area gets its own page in the same
style (load the `artifact-design` and `artifact-capabilities` skills; capabilities `db` and `user`).

**The workbench** (https://claude.ai/artifact/XCo2vaBbJ5vxFgpMAW8dC1) is updated only at true milestones (a scene
passed, an area baked, an old scene reworked): the new picture replaces the old, and the link goes in the reply.

## 6. The 15-minute RULES CHECK (Derek's standing order)

While a piece is in work, a recurring session reminder runs the check: `CronCreate` with cron `4,19,34,49 * * * *`,
`recurring: true`, and the prompt in `rules-check-prompt.md` (verbatim). On each reminder:
1. re-read MASTER_RULES and the area's lore; write the checklist in the pass log;
2. **make the most valuable improvement** (Derek, 2026-10-08: "on the pings, decide what you can improve too"),
   render it, log it; then carry on with the work in progress;
3. the pause rule: if you are waiting on Derek and this is the third reminder in a row with no reply, delete the job
   (`CronDelete`) and tell him; recreate it with the same prompt when he next writes.

## 7. When the piece is done

- Derek's grade on the review page is the verdict. Mark it done in `docs/MASTER_RULES.md` section 8 and in
  `docs/HANDOFF.md` with his words and the date (`godmarrow-docs-and-rulings`).
- Write the report: `tools/art_study/reports/NN-<piece>.md` (what worked, what failed, why, the method), and add its
  row to `tools/art_study/reports/README.md`. A technique worth keeping goes in `tools/art_study/library/`.
- Commit the pass log with the piece's files (`godmarrow-safe-commit`).
