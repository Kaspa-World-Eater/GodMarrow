"""Painting to shapes: measure a figure's views, size a shape file from them, take its colours, compare the two.

The shape road starts from words (``shapes draft``); when a concept sheet exists the figure used to be copied by eye
over several rounds. These are the tools that read the painting instead:

* :func:`measure_views` reads the silhouette of the front (and side, back) view, cutout on a transparent or plain
  background, into widths per height band and the landmarks a humanoid is sized by (head, shoulders, chest, waist,
  hips, hem, limb widths; heights as fractions of the figure's height). ``pixelforge shapes measure``.
* :func:`apply_measurements` sizes a drafted file's rings and limbs from those numbers (``shapes draft
  --from-measure``).
* :func:`sample_materials` renders the file over the front view, finds which painted pixels each material covers and
  turns each region into a ramp with OKLab k-means (``shapes sample-materials``).
* :func:`compare` lays the painting's views and the sprite's matching directions side by side at one height, with a
  silhouette overlap number per view (``shapes compare``).

Every function returns a JSON-serialisable dict. Fractions are of the figure's total height (top 0, ground 1), so a
measurement file serves a file authored at any height.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import shapes as S
from .cleanup import remove_background_pockets, remove_islands
from .color import rgb_to_oklab
from .palette import Palette
from .shape_rig import DIRECTIONS
from .sheet import cutout, split_sheet

VIEW_DIRECTION = {"front": "S", "side": "E", "back": "N", "quarter": "SE"}
BANDS = 50                      # rows of the profile: one per 2% of the height


# ------------------------------------------------------------------------------------------------ the silhouette
def figure_rgba(image: str | Path | Image.Image, tolerance: float = 0.08) -> np.ndarray:
    """A view as RGBA with the background transparent: a transparent PNG is taken as it is; a plain background is
    flood-filled away from the border. Stray specks are dropped and the result is cropped to the figure."""
    im = Image.open(image) if not isinstance(image, Image.Image) else image
    has_alpha = im.mode in ("RGBA", "LA", "PA") or "transparency" in im.info
    rgba = np.asarray(im.convert("RGBA")).copy() if has_alpha else None
    if rgba is None or (rgba[..., 3] > 127).all():
        rgba = remove_background_pockets(cutout(im.convert("RGB"), tolerance))      # paper between the legs, under an arm
    alpha = remove_islands((rgba[..., 3] > 127).astype(np.uint8) * 255, 0.02)
    rgba[..., 3] = np.where(alpha > 0, rgba[..., 3], 0)
    ys, xs = np.nonzero(rgba[..., 3] > 127)
    if len(ys) == 0:
        raise ValueError("the view has no figure (nothing opaque after the background was removed)")
    return np.ascontiguousarray(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def _runs(row: np.ndarray) -> list[tuple[int, int]]:
    """Opaque runs [x0, x1) along one row."""
    idx = np.nonzero(row)[0]
    if len(idx) == 0:
        return []
    cuts = np.nonzero(np.diff(idx) > 1)[0]
    starts = np.concatenate([[idx[0]], idx[cuts + 1]])
    ends = np.concatenate([idx[cuts], [idx[-1]]]) + 1
    return list(zip(starts.tolist(), ends.tolist()))


def profile(mask: np.ndarray, bands: int = BANDS) -> list[dict]:
    """The silhouette as ``bands`` rows: each with its ``y`` (the band's centre, a fraction of the height), ``w`` (the
    outer width, a fraction of the height), ``runs`` (how many separate pieces the row has: two legs, an arm each
    side of the body) and ``run_w`` (the median width of a piece). Medians over the band's rows, so one stray pixel
    row does not move a landmark."""
    H = mask.shape[0]
    out = []
    for b in range(bands):
        y0, y1 = int(b * H / bands), max(int((b + 1) * H / bands), int(b * H / bands) + 1)
        ws, ns, rws = [], [], []
        for y in range(y0, min(y1, H)):
            r = _runs(mask[y])
            if not r:
                continue
            ws.append(r[-1][1] - r[0][0]); ns.append(len(r)); rws.append(float(np.median([b_ - a for a, b_ in r])))
        if not ws:
            out.append({"y": round((y0 + y1) / 2 / H, 4), "w": 0.0, "runs": 0, "run_w": 0.0})
            continue
        out.append({"y": round((y0 + y1) / 2 / H, 4), "w": round(float(np.median(ws)) / H, 4), "runs": int(round(float(np.median(ns)))),
                    "run_w": round(float(np.median(rws)) / H, 4)})
    return out


def _band(rows: list[dict], y0: float, y1: float) -> list[dict]:
    return [r for r in rows if y0 <= r["y"] <= y1 and r["w"] > 0] or [r for r in rows if r["w"] > 0]


def _at(rows: list[dict], y: float) -> dict:
    return min(rows, key=lambda r: abs(r["y"] - y))


def landmarks(front: list[dict], side: list[dict] | None = None) -> dict:
    """Where a humanoid's landmarks are on a front profile (and how deep they are on a side profile). Heights are
    fractions of the figure's height from the top; widths and depths fractions of the height too.

    head: the widest row of the top eighth (a crown or hat is part of it) and the first narrowing below it (the neck);
    shoulders: the widest row between the neck and 30%; chest: a little below; waist: the narrowest row between the
    chest and 55%; hips: the widest row below the waist to 65%; hem: the lowest row still as wide as the hips (a robe
    or skirt) or the hips themselves (trousers); leg: the width of one piece where the rows split in two; arm: the
    outer pieces where a row has three."""
    head_band = _band(front, 0.0, 0.125)
    head = max(head_band, key=lambda r: r["w"])
    below = [r for r in front if head["y"] < r["y"] <= 0.25 and r["w"] > 0]
    neck = head["y"] + 0.08
    for i in range(1, len(below) - 1):              # the first local minimum under the head: the neck
        if below[i]["w"] <= below[i - 1]["w"] and below[i]["w"] <= below[i + 1]["w"] and below[i]["w"] < head["w"] * 0.95:
            neck = below[i]["y"]
            break
    shoulder_band = _band(front, neck, 0.32)
    shoulders = max(shoulder_band, key=lambda r: r["w"])
    chest = _at(front, shoulders["y"] + 0.06)
    waist_band = _band(front, chest["y"] + 0.03, 0.56)
    waist = min(waist_band, key=lambda r: r["w"])
    hips_band = _band(front, waist["y"], 0.66)
    hips = max(hips_band, key=lambda r: r["w"])
    lower = [r for r in front if r["y"] > hips["y"] and r["w"] >= hips["w"] * 0.8 and r["runs"] <= 1]
    hem = lower[-1] if lower else hips
    leg_rows = [r for r in front if 0.68 <= r["y"] <= 0.94 and r["runs"] == 2]
    leg_w = float(np.median([r["run_w"] for r in leg_rows])) if leg_rows else (_at(front, 0.85)["w"] / 2 if _at(front, 0.85)["w"] else hips["w"] * 0.3)
    arm_rows = [r for r in front if chest["y"] <= r["y"] <= hips["y"] and r["runs"] == 3]
    arm_w = float(np.median([r["run_w"] for r in arm_rows])) if arm_rows else leg_w * 0.7

    def depth(y: float) -> float | None:
        if not side:
            return None
        r = _at(side, y)
        return r["w"] if r["w"] > 0 else None

    lm = {
        "head": {"y": head["y"], "bottom": round(neck, 4), "w": head["w"], "d": depth(head["y"])},
        "shoulders": {"y": shoulders["y"], "w": shoulders["w"], "d": depth(shoulders["y"])},
        "chest": {"y": chest["y"], "w": chest["w"], "d": depth(chest["y"])},
        "waist": {"y": waist["y"], "w": waist["w"], "d": depth(waist["y"])},
        "hips": {"y": hips["y"], "w": hips["w"], "d": depth(hips["y"])},
        "hem": {"y": hem["y"], "w": hem["w"], "d": depth(hem["y"]), "skirted": hem is not hips},
        "leg": {"w": round(leg_w, 4)},
        "arm": {"w": round(arm_w, 4)},
    }
    return lm


def measure_views(front: str | Path, side: str | Path | None = None, back: str | Path | None = None, out: str | Path | None = None,
                  tolerance: float = 0.08) -> dict:
    """Read a figure's silhouette from its views into a measurements dict (and file): the profile of each view and
    the landmarks. The views are cutouts on a transparent or plain background; the figure's height is the front
    view's. ``pixelforge shapes measure FRONT.png [SIDE.png] [BACK.png] -o M.json``."""
    views = {}
    for name, path in (("front", front), ("side", side), ("back", back)):
        if not path:
            continue
        rgba = figure_rgba(path, tolerance)
        mask = rgba[..., 3] > 127
        views[name] = {"file": str(path), "height_px": int(mask.shape[0]), "width_px": int(mask.shape[1]), "rows": profile(mask)}
    lm = landmarks(views["front"]["rows"], views["side"]["rows"] if "side" in views else None)
    m = {"what": "measurements", "height_px": views["front"]["height_px"], "views": views, "landmarks": lm,
         "note": "y, w, d are fractions of the figure's height (top 0, ground 1); pixelforge shapes draft --from-measure sizes a file from them"}
    if out:
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        Path(out).write_text(json.dumps(m, indent=1))
        m["file"] = str(out)
    return m


