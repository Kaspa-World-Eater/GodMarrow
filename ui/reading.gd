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
## tools/reading/spread_data.py; faces by tools/reading/card_fronts.py), fanned face down. For each place but the last
## (Derek, 2026-10-10: "pick 3 face down from every draw, then they are shown face down and flipped over") the pilgrim
## draws three blind from the fan; they fly out and land face down in a row, turn themselves over one after another, and
## the pilgrim chooses one (hovering weighs it); the other two go back into the deck, and the chosen one flies to its
## place, where the deck may still turn it reversed. The card under the body is one blind draw, and stays face down
## until the end. Then he weaves the whole spread into one telling, a part to a click, and how the cards lie changes what
## he says; the last words send the pilgrim to the black mirror. What each card does in each place is never shown: it
## comes from the old pools of data/reading.json by card, place and which way up, summed within the caps into the
## pilgrim's fate (HeroStats.fate). Esc lets him lay the rest.
##
## His words come a letter at a time (Derek, 2026-10-10: "not so slow its annoying"); a click or a key brings the whole
## line at once, and the next click goes on. No colons anywhere the pilgrim reads ("doesnt feel like a normal
## conversation with those").
##
## Tests (GM_READ_ACT): "all" plays it through and rises; "end" lets him lay the rest and clicks through the telling;
## "pick" stops with three drawn face down; "flip" stops mid-turn; "offer" stops at the choice, weighing the middle
## card; "type" stops with the first card's story half told; "final" stops at the last words, waiting for the click;
## "esc" presses Esc with two of the three drawn, then clicks through the telling and rises.

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
## (spaced so each card's name fits under it, clear of the next)
const SLOT := {"crown": Vector2(1180, 110), "brow": Vector2(1180, 310), "heart": Vector2(1180, 510),
	"lhand": Vector2(960, 560), "rhand": Vector2(1400, 560), "belly": Vector2(1180, 710), "feet": Vector2(1180, 910),
	"under": Vector2(1470, 830)}
## how the whole hand's sum reads at the end, in the order it is shown (never card by card)
const FX_ORDER := ["skt0", "skt1", "skt2", "vit", "spi", "con", "life", "hpPct", "mana", "armor", "stam", "res", "res_fire", "res_cold", "res_poison",
	"dmg", "dmg_day", "dmg_night", "raised", "fcr", "frw", "regen", "lok", "potion", "lrad", "mf", "gold", "xp"]
const LAB := {"con": " Constitution", "vit": " Vitality", "spi": " Essence", "life": " life", "stam": " poise",
	"lok": " life after each kill", "armor": " armor", "mf": "% magic find", "hpPct": "% life", "dmg": "% damage",
	"dmg_night": "% damage in the dark", "dmg_day": "% damage under an open sky", "raised": "% damage to the raised dead",
	"fcr": "% faster cast rate", "gold": "% gold found", "res": "% magic resist", "res_fire": "% fire resist",
	"res_cold": "% cold resist", "res_poison": "% poison resist", "frw": "% faster movement", "xp": "% experience",
	"lrad": "% lantern reach", "potion": "% from draughts"}
## the hidden effects: each place's own pool in data/reading.json
const POOL := {"brow": "cards", "heart": "seeks", "lhand": "answers", "rhand": "sacs", "belly": "fears", "feet": "roads", "under": "cards"}
## the type (Derek, 2026-10-10: "can be a little larger"): every size about a fifth up from before
const FS_WORDS := 29              # his words under the fan
const LH_WORDS := 37.0
const WORDS_AT := Vector2(70, 770)
const WORDS_W := 860.0
const PARA := 12.0                # the breath between two paragraphs
const CPS := 65.0                 # letters a second as he speaks
const ALL := 1 << 20              # a budget that shows the whole of a line

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
var phase := "open"               # open, deck, pick, flip, offer, draw, fly, turn, told, end
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
var auto := ""                    # GM_READ_ACT (see the head of this file)
var rise_r := Rect2(70, 930, 220, 64)
var fly_rev_last := false
var picked: Array = []            # the three drawn blind for this place: {m, from, ang, t (flight 0..1), flip (0..1)}
var flip_i := 0                   # which of the three is turning itself over
var flip_wait := 0.0
var offer: Array = []             # the three, face up: the pilgrim chooses one
var back: Array = []              # the two passed over, going home to the deck: {m, from, t}
const OW := 162.0                 # a drawn card in the row: 54 x 84, drawn x3
const OH := 252.0
var tale: Array = []              # the end, told one part to a click: {pid, text, kind (tale, prophecy, sum, go)}
var tale_n := 0                   # how many parts are begun
var tale_t := 0.0                 # time since the last part began
var sum_a := 0.0                  # the hand's sum, coming up
var tp := {}                      # what he is saying -> how many letters of it are out

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

