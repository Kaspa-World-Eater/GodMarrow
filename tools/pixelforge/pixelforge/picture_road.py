"""The picture road: a Midjourney picture becomes a character in one go.

``pixelforge character from-picture PICTURE [PICTURE ...] --project P [--name N] [--style godmarrow] --json`` and
:func:`from_picture` do the whole road the Characters bench used to leave to a person with a terminal:

1. **read** the picture (or several: a sheet's views as separate files) and tell a single figure from a turnaround
   sheet (two or more figures of about one height side by side; :func:`pixelforge.sheet.split_sheet`);
2. **cut** the figure(s) out of the background into clean RGBA cutouts under the character's ``source/``;
3. **measure** the views (:func:`pixelforge.shape_measure.measure_views`);
4. **draft** a shape model from the picture's words sized by the measurements (:func:`pixelforge.describe.draft_shapes`
   with ``measure``); the name comes from ``--name`` or the file's name (Midjourney writes the prompt into it);
5. **sample materials** from the front view (:func:`pixelforge.shape_measure.sample_materials`);
6. **check** the file (problems stop the road, warnings are returned in plain words);
7. **import** the model into the project as a character (:func:`pixelforge.api.import_shapes`);
8. **draw** a still facing S and the compare picture (painting beside sprite per view with the silhouette overlap).

Everything is deterministic (the k-means is seeded) and takes a few seconds on a front view at the game's height.
:func:`redo` runs one of the later steps again on a character the road made (measure, sample, compare), for the
bench's "Measure again", "Sample materials again" and "Compare" choices. Every function returns a JSON-serialisable
dict; a step that cannot run raises :class:`pixelforge.api.StepError` with the fix in plain words.
"""
from __future__ import annotations

import json
import re
import shutil
import time
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

from . import shape_measure as M, shape_tools, shapes as S
from .api import StepError, add_character, import_shapes, new_project
from .project import Project, slugify
from .sheet import DEFAULT_NAMES, split_sheet
from .styles import get_style

STEPS = ["reading the picture", "cutting the figure", "measuring", "drafting", "sampling materials", "checking", "importing", "drawing"]
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}
SKIRT_WORDS = re.compile(r"\b(skirts?|robes?|gown|dress|kilt|tabard)\b")
HEX_TOKEN = re.compile(r"^[0-9a-f]{6,}$")


