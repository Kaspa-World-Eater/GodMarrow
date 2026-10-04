extends Control
const T := preload("res://scripts/theme.gd")
const Px := preload("res://scripts/editor/pixels.gd")
const Icons := preload("res://scripts/editor/icons.gd")
## scripts/editor/canvas.gd: the picture window while editing. The frame at a whole-number zoom, panned by dragging
## with the middle or right button (or the hand tool), zoomed by the wheel in integer steps about the pointer; the
## onion skins under it, the reference painting over it (dimmable), the selection's marching outline, the brush's
## footprint under the pointer, the clone source's crosshair, the effect anchors with their handles. Every pointer
## event goes to the editor screen as frame coordinates; the canvas itself holds no pixels.

var editor = null                 # the editor screen (on_canvas_press / drag / release / hover / wheel)
var zoom := 3
var pan := Vector2i.ZERO          # the frame's top-left in window pixels
var fit_done := false
var image: Texture2D = null       # the composite showing
var prev_tex: Texture2D = null
var next_tex: Texture2D = null
var reference: Texture2D = null
var reference_alpha := 0.5
var frame_size := Vector2i(1, 1)
var edge: Array = []              # the selection outline's pixels
var brush_points: Array = []      # the footprint under the pointer
var hover := Vector2i(-1, -1)
var hover_in := false
var preview_points: Array = []    # a shape being dragged (line, rect, ellipse)
var preview_colour := Color.WHITE
var lasso: Array = []             # the lasso's points while dragging
var drag_rect := Rect2i()         # the rectangle select while dragging
var clone_mark := Vector2i(-1, -1)
var anchors: Array = []           # [{pos: Vector2i, name, on, scale, rotation}]
var floating: Texture2D = null    # the selection being moved
var floating_at := Vector2i.ZERO
var tick := 0.0
var panning := false
var pan_from := Vector2.ZERO
var pan_start := Vector2i.ZERO
var pressed := false
var pressed_button := 0
var caption := ""
var ghost := ""                   # an effect being dragged from the library
var ghost_at := Vector2.ZERO
var grid := false

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	clip_contents = true
	focus_mode = Control.FOCUS_NONE

func _process(dt: float) -> void:
	tick += dt
	queue_redraw()

func set_frame_size(s: Vector2i) -> void:
	frame_size = Vector2i(maxi(s.x, 1), maxi(s.y, 1))
	if not fit_done:
		fit()

## the biggest whole zoom that fits, centred
func fit() -> void:
	fit_done = true
	var z := int(floor(minf((size.x - 8) / frame_size.x, (size.y - 8) / frame_size.y)))
	zoom = clampi(z, 1, 16)
	centre()

func centre() -> void:
	pan = Vector2i(int((size.x - frame_size.x * zoom) / 2.0), int((size.y - frame_size.y * zoom) / 2.0))

func set_zoom(z: int, about: Vector2 = Vector2(-1, -1)) -> void:
	z = clampi(z, 1, 24)
	if z == zoom:
		return
	if about.x < 0:
		about = size / 2.0
	var fp := (about - Vector2(pan)) / zoom     # the frame point under the pointer
	zoom = z
	pan = Vector2i((about - fp * zoom).round())
	queue_redraw()

func to_frame(p: Vector2) -> Vector2i:
	return Vector2i(int(floor((p.x - pan.x) / zoom)), int(floor((p.y - pan.y) / zoom)))

func to_window(fp: Vector2i) -> Vector2:
	return Vector2(pan) + Vector2(fp) * zoom

func in_frame(fp: Vector2i) -> bool:
	return fp.x >= 0 and fp.y >= 0 and fp.x < frame_size.x and fp.y < frame_size.y

