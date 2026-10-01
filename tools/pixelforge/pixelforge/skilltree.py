"""Skill-tree editor over Godmarrow's ``data/skills.json``.

The game's skill data is exported from the browser build and then reshaped by
``tools/skill_trees.py`` (the source of truth for every change).  This editor
never writes ``skills.json`` straight from the GUI: it keeps an **edit file**
``tools/skill_tree_edits.json`` (``{skill id: {row, col, tab, name, description,
lore}}``) that ``apply_edits`` lays over the data, and that ``skill_trees.py``
applies as its last step, so the edits survive a re-export.

Headless use::

    pixelforge skilltree data/skills.json --list ossumancer      # the Ossuarch (ids are the data's; names are the lore's)
    pixelforge skilltree data/skills.json --move raise=1,3,0 --rename raise="Raise the Fallen" --apply

GUI (Tkinter): ``pixelforge skilltree data/skills.json`` with no flags.  Left: class
and tab; centre: the 6-row grid (click a skill, arrow keys or drag to move it,
clashes shown in red); right: name / description / lore.  Save writes the edit
file and applies it.
"""

from __future__ import annotations

import json
from pathlib import Path

ROW_LVL = {1: 1, 2: 6, 3: 12, 4: 18, 5: 24, 6: 30}
# the orders as the lore names them (ui/title.gd is the game's own list); the data keeps the old ids
ORDER_NAMES = {"animancer": "The Hollow Mystic", "ossumancer": "The Ossuarch", "miasmancer": "The Shrine Keeper",
               "monk": "The Empty Hand", "hemomancer": "The Red Penitent"}


def order_name(cls: str) -> str:
    return ORDER_NAMES.get(cls, cls)
EDIT_FIELDS = ("row", "col", "tab", "name", "description", "lore")


def load(skills_path: str | Path) -> dict:
    return json.loads(Path(skills_path).read_text())


def edits_path(skills_path: str | Path) -> Path:
    return Path(skills_path).resolve().parent.parent / "tools" / "skill_tree_edits.json"


def load_edits(path: Path) -> dict:
    return json.loads(path.read_text()) if path.exists() else {}


def apply_edits(data: dict, edits: dict) -> list[str]:
    """Lay the edits over ``data`` in place. Returns the ids changed."""
    changed = []
    by = {s["id"]: s for s in data["skills"]}
    for sid, e in edits.items():
        s = by.get(sid)
        if not s:
            continue
        for k, v in e.items():
            if k in EDIT_FIELDS and s.get(k) != v:
                s[k] = v
                changed.append(sid)
        if "row" in e:
            s["required_level"] = ROW_LVL.get(int(e["row"]), s.get("required_level", 1))
    for s in data["skills"]:   # keep the names the prerequisites show
        s["prerequisite_names"] = [by[p]["name"] for p in s.get("prerequisites", []) if p in by]
    return sorted(set(changed))


def clashes(data: dict) -> list[tuple]:
    seen, out = {}, []
    for s in data["skills"]:
        k = (s["class"], s["tab"], s["row"], s["col"])
        if k in seen:
            out.append((k, seen[k], s["id"]))
        seen[k] = s["id"]
    return out


def grid(data: dict, cls: str, tab: int) -> dict[tuple[int, int], dict]:
    return {(s["row"], s["col"]): s for s in data["skills"] if s["class"] == cls and s["tab"] == tab}


def classes(data: dict) -> list[str]:
    return sorted({s["class"] for s in data["skills"]})


def list_tree(data: dict, cls: str) -> str:
    lines = []
    for tab in sorted({s["tab"] for s in data["skills"] if s["class"] == cls}):
        lines.append(f"== {order_name(cls)} ({cls}) tab {tab}")
        g = grid(data, cls, tab)
        for row in range(1, 7):
            cells = [g[(row, c)] for c in sorted(c for r, c in g if r == row)]
            lines.append(f"  r{row} L{ROW_LVL[row]:<2} " + " | ".join(f"c{s['col']} {s['id']} ({s['name']})" for s in cells))
    return "\n".join(lines)


