"""The pipeline as plain functions.

Every function takes a :class:`Project` (+ a character name), does one step,
records the result in ``project.json`` and returns a JSON-serialisable dict.
The desktop app, the ``pixelforge project`` commands and the MCP server are all
thin wrappers over this module, so anything a person can click, an AI can run.
"""

from __future__ import annotations

import glob
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from . import cleanup
from . import godot as godot_export
from .animate import PRESETS, animate
from .checks import check_frames, check_spec, check_views
from .model_spec import synthesize_top, transpose_image, build_hull_spec, build_spec, write_spec
from .palette import Palette
from .pixelate import PixelateOptions, clip_lightness_reference, grading, pixelate, pixelate_frames
from .project import DIRECTIONS_8, SOURCE_KINDS, Character, Project, slugify
from .rig import estimate_skeleton, write_skeleton
from .prompts import PROMPT_KINDS, RULES, build_all
from .sheet import cutout, normalize_heights, split_sheet
from .spritesheet import pack, save_gif
from .styles import STYLES, DEFAULT_STYLE, Style, get_style, options_for_style, style_table
from . import puppet as puppet_mod

BLENDER_DIR = Path(__file__).parent / "blender"


class StepError(RuntimeError):
    """A step could not run; the message tells the person/AI what to do."""


# ------------------------------------------------------------------ projects
def new_project(root: str | Path, name: str, style: str = "hd") -> dict:
    get_style(style)
    p = Project.create(root, name, style=style)
    return {"ok": True, "project": str(p.file), **p.summary()}


def open_project(path: str | Path) -> Project:
    return Project.load(path)


def status(project: Project) -> dict:
    return {"ok": True, **project.summary(), "blender_found": find_blender(project) is not None}


def configure(project: Project, **fields) -> dict:
    for k, v in fields.items():
        if v is None:
            continue
        if not hasattr(project, k) or k in ("characters", "root"):
            raise StepError(f"unknown setting {k!r}")
        if k == "style":
            get_style(v)
        setattr(project, k, type(getattr(project, k))(v))
    project.save()
    return status(project)


# ------------------------------------------------------------------- looks
def list_styles() -> dict:
    """Every look preset with its numbers (looks first, then the older size tiers)."""
    return {"ok": True, "default": DEFAULT_STYLE, "looks": [k for k, v in STYLES.items() if v.group == "look"], "styles": style_table()}


def set_style(project: Project, style: str, character: str | None = None) -> dict:
    """Make ``style`` the project's look, or one character's own (``character``); ``"project"`` as a character's
    style takes the character back to the project's. Every later step (palette, render, pixelate, export, effects,
    tiles) reads its numbers from it; steps already run keep their files until they are run again."""
    if character:
        c = project.character(character)
        if style in ("", "project", None):
            c.settings.pop("style", None)
            st = get_style(project.style)
        else:
            st = get_style(style)
            c.settings["style"] = st.name
        project.save()
        return {"ok": True, "scope": "character", "character": c.name, "style": st.as_dict(),
                "next": "run palette, pixelate and export again for this character to take the new look"}
    st = get_style(style)
    project.style = st.name
    project.save()
    return {"ok": True, "scope": "project", "style": st.as_dict(),
            "next": "run palette, pixelate and export again for every character to take the new look"}


def style_of(project: Project, character: str | Character | None = None) -> Style:
    """The preset a character works in (its own, else the project's)."""
    if character is None:
        return get_style(project.style)
    c = character if isinstance(character, Character) else project.character(character)
    return get_style(c.settings.get("style", project.style))


# ---------------------------------------------------------------- characters
def add_character(project: Project, name: str, description: str = "") -> dict:
    key = slugify(name)
    if key in project.characters:
        raise StepError(f"character {key!r} already exists")
    project.characters[key] = Character(name=key, description=description)
    project.sub(key, "source")
    project.save()
    return {"ok": True, "character": key, "next": "prompts"}


def set_description(project: Project, name: str, description: str) -> dict:
    c = project.character(name)
    c.description = description.strip()
    c.done["prompts"] = bool(c.description)
    project.save()
    return get_prompts(project, name)


def get_prompts(project: Project, name: str, reference: str = "[SHEET IMAGE URL]") -> dict:
    c = project.character(name)
    prompts = build_all(c.description, reference)
    return {
        "ok": True,
        "character": c.name,
        "description": c.description,
        "prompts": [
            {"key": k.key, "title": k.title, "purpose": k.purpose, "prompt": prompts[k.key], "needs_reference": k.needs_reference}
            for k in PROMPT_KINDS
        ],
        "rules": RULES,
        "next": "import",
    }


def import_source(project: Project, name: str, kind: str, path: str | Path) -> dict:
    if kind not in SOURCE_KINDS:
        raise StepError(f"kind must be one of {SOURCE_KINDS}")
    c = project.character(name)
    src = Path(path)
    if not src.exists():
        raise StepError(f"file not found: {src}")
    dest = project.sub(c.name, "source") / f"{kind}.png"
    Image.open(src).convert("RGBA").save(dest)
    c.sources[kind] = str(dest.relative_to(project.root)).replace(os.sep, "/")
    c.done["import"] = "sheet" in c.sources or "front" in c.sources or "style" in c.sources
    project.save()
    return {"ok": True, "character": c.name, "kind": kind, "saved": str(dest), "sources": c.sources, "next": "split"}


def _count_figures(project: Project, c: Character, tolerance: float) -> int:
    """3 or 4 figures on the sheet? Count the separate blobs, capped to 4."""
    sheet = _source(project, c, "sheet")
    if sheet is None:
        return 3
    views = split_sheet(Image.open(sheet), tolerance=tolerance)
    return 4 if len(views) >= 4 else 3


def _source(project: Project, c: Character, kind: str) -> Path | None:
    rel = c.sources.get(kind)
    return project.root / rel if rel else None


