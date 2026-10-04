extends "res://scripts/screen.gd"
const Pal := preload("res://scripts/editor/palette.gd")
const Px := preload("res://scripts/editor/pixels.gd")
const Doc := preload("res://scripts/editor/document.gd")
const Hist := preload("res://scripts/editor/history.gd")
const Carry := preload("res://scripts/editor/carry.gd")
const Anchors := preload("res://scripts/editor/anchors.gd")
const Canvas := preload("res://scripts/editor/canvas.gd")
const ToolRow := preload("res://scripts/editor/toolrow.gd")
const Picker := preload("res://scripts/editor/picker.gd")
## Editor: the pixel editor, for a character's frames (from the Frames tab) or any picture (tiles, effects,
## portraits). Tabs: Paint (the tools, their settings, the frame strip), Colour (the picker), Layers, History (every
## change, click one to go back to it), Carry (paint on one frame, lay it on the clip and the directions), Effects
## (the library to drag onto the figure; the anchors). The picture window is the canvas (editor/canvas.gd); the
## document, history, carry and anchors are plain classes under scripts/editor/ so a headless test runs them.
## Everything a person does here is a command too: `exec_line("stroke 5 5 9 5")` is what the driver and a JSON
## command file call (GUIDE_AI lists them).
##   --screen=editor --frames=ROOT --clip=idle --direction=S [--frame=N] [--reference=PAINTING] [--name=keeper]
##   --screen=editor --image=FILE          one picture
##   --screen=editor --model=FILE          render the model's idle S first (as the Characters bench does), then edit

const TOOLS := ["pencil", "brush", "eraser", "fill", "line", "rect", "ellipse", "wand", "lasso", "select", "move", "clone", "eyedropper", "hand"]
const TOOL_NAMES := {"pencil": "pencil", "brush": "brush", "eraser": "eraser", "fill": "fill", "line": "line", "rect": "rect", "ellipse": "ellipse",
	"wand": "wand", "lasso": "lasso", "select": "select", "move": "move", "clone": "clone", "eyedropper": "pick", "hand": "pan"}
const TOOL_KEYS := {KEY_P: "pencil", KEY_B: "brush", KEY_E: "eraser", KEY_G: "fill", KEY_N: "line", KEY_U: "rect", KEY_O: "ellipse",
	KEY_W: "wand", KEY_L: "lasso", KEY_M: "select", KEY_V: "move", KEY_S: "clone", KEY_I: "eyedropper", KEY_H: "hand"}
const KEY_WORDS := {"pencil": "P", "brush": "B", "eraser": "E", "fill": "G", "line": "N", "rect": "U", "ellipse": "O", "wand": "W", "lasso": "L",
	"select": "M", "move": "V", "clone": "S", "eyedropper": "I", "hand": "H"}
const TOOL_HINTS := {
	"pencil": "pencil: click or drag; one pixel of the colour. Shift-click draws a line from the last point.",
	"brush": "brush: drag to paint at the size; [ and ] change it.",
	"eraser": "eraser: drag to clear at the size.",
	"fill": "fill: click a region; alt-click fills every pixel of that colour (global).",
	"line": "line: drag from one end to the other.",
	"rect": "rectangle: drag a box; the shape cycler makes it filled.",
	"ellipse": "ellipse: drag a box; the shape cycler makes it filled.",
	"wand": "wand: click a colour patch (tolerance cycler); shift adds, alt subtracts.",
	"lasso": "lasso: drag round a part; shift adds, alt subtracts.",
	"select": "select: drag a rectangle; shift adds, alt subtracts; Ctrl+A all, Ctrl+D none.",
	"move": "move: drag the selection; alt-drag copies; the arrow keys nudge it.",
	"clone": "clone: alt-click the source (this frame, or set a frame on the Carry tab), then paint; the offset follows the brush.",
	"eyedropper": "pick: click anything on screen, the reference too, to take its colour.",
	"hand": "pan: drag the picture; the wheel zooms in whole steps; middle-drag pans with any tool.",
}

var doc := Doc.new()
var history := Hist.new()
var anchors := Anchors.new()
var canvas: Canvas = null
var headless := false
var title := ""
var char_name := ""
var export_dir := ""
var tool := "pencil"
var colour := Color("#d9d2bc")
var colour2 := Color("#15141a")
var brush_size := 1
var fill_global := false
var shape_filled := false
var tolerance := 0.08
var clone_src := {}            # {key, index, x, y}
var clone_offset = null        # Vector2i once a stroke fixed it
var clone_sample: Image = null # the source composite during a stroke
var stroke_last := Vector2i(-1, -1)
var shape_start := Vector2i(-1, -1)
var lasso_pts: Array = []
var floating: Image = null
var float_at := Vector2i.ZERO
var float_from := Vector2i.ZERO
var float_copy := false
var anchor_drag := {}
var anchor_sel := -1
var last_carry := {}
var last_note := ""
var canvas_focus := false      # the last click was on the picture: the arrows nudge, not the selector
var toolrow: ToolRow = null
var strip: W.Timeline = null
var picker = null
var hex_edit: LineEdit = null
var in_stroke := false

# ------------------------------------------------------------------ opening
func build() -> void:
	tabs = PackedStringArray(["Paint", "Colour", "Layers", "History", "Carry", "Effects"])
	hint_text = "Esc back · LB/RB tabs · B P E G W L M S V tools · [ ] size · Ctrl+Z/Y · Ctrl+A/D"
	tab_from_args()
	title = String(args.get("title", ""))
	char_name = String(args.get("name", ""))
	export_dir = String(args.get("export", ""))
	if not headless and app and canvas == null:
		canvas = Canvas.new()
		canvas.editor = self
		canvas.position = Vector2.ZERO
		canvas.size = app.pic_layer.size
		app.pic_layer.add_child(canvas)
		app.scene.visible = false
	var opened := false
	if args.has("image"):
		opened = open_image(String(args["image"]))
	elif args.has("frames"):
		opened = open_frames(String(args["frames"]), String(args.get("clip", "idle")), String(args.get("direction", "S")))
		if opened and args.has("frame"):
			doc.index = clampi(int(args["frame"]), 0, maxi(doc.count() - 1, 0))
	elif args.has("model"):
		rebuild()
		_render_model(String(args["model"]))
		return
	if opened and args.has("reference"):
		doc.set_reference(String(args["reference"]))
	rebuild()
	refresh()

func _exit_tree() -> void:
	if canvas and is_instance_valid(canvas):
		canvas.queue_free()
		canvas = null
	if app and is_instance_valid(app):
		app.scene.visible = true

## the colour to start with: the palette's slot nearest a mid lightness (never a colour the set lacks)
func _start_colour() -> void:
	var pal := doc.palette
	if pal.size() == 0:
		return
	var best := 0
	var best_d := 1e9
	for i in pal.size():
		var d := absf(pal.labs[i].x - 0.55)
		if d < best_d:
			best_d = d
			best = i
	colour = pal.colours[best]
	colour2 = pal.colours[pal.nearest(Color.BLACK)]

func open_frames(root: String, clip: String, dir: String) -> bool:
	history = Hist.new()
	anchors = Anchors.new()
	if not doc.open_set(root, clip, dir):
		_say("No frames at %s." % root)
		return false
	anchors.load(root)
	_start_colour()
	if title == "":
		title = root.get_base_dir().get_file().capitalize()
	last_carry = {}
	return true

func open_image(path: String) -> bool:
	history = Hist.new()
	anchors = Anchors.new()
	if not doc.open_image(path):
		_say("The Forge cannot read %s." % path.get_file())
		return false
	anchors.load(path.get_base_dir())
	_start_colour()
	if title == "":
		title = path.get_file()
	return true

## a model: rendered idle S into the project's previews (the Characters bench's road), then opened
func _render_model(path: String) -> void:
	var d := app.backend.read_json(path)
	if d.is_empty():
		_say("That is not a shape model.")
		return
	char_name = slug(String(d.get("name", path.get_file().split(".")[0])))
	title = String(d.get("name", char_name)).capitalize()
	var out := app.backend.out_dir("characters").path_join(char_name).path_join("previews").path_join("frames")
	var clip := String(args.get("clip", "idle"))
	var dir := String(args.get("direction", "S"))
	var dirs := String(args.get("directions", dir))
	run(["shapes", "render", path, "-o", out, "--clips", clip, "--directions", dirs, "--style", app.style_name], "rendering %s %s" % [clip, dirs], func(r: Dictionary):
		if not r.get("ok", false):
			return
		if open_frames(out, clip, dir):
			if args.has("reference"):
				doc.set_reference(String(args["reference"]))
			rebuild()
			refresh())

func _say(t: String) -> void:
	last_note = t
	if app and not headless:
		app.say(t)

func has_unsaved() -> bool:
	return doc.dirty_count() > 0

func can_leave() -> bool:
	return true

