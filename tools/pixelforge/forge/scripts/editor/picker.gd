extends Control
const T := preload("res://scripts/theme.gd")
const W := preload("res://scripts/widgets.gd")
const Pal := preload("res://scripts/editor/palette.gd")
## scripts/editor/picker.gd: the colour picker in the text box. A pixel-drawn hue x lightness field (OK-HSL at the
## saturation lever's value), a saturation lever, the hex line, the sprite's palette as swatches (the current slot
## framed), and the words for the colour under the pointer: slot, hex, OKLab. Clicks pick; the lock decides what is
## painted. A selector group of one item (the field) so the arrow keys still have somewhere to stand.

const FIELD_W := 72
const FIELD_H := 36
const ZOOM := 2
const CELL := 12

var editor = null
var app: Node = null
var sat := 0.6
var sat_lever: W.Lever
var hex: LineEdit
var hover_words := ""
var active := false
var _field_cache := {}
var swatch_x := 0
var swatch_cols := 1

func setup(ed, a: Node) -> void:
	editor = ed
	app = a
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = Vector2(0, FIELD_H * ZOOM + 16)
	var c: Color = editor.colour
	sat = clampf(c.ok_hsl_s, 0.05, 1.0) if c.ok_hsl_s > 0.02 else 0.6
	sat_lever = W.Lever.new()
	sat_lever.init("saturation", sat, 0.6, func(v): return "%d%%" % int(round(v * 100)), func(v): sat = v; queue_redraw(), Callable())
	sat_lever.app = a
	sat_lever.position = Vector2(FIELD_W * ZOOM + 10, 0)
	add_child(sat_lever)
	hex = LineEdit.new()
	hex.text = Pal.hex(editor.colour)
	hex.max_length = 7
	hex.position = Vector2(FIELD_W * ZOOM + 72, 2)
	hex.size = Vector2(72, 18)
	hex.text_submitted.connect(func(t: String):
		if Color.html_is_valid(t):
			editor.set_colour(Color.html(t))
			hex.text = Pal.hex(editor.colour)
		else:
			app.say("Not a colour: " + t)
		hex.release_focus())
	hex.focus_entered.connect(func(): if app: app.say_hint("type a hex colour and press Enter; Esc leaves the line"))
	add_child(hex)
	editor.hex_edit = hex
	swatch_x = FIELD_W * ZOOM + 72
	resized.connect(func(): swatch_cols = maxi(int((size.x - swatch_x) / (CELL + 1)), 1))
	swatch_cols = maxi(int((580 - swatch_x) / (CELL + 1)), 1)

func item_count() -> int:
	return 1

func columns() -> int:
	return 1

func item_rect(_i: int) -> Rect2:
	return Rect2(position + Vector2(0, FIELD_H * ZOOM / 2.0 - 7), Vector2(FIELD_W * ZOOM, 14))

func set_sel(_i: int) -> void:
	pass

func set_active(on: bool) -> void:
	active = on
	queue_redraw()

func activate(_i: int) -> void:
	hex.grab_focus()

func step(_delta: int, _dir: String) -> bool:
	return false

func index_of(_label: String) -> int:
	return -1

func _field() -> Texture2D:
	var q := int(round(sat * 20.0))
	if _field_cache.has(q):
		return _field_cache[q]
	var img := Image.create_empty(FIELD_W, FIELD_H, false, Image.FORMAT_RGBA8)
	for y in FIELD_H:
		for x in FIELD_W:
			img.set_pixel(x, y, Color.from_ok_hsl(float(x) / FIELD_W, q / 20.0, 0.96 - 0.92 * float(y) / (FIELD_H - 1), 1.0))
	var tex := ImageTexture.create_from_image(img)
	_field_cache[q] = tex
	return tex

func _swatch_rect(i: int) -> Rect2:
	var row := i / swatch_cols
	var col := i % swatch_cols
	return Rect2(swatch_x + col * (CELL + 1), 24 + row * (CELL + 1), CELL, CELL)

