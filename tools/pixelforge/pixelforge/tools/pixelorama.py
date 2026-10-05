"""Pixelorama: the free Godot-made pixel editor (MIT). Open-and-wait only: it has no batch command line, so the adapter opens
the frame files (or a .pxo), waits for the window to close, and names the files that were saved over."""

from __future__ import annotations

from pathlib import Path

from . import _base as B
from . import aseprite as A

NAME = "pixelorama"
TITLE = "Pixelorama"
WHAT = "a free pixel editor for hand edits (open the frames, draw, save, close); no command line, so open-and-wait only"
HOME = "https://orama-interactive.itch.io/pixelorama"
LICENCE = "MIT"
INSTALL = "Download Pixelorama from orama-interactive.itch.io/pixelorama (or Steam; a zip, no installer) and put it on PATH or in PIXELFORGE_PIXELORAMA."
EXE_NAMES = ["pixelorama", "Pixelorama", "Pixelorama.exe", "Pixelorama.x86_64"]
CANDIDATES = [r"%ProgramFiles%\Pixelorama\Pixelorama.exe", r"%LOCALAPPDATA%\Programs\Pixelorama\Pixelorama.exe",
              r"%ProgramFiles(x86)%\Steam\steamapps\common\Pixelorama\Pixelorama.exe", "/Applications/Pixelorama.app/Contents/MacOS/Pixelorama",
              "~/.local/share/Steam/steamapps/common/Pixelorama/Pixelorama.x86_64", "~/Applications/Pixelorama*", "/opt/pixelorama/Pixelorama*"]


def find() -> str | None:
    return B.env_override(NAME) or B.which(EXE_NAMES, CANDIDATES)


def version(exe: str) -> str:
    # a Godot application: --version prints the engine's version, not Pixelorama's; say so plainly
    v = B.version_of(exe, "--version")
    return ("Godot " + v) if v and v[0].isdigit() else v


def explain_missing() -> str:
    return INSTALL


def open_frames(frames_dir: str = "", files: list[str] | None = None, timeout: float | None = None) -> dict:
    """Open the frames (or a .pxo) in Pixelorama and wait; the files saved over are named."""
    exe = find()
    fr = [str(f) for f in (files or [])] or B.frames_in(frames_dir)
    if not fr:
        raise ValueError("no frames to open")
    folder = Path(fr[0]).parent
    before = B.file_state(folder)
    waited = B.wait_for([exe, *fr], timeout=timeout)
    if not waited["ok"] and "error" in waited:
        return waited
    return {"ok": True, "frames": len(fr), "changed": B.changed_files(folder, before), "seconds": waited.get("seconds", 0), "command": [exe, *fr]}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL}


ACTIONS = {"status": status, "open": open_frames}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