# ------------------------------------------------------------------------------------------------ words and names
def words_of(picture: str | Path) -> str:
    """The sentence a picture's file name carries. Midjourney names a download after its prompt
    (``name_a_hooded_necromancer_with_a_bone_staff_3f2a9c1e-....png``): the words, without the hash and the counters."""
    stem = Path(picture).name
    stem = stem[: -len(Path(stem).suffix)] if Path(stem).suffix.lower() in IMAGE_EXTS else stem
    stem = re.sub(r"\s*[\(\[]\d+[\)\]]\s*$", "", stem)           # " (1)" from a second download
    stem = re.sub(r"\s*-\s*copy\s*$", "", stem, flags=re.I)
    stem = re.sub(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", " ", stem.lower())   # the download's id
    tokens = [t for t in re.split(r"[^a-z0-9']+", stem) if t]
    words = [t for t in tokens if not HEX_TOKEN.match(t) and not t.isdigit() and len(t) < 24]
    if len(words) >= 3 and words[1] in ("a", "an", "the") and words[0] not in ("a", "an", "the"):
        words = words[1:]                                             # the account name before the prompt
    return " ".join(words)


def name_of(picture: str | Path, name: str | None = None) -> str:
    """The character's key: ``name`` slugified, else the picture's words (first six, so a Midjourney prompt does not
    become a forty-letter folder), else the file's stem."""
    if name:
        return slugify(name)
    words = words_of(picture).split()
    words = [w for w in words if w not in ("a", "an", "the", "of", "with", "and", "in", "on")] or words
    try:
        return slugify(" ".join(words[:6]))
    except ValueError:
        return slugify(Path(picture).stem) if re.search(r"[a-z0-9]", Path(picture).stem.lower()) else "figure"


# ------------------------------------------------------------------------------------------------ the views
def _open(picture: str | Path) -> Image.Image:
    p = Path(picture)
    if not p.exists():
        raise StepError(f"No picture at {p}.")
    try:
        im = Image.open(p)
        im.load()
    except (UnidentifiedImageError, OSError) as e:
        raise StepError(f"{p.name} is not a picture the Forge can read (PNG, JPG or WEBP): {e}") from None
    return im


def _figure(im: Image.Image, what: str, tolerance: float) -> np.ndarray:
    try:
        return M.figure_rgba(im, tolerance)
    except ValueError:
        raise StepError(f"No figure found in {what}: the picture needs a figure on a plain or transparent background.") from None


def cut_views(pictures: list[str | Path], tolerance: float = 0.08) -> tuple[dict[str, np.ndarray], str, list[str]]:
    """The picture's views as RGBA cutouts by name (front, side, back, ...), how they were found (``"sheet"``,
    ``"single"`` or ``"files"``) and the notes to pass on. Several files are the views in the order given; one file
    is a turnaround sheet when two or more figures of about one height stand side by side, else a single figure."""
    notes: list[str] = []
    if len(pictures) > 1:
        names = DEFAULT_NAMES.get(len(pictures), [f"view{i + 1}" for i in range(len(pictures))])
        views = {n: _figure(_open(p), Path(p).name, tolerance) for n, p in zip(names, pictures)}
        return views, "files", notes
    picture = pictures[0]
    im = _open(picture)
    rgba = np.asarray(im.convert("RGBA"))
    has_alpha = not (rgba[..., 3] > 127).all()
    rgb = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im.convert("RGBA")).convert("RGB") if has_alpha else im.convert("RGB")
    try:
        found = split_sheet(rgb, tolerance=tolerance)
    except Exception:  # noqa: BLE001 - a picture the splitter cannot read is read as one figure below
        found = []
    tallest = max((v.image.height for v in found), default=0)
    figures = [v for v in found if tallest and v.image.height >= 0.6 * tallest]
    if len(figures) >= 2 and len(figures) == len(found):
        names = DEFAULT_NAMES.get(len(figures), [f"view{i + 1}" for i in range(len(figures))])
        views = {}
        for n, v in zip(names, figures):
            try:
                views[n] = M.figure_rgba(v.image, tolerance)
            except ValueError:
                continue
        if len(views) >= 2:
            notes.append(f"A turnaround sheet: {len(views)} figures read as {', '.join(views)}.")
            return views, "sheet", notes
    if len(found) >= 2:
        notes.append(f"{len(found)} separate pieces found; read as one figure (a held thing or a label beside the body).")
    view = _figure(im, Path(picture).name, tolerance)
    notes.append("One figure: measured as the front view only; a side view would give the depth.")
    return {"front": view}, "single", notes


def _sample_height(front: np.ndarray) -> int:
    """The height the model is matched to the front view at for sampling: near the painting's own figure height so the
    regions land on the right pixels, between 160 (enough pixels under a material) and 320 (a render in a second)."""
    return int(min(max(front.shape[0], 160), 320))


# ------------------------------------------------------------------------------------------------ the judgement
def judgement(overlaps: dict[str, float]) -> str:
    """One honest line from the silhouette overlaps per view (intersection over union, 1 = the same outline)."""
    if not overlaps:
        return "No view to compare."
    parts = ", ".join(f"{k} {v:.2f}" for k, v in overlaps.items())
    mean = sum(overlaps.values()) / len(overlaps)
    if mean >= 0.78:
        verdict = "close to the painting"
    elif mean >= 0.62:
        verdict = "the right mass; the details want a hand"
    elif mean >= 0.45:
        verdict = "a rough start: the silhouette is some way from the painting"
    else:
        verdict = "far from the painting: check the cutout (is the figure alone, on a plain background?)"
    return f"Silhouette overlap {parts}: {verdict}."


def _plain_warnings(check: dict, sampled: dict, notes: list[str]) -> list[str]:
    out = list(notes)
    for w in check.get("warnings", []):
        out.append(str(w))
    for sk in sampled.get("skipped", []):
        name, _, why = str(sk).partition(": ")
        if "emissive" in why:
            continue
        out.append(f"No colour sampled for {name} ({why}); it keeps the library ramp.")
    if not sampled.get("materials"):
        out.append("No material took a colour from the painting: the model keeps the library ramps.")
    return out


# ------------------------------------------------------------------------------------------------ the road
def _say(progress, log, step: str, done: int, total: int) -> None:
    if progress:
        progress(step, done, total)
    if log:
        log(step)


def _project(project: str | Path, style: str) -> Project:
    root = Path(project)
    if not (root / "project.json").exists():
        root.mkdir(parents=True, exist_ok=True)
        new_project(root, root.name or "Forge", style)
    return Project.load(root)


