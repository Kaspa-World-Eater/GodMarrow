"""The detail layer: painted textures that ride the parts (``tools/pixelforge/docs/FROM_THE_GAME.md`` 3.1).

A part's texture is a small grid of ramp-step offsets in the part's own surface coordinates (u around the shape's
long axis, the front at the middle; v along it from the top), read by the renderer per pixel in every frame and
direction (:meth:`pixelforge.shapes.Model.detail_steps`). This module makes and keeps them:

* **stock textures per material class** (``face skin cloth wood bandage metal hair``): a brow, sockets, a nose ridge
  and cheekbones scaled to the head; the breastbone, the pectorals' edge, the belly's bands, the spine and the
  shoulder blades, the light down a limb; hanging and wrapped folds with a ragged hem; wood grain with bleeding nail
  holes; the wraps of bandages and leg-cloth; worn edges and rivets on iron; the strands of hair and locs. The class
  comes from the material's ``detail`` key (``assets/shapes/materials.json``) or, failing that, its name; a head
  of skin is a face.
* **the file operations** behind ``pixelforge shapes detail``: ``--stock`` fills every part that has no texture,
  ``--part NAME --from PNG`` sets one from a painted PNG, ``--clear`` drops them, ``--list`` is what the Detail bench
  reads. Textures are PNGs beside the shape file (``<name>.detail/<part>.png``, grey: 128 is no change, 32 per step,
  0 a run seed) referenced from the file's ``detail`` map.
* **the compare picture**: the painting | the flat render | the detailed render | detailed with the light and ink.

Everything here is numpy on small grids; nothing touches a colour (offsets only), so the sprite's palette never grows.
"""
from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from . import shapes as S

SEED = S.DETAIL_SEED
NAME_CLASSES = (                       # material name words -> class, when the material carries no "detail" key
    (("skin", "flesh"), "skin"),
    (("loc", "hair", "beard", "fur", "mane"), "hair"),
    (("bandage", "legwrap", "wrap", "gauze"), "bandage"),
    (("plank", "wood", "timber", "board"), "wood"),
    (("iron", "steel", "chain", "gold", "lacquer", "bronze", "metal", "brass", "silver"), "metal"),
    (("cloth", "mantle", "cape", "robe", "tunic", "tabard", "rag", "violet", "sash", "veil", "linen", "wool", "silk", "cowl", "hood", "crimson"), "cloth"),
)
FACE_PARTS = ("head", "skull", "face")
TORSO_PARTS = ("chest", "torso", "belly", "waist", "abdomen", "back")
WRAPPED_PARTS = ("cowl", "mantle", "shawl", "scarf", "hood", "turban", "veil", "neck")


# ---------------------------------------------------------------------------------------------- classes and sizes
def material_class(name: str, spec: dict | None = None) -> str:
    """The stock class of a material: its ``detail`` key, else the first word of its name that names a class."""
    if spec and spec.get("detail") not in (None, "", "none"):
        return str(spec["detail"])
    low = name.lower()
    for words, cls in NAME_CLASSES:
        if any(w in low for w in words):
            return cls
    return "none"


def part_class(part: dict, mat_class: str) -> str:
    """What a part gets: a head of skin is a face; the class otherwise."""
    name = part["name"].lower().split("#")[0]
    if mat_class == "skin" and any(name.startswith(w) for w in FACE_PARTS):
        return "face"
    return mat_class


def part_extent(doc: dict, part: dict) -> tuple[float, float]:
    """A part's size in file units: (its girth, roughly the circumference of its widest shape; its length along the
    long axis), from the shapes' boxes."""
    axis = tuple(doc.get("axis", [doc["size"][0] / 2, 0.0]))
    girth, length = 0.0, 0.0
    for i in part["shapes"]:
        try:
            p = S.Prim(doc["shapes"][i], i, axis)
            lo, hi = p.bbox
        except Exception:  # noqa: BLE001  (a flat shape or a bad one: no size)
            continue
        ext = hi - lo
        k = int(np.argmax(ext))
        others = [float(ext[j]) for j in range(3) if j != k]
        girth = max(girth, math.pi * (others[0] + others[1]) / 2)
        length = max(length, float(ext[k]))
    return girth, length


