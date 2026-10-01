extends RefCounted
const FT := preload("res://scripts/theme.gd")
const FSfx := preload("res://scripts/sfx.gd")
## scripts/widgets.gd: the small set of controls every screen is built from. Labels in the game's faces, carved
## buttons, home tiles with a picture, the progress strip, a drop zone, a card for a stopped step, the Advanced fold
## with a parameter table, and a strip player for effect sheets.

static func label(text: String, variation: String = "", align: int = HORIZONTAL_ALIGNMENT_LEFT, wrap: bool = false) -> Label:
	var l := Label.new()
	l.text = text
	if variation != "":
		l.theme_type_variation = variation
	l.horizontal_alignment = align
	if wrap:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

static func title(text: String) -> Label:
	return label(text, "Title")

static func button(text: String, variation: String = "", on_pressed: Callable = Callable()) -> Button:
	var b := Button.new()
	b.text = text
	if variation != "":
		b.theme_type_variation = variation
	b.focus_mode = Control.FOCUS_ALL
	if on_pressed.is_valid():
		b.pressed.connect(func(): FSfx.play("press"); on_pressed.call())
	else:
		b.pressed.connect(func(): FSfx.play("press"))
	b.mouse_entered.connect(func(): FSfx.play("hover"))
	b.focus_entered.connect(func(): FSfx.play("hover", 0.5))
	return b

static func primary(text: String, on_pressed: Callable = Callable()) -> Button:
	var b := button(text, "Primary", on_pressed)
	b.custom_minimum_size = Vector2(0, 26)
	return b

static func ghost(text: String, on_pressed: Callable = Callable()) -> Button:
	return button(text, "Ghost", on_pressed)

static func chip(text: String, on: bool = false, on_pressed: Callable = Callable()) -> Button:
	var b := button(text, "ChipOn" if on else "Chip", on_pressed)
	b.focus_mode = Control.FOCUS_NONE if not on_pressed.is_valid() else Control.FOCUS_ALL
	return b

static func row(sep: int = 6) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	return h

static func col(sep: int = 6) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	return v

static func spacer(expand: bool = true, size: float = 0.0) -> Control:
	var c := Control.new()
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if expand:
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	else:
		c.custom_minimum_size = Vector2(size, size)
	return c

static func panel(variation: String = "", child: Control = null) -> PanelContainer:
	var p := PanelContainer.new()
	if variation != "":
		p.theme_type_variation = variation
	if child:
		p.add_child(child)
	return p

static func margin(child: Control, m: int = 8) -> MarginContainer:
	var mc := MarginContainer.new()
	mc.add_theme_constant_override("margin_left", m)
	mc.add_theme_constant_override("margin_right", m)
	mc.add_theme_constant_override("margin_top", m)
	mc.add_theme_constant_override("margin_bottom", m)
	mc.add_child(child)
	return mc

## an engraved rule (uikit.rule): a dark line with a lit line under it and a diamond at each end
static func rule(color: Color = FT.IRON_L) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, 5)
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.draw.connect(func():
		var w := c.size.x
		c.draw_rect(Rect2(2, 2, w - 4, 1), FT.SEAM)
		c.draw_rect(Rect2(2, 3, w - 4, 1), Color(color, 0.5))
		c.draw_rect(Rect2(0, 1, 3, 3), color)
		c.draw_rect(Rect2(w - 3, 1, 3, 3), color))
	return c

## a picture that keeps its pixels square: nearest filter, integer zoom when it fits, else shrunk to fit
static func picture(t: Texture2D, min_size: Vector2 = Vector2(0, 0)) -> TextureRect:
	var tr := TextureRect.new()
	tr.texture = t
	tr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.custom_minimum_size = min_size
	tr.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tr.size_flags_vertical = Control.SIZE_EXPAND_FILL
	tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return tr

