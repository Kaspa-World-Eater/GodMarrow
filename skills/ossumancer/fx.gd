extends Node2D
## The Ossuarch's transient things, drawn from his skill book's lists every frame (skills/ossumancer/*.gd).
## On the floor: grit where bone tears out of the ground. Above: the Mantle (shards hanging about him in a loose,
## slow drift, more as it fills), shards flying in to him, Bone Lances grown dead straight, small words.
## Bone is matter, never light: pale, flat, stepped at the pixel grain. No glow, no trails.

const U := preload("res://ui/uikit.gd")
const P := 3.0                # the pixel grain: the heroes' own (3 scene px an art pixel)
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
		# the Pale Lords' white waymarks
		for l in book.lords:
			var c := S(l["tp"])
			draw_rect(Rect2(c + Vector2(-14, -6), Vector2(28, 12)), Color(0.16, 0.15, 0.14, 0.5))
			draw_rect(Rect2(c + Vector2(-12, -14), Vector2(24, 12)), Color8(222, 218, 206))
			draw_rect(Rect2(c + Vector2(-12, -4), Vector2(24, 4)), Color8(170, 164, 150))
		# Marrow Siphon: the cone, scored in the dust
		for f in book.siph_fx:
			var k: float = clampf(f["t"] / 0.3, 0.0, 1.0)
			for side in [-0.75, 0.0, 0.75]:
				var d: Vector2 = f["dir"].rotated(side)
				sliver(S(f["tp"]), S(f["tp"] + d * f["R"] * (1.0 - 0.3 * absf(side))), Color(BONE_D, 0.6 * k))
		# Ossify's ring and the spurs' roots
		for f in book.spikes_fx:
			if f.get("ring", false):
				var k2: float = clampf(f["t"] / 0.5, 0.0, 1.0)
				for i in 24:
					var ang := i / 24.0 * TAU
					px(S(f["tp"] + Vector2(cos(ang), sin(ang)) * f["len"] * (1.0 - k2 * 0.3)), Color(BONE_M, 0.7 * k2))
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
	# Bone Lances: a long straight spear of packed bone (splinters and the Storm's shards are slivers)
	for sp in book.spears:
		var c := S(sp["tp"], 8.0)
		var u: Vector2 = Iso.to_screen(sp["v"].normalized()).normalized()
		if sp["small"]:
			sliver(c - u * 9.0, c + u * 9.0, BONE_M)
		else:
			lance(c, u, int(sp.get("tier", 0)), 1.0)
	# the lance growing at his side while he charges it
	if not book.charging.is_empty():
		var ch: Dictionary = book.charging
		var tier: int = ch["tier"]
		var nxt: float = book.LANCE_T[mini(tier, 2)]
		var prev: float = 0.0 if tier == 0 else book.LANCE_T[tier - 1]
		var grow := 1.0 if tier >= 3 else clampf((ch["t"] - prev) / maxf(0.01, nxt - prev), 0.0, 1.0)
		var dir: Vector2 = ch["at"] - hero.tp
		var u2: Vector2 = Iso.to_screen(dir.normalized() if dir.length() > 0.05 else Vector2(1, 1).normalized()).normalized()
		var side := Vector2(-u2.y, u2.x) * (1.0 if u2.x >= 0.0 else -1.0)
		var rise := clampf(ch["t"] / 0.2, 0.0, 1.0)
		lance(S(hero.tp, 4.0 + 10.0 * rise) + side * 16.0, u2, tier, 0.55 + 0.45 * grow)
	# Charnel Cages: ribs curving up round the ring, lumpy arms gripping inside
	for c in book.cages:
		var k: float = clampf((c["max"] - c["t"]) / 0.15, 0.0, 1.0) * clampf(c["t"] / 0.3, 0.0, 1.0)
		for i in 10:
			var ang: float = i / 10.0 * TAU + c["seed"]
			var base: Vector2 = c["tp"] + Vector2(cos(ang), sin(ang)) * c["R"]
			var top: Vector2 = c["tp"] + Vector2(cos(ang), sin(ang)) * c["R"] * 0.35
			sliver(S(base), S(top, 22.0 * k), BONE_M if i % 2 else BONE_D, 1.0)
		for i in 4:
			var ang2: float = i * 1.9 + c["seed"]
			var q: Vector2 = c["tp"] + Vector2(cos(ang2), sin(ang2)) * c["R"] * 0.5
			sliver(S(q), S(q, 12.0 * k) + Vector2(sin(book.time * 3.0 + i) * 3.0, 0), BONE_D)
	# spurs bursting from a wound: jagged, wild bone
	for f in book.spikes_fx:
		if f.get("ring", false):
			continue
		var k3: float = clampf(f["t"] / 0.5, 0.0, 1.0)
		var tip: Vector2 = f["tp"] + Vector2(cos(f["a"]), sin(f["a"])) * f["len"]
		sliver(S(f["tp"], 4.0), S(tip, 10.0 * k3), Color(BONE, k3))
	# Bone Rain: straight falling shards
	for r in book.rains:
		for d in r["drops"]:
			var c2 := S(d["tp"], d["z"] / 4.0)
			sliver(c2 - Vector2(0, 10), c2, BONE_M)
	# small words
	var font = U.font("italic")
	for w in book.words:
		var kw: float = clampf(w["t"] / 0.4, 0.0, 1.0)
		var pw := S(w["tp"], 30.0 + (1.0 - w["t"]) * 10.0)
		var wd := font.get_string_size(w["s"], HORIZONTAL_ALIGNMENT_LEFT, -1, 22).x
		draw_string(font, pw + Vector2(-wd / 2.0 + 1, 1), w["s"], HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color(0, 0, 0, 0.7 * kw))
		draw_string(font, pw + Vector2(-wd / 2.0, 0), w["s"], HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color(w["col"], kw))


