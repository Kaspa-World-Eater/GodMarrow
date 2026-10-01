"""Props, VFX, tiles, UI 9-slice and the skill-tree editor (headless)."""
import json

import numpy as np
import pytest
from PIL import Image

from pixelforge import skilltree as st
from pixelforge.props import make_prop
from pixelforge.tiles import make_tiles
from pixelforge.ui9 import detect_border, make_ui9
from pixelforge.vfx import KINDS, LOOPING, make_vfx, periodic_noise, ramp_lut


def _tex(seed, c0, c1, n=96):
    f = periodic_noise(n, n, 4, np.random.default_rng(seed))[..., None]
    return Image.fromarray((np.array(c0) * (1 - f) + np.array(c1) * f).astype(np.uint8), "RGB")


@pytest.mark.parametrize("kind", KINDS)
def test_vfx_every_kind_loops_and_exports(tmp_path, kind):
    r = make_vfx(kind, "fx", tmp_path, frames=6, atlas_dir=tmp_path / "atlas")
    im = Image.open(r["png"])
    assert im.size == (r["size"][0] * 6, r["size"][1])
    assert np.asarray(im)[..., 3].max() == (255 if kind != "cookie" else np.asarray(im)[..., 3].max()) and np.asarray(im)[..., 3].max() > 200
    atlas = json.loads((tmp_path / "atlas" / "fx.json").read_text())
    anim = "loop" if kind in LOOPING else "once"
    assert len(atlas["idx"]) == 6 and f"{anim}/down/0" in atlas["idx"]
    assert atlas["meta"]["anims"][anim]["views"] == ["down"]


def test_vfx_ramp_is_the_palette_and_noise_tiles():
    lut = ramp_lut(["#2a1206", "#fff1b0"], 4)
    assert tuple(lut[0]) == (0x2A, 0x12, 0x06) and tuple(lut[-1]) == (0xFF, 0xF1, 0xB0)
    n = periodic_noise(32, 32, 2, np.random.default_rng(0))
    assert 0.0 <= n.min() and n.max() <= 1.0
    # wrap: the field is periodic, so rolling by a full period is the identity
    assert np.allclose(np.roll(n, 32, axis=0), n)


def test_tiles_variants_transitions_and_tileset(tmp_path):
    r = make_tiles(_tex(1, (28, 44, 30), (70, 96, 52)), "grass", tmp_path, second=_tex(2, (40, 42, 48), (110, 112, 118)), variants=3, tile=(36, 18))
    assert r["tiles"] == 3 + 16
    im = np.asarray(Image.open(r["png"]))
    assert im.shape == (18, 36 * 19, 4)
    # diamond mask: corners transparent, centre opaque
    assert im[0, 0, 3] == 0 and im[9, 18, 3] == 255
    # bits 0 = all first material, 15 = all second: their centres differ
    a = im[:, 36 * 3 : 36 * 4][im[:, 36 * 3 : 36 * 4, 3] > 0][:, :3].mean(axis=0)
    b = im[:, 36 * 18 : 36 * 19][im[:, 36 * 18 : 36 * 19, 3] > 0][:, :3].mean(axis=0)
    assert b[0] - a[0] > 20 and a[1] - a[0] > 10  # second = grey stone, first = green grass
    tres = (tmp_path / "grass.tres").read_text()
    assert "TileSetAtlasSource" in tres and "18:0/0 = 0" in tres and "tile_shape = 1" in tres


def test_ui9_detects_border_and_writes_stylebox(tmp_path):
    fr = np.zeros((60, 90, 4), np.uint8)
    fr[..., :3] = (24, 20, 18)
    fr[..., 3] = 255
    for a, b, c in ((0, 6, (120, 96, 60)), (2, 4, (200, 170, 90))):
        fr[a:b, :, :3] = c; fr[-b:(-a or None), :, :3] = c; fr[:, a:b, :3] = c; fr[:, -b:(-a or None), :3] = c
    assert detect_border(fr) == (6, 6, 6, 6)
    r = make_ui9(Image.fromarray(fr, "RGBA"), "panel", tmp_path, mid=4)
    assert r["size"] == [16, 16]
    assert "texture_margin_left = 6.0" in (tmp_path / "panel.tres").read_text()