def _draw(project: Project, name: str, doc: dict, views: dict[str, np.ndarray], style: str) -> dict:
    """The still facing S and the compare picture, into the character's ``previews/``; the overlaps and the line."""
    st = get_style(style)
    previews = project.sub(name, "previews")
    still = shape_tools.still(doc, previews / "still_S.png", direction="S", style=st, zoom=1)
    cmp = M.compare(doc, None, previews / "compare.png", height=st.figure_height, paintings=views)
    overlaps = {k: v["silhouette_iou"] for k, v in cmp["views"].items()}
    return {"still": still["png"], "anchor": still["anchor"], "lights": still["lights"], "compare": cmp["out"], "compare_size": cmp["size"],
            "overlap": overlaps, "judgement": judgement(overlaps)}


def from_picture(pictures: list[str | Path] | str | Path, project: str | Path, name: str | None = None, *, style: str = "godmarrow",
                 height: int = 120, text: str | None = None, tolerance: float = 0.08, progress=None, log=None) -> dict:
    """The whole road, picture to character (the module's docstring lists the steps). ``pictures`` is one file (a figure
    or a turnaround sheet) or several (the views in order: front, side, back). ``text`` is the costume sentence the
    draft reads; the picture's file name by default. ``progress(step, done, total)`` is told each step as it starts."""
    t0 = time.time()
    get_style(style)
    paths = [pictures] if isinstance(pictures, (str, Path)) else list(pictures)
    if not paths:
        raise StepError("No picture given.")
    total = len(STEPS)
    _say(progress, log, STEPS[0], 0, total)
    for p in paths:
        _open(p)
    key = name_of(paths[0], name)
    sentence = (text or words_of(paths[0]) or key.replace("_", " ")).strip()

    _say(progress, log, STEPS[1], 1, total)
    views, kind, notes = cut_views(paths, tolerance)
    proj = _project(project, style)
    replaced = key in proj.characters
    if not replaced:
        add_character(proj, key, sentence)
    c = proj.character(key)
    src = proj.sub(key, "source")
    cutouts = {}
    for vname, rgba in views.items():
        f = src / f"{vname}.png"
        Image.fromarray(rgba, "RGBA").save(f)
        cutouts[vname] = str(f)
        c.sources[vname] = str(f.relative_to(proj.root)).replace("\\", "/")
    picture_copy = src / ("sheet" + Path(paths[0]).suffix.lower() if kind == "sheet" else "picture" + Path(paths[0]).suffix.lower())
    shutil.copy(paths[0], picture_copy)
    c.sources["picture"] = str(picture_copy.relative_to(proj.root)).replace("\\", "/")
    c.notes["picture"] = str(Path(paths[0]).resolve())
    c.notes["picture_kind"] = kind
    if replaced:
        notes.append(f"The character {key} existed; its model was drafted again from the picture.")
    if views["front"].shape[0] < 64:
        notes.append(f"The figure is only {views['front'].shape[0]} px tall in the picture; a larger picture measures better.")

    _say(progress, log, STEPS[2], 2, total)
    measure_file = proj.sub(key, "shapes") / f"{key}.measure.json"
    m = M.measure_views(cutouts["front"], cutouts.get("side"), cutouts.get("back"), out=measure_file, tolerance=tolerance)

    _say(progress, log, STEPS[3], 3, total)
    from . import describe
    if m["landmarks"]["hem"].get("skirted") and not SKIRT_WORDS.search(sentence.lower()):
        sentence = sentence + ", in a long robe"
        notes.append("The painting's hem is as wide as the hips down to the ground: a long robe was added to the draft.")
    draft = describe.draft_shapes(sentence, height=height, measure=m)
    doc = draft["doc"]
    doc["name"] = key
    doc["about"] = f"Drafted from the picture {Path(paths[0]).name}: {sentence.strip()}. " + str(doc.get("about", "")).replace(f"Drafted from: {sentence.strip()}", "").strip()
    draft_file = src / f"{key}.draft.shapes.json"
    draft_file.write_text(json.dumps(doc, indent=1))
    _say(progress, log, f"drafting {len(doc['shapes'])} shapes", 3, total)

    _say(progress, log, STEPS[4], 4, total)
    sampled = M.sample_materials(cutouts["front"], doc, draft_file, height=_sample_height(views["front"]), tolerance=tolerance)

    _say(progress, log, STEPS[5], 5, total)
    check = shape_tools.validate_file(draft_file)
    if not check["ok"]:
        raise StepError("The drafted model has problems: " + "; ".join(check["problems"]))
    warnings = _plain_warnings(check, sampled, notes)

    _say(progress, log, STEPS[6], 6, total)
    imported = import_shapes(proj, key, draft_file)
    proj = Project.load(proj.root)          # import_shapes saved the project; keep one view of it
    c = proj.character(key)
    c.description = sentence
    c.notes["picture_road"] = f"drafted {len(doc['shapes'])} shapes from {kind}"
    proj.save()
    doc = S.load_shapes(imported["file"])

    _say(progress, log, STEPS[7], 7, total)
    drawn = _draw(proj, key, doc, views, style)
    _say(progress, log, "done", total, total)
    return {"ok": True, "character": key, "name": key, "title": key.replace("_", " ").capitalize(), "model": imported["file"], "measure": str(measure_file),
            "picture": str(Path(paths[0]).resolve()), "kind": kind, "views": list(views), "cutouts": cutouts, "sentence": sentence, "read": draft["read"],
            "shapes": len(doc["shapes"]), "materials": sampled["materials"], "warnings": warnings, "project": str(proj.root), "style": style,
            "seconds": round(time.time() - t0, 1), **drawn}


