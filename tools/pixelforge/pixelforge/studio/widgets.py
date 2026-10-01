"""Widgets the Studio's pages are built from. Everything draws in the window; nothing here opens another window.

- :class:`ScrollFrame`   a page that scrolls and wraps its text to the pane width
- :class:`ZoomCanvas`    a picture at fit / 1x / 2x / 4x with scrollbars; the editors draw on it
- :class:`PreviewArea`   a ZoomCanvas with its zoom bar and a caption
- :class:`ThumbStrip`    pictures side by side with their names and buttons under each
- :class:`AnimPlayer`    plays a clip from a direction (frames or renders) in the page
- :class:`Form`          a form from a small field spec (file, dir, text, int, float, choice, check, slider)
- :class:`Note`          an inline message (plain, good, warning) instead of a pop-up
- :class:`Confirm`       an inline Yes / Cancel bar for the few things that need asking
- :class:`Collapsible`   a header that opens and closes a section
- :class:`Toolbar`       a strip of tool buttons, one of which is "on"
- :class:`ColourPicker`  swatches + a hex box, in the window
- :class:`Tooltip`       a hover hint placed inside the window
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from . import theme as T

_tk = None


def tk():
    """tkinter, imported on first use (the package stays importable without Tk)."""
    global _tk
    if _tk is None:
        import tkinter
        from tkinter import ttk
        from PIL import ImageTk

        tkinter.ttk = ttk
        tkinter.ImageTk = ImageTk
        _tk = tkinter
    return _tk


# --------------------------------------------------------------------------- images
def to_pil(src) -> Image.Image | None:
    if src is None:
        return None
    if isinstance(src, Image.Image):
        return src.convert("RGBA")
    if isinstance(src, np.ndarray):
        return Image.fromarray(src, "RGBA" if src.ndim == 3 and src.shape[2] == 4 else None).convert("RGBA")
    p = Path(src)
    if not p.exists():
        return None
    try:
        return Image.open(p).convert("RGBA")
    except Exception:  # noqa: BLE001
        return None


def on_dark(im: Image.Image, bg=(43, 46, 52, 255)) -> Image.Image:
    base = Image.new("RGBA", im.size, bg)
    return Image.alpha_composite(base, im)


def checker(w: int, h: int, cell: int = 8, a=(58, 62, 70), b=(46, 49, 56)) -> Image.Image:
    ys, xs = np.mgrid[0:h, 0:w]
    m = ((xs // cell + ys // cell) % 2).astype(bool)
    arr = np.where(m[..., None], np.array(a, np.uint8), np.array(b, np.uint8)).astype(np.uint8)
    return Image.fromarray(np.dstack([arr, np.full((h, w), 255, np.uint8)]), "RGBA")


def fit_scale(w: int, h: int, box_w: int, box_h: int) -> float:
    if w <= 0 or h <= 0:
        return 1.0
    return max(0.05, min(box_w / w, box_h / h))


def scaled(im: Image.Image, z: float) -> Image.Image:
    if abs(z - 1.0) < 1e-6:
        return im
    size = (max(1, int(round(im.width * z))), max(1, int(round(im.height * z))))
    return im.resize(size, Image.NEAREST if z >= 1 else Image.LANCZOS)


# ----------------------------------------------------------------------- text helpers
def heading(parent, text: str, sub: str = "", pady=(0, 6)):
    t = tk()
    lbl = t.ttk.Label(parent, text=text, style="Head.TLabel")
    lbl.pack(anchor="w", pady=(pady[0], 0))
    if sub:
        para(parent, sub, style="Dim.TLabel", pady=(2, pady[1]))
    return lbl


def para(parent, text: str, style: str = "TLabel", pady=(0, 6), anchor="w", **kw):
    """A paragraph that wraps to the pane width (ScrollFrame re-wraps it on resize)."""
    t = tk()
    lbl = t.ttk.Label(parent, text=text, style=style, justify="left", wraplength=700, **kw)
    lbl._wrap = True
    lbl.pack(anchor=anchor, pady=pady, fill="x")
    return lbl


def steps_text(parent, lines: list[str], pady=(0, 8)):
    return para(parent, "\n".join(f"{i + 1}. {s}" for i, s in enumerate(lines)), pady=pady)


def rewrap(widget, width: int) -> None:
    """Set the wraplength of every wrapping label under ``widget`` to the available width."""
    t = tk()
    try:
        kids = widget.winfo_children()
    except Exception:  # noqa: BLE001
        return
    for w in kids:
        if getattr(w, "_wrap", False):
            try:
                w.configure(wraplength=max(200, width))
            except Exception:  # noqa: BLE001
                pass
        if isinstance(w, (t.ttk.Frame, t.Frame, t.ttk.Labelframe)):
            pad = 24 if isinstance(w, t.ttk.Labelframe) else 0
            rewrap(w, width - pad)


def hsep(parent, pady=8):
    tk().ttk.Separator(parent).pack(fill="x", pady=pady)


# ------------------------------------------------------------------------ ScrollFrame
class ScrollFrame:
    """A vertical scrolling page: build into ``.inner``. The inner frame follows the canvas width and the wrapping
    labels follow it. The wheel scrolls it while the pointer is over it."""

    def __init__(self, parent, padding: int = 14, bg: str = T.PANEL):
        t = tk()
        self.outer = t.ttk.Frame(parent)
        self.canvas = t.Canvas(self.outer, bg=bg, highlightthickness=0, bd=0)
        self.vbar = t.ttk.Scrollbar(self.outer, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self.vbar.set)
        self.vbar.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)
        self.inner = t.ttk.Frame(self.canvas, padding=padding)
        self.padding = padding
        self._win = self.canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.inner.bind("<Configure>", self._on_inner)
        self.canvas.bind("<Configure>", self._on_canvas)
        for w in (self.canvas, self.inner):
            w.bind("<Enter>", self._bind_wheel)
            w.bind("<Leave>", self._unbind_wheel)
        self._wheel_bound = False

    def pack(self, **kw):
        self.outer.pack(**kw)
        return self

    def grid(self, **kw):
        self.outer.grid(**kw)
        return self

    def _on_inner(self, _e=None):
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        h = self.inner.winfo_reqheight()
        self.vbar.pack(side="right", fill="y") if h > self.canvas.winfo_height() else None

    def _on_canvas(self, e):
        self.canvas.itemconfigure(self._win, width=e.width)
        rewrap(self.inner, e.width - 2 * self.padding - 8)

    def _bind_wheel(self, _e=None):
        self.canvas.bind_all("<MouseWheel>", self._wheel)
        self.canvas.bind_all("<Button-4>", self._wheel)
        self.canvas.bind_all("<Button-5>", self._wheel)
        self._wheel_bound = True

    def _unbind_wheel(self, _e=None):
        if self._wheel_bound:
            for s in ("<MouseWheel>", "<Button-4>", "<Button-5>"):
                self.canvas.unbind_all(s)
            self._wheel_bound = False

    def _wheel(self, e):
        if self.inner.winfo_reqheight() <= self.canvas.winfo_height():
            return
        if getattr(e, "num", None) == 4 or getattr(e, "delta", 0) > 0:
            self.canvas.yview_scroll(-2, "units")
        else:
            self.canvas.yview_scroll(2, "units")

    def scroll_top(self):
        self.canvas.yview_moveto(0)

    def clear(self):
        for w in self.inner.winfo_children():
            w.destroy()
        self.scroll_top()

    def refit(self):
        """After rebuilding the content, wrap the labels to the current width."""
        w = self.canvas.winfo_width()
        if w > 1:
            rewrap(self.inner, w - 2 * self.padding - 8)


# ------------------------------------------------------------------------- ZoomCanvas
ZOOM_STEPS = [0.125, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12]
MAX_DISPLAY_PX = 24_000_000


class ZoomCanvas:
    """A picture on a canvas at a zoom, with scrollbars when it is bigger than the view. ``mode`` is "fit" or a zoom
    factor. Subclasses or owners draw on top through ``decorate(display_rgba)`` (pixel overlays, before scaling) and
    ``after_draw()`` (canvas items, after)."""

    def __init__(self, parent, bg: str = T.CANVAS_BG, height: int = 320, checkerboard: bool = False):
        t = tk()
        self.frame = t.ttk.Frame(parent)
        self.canvas = t.Canvas(self.frame, bg=bg, highlightthickness=0, bd=0, height=height)
        self.hbar = t.ttk.Scrollbar(self.frame, orient="horizontal", command=self.canvas.xview)
        self.vbar = t.ttk.Scrollbar(self.frame, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(xscrollcommand=self.hbar.set, yscrollcommand=self.vbar.set)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.vbar.grid(row=0, column=1, sticky="ns")
        self.hbar.grid(row=1, column=0, sticky="ew")
        self.frame.rowconfigure(0, weight=1)
        self.frame.columnconfigure(0, weight=1)
        self.image: Image.Image | None = None
        self.mode = "fit"
        self.zoom = 1.0
        self.ox = self.oy = 0
        self.photo = None
        self.checkerboard = checkerboard
        self.decorate = None
        self.after_draw = None
        self.on_zoom = None
        self.canvas.bind("<Configure>", lambda e: self.redraw() if self.mode == "fit" else self._center())
        self._items = []

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def grid(self, **kw):
        self.frame.grid(**kw)
        return self

    # ---------------------------------------------------------------- content
    def set_image(self, src, keep_zoom: bool = True) -> None:
        im = to_pil(src)
        self.image = im
        if not keep_zoom:
            self.mode = "fit"
        self.redraw()

    def set_mode(self, mode) -> None:
        self.mode = mode
        self.redraw()

    def zoom_in(self) -> None:
        z = self.zoom
        nxt = next((s for s in ZOOM_STEPS if s > z + 1e-6), ZOOM_STEPS[-1])
        self.set_mode(nxt)

    def zoom_out(self) -> None:
        z = self.zoom
        prv = next((s for s in reversed(ZOOM_STEPS) if s < z - 1e-6), ZOOM_STEPS[0])
        self.set_mode(prv)

    def view_size(self) -> tuple[int, int]:
        w, h = self.canvas.winfo_width(), self.canvas.winfo_height()
        if w < 2 or h < 2:
            w, h = int(self.canvas.cget("width") or 640), int(self.canvas.cget("height") or 320)
        return w, h

    def redraw(self) -> None:
        c = self.canvas
        c.delete("all")
        self.photo = None
        if self.image is None:
            return
        w, h = self.image.size
        vw, vh = self.view_size()
        z = fit_scale(w, h, vw - 4, vh - 4) if self.mode == "fit" else float(self.mode)
        if self.mode == "fit":
            z = min(z, 8.0)
        while w * h * z * z > MAX_DISPLAY_PX and z > 0.1:
            z = z / 2
        self.zoom = z
        rgba = np.array(self.image)
        if self.decorate is not None:
            rgba = self.decorate(rgba)
        im = Image.fromarray(rgba, "RGBA")
        bg = checker(w, h) if self.checkerboard else None
        im = Image.alpha_composite(bg, im) if bg is not None else on_dark(im)
        im = scaled(im, z)
        self.photo = tk().ImageTk.PhotoImage(im)
        self.disp_w, self.disp_h = im.size
        self._center()
        if self.on_zoom:
            self.on_zoom(z)

    def _center(self) -> None:
        c = self.canvas
        if self.photo is None:
            return
        vw, vh = self.view_size()
        self.ox = max(0, (vw - self.disp_w) // 2)
        self.oy = max(0, (vh - self.disp_h) // 2)
        c.delete("all")
        c.create_image(self.ox, self.oy, anchor="nw", image=self.photo, tags=("picture",))
        c.configure(scrollregion=(0, 0, max(vw, self.disp_w + self.ox), max(vh, self.disp_h + self.oy)))
        if self.after_draw is not None:
            self.after_draw()

    # ------------------------------------------------------------ coordinates
    def to_image(self, ex: float, ey: float) -> tuple[int, int]:
        """Event coordinates -> image pixel (may be outside the picture)."""
        x = (self.canvas.canvasx(ex) - self.ox) / self.zoom
        y = (self.canvas.canvasy(ey) - self.oy) / self.zoom
        return int(np.floor(x)), int(np.floor(y))

    def to_image_f(self, ex: float, ey: float) -> tuple[float, float]:
        return (self.canvas.canvasx(ex) - self.ox) / self.zoom, (self.canvas.canvasy(ey) - self.oy) / self.zoom

    def from_image(self, x: float, y: float) -> tuple[float, float]:
        return self.ox + x * self.zoom, self.oy + y * self.zoom

    def inside(self, x: int, y: int) -> bool:
        if self.image is None:
            return False
        return 0 <= x < self.image.width and 0 <= y < self.image.height


class PreviewArea:
    """A ZoomCanvas with its zoom bar (Fit · 1x · 2x · 4x · + · −), a caption and room for buttons under it."""

    def __init__(self, parent, height: int = 320, caption: str = "", checkerboard: bool = False):
        t = tk()
        self.frame = t.ttk.Frame(parent)
        self.view = ZoomCanvas(self.frame, height=height, checkerboard=checkerboard)
        self.view.pack(fill="both", expand=True)
        bar = t.ttk.Frame(self.frame)
        bar.pack(fill="x", pady=(4, 0))
        self.caption = t.ttk.Label(bar, text=caption, style="Dim.TLabel")
        self.caption.pack(side="left")
        self.zoom_label = t.ttk.Label(bar, text="", style="Small.TLabel", width=6, anchor="e")
        self.zoom_label.pack(side="right", padx=(6, 0))
        for label, mode in (("−", "out"), ("+", "in"), ("4x", 4), ("2x", 2), ("1x", 1), ("Fit", "fit")):
            cmd = (self.view.zoom_in if mode == "in" else self.view.zoom_out if mode == "out" else (lambda m=mode: self.view.set_mode(m)))
            t.ttk.Button(bar, text=label, width=3 if len(label) < 3 else 4, command=cmd, style="Tool.TButton").pack(side="right", padx=1)
        self.actions = t.ttk.Frame(self.frame)
        self.actions.pack(fill="x", pady=(4, 0))
        self.view.on_zoom = lambda z: self.zoom_label.configure(text=f"{z:.2g}x" if z < 1 else f"{z:g}x")

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def show(self, src, caption: str | None = None, keep_zoom: bool = False) -> bool:
        self.view.set_image(src, keep_zoom=keep_zoom)
        if caption is not None:
            self.caption.configure(text=caption)
        return self.view.image is not None

    def clear(self, caption: str = "") -> None:
        self.view.set_image(None)
        self.caption.configure(text=caption)
        self.zoom_label.configure(text="")


# ------------------------------------------------------------------------- ThumbStrip
class ThumbStrip:
    """Pictures in a row (wrapping to the width), each with its name and buttons under it. ``on_click(path)`` opens
    it large."""

    def __init__(self, parent, height: int = 200, on_click=None):
        t = tk()
        self.frame = t.ttk.Frame(parent)
        self.height = height
        self.on_click = on_click
        self._photos = []
        self._cells = []
        self.frame.bind("<Configure>", self._reflow)
        self._cols = 0

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def set(self, items, actions=()) -> int:
        """items: paths or (path, caption) pairs; actions: [(label, fn(path))]. Returns how many pictures were shown."""
        t = tk()
        for w in self.frame.winfo_children():
            w.destroy()
        self._photos.clear()
        self._cells.clear()
        n = 0
        for item in items:
            path, caption = (item if isinstance(item, tuple) else (item, Path(item).name))
            im = to_pil(path)
            if im is None:
                continue
            s = self.height / max(1, im.height)
            im = on_dark(scaled(im, min(s, 6.0)))
            photo = t.ImageTk.PhotoImage(im)
            self._photos.append(photo)
            cell = t.ttk.Frame(self.frame, style="Card.TFrame", padding=6)
            pic = t.ttk.Label(cell, image=photo, style="Card.TLabel")
            pic.pack()
            if self.on_click:
                pic.bind("<Button-1>", lambda e, p=path: self.on_click(p))
                pic.configure(cursor="hand2")
            t.ttk.Label(cell, text=caption, style="CardDim.TLabel").pack(pady=(3, 0))
            if actions:
                row = t.ttk.Frame(cell, style="Card.TFrame")
                row.pack(pady=(4, 0))
                for label, fn in actions:
                    t.ttk.Button(row, text=label, width=max(4, len(label) + 1), command=lambda fn=fn, p=path: fn(p), style="Tool.TButton").pack(side="left", padx=1)
            self._cells.append(cell)
            n += 1
        self._cols = 0
        self._reflow()
        return n

    def _reflow(self, _e=None):
        if not self._cells:
            return
        width = max(self.frame.winfo_width(), 200)
        cell_w = max(c.winfo_reqwidth() for c in self._cells) + 8
        cols = max(1, width // cell_w)
        if cols == self._cols:
            return
        self._cols = cols
        for i, c in enumerate(self._cells):
            c.grid(row=i // cols, column=i % cols, padx=4, pady=4, sticky="n")


# ------------------------------------------------------------------------- AnimPlayer
DIRS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]


class AnimPlayer:
    """Plays one clip from one direction, in the page. ``set_source(folder, "frames" | "renders")`` lists the clips;
    ``on_gif(clip, direction)`` is the Save GIF hook."""

    def __init__(self, parent, on_gif=None, height: int = 260, simple: bool = False):
        t = tk()
        self.frame = t.ttk.Frame(parent)
        bar = t.ttk.Frame(self.frame)
        bar.pack(fill="x")
        self.clip = t.StringVar()
        self.direction = t.StringVar(value="S")
        self.speed = t.DoubleVar(value=1.0)
        self.playing = True
        self.clip_box = t.ttk.Combobox(bar, textvariable=self.clip, values=[], width=9, state="readonly")
        if not simple:
            t.ttk.Label(bar, text="Clip").pack(side="left")
            self.clip_box.pack(side="left", padx=4)
            t.ttk.Label(bar, text="Facing").pack(side="left")
            t.ttk.Combobox(bar, textvariable=self.direction, values=DIRS, width=4, state="readonly").pack(side="left", padx=4)
        self.play_btn = t.ttk.Button(bar, text="Pause", width=6, command=self.toggle, style="Tool.TButton")
        self.play_btn.pack(side="left", padx=(8, 2))
        t.ttk.Label(bar, text="Speed").pack(side="left", padx=(8, 2))
        t.ttk.Scale(bar, from_=0.25, to=2.0, variable=self.speed, orient="horizontal", length=80).pack(side="left")
        if on_gif:
            t.ttk.Button(bar, text="Save GIF", command=lambda: on_gif(self.clip.get(), self.direction.get()), style="Tool.TButton").pack(side="left", padx=8)
        self.info = t.ttk.Label(bar, text="", style="Small.TLabel")
        self.info.pack(side="right")
        self.view = PreviewArea(self.frame, height=height)
        self.view.pack(fill="both", expand=True, pady=(4, 0))
        self.frames: list[Image.Image] = []
        self.i = 0
        self.job = None
        self.fps = 10.0
        self.root_dir: Path | None = None
        self.source = "frames"
        self.clip.trace_add("write", lambda *_: self.load())
        self.direction.trace_add("write", lambda *_: self.load())

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def set_source(self, root_dir, source: str = "frames", fps: float = 10.0) -> int:
        self.root_dir = Path(root_dir)
        self.source = source
        self.fps = fps
        if source == "frames":
            clips = sorted({p.name.rsplit("_", 1)[0] for p in self.root_dir.glob("*_S") if p.is_dir()})
        else:
            clips = sorted(p.name for p in self.root_dir.iterdir() if p.is_dir() and (p / "S").is_dir()) if self.root_dir.exists() else []
        self.clip_box.configure(values=clips)
        if clips:
            self.clip.set("walk" if "walk" in clips else clips[0])
        else:
            self.frames = []
            self.view.clear("Nothing to play yet.")
        return len(clips)

    def set_frames(self, frames: list, fps: float = 10.0, caption: str = "") -> None:
        self.frames = [to_pil(f) for f in frames]
        self.fps = fps
        self.i = 0
        self.view.caption.configure(text=caption)
        self.info.configure(text=f"{len(self.frames)} frames")
        self.start()

    def load(self) -> None:
        if self.root_dir is None or not self.clip.get():
            return
        d = self.root_dir / f"{self.clip.get()}_{self.direction.get()}" if self.source == "frames" else self.root_dir / self.clip.get() / self.direction.get()
        frames = [to_pil(p) for p in sorted(d.glob("frame_*.png"))]
        self.frames = [f for f in frames if f is not None]
        self.i = 0
        self.info.configure(text=f"{len(self.frames)} frames" if self.frames else f"no frames in {d.name}")
        if self.frames:
            self.view.show(self.frames[0], caption=f"{self.clip.get()} facing {self.direction.get()}", keep_zoom=True)
            if self.view.view.mode == "fit" and self.frames[0].height < 200:
                self.view.view.set_mode(2 if self.frames[0].height < 160 else 1)
        self.start()

    def start(self) -> None:
        self.stop()
        if self.frames and self.playing:
            self.tick()

    def stop(self) -> None:
        if self.job is not None:
            try:
                self.frame.after_cancel(self.job)
            except Exception:  # noqa: BLE001
                pass
            self.job = None

    def toggle(self) -> None:
        self.playing = not self.playing
        self.play_btn.configure(text="Pause" if self.playing else "Play")
        self.start() if self.playing else self.stop()

    def tick(self) -> None:
        if not self.frames:
            return
        self.view.view.set_image(self.frames[self.i % len(self.frames)], keep_zoom=True)
        self.i += 1
        delay = int(1000 / max(1.0, self.fps * float(self.speed.get())))
        self.job = self.frame.after(delay, self.tick)


# ------------------------------------------------------------------------------ Form
class Form:
    """Rows of labelled inputs from a field spec. A field is ``(name, kind, default, choices)`` or a dict with
    ``name, kind, default, choices, label, help, lo, hi``. Kinds: file, dir, text, int, float, choice, check,
    slider, multiline. ``values()`` returns typed values; ``on_change`` fires on every edit."""

    def __init__(self, parent, fields, base_dir: str | Path | None = None, on_change=None, label_width: int = 18, entry_width: int = 44,
                 filetypes=None):
        t = tk()
        self.frame = t.ttk.Frame(parent)
        self.base = Path(base_dir) if base_dir else None
        self.on_change = on_change
        self.vars: dict = {}
        self.kinds: dict = {}
        self.defaults: dict = {}
        self.filetypes = filetypes or [("Images", "*.png *.jpg *.jpeg *.webp"), ("All files", "*.*")]
        for f in fields:
            spec = f if isinstance(f, dict) else {"name": f[0], "kind": f[1], "default": f[2], "choices": f[3] if len(f) > 3 else None}
            self._row(spec, label_width, entry_width)

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def _row(self, spec: dict, label_width: int, entry_width: int) -> None:
        t = tk()
        name, kind, default = spec["name"], spec["kind"], spec.get("default", "")
        row = t.ttk.Frame(self.frame)
        row.pack(fill="x", pady=2)
        t.ttk.Label(row, text=spec.get("label") or name.replace("_", " "), width=label_width, anchor="w").pack(side="left")
        self.kinds[name] = kind
        self.defaults[name] = default
        if kind == "check":
            var = t.BooleanVar(value=bool(default))
            t.ttk.Checkbutton(row, variable=var, command=self._changed).pack(side="left")
        elif kind == "choice":
            var = t.StringVar(value=str(default))
            cb = t.ttk.Combobox(row, textvariable=var, values=list(spec.get("choices") or []), state="readonly", width=max(10, min(22, max((len(str(c)) for c in spec.get("choices") or [""]), default=10) + 2)))
            cb.pack(side="left")
            cb.bind("<<ComboboxSelected>>", lambda e: self._changed())
        elif kind == "slider":
            var = t.DoubleVar(value=float(default))
            lo, hi = float(spec.get("lo", 0)), float(spec.get("hi", 1))
            val = t.ttk.Label(row, text=self._fmt(var.get()), width=7, anchor="e")
            sc = t.ttk.Scale(row, from_=lo, to=hi, variable=var, orient="horizontal", length=160, command=lambda _v, v=var, lab=val: (lab.configure(text=self._fmt(v.get())), self._changed()))
            sc.pack(side="left")
            sc.bind("<Double-Button-1>", lambda e, v=var, d=default, lab=val: (v.set(float(d)), lab.configure(text=self._fmt(float(d))), self._changed()))
            val.pack(side="left", padx=(4, 0))
        elif kind == "multiline":
            var = t.Text(row, height=3, width=entry_width, wrap="word", font=T.FONT, bg=T.FIELD, fg=T.BONE, insertbackground=T.BONE, relief="flat", highlightthickness=1, highlightbackground=T.BORDER)
            var.insert("1.0", str(default))
            var.pack(side="left", fill="x", expand=True)
            var.bind("<KeyRelease>", lambda e: self._changed())
        else:
            var = t.StringVar(value=str(default))
            e = t.ttk.Entry(row, textvariable=var, width=entry_width)
            e.pack(side="left", fill="x", expand=True if kind in ("file", "dir", "text") else False)
            e.bind("<KeyRelease>", lambda ev: self._changed())
            if kind == "file":
                t.ttk.Button(row, text="Choose…", command=lambda v=var: self._pick_file(v), style="Tool.TButton").pack(side="left", padx=4)
            elif kind == "dir":
                t.ttk.Button(row, text="Folder…", command=lambda v=var: self._pick_dir(v), style="Tool.TButton").pack(side="left", padx=4)
        self.vars[name] = var
        if spec.get("help"):
            para(self.frame, spec["help"], style="Small.TLabel", pady=(0, 2))

    @staticmethod
    def _fmt(v: float) -> str:
        return f"{v:.2f}" if abs(v) < 10 else f"{v:.0f}"

    def _pick_file(self, var) -> None:
        from tkinter import filedialog

        p = filedialog.askopenfilename(filetypes=self.filetypes)
        if p:
            var.set(p)
            self._changed()

    def _pick_dir(self, var) -> None:
        from tkinter import filedialog

        p = filedialog.askdirectory()
        if p:
            var.set(p)
            self._changed()

    def _changed(self) -> None:
        if self.on_change:
            self.on_change()

    def get(self, name: str):
        var, kind = self.vars[name], self.kinds[name]
        t = tk()
        if isinstance(var, t.Text):
            return var.get("1.0", "end").strip()
        v = var.get()
        if kind == "check":
            return bool(v)
        if kind == "int":
            try:
                return int(float(str(v).strip() or 0))
            except ValueError:
                return self.defaults[name]
        if kind in ("float", "slider"):
            try:
                return float(str(v).strip() or 0)
            except ValueError:
                return float(self.defaults[name] or 0)
        v = str(v)
        if kind in ("dir", "file") and v and self.base is not None and not Path(v).is_absolute() and kind == "dir":
            return str(self.base / v)
        return v

    def values(self) -> dict:
        return {k: self.get(k) for k in self.vars}

    def set(self, name: str, value) -> None:
        var = self.vars[name]
        t = tk()
        if isinstance(var, t.Text):
            var.delete("1.0", "end")
            var.insert("1.0", str(value))
        else:
            var.set(value)

    def reset(self) -> None:
        for k, d in self.defaults.items():
            self.set(k, d)
        self._changed()


# ------------------------------------------------------------------------------ Note
class Note:
    """One line (or a few) of feedback inside the page: ``say(text)``, ``good(text)``, ``warn(text)``."""

    def __init__(self, parent, pady=(6, 0)):
        t = tk()
        self.label = t.ttk.Label(parent, text="", style="Dim.TLabel", justify="left", wraplength=700)
        self.label._wrap = True
        self.pady = pady
        self.label.pack(anchor="w", pady=pady, fill="x")

    def say(self, text: str, kind: str = "info") -> None:
        style = {"info": "Dim.TLabel", "good": "Good.TLabel", "warn": "Warn.TLabel", "stop": "Stop.TLabel"}.get(kind, "Dim.TLabel")
        self.label.configure(text=text, style=style)

    def good(self, text: str) -> None:
        self.say(text, "good")

    def warn(self, text: str) -> None:
        self.say(text, "warn")

    def clear(self) -> None:
        self.label.configure(text="")


class Confirm:
    """An inline question with Yes / Cancel, for the few destructive things. ``ask(text, yes, on_yes)`` shows it."""

    def __init__(self, parent):
        t = tk()
        self.frame = t.ttk.Frame(parent, style="Card.TFrame", padding=8)
        self.text = t.ttk.Label(self.frame, text="", style="Card.TLabel", wraplength=600, justify="left")
        self.text._wrap = True
        self.text.pack(side="left", fill="x", expand=True)
        self.yes = t.ttk.Button(self.frame, text="Yes", style="Go.TButton")
        self.yes.pack(side="left", padx=6)
        t.ttk.Button(self.frame, text="Cancel", command=self.hide).pack(side="left")
        self._on_yes = None

    def ask(self, text: str, yes: str, on_yes, before=None) -> None:
        self.text.configure(text=text)
        self.yes.configure(text=yes, command=lambda: (self.hide(), on_yes()))
        if before is not None:
            self.frame.pack(fill="x", pady=6, before=before)
        else:
            self.frame.pack(fill="x", pady=6)

    def hide(self) -> None:
        self.frame.pack_forget()


class Collapsible:
    """A header that opens and closes its ``body``."""

    def __init__(self, parent, title: str, open: bool = False, style_head: str = "Sub.TLabel"):
        t = tk()
        self.frame = t.ttk.Frame(parent)
        self.open = open
        self.title = title
        self.head = t.ttk.Label(self.frame, text="", style=style_head, cursor="hand2")
        self.head.pack(anchor="w", fill="x")
        self.head.bind("<Button-1>", lambda e: self.toggle())
        self.body = t.ttk.Frame(self.frame)
        self._label()
        if open:
            self.body.pack(fill="x")

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def _label(self):
        self.head.configure(text=("▾ " if self.open else "▸ ") + self.title)

    def toggle(self, open: bool | None = None) -> None:
        self.open = (not self.open) if open is None else open
        self._label()
        if self.open:
            self.body.pack(fill="x")
        else:
            self.body.pack_forget()


class Toolbar:
    """A strip of tool buttons; ``set_active(key)`` lights one (Photoshop-style tool choice)."""

    def __init__(self, parent, vertical: bool = False, on_pick=None):
        t = tk()
        self.frame = t.ttk.Frame(parent, style="Tool.TFrame", padding=3)
        self.vertical = vertical
        self.buttons: dict = {}
        self.active = None
        self.on_pick = on_pick
        self.tips: dict = {}

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def add_tool(self, key: str, glyph: str, tip: str, command=None, width: int = 3) -> None:
        t = tk()
        b = t.ttk.Button(self.frame, text=glyph, width=width, style="Tool.TButton", command=(lambda k=key: self.pick(k)) if command is None else command)
        b.pack(side="top" if self.vertical else "left", pady=1 if self.vertical else 0, padx=0 if self.vertical else 1)
        self.buttons[key] = b
        Tooltip(b, tip)

    def add_button(self, text: str, command, tip: str = "", width: int | None = None, style: str = "Tool.TButton") -> None:
        t = tk()
        b = t.ttk.Button(self.frame, text=text, command=command, style=style, **({"width": width} if width else {}))
        b.pack(side="top" if self.vertical else "left", pady=1 if self.vertical else 0, padx=0 if self.vertical else 2)
        if tip:
            Tooltip(b, tip)
        return b

    def add_sep(self) -> None:
        t = tk()
        if self.vertical:
            t.ttk.Separator(self.frame, orient="horizontal").pack(fill="x", pady=4)
        else:
            t.ttk.Separator(self.frame, orient="vertical").pack(side="left", fill="y", padx=5)

    def add_widget(self, w, **pack) -> None:
        w.pack(side="top" if self.vertical else "left", **pack)

    def pick(self, key: str) -> None:
        self.set_active(key)
        if self.on_pick:
            self.on_pick(key)

    def set_active(self, key: str | None) -> None:
        self.active = key
        for k, b in self.buttons.items():
            b.configure(style="ToolOn.TButton" if k == key else "Tool.TButton")


class ColourPicker:
    """Swatches (the game's colours and the picture's own) with a hex box. ``on_pick(hex)`` fires on a choice."""

    GAME = ["#14161a", "#2a2630", "#4a4452", "#7a6f84", "#e8e2d2", "#bfb7a2", "#8a8070", "#1f4a46", "#2a6a63", "#4fd1c5", "#9ff4ea",
            "#c9a24a", "#e8c46a", "#7a3d10", "#b0563a", "#5a1d2a", "#3b2b5a", "#6c4a9a", "#a989d6", "#2b4a6a", "#4a7aa8", "#d6d0c0", "#ffffff", "#000000"]

    def __init__(self, parent, on_pick, title: str = "Colour", initial: str = "#4fd1c5"):
        t = tk()
        self.frame = t.ttk.Frame(parent)
        self.on_pick = on_pick
        self.value = initial
        head = t.ttk.Frame(self.frame)
        head.pack(fill="x")
        t.ttk.Label(head, text=title, style="Sub.TLabel").pack(side="left")
        self.swatch = t.Canvas(head, width=26, height=18, bg=initial, highlightthickness=1, highlightbackground=T.BORDER)
        self.swatch.pack(side="right")
        self.hex = t.StringVar(value=initial)
        e = t.ttk.Entry(self.frame, textvariable=self.hex, width=9)
        e.pack(anchor="w", pady=(2, 4))
        e.bind("<Return>", lambda ev: self.set(self.hex.get(), fire=True))
        e.bind("<FocusOut>", lambda ev: self.set(self.hex.get(), fire=True))
        self.grid = t.ttk.Frame(self.frame)
        self.grid.pack(anchor="w")
        self.own = t.ttk.Frame(self.frame)
        self.own.pack(anchor="w", pady=(4, 0))
        self._fill(self.grid, self.GAME)

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def _fill(self, frame, colours: list[str], cols: int = 8) -> None:
        t = tk()
        for w in frame.winfo_children():
            w.destroy()
        for i, c in enumerate(colours):
            sw = t.Canvas(frame, width=18, height=18, bg=c, highlightthickness=1, highlightbackground=T.BORDER, cursor="hand2")
            sw.grid(row=i // cols, column=i % cols, padx=1, pady=1)
            sw.bind("<Button-1>", lambda e, c=c: self.set(c, fire=True))

    def set_swatches(self, colours: list[str]) -> None:
        self._fill(self.own, colours)

    def set(self, value: str, fire: bool = False) -> None:
        v = value.strip()
        if not v.startswith("#"):
            v = "#" + v
        if len(v) != 7:
            return
        try:
            int(v[1:], 16)
        except ValueError:
            return
        self.value = v.lower()
        self.hex.set(self.value)
        self.swatch.configure(bg=self.value)
        if fire and self.on_pick:
            self.on_pick(self.value)


class Tooltip:
    """A hover hint drawn inside the window (a placed label on the toplevel), not a separate window."""

    def __init__(self, widget, text: str, delay: int = 500):
        self.widget = widget
        self.text = text
        self.delay = delay
        self.job = None
        self.label = None
        widget.bind("<Enter>", self._enter, add="+")
        widget.bind("<Leave>", self._leave, add="+")
        widget.bind("<ButtonPress>", self._leave, add="+")

    def _enter(self, _e=None):
        self.job = self.widget.after(self.delay, self._show)

    def _show(self):
        t = tk()
        top = self.widget.winfo_toplevel()
        x = self.widget.winfo_rootx() - top.winfo_rootx()
        y = self.widget.winfo_rooty() - top.winfo_rooty() + self.widget.winfo_height() + 4
        self.label = t.Label(top, text=self.text, bg=T.BTN_HI, fg=T.BONE, font=T.FONT_S, padx=6, pady=3, relief="flat", bd=0,
                             highlightthickness=1, highlightbackground=T.BORDER, justify="left", wraplength=320)
        self.label.place(x=x, y=y)
        self.label.update_idletasks()
        tw = self.label.winfo_reqwidth()
        if x + tw > top.winfo_width() - 4:
            self.label.place(x=max(4, top.winfo_width() - tw - 4), y=y)
        self.label.lift()

    def _leave(self, _e=None):
        if self.job:
            try:
                self.widget.after_cancel(self.job)
            except Exception:  # noqa: BLE001
                pass
            self.job = None
        if self.label is not None:
            self.label.destroy()
            self.label = None


class LabeledScale:
    """A slider with its name and live value; double-click resets to the default."""

    def __init__(self, parent, text: str, var, lo: float, hi: float, command=None, length: int = 120, fmt="{:.2f}", default=None, side="top"):
        t = tk()
        self.frame = t.ttk.Frame(parent)
        self.var = var
        self.fmt = fmt
        self.default = var.get() if default is None else default
        row = t.ttk.Frame(self.frame)
        row.pack(fill="x")
        t.ttk.Label(row, text=text, style="Small.TLabel").pack(side="left")
        self.val = t.ttk.Label(row, text=self._text(), style="Small.TLabel")
        self.val.pack(side="right")
        self.scale = t.ttk.Scale(self.frame, from_=lo, to=hi, variable=var, orient="horizontal", length=length,
                                 command=lambda _v: (self.val.configure(text=self._text()), command(float(var.get())) if command else None))
        self.scale.pack(fill="x")
        self.scale.bind("<Double-Button-1>", lambda e: (var.set(self.default), self.val.configure(text=self._text()), command(float(var.get())) if command else None))

    def _text(self) -> str:
        try:
            return self.fmt.format(float(self.var.get()))
        except Exception:  # noqa: BLE001
            return str(self.var.get())

    def pack(self, **kw):
        self.frame.pack(**kw)
        return self

    def refresh(self):
        self.val.configure(text=self._text())


def read_json(path) -> dict:
    try:
        return json.loads(Path(path).read_text())
    except Exception:  # noqa: BLE001
        return {}
