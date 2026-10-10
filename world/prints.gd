extends Node2D
## The sand answers the foot (Derek, 2026-10-10, of the cove: "no movement of the sand when we step"): on sand, each
## footfall (entities/hero.gd footfall) presses a print, left and right feet in turn along the heading, a small kick of
## sand thrown back from the toe; the prints are darker hollows with a lit rim on the side the light comes from, and the
## storm's wind fills them back in over half a minute. Positions in tiles; drawn on the zone's floor layer, in the game's
## art pixels. Made by core/main.gd on sand.

static var me = null

const LIFE := 30.0
const PX := 2.0               # the art pixel, the 2 x 2 grid: a print is about a third of a yard, about 40 x 16 units

var prints: Array = []        # {tp, dir, side, t}
var kicks: Array = []         # {p (screen), v, t, life}
var side := 1.0

func _enter_tree() -> void:
	me = self
	z_index = 2

func _exit_tree() -> void:
	if me == self:
		me = null

## a footfall at tile tp walking along dir (tiles)
func step(tp: Vector2, dir: Vector2) -> void:
	side = -side
	var d := dir.normalized() if dir.length() > 0.001 else Vector2(1, 1).normalized()
	var perp := Vector2(-d.y, d.x)
	var at := tp + perp * 0.09 * side
	prints.append({"tp": at, "dir": d, "t": 0.0})
	while prints.size() > 60:
		prints.pop_front()
	var q := Iso.to_screen(at)
	var back := Iso.vec(-d).normalized()
	for i in 5:
		kicks.append({"p": q + Vector2(randf_range(-6, 6), -4), "v": back * randf_range(20, 60) + Vector2(randf_range(-14, 14), randf_range(-50, -20)),
			"t": 0.0, "life": randf_range(0.35, 0.6)})

func _process(dt: float) -> void:
	for p in prints:
		p["t"] += dt
	prints = prints.filter(func(p): return p["t"] < LIFE)
	for k in kicks:
		k["t"] += dt
		k["v"] += Vector2(0, 180.0) * dt
		k["p"] += k["v"] * dt
	kicks = kicks.filter(func(k): return k["t"] < k["life"])
	queue_redraw()

func _draw() -> void:
	for p in prints:
		var fade := 1.0 - smoothstep(LIFE * 0.35, LIFE, float(p["t"]))
		var q := Iso.to_screen(p["tp"])
		var d: Vector2 = p["dir"]
		var sd := Iso.vec(d).normalized()           # the foot's length on screen
		var sp := Vector2(-sd.y, sd.x)              # its width
		# the hollow: an oval of whole pixels, heel and toe, darker; its rim lit toward the upper left
		for i in range(-9, 10):
			for j in range(-3, 4):
				var e := float(i * i) / 81.0 + float(j * j) / 9.0
				if e > 1.0:
					continue                                # an oval: the heel and the toe rounded
				var o := sd * (i * PX * 1.1) + sp * (j * PX * 1.2)
				var pp := ((q + o) / PX).floor() * PX
				var heel := 1.0 if i <= -2 else 0.85
				draw_rect(Rect2(pp, Vector2(PX, PX)), Color(0.02, 0.01, 0.02, 0.42 * fade * heel))
		# the sand pushed up at the toe and along the far side, catching the light
		for i in range(-5, 8):
			var rp := ((q + sd * (i * PX * 1.1) - sp * (4 * PX * 1.2)) / PX).floor() * PX
			draw_rect(Rect2(rp, Vector2(PX, PX)), Color(0.5, 0.45, 0.46, 0.18 * fade))
		for j in range(-2, 3):
			var toe := ((q + sd * (10 * PX * 1.1) + sp * (j * PX * 1.2)) / PX).floor() * PX
			draw_rect(Rect2(toe, Vector2(PX, PX)), Color(0.5, 0.45, 0.46, 0.2 * fade))
	for k in kicks:
		var a := 1.0 - float(k["t"]) / float(k["life"])
		var pp: Vector2 = (k["p"] / PX).floor() * PX
		draw_rect(Rect2(pp, Vector2(PX, PX)), Color(0.16, 0.14, 0.15, 0.75 * a))
