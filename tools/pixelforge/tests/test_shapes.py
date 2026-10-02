"""Shape sprites: the renderer's parity with the necromancer page, the file format, the rig and the export."""
import json
import math
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from pixelforge import api, describe, joints, shape_rig as R, shape_tools as T, shapes as S

ASSETS = S.ASSETS
REFS = Path(__file__).resolve().parents[3] / "docs" / "refs"
GREY = np.array([94, 93, 98])


@pytest.fixture(scope="module")
def tracks():
    return joints.load_joints()


@pytest.fixture(scope="module")
def necro():
    return S.load_shapes(ASSETS / "necromancer.shapes.json")


@pytest.fixture(scope="module")
def necro3d():
    return S.load_shapes(ASSETS / "necromancer_3d.shapes.json")


@pytest.fixture(scope="module")
def keeper():
    return S.load_shapes(ASSETS / "characters" / "keeper.shapes.json")


def _on_grey(rgba):
    a = rgba[..., 3:4] / 255.0
    return (rgba[..., :3] * a + GREY * (1 - a)).astype(int)


# ------------------------------------------------------------------------------------------------ parity
@pytest.mark.skipif(not (REFS / "necromancer_shape_sprite.png").exists(), reason="the reference PNG is in the game repo")
def test_flat_renderer_matches_the_page_png(necro):
    """The flat path re-renders the page's necromancer: 99% of the figure's pixels identical (the rest are the page's
    random motes)."""
    doc = dict(necro)
    doc["effects"] = [e for e in necro["effects"] if e["kind"] != "motes"]
    page = np.asarray(Image.open(REFS / "necromancer_shape_sprite.png").convert("RGB")).astype(int)
    H, W = doc["size"][1], doc["size"][0]
    ref = page[28 + 2 + np.arange(H) * 5][:, 18 + 2 + np.arange(W) * 5]      # the PNG is the 96x108 canvas at 5x with margins
    mine = _on_grey(S.render_flat(doc, 55).rgba)
    diff = np.abs(mine - ref).max(-1) > 6
    fig = (np.abs(ref - GREY).max(-1) > 3) | (np.abs(mine - GREY).max(-1) > 3)
    assert fig.sum() > 3000
    assert 1 - diff.sum() / fig.sum() > 0.99


def test_flat_render_is_deterministic_and_scales(necro):
    a = S.render_flat(necro, 40).rgba
    b = S.render_flat(necro, 40).rgba
    assert np.array_equal(a, b)
    big = S.render_flat(necro, 40, scale=2.0).rgba
    assert big.shape == (216, 192, 4)
    assert abs((big[..., 3] > 0).sum() / 4 - (a[..., 3] > 0).sum()) < 0.05 * (a[..., 3] > 0).sum()


def test_colours_come_from_the_ramps(necro):
    """Every painted pixel (before lights) is one of the file's ramp colours."""
    doc = dict(necro)
    doc["lights"] = []
    doc["effects"] = []
    doc["shadow"] = None
    M = S.build_materials(doc)
    allowed = {tuple(int(v) for v in c) for m in M.values() for c in m.ramp} | {tuple(S.hexrgb(doc["outline"]).astype(int)), (5, 3, 7)}
    rgba = S.render_flat(doc, 12).rgba
    px = {tuple(p) for p in rgba[rgba[..., 3] > 0][:, :3].astype(int)}
    assert px <= allowed


def test_ramps_resample_to_the_preset_bands(necro):
    M = S.build_materials(necro, steps=8)
    assert all(m.steps == 8 for m in M.values() if not m.emissive)
    assert M["soul"].steps == 5
    fr = S.render_flat(necro, 40, steps=8)
    assert (fr.rgba[..., 3] > 0).sum() > 3000


