"""Aseprite: the pixel editor for hand edits and batch work (a paid program with a free source build; it is not installed
for you). Two roads:

    open(frames_dir | files)   the frames become one sprite (a Lua import script), Aseprite opens on it and the Forge waits;
                               when it closes the frames are written back (`-b --save-as`) and the changed files named
    sheet(...) / export(...)   batch work through the command line: a sprite sheet with JSON, frames out of an .aseprite
    script(lua, files, params) any Lua script of yours against files (--script-param k=v --script file.lua)

LibreSprite (libresprite.py) shares the command line; its scripts are JavaScript, so the Lua import road is Aseprite's.
"""

from __future__ import annotations

import json
from pathlib import Path

from . import _base as B

NAME = "aseprite"
TITLE = "Aseprite"
WHAT = "hand edits of a frame set (open, draw, close; the frames come back), sprite sheets and batch exports from the command line, Lua scripts"
HOME = "https://www.aseprite.org/download/"
LICENCE = "proprietary (paid binary; the source is free to build yourself, EULA)"
INSTALL = "Buy or build Aseprite (aseprite.org/download, or Steam) and install it; the Forge finds it on PATH, in the Steam folder or through PIXELFORGE_ASEPRITE."
EXE_NAMES = ["aseprite", "Aseprite", "aseprite.exe"]
CANDIDATES = [
    r"%ProgramFiles%\Aseprite\Aseprite.exe", r"%ProgramFiles(x86)%\Steam\steamapps\common\Aseprite\Aseprite.exe",
    r"%ProgramFiles(x86)%\Aseprite\Aseprite.exe", r"%LOCALAPPDATA%\Programs\Aseprite\Aseprite.exe",
    "/Applications/Aseprite.app/Contents/MacOS/aseprite", "~/.steam/steam/steamapps/common/Aseprite/aseprite",
    "~/.local/share/Steam/steamapps/common/Aseprite/aseprite", "/opt/aseprite/aseprite",
]


def find() -> str | None:
    return B.env_override(NAME) or B.which(EXE_NAMES, CANDIDATES)


def version(exe: str) -> str:
    return B.version_of(exe, "--version")


def explain_missing() -> str:
    return INSTALL


# ---------------------------------------------------------------- commands (pure: what the tests check)
def import_script(frames: list[str], out: str, fps: float = 12.0) -> str:
    """A Lua script that opens the first frame, appends every other as a new frame and saves one sprite."""
    ms = int(round(1000.0 / max(fps, 1.0)))
    lines = ["local files = {"] + [f'  "{Path(f).as_posix()}",' for f in frames] + ["}",
             "local spr = app.open(files[1])",
             f"spr.frames[1].duration = {ms / 1000.0:.3f}",
             "for i = 2, #files do",
             "  local src = app.open(files[i])",
             "  local fr = spr:newEmptyFrame()",
             f"  fr.duration = {ms / 1000.0:.3f}",
             "  spr:newCel(spr.layers[1], fr, src.cels[1].image, src.cels[1].position)",
             "  src:close()",
             "end",
             f'spr:saveAs("{Path(out).as_posix()}")']
    return "\n".join(lines) + "\n"


def script_command(exe: str, script: str, files: list[str] = (), params: dict | None = None) -> list[str]:
    cmd = [exe, "-b", *[str(f) for f in files]]
    for k, v in (params or {}).items():
        cmd += ["--script-param", f"{k}={v}"]
    cmd += ["--script", str(script)]
    return cmd


def open_command(exe: str, file: str) -> list[str]:
    return [exe, str(file)]


def export_command(exe: str, sprite: str, pattern: str) -> list[str]:
    """`--save-as` with Aseprite's frame placeholder: frame_{frame000}.png writes frame_000.png, frame_001.png ..."""
    return [exe, "-b", str(sprite), "--save-as", str(pattern)]


def sheet_command(exe: str, files: list[str], out_png: str, out_json: str | None = None, sheet_type: str = "horizontal", fmt: str = "json-array") -> list[str]:
    cmd = [exe, "-b", *[str(f) for f in files], "--sheet-type", sheet_type, "--sheet", str(out_png)]
    if out_json:
        cmd += ["--data", str(out_json), "--format", fmt]
    return cmd


# ---------------------------------------------------------------- actions
def _frames_of(frames_dir: str = "", files: list[str] | None = None) -> list[str]:
    fr = [str(f) for f in (files or [])] or B.frames_in(frames_dir)
    if not fr:
        raise ValueError("no frames to open (a clip folder with frame_000.png ... or a list of files)")
    return fr


