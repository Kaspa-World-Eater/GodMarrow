"""The character loop: Claude Code hand-authors a shape model against a painting (or a sentence), in rounds.

``pixelforge character author NAME --project P [--painting P.png] [--sentence "..."] [--rounds 3] [--target 0.85] --json``
and :func:`author`:

1. The painting (when there is one) is copied UNTOUCHED into ``characters/<name>/source/painting.<ext>``: it is the
   reference and nothing else, never cut, quantised, measured or converted by the loop (``measure_views`` and
   ``compare_shapes`` read it on the fly; the cutouts live in memory).
2. Round 1: Claude Code (:mod:`pixelforge.claude_bridge`, with :mod:`pixelforge.prompts_author` as its brief) writes
   and runs a generator script in ``characters/<name>/shapes/`` (Write, Edit and Bash are granted for that folder only,
   plus PixelForge's MCP tools) and leaves ``<name>.shapes.json`` there. The loop validates the file, renders the stills
   facing S, E and N and the compare picture, and scores the silhouette overlap per view (mean = the round's score).
3. Later rounds: Claude is handed the compare picture, the overlap per view and the person's note, edits the script
   or the file, renders again. The loop stops at the target, when the score has not improved for two rounds running,
   or when the rounds are used up. Every round's script, model, stills, compare and record land under
   ``characters/<name>/author/round_N/``; ``author/author.json`` is the summary; ``previews/`` holds the best round's
   still and compare for the bench.

Progress: ``progress(words, round, done, total)`` is told the round's start, every tool Claude calls, and the round's
score ("round 2 · front 0.81 · the shoulder plates"). Everything returns a JSON-serialisable dict; what cannot run
raises :class:`pixelforge.api.StepError` with the fix in plain words. The mock Claude (``PIXELFORGE_CLAUDE=mock:...``,
``tests/claude_mock/author.jsonl``) stands in for the CLI in tests.
"""
from __future__ import annotations

import json
import shutil
import time
from pathlib import Path

from . import claude_bridge as CB, prompts_author as PA, shape_measure as M, shape_tools, shapes as S
from .api import StepError, add_character, new_project
from .picture_road import IMAGE_EXTS, cut_views, judgement, name_of
from .project import Project, slugify
from .styles import get_style

ROUND_TIMEOUT = 1800.0
STILLS = (("S", "front"), ("E", "side"), ("N", "back"))
PATIENCE = 2                 # rounds without a better score before the loop stops


def _project(project: str | Path, style: str) -> Project:
    root = Path(project)
    if not (root / "project.json").exists():
        root.mkdir(parents=True, exist_ok=True)
        new_project(root, root.name or "Forge", style)
    return Project.load(root)


def name_for(name: str | None, painting: str | Path | None, sentence: str | None) -> str:
    """The character's key: the name given, else the painting's words (as the picture road reads a Midjourney file
    name), else the first words of the sentence."""
    if name:
        return slugify(name)
    if painting:
        return name_of(painting)
    words = [w for w in (sentence or "").lower().split() if w.isalnum() and w not in ("a", "an", "the", "of", "with", "and", "in", "on")]
    if not words:
        raise StepError("Give the character a name, a painting or a sentence.")
    return slugify(" ".join(words[:4]))


def place_painting(proj: Project, name: str, painting: str | Path) -> Path:
    """The painting into the character's ``source/`` byte for byte (``shutil.copy2``); the reference, nothing derived."""
    src = Path(painting)
    if not src.exists():
        raise StepError(f"No picture at {src}.")
    if src.suffix.lower() not in IMAGE_EXTS:
        raise StepError(f"{src.name} is not a picture the Forge can read (PNG, JPG or WEBP).")
    dst = proj.sub(name, "source") / ("painting" + src.suffix.lower())
    for old in dst.parent.glob("painting.*"):
        if old != dst:
            old.unlink()
    shutil.copy2(src, dst)
    c = proj.character(name)
    c.sources["painting"] = str(dst.relative_to(proj.root)).replace("\\", "/")
    c.notes["painting"] = str(src.resolve())
    proj.save()
    return dst


def _views(painting: Path | None) -> dict:
    """The painting's views as cutouts, in memory only (the painting on disk is never touched)."""
    if painting is None:
        return {}
    views, _kind, _notes = cut_views([painting])
    return views


def _adopt(proj: Project, name: str, model: Path, check: dict) -> None:
    """The model Claude left in ``shapes/`` is the character's (what ``import_shapes`` records, without copying a file onto itself)."""
    c = proj.character(name)
    c.sources["shapes"] = str(model.relative_to(proj.root)).replace("\\", "/")
    c.done["split"] = c.done["palette"] = c.done["model"] = c.done["rig"] = True
    c.notes["shapes"] = f"{check['shapes']} shapes, {check['mode']}, authored by Claude"
    proj.save()


