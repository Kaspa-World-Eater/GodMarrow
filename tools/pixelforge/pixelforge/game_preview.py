"""See it in the game: launch the Godot project with a character skin, an effect or a spell on screen.

    preview_in_game(game_dir, skin="keeper", fx=["keeper_smoke_1"], zone="moor", shot="out.png")

Finds Godot (settings, PIXELFORGE_GODOT, PATH, the usual install folders), the game folder (the one with
project.godot: given, or found upward from a sprite set / the project), and runs it with the game's own test
arguments: ``--zone`` ``--cls`` ``--skin`` for a look at a character, ``--fx`` for effects at the hero,
``--attach`` for the effects editor's attachments, ``--shot`` for a screenshot after a few seconds (then quit).
Nothing in the game changes; these are the capture hooks it already has.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

GODOT_CANDIDATES = [
    r"C:\Program Files\Godot\Godot_v4.7.2-stable_win64.exe", r"C:\Program Files\Godot\Godot.exe", r"C:\Godot\Godot.exe",
    "/Applications/Godot.app/Contents/MacOS/Godot", "/usr/local/bin/godot", "/usr/bin/godot", "/opt/godot/Godot_v4.7.2-stable_linux.x86_64",
]
SKIN_CLASS = {"mystic": "animancer", "wraith": "animancer", "keeper": "miasmancer", "ossuarch": "ossuarch"}


def find_godot(hint: str | None = None) -> str | None:
    cands = [hint, os.environ.get("PIXELFORGE_GODOT"), os.environ.get("GODOT")]
    for c in cands:
        if c and Path(c).exists():
            return str(c)
    for name in ("godot", "godot4", "Godot", "Godot_v4.7.2-stable_win64.exe", "Godot_v4.7.2-stable_linux.x86_64"):
        w = shutil.which(name)
        if w:
            return w
    for c in GODOT_CANDIDATES:
        if Path(c).exists():
            return c
    home = Path.home()
    for pat in ("Desktop/Godot/Godot*.exe", "OneDrive/Desktop/Godot/Godot*.exe", "Desktop/Godot*.exe", "OneDrive/Desktop/Godot*.exe", "Downloads/Godot*/Godot*.exe",
                "Downloads/Godot*.exe", "Godot*/Godot*.exe", "Downloads/Godot*linux*"):
        for p in sorted(home.glob(pat)):
            if p.is_file():
                return str(p)
    return None


def find_game(start: str | Path | None = None) -> Path | None:
    """The folder with project.godot: the given one, or the nearest above ``start`` (a sprites folder, a project)."""
    if start is not None:
        p = Path(start).resolve()
        if (p / "project.godot").exists():
            return p
        for parent in [p, *p.parents]:
            if (parent / "project.godot").exists():
                return parent
    for p in [Path.cwd(), *Path.cwd().parents]:
        if (p / "project.godot").exists():
            return p
    return None


def needs_virtual_display() -> bool:
    """True on a Linux box with no display: the game then runs under ``xvfb-run`` with the OpenGL driver."""
    if sys.platform.startswith("win") or sys.platform == "darwin":
        return False
    return not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")) and shutil.which("xvfb-run") is not None


XVFB = ["xvfb-run", "-a", "-s", "-screen 0 1280x720x24"]


def preview_command(godot: str, game: Path, *, skin: str | None = None, cls: str | None = None, zone: str = "moor", fx: list[str] | None = None,
                    attach: bool = False, shot: str | Path | None = None, shot_t: float = 4.0, hour: float | None = None, seed: int = 7,
                    virtual: bool = False) -> list[str]:
    """The game's command line. ``virtual`` wraps it in ``xvfb-run`` with the OpenGL driver for a session without a
    display (what :func:`needs_virtual_display` detects)."""
    args = ([*XVFB] if virtual else []) + [godot, "--path", str(game)]
    if virtual:
        args += ["--rendering-driver", "opengl3"]
    if shot:
        args += ["--resolution", "1280x720"]
    args += ["--", f"--zone={zone}", "--new", f"--seed={seed}"]
    if skin:
        args.append(f"--skin={skin}")
        args.append(f"--cls={cls or SKIN_CLASS.get(skin, 'animancer')}")
    elif cls:
        args.append(f"--cls={cls}")
    if fx:
        args.append("--fx=" + ",".join(fx))
    if attach:
        args.append("--attach")
    if hour is not None:
        args.append(f"--hour={hour}")
    if shot:
        args += [f"--shot={Path(shot).resolve()}", f"--shot_t={shot_t}"]
    return args


def preview_in_game(game_dir: str | Path | None = None, *, godot: str | None = None, skin: str | None = None, cls: str | None = None, zone: str = "moor",
                    fx: list[str] | None = None, attach: bool = False, shot: str | Path | None = None, shot_t: float = 4.0, hour: float | None = None,
                    wait: bool | None = None, log=None) -> dict:
    """Launch the game. With ``shot`` it runs until the screenshot is saved and returns its path; otherwise the
    game window stays open and the call returns at once (``wait=True`` blocks until it closes)."""
    exe = find_godot(godot)
    if exe is None:
        raise RuntimeError("Godot was not found. Install Godot 4 or set PIXELFORGE_GODOT to the executable.")
    game = find_game(game_dir)
    if game is None:
        raise RuntimeError("No Godot project found (a folder with project.godot). Pass the game folder.")
    virtual = bool(shot) and needs_virtual_display()
    cmd = preview_command(exe, game, skin=skin, cls=cls, zone=zone, fx=fx, attach=attach, shot=shot, shot_t=shot_t, hour=hour, virtual=virtual)
    if log:
        log("$ " + " ".join(cmd))
    r = {"ok": True, "godot": exe, "game": str(game), "command": cmd, "virtual_display": virtual}
    if shot or wait:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180, cwd=str(game))
        if shot and not Path(shot).exists() and not virtual and shutil.which("xvfb-run") and not sys.platform.startswith(("win", "darwin")):
            # a display that is set but unusable: once more under a virtual one
            virtual = True
            cmd = preview_command(exe, game, skin=skin, cls=cls, zone=zone, fx=fx, attach=attach, shot=shot, shot_t=shot_t, hour=hour, virtual=True)
            r["command"] = cmd; r["virtual_display"] = True
            if log:
                log("no usable display; again under xvfb-run\n$ " + " ".join(cmd))
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180, cwd=str(game))
        r["returncode"] = proc.returncode
        tail = (proc.stdout + proc.stderr)[-1500:]
        if log and tail.strip():
            log(tail)
        if shot:
            r["png"] = str(Path(shot).resolve()) if Path(shot).exists() else None
            r["ok"] = r["png"] is not None
            if not r["ok"]:
                r["error"] = ("the game did not write the screenshot; it needs a window (no display was found and xvfb-run is not installed)\n"
                              if not virtual and not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")) and not sys.platform.startswith(("win", "darwin"))
                              else "the game did not write the screenshot\n") + tail
        return r
    flags = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if sys.platform.startswith("win") else {}
    proc = subprocess.Popen(cmd, cwd=str(game), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **flags)
    r["pid"] = proc.pid
    return r
