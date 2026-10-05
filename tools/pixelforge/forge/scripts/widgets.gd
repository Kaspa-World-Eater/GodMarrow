extends RefCounted
const T := preload("res://scripts/theme.gd")
const PX := preload("res://scripts/px.gd")
## scripts/widgets.gd: the controls the text box is built from, every one drawn as pixels (px.gd). A "group" is
## what the selector moves through: the choices line, the tab row, a rack of controls, the ground picker. Each
## implements item_count / item_rect / set_sel / activate / step, so the app's one selector drives them all.

## a typed number over a control's value: Enter commits, Esc leaves, up and down step (shift: tens)
class NumberEntry:
	extends LineEdit
	var on_commit: Callable
	var step_size := 1.0
	func open(host: Control, rect: Rect2, value: String, commit: Callable, step: float = 1.0) -> void:
		on_commit = commit
		step_size = step
		text = value
		position = rect.position
		size = rect.size
		max_length = 12
		host.add_child(self)
		grab_focus()
		select_all()
		text_submitted.connect(func(t: String): _done(t))
		focus_exited.connect(func(): queue_free())
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventKey and ev.pressed:
			if ev.keycode == KEY_ESCAPE:
				release_focus()
				accept_event()
			elif ev.keycode in [KEY_UP, KEY_DOWN]:
				var n := _num(text)
				n += (step_size if ev.keycode == KEY_UP else -step_size) * (10.0 if ev.shift_pressed else 1.0)
				text = T.fmt(n, 2 if step_size < 1.0 else 0)
				accept_event()
	func _done(t: String) -> void:
		if on_commit.is_valid():
			on_commit.call(_num(t))
		release_focus()
	## the first number in a string ("+3", "x1.20", "12 frames", "50%", "-15 deg")
	static func _num(s: String) -> float:
		var r := RegEx.new()
		r.compile("[-+]?\\d*\\.?\\d+")
		var m := r.search(s)
		return float(m.get_string()) if m else 0.0

