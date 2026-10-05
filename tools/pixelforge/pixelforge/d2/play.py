"""Play him in Diablo 2: find the install, build the mod into it, write a launch shortcut with the right flags, and
start the game. Asks first; nothing silent. The classic game takes ``Game.exe -direct -txt`` with the files under
``<install>/data``; Resurrected takes ``D2R.exe -mod NAME -txt`` with ``<install>/mods/NAME/NAME.mpq/data`` (and
shows the old sprites in Legacy graphics, the G key)."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from .modexport import export_mod, launch_flags
from .paths import D2Error, find_install, reference_dir
from .source import D2Source

DEFAULT_TOKEN = "NE"


def frames_dir_for(project: str | Path, character: str) -> Path:
    from ..project import Project, slugify
    p = Project.load(project)
    name = slugify(character)
    if name not in p.characters:
        raise D2Error(f"no character {character!r} in the project {p.root}; it has {sorted(p.characters)}")
    return p.char_dir(name) / "frames"


def shortcut_text(install: Path, exe: Path, flags: list[str], windows: bool) -> str:
    if windows:
        return f'@echo off\r\ncd /d "{install}"\r\nstart "" "{exe}" {" ".join(flags)}\r\n'
    return f'#!/bin/sh\ncd "{install}" && "{exe}" {" ".join(flags)}\n'


def plan(character: str, project: str | Path, *, token: str = DEFAULT_TOKEN, mod_name: str | None = None, install_hint: str | None = None) -> dict:
    inst = find_install(project, install_hint)
    if not inst["ok"]:
        return inst
    frames = frames_dir_for(project, character)
    if not (frames / "animations.json").exists():
        return {"ok": False, "error": f"{character} has no rendered frames yet ({frames}): Render all on the Characters bench first (or `pixelforge project render-shapes {character}`)."}
    layout = "d2r" if inst["kind"] == "resurrected" else "direct"
    mod = mod_name or f"pf_{Path(frames).parent.name}"
    flags = launch_flags(layout, mod)
    return {"ok": True, "install": inst, "frames_dir": str(frames), "layout": layout, "mod_name": mod, "token": token.upper(), "flags": flags,
            "question": (f"Build the mod into {inst['path']} (files under {'mods/' + mod if layout == 'd2r' else 'data'} are added or replaced; "
                         f"the {token.upper()} token's animations become {character}) and open Diablo 2 with {' '.join(flags)}?")}


def play(character: str, project: str | Path, *, token: str = DEFAULT_TOKEN, mod_name: str | None = None, yes: bool = False, launch: bool = True, ask=None,
         install_hint: str | None = None, height: int | None = None, weapon_classes: list[str] | None = None, log=None) -> dict:
    pl = plan(character, project, token=token, mod_name=mod_name, install_hint=install_hint)
    if not pl["ok"]:
        return pl
    if not yes:
        asker = ask or (input if sys.stdin and sys.stdin.isatty() else None)
        if asker is None:
            return {"ok": False, "error": "This builds files into the game folder and starts the game; run it with --yes to agree (the Forge asks in its window).", "plan": pl}
        answer = str(asker(pl["question"] + " [y/N] ")).strip().lower()
        if answer not in ("y", "yes"):
            return {"ok": False, "error": "Stopped: nothing was written.", "plan": pl}
    inst = pl["install"]
    install = Path(inst["path"])
    source = D2Source(project=project, install=install, log=log)
    try:
        if source.find("data/global/animdata.d2") is None:
            source.get("data/global/animdata.d2", "the animation speeds")
    except D2Error as e:
        return {"ok": False, "error": str(e), "plan": pl}
    # files we would overwrite in the install are kept beside the reference folder
    backup = reference_dir(project) / "backup" / pl["mod_name"]
    try:
        r = export_mod(pl["frames_dir"], pl["token"], pl["mod_name"], install, target="character", layout=pl["layout"], source=source, height=height,
                       weapon_classes=weapon_classes, log=log)
    except D2Error as e:
        return {"ok": False, "error": str(e), "plan": pl}
    if not r["ok"]:
        return {"ok": False, "error": "the mod did not read back whole: " + "; ".join(r["validation"]["problems"][:3]), "export": r, "plan": pl}
    windows = sys.platform.startswith("win")
    sc_dir = Path(project) / "d2"
    sc_dir.mkdir(parents=True, exist_ok=True)
    sc = sc_dir / (f"Play {character} in Diablo 2" + (".bat" if windows else ".sh"))
    sc.write_text(shortcut_text(install, Path(inst["exe"]), pl["flags"], windows))
    if not windows:
        sc.chmod(0o755)
    out = {"ok": True, "export": {k: v for k, v in r.items() if k != "files"}, "shortcut": str(sc), "flags": pl["flags"], "install": inst, "launched": False,
           "words": f"{character} now stands in for the {pl['token']} token; {r['file_count']} files written; {r['colour_loss']['words']}."}
    if r["borrowed_modes"]:
        out["words"] += f" Modes without a clip of their own borrow one: {', '.join(r['borrowed_modes'])}."
    if launch:
        if windows:
            try:
                p = subprocess.Popen([inst["exe"], *pl["flags"]], cwd=str(install))
                out["launched"] = True; out["pid"] = p.pid
                out["words"] += " Diablo 2 is opening." + (" Press G in the game for the Legacy graphics, where the sprites show." if pl["layout"] == "d2r" else "")
            except OSError as e:
                out["words"] += f" The game did not start ({e}); the shortcut {sc.name} starts it."
        else:
            out["words"] += f" This is not Windows: start the game by hand with {' '.join(pl['flags'])} (the shortcut {sc.name} has the command)."
    return out
