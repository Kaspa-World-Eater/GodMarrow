extends "res://scripts/quest.gd"
## Fix up a picture: recolour a part (shading kept), add a glow, erase a patch, restore from the original, smooth.
## Click the picture; every click is one operation the command line can replay (pixelforge skin), and Undo takes
## the last one back. The classic editors are one button away for the rest.

const STEPS := ["Picture", "Fix", "Keep"]
const TOOLS := [["recolor", "Recolour", "click a colour; the shading stays"], ["glow", "Glow", "a soft light that spills a little"],
	["erase", "Erase", "take a patch away"], ["restore", "Restore", "bring the original back"], ["smooth", "Smooth", "soften a patch"]]
const COLOURS := [["#44aea6", "teal"], ["#8fe3d2", "pale teal"], ["#e8e2d0", "bone"], ["#f0a040", "amber"], ["#d9a441", "gold"], ["#b070e0", "violet"],
	["#9ad4e8", "frost"], ["#95c860", "poison"], ["#55575c", "iron"], ["#5c1010", "blood"], ["#15141a", "black"]]

var src := ""
var work := ""
var ops: Array = []
var tool := "recolor"
var colour := "#44aea6"
var canvas: Control
var tex: Texture2D
var status := {}

func _init() -> void:
	quest_title = "Fix up a picture"
	steps = STEPS

func begin() -> void:
	if args.has("drop"):
		state["painting"] = String(args["drop"])
	if args.has("draft") and args["draft"].get("what", "") == "skin":
		state["draft_ops"] = args["draft"].get("ops", [])
		state["draft_text"] = String(args.get("describe", ""))

func build_step(i: int) -> void:
	match i:
		0: _picture()
		1: _fix()
		2: _keep()

func _picture() -> void:
	picture(W.drop_zone("Drop the picture here", "Choose a picture", func(): app.choose_file(PackedStringArray(["*.png ; Pictures"]), _dropped)))
	headline("Which picture?")
	words("A cutout, a sprite, a finished sheet: any PNG. The original is kept; nothing is lost.")
	if state.has("draft_text"):
		words("You asked: \"" + String(state["draft_text"]) + "\". Drop the picture it is about and it is done.", "Small")
	next_line("you click where the fix goes.")
	if status.is_empty() and app.backend.project_exists():
		run(["project", "status", "--project", app.backend.project_dir], "status", func(r: Dictionary):
			status = r
			if step == 0:
				show_step())
	var chars: Dictionary = status.get("characters", {})
	if not chars.is_empty():
		words("Or a cutout from the project:", "Small")
		var f := HFlowContainer.new()
		f.add_theme_constant_override("h_separation", 4)
		f.add_theme_constant_override("v_separation", 4)
		for k in chars:
			for v in ["front", "side", "back", "quarter"]:
				var p: String = app.backend.project_dir.path_join("characters").path_join(k).path_join("views").path_join(v + ".png")
				if FileAccess.file_exists(p):
					f.add_child(W.chip("%s %s" % [W.pretty(k), v], false, func(): _dropped(p)))
		right.add_child(f)
	if state.has("painting") and not state.get("started", false):
		state["started"] = true
		call_deferred("_dropped", state["painting"])

func on_drop(paths: PackedStringArray) -> void:
	if step == 0 and not paths.is_empty():
		_dropped(paths[0])

func _dropped(path: String) -> void:
	src = path
	var img := Image.load_from_file(path)
	if img == null:
		app.say("That is not a picture the Forge can read.")
		return
	ensure_project(func():
		work = app.backend.out_dir("fix").path_join(path.get_file())
		ops = []
		if state.has("draft_ops"):
			ops = state["draft_ops"].duplicate(true)
			state.erase("draft_ops")
		_apply(func():
			mark_done(0)
			go_step(1)
			if args.has("fixclick"):   # test hook: one recolour at x,y
				var xy := String(args["fixclick"]).split(",")
				if xy.size() == 2:
					state["last_at"] = Vector2(float(xy[0]), float(xy[1]))
					_click(int(xy[0]), int(xy[1]))))

## re-apply every op from the original to the working copy (so Undo is exact)
func _apply(cb: Callable) -> void:
	run(["skin", src, JSON.stringify(ops), "-o", work], "fix", func(_r: Dictionary):
		FT.forget(work)
		tex = FT.tex(work, false)
		cb.call())

