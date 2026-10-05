"""Our frames as a Diablo 2 mod: the frames quantised to the act palette (OKLab nearest, the loss reported), coded to
DCC (DC6 where the token uses it), a COF a mode and weapon class with our frame rate as their speed, the
``AnimData.d2`` records, the folder in the layout the game expects, and a validator that reads every file back.

Two targets: **character** replaces a player token's animations (``data/global/chars/<TOKEN>/``: no table changes);
**monster** adds a skin under a new token (``data/global/monsters/<TOKEN>/`` plus a MonStats2.txt and MonStats.txt
row). Layouts: **direct** (classic: ``<root>/data/...``, played with ``-direct -txt``) and **d2r**
(``<root>/mods/<NAME>/<NAME>.mpq/data/...`` with ``modinfo.json``, played with ``-mod NAME -txt``).

Our clips -> their modes: idle NU, walk WL, run RN, attack A1, attack2/punch A2, cast SC, hit GH, death DT, dead DD
(the death's last frame), block BL, kick KK, throw TH, town_idle TN, town_walk TW, skill1..4 S1..S4. A mode we have no
clip for borrows one (TN from idle, TW from walk, RN from walk, GH from hit or idle, DD from death, A2 KK TH from
attack, BL from idle, S1..S4 from cast) so the hero looks like one figure in every mode; ``only_our_clips`` stops that.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from . import animdata, cof as COF, dc6, dcc, tables
from .importer import CLIP_TO_MODE, MODE_TO_CLIP, OUR_DIRECTIONS
from .paths import D2Error, guard_destination
from .source import D2Source

CHARACTER_MODES = ["NU", "WL", "RN", "A1", "A2", "SC", "GH", "DT", "DD", "TN", "TW", "BL", "KK", "TH", "S1", "S2", "S3", "S4"]
MONSTER_MODES = ["NU", "WL", "RN", "A1", "A2", "SC", "GH", "DT", "DD", "BL"]
FALLBACKS = {"TN": ["idle"], "TW": ["walk", "idle"], "RN": ["run", "walk"], "GH": ["hit", "idle"], "DD": ["dead", "death"], "A2": ["attack2", "punch", "attack"],
             "KK": ["kick", "attack"], "TH": ["throw", "attack"], "BL": ["block", "idle"], "S1": ["skill1", "cast", "attack"], "S2": ["skill2", "cast", "attack"],
             "S3": ["skill3", "cast", "attack"], "S4": ["skill4", "cast", "attack"], "SC": ["cast", "attack"], "A1": ["attack", "cast"], "WL": ["walk"], "NU": ["idle"],
             "DT": ["death"]}
TRIGGER_MODES = {"A1", "A2", "SC", "KK", "TH", "S1", "S2", "S3", "S4"}
LOOP_MODES = {"NU", "WL", "RN", "TN", "TW"}


def read_frames(frames_dir: str | Path) -> dict:
    """Our frames folder: ``{"clips": {clip: {DIR: [rgba...]}}, "clip_fps", "ground_y", "axis_x", "figure_height"}``."""
    frames_dir = Path(frames_dir)
    aj = frames_dir / "animations.json"
    if not aj.exists():
        raise D2Error(f"{frames_dir} has no animations.json: render the character first (Render all on the Characters bench, or `pixelforge project render-shapes`).")
    anims = json.loads(aj.read_text())
    clips: dict[str, dict[str, list]] = {}
    for folder in sorted(p for p in frames_dir.iterdir() if p.is_dir()):
        clip, _, d = folder.name.rpartition("_")
        if d not in OUR_DIRECTIONS:
            continue
        files = sorted(folder.glob("frame_[0-9][0-9][0-9].png"))
        if files:
            clips.setdefault(clip, {})[d] = [np.asarray(Image.open(f).convert("RGBA")) for f in files]
    if not clips:
        raise D2Error(f"no frames under {frames_dir}")
    sample = next(iter(next(iter(clips.values())).values()))[0]
    side = sample.shape[0]
    ground_y = float(anims.get("ground_y", side - 1)); axis_x = float(anims.get("axis_x", sample.shape[1] / 2))
    fig = None
    idle = clips.get("idle", {}).get("S") or next(iter(next(iter(clips.values())).values()))
    a = idle[0][..., 3] > 127
    if a.any():
        ys = np.nonzero(a.any(axis=1))[0]
        fig = int(ys.max() - ys.min() + 1)
    return {"clips": clips, "clip_fps": anims.get("clip_fps", {}), "fps": float(anims.get("fps", 12.0)), "ground_y": ground_y, "axis_x": axis_x, "figure_height": fig,
            "canvas": list(sample.shape[1::-1]), "source": anims.get("source")}


def resample(rgba: np.ndarray, factor: float) -> np.ndarray:
    if abs(factor - 1.0) < 1e-6:
        return rgba
    im = Image.fromarray(rgba, "RGBA")
    w, h = max(1, int(round(im.width * factor))), max(1, int(round(im.height * factor)))
    return np.asarray(im.resize((w, h), Image.NEAREST))


def frames_for_mode(ours: dict, mode: str, only_our_clips: bool) -> tuple[str | None, dict[str, list]]:
    """The clip that stands for a mode (its own, else a fallback), and its frames by direction."""
    own = MODE_TO_CLIP.get(mode)
    order = ([own] if own else []) + ([] if only_our_clips else FALLBACKS.get(mode, []))
    for clip in order:
        if clip and clip in ours["clips"]:
            frames = ours["clips"][clip]
            if mode == "DD" and clip == "death":
                frames = {d: [fr[-1]] for d, fr in frames.items()}
            return clip, frames
    return None, {}


def to_d2_frames(frames_by_dir: dict[str, list], palette, ground_y: float, axis_x: float, factor: float) -> tuple[list[list[dcc.Frame]], dict, int]:
    """Our 8 directions of RGBA frames -> the game's direction order of palette-index frames anchored on the feet."""
    loss = {"pixels": 0, "sum": 0.0, "max": 0.0, "visible": 0, "colours_in": 0, "colours_out": 0}
    dirs = []
    n = None
    for dname in COF.DIRECTIONS_8:
        frames = frames_by_dir.get(dname)
        if frames is None:
            frames = frames_by_dir.get("S") or next(iter(frames_by_dir.values()))
        n = len(frames) if n is None else min(n, len(frames))
        out = []
        for rgba in frames:
            rgba = resample(rgba, factor)
            idx, l = palette.quantise(rgba)
            loss["pixels"] += l["pixels"]; loss["sum"] += l["mean"] * l["pixels"]; loss["max"] = max(loss["max"], l["max"])
            loss["visible"] += int(round(l["share_visible"] * l["pixels"])); loss["colours_in"] = max(loss["colours_in"], l["colours_in"]); loss["colours_out"] = max(loss["colours_out"], l["colours_out"])
            ys, xs = np.nonzero(idx)
            if len(ys) == 0:
                out.append(dcc.Frame(np.zeros((1, 1), np.uint8), 0, 0))
                continue
            y0, y1, x0, x1 = int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
            out.append(dcc.Frame(np.ascontiguousarray(idx[y0:y1, x0:x1]), int(round(x0 - axis_x * factor)), int(round(y0 - ground_y * factor))))
        dirs.append(out)
    dirs = [d[:n] for d in dirs]
    report = {"pixels": loss["pixels"], "mean": round(loss["sum"] / loss["pixels"], 4) if loss["pixels"] else 0.0, "max": round(loss["max"], 4),
              "share_visible": round(loss["visible"] / loss["pixels"], 4) if loss["pixels"] else 0.0, "colours_in": loss["colours_in"], "colours_out": loss["colours_out"]}
    return dirs, report, n or 0


