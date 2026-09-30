extends CanvasLayer
## ui/title.gd: the title, "the Seer's Bowl". The old web title's chapel (zp_title.js), painted pixel by pixel and
## captured whole (tools/cap_chapel2.js -> art/ui/title_bowl.png, 480x270 shown x4): the dead god's stone face sunk in
## the wall, weeping blood down its cheeks into a tarnished bronze bowl on the altar. Here it lives again: a drop swells
## on the chin and falls, rings spread in the blood and bend the reflection of whoever looks down into it (a hooded
## figure; shaders/title_blood.gdshader), the god's dying breath spills from the mouth and pools on the altar
## (shaders/title_breath.gdshader), the candles gutter, embers rise and ash falls.
## Round the bowl lies a spill of tarot cards, most face down. Five lie face up: the orders. Hover one and it lifts
## and turns to you; click it and that order's page opens over the dimmed chapel (a large portrait, placeholders until
## the final paintings come; who they are in the Stranger's words; their own pilgrim to continue or begin anew).
## The words stand on the left: Continue (the pilgrim walked most lately) · The Codex · Options · Those Who Lent Their
## Hands · Leave. "Begin" opens the Reading (ui/reading.gd, character creation), the god already chosen here.

const U := preload("res://ui/uikit.gd")
const SaveIO := preload("res://core/save.gd")
const BONE := Color("#dcd3c2")
const BONE_D := Color("#a39a8b")
const ASH := Color("#6f685f")
const MARROW := Color("#c9974a")
const K := 4.0                           # screen px per chapel px
## the pilgrims: the user's paintings cut out and brought down to the chapel's own grain (tools/title_cut.py,
## tools/title_pix.py -> art/ui/pilgrim_*.png, shown x4). The two orders without a painting yet keep an empty place.
const PILGRIMS := [
	# kind, figure png ("" = an empty place), name, line, foot (screen px), fire side, playable, what lies at an empty place
	["hemomancer", "pilgrim_hemo", "The Hemomancer", "Opens the vein, and the vein answers.", Vector2(928, 864), 1, false, ""],
	["animancer", "pilgrim_mystic", "The Hollow Mystic", "Listens at mirrors. Keeps the dead on a thread.", Vector2(1152, 840), 1, true, ""],
	["ossumancer", "pilgrim_ossu", "The Ossuarch", "Counts the dead, and the dead stand up to be counted.", Vector2(1580, 840), -1, false, ""],
	["miasmancer", "", "The Shrine Keeper", "Folds the breath into paper, and the paper walks.", Vector2(1760, 880), -1, false, "charm"],
	["monk", "", "The Empty Hand", "Carries nothing. Strikes with that.", Vector2(1150, 1010), 1, true, "bowl"],
]
## the cards round the bowl (chapel px, the card's centre as it lies; its turn in radians). The orders' lie face up
## with their emblem (art/reading/cards); the rest lie face down, a spill from an old Reading.
const CARDS := [
	# order index (-1 = face down), emblem, at, turn
	[-1, "", Vector2(266, 180), 0.62], [-1, "", Vector2(416, 178), -0.5], [-1, "", Vector2(222, 232), 0.25],
	[-1, "", Vector2(460, 232), -0.35], [-1, "", Vector2(308, 256), 0.95], [-1, "", Vector2(378, 257), -0.8],
	[-1, "", Vector2(252, 212), 1.3],
	[0, "drop", Vector2(240, 204), -0.4], [1, "mirror", Vector2(280, 240), -0.18], [2, "skull", Vector2(340, 249), 0.04],
	[3, "breath", Vector2(400, 240), 0.2], [4, "bowl", Vector2(440, 204), 0.42],
]
const CW := 21.0                         # a card as it lies, in chapel px
const CH := 33.0
## each order's page. Portraits are placeholders: the user's paintings, cut out (art/ui/portrait_*.png); "" = still to paint.
const ORDER := {
	"animancer": {"god": "Of the Soul, the Veiled Crone", "portrait": "portrait_mystic", "draws": "Essence, and a choir of wisps", "ways": "Mirror · Soul · Thread",
		"text": "They listen at mirrors until something listens back. A Mystic keeps a few of the restless dead about her, wisps that dive at whatever comes near and grow back when spent, and ties the rest down with thread and needle. I walked a season beside one. She never once looked where she was going. The mirrors did that for her."},
	"hemomancer": {"god": "Of the Flesh, the Bleeding Maiden", "portrait": "portrait_hemo", "draws": "Vitae; every working costs him life", "ways": "Brood · Blood · Flesh",
		"text": "The Brotherhood of the Precious Wound pays for everything in blood, and their own first. What a Hemomancer opens, he keeps: a brood that crawls out of the cut, a golem of it, pools that drink what falls in them. They are gentle with strangers. I would still not sleep near one."},
	"ossumancer": {"god": "Of the Bone, Old Upright", "portrait": "portrait_ossu", "draws": "Marrow", "ways": "Ossuary · Bone · Carapace",
		"text": "The Pale Order counts the dead, and what they count stands up. An Ossuarch sends the bones of the fallen to walk ahead of him, wears the rest as plate, and throws the splinters. He does not bend. I once saw one carried home on a door, sitting upright, still counting."},
	"miasmancer": {"god": "Of the Breath, the Myriad", "portrait": "", "draws": "Miasma, breathed in and given back", "ways": "Miasma · Distortion · Death",
		"text": "The House of Eight Million keeps the small gods that ride the last breath out. A Keeper breathes in the spoiled air and gives it back as a violet haze, folds paper that walks, and reads Omens in what the breath leaves behind. She fights with a fan. Do not laugh at the fan."},
	"monk": {"god": "Of the Hush", "portrait": "", "draws": "An hourglass: amber sand by day, black sand by night", "ways": "Radiance · Absence · Destroyer",
		"text": "The Gilded Peak gave everything away, and the Empty Hand is what came down the stair after. He carries a lantern with a black flame and nothing else, and strikes with the sun or with its going. He did not ask my name. I think he would not have kept it."},
}