def save_and_apply(skills_path: str | Path, edits: dict) -> dict:
    ep = edits_path(skills_path)
    ep.parent.mkdir(parents=True, exist_ok=True)
    ep.write_text(json.dumps(edits, indent=1, ensure_ascii=False) + "\n")
    data = load(skills_path)
    changed = apply_edits(data, edits)
    Path(skills_path).write_text(json.dumps(data, ensure_ascii=False) + "\n")
    return {"ok": True, "edits": str(ep), "changed": changed, "clashes": clashes(data)}


# ------------------------------------------------------------------ GUI
def gui(skills_path: str | Path) -> None:
    import tkinter as tk
    from tkinter import messagebox, ttk

    data = load(skills_path)
    edits = load_edits(edits_path(skills_path))
    apply_edits(data, edits)
    by = {s["id"]: s for s in data["skills"]}

    root = tk.Tk()
    root.title("PixelForge — skill trees")
    root.geometry("1180x720")
    cls_var = tk.StringVar(value=classes(data)[0])
    tab_var = tk.IntVar(value=0)
    sel: dict = {"id": None}
    CW, CH, PADX, PADY = 150, 74, 24, 16

    top = ttk.Frame(root, padding=6)
    top.pack(fill="x")
    ttk.Label(top, text="Order").pack(side="left")
    cb = ttk.Combobox(top, values=classes(data), textvariable=cls_var, state="readonly", width=14)
    order_lbl = ttk.Label(top, text=order_name(cls_var.get()))
    order_lbl.pack(side="left", padx=4)
    cb.pack(side="left", padx=6)
    ttk.Label(top, text="Tree").pack(side="left")
    tb = ttk.Combobox(top, values=[0, 1, 2], textvariable=tab_var, state="readonly", width=4)
    tb.pack(side="left", padx=6)
    status = ttk.Label(top, text="")
    status.pack(side="left", padx=12)
    ttk.Button(top, text="Save + apply", command=lambda: do_save()).pack(side="right")

    body = ttk.Panedwindow(root, orient="horizontal")
    body.pack(fill="both", expand=True)
    canvas = tk.Canvas(body, bg="#14161a", highlightthickness=0)
    body.add(canvas, weight=3)
    side = ttk.Frame(body, padding=8)
    body.add(side, weight=1)
    fields = {}
    for key, h in (("name", 1), ("description", 8), ("lore", 6)):
        ttk.Label(side, text=key).pack(anchor="w")
        t = tk.Text(side, height=h, wrap="word")
        t.pack(fill="x", pady=(0, 8))
        fields[key] = t
    ttk.Button(side, text="Apply text to skill", command=lambda: take_text()).pack(anchor="e")
    info = ttk.Label(side, text="Click a skill. Arrow keys move it; drag with the mouse. Rows are levels 1/6/12/18/24/30.", wraplength=260)
    info.pack(anchor="w", pady=8)

    def mark(sid: str, **kv) -> None:
        e = edits.setdefault(sid, {})
        e.update(kv)
        by[sid].update(kv)
        if "row" in kv:
            by[sid]["required_level"] = ROW_LVL[kv["row"]]

    def draw() -> None:
        canvas.delete("all")
        g = grid(data, cls_var.get(), tab_var.get())
        ncols = max([c for _, c in g] + [3])
        bad = {c for (_, _, r, cc), a, b in [(k, a, b) for k, a, b in clashes(data)] for c in (a, b)}
        for row in range(1, 7):
            y = PADY + (row - 1) * (CH + PADY)
            canvas.create_text(8, y + CH / 2, text=f"L{ROW_LVL[row]}", fill="#8a8f99", anchor="w", font=("TkDefaultFont", 9))
        for (row, col), s in g.items():
            x = 40 + (col - 1) * (CW + PADX)
            y = PADY + (row - 1) * (CH + PADY)
            fill = "#3a2a2a" if s["id"] in bad else ("#2a3a3f" if s["id"] == sel["id"] else "#1f2228")
            outline = "#d05050" if s["id"] in bad else ("#4fd1c5" if s["id"] == sel["id"] else "#3a3f48")
            canvas.create_rectangle(x, y, x + CW, y + CH, fill=fill, outline=outline, width=2, tags=("skill", s["id"]))
            canvas.create_text(x + 8, y + 10, text=s["name"], fill="#e8e4d8", anchor="nw", width=CW - 16, font=("TkDefaultFont", 10, "bold"), tags=("skill", s["id"]))
            canvas.create_text(x + 8, y + CH - 10, text=f"{s['id']} · {s['kind']}" + (" · edited" if s["id"] in edits else ""), fill="#8a8f99", anchor="sw", font=("TkDefaultFont", 8), tags=("skill", s["id"]))
            for p in s.get("prerequisites", []):
                if p in by and by[p]["class"] == s["class"] and by[p]["tab"] == s["tab"]:
                    px = 40 + (by[p]["col"] - 1) * (CW + PADX) + CW / 2
                    py = PADY + (by[p]["row"] - 1) * (CH + PADY) + CH
                    canvas.create_line(px, py, x + CW / 2, y, fill="#5a6070", arrow="last")
        canvas.configure(scrollregion=(0, 0, 40 + ncols * (CW + PADX), PADY + 6 * (CH + PADY)))
        status.configure(text=f"{len(edits)} edited · {len(clashes(data))} clashes")

    def select(sid: str | None) -> None:
        sel["id"] = sid
        for k, t in fields.items():
            t.delete("1.0", "end")
            if sid:
                t.insert("1.0", by[sid].get(k, ""))
        draw()

    def take_text() -> None:
        if not sel["id"]:
            return
        kv = {k: t.get("1.0", "end").strip() for k, t in fields.items()}
        mark(sel["id"], **kv)
        draw()

    def hit(ev) -> str | None:
        for item in canvas.find_overlapping(ev.x - 1, ev.y - 1, ev.x + 1, ev.y + 1):
            tags = canvas.gettags(item)
            if "skill" in tags:
                return tags[1]
        return None

    def cell_at(x: float, y: float) -> tuple[int, int]:
        return max(1, min(6, int((y - PADY) // (CH + PADY)) + 1)), max(1, int((x - 40) // (CW + PADX)) + 1)

    def on_click(ev) -> None:
        select(hit(ev))

    def on_release(ev) -> None:
        if sel["id"] and hit(ev) != sel["id"]:
            row, col = cell_at(ev.x, ev.y)
            if col <= 6:
                mark(sel["id"], row=row, col=col)
                draw()

    def on_key(ev) -> None:
        if not sel["id"]:
            return
        s = by[sel["id"]]
        d = {"Up": (-1, 0), "Down": (1, 0), "Left": (0, -1), "Right": (0, 1)}.get(ev.keysym)
        if d:
            mark(sel["id"], row=max(1, min(6, s["row"] + d[0])), col=max(1, s["col"] + d[1]))
            draw()

    def do_save() -> None:
        r = save_and_apply(skills_path, edits)
        messagebox.showinfo("Saved", f"{len(r['changed'])} skills changed, {len(r['clashes'])} clashes\n{r['edits']}")
        draw()

    canvas.bind("<Button-1>", on_click)
    canvas.bind("<ButtonRelease-1>", on_release)
    root.bind("<Key>", on_key)
    cb.bind("<<ComboboxSelected>>", lambda e: (order_lbl.configure(text=order_name(cls_var.get())), select(None)))
    tb.bind("<<ComboboxSelected>>", lambda e: select(None))
    draw()
    root.mainloop()


def cli_main(a) -> dict:
    data = load(a.skills)
    edits = load_edits(edits_path(a.skills))
    if a.list:
        apply_edits(data, edits)
        print(list_tree(data, a.list))
        return {"ok": True}
    for mv in a.move or []:
        sid, _, pos = mv.partition("=")
        row, col, *tab = [int(x) for x in pos.split(",")]
        edits.setdefault(sid, {}).update({"row": row, "col": col, **({"tab": tab[0]} if tab else {})})
    for rn in a.rename or []:
        sid, _, name = rn.partition("=")
        edits.setdefault(sid, {})["name"] = name
    if a.apply or a.move or a.rename:
        return save_and_apply(a.skills, edits)
    gui(a.skills)
    return {"ok": True}