# --------------------------------------------------------------------- split
def split(project: Project, name: str, tolerance: float = 0.08, expected_views: int | None = None) -> dict:
    """Cut the sheet (or the single front/back/side images) into view cutouts."""
    c = project.character(name)
    if expected_views is None:
        expected_views = int(c.settings.get("sheet_views", 0)) or _count_figures(project, c, tolerance)
    views_dir = project.sub(c.name, "views")
    made: dict[str, str] = {}
    sheet = _source(project, c, "sheet")
    if sheet is not None:
        sheet_im = Image.open(sheet).convert("RGB")
        views = normalize_heights(split_sheet(sheet_im, tolerance=tolerance, expected=4 if expected_views == 4 else 3))
        if not views:
            raise StepError("no figures found on the sheet; is the background plain (one flat colour)? Try a higher tolerance, or import the views one by one.")
        for v in views:
            out = views_dir / f"{v.name}.png"
            rgba_v = cleanup.remove_background_pockets(cleanup.drop_floor_shadow(np.asarray(v.image.convert("RGBA"))))
            rgba_v[..., 3] = cleanup.remove_islands(rgba_v[..., 3], min_fraction=0.0015)   # fringe specks would float as voxels
            rgba_v = cleanup.unmix_background(rgba_v, (255, 255, 255))   # no pale rim: the edge keeps the paint, not the white
            rgba_v = cleanup.fill_bright_specks(rgba_v)   # white pokes through a dark hem: paint it the hem's colour
            Image.fromarray(rgba_v, "RGBA").save(out)
            made[v.name] = str(out)
            # the raw crop, for the manual cutout editor's Restore brush
            sheet_im.crop(v.box).resize(v.image.size, Image.LANCZOS).save(views_dir / f"{v.name}_raw.png")
    plan = _source(project, c, "topbottom")   # the optional second sheet: plan view and underside, side by side
    if plan is not None:
        plan_im = Image.open(plan).convert("RGB")
        pv = split_sheet(plan_im, names=["top", "bottom"], tolerance=tolerance, expected=2)
        for v in pv[:2]:
            rgba_v = cleanup.remove_background_pockets(np.asarray(v.image.convert("RGBA")))
            rgba_v[..., 3] = cleanup.remove_islands(rgba_v[..., 3], min_fraction=0.0015)
            rgba_v = cleanup.unmix_background(rgba_v, (255, 255, 255))
            out = views_dir / f"{v.name}.png"
            Image.fromarray(rgba_v, "RGBA").save(out)
            made[v.name] = str(out)
    # single views override the sheet's crops when supplied (they are higher-res)
    for kind in ("front", "back", "side", "quarter", "top", "bottom"):
        single = _source(project, c, kind)
        if single is not None:
            src = Image.open(single).convert("RGB")
            rgba = cutout(src, tolerance)
            ys, xs = np.nonzero(rgba[..., 3])
            if len(ys):
                box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
                rgba = rgba[box[1] : box[3], box[0] : box[2]]
                src.crop(box).save(views_dir / f"{kind}_raw.png")
            out = views_dir / f"{kind}.png"
            Image.fromarray(np.ascontiguousarray(rgba), "RGBA").save(out)
            made[kind] = str(out)
    if not made:
        raise StepError("import a sheet or a front image first")
    if "front" not in made:
        raise StepError(f"could not identify a front view (found {sorted(made)}); import a front image")
    c.settings["tolerance"] = float(tolerance)
    c.done["split"] = True
    c.notes["split"] = f"views: {', '.join(sorted(made))}"
    chk = check_views(views_dir)
    c.notes["split_check"] = "cutouts clean" if chk["ok"] else "; ".join(chk["issues"])
    project.save()
    return {"ok": True, "character": c.name, "views": made, "check": chk, "next": "palette"}


def preview_gif(project: Project, name: str, clip: str = "walk", direction: str = "S", source: str = "auto", zoom: int = 3) -> dict:
    """A looping GIF of one clip from one direction, from the pixel frames when they exist, else the renders.
    Written to ``previews/<clip>_<dir>.gif`` so a person can judge the motion without opening folders."""
    from .spritesheet import save_gif

    c = project.character(name)
    roots = []
    if source in ("auto", "frames"):
        roots.append(project.sub(c.name, "frames"))
    if source in ("auto", "renders"):
        roots.append(project.sub(c.name, "renders"))
    for root in roots:
        d = root / f"{clip}_{direction}" if root.name == "frames" else root / clip / direction
        files = sorted(d.glob("frame_*.png"))
        if files:
            out = project.sub(c.name, "previews") / f"{clip}_{direction}.gif"
            out.parent.mkdir(parents=True, exist_ok=True)
            fps = 10.0
            aj = project.sub(c.name, "frames") / "animations.json"
            if aj.exists():
                fps = float(json.loads(aj.read_text()).get("fps", fps))
            save_gif([Image.open(f).convert("RGBA") for f in files], out, fps=fps, zoom=zoom if root.name == "frames" else 1)
            return {"ok": True, "gif": str(out), "frames": len(files), "source": root.name}
    raise StepError(f"no frames for {clip} facing {direction} yet; render first")


# ------------------------------------------------------------------- palette
def make_palette(project: Project, name: str, colors: int | None = None) -> dict:
    c = project.character(name)
    st = style_of(project, c)
    n = st.colors if colors is None else colors
    style_img = _source(project, c, "style")
    sources = []
    if style_img is not None:
        sources.append(np.asarray(Image.open(style_img).convert("RGBA")))
    for v in sorted(project.sub(c.name, "views").glob("*.png")):
        if v.stem.endswith("_raw"):
            continue
        sources.append(np.asarray(Image.open(v).convert("RGBA")))
    if not sources:
        raise StepError("nothing to build a palette from; import a style image or run split")
    px = np.concatenate([s.reshape(-1, 4) for s in sources])
    px = px[px[:, 3] > 127][:, :3]
    pal = Palette.from_image(px[None], n_colors=n)
    out = project.char_dir(c.name) / "palette.hex"
    pal.save(out)
    pal.swatch(16).save(out.with_suffix(".png"))
    c.done["palette"] = True
    c.notes["palette"] = (f"{len(pal)} colours locked from {'the style image + ' if style_img else ''}the views" if n
                          else f"every colour kept (style '{st.name}'); reference built from {'the style image + ' if style_img else ''}the views")
    project.save()
    return {"ok": True, "character": c.name, "palette": str(out), "colors": len(pal), "next": "model"}


