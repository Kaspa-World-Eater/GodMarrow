extends CanvasLayer
## ui/reading.gd: the Reading, where a new pilgrim is made. Opened by the Stranger on the cave's dais
## (world/objects/manager_use.gd) when the pilgrim first speaks to him.
##
## Derek, 2026-10-09: "Remove the stranger cinematic, I just want the cards to appear on screen"; "come up with a way to
## weave a story from the card draw and how they lay/formation and let the player interact with them more, hide the
## plus minus and other stats. We want this to be blind ... The only one they'll know for sure is the class."
##
## So the cards lie over the dimmed world, in a spread laid like a body on the cloth (the old one lying down): the
## calling at the crown, face up, the only card known; then the brow, the heart, the two hands, the belly, the feet, and
## one more under it all, in the Red. One deck, the twenty-two mantles (data/reading_spread.json, made by
## tools/reading/spread_data.py; faces by tools/reading/card_fronts.py), fanned face down: the pilgrim picks any card
## blind, it flies to its place and lands upright or reversed, and the pilgrim turns it over; the Stranger speaks to
## that card in that place. The card under the body stays face down until the end. Then he weaves the whole spread into
## one telling, and how the cards lie changes what he says. What each card does in each place is never shown: it comes
## from the old pools of data/reading.json by card, place and which way up, summed within the caps into the pilgrim's
## fate (HeroStats.fate). Esc lets him lay the rest.

const U := preload("res://ui/uikit.gd")
const BONE := Color("#dcd3c2")
const BONE_D := Color("#a39a8b")
const ASH := Color("#6f685f")
const MARROW := Color("#c9974a")
const MARROW_D := Color("#8c6a37")
const RED_POOL := Color(0.16, 0.02, 0.03)
const SW := 108.0                 # a card on the cloth: 54 x 84, drawn x2
const SH := 168.0
const ASPECT_OF := {"ossumancer": "bone", "animancer": "soul", "hemomancer": "flesh", "miasmancer": "breath", "monk": "silence"}
## where each card lies (its centre): the body, head at the top; the last card under it, lying across, in the Red
const SLOT := {"crown": Vector2(1180, 120), "brow": Vector2(1180, 300), "heart": Vector2(1180, 480),
	"lhand": Vector2(1000, 500), "rhand": Vector2(1360, 500), "belly": Vector2(1180, 660), "feet": Vector2(1180, 840),
	"under": Vector2(1470, 800)}
## the hidden effects: each place's own pool in data/reading.json
const POOL := {"brow": "cards", "heart": "seeks", "lhand": "answers", "rhand": "sacs", "belly": "fears", "feet": "roads", "under": "cards"}

var main: Node
var cls := "animancer"
var R: Dictionary = {}            # data/reading.json (the old pools: the hidden effects, the calling, the prophecies)
var S: Dictionary = {}            # data/reading_spread.json (the places, the mantles' words, the weaving)
var root: Control
var tex := {}
var t := 0.0
var deck: Array = []              # the mantles still face down in the fan
var laid := {}                    # place -> {m, rev, flip (0 face down .. 1 turned), name}
var place_i := 0
var phase := "open"               # open, draw, fly, turn, told, end
var fly := {}
var hover := -1
var prompt := ""
var said := ""
var picks: Array = []
var fate := {}
var prophecy := ""
var telling := ""
var on_done: Callable
var fade := 0.0
var leaving := -1.0
var end_t := 0.0
var auto := ""                    # GM_READ_ACT: "all" draws everything, "end" lets him lay the rest
var rise_r := Rect2(260, 930, 200, 56)

func _init(m: Node = null, c: String = "animancer") -> void:
	main = m
	cls = c