## a card's meaning set into a line: {g} as it is, {G} with a capital (it begins a sentence)
func _fill(line: String, g: String) -> String:
	return line.replace("{g}", g).replace("{G}", g.substr(0, 1).to_upper() + g.substr(1))

# ------------------------------------------------------------------ his words, a letter at a time

## what he is saying now: [key, length]; the key keeps a line's progress if it is set aside and comes back
func _speech() -> Array:
	if phase == "end":
		if tale_n <= 0 or tale_n > tale.size():
			return ["", 0]
		return ["end%d" % tale_n, _step_len(tale_n - 1)]
	var w := said if said != "" else prompt
	if w == "":
		return ["", 0]
	return ["%d|%s" % [place_i, w], w.length()]

func _shown() -> int:
	var sp := _speech()
	return int(float(tp.get(sp[0], 0.0)))

func _typing() -> bool:
	var sp := _speech()
	return int(sp[1]) > 0 and float(tp.get(sp[0], 0.0)) < float(sp[1])

## a click or a key while he speaks: the whole line at once
func _hurry() -> void:
	var sp := _speech()
	if int(sp[1]) > 0:
		tp[sp[0]] = float(sp[1])

func _type(dt: float) -> void:
	var sp := _speech()
	var n: int = sp[1]
	if n <= 0:
		return
	var v := float(tp.get(sp[0], 0.0))
	if v >= n:
		return
	v = minf(float(n), v + dt * CPS)
	if auto == "type" and phase == "told" and v >= n * 0.45:
		return                                       # (test: hold the first card's story half told)
	tp[sp[0]] = v

# ------------------------------------------------------------------ the draw

func _begin_place() -> void:
	var p := _place()
	if p.is_empty():
		_end()
		return
	said = ""
	hover = -1
	picked = []
	var pid := String(p["id"])
	var a: Array = p.get("ask", [""])
	prompt = String(a[randi() % a.size()])
	# the choice: three drawn blind from the fan, turned over, one chosen; the last card is one blind draw
	phase = "pick" if pid != "under" and deck.size() >= 3 else "draw"

## where the three drawn for a place lie, in a row above the fan
func _offer_c(i: int) -> Vector2:
	return Vector2(190.0 + i * 240.0, 300.0)

func _offer_hit(pt: Vector2) -> int:
	for i in offer.size():
		if Rect2(_offer_c(i) - Vector2(OW, OH) / 2.0, Vector2(OW, OH)).has_point(pt):
			return i
	return -1

## the card at fan index i, drawn blind as one of the three: it flies out and lands face down in the row
func _pick_card(i: int) -> void:
	if phase != "pick" or picked.size() >= 3 or i < 0 or i >= deck.size():
		return
	var c := _fan(i, deck.size())
	var m: Dictionary = deck[i]
	deck.remove_at(i)
	picked.append({"m": m, "from": c[0], "ang": c[1], "t": 0.0, "flip": 0.0})
	hover = -1
	Sfx.play("page_open", 0.55, 1.15)

## the three in flight, then turning themselves over one after another; then the choice
func _pick_tick(dt: float) -> void:
	if phase != "pick" and phase != "flip":
		return
	var landed := true
	for pk in picked:
		pk["t"] = minf(1.0, float(pk["t"]) + dt / 0.45)
		if float(pk["t"]) < 1.0:
			landed = false
	if phase == "pick":
		if picked.size() >= 3 and landed and auto != "pick":   # (test "pick": hold them face down)
			phase = "flip"
			flip_i = 0
			flip_wait = 0.2
			hover = -1
		return
	if flip_wait > 0.0:
		flip_wait -= dt
		return
	if flip_i < picked.size():
		var pk: Dictionary = picked[flip_i]
		var f := float(pk["flip"])
		if auto == "flip" and flip_i == 1 and f >= 0.3:
			return                                   # (test "flip": hold the middle one mid-turn)
		if f <= 0.0:
			Sfx.play("page_close", 0.45, 1.25)
		pk["flip"] = minf(1.0, f + dt / 0.25)
		if float(pk["flip"]) >= 1.0:
			flip_i += 1
			flip_wait = 0.08
		return
	offer = []
	for pk in picked:
		offer.append(pk["m"])
	picked = []
	phase = "offer"
	var dl: Array = S.get("deal", {}).get(String(_place().get("id", "")), [""])
	prompt = String(dl[randi() % dl.size()])

