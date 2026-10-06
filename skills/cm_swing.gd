extends Node2D
## One melee swing as Cursemark makes it (the Cursemark fork; decompiled game/combat/melee/Melee.preUpdate), from a
## row of its melee table (cursemark_raw/data.cdb, sheet "melee"):
##   wind-up (time_pre): the cut draws back, progress easing from 0 to -0.2;
##   the cut (time_atk): a circle of `size` px sweeps from start_angle to end_angle about the aim (mirrored when the
##     body faces left) and out from start_offset to end_offset (eased: smoothStop2), striking each body once;
##   follow-through (time_post): a little past the end, nothing struck.
## The striker lunges by `nudge` as the cut opens; what is struck is knocked back by `knockback` (doubled on a killing
## blow), the frame holds a moment, and the effect sprite (anim, its _post after) rides the cut.
## Units: a Cursemark px is 1/24 yard (world/cm_zone.gd) and 4 Godot units.

const PX := 1.0 / 24.0
const U := 4.0
const LUNGE_YD_PER_NUDGE := 0.11
const KNOCK_YD_S := 2.2

static var _rows := {}

var hero
var zone
var row: Dictionary
var aim := Vector2.RIGHT          # unit, in yards space
var face := 1
var dmg := 0.0
var speed := 1.0                  # attack speed
var opts := {}
var on_hit: Callable              # (m, dealt) after each body struck
var t := 0.0
var hit: Array = []
var lunge_left := 0.0
var fx: Sprite2D
var fx_frames: Array = []
var fx_post: Array = []
var fx_glow: Sprite2D

static func melee_row(id: String) -> Dictionary:
	if _rows.is_empty():
		var text: String = load("res://core/cm_data.gd").text("res://cursemark/raw/data.cdb")
		var j = JSON.parse_string(text)
		if j is Dictionary:
			for s in j["sheets"]:
				if s["name"] == "melee":
					for l in s["lines"]:
						_rows[str(l["id"])] = l
	return _rows.get(id, {})

## start a swing; returns it (it frees itself when done)
static func swing(h, id: String, at: Vector2, damage: float, o := {}, hit_cb := Callable()) -> Node2D:
	var r := melee_row(id)
	if r.is_empty():
		push_warning("no Cursemark melee row " + id)
		return null
	var s = load("res://skills/cm_swing.gd").new()
	s.hero = h
	s.zone = h.zone
	s.row = r
	s.aim = (at - h.tp).normalized() if at.distance_to(h.tp) > 0.05 else Vector2(h.face, 0)
	s.face = -1 if s.aim.x < 0.0 else 1
	s.dmg = damage
	s.speed = maxf(0.3, h.st.attack_speed())
	s.opts = o
	s.on_hit = hit_cb
	s.lunge_left = float(r.get("nudge", 0)) * LUNGE_YD_PER_NUDGE
	s.z_index = 30
	h.zone.add_child(s)
	s._fx_setup()
	load("res://core/cm_sound.gd").play(h, str(r.get("sound", "")), -2.0)
	return s

func length() -> float:
	return (float(row.get("time_pre", 0)) + float(row.get("time_atk", 0.12)) + float(row.get("time_post", 0.2))) / speed

func _fx_setup() -> void:
	var anim := str(row.get("anim", "")) if row.get("anim") != null else ""
	if anim == "":
		return
	var CmS = load("res://world/cm_sprites.gd")
	var book := "Effects_" + anim.split("/")[0].capitalize()
	var A: Dictionary = CmS.atlas(book)
	fx_frames = A.get(anim, [])
	fx_post = A.get(anim + "_post", [])
	if fx_frames.is_empty() and fx_post.is_empty():
		return
	fx = Sprite2D.new()
	fx.region_enabled = true
	fx.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	fx.scale = Vector2(U, U)
	fx.visible = false
	add_child(fx)
	var G: Dictionary = CmS.atlas(book + "_glow") if FileAccess.file_exists("res://cursemark/raw/sprites/" + book + "_glow.atlas") else {}
	if G.has(anim):
		fx_glow = Sprite2D.new()
		fx_glow.region_enabled = true
		fx_glow.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		m.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
		fx_glow.material = m
		fx_glow.modulate = Color(1, 1, 1, 0.45)    # the emissive lifts the cut's hot edge, it doesn't whiten it
		fx_glow.set_meta("frames", G[anim])
		fx.add_child(fx_glow)

static func smooth_stop2(x: float) -> float:
	return 1.0 - (1.0 - x) * (1.0 - x)