## a home tile: the picture above, the name below, one line of what it does under that
static func tile(name: String, line: String, pic: Texture2D, on_pressed: Callable) -> Button:
	var b := button("", "Tile", on_pressed)
	b.custom_minimum_size = Vector2(196, 86)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var v := col(2)
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 6
	v.offset_right = -6
	v.offset_top = 5
	v.offset_bottom = -5
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var p := picture(pic)
	p.custom_minimum_size = Vector2(0, 46)
	v.add_child(p)
	var nl := label(name, "Pixel", HORIZONTAL_ALIGNMENT_CENTER)
	v.add_child(nl)
	var ll := label(line, "Small", HORIZONTAL_ALIGNMENT_CENTER)
	ll.add_theme_font_override("font", FT.font("italic"))
	v.add_child(ll)
	b.add_child(v)
	return b

## a choice with a swatch or picture and a name, for shapes, looks and kinds
static func pick(name: String, pic: Texture2D, on_pressed: Callable, size: Vector2 = Vector2(92, 64)) -> Button:
	var b := button("", "Pick", on_pressed)
	b.custom_minimum_size = size
	var v := col(2)
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	v.offset_left = 4
	v.offset_right = -4
	v.offset_top = 4
	v.offset_bottom = -4
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var p := picture(pic)
	v.add_child(p)
	v.add_child(label(name, "Pixel", HORIZONTAL_ALIGNMENT_CENTER))
	b.add_child(v)
	return b

## a swatch texture from a dark->bright ramp
static func ramp_tex(colors: Array, w: int = 40, h: int = 12) -> Texture2D:
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(FT.SEAM)
	var n := colors.size()
	for i in n:
		var x0 := 1 + int(float(i) * (w - 2) / n)
		var x1 := 1 + int(float(i + 1) * (w - 2) / n)
		img.fill_rect(Rect2i(x0, 1, x1 - x0, h - 2), Color(str(colors[i])))
	return ImageTexture.create_from_image(img)

## the progress strip: one chip per step; done = bone with a tick, current = teal, ahead = dim
static func strip(steps: Array, current: int, done: Array, on_pick: Callable = Callable()) -> HBoxContainer:
	var h := row(2)
	h.alignment = BoxContainer.ALIGNMENT_CENTER
	for i in steps.size():
		var is_done: bool = i in done
		var b := chip(("· " if is_done else "") + str(steps[i]), i == current, (on_pick.bind(i) if (on_pick.is_valid() and (is_done or i <= current)) else Callable()))
		if is_done and i != current:
			b.add_theme_color_override("font_color", FT.TEXT)
		if i > current and not is_done:
			b.add_theme_color_override("font_color", FT.FAINT)
		h.add_child(b)
		if i < steps.size() - 1:
			var dash := label("—", "PixelDim")
			dash.add_theme_color_override("font_color", FT.TEXT if is_done else Color("#2e2a38"))
			h.add_child(dash)
	return h

## the drop zone: a teal-rimmed dark field with the words and a button
static func drop_zone(words: String, button_text: String, on_choose: Callable) -> PanelContainer:
	var p := panel("Drop")
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	p.size_flags_vertical = Control.SIZE_EXPAND_FILL
	var v := col(8)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	var big := label(words, "Big", HORIZONTAL_ALIGNMENT_CENTER, true)
	big.add_theme_color_override("font_color", FT.TEAL_L)
	v.add_child(big)
	v.add_child(label("or", "Italic", HORIZONTAL_ALIGNMENT_CENTER))
	var b := primary(button_text, on_choose)
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(b)
	p.add_child(v)
	return p

## a card for a stopped step: the plain reason in gold, and the buttons that fix it
static func card(headline: String, reason: String, buttons: Array) -> PanelContainer:
	var p := panel("Card")
	var v := col(6)
	var h := label(headline, "Gold")
	h.add_theme_font_override("font", FT.font("sc"))
	h.add_theme_font_size_override("font_size", 12)
	v.add_child(h)
	var r := label(reason, "", HORIZONTAL_ALIGNMENT_LEFT, true)
	v.add_child(r)
	var br := HFlowContainer.new()
	br.add_theme_constant_override("h_separation", 6)
	br.add_theme_constant_override("v_separation", 4)
	for b in buttons:
		br.add_child(b)
	v.add_child(br)
	p.add_child(v)
	return p

