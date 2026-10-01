"""PixelForge Studio - the desktop app (Tkinter, ships with Python on Windows).

Everything here calls :mod:`pixelforge.api`; the window is only buttons, text
boxes and previews around those functions.
"""

from __future__ import annotations

import queue
import threading
import traceback
import webbrowser
from pathlib import Path
from tkinter import BOTH, END, LEFT, RIGHT, TOP, X, Y, BooleanVar, StringVar, Tk, Toplevel, filedialog, messagebox
from tkinter import ttk
from tkinter.scrolledtext import ScrolledText

from PIL import Image, ImageTk

from . import api
from .project import STEPS, Project
from .prompts import DESCRIPTION_TIPS, EXAMPLE_DESCRIPTION
from .styles import STYLES

APP_TITLE = "PixelForge Studio"
# the game's look: near-black, bone text, teal for the thing to do next, dull gold for warnings. No bright red.
INK = "#14161a"; PANEL = "#1b1e24"; FIELD = "#23272f"; BONE = "#e8e2d2"; DIM = "#9a9484"; TEAL = "#4fd1c5"; GOLD = "#c9a24a"; RUST = "#b0563a"
FONT = ("Segoe UI", 10); FONT_B = ("Segoe UI", 10, "bold"); FONT_H = ("Segoe UI", 14, "bold"); FONT_T = ("Segoe UI", 18, "bold")


def apply_theme(root) -> None:
    st = ttk.Style(root)
    try:
        st.theme_use("clam")
    except Exception:  # noqa: BLE001
        pass
    root.configure(bg=INK)
    st.configure(".", background=PANEL, foreground=BONE, fieldbackground=FIELD, font=FONT, bordercolor="#2c313a", lightcolor=PANEL, darkcolor=INK)
    st.configure("TFrame", background=PANEL)
    st.configure("TLabel", background=PANEL, foreground=BONE)
    st.configure("Dim.TLabel", foreground=DIM)
    st.configure("Head.TLabel", foreground=TEAL, font=FONT_H)
    st.configure("Title.TLabel", foreground=BONE, font=FONT_T)
    st.configure("Good.TLabel", foreground=TEAL)
    st.configure("Warn.TLabel", foreground=GOLD)
    st.configure("TButton", background="#2a2f38", foreground=BONE, padding=(10, 5), borderwidth=1)
    st.map("TButton", background=[("active", "#38404c"), ("disabled", "#22262d")], foreground=[("disabled", DIM)])
    st.configure("Go.TButton", background="#1f4a46", foreground="#eafff8", font=FONT_B)
    st.map("Go.TButton", background=[("active", "#2a6a63")])
    st.configure("TEntry", fieldbackground=FIELD, foreground=BONE, insertcolor=BONE)
    st.configure("TCombobox", fieldbackground=FIELD, foreground=BONE, background="#2a2f38", arrowcolor=BONE)
    st.map("TCombobox", fieldbackground=[("readonly", FIELD)], foreground=[("readonly", BONE)])
    st.configure("TCheckbutton", background=PANEL, foreground=BONE)
    st.configure("TRadiobutton", background=PANEL, foreground=BONE)
    st.configure("TLabelframe", background=PANEL, foreground=DIM)
    st.configure("TLabelframe.Label", background=PANEL, foreground=DIM)
    st.configure("TPanedwindow", background=INK)
    st.configure("Treeview", background=FIELD, fieldbackground=FIELD, foreground=BONE, rowheight=26, borderwidth=0)
    st.map("Treeview", background=[("selected", "#1f4a46")], foreground=[("selected", "#eafff8")])
    st.configure("TScale", background=PANEL, troughcolor=FIELD)
    st.configure("TScrollbar", background="#2a2f38", troughcolor=INK, arrowcolor=BONE)
    st.configure("TSeparator", background="#2c313a")
    root.option_add("*Text.background", FIELD)
    root.option_add("*Text.foreground", BONE)
    root.option_add("*Text.insertBackground", BONE)
    root.option_add("*Text.font", "Consolas 10")
    root.option_add("*TCombobox*Listbox.background", FIELD)
    root.option_add("*TCombobox*Listbox.foreground", BONE)
HELP_URL = "https://github.com/Kaspa-World-Eater/godmarrow/blob/main/tools/pixelforge/docs/GUIDE_HUMANS.md"


