extends CharacterBody2D
## The hero: the Hollow Mystic's PixelLab frames from the web build, five views mirrored to eight directions.
## Diablo-style control: hold the left button to walk toward the cursor, click a creature to strike it;
## the right button throws a thread at the cursor (no glow: a thin pale line that snaps and is gone).

signal died
signal stats_changed

const K := 2.55           # the hero's frames: painted at three times the grain, shown a little larger, as in the web build
const SPEED := 150.0
const FPS := {"idle": 6.0, "walk": 11.0, "atk": 16.0, "cast": 14.0, "hit": 12.0, "death": 8.0}

var frames := {}          # "pose/view" -> Array of [AtlasTexture, Vector2 offset]
var spr: Sprite2D
var pose := "idle"
var view := "down"
var flip := false
var ft := 0.0
var fi := 0
var busy := 0.0           # time left in an attack or cast
var hit_done := false
var goal := Vector2.ZERO
var walking := false
var target: Node2D = null
var hp := 90.0
var hp_max := 90.0
var mana := 60.0
var mana_max := 60.0
var gold := 0
var bag: Array = []
var dead := false
var thread_fx: Array = []  # [from, to, t]

func setup(cls: String) -> void:
	var m: Dictionary = Assets.meta["hero_" + cls]
	var sheets: Array = []
	for p in m["sheets"]:
		sheets.append(Assets.tex(p))
	var tmp := {}
	for key in m["idx"]:
		var e: Array = m["idx"][key]
		var parts: PackedStringArray = key.split("/")
		var at := AtlasTexture.new()
		at.atlas = sheets[int(e[0])]
		at.region = Rect2(e[1], e[2], e[3], e[4])
		var k: String = parts[0] + "/" + parts[1]
		if not tmp.has(k):
			tmp[k] = []
		tmp[k].append([int(parts[2]), at, Vector2(e[5], e[6])])
	for k in tmp:
		var arr: Array = tmp[k]
		arr.sort_custom(func(a, b): return a[0] < b[0])
		frames[k] = arr.map(func(x): return [x[1], x[2]])
	spr = Sprite2D.new()
	spr.centered = false
	spr.scale = Vector2(1.0 / K, 1.0 / K)
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	add_child(spr)
	var col := CollisionShape2D.new()
	var c := CircleShape2D.new()
	c.radius = 7.0
	col.shape = c
	add_child(col)
	# the soul in the lantern: warm, low, a little behind and to one side
	var light := PointLight2D.new()
	light.texture = Lights.radial(512)
	light.texture_scale = 1.7
	light.color = Color(1.0, 0.84, 0.6)
	light.energy = 0.95
	light.position = Vector2(10, -34)
	light.name = "Lantern"
	add_child(light)
	_apply()

func _view_for(v: Vector2) -> void:
	if v.length() < 0.01:
		return
	var a := rad_to_deg(atan2(v.y, v.x))  # 0 = east, 90 = south (screen)
	var oct := int(round(a / 45.0)) % 8
	if oct < 0:
		oct += 8
	# east, south-east, south, south-west, west, north-west, north, north-east
	var map := [["side", false], ["front", false], ["down", false], ["front", true], ["side", true], ["back", true], ["up", false], ["back", false]]
	view = map[oct][0]
	flip = map[oct][1]

func _set_pose(p: String) -> void:
	if p == pose:
		return
	pose = p
	fi = 0
	ft = 0.0

func _cur() -> Array:
	var k := pose + "/" + view
	if frames.has(k):
		return frames[k]
	for alt in ["down", "side", "front", "back", "up"]:
		if frames.has(pose + "/" + alt):
			return frames[pose + "/" + alt]
	return frames.get("idle/down", [])

func _apply() -> void:
	var fr := _cur()
	if fr.is_empty():
		return
	var f: Array = fr[min(fi, fr.size() - 1)]
	spr.texture = f[0]
	var off: Vector2 = f[1]
	spr.flip_h = flip
	if flip:
		off.x = -off.x - (f[0] as AtlasTexture).region.size.x
	spr.offset = off

func _world_mouse() -> Vector2:
	return get_global_mouse_position()

func _unhandled_input(ev: InputEvent) -> void:
	if dead:
		return
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		var m := _monster_at(_world_mouse())
		target = m
		if m == null:
			var loot := get_tree().get_first_node_in_group("loot_hover")
			if loot:
				goal = loot.global_position
			else:
				goal = _world_mouse()
			walking = true
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_RIGHT:
		_cast(_world_mouse())