var main: Node
var root: Control
var add_fx: Node2D                 # additive light: the candles' halos, embers
var fx: Node2D                     # the cards, embers and ash
var fx_back: Node2D                # the candles' flames, the god's drop, sparks
var blood: ColorRect
var breath: ColorRect
var cards: Array = []              # {o, emb, at, rot, lift, tex}
var rings: Array = []              # rings spreading in the blood: {x, y, r, t}
var drops: Array = []
var sparks: Array = []
var motes: Array = []
var card_back: Texture2D
var rows: Array = []
var hover := -1
var fig_hover := -1
var mode := "main"                 # main | order | credits
var order_i := -1                  # the order whose page is open
var portraits := {}
var confirm_new := false
var t := 0.0
var leaving := -1.0
var codex: Control
var candles: Array = []
var embers: Array = []
var drop_t := 1.4
var chin := Vector2.ZERO
var _glow: Texture2D
var _test_done := false

const CREDITS := [
	["Sounds", ""],
	["Impact Sounds and RPG Audio", "Kenney (kenney.nl), CC0"],
	["Fire Crackling", "AntumDeluge, CC0 (OpenGameArt)"],
	["Rain (loopable)", "Ylmir, CC0 (OpenGameArt)"],
	["Loopable Dungeon Ambience", "JaggedStone, CC0 (OpenGameArt)"],
	["Wind", "Jonathan Shaw (InspectorJ), freesound.org, CC-BY 3.0; looped by AntumDeluge"],
	["Letters", ""],
	["IM Fell English", "Igino Marini, SIL Open Font License"],
	["Silkscreen", "Jason Kottke, SIL Open Font License"],
	["Engine", ""],
	["Godot Engine", "Juan Linietsky, Ariel Manzur and contributors, MIT"],
]

func _init(m: Node) -> void:
	main = m

