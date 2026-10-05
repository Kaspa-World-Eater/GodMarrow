extends "res://scripts/screen.gd"
## Detail: the bench where the painted detail that rides a part is made (docs/FORGE_FROM_THE_GAME.md 3.1). Pick a
## part, see its texture unwrapped at pixel scale on the left of the picture window (u round the part with the front
## in the middle, v down it), paint on it with the pencil or a brush in the material's ramp shades (each shade is a
## step offset, never a new colour), and watch the turning figure on the right redraw with it. Every stroke writes
## the texture through `pixelforge shapes detail FILE --part NAME --from PNG` and asks `shapes still` for the figure
## again (a request: a quick run of strokes draws once, for the last). Undo keeps every stroke. Mouse-driven: left
## drag paints, right drag erases, the shade chips under the texture pick the shade, the wheel of choices turns the
## figure. Nothing flashes; the figure stands until the new picture is ready.
##   --screen=detail --model=FILE [--part=NAME] [--direction=S]

const TOOLS := ["pencil", "brush 2", "brush 3", "brush 4"]
const DIRS := ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]
const SEED := -4                  # the texel value that seeds a blood run (pixelforge.shapes.DETAIL_SEED)
const MAX := 3

var parts: Array = []             # the listing from `shapes detail --list`
var grid := PackedInt32Array()     # the part's texture: step offsets, row-major
var tw := 0
var th := 0
var canvas: Control = null
var stroke_before := PackedInt32Array()
var painting := false
var dirty := false
var still_tex: Texture2D = null

func build() -> void:
	tabs = PackedStringArray(["Detail"])
	hint_text = "left drag paints · right drag erases · Esc back"
	if state.is_empty():
		state = {"model": String(args.get("model", "")), "part": String(args.get("part", "")), "direction": String(args.get("direction", "S")),
			"tool": 0, "shade": -1, "title": ""}
	if String(state["model"]) == "":
		state["model"] = app.backend.pf_root.path_join("assets/shapes/characters/keeper.shapes.json")
	state["title"] = String(state["model"]).get_file().split(".")[0].capitalize()
	_make_canvas()
	rebuild()
	_list_parts()

func on_exit() -> void:
	if canvas and is_instance_valid(canvas):
		canvas.queue_free()
		canvas = null

func _exit_tree() -> void:
	on_exit()

func can_leave() -> bool:
	return true

# ------------------------------------------------------------------ the pipeline
func previews_dir() -> String:
	var d := app.backend.out_dir("detail")
	DirAccess.make_dir_recursive_absolute(d)
	return d

func _list_parts() -> void:
	run(["shapes", "detail", String(state["model"]), "--list"], "reading the parts", func(r: Dictionary):
		if not r.get("ok", false):
			return
		parts = r.get("parts", [])
		if parts.is_empty():
			app.say("That model has no parts to paint.")
			return
		if String(state["part"]) == "" or _part_index(String(state["part"])) < 0:
			state["part"] = String(parts[0]["name"])
			for p in parts:
				if p.get("png", null) != null:
					state["part"] = String(p["name"])
					break
		_load_texture()
		rebuild()
		request(_render_still, 0.0), false)

func _part_index(name: String) -> int:
	for i in parts.size():
		if String(parts[i]["name"]) == name:
			return i
	return -1

func part() -> Dictionary:
	var i := _part_index(String(state["part"]))
	return parts[i] if i >= 0 else {}

## the part's texture from its PNG (grey levels to offsets), or a blank grid of the part's natural size
func _load_texture() -> void:
	var p := part()
	if p.is_empty():
		return
	var size: Array = p.get("size", [16, 16])
	tw = int(size[0])
	th = int(size[1])
	grid = PackedInt32Array()
	var png := String(p.get("png", "")) if p.get("png", null) != null else ""
	if png != "" and FileAccess.file_exists(png):
		var img := Image.load_from_file(png)
		if img:
			img.convert(Image.FORMAT_RGBA8)
			tw = img.get_width()
			th = img.get_height()
			grid.resize(tw * th)
			for y in th:
				for x in tw:
					var c := img.get_pixel(x, y)
					grid[y * tw + x] = 0 if c.a < 0.5 else offset_of(int(round(c.r * 255.0)))
	elif p.get("rows", null) != null:
		var rows: Array = p["rows"]
		th = rows.size()
		tw = (rows[0] as Array).size() if th > 0 else 0
		grid.resize(tw * th)
		for y in th:
			for x in tw:
				grid[y * tw + x] = int(rows[y][x])
	else:
		grid.resize(tw * th)
		grid.fill(0)
	stroke_before = grid.duplicate()
	if canvas:
		canvas.queue_redraw()