class Studio:
    def __init__(self, root: Tk, project_path: str | None = None):
        apply_theme(root)
        self.root = root
        self.project: Project | None = None
        self.char = StringVar()
        self.log_queue: queue.Queue[str] = queue.Queue()
        self.busy = False
        self._previews: list = []  # keep PhotoImage refs alive
        root.title(APP_TITLE)
        root.geometry("1280x800")
        icon = Path(__file__).resolve().parent.parent / "assets" / "pixelforge.ico"
        if icon.exists():
            try:
                root.iconbitmap(str(icon))
            except Exception:  # noqa: BLE001  (non-Windows Tk)
                pass
        root.minsize(900, 600)
        self._build()
        root.after(100, self._drain_log)
        if project_path:
            self._open(project_path)

    # ------------------------------------------------------------------ layout
    def _build(self) -> None:
        bar = ttk.Frame(self.root, padding=6)
        bar.pack(side=TOP, fill=X)
        ttk.Button(bar, text="New project", command=self._new).pack(side=LEFT)
        ttk.Button(bar, text="Open project", command=self._open_dialog).pack(side=LEFT, padx=4)
        ttk.Label(bar, text="  Character:").pack(side=LEFT)
        self.char_box = ttk.Combobox(bar, textvariable=self.char, state="readonly", width=24)
        self.char_box.pack(side=LEFT)
        self.char_box.bind("<<ComboboxSelected>>", lambda e: self._refresh())
        ttk.Button(bar, text="+ Add character", command=self._add_character).pack(side=LEFT, padx=4)
        ttk.Button(bar, text="Settings", command=self._settings).pack(side=LEFT, padx=4)
        ttk.Button(bar, text="Tools", command=self._tools).pack(side=LEFT, padx=4)
        ttk.Button(bar, text="Help", command=lambda: webbrowser.open(HELP_URL)).pack(side=RIGHT)
        self.title_label = ttk.Label(bar, text="No project open", font=("Segoe UI", 10, "bold"))
        self.title_label.pack(side=RIGHT, padx=12)

        body = ttk.Panedwindow(self.root, orient="horizontal")
        body.pack(fill=BOTH, expand=True)
        left = ttk.Frame(body, padding=6)
        body.add(left, weight=0)
        ttk.Label(left, text="Steps", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.step_list = ttk.Treeview(left, columns=("state",), show="tree", height=len(STEPS) + 2, selectmode="browse")
        self.step_list.column("#0", width=330)
        for i, (key, title) in enumerate(STEPS):
            self.step_list.insert("", END, iid=key, text=f"{i + 1}. {title}")
        self.step_list.insert("", END, iid="still", text="★ Quick path: sprite + animation from one image")
        self.step_list.pack(fill=Y)
        self.step_list.bind("<<TreeviewSelect>>", lambda e: self._show_step())
        ttk.Button(left, text="▶ Run all automatic steps", command=self._run_all, style="Go.TButton").pack(fill=X, pady=(10, 2))
        ttk.Label(left, text="(stops at any step that needs you)", style="Dim.TLabel").pack(anchor="w")

        right = ttk.Panedwindow(body, orient="vertical")
        body.add(right, weight=1)
        self.panel = ttk.Frame(right, padding=10)
        right.add(self.panel, weight=3)
        logf = ttk.Labelframe(right, text="Log", padding=4)
        right.add(logf, weight=1)
        self.log = ScrolledText(logf, height=8, state="disabled", font=("Consolas", 9), bg=FIELD, fg=BONE)
        self.log.pack(fill=BOTH, expand=True)
        self._show_welcome()

    def _clear_panel(self) -> None:
        for w in self.panel.winfo_children():
            w.destroy()
        self._previews.clear()

    def _show_welcome(self) -> None:
        self._clear_panel()
        ttk.Label(self.panel, text=APP_TITLE, style="Title.TLabel").pack(anchor="w")
        ttk.Label(self.panel, text="Turns your Midjourney paintings into animated pixel-art characters for the game, in 8 directions.", style="Dim.TLabel").pack(anchor="w", pady=(2, 10))
        ttk.Label(self.panel, text="How it goes", style="Head.TLabel").pack(anchor="w")
        self._steps_text(["Click 'New project' (once per game) and 'Add character' (once per character).",
                          "Step 1 writes the Midjourney prompts for you. Paint the sheet in Midjourney and save it.",
                          "Step 2: bring the picture in. Then click '▶ Run all automatic steps' on the left.",
                          "Wait. The log at the bottom shows what is happening. The app stops and tells you if it needs something (Blender, a picture).",
                          "Step 8 has 'Preview animation' to judge the result; step 9 makes the game files."])
        ttk.Label(self.panel, text="Every step can also be run by an AI assistant from the command line (see Help).", style="Dim.TLabel").pack(anchor="w", pady=6)

    # ----------------------------------------------------------------- project
    def _new(self) -> None:
        folder = filedialog.askdirectory(title="Choose an EMPTY folder for the new project")
        if not folder:
            return
        name = Path(folder).name
        try:
            api.new_project(folder, name)
        except FileExistsError:
            pass
        self._open(folder)

    def _open_dialog(self) -> None:
        folder = filedialog.askdirectory(title="Open a project folder (contains project.json)")
        if folder:
            self._open(folder)

    def _open(self, path: str) -> None:
        try:
            self.project = Project.load(path)
        except Exception as e:  # noqa: BLE001
            messagebox.showerror(APP_TITLE, str(e))
            return
        self.title_label.config(text=f"{self.project.name}  ·  style: {self.project.style}")
        self._log(f"Opened {self.project.file}")
        names = sorted(self.project.characters)
        self.char_box["values"] = names
        if names:
            self.char.set(names[0])
        self._refresh()

    def _add_character(self) -> None:
        if not self._need_project():
            return
        dlg = Toplevel(self.root)
        dlg.title("New character")
        ttk.Label(dlg, text="Name (e.g. lantern_wraith):").pack(anchor="w", padx=10, pady=(10, 0))
        name = ttk.Entry(dlg, width=40)
        name.pack(padx=10)
        ttk.Label(dlg, text="One-sentence description:").pack(anchor="w", padx=10, pady=(10, 0))
        ttk.Label(dlg, text=DESCRIPTION_TIPS, wraplength=420, style="Dim.TLabel").pack(anchor="w", padx=10)
        desc = ScrolledText(dlg, width=60, height=5)
        desc.insert("1.0", EXAMPLE_DESCRIPTION)
        desc.pack(padx=10, pady=4)

        def ok():
            try:
                r = api.add_character(self.project, name.get(), desc.get("1.0", END).strip())
            except Exception as e:  # noqa: BLE001
                messagebox.showerror(APP_TITLE, str(e))
                return
            api.set_description(self.project, r["character"], desc.get("1.0", END).strip())
            dlg.destroy()
            self._open(str(self.project.root))
            self.char.set(r["character"])
            self._refresh()
            self.step_list.selection_set("prompts")

        ttk.Button(dlg, text="Create", command=ok).pack(pady=8)

    def _tools(self) -> None:
        from .tools_window import ToolsWindow

        ToolsWindow(self.root, log=self._log, base_dir=str(self.project.root) if self.project else None)

    def _settings(self) -> None:
        if not self._need_project():
            return
        p = self.project
        dlg = Toplevel(self.root)
        dlg.title("Settings")
        rows = [
            ("Quality style", "style", p.style),
            ("Blender path (blank = find automatically)", "blender", p.blender),
            ("Directions to render (4 / 8 / 16)", "directions", str(p.directions)),
            ("Render size in pixels (256 is plenty)", "render_size", str(p.render_size)),
            ("Godot res:// folder for sprites", "godot_res_dir", p.godot_res_dir),
        ]
        vars_ = {}
        for i, (label, key, val) in enumerate(rows):
            ttk.Label(dlg, text=label).grid(row=i, column=0, sticky="w", padx=8, pady=4)
            v = StringVar(value=val)
            vars_[key] = v
            if key == "style":
                ttk.Combobox(dlg, textvariable=v, values=sorted(STYLES), state="readonly", width=12).grid(row=i, column=1, sticky="w")
            elif key == "blender":
                f = ttk.Frame(dlg)
                f.grid(row=i, column=1, sticky="w")
                ttk.Entry(f, textvariable=v, width=48).pack(side=LEFT)
                ttk.Button(f, text="Browse", command=lambda v=v: v.set(filedialog.askopenfilename(title="blender.exe") or v.get())).pack(side=LEFT)
            else:
                ttk.Entry(dlg, textvariable=v, width=40).grid(row=i, column=1, sticky="w")
        found = api.find_blender(p)
        ttk.Label(dlg, text=f"Blender found: {found or 'not found: step 5 can download it for you'}", style="Good.TLabel" if found else "Warn.TLabel").grid(row=len(rows), column=0, columnspan=2, sticky="w", padx=8)

        def save():
            try:
                api.configure(p, **{k: v.get() for k, v in vars_.items()})
            except Exception as e:  # noqa: BLE001
                messagebox.showerror(APP_TITLE, str(e))
                return
            dlg.destroy()
            self._open(str(p.root))

        ttk.Button(dlg, text="Save", command=save).grid(row=len(rows) + 1, column=1, sticky="e", padx=8, pady=8)

    def _need_project(self) -> bool:
        if self.project is None:
            messagebox.showinfo(APP_TITLE, "Create or open a project first.")
            return False
        return True

    def _need_char(self):
        if not self._need_project():
            return None
        if not self.char.get():
            messagebox.showinfo(APP_TITLE, "Add a character first.")
            return None
        return self.project.character(self.char.get())

    def _refresh(self, redraw: bool = True) -> None:
        """Update the tick marks in the step list; ``redraw`` also re-renders the current step panel
        (never from inside a step's own code, which would render itself again)."""
        if not self.project:
            return
        c = self.project.characters.get(self.char.get())
        for key, title in STEPS:
            mark = "✔ " if c and c.done.get(key) else "    "
            i = [k for k, _ in STEPS].index(key)
            self.step_list.item(key, text=f"{mark}{i + 1}. {title}")
        sel = self.step_list.selection()
        if sel and redraw:
            self._show_step()

    # ------------------------------------------------------------------- steps
    def _show_step(self) -> None:
        sel = self.step_list.selection()
        if not sel or not self.project:
            return
        key = sel[0]
        c = self.project.characters.get(self.char.get())
        self._clear_panel()
        if c is None:
            ttk.Label(self.panel, text="Add a character first (+ Add character).").pack(anchor="w")
            return
        getattr(self, f"_step_{key}")(c)

    def _heading(self, text: str, sub: str = "") -> None:
        ttk.Label(self.panel, text=text, style="Head.TLabel").pack(anchor="w")
        if sub:
            ttk.Label(self.panel, text=sub, style="Dim.TLabel", wraplength=640, justify=LEFT).pack(anchor="w", pady=(2, 8))

    def _steps_text(self, lines: list[str]) -> None:
        """Numbered, plain instructions under a heading."""
        ttk.Label(self.panel, text="\n".join(f"{i + 1}. {t}" for i, t in enumerate(lines)), justify=LEFT, wraplength=640).pack(anchor="w", pady=(0, 8))

    def _step_prompts(self, c) -> None:
        self._heading("Step 1: Get the prompts for Midjourney", "You paint the character in Midjourney. PixelForge writes the prompts so the pictures come out the way the next steps need them.")
        self._steps_text(["Write one sentence about the character in the box (what they wear, their colours, one or two details).",
                          "Click 'Update prompts'.",
                          "Click 'Copy A: sheet' and paste it into Midjourney. Upscale the result and save it as a PNG.",
                          "Optional: 'Copy A2' gives a four-view sheet (better 3D). 'Copy C' gives a single pixel-style picture for the colours."])
        ttk.Label(self.panel, text="Description:").pack(anchor="w")
        desc = ScrolledText(self.panel, height=3, width=100)
        desc.insert("1.0", c.description or EXAMPLE_DESCRIPTION)
        desc.pack(fill=X)
        ttk.Label(self.panel, text=DESCRIPTION_TIPS, style="Dim.TLabel", wraplength=640).pack(anchor="w")
        ref = StringVar(value="[SHEET IMAGE URL]")
        f = ttk.Frame(self.panel)
        f.pack(fill=X, pady=4)
        ttk.Label(f, text="Sheet image URL for the B prompts (after you made the sheet):").pack(side=LEFT)
        ttk.Entry(f, textvariable=ref, width=40).pack(side=LEFT, padx=4)
        box = ScrolledText(self.panel, height=18, font=("Consolas", 9))
        box.pack(fill=BOTH, expand=True, pady=4)

        def regen():
            r = api.set_description(self.project, c.name, desc.get("1.0", END).strip())
            r = api.get_prompts(self.project, c.name, ref.get().strip() or "[SHEET IMAGE URL]")
            box.delete("1.0", END)
            for pr in r["prompts"]:
                box.insert(END, f"{pr['title']}\n{pr['purpose']}\n\n{pr['prompt']}\n\n{'-' * 100}\n\n")
            box.insert(END, "RULES\n" + "\n".join(f"• {x}" for x in r["rules"]))
            self._refresh(redraw=False)

        def copy(kind):
            api.set_description(self.project, c.name, desc.get("1.0", END).strip())
            r = api.get_prompts(self.project, c.name, ref.get().strip() or "[SHEET IMAGE URL]")
            text = next(p["prompt"] for p in r["prompts"] if p["key"] == kind)
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self._log(f"Copied prompt {kind.upper()} to the clipboard")

        btns = ttk.Frame(self.panel)
        btns.pack(fill=X)
        ttk.Button(btns, text="Update prompts", command=regen).pack(side=LEFT)
        for kind, label in (("sheet", "Copy A: sheet"), ("sheet4", "Copy A2: 4-view sheet"), ("front", "Copy B1: front"), ("back", "Copy B2: back"), ("sprite", "Copy C: sprite"), ("item", "Copy D: item")):
            ttk.Button(btns, text=label, command=lambda k=kind: copy(k)).pack(side=LEFT, padx=2)
        regen()

    def _step_import(self, c) -> None:
        self._heading("Step 2: Bring the pictures in", "Pick the PNG files you saved from Midjourney.")
        self._steps_text(["Click 'Choose file' next to 'Character sheet' and pick the sheet (front, side, back in one image). This one is needed.",
                          "If you also made a single pixel-style picture (prompt C), add it under 'Pixel-style image'. It helps the colours.",
                          "The single front / back / side pictures are optional extras.",
                          "Then click the next step on the left, or '▶ Run all automatic steps'."])
        rows = [("sheet", "A / A2. Character sheet (front / [three-quarter] / side / back)"), ("front", "B1. Front view (optional)"), ("back", "B2. Back view (optional)"), ("side", "Side view (optional)"), ("quarter", "Three-quarter view (optional)"), ("style", "C. Pixel-style image (palette / quick path)")]
        for kind, label in rows:
            f = ttk.Frame(self.panel)
            f.pack(fill=X, pady=3)
            ttk.Label(f, text=label, width=44).pack(side=LEFT)
            state = ttk.Label(f, text=("✔ " + c.sources[kind]) if kind in c.sources else "—", style="Good.TLabel" if kind in c.sources else "Dim.TLabel")
            state.pack(side=RIGHT)

            def pick(kind=kind, state=state):
                path = filedialog.askopenfilename(title=f"Choose the {kind} image", filetypes=[("Images", "*.png *.jpg *.jpeg *.webp")])
                if path:
                    self._run(lambda: api.import_source(self.project, c.name, kind, path), after=lambda r: self._show_step())

            ttk.Button(f, text="Choose file…", command=pick).pack(side=LEFT, padx=6)
        self._preview_row([self.project.root / p for p in c.sources.values()], 180)

    def _step_split(self, c) -> None:
        self._heading("Step 3: Cut the figures out", "PixelForge finds each figure on the sheet and removes the background.")
        self._steps_text(["Click 'Run split'. The cutouts appear below.",
                          "Look at them. If some background is still stuck to a figure, or a part of the figure got cut away, click 'Edit' under that view.",
                          "In the editor: left-drag erases, right-drag puts pixels back, 'Magic erase' removes a patch of one colour in one click. Click Save.",
                          "If the split found the wrong number of figures, set 'Figures on the sheet' and run it again. Loosen the tolerance if background remains; tighten it if the figure loses parts."])
        f = ttk.Frame(self.panel)
        f.pack(anchor="w")
        tol = StringVar(value=str(c.settings.get("tolerance", 0.08)))
        ttk.Label(f, text="Background tolerance (0.03 strict … 0.2 loose):").pack(side=LEFT)
        ttk.Entry(f, textvariable=tol, width=6).pack(side=LEFT, padx=4)
        nviews = StringVar(value=str(c.settings.get("sheet_views", 0) or "auto"))
        ttk.Label(f, text="Figures on the sheet:").pack(side=LEFT, padx=(12, 0))
        ttk.Combobox(f, textvariable=nviews, values=["auto", "3", "4"], width=5, state="readonly").pack(side=LEFT, padx=4)

        def run_split():
            try:
                t = float(tol.get())
            except ValueError:
                messagebox.showwarning(APP_TITLE, "Tolerance must be a number, e.g. 0.08")
                return
            n = None if nviews.get() == "auto" else int(nviews.get())
            if n:
                c.settings["sheet_views"] = n
            self._run(lambda: api.split(self.project, c.name, tolerance=t, expected_views=n), after=lambda r: self._show_step())

        ttk.Button(f, text="Run split", command=run_split).pack(side=LEFT, padx=8)
        views_dir = self.project.sub(c.name, "views")
        views = [p for p in sorted(views_dir.glob("*.png")) if not p.stem.endswith("_raw")]
        self._preview_row(views, 240)
        if views:
            row = ttk.Frame(self.panel)
            row.pack(anchor="w")
            ttk.Label(row, text="Fix by hand:").pack(side=LEFT)
            for p in views:
                ttk.Button(row, text=f"Edit {p.stem}", command=lambda p=p: self._edit_cutout(p)).pack(side=LEFT, padx=3)
            ttk.Button(row, text="Open folder (edit in any paint program, then Reload)", command=lambda: webbrowser.open(str(views_dir))).pack(side=LEFT, padx=(12, 3))
            ttk.Button(row, text="Reload", command=self._show_step).pack(side=LEFT)
            ttk.Label(self.panel, text="Tip: the front view decides the body; make sure nothing of the background is left inside it. "
                      "After editing, run the next steps again (palette, model).", style="Dim.TLabel", wraplength=640).pack(anchor="w", pady=4)

    def _edit_cutout(self, path) -> None:
        from .cutout_editor import open_editor

        open_editor(self.root, path, on_save=lambda: (self._log(f"Saved cutout {Path(path).name}"), self._show_step()))

    def _preview_anim(self, c, source: str) -> None:
        """A small window that plays one clip from one direction (frames or renders)."""
        root_dir = self.project.sub(c.name, "frames" if source == "frames" else "renders")
        if source == "frames":
            clips = sorted({p.name.rsplit("_", 1)[0] for p in root_dir.glob("*_S") if p.is_dir()})
        else:
            clips = sorted(p.name for p in root_dir.iterdir() if p.is_dir() and (p / "S").is_dir())
        if not clips:
            messagebox.showinfo(APP_TITLE, "Nothing to preview yet: run the render (and pixelate) first.")
            return
        win = Toplevel(self.root)
        win.title(f"Preview ({source})")
        win.configure(bg=PANEL)
        bar = ttk.Frame(win, padding=4)
        bar.pack(fill=X)
        clip = StringVar(value="walk" if "walk" in clips else clips[0])
        direction = StringVar(value="S")
        ttk.Label(bar, text="Clip").pack(side=LEFT)
        ttk.Combobox(bar, textvariable=clip, values=clips, width=10, state="readonly").pack(side=LEFT, padx=4)
        ttk.Label(bar, text="Facing").pack(side=LEFT)
        ttk.Combobox(bar, textvariable=direction, values=["S", "SW", "W", "NW", "N", "NE", "E", "SE"], width=4, state="readonly").pack(side=LEFT, padx=4)
        lbl = ttk.Label(win)
        lbl.pack(padx=8, pady=8)
        state = {"frames": [], "i": 0, "job": None}

        def load(*_):
            d = root_dir / f"{clip.get()}_{direction.get()}" if source == "frames" else root_dir / clip.get() / direction.get()
            ims = []
            for p in sorted(d.glob("frame_*.png")):
                im = Image.open(p).convert("RGBA")
                bg = Image.new("RGBA", im.size, (40, 40, 40, 255))
                im = Image.alpha_composite(bg, im)
                z = max(1, min(3, 560 // max(im.height, 1))) if source == "frames" else 1   # fit a laptop screen
                ims.append(ImageTk.PhotoImage(im.resize((im.width * z, im.height * z), Image.NEAREST)))
            state["frames"], state["i"] = ims, 0
            if not ims:
                lbl.configure(text=f"no frames in {d.name}", image="")

        def tick():
            if state["frames"]:
                lbl.configure(image=state["frames"][state["i"] % len(state["frames"])])
                state["i"] += 1
            state["job"] = win.after(100, tick)

        def save_gif():
            try:
                r = api.preview_gif(self.project, c.name, clip.get(), direction.get(), source="frames" if source == "frames" else "renders")
                self._log(f"GIF: {r['gif']}")
                webbrowser.open(r["gif"])
            except api.StepError as e:
                messagebox.showwarning(APP_TITLE, str(e))

        ttk.Button(bar, text="Save GIF", command=save_gif).pack(side=LEFT, padx=12)
        clip.trace_add("write", load)
        direction.trace_add("write", load)
        win.protocol("WM_DELETE_WINDOW", lambda: (win.after_cancel(state["job"]) if state["job"] else None, win.destroy()))
        load()
        tick()

    def _step_palette(self, c) -> None:
        self._heading("Step 4: Lock the colours", "Picks the character's colours once so every frame of every animation uses the same ones (no shimmer).")
        self._steps_text(["Click 'Build palette'. That is all. With the Godmarrow style every colour is kept; other styles reduce to a fixed set."])
        ttk.Button(self.panel, text="Build palette", command=lambda: self._run(lambda: api.make_palette(self.project, c.name), after=lambda r: self._show_step())).pack(anchor="w")
        sw = self.project.char_dir(c.name) / "palette.png"
        if sw.exists():
            self._preview_row([sw], 120)
            ttk.Label(self.panel, text=c.notes.get("palette", "")).pack(anchor="w")

    def _step_model(self, c) -> None:
        self._heading("Step 5: Build the 3D figure", "PixelForge shapes a real human figure to match your painting and wraps the painting around it. You never model anything by hand.")
        self._steps_text(["Blender (free) must be on this computer. If the line below says 'not found', click 'Download Blender for me' and wait.",
                          "Click 'Build model'. It takes a minute or two. The log at the bottom shows progress.",
                          "A figure in a long robe (no legs showing) gets a carved shape instead; that is normal."])
        found = api.find_blender(self.project)
        ttk.Label(self.panel, text=f"Blender: {found or 'not found'}", style="Good.TLabel" if found else "Warn.TLabel").pack(anchor="w")
        if not found:
            ttk.Label(self.panel, text="Blender is free and the Forge can fetch it for you (about 380 MB, no installer, kept next to PixelForge).", wraplength=640).pack(anchor="w")
            ttk.Button(self.panel, text="Download Blender for me", command=lambda: self._run(lambda: api.download_blender(self.project, log=self._log), after=lambda r: self._show_step())).pack(anchor="w", pady=2)
        ttk.Button(self.panel, text="Build model", command=lambda: self._run(lambda: api.build_model(self.project, c.name, log=self._log), after=self._after_model)).pack(anchor="w", pady=4)
        ttk.Label(self.panel, text=c.notes.get("model_note", ""), style="Dim.TLabel").pack(anchor="w")

    def _after_model(self, r) -> None:
        self._show_step()
        messagebox.showinfo("Model built", "Next: step 6 rigs and animates it automatically. " + r["instructions"])

    def _step_rig(self, c) -> None:
        mix = self.project.sub(c.name, "mixamo")
        self._heading("Step 6: Give it a skeleton and the moves", "Automatic. PixelForge adds a skeleton and the built-in animations: idle, walk, run, attack, punch, cast, hit, death, roll.")
        self._steps_text(["Click 'Rig + animate automatically'. Nothing else is needed.",
                          "Mixamo is only an optional extra for motion-capture moves; you can ignore it."])
        ttk.Button(self.panel, text="Rig + animate automatically", command=lambda: self._run(lambda: api.rig(self.project, c.name, log=self._log), after=lambda r: self._show_step())).pack(anchor="w", pady=4)
        ttk.Label(self.panel, text=c.notes.get("rig", ""), style="Dim.TLabel").pack(anchor="w")
        ttk.Separator(self.panel).pack(fill=X, pady=8)
        ttk.Label(self.panel, text="Optional, Mixamo motion capture (free Adobe account, a browser):\n"
                  f"1. Upload  {self.project.sub(c.name, 'model') / (c.name + '.fbx')}  at mixamo.com, place the markers, pick animations.\n"
                  "2. Download the FIRST as FBX 'With Skin', the others 'Without Skin' (30 fps).\n"
                  f"3. Put the .fbx files in  {mix}  and click Import.", style="Dim.TLabel", justify="left").pack(anchor="w")
        ttk.Button(self.panel, text="Open the mixamo folder", command=lambda: webbrowser.open(str(mix))).pack(anchor="w")
        ttk.Button(self.panel, text="Import Mixamo files", command=lambda: self._run(lambda: api.import_mixamo(self.project, c.name, log=self._log), after=lambda r: self._show_step())).pack(anchor="w", pady=4)
        files = sorted(mix.glob("*.fbx")) + sorted(mix.glob("*.FBX"))
        ttk.Label(self.panel, text=f"{len(files)} FBX file(s) in the folder.").pack(anchor="w")

    def _step_render(self, c) -> None:
        self._heading("Step 7: Film it from 8 directions", "Blender films every animation from every direction with the game's camera (looking down at 30°, like Diablo II).")
        self._steps_text(["Click 'Render'. This is the slow step: a few minutes on a laptop. Watch the log.",
                          "'Every Nth frame' 2 is the normal setting (half the frames, same look). 1 is smoother and twice as slow.",
                          "When it is done, click 'Preview animation' to watch any move from any direction."])
        f = ttk.Frame(self.panel)
        f.pack(anchor="w")
        step = StringVar(value="2")
        elev = StringVar(value="30")
        ttk.Label(f, text="Every Nth frame:").pack(side=LEFT)
        ttk.Entry(f, textvariable=step, width=4).pack(side=LEFT, padx=4)
        ttk.Label(f, text="Camera elevation °:").pack(side=LEFT)
        ttk.Entry(f, textvariable=elev, width=4).pack(side=LEFT, padx=4)
        ttk.Button(self.panel, text="Render", command=lambda: self._run(lambda: api.render(self.project, c.name, step=int(step.get()), elevation=float(elev.get()), log=self._log), after=lambda r: self._show_step())).pack(anchor="w", pady=4)
        ttk.Label(self.panel, text=c.notes.get("render", "")).pack(anchor="w")
        ttk.Button(self.panel, text="Preview animation (renders)", command=lambda: self._preview_anim(c, "renders")).pack(anchor="w", pady=2)
        renders = self.project.sub(c.name, "renders")
        sample = sorted(renders.glob("*/S/frame_000.png"))[:1] + sorted(renders.glob("*/W/frame_000.png"))[:1]
        self._preview_row(sample, 200)

    def _step_pixelate(self, c) -> None:
        self._heading("Step 8: Turn the film into pixel art", f"Every frame becomes a pixel sprite in the '{self.project.style}' style, with the locked colours, so nothing flickers between frames.")
        self._steps_text(["Tick 'Add a dark 1-pixel outline' if you want the Godmarrow outline (recommended for the game).",
                          "Click 'Pixelate all frames'.",
                          "Click 'Preview animation' and judge it. If it looks wrong, the fix is usually in step 3 (cutout) or step 5 (model); redo from there."])
        outline = BooleanVar(value=False)
        ttk.Checkbutton(self.panel, text="Add a dark 1-pixel outline", variable=outline).pack(anchor="w")
        ttk.Button(self.panel, text="Pixelate all frames", command=lambda: self._run(lambda: api.pixelate_renders(self.project, c.name, outline="auto" if outline.get() else None, log=self._log), after=lambda r: self._show_step())).pack(anchor="w", pady=4)
        ttk.Button(self.panel, text="Preview animation (pixel frames)", command=lambda: self._preview_anim(c, "frames")).pack(anchor="w", pady=2)
        frames = self.project.sub(c.name, "frames")
        sample = sorted(frames.glob("*_S/frame_000.png"))[:2] + sorted(frames.glob("*_W/frame_000.png"))[:1]
        self._preview_row(sample, 200, zoom=True)

    def _step_export(self, c) -> None:
        self._heading("Step 9: Make the game files", "Packs every animation into sprite sheets and writes the files a game loads.")
        self._steps_text(["For Godmarrow: type the kind name (for example 'mystic') and click 'Export for Godmarrow'. Copy the files it names into the game's art/sprites folder.",
                          "For any other Godot game: click 'Export' for a SpriteFrames (.tres) and a ready scene (.tscn)."])
        ttk.Button(self.panel, text="Export", command=lambda: self._run(lambda: api.export(self.project, c.name), after=self._after_export)).pack(anchor="w")
        ttk.Label(self.panel, text=c.notes.get("export", "")).pack(anchor="w")
        sheet = self.project.sub(c.name, "export") / f"{c.name}.png"
        if sheet.exists():
            self._preview_row([sheet], 300)
        ttk.Separator(self.panel).pack(fill=X, pady=8)
        ttk.Label(self.panel, text="Godmarrow: write the game's own atlas (art/sprites/<kind>.png|json, 8 views, foot anchors, normal/depth sets when rendered).", wraplength=640).pack(anchor="w")
        f = ttk.Frame(self.panel)
        f.pack(anchor="w", pady=2)
        kind = StringVar(value=c.name)
        ttk.Label(f, text="Kind (file name):").pack(side=LEFT)
        ttk.Entry(f, textvariable=kind, width=16).pack(side=LEFT, padx=4)
        ttk.Button(f, text="Export for Godmarrow", command=lambda: self._run(lambda: api.export_game(self.project, c.name, kind.get()), after=lambda r: (self._show_step(), messagebox.showinfo("Exported", r["color"]["png"])))).pack(side=LEFT, padx=6)
        ttk.Label(self.panel, text=c.notes.get("export_game", "")).pack(anchor="w")

    def _after_export(self, r) -> None:
        self._show_step()
        messagebox.showinfo("Exported", r["godot"])

    def _step_still(self, c) -> None:
        self._heading("Quick path: one picture, one sprite", "No 3D. Takes one picture (the pixel-style image or the front view) and makes a sprite with a simple animation (sway, hover, flame...). Good for a first look, bosses, portraits and items.")
        self._steps_text(["Pick the picture and an animation.", "Click 'Make sprite' to see it, or 'Make sprite + animate + export' to get the game files."])
        view = StringVar(value="style" if "style" in c.sources else "front")
        f = ttk.Frame(self.panel)
        f.pack(anchor="w")
        ttk.Label(f, text="Image:").pack(side=LEFT)
        ttk.Combobox(f, textvariable=view, values=["style", "front", "side", "back"], state="readonly", width=8).pack(side=LEFT, padx=4)
        preset = StringVar(value="idle")
        ttk.Label(f, text="Animation:").pack(side=LEFT)
        ttk.Combobox(f, textvariable=preset, values=["idle", "cloak", "hover", "flame", "glow", "grass"], state="readonly", width=8).pack(side=LEFT, padx=4)
        ttk.Button(self.panel, text="Make sprite", command=lambda: self._run(lambda: api.pixelate_still(self.project, c.name, view.get()), after=lambda r: self._show_step())).pack(anchor="w", pady=2)
        ttk.Button(self.panel, text="Make sprite + animate + export", command=lambda: self._run(lambda: (api.animate_still(self.project, c.name, view.get(), [preset.get()]), api.export(self.project, c.name))[-1], after=self._after_export)).pack(anchor="w", pady=2)
        sprites = sorted(self.project.sub(c.name, "sprites").glob("*_x4.png"))
        self._preview_row(sprites, 300)

    # ---------------------------------------------------------------- helpers
    def _preview_row(self, paths, height: int, zoom: bool = False) -> None:
        row = ttk.Frame(self.panel)
        row.pack(anchor="w", pady=8)
        for p in paths:
            p = Path(p)
            if not p.exists():
                continue
            try:
                im = Image.open(p).convert("RGBA")
            except Exception:  # noqa: BLE001
                continue
            bg = Image.new("RGBA", im.size, (40, 40, 40, 255))
            im = Image.alpha_composite(bg, im)
            s = height / im.height
            size = (max(1, int(im.width * s)), height)
            im = im.resize(size, Image.NEAREST if (zoom or s > 1) else Image.LANCZOS)
            photo = ImageTk.PhotoImage(im)
            self._previews.append(photo)
            cell = ttk.Frame(row)
            cell.pack(side=LEFT, padx=4)
            ttk.Label(cell, image=photo).pack()
            ttk.Label(cell, text=p.name, style="Dim.TLabel").pack()

    def _run(self, fn, after=None) -> None:
        if self.busy:
            messagebox.showinfo(APP_TITLE, "Still working on the previous step - watch the log.")
            return
        self.busy = True

        def work():
            try:
                r = fn()
                self._log("OK: " + ", ".join(f"{k}={v}" for k, v in r.items() if k in ("character", "next", "colors", "count", "clips", "animations")))
                if after:
                    self.root.after(0, lambda: after(r))
            except api.StepError as e:
                self._log("STOPPED: " + str(e))
                self.root.after(0, lambda: messagebox.showwarning(APP_TITLE, str(e)))
            except Exception as e:  # noqa: BLE001
                self._log("ERROR: " + str(e) + "\n" + traceback.format_exc())
                self.root.after(0, lambda: messagebox.showerror(APP_TITLE, str(e)))
            finally:
                self.busy = False
                self.root.after(0, self._refresh)

        threading.Thread(target=work, daemon=True).start()

    def _run_all(self) -> None:
        c = self._need_char()
        if c is None:
            return
        self._run(lambda: api.run_until_blocked(self.project, c.name, log=self._log), after=self._after_run_all)

    def _after_run_all(self, r) -> None:
        self._refresh()
        if r["blocked_at"]:
            messagebox.showinfo(APP_TITLE, f"Ran: {', '.join(r['ran']) or 'nothing'}.\n\nStopped at step '{r['blocked_at']}':\n{r['reason']}")
            self.step_list.selection_set(r["blocked_at"])
        else:
            messagebox.showinfo(APP_TITLE, f"All steps done: {', '.join(r['ran'])}")

    def _log(self, text: str) -> None:
        self.log_queue.put(text)

    def _drain_log(self) -> None:
        try:
            while True:
                line = self.log_queue.get_nowait()
                self.log.configure(state="normal")
                self.log.insert(END, line + "\n")
                self.log.see(END)
                self.log.configure(state="disabled")
        except queue.Empty:
            pass
        self.root.after(100, self._drain_log)


def main(project_path: str | None = None) -> None:
    """Entry point. Under pythonw (no console) a crash would be silent, so it is written to
    ``studio_error.log`` next to the package and shown in a box."""
    try:
        root = Tk()
        apply_theme(root)
        Studio(root, project_path)
        root.mainloop()
    except Exception:  # noqa: BLE001
        log_path = Path(__file__).resolve().parent.parent / "studio_error.log"
        text = traceback.format_exc()
        try:
            log_path.write_text(text)
        except OSError:
            pass
        try:
            messagebox.showerror(APP_TITLE, f"PixelForge Studio could not start.\n\n{text[-1500:]}\n\nSaved to {log_path}")
        except Exception:  # noqa: BLE001
            print(text)
        raise


if __name__ == "__main__":
    import sys

    main(sys.argv[1] if len(sys.argv) > 1 else None)
