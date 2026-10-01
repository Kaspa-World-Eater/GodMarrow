"""PixelForge Studio - the desktop app (Tkinter, ships with Python on Windows).

The application lives in :mod:`pixelforge.studio` (one window: navigation on the left, pages on the right, a
status line, a progress bar and a log drawer at the bottom; no pop-ups). This module keeps the names older scripts
and the launcher use: ``Studio``, ``apply_theme`` and ``main`` (what ``pixelforge studio`` runs).
"""
from __future__ import annotations

from .studio.app import APP_TITLE, HELP_URL, RECENT_FILE, STEP_BLURB, Studio, main, make_root  # noqa: F401
from .studio.app import recent as _recent  # noqa: F401
from .studio.app import remember as _remember  # noqa: F401
from .studio.theme import BONE, DIM, FIELD, FONT, FONT_B, FONT_H, FONT_T, GOLD, INK, PANEL, RUST, TEAL, apply_theme  # noqa: F401

__all__ = ["Studio", "apply_theme", "main", "make_root", "APP_TITLE"]


if __name__ == "__main__":
    import sys

    main(sys.argv[1] if len(sys.argv) > 1 else None)
