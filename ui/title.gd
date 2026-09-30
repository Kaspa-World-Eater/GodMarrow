extends CanvasLayer
## ui/title.gd: the title, "the Pilgrims' Fire". The old title's chapel of the weeping god (zp_title.js, painted pixel by
## pixel, captured without the Seer's bowl: art/ui/title_chapel.png, tools/cap_chapel.js) with, where the bowl stood, a
## fire on the flagstones and the five pilgrims of the orders standing round it, Diablo's campfire in the god's chapel.
## The fire lights them from its side and throws their shadows back across the floor; the candles gutter; the god's
## chin lets go a drop now and then. The words stand on the left, over the dark:
##   Continue (the pilgrim walked most lately) · The Codex · Options · Those Who Lent Their Hands · Leave.
## Hover a pilgrim at the fire and they step into the light; click one and their order's page opens over the dimmed
## chapel: a large portrait (placeholders until the final paintings come), who they are in the Stranger's words, what
## they draw on and their three ways, and that order's own pilgrim (one save per order: continue it, or begin anew).
## "Begin" opens the Reading (ui/reading.gd, character creation), with the god already chosen here.

const U := preload("res://ui/uikit.gd")
const SaveIO := preload("res://core/save.gd")
const BONE := Color("#dcd3c2")
const BONE_D := Color("#a39a8b")
const ASH := Color("#6f685f")
const MARROW := Color("#c9974a")
const K := 4.0                           # screen px per chapel px
const FIRE := Vector2(1360, 954)         # the fire's foot on the flagstones (chapel px 340, 238)
const FS := 1.7                          # the fire's size
## the pilgrims: the user's paintings cut out and brought down to the chapel's own grain (tools/title_cut.py,
## tools/title_pix.py -> art/ui/pilgrim_*.png, shown x4). The two orders without a painting yet keep an empty place.
const PILGRIMS := [
	# kind, figure png ("" = an empty place), name, line, foot (screen px), fire side, playable, what lies at an empty place
	["hemomancer", "pilgrim_hemo", "The Hemomancer", "Opens the vein, and the vein answers.", Vector2(928, 864), 1, false, ""],
	["animancer", "pilgrim_mystic", "The Hollow Mystic", "Listens at mirrors. Keeps the dead on a thread.", Vector2(1152, 840), 1, true, ""],
	["ossumancer", "pilgrim_ossu", "The Ossuarch", "Counts the dead, and the dead stand up to be counted.", Vector2(1580, 840), -1, false, ""],
	["miasmancer", "", "The Shrine Keeper", "Folds the breath into paper, and the paper walks.", Vector2(1760, 880), -1, false, "charm"],
	["monk", "", "The Empty Hand", "Carries nothing. Strikes with that.", Vector2(1150, 1010), 1, false, "bowl"],
]
const LANTERN_AT := Vector2(-80, -208)   # the Mystic's lantern glass, from her feet (screen px)
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
var world: Node2D                  # the pilgrims (y-sorted, screen px)
var add_fx: Node2D                 # additive light: the fire's glow, the candles, embers
var fx: Node2D                     # the fire, embers, the empty places
var fx_back: Node2D
var figs: Array = []               # {spr, holder, shadow, base, step}
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
var drop_t := 2.0
var drop_y := -1.0
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
	bg.texture = load("res://art/ui/title_chapel.png")
	bg.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	bg.size = Vector2(1920, 1080)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	var meta = JSON.parse_string(FileAccess.get_file_as_string("res://art/ui/title_chapel.json"))
	if meta is Dictionary:
		for c in meta.get("candles", []):
			candles.append(Vector2(float(c[0]), float(c[1]) - float(c[2])) * K + Vector2(2, -2))
		var f: Array = meta.get("face", [340, 64, 125])
		chin = Vector2(float(f[0]) - 1.0, float(f[2])) * K
	fx_back = Node2D.new()          # the candles and the god's drop, behind the pilgrims
	fx_back.draw.connect(_draw_back)
	add_child(fx_back)
	var shadows := Node2D.new()
	add_child(shadows)
	world = Node2D.new()
	world.y_sort_enabled = true
	add_child(world)
	for i in PILGRIMS.size():
		var p: Array = PILGRIMS[i]
		var holder := Node2D.new()
		holder.position = p[4]
		world.add_child(holder)
		var spr: Sprite2D = null
		var sh: Sprite2D = null
		if p[1] != "":
			spr = Sprite2D.new()
			spr.texture = load("res://art/ui/%s.png" % p[1])
			spr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			spr.centered = false
			spr.scale = Vector2(K, K)
			spr.position = Vector2(-roundf(spr.texture.get_width() / 2.0) * K, -spr.texture.get_height() * K)
			holder.add_child(spr)
			sh = Sprite2D.new()
			sh.texture = spr.texture
			sh.centered = false
			sh.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			shadows.add_child(sh)
		figs.append({"spr": spr, "holder": holder, "shadow": sh, "base": p[4], "step": 0.0, "ph": randf() * TAU})
	fx = Node2D.new()
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
	var fire_k := 0.86 + 0.14 * _flick(0.3)
	for i in figs.size():
		var f: Dictionary = figs[i]
		var want := 1.0 if ((mode == "main" or mode == "order") and (fig_hover == i or order_i == i)) else 0.0
		f["step"] = lerpf(f["step"], want, minf(1.0, dt * 5.0))
		var base: Vector2 = f["base"]
		var h: Node2D = f["holder"]
		var to_fire := (FIRE - base).normalized()
		# a step toward the fire when chosen, on the chapel's grain; and a slow breath (one chapel pixel)
		var stepv: Vector2 = to_fire * 28.0 * float(f["step"])
		h.position = Vector2(roundf((base.x + stepv.x) / K) * K, roundf((base.y + stepv.y) / K) * K)
		var spr: Sprite2D = f["spr"]
		if spr == null:
			continue
		var breath := 1.0 if sin(t * 0.9 + float(f["ph"])) > 0.55 else 0.0
		spr.position.y = -spr.texture.get_height() * K - breath * K
		var d := h.position.distance_to(FIRE)
		var lit: float = clampf(1.3 - d / 700.0, 0.5, 1.1) * fire_k + 0.3 * float(f["step"])
		var dim := 0.55 if (mode == "main" and fig_hover >= 0 and fig_hover != i) else 1.0
		spr.modulate = Color(lit * dim * 1.05, lit * dim * 0.92, lit * dim * 0.8)
		var sh: Sprite2D = f["shadow"]
		var away := h.position - FIRE
		var dir := Vector2(away.x, away.y * 0.6).normalized()
		var ya := -dir * 0.5 * K
		sh.transform = Transform2D(Vector2(K, 0), ya, h.position - Vector2(spr.texture.get_width() / 2.0 * K, 0) - ya * spr.texture.get_height())
		sh.modulate = Color(0, 0, 0, 0.55 * clampf(1.4 - d / 600.0, 0.2, 1.0))
	if randf() < dt * 9.0:
		embers.append({"p": FIRE + Vector2(randf_range(-50, 50), -90), "v": Vector2(randf_range(-14, 14), randf_range(-70, -40)), "t": 0.0, "life": randf_range(1.2, 2.6)})
	for e in embers:
		e["t"] += dt
		e["v"].x += sin(t * 2.0 + e["life"] * 7.0) * 12.0 * dt
		e["p"] += e["v"] * dt
	embers = embers.filter(func(e): return e["t"] < e["life"])
	drop_t -= dt
	if drop_t <= 0.0 and drop_y < 0.0:
		drop_y = 0.0
	if drop_y >= 0.0:
		drop_y += dt * (60.0 + drop_y * 4.0)
		if drop_y > 56.0:
			drop_y = -1.0
			drop_t = randf_range(3.0, 7.0)
	fx.queue_redraw()
	fx_back.queue_redraw()
	add_fx.queue_redraw()
	root.queue_redraw()

