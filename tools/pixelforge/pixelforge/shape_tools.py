"""Shape sprites as files: whole clip sets to frame folders, GIFs, contact sheets and turntables.

These are the functions the pipeline (:mod:`pixelforge.api`), the command line and the MCP server share. A set is
written in the layout the export steps already consume (``frames/<clip>_<DIR>/frame_NNN.png`` with
``animations.json``, and ``renders/manifest.json`` for the game export's foot anchors), so a shape character goes
through ``export`` and ``export_game`` unchanged.
"""
from __future__ import annotations

import json
import math
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import shapes as S
from . import shape_rig as R
from .spritesheet import save_gif
from .styles import Style, get_style

GREY = (94, 93, 98, 255)


def options_for(doc: dict, style: str | Style | None, scale: float | None = None, steps: int | None = None, outline=None,
                elevation: float | None = None) -> dict:
    """What a preset decides for a shape sprite: the render scale (its figure height over the file's), the ramp
    length (``shading_bands``, 0 = each ramp's own), the outline rule and the clip cap. Explicit values win."""
    st = get_style(style) if style else None
    out = {
        "scale": float(scale) if scale else (S.preset_scale(doc, st.figure_height) if st else 1.0),
        "steps": int(steps) if steps else (st.shading_bands or None if st else None),
        "outline": outline if outline not in (None, "style") else (st.outline if st else "auto"),
        "elevation": elevation,
        "max_frames": st.clip_frames if st else 24,
        "style": st.name if st else None,
    }
    if out["outline"] in ("", "none"):
        out["outline"] = None
    return out