## a fold: a header button that shows or hides its content (closed by default)
class Fold:
	extends VBoxContainer
	var head: Button
	var body: VBoxContainer
	var plate: PanelContainer
	var open := false
	var title := ""
	func set_open(o: bool) -> void:
		open = o
		head.text = ("▾ " if o else "▸ ") + title
		body.visible = o
		plate.visible = o

static func fold(title: String) -> Fold:
	var f := Fold.new()
	f.title = title
	f.add_theme_constant_override("separation", 2)
	f.head = ghost("", func(): f.set_open(not f.open))
	f.head.alignment = HORIZONTAL_ALIGNMENT_LEFT
	f.add_child(f.head)
	f.body = col(3)
	f.plate = panel("Plate", f.body)
	f.add_child(f.plate)
	f.set_open(false)
	return f

## a parameter table for the Advanced fold. spec: [{key, label, type: float|int|text|bool|choice, default, choices, hint}]
## values live in `values` (filled with the defaults first); the control writes back on change.
static func params(spec: Array, values: Dictionary) -> VBoxContainer:
	var v := col(2)
	for s in spec:
		var key: String = s["key"]
		if not values.has(key):
			values[key] = s.get("default", "")
		var r := row(6)
		var l := label(String(s.get("label", key)), "Small")
		l.custom_minimum_size = Vector2(118, 0)
		r.add_child(l)
		var tp: String = s.get("type", "text")
		if tp == "bool":
			var cb := CheckBox.new()
			cb.button_pressed = bool(values[key])
			cb.text = ""
			cb.toggled.connect(func(on): values[key] = on; FSfx.play("tick"))
			r.add_child(cb)
		elif tp == "choice":
			var hr := row(2)
			var choices: Array = s.get("choices", [])
			var labels: Array = s.get("labels", choices)
			var btns: Array = []
			for ci in choices.size():
				var c = choices[ci]
				var b := chip(str(labels[ci]), str(values[key]) == str(c))
				b.focus_mode = Control.FOCUS_ALL
				btns.append(b)
				b.pressed.connect(func():
					values[key] = c
					for k in btns.size():
						btns[k].theme_type_variation = "ChipOn" if str(choices[k]) == str(c) else "Chip")
				hr.add_child(b)
			r.add_child(hr)
		else:
			var le := LineEdit.new()
			le.text = str(values[key])
			le.custom_minimum_size = Vector2(64, 0)
			le.text_changed.connect(func(t):
				if tp == "float":
					values[key] = float(t) if t.is_valid_float() else s.get("default", 0.0)
				elif tp == "int":
					values[key] = int(t) if t.is_valid_int() else s.get("default", 0)
				else:
					values[key] = t)
			r.add_child(le)
		if s.has("hint"):
			var hl := label(String(s["hint"]), "Small", HORIZONTAL_ALIGNMENT_LEFT, true)
			hl.add_theme_font_override("font", FT.font("italic"))
			r.add_child(hl)
		v.add_child(r)
	return v

