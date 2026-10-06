extends CanvasLayer
## Eyes in the dark (the fork; its own design, from Derek's rulings: eyes identify monsters, the eyeless are the jump
## scares; wiki 06 §3: what you can't see does the work). Drawn over the dark (cm_night is layer 5).
##  - Each faction's eyes are its own: you learn what is out there before it steps into the light.
##  - Only beyond your pool, only from what faces you, mostly by night; they catch the lantern harder the nearer they
##    stand to its edge; a hunting creature's eyes brighten and turn to follow you.
##  - The eyeless show nothing. When one that hunts you first breaks into your light, the frame jolts.

const PX := 4.0                 # world units per Cursemark px

## faction looks: colour, the shape (points as [dx, dy] in Cursemark px, about the eye point, for a body facing right),
## the blink (seconds between, length; 0 = never), drift (a spirit's slow wander)
const LOOK := {
	"forsaken": {"col": Color(0.95, 0.86, 0.55), "pts": [[-2, 0], [2, 0]], "blink": [3.5, 0.22], "drift": 0.0},
	"crusader": {"col": Color(0.86, 0.92, 1.0), "pts": [[-1, 0], [0, 0], [1, 0], [2, 0]], "blink": [0.0, 0.0], "drift": 0.0},
	"cultist": {"col": Color(1.0, 0.35, 0.85), "pts": [[-1, 0], [1, 0]], "blink": [1.2, 0.06], "drift": 0.0},
	"bound": {"col": Color(0.7, 1.0, 0.85), "pts": [[0, 0], [1, 0], [0, 1], [-1, 0]], "blink": [0.0, 0.0], "drift": 1.0},
	"blighted": {"col": Color(1.0, 0.68, 0.25), "pts": [[-2, 0], [-1, 0], [2, 0]], "blink": [5.0, 0.3], "drift": 0.0},
	"fungal": {"col": Color(0.65, 0.95, 0.85), "pts": [[-2, 0], [0, -1], [2, 0], [1, 1], [-1, 2]], "blink": [2.5, 0.4], "drift": 0.4},
	"starspawn": {"col": Color(0.45, 0.95, 1.0), "pts": [[-3, 0], [-1, -1], [1, 0], [3, -1], [0, 1], [2, 1]], "blink": [1.8, 0.1], "drift": 0.0},
	"corrupted": {"col": Color(0.75, 0.55, 1.0), "pts": [[-1, 0], [1, 0]], "blink": [0.9, 0.05], "drift": 0.0},
}
## no eyes at all: they come out of the dark unannounced
const EYELESS := ["blighted_root", "blighted_tree_body", "blighted_tree_hand", "blighted_tree_spike", "blighted_totem",
	"blighted_kopoeke", "corrupted_tentacle", "corrupted_nest", "corrupted_plant", "bound_phantom", "starspawn_hatchling",
	"training_dummy"]

var main
var canvas: Node2D
var state := {}               # monster -> {blink, s, seen_lit}
static var _head := {}        # sprite -> Vector2 eye point (Cursemark px from the frame's centre, facing right)

func _init(m) -> void:
	main = m

func _ready() -> void:
	layer = 6
	follow_viewport_enabled = true
	canvas = Node2D.new()
	canvas.draw.connect(_draw_eyes)
	add_child(canvas)

func _process(_dt: float) -> void:
	canvas.queue_redraw()

func _faction(sprite: String) -> String:
	for k in LOOK:
		if sprite.begins_with(k):
			return k
	return ""

## the eye point of a body: a fifth of the way down its stance, at the middle of what is drawn on that row
func _head_of(m) -> Vector2:
	var key := str(m.info.get("cm_sprite", ""))
	if _head.has(key):
		return _head[key]
	var p := Vector2(0, -10)
	var fr: Array = m.spr.set.get_frames("idle", "front")
	if fr.is_empty():
		fr = m.spr.set.get_frames("walk", "front")
	if not fr.is_empty():
		var at: AtlasTexture = fr[0][0]
		var off: Vector2 = fr[0][1]
		var img := at.get_image()
		if img:
			var used := img.get_used_rect()
			var y := used.position.y + int(used.size.y * 0.2)
			var xs: Array = []
			for x in range(used.position.x, used.end.x):
				if img.get_pixel(x, y).a > 0.5:
					xs.append(x)
			var cx: float = (float(xs[0]) + float(xs[xs.size() - 1])) * 0.5 if not xs.is_empty() else used.get_center().x
			p = Vector2(cx, y) + off
	_head[key] = p
	return p