def test_prop_merges_into_game_objects(tmp_path):
    im = Image.new("RGBA", (60, 90), (255, 255, 255, 255))
    px = np.asarray(im).copy()
    px[20:85, 20:40, :3] = (60, 40, 30)
    oj = tmp_path / "art" / "objects" / "objects.json"
    r = make_prop(Image.fromarray(px, "RGBA"), "post", tmp_path / "art" / "objects", height=48, game_objects=oj, hr=2)
    data = json.loads(oj.read_text())
    assert data["post"]["png"] == "res://art/objects/post/post_v1.png" and data["post"]["hr"] == 2
    assert data["post"]["oy"] > data["post"]["ox"]  # the foot anchor sits near the bottom
    assert r["game_objects"]["added"]["post"] == data["post"]


def test_skilltree_edits_apply_and_report_clashes(tmp_path):
    (tmp_path / "data").mkdir(); (tmp_path / "tools").mkdir()
    skills = [
        {"id": "a", "class": "x", "tab": 0, "row": 1, "col": 1, "name": "A", "required_level": 1, "prerequisites": [], "prerequisite_names": [], "kind": "cast"},
        {"id": "b", "class": "x", "tab": 0, "row": 2, "col": 1, "name": "B", "required_level": 6, "prerequisites": ["a"], "prerequisite_names": ["A"], "kind": "cast"},
    ]
    sp = tmp_path / "data" / "skills.json"
    sp.write_text(json.dumps({"skills": skills}))
    r = st.save_and_apply(sp, {"a": {"name": "Alpha", "row": 3}})
    assert r["changed"] == ["a"] and r["clashes"] == []
    d = st.load(sp)
    assert d["skills"][0]["required_level"] == 12 and d["skills"][1]["prerequisite_names"] == ["Alpha"]
    r = st.save_and_apply(sp, {"a": {"row": 2}})
    assert r["clashes"] and r["clashes"][0][1:] == ("a", "b")
    assert "Alpha" in st.list_tree(d, "x")


def test_recolor_map_and_hue(tmp_path):
    from pixelforge.recolor import recolor_image, recolor_set

    im = np.zeros((4, 4, 4), np.uint8)
    im[..., :3] = (29, 74, 76)   # the wisp teal
    im[..., 3] = 255
    im[0, 0, 3] = 0
    out = recolor_image(im, mapping={"#1d4a4c": "#7a3d10"})
    assert tuple(out[1, 1, :3]) == (0x7A, 0x3D, 0x10) and out[0, 0, 3] == 0
    shifted = recolor_image(im, hue=180.0)
    assert int(shifted[1, 1, 0]) > int(im[1, 1, 0])   # teal turned warm
    # a Godmarrow set
    d = tmp_path / "sprites"; d.mkdir()
    Image.fromarray(im, "RGBA").save(d / "wisp.png")
    (d / "wisp.json").write_text(json.dumps({"sheets": ["wisp.png"], "meta": {"kind": "wisp"}, "idx": {"idle/down/0": [0, 0, 0, 4, 4, 0, 0]}}))
    r = recolor_set(d, "wisp", "@champion", hue=90.0)
    assert (d / "wisp@champion.png").exists() and json.loads((d / "wisp@champion.json").read_text())["sheets"] == ["wisp@champion.png"]