def build_sprite(frames_dir: str = "", files: list[str] | None = None, out: str = "", fps: float = 12.0) -> dict:
    """The frames as one .aseprite (Aseprite's own file), through the Lua import script."""
    exe = find()
    fr = _frames_of(frames_dir, files)
    out = out or str(Path(fr[0]).parent / (Path(fr[0]).parent.name + ".aseprite"))
    script = Path(out).with_suffix(".import.lua")
    script.parent.mkdir(parents=True, exist_ok=True)
    script.write_text(import_script(fr, out, fps), encoding="utf-8")
    cmd = script_command(exe, str(script))
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    ok = r.returncode == 0 and Path(out).exists()
    return {"ok": ok, "sprite": out if ok else "", "frames": len(fr), "command": cmd, "script": str(script),
            **({} if ok else {"error": "Aseprite did not write the sprite: " + (B.first_line(r.stderr) or B.first_line(r.stdout) or "no reason given")})}


def open_frames(frames_dir: str = "", files: list[str] | None = None, fps: float = 12.0, timeout: float | None = None) -> dict:
    """Open a frame set in Aseprite for hand editing and wait; the edited frames are written back over the originals."""
    exe = find()
    fr = _frames_of(frames_dir, files)
    folder = Path(fr[0]).parent
    built = build_sprite(files=fr, fps=fps)
    if not built["ok"]:
        return built
    before = B.file_state(folder)
    waited = B.wait_for(open_command(exe, built["sprite"]), timeout=timeout)
    if not waited["ok"] and "error" in waited:
        return waited
    stem = Path(fr[0]).stem.rsplit("_", 1)[0] if "_" in Path(fr[0]).stem else "frame"
    pattern = str(folder / f"{stem}_{{frame000}}.png")
    exp = B.call(export_command(exe, built["sprite"], pattern), B.DEFAULT_TIMEOUT)
    changed = [c for c in B.changed_files(folder, before) if not c.endswith((".aseprite", ".lua"))]
    return {"ok": exp.returncode == 0, "sprite": built["sprite"], "frames": len(fr), "changed": changed, "seconds": waited.get("seconds", 0),
            "command": export_command(exe, built["sprite"], pattern)}


def sheet(frames_dir: str = "", files: list[str] | None = None, out_png: str = "", out_json: str = "", sheet_type: str = "horizontal") -> dict:
    """A sprite sheet (+ JSON) from frames, through `-b --sheet --data`."""
    exe = find()
    fr = _frames_of(frames_dir, files)
    out_png = out_png or str(Path(fr[0]).parent / "sheet.png")
    out_json = out_json or str(Path(out_png).with_suffix(".json"))
    cmd = sheet_command(exe, fr, out_png, out_json, sheet_type)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    return {"ok": r.returncode == 0 and Path(out_png).exists(), "png": out_png, "json": out_json, "frames": len(fr), "command": cmd,
            **({} if r.returncode == 0 else {"error": B.first_line(r.stderr) or "Aseprite stopped."})}


def export(sprite: str, out_dir: str = "", stem: str = "frame") -> dict:
    """Frames out of an .aseprite: out_dir/<stem>_000.png ..."""
    exe = find()
    out_dir = out_dir or str(Path(sprite).parent)
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    pattern = str(Path(out_dir) / f"{stem}_{{frame000}}.png")
    cmd = export_command(exe, sprite, pattern)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    files = sorted(str(p) for p in Path(out_dir).glob(f"{stem}_*.png"))
    return {"ok": r.returncode == 0 and bool(files), "files": files, "command": cmd, **({} if r.returncode == 0 else {"error": B.first_line(r.stderr) or "Aseprite stopped."})}


def script(lua: str, files: list[str] | None = None, params: dict | None = None) -> dict:
    """Run a Lua script of yours in batch mode against files."""
    exe = find()
    cmd = script_command(exe, lua, files or [], params)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    return {"ok": r.returncode == 0, "command": cmd, "stdout": r.stdout[-2000:], **({} if r.returncode == 0 else {"error": B.first_line(r.stderr) or "the script stopped."})}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "open": open_frames, "build_sprite": build_sprite, "sheet": sheet, "export": export, "script": script}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    return B.dispatch(_module(), action, params)


def _module():
    import sys
    return sys.modules[__name__]
