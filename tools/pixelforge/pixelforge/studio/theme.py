"""The Studio's look: one dark theme on every widget.

The game's palette: near-black panels, bone text, teal for the thing to do next, dull gold for warnings. Nothing
is white or light grey, including the parts Tk draws itself (combobox lists, scrollbars, text boxes, tree views,
notebooks, scales, spinboxes, menus). ``apply_theme(root)`` sets it all once; ``colours`` is the shared palette.
"""
from __future__ import annotations

INK = "#14161a"        # window background
PANEL = "#1b1e24"      # page background
PANEL2 = "#20242b"     # cards, toolbars
FIELD = "#23272f"      # text fields, lists
BTN = "#2a2f38"        # buttons
BTN_HI = "#38404c"     # hovered buttons
BORDER = "#2c313a"
BONE = "#e8e2d2"       # text
DIM = "#9a9484"        # secondary text
TEAL = "#4fd1c5"       # the next thing to do
TEAL_DK = "#1f4a46"    # selected rows, primary buttons
TEAL_DK2 = "#2a6a63"
GOLD = "#c9a24a"       # warnings
RUST = "#b0563a"       # stop / destructive (dull, never bright red)
CANVAS_BG = "#2b2e34"  # behind sprites

FONT_FAMILY = "Segoe UI"
FONT = (FONT_FAMILY, 10)
FONT_S = (FONT_FAMILY, 9)
FONT_B = (FONT_FAMILY, 10, "bold")
FONT_H = (FONT_FAMILY, 14, "bold")
FONT_T = (FONT_FAMILY, 18, "bold")
FONT_MONO = ("Consolas", 9)

colours = {"ink": INK, "panel": PANEL, "panel2": PANEL2, "field": FIELD, "btn": BTN, "btn_hi": BTN_HI, "border": BORDER, "bone": BONE,
           "dim": DIM, "teal": TEAL, "teal_dk": TEAL_DK, "gold": GOLD, "rust": RUST, "canvas": CANVAS_BG}