# ------------------------------------------------------------------------------------------------ sizing a file
def _set_radius(shape: dict, key: str, k: int, value: float) -> None:
    if key in shape and isinstance(shape[key], list) and len(shape[key]) > k:
        shape[key][k] = round(float(value), 2)


def apply_measurements(doc: dict, m: dict) -> dict:
    """Size a drafted file's head, torso, belt, skirt, cape, arms and legs from a measurements dict (as
    :func:`measure_views` writes): rings take the measured widths and depths at their height and the measured hem,
    limbs the measured limb widths. Shapes are found by the names ``shapes draft`` gives them; a file with other names
    is returned unchanged. The figure's top and ground come from the file (``height`` and ``ground``)."""
    lm = m.get("landmarks", m)
    H = float(doc.get("height", doc["size"][1]))
    ground = float(doc.get("ground", doc["size"][1] - 1))
    top = ground - H
    cx = float((doc.get("axis") or [doc["size"][0] / 2, 0])[0])
    fy = lambda f: round(top + float(f) * H, 2)
    fw = lambda f, default: round(float(f) * H, 2) if f else default
    by_name = {s.get("name", ""): s for s in doc["shapes"]}
    changed = []

    head = lm["head"]
    if "head" in by_name:
        s = by_name["head"]
        ry = max((head["bottom"] - head["y"]) * H / 2 + 1.0, 4.0)
        s["radii"] = [round(head["w"] * H / 2, 2), round(ry, 2), round(head["d"] * H / 2, 2) if head.get("d") else round(head["w"] * H / 2 * 1.08, 2)]
        s["centre"] = [cx, round(fy(head["y"]) + ry - 1.0, 2), s["centre"][2] if len(s.get("centre", [])) == 3 else 0.3]
        changed.append("head")
    if "chest" in by_name:
        s = by_name["chest"]
        chest, shoulders, hips = lm["chest"], lm["shoulders"], lm["hips"]
        rx = chest["w"] * H / 2 * 0.92            # the arms hang beside the torso in a front view; the torso is a little narrower than the row
        _set_radius(s, "radii", 0, rx)
        if chest.get("d"):
            _set_radius(s, "radii", 2, chest["d"] * H / 2)
        changed.append("chest")
    for side in ("L", "R"):
        if f"pauldron.{side}" in by_name:
            s = by_name[f"pauldron.{side}"]
            sx = 1 if side == "L" else -1
            s["centre"][0] = round(cx + sx * (lm["shoulders"]["w"] * H / 2 - s["radii"][0] * 0.85), 2)
            changed.append(f"pauldron.{side}")
        for limb, key in (("upper_arm", "arm"), ("forearm", "arm"), ("thigh", "leg"), ("shin", "leg")):
            n = f"{limb}.{side}"
            if n in by_name and lm.get(key, {}).get("w"):
                r = lm[key]["w"] * H / 2
                by_name[n]["r"] = [round(r, 2), round(r * (0.85 if limb in ("upper_arm", "thigh") else 0.8), 2)]
                changed.append(n)
    hips = lm["hips"]
    if "belt" in by_name:
        s = by_name["belt"]
        s["rx"] = fw(hips["w"] / 2, s.get("rx"))
        if hips.get("d"):
            s["rz"] = fw(hips["d"] / 2, s.get("rz"))
        changed.append("belt")
    hem = lm["hem"]
    if "skirt" in by_name:
        s = by_name["skirt"]
        y0 = fy(hips["y"]) + 2
        y1 = fy(hem["y"]) if hem.get("skirted") else fy(min(hem["y"] + 0.25, 0.92))
        y1 = max(y1, y0 + 8)
        span = max(y1 - y0, 1.0)
        r0 = hips["w"] * H / 2
        s["y"] = [round(y0, 2), round(y1, 2)]
        s["rx"] = [round(r0, 2), round((hem["w"] * H / 2 - r0) / span, 4)]
        if hips.get("d") and hem.get("d"):
            z0 = hips["d"] * H / 2
            s["rz"] = [round(z0, 2), round((hem["d"] * H / 2 - z0) / span, 4)]
        changed.append("skirt")
    if "cape" in by_name:
        s = by_name["cape"]
        s["rx"][0] = round(lm["shoulders"]["w"] * H / 2 * 0.9, 2)
        s["y"][1] = round(max(fy(hem["y"]) if hem.get("skirted") else fy(0.9), s["y"][0] + 10), 2)
        changed.append("cape")
    doc["about"] = (doc.get("about", "") + f" Sized from measurements ({', '.join(changed)}).").strip()
    doc["measured"] = {k: lm[k] for k in ("head", "shoulders", "chest", "waist", "hips", "hem", "leg", "arm") if k in lm}
    return doc


