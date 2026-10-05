"""LDtk: the free level editor (MIT). It has no command line, so: open-and-wait on a .ldtk project, and the .ldtk JSON read
straight into the plain layout of _maps.py for the game (no LDtk needed for that). In Godot, godot-ldtk-importer (MIT)
imports .ldtk directly."""

from __future__ import annotations

import json
from pathlib import Path

from . import _base as B
from . import _maps as M

NAME = "ldtk"
TITLE = "LDtk"
WHAT = "level editing by hand (open-and-wait); a .ldtk level as one plain layout JSON for Godot, read without the program"
HOME = "https://ldtk.io/download/"
LICENCE = "MIT"
INSTALL = "Install LDtk from ldtk.io/download (an installer, a zip or an AppImage); the Forge finds it on PATH or in PIXELFORGE_LDTK."
EXE_NAMES = ["ldtk", "LDtk", "LDtk.exe"]
CANDIDATES = [r"%LOCALAPPDATA%\Programs\ldtk\LDtk.exe", r"%ProgramFiles%\LDtk\LDtk.exe", "/Applications/LDtk.app/Contents/MacOS/LDtk",
              "~/Applications/LDtk*.AppImage", "/opt/ldtk/LDtk"]


def find() -> str | None:
    return B.env_override(NAME) or B.which(EXE_NAMES, CANDIDATES)


def version(exe: str, file: str | None = None) -> str:
    """LDtk prints no version; a .ldtk file names the build that wrote it."""
    if file and Path(file).exists():
        try:
            d = json.loads(Path(file).read_text(encoding="utf-8"))
            return "LDtk " + str(d.get("appBuildId", d.get("jsonVersion", "")))
        except (OSError, json.JSONDecodeError):
            return ""
    return ""


def explain_missing() -> str:
    return INSTALL


def open_project(file: str, timeout: float | None = None) -> dict:
    exe = find()
    folder = Path(file).parent
    before = B.file_state(folder)
    w = B.wait_for([exe, str(file)], timeout=timeout)
    if not w["ok"] and "error" in w:
        return w
    return {"ok": True, "changed": B.changed_files(folder, before), "seconds": w.get("seconds", 0), "command": [exe, str(file)]}


def to_godot(ldtk_file: str, out: str = "", level: str = "") -> dict:
    """One level of a .ldtk project as the plain layout JSON (_maps.py); no LDtk needed."""
    layout = M.from_ldtk(ldtk_file, level or None)
    out = out or str(Path(ldtk_file).with_suffix("").with_name(Path(ldtk_file).stem + (("_" + layout["level"]) if layout.get("level") else "") + ".map.json"))
    return {"ok": True, "file": M.write(layout, out), "level": layout.get("level", ""), "layers": len(layout["layers"]), "objects": len(layout["objects"]), "size": layout["size"]}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": "" , "install": INSTALL, "note": "LDtk has no command line; its version is read from a .ldtk file."}


ACTIONS = {"status": status, "open": open_project, "to_godot": to_godot}
OFFLINE_ACTIONS = ("status", "to_godot")


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
