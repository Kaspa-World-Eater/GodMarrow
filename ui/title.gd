extends CanvasLayer
## ui/title.gd: the title. The scene behind the words is a stage (ui/title_stage/*.gd), chosen in Options
## (Settings.title_scene): the Stranger's box (his fire, the orders' cards on the lid of his box), the Seer's bowl
## (the dead god's face weeping blood into a bronze bowl, the cards spilled round it), or the pilgrims' fire.
## Each stage lays out the five orders as something to hover and choose; choose one and that order's page opens over
## the dimmed scene (a large portrait, placeholders until the final paintings come; who they are in the Stranger's
## words; their own pilgrim to continue or begin anew).
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
	["hemomancer", "pilgrim_hemo", "The Red Penitent", "Opens the vein, and the vein answers.", Vector2(928, 864), 1, false, ""],
	["animancer", "pilgrim_mystic", "The Hollow Mystic", "Listens at mirrors. Keeps the dead on a thread.", Vector2(1152, 840), 1, true, ""],
	["ossumancer", "pilgrim_ossu", "The Ossuarch", "Counts the dead, and the dead stand up to be counted.", Vector2(1580, 840), -1, true, ""],
	["miasmancer", "", "The Shrine Keeper", "Folds the breath into paper, and the paper walks.", Vector2(1760, 880), -1, true, "charm"],
	["monk", "", "The Empty Hand", "Carries nothing. Strikes with that.", Vector2(1150, 1010), 1, true, "bowl"],
]
## each order's page. Portraits are placeholders: the user's paintings, cut out (art/ui/portrait_*.png); "" = still to paint.
const ORDER := {
	"animancer": {"god": "Of the Soul, the Veiled Crone", "portrait": "portrait_mystic", "draws": "Essence, and a choir of wisps", "ways": "Mirror · Soul · Thread",
		"text": "They listen at mirrors until something listens back. A Mystic keeps a few of the restless dead about her, wisps that dive at whatever comes near and grow back when spent, and ties the rest down with thread and needle. I walked a season beside one. She never once looked where she was going. The mirrors did that for her."},
	"hemomancer": {"god": "Of the Flesh, the Bleeding Maiden", "portrait": "portrait_hemo", "draws": "Vitae; every working costs him life", "ways": "Mortification · Blood · Penance",
		"text": "The Brotherhood of the Precious Wound pays for everything in blood, and their own first. What a Hemomancer opens, he keeps: a brood that crawls out of the cut, a golem of it, pools that drink what falls in them. They are gentle with strangers. I would still not sleep near one."},
	"ossumancer": {"god": "Of the Bone, Old Upright", "portrait": "portrait_ossu", "draws": "Marrow", "ways": "Ossuary · Carapace · Count",
		"text": "The Pale Order counts the dead, and what they count stands up. An Ossuarch sends the bones of the fallen to walk ahead of him, wears the rest as plate, throws the splinters, and cuts a count into whatever he strikes. He does not bend. I once saw one carried home on a door, sitting upright, still counting."},
	"miasmancer": {"god": "Of the Breath, the Myriad", "portrait": "", "draws": "Miasma, breathed in and given back", "ways": "Miasma · Distortion · Death",
		"text": "The House of Eight Million keeps the small gods that ride the last breath out. A Keeper breathes in the spoiled air and gives it back as a violet haze, folds paper that walks, and reads Sigils in what the breath leaves behind. She fights with a fan. Do not laugh at the fan."},
	"monk": {"god": "Of the Hush", "portrait": "", "draws": "An hourglass: amber sand by day, black sand by night", "ways": "Radiance · Absence · Destroyer",
		"text": "The Gilded Peak gave everything away, and the Empty Hand is what came down the stair after. He carries a lantern with a black flame and nothing else, and strikes with the sun or with its going. He did not ask my name. I think he would not have kept it."},
}