# ------------------------------------------------------------------ the picture window
## the canvas shows the frame as it stands now (cheap: called after every change)
func refresh() -> void:
	if canvas == null or headless:
		return
	var f := doc.current()
	if f == null:
		canvas.image = null
		return
	canvas.set_frame_size(Vector2i(doc.width, doc.height))
	canvas.image = ImageTexture.create_from_image(doc.composite(f))
	canvas.prev_tex = null
	canvas.next_tex = null
	if doc.onion and doc.count() > 1:
		canvas.prev_tex = ImageTexture.create_from_image(doc.composite(doc.at(doc.key, posmod(doc.index - 1, doc.count()))))
		canvas.next_tex = ImageTexture.create_from_image(doc.composite(doc.at(doc.key, posmod(doc.index + 1, doc.count()))))
	canvas.reference = ImageTexture.create_from_image(doc.reference) if (doc.reference and doc.reference_on) else null
	canvas.reference_alpha = doc.reference_alpha
	canvas.edge = Px.mask_edge(doc.selection, doc.width, doc.height)
	canvas.clone_mark = Vector2i(int(clone_src.get("x", -1)), int(clone_src.get("y", -1))) if (not clone_src.is_empty() and String(clone_src.get("key", "")) == doc.key and int(clone_src.get("index", -1)) == doc.index) else Vector2i(-1, -1)
	canvas.floating = ImageTexture.create_from_image(floating) if floating else null
	canvas.floating_at = float_at
	var list := []
	for a in anchors.on_frame(doc.key):
		list.append({"pos": anchors.place(a, doc, f), "name": String(a.get("effect", "")), "on": int(a.get("id", -1)) == anchor_sel, "scale": float(a.get("scale", 1.0)), "rotation": float(a.get("rotation", 0.0))})
	canvas.anchors = list
	canvas.caption = _caption()
	_update_words()

func _caption() -> String:
	if doc.single:
		return "%s · %d x %d" % [title, doc.width, doc.height]
	return "%s · %s %s · frame %d of %d" % [title, Doc.clip_of(doc.key), Doc.dir_of(doc.key), doc.index + 1, doc.count()]

## the state line and the strip's thumbnail, without rebuilding the tab
func _update_words() -> void:
	set_state_text(_state_words())
	if strip and is_instance_valid(strip) and not doc.single and doc.index < strip.texs.size():
		strip.texs[doc.index] = ImageTexture.create_from_image(doc.composite())
		strip.current = doc.index
		strip.queue_redraw()

func _state_words() -> String:
	var r := doc.palette.resolve(colour) if doc.palette.size() > 0 else {"slot": -1, "snapped": false}
	var cw := "%s%s" % [Pal.hex(colour), (" slot %d" % int(r["slot"])) if int(r["slot"]) >= 0 else ""]
	if bool(r["snapped"]):
		cw += " (snaps to %s)" % Pal.hex(r["colour"])
	var sel := "" if doc.selection.is_empty() else " · %d px selected" % Px.mask_count(doc.selection)
	var where := ("%s · %d x %d" % [title, doc.width, doc.height]) if doc.single else ("%s · frame %d of %d" % [title, doc.index + 1, doc.count()])
	return "%s · %s %d px · %s · %s%s%s" % [where, TOOL_NAMES.get(tool, tool), brush_size, cw, doc.palette.mode, sel, (" · unsaved" if has_unsaved() else "")]

# ------------------------------------------------------------------ the tabs
func build_tab(i: int) -> void:
	if doc.current() == null:
		state_line("The editor is empty. Open a character's Frames tab and choose Edit, or drop a picture here.", "", 2)
		add_spacer()
		add_choices([{"label": "Choose a picture", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; pictures"]), func(p): open_image(p); rebuild(); refresh(), "Choose a picture to edit")},
			{"label": "Back", "cb": func(): app.back()}])
		return
	match i:
		0: _build_paint()
		1: _build_colour()
		2: _build_layers()
		3: _build_history()
		4: _build_carry()
		5: _build_effects()

func on_tab() -> void:
	refresh()

func _tool_row() -> void:
	toolrow = ToolRow.new()
	toolrow.setup(TOOLS, TOOL_NAMES, tool, app, set_tool)
	add_extra(toolrow)

func _strip() -> void:
	if doc.single:
		return
	strip = W.Timeline.new()
	strip.thumb = 30
	var texs := []
	for k in doc.count():
		texs.append(ImageTexture.create_from_image(doc.composite(doc.at(doc.key, k))))
	strip.setup(texs, doc.index, app, func(k): set_frame(k))
	strip.on_reorder = func(from, to): reorder_frames(from, to)
	add_extra(strip)

func _build_paint() -> void:
	state_line(_state_words())
	_tool_row()
	add_cyclers([
		{"label": "size", "value": str(brush_size), "left": func(): set_brush_size(brush_size - 1), "right": func(): set_brush_size(brush_size + 1), "set": func(t): set_brush_size(int(t))},
		{"label": "fill", "value": "global" if fill_global else "contiguous", "left": func(): _toggle_global(), "right": func(): _toggle_global()},
		{"label": "shape", "value": "filled" if shape_filled else "outline", "left": func(): shape_filled = not shape_filled; rebuild(), "right": func(): shape_filled = not shape_filled; rebuild()},
		{"label": "tolerance", "value": T.fmt(tolerance, 2), "left": func(): set_tolerance(tolerance - 0.02), "right": func(): set_tolerance(tolerance + 0.02), "set": func(t): set_tolerance(float(t))},
		{"label": "lock", "value": doc.palette.mode, "left": func(): set_lock(Pal.OPEN if doc.palette.mode == Pal.LOCKED else Pal.LOCKED), "right": func(): set_lock(Pal.OPEN if doc.palette.mode == Pal.LOCKED else Pal.LOCKED)},
		{"label": "onion", "value": "on" if doc.onion else "off", "left": func(): set_onion(not doc.onion), "right": func(): set_onion(not doc.onion)},
	])
	_strip()
	if doc.single:
		add_spacer()
	add_choices([
		{"label": "Save", "cb": save},
		{"label": "Undo", "cb": undo},
		{"label": "Redo", "cb": redo},
		{"label": "Select all", "cb": func(): select_all()},
		{"label": "Deselect", "cb": func(): deselect()},
		{"label": "Clear", "cb": func(): clear_selection()},
		{"label": "Mirror", "cb": func(): mirror(true)},
	])

## a row of cyclers (the Characters bench's), with typed values where the item has `set`
func add_cyclers(items: Array) -> Control:
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 14
	c.setup(items, maxi(items.size(), 1), app)
	c.row_h = 13
	c.custom_minimum_size = Vector2(0, 13)
	add_extra(c)
	return c

func _build_colour() -> void:
	state_line(_state_words())
	picker = Picker.new()
	picker.setup(self, app)
	add_extra(picker, true)
	add_choices([
		{"label": "Pick on screen", "cb": func(): set_tool("eyedropper")},
		{"label": "Lock: " + doc.palette.mode, "cb": func(): set_lock(Pal.OPEN if doc.palette.mode == Pal.LOCKED else Pal.LOCKED)},
		{"label": "Add to palette", "cb": add_colour_to_palette},
		{"label": "Swap colours", "cb": swap_colours},
		{"label": "Undo", "cb": undo},
	])

func _build_layers() -> void:
	var f := doc.current()
	state_line("%s · layers · painting on %s%s" % [title, doc.layer().name, " · the reference at %d%%" % int(round(doc.reference_alpha * 100)) if doc.reference_on else ""])
	var items := []
	for i in range(f.layers.size() - 1, -1, -1):
		var L: Doc.Layer = f.layers[i]
		var li := i
		items.append({"label": ("> " if i == doc.active_layer else "  ") + L.name, "value": ("shown" if L.visible else "hidden") + (" · locked" if L.locked else "") + (" · %d%%" % int(round(L.opacity * 100)) if L.opacity < 1.0 else ""),
			"left": func(): pick_layer(li), "right": func(): toggle_layer(li)})
	items.append({"label": "reference", "value": ("%d%%" % int(round(doc.reference_alpha * 100))) if doc.reference_on else ("none" if doc.reference == null else "off"),
		"left": func(): set_reference_dim(doc.reference_alpha - 0.1), "right": func(): set_reference_dim(doc.reference_alpha + 0.1)})
	items.append({"label": "onion skin", "value": "on" if doc.onion else "off", "left": func(): set_onion(not doc.onion), "right": func(): set_onion(not doc.onion)})
	var c := W.Choices.new()
	c.font_size = T.TEXT_SIZE
	c.arrow_gap = 18
	c.row_h = 15
	c.setup(items, 2, app)
	add_extra(c)
	var rack := [_opacity_lever(), _reference_lever()]
	add_rack(rack, 8)
	add_choices([
		{"label": "Add layer", "cb": func(): add_layer("layer %d" % f.layers.size())},
		{"label": "Merge down", "cb": merge_down},
		{"label": "Delete layer", "cb": delete_layer},
		{"label": "Lock" if not doc.layer().locked else "Unlock", "cb": func(): doc.layer().locked = not doc.layer().locked; rebuild()},
		{"label": "Mirror", "cb": func(): mirror(true)},
		{"label": "Flip", "cb": func(): mirror(false)},
		{"label": "Reference painting", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): set_reference(p), "Choose the reference painting")},
		{"label": "Save", "cb": save},
	])

func _opacity_lever() -> Control:
	var L := doc.layer()
	var lv := W.Lever.new()
	lv.init("opacity", L.opacity, 1.0, func(v): return "%d%%" % int(round(v * 100)), Callable(), func(v): doc.layer().opacity = snappedf(v, 0.05); refresh())
	lv.hint = "the active layer's opacity"
	return lv

func _reference_lever() -> Control:
	var lv := W.Lever.new()
	lv.init("reference", doc.reference_alpha, 0.5, func(v): return "%d%%" % int(round(v * 100)), Callable(), func(v): set_reference_dim(v, false))
	lv.hint = "how much of the reference painting shows over the frame"
	return lv

