"""Looks (fxlook): every look keeps the palette lock and grows the frame only by its declared reach, soft looks never
stop at the frame edge, loops close, the spec parses, and the looks reach vfx, spells, painted effects, animate,
describe-it and the effects editor with the anchor moved by the margin."""
import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image
from scipy import ndimage

from pixelforge import fxlook, spell, vfx
from pixelforge.fxlook import LOOKS, apply_looks, hex_to_rgb, parse_looks, spec_string


def _wisp(frames=8):
    return spell.render_kind("wisp", 32, 48, frames, "wisp", 3)


def _colours(frames):
    out = set()
    for f in frames:
        out |= set(map(tuple, f[f[..., 3] > 0][:, :3]))
    return out


def _diff(a, b):
    return float(np.abs(a.astype(int) - b.astype(int)).mean())


@pytest.mark.parametrize("name", list(LOOKS))
def test_every_look_keeps_shape_and_palette_lock(name):
    frames = _wisp()
    out, info = apply_looks(frames, name, vfx.PRESETS["wisp"], loop=True, seed=3)
    h, w = frames[0].shape[:2]
    l, t, r, b = info["pad"]
    assert all(f.shape == (h + t + b, w + l + r, 4) and f.dtype == np.uint8 for f in out), name
    assert info["size"] == [w + l + r, h + t + b] and any(info["pad"]) == (LOOKS[name].reach is not None), name
    tight, info2 = apply_looks(frames, name, vfx.PRESETS["wisp"], loop=True, seed=3, pad=False)
    assert all(f.shape == frames[0].shape for f in tight) and info2["pad"] == [0, 0, 0, 0], "pad=False keeps the frame"
    assert len(out) == (16 if name == "smooth" else 8), name
    palette = {hex_to_rgb(c) for c in info["palette"]}
    assert _colours(out) <= palette, name
    assert set(hex_to_rgb(c) for c in vfx.PRESETS["wisp"]) <= palette, "the effect's own palette is kept"
    assert info["looks"][0]["name"] == name and all(k in info["looks"][0] for k in LOOKS[name].params)
    assert any((f[..., 3] > 0).any() for f in out), name
    # looks that add light extend the palette; the rest leave it as it was
    assert (len(palette) > 5) == (LOOKS[name].extra is not None) or name == "outline", name   # outline's default colour is already in the wisp ramp


def test_each_look_changes_the_frames_differently():
    frames = _wisp()
    seen = {}
    for name in LOOKS:
        out, _ = apply_looks(frames, name, vfx.PRESETS["wisp"], loop=True, seed=3, pad=False)
        key = np.concatenate([f for f in out[:8]], axis=1).tobytes()
        assert key not in seen.values(), f"{name} renders like {[k for k, v in seen.items() if v == key]}"
        assert _diff(np.stack(out[:8]), np.stack(frames)) > 0.05, f"{name} did nothing"
        seen[name] = key


def test_looks_stack_in_order_and_the_json_palette_is_the_one_used():
    frames = _wisp()
    a, ia = apply_looks(frames, "phosphorus:strength=0.8+echo:count=2", vfx.PRESETS["wisp"], loop=True)
    b, ib = apply_looks(frames, "echo:count=2+phosphorus:strength=0.8", vfx.PRESETS["wisp"], loop=True)
    assert ia["spec"] == "phosphorus+echo:count=2" and ib["spec"] == "echo:count=2+phosphorus"
    assert _diff(np.stack(a), np.stack(b)) > 0.01, "order matters"
    assert set(ia["palette"]) == set(ib["palette"]) and set(fxlook.PHOSPHOR) <= set(ia["palette"])
    assert _colours(a) <= {hex_to_rgb(c) for c in ia["palette"]}


