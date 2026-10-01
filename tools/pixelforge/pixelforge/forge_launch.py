"""Start the Forge app (``tools/pixelforge/forge``, a Godot project: PixelForge for people).

    pixelforge forge                    # finds Godot and opens the app full screen
    pixelforge forge --windowed --screen=spell

The app runs the pipeline through this same CLI (``python -m pixelforge.cli ... --json``), so it is told which
interpreter to use (this one) and where the game is (``game_preview.find_game``). Godot is found by
``game_preview.find_godot`` (PIXELFORGE_GODOT, tools/godot where "Play Godmarrow.bat" downloads it, PATH, the usual
folders); ``download_godot`` fetches it when there is none (free, about 85 MB), as the game's launcher does.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from .game_preview import REPO_GODOT_DIR, find_game, find_godot

GODOT_VERSION = "4.7.2"
GODOT_RELEASE = f"https://github.com/godotengine/godot/releases/download/{GODOT_VERSION}-stable/"


def forge_dir() -> Path:
    """The app's folder (the one with project.godot)."""
    return Path(__file__).resolve().parent.parent / "forge"


def find_python() -> str:
    """The interpreter the app should call: this one (it has PixelForge)."""
    return sys.executable


def godot_download_url() -> tuple[str, str]:
    if sys.platform.startswith("win"):
        return GODOT_RELEASE + f"Godot_v{GODOT_VERSION}-stable_win64.exe.zip", "zip"
    if sys.platform == "darwin":
        return GODOT_RELEASE + f"Godot_v{GODOT_VERSION}-stable_macos.universal.zip", "zip"
    return GODOT_RELEASE + f"Godot_v{GODOT_VERSION}-stable_linux.x86_64.zip", "zip"


def download_godot(dest: str | Path | None = None, log=None) -> dict:
    """Fetch Godot into tools/godot (no installer) and return its path."""
    import urllib.request
    import zipfile

    say = log or (lambda m: None)
    url, _kind = godot_download_url()
    dest = Path(dest) if dest else REPO_GODOT_DIR
    dest.mkdir(parents=True, exist_ok=True)
    archive = dest / "godot.zip"
    say(f"Downloading Godot {GODOT_VERSION} ({url}) ...")
    with urllib.request.urlopen(url) as r, open(archive, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    with zipfile.ZipFile(archive) as z:
        z.extractall(dest)
    archive.unlink(missing_ok=True)
    exe = find_godot()
    if exe is None:
        return {"ok": False, "error": f"downloaded Godot but found no executable under {dest}"}
    if not sys.platform.startswith("win"):
        try:
            os.chmod(exe, 0o755)
        except OSError:
            pass
    say(f"Godot ready: {exe}")
    return {"ok": True, "godot": exe}


def command(godot: str, *, python: str | None = None, game: str | Path | None = None, project: str | Path | None = None, screen: str | None = None,
            windowed: bool = False, extra: list[str] | tuple[str, ...] = ()) -> list[str]:
    """The command line that opens the app. Everything after ``--`` is the app's own (see forge/scripts/main.gd)."""
    cmd = [godot, "--path", str(forge_dir())]
    if windowed:
        cmd.append("--windowed")
    cmd.append("--")
    cmd.append(f"--python={python or find_python()}")
    if game:
        cmd.append(f"--game={game}")
    if project:
        cmd.append(f"--project={project}")
    if screen:
        cmd.append(f"--screen={screen}")
    if windowed:
        cmd.append("--windowed")
    cmd += list(extra)
    return cmd


def launch(godot: str | None = None, *, project: str | Path | None = None, screen: str | None = None, windowed: bool = False,
           extra: list[str] | tuple[str, ...] = (), wait: bool = False, download: bool = True, log=None) -> dict:
    """Open the Forge app. Returns ``{"ok": True, "pid": ..., "command": [...]}`` or ``{"ok": False, "error": ...}``."""
    forge = forge_dir()
    if not (forge / "project.godot").exists():
        return {"ok": False, "error": f"the Forge app is missing (no project.godot in {forge}); get the tools/pixelforge folder again"}
    exe = find_godot(godot)
    if exe is None and download:
        try:
            r = download_godot(log=log)
            exe = r.get("godot")
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "error": f"Godot was not found and the download failed ({e}). Get Godot 4 from godotengine.org and set PIXELFORGE_GODOT."}
    if exe is None:
        return {"ok": False, "error": "Godot was not found. Get Godot 4 from godotengine.org and set PIXELFORGE_GODOT to the executable."}
    game = find_game(forge)
    cmd = command(exe, game=game, project=project, screen=screen, windowed=windowed, extra=extra)
    if log:
        log("$ " + " ".join(cmd))
    r = {"ok": True, "godot": exe, "game": str(game) if game else None, "command": cmd}
    if wait:
        proc = subprocess.run(cmd, cwd=str(forge))
        r["returncode"] = proc.returncode
        return r
    flags = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if sys.platform.startswith("win") else {}
    proc = subprocess.Popen(cmd, cwd=str(forge), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, **flags)
    r["pid"] = proc.pid
    return r
