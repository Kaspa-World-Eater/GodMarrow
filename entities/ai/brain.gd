class_name Brain
extends RefCounted
## The shared behaviour of every creature (checklist 15.2): sleeping and loitering about its spot, waking by sight
## (7.5 yd, less at low level or with the wick dimmed), packmates waking one by one, attack tokens, and the standard
## melee rhythm: chase -> wind-up -> strike -> recover -> gap. Each AI kind overrides what it needs (entities/ai/*.gd).

var state := "sleep"
var st := 0.0            # time in the state / timer
var loiter_t := 0.0
var loiter_to := Vector2.ZERO
var aim := Vector2.ZERO  # where a strike lands
var wind := 0.5
var rec := 0.7
var reach := 0.95
var gap := 0.3
var wake_delay := -1.0
var token := false
var struck := false

static var TOKENS := {}  # zone instance id -> number of melee tokens held

static func make(m: Monster) -> Brain:
	var path := "res://entities/ai/ai_%s.gd" % m.ai
	var b: Brain
	if ResourceLoader.exists(path):
		b = load(path).new()
	else:
		b = Brain.new()
	b.init(m)
	return b

func init(m: Monster) -> void:
	var a = m.kd.get("attack")
	if a is Dictionary:
		wind = _num(a.get("windup_s"), 0.5)
		rec = _num(a.get("recover_s"), 0.7)
		reach = _num(a.get("range_yd"), 0.95)
	loiter_to = m.home
	loiter_t = randf_range(0.5, 3.0)

static func _num(v, fb: float) -> float:
	return float(v) if (v is float or v is int) else fb

# ------------------------------------------------------------------ hooks a kind may override
func damage_taken_mult(m: Monster, elem: String, from: Vector2, opts: Dictionary) -> float:
	return 1.0

func on_hit(m: Monster, d: float, from: Vector2, opts: Dictionary) -> void:
	if state == "sleep":
		wake(m)

func on_reel(m: Monster) -> void:
	if state == "wind":
		state = "recover"
		st = rec

func on_death(m: Monster) -> void:
	_release_token(m)

func tick(m: Monster, dt: float) -> void:
	var h := m.hero()
	if h == null:
		_anim(m, dt)
		return
	if not m.walks_now():
		m.buried = true
		_anim(m, dt)
		return
	elif m.buried and state != "burrowed":
		m.buried = false
	if not m.can_act():
		m.spr.play("hit" if m.spr.set.has("hit") else "idle")
		m.spr.step(dt)
		return
	if state == "sleep":
		_sleep(m, h, dt)
	else:
		think(m, h, dt)
	_anim(m, dt)

## the awake behaviour: the standard melee rhythm. Kinds override this.
func think(m: Monster, h: Hero, dt: float) -> void:
	melee_rhythm(m, h, dt)

# ------------------------------------------------------------------ sleep, loiter, wake
func wake_range(m: Monster, h: Hero) -> float:
	var r := 7.5
	if h.st.level <= 3:
		r *= 0.7
	elif h.st.level <= 8:
		r *= 0.85
	if h.st.dim_wick:
		r *= 0.7
	return r

func _sleep(m: Monster, h: Hero, dt: float) -> void:
	if wake_delay >= 0.0:
		wake_delay -= dt
		if wake_delay < 0.0:
			wake(m)
			return
	var d := m.tp.distance_to(h.tp)
	if d < wake_range(m, h) and not h.dead and m.zone.sight_clear(m.tp, h.tp):
		wake(m)
		return
	# loiter: small hops about the spot
	loiter_t -= dt
	if loiter_t <= 0.0:
		loiter_t = randf_range(1.2, 3.0)
		var a := randf() * TAU
		loiter_to = m.home + Vector2(cos(a), sin(a)) * randf_range(0.5, 2.6)
	if m.tp.distance_to(loiter_to) > 0.1:
		m.step_toward(loiter_to, dt, m.speed * 0.35)

func wake(m: Monster) -> void:
	if state != "sleep":
		return
	state = "chase"
	st = 0.0
	m.awake = true
	if m.boss:
		Bus.boss_woke.emit(m)
	# packmates within 10 yd wake one by one
	for o in m.get_tree().get_nodes_in_group("monsters"):
		if o != m and o.pack == m.pack and o.brain and o.brain.state == "sleep" and o.brain.wake_delay < 0.0:
			var d: float = o.tp.distance_to(m.tp)
			if d < 10.0:
				o.brain.wake_delay = randf_range(0.35, 1.6) + 0.08 * d