func _ready() -> void:
	layer = 25
	process_mode = Node.PROCESS_MODE_ALWAYS
	_glow = Lights.radial(128)
	var bg := TextureRect.new()
	bg.texture = load("res://art/ui/title_bowl.png")
	bg.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	bg.size = Vector2(1920, 1080)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	var meta = JSON.parse_string(FileAccess.get_file_as_string("res://art/ui/title_bowl.json"))
	var pal := PackedVector3Array()
	if meta is Dictionary:
		for c in meta.get("candles", []):
			candles.append(Vector2(float(c[0]), float(c[1]) - float(c[2])) * K + Vector2(2, -2))
		var f: Array = meta.get("face", [340, 64, 125])
		chin = Vector2(float(f[0]) - 1.0, float(f[2]))
		for c in meta.get("blood", []):
			pal.append(Vector3(c[0], c[1], c[2]) / 255.0)
	# the blood's surface and the god's breath, on the chapel's pixel grid
	blood = ColorRect.new()
	blood.position = Vector2(340 - 75 - 1, 202 - 32 - 1) * K
	blood.size = Vector2(152, 66) * K
	blood.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bm := ShaderMaterial.new()
	bm.shader = load("res://shaders/title_blood.gdshader")
	bm.set_shader_parameter("refl", load("res://art/ui/title_refl.png"))
	bm.set_shader_parameter("pal", pal)
	blood.material = bm
	add_child(blood)
	fx_back = Node2D.new()          # the candles, the god's drop and its sparks
	fx_back.draw.connect(_draw_back)
	add_child(fx_back)
	breath = ColorRect.new()
	breath.position = Vector2(210, 94) * K
	breath.size = Vector2(260, 176) * K
	breath.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var brm := ShaderMaterial.new()
	brm.shader = load("res://shaders/title_breath.gdshader")
	breath.material = brm
	add_child(breath)
	card_back = load("res://art/reading/cards/_back.png")
	for c in CARDS:
		var tex: Texture2D = card_back
		if c[0] >= 0:
			tex = load("res://art/reading/cards/%s.png" % c[1])
		cards.append({"o": c[0], "at": (c[2] as Vector2) * K, "rot": c[3], "lift": 0.0, "tex": tex, "ph": randf() * TAU})
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
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.draw.connect(_draw_ui)
	root.gui_input.connect(_gui)
	add_child(root)
	codex = load("res://ui/codex.gd").new()
	codex.visible = false
	codex.on_close = func(): root.visible = true
	add_child(codex)
	_build()

func _build() -> void:
	rows.clear()
	match mode:
		"main":
			var last := SaveIO.latest()
			if last != "":
				rows.append(["Continue: " + _order_name(last), "continue"])
			rows.append(["The Codex", "codex"])
			rows.append(["Options", "options"])
			rows.append(["Those Who Lent Their Hands", "credits"])
			rows.append(["Leave", "leave"])
		"order":
			var p: Array = PILGRIMS[order_i]
			if p[6]:
				if SaveIO.exists(p[0]):
					rows.append(["Continue this pilgrim", "order_continue"])
					rows.append(["Forget them, and begin anew?" if confirm_new else "Begin anew", "order_new"])
				else:
					rows.append(["Begin", "order_new"])
			rows.append(["Back", "back"])
		_:
			rows.append(["Back", "back"])

func _order_name(kind: String) -> String:
	for p in PILGRIMS:
		if p[0] == kind:
			return p[2]
	return kind

func _row_rect(i: int) -> Rect2:
	var y0 := 520.0 if mode == "main" else (820.0 if mode == "order" else 900.0)
	return Rect2(150, y0 + i * 58.0, 640, 50)

# ------------------------------------------------------------------ living

func _flick(s: float) -> float:
	return 0.5 + 0.5 * sin(t * 9.0 + s) * sin(t * 5.3 + s * 2.0)

