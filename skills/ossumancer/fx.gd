extends Node2D
## The Ossuarch's transient things, drawn from his skill book's lists every frame (skills/ossumancer/*.gd).
## On the floor: grit where bone tears out of the ground. Above: the Mantle (shards hanging about him in a loose,
## slow drift, more as it fills), shards flying in to him, Bone Lances grown dead straight, small words.
## Bone is matter, never light: pale, flat, stepped at the pixel grain. No glow, no trails.

const U := preload("res://ui/uikit.gd")
const P := 4.0                # the pixel grain
var book
var floor_mode := false

const BONE := Color8(232, 226, 208)
const BONE_M := Color8(196, 188, 164)
const BONE_D := Color8(140, 132, 112)
const GRIT := Color8(92, 86, 74)

func _process(_dt: float) -> void:
	if book == null or (book.fx_air != self and book.fx_floor != self):
		queue_free()
		return
	queue_redraw()

static func S(tp: Vector2, z: float = 0.0) -> Vector2:
	return Iso.to_screen(tp) + Vector2(0, -z * 4.0)

func px(p: Vector2, col: Color, n: float = 1.0) -> void:
	draw_rect(Rect2(Vector2(floorf(p.x / P) * P, floorf(p.y / P) * P), Vector2(P * n, P * n)), col)

## a sliver of bone from a to b in the grain: a light edge on a darker body
func sliver(a: Vector2, b: Vector2, col: Color, w: float = 1.0) -> void:
	var n := maxi(1, int(a.distance_to(b) / P))
	for i in n + 1:
		var q := a.lerp(b, float(i) / n)
		px(q, col if i < n else BONE, w)

func _draw() -> void:
	if book == null or book.zone == null or book.hero == null:
		return
	if floor_mode:
		for g in book.grit:
			var k: float = clampf(g["t"] / 0.4, 0.0, 1.0)
			px(S(g["tp"]), Color(GRIT, 0.8 * k))
		return
	var hero = book.hero
	var t: float = book.time
	# the Mantle: shards hanging about him, drifting slowly round at hip to shoulder height
	var n := mini(int(book.shards), 40)
	for i in n:
		var s := i * 2.399
		var a := s + t * (0.35 + 0.04 * (i % 5)) * (1.0 if i % 2 else -1.0)
		var r := 0.55 + 0.35 * fmod(s * 0.61, 1.0) + 0.1 * sin(t * 0.7 + s)
		var z := 6.0 + 20.0 * fmod(s * 0.37, 1.0) + 2.0 * sin(t * 1.3 + s)
		var c: Vector2 = S(hero.tp + Vector2(cos(a), sin(a)) * r, z)
		var d := Vector2(cos(a + 1.3), sin(a + 1.3) * 0.5) * 6.0
		sliver(c - d, c + d, BONE_M if i % 3 else BONE_D)
	# shards flying in
	for b in book.motes:
		var c := S(b["tp"], b["z"])
		var to: Vector2 = S(hero.tp, 6.0) - c
		var d := to.normalized() * 6.0 if to.length() > 0.1 else Vector2(6, 0)
		sliver(c - d, c + d, BONE_M)
	# Bone Lances: a long straight spear of packed bone
	for sp in book.spears:
		var c := S(sp["tp"], 8.0)
		var d: Vector2 = Iso.to_screen(sp["v"].normalized()) .normalized() * (10.0 if sp["small"] else 26.0)
		sliver(c - d, c + d, BONE_M, 1.0 if sp["small"] else 2.0)
	# small words
	var font = U.font("italic")
	for w in book.words:
		var kw: float = clampf(w["t"] / 0.4, 0.0, 1.0)
		var pw := S(w["tp"], 30.0 + (1.0 - w["t"]) * 10.0)
		var wd := font.get_string_size(w["s"], HORIZONTAL_ALIGNMENT_LEFT, -1, 22).x
		draw_string(font, pw + Vector2(-wd / 2.0 + 1, 1), w["s"], HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color(0, 0, 0, 0.7 * kw))
		draw_string(font, pw + Vector2(-wd / 2.0, 0), w["s"], HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color(w["col"], kw))