## plays an effect sheet made by `pixelforge vfx` / `spell`: the PNG strip and its JSON (frame_width, frames, fps)
class Strip:
	extends Control
	var tex: Texture2D
	var frames := 1
	var fw := 0
	var fh := 0
	var fps := 10.0
	var loop := true
	var rows := 1
	var t := 0.0
	var zoom := 0            # 0 = as big as fits (whole pixels); else at most this
	var playing := true
	var bg_glow := false
	func load_sheet(png: String, meta: Dictionary) -> bool:
		tex = FT.tex(png, false)
		if tex == null:
			return false
		frames = int(meta.get("frames", 1))
		fw = int(meta.get("frame_width", tex.get_width() / maxi(frames, 1)))
		fh = int(meta.get("frame_height", meta.get("size", [fw, tex.get_height()])[1]))
		fps = float(meta.get("fps", 10.0))
		loop = bool(meta.get("loop", true))
		rows = int(meta.get("rotations", 1))
		t = 0.0
		queue_redraw()
		return true
	func _process(dt: float) -> void:
		if playing and tex:
			t += dt
			queue_redraw()
	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), Color("#040408"))
		if tex == null:
			return
		var n := frames
		var i := 0
		if fps > 0.0:
			var k := int(t * fps)
			if loop:
				i = k % maxi(n, 1)
			else:
				i = k % maxi(n + int(fps * 0.6), 1)   # a pause after a one-shot
				if i >= n:
					i = -1
		var z := minf(size.x / maxf(fw, 1), size.y / maxf(fh, 1))
		if z >= 1.0:
			z = floorf(z)
		if zoom > 0:
			z = minf(z, float(zoom))
		var dst := Rect2(((size - Vector2(fw, fh) * z) / 2.0).floor(), Vector2(fw, fh) * z)
		if i >= 0:
			var r := 0
			if rows > 1:
				r = int(t * 0.5) % rows   # a missile sheet: show the headings in turn
			draw_texture_rect_region(tex, dst, Rect2(i * fw, r * fh, fw, fh))
		# the frame counter, small, under
		var f := FT.font("pixel")
		draw_string(f, Vector2(2, size.y - 3), "%d frames  %d a second" % [n, int(fps)], HORIZONTAL_ALIGNMENT_LEFT, -1, 8, FT.FAINT)

static func strip_player() -> Strip:
	var s := Strip.new()
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.size_flags_vertical = Control.SIZE_EXPAND_FILL
	s.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return s

## plays a folder of frames (frame_000.png ...), as the pixel frames of a clip are written
class Frames:
	extends Control
	var texs: Array = []
	var fps := 8.0
	var t := 0.0
	var crop := Rect2i()
	var playing := true
	func load_dir(dir: String, rate: float) -> int:
		texs.clear()
		crop = Rect2i()
		fps = rate
		var d := DirAccess.open(dir)
		if d == null:
			queue_redraw()
			return 0
		var names := []
		for f in d.get_files():
			if f.begins_with("frame_") and f.ends_with(".png"):
				names.append(f)
		names.sort()
		for f in names:
			var img := Image.load_from_file(dir.path_join(f))
			if img:
				var used := img.get_used_rect()
				crop = used if crop.size == Vector2i.ZERO else crop.merge(used)
				texs.append(ImageTexture.create_from_image(img))
		t = 0.0
		queue_redraw()
		return texs.size()
	func _process(dt: float) -> void:
		if playing and not texs.is_empty():
			t += dt
			queue_redraw()
	func _draw() -> void:
		if texs.is_empty():
			return
		var i := int(t * fps) % texs.size()
		var src := Rect2(crop)
		if src.size.x <= 0:
			src = Rect2(Vector2.ZERO, texs[i].get_size())
		var z := minf(size.x / src.size.x, size.y / src.size.y)
		if z >= 1.0:
			z = floorf(z)
		var dst := Rect2(((size - src.size * z) / 2.0).floor(), src.size * z)
		draw_texture_rect_region(texs[i], dst, src)

static func frames_player() -> Frames:
	var s := Frames.new()
	s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	s.size_flags_vertical = Control.SIZE_EXPAND_FILL
	s.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return s

## a scrolling list of lines in the pixel face, for the log drawer
static func log_view() -> TextEdit:
	var te := TextEdit.new()
	te.editable = false
	te.scroll_fit_content_height = false
	te.size_flags_vertical = Control.SIZE_EXPAND_FILL
	te.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	te.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	return te

static func slug(s: String) -> String:
	var out := ""
	for ch in s.to_lower():
		if (ch >= "a" and ch <= "z") or (ch >= "0" and ch <= "9"):
			out += ch
		elif not out.ends_with("_") and out != "":
			out += "_"
	out = out.trim_suffix("_")
	return out if out != "" else "thing"

static func pretty(s: String) -> String:
	return s.replace("_", " ").capitalize()

static func sentence(s: String) -> String:
	return s.substr(0, 1).to_upper() + s.substr(1) if s != "" else s
