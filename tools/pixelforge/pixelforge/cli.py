"""Command-line interface: ``pixelforge <command> ...`` (see ``--help``)."""

from __future__ import annotations

import argparse
import glob
import sys
from pathlib import Path

from PIL import Image

from . import godot
from .animate import PRESETS, animate, parse_effect
from .palette import Palette
from .pixelate import PixelateOptions, pixelate, pixelate_frames
from .quantize import DITHER_MODES
from .prompts import PROMPT_KINDS, RULES, build_all, build_prompt
from .spritesheet import pack, save_gif, slice_sheet
from .styles import DEFAULT_STYLE, STYLES, get_style
from .transform import flip, rotate, spin_frames, turn

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}


def _expand(patterns: list[str]) -> list[Path]:
    out: list[Path] = []
    for p in patterns:
        path = Path(p)
        if path.is_dir():
            out += sorted(q for q in path.iterdir() if q.suffix.lower() in IMAGE_EXTS)
        else:
            matches = sorted(glob.glob(p))
            if not matches:
                raise SystemExit(f"no files match {p!r}")
            out += [Path(m) for m in matches]
    return out


def _parse_anim(spec: str) -> tuple[str, list[Path], float]:
    """``name=glob[@fps]``"""
    name, _, rest = spec.partition("=")
    if not rest:
        raise SystemExit(f"--anim expects name=glob[@fps], got {spec!r}")
    pattern, _, fps = rest.rpartition("@") if "@" in rest else (rest, "", "8")
    return name, _expand([pattern]), float(fps)


def _add_pixelate_args(p: argparse.ArgumentParser) -> None:
    g = p.add_argument_group("pixelation")
    styles = ", ".join(f"{k} ({v.max_size}px/{v.colors} colors)" for k, v in STYLES.items())
    g.add_argument("--style", choices=sorted(STYLES), default=DEFAULT_STYLE, help=f"quality tier: {styles}")
    g.add_argument("--scale", default="auto", help="logical pixel size in source pixels, or 'auto' (default)")
    g.add_argument("--max-size", type=int, help="fallback longest side when no grid is detected (default: from --style)")
    g.add_argument("--width", type=int, help="force sprite width in pixels")
    g.add_argument("--height", type=int, help="force sprite height in pixels")
    g.add_argument("--colors", type=int, help="palette size when extracting (default: from --style)")
    g.add_argument("--palette", help="use a fixed palette (.hex, .gpl or .png)")
    g.add_argument("--dither", choices=DITHER_MODES, help="default: from --style")
    g.add_argument("--dither-strength", type=float, default=0.6)
    g.add_argument("--remove-bg", action="store_true", help="flood-remove the background from the borders")
    g.add_argument("--bg-tolerance", type=float, default=0.03, help="OKLab distance for --remove-bg")
    g.add_argument("--outline", help="'auto' (darkest palette color) or a hex color")
    g.add_argument("--crop", action="store_true", help="crop to the opaque content")
    g.add_argument("--no-despeckle", action="store_true")


def _options(a) -> PixelateOptions:
    style = get_style(a.style)
    return PixelateOptions(
        scale=a.scale if a.scale == "auto" else float(a.scale),
        max_size=a.max_size or style.max_size,
        width=a.width,
        height=a.height,
        colors=a.colors or style.colors,
        palette=Palette.load(a.palette) if a.palette else None,
        dither=a.dither or style.dither,
        dither_strength=a.dither_strength,
        remove_background=a.remove_bg,
        bg_tolerance=a.bg_tolerance,
        despeckle=not a.no_despeckle,
        outline=a.outline,
        crop=a.crop,
    )


