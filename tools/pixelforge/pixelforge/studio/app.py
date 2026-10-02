"""The Studio shell: one window. A navigation column on the left, pages on the right, a status line with a progress
bar and a log drawer at the bottom. Nothing opens a second window; the OS file pickers are the only dialogs.

    from pixelforge.studio.app import Studio, main
    main()                      # what `pixelforge studio` runs

Pages live in the ``pages_*`` modules and are built the first time they are shown (``Studio.show(key, **kw)``).
"""
from __future__ import annotations

import json
import queue
import re
import threading
import traceback
import webbrowser
from pathlib import Path

from . import theme as T
from .theme import apply_theme
from .widgets import ScrollFrame, Tooltip, tk

APP_TITLE = "PixelForge Studio"
HELP_URL = "https://github.com/Kaspa-World-Eater/godmarrow/blob/main/tools/pixelforge/docs/GUIDE_HUMANS.md"
PREFS_DIR = Path.home() / ".pixelforge"
RECENT_FILE = PREFS_DIR / "recent.json"
PREFS_FILE = PREFS_DIR / "studio.json"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}

STEP_BLURB = {   # one line per step, shown on the Continue button and the status line
    "prompts": "write the Midjourney prompts", "import": "bring the pictures in", "split": "cut the figures out",
    "palette": "lock the colours", "model": "build the 3D figure", "rig": "add the skeleton and moves",
    "render": "film it from 8 directions", "pixelate": "turn the film into pixel art", "export": "make the game files",
}
STEP_SHORT = {"prompts": "Prompts", "import": "Pictures in", "split": "Cut out", "palette": "Colours", "model": "3D figure",
              "rig": "Skeleton", "render": "Film it", "pixelate": "Pixel art", "export": "Game files"}

# page key -> (module, class). Pages are imported when first shown.
PAGES = {
    "home": ("pages_home", "HomePage"),
    "character": ("pages_character", "CharacterPage"),
    "cutout": ("pages_editors", "CutoutPage"),
    "skin": ("pages_editors", "SkinPage"),
    "colour": ("pages_editors", "ColourPage"),
    "fx": ("pages_fx", "FxPage"),
    "spell": ("pages_spell", "SpellPage"),
    "tools": ("pages_tools", "ToolsPage"),
    "describe": ("pages_misc", "DescribePage"),
    "game": ("pages_game", "GamePage"),
    "settings": ("pages_misc", "SettingsPage"),
    "help": ("pages_misc", "HelpPage"),
}
TOOL_TABS = [("Effects", "effects"), ("Spells", "spells"), ("Objects", "objects"), ("Tiles", "tiles"), ("Icons", "icons"), ("Portraits", "portraits"),
             ("UI", "ui"), ("Sounds", "sounds"), ("Music", "music"), ("More", "more")]
NAV_TOOLS = [("Describe it, get it", "describe"), ("Effects and spells", "tools:effects"), ("Objects and tiles", "tools:objects"), ("Icons, portraits, UI", "tools:icons"),
             ("Sounds and music", "tools:sounds"), ("More tools", "tools:more")]
NAV_TAB_OF = {"effects": "tools:effects", "spells": "tools:effects", "objects": "tools:objects", "tiles": "tools:objects", "icons": "tools:icons",
              "portraits": "tools:icons", "ui": "tools:icons", "sounds": "tools:sounds", "music": "tools:sounds", "more": "tools:more"}


# ------------------------------------------------------------------------------ prefs
def recent() -> list[str]:
    try:
        return [p for p in json.loads(RECENT_FILE.read_text()) if Path(p).exists()]
    except Exception:  # noqa: BLE001
        return []


def remember(path: str) -> None:
    try:
        items = [path] + [p for p in recent() if p != path]
        RECENT_FILE.parent.mkdir(parents=True, exist_ok=True)
        RECENT_FILE.write_text(json.dumps(items[:8]))
    except OSError:
        pass


def forget(path: str) -> None:
    try:
        RECENT_FILE.write_text(json.dumps([p for p in recent() if p != path]))
    except OSError:
        pass


def prefs() -> dict:
    try:
        return json.loads(PREFS_FILE.read_text())
    except Exception:  # noqa: BLE001
        return {}


def set_pref(key: str, value) -> None:
    try:
        d = prefs()
        d[key] = value
        PREFS_FILE.parent.mkdir(parents=True, exist_ok=True)
        PREFS_FILE.write_text(json.dumps(d, indent=1))
    except OSError:
        pass


