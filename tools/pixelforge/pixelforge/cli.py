"""Command-line interface: ``pixelforge <command> ...`` (see ``--help``)."""

from __future__ import annotations

import argparse
import json
import glob
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from . import godot
from .animate import PRESETS, animate, parse_effect
from .palette import Palette
from .pixelate import PixelateOptions, pixelate, pixelate_frames
from .quantize import DITHER_MODES
from .project import SOURCE_KINDS
from .prompts import PROMPT_KINDS, RULES, build_all, build_prompt
from .spritesheet import pack, save_gif, slice_sheet
from .styles import DEFAULT_PROJECT_STYLE, DEFAULT_STYLE, LOOKS, STYLES, describe_style, get_style, options_for_style, style_table
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
    styles = ", ".join(f"{k} ({v.figure_height}px/{v.colors or 'all'} colours)" for k, v in STYLES.items())
    g.add_argument("--style", choices=sorted(STYLES), default=DEFAULT_STYLE, help=f"look preset (see 'pixelforge styles'): {styles}")
    g.add_argument("--scale", default="auto", help="logical pixel size in source pixels, or 'auto' (default)")
    g.add_argument("--max-size", type=int, help="fallback longest side when no grid is detected (default: the preset's figure height)")
    g.add_argument("--width", type=int, help="force sprite width in pixels")
    g.add_argument("--height", type=int, help="force sprite height in pixels")
    g.add_argument("--colors", type=int, help="palette size when extracting (default: from --style)")
    g.add_argument("--palette", help="use a fixed palette (.hex, .gpl or .png)")
    g.add_argument("--dither", choices=DITHER_MODES, help="default: from --style")
    g.add_argument("--dither-strength", type=float, help="default: from --style")
    g.add_argument("--bands", type=int, help="flat shading bands, 0 = as painted (default: from --style)")
    g.add_argument("--saturation", type=float, help="chroma grade, 1 = as painted (default: from --style)")
    g.add_argument("--contrast", type=float, help="lightness contrast, 1 = as painted (default: from --style)")
    g.add_argument("--lightness", type=float, help="lightness lift, 0 = as painted (default: from --style)")
    g.add_argument("--edge", choices=["soft", "crisp", "hard"], help="edge treatment (default: from --style)")
    g.add_argument("--clean", type=int, help="passes of the 3x3 majority filter, 0 = none (default: from --style)")
    g.add_argument("--remove-bg", action="store_true", help="flood-remove the background from the borders")
    g.add_argument("--bg-tolerance", type=float, default=0.03, help="OKLab distance for --remove-bg")
    g.add_argument("--outline", default="style", help="'style' (the preset's rule, default), 'none', 'auto' (darkest palette colour) or a hex colour")
    g.add_argument("--crop", action="store_true", help="crop to the opaque content")
    g.add_argument("--no-despeckle", action="store_true")


def _options(a) -> PixelateOptions:
    return options_for_style(
        a.style,
        scale=a.scale if a.scale == "auto" else float(a.scale),
        max_size=a.max_size,
        width=a.width,
        height=a.height,
        colors=a.colors,
        palette=Palette.load(a.palette) if a.palette else None,
        dither=a.dither,
        dither_strength=a.dither_strength,
        bands=a.bands,
        saturation=a.saturation,
        contrast=a.contrast,
        lightness=a.lightness,
        edge=a.edge,
        clean=a.clean,
        remove_background=a.remove_bg,
        bg_tolerance=a.bg_tolerance,
        despeckle=not a.no_despeckle,
        outline=a.outline,
        crop=a.crop,
    )


def cmd_styles(a) -> None:
    """``pixelforge styles``: the look presets and their numbers; ``--demo OUT`` makes the animated examples."""
    if a.demo:
        from .style_demo import make_demo

        r = make_demo(a.demo, source=a.source, only=a.only.split(",") if a.only else None, effect=a.effect, log=print)
        _emit(a, r)
        return
    if a.json:
        _emit(a, {"ok": True, "default": DEFAULT_STYLE, "looks": LOOKS, "styles": style_table()})
        return
    print("Look presets (pixelforge project set --style NAME [--character C]; pixelforge styles --demo OUT for animated examples):\n")
    for name in LOOKS:
        print(describe_style(name) + "\n")
    tiers = [k for k, v in STYLES.items() if v.group == "tier"]
    print("Older size tiers: " + ", ".join(f"{k} ({STYLES[k].figure_height} px, {STYLES[k].colors or 'every'} colours)" for k in tiers))


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

    if a.style:
        st = get_style(a.style)
        a.frames = a.frames or st.anim_frames
        a.fps = a.fps or st.anim_fps
    a.frames = a.frames or 8
    a.fps = a.fps or 8.0
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
def _progress(done: int, total: int, clip: str = "", direction: str = "") -> None:
    """A progress line the Forge app reads while a command runs (on stderr, so ``--json`` keeps stdout to the result;
    the app merges the two streams and reads the last JSON object)."""
    print(f"PF_PROGRESS step=render clip={clip} dir={direction} done={done} total={total}", file=sys.stderr, flush=True)


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
    if getattr(a, "json", False):
        if getattr(a, "world", None) and a.world != "all":
            from .world_prompts import build_world_prompt
            _emit(a, {"ok": True, "kind": a.world, "prompt": build_world_prompt(a.world, a.describe, a.sref or "")})
        elif a.kind == "all":
            _emit(a, {"ok": True, "prompts": build_all(a.describe, a.reference), "rules": list(RULES)})
        else:
            _emit(a, {"ok": True, "kind": a.kind, "prompt": build_prompt(a.kind, a.describe, a.reference)})
        return
    if getattr(a, "world", None):
        from .world_prompts import WORLD_KINDS, WORLD_RULES, build_world_prompt

        if a.world == "all":
            for k in WORLD_KINDS:
                print(f"### {k.title}\n{k.purpose}\n{build_world_prompt(k.key, a.describe, a.sref or '')}\nForge: {k.forge}\n")
            print("RULES\n" + "\n".join(f"- {r}" for r in WORLD_RULES))
        else:
            print(build_world_prompt(a.world, a.describe, a.sref or ""))
        return
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
            if a.character:
                if not a.style:
                    _emit(a, {"ok": False, "error": "--character needs --style (a preset name, or 'project' to follow the project)"})
                    raise SystemExit(2)
                _emit(a, api.set_style(project, a.style, a.character))
            else:
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
            _emit(a, api.export_game(project, a.character, kind=a.kind, out_dir=a.out, category=a.category, display_name=a.name, skin_for=a.skin_for))
        elif sub == "import-shapes":
            _emit(a, api.import_shapes(project, a.character, a.file))
        elif sub == "render-shapes":
            _emit(a, api.render_shapes(project, a.character, preset=a.style, clips=a.clips, directions=a.directions, elevation=a.elevation, passes=a.passes, parts=a.parts,
                                       log=None if a.json else print, progress=_progress if a.json else None))
        elif sub == "reset":
            _emit(a, api.reset_character(project, a.character, keep_sources=not a.all, steps=a.steps.split(",") if a.steps else None))
        elif sub == "preview-shapes":
            _emit(a, api.preview_shapes(project, a.character, clip=a.clip, direction=a.direction.upper(), preset=a.style))
        elif sub == "run":
            kw = _run_kwargs(a)
            _emit(a, api.run_step(project, a.character, a.step, log=print, **kw))
        elif sub == "preview-gif":
            _emit(a, api.preview_gif(project, a.character, clip=a.clip, direction=a.dir))
        elif sub == "check":
            from .checks import check_character
            r = check_character(project, a.character)
            if a.json:
                _emit(a, r)
            else:
                print("OK: nothing to fix" if r["ok"] else "\n".join("- " + i for i in r["issues"]))
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



def _run_kwargs(a) -> dict:
    """The per-step flags of ``project run`` (each step's real parameters, as the Forge app's Advanced fold shows them)."""
    kw = {}
    if a.step == "split":
        if a.tolerance is not None:
            kw["tolerance"] = a.tolerance
        if a.views:
            kw["expected_views"] = a.views
    elif a.step == "palette":
        if a.colors is not None:
            kw["colors"] = a.colors
    elif a.step == "model":
        if a.model_mode:
            kw["mode"] = a.model_mode
        if a.height is not None:
            kw["height"] = a.height
    elif a.step == "rig":
        if a.clips:
            kw["clips"] = a.clips
    elif a.step == "render":
        kw = {"step": a.frame_step, "elevation": a.elevation, "passes": a.passes}
        if a.per_clip is not None:
            kw["per_clip"] = a.per_clip
        if a.actions:
            kw["actions"] = [x for x in a.actions.split(",") if x]
    elif a.step == "pixelate":
        if a.outline:
            kw["outline"] = None if a.outline == "none" else a.outline
    return kw


def cmd_prop(a) -> None:
    from .props import make_prop

    r = make_prop(a.image, a.name, a.out, height=a.height, scale=a.scale, colors=a.colors, outline=not a.no_outline,
                  sway=a.sway, frames=a.frames, fps=a.fps, variations=a.variations, game_objects=a.game_objects, hr=a.hr, key_all=a.key_all)
    _emit(a, r)


def cmd_tiles3d(a) -> None:
    from .old_roads import retired; retired("tiles3d", a)
    from .tiles3d import make_tiles3d

    _emit(a, make_tiles3d(a.material, a.second, a.name, a.out, tiles=a.tiles, seed=a.seed, ppu=a.ppu, res_dir=a.res_dir))