# ------------------------------------------------------------------------------------------------ again
def _views_of_character(proj: Project, c) -> dict[str, np.ndarray]:
    views = {}
    for vname in ("front", "quarter", "side", "back"):
        rel = c.sources.get(vname)
        if rel and (proj.root / rel).exists():
            views[vname] = np.asarray(Image.open(proj.root / rel).convert("RGBA"))
    if "front" not in views:
        raise StepError(f"{c.name} has no front view cutout under source/; drop its picture again.")
    return views


def redo(project: str | Path, name: str, step: str, *, style: str | None = None, progress=None, log=None) -> dict:
    """One step of the road again on a character it made: ``measure`` (the saved cutouts measured again and the model's
    rings and limbs sized from them), ``sample`` (the front view's colours into the model's ramps again) or
    ``compare`` (only the pictures). Each ends with the still and the compare picture, like the road."""
    if step not in ("measure", "sample", "compare"):
        raise StepError(f"the step is measure, sample or compare, not {step!r}")
    if not (Path(project) / "project.json").exists():
        raise StepError(f"No project at {project}: drop a picture first; the road makes the project.")
    proj = Project.load(project)
    try:
        c = proj.character(name)
    except KeyError:
        raise StepError(f"No character {name} in the project.") from None
    model = proj.root / (c.sources.get("shapes") or "")
    if not c.sources.get("shapes") or not model.exists():
        raise StepError(f"{name} has no shape model yet; drop a picture or a model on the bench.")
    style = style or c.settings.get("style") or proj.style
    get_style(style)
    views = _views_of_character(proj, c)
    doc = S.load_shapes(model)
    total = 3
    warnings: list[str] = []
    if step == "measure":
        _say(progress, log, "measuring", 0, total)
        cutouts = {k: str(proj.root / c.sources[k]) for k in views}
        m = M.measure_views(cutouts["front"], cutouts.get("side"), cutouts.get("back"), out=proj.sub(c.name, "shapes") / f"{c.name}.measure.json")
        if "head" not in {s.get("name") for s in doc["shapes"]}:
            warnings.append("The model's shapes are not the draft's (no shape named head): nothing was resized.")
        doc["about"] = re.sub(r"\s*Sized from measurements \([^)]*\)\.", "", str(doc.get("about", "")))
        M.apply_measurements(doc, m)
    elif step == "sample":
        _say(progress, log, "sampling materials", 0, total)
        sampled = M.sample_materials(str(proj.root / c.sources["front"]), doc, None, height=_sample_height(views["front"]))
        warnings = _plain_warnings({}, sampled, [])
    if step != "compare":
        _say(progress, log, "checking", 1, total)
        problems = S.validate(doc)
        if problems:
            raise StepError("The model has problems after the change: " + "; ".join(problems))
        keep = {k: v for k, v in doc.items() if not k.startswith("_")}
        model.write_text(json.dumps(keep, indent=1))
        doc = S.load_shapes(model)
    _say(progress, log, "drawing", 2, total)
    drawn = _draw(proj, c.name, doc, views, style)
    _say(progress, log, "done", total, total)
    return {"ok": True, "character": c.name, "step": step, "model": str(model), "views": list(views), "shapes": len(doc["shapes"]), "warnings": warnings,
            "style": style, **drawn}