def test_smooth_closes_the_loop_and_doubles_the_frames():
    # a one-shot that does not meet itself: a bar sliding right
    frames = []
    for i in range(8):
        f = np.zeros((16, 32, 4), np.uint8)
        f[6:10, 2 + i * 3:6 + i * 3] = (200, 220, 240, 255)
        frames.append(f)
    seam_before = _diff(frames[-1], frames[0])
    out, info = apply_looks(frames, "smooth:interpolate=1,crossfade=0.4", (["#000000", "#c8dcf0"]), loop=False)
    assert len(out) == 10 and info["fps_scale"] == 2.0 and info["loop"] is True, "3 overlap frames dropped, then doubled"
    assert _diff(out[-1], out[0]) < seam_before * 0.5, "the seam is cross-faded: the last frame runs into the first"
    steps = [_diff(out[j], out[(j + 1) % len(out)]) for j in range(len(out))]
    assert max(steps) < seam_before * 0.8, "no step round the loop is as big as the old seam"
    pp, info = apply_looks(frames, "smooth:interpolate=0,pingpong=1", (["#000000", "#c8dcf0"]), loop=False)
    assert len(pp) == 14 and np.array_equal(pp[1], pp[-1]) and info["fps_scale"] == 1.0
    # a true loop interpolated: the in-between frames sit between their neighbours
    w = _wisp()
    sm, _ = apply_looks(w, "smooth", vfx.PRESETS["wisp"], loop=True)
    assert _diff(sm[1], sm[0]) < _diff(w[1], w[0]) + 1e-6


def test_echo_draws_the_asked_number_of_ghosts():
    frames = []
    for i in range(8):
        f = np.zeros((12, 64, 4), np.uint8)
        f[4:8, 2 + i * 7:6 + i * 7] = (230, 230, 230, 255)
        frames.append(f)
    for count in (1, 3):
        out, _ = apply_looks(frames, f"echo:count={count},dx=0,decay=0.8,dim=0", ["#000000", "#e6e6e6"], loop=False)
        _lab, n = ndimage.label(out[5][..., 3] > 0)
        assert n == count + 1, f"{count} ghosts and the live frame"
    out, _ = apply_looks(frames, "echo:count=2,dx=0,decay=0.5,dim=0", ["#000000", "#e6e6e6"], loop=False)
    alphas = sorted({int(a) for a in np.unique(out[5][..., 3]) if a})
    assert len(alphas) == 3 and abs(alphas[0] - 64) <= 1 and abs(alphas[1] - 128) <= 1 and alphas[2] == 255, "each ghost is fainter by the decay"


def test_loops_close_for_the_time_based_looks():
    """Time signals are periodic over the frame count (frame N is frame 0): with an even rate the signal also repeats
    at half the loop, so the look on the half-rotated frames matches the look on the originals, half a loop on."""
    frames = _wisp(8)
    for name in ("pulse:rate=2", "shimmer:speed=2", "psychedelic:cycles=2", "embers:speed=2", "rot:speed=2,drips=0"):
        a, _ = apply_looks(frames, name, vfx.PRESETS["wisp"], loop=True, seed=3)
        b, _ = apply_looks(frames[4:] + frames[:4], name, vfx.PRESETS["wisp"], loop=True, seed=3)
        assert _diff(a[4], b[0]) < 1.0, name
    # trails wrap round the loop: frame 0 of a loop carries the afterglow of the last frames; a one-shot's frame 0 has none
    for name in ("phosphorus", "echo:dx=0", "psychedelic"):
        looped, _ = apply_looks(frames, name, vfx.PRESETS["wisp"], loop=True, seed=3)
        once, _ = apply_looks(frames, name, vfx.PRESETS["wisp"], loop=False, seed=3)
        assert (looped[0][..., 3] > 0).sum() > (once[0][..., 3] > 0).sum(), name
        assert np.array_equal(looped[7], once[7]), "away from the start the two agree"


def test_dissolve_eats_away_and_is_a_one_shot():
    frames = _wisp(8)
    out, info = apply_looks(frames, "dissolve:start=0.2", vfx.PRESETS["wisp"], loop=True)
    cover = [(f[..., 3] > 0).sum() for f in out]
    assert info["loop"] is False and cover[-1] < cover[0] * 0.3 and cover[2] <= cover[0]


