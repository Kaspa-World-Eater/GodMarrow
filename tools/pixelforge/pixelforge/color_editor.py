"""A small colour editor for sprites, atlases and cutouts.

Click a colour on the picture (the eyedropper), set how wide a range of similar colours to take, and give it a new
colour: every selected pixel moves by the same OKLab offset, so shading and texture stay and only the colour changes.
Lightness, chroma and hue sliders refine it. Works on a single cutout before the build (the model then carries the
change into every frame) or on a finished atlas (every frame at once, since they share the sheet).

    open_color_editor(master, "art/sprites/keeper.png", on_save=...)
"""
from __future__ import annotations

import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from .color import oklab_to_rgb, rgb_to_oklab


def select_like(lab: np.ndarray, alpha: np.ndarray, src: np.ndarray, tolerance: float, center: tuple[int, int] | None = None,
                radius: int = 0) -> np.ndarray:
    """Pixels within ``tolerance`` (OKLab distance) of ``src``; with ``radius`` > 0 only within that many pixels of
    ``center`` (x, y), for a local change such as one eye."""
    m = (np.linalg.norm(lab - src, axis=-1) <= tolerance) & (alpha > 0)
    if radius > 0 and center is not None:
        yy, xx = np.mgrid[0:lab.shape[0], 0:lab.shape[1]]
        m &= (xx - center[0]) ** 2 + (yy - center[1]) ** 2 <= radius * radius
    return m


def shift_colors(rgba: np.ndarray, mask: np.ndarray, src_lab: np.ndarray, dst_lab: np.ndarray | None,
                 lightness: float = 0.0, chroma: float = 1.0, hue: float = 0.0) -> np.ndarray:
    """Recolour the masked pixels: move each by (dst - src) in OKLab (shading kept), then the sliders."""
    out = rgba.copy()
    if not mask.any():
        return out
    lab = rgb_to_oklab(rgba[..., :3][mask]).astype(np.float32)
    if dst_lab is not None:
        lab = lab + (np.asarray(dst_lab, np.float32) - np.asarray(src_lab, np.float32))
    L, a, b = lab[:, 0] + lightness, lab[:, 1], lab[:, 2]
    th = math.radians(hue)
    a2 = (a * math.cos(th) - b * math.sin(th)) * chroma
    b2 = (a * math.sin(th) + b * math.cos(th)) * chroma
    lab = np.stack([np.clip(L, 0, 1), a2, b2], axis=1)
    out[..., :3][mask] = oklab_to_rgb(lab)
    return out