func _snap(p: Vector2) -> Vector2:
	return Vector2(floorf(p.x / K) * K, floorf(p.y / K) * K)

## the fire: split logs, a bed of embers, tongues of flame climbing and tearing off, on the chapel's pixel grid
func _draw_fx() -> void:
	fx.draw_set_transform(FIRE * (1.0 - FS), 0.0, Vector2(FS, FS))
	_draw_fire()
	fx.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	_draw_small()

func _draw_fire() -> void:
	fx.draw_rect(Rect2(_snap(FIRE + Vector2(-44, -8)), Vector2(88, 12)), Color("#0f0905"))
	for l in [[-40, -14, 64, 8], [-20, -20, 60, 8], [-30, -4, 70, 8]]:
		fx.draw_rect(Rect2(_snap(FIRE + Vector2(l[0], l[1])), Vector2(l[2], l[3])), Color("#1b1008"))
		fx.draw_rect(Rect2(_snap(FIRE + Vector2(l[0], l[1])), Vector2(l[2], 4)), Color("#3d2512"))
	for i in 14:
		var g := _flick(i * 1.3)
		fx.draw_rect(Rect2(_snap(FIRE + Vector2(-36.0 + i * 6.0, -8)), Vector2(4, 4)), Color("#b83026").lerp(Color("#ecc47e"), g * 0.6))
	var cols := 13
	for c in cols:
		var u := (float(c) / (cols - 1)) * 2.0 - 1.0
		var hgt := (1.0 - u * u) * (70.0 + 30.0 * _flick(c * 2.1)) + 10.0
		var sway := sin(t * 3.0 + c * 0.7) * 6.0 + sin(t * 7.3 + c) * 3.0
		var y := 0.0
		while y < hgt:
			var k := y / hgt
			var col := Color("#fff2c0").lerp(Color("#ecc47e"), minf(1.0, k * 2.0)).lerp(Color("#e8704e"), clampf(k * 2.0 - 0.6, 0.0, 1.0)).lerp(Color("#84181c"), clampf(k * 2.0 - 1.3, 0.0, 1.0))
			if absf(u) > 0.6:
				col = col.lerp(Color("#e8704e"), 0.5)
			if k < 0.85 or fmod(t * 11.0 + c, 1.0) < 0.6:
				fx.draw_rect(Rect2(_snap(FIRE + Vector2(u * 34.0 + sway * k, -14.0 - y)), Vector2(K, K)), col)
			y += K