def mod_data_dir(out_root: Path, layout: str, mod_name: str) -> Path:
    if layout == "d2r":
        return out_root / "mods" / mod_name / f"{mod_name}.mpq" / "data"
    return out_root / "data"


def launch_flags(layout: str, mod_name: str) -> list[str]:
    return ["-mod", mod_name, "-txt"] if layout == "d2r" else ["-direct", "-txt"]


def export_mod(frames_dir: str | Path, token: str, mod_name: str, out_root: str | Path, *, target: str = "character", layout: str = "direct", act: int = 1,
               source: D2Source | None = None, weapon_classes: list[str] | None = None, armour_classes: list[str] | None = None, height: int | None = None,
               display_name: str | None = None, only_our_clips: bool = False, use_dc6: bool = False, log=None) -> dict:
    token = token.upper()
    if len(token) != 2 or not token.isalnum():
        raise D2Error(f"a token is two letters or digits (NE, SK, ZZ), not {token!r}")
    out_root = guard_destination(Path(out_root), "a mod folder (it carries copies of the game's AnimData.d2 and tables)")
    source = source or D2Source()
    ours = read_frames(frames_dir)
    palette = source.palette(act)
    factor = 1.0
    if height and ours["figure_height"]:
        factor = float(height) / float(ours["figure_height"])
    modes = CHARACTER_MODES if target == "character" else MONSTER_MODES
    wcs = [w.upper() for w in (weapon_classes or (COF.COMMON_WEAPON_CLASSES + COF.EXTRA_WEAPON_CLASSES.get(token, []) if target == "character" else ["HTH"]))]
    arms = [a.upper() for a in (armour_classes or (COF.ARMOUR_CLASSES if target == "character" else ["LIT"]))]
    data_dir = mod_data_dir(out_root, layout, mod_name)
    kind_dir = "chars" if target == "character" else "monsters"
    base = data_dir / "global" / kind_dir / token
    (base / "TR").mkdir(parents=True, exist_ok=True); (base / "COF").mkdir(parents=True, exist_ok=True)
    try:
        records, anim_tool = source.animdata()
    except D2Error as e:
        raise D2Error("the mod needs the game's AnimData.d2 to add our speeds to (the game reads one file with every animation in it). " + str(e)) from e
    written, mode_reports, expected = [], {}, {}
    total_loss = []
    for mode in modes:
        clip, frames_by_dir = frames_for_mode(ours, mode, only_our_clips)
        if clip is None:
            continue
        dirs, loss, n = to_d2_frames(frames_by_dir, palette, ours["ground_y"], ours["axis_x"], factor)
        d = dcc.DCC(dirs)
        if use_dc6:
            blob, enc_report = dc6.encode(d), {"cells_reduced": 0, "pixels_changed": 0}
            ext = ".dc6"
        else:
            blob, enc_report = dcc.encode(d, palette.lab)
            ext = ".dcc"
        fps = float(ours["clip_fps"].get(clip, ours["fps"]))
        if mode == "DD":
            fps = 1.0
        speed = animdata.speed_for_fps(fps)
        trigger = int(round(0.6 * (n - 1))) if mode in TRIGGER_MODES and n > 1 else None
        xmin = min(f.left for dd in dirs for f in dd); xmax = max(f.left + f.width for dd in dirs for f in dd)
        ymin = min(f.top for dd in dirs for f in dd); ymax = max(f.bottom for dd in dirs for f in dd)
        for wc in wcs:
            for arm in arms:
                p = base / "TR" / f"{token}TR{arm}{mode}{wc}{ext}"
                p.write_bytes(blob); written.append(str(p))
            c = COF.make([COF.Layer("TR", 1, 1, 0, 0, wc)], n, 8, speed, (xmin, xmax, ymin, ymax), trigger)
            cp = base / "COF" / f"{token}{mode}{wc}.cof"
            cp.write_bytes(COF.encode(c)); written.append(str(cp))
            records = animdata.upsert(records, f"{token}{mode}{wc}", n, speed, {trigger: 1} if trigger is not None else {})
        expected[mode] = {"frames": n, "directions": 8, "pixels": [[f.pixels for f in dd] for dd in dirs], "speed": speed, "ext": ext}
        mode_reports[mode] = {"clip": clip, "frames": n, "fps": round(fps, 3), "speed": speed, "trigger_frame": trigger, "colour_loss": loss, "cells_reduced": enc_report["cells_reduced"],
                              "pixels_changed_by_cells": enc_report["pixels_changed"], "box": [xmin, xmax, ymin, ymax], "bytes": len(blob),
                              "borrowed": clip != MODE_TO_CLIP.get(mode)}
        total_loss.append(loss)
        if log:
            log(f"{mode} <- {clip}: {n} frames at {fps:g} fps (speed {speed}), colour loss mean {loss['mean']}")
    if not mode_reports:
        raise D2Error(f"none of the clips under {frames_dir} maps to a Diablo 2 mode; the clips are named {sorted(ours['clips'])}")
    (data_dir / "global").mkdir(parents=True, exist_ok=True)
    ad = data_dir / "global" / "animdata.d2"
    tool = animdata.write(records, ad); written.append(str(ad))
    table_report = {}
    if target == "monster":
        table_report = _monster_tables(source, data_dir, token, display_name or f"pf_{token.lower()}", mode_reports)
        written += table_report.pop("files")
    if layout == "d2r":
        mi = out_root / "mods" / mod_name / f"{mod_name}.mpq" / "modinfo.json"
        mi.write_text(json.dumps({"name": mod_name, "savepath": f"{mod_name}/"}, indent=1) + "\n"); written.append(str(mi))
    loss = {"mean": round(sum(l["mean"] * l["pixels"] for l in total_loss) / max(1, sum(l["pixels"] for l in total_loss)), 4),
            "max": round(max(l["max"] for l in total_loss), 4), "share_visible": round(sum(l["share_visible"] * l["pixels"] for l in total_loss) / max(1, sum(l["pixels"] for l in total_loss)), 4),
            "words": ""}
    loss["words"] = ("no visible colour change" if loss["share_visible"] < 0.01 else f"{loss['share_visible'] * 100:.1f}% of the pixels moved a visible step to reach the act {act} palette "
                     f"(mean OKLab distance {loss['mean']}, largest {loss['max']})")
    result = {"ok": True, "mod_dir": str(out_root if layout != "d2r" else out_root / "mods" / mod_name), "data_dir": str(data_dir), "layout": layout, "mod_name": mod_name,
              "token": token, "target": target, "flags": launch_flags(layout, mod_name), "modes": mode_reports, "weapon_classes": wcs, "armour_classes": arms,
              "files": written, "file_count": len(written), "colour_loss": loss, "scale": round(factor, 4), "figure_height_in": ours["figure_height"],
              "figure_height_out": int(round((ours["figure_height"] or 0) * factor)) if ours["figure_height"] else None, "animdata_tool": tool, "palette": palette.name,
              "tables": table_report, "borrowed_modes": [m for m, r in mode_reports.items() if r["borrowed"]]}
    result["validation"] = validate_mod(result, expected)
    result["ok"] = result["validation"]["ok"]
    (Path(result["mod_dir"]) / "pixelforge_mod.json").write_text(json.dumps(result, indent=1, default=str))     # the record of what was written (remove_mod reads it)
    return result