def cmd_pixelate(a) -> None:
    for src in _expand(a.inputs):
        result = pixelate(Image.open(src), _options(a))
        out = Path(a.output) if a.output and len(a.inputs) == 1 and not Path(a.output).is_dir() else None
        if out is None:
            out_dir = Path(a.output or ".")
            out_dir.mkdir(parents=True, exist_ok=True)
            out = out_dir / f"{src.stem}_px.png"
        out.parent.mkdir(parents=True, exist_ok=True)
        result.image.save(out)
        if a.preview:
            result.preview(a.preview).save(out.with_name(out.stem + f"_x{a.preview}.png"))
        if a.save_palette:
            result.palette.save(a.save_palette)
        for n in result.notes:
            print(f"  {src.name}: {n}")
        print(f"{src} -> {out} ({result.image.width}x{result.image.height}, {len(result.palette)} colors)")


def cmd_palette(a) -> None:
    images = [Image.open(p).convert("RGBA") for p in _expand(a.inputs)]
    import numpy as np

    px = np.concatenate([np.asarray(im).reshape(-1, 4) for im in images])
    px = px[px[:, 3] > 127][:, :3]
    palette = Palette.from_image(px[None], n_colors=a.colors, accent_boost=a.accent_boost)
    palette.save(a.output)
    if a.swatch:
        palette.swatch(cell=16).save(a.swatch)
    print(f"{len(palette)} colors -> {a.output}")


def cmd_frames(a) -> None:
    paths = _expand(a.inputs)
    results = pixelate_frames([Image.open(p) for p in paths], _options(a), stabilize=a.stabilize)
    out = Path(a.output)
    out.mkdir(parents=True, exist_ok=True)
    for i, r in enumerate(results):
        r.image.save(out / f"frame_{i:03d}.png")
    results[0].palette.save(out / "palette.hex")
    if a.gif:
        save_gif([r.image for r in results], out / "preview.gif", fps=a.fps, zoom=a.zoom)
    for n in results[0].notes:
        print(f"  {n}")
    print(f"{len(results)} frames -> {out}")


def cmd_animate(a) -> None:
    import numpy as np

    sprite = np.asarray(Image.open(a.sprite).convert("RGBA"))
    effects = [e for name in a.preset for e in _fresh_preset(name)]
    effects += [parse_effect(s) for s in a.effect]
    if not effects:
        raise SystemExit("choose at least one --preset or --effect")
    palette = Palette.load(a.palette) if a.palette else None
    if a.flip:
        sprite = flip(sprite)
    frames = animate(sprite, effects, a.frames, palette=palette)
    out = Path(a.output)
    out.mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(frames):
        Image.fromarray(f, "RGBA").save(out / f"{a.name}_{i:03d}.png")
    if a.gif:
        save_gif(frames, out / f"{a.name}.gif", fps=a.fps, zoom=a.zoom)
    print(f"{len(frames)} frames ({frames[0].shape[1]}x{frames[0].shape[0]}) -> {out}")


def _fresh_preset(name: str) -> list:
    import copy

    if name not in PRESETS:
        raise SystemExit(f"unknown preset {name!r}; choose from {sorted(PRESETS)}")
    return copy.deepcopy(PRESETS[name])


def _sheet_from_args(a):
    anims, fps = {}, {}
    for spec in a.anim:
        name, paths, rate = _parse_anim(spec)
        anims[name] = [Image.open(p) for p in paths]
        fps[name] = rate
    return pack(anims, fps=fps, columns=a.columns)


def cmd_pack(a) -> None:
    sheet = _sheet_from_args(a)
    meta = sheet.save(a.output)
    print(f"{sheet.frame_count} cells {sheet.frame_width}x{sheet.frame_height} -> {a.output} + {meta.name}")


def cmd_godot(a) -> None:
    sheet = _sheet_from_args(a)
    files = godot.export(sheet, a.out, a.name, a.res_dir)
    for kind, path in files.items():
        print(f"{kind:5s} {path}")


