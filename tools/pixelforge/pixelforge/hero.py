"""One command: a turnaround sheet -> a hero in the game.

    pixelforge hero sheet.png keeper --describe "..." --project ./forge --to-game <godot project>/art/sprites

Creates (or reuses) a Forge project, imports the sheet, then split -> palette -> model -> rig -> render -> pixelate ->
export-game, stopping with a plain message if a step needs a person. Every step can be re-run on its own with
`pixelforge project run <name> <step>` in that project folder.
"""

from __future__ import annotations

from pathlib import Path

from . import api
from .project import Project


def make_hero(sheet: str | Path, name: str, project_dir: str | Path, *, describe: str = "", to_game: str | Path | None = None,
              kind: str | None = None, display_name: str | None = None, style: str = "godmarrow", per_clip: int = 12, tolerance: float = 0.1,
              model_mode: str = "auto", clips: str | None = None, passes: str | None = None, log=None) -> dict:
    say = log or print
    project_dir = Path(project_dir)
    if not (project_dir / "project.json").exists():
        api.new_project(project_dir, project_dir.name or "Forge", style=style)
    p = Project.load(project_dir)
    if name not in p.characters:
        api.add_character(p, name, describe)
    p = Project.load(project_dir)
    c = p.character(name)
    c.settings["model_mode"] = model_mode
    api.import_source(p, name, "sheet", sheet)
    p = Project.load(project_dir)
    say(f"[{name}] split")
    api.split(p, name, tolerance=tolerance)
    say(f"[{name}] palette")
    api.make_palette(p, name)
    say(f"[{name}] model")
    api.build_model(p, name, log=say)
    say(f"[{name}] model: {p.character(name).notes.get('model_note', '')}")
    say(f"[{name}] rig")
    r = api.rig(p, name, clips=clips or api.DEFAULT_CLIPS, log=say)
    say(f"[{name}] clips: {', '.join(r['animations'])}")
    say(f"[{name}] render (this is the slow step)")
    r = api.render(p, name, per_clip=per_clip, passes=passes, log=say)
    say(f"[{name}] rendered {sum(a['frames'] for a in r['manifest']['actions'].values())} frames x 8 directions")
    say(f"[{name}] pixelate")
    api.pixelate_renders(p, name, outline="auto", log=say)
    result = {"ok": True, "name": name, "project": str(project_dir)}
    if to_game:
        say(f"[{name}] export to the game")
        r = api.export_game(p, name, kind or name, out_dir=to_game, category="hero", display_name=display_name or name)
        result["game"] = r["color"]
        say(f"[{name}] {r['color']['png']}  ({r['color']['frames']} frames)")
    else:
        r = api.export(p, name)
        result["godot"] = r.get("godot")
    return result