func _build_history() -> void:
	state_line("%s · history · %d changes, %d applied%s" % [title, history.entries.size(), history.cursor, " · click one to go back to it" if history.entries.size() > 0 else ""])
	var items := []
	var lines := history.lines()
	items.append({"label": "0  as opened", "cb": func(): goto_history(0), "dim": history.cursor != 0})
	for i in lines.size():
		var k := i + 1
		items.append({"label": lines[i], "cb": func(): goto_history(k), "dim": k > history.cursor})
	var start := maxi(items.size() - 12, 0)
	var shown := items.slice(start)
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 14
	c.row_h = 13
	c.setup(shown, 2, app)
	c.custom_minimum_size = Vector2(0, 13 * ceili(shown.size() / 2.0))
	add_extra(c)
	if shown.size() < 12:
		add_spacer()
	add_choices([{"label": "Undo", "cb": undo}, {"label": "Redo", "cb": redo}, {"label": "Back to the start", "cb": func(): goto_history(0)}, {"label": "Save", "cb": save}])

func _build_carry() -> void:
	if doc.single:
		state_line("%s · carry · a single picture has no other frames to carry to." % title)
		add_spacer()
		add_choices([{"label": "Back to Paint", "cb": func(): set_tab(0)}])
		return
	var e = _last_paint_entry()
	var what := "nothing painted on this frame yet" if e == null else "the last change here: %s, %d px" % [e.label, e.touched]
	state_line("%s · carry · %s" % [title, what])
	dim_line("It lands on the clip's other frames and on the same frame of the other directions: by part where the render has part masks, else by position. One history entry; Undo takes it back.", 2)
	add_cyclers([
		{"label": "clone source", "value": _clone_words(), "left": func(): _step_clone_source(-1), "right": func(): _step_clone_source(1)},
	])
	if not last_carry.is_empty() and last_carry.get("ok", false):
		var texs := []
		var tl := W.Timeline.new()
		tl.thumb = 24
		var k := 0
		for L in last_carry["landed"]:
			texs.append(ImageTexture.create_from_image(L["thumb"]))
			tl.marks[k] = "  %s %d" % [Doc.dir_of(String(L["key"])), int(L["count"])]
			k += 1
		tl.max_cell = 72
		tl.setup(texs, 0, app, func(_i): pass)
		tl.custom_minimum_size = Vector2(0, 38)
		add_extra(tl, false)
		small_line("landed on %d frames, %d px in all, by %s · each mark: direction, pixels" % [last_carry["landed"].size(), int(last_carry["count"]), String(last_carry["by"])], T.BONE)
	else:
		add_spacer()
	add_choices([
		{"label": "Carry to this clip", "cb": func(): carry(Carry.SCOPE_CLIP)},
		{"label": "Carry to the other directions", "cb": func(): carry(Carry.SCOPE_DIRS)},
		{"label": "Carry everywhere", "cb": func(): carry(Carry.SCOPE_ALL)},
		{"label": "Undo", "cb": undo},
		{"label": "Save", "cb": save},
	])

func _build_effects() -> void:
	var a := anchors.by_id(anchor_sel)
	var line := "%s · effects · drag one from the library onto the figure; it follows the clip and the directions. Right-click an anchor for its levers; drag it off the figure to detach." % title
	if not a.is_empty():
		line = "%s · effects · %s anchored at %d, %d on frame %d · scale x%s · %s deg" % [title, String(a["effect"]), int(a["x"]), int(a["y"]), int(a["frame"]) + 1, T.fmt(float(a["scale"]), 2), T.fmt(float(a["rotation"]), 0)]
	state_line(line, "", 1 if not a.is_empty() else 2)
	if a.is_empty():
		_effects_library()
	else:
		var ax := int(a["x"])
		var ay := int(a["y"])
		add_cyclers([
			{"label": "x", "value": str(ax), "left": func(): set_anchor_fields(anchor_sel, {"x": ax - 1}), "right": func(): set_anchor_fields(anchor_sel, {"x": ax + 1}), "set": func(t): set_anchor_fields(anchor_sel, {"x": int(t)})},
			{"label": "y", "value": str(ay), "left": func(): set_anchor_fields(anchor_sel, {"y": ay - 1}), "right": func(): set_anchor_fields(anchor_sel, {"y": ay + 1}), "set": func(t): set_anchor_fields(anchor_sel, {"y": int(t)})},
			{"label": "frame", "value": str(int(a["frame"]) + 1), "left": func(): pass, "right": func(): pass},
		])
		var ls := W.Lever.new()
		ls.init("scale", clampf((float(a["scale"]) - 0.25) / 2.75, 0.0, 1.0), 0.75 / 2.75, func(v): return "x" + T.fmt(0.25 + v * 2.75, 2), Callable(), func(v): set_anchor_fields(anchor_sel, {"scale": snappedf(0.25 + v * 2.75, 0.05)}))
		var lr := W.Wheel.new()
		lr.init_wheel("rotation", float(a["rotation"]), 0.0, func(d): return "%d deg" % int(round(d)), Callable(), func(d): set_anchor_fields(anchor_sel, {"rotation": round(d)}))
		var levers: Dictionary = a.get("levers", {})
		var lst := W.Lever.new()
		lst.init("strength", clampf(float(levers.get("strength", 1.0)) / 2.0, 0.0, 1.0), 0.5, func(v): return T.fmt(v * 2.0, 2), Callable(), func(v): set_anchor_lever(anchor_sel, "strength", snappedf(v * 2.0, 0.05)))
		var lsp := W.Lever.new()
		lsp.init("speed", clampf(float(levers.get("speed", 1.0)) / 2.0, 0.0, 1.0), 0.5, func(v): return T.fmt(v * 2.0, 2), Callable(), func(v): set_anchor_lever(anchor_sel, "speed", snappedf(v * 2.0, 0.05)))
		add_rack([ls, lr, lst, lsp], 8)
	var ch := []
	if not a.is_empty():
		ch.append({"label": "Detach", "cb": func(): remove_anchor(anchor_sel)})
		ch.append({"label": "This direction only" if String(a.get("dir", "all")) == "all" else "Every direction", "cb": func(): set_anchor_fields(anchor_sel, {"dir": Doc.dir_of(doc.key) if String(a.get("dir", "all")) == "all" else "all"})})
		ch.append({"label": "Library", "cb": func(): anchor_sel = -1; rebuild(); refresh()})
	ch.append({"label": "Bake anchors", "cb": bake})
	ch.append({"label": "Undo", "cb": undo})
	ch.append({"label": "Save", "cb": save})
	add_choices(ch)

## the library: the effects bench's kinds and spell presets as words to pick up and drop on the picture
func _effects_library() -> void:
	var cards := W.Choices.new()
	cards.font_size = T.SMALL_SIZE
	cards.arrow_gap = 12
	cards.flow = true
	cards.flow_gap = 10
	cards.wrap_width = App.TEXTBOX.size.x - 16
	var items := []
	for e in Anchors.LIBRARY:
		items.append({"label": e, "cb": func(): _say("Drag %s onto the picture to anchor it (or: anchor add %s X Y)." % [e, e])})
	cards.setup(items, 1, app)
	cards.row_h = 13
	cards.drag_start = func(i, pos): _drag_effect_start(String(items[i]["label"]), pos)
	cards.drag_move = func(pos): _drag_effect_move(pos)
	cards.drag_end = func(pos): _drag_effect_end(pos)
	add_extra(cards)
	var n := anchors.on_frame(doc.key).size()
	small_line("%d anchor%s on this clip%s" % [n, "" if n == 1 else "s", "" if n == 0 else " · click one on the picture to pick it"], T.BONE)
	add_spacer()

# ------------------------------------------------------------------ settings
func set_tool(t: String) -> Dictionary:
	if not TOOLS.has(t):
		return {"ok": false, "error": "no tool named %s" % t}
	tool = t
	in_stroke = false
	if toolrow and is_instance_valid(toolrow):
		toolrow.set_current(t)
	if app and not headless:
		app.set_hint(String(TOOL_HINTS.get(t, "")))
		if canvas:
			canvas.brush_points = Px.brush_points(canvas.hover, brush_size) if t in ["pencil", "brush", "eraser", "clone"] else []
	_update_words()
	return {"ok": true, "tool": t}

func set_brush_size(n: int) -> Dictionary:
	brush_size = clampi(n, 1, 64)
	if tab == 0 and not headless:
		rebuild()
	return {"ok": true, "size": brush_size}

func set_tolerance(v: float) -> Dictionary:
	tolerance = clampf(snappedf(v, 0.01), 0.0, 1.0)
	if tab == 0 and not headless:
		rebuild()
	return {"ok": true, "tolerance": tolerance}

func _toggle_global() -> void:
	fill_global = not fill_global
	rebuild()

func set_lock(mode: String) -> Dictionary:
	if not mode in [Pal.LOCKED, Pal.OPEN]:
		return {"ok": false, "error": "lock is locked or open"}
	doc.palette.mode = mode
	if not headless:
		rebuild()
		_say("Palette %s%s." % [mode, (": colours snap to the nearest of %d" % doc.palette.size()) if mode == Pal.LOCKED else (": new colours join the palette (%d added so far)" % doc.palette.added)])
	return {"ok": true, "lock": mode, "palette": doc.palette.size()}