def cmd_rotate(a) -> None:
    import numpy as np

    sprite = np.asarray(Image.open(a.sprite).convert("RGBA"))
    out = Path(a.output)
    stem = Path(a.sprite).stem
    if a.spin:
        out.mkdir(parents=True, exist_ok=True)
        frames = spin_frames(sprite, a.spin, clockwise=not a.ccw)
        for i, f in enumerate(frames):
            Image.fromarray(f, "RGBA").save(out / f"{stem}_spin_{i:03d}.png")
        if a.gif:
            save_gif(frames, out / f"{stem}_spin.gif", fps=a.fps, zoom=a.zoom)
        print(f"{len(frames)} spin frames ({frames[0].shape[1]}x{frames[0].shape[0]}) -> {out}")
        return
    result = sprite
    if a.flip:
        result = flip(result, horizontal=a.flip == "h")
    if a.turn:
        result = turn(result, a.turn)
    if a.angle:
        result = rotate(result, a.angle)
    if out.suffix.lower() != ".png":
        out.mkdir(parents=True, exist_ok=True)
        out = out / f"{stem}_rot.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.ascontiguousarray(result), "RGBA").save(out)
    print(f"{a.sprite} -> {out} ({result.shape[1]}x{result.shape[0]})")


def cmd_slice(a) -> None:
    w, _, h = a.frame.partition("x")
    frames = slice_sheet(Image.open(a.sheet), int(w), int(h), a.count)
    out = Path(a.output)
    out.mkdir(parents=True, exist_ok=True)
    for i, f in enumerate(frames):
        f.save(out / f"frame_{i:03d}.png")
    print(f"{len(frames)} frames -> {out}")


# ----------------------------------------------------------------- projects
def _emit(a, result: dict) -> None:
    import json

    if getattr(a, "json", False):
        print(json.dumps(result, indent=2, default=str))
        return
    for k, v in result.items():
        if isinstance(v, (dict, list)):
            print(f"{k}:")
            print("  " + json.dumps(v, indent=2, default=str).replace("\n", "\n  "))
        else:
            print(f"{k}: {v}")


def cmd_prompt(a) -> None:
    if a.kind == "all":
        for kind, text in build_all(a.describe, a.reference).items():
            title = next(k.title for k in PROMPT_KINDS if k.key == kind)
            print(f"### {title}\n{text}\n")
        print("RULES\n" + "\n".join(f"- {r}" for r in RULES))
    else:
        print(build_prompt(a.kind, a.describe, a.reference))


def cmd_project(a) -> None:
    from . import api
    from .project import Project

    sub = a.project_cmd
    if sub == "new":
        _emit(a, api.new_project(a.folder, a.name or Path(a.folder).resolve().name, a.style))
        return
    try:
        project = Project.load(a.project) if a.project else Project.find(".")
    except FileNotFoundError as e:
        _emit(a, {"ok": False, "error": f"{e}. Use --project <folder> or run inside the project folder."})
        raise SystemExit(2)
    try:
        if sub == "blender-download":
            _emit(a, api.download_blender(project, log=print))
        elif sub == "status":
            _emit(a, api.status(project))
        elif sub == "set":
            _emit(a, api.configure(project, style=a.style, blender=a.blender, directions=a.directions, render_size=a.render_size, godot_res_dir=a.godot_res_dir))
        elif sub == "add":
            r = api.add_character(project, a.character, a.describe or "")
            if a.describe:
                api.set_description(project, r["character"], a.describe)
            _emit(a, r)
        elif sub == "describe":
            _emit(a, api.set_description(project, a.character, a.describe))
        elif sub == "prompts":
            _emit(a, api.get_prompts(project, a.character, a.reference))
        elif sub == "import":
            _emit(a, api.import_source(project, a.character, a.kind, a.file))
        elif sub == "export-game":
            _emit(a, api.export_game(project, a.character, kind=a.kind, out_dir=a.out, category=a.category, display_name=a.name))
        elif sub == "run":
            kw = {}
            if a.step == "render":
                kw = {"step": a.frame_step, "elevation": a.elevation, "passes": a.passes}
            _emit(a, api.run_step(project, a.character, a.step, log=print, **kw))
        elif sub == "run-all":
            if a.all:
                results = {}
                for cname in list(project.characters):
                    print(f"=== {cname}")
                    try:
                        results[cname] = api.run_until_blocked(project, cname, log=print)
                    except Exception as e:  # noqa: BLE001
                        results[cname] = {"ok": False, "error": str(e)}
                _emit(a, {"ok": all(r.get("ok", False) for r in results.values()), "characters": results})
            elif not a.character:
                _emit(a, {"ok": False, "error": "give a character name or --all"})
            else:
                _emit(a, api.run_until_blocked(project, a.character, log=print))
        elif sub == "still":
            r = api.pixelate_still(project, a.character, a.view)
            if a.animate:
                r["animation"] = api.animate_still(project, a.character, a.view, a.animate)
            if a.export:
                r["export"] = api.export(project, a.character)
            _emit(a, r)
    except api.StepError as e:
        _emit(a, {"ok": False, "error": str(e)})
        raise SystemExit(2)


