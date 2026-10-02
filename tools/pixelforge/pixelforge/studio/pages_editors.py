"""The picture editors as pages: Cutout, Skin and Colour. One toolbar on the left (Photoshop-style tool choice),
the chosen tool's options along the top, the picture in the middle at any zoom, layers / colours / regions on the
right, Undo / Redo / before-after / Save at hand. Every stroke is a skin op an AI can replay (Save ops as JSON).

Shift+click adds to the selection, Alt+click takes away; a plain click starts over. With a selection, every tool
works only inside it. The Clone brush takes its source from Alt+click.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from . import theme as T
from .app import Page
from .editor_core import ImageDoc, outline_of
from .widgets import ColourPicker, LabeledScale, Note, ScrollFrame, Toolbar, Tooltip, ZoomCanvas, tk

SEL = np.array([79, 209, 197, 255], np.uint8)
TOOL_NAMES = {"erase": "Erase", "restore": "Restore", "magic": "Magic erase", "wand": "Magic wand", "lasso": "Lasso", "rect": "Rectangle",
              "clone": "Clone brush", "smooth": "Smooth", "pick": "Pick + recolour", "brush": "Brush", "glow": "Glow", "light": "Lightness",
              "dropper": "Eyedropper"}
SHIFT = 0x0001
ALT = 0x0008 | 0x0080 | 0x20000


def _mods(e) -> str:
    s = int(getattr(e, "state", 0) or 0)
    if s & SHIFT:
        return "add"
    if s & ALT:
        return "subtract"
    return "replace"


def _line(a, b, spacing: float):
    """Points from a to b every ``spacing`` pixels (so a fast drag still paints a continuous stroke)."""
    (x0, y0), (x1, y1) = a, b
    d = max(abs(x1 - x0), abs(y1 - y0))
    n = max(1, int(d / max(spacing, 1)))
    return [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(1, n + 1)]


class EditorPage(Page):
    """What the three editors share: the frame, the canvas, the doc, zoom, undo/redo, save, selection drawing."""

    TOOLS: list[tuple[str, str, str]] = []
    checkerboard = True

    def __init__(self, app):
        super().__init__(app)
        self.doc: ImageDoc | None = None
        self.path: Path | None = None
        self.tool = ""
        self.poly: list = []
        self.rect0 = None
        self.last = None
        self.show_before = False
        self.on_save = None
        self._marching = None

    # ------------------------------------------------------------- building
    def build(self) -> None:
        t = tk()
        f = self.frame
        # row 1: Open… on the left; undo / redo, before, zoom and Save on the right.
        # row 2: the chosen tool's options (its own row, so a wide right group never pushes them off the edge).
        self.options = t.ttk.Frame(f, style="Tool.TFrame", padding=(8, 4, 8, 2))
        self.options.pack(side="top", fill="x")
        right = t.ttk.Frame(self.options, style="Tool.TFrame")
        right.pack(side="right")
        self.opt_left = t.ttk.Frame(f, style="Tool.TFrame", padding=(8, 2, 8, 4))
        self.opt_left.pack(side="top", fill="x")
        self.opt_title = t.ttk.Label(self.opt_left, text="", style="Tool.TLabel", font=T.FONT_B, width=14)
        self.opt_title.pack(side="left", padx=(0, 8))
        self.undo_btn = t.ttk.Button(right, text="↶ Undo", width=7, command=self.undo, style="Tool.TButton")
        self.undo_btn.pack(side="left")
        Tooltip(self.undo_btn, "Ctrl+Z")
        self.redo_btn = t.ttk.Button(right, text="↷ Redo", width=7, command=self.redo, style="Tool.TButton")
        self.redo_btn.pack(side="left", padx=(2, 8))
        Tooltip(self.redo_btn, "Ctrl+Y")
        self.before_btn = t.ttk.Button(right, text="Before", width=7, command=self.toggle_before, style="Tool.TButton")
        self.before_btn.pack(side="left", padx=(0, 8))
        Tooltip(self.before_btn, "Show the picture as it was when it was opened (click again for your edits)")
        for label, mode in (("Fit", "fit"), ("1x", 1), ("2x", 2), ("4x", 4)):
            t.ttk.Button(right, text=label, width=3, command=lambda m=mode: self.view.set_mode(m), style="Tool.TButton").pack(side="left", padx=1)
        t.ttk.Button(right, text="+", width=2, command=lambda: self.zoom(1), style="Tool.TButton").pack(side="left", padx=1)
        t.ttk.Button(right, text="−", width=2, command=lambda: self.zoom(-1), style="Tool.TButton").pack(side="left", padx=(1, 8))
        self.zoom_label = t.ttk.Label(right, text="", style="Tool.TLabel", width=5)
        self.zoom_label.pack(side="left")
        self.save_btn = t.ttk.Button(right, text="Save", width=6, command=self.save, style="Go.TButton")
        self.save_btn.pack(side="left", padx=(8, 0))
        Tooltip(self.save_btn, "Ctrl+S. Writes the picture; the first save keeps a .bak next to it.")
        body = t.ttk.Frame(f)
        body.pack(fill="both", expand=True)
        self.toolbar = Toolbar(body, vertical=True, on_pick=self.pick_tool)
        self.toolbar.pack(side="left", fill="y")
        for key, glyph, tip in self.TOOLS:
            if key == "-":
                self.toolbar.add_sep()
            else:
                self.toolbar.add_tool(key, glyph, tip)
        self.side_scroll = ScrollFrame(body, padding=8)
        self.side_scroll.outer.configure(width=244)
        self.side_scroll.outer.pack_propagate(False)
        self.side_scroll.pack(side="right", fill="y")
        self.side = self.side_scroll.inner
        self.view = ZoomCanvas(body, height=400, checkerboard=self.checkerboard)
        self.view.pack(side="left", fill="both", expand=True)
        self.view.decorate = self.decorate
        self.view.on_zoom = lambda z: self.zoom_label.configure(text=f"{z:.2g}x" if z < 1 else f"{z:g}x")
        c = self.view.canvas
        c.bind("<ButtonPress-1>", self.press)
        c.bind("<B1-Motion>", self.drag)
        c.bind("<ButtonRelease-1>", self.release)
        c.bind("<ButtonPress-3>", self.press_right)
        c.bind("<B3-Motion>", self.drag_right)
        c.bind("<ButtonRelease-3>", self.release)
        c.bind("<Double-Button-1>", self.double)
        c.bind("<Motion>", self.motion)
        c.bind("<Control-MouseWheel>", lambda e: self.zoom(1 if e.delta > 0 else -1))
        c.bind("<Control-Button-4>", lambda e: self.zoom(1))
        c.bind("<Control-Button-5>", lambda e: self.zoom(-1))
        self.frame.bind_all("<Key>", self.key, add="+")
        self.note = Note(f, pady=(2, 4))
        self.note.label.pack_configure(padx=10)
        self.make_vars()
        self.build_side()
        self.build_options()
        self.pick_tool(self.TOOLS[0][0])

    def make_vars(self) -> None:
        pass

    def build_side(self) -> None:
        pass

    def build_options(self) -> None:
        pass

    def header_title(self) -> tuple[str, str]:
        name = self.path.name if self.path else "no picture"
        return f"{self.title}: {name}", self.blurb

    # --------------------------------------------------------------- loading
    def on_show(self, path: str | None = None, back=None, ops=None, on_save=None, **_kw) -> None:
        if path and (self.path is None or Path(path) != self.path or self.doc is None):
            self.load(path)
        elif path is None and self.doc is None:
            self.note.say("Choose a picture: a cutout from step 3 (Edit / Skin / Colour under it), an exported sheet, or any PNG with Open…")
        self.on_save = on_save or self.on_save
        if ops and self.doc is not None:
            n = 0
            for op in ops:
                try:
                    self.doc.apply(op)
                    n += 1
                except Exception as e:  # noqa: BLE001
                    self.app._log(f"op {op} failed: {e}")
            self.redraw()
            self.note.say(f"Applied {n} drafted op(s): adjust, Undo, or Save.", "good")
        self.app.set_header(*self.header_title())
        self.view.redraw()

    def load(self, path: str | Path) -> bool:
        try:
            self.doc = ImageDoc(path)
        except Exception as e:  # noqa: BLE001
            self.doc = None
            self.note.warn(f"Could not open {path}: {e}")
            return False
        self.path = Path(path)
        self.poly = []
        self.show_before = False
        self.before_btn.configure(text="Before")
        self.view.set_image(self.doc.rgba, keep_zoom=False)
        self.after_load()
        self.note.say(f"{self.path.name}: {self.doc.rgba.shape[1]}x{self.doc.rgba.shape[0]} px" + ("; raw crop found (Restore works)" if self.doc.raw is not None else ""))
        return True

    def after_load(self) -> None:
        pass

    def open_dialog(self) -> None:
        from tkinter import filedialog

        p = filedialog.askopenfilename(title="Picture to edit", filetypes=[("PNG", "*.png"), ("All files", "*.*")])
        if p:
            self.load(p)
            self.app.set_header(*self.header_title())

    def on_drop(self, paths: list[str]) -> bool:
        for p in paths:
            if Path(p).suffix.lower() == ".png":
                self.load(p)
                self.app.set_header(*self.header_title())
                return True
        return False

    # --------------------------------------------------------------- drawing
    def decorate(self, rgba: np.ndarray) -> np.ndarray:
        if self.doc is None:
            return rgba
        if self.show_before:
            rgba = self.doc.original.copy()
        sel = self.doc.selection
        if sel is not None:
            out = rgba.copy()
            edge = outline_of(sel)
            out[edge] = SEL
            return out
        return rgba

    def redraw(self) -> None:
        if self.doc is None:
            return
        self.view.set_image(self.doc.rgba, keep_zoom=True)
        self.undo_btn.configure(state="normal" if self.doc.can_undo() else "disabled")
        self.redo_btn.configure(state="normal" if self.doc.can_redo() else "disabled")
        self.draw_overlay()

    def draw_overlay(self) -> None:
        """Canvas items on top of the picture: the lasso in progress, the clone source."""
        c = self.view.canvas
        c.delete("overlay")
        z = self.view.zoom
        if self.poly:
            pts = [self.view.from_image(x + 0.5, y + 0.5) for x, y in self.poly]
            for i, (x, y) in enumerate(pts):
                c.create_oval(x - 3, y - 3, x + 3, y + 3, outline=T.TEAL, tags=("overlay",))
                if i:
                    c.create_line(pts[i - 1][0], pts[i - 1][1], x, y, fill=T.TEAL, tags=("overlay",))
        if self.doc is not None and self.doc.clone_source is not None and self.tool == "clone":
            x, y = self.view.from_image(self.doc.clone_source[0] + 0.5, self.doc.clone_source[1] + 0.5)
            c.create_line(x - 8, y, x + 8, y, fill=T.GOLD, tags=("overlay",))
            c.create_line(x, y - 8, x, y + 8, fill=T.GOLD, tags=("overlay",))
        if self.rect0 is not None and self.last is not None:
            x0, y0 = self.view.from_image(*self.rect0)
            x1, y1 = self.view.from_image(*self.last)
            c.create_rectangle(x0, y0, x1, y1, outline=T.TEAL, dash=(4, 3), tags=("overlay",))

    def toggle_before(self) -> None:
        self.show_before = not self.show_before
        self.before_btn.configure(text="After" if self.show_before else "Before", style="ToolOn.TButton" if self.show_before else "Tool.TButton")
        self.view.redraw()

    def zoom(self, delta: int) -> None:
        if delta > 0:
            self.view.zoom_in()
        else:
            self.view.zoom_out()
        self.draw_overlay()

    # ------------------------------------------------------------- undo/save
    def undo(self) -> None:
        if self.doc and self.doc.undo():
            self.redraw()
            self.note.say("Undone.")

    def redo(self) -> None:
        if self.doc and self.doc.redo():
            self.redraw()
            self.note.say("Redone.")

    def save(self) -> None:
        if self.doc is None:
            return
        try:
            r = self.doc.save()
        except Exception as e:  # noqa: BLE001
            self.note.warn(f"Could not save: {e}")
            return
        self.note.good(f"Saved {Path(r['image']).name} ({r['layers']} layer(s) flattened, {r['ops']} op(s)); the first save kept a .bak next to it.")
        self.app._log(f"Saved {r['image']}")
        if self.on_save:
            self.on_save()
        self.app.refresh_nav()

    def save_ops(self) -> None:
        if self.doc is None:
            return
        p = self.doc.save_ops()
        self.note.good(f"Saved {len(self.doc.ops)} op(s) to {Path(p).name}: replayable with  pixelforge skin <image> {Path(p).name}  or the edit_skin tool.")

    def revert(self, to: str = "saved") -> None:
        if self.doc is None:
            return
        if to == "original":
            self.doc.revert_to_original()
        else:
            self.doc.revert_to_saved()
        self.redraw()
        self.note.say("Reverted (Undo brings the edits back).")

    # --------------------------------------------------------------- tools
    def pick_tool(self, key: str) -> None:
        self.tool = key
        self.toolbar.set_active(key)
        self.poly = []
        self.rect0 = None
        self.opt_title.configure(text=TOOL_NAMES.get(key, key.title()))
        for k, frame in getattr(self, "opt_frames", {}).items():
            if k == key or k in getattr(self, "opt_shared", {}).get(key, ()):
                frame.pack(side="left", padx=(0, 10))
            else:
                frame.pack_forget()
        self.draw_overlay()
        self.tool_hint()

    def tool_hint(self) -> None:
        tips = {t[0]: t[2] for t in self.TOOLS if t[0] != "-"}
        if self.tool in tips:
            self.note.say(tips[self.tool])

    def key(self, e) -> None:
        if self.app.current is not self or self.app._typing(e):
            return
        k = (e.keysym or "").lower()
        if k == "bracketleft" and hasattr(self, "size"):
            self.size.set(max(1, int(self.size.get()) - 1))
        elif k == "bracketright" and hasattr(self, "size"):
            self.size.set(min(80, int(self.size.get()) + 1))
        elif k == "escape" and (self.poly or (self.doc and self.doc.selection is not None)):
            self.poly = []
            if self.doc:
                self.doc.select(None)
            self.redraw()
        elif k == "delete" and self.doc is not None and self.doc.selection is not None:
            self.doc.erase_selection()
            self.redraw()
        else:
            for key, _g, _t in self.TOOLS:
                if key != "-" and getattr(self, "KEYS", {}).get(k) == key:
                    self.pick_tool(key)

    def xy(self, e) -> tuple[int, int]:
        return self.view.to_image(e.x, e.y)

    def press(self, e) -> None:
        if self.doc is None:
            return
        x, y = self.xy(e)
        mode = _mods(e)
        self.last = (x, y)
        if self.tool in ("wand", "magic"):
            if not self.view.inside(x, y):
                return
            m = self.doc.wand(x, y, float(self.tolerance.get()) / 100, contiguous=bool(self.contiguous.get()))
            if self.tool == "magic":
                self.doc.push()
                self.doc.layers[self.doc.active]["rgba"][m, 3] = 0
                self.doc.ops.append({"op": "erase", "like": {"at": [x, y], "range": round(float(self.tolerance.get()) / 100, 3)}, "layer": self.doc.layers[self.doc.active]["name"]})
                self.doc.recomposite()
                self.note.say(f"Magic erase removed {int(m.sum())} pixels (tolerance {float(self.tolerance.get()) / 100:.2f}). Undo if that was too much; Shift+click with the Wand to pick several patches first.")
            else:
                self.doc.select(m, mode, {"like": {"at": [x, y], "range": round(float(self.tolerance.get()) / 100, 3), "radius": 0 if self.contiguous.get() else 9999}})
                self.note.say(f"{self.doc.selected_count()} px selected. Shift+click adds, Alt+click takes away; Delete erases the selection; Esc deselects.")
            self.redraw()
            return
        if self.tool == "lasso":
            self.poly.append([x, y])
            self.draw_overlay()
            return
        if self.tool == "rect":
            self.rect0 = (x, y)
            self._rect_mode = mode
            return
        if self.tool == "clone" and mode == "subtract":
            self.doc.clone_source = (x, y)
            self.note.say(f"Clone source set at ({x}, {y}). Now paint where the copy should go.")
            self.draw_overlay()
            return
        if self.tool == "pick":
            self.pick_colour(x, y, e)
            return
        if self.tool == "dropper":
            hx = self.doc.colour_at(x, y)
            if hx and hasattr(self, "colour"):
                self.colour.set(hx, fire=True)
                self.note.say(f"Picked {hx}.")
            return
        self.doc.begin_stroke()
        self.dab(x, y, first=True)

    def drag(self, e) -> None:
        if self.doc is None:
            return
        x, y = self.xy(e)
        if self.tool == "rect" and self.rect0 is not None:
            self.last = (x, y)
            self.draw_overlay()
            return
        if self.tool in ("wand", "magic", "lasso", "pick", "dropper") or (self.tool == "clone" and self.doc.clone_source is None):
            return
        if self.last is not None and (x, y) != self.last:
            for px, py in _line(self.last, (x, y), max(1.0, float(self.size.get()) / 2)):
                self.dab(int(px), int(py))
        self.last = (x, y)

    def release(self, e) -> None:
        if self.doc is None:
            return
        if self.tool == "rect" and self.rect0 is not None:
            x, y = self.xy(e)
            x0, y0 = self.rect0
            self.doc.select(self.doc.rect(x0, y0, x, y), self._rect_mode, {"rect": [min(x0, x), min(y0, y), max(x0, x), max(y0, y)]})
            self.rect0 = None
            self.note.say(f"{self.doc.selected_count()} px selected.")
            self.redraw()
            return
        self.doc.end_stroke()
        self.last = None
        self.redraw()

    def press_right(self, e) -> None:
        """Right button: the opposite brush (restore while erasing, erase while painting)."""
        if self.doc is None:
            return
        x, y = self.xy(e)
        self._right = True
        self.last = (x, y)
        self.doc.begin_stroke()
        self.dab(x, y, first=True, right=True)

    def drag_right(self, e) -> None:
        if self.doc is None or self.last is None:
            return
        x, y = self.xy(e)
        for px, py in _line(self.last, (x, y), max(1.0, float(self.size.get()) / 2)):
            self.dab(int(px), int(py), right=True)
        self.last = (x, y)

    def double(self, e) -> None:
        if self.tool == "lasso" and len(self.poly) >= 3:
            mode = _mods(e)
            self.doc.select(self.doc.lasso(self.poly), mode, {"polygon": [list(p) for p in self.poly]})
            self.poly = []
            self.note.say(f"{self.doc.selected_count()} px selected (double-click closed the lasso).")
            self.redraw()

    def motion(self, e) -> None:
        if self.doc is None:
            return
        x, y = self.xy(e)
        if self.view.inside(x, y):
            hx = self.doc.colour_at(x, y)
            self.app.status.set(f"({x}, {y})  {hx or 'transparent'}")

    def dab(self, x: int, y: int, first: bool = False, right: bool = False) -> None:
        """One brush step of the current tool at (x, y) as a skin op."""
        r = int(self.size.get())
        tool = self.tool
        if right:
            tool = {"erase": "restore", "restore": "erase", "brush": "erase"}.get(tool, tool)
        op = self.op_for(tool, x, y, r)
        if op is None:
            return
        if tool == "clone":
            if self.doc.clone_source is None:
                self.note.warn("Alt+click sets where the Clone brush copies from.")
                return
            self.doc.clone_stroke([(x, y)], r, opacity=float(self.opacity.get()) if hasattr(self, "opacity") else 1.0, stroke=True)
        else:
            try:
                self.doc.apply(op, stroke=True)
            except ValueError as e:
                self.note.warn(str(e))
                return
        self.view.set_image(self.doc.rgba, keep_zoom=True)

    def op_for(self, tool: str, x: int, y: int, r: int) -> dict | None:
        if tool == "erase":
            return {"op": "erase", "at": [x, y], "radius": r}
        if tool == "restore":
            if self.doc.raw is None:
                self.note.warn("No raw crop next to this picture (views/<view>_raw.png): nothing to restore from.")
                return None
            return {"op": "restore", "at": [x, y], "radius": r}
        if tool == "brush":
            return {"op": "paint", "at": [x, y], "radius": r, "color": self.colour.value, "opacity": float(self.opacity.get())}
        if tool == "glow":
            return {"op": "glow", "at": [x, y], "radius": r * 2, "color": self.colour.value, "strength": float(self.strength.get())}
        if tool == "smooth":
            return {"op": "smooth", "at": [x, y], "radius": r, "sigma": 1.0}
        if tool == "light":
            return {"op": "lightness", "at": [x, y], "radius": r, "amount": float(self.amount.get())}
        if tool == "clone":
            return {"op": "clone"}
        return None

    def pick_colour(self, x: int, y: int, e) -> None:
        pass

    # ------------------------------------------------------- option helpers
    def _opt(self, key: str, *widgets_builder):
        """A frame of options shown while ``key`` is the tool."""
        t = tk()
        if not hasattr(self, "opt_frames"):
            self.opt_frames = {}
            self.opt_shared = {}
        f = t.ttk.Frame(self.opt_left, style="Tool.TFrame")
        self.opt_frames[key] = f
        return f

    def _slider(self, parent, text: str, var, lo, hi, fmt="{:.0f}", length=110, command=None):
        t = tk()
        t.ttk.Label(parent, text=text, style="Tool.TLabel").pack(side="left", padx=(0, 3))
        val = t.ttk.Label(parent, text=fmt.format(float(var.get())), style="Tool.TLabel", width=5)
        sc = t.ttk.Scale(parent, from_=lo, to=hi, variable=var, orient="horizontal", length=length,
                         command=lambda _v: (val.configure(text=fmt.format(float(var.get()))), command() if command else None))
        sc.pack(side="left")
        val.pack(side="left", padx=(2, 6))
        return sc

    def selection_buttons(self, parent) -> None:
        t = tk()
        grid = t.ttk.Frame(parent)
        grid.pack(fill="x", pady=(2, 0))
        grid.columnconfigure(0, weight=1)
        grid.columnconfigure(1, weight=1)
        for i, (text, fn) in enumerate((("Erase", lambda: self.doc.erase_selection()), ("Restore", lambda: self.doc.restore_selection()),
                                        ("Invert", lambda: self.doc.invert_selection()), ("None", lambda: self.doc.select(None)))):
            t.ttk.Button(grid, text=text, width=7, command=lambda fn=fn: (fn(), self.redraw()) if self.doc else None, style="Tool.TButton").grid(row=i // 2, column=i % 2, sticky="ew", padx=1, pady=1)


# ------------------------------------------------------------------------------ Cutout
class CutoutPage(EditorPage):
    key = "cutout"
    title = "Cutout editor"
    blurb = "Fix a cutout by hand: erase leftover background, put parts back from the raw crop, remove a patch of one colour in one click. Save writes views/<view>.png; the next steps use it."
    TOOLS = [("erase", "E", "Erase (left drag). Right drag restores."), ("restore", "R", "Restore from the raw crop (left drag). Right drag erases."),
             ("magic", "✦", "Magic erase: click a patch of one colour (white between beads, sky behind an arm) and it goes. Tolerance on the top bar."),
             ("-", "", ""), ("wand", "W", "Magic wand: select a patch of one colour. Shift adds, Alt takes away. Then Erase / Restore the selection."),
             ("lasso", "L", "Lasso: click round a part, double-click to close. Shift adds, Alt takes away."), ("rect", "▭", "Rectangle select (drag)."),
             ("-", "", ""), ("clone", "C", "Clone brush: Alt+click the source, then paint; copies the painting's own pixels (repairs a torn hem)."),
             ("smooth", "S", "Smooth: soften a jagged edge.")]
    KEYS = {"e": "erase", "r": "restore", "x": "magic", "w": "wand", "l": "lasso", "m": "rect", "c": "clone", "s": "smooth"}

    def make_vars(self) -> None:
        t = tk()
        self.size = t.IntVar(value=8)
        self.tolerance = t.IntVar(value=8)
        self.contiguous = t.BooleanVar(value=True)
        self.opacity = t.DoubleVar(value=1.0)

    def build_options(self) -> None:
        t = tk()
        f = self._opt("erase")
        self._slider(f, "Size", self.size, 1, 60)
        self.opt_shared = {"restore": ("erase",), "clone": ("erase",), "smooth": ("erase",)}
        f = self._opt("magic")
        self._slider(f, "Tolerance", self.tolerance, 1, 40, fmt="{:.0f}")
        t.ttk.Checkbutton(f, text="Connected", variable=self.contiguous, style="Card.TCheckbutton").pack(side="left")
        self.opt_frames["wand"] = f
        self.opt_shared["wand"] = ("magic",)
        self.opt_shared["lasso"] = ()
        t.ttk.Button(self.options, text="Open…", width=6, command=self.open_dialog, style="Tool.TButton").pack(side="left")

    def build_side(self) -> None:
        t = tk()
        s = self.side
        t.ttk.Label(s, text="Selection", style="Sub.TLabel").pack(anchor="w")
        self.sel_info = t.ttk.Label(s, text="none", style="Dim.TLabel", wraplength=210, justify="left")
        self.sel_info.pack(anchor="w")
        self.selection_buttons(s)
        t.ttk.Separator(s).pack(fill="x", pady=8)
        t.ttk.Label(s, text="Whole cutout", style="Sub.TLabel").pack(anchor="w")
        t.ttk.Button(s, text="Revert to automatic", command=lambda: self.revert("original")).pack(anchor="w", fill="x", pady=2)
        t.ttk.Button(s, text="Revert to saved", command=lambda: self.revert("saved")).pack(anchor="w", fill="x", pady=2)
        t.ttk.Button(s, text="Save ops as JSON", command=self.save_ops).pack(anchor="w", fill="x", pady=(10, 2))
        t.ttk.Separator(s).pack(fill="x", pady=8)
        t.ttk.Label(s, text="Keys: E erase · R restore · X magic erase · W wand · L lasso · M rectangle · C clone · [ ] brush size · Delete erases the selection · Esc deselects · Ctrl+Z / Ctrl+Y · Ctrl+S save",
                    style="Small.TLabel", wraplength=210, justify="left").pack(anchor="w")

    def redraw(self) -> None:
        super().redraw()
        if self.doc is not None:
            self.sel_info.configure(text=f"{self.doc.selected_count()} px" if self.doc.selection is not None else "none")

    def save(self) -> None:
        super().save()
        if self.doc is not None and self.path is not None and self.path.parent.name == "views":
            self.note.good(f"Saved {self.path.name}. The next steps use this cutout; on step 4 press 'Redo from here' so the colours and the model follow.")


# -------------------------------------------------------------------------------- Skin
class SkinPage(EditorPage):
    key = "skin"
    title = "Skin editor"
    blurb = "Paint on a cutout, a sprite or a whole atlas (every frame at once): recolour, brush, glow, erase, restore, clone, smooth, with layers and named regions. Every stroke is an op an AI can replay."
    TOOLS = [("pick", "P", "Pick + recolour: click a colour, widen the range on the top bar, choose the new colour on the right, Apply. Shading is kept."),
             ("brush", "B", "Brush: paints the colour on the right (right drag erases)."), ("glow", "G", "Glow: a soft light in the colour on the right (eyes, lantern, runes)."),
             ("light", "I", "Lightness: lighten or darken under the brush (amount on the top bar)."), ("smooth", "S", "Smooth: soften under the brush."),
             ("-", "", ""), ("erase", "E", "Erase (left drag). Right drag restores from the raw crop."), ("restore", "R", "Restore from the raw crop."),
             ("clone", "C", "Clone brush: Alt+click the source, then paint; the offset holds along the stroke."),
             ("-", "", ""), ("wand", "W", "Magic wand select. Shift adds, Alt takes away; tools then work inside the selection."), ("lasso", "L", "Lasso: click round a part, double-click to close."),
             ("rect", "▭", "Rectangle select (drag)."), ("dropper", "✎", "Eyedropper: click to take a colour from the picture.")]
    KEYS = {"p": "pick", "b": "brush", "g": "glow", "i": "light", "s": "smooth", "e": "erase", "r": "restore", "c": "clone", "w": "wand", "l": "lasso", "m": "rect", "k": "dropper"}

    def make_vars(self) -> None:
        t = tk()
        self.size = t.IntVar(value=6)
        self.opacity = t.DoubleVar(value=1.0)
        self.strength = t.DoubleVar(value=0.5)
        self.amount = t.DoubleVar(value=0.1)
        self.tolerance = t.IntVar(value=8)
        self.contiguous = t.BooleanVar(value=True)
        self.range_ = t.DoubleVar(value=0.08)
        self.radius = t.IntVar(value=0)
        self.lightness = t.DoubleVar(value=0.0)
        self.chroma = t.DoubleVar(value=1.0)
        self.hue = t.DoubleVar(value=0.0)

    def build_options(self) -> None:
        t = tk()
        f = self._opt("brush")
        self._slider(f, "Size", self.size, 1, 60)
        self._slider(f, "Opacity", self.opacity, 0.05, 1.0, fmt="{:.2f}")
        self.opt_shared = {"erase": ("brush",), "restore": ("brush",), "smooth": ("brush",), "clone": ("brush",)}
        f = self._opt("glow")
        self._slider(f, "Size", self.size, 1, 60)
        self._slider(f, "Strength", self.strength, 0.1, 1.0, fmt="{:.2f}")
        f = self._opt("light")
        self._slider(f, "Size", self.size, 1, 60)
        self._slider(f, "Amount", self.amount, -0.3, 0.3, fmt="{:+.2f}")
        f = self._opt("wand")
        self._slider(f, "Tolerance", self.tolerance, 1, 40)
        t.ttk.Checkbutton(f, text="Connected", variable=self.contiguous, style="Card.TCheckbutton").pack(side="left")
        f = self._opt("pick")
        t.ttk.Button(f, text="Apply", command=self.apply_pick, style="Go.TButton").pack(side="left", padx=(0, 8))
        t.ttk.Button(self.options, text="Open…", width=6, command=self.open_dialog, style="Tool.TButton").pack(side="left")
        self.pick_src = None
        self.pick_center = None
        self.pick_mask = None
        self.pick_to = None
        self.pick_preview = None

    def build_adjust(self, s) -> None:
        """Light / Chroma / Hue for the Pick tool (fine-tuning after the new colour), on the side panel."""
        t = tk()
        t.ttk.Label(s, text="Pick + recolour", style="Sub.TLabel").pack(anchor="w", pady=(6, 0))
        for text, var, lo, hi, fmt, dflt in (("Range (similar colours)", self.range_, 0.01, 0.3, "{:.2f}", 0.08), ("Only near the click, px (0 = all)", self.radius, 0, 200, "{:.0f}", 0),
                                             ("Light", self.lightness, -0.3, 0.3, "{:+.2f}", 0.0), ("Chroma", self.chroma, 0.0, 2.0, "{:.2f}", 1.0), ("Hue", self.hue, -180, 180, "{:+.0f}", 0.0)):
            LabeledScale(s, text, var, lo, hi, command=lambda v: self.update_pick(), length=200, fmt=fmt, default=dflt).pack(fill="x")
        t.ttk.Button(s, text="Apply the recolour", command=self.apply_pick, style="Go.TButton").pack(fill="x", pady=(4, 0))

    def build_side(self) -> None:
        t = tk()
        s = self.side
        self.colour = ColourPicker(s, on_pick=self.colour_picked, title="Colour", initial="#4fd1c5")
        self.colour.pack(fill="x")
        self.build_adjust(s)
        t.ttk.Separator(s).pack(fill="x", pady=6)
        t.ttk.Label(s, text="Layers", style="Sub.TLabel").pack(anchor="w")
        self.layer_list = t.Listbox(s, height=4, exportselection=False, bg=T.FIELD, fg=T.BONE, selectbackground=T.TEAL_DK, selectforeground="#eafff8",
                                    highlightthickness=0, relief="flat", font=T.FONT_S)
        self.layer_list.pack(fill="x")
        self.layer_list.bind("<<ListboxSelect>>", lambda e: self.select_layer())
        row = t.ttk.Frame(s)
        row.pack(fill="x", pady=(2, 0))
        for text, cmd, tip in (("+", self.add_layer, "New layer"), ("−", self.remove_layer, "Delete the layer"), ("◐", self.toggle_layer, "Show / hide"),
                               ("↑", lambda: self.move_layer(1), "Up"), ("↓", lambda: self.move_layer(-1), "Down"), ("⤓", self.merge_down, "Merge down")):
            b = t.ttk.Button(row, text=text, width=2, command=cmd, style="Tool.TButton")
            b.pack(side="left", padx=1)
            Tooltip(b, tip)
        self.layer_opacity = t.DoubleVar(value=1.0)
        LabeledScale(s, "Layer opacity", self.layer_opacity, 0.0, 1.0, command=self.set_layer_opacity, length=200).pack(fill="x", pady=(2, 0))
        t.ttk.Separator(s).pack(fill="x", pady=6)
        t.ttk.Label(s, text="Selection", style="Sub.TLabel").pack(anchor="w")
        self.sel_info = t.ttk.Label(s, text="none", style="Dim.TLabel")
        self.sel_info.pack(anchor="w")
        self.selection_buttons(s)
        row = t.ttk.Frame(s)
        row.pack(fill="x", pady=(2, 0))
        t.ttk.Button(row, text="Fill", width=6, command=self.fill_selection, style="Tool.TButton").pack(side="left")
        t.ttk.Button(row, text="Recolour", width=8, command=self.recolor_selection, style="Tool.TButton").pack(side="left")
        row = t.ttk.Frame(s)
        row.pack(fill="x", pady=(4, 0))
        self.region_name = t.StringVar(value="")
        t.ttk.Entry(row, textvariable=self.region_name, width=12).pack(side="left")
        b = t.ttk.Button(row, text="Name it", width=8, command=self.name_selection, style="Tool.TButton")
        b.pack(side="left", padx=2)
        Tooltip(b, "Keep the selection as a named region (eye_left, lantern…) that ops and the AI path can target")
        t.ttk.Label(s, text="Regions", style="Sub.TLabel").pack(anchor="w", pady=(6, 0))
        row = t.ttk.Frame(s)
        row.pack(fill="x")
        self.region_box = t.ttk.Combobox(row, values=[], state="readonly", width=12)
        self.region_box.pack(side="left")
        t.ttk.Button(row, text="Select", width=7, command=self.select_region, style="Tool.TButton").pack(side="left", padx=2)
        t.ttk.Separator(s).pack(fill="x", pady=6)
        t.ttk.Button(s, text="Save ops as JSON", command=self.save_ops).pack(fill="x", pady=1)
        t.ttk.Button(s, text="Revert to saved", command=lambda: self.revert("saved")).pack(fill="x", pady=1)
        t.ttk.Label(s, text="P pick · B brush · G glow · I light · S smooth · E erase · R restore · C clone · W wand · L lasso · M rect · K eyedropper · [ ] size",
                    style="Small.TLabel", wraplength=210, justify="left").pack(anchor="w", pady=(6, 0))

    def after_load(self) -> None:
        self.colour.set_swatches(self.doc.swatches(24))
        self.fill_layers()
        self.region_box.configure(values=sorted(self.doc.regions))
        self.pick_src = None
        self.pick_mask = None

    def colour_picked(self, hexv: str) -> None:
        if self.tool == "pick" and self.pick_src is not None:
            from ..color import rgb_to_oklab

            rgb = np.array([[[int(hexv[i:i + 2], 16) for i in (1, 3, 5)]]], np.uint8)
            self.pick_to = rgb_to_oklab(rgb)[0, 0].astype(np.float32)
            self.update_pick()

    # ------------------------------------------------------------- layers
    def fill_layers(self) -> None:
        self.layer_list.delete(0, "end")
        for L in reversed(self.doc.layers):
            self.layer_list.insert("end", ("● " if L["visible"] else "○ ") + L["name"] + (f"  {int(L.get('opacity', 1) * 100)}%" if L.get("opacity", 1) < 1 else ""))
        self.layer_list.selection_clear(0, "end")
        self.layer_list.selection_set(len(self.doc.layers) - 1 - self.doc.active)
        self.layer_opacity.set(self.doc.layers[self.doc.active].get("opacity", 1.0))

    def select_layer(self) -> None:
        sel = self.layer_list.curselection()
        if sel and self.doc:
            self.doc.active = len(self.doc.layers) - 1 - sel[0]
            self.layer_opacity.set(self.doc.layers[self.doc.active].get("opacity", 1.0))

    def add_layer(self) -> None:
        if self.doc:
            self.doc.add_layer()
            self.fill_layers()
            self.redraw()

    def remove_layer(self) -> None:
        if self.doc:
            self.doc.remove_layer()
            self.fill_layers()
            self.redraw()

    def toggle_layer(self) -> None:
        if self.doc:
            self.doc.toggle_layer()
            self.fill_layers()
            self.redraw()

    def move_layer(self, d: int) -> None:
        if self.doc:
            self.doc.move_layer(d)
            self.fill_layers()
            self.redraw()

    def merge_down(self) -> None:
        if self.doc:
            self.doc.merge_down()
            self.fill_layers()
            self.redraw()

    def set_layer_opacity(self, v: float) -> None:
        if self.doc:
            self.doc.set_opacity(v)
            self.redraw()

    # ---------------------------------------------------------- selection
    def redraw(self) -> None:
        super().redraw()
        if self.doc is not None:
            self.sel_info.configure(text=f"{self.doc.selected_count()} px" if self.doc.selection is not None else "none")

    def fill_selection(self) -> None:
        if self.doc and self.doc.selection is not None:
            self.doc.fill_selection(self.colour.value, float(self.opacity.get()))
            self.redraw()

    def recolor_selection(self) -> None:
        if self.doc and self.doc.selection is not None:
            self.doc.recolor_selection(self.colour.value)
            self.redraw()
            self.note.good("Selection recoloured toward " + self.colour.value + " (shading kept).")

    def name_selection(self) -> None:
        name = self.region_name.get().strip().replace(" ", "_")
        if not name or self.doc is None or self.doc.selection is None:
            self.note.warn("Make a selection (wand, lasso or rectangle) and type a name first.")
            return
        self.doc.name_selection(name)
        self.region_box.configure(values=sorted(self.doc.regions))
        self.region_box.set(name)
        self.note.good(f"Region '{name}' kept in {self.path.stem}.regions.json; ops can target it by name.")

    def select_region(self) -> None:
        name = self.region_box.get()
        if not name or self.doc is None:
            return
        from .. import skin_ops

        self.doc.select(skin_ops.resolve_region(self.doc.rgba, self.doc.regions[name]), "replace", {"region": name})
        self.redraw()

    # --------------------------------------------------------------- pick
    def pick_colour(self, x: int, y: int, e) -> None:
        if not self.view.inside(x, y) or self.doc.rgba[y, x, 3] == 0:
            return
        from ..color import rgb_to_oklab

        lab = rgb_to_oklab(self.doc.rgba[..., :3]).astype(np.float32)
        self.pick_lab = lab
        self.pick_src = lab[y, x].copy()
        self.pick_center = (x, y)
        self.pick_to = None
        hx = self.doc.colour_at(x, y)
        self.note.say(f"Picked {hx} at ({x}, {y}). Widen Range to take similar colours; choose the new colour on the right; Apply.")
        self.update_pick()

    def update_pick(self) -> None:
        if self.doc is None or self.pick_src is None or self.tool != "pick":
            return
        from ..color_editor import select_like, shift_colors

        m = select_like(self.pick_lab, self.doc.rgba[..., 3], self.pick_src, float(self.range_.get()), self.pick_center, int(self.radius.get()))
        if self.doc.selection is not None:
            m &= self.doc.selection
        self.pick_mask = m
        plain = self.pick_to is None and abs(self.lightness.get()) < 1e-6 and abs(self.chroma.get() - 1) < 1e-6 and abs(self.hue.get()) < 1e-6
        if plain:
            disp = self.doc.rgba.copy()
            disp[m, :3] = (disp[m, :3] * 0.4 + np.array([79, 209, 197]) * 0.6).astype(np.uint8)
        else:
            disp = shift_colors(self.doc.rgba, m, self.pick_src, self.pick_to, float(self.lightness.get()), float(self.chroma.get()), float(self.hue.get()))
        self.pick_preview = disp
        self.view.set_image(disp, keep_zoom=True)
        self.sel_info.configure(text=f"{int(m.sum())} px like the picked colour")

    def apply_pick(self) -> None:
        if self.doc is None or self.pick_src is None or self.pick_mask is None or not self.pick_mask.any():
            self.note.warn("Click a colour on the picture first.")
            return
        op = {"op": "recolor", "at": [int(self.pick_center[0]), int(self.pick_center[1])], "range": round(float(self.range_.get()), 3),
              "radius": int(self.radius.get()), "lightness": round(float(self.lightness.get()), 3), "chroma": round(float(self.chroma.get()), 3), "hue": round(float(self.hue.get()), 1)}
        if self.pick_to is not None:
            op["to"] = self.colour.value
        self.doc.apply(op)
        self.pick_src = None
        self.pick_mask = None
        self.pick_to = None
        self.lightness.set(0.0)
        self.chroma.set(1.0)
        self.hue.set(0.0)
        self.redraw()
        self.note.good("Applied. Click another colour, or Save.")

    def pick_tool(self, key: str) -> None:
        super().pick_tool(key)
        if key != "pick" and self.doc is not None and self.pick_src is not None:
            self.pick_src = None
            self.view.set_image(self.doc.rgba, keep_zoom=True)


# ------------------------------------------------------------------------------ Colour
class ColourPage(SkinPage):
    key = "colour"
    title = "Colour editor"
    blurb = "The small colour fix: click a colour (an eye, a sash, the hood), widen the range, pick the new colour. Shading stays; only the colour moves. On an atlas every frame changes at once."
    TOOLS = [("pick", "P", "Click a colour on the picture; widen Range to take similar colours; choose the new colour on the right; Apply."),
             ("dropper", "✎", "Eyedropper: take a colour from the picture into the swatch."),
             ("wand", "W", "Limit the change to a patch: Shift adds, Alt takes away."), ("lasso", "L", "Limit the change to a lassoed part (double-click to close).")]
    KEYS = {"p": "pick", "k": "dropper", "w": "wand", "l": "lasso"}

    def build_side(self) -> None:
        t = tk()
        s = self.side
        self.colour = ColourPicker(s, on_pick=self.colour_picked, title="New colour", initial="#4fd1c5")
        self.colour.pack(fill="x")
        self.build_adjust(s)
        t.ttk.Separator(s).pack(fill="x", pady=6)
        t.ttk.Label(s, text="Selection (limits it)", style="Sub.TLabel").pack(anchor="w")
        self.sel_info = t.ttk.Label(s, text="none", style="Dim.TLabel")
        self.sel_info.pack(anchor="w")
        self.selection_buttons(s)
        t.ttk.Separator(s).pack(fill="x", pady=6)
        t.ttk.Button(s, text="Save ops as JSON", command=self.save_ops).pack(fill="x", pady=1)
        t.ttk.Button(s, text="Revert to saved", command=lambda: self.revert("saved")).pack(fill="x", pady=1)
        t.ttk.Label(s, text="1. Click the colour to change.\n2. Range: how many similar colours join. 'Only near' keeps it to one eye.\n3. Click a swatch or type a hex, or use Light / Chroma / Hue.\n4. Apply, then Save.",
                    style="Small.TLabel", wraplength=210, justify="left").pack(anchor="w", pady=(8, 0))
        # layers exist in the doc but this editor keeps one; the list widgets are needed by the shared code
        self.layer_list = t.Listbox(s)
        self.layer_opacity = t.DoubleVar(value=1.0)
        self.region_box = t.ttk.Combobox(s, values=[])
        self.region_name = t.StringVar(value="")

    def fill_layers(self) -> None:
        pass