class ColorEditor:
    def __init__(self, master, image_path: str | Path, on_save=None):
        global BOTH, END, LEFT, RIGHT, X, Y, BooleanVar, Canvas, DoubleVar, IntVar, StringVar, Toplevel, Listbox, colorchooser, messagebox, ttk
        from tkinter import BOTH, END, LEFT, RIGHT, X, Y, BooleanVar, Canvas, DoubleVar, IntVar, StringVar, Toplevel, Listbox, colorchooser, messagebox  # noqa: PLW0603
        from tkinter import ttk
        global ImageTk
        from PIL import ImageTk  # noqa: PLW0603  (needs Tk; the functions above do not)
        self.path = Path(image_path)
        self.on_save = on_save
        self.rgba = np.array(Image.open(self.path).convert("RGBA"))
        self.lab = rgb_to_oklab(self.rgba[..., :3]).astype(np.float32)
        self.undo: list[np.ndarray] = []
        self.mask = np.zeros(self.rgba.shape[:2], bool)
        self.src = None
        self.dst = None
        self.center = None
        self.preview = self.rgba
        h, w = self.rgba.shape[:2]
        self.zoom = max(1, min(6, int(640 / max(h, 1)), int(1000 / max(w, 1))))

        self.win = Toplevel(master)
        self.win.title(f"Colour editor: {self.path.name}")
        self.tol = DoubleVar(value=0.08)
        self.radius = IntVar(value=0)
        self.lightness = DoubleVar(value=0.0)
        self.chroma = DoubleVar(value=1.0)
        self.hue = DoubleVar(value=0.0)
        self.local = BooleanVar(value=False)
        self.pick_label = StringVar(value="Click a colour on the picture to start.")

        bar = ttk.Frame(self.win, padding=6)
        bar.pack(fill=X)
        ttk.Label(bar, textvariable=self.pick_label, width=44).pack(side=LEFT)
        self.swatch = Canvas(bar, width=28, height=20, bg="#303030", highlightthickness=1, highlightbackground="#555")
        self.swatch.pack(side=LEFT, padx=6)
        ttk.Button(bar, text="New colour…", command=self.choose).pack(side=LEFT)
        self.swatch2 = Canvas(bar, width=28, height=20, bg="#303030", highlightthickness=1, highlightbackground="#555")
        self.swatch2.pack(side=LEFT, padx=6)
        ttk.Button(bar, text="Apply", command=self.apply, style="Go.TButton").pack(side=LEFT, padx=(12, 2))
        ttk.Button(bar, text="Undo", command=self.do_undo).pack(side=LEFT)
        ttk.Button(bar, text="Save", command=self.save).pack(side=RIGHT, padx=4)
        ttk.Button(bar, text="+", width=3, command=lambda: self.set_zoom(self.zoom + 1)).pack(side=RIGHT)
        ttk.Button(bar, text="−", width=3, command=lambda: self.set_zoom(self.zoom - 1)).pack(side=RIGHT)
        ttk.Label(bar, text="Zoom").pack(side=RIGHT, padx=(8, 2))

        knobs = ttk.Frame(self.win, padding=(6, 0))
        knobs.pack(fill=X)
        for label, var, lo, hi in (("Range", self.tol, 0.01, 0.3), ("Lightness", self.lightness, -0.3, 0.3), ("Chroma", self.chroma, 0.0, 2.0), ("Hue", self.hue, -180.0, 180.0)):
            ttk.Label(knobs, text=label).pack(side=LEFT, padx=(8, 2))
            ttk.Scale(knobs, from_=lo, to=hi, variable=var, orient="horizontal", length=120, command=lambda _v: self.update()).pack(side=LEFT)
        ttk.Checkbutton(knobs, text="Only near the click, radius", variable=self.local, command=self.update).pack(side=LEFT, padx=(12, 2))
        ttk.Scale(knobs, from_=4, to=200, variable=self.radius, orient="horizontal", length=100, command=lambda _v: self.update()).pack(side=LEFT)
        ttk.Label(self.win, text="Eyedropper: click the picture. Range widens the selection to similar colours (the highlight shows it). "
                  "New colour moves the selection to that colour and keeps its shading; the sliders fine-tune. Apply, then Save.",
                  wraplength=900, foreground="#888").pack(fill=X, padx=8, pady=(2, 4))
        frame = ttk.Frame(self.win)
        frame.pack(fill=BOTH, expand=True)
        self.canvas = Canvas(frame, bg="#303030", highlightthickness=0, width=min(1100, w * self.zoom), height=min(700, h * self.zoom))
        hbar = ttk.Scrollbar(frame, orient="horizontal", command=self.canvas.xview)
        vbar = ttk.Scrollbar(frame, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(xscrollcommand=hbar.set, yscrollcommand=vbar.set)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        vbar.grid(row=0, column=1, sticky="ns")
        hbar.grid(row=1, column=0, sticky="ew")
        frame.rowconfigure(0, weight=1)
        frame.columnconfigure(0, weight=1)
        self.canvas.bind("<ButtonPress-1>", self.pick)
        self.photo = None
        self.draw()

    # ---------------------------------------------------------------- actions
    def pick(self, e) -> None:
        x, y = int(self.canvas.canvasx(e.x) / self.zoom), int(self.canvas.canvasy(e.y) / self.zoom)
        h, w = self.rgba.shape[:2]
        if not (0 <= x < w and 0 <= y < h) or self.rgba[y, x, 3] == 0:
            return
        self.src = self.lab[y, x].copy()
        self.center = (x, y)
        rgb = self.rgba[y, x, :3]
        self.swatch.configure(bg="#%02x%02x%02x" % tuple(int(v) for v in rgb))
        self.pick_label.set(f"Picked #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x} at ({x}, {y}).")
        self.update()

    def choose(self) -> None:
        if self.src is None:
            messagebox.showinfo("Colour editor", "Click a colour on the picture first.")
            return
        rgb, hexv = colorchooser.askcolor(parent=self.win, title="New colour")
        if rgb is None:
            return
        self.dst = rgb_to_oklab(np.array([[[int(v) for v in rgb]]], np.uint8))[0, 0].astype(np.float32)
        self.swatch2.configure(bg=hexv)
        self.update()

    def update(self) -> None:
        if self.src is None:
            return
        self.mask = select_like(self.lab, self.rgba[..., 3], self.src, float(self.tol.get()), self.center, int(self.radius.get()) if self.local.get() else 0)
        self.preview = shift_colors(self.rgba, self.mask, self.src, self.dst, float(self.lightness.get()), float(self.chroma.get()), float(self.hue.get()))
        self.pick_label.set(self.pick_label.get().split(" |")[0] + f" | {int(self.mask.sum())} px selected")
        self.draw(highlight=self.dst is None and self.lightness.get() == 0 and self.chroma.get() == 1 and self.hue.get() == 0)

    def apply(self) -> None:
        if self.src is None or not self.mask.any():
            return
        self.undo.append(self.rgba.copy())
        self.rgba = self.preview.copy()
        self.lab = rgb_to_oklab(self.rgba[..., :3]).astype(np.float32)
        self.dst = None
        self.lightness.set(0.0); self.chroma.set(1.0); self.hue.set(0.0)
        self.swatch2.configure(bg="#303030")
        self.src = None
        self.mask[:] = False
        self.preview = self.rgba
        self.pick_label.set("Applied. Click another colour, or Save.")
        self.draw()

    def do_undo(self) -> None:
        if self.undo:
            self.rgba = self.undo.pop()
            self.lab = rgb_to_oklab(self.rgba[..., :3]).astype(np.float32)
            self.preview = self.rgba
            self.src = None
            self.mask[:] = False
            self.draw()

    def save(self) -> None:
        if self.src is not None and self.mask.any() and (self.dst is not None or self.lightness.get() or self.chroma.get() != 1 or self.hue.get()):
            self.apply()
        bak = self.path.with_suffix(self.path.suffix + ".bak")
        if not bak.exists():
            shutil.copy(self.path, bak)
        Image.fromarray(self.rgba, "RGBA").save(self.path)
        self.pick_label.set(f"Saved {self.path.name} (the original is kept as {bak.name}).")
        if self.on_save:
            self.on_save()

    # ---------------------------------------------------------------- drawing
    def set_zoom(self, z: int) -> None:
        self.zoom = max(1, min(12, z))
        self.draw()

    def draw(self, highlight: bool = False) -> None:
        img = self.preview.copy()
        if highlight and self.mask.any():
            img[self.mask, :3] = (img[self.mask, :3] * 0.4 + np.array([79, 209, 197]) * 0.6).astype(np.uint8)
        im = Image.fromarray(img, "RGBA")
        bg = Image.new("RGBA", im.size, (48, 48, 48, 255))
        im = Image.alpha_composite(bg, im)
        if self.zoom != 1:
            im = im.resize((im.width * self.zoom, im.height * self.zoom), Image.NEAREST)
        self.photo = ImageTk.PhotoImage(im)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor="nw", image=self.photo)
        self.canvas.configure(scrollregion=(0, 0, im.width, im.height))


def open_color_editor(master, image_path, on_save=None) -> ColorEditor:
    return ColorEditor(master, image_path, on_save)