## a lance of packed bone along u, after D2's Bone Spear but solid bone in our colours: a long barbed head tapering
## to a hard point, a thin shaft knuckled like a spine, a light edge on the upper side and shade below, a dark
## outline. From tier 1 a faint warmth of marrow about it that deepens with each tier (the user asked for this
## subtle glow, 2026-09-30); at tier 3 amber marrow shows through the core of the shaft.
func lance(c: Vector2, u: Vector2, tier: int, k: float) -> void:
	var half := int((12.0 + 4.0 * tier) * k)          # art pixels from the middle to either end
	var head := int((6 + 2 * tier) * clampf(k, 0.6, 1.0))
	var n := Vector2(-u.y, u.x)
	if n.y > 0.0:
		n = -n                                         # n points up the screen: the lit side
	if tier >= 1:
		for ring in 3:
			var rr := (half + 5.0 - ring * 2.5) * P
			var ww := (1.5 + tier * 1.2 - ring * 0.6) * P
			var pts := PackedVector2Array()
			for a_i in 20:
				var a := a_i / 20.0 * TAU
				pts.append(c + u * cos(a) * rr + n * sin(a) * ww)
			draw_colored_polygon(pts, Color(1.0, 0.86, 0.62, 0.03 * tier))
	var sw := 0 if tier < 2 else 1                     # half-width of the shaft (cells beside the core)
	var OUT := Color(0.16, 0.14, 0.12)
	var AMBER := Color(0.86, 0.62, 0.3)
	for i in range(-half, half + 1):
		var from_tip := half - i
		var hw := sw
		var barb := false
		if from_tip < head:
			# the head: widest at its base, straight taper to the point
			hw = int(round((sw + 2.0) * float(from_tip) / head))
			barb = from_tip == head - 1
		elif (i + half) % 5 == 0 and i > -half + 1:
			hw = sw + 1                                  # a knuckle of the spine
		for j in range(-hw - 1, hw + 2):
			var q := c + u * i * P + n * j * P
			var col := BONE_M
			if absi(j) == hw + 1:
				col = OUT
			elif hw > 0 and j == hw:
				col = BONE
			elif hw > 0 and j == -hw:
				col = BONE_D
			if tier >= 3 and from_tip >= head and j == 0:
				col = BONE_M.lerp(AMBER, 0.55)
			elif tier == 2 and from_tip >= head and j == 0 and (i + half) % 5 == 0:
				col = BONE_M.lerp(AMBER, 0.4)
			draw_rect(Rect2(Vector2(floorf(q.x / P) * P, floorf(q.y / P) * P), Vector2(P, P)), col)
		if barb:   # two barbs swept back from the head's base
			for side in [-1, 1]:
				for b in 2:
					var q2: Vector2 = c + u * (i - 1 - b) * P + n * side * (sw + 2 + b) * P
					draw_rect(Rect2(Vector2(floorf(q2.x / P) * P, floorf(q2.y / P) * P), Vector2(P, P)), BONE if side > 0 else BONE_D)