func _process(dt: float) -> void:
	t += dt
	if OS.has_environment("GM_TITLE_ACT") and t > 1.0 and not _test_done:
		_test_done = true
		for a in OS.get_environment("GM_TITLE_ACT").split(","):
			_act(a)
	if leaving >= 0.0:
		leaving += dt
		if leaving >= 1.2:
			main.title_done()
			queue_free()
			return
	# the cards: the chosen one lifts and turns up to you
	for c in cards:
		var want := 1.0 if c["o"] >= 0 and (mode == "main" or mode == "order") and (fig_hover == c["o"] or order_i == c["o"]) else 0.0
		c["lift"] = lerpf(c["lift"], want, minf(1.0, dt * 7.0))
	# a drop swells on the god's chin, lets go, and falls into the bowl
	drop_t -= dt
	if drop_t <= 0.0:
		drop_t = randf_range(1.8, 4.2)
		drops.append({"x": chin.x, "y": chin.y + 1.0, "ty": 202.0 - 4.0 + randf() * 10.0, "v": 10.0})
	for d in drops:
		d["v"] += 380.0 * dt
		d["y"] += d["v"] * dt
		if d["y"] >= d["ty"]:
			d["done"] = true
			rings.append({"x": d["x"], "y": d["ty"], "r": 0.0, "t": 0.0})
			for k in 6:
				sparks.append({"x": d["x"], "y": d["ty"], "vx": randf_range(-17, 17), "vy": -34.0 - randf() * 34.0, "t": 0.0})
			if randf() < 0.7:
				Sfx.play("glass", 0.08, randf_range(2.0, 2.4))
	drops = drops.filter(func(d): return not d.get("done", false))
	for r in rings:
		r["t"] += dt
		r["r"] += dt * 14.0 / (1.0 + r["t"] * 0.6)
	rings = rings.filter(func(r): return r["t"] < 3.4)
	for sp in sparks:
		sp["t"] += dt
		sp["vy"] += 260.0 * dt
		sp["x"] += sp["vx"] * dt
		sp["y"] += sp["vy"] * dt
	sparks = sparks.filter(func(sp): return sp["t"] < 0.35)
	var ra := []
	for i in 8:
		if i < rings.size():
			ra.append(Vector4(rings[i]["x"], rings[i]["y"], rings[i]["r"], rings[i]["t"]))
		else:
			ra.append(Vector4(0, 0, 0, -1))
	(blood.material as ShaderMaterial).set_shader_parameter("rings", ra)
	(blood.material as ShaderMaterial).set_shader_parameter("time", t)
	(breath.material as ShaderMaterial).set_shader_parameter("time", t)
	# embers off the candles, ash drifting down through the dark (chapel px)
	if motes.size() < 46 and randf() < dt * 9.0:
		if randf() < 0.55 and not candles.is_empty():
			var c: Vector2 = candles[randi() % candles.size()] / K
			motes.append({"x": c.x, "y": c.y - 2.0, "vx": randf_range(-2, 2), "vy": -8.0 - randf() * 10.0, "t": 0.0, "life": 1.4 + randf() * 2.2, "ember": true})
		else:
			motes.append({"x": 290.0 + randf() * 120.0, "y": -2.0, "vx": randf_range(-1, 2), "vy": 3.0 + randf() * 4.0, "t": 0.0, "life": 20.0, "ember": false})
	for m in motes:
		m["t"] += dt
		m["x"] += (m["vx"] + sin(t * 1.3 + m["y"] * 0.1) * (3.0 if m["ember"] else 1.5)) * dt
		m["y"] += m["vy"] * dt
	motes = motes.filter(func(m): return m["t"] < m["life"] and m["y"] < 272.0 and m["y"] > -4.0)
	fx.queue_redraw()
	fx_back.queue_redraw()
	add_fx.queue_redraw()
	root.queue_redraw()

func _snap(p: Vector2) -> Vector2:
	return Vector2(floorf(p.x / K) * K, floorf(p.y / K) * K)

## the cards round the bowl: face down, or face up for the orders; the chosen one lifts, straightens and turns to you
func _card_xform(c: Dictionary) -> Transform2D:
	var L: float = c["lift"]
	var rot: float = lerpf(c["rot"], 0.0, L)
	var sy := lerpf(0.55, 1.0, L)                 # lying flat, it is foreshortened; lifted, it stands
	var at: Vector2 = c["at"] + Vector2(0, -70.0 * L)
	return Transform2D(rot, Vector2(CW * K / 54.0, CH * K * sy / 84.0), 0.0, at)

