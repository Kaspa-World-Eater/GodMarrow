"""The pixel road: joint tracks, the per-view skeleton fit, part cutting, posing and the project steps."""

import json
import math

import numpy as np
import pytest
from PIL import Image, ImageDraw

from pixelforge import api, puppet, rig
from pixelforge.project import Project

H, W = 240, 140   # a synthetic figure's cutout size


def _figure(skirt: bool = False, facing: str = "none", seed: int = 0) -> Image.Image:
    """A painted-looking stick figure: hat, head, torso, A-pose arms, legs (or a skirt) and feet, on transparency."""
    rng = np.random.default_rng(seed)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = W // 2
    col = lambda: tuple(int(v) for v in rng.integers(60, 200, 3)) + (255,)
    d.ellipse([cx - 14, 8, cx + 14, 36], fill=col())                  # head
    d.polygon([(cx - 50, 14), (cx + 50, 14), (cx + 20, 2), (cx - 20, 2)], fill=col())   # hat
    d.rectangle([cx - 22, 34, cx + 22, 112], fill=col())             # torso
    for s in (-1, 1):                                                 # arms away from the body
        d.line([(cx + s * 22, 40), (cx + s * 48, 95), (cx + s * 55, 140)], fill=col(), width=12)
    if skirt:
        d.polygon([(cx - 24, 108), (cx + 24, 108), (cx + 40, 222), (cx - 40, 222)], fill=col())
        d.rectangle([cx - 30, 222, cx - 6, 239], fill=col())
        d.rectangle([cx + 6, 222, cx + 30, 239], fill=col())
    else:
        for s in (-1, 1):
            d.line([(cx + s * 12, 110), (cx + s * 14, 170), (cx + s * 16, 230)], fill=col(), width=14)
            d.rectangle([cx + s * 16 - 12, 226, cx + s * 16 + 12, 239], fill=col())
    if facing == "left":   # a side view: one arm down the middle and a foot pointing left
        im2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(im2)
        d2.ellipse([cx - 14, 8, cx + 14, 36], fill=col())
        d2.polygon([(cx - 50, 14), (cx + 50, 14), (cx + 20, 2), (cx - 20, 2)], fill=col())
        d2.rectangle([cx - 18, 34, cx + 18, 112], fill=col())
        d2.line([(cx, 40), (cx - 6, 95), (cx - 10, 140)], fill=col(), width=12)
        if skirt:
            d2.polygon([(cx - 20, 108), (cx + 20, 108), (cx + 30, 222), (cx - 30, 222)], fill=col())
        else:
            d2.line([(cx, 110), (cx, 170), (cx, 230)], fill=col(), width=16)
        d2.rectangle([cx - 36, 226, cx + 10, 239], fill=col())
        return im2
    return im


# ------------------------------------------------------------------------------------------------- joint library
def test_joint_library_is_normalised_and_has_the_game_clips():
    lib = puppet.load_joints()
    assert len(lib.joints) == 24 and "hips" in lib.index and "toe_tip_L" in lib.index
    rest = {n: lib.rest[i] for n, i in lib.index.items()}
    assert abs(rest["toe_L"][2]) < 0.03 and 0.85 < rest["head_top"][2] <= 1.0   # floor at 0, the head near 1
    assert 0.4 < rest["hips"][2] < 0.6
    for clip in api.DEFAULT_CLIPS.split(","):
        frames, fps, loop, idx = lib.sample(clip, 8)
        assert frames.shape[1:] == (24, 3) and 2 <= len(frames) <= 8 and fps > 0
        assert idx == sorted(set(idx))
    assert lib.clips[lib.resolve("walk")]["loop"] and not lib.clips[lib.resolve("death")]["loop"]


def test_sample_keeps_the_clip_duration():
    lib = puppet.load_joints()
    full, fps_full, _, _ = lib.sample("walk", 0)
    few, fps_few, _, _ = lib.sample("walk", 6)
    assert abs(len(full) / fps_full - len(few) / fps_few) < 0.15   # about the same seconds either way