def test_parse_looks_and_spec_strings():
    chain = parse_looks("phosphorus:strength=0.8,decay=0.5,echo:count=3")
    assert [c["name"] for c in chain] == ["phosphorus", "echo"]
    assert chain[0]["strength"] == 0.8 and chain[0]["decay"] == 0.5 and chain[0]["flicker"] == 0.15
    assert chain[1]["count"] == 3 and isinstance(chain[1]["count"], int)
    assert parse_looks("glow + echo:count=2; pulse") == parse_looks(["glow", {"name": "echo", "count": 2}, "pulse"])
    assert parse_looks("outline:colour=#ff00aa,side=top")[0]["side"] == "top"
    assert parse_looks("echo:count=99")[0]["count"] == 6, "clamped to the range"
    assert spec_string(parse_looks("glow:radius=8+echo")) == "glow:radius=8+echo"
    assert parse_looks("") == [] and parse_looks(None) == []
    with pytest.raises(ValueError, match="unknown look"):
        parse_looks("sparkle")
    with pytest.raises(ValueError, match="no parameter"):
        parse_looks("glow:size=3")
    with pytest.raises(ValueError, match="must be one of"):
        parse_looks("smooth:ease=bounce")
    rows = fxlook.looks_table()
    assert {r["name"] for r in rows} == set(LOOKS) and all(r["doc"] and r["params"] for r in rows)


def test_describe_maps_words_to_looks():
    from pixelforge.describe import draft, looks_from_words

    assert looks_from_words("a phosphorus wisp with afterimages, trippy and hazy") == ["phosphorus", "echo", "psychedelic", "haze"]
    assert looks_from_words("neon, ethereal, a smooth loop") == ["cyberpunk", "ethereal", "smooth"]
    assert looks_from_words("icy and rotting, flickering, with an echo") == ["ice", "rot", "flicker", "echo"]
    assert looks_from_words("a plain wisp") == []
    d = draft("a ghostly wisp spell, pale blue, with echoes")
    assert d["what"] == "spell" and d["spell"]["look"] == "ethereal+echo" and any(r.startswith("look:") for r in d["read"])
    d = draft("a wisp lantern spell, pale blue, slow, with embers")
    assert "look" not in d["spell"], "effect words stay effects"


