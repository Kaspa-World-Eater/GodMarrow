extends Node2D
## A title stage: "the Stranger's Box". The user's own animation of the Stranger (art/reading/stranger_sheet.webp,
## 121 frames of 320x270, shown x4) crouched in the ruin beside his little fire, the box of cards before him. The five
## orders lie face up across the lid, over the old spill; the fire throws its light across them and sends up embers.
## Hover a card and it rises off the lid and turns to you. The painting's left edge goes down into the dark, where the
## words stand.
## The stage API (ui/title.gd): order_at(p), label_at(i), hint(); T is the title (mode, fig_hover, order_i, t).

const SK := 4.0
const FW := 320
const FH := 270
const FPS := 10.0
const X0 := 640.0                  # where the painting starts on screen
const MARROW := Color("#c9974a")
const DARK := Color(0.01, 0.01, 0.015)
const FIRE := Vector2(1862, 820)   # the fire, on screen
## the five orders across the lid (screen px, the card's centre as it lies; its turn)
const LID := [
	["drop", Vector2(790, 792), -0.22], ["mirror", Vector2(902, 776), -0.08], ["skull", Vector2(1012, 772), 0.03],
	["breath", Vector2(1122, 778), 0.12], ["bowl", Vector2(1230, 794), 0.26],
]
const CW := 84.0
const CH := 132.0

var T
var sheet: Texture2D
var paint: Node2D
var fx: Node2D
var add_fx: Node2D
var cards: Array = []
var motes: Array = []
var _glow: Texture2D

func hint() -> String:
	return "Or take a card from the Stranger's box."

func _ready() -> void:
	_glow = Lights.radial(128)
	sheet = load("res://art/reading/stranger_sheet.webp")
	paint = Node2D.new()
	paint.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	paint.draw.connect(_draw_paint)
	add_child(paint)
	for i in LID.size():
		var c: Array = LID[i]
		cards.append({"o": i, "at": c[1], "rot": c[2], "lift": 0.0, "tex": load("res://art/reading/cards/%s.png" % c[0]), "ph": randf() * TAU})
	fx = Node2D.new()
	fx.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	fx.draw.connect(_draw_fx)
	add_child(fx)
	add_fx = Node2D.new()
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	add_fx.material = mat
	add_fx.draw.connect(_draw_add)
	add_child(add_fx)

func _process(dt: float) -> void:
	var t: float = T.t
	for c in cards:
		var want := 1.0 if (T.mode == "main" or T.mode == "order") and (T.fig_hover == c["o"] or T.order_i == c["o"]) else 0.0
		c["lift"] = lerpf(c["lift"], want, minf(1.0, dt * 7.0))
	# embers off the fire; dust hanging in the dark of the ruin (screen px, on the painting's grain)
	if motes.size() < 40 and randf() < dt * 8.0:
		if randf() < 0.6:
			motes.append({"x": FIRE.x + randf_range(-20, 16), "y": FIRE.y - 10.0, "vx": randf_range(-18, 6), "vy": -40.0 - randf() * 50.0, "t": 0.0, "life": 1.2 + randf() * 1.8, "ember": true})
		else:
			motes.append({"x": X0 + 100.0 + randf() * 1100.0, "y": -4.0, "vx": randf_range(-3, 5), "vy": 10.0 + randf() * 14.0, "t": 0.0, "life": 60.0, "ember": false})
	for m in motes:
		m["t"] += dt
		m["x"] += (m["vx"] + sin(t * 1.2 + m["y"] * 0.02) * (14.0 if m["ember"] else 5.0)) * dt
		m["y"] += m["vy"] * dt
	motes = motes.filter(func(m): return m["t"] < m["life"] and m["y"] < 1084.0 and m["y"] > -8.0)
	paint.queue_redraw()
	fx.queue_redraw()
	add_fx.queue_redraw()

