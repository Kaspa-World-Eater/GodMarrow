"""The spell designer is a page of the Studio (``pixelforge.studio.pages_spell.SpellPage``): layers on the left,
the selected layer's knobs, a live looping preview. This module keeps the old entry point."""
from __future__ import annotations

from pathlib import Path



def _studio_of(master):
    """The Studio an old-style ``master`` belongs to (the editors are pages of it now, never separate windows)."""
    st = getattr(master, "studio", None) or (master if hasattr(master, "show") and hasattr(master, "pages") else None)
    if st is None:
        raise RuntimeError("The spell designer is a page of PixelForge Studio (pixelforge studio); pass the Studio, or use spell.render_spell / export_spell")
    return st


def open_spell_designer(master, path_or_preset="fireball", out_dir="art/fx", on_save=None):
    """Open the spell designer page (kept for older callers)."""
    p = Path(str(path_or_preset))
    kw = {"path": str(p)} if p.exists() else {"preset": str(path_or_preset)}
    return _studio_of(master).show("spell", out_dir=str(out_dir), **kw)