def test_vfx_spell_painted_and_animate_take_looks(tmp_path):
    from importlib import import_module

    from pixelforge.effect_art import make_effect

    A = import_module("pixelforge.animate")

    r = vfx.make_vfx("wisp", "wisp_phos", tmp_path, frames=6, looks="phosphorus")
    meta = json.loads((tmp_path / "wisp_phos.json").read_text())
    assert meta["look"] == "phosphorus" and set(fxlook.PHOSPHOR) <= set(meta["palette"]) and r["look"] == "phosphorus"
    strip = np.array(Image.open(r["png"]).convert("RGBA"))
    assert _colours([strip]) <= {hex_to_rgb(c) for c in meta["palette"]}
    # a rotation sheet carries the look on every row, and smooth doubles frames and fps in the json
    r = vfx.make_vfx("bone_spear", "spear_echo", tmp_path, frames=4, rotations=4, looks="echo:count=2+smooth")
    meta = json.loads((tmp_path / "spear_echo.json").read_text())
    assert meta["frames"] == 8 and meta["fps"] == 20.0 and meta["rotations"] == 4
    assert Image.open(r["png"]).size == (meta["frame_width"] * 8, meta["frame_height"] * 4)
    # relook on that sheet: rows kept, palette extended
    r2 = fxlook.relook(tmp_path / "spear_echo.json", "ice", "spear_ice", tmp_path, gif=True)
    m2 = json.loads((tmp_path / "spear_ice.json").read_text())
    assert r2["rotations"] == 4 and m2["frames"] == 8 and set(fxlook.FROST) <= set(m2["palette"]) and (tmp_path / "spear_ice.gif").exists()
    # spell layers with looks and a top-level look
    sp = spell.new_spell("ward_eth", "ward")
    sp["frames"] = 6
    sp["layers"][0]["look"] = "haze"
    sp["look"] = "ethereal"
    frames = spell.render_spell(sp)
    plain = spell.render_spell(sp, with_look=False)
    W, H = sp["size"]
    pl, pt, pr, pb = fxlook.chain_reach("ethereal", W, H)
    assert len(frames) == 6 and frames[0].shape == (H + pt + pb, W + pl + pr, 4) and plain[0].shape == (H, W, 4)
    assert _diff(np.stack([f[pt:pt + H, pl:pl + W] for f in frames]), np.stack(plain)) > 0.01
    r = spell.export_spell(sp, tmp_path)
    meta = json.loads((tmp_path / "ward_eth.json").read_text())
    assert meta["look"] == "ethereal" and meta["layer_looks"][0] == "haze" and set(fxlook.BONE_TEAL) <= set(meta["palette"])
    assert meta["size"] == [W + pl + pr, H + pt + pb] and meta["pad"] == [pl, pt, pr, pb] and meta["anchor"] == [sp["anchor"][0] + pl, sp["anchor"][1] + pt]
    assert Image.open(r["png"]).size == (meta["frame_width"] * 6, meta["frame_height"])
    assert spell.load_spell(tmp_path / "ward_eth.spell.json")["look"] == "ethereal"
    # a painted effect
    im = Image.new("RGB", (120, 60), (0, 0, 0))
    px = np.array(im)
    px[20:40, 10:110] = (214, 206, 186)
    Image.fromarray(px).save(tmp_path / "bar.png")
    r = make_effect(tmp_path / "bar.png", "bar", tmp_path, kind="missile", frames=4, width=48, looks="cyberpunk", gif=False)
    meta = json.loads((tmp_path / "bar.json").read_text())
    assert meta["look"] == "cyberpunk" and set(fxlook.NEON) <= set(meta["palette"])
    # animate: a LookEffect in a preset, and looks= on the call; colours stay within the sprite's palette for pulse/echo
    sprite = np.zeros((20, 16, 4), np.uint8)
    sprite[4:16, 4:12] = (90, 140, 130, 255)
    sprite[6:8, 6:10] = (230, 250, 245, 255)
    before = _colours([sprite])
    for preset in ("pulse", "haunt", "heat"):
        out = A.animate(sprite, [type(e)(**e.__dict__) for e in A.PRESETS[preset]], 6)
        assert len(out) == 6 and _colours(out) <= before, preset
    out = A.animate(sprite, [A.Bob(1)], 6, looks="ethereal")
    assert len(out) == 6 and len(_colours(out) - before) > 0, "a look that adds light extends the sprite's palette"
    assert isinstance(A.parse_effect("look:echo:count=2"), A.LookEffect) and A.parse_effect("look:echo:count=2").spec == "echo:count=2"


def test_cli_parses_look_flags(tmp_path):
    from pixelforge.cli import main

    main(["vfx", "wisp", "w", "-o", str(tmp_path), "--frames", "4", "--look", "glow:radius=4", "--look", "echo:count=1", "--json"])
    meta = json.loads((tmp_path / "w.json").read_text())
    assert meta["look"] == "glow:radius=4+echo:count=1"
    main(["relook", str(tmp_path / "w.json"), "--look", "pulse", "--name", "w2", "--json"])
    assert json.loads((tmp_path / "w2.json").read_text())["look"] == "pulse"
    main(["spell", "new", "fb", "-o", str(tmp_path), "--preset", "fireball", "--look", "smoke", "--frames", "4", "--json"])
    assert json.loads((tmp_path / "fb.json").read_text())["look"] == "smoke" and json.loads((tmp_path / "fb.json").read_text())["frames"] == 4
    main(["looks", "--json"])
    r = fxlook.demo(tmp_path / "demo", looks=["echo"], frames=4)
    assert (tmp_path / "demo" / "look_echo.gif").exists() and (tmp_path / "demo" / "looks_contact.png").exists()


def _edge(frames):
    a = np.stack(frames)[..., 3]
    return int(max(a[:, 0].max(), a[:, -1].max(), a[:, :, 0].max(), a[:, :, -1].max()))


