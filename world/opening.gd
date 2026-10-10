extends Node
## The opening (Derek, 2026-10-10): "It should crawl from the pool, on its hands and knees, gore and blood streaming
## off, a cough of viscera before it struggles to stand up, then the player gets control." The new pilgrim's live body
## (entities/body3d.gd; tools/landkit/passes/the_newborn.md) begins under the blood at the pool's heart and is driven
## through its clips here, the player having none of it until it stands:
## under (still, beneath the surface) -> surfacing (crawling up out of it) -> crawl -> slip (a hand skids in the blood)
## -> crawl to the pool's edge -> retch (the third heave throws the viscera) -> rise (it fails once) -> the player's.
## Esc or Space skips to the end. Made by core/main.gd _nascent.

const DIR := Vector2(-0.25, -0.97)        # from the pool's heart toward the stair's foot (tools/landkit3d/cave3d.py)
const UNDER := 1.2                        # seconds still under the blood
const SINK := 0.95                        # how deep it lies (m)
const SURFACE := 2.6                      # seconds coming up through the surface
const CRAWL_RATE := 1.35                  # the crawl clip's pace
const SLIP_AT := 1.2                      # yards crawled when the hand slips
const CRAWL_D := 2.9                      # yards to the edge of the deep heart, where it stops
const RETCH_THROW := 2.05                 # tools/landkit3d/newborn_pose.py: the third heave

var main
var hero
var body: Body3D
var phase := "under"
var t := 0.0
var dist := 0.0
var start := Vector2.ZERO
var thrown := false
var _sink0 := SINK
var _shed := 0.0                          # the clock of the blood sheeting off it into the pool
var _beats: Dictionary = {}               # the rise's moments already struck in the pool

func _init(m, h, b: Body3D) -> void:
	main = m
	hero = h
	body = b

func _ready() -> void:
	hero.scripted = true
	start = hero.tp
	body.face_ground(DIR, true)
	body.sink = SINK
	body.play("crawl", 0.0, 0.0)

func _gore():
	var mg = main.zone.get_node_or_null("WorldObjects") if main.zone else null
	return mg.gore if mg else null

func _go(p: String) -> void:
	phase = p
	t = 0.0

func _crawl(dt: float) -> void:
	var v := Body3D.CRAWL_V * CRAWL_RATE
	var step := DIR.normalized() * v * dt
	hero.tp = main.zone.move(hero.tp, step, hero.radius)
	dist += v * dt

func _process(dt: float) -> void:
	if hero == null or not is_instance_valid(hero) or body == null or not is_instance_valid(body):
		queue_free()
		return
	t += dt
	var g = _gore()
	if g:
		g.drips = maxf(g.drips, 2.5)            # the blood streaming off it the whole way
	match phase:
		"under":
			if t >= UNDER:
				body.play("crawl", 0.0, CRAWL_RATE)
				_go("surfacing")
		"surfacing":
			body.sink = SINK * (1.0 - smoothstep(0.0, 1.0, t / SURFACE))
			_crawl(dt)
			if t >= SURFACE:
				body.sink = 0.0
				_go("crawl")
		"crawl":
			_crawl(dt)
			if not thrown and dist >= SLIP_AT and body.clip == "crawl" and not has_meta("slipped"):
				set_meta("slipped", true)
				body.play("slip", 0.18, 1.0)
				_go("slip")
			elif dist >= CRAWL_D:
				body.play("retch", 0.3, 1.0)
				_go("retch")
		"slip":
			if t >= body.length("slip") - 0.1:
				body.play("crawl", 0.25, CRAWL_RATE)
				_go("crawl")
		"retch":
			if not thrown and t >= RETCH_THROW:
				thrown = true
				if g:
					g.spew(hero.tp + DIR.normalized() * 0.45, DIR, 46, 7.0)
				Sfx.play("hurt", 0.7, 0.55)
				Sfx.play("fall_body", 0.45, 1.4)
			if t >= body.length("retch") - 0.05:
				body.play("rise", 0.2, 1.0)
				_go("rise")
		"rise":
			if t >= body.length("rise") - 0.05:
				_finish()
	_slosh(dt)