## grey level <-> step offset: the same rule as pixelforge.shapes.encode_detail (128 = none, 32 per step, 0 = a seed)
static func grey_of(offset: int) -> int:
	if offset == SEED:
		return 0
	return clampi(128 + clampi(offset, -MAX, MAX) * 32, 1, 255)

static func offset_of(grey: int) -> int:
	if grey == 0:
		return SEED
	return clampi(int(round((grey - 128) / 32.0)), -MAX, MAX)

## the texels a tool covers at (x, y): the pencil one, a brush a square of its size, clipped to the grid
static func footprint(x: int, y: int, size: int, w: int, h: int) -> PackedInt32Array:
	var out := PackedInt32Array()
	var half := (size - 1) / 2
	for dy in range(-half, size - half):
		for dx in range(-half, size - half):
			var px := x + dx
			var py := y + dy
			if px >= 0 and px < w and py >= 0 and py < h:
				out.append(py * w + px)
	return out

func _write_texture(then: Callable = Callable()) -> void:
	var p := part()
	if p.is_empty() or tw == 0:
		return
	var img := Image.create_empty(tw, th, false, Image.FORMAT_L8)
	for y in th:
		for x in tw:
			var g := grey_of(grid[y * tw + x])
			img.set_pixel(x, y, Color(g / 255.0, g / 255.0, g / 255.0, 1.0))
	var png := previews_dir().path_join("paint_%s.png" % slug(String(p["name"])))
	img.save_png(png)
	run(["shapes", "detail", String(state["model"]), "--part", String(p["name"]), "--from", png], "keeping the texture", func(r: Dictionary):
		if r.get("ok", false):
			var i := _part_index(String(p["name"]))
			if i >= 0:
				parts[i]["png"] = r.get("png", parts[i].get("png"))
			dirty = false
		if then.is_valid():
			then.call(), false)

## the figure facing the chosen direction, drawn with the texture as it stands now (the request/ticket rule of every bench)
func _render_still() -> void:
	if not is_inside_tree():
		return
	var d := String(state["direction"])
	var out := previews_dir().path_join("still_%s.png" % d)
	var t_ := ticket()
	run(["shapes", "still", String(state["model"]), "-o", out, "--direction", d, "--style", app.style_name, "--zoom", "1"], "drawing the figure", func(r: Dictionary):
		if not r.get("ok", false) or not fresh(t_) or d != String(state["direction"]):
			return
		still_tex = tex_load(String(r.get("png", out)))
		if canvas:
			canvas.queue_redraw(), false)

static func tex_load(path: String) -> Texture2D:
	if path == "" or not FileAccess.file_exists(path):
		return null
	var img := Image.load_from_file(path)
	return ImageTexture.create_from_image(img) if img else null

# ------------------------------------------------------------------ painting
func tool_size() -> int:
	return [1, 2, 3, 4][clampi(int(state["tool"]), 0, 3)]

func paint_at(x: int, y: int, erase: bool) -> void:
	if tw == 0:
		return
	var v := 0 if erase else int(state["shade"])
	var changed := false
	for i in footprint(x, y, tool_size(), tw, th):
		if grid[i] != v:
			grid[i] = v
			changed = true
	if changed:
		dirty = true
		if canvas:
			canvas.queue_redraw()

func stroke_begin() -> void:
	stroke_before = grid.duplicate()
	painting = true

func stroke_end() -> void:
	painting = false
	if not dirty:
		return
	undo_stack.append(stroke_before.duplicate())
	if undo_stack.size() > 200:
		undo_stack.pop_front()
	redo_stack = []
	_write_texture(func(): request(_render_still, 0.2))

func undo() -> void:
	if undo_stack.is_empty():
		app.say("Nothing to undo.")
		return
	redo_stack.append(grid.duplicate())
	grid = undo_stack.pop_back()
	dirty = true
	if canvas:
		canvas.queue_redraw()
	_write_texture(func(): request(_render_still, 0.0))
	app.audio.blip("confirm")