## the pilgrim chooses one of the three; the others go back into the deck; the deck may still turn it over as it lands
func _choose(i: int) -> void:
	if phase != "offer" or i < 0 or i >= offer.size():
		return
	var m: Dictionary = offer[i]
	for k in offer.size():
		if k != i:
			back.append({"m": offer[k], "from": _offer_c(k), "t": 0.0})
	var from := _offer_c(i)
	offer = []
	var pid := String(_place()["id"])
	fly = {"m": m, "rev": randf() < 0.32, "from": from, "to": SLOT[pid], "t": 0.0, "place": pid, "face": true, "big": true}
	phase = "fly"
	hover = -1
	var cl: Array = S.get("chose", [""])
	prompt = String(cl[randi() % cl.size()])
	said = ""
	Sfx.play("page_open", 0.8, 0.85)
	Sfx.play("shuffle", 0.7)

## the two passed over, home again: when they reach the fan they are shuffled in
func _back_tick(dt: float) -> void:
	for r in back.duplicate():
		r["t"] = minf(1.0, float(r["t"]) + dt / 0.4)
		if float(r["t"]) >= 1.0:
			back.erase(r)
			deck.append(r["m"])
			deck.shuffle()

func _back_flush() -> void:
	for r in back:
		deck.append(r["m"])
	back = []

## the meaning of an offered card in this place, as the pilgrim weighs it (upright: the deck has not turned it yet)
func _weigh(i: int) -> String:
	var m: Dictionary = offer[i]
	var pid := String(_place().get("id", ""))
	return "%s. %s" % [_name_of(m), _fill(String(S.get("on", {}).get(pid, "{G}.")), String(m.get("gist", "")))]

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
	fly_rev_last = fly["rev"]
	var chosen: bool = fly.get("face", false)
	laid[pid] = {"m": m, "rev": fly["rev"], "flip": 1.0 if chosen else 0.0, "name": _name_of(m)}
	_take(pid, m, fly["rev"])
	fly = {}
	if chosen:
		# chosen face up: its story at once, and if the deck turned it as it landed, he says so first
		_turned(pid)
		if fly_rev_last:
			var tv: Array = S.get("turned", [""])
			said = String(tv[randi() % tv.size()]) + "\n\n" + said
		return
	if pid == "under":
		# it stays face down, under everything, until the end
		said = ""
		place_i += 1
		_begin_place()
		return
	phase = "turn"
	var dr: Array = S.get("drawn_rev" if fly_rev_last else "drawn", [""])
	prompt = String(dr[randi() % dr.size()])

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
	var rd: Array = S.get("read", {}).get(pid, [])
	if not rd.is_empty():
		said += "\n\n" + _fill(String(rd[randi() % rd.size()]), String(m.get("gist_rev" if c["rev"] else "gist", "")))
	phase = "told"

func _next() -> void:
	if phase == "open":
		phase = "deck"
		var dl: Array = S.get("deck_open", [""])
		said = String(dl[randi() % dl.size()])
		Sfx.play("shuffle", 0.8)
	elif phase == "deck":
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
	var home := not picked.is_empty() or not offer.is_empty() or not back.is_empty()
	for pk in picked:
		deck.append(pk["m"])
	picked = []
	deck.append_array(offer)
	offer = []
	_back_flush()
	deck.shuffle()
	if home:
		Sfx.play("shuffle", 0.6)
	if phase == "fly":
		_landed()
	if phase == "open" or phase == "deck":
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
	tale_n = 0
	tale_t = 0.0
	sum_a = 0.0
	prompt = ""
	said = ""
	picked = []
	offer = []
	_back_flush()
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
	# after the tale: the cards' last words, the hand's sum, and his last words, to the black mirror (Derek,
	# 2026-10-10: "we should also be told to look into the black mirror and walk to it")
	var T: Dictionary = S.get("tale", {})
	var go: Array = T.get("go", [""]) if T.get("go") is Array else [String(T.get("go", ""))]
	tale.append({"pid": "", "kind": "prophecy", "text": ""})
	tale.append({"pid": "", "kind": "sum", "text": ""})
	tale.append({"pid": "", "kind": "go", "text": String(go[randi() % go.size()])})

func _phrase(c: Dictionary) -> String:
	var m: Dictionary = c["m"]
	return String(m.get("rev" if c["rev"] else "one", ""))

