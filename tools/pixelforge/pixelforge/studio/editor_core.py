"""The editors' model, with no window in it: a picture with layers, a selection, undo/redo and a list of ops.

Every editor page (cutout, skin, colour, and the small colour fixes) drives one :class:`ImageDoc`. What a person
does with the toolbar lands here as the same ops :mod:`pixelforge.skin_ops` applies headlessly, so the AI path and
the clicking path cannot drift apart, and the whole thing is testable without Tk.

    doc = ImageDoc("views/front.png")
    doc.select(doc.wand(120, 40, 0.1), "replace")       # the magic wand (Shift adds, Alt subtracts in the editor)
    doc.apply({"op": "erase", "at": [120, 40], "radius": 6})
    doc.undo(); doc.redo()
    doc.save()                                          # flattens the layers; keeps <image>.png.bak once
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .. import skin_ops
from ..color import rgb_to_oklab

UNDO_DEPTH = 40
STROKE_OPS = {"paint", "glow", "erase", "restore", "smooth", "clone", "lightness"}


def _load_rgba(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def composite(layers: list[dict]) -> np.ndarray:
    """Stack the visible layers bottom-first (normal blend, per-layer opacity)."""
    h, w = layers[0]["rgba"].shape[:2]
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for L in layers:
        if not L.get("visible", True):
            continue
        im = Image.fromarray(L["rgba"], "RGBA")
        if L.get("opacity", 1.0) < 1.0:
            a = im.split()[3].point(lambda v, o=L["opacity"]: int(v * o))
            im.putalpha(a)
        out = Image.alpha_composite(out, im)
    return np.array(out)


def wand_mask(rgba: np.ndarray, x: int, y: int, tolerance: float = 0.1, contiguous: bool = True) -> np.ndarray:
    """The magic wand: pixels whose colour is within ``tolerance`` (OKLab) of the one at (x, y); only the connected
    patch when ``contiguous``. Transparent pixels never join."""
    h, w = rgba.shape[:2]
    m = np.zeros((h, w), bool)
    if not (0 <= x < w and 0 <= y < h) or rgba[y, x, 3] == 0:
        return m
    lab = rgb_to_oklab(rgba[..., :3]).astype(np.float32)
    close = (np.linalg.norm(lab - lab[y, x], axis=-1) <= tolerance) & (rgba[..., 3] > 0)
    if not contiguous:
        return close
    from scipy import ndimage

    labels, _n = ndimage.label(close)
    return labels == labels[y, x]


def polygon_mask(shape, polygon) -> np.ndarray:
    if len(polygon) < 3:
        return np.zeros(shape[:2], bool)
    im = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(int(v) for v in p) for p in polygon], fill=255)
    return np.asarray(im) > 0


def rect_mask(shape, x0: int, y0: int, x1: int, y1: int) -> np.ndarray:
    m = np.zeros(shape[:2], bool)
    xa, xb = sorted((int(x0), int(x1)))
    ya, yb = sorted((int(y0), int(y1)))
    m[max(0, ya):max(0, yb + 1), max(0, xa):max(0, xb + 1)] = True
    return m


def outline_of(mask: np.ndarray) -> np.ndarray:
    """The one-pixel edge of a mask (for the marching outline)."""
    if mask is None or not mask.any():
        return np.zeros_like(mask) if mask is not None else None
    from scipy import ndimage

    return mask & ~ndimage.binary_erosion(mask, border_value=0)


def swatches(rgba: np.ndarray, count: int = 24) -> list[str]:
    """The picture's main colours as hex strings, for an in-window colour picker."""
    opaque = rgba[rgba[..., 3] > 0][:, :3]
    if opaque.size == 0:
        return []
    im = Image.fromarray(opaque.reshape(1, -1, 3), "RGB")
    q = im.quantize(colors=min(count, max(1, len(opaque))), method=Image.Quantize.MEDIANCUT if len(opaque) > 256 else Image.Quantize.FASTOCTREE)
    pal = q.getpalette()[: 3 * count]
    counts = sorted(q.getcolors(maxcolors=count * 4) or [], reverse=True)
    out = []
    for _n, idx in counts:
        r, g, b = pal[3 * idx:3 * idx + 3]
        hx = f"#{r:02x}{g:02x}{b:02x}"
        if hx not in out:
            out.append(hx)
    return out[:count]