def repo_root() -> Path | None:
    """The git checkout this copy of PixelForge lives in (the game repository), if any."""
    here = Path(__file__).resolve().parents[2]
    for cand in (here, *here.parents):
        if (cand / ".git").exists():
            return cand
    return None


def game_dir() -> Path | None:
    """The Godot project (a folder with project.godot): the preference, else the repository above this package."""
    p = prefs().get("game_dir")
    if p and (Path(p) / "project.godot").exists():
        return Path(p)
    here = Path(__file__).resolve().parents[2]
    for cand in (here, *here.parents):
        if (cand / "project.godot").exists():
            return cand
    return None


# ------------------------------------------------------------------------------- pages
class Page:
    """A page in the main area. Subclasses build into ``self.frame`` in ``build()`` (called once) and react in
    ``on_show(**kw)`` / ``refresh()``. Optional hooks: ``on_hide``, ``undo``, ``redo``, ``zoom(delta)``, ``on_drop(paths)``."""

    key = ""
    title = ""
    blurb = ""

    def __init__(self, app: "Studio"):
        self.app = app
        t = tk()
        self.frame = t.ttk.Frame(app.page_host)
        self.built = False
        self.back = None

    def build(self) -> None:
        pass

    def on_show(self, **kw) -> None:
        pass

    def on_hide(self) -> None:
        pass

    def refresh(self) -> None:
        pass

    def header_title(self) -> tuple[str, str]:
        return self.title, self.blurb


