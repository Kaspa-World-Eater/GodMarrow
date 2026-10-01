"""The cutout editor: now a page of the Studio (``pixelforge.studio.pages_editors.CutoutPage``) over
``pixelforge.studio.editor_core.ImageDoc``; this module keeps the old entry point.

Opens ``views/<name>.png`` next to its raw crop ``views/<name>_raw.png`` (saved by
the split step).  Tools:

- **Erase** (left drag): makes pixels transparent.
- **Restore** (right drag, or the Restore tool): brings the raw pixels back.
- **Magic erase** (tool + click): removes the connected patch of similar colour
  under the cursor (trapped background between an arm and the body, a white
  gap between beads), with the tolerance slider.
- Undo, brush size, zoom, Revert to the automatic cutout, Save.

Saving writes the view PNG; the next steps (palette, model) use it as is.
"""

from __future__ import annotations


def _studio_of(master):
    """The Studio an old-style ``master`` belongs to (the editors are pages of it now, never separate windows)."""
    st = getattr(master, "studio", None) or (master if hasattr(master, "show") and hasattr(master, "pages") else None)
    if st is None:
        raise RuntimeError("The cutout editor is a page of PixelForge Studio (pixelforge studio); pass the Studio, or use the skin ops (pixelforge skin <image> ops.json)")
    return st


def open_editor(master, view_path, on_save=None):
    """Open the cutout editor page on ``view_path`` (kept for older callers)."""
    return _studio_of(master).show("cutout", path=str(view_path), on_save=on_save)