func _ready() -> void:
	layer = 26
	process_mode = Node.PROCESS_MODE_ALWAYS
	var j = JSON.parse_string(FileAccess.get_file_as_string("res://data/reading.json"))
	R = j if j is Dictionary else {}
	var k = JSON.parse_string(FileAccess.get_file_as_string("res://data/reading_spread.json"))
	S = k if k is Dictionary else {}
	deck = S.get("mantles", []).duplicate()
	deck.shuffle()
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	root.draw.connect(_draw_all)
	root.gui_input.connect(_gui)
	add_child(root)
	auto = OS.get_environment("GM_READ_ACT")
	# the crown: the calling, face up, the one card it knows
	var st: Dictionary = R.get("stars", {}).get(cls, {})
	laid["crown"] = {"m": {"id": "_" + ASPECT_OF.get(cls, "bone")}, "rev": false, "flip": 1.0, "name": String(st.get("name", ""))}
	picks.append({"step": "crown", "id": st.get("id", ""), "name": st.get("name", ""), "emb": "a_" + ASPECT_OF.get(cls, "bone"),
		"fx": st.get("fx", {}), "rev": false})
	said = String(st.get("say", ""))
	phase = "open"

func _tex(name: String) -> Texture2D:
	if not tex.has(name):
		var p := "res://art/reading/cards/%s.png" % name
		tex[name] = load(p) if ResourceLoader.exists(p) else load("res://art/reading/cards/_back.png")
	return tex[name]

func _face(m: Dictionary) -> Texture2D:
	var id := String(m.get("id", ""))
	return _tex("a_" + id.substr(1)) if id.begins_with("_") else _tex("m_" + id)

func _places() -> Array:
	return S.get("places", [])

func _place() -> Dictionary:
	var ps := _places()
	return ps[place_i] if place_i < ps.size() else {}

# ------------------------------------------------------------------ the draw

func _begin_place() -> void:
	var p := _place()
	if p.is_empty():
		_end()
		return
	phase = "draw"
	said = ""
	hover = -1
	var a: Array = p.get("ask", [""])
	prompt = String(a[randi() % a.size()])

## the card at fan index i, drawn: it flies to the place and lands upright or reversed
func _draw_card(i: int) -> void:
	if phase != "draw" or i < 0 or i >= deck.size():
		return
	var m: Dictionary = deck[i]
	var c := _fan(i, deck.size())
	deck.remove_at(i)
	var pid := String(_place()["id"])
	fly = {"m": m, "rev": randf() < 0.32, "from": c[0], "to": SLOT[pid], "t": 0.0, "place": pid}
	phase = "fly"
	hover = -1
	Sfx.play("page_open", 0.8, 0.85)

func _landed() -> void:
	var pid: String = fly["place"]
	var m: Dictionary = fly["m"]
	laid[pid] = {"m": m, "rev": fly["rev"], "flip": 0.0, "name": _name_of(m)}
	_take(pid, m, fly["rev"])
	fly = {}
	if pid == "under":
		# it stays face down, under everything, until the end
		said = ""
		place_i += 1
		_begin_place()
		return
	phase = "turn"
	prompt = ["Turn it over, then.", "Go on. Turn it.", "Well? It won't turn itself.", "Turn it. Gently."][randi() % 4]

func _turn() -> void:
	var pid := String(_place().get("id", ""))
	if phase != "turn" or not laid.has(pid) or laid[pid].has("turning"):
		return
	laid[pid]["turning"] = true
	Sfx.play("page_close", 0.7, 0.9)

func _turned(pid: String) -> void:
	var c: Dictionary = laid[pid]
	var m: Dictionary = c["m"]
	said = String(m.get("say_rev" if c["rev"] else "say", ""))
	phase = "told"

func _next() -> void:
	if phase == "open":
		place_i = 0
		_begin_place()
	elif phase == "told":
		place_i += 1
		_begin_place()

func _name_of(m: Dictionary) -> String:
	for c in R.get("cards", []):
		if c.get("id", "") == m.get("id", ""):
			return String(c.get("name", ""))
	return String(m.get("id", ""))

