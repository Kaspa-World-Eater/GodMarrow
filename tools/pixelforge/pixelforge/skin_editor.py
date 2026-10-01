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
        self.layers: list[dict] = [{"name": "base", "rgba": self.rgba.copy(), "visible": True, "opacity": 1.0}]
        self.active = 0
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
        ttk.Label(tools, text="Layers").pack(anchor="w", pady=(12, 0))
        from tkinter import Listbox
        self.layer_list = Listbox(tools, height=5, width=18, exportselection=False, bg="#23272f", fg="#e8e2d2", selectbackground="#1f4a46",
                                  selectforeground="#eafff8", highlightthickness=0, relief="flat")
        self.layer_list.pack(anchor="w")
        self.layer_list.bind("<<ListboxSelect>>", lambda e: self.select_layer())
        lrow = ttk.Frame(tools)
        lrow.pack(anchor="w")
        ttk.Button(lrow, text="+", width=3, command=self.add_layer).pack(side=LEFT)
        ttk.Button(lrow, text="−", width=3, command=self.remove_layer).pack(side=LEFT)
        ttk.Button(lrow, text="👁", width=3, command=self.toggle_layer).pack(side=LEFT)
        ttk.Button(lrow, text="↑", width=3, command=lambda: self.move_layer(-1)).pack(side=LEFT)
        ttk.Button(lrow, text="↓", width=3, command=lambda: self.move_layer(1)).pack(side=LEFT)
        ttk.Button(tools, text="Merge down", command=self.merge_down).pack(anchor="w", pady=2)
        self.fill_layers()
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

    # ------------------------------------------------------------ layers
    def fill_layers(self) -> None:
        self.layer_list.delete(0, "end")
        for i, L in enumerate(reversed(self.layers)):
            self.layer_list.insert("end", ("● " if L["visible"] else "○ ") + L["name"])
        self.layer_list.selection_set(len(self.layers) - 1 - self.active)

    def select_layer(self) -> None:
        sel = self.layer_list.curselection()
        if sel:
            self.active = len(self.layers) - 1 - sel[0]

    def add_layer(self) -> None:
        self.layers.append({"name": f"layer {len(self.layers)}", "rgba": np.zeros_like(self.rgba), "visible": True, "opacity": 1.0})
        self.active = len(self.layers) - 1
        self.fill_layers()

    def remove_layer(self) -> None:
        if self.active > 0:
            self.layers.pop(self.active)
            self.active = min(self.active, len(self.layers) - 1)
            self.fill_layers(); self.recomposite()

    def toggle_layer(self) -> None:
        self.layers[self.active]["visible"] = not self.layers[self.active]["visible"]
        self.fill_layers(); self.recomposite()

    def move_layer(self, d: int) -> None:
        j = self.active + d
        if 1 <= j < len(self.layers) and self.active >= 1:
            self.layers[self.active], self.layers[j] = self.layers[j], self.layers[self.active]
            self.active = j
            self.fill_layers(); self.recomposite()

    def merge_down(self) -> None:
        if self.active >= 1:
            below = self.layers[self.active - 1]
            below["rgba"] = self.composite([below, self.layers[self.active]])
            self.layers.pop(self.active)
            self.active -= 1
            self.fill_layers(); self.recomposite()

    @staticmethod
    def composite(layers: list[dict]) -> np.ndarray:
        from PIL import Image

        out = Image.new("RGBA", (layers[0]["rgba"].shape[1], layers[0]["rgba"].shape[0]), (0, 0, 0, 0))
        for L in layers:
            if not L["visible"]:
                continue
            im = Image.fromarray(L["rgba"], "RGBA")
            if L.get("opacity", 1.0) < 1.0:
                a = im.split()[3].point(lambda v, o=L["opacity"]: int(v * o))
                im.putalpha(a)
            out = Image.alpha_composite(out, im)
        return np.array(out)

    def recomposite(self) -> None:
        self.rgba = self.composite(self.layers)
        self.lab = rgb_to_oklab(self.rgba[..., :3]).astype(np.float32)
        self.preview = self.rgba
        self.draw()

    def _do(self, op: dict) -> None:
        """An op on the active layer: applied to the composite, and the changed pixels are kept on that layer."""
        self.undo.append([{**L, "rgba": L["rgba"].copy()} for L in self.layers])
        before = self.composite(self.layers)
        after = skin_ops.apply_op(before, op, self.regions, self.raw)
        changed = (after != before).any(axis=2)
        L = self.layers[self.active]
        if self.active == 0:
            L["rgba"] = after if len(self.layers) == 1 else np.where(changed[..., None], after, L["rgba"])
        else:
            L["rgba"][changed] = after[changed]
            if op["op"] == "erase":   # erasing on a layer above the base: the layer hides what is below
                L["rgba"][changed] = 0
        op = {**op, "layer": L["name"]}
        self.ops.append(op)
        self.recomposite()

    def do_undo(self) -> None:
        if self.undo:
            state = self.undo.pop()
            if isinstance(state, list):
                self.layers = state
                self.active = min(self.active, len(self.layers) - 1)
                self.fill_layers()
                self.recomposite()
            else:
                self.rgba = state
                self.recomposite()

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
            saved = self.undo.pop() if self.undo else None
            self._do(op)
            if saved is not None:
                self.undo.pop(); self.undo.append(saved)
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
        self.src = None
        self.mask[:] = False
        self.dst = None
        self.lightness.set(0.0); self.chroma.set(1.0); self.hue.set(0.0)
        self.swatch2.configure(bg="#303030")
        self._do(op)
        self.pick_label.set("Applied. Click another colour, or Save.")

    def save(self) -> None:
        """Flatten the visible layers into the file (the layers stay in the window; the ops list records each)."""
        if self.src is not None and self.mask.any():
            self.apply()
        self.rgba = self.composite(self.layers)
        bak = self.path.with_suffix(self.path.suffix + ".bak")
        if not bak.exists():
            import shutil
            shutil.copy(self.path, bak)
        Image.fromarray(self.rgba, "RGBA").save(self.path)
        self.pick_label.set(f"Saved {self.path.name}, {len(self.layers)} layer(s) flattened (the original is kept as {bak.name}).")
        if self.on_save:
            self.on_save()
        if self.regions:
            skin_ops.regions_path(self.path).write_text(json.dumps(self.regions, indent=1))

    def save_ops(self) -> None:
        p = self.path.with_name(self.path.stem + ".ops.json")
        p.write_text(json.dumps(self.ops, indent=1))
        self.pick_label.set(f"Saved {len(self.ops)} op(s) to {p.name}: replayable with apply_ops / the edit_skin tool.")


def open_skin_editor(master, image_path, on_save=None) -> SkinEditor:
    return SkinEditor(master, image_path, on_save)
