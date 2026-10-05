"""Where things live for the Diablo 2 bridge, and the one rule every writer keeps.

Blizzard's files never enter the repository. Everything read from the game (extracted MPQ files, their sprites turned
into our frames, their tables) lives in a local reference folder outside the repository tree: ``~/PixelForge
Reference/d2/`` unless ``PIXELFORGE_D2_DIR`` or the settings say otherwise. :func:`guard_destination` refuses any
destination inside the repository and is called by every writer that writes something derived from the game. Our
own sprites and our mod files are ours and may go anywhere.

Settings (``d2.json``: in the project folder when a project is given, else ``~/.pixelforge/d2.json``): ``game``
(the install folder), ``reference``, ``mpq_editor`` (the extractor). Environment variables win over settings:
``PIXELFORGE_D2_DIR``, ``PIXELFORGE_D2_GAME``, ``PIXELFORGE_MPQ_EDITOR``.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

PF_ROOT = Path(__file__).resolve().parent.parent.parent      # tools/pixelforge
SETTINGS_NAME = "d2.json"


class RepoTreeError(ValueError):
    """A destination inside the repository for something read from the game."""


class D2Error(RuntimeError):
    """A failure in plain words, naming what to install or set."""


def repo_root() -> Path | None:
    """The repository that holds PixelForge (the folder with ``.git``, a file or a folder, above this package)."""
    for p in [PF_ROOT, *PF_ROOT.parents]:
        if (p / ".git").exists():
            return p
    return None


def inside_repo(path: str | Path) -> bool:
    root = repo_root()
    if root is None:
        return False
    try:
        Path(path).resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def guard_destination(path: str | Path, what: str = "files read from Diablo 2") -> Path:
    """Refuse a destination inside the repository tree for anything derived from the game. Returns the path."""
    p = Path(path)
    if inside_repo(p):
        raise RepoTreeError(f"{p} is inside the repository ({repo_root()}): {what} never go there. Use the reference folder "
                            f"({default_reference()}) or any folder outside the repository.")
    return p


def default_reference() -> Path:
    return Path.home() / "PixelForge Reference" / "d2"


def user_settings_file() -> Path:
    return Path.home() / ".pixelforge" / SETTINGS_NAME


def load_settings(project: str | Path | None = None) -> dict:
    out: dict = {}
    for f in [user_settings_file(), (Path(project) / SETTINGS_NAME) if project else None]:
        if f and f.exists():
            try:
                d = json.loads(f.read_text())
                if isinstance(d, dict):
                    out.update(d)
            except json.JSONDecodeError:
                pass
    return out


def save_settings(values: dict, project: str | Path | None = None) -> Path:
    f = (Path(project) / SETTINGS_NAME) if project else user_settings_file()
    cur = {}
    if f.exists():
        try:
            cur = json.loads(f.read_text())
        except json.JSONDecodeError:
            cur = {}
    cur.update({k: v for k, v in values.items() if v is not None})
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(cur, indent=1) + "\n")
    return f


def reference_dir(project: str | Path | None = None, hint: str | Path | None = None) -> Path:
    """The local reference folder: the hint, ``PIXELFORGE_D2_DIR``, the settings, else the default. Never inside the repository."""
    env = os.environ.get("PIXELFORGE_D2_DIR")
    for c in (hint, env, load_settings(project).get("reference")):
        if c:
            return guard_destination(Path(c).expanduser(), "the reference folder's files")
    return default_reference()


# ---------------------------------------------------------------- the install
CLASSIC_EXES = ["Game.exe", "Diablo II.exe"]
RESURRECTED_EXE = "D2R.exe"
USUAL_FOLDERS = [
    r"C:\Program Files (x86)\Diablo II", r"C:\Program Files\Diablo II", r"C:\Games\Diablo II", r"D:\Games\Diablo II", r"D:\Diablo II",
    r"C:\Program Files (x86)\Diablo II Resurrected", r"C:\Program Files\Diablo II Resurrected", r"D:\Games\Diablo II Resurrected",
    r"C:\Program Files (x86)\Battle.net\Diablo II Resurrected", r"D:\Diablo II Resurrected",
]


def kind_of_install(folder: Path) -> str | None:
    if (folder / RESURRECTED_EXE).exists():
        return "resurrected"
    if any((folder / e).exists() for e in CLASSIC_EXES) or (folder / "d2data.mpq").exists() or (folder / "D2Data.mpq").exists():
        return "classic"
    return None


def _registry_paths() -> list[tuple[str, str]]:
    if not sys.platform.startswith("win"):
        return []
    out = []
    try:
        import winreg  # type: ignore
    except ImportError:
        return out
    keys = [(winreg.HKEY_CURRENT_USER, r"Software\Blizzard Entertainment\Diablo II", "InstallPath", "registry (current user, Diablo II)"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Blizzard Entertainment\Diablo II", "InstallPath", "registry (machine, Diablo II)"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Blizzard Entertainment\Diablo II", "InstallPath", "registry (machine, Diablo II)"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Diablo II Resurrected", "InstallLocation",
             "registry (uninstall, Diablo II Resurrected)")]
    for hive, key, value, how in keys:
        try:
            with winreg.OpenKey(hive, key) as k:
                v, _ = winreg.QueryValueEx(k, value)
                if v:
                    out.append((str(v), how))
        except OSError:
            continue
    return out


def find_install(project: str | Path | None = None, hint: str | Path | None = None) -> dict:
    """The game: ``{"ok", "path", "kind": classic | resurrected, "exe", "how"}`` or ``{"ok": False, "error"}`` naming
    what to set. Looks at the hint, ``PIXELFORGE_D2_GAME``, the settings, the registry, then the usual folders."""
    cands: list[tuple[str, str]] = []
    if hint:
        cands.append((str(hint), "the folder given"))
    if os.environ.get("PIXELFORGE_D2_GAME"):
        cands.append((os.environ["PIXELFORGE_D2_GAME"], "PIXELFORGE_D2_GAME"))
    s = load_settings(project).get("game")
    if s:
        cands.append((s, "the settings (d2 set --game)"))
    cands += _registry_paths()
    cands += [(f, "the usual folders") for f in USUAL_FOLDERS]
    for c, how in cands:
        p = Path(c).expanduser()
        kind = kind_of_install(p) if p.is_dir() else None
        if kind:
            exe = p / RESURRECTED_EXE if kind == "resurrected" else next((p / e for e in CLASSIC_EXES if (p / e).exists()), p / "Game.exe")
            return {"ok": True, "path": str(p), "kind": kind, "exe": str(exe), "how": how}
    return {"ok": False, "error": "Diablo 2 was not found. Install it (classic Diablo II with Lord of Destruction, or Diablo II Resurrected), or tell "
                                  "PixelForge where it is: `pixelforge d2 set --game \"C:\\Program Files (x86)\\Diablo II\"` (or set PIXELFORGE_D2_GAME)."}


def mpq_files(install: str | Path) -> list[Path]:
    """The archives of a classic install, the patch first (what the game reads first)."""
    install = Path(install)
    order = ["patch_d2.mpq", "d2exp.mpq", "d2char.mpq", "d2data.mpq", "d2xtalk.mpq", "d2speech.mpq", "d2sfx.mpq", "d2music.mpq", "d2xmusic.mpq", "d2video.mpq", "d2xvideo.mpq"]
    found = {p.name.lower(): p for p in install.glob("*.mpq")} | {p.name.lower(): p for p in install.glob("*.MPQ")}
    return [found[n] for n in order if n in found] + [p for n, p in sorted(found.items()) if n not in order]
