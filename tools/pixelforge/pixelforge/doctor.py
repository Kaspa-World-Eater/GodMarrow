"""`pixelforge doctor`: say in one screen what works on this machine and what is missing, with the fix."""

from __future__ import annotations

import importlib
import platform
import shutil
import sys
from pathlib import Path


def run(project_dir: str | None = None) -> dict:
    from . import api

    rows = []

    def row(name, ok, detail, fix=""):
        rows.append({"check": name, "ok": bool(ok), "detail": detail, "fix": fix if not ok else ""})

    row("python", sys.version_info >= (3, 10), platform.python_version(), "Install Python 3.10+ from python.org (tick 'Add to PATH')")
    for mod, fix in (("numpy", "pip install numpy"), ("PIL", "pip install pillow"), ("tkinter", "Windows/mac: reinstall Python with Tcl/Tk; Linux: apt install python3-tk")):
        try:
            m = importlib.import_module(mod)
            row(mod, True, getattr(m, "__version__", "ok"))
        except Exception as e:  # noqa: BLE001
            row(mod, False, str(e)[:80], fix)
    project = None
    if project_dir:
        try:
            from .project import Project
            project = Project.load(project_dir)
            row("project", True, f"{project.name} ({len(project.characters)} characters, style {project.style})")
        except Exception as e:  # noqa: BLE001
            row("project", False, str(e)[:80], "pixelforge project new <folder>")
    bl = api.find_blender(project)
    row("blender", bool(bl), bl or "not found", "pixelforge project blender-download  (or install from blender.org)")
    lib = api.ANIMATION_LIBRARY
    row("animation library", lib.exists(), str(lib) if lib.exists() else "missing", "re-download tools/pixelforge/assets/animations")
    godot = shutil.which("godot") or shutil.which("godot4") or shutil.which("Godot")
    row("godot (optional)", True, godot or "not on PATH (only needed to run the game)")
    import importlib.util
    row("bpy module (optional)", True, "present: Blender scripts can be tested in-process" if importlib.util.find_spec("bpy") else "absent (fine; Blender itself is used)")
    ok = all(r["ok"] for r in rows)
    return {"ok": ok, "rows": rows}


def format_report(r: dict) -> str:
    lines = []
    for x in r["rows"]:
        lines.append(f"{'OK ' if x['ok'] else 'MISSING'}  {x['check']:22s} {x['detail']}" + (f"\n          fix: {x['fix']}" if x["fix"] else ""))
    lines.append("All good." if r["ok"] else "Something is missing; the fixes are above.")
    return "\n".join(lines)