# ------------------------------------------------------------------------------------------------------- the fit
def test_fit_front_finds_arms_feet_and_no_skirt():
    f = rig.fit_view(_figure(), "front")
    J = f["joints"]
    assert not f["skirt"] and f["hem"] is None
    assert J["shoulder_L"][0] > J["neck"][0] > J["shoulder_R"][0]   # the figure's left is on the screen's right
    assert J["hand_L"][1] > J["elbow_L"][1] > J["shoulder_L"][1]      # the arm goes down
    assert J["hand_L"][0] > J["shoulder_L"][0] + 15                   # and out: the A-pose was found on the silhouette
    assert J["ankle_L"][0] > J["hips"][0] > J["ankle_R"][0]
    assert abs(J["ankle_L"][0] - (W // 2 + 16)) < 8


def test_fit_front_finds_a_skirt_and_its_hem():
    f = rig.fit_view(_figure(skirt=True), "front")
    assert f["skirt"] and f["hem"] is not None
    assert 205 <= f["hem"] <= 224          # the hem sits where the skirt ends and the feet begin
    assert 0.05 < f["hem_z"] < 0.15


def test_fit_back_mirrors_sides_and_side_detects_facing():
    b = rig.fit_view(_figure(), "back")
    assert b["joints"]["shoulder_L"][0] < b["joints"]["shoulder_R"][0]   # seen from behind the left is on the left
    s = rig.fit_view(_figure(facing="left"), "side")
    assert s["facing"] == "left"
    assert s["joints"]["toe_tip_L"][0] < s["joints"]["ankle_L"][0]   # the toe points the way it faces
    assert s["joints"]["shoulder_L"] == s["joints"]["shoulder_R"]     # both sides on one line in a side view
    forced = rig.fit_view(_figure(facing="left"), "side", facing="right")
    assert forced["facing"] == "right"


# ---------------------------------------------------------------------------------------------------- the parts
def _union(parts):
    return [p for p in parts if not p.clone_of]


def test_cut_parts_cover_the_figure_and_overlap_at_seams():
    im = _figure()
    vp = puppet.build_view_puppet(im, "front")
    names = {p.name for p in vp.parts}
    assert {"head", "torso", "upper_arm_L", "lower_arm_L", "upper_arm_R", "lower_arm_R", "thigh_L", "shin_L", "foot_L"} <= names
    assert "skirt" not in names
    src = np.asarray(im)[..., 3] > 127
    cover = np.zeros_like(src)
    total = 0
    for p in vp.parts:
        x0, y0 = p.offset
        h, w = p.image.shape[:2]
        m = p.image[..., 3] > 0
        cover[y0:y0 + h, x0:x0 + w] |= m
        total += int(m.sum())
    assert (cover & src).sum() >= 0.99 * src.sum()      # every painted pixel is in some part
    assert total > 1.05 * src.sum()                       # and parts overlap at the joints
    head = vp.part("head")
    assert head.offset[1] <= 2 and head.image.shape[1] >= 90    # the hat went with the head
    for p in vp.parts:   # every pivot lies inside or at the edge of its layer's box
        x0, y0 = p.offset
        h, w = p.image.shape[:2]
        assert x0 - 20 <= p.pivot[0] <= x0 + w + 20 and y0 - 20 <= p.pivot[1] <= y0 + h + 20


def test_skirt_is_one_garment_and_feet_are_their_own_parts():
    vp = puppet.build_view_puppet(_figure(skirt=True), "front")
    names = {p.name for p in vp.parts}
    assert "skirt" in names and "foot_L" in names and "foot_R" in names
    skirt = vp.part("skirt")
    assert skirt.kind == "garment" and skirt.bone == ("hips", "hem")
    assert skirt.image.shape[0] > 90                      # it hangs from the hips to the hem
    assert "thigh_L" not in names or vp.part("thigh_L").image.shape[0] < 30   # nothing of a leg shows under it


def test_side_view_makes_far_side_clones_in_shadow():
    vp = puppet.build_view_puppet(_figure(skirt=True, facing="left"), "side")
    near = vp.part("lower_arm_L")
    far = vp.part("lower_arm_R")
    assert near is not None and far is not None and far.clone_of == "lower_arm_L" and far.kind == "clone"
    assert far.image.shape == near.image.shape
    a, b = near.image[..., 3] > 0, far.image[..., 3] > 0
    assert (a == b).all()
    assert far.image[b][:, :3].mean() < near.image[a][:, :3].mean()   # a little darker


def test_puppet_round_trip_and_sheet(tmp_path):
    vp = puppet.build_view_puppet(_figure(skirt=True), "front")
    j = puppet.save_view_puppet(vp, tmp_path / "front")
    back = puppet.load_view_puppet(j)
    assert [p.name for p in back.parts] == [p.name for p in vp.parts]
    assert back.skeleton["skirt"] and back.joint("hem")[1] == vp.joint("hem")[1]
    assert json.loads(j.read_text())["parts"][0]["pivot"] == list(vp.parts[0].pivot)
    sheet = puppet.parts_sheet(vp)
    assert sheet.width > 300 and sheet.height > 100


# --------------------------------------------------------------------------------------------------- the posing
def test_projection_conventions():
    pts = np.array([[0.0, 0.0, 1.0], [0.3, 0.0, 1.0], [0.0, 0.5, 1.0], [0.0, 0.0, 0.0]])
    sx, sup, depth = puppet.project(pts, 0.0, 30.0)
    assert sx[1] > sx[0]                           # the figure's left (+x) is on the screen's right facing the camera
    assert sup[2] > sup[0] and depth[2] > depth[0]   # a point behind the figure sits higher and farther
    assert sup[3] < sup[0] and depth[3] > depth[0]   # the floor under the head is lower and farther (the camera is above)
    assert abs(sup[0] - sup[3] - math.cos(math.radians(30))) < 1e-9
    sx_w, _, _ = puppet.project(pts, 90.0, 30.0)
    assert abs(sx_w[1]) < 1e-9 and sx_w[2] > 0    # from the left side, "behind" is screen-right: the figure faces left


def test_view_for_yaw_prefers_front_and_back_and_mirrors_the_side():
    pups = {"front": puppet.build_view_puppet(_figure(), "front"), "back": puppet.build_view_puppet(_figure(), "back"),
            "side": puppet.build_view_puppet(_figure(facing="left"), "side")}
    assert puppet.view_for_yaw(pups, 0) == ("front", False)
    assert puppet.view_for_yaw(pups, 45) == ("front", False)
    assert puppet.view_for_yaw(pups, 90) == ("side", False)
    assert puppet.view_for_yaw(pups, 135) == ("back", False)
    assert puppet.view_for_yaw(pups, 180) == ("back", False)
    assert puppet.view_for_yaw(pups, 270) == ("side", True)


def test_retarget_keeps_the_paintings_lengths_and_stands_on_the_floor():
    lib = puppet.load_joints()
    vp = puppet.build_view_puppet(_figure(), "front")
    props = puppet.proportions(vp)
    frames, _, _, _ = lib.sample("walk", 6)
    for f in frames:
        j = puppet.retarget(f, lib, props)
        assert abs(np.linalg.norm(j["neck"] - j["hips"]) - props["torso"]) < 1e-6
        assert abs(np.linalg.norm(j["knee_L"] - j["hip_L"]) - props["thigh"]) < 1e-6
        low = min(j[n][2] for n in puppet.FOOT_JOINTS)
        assert abs(low) < 1e-9     # the lowest foot is on the floor every frame


def test_secondary_motion_lags_and_loops():
    lib = puppet.load_joints()
    vp = puppet.build_view_puppet(_figure(skirt=True), "front")
    props = puppet.proportions(vp)
    frames, fps, loop, _ = lib.sample("walk", 12)
    rt = [puppet.retarget(f, lib, props) for f in frames]
    out = puppet.secondary_motion(rt, fps, loop, props["skirt"])
    assert all("hem" in f and "head_top_lag" in f for f in out)
    lags = [np.linalg.norm(f["hem"] - (f["hips"] + [0, 0, -props["skirt"]])) for f in out]
    assert max(lags) > 1e-4 and max(lags) <= 0.12   # it moves, and hangs
    assert abs(lags[0] - lags[-1]) < 0.05           # a loop meets itself


def test_animate_writes_real_frames_with_the_render_manifest(tmp_path):
    lib = puppet.load_joints()
    pups = {"front": puppet.build_view_puppet(_figure(skirt=True), "front"), "side": puppet.build_view_puppet(_figure(skirt=True, facing="left"), "side")}
    m = puppet.animate(pups, lib, ["walk", "hit"], tmp_path / "r", directions=["S", "W", "NE"], per_clip=4, figure_px=160)
    assert m["renders"] == (4 + 4) * 3 and m["size"] % 2 == 0 and m["ppu"] > 0
    assert set(m["actions"]) == {"walk", "hit"} and m["actions"]["walk"]["loop"] and m["actions"]["walk"]["fps"] > 0
    data = json.loads((tmp_path / "r" / "manifest.json").read_text())
    for key in ("size", "ppu", "elevation", "z_mid", "directions", "actions", "fps"):
        assert key in data
    frames = [np.asarray(Image.open(tmp_path / "r" / "walk" / "S" / f"frame_{i:03d}.png")) for i in range(4)]
    assert all(f.shape == (m["size"], m["size"], 4) for f in frames)
    # real animation: frames differ, and the feet stay on the ground (the lowest painted row barely moves)
    assert all((np.abs(frames[i].astype(int) - frames[0].astype(int))[..., 3] > 0).mean() > 0.002 for i in range(1, 4))
    bottoms = [np.nonzero(f[..., 3] > 0)[0].max() for f in frames]
    assert max(bottoms) - min(bottoms) <= 0.06 * m["size"]
    # the figure stands about figure_px tall seen from 30 degrees above
    ys = np.nonzero(frames[0][..., 3] > 0)[0]
    assert 0.7 * 160 < (ys.max() - ys.min()) < 1.1 * 160
    side = np.asarray(Image.open(tmp_path / "r" / "walk" / "W" / "frame_000.png"))
    assert (side[..., 3] > 0).sum() > 0.5 * (frames[0][..., 3] > 0).sum()


# ------------------------------------------------------------------------------------------- the project steps
@pytest.fixture
def project(tmp_path):
    api.new_project(tmp_path / "game", "Game", "16bit")
    p = Project.load(tmp_path / "game")
    api.add_character(p, "doll", "a doll")
    api.set_description(p, "doll", "a doll with a wide hat and a long skirt")
    sheet = Image.new("RGB", (3 * W + 4 * 30, H + 40), (255, 255, 255))
    for i, im in enumerate((_figure(skirt=True), _figure(skirt=True, facing="left"), _figure(skirt=True, seed=2))):
        sheet.paste(im, (30 + i * (W + 30), 20), im)
    sheet.save(tmp_path / "sheet.png")
    api.import_source(p, "doll", "sheet", tmp_path / "sheet.png")
    return Project.load(tmp_path / "game")


def test_pixel_path_runs_to_the_game_export_without_blender(project, monkeypatch):
    monkeypatch.setattr(api, "find_blender", lambda *_a, **_k: None)
    r = api.run_pixel_path(project, "doll", clips="walk,hit", directions="S,SW,W,NW,N,NE,E,SE", per_clip=3)
    assert r["ok"] and r["ran"] == ["split", "palette", "puppet", "animate", "pixelate", "export"]
    c = Project.load(project.root).characters["doll"]
    assert c.settings["road"] == "pixel" and c.done["puppet"] and c.done["animate"] and c.done["pixelate"] and c.done["export"]
    assert c.notes["model_mode"] == "puppet"
    assert (project.root / "characters/doll/puppet/front.json").exists() and (project.root / "characters/doll/puppet/front_parts.png").exists()
    assert len(r["clips"]) == 16 and all(n == 3 for n in r["clips"].values())
    frame = np.asarray(Image.open(project.root / "characters/doll/frames/walk_S/frame_000.png"))
    rows = np.nonzero(frame[..., 3] > 0)[0]
    assert 90 <= rows.max() - rows.min() + 1 <= 128 + 2   # the 16bit look's figure height (seen from above, plus the outline)
    g = api.export_game(project, "doll", kind="doll_pixel", out_dir=project.root / "out")
    meta = json.loads((project.root / "out/doll_pixel.json").read_text())
    assert set(meta["meta"]["anims"]) == {"walk", "hit"} and meta["meta"]["anims"]["walk"]["views"] == ["down", "front", "side", "back", "up", "front_l", "side_l", "back_l"]
    assert g["color"]["frames"] == 2 * 8 * 3
    s = api.status(project)["characters"]["doll"]
    assert s["next"] is None


def test_run_until_blocked_takes_the_pixel_road(project, monkeypatch):
    monkeypatch.setattr(api, "find_blender", lambda *_a, **_k: None)
    monkeypatch.setattr(api, "DEFAULT_CLIPS", "hit")
    project.directions = 4
    project.save()
    r = api.run_until_blocked(project, "doll", road="pixel")
    assert r["ok"] and r["blocked_at"] is None and "puppet" in r["ran"] and "model" not in r["ran"]
    assert api.road_of(project, "doll") == "pixel"
    assert sorted(api.animate_puppet(project, "doll", clips="hit", per_clip=2)["clips"]) == ["hit"]
    back = api.set_road(project, "doll", "3d")
    assert back["next"] == "model" and not Project.load(project.root).characters["doll"].done.get("render")


def test_cli_puppet_commands(project, monkeypatch, capsys):
    from pixelforge.cli import main

    monkeypatch.setattr(api, "find_blender", lambda *_a, **_k: None)
    api.split(project, "doll")
    api.make_palette(project, "doll")
    def last_json(text: str) -> dict:
        return json.loads(text[text.index("{"):])

    main(["puppet", "build", "doll", "--project", str(project.root), "--json"])
    out = last_json(capsys.readouterr().out)
    assert out["ok"] and out["views"]["front"]["skirt"] and out["views"]["side"]["facing"] == "left"
    main(["puppet", "animate", "doll", "--project", str(project.root), "--clips", "hit", "--directions", "S,E", "--per-clip", "2", "--json"])
    out = last_json(capsys.readouterr().out)
    assert out["ok"] and out["clips"] == {"hit": 2}
    main(["project", "set", "--project", str(project.root), "--json", "--character", "doll", "--road", "3d"])
    out = json.loads(capsys.readouterr().out)
    assert out["ok"] and out["road"] == "3d"
    main(["run", "doll", "--road", "pixel", "--project", str(project.root), "--json"])
    out = last_json(capsys.readouterr().out)
    assert out["ok"] and out["blocked_at"] is None