func _draw_fx() -> void:
	var order := range(cards.size())
	order.sort_custom(func(a, b): return cards[a]["lift"] < cards[b]["lift"] if absf(cards[a]["lift"] - cards[b]["lift"]) > 0.01 else cards[a]["at"].y < cards[b]["at"].y)
	for i in order:
		var c: Dictionary = cards[i]
		var xf := _card_xform(c)
		var L: float = c["lift"]
		# its shadow on the stone
		fx.draw_set_transform(c["at"] + Vector2(6, 8), c["rot"], Vector2(CW * K / 54.0, CH * K * 0.55 / 84.0))
		fx.draw_rect(Rect2(-27, -42, 54, 84), Color(0, 0, 0, 0.45 + 0.1 * L))
		fx.draw_set_transform_matrix(xf)
		var near_bowl: float = clampf(1.0 - (c["at"] as Vector2).distance_to(Vector2(1360, 800)) / 700.0, 0.0, 1.0)
		var lit := (0.5 + 0.25 * near_bowl + 0.08 * _flick(c["ph"])) + 0.45 * L
		var dim := 0.6 if (mode == "main" and fig_hover >= 0 and c["o"] != fig_hover) else 1.0
		var col := Color(lit * dim * 1.05, lit * dim * 0.9, lit * dim * 0.75)
		fx.draw_texture_rect(c["tex"], Rect2(-27, -42, 54, 84), false, col)
		if c["o"] >= 0 and L > 0.05:
			fx.draw_rect(Rect2(-28, -43, 56, 86), Color(MARROW, 0.7 * L), false, 1.0)
	fx.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	# ash and embers
	for m in motes:
		var a: float = clampf(1.0 - m["t"] / m["life"], 0.0, 1.0)
		var p := Vector2(floorf(m["x"]), floorf(m["y"])) * K
		if m["ember"]:
			fx.draw_rect(Rect2(p, Vector2(K, K)), Color(1.0, 0.62 + 0.3 * a, 0.3, a))
		else:
			fx.draw_rect(Rect2(p, Vector2(K, K)), Color(0.42, 0.4, 0.44, 0.45))

func _draw_back() -> void:
	for i in candles.size():
		var c: Vector2 = candles[i]
		var g := _flick(i * 1.7)
		fx_back.draw_rect(Rect2(_snap(c + Vector2(0, -8)), Vector2(K, 8 + roundf(g) * 4)), Color("#ecc47e"))
		fx_back.draw_rect(Rect2(_snap(c + Vector2(0, -12 - g * 4)), Vector2(K, K)), Color("#fff2c0"))
	# the drop swelling on the chin, and the ones falling
	var sw := clampf(1.0 - drop_t / 2.4, 0.0, 1.0)
	if sw > 0.3:
		fx_back.draw_rect(Rect2(Vector2(chin.x, chin.y + 1.0) * K, Vector2(K, K * (1.0 if sw < 0.75 else 2.0))), Color("#84181c"))
	for d in drops:
		fx_back.draw_rect(Rect2(Vector2(chin.x, floorf(d["y"])) * K, Vector2(K, K * 2)), Color("#84181c"))
	for sp in sparks:
		fx_back.draw_rect(Rect2(Vector2(floorf(sp["x"]), floorf(sp["y"])) * K, Vector2(K, K)), Color("#b83026"))

func _draw_add() -> void:
	for i in candles.size():
		var c: Vector2 = candles[i]
		var r := 36.0 + 10.0 * _flick(i * 1.7)
		add_fx.draw_texture_rect(_glow, Rect2(c + Vector2(-r, -r - 8), Vector2(r * 2, r * 2)), false, Color(1.0, 0.6, 0.3, 0.2))

# ------------------------------------------------------------------ input

## the order card under a screen point (the topmost, as they are drawn)
func _fig_at(p: Vector2) -> int:
	var best := -1
	var best_y := -INF
	for c in cards:
		if c["o"] < 0:
			continue
		var lp: Vector2 = _card_xform(c).affine_inverse() * p
		if Rect2(-30, -45, 60, 90).has_point(lp) and (c["at"].y + c["lift"] * 1000.0) > best_y:
			best_y = c["at"].y + c["lift"] * 1000.0
			best = c["o"]
	return best

