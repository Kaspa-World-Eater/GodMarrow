"""The Studio without a window: the editors' model, the page registry, the tool specs and the reset step."""
import importlib
import json

import numpy as np
import pytest
from PIL import Image

from pixelforge.studio import editor_core as E


def _cutout(tmp_path):
    rgba = np.zeros((40, 30, 4), np.uint8)
    rgba[5:35, 5:25] = (120, 40, 160, 255)      # the body, purple
    rgba[10:14, 10:14] = (80, 220, 200, 255)     # an "eye", teal
    rgba[30:34, 18:22] = (255, 255, 255, 255)    # a white speck
    p = tmp_path / "front.png"
    Image.fromarray(rgba, "RGBA").save(p)
    raw = rgba.copy()
    raw[..., 3] = 255
    raw[0:5, :, :3] = (200, 200, 200)            # background in the raw crop
    Image.fromarray(raw, "RGBA").save(tmp_path / "front_raw.png")
    return p


def test_doc_wand_selection_modes_and_tools_inside_selection(tmp_path):
    doc = E.ImageDoc(_cutout(tmp_path))
    assert doc.raw is not None and doc.shape == (40, 30)
    eye = doc.wand(11, 11, 0.1)
    assert eye.sum() == 16 and not eye[20, 20]
    doc.select(eye, "replace", {"like": {"at": [11, 11], "range": 0.1}})
    doc.select(doc.rect(18, 30, 21, 33), "add", {"rect": [18, 30, 21, 33]})
    assert doc.selected_count() == 32
    doc.select(doc.rect(18, 30, 19, 33), "subtract", {"rect": [18, 30, 19, 33]})
    assert doc.selected_count() == 24
    # a brush op only lands inside the selection
    doc.apply({"op": "paint", "at": [20, 20], "radius": 16, "color": "#000000"})
    assert tuple(doc.rgba[20, 20, :3]) == (120, 40, 160)      # outside: untouched
    assert tuple(doc.rgba[11, 11, :3]) == (0, 0, 0)           # inside: painted
    assert doc.can_undo() and doc.undo() and tuple(doc.rgba[11, 11, :3]) == (80, 220, 200)
    assert doc.can_redo() and doc.redo() and tuple(doc.rgba[11, 11, :3]) == (0, 0, 0)
    # the selection becomes a named region with replayable pieces
    ops = doc.name_selection("eye_left")
    assert ops[0]["mode"] == "replace" and ops[1]["mode"] == "add" and ops[2]["mode"] == "subtract"
    assert "eye_left" in doc.regions and doc.ops[-1]["name"] == "eye_left"


def test_doc_erase_restore_layers_and_save_keep_bak(tmp_path):
    p = _cutout(tmp_path)
    doc = E.ImageDoc(p)
    doc.select(doc.rect(0, 0, 29, 6), "replace")
    doc.erase_selection()
    assert doc.rgba[5, 10, 3] == 0
    doc.restore_selection()
    assert doc.rgba[2, 10, 3] == 255 and tuple(doc.rgba[2, 10, :3]) == (200, 200, 200)
    doc.select(None)
    doc.add_layer("glow")
    assert doc.active == 1
    doc.apply({"op": "paint", "at": [15, 20], "radius": 2, "color": "#ff0000"})
    assert tuple(doc.rgba[20, 15, :3]) == (255, 0, 0) and tuple(doc.layers[0]["rgba"][20, 15, :3]) == (120, 40, 160)
    doc.toggle_layer()
    assert tuple(doc.rgba[20, 15, :3]) == (120, 40, 160)
    doc.toggle_layer()
    doc.merge_down()
    assert len(doc.layers) == 1 and tuple(doc.rgba[20, 15, :3]) == (255, 0, 0)
    r = doc.save()
    assert (tmp_path / "front.png.bak").exists() and r["layers"] == 1
    assert tuple(np.array(Image.open(p).convert("RGBA"))[20, 15, :3]) == (255, 0, 0)
    doc.revert_to_original()
    assert tuple(doc.rgba[20, 15, :3]) == (120, 40, 160)
    ops_path = doc.save_ops()
    assert json.loads(open(ops_path).read())[0]["op"] in ("erase", "restore", "paint")
    assert doc.swatches(4) and all(c.startswith("#") for c in doc.swatches(4))
    assert doc.colour_at(0, 0) is None or doc.colour_at(10, 10) == "#50dcc8"


def test_doc_clone_brush_copies_own_pixels(tmp_path):
    doc = E.ImageDoc(_cutout(tmp_path))
    doc.clone_source = (11, 11)             # the teal eye
    doc.begin_stroke()
    doc.clone_stroke([(20, 20), (21, 20)], radius=2, stroke=True)
    doc.end_stroke()
    assert tuple(doc.rgba[20, 20, :3]) == (80, 220, 200)
    assert doc.ops[-1]["op"] == "clone" and doc.ops[-1]["from"] == [11, 11]


