"""Godot, through the finder game_preview already has (PIXELFORGE_GODOT, PATH, tools/godot, the usual folders): the
headless import pass, a script run, a screenshot of the game with a skin or effect, and the Forge's own checks."""

from __future__ import annotations

from pathlib import Path

from . import _base as B

NAME = "godot"
TITLE = "Godot"
WHAT = "the game engine: a headless import of new art, scripts run headless (the Forge's checks), the game opened with a skin or an effect for a look or a screenshot"
HOME = "https://godotengine.org/download/"
LICENCE = "MIT"
INSTALL = "Download Godot 4.7 from godotengine.org/download (one executable, no installer) and put it on PATH, in tools/godot, or in PIXELFORGE_GODOT."


def find() -> str | None:
    from ..game_preview import find_godot
    return B.env_override(NAME) or find_godot(None)


def version(exe: str) -> str:
    return B.version_of(exe, "--version")


def explain_missing() -> str:
    return INSTALL


def import_command(exe: str, project: str) -> list[str]:
    return [exe, "--headless", "--path", str(project), "--import"]


def script_command(exe: str, project: str, script: str) -> list[str]:
    s = str(script)
    if not s.startswith("res://"):
        try:
            s = "res://" + Path(s).resolve().relative_to(Path(project).resolve()).as_posix()
        except ValueError:
            pass
    return [exe, "--headless", "--path", str(project), "--script", s]


def import_project(project: str, timeout: float = 900.0) -> dict:
    """`godot --headless --import` so the game's loaders see new files (minutes on a fresh checkout, seconds after)."""
    exe = find()
    cmd = import_command(exe, project)
    r = B.call(cmd, timeout, cwd=project)
    return {"ok": r.returncode == 0, "command": cmd, "tail": (r.stdout + r.stderr)[-600:].strip()}


def run_script(project: str, script: str, timeout: float = 600.0) -> dict:
    """A SceneTree script run headless (`--script res://tools/x.gd`), as the Forge's checks are."""
    exe = find()
    cmd = script_command(exe, project, script)
    r = B.call(cmd, timeout, cwd=project)
    return {"ok": r.returncode == 0, "command": cmd, "returncode": r.returncode, "stdout": r.stdout[-4000:], "stderr": r.stderr[-1500:]}


def screenshot(game: str = "", out: str = "", skin: str = "", fx: str = "", zone: str = "moor", place: str = "") -> dict:
    """The game opened with a skin, effects or placed objects, a screenshot saved after a few seconds (game_preview)."""
    from ..api import StepError
    from ..game_preview import preview_in_game
    try:
        return preview_in_game(game or None, skin=skin or None, fx=fx.split(",") if fx else None, zone=zone, shot=out or None, place=place.split(",") if place else None)
    except (StepError, RuntimeError) as e:
        return {"ok": False, "error": str(e)}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "import": import_project, "run_script": run_script, "screenshot": screenshot}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
