"""rembg: background removal for a painting that needs a cutout (the old road's first step, a prop, a portrait). The `rembg`
command, or the Python package in this interpreter (`python -m rembg`). Note: rembg itself fetches its model file
(about 170 MB) the first time it runs; that is the tool's own behaviour, and the adapter says so."""

from __future__ import annotations

import importlib.util
from pathlib import Path

from . import _base as B

NAME = "rembg"
TITLE = "rembg"
WHAT = "cut a painting's subject from its background (a transparent PNG) before the cutout steps or a prop"
HOME = "https://github.com/danielgatis/rembg"
LICENCE = "MIT"
INSTALL = "Install rembg with `pip install rembg[cli]` (github.com/danielgatis/rembg); its first run fetches the u2net model file itself (about 170 MB)."
EXE_NAMES = ["rembg", "rembg.exe"]
NOTE = "rembg downloads its model file (about 170 MB) on its first run; that is rembg's own step, nothing the Forge fetches."


def find() -> str | None:
    exe = B.env_override(NAME) or B.which(EXE_NAMES)
    if exe:
        return exe
    if importlib.util.find_spec("rembg") is not None:
        return B.python() + " -m rembg"
    return None


def command_prefix(exe: str) -> list[str]:
    return exe.split(" -m ") if " -m " in exe else [exe]


def _prefix(exe: str) -> list[str]:
    return [exe.split(" -m ")[0], "-m", "rembg"] if " -m " in exe else [exe]


def version(exe: str) -> str:
    try:
        from importlib.metadata import version as v
        return "rembg " + v("rembg")
    except Exception:  # noqa: BLE001
        return B.version_of(_prefix(exe)[0], "--version") if " -m " not in exe else ""


def explain_missing() -> str:
    return INSTALL


def cutout_command(exe: str, src: str, out: str, model: str = "u2net") -> list[str]:
    return [*_prefix(exe), "i", "-m", model, str(src), str(out)]


def cutout(src: str, out: str = "", model: str = "u2net") -> dict:
    """A transparent PNG of the subject. model: u2net (general), isnet-general-use, u2net_human_seg, silueta (small)."""
    exe = find()
    out = out or str(Path(src).with_name(Path(src).stem + "_cut.png"))
    cmd = cutout_command(exe, src, out, model)
    r = B.call(cmd, 900)
    ok = r.returncode == 0 and Path(out).exists()
    return {"ok": ok, "png": out if ok else "", "command": cmd, "note": NOTE, **({} if ok else {"error": B.first_line(r.stderr) or "rembg wrote nothing."})}


def status() -> dict:
    exe = find()
    return {"ok": True, "found": exe is not None, "exe": exe or "", "version": version(exe) if exe else "", "install": INSTALL, "note": NOTE}


ACTIONS = {"status": status, "cutout": cutout}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    import sys
    return B.dispatch(sys.modules[__name__], action, params)