def test_soft_looks_do_not_stop_at_the_frame_edge():
    """haze, glow and smoke on the game-size wisp (24x36, what `pixelforge vfx wisp` renders): the frame grows by the
    look's reach and the outermost row and column stay empty; with pad=False the fields fade out on the frame edge instead
    of a dithered box or a bloom cut square. The plain wisp's own halo touches the edge at alpha 14, the reference."""
    frames = spell.render_kind("wisp", 24, 36, 8, "wisp", 3)
    plain_edge = _edge(frames)
    assert plain_edge < 16
    for name in ("haze", "glow", "smoke", "haze:strength=1,radius=8", "glow:intensity=1.5,radius=12", "smoke:strength=1,rise=2", "haze+glow"):
        out, info = apply_looks(frames, name, vfx.PRESETS["wisp"], loop=True, seed=3)
        assert any(info["pad"]) and out[0].shape[0] > 36 and out[0].shape[1] > 24, name
        assert _edge(out) < 16, f"{name}: alpha {_edge(out)} on the padded frame's edge"
        tight, info2 = apply_looks(frames, name, vfx.PRESETS["wisp"], loop=True, seed=3, pad=False)
        assert tight[0].shape == frames[0].shape and info2["pad"] == [0, 0, 0, 0]
        assert _edge(tight) < 16, f"{name}: alpha {_edge(tight)} on the tight frame's edge"
        l, t, r, b = info["pad"]
        margin = np.stack(out)[..., 3] > 0
        margin[:, t:t + 36, l:l + 24] = False
        assert margin.sum() >= len(out), f"{name} still paints round the wisp, in the margin the pad gave it"


