class_name Loot
extends Node2D
## Gold and items on the ground. Click to walk over and take them. Gold makes no sound when it falls.

const NAMES := [
	["Pilgrim's Knotted Cord", 0], ["Tarnished Lantern-Hook", 0], ["Ash-Crusted Ring", 1], ["Wick-Trimmer's Knife", 0],
	["Barrow-Lid Buckler", 0], ["Candle-Fist Maul", 1], ["Grey Felt Hood", 0], ["Chrism-Stained Gloves", 1],
	["Stair-Worn Sandals", 0], ["Kneeler's Pack-Strap", 1], ["The Ninth Mile", 2]]
const COLS := [Color(0.82, 0.8, 0.74), Color(0.45, 0.55, 0.85), Color(0.75, 0.62, 0.34)]

var kind := "gold"
var amount := 0
var title := ""
var col := Color.WHITE
var hero: Node2D
var wanted := false
var lab: Label
var hovered := false

static func drop_gold(parent: Node, pos: Vector2, n: int) -> void:
	var l := Loot.new()
	l.kind = "gold"
	l.amount = n
	l.title = str(n) + " Gold"
	l.col = Color(0.82, 0.8, 0.74)
	l.position = pos
	parent.add_child(l)

static func drop_item(parent: Node, pos: Vector2) -> void:
	var l := Loot.new()
	var e: Array = NAMES[randi() % NAMES.size()]
	l.kind = "item"
	l.title = e[0]
	l.col = COLS[e[1]]
	l.position = pos
	parent.add_child(l)

func _ready() -> void:
	hero = get_tree().get_first_node_in_group("hero")
	z_index = -20
	lab = Label.new()
	lab.text = title
	lab.add_theme_font_size_override("font_size", 11)
	lab.add_theme_color_override("font_color", col)
	lab.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	lab.add_theme_constant_override("outline_size", 3)
	lab.position = Vector2(-lab.get_minimum_size().x * 0.5, -22)
	lab.z_index = 60
	lab.z_as_relative = false
	lab.modulate.a = 0.0 if kind == "gold" else 0.95
	add_child(lab)
	# it falls in a little arc
	var p := position
	position = p + Vector2(0, -18)
	var tw: Tween = create_tween()
	tw.tween_property(self, "position", p, 0.28).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

func _draw() -> void:
	if kind == "gold":
		var r := clampi(2 + amount / 6, 2, 5)
		for i in r + 2:
			var o := Vector2(sin(i * 2.4) * r * 1.3, cos(i * 1.7) * r * 0.5)
			draw_circle(o, 1.6, Color(0.62, 0.5, 0.22))
			draw_circle(o + Vector2(-0.4, -0.5), 0.8, Color(0.85, 0.72, 0.38))
	else:
		# a bundle of cloth tied with cord
		draw_colored_polygon(PackedVector2Array([Vector2(-6, 0), Vector2(-4, -6), Vector2(3, -7), Vector2(7, -1), Vector2(2, 3), Vector2(-4, 3)]), Color(0.23, 0.2, 0.17))
		draw_line(Vector2(-4, -4), Vector2(5, -2), col.darkened(0.3), 1.0)

func _process(_dt: float) -> void:
	if hero == null:
		hero = get_tree().get_first_node_in_group("hero")
		return
	var m := get_global_mouse_position()
	var h := m.distance_to(global_position + Vector2(0, -6)) < 14.0 or (lab.modulate.a > 0.5 and Rect2(lab.global_position, lab.size).has_point(m))
	if h != hovered:
		hovered = h
		if h:
			add_to_group("loot_hover")
		else:
			remove_from_group("loot_hover")
		lab.modulate.a = 1.0 if h else (0.0 if kind == "gold" else 0.95)
	if wanted and hero.global_position.distance_to(global_position) < 20.0:
		_take()

func _unhandled_input(ev: InputEvent) -> void:
	if hovered and ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		wanted = true

func _take() -> void:
	if kind == "gold":
		hero.gold += amount
	else:
		hero.bag.append(title)
		Hud.toast(title, col)
	hero.stats_changed.emit()
	queue_free()