def test_icons_from_flat_lay(tmp_path):
    from pixelforge.icons import make_icons

    im = np.full((120, 180, 3), 245, np.uint8)   # pale background, three objects
    im[20:60, 20:50] = (90, 60, 30)
    im[20:100, 80:95] = (120, 120, 130)          # a tall one -> 1x3
    im[70:105, 120:160] = (40, 80, 70)
    r = make_icons(Image.fromarray(im), tmp_path, ["pouch", "staff:1x3", "hood"])
    assert r["found"] == 3 and set(r["icons"]) == {"pouch", "staff", "hood"}
    assert Image.open(tmp_path / "staff@1x.png").size == (12, 36) and Image.open(tmp_path / "staff.png").size == (48, 144)
    assert Image.open(tmp_path / "hood@1x.png").size == (12, 12)
    data = json.loads((tmp_path / "icons.json").read_text())
    assert data["icons"]["staff"]["grid"] == [1, 3] and data["cell_px"] == 48


def test_sfx_presets_write_wav(tmp_path):
    import wave

    from pixelforge.sfx import PRESETS, make_sfx

    r = make_sfx("all", tmp_path, variations=1)
    assert len(r["files"]) == len(PRESETS)
    with wave.open(str(tmp_path / "hit.wav")) as w:
        assert w.getframerate() == 44100 and w.getnchannels() == 1 and w.getnframes() > 1000
    r2 = make_sfx("bone_click", tmp_path / "v", variations=3)
    assert len(r2["files"]) == 3


def test_music_cues_render_loop_and_sheet(tmp_path):
    import json
    import wave

    import numpy as np

    from pixelforge import music

    assert set(music.CUES) == set(music.CUE_INFO) and len(music.CUES) == 21
    for key in ("a1_town", "a3_wild", "boss5"):
        x = music.render_cue(key, 6)
        assert x.shape == (6 * music.RATE, 2) and np.isfinite(x).all()
        assert 0.06 < float(np.sqrt((x ** 2).mean())) < 0.13 and float(np.abs(x).max()) <= 1.0
    # the same seed is the same tune; another seed is another one
    a = music.render_cue("a1_wild", 4, seed=3)
    assert np.array_equal(a, music.render_cue("a1_wild", 4, seed=3))
    assert not np.array_equal(a, music.render_cue("a1_wild", 4, seed=4))
    r = music.make_music("a1_deep", tmp_path, seconds=5, overrides=music.parse_overrides(["bpm=70", "sc=phr", "drone=[26,0.05,180]"]))
    with wave.open(str(tmp_path / "a1_deep.wav")) as w:
        assert w.getnchannels() == 2 and w.getframerate() == 44100 and w.getnframes() == 5 * 44100
    assert (tmp_path / "a1_deep.png").exists()
    m = json.loads((tmp_path / "music.json").read_text())
    assert m["cues"]["a1_deep"]["loop"] and m["cues"]["a1_deep"]["knobs"]["sc"] == "phr"
    sheet = music.write_sheet(tmp_path / "sheet.json")
    assert len(sheet["cues"]) == 21
    edited = json.loads((tmp_path / "sheet.json").read_text())
    edited["title"]["bpm"] = 60
    (tmp_path / "sheet.json").write_text(json.dumps(edited))
    r2 = music.make_music("title", tmp_path / "s", seconds=4, sheet=tmp_path / "sheet.json")
    assert json.loads((tmp_path / "s" / "music.json").read_text())["cues"]["title"]["knobs"]["bpm"] == 60
    with pytest.raises(ValueError):
        music.parse_overrides(["tempo=1"])


def test_portrait_bust(tmp_path):
    from pixelforge.portrait import bust_box, make_portrait

    fig = np.zeros((200, 80, 4), np.uint8)
    fig[10:190, 30:50] = (90, 70, 60, 255)      # body
    fig[10:40, 25:55] = (200, 170, 140, 255)    # head, wider
    x0, y0, x1, y1 = bust_box(fig)
    assert y0 == 10 and 60 < y1 < 90
    r = make_portrait(Image.fromarray(fig, "RGBA"), "hero", tmp_path, sizes=(48,))
    assert Image.open(r["files"][48]).size == (48, 48)


