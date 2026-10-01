"""The Game page: see a sprite set or an effect in the game, take a screenshot, play the game."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from . import theme as T
from .app import Page, game_dir, prefs, set_pref
from .widgets import Note, PreviewArea, ScrollFrame, Tooltip, heading, hsep, para, tk

ZONES = ["moor", "fen", "barrow", "ash_shore", "broken_bridge", "bogwitch_shack"]


class GamePage(Page):
    key = "game"
    title = "Game"
    blurb = "See it in the game: launch Godmarrow with a sprite set on the hero and effects playing at them, take a screenshot, or just play."

    def build(self) -> None:
        t = tk()
        self.scroll = ScrollFrame(self.frame)
        self.scroll.pack(fill="both", expand=True)
        p = self.scroll.inner
        self.status = para(p, "", style="Dim.TLabel")
        grid = t.ttk.Frame(p)
        grid.pack(anchor="w", pady=(4, 2))
        t.ttk.Label(grid, text="Sprite set on the hero").grid(row=0, column=0, sticky="w", padx=(0, 10), pady=3)
        self.skin = t.StringVar(value="")
        self.skin_box = t.ttk.Combobox(grid, textvariable=self.skin, values=[], width=22)
        self.skin_box.grid(row=0, column=1, sticky="w")
        t.ttk.Label(grid, text="Zone").grid(row=1, column=0, sticky="w", padx=(0, 10), pady=3)
        self.zone = t.StringVar(value="moor")
        t.ttk.Combobox(grid, textvariable=self.zone, values=ZONES, width=14).grid(row=1, column=1, sticky="w")
        t.ttk.Label(grid, text="Hour (0.5 = night)").grid(row=2, column=0, sticky="w", padx=(0, 10), pady=3)
        self.hour = t.StringVar(value="")
        e = t.ttk.Entry(grid, textvariable=self.hour, width=6)
        e.grid(row=2, column=1, sticky="w")
        Tooltip(e, "Blank = the game's own time. 0.5 is midnight (lanterns and glows show), 0.0 noon.")
        self.attach = t.BooleanVar(value=False)
        t.ttk.Checkbutton(grid, text="Spawn the set's attached effects (from Effects on a sprite)", variable=self.attach).grid(row=3, column=0, columnspan=2, sticky="w", pady=3)
        t.ttk.Label(p, text="Effects playing at the hero (Ctrl+click for several):").pack(anchor="w", pady=(6, 0))
        row = t.ttk.Frame(p)
        row.pack(anchor="w", fill="x")
        self.fx_list = t.Listbox(row, height=7, selectmode="extended", exportselection=False, bg=T.FIELD, fg=T.BONE, selectbackground=T.TEAL_DK,
                                 selectforeground="#eafff8", highlightthickness=0, relief="flat", font=T.FONT_S, width=36)
        self.fx_list.pack(side="left")
        sb = t.ttk.Scrollbar(row, orient="vertical", command=self.fx_list.yview)
        sb.pack(side="left", fill="y")
        self.fx_list.configure(yscrollcommand=sb.set)
        col = t.ttk.Frame(row, padding=(12, 0))
        col.pack(side="left", anchor="n")
        t.ttk.Button(col, text="None", command=lambda: self.fx_list.selection_clear(0, "end"), style="Tool.TButton").pack(anchor="w")
        self.fx_filter = t.StringVar(value="")
        fe = t.ttk.Entry(col, textvariable=self.fx_filter, width=16)
        fe.pack(anchor="w", pady=(6, 0))
        fe.bind("<KeyRelease>", lambda ev: self.fill_fx())
        Tooltip(fe, "Filter the list")
        btns = t.ttk.Frame(p)
        btns.pack(anchor="w", pady=(10, 4))
        b = t.ttk.Button(btns, text="▶ Preview in game", command=self.preview, style="Go.TButton")
        b.pack(side="left")
        Tooltip(b, "Opens the game window on the zone with these settings; close it when done.")
        t.ttk.Button(btns, text="Take a screenshot", command=self.screenshot).pack(side="left", padx=6)
        t.ttk.Button(btns, text="Play the game", command=self.play).pack(side="left")
        self.note = Note(p)
        hsep(p)
        heading(p, "Last screenshot")
        self.shot = PreviewArea(p, height=420, caption="")
        self.shot.pack(fill="x")
        self.scroll.refit()

    def on_show(self, skin: str | None = None, fx: list | None = None, attach: bool | None = None, **_kw) -> None:
        self.refresh()
        if skin:
            self.skin.set(skin)
        elif not self.skin.get():
            c = self.app.current_char()
            js = c.notes.get("export_game_json") if c else None
            if js:
                self.skin.set(Path(js).stem)
        if attach is not None:
            self.attach.set(bool(attach))
        if fx:
            self.fx_list.selection_clear(0, "end")
            names = list(self.fx_list.get(0, "end"))
            for f in fx:
                if f in names:
                    i = names.index(f)
                    self.fx_list.selection_set(i)
                    self.fx_list.see(i)
        last = prefs().get("last_shot")
        if last and Path(last).exists():
            self.shot.show(last, caption=last)
        else:
            self.shot.clear("No screenshot yet. 'Take a screenshot' runs the game for a few seconds and saves one here.")

    def refresh(self) -> None:
        from ..game_preview import find_godot

        g = game_dir()
        godot = find_godot(prefs().get("godot") or None)
        parts = [f"Game: {g}" if g else "Game folder not found (Settings > Game folder).", f"Godot: {godot}" if godot else "Godot not found (Settings > Godot program); 'Play the game' can still use Play Godmarrow.bat, which fetches it."]
        self.status.configure(text="  ·  ".join(parts), style="Dim.TLabel" if (g and godot) else "Warn.TLabel")
        kinds = []
        if g and (g / "art" / "sprites").exists():
            kinds = sorted(p.stem for p in (g / "art" / "sprites").glob("*.json") if p.stem != "skins" and not p.stem.endswith(("_normal", "_depth")))
        self.skin_box.configure(values=kinds)
        self.fill_fx()

    def fill_fx(self) -> None:
        g = game_dir()
        sel = {self.fx_list.get(i) for i in self.fx_list.curselection()}
        self.fx_list.delete(0, "end")
        flt = self.fx_filter.get().strip().lower()
        if g and (g / "art" / "fx").exists():
            for p in sorted((g / "art" / "fx").glob("*.json")):
                if p.name.endswith(".spell.json"):
                    continue
                if flt and flt not in p.stem.lower():
                    continue
                self.fx_list.insert("end", p.stem)
                if p.stem in sel:
                    self.fx_list.selection_set("end")

    def _args(self) -> dict:
        fx = [self.fx_list.get(i) for i in self.fx_list.curselection()]
        hour = None
        if self.hour.get().strip():
            try:
                hour = float(self.hour.get())
            except ValueError:
                hour = None
        return {"skin": self.skin.get().strip() or None, "fx": fx or None, "attach": bool(self.attach.get()), "zone": self.zone.get().strip() or "moor", "hour": hour}

    def preview(self) -> None:
        from ..game_preview import preview_in_game

        a = self._args()
        g = game_dir()
        try:
            r = preview_in_game(g, godot=prefs().get("godot") or None, log=self.app._log, **a)
        except Exception as e:  # noqa: BLE001
            self.note.warn(str(e))
            return
        self.note.good("Game launched: " + " ".join(r["command"][-6:]))

    def screenshot(self) -> None:
        from ..game_preview import preview_in_game

        a = self._args()
        g = game_dir()
        out = Path.home() / ".pixelforge" / "shots"
        out.mkdir(parents=True, exist_ok=True)
        shot = out / f"{a['skin'] or 'game'}_{a['zone']}.png"

        def work():
            env = {}
            if sys.platform.startswith("linux") and not os.environ.get("DISPLAY"):
                raise RuntimeError("A screen is needed for a screenshot (the game must open a window).")
            return preview_in_game(g, godot=prefs().get("godot") or None, shot=str(shot), shot_t=5.0, log=self.app._log, **a)

        def done(r):
            if r.get("png"):
                set_pref("last_shot", r["png"])
                self.shot.show(r["png"], caption=r["png"])
                self.note.good("Screenshot saved: " + r["png"])
            else:
                self.note.warn(r.get("error", "The game did not write the screenshot."))

        self.app._run(work, after=done, what="Running the game for a screenshot (about 20 seconds)…")

    def play(self) -> None:
        g = game_dir()
        bat = (g / "Play Godmarrow.bat") if g else None
        if bat and bat.exists() and sys.platform.startswith("win"):
            try:
                os.startfile(str(bat))  # type: ignore[attr-defined]
                self.note.good("Play Godmarrow.bat started (it pulls updates, finds Godot and plays).")
            except Exception as e:  # noqa: BLE001
                self.note.warn(str(e))
            return
        from ..game_preview import find_godot

        godot = find_godot(prefs().get("godot") or None)
        if not g or not godot:
            self.note.warn("Godot or the game folder was not found; set them in Settings.")
            return
        subprocess.Popen([godot, "--path", str(g)], cwd=str(g), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.note.good(f"Game started: {godot} --path {g}")