# ------------------------------------------------------------------- blender
WINDOWS_BLENDER_GLOBS = [
    r"C:\Program Files\Blender Foundation\Blender *\blender.exe",
    r"C:\Program Files\Blender Foundation\Blender\blender.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Blender Foundation\Blender *\blender.exe"),
    r"C:\Program Files\WindowsApps\BlenderFoundation.Blender*\Blender\blender.exe",
]


BLENDER_VERSION = "4.2.23"   # the LTS the Forge is tested with (4.2+ and 5.x both work)
PORTABLE_BLENDER_DIR = Path(__file__).resolve().parent.parent / "blender_portable"


def _blender_download_url() -> tuple[str, str]:
    import platform

    base = f"https://download.blender.org/release/Blender{BLENDER_VERSION.rsplit('.', 1)[0]}/"
    if sys.platform.startswith("win"):
        return base + f"blender-{BLENDER_VERSION}-windows-x64.zip", "zip"
    if sys.platform == "darwin":
        arch = "arm64" if platform.machine() == "arm64" else "x64"
        return base + f"blender-{BLENDER_VERSION}-macos-{arch}.dmg", "dmg"
    return base + f"blender-{BLENDER_VERSION}-linux-x64.tar.xz", "tar.xz"


def download_blender(project: Project | None = None, log=None, dest: str | Path | None = None) -> dict:
    """Fetch the portable Blender (about 380 MB, no installer) into ``blender_portable/`` next to the
    package and point the project at it. Windows and Linux; on macOS it points at the .dmg to open."""
    import tarfile
    import urllib.request
    import zipfile

    url, kind = _blender_download_url()
    dest = Path(dest) if dest else PORTABLE_BLENDER_DIR
    dest.mkdir(parents=True, exist_ok=True)
    archive = dest / url.rsplit("/", 1)[-1]
    say = log or (lambda m: None)
    if not archive.exists():
        say(f"Downloading Blender {BLENDER_VERSION} ({url}) ...")
        with urllib.request.urlopen(url) as r, open(archive, "wb") as f:
            total = int(r.headers.get("Content-Length") or 0)
            done = 0
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
                done += len(chunk)
                if total and done % (20 << 20) < (1 << 20):
                    say(f"  {done // (1 << 20)} / {total // (1 << 20)} MB")
    if kind == "dmg":
        return {"ok": False, "archive": str(archive), "message": "Open the .dmg, drag Blender to Applications, then Settings finds it."}
    say("Unpacking ...")
    if kind == "zip":
        with zipfile.ZipFile(archive) as z:
            z.extractall(dest)
    else:
        with tarfile.open(archive) as t:
            t.extractall(dest)
    exe = next(iter(sorted(dest.glob("blender-*/blender.exe")) + sorted(dest.glob("blender-*/blender"))), None)
    if exe is None:
        raise StepError(f"downloaded Blender but found no executable under {dest}")
    if project is not None:
        project.blender = str(exe)
        project.save()
    say(f"Blender ready: {exe}")
    return {"ok": True, "blender": str(exe)}


def find_blender(project: Project | None = None) -> str | None:
    if project and project.blender and Path(project.blender).exists():
        return project.blender
    portable = sorted(PORTABLE_BLENDER_DIR.glob("blender-*/blender.exe")) + sorted(PORTABLE_BLENDER_DIR.glob("blender-*/blender"))
    if portable:
        return str(portable[-1])
    for cand in ("blender", "blender.exe"):
        found = shutil.which(cand)
        if found:
            return found
    for pattern in WINDOWS_BLENDER_GLOBS:
        hits = sorted(glob.glob(pattern))
        if hits:
            return hits[-1]
    for mac in ("/Applications/Blender.app/Contents/MacOS/Blender",):
        if Path(mac).exists():
            return mac
    return None


def run_blender(project: Project, script: str, args: list[str], blend: str | None = None, log=None) -> str:
    exe = find_blender(project)
    if exe is None:
        raise StepError(
            "Blender was not found. In the Studio, step 5 has a 'Download Blender for me' button (380 MB, no installer); "
            "or install it from blender.org, or set the path in Settings "
            "(`pixelforge project set --blender \"C:\\...\\blender.exe\"`, or `pixelforge project blender-download`)."
        )
    cmd = [exe, "-b"]
    if blend:
        cmd.append(str(blend))
    cmd += ["--python", str(BLENDER_DIR / script), "--", *map(str, args)]
    if log:
        log("$ " + " ".join(f'"{c}"' if " " in c else c for c in cmd))
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
    lines = []
    for line in proc.stdout:  # type: ignore[union-attr]
        line = line.rstrip()
        lines.append(line)
        if log and (line.startswith("PF_") or "Error" in line or "Traceback" in line):
            log(line)
    proc.wait()
    ok = [l for l in lines if l.startswith("PF_OK") or l.startswith("PF_FALLBACK")]
    if proc.returncode != 0 or not ok:
        tail = "\n".join(lines[-25:])
        raise StepError(f"Blender failed (exit {proc.returncode}):\n{tail}")
    return ok[-1]


def model_textures(project: Project, c: Character, orient: dict | None = None) -> dict[str, Path]:
    """Edge-padded copies of the view cutouts, for use as 3D textures."""
    views = project.sub(c.name, "views")
    out = {}
    orient = orient or {}
    for kind in ("front", "back", "side", "quarter", "top", "bottom"):
        src = views / f"{kind}.png"
        if src.exists():
            tex = project.sub(c.name, "model") / f"tex_{kind}.png"
            k = int(orient.get(kind, {}).get("transpose", 0))
            if not tex.exists() or tex.stat().st_mtime < src.stat().st_mtime or k:
                im = transpose_image(Image.open(src).convert("RGBA"), k)   # the plan views turned the way the carve matched them
                rgba = cleanup.bleed_edges(np.asarray(im))
                Image.fromarray(rgba, "RGBA").save(tex)
            out[kind] = tex
    return out


