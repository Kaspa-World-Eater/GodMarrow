extends Control
const T := preload("res://scripts/theme.gd")
const PX := preload("res://scripts/px.gd")
const Icons := preload("res://scripts/editor/icons.gd")
## scripts/editor/toolrow.gd: the editor's tools as a row of pixel icons with their names under them, a selector
## group like any other (item_count / item_rect / set_sel / activate / step), the chosen tool framed in gold.

var tools: Array = []
var labels := {}
var sel := 0
var active := false
var current := ""
var app: Node = null
var on_pick: Callable
var cell := 40
var icon_zoom := 2

func setup(list: Array, names: Dictionary, cur: String, a: Node, cb: Callable) -> void:
	tools = list
	labels = names
	current = cur
	app = a
	on_pick = cb
	sel = maxi(tools.find(cur), 0)
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = Vector2(0, 12 * icon_zoom + 14)
	queue_redraw()

func item_count() -> int:
	return tools.size()

func columns() -> int:
	return maxi(tools.size(), 1)

func _x(i: int) -> float:
	var total := tools.size() * cell
	var x0 := floorf((size.x - total) / 2.0)
	return x0 + i * cell

func item_rect(i: int) -> Rect2:
	if i < 0 or i >= tools.size():
		return Rect2(position, Vector2(10, 14))
	return Rect2(position + Vector2(_x(i) + (cell - 12 * icon_zoom) / 2.0 + 2, 0), Vector2(12 * icon_zoom, 12 * icon_zoom))

func set_sel(i: int) -> void:
	sel = clampi(i, 0, maxi(tools.size() - 1, 0))
	queue_redraw()

func set_active(on: bool) -> void:
	active = on
	queue_redraw()

func activate(i: int) -> void:
	if i >= 0 and i < tools.size() and on_pick.is_valid():
		on_pick.call(String(tools[i]))

func step(_delta: int, _dir: String) -> bool:
	return false

func index_of(label: String) -> int:
	for i in tools.size():
		if String(tools[i]).to_lower() == label.to_lower() or String(labels.get(tools[i], "")).to_lower() == label.to_lower():
			return i
	return -1

func set_current(t: String) -> void:
	current = t
	queue_redraw()

func _draw() -> void:
	var f := T.font("text")
	var iw := 12 * icon_zoom
	for i in tools.size():
		var name := String(tools[i])
		var x := _x(i)
		var on := name == current
		var hot := active and i == sel
		var ix := x + floorf((cell - iw) / 2.0)
		if on:
			draw_rect(Rect2(ix - 2, -1, iw + 4, iw + 2), T.INK)
			draw_rect(Rect2(ix - 2, -1, iw + 4, iw + 2), T.G, false, 1.0)
		draw_texture_rect(Icons.tool_icon(name, hot or on), Rect2(ix, 0, iw, iw), false)
		draw_string(f, Vector2(x, iw + 11), String(labels.get(name, name)), HORIZONTAL_ALIGNMENT_CENTER, cell, T.SMALL_SIZE, PX.ember(on or hot))   # every tool can be picked: ember, the one in hand bright

func _gui_input(ev: InputEvent) -> void:
	if ev is InputEventMouseMotion:
		var i := _hit(ev.position)
		if i >= 0 and (i != sel or not active) and app:
			app.focus_on(self, i, true)
	elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		var i := _hit(ev.position)
		if i >= 0 and app:
			app.focus_on(self, i, false)
			app.select_current()

func _hit(p: Vector2) -> int:
	for i in tools.size():
		var x := _x(i)
		if p.x >= x and p.x < x + cell and p.y >= 0 and p.y <= size.y:
			return i
	return -1
