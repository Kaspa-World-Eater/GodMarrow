"""PixelForge Studio: the desktop app as one window with pages.

Modules (nothing here imports Tk at import time, so the package is safe for tests and headless runs):

- ``theme``        the dark theme and the palette (``apply_theme``, ``colours``)
- ``editor_core``  the editors' model: layers, selection, undo/redo, ops (no window)
- ``widgets``      scroll pages, zoomable previews, thumbnail strips, animation player, forms, inline notes
- ``app``          the shell: left navigation, pages, status line, progress, log drawer, keys, drag-and-drop
- ``pages_home``, ``pages_character``, ``pages_editors``, ``pages_fx``, ``pages_spell``, ``pages_tools``,
  ``pages_game``, ``pages_misc``   one module per page family

``pixelforge.gui`` keeps its old names (``Studio``, ``apply_theme``, ``main``) and forwards here.
See docs/track_notes/ui.md in the game repository for how a page or a step is added.
"""
from __future__ import annotations

__all__ = ["main"]


def main(project_path: str | None = None) -> None:
    from .app import main as _main

    _main(project_path)
