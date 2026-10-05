"""The effects engine: every node family, every library effect (renders, in palette, deterministic, on time), the graph
format and its lever expressions, the compatibility shim under the old vfx / spell calls, the CLI verbs."""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import pytest

from pixelforge import effects as E
from pixelforge.effects import colour, compat, noise, output
from pixelforge.effects.graph import Context, evaluate, lever_value

HERE = Path(__file__).resolve().parent


def ctx(w=32, h=32, frames=4, seed=1):
    return Context(w, h, frames, 12.0, seed, {}, (w // 2, h - 2))


def run(nodes, out=None, **kw):
    g = {"size": [kw.get("w", 32), kw.get("h", 32)], "frames": kw.get("frames", 4), "seed": kw.get("seed", 1), "nodes": nodes}
    if out:
        g["out"] = out
    return evaluate(g)[0]


# ------------------------------------------------------------------ sources
@pytest.mark.parametrize("fn", [noise.perlin, noise.simplex, noise.ridged, noise.value])
def test_noise_tiles_in_space_and_time_and_stays_in_range(fn):
    f = fn(32, 24, 4, cells=4, tcells=1, seed=3)
    assert f.shape == (4, 24, 32) and f.dtype == np.float32
    assert f.min() >= 0.0 and f.max() <= 1.0 and f.std() > 0.02
    # the lattice wraps: the seam from the last column (frame) back to the first is no sharper than any neighbouring step
    seam_x = np.abs(f[:, :, 0] - f[:, :, -1]).max()
    step_x = np.abs(f[:, :, 1:] - f[:, :, :-1]).max()
    assert seam_x <= step_x * 1.05, "tiles left to right"
    g = fn(32, 24, 8, cells=4, tcells=2, seed=3)
    seam_t = np.abs(g[0] - g[-1]).max()
    step_t = np.abs(g[1:] - g[:-1]).max()
    assert seam_t <= step_t * 1.05, "loops in time"
    assert np.array_equal(fn(32, 24, 4, seed=3), fn(32, 24, 4, seed=3)), "the same seed, the same field"
    assert not np.array_equal(fn(32, 24, 4, seed=3), fn(32, 24, 4, seed=4))


def test_cellular_flow_and_blue():
    c = noise.cellular(32, 32, 4, cells=4, seed=1, mode="f1")
    walls = noise.cellular(32, 32, 4, cells=4, seed=1, mode="f2f1")
    ids = noise.cellular(32, 32, 2, cells=3, seed=1, mode="id", drift=0.0)
    assert c.shape == (4, 32, 32) and 0 <= c.min() and c.max() <= 1
    assert walls.mean() > 0.05 and len(np.unique(ids[0])) >= 4, "cell walls and flat ids per cell"
    v = noise.flow(32, 32, 4, cells=3, seed=2, strength=1.0)
    assert v.shape == (4, 32, 32, 2)
    # a curl field is divergence free: the periodic divergence sums to nothing
    div = (np.roll(v[..., 0], -1, 2) - np.roll(v[..., 0], 1, 2)) + (np.roll(v[..., 1], -1, 1) - np.roll(v[..., 1], 1, 1))
    assert abs(div.mean()) < 1e-3
    b = noise.blue(32, 32, 4, cells=6, seed=1)
    assert b.max() > 0.5 and (b[0] > 0.5).sum() >= 10, "dots spread over the cells"


def test_shapes_and_the_emitter_bundle():
    c = run([{"id": "c", "op": "circle", "x": 0.5, "y": 0.5, "radius": 0.25}])
    assert c[0, 16, 16] == 1.0 and c[0, 0, 0] == 0.0
    r = run([{"id": "r", "op": "ring", "radius": 0.4, "width": 0.06, "grow": 1.0}])
    assert r[0].sum() < r[-1].sum(), "a growing ring is bigger at the end of the loop"
    ln = run([{"id": "l", "op": "line", "x0": 0.1, "y0": 0.5, "x1": 0.9, "y1": 0.5, "width": 2}])
    assert ln[0, 16, 16] > 0.5 and ln[0, 2, 16] == 0
    p = run([{"id": "p", "op": "polygon", "sides": 4, "radius": 0.3, "star": 0.9}])
    assert 0 < p.mean() < 0.3
    g = run([{"id": "g", "op": "gradient", "direction": "up"}])
    assert g[0, -1, 0] > g[0, 0, 0]
    t = run([{"id": "t", "op": "text", "words": "IV", "size": 12}])
    assert t.max() > 0
    em = run([{"id": "e", "op": "emitter", "x": 0.5, "y": 0.9, "count": 12, "life": 4, "speed": 2.0, "size": 1.5, "gravity": 0.1, "trail": 1, "ground": 0.95, "bounce": 0.5,
              "sub": {"count": 2, "when": "land", "life": 2, "speed": 1.0, "size": 0.8}}], frames=6)
    assert set(em) == {"v", "age", "height", "dist", "speed"} and em["v"].max() > 0.9
    assert em["age"][em["v"] > 0].max() <= 1.0 and em["height"][em["v"] > 0].max() > 0.05
    fl = run([{"id": "f", "op": "flow", "cells": 2}, {"id": "e", "op": "emitter", "count": 8, "life": 4, "turbulence": 1.0, "flow": "@f"}], out="@e")
    assert fl["v"].max() > 0
    fb = run([{"id": "b", "op": "flame_body", "licks": 2.5}])
    assert fb[0, 28, 16] > fb[0, 4, 16], "a flame is brighter at its source than at its tip"
    bolt = run([{"id": "b", "op": "bolt", "segments": 10, "branches": 2}])
    assert bolt.max() == 1.0 and (bolt[0] > 0).sum() >= 20
    th = run([{"id": "t", "op": "threads", "count": 3}])
    assert th["v"].max() > 0.9
    eyes = run([{"id": "e", "op": "eyes", "count": 3, "size": 3}])
    mouths = run([{"id": "m", "op": "mouths", "count": 3}])
    assert eyes["v"].max() == 1.0 and mouths["v"].max() == 1.0


# ------------------------------------------------------------------ shaping
def test_shaping_nodes():
    base = [{"id": "c", "op": "circle", "radius": 0.3}]
    full = run(base)
    er = run(base + [{"id": "e", "op": "erode", "field": "@c", "radius": 1}], out="@e")
    di = run(base + [{"id": "d", "op": "dilate", "field": "@c", "radius": 1}], out="@d")
    assert er.sum() < full.sum() < di.sum()
    th = run(base + [{"id": "n", "op": "perlin"}, {"id": "t", "op": "threshold", "field": "@n", "level": 0.5}], out="@t")
    assert set(np.unique(th)) <= {0.0, 1.0}
    wp = run(base + [{"id": "f", "op": "flow", "strength": 2.0}, {"id": "w", "op": "warp", "field": "@c", "vectors": "@f", "amount": 2.0}], out="@w")
    assert wp.shape == full.shape and not np.array_equal(wp, full)
    dp = run(base + [{"id": "n", "op": "perlin"}, {"id": "w", "op": "displace_by", "field": "@c", "by": "@n", "dy": 3}], out="@w")
    assert dp.shape == full.shape
    lk = run([{"id": "b", "op": "flame_body"}, {"id": "l", "op": "licks", "field": "@b", "count": 3}], out="@l")
    assert lk.max() <= 1.0 and lk.sum() > 0
    mh = run(base + [{"id": "m", "op": "mask_height", "field": "@c", "lo": 0.0, "hi": 0.5}], out="@m")
    assert mh[0, 4].sum() == 0 and mh[0, 20].sum() > 0
    ma = run([{"id": "e", "op": "emitter", "count": 10, "life": 4}, {"id": "m", "op": "mask_age", "bundle": "@e", "lo": 0.0, "hi": 0.3}], out="@m")
    assert ma.shape == (4, 32, 32)
    ol = run(base + [{"id": "o", "op": "outline", "field": "@c", "width": 1}], out="@o")
    assert ol[0, 16, 16] == 0 and ol.max() == 1.0
    ig = run(base + [{"id": "g", "op": "inner_glow", "field": "@c", "radius": 4}], out="@g")
    assert ig[0, 16, 16] >= full[0, 16, 16]
    sh = run(base + [{"id": "s", "op": "shadow", "field": "@c", "dx": 2, "dy": 2}], out="@s")
    assert sh.max() == 1.0 and sh[0, 16, 16] == 0
    pb = run(base + [{"id": "p", "op": "pixel_blur", "field": "@c", "radius": 1, "levels": 4}], out="@p")
    assert len(np.unique(pb)) <= 4, "a pixel blur snaps to its levels"
    for op in ("blur", "posterize", "invert", "gain", "pulse", "time_shift", "hold_frames", "shift", "flip", "reverse", "after", "wipe"):
        r = run(base + [{"id": "x", "op": op, "field": "@c"}], out="@x")
        assert r.shape == full.shape, op
    for op in ("mul", "add", "sub", "max", "min"):
        r = run(base + [{"id": "x", "op": op, "a": "@c", "b": 0.5}], out="@x")
        assert r.shape == full.shape, op


# ------------------------------------------------------------------ colour
def test_paint_uses_only_ramp_colours_and_palette_lock_snaps():
    g = [{"id": "n", "op": "perlin", "cells": 3}, {"id": "r", "op": "ramp", "colours": "fire", "bands": 6}, {"id": "i", "op": "paint", "field": "@n", "ramp": "@r", "cut": 0.3, "dither": 0.3}]
    img, c, values = evaluate({"size": [32, 32], "frames": 4, "nodes": g})
    assert img.dtype == np.uint8 and img.shape == (4, 32, 32, 4)
    lut = {tuple(c) for c in values["r"].tolist()}
    px = {tuple(p) for p in img[img[..., 3] > 0][:, :3].tolist()}
    assert px <= lut and len(px) >= 3
    assert set(np.unique(img[..., 3])) <= {0, 255}, "a hard cut: no soft alpha"
    # the lock: random colours all land on the palette
    rnd = np.random.default_rng(1).integers(0, 255, (2, 8, 8, 4), dtype=np.uint8)
    rnd[..., 3] = 255
    locked = colour.palette_lock(ctx(), rnd, "wisp")
    pal = {tuple(colour.hex_to_rgb(h)) for h in colour.PALETTES["wisp"]}
    assert {tuple(p) for p in locked[..., :3].reshape(-1, 3).tolist()} <= pal
    cyc = colour.palette_cycle(ctx(), img, values["r"], steps=6)
    assert not np.array_equal(cyc[1], img[1]) and {tuple(p) for p in cyc[cyc[..., 3] > 0][:, :3].tolist()} <= lut
    tinted = colour.tint(ctx(), img, colour.make_lut(colour.PALETTES["frost"], 5))
    frost = {tuple(c) for c in colour.make_lut(colour.PALETTES["frost"], 5).tolist()}
    assert {tuple(p) for p in tinted[tinted[..., 3] > 0][:, :3].tolist()} <= frost
    dm = run([{"id": "f", "op": "flow"}, {"id": "d", "op": "displacement_map", "vectors": "@f"}], out="@d")
    assert dm.shape == (4, 32, 32, 4) and dm[..., 2].min() == 128


# ------------------------------------------------------------------ composition
def test_compose_nodes():
    base = [{"id": "c", "op": "circle", "radius": 0.3}, {"id": "r", "op": "ramp", "colours": "fire"}, {"id": "i", "op": "paint", "field": "@c", "ramp": "@r"},
            {"id": "c2", "op": "circle", "x": 0.7, "radius": 0.2}, {"id": "r2", "op": "ramp", "colours": "frost"}, {"id": "j", "op": "paint", "field": "@c2", "ramp": "@r2"}]
    for mode in ("normal", "add", "screen", "multiply", "subtract", "behind", "lighten", "darken", "mask", "erase"):
        out = run(base + [{"id": "L", "op": "layers", "images": ["@i", "@j"], "blends": ["normal", mode]}], out="@L")
        assert out.shape == (4, 32, 32, 4), mode
    ds = run(base + [{"id": "d", "op": "depth_stack", "images": ["@i", "@j"], "depths": [0.0, 1.0]}], out="@d")
    assert ds[0, 16, 22, 3] == 255
    ss = run(base + [{"id": "s", "op": "sprite_stack", "image": "@i", "count": 3, "ramp": "@r"}], out="@s")
    assert (ss[..., 3] > 0).sum() > (run(base, out="@i")[..., 3] > 0).sum()
    fr = run(base + [{"id": "f", "op": "fracture", "image": "@i", "pieces": 6}], out="@f", frames=6)
    assert (fr[0, ..., 3] > 0).sum() > (fr[5, ..., 3] > 0).sum() * 0.5
    ps = run(base + [{"id": "p", "op": "path_scatter", "image": "@i", "points": [[0.1, 0.5], [0.9, 0.5]], "count": 3}], out="@p")
    assert ps[..., 3].max() == 255
    mi = run(base + [{"id": "m", "op": "mirror", "image": "@j"}], out="@m")
    assert np.array_equal(mi[0, :, :16], mi[0, :, 16:][:, ::-1])
    pm = run(base + [{"id": "k", "op": "polar_mirror", "image": "@j", "segments": 6, "spin": 60}], out="@k")
    assert pm[..., 3].max() == 255
    tr = run(base + [{"id": "t", "op": "transform", "image": "@i", "dx": 4, "angle": 30, "scale": 0.5}], out="@t")
    assert tr.shape == (4, 32, 32, 4)
    ec = run(base + [{"id": "e", "op": "echo", "image": "@j", "copies": 2, "dx": -3, "ramp": "@r2"}], out="@e")
    assert (ec[..., 3] > 0).sum() > (run(base, out="@j")[..., 3] > 0).sum()
    ef = run([{"id": "e", "op": "effect", "name": "candle", "dx": 0, "dy": 0}, {"id": "f", "op": "effect", "name": "sparkle", "scale": 0.5, "start": 2, "palette": "frost"},
              {"id": "L", "op": "layers", "images": ["@e", "@f"]}], out="@L", w=48, h=48, frames=8)
    assert ef.shape == (8, 48, 48, 4) and ef[..., 3].max() == 255


def test_sims():
    sm = run([{"id": "s", "op": "smoke", "rise": 1.0}], frames=6)
    assert sm.max() > 0.3 and sm[:, 2].mean() < sm[:, 26].mean(), "smoke is thickest near its source"
    rp = run([{"id": "r", "op": "rope", "links": 8, "wind": 1.0}], frames=6)
    assert rp.max() == 1.0 and not np.array_equal(rp[0], rp[3]), "a rope swings"
    cl = run([{"id": "c", "op": "cloth", "cols": 5, "rows": 4}], frames=6)
    assert cl.max() > 0.5 and 0 < cl.mean() < 0.5


# ------------------------------------------------------------------ the graph format
def test_lever_expressions_are_arithmetic_only():
    assert lever_value("$size * 2 + 1", {"size": 1.5}) == 4.0
    assert lever_value("int(6 * $count)", {"count": 1.4}) == 8.0
    assert lever_value("clamp($x, 0, 1)", {"x": 3}) == 1.0
    with pytest.raises(ValueError):
        lever_value("__import__('os').system('x')", {})
    with pytest.raises(ValueError):
        lever_value("$a.__class__", {"a": 1})


def test_graph_errors_name_the_node():
    with pytest.raises(KeyError, match="before it is defined"):
        evaluate({"nodes": [{"id": "a", "op": "mul", "a": "@zz", "b": 1}]})
    with pytest.raises(KeyError, match="unknown node op"):
        evaluate({"nodes": [{"id": "a", "op": "nope"}]})
    with pytest.raises(TypeError, match="unknown parameter"):
        evaluate({"nodes": [{"id": "a", "op": "circle", "radiusx": 1}]})


def test_node_table_documents_every_op():
    rows = E.node_table()
    assert len(rows) >= 80 and all(r["doc"] and r["kind"] and isinstance(r["params"], dict) for r in rows)
    kinds = {r["kind"] for r in rows}
    assert {"source", "shape", "colour", "compose", "sim", "math"} <= kinds


def test_a_64x64_eight_frame_graph_is_well_under_a_second():
    g = E.get_effect("flame")["graph"]
    t0 = time.perf_counter()
    fr, _, _ = output.frames_of(g, size=(64, 64), frames=8)
    took = time.perf_counter() - t0
    assert len(fr) == 8 and fr[0].shape == (64, 64, 4)
    assert took < 1.0, f"{took:.2f}s"


# ------------------------------------------------------------------ the library
WEIRD = ["phosphorus", "haze", "echo", "marrow_light", "unlight", "miasma", "eye_ooze", "tally_marks", "bell_ring", "soul_drain"]
NAMED = ["flame", "torch", "candle", "ember", "spark_burst", "blood_spray", "blood_pool", "rain", "snow", "dust_motes", "arc", "saber", "sparkle", "flare",
         "portal", "poison_cloud", "holy_beam", "bone_shards", "soul_wisps", "soul_fire", "waterfall", "drips", "fog"] + WEIRD


def test_the_library_has_the_brief_with_two_or_three_levers_each():
    assert set(NAMED) <= set(E.EFFECTS)
    for name, e in E.EFFECTS.items():
        assert 2 <= len(e["levers"]) <= 3, name
        assert e["family"] in E.FAMILIES, name
        for k, lv in e["levers"].items():
            assert lv["min"] <= lv["default"] <= lv["max"], (name, k)
    assert "lightning" not in E.EFFECTS and all("lightning" not in e["doc"].lower() for e in E.EFFECTS.values())


@pytest.mark.parametrize("name", sorted(E.EFFECTS))
def test_every_library_effect_renders_in_palette_deterministic_and_on_time(name, tmp_path):
    e = E.get_effect(name)
    t0 = time.perf_counter()
    r = E.render_effect(name, tmp_path, gif=True)
    took = time.perf_counter() - t0
    assert r["ok"] and Path(r["png"]).exists() and Path(r["json"]).exists() and Path(r["gif"]).exists()
    meta = json.loads(Path(r["json"]).read_text())
    assert meta["frames"] == e["graph"]["frames"] and meta["fps"] == e["graph"]["fps"] and meta["loop"] == e["graph"]["loop"]
    assert meta["size"] == e["graph"]["size"] and meta["anchor"] == e["graph"]["anchor"]
    assert took < 2.5, f"{name} took {took:.2f}s"
    fr, c, values = output.frames_of(e["graph"])
    assert any((f[..., 3] > 0).any() for f in fr), "something is drawn"
    if not e.get("displacement"):
        ramps = set()
        for n in e["graph"]["nodes"]:
            if n["op"] == "ramp":
                ramps |= {tuple(x) for x in values[n["id"]].tolist()}
        px = {tuple(p) for f in fr for p in f[f[..., 3] > 0][:, :3].tolist()}
        assert px <= ramps, f"{name}: {len(px - ramps)} colours outside its ramps"
        assert all(set(np.unique(f[..., 3])) <= {0, 255} for f in fr), "hard alpha"
    fr2, _, _ = output.frames_of(e["graph"])
    assert all(np.array_equal(a, b) for a, b in zip(fr, fr2)), "deterministic per seed"
    fr3, _, _ = output.frames_of(e["graph"], seed=7)
    assert any(not np.array_equal(a, b) for a, b in zip(fr, fr3)) or name in ("tally_marks", "bell_ring", "haze", "echo", "flare"), "another seed, another picture"
    # the levers move it
    k = next(iter(e["levers"]))
    lv = e["levers"][k]
    fr4, _, _ = output.frames_of(e["graph"], {k: lv["max"] if lv["default"] != lv["max"] else lv["min"]})
    assert any(not np.array_equal(a, b) for a, b in zip(fr, fr4)), f"lever {k} does nothing"


def test_render_effect_rejects_unknown_levers_and_swaps_palettes(tmp_path):
    r = E.render_effect("flame", tmp_path, levers={"nope": 1})
    assert not r["ok"] and "nope" in r["error"]
    r = E.render_effect("flame", tmp_path, palette="frost", out_name="cold")
    frost = {tuple(colour.hex_to_rgb(h)) for h in colour.PALETTES["frost"]}
    assert r["ok"] and Path(r["png"]).name == "cold.png" and len(r["palette"]) >= 3
    t = E.library_table()
    assert t["ok"] and len(t["effects"]) == len(E.EFFECTS) and len(t["nodes"]) >= 80 and "fire" in t["palettes"]


# ------------------------------------------------------------------ the shim
@pytest.mark.parametrize("kind", sorted(compat.KIND_MAP))
def test_old_vfx_kinds_render_through_the_engine(kind, tmp_path):
    r = compat.make_vfx(kind, "x", tmp_path, frames=6, gif=False)
    assert r["ok"] and {"png", "json", "size", "frames", "fps", "loop"} <= set(r) and r["frames"] == 6
    meta = json.loads(Path(r["json"]).read_text())
    assert meta["kind"] == kind and meta["effect"] == compat.KIND_MAP[kind][0]


def test_old_vfx_signature_keeps_its_extras(tmp_path):
    r = compat.make_vfx("fire", "f", tmp_path, palette="frost", bands=4, glow=True, haze=False, atlas_dir=tmp_path / "atlas", rotations=0, style="snes", seed=3)
    assert r["ok"] and (tmp_path / "atlas" / "f.json").exists()
    meta = json.loads(Path(r["json"]).read_text())
    assert meta["bands"] == 4 and meta["glow"] is True and meta["style"] == "snes" and meta["seed"] == 3
    r = compat.make_vfx("bone_spear", "s", tmp_path, frames=4, rotations=8)
    assert r["ok"] and json.loads(Path(r["json"]).read_text())["rotations"] == 8
    with pytest.raises(KeyError):
        compat.resolve_kind("nothing_here")


def test_old_spell_presets_render_as_graphs(tmp_path):
    from pixelforge import spell
    for preset in sorted(spell.PRESETS):
        sp = compat.new_spell(preset, preset)
        g = compat.spell_graph(sp)
        assert g["nodes"][-1]["op"] == "layers" and len(g["nodes"]) == len([l for l in sp["layers"] if not l.get("hidden")]) + 1
        fr = compat.render_spell(sp)
        assert len(fr) == sp["frames"] and fr[0].shape == (sp["size"][1], sp["size"][0], 4) and any((f[..., 3] > 0).any() for f in fr), preset
    sp = compat.new_spell("fireball", "fireball")
    r = compat.export_spell(sp, tmp_path, gif=True, atlas_dir=tmp_path / "atlas")
    assert r["ok"] and Path(r["spell"]).exists() and Path(r["gif"]).exists() and (tmp_path / "atlas" / "fireball.json").exists()
    assert json.loads(Path(r["json"]).read_text())["layers"] == ["embers", "fire", "burst"]
    assert sorted(compat.PRESETS) == sorted(spell.PRESETS)


# ------------------------------------------------------------------ the CLI
def _cli(*args):
    p = subprocess.run([sys.executable, "-m", "pixelforge.cli", *args], capture_output=True, text=True, cwd=HERE.parent, env={**__import__("os").environ, "PIXELFORGE_NO_UPDATE": "1"})
    assert p.returncode == 0, p.stderr
    return p.stdout


def test_cli_effects_verbs(tmp_path):
    t = json.loads(_cli("effects", "list", "--json"))
    assert t["ok"] and len(t["effects"]) == len(E.EFFECTS) and t["families"] == list(E.FAMILIES)
    t = json.loads(_cli("effects", "list", "--json", "--family", "fire"))
    assert {e["family"] for e in t["effects"]} == {"fire"}
    assert "flame" in _cli("effects", "list")
    r = json.loads(_cli("effects", "render", "candle", "--out", str(tmp_path), "--lever", "size=1.5", "--json"))
    assert r["ok"] and r["levers"]["size"] == 1.5 and Path(r["png"]).exists() and r["nodes"][0]["op"] == "flame_body"
    r = json.loads(_cli("effects", "preview", "fire", "--out", str(tmp_path), "--json"))
    assert r["ok"] and Path(r["gif"]).exists() and r["effect"] == "flame"
    g = {"size": [24, 24], "frames": 4, "levers": {"r": 0.3}, "nodes": [{"id": "c", "op": "circle", "radius": "$r"}, {"id": "p", "op": "ramp", "colours": "wisp"},
                                                                       {"id": "i", "op": "paint", "field": "@c", "ramp": "@p"}]}
    (tmp_path / "mine.graph.json").write_text(json.dumps(g))
    r = json.loads(_cli("effects", "graph", str(tmp_path / "mine.graph.json"), "--out", str(tmp_path), "--lever", "r=0.4", "--gif", "--json"))
    assert r["ok"] and r["levers"]["r"] == 0.4 and Path(r["png"]).name == "mine.png" and Path(r["gif"]).exists()
    n = json.loads(_cli("effects", "nodes", "--json"))
    assert len(n["nodes"]) >= 80