## the colour to paint with; while locked it is snapped and the hint says to which slot
func set_colour(c: Color) -> Dictionary:
	var r := doc.palette.resolve(c)
	var snapped: bool = r["snapped"]
	colour = r["colour"] if snapped else Color(c.r, c.g, c.b, 1.0)
	if snapped:
		_say("%s is not in the palette: snapped to slot %d, %s. Set the lock open to add it." % [Pal.hex(c), int(r["slot"]), Pal.hex(colour)])
	elif bool(r["added"]):
		_say("%s added to the palette as slot %d (%d added)." % [Pal.hex(colour), int(r["slot"]), doc.palette.added])
	if picker and is_instance_valid(picker):
		picker.queue_redraw()
	_update_words()
	return {"ok": true, "colour": Pal.hex(colour), "slot": int(r["slot"]), "snapped": snapped, "added": bool(r["added"]), "palette": doc.palette.size()}

func swap_colours() -> void:
	var c := colour
	colour = colour2
	colour2 = c
	_update_words()
	if picker and is_instance_valid(picker):
		picker.queue_redraw()

func add_colour_to_palette() -> void:
	var was := doc.palette.mode
	doc.palette.mode = Pal.OPEN
	var r := doc.palette.resolve(colour)
	doc.palette.mode = was
	_say("%s is slot %d%s." % [Pal.hex(colour), int(r["slot"]), " (added)" if bool(r["added"]) else ""])
	rebuild()

func set_onion(on: bool) -> Dictionary:
	doc.onion = on
	if not headless:
		rebuild()
		refresh()
	return {"ok": true, "onion": on}

func set_reference(path: String) -> Dictionary:
	if not doc.set_reference(path):
		return {"ok": false, "error": "cannot read %s" % path}
	if not headless:
		rebuild()
		refresh()
	return {"ok": true, "reference": path}

func set_reference_dim(v: float, do_rebuild: bool = true) -> Dictionary:
	doc.reference_alpha = clampf(snappedf(v, 0.05), 0.0, 1.0)
	doc.reference_on = doc.reference != null and doc.reference_alpha > 0.0
	if not headless:
		if do_rebuild:
			rebuild()
		refresh()
	return {"ok": true, "reference_dim": doc.reference_alpha}

func set_frame(i: int) -> Dictionary:
	if doc.count() == 0:
		return {"ok": false, "error": "no frames"}
	_finish_floating()
	doc.index = clampi(i, 0, doc.count() - 1)
	anchor_sel = -1
	refresh()
	return {"ok": true, "frame": doc.index + 1}

func set_direction(d: String) -> Dictionary:
	var k := "%s_%s" % [Doc.clip_of(doc.key), d.to_upper()]
	if not doc.counts.has(k):
		return {"ok": false, "error": "no frames for %s" % k}
	_finish_floating()
	doc.key = k
	doc.index = clampi(doc.index, 0, doc.count() - 1)
	doc.selection = PackedByteArray()
	if not headless:
		rebuild()
	refresh()
	return {"ok": true, "key": k, "frames": doc.count()}

func set_clip(c: String) -> Dictionary:
	var k := "%s_%s" % [c, Doc.dir_of(doc.key)]
	if not doc.counts.has(k):
		return {"ok": false, "error": "no frames for %s" % k}
	_finish_floating()
	doc.key = k
	doc.index = 0
	doc.selection = PackedByteArray()
	doc.fps = float(doc.anims.get("clip_fps", {}).get(c, doc.fps))
	if not headless:
		rebuild()
	refresh()
	return {"ok": true, "key": k, "frames": doc.count()}

func reorder_frames(from: int, to: int) -> Dictionary:
	var before: Array = doc.order.get(doc.key, []).duplicate()
	if not doc.reorder(doc.key, from, to):
		return {"ok": false, "error": "cannot move frame %d to %d" % [from + 1, to + 1]}
	history.begin("reorder frames", doc.selection)
	var e = _commit_extra({"order_before": [doc.key, before], "order_after": [doc.key, doc.order[doc.key].duplicate()]})
	doc.index = to
	if not headless:
		rebuild()
	refresh()
	return {"ok": true, "order": doc.order[doc.key]}

# ------------------------------------------------------------------ changes (every one a history entry)
func _begin(label: String) -> bool:
	var L := doc.layer()
	if L == null:
		return false
	if L.locked:
		_say("The %s layer is locked." % L.name)
		return false
	history.begin(label, doc.selection)
	history.touch(doc.current(), doc.active_layer)
	return true

func _end() -> Dictionary:
	var e = history.commit(doc.selection)
	refresh()
	return {"ok": true, "changed": e.touched if e else 0, "entry": history.cursor}

## an entry that carries no pixels (anchors, order): the extra says what to restore
func _commit_extra(extra: Dictionary):
	if history.open == null:
		return null
	for k in extra:
		history.open.extra[k] = extra[k]
	var e = history.commit(doc.selection)
	refresh()
	return e

func _resolved() -> Color:
	return doc.palette.resolve(colour)["colour"]

## paint points on the active layer in the colour (or clear them)
func paint_points(points: Array, erase: bool = false) -> int:
	var L := doc.layer()
	if L == null:
		return 0
	return Px.apply(L.image, points, Color(0, 0, 0, 0) if erase else _resolved(), doc.selection)

func stroke(a: Vector2i, b: Vector2i) -> Dictionary:
	match tool:
		"pencil", "brush", "eraser":
			if not _begin(tool):
				return {"ok": false, "error": "layer locked"}
			var pts := Px.stroke_points(a, b, brush_size if tool != "pencil" else 1)
			var n := paint_points(pts, tool == "eraser")
			var r := _end()
			r["count"] = n
			return r
		"line":
			if not _begin("line"):
				return {"ok": false, "error": "layer locked"}
			var n := paint_points(Px.stroke_points(a, b, brush_size))
			var r := _end()
			r["count"] = n
			return r
		"rect":
			if not _begin("rectangle"):
				return {"ok": false, "error": "layer locked"}
			var n := paint_points(Px.rect_points(a, b, shape_filled))
			var r := _end()
			r["count"] = n
			return r
		"ellipse":
			if not _begin("ellipse"):
				return {"ok": false, "error": "layer locked"}
			var n := paint_points(Px.ellipse_points(a, b, shape_filled))
			var r := _end()
			r["count"] = n
			return r
		"clone":
			return clone_stroke(a, b)
	return {"ok": false, "error": "%s does not stroke" % tool}

## the fill: the region like the seed on the picture as seen, painted on the active layer, inside the selection
func fill_at(p: Vector2i, global: bool) -> Dictionary:
	if not _begin("fill" + (" global" if global else "")):
		return {"ok": false, "error": "layer locked"}
	var region := Px.flood_mask(doc.composite(), p, tolerance, not global)
	if not doc.selection.is_empty():
		region = Px.mask_combine(region, doc.selection, "intersect")
	var L := doc.layer()
	var c := _resolved() if tool != "eraser" else Color(0, 0, 0, 0)
	var n := 0
	for y in doc.height:
		for x in doc.width:
			if region[y * doc.width + x] != 0 and L.image.get_pixel(x, y) != c:
				L.image.set_pixel(x, y, c)
				n += 1
	var r := _end()
	r["count"] = n
	return r

# --- selection
func _combine(m: PackedByteArray, mode: String) -> void:
	history.begin("select " + mode, doc.selection)
	doc.selection = Px.mask_combine(doc.selection, m, mode)
	if Px.mask_count(doc.selection) == 0:
		doc.selection = PackedByteArray()
	history.commit(doc.selection)
	refresh()

func select_rect(a: Vector2i, b: Vector2i, mode: String = "replace") -> Dictionary:
	_combine(Px.rect_mask(doc.width, doc.height, a, b), mode)
	return {"ok": true, "selected": Px.mask_count(doc.selection)}

func select_wand(p: Vector2i, mode: String = "replace", tol: float = -1.0) -> Dictionary:
	_combine(Px.flood_mask(doc.composite(), p, tolerance if tol < 0.0 else tol, not fill_global), mode)
	return {"ok": true, "selected": Px.mask_count(doc.selection)}

func select_lasso(pts: Array, mode: String = "replace") -> Dictionary:
	if pts.size() < 3:
		return {"ok": false, "error": "a lasso needs three points"}
	_combine(Px.polygon_mask(doc.width, doc.height, pts), mode)
	return {"ok": true, "selected": Px.mask_count(doc.selection)}

func select_all() -> Dictionary:
	_combine(Px.full_mask(doc.width, doc.height), "replace")
	return {"ok": true, "selected": Px.mask_count(doc.selection)}

func deselect() -> Dictionary:
	_finish_floating()
	history.begin("deselect", doc.selection)
	doc.selection = PackedByteArray()
	history.commit(doc.selection)
	refresh()
	return {"ok": true, "selected": 0}

func invert_selection() -> Dictionary:
	_combine(Px.mask_invert(doc.selection, doc.width, doc.height), "replace")
	return {"ok": true, "selected": Px.mask_count(doc.selection)}

func clear_selection() -> Dictionary:
	if not _begin("clear"):
		return {"ok": false, "error": "layer locked"}
	var n := Px.clear(doc.layer().image, doc.selection)
	var r := _end()
	r["count"] = n
	return r

func mirror(horizontal: bool) -> Dictionary:
	if not _begin("mirror" if horizontal else "flip"):
		return {"ok": false, "error": "layer locked"}
	Px.flip(doc.layer().image, doc.selection, horizontal)
	return _end()

func nudge(d: Vector2i, copy: bool = false) -> Dictionary:
	if not _begin("nudge %d, %d" % [d.x, d.y]):
		return {"ok": false, "error": "layer locked"}
	doc.selection = Px.nudge(doc.layer().image, doc.selection, d, copy)
	return _end()