# ------------------------------------------------------------------------------------------------ the format
def test_validate_reports_problems():
    assert S.validate({"size": [32, 32], "shapes": [{"kind": "poly", "points": [[1, 1], [2, 2]], "material": "robe"}]})
    assert S.validate({"size": [32, 32], "shapes": [{"kind": "ellipse", "centre": [1, 1], "radii": [2, 2], "material": "nothing"}]})
    assert S.validate({"size": [32, 32], "shapes": [{"kind": "ellipsoid", "centre": [1, 1, 1], "radii": [2, 2, 2]}]}) == ["a solid file needs 'ground' (the y of the ground line in its units)"]
    assert S.validate({"size": [32, 32], "shapes": []})
    good = {"size": [32, 32], "ground": 30, "shapes": [{"kind": "capsule", "a": [16, 4, 0], "b": [16, 28, 0], "r": 3, "material": "iron7"}]}
    assert S.validate(good) == []
    assert S.mode_of(good) == "solid"
    # the sub-shapes of a union are checked too
    union = {"size": [32, 32], "ground": 30, "shapes": [{"kind": "union", "name": "hood", "material": "cloth", "of": [
        {"kind": "ellipsoid", "centre": [16, 10, 0], "radii": [5, 6, 5]}, {"kind": "capsule", "a": [16, 4, 0], "r": 3}, {"kind": "box", "centre": [1, 1, 1], "half": [1, 1, 1], "material": "nothing"}]}]}
    problems = S.validate(union)
    assert len(problems) == 2 and all("hood" in p and "of[" in p for p in problems)
    assert S.validate({"size": [32, 32], "ground": 30, "shapes": [{"kind": "union", "of": []}]})
    # hang is a fraction
    assert S.validate({**good, "parts": {"skirt": {"bone": "hips", "hang": 3}}})
    assert S.validate({**good, "shapes": [{**good["shapes"][0], "hang": -1}]})
    assert S.validate({**good, "parts": {"skirt": {"bone": "hips", "hang": 0.25}}}) == []


def test_shipped_files_validate(necro, necro3d, keeper):
    for doc in (necro, necro3d, keeper):
        assert S.validate(doc) == []
    for name in ("chest", "skull", "dead_tree"):
        assert S.validate(S.load_shapes(ASSETS / "objects" / f"{name}.shapes.json")) == []
    r = T.validate_file(ASSETS / "characters" / "keeper.shapes.json")
    assert r["ok"] and r["mode"] == "solid" and r["shapes"] >= 40 and "head" in r["bones"] and r["unbound_shapes"] == []


def test_material_library_aliases_and_textures():
    M = S.build_materials({"materials": {"mine": {"ramp": "iron", "spec_t": 0.5}}})
    assert M["mine"].spec and M["mine"].spec_t == 0.5 and M["mine"].steps == M["iron"].steps
    assert all(m.texture in S.TEXTURES for m in M.values())
    with pytest.raises(ValueError):
        S.build_materials({"materials": {"bad": {"ramp": "#fff"}}})


# ------------------------------------------------------------------------------------------------ the solid path
def test_solid_model_voxelises_and_renders_every_direction(necro3d):
    model = S.Model(necro3d, 1.0)
    assert model.stats["shapes"] == 61 and 20000 < model.stats["voxels"] < 60000
    filled = []
    for d, deg in R.DIRECTIONS.items():
        fr = model.render(0, math.radians(deg), 0.0, None, outline=S.hexrgb(necro3d["outline"]), lights=necro3d["lights"], effects=necro3d["effects"], shadow=necro3d["shadow"])
        assert fr.rgba.shape == (136, 120, 4)
        filled.append(fr.stats["filled"])
    assert min(filled) > 0.6 * max(filled)          # every view is a full figure, none collapses
    front = model.render(0, 0.0, 0.0, None).rgba
    back = model.render(0, math.pi, 0.0, None).rgba
    assert np.any(front != back)                     # the back really is another view


def test_solid_normals_depth_passes_and_contours(necro3d):
    model = S.Model(necro3d, 1.0)
    fr = model.render(3, 0.4, 0.0, None, outline=S.hexrgb("#0a080c"), passes=True)
    assert fr.normal.shape == (136, 120, 4) and fr.depth.shape == (136, 120, 4)
    body = fr.rgba[..., 3] > 0
    assert (fr.normal[..., 3] > 0).sum() <= body.sum()
    # the outline is a 1 px ring of near-black round the body
    out = np.all(fr.rgba[..., :3] == S.hexrgb("#0a080c").astype(np.uint8), axis=-1) & body
    assert 300 < out.sum() < 1500