## the selector's home: a line of text choices, in a grid of columns (Home) or flowing with the words' widths and
## wrapping (the choices line, the cyclers, the ground picker); the chosen one in the accent colour with the arrow
class Choices:
	extends Control
	var items: Array = []           # [{label, cb} | {label, value, left, right} (a cycler)]
	var cols := 3
	var sel := 0
	var active := false
	var row_h := 16
	var app: Node = null
	var dim_unselected := false
	var font_size := T.TEXT_SIZE
	var arrow_gap := 18
	var flow := false
	var flow_gap := 10
	var wrap_width := 0.0           # flow: wrap to the next row past this width (0 = never)
	var pos: Array = []             # flow: the item positions
	var rows_n := 1
	var drag_start: Callable        # (i, global_pos): an item picked up and carried out of the row
	var drag_move: Callable         # (global_pos)
	var drag_end: Callable          # (global_pos)
	var _press_i := -1
	var _press_at := Vector2.ZERO
	var _dragging := false
	func setup(list: Array, columns: int = 3, a: Node = null) -> void:
		items = list
		cols = maxi(columns, 1)
		app = a
		sel = 0
		mouse_filter = Control.MOUSE_FILTER_STOP
		_layout()
		resized.connect(_layout)
		queue_redraw()
	func text_of(i: int) -> String:
		var it: Dictionary = items[i]
		if it.has("value"):
			return "%s < %s >" % [String(it.get("label", "")), String(it["value"])]
		return String(it.get("label", ""))
	func _layout() -> void:
		pos = []
		if not flow:
			rows_n = ceili(items.size() / float(cols))
			custom_minimum_size = Vector2(0, row_h * rows_n)
			return
		var x := float(arrow_gap)
		var y := 0.0
		var limit := wrap_width if wrap_width > 0 else (size.x if size.x > 0 else 1e9)
		rows_n = 1
		for i in items.size():
			var w := T.text_width(text_of(i), font_size)
			if x + w > limit and x > arrow_gap:
				x = float(arrow_gap)
				y += row_h
				rows_n += 1
			pos.append(Vector2(x, y))
			x += w + arrow_gap + flow_gap
		custom_minimum_size = Vector2(0, row_h * rows_n)
	func flow_width() -> float:
		var w := 0.0
		for i in items.size():
			w += T.text_width(text_of(i), font_size) + arrow_gap + flow_gap
		return w
	func rows() -> int:
		return rows_n
	func item_count() -> int:
		return items.size()
	func columns() -> int:
		return cols
	func _col_w() -> float:
		return floorf(size.x / cols)
	func item_pos(i: int) -> Vector2:
		if flow:
			if pos.size() != items.size():
				_layout()
			return pos[i] if i < pos.size() else Vector2.ZERO
		var cw := _col_w()
		return Vector2((i % cols) * cw + arrow_gap, (i / cols) * row_h)
	func item_rect(i: int) -> Rect2:
		if i < 0 or i >= items.size():
			return Rect2(position, Vector2(10, row_h))
		var p := item_pos(i)
		var w := T.text_width(text_of(i), font_size) if flow else _col_w() - arrow_gap
		return Rect2(position + p, Vector2(w, row_h))
	## the item the selector reaches from i going dir, or -1 to leave the group
	func neighbour(i: int, dir: String) -> int:
		var n := items.size()
		if n == 0:
			return -1
		if dir == "right":
			return i + 1 if i + 1 < n else -1
		if dir == "left":
			return i - 1
		if not flow:
			var j := i + cols if dir == "down" else i - cols
			return j if j >= 0 and j < n else -1
		var p := item_pos(i)
		var best := -1
		var best_d := 1e9
		for k in n:
			var q := item_pos(k)
			if (dir == "down" and q.y > p.y + 0.5) or (dir == "up" and q.y < p.y - 0.5):
				var d := absf(q.x - p.x) + absf(q.y - p.y) * 0.01
				if d < best_d:
					best_d = d
					best = k
		return best
	func set_sel(i: int) -> void:
		sel = clampi(i, 0, maxi(items.size() - 1, 0))
		queue_redraw()
	func set_active(on: bool) -> void:
		active = on
		queue_redraw()
	func activate(i: int) -> void:
		if i >= 0 and i < items.size():
			var it: Dictionary = items[i]
			var cb: Callable = it.get("cb", Callable())
			if cb.is_valid():
				cb.call()
			elif it.has("set") and (it["set"] as Callable).is_valid():
				edit_value(i)
			elif it.has("right") and (it["right"] as Callable).is_valid():
				(it["right"] as Callable).call()
	## a cycler's value, typed: a number entry over the value's words
	func edit_value(i: int) -> void:
		var it: Dictionary = items[i]
		if not it.has("set"):
			return
		var p := item_pos(i)
		var lab := String(it.get("label", "")) + " "
		var lw := T.text_width(lab, font_size)
		var e := NumberEntry.new()
		e.open(self, Rect2(p.x + lw, p.y - 1, maxf(T.text_width("< %s >" % String(it["value"]), font_size), 40), row_h + 2), String(it["value"]), func(n): (it["set"] as Callable).call(str(n)))
	## a cycler item ({label, value, left, right}) takes left and right; the others pass
	func step(_delta: int, dir: String) -> bool:
		if sel < 0 or sel >= items.size():
			return false
		var it: Dictionary = items[sel]
		if dir == "right" and it.has("right") and (it["right"] as Callable).is_valid():
			(it["right"] as Callable).call()
			if app:
				app.audio.blip("ratchet")
			return true
		if dir == "left" and it.has("left") and (it["left"] as Callable).is_valid():
			(it["left"] as Callable).call()
			if app:
				app.audio.blip("ratchet")
			return true
		return false
	func label_of(i: int) -> String:
		return String(items[i].get("label", "")) if i >= 0 and i < items.size() else ""
	func index_of(label: String) -> int:
		for i in items.size():
			if String(items[i].get("label", "")).to_lower() == label.to_lower():
				return i
		return -1
	func _draw() -> void:
		var f := T.font("text")
		for i in items.size():
			var p := item_pos(i)
			var on := active and i == sel
			var it: Dictionary = items[i]
			var c := T.ACCENT if on else (T.FRAME if (dim_unselected and it.get("dim", false)) or it.get("dim", false) else T.BONE)
			var y := p.y + (13 if font_size >= T.TEXT_SIZE else 11)
			if it.has("value"):
				var lab := String(it.get("label", "")) + " "
				draw_string(f, Vector2(p.x, y), lab, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, T.FRAME)
				var lw := T.text_width(lab, font_size)
				draw_string(f, Vector2(p.x + lw, y), "< %s >" % String(it["value"]), HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, T.ACCENT if on else T.BONE)
			else:
				draw_string(f, Vector2(p.x, y), String(it["label"]), HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, c)
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseMotion:
			if _press_i >= 0 and drag_start.is_valid():
				if not _dragging and ev.position.distance_to(_press_at) > 4.0:
					_dragging = true
					drag_start.call(_press_i, get_global_mouse_position())
				if _dragging and drag_move.is_valid():
					drag_move.call(get_global_mouse_position())
				return
			var i := _hit(ev.position)
			if i >= 0 and (i != sel or not active) and app:
				app.focus_on(self, i, true)
		elif ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
			if ev.pressed:
				var i := _hit(ev.position)
				if i < 0:
					return
				if drag_start.is_valid():
					_press_i = i
					_press_at = ev.position
					_dragging = false
					if app:
						app.focus_on(self, i, false)
					return
				if items[i].has("set") and _on_value(i, ev.position):
					if app:
						app.focus_on(self, i, false)
					edit_value(i)
					return
				if app:
					app.focus_on(self, i, false)
					app.select_current()
			else:
				if _press_i >= 0:
					var was := _dragging
					var i := _press_i
					_press_i = -1
					_dragging = false
					if was:
						if drag_end.is_valid():
							drag_end.call(get_global_mouse_position())
					elif app:
						app.focus_on(self, i, false)
						app.select_current()
	## the click landed on a cycler's value (the "< v >" part), not its name
	func _on_value(i: int, p: Vector2) -> bool:
		var it: Dictionary = items[i]
		if not it.has("value"):
			return false
		var q := item_pos(i)
		var lw := T.text_width(String(it.get("label", "")) + " ", font_size)
		return p.x >= q.x + lw
	func _hit(p: Vector2) -> int:
		for i in items.size():
			var q := item_pos(i)
			var w := T.text_width(text_of(i), font_size) if flow else minf(T.text_width(text_of(i), font_size) + 4, _col_w() - arrow_gap)
			if p.x >= q.x - 2 and p.x <= q.x + w + 2 and p.y >= q.y and p.y < q.y + row_h:
				return i
		return -1