class ImageDoc:
    """One picture under edit: layers, selection, undo/redo, ops, regions and the raw crop to restore from."""

    def __init__(self, path: str | Path, raw_path: str | Path | None = None):
        self.path = Path(path)
        rgba = _load_rgba(self.path)
        self.original = rgba.copy()          # as opened (the automatic cutout, or the file before this session)
        self.saved = rgba.copy()             # as last written to disk
        self.layers: list[dict] = [{"name": "base", "rgba": rgba.copy(), "visible": True, "opacity": 1.0}]
        self.active = 0
        rawp = Path(raw_path) if raw_path else self.path.with_name(self.path.stem + "_raw.png")
        self.raw_path = rawp
        self.raw: np.ndarray | None = None
        if rawp.exists():
            raw = Image.open(rawp).convert("RGBA").resize((rgba.shape[1], rgba.shape[0]), Image.LANCZOS)
            self.raw = np.array(raw)
            self.raw[..., 3] = 255
        self.regions: dict = skin_ops.load_regions(self.path)
        self.selection: np.ndarray | None = None
        self.selection_pieces: list = []     # what built the selection: {"like"/"polygon"/"rect", "mode"}
        self.clone_source: tuple[int, int] | None = None
        self.undo_stack: list = []
        self.redo_stack: list = []
        self.ops: list[dict] = []
        self.dirty = False
        self._stroke_open = False
        self.rgba = rgba

    # ----------------------------------------------------------------- basics
    @property
    def shape(self) -> tuple[int, int]:
        return self.rgba.shape[0], self.rgba.shape[1]

    def recomposite(self) -> None:
        self.rgba = composite(self.layers)

    def snapshot(self) -> dict:
        return {"layers": [{**L, "rgba": L["rgba"].copy()} for L in self.layers], "active": self.active,
                "selection": None if self.selection is None else self.selection.copy(), "ops": len(self.ops),
                "regions": json.loads(json.dumps(self.regions))}

    def _restore(self, s: dict) -> None:
        self.layers = s["layers"]
        self.active = min(s["active"], len(self.layers) - 1)
        self.selection = s["selection"]
        self.regions = s["regions"]
        del self.ops[s["ops"]:]
        self.recomposite()

    def push(self) -> None:
        self.undo_stack.append(self.snapshot())
        if len(self.undo_stack) > UNDO_DEPTH:
            self.undo_stack.pop(0)
        self.redo_stack.clear()
        self.dirty = True

    def undo(self) -> bool:
        if not self.undo_stack:
            return False
        self.redo_stack.append(self.snapshot())
        self._restore(self.undo_stack.pop())
        self._stroke_open = False
        return True

    def redo(self) -> bool:
        if not self.redo_stack:
            return False
        self.undo_stack.append(self.snapshot())
        self._restore(self.redo_stack.pop())
        return True

    def can_undo(self) -> bool:
        return bool(self.undo_stack)

    def can_redo(self) -> bool:
        return bool(self.redo_stack)

    # --------------------------------------------------------------- strokes
    def begin_stroke(self) -> None:
        """One undo step per stroke: call at the mouse press, then apply(op, stroke=True) along the drag."""
        self.push()
        self._stroke_open = True

    def end_stroke(self) -> None:
        self._stroke_open = False

    def apply(self, op: dict, stroke: bool = False) -> np.ndarray:
        """Apply one skin op on the active layer. With ``stroke`` the op joins the stroke begun with
        :meth:`begin_stroke` (no new undo step). An active selection limits every op to the selected pixels."""
        if not (stroke and self._stroke_open):
            self.push()
            self._stroke_open = False
        before = self.rgba
        after = skin_ops.apply_op(before, op, self.regions, self.raw)
        if self.selection is not None and op["op"] != "region":
            after = np.where(self.selection[..., None], after, before)
        changed = (after != before).any(axis=2)
        L = self.layers[self.active]
        if self.active == 0 and len(self.layers) == 1:
            L["rgba"] = after
        elif self.active == 0:
            L["rgba"] = np.where(changed[..., None], after, L["rgba"])
        else:
            L["rgba"][changed] = after[changed]
            if op["op"] == "erase":
                L["rgba"][changed] = 0
        self.ops.append({**op, "layer": L["name"]})
        self.recomposite()
        return changed

    # ------------------------------------------------------------- selection
    def wand(self, x: int, y: int, tolerance: float = 0.1, contiguous: bool = True) -> np.ndarray:
        return wand_mask(self.rgba, x, y, tolerance, contiguous)

    def lasso(self, polygon) -> np.ndarray:
        return polygon_mask(self.rgba.shape, polygon)

    def rect(self, x0, y0, x1, y1) -> np.ndarray:
        return rect_mask(self.rgba.shape, x0, y0, x1, y1)

    def select(self, mask: np.ndarray | None, mode: str = "replace", piece: dict | None = None) -> None:
        """Combine ``mask`` into the selection: replace (a plain click), add (Shift), subtract (Alt)."""
        if mask is None or mode == "clear":
            self.selection = None
            self.selection_pieces = []
            return
        if mode == "add" and self.selection is not None:
            self.selection = self.selection | mask
        elif mode == "subtract" and self.selection is not None:
            self.selection = self.selection & ~mask
        else:
            self.selection = mask.copy()
            self.selection_pieces = []
            mode = "replace"
        if piece is not None:
            self.selection_pieces.append({**piece, "mode": mode})
        if not self.selection.any():
            self.selection = None
            self.selection_pieces = []

    def select_all(self) -> None:
        self.select(self.rgba[..., 3] > 0, "replace", {"all": True})

    def invert_selection(self) -> None:
        if self.selection is not None:
            self.selection = ~self.selection & (self.rgba[..., 3] > 0)

    def selected_count(self) -> int:
        return 0 if self.selection is None else int(self.selection.sum())

    def name_selection(self, name: str) -> list[dict]:
        """Keep the selection as a named region (for later ops and the AI path): one region op per piece."""
        ops = []
        if self.selection is None:
            return ops
        first = True
        for piece in self.selection_pieces:
            if "polygon" in piece:
                op = {"op": "region", "name": name, "polygon": piece["polygon"]}
            elif "like" in piece:
                op = {"op": "region", "name": name, "like": piece["like"]}
            elif "rect" in piece:
                x0, y0, x1, y1 = piece["rect"]
                op = {"op": "region", "name": name, "polygon": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]}
            else:
                continue
            op["mode"] = "replace" if first else piece.get("mode", "add")
            first = False
            ops.append(op)
        if not ops:   # a selection with no replayable pieces: store its bounding polygon
            ys, xs = np.nonzero(self.selection)
            ops = [{"op": "region", "name": name, "polygon": [[int(xs.min()), int(ys.min())], [int(xs.max()), int(ys.min())],
                                                               [int(xs.max()), int(ys.max())], [int(xs.min()), int(ys.max())]]}]
        self.push()
        for op in ops:
            skin_ops.apply_op(self.rgba, op, self.regions, self.raw)
            self.ops.append(op)
        return ops

    # ---------------------------------------------------------- selection ops
    def erase_selection(self) -> None:
        if self.selection is None:
            return
        self.push()
        sel = self.selection
        L = self.layers[self.active]
        L["rgba"][sel, 3] = 0
        self.ops.append({"op": "erase", "polygon": self._bbox_polygon(sel), "layer": L["name"], "note": "selection"})
        self.recomposite()

    def restore_selection(self) -> None:
        if self.selection is None or self.raw is None:
            return
        self.push()
        sel = self.selection
        L = self.layers[self.active]
        L["rgba"][sel] = self.raw[sel]
        self.ops.append({"op": "restore", "polygon": self._bbox_polygon(sel), "layer": L["name"], "note": "selection"})
        self.recomposite()

    def fill_selection(self, color: str, opacity: float = 1.0) -> None:
        if self.selection is None:
            return
        self.push()
        sel = self.selection
        col = skin_ops._hex(color)
        L = self.layers[self.active]
        rgb = L["rgba"][sel, :3].astype(np.float32)
        L["rgba"][sel, :3] = (rgb * (1 - opacity) + col * opacity).astype(np.uint8)
        L["rgba"][sel, 3] = 255
        self.ops.append({"op": "paint", "polygon": self._bbox_polygon(sel), "color": color, "opacity": opacity, "layer": L["name"], "note": "selection"})
        self.recomposite()

    def recolor_selection(self, to: str | None, lightness: float = 0.0, chroma: float = 1.0, hue: float = 0.0) -> None:
        """Shift the selected pixels' colour by an OKLab offset (shading kept)."""
        from ..color_editor import shift_colors

        if self.selection is None:
            return
        self.push()
        sel = self.selection
        lab = rgb_to_oklab(self.rgba[..., :3]).astype(np.float32)
        src = lab[sel].mean(axis=0)
        dst = rgb_to_oklab(skin_ops._hex(to)[None, None])[0, 0].astype(np.float32) if to else None
        after = shift_colors(self.rgba, sel, src, dst, lightness, chroma, hue)
        L = self.layers[self.active]
        L["rgba"][sel] = after[sel]
        op = {"op": "recolor", "polygon": self._bbox_polygon(sel), "lightness": lightness, "chroma": chroma, "hue": hue, "layer": L["name"], "note": "selection"}
        if to:
            op["to"] = to
        self.ops.append(op)
        self.recomposite()

    @staticmethod
    def _bbox_polygon(mask: np.ndarray) -> list:
        ys, xs = np.nonzero(mask)
        return [[int(xs.min()), int(ys.min())], [int(xs.max()), int(ys.min())], [int(xs.max()), int(ys.max())], [int(xs.min()), int(ys.max())]]

    # ------------------------------------------------------------------ clone
    def clone_stroke(self, path: list, radius: int, opacity: float = 1.0, stroke: bool = True) -> None:
        if self.clone_source is None or not path:
            return
        fx, fy = self.clone_source
        tx, ty = path[0]
        self.apply({"op": "clone", "from": [int(fx), int(fy)], "to": [int(tx), int(ty)], "radius": int(radius), "opacity": float(opacity),
                    "path": [[int(px), int(py)] for px, py in path]}, stroke=stroke)

    # ----------------------------------------------------------------- layers
    def add_layer(self, name: str | None = None) -> int:
        self.push()
        self.layers.append({"name": name or f"layer {len(self.layers)}", "rgba": np.zeros_like(self.rgba), "visible": True, "opacity": 1.0})
        self.active = len(self.layers) - 1
        return self.active

    def remove_layer(self, index: int | None = None) -> None:
        i = self.active if index is None else index
        if i <= 0 or i >= len(self.layers):
            return
        self.push()
        self.layers.pop(i)
        self.active = min(self.active, len(self.layers) - 1)
        self.recomposite()

    def toggle_layer(self, index: int | None = None) -> None:
        i = self.active if index is None else index
        self.push()
        self.layers[i]["visible"] = not self.layers[i]["visible"]
        self.recomposite()

    def set_opacity(self, value: float, index: int | None = None) -> None:
        i = self.active if index is None else index
        self.layers[i]["opacity"] = float(max(0.0, min(1.0, value)))
        self.recomposite()

    def move_layer(self, delta: int) -> None:
        j = self.active + delta
        if self.active >= 1 and 1 <= j < len(self.layers):
            self.push()
            self.layers[self.active], self.layers[j] = self.layers[j], self.layers[self.active]
            self.active = j
            self.recomposite()

    def merge_down(self) -> None:
        if self.active >= 1:
            self.push()
            below = self.layers[self.active - 1]
            below["rgba"] = composite([below, self.layers[self.active]])
            self.layers.pop(self.active)
            self.active -= 1
            self.recomposite()

    def rename_layer(self, name: str, index: int | None = None) -> None:
        i = self.active if index is None else index
        self.layers[i]["name"] = name.strip() or self.layers[i]["name"]

    # ------------------------------------------------------------- whole-image
    def revert_to_original(self) -> None:
        """Back to the picture as it was opened (the cutout step's automatic result)."""
        self.push()
        self.layers = [{"name": "base", "rgba": self.original.copy(), "visible": True, "opacity": 1.0}]
        self.active = 0
        self.selection = None
        self.recomposite()

    def revert_to_saved(self) -> None:
        self.push()
        self.layers = [{"name": "base", "rgba": self.saved.copy(), "visible": True, "opacity": 1.0}]
        self.active = 0
        self.selection = None
        self.recomposite()

    def flatten(self) -> np.ndarray:
        return composite(self.layers)

    def save(self, path: str | Path | None = None, backup: bool = True) -> dict:
        """Write the flattened picture (the layers stay in the editor). The first save keeps a ``.bak``; regions and
        the ops list are written beside it (``<image>.regions.json``, ``<image>.ops.json``)."""
        dst = Path(path) if path else self.path
        flat = self.flatten()
        if backup and dst == self.path and self.path.exists():
            bak = self.path.with_suffix(self.path.suffix + ".bak")
            if not bak.exists():
                shutil.copy(self.path, bak)
        dst.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(flat, "RGBA").save(dst)
        if self.regions:
            skin_ops.regions_path(dst).write_text(json.dumps(self.regions, indent=1))
        self.saved = flat.copy()
        self.dirty = False
        return {"ok": True, "image": str(dst), "layers": len(self.layers), "ops": len(self.ops)}

    def save_ops(self, path: str | Path | None = None) -> str:
        p = Path(path) if path else self.path.with_name(self.path.stem + ".ops.json")
        p.write_text(json.dumps(self.ops, indent=1))
        return str(p)

    def swatches(self, count: int = 24) -> list[str]:
        return swatches(self.rgba, count)

    def colour_at(self, x: int, y: int) -> str | None:
        h, w = self.shape
        if not (0 <= x < w and 0 <= y < h) or self.rgba[y, x, 3] == 0:
            return None
        r, g, b = (int(v) for v in self.rgba[y, x, :3])
        return f"#{r:02x}{g:02x}{b:02x}"