def texture_size(doc: dict, part: dict, px_height: float = 195.0) -> tuple[int, int]:
    """(W, H) of a part's texture: about one texel per rendered pixel at the game's height, 8..96 each way."""
    girth, length = part_extent(doc, part)
    scale = px_height / float(doc.get("height", doc["size"][1]))
    w = int(np.clip(round(girth * scale), 8, 96))
    h = int(np.clip(round(length * scale), 8, 96))
    return w, h


# ---------------------------------------------------------------------------------------------- stock generators
def _blank(w: int, h: int) -> np.ndarray:
    return np.zeros((h, w), np.int8)


def _rng(part_name: str, salt: int = 0):
    return np.random.default_rng(sum(ord(c) * (i + 1) for i, c in enumerate(part_name)) * 31 + salt)


def _stamp(t: np.ndarray, u: float, v: float, val: int, ru: float = 0.0, rv: float = 0.0) -> None:
    """Set the texels within an ellipse of radii (ru, rv) in texture fractions about (u, v); a point when both are 0."""
    h, w = t.shape
    cx, cy = u * w, v * h
    rx, ry = max(ru * w, 0.5), max(rv * h, 0.5)
    yy, xx = np.mgrid[0:h, 0:w]
    m = ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1
    t[m] = val


def _line(t: np.ndarray, u0: float, v0: float, u1: float, v1: float, val: int) -> None:
    h, w = t.shape
    n = int(max(abs(u1 - u0) * w, abs(v1 - v0) * h, 1)) * 2 + 1
    for k in range(n):
        f = k / max(n - 1, 1)
        x = int(np.clip((u0 + (u1 - u0) * f) * w, 0, w - 1)); y = int(np.clip((v0 + (v1 - v0) * f) * h, 0, h - 1))
        t[y, x] = val


def stock_face(w: int, h: int, name: str = "head") -> np.ndarray:
    """Brow (a lit ridge over each eye), sockets (two steps down with a cold point), the nose's ridge and the
    shadow under it, cheekbones and the mouth's line, in the front half of the head; the back is left plain."""
    t = _blank(w, h)
    ey = 0.44
    for e in (-1, 1):
        ex = 0.5 + e * 0.08
        _stamp(t, ex, ey - 0.075, 2, 0.06, 0.025)         # the brow ridge, lit
        _stamp(t, ex, ey - 0.03, -1, 0.06, 0.012)          # the shade under the brow
        _stamp(t, ex, ey + 0.01, -3, 0.035, 0.035)         # the socket
        _stamp(t, ex + e * 0.06, ey + 0.09, 1, 0.025, 0.025)   # the cheekbone, below and outside the eye
        _stamp(t, ex + e * 0.03, ey + 0.13, -1, 0.03, 0.012)   # the hollow under it
    _line(t, 0.5, ey - 0.03, 0.5, ey + 0.1, 2)             # the nose's ridge
    _line(t, 0.53, ey + 0.02, 0.53, ey + 0.1, -1)          # its shaded side
    _stamp(t, 0.51, ey + 0.13, -2, 0.03, 0.015)            # the shadow under it
    _line(t, 0.46, ey + 0.2, 0.54, ey + 0.2, -2)            # the mouth
    return t


