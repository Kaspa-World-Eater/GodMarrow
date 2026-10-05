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
from .styles import CHARACTER_STYLE, Style, get_style

GREY = (94, 93, 98, 255)


def save_parts(parts: np.ndarray, path: str | Path, zoom: int = 1) -> str:
    """Write a part-index mask (uint16, 0 = empty) as ``path``: a paletted PNG whose entry i is the grey level i with
    index 0 transparent when the file has under 256 parts (what the editor reads: ``r8`` is the part, alpha 0 is
    empty), else a 16-bit greyscale PNG. ``zoom`` repeats each pixel (a zoomed still's mask stays aligned)."""
    a = np.asarray(parts)
    if zoom > 1:
        a = a.repeat(zoom, 0).repeat(zoom, 1)
    path = Path(path)
    if a.max(initial=0) < 256:
        im = Image.fromarray(a.astype(np.uint8), "P")
        im.putpalette([v for i in range(256) for v in (i, i, i)])
        im.save(path, transparency=0)
    else:
        Image.fromarray(a.astype(np.uint16), "I;16").save(path)
    return str(path)


def load_parts(path: str | Path) -> np.ndarray:
    """Read a mask :func:`save_parts` wrote back to its uint16 indices."""
    im = Image.open(path)
    if im.mode in ("P", "L", "I", "I;16"):          # palette indices, or the grey levels, are the part indices
        return np.asarray(im, np.uint16)
    return np.asarray(im.convert("L"), np.uint16)


def is_character(doc: dict) -> bool:
    """A solid file whose shapes ride bones (directly or through parts): a figure the clips move, not an object."""
    if S.mode_of(doc) != "solid":
        return False
    parts = doc.get("parts") or {}
    for sh in doc.get("shapes", []):
        if sh.get("bone") or (sh.get("part") and parts.get(sh["part"], {}).get("bone")):
            return True
    return False


