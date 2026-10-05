"""The retired roads and the one flag that reopens them.

The game's note (``docs/FORGE_FROM_THE_GAME.md`` section 2) asked for the roads that lead to a blob to go out of the
way of a person or a session: the old cutout road (``hero``: cutouts, Blender, Mixamo, renders), the kit props and
3D ground (``prop3d``, ``tiles3d``), the automatic drafting of a character (``shapes draft``, ``character
from-picture`` and the describe line's shape drafts) and the old music generator (the web score's port, ``music
<cue>`` through ``music/score.py``). Their code stays in the package; nothing reaches it from the Forge app, the
guides' standard procedure or the command line unless the environment sets ``PIXELFORGE_OLD_ROADS=1``.

``retired(road)`` is what an entry point calls first: with the flag off it prints one line that names the flag and
stops (a ``--json`` caller gets ``{"ok": false, "error": ...}`` so the Forge shows the line on its state line).
"""
from __future__ import annotations

import json
import os
import sys

FLAG = "PIXELFORGE_OLD_ROADS"

ROADS = {
    "hero": "the old cutout road (cutouts, Blender, Mixamo, renders)",
    "prop3d": "kit props from 3D models",
    "tiles3d": "3D-rendered ground tiles",
    "draft": "automatic drafting of a character from a sentence",
    "from-picture": "automatic drafting of a character from a picture",
    "music-score": "the old music generator (the web score's port)",
}


def old_roads_on() -> bool:
    """True when the environment reopens the retired roads (``PIXELFORGE_OLD_ROADS=1``)."""
    return os.environ.get(FLAG, "").strip().lower() in ("1", "true", "yes", "on")


def retired_line(road: str) -> str:
    what = ROADS.get(road, road)
    return (f"{road}: this road is retired ({what}); characters are hand-authored shape models (pixelforge shapes ...) "
            f"and the Characters bench. Set {FLAG}=1 to reach it again.")


def retired(road: str, a=None) -> None:
    """Stop an entry point of a retired road with one plain line, unless the flag reopens it. ``a`` is the parsed
    arguments (its ``json`` flag decides the shape of the line)."""
    if old_roads_on():
        return
    line = retired_line(road)
    if a is not None and getattr(a, "json", False):
        print(json.dumps({"ok": False, "error": line, "retired": road, "flag": FLAG}, indent=1))
    else:
        print(line, file=sys.stderr)
    raise SystemExit(2)