def cmd_prop(a) -> None:
    from .props import make_prop

    r = make_prop(a.image, a.name, a.out, height=a.height, scale=a.scale, colors=a.colors, outline=not a.no_outline,
                  sway=a.sway, frames=a.frames, fps=a.fps, variations=a.variations, game_objects=a.game_objects, hr=a.hr)
    _emit(a, r)


def cmd_vfx(a) -> None:
    from .vfx import make_vfx

    palette = a.palette.split(",") if "," in a.palette else a.palette
    r = make_vfx(a.kind, a.name, a.out, size=tuple(a.size) if a.size else None, frames=a.frames, fps=a.fps, palette=palette,
                 bands=a.bands, seed=a.seed, glow=(None if a.glow == "auto" else a.glow == "on"), gif=a.gif, atlas_dir=a.atlas)
    _emit(a, r)


def cmd_tiles(a) -> None:
    from .tiles import make_tiles

    r = make_tiles(a.texture, a.name, a.out, second=a.second, tile=tuple(a.tile), variants=a.variants, colors=a.colors, seed=a.seed, res_dir=a.res_dir)
    _emit(a, r)


def cmd_ui9(a) -> None:
    from .ui9 import make_ui9

    r = make_ui9(a.image, a.name, a.out, border=tuple(a.border) if a.border else None, width=a.width, colors=a.colors, mid=a.mid, res_dir=a.res_dir)
    _emit(a, r)


def cmd_sfx(a) -> None:
    from .sfx import make_sfx

    _emit(a, make_sfx(a.preset, a.out, seed=a.seed, variations=a.variations))


def cmd_portrait(a) -> None:
    from .portrait import make_portrait

    _emit(a, make_portrait(a.image, a.name, a.out, sizes=tuple(a.sizes), colors=a.colors, outline=not a.no_outline, head_fraction=a.head))


def cmd_compare(a) -> None:
    from .compare import compare

    _emit(a, compare(a.a, a.b, a.out, zoom=a.zoom))


def cmd_doctor(a) -> None:
    from .doctor import format_report, run

    r = run(a.project)
    if getattr(a, "json", False):
        _emit(a, r)
    else:
        print(format_report(r))
    raise SystemExit(0 if r["ok"] else 1)


def cmd_godot_addon(a) -> None:
    import shutil

    src = Path(__file__).resolve().parent.parent / "godot_addon" / "pixelforge"
    dst = Path(a.godot_project) / "addons" / "pixelforge"
    dst.mkdir(parents=True, exist_ok=True)
    for f in src.iterdir():
        shutil.copy(f, dst / f.name)
    _emit(a, {"ok": True, "installed": str(dst), "files": sorted(f.name for f in dst.iterdir()),
              "next": "Project > Project Settings > Plugins > enable PixelForge (optional); use PFSpriteSet, PFFx, PFObjects from any script."})


def cmd_icons(a) -> None:
    from .icons import make_icons

    names = [n.strip() for n in a.names.split(",")] if a.names else None
    _emit(a, make_icons(a.image, a.out, names, cell_art=a.cell, scale=a.scale, tolerance=a.tolerance, outline=not a.no_outline, colors=a.colors))


