"""PixelForge Studio - the desktop app (Tkinter, ships with Python on Windows).

Everything here calls :mod:`pixelforge.api`; the window is only buttons, text
boxes and previews around those functions.
"""

from __future__ import annotations

import json
import queue
import threading
import traceback
import webbrowser
from pathlib import Path
from tkinter import BOTH, BOTTOM, END, LEFT, RIGHT, TOP, X, Y, BooleanVar, Canvas, Menu, StringVar, Tk, Toplevel, filedialog, messagebox
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
    root.option_add("*Toplevel.background", PANEL)
    root.option_add("*Listbox.background", FIELD)
    root.option_add("*Listbox.foreground", BONE)
    root.option_add("*Listbox.selectBackground", "#1f4a46")
    root.option_add("*Listbox.selectForeground", "#eafff8")
    root.option_add("*Canvas.background", "#303030")
    root.option_add("*Text.background", FIELD)
    root.option_add("*Text.foreground", BONE)
    root.option_add("*Text.insertBackground", BONE)
    root.option_add("*Text.font", "Consolas 10")
    root.option_add("*TCombobox*Listbox.background", FIELD)
    root.option_add("*TCombobox*Listbox.foreground", BONE)
HELP_URL = "https://github.com/Kaspa-World-Eater/godmarrow/blob/main/tools/pixelforge/docs/GUIDE_HUMANS.md"
RECENT_FILE = Path.home() / ".pixelforge" / "recent.json"
STEP_BLURB = {   # one line per step, shown on the Continue button
    "prompts": "write the Midjourney prompts", "import": "bring the pictures in", "split": "cut the figures out",
    "palette": "lock the colours", "model": "build the 3D figure", "rig": "add the skeleton and moves",
    "render": "film it from 8 directions", "pixelate": "turn the film into pixel art", "export": "make the game files",
}


def _recent() -> list[str]:
    try:
        return [p for p in json.loads(RECENT_FILE.read_text()) if Path(p).exists()]
    except Exception:  # noqa: BLE001
        return []