class SpriteSetDoc:
    """An exported sprite set (``<kind>.json`` + sheets) with its effect attachments, for the effects editor."""

    def __init__(self, json_path: str | Path, fx_dir: str | Path):
        from .. import fx_editor as F

        self.F = F
        self.set = F.load_set(json_path)
        self.fx_dir = Path(fx_dir)
        meta = self.set["data"]["meta"]
        self.anim = "idle" if "idle" in meta["anims"] else next(iter(meta["anims"]))
        self.views = list(meta["anims"][self.anim]["views"])
        self.n_frames = int(meta["anims"][self.anim]["frames"])
        self.atts: list[dict] = list(meta.get("attachments", []))
        self.kind = meta.get("kind", "sprite")
        self.name = meta.get("name", self.kind)
        self.undo_stack: list = []
        self.redo_stack: list = []

    def frame(self, view: str, i: int = 0):
        """The frame and its ground point in frame coordinates."""
        fr, (dx, dy) = self.F.frame_of(self.set, self.anim, view, i)
        return fr, (-dx, -dy)

    def push(self) -> None:
        self.undo_stack.append(json.loads(json.dumps(self.atts)))
        if len(self.undo_stack) > UNDO_DEPTH:
            self.undo_stack.pop(0)
        self.redo_stack.clear()

    def undo(self) -> bool:
        if not self.undo_stack:
            return False
        self.redo_stack.append(json.loads(json.dumps(self.atts)))
        self.atts = self.undo_stack.pop()
        return True

    def redo(self) -> bool:
        if not self.redo_stack:
            return False
        self.undo_stack.append(json.loads(json.dumps(self.atts)))
        self.atts = self.redo_stack.pop()
        return True

    def add(self, kind: str, view: str, offset, palette: str = "wisp", scale: float = 0.5, glow: bool = True, behind: bool = False) -> int:
        self.push()
        n = sum(1 for a in self.atts if a["kind"] == kind) + 1
        name = f"{kind}_{n}"
        att = {"name": name, "kind": kind, "palette": palette, "scale": round(float(scale), 2), "glow": bool(glow), "z": "behind" if behind else "front",
               "fx": f"{self.kind}_{name}_{palette}{'_glow' if glow else ''}", "views": {view: [round(float(offset[0]), 1), round(float(offset[1]), 1)]}}
        self.atts.append(att)
        return len(self.atts) - 1

    def move(self, index: int, view: str, offset) -> None:
        self.atts[index]["views"][view] = [round(float(offset[0]), 1), round(float(offset[1]), 1)]

    def set_props(self, index: int, **props) -> None:
        att = self.atts[index]
        for k, v in props.items():
            if k == "behind":
                att["z"] = "behind" if v else "front"
            elif v is not None:
                att[k] = v
        att["fx"] = f"{self.kind}_{att['name']}_{att.get('palette', 'lantern')}{'_glow' if att.get('glow', True) else ''}"

    def copy_to_all(self, index: int, view: str) -> None:
        att = self.atts[index]
        if view in att["views"]:
            self.push()
            att["views"] = self.F.mirror_to_all(att["views"][view], view, self.views)

    def delete(self, index: int) -> None:
        if 0 <= index < len(self.atts):
            self.push()
            self.atts.pop(index)

    def preview_frames(self, view: str, pad: int = 48) -> list[np.ndarray]:
        import tempfile

        tmp = Path(tempfile.mkdtemp(prefix="pf_fx_"))
        frames = []
        for i in range(self.n_frames):
            fr, (dx, dy) = self.F.frame_of(self.set, self.anim, view, i)
            if fr is None:
                continue
            canvas = np.zeros((fr.shape[0] + 2 * pad, fr.shape[1] + 2 * pad, 4), np.uint8)
            canvas[pad:pad + fr.shape[0], pad:pad + fr.shape[1]] = fr
            frames.append(self.F.composite(canvas, (pad - dx, pad - dy), self.atts, view, tmp, i))
        return frames

    def save(self) -> dict:
        return self.F.save_attachments(self.set["path"], self.atts, self.fx_dir)