def test_rules_place_materials_and_emissives():
    doc = {"size": [40, 40], "ground": 38, "shapes": [
        {"kind": "ellipsoid", "centre": [20, 20, 0], "radii": [8, 8, 8], "material": "iron7",
         "rules": [{"y": [None, 15], "material": "gold6"}, {"z": [6, None], "near": [[[20, 22, None]], 1.0], "material": "soul", "emit": "pulse"}]}]}
    model = S.Model(doc, 1.0)
    sh = model.shell
    gold = model.mat_names.index("gold6"); soul = model.mat_names.index("soul")
    assert (sh.mat[sh.pos[:, 1] < 15] == gold).all()
    assert (sh.emit[sh.mat == soul] == S.EMIT_CODES["pulse"]).all() and (sh.mat == soul).sum() > 0
    fr = model.render(0, 0.0, 0.0, None)
    top = fr.rgba[fr.rgba[..., 3] > 0][:, :3]
    assert len({tuple(p) for p in top}) > 4


def test_rotation_and_lag_motion():
    doc = {"size": [40, 60], "ground": 58, "shapes": [{"kind": "box", "centre": [20, 30, 0], "half": [2, 12, 2], "material": "wood5", "rotate": {"z": 90, "about": [20, 30, 0]}}]}
    model = S.Model(doc, 1.0)
    fr = model.render(0, 0.0, 0.0, None).rgba
    ys, xs = np.nonzero(fr[..., 3])
    assert xs.max() - xs.min() > ys.max() - ys.min()        # the tall box lies on its side
    R0 = np.eye(3); t0 = np.zeros(3)
    m = S.Motion(R0, t0, R0, t0 + np.array([10.0, 0, 0]), np.zeros(3), 18.0, 42.0)
    P = np.array([[20.0, 18.0, 0], [20.0, 42.0, 0]]); N = np.array([[0, 0, 1.0], [0, 0, 1.0]])
    Q, _ = m.apply(P, N)
    assert abs(Q[0, 0] - 20) < 1e-6 and abs(Q[1, 0] - 30) < 1e-6     # the top stays, the hem follows the late transform


# ------------------------------------------------------------------------------------------------ the rig
def test_joint_tracks_cover_the_game_clips(tracks):
    for clip in R.GAME_CLIPS:
        assert tracks.has(clip)
        assert 8 <= tracks.frames(clip) <= 72
    assert tracks.loop("walk") and not tracks.loop("attack")
    assert 1.6 < tracks.height() < 1.9
    p, r = tracks.pose("walk", 0)
    assert p.shape == (22, 3) and r.shape == (22, 3, 3)
    p2, _ = tracks.pose_at("walk", 0.5)
    assert np.all(np.abs(p2 - (tracks.pose("walk", 0)[0] + tracks.pose("walk", 1)[0]) / 2) < 1e-6)


def test_author_pose_stands_on_the_ground_with_arms_down(tracks):
    tpl = R.template(120)
    b = tpl["bones"]
    assert abs(b["toe.L"]["head"][1] - tpl["ground"]) < 2
    assert b["head"]["tail"][1] < b["head"]["head"][1] < b["neck"]["head"][1] < b["hips"]["head"][1] < b["thigh.L"]["tail"][1]
    assert b["hand.L"]["head"][1] > b["upper_arm.L"]["head"][1] + 25        # the arm hangs down
    assert b["hand.L"]["head"][0] > b["upper_arm.L"]["head"][0] > tpl["axis"][0] > b["upper_arm.R"]["head"][0]