def build_model(project: Project, name: str, height: float = 1.8, columns: int = 64, thickness: float | None = None, log=None) -> dict:
    """Front (+side) cutout -> inflated-cutout mesh painted with the art -> .blend + .fbx."""
    c = project.character(name)
    views = project.sub(c.name, "views")
    front = views / "front.png"
    if not front.exists():
        raise StepError("run split first (no views/front.png)")
    side = views / "side.png"
    back = views / "back.png"
    quarter = views / "quarter.png"
    if side.exists():
        # carve a proper 3D shape from the front + side (+ back, + three-quarter) silhouettes
        top, bottom = views / "top.png", views / "bottom.png"
        spec = build_hull_spec(Image.open(front), Image.open(side), Image.open(back) if back.exists() else None,
                               Image.open(quarter) if quarter.exists() else None, columns=columns,
                               depth_scale=float(c.settings.get("depth_scale", 0.8)), fit=float(c.settings.get("fit", 2.6)),
                               top=Image.open(top) if top.exists() else None, bottom=Image.open(bottom) if bottom.exists() else None)
    else:
        spec = build_spec(Image.open(front), None, columns=columns, thickness=thickness)
        spec["thickness"] = float(min(spec["thickness"], 0.3))
    model_dir = project.sub(c.name, "model")
    spec_path = write_spec(spec, model_dir / f"{c.name}_spec.json")
    blend = model_dir / f"{c.name}.blend"
    fbx = model_dir / f"{c.name}.fbx"
    tex = model_textures(project, c, spec.get("orient"))
    if "top" not in tex and spec.get("mode") == "hull":
        # no plan view painted: make the top from the front view (topmost paint per column, hat cones revolved)
        synth = project.sub(c.name, "model") / "tex_top.png"
        synthesize_top(Image.open(front), spec).save(synth)
        tex["top"] = synth
    args = ["--spec", spec_path, "--front", tex["front"], "--height", height, "--name", c.name, "--out", blend, "--fbx", fbx]
    for kind in ("back", "side", "quarter", "top", "bottom"):
        if kind in tex:
            args += [f"--{kind}", tex[kind]]
    shade = c.settings.get("shade", 0.0)
    if shade:
        args += ["--shade", shade]
    args += ["--relief", c.settings.get("relief", 0.35)]
    # humanoid first: fit the library mannequin to the painting (clean limbs, the clips play directly);
    # the carved hull is the fallback for robes/skirts (no legs in the silhouette) or model_mode = "hull"
    mode = c.settings.get("model_mode", "auto")   # auto | template | hull
    result = ""
    if spec.get("mode") == "hull" and mode != "hull" and ANIMATION_LIBRARY.exists():
        t_args = ["--library", ANIMATION_LIBRARY, *args] + (["--force"] if mode == "template" else [])
        result = run_blender(project, "fit_template.py", t_args, log=log)
    if result.startswith("PF_OK"):
        c.notes["model_mode"] = "template"
    else:
        if result:
            (log or (lambda m: None))(result)
        result = run_blender(project, "build_mesh.py", args, log=log)
        c.notes["model_mode"] = "hull"
    c.done["model"] = True
    c.notes["model"] = result
    chk = check_spec(spec)
    c.notes["model_check"] = "carve clean" if chk["ok"] else "; ".join(chk["issues"])
    c.notes["model_note"] = ("Built: a real human figure fitted to the painting." if c.notes["model_mode"] == "template"
                             else "Built: a carved shape (the silhouette shows no legs, so the human fit was skipped).")
    project.save()
    return {
        "ok": True,
        "character": c.name,
        "spec": str(spec_path),
        "blend": str(blend),
        "fbx": str(fbx),
        "next": "rig",
        "instructions": (
            "Next, the rig step adds a skeleton and the built-in animations automatically. "
            f"(Optional upgrade: upload {fbx.name} to mixamo.com for motion-capture animations and put the "
            f"downloaded FBX files in {project.char_dir(c.name) / 'mixamo'} before running rig.)"
        ),
    }


DEFAULT_CLIPS = "idle,walk,run,attack,punch,cast,hit,death,roll"  # the game set: atk, atk2(punch), dodge(roll)
ANIMATION_LIBRARY = Path(__file__).resolve().parent.parent / "assets" / "animations" / "quaternius_ual_standard.glb"


def rig(project: Project, name: str, clips: str = DEFAULT_CLIPS, library: str | Path | None = None, log=None) -> dict:
    """Rig + animate. Uses Mixamo FBX files if the person dropped any in
    ``mixamo/``; otherwise the built-in auto-rig with the bundled CC0 motion
    library (procedural clips as fallback for anything the library lacks)."""
    c = project.character(name)
    mix = project.char_dir(c.name) / "mixamo"
    if mix.exists() and (list(mix.glob("*.fbx")) or list(mix.glob("*.FBX"))):
        return import_mixamo(project, name, log=log)
    model = project.sub(c.name, "model")
    blend = model / f"{c.name}.blend"
    if not blend.exists():
        raise StepError("no model yet; run the model step")
    front = project.sub(c.name, "views") / "front.png"
    skel = write_skeleton(estimate_skeleton(Image.open(front)), model / f"{c.name}_skeleton.json")
    out = model / f"{c.name}_rigged.blend"
    lib = Path(library) if library else (ANIMATION_LIBRARY if ANIMATION_LIBRARY.exists() else None)
    args = ["--skeleton", skel, "--out", out, "--clips", clips]
    if c.notes.get("model_mode") == "template":
        args += ["--template"]   # the fitted mannequin keeps its own rig and takes the clips directly
    elif lib is not None:
        args += ["--library", lib]
    for spec in c.settings.get("clip_overrides", []):  # e.g. "walk=Walk_Formal_Loop:loop"
        args += ["--clip", spec]
    result = run_blender(project, "rig_character.py", args, blend=blend, log=log)
    actions = result.split("actions=")[-1].split(" ")[0].split(",") if "actions=" in result else []
    actions = [a for a in actions if a]
    source = "fitted mannequin, library clips direct" if c.notes.get("model_mode") == "template" else ("motion library" if lib is not None else "procedural")
    c.done["rig"] = True
    c.notes["rig"] = f"built-in rig ({source}), {len(actions)} animations: {', '.join(actions)}"
    project.save()
    return {"ok": True, "character": c.name, "blend": str(out), "animations": actions, "source": source, "next": "render"}