# --- the move tool's floating piece
func _lift(copy: bool) -> void:
	if not _begin("move" if not copy else "copy"):
		return
	if doc.selection.is_empty():
		doc.selection = Px.full_mask(doc.width, doc.height)
	float_copy = copy
	var L := doc.layer()
	if copy:
		floating = L.image.duplicate()
		for y in doc.height:
			for x in doc.width:
				if doc.selection[y * doc.width + x] == 0:
					floating.set_pixel(x, y, Color(0, 0, 0, 0))
	else:
		floating = Px.lift(L.image, doc.selection)
	float_at = Vector2i.ZERO
	refresh()

func _drop_floating() -> void:
	if floating == null:
		return
	Px.stamp(doc.layer().image, floating, float_at)
	doc.selection = Px.mask_shift(doc.selection, doc.width, doc.height, float_at)
	floating = null
	_end()

func _finish_floating() -> void:
	if floating != null:
		_drop_floating()

# --- clone
func set_clone_source(p: Vector2i, key: String = "", index: int = -1) -> Dictionary:
	var k := key if key != "" else doc.key
	var i := index if index >= 0 else doc.index
	if not doc.counts.has(k) or i >= int(doc.counts[k]):
		return {"ok": false, "error": "no frame %d in %s" % [i + 1, k]}
	clone_src = {"key": k, "index": i, "x": p.x, "y": p.y}
	clone_offset = null
	refresh()
	if tab == 4 and not headless:
		rebuild()
	return {"ok": true, "key": k, "frame": i + 1, "x": p.x, "y": p.y}

func _clone_words() -> String:
	if clone_src.is_empty():
		return "this frame (alt-click sets the point)"
	return "%s %s frame %d at %d, %d" % [Doc.clip_of(String(clone_src["key"])), Doc.dir_of(String(clone_src["key"])), int(clone_src["index"]) + 1, int(clone_src["x"]), int(clone_src["y"])]

## the clone source steps through the frames of the clip, then the same frame of the other directions
func _step_clone_source(delta: int) -> void:
	var k := String(clone_src.get("key", doc.key))
	var i := int(clone_src.get("index", doc.index))
	var p := Vector2i(int(clone_src.get("x", doc.width / 2)), int(clone_src.get("y", doc.height / 2)))
	var list := [[doc.key, doc.index]]
	for t in Carry.targets(doc, doc.key, doc.index, Carry.SCOPE_ALL):
		list.append(t)
	var at := 0
	for j in list.size():
		if list[j][0] == k and int(list[j][1]) == i:
			at = j
	var n: Array = list[posmod(at + delta, list.size())]
	set_clone_source(p, String(n[0]), int(n[1]))

func clone_stroke(a: Vector2i, b: Vector2i) -> Dictionary:
	if clone_src.is_empty():
		_say("Alt-click to set the clone source first.")
		return {"ok": false, "error": "no clone source"}
	if clone_offset == null:
		clone_offset = a - Vector2i(int(clone_src["x"]), int(clone_src["y"]))
	var src_frame := doc.at(String(clone_src["key"]), int(clone_src["index"]))
	if src_frame == null:
		return {"ok": false, "error": "the source frame is gone"}
	if clone_sample == null:
		clone_sample = doc.composite(src_frame)
	if not _begin("clone"):
		return {"ok": false, "error": "layer locked"}
	var n := Px.clone(doc.layer().image, clone_sample, Px.stroke_points(a, b, brush_size), clone_offset, doc.selection, doc.palette.snap)
	var r := _end()
	r["count"] = n
	r["offset"] = [clone_offset.x, clone_offset.y]
	return r

# --- layers
func pick_layer(i: int) -> Dictionary:
	var f := doc.current()
	if i < 0 or i >= f.layers.size():
		return {"ok": false, "error": "no layer %d" % i}
	_finish_floating()
	doc.active_layer = i
	if not headless:
		rebuild()
	return {"ok": true, "layer": f.layers[i].name}

func layer_index(name: String) -> int:
	var f := doc.current()
	for i in f.layers.size():
		if f.layers[i].name == name:
			return i
	return int(name) - 1 if name.is_valid_int() else -1

func toggle_layer(i: int) -> void:
	var f := doc.current()
	if i >= 0 and i < f.layers.size():
		f.layers[i].visible = not f.layers[i].visible
		f.dirty = true
		rebuild()
		refresh()

func add_layer(name: String) -> Dictionary:
	_finish_floating()
	doc.add_layer(name)
	history.begin("add layer " + name, doc.selection)
	history.touch(doc.current(), doc.active_layer)
	_commit_extra({"layer_added": name})
	if not headless:
		rebuild()
	return {"ok": true, "layer": name, "index": doc.active_layer}

func merge_down() -> Dictionary:
	var i := doc.active_layer
	if i <= 0:
		return {"ok": false, "error": "the base has nothing under it"}
	_finish_floating()
	history.begin("merge %s down" % doc.layer().name, doc.selection)
	history.touch(doc.current(), i - 1)
	history.touch(doc.current(), i)
	var name := doc.layer().name
	doc.merge_down(i)
	_commit_extra({"layer_removed": [name, i]})
	if not headless:
		rebuild()
	return {"ok": true, "layers": doc.current().layers.size()}

func delete_layer() -> Dictionary:
	var i := doc.active_layer
	if i <= 0:
		return {"ok": false, "error": "the base stays"}
	_finish_floating()
	history.begin("delete layer " + doc.layer().name, doc.selection)
	history.touch(doc.current(), i)
	var name := doc.layer().name
	doc.remove_layer(i)
	_commit_extra({"layer_removed": [name, i]})
	if not headless:
		rebuild()
	return {"ok": true, "layers": doc.current().layers.size()}

# --- history
func _restore_extra(e, back: bool) -> void:
	if e == null:
		return
	if e.extra.has("anchors_before"):
		anchors.restore(e.extra["anchors_before"] if back else e.extra["anchors_after"])
		anchors.save()
	if e.extra.has("order_before"):
		var o: Array = e.extra["order_before"] if back else e.extra["order_after"]
		doc.set_order(String(o[0]), o[1])
	if e.extra.has("layer_added"):
		var f := doc.current()
		if back:
			var li := layer_index(String(e.extra["layer_added"]))
			if li > 0:
				f.layers.remove_at(li)
				doc.active_layer = clampi(doc.active_layer, 0, f.layers.size() - 1)
		else:
			doc.add_layer(String(e.extra["layer_added"]))
	if e.extra.has("layer_removed"):
		var f := doc.current()
		var rec: Array = e.extra["layer_removed"]
		if back:
			var L := Doc.Layer.new(String(rec[0]), Px.blank(doc.width, doc.height))
			f.layers.insert(mini(int(rec[1]), f.layers.size()), L)
			for id in e.layers:
				var r: Dictionary = e.layers[id]
				if int(r["layer"]) == int(rec[1]):
					L.image = Px.copy_of(r["before"])
			doc.active_layer = int(rec[1])
		else:
			if int(rec[1]) < f.layers.size():
				f.layers.remove_at(int(rec[1]))
			doc.active_layer = clampi(doc.active_layer, 0, f.layers.size() - 1)

func undo() -> void:
	_finish_floating()
	if not history.can_undo():
		_say("Nothing to undo.")
		return
	var e = history.entries[history.cursor - 1]
	var sel = history.undo()
	_restore_extra(e, true)
	if sel != null:
		doc.selection = sel
	refresh()
	if app and not headless:
		app.audio.blip("back")
		if tab in [2, 3, 4, 5]:
			rebuild()

func redo() -> void:
	_finish_floating()
	if not history.can_redo():
		_say("Nothing to redo.")
		return
	var e = history.entries[history.cursor]
	var sel = history.redo()
	_restore_extra(e, false)
	if sel != null:
		doc.selection = sel
	refresh()
	if app and not headless:
		app.audio.blip("confirm")
		if tab in [2, 3, 4, 5]:
			rebuild()

func goto_history(n: int) -> Dictionary:
	_finish_floating()
	n = clampi(n, 0, history.entries.size())
	while history.cursor > n:
		undo()
	while history.cursor < n:
		redo()
	if not headless:
		rebuild()
	return {"ok": true, "applied": history.cursor}

## the latest entry that painted this frame's active layer (a carry's own entry is skipped)
func _last_paint_entry():
	var id := "%s:%d:%d" % [doc.key, doc.index, doc.active_layer]
	for i in range(history.cursor - 1, -1, -1):
		var e = history.entries[i]
		if e.extra.has("carry") or not e.layers.has(id):
			continue
		if Px.diff(e.layers[id]["before"], e.layers[id]["after"]).size() > 0:
			return e
	return null

# --- carry
func carry(scope: String) -> Dictionary:
	_finish_floating()
	var r := Carry.run(doc, history, scope, _last_paint_entry())
	last_carry = r
	if r.get("ok", false):
		_say("Carried to %d frames, %d px, by %s." % [r["landed"].size(), int(r["count"]), String(r["by"])])
	else:
		_say(String(r.get("error", "The carry stopped.")))
	refresh()
	if not headless:
		if tab != 4:
			set_tab(4)
		else:
			rebuild()
	var out := r.duplicate()
	if out.has("landed"):
		var l := []
		for L in r["landed"]:
			l.append({"key": L["key"], "frame": int(L["index"]) + 1, "count": L["count"]})
		out["landed"] = l
	return out

# --- anchors
func _anchor_entry(label: String, change: Callable) -> void:
	var before := anchors.snapshot()
	change.call()
	anchors.save()
	history.begin(label, doc.selection)
	_commit_extra({"anchors_before": before, "anchors_after": anchors.snapshot()})