func redo() -> void:
	if redo_stack.is_empty():
		return
	undo_stack.append(grid.duplicate())
	grid = redo_stack.pop_back()
	dirty = true
	_write_texture(func(): request(_render_still, 0.0))

func _stock_part() -> void:
	var p := part()
	if p.is_empty():
		return
	if not bool(p.get("stock", false)):
		app.say("No stock detail for %s (%s); paint it." % [String(p["name"]), String(p.get("class", ""))])
		return
	undo_stack.append(grid.duplicate())
	run(["shapes", "detail", String(state["model"]), "--part", String(p["name"]), "--stock"], "drawing the stock detail", func(r: Dictionary):
		if not r.get("ok", false):
			return
		_list_parts())

func _clear_part() -> void:
	if tw == 0:
		return
	undo_stack.append(grid.duplicate())
	grid.fill(0)
	dirty = true
	_write_texture(func(): request(_render_still, 0.0))

func _set_part(delta: int) -> void:
	if parts.is_empty():
		return
	var i := posmod(_part_index(String(state["part"])) + delta, parts.size())
	state["part"] = String(parts[i]["name"])
	undo_stack = []
	redo_stack = []
	_load_texture()
	rebuild()
	refocus("part")

func _set_direction(delta: int) -> void:
	state["direction"] = DIRS[posmod(DIRS.find(String(state["direction"])) + delta, DIRS.size())]
	rebuild()
	refocus("facing")
	request(_render_still)

# ------------------------------------------------------------------ the text box
func build_tab(_i: int) -> void:
	var p := part()
	if p.is_empty():
		state_line("Detail · %s · reading the parts" % String(state["title"]), "", 1)
	else:
		state_line("Detail · %s · %s (%s, %s) · %d x %d texels · the front is the middle of the strip, the top its top row" % [String(state["title"]),
			String(p["name"]), String(p.get("material", "")), String(p.get("class", "")), tw, th], "", 2)
	var cy := []
	cy.append({"label": "part", "value": String(state["part"]) if not p.is_empty() else "-", "left": func(): _set_part(-1), "right": func(): _set_part(1),
		"hint": "part · which part's texture is on the bench (its name in the model)"})
	cy.append({"label": "tool", "value": TOOLS[clampi(int(state["tool"]), 0, 3)], "left": func(): state["tool"] = posmod(int(state["tool"]) - 1, 4); rebuild(); refocus("tool"),
		"right": func(): state["tool"] = posmod(int(state["tool"]) + 1, 4); rebuild(); refocus("tool"), "hint": "tool · the pencil (one texel) or a brush of 2, 3 or 4"})
	cy.append({"label": "facing", "value": String(state["direction"]), "left": func(): _set_direction(-1), "right": func(): _set_direction(1),
		"hint": "facing · turn the figure; the texture turns with its part"})
	cy.append({"label": "shade", "value": ("seed" if int(state["shade"]) == SEED else "%+d" % int(state["shade"])), "left": func(): _step_shade(-1), "right": func(): _step_shade(1),
		"hint": "shade · the step the brush paints, from three down to three up the material's ramp; seed starts a blood run"})
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 14
	c.setup(cy, maxi(cy.size(), 1), app)
	c.row_h = 13
	c.custom_minimum_size = Vector2(0, 13)
	add_extra(c)
	add_spacer()
	add_choices([
		{"label": "Stock", "cb": _stock_part, "hint": "Stock · this part's texture from its material's stock detail (a brow, folds, grain, wraps, rivets, strands)"},
		{"label": "Clear part", "cb": _clear_part, "hint": "Clear part · an empty texture: the part renders as the flat model"},
		{"label": "Undo", "cb": undo, "hint": "Undo · the last stroke (Ctrl+Z)"},
		{"label": "Choose a model file", "cb": func(): app.choose_file(PackedStringArray(["*.json ; shape models"]), func(path): app.go("detail", {"model": path}), "Choose a shape model"),
			"hint": "Choose a model file · another model's parts on the bench"},
		{"label": "Exit", "cb": func(): app.back(), "hint": "Exit · back to the bench you came from"},
		{"label": "?", "cb": func(): app.show_callouts(), "hint": "? · what each control on this bench does"},
	])
	dim_line("The shade chips under the texture pick the step; the figure on the right redraws after every stroke.")