func _monster_at(p: Vector2) -> Node2D:
	var best: Node2D = null
	var bd := 34.0
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.dead:
			continue
		var d: float = (m.global_position + Vector2(0, -16)).distance_to(p)
		if d < bd:
			bd = d
			best = m
	return best

func _cast(at: Vector2) -> void:
	if busy > 0.0 or mana < 6.0:
		return
	mana -= 6.0
	stats_changed.emit()
	_view_for(at - global_position)
	_set_pose("cast")
	busy = 0.5
	walking = false
	# the thread: it runs out toward the cursor and catches the first creature on its line
	var from := global_position + Vector2(0, -30)
	var dir := (at - from).normalized()
	var reach := 330.0
	var hitm: Node2D = null
	var best := reach
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.dead:
			continue
		var mp: Vector2 = m.global_position + Vector2(0, -14)
		var along := (mp - from).dot(dir)
		if along < 0.0 or along > reach:
			continue
		var side := absf((mp - from).cross(dir))
		if side < 18.0 and along < best:
			best = along
			hitm = m
	var to := from + dir * best
	thread_fx.append([from, to, 0.35])
	if hitm:
		hitm.take_hit(randf_range(9, 14), global_position)
	queue_redraw()

func take_hit(dmg: float, from: Vector2) -> void:
	if dead:
		return
	hp -= dmg
	stats_changed.emit()
	Fx.blood(get_parent(), global_position + Vector2(0, -26), (global_position - from).normalized(), 5)
	if hp <= 0.0:
		hp = 0.0
		dead = true
		_set_pose("death")
		died.emit()
	elif busy <= 0.0:
		_set_pose("hit")
		busy = 0.25

func _physics_process(dt: float) -> void:
	ft += dt
	if dead:
		_animate(dt, false)
		return
	mana = minf(mana_max, mana + dt * 1.6)
	hp = minf(hp_max, hp + dt * 0.4)
	if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and target == null and busy <= 0.0:
		goal = _world_mouse()
		walking = true
	if busy > 0.0:
		busy -= dt
		# the strike lands halfway through the swing
		if pose == "atk" and not hit_done and busy < 0.22 and target and not target.dead:
			hit_done = true
			if global_position.distance_to(target.global_position) < 58.0:
				target.take_hit(randf_range(6, 10), global_position)
		velocity = Vector2.ZERO
		if busy <= 0.0:
			_set_pose("idle")
	elif target and not target.dead:
		var d := global_position.distance_to(target.global_position)
		_view_for(target.global_position - global_position)
		if d > 46.0:
			velocity = (target.global_position - global_position).normalized() * SPEED
			_set_pose("walk")
		else:
			velocity = Vector2.ZERO
			_set_pose("atk")
			busy = 0.5
			hit_done = false
	elif walking:
		var to := goal - global_position
		if to.length() < 5.0:
			walking = false
			velocity = Vector2.ZERO
			_set_pose("idle")
		else:
			velocity = to.normalized() * SPEED
			_view_for(to)
			_set_pose("walk")
	else:
		target = null
		velocity = Vector2.ZERO
		_set_pose("idle")
	move_and_slide()
	_animate(dt, true)
	for t in thread_fx:
		t[2] -= dt
	thread_fx = thread_fx.filter(func(t): return t[2] > 0.0)
	queue_redraw()

func _animate(dt: float, loop: bool) -> void:
	var fr := _cur()
	var fps: float = FPS.get(pose, 8.0)
	if ft > 1.0 / fps:
		ft = 0.0
		fi += 1
		if fi >= fr.size():
			fi = fr.size() - 1 if (pose == "death" or not loop) else 0
	_apply()

func _draw() -> void:
	# the thread: thin, pale, gone in a third of a second; it sags as it goes slack
	for t in thread_fx:
		var a: float = t[2] / 0.35
		var from: Vector2 = t[0] - global_position
		var to: Vector2 = t[1] - global_position
		var pts := PackedVector2Array()
		for i in 13:
			var q := i / 12.0
			pts.append(from.lerp(to, q) + Vector2(0, sin(q * PI) * (1.0 - a) * 16.0))
		draw_polyline(pts, Color(0.86, 0.9, 0.88, 0.55 * a), 1.2)