def test_binding_a_known_pose_gives_the_expected_pivot_and_rotation(tracks):
    """A bone in the author pose maps to itself; a pose that lifts the arm 90 degrees turns its shapes the same."""
    tpl = R.template(120)
    sk = R.Skeleton(tracks, 120, tpl["ground"], tpl["axis"][0])
    j = sk.index["forearm.L"]
    Rd, td = sk.delta(j, sk.pos, sk.rot)
    assert np.allclose(Rd, np.eye(3), atol=1e-9) and np.allclose(td, 0, atol=1e-9)
    pos = sk.pos.copy(); rot = sk.rot.copy()
    Rz = R.rot_z(-90.0)
    pos[j] = pos[j]; rot[j] = Rz @ rot[j]
    Rd, td = sk.delta(j, pos, rot)
    assert np.allclose(Rd, Rz, atol=1e-9)
    head = sk.pos[j]
    assert np.allclose(Rd @ head + td, head, atol=1e-9)                     # the pivot stays put
    tail = sk.tail(j)
    moved = Rd @ tail + td
    assert np.allclose(moved, head + Rz @ (tail - head), atol=1e-9)         # the tail swings about it


def _no_shadow(doc):
    d = dict(doc); d["shadow"] = None
    return d


def test_idle_frames_do_not_shimmer(keeper, tracks):
    """At the clip's own frame rate, few of the figure's own pixels change from one idle frame to the next, and almost
    none change and change straight back (the sparkle of a re-rolled voxel pick or a sliding dither)."""
    doc = _no_shadow(keeper)
    model = S.Model(doc, 1.0)
    for d in ("S", "E"):
        idle = R.render_clip(doc, "idle", d, tracks=tracks, model=model)
        arr = np.stack(idle["frames"]).astype(int)
        assert len(arr) == tracks.frames("idle")
        opaque = (arr[:-1, ..., 3] > 0) | (arr[1:, ..., 3] > 0)
        change = np.any(arr[:-1] != arr[1:], axis=-1) & opaque
        sparkle = np.any(arr[:-2] != arr[1:-1], axis=-1) & np.all(arr[:-2] == arr[2:], axis=-1) & opaque[:-1]
        assert change.sum() / opaque.sum() < 0.12, d
        assert sparkle.sum() / opaque[:-1].sum() < 0.03, d


def test_walk_feet_stay_on_the_ground_and_the_shadow_never_moves(keeper, tracks):
    doc = _no_shadow(keeper)
    model = S.Model(doc, 76 / 120)
    for d in ("E", "W"):
        walk = R.render_clip(doc, "walk", d, tracks=tracks, model=model, scale=76 / 120, max_frames=16)
        lowest = [int(np.nonzero(f[..., 3] > 0)[0].max()) for f in walk["frames"]]
        assert max(lowest) - min(lowest) <= 1, (d, lowest)                 # the planted foot holds the ground line
        assert walk["fps"] == pytest.approx(24 * 16 / tracks.frames("walk"))
    with_shadow = R.render_clip(keeper, "walk", "E", tracks=tracks, model=S.Model(keeper, 76 / 120), scale=76 / 120, max_frames=8)
    shadow_rows = {int(np.nonzero(f[..., 3] > 0)[0].max()) for f in with_shadow["frames"]}
    assert len(shadow_rows) == 1                                           # the contact shadow is the lowest thing and it stays put
    assert next(iter(shadow_rows)) >= max(lowest)


def test_every_frame_is_one_piece(keeper, tracks):
    """Idle, walk, run, attack and death in all eight directions: the figure never breaks into separate pieces (a foot
    stepping out from under a skirt, a hat lifting off a fast head)."""
    from scipy import ndimage

    doc = _no_shadow(keeper)
    clips = ("idle", "walk", "run", "attack", "death")
    model = S.Model(doc, 1.0, width=R.canvas_width(doc, clips, tracks))
    for clip in clips:
        for d in R.DIRECTIONS:
            res = R.render_clip(doc, clip, d, tracks=tracks, model=model, max_frames=8)
            for i, fr in enumerate(res["frames"]):
                labels, n = ndimage.label(fr[..., 3] > 0)
                sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
                assert int((np.asarray(sizes) >= 12).sum()) == 1, (clip, d, i)
                assert not fr[:, 0, 3].any() and not fr[:, -1, 3].any(), (clip, d, i)    # and stays inside the canvas