func _step_shade(delta: int) -> void:
	var order := [SEED, -3, -2, -1, 0, 1, 2, 3]
	var i := order.find(int(state["shade"]))
	state["shade"] = order[posmod((i if i >= 0 else 3) + delta, order.size())]
	rebuild()
	refocus("shade")
	if canvas:
		canvas.queue_redraw()

func on_key(ev: InputEvent) -> bool:
	if ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode == KEY_Z and ev.ctrl_pressed:
			undo()
			return true
		if ev.keycode == KEY_Y and ev.ctrl_pressed:
			redo()
			return true
	return false

func on_drop(paths: PackedStringArray) -> void:
	for q in paths:
		if q.ends_with(".json"):
			app.go("detail", {"model": q})
			return

# ------------------------------------------------------------------ the picture window
func _make_canvas() -> void:
	if app == null or app.pic_layer == null:
		return
	canvas = DetailCanvas.new()
	canvas.bench = self
	canvas.position = Vector2.ZERO
	canvas.size = app.pic_layer.size
	app.pic_layer.add_child(canvas)
	app.scene.clear()

## the colour a texel shows: the material's ramp shade at the middle step moved by the offset; a seed is the darkest
## with a red mark (the run it starts)
func texel_colour(offset: int) -> Color:
	var p := part()
	var ramp: Array = p.get("ramp", []) if not p.is_empty() else []
	if ramp.is_empty():
		var g := 0.5 + offset * 0.12
		return Color(g, g, g, 1.0)
	if offset == SEED:
		return Color("#8a1a1a")
	var mid := (ramp.size() - 1) / 2
	var i := clampi(mid + offset, 0, ramp.size() - 1)
	return Color(String(ramp[i]))