HERO_NOTE = ("note: 'hero' is the old cutout road (cutouts -> Blender -> Mixamo -> renders). Characters are shape sprites now: "
             "'pixelforge shapes draft|measure|render' and the Forge's Characters bench (pass --cutout to silence this).")


def cmd_hero(a) -> None:
    from .old_roads import retired; retired("hero", a)
    from .hero import make_hero

    if not getattr(a, "cutout", False):
        print(HERO_NOTE, file=sys.stderr)
    _emit(a, make_hero(a.sheet, a.name, a.project, describe=a.describe or "", to_game=a.to_game, kind=a.kind, display_name=a.display_name,
                       style=a.style, per_clip=a.per_clip, tolerance=a.tolerance, model_mode=a.model_mode, clips=a.clips, passes=a.passes))


def cmd_object(a) -> None:
    from .object3d import make_object

    _emit(a, make_object(a.sheet, a.name, a.out, height=a.height, views=a.views, tolerance=a.tolerance, yaw=a.yaw, ppu=a.ppu, strength=a.strength,
                         game_objects=a.game_objects, hr=a.hr, top=a.top, canopy=a.canopy, log=print))


def cmd_artlist(a) -> None:
    from .world_prompts import art_order_markdown

    text = art_order_markdown(a.sref or "")
    if a.out:
        Path(a.out).write_text(text)
        _emit(a, {"ok": True, "file": a.out})
    else:
        print(text)


def cmd_prop3d(a) -> None:
    from .old_roads import retired; retired("prop3d", a)
    from .prop3d import make_prop3d

    r = make_prop3d(a.model, a.name, a.out, height=a.height, yaw=a.yaw, ppu=a.ppu, reference=a.reference, strength=a.strength, scale=a.scale,
                    outline=not a.no_outline, game_objects=a.game_objects, hr=a.hr, grime=a.grime, bump=a.bump, dust=a.dust, log=print)
    _emit(a, r)


def cmd_vfx(a) -> None:
    from .vfx import make_vfx

    palette = None if a.palette == "auto" else (a.palette.split(",") if "," in a.palette else a.palette)
    r = make_vfx(a.kind, a.name, a.out, size=tuple(a.size) if a.size else None, frames=a.frames, fps=a.fps, palette=palette,
                 bands=a.bands, seed=a.seed, glow=(None if a.glow == "auto" else a.glow == "on"), haze=(None if a.haze == "auto" else a.haze == "on"),
                 gif=a.gif, atlas_dir=a.atlas, rotations=a.rotations, style=a.style)
    _emit(a, r)


def cmd_tiles(a) -> None:
    from .tiles import make_tiles

    r = make_tiles(a.texture, a.name, a.out, second=a.second, tile=tuple(a.tile) if a.tile else None, variants=a.variants, colors=a.colors, seed=a.seed, res_dir=a.res_dir, style=a.style)
    _emit(a, r)


def cmd_ui9(a) -> None:
    from .ui9 import make_ui9

    r = make_ui9(a.image, a.name, a.out, border=tuple(a.border) if a.border else None, width=a.width, colors=a.colors, mid=a.mid, res_dir=a.res_dir)
    _emit(a, r)


def cmd_sfx(a) -> None:
    from .sfx import make_sfx, parse_overrides

    _emit(a, make_sfx(a.preset, a.out, seed=a.seed, variations=a.variations, **parse_overrides(a.set)))


def cmd_music(a) -> None:
    from . import music
    from .music import cli as MC

    if a.cue in MC.VERBS:
        try:
            r = MC.run(a)
        except (music.song.SongError, music.edit.EditError, FileNotFoundError, ValueError, KeyError) as e:
            r = {"ok": False, "error": str(e).strip("'")}
        if a.json:
            _emit(a, r)
        else:
            MC.print_plain(r, a.cue)
        if not r.get("ok", True):
            raise SystemExit(1)
        return
    if a.cue == "list-cues":
        rows = music.cue_table()
        if a.json:
            _emit(a, {"ok": True, "cues": rows, "knobs": music.FIELDS})
            return
        print(f"{'cue':9s} {'act':>3s} {'place':6s} {'bpm':>4s} {'steps':>5s} {'root':>4s} {'mode':5s} {'seed':>4s}  what it is")
        for r in rows:
            print(f"{r['key']:9s} {r['act']:>3d} {r['place']:6s} {r['bpm']:>4.0f} {r['steps']:>5d} {r['root']:>4d} {r['sc']:5s} {r['seed']:>4d}  {r['description']}")
        print("\nknobs for --set and the sheet: " + ", ".join(f"{k} ({v.split(' (')[0].split(',')[0]})" for k, v in music.FIELDS.items()))
        return
    if a.cue == "sheet":
        _emit(a, music.write_sheet(a.sheet_out or str(Path(a.out) / "music_sheet.json")))
        return
    r = music.make_music(a.cue, a.out, seconds=a.seconds, seed=a.seed, overrides=music.parse_overrides(a.set), act=a.act,
                         sheet=a.sheet, fmt=a.format, preview=not a.no_preview, log=lambda m: print(m, flush=True) if not a.json else None)
    if a.play and r["files"]:
        wav = next((f for f in r["files"] if f.endswith(".wav")), None)
        if wav:
            r["played"] = music.play(wav)
    _emit(a, r)


def _claude_progress(words: str, n: list) -> None:
    """A progress line for the Forge while Claude works: the words with + for spaces (the app splits on spaces)."""
    n[0] += 1
    print(f"PF_PROGRESS step=claude done={n[0]} total=0 note={words.replace(' ', '+')}", file=sys.stderr, flush=True)


def describe_on_bench(bench: str, project: str, text: str, context: dict | None = None, timeout: float = 600.0, dry_run: bool = False) -> dict:
    """`pixelforge describe --bench B --project P "text"`: Claude Code does the job through PixelForge's MCP tools (claude_bridge.run),
    then the Characters and Objects results carry the Midjourney prompts for the thing on the bench."""
    import json as _json
    from . import claude_bridge as CB
    count = [0]
    r = CB.run(bench, project, text, ctx=context, on_progress=lambda w: _claude_progress(w, count), timeout=timeout, dry_run=dry_run)
    if r.get("dry_run") or not r.get("ok"):
        return r
    if bench in ("characters", "creatures", "objects"):
        about = text
        models = [f for f in r.get("changed", []) if f.endswith(".shapes.json") and Path(f).exists()]
        models.sort(key=lambda f: 0 if ("/characters/" in f.replace("\\", "/") or "/objects/" in f.replace("\\", "/")) else 1)
        if models:
            r["model_file"] = models[0]
            try:
                got = str(_json.loads(Path(models[0]).read_text(encoding="utf-8")).get("about", "") or "")
                about = got.split(":", 1)[1].strip() if got.lower().startswith("drafted from:") else (got or about)
            except (OSError, _json.JSONDecodeError):
                pass
        if bench == "objects":
            r["prompts"] = {"turnaround": CB.midjourney_prompt("turnaround", about), "props9": CB.midjourney_prompt("props9", about)}
            r["prompt_titles"] = {"turnaround": "Object turnaround (three views)", "props9": "A prop sheet of nine"}
        else:
            r["prompts"] = build_all(about)
            r["prompt_titles"] = {k.key: k.title for k in PROMPT_KINDS}
        r["about"] = about
    return r


def cmd_claude(a) -> None:
    """pixelforge claude status | register | log | undo <manifest>"""
    from . import claude_bridge as CB
    sub = a.claude_cmd
    if sub == "status":
        r = CB.status()
    elif sub == "register":
        r = CB.register(python=a.python)
    elif sub == "log":
        r = CB.last_log(a.project, a.lines)
    else:
        r = CB.restore(a.manifest)
    if getattr(a, "json", False):
        _emit(a, r)
    elif sub == "log" and r.get("ok"):
        print(r["log"])
        print("\n".join(r["tail"]))
    elif sub == "undo" and r.get("ok"):
        print(f"restored {len(r['restored'])} files, removed {len(r['removed'])} ({r['bench']})")
    else:
        print(r.get("sentence") or r.get("note") or r.get("error") or r)


def cmd_midjourney(a) -> None:
    """pixelforge midjourney fetch --prompt "..." | --kind K --describe "..." [--image X] --out DIR --project P [--pick best|all]"""
    from . import claude_bridge as CB
    prompt = a.prompt or CB.midjourney_prompt(a.kind, a.describe or "")
    if a.midjourney_cmd == "prompt":
        _emit(a, {"ok": True, "kind": a.kind, "prompt": prompt}) if a.json else print(prompt)
        return
    count = [0]
    r = CB.fetch_midjourney(prompt, a.out, a.project, image=a.image, pick=a.pick, on_progress=lambda w: _claude_progress(w, count), timeout=a.timeout, dry_run=a.dry_run)
    if a.json:
        _emit(a, r)
    elif r.get("ok"):
        print("\n".join(r.get("files", [])) + ("\n" + r["notes"] if r.get("notes") else ""))
    else:
        print(r.get("error", "stopped"))
        sys.exit(1)


def cmd_tools(a) -> None:
    """pixelforge tools status | explain <tool> | run <tool> <action> [--params JSON]"""
    from . import tools as T
    if a.tools_cmd == "status":
        r = T.status(with_version=not getattr(a, "quick", False))
        _emit(a, r) if a.json else print(T.format_status(r))
    elif a.tools_cmd == "explain":
        try:
            mod = T.get(a.tool)
        except KeyError as e:
            r = {"ok": False, "error": str(e)}
        else:
            r = {"ok": True, "tool": mod.NAME, "found": mod.find() is not None, "install": mod.explain_missing(), "home": mod.HOME, "licence": mod.LICENCE, "what": mod.WHAT,
                 "actions": T.actions_of(mod)}
        _emit(a, r) if a.json else print(r.get("install") or r.get("error"))
    else:
        import json as _json
        params = _json.loads(a.params) if a.params else {}
        r = T.run(a.tool, a.action, params)
        _emit(a, r) if a.json else print(_json.dumps(r, indent=1, default=str))
        if not r.get("ok", False):
            sys.exit(1)