# ------------------------------------------------------------------ input
func _gui_input(ev: InputEvent) -> void:
	if editor == null:
		return
	if ev is InputEventMouseButton:
		var fp := to_frame(ev.position)
		if ev.pressed and ev.button_index == MOUSE_BUTTON_WHEEL_UP:
			set_zoom(zoom + 1, ev.position)
			editor.on_canvas_zoom(zoom)
			accept_event()
			return
		if ev.pressed and ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			set_zoom(zoom - 1, ev.position)
			editor.on_canvas_zoom(zoom)
			accept_event()
			return
		var pans_with: bool = ev.button_index == MOUSE_BUTTON_MIDDLE or (ev.button_index == MOUSE_BUTTON_LEFT and (editor.tool == "hand" or Input.is_key_pressed(KEY_SPACE)))
		if pans_with:
			if ev.pressed:
				panning = true
				pan_from = ev.position
				pan_start = pan
			else:
				panning = false
			accept_event()
			return
		if ev.button_index in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT]:
			if ev.pressed:
				pressed = true
				pressed_button = ev.button_index
				editor.on_canvas_press(fp, ev.button_index, ev.shift_pressed, ev.alt_pressed, ev.ctrl_pressed, ev.position)
			else:
				if pressed:
					pressed = false
					editor.on_canvas_release(fp, pressed_button, ev.shift_pressed, ev.alt_pressed)
			accept_event()
	elif ev is InputEventMouseMotion:
		var fp := to_frame(ev.position)
		hover = fp
		hover_in = in_frame(fp)
		if panning:
			pan = pan_start + Vector2i((ev.position - pan_from).round())
			queue_redraw()
			return
		if pressed:
			editor.on_canvas_drag(fp, pressed_button, ev.shift_pressed, ev.alt_pressed)
		else:
			editor.on_canvas_hover(fp)
		queue_redraw()

func _notification(what: int) -> void:
	if what == NOTIFICATION_MOUSE_EXIT:
		hover_in = false
		queue_redraw()