func add_anchor(effect: String, p: Vector2i) -> Dictionary:
	if not Anchors.LIBRARY.has(effect):
		return {"ok": false, "error": "no effect named %s in the library" % effect}
	var f := doc.current()
	var part := Doc.part_at(doc.parts_of(f), p.x, p.y)
	var before := anchors.snapshot()
	var made := anchors.add(effect, doc.key, doc.index, p.x, p.y, part)
	anchors.save()
	history.begin("anchor " + effect, doc.selection)
	_commit_extra({"anchors_before": before, "anchors_after": anchors.snapshot()})
	anchor_sel = int(made.get("id", -1))
	if not headless:
		if tab != 5:
			set_tab(5)
		else:
			rebuild()
	refresh()
	return {"ok": true, "id": anchor_sel, "effect": effect, "x": p.x, "y": p.y, "part": part}

func set_anchor_fields(id: int, fields: Dictionary) -> Dictionary:
	var a := anchors.by_id(id)
	if a.is_empty():
		return {"ok": false, "error": "no anchor %d" % id}
	_anchor_entry("anchor %s" % ", ".join(PackedStringArray(fields.keys())), func():
		for k in fields:
			a[k] = fields[k])
	refresh()
	if not headless and tab == 5:
		rebuild()
	return {"ok": true, "anchor": a}

func set_anchor_lever(id: int, key: String, v: float) -> void:
	var a := anchors.by_id(id)
	if a.is_empty():
		return
	_anchor_entry("anchor " + key, func():
		if not a.has("levers"):
			a["levers"] = {}
		a["levers"][key] = v)

func remove_anchor(id: int) -> Dictionary:
	if anchors.by_id(id).is_empty():
		return {"ok": false, "error": "no anchor %d" % id}
	_anchor_entry("detach anchor", func(): anchors.remove(id))
	if anchor_sel == id:
		anchor_sel = -1
	refresh()
	if not headless and tab == 5:
		rebuild()
	return {"ok": true, "anchors": anchors.list.size()}

func bake() -> Dictionary:
	var dir := export_dir if export_dir != "" else doc.root.path_join("export")
	var r := anchors.bake(dir, char_name if char_name != "" else "image")
	if r.get("ok", false):
		_say("Anchors written to %s%s." % [String(r["file"]).get_file(), " and into the export's JSON" if r.get("merged", false) else ""])
	return r

func _drag_effect_start(name: String, _pos: Vector2) -> void:
	if canvas:
		canvas.ghost = name

func _drag_effect_move(pos: Vector2) -> void:
	if canvas:
		canvas.ghost_at = pos - canvas.global_position

func _drag_effect_end(pos: Vector2) -> void:
	if canvas == null:
		return
	var name := canvas.ghost
	canvas.ghost = ""
	var local := pos - canvas.global_position
	if name == "" or not Rect2(Vector2.ZERO, canvas.size).has_point(local):
		return
	var fp := canvas.to_frame(local)
	if canvas.in_frame(fp):
		add_anchor(name, fp)
		if app:
			app.audio.blip("drop")

## is the point on or near the figure (the composite's opaque box, widened)
func _on_figure(p: Vector2i) -> bool:
	var img := doc.composite()
	var box := Rect2i()
	var found := false
	for y in doc.height:
		for x in doc.width:
			if img.get_pixel(x, y).a >= 0.5:
				if not found:
					box = Rect2i(x, y, 1, 1)
					found = true
				else:
					box = box.expand(Vector2i(x, y))
	if not found:
		return true
	return box.grow(4).has_point(p)

# ------------------------------------------------------------------ saving
func save() -> Dictionary:
	_finish_floating()
	var n := doc.save_all()
	anchors.save()
	_say("Saved %d frame%s." % [n, "" if n == 1 else "s"] if n > 0 else "Nothing to save.")
	_update_words()
	if not headless:
		rebuild()
	return {"ok": true, "saved": n}

func keep() -> void:
	save()

# ------------------------------------------------------------------ the canvas's pointer
## the anchor under a window point, and which part of it: {id, mode: move|scale|rotate}
func _anchor_hit(fp: Vector2i, win: Vector2) -> Dictionary:
	if canvas == null:
		return {}
	var f := doc.current()
	for a in anchors.on_frame(doc.key):
		var at := canvas.to_window(anchors.place(a, doc, f)) + Vector2(canvas.zoom, canvas.zoom) / 2.0
		var r := maxf(8.0, 8.0 * float(a.get("scale", 1.0)))
		var handle := at + Vector2(0, -r - 6).rotated(deg_to_rad(float(a.get("rotation", 0.0))))
		if win.distance_to(handle) <= 5.0:
			return {"id": int(a["id"]), "mode": "rotate", "at": at}
		var d := (win - at).abs()
		if maxf(d.x, d.y) <= r + 3.0:
			if absf(maxf(d.x, d.y) - r) <= 3.0:
				return {"id": int(a["id"]), "mode": "scale", "at": at, "r0": r, "s0": float(a.get("scale", 1.0))}
			return {"id": int(a["id"]), "mode": "move", "at": at, "grab": fp - anchors.place(a, doc, f)}
	return {}

func on_canvas_press(fp: Vector2i, button: int, shift: bool, alt: bool, ctrl: bool, win: Vector2) -> void:
	canvas_focus = true
	var hit := _anchor_hit(fp, win)
	if not hit.is_empty():
		anchor_sel = int(hit["id"])
		if button == MOUSE_BUTTON_RIGHT:
			set_tab(5)
			refresh()
			return
		anchor_drag = hit
		anchor_drag["before"] = anchors.snapshot()
		refresh()
		return
	if button == MOUSE_BUTTON_RIGHT:
		# the right button picks the colour under the pointer with any tool
		_pick_at(fp, win)
		return
	if not canvas.in_frame(fp) and tool not in ["select", "lasso", "wand", "move", "eyedropper"]:
		return
	var mode := "add" if shift else ("subtract" if alt else "replace")
	match tool:
		"pencil", "brush", "eraser":
			if shift and stroke_last.x >= 0 and tool == "pencil":
				stroke(stroke_last, fp)
				stroke_last = fp
				return
			if not _begin(tool):
				return
			in_stroke = true
			paint_points(Px.stroke_points(fp, fp, brush_size if tool != "pencil" else 1), tool == "eraser")
			stroke_last = fp
			refresh()
		"fill":
			fill_at(fp, fill_global or alt)
		"line", "rect", "ellipse":
			shape_start = fp
			in_stroke = true
		"wand":
			select_wand(fp, mode)
		"select":
			shape_start = fp
			in_stroke = true
			canvas.drag_rect = Rect2i(fp, Vector2i(1, 1))
		"lasso":
			lasso_pts = [fp]
			in_stroke = true
			canvas.lasso = lasso_pts
		"move":
			if floating == null:
				_lift(alt)
			float_from = fp
			in_stroke = true
		"clone":
			if alt:
				set_clone_source(fp)
				_say("Clone source set at %d, %d on this frame." % [fp.x, fp.y])
				return
			clone_sample = null
			in_stroke = true
			clone_stroke(fp, fp)
			stroke_last = fp
		"eyedropper":
			_pick_at(fp, win)
	if app:
		app.audio.blip("ratchet")

func on_canvas_drag(fp: Vector2i, _button: int, shift: bool, alt: bool) -> void:
	if not anchor_drag.is_empty():
		var a := anchors.by_id(int(anchor_drag["id"]))
		if a.is_empty():
			return
		var win := canvas.to_window(fp) + Vector2(canvas.zoom, canvas.zoom) / 2.0
		match String(anchor_drag["mode"]):
			"move":
				var p: Vector2i = fp - Vector2i(anchor_drag["grab"])
				a["x"] = p.x
				a["y"] = p.y
			"scale":
				var d: Vector2 = (win - Vector2(anchor_drag["at"])).abs()
				a["scale"] = snappedf(clampf(maxf(d.x, d.y) / 8.0, 0.25, 3.0), 0.05)
			"rotate":
				var v: Vector2 = win - Vector2(anchor_drag["at"])
				a["rotation"] = round(fmod(rad_to_deg(v.angle()) + 90.0 + 360.0, 360.0))
		refresh()
		return
	if not in_stroke:
		return
	match tool:
		"pencil", "brush", "eraser":
			if fp != stroke_last:
				paint_points(Px.stroke_points(stroke_last, fp, brush_size if tool != "pencil" else 1), tool == "eraser")
				stroke_last = fp
				refresh()
		"clone":
			if fp != stroke_last:
				var L := doc.layer()
				Px.clone(L.image, clone_sample, Px.stroke_points(stroke_last, fp, brush_size), clone_offset, doc.selection, doc.palette.snap)
				stroke_last = fp
				refresh()
		"line":
			canvas.preview_points = Px.stroke_points(shape_start, fp, brush_size)
			canvas.preview_colour = _resolved()
		"rect":
			canvas.preview_points = Px.rect_points(shape_start, fp, shape_filled)
			canvas.preview_colour = _resolved()
		"ellipse":
			canvas.preview_points = Px.ellipse_points(shape_start, fp, shape_filled)
			canvas.preview_colour = _resolved()
		"select":
			var a := Vector2i(mini(shape_start.x, fp.x), mini(shape_start.y, fp.y))
			var b := Vector2i(maxi(shape_start.x, fp.x), maxi(shape_start.y, fp.y))
			canvas.drag_rect = Rect2i(a, b - a + Vector2i(1, 1))
		"lasso":
			if lasso_pts.is_empty() or lasso_pts[lasso_pts.size() - 1] != fp:
				lasso_pts.append(fp)
				canvas.lasso = lasso_pts
		"move":
			float_at = fp - float_from
			canvas.floating_at = float_at

