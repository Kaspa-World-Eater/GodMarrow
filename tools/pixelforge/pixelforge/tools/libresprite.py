"""LibreSprite: the free fork of Aseprite 1.x (GPL). The same command line (`-b`, `--sheet`, `--data`, `--save-as`), so sheets
and exports work as Aseprite's; its scripts are JavaScript, not Lua, so there is no frames-to-one-sprite import here:
`open` opens the frame files themselves and reads back whatever was saved over them."""

from __future__ import annotations

from pathlib import Path

from . import _base as B
from . import aseprite as A

NAME = "libresprite"
TITLE = "LibreSprite"
WHAT = "a free pixel editor for hand edits of frames (open the files, draw, save, close), sprite sheets and exports from the command line"
HOME = "https://libresprite.github.io/#!/downloads"
LICENCE = "GPL-2.0"
INSTALL = "Download LibreSprite from libresprite.github.io/#!/downloads (a zip or AppImage, no installer) and put it on PATH or in PIXELFORGE_LIBRESPRITE."
EXE_NAMES = ["libresprite", "LibreSprite", "libresprite.exe", "LibreSprite.AppImage"]
CANDIDATES = [r"%ProgramFiles%\LibreSprite\libresprite.exe", r"%LOCALAPPDATA%\Programs\LibreSprite\libresprite.exe",
              "/Applications/LibreSprite.app/Contents/MacOS/libresprite", "~/Applications/LibreSprite*.AppImage", "~/.local/bin/libresprite*", "/opt/libresprite/libresprite"]


def find() -> str | None:
    return B.env_override(NAME) or B.which(EXE_NAMES, CANDIDATES)


def version(exe: str) -> str:
    return B.version_of(exe, "--version")


def explain_missing() -> str:
    return INSTALL


def open_frames(frames_dir: str = "", files: list[str] | None = None, timeout: float | None = None) -> dict:
    """Open the frame files in LibreSprite (each its own sprite) and wait; the files saved over are named."""
    exe = find()
    fr = A._frames_of(frames_dir, files)
    folder = Path(fr[0]).parent
    before = B.file_state(folder)
    waited = B.wait_for([exe, *fr], timeout=timeout)
    if not waited["ok"] and "error" in waited:
        return waited
    return {"ok": True, "frames": len(fr), "changed": B.changed_files(folder, before), "seconds": waited.get("seconds", 0), "command": [exe, *fr]}


def sheet(frames_dir: str = "", files: list[str] | None = None, out_png: str = "", out_json: str = "", sheet_type: str = "horizontal") -> dict:
    exe = find()
    fr = A._frames_of(frames_dir, files)
    out_png = out_png or str(Path(fr[0]).parent / "sheet.png")
    out_json = out_json or str(Path(out_png).with_suffix(".json"))
    cmd = A.sheet_command(exe, fr, out_png, out_json, sheet_type)
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    return {"ok": r.returncode == 0 and Path(out_png).exists(), "png": out_png, "json": out_json, "frames": len(fr), "command": cmd,
            **({} if r.returncode == 0 else {"error": B.first_line(r.stderr) or "LibreSprite stopped."})}


def export(sprite: str, out_dir: str = "", stem: str = "frame") -> dict:
    exe = find()
    out_dir = out_dir or str(Path(sprite).parent)
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    cmd = A.export_command(exe, sprite, str(Path(out_dir) / f"{stem}_{{frame000}}.png"))
    r = B.call(cmd, B.DEFAULT_TIMEOUT)
    files = sorted(str(p) for p in Path(out_dir).glob(f"{stem}_*.png"))
    return {"ok": r.returncode == 0 and bool(files), "files": files, "command": cmd, **({} if r.returncode == 0 else {"error": B.first_line(r.stderr) or "LibreSprite stopped."})}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "open": open_frames, "sheet": sheet, "export": export}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