var main: Node
var root: Control
var stage: Node2D
var stage_kind := ""
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
var _test_done := false
var draw_t := -1.0                 # the Stranger drawing a card before the Reading (mode "draw")

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
	Game.slot = ""   # the title shows the pilgrims; the Trial is entered from an order's page
	for arg in OS.get_cmdline_user_args() + OS.get_cmdline_args():
		if arg.begins_with("--title_scene="):
			Settings.title_scene = arg.substr(14)
	_set_stage(Settings.title_scene)
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
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
				rows.append(["The Trial of Thirty (a test pilgrim, level 30)", "order_trial"])
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
	if draw_t >= 0.0:
		draw_t += dt
	if stage_kind != Settings.title_scene and mode != "draw":
		_set_stage(Settings.title_scene)
	root.queue_redraw()

## raise the chosen stage behind the words (and put away the old one)
func _set_stage(kind: String) -> void:
	var path := "res://ui/title_stage/%s.gd" % kind
	if not ResourceLoader.exists(path):
		kind = "stranger"
		path = "res://ui/title_stage/stranger.gd"
	if stage:
		stage.queue_free()
	stage = load(path).new()
	stage.T = self
	stage_kind = kind
	add_child(stage)
	move_child(stage, 0)

## the order under a screen point, as the stage lays them out
func _fig_at(p: Vector2) -> int:
	return stage.order_at(p) if stage else -1

func _gui(ev: InputEvent) -> void:
	if leaving >= 0.0 or mode == "draw":
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
	if leaving >= 0.0 or mode == "draw" or not root.visible or not (ev is InputEventKey) or not ev.pressed:
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
			if stage and stage.has_method("draw_card"):
				# the Stranger draws that order's card from his deck first, and the dark follows it
				mode = "draw"
				rows.clear()
				hover = -1
				draw_t = 0.0
				stage.draw_card(order_i)
				get_tree().create_timer(stage.DRAW_LEN + 0.6).timeout.connect(func(): get_tree().reload_current_scene())
				return
			get_tree().reload_current_scene()
		"order_trial":
			# a test pilgrim at level 30, in its own slot: the real pilgrim of the order is never touched
			var tk: String = PILGRIMS[order_i][0]
			Sfx.play("kindle", 0.9)
			Game.slot = "_trial"
			Game.skip_title = true
			Game.cls = tk
			if SaveIO.exists(tk):
				Game.load_cls = tk
			else:
				Game.force_new = true
				Game.trial_new = true
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
		root.draw_rect(pr.grow(-40), Color(0.05, 0.04, 0.05, 0.97 * a))
		root.draw_rect(pr.grow(-40), Color(MARROW, 0.35 * a), false, 1.0)
		var fr: Array = Data.sprite_set(p[0]).get_frames("idle", "front")
		if not fr.is_empty():
			var at: AtlasTexture = fr[int(t * 4.0) % fr.size()][0]
			var sz2: Vector2 = at.get_size()
			var k2 := minf(minf((pr.size.y - 180.0) / sz2.y, (pr.size.x - 160.0) / sz2.x), 5.0)
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
			root.draw_string(fi, Vector2(152, 486), stage.hint() if stage else "", HORIZONTAL_ALIGNMENT_LEFT, -1, 21, Color(ASH, a))
			if fig_hover >= 0:
				var p: Array = PILGRIMS[fig_hover]
				var ca: Vector2 = stage.label_at(fig_hover) if stage else Vector2(1360, 500)
				var ly := ca.y
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
	if draw_t >= 0.0:
		root.draw_rect(Rect2(Vector2.ZERO, vs), Color(0, 0, 0, clampf((draw_t - 1.6) / 0.8, 0.0, 1.0)))
	if fade_in < 1.0:
		root.draw_rect(Rect2(Vector2.ZERO, vs), Color(0, 0, 0, 1.0 - fade_in))
	if out > 0.0:
		root.draw_rect(Rect2(Vector2.ZERO, vs), Color(0, 0, 0, out))
