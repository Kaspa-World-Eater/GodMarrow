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


def test_layout_helpers_padding_flow_and_elide():
    """The rules the pages lay themselves out by, without a window: a frame's padding (as Tk gives it back), how
    buttons flow into rows, and how the status line is cut to its width."""
    from pixelforge.studio.widgets import elide, flow_rows, pad_sides

    assert pad_sides((14,)) == (14, 14) and pad_sides((16, 8, 16, 4)) == (16, 16) and pad_sides((0, 0, 16, 4)) == (0, 16)
    assert pad_sides("12") == (12, 12) and pad_sides("8 4") == (8, 8) and pad_sides("") == (0, 0) and pad_sides(None) == (0, 0)
    assert flow_rows([100, 100, 100], 250) == [[0, 1], [2]]          # the third button would cross the edge
    assert flow_rows([300], 100) == [[0]] and flow_rows([], 100) == [[]]  # one item always fits on a row
    assert flow_rows([120, 120, 120, 120], 10_000) == [[0, 1, 2, 3]]
    measure = lambda s: len(s) * 10  # noqa: E731
    assert elide("short", measure, 100) == "short"
    cut = elide("a long status line that is cut", measure, 120)
    assert cut.endswith("…") and measure(cut) <= 120 and cut == "a long stat…"
    assert elide("two  spaced\nlines", measure, 1000) == "two spaced lines"


def _tk_display():
    """A Tk root when a display is there (Xvfb in the container, the desktop on Windows), else None."""
    try:
        import tkinter

        root = tkinter.Tk()
        root.withdraw()
        return root
    except Exception:  # noqa: BLE001
        return None


def _clipped(root, allow=()):
    """Widgets that pack or grid want shown but that are unmapped, narrower than they ask for, or past the screen's
    right edge; what a person would see cut off."""
    root.update_idletasks()
    root.update()
    sw = root.winfo_screenwidth()
    bad = []

    def walk(w):
        yield w
        for ch in w.winfo_children():
            yield from walk(ch)

    for w in walk(root):
        try:
            cls = w.winfo_class()
            if cls not in ("TButton", "TCombobox", "TCheckbutton", "TLabel", "TEntry", "TRadiobutton", "TSpinbox") or not w.winfo_manager():
                continue
            parent = w.nametowidget(w.winfo_parent())
            if not parent.winfo_ismapped() or not parent.winfo_viewable():
                continue
            text = str(w.cget("text"))[:40] if "text" in w.keys() else ""
            if text in allow:
                continue
            if not w.winfo_ismapped():
                bad.append(("unmapped", cls, text))
            elif w.winfo_rootx() + w.winfo_width() > sw + 1:
                bad.append(("off-screen", cls, text))
            elif w.winfo_width() < w.winfo_reqwidth() - 2:
                bad.append(("narrow", cls, text, w.winfo_width(), w.winfo_reqwidth()))
        except Exception:  # noqa: BLE001
            pass
    return bad


def test_every_page_fits_the_window(tmp_path, monkeypatch):
    """With a display: every page, every editor tool and the new-character form at the app's own window size show
    every button, box and label in full (nothing cut off on the right, nothing pushed off the row)."""
    root = _tk_display()
    if root is None:
        pytest.skip("no display / no tkinter")
    root.destroy()
    from pixelforge.studio import app as A

    home = tmp_path / "home" / ".pixelforge"      # the recent-projects list and the prefs stay in the test
    monkeypatch.setattr(A, "PREFS_DIR", home)
    monkeypatch.setattr(A, "RECENT_FILE", home / A.RECENT_FILE.name)
    monkeypatch.setattr(A, "PREFS_FILE", home / A.PREFS_FILE.name)
    from pixelforge import api
    from pixelforge.project import Project

    api.new_project(tmp_path / "g", "G", "16bit")
    p = Project.load(tmp_path / "g")
    api.add_character(p, "hero", "a hooded hero with a lantern")
    c = p.character("hero")
    rgba = np.zeros((64, 40, 4), np.uint8)
    rgba[4:60, 6:34] = (120, 40, 160, 255)
    for name in ("front", "front_raw", "side", "back"):
        Image.fromarray(rgba, "RGBA").save(p.sub("hero", "views") / f"{name}.png")
    Image.fromarray(rgba, "RGBA").save(p.sub("hero", "source") / "sheet.png")
    c.sources["sheet"] = "characters/hero/source/sheet.png"
    for k in ("prompts", "import", "split"):
        c.done[k] = True
    c.notes["split_check"] = "front: 3 loose island(s) (largest 2 px) will float as separate voxels"
    p.save()
    root = A.make_root()
    st = A.Studio(root, str(p.root))
    try:
        front = str(p.sub("hero", "views") / "front.png")
        problems = {}
        for key, kw in [("home", {}), ("character", {"step": "prompts"}), ("character", {"step": "import"}), ("character", {"step": "split"}),
                        ("character", {"step": "model"}), ("character", {"step": "render"}), ("character", {"step": "export"}), ("character", {"new": True}),
                        ("cutout", {"path": front}), ("skin", {"path": front}), ("colour", {"path": front}), ("fx", {}), ("spell", {}),
                        ("tools", {"tab": "effects"}), ("tools", {"tab": "music"}), ("tools", {"tab": "more"}), ("describe", {}), ("game", {}), ("settings", {}), ("help", {})]:
            pg = st.show(key, **kw)
            root.update()
            bad = _clipped(root)
            if bad:
                problems[f"{key} {kw}"] = bad
            if key in ("cutout", "skin", "colour"):
                for tool in [k for k, _g, _t in pg.TOOLS if k != "-"]:
                    pg.pick_tool(tool)
                    bad = _clipped(root)
                    if bad:
                        problems[f"{key}/{tool}"] = bad
        assert not problems, problems
        # the new-character form carries no step bar and no other character's check note
        cp = st.show("character", new=True)
        root.update()
        assert not cp.bar.winfo_ismapped() and cp.note.label.cget("text") == ""
        cp = st.show("character", step="split")
        root.update()
        assert cp.bar.winfo_ismapped() and "loose island" in cp.note.label.cget("text")
        # the status line shows what fits and keeps the whole text for the log and the page
        st._tell("x" * 600)
        root.update()
        assert len(st.status.get()) == 600 and st.status_shown.get().endswith("…") and st.status_label.winfo_reqwidth() <= st.status_label.winfo_width() + 2
    finally:
        root.destroy()