def import_mixamo(project: Project, name: str, depth_scale: float | None = None, log=None) -> dict:
    c = project.character(name)
    mix = project.sub(c.name, "mixamo")
    files = sorted(mix.glob("*.fbx")) + sorted(mix.glob("*.FBX"))
    if not files:
        raise StepError(f"no .fbx files in {mix}; download them from Mixamo first")
    tex = model_textures(project, c)
    if "front" not in tex:
        raise StepError("run split first (no views/front.png)")
    out = project.sub(c.name, "model") / f"{c.name}_rigged.blend"
    args = ["--fbx", *files, "--front", tex["front"], "--out", out]
    for kind in ("back", "side"):
        if kind in tex:
            args += [f"--{kind}", tex[kind]]
    if depth_scale:
        args += ["--depth-scale", depth_scale]
    result = run_blender(project, "import_animations.py", args, log=log)
    actions = result.split("actions=")[-1].split(",") if "actions=" in result else []
    c.done["rig"] = True
    c.notes["rig"] = f"{len(actions)} animations: {', '.join(actions)}"
    project.save()
    return {"ok": True, "character": c.name, "blend": str(out), "animations": actions, "next": "render"}


def render(project: Project, name: str, actions: list[str] | None = None, step: int = 2, elevation: float = 30.0, ppu: float | None = None, passes: str | None = None, per_clip: int | None = None, log=None) -> dict:
    """``per_clip`` = N evenly spaced frames per clip. The game keeps every rendered frame (up to 24 a clip) and plays
    the clip at its real length, so 24 gives smooth motion (a walk at about 14 frames a second) and 12 a quick,
    choppier look while iterating. Default: the character/project setting, else 24 for the godmarrow style, else 0
    (= --step)."""
    c = project.character(name)
    model = project.sub(c.name, "model")
    blend = model / f"{c.name}_rigged.blend"
    if not blend.exists():
        blend = model / f"{c.name}.blend"
        if not blend.exists():
            raise StepError("no model yet; run the model step (and the rig step for animations)")
    out = project.sub(c.name, "renders")
    if per_clip is None:
        per_clip = int(c.settings.get("per_clip", 0) or project_setting(project, "per_clip", 0) or style_of(project, c).clip_frames)
    args = ["--out", out, "--directions", project.directions, "--size", project.render_size, "--elevation", elevation, "--step", step, "--per-clip", per_clip]
    if actions:
        args += ["--actions", ",".join(actions)]
    passes = passes or c.settings.get("passes") or project_setting(project, "passes", "color")
    args += ["--passes", passes]
    ppu = ppu or c.settings.get("ppu") or _shared_ppu(project)
    if ppu:
        args += ["--ppu", ppu]
    result = run_blender(project, "render_sprites.py", args, blend=blend, log=log)
    manifest = json.loads((out / "manifest.json").read_text())
    c.settings["ppu"] = manifest["ppu"]
    c.done["render"] = True
    c.notes["render"] = f"{sum(a['frames'] for a in manifest['actions'].values())} frames x {len(manifest['directions'])} directions"
    chk = check_frames(out)
    c.notes["render_check"] = "frames clean" if chk["ok"] else "; ".join(chk["issues"])
    project.save()
    return {"ok": True, "character": c.name, "renders": str(out), "manifest": manifest, "check": chk, "next": "pixelate"}


def project_setting(project: Project, key: str, default):
    return getattr(project, key, None) or default


def _shared_ppu(project: Project) -> float | None:
    """Pixels-per-unit already used by another character, so all share one scale."""
    for other in project.characters.values():
        if other.settings.get("ppu"):
            return float(other.settings["ppu"])
    return None


# ------------------------------------------------------------------ pixelate
def _options_for(project: Project, c: Character, **overrides) -> PixelateOptions:
    """The character's preset as pixelate options: figure height, palette (the locked ``palette.hex`` when the preset
    locks one), dither, outline, shading bands, grade and edge; ``overrides`` win (``outline="style"`` = the preset's,
    ``None`` = none)."""
    st = style_of(project, c)
    pal_file = project.char_dir(c.name) / "palette.hex"
    colors = overrides.get("colors")
    colors = st.colors if colors is None else colors
    if "palette" not in overrides:
        overrides["palette"] = Palette.load(pal_file) if (pal_file.exists() and colors > 0 and st.palette_lock) else None
    overrides["colors"] = colors
    return options_for_style(st, **overrides)