## a line (or a few) of text at a fixed pixel height per line: 15 px for the text face, 12 for the small one
class PxText:
	extends Control
	var text := ""
	var colour := T.BONE
	var font_size := T.TEXT_SIZE
	var max_lines := 1
	var line_h := 15
	func init(t: String, c: Color = T.BONE, lines: int = 1, size_: int = T.TEXT_SIZE) -> void:
		text = t
		colour = c
		max_lines = maxi(lines, 1)
		font_size = size_
		line_h = 15 if size_ >= T.TEXT_SIZE else 12
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		custom_minimum_size = Vector2(0, line_h * max_lines)
		queue_redraw()
	func set_text(t: String) -> void:
		text = t
		queue_redraw()
	## the words wrapped to the width, at most max_lines; a "\n" in the text starts a new line
	func _wrap() -> PackedStringArray:
		if max_lines <= 1:
			return PackedStringArray([text.split("\n")[0]])
		var out: PackedStringArray = []
		for para in text.split("\n"):
			if out.size() >= max_lines:
				break
			var line := ""
			for word in para.split(" "):
				var trial := word if line == "" else line + " " + word
				if T.text_width(trial, font_size) > size.x and line != "":
					out.append(line)
					line = word
					if out.size() >= max_lines:
						break
				else:
					line = trial
			if out.size() < max_lines and line != "":
				out.append(line)
		return out
	func _draw() -> void:
		var f := T.font("text")
		var lines := _wrap()
		for i in lines.size():
			draw_string(f, Vector2(0, i * line_h + (12 if font_size >= T.TEXT_SIZE else 10)), lines[i], HORIZONTAL_ALIGNMENT_LEFT, size.x, font_size, colour)

## the tab names along the text box's top edge; LB/RB move through them
class Tabs:
	extends Control
	var names: PackedStringArray = []
	var current := 0
	var active := false
	var app: Node = null
	var on_pick: Callable
	var xs: PackedFloat32Array = []
	func setup(list: PackedStringArray, cur: int, a: Node, cb: Callable) -> void:
		names = list
		current = cur
		app = a
		on_pick = cb
		mouse_filter = Control.MOUSE_FILTER_STOP
		_layout()
		queue_redraw()
	func _layout() -> void:
		xs = []
		var f := T.font("text")
		var total := 0.0
		var widths: PackedFloat32Array = []
		for n in names:
			var w := f.get_string_size(n, HORIZONTAL_ALIGNMENT_LEFT, -1, T.TEXT_SIZE).x
			widths.append(w)
			total += w
		total += maxi(names.size() - 1, 0) * 22
		var x := floorf((size.x - total) / 2.0)
		for i in names.size():
			xs.append(x)
			x += widths[i] + 22
	func item_count() -> int:
		return names.size()
	func columns() -> int:
		return maxi(names.size(), 1)
	func item_rect(i: int) -> Rect2:
		if i < 0 or i >= xs.size():
			return Rect2(position, Vector2(10, size.y))
		return Rect2(position + Vector2(xs[i], 0), Vector2(T.text_width(names[i]), size.y))
	func set_sel(i: int) -> void:
		if i != current and on_pick.is_valid():
			on_pick.call(i)
		current = clampi(i, 0, maxi(names.size() - 1, 0))
		queue_redraw()
	func set_active(on: bool) -> void:
		active = on
		queue_redraw()
	func activate(i: int) -> void:
		set_sel(i)
	func step(_delta: int, _dir: String) -> bool:
		return false
	func _draw() -> void:
		if xs.size() != names.size():
			_layout()
		var f := T.font("text")
		var h := size.y
		for i in names.size():
			var on := i == current
			var w := T.text_width(names[i])
			# the field under the name cuts the rim; the chosen one is a well open to the text box below
			draw_rect(Rect2(xs[i] - 5, 0, w + 10, h), T.WELL if on else T.INK)
			if on:
				draw_rect(Rect2(xs[i] - 6, 0, w + 12, 1), T.BLACK)
				draw_rect(Rect2(xs[i] - 6, 0, 1, h), T.BLACK)
				draw_rect(Rect2(xs[i] + w + 5, 0, 1, h), T.BLACK)
				draw_rect(Rect2(xs[i] - 5, 1, w + 10, 2), T.FRAME2)
				draw_rect(Rect2(xs[i] - 5, 1, 2, h - 1), T.FRAME2)
				draw_rect(Rect2(xs[i] + w + 3, 1, 2, h - 1), T.FRAME2)
			draw_string(f, Vector2(xs[i], h - 3), names[i], HORIZONTAL_ALIGNMENT_LEFT, -1, T.TEXT_SIZE, T.ACCENT if on else T.DIM)
			if i < names.size() - 1:
				draw_rect(Rect2(xs[i] + w + 10, floorf(h / 2.0) - 1, 2, 2), T.FRAME2)
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			for i in names.size():
				if ev.position.x >= xs[i] - 4 and ev.position.x <= xs[i] + T.text_width(names[i]) + 4:
					if app:
						app.focus_on(self, i, false)
					set_sel(i)
					if app:
						app.audio.blip("tab")
					return

