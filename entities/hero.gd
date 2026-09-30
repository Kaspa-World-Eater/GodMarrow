class_name Hero
extends Node2D
## The hero on the tile grid. Positions are in tiles (yards), as in the web build; the node sits at iso(tp).
## Diablo II control: hold the left button to walk (repath every 0.18 s), click a creature to go to it and strike.

signal stats_changed
signal died

var zone: Zone
var tp := Vector2.ZERO           # tile position
var cls := "animancer"
var spr: AnimSprite
var face := 1
var view := "down"
var path := PackedVector2Array()
var path_i := 0
var repath := 0.0
var goal := Vector2.ZERO
var walking := false
var lamp: PointLight2D
var st: HeroStats
var target: Node = null
var busy := 0.0
var dead := false
var radius := 0.25

func setup(z: Zone, c: String, at: Vector2) -> void:
	zone = z
	cls = c
	tp = at
	var kind := c
	if ResourceLoader.exists("res://art/sprites/%s_unclipped.json" % c):
		kind = c + "_unclipped"
	spr = AnimSprite.new(Data.sprite_set(kind))
	spr.view = "down"
	add_child(spr)
	spr.play("idle")
	_shadow()
	lamp = PointLight2D.new()
	lamp.texture = Lights.pool(512)
	lamp.color = HeroStats.lamp_color(c)
	lamp.energy = 1.25
	lamp.texture_scale = 7.0 * Iso.HX * 2.0 / 512.0 * 1.25
	lamp.position = Vector2(28, -90)
	lamp.shadow_enabled = true
	lamp.shadow_filter = Light2D.SHADOW_FILTER_PCF5
	lamp.shadow_color = Color(0, 0, 0, 0.8)
	add_child(lamp)
	if st == null:
		st = HeroStats.new()
		st.setup(c)
	_sync()

func _shadow() -> void:
	var s := Polygon2D.new()
	var pts := PackedVector2Array()
	for i in 16:
		var a := i / 16.0 * TAU
		pts.append(Vector2(cos(a) * 26.0, sin(a) * 10.0 + 8.0))
	s.polygon = pts
	s.color = Color(0, 0, 0, 0.35)
	s.z_index = -1
	s.z_as_relative = true
	add_child(s)
	move_child(s, 0)

func _sync() -> void:
	position = Iso.to_screen(tp)

func mouse_tile() -> Vector2:
	return Iso.to_tile(get_global_mouse_position())

func walk_to(t: Vector2) -> void:
	goal = t
	walking = true
	path = zone.path(tp, t)
	path_i = 0
	repath = 0.18

func _physics_process(dt: float) -> void:
	if dead or zone == null:
		return
	st.tick(dt)
	if busy > 0.0:
		busy -= dt
		spr.step(dt)
		_sync()
		return
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and target == null and not _ui_captured():
		repath -= dt
		if repath <= 0.0 or not walking:
			walk_to(mouse_tile())
	var moved := false
	if walking and path_i < path.size():
		var wp: Vector2 = path[path_i]
		var to := wp - tp
		var step := st.move_speed() * dt
		if to.length() <= step:
			tp = zone.move(tp, to, radius)
			path_i += 1
		else:
			tp = zone.move(tp, to.normalized() * step, radius)
		_face(to)
		moved = true
		if path_i >= path.size():
			walking = false
	else:
		walking = false
	spr.view = view
	spr.face = face
	if moved:
		spr.play("walk")
		spr.step(dt, st.move_speed() / 3.11)
	else:
		spr.play("idle")
		spr.step(dt)
	_sync()

func _face(dir: Vector2) -> void:
	var r := AnimSprite.hero_view(dir, face)
	if r[0] != "":
		view = r[0]
		face = r[1]

func _ui_captured() -> bool:
	var vp := get_viewport()
	return vp.gui_get_hovered_control() != null if vp else false