func _gui(ev: InputEvent) -> void:
	if leaving >= 0.0:
		return
	if ev is InputEventMouseMotion:
		var h := -1
		for i in rows.size():
			if _row_rect(i).has_point(ev.position):
				h = i
		if h != hover and h >= 0:
			Sfx.play("page_close", 0.25, 1.4)
		hover = h
		var fh := _fig_at(ev.position) if mode == "main" and h < 0 else -1
		if fh >= 0 and fh != fig_hover:
			Sfx.play("roll", 0.35, 1.2)
		fig_hover = fh
	elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		if mode == "credits":
			_act("back")
			return
		for i in rows.size():
			if _row_rect(i).has_point(ev.position):
				_act(rows[i][1])
				return
		if mode == "main":
			var f := _fig_at(ev.position)
			if f >= 0:
				_open_order(f)

func _unhandled_key_input(ev: InputEvent) -> void:
	if leaving >= 0.0 or not root.visible or not (ev is InputEventKey) or not ev.pressed:
		return
	if ev.keycode == KEY_ESCAPE and mode != "main":
		_act("back")
	elif ev.keycode == KEY_ENTER or ev.keycode == KEY_SPACE:
		if mode == "main" and fig_hover >= 0 and hover < 0:
			_open_order(fig_hover)
		else:
			_act(rows[maxi(0, hover)][1])
	elif ev.keycode == KEY_DOWN:
		hover = (hover + 1) % rows.size()
	elif ev.keycode == KEY_UP:
		hover = (hover - 1 + rows.size()) % rows.size()
	elif mode == "main" and (ev.keycode == KEY_LEFT or ev.keycode == KEY_RIGHT):
		fig_hover = (maxi(fig_hover, 0) + (1 if ev.keycode == KEY_RIGHT else -1) + PILGRIMS.size()) % PILGRIMS.size()
	get_viewport().set_input_as_handled()

func _act(a: String) -> void:
	match a:
		"continue":
			_wake(SaveIO.latest())
		"order_continue":
			_wake(PILGRIMS[order_i][0])
		"order_new":
			var kind: String = PILGRIMS[order_i][0]
			if SaveIO.exists(kind) and not confirm_new:
				confirm_new = true
				_build()
				return
			Sfx.play("kindle", 0.9)
			SaveIO.forget(kind)
			Game.skip_title = true
			Game.force_new = true
			Game.read_new = true
			Game.cls = kind
			get_tree().reload_current_scene()
		"back":
			if mode == "order":
				Sfx.play("page_close", 0.6)
			mode = "main"
			confirm_new = false
			order_i = -1
			_build()
		"codex":
			Sfx.play("page_open")
			root.visible = false
			codex.open_book(0)
		"options":
			if main.hud and main.hud.pause:
				main.hud.pause.open()
				main.hud.pause.page = "options"
		"credits":
			Sfx.play("page_open", 0.7)
			mode = "credits"
			_build()
		"leave":
			get_tree().quit()
		_:
			if a.begins_with("hover"):
				fig_hover = int(a.substr(5))
			elif a.begins_with("order"):
				_open_order(int(a.substr(5)))

func _open_order(i: int) -> void:
	Sfx.play("page_open", 0.8)
	mode = "order"
	order_i = i
	confirm_new = false
	fig_hover = -1
	_build()
	hover = 0

## wake a saved pilgrim: the one already loaded behind the title simply walks on; another order's reloads the scene
func _wake(kind: String) -> void:
	if kind == "":
		return
	Sfx.play("kindle", 0.8)
	if kind == main.hero.cls:
		leaving = 0.0
		return
	Game.load_cls = kind
	Game.skip_title = true
	get_tree().reload_current_scene()

func _portrait(name: String) -> Texture2D:
	if name == "":
		return null
	if not portraits.has(name):
		portraits[name] = load("res://art/ui/%s.png" % name)
	return portraits[name]

# ------------------------------------------------------------------ the words