## a rack of pixel controls laid in equal columns; each control: name, value under it; the selector moves across
class Rack:
	extends Control
	var controls: Array = []
	var active := false
	var app: Node = null
	var columns_n := 8
	var sel := 0
	func setup(list: Array, a: Node, cols: int = 8) -> void:
		controls = list
		app = a
		columns_n = maxi(cols, 1)
		mouse_filter = Control.MOUSE_FILTER_PASS
		for c in controls:
			add_child(c)
			c.app = a
			c.rack = self
		custom_minimum_size = Vector2(0, 72)
		resized.connect(_layout)
		_layout()
	func _layout() -> void:
		var cw := floorf(size.x / columns_n)
		for i in controls.size():
			var c: Control = controls[i]
			c.position = Vector2((i % columns_n) * cw + floorf((cw - c.size.x) / 2.0), (i / columns_n) * 72)
	func item_count() -> int:
		return controls.size()
	func columns() -> int:
		return columns_n
	func item_rect(i: int) -> Rect2:
		if i < 0 or i >= controls.size():
			return Rect2(position, Vector2(10, 16))
		var c: Control = controls[i]
		return Rect2(position + c.position + Vector2(0, c.size.y - 22), Vector2(c.size.x, 14))
	func set_sel(i: int) -> void:
		sel = clampi(i, 0, maxi(controls.size() - 1, 0))
		for k in controls.size():
			controls[k].set_hot(active and k == sel)
	func set_active(on: bool) -> void:
		active = on
		for k in controls.size():
			controls[k].set_hot(active and k == sel)
	func activate(i: int) -> void:
		if i >= 0 and i < controls.size():
			controls[i].activate()
	## the selector is on a control: up/down (left/right for a wheel) turn it
	func step(delta: int, dir: String) -> bool:
		if sel >= 0 and sel < controls.size():
			return controls[sel].step(delta, dir)
		return false
	func by_name(n: String) -> Control:
		for c in controls:
			if c.label.to_lower() == n.to_lower():
				return c
		return null

## the base of a pixel control: a texture drawn at 2x, a name and a value under it, a value in [0, 1] or an angle
class Knob:
	extends Control
	var label := ""
	var value := 0.5
	var default := 0.5
	var fmt: Callable               # value -> text
	var on_change: Callable         # value -> void (live)
	var on_commit: Callable         # value -> void (at the end of a drag)
	var hot := false
	var app: Node = null
	var rack: Control = null
	var drag_from := Vector2.ZERO
	var drag_value := 0.0
	var dragging := false
	var changed := false
	var last_click := 0
	var zoom := 2
	var tex_size := Vector2(14, 26)
	var hint := ""
	func init(name: String, v: float, def: float, f: Callable, change: Callable, commit: Callable = Callable()) -> void:
		label = name
		value = v
		default = def
		fmt = f
		on_change = change
		on_commit = commit
		mouse_filter = Control.MOUSE_FILTER_STOP
		size = Vector2(maxf(tex_size.x * zoom, 56), tex_size.y * zoom + 20)
		queue_redraw()
	func set_hot(h: bool) -> void:
		hot = h
		queue_redraw()
	func value_text() -> String:
		return String(fmt.call(value)) if fmt.is_valid() else String.num(value, 2)
	func texture() -> Texture2D:
		return PX.lever(value, int(tex_size.x), int(tex_size.y), hot)
	func set_value(v: float, commit: bool = true) -> void:
		var nv := clampf(v, 0.0, 1.0)
		if absf(nv - value) < 1e-6:
			return
		value = nv
		if on_change.is_valid():
			on_change.call(value)
		if commit and on_commit.is_valid():
			on_commit.call(value)
		queue_redraw()
	## what on_commit is given (a Wheel gives its angle in degrees, not the 0..1 value)
	func commit_value():
		return value
	func activate() -> void:
		if app:
			app.say_hint(hint if hint != "" else "up and down turn %s; B leaves it" % label)
	func step(delta: int, dir: String) -> bool:
		if dir in ["up", "down"]:
			set_value(value + 0.05 * delta)
			if app:
				app.audio.blip("scrape", 0.9 + value * 0.3)
			return true
		return false
	func reset() -> void:
		set_value(default)
	func _draw() -> void:
		var tex := texture()
		var ts := tex.get_size() * zoom
		var x := floorf((size.x - ts.x) / 2.0)
		draw_texture_rect(tex, Rect2(x, 0, ts.x, ts.y), false)
		var f := T.font("text")
		var y := ts.y + 8
		draw_string(f, Vector2(0, y), label, HORIZONTAL_ALIGNMENT_CENTER, size.x, T.SMALL_SIZE, T.ACCENT if hot else T.DIM)
		draw_string(f, Vector2(0, y + 10), value_text(), HORIZONTAL_ALIGNMENT_CENTER, size.x, T.SMALL_SIZE, T.ACCENT)
	## the number a typed value means: the control's own words for 0 and 1 give the range, so "+3" or "12 frames" land right
	func set_from_number(n: float) -> void:
		var lo := NumberEntry._num(String(fmt.call(0.0))) if fmt.is_valid() else 0.0
		var hi := NumberEntry._num(String(fmt.call(1.0))) if fmt.is_valid() else 1.0
		if absf(hi - lo) < 1e-9:
			return
		set_value((n - lo) / (hi - lo))
		if app:
			app.audio.blip("ratchet")
	func value_rect() -> Rect2:
		return Rect2(0, tex_size.y * zoom + 10, size.x, 12)
	func typed_step() -> float:
		var lo := NumberEntry._num(String(fmt.call(0.0))) if fmt.is_valid() else 0.0
		var hi := NumberEntry._num(String(fmt.call(1.0))) if fmt.is_valid() else 1.0
		return 0.1 if absf(hi - lo) <= 2.0 else 1.0
	func edit_value() -> void:
		if not fmt.is_valid():
			return
		var e := NumberEntry.new()
		e.open(self, value_rect(), value_text(), set_from_number, typed_step())
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseButton:
			if ev.pressed and ev.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
				step(1 if ev.button_index == MOUSE_BUTTON_WHEEL_UP else -1, "up" if ev.button_index == MOUSE_BUTTON_WHEEL_UP else "down")   # step commits
				accept_event()
				return
			if ev.button_index == MOUSE_BUTTON_LEFT:
				if ev.pressed:
					if value_rect().has_point(ev.position) and fmt.is_valid():
						if app and rack:
							app.focus_on(rack, rack.controls.find(self), false)
						edit_value()
						return
					var now := Time.get_ticks_msec()
					if now - last_click < 350:
						reset()
						dragging = false
						if app:
							app.audio.blip("clunk")
						return
					last_click = now
					dragging = true
					changed = false
					drag_from = ev.position
					drag_value = value
					if app and rack:
						app.focus_on(rack, rack.controls.find(self), false)
				else:
					if dragging and changed and on_commit.is_valid():
						on_commit.call(commit_value())
					dragging = false
		elif ev is InputEventMouseMotion and dragging:
			_drag(ev.position)
	func _drag(p: Vector2) -> void:
		var v := drag_value + (drag_from.y - p.y) / 56.0
		if absf(v - value) >= 0.01:
			changed = true
			var before := value
			set_value(v, false)
			if app and int(before * 20) != int(value * 20):
				app.audio.blip("scrape", 0.85 + value * 0.4)