def render_set(doc: dict, out_dir: str | Path, *, clips=R.GAME_CLIPS, directions=tuple(R.DIRECTIONS), style=None, scale=None, steps=None,
               outline="style", elevation=None, max_frames=None, passes: bool = False, square: bool = True, lock=None, log=None) -> dict:
    """Render every clip in every direction into ``out_dir/<clip>_<DIR>/frame_NNN.png`` and write
    ``animations.json`` (fps per clip) and ``manifest.json`` (what the game export needs). Returns the summary."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    opt = options_for(doc, style, scale, steps, outline, elevation)
    cap = int(max_frames) if max_frames else opt["max_frames"]
    tracks = R.load_joints()
    t0 = time.time()
    model = S.Model(doc, opt["scale"], opt["steps"]) if S.mode_of(doc) == "solid" else None
    clip_fps, counts, sizes = {}, {}, {}
    for clip in clips:
        if not tracks.has(clip):
            raise ValueError(f"unknown clip {clip!r}; the library has {tracks.clips}")
        for d in directions:
            res = R.render_clip(doc, clip, d, tracks=tracks, model=model, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"],
                                elevation=opt["elevation"], max_frames=cap, square=square, passes=passes, lock=lock)
            folder = out_dir / f"{clip}_{d}"
            folder.mkdir(exist_ok=True)
            for old in folder.glob("frame_*.png"):
                old.unlink()
            for i, fr in enumerate(res["frames"]):
                Image.fromarray(fr, "RGBA").save(folder / f"frame_{i:03d}.png")
            if passes:
                for name, frames in (("normal", res["normal"]), ("depth", res["depth"])):
                    pf = out_dir.parent / f"{out_dir.name}_{name}" / f"{clip}_{d}"
                    pf.mkdir(parents=True, exist_ok=True)
                    for i, fr in enumerate(frames):
                        Image.fromarray(fr, "RGBA").save(pf / f"frame_{i:03d}.png")
            clip_fps[clip] = res["fps"]; counts[f"{clip}_{d}"] = len(res["frames"])
            sizes[f"{clip}_{d}"] = list(res["frames"][0].shape[1::-1])
            if log:
                log(f"{clip} {d}: {len(res['frames'])} frames at {res['fps']:g} fps")
    side = max(v[0] for v in sizes.values())
    ground_y = float(doc.get("ground", doc["size"][1] - 1)) * opt["scale"]
    if square:
        ground_y += side - doc["size"][1] * opt["scale"]
    anims = {"fps": tracks.fps, "clip_fps": clip_fps, "frames": counts, "source": "shapes", "file": doc.get("_file"), "scale": opt["scale"],
             "style": opt["style"], "elevation": opt["elevation"] if opt["elevation"] is not None else float(doc.get("view", {}).get("elevation", 0.0)),
             "ground_y": ground_y, "axis_x": side / 2}
    (out_dir / "animations.json").write_text(json.dumps(anims, indent=1))
    # the game export computes the foot anchor from a camera manifest: size/2 + z_mid * cos(elev) * ppu with scale 1
    manifest = {"size": side, "ppu": 1.0, "elevation": 0.0, "z_mid": ground_y - side / 2, "source": "shapes", "style": opt["style"],
                "figure_height": doc.get("height"), "render_scale": opt["scale"]}
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1))
    return {"ok": True, "frames_dir": str(out_dir), "clips": list(clips), "directions": list(directions), "frames": counts, "fps": clip_fps,
            "size": side, "scale": opt["scale"], "steps": opt["steps"], "outline": opt["outline"], "seconds": round(time.time() - t0, 2),
            "voxels": model.stats["voxels"] if model else None}


def gif_of(doc: dict, clip: str, direction: str, out: str | Path, *, style=None, scale=None, steps=None, outline="style", elevation=None,
           max_frames=None, zoom: int = 3, background=GREY, model: S.Model | None = None, tracks=None) -> dict:
    opt = options_for(doc, style, scale, steps, outline, elevation)
    cap = int(max_frames) if max_frames else opt["max_frames"]
    res = R.render_clip(doc, clip, direction, tracks=tracks, model=model, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"],
                        elevation=opt["elevation"], max_frames=cap)
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    save_gif(res["frames"], out, fps=res["fps"], zoom=zoom, background=background)
    return {"ok": True, "gif": str(out), "frames": len(res["frames"]), "fps": res["fps"], "size": list(res["frames"][0].shape[1::-1])}


def on_grey(rgba: np.ndarray, bg=GREY) -> np.ndarray:
    a = rgba[..., 3:4] / 255.0
    return (rgba[..., :3] * a + np.array(bg[:3]) * (1 - a)).astype(np.uint8)


def contact_sheet(rows: list[tuple[str, list[np.ndarray]]], out: str | Path, *, zoom: int = 2, columns: int | None = None, bg=GREY,
                  label_height: int = 14) -> dict:
    """Rows of frames (each a label and a list of RGBA frames) on a grey ground with labels, zoomed by ``zoom``."""
    cols = columns or max(len(fr) for _, fr in rows)
    w = max(f.shape[1] for _, fr in rows for f in fr); h = max(f.shape[0] for _, fr in rows for f in fr)
    sheet = Image.new("RGB", (cols * w * zoom, len(rows) * (h * zoom + label_height)), bg[:3])
    d = ImageDraw.Draw(sheet)
    for r, (label, frames) in enumerate(rows):
        y0 = r * (h * zoom + label_height)
        d.text((3, y0 + 1), label, fill=(225, 220, 205))
        for c, fr in enumerate(frames[:cols]):
            im = Image.fromarray(on_grey(fr, bg)).resize((fr.shape[1] * zoom, fr.shape[0] * zoom), Image.NEAREST)
            sheet.paste(im, (c * w * zoom, y0 + label_height))
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, optimize=True)
    return {"ok": True, "sheet": str(out), "rows": len(rows), "columns": cols, "size": list(sheet.size)}


def turntable(doc: dict, out: str | Path, *, frames: int = 48, style=None, scale=None, steps=None, outline="style", elevation=None, zoom: int = 3,
              gif: bool = True) -> dict:
    """A solid file turning through ``frames`` views (the page's spin) as a GIF, plus its 8 game views as a strip."""
    if S.mode_of(doc) != "solid":
        raise ValueError("a turntable needs a solid file")
    opt = options_for(doc, style, scale, steps, outline, elevation)
    model = S.Model(doc, opt["scale"], opt["steps"])
    elev = float(doc.get("view", {}).get("elevation", 0.0)) if opt["elevation"] is None else opt["elevation"]
    oc = S.outline_colour(doc, opt["outline"])
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    ims = []
    for k in range(frames):
        fr = model.render(k, 2 * math.pi * k / frames, elev, None, outline=oc, lights=doc.get("lights"), effects=doc.get("effects"), shadow=doc.get("shadow"))
        ims.append(fr.rgba)
    result = {"ok": True, "frames": frames, "size": [model.W, model.H], "voxels": model.stats["voxels"]}
    if gif:
        save_gif(ims, out, fps=12, zoom=zoom, background=GREY)
        result["gif"] = str(out)
    views = [model.render(0, math.radians(R.DIRECTIONS[d]), elev, None, outline=oc, lights=doc.get("lights"), effects=doc.get("effects"), shadow=doc.get("shadow")).rgba
             for d in R.DIRECTIONS]
    strip = out.with_name(out.stem + "_views.png")
    contact_sheet([("S SE E NE N NW W SW", views)], strip, zoom=zoom)
    result["views"] = str(strip)
    return result


def still(doc: dict, out: str | Path, *, frame: int = 0, direction: str = "S", style=None, scale=None, steps=None, outline="style", elevation=None,
          zoom: int = 1, passes: bool = False) -> dict:
    """One frame of a file (no clip): its own animation rules at ``frame``, facing ``direction``."""
    opt = options_for(doc, style, scale, steps, outline, elevation)
    fr = S.render_still(doc, frame, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"], phi=math.radians(R.DIRECTIONS[direction]),
                        elevation=opt["elevation"], passes=passes)
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    im = Image.fromarray(fr.rgba, "RGBA")
    if zoom > 1:
        im = im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)
    im.save(out)
    result = {"ok": True, "png": str(out), "size": list(fr.rgba.shape[1::-1]), **fr.stats}
    if passes and fr.normal is not None:
        Image.fromarray(fr.normal, "RGBA").save(out.with_name(out.stem + "_normal.png"))
        Image.fromarray(fr.depth, "RGBA").save(out.with_name(out.stem + "_depth.png"))
        result["normal"] = str(out.with_name(out.stem + "_normal.png")); result["depth"] = str(out.with_name(out.stem + "_depth.png"))
    return result


