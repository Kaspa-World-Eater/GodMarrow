"""Self-update: pull the latest PixelForge before the app opens, so every desktop icon runs the newest version.

``update()`` is called by ``pixelforge forge`` and ``pixelforge studio``. It only acts when PixelForge sits inside a
git checkout (the Godmarrow repository) and git is installed; otherwise it does nothing and says so. A pull that
brings new commits is followed by ``pip install -e .`` (new dependencies) and the caller restarts itself once, so
the code that opens is the code that was just fetched. Set PIXELFORGE_NO_UPDATE=1 to skip (tests, development).
Nothing here ever raises: a failed update means the app opens as it is.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

RESTART_FLAG = "PIXELFORGE_UPDATED"


def repo_root(start: str | Path | None = None) -> Path | None:
    """The git checkout PixelForge lives in (the folder with .git above tools/pixelforge), or None."""
    p = Path(start) if start else Path(__file__).resolve().parent
    for c in [p, *p.parents]:
        if (c / ".git").exists():
            return c
    return None


def _git(root: Path, *args: str, timeout: int = 90) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, timeout=timeout)


def update(root: str | Path | None = None, log=None, pip: bool = True) -> dict:
    """Pull the latest version. Returns ``{"updated": bool, "before": sha, "after": sha, "note": str}``."""
    say = log or (lambda m: None)
    if os.environ.get("PIXELFORGE_NO_UPDATE") or os.environ.get(RESTART_FLAG):
        return {"updated": False, "note": "update skipped"}
    r = repo_root(root)
    if r is None:
        return {"updated": False, "note": "not a git checkout; nothing to update"}
    if shutil.which("git") is None:
        return {"updated": False, "note": "git is not installed; install Git for Windows to get updates"}
    try:
        before = _git(r, "rev-parse", "HEAD").stdout.strip()
        say("Checking for a newer PixelForge ...")
        pull = _git(r, "pull", "--ff-only", "--quiet")
        after = _git(r, "rev-parse", "HEAD").stdout.strip()
    except (subprocess.SubprocessError, OSError) as e:
        return {"updated": False, "note": f"update skipped ({e})"}
    if pull.returncode != 0:
        return {"updated": False, "before": before, "after": before, "note": "update skipped (" + (pull.stderr.strip().splitlines() or ["git pull failed"])[-1] + ")"}
    if after == before:
        return {"updated": False, "before": before, "after": after, "note": "already the latest"}
    say(f"Updated PixelForge ({before[:7]} -> {after[:7]}).")
    if pip:
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-e", str(Path(__file__).resolve().parent.parent)],
                           capture_output=True, text=True, timeout=600)
        except (subprocess.SubprocessError, OSError):
            pass
    return {"updated": True, "before": before, "after": after, "note": "updated"}


def restart_if_updated(result: dict, argv: list[str] | None = None) -> None:
    """After an update, run the same command again with the new code (once) and exit with its code."""
    if not result.get("updated"):
        return
    env = dict(os.environ, **{RESTART_FLAG: "1"})
    cmd = [sys.executable, "-m", "pixelforge.cli", *(sys.argv[1:] if argv is None else argv)]
    code = subprocess.call(cmd, env=env)
    raise SystemExit(code)