## an iron lever: drag up and down
class Lever:
	extends Knob
	pass

## a valve wheel: drag round; the value is an angle in degrees (-180..180) kept in `angle`
class Wheel:
	extends Knob
	var angle := 0.0
	var default_angle := 0.0
	var wrap := true
	func init_wheel(name: String, a: float, def: float, f: Callable, change: Callable, commit: Callable = Callable()) -> void:
		tex_size = Vector2(22, 22)
		angle = a
		default_angle = def
		init(name, (a + 180.0) / 360.0, (def + 180.0) / 360.0, f, change, commit)
		size = Vector2(56, 22 * zoom + 28)
	func texture() -> Texture2D:
		return PX.wheel(angle, 22, hot)
	func value_text() -> String:
		return String(fmt.call(angle)) if fmt.is_valid() else "%d" % int(round(angle))
	func commit_value():
		return angle
	func set_angle(a: float, commit: bool = true) -> void:
		var na := a
		if wrap:
			na = fposmod(a + 180.0, 360.0) - 180.0
		else:
			na = clampf(a, -180.0, 180.0)
		if absf(na - angle) < 0.01:
			return
		angle = na
		value = (angle + 180.0) / 360.0
		if on_change.is_valid():
			on_change.call(angle)
		if commit and on_commit.is_valid():
			on_commit.call(angle)
		queue_redraw()
	func step(delta: int, dir: String) -> bool:
		if dir in ["left", "right", "up", "down"]:
			var d := delta if dir in ["right", "up"] else -delta
			if dir in ["left", "right"]:
				d = delta if dir == "right" else -delta
			set_angle(angle + 15.0 * absi(d) * signi(d))
			if app:
				app.audio.blip("ratchet")
			return true
		return false
	func reset() -> void:
		set_angle(default_angle)
	func set_from_number(n: float) -> void:
		set_angle(n)
		if app:
			app.audio.blip("ratchet")
	func value_rect() -> Rect2:
		return Rect2(0, 22 * zoom + 14, size.x, 12)
	func typed_step() -> float:
		return 1.0
	func _draw() -> void:
		var tex := texture()
		var ts := tex.get_size() * zoom
		var x := floorf((size.x - ts.x) / 2.0)
		draw_texture_rect(tex, Rect2(x, 4, ts.x, ts.y), false)
		var f := T.font("text")
		var y := ts.y + 12
		draw_string(f, Vector2(0, y), label, HORIZONTAL_ALIGNMENT_CENTER, size.x, T.SMALL_SIZE, T.ACCENT if hot else T.DIM)
		draw_string(f, Vector2(0, y + 10), value_text(), HORIZONTAL_ALIGNMENT_CENTER, size.x, T.SMALL_SIZE, T.ACCENT)
	func _drag(p: Vector2) -> void:
		var c := Vector2(size.x / 2.0, 4 + 22 * zoom / 2.0)
		var a := rad_to_deg((p - c).angle()) + 90.0
		a = fposmod(a + 180.0, 360.0) - 180.0
		var before := angle
		if (p - c).length() > 6.0:
			changed = true
			set_angle(a, false)
			if app and int(before / 15.0) != int(angle / 15.0):
				app.audio.blip("ratchet")