func _process(dt: float) -> void:
	if hero == null or not is_instance_valid(hero) or hero.dead:
		queue_free()
		return
	t += dt * speed
	var pre := float(row.get("time_pre", 0))
	var atk := float(row.get("time_atk", 0.12))
	var post := float(row.get("time_post", 0.2))
	var p := 0.0
	var phase := ""
	if t < pre:
		phase = "pre"
		p = smooth_stop2(t / maxf(0.001, pre)) * -0.2
	elif t < pre + atk:
		phase = "atk"
		p = (t - pre) / maxf(0.001, atk)
	elif t < pre + atk + post:
		phase = "post"
		p = 1.0 + smooth_stop2((t - pre - atk) / maxf(0.001, post)) * 0.02
	else:
		queue_free()
		return
	var a0 := float(row.get("start_angle", 0))
	var a1 := float(row.get("end_angle", 0))
	var ang := a0 + p * (a1 - a0)
	if face < 0:
		ang = -ang
	var size := float(row.get("size", 16))
	var o0 := float(row.get("start_offset", 10))
	var o1 := float(row.get("end_offset", 40)) - size * 0.5
	var off := o0 + smooth_stop2(clampf(p, 0.0, 1.0)) * (o1 - o0)
	var dir := aim.rotated(deg_to_rad(ang))
	var c: Vector2 = hero.tp + dir * off * PX
	# the lunge: the body goes with the cut as it opens
	if phase == "atk" and lunge_left > 0.0:
		var step := minf(lunge_left, float(row.get("nudge", 0)) * LUNGE_YD_PER_NUDGE * dt * speed / maxf(0.05, atk))
		lunge_left -= step
		hero.tp = zone.move(hero.tp, aim * step, hero.radius)
	if phase == "atk":
		_strike(c, size * 0.5 * PX)
	_fx(phase, c, dir, p)

func _strike(c: Vector2, r: float) -> void:
	for m in Combat.monsters_in(zone, c, r + 0.6):
		if m.dead or hit.has(m):
			continue
		if m.tp.distance_to(c) > r + m.radius:
			continue
		hit.append(m)
		var dealt := 0.0
		if opts.get("cb_only", false):
			# the skill deals its own blow (its notches, its numbers); the cut only finds what it crosses
			if on_hit.is_valid():
				on_hit.call(m, 0.0)
		else:
			var o := opts.duplicate()
			o["melee"] = true
			dealt = Combat.hit_monster(m, dmg, "phys", hero.tp, o)
		var k := float(row.get("knockback", 0)) * KNOCK_YD_S * (2.0 if m.dead else 1.0)
		if m.has_method("knock") and k > 0.0:
			m.knock(hero.tp, k)
		load("res://core/cm_sound.gd").play(hero, str(row.get("hit_sound", "")) if row.get("hit_sound") != null else "", -3.0)
		Game.hitstop(0.03 + 0.012 * float(row.get("knockback", 0)))
		if on_hit.is_valid() and not opts.get("cb_only", false):
			on_hit.call(m, dealt)

func _fx(phase: String, c: Vector2, dir: Vector2, p: float) -> void:
	if fx == null:
		return
	var frames: Array = fx_post if (phase == "post" and not fx_post.is_empty()) else fx_frames
	if phase == "pre" or frames.is_empty():
		fx.visible = false
		return
	fx.visible = true
	var i := 0
	if phase == "post":
		var post := float(row.get("time_post", 0.2))
		var pre := float(row.get("time_pre", 0))
		var atk := float(row.get("time_atk", 0.12))
		i = clampi(int((t - pre - atk) / maxf(0.001, post) * frames.size()), 0, frames.size() - 1)
	var f: Dictionary = frames[i]
	fx.texture = f["tex"]
	fx.region_rect = f["rect"]
	fx.offset = (f["off"] as Vector2) - (f["orig"] as Vector2) * 0.5
	# Cursemark draws the cut on the hitbox's line, turned to it, mirrored top-to-bottom when facing left
	fx.position = Iso.to_screen(c) + Vector2(0, -40)
	fx.rotation = dir.angle()
	fx.scale = Vector2(U, U * (-1.0 if face < 0 else 1.0))
	if fx_glow:
		var gf: Array = fx_glow.get_meta("frames")
		var g: Dictionary = gf[mini(i, gf.size() - 1)]
		fx_glow.texture = g["tex"]
		fx_glow.region_rect = g["rect"]
		fx_glow.offset = (g["off"] as Vector2) - (g["orig"] as Vector2) * 0.5
