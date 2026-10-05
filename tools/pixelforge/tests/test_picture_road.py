"""The picture road (track/picture-road): `pixelforge character from-picture` takes a Midjourney picture (one figure or a
turnaround sheet, or the views as separate files) to a character in the project in one go: cutouts, measurements, a
drafted and coloured shape model, the still and the compare picture with the silhouette overlap, warnings in plain
words. Plus the steps again (measure, sample, compare) and the failure messages."""
import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image, ImageDraw

from pixelforge import picture_road as PR, shapes as S
from pixelforge.old_roads import FLAG, old_roads_on

# the picture road is a retired road (docs/FORGE_FROM_THE_GAME.md section 2): these tests cover only it, so they run
# when the environment reopens it
pytestmark = pytest.mark.skipif(not old_roads_on(), reason=f"the picture road is retired; set {FLAG}=1 to test it")
from pixelforge.api import StepError
from pixelforge.cli import main
from pixelforge.project import Project

HERE = Path(__file__).resolve().parent
KEEPER_FRONT = HERE.parent / "assets" / "styles" / "keeper_front.png"
MJ_NAME = "derek_a_hooded_warrior_in_a_long_robe_with_a_cape_3f2a9c1e-7b1d-4c2e-9a0f-5d6e7f8a9b0c.png"


def _figure(skirted: bool = False, depth_view: bool = False, staff: bool = False) -> Image.Image:
    """A plain figure on white, 400 x 800 (the character-road tests' synthetic figure), with a staff beside it when asked."""
    im = Image.new("RGB", (400 if not staff else 520, 800), (255, 255, 255))
    d = ImageDraw.Draw(im)
    skin, cloth, legs = (200, 150, 120), (40, 60, 160), (40, 120, 50)
    if depth_view:
        d.ellipse([170, 10, 230, 110], fill=skin); d.rectangle([170, 110, 230, 400], fill=cloth); d.rectangle([180, 400, 220, 799], fill=legs)
        return im
    d.ellipse([150, 10, 250, 110], fill=skin)
    d.rectangle([130, 110, 270, 400], fill=cloth)
    d.rectangle([95, 130, 125, 380], fill=skin); d.rectangle([275, 130, 305, 380], fill=skin)
    if skirted:
        d.polygon([(130, 400), (270, 400), (320, 780), (80, 780)], fill=cloth)
    else:
        d.rectangle([150, 400, 190, 799], fill=legs); d.rectangle([210, 400, 250, 799], fill=legs)
    if staff:
        d.rectangle([440, 300, 470, 700], fill=(120, 80, 40))          # a held thing standing apart from the body, half its height
    return im


def _sheet(path: Path) -> Path:
    front, side = _figure(skirted=True), _figure(depth_view=True)
    sheet = Image.new("RGB", (1300, 820), (255, 255, 255))
    sheet.paste(front, (20, 10)); sheet.paste(side, (480, 10)); sheet.paste(front, (880, 10))
    sheet.save(path)
    return path


@pytest.fixture(scope="module")
def keeper_road(tmp_path_factory):
    """The Keeper's front down the road once, shared by the tests that read the result."""
    root = tmp_path_factory.mktemp("keeper_road")
    said = []
    r = PR.from_picture(KEEPER_FRONT, root / "proj", "keeper", progress=lambda step, done, total: said.append((step, done, total)))
    return r, root / "proj", said


# ------------------------------------------------------------------------------------------- names from the file
def test_the_file_name_gives_the_words_and_the_name():
    assert PR.words_of(MJ_NAME) == "a hooded warrior in a long robe with a cape"
    assert PR.name_of(MJ_NAME) == "hooded_warrior_long_robe_cape"
    assert PR.name_of(MJ_NAME, "The Warden") == "the_warden"
    assert PR.words_of("keeper_front.png") == "keeper front" and PR.name_of("keeper_front.png") == "keeper_front"
    assert PR.words_of("IMG_0423 (1).webp") == "img" and PR.words_of("u6821 - Copy.png") == "u6821"