## a chain pull: on or off; click or A toggles
class Pull:
	extends Knob
	var on := false
	func init_pull(name: String, v: bool, def: bool, change: Callable, commit: Callable = Callable()) -> void:
		tex_size = Vector2(12, 26)
		on = v
		init(name, 1.0 if v else 0.0, 1.0 if def else 0.0, Callable(), change, commit)
		size = Vector2(56, 26 * zoom + 20)
	func texture() -> Texture2D:
		return PX.pull(on, 12, 26, hot)
	func value_text() -> String:
		return "on" if on else "off"
	func set_on(v: bool) -> void:
		if v == on:
			return
		on = v
		value = 1.0 if on else 0.0
		if on_change.is_valid():
			on_change.call(on)
		if on_commit.is_valid():
			on_commit.call(on)
		queue_redraw()
	func activate() -> void:
		set_on(not on)
		if app:
			app.audio.blip("clunk", 1.1 if on else 0.9)
	func step(delta: int, dir: String) -> bool:
		if dir in ["up", "down"]:
			set_on(dir == "down")
			if app:
				app.audio.blip("clunk", 1.1 if on else 0.9)
			return true
		return false
	func reset() -> void:
		set_on(default > 0.5)
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			if app and rack:
				app.focus_on(rack, rack.controls.find(self), false)
			activate()

## the three-stop lever (off / sprite lights only / on): click cycles, up and down step
class Lever3:
	extends Knob
	var stop := 2
	var stops: PackedStringArray = ["off", "sprite only", "on"]
	func init_lever3(name: String, v: int, def: int, names: PackedStringArray, change: Callable) -> void:
		stop = v
		stops = names
		init(name, v / 2.0, def / 2.0, Callable(), change)
	func texture() -> Texture2D:
		return PX.lever3(stop, 14, 26, hot)
	func value_text() -> String:
		return stops[clampi(stop, 0, stops.size() - 1)]
	func set_stop(s: int) -> void:
		var ns := clampi(s, 0, 2)
		if ns == stop:
			return
		stop = ns
		value = stop / 2.0
		if on_change.is_valid():
			on_change.call(stop)
		queue_redraw()
	func activate() -> void:
		set_stop((stop + 2) % 3)
		if app:
			app.audio.blip("scrape", 0.8 + stop * 0.15)
	func step(delta: int, dir: String) -> bool:
		if dir in ["up", "down"]:
			set_stop(stop + (1 if dir == "up" else -1))
			if app:
				app.audio.blip("scrape", 0.8 + stop * 0.15)
			return true
		return false
	func reset() -> void:
		set_stop(int(round(default * 2)))
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			if app and rack:
				app.focus_on(rack, rack.controls.find(self), false)
			activate()

## a plain pixel slider for the Advanced fold: name, track, value; drag or left/right
class PxSlider:
	extends Control
	var label := ""
	var value := 0.0
	var lo := 0.0
	var hi := 1.0
	var default := 0.0
	var places := 2
	var hot := false
	var on_change: Callable          # live, while dragging
	var on_commit: Callable          # at the end of a drag or a step
	var fmt: Callable                # value -> words (else the number)
	var app: Node = null
	var rack: Control = null
	var dragging := false
	var changed := false
	var track_w := 60
	var last_click := 0
	func init(name: String, v: float, l: float, h: float, def: float, p: int, change: Callable) -> void:
		label = name
		value = v
		lo = l
		hi = h
		default = def
		places = p
		on_change = change
		mouse_filter = Control.MOUSE_FILTER_STOP
		size = Vector2(140, 16)
	func frac() -> float:
		return 0.0 if hi == lo else clampf((value - lo) / (hi - lo), 0.0, 1.0)
	func set_hot(h: bool) -> void:
		hot = h
		queue_redraw()
	func set_value(v: float) -> void:
		var nv := clampf(v, lo, hi)
		if places == 0:
			nv = round(nv)
		if absf(nv - value) < 1e-9:
			return
		value = nv
		if on_change.is_valid():
			on_change.call(value)
		queue_redraw()
	func activate() -> void:
		pass
	func step(delta: int, dir: String) -> bool:
		if dir in ["left", "right"]:
			var d := delta if dir == "right" else -delta
			set_value(value + (hi - lo) * 0.02 * d if places > 0 else value + d)
			commit()
			if app:
				app.audio.blip("ratchet")
			return true
		return false
	func commit() -> void:
		if on_commit.is_valid():
			on_commit.call(value)
	func reset() -> void:
		set_value(default)
		commit()
	func value_text() -> String:
		if fmt.is_valid():
			return String(fmt.call(value))
		return T.fmt(value, places)
	func _draw() -> void:
		var f := T.font("text")
		draw_string(f, Vector2(0, 12), label, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT if hot else T.DIM)
		var tex := PX.slider(frac(), track_w, hot)
		draw_texture_rect(tex, Rect2(64, 4, track_w, 7), false)
		draw_string(f, Vector2(64 + track_w + 4, 12), value_text(), HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT)
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed and ev.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
			step(1, "right" if ev.button_index == MOUSE_BUTTON_WHEEL_UP else "left")
			accept_event()
			return
		if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
			if ev.pressed:
				if ev.position.x >= 64 + track_w + 2:
					if app and rack:
						app.focus_on(rack, rack.controls.find(self), false)
					var e := NumberEntry.new()
					e.open(self, Rect2(64 + track_w + 2, -1, maxf(size.x - 64 - track_w - 2, 40), 16), T.fmt(value, places), func(n): set_value(n); commit(), 1.0 if places == 0 else pow(10.0, -places))
					return
				var now := Time.get_ticks_msec()
				if now - last_click < 350:
					reset()
					return
				last_click = now
				dragging = true
				changed = false
				if app and rack:
					app.focus_on(rack, rack.controls.find(self), false)
				_at(ev.position.x)
			else:
				if dragging and changed:
					commit()
				dragging = false
		elif ev is InputEventMouseMotion and dragging:
			_at(ev.position.x)
	func _at(x: float) -> void:
		var k := clampf((x - 64) / float(track_w - 3), 0.0, 1.0)
		var before := value
		set_value(lo + (hi - lo) * k)
		if absf(before - value) > 0:
			changed = true
			if app:
				app.audio.blip("ratchet")