## what the card does in this place, this way up: taken from the place's own old pool, never shown
func _take(pid: String, m: Dictionary, rev: bool) -> void:
	var fx: Dictionary = {}
	var key: String = POOL.get(pid, "cards")
	if key == "cards":
		for c in R.get("cards", []):
			if c.get("id", "") == m.get("id", ""):
				fx = c.get("rev", {}).get("fx", c.get("fx", {})) if rev else c.get("fx", {})
	else:
		var pool: Array = []
		if key == "answers":
			for q in R.get("questions", []):
				pool.append_array(q.get("a", []))
		else:
			pool = R.get(key, [])
		if not pool.is_empty():
			var idx := 0
			var ms: Array = S.get("mantles", [])
			for i in ms.size():
				if ms[i].get("id", "") == m.get("id", ""):
					idx = i
			fx = pool[(idx * 7 + (11 if rev else 0)) % pool.size()].get("fx", {})
	picks.append({"step": pid, "id": m.get("id", ""), "name": _name_of(m), "emb": "m_" + String(m.get("id", "")), "fx": fx, "rev": rev})

## let him lay the rest
func _skip() -> void:
	if phase == "end":
		return
	if phase == "fly":
		_landed()
	if phase == "open":
		place_i = 0
	while place_i < _places().size():
		var pid := String(_places()[place_i]["id"])
		if not laid.has(pid) and not deck.is_empty():
			var m: Dictionary = deck.pop_back()
			var rev := randf() < 0.32
			laid[pid] = {"m": m, "rev": rev, "flip": 0.0 if pid == "under" else 1.0, "name": _name_of(m)}
			_take(pid, m, rev)
		elif laid.has(pid) and pid != "under":
			laid[pid]["flip"] = 1.0
		place_i += 1
	_end()

# ------------------------------------------------------------------ the end: the telling

func _end() -> void:
	phase = "end"
	end_t = 0.0
	prompt = ""
	said = ""
	telling = _weave()
	var ids := {}
	for p in picks:
		ids[p["id"]] = true
	var fit: Array = []
	var any: Array = []
	for pr in R.get("prophecies", []):
		if pr is String:
			any.append(pr)
		elif pr.has("when"):
			for w in pr["when"]:
				if ids.has(w):
					fit.append(pr["say"])
					break
		else:
			any.append(pr["say"])
	var pool: Array = fit if not fit.is_empty() and randf() < 0.75 else any
	prophecy = String(pool[randi() % pool.size()]) if not pool.is_empty() else ""
	_sum()

func _phrase(c: Dictionary) -> String:
	var m: Dictionary = c["m"]
	return String(m.get("rev" if c["rev"] else "one", ""))

## the whole spread told as one thing, in his voice; how it lies changes what he says
func _weave() -> String:
	var W: Dictionary = S.get("weave", {})
	var parts: Array = []
	var op: Array = S.get("open", [""])
	parts.append(String(op[randi() % op.size()]))
	for pid in ["brow", "heart", "lhand", "rhand", "belly", "feet", "under"]:
		if not laid.has(pid):
			continue
		var line := String(W.get(pid, "{p}."))
		var wears := String(laid[pid]["m"].get("wears", ""))
		line = line.replace("{p}", _phrase(laid[pid])).replace("{w}", wears.substr(0, 1).to_upper() + wears.substr(1))
		parts.append(line)
	var sh: Dictionary = S.get("shapes", {})
	var said_shapes := 0
	var nrev := 0
	var asp_count := 0
	var mine: String = ASPECT_OF.get(cls, "bone")
	for pid in laid:
		if pid == "crown":
			continue
		if laid[pid]["rev"]:
			nrev += 1
		if String(laid[pid]["m"].get("aspect", "")) == mine:
			asp_count += 1
	var tests := [
		["many_rev", nrev >= 4],
		["none_rev", nrev == 0],
		["heart_belly", _asp("heart") != "" and _asp("heart") == _asp("belly")],
		["hands", _asp("lhand") != "" and _asp("lhand") == _asp("rhand")],
		["calling", asp_count >= 3],
		["under_rev", laid.has("under") and laid["under"]["rev"]],
	]
	for tst in tests:
		if tst[1] and said_shapes < 2 and sh.has(tst[0]):
			parts.append(String(sh[tst[0]]).replace("{a}", String(S.get("aspect_word", {}).get(mine, mine))))
			said_shapes += 1
	var cl: Array = S.get("close", [""])
	parts.append(String(cl[randi() % cl.size()]))
	return " ".join(PackedStringArray(parts))