def stock_skin(w: int, h: int, name: str = "") -> np.ndarray:
    """Muscle: the breastbone and the pectorals' lower edge on a chest (front), the spine and shoulder blades on
    its back; the belly's bands on a waist; on a limb the light down its upper-left side and the shade down the far
    side."""
    t = _blank(w, h)
    low = name.lower()
    if low.startswith(("chest", "torso")):
        _line(t, 0.5, 0.15, 0.5, 0.9, -1)                   # the breastbone
        for du in np.linspace(-0.2, 0.2, max(3, w // 4)):
            v = 0.55 - (du / 0.2) ** 2 * 0.12
            _stamp(t, 0.5 + du, v, -1); _stamp(t, 0.5 + du, v - 0.06, 1)   # the pectorals' edge, lit above
        _line(t, 0.0, 0.15, 0.0, 0.9, -1)                   # the spine (u = 0 / 1 is the back)
        for e in (-1, 1):
            _line(t, (0.5 + e * 0.12) % 1.0 + (0.5 if e < 0 else -0.5), 0.3, (0.5 + e * 0.12) % 1.0 + (0.5 if e < 0 else -0.5), 0.5, 1)
    elif low.startswith(("waist", "belly", "abdomen")):
        _line(t, 0.5, 0.1, 0.5, 0.9, -1)
        for v in (0.3, 0.62):
            _line(t, 0.3, v, 0.7, v, -1); _line(t, 0.3, v - 0.07, 0.7, v - 0.07, 1)
    else:                                                  # a limb, a hand, a foot: light along it
        for du in (0.33, 0.36, 0.39):
            _line(t, du, 0.02, du, 0.98, 1)
        for du in (0.7, 0.74):
            _line(t, du, 0.02, du, 0.98, -1)
    return t


def stock_cloth(w: int, h: int, name: str = "", runs: bool = False) -> np.ndarray:
    """Folds: hanging ones run down the cloth (a dark fold, a lit crest, every six texels, wandering a little);
    wrapped cloth (a cowl, a mantle, a shawl) gets folds wound round it, slanting; the hem's last rows ragged and
    dark. With ``runs`` a few seeds near the top start blood runs."""
    t = _blank(w, h)
    yy, xx = np.mgrid[0:h, 0:w]
    wrapped = any(name.lower().startswith(p) for p in WRAPPED_PARTS)
    period = int(np.clip(w // 6, 5, 14))
    if wrapped:
        q = yy + 0.6 * xx
        period = int(np.clip(h // 4, 4, 10))
    else:
        q = xx + np.round(np.sin(yy * 0.18 + xx * 0.9) * 1.0)
    ph = np.floor(q).astype(int) % period
    t[ph == 0] = -1                                       # the fold's shadow
    t[ph == 1] = 1                                        # its lit crest beside it
    rng = _rng(name, 1)
    bottom = max(1, h // 10)
    for x in range(w):
        d = int(rng.integers(0, bottom + 1))
        if d:
            t[h - d:, x] = -2
    if runs:
        for x in rng.choice(w, size=max(1, w // 8), replace=False):
            t[int(rng.integers(0, max(1, h // 4))), x] = SEED
    return t


def stock_wood(w: int, h: int, name: str = "", runs: bool = True) -> np.ndarray:
    """Grain running down the board (a dark line and a lit line every four texels, wandering), a darker seam at the
    edges, and nail holes at a quarter and six tenths of the length: a seed (the run) with a lit rim above."""
    t = _blank(w, h)
    yy, xx = np.mgrid[0:h, 0:w]
    q = xx + np.round(0.5 * np.sin(yy * 0.12 + xx * 2.1))
    ph = np.floor(q).astype(int) % 5
    t[ph == 0] = -1
    t[(ph == 2) & (yy % 3 != 0)] = 1
    t[:, 0] = -1; t[:, -1] = -1
    for v in (0.25, 0.6):
        y = int(v * h); x = w // 2
        t[max(y - 1, 0), x] = 1
        t[y, x] = SEED if runs else -3
        if x + 1 < w:
            t[y, x + 1] = -3
    return t


def stock_bandage(w: int, h: int, name: str = "", runs: bool = False) -> np.ndarray:
    """Wraps: a stripe every three texels, wound round with a slant (dark seam, lit edge). With ``runs`` a few seeds
    on the seams start blood runs (a soaked wrap)."""
    t = _blank(w, h)
    yy, xx = np.mgrid[0:h, 0:w]
    slant = -0.2 if "leg" in name.lower() or name.lower().startswith(("thigh", "shin")) else 0.35
    ph = np.floor(yy + slant * xx).astype(int) % 3
    t[ph == 0] = -1
    t[ph == 1] = 1
    if runs:
        rng = _rng(name, 4)
        for x in rng.choice(w, size=max(2, w // 3), replace=False):
            t[int(rng.integers(0, max(1, h * 3 // 4))), x] = SEED
    return t


def stock_metal(w: int, h: int, name: str = "") -> np.ndarray:
    """Worn edges (a lit top edge, a dark bottom edge), a row of rivets along the top with a shadow under each, and
    a few scratches."""
    t = _blank(w, h)
    t[0, :] = 1
    t[-1, :] = -1
    rng = _rng(name, 2)
    if w >= 12 and h >= 6:
        for x in range(w // 6, w, max(w // 6, 3)):
            y = min(2, h - 2)
            t[y, x] = 2; t[y + 1, x] = -1
    for _ in range(max(1, (w * h) // 40)):
        y = int(rng.integers(1, h - 1)); x = int(rng.integers(0, w)); ln = int(rng.integers(1, 4))
        t[y, x:min(w, x + ln)] = -1
    return t


def stock_hair(w: int, h: int, name: str = "") -> np.ndarray:
    """Strands: a lit line and a dark line every three texels down the length, each strand wandering a little."""
    t = _blank(w, h)
    yy, xx = np.mgrid[0:h, 0:w]
    q = xx + np.round(0.5 * np.sin(yy * 0.5 + xx * 1.7))
    ph = np.floor(q).astype(int) % 3
    t[ph == 0] = 1
    t[ph == 2] = -1
    return t


GENERATORS = {"face": stock_face, "skin": stock_skin, "cloth": stock_cloth, "wood": stock_wood, "bandage": stock_bandage,
              "metal": stock_metal, "hair": stock_hair}


def stock_texture(doc: dict, part: dict, library: dict | None = None, px_height: float = 195.0) -> tuple[np.ndarray | None, str]:
    """The stock texture for a part (None when its class has none) and the class it got."""
    lib = dict(library if library is not None else S.load_library())
    lib.update(doc.get("materials") or {})
    mspec = lib.get(part["material"], {})
    cls = part_class(part, material_class(part["material"], mspec))
    if cls not in GENERATORS:
        return None, cls
    w, h = texture_size(doc, part, px_height)
    gen = GENERATORS[cls]
    runs = bool(mspec.get("runs"))
    if cls in ("cloth", "wood", "bandage"):
        return gen(w, h, part["name"], runs=runs), cls
    return gen(w, h, part["name"]), cls


# ---------------------------------------------------------------------------------------------- the file operations
def _save_doc(doc: dict, path: Path) -> None:
    out = {k: v for k, v in doc.items() if not k.startswith("_")}
    path.write_text(json.dumps(out, indent=1) + "\n", encoding="utf-8")


def _write_png(tex: np.ndarray, path: Path) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(S.encode_detail(tex), "L").save(path)
    return str(path)


def read_png(path: str | Path) -> np.ndarray:
    im = Image.open(path)
    return S.decode_detail(np.asarray(im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("L")))


def set_part(doc: dict, name: str, tex: np.ndarray, *, save: bool = True) -> dict:
    """Give part ``name`` the texture ``tex`` (int8 offsets): written as ``<name>.detail/<part>.png`` beside the
    shape file and referenced from the file's ``detail`` map (saved unless ``save`` is False)."""
    names = {e["name"] for e in S.part_table(doc)[0]}
    if name not in names:
        raise ValueError(f"{name!r} is not a part of this file; parts: {', '.join(sorted(names))}")
    d = S.detail_dir(doc)
    if d is None:
        raise ValueError("the shape file has no path to write the texture beside")
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in name)
    png = d / f"{safe}.png"
    _write_png(np.asarray(tex, np.int8), png)
    doc.setdefault("detail", {})[name] = {"file": f"{d.name}/{png.name}"}
    if save:
        _save_doc(doc, Path(doc["_file"]))
    return {"part": name, "file": doc["detail"][name]["file"], "png": str(png), "size": [int(tex.shape[1]), int(tex.shape[0])]}


def clear(doc: dict, part: str | None = None, *, save: bool = True) -> dict:
    """Drop every texture (or one part's): the map entry and its PNG."""
    det = doc.get("detail") or {}
    d = S.detail_dir(doc)
    names = [part] if part else list(det)
    dropped = []
    for n in names:
        entry = det.pop(n, None)
        if entry and entry.get("file") and d is not None:
            f = Path(doc["_file"]).parent / entry["file"]
            if f.exists():
                f.unlink()
            dropped.append(n)
        elif entry:
            dropped.append(n)
    if not det:
        doc.pop("detail", None)
    if d is not None and d.exists() and not any(d.iterdir()):
        d.rmdir()
    if save and doc.get("_file"):
        _save_doc(doc, Path(doc["_file"]))
    return {"cleared": dropped}


def stock(doc: dict, *, only: list[str] | None = None, replace: bool = False, library: dict | None = None, px_height: float = 195.0,
          save: bool = True) -> dict:
    """Fill every part that has no texture (or the parts in ``only``; ``replace`` redoes ones that have) with its
    material's stock detail. Returns what was written per part and the parts whose class has no stock."""
    det = doc.get("detail") or {}
    written, skipped = {}, []
    for part in S.part_table(doc)[0]:
        name = part["name"]
        if only and name not in only:
            continue
        if name in det and not replace:
            continue
        tex, cls = stock_texture(doc, part, library, px_height)
        if tex is None:
            skipped.append({"part": name, "material": part["material"], "class": cls})
            continue
        r = set_part(doc, name, tex, save=False)
        r["class"] = cls
        written[name] = r
    if save and doc.get("_file"):
        _save_doc(doc, Path(doc["_file"]))
    return {"written": written, "skipped": skipped, "count": len(written)}


def listing(doc: dict, library: dict | None = None, px_height: float = 195.0) -> dict:
    """What the Detail bench reads: every part with its material, class, ramp, the natural texture size, and the
    texture's PNG when it has one (``rows`` for an inline one)."""
    lib = dict(library if library is not None else S.load_library())
    lib.update(doc.get("materials") or {})
    det = doc.get("detail") or {}
    base = Path(doc["_file"]).parent if doc.get("_file") else None
    mats = S.build_materials(doc, None, library)
    parts = []
    for part in S.part_table(doc)[0]:
        mspec = lib.get(part["material"], {})
        cls = part_class(part, material_class(part["material"], mspec))
        entry = det.get(part["name"]) or {}
        row = {"name": part["name"], "index": part["index"], "material": part["material"], "group": part["group"], "class": cls,
               "shapes": part["shapes"], "size": list(texture_size(doc, part, px_height)),
               "ramp": [S.rgbhex(c) for c in mats[part["material"]].ramp] if part["material"] in mats else [],
               "png": None, "rows": None, "stock": cls in GENERATORS}
        if entry.get("file") and base is not None:
            f = base / entry["file"]
            row["png"] = str(f) if f.exists() else None
        elif entry.get("rows"):
            row["rows"] = entry["rows"]
        parts.append(row)
    return {"ok": True, "file": doc.get("_file"), "dir": str(S.detail_dir(doc)) if S.detail_dir(doc) else None, "parts": parts,
            "seed": SEED, "max": S.DETAIL_MAX, "classes": list(GENERATORS)}


def detail_command(path: str | Path, *, stock_all: bool = False, part: str | None = None, from_png: str | Path | None = None,
                   clear_all: bool = False, replace: bool = False, list_only: bool = False, library: dict | None = None) -> dict:
    """``pixelforge shapes detail FILE [--stock] [--part NAME [--from PNG | --stock]] [--clear] [--list]`` as one call."""
    try:
        return _detail_command(path, stock_all=stock_all, part=part, from_png=from_png, clear_all=clear_all, replace=replace, list_only=list_only, library=library)
    except (ValueError, OSError) as e:
        return {"ok": False, "file": str(path), "error": str(e)}


def _detail_command(path, *, stock_all, part, from_png, clear_all, replace, list_only, library) -> dict:
    doc = S.load_shapes(path)
    problems = S.validate(doc, library)
    problems = [p for p in problems if not p.startswith("detail ")]      # a missing texture file is what --stock or --from fixes
    if problems:
        return {"ok": False, "file": str(path), "error": "the file has problems: " + "; ".join(problems)}
    if list_only:
        return listing(doc, library)
    if clear_all:
        r = clear(doc, part)
        return {"ok": True, "file": str(path), **r}
    if part and from_png:
        r = set_part(doc, part, read_png(from_png))
        return {"ok": True, "file": str(path), **r}
    if part and stock_all:
        r = stock(doc, only=[part], replace=True, library=library)
        return {"ok": True, "file": str(path), **r}
    if stock_all:
        r = stock(doc, replace=replace, library=library)
        return {"ok": True, "file": str(path), **r}
    return listing(doc, library)


# ---------------------------------------------------------------------------------------------- the compare picture
def compare_picture(painting: str | Path | None, flat_doc: dict, detail_doc: dict, out: str | Path, *, style: str | None = None,
                    direction: str = "S", height: int = 195, zoom: int = 2) -> dict:
    """Painting | flat render | detailed render | detailed with the light and ink, at one height, with labels."""
    from . import shape_rig as R, shape_tools as T
    from .styles import get_style

    style = style or T.default_style_for(detail_doc) or "godmarrow"
    st = get_style(style)
    phi = math.radians(R.DIRECTIONS[direction])
    panels: list[tuple[str, Image.Image]] = []
    if painting and Path(painting).exists():
        im = Image.open(painting).convert("RGBA")
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        if im.width > im.height * 1.2:                 # a sheet: the first view (the front)
            im = im.crop((0, 0, im.width // 3, im.height))
        im = im.resize((max(1, int(im.width * height / im.height)), height), Image.LANCZOS)
        panels.append(("the painting", im))
    for label, doc, look in (("flat", flat_doc, None), ("detail", detail_doc, None), ("detail + light", detail_doc, {k: True for k in S.LOOK_KEYS})):
        opt = T.options_for(doc, st)
        fr = S.render_still(doc, scale=opt["scale"], steps=opt["steps"], outline=opt["outline"], phi=phi, look=look)
        im = Image.fromarray(fr.rgba, "RGBA")
        bb = im.getbbox()
        im = im.crop(bb) if bb else im
        panels.append((label, im))
    pad, label_h = 8, 14
    w = sum(p.width * zoom for _, p in panels) + pad * (len(panels) + 1)
    h = max(p.height * zoom for _, p in panels) + label_h + pad * 2
    sheet = Image.new("RGBA", (w, h), (94, 93, 98, 255))
    from PIL import ImageDraw
    d = ImageDraw.Draw(sheet)
    x = pad
    for label, p in panels:
        big = p.resize((p.width * zoom, p.height * zoom), Image.NEAREST)
        sheet.alpha_composite(big, (x, label_h + pad + (h - label_h - pad * 2 - big.height)))
        d.text((x + 2, 2), label, fill=(225, 220, 205, 255))
        x += big.width + pad
    out = Path(out); out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return {"ok": True, "png": str(out), "panels": [l for l, _ in panels], "size": [w, h]}
