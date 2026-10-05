"""``pixelforge d2 ...``: the command line of the Diablo 2 bridge (what the Forge and Claude on the bench run)."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .paths import D2Error, RepoTreeError, find_install, load_settings, reference_dir, save_settings


def doctor(project: str | None = None) -> dict:
    """Diablo 2 on this computer, in plain words: the install, the extractor, the reference folder, d2animdata."""
    from .extract import extractor, find_mpq_editor, find_smpq, missing_tool_sentence
    inst = find_install(project)
    ref = reference_dir(project)
    try:
        import d2animdata  # type: ignore  # noqa: F401
        anim = {"ok": True, "words": "d2animdata is installed (the AnimData.d2 tool)"}
    except ImportError:
        anim = {"ok": True, "words": "d2animdata is not installed; the built-in AnimData.d2 reader stands in (`pip install d2animdata` or `pixelforge d2 fetch-tools`)"}
    ext = extractor(ref, project)
    out = {"game": inst, "reference": {"path": str(ref), "exists": ref.exists(),
                                        "words": f"the reference folder is {ref}" + ("" if ref.exists() else " (made on the first import)")},
           "extractor": {"ok": ext is not None, "tool": ext, "words": (f"{ext['tool']} at {ext['exe']}" if ext else missing_tool_sentence(inst.get("kind") or "classic"))},
           "animdata_tool": anim, "settings": load_settings(project)}
    if ref.exists():
        from .source import D2Source
        try:
            out["reference"]["has"] = D2Source(ref, project=project, extract=False).describe()
        except Exception as e:  # noqa: BLE001
            out["reference"]["has"] = {"error": str(e)}
    out["ok"] = bool(inst["ok"]) and (ext is not None or inst.get("kind") == "resurrected")
    words = []
    words.append(f"Diablo 2 ({inst['kind']}) at {inst['path']}, found through {inst['how']}." if inst["ok"] else inst["error"])
    words.append(out["extractor"]["words"] if inst.get("kind") != "resurrected" else "Resurrected keeps its files in a CASC store: extract data/global with CascView into the reference folder once.")
    words.append(out["reference"]["words"] + ".")
    words.append(anim["words"] + ".")
    out["words"] = " ".join(words)
    return out


def add_parser(sub) -> None:
    s = sub.add_parser("d2", help="Diablo 2: import their sprites to study and play with, export ours as a mod, play him in Diablo 2, port the mechanics (groundwork)")
    ds = s.add_subparsers(dest="d2_cmd", required=True)

    def common(x, project=True):
        x.add_argument("--reference", default=None, help="the local reference folder for the game's files (default ~/PixelForge Reference/d2, or PIXELFORGE_D2_DIR)")
        x.add_argument("--game", default=None, help="the Diablo 2 folder (default: the settings, the registry, the usual folders)")
        if project:
            x.add_argument("-p", "--project", default=None, help="a Forge project folder (its d2.json settings; the character's frames)")
        x.add_argument("--json", action="store_true")

    x = ds.add_parser("doctor", help="the game, the extractor, the reference folder and the tools on this computer, in plain words"); common(x)
    x = ds.add_parser("list", help="what the install (or the reference folder) has: tokens, palettes, tables"); common(x)
    x = ds.add_parser("fetch-tools", help="download Ladik's MPQ Editor (Windows) and install d2animdata"); common(x)
    x = ds.add_parser("set", help="remember the game folder, the reference folder or the extractor"); common(x)
    x.add_argument("--mpq-editor", default=None)
    x = ds.add_parser("import", help="their sprites of one token (NE, SK, ...) into our frames layout: frames/<clip>_<DIR>/frame_NNN.png + animations.json")
    x.add_argument("--token", required=True); x.add_argument("--out", required=True, help="the frames folder to make (outside the repository)")
    x.add_argument("--kind", choices=["character", "monster", "object"], default=None); x.add_argument("--act", type=int, default=1, help="the act palette (1..5)")
    x.add_argument("--weapon-class", default=None, help="which COFs to take (default HTH)"); x.add_argument("--variant", default="LIT", help="the armour class of the sprites (LIT, MED, HVY, ...)")
    x.add_argument("--modes", default=None, help="only these modes, comma separated (NU,WL,A1)"); x.add_argument("--no-extract", action="store_true", help="never run the extractor")
    common(x)
    x = ds.add_parser("measure", help="numbers on imported sets: figure heights, frames a clip, speeds, directions, palette use, outline, shadow")
    x.add_argument("frames", nargs="+", help="frames folders written by `d2 import` (or a folder holding several)")
    x.add_argument("--md", default=None, help="write the report as Markdown here (docs/track_notes/d2_measure.md in the repository)")
    x.add_argument("--write-preset", default=None, metavar="NAME", help="lay the measured figure height, clip frames and fps over this look preset (assets/styles/overrides.json)")
    common(x)
    x = ds.add_parser("export-mod", help="our frames as a Diablo 2 mod: DCC + COF per mode, AnimData.d2, the mod folder, read back whole")
    x.add_argument("--character", default=None, help="a project character (its frames folder)"); x.add_argument("--frames", default=None, help="or a frames folder")
    x.add_argument("--as", dest="token", required=True, help="the token to write (NE replaces the Necromancer; a new two-letter token for a monster skin)")
    x.add_argument("--mod", required=True, help="the mod's name"); x.add_argument("--out", required=True, help="the root to write under (the game folder to play; any folder to look)")
    x.add_argument("--target", choices=["character", "monster"], default="character"); x.add_argument("--layout", choices=["direct", "d2r"], default="direct")
    x.add_argument("--act", type=int, default=1); x.add_argument("--height", type=int, default=None, help="resample the figure to this many px (lossy; Diablo 2 heroes are about 75)")
    x.add_argument("--weapon-classes", default=None, help="comma separated (default: the token's usual set)"); x.add_argument("--only-our-clips", action="store_true")
    x.add_argument("--dc6", action="store_true", help="write DC6 instead of DCC (for a token that uses DC6)"); x.add_argument("--name", default=None, help="a monster's display name / id")
    common(x)
    x = ds.add_parser("play", help="Play him in Diablo 2: find the install, build the mod into it, write the shortcut, start the game (asks first)")
    x.add_argument("--character", required=True); x.add_argument("--as", dest="token", default="NE", help="the player token he stands in for (default NE, the Necromancer)")
    x.add_argument("--mod", default=None); x.add_argument("--yes", action="store_true", help="agree to writing into the game folder and starting the game")
    x.add_argument("--no-launch", action="store_true"); x.add_argument("--height", type=int, default=None); x.add_argument("--weapon-classes", default=None)
    common(x)
    x = ds.add_parser("port-skills", help="a class's first skills as Skills.txt / SkillDesc.txt rows on the nearest Diablo 2 templates")
    x.add_argument("--class", dest="class_name", required=True, help="KEEPER (Shrine Keeper), animancer, ossumancer, hemomancer, monk")
    x.add_argument("--out", required=True); x.add_argument("--count", type=int, default=3); x.add_argument("--skills", default=None, help="data/skills.json (default: the repository's)")
    common(x)
    x = ds.add_parser("demo-token", help="a made-up token in the game's layout, to try the import without the game"); x.add_argument("--out", required=True); x.add_argument("--token", default="ZZ")
    x.add_argument("--kind", choices=["character", "monster"], default="character"); common(x, project=False)
    x = ds.add_parser("remove-mod", help="delete what an export wrote (pixelforge_mod.json lists it)"); x.add_argument("mod_dir"); common(x, project=False)
    s.set_defaults(func=run)


def _progress(step: str, words: str, done: int = 0, total: int = 0) -> None:
    print(f"PF_PROGRESS step={step} done={done} total={total} note={words.replace(' ', '+')}", file=sys.stderr, flush=True)


def run(a) -> None:
    from ..cli import _emit
    try:
        r = _run(a)
    except (D2Error, RepoTreeError) as e:
        r = {"ok": False, "error": str(e)}
    except FileNotFoundError as e:
        r = {"ok": False, "error": f"a file is missing: {e}"}
    if getattr(a, "json", False):
        print(json.dumps(r, indent=2, default=str))
    elif r.get("ok", True):
        if r.get("words"):
            print(r["words"])
        else:
            _emit(a, r)
    else:
        print(r.get("error", r))
    if not r.get("ok", True):
        raise SystemExit(1)


def _run(a) -> dict:
    sub = a.d2_cmd
    project = getattr(a, "project", None)
    log = (lambda words: _progress("d2", words)) if getattr(a, "json", False) else print
    if sub == "doctor":
        return doctor(project)
    if sub == "set":
        f = save_settings({"game": a.game, "reference": a.reference, "mpq_editor": a.mpq_editor}, project)
        return {"ok": True, "file": str(f), "settings": load_settings(project), "words": f"remembered in {f}"}
    if sub == "fetch-tools":
        from .extract import fetch_tools
        r = fetch_tools(reference_dir(project, a.reference), log)
        r["words"] = "; ".join(f"{s['tool']}: {'ready' if s['ok'] else 'not ready'}{(' (' + s['note'] + ')') if s.get('note') else ''}" for s in r["steps"])
        return r
    if sub == "demo-token":
        from .synthetic import make_token
        r = make_token(a.out, a.token, a.kind)
        r.update(ok=True, words=f"a made-up {a.kind} token {a.token} now stands in {a.out}; `pixelforge d2 import --token {a.token} --reference {a.out} --out <folder>` reads it")
        return r
    if sub == "remove-mod":
        from .modexport import remove_mod
        r = remove_mod(a.mod_dir)
        r["words"] = f"removed {r['removed']} files"
        return r
    from .source import D2Source
    if sub == "list":
        src = D2Source(a.reference, a.game, project, extract=False)
        d = src.describe()
        d["ok"] = True
        n = len(d["characters"]) + len(d["monsters"]) + len(d["objects"])
        d["words"] = (f"{d['reference']}: {len(d['characters'])} character tokens {d['characters']}, {len(d['monsters'])} monster tokens, {len(d['objects'])} object tokens, "
                      f"palettes {d['palettes']}, animdata {'yes' if d['animdata'] else 'no'}, {len(d['excel'])} tables." if n else
                      f"nothing extracted yet under {d['reference']}" + (f"; the game is at {d['install']} ({d['kind']}): `pixelforge d2 import --token NE --out <folder>` extracts what it needs" if d["install"] else
                                                                      "; " + find_install(project, a.game)["error"]))
        return d
    if sub == "import":
        from .importer import import_token
        src = D2Source(a.reference, a.game, project, extract=not a.no_extract, log=log)
        r = import_token(a.token, a.out, src, kind=a.kind, act=a.act, weapon_class=a.weapon_class, variant=a.variant, modes=a.modes.split(",") if a.modes else None, log=log)
        r["words"] = (f"{r['token']} ({r['kind']}): {len(r['clips'])} clips, {r['frame_count']} frames into {r['frames_dir']} (canvas {r['canvas']} px, "
                      f"{r['palette_indices_used']} palette indices used). Open the folder on the Characters bench, or `pixelforge d2 measure {r['frames_dir']}`.")
        return r
    if sub == "measure":
        from .measure import measure
        dirs = []
        for f in a.frames:
            p = Path(f)
            if (p / "animations.json").exists():
                dirs.append(p)
            else:
                dirs += sorted(q.parent for q in p.glob("*/animations.json"))
        if not dirs:
            raise D2Error(f"no frames folders (animations.json) under {a.frames}")
        r = measure(dirs, a.md, a.write_preset)
        s = r["suggestion"]
        r["words"] = (f"{len(dirs)} sets measured: hero figure {s['figure_height']} px, {s['clip_frames']} frames a clip at {s['clip_fps']} fps (walk {s['walk_fps']}), outline {s['outline']}."
                      + (f" Written to {r['markdown']}." if r.get("markdown") else "") + (f" Laid over the {a.write_preset} preset." if a.write_preset else " The preset is unchanged (--write-preset applies them)."))
        return r
    if sub == "export-mod":
        from .modexport import export_mod
        if a.character:
            if not project:
                raise D2Error("--character needs -p PROJECT (or give --frames)")
            from .play import frames_dir_for
            frames = frames_dir_for(project, a.character)
        elif a.frames:
            frames = Path(a.frames)
        else:
            raise D2Error("give --character NAME -p PROJECT or --frames DIR")
        src = D2Source(a.reference, a.game, project, log=log)
        r = export_mod(frames, a.token, a.mod, a.out, target=a.target, layout=a.layout, act=a.act, source=src, height=a.height, display_name=a.name,
                       weapon_classes=a.weapon_classes.split(",") if a.weapon_classes else None, only_our_clips=a.only_our_clips, use_dc6=a.dc6, log=log)
        v = r["validation"]
        r["words"] = (f"{r['file_count']} files under {r['mod_dir']} ({r['layout']}: start the game with {' '.join(r['flags'])}); {len(r['modes'])} modes; {r['colour_loss']['words']}; "
                      + (f"every file read back whole ({v['files_checked']} checked)." if v["ok"] else f"{len(v['problems'])} files did not read back: {v['problems'][:2]}"))
        return r
    if sub == "play":
        from .play import play
        if not project:
            raise D2Error("play needs -p PROJECT (the Forge project with the character)")
        return play(a.character, project, token=a.token, mod_name=a.mod, yes=a.yes, launch=not a.no_launch, install_hint=a.game, height=a.height,
                    weapon_classes=a.weapon_classes.split(",") if a.weapon_classes else None, log=log)
    if sub == "port-skills":
        from .port import port_skills
        try:
            src = D2Source(a.reference, a.game, project, extract=False)
        except (D2Error, RepoTreeError):
            src = None
        r = port_skills(a.class_name, a.out, count=a.count, source=src, skills_file=a.skills)
        r["words"] = f"{r['class']} -> {r['d2_class']} ({r['charclass']}): " + "; ".join(f"{s['name']} on {s['template']}" for s in r["skills"]) + f". {r['note']}. Files: {', '.join(r['files'])}."
        return r
    raise D2Error(f"unknown d2 command {sub}")