def default_style_for(doc: dict) -> str | None:
    """The preset a file renders with when none is named: a character takes the game's hero height
    (:data:`pixelforge.styles.CHARACTER_STYLE`, 195 px); an object or a flat file keeps its own size (None)."""
    return CHARACTER_STYLE if is_character(doc) else None


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
               outline="style", elevation=None, max_frames=None, passes: bool = False, square: bool = True, lock=None, log=None, progress=None,
               parts: bool = True) -> dict:
    """Render every clip in every direction into ``out_dir/<clip>_<DIR>/frame_NNN.png`` and write
    ``animations.json`` (fps per clip) and ``manifest.json`` (what the game export needs). With ``parts`` (the default)
    every frame also gets ``frame_NNN.parts.png`` (the part index per pixel, 0 = empty: what the editor's carry matches
    by) and the manifest the part table under ``"parts"`` (:func:`pixelforge.shapes.part_table`). Returns the summary."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    opt = options_for(doc, style, scale, steps, outline, elevation)
    cap = int(max_frames) if max_frames else opt["max_frames"]
    tracks = R.load_joints()
    t0 = time.time()
    solid = S.mode_of(doc) == "solid"
    for clip in clips:
        if not tracks.has(R.clip_source(doc, clip)):
            raise ValueError(f"unknown clip {R.clip_source(doc, clip)!r} (for {clip!r}); the library has {tracks.clips}")
    # each clip gets the canvas it needs (a death lies down past the file's width); every frame is padded to one square
    widths = {clip: (R.canvas_width(doc, [clip], tracks) if solid else float(doc["size"][0])) for clip in clips}
    width = max(widths.values())
    model = S.Model(doc, opt["scale"], opt["steps"]) if solid else None
    side = int(max(round(width * opt["scale"]), round(doc["size"][1] * opt["scale"]))) if square else False
    clip_fps, counts, sizes = {}, {}, {}
    for clip in clips:
        if model is not None:
            model.set_width(widths[clip])
        for d in directions:
            res = R.render_clip(doc, clip, d, tracks=tracks, model=model, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"],
                                elevation=opt["elevation"], max_frames=cap, square=side, passes=passes, lock=lock)
            folder = out_dir / f"{clip}_{d}"
            folder.mkdir(exist_ok=True)
            for old in folder.glob("frame_*.png"):
                old.unlink()
            for i, fr in enumerate(res["frames"]):
                Image.fromarray(fr, "RGBA").save(folder / f"frame_{i:03d}.png")
                if parts:
                    save_parts(res["parts"][i], folder / f"frame_{i:03d}.parts.png")
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
            if progress:
                progress(clips.index(clip) * len(directions) + list(directions).index(d) + 1, len(clips) * len(directions), clip, d)
    side = max(v[0] for v in sizes.values())
    ground_y = float(doc.get("ground", doc["size"][1] - 1)) * opt["scale"]
    if square:
        ground_y += side - doc["size"][1] * opt["scale"]
    view_elevation = opt["elevation"] if opt["elevation"] is not None else float(doc.get("view", {}).get("elevation", 0.0))
    anims = {"fps": tracks.fps, "clip_fps": clip_fps, "frames": counts, "source": "shapes", "file": doc.get("_file"), "scale": opt["scale"],
             "style": opt["style"], "elevation": view_elevation, "ground_y": ground_y, "axis_x": side / 2, "canvas_width": width}
    (out_dir / "animations.json").write_text(json.dumps(anims, indent=1))
    # the game export computes the foot anchor from a camera manifest: size/2 + z_mid * cos(elev) * ppu with scale 1. The
    # frames are already projected, so the anchor maths runs with elevation 0; the camera the frames were seen from is
    # view_elevation (what the export's scale note reports).
    manifest = {"size": side, "ppu": 1.0, "elevation": 0.0, "view_elevation": view_elevation, "z_mid": ground_y - side / 2, "source": "shapes",
                "style": opt["style"], "figure_height": doc.get("height"), "render_scale": opt["scale"]}
    table = S.part_table(doc)[0]
    if parts:
        manifest["parts"] = table
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=1))
    return {"ok": True, "frames_dir": str(out_dir), "clips": list(clips), "directions": list(directions), "frames": counts, "fps": clip_fps,
            "size": side, "scale": opt["scale"], "steps": opt["steps"], "outline": opt["outline"], "elevation": view_elevation,
            "seconds": round(time.time() - t0, 2), "voxels": model.stats["voxels"] if model else None, "parts": len(table) if parts else 0}


def gif_of(doc: dict, clip: str, direction: str, out: str | Path, *, style=None, scale=None, steps=None, outline="style", elevation=None,
           max_frames=None, zoom: int = 3, background=GREY, model: S.Model | None = None, tracks=None) -> dict:
    opt = options_for(doc, style, scale, steps, outline, elevation)
    cap = int(max_frames) if max_frames else opt["max_frames"]
    res = R.render_clip(doc, clip, direction, tracks=tracks, model=model, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"],
                        elevation=opt["elevation"], max_frames=cap)
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    save_gif(res["frames"], out, fps=res["fps"], zoom=zoom, background=background)
    return {"ok": True, "gif": str(out), "frames": len(res["frames"]), "fps": res["fps"], "size": list(res["frames"][0].shape[1::-1])}


def trim_frames(frames: list, margin: int = 2) -> list:
    """Every frame cropped to the one box that holds the content of all of them (plus ``margin``), so a GIF of the
    idle is not padded to the death clip's wide square; the frames stay aligned with each other."""
    if not frames:
        return frames
    alpha = np.any(np.stack([f[..., 3] > 0 for f in frames]), axis=0)
    ys, xs = np.nonzero(alpha)
    if len(ys) == 0:
        return list(frames)
    H, W = alpha.shape
    y0, y1 = max(int(ys.min()) - margin, 0), min(int(ys.max()) + margin + 1, H)
    x0, x1 = max(int(xs.min()) - margin, 0), min(int(xs.max()) + margin + 1, W)
    return [f[y0:y1, x0:x1] for f in frames]


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
              gif: bool = True, parts: bool = True) -> dict:
    """A solid file turning through ``frames`` views (the page's spin) as a GIF, plus its 8 game views as a strip. With
    ``parts`` the masks go beside them: ``<stem>_parts/frame_NNN.parts.png`` per spin frame, ``view_<DIR>.parts.png``
    per game view, and ``manifest.json`` with the part table."""
    if S.mode_of(doc) != "solid":
        raise ValueError("a turntable needs a solid file")
    opt = options_for(doc, style, scale, steps, outline, elevation)
    model = S.Model(doc, opt["scale"], opt["steps"])
    elev = float(doc.get("view", {}).get("elevation", 0.0)) if opt["elevation"] is None else opt["elevation"]
    oc = S.outline_colour(doc, opt["outline"])
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    ims, masks = [], []
    for k in range(frames):
        fr = model.render(k, 2 * math.pi * k / frames, elev, None, outline=oc, lights=doc.get("lights"), effects=doc.get("effects"), shadow=doc.get("shadow"))
        ims.append(fr.rgba); masks.append(fr.parts)
    result = {"ok": True, "frames": frames, "size": [model.W, model.H], "voxels": model.stats["voxels"]}
    if gif:
        save_gif(ims, out, fps=12, zoom=zoom, background=GREY)
        result["gif"] = str(out)
    frs = [model.render(0, math.radians(R.DIRECTIONS[d]), elev, None, outline=oc, lights=doc.get("lights"), effects=doc.get("effects"), shadow=doc.get("shadow"))
           for d in R.DIRECTIONS]
    strip = out.with_name(out.stem + "_views.png")
    contact_sheet([("S SE E NE N NW W SW", [f.rgba for f in frs])], strip, zoom=zoom)
    result["views"] = str(strip)
    if parts:
        pdir = out.with_name(out.stem + "_parts")
        pdir.mkdir(parents=True, exist_ok=True)
        for k, m in enumerate(masks):
            save_parts(m, pdir / f"frame_{k:03d}.parts.png")
        for d, f in zip(R.DIRECTIONS, frs):
            save_parts(f.parts, pdir / f"view_{d}.parts.png")
        (pdir / "manifest.json").write_text(json.dumps({"source": "shapes", "parts": model.part_table}, indent=1))
        result["parts"] = str(pdir)
    return result


