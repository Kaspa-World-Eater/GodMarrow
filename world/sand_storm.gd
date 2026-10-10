extends Node2D
## world/sand_storm.gd: the black sand blowing in off the Red, IN the world, not on the screen (Derek, 2026-10-09: the
## weather "happening on the world, not in the world" is wrong; MASTER_RULES 6: weather acts on the world by material).
## Each grain is a place on the ground (world tiles) a hand or two above it, carried along the storm's wind
## (core/gust.gd), thicker, faster and higher in each gust. It lives on the zone's floor layer, so the dark
## (world/dark_layer.gd) lies over it as over everything else: a grain shows only where a light reaches it (the
## lantern, a fire, a flash of the lightning, the dawn). A grain that meets anything standing (a bone, a stone, the
## cliff) stops there, so the sand gathers on the windward side of things and the lee stays clear; none blows over the
## Red. Made by world/weather.gd for a zone whose "weather" is "sandstorm". Kept in packed arrays: a few hundred
## grains, one short streak each.

const WPX := Iso.WPX         # screen px per web world px: a unit of length, never the drawn pixel
const AP := 2.0              # the art pixel: the 2 x 2 grid (MASTER_RULES 3.7)
const MAXG := 420
const SAND := Color(0.6, 0.57, 0.55)        # black sand's grain catching light (the dark makes the rest of it)

var zone: Zone
var hero: Node2D
var gt := PackedVector2Array()              # each grain's place (tiles)
var gh := PackedFloat32Array()              # its height above the ground (yards)
var gs := PackedFloat32Array()              # its speed (a factor)
var t := 0.0

func bind(z: Zone, h: Node2D) -> void:
	zone = z
	hero = h
	z_index = 10              # over the ground and its decals, under everything standing (the y-sorted layer)

func _process(dt: float) -> void:
	if zone == null or not is_instance_valid(zone) or hero == null or not is_instance_valid(hero):
		return
	t += dt
	Gust.step(dt)
	var g := clampf((Gust.k() - 0.15) / 0.75, 0.0, 1.0)
	var want := int(MAXG * (0.35 + 0.65 * g))
	var c: Vector2 = hero.get("tp")
	var lo := c - Vector2(16, 16)
	var hi := c + Vector2(16, 16)
	var wd: Vector2 = Gust.storm_dir
	var tries := 0
	while gt.size() < want and tries < 60:
		tries += 1
		var tp := Vector2(randf_range(lo.x, hi.x), randf_range(lo.y, hi.y))
		if t > 0.5:
			tp -= wd * randf_range(0.0, 5.0)                    # in from upwind
		if zone.is_solid(tp):
			continue
		gt.append(tp)
		gh.append(randf() * randf() * 0.3)
		gs.append(randf_range(0.7, 1.3))
	var spd := (2.0 + 9.0 * g) * dt
	var lift := g * 0.9 * dt
	var i := gt.size() - 1
	while i >= 0:
		var nt := gt[i] + wd * (spd * gs[i])
		if zone.is_solid(nt) or nt.x < lo.x - 3.0 or nt.y < lo.y - 3.0 or nt.x > hi.x + 3.0 or nt.y > hi.y + 3.0:
			# caught by what stands, or gone out of sight: the last grain takes its place
			var last := gt.size() - 1
			gt[i] = gt[last]
			gh[i] = gh[last]
			gs[i] = gs[last]
			gt.resize(last)
			gh.resize(last)
			gs.resize(last)
		else:
			gt[i] = nt
			gh[i] = clampf(gh[i] + lift * gs[i] - gh[i] * 1.4 * dt, 0.0, 1.4)
		i -= 1
	queue_redraw()

func _draw() -> void:
	var g := clampf((Gust.k() - 0.15) / 0.75, 0.0, 1.0)
	var head := Iso.vec(Gust.storm_dir).normalized()
	var col := Color(SAND, 0.35 + 0.4 * g)
	for i in gt.size():
		var p := Iso.to_screen(gt[i]) - Vector2(0, gh[i] * 21.0 * WPX)
		var n := 1.0 + floorf((1.0 + 3.0 * g) * gs[i])
		# one streak, trailing back along the wind, one art pixel thick on the 2 x 2 grid (its length as before)
		var q := p - head * (n * WPX)
		var x0 := floorf(minf(p.x, q.x) / AP) * AP
		var y0 := floorf(((p.y + q.y) * 0.5) / AP) * AP
		var ln := maxf(2.0 * AP, roundf(absf(p.x - q.x) / AP) * AP)
		draw_rect(Rect2(x0, y0, ln, AP), col)
		draw_rect(Rect2(x0 + AP, y0 + AP, maxf(AP, ln - 2.0 * AP), AP), Color(col, col.a * 0.5))   # its softer underside