def _render_round(doc: dict, round_dir: Path, views: dict, style: str) -> dict:
    """The three stills and the compare picture of a round, and the overlap per view."""
    st = get_style(style)
    stills = {}
    for d, vname in STILLS:
        r = shape_tools.still(doc, round_dir / f"still_{d}.png", direction=d, style=st, zoom=1, parts=False)
        stills[vname] = r["png"]
    out = {"stills": stills, "views": {}, "score": None, "compare": None}
    if views:
        cmp = M.compare(doc, None, round_dir / "compare.png", height=st.figure_height, paintings=views)
        out["views"] = {k: v["silhouette_iou"] for k, v in cmp["views"].items()}
        out["score"] = round(sum(out["views"].values()) / len(out["views"]), 3)
        out["compare"] = cmp["out"]
    return out


def _say(progress, log, words: str, round_no: int, done: int, total: int) -> None:
    if progress:
        progress(words, round_no, done, total)
    if log:
        log(words)


def _round_dirs(author_dir: Path) -> list[Path]:
    return sorted((p for p in author_dir.glob("round_*") if p.is_dir()), key=lambda p: int(p.name.split("_")[1]) if p.name.split("_")[1].isdigit() else 0)


def author(name: str | None, project: str | Path, *, painting: str | Path | None = None, sentence: str | None = None, rounds: int | None = None,
           target: float = 0.85, style: str = "godmarrow", note: str | None = None, timeout: float = ROUND_TIMEOUT, progress=None, log=None,
           dry_run: bool = False) -> dict:
    """The loop (the module's docstring). ``rounds`` defaults to 3 with a painting and 1 without (nothing to score against).
    A character that already has rounds carries on from the next number (the bench's "Another round", with ``note``).
    ``dry_run`` builds the first round's command and prompt and returns them without calling Claude."""
    t0 = time.time()
    get_style(style)
    if not painting and not sentence and not name:
        raise StepError("Give a painting (--painting) or a sentence (--sentence) to draw from.")
    key = name_for(name, painting, sentence)
    proj = _project(project, style)
    if key not in proj.characters:
        add_character(proj, key, sentence or (f"from the painting {Path(painting).name}" if painting else ""))
        proj = Project.load(proj.root)
    c = proj.character(key)
    if sentence:
        c.description = sentence
        proj.save()
    shapes_dir = proj.sub(key, "shapes")
    author_dir = proj.sub(key, "author")
    previews = proj.sub(key, "previews")
    if painting:
        painting_path = place_painting(proj, key, painting)
    else:
        kept = c.sources.get("painting")
        painting_path = (proj.root / kept) if kept and (proj.root / kept).exists() else None
    views = _views(painting_path)
    if rounds is None:
        rounds = 3 if painting_path else 1
    rounds = max(1, int(rounds))
    model = shapes_dir / f"{key}.shapes.json"
    script = shapes_dir / f"make_{key}_shapes.py"
    done_dirs = _round_dirs(author_dir)
    start = len(done_dirs) + 1
    history: list[dict] = []
    summary_file = author_dir / "author.json"
    if summary_file.exists():
        try:
            history = list(json.loads(summary_file.read_text(encoding="utf-8")).get("rounds", []))
        except (OSError, json.JSONDecodeError):
            history = []
    previous = history[-1] if history else None
    best = max((h for h in history if h.get("score") is not None), key=lambda h: h["score"], default=None)
    sys_prompt = PA.system_prompt(key, proj.root, shapes_dir, painting=painting_path, views=list(views) or None, sentence=sentence or (c.description or None), style=style)
    tools, allowed = CB.author_tools(shapes_dir)
    stopped = "rounds done"
    error = None
    since_better = 0
    total = start + rounds - 1
    for n in range(start, start + rounds):
        round_dir = author_dir / f"round_{n}"
        round_dir.mkdir(parents=True, exist_ok=True)
        text = PA.round_text(key, n, round_dir, painting=painting_path, sentence=sentence or c.description or None, previous=previous, note=note if n == start else None,
                             script_exists=script.exists())
        _say(progress, log, f"round {n} · " + ("drawing from the painting" if painting_path and n == 1 else "drawing from the words" if n == 1 else "another round"), n, n - 1, total)
        mock_vars = {"round": n, "name": key, "shapes_dir": str(shapes_dir), "round_dir": str(round_dir), "painting": str(painting_path or ""), "model": str(model), "script": str(script)}
        r = CB.run("author", proj.root, text, prompt=sys_prompt, on_progress=lambda w, n=n: _say(progress, log, f"round {n} · {w}", n, n - 1, total), timeout=timeout,
                   dry_run=dry_run, add_dirs=[str(shapes_dir)], snapshot_files=False, watch_dir=proj.char_dir(key), tools=tools, allowed=allowed, mock_vars=mock_vars,
                   log_name=f"author_{key}_round{n}")
        if dry_run:
            return {"ok": True, "dry_run": True, "character": key, "round": n, "command": r["command"], "system_prompt": r["system_prompt"], "text": text,
                    "tools": tools, "allowed": allowed, "shapes_dir": str(shapes_dir), "round_dir": str(round_dir), "painting": str(painting_path or "")}
        rec = {"round": n, "dir": str(round_dir), "seconds": r.get("seconds", 0), "cost_usd": r.get("cost_usd", 0), "log": r.get("log", ""),
               "did": r.get("did", []), "notes": r.get("notes", ""), "focus": (r.get("summary") or {}).get("focus", ""), "score": None, "views": {}, "stills": [], "compare": None}
        if not r.get("ok"):
            rec["error"] = r.get("error", "Claude stopped.")
            error = rec["error"]
            history.append(rec)
            _say(progress, log, f"round {n} · stopped: {error}", n, n, total)
            stopped = "claude stopped"
            break
        if not model.exists():
            rec["error"] = f"Round {n} left no model at {model}."
        else:
            check = shape_tools.validate_file(model)
            if not check["ok"]:
                rec["error"] = "The model has problems: " + "; ".join(check["problems"])
            else:
                rec["warnings"] = check.get("warnings", [])
                doc = S.load_shapes(model)
                rec["shapes"] = len(doc["shapes"])
                drawn = _render_round(doc, round_dir, views, style)
                rec.update({"score": drawn["score"], "views": drawn["views"], "stills": list(drawn["stills"].values()), "compare": drawn["compare"]})
                shutil.copy2(model, round_dir / model.name)
                rec["model"] = str(round_dir / model.name)
                for py in sorted(shapes_dir.glob("*.py")):
                    shutil.copy2(py, round_dir / py.name)
                    if py.name == script.name:
                        rec["script"] = str(round_dir / py.name)
                _adopt(proj, key, model, check)
                if best is None or (rec["score"] is not None and rec["score"] > best["score"]):
                    best = rec
                    since_better = 0
                    for d, _v in STILLS:
                        shutil.copy2(round_dir / f"still_{d}.png", previews / f"still_{d}.png")
                    if drawn["compare"]:
                        shutil.copy2(drawn["compare"], previews / "compare.png")
                else:
                    since_better += 1
        (round_dir / "round.json").write_text(json.dumps(rec, indent=1), encoding="utf-8")
        history.append(rec)
        previous = rec
        if rec.get("error"):
            since_better += 1
            _say(progress, log, f"round {n} · {rec['error']}", n, n, total)
        else:
            score_words = " · ".join(f"{k} {v:.2f}" for k, v in rec["views"].items()) if rec["views"] else f"{rec.get('shapes', 0)} shapes"
            _say(progress, log, f"round {n} · {score_words}" + (f" · {rec['focus']}" if rec.get("focus") else ""), n, n, total)
        if rec["score"] is not None and rec["score"] >= target:
            stopped = "target reached"
            break
        if since_better >= PATIENCE and n > start:
            stopped = "no improvement in two rounds"
            break
    summary = {"what": "author", "character": key, "painting": str(painting_path or ""), "views": list(views), "target": target, "style": style,
               "rounds": history, "best": best["round"] if best else None, "score": best["score"] if best else None, "stopped": stopped}
    author_dir.mkdir(parents=True, exist_ok=True)
    summary_file.write_text(json.dumps(summary, indent=1), encoding="utf-8")
    overlaps = best["views"] if best else {}
    out = {"ok": best is not None, "character": key, "name": key, "title": key.replace("_", " ").capitalize(), "model": str(model) if model.exists() else "",
           "painting": str(painting_path or ""), "views": list(views), "rounds": [{k: v for k, v in h.items() if k != "did"} for h in history], "best": best["round"] if best else None,
           "score": best["score"] if best else None, "overlap": overlaps, "target": target, "stopped": stopped, "judgement": judgement(overlaps) if overlaps else "",
           "still": str(previews / "still_S.png") if (previews / "still_S.png").exists() else "", "compare": str(previews / "compare.png") if (previews / "compare.png").exists() else "",
           "summary": str(summary_file), "project": str(proj.root), "style": style, "seconds": round(time.time() - t0, 1)}
    if not out["ok"]:
        out["error"] = error or (history[-1].get("error") if history else "No round produced a model.")
    return out