def test_compare_strip_and_diff(tmp_path):
    from pixelforge.compare import compare

    a = Image.new("RGBA", (10, 10), (10, 20, 30, 255)); b = Image.new("RGBA", (10, 10), (10, 20, 40, 255))
    a.save(tmp_path / "a.png"); b.save(tmp_path / "b.png")
    r = compare(tmp_path / "a.png", tmp_path / "b.png", tmp_path / "cmp.png")
    assert r["mean_abs_diff"] == 2.5 and (tmp_path / "cmp.png").exists()


def test_doctor_runs():
    from pixelforge.doctor import format_report, run

    r = run(None)
    assert any(x["check"] == "numpy" and x["ok"] for x in r["rows"])
    assert "numpy" in format_report(r)


def test_world_prompts_carry_the_style_and_the_order_is_complete():
    from pixelforge.world_prompts import ART_ORDER, STYLE, WORLD_KINDS, art_order_markdown, build_world_prompt

    for k in WORLD_KINDS:
        p = build_world_prompt(k.key, "a thing", "https://x/y.png")
        assert "deep teal-blue, bone white" in p and "--sref https://x/y.png" in p and "pixel art" not in p
    assert "no glow" not in build_world_prompt("effect", "a flame")
    md = art_order_markdown("")
    assert md.count("## ") == len(ART_ORDER) + 1 and "[HERO SHEET IMAGE URL]" in md


def test_color_editor_keeps_shading_and_fx_editor_saves_attachments(tmp_path):
    import json

    import numpy as np
    from PIL import Image

    from pixelforge.color import rgb_to_oklab
    from pixelforge.color_editor import select_like, shift_colors
    from pixelforge.fx_editor import composite, load_set, mirror_to_all, save_attachments

    # a sprite with two shades of a violet eye glow and a grey body
    rgba = np.zeros((40, 40, 4), np.uint8)
    rgba[5:35, 5:35] = (90, 90, 90, 255)
    rgba[12:14, 12:14] = (200, 80, 220, 255)
    rgba[12:14, 26:28] = (160, 60, 180, 255)   # the same eye colour, darker
    lab = rgb_to_oklab(rgba[..., :3]).astype(np.float32)
    src = lab[12, 12]
    m = select_like(lab, rgba[..., 3], src, 0.12)
    assert m[12, 12] and m[12, 26] and not m[20, 20], "both eye shades, not the body"
    assert select_like(lab, rgba[..., 3], src, 0.12, (12, 12), 6)[12, 26] == False  # noqa: E712  (local: one eye only)
    dst = rgb_to_oklab(np.array([[[80, 220, 200]]], np.uint8))[0, 0]
    out = shift_colors(rgba, m, src, dst)
    assert tuple(out[20, 20, :3]) == (90, 90, 90)
    assert out[12, 12, 1] > out[12, 12, 0] and out[12, 26, 1] > out[12, 26, 0], "both eyes turned teal"
    assert int(out[12, 12, :3].astype(int).sum()) > int(out[12, 26, :3].astype(int).sum()), "the darker eye stays darker"

    # a tiny sprite set with one idle frame per view, the ground point under the feet
    views = ["down", "front", "side", "back", "up", "front_l", "side_l", "back_l"]
    sheet = np.zeros((40, 40 * len(views), 4), np.uint8)
    idx = {}
    for i, v in enumerate(views):
        sheet[:, i * 40:(i + 1) * 40] = rgba
        idx[f"idle/{v}/0"] = [0, i * 40, 0, 40, 40, -20, -38]
    Image.fromarray(sheet, "RGBA").save(tmp_path / "hero.png")
    data = {"sheets": ["hero.png"], "meta": {"kind": "hero", "anims": {"idle": {"frames": 1, "views": views}}, "fps": {"idle": 4}}, "idx": idx}
    (tmp_path / "hero.json").write_text(json.dumps(data))
    att = {"name": "smoke_1", "kind": "smoke", "palette": "wisp", "scale": 0.5, "glow": True, "fx": "hero_smoke_1",
           "views": mirror_to_all([-7.0, -26.0], "down", views)}
    assert att["views"]["front_l"] == [7.0, -26.0] and att["views"]["back"] == [-7.0, -26.0]
    fx_dir = tmp_path / "fx"
    r = save_attachments(tmp_path / "hero.json", [att], fx_dir)
    assert r["attachments"] == 1 and (fx_dir / "hero_smoke_1.png").exists() and (fx_dir / "hero_smoke_1.json").exists()
    saved = json.loads((tmp_path / "hero.json").read_text())
    assert saved["meta"]["attachments"][0]["views"]["side_l"] == [7.0, -26.0]
    s = load_set(tmp_path / "hero.json")
    fr, (dx, dy) = s["data"]["idx"]["idle/down/0"][1:5], s["data"]["idx"]["idle/down/0"][5:7]
    frame = sheet[:, 0:40]
    pad = 32
    canvas = np.zeros((40 + 2 * pad, 40 + 2 * pad, 4), np.uint8)
    canvas[pad:pad + 40, pad:pad + 40] = frame
    out = composite(canvas, (pad - dx, pad - dy), [att], "down", fx_dir, 0)
    assert out[..., 3].sum() > canvas[..., 3].sum(), "the effect is drawn onto the frame"