def _job_progress(job_id: str, done: int, total: int, words: str) -> None:
    """The runner's progress for the Forge: `PF_PROGRESS step=job id=... done=i total=n note=words+with+pluses` on stderr."""
    print(f"PF_PROGRESS step=job id={job_id} done={done} total={total} note={str(words).replace(' ', '+')}", file=sys.stderr, flush=True)


def cmd_job(a) -> None:
    """pixelforge job start "sentence" -p P [--approve steps|none] [--plan FILE] [--no-run] | list | status ID | log ID | approve ID [--step S] [--run] | cancel ID | resume ID | report ID"""
    import json as _json
    from . import jobs as J
    sub = a.job_cmd
    project = a.project or "."
    try:
        if sub == "start":
            plan = _json.loads(Path(a.plan).read_text(encoding="utf-8")) if getattr(a, "plan", None) else None
            r = J.start(project, a.text, approve=a.approve, plan=plan, game=a.game or "", run_now=not a.no_run, on_progress=_job_progress)
        elif sub == "list":
            r = J.list_jobs(project)
        elif sub == "status":
            r = {"ok": True, **J.status(project, a.id)}
        elif sub == "log":
            r = J.tail_log(project, a.id, a.lines)
        elif sub == "approve":
            r = J.approve(project, a.id, a.step)
            if r.get("ok") and a.run:
                r = J.resume(project, a.id, on_progress=_job_progress)
        elif sub == "cancel":
            r = J.cancel(project, a.id)
        elif sub == "resume":
            r = J.resume(project, a.id, on_progress=_job_progress)
        else:
            r = J.write_report(project, a.id)
    except FileNotFoundError as e:
        r = {"ok": False, "error": str(e)}
    if a.json:
        _emit(a, r)
        return
    if not r.get("ok", False):
        print(r.get("error", "stopped"))
        sys.exit(1)
    if sub == "list":
        for j in r["jobs"]:
            print(f"{j['id']}  {j['state']:11s} {j['done']}/{j['total']}  {j['title']}" + (f"  (waiting: {j['waiting']})" if j["waiting"] else ""))
        if not r["jobs"]:
            print("no jobs yet")
    elif sub == "log":
        print("\n".join(r["tail"]))
    elif sub == "report":
        print(Path(r["report"]).read_text(encoding="utf-8"))
    else:
        print(f"{r.get('id', '')}  {r.get('state', '')}  {r.get('done', 0)}/{r.get('total', 0)}  {r.get('title', '')}" + (f"\nwaiting for approval: {r['waiting']}" if r.get("waiting") else "")
              + (f"\nreport: {r['report']}" if r.get("report") else ""))


def cmd_describe(a) -> None:
    from . import describe

    if getattr(a, "bench", None):
        import json as _json
        ctx = _json.loads(a.context) if getattr(a, "context", None) else None
        r = describe_on_bench(a.bench, a.project or ".", a.text, ctx, timeout=a.timeout, dry_run=a.dry_run)
        if a.json:
            _emit(a, r)
        elif r.get("dry_run"):
            print(" ".join(r["command"]))
        elif r.get("ok"):
            print("\n".join(r.get("did", [])) + ("\n" + r["notes"] if r.get("notes") else ""))
        else:
            print(r.get("error", "stopped"))
        return
    d = describe.draft(a.text, image=a.image, what=a.as_)
    from .jobs import benches_in
    d["benches"] = benches_in(a.text)       # two or more: the Forge's Home starts a job instead of opening one bench
    if d["what"] == "spell" and a.out:
        from . import spell as S
        d["export"] = S.export_spell(d["spell"], a.out, gif=True)
    if d["what"] == "skin" and a.image and a.apply:
        from . import skin_ops
        d["applied"] = skin_ops.apply_ops(a.image, d["ops"])
    if d["what"] == "music" and a.out:
        from . import music
        d["export"] = music.make_music(d["cue"], a.out, seconds=a.seconds, overrides=d["knobs"])
    if a.json:
        _emit(a, d)
    else:
        print("I read: " + "; ".join(d["read"]))
        if d["what"] == "spell":
            print("spell layers: " + ", ".join(f"{l['kind']} ({l['palette']}, x{l['scale']})" for l in d["spell"]["layers"]) + (f"\nexported {d['export']['png']}" if "export" in d else "\n(add -o <folder> to export, or open it in the spell designer)"))
        elif d["what"] == "skin":
            print("ops: " + json.dumps(d["ops"]) + ("\napplied" if "applied" in d else "\n(add --apply with --image to apply, or run them in the skin editor)"))
        elif d["what"] == "prompt":
            print(d["prompt"])
        else:
            print(f"music: cue {d['cue']} knobs {d['knobs']}" + (f"\nrendered {d['export']['files']}" if "export" in d else " (add -o <folder> to render)"))


