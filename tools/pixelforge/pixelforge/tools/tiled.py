"""Tiled: the free map editor (GPL / BSD). Opens a map for hand work (open-and-wait), exports through its command line
(`tiled --export-map json in.tmx out.tmj`), and turns a Tiled JSON map into the plain layout of _maps.py for the game.
In Godot itself, YATI (free, MIT) imports .tmx/.tmj directly; this road is for the Forge's own placement data."""

from __future__ import annotations

from pathlib import Path

from . import _base as B
from . import _maps as M

NAME = "tiled"
TITLE = "Tiled"
WHAT = "map editing by hand; `--export-map` to JSON from the command line; a Tiled map as one plain layout JSON for Godot"
HOME = "https://www.mapeditor.org/download.html"
LICENCE = "GPL-2.0-or-later (libtiled BSD)"
INSTALL = "Install Tiled from mapeditor.org/download.html (an installer or a zip); the Forge finds it on PATH or in PIXELFORGE_TILED."
EXE_NAMES = ["tiled", "Tiled", "tiled.exe"]
CANDIDATES = [r"%ProgramFiles%\Tiled\tiled.exe", r"%LOCALAPPDATA%\Programs\Tiled\tiled.exe", "/Applications/Tiled.app/Contents/MacOS/Tiled",
              "~/Applications/Tiled*.AppImage", "/opt/tiled/tiled"]


def find() -> str | None:
    return B.env_override(NAME) or B.which(EXE_NAMES, CANDIDATES)


def version(exe: str) -> str:
    return B.version_of(exe, "--version")


def explain_missing() -> str:
    return INSTALL


def export_command(exe: str, src: str, out: str, fmt: str = "json") -> list[str]:
    return [exe, "--export-map", fmt, str(src), str(out)]


def open_map(file: str, timeout: float | None = None) -> dict:
    exe = find()
    folder = Path(file).parent
    before = B.file_state(folder)
    w = B.wait_for([exe, str(file)], timeout=timeout)
    if not w["ok"] and "error" in w:
        return w
    return {"ok": True, "changed": B.changed_files(folder, before), "seconds": w.get("seconds", 0), "command": [exe, str(file)]}


def export(src: str, out: str = "", fmt: str = "json") -> dict:
    """A .tmx (or any map Tiled reads) exported as JSON (.tmj) through Tiled's command line."""
    exe = find()
    out = out or str(Path(src).with_suffix(".tmj"))
    cmd = export_command(exe, src, out, fmt)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    ok = r.returncode == 0 and Path(out).exists()
    return {"ok": ok, "file": out if ok else "", "command": cmd, **({} if ok else {"error": B.first_line(r.stderr) or "Tiled wrote nothing."})}


def to_godot(map_json: str, out: str = "") -> dict:
    """A Tiled JSON map (.tmj / .json) as the plain layout JSON (_maps.py) the game side reads; no Tiled needed."""
    layout = M.from_tiled(map_json)
    out = out or str(Path(map_json).with_suffix(".map.json"))
    return {"ok": True, "file": M.write(layout, out), "layers": len(layout["layers"]), "objects": len(layout["objects"]), "size": layout["size"]}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "open": open_map, "export": export, "to_godot": to_godot}
OFFLINE_ACTIONS = ("status", "to_godot")


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