func on_canvas_release(fp: Vector2i, _button: int, shift: bool, alt: bool) -> void:
	if not anchor_drag.is_empty():
		var a := anchors.by_id(int(anchor_drag["id"]))
		var before: Array = anchor_drag["before"]
		var mode := String(anchor_drag["mode"])
		anchor_drag = {}
		if not a.is_empty():
			if mode == "move" and not _on_figure(Vector2i(int(a["x"]), int(a["y"]))):
				anchors.restore(before)
				_anchor_entry("detach anchor", func(): anchors.remove(int(a["id"])))
				anchor_sel = -1
				_say("Detached: dropped off the figure.")
			else:
				var after := anchors.snapshot()
				anchors.restore(before)
				_anchor_entry("anchor " + mode, func(): anchors.restore(after))
		refresh()
		if tab == 5:
			rebuild()
		return
	if not in_stroke:
		return
	in_stroke = false
	var mode := "add" if shift else ("subtract" if alt else "replace")
	match tool:
		"pencil", "brush", "eraser", "clone":
			_end()
			clone_sample = null
			if app:
				app.audio.blip("scrape", 1.1)
		"line", "rect", "ellipse":
			canvas.preview_points = []
			stroke(shape_start, fp)
		"select":
			canvas.drag_rect = Rect2i()
			select_rect(shape_start, fp, mode)
		"lasso":
			canvas.lasso = []
			if lasso_pts.size() >= 3:
				select_lasso(lasso_pts, mode)
			lasso_pts = []
		"move":
			_drop_floating()
	_update_words()

func on_canvas_hover(fp: Vector2i) -> void:
	if canvas and tool in ["pencil", "brush", "eraser", "clone"]:
		canvas.brush_points = Px.brush_points(fp, brush_size if tool != "pencil" else 1)
	elif canvas:
		canvas.brush_points = []

func on_canvas_zoom(z: int) -> void:
	if app:
		app.say_hint("zoom %dx · the wheel zooms in whole steps; middle-drag pans" % z)

## the colour under a point: the frame's own pixel when there is one, else what is on screen there (the reference)
func _pick_at(fp: Vector2i, win: Vector2) -> void:
	var c := Color(0, 0, 0, 0)
	if canvas.in_frame(fp):
		c = doc.composite().get_pixel(fp.x, fp.y)
	if c.a < 0.5:
		var shot := get_viewport().get_texture().get_image()
		if shot:
			var gp := canvas.global_position + win
			var vp := get_viewport().get_visible_rect()
			var sx := shot.get_width() / vp.size.x
			var px := Vector2i(int(gp.x * sx), int(gp.y * sx))
			if px.x >= 0 and px.y >= 0 and px.x < shot.get_width() and px.y < shot.get_height():
				c = shot.get_pixel(px.x, px.y)
				c.a = 1.0
	if c.a < 0.5:
		_say("Nothing there.")
		return
	var slot := doc.palette.slot_of(c)
	set_colour(c)
	if slot >= 0:
		_say("%s · slot %d · %s" % [Pal.hex(c), slot, Pal.oklab_text(c)])
	else:
		_say("%s · not in the palette · %s%s" % [Pal.hex(c), Pal.oklab_text(c), " · snaps to slot %d" % doc.palette.nearest(c) if doc.palette.mode == Pal.LOCKED else ""])
	if app:
		app.audio.blip("ratchet")

# ------------------------------------------------------------------ keys
func on_key(ev: InputEvent) -> bool:
	if doc.current() == null:
		return false
	if hex_edit and is_instance_valid(hex_edit) and hex_edit.has_focus():
		if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE:
			hex_edit.release_focus()
			return true
		return false
	var focus_owner := get_viewport().gui_get_focus_owner()
	if focus_owner is LineEdit:
		return false
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT and tool == "eyedropper" and canvas:
		# the eyedropper samples anything on screen: a click outside the picture too
		var local: Vector2 = ev.position - canvas.global_position
		if not Rect2(Vector2.ZERO, canvas.size).has_point(local) and ev.position.y < App.TEXTBOX.position.y - 2:
			_pick_at(Vector2i(-1, -1), local)
			return true
		return false
	if ev is InputEventMouseButton and ev.pressed and canvas and not Rect2(canvas.global_position, canvas.size).has_point(ev.position):
		canvas_focus = false
		return false
	if not (ev is InputEventKey) or not ev.pressed:
		return false
	var k: int = ev.keycode
	if ev.ctrl_pressed:
		match k:
			KEY_Z:
				if ev.shift_pressed:
					redo()
				else:
					undo()
				return true
			KEY_Y:
				redo()
				return true
			KEY_A:
				select_all()
				return true
			KEY_D:
				deselect()
				return true
			KEY_S:
				save()
				return true
			KEY_I:
				invert_selection()
				return true
			KEY_0:
				if canvas:
					canvas.fit()
				return true
		return false
	if ev.echo:
		if k in [KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN] and canvas_focus and not doc.selection.is_empty():
			return true
		return false
	if k == KEY_ESCAPE:
		if floating != null:
			_finish_floating()
			return true
		if canvas_focus:
			canvas_focus = false
			if not doc.selection.is_empty():
				deselect()
				return true
		return false
	if TOOL_KEYS.has(k) and not ev.alt_pressed:
		set_tool(TOOL_KEYS[k])
		if app:
			app.audio.blip("tab")
		return true
	match k:
		KEY_X:
			swap_colours()
			return true
		KEY_BRACKETLEFT:
			set_brush_size(brush_size - 1)
			return true
		KEY_BRACKETRIGHT:
			set_brush_size(brush_size + 1)
			return true
		KEY_DELETE, KEY_BACKSPACE:
			if canvas_focus or not doc.selection.is_empty():
				clear_selection()
				return true
		KEY_COMMA:
			set_frame(doc.index - 1)
			return true
		KEY_PERIOD:
			set_frame(doc.index + 1)
			return true
		KEY_EQUAL, KEY_PLUS:
			if canvas:
				canvas.set_zoom(canvas.zoom + 1)
			return true
		KEY_MINUS:
			if canvas:
				canvas.set_zoom(canvas.zoom - 1)
			return true
		KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN:
			if canvas_focus and not doc.selection.is_empty():
				var d: Vector2i = {KEY_LEFT: Vector2i(-1, 0), KEY_RIGHT: Vector2i(1, 0), KEY_UP: Vector2i(0, -1), KEY_DOWN: Vector2i(0, 1)}[k]
				if ev.shift_pressed:
					d *= 10
				nudge(d, ev.alt_pressed)
				return true
	return false

func on_drop(paths: PackedStringArray) -> void:
	if paths.is_empty():
		return
	var p := paths[0]
	if doc.current() != null and not doc.single and Image.load_from_file(p) != null and not p.get_file().begins_with("frame_"):
		set_reference(p)
		_say("%s is the reference; the reference cycler dims it." % p.get_file())
		return
	if open_image(p):
		rebuild()
		refresh()

# ------------------------------------------------------------------ the command line (the driver, the JSON file, an assistant)
## one command as words; returns {ok, ...}. GUIDE_AI lists them.
func exec_line(line: String) -> Dictionary:
	var parts := line.strip_edges().split(" ", false)
	if parts.is_empty():
		return {"ok": false, "error": "empty"}
	var cmd := String(parts[0]).to_lower()
	var a := parts.slice(1)
	return exec(cmd, a)

static func _vec(a: PackedStringArray, i: int) -> Vector2i:
	return Vector2i(int(a[i]), int(a[i + 1]))

static func _mode_of(a: PackedStringArray, from: int) -> String:
	for i in range(from, a.size()):
		if a[i] in ["add", "sub", "subtract", "replace", "intersect"]:
			return "subtract" if a[i] == "sub" else a[i]
	return "replace"