## the Advanced fold's rack: sliders in two columns
class SliderRack:
	extends Rack
	func _layout() -> void:
		var cw := floorf(size.x / columns_n)
		for i in controls.size():
			var c: Control = controls[i]
			c.position = Vector2((i % columns_n) * cw + 18, (i / columns_n) * 16)
			c.size.x = cw - 18
		custom_minimum_size = Vector2(0, 16 * ceili(controls.size() / float(columns_n)))
	func item_rect(i: int) -> Rect2:
		if i < 0 or i >= controls.size():
			return Rect2(position, Vector2(10, 16))
		var c: Control = controls[i]
		return Rect2(position + c.position, Vector2(c.size.x, 14))

## a pixel progress strip with a line of words
class Progress:
	extends Control
	var done := 0
	var total := 1
	var words := ""
	var spin := 0.0
	func set_progress(d: int, n: int, w: String) -> void:
		done = d
		total = maxi(n, 1)
		words = w
		queue_redraw()
	func _process(dt: float) -> void:
		spin += dt
		if total <= 0 or done < 0:
			queue_redraw()
	func _draw() -> void:
		var f := T.font("text")
		draw_string(f, Vector2(0, 12), words, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.BONE)
		var w := size.x - 2
		var segs := 40
		var sw := floorf(w / segs)
		var y := 15
		for i in segs:
			var on := (float(i) / segs) < (float(done) / total)
			if done < 0:   # busy without a count: a running light
				on = (i + int(spin * 12)) % segs < 6
			draw_rect(Rect2(i * sw, y, sw - 1, 4), T.ACCENT if on else T.D)

## a row of ramp swatches with a name, selectable
class RampRow:
	extends Control
	var ramp_name := ""
	var colors: Array = []
	var on := false
	var hot := false
	var app: Node = null
	var rack: Control = null
	var on_pick: Callable
	var compact := false            # the swatch alone (the name is elsewhere)
	func init(name: String, cs: Array, pick: Callable) -> void:
		ramp_name = name
		colors = cs
		on_pick = pick
		mouse_filter = Control.MOUSE_FILTER_STOP
		compact = name == ""
		size = Vector2(maxi(cs.size(), 1) * 8 + 4, 13) if compact else Vector2(180, 13)
	func set_hot(h: bool) -> void:
		hot = h
		queue_redraw()
	func activate() -> void:
		if on_pick.is_valid():
			on_pick.call(ramp_name)
	func step(_delta: int, _dir: String) -> bool:
		return false
	func _draw() -> void:
		var f := T.font("text")
		var tex := PX.ramp(colors)
		if compact:
			draw_texture_rect(tex, Rect2(2, 1, tex.get_width(), tex.get_height() * 2 - 2), false)
			if on or hot:
				draw_rect(Rect2(0, 0, tex.get_width() + 4, 13), T.ACCENT if on else T.GD, false, 1.0)
			return
		draw_string(f, Vector2(0, 11), ramp_name, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT if (on or hot) else T.DIM)
		draw_texture_rect(tex, Rect2(70, 1, tex.get_width(), tex.get_height() * 2 - 2), false)
		draw_rect(Rect2(0, 12, size.x, 1), T.RULE)
	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			if app and rack:
				app.focus_on(rack, rack.controls.find(self), false)
			activate()

class RampRack:
	extends Rack
	func _layout() -> void:
		if not controls.is_empty() and controls[0].get("compact"):
			# swatches in a row, each with room for the arrow in front; wrapping past the width
			var x := 18.0
			var y := 0.0
			var rows_n := 1
			for c in controls:
				if x + c.size.x > size.x and x > 18.0:
					x = 18.0
					y += 13.0
					rows_n += 1
				c.position = Vector2(x, y)
				x += c.size.x + 22.0
			custom_minimum_size = Vector2(0, 13 * rows_n)
			return
		var cw := floorf(size.x / columns_n)
		for i in controls.size():
			var c: Control = controls[i]
			c.position = Vector2((i % columns_n) * cw, (i / columns_n) * 13)
			c.size.x = cw - 12
		custom_minimum_size = Vector2(0, 13 * ceili(controls.size() / float(columns_n)))
	func item_rect(i: int) -> Rect2:
		if i < 0 or i >= controls.size():
			return Rect2(position, Vector2(10, 13))
		var c: Control = controls[i]
		return Rect2(position + c.position, Vector2(c.size.x, 13))