func _asp(pid: String) -> String:
	return String(laid[pid]["m"].get("aspect", "")) if laid.has(pid) else ""

func _sum() -> void:
	fate = {}
	for p in picks:
		var fx: Dictionary = p["fx"]
		for k in fx:
			fate[k] = float(fate.get(k, 0.0)) + float(fx[k])
	var caps: Dictionary = R.get("caps", {})
	for k in fate.keys():
		if caps.has(k):
			fate[k] = clampf(fate[k], -float(caps[k]), float(caps[k]))
		if is_zero_approx(float(fate[k])):
			fate.erase(k)

func _finish() -> void:
	if leaving >= 0.0:
		return
	leaving = 0.0
	Sfx.play("kindle", 0.9)

## blind: the picks keep their names (the journal can list the cards), never what they did
func result() -> Dictionary:
	var ps: Array = []
	for p in picks:
		ps.append({"step": p["step"], "id": p["id"], "name": p["name"], "rev": p["rev"]})
	ps.append({"step": "sum", "lines": [], "prophecy": prophecy, "telling": telling})
	return {"fx": fate.duplicate(), "picks": ps, "prophecy": prophecy}

# ------------------------------------------------------------------ time and input

func _process(dt: float) -> void:
	t += dt
	fade = minf(1.0, fade + dt / 1.0)
	if not fly.is_empty():
		fly["t"] = minf(1.0, float(fly["t"]) + dt / 0.45)
		if float(fly["t"]) >= 1.0:
			_landed()
	for pid in laid:
		if laid[pid].has("turning"):
			laid[pid]["flip"] = minf(1.0, float(laid[pid]["flip"]) + dt / 0.4)
			if float(laid[pid]["flip"]) >= 1.0:
				laid[pid].erase("turning")
				_turned(pid)
	if phase == "end":
		end_t += dt
		if laid.has("under") and end_t > 0.8 and float(laid["under"]["flip"]) < 1.0:
			laid["under"]["flip"] = minf(1.0, float(laid["under"]["flip"]) + dt / 0.6)
	if leaving >= 0.0:
		leaving += dt
		if leaving >= 1.2:
			if on_done.is_valid():
				on_done.call(result())
			queue_free()
			return
	if auto != "" and leaving < 0.0 and fmod(t, 0.3) < dt:
		if auto == "end":
			if phase != "end":
				_skip()
		elif phase == "end":
			if end_t > 2.0:
				_finish()
		elif phase == "open" or phase == "told":
			_next()
		elif phase == "draw":
			_draw_card(0)
		elif phase == "turn":
			_turn()
	root.queue_redraw()

## the fan: every card still face down, spread in an arc on the left of the cloth; [centre, angle]
func _fan(i: int, n: int) -> Array:
	var u := 0.5 if n <= 1 else float(i) / float(n - 1)
	var c := Vector2(130.0 + u * 620.0, 640.0 - 80.0 * sin(PI * u))
	return [c, (u - 0.5) * 0.55]

func _fan_hit(p: Vector2) -> int:
	for i in range(deck.size() - 1, -1, -1):
		var c: Vector2 = _fan(i, deck.size())[0]
		if Rect2(c - Vector2(SW, SH) / 2.0, Vector2(SW, SH)).grow(-6).has_point(p):
			return i
	return -1

func _gui(ev: InputEvent) -> void:
	if leaving >= 0.0:
		return
	if ev is InputEventMouseMotion:
		var h := -1
		if phase == "draw":
			h = _fan_hit(ev.position)
		elif phase == "end" and rise_r.has_point(ev.position):
			h = 99
		if h != hover:
			hover = h
			if h >= 0 and h != 99:
				Sfx.play("page_close", 0.2, 1.5)
	elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		match phase:
			"draw":
				_draw_card(_fan_hit(ev.position))
			"turn":
				_turn()
			"open", "told":
				_next()
			"end":
				if rise_r.has_point(ev.position) or end_t > 1.5:
					_finish()