def ground_point(doc: dict, direction: str, scale: float, elevation: float | None, model: S.Model | None = None) -> tuple[float, float]:
    """Where the file's ground point under the body axis lands on the canvas (px): the foot anchor of an object."""
    if S.mode_of(doc) == "flat":
        sh = doc.get("shadow") or {}
        at = sh.get("at", [doc["size"][0] / 2, doc.get("ground", doc["size"][1] - 1)])
        return float(at[0]) * scale, (float(at[1]) + float(doc.get("origin_y", 0))) * scale
    model = model or S.Model(doc, scale)
    elev = float(doc.get("view", {}).get("elevation", 0.0)) if elevation is None else float(elevation)
    cx, cz = model.axis
    x, y, _ = model.project((cx, model.ground, cz), math.radians(R.DIRECTIONS[direction]), elev)
    return float(x), float(y)


def still(doc: dict, out: str | Path, *, frame: int = 0, direction: str = "S", style=None, scale=None, steps=None, outline="style", elevation=None,
          zoom: int = 1, passes: bool = False, game_objects: str | Path | None = None, name: str | None = None, hr: float = 2.0,
          parts: bool = True) -> dict:
    """One frame of a file (no clip): its own animation rules at ``frame``, facing ``direction``. With ``game_objects``
    (the game's ``art/objects/objects.json``) the PNG is also entered there as an object: ``{"png", "ox", "oy", "hr"}``
    with the foot point under the body axis as the anchor (``hr`` = texels per world px, 2 for the game's objects).
    With ``parts`` (the default) the part-index mask is written beside it as ``<stem>.parts.png`` (at the same zoom)
    and the part table returned under ``"part_table"``."""
    opt = options_for(doc, style, scale, steps, outline, elevation)
    model = S.Model(doc, opt["scale"], opt["steps"]) if S.mode_of(doc) == "solid" else None
    fr = S.render_still(doc, frame, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"], phi=math.radians(R.DIRECTIONS[direction]),
                        elevation=opt["elevation"], passes=passes, model=model)
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    im = Image.fromarray(fr.rgba, "RGBA")
    if zoom > 1:
        im = im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)
    im.save(out)
    ax, ay = ground_point(doc, direction, opt["scale"], opt["elevation"], model)
    result = {"ok": True, "png": str(out), "size": list(fr.rgba.shape[1::-1]), "anchor": [round(ax * zoom, 1), round(ay * zoom, 1)], **fr.stats,
              "lights": light_places(doc, fr, model, direction, opt["elevation"], zoom)}
    if passes and fr.normal is not None:
        Image.fromarray(fr.normal, "RGBA").save(out.with_name(out.stem + "_normal.png"))
        Image.fromarray(fr.depth, "RGBA").save(out.with_name(out.stem + "_depth.png"))
        result["normal"] = str(out.with_name(out.stem + "_normal.png")); result["depth"] = str(out.with_name(out.stem + "_depth.png"))
    if parts and fr.parts is not None:
        result["parts"] = save_parts(fr.parts, out.with_name(out.stem + ".parts.png"), zoom=zoom)
        result["part_table"] = S.part_table(doc)[0]
    if game_objects:
        key = name or S.file_summary(doc)["name"]
        result["game_objects"] = add_game_object(game_objects, key, out, (int(round(ax * zoom)), int(round(ay * zoom))), hr)
    return result


