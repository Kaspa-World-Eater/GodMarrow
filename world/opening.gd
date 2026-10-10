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