class Studio:
    """The application. Keeps the names older scripts used (``project``, ``char``, ``busy``, ``_run``, ``_open``,
    ``_start_from_picture``, ``_run_all``, ``_tell``, ``_log``) and adds ``show(page, **kw)``."""

    def __init__(self, root, project_path: str | None = None):
        t = tk()
        apply_theme(root)
        self.root = root
        self.project = None
        self.char = t.StringVar()
        self.log_queue: queue.Queue[str] = queue.Queue()
        self.busy = False
        self.pages: dict[str, Page] = {}
        self.current: Page | None = None
        self.status = t.StringVar(value="Ready")
        self.status_shown = t.StringVar(value="Ready")
        self.status.trace_add("write", lambda *_: self._fit_status())
        self._status_warn = False
        self.update_bar = None
        self.progress_total = 0
        self.progress_done = 0
        root.title(APP_TITLE)
        self._size_window()
        icon = Path(__file__).resolve().parents[2] / "assets" / "pixelforge.ico"
        if icon.exists():
            try:
                root.iconbitmap(str(icon))
            except Exception:  # noqa: BLE001  (non-Windows Tk)
                pass
        self._build()
        self._keys()
        self._dnd()
        self.show("home")
        root.after(100, self._drain_log)
        root.after(1500, self._check_updates)
        if project_path:
            self._open(project_path)

    # ------------------------------------------------------------------ window
    def _size_window(self) -> None:
        r = self.root
        try:
            sw, sh = r.winfo_screenwidth(), r.winfo_screenheight()
        except Exception:  # noqa: BLE001
            sw, sh = 1280, 800
        w = min(1280, sw - 24)
        h = min(800, sh - 70)
        r.geometry(f"{w}x{h}+{max(0, (sw - w) // 2)}+{max(0, (sh - h) // 2 - 24)}")
        r.minsize(980, 600)

    def _build(self) -> None:
        t = tk()
        r = self.root
        self.top_slot = t.ttk.Frame(r, style="Ink.TFrame")
        self.top_slot.pack(side="top", fill="x")
        # bottom: status line, then the log drawer above it
        foot = t.ttk.Frame(r, style="Ink.TFrame", padding=(10, 4))
        foot.pack(side="bottom", fill="x")
        self.status_label = t.ttk.Label(foot, textvariable=self.status_shown, style="Status.TLabel", anchor="w")
        self.status_label.pack(side="left", fill="x", expand=True)
        self.status_label.bind("<Configure>", lambda e: self._fit_status())
        Tooltip(self.status_label, "The whole message is in the log (Log ▴) and on the page.")
        self.log_btn = t.ttk.Button(foot, text="Log ▴", width=7, command=self.toggle_log, style="Tool.TButton")
        self.log_btn.pack(side="right")
        self.progress = t.ttk.Progressbar(foot, mode="indeterminate", length=180)
        self.progress_label = t.ttk.Label(foot, text="", style="Status.TLabel")
        self.log_frame = t.ttk.Frame(r, style="Ink.TFrame", padding=(10, 0, 10, 4))
        from tkinter.scrolledtext import ScrolledText

        self.log = ScrolledText(self.log_frame, height=8, state="disabled", font=T.FONT_MONO, bg=T.FIELD, fg=T.BONE, relief="flat", bd=0,
                                highlightthickness=1, highlightbackground=T.BORDER, insertbackground=T.BONE)
        self.log.pack(fill="both", expand=True)
        self.log_open = bool(prefs().get("log_open", False))
        if self.log_open:
            self.log_frame.pack(side="bottom", fill="x")
            self.log_btn.configure(text="Log ▾")
        # body: nav | main
        body = t.ttk.Frame(r, style="Ink.TFrame")
        body.pack(side="top", fill="both", expand=True)
        self.nav_scroll = ScrollFrame(body, padding=0, bg=T.INK)
        self.nav_scroll.outer.configure(width=232)
        self.nav_scroll.outer.pack_propagate(False)
        self.nav_scroll.pack(side="left", fill="y")
        self.nav_scroll.canvas.configure(width=232)
        main = t.ttk.Frame(body, style="TFrame")
        main.pack(side="left", fill="both", expand=True)
        head = t.ttk.Frame(main, padding=(16, 10, 16, 6))
        head.pack(side="top", fill="x")
        left = t.ttk.Frame(head)
        left.pack(side="left", fill="x", expand=True)
        self.title_label = t.ttk.Label(left, text="", style="Title.TLabel")
        self.title_label.pack(anchor="w")
        self.blurb_label = t.ttk.Label(left, text="", style="Dim.TLabel", wraplength=800, justify="left")
        self.blurb_label.pack(anchor="w", fill="x")
        self.header_actions = t.ttk.Frame(head)
        self.header_actions.pack(side="right", anchor="n")
        head.bind("<Configure>", lambda e: self.blurb_label.configure(wraplength=max(300, e.width - self.header_actions.winfo_reqwidth() - 40)))
        t.ttk.Separator(main).pack(fill="x")
        self.page_host = t.ttk.Frame(main)
        self.page_host.pack(side="top", fill="both", expand=True)
        self._build_nav()

    # --------------------------------------------------------------------- nav
    def _build_nav(self) -> None:
        t = tk()
        n = self.nav_scroll.inner
        n.configure(style="Ink.TFrame")
        self.nav_items: dict[str, object] = {}
        t.ttk.Label(n, text="PixelForge", style="Brand.TLabel").pack(anchor="w", fill="x")
        self._nav_item("home", "Home")
        t.ttk.Label(n, text="CHARACTER", style="NavHead.TLabel").pack(anchor="w", fill="x")
        row = t.ttk.Frame(n, style="Ink.TFrame", padding=(12, 0, 8, 2))
        row.pack(fill="x")
        self.char_box = t.ttk.Combobox(row, textvariable=self.char, state="readonly", width=12)
        self.char_box.pack(side="left", fill="x", expand=True)
        self.char_box.bind("<<ComboboxSelected>>", lambda e: self._char_changed())
        b = t.ttk.Button(row, text="+", width=2, command=self._add_character, style="Tool.TButton")
        b.pack(side="left", padx=(4, 0))
        Tooltip(b, "Add a character by name (or drop a painting on the window)")
        from ..project import STEPS

        self.step_labels: dict[str, object] = {}
        for i, (key, _title) in enumerate(STEPS):
            lbl = self._nav_item(f"step:{key}", f"{i + 1}. {STEP_SHORT[key]}", style="NavStep.TLabel")
            self.step_labels[key] = lbl
        self._nav_item("step:still", "★ Quick path (no 3D)", style="NavStep.TLabel")
        t.ttk.Label(n, text="EDITORS", style="NavHead.TLabel").pack(anchor="w", fill="x")
        for key, label in (("cutout", "Cutout"), ("skin", "Skin"), ("colour", "Colour"), ("fx", "Effects on a sprite"), ("spell", "Spell designer")):
            self._nav_item(key, label, style="NavStep.TLabel")
        t.ttk.Label(n, text="TOOLS", style="NavHead.TLabel").pack(anchor="w", fill="x")
        for label, key in NAV_TOOLS:
            self._nav_item(key, label, style="NavStep.TLabel")
        t.ttk.Separator(n).pack(fill="x", padx=12, pady=(8, 4))
        self._nav_item("game", "Game: preview and play", style="NavStep.TLabel")
        self._nav_item("settings", "Settings", style="NavStep.TLabel")
        self._nav_item("help", "Help", style="NavStep.TLabel")

    def _nav_item(self, key: str, text: str, style: str = "Nav.TLabel"):
        t = tk()
        lbl = t.ttk.Label(self.nav_scroll.inner, text=text, style=style, cursor="hand2", anchor="w")
        lbl.pack(anchor="w", fill="x")
        lbl._base_style = style
        lbl.bind("<Button-1>", lambda e, k=key: self.nav_go(k))
        lbl.bind("<Enter>", lambda e, w=lbl: w.configure(style="NavHover.TLabel") if w._base_style == "Nav.TLabel" and not getattr(w, "_on", False) else None)
        lbl.bind("<Leave>", lambda e, w=lbl: w.configure(style=w._base_style) if not getattr(w, "_on", False) else None)
        self.nav_items[key] = lbl
        return lbl

    def nav_go(self, key: str) -> None:
        if key.startswith("step:"):
            self.show("character", step=key.split(":", 1)[1])
        elif key.startswith("tools:"):
            self.show("tools", tab=key.split(":", 1)[1])
        else:
            self.show(key)

    def _nav_mark(self, active_key: str) -> None:
        for key, lbl in self.nav_items.items():
            on = key == active_key
            lbl._on = on
            if on:
                lbl.configure(style="NavStepOn.TLabel" if lbl._base_style == "NavStep.TLabel" else "NavOn.TLabel")
            else:
                lbl.configure(style=lbl._base_style)

    def refresh_nav(self) -> None:
        """The step rows show done / next / to do for the current character."""
        from ..project import STEPS

        c = self.current_char()
        nxt = self.next_step(c) if c else None
        for i, (key, _t) in enumerate(STEPS):
            lbl = self.step_labels[key]
            done = bool(c and c.done.get(key))
            mark = "✔ " if done else ("▶ " if key == nxt else "")
            lbl.configure(text=f"{mark}{i + 1}. {STEP_SHORT[key]}")
            lbl._base_style = "NavDone.TLabel" if done else ("NavNext.TLabel" if key == nxt else "NavStep.TLabel")
            if not getattr(lbl, "_on", False):
                lbl.configure(style=lbl._base_style)
        names = sorted(self.project.characters) if self.project else []
        self.char_box.configure(values=names)
        if names and self.char.get() not in names:
            self.char.set(names[0])
        if not names:
            self.char.set("")

    # -------------------------------------------------------------------- pages
    def page(self, key: str) -> Page:
        if key not in self.pages:
            mod_name, cls_name = PAGES[key]
            import importlib

            mod = importlib.import_module(f"pixelforge.studio.{mod_name}")
            pg = getattr(mod, cls_name)(self)
            self.pages[key] = pg
        return self.pages[key]

    def show(self, key: str, **kw) -> Page:
        """Switch the main area to a page. ``back=(page_key, kwargs)`` gives it a Back button."""
        t = tk()
        pg = self.page(key)
        if self.current is not None and self.current is not pg:
            try:
                self.current.on_hide()
            except Exception:  # noqa: BLE001
                self._log("ERROR hiding page: " + traceback.format_exc()[-400:])
            self.current.frame.pack_forget()
        if not pg.built:
            try:
                pg.build()
            except Exception:
                self._log("ERROR building page " + key + ": " + traceback.format_exc())
                raise
            pg.built = True
        pg.back = kw.pop("back", None) if "back" in kw else pg.back
        if "back" not in kw and key in ("home", "character", "tools", "game", "settings", "help", "describe"):
            pg.back = None
        for w in self.header_actions.winfo_children():
            w.destroy()
        if pg.back:
            bk, bkw = pg.back
            label = "Back to step 3" if (bk == "character" and bkw.get("step") == "split") else ("Back to the character" if bk == "character" else "Back")
            t.ttk.Button(self.header_actions, text="‹ " + label, command=lambda: self.show(bk, **bkw)).pack(side="right")
        self.current = pg
        pg.frame.pack(fill="both", expand=True)
        try:
            pg.on_show(**kw)
        except Exception:  # noqa: BLE001
            self._log("ERROR showing page " + key + ": " + traceback.format_exc())
            self._tell("That page could not be shown; details in the log.", warn=True)
        title, blurb = pg.header_title()
        self.title_label.configure(text=title)
        self.blurb_label.configure(text=blurb)
        nav_key = key
        if key == "character":
            step = getattr(pg, "step", None)
            nav_key = f"step:{step}" if step else "character"
        elif key == "tools":
            nav_key = NAV_TAB_OF.get(getattr(pg, "tab", "effects"), "tools:effects")
        self._nav_mark(nav_key)
        return pg

    def set_header(self, title: str, blurb: str = "") -> None:
        self.title_label.configure(text=title)
        self.blurb_label.configure(text=blurb)

    def refresh_all(self) -> None:
        self.refresh_nav()
        if self.current is not None:
            try:
                self.current.refresh()
            except Exception:  # noqa: BLE001
                self._log("ERROR refreshing page: " + traceback.format_exc()[-600:])

    # --------------------------------------------------------------------- keys
    def _keys(self) -> None:
        r = self.root
        r.bind_all("<Control-p>", lambda e: self._start_from_picture())
        r.bind_all("<Control-o>", lambda e: self._open_dialog())
        r.bind_all("<Control-n>", lambda e: self._new())
        r.bind_all("<Control-t>", lambda e: self.show("tools"))
        r.bind_all("<Control-d>", lambda e: self.show("describe"))
        r.bind_all("<F5>", lambda e: self._run_all())
        r.bind_all("<F1>", lambda e: self.show("help"))
        r.bind_all("<Control-z>", lambda e: self._page_call("undo", e))
        r.bind_all("<Control-y>", lambda e: self._page_call("redo", e))
        r.bind_all("<Control-Shift-Z>", lambda e: self._page_call("redo", e))
        r.bind_all("<Control-s>", lambda e: self._page_call("save", e))
        for seq in ("<plus>", "<KP_Add>", "<equal>"):
            r.bind_all(seq, lambda e: self._page_zoom(1, e))
        for seq in ("<minus>", "<KP_Subtract>", "<underscore>"):
            r.bind_all(seq, lambda e: self._page_zoom(-1, e))
        r.bind_all("<Escape>", lambda e: self._escape())
        r.bind_all("<Control-l>", lambda e: self.toggle_log())

    def _typing(self, e) -> bool:
        w = e.widget if e is not None else None
        try:
            return w is not None and w.winfo_class() in ("Entry", "TEntry", "Text", "TCombobox", "TSpinbox", "Spinbox")
        except Exception:  # noqa: BLE001
            return False

    def _page_call(self, name: str, e=None) -> None:
        if self._typing(e) and name in ("undo", "redo"):
            return
        fn = getattr(self.current, name, None)
        if callable(fn):
            fn()

    def _page_zoom(self, delta: int, e=None) -> None:
        if self._typing(e):
            return
        fn = getattr(self.current, "zoom", None)
        if callable(fn):
            fn(delta)

    def _escape(self) -> None:
        if self.current is not None and self.current.back:
            bk, bkw = self.current.back
            self.show(bk, **bkw)

    # ---------------------------------------------------------- drag and drop
    def _dnd(self) -> None:
        self.dnd_ok = False
        try:
            from tkinterdnd2 import DND_FILES
        except Exception:  # noqa: BLE001
            return
        if not hasattr(self.root, "drop_target_register"):
            return
        try:
            self.root.drop_target_register(DND_FILES)
            self.root.dnd_bind("<<Drop>>", self._on_drop_event)
            self.dnd_ok = True
        except Exception:  # noqa: BLE001
            self.dnd_ok = False

    def _on_drop_event(self, event) -> None:
        try:
            paths = [str(p) for p in self.root.tk.splitlist(event.data)]
        except Exception:  # noqa: BLE001
            paths = [event.data]
        self.on_drop(paths)

    def on_drop(self, paths: list[str]) -> None:
        """Files dropped on the window: the page may take them; otherwise a picture starts a character, a project
        folder opens, a spell file opens in the designer, a sprite set opens the effects editor."""
        handler = getattr(self.current, "on_drop", None)
        if callable(handler) and handler(paths):
            return
        for p in paths:
            path = Path(p)
            if path.is_dir() and (path / "project.json").exists():
                self._open(str(path))
                return
            if path.suffix.lower() in IMAGE_EXT:
                self._start_from_picture(str(path))
                return
            if path.name.endswith(".spell.json"):
                self.show("spell", path=str(path))
                return
            if path.suffix == ".json":
                self.show("fx", sprite_json=str(path))
                return
        self._tell(f"Dropped {len(paths)} file(s), but none is a picture, a project folder or a spell.", warn=True)

    # ------------------------------------------------------------- status/log
    def _tell(self, text: str, warn: bool = False) -> None:
        """Say something in the window itself: the status line, the current page's note, the log. Never a pop-up."""
        self.status.set(text)
        self.status_label.configure(style="StatusWarn.TLabel" if warn else "Status.TLabel")
        note = getattr(self.current, "note", None)
        if note is not None:
            try:
                note.say(text, "warn" if warn else "info")
            except Exception:  # noqa: BLE001
                pass
        self._log(("NOTE: " if warn else "") + text)

    def _fit_status(self) -> None:
        """Show as much of the status text as fits on the one line, with … when it is cut (the page note and the
        log have all of it)."""
        text = " ".join(self.status.get().split())
        try:
            from tkinter import font as tkfont

            from .widgets import elide

            label = self.status_label
            width = label.winfo_width() - 8
            if width < 40 or not text:
                self.status_shown.set(text)
                return
            f = tkfont.Font(font=label.cget("font") or T.FONT_S)
            self.status_shown.set(elide(text, f.measure, width))
        except Exception:  # noqa: BLE001
            self.status_shown.set(text)

    def _log(self, text: str) -> None:
        self.log_queue.put(str(text))

    def _drain_log(self) -> None:
        try:
            while True:
                line = self.log_queue.get_nowait()
                m = re.search(r"PF_PROGRESS\s+action=(\S+)\s+frames=(\d+)", line)
                if m:
                    self.progress_done += 1
                    self.root.after(0, self._progress_text, f"{m.group(1)}: {m.group(2)} frames")
                self.log.configure(state="normal")
                self.log.insert("end", line + "\n")
                self.log.see("end")
                self.log.configure(state="disabled")
        except queue.Empty:
            pass
        self.root.after(100, self._drain_log)

    def _progress_text(self, text: str) -> None:
        self.progress_label.configure(text=text)

    def toggle_log(self) -> None:
        self.log_open = not self.log_open
        if self.log_open:
            self.log_frame.pack(side="bottom", fill="x")
            self.log_btn.configure(text="Log ▾")
        else:
            self.log_frame.pack_forget()
            self.log_btn.configure(text="Log ▴")
        set_pref("log_open", self.log_open)

    def _set_busy(self, on: bool, text: str = "") -> None:
        self.busy = on
        self.status.set(text or ("Working…" if on else "Ready"))
        self.status_label.configure(style="Status.TLabel")
        if on:
            self.progress_label.configure(text="")
            self.progress_label.pack(side="right", padx=(0, 8))
            self.progress.pack(side="right", padx=8)
            self.progress.start(12)
        else:
            self.progress.stop()
            self.progress.pack_forget()
            self.progress_label.pack_forget()
        hook = getattr(self.current, "set_busy", None)
        if callable(hook):
            hook(on)

    def _run(self, fn, after=None, what: str = "Working…", on_error=None) -> bool:
        """Run ``fn`` on a worker thread; ``after(result)`` on the Tk thread. A StepError is shown as a stop (where
        and why), anything else as an error with the traceback in the log."""
        from .. import api

        if self.busy:
            self.status.set("Still working on the previous step; watch the log (Log ▴).")
            return False
        self._set_busy(True, what)

        def done(then=None):
            self._set_busy(False)
            self.refresh_all()
            if then:
                then()

        def work():
            try:
                r = fn()
                if isinstance(r, dict):
                    brief = ", ".join(f"{k}={v}" for k, v in r.items() if k in ("character", "next", "colors", "count", "clips", "animations", "png", "gif", "files"))
                    if brief:
                        self._log("OK: " + brief)
                self.root.after(0, lambda: done((lambda: after(r)) if after else None))
            except api.StepError as e:
                self.root.after(0, lambda: done(lambda: (self._tell("Stopped: " + str(e), warn=True), on_error(str(e)) if on_error else None)))
            except Exception as e:  # noqa: BLE001
                self._log("ERROR: " + str(e) + "\n" + traceback.format_exc())
                self.root.after(0, lambda: done(lambda: (self._tell("Something went wrong: " + str(e) + " (details in the log)", warn=True), on_error(str(e)) if on_error else None)))

        threading.Thread(target=work, daemon=True).start()
        return True

    # ----------------------------------------------------------------- project
    def _new(self) -> None:
        from tkinter import filedialog

        from .. import api

        folder = filedialog.askdirectory(title="Choose an EMPTY folder for the new project")
        if not folder:
            return
        try:
            api.new_project(folder, Path(folder).name, style="godmarrow")
        except FileExistsError:
            pass
        except Exception as e:  # noqa: BLE001
            self._tell(f"Could not make a project there: {e}", warn=True)
            return
        self._open(folder)

    def _open_dialog(self) -> None:
        from tkinter import filedialog

        folder = filedialog.askdirectory(title="Open a project folder (the one with project.json)")
        if folder:
            self._open(folder)

    def _open(self, path: str, go: bool = True) -> bool:
        from ..project import Project

        try:
            self.project = Project.load(path)
        except Exception as e:  # noqa: BLE001
            self._tell(f"Could not open that project: {e}", warn=True)
            return False
        self.root.title(f"{APP_TITLE}  ·  {self.project.name}")
        self._log(f"Opened {self.project.file}")
        remember(str(self.project.root))
        names = sorted(self.project.characters)
        if names and self.char.get() not in names:
            self.char.set(names[0])
        self.refresh_all()
        if go and names:
            self.show("character", step=self.next_step(self.project.character(self.char.get())))
        elif go:
            self.show("home")
        self.status.set(f"Project: {self.project.name}  ·  style {self.project.style}  ·  {self.project.root}")
        return True

    def _ensure_project(self) -> bool:
        """No project open: make one in Documents/PixelForge Projects/My Game (or open it) so a person can start
        from a painting and never meet the empty-folder step."""
        from .. import api

        if self.project is not None:
            return True
        home = Path.home()
        base = home / "Documents" if (home / "Documents").exists() else home
        folder = base / "PixelForge Projects" / "My Game"
        try:
            if not (folder / "project.json").exists():
                folder.mkdir(parents=True, exist_ok=True)
                api.new_project(folder, "My Game", style="godmarrow")
            ok = self._open(str(folder), go=False)
            self._log(f"Made a project for you in {folder} (Settings > Open another project to use a different one).")
            return ok
        except Exception as e:  # noqa: BLE001
            self._tell(f"Could not make a project folder: {e}. Use Settings > New project and pick a folder.", warn=True)
            return False

    def current_char(self):
        if self.project is None or not self.char.get():
            return None
        return self.project.characters.get(self.char.get())

    @staticmethod
    def next_step(c) -> str:
        from ..project import STEPS

        for key, _ in STEPS:
            if not c.done.get(key):
                return key
        return "export"

    def _char_changed(self) -> None:
        self.refresh_nav()
        c = self.current_char()
        if c is not None:
            self.show("character", step=self.next_step(c))

    def _start_from_picture(self, path: str | None = None) -> None:
        """One move: pick a painting; the character is named after the file, the picture brought in and every
        automatic step run. A wide picture is a sheet of views, a tall one a single front view."""
        from PIL import Image

        from .. import api

        if self.busy:
            self.status.set("Still working on the previous step; watch the log.")
            return
        if not path:
            from tkinter import filedialog

            path = filedialog.askopenfilename(title="Your painting", filetypes=[("Images", "*.png *.jpg *.jpeg *.webp"), ("All files", "*.*")])
        if not path:
            return
        if not self._ensure_project():
            return
        try:
            with Image.open(path) as im:
                w, h = im.size
        except Exception as e:  # noqa: BLE001
            self._tell(f"That file is not a picture that can be opened: {e}", warn=True)
            return
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
        self._open(str(self.project.root), go=False)
        self.char.set(r["character"])
        self.refresh_nav()
        self.show("character", step="split")
        self._log(f"'{r['character']}' made from {Path(path).name} ({'a sheet of views' if kind == 'sheet' else 'one front view'}). Running every automatic step.")
        self._run_all()

    def _add_character(self) -> None:
        if not self._ensure_project():
            return
        self.show("character", new=True)

    def _run_all(self) -> None:
        from .. import api

        c = self.current_char()
        if c is None:
            self._tell("Add a character first: open a painting (Ctrl+P) or press + next to the character box.", warn=True)
            return
        self.show("character", step=self.next_step(c))
        self._run(lambda: api.run_until_blocked(self.project, c.name, log=self._log), after=self._after_run_all, what="Running every automatic step…")

    def _after_run_all(self, r: dict) -> None:
        self.refresh_all()
        c = self.current_char()
        if r["blocked_at"]:
            self.show("character", step=r["blocked_at"])
            self._tell(f"Ran {', '.join(r['ran']) or 'nothing'}; stopped at step '{r['blocked_at']}': {r['reason']}", warn=True)
        elif r["ran"]:
            self.show("character", step="export")
            self._tell("All steps done: " + ", ".join(r["ran"]) + ". Step 9 shows the files the game loads.")
        else:
            self.show("character", step="export")
            self._tell("Nothing left to run: all 9 steps are done. Step 9 shows the files the game loads.")

    def run_step(self, key: str, **kw) -> None:
        """Run one pipeline step for the current character and come back to its page."""
        from .. import api

        c = self.current_char()
        if c is None:
            return
        self._run(lambda: api.run_step(self.project, c.name, key, log=self._log, **kw), after=lambda r: self._after_step(key, r), what=f"Working: {STEP_BLURB.get(key, key)}…")

    def _after_step(self, key: str, r: dict) -> None:
        self.refresh_all()
        c = self.current_char()
        nxt = self.next_step(c)
        self.show("character", step=nxt if nxt != key else key)
        self._tell(f"Done: {STEP_BLURB.get(key, key)}. Next: {STEP_BLURB.get(nxt, nxt)}." if nxt != key else "All steps done.")

    def continue_(self) -> None:
        """The one button a person needs: open the next step, and run it when it is automatic."""
        c = self.current_char()
        if c is None:
            self._add_character()
            return
        key = self.next_step(c)
        self.show("character", step=key)
        if key in ("prompts", "import"):
            return
        self.run_step(key)

    # ----------------------------------------------------------------- updates
    def _check_updates(self) -> None:
        """Quietly ask the repository whether a newer Forge exists; if so, show one bar: Update and restart."""
        import shutil
        import subprocess

        repo = repo_root()
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
        t = tk()
        if self.update_bar is not None:
            return
        self.update_bar = t.ttk.Frame(self.top_slot, padding=(10, 5), style="Card.TFrame")
        self.update_bar.pack(fill="x")
        t.ttk.Label(self.update_bar, text=f"A newer PixelForge is ready ({behind} change{'s' if behind != 1 else ''}).", style="Warn.TLabel", background=T.PANEL2).pack(side="left")
        t.ttk.Button(self.update_bar, text="Update and restart", command=self._update_forge, style="Go.TButton").pack(side="left", padx=8)
        t.ttk.Button(self.update_bar, text="Later", command=self._dismiss_update).pack(side="left")

    def _dismiss_update(self) -> None:
        if self.update_bar is not None:
            self.update_bar.destroy()
            self.update_bar = None

    def _update_forge(self) -> dict:
        """Pull the latest Forge from the repository it was installed from, install, relaunch. Returns what happened
        (also shown in the status line and the log)."""
        import subprocess
        import sys

        repo = repo_root()
        if repo is None:
            self._tell("This copy was not installed from git; download the latest release instead.", warn=True)
            return {"ok": False, "reason": "not a git checkout"}
        try:
            r = subprocess.run(["git", "pull", "--ff-only"], cwd=str(repo), capture_output=True, text=True, timeout=120)
            out = (r.stdout + r.stderr).strip()[-800:]
        except Exception as e:  # noqa: BLE001
            self._tell(f"Could not run git: {e}", warn=True)
            return {"ok": False, "reason": str(e)}
        self._log("UPDATE " + out.replace("\n", " | "))
        if "Already up to date" in out:
            self._tell("Already up to date.")
            self._dismiss_update()
            return {"ok": True, "updated": False}
        if r.returncode != 0:
            self._tell("The update did not apply: " + out.splitlines()[-1] if out else "The update did not apply.", warn=True)
            return {"ok": False, "reason": out}
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-e", str(Path(__file__).resolve().parents[2])], capture_output=True, text=True, timeout=600)
        except Exception:  # noqa: BLE001
            pass
        self.status.set("Updated. Restarting…")
        self.root.update()
        try:
            subprocess.Popen([sys.executable, "-m", "pixelforge.cli", "studio"], cwd=str(Path(__file__).resolve().parents[2]))
        except Exception as e:  # noqa: BLE001
            self._tell(f"Updated. Please close and reopen PixelForge Studio. ({e})", warn=True)
            return {"ok": True, "updated": True, "restarted": False}
        self.root.after(300, self.root.destroy)
        return {"ok": True, "updated": True, "restarted": True}


def make_root():
    """The Tk root: with drag-and-drop when tkinterdnd2 is installed, a plain Tk otherwise."""
    t = tk()
    try:
        from tkinterdnd2 import TkinterDnD

        return TkinterDnD.Tk()
    except Exception:  # noqa: BLE001
        return t.Tk()


def main(project_path: str | None = None) -> None:
    """Entry point. Under pythonw (no console) a crash would be silent, so it is written to ``studio_error.log``
    next to the package and shown in the one box this program may show: that it could not start."""
    try:
        root = make_root()
        Studio(root, project_path)
        root.mainloop()
    except Exception:  # noqa: BLE001
        log_path = Path(__file__).resolve().parents[2] / "studio_error.log"
        text = traceback.format_exc()
        try:
            log_path.write_text(text)
        except OSError:
            pass
        try:
            from tkinter import messagebox

            messagebox.showerror(APP_TITLE, f"PixelForge Studio could not start.\n\n{text[-1500:]}\n\nSaved to {log_path}")
        except Exception:  # noqa: BLE001
            print(text)
        raise