func _unhandled_key_input(ev: InputEvent) -> void:
	if not (ev is InputEventKey) or not ev.pressed or leaving >= 0.0:
		return
	match ev.keycode:
		KEY_ESCAPE:
			if phase == "end":
				_finish()
			else:
				_skip()
		KEY_ENTER, KEY_KP_ENTER, KEY_SPACE:
			match phase:
				"draw":
					_draw_card(randi() % maxi(1, deck.size()))
				"turn":
					_turn()
				"open", "told":
					_next()
				"end":
					_finish()
		_:
			return
	get_viewport().set_input_as_handled()

# ------------------------------------------------------------------ drawing

func _wrap(s: String, f: Font, size: int, width: float) -> PackedStringArray:
	var out := PackedStringArray()
	for para in s.split("\n"):
		var line := ""
		for word in para.split(" ", false):
			var tt := word if line == "" else line + " " + word
			if f.get_string_size(tt, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > width and line != "":
				out.append(line)
				line = word
			else:
				line = tt
		if line != "":
			out.append(line)
	return out

func _card_at(ci: CanvasItem, c: Vector2, texture: Texture2D, ang: float, sx: float, a: float, lift: float = 0.0) -> void:
	ci.draw_set_transform(c + Vector2(0, -lift), ang, Vector2(maxf(sx, 0.02), 1.0))
	ci.draw_rect(Rect2(Vector2(-SW / 2.0 + 5, -SH / 2.0 + 8), Vector2(SW, SH)), Color(0, 0, 0, 0.45 * a))
	ci.draw_texture_rect(texture, Rect2(Vector2(-SW / 2.0, -SH / 2.0), Vector2(SW, SH)), false, Color(1, 1, 1, a))
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_all() -> void:
	var a := fade if leaving < 0.0 else fade * (1.0 - clampf(leaving / 1.2, 0.0, 1.0))
	var ci := root
	ci.draw_rect(Rect2(0, 0, 1920, 1080), Color(0.01, 0.01, 0.015, 0.66 * a))
	var sc := U.font("sc")
	var fi := U.font("italic")
	# where we are
	ci.draw_string(sc, Vector2(60, 70), "THE READING", HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color(MARROW_D, a))
	var p := _place()
	var title := "The Crown: what it is" if phase == "open" else ("The Spread" if phase == "end" else "%s: %s" % [p.get("name", ""), p.get("what", "")])
	ci.draw_string(sc, Vector2(60, 112), title, HORIZONTAL_ALIGNMENT_LEFT, -1, 34, Color(BONE, a))
	# the Red under the body, where the last card lies
	var uc: Vector2 = SLOT["under"]
	for k in 6:
		var rr := 150.0 - k * 18.0
		ci.draw_set_transform(uc, 0.0, Vector2(1.0, 0.45))
		ci.draw_circle(Vector2.ZERO, rr, Color(RED_POOL, (0.14 + k * 0.06) * a))
		ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	# the places not yet laid: faint outlines; the one being laid, its outline breathing
	for pl in [{"id": "crown"}] + _places():
		var pid := String(pl["id"])
		if laid.has(pid) or (not fly.is_empty() and fly["place"] == pid):
			continue
		var c: Vector2 = SLOT[pid]
		var on := phase in ["draw", "fly"] and pid == String(p.get("id", ""))
		var al := (0.45 + 0.35 * sin(t * 3.0)) if on else 0.16
		var ang := PI / 2.0 if pid == "under" else 0.0
		ci.draw_set_transform(c, ang, Vector2.ONE)
		ci.draw_rect(Rect2(Vector2(-SW / 2.0, -SH / 2.0), Vector2(SW, SH)), Color(MARROW, al * a), false, 1.5)
		ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	# the laid cards: face down until turned, then the face, head down when reversed; the one under lies across
	for pid in laid:
		var cd: Dictionary = laid[pid]
		var f: float = cd["flip"]
		var sx := absf(cos(f * PI))
		var shown := _tex("_back") if f < 0.5 else _face(cd["m"])
		var ang := (PI / 2.0 if pid == "under" else 0.0) + (PI if cd["rev"] and f >= 0.5 else 0.0)
		_card_at(ci, SLOT[pid], shown, ang, sx, a)
		if f >= 0.999 and pid != "crown" or pid == "crown":
			var nm := String(cd.get("name", ""))
			if pid != "under" or phase == "end":
				var c2: Vector2 = SLOT[pid] + Vector2(0, SH / 2.0 + 18 if pid != "under" else SW / 2.0 + 18)
				ci.draw_string(fi, c2 - Vector2(110, 0), nm + (", reversed" if cd["rev"] else ""), HORIZONTAL_ALIGNMENT_CENTER, 220, 16, Color(BONE_D, a * 0.9))
	# the card in flight
	if not fly.is_empty():
		var u: float = fly["t"]
		var e := u * u * (3.0 - 2.0 * u)
		var c3: Vector2 = (fly["from"] as Vector2).lerp(fly["to"], e) + Vector2(0, -60.0 * sin(PI * u))
		var ang2: float = lerpf(0.0, PI / 2.0 if fly["place"] == "under" else 0.0, e)
		_card_at(ci, c3, _tex("_back"), ang2, 1.0, a)
	# the fan: the deck, face down, waiting
	var dim := 1.0 if phase == "draw" else 0.45
	for i in deck.size():
		var fc: Array = _fan(i, deck.size())
		_card_at(ci, fc[0], _tex("_back"), fc[1], 1.0, a * dim, 26.0 if i == hover else 0.0)
	# the words
	if phase == "end":
		var y := 170.0
		for ln in _wrap(telling, fi, 26, 760.0):
			ci.draw_string(fi, Vector2(80, y), ln, HORIZONTAL_ALIGNMENT_LEFT, 760, 26, Color(BONE, a * clampf(end_t / 1.2, 0.0, 1.0)))
			y += 36.0
		if prophecy != "" and end_t > 1.5:
			y += 20.0
			for ln in _wrap("“%s”" % prophecy, fi, 30, 760.0):
				ci.draw_string(fi, Vector2(80, y), ln, HORIZONTAL_ALIGNMENT_LEFT, 760, 30, Color(MARROW, a * clampf((end_t - 1.5) / 1.0, 0.0, 1.0)))
				y += 40.0
		rise_r = Rect2(80, maxf(860.0, y + 30.0), 200, 56)
		var on2 := hover == 99
		ci.draw_rect(rise_r, Color(0.05, 0.04, 0.05, 0.9 * a))
		ci.draw_rect(rise_r, Color(MARROW if on2 else MARROW_D, a), false, 1.5)
		ci.draw_string(sc, rise_r.position + Vector2(0, 38), "Rise", HORIZONTAL_ALIGNMENT_CENTER, rise_r.size.x, 30, Color(BONE if on2 else BONE_D, a))
		return
	var words := said if said != "" else prompt
	if words != "":
		var y2 := 930.0
		for ln in _wrap(words, fi, 28, 1500.0):
			ci.draw_string(fi, Vector2(210, y2), ln, HORIZONTAL_ALIGNMENT_CENTER, 1500, 28, Color(BONE if said != "" else BONE_D, a))
			y2 += 38.0
	var hint: String = {"open": "click to go on", "draw": "draw a card from the deck    ·    Esc lets him lay the rest",
		"fly": "", "turn": "click to turn it over", "told": "click to go on"}.get(phase, "")
	ci.draw_string(fi, Vector2(0, 1056), hint, HORIZONTAL_ALIGNMENT_CENTER, 1920, 18, Color(ASH, a * (0.6 + 0.2 * sin(t * 2.0))))