# ------------------------------------------------------------------ drawing
func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), T.WELL)
	var dst := Rect2(Vector2(pan), Vector2(frame_size) * zoom)
	# the checker behind see-through pixels, in frame pixels when zoomed enough
	var ch := Icons.checker()
	if zoom >= 4:
		draw_texture_rect(ch, dst, true)
	else:
		draw_rect(dst, Color("#131219"))
	draw_rect(Rect2(dst.position - Vector2(1, 1), dst.size + Vector2(2, 2)), T.FRAME2, false, 1.0)
	if prev_tex:
		draw_texture_rect(prev_tex, dst, false, Color(0.5, 0.7, 1.0, 0.35))
	if next_tex:
		draw_texture_rect(next_tex, dst, false, Color(1.0, 0.6, 0.5, 0.35))
	if image:
		draw_texture_rect(image, dst, false)
	if floating:
		draw_texture_rect(floating, Rect2(Vector2(pan + floating_at * zoom), Vector2(frame_size) * zoom), false)
	if reference and reference_alpha > 0.0:
		# the reference fit to the frame's box, keeping its shape
		var rs := reference.get_size()
		var k := minf(dst.size.x / rs.x, dst.size.y / rs.y)
		var rd := Rect2(dst.position + (dst.size - rs * k) / 2.0, rs * k)
		draw_texture_rect(reference, rd, false, Color(1, 1, 1, reference_alpha))
	if grid and zoom >= 6:
		for x in range(0, frame_size.x + 1):
			draw_rect(Rect2(dst.position.x + x * zoom, dst.position.y, 1, dst.size.y), Color(T.RULE, 0.5))
		for y in range(0, frame_size.y + 1):
			draw_rect(Rect2(dst.position.x, dst.position.y + y * zoom, dst.size.x, 1), Color(T.RULE, 0.5))
	# a shape being dragged
	for p in preview_points:
		var q: Vector2i = p
		if in_frame(q):
			draw_rect(Rect2(to_window(q), Vector2(zoom, zoom)), preview_colour)
	if lasso.size() > 1:
		for i in range(lasso.size() - 1):
			draw_line(to_window(lasso[i]) + Vector2(zoom, zoom) / 2.0, to_window(lasso[i + 1]) + Vector2(zoom, zoom) / 2.0, T.ACCENT, 1.0)
	if drag_rect.size.x > 0 and drag_rect.size.y > 0:
		draw_rect(Rect2(to_window(drag_rect.position), Vector2(drag_rect.size) * zoom), T.ACCENT, false, 1.0)
	# the selection's marching outline: alternate pixels of the edge in bone and ink, walking with time
	var step := int(tick * 8.0)
	for i in edge.size():
		var p: Vector2i = edge[i]
		var on := ((p.x + p.y + step) % 2) == 0
		var r := Rect2(to_window(p), Vector2(zoom, zoom))
		draw_rect(Rect2(r.position, Vector2(r.size.x, 1)), T.BONE if on else T.BLACK)
		draw_rect(Rect2(r.position + Vector2(0, r.size.y - 1), Vector2(r.size.x, 1)), T.BONE if on else T.BLACK)
		draw_rect(Rect2(r.position, Vector2(1, r.size.y)), T.BONE if on else T.BLACK)
		draw_rect(Rect2(r.position + Vector2(r.size.x - 1, 0), Vector2(1, r.size.y)), T.BONE if on else T.BLACK)
	# the clone source
	if clone_mark.x >= 0:
		var c := to_window(clone_mark) + Vector2(zoom, zoom) / 2.0
		draw_rect(Rect2(c.x - 5, c.y, 11, 1), T.GH)
		draw_rect(Rect2(c.x, c.y - 5, 1, 11), T.GH)
	# the effect anchors: a diamond, a rotation handle, a scale box
	for a in anchors:
		var at := to_window(a["pos"]) + Vector2(zoom, zoom) / 2.0
		var r := maxf(8.0, 8.0 * float(a.get("scale", 1.0)))
		var on: bool = a.get("on", false)
		var rot: float = deg_to_rad(float(a.get("rotation", 0.0)))
		draw_rect(Rect2(at.x - r, at.y - r, r * 2, r * 2), Color(T.ACCENT if on else T.DIM, 0.6), false, 1.0)
		var handle := at + Vector2(0, -r - 6).rotated(rot)
		draw_line(at, handle, Color(T.ACCENT if on else T.DIM, 0.8), 1.0)
		draw_rect(Rect2(handle - Vector2(2, 2), Vector2(4, 4)), T.GH if on else T.G)
		draw_texture_rect(Icons.anchor_glyph(on), Rect2(at - Vector2(9, 9), Vector2(18, 18)), false)
		draw_string(T.font("text"), at + Vector2(r + 3, 4), String(a.get("name", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT if on else T.BONE)
	# the brush footprint under the pointer
	if hover_in and not pressed and not brush_points.is_empty():
		for p in brush_points:
			var q: Vector2i = p
			if in_frame(q):
				draw_rect(Rect2(to_window(q), Vector2(zoom, zoom)), Color(T.ACCENT, 0.5), false, 1.0)
	if ghost != "":
		draw_texture_rect(Icons.anchor_glyph(true), Rect2(ghost_at - Vector2(9, 9), Vector2(18, 18)), false)
		draw_string(T.font("text"), ghost_at + Vector2(12, 4), ghost, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT)
	# the zoom and the pointer's place, bottom left; the caption bottom right
	var f := T.font("text")
	var words := "%dx" % zoom
	if hover_in:
		words += "   %d, %d" % [hover.x, hover.y]
	draw_rect(Rect2(2, size.y - 14, T.text_width(words, T.SMALL_SIZE) + 6, 13), Color(T.INK, 0.85))
	draw_string(f, Vector2(5, size.y - 4), words, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.BONE)
	if caption != "":
		var cw := T.text_width(caption, T.SMALL_SIZE)
		draw_rect(Rect2(size.x - cw - 8, size.y - 14, cw + 6, 13), Color(T.INK, 0.85))
		draw_string(f, Vector2(size.x - cw - 5, size.y - 4), caption, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.BONE)