# ------------------------------------------------------------------ attack tokens
func max_tokens(m: Monster) -> int:
	return mini(7, int(round((3 + floori(m.level / 5.0)) * 1.2)))

func _key(m: Monster) -> int:
	return m.zone.get_instance_id()

func take_token(m: Monster) -> bool:
	if token:
		return true
	var k := _key(m)
	var n: int = TOKENS.get(k, 0)
	if n < max_tokens(m):
		TOKENS[k] = n + 1
		token = true
	return token

func _release_token(m: Monster) -> void:
	if token:
		var k := _key(m)
		TOKENS[k] = maxi(0, TOKENS.get(k, 1) - 1)
		token = false

# ------------------------------------------------------------------ the standard melee rhythm
func melee_rhythm(m: Monster, h: Hero, dt: float, spd_k: float = 1.0) -> void:
	st -= dt
	var d := m.tp.distance_to(h.tp)
	match state:
		"chase":
			if h.dead:
				state = "home"
				return
			if d > 26.0:
				state = "home"
				return
			if d <= reach + m.radius:
				if take_token(m):
					state = "wind"
					st = wind
					aim = h.tp
					m.look(h.tp - m.tp)
				else:
					_circle(m, h, dt)
			else:
				if not take_token(m) and d < 3.0:
					_circle(m, h, dt)
				else:
					_approach(m, h.tp, dt, spd_k)
		"wind":
			m.look(h.tp - m.tp)
			aim = h.tp
			if st <= 0.0:
				state = "strike"
				st = 0.18
				struck = false
		"strike":
			if not struck:
				struck = true
				strike(m, h)
			if st <= 0.0:
				state = "recover"
				st = rec
		"recover":
			if st <= 0.0:
				state = "gap"
				st = gap
				if randf() < 0.5:
					_release_token(m)
					st = randf_range(0.8, 1.8)
		"gap":
			if st <= 0.0:
				state = "chase"
		"home":
			_release_token(m)
			if m.step_toward(m.home, dt) == false or m.tp.distance_to(m.home) < 0.5:
				state = "sleep"
		_:
			state = "chase"

## a strike lands if the hero is within 0.8 yd of the aim point
func strike(m: Monster, h: Hero) -> void:
	if h.tp.distance_to(aim) <= 0.8 + h.radius and h.tp.distance_to(m.tp) <= reach + m.radius + 0.6:
		Combat.hit_hero(h, m.roll_damage(), "phys", m.tp)

func _approach(m: Monster, p: Vector2, dt: float, spd_k: float = 1.0) -> void:
	if m.zone.line_clear(m.tp, p) or m.flying:
		m.step_toward(p, dt, m.move_speed() * spd_k)
	else:
		if not has_meta_path(m) or path_t <= 0.0:
			path = m.zone.path(m.tp, p)
			path_i = 1 if path.size() > 1 else 0
			path_t = 0.6
		path_t -= dt
		if path_i < path.size():
			if m.tp.distance_to(path[path_i]) < 0.2:
				path_i += 1
			if path_i < path.size():
				m.step_toward(path[path_i], dt, m.move_speed() * spd_k)

var path := PackedVector2Array()
var path_i := 0
var path_t := 0.0
func has_meta_path(m: Monster) -> bool:
	return path.size() > 0

## without a token: hold a loose ring about the hero and feint
func _circle(m: Monster, h: Hero, dt: float) -> void:
	var off := m.tp - h.tp
	var r := maxf(1.8, off.length())
	var a := atan2(off.y, off.x) + dt * 0.6 * (1.0 if (m.get_instance_id() % 2) == 0 else -1.0)
	var want := h.tp + Vector2(cos(a), sin(a)) * clampf(r, 1.8, 2.6)
	m.step_toward(want, dt, m.move_speed() * 0.6)
	m.look(h.tp - m.tp)

# ------------------------------------------------------------------ drawing
func _anim(m: Monster, dt: float) -> void:
	var a := "idle"
	match state:
		"wind":
			a = "wind" if m.spr.set.has("wind") else "atk"
		"strike":
			a = "atk"
		"chase", "home":
			a = "walk"
		"sleep":
			a = "walk" if m.tp.distance_to(loiter_to) > 0.1 else "idle"
	m.spr.play(a)
	var k := 1.0
	if a == "walk":
		k = m.move_speed() / maxf(0.5, float(m.kd.get("speed_yd_s", 1.5)))
	m.spr.step(dt, k)