def light_places(doc: dict, fr: S.Frame, model: S.Model | None, direction: str, elevation: float | None, zoom: int = 1) -> list[dict]:
    """Where the file's lights land on the rendered picture (``x``, ``y`` in picture pixels, with the light's colour,
    radius, strength and pulse): what a preview reads to cast the sprite's own light onto its surroundings."""
    out = []
    phi = math.radians(R.DIRECTIONS[direction])
    elev = float(doc.get("view", {}).get("elevation", 0.0)) if elevation is None else float(elevation)
    for li in doc.get("lights", []):
        if li.get("from") == "flicker":
            continue
        at = None
        if model is not None:
            at = model._screen_at(li, fr.anchors or {}, phi, elev)
        elif len(li.get("at", [])) >= 2:
            at = (float(li["at"][0]), float(li["at"][1]), 0.0)
        if at is None:
            continue
        out.append({"name": li.get("name", "light"), "x": round(at[0] * zoom, 1), "y": round(at[1] * zoom, 1), "colour": li.get("colour", "#7dff78"),
                    "radius": float(li.get("radius", 20)) * (model.scale if model is not None else 1.0) * zoom,
                    "strength": float(li.get("strength", 1.0)), "pulse": float(li.get("pulse", 0.0)), "bone": li.get("bone", "")})
    return out


def add_game_object(objects_json: str | Path, key: str, png: Path, anchor: tuple[int, int], hr: float = 2.0, extra: dict | None = None) -> dict:
    """Add or replace one entry of the game's ``objects.json``: ``{"png": "res://art/objects/<path>", "ox", "oy", "hr"}``.
    The PNG's path is written relative to the objects.json folder (the game's ``art/objects``)."""
    oj = Path(objects_json)
    data = json.loads(oj.read_text()) if oj.exists() else {}
    try:
        rel = Path(png).resolve().relative_to(oj.resolve().parent).as_posix()
    except ValueError:
        rel = Path(png).name
    entry = {"png": f"res://art/objects/{rel}", "ox": int(anchor[0]), "oy": int(anchor[1]), "hr": float(hr) if float(hr) != int(hr) else int(hr)}
    if extra:
        entry.update(extra)
    data[key] = entry
    oj.parent.mkdir(parents=True, exist_ok=True)
    oj.write_text(json.dumps(data, indent=1) + "\n")
    return {"file": str(oj), "key": key, "entry": entry}