# ------------------------------------------------------------------------------------------- one figure: the Keeper's front
def test_the_keepers_front_becomes_a_character_with_a_still_and_a_compare_picture(keeper_road):
    r, proj, said = keeper_road
    assert r["ok"] and r["character"] == "keeper" and r["kind"] == "single" and r["views"] == ["front"]
    assert Path(r["model"]).exists() and Path(r["model"]).name == "keeper.shapes.json"
    assert Path(r["still"]).exists() and Path(r["compare"]).exists() and Path(r["measure"]).exists()
    assert Path(r["cutouts"]["front"]).exists() and np.asarray(Image.open(r["cutouts"]["front"]))[..., 3].min() == 0
    assert r["shapes"] >= 12 and set(r["materials"])                      # drafted, and some materials took the painting's colours
    assert r["overlap"]["front"] >= 0.65 and r["judgement"].startswith("Silhouette overlap front 0.") and "mass" in r["judgement"]
    assert any("front view only" in w for w in r["warnings"]) and any("long robe" in w for w in r["warnings"])
    assert r["seconds"] < 120
    # the still is a figure at the game's height facing S, with the foot anchor and the lights the bench reads
    still = np.asarray(Image.open(r["still"]).convert("RGBA"))
    ys = np.nonzero(still[..., 3] > 0)[0]
    assert 160 <= ys.max() - ys.min() + 1 <= 230 and len(r["anchor"]) == 2 and isinstance(r["lights"], list)
    # the project knows the character: its sources, its description from the picture's words, its shape file
    p = Project.load(proj)
    c = p.character("keeper")
    assert c.sources["shapes"].endswith("keeper.shapes.json") and c.sources["front"].endswith("front.png") and c.sources["picture"].endswith("picture.png")
    assert c.description.startswith("keeper front") and c.notes["picture_kind"] == "single" and c.done["model"]
    doc = S.load_shapes(r["model"])
    assert doc["name"] == "keeper" and "measured" in doc and not S.validate(doc) and "keeper_front.png" in doc["about"]
    # the progress words, in order
    steps = [s for s, _, _ in said]
    assert steps[:4] == ["reading the picture", "cutting the figure", "measuring", "drafting"] and steps[4].startswith("drafting ") and steps[4].endswith(" shapes")
    assert steps[5:] == ["sampling materials", "checking", "importing", "drawing", "done"] and said[-1][1] == said[-1][2] == 8


def test_the_road_is_deterministic(keeper_road, tmp_path):
    r, _, _ = keeper_road
    again = PR.from_picture(KEEPER_FRONT, tmp_path / "p2", "keeper")
    a, b = S.load_shapes(r["model"]), S.load_shapes(again["model"])
    assert a["materials"] == b["materials"] and a["shapes"] == b["shapes"] and again["overlap"] == r["overlap"]
    assert np.array_equal(np.asarray(Image.open(r["still"])), np.asarray(Image.open(again["still"])))


def test_the_steps_again(keeper_road):
    r, proj, _ = keeper_road
    before = Path(r["compare"]).stat().st_mtime_ns
    m = PR.redo(proj, "keeper", "measure")
    assert m["ok"] and m["step"] == "measure" and Path(m["compare"]).exists() and m["overlap"]["front"] == pytest.approx(r["overlap"]["front"], abs=0.05)
    s = PR.redo(proj, "keeper", "sample")
    assert s["ok"] and set(S.load_shapes(r["model"])["materials"]) >= set(r["materials"])
    c = PR.redo(proj, "keeper", "compare")
    assert c["ok"] and Path(c["compare"]).stat().st_mtime_ns >= before and "overlap" in c["judgement"]
    with pytest.raises(StepError, match="No character nobody"):
        PR.redo(proj, "nobody", "compare")
    with pytest.raises(StepError, match="measure, sample or compare"):
        PR.redo(proj, "keeper", "paint")


# ------------------------------------------------------------------------------------------- a sheet, and the views as files
def test_a_turnaround_sheet_is_split_into_views_and_named_from_the_file(tmp_path):
    sheet = _sheet(tmp_path / MJ_NAME)
    r = PR.from_picture(sheet, tmp_path / "proj")
    assert r["ok"] and r["kind"] == "sheet" and r["views"] == ["front", "side", "back"] and r["character"] == "hooded_warrior_long_robe_cape"
    assert set(r["overlap"]) == {"front", "side", "back"} and all(0.0 < v <= 1.0 for v in r["overlap"].values())
    assert any("turnaround sheet" in w and "3 figures" in w for w in r["warnings"])
    assert "robe" in r["sentence"] and any(s["name"] == "skirt" for s in S.load_shapes(r["model"])["shapes"])
    m = json.loads(Path(r["measure"]).read_text())
    assert set(m["views"]) == {"front", "side", "back"} and m["landmarks"]["chest"]["d"]            # the side view gave the depth
    assert Path(r["cutouts"]["side"]).exists() and Project.load(tmp_path / "proj").character(r["character"]).sources["picture"].endswith("sheet.png")
    assert r["seconds"] < 120


def test_several_files_are_the_views_in_order(tmp_path):
    _figure().save(tmp_path / "f.png"); _figure(depth_view=True).save(tmp_path / "s.png"); _figure().save(tmp_path / "b.png")
    r = PR.from_picture([tmp_path / "f.png", tmp_path / "s.png", tmp_path / "b.png"], tmp_path / "proj", "trio")
    assert r["ok"] and r["kind"] == "files" and r["views"] == ["front", "side", "back"] and set(r["overlap"]) == {"front", "side", "back"}