func _draw_paint() -> void:
	paint.draw_rect(Rect2(0, 0, 1920, 1080), DARK)
	if sheet == null:
		return
	var f := int(float(T.t) * FPS) % 121
	var src := Rect2((f % 11) * FW, (f / 11) * FH, FW, FH)
	paint.draw_texture_rect_region(sheet, Rect2(X0, 0, FW * SK, FH * SK), src)
	# its left edge goes down into the dark
	for k in 40:
		paint.draw_rect(Rect2(X0 + k * 8.0, 0, 8, 1080), Color(DARK, 1.0 - k / 40.0))

func _card_xform(c: Dictionary) -> Transform2D:
	var L: float = c["lift"]
	return Transform2D(lerpf(c["rot"], 0.0, L), Vector2(CW * lerpf(1.0, 1.5, L) / 54.0, CH * lerpf(0.5, 1.5, L) / 84.0), 0.0, c["at"] + Vector2(0, -170.0 * L))

func _draw_fx() -> void:
	var order := range(cards.size())
	order.sort_custom(func(a, b): return cards[a]["lift"] < cards[b]["lift"])
	for i in order:
		var c: Dictionary = cards[i]
		var L: float = c["lift"]
		fx.draw_set_transform(c["at"] + Vector2(-6, 8), c["rot"], Vector2(CW / 54.0, CH * 0.5 / 84.0))
		fx.draw_rect(Rect2(-27, -42, 54, 84), Color(0, 0, 0, 0.5 + 0.1 * L))
		fx.draw_set_transform_matrix(_card_xform(c))
		# lit from the fire at the right, more the nearer it lies
		var near: float = clampf(1.0 - (c["at"] as Vector2).distance_to(FIRE) / 1300.0, 0.0, 1.0)
		var lit: float = 0.42 + 0.3 * near + 0.1 * near * T._flick(c["ph"]) + 0.45 * L
		var dim := 0.6 if (T.mode == "main" and T.fig_hover >= 0 and c["o"] != T.fig_hover) else 1.0
		fx.draw_texture_rect(c["tex"], Rect2(-27, -42, 54, 84), false, Color(lit * dim * 1.05, lit * dim * 0.88, lit * dim * 0.72))
		if L > 0.05:
			fx.draw_rect(Rect2(-28, -43, 56, 86), Color(MARROW, 0.7 * L), false, 1.0)
	fx.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	for m in motes:
		var a: float = clampf(1.0 - m["t"] / m["life"], 0.0, 1.0)
		var p := Vector2(floorf(m["x"] / SK), floorf(m["y"] / SK)) * SK
		fx.draw_rect(Rect2(p, Vector2(SK, SK)), Color(1.0, 0.6 + 0.3 * a, 0.28, a) if m["ember"] else Color(0.4, 0.4, 0.46, 0.35))

func _draw_add() -> void:
	# the fire's light, breathing
	var g: float = T._flick(0.7)
	var r := 260.0 + 40.0 * g
	add_fx.draw_texture_rect(_glow, Rect2(FIRE - Vector2(r, r), Vector2(r, r) * 2.0), false, Color(1.0, 0.55, 0.25, 0.12 + 0.05 * g))
	# and what of it falls on the lifted card
	for c in cards:
		if c["lift"] > 0.05:
			var at: Vector2 = c["at"] + Vector2(0, -170.0 * c["lift"])
			add_fx.draw_texture_rect(_glow, Rect2(at - Vector2(110, 110), Vector2(220, 220)), false, Color(1.0, 0.6, 0.3, 0.08 * c["lift"]))

func order_at(p: Vector2) -> int:
	var best := -1
	var best_k := -INF
	for c in cards:
		var lp: Vector2 = _card_xform(c).affine_inverse() * p
		if Rect2(-30, -45, 60, 90).has_point(lp) and c["lift"] * 10.0 + c["o"] * 0.01 > best_k:
			best_k = c["lift"] * 10.0 + c["o"] * 0.01
			best = c["o"]
	return best

func label_at(i: int) -> Vector2:
	return (LID[i][1] as Vector2) + Vector2(0, -390)