def test_hang_and_lag_keep_parts_on_the_body(keeper, tracks):
    """damp_tilt keeps a bone's turn and drops its tilt; a lagged hem is never dragged further than a tenth of its height."""
    tilt = R.rot_x(40.0)
    assert np.allclose(R.damp_tilt(tilt, 0.0), np.eye(3), atol=1e-9)
    assert np.allclose(R.damp_tilt(tilt, 1.0), tilt)
    turned = R.rodrigues(np.array([0.0, 1.0, 0.0]), math.radians(90)) @ tilt
    assert np.allclose(R.damp_tilt(turned, 0.0) @ np.array([0.0, 1.0, 0.0]), [0.0, 1.0, 0.0], atol=1e-9)
    assert np.allclose(R.damp_tilt(turned, 0.0)[:, 0], [0.0, 0.0, -1.0], atol=1e-9) or np.allclose(R.damp_tilt(turned, 0.0)[:, 0], [0.0, 0.0, 1.0], atol=1e-9)
    model = S.Model(keeper, 1.0)
    skel = R.skeleton_for(keeper, tracks)
    poser = R.Poser(model, skel, "attack")
    lagged = 0
    for t in range(0, tracks.frames("attack"), 2):
        for pi, mo in poser.transforms(float(t)).items():
            if mo.drag is not None:
                lagged += 1
                assert np.linalg.norm(mo.drag) <= 0.1 * (mo.y1 - mo.y0) + 1e-6
    assert lagged > 10
    hat = next(p for p in model.prims if p.name == "hat")
    drag = poser.transforms(8.0)[hat.index].drag
    assert np.linalg.norm(drag) <= 0.1 * (hat.bbox[1][1] - hat.bbox[0][1]) + 1e-6 and np.linalg.norm(drag) < 4.0   # the hat stays on a fast head


def test_eight_directions_are_different_views(keeper, tracks):
    model = S.Model(keeper, 0.5)
    frames = {d: R.render_clip(keeper, "idle", d, tracks=tracks, model=model, scale=0.5, max_frames=1)["frames"][0] for d in ("S", "E", "N", "W")}
    assert np.any(frames["S"] != frames["N"]) and np.any(frames["E"] != frames["W"])
    # E and W are mirror-like silhouettes of each other
    e = frames["E"][..., 3] > 0; w = frames["W"][..., 3] > 0
    assert (e & w[:, ::-1]).sum() > 0.7 * e.sum()


def test_flat_rig_moves_parts(necro, tracks):
    res = R.render_clip(necro, "walk", "S", tracks=tracks, max_frames=6)
    assert len(res["frames"]) == 6
    a, b = res["frames"][0], res["frames"][3]
    assert np.any(a != b)
    back = R.render_clip(necro, "idle", "N", tracks=tracks, max_frames=1)["frames"][0]
    assert back.shape == a.shape
    # a loose part follows its parent's bone late
    skel = R.skeleton_for(necro, tracks)
    doc = dict(necro); doc["parts"] = {"robe": {"bone": "spine.001"}, "hem": {"parent": "robe", "lag": 3}, "now": {"parent": "robe", "lag": 0}}
    tf = R.flat_transforms(doc, skel, "walk", 6.0, "S")
    assert tf["now"][1:3] == tf["robe"][1:3] and tf["hem"][1:3] != tf["robe"][1:3]


def test_death_gets_a_wider_canvas(keeper, tracks):
    assert R.canvas_width(keeper, ["idle", "walk"], tracks) == keeper["size"][0]
    wide = R.canvas_width(keeper, ["death"], tracks)
    assert wide > keeper["size"][0] + 40
    model = S.Model(keeper, 0.5, width=wide)
    assert model.W == round(wide * 0.5) and model.H == round(keeper["size"][1] * 0.5)
    fr = R.render_clip(_no_shadow(keeper), "death", "E", tracks=tracks, model=model, scale=0.5, max_frames=4, square=True)["frames"][-1]
    assert fr.shape[0] == fr.shape[1] == model.W and (fr[..., 3] > 0).sum() > 500