## the whole spread told as a story (Derek, 2026-10-09: "the end sequence needs work. More story like"): one part a
## place, in the order a life goes, each lighting its card as it is told; how the spread lies changes what he says
func _weave() -> String:
	var T: Dictionary = S.get("tale", {})
	tale = []
	var pick := func(key: String) -> String:
		var v: Array = T.get(key, [""]) if T.get(key) is Array else [String(T.get(key, ""))]
		return String(v[randi() % v.size()])
	for key in S.get("tale_order", []):
		if key == "open":
			tale.append({"pid": "", "text": pick.call("open")})
			continue
		if not laid.has(key):
			continue
		var c: Dictionary = laid[key]
		var m: Dictionary = c["m"]
		var wears := String(m.get("wears", ""))
		var txt := _fill(String(pick.call(key)).replace("{p}", _phrase(c)), String(m.get("gist_rev" if c["rev"] else "gist", "")))
		txt = txt.replace("{W}", wears.substr(0, 1).to_upper() + wears.substr(1))
		tale.append({"pid": key, "text": txt})
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
	var shapes := []
	for tst in tests:
		if tst[1] and said_shapes < 2 and sh.has(tst[0]):
			shapes.append(String(sh[tst[0]]).replace("{a}", String(S.get("aspect_word", {}).get(mine, mine))))
			said_shapes += 1
	if not shapes.is_empty():
		tale.append({"pid": "crown", "text": " ".join(PackedStringArray(shapes))})
	tale.append({"pid": "", "text": pick.call("close")})
	var all: Array = []
	for part in tale:
		all.append(part["text"])
	return " ".join(PackedStringArray(all))

func _kind(i: int) -> String:
	return String(tale[i].get("kind", "tale")) if i >= 0 and i < tale.size() else ""

func _quote() -> String:
	return "“%s”" % prophecy

## how many letters a part of the end has, as he speaks it
func _step_len(i: int) -> int:
	match _kind(i):
		"prophecy":
			return String(S.get("tale", {}).get("prophecy", "")).length() + 1 + _quote().length()
		"sum":
			return String(S.get("close_sum", "")).length()
	return String(tale[i]["text"]).length()

func _tale_pid() -> String:
	return String(tale[tale_n - 1]["pid"]) if tale_n > 0 and tale_n <= tale.size() else ""

## a click in the end: the whole of what he is saying, else the next part, and at the very last, rise
func _tale_next() -> void:
	if _typing():
		_hurry()
	elif tale_n < tale.size():
		tale_n += 1
		tale_t = 0.0
		Sfx.play("page_close", 0.35, 0.8)
	elif tale_n > 0:
		_finish()

func _fx_line(k: String, v: float) -> String:
	var sgn := "+" if v > 0 else "-"
	var n := str(int(absf(v))) if absf(v) >= 1.0 or is_zero_approx(fmod(absf(v), 1.0)) else str(snappedf(absf(v), 0.1))
	match k:
		"skt0", "skt1", "skt2":
			var tabs: Array = []
			var cj = JSON.parse_string(FileAccess.get_file_as_string("res://data/classes.json"))
			if cj is Dictionary:
				tabs = cj.get(cls, {}).get("tabs", [])
			var ti := int(k.substr(3))
			return "%s%s to %s skills" % [sgn, n, String(tabs[ti]) if ti < tabs.size() else "one way's"]
		"mana": return "%s%s to your %s" % [sgn, n, _res_word()]
		"regen": return "%s%s%% %s regained" % [sgn, n, _res_word()]
	if LAB.has(k):
		return sgn + n + String(LAB[k])
	return "%s%s %s" % [sgn, n, k]

func _res_word() -> String:
	return {"animancer": "Essence", "ossumancer": "Marrow", "hemomancer": "Vitae", "miasmancer": "Miasma", "monk": "Sand"}.get(cls, "Essence")

func _turned_under() -> bool:
	for i in tale_n:
		if tale[i]["pid"] == "under":
			return true
	return false

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
	_type(dt)
	if not fly.is_empty():
		fly["t"] = minf(1.0, float(fly["t"]) + dt / 0.45)
		if float(fly["t"]) >= 1.0:
			_landed()
	_pick_tick(dt)
	_back_tick(dt)
	for pid in laid:
		if laid[pid].has("turning"):
			laid[pid]["flip"] = minf(1.0, float(laid[pid]["flip"]) + dt / 0.4)
			if float(laid[pid]["flip"]) >= 1.0:
				laid[pid].erase("turning")
				_turned(pid)
	if phase == "end":
		end_t += dt
		tale_t += dt
		if tale_n == 0 and end_t > 0.6:
			tale_n = 1
			tale_t = 0.0
		var ck := _kind(tale_n - 1)
		if ck == "go" or (ck == "sum" and not _typing()):
			sum_a = minf(1.0, sum_a + dt / 0.8)
		if laid.has("under") and tale_n > 0 and _turned_under() and float(laid["under"]["flip"]) < 1.0:
			laid["under"]["flip"] = minf(1.0, float(laid["under"]["flip"]) + dt / 0.6)
	if leaving >= 0.0:
		leaving += dt
		if leaving >= 1.2:
			if on_done.is_valid():
				on_done.call(result())
			queue_free()
			return
	if auto != "" and leaving < 0.0 and fmod(t, 0.3) < dt:
		_auto()
	root.queue_redraw()