class DetailCanvas:
	extends Control
	const T2 := preload("res://scripts/theme.gd")
	var bench = null
	var zoom := 1
	var origin := Vector2i(8, 20)        # the texture's top-left in the window
	var fig_rect := Rect2()
	var hover := Vector2i(-1, -1)
	var chips: Array = []                # [{"rect": Rect2, "offset": int}]
	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_STOP
		clip_contents = true
	func _layout() -> void:
		var w := size.x * 0.56
		var h := size.y - 44
		if bench.tw > 0 and bench.th > 0:
			zoom = maxi(1, mini(int((w - 16) / bench.tw), int(h / bench.th)))
		origin = Vector2i(8 + int((w - 16 - bench.tw * zoom) / 2), 20 + int((h - bench.th * zoom) / 2))
		fig_rect = Rect2(w + 8, 8, size.x - w - 16, size.y - 16)
	func _draw() -> void:
		_layout()
		draw_rect(Rect2(Vector2.ZERO, size), T2.WELL)
		var f := T2.font("text")
		if bench.tw == 0:
			draw_string(f, Vector2(12, 24), "reading the part", HORIZONTAL_ALIGNMENT_LEFT, -1, T2.SMALL_SIZE, T2.DIM)
		else:
			# the unwrapped texture
			for y in bench.th:
				for x in bench.tw:
					var v: int = bench.grid[y * bench.tw + x]
					var r := Rect2(origin.x + x * zoom, origin.y + y * zoom, zoom, zoom)
					draw_rect(r, bench.texel_colour(v))
					if v == DetailCanvas.SEEDV and zoom >= 3:
						draw_rect(Rect2(r.position + Vector2(zoom / 2.0 - 1, zoom / 2.0 - 1), Vector2(2, 2)), Color("#e03030"))
			if zoom >= 6:
				for x in range(0, bench.tw + 1):
					draw_rect(Rect2(origin.x + x * zoom, origin.y, 1, bench.th * zoom), Color(0, 0, 0, 0.18))
				for y in range(0, bench.th + 1):
					draw_rect(Rect2(origin.x, origin.y + y * zoom, bench.tw * zoom, 1), Color(0, 0, 0, 0.18))
			# the front line and the labels
			var fx := origin.x + int(bench.tw * zoom / 2)
			draw_rect(Rect2(fx, origin.y - 4, 1, bench.th * zoom + 8), Color(T2.GOLD, 0.6))
			draw_string(f, Vector2(fx - 12, origin.y - 6), "front", HORIZONTAL_ALIGNMENT_LEFT, -1, T2.SMALL_SIZE, T2.DIM)
			draw_string(f, Vector2(origin.x, origin.y - 6), "back", HORIZONTAL_ALIGNMENT_LEFT, -1, T2.SMALL_SIZE, T2.DIM)
			draw_string(f, Vector2(origin.x + bench.tw * zoom - 24, origin.y - 6), "back", HORIZONTAL_ALIGNMENT_LEFT, -1, T2.SMALL_SIZE, T2.DIM)
			draw_string(f, Vector2(origin.x, origin.y + bench.th * zoom + 11), "top is the top row; the hem the last", HORIZONTAL_ALIGNMENT_LEFT, -1, T2.SMALL_SIZE, T2.DIM)
			# the hover footprint
			if hover.x >= 0:
				for i in bench.footprint(hover.x, hover.y, bench.tool_size(), bench.tw, bench.th):
					var hx: int = i % bench.tw
					var hy: int = i / bench.tw
					draw_rect(Rect2(origin.x + hx * zoom, origin.y + hy * zoom, zoom, zoom), Color(1, 1, 1, 0.25))
			# the shade chips
			chips = []
			var cx: int = origin.x
			var cy: int = origin.y + bench.th * zoom + 16
			for off in [DetailCanvas.SEEDV, -3, -2, -1, 0, 1, 2, 3]:
				var r := Rect2(cx, cy, 14, 12)
				draw_rect(r, bench.texel_colour(off))
				if off == int(bench.state["shade"]):
					draw_rect(Rect2(r.position - Vector2(1, 1), r.size + Vector2(2, 2)), T2.GOLD, false, 1.0)
				chips.append({"rect": r, "offset": off})
				cx += 18
			draw_string(f, Vector2(cx + 4, cy + 10), "shades: seed, -3 .. +3", HORIZONTAL_ALIGNMENT_LEFT, -1, T2.SMALL_SIZE, T2.DIM)
		# the figure
		draw_rect(Rect2(fig_rect.position.x - 1, 0, 1, size.y), T2.RULE)
		if bench.still_tex:
			var tsz: Vector2 = bench.still_tex.get_size()
			var k := maxf(0.25, minf(floorf(fig_rect.size.x / tsz.x), floorf(fig_rect.size.y / tsz.y)))
			if k < 1.0:
				k = minf(fig_rect.size.x / tsz.x, fig_rect.size.y / tsz.y)
			var dsz: Vector2 = tsz * k
			var at: Vector2 = fig_rect.position + (fig_rect.size - dsz) / 2.0
			draw_texture_rect(bench.still_tex, Rect2(at.floor(), dsz.floor()), false)
		draw_string(f, Vector2(fig_rect.position.x + 4, 14), "facing %s" % String(bench.state["direction"]), HORIZONTAL_ALIGNMENT_LEFT, -1, T2.SMALL_SIZE, T2.DIM)
	const SEEDV := -4
	func _texel(pos: Vector2) -> Vector2i:
		if bench.tw == 0:
			return Vector2i(-1, -1)
		var x := int(floor((pos.x - origin.x) / zoom))
		var y := int(floor((pos.y - origin.y) / zoom))
		if x < 0 or y < 0 or x >= bench.tw or y >= bench.th:
			return Vector2i(-1, -1)
		return Vector2i(x, y)
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseButton:
			if ev.pressed and (ev.button_index == MOUSE_BUTTON_LEFT or ev.button_index == MOUSE_BUTTON_RIGHT):
				for ch in chips:
					if (ch["rect"] as Rect2).has_point(ev.position):
						bench.state["shade"] = int(ch["offset"])
						bench.rebuild()
						queue_redraw()
						return
				var t := _texel(ev.position)
				if t.x >= 0:
					bench.stroke_begin()
					bench.paint_at(t.x, t.y, ev.button_index == MOUSE_BUTTON_RIGHT)
			elif not ev.pressed and bench.painting:
				bench.stroke_end()
		elif ev is InputEventMouseMotion:
			var t := _texel(ev.position)
			if t != hover:
				hover = t
				queue_redraw()
			if bench.painting and t.x >= 0:
				bench.paint_at(t.x, t.y, (ev.button_mask & MOUSE_BUTTON_MASK_RIGHT) != 0)