## a row of frame thumbnails (the frame editor's timeline); the selector picks a frame
class Timeline:
	extends Control
	var texs: Array = []
	var current := 0
	var active := false
	var app: Node = null
	var on_pick: Callable
	var thumb := 36
	var marks := {}                 # frame index -> a letter (H hold, X deleted, M mirrored)
	var on_reorder: Callable        # (from, to): a thumbnail dragged to another place
	var max_cell := 0               # a strip of few frames keeps its cells this wide (0 = share the width)
	var _drag_i := -1
	var _drag_to := -1
	var _press_x := 0.0
	func setup(list: Array, cur: int, a: Node, cb: Callable) -> void:
		texs = list
		current = cur
		app = a
		on_pick = cb
		mouse_filter = Control.MOUSE_FILTER_STOP
		custom_minimum_size = Vector2(0, thumb + 14)
		queue_redraw()
	func item_count() -> int:
		return texs.size()
	func columns() -> int:
		return maxi(texs.size(), 1)
	func _cell() -> float:
		var c := floor(size.x / maxi(texs.size(), 1)) if texs.size() > 0 else 40.0
		return minf(c, max_cell) if max_cell > 0 else c
	func item_rect(i: int) -> Rect2:
		return Rect2(position + Vector2(i * _cell(), thumb + 2), Vector2(_cell(), 12))
	func set_sel(i: int) -> void:
		current = clampi(i, 0, maxi(texs.size() - 1, 0))
		if on_pick.is_valid():
			on_pick.call(current)
		queue_redraw()
	func set_active(on: bool) -> void:
		active = on
		queue_redraw()
	func activate(i: int) -> void:
		set_sel(i)
	func step(_delta: int, _dir: String) -> bool:
		return false
	func _draw() -> void:
		var cell := _cell()
		var f := T.font("text")
		for i in texs.size():
			var tex: Texture2D = texs[i]
			var ts := tex.get_size()
			var z := minf((cell - 2) / ts.x, float(thumb) / ts.y)
			var dst := Rect2(Vector2(i * cell + 1, 0) + ((Vector2(cell - 2, thumb) - ts * z) / 2.0).floor(), (ts * z).floor())
			draw_rect(Rect2(i * cell, 0, cell - 1, thumb), T.WELL if i != current else Color(T.ACCENT, 0.12))
			draw_texture_rect(tex, dst, false)
			if i == current:
				draw_rect(Rect2(i * cell, 0, cell - 1, 1), T.ACCENT)
				draw_rect(Rect2(i * cell, thumb - 1, cell - 1, 1), T.ACCENT)
			var m := String(marks.get(i, ""))
			draw_string(f, Vector2(i * cell, thumb + 12), str(i + 1) + m, HORIZONTAL_ALIGNMENT_CENTER, cell, T.SMALL_SIZE, T.ACCENT if i == current else T.BONE)
		if _drag_to >= 0 and _drag_i >= 0 and _drag_to != _drag_i:
			var x: float = _drag_to * cell + (cell - 1 if _drag_to > _drag_i else 0)
			draw_rect(Rect2(x - 1, 0, 2, thumb), T.GH)
	func _gui_input(ev: InputEvent) -> void:
		if texs.is_empty():
			return
		if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT:
			var i := clampi(int(ev.position.x / _cell()), 0, texs.size() - 1)
			if ev.pressed:
				if app:
					app.focus_on(self, i, false)
				set_sel(i)
				if app:
					app.audio.blip("ratchet")
				if on_reorder.is_valid():
					_drag_i = i
					_drag_to = -1
					_press_x = ev.position.x
			else:
				if _drag_i >= 0 and _drag_to >= 0 and _drag_to != _drag_i and on_reorder.is_valid():
					on_reorder.call(_drag_i, _drag_to)
					if app:
						app.audio.blip("clunk")
				_drag_i = -1
				_drag_to = -1
				queue_redraw()
		elif ev is InputEventMouseMotion and _drag_i >= 0:
			if absf(ev.position.x - _press_x) > 6.0:
				_drag_to = clampi(int(ev.position.x / _cell()), 0, texs.size() - 1)
				queue_redraw()

## a card row (cue cards, pads, preset cards): name + a line, in columns; selectable
class Cards:
	extends Choices
	var lines: Array = []
	func setup_cards(list: Array, columns: int, a: Node) -> void:
		row_h = 28
		setup(list, columns, a)
	func _draw() -> void:
		var f := T.font("text")
		for i in items.size():
			var p := item_pos(i)
			var on := active and i == sel
			var chosen: bool = items[i].get("on", false)
			draw_string(f, Vector2(p.x, p.y + 13), String(items[i]["label"]), HORIZONTAL_ALIGNMENT_LEFT, -1, T.TEXT_SIZE, T.ACCENT if (on or chosen) else T.BONE)
			draw_string(f, Vector2(p.x, p.y + 24), String(items[i].get("line", "")), HORIZONTAL_ALIGNMENT_LEFT, _col_w() - 20, T.SMALL_SIZE, T.DIM)