# ------------------------------------------------------------------------------------------------ the colours
def _fit_painting_to_render(paint: np.ndarray, rgba: np.ndarray) -> np.ndarray:
    """The painting resampled and placed so its figure's box covers the render's figure's box (same height, centred
    on the same column, same ground): the painting pixel under every render pixel, as RGBA on the render's canvas."""
    pm = paint[..., 3] > 127
    rm = rgba[..., 3] > 0
    pys, pxs = np.nonzero(pm); rys, rxs = np.nonzero(rm)
    ph = pys.max() - pys.min() + 1; rh = rys.max() - rys.min() + 1
    s = rh / ph
    pw = int(round(paint.shape[1] * s)); phh = int(round(paint.shape[0] * s))
    small = np.asarray(Image.fromarray(paint, "RGBA").resize((max(pw, 1), max(phh, 1)), Image.LANCZOS))
    sm = small[..., 3] > 127
    sys_, sxs = np.nonzero(sm)
    out = np.zeros_like(rgba)
    ox = int(round((rxs.min() + rxs.max()) / 2 - (sxs.min() + sxs.max()) / 2))
    oy = int(rys.max() - sys_.max())
    H, W = rgba.shape[:2]
    y0, x0 = max(0, oy), max(0, ox)
    y1, x1 = min(H, oy + small.shape[0]), min(W, ox + small.shape[1])
    if y1 > y0 and x1 > x0:
        out[y0:y1, x0:x1] = small[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    return out


def sample_materials(front: str | Path, doc: dict, out: str | Path | None = None, *, min_pixels: int = 24, height: int = 240,
                     tolerance: float = 0.08, only: list[str] | None = None) -> dict:
    """Take the painting's colours into the file's materials: the model is rendered facing the viewer at ``height``
    px over the front view (scaled to the same figure height), every render pixel knows its shape and so its
    material, the painting's pixels under each material's region are clustered with OKLab k-means into as many
    steps as the material's ramp has, sorted dark to light, and written as that material's ramp (its texture, spec
    and lift are kept). Emissive materials and materials under ``min_pixels`` of the painting are left alone.
    Writes the file to ``out`` when given. ``pixelforge shapes sample-materials FRONT.png --model X.shapes.json``."""
    if S.mode_of(doc) != "solid":
        raise ValueError("sample-materials needs a solid file")
    paint = figure_rgba(front, tolerance)
    scale = float(height) / float(doc.get("height", doc["size"][1]))
    model = S.Model(doc, scale)
    fr = model.render(0, 0.0, 0.0, None, outline=None, shade=False)
    fitted = _fit_painting_to_render(paint, fr.rgba)
    pid = fr.pid
    mats = S.build_materials(doc)
    per_mat: dict[str, list[np.ndarray]] = {}
    for p in model.prims:
        sel = (pid == p.index) & (fitted[..., 3] > 127)
        if not sel.any():
            continue
        per_mat.setdefault(p.material, []).append(fitted[sel][:, :3])
    doc.setdefault("materials", {})
    result = {"materials": {}, "skipped": []}
    for name, chunks in per_mat.items():
        if only and name not in only:
            continue
        px = np.concatenate(chunks)
        m = mats[name]
        if m.emissive:
            result["skipped"].append(f"{name}: emissive, its steps are picked by rule")
            continue
        if len(px) < min_pixels:
            result["skipped"].append(f"{name}: only {len(px)} painted pixels under it")
            continue
        n = m.steps
        pal = Palette.from_image(np.dstack([px.reshape(-1, 1, 3), np.full((len(px), 1, 1), 255, np.uint8)]), n_colors=n, accent_boost=1.0)
        ramp = S.extend_ramp(pal.colors.astype(float), n) if len(pal) != n else pal.colors.astype(float)
        spec = {k: v for k, v in m.as_dict().items() if k in ("emissive", "spec", "spec_t", "texture", "texture_strength", "lift")}
        spec = {"ramp": [S.rgbhex(c) for c in ramp], **{k: v for k, v in spec.items() if v not in (False, 0.0, "none", 0.88) or k == "spec_t" and m.spec}}
        doc["materials"][name] = spec
        result["materials"][name] = {"ramp": spec["ramp"], "pixels": int(len(px))}
    if out:
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        keep = {k: v for k, v in doc.items() if not k.startswith("_")}
        Path(out).write_text(json.dumps(keep, indent=1))
        result["file"] = str(out)
    return result


# ------------------------------------------------------------------------------------------------ side by side
def _views_of(ref: str | Path, names: list[str] | None = None, tolerance: float = 0.08) -> dict[str, np.ndarray]:
    """The painting's views by name: a sheet is split into front / side / back; one figure is the front."""
    im = Image.open(ref)
    has_alpha = im.mode in ("RGBA", "LA", "PA") or "transparency" in im.info
    if has_alpha and not (np.asarray(im.convert("RGBA"))[..., 3] > 127).all():
        rgb = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im.convert("RGBA")).convert("RGB")
    else:
        rgb = im.convert("RGB")
    views = split_sheet(rgb, names=names, tolerance=tolerance)
    if not views:
        raise ValueError(f"no figure found in {ref}")
    return {v.name: figure_rgba(v.image, tolerance) for v in views}