func _draw_eyes() -> void:
	var z = main.zone
	var h = main.hero
	if z == null or not is_instance_valid(z) or not z.d.has("cm") or h == null or not is_instance_valid(h) or h.dead:
		return
	var now := Time.get_ticks_msec() / 1000.0
	var night := 1.0 - smoothstep(0.35, 0.8, Game.day_k())
	var R: float = h.light_radius()
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.dead or m.buried or not m.info.has("cm_sprite"):
			continue
		var sprite := str(m.info["cm_sprite"])
		var d: float = m.tp.distance_to(h.tp)
		var st: Dictionary = state.get(m, {})
		if st.is_empty():
			st = {"blink": now + randf_range(1.0, 4.0), "s": randf() * TAU, "lit": false}
			state[m] = st
		var hunting: bool = m.awake and m.brain != null and str(m.brain.state) in ["chase", "wind", "strike", "lwind", "charge", "lunge"]
		# the eyeless: no warning; the frame jolts the first time a hunting one comes into the light
		if EYELESS.has(sprite):
			if d < R * 0.85 and hunting and not st["lit"]:
				st["lit"] = true
				Game.shake(3.0)
				Game.hitstop(0.05)
			continue
		var fac := _faction(sprite)
		if fac == "" or night < 0.05:
			continue
		if d < R * 0.9 or d > R * 3.4:
			continue
		# facing you (a body only faces left or right)
		var dx: float = h.tp.x - m.tp.x
		if absf(dx) > 0.5 and signf(dx) != float(m.face):
			continue
		var L: Dictionary = LOOK[fac]
		var bl: Array = L["blink"]
		if float(bl[0]) > 0.0:
			if now > float(st["blink"]):
				if now > float(st["blink"]) + float(bl[1]):
					st["blink"] = now + float(bl[0]) * randf_range(0.6, 1.6)
				continue
		var edge := clampf((d - R * 0.9) / (R * 0.35), 0.0, 1.0) * clampf((R * 3.4 - d) / (R * 1.2), 0.0, 1.0)
		var near_k := 1.0 - clampf((d - R) / (R * 2.4), 0.0, 1.0) * 0.5     # nearer the edge, harder the catch
		var a := (0.95 if hunting else 0.5) * edge * near_k * night * (0.85 + 0.15 * sin(now * 3.0 + float(st["s"])))
		if a < 0.04:
			continue
		var eye := _head_of(m)
		if m.face < 0:
			eye.x = -eye.x
		var base: Vector2 = m.position + m.spr.position + eye * PX
		# a hunting creature's eyes turn toward you; a spirit's drift
		var look := Vector2.ZERO
		if hunting:
			look = (h.tp - m.tp).normalized() * PX
		if float(L["drift"]) > 0.0:
			look += Vector2(sin(now * 0.7 + float(st["s"])), cos(now * 0.53 + float(st["s"]))) * PX * float(L["drift"])
		var c: Color = L["col"]
		if OS.get_cmdline_user_args().has("--eyes_debug"):
			canvas.draw_rect(Rect2(m.position - Vector2(6, 6), Vector2(12, 12)), Color(1, 0, 0))
			canvas.draw_rect(Rect2(base - Vector2(6, 6), Vector2(12, 12)), Color(0, 1, 0))
			print("EYE ", sprite, " fac ", fac, " head ", eye, " a ", a)
		for p in L["pts"]:
			var q: Vector2 = base + look + Vector2(float(p[0]) * (-1.0 if m.face < 0 else 1.0), float(p[1])) * PX
			q = (q / PX).floor() * PX
			canvas.draw_rect(Rect2(q, Vector2(PX, PX)), Color(c.r, c.g, c.b, a))
			# a faint halo pixel round each, so they read as light, not paint
			canvas.draw_rect(Rect2(q - Vector2(PX, 0), Vector2(PX * 3, PX)), Color(c.r, c.g, c.b, a * 0.18))
	# forget the gone
	for k in state.keys():
		if not is_instance_valid(k):
			state.erase(k)