func _draw_small() -> void:
	# the empty places: a begging bowl on a folded cloth; a stick with paper strips, stirring in the fire's draught
	for i in PILGRIMS.size():
		var what: String = PILGRIMS[i][7]
		if what == "":
			continue
		var at: Vector2 = (figs[i]["holder"] as Node2D).position
		var lit := 0.6 + 0.4 * _flick(i * 3.1) + (0.35 if (mode == "main" and fig_hover == i) else 0.0)
		if what == "bowl":
			fx.draw_rect(Rect2(_snap(at + Vector2(-48, -8)), Vector2(96, 12)), Color("#1b1008"))
			fx.draw_rect(Rect2(_snap(at + Vector2(-28, -24)), Vector2(56, 16)), Color("#3d2512") * lit)
			fx.draw_rect(Rect2(_snap(at + Vector2(-28, -24)), Vector2(56, 4)), Color("#704622") * lit)
			fx.draw_rect(Rect2(_snap(at + Vector2(-20, -20)), Vector2(40, 4)), Color("#0f0905"))
		else:
			fx.draw_rect(Rect2(_snap(at + Vector2(-4, -220)), Vector2(8, 220)), Color("#2a190c") * lit)
			fx.draw_rect(Rect2(_snap(at + Vector2(-16, -224)), Vector2(32, 8)), Color("#3d2512") * lit)
			for k in 4:
				var sw := roundf(sin(t * 1.3 + k * 1.7) * 1.2) * K
				var x0 := -12.0 + k * 8.0
				for z in 6:
					var zx := x0 + sw + (K if z % 2 == 1 else 0.0)
					fx.draw_rect(Rect2(_snap(at + Vector2(zx, -216 + z * 12)), Vector2(K, 12)), Color("#dcc79a") * lit)

	for e in embers:
		var a: float = 1.0 - e["t"] / e["life"]
		fx.draw_rect(Rect2(_snap(e["p"]), Vector2(K, K)), Color(1.0, 0.55 + 0.35 * a, 0.25, a))