def _monster_tables(source: D2Source, data_dir: Path, token: str, name: str, mode_reports: dict) -> dict:
    ex = data_dir / "global" / "excel"
    ex.mkdir(parents=True, exist_ok=True)
    files = []
    ms2 = tables.read(source.get("data/global/excel/MonStats2.txt", "the monster animation table"))
    template = tables.find_row(ms2, "Id", "skeleton1") or next(r for r in ms2["rows"] if r.get("Id") and r["Id"] != "Expansion")
    row = dict(template)
    row["Id"] = name
    for comp in ["HD", "TR", "LG", "RA", "LA", "RH", "LH", "SH"] + [f"S{i}" for i in range(1, 9)]:
        row[comp] = "1" if comp == "TR" else "0"
        row[comp + "v"] = "LIT" if comp == "TR" else "nil"
    row["TotalPieces"] = "1"; row["BaseW"] = "hth"
    for mode in MONSTER_MODES:
        row["m" + mode] = "1" if mode in mode_reports else "0"
        row["d" + mode] = "8" if mode in mode_reports else "0"
    tables.upsert_row(ms2, "Id", row)
    tables.write(ms2, ex / "MonStats2.txt"); files.append(str(ex / "MonStats2.txt"))
    ms = tables.read(source.get("data/global/excel/MonStats.txt", "the monster table"))
    tmpl = tables.find_row(ms, "Id", "skeleton1") or next(r for r in ms["rows"] if r.get("Id") and r["Id"] != "Expansion")
    mrow = dict(tmpl)
    hc = max([int(r.get("*hcIdx") or 0) for r in ms["rows"] if (r.get("*hcIdx") or "").isdigit()] + [0]) + 1
    mrow.update({"Id": name, "*hcIdx": str(hc), "BaseId": name, "NextInClass": "", "NameStr": name, "MonStatsEx": name, "Code": token, "enabled": "1"})
    tables.upsert_row(ms, "Id", mrow)
    tables.write(ms, ex / "MonStats.txt"); files.append(str(ex / "MonStats.txt"))
    return {"monster_id": name, "hcIdx": hc, "template": template.get("Id"), "files": files}