def apply_theme(root) -> None:
    """Dark theme for ttk (clam) and the classic Tk widgets, once per root."""
    from tkinter import ttk

    st = ttk.Style(root)
    try:
        st.theme_use("clam")
    except Exception:  # noqa: BLE001
        pass
    root.configure(bg=INK)
    st.configure(".", background=PANEL, foreground=BONE, fieldbackground=FIELD, font=FONT, bordercolor=BORDER, lightcolor=PANEL, darkcolor=PANEL,
                 troughcolor=FIELD, selectbackground=TEAL_DK, selectforeground="#eafff8", insertcolor=BONE, focuscolor=PANEL)
    st.configure("TFrame", background=PANEL)
    st.configure("Ink.TFrame", background=INK)
    st.configure("Card.TFrame", background=PANEL2)
    st.configure("Tool.TFrame", background=PANEL2)
    st.configure("TLabel", background=PANEL, foreground=BONE)
    st.configure("Card.TLabel", background=PANEL2, foreground=BONE)
    st.configure("CardDim.TLabel", background=PANEL2, foreground=DIM)
    st.configure("Dim.TLabel", foreground=DIM)
    st.configure("Small.TLabel", foreground=DIM, font=FONT_S)
    st.configure("Head.TLabel", foreground=TEAL, font=FONT_H)
    st.configure("Title.TLabel", foreground=BONE, font=FONT_T)
    st.configure("Sub.TLabel", foreground=BONE, font=FONT_B)
    st.configure("Good.TLabel", foreground=TEAL)
    st.configure("Warn.TLabel", foreground=GOLD)
    st.configure("Stop.TLabel", foreground="#d9a089")
    st.configure("Ink.TLabel", background=INK, foreground=BONE)
    st.configure("InkDim.TLabel", background=INK, foreground=DIM)
    st.configure("TButton", background=BTN, foreground=BONE, padding=(10, 5), borderwidth=1, bordercolor=BORDER, lightcolor=BTN, darkcolor=BTN,
                 focuscolor=BTN, focusthickness=0)
    st.map("TButton", background=[("active", BTN_HI), ("pressed", BTN_HI), ("disabled", "#22262d")], foreground=[("disabled", DIM)],
           lightcolor=[("active", BTN_HI)], darkcolor=[("active", BTN_HI)])
    st.configure("Go.TButton", background=TEAL_DK, foreground="#eafff8", font=FONT_B, bordercolor=TEAL_DK, lightcolor=TEAL_DK, darkcolor=TEAL_DK, focuscolor=TEAL_DK)
    st.map("Go.TButton", background=[("active", TEAL_DK2), ("pressed", TEAL_DK2), ("disabled", "#22302f")], foreground=[("disabled", DIM)])
    st.configure("Big.Go.TButton", padding=(18, 12), font=(FONT_FAMILY, 12, "bold"))
    st.configure("Tool.TButton", padding=(6, 4), background=PANEL2, bordercolor=PANEL2, lightcolor=PANEL2, darkcolor=PANEL2, focuscolor=PANEL2)
    st.map("Tool.TButton", background=[("active", BTN_HI), ("pressed", BTN_HI), ("disabled", PANEL2)])
    st.configure("ToolOn.TButton", padding=(6, 4), background=TEAL_DK, foreground="#eafff8", bordercolor=TEAL_DK, lightcolor=TEAL_DK, darkcolor=TEAL_DK, focuscolor=TEAL_DK)
    st.map("ToolOn.TButton", background=[("active", TEAL_DK2)])
    st.configure("Link.TButton", padding=(2, 1), background=PANEL, foreground=TEAL, bordercolor=PANEL, lightcolor=PANEL, darkcolor=PANEL, focuscolor=PANEL)
    st.map("Link.TButton", background=[("active", PANEL)], foreground=[("active", "#8ff0e6")])
    st.configure("TEntry", fieldbackground=FIELD, foreground=BONE, insertcolor=BONE, bordercolor=BORDER, lightcolor=FIELD, darkcolor=FIELD, padding=3)
    st.map("TEntry", fieldbackground=[("disabled", PANEL), ("readonly", PANEL2)], foreground=[("disabled", DIM)])
    st.configure("TCombobox", fieldbackground=FIELD, foreground=BONE, background=BTN, arrowcolor=BONE, bordercolor=BORDER, lightcolor=FIELD, darkcolor=FIELD,
                 selectbackground=FIELD, selectforeground=BONE, insertcolor=BONE, padding=2)
    st.map("TCombobox", fieldbackground=[("readonly", FIELD), ("disabled", PANEL)], foreground=[("readonly", BONE), ("disabled", DIM)],
           selectbackground=[("readonly", FIELD)], selectforeground=[("readonly", BONE)], background=[("active", BTN_HI)], arrowcolor=[("disabled", DIM)])
    st.configure("TSpinbox", fieldbackground=FIELD, foreground=BONE, background=BTN, arrowcolor=BONE, bordercolor=BORDER, lightcolor=FIELD, darkcolor=FIELD, insertcolor=BONE)
    st.map("TSpinbox", background=[("active", BTN_HI)])
    st.configure("TCheckbutton", background=PANEL, foreground=BONE, indicatorbackground=FIELD, indicatorforeground=TEAL, focuscolor=PANEL)
    st.map("TCheckbutton", background=[("active", PANEL)], indicatorbackground=[("selected", TEAL_DK), ("active", BTN)], foreground=[("disabled", DIM)])
    st.configure("TRadiobutton", background=PANEL, foreground=BONE, indicatorbackground=FIELD, indicatorforeground=TEAL, focuscolor=PANEL)
    st.map("TRadiobutton", background=[("active", PANEL)], indicatorbackground=[("selected", TEAL_DK), ("active", BTN)], foreground=[("disabled", DIM)])
    st.configure("TLabelframe", background=PANEL, foreground=DIM, bordercolor=BORDER, lightcolor=PANEL, darkcolor=PANEL)
    st.configure("TLabelframe.Label", background=PANEL, foreground=DIM)
    st.configure("TPanedwindow", background=INK)
    st.configure("Sash", sashthickness=6, gripcount=0, background=INK)
    st.configure("Treeview", background=FIELD, fieldbackground=FIELD, foreground=BONE, rowheight=26, borderwidth=0, bordercolor=BORDER, lightcolor=FIELD, darkcolor=FIELD)
    st.map("Treeview", background=[("selected", TEAL_DK)], foreground=[("selected", "#eafff8")])
    st.configure("Treeview.Heading", background=BTN, foreground=BONE, relief="flat", bordercolor=BORDER, lightcolor=BTN, darkcolor=BTN)
    st.map("Treeview.Heading", background=[("active", BTN_HI)])
    for orient in ("Horizontal", "Vertical"):
        st.configure(f"{orient}.TScale", background=BTN, troughcolor=FIELD, bordercolor=BORDER, lightcolor=BTN_HI, darkcolor=BTN, sliderlength=18)
        st.map(f"{orient}.TScale", background=[("active", BTN_HI)])
        st.configure(f"{orient}.TScrollbar", background=BTN, troughcolor=INK, bordercolor=INK, arrowcolor=BONE, lightcolor=BTN, darkcolor=BTN, gripcount=0, arrowsize=12)
        st.map(f"{orient}.TScrollbar", background=[("active", BTN_HI), ("pressed", BTN_HI)], arrowcolor=[("disabled", DIM)])
        st.configure(f"{orient}.TProgressbar", background=TEAL, troughcolor=FIELD, bordercolor=BORDER, lightcolor=TEAL, darkcolor=TEAL, thickness=8)
    st.configure("TSeparator", background=BORDER)
    st.configure("TNotebook", background=PANEL, bordercolor=BORDER, tabmargins=(2, 4, 2, 0), lightcolor=PANEL, darkcolor=PANEL)
    st.configure("TNotebook.Tab", background=BTN, foreground=DIM, padding=(12, 6), bordercolor=BORDER, lightcolor=BTN, darkcolor=BTN, focuscolor=BTN)
    st.map("TNotebook.Tab", background=[("selected", PANEL), ("active", BTN_HI)], foreground=[("selected", BONE), ("active", BONE)],
           lightcolor=[("selected", PANEL)], expand=[("selected", (0, 0, 0, 0))])
    st.configure("TMenubutton", background=BTN, foreground=BONE, arrowcolor=BONE, bordercolor=BORDER, lightcolor=BTN, darkcolor=BTN)
    # the left navigation and the status line
    st.configure("Nav.TLabel", background=INK, foreground=BONE, padding=(14, 3), font=FONT)
    st.configure("NavOn.TLabel", background=TEAL_DK, foreground="#eafff8", padding=(14, 3), font=FONT_B)
    st.configure("NavHover.TLabel", background=PANEL2, foreground=BONE, padding=(14, 3), font=FONT)
    st.configure("NavHead.TLabel", background=INK, foreground=DIM, padding=(10, 5, 4, 0), font=(FONT_FAMILY, 8, "bold"))
    st.configure("NavDone.TLabel", background=INK, foreground=DIM, padding=(14, 1), font=FONT_S)
    st.configure("NavNext.TLabel", background=INK, foreground=TEAL, padding=(14, 1), font=(FONT_FAMILY, 9, "bold"))
    st.configure("NavStep.TLabel", background=INK, foreground=BONE, padding=(14, 1), font=FONT_S)
    st.configure("NavStepOn.TLabel", background=TEAL_DK, foreground="#eafff8", padding=(14, 1), font=(FONT_FAMILY, 9, "bold"))
    st.configure("Brand.TLabel", background=INK, foreground=BONE, font=(FONT_FAMILY, 13, "bold"), padding=(14, 8, 4, 0))
    st.configure("Status.TLabel", background=INK, foreground=DIM, font=FONT_S)
    st.configure("StatusWarn.TLabel", background=INK, foreground=GOLD, font=FONT_S)
    st.configure("Danger.TButton", background="#4a2a22", foreground=BONE, bordercolor="#4a2a22", lightcolor="#4a2a22", darkcolor="#4a2a22", focuscolor="#4a2a22")
    st.map("Danger.TButton", background=[("active", "#6a3a2e"), ("pressed", "#6a3a2e")])
    st.configure("Card.TButton", background=BTN, bordercolor=PANEL2, lightcolor=BTN, darkcolor=BTN)
    st.configure("Big.TButton", padding=(16, 10), font=(FONT_FAMILY, 11))
    st.configure("Card.TCheckbutton", background=PANEL2, foreground=BONE)
    st.map("Card.TCheckbutton", background=[("active", PANEL2)])
    st.configure("Card.TRadiobutton", background=PANEL2, foreground=BONE)
    st.map("Card.TRadiobutton", background=[("active", PANEL2)])
    st.configure("Tool.TLabel", background=PANEL2, foreground=DIM, font=FONT_S)
    st.configure("Ink.TSeparator", background=BORDER)
    # classic Tk widgets (Listbox, Text, Canvas, Scrollbar, Menu, the combobox's drop-down list)
    opts = {
        "*background": PANEL, "*foreground": BONE,
        "*Toplevel.background": PANEL,
        "*Listbox.background": FIELD, "*Listbox.foreground": BONE, "*Listbox.selectBackground": TEAL_DK, "*Listbox.selectForeground": "#eafff8",
        "*Listbox.highlightThickness": 0, "*Listbox.relief": "flat", "*Listbox.font": "{%s} %d" % (FONT_FAMILY, 10),
        "*Canvas.background": CANVAS_BG, "*Canvas.highlightThickness": 0,
        "*Text.background": FIELD, "*Text.foreground": BONE, "*Text.insertBackground": BONE, "*Text.selectBackground": TEAL_DK,
        "*Text.selectForeground": "#eafff8", "*Text.highlightThickness": 0, "*Text.relief": "flat", "*Text.font": "Consolas 10",
        "*Entry.background": FIELD, "*Entry.foreground": BONE, "*Entry.insertBackground": BONE, "*Entry.relief": "flat",
        "*Scrollbar.background": BTN, "*Scrollbar.troughColor": INK, "*Scrollbar.activeBackground": BTN_HI, "*Scrollbar.relief": "flat",
        "*Scale.background": PANEL, "*Scale.troughColor": FIELD, "*Scale.foreground": BONE, "*Scale.highlightThickness": 0,
        "*Spinbox.background": FIELD, "*Spinbox.foreground": BONE, "*Spinbox.buttonBackground": BTN, "*Spinbox.insertBackground": BONE,
        "*Menu.background": PANEL2, "*Menu.foreground": BONE, "*Menu.activeBackground": TEAL_DK, "*Menu.activeForeground": "#eafff8",
        "*Menu.relief": "flat", "*Menu.borderWidth": 0, "*Menu.activeBorderWidth": 0,
        "*Label.background": PANEL, "*Label.foreground": BONE, "*Frame.background": PANEL, "*Message.background": PANEL, "*Message.foreground": BONE,
        "*TCombobox*Listbox.background": FIELD, "*TCombobox*Listbox.foreground": BONE, "*TCombobox*Listbox.selectBackground": TEAL_DK,
        "*TCombobox*Listbox.selectForeground": "#eafff8", "*TCombobox*Listbox.font": "{%s} %d" % (FONT_FAMILY, 10),
        "*TCombobox*Listbox.relief": "flat", "*TCombobox*Listbox.highlightThickness": 0,
    }
    for k, v in opts.items():
        root.option_add(k, v)
    root.studio_theme = colours