def test_spell_presets_render_and_export(tmp_path):
    import json

    from pixelforge import spell

    for k in spell.PRESETS:
        sp = spell.new_spell(k, k)
        frames = spell.render_spell(sp)
        assert len(frames) == sp["frames"] and frames[0].shape == (sp["size"][1], sp["size"][0], 4)
        assert any((f[..., 3] > 0).any() for f in frames), k
    sp = spell.new_spell("fireball", "fireball")
    sp["layers"][0]["hidden"] = True
    r = spell.export_spell(sp, tmp_path, gif=True, atlas_dir=tmp_path / "atlas")
    meta = json.loads((tmp_path / "fireball.json").read_text())
    assert meta["frame_width"] == 96 and meta["frames"] == 12 and (tmp_path / "fireball.gif").exists()
    assert (tmp_path / "fireball.spell.json").exists() and (tmp_path / "atlas" / "fireball.json").exists()
    assert spell.load_spell(tmp_path / "fireball.spell.json")["layers"][0]["hidden"] is True


def test_skin_ops_recolor_glow_region_and_replay(tmp_path):
    import json

    import numpy as np
    from PIL import Image

    from pixelforge import skin_ops

    rgba = np.zeros((60, 60, 4), np.uint8)
    rgba[10:50, 10:50] = (60, 50, 70, 255)
    rgba[20:23, 20:23] = (200, 80, 220, 255)   # an eye
    p = tmp_path / "front.png"
    Image.fromarray(rgba, "RGBA").save(p)
    Image.fromarray(np.full((60, 60, 4), (120, 120, 120, 255), np.uint8), "RGBA").save(tmp_path / "front_raw.png")
    ops = [{"op": "region", "name": "eye", "polygon": [[19, 19], [24, 19], [24, 24], [19, 24]]},
           {"op": "recolor", "region": "eye", "to": "#5ae6d2"},
           {"op": "glow", "at": [21, 21], "color": "#9ff4ea", "radius": 8, "strength": 0.6},
           {"op": "paint", "at": [40, 40], "color": "#ff0000", "radius": 2},
           {"op": "erase", "at": [12, 12], "radius": 1},
           {"op": "restore", "at": [45, 12], "radius": 1}]
    r = skin_ops.apply_ops(p, ops)
    out = np.array(Image.open(p).convert("RGBA"))
    assert r["regions"] == ["eye"] and (tmp_path / "front.regions.json").exists() and (tmp_path / "front.png.bak").exists()
    assert out[21, 21, 1] > out[21, 21, 0], "the eye turned teal"
    assert out[21, 28, :3].astype(int).sum() > rgba[21, 28, :3].astype(int).sum(), "the glow lit the cloth next to the eye"
    assert tuple(out[40, 40, :3]) == (255, 0, 0) and out[12, 12, 3] == 0 and tuple(out[12, 45, :3]) == (120, 120, 120)
    assert tuple(out[45, 45, :3]) == (60, 50, 70), "untouched cloth stays"
    # the regions survive to the next call and ops can be replayed from the file the editor writes
    (tmp_path / "front.ops.json").write_text(json.dumps([{"op": "recolor", "region": "eye", "to": "#ff8800"}]))
    r2 = skin_ops.apply_ops(p, json.loads((tmp_path / "front.ops.json").read_text()))
    out2 = np.array(Image.open(p).convert("RGBA"))
    assert out2[21, 21, 0] > out2[21, 21, 2], "replayed: the eye is orange now"