def validate_mod(result: dict, expected: dict | None = None) -> dict:
    """Read back every file the export wrote: each sprite decodes to the frames and directions meant (pixel for pixel
    against what was coded, when ``expected`` is given), each COF parses with the layer and speed meant, AnimData.d2
    holds our records, the tables hold our rows."""
    problems, checked = [], 0
    for f in result["files"]:
        p = Path(f)
        if not p.exists():
            problems.append(f"missing: {p}"); continue
        try:
            if p.suffix.lower() in (".dcc", ".dc6"):
                d = dcc.decode(p.read_bytes()) if p.suffix.lower() == ".dcc" else dc6.decode(p.read_bytes())
                mode = p.stem[5:7]
                exp = (expected or {}).get(mode)
                if exp:
                    if len(d.directions) != exp["directions"] or d.frames_per_direction != exp["frames"]:
                        problems.append(f"{p.name}: {len(d.directions)} directions x {d.frames_per_direction} frames, meant {exp['directions']} x {exp['frames']}")
                    else:
                        for di, dd in enumerate(d.directions):
                            for fi, fr in enumerate(dd):
                                if not np.array_equal(fr.pixels, exp["pixels"][di][fi]):
                                    problems.append(f"{p.name}: direction {di} frame {fi} reads back different from what was coded"); break
                            else:
                                continue
                            break
            elif p.suffix.lower() == ".cof":
                c = COF.decode(p.read_bytes())
                mode = p.stem[2:4]
                exp = (expected or {}).get(mode)
                if c.layers[0].composite != "TR":
                    problems.append(f"{p.name}: first layer is {c.layers[0].composite}, meant TR")
                if exp and (c.frames_per_direction != exp["frames"] or c.speed != exp["speed"]):
                    problems.append(f"{p.name}: {c.frames_per_direction} frames at speed {c.speed}, meant {exp['frames']} at {exp['speed']}")
            elif p.name.lower() == "animdata.d2":
                recs, _ = animdata.read(p)
                for mode, exp in (expected or {}).items():
                    for wc in result["weapon_classes"]:
                        r = animdata.find(recs, f"{result['token']}{mode}{wc}")
                        if r is None:
                            problems.append(f"animdata.d2 lacks {result['token']}{mode}{wc}")
                        elif r["frames"] != exp["frames"] or r["speed"] != exp["speed"]:
                            problems.append(f"animdata.d2 {result['token']}{mode}{wc}: {r['frames']} frames at {r['speed']}, meant {exp['frames']} at {exp['speed']}")
            elif p.suffix.lower() == ".txt":
                t = tables.read(p)
                mid = result.get("tables", {}).get("monster_id")
                if mid and tables.find_row(t, "Id", mid) is None:
                    problems.append(f"{p.name} has no row {mid}")
            elif p.name == "modinfo.json":
                json.loads(p.read_text())
            checked += 1
        except Exception as e:  # noqa: BLE001 - every file is checked; the problem is reported, not raised
            problems.append(f"{p.name}: does not read back ({e})")
    return {"ok": not problems, "files_checked": checked, "problems": problems}


def remove_mod(result_or_dir: str | Path | dict) -> dict:
    """Delete what an export wrote (the file list in ``pixelforge_mod.json``), leaving other files alone."""
    if isinstance(result_or_dir, dict):
        files = result_or_dir.get("files", [])
    else:
        info = Path(result_or_dir) / "pixelforge_mod.json"
        files = json.loads(info.read_text()).get("files", []) if info.exists() else []
    removed = 0
    for f in files:
        p = Path(f)
        if p.exists():
            p.unlink(); removed += 1
    return {"ok": True, "removed": removed}
