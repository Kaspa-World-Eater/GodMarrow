"""The skin editor: a paint-program toolbar over a sprite, atlas or cutout. It is a page of the Studio now
(``pixelforge.studio.pages_editors.SkinPage`` over ``pixelforge.studio.editor_core.ImageDoc``); every stroke is an
op from ``skin_ops``, so what a person does there an AI does with ``apply_ops``.
"""
from __future__ import annotations

from .studio.editor_core import composite


def _studio_of(master):
    """The Studio an old-style ``master`` belongs to (the editors are pages of it now, never separate windows)."""
    st = getattr(master, "studio", None) or (master if hasattr(master, "show") and hasattr(master, "pages") else None)
    if st is None:
        raise RuntimeError("The skin editor is a page of PixelForge Studio (pixelforge studio); pass the Studio, or use skin_ops.apply_ops")
    return st


class SkinEditor:
    """The page lives in ``pixelforge.studio.pages_editors.SkinPage``; the layer compositing is kept here by name."""

    composite = staticmethod(composite)


def open_skin_editor(master, image_path, on_save=None):
    """Open the skin editor page on ``image_path`` (kept for older callers)."""
    return _studio_of(master).show("skin", path=str(image_path), on_save=on_save)