def export_object(doc: dict, out_dir: str | Path, name: str | None = None, *, directions=("S",), style=None, scale=None, steps=None, outline="style",
                  elevation=None, frame: int = 0, game_objects: str | Path | None = None, hr: float = 2.0) -> dict:
    """A shape file as a game object: one trimmed PNG per direction (``<name>_<DIR>.png``, the first direction also as
    ``<name>.png``) with the foot anchor, a ``<name>.json`` beside them, and entries in the game's ``objects.json``
    when given (key ``<name>`` for the first direction, ``<name>_<DIR>`` for the others). The preset gives the ramp
    length and the outline rule; the scale is the file's own unless ``scale`` says otherwise (an object's ``height``
    is its size, not a figure's)."""
    opt = options_for(doc, style, scale or 1.0, steps, outline, elevation)
    out_dir = Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    key = name or S.file_summary(doc)["name"]
    model = S.Model(doc, opt["scale"], opt["steps"]) if S.mode_of(doc) == "solid" else None
    views, entries = {}, {}
    for i, d in enumerate(directions):
        d = d.upper()
        fr = S.render_still(doc, frame, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"], phi=math.radians(R.DIRECTIONS[d]),
                            elevation=opt["elevation"], model=model)
        rgba = fr.rgba
        ys, xs = np.nonzero(rgba[..., 3])
        if len(ys) == 0:
            raise ValueError(f"the file renders nothing facing {d}")
        y0, y1, x0, x1 = int(ys.min()), int(ys.max()) + 1, int(xs.min()), int(xs.max()) + 1
        ax, ay = ground_point(doc, d, opt["scale"], opt["elevation"], model)
        ox, oy = int(round(ax - x0)), int(round(ay - y0))
        png = out_dir / f"{key}_{d}.png"
        Image.fromarray(rgba[y0:y1, x0:x1], "RGBA").save(png)
        if i == 0:
            Image.fromarray(rgba[y0:y1, x0:x1], "RGBA").save(out_dir / f"{key}.png")
        views[d] = {"png": str(png), "ox": ox, "oy": oy, "size": [x1 - x0, y1 - y0]}
        if game_objects:
            entries[key if i == 0 else f"{key}_{d}"] = add_game_object(game_objects, key if i == 0 else f"{key}_{d}", png, (ox, oy), hr)["entry"]
    meta = {"name": key, "kind": "object", "hr": hr, "scale": opt["scale"], "elevation": opt["elevation"] if opt["elevation"] is not None else doc.get("view", {}).get("elevation", 0.0),
            "views": views, "source": "shapes", "file": doc.get("_file")}
    (out_dir / f"{key}.json").write_text(json.dumps(meta, indent=1))
    result = {"ok": True, "name": key, "dir": str(out_dir), "views": views, "json": str(out_dir / f"{key}.json")}
    if game_objects:
        result["game_objects"] = {"file": str(game_objects), "added": entries}
    return result


def validate_file(path: str | Path) -> dict:
    """Load and check a file; the result says what is wrong in plain words, and summarises a good file."""
    try:
        doc = S.load_shapes(path)
    except Exception as e:
        return {"ok": False, "file": str(path), "problems": [f"not readable as JSON: {e}"]}
    problems = S.validate(doc)
    out = {"ok": not problems, "file": str(path), "problems": problems, "warnings": []}
    if not problems:
        out.update(S.file_summary(doc))
        if S.mode_of(doc) == "solid":
            bones = out["bones"]
            tracks = R.load_joints()
            try:
                skel = R.skeleton_for(doc, tracks)
                knee = float(skel.pos[skel.index["shin.L"]][1]) if "shin.L" in skel.index else None
            except Exception:
                knee = None
            out["warnings"] = S.warnings(doc, knee)
            unknown = [b for b in bones if b not in tracks.index]
            if unknown:
                out["ok"] = False; out["problems"] = [f"unknown bones {unknown}; the library has {tracks.names}"]
            bad_clips = [f"{k} -> {v}" for k, v in (doc.get("clips") or {}).items() if not tracks.has(str(v))]
            if bad_clips:
                out["ok"] = False; out["problems"] = out["problems"] + [f"clips map to unknown library clips: {bad_clips}; the library has {tracks.clips}"]
            if doc.get("clips"):
                out["clips"] = dict(doc["clips"])
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


# ------------------------------------------------------------------------------------------------ the author's small edits
_PART_PARTS = {"plank_skirt": "plank_skirt_parts", "locs": "locs_parts", "back_cape": "cape_parts"}


def add_part(path: str | Path, part: str, args: dict | None = None, out: str | Path | None = None) -> dict:
    """A piece from the parts kit (:mod:`pixelforge.shape_parts`) appended to a file: ``part`` is the kit function's name
    (``chain``, ``chain_loop``, ``chest_chain``, ``spike_ring``, ``upright_spikes``, ``spike_row``, ``plank_skirt``, ``greave``,
    ``thigh_plate``, ``shackle``, ``locs``, ``back_cape``), ``args`` its keyword arguments (a ``rnd`` of an int seeds the random). The
    ``parts`` entries a piece needs (the plank skirt's, the locs', the cape's) are added when the file lacks them. The file is validated
    and written (to ``out`` when given). For a change of one value use :func:`edit_shapes`."""
    import random

    from . import shape_parts as K

    if part.startswith("_") or part in ("mirror", "on_ellipse", "rivet_row") or not hasattr(K, part) or part.endswith("_parts"):
        raise ValueError(f"{part!r} is not a piece of the kit; the pieces are chain chain_loop chest_chain spike_ring upright_spikes spike_row plank_skirt greave thigh_plate shackle locs back_cape")
    doc = S.load_shapes(path)
    args = dict(args or {})
    if "rnd" in args and not isinstance(args["rnd"], random.Random):
        args["rnd"] = random.Random(int(args["rnd"]))
    made = getattr(K, part)(**args)
    new = [made] if isinstance(made, dict) else list(made)
    doc.setdefault("shapes", []).extend(new)
    if part in _PART_PARTS:
        doc.setdefault("parts", {})
        for k, v in getattr(K, _PART_PARTS[part])().items():
            doc["parts"].setdefault(k, v)
    dst, check = _check_and_write(doc, Path(out) if out else Path(path), "the file would have problems")
    return {"ok": True, "file": str(dst), "part": part, "added": [s.get("name", "") for s in new], "shapes": len(doc["shapes"]), "warnings": check.get("warnings", [])}