## an order's page: over the dimmed chapel, a portrait on the right and the Stranger's words on the left
func _draw_order(a: float) -> void:
	var vs := root.get_viewport_rect().size
	var p: Array = PILGRIMS[order_i]
	var info: Dictionary = ORDER.get(p[0], {})
	var sc := U.font("sc")
	var fi := U.font("italic")
	var fb := U.font("book")
	# the portrait, and the dark it stands in
	var pr := Rect2(1060, 110, 760, 900)
	var tex := _portrait(String(info.get("portrait", "")))
	var g := 0.9 + 0.1 * _flick(0.3)
	if tex:
		var sz: Vector2 = tex.get_size()
		var k := minf(pr.size.y / sz.y, pr.size.x / sz.x)
		var r := Rect2(pr.position + Vector2((pr.size.x - sz.x * k) / 2.0, pr.size.y - sz.y * k), sz * k)
		root.draw_texture_rect(tex, r, false, Color(1.0 * g, 0.9 * g, 0.8 * g, a))
	else:
		# no painting yet: the pilgrim as he walks the Hide, drawn large, in the candles' light
		root.draw_rect(pr.grow(-40), Color(0.05, 0.04, 0.05, 0.8 * a))
		root.draw_rect(pr.grow(-40), Color(MARROW, 0.35 * a), false, 1.0)
		var fr: Array = Data.sprite_set(p[0]).get_frames("idle", "front")
		if not fr.is_empty():
			var at: AtlasTexture = fr[int(t * 4.0) % fr.size()][0]
			var sz2: Vector2 = at.get_size()
			var k2 := minf((pr.size.y - 180.0) / sz2.y, (pr.size.x - 160.0) / sz2.x)
			root.draw_texture_rect(at, Rect2(pr.get_center() + Vector2(-sz2.x * k2 / 2.0, -sz2.y * k2 / 2.0 - 10.0), sz2 * k2), false, Color(0.95 * g, 0.85 * g, 0.75 * g, a))
		root.draw_string(fi, Vector2(pr.position.x, pr.end.y - 60), "[a portrait is still being painted]", HORIZONTAL_ALIGNMENT_CENTER, pr.size.x, 20, Color(ASH, a))
	# the words
	var x := 150.0
	root.draw_string(sc, Vector2(x, 450), p[2], HORIZONTAL_ALIGNMENT_LEFT, -1, 50, Color(BONE, a))
	root.draw_string(fi, Vector2(x + 2, 490), String(info.get("god", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color(MARROW, a))
	root.draw_multiline_string(fb, Vector2(x, 540), String(info.get("text", "")), HORIZONTAL_ALIGNMENT_LEFT, 780, 22, -1, Color(BONE_D, a))
	root.draw_string(sc, Vector2(x, 730), "DRAWS ON", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(ASH, a))
	root.draw_string(fb, Vector2(x + 130, 730), String(info.get("draws", "")), HORIZONTAL_ALIGNMENT_LEFT, 650, 20, Color(BONE, a))
	root.draw_string(sc, Vector2(x, 764), "THREE WAYS", HORIZONTAL_ALIGNMENT_LEFT, -1, 15, Color(ASH, a))
	root.draw_string(fb, Vector2(x + 130, 764), String(info.get("ways", "")), HORIZONTAL_ALIGNMENT_LEFT, 650, 20, Color(BONE, a))
	if not p[6]:
		root.draw_string(fi, Vector2(x, 800), "This road is not yet open.", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(ASH, a))
	elif SaveIO.exists(p[0]):
		var d := SaveIO.read(p[0])
		root.draw_string(fi, Vector2(x, 800), "Your pilgrim of this order: level %d, carrying %d gold." % [int(d.get("level", 1)), int(d.get("gold", 0))], HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(MARROW, a))

func _draw_ui() -> void:
	var vs := root.get_viewport_rect().size
	var fade_in := clampf(t / 2.5, 0.0, 1.0)
	var out := clampf(leaving / 1.2, 0.0, 1.0) if leaving >= 0.0 else 0.0
	var a := 1.0 - out
	for i in 30:
		var k := float(i) / 30.0
		root.draw_rect(Rect2(k * vs.x * 0.6, 0, vs.x * 0.6 / 30.0 + 1.0, vs.y), Color(0, 0, 0, 0.78 * pow(1.0 - k, 1.4)))
	if mode == "order":
		root.draw_rect(Rect2(Vector2.ZERO, vs), Color(0, 0, 0, 0.72 * a))
	root.draw_rect(Rect2(0, 0, vs.x, 70), Color(0, 0, 0, 0.5))
	root.draw_rect(Rect2(0, vs.y - 50, vs.x, 50), Color(0, 0, 0, 0.5))
	var sc := U.font("sc")
	var fi := U.font("italic")
	var fb := U.font("book")
	var x := 150.0
	var y := 300.0
	for c in "GODMARROW":
		var cw := sc.get_string_size(c, HORIZONTAL_ALIGNMENT_LEFT, -1, 112).x
		root.draw_string(sc, Vector2(x + 4, y + 5), c, HORIZONTAL_ALIGNMENT_LEFT, -1, 112, Color(0, 0, 0, 0.8 * a))
		root.draw_string(sc, Vector2(x, y), c, HORIZONTAL_ALIGNMENT_LEFT, -1, 112, Color(Color("#e0b86e"), a))
		root.draw_string(sc, Vector2(x, y - 3), c, HORIZONTAL_ALIGNMENT_LEFT, -1, 112, Color(Color("#f3dca0"), 0.35 * a))
		x += cw + 14.0
	root.draw_line(Vector2(152, y + 30), Vector2(152 + 90, y + 30), Color(MARROW, 0.8 * a), 2.0)
	root.draw_string(fi, Vector2(152, y + 74), "The god is dead, and has not finished dying.", HORIZONTAL_ALIGNMENT_LEFT, -1, 27, Color(BONE_D, a))
	if mode == "credits":
		var cy := 470.0
		for e in CREDITS:
			if e[1] == "":
				cy += 14.0
				root.draw_string(sc, Vector2(150, cy + 26), String(e[0]).to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(MARROW, a))
				cy += 34.0
			else:
				root.draw_string(fb, Vector2(150, cy + 22), e[0], HORIZONTAL_ALIGNMENT_LEFT, 330, 21, Color(BONE, a))
				root.draw_string(fi, Vector2(490, cy + 22), e[1], HORIZONTAL_ALIGNMENT_LEFT, 560, 19, Color(BONE_D, a))
				cy += 30.0
		root.draw_string(fi, Vector2(150, cy + 40), "Click to go back.", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(ASH, a))
	else:
		if mode == "main":
			root.draw_string(fi, Vector2(152, 486), "Or turn a card beside the bowl.", HORIZONTAL_ALIGNMENT_LEFT, -1, 21, Color(ASH, a))
			if fig_hover >= 0:
				var p: Array = PILGRIMS[fig_hover]
				var ca: Vector2 = Vector2.ZERO
				for c in cards:
					if c["o"] == fig_hover:
						ca = c["at"]
				var ly := ca.y - 300.0
				ca.x = clampf(ca.x, 250.0, 1920.0 - 250.0)
				root.draw_rect(Rect2(ca.x - 230, ly - 34, 460, 76), Color(0, 0, 0, 0.55 * a))
				root.draw_string(sc, Vector2(ca.x - 230, ly), p[2], HORIZONTAL_ALIGNMENT_CENTER, 460, 26, Color(BONE, 0.95 * a))
				root.draw_string(fi, Vector2(ca.x - 230, ly + 30), p[3], HORIZONTAL_ALIGNMENT_CENTER, 460, 18, Color(BONE_D, 0.9 * a))
		elif mode == "order":
			_draw_order(a)
		for i in rows.size():
			var r := _row_rect(i)
			var on := i == hover
			var col := BONE if on else BONE_D
			if rows[i][1] == "new" and confirm_new:
				col = MARROW
			if on:
				root.draw_string(sc, r.position + Vector2(-34, 36), "❧", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color(MARROW, a))
			root.draw_string(sc, r.position + Vector2(0, 36), rows[i][0], HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color(col, a))
	root.draw_string(fi, Vector2(152, vs.y - 18), "Act I · the Ashen Moor and what lies under it", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(ASH, a))
	if fade_in < 1.0:
		root.draw_rect(Rect2(Vector2.ZERO, vs), Color(0, 0, 0, 1.0 - fade_in))
	if out > 0.0:
		root.draw_rect(Rect2(Vector2.ZERO, vs), Color(0, 0, 0, out))