def compare(doc: dict, ref: str | Path, out: str | Path, *, height: int = 195, views: list[str] | None = None, elevation: float = 0.0,
            zoom: int = 1, tolerance: float = 0.08) -> dict:
    """Painting beside sprite, per view, at one height: each of the sheet's views (front, side, back) scaled to
    ``height`` px next to the file rendered facing the matching direction (S, E, N) at that height, feet on one
    line, with the silhouette overlap (intersection over union of the two masks, fitted to one box) per view. The
    painting is seen straight on, so the sprite is too (``elevation`` 0) unless told otherwise.
    ``pixelforge shapes compare X.shapes.json --ref SHEET.png -o cmp.png``."""
    paintings = _views_of(ref, views, tolerance)
    doc = {**doc, "shadow": None}                       # the painting has no ground shadow; the overlap is of the figures
    scale = float(height) / float(doc.get("height", doc["size"][1]))
    model = S.Model(doc, scale) if S.mode_of(doc) == "solid" else None
    oc = S.outline_colour(doc, "auto")
    panels, stats = [], {}
    for name, paint in paintings.items():
        d = VIEW_DIRECTION.get(name, "S")
        ph = paint.shape[0]
        pw = max(1, int(round(paint.shape[1] * height / ph)))
        small = np.asarray(Image.fromarray(paint, "RGBA").resize((pw, height), Image.LANCZOS))
        fr = S.render_still(doc, 0, scale=scale, outline="auto", phi=math.radians(DIRECTIONS[d]), elevation=elevation, model=model)
        sprite = fr.rgba
        ys, xs = np.nonzero(sprite[..., 3] > 0)
        sprite = sprite[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        iou = _iou(small[..., 3] > 127, sprite[..., 3] > 0)
        stats[name] = {"direction": d, "painting_px": [int(paint.shape[1]), int(paint.shape[0])], "sprite_px": [int(sprite.shape[1]), int(sprite.shape[0])],
                       "silhouette_iou": round(iou, 3)}
        panels.append((f"{name} / {d}  overlap {iou:.2f}", small, sprite))
    gap, label_h = 8, 14
    h = max(max(p[1].shape[0], p[2].shape[0]) for p in panels)
    widths = [p[1].shape[1] + gap + p[2].shape[1] for p in panels]
    W = sum(widths) + gap * (len(panels) + 1)
    sheet = Image.new("RGB", (W * zoom, (h + label_h + gap) * zoom), (94, 93, 98))
    x = gap
    for (label, a, b), w in zip(panels, widths):
        ImageDraw.Draw(sheet).text((x * zoom + 2, 2), label, fill=(225, 220, 205))
        for im in (a, b):
            tile = Image.fromarray(im, "RGBA").resize((im.shape[1] * zoom, im.shape[0] * zoom), Image.NEAREST)
            y = label_h + h - im.shape[0]                                   # feet on one line
            sheet.paste(tile, (x * zoom, y * zoom), tile)
            x += im.shape[1] + gap
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return {"ok": True, "out": str(out), "height": height, "views": stats, "size": list(sheet.size)}


def _iou(a: np.ndarray, b: np.ndarray) -> float:
    """Intersection over union of two masks after each is fitted to one box (the painting's and the sprite's figure
    boxes are the same height; their widths may differ, so both are placed centred)."""
    H = max(a.shape[0], b.shape[0]); W = max(a.shape[1], b.shape[1])

    def place(m):
        out = np.zeros((H, W), bool)
        y = H - m.shape[0]; x = (W - m.shape[1]) // 2
        out[y:y + m.shape[0], x:x + m.shape[1]] = m
        return out
    A, B = place(a), place(b)
    u = (A | B).sum()
    return float((A & B).sum() / u) if u else 0.0
