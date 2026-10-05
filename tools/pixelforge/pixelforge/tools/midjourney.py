"""Midjourney: a website, not a program. The paintings come through the owner's Chrome (Claude in Chrome through the
bridge: `pixelforge midjourney fetch`) or by hand with a copied prompt. Nothing to find or run here."""

from __future__ import annotations

NAME = "midjourney"
TITLE = "Midjourney"
WHAT = "the reference paintings (a website; `pixelforge midjourney fetch` drives it through Claude in Chrome, or you paint the copied prompt yourself)"
HOME = "https://www.midjourney.com/"
LICENCE = "paid subscription (Midjourney's terms; not open source)"
INSTALL = "Midjourney is a website: a subscription at midjourney.com, signed in in your Chrome; the Characters bench's Paint it in Midjourney needs Claude Code with the Claude in Chrome extension, or Copy prompt and paint it yourself."
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