def test_describe_drafts_spells_skins_prompts_and_music(tmp_path):
    import numpy as np
    from PIL import Image

    from pixelforge.describe import draft, find_feature
    from pixelforge.game_preview import find_game, preview_command

    d = draft("a wisp lantern spell, pale blue, slow, with embers")
    assert d["what"] == "spell" and [l["kind"] for l in d["spell"]["layers"]] == ["embers", "wisp"]
    assert d["spell"]["layers"][0]["palette"] == "wisp" and d["spell"]["layers"][0]["speed"] == 0.5
    d = draft("fireball, big and fast")
    assert d["what"] == "spell" and len(d["spell"]["layers"]) == 3 and d["spell"]["layers"][1]["scale"] == 1.5
    d = draft("a bone shatter impact")
    assert d["spell"]["loop"] is False
    # a figure with two glowing eyes; the words find the left one
    rgba = np.zeros((120, 80, 4), np.uint8)
    rgba[10:110, 20:60] = (60, 50, 70, 255)
    rgba[22:25, 30:33] = (220, 80, 240, 255)
    rgba[22:25, 46:49] = (220, 80, 240, 255)
    p = tmp_path / "front.png"
    Image.fromarray(rgba, "RGBA").save(p)
    assert find_feature(rgba, "eye_left")["at"][0] < find_feature(rgba, "eye_right")["at"][0]
    assert find_feature(rgba, "feet")["at"][1] > 100
    d = draft("make the left eye teal with a pale glow", image=p)
    assert d["what"] == "skin" and d["ops"][0]["op"] == "recolor" and d["ops"][0]["at"][0] < 40 and d["ops"][1]["op"] == "glow"
    d = draft("erase the right hand", image=p)
    assert d["ops"] == [{"op": "erase", "at": d["ops"][0]["at"], "radius": d["ops"][0]["radius"]}]
    d = draft("a hero: a grave knight with a rusted helm")
    assert d["what"] == "prompt" and "turnaround" in d["prompt"]
    d = draft("a slow sombre act 2 wilds tune with more wind")
    assert d["what"] == "music" and d["cue"] == "a2_wild" and d["knobs"]["bpm"] < 84 and d["knobs"]["wind"] > 0.027
    # the game launcher composes the game's own test arguments
    (tmp_path / "game" / "art" / "sprites").mkdir(parents=True)
    (tmp_path / "game" / "project.godot").write_text("")
    assert find_game(tmp_path / "game" / "art" / "sprites") == tmp_path / "game"
    cmd = preview_command("godot", tmp_path / "game", skin="keeper", fx=["a", "b"], attach=True, shot=tmp_path / "s.png")
    assert "--skin=keeper" in cmd and "--cls=miasmancer" in cmd and "--fx=a,b" in cmd and "--attach" in cmd and any(a.startswith("--shot=") for a in cmd)
