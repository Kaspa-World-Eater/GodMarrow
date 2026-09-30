class_name Hud
extends CanvasLayer
## The HUD: a life orb and a mana orb in stone rings, the gold, the land's name when you arrive, small toasts.

static var me: Hud

var hero: Node
var life: ColorRect
var mana: ColorRect
var gold_l: Label
var title_l: Label
var sub_l: Label
var toast_l: Label
var dead_l: Label

func _ready() -> void:
	me = self
	layer = 20

func setup(h: Node, land: String, sub: String) -> void:
	hero = h
	hero.stats_changed.connect(_refresh)
	hero.died.connect(_on_died)
	life = _orb(Color(0.42, 0.04, 0.05), true)
	mana = _orb(Color(0.08, 0.13, 0.42), false)
	gold_l = _label(15, Color(0.78, 0.72, 0.55))
	_place(gold_l, 1.0, 1.0, -260, 16, -24, 40)
	gold_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	title_l = _label(46, Color(0.86, 0.82, 0.72))
	title_l.text = land.to_upper()
	sub_l = _label(18, Color(0.62, 0.58, 0.5))
	sub_l.text = sub
	for l: Label in [title_l, sub_l]:
		_place(l, 0.0, 1.0, 0, 150 if l == title_l else 212, 0, 210 if l == title_l else 250)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		var tw: Tween = l.create_tween()
		l.modulate.a = 0.0
		tw.tween_property(l, "modulate:a", 1.0, 1.4)
		tw.tween_interval(3.2)
		tw.tween_property(l, "modulate:a", 0.0, 2.0)
	toast_l = _label(18, Color.WHITE)
	_place(toast_l, 0.0, 1.0, 0, -250, 0, -210, true)
	toast_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_l.modulate.a = 0.0
	dead_l = _label(40, Color(0.7, 0.66, 0.6))
	_place(dead_l, 0.0, 1.0, 0, 400, 0, 520)
	dead_l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	dead_l.text = "The lantern carries you back.\n(click to rise at the camp)"
	dead_l.visible = false
	_refresh()

## anchors across the screen's width, offsets from them (bottom = anchored to the bottom edge)
func _place(l: Control, al: float, ar: float, ol: float, ot: float, or_: float, ob: float, bottom: bool = false) -> void:
	l.anchor_left = al
	l.anchor_right = ar
	l.anchor_top = 1.0 if bottom else 0.0
	l.anchor_bottom = l.anchor_top
	l.offset_left = ol
	l.offset_right = or_
	l.offset_top = ot
	l.offset_bottom = ob

func _label(size: int, c: Color) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", c)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	l.add_theme_constant_override("outline_size", 4)
	add_child(l)
	return l

func _orb(c: Color, left: bool) -> ColorRect:
	var holder := Control.new()
	var ax := 0.0 if left else 1.0
	holder.anchor_left = ax
	holder.anchor_right = ax
	holder.anchor_top = 1.0
	holder.anchor_bottom = 1.0
	holder.offset_left = 28.0 if left else -208.0
	holder.offset_right = holder.offset_left + 180.0
	holder.offset_top = -208.0
	holder.offset_bottom = -28.0
	holder.set_script(load("res://scripts/orb_ring.gd"))
	add_child(holder)
	var r := ColorRect.new()
	r.position = Vector2(14, 14)
	r.size = Vector2(152, 152)
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/orb.gdshader")
	m.set_shader_parameter("liquid", c)
	r.material = m
	holder.add_child(r)
	holder.move_child(r, 0)
	return r

func _refresh() -> void:
	if hero == null:
		return
	(life.material as ShaderMaterial).set_shader_parameter("level", hero.hp / hero.hp_max)
	(mana.material as ShaderMaterial).set_shader_parameter("level", hero.mana / hero.mana_max)
	gold_l.text = "Gold  " + str(hero.gold)

func _process(_dt: float) -> void:
	_refresh()

func _on_died() -> void:
	dead_l.visible = true

static func toast(text: String, c: Color) -> void:
	if me == null:
		return
	me.toast_l.text = text
	me.toast_l.add_theme_color_override("font_color", c)
	var tw: Tween = me.toast_l.create_tween()
	me.toast_l.modulate.a = 1.0
	tw.tween_interval(2.0)
	tw.tween_property(me.toast_l, "modulate:a", 0.0, 1.0)

static func float_text(parent: Node, pos: Vector2, text: String) -> void:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", 10)
	l.add_theme_color_override("font_color", Color(0.78, 0.74, 0.66, 0.9))
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	l.add_theme_constant_override("outline_size", 3)
	l.position = pos + Vector2(randf_range(-8, 4), 0)
	l.z_index = 80
	l.z_as_relative = false
	parent.add_child(l)
	var tw: Tween = l.create_tween()
	tw.set_parallel(true)
	tw.tween_property(l, "position:y", pos.y - 22.0, 0.8)
	tw.tween_property(l, "modulate:a", 0.0, 0.8).set_delay(0.3)
	tw.chain().tween_callback(l.queue_free)
