"""Catch the things that went wrong on the first hero builds, automatically, at the step where they happen.

Every check returns {"ok": bool, "issues": [plain-English strings], ...numbers}. The steps attach them to their result
and to the character's notes, the Studio shows them in the log, and ``pixelforge project check <name>`` prints them.

- views (after split):   bright pockets left inside the figure, floating islands, lost dark paint vs the raw crop,
                         views whose heights disagree
- spec (after model):    loose islands in the carve, plates (cells one voxel thin in two directions), missing parts
- frames (after render): white or pale pixels inside the figure, frames where the figure's box jumps, empty frames
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


def _lab(rgb):
    from .color import rgb_to_oklab

    return rgb_to_oklab(rgb)


def check_view(rgba: np.ndarray, raw: np.ndarray | None = None) -> dict:
    from scipy import ndimage

    a = rgba[..., 3] > 127
    n_px = int(a.sum())
    out = {"ok": True, "issues": [], "opaque_px": n_px}
    if n_px == 0:
        return {"ok": False, "issues": ["the view is empty"], "opaque_px": 0}
    lab = _lab(rgba[..., :3])
    bright = a & (lab[..., 0] > 0.9) & (np.hypot(lab[..., 1], lab[..., 2]) < 0.04)
    envelope = ndimage.binary_fill_holes(ndimage.binary_closing(a, iterations=4))
    inner = ndimage.binary_erosion(envelope, iterations=3)
    pockets = bright & inner
    out["bright_inside_fraction"] = round(float(pockets.sum()) / n_px, 4)
    if out["bright_inside_fraction"] > 0.003:
        out["issues"].append(f"paper-white pockets inside the figure: {pockets.sum()} px ({100 * out['bright_inside_fraction']:.1f}%); they render as white specks")
    lab_i, n = ndimage.label(a)
    if n > 1:
        sizes = ndimage.sum(a, lab_i, range(1, n + 1))
        loose = [int(s) for s in sizes if 0.004 * n_px <= s < 0.5 * sizes.max()]   # below 0.4% the carve drops them itself
        out["islands"] = len(loose)
        if loose:
            out["issues"].append(f"{len(loose)} loose island(s) (largest {max(loose)} px) will float as separate voxels")
    if raw is not None:
        rl = _lab(raw[..., :3])
        dark = rl[..., 0] < 0.3
        lost = dark & envelope & ~a
        out["dark_lost_fraction"] = round(float(lost.sum()) / max(int((dark & envelope).sum()), 1), 4)
        if out["dark_lost_fraction"] > 0.02:
            out["issues"].append(f"dark paint dropped by the key: {100 * out['dark_lost_fraction']:.1f}% of the dark pixels inside the figure")
    out["ok"] = not out["issues"]
    return out


def check_views(views_dir: str | Path) -> dict:
    views_dir = Path(views_dir)
    res, heights = {}, {}
    for p in sorted(views_dir.glob("*.png")):
        if p.stem.endswith("_raw"):
            continue
        rgba = np.asarray(Image.open(p).convert("RGBA"))
        rawp = views_dir / f"{p.stem}_raw.png"
        raw = np.asarray(Image.open(rawp).convert("RGBA")) if rawp.exists() and Image.open(rawp).size == Image.open(p).size else None
        r = check_view(rgba, raw)
        ys = np.nonzero(rgba[..., 3] > 127)[0]
        if len(ys) and p.stem in ("front", "side", "back", "quarter"):
            heights[p.stem] = int(ys.max() - ys.min())
        res[p.stem] = r
    issues = [f"{k}: {i}" for k, r in res.items() for i in r["issues"]]
    if len(heights) >= 2 and max(heights.values()) > 1.08 * min(heights.values()):
        issues.append(f"view heights disagree ({heights}); the carve will mismatch front and side")
    return {"ok": not issues, "issues": issues, "views": res}


def check_spec(spec: dict) -> dict:
    from scipy import ndimage

    vox = np.array([[[c == "1" for c in row] for row in layer] for layer in spec["voxels"]], bool)
    out = {"ok": True, "issues": [], "voxels": int(vox.sum()), "parts": [p["kind"] for p in spec.get("parts", [])]}
    lab, n = ndimage.label(vox)
    if n > 1:
        sizes = ndimage.sum(vox, lab, range(1, n + 1))
        loose = int((sizes < 0.5 * sizes.max()).sum())
        out["islands"] = loose
        if loose:
            out["issues"].append(f"{loose} loose island(s) in the carve: they render as floating bits")
    # plates: filled cells with no filled neighbour along two of the three axes
    pad = np.pad(vox, 1)
    thin = []
    for ax in range(3):
        f = np.roll(pad, 1, axis=ax) | np.roll(pad, -1, axis=ax)
        thin.append(vox & ~f[1:-1, 1:-1, 1:-1])
    plate = (thin[0] & thin[1]) | (thin[0] & thin[2]) | (thin[1] & thin[2])
    out["plate_px"] = int(plate.sum())
    if plate.sum() > 0.01 * vox.sum():
        out["issues"].append(f"{int(plate.sum())} plate voxels (thin in two directions): they read as lines sticking out")
    out["ok"] = not out["issues"]
    return out


def check_frames(render_dir: str | Path, sample: int = 24) -> dict:
    render_dir = Path(render_dir)
    files = sorted(render_dir.glob("*/*/frame_*.png"))
    out = {"ok": True, "issues": [], "frames": len(files)}
    if not files:
        return {"ok": False, "issues": ["no frames rendered"], "frames": 0}
    step = max(1, len(files) // sample)
    whites, empties, boxes = 0, 0, []
    for p in files[::step]:
        rgba = np.asarray(Image.open(p).convert("RGBA"))
        a = rgba[..., 3] > 127
        if not a.any():
            empties += 1
            continue
        lab = _lab(rgba[..., :3])
        white = a & (lab[..., 0] > 0.92) & (np.hypot(lab[..., 1], lab[..., 2]) < 0.04)
        whites += int(white.sum())
        ys, xs = np.nonzero(a)
        boxes.append((ys.max() - ys.min(), xs.max() - xs.min()))
    out["white_px_per_frame"] = round(whites / max(len(files[::step]) - empties, 1), 1)
    if out["white_px_per_frame"] > 3:
        out["issues"].append(f"paper-white pixels inside the figure: {out['white_px_per_frame']} per frame (pockets in the cutout, or the texture's edge)")
    if empties:
        out["issues"].append(f"{empties} sampled frame(s) are empty")
    if boxes:
        hs = np.array([b[0] for b in boxes])
        if hs.max() > 1.35 * np.median(hs):
            out["issues"].append("the figure's height jumps between frames (a clip may have broken the rig)")
    out["ok"] = not out["issues"]
    return out


def check_character(project, name: str) -> dict:
    """Every check that applies to what the character has so far."""
    c = project.character(name)
    res = {"character": name, "ok": True, "issues": []}
    views = project.sub(name, "views")
    if any(views.glob("*.png")):
        res["views"] = check_views(views)
    spec = project.sub(name, "model") / f"{name}_spec.json"
    if spec.exists():
        res["spec"] = check_spec(json.loads(spec.read_text()))
    renders = project.sub(name, "renders")
    if renders.exists() and any(renders.glob("*/*/frame_*.png")):
        res["frames"] = check_frames(renders)
    for k in ("views", "spec", "frames"):
        if k in res:
            res["issues"] += [f"[{k}] {i}" for i in res[k]["issues"]]
    res["ok"] = not res["issues"]
    return res