def test_reach_and_anchor_follow_the_look(tmp_path):
    """chain_reach adds up in order and make_vfx, relook and make_effect grow the frame by the pad and move the anchor with the effect."""
    from pixelforge.effect_art import make_effect

    assert fxlook.chain_reach("", 24, 36) == (0, 0, 0, 0) and fxlook.chain_reach("pulse+flicker", 24, 36) == (0, 0, 0, 0)
    assert fxlook.chain_reach("echo:count=2,dx=-5,dy=3", 24, 36) == (10, 0, 0, 6), "ghosts trail left and down"
    g, e = fxlook.chain_reach("glow:radius=4", 24, 36), fxlook.chain_reach("echo:count=2,dx=-5", 24, 36)
    assert fxlook.chain_reach("glow:radius=4+echo:count=2,dx=-5", 24, 36) == tuple(a + b for a, b in zip(g, e))
    assert all(len(r["reach"]) == 4 and r["pads"] == any(r["reach"]) for r in fxlook.looks_table())
    # a ground-anchored fire with smoke: the anchor stays on the fire's ground point, moved in by the margin
    r = vfx.make_vfx("fire", "f_smoke", tmp_path, frames=4, looks="smoke")
    meta = json.loads((tmp_path / "f_smoke.json").read_text())
    w0, h0 = vfx.DEFAULT_SIZE["fire"]
    l, t, rr, b = meta["pad"]
    assert meta["size"] == [w0 + l + rr, h0 + t + b] and [meta["frame_width"], meta["frame_height"]] == meta["size"]
    assert meta["anchor"] == [l + w0 // 2, t + h0 - 1] and t > b, "smoke rises: more room above than below"
    assert r["anchor"] == meta["anchor"] and r["pad"] == meta["pad"]
    assert Image.open(r["png"]).size == (meta["frame_width"] * 4, meta["frame_height"])
    # relook on that sheet moves the anchor again
    r2 = fxlook.relook(tmp_path / "f_smoke.json", "outline:width=2", "f_smoke_rim", tmp_path)
    m2 = json.loads((tmp_path / "f_smoke_rim.json").read_text())
    assert m2["pad"] == [2, 2, 2, 2] and m2["anchor"] == [meta["anchor"][0] + 2, meta["anchor"][1] + 2]
    assert m2["size"] == [meta["size"][0] + 4, meta["size"][1] + 4] and Image.open(r2["png"]).size == (m2["frame_width"] * 4, m2["frame_height"])
    # a painted effect with an anchor the person typed: it points at the same pixel of the painting
    px = np.zeros((40, 60, 3), np.uint8)
    px[10:30, 10:50] = (214, 206, 186)
    Image.fromarray(px).save(tmp_path / "bar.png")
    make_effect(tmp_path / "bar.png", "bar_glow", tmp_path, kind="loop", frames=4, looks="glow:radius=4", gif=False, anchor="30,39")
    m3 = json.loads((tmp_path / "bar_glow.json").read_text())
    assert m3["pad"][0] > 0 and m3["anchor"] == [30 + m3["pad"][0], 39 + m3["pad"][1]]


def test_spell_layer_look_keeps_the_layer_where_it_was_put():
    """A layer's look with an uneven margin (afterimages trailing left) must not shift the layer on the spell's canvas."""
    sp = spell.new_spell("t", "fireball")
    sp["frames"] = 4
    sp["layers"] = [{**sp["layers"][0], "kind": "wisp", "palette": "wisp", "x": 10, "y": -6, "look": ""}]
    plain = spell.render_spell(sp)
    sp["layers"][0]["look"] = "echo:count=3,dx=-6,dim=0,decay=0.01"   # an 18 px margin on the left, ghosts all but invisible
    looked = spell.render_spell(sp)
    assert looked[0].shape == plain[0].shape

    def centre(f):
        ys, xs = np.nonzero(f[..., 3] > 128)
        return xs.mean(), ys.mean()

    for a, b in zip(plain, looked):
        (x0, y0), (x1, y1) = centre(a), centre(b)
        assert abs(x0 - x1) < 1.5 and abs(y0 - y1) < 1.5, "the wisp stayed put"


def test_demo_spear_glides_so_afterimages_show(tmp_path):
    fr = spell.render_kind("bone_spear", 96, 40, 8, "bone", 1)
    gl = fxlook._glide(fr, 14)
    assert gl[0].shape == (40, 124, 4) and all(g.shape == gl[0].shape for g in gl)

    def cx(f):
        return np.nonzero(f[..., 3] > 0)[1].mean()

    assert abs(cx(gl[2]) - cx(gl[0]) - 14) < 1.5 and abs(cx(gl[6]) - cx(gl[0]) + 14) < 1.5 and abs(cx(gl[4]) - cx(gl[0])) < 1.0, "a sine over the loop"
    out, _ = apply_looks(gl, "echo", vfx.PRESETS["bone"], loop=True)
    assert (out[2][..., 3] > 0).sum() > (gl[2][..., 3] > 0).sum() * 1.15, "ghosts trail the moving spear"
    r = fxlook.demo(tmp_path, looks=["echo", "haze"], frames=4)
    assert r["contact_zoom"] in (1, 2) and r["cell_pad"] > 0
    for n in ("plain", "echo", "haze"):
        assert (tmp_path / f"look_{n}.gif").exists()
    assert (tmp_path / "looks_contact.png").stat().st_size < 400_000


def test_game_preview_command_carries_scale_and_frames():
    from pixelforge.game_preview import preview_command

    cmd = preview_command("godot", Path("/g"), fx=["wisp_phosphorus"], shot="/tmp/x.png", fx_scale=3, shot_n=12, shot_dt=0.1)
    assert "--fx_scale=3" in cmd and "--shot_n=12" in cmd and "--shot_dt=0.1" in cmd and "--fx=wisp_phosphorus" in cmd
    cmd = preview_command("godot", Path("/g"), fx=["a"], shot="/tmp/x.png")
    assert not any(x.startswith(("--fx_scale", "--shot_n", "--shot_dt")) for x in cmd)


def test_fx_editor_attachment_names_carry_the_look(tmp_path):
    from pixelforge.fx_editor import attachment_fx_name, effect_frames

    att = {"name": "wisp_1", "kind": "wisp", "palette": "wisp", "glow": True, "look": "phosphorus:strength=0.7", "views": {"down": [0, -20]}}
    att["fx"] = attachment_fx_name(att, "keeper")
    assert att["fx"] == "keeper_wisp_1_wisp_glow_phosphorus_strength_0_7"
    frames, anchor, fps = effect_frames(att, tmp_path)
    meta = json.loads((tmp_path / f"{att['fx']}.json").read_text())
    assert meta["look"] == "phosphorus:strength=0.7" and len(frames) == meta["frames"]
    assert attachment_fx_name({"name": "w", "kind": "wisp", "palette": "wisp", "glow": False}, "k") == "k_w_wisp"