def _remember(path: str) -> None:
    try:
        items = [path] + [p for p in _recent() if p != path]
        RECENT_FILE.parent.mkdir(parents=True, exist_ok=True)
        RECENT_FILE.write_text(json.dumps(items[:8]))
    except OSError:
        pass


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
        root.minsize(960, 640)
        self.status = StringVar(value="Ready")
        self._menu()
        self._build()
        root.after(100, self._drain_log)
        root.after(1500, self._check_updates)
        if project_path:
            self._open(project_path)

    # ------------------------------------------------------------------ layout
    def _menu(self) -> None:
        m = Menu(self.root, tearoff=0)
        f = Menu(m, tearoff=0)
        f.add_command(label="Open a painting and start…", command=self._start_from_picture, accelerator="Ctrl+P")
        f.add_command(label="New project…", command=self._new, accelerator="Ctrl+N")
        f.add_command(label="Open project…", command=self._open_dialog, accelerator="Ctrl+O")
        self.recent_menu = Menu(f, tearoff=0)
        f.add_cascade(label="Open recent", menu=self.recent_menu)
        f.add_separator()
        f.add_command(label="Exit", command=self.root.destroy)
        m.add_cascade(label="File", menu=f)
        c = Menu(m, tearoff=0)
        c.add_command(label="Add character…", command=self._add_character)
        c.add_command(label="Run all automatic steps", command=self._run_all, accelerator="F5")
        c.add_command(label="Check this character", command=self._check)
        c.add_command(label="Effects editor (on the exported set)…", command=lambda: self._fx_editor(self._need_char()) if self._need_char() else None)
        c.add_separator()
        c.add_command(label="Project settings…", command=self._settings)
        m.add_cascade(label="Character", menu=c)
        t = Menu(m, tearoff=0)
        t.add_command(label="Tools window (effects, props, tiles, sounds, music…)", command=self._tools, accelerator="Ctrl+T")
        t.add_command(label="Describe it, get it…", command=self._describe, accelerator="Ctrl+D")
        t.add_command(label="Preview in game…", command=self._preview_game)
        t.add_separator()
        t.add_command(label="Spell designer…", command=lambda: __import__("pixelforge.spell_designer", fromlist=["open_spell_designer"]).open_spell_designer(self.root, "fireball", str(self.project.root / "fx") if self.project else "art/fx"))
        t.add_command(label="Skin editor (any image)…", command=lambda: (lambda p: self._skin_editor(p) if p else None)(filedialog.askopenfilename(title="Image to edit", filetypes=[("PNG", "*.png")])))
        t.add_command(label="Colour editor (any image)…", command=lambda: (lambda p: self._color_editor(p) if p else None)(filedialog.askopenfilename(title="Image to recolour", filetypes=[("PNG", "*.png")])))
        m.add_cascade(label="Tools", menu=t)
        h = Menu(m, tearoff=0)
        h.add_command(label="User guide", command=lambda: webbrowser.open(HELP_URL))
        h.add_command(label="Update PixelForge (git pull)", command=self._update_forge)
        h.add_command(label="About PixelForge", command=lambda: messagebox.showinfo(APP_TITLE, "PixelForge Studio\n\nPaintings in, game-ready pixel art out: characters in 8 directions, props, effects, tiles, UI, sounds and music.\n\nEvery step is also a command line and an AI-assistant tool."))
        m.add_cascade(label="Help", menu=h)
        self.root.config(menu=m)
        self.root.bind("<Control-n>", lambda e: self._new())
        self.root.bind("<Control-p>", lambda e: self._start_from_picture())
        self.root.bind("<Control-o>", lambda e: self._open_dialog())
        self.root.bind("<Control-t>", lambda e: self._tools())
        self.root.bind("<F5>", lambda e: self._run_all())
        self.root.bind("<Control-d>", lambda e: self._describe())
        self._fill_recent()

    def _repo_root(self):
        here = Path(__file__).resolve().parents[1]
        for cand in (here, *here.parents):
            if (cand / ".git").exists():
                return cand
        return None

    def _check_updates(self) -> None:
        """Quietly ask the repository whether a newer Forge exists; if so, show one button: Update and restart."""
        import shutil
        import subprocess

        repo = self._repo_root()
        if repo is None or not shutil.which("git"):
            return

        def work():
            try:
                subprocess.run(["git", "fetch", "--quiet"], cwd=str(repo), capture_output=True, text=True, timeout=60)
                r = subprocess.run(["git", "rev-list", "--count", "HEAD..@{u}"], cwd=str(repo), capture_output=True, text=True, timeout=30)
                behind = int(r.stdout.strip() or 0)
            except Exception:  # noqa: BLE001
                return
            if behind > 0:
                self.root.after(0, lambda: self._offer_update(behind))

        threading.Thread(target=work, daemon=True).start()

    def _offer_update(self, behind: int) -> None:
        if getattr(self, "update_bar", None) is not None:
            return
        self.update_bar = ttk.Frame(self.root, padding=(8, 4))
        self.update_bar.pack(side=TOP, fill=X, before=self.root.winfo_children()[0])
        ttk.Label(self.update_bar, text=f"A newer PixelForge is ready ({behind} change{'s' if behind != 1 else ''}).", style="Warn.TLabel").pack(side=LEFT)
        ttk.Button(self.update_bar, text="Update and restart", command=self._update_forge, style="Go.TButton").pack(side=LEFT, padx=8)
        ttk.Button(self.update_bar, text="Later", command=self.update_bar.destroy).pack(side=LEFT)

    def _update_forge(self) -> None:
        """Pull the latest Forge from the repository it was installed from, then ask for a restart."""
        import subprocess

        repo = Path(__file__).resolve().parents[1]
        for cand in (repo, *repo.parents):
            if (cand / ".git").exists():
                repo = cand
                break
        else:
            messagebox.showinfo(APP_TITLE, "This copy was not installed from git; download the latest release instead.")
            return
        try:
            r = subprocess.run(["git", "pull", "--ff-only"], cwd=str(repo), capture_output=True, text=True, timeout=120)
            out = (r.stdout + r.stderr).strip()[-800:]
        except Exception as e:  # noqa: BLE001
            messagebox.showerror(APP_TITLE, f"Could not run git:\n{e}")
            return
        self._log("UPDATE " + out.replace("\n", " | "))
        if "Already up to date" in out:
            messagebox.showinfo(APP_TITLE, "Already up to date.")
            return
        if r.returncode != 0:
            messagebox.showerror(APP_TITLE, "The update did not apply:\n\n" + out)
            return
        # new code may bring new packages: install quietly, then relaunch this same program
        import sys

        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-e", str(Path(__file__).resolve().parents[1])], capture_output=True, text=True, timeout=600)
        except Exception:  # noqa: BLE001
            pass
        self.status.set("Updated. Restarting…")
        self.root.update()
        try:
            subprocess.Popen([sys.executable, "-m", "pixelforge.cli", "studio"], cwd=str(Path(__file__).resolve().parents[1]))
        except Exception as e:  # noqa: BLE001
            messagebox.showinfo(APP_TITLE, f"Updated. Please close and reopen PixelForge Studio.\n({e})")
            return
        self.root.after(300, self.root.destroy)

    def _fill_recent(self) -> None:
        self.recent_menu.delete(0, END)
        for p in _recent():
            self.recent_menu.add_command(label=p, command=lambda p=p: self._open(p))
        if not _recent():
            self.recent_menu.add_command(label="(none yet)", state="disabled")

    def _build(self) -> None:
        bar = ttk.Frame(self.root, padding=(8, 6))
        bar.pack(side=TOP, fill=X)
        ttk.Button(bar, text="Open painting…", command=self._start_from_picture, style="Go.TButton").pack(side=LEFT)
        ttk.Button(bar, text="Open project", command=self._open_dialog).pack(side=LEFT, padx=4)
        ttk.Separator(bar, orient="vertical").pack(side=LEFT, fill=Y, padx=8)
        ttk.Label(bar, text="Character:").pack(side=LEFT)
        self.char_box = ttk.Combobox(bar, textvariable=self.char, state="readonly", width=24)
        self.char_box.pack(side=LEFT, padx=4)
        self.char_box.bind("<<ComboboxSelected>>", lambda e: self._refresh())
        ttk.Button(bar, text="+ Add character", command=self._add_character).pack(side=LEFT, padx=4)
        ttk.Separator(bar, orient="vertical").pack(side=LEFT, fill=Y, padx=8)
        ttk.Button(bar, text="Describe it…", command=self._describe).pack(side=LEFT)
        ttk.Button(bar, text="Tools", command=self._tools).pack(side=LEFT, padx=4)
        ttk.Button(bar, text="Settings", command=self._settings).pack(side=LEFT, padx=4)
        ttk.Button(bar, text="Help", command=lambda: webbrowser.open(HELP_URL)).pack(side=RIGHT)

        foot = ttk.Frame(self.root, padding=(8, 3))
        foot.pack(side=BOTTOM, fill=X)
        self.progress = ttk.Progressbar(foot, mode="indeterminate", length=160)
        ttk.Label(foot, textvariable=self.status, style="Dim.TLabel").pack(side=LEFT)

        body = ttk.Panedwindow(self.root, orient="horizontal")
        body.pack(fill=BOTH, expand=True)
        left = ttk.Frame(body, padding=8)
        body.add(left, weight=0)
        ttk.Label(left, text="Steps", font=FONT_B).pack(anchor="w")
        self.step_list = ttk.Treeview(left, columns=("state",), show="tree", height=len(STEPS) + 2, selectmode="browse")
        self.step_list.column("#0", width=340)
        self.step_list.tag_configure("done", foreground=DIM)
        self.step_list.tag_configure("next", foreground=TEAL, font=FONT_B)
        self.step_list.tag_configure("todo", foreground=BONE)
        for i, (key, title) in enumerate(STEPS):
            self.step_list.insert("", END, iid=key, text=f"{i + 1}. {title}", tags=("todo",))
        self.step_list.insert("", END, iid="still", text="★ Quick path: sprite + animation from one image", tags=("todo",))
        self.step_list.pack(fill=Y)
        self.step_list.bind("<<TreeviewSelect>>", lambda e: self._show_step())
        self.go_btn = ttk.Button(left, text="▶ Continue", command=self._continue, style="Go.TButton")
        self.go_btn.pack(fill=X, pady=(12, 2))
        ttk.Button(left, text="Run all automatic steps", command=self._run_all).pack(fill=X, pady=2)
        ttk.Label(left, text="Stops and tells you if a step needs you.", style="Dim.TLabel").pack(anchor="w")
        self.check_label = ttk.Label(left, text="", style="Dim.TLabel", wraplength=330, justify=LEFT)
        self.check_label.pack(anchor="w", pady=(10, 0))

        right = ttk.Panedwindow(body, orient="vertical")
        body.add(right, weight=1)
        # the step panel scrolls: a long step (previews plus buttons) is never cut off at the bottom
        pframe = ttk.Frame(right)
        right.add(pframe, weight=3)
        self.panel_canvas = Canvas(pframe, bg=PANEL, highlightthickness=0, bd=0)
        vs = ttk.Scrollbar(pframe, orient="vertical", command=self.panel_canvas.yview)
        self.panel_canvas.configure(yscrollcommand=vs.set)
        vs.pack(side=RIGHT, fill=Y)
        self.panel_canvas.pack(side=LEFT, fill=BOTH, expand=True)
        self.panel = ttk.Frame(self.panel_canvas, padding=12)
        self._panel_win = self.panel_canvas.create_window((0, 0), window=self.panel, anchor="nw")
        self.panel.bind("<Configure>", lambda e: self.panel_canvas.configure(scrollregion=self.panel_canvas.bbox("all")))
        self.panel_canvas.bind("<Configure>", lambda e: (self.panel_canvas.itemconfigure(self._panel_win, width=e.width), self._wrap_labels(e.width)))
        self.panel_canvas.bind_all("<MouseWheel>", lambda e: self.panel_canvas.yview_scroll(-int(e.delta / 120), "units"))
        self.panel_canvas.bind_all("<Button-4>", lambda e: self.panel_canvas.yview_scroll(-1, "units"))
        self.panel_canvas.bind_all("<Button-5>", lambda e: self.panel_canvas.yview_scroll(1, "units"))
        logf = ttk.Labelframe(right, text="Log", padding=4)
        right.add(logf, weight=1)
        self.log = ScrolledText(logf, height=8, state="disabled", font=("Consolas", 9), bg=FIELD, fg=BONE)
        self.log.pack(fill=BOTH, expand=True)
        self._show_welcome()

    def _set_busy(self, on: bool, text: str = "") -> None:
        self.busy = on
        self.status.set(text or ("Working…" if on else "Ready"))
        if on:
            self.progress.pack(side=RIGHT)
            self.progress.start(12)
        else:
            self.progress.stop()
            self.progress.pack_forget()
        self.go_btn.configure(state="disabled" if on else "normal")

    def _clear_panel(self) -> None:
        for w in self.panel.winfo_children():
            w.destroy()
        self._previews.clear()
        self.panel_canvas.yview_moveto(0)

    def _wrap_labels(self, width: int, widget=None) -> None:
        """Text in the panel wraps to the panel's width, whatever size the window is."""
        for w in (widget or self.panel).winfo_children():
            if isinstance(w, ttk.Label) and w.cget("wraplength"):
                w.configure(wraplength=max(240, width - 40))
            elif isinstance(w, ttk.Frame):
                self._wrap_labels(width, w)

    def _show_welcome(self) -> None:
        self._clear_panel()
        ttk.Label(self.panel, text=APP_TITLE, style="Title.TLabel").pack(anchor="w")
        ttk.Label(self.panel, text="Paintings in, game-ready pixel art out: characters in 8 directions, props, effects, tiles, UI, sounds and music.", style="Dim.TLabel", wraplength=self._wrap()).pack(anchor="w", pady=(2, 14))
        row = ttk.Frame(self.panel)
        row.pack(anchor="w", pady=(0, 14))
        ttk.Button(row, text="Open a painting and start", command=self._start_from_picture, style="Go.TButton").pack(side=LEFT)
        ttk.Button(row, text="+ Add a character (name it yourself)", command=self._add_character).pack(side=LEFT, padx=6)
        ttk.Button(row, text="Open project", command=self._open_dialog).pack(side=LEFT, padx=6)
        ttk.Button(row, text="New project in a folder of your choice", command=self._new).pack(side=LEFT)
        ttk.Button(row, text="Tools", command=self._tools).pack(side=LEFT, padx=6)
        recent = _recent()
        if recent:
            ttk.Label(self.panel, text="Recent projects", style="Head.TLabel").pack(anchor="w")
            for p in recent[:5]:
                ttk.Button(self.panel, text=p, command=lambda p=p: self._open(p)).pack(anchor="w", pady=1)
        ttk.Label(self.panel, text="A character in five moves", style="Head.TLabel").pack(anchor="w", pady=(12, 0))
        self._steps_text(["Open a painting: the character is made from it and every automatic step runs. (A project folder is made for you in Documents.)",
                          "Or add a character by name first: step 1 writes the Midjourney prompts, step 2 brings the painting in.",
                          "Watch the log and the note under the steps. The app stops and says so if it needs something (Blender, a picture).",
                          "Step 8 previews the animation; step 9 writes the files the game loads."])
        ttk.Label(self.panel, text="Everything here is also a command line and an AI-assistant tool (Help > User guide).", style="Dim.TLabel").pack(anchor="w", pady=6)

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
        self.root.title(f"{APP_TITLE}  ·  {self.project.name}  ·  style: {self.project.style}")
        self.status.set(f"Project: {self.project.name}  ·  style: {self.project.style}  ·  {self.project.root}")
        self._log(f"Opened {self.project.file}")
        _remember(str(self.project.root))
        self._fill_recent()
        names = sorted(self.project.characters)
        self.char_box["values"] = names
        if names:
            self.char.set(names[0])
        self._refresh()
        if names and not self.step_list.selection():
            self.step_list.selection_set(self._next_step(self.project.character(names[0])))

    def _ensure_project(self) -> bool:
        """No project open: make one in Documents/PixelForge Projects/My Game (or open it) so a person can start with
        Add character and never meet the empty-folder step."""
        if self.project is not None:
            return True
        home = Path.home()
        base = home / "Documents" if (home / "Documents").exists() else home
        folder = base / "PixelForge Projects" / "My Game"
        try:
            if not (folder / "project.json").exists():
                folder.mkdir(parents=True, exist_ok=True)
                api.new_project(folder, "My Game", style="godmarrow")
            self._open(str(folder))
            self._log(f"Made a project for you in {folder} (File > Open project to use another).")
        except Exception as e:  # noqa: BLE001
            messagebox.showerror(APP_TITLE, f"Could not make a project folder:\n{e}\n\nUse New project and pick a folder.")
            return False
        return self.project is not None

    def _start_from_picture(self, path: str | None = None) -> None:
        """One move: pick a painting; the character is named after the file, the picture brought in and every automatic
        step run. A wide picture is taken for a sheet of views, a tall one for a single front view."""
        if self.busy:
            self.status.set("Still working on the previous step; watch the log.")
            return
        if not path:
            path = filedialog.askopenfilename(title="Your painting", filetypes=[("Images", "*.png *.jpg *.jpeg *.webp"), ("All files", "*.*")])
        if not path:
            return
        if not self._ensure_project():
            return
        try:
            with Image.open(path) as im:
                w, h = im.size
        except Exception as e:  # noqa: BLE001
            self._tell(f"That file is not a picture I can open: {e}", warn=True)
            return
        import re

        stem = Path(path).stem
        base = re.sub(r"[^a-z0-9]+", "_", stem.lower()).strip("_") or "character"
        name, n = base, 2
        while name in self.project.characters:
            name = f"{base}_{n}"
            n += 1
        kind = "sheet" if w >= h * 1.5 else "front"
        try:
            r = api.add_character(self.project, name, re.sub(r"[_\-]+", " ", stem).strip())
            api.import_source(self.project, r["character"], kind, path)
        except Exception as e:  # noqa: BLE001
            self._tell(f"Could not bring the picture in: {e}", warn=True)
            return
        self._open(str(self.project.root))
        self.char.set(r["character"])
        self._refresh()
        self.step_list.selection_set("split")
        self._log(f"'{r['character']}' made from {Path(path).name} ({'a sheet of views' if kind == 'sheet' else 'one front view'}). Running every automatic step.")
        self._run_all()

    def _add_character(self) -> None:
        """The New character form, in the main window (no extra window)."""
        if not self._ensure_project():
            return
        self._clear_panel()
        self._heading("New character", "A short name for the files (letters, numbers, underscores) and one sentence about them. "
                      "Step 1 then writes the Midjourney prompts from the sentence. Have the painting already? Choose it here and skip to the cutting.")
        ttk.Label(self.panel, text="Name (e.g. lantern_wraith):").pack(anchor="w", pady=(4, 0))
        name = ttk.Entry(self.panel, width=40)
        name.pack(anchor="w")
        name.focus_set()
        ttk.Label(self.panel, text="One-sentence description:").pack(anchor="w", pady=(10, 0))
        ttk.Label(self.panel, text=DESCRIPTION_TIPS, wraplength=self._wrap(), style="Dim.TLabel", justify=LEFT).pack(anchor="w")
        ttk.Label(self.panel, text="For example: " + EXAMPLE_DESCRIPTION, style="Dim.TLabel", wraplength=self._wrap(), justify=LEFT).pack(anchor="w")
        desc = ScrolledText(self.panel, width=72, height=4, font=FONT, bg=FIELD, fg=BONE, insertbackground=BONE, relief="flat")
        desc.pack(anchor="w", pady=4)
        ttk.Label(self.panel, text="Your painting (optional now): the Midjourney sheet with the front, side and back views, or any single picture of the character.", wraplength=self._wrap(), justify=LEFT).pack(anchor="w", pady=(10, 0))
        pic = StringVar(value="")
        prow = ttk.Frame(self.panel)
        prow.pack(anchor="w")
        ttk.Entry(prow, textvariable=pic, width=56).pack(side=LEFT)
        ttk.Button(prow, text="Choose picture…", command=lambda: pic.set(filedialog.askopenfilename(title="The character's painting", filetypes=[("Images", "*.png *.jpg *.jpeg *.webp")]) or pic.get())).pack(side=LEFT, padx=4)
        kind_var = StringVar(value="sheet")
        krow = ttk.Frame(self.panel)
        krow.pack(anchor="w", pady=(2, 0))
        ttk.Label(krow, text="That picture is:").pack(side=LEFT)
        ttk.Radiobutton(krow, text="a sheet (several views side by side)", value="sheet", variable=kind_var).pack(side=LEFT, padx=4)
        ttk.Radiobutton(krow, text="one front view", value="front", variable=kind_var).pack(side=LEFT, padx=4)
        ttk.Radiobutton(krow, text="a pixel-style image", value="style", variable=kind_var).pack(side=LEFT, padx=4)
        note = ttk.Label(self.panel, text="", style="Warn.TLabel", wraplength=self._wrap(), justify=LEFT)
        note.pack(anchor="w", pady=(6, 0))

        def ok():
            if not desc.get("1.0", END).strip():
                desc.insert("1.0", EXAMPLE_DESCRIPTION)
            try:
                r = api.add_character(self.project, name.get(), desc.get("1.0", END).strip())
            except Exception as e:  # noqa: BLE001
                note.configure(text=str(e))
                return
            api.set_description(self.project, r["character"], desc.get("1.0", END).strip())
            picture = pic.get().strip()
            imported = None
            if picture:
                try:
                    imported = api.import_source(self.project, r["character"], kind_var.get(), picture)
                except Exception as e:  # noqa: BLE001
                    self._log(f"The character was made, but the picture could not be brought in: {e}. Use step 2 to add it.")
            self._open(str(self.project.root))
            self.char.set(r["character"])
            self._refresh()
            if imported:
                self.step_list.selection_set("split")
                self._tell(f"'{r['character']}' added with its picture. Press Continue to cut the figures out, or Run all automatic steps.")
            else:
                self.step_list.selection_set("prompts")
                self._tell(f"'{r['character']}' added. Step 1 gives the Midjourney prompt; step 2 brings the picture in.")

        row = ttk.Frame(self.panel)
        row.pack(anchor="w", pady=10)
        ttk.Button(row, text="Create", command=ok, style="Go.TButton").pack(side=LEFT)
        ttk.Button(row, text="Cancel", command=self._show_welcome).pack(side=LEFT, padx=6)
        name.bind("<Return>", lambda e: ok())

    def _tell(self, text: str, warn: bool = False) -> None:
        """Say something in the window itself (the status line and the note under the steps), never in a pop-up."""
        self.status.set(text)
        self.check_label.configure(text=text, style="Warn.TLabel" if warn else "Dim.TLabel")
        self._log(("NOTE: " if warn else "") + text)

    def _tools(self) -> None:
        from .tools_window import ToolsWindow

        ToolsWindow(self.root, log=self._log, base_dir=str(self.project.root) if self.project else None)

    def _settings(self) -> None:
        if not self._need_project():
            return
        p = self.project
        dlg = Toplevel(self.root)
        dlg.configure(bg=PANEL)
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

    def _next_step(self, c) -> str:
        for key, _ in STEPS:
            if not c.done.get(key):
                return key
        return "export"

    def _refresh(self, redraw: bool = True) -> None:
        """Update the step list (done / next / to do), the Continue button and the check summary; ``redraw`` also
        re-renders the current step panel (never from inside a step's own code, which would render itself again)."""
        if not self.project:
            return
        c = self.project.characters.get(self.char.get())
        nxt = self._next_step(c) if c else None
        for i, (key, title) in enumerate(STEPS):
            done = bool(c and c.done.get(key))
            tag = "done" if done else ("next" if key == nxt else "todo")
            mark = "✔ " if done else ("▶ " if key == nxt else "    ")
            self.step_list.item(key, text=f"{mark}{i + 1}. {title}", tags=(tag,))
        if c is None:
            self.go_btn.configure(text="▶ Add a character")
        elif all(c.done.get(k) for k, _ in STEPS):
            self.go_btn.configure(text="✔ All steps done")
        else:
            self.go_btn.configure(text=f"▶ Continue: {STEP_BLURB.get(nxt, nxt)}")
        issues = [v for k, v in (c.notes.items() if c else []) if k.endswith("_check") and v not in ("cutouts clean", "carve clean", "frames clean")]
        self.check_label.configure(text=("Checks: " + " · ".join(issues)) if issues else ("Checks: clean" if c and any(k.endswith("_check") for k in c.notes) else ""),
                                   style="Warn.TLabel" if issues else "Good.TLabel")
        sel = self.step_list.selection()
        if sel and redraw:
            self._show_step()

    def _continue(self) -> None:
        """The one button a person needs: open the next step, and run it when it is automatic."""
        if self.project is None or not self.char.get():
            self._add_character()
            return
        c = self.project.character(self.char.get())
        key = self._next_step(c)
        self.step_list.selection_set(key)
        if key in ("prompts", "import"):
            return   # these need the person
        self._run(lambda: api.run_step(self.project, c.name, key, log=self._log), after=lambda r: self._after_step(key, r), what=f"Working: {STEP_BLURB.get(key, key)}…")

    def _after_step(self, key: str, r: dict) -> None:
        self._refresh()
        c = self.project.character(self.char.get())
        nxt = self._next_step(c)
        self.step_list.selection_set(nxt if nxt != key else key)
        self.status.set(f"Done: {STEP_BLURB.get(key, key)}. Next: {STEP_BLURB.get(nxt, nxt)}." if nxt != key else "All steps done.")

    def _check(self) -> None:
        c = self._need_char()
        if c is None:
            return
        from .checks import check_character

        r = check_character(self.project, c.name)
        text = "Nothing to fix." if r["ok"] else "\n".join("• " + i for i in r["issues"])
        self._log("CHECK " + c.name + ": " + text.replace("\n", " | "))
        messagebox.showinfo("Checks: " + c.name, text)

    def _check_note(self, c, key: str) -> None:
        note = c.notes.get(key)
        if not note:
            return
        clean = note in ("cutouts clean", "carve clean", "frames clean")
        ttk.Label(self.panel, text=("✔ " if clean else "⚠ ") + note, style="Good.TLabel" if clean else "Warn.TLabel", wraplength=self._wrap(), justify=LEFT).pack(anchor="w", pady=(4, 0))

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
            ttk.Label(self.panel, text=sub, style="Dim.TLabel", wraplength=self._wrap(), justify=LEFT).pack(anchor="w", pady=(2, 8))

    def _wrap(self) -> int:
        try:
            return max(240, self.panel_canvas.winfo_width() - 40)
        except Exception:  # noqa: BLE001
            return 640

    def _steps_text(self, lines: list[str]) -> None:
        """Numbered, plain instructions under a heading."""
        ttk.Label(self.panel, text="\n".join(f"{i + 1}. {t}" for i, t in enumerate(lines)), justify=LEFT, wraplength=self._wrap()).pack(anchor="w", pady=(0, 8))

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
        ttk.Label(self.panel, text=DESCRIPTION_TIPS, style="Dim.TLabel", wraplength=self._wrap()).pack(anchor="w")
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
        for kind, label in (("sheet", "Copy A: sheet"), ("sheet4", "Copy A2: 4-view sheet"), ("sheet_t", "Copy A4: T-pose sheet"), ("sheet_top", "Copy A3: plan sheet"), ("front", "Copy B1: front"), ("back", "Copy B2: back"), ("sprite", "Copy C: sprite"), ("item", "Copy D: item")):
            ttk.Button(btns, text=label, command=lambda k=kind: copy(k)).pack(side=LEFT, padx=2)
        regen()

    def _step_import(self, c) -> None:
        self._heading("Step 2: Bring the pictures in", "Pick the PNG files you saved from Midjourney.")
        self._steps_text(["Click 'Choose file' next to 'Character sheet' and pick the sheet (front, side, back in one image). This one is needed.",
                          "If you also made a single pixel-style picture (prompt C), add it under 'Pixel-style image'. It helps the colours.",
                          "The single front / back / side pictures are optional extras.",
                          "Then click the next step on the left, or '▶ Run all automatic steps'."])
        rows = [("sheet", "A / A2. Character sheet (front / [three-quarter] / side / back)"), ("front", "B1. Front view (optional)"), ("back", "B2. Back view (optional)"), ("side", "Side view (optional)"), ("quarter", "Three-quarter view (optional)"), ("topbottom", "A3. Plan sheet: top view + underside (optional; hats, shoulders, crowns)"), ("style", "C. Pixel-style image (palette / quick path)")]
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

        ttk.Button(self.panel, text="Run split", command=run_split, style="Go.TButton").pack(anchor="w", pady=(6, 2))
        views_dir = self.project.sub(c.name, "views")
        views = [p for p in sorted(views_dir.glob("*.png")) if not p.stem.endswith("_raw")]
        self._check_note(c, "split_check")
        if views:
            row = ttk.Frame(self.panel)
            row.pack(anchor="w", pady=(6, 0))
            ttk.Label(row, text="Under each cutout: Edit erases leftover background or puts parts back; Skin paints on it (recolour, brush, glow).", wraplength=self._wrap(), justify=LEFT).pack(side=LEFT)
            ttk.Button(row, text="Open folder", command=lambda: webbrowser.open(str(views_dir))).pack(side=LEFT, padx=(12, 3))
            ttk.Button(row, text="Reload", command=self._show_step).pack(side=LEFT)
        self._preview_row(views, 240, actions=[("Edit", self._edit_cutout), ("Skin", self._skin_editor)])
        if views:
            ttk.Label(self.panel, text="Tip: the front view decides the body; make sure nothing of the background is left inside it. "
                      "You can also edit the files in the folder with any paint program, then Reload. After editing, run the next steps again.", style="Dim.TLabel", wraplength=self._wrap(), justify=LEFT).pack(anchor="w", pady=4)

    def _describe(self) -> None:
        """One box: say it, get a draft in the right editor."""
        from . import describe as D

        dlg = Toplevel(self.root)
        dlg.configure(bg=PANEL)
        dlg.title("Describe it, get it")
        ttk.Label(dlg, text="Say what you want. A spell, a change to a character's skin, a Midjourney prompt or a music cue.", wraplength=520).pack(anchor="w", padx=10, pady=(10, 2))
        ttk.Label(dlg, text="Examples: 'a wisp lantern spell, pale blue, slow, with embers'  ·  'make the left eye teal with a pale glow'  ·  'a slow sombre act 2 wilds tune'", style="Dim.TLabel", wraplength=520).pack(anchor="w", padx=10)
        text = ttk.Entry(dlg, width=70)
        text.pack(padx=10, pady=6)
        text.focus_set()
        c = self.project.characters.get(self.char.get()) if self.project else None
        views = sorted((self.project.sub(c.name, "views")).glob("front.png")) if c else []
        img = StringVar(value=str(views[0]) if views else "")
        row = ttk.Frame(dlg)
        row.pack(fill=X, padx=10)
        ttk.Label(row, text="Picture for skin edits:").pack(side=LEFT)
        ttk.Entry(row, textvariable=img, width=40).pack(side=LEFT, padx=4)
        ttk.Button(row, text="Choose…", command=lambda: img.set(filedialog.askopenfilename(filetypes=[("PNG", "*.png")]) or img.get())).pack(side=LEFT)
        out = ttk.Label(dlg, text="", style="Dim.TLabel", wraplength=520, justify=LEFT)
        out.pack(anchor="w", padx=10, pady=4)

        def go(*_):
            t = text.get().strip()
            if not t:
                return
            d = D.draft(t, image=img.get() or None)
            out.configure(text="I read: " + "; ".join(d["read"]))
            self._log("DESCRIBE " + t + " -> " + d["what"] + ": " + "; ".join(d["read"]))
            fx_dir = Path(self.project.root / "fx") if self.project else Path("art/fx")
            if d["what"] == "spell":
                from . import spell as S
                from .spell_designer import open_spell_designer
                path = S.save_spell(d["spell"], fx_dir / f"{d['spell']['name']}.spell.json")
                open_spell_designer(self.root, path, fx_dir, on_save=lambda r: self._log("exported " + r["png"]))
            elif d["what"] == "skin":
                if not img.get():
                    out.configure(text=out.cget("text") + "\nChoose the picture to locate the parts; the ops: " + json.dumps(d["ops"]))
                    return
                from .skin_editor import open_skin_editor
                ed = open_skin_editor(self.root, img.get(), on_save=lambda: (self._log("saved skin edits"), self._show_step()))
                for op in d["ops"]:
                    ed._do(op)
                ed.pick_label.set(f"Applied {len(d['ops'])} drafted op(s): adjust, Undo, or Save.")
            elif d["what"] == "prompt":
                self.root.clipboard_clear(); self.root.clipboard_append(d["prompt"])
                out.configure(text=out.cget("text") + "\nPrompt copied to the clipboard:\n" + d["prompt"][:300] + "…")
            else:
                from . import music
                r = music.make_music(d["cue"], fx_dir.parent / "music", seconds=60, overrides=d["knobs"])
                out.configure(text=out.cget("text") + "\nRendered " + ", ".join(Path(f).name for f in r["files"]) + " (playing)")
                music.play(next((f for f in r["files"] if f.endswith(".wav")), r["files"][0]))

        text.bind("<Return>", go)
        ttk.Button(dlg, text="Get it", command=go, style="Go.TButton").pack(pady=8)

    def _preview_game(self, skin: str | None = None, attach: bool = False) -> None:
        from .game_preview import preview_in_game

        c = self.project.characters.get(self.char.get()) if self.project else None
        js = c.notes.get("export_game_json") if c else None
        kind = skin or (Path(js).stem if js else None)
        game = Path(js).parent.parent if js else None
        try:
            r = preview_in_game(game, skin=kind, attach=attach, log=self._log)
        except Exception as e:  # noqa: BLE001
            messagebox.showerror(APP_TITLE, str(e) + "\n\nSet the Godot path in Settings (PIXELFORGE_GODOT) or install Godot 4.")
            return
        self.status.set("Game launched: " + " ".join(r["command"][-5:]))

    def _skin_editor(self, path) -> None:
        from .skin_editor import open_skin_editor

        open_skin_editor(self.root, path, on_save=lambda: (self._log(f"Saved skin edits in {Path(path).name}"), self._show_step()))

    def _color_editor(self, path) -> None:
        from .color_editor import open_color_editor

        open_color_editor(self.root, path, on_save=lambda: (self._log(f"Saved colours in {Path(path).name}"), self._show_step()))

    def _fx_editor(self, c) -> None:
        from .fx_editor import open_fx_editor

        js = c.notes.get("export_game_json")
        if not js or not Path(js).exists():
            messagebox.showinfo(APP_TITLE, "Export the game atlas first (step 9); the effects editor works on that sprite set.")
            return
        fx_dir = Path(js).parent.parent / "fx"
        open_fx_editor(self.root, js, fx_dir, on_save=lambda r: self._log(f"Saved {r['attachments']} effect attachment(s) into {Path(js).name}; sheets in {fx_dir}"))

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
            for p in sorted(d.glob("frame_[0-9][0-9][0-9].png")):
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
        self._steps_text(["Click 'Build palette'. That is all. The full-colour style keeps every colour; the other styles reduce to a fixed set."])
        ttk.Button(self.panel, text="Build palette", command=lambda: self._run(lambda: api.make_palette(self.project, c.name), after=lambda r: self._show_step())).pack(anchor="w")
        sw = self.project.char_dir(c.name) / "palette.png"
        if sw.exists():
            self._preview_row([sw], 120)
            ttk.Label(self.panel, text=c.notes.get("palette", "")).pack(anchor="w")

    def _step_model(self, c) -> None:
        self._heading("Step 5: Build the 3D figure", "PixelForge carves a figure from the views of your painting and wraps the painting around it. You never model anything by hand.")
        self._steps_text(["Blender (free) must be on this computer. If the line below says 'not found', click 'Download Blender for me' and wait.",
                          "Click 'Build model'. It takes a minute or two. The log at the bottom shows progress.",
                          "Wide hats become real cones; thin cords and charms become painted cards. A plan sheet (prompt A3) gives the top of the figure its own painting."])
        found = api.find_blender(self.project)
        ttk.Label(self.panel, text=f"Blender: {found or 'not found'}", style="Good.TLabel" if found else "Warn.TLabel").pack(anchor="w")
        if not found:
            ttk.Label(self.panel, text="Blender is free and the Forge can fetch it for you (about 380 MB, no installer, kept next to PixelForge).", wraplength=self._wrap()).pack(anchor="w")
            ttk.Button(self.panel, text="Download Blender for me", command=lambda: self._run(lambda: api.download_blender(self.project, log=self._log), after=lambda r: self._show_step())).pack(anchor="w", pady=2)
        ttk.Button(self.panel, text="Build model", command=lambda: self._run(lambda: api.build_model(self.project, c.name, log=self._log), after=self._after_model)).pack(anchor="w", pady=4)
        ttk.Label(self.panel, text=c.notes.get("model_note", ""), style="Dim.TLabel").pack(anchor="w")
        self._check_note(c, "model_check")

    def _after_model(self, r) -> None:
        self._after_step("model", r)

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
        self._heading("Step 7: Film it from 8 directions", "Blender films every animation from every direction with the game camera (looking down at 30°, the classic isometric view).")
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
        self._check_note(c, "render_check")
        ttk.Button(self.panel, text="Preview animation (renders)", command=lambda: self._preview_anim(c, "renders")).pack(anchor="w", pady=2)
        renders = self.project.sub(c.name, "renders")
        sample = sorted(renders.glob("*/S/frame_000.png"))[:1] + sorted(renders.glob("*/W/frame_000.png"))[:1]
        self._preview_row(sample, 200)

    def _step_pixelate(self, c) -> None:
        self._heading("Step 8: Turn the film into pixel art", f"Every frame becomes a pixel sprite in the '{self.project.style}' style, with the locked colours, so nothing flickers between frames.")
        self._steps_text(["Tick 'Add a dark 1-pixel outline' if your game draws sprites with an outline.",
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
        self._steps_text(["Any Godot game: click 'Export' for a sprite sheet, a SpriteFrames (.tres) and a ready scene (.tscn).",
                          "Game atlas: type the kind name (for example 'mystic') and click 'Export game atlas'. It writes <kind>.png + <kind>.json with 8 views and foot anchors, the format the PixelForge Godot add-on loads."])
        ttk.Button(self.panel, text="Export", command=lambda: self._run(lambda: api.export(self.project, c.name), after=self._after_export)).pack(anchor="w")
        ttk.Label(self.panel, text=c.notes.get("export", "")).pack(anchor="w")
        sheet = self.project.sub(c.name, "export") / f"{c.name}.png"
        if sheet.exists():
            self._preview_row([sheet], 300)
        ttk.Separator(self.panel).pack(fill=X, pady=8)
        ttk.Label(self.panel, text="Game atlas: <kind>.png + <kind>.json (8 views, foot anchors, normal and depth sets when those passes were rendered).", wraplength=self._wrap()).pack(anchor="w")
        f = ttk.Frame(self.panel)
        f.pack(anchor="w", pady=2)
        kind = StringVar(value=c.name)
        ttk.Label(f, text="Kind (file name):").pack(side=LEFT)
        ttk.Entry(f, textvariable=kind, width=16).pack(side=LEFT, padx=4)
        ttk.Button(f, text="Export game atlas", command=lambda: self._run(lambda: api.export_game(self.project, c.name, kind.get()), after=lambda r: (self._show_step(), self.status.set("Exported " + r["color"]["png"])))).pack(side=LEFT, padx=6)
        ttk.Label(self.panel, text=c.notes.get("export_game", "")).pack(anchor="w")
        js = c.notes.get("export_game_json")
        if js and Path(js).exists():
            ttk.Separator(self.panel).pack(fill=X, pady=8)
            ttk.Label(self.panel, text="Touch up the finished set", style="Head.TLabel").pack(anchor="w")
            row = ttk.Frame(self.panel)
            row.pack(anchor="w", pady=4)
            ttk.Button(row, text="Skin editor (every frame at once)", command=lambda: self._skin_editor(Path(js).with_suffix(".png"))).pack(side=LEFT)
            ttk.Button(row, text="Effects editor (attach smoke, glow, embers…)", command=lambda: self._fx_editor(c)).pack(side=LEFT, padx=6)
            ttk.Button(row, text="▶ Preview in game", command=lambda: self._preview_game(Path(js).stem, attach=True), style="Go.TButton").pack(side=LEFT, padx=6)

    def _after_export(self, r) -> None:
        self._show_step()
        self.status.set("Exported: " + str(r.get("godot", "")))
        self._log("Exported: " + str(r.get("godot", "")))

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
    def _preview_row(self, paths, height: int, zoom: bool = False, actions=()) -> None:
        """Pictures side by side, each with its name and, with `actions` [(label, fn(path))], its own buttons under it."""
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
            if actions:
                brow = ttk.Frame(cell)
                brow.pack()
                for label, fn in actions:
                    ttk.Button(brow, text=label, command=lambda fn=fn, p=p: fn(p), width=6).pack(side=LEFT, padx=1)

    def _run(self, fn, after=None, what: str = "Working…") -> None:
        if self.busy:
            self.status.set("Still working on the previous step; watch the log.")
            return
        self._set_busy(True, what)

        def done(then=None):
            self._set_busy(False)
            self._refresh()
            if then:
                then()

        def work():
            try:
                r = fn()
                brief = ", ".join(f"{k}={v}" for k, v in r.items() if k in ("character", "next", "colors", "count", "clips", "animations"))
                if brief:
                    self._log("OK: " + brief)
                self.root.after(0, lambda: done((lambda: after(r)) if after else None))
            except api.StepError as e:
                self.root.after(0, lambda: done(lambda: self._tell("Stopped: " + str(e), warn=True)))
            except Exception as e:  # noqa: BLE001
                self._log("ERROR: " + str(e) + "\n" + traceback.format_exc())
                self.root.after(0, lambda: done(lambda: self._tell("Something went wrong: " + str(e) + " (details in the log)", warn=True)))

        threading.Thread(target=work, daemon=True).start()

    def _run_all(self) -> None:
        c = self._need_char()
        if c is None:
            return
        self._run(lambda: api.run_until_blocked(self.project, c.name, log=self._log), after=self._after_run_all)

    def _after_run_all(self, r) -> None:
        self._refresh()
        if r["blocked_at"]:
            self.step_list.selection_set(r["blocked_at"])
            self._tell(f"Ran {', '.join(r['ran']) or 'nothing'}; stopped at step '{r['blocked_at']}': {r['reason']}", warn=True)
        else:
            self.step_list.selection_set("export")
            self._tell("All steps done: " + ", ".join(r["ran"]) + ". Step 9 shows the files the game loads.")

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