func _fix() -> void:
	canvas = Control.new()
	canvas.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	canvas.size_flags_vertical = Control.SIZE_EXPAND_FILL
	canvas.mouse_filter = Control.MOUSE_FILTER_STOP
	canvas.draw.connect(_draw_canvas)
	canvas.gui_input.connect(_canvas_input)
	canvas.mouse_default_cursor_shape = Control.CURSOR_CROSS
	picture(canvas)
	headline("Click where the fix goes")
	var tr := W.row(3)
	for t in TOOLS:
		var key: String = t[0]
		var b := W.chip(t[1], key == tool, func(): tool = key; show_step())
		b.focus_mode = Control.FOCUS_ALL
		b.tooltip_text = t[2]
		tr.add_child(b)
	right.add_child(tr)
	for t in TOOLS:
		if t[0] == tool:
			words(W.sentence(t[2]) + ".", "Small")
	if tool in ["recolor", "glow"]:
		var cr := HFlowContainer.new()
		cr.add_theme_constant_override("h_separation", 3)
		cr.add_theme_constant_override("v_separation", 3)
		for c in COLOURS:
			var hex: String = c[0]
			var b := W.button("", "Chip", func(): colour = hex; adv["colour"] = hex; show_step())
			b.custom_minimum_size = Vector2(22, 16)
			b.tooltip_text = c[1]
			var sw := ColorRect.new()
			sw.color = Color(hex)
			sw.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
			sw.offset_left = 3
			sw.offset_right = -3
			sw.offset_top = 3
			sw.offset_bottom = -3
			sw.mouse_filter = Control.MOUSE_FILTER_IGNORE
			b.add_child(sw)
			if hex == colour:
				b.theme_type_variation = "ChipOn"
			cr.add_child(b)
		right.add_child(cr)
	words("%d change%s so far." % [ops.size(), "" if ops.size() == 1 else "s"], "Small")
	next_line("you keep it, and the original is saved beside it.")
	big("Keep it", func(): go_step(2))
	buttons([W.button("Undo", "", func():
		if not ops.is_empty():
			ops.pop_back()
			_apply(func(): show_step())),
		W.ghost("Start over", func(): ops.clear(); _apply(func(): show_step())),
		W.ghost("Open the classic editor", func():
			app.backend.launch(app.backend.python, PackedStringArray(["-c", Backend.BOOT, app.backend.pf_root, "studio"]))
			app.say("The classic Studio is opening in its own window."))])
	advanced([
		{"key": "range", "label": "How far the colour reaches", "type": "float", "default": 0.12, "hint": "recolour: higher takes in more shades"},
		{"key": "radius", "label": "Brush size", "type": "int", "default": 0, "hint": "0 = the tool's own (30 recolour, 10 glow, 6 erase)"},
		{"key": "strength", "label": "Glow strength", "type": "float", "default": 0.6},
		{"key": "colour", "label": "Colour", "type": "text", "default": colour, "hint": "a hex colour"},
	])

func _fit() -> Dictionary:
	if tex == null:
		return {}
	var sz := tex.get_size()
	var k := minf(canvas.size.x / sz.x, canvas.size.y / sz.y)
	if k >= 1.0:
		k = floorf(k)
	var dst := Rect2((canvas.size - sz * k) / 2.0, sz * k)
	return {"k": k, "dst": dst}

func _draw_canvas() -> void:
	canvas.draw_rect(Rect2(Vector2.ZERO, canvas.size), Color("#040408"))
	if tex == null:
		return
	var f := _fit()
	canvas.draw_texture_rect(tex, f["dst"], false)
	# the last click, marked
	if state.has("last_at"):
		var at: Vector2 = state["last_at"]
		var p: Vector2 = f["dst"].position + at * f["k"]
		canvas.draw_rect(Rect2(p.x - 3, p.y, 7, 1), FT.TEAL)
		canvas.draw_rect(Rect2(p.x, p.y - 3, 1, 7), FT.TEAL)

func _canvas_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT and tex != null and not working:
		var f := _fit()
		var dst: Rect2 = f["dst"]
		if not dst.has_point(ev.position):
			return
		var at: Vector2 = ((ev.position - dst.position) / float(f["k"])).floor()
		state["last_at"] = at
		_click(int(at.x), int(at.y))

func _click(x: int, y: int) -> void:
	var r := int(adv.get("radius", 0))
	var hex := String(adv.get("colour", colour))
	var op := {"op": tool, "at": [x, y]}
	match tool:
		"recolor":
			op["to"] = hex
			op["range"] = float(adv.get("range", 0.12))
			op["radius"] = r if r > 0 else 30
		"glow":
			op["color"] = hex
			op["radius"] = r if r > 0 else 10
			op["strength"] = float(adv.get("strength", 0.6))
		"erase", "restore":
			op["radius"] = r if r > 0 else 6
		"smooth":
			op["radius"] = r if r > 0 else 8
			op["polygon"] = [[x - 8, y - 8], [x + 8, y - 8], [x + 8, y + 8], [x - 8, y + 8]]
			op.erase("at")
	ops.append(op)
	FSfx.play("tick")
	_apply(func(): show_step())

func _keep() -> void:
	picture(W.picture(tex) if tex else W.label("", "Dim"))
	if not state.get("kept", false):
		headline("Keep it?")
		words("%d change%s go%s into the picture. The original is saved next to it as a .bak, so nothing is lost." % [ops.size(), "" if ops.size() == 1 else "s", "es" if ops.size() == 1 else ""])
		next_line("if this is a cutout, the Build step uses the fixed one from now on.")
		big("Keep it", func(): run(["skin", src, JSON.stringify(ops)], "keep", func(_r): state["kept"] = true; mark_done(1); mark_done(2); show_step()))
		buttons([W.ghost("Save the changes as a file to replay later", func():
			var p: String = app.backend.out_dir("fix").path_join(src.get_file().get_basename() + ".ops.json")
			var f := FileAccess.open(p, FileAccess.WRITE)
			if f:
				f.store_string(JSON.stringify(ops, "  "))
				app.say("Saved in the project's fix folder.", 4.0))])
		return
	headline("Kept.")
	words("The picture is changed; the original is beside it as a .bak.")
	buttons([W.primary("Fix another", func(): src = ""; ops = []; state.clear(); done.clear(); go_step(0)), W.ghost("Back to the start", func(): app.home())])
