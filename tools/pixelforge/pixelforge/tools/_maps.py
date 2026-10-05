"""Maps from Tiled (.tmj / .json) and LDtk (.ldtk) as one plain layout the game side can load without either program:

    {"source": ..., "tool": "tiled" | "ldtk", "size": [w, h] (cells), "tile": [tw, th], "orientation": "orthogonal" | "isometric" | ...,
     "tilesets": [{"name", "firstgid", "image", "columns", "tile": [tw, th]}],
     "layers": [{"name", "kind": "tiles" | "intgrid" | "auto", "size": [w, h], "cells": [[gid | 0 ...] per row]}],
     "objects": [{"name", "type", "x", "y", "width", "height", "properties": {...}}]}

Godot 4 has free importers that take the files straight (YATI for Tiled, godot-ldtk-importer for LDtk, both MIT); this
layout is for the Forge's own placement data and for a game that wants one JSON to read.
"""

from __future__ import annotations

import json
from pathlib import Path


def _props(lst) -> dict:
    out = {}
    for p in lst or []:
        if isinstance(p, dict) and "name" in p:
            out[str(p["name"])] = p.get("value")
    return out


def from_tiled(path: str | Path) -> dict:
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    w, h = int(d.get("width", 0)), int(d.get("height", 0))
    tw, th = int(d.get("tilewidth", 0)), int(d.get("tileheight", 0))
    tilesets = [{"name": str(t.get("name", "")), "firstgid": int(t.get("firstgid", 1)), "image": str(t.get("image", t.get("source", ""))),
                 "columns": int(t.get("columns", 0)), "tile": [int(t.get("tilewidth", tw)), int(t.get("tileheight", th))]} for t in d.get("tilesets", [])]
    layers, objects = [], []

    def walk(ls):
        for l in ls or []:
            kind = str(l.get("type", ""))
            if kind == "group":
                walk(l.get("layers", []))
            elif kind == "tilelayer":
                data = l.get("data", [])
                lw, lh = int(l.get("width", w)), int(l.get("height", h))
                if isinstance(data, list) and data and isinstance(data[0], int):
                    cells = [[int(g) & 0x0FFFFFFF for g in data[r * lw:(r + 1) * lw]] for r in range(lh)]
                else:
                    cells = []    # compressed or chunked data is left to the real importer
                layers.append({"name": str(l.get("name", "")), "kind": "tiles", "size": [lw, lh], "cells": cells, "visible": bool(l.get("visible", True))})
            elif kind == "objectgroup":
                for o in l.get("objects", []):
                    objects.append({"name": str(o.get("name", "")), "type": str(o.get("type", o.get("class", ""))), "x": float(o.get("x", 0)), "y": float(o.get("y", 0)),
                                    "width": float(o.get("width", 0)), "height": float(o.get("height", 0)), "layer": str(l.get("name", "")), "properties": _props(o.get("properties"))})
    walk(d.get("layers", []))
    return {"source": str(path), "tool": "tiled", "size": [w, h], "tile": [tw, th], "orientation": str(d.get("orientation", "orthogonal")),
            "tilesets": tilesets, "layers": layers, "objects": objects, "properties": _props(d.get("properties"))}


def from_ldtk(path: str | Path, level: str | int | None = None) -> dict:
    d = json.loads(Path(path).read_text(encoding="utf-8"))
    levels = d.get("levels", [])
    if not levels:
        raise ValueError("the LDtk file has no levels")
    lv = levels[0]
    if level is not None:
        for i, l in enumerate(levels):
            if l.get("identifier") == level or i == level or l.get("iid") == level:
                lv = l
    grid = int(d.get("defaultGridSize", 16))
    tilesets = [{"name": str(t.get("identifier", "")), "firstgid": int(t.get("uid", 0)), "image": str(t.get("relPath") or ""), "columns": int(t.get("__cWid", 0)),
                 "tile": [int(t.get("tileGridSize", grid))] * 2} for t in d.get("defs", {}).get("tilesets", [])]
    layers, objects = [], []
    for li in lv.get("layerInstances", []) or []:
        kind = str(li.get("__type", ""))
        cw, ch, g = int(li.get("__cWid", 0)), int(li.get("__cHei", 0)), int(li.get("__gridSize", grid))
        if kind == "Entities":
            for e in li.get("entityInstances", []):
                px = e.get("px", [0, 0])
                objects.append({"name": str(e.get("__identifier", "")), "type": str(e.get("__identifier", "")), "x": float(px[0]), "y": float(px[1]),
                                "width": float(e.get("width", g)), "height": float(e.get("height", g)), "layer": str(li.get("__identifier", "")),
                                "properties": {str(f.get("__identifier", "")): f.get("__value") for f in e.get("fieldInstances", [])}})
            continue
        cells = [[0] * cw for _ in range(ch)]
        if kind == "IntGrid" and li.get("intGridCsv"):
            csv = li["intGridCsv"]
            cells = [[int(v) for v in csv[r * cw:(r + 1) * cw]] for r in range(ch)]
        tiles = li.get("gridTiles") or li.get("autoLayerTiles") or []
        for t in tiles:
            px = t.get("px", [0, 0])
            cx, cy = int(px[0]) // g, int(px[1]) // g
            if 0 <= cy < ch and 0 <= cx < cw:
                cells[cy][cx] = int(t.get("t", 0)) + 1       # 0 stays empty; tile ids are 1-based like gids
        layers.append({"name": str(li.get("__identifier", "")), "kind": {"IntGrid": "intgrid", "Tiles": "tiles", "AutoLayer": "auto"}.get(kind, kind.lower()),
                       "size": [cw, ch], "cells": cells, "visible": bool(li.get("visible", True)), "tileset": li.get("__tilesetDefUid")})
    return {"source": str(path), "tool": "ldtk", "level": str(lv.get("identifier", "")), "size": [int(lv.get("pxWid", 0)) // grid, int(lv.get("pxHei", 0)) // grid],
            "tile": [grid, grid], "orientation": "orthogonal", "tilesets": tilesets, "layers": layers, "objects": objects,
            "properties": {str(f.get("__identifier", "")): f.get("__value") for f in lv.get("fieldInstances", [])}}


def write(layout: dict, out: str | Path) -> str:
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(layout, indent=1), encoding="utf-8")
    return str(out)