def cmd_recolor(a) -> None:
    from .recolor import _read_hex, recolor_file, recolor_set

    mapping = dict(pair.split("=", 1) for pair in a.map.split(",")) if a.map else None
    kw = dict(mapping=mapping, hue=a.hue, lightness=a.lightness, chroma=a.chroma,
              palette_from=_read_hex(a.palette_from) if a.palette_from else None, palette_to=_read_hex(a.palette_to) if a.palette_to else None)
    if a.kind:
        _emit(a, recolor_set(a.image, a.kind, a.suffix, **kw))
    else:
        _emit(a, recolor_file(a.image, a.out, **kw))


def cmd_skilltree(a) -> None:
    from .skilltree import cli_main

    _emit(a, cli_main(a))


def cmd_studio(a) -> None:
    from .gui import main as gui_main

    gui_main(a.project)


def cmd_mcp(a) -> None:
    from .mcp_server import main as mcp_main

    mcp_main()


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="pixelforge", description="Pixel-art sprite tools for games and Godot.")
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("pixelate", help="convert images (AI renders, fake pixel art) into clean sprites")
    s.add_argument("inputs", nargs="+")
    s.add_argument("-o", "--output", help="output file (single input) or directory")
    s.add_argument("--preview", type=int, metavar="ZOOM", help="also save an upscaled preview")
    s.add_argument("--save-palette", help="write the palette used (.hex/.gpl/.png)")
    _add_pixelate_args(s)
    s.set_defaults(func=cmd_pixelate)

    s = sub.add_parser("palette", help="extract a palette from one or more images")
    s.add_argument("inputs", nargs="+")
    s.add_argument("-o", "--output", required=True, help=".hex, .gpl or .png")
    s.add_argument("--colors", type=int, default=96)
    s.add_argument("--accent-boost", type=float, default=0.5, help="<1 keeps rare accent colors")
    s.add_argument("--swatch", help="also save an enlarged swatch image")
    s.set_defaults(func=cmd_palette)

    s = sub.add_parser("frames", help="pixelate an animation consistently (shared grid + palette)")
    s.add_argument("inputs", nargs="+", help="frame files, globs, or a directory")
    s.add_argument("-o", "--output", required=True, help="output directory")
    s.add_argument("--stabilize", type=float, default=0.04, help="OKLab drift below which pixels hold still")
    s.add_argument("--gif", action="store_true")
    s.add_argument("--fps", type=float, default=8)
    s.add_argument("--zoom", type=int, default=4)
    _add_pixelate_args(s)
    s.set_defaults(func=cmd_frames)

    s = sub.add_parser("animate", help="procedurally animate a still sprite")
    s.add_argument("sprite")
    s.add_argument("-o", "--output", required=True, help="output directory")
    s.add_argument("--preset", action="append", default=[], help=f"one of {sorted(PRESETS)} (repeatable)")
    s.add_argument("--effect", action="append", default=[], help="e.g. 'sway:amplitude=2,anchor=bottom,box=0;0.6;1;1'")
    s.add_argument("--frames", type=int, default=8)
    s.add_argument("--fps", type=float, default=8)
    s.add_argument("--name", default="anim", help="frame file prefix")
    s.add_argument("--palette", help="palette for flicker (default: the sprite's own colors)")
    s.add_argument("--flip", action="store_true", help="mirror first, e.g. to make the left-facing set")
    s.add_argument("--gif", action="store_true")
    s.add_argument("--zoom", type=int, default=4)
    s.set_defaults(func=cmd_animate)

    for name, func, helptext in (
        ("pack", cmd_pack, "pack frames into a sprite sheet + JSON"),
        ("godot", cmd_godot, "export a Godot 4 SpriteFrames (.tres) + AnimatedSprite2D scene (.tscn)"),
    ):
        s = sub.add_parser(name, help=helptext)
        s.add_argument("--anim", action="append", required=True, help="name=glob[@fps], repeatable")
        s.add_argument("--columns", type=int)
        if name == "pack":
            s.add_argument("-o", "--output", required=True, help="sheet .png")
        else:
            s.add_argument("--name", required=True, help="base file name, e.g. knight")
            s.add_argument("--out", required=True, help="directory inside your Godot project")
            s.add_argument("--res-dir", required=True, help="res:// path of --out, e.g. res://sprites/knight")
        s.set_defaults(func=func)

    s = sub.add_parser("rotate", help="flip, turn or rotate a sprite without blurring it (RotSprite)")
    s.add_argument("sprite")
    s.add_argument("-o", "--output", required=True, help="output .png, or a directory for --spin")
    s.add_argument("--angle", type=float, default=0.0, help="degrees counter-clockwise, any value")
    s.add_argument("--turn", type=int, default=0, help="exact quarter turns counter-clockwise (1 = 90 degrees)")
    s.add_argument("--flip", choices=["h", "v"], help="mirror horizontally (face the other way) or vertically")
    s.add_argument("--spin", type=int, metavar="N", help="make an N-frame full-rotation animation instead")
    s.add_argument("--ccw", action="store_true", help="spin counter-clockwise")
    s.add_argument("--gif", action="store_true")
    s.add_argument("--fps", type=float, default=12)
    s.add_argument("--zoom", type=int, default=4)
    s.set_defaults(func=cmd_rotate)

    s = sub.add_parser("prompt", help="print the Midjourney prompt(s) for a character description")
    s.add_argument("--describe", required=True, help="one-sentence character description")
    s.add_argument("--kind", choices=["all", *[k.key for k in PROMPT_KINDS]], default="all")
    s.add_argument("--reference", default="[SHEET IMAGE URL]", help="sheet image URL for the --cref prompts")
    s.set_defaults(func=cmd_prompt)

    s = sub.add_parser("project", help="the full pipeline on a project folder (what the app does)")
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--project", "-p", help="project folder (default: current folder or a parent)")
    common.add_argument("--json", action="store_true", help="machine-readable output")
    ps = s.add_subparsers(dest="project_cmd", required=True, parser_class=lambda **kw: argparse.ArgumentParser(parents=[common], **kw))
    x = ps.add_parser("new", help="create a project folder"); x.add_argument("folder"); x.add_argument("--name"); x.add_argument("--style", choices=sorted(STYLES), default=DEFAULT_STYLE)
    ps.add_parser("status", help="what is done, what is next")
    ps.add_parser("blender-download", help="fetch the portable Blender (380 MB, no installer) and point the project at it")
    x = ps.add_parser("set", help="change settings")
    x.add_argument("--style", choices=sorted(STYLES)); x.add_argument("--blender"); x.add_argument("--directions", type=int); x.add_argument("--render-size", type=int); x.add_argument("--godot-res-dir")
    x = ps.add_parser("add", help="add a character"); x.add_argument("character"); x.add_argument("--describe")
    x = ps.add_parser("describe", help="set the description"); x.add_argument("character"); x.add_argument("describe")
    x = ps.add_parser("prompts", help="Midjourney prompts for the character"); x.add_argument("character"); x.add_argument("--reference", default="[SHEET IMAGE URL]")
    x = ps.add_parser("import", help="import an image"); x.add_argument("character"); x.add_argument("kind", choices=["sheet", "front", "back", "side", "quarter", "style"]); x.add_argument("file")
    x = ps.add_parser("run", help="run one step"); x.add_argument("character"); x.add_argument("step", choices=["split", "palette", "model", "rig", "render", "pixelate", "export"])
    x.add_argument("--frame-step", type=int, default=2); x.add_argument("--elevation", type=float, default=30.0); x.add_argument("--passes", default=None, help="color,normal,depth")
    x = ps.add_parser("export-game", help="export in Godmarrow's art/sprites format (+ normal/depth sets)"); x.add_argument("character")
    x.add_argument("--kind", help="sprite kind name (default: character name)"); x.add_argument("--out", help="output folder (default: characters/<name>/export_game)")
    x.add_argument("--category", default="hero"); x.add_argument("--name", help="display name")
    x = ps.add_parser("run-all", help="run every remaining automatic step"); x.add_argument("character", nargs="?", help="omit with --all"); x.add_argument("--all", action="store_true", help="every character in the project, in turn")
    x = ps.add_parser("still", help="quick path: one image -> sprite (-> animation -> export)"); x.add_argument("character")
    x.add_argument("--view", default="style", choices=["style", "front", "side", "back"]); x.add_argument("--animate", nargs="*", metavar="PRESET"); x.add_argument("--export", action="store_true")
    s.set_defaults(func=cmd_project)

    s = sub.add_parser("prop", help="a painted object/tree/banner -> game sprite with footprint (+ sway animation)")
    s.add_argument("image"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/objects")
    s.add_argument("--height", type=int, help="sprite height in px (default 96)"); s.add_argument("--scale", type=float, help="source px per sprite px (use the character scale)")
    s.add_argument("--colors", type=int, default=0, help="0 = keep every colour"); s.add_argument("--no-outline", action="store_true")
    s.add_argument("--sway", choices=["canopy", "banner", "flame"]); s.add_argument("--frames", type=int, default=8); s.add_argument("--fps", type=float, default=6)
    s.add_argument("--variations", type=int, default=1, help="figures on the sheet (e.g. 4 for a 2x2 'four variations' prompt)")
    s.add_argument("--game-objects", metavar="OBJECTS_JSON", help="merge into Godmarrow's art/objects/objects.json (png, ox, oy, hr)")
    s.add_argument("--hr", type=float, default=2.0, help="texels per world px for --game-objects (the game's objects use 2)")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_prop)

    s = sub.add_parser("vfx", help="procedural looping effect sheet: fire, smoke, wisp, burst, embers")
    s.add_argument("kind", choices=["fire", "smoke", "wisp", "burst", "embers"]); s.add_argument("name"); s.add_argument("-o", "--out", default="art/fx")
    s.add_argument("--size", type=int, nargs=2, metavar=("W", "H")); s.add_argument("--frames", type=int, default=8); s.add_argument("--fps", type=float, default=10)
    s.add_argument("--palette", default="lantern", help="preset (wisp lantern miasma bone smoke blood) or dark->bright hex list a,b,c")
    s.add_argument("--bands", type=int, default=6, help="colour bands"); s.add_argument("--seed", type=int, default=1)
    s.add_argument("--glow", choices=["auto", "on", "off"], default="auto", help="soft halo (auto: fire/wisp/burst only)")
    s.add_argument("--gif", action="store_true"); s.add_argument("--atlas", metavar="DIR", help="also write a Godmarrow sprite set (art/sprites) for SpriteSet")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_vfx)

    s = sub.add_parser("tiles", help="painted ground texture -> 2:1 iso diamond tiles (+16 transition tiles) and a Godot TileSet")
    s.add_argument("texture"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/tiles")
    s.add_argument("--second", help="second material for the transition tiles"); s.add_argument("--tile", type=int, nargs=2, default=[72, 36], metavar=("W", "H"))
    s.add_argument("--variants", type=int, default=6); s.add_argument("--colors", type=int, default=0); s.add_argument("--seed", type=int, default=1)
    s.add_argument("--res-dir", default="res://art/tiles"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_tiles)

    s = sub.add_parser("ui9", help="painted panel/frame -> 9-slice texture + Godot StyleBoxTexture")
    s.add_argument("image"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/ui")
    s.add_argument("--border", type=int, nargs=4, metavar=("L", "T", "R", "B"), help="margins (default: detected)")
    s.add_argument("--width", type=int, help="pixelate to this width first (default: keep the image's pixels)")
    s.add_argument("--colors", type=int, default=0); s.add_argument("--mid", type=int, default=8, help="px of each edge/centre to keep")
    s.add_argument("--res-dir", default="res://art/ui"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_ui9)

    s = sub.add_parser("sfx", help="synthesised sound effects (hit, bone_click, pour, glass, cast, ui_tick, ...) -> WAV")
    s.add_argument("preset", help="a preset name or 'all'"); s.add_argument("-o", "--out", default="art/sfx")
    s.add_argument("--seed", type=int, default=0); s.add_argument("--variations", type=int, default=1, help="N seeded variations per preset")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_sfx)

    s = sub.add_parser("portrait", help="head-and-shoulders portraits from a front view cutout")
    s.add_argument("image"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/portraits")
    s.add_argument("--sizes", type=int, nargs="+", default=[48, 96]); s.add_argument("--head", type=float, default=0.34, help="fraction of the figure's height to keep")
    s.add_argument("--colors", type=int, default=0); s.add_argument("--no-outline", action="store_true"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_portrait)

    s = sub.add_parser("compare", help="before/after strip (+ GIF for frame folders) and a difference number")
    s.add_argument("a"); s.add_argument("b"); s.add_argument("-o", "--out", default="compare.png"); s.add_argument("--zoom", type=int, default=2)
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_compare)

    s = sub.add_parser("doctor", help="check this machine: Python, Pillow, numpy, Tk, Blender, the animation library")
    s.add_argument("--project"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_doctor)

    s = sub.add_parser("godot-addon", help="copy the PixelForge loaders (PFSpriteSet, PFFx, PFObjects) into a Godot project's addons/")
    s.add_argument("godot_project"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_godot_addon)

    s = sub.add_parser("icons", help="one painted flat lay of items -> inventory icons (<id>.png + <id>@1x.png + icons.json)")
    s.add_argument("image"); s.add_argument("-o", "--out", default="art/items")
    s.add_argument("--names", help='ids in reading order, with grid sizes: "sword:1x3,ring,hood:2x2"')
    s.add_argument("--cell", type=int, default=12, help="art px per inventory cell"); s.add_argument("--scale", type=int, default=4)
    s.add_argument("--tolerance", type=float, default=0.08); s.add_argument("--no-outline", action="store_true"); s.add_argument("--colors", type=int, default=0)
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_icons)

    s = sub.add_parser("recolor", help="recolour a finished sprite/atlas (champion, unique, seasonal) without re-rendering")
    s.add_argument("image", help="a PNG, or with --kind the art/sprites folder")
    s.add_argument("-o", "--out", help="output PNG (file mode)")
    s.add_argument("--kind", help="Godmarrow set mode: recolour art/sprites/<kind>.* into <kind><suffix>.*"); s.add_argument("--suffix", default="@champion")
    s.add_argument("--map", help='colour pairs "#src=#dst,#src2=#dst2": pixels shift by their nearest pair')
    s.add_argument("--hue", type=float, default=0.0, help="hue rotation in degrees"); s.add_argument("--lightness", type=float, default=1.0); s.add_argument("--chroma", type=float, default=1.0)
    s.add_argument("--palette-from"); s.add_argument("--palette-to", help=".hex files of equal length, matched by line")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_recolor)

    s = sub.add_parser("skilltree", help="edit Godmarrow's skill trees (GUI, or --list/--move/--rename headless); edits live in tools/skill_tree_edits.json")
    s.add_argument("skills", help="path to data/skills.json")
    s.add_argument("--list", metavar="CLASS", help="print a class's trees and exit")
    s.add_argument("--move", action="append", metavar="ID=ROW,COL[,TAB]"); s.add_argument("--rename", action="append", metavar="ID=NAME")
    s.add_argument("--apply", action="store_true", help="re-apply the edit file to skills.json and exit")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_skilltree)

    s = sub.add_parser("studio", help="open the desktop app")
    s.add_argument("project", nargs="?")
    s.set_defaults(func=cmd_studio)

    s = sub.add_parser("mcp", help="run the MCP server for Claude Desktop / Claude Code")
    s.set_defaults(func=cmd_mcp)

    s = sub.add_parser("slice", help="cut a grid sprite sheet into frames")
    s.add_argument("sheet")
    s.add_argument("--frame", required=True, help="WxH, e.g. 64x64")
    s.add_argument("--count", type=int)
    s.add_argument("-o", "--output", required=True)
    s.set_defaults(func=cmd_slice)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