def edit_shapes(path: str | Path, ops: list[dict], out: str | Path | None = None) -> dict:
    """Small edits to a file without rewriting it by hand: ``ops`` is a list of ``{"op": ..., ...}``:
    ``{"op": "set", "shape": NAME, "key": K, "value": V}`` (one field of a named shape; a key with dots reaches inside, ``rotate.x``),
    ``{"op": "remove", "shape": NAME}``, ``{"op": "add", "shape": {...}}``, ``{"op": "material", "name": N, "spec": {...}}``,
    ``{"op": "part", "name": N, "spec": {...}}``, ``{"op": "doc", "key": K, "value": V}`` (a top-level field: ``clips``, ``view``, ``shadow``).
    Validated and written (to ``out`` when given); an edit that leaves problems is refused with them in words."""
    doc = S.load_shapes(path)
    by_name = {s.get("name", ""): s for s in doc.get("shapes", [])}
    applied = []
    for op in ops:
        kind = str(op.get("op", ""))
        if kind == "set":
            sh = by_name.get(str(op.get("shape", "")))
            if sh is None:
                raise ValueError(f"no shape named {op.get('shape')!r}")
            keys = str(op["key"]).split(".")
            tgt = sh
            for k in keys[:-1]:
                tgt = tgt.setdefault(k, {})
            tgt[keys[-1]] = op.get("value")
            applied.append(f"{op['shape']}.{op['key']}")
        elif kind == "remove":
            sh = by_name.pop(str(op.get("shape", "")), None)
            if sh is None:
                raise ValueError(f"no shape named {op.get('shape')!r}")
            doc["shapes"] = [s for s in doc["shapes"] if s is not sh]
            applied.append(f"-{op['shape']}")
        elif kind == "add":
            sh = dict(op.get("shape") or {})
            if not sh.get("kind"):
                raise ValueError("an added shape needs a kind")
            doc.setdefault("shapes", []).append(sh)
            by_name[sh.get("name", "")] = sh
            applied.append(f"+{sh.get('name', sh['kind'])}")
        elif kind == "material":
            doc.setdefault("materials", {})[str(op["name"])] = dict(op.get("spec") or {})
            applied.append(f"material {op['name']}")
        elif kind == "part":
            doc.setdefault("parts", {})[str(op["name"])] = dict(op.get("spec") or {})
            applied.append(f"part {op['name']}")
        elif kind == "doc":
            doc[str(op["key"])] = op.get("value")
            applied.append(f"doc.{op['key']}")
        else:
            raise ValueError(f"unknown op {kind!r}; the ops are set remove add material part doc")
    dst, check = _check_and_write(doc, Path(out) if out else Path(path), "the edit would leave problems")
    return {"ok": True, "file": str(dst), "applied": applied, "shapes": len(doc.get("shapes", [])), "warnings": check.get("warnings", [])}


def _check_and_write(doc: dict, dst: Path, why: str) -> tuple[Path, dict]:
    """The full file check (:func:`validate_file`: the format, the bones, the clip map) on a temporary copy; written to ``dst`` only
    when it passes, so a refused change leaves the file as it was."""
    tmp = dst.with_name(dst.stem + ".checking.json")
    tmp.write_text(json.dumps({k: v for k, v in doc.items() if not k.startswith("_")}, indent=1))
    try:
        check = validate_file(tmp)
        if not check["ok"]:
            raise ValueError(why + ": " + "; ".join(check["problems"]))
        tmp.replace(dst)
    finally:
        if tmp.exists():
            tmp.unlink()
    return dst, check