def test_objects_export_with_foot_anchors(tmp_path):
    chest = S.load_shapes(ASSETS / "objects" / "chest.shapes.json")
    oj = tmp_path / "art" / "objects" / "objects.json"
    oj.parent.mkdir(parents=True)
    oj.write_text(json.dumps({"statue0": {"png": "res://art/objects/statue0.png", "ox": 48, "oy": 50, "hr": 2}}))
    r = T.export_object(chest, tmp_path / "art" / "objects" / "chest", directions=("S", "SE", "E"), game_objects=oj)
    assert r["ok"] and set(r["views"]) == {"S", "SE", "E"}
    data = json.loads(oj.read_text())
    assert set(data) == {"statue0", "chest", "chest_SE", "chest_E"}
    e = data["chest"]
    assert e["png"] == "res://art/objects/chest/chest_S.png" and e["hr"] == 2
    im = Image.open(tmp_path / "art" / "objects" / "chest" / "chest_S.png")
    w, h = im.size
    assert 0 < e["ox"] < w and h - 12 <= e["oy"] <= h + 2                   # the foot point is on the bottom edge, under the middle
    assert (tmp_path / "art" / "objects" / "chest" / "chest.png").exists() and (tmp_path / "art" / "objects" / "chest" / "chest.json").exists()
    arr = np.asarray(im)
    assert arr[..., 3].any(axis=1).all() and arr[..., 3].any(axis=0).all()   # trimmed
    r2 = T.still(S.load_shapes(ASSETS / "objects" / "skull.shapes.json"), tmp_path / "skull.png", direction="SE", game_objects=oj, name="skull_se")
    assert r2["ok"] and json.loads(oj.read_text())["skull_se"]["oy"] == int(round(r2["anchor"][1]))


# ------------------------------------------------------------------------------------------------ files, pipeline, export
def test_render_set_writes_the_frames_layout_and_export_game_reads_it(keeper, tmp_path):
    out = tmp_path / "frames"
    r = T.render_set(keeper, out, clips=["idle", "walk"], directions=["S", "E"], style="rendered_arpg", max_frames=4)
    assert r["ok"] and r["size"] >= 76 and sorted(r["frames"]) == ["idle_E", "idle_S", "walk_E", "walk_S"]
    assert (out / "idle_S" / "frame_003.png").exists() and (out / "animations.json").exists() and (out / "manifest.json").exists()
    im = Image.open(out / "walk_E" / "frame_000.png")
    assert im.size[0] == im.size[1] == r["size"]
    from pixelforge.godmarrow_export import export_godmarrow
    manifest = json.loads((out / "manifest.json").read_text())
    g = export_godmarrow(out, manifest, tmp_path / "game", "keeper_shapes", max_frames=16)
    data = json.loads(Path(g["color"]["json"]).read_text())
    assert set(data["meta"]["anims"]) == {"idle", "walk"} and (data["meta"]["anims"]["walk"]["views"] == ["side", "down"] or data["meta"]["anims"]["walk"]["views"] == ["down", "side"])
    assert manifest["elevation"] == 0.0 and manifest["view_elevation"] == 12 and "camera 12 deg" in data["meta"]["scale"]
    k, x, y, w, h, dx, dy = data["idx"]["idle/down/0"]
    assert abs(dy + h) <= 8 and -r["size"] // 2 < dx < 0                  # the frame's bottom sits on the ground anchor, the figure astride it
    assert data["meta"]["fps"]["walk"] == pytest.approx(r["fps"]["walk"], abs=0.1)


def test_project_pipeline_with_a_shape_sprite(tmp_path):
    api.new_project(tmp_path / "proj", "p", style="rendered_arpg")
    from pixelforge.project import Project
    project = Project.load(tmp_path / "proj")
    api.add_character(project, "keeper", "the keeper")
    r = api.import_shapes(project, "keeper", ASSETS / "characters" / "keeper.shapes.json")
    assert r["ok"] and r["shapes"] >= 40
    api.add_character(project, "other", "no shapes")
    with pytest.raises(api.StepError):
        api.render_shapes(project, "other")
    r = api.render_shapes(project, "keeper", clips="idle", directions="S,E")
    assert r["ok"] and r["style"] == "rendered_arpg" and r["frames"]["idle_S"] <= 16
    g = api.export_game(project, "keeper", kind="keeper_shapes", out_dir=tmp_path / "game")
    assert g["ok"] and (tmp_path / "game" / "keeper_shapes.png").exists()
    p = api.preview_shapes(project, "keeper", clip="idle", direction="S")
    assert Path(p["gif"]).exists()