## the test runs (GM_READ_ACT), a click every 0.3 s
func _auto() -> void:
	if auto == "end" or auto == "final":
		if phase != "end":
			_skip()
		elif auto == "final" and tale_n >= tale.size() and not _typing():
			return                                   # (test "final": the last words, waiting for the click)
		else:
			_tale_next()
		return
	match phase:
		"open", "deck":
			if _typing():
				_hurry()
			else:
				_next()
		"told":
			if auto == "type":
				return                               # (test "type": the first card's story, half told)
			if _typing():
				_hurry()
			else:
				_next()
		"pick":
			if auto == "esc" and picked.size() == 2:
				_skip()                              # (test "esc": Esc in the middle of the drawing)
			elif picked.size() < 3:
				var n := deck.size()
				_pick_card(clampi(int(n * [0.2, 0.5, 0.8][picked.size()]), 0, n - 1))
		"draw":
			_draw_card(0)
		"offer":
			if auto == "offer":
				hover = 1                            # (test: stop at the first choice, weighing the middle card)
			else:
				_choose(0)
		"turn":
			_turn()
		"end":
			_tale_next()

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

func _fan_live() -> bool:
	return phase == "draw" or (phase == "pick" and picked.size() < 3)

func _at_last() -> bool:
	return phase == "end" and tale_n >= tale.size() and tale_n > 0 and not _typing()

func _gui(ev: InputEvent) -> void:
	if leaving >= 0.0:
		return
	if ev is InputEventMouseMotion:
		var h := -1
		if _fan_live():
			h = _fan_hit(ev.position)
		elif phase == "offer":
			h = _offer_hit(ev.position)
		elif _at_last() and rise_r.has_point(ev.position):
			h = 99
		if h != hover:
			hover = h
			if h >= 0 and h != 99:
				Sfx.play("page_close", 0.2, 1.5)
	elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		var hit := -1
		match phase:
			"pick":
				hit = _fan_hit(ev.position) if picked.size() < 3 else -1
				if hit >= 0:
					_pick_card(hit)
			"draw":
				hit = _fan_hit(ev.position)
				if hit >= 0:
					_draw_card(hit)
			"offer":
				hit = _offer_hit(ev.position)
				if hit >= 0:
					_choose(hit)
			"turn":
				if _typing():
					_hurry()
				else:
					_turn()
			"open", "deck", "told":
				if _typing():
					_hurry()
				else:
					_next()
			"end":
				_tale_next()
		if hit < 0 and phase in ["pick", "flip", "offer", "draw", "fly"]:
			_hurry()                                 # (a click beside the cards: his words, all at once)

func _unhandled_key_input(ev: InputEvent) -> void:
	if not (ev is InputEventKey) or not ev.pressed or leaving >= 0.0:
		return
	match ev.keycode:
		KEY_ESCAPE:
			if phase == "end":
				_tale_next()
			else:
				_skip()
		KEY_ENTER, KEY_KP_ENTER, KEY_SPACE:
			if phase != "end" and _typing():
				_hurry()
			else:
				match phase:
					"pick":
						_pick_card(randi() % maxi(1, deck.size()))
					"draw":
						_draw_card(randi() % maxi(1, deck.size()))
					"offer":
						_choose(maxi(hover, 0))
					"turn":
						_turn()
					"open", "deck", "told":
						_next()
					"end":
						_tale_next()
		_:
			return
	get_viewport().set_input_as_handled()

# ------------------------------------------------------------------ drawing

## words wrapped to a width; a blank line ("\n\n") becomes "" (a breath between paragraphs)
func _wrap(s: String, f: Font, size: int, width: float) -> PackedStringArray:
	var out := PackedStringArray()
	for para in s.split("\n"):
		if para.strip_edges() == "":
			if not out.is_empty() and out[out.size() - 1] != "":
				out.append("")
			continue
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