def cmd_shapes(a) -> None:
    """pixelforge shapes render|preview|sheet|still|object|turntable|compare|validate|template|draft|measure|sample-materials|joints"""
    from . import shape_rig, shape_tools, shapes as S

    sub = a.shapes_cmd
    if sub == "validate":
        r = shape_tools.validate_file(a.file)
        if a.json:
            _emit(a, r)
        else:
            print(("ok: " if r["ok"] else "problems:\n  ") + ("\n  ".join(r["problems"]) if r["problems"] else f"{r['mode']} file, {r['shapes']} shapes, materials {', '.join(r['materials'])}, bones {len(r.get('bones', []))}"))
            if r.get("warnings"):
                print("warnings (it renders, but look):\n  " + "\n  ".join(r["warnings"]))
        if not r["ok"]:
            sys.exit(1)
        return
    if sub == "template":
        r = shape_tools.template_file(a.height, a.out, a.png)
        if a.json:
            _emit(a, r)
        else:
            print(f"author pose for a {a.height} px figure on a {r['size'][0]}x{r['size'][1]} canvas, ground {r['ground']}, axis x {r['axis'][0]}")
            for n, b in r["bones"].items():
                print(f"  {n:14s} head {b['head']}  tail {b['tail']}")
            if a.out:
                print("written", a.out)
        return
    if sub == "measure":
        from . import shape_measure
        r = shape_measure.measure_views(a.front, a.side, a.back, a.out)
        if a.json:
            _emit(a, r)
        else:
            lm = r["landmarks"]
            print(f"figure {r['height_px']} px tall in {', '.join(r['views'])}; as fractions of the height:")
            for k in ("head", "shoulders", "chest", "waist", "hips", "hem"):
                v = lm[k]
                print(f"  {k:10s} y {v['y']:.2f}  w {v['w']:.3f}" + (f"  d {v['d']:.3f}" if v.get("d") else "") + ("  (skirted)" if v.get("skirted") else ""))
            print(f"  leg w {lm['leg']['w']:.3f}  arm w {lm['arm']['w']:.3f}" + (f"\nwritten {r['file']}" if r.get("file") else " (add -o M.json to write it)"))
        return
    if sub == "sample-materials":
        from . import shape_measure
        doc = S.load_shapes(a.model)
        r = shape_measure.sample_materials(a.front, doc, a.out or a.model, height=a.height, only=[m.strip() for m in a.only.split(",")] if a.only else None)
        if a.json:
            _emit(a, r)
        else:
            for name, v in r["materials"].items():
                print(f"  {name:12s} {' '.join(v['ramp'])}  ({v['pixels']} px)")
            for sk in r["skipped"]:
                print("  skipped " + sk)
            print(f"written {r['file']}")
        return
    if sub == "draft":
        from . import describe
        from .old_roads import retired; retired("draft", a)
        r = describe.draft_shapes(a.text, out=a.out, height=a.height, measure=a.from_measure)
        if a.json:
            _emit(a, r)
        else:
            print("I read: " + "; ".join(r["read"]))
            print(f"{len(r['doc']['shapes'])} shapes" + (f", written {r['file']}" if r.get("file") else " (add -o file.shapes.json to write it)"))
        return
    if sub == "joints":
        from . import joints
        r = joints.export_joints(a.glb or joints.LIBRARY, a.out or joints.JOINTS_FILE, fps=a.fps)
        _emit(a, r) if a.json else print(f"wrote {r['file']}: {r['joints']} joints, {len(r['clips'])} clips at {r['fps']} fps, {r['bytes']} bytes")
        return
    doc = S.load_shapes(a.file)
    problems = S.validate(doc)
    if problems:
        print("the file has problems:\n  " + "\n  ".join(problems), file=sys.stderr)
        sys.exit(1)
    for w in S.warnings(doc):
        print("warning: " + w, file=sys.stderr)
    # a character renders at the game's hero height unless a preset or a scale is named; objects keep their own size
    style = a.style or (shape_tools.default_style_for(doc) if a.scale is None else None)
    if sub == "render":
        clips = [c.strip() for c in a.clips.split(",")] if a.clips else list(shape_rig.GAME_CLIPS)
        dirs = [d.strip().upper() for d in a.directions.split(",")] if a.directions else list(shape_rig.DIRECTIONS)
        r = shape_tools.render_set(doc, a.out, clips=clips, directions=dirs, style=style, scale=a.scale, steps=a.steps, outline=a.outline or "style",
                                   elevation=a.elevation, max_frames=a.frames, passes=a.passes, parts=a.parts, log=None if a.json else print,
                                   progress=_progress if a.json else None)
        if a.gif:
            for clip in clips:
                for d in dirs:
                    files = sorted((Path(a.out) / f"{clip}_{d}").glob("frame_[0-9][0-9][0-9].png"))
                    frames = shape_tools.trim_frames([np.asarray(Image.open(f).convert("RGBA")) for f in files])
                    save_gif(frames, Path(a.out) / f"{clip}_{d}.gif", fps=r["fps"][clip], zoom=a.zoom, background=(94, 93, 98, 255))
        _emit(a, r) if a.json else print(f"{len(clips)} clips x {len(dirs)} directions -> {a.out} ({r['seconds']} s, frames {r['size']} px)")
    elif sub == "preview":
        out = a.out or f"{Path(a.file).stem.split('.')[0]}_{a.clip}_{a.direction}.gif"
        r = shape_tools.gif_of(doc, a.clip, a.direction.upper(), out, style=style, scale=a.scale, steps=a.steps, outline=a.outline or "style", elevation=a.elevation,
                               max_frames=a.frames, zoom=a.zoom)
        _emit(a, r) if a.json else print(f"{r['gif']}: {r['frames']} frames at {r['fps']:g} fps")
    elif sub == "sheet":
        clips = [c.strip() for c in a.clips.split(",")] if a.clips else ["idle", "walk"]
        dirs = [d.strip().upper() for d in a.directions.split(",")] if a.directions else list(shape_rig.DIRECTIONS)
        opt = shape_tools.options_for(doc, style, a.scale, a.steps, a.outline or "style", a.elevation)
        model = S.Model(doc, opt["scale"], opt["steps"]) if S.mode_of(doc) == "solid" else None
        tracks = shape_rig.load_joints()
        rows = []
        for clip in clips:
            for d in dirs:
                res = shape_rig.render_clip(doc, clip, d, tracks=tracks, model=model, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"],
                                            elevation=opt["elevation"], max_frames=a.frames or opt["max_frames"])
                rows.append((f"{clip} {d} ({len(res['frames'])} f @ {res['fps']:g} fps)", res["frames"][::max(1, len(res["frames"]) // a.columns)][:a.columns]))
        r = shape_tools.contact_sheet(rows, a.out, zoom=a.zoom, columns=a.columns)
        _emit(a, r) if a.json else print(f"{r['sheet']}: {r['rows']} rows x {r['columns']} frames")
    elif sub == "still":
        r = shape_tools.still(doc, a.out, frame=a.frame, direction=a.direction.upper(), style=style, scale=a.scale, steps=a.steps, outline=a.outline or "style",
                              elevation=a.elevation, zoom=a.zoom, passes=a.passes, game_objects=a.game_objects, name=a.name, hr=a.hr, parts=a.parts)
        _emit(a, r) if a.json else print(f"{r['png']} ({r['size'][0]}x{r['size'][1]}, foot anchor {r['anchor']})" + (f"; objects.json entry {r['game_objects']['key']}" if a.game_objects else ""))
    elif sub == "object":
        dirs = [d.strip().upper() for d in a.directions.split(",")] if a.directions else ["S"]
        r = shape_tools.export_object(doc, a.out, a.name, directions=dirs, style=style, scale=a.scale, steps=a.steps, outline=a.outline or "style",
                                      elevation=a.elevation, frame=a.frame, game_objects=a.game_objects, hr=a.hr)
        if a.json:
            _emit(a, r)
        else:
            views = ", ".join("%s %dx%d anchor (%d, %d)" % (d, v["size"][0], v["size"][1], v["ox"], v["oy"]) for d, v in r["views"].items())
            added = ("; objects.json: " + ", ".join(r["game_objects"]["added"])) if a.game_objects else ""
            print(f"{r['name']}: {views} -> {r['dir']}{added}")
    elif sub == "turntable":
        r = shape_tools.turntable(doc, a.out, frames=a.frames or 48, style=style, scale=a.scale, steps=a.steps, outline=a.outline or "style", elevation=a.elevation, zoom=a.zoom,
                                  parts=a.parts)
        _emit(a, r) if a.json else print(f"{r['gif']} ({r['frames']} views) and {r['views']}")
    elif sub == "compare":
        from . import shape_measure
        views = [v.strip() for v in a.views.split(",") if v.strip()] if a.views else None
        r = shape_measure.compare(doc, a.ref, a.out, height=a.height, views=views, elevation=a.elevation or 0.0, zoom=a.zoom)
        if a.json:
            _emit(a, r)
        else:
            print(f"{r['out']}: " + "; ".join(f"{k} ({v['direction']}) overlap {v['silhouette_iou']:.2f}" for k, v in r["views"].items()))


def _picture_progress(step: str, done: int, total: int) -> None:
    """The road's progress line (stderr, like ``_progress``): ``what`` carries the step's words with underscores."""
    print(f"PF_PROGRESS step=picture what={step.replace(' ', '_')} done={done} total={total}", file=sys.stderr, flush=True)


def cmd_character(a) -> None:
    """pixelforge character from-picture|measure|sample|compare: a picture becomes a character in one go, and the steps again."""
    from . import api, picture_road

    sub = a.character_cmd
    from .old_roads import retired; retired("from-picture", a)
    progress = _picture_progress if a.json else None
    log = None if a.json else print
    try:
        if sub == "from-picture":
            r = picture_road.from_picture(a.picture, a.project, a.name, style=a.style, height=a.height, text=a.text, progress=progress, log=log)
        else:
            r = picture_road.redo(a.project, a.character, sub, style=a.style, progress=progress, log=log)
    except api.StepError as e:
        _emit(a, {"ok": False, "error": str(e)})
        raise SystemExit(2)
    if a.json:
        _emit(a, r)
        return
    if sub == "from-picture":
        print(f"{r['character']}: {r['shapes']} shapes drafted from the {r['kind']} ({', '.join(r['views'])}); read " + "; ".join(r["read"]))
    print(f"model {r['model']}\nstill {r['still']}\ncompare {r['compare']}")
    for w in r["warnings"]:
        print("warning: " + w)
    print(r["judgement"])


def cmd_game_preview(a) -> None:
    from . import api
    from .game_preview import import_game, preview_in_game

    try:
        if getattr(a, "do_import", False):
            _emit(a, import_game(a.game, godot=a.godot, log=None if a.json else print))
            return
        _emit(a, preview_in_game(a.game, godot=a.godot, skin=a.skin, cls=a.cls, zone=a.zone, fx=a.fx.split(",") if a.fx else None, attach=a.attach,
                                 shot=a.shot, shot_t=a.shot_t, hour=a.hour, wait=a.wait, play=a.play, place=a.place.split(",") if a.place else None,
                                 timeout=a.timeout, log=None if a.json else print))
    except api.StepError as e:
        _emit(a, {"ok": False, "error": str(e)})
        raise SystemExit(2)


def cmd_forge(a) -> None:
    """``pixelforge forge``: open the Forge app (the Godot front end; forge_launch finds or fetches Godot)."""
    from .forge_launch import launch
    from .self_update import restart_if_updated, update

    if not a.no_update:
        restart_if_updated(update(log=None if a.json else print))
    r = launch(godot=a.godot, project=a.project, screen=a.screen, windowed=a.windowed, extra=a.extra, wait=a.wait, log=None if a.json else print)
    _emit(a, r)
    if not r.get("ok"):
        raise SystemExit(2)


def cmd_effect(a) -> None:
    from .effect_art import make_effect

    _emit(a, make_effect(a.image, a.name, a.out, kind=a.kind, preset=a.preset, frames=a.frames, fps=a.fps, width=a.width, rotations=a.rotations,
                         seed=a.seed, gif=not a.no_gif, tolerance=a.tolerance, atlas_dir=a.atlas))


def cmd_effects(a) -> None:
    """The effects engine: list | render NAME | graph FILE | preview NAME (a GIF beside the strip)."""
    import json
    from . import effects as E

    def levers_of(pairs):
        out = {}
        for kv in pairs or []:
            if "=" not in kv:
                raise SystemExit(f"--lever takes k=v, not {kv!r}")
            k, v = kv.split("=", 1)
            out[k.strip()] = float(v)
        return out

    if a.action == "list":
        t = E.library_table()
        if a.family:
            t["effects"] = [e for e in t["effects"] if e["family"] == a.family]
        if getattr(a, "json", False):
            _emit(a, t)
            return
        for fam in t["families"]:
            rows = [e for e in t["effects"] if e["family"] == fam]
            if rows:
                print(f"{fam}:")
                for e in rows:
                    print(f"  {e['name']:14s} levers {', '.join(e['levers'])}  {e['frames']} frames at {e['fps']:g}  {e['size'][0]}x{e['size'][1]}{'' if e['loop'] else '  one-shot'}")
        print(f"{len(t['effects'])} effects, {len(t['nodes'])} nodes, {len(t['palettes'])} palettes")
        return
    if a.action in ("render", "preview"):
        from .effects.compat import resolve_kind
        effect, lv0, pal = resolve_kind(a.name)
        lv = {**lv0, **levers_of(a.lever)}
        palette = a.palette or pal
        r = E.render_effect(effect, a.out, levers=lv, size=tuple(a.size) if a.size else None, frames=a.frames, fps=a.fps, seed=a.seed,
                            gif=a.gif or a.action == "preview", rotations=a.rotations, out_name=a.as_name or a.name, palette=palette, bands=a.bands)
        _emit(a, r)
        return
    if a.action == "graph":
        g = json.loads(Path(a.name).read_text())
        name = a.as_name or Path(a.name).stem.replace(".graph", "")
        r = E.render_graph(g, name, a.out, levers=levers_of(a.lever), size=tuple(a.size) if a.size else None, frames=a.frames, fps=a.fps, seed=a.seed,
                           gif=a.gif, rotations=a.rotations)
        _emit(a, r)
        return
    if a.action == "nodes":
        _emit(a, {"ok": True, "nodes": E.node_table()})
        return


def cmd_spell(a) -> None:
    from . import spell

    if a.action == "new":
        sp = spell.new_spell(a.name, a.preset)
        path = spell.save_spell(sp, Path(a.out) / f"{a.name}.spell.json")
        r = spell.export_spell(sp, a.out, gif=a.gif)
        _emit(a, {**r, "spell": path, "presets": sorted(spell.PRESETS)})
    elif a.action == "render":
        sp = spell.load_spell(a.name)
        _emit(a, spell.export_spell(sp, a.out, gif=a.gif, atlas_dir=a.atlas))
    else:
        _emit(a, {"ok": True, "presets": {k: [l["kind"] for l in v["layers"]] for k, v in spell.PRESETS.items()}, "kinds": list(__import__("pixelforge.vfx", fromlist=["KINDS"]).KINDS)})


def cmd_skin(a) -> None:
    from . import skin_ops

    ops = json.loads(Path(a.ops).read_text()) if Path(a.ops).exists() else json.loads(a.ops)
    _emit(a, skin_ops.apply_ops(a.image, ops, out_path=a.out))


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
    """``pixelforge studio``: the classic window. Updates first; without ``--classic`` it opens the Forge app (the
    finished product) when that is present, so every old desktop icon lands on the newest look."""
    from .self_update import restart_if_updated, update

    if not a.no_update:
        restart_if_updated(update(log=print))
    if not a.classic:
        from .forge_launch import forge_dir, launch

        if (forge_dir() / "project.godot").exists():
            r = launch(project=a.project, log=print)
            if r.get("ok"):
                return
            print(r.get("error", "the Forge did not open") + " Opening the classic window instead.")
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
    s.add_argument("--frames", type=int, default=None, help="default 8, or the look preset's with --style")
    s.add_argument("--fps", type=float, default=None, help="default 8, or the look preset's with --style")
    s.add_argument("--style", choices=sorted(STYLES), help="take frame count and speed from a look preset")
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
    s.add_argument("--world", help="a world prompt instead: object building tree ground effect ui icons portrait"); s.add_argument("--sref", help="hero sheet image URL (style reference)")
    s.add_argument("--reference", default="[SHEET IMAGE URL]", help="sheet image URL for the --cref prompts")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_prompt)

    s = sub.add_parser("project", help="the full pipeline on a project folder (what the app does)")
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--project", "-p", help="project folder (default: current folder or a parent)")
    common.add_argument("--json", action="store_true", help="machine-readable output")
    ps = s.add_subparsers(dest="project_cmd", required=True, parser_class=lambda **kw: argparse.ArgumentParser(parents=[common], **kw))
    x = ps.add_parser("new", help="create a project folder"); x.add_argument("folder"); x.add_argument("--name"); x.add_argument("--style", choices=sorted(STYLES), default=DEFAULT_PROJECT_STYLE, help="the look (default godmarrow: the game's, heroes 195 px)")
    ps.add_parser("status", help="what is done, what is next")
    x = ps.add_parser("reset", help="start a character over: delete what the steps made, keep the paintings and the shape file"); x.add_argument("character")
    x.add_argument("--all", action="store_true", help="also the imported paintings and the shape file"); x.add_argument("--steps", default=None, help="only these parts, e.g. frames,renders,export_game (redo from here)")
    ps.add_parser("blender-download", help="fetch the portable Blender (380 MB, no installer) and point the project at it")
    x = ps.add_parser("set", help="change settings (--style NAME sets the look; with --character only that character's)")
    x.add_argument("--style", choices=sorted(STYLES) + ["project"], help="a look preset ('pixelforge styles' lists them)"); x.add_argument("--character", help="give this character its own look ('project' follows the project again)"); x.add_argument("--blender"); x.add_argument("--directions", type=int); x.add_argument("--render-size", type=int); x.add_argument("--godot-res-dir")
    x = ps.add_parser("add", help="add a character"); x.add_argument("character"); x.add_argument("--describe")
    x = ps.add_parser("describe", help="set the description"); x.add_argument("character"); x.add_argument("describe")
    x = ps.add_parser("prompts", help="Midjourney prompts for the character"); x.add_argument("character"); x.add_argument("--reference", default="[SHEET IMAGE URL]")
    x = ps.add_parser("import", help="import an image"); x.add_argument("character"); x.add_argument("kind", choices=list(SOURCE_KINDS)); x.add_argument("file")
    x = ps.add_parser("run", help="run one step"); x.add_argument("character"); x.add_argument("step", choices=["split", "palette", "model", "rig", "render", "pixelate", "export", "shapes"])
    x.add_argument("--frame-step", type=int, default=2); x.add_argument("--elevation", type=float, default=30.0); x.add_argument("--passes", default=None, help="color,normal,depth")
    x.add_argument("--tolerance", type=float, default=None, help="split: background tolerance (default 0.08)"); x.add_argument("--views", type=int, choices=[3, 4], default=None, help="split: figures on the sheet")
    x.add_argument("--colors", type=int, default=None, help="palette: colours to keep (0 = every colour)")
    x.add_argument("--model-mode", choices=["auto", "template", "hull"], default=None, help="model: fit the human figure, or carve only"); x.add_argument("--height", type=float, default=None, help="model: metres")
    x.add_argument("--clips", default=None, help="rig: the moves, comma separated")
    x.add_argument("--per-clip", type=int, default=None, help="render: frames a move (24 smooth, 12 quick)"); x.add_argument("--actions", default=None, help="render: only these moves")
    x.add_argument("--outline", default=None, help="pixelate: auto | none | a hex colour")
    x = ps.add_parser("preview-gif", help="a looping GIF of one move from one direction (previews/<clip>_<dir>.gif)"); x.add_argument("character")
    x.add_argument("--clip", default="walk"); x.add_argument("--dir", default="S", help="S SW W NW N NE E SE")
    x = ps.add_parser("import-shapes", help="give a character a shape sprite (.shapes.json); it then renders with 'run <character> shapes' or render-shapes"); x.add_argument("character"); x.add_argument("file")
    x = ps.add_parser("render-shapes", help="render the character's shape sprite with the motion clips into frames (then export / export-game as usual)")
    x.add_argument("character"); x.add_argument("--style", default=None, help="a look preset (default: the character's / project's)"); x.add_argument("--clips", default=None); x.add_argument("--directions", default=None)
    x.add_argument("--elevation", type=float, default=None); x.add_argument("--passes", action="store_true")
    x.add_argument("--no-parts", dest="parts", action="store_false", help="skip the frame_NNN.parts.png part-id masks and the manifest's part table")
    x = ps.add_parser("preview-shapes", help="a GIF of one clip and direction straight from the character's shape sprite"); x.add_argument("character"); x.add_argument("--clip", default="idle"); x.add_argument("--direction", default="S"); x.add_argument("--style", default=None)
    x = ps.add_parser("export-game", help="export in Godmarrow's art/sprites format (+ normal/depth sets)"); x.add_argument("character")
    x.add_argument("--kind", help="sprite kind name (default: character name)"); x.add_argument("--out", help="output folder (default: characters/<name>/export_game)")
    x.add_argument("--category", default="hero"); x.add_argument("--name", help="display name")
    x.add_argument("--skin-for", dest="skin_for", default=None, metavar="CLASS", help="the game class this set stands in for in art/sprites/skins.json (default: the kind itself); written when --out is the game's sprites folder")
    x = ps.add_parser("check", help="the automatic checks on a character's cutouts, carve and frames (plain English)"); x.add_argument("character")
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
    s.add_argument("--key-all", action="store_true", help="also clear background-coloured pixels the border flood cannot reach (archways, gaps)")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_prop)

    s = sub.add_parser("tiles3d", help="iso ground tiles rendered in 3D (grass mud ash stone bone water snow) with lit transitions to a second material")
    s.add_argument("material"); s.add_argument("second", nargs="?"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/tiles")
    s.add_argument("--tiles", type=int, default=4); s.add_argument("--seed", type=int, default=1); s.add_argument("--ppu", type=float, default=108.0)
    s.add_argument("--res-dir", default="res://art/tiles"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_tiles3d)

    s = sub.add_parser("hero", help="THE OLD CUTOUT ROAD: a turnaround sheet -> a hero in the game, in one go (split, palette, model, rig, render, pixelate, export). Characters are shape sprites: see 'shapes'")
    s.add_argument("--cutout", action="store_true", help="I know this is the old cutout road; skip the note")
    s.add_argument("sheet"); s.add_argument("name"); s.add_argument("--project", default="forge", help="Forge project folder (made if missing)")
    s.add_argument("--describe", help="one sentence about the character"); s.add_argument("--to-game", help="the game's art/sprites folder (Godmarrow atlas); omit for plain Godot files")
    s.add_argument("--kind", help="atlas name in the game (default: the name)"); s.add_argument("--display-name")
    s.add_argument("--style", default="godmarrow"); s.add_argument("--per-clip", type=int, default=24); s.add_argument("--tolerance", type=float, default=0.1)
    s.add_argument("--model-mode", choices=["auto", "template", "hull"], default="auto"); s.add_argument("--clips"); s.add_argument("--passes", help="color,normal,depth")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_hero)

    s = sub.add_parser("object", help="a painted object/building/tree sheet -> carved, painted, filmed, pixelated prop (the hero way)")
    s.add_argument("sheet"); s.add_argument("--top", help="second sheet: plan view + underside side by side (carves the footprint, paints the top)"); s.add_argument("--canopy", action="store_true", help="a tree: the crown becomes crossed painted cards, not a carved blob"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/objects")
    s.add_argument("--height", type=float, default=1.0, help="metres"); s.add_argument("--views", type=int, choices=[2, 3, 4], help="figures on the sheet (default: detect)")
    s.add_argument("--tolerance", type=float, default=0.08); s.add_argument("--yaw", type=float, default=45.0); s.add_argument("--ppu", type=float, default=108.0)
    s.add_argument("--strength", type=float, default=0.35, help="grading strength (the painting already has the look)")
    s.add_argument("--game-objects"); s.add_argument("--hr", type=float, default=4.0); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_object)

    s = sub.add_parser("artlist", help="the Act I art order: every world asset with its style-locked Midjourney prompt, in order")
    s.add_argument("-o", "--out", help="write markdown here (default: print)"); s.add_argument("--sref", help="hero sheet image URL for --sref")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_artlist)

    s = sub.add_parser("prop3d", help="a 3D model (GLB/FBX/OBJ) -> graded, pixelated prop with a foot point (game camera + lantern light rig)")
    s.add_argument("model"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/objects")
    s.add_argument("--height", type=float, default=0.0, help="metres (0 = the model's own)"); s.add_argument("--yaw", type=float, default=45.0)
    s.add_argument("--ppu", type=float, default=108.0, help="final pixels per metre (heroes: ~108)"); s.add_argument("--scale", type=float, default=2.0, help="render at N x and press down")
    s.add_argument("--reference", help="image whose tones to grade toward (default: the Godmarrow painting target)"); s.add_argument("--strength", type=float, default=1.0)
    s.add_argument("--grime", type=float, default=0.45); s.add_argument("--bump", type=float, default=0.35); s.add_argument("--dust", type=float, default=0.25)
    s.add_argument("--no-outline", action="store_true"); s.add_argument("--game-objects"); s.add_argument("--hr", type=float, default=2.0)
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_prop3d)

    s = sub.add_parser("vfx", help="procedural looping effect sheet: fire, smoke, wisp, burst, embers")
    from .vfx import KINDS as _KINDS
    s.add_argument("kind", choices=list(_KINDS)); s.add_argument("name"); s.add_argument("-o", "--out", default="art/fx")
    s.add_argument("--size", type=int, nargs=2, metavar=("W", "H")); s.add_argument("--frames", type=int, default=None, help="default 8, or the look's"); s.add_argument("--fps", type=float, default=None, help="default 10, or the look's")
    s.add_argument("--palette", default="auto", help="preset (wisp lantern miasma bone smoke blood) or dark->bright hex list a,b,c")
    s.add_argument("--bands", type=int, default=None, help="colour bands (default 6, or the look's)"); s.add_argument("--seed", type=int, default=1)
    s.add_argument("--glow", choices=["auto", "on", "off"], default="auto", help="soft halo (auto: fire/wisp/burst only, or the look's rule)")
    s.add_argument("--haze", choices=["auto", "on", "off"], default="auto", help="a wide faint haze round the effect (auto: the look's; off without one)")
    s.add_argument("--style", choices=sorted(STYLES), help="take bands, glow, haze, frames and fps from a look preset")
    s.add_argument("--gif", action="store_true"); s.add_argument("--rotations", type=int, default=0, help="missiles: a sheet with N headings (rows), turned with RotSprite"); s.add_argument("--atlas", metavar="DIR", help="also write a Godmarrow sprite set (art/sprites) for SpriteSet")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_vfx)

    s = sub.add_parser("tiles", help="painted ground texture -> 2:1 iso diamond tiles (+16 transition tiles) and a Godot TileSet")
    s.add_argument("texture"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/tiles")
    s.add_argument("--second", help="second material for the transition tiles"); s.add_argument("--tile", type=int, nargs=2, default=None, metavar=("W", "H"), help="diamond size in texels (default 72 36, or the look's)")
    s.add_argument("--variants", type=int, default=6); s.add_argument("--colors", type=int, default=None, help="palette size (default every colour, or the look's)"); s.add_argument("--seed", type=int, default=1)
    s.add_argument("--style", choices=sorted(STYLES), help="take the tile size and palette size from a look preset")
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
    s.add_argument("--set", action="append", default=[], metavar="KNOB=VALUE", help="override a knob of the preset: freq=300 decay=0.4 lowpass=0.3 crush=5 duty=0.3 tail=0.2 (repeatable)")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_sfx)

    s = sub.add_parser("music", help="the music editor: new | compose | render | play-bar | export | edit | list | load | info | measure | build-library | blips, and the game's score (a cue key, all, act, sheet, list-cues)")
    s.add_argument("cue", help="a verb (new compose render play-bar export edit list load info measure build-library blips) or, for the game's score, a cue key, 'all', 'act' (with --act), 'sheet', 'list-cues'")
    s.add_argument("rest", nargs="*", help="the verb's arguments: the song file (new/render/play-bar/export/edit/info), a library name (load), audio files (measure)")
    s.add_argument("-o", "--out", default="art/music", help="the folder (or the .json path for compose/edit/load)")
    s.add_argument("--title", default=None); s.add_argument("--key", default=None, help="'C# minor', 'D dorian'"); s.add_argument("--tempo", type=float, default=None)
    s.add_argument("--bars", type=int, default=None, help="new: the first pattern's bars; compose: the length to aim for; play-bar: how many bars")
    s.add_argument("--genre", default=None, help="compose: " + ", ".join(["dungeon_synth", "gothic_orchestral", "gothic_march", "chiptune", "dark_ambient", "battle", "boss", "tavern", "town", "title", "victory", "sorrow", "exploration", "mana_dream", "synthwave"]) + "; list: filter")
    s.add_argument("--mood", default=None, help="compose: dark hopeful tense calm heroic sombre playful eerie")
    s.add_argument("--theme", default=None, help="list: godmarrow (the dark set) | general (bright pieces for other games) | all")
    s.add_argument("--name", default=None, help="render/export: the file name without its ending")
    s.add_argument("--lanes", default=None, help="render/play-bar: only these lanes, comma-separated")
    s.add_argument("--section", type=int, default=None); s.add_argument("--bar", type=int, default=None); s.add_argument("--pattern", default=None)
    s.add_argument("--op", action="append", default=[], help="edit: an operation as JSON or words ('transpose pattern=A semitones=2'); repeatable")
    s.add_argument("--ops-file", default=None, help="edit: a JSON list of operations")
    s.add_argument("--render", action="store_true", help="compose: also render the piece"); s.add_argument("--render-bar", action="store_true", help="edit: also render the edited pattern to bar.wav")
    s.add_argument("--no-loop", action="store_true", help="render: a plain ending instead of a seamless loop")
    s.add_argument("--seconds", type=float, default=120.0, help="the game's score: loop length")
    s.add_argument("--seed", type=int, default=None, help="compose: which piece; the score: another tune for the same place"); s.add_argument("--act", type=int, default=None)
    s.add_argument("--set", action="append", default=[], metavar="KNOB=VALUE", help="the score: override a knob: bpm=90 sc=phr root=45 drone=[38,0.03,300] (repeatable)")
    s.add_argument("--sheet", default=None, help="the score: a sheet JSON from 'music sheet' with your edits"); s.add_argument("--sheet-out", default=None)
    s.add_argument("--format", choices=["wav", "ogg", "both"], default="wav", help="ogg needs ffmpeg")
    s.add_argument("--no-preview", action="store_true", help="skip the waveform + spectrogram PNG")
    s.add_argument("--play", action="store_true", help="play the result when done"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_music)

    s = sub.add_parser("describe", help="describe it, get it: plain words -> a spell, skin edits, a prompt or a music cue (a draft to adjust)")
    s.add_argument("text", help='e.g. "a wisp lantern spell, pale blue, slow, with embers" or "make the left eye teal with a pale glow"')
    s.add_argument("--image", help="the cutout / sprite the words are about (locates eyes, hands, lantern...)"); s.add_argument("--as", dest="as_", choices=["spell", "skin", "prompt", "music"], default=None)
    s.add_argument("-o", "--out", default=None, help="spell / music: export here"); s.add_argument("--apply", action="store_true", help="skin: apply the ops to --image")
    s.add_argument("--seconds", type=float, default=60.0); s.add_argument("--json", action="store_true")
    s.add_argument("--bench", choices=["characters", "creatures", "objects", "effects", "tiles", "interface", "music", "sound"], default=None,
                   help="Claude on the bench: Claude Code does the job through PixelForge's MCP tools on --project (the Forge's describe line)")
    s.add_argument("-p", "--project", default=None, help="the project folder (with --bench)"); s.add_argument("--context", default=None, help="JSON: what is on the bench (model_file, song, effect...)")
    s.add_argument("--timeout", type=float, default=600.0); s.add_argument("--dry-run", dest="dry_run", action="store_true", help="only build the claude command")
    s.set_defaults(func=cmd_describe)

    s = sub.add_parser("claude", help="Claude Code on the bench: status | register (the MCP server, once) | log | undo <manifest>")
    cs = s.add_subparsers(dest="claude_cmd", required=True)
    x = cs.add_parser("status", help="ready / not found / not signed in, in a sentence"); x.add_argument("--json", action="store_true")
    x = cs.add_parser("register", help="`claude mcp add -s user pixelforge -- <python> -m pixelforge.cli mcp` (idempotent)"); x.add_argument("--python", default=None); x.add_argument("--json", action="store_true")
    x = cs.add_parser("log", help="the last job's log"); x.add_argument("-p", "--project", default="."); x.add_argument("--lines", type=int, default=40); x.add_argument("--json", action="store_true")
    x = cs.add_parser("undo", help="put a snapshot back (the manifest a describe --bench result names)"); x.add_argument("manifest"); x.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_claude)

    s = sub.add_parser("tools", help="the free tools the Forge uses instead of building their work: status (found or not, version, the install sentence) | explain <tool> | run <tool> <action>")
    ts = s.add_subparsers(dest="tools_cmd", required=True)
    x = ts.add_parser("status", help="every tool, found or not, with its version and the install step"); x.add_argument("--quick", action="store_true", help="skip the version calls"); x.add_argument("--json", action="store_true")
    x = ts.add_parser("explain", help="the install step for one tool, in a sentence"); x.add_argument("tool"); x.add_argument("--json", action="store_true")
    x = ts.add_parser("run", help="one adapter action: pixelforge tools run ffmpeg gif --params '{\"frames_dir\": \"...\"}'"); x.add_argument("tool"); x.add_argument("action")
    x.add_argument("--params", default="", help="the action's parameters as a JSON object"); x.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_tools)

    s = sub.add_parser("job", help="a job: one sentence -> a plan of steps (Claude writes it) carried out while the Forge watches: start | list | status | log | approve | cancel | resume | report")
    js = s.add_subparsers(dest="job_cmd", required=True)
    jc = argparse.ArgumentParser(add_help=False); jc.add_argument("-p", "--project", default=None); jc.add_argument("--json", action="store_true")
    x = js.add_parser("start", parents=[jc], help="plan and run a job from a sentence"); x.add_argument("text"); x.add_argument("--approve", choices=["steps", "none"], default="steps", help="steps: pause at the steps the plan marks; none: never pause")
    x.add_argument("--plan", default=None, help="a plan JSON of your own instead of asking Claude"); x.add_argument("--game", default=None, help="the game folder steps may write into"); x.add_argument("--no-run", action="store_true", help="write the plan only")
    js.add_parser("list", parents=[jc], help="every job of the project with its state")
    x = js.add_parser("status", parents=[jc], help="one job: its steps and their states"); x.add_argument("id")
    x = js.add_parser("log", parents=[jc], help="the job's log"); x.add_argument("id"); x.add_argument("--lines", type=int, default=40)
    x = js.add_parser("approve", parents=[jc], help="approve the step a job waits at (then `resume`, or --run here)"); x.add_argument("id"); x.add_argument("--step", default=None); x.add_argument("--run", action="store_true")
    x = js.add_parser("cancel", parents=[jc], help="stop a job"); x.add_argument("id")
    x = js.add_parser("resume", parents=[jc], help="carry on from the last finished step"); x.add_argument("id")
    x = js.add_parser("report", parents=[jc], help="write and print the report"); x.add_argument("id")
    s.set_defaults(func=cmd_job)

    s = sub.add_parser("midjourney", help="Midjourney through the owner's Chrome (Claude in Chrome): fetch a painting for a prompt, or print the prompt")
    ms = s.add_subparsers(dest="midjourney_cmd", required=True)
    for name in ("fetch", "prompt"):
        x = ms.add_parser(name, help="paint it and download the picks into --out" if name == "fetch" else "the prompt a fetch would use")
        x.add_argument("--prompt", default=None, help="the whole prompt; or --kind with --describe")
        x.add_argument("--kind", default="sheet_px", help="sheet sheet_px sheet4 sheet_t front back sprite item | turnaround | props9")
        x.add_argument("--describe", default=None, help="the one-sentence description the kind's template takes")
        x.add_argument("--image", default=None, help="an image prompt (a clay view of the model)")
        x.add_argument("-o", "--out", default="midjourney"); x.add_argument("-p", "--project", default=".")
        x.add_argument("--pick", choices=["best", "all"], default="best"); x.add_argument("--timeout", type=float, default=900.0)
        x.add_argument("--dry-run", dest="dry_run", action="store_true"); x.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_midjourney)

    s = sub.add_parser("shapes", help="shape sprites: characters and objects drawn by code (.shapes.json) rendered as pixel art with real frame animation in 8 directions")
    ss = s.add_subparsers(dest="shapes_cmd", required=True)
    def _render_args(x, out_default=None):
        x.add_argument("file", help="a .shapes.json")
        x.add_argument("--style", default=None, help="a look preset: figure height, ramp length (bands) and outline rule (default for a character: godmarrow, the game's 195 px; objects: the file's own size; also gothic_hd, rendered_arpg, ...)")
        x.add_argument("--scale", type=float, default=None, help="render scale instead of the preset's (1 = the file's own size; given, no preset is assumed)")
        x.add_argument("--steps", type=int, default=None, help="ramp length instead of the preset's (0/omitted = each ramp's own)")
        x.add_argument("--outline", default=None, help="none | auto | #rrggbb (default: the preset's rule)")
        x.add_argument("--elevation", type=float, default=None, help="camera degrees above level (default: the file's view)")
        x.add_argument("--frames", type=int, default=None, help="at most this many frames per clip (default: the preset's clip cap)")
        x.add_argument("--zoom", type=int, default=3)
        x.add_argument("--json", action="store_true")
    x = ss.add_parser("render", help="every clip in every direction -> frames folder (+ animations.json, manifest.json) that export / export-game read")
    _render_args(x); x.add_argument("-o", "--out", required=True); x.add_argument("--clips", default=None, help="comma list (default idle,walk,run,attack,cast,hit,death)")
    x.add_argument("--directions", default=None, help="comma list of S,SE,E,NE,N,NW,W,SW (default all)"); x.add_argument("--passes", action="store_true", help="also normal and depth frames")
    x.add_argument("--no-parts", dest="parts", action="store_false", help="skip the frame_NNN.parts.png part-id masks and the manifest's part table")
    x.add_argument("--gif", action="store_true", help="also a GIF per clip and direction")
    x = ss.add_parser("preview", help="a looping GIF of one clip in one direction"); _render_args(x)
    x.add_argument("--clip", default="idle"); x.add_argument("--direction", default="S"); x.add_argument("-o", "--out", default=None)
    x = ss.add_parser("sheet", help="a contact sheet: a row per clip and direction"); _render_args(x)
    x.add_argument("-o", "--out", required=True); x.add_argument("--clips", default=None); x.add_argument("--directions", default=None); x.add_argument("--columns", type=int, default=8)
    x = ss.add_parser("still", help="one frame of the file (its own animation rules, no clip); with --game-objects also an objects.json entry"); _render_args(x)
    x.add_argument("-o", "--out", required=True); x.add_argument("--frame", type=int, default=0); x.add_argument("--direction", default="S"); x.add_argument("--passes", action="store_true")
    x.add_argument("--no-parts", dest="parts", action="store_false", help="skip the <stem>.parts.png part-id mask")
    x.add_argument("--game-objects", dest="game_objects", default=None, metavar="OBJECTS_JSON", help="add the PNG to the game's art/objects/objects.json (png, ox, oy, hr)")
    x.add_argument("--name", default=None, help="the objects.json key (default: the file's name)"); x.add_argument("--hr", type=float, default=2.0, help="texels per world px (2 for the game's objects)")
    x = ss.add_parser("object", help="a file as a game object: trimmed PNGs with foot anchors per direction, <name>.json, optional objects.json entries"); _render_args(x)
    x.add_argument("-o", "--out", required=True, help="the folder to write into (e.g. the game's art/objects)"); x.add_argument("--name", default=None)
    x.add_argument("--directions", default=None, help="comma list (default S); the first is also written as <name>.png"); x.add_argument("--frame", type=int, default=0)
    x.add_argument("--game-objects", dest="game_objects", default=None, metavar="OBJECTS_JSON"); x.add_argument("--hr", type=float, default=2.0)
    x = ss.add_parser("turntable", help="a solid file spinning through 48 views (GIF) plus its 8 game views"); _render_args(x); x.add_argument("-o", "--out", required=True)
    x.add_argument("--no-parts", dest="parts", action="store_false", help="skip the <stem>_parts/ part-id masks")
    x = ss.add_parser("validate", help="check a .shapes.json and summarise it"); x.add_argument("file"); x.add_argument("--json", action="store_true")
    x = ss.add_parser("template", help="the author pose (bone heads and tails) for a figure height, to draw shapes around")
    x.add_argument("--height", type=int, default=120); x.add_argument("-o", "--out", default=None, help="write the table as JSON"); x.add_argument("--png", default=None, help="write a stick figure"); x.add_argument("--json", action="store_true")
    x = ss.add_parser("draft", help="describe it: a sentence -> a starter .shapes.json (a humanoid with the costume words as parts and materials)")
    x.add_argument("text"); x.add_argument("-o", "--out", default=None); x.add_argument("--height", type=int, default=120); x.add_argument("--json", action="store_true")
    x.add_argument("--from-measure", dest="from_measure", default=None, metavar="M.json", help="size the head, torso, belt, skirt, cape and limbs from a 'shapes measure' file")
    x = ss.add_parser("measure", help="painting to shapes: read the figure's silhouette widths per height band from its views (cutouts on a transparent or plain background) into a measurements JSON")
    x.add_argument("front"); x.add_argument("side", nargs="?", default=None); x.add_argument("back", nargs="?", default=None)
    x.add_argument("-o", "--out", default=None, help="write the measurements here (what draft --from-measure reads)"); x.add_argument("--json", action="store_true")
    x = ss.add_parser("sample-materials", help="painting to shapes: the painting's colours under each material's region become that material's ramp (OKLab k-means), written into the model")
    x.add_argument("front"); x.add_argument("--model", required=True, help="the .shapes.json to colour"); x.add_argument("-o", "--out", default=None, help="write here instead of in place")
    x.add_argument("--height", type=int, default=240, help="the px height the model is matched to the painting at"); x.add_argument("--only", default=None, help="comma list of materials to sample (default all)")
    x.add_argument("--json", action="store_true")
    x = ss.add_parser("compare", help="painting beside sprite at one height, per view (front/S, side/E, back/N), with the silhouette overlap"); _render_args(x)
    x.add_argument("--ref", required=True, help="the concept sheet (three views) or one view, on a plain or transparent background"); x.add_argument("-o", "--out", required=True)
    x.add_argument("--height", type=int, default=195, help="the px height both are shown at (195 = the game's heroes)"); x.add_argument("--views", default=None, help="the sheet's view names in order, e.g. front,side,back")
    x = ss.add_parser("joints", help="re-export the joint tracks of the motion clips from the animation library (numpy, no Blender)")
    x.add_argument("--glb", default=None); x.add_argument("-o", "--out", default=None); x.add_argument("--fps", type=int, default=24); x.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_shapes)

    s = sub.add_parser("character", help="THE PICTURE ROAD: a Midjourney picture (one figure or a turnaround sheet) -> cutouts, measured, a shape model drafted and coloured from it, imported into the project, drawn beside the painting")
    cs = s.add_subparsers(dest="character_cmd", required=True)
    x = cs.add_parser("from-picture", help="the whole road in one go: cut, measure, draft, sample materials, check, import, draw a still and the compare picture")
    x.add_argument("picture", nargs="+", help="one picture (a figure, or a sheet with the views side by side) or the views as separate files: front [side] [back]")
    x.add_argument("--name", default=None, help="the character's name (default: the picture's file name, which Midjourney writes the prompt into)")
    x.add_argument("-p", "--project", required=True, help="the project folder (made when it does not exist)")
    x.add_argument("--style", default=DEFAULT_PROJECT_STYLE, choices=sorted(STYLES), help="the look the still and the compare picture are drawn at (default godmarrow, the game's 195 px)")
    x.add_argument("--height", type=int, default=120, help="the file's author height in units (default 120)")
    x.add_argument("--text", default=None, help="the costume sentence the draft reads instead of the file name's words")
    x.add_argument("--json", action="store_true")
    for name, helptext in (("measure", "measure the saved cutouts again and size the model's rings and limbs from them, then draw"),
                           ("sample", "take the front view's colours into the model's ramps again, then draw"),
                           ("compare", "the still and the compare picture again (painting beside sprite per view, with the overlap)")):
        x = cs.add_parser(name, help=helptext)
        x.add_argument("character"); x.add_argument("-p", "--project", required=True); x.add_argument("--style", default=None, choices=sorted(STYLES)); x.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_character)

    s = sub.add_parser("game-preview", help="see it in the game: launch Godot with a skin, effects or attachments on the moor (or take a screenshot)")
    s.add_argument("--game", default=None, help="the Godot project folder (found upward from here when omitted)"); s.add_argument("--godot", default=None)
    s.add_argument("--skin", default=None, help="a sprite set kind, e.g. keeper"); s.add_argument("--cls", default=None); s.add_argument("--zone", default="moor")
    s.add_argument("--fx", default=None, help="effects to play at the hero: a,b"); s.add_argument("--attach", action="store_true", help="the effects editor's attachments on the skin")
    s.add_argument("--shot", default=None, help="save a screenshot here after --shot-t seconds and quit"); s.add_argument("--shot-t", dest="shot_t", type=float, default=4.0)
    s.add_argument("--place", default=None, help="objects from the game's objects.json stood next to the hero for a look: a,b (the Forge's objects)")
    s.add_argument("--timeout", type=float, default=None, help="seconds to wait for a --shot or --wait run before reporting it stopped (default 180, or PIXELFORGE_GAME_TIMEOUT)")
    s.add_argument("--hour", type=float, default=None); s.add_argument("--wait", action="store_true"); s.add_argument("--json", action="store_true")
    s.add_argument("--play", action="store_true", help="just start the game, no test arguments (the Forge app's Play)")
    s.add_argument("--import", dest="do_import", action="store_true", help="make the game notice new files (a headless import pass), then exit")
    s.set_defaults(func=cmd_game_preview)

    s = sub.add_parser("forge", help="open the Forge app (PixelForge for people: full screen, in the dungeon framing)")
    s.add_argument("--project", default=None, help="the Forge project folder (default: Documents/PixelForge/Forge)"); s.add_argument("--godot", default=None)
    s.add_argument("--screen", default=None, help="open a screen directly: home characters creatures objects effects tiles interface sound music settings")
    s.add_argument("--windowed", action="store_true"); s.add_argument("--wait", action="store_true", help="block until the app closes")
    s.add_argument("--json", action="store_true"); s.add_argument("extra", nargs="*", help="more arguments for the app (after --)")
    s.add_argument("--no-update", action="store_true", help="do not pull the latest PixelForge first")
    s.set_defaults(func=cmd_forge)

    s = sub.add_parser("effect", help="painted spell / missile art (Midjourney, on black) -> an animated game effect in the vfx layout")
    s.add_argument("image"); s.add_argument("name"); s.add_argument("-o", "--out", default="art/fx")
    s.add_argument("--kind", choices=["missile", "loop", "burst", "frames"], default="loop", help="missile: spins + sheds chips; loop: breathes/flickers; burst: one-shot grow + dissolve; frames: a painted strip of key frames")
    s.add_argument("--preset", default="glow", help="loop motion: glow | flame | hover | idle | cloak | grass"); s.add_argument("--frames", type=int, default=8); s.add_argument("--fps", type=float, default=10.0)
    s.add_argument("--width", type=int, default=None, help="game pixels across (default: the painting's own size)"); s.add_argument("--rotations", type=int, default=0, help="missiles: N headings")
    s.add_argument("--seed", type=int, default=1); s.add_argument("--tolerance", type=float, default=0.1); s.add_argument("--no-gif", action="store_true"); s.add_argument("--atlas", default=None); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_effect)

    s = sub.add_parser("effects", help="the effects engine: list | render NAME | graph FILE | preview NAME (GIF) | nodes; levers by name")
    s.add_argument("action", choices=["list", "render", "graph", "preview", "nodes"]); s.add_argument("name", nargs="?", default="", help="render/preview: an effect (or an old vfx kind); graph: a .graph.json")
    s.add_argument("-o", "--out", default="art/fx"); s.add_argument("--lever", action="append", metavar="K=V", help="a lever, repeatable: --lever size=1.4 --lever speed=0.8")
    s.add_argument("--as", dest="as_name", default="", help="the output name (default: the effect's)"); s.add_argument("--family", default="", help="list: one family")
    s.add_argument("--palette", default="", help="swap every ramp: a palette name or dark->bright hex list a,b,c"); s.add_argument("--bands", type=int, default=None, help="every ramp's step count")
    s.add_argument("--size", type=int, nargs=2, metavar=("W", "H")); s.add_argument("--frames", type=int, default=None); s.add_argument("--fps", type=float, default=None); s.add_argument("--seed", type=int, default=None)
    s.add_argument("--gif", action="store_true"); s.add_argument("--rotations", type=int, default=0, help="a missile sheet with N headings"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_effects)

    s = sub.add_parser("spell", help="spell designer: layered effects (fire + burst + embers...) -> strip + json (+ gif, atlas)")
    s.add_argument("action", choices=["new", "render", "presets"]); s.add_argument("name", nargs="?", default="fireball", help="new: the spell's name; render: a .spell.json")
    s.add_argument("-o", "--out", default="art/fx"); s.add_argument("--preset", default="fireball", help="fireball | ward | soul_drain | bone_shatter | lightning_strike")
    s.add_argument("--gif", action="store_true"); s.add_argument("--atlas", help="also write a sprite set into this folder"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_spell)

    s = sub.add_parser("skin", help="edit a cutout / sprite / atlas with ops (recolor, glow, paint, erase, restore, region, smooth): what the skin editor does, headless")
    s.add_argument("image"); s.add_argument("ops", help="a JSON list of ops, or a path to one (the editor's 'Save ops as JSON')")
    s.add_argument("-o", "--out", default=None, help="write here instead of in place"); s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_skin)

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

    s = sub.add_parser("styles", help="the look presets (figure height, palette, outline, shading, effects, loops, tiles) and animated examples")
    s.add_argument("--demo", metavar="OUT", help="write a GIF per preset (the Keeper animated in that look + an effect loop), a contact sheet and styles.json into OUT")
    s.add_argument("--source", help="a front cutout PNG to use instead of the bundled Keeper")
    s.add_argument("--only", help="comma-separated preset names for --demo (default: every look)")
    s.add_argument("--effect", default="wisp", help="the effect loop shown beside the figure in --demo (default wisp)")
    s.add_argument("--json", action="store_true")
    s.set_defaults(func=cmd_styles)

    s = sub.add_parser("studio", help="open PixelForge (updates first; the Forge app, or the classic window with --classic)")
    s.add_argument("project", nargs="?")
    s.add_argument("--classic", action="store_true", help="the older window with every form")
    s.add_argument("--no-update", action="store_true", help="do not pull the latest PixelForge first")
    s.set_defaults(func=cmd_studio)

    from .d2.cli import add_parser as _add_d2
    _add_d2(sub)

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