def pixelate_renders(project: Project, name: str, outline: str | None = "style", log=None) -> dict:
    """Every rendered frame -> pixel frames in the character's look. ``outline``: ``"style"`` (the preset's rule),
    ``None`` (none), ``"auto"`` (the darkest palette colour) or a hex colour."""
    c = project.character(name)
    renders = project.sub(c.name, "renders")
    manifest_file = renders / "manifest.json"
    if not manifest_file.exists():
        raise StepError("no renders yet; run the render step")
    manifest = json.loads(manifest_file.read_text())
    st = style_of(project, c)
    # the preset's figure height is the CHARACTER's standing height in sprite px: derive the
    # render-px-per-sprite-px scale from the model's height as the camera sees it
    import math as _m

    if "ppu" in manifest:
        stand_px = (manifest.get("z_max", 1.8) - manifest.get("z_min", 0.0)) * manifest["ppu"] * _m.cos(_m.radians(manifest.get("elevation", 30.0)))
        scale = max(stand_px, 1.0) / st.max_size  # source px per sprite px, same for every frame
    else:  # older manifests: size the frame instead
        scale = manifest["size"] / st.max_size
    frames_dir = project.sub(c.name, "frames")
    opts = _options_for(project, c, outline=outline)
    opts.scale = scale
    clips = [(action, d, sorted((renders / action / d).glob("frame_*.png"))) for action in manifest["actions"] for d in manifest["directions"]]
    clips = [(a, d, src) for a, d, src in clips if src]
    if grading(opts) and opts.grade_ref is None and clips:
        # a graded or banded look measures its lightness anchors once for the whole character (the first and middle
        # frame of every clip), so the bands sit on the same levels in idle, walk and cast
        sample = [[Image.open(src[0])] + ([Image.open(src[len(src) // 2])] if len(src) > 2 else []) for _, _, src in clips]
        opts.grade_ref = clip_lightness_reference(sample, opts)
        if log:
            log(f"lightness anchors for the whole character: median {opts.grade_ref[0]:.2f}, {opts.grade_ref[1]:.2f}..{opts.grade_ref[2]:.2f}")
    made = {}
    for action, d, src in clips:
        results = pixelate_frames([Image.open(p) for p in src], opts)
        out = frames_dir / f"{action}_{d}"
        out.mkdir(parents=True, exist_ok=True)
        for old in out.glob("frame_*.png"):
            old.unlink()
        for i, r in enumerate(results):
            r.image.save(out / f"frame_{i:03d}.png")
        made[f"{action}_{d}"] = len(results)
        if log:
            log(f"{action}/{d}: {len(results)} frames -> {results[0].image.width}x{results[0].image.height}")
    if not made:
        raise StepError("renders folder is empty")
    for pass_name in ("normal", "depth"):
        src_root = project.char_dir(c.name) / f"renders_{pass_name}"
        if not src_root.exists():
            continue
        dst_root = project.sub(c.name, f"frames_{pass_name}")
        popts = PixelateOptions(colors=0, palette=None, dither="none", despeckle=False, outline=None)
        popts.scale = scale
        for action in manifest["actions"]:
            for d in manifest["directions"]:
                src = sorted((src_root / action / d).glob("frame_*.png"))
                if not src:
                    continue
                out = dst_root / f"{action}_{d}"
                out.mkdir(parents=True, exist_ok=True)
                for i, f in enumerate(src):
                    pixelate(Image.open(f), popts).image.save(out / f"frame_{i:03d}.png")
    fps = manifest.get("fps", 12)
    clip_fps = {name: a.get("fps", fps) for name, a in manifest.get("actions", {}).items()}
    (frames_dir / "animations.json").write_text(json.dumps({"fps": fps, "clip_fps": clip_fps, "clips": made}, indent=2) + "\n")
    c.done["pixelate"] = True
    c.notes["pixelate"] = f"{len(made)} clips"
    project.save()
    return {"ok": True, "character": c.name, "frames": str(frames_dir), "clips": made, "fps": fps, "next": "export"}


def pixelate_still(project: Project, name: str, view: str = "front", outline: str | None = "style", **overrides) -> dict:
    """Direct path: one imported image (style or a view) -> one sprite, in the character's look (``outline``:
    ``"style"`` = the preset's rule, ``None`` = none, ``"auto"`` or a hex colour)."""
    c = project.character(name)
    src = project.sub(c.name, "views") / f"{view}.png"
    if view == "style":
        src = _source(project, c, "style") or src
    if not src.exists():
        raise StepError(f"no image for view {view!r}; run split or import a style image")
    opts = _options_for(project, c, outline=outline, remove_background=(view == "style"), **overrides)
    opts.crop = True
    r = pixelate(Image.open(src), opts)
    out = project.sub(c.name, "sprites") / f"{view}.png"
    r.image.save(out)
    r.preview(4).save(out.with_name(f"{view}_x4.png"))
    return {"ok": True, "character": c.name, "sprite": str(out), "size": list(r.image.size), "colors": len(r.palette),
            "style": style_of(project, c).name, "notes": r.notes}


def animate_still(project: Project, name: str, view: str = "front", presets: list[str] | None = None, frames: int | None = None, fps: float | None = None) -> dict:
    """A procedural loop of the still sprite; frame count and speed come from the character's look unless given."""
    import copy

    c = project.character(name)
    st = style_of(project, c)
    frames = frames or st.anim_frames
    fps = fps or st.anim_fps
    sprite = project.sub(c.name, "sprites") / f"{view}.png"
    if not sprite.exists():
        pixelate_still(project, name, view)
    presets = presets or ["idle"]
    effects = [e for p in presets for e in copy.deepcopy(PRESETS[p])]
    out_frames = animate(np.asarray(Image.open(sprite).convert("RGBA")), effects, frames)
    out = project.sub(c.name, "anim") / "_".join(presets)
    out.mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(out_frames):
        Image.fromarray(f, "RGBA").save(out / f"frame_{i:03d}.png")
    save_gif(out_frames, out / "preview.gif", fps=fps, zoom=max(3, st.pixel_step))
    return {"ok": True, "character": c.name, "frames": str(out), "gif": str(out / "preview.gif"), "count": len(out_frames), "fps": fps, "style": st.name}


# -------------------------------------------------------------------- export
def export(project: Project, name: str, fps: float | None = None) -> dict:
    c = project.character(name)
    frames_dir = project.sub(c.name, "frames")
    clips = {}
    meta = frames_dir / "animations.json"
    clip_fps = fps or (json.loads(meta.read_text())["fps"] if meta.exists() else 8)
    for clip in sorted(p for p in frames_dir.iterdir() if p.is_dir()):
        files = sorted(clip.glob("frame_*.png"))
        if files:
            clips[clip.name] = [Image.open(f) for f in files]
    if not clips:  # quick path only: the procedural clips made from a still
        for anim in sorted(project.sub(c.name, "anim").glob("*/")):
            files = sorted(anim.glob("frame_*.png"))
            if files:
                clips[f"still_{anim.name}"] = [Image.open(f) for f in files]
    if not clips:
        raise StepError("nothing to export; run pixelate (3D path) or animate (still path) first")
    # one sheet per action (its 8 directions as rows) keeps every texture far
    # below Godot's 16384 px limit and lets a clip batch in one draw call
    groups: dict[str, dict[str, list]] = {}
    for clip_name, frames in clips.items():
        action = clip_name.rsplit("_", 1)[0] if "_" in clip_name else clip_name
        groups.setdefault(action, {})[clip_name] = frames
    sheets = {f"{c.name}_{action}": pack(group, fps=clip_fps) for action, group in groups.items()}
    out = project.sub(c.name, "export")
    for old in out.glob("*.png"):
        old.unlink()
    files = godot_export.export_multi(sheets, out, c.name, f"{project.godot_res_dir.rstrip('/')}/{c.name}")
    biggest = max(s.image.height for s in sheets.values())
    c.done["export"] = True
    c.notes["export"] = f"{len(clips)} clips in {len(sheets)} sheets (tallest {biggest}px)"
    project.save()
    return {
        "ok": True,
        "character": c.name,
        "files": {k: str(v) for k, v in files.items()},
        "clips": {k: len(v) for k, v in clips.items()},
        "godot": f"Copy the export folder into your Godot project at {project.godot_res_dir}/{c.name}/ and drop {c.name}.tscn into a scene.",
    }


# ------------------------------------------------------------- game export
def export_game(project: Project, name: str, kind: str | None = None, out_dir: str | Path | None = None, category: str = "hero", display_name: str | None = None) -> dict:
    """Export in Godmarrow's own sprite-set format (``art/sprites/<kind>.png|json``),
    plus ``<kind>_normal`` / ``<kind>_depth`` sets when those passes were rendered."""
    from .godmarrow_export import export_godmarrow

    c = project.character(name)
    kind = kind or c.name
    renders = project.sub(c.name, "renders")
    manifest_file = renders / "manifest.json"
    if not manifest_file.exists():
        raise StepError("no renders yet; run the render step")
    manifest = json.loads(manifest_file.read_text())
    frames = project.sub(c.name, "frames")
    if not (frames / "animations.json").exists():
        raise StepError("no pixel frames yet; run the pixelate step")
    out = Path(out_dir) if out_dir else project.sub(c.name, "export_game")
    extra = {p: project.char_dir(c.name) / f"frames_{p}" for p in ("normal", "depth")}
    st = style_of(project, c)
    r = export_godmarrow(frames, manifest, out, kind, category=category, display_name=display_name or c.name, extra_passes=extra,
                         max_frames=st.clip_frames, extra_meta={"style": st.name, "pixel_step": st.pixel_step, "figure_height": st.figure_height})
    c.done["export"] = True
    c.notes["export_game"] = f"{r['color']['frames']} frames, sheet {r['color']['sheet']}"
    c.notes["export_game_json"] = str(r["color"]["json"])
    project.save()
    return {"ok": True, "character": c.name, "kind": kind, **r, "godot": f"copy {out}/* into the game's art/sprites/ and run with --skin={kind}"}


# ---------------------------------------------------------------- the pixel road (2D puppets, no Blender)
ROADS = ("3d", "pixel")


def road_of(project: Project, character: str | Character) -> str:
    """Which road a character is on: ``3d`` (the Blender model) or ``pixel`` (the 2D puppet)."""
    c = character if isinstance(character, Character) else project.character(character)
    return c.settings.get("road", "3d")


def set_road(project: Project, name: str, road: str) -> dict:
    """Put a character on the ``pixel`` road (puppet -> animate, no Blender) or back on the ``3d`` one."""
    if road not in ROADS:
        raise StepError(f"road must be one of {ROADS}")
    c = project.character(name)
    c.settings["road"] = road
    for step in ("model", "rig", "render", "pixelate", "export"):   # the roads' steps do not mix: start again from split/palette
        c.done.pop(step, None)
    project.save()
    return {"ok": True, "character": c.name, "road": road, "next": "puppet" if road == "pixel" else "model"}


def build_puppet(project: Project, name: str, facing: dict | None = None, log=None) -> dict:
    """Cut every view cutout into parts with pivots along a skeleton fitted to its silhouette (the pixel road's
    model step). Writes ``puppet/<view>.json`` + ``puppet/<view>/<part>.png`` and a contact sheet
    ``puppet/<view>_parts.png`` for checking. The front view decides whether there is a skirt and where its hem is."""
    c = project.character(name)
    views_dir = project.sub(c.name, "views")
    views = {}
    for v in ("front", "back", "side", "quarter"):
        f = views_dir / f"{v}.png"
        if f.exists():
            views[v] = Image.open(f)
    if "front" not in views:
        raise StepError("run split first (no views/front.png)")
    facing = facing or {k[7:]: v for k, v in c.settings.items() if k.startswith("facing_")}   # settings facing_side = left|right
    pups = puppet_mod.build_puppets(views, facing=facing)
    out = project.sub(c.name, "puppet")
    result = {}
    for v, vp in pups.items():
        puppet_mod.save_view_puppet(vp, out / v)
        puppet_mod.parts_sheet(vp).save(out / f"{v}_parts.png")
        result[v] = {"facing": vp.facing, "skirt": bool(vp.skeleton.get("skirt")), "parts": [p.name for p in vp.parts if not p.clone_of],
                     "sheet": str(out / f"{v}_parts.png"), "json": str(out / f"{v}.json")}
        if log:
            log(f"{v}: {len(vp.parts)} parts" + (", skirt" if vp.skeleton.get("skirt") else "") + (f", faces {vp.facing}" if vp.facing != "none" else ""))
    c.settings["road"] = "pixel"
    c.done["puppet"] = True
    c.done["model"] = True     # the puppet stands in for the 3D model on this road
    c.done["rig"] = True
    c.notes["model_mode"] = "puppet"
    c.notes["model"] = f"pixel road: {len(pups)} views cut into parts (" + ", ".join(f"{v} {len(vp.parts)}" for v, vp in pups.items()) + ")"
    c.notes["model_note"] = "Built: a 2D puppet (parts with pivots cut from the painting); no 3D model on this road."
    c.notes["rig"] = "pixel road: the motion library's joint tracks pose the puppet; nothing to rig"
    c.notes["puppet"] = c.notes["model"]
    project.save()
    return {"ok": True, "character": c.name, "road": "pixel", "views": result, "next": "animate"}


def animate_puppet(project: Project, name: str, clips: str | list[str] | None = None, directions: str | list[str] | None = None,
                   per_clip: int | None = None, elevation: float = 30.0, figure_px: int | None = None, log=None) -> dict:
    """Pose the puppet with the motion library's joint tracks and draw every frame of every clip from every
    direction into ``renders/`` with the Blender road's manifest, so ``pixelate`` and the exports run unchanged.
    ``clips``: the forge clip names (default the game set); ``directions``: a subset of S SW W NW N NE E SE while
    iterating; ``per_clip``: frames per clip (default the look's ``clip_frames``); ``figure_px``: the standing
    figure's height in render px (default 2x the look's figure height, at most the painting's)."""
    c = project.character(name)
    pdir = project.sub(c.name, "puppet")
    pups = {}
    for v in ("front", "back", "side", "quarter"):
        j = pdir / f"{v}.json"
        if j.exists():
            pups[v] = puppet_mod.load_view_puppet(j)
    if not pups:
        raise StepError("no puppet yet; run the puppet step")
    lib = puppet_mod.load_joints()
    if isinstance(clips, str):
        clips = [x.strip() for x in clips.split(",") if x.strip()]
    clips = clips or DEFAULT_CLIPS.split(",")
    if isinstance(directions, str):
        directions = [x.strip() for x in directions.split(",") if x.strip()]
    directions = directions or (puppet_mod.DIRECTIONS if project.directions == 8 else puppet_mod.DIRECTIONS[:: 8 // max(project.directions, 1)])
    st = style_of(project, c)
    if per_clip is None:
        per_clip = int(c.settings.get("per_clip", 0) or project_setting(project, "per_clip", 0) or st.clip_frames)
    if figure_px is None:
        # 2 render px per sprite px exactly (seen from the camera's elevation), so pixelate's cells land on whole
        # pixels and the frames can be cut to the figure; never more than the painting has
        import math as _m

        painting_h = max(vp.skeleton["height"] for vp in pups.values())
        figure_px = int(min(painting_h, max(round(2 * st.figure_height / _m.cos(_m.radians(elevation))), 96)))
    out = project.sub(c.name, "renders")
    for old in out.iterdir():   # a clip rendered before (by either road) must not linger
        if old.is_dir():
            shutil.rmtree(old)
    manifest = puppet_mod.animate(pups, lib, clips, out, directions=directions, per_clip=per_clip, figure_px=figure_px, elevation=elevation, log=log)
    c.settings["ppu"] = manifest["ppu"]
    c.done["render"] = True
    c.done["animate"] = True
    c.notes["render"] = f"pixel road: {manifest['renders']} frames drawn, {len(clips)} clips x {len(directions)} directions"
    chk = check_frames(out)
    c.notes["render_check"] = "frames clean" if chk["ok"] else "; ".join(chk["issues"])
    project.save()
    return {"ok": True, "character": c.name, "road": "pixel", "renders": str(out), "manifest": {k: v for k, v in manifest.items() if k != "actions"},
            "clips": {k: v["frames"] for k, v in manifest["actions"].items()}, "check": chk, "next": "pixelate"}


def run_pixel_path(project: Project, name: str, clips: str | list[str] | None = None, directions: str | list[str] | None = None,
                   per_clip: int | None = None, log=None) -> dict:
    """The whole pixel road: split -> palette -> puppet -> animate -> pixelate -> export, no Blender. Steps already
    done (split, palette) are kept; the rest run again."""
    c = project.character(name)
    ran = []
    if not c.done.get("split"):
        split(project, name)
        ran.append("split")
    if not c.done.get("palette"):
        make_palette(project, name)
        ran.append("palette")
    build_puppet(project, name, log=log)
    ran.append("puppet")
    animate_puppet(project, name, clips=clips, directions=directions, per_clip=per_clip, log=log)
    ran.append("animate")
    pixelate_renders(project, name, log=log)
    ran.append("pixelate")
    r = export(project, name)
    ran.append("export")
    return {"ok": True, "character": c.name, "road": "pixel", "ran": ran, "export": r["files"], "clips": r["clips"],
            "next": "export-game (pixelforge project export-game <character> --kind <kind>) to put it in the game"}


# ------------------------------------------------------------------- run-all
STEP_FUNCS = {
    "export_game": export_game,
    "split": split,
    "palette": make_palette,
    "model": build_model,
    "rig": rig,
    "render": render,
    "pixelate": pixelate_renders,
    "export": export,
    "puppet": build_puppet,
    "animate": animate_puppet,
}
PIXEL_ROAD_STEPS = ("split", "palette", "puppet", "animate", "pixelate", "export")
MODEL_ROAD_STEPS = ("split", "palette", "model", "rig", "render", "pixelate", "export")


def run_step(project: Project, name: str, step: str, log=None, **kw) -> dict:
    if step not in STEP_FUNCS:
        raise StepError(f"unknown step {step!r}; choose from {list(STEP_FUNCS)}")
    fn = STEP_FUNCS[step]
    if "log" in fn.__code__.co_varnames:
        kw["log"] = log
    return fn(project, name, **kw)


def run_until_blocked(project: Project, name: str, log=None, road: str | None = None) -> dict:
    """Run every remaining automatic step; stop at the first that needs a person. ``road`` (``3d`` | ``pixel``)
    switches the character's road first; the pixel road has no step that needs Blender."""
    c = project.character(name)
    if road is not None and road != road_of(project, c):
        set_road(project, name, road)
    steps = PIXEL_ROAD_STEPS if road_of(project, c) == "pixel" else MODEL_ROAD_STEPS
    done = []
    for step in steps:
        if c.done.get(step):
            continue
        try:
            run_step(project, name, step, log=log)
            done.append(step)
        except StepError as e:
            return {"ok": False, "ran": done, "blocked_at": step, "reason": str(e)}
    return {"ok": True, "ran": done, "blocked_at": None}


def which_python() -> str:
    return sys.executable
