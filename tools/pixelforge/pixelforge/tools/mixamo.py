"""Mixamo: a website, not a program. Nothing to find or run; the rig step of the old road goes through the owner's browser
(by hand, or Claude in Chrome through the bridge: GUIDE_AI, "Doing the Mixamo step yourself"). The character road
(shape sprites) does not need it at all."""

from __future__ import annotations

NAME = "mixamo"
TITLE = "Mixamo"
WHAT = "auto-rigging and motion capture clips for the old road's FBX (a website; the shape-sprite road needs none of it)"
HOME = "https://www.mixamo.com/"
LICENCE = "free with an Adobe account (Adobe's terms; not open source)"
INSTALL = "Mixamo is a website: sign in at mixamo.com with a free Adobe account in your browser; the Forge's Claude bridge can drive it through Claude in Chrome, or you upload the FBX yourself."
BROWSER = True


def find() -> str | None:
    return None


def version(exe: str) -> str:
    return ""


def explain_missing() -> str:
    return INSTALL


def status() -> dict:
    return {"ok": True, "found": False, "exe": "", "version": "", "install": INSTALL, "browser": True}


ACTIONS = {"status": status}
OFFLINE_ACTIONS = ("status",)


def run(action: str, **params) -> dict:
    import sys
    from . import _base as B
    return B.dispatch(sys.modules[__name__], action, params)