func exec(cmd: String, a: PackedStringArray) -> Dictionary:
	if doc.current() == null and cmd not in ["open", "info"]:
		return {"ok": false, "error": "nothing is open"}
	match cmd:
		"open":
			if a.size() >= 3:
				return {"ok": open_frames(a[0], a[1], a[2])}
			return {"ok": a.size() == 1 and open_image(a[0])}
		"tool":
			return set_tool(a[0]) if a.size() > 0 else {"ok": false, "error": "tool NAME"}
		"colour", "color":
			if a.is_empty():
				return {"ok": false, "error": "colour #hex"}
			if a[0].is_valid_int() and not a[0].begins_with("#"):
				var s := int(a[0])
				if s < 0 or s >= doc.palette.size():
					return {"ok": false, "error": "no slot %d" % s}
				return set_colour(doc.palette.colours[s])
			if not Color.html_is_valid(a[0]):
				return {"ok": false, "error": "not a colour: %s" % a[0]}
			return set_colour(Color.html(a[0]))
		"size":
			return set_brush_size(int(a[0])) if a.size() > 0 else {"ok": false, "error": "size N"}
		"tolerance":
			return set_tolerance(float(a[0])) if a.size() > 0 else {"ok": false, "error": "tolerance 0..1"}
		"lock":
			return set_lock(a[0]) if a.size() > 0 else {"ok": false, "error": "lock locked|open"}
		"global":
			fill_global = a.size() > 0 and a[0] in ["on", "1", "true"]
			return {"ok": true, "global": fill_global}
		"filled":
			shape_filled = a.size() > 0 and a[0] in ["on", "1", "true"]
			return {"ok": true, "filled": shape_filled}
		"frame":
			return set_frame(int(a[0]) - 1) if a.size() > 0 else {"ok": false, "error": "frame N (1-based)"}
		"direction":
			return set_direction(a[0]) if a.size() > 0 else {"ok": false, "error": "direction S|SE|E|..."}
		"clip":
			return set_clip(a[0]) if a.size() > 0 else {"ok": false, "error": "clip NAME"}
		"stroke":
			if a.size() < 2:
				return {"ok": false, "error": "stroke x y [x y ...]"}
			var pts := []
			var i := 0
			while i + 1 < a.size():
				pts.append(_vec(a, i))
				i += 2
			if pts.size() == 1:
				return stroke(pts[0], pts[0])
			if tool in ["line", "rect", "ellipse"]:
				return stroke(pts[0], pts[pts.size() - 1])
			if not _begin(tool):
				return {"ok": false, "error": "layer locked"}
			var n := 0
			if tool == "clone":
				history.cancel()
				var last := {}
				clone_sample = null
				for j in range(pts.size() - 1):
					last = clone_stroke(pts[j], pts[j + 1])
					n += int(last.get("count", 0))
				clone_sample = null
				last["count"] = n
				return last
			for j in range(pts.size() - 1):
				n += paint_points(Px.stroke_points(pts[j], pts[j + 1], brush_size if tool != "pencil" else 1), tool == "eraser")
			var r := _end()
			r["count"] = n
			return r
		"fill":
			if a.size() < 2:
				return {"ok": false, "error": "fill x y [global]"}
			return fill_at(_vec(a, 0), a.size() > 2 and a[2] == "global" or fill_global)
		"select":
			if a.is_empty():
				return {"ok": false, "error": "select rect|wand|lasso|all|none|invert ..."}
			match a[0]:
				"rect":
					if a.size() < 5:
						return {"ok": false, "error": "select rect x y w h [add|sub]"}
					var p := _vec(a, 1)
					var s := _vec(a, 3)
					return select_rect(p, p + s - Vector2i(1, 1), _mode_of(a, 5))
				"wand":
					if a.size() < 3:
						return {"ok": false, "error": "select wand x y [tol] [add|sub]"}
					var tol := float(a[3]) if a.size() > 3 and a[3].is_valid_float() else -1.0
					return select_wand(_vec(a, 1), _mode_of(a, 3), tol)
				"lasso":
					var pts := []
					var i := 1
					while i + 1 < a.size() and a[i].is_valid_int():
						pts.append(_vec(a, i))
						i += 2
					return select_lasso(pts, _mode_of(a, i))
				"all":
					return select_all()
				"none":
					return deselect()
				"invert":
					return invert_selection()
			return {"ok": false, "error": "select what?"}
		"deselect":
			return deselect()
		"clear":
			return clear_selection()
		"move", "nudge":
			if a.size() < 2:
				return {"ok": false, "error": "move dx dy [copy]"}
			return nudge(_vec(a, 0), a.size() > 2 and a[2] == "copy")
		"mirror":
			return mirror(true)
		"flip":
			return mirror(false)
		"clone_source":
			if a.size() < 2:
				return {"ok": false, "error": "clone_source x y [frame N] [direction D]"}
			var k := doc.key
			var fi := -1
			var i := 2
			while i + 1 < a.size():
				if a[i] == "frame":
					fi = int(a[i + 1]) - 1
				elif a[i] == "direction":
					k = "%s_%s" % [Doc.clip_of(k), a[i + 1].to_upper()]
				elif a[i] == "clip":
					k = "%s_%s" % [a[i + 1], Doc.dir_of(k)]
				i += 2
			return set_clone_source(_vec(a, 0), k, fi)
		"undo":
			var before := history.cursor
			undo()
			return {"ok": history.cursor < before or before == 0, "applied": history.cursor}
		"redo":
			var before := history.cursor
			redo()
			return {"ok": history.cursor > before or before == history.entries.size(), "applied": history.cursor}
		"history":
			if a.is_empty():
				return {"ok": true, "applied": history.cursor, "entries": history.lines()}
			return goto_history(int(a[0]))
		"carry":
			return carry(a[0] if a.size() > 0 else Carry.SCOPE_ALL)
		"layer":
			if a.is_empty():
				var names := []
				for L in doc.current().layers:
					names.append(L.name)
				return {"ok": true, "layers": names, "active": doc.active_layer}
			match a[0]:
				"add":
					return add_layer(a[1] if a.size() > 1 else "layer %d" % doc.current().layers.size())
				"merge":
					return merge_down()
				"delete":
					return delete_layer()
				"pick":
					return pick_layer(layer_index(a[1])) if a.size() > 1 else {"ok": false, "error": "layer pick NAME"}
				"visible":
					if a.size() < 3:
						return {"ok": false, "error": "layer visible NAME on|off"}
					var li := layer_index(a[1])
					if li < 0:
						return {"ok": false, "error": "no layer " + a[1]}
					doc.current().layers[li].visible = a[2] in ["on", "1", "true"]
					refresh()
					return {"ok": true}
				"opacity":
					if a.size() < 3:
						return {"ok": false, "error": "layer opacity NAME 0..1"}
					var li := layer_index(a[1])
					if li < 0:
						return {"ok": false, "error": "no layer " + a[1]}
					doc.current().layers[li].opacity = clampf(float(a[2]), 0.0, 1.0)
					refresh()
					return {"ok": true}
				"lock":
					if a.size() < 3:
						return {"ok": false, "error": "layer lock NAME on|off"}
					var li := layer_index(a[1])
					if li < 0:
						return {"ok": false, "error": "no layer " + a[1]}
					doc.current().layers[li].locked = a[2] in ["on", "1", "true"]
					return {"ok": true}
			return {"ok": false, "error": "layer add|merge|delete|pick|visible|opacity|lock"}
		"onion":
			return set_onion(a.size() > 0 and a[0] in ["on", "1", "true"])
		"reference":
			if a.is_empty():
				return {"ok": false, "error": "reference FILE|off|dim V"}
			if a[0] == "off":
				return set_reference("")
			if a[0] == "dim":
				return set_reference_dim(float(a[1]) if a.size() > 1 else 0.5)
			return set_reference(a[0])
		"anchor":
			if a.is_empty():
				return {"ok": true, "anchors": anchors.list}
			match a[0]:
				"add":
					if a.size() < 4:
						return {"ok": false, "error": "anchor add EFFECT x y"}
					return add_anchor(a[1], _vec(a, 2))
				"move":
					if a.size() < 4:
						return {"ok": false, "error": "anchor move ID x y"}
					return set_anchor_fields(int(a[1]), {"x": int(a[2]), "y": int(a[3])})
				"scale":
					return set_anchor_fields(int(a[1]), {"scale": float(a[2])}) if a.size() > 2 else {"ok": false, "error": "anchor scale ID k"}
				"rotate":
					return set_anchor_fields(int(a[1]), {"rotation": float(a[2])}) if a.size() > 2 else {"ok": false, "error": "anchor rotate ID deg"}
				"direction":
					return set_anchor_fields(int(a[1]), {"dir": a[2]}) if a.size() > 2 else {"ok": false, "error": "anchor direction ID all|S|E..."}
				"lever":
					if a.size() < 4:
						return {"ok": false, "error": "anchor lever ID NAME value"}
					set_anchor_lever(int(a[1]), a[2], float(a[3]))
					return {"ok": true}
				"remove", "detach":
					return remove_anchor(int(a[1])) if a.size() > 1 else {"ok": false, "error": "anchor remove ID"}
			return {"ok": false, "error": "anchor add|move|scale|rotate|direction|lever|remove"}
		"bake":
			return bake()
		"zoom":
			if canvas and a.size() > 0:
				canvas.set_zoom(int(a[0]))
			return {"ok": true, "zoom": canvas.zoom if canvas else 0}
		"pan":
			if canvas and a.size() > 1:
				canvas.pan = _vec(a, 0)
			return {"ok": true}
		"fit":
			if canvas:
				canvas.fit()
			return {"ok": true}
		"save":
			return save()
		"pixel":
			if a.size() < 2:
				return {"ok": false, "error": "pixel x y"}
			var p := _vec(a, 0)
			if p.x < 0 or p.y < 0 or p.x >= doc.width or p.y >= doc.height:
				return {"ok": false, "error": "outside the frame"}
			var c := doc.composite().get_pixel(p.x, p.y)
			return {"ok": true, "x": p.x, "y": p.y, "hex": Pal.hex(c) if c.a >= 0.5 else "none", "alpha": c.a, "slot": doc.palette.slot_of(c) if c.a >= 0.5 else -1,
				"oklab": Pal.oklab_text(c) if c.a >= 0.5 else "", "part": Doc.part_at(doc.parts_of(doc.current()), p.x, p.y)}
		"info":
			var names := []
			if doc.current():
				for L in doc.current().layers:
					names.append(L.name)
			return {"ok": true, "root": doc.root, "key": doc.key, "frame": doc.index + 1, "frames": doc.count(), "size": [doc.width, doc.height], "tool": tool,
				"colour": Pal.hex(colour), "brush": brush_size, "lock": doc.palette.mode, "palette": doc.palette.to_hex_list(), "added": doc.palette.added,
				"selected": Px.mask_count(doc.selection), "layers": names, "active_layer": doc.active_layer, "history": history.cursor, "entries": history.entries.size(),
				"anchors": anchors.list.size(), "unsaved": doc.dirty_count(), "keys": doc.keys}
	return {"ok": false, "error": "unknown editor command: " + cmd}