## words drawn as far as he has spoken them (budget: letters out); the lines are wrapped whole first, so nothing
## reflows as they come; returns the y under the whole of it
func _type_draw(ci: CanvasItem, text: String, f: Font, size: int, lh: float, at: Vector2, width: float, budget: int, col: Color) -> float:
	var y := at.y
	var left := budget
	for ln in _wrap(text, f, size, width):
		if ln == "":
			y += PARA
			left -= 1
			continue
		if left > 0:
			ci.draw_string(f, Vector2(at.x, y), ln if left >= ln.length() else ln.substr(0, left), HORIZONTAL_ALIGNMENT_LEFT, width, size, col)
		left -= ln.length() + 1
		y += lh
	return y

func _card_at(ci: CanvasItem, c: Vector2, texture: Texture2D, ang: float, sx: float, a: float, lift: float = 0.0, sz: Vector2 = Vector2(SW, SH)) -> void:
	ci.draw_set_transform(c + Vector2(0, -lift), ang, Vector2(maxf(sx, 0.02), 1.0))
	ci.draw_rect(Rect2(Vector2(-sz.x / 2.0 + 5, -sz.y / 2.0 + 8), sz), Color(0, 0, 0, 0.45 * a))
	ci.draw_texture_rect(texture, Rect2(-sz / 2.0, sz), false, Color(1, 1, 1, a))
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_all() -> void:
	var a := fade if leaving < 0.0 else fade * (1.0 - clampf(leaving / 1.2, 0.0, 1.0))
	var ci := root
	ci.draw_rect(Rect2(0, 0, 1920, 1080), Color(0.01, 0.01, 0.015, 0.66 * a))
	var sc := U.font("sc")
	var fi := U.font("italic")
	# where we are: the place, and under it what the place holds
	ci.draw_string(sc, Vector2(60, 66), "THE READING", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(MARROW_D, a))
	var p := _place()
	var title := "The Telling" if phase == "end" else String(p.get("name", ""))
	var sub := "" if phase == "end" else String(p.get("what", ""))
	if phase == "open":
		title = "The Crown"
		sub = "what it is"
	elif phase == "deck":
		title = "The Deck"
		sub = "what draws it"
	ci.draw_string(sc, Vector2(60, 112), title, HORIZONTAL_ALIGNMENT_LEFT, -1, 42, Color(BONE, a))
	if sub != "":
		ci.draw_string(fi, Vector2(62, 148), sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 27, Color(BONE_D, a))
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
		var on := phase in ["draw", "fly", "pick", "flip", "offer"] and pid == String(p.get("id", ""))
		var al := (0.45 + 0.35 * sin(t * 3.0)) if on else 0.16
		var ang := PI / 2.0 if pid == "under" else 0.0
		ci.draw_set_transform(c, ang, Vector2.ONE)
		ci.draw_rect(Rect2(Vector2(-SW / 2.0, -SH / 2.0), Vector2(SW, SH)), Color(MARROW, al * a), false, 1.5)
		ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	# the laid cards: face down until turned, then the face, head down when reversed; the one under lies across
	var in_tale := phase == "end" and (tale_n == 0 or _kind(tale_n - 1) == "tale")
	for pid in laid:
		var cd: Dictionary = laid[pid]
		var f: float = cd["flip"]
		var sx := absf(cos(f * PI))
		var shown := _tex("_back") if f < 0.5 else _face(cd["m"])
		var ang := (PI / 2.0 if pid == "under" else 0.0) + (PI if cd["rev"] and f >= 0.5 else 0.0)
		var told: bool = phase == "end" and pid == _tale_pid()
		if told:
			var gl := 0.55 + 0.3 * sin(t * 3.0)
			var rw := Vector2(SH, SW) if pid == "under" else Vector2(SW, SH)
			for k in 3:
				ci.draw_rect(Rect2(SLOT[pid] - rw / 2.0 - Vector2(4 + k * 3, 4 + k * 3), rw + Vector2(8 + k * 6, 8 + k * 6)), Color(MARROW, gl * a * (0.5 - k * 0.15)), false, 2.0)
		_card_at(ci, SLOT[pid], shown, ang, sx, a * (0.55 if in_tale and not told and pid != "crown" else 1.0))
		if f >= 0.999 or pid == "crown":
			var nm := String(cd.get("name", ""))
			if pid != "under" or phase == "end":
				var c2: Vector2 = SLOT[pid] + Vector2(0, SH / 2.0 + 22 if pid != "under" else SW / 2.0 + 22)
				ci.draw_string(fi, c2 - Vector2(150, 0), nm + (", reversed" if cd["rev"] else ""), HORIZONTAL_ALIGNMENT_CENTER, 300, 20, Color(BONE_D, a * 0.9))
	# the card in flight (a chosen one shrinks from the row to the cloth)
	if not fly.is_empty():
		var u: float = fly["t"]
		var e := u * u * (3.0 - 2.0 * u)
		var c3: Vector2 = (fly["from"] as Vector2).lerp(fly["to"], e) + Vector2(0, -60.0 * sin(PI * u))
		var ang2: float = lerpf(0.0, PI / 2.0 if fly["place"] == "under" else 0.0, e)
		var sz := Vector2(OW, OH).lerp(Vector2(SW, SH), e) if fly.get("big", false) else Vector2(SW, SH)
		_card_at(ci, c3, _face(fly["m"]) if fly.get("face", false) else _tex("_back"), ang2, 1.0, a, 0.0, sz)
	# the fan: the deck, face down, waiting
	if phase != "end":
		var dim := 1.0 if _fan_live() else 0.45
		for i in deck.size():
			var fc: Array = _fan(i, deck.size())
			_card_at(ci, fc[0], _tex("_back"), fc[1], 1.0, a * dim, 26.0 if _fan_live() and i == hover else 0.0)
	# the two passed over, going home to the fan
	for r in back:
		var u2: float = r["t"]
		var e2 := u2 * u2 * (3.0 - 2.0 * u2)
		var home: Vector2 = _fan(deck.size() >> 1, maxi(1, deck.size()))[0]
		_card_at(ci, (r["from"] as Vector2).lerp(home, e2), _face(r["m"]), 0.0, 1.0, a * (1.0 - u2 * 0.7), 0.0, Vector2(OW, OH).lerp(Vector2(SW, SH), e2))
	# the three drawn for this place: where they will lie, then flying out face down, then turning themselves over
	if phase == "pick" or phase == "flip":
		for k in range(picked.size(), 3):
			var oc0 := _offer_c(k)
			ci.draw_rect(Rect2(oc0 - Vector2(OW, OH) / 2.0, Vector2(OW, OH)), Color(MARROW, 0.22 * a), false, 1.5)
		for k in picked.size():
			var pk: Dictionary = picked[k]
			var u3: float = pk["t"]
			var e3 := u3 * u3 * (3.0 - 2.0 * u3)
			var c4: Vector2 = (pk["from"] as Vector2).lerp(_offer_c(k), e3) + Vector2(0, -50.0 * sin(PI * u3))
			var fl: float = pk["flip"]
			_card_at(ci, c4, _tex("_back") if fl < 0.5 else _face(pk["m"]), lerpf(float(pk["ang"]), 0.0, e3), absf(cos(fl * PI)), a, 0.0,
				Vector2(SW, SH).lerp(Vector2(OW, OH), e3))
	# the words
	if phase == "end":
		_draw_end(ci, a, sc, fi)
		return
	# the three, face up, each with its name; the one weighed lifted and lit
	if phase == "offer":
		for i in offer.size():
			var oc := _offer_c(i) + Vector2(0, -20.0 if i == hover else 0.0)
			_card_at(ci, oc, _face(offer[i]), 0.0, 1.0, a, 0.0, Vector2(OW, OH))
			if i == hover:
				ci.draw_rect(Rect2(oc - Vector2(OW, OH) / 2.0, Vector2(OW, OH)).grow(3), Color(MARROW, 0.8 * a), false, 2.0)
			var ny := _offer_c(i).y + OH / 2.0 + 30.0
			for ln in _wrap(_name_of(offer[i]), fi, 22, 228.0):
				ci.draw_string(fi, Vector2(_offer_c(i).x - 114.0, ny), ln, HORIZONTAL_ALIGNMENT_CENTER, 228, 22, Color(BONE if i == hover else BONE_D, a))
				ny += 26.0
	# his words: under the fan, on the left, clear of the spread; the meaning of a weighed card comes whole
	var words := said if said != "" else prompt
	var budget := _shown()
	if phase == "offer" and hover >= 0 and hover < offer.size():
		words = _weigh(hover)
		budget = ALL
	if words != "":
		_type_draw(ci, words, fi, FS_WORDS, LH_WORDS, WORDS_AT, WORDS_W, budget, Color(BONE if said != "" or budget == ALL else BONE_D, a))
	var hint: String = {"open": "click to go on", "deck": "click to go on",
		"pick": ["draw three, blind, from the deck", "two more", "one more", ""][mini(picked.size(), 3)],
		"draw": "draw the last card blind from the deck",
		"offer": "choose one", "turn": "click to turn it over", "told": "click to go on"}.get(phase, "")
	if hint != "" and phase in ["pick", "draw", "offer"]:
		hint += "    ·    Esc lets him lay the rest"
	ci.draw_string(fi, Vector2(0, 1056), hint, HORIZONTAL_ALIGNMENT_CENTER, 1920, 22, Color(ASH, a * (0.6 + 0.2 * sin(t * 2.0))))

