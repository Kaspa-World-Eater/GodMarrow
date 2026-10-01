"""The skin editor: a paint-program toolbar over a sprite, atlas or cutout.

Tools (left bar): Pick (eyedropper + range recolour, from the colour editor), Brush, Glow, Erase, Restore, Smooth,
Region (click corners, double-click to close, name it). Every stroke is an op from skin_ops, so what a person does
here an AI can do with apply_ops, and the undo stack is the op list.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from . import skin_ops
from .color import rgb_to_oklab
from .color_editor import ColorEditor


class SkinEditor(ColorEditor):
    def __init__(self, master, image_path, on_save=None):
        super().__init__(master, image_path, on_save)
        from tkinter import LEFT, X, Y, IntVar, StringVar, simpledialog
        from tkinter import ttk

        self.win.title(f"Skin editor: {self.path.name}")
        self.tool = StringVar(value="pick")
        self.brush = IntVar(value=6)
        self.brush_color = "#2a2630"
        self.glow_color = "#9ff4ea"
        self.ops: list[dict] = []
        self.regions = skin_ops.load_regions(self.path)
        self.poly: list = []
        rawp = self.path.with_name(self.path.stem + "_raw.png")
        self.raw = np.array(Image.open(rawp).convert("RGBA").resize((self.rgba.shape[1], self.rgba.shape[0]), Image.LANCZOS)) if rawp.exists() else None
        self._simpledialog = simpledialog

        tools = ttk.Frame(self.win, padding=4)
        tools.pack(side=LEFT, fill=Y, before=self.canvas.master)
        ttk.Label(tools, text="Tools").pack(anchor="w")
        for key, label in (("pick", "Pick + recolour"), ("brush", "Brush"), ("glow", "Glow"), ("erase", "Erase"), ("restore", "Restore"), ("smooth", "Smooth"), ("region", "Region")):
            ttk.Radiobutton(tools, text=label, value=key, variable=self.tool).pack(anchor="w")
        ttk.Label(tools, text="Brush size").pack(anchor="w", pady=(8, 0))
        ttk.Scale(tools, from_=1, to=40, variable=self.brush, orient="horizontal", length=110).pack(anchor="w")
        ttk.Button(tools, text="Brush colour…", command=self.pick_brush_color).pack(anchor="w", pady=(8, 2))
        self.brush_swatch = ttk.Label(tools, text="      ", background=self.brush_color)
        self.brush_swatch.pack(anchor="w")
        ttk.Button(tools, text="Glow colour…", command=self.pick_glow_color).pack(anchor="w", pady=(8, 2))
        self.glow_swatch = ttk.Label(tools, text="      ", background=self.glow_color)
        self.glow_swatch.pack(anchor="w")
        ttk.Label(tools, text="Regions").pack(anchor="w", pady=(12, 0))
        self.region_list = ttk.Combobox(tools, values=sorted(self.regions), state="readonly", width=14)
        self.region_list.pack(anchor="w")
        ttk.Button(tools, text="Recolour region…", command=self.recolor_region).pack(anchor="w", pady=2)
        ttk.Button(tools, text="Save ops as JSON", command=self.save_ops).pack(anchor="w", pady=(12, 2))
        self.canvas.bind("<ButtonPress-1>", self.press)
        self.canvas.bind("<B1-Motion>", self.drag)
        self.canvas.bind("<Double-Button-1>", self.close_region)

    # ------------------------------------------------------------ tools
    def _xy(self, e):
        return int(self.canvas.canvasx(e.x) / self.zoom), int(self.canvas.canvasy(e.y) / self.zoom)

    def pick_brush_color(self) -> None:
        from tkinter import colorchooser
        _rgb, hexv = colorchooser.askcolor(parent=self.win, title="Brush colour", initialcolor=self.brush_color)
        if hexv:
            self.brush_color = hexv
            self.brush_swatch.configure(background=hexv)

    def pick_glow_color(self) -> None:
        from tkinter import colorchooser
        _rgb, hexv = colorchooser.askcolor(parent=self.win, title="Glow colour", initialcolor=self.glow_color)
        if hexv:
            self.glow_color = hexv
            self.glow_swatch.configure(background=hexv)

    def _do(self, op: dict) -> None:
        self.undo.append(self.rgba.copy())
        self.rgba = skin_ops.apply_op(self.rgba, op, self.regions, self.raw)
        self.lab = rgb_to_oklab(self.rgba[..., :3]).astype(np.float32)
        self.preview = self.rgba
        self.ops.append(op)
        self.draw()

    def press(self, e) -> None:
        t = self.tool.get()
        if t == "pick":
            self.pick(e)
            return
        x, y = self._xy(e)
        if t == "region":
            self.poly.append([x, y])
            self.draw_poly()
            return
        self.stroke(x, y, first=True)

    def drag(self, e) -> None:
        if self.tool.get() in ("pick", "region"):
            return
        x, y = self._xy(e)
        self.stroke(x, y)

    def stroke(self, x: int, y: int, first: bool = False) -> None:
        t = self.tool.get()
        r = int(self.brush.get())
        if t == "brush":
            op = {"op": "paint", "at": [x, y], "radius": r, "color": self.brush_color}
        elif t == "glow":
            op = {"op": "glow", "at": [x, y], "radius": r * 2, "color": self.glow_color, "strength": 0.5}
        elif t == "erase":
            op = {"op": "erase", "at": [x, y], "radius": r}
        elif t == "restore":
            if self.raw is None:
                self.pick_label.set("No raw crop next to this image: nothing to restore from.")
                return
            op = {"op": "restore", "at": [x, y], "radius": r}
        elif t == "smooth":
            op = {"op": "smooth", "at": [x, y], "radius": r, "sigma": 1.0}
        else:
            return
        if not first and self.ops and self.ops[-1]["op"] == op["op"]:   # one undo step per stroke
            self.rgba = skin_ops.apply_op(self.rgba, op, self.regions, self.raw)
            self.preview = self.rgba
            self.ops.append(op)
            self.draw()
        else:
            self._do(op)

    def draw_poly(self) -> None:
        self.draw()
        z = self.zoom
        for i, (x, y) in enumerate(self.poly):
            self.canvas.create_oval(x * z - 3, y * z - 3, x * z + 3, y * z + 3, outline="#4fd1c5")
            if i:
                px, py = self.poly[i - 1]
                self.canvas.create_line(px * z, py * z, x * z, y * z, fill="#4fd1c5")

    def close_region(self, e) -> None:
        if self.tool.get() != "region" or len(self.poly) < 3:
            return
        name = self._simpledialog.askstring("Region", "Name this region (e.g. eye_left, lantern, hood):", parent=self.win)
        if name:
            self._do({"op": "region", "name": name, "polygon": self.poly})
            self.region_list.configure(values=sorted(self.regions))
            self.region_list.set(name)
        self.poly = []
        self.draw()

    def recolor_region(self) -> None:
        from tkinter import colorchooser
        name = self.region_list.get()
        if not name:
            self.pick_label.set("Pick a region first (draw one with the Region tool).")
            return
        _rgb, hexv = colorchooser.askcolor(parent=self.win, title=f"New colour for {name}")
        if hexv:
            self._do({"op": "recolor", "region": name, "to": hexv})

    def apply(self) -> None:   # the pick tool's recolour becomes an op too
        if self.src is None or not self.mask.any():
            return
        op = {"op": "recolor", "at": [int(self.center[0]), int(self.center[1])], "range": round(float(self.tol.get()), 3),
              "radius": int(self.radius.get()) if self.local.get() else 0, "lightness": round(float(self.lightness.get()), 3),
              "chroma": round(float(self.chroma.get()), 3), "hue": round(float(self.hue.get()), 1)}
        if self.dst is not None:
            rgb = self.swatch2.cget("bg")
            op["to"] = rgb
        self.ops.append(op)
        super().apply()

    def save(self) -> None:
        super().save()
        if self.regions:
            skin_ops.regions_path(self.path).write_text(json.dumps(self.regions, indent=1))

    def save_ops(self) -> None:
        p = self.path.with_name(self.path.stem + ".ops.json")
        p.write_text(json.dumps(self.ops, indent=1))
        self.pick_label.set(f"Saved {len(self.ops)} op(s) to {p.name}: replayable with apply_ops / the edit_skin tool.")


def open_skin_editor(master, image_path, on_save=None) -> SkinEditor:
    return SkinEditor(master, image_path, on_save)