## the blood answering the body (Derek, 2026-10-10: "no blood sloshes around the new born as he gets out of the pool"):
## thick and slow, never a chop (world/pool_life.gd heave, shaders/pool_sim.gdshader):
## - surfacing, its back lifts the blood in a broad swell before it breaks through, and the swell runs out from it in
##   slow heavy rings, reflected by the stumps;
## - the blood sheets off it back into the pool, many small falls round its body, heavy at first and easing;
## - every blow the body gives the surface pushes it down: the skidding hand, the viscera thrown, the knee dropping back
##   as it fails to stand, and the blood falling off it as it stands at last.
func _slosh(dt: float) -> void:
	var pl = load("res://world/pool_life.gd").me
	# (GM_NOSLOSH=1 leaves the pool as it was, for an A/B look at what the body does to it)
	if pl == null or not is_instance_valid(pl) or OS.get_environment("GM_NOSLOSH") != "":
		return
	var tp: Vector2 = hero.tp
	var fwd := DIR.normalized()
	if phase == "surfacing":
		# the swell its back lifts, at the rate it comes up (the most as it breaks through the surface)
		var up := maxf(0.0, _sink0 - body.sink) / SINK
		pl.heave(tp, 3.2 * up, 7.0)
		pl.heave(tp + fwd * 0.5, 1.4 * up, 4.5)
	_sink0 = body.sink
	# the blood sheeting off it, once its back is out: heavy as it comes up, easing as it crawls and stands
	if body.sink < 0.55 and pl.depth_at(tp) > 0.01:
		var rate := 8.0 if phase == "surfacing" else (4.0 if phase in ["crawl", "slip"] else 3.0)
		_shed += dt * rate
		while _shed >= 1.0:
			_shed -= 1.0
			var a := randf() * TAU
			var r := randf_range(0.2, 0.45)
			pl.heave(tp + Vector2(cos(a), sin(a) * 0.8) * r, -randf_range(0.04, 0.07), randf_range(2.6, 3.4))
	# the blows, once each
	match phase:
		"slip":
			_strike(pl, "skid", t >= 0.3, [[tp + fwd * 0.55, -0.9, 4.0], [tp + fwd * 1.0, 0.5, 5.0]])
		"retch":
			_strike(pl, "throw", thrown, [[tp + fwd * 0.6, -0.8, 4.5]])
		"rise":
			_strike(pl, "heels", t >= 0.6, [[tp - fwd * 0.3, -0.6, 4.5]])         # it sits back onto its heels
			_strike(pl, "foot", t >= 2.5, [[tp + fwd * 0.35, -0.7, 3.5]])         # the right foot planted
			_strike(pl, "fail", t >= 3.75, [[tp, -1.6, 5.5], [tp - fwd * 0.4, -0.6, 4.0]])   # it drops back onto its knee
			_strike(pl, "stand", t >= 5.0, [[tp, 0.6, 6.0]])                      # up: the blood falling off it
	if phase == "rise" and t >= 5.0 and t < 5.6:
		_shed += dt * 14.0

func _strike(pl, key: String, now: bool, hits: Array) -> void:
	if not now or _beats.has(key):
		return
	_beats[key] = true
	for hh in hits:
		pl.heave(hh[0], hh[1], hh[2])

func _finish() -> void:
	body.sink = 0.0
	body.play("idle", 0.4, 1.0)
	hero.scripted = false
	var g = _gore()
	if g:
		g.drips = 8.0
	queue_free()

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and (ev.keycode == KEY_ESCAPE or ev.keycode == KEY_SPACE):
		get_viewport().set_input_as_handled()
		hero.tp = main.zone.move(start, DIR.normalized() * CRAWL_D, hero.radius)
		_finish()
