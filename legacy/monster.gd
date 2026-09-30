extends CharacterBody2D
## The Kneeler: a pilgrim bent under a pack that grew into him, a candle in his fist. Act I's first creature.
## Wanders, notices you, shuffles close, winds up, strikes. Dies where it knelt and leaves its corpse a while.

const S := 0.72           # painted at twice the world grain; shown larger so they read at a glance
const CELL := Vector2(100, 88)

var sheet: Texture2D
var idx := {}
var spr: Sprite2D
var anim := "idle"
var fi := 0
var ft := 0.0
var state := "idle"
var st := 0.0
var hp := 30.0
var hp_max := 30.0
var dead := false
var hero: Node2D
var home := Vector2.ZERO
var wander_to := Vector2.ZERO
var struck := false
var stagger := 0.0

func setup(h: Node2D) -> void:
	hero = h
	home = global_position
	wander_to = home
	var m: Dictionary = Assets.meta["kneeler"]
	sheet = Assets.tex(m["png"])
	idx = m["index"]
	spr = Sprite2D.new()
	spr.centered = false
	spr.scale = Vector2(S, S)
	spr.offset = Vector2(-CELL.x * 0.5, -CELL.y + 4)
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var at := AtlasTexture.new()
	at.atlas = sheet
	spr.texture = at
	add_child(spr)
	var col := CollisionShape2D.new()
	var c := CircleShape2D.new()
	c.radius = 9.0
	col.shape = c
	add_child(col)
	add_to_group("monsters")
	hp_max = randf_range(24, 34)
	hp = hp_max
	fi = randi() % 4

func _frame() -> void:
	var list: Array = idx.get(anim, [0])
	var n: int = int(list[min(fi, list.size() - 1)])
	(spr.texture as AtlasTexture).region = Rect2(n * CELL.x, 0, CELL.x, CELL.y)

func _play(a: String) -> void:
	if a != anim:
		anim = a
		fi = 0
		ft = 0.0

func take_hit(dmg: float, from: Vector2) -> void:
	if dead:
		return
	hp -= dmg
	Fx.blood(get_parent(), global_position + Vector2(0, -14), (global_position - from).normalized(), 4)
	Hud.float_text(get_parent(), global_position + Vector2(0, -44), str(int(dmg)))
	if hp <= 0.0:
		_die()
		return
	# a heavy blow staggers it out of its swing (stagger x1.2 both ways, per the rules)
	if state != "strike" or randf() < 0.4:
		state = "hurt"
		st = 0.3 * 1.2
		_play("hit")
	if state == "idle" or state == "wander":
		state = "chase"

func _die() -> void:
	dead = true
	state = "dead"
	_play("die")
	remove_from_group("monsters")
	for ch in get_children():
		if ch is CollisionShape2D:
			ch.set_deferred("disabled", true)
	z_index = -10
	# Diablo II-like odds: gold more often than not, an item now and then
	if randf() < 0.55:
		Loot.drop_gold(get_parent(), global_position + Vector2(randf_range(-14, 14), randf_range(-6, 8)), randi_range(3, 19))
	if randf() < 0.12:
		Loot.drop_item(get_parent(), global_position + Vector2(randf_range(-16, 16), randf_range(-8, 10)))
	var tw: Tween = create_tween()
	tw.tween_interval(24.0)
	tw.tween_property(self, "modulate:a", 0.0, 4.0)
	tw.tween_callback(queue_free)

func _physics_process(dt: float) -> void:
	ft += dt
	st -= dt
	var fps := 7.0
	if dead:
		_frame()
		return
	var to_hero := hero.global_position - global_position
	var dh := to_hero.length()
	match state:
		"idle":
			velocity = Vector2.ZERO
			_play("idle")
			if st <= 0.0:
				state = "wander"
				wander_to = home + Vector2(randf_range(-90, 90), randf_range(-50, 50))
				st = randf_range(2.0, 4.0)
			if dh < 300.0 and not hero.dead:
				state = "chase"
		"wander":
			var w := wander_to - global_position
			velocity = w.normalized() * 30.0 if w.length() > 4.0 else Vector2.ZERO
			_play("walk")
			fps = 6.0
			if st <= 0.0 or w.length() <= 4.0:
				state = "idle"
				st = randf_range(1.5, 4.0)
			if dh < 300.0 and not hero.dead:
				state = "chase"
		"chase":
			_play("walk")
			fps = 9.0
			if hero.dead or dh > 520.0:
				state = "wander"
				wander_to = home
				st = 5.0
			elif dh > 40.0:
				velocity = to_hero.normalized() * 62.0
			else:
				velocity = Vector2.ZERO
				state = "wind"
				st = 0.5
				_play("wind")
		"wind":
			velocity = Vector2.ZERO
			fps = 6.0
			if st <= 0.0:
				state = "strike"
				st = 0.35
				struck = false
				_play("atk")
		"strike":
			velocity = Vector2.ZERO
			fps = 10.0
			if not struck and st < 0.2:
				struck = true
				if dh < 52.0:
					hero.take_hit(randf_range(4, 8), global_position)
			if st <= 0.0:
				state = "chase"
		"hurt":
			velocity = -to_hero.normalized() * 20.0
			fps = 10.0
			if st <= 0.0:
				state = "chase"
	if absf(to_hero.x) > 2.0 and state != "wander":
		spr.flip_h = to_hero.x < 0.0
	elif state == "wander" and absf(velocity.x) > 1.0:
		spr.flip_h = velocity.x < 0.0
	move_and_slide()
	if ft > 1.0 / fps:
		ft = 0.0
		var n: int = (idx.get(anim, [0]) as Array).size()
		fi = (fi + 1) % n if anim != "die" else min(fi + 1, n - 1)
	_frame()