def test_outline_and_rect_helpers():
    m = np.zeros((6, 6), bool)
    m[1:5, 1:5] = True
    o = E.outline_of(m)
    assert o.sum() == 12 and not o[2, 2]
    r = E.rect_mask((6, 6), 4, 4, 1, 1)
    assert r.sum() == 16


def test_pages_registry_imports_without_tk():
    """Every page module imports headlessly (Tk is only touched when a page is built)."""
    from pixelforge.studio import app

    for key, (mod, cls) in app.PAGES.items():
        m = importlib.import_module(f"pixelforge.studio.{mod}")
        assert hasattr(m, cls), (key, mod, cls)
    import pixelforge.gui as gui

    assert gui.Studio is app.Studio and callable(gui.main) and callable(gui.apply_theme)


def test_tool_specs_are_well_formed():
    from pixelforge.studio.pages_tools import TAB_TOOLS
    from pixelforge.tools_window import TOOLS, run_tool

    titles = {t[0] for t in TOOLS}
    for tab, names in TAB_TOOLS.items():
        for n in names:
            assert n in titles, (tab, n)
    for title, blurb, fields, key in TOOLS:
        assert blurb and key
        for f in fields:
            assert f[1] in ("file", "dir", "text", "int", "float", "choice", "check"), (title, f)
    with pytest.raises(ValueError):
        run_tool("no-such-tool", {})


def test_reset_character_redo_from_step_and_start_over(tmp_path):
    from pixelforge import api
    from pixelforge.project import Project

    api.new_project(tmp_path / "g", "G", "16bit")
    p = Project.load(tmp_path / "g")
    api.add_character(p, "hero", "a hero")
    c = p.character("hero")
    for k in ("prompts", "import", "split", "palette", "model"):
        c.done[k] = True
    c.notes["model_note"] = "built"
    c.notes["split_check"] = "cutouts clean"
    (p.sub("hero", "views") / "front.png").write_bytes(b"x")
    (p.sub("hero", "source") / "sheet.png").write_bytes(b"x")
    c.sources["sheet"] = "characters/hero/source/sheet.png"
    p.save()
    r = api.reset_character(p, "hero", from_step="palette")
    assert r["cleared"] == ["palette", "model", "rig", "render", "pixelate", "export"] and r["next"] == "palette"
    p = Project.load(tmp_path / "g")
    c = p.character("hero")
    assert c.done["split"] and not c.done["palette"] and "model_note" not in c.notes and (p.char_dir("hero") / "views" / "front.png").exists()
    r = api.reset_character(p, "hero")
    assert "views" in r["removed"] and r["kept_sources"] and r["next"] == "split"
    p = Project.load(tmp_path / "g")
    c = p.character("hero")
    assert not c.done["split"] and c.done["import"] and (p.char_dir("hero") / "source" / "sheet.png").exists()
    assert not (p.char_dir("hero") / "views").exists()
    with pytest.raises(api.StepError):
        api.reset_character(p, "hero", from_step="nowhere")


def test_sprite_set_doc_attachments(tmp_path):
    """The effects editor's model: add, move, copy to all views, undo, without a window."""
    sheet = np.zeros((20, 40, 4), np.uint8)
    sheet[2:18, 2:18] = (200, 180, 160, 255)
    sheet[2:18, 22:38] = (200, 180, 160, 255)
    Image.fromarray(sheet, "RGBA").save(tmp_path / "hero.png")
    data = {"sheets": ["hero.png"], "meta": {"kind": "hero", "name": "Hero", "anims": {"idle": {"frames": 2, "views": ["down", "front_l"]}}},
            "idx": {"idle/down/0": [0, 2, 2, 16, 16, -8, -16], "idle/down/1": [0, 22, 2, 16, 16, -8, -16],
                    "idle/front_l/0": [0, 2, 2, 16, 16, -8, -16], "idle/front_l/1": [0, 22, 2, 16, 16, -8, -16]}}
    (tmp_path / "hero.json").write_text(json.dumps(data))
    doc = E.SpriteSetDoc(tmp_path / "hero.json", tmp_path / "fx")
    fr, (gx, gy) = doc.frame("down", 0)
    assert fr.shape == (16, 16, 4) and (gx, gy) == (8, 16)
    i = doc.add("wisp", "down", (3.0, -10.0), palette="wisp", scale=0.5, glow=True, behind=True)
    assert doc.atts[i]["z"] == "behind" and doc.atts[i]["views"]["down"] == [3.0, -10.0]
    doc.copy_to_all(i, "down")
    assert doc.atts[i]["views"]["front_l"] == [-3.0, -10.0]
    doc.set_props(i, palette="lantern", glow=False)
    assert doc.atts[i]["fx"] == "hero_wisp_1_lantern"
    doc.undo()
    assert "front_l" not in doc.atts[i]["views"]
    doc.redo()
    assert doc.atts[i]["views"]["front_l"] == [-3.0, -10.0]
    doc.delete(i)
    assert doc.atts == [] and doc.undo() and len(doc.atts) == 1