def validate_file(path: str | Path) -> dict:
    """Load and check a file; the result says what is wrong in plain words, and summarises a good file."""
    try:
        doc = S.load_shapes(path)
    except Exception as e:
        return {"ok": False, "file": str(path), "problems": [f"not readable as JSON: {e}"]}
    problems = S.validate(doc)
    out = {"ok": not problems, "file": str(path), "problems": problems}
    if not problems:
        out.update(S.file_summary(doc))
        if S.mode_of(doc) == "solid":
            bones = out["bones"]
            tracks = R.load_joints()
            unknown = [b for b in bones if b not in tracks.index]
            if unknown:
                out["ok"] = False; out["problems"] = [f"unknown bones {unknown}; the library has {tracks.names}"]
            parts = doc.get("parts") or {}
            unbound = [s.get("name", i) for i, s in enumerate(doc["shapes"]) if not s.get("bone") and not (s.get("part") and parts.get(s["part"], {}).get("bone")) and not s.get("carve")]
            out["unbound_shapes"] = unbound
    return out


def template_file(height: int = 120, out: str | Path | None = None, png: str | Path | None = None) -> dict:
    """The author pose for a figure height: the bone table (and a stick-figure PNG) to draw shapes around."""
    tpl = R.template(height)
    if out:
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        Path(out).write_text(json.dumps(tpl, indent=1))
        tpl["json"] = str(out)
    if png:
        Image.fromarray(R.stick_figure(tpl, 3), "RGBA").save(png)
        tpl["png"] = str(png)
    return tpl