def test_a_held_thing_beside_the_body_is_still_one_figure(tmp_path):
    _figure(staff=True).save(tmp_path / "staff.png")
    views, kind, notes = PR.cut_views([tmp_path / "staff.png"])
    assert kind == "single" and list(views) == ["front"] and any("separate pieces" in n for n in notes)
    views, kind, _ = PR.cut_views([_sheet(tmp_path / "sheet.png")])
    assert kind == "sheet" and list(views) == ["front", "side", "back"]


def test_an_existing_character_is_drafted_again_and_said_so(tmp_path):
    _figure().save(tmp_path / "f.png")
    PR.from_picture(tmp_path / "f.png", tmp_path / "proj", "twice")
    r = PR.from_picture(tmp_path / "f.png", tmp_path / "proj", "twice")
    assert r["ok"] and any("existed" in w for w in r["warnings"])


# ------------------------------------------------------------------------------------------- failures, in words
def test_failures_are_plain_words(tmp_path):
    Image.new("RGB", (300, 300), (255, 255, 255)).save(tmp_path / "blank.png")
    (tmp_path / "notes.txt").write_text("hi")
    with pytest.raises(StepError, match="No figure found in blank.png"):
        PR.from_picture(tmp_path / "blank.png", tmp_path / "proj")
    with pytest.raises(StepError, match="not a picture the Forge can read"):
        PR.from_picture(tmp_path / "notes.txt", tmp_path / "proj")
    with pytest.raises(StepError, match="No picture at"):
        PR.from_picture(tmp_path / "nothere.png", tmp_path / "proj")
    with pytest.raises(StepError, match="No picture given"):
        PR.from_picture([], tmp_path / "proj")
    assert PR.judgement({}) == "No view to compare." and "far from the painting" in PR.judgement({"front": 0.2})
    assert "close to the painting" in PR.judgement({"front": 0.8, "side": 0.79})


# ------------------------------------------------------------------------------------------- the CLI
def test_cli_prints_progress_lines_and_the_result(tmp_path, capsys):
    main(["character", "from-picture", str(KEEPER_FRONT), "-p", str(tmp_path / "proj"), "--json"])
    out, err = capsys.readouterr()
    prog = [l for l in err.splitlines() if l.startswith("PF_PROGRESS")]
    assert "PF_PROGRESS step=picture what=cutting_the_figure done=1 total=8" in prog and prog[-1].endswith("what=done done=8 total=8")
    r = json.loads(out)
    assert r["ok"] and r["character"] == "keeper_front" and Path(r["compare"]).exists() and r["warnings"]
    main(["character", "compare", "keeper_front", "-p", str(tmp_path / "proj")])
    out = capsys.readouterr().out
    assert "compare" in out and "Silhouette overlap" in out
    # the plain run says what it read and judges
    main(["character", "from-picture", str(KEEPER_FRONT), "-p", str(tmp_path / "proj"), "--name", "keeper"])
    out = capsys.readouterr().out
    assert "keeper: " in out and "shapes drafted from the single" in out and "warning:" in out and "Silhouette overlap" in out


def test_cli_failures_exit_2_with_json(tmp_path, capsys):
    (tmp_path / "notes.txt").write_text("hi")
    with pytest.raises(SystemExit) as e:
        main(["character", "from-picture", str(tmp_path / "notes.txt"), "-p", str(tmp_path / "proj"), "--json"])
    assert e.value.code == 2
    r = json.loads(capsys.readouterr().out)
    assert r["ok"] is False and "not a picture" in r["error"]
    # a step again before any road: the project is not there yet
    with pytest.raises(SystemExit):
        main(["character", "measure", "nobody", "-p", str(tmp_path / "proj"), "--json"])
    assert "No project" in json.loads(capsys.readouterr().out)["error"]
    # a step again on a name the project has never seen
    main(["project", "new", str(tmp_path / "proj"), "--json"])
    capsys.readouterr()
    with pytest.raises(SystemExit):
        main(["character", "measure", "nobody", "-p", str(tmp_path / "proj"), "--json"])
    assert "No character nobody" in json.loads(capsys.readouterr().out)["error"]


def test_the_docs_and_the_bench_know_the_road():
    ai = (HERE.parent / "docs" / "GUIDE_AI.md").read_text()
    humans = (HERE.parent / "docs" / "GUIDE_HUMANS.md").read_text()
    assert "character from-picture" in ai and "Start from a picture" in humans
    bench = (HERE.parent / "forge" / "scripts" / "screens" / "characters.gd").read_text()
    assert '"character", "from-picture"' in bench and "Use as reference only" in bench and "Measure again" in bench
