"""The character road fixes (track/pf-fixes): the docs and the hero note, the game's default height, painting to
shapes (measure, draft --from-measure, sample-materials, compare), the format traps, the parts kit, the skins entry
on export, and the Hemomancer generator."""
import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pixelforge import api, shape_rig as R, shape_tools as T, shapes as S
from pixelforge.cli import HERO_NOTE, main

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]


# ------------------------------------------------------------------------------------------- 1. docs and the hero note
def test_hero_prints_the_old_road_note_unless_cutout(monkeypatch, capsys):
    import pixelforge.hero as hero

    monkeypatch.setattr(hero, "make_hero", lambda *a, **k: {"ok": True, "stub": True})
    main(["hero", "sheet.png", "x", "--json"])
    err = capsys.readouterr().err
    assert "old cutout road" in err and "shapes" in err and HERO_NOTE in err
    main(["hero", "sheet.png", "x", "--json", "--cutout"])
    assert "old cutout road" not in capsys.readouterr().err


def test_docs_point_at_the_shape_road():
    for f in (REPO / "CLAUDE.md", REPO / "tools" / "pixelforge" / "CLAUDE.md", HERE.parent / "docs" / "GUIDE_AI.md", HERE.parent / "docs" / "GUIDE_HUMANS.md"):
        text = f.read_text().lower()
        assert "shape" in text and ("character road" in text or "characters are shape" in text or "characters are made as shape" in text), f
    ai = (HERE.parent / "docs" / "GUIDE_AI.md").read_text()
    assert "old" in ai.split("pixelforge hero <sheet.png>")[1].split("\n")[0].lower()