func _draw_back() -> void:
	for i in candles.size():
		var c: Vector2 = candles[i]
		var g := _flick(i * 1.7)
		fx_back.draw_rect(Rect2(_snap(c + Vector2(0, -8)), Vector2(K, 8 + roundf(g) * 4)), Color("#ecc47e"))
		fx_back.draw_rect(Rect2(_snap(c + Vector2(0, -12 - g * 4)), Vector2(K, K)), Color("#fff2c0"))
	if drop_y >= 0.0:
		fx_back.draw_rect(Rect2(_snap(chin + Vector2(0, drop_y)), Vector2(K, K * 2)), Color("#84181c"))
	elif drop_t < 1.2:
		fx_back.draw_rect(Rect2(_snap(chin), Vector2(K, K * (1.0 if drop_t > 0.5 else 2.0))), Color("#5e1016"))

func _draw_add() -> void:
	var g := _flick(0.3)
	var fr := 520.0 + 40.0 * g
	add_fx.draw_texture_rect(_glow, Rect2(FIRE + Vector2(-fr, -fr * 0.62 - 40), Vector2(fr * 2, fr * 1.24)), false, Color(1.0, 0.55, 0.25, 0.30 + 0.08 * g))
	var cr := 140.0 + 16.0 * g
	add_fx.draw_texture_rect(_glow, Rect2(FIRE + Vector2(-cr, -cr - 50), Vector2(cr * 2, cr * 2)), false, Color(1.0, 0.7, 0.35, 0.35))
	for i in candles.size():
		var c: Vector2 = candles[i]
		var r := 36.0 + 10.0 * _flick(i * 1.7)
		add_fx.draw_texture_rect(_glow, Rect2(c + Vector2(-r, -r - 8), Vector2(r * 2, r * 2)), false, Color(1.0, 0.6, 0.3, 0.22))
	for e in embers:
		var a: float = 1.0 - e["t"] / e["life"]
		add_fx.draw_texture_rect(_glow, Rect2(e["p"] - Vector2(10, 10), Vector2(20, 20)), false, Color(1.0, 0.5, 0.2, 0.3 * a))
	# the Mystic's lantern: a soul, pale and cold beside the fire
	for i in PILGRIMS.size():
		if PILGRIMS[i][1] == "pilgrim_mystic":
			var lp: Vector2 = (figs[i]["holder"] as Node2D).position + LANTERN_AT
			var lr := 60.0 + 8.0 * sin(t * 2.3)
			add_fx.draw_texture_rect(_glow, Rect2(lp - Vector2(lr, lr), Vector2(lr * 2, lr * 2)), false, Color(0.45, 0.75, 0.8, 0.28))

# ------------------------------------------------------------------ input

func _fig_at(p: Vector2) -> int:
	var best := -1
	for i in figs.size():
		var h: Node2D = figs[i]["holder"]
		if Rect2(h.position + Vector2(-110, -500), Vector2(220, 510)).has_point(p):
			if best < 0 or h.position.y > (figs[best]["holder"] as Node2D).position.y:
				best = i
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
		fig_hover = (maxi(fig_hover, 0) + (1 if ev.keycode == KEY_RIGHT else -1) + figs.size()) % figs.size()
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
		root.draw_rect(pr.grow(-40), Color(0.05, 0.04, 0.05, 0.8 * a))
		root.draw_rect(pr.grow(-40), Color(MARROW, 0.35 * a), false, 1.0)
		root.draw_string(fi, pr.get_center() + Vector2(-250, 0), "[a portrait is still being painted]", HORIZONTAL_ALIGNMENT_CENTER, 500, 22, Color(ASH, a))
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
			root.draw_string(fi, Vector2(152, 486), "Or choose one of those at the fire.", HORIZONTAL_ALIGNMENT_LEFT, -1, 21, Color(ASH, a))
			if fig_hover >= 0:
				var p: Array = PILGRIMS[fig_hover]
				var hh: Node2D = figs[fig_hover]["holder"]
				root.draw_string(sc, hh.position + Vector2(-160, 40), p[2], HORIZONTAL_ALIGNMENT_CENTER, 320, 22, Color(BONE, 0.95 * a))
				root.draw_string(fi, hh.position + Vector2(-200, 70), p[3], HORIZONTAL_ALIGNMENT_CENTER, 400, 17, Color(BONE_D, 0.9 * a))
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