def test_tools_still_turntable_sheet_template(necro3d, keeper, tmp_path):
    r = T.still(necro3d, tmp_path / "necro.png", direction="SE", passes=True)
    assert Path(r["png"]).exists() and Path(r["normal"]).exists()
    r = T.turntable(necro3d, tmp_path / "turn.gif", frames=6, scale=0.5, zoom=1)
    assert Path(r["gif"]).exists() and Path(r["views"]).exists()
    r = T.contact_sheet([("row", [np.zeros((10, 10, 4), np.uint8)] * 3)], tmp_path / "sheet.png", zoom=1)
    assert r["columns"] == 3
    tpl = T.template_file(96, tmp_path / "tpl.json", tmp_path / "tpl.png")
    assert tpl["height"] == 96 and Path(tpl["png"]).exists() and "hips" in json.loads((tmp_path / "tpl.json").read_text())["bones"]
    assert S.file_summary(keeper)["mode"] == "solid"


def test_describe_drafts_a_valid_shape_sprite(tmp_path):
    r = describe.draft_shapes("a knight in steel plate armour with a sword and shield and a crimson cape", out=tmp_path / "k.shapes.json")
    assert r["what"] == "shapes" and S.validate(r["doc"]) == [] and Path(r["file"]).exists()
    names = {s["name"] for s in r["doc"]["shapes"]}
    assert {"sword", "shield", "cape", "pauldron.L"} <= names
    assert describe.draft("draw a hooded necromancer with green glowing eyes as shapes")["what"] == "shapes"
    r2 = describe.draft_shapes("a shrine keeper with a wide straw hat and charm gourds at the belt and tattered skirts")
    assert {"hat", "gourd_big", "skirt"} <= {s["name"] for s in r2["doc"]["shapes"]}
    fr = S.render_still(r2["doc"], 0)
    assert (fr.rgba[..., 3] > 0).sum() > 2000


def test_cli_shapes_commands(tmp_path, capsys):
    from pixelforge.cli import main
    main(["shapes", "validate", str(ASSETS / "necromancer.shapes.json")])
    assert "ok" in capsys.readouterr().out
    main(["shapes", "still", str(ASSETS / "necromancer.shapes.json"), "-o", str(tmp_path / "n.png"), "--frame", "40"])
    assert (tmp_path / "n.png").exists()
    main(["shapes", "object", str(ASSETS / "objects" / "skull.shapes.json"), "-o", str(tmp_path / "objs"), "--directions", "S,E", "--game-objects", str(tmp_path / "objs" / "objects.json")])
    assert (tmp_path / "objs" / "skull_E.png").exists() and "skull_E" in json.loads((tmp_path / "objs" / "objects.json").read_text())
    main(["shapes", "preview", str(ASSETS / "characters" / "keeper.shapes.json"), "--clip", "idle", "--direction", "E", "--frames", "3", "--style", "rendered_arpg", "-o", str(tmp_path / "k.gif")])
    assert (tmp_path / "k.gif").exists()
    capsys.readouterr()
    main(["shapes", "render", str(ASSETS / "characters" / "keeper.shapes.json"), "-o", str(tmp_path / "fr"), "--clips", "idle", "--directions", "S", "--frames", "2", "--style", "rendered_arpg", "--json"])
    assert json.loads(capsys.readouterr().out)["ok"]
    main(["shapes", "template", "--height", "100", "--json"])
    assert json.loads(capsys.readouterr().out)["height"] == 100
    main(["shapes", "draft", "a knight with a sword", "-o", str(tmp_path / "d.shapes.json")])
    assert (tmp_path / "d.shapes.json").exists()
    with pytest.raises(SystemExit):
        main(["shapes", "validate", str(tmp_path / "d.shapes.json").replace("d.shapes", "missing")])
