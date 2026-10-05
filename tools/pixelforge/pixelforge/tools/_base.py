"""What every tool adapter shares: finding an installed program (never installing one), calling it as an ordinary child
process, waiting for a window to close, and saying what changed on disk.

An adapter is one module in this package with the same face:

    NAME, TITLE, WHAT (what it does for us), HOME (the official download page), LICENCE, INSTALL (one sentence)
    find() -> path | None          only programs already installed: PIXELFORGE_<NAME>, PATH, the usual folders
    version(exe) -> str            "" when it cannot be read
    run(action, **params) -> dict  every action returns a JSON-serialisable dict with "ok"
    explain_missing() -> str       the install step in one sentence, with the official page
    ACTIONS                        {action: function}, what `run` dispatches to (and what the MCP tool lists)

Nothing here downloads or installs anything, and nothing is detached: a program the adapter opens is a child of this
process and ends with it.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_TIMEOUT = 600.0


def env_override(name: str) -> str | None:
    """``PIXELFORGE_<NAME>`` names the executable by hand (the Forge's Settings writes it)."""
    v = os.environ.get("PIXELFORGE_" + name.upper().replace("-", "_"), "")
    return v if v and Path(v).exists() else None


def which(names: list[str], candidates: list[str | Path] = ()) -> str | None:
    """The first of ``names`` on PATH, else the first existing candidate path (globs allowed)."""
    for n in names:
        w = shutil.which(n)
        if w:
            return w
    import glob
    for c in candidates:
        c = os.path.expandvars(os.path.expanduser(str(c)))
        if any(ch in c for ch in "*?["):
            hits = sorted(p for p in glob.glob(c) if Path(p).is_file())
            if hits:
                return hits[-1]
        elif Path(c).is_file():
            return c
    return None


def program_files() -> list[str]:
    out = []
    for env in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA", "APPDATA", "USERPROFILE"):
        v = os.environ.get(env)
        if v:
            out.append(v)
    return out


def call(cmd: list[str], timeout: float = 60.0, cwd: str | Path | None = None) -> subprocess.CompletedProcess:
    """Run a program to completion with its output captured (a child process; it ends with us)."""
    kw = {}
    if os.name == "nt":
        kw["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout,
                          cwd=str(cwd) if cwd else None, **kw)


def wait_for(cmd: list[str], cwd: str | Path | None = None, timeout: float | None = None) -> dict:
    """Open a program with a window and wait until the person closes it (open-and-wait). Never detached: the window is
    our child and closes when the Forge or the CLI stops. Returns {"ok", "returncode", "seconds"}."""
    t0 = time.time()
    try:
        proc = subprocess.Popen([str(c) for c in cmd], cwd=str(cwd) if cwd else None, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except OSError as e:
        return {"ok": False, "error": f"{cmd[0]} could not be started ({e}).", "command": [str(c) for c in cmd]}
    try:
        code = proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        return {"ok": False, "error": f"{Path(str(cmd[0])).name} was still open after {int(timeout or 0)} s and was closed.", "command": [str(c) for c in cmd],
                "seconds": round(time.time() - t0, 1)}
    return {"ok": code == 0, "returncode": code, "seconds": round(time.time() - t0, 1), "command": [str(c) for c in cmd]}


def first_line(text: str) -> str:
    for line in (text or "").splitlines():
        if line.strip():
            return line.strip()
    return ""


def version_of(exe: str, flag: str = "--version", timeout: float = 20.0) -> str:
    """The first line the program prints for its version flag; "" when it cannot be read."""
    try:
        r = call([exe, flag], timeout)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return first_line(r.stdout) or first_line(r.stderr)


def file_state(folder: str | Path) -> dict[str, tuple[float, int]]:
    from ..claude_bridge import file_state as fs
    return fs(Path(folder), skip=())


def changed_files(folder: str | Path, before: dict) -> list[str]:
    from ..claude_bridge import changed_files as cf
    return cf(before, file_state(folder))


def image_files(paths: list[str | Path], exts=(".png", ".gif", ".jpg", ".jpeg", ".webp", ".bmp")) -> list[str]:
    return [str(p) for p in paths if Path(p).suffix.lower() in exts]


def frames_in(folder: str | Path) -> list[str]:
    """The frame files of a clip folder (frame_000.png ...), in order, part masks skipped."""
    d = Path(folder)
    if d.is_file():
        return [str(d)]
    return sorted(str(p) for p in d.glob("frame_*.png") if ".parts." not in p.name) if d.is_dir() else []


def missing(mod) -> dict:
    """The result of an action when the tool is not installed: never a traceback, the install sentence instead."""
    return {"ok": False, "error": mod.explain_missing(), "tool": mod.NAME, "missing": True}


def dispatch(mod, action: str, params: dict) -> dict:
    """``run(action, **params)`` for a module with ACTIONS: an unknown action names the known ones; a missing tool says
    how to install it (actions marked ``offline`` in OFFLINE_ACTIONS run without the program: command building, exports)."""
    fn = mod.ACTIONS.get(action)
    if fn is None:
        return {"ok": False, "error": f"{mod.TITLE} has no action '{action}'. Actions: " + ", ".join(sorted(mod.ACTIONS)) + ".", "tool": mod.NAME}
    if action not in getattr(mod, "OFFLINE_ACTIONS", ()) and mod.find() is None:
        return missing(mod)
    try:
        r = fn(**(params or {}))
    except TypeError as e:
        return {"ok": False, "error": f"{mod.TITLE} {action}: {e}", "tool": mod.NAME}
    except (OSError, subprocess.TimeoutExpired, ValueError) as e:
        return {"ok": False, "error": f"{mod.TITLE} {action} stopped: {e}", "tool": mod.NAME}
    if isinstance(r, dict):
        r.setdefault("ok", True)
        r.setdefault("tool", mod.NAME)
        return r
    return {"ok": True, "tool": mod.NAME, "result": r}


def python() -> str:
    return sys.executable