## the end: the tale a part at a time, then the cards' last words, the hand's sum, and his last words; each waits for
## a click
func _draw_end(ci: CanvasItem, a: float, sc: Font, fi: Font) -> void:
	var y := 180.0
	var ck := _kind(tale_n - 1)
	var budget := _shown()
	if tale_n == 0 or ck == "tale":
		for i in range(maxi(0, tale_n - 4), tale_n):
			var cur := i == tale_n - 1
			y = _type_draw(ci, String(tale[i]["text"]), fi, 30, 39.0, Vector2(70, y), 820.0, budget if cur else ALL,
				Color(BONE if cur else BONE_D, a * (1.0 if cur else 0.55))) + 16.0
	else:
		# the cards' last words, to it
		var intro := String(S.get("tale", {}).get("prophecy", ""))
		var b := budget if ck == "prophecy" else ALL
		var dim := 1.0 if ck == "prophecy" else 0.75
		y = _type_draw(ci, intro, fi, 27, 34.0, Vector2(70, y), 820.0, b, Color(BONE_D, a * dim)) + 10.0
		y = _type_draw(ci, _quote(), fi, 36, 44.0, Vector2(70, y), 820.0, b - intro.length() - 1, Color(MARROW, a * dim)) + 18.0
		if ck == "sum" or ck == "go":
			# the whole hand, all together (never which card did which)
			y = _type_draw(ci, String(S.get("close_sum", "")), fi, 25, 32.0, Vector2(70, y), 820.0, budget if ck == "sum" else ALL,
				Color(BONE_D, a * (1.0 if ck == "sum" else 0.75))) + 10.0
			var ka := a * sum_a
			var gave: Array = []
			var took: Array = []
			for k in FX_ORDER:
				if fate.has(k):
					(gave if float(fate[k]) > 0.0 else took).append(k)
			ci.draw_string(sc, Vector2(70, y), "IT GAVE", HORIZONTAL_ALIGNMENT_LEFT, 400, 17, Color(ASH, ka))
			ci.draw_string(sc, Vector2(490, y), "IT TOOK", HORIZONTAL_ALIGNMENT_LEFT, 400, 17, Color(ASH, ka))
			y += 30.0
			var fb := U.font("book")
			for i in gave.size():
				ci.draw_string(fb, Vector2(70, y + i * 29.0), _fx_line(gave[i], fate[gave[i]]), HORIZONTAL_ALIGNMENT_LEFT, 400, 23, Color(Color("#9fb08a"), ka))
			for i in took.size():
				ci.draw_string(fb, Vector2(490, y + i * 29.0), _fx_line(took[i], fate[took[i]]), HORIZONTAL_ALIGNMENT_LEFT, 400, 23, Color(Color("#b58a7a"), ka))
			y += maxi(gave.size(), took.size()) * 29.0
		if ck == "go":
			# his last words: to the black mirror
			y = _type_draw(ci, String(tale[tale_n - 1]["text"]), fi, FS_WORDS, LH_WORDS, Vector2(70, y + 22.0), 820.0, budget, Color(BONE, a))
	var last := _at_last()
	if last:
		rise_r = Rect2(70, minf(y + 14.0, 990.0), 220, 64)
		var on2 := hover == 99
		ci.draw_rect(rise_r, Color(0.05, 0.04, 0.05, 0.9 * a))
		ci.draw_rect(rise_r, Color(MARROW if on2 else MARROW_D, a), false, 1.5)
		ci.draw_string(sc, rise_r.position + Vector2(0, 44), "Rise", HORIZONTAL_ALIGNMENT_CENTER, rise_r.size.x, 36, Color(BONE if on2 else BONE_D, a))
	var hint := "" if tale_n == 0 else ("click to rise" if last else "click to go on")
	ci.draw_string(fi, Vector2(0, 1056), hint, HORIZONTAL_ALIGNMENT_CENTER, 1920, 22, Color(ASH, a * (0.6 + 0.2 * sin(t * 2.0))))
