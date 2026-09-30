class_name LanternUnit
extends Node2D
## The Wickbound (zz_zy_lanclip64.js): the hero's lantern is its own small, unhittable follower. No lantern in the
## Godmarrow burns oil; each is lit with a soul that chose to be kept. It floats at shoulder height, drifts a little behind
## and to one side as you walk, comes round to your side when you stop, idles in slow loops, bobs on its own breath and
## leans with its motion. It throws no shadow; it is the light. The pool of light lies under it (world/dark_layer.gd reads
## tp), and its glass breathes and gutters with the flame (the lantern's mood).

const WHO := {"hemomancer": "iron", "animancer": "gold"}
var hero: Hero
var tp := Vector2.ZERO           # tiles
var v := Vector2.ZERO
var md := Vector2(0.7, 0.7)      # the way the hero was last going
var last_hero := Vector2.INF
var z := 20.0                    # height, world px
var tilt := 0.0
var ph := 0.0
var spr: Sprite2D
var t := 0.0

func setup(h: Hero) -> void:
	hero = h
	ph = randf() * TAU
	tp = h.tp + Vector2(0.35, -0.35)
	var who: String = WHO.get(h.cls, "gold")
	var e: Dictionary = Assets.piece("lanterns", who)
	spr = Sprite2D.new()
	spr.texture = Assets.tex(e.get("png", "lanterns/gold.png"))
	spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	spr.centered = false
	var k := float(e.get("k", 4))
	spr.scale = Vector2.ONE * (4.0 / k)
	add_child(spr)

## the glass, in screen space (where the light comes from)
func glass_screen() -> Vector2:
	return Iso.to_screen(tp) + Vector2(0, -z * 4.0 + 12.0)

func _process(dt: float) -> void:
	if hero == null or not is_instance_valid(hero):
		return
	t += dt
	visible = not hero.dead
	if last_hero == Vector2.INF or tp.distance_to(hero.tp) > 4.0:
		tp = hero.tp + Vector2(0.35, -0.35)
		v = Vector2.ZERO
		last_hero = hero.tp
	dt = minf(dt, 0.05)
	if dt <= 0.0:
		return
	var hv := (hero.tp - last_hero) / dt
	last_hero = hero.tp
	var hs := hv.length()
	if hs > 0.4:
		md = (md + (hv / hs - md) * minf(1.0, dt * 6.0)).normalized()
	# where it wants to be: walking, a little behind and to the side; standing, at your side in slow loops
	var mv := minf(1.0, hs / 2.5)
	var perp := Vector2(-md.y, md.x)
	var tt := t + ph
	var back := 0.08 + 0.22 * mv
	var side := 0.4 - 0.08 * mv
	var wander := Vector2(sin(tt * 0.37) * 0.1 + sin(tt * 0.91) * 0.04, cos(tt * 0.29) * 0.1 + cos(tt * 0.73) * 0.04)
	var target := hero.tp - md * back + perp * side + wander * (1.0 - mv)
	# a soft, slightly floaty spring
	v += ((target - tp) * 30.0 - v * 9.0) * dt
	tp += v * dt
	var d := tp.distance_to(hero.tp)
	if d > 0.75:
		tp = hero.tp + (tp - hero.tp) / d * 0.75
	z = 20.0 + sin(tt * 1.55) * 1.6 + sin(tt * 0.6) * 0.8
	var svx := (v.x - v.y) * 72.0 / 4.0
	tilt += (clampf(-svx * 0.004, -0.35, 0.35) - tilt) * minf(1.0, dt * 5.0)
	position = Iso.to_screen(tp)
	if spr and spr.texture:
		var w := spr.texture.get_width() * spr.scale.x
		var h := spr.texture.get_height() * spr.scale.y
		spr.position = Vector2(-w / 2.0, -z * 4.0 - h * 0.35)
		spr.rotation = tilt
		spr.flip_h = hero.face < 0
		# the glass breathes with the flame and the lantern's mood
		var f := 0.85 + 0.1 * sin(t * 5.1) + 0.05 * sin(t * 13.0)
		spr.self_modulate = Color(f + 0.15, f + 0.12, f + 0.1)
