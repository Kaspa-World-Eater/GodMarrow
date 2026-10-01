"""Manual cutout editor (Tkinter): fix a view's cutout by hand when the automatic one is wrong.

Opens ``views/<name>.png`` next to its raw crop ``views/<name>_raw.png`` (saved by
the split step).  Tools:

- **Erase** (left drag): makes pixels transparent.
- **Restore** (right drag, or the Restore tool): brings the raw pixels back.
- **Magic erase** (tool + click): removes the connected patch of similar colour
  under the cursor (trapped background between an arm and the body, a white
  gap between beads), with the tolerance slider.
- Undo, brush size, zoom, Revert to the automatic cutout, Save.

Saving writes the view PNG; the next steps (palette, model) use it as is.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
from tkinter import LEFT, RIGHT, X, Canvas, IntVar, StringVar, Toplevel, messagebox
from tkinter import ttk

import numpy as np
from PIL import Image, ImageTk

from .color import rgb_to_oklab


class CutoutEditor:
    def __init__(self, master, view_path: str | Path, on_save=None):
        self.path = Path(view_path)
        self.raw_path = self.path.with_name(self.path.stem + "_raw.png")
        self.on_save = on_save
        self.rgba = np.array(Image.open(self.path).convert("RGBA"))
        self.auto = self.rgba.copy()
        if self.raw_path.exists():
            raw = Image.open(self.raw_path).convert("RGB").resize((self.rgba.shape[1], self.rgba.shape[0]), Image.LANCZOS)
            self.raw = np.array(raw)
        else:   # no raw crop: restoring brings back the cutout's own colours
            self.raw = self.rgba[..., :3].copy()
        self.lab = rgb_to_oklab(self.raw)
        self.undo: list[np.ndarray] = []
        self.zoom = max(1, min(6, int(700 / max(self.rgba.shape[0], 1))))
        self.tool = StringVar(value="erase")
        self.brush = IntVar(value=6)
        self.tolerance = IntVar(value=8)   # /100 OKLab

        self.win = Toplevel(master)
        self.win.configure(bg="#1b1e24")
        self.win.title(f"Cutout: {self.path.name}")
        bar = ttk.Frame(self.win, padding=4)
        bar.pack(fill=X)
        for key, label in (("erase", "Erase (L-drag)"), ("restore", "Restore (R-drag)"), ("magic", "Magic erase (click)")):
            ttk.Radiobutton(bar, text=label, value=key, variable=self.tool).pack(side=LEFT, padx=3)
        ttk.Label(bar, text="Brush").pack(side=LEFT, padx=(12, 2))
        ttk.Scale(bar, from_=1, to=40, variable=self.brush, orient="horizontal", length=100).pack(side=LEFT)
        ttk.Label(bar, text="Tolerance").pack(side=LEFT, padx=(12, 2))
        ttk.Scale(bar, from_=1, to=30, variable=self.tolerance, orient="horizontal", length=100).pack(side=LEFT)
        ttk.Button(bar, text="Undo", command=self.do_undo).pack(side=LEFT, padx=(12, 2))
        ttk.Label(bar, text="Zoom").pack(side=LEFT, padx=(10, 2))
        ttk.Button(bar, text="+", width=3, command=lambda: self.set_zoom(self.zoom + 1)).pack(side=LEFT)
        ttk.Button(bar, text="−", width=3, command=lambda: self.set_zoom(self.zoom - 1)).pack(side=LEFT)
        ttk.Button(bar, text="Revert to automatic", command=self.revert).pack(side=LEFT, padx=(12, 2))
        ttk.Button(bar, text="Save", command=self.save).pack(side=RIGHT, padx=4)
        self.status = ttk.Label(self.win, text="Left drag erases, right drag restores. Magic erase removes one patch of similar colour.", foreground="#555")
        self.status.pack(fill=X, padx=6)
        frame = ttk.Frame(self.win)
        frame.pack(fill="both", expand=True)
        self.canvas = Canvas(frame, bg="#303030", highlightthickness=0, width=min(1100, self.rgba.shape[1] * self.zoom), height=min(780, self.rgba.shape[0] * self.zoom))
        hbar = ttk.Scrollbar(frame, orient="horizontal", command=self.canvas.xview)
        vbar = ttk.Scrollbar(frame, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(xscrollcommand=hbar.set, yscrollcommand=vbar.set)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        vbar.grid(row=0, column=1, sticky="ns")
        hbar.grid(row=1, column=0, sticky="ew")
        frame.rowconfigure(0, weight=1)
        frame.columnconfigure(0, weight=1)
        self.canvas.bind("<ButtonPress-1>", lambda e: self.press(e, "erase"))
        self.canvas.bind("<B1-Motion>", lambda e: self.drag(e, "erase"))
        self.canvas.bind("<ButtonPress-3>", lambda e: self.press(e, "restore"))
        self.canvas.bind("<B3-Motion>", lambda e: self.drag(e, "restore"))
        self.photo = None
        self.checker = self._checker()
        self.redraw()

    # ---------------------------------------------------------------- drawing
    def _checker(self) -> np.ndarray:
        h, w = self.rgba.shape[:2]
        ys, xs = np.mgrid[0:h, 0:w]
        c = ((xs // 8 + ys // 8) % 2) * 30 + 70
        return np.dstack([c, c, c]).astype(np.uint8)

    def redraw(self) -> None:
        a = self.rgba[..., 3:4].astype(np.float32) / 255
        comp = (self.rgba[..., :3] * a + self.checker * (1 - a)).astype(np.uint8)
        im = Image.fromarray(comp).resize((comp.shape[1] * self.zoom, comp.shape[0] * self.zoom), Image.NEAREST)
        self.photo = ImageTk.PhotoImage(im)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor="nw", image=self.photo)
        self.canvas.configure(scrollregion=(0, 0, im.width, im.height))

    def set_zoom(self, z: int) -> None:
        self.zoom = max(1, min(12, z))
        self.redraw()

    # ---------------------------------------------------------------- tools
    def _xy(self, e):
        return int(self.canvas.canvasx(e.x) // self.zoom), int(self.canvas.canvasy(e.y) // self.zoom)

    def press(self, e, button_tool: str) -> None:
        self.undo.append(self.rgba.copy())
        if len(self.undo) > 30:
            self.undo.pop(0)
        tool = self.tool.get()
        if button_tool == "erase" and tool == "magic":
            self.magic(*self._xy(e))
            return
        self.drag(e, button_tool)

    def drag(self, e, button_tool: str) -> None:
        tool = self.tool.get()
        if button_tool == "erase" and tool == "restore":
            button_tool = "restore"
        if tool == "magic" and button_tool == "erase":
            return
        x, y = self._xy(e)
        r = int(self.brush.get())
        h, w = self.rgba.shape[:2]
        y0, y1, x0, x1 = max(0, y - r), min(h, y + r + 1), max(0, x - r), min(w, x + r + 1)
        if y1 <= y0 or x1 <= x0:
            return
        yy, xx = np.mgrid[y0:y1, x0:x1]
        m = (yy - y) ** 2 + (xx - x) ** 2 <= r * r
        if button_tool == "erase":
            self.rgba[y0:y1, x0:x1, 3][m] = 0
        else:
            sub = self.rgba[y0:y1, x0:x1]
            sub[..., :3][m] = self.raw[y0:y1, x0:x1][m]
            sub[..., 3][m] = 255
        self.redraw()

    def magic(self, x: int, y: int) -> None:
        """Erase the connected patch of colours within tolerance of the clicked pixel."""
        h, w = self.rgba.shape[:2]
        if not (0 <= x < w and 0 <= y < h) or self.rgba[y, x, 3] == 0:
            return
        tol = self.tolerance.get() / 100
        seed = self.lab[y, x]
        close = (np.linalg.norm(self.lab - seed, axis=-1) <= tol) & (self.rgba[..., 3] > 0)
        seen = np.zeros((h, w), dtype=bool)
        q = deque([(y, x)])
        seen[y, x] = True
        n = 0
        while q:
            cy, cx = q.popleft()
            n += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and close[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx))
        self.rgba[seen, 3] = 0
        self.status.configure(text=f"Magic erase removed {n} pixels (tolerance {tol:.2f}). Undo if that was too much.")
        self.redraw()

    def do_undo(self) -> None:
        if self.undo:
            self.rgba = self.undo.pop()
            self.redraw()

    def revert(self) -> None:
        self.undo.append(self.rgba.copy())
        self.rgba = self.auto.copy()
        self.redraw()

    def save(self) -> None:
        Image.fromarray(self.rgba, "RGBA").save(self.path)
        self.status.configure(text=f"Saved {self.path.name}. The next steps use this cutout.")
        if self.on_save:
            self.on_save()


def open_editor(master, view_path, on_save=None) -> CutoutEditor:
    try:
        return CutoutEditor(master, view_path, on_save)
    except Exception as e:  # noqa: BLE001
        messagebox.showerror("Cutout editor", f"Could not open {view_path}:\n{e}")
        raise