func _draw() -> void:
	var f := T.font("text")
	var c: Color = editor.colour
	draw_texture_rect(_field(), Rect2(0, 0, FIELD_W * ZOOM, FIELD_H * ZOOM), false)
	draw_rect(Rect2(-1, -1, FIELD_W * ZOOM + 2, FIELD_H * ZOOM + 2), T.ACCENT if active else T.FRAME2, false, 1.0)
	# the current colour's place in the field
	var mx := c.ok_hsl_h * FIELD_W * ZOOM
	var my := (0.96 - c.ok_hsl_l) / 0.92 * (FIELD_H - 1) * ZOOM
	draw_rect(Rect2(mx - 3, my - 3, 7, 7), T.BLACK, false, 1.0)
	draw_rect(Rect2(mx - 2, my - 2, 5, 5), Color.WHITE, false, 1.0)
	# the two colours, under the hex line
	var cx := FIELD_W * ZOOM + 72
	draw_rect(Rect2(cx, 24, 20, 14), c)
	draw_rect(Rect2(cx, 24, 20, 14), T.BLACK, false, 1.0)
	draw_rect(Rect2(cx + 22, 24, 12, 14), editor.colour2)
	draw_rect(Rect2(cx + 22, 24, 12, 14), T.BLACK, false, 1.0)
	draw_string(f, Vector2(cx + 38, 35), "X swaps", HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.BONE)
	# the palette's swatches, from under the two colours
	var pal: Pal = editor.doc.palette
	var cur := pal.slot_of(c)
	for i in pal.size():
		var r := _swatch_rect(i)
		r.position.y += 18
		draw_rect(r, pal.colours[i])
		if i == cur:
			draw_rect(r.grow(1), T.GH, false, 1.0)
		elif i >= pal.source_count:
			draw_rect(r.grow(0), T.GOLD, false, 1.0)
	# the words: slot, hex, OKLab, the lock
	var words := hover_words
	if words == "":
		words = "%s · %s · %s · %s%s" % [("slot %d" % cur) if cur >= 0 else "not in the palette", Pal.hex(c), Pal.oklab_text(c), pal.mode,
			(" · %d added" % pal.added) if pal.added > 0 else ""]
	draw_string(f, Vector2(0, FIELD_H * ZOOM + 12), words, HORIZONTAL_ALIGNMENT_LEFT, size.x, T.SMALL_SIZE, T.BONE)

func _at(p: Vector2) -> Color:
	var h := clampf(p.x / (FIELD_W * ZOOM), 0.0, 0.999)
	var l := clampf(0.96 - 0.92 * p.y / ((FIELD_H - 1) * ZOOM), 0.04, 0.96)
	return Color.from_ok_hsl(h, sat, l, 1.0)

func _swatch_at(p: Vector2) -> int:
	var pal: Pal = editor.doc.palette
	for i in pal.size():
		var r := _swatch_rect(i)
		r.position.y += 18
		if r.has_point(p):
			return i
	return -1

var dragging := false

func _gui_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
		if ev.pressed:
			if app:
				app.focus_on(self, 0, false)
			if Rect2(0, 0, FIELD_W * ZOOM, FIELD_H * ZOOM).has_point(ev.position):
				dragging = true
				editor.set_colour(_at(ev.position))
				hex.text = Pal.hex(editor.colour)
				queue_redraw()
				if app:
					app.audio.blip("ratchet")
				return
			var s := _swatch_at(ev.position)
			if s >= 0:
				editor.set_colour(editor.doc.palette.colours[s])
				hex.text = Pal.hex(editor.colour)
				queue_redraw()
				if app:
					app.audio.blip("ratchet")
		else:
			dragging = false
	elif ev is InputEventMouseMotion:
		if dragging and Rect2(0, 0, FIELD_W * ZOOM, FIELD_H * ZOOM).has_point(ev.position):
			editor.set_colour(_at(ev.position))
			hex.text = Pal.hex(editor.colour)
			queue_redraw()
			return
		var s := _swatch_at(ev.position)
		var pal: Pal = editor.doc.palette
		if s >= 0:
			hover_words = "slot %d · %s · %s" % [s, Pal.hex(pal.colours[s]), Pal.oklab_text(pal.colours[s])]
		elif Rect2(0, 0, FIELD_W * ZOOM, FIELD_H * ZOOM).has_point(ev.position):
			var c := _at(ev.position)
			var r := pal.resolve(c) if pal.mode == Pal.LOCKED else {"snapped": false}
			hover_words = "%s · %s%s" % [Pal.hex(c), Pal.oklab_text(c), (" · snaps to slot %d" % int(r["slot"])) if bool(r["snapped"]) else ""]
		else:
			hover_words = ""
		queue_redraw()
