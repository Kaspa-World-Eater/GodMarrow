"""Blender, through the finder the pipeline already has (api.find_blender: the project's setting, the portable copy the
owner chose to fetch, PATH, the usual folders). Runs the scripts under pixelforge/blender/ or any script, headless."""

from __future__ import annotations

from pathlib import Path

from . import _base as B

NAME = "blender"
TITLE = "Blender"
WHAT = "the 3D step of the old road (hull, rig, 8-direction renders) and any headless script: `blender -b [file] --python script -- args`"
HOME = "https://www.blender.org/download/"
LICENCE = "GPL-2.0-or-later"
INSTALL = "Install Blender 4.2 LTS from blender.org/download (or choose Download Blender under Settings, which fetches the portable zip only when you ask), or set the path with `pixelforge project set --blender`."


def find() -> str | None:
    from ..api import find_blender
    return B.env_override(NAME) or find_blender(None)


def version(exe: str) -> str:
    return B.version_of(exe, "--version")


def explain_missing() -> str:
    return INSTALL


def script_command(exe: str, script: str, args: list[str] = (), blend: str | None = None) -> list[str]:
    cmd = [exe, "-b"]
    if blend:
        cmd.append(str(blend))
    cmd += ["--python", str(script), "--", *[str(a) for a in args]]
    return cmd


def run_script(script: str, args: list[str] | None = None, blend: str = "", timeout: float = 1800.0) -> dict:
    """A Python script inside headless Blender; the lines it prints starting with PF_ are returned as notes."""
    exe = find()
    s = Path(script)
    if not s.is_absolute() and not s.exists():
        s = Path(__file__).resolve().parent.parent / "blender" / s
    cmd = script_command(exe, str(s), args or [], blend or None)
    r = B.call(cmd, timeout)
    notes = [l for l in r.stdout.splitlines() if l.startswith("PF_")]
    ok = r.returncode == 0 and not any(l.startswith("PF_ERROR") for l in notes)
    return {"ok": ok, "command": cmd, "notes": notes, "tail": r.stdout[-1500:], **({} if ok else {"error": B.first_line(r.stderr) or (notes[-1] if notes else "Blender stopped.")})}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "run_script": run_script}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
