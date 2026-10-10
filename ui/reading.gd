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
## tools/reading/spread_data.py from his words in tools/reading/words.py; faces by tools/reading/card_fronts.py).
##
## It opens with the lowland rhyme (Derek, 2026-10-10: "add that fun poem to the begining"), half sung a line at a
## time as he takes up the deck, a sigil drawing itself into the great ring round the spread with each line; then the
## calling turns itself over at the crown; then the deck is shuffled and fanned. Before every place he speaks between
## the draws (Derek, 2026-10-10: "we need exposition and transition between draws"), a line to a click: what the cards
## so far say together, then what the next place governs. For each place but the last the pilgrim draws three blind
## from the fan; they land face down in a row and turn themselves over, and the pilgrim chooses one (hovering weighs it:
## its meaning in that place). Which way up a card lies is settled when it is drawn: a reversed one turns up head down,
## and he says so then, in a line of that card's own for that part of the body (Derek: "see how repetative this reads").
## The chosen card flies to its place and he reads it there, its meaning and what lies under the meaning. The card
## under the body is one blind draw, face down until the end. Then he weaves the whole spread into one telling, a part
## to a click; how the cards lie changes what he says; the last words send the pilgrim to the black mirror. What each
## card does is summed within the caps into the pilgrim's fate (HeroStats.fate). Esc lets him lay the rest.
##
## The look (Derek, 2026-10-10: "i want the whole experience to be esoteric and for that to be a visual experience as
## well"): a great ring with a seven-pointed star drawn in round the spread, its ticks like an astrolabe's; each empty
## place marked by its own faint diagram; the laid cards joined in a slow line, crown to feet; dust motes in the fire's
## light; a breathing dark at the edges (shaders/reading_veil.gdshader); the faces' glyphs kindling when they turn up
## (an additive pass of the face over itself). (An ink-bleed between the parts was tried and cut, Derek, 2026-10-10:
## "i dont like the transition of black smoke or whatever in the card game, get rid of it"; the parts simply follow.)
## Every drawn mark is 2 x 2 screen px (MASTER_RULES 3.7); no red light, no fog. A card the mouse passes over ruffles (Derek:
## "id like a light ruffle to the cards when the mouse passes over them"): a small tilt and lift and a shiver, on a damped
## spring, never a bounce.
##
## His words come a letter at a time at one speed (Derek, 2026-10-10: "not so slow its annoying"), in Cormorant Garamond
## (OFL, art/fonts/OFL-CormorantGaramond.txt) in a warm aged tone (Derek: "the font is a bit bold in the stranger talk,
## needs to be more stylized and the color is too white"); a click or a key brings the whole line at once, and the next
## click goes on. No colons anywhere the pilgrim reads.
##
## Tests (GM_READ_ACT): "all" plays it through and rises; "end" lets him lay the rest and clicks through the telling;
## "rhyme" stops with the rhyme sung and his aside half said; "pick" stops with three drawn face down; "flip" stops
## mid-turn; "offer" stops at a choice, weighing the middle card and passing the mouse over it now and then (the ruffle),
## at the place GM_READ_AT names (0 the brow, 3 the right hand; default 0); "told" stops with the first card read in
## full; "bridge" stops between the brow and the heart, his look at the cards so far typed; "type" stops with the first
## card's reading half told; "final" stops at the last words, waiting for the click; "esc" presses Esc with two of the
## three drawn, then clicks through the telling and rises; "shuffle" stops mid-riffle; "slow" plays it all through like
## "all" but lets every line type out in full first; "stack" stops at the crown, the deck lying squared. GM_READ_FX=0
## plays it blind and =1 shows the effects, whatever Settings.reading_effects says.

const U := preload("res://ui/uikit.gd")
## the colours (Derek's partner, 2026-10-10: the words must read and the colours must not look bad; Derek: "the color is
## too white"): an aged parchment for his words, a deeper one for what is past, a muted gold for names and titles;
## every word over a shadow
const BONE := Color("#dcc9a1")
const BONE_D := Color("#b5a17c")
const ASH := Color("#8f8169")
const MEAN_C := Color("#d9bd88")       # a card's meaning, as it is weighed (italic)
const MARROW := Color("#dcb064")
const MARROW_D := Color("#b48d4c")
const GAIN_C := Color("#b5d39a")       # what a card gives
const LOSS_C := Color("#e5a493")       # what it takes
const RED_POOL := Color(0.16, 0.02, 0.03)
const SW := 108.0                 # a card on the cloth: 54 x 84, drawn x2
const SH := 168.0
const ASPECT_OF := {"ossumancer": "bone", "animancer": "soul", "hemomancer": "flesh", "miasmancer": "breath", "monk": "silence"}
## where each card lies (its centre): the body, head at the top; the last card under it, lying across, in the Red
## (spaced so each card's name fits under it, clear of the next)
const SLOT := {"crown": Vector2(1180, 110), "brow": Vector2(1180, 310), "heart": Vector2(1180, 510),
	"lhand": Vector2(900, 560), "rhand": Vector2(1460, 560), "belly": Vector2(1180, 710), "feet": Vector2(1180, 910),
	"under": Vector2(1470, 830)}
## the line that joins the laid cards: each place from the one it hangs from
const LINK := {"brow": "crown", "heart": "brow", "lhand": "heart", "rhand": "heart", "belly": "heart", "feet": "belly",
	"under": "feet"}
## how the whole hand's sum reads at the end, in the order it is shown (never card by card)
const FX_ORDER := ["skt0", "skt1", "skt2", "vit", "spi", "con", "life", "hpPct", "mana", "armor", "stam", "res", "res_fire", "res_cold", "res_poison",
	"dmg", "dmg_day", "dmg_night", "raised", "fcr", "frw", "regen", "lok", "potion", "lrad", "mf", "gold", "xp"]
const LAB := {"con": " Constitution", "vit": " Vitality", "spi": " Essence", "life": " life", "stam": " poise",
	"lok": " life after each kill", "armor": " armor", "mf": "% magic find", "hpPct": "% life", "dmg": "% damage",
	"dmg_night": "% damage in the dark", "dmg_day": "% damage under an open sky", "raised": "% damage to the raised dead",
	"fcr": "% faster cast rate", "gold": "% gold found", "res": "% magic resist", "res_fire": "% fire resist",
	"res_cold": "% cold resist", "res_poison": "% miasma resist", "frw": "% faster movement", "xp": "% experience",
	"lrad": "% lantern reach", "potion": "% from draughts"}
## the hidden effects: each place's own pool in data/reading.json
const POOL := {"brow": "cards", "heart": "seeks", "lhand": "answers", "rhand": "sacs", "belly": "fears", "feet": "roads", "under": "cards"}
## the type: Cormorant's small x-height wants a size or so more than a sans
const FS_WORDS := 34              # his words under the fan
const LH_WORDS := 41.0
const WORDS_AT := Vector2(70, 738)
const WORDS_W := 700.0           # (clear of the great ring)
const PARA := 12.0                # the breath between two paragraphs
const CPS := 65.0                 # letters a second as he speaks
const ALL := 1 << 20              # a budget that shows the whole of a line
const RHYME_HOLD := 0.9           # the breath after each line of the rhyme, while its sigil finishes drawing in
## the great ring round the spread
const RING_C := Vector2(1180, 510)
const RING_R := 468.0

var main: Node
var cls := "animancer"
var R: Dictionary = {}            # data/reading.json (the old pools: the hidden effects, the calling, the prophecies)
var S: Dictionary = {}            # data/reading_spread.json (the places, the mantles' words, the weaving)
var root: Control                 # the whole window: the backdrop, and every click
var stage: Control                # the spread's 1920 x 1080, centred in it
var group: CanvasGroup            # the stage drawn whole, then faded whole: cards never show through one another
var geo: Control                  # the ring, the star, the sigils and the line through the laid cards (behind them)
var glow: Control                 # the faces' glyphs kindling (an additive pass over the stage)
var veil: ColorRect               # the breathing dark at the edges
var body_font: Font               # his words: Cormorant Garamond, medium
var ital_font: Font               # the rhyme, a card's meaning as it is weighed, the hints: its italic
var stat_font: Font               # what the cards give and take: the roman, a little heavier
const BASE := Vector2(1920, 1080)
var tex := {}
var t := 0.0
var deck: Array = []              # the mantles still face down in the fan
var laid := {}                    # place -> {m, rev, flip (0 face down .. 1 turned), name, rt (when it turned up)}
var place_i := 0
var phase := "rhyme"              # rhyme, open, deck, bridge, pick, flip, offer, draw, fly, turn, told, end
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
var auto_at := 0                  # GM_READ_AT: the place the "offer" test stops at
var rise_r := Rect2(70, 930, 220, 64)
var fly_rev_last := false
var picked: Array = []            # the three drawn blind for this place: {m, from, ang, t (flight 0..1), flip (0..1), rev, rt}
var flip_i := 0                   # which of the three is turning itself over
var flip_wait := 0.0
var offer: Array = []             # the three, face up: the pilgrim chooses one
var offer_rev: Array = []         # which of them turned up head down (reversed)
var offer_rt: Array = []          # when each turned up (its glyph's kindling)
var rev_said: Array = []          # the reversal lines said for this place's three
var said_lines := {}              # every line he has said in this Reading: none is ever said twice
var back: Array = []              # the two passed over, going home to the deck: {m, from, t}
const OW := 162.0                 # a drawn card in the row: 54 x 84, drawn x3
const OH := 252.0
var tale: Array = []              # the end, told one part to a click: {pid, text, kind (tale, prophecy, sum, go)}
var tale_n := 0                   # how many parts are begun
var tale_t := 0.0                 # time since the last part began
var sum_a := 0.0                  # the hand's sum, coming up
var typed := 0.0                  # how many letters of what he is saying now are out
var typed_key := ""               # what he is saying now: a new line always starts from its first letter
## the rhyme: its lines, where each begins in what he says, the breath after each, and each line's sigil drawn in
var rhyme: Array = []
var rhyme_at: Array = []
var rhyme_len := 0
var rhyme_k := 0
var rhyme_hold := 0.0
var sig := [0.0, 0.0, 0.0, 0.0]
## between the draws: the lines he says before a place, a click each
var bridge: Array = []
var bridge_i := 0
## the ruffle: card id -> {a (tilt), va, y (lift), vy, sh (shiver)}
var ruf := {}
var ruf_id := ""                  # the card the mouse is over now (it stays a little lifted)
## the esoteric layer
var link_t := {}                  # place -> when its card landed (its line draws in from the place it hangs from)
var motes: Array = []
var glows: Array = []             # the faces drawn this frame, for the glyphs' glow: [centre, angle, x scale, size, texture, strength]
var geo_done := false
var geo_img: Image                # the ring and its marks, baked at one texel a 2 x 2 cell (redrawn only while they draw in)
var geo_tex: ImageTexture
var _img: Image = null            # while baking: where _dot puts its cells
## the deck before the spread (Derek, 2026-10-10: "the deck should be stacked before the spread and show the shuffle"):
## squared in a stack while he reads the crown; then cut in two, riffled together, squared, and fanned out
const STACK := Vector2(440, 610)  # where the stack lies (the middle of the fan)
const SHUF_SPLIT := 0.3           # the cut: the top half off to the right
const SHUF_RIFFLE := 1.05         # the riffle: the two halves let go into each other (the sound with it)
const SHUF_SQUARE := 1.4          # the bridge and the squaring
const SHUF_FAN := 1.55            # then the fan, card by card
const SHUF_END := 2.05
var shuf := -1.0                  # the shuffle's clock: below 0 the deck lies stacked; at SHUF_END it is fanned

func _init(m: Node = null, c: String = "animancer") -> void:
	main = m
	cls = c

## Cormorant Garamond (a variable face) at a weight
func _cormorant(italic: bool, w: int) -> Font:
	var p := "res://art/fonts/CormorantGaramond%s-VF.ttf" % ("-Italic" if italic else "")
	if not ResourceLoader.exists(p):
		return ThemeDB.fallback_font
	var fv := FontVariation.new()
	fv.base_font = load(p)
	fv.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): w}
	return fv

func _ready() -> void:
	layer = 26
	process_mode = Node.PROCESS_MODE_ALWAYS
	var j = JSON.parse_string(FileAccess.get_file_as_string("res://data/reading.json"))
	R = j if j is Dictionary else {}
	var k = JSON.parse_string(FileAccess.get_file_as_string("res://data/reading_spread.json"))
	S = k if k is Dictionary else {}
	deck = S.get("mantles", []).duplicate()
	deck.shuffle()
	body_font = _cormorant(false, 530)
	ital_font = _cormorant(true, 520)
	stat_font = _cormorant(false, 640)
	# the whole screen (Derek, 2026-10-10: "make the tarot the whole screen"): the backdrop fills the window edge to edge
	# at any shape (the viewport grows past 1920 x 1080 when the window is not 16:9); the spread is laid out on a 1920 x
	# 1080 stage kept in the middle of it
	root = Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.draw.connect(_draw_back)
	root.gui_input.connect(_gui)
	add_child(root)
	veil = ColorRect.new()
	veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var vm := ShaderMaterial.new()
	vm.shader = load("res://shaders/reading_veil.gdshader")
	veil.material = vm
	root.add_child(veil)
	# the ring sits behind the cards and outside their group, faded with it (inside it, its faint cells were
	# composited twice over and went out against the dark)
	geo = Control.new()
	geo.size = BASE
	geo.mouse_filter = Control.MOUSE_FILTER_IGNORE
	geo.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	geo.draw.connect(_draw_geo)
	geo_img = Image.create(int(BASE.x) / 2, int(BASE.y) / 2, false, Image.FORMAT_RGBA8)
	geo_tex = ImageTexture.create_from_image(geo_img)
	root.add_child(geo)
	group = CanvasGroup.new()
	group.modulate.a = 0.0
	root.add_child(group)
	stage = Control.new()
	stage.size = BASE
	stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	stage.draw.connect(_draw_all)
	group.add_child(stage)
	glow = Control.new()
	glow.size = BASE
	glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	glow.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var gm := CanvasItemMaterial.new()
	gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	glow.material = gm
	glow.draw.connect(_draw_glow)
	group.add_child(glow)
	auto = OS.get_environment("GM_READ_ACT")
	auto_at = int(OS.get_environment("GM_READ_AT")) if OS.get_environment("GM_READ_AT") != "" else 0
	# the dust in the fire's light
	for i in 46:
		motes.append({"p": Vector2(randf() * BASE.x, randf() * BASE.y), "v": randf_range(3.0, 11.0),
			"ph": randf() * TAU, "a": randf_range(0.08, 0.3)})
	# the crown: the calling, the one card it knows; it turns itself over when the rhyme is done
	var st: Dictionary = R.get("stars", {}).get(cls, {})
	laid["crown"] = {"m": {"id": "_" + ASPECT_OF.get(cls, "bone")}, "rev": false, "flip": 0.0, "name": String(st.get("name", ""))}
	picks.append({"step": "crown", "id": st.get("id", ""), "name": st.get("name", ""), "emb": "a_" + ASPECT_OF.get(cls, "bone"),
		"fx": st.get("fx", {}), "rev": false})
	# the rhyme, half sung a line at a time, then his aside
	rhyme = S.get("rhyme", [])
	var at := 0
	for l in rhyme:
		rhyme_at.append(at)
		at += String(l).length() + 1
	rhyme_len = maxi(0, at - 1)
	said = "\n".join(PackedStringArray(rhyme)) + "\n\n" + _line(S.get("rhyme_aside", []))
	phase = "rhyme"

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

func _cap(s: String) -> String:
	return s.substr(0, 1).to_upper() + s.substr(1)

## a name mid sentence: "The Wick" becomes "the Wick"
func _mid(n: String) -> String:
	return "the " + n.substr(4) if n.begins_with("The ") else n

## what a card means in this place, its way up: [short, sub] (each card has its own reading for every place)
func _mean(m: Dictionary, pid: String, rev: bool) -> Array:
	var mn = m.get("mean", {}).get(pid)
	if mn is Array and mn.size() == 2 and mn[1 if rev else 0] is Array:
		return mn[1 if rev else 0]
	return [String(m.get("rev" if rev else "one", "")), ""]

## one of his lines from a pool, never one he has said before in this Reading (Derek, 2026-10-10: "he says it too
## much"); "" when the pool is spent, and then he says nothing
func _line(pool: Array) -> String:
	var fresh: Array = []
	for l in pool:
		if String(l) != "" and not said_lines.has(String(l)):
			fresh.append(String(l))
	if fresh.is_empty():
		return ""
	var l: String = fresh[randi() % fresh.size()]
	said_lines[l] = true
	return l

## his words filled in from the spread so far: {crown}/{Crown} the calling's card, {a} its aspect word, {brow}/{Brow}
## a laid card's name, {brow_m}/{Brow_m} its meaning in its place, {asp} the aspect word of the card laid last
func _vars(s: String) -> String:
	var st: Dictionary = R.get("stars", {}).get(cls, {})
	var cn := String(st.get("name", ""))
	var aw: Dictionary = S.get("aspect_word", {})
	var mine: String = ASPECT_OF.get(cls, "bone")
	s = s.replace("{crown}", _mid(cn)).replace("{Crown}", cn).replace("{a}", String(aw.get(mine, mine)))
	var last := ""
	for pl in _places():
		var pid := String(pl["id"])
		if not laid.has(pid):
			continue
		var c: Dictionary = laid[pid]
		var nm := _name_of(c["m"])
		var mm := String(_mean(c["m"], pid, c["rev"])[0])
		s = s.replace("{%s}" % pid, _mid(nm)).replace("{%s}" % _cap(pid), nm)
		s = s.replace("{%s_m}" % pid, mm).replace("{%s_m}" % _cap(pid), _cap(mm))
		last = String(c["m"].get("aspect", ""))
	return s.replace("{asp}", String(aw.get(last, last)))

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
	return [w, w.length()]

## the same for every line he says (Derek, 2026-10-10: "doesnt animate in consistantly"): whenever what he is saying
## changes, it types in again from its first letter; only when he goes on (new words after a breath, _say_on) does what
## was already out stay out
func _sync() -> void:
	var k := String(_speech()[0])
	if k == typed_key:
		return
	if not (phase != "end" and typed_key != "" and k.begins_with(typed_key + "\n\n")):
		typed = 0.0
	typed_key = k

func _shown() -> int:
	_sync()
	return int(typed)

func _typing() -> bool:
	_sync()
	var n: int = _speech()[1]
	return n > 0 and typed < float(n)

## a click or a key while he speaks: the whole line at once
func _hurry() -> void:
	_sync()
	typed = maxf(typed, float(_speech()[1]))
	if phase == "rhyme":
		rhyme_k = rhyme.size()
		sig = [1.0, 1.0, 1.0, 1.0]

func _type(dt: float) -> void:
	_sync()
	var n: int = _speech()[1]
	if n <= 0 or typed >= n or t < 1.45:
		return                                       # (his first words wait until the cards are up)
	if phase == "rhyme" and rhyme_k < rhyme.size():
		# the rhyme: each line at the one speed, then a breath while its sigil finishes drawing in
		var e: int = int(rhyme_at[rhyme_k]) + String(rhyme[rhyme_k]).length()
		if typed >= e:
			rhyme_hold += dt
			sig[rhyme_k] = 0.4 + 0.6 * minf(1.0, rhyme_hold / RHYME_HOLD)
			if rhyme_hold < RHYME_HOLD * (1.5 if rhyme_k == rhyme.size() - 1 else 1.0):
				return
			sig[rhyme_k] = 1.0
			rhyme_hold = 0.0
			rhyme_k += 1
			if rhyme_k < rhyme.size():
				Sfx.play("page_close", 0.25, 0.7 + 0.08 * rhyme_k)
			return
		var v0 := minf(float(e), typed + dt * CPS)
		sig[rhyme_k] = 0.4 * clampf((v0 - float(rhyme_at[rhyme_k])) / maxf(1.0, float(String(rhyme[rhyme_k]).length())), 0.0, 1.0)
		typed = v0
		return
	var v := minf(float(n), typed + dt * CPS)
	if auto == "type" and phase == "told" and v >= n * 0.45:
		return                                       # (test "type": hold the first card's story half told)
	if auto == "rhyme" and phase == "rhyme" and v >= rhyme_len + 2 + (n - rhyme_len - 2) * 0.5:
		return                                       # (test "rhyme": the rhyme sung, his aside half said)
	typed = v

# ------------------------------------------------------------------ the draw

## a place begins: first he speaks between the draws, a line to a click (Derek, 2026-10-10: "we need exposition and
## transition between draws"), then the drawing
func _begin_place() -> void:
	var p := _place()
	if p.is_empty():
		_end()
		return
	said = ""
	prompt = ""
	hover = -1
	picked = []
	rev_said = []
	bridge = _bridge_lines(String(p["id"]))
	bridge_i = 0
	if bridge.is_empty():
		_start_draw()
		return
	phase = "bridge"
	said = bridge[0]

## the drawing: three blind from the fan, turned over, one chosen; the last card one blind draw. His last line before
## it stays up as the drawing begins.
func _start_draw() -> void:
	prompt = said if said != "" else (String(bridge.back()) if not bridge.is_empty() else "")
	said = ""
	phase = "pick" if String(_place().get("id", "")) != "under" and deck.size() >= 3 else "draw"

## what he says before a place: a look at the cards so far (the first condition that holds), then what the place is
func _bridge_lines(pid: String) -> Array:
	var B: Dictionary = S.get("bridge", {}).get(pid, {})
	var out: Array = []
	var look: Dictionary = B.get("look", {})
	for cnd in B.get("order", []):
		if look.has(cnd) and _cond(String(cnd), pid):
			var l := _line(look[cnd])
			if l != "":
				out.append(_vars(l))
				break
	var st := _line(B.get("set", []))
	if st != "":
		out.append(_vars(st))
	return out

## how the cards so far lie, for his look before a place
func _cond(c: String, pid: String) -> bool:
	var ps := _places()
	var idx := 0
	for i in ps.size():
		if String(ps[i]["id"]) == pid:
			idx = i
	var p1 := String(ps[idx - 1]["id"]) if idx >= 1 else ""
	var p2 := String(ps[idx - 2]["id"]) if idx >= 2 else ""
	var mine: String = ASPECT_OF.get(cls, "bone")
	match c:
		"default":
			return true
		"kin":
			return laid.has(p1) and String(laid[p1]["m"].get("aspect", "")) == mine
		"rev":
			return laid.has(p1) and bool(laid[p1]["rev"])
		"pair":
			return laid.has(p1) and laid.has(p2) and String(laid[p1]["m"].get("aspect", "")) == String(laid[p2]["m"].get("aspect", ""))
		"both_rev":
			return laid.has(p1) and laid.has(p2) and bool(laid[p1]["rev"]) and bool(laid[p2]["rev"])
		"many_rev":
			var n := 0
			for q in laid:
				if q != "crown" and bool(laid[q]["rev"]):
					n += 1
			return n >= 3
	return false

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
	picked.append({"m": m, "from": c[0], "ang": c[1], "t": 0.0, "flip": 0.0, "rev": randf() < 0.32, "rt": -1.0})   # its way up, settled now
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
		if f < 0.5 and float(pk["flip"]) >= 0.5:
			pk["rt"] = t                                 # its glyph kindles as it turns up
			if pk["rev"]:
				_rev_line(pk["m"])                       # it turns up head down, and he says so
		if float(pk["flip"]) >= 1.0:
			flip_i += 1
			flip_wait = 0.08
		return
	offer = []
	offer_rev = []
	offer_rt = []
	for pk in picked:
		offer.append(pk["m"])
		offer_rev.append(pk["rev"])
		offer_rt.append(pk["rt"])
	picked = []
	phase = "offer"

## he goes on speaking: the new words follow the old, and what was already out stays out
func _say_on(more: String) -> void:
	_sync()
	prompt = prompt + "\n\n" + more if prompt != "" else more

## a card of the three turns up head down: he says so, then and there, in that card's own line for that part of the
## body (never a formula; never the same line twice)
func _rev_line(m: Dictionary) -> void:
	var pid := String(_place().get("id", ""))
	var reg := "head" if pid in ["brow", "heart"] else ("hands" if pid in ["lhand", "rhand"] else "low")
	var tn: Dictionary = m.get("turned", {})
	var line := _line([tn.get(reg, "")])
	if line == "":
		for r2 in ["head", "hands", "low"]:
			line = _line([tn.get(r2, "")])
			if line != "":
				break
	if line == "":
		return
	if rev_said.is_empty():
		prompt = line
	else:
		_say_on(line)
	rev_said.append(line)

## the pilgrim chooses one of the three, the way up it turned; the others go back into the deck
func _choose(i: int) -> void:
	if phase != "offer" or i < 0 or i >= offer.size():
		return
	var m: Dictionary = offer[i]
	var rev: bool = offer_rev[i]
	for k in offer.size():
		if k != i:
			back.append({"m": offer[k], "from": _offer_c(k), "t": 0.0, "rev": offer_rev[k]})
	var from := _offer_c(i)
	offer = []
	offer_rev = []
	offer_rt = []
	var pid := String(_place()["id"])
	fly = {"m": m, "rev": rev, "from": from, "to": SLOT[pid], "t": 0.0, "place": pid, "face": true, "big": true}
	phase = "fly"
	hover = -1
	ruf_id = ""
	prompt = ""                                      # (nothing said over what the screen already shows)
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

## the meaning of an offered card in this place, as the pilgrim weighs it, the way up it turned (the name and the way
## up are already under the card; this is only what it would be here)
func _weigh(i: int) -> String:
	var m: Dictionary = offer[i]
	var rev: bool = offer_rev[i] if i < offer_rev.size() else false
	return _cap(String(_mean(m, String(_place().get("id", "")), rev)[0])) + "."

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
	laid[pid] = {"m": m, "rev": fly["rev"], "flip": 1.0 if chosen else 0.0, "name": _name_of(m), "rt": t if chosen else -1.0}
	link_t[pid] = t
	_take(pid, m, fly["rev"])
	fly = {}
	if chosen:
		# chosen face up, the way it turned: its reading at once
		_turned(pid)
		return
	if pid == "under":
		# it stays face down, under everything, until the end
		said = ""
		place_i += 1
		_begin_place()
		return
	phase = "turn"
	prompt = ""

func _turn() -> void:
	var pid := String(_place().get("id", ""))
	if phase != "turn" or not laid.has(pid) or laid[pid].has("turning"):
		return
	laid[pid]["turning"] = true
	Sfx.play("page_close", 0.7, 0.9)

## a card read in its place: what it is there, and what lies under that
func _turned(pid: String) -> void:
	var c: Dictionary = laid[pid]
	var mn := _mean(c["m"], pid, c["rev"])
	said = _cap(String(mn[0])) + ". " + String(mn[1])
	prompt = ""
	phase = "told"

func _next() -> void:
	if phase == "rhyme":
		phase = "open"
		said = String(S.get("crown_say", {}).get(cls, ""))
		if said == "":
			said = String(R.get("stars", {}).get(cls, {}).get("say", ""))
		laid["crown"]["turning"] = true
		Sfx.play("page_close", 0.7, 0.8)
	elif phase == "open":
		phase = "deck"
		said = _line(S.get("deck_open", [""]))
		shuf = 0.0                                   # the shuffle begins (its sound comes with the riffle)
	elif phase == "deck":
		shuf = SHUF_END
		place_i = 0
		_begin_place()
	elif phase == "bridge":
		if bridge_i + 1 < bridge.size():
			bridge_i += 1
			said = bridge[bridge_i]
		else:
			_start_draw()
	elif phase == "told":
		place_i += 1
		_begin_place()

func _name_of(m: Dictionary) -> String:
	for c in R.get("cards", []):
		if c.get("id", "") == m.get("id", ""):
			return String(c.get("name", ""))
	return String(m.get("id", ""))

## what the card does in this place, this way up, never shown: the card's own table for the place (each gives and takes,
## balanced over a whole hand; tools/reading/spread_data.py, tools/reading/balance_check.py); the old pools of
## data/reading.json only for a card without one
func _take(pid: String, m: Dictionary, rev: bool) -> void:
	picks.append({"step": pid, "id": m.get("id", ""), "name": _name_of(m), "emb": "m_" + String(m.get("id", "")), "fx": _fx_of(m, pid, rev), "rev": rev})

## what a card does in a place, one way up
func _fx_of(m: Dictionary, pid: String, rev: bool) -> Dictionary:
	var fx: Dictionary = {}
	var key: String = POOL.get(pid, "cards")
	var own = m.get("fx", {}).get(pid) if m.get("fx") is Dictionary else null
	if own is Array and own.size() == 2:
		fx = own[1 if rev else 0]
	elif key == "cards":
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
	return fx

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
	offer_rev = []
	offer_rt = []
	_back_flush()
	deck.shuffle()
	if home:
		Sfx.play("shuffle", 0.6)
	shuf = SHUF_END
	sig = [1.0, 1.0, 1.0, 1.0]
	rhyme_k = rhyme.size()
	if float(laid["crown"]["flip"]) < 1.0:
		laid["crown"]["flip"] = 1.0
		laid["crown"].erase("turning")
		laid["crown"]["rt"] = t
	if phase == "fly":
		_landed()
	if phase in ["rhyme", "open", "deck"]:
		place_i = 0
	while place_i < _places().size():
		var pid := String(_places()[place_i]["id"])
		if not laid.has(pid) and not deck.is_empty():
			var m: Dictionary = deck.pop_back()
			var rev := randf() < 0.32
			laid[pid] = {"m": m, "rev": rev, "flip": 0.0 if pid == "under" else 1.0, "name": _name_of(m), "rt": t}
			link_t[pid] = t + 0.12 * place_i
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
	offer_rev = []
	offer_rt = []
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
	# the calling it has become, a paragraph to a click, its card lit at the crown
	for para in S.get("calling", {}).get(cls, []):
		tale.append({"pid": "crown", "kind": "calling", "text": String(para)})
	# then a page of its own: what the mouth will put on them, and the last words, into the black glass (Derek,
	# 2026-10-10: "explain how passing through the mouth makes you become the class and explain the sudden armor and
	# clothes, but keep it esoteric and on theme")
	var wear := String(S.get("wearing", {}).get(cls, ""))
	if wear != "":
		tale.append({"pid": "crown", "kind": "wear", "text": wear})
	tale.append({"pid": "", "kind": "go", "text": _line(go)})

## the whole spread told as a story (Derek, 2026-10-09: "the end sequence needs work. More story like"): one part a
## place, in the order a life goes, each lighting its card as it is told; how the spread lies changes what he says
func _weave() -> String:
	var T: Dictionary = S.get("tale", {})
	tale = []
	var pick := func(key: String) -> String:
		var v: Array = T.get(key, [""]) if T.get(key) is Array else [String(T.get(key, ""))]
		return _line(v)
	for key in S.get("tale_order", []):
		if key == "open":
			tale.append({"pid": "", "text": pick.call("open")})
			continue
		if not laid.has(key):
			continue
		var c: Dictionary = laid[key]
		var m: Dictionary = c["m"]
		var mn := _mean(m, key, c["rev"])
		var nm := _name_of(m) + (", head down" if c["rev"] else "")
		var txt := String(pick.call(key))
		txt = txt.replace("{m}", String(mn[0])).replace("{M}", _cap(String(mn[0])))
		txt = txt.replace("{n}", _mid(nm)).replace("{N}", nm).replace("{s}", String(mn[1]))
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
			shapes.append(_vars(String(sh[tst[0]])))
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

# ------------------------------------------------------------------ the ruffle

## a card the mouse passes over: a kick of tilt (the way the mouse went) and lift, and a shiver
func _ruffle(id: String, dir: float, k: float = 1.0) -> void:
	if id == "":
		return
	var r: Dictionary = ruf.get(id, {"a": 0.0, "va": 0.0, "y": 0.0, "vy": 0.0, "sh": 0.0, "ph": randf() * TAU})
	r["va"] = float(r["va"]) + dir * 0.95 * k
	r["vy"] = float(r["vy"]) + 60.0 * k
	r["sh"] = maxf(float(r["sh"]), k)
	ruf[id] = r

## every ruffled card settles on its springs: the tilt underdamped a little (a shiver, then still), the lift damped
## near critical (it rises and stays while the mouse is on it, never bounces)
func _ruffle_tick(dt: float) -> void:
	var h := dt / 3.0
	for id in ruf.keys():
		var r: Dictionary = ruf[id]
		var to := (14.0 if phase == "offer" else 18.0) if id == ruf_id else 0.0
		var a := float(r["a"])
		var va := float(r["va"])
		var y := float(r["y"])
		var vy := float(r["vy"])
		for s in 3:
			va += (-240.0 * a - 9.5 * va) * h
			a += va * h
			vy += (-140.0 * (y - to) - 21.0 * vy) * h
			y += vy * h
		r["a"] = a
		r["va"] = va
		r["y"] = y
		r["vy"] = vy
		r["sh"] = float(r["sh"]) * exp(-dt * 5.5)
		if id != ruf_id and absf(a) < 0.0005 and absf(va) < 0.005 and absf(y) < 0.2 and absf(vy) < 0.5:
			ruf.erase(id)

## a card's ruffle now: [tilt, lift] (the lift kept on the 2 px grid)
func _ruf(id: String) -> Vector2:
	if not ruf.has(id):
		return Vector2.ZERO
	var r: Dictionary = ruf[id]
	var ang := float(r["a"]) + float(r["sh"]) * 0.014 * sin(t * 46.0 + float(r["ph"]))
	return Vector2(ang, roundf(float(r["y"]) / 2.0) * 2.0)

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
	_ruffle_tick(dt)
	if _shuffling() and not (auto == "shuffle" and shuf >= 0.62):   # (test "shuffle": hold it mid-riffle)
		var was := shuf
		shuf = minf(SHUF_END, shuf + dt)
		if was < SHUF_SPLIT and shuf >= SHUF_SPLIT:
			Sfx.play("shuffle", 0.85)
	for pid in laid:
		if laid[pid].has("turning"):
			var f0 := float(laid[pid]["flip"])
			laid[pid]["flip"] = minf(1.0, f0 + dt / (0.55 if pid == "crown" else 0.4))
			if f0 < 0.5 and float(laid[pid]["flip"]) >= 0.5:
				laid[pid]["rt"] = t
			if float(laid[pid]["flip"]) >= 1.0:
				laid[pid].erase("turning")
				if pid != "crown":
					_turned(pid)
	if phase == "end":
		end_t += dt
		tale_t += dt
		if tale_n == 0 and end_t > 0.6:
			tale_n = 1
			tale_t = 0.0
		var ck := _kind(tale_n - 1)
		if ck == "sum" and not _typing():
			sum_a = minf(1.0, sum_a + dt / 0.8)
		if laid.has("under") and tale_n > 0 and _turned_under() and float(laid["under"]["flip"]) < 1.0:
			var u0 := float(laid["under"]["flip"])
			laid["under"]["flip"] = minf(1.0, u0 + dt / 0.6)
			if u0 < 0.5 and float(laid["under"]["flip"]) >= 0.5:
				laid["under"]["rt"] = t
	# the dust, rising slowly through the fire's light
	for mo in motes:
		var p: Vector2 = mo["p"]
		p += Vector2(sin(t * 0.35 + float(mo["ph"])) * 4.0, -float(mo["v"])) * dt
		if p.y < -4.0:
			p = Vector2(randf() * BASE.x, BASE.y + 2.0)
		mo["p"] = p
	if leaving >= 0.0:
		leaving += dt
		if leaving >= 1.2:
			if on_done.is_valid():
				on_done.call(result())
			queue_free()
			return
	if auto != "" and leaving < 0.0 and fmod(t, 0.3) < dt:
		_auto()
	stage.position = ((root.size - BASE) / 2.0).floor()
	geo.position = stage.position
	glow.position = stage.position
	# the way in (Derek, 2026-10-10: "smooth the transition to the tarot read"): the cave darkens first, then the cards
	# come up out of it, then he speaks
	group.modulate.a = clampf((t - 0.45) / 0.8, 0.0, 1.0) * (1.0 - clampf(leaving / 1.2, 0.0, 1.0) if leaving >= 0.0 else 1.0)
	var vmat := veil.material as ShaderMaterial
	vmat.set_shader_parameter("size", root.size)
	vmat.set_shader_parameter("strength", _alpha())
	vmat.set_shader_parameter("breath", 0.5 + 0.5 * sin(t * TAU / 7.5))
	# the ring and its marks breathe with the dark; they are drawn again only while something in them is still drawing in
	geo.modulate.a = group.modulate.a * (0.82 + 0.18 * sin(t * TAU / 7.5 + 1.2))
	geo.queue_redraw()
	root.queue_redraw()
	stage.queue_redraw()
	glow.queue_redraw()

func _links_moving() -> bool:
	for pid in link_t:
		if t - float(link_t[pid]) < 1.0:
			return true
	return false

## the test runs (GM_READ_ACT), a click every 0.3 s
func _auto() -> void:
	if auto == "slow" and _typing():
		return                                       # (test "slow": every line typed out in full, at his own pace)
	if auto == "stack" and phase != "rhyme":
		return                                       # (test "stack": the crown up, the deck lying squared, before the shuffle)
	if auto == "end" or auto == "final":
		if phase != "end":
			_skip()
		elif auto == "final" and tale_n >= tale.size() and not _typing():
			return                                   # (test "final": the last words, waiting for the click)
		else:
			_tale_next()
		return
	match phase:
		"rhyme", "open", "deck":
			if auto == "rhyme" and phase == "rhyme":
				return                               # (test "rhyme": the rhyme sung, his aside coming)
			if _typing():
				_hurry()
			elif phase == "deck" and (auto == "shuffle" or _shuffling()):
				return                               # (the shuffle plays out; test "shuffle" holds it)
			else:
				_next()
		"bridge":
			if auto == "bridge" and place_i == 1:
				return                               # (test "bridge": his look at the brow, before the heart)
			if _typing():
				_hurry()
			else:
				_next()
		"told":
			if auto == "type" or auto == "told":
				return                               # (test "type": half told; "told": the first card read in full)
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
			if auto == "offer" and place_i >= auto_at:
				# (test: stop at the choice, weighing the middle card; the mouse passes over it now and then)
				hover = 1
				ruf_id = String(offer[1].get("id", ""))
				if fmod(t, 1.5) < 0.3:
					_ruffle(ruf_id, 1.0 if fmod(t, 3.0) < 1.5 else -1.0)
			else:
				_choose(0)
		"turn":
			_turn()
		"end":
			_tale_next()

## the fan: every card still face down, spread in an arc on the left of the cloth; [centre, angle]
func _fan(i: int, n: int) -> Array:
	var u := 0.5 if n <= 1 else float(i) / float(n - 1)
	var c := Vector2(110.0 + u * 590.0, 640.0 - 80.0 * sin(PI * u))
	return [c, (u - 0.5) * 0.55]

func _fan_hit(p: Vector2) -> int:
	for i in range(deck.size() - 1, -1, -1):
		var c: Vector2 = _fan(i, deck.size())[0]
		if Rect2(c - Vector2(SW, SH) / 2.0, Vector2(SW, SH)).grow(-6).has_point(p):
			return i
	return -1

func _fan_live() -> bool:
	return shuf >= SHUF_END and (phase == "draw" or (phase == "pick" and picked.size() < 3))

func _shuffling() -> bool:
	return shuf >= 0.0 and shuf < SHUF_END

func _at_last() -> bool:
	return phase == "end" and tale_n >= tale.size() and tale_n > 0 and not _typing()

func _gui(ev0: InputEvent) -> void:
	if leaving >= 0.0:
		return
	var ev := ev0
	if ev0 is InputEventMouse:
		ev = ev0.duplicate()
		ev.position = ev0.position - stage.position       # (the stage's own coordinates)
	if ev is InputEventMouseMotion:
		var h := -1
		var fan := false
		if _fan_live():
			h = _fan_hit(ev.position)
			fan = true
		elif phase == "offer":
			h = _offer_hit(ev.position)
		elif _at_last() and rise_r.has_point(ev.position):
			h = 99
		if h != hover:
			hover = h
			ruf_id = ""
			if h >= 0 and h != 99:
				Sfx.play("page_close", 0.2, 1.5)
				# the ruffle: the card the mouse passes onto, and a little of it into its neighbours in the fan
				var dir := signf(ev.relative.x) if absf(ev.relative.x) > 0.01 else (1.0 if randf() < 0.5 else -1.0)
				var ids: Array = deck if fan else offer
				ruf_id = String(ids[h].get("id", ""))
				_ruffle(ruf_id, dir)
				if fan:
					for nb in [h - 1, h + 1]:
						if nb >= 0 and nb < deck.size():
							_ruffle(String(deck[nb].get("id", "")), dir, 0.4)
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
			"rhyme", "open", "deck", "bridge", "told":
				if _typing() or (phase == "deck" and _shuffling()):
					_hurry()                         # (his words, and the shuffle, all at once)
					if phase == "deck":
						shuf = SHUF_END
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
					"rhyme", "open", "deck", "bridge", "told":
						_next()
					"end":
						_tale_next()
		_:
			return
	get_viewport().set_input_as_handled()

# ------------------------------------------------------------------ drawing: the marks, on the 2 x 2 grid

## a point of the marks: one 2 x 2 cell (while baking the ring, one texel of its image)
func _dot(ci: CanvasItem, p: Vector2, col: Color) -> void:
	if _img != null:
		var x := int(floorf(p.x / 2.0))
		var y := int(floorf(p.y / 2.0))
		if x >= 0 and y >= 0 and x < _img.get_width() and y < _img.get_height():
			_img.set_pixel(x, y, col)
		return
	ci.draw_rect(Rect2((p / 2.0).floor() * 2.0, Vector2(2, 2)), col)

## a line of cells from a toward b, drawn in as far as u; every gap-th cell only (2 a solid line)
func _pline(ci: CanvasItem, a: Vector2, b: Vector2, col: Color, u: float = 1.0, gap: int = 2) -> void:
	if u <= 0.0:
		return
	var e := a.lerp(b, clampf(u, 0.0, 1.0))
	var n := int(maxf(absf(e.x - a.x), absf(e.y - a.y)) / 2.0)
	for i in n + 1:
		if gap > 2 and (i * 2) % gap != 0:
			continue
		_dot(ci, a.lerp(e, float(i) / float(maxi(1, n))), col)

## an arc of cells round c from angle a0, as far as a0 + (a1 - a0) * u
func _parc(ci: CanvasItem, c: Vector2, r: float, a0: float, a1: float, col: Color, u: float = 1.0, gap: int = 2) -> void:
	if u <= 0.0:
		return
	var span := (a1 - a0) * clampf(u, 0.0, 1.0)
	var n := int(absf(span) * r / 2.0)
	for i in n + 1:
		if gap > 2 and (i * 2) % gap != 0:
			continue
		var an := a0 + span * float(i) / float(maxi(1, n))
		_dot(ci, c + Vector2(cos(an), sin(an)) * r, col)

## the ring round the spread (behind the cards), one texture: baked again only while something in it is drawing in
## (a canvas item of thousands of faint cells left undrawn lost its faintest ones, so they are baked instead)
func _draw_geo() -> void:
	if (not geo_done or _links_moving()) and (Engine.get_process_frames() % 3 == 0 or not geo_done and t > 1.6 + 6.5):
		_img = geo_img
		geo_img.fill(Color(0, 0, 0, 0))
		_bake_geo(geo)
		_img = null
		geo_tex.update(geo_img)
	geo.draw_texture_rect(geo_tex, Rect2(Vector2.ZERO, BASE), false)
	# the dust in the fire's light, behind the cards
	for mo in motes:
		var tw: float = 0.55 + 0.45 * sin(t * 0.8 + float(mo["ph"]) * 3.0)
		_dot(geo, mo["p"], Color(0.86, 0.74, 0.52, float(mo["a"]) * tw))

## the ring: drawn in as the rhyme is sung, its ticks, a seven-pointed star for the seven places of the body, the
## rhyme's four sigils on it, and the line that joins the laid cards
func _bake_geo(ci: CanvasItem) -> void:
	var gu := clampf((t - 1.6) / 6.5, 0.0, 1.0)      # how far the ring has drawn itself in
	var col := Color(MARROW, 0.2)
	var dim := Color(MARROW, 0.1)
	var u1 := smoothstep(0.0, 0.45, gu)
	_parc(ci, RING_C, RING_R, -PI / 2.0, PI * 1.5, col, u1)
	_parc(ci, RING_C, RING_R - 20.0, PI / 2.0, PI * 2.5, dim, smoothstep(0.15, 0.6, gu), 8)
	# the ticks, like an astrolabe's: every sixth part of a twelfth, longer at the twelfths
	var tu := smoothstep(0.35, 0.7, gu)
	for k in 60:
		if float(k) / 60.0 > tu:
			break
		var an := -PI / 2.0 + TAU * float(k) / 60.0
		var d := Vector2(cos(an), sin(an))
		var ln := 22.0 if k % 5 == 0 else 8.0
		_pline(ci, RING_C + d * (RING_R - 4.0), RING_C + d * (RING_R - 4.0 - ln), col)
	# the star: seven points, each joined to the third on from it
	var su := smoothstep(0.55, 1.0, gu)
	var pts: Array = []
	for k in 7:
		var an2 := -PI / 2.0 + TAU * float(k) / 7.0
		pts.append(RING_C + Vector2(cos(an2), sin(an2)) * (RING_R - 34.0))
	for k in 7:
		_pline(ci, pts[k], pts[(k + 3) % 7], dim, clampf(su * 7.0 - float(k), 0.0, 1.0))
	for k in 7:
		if su > float(k) / 7.0:
			_parc(ci, pts[k], 6.0, 0.0, TAU, col)
	# the inner ring about the heart
	_parc(ci, RING_C, 150.0, -PI / 2.0, PI * 1.5, dim, smoothstep(0.6, 1.0, gu), 6)
	# the rhyme's sigils, on the ring where its diagonals cross it: thread, frame, filling, and the gap for the name
	var at := [-0.75 * PI, -0.25 * PI, 0.25 * PI, 0.75 * PI]
	for i in 4:
		var c := RING_C + Vector2(cos(at[i]), sin(at[i])) * RING_R
		_sigil(ci, i, c, float(sig[i]))
	# the laid cards joined, crown to feet, each line drawing in as its card lands
	for pid in link_t:
		var from := String(LINK.get(pid, ""))
		if from == "" or not laid.has(from):
			continue
		var lu := clampf((t - float(link_t[pid])) / 0.9, 0.0, 1.0)
		_pline(ci, SLOT[from], SLOT[pid], Color(MARROW, 0.3), smoothstep(0.0, 1.0, lu), 4)
	geo_done = gu >= 1.0 and sig[3] >= 1.0 and phase != "rhyme"

## one of the rhyme's four sigils, drawn in as far as u: Soul for the thread (a spiral), Bone for the frame (a square
## braced), Flesh for the filling (a filled round), and none for the name (a broken ring, the gap at its top)
func _sigil(ci: CanvasItem, i: int, c: Vector2, u: float) -> void:
	if u <= 0.0:
		return
	var col := Color(MARROW, 0.24 + 0.3 * (1.0 - u) * u * 4.0)
	# a dark ground under it, so the ring breaks for it
	for y in range(-30, 32, 2):
		for x in range(-30, 32, 2):
			if Vector2(x, y).length() <= 30.0:
				_dot(ci, c + Vector2(x, y), Color(0.012, 0.01, 0.014, 0.85 * minf(1.0, u * 3.0)))
	_parc(ci, c, 30.0, 0.0, TAU, Color(MARROW, 0.12), u)
	match i:
		0:
			var n := int(160.0 * u)
			for k in n:
				var th := float(k) / 160.0 * 4.0 * PI
				_dot(ci, c + Vector2(cos(th), sin(th)) * (2.0 + 18.0 * th / (4.0 * PI)), col)
		1:
			var q := [Vector2(-16, -16), Vector2(16, -16), Vector2(16, 16), Vector2(-16, 16)]
			for k in 4:
				_pline(ci, c + q[k], c + q[(k + 1) % 4], col, clampf(u * 6.0 - float(k), 0.0, 1.0))
			_pline(ci, c + q[0], c + q[2], col, clampf(u * 6.0 - 4.0, 0.0, 1.0))
			_pline(ci, c + q[1], c + q[3], col, clampf(u * 6.0 - 5.0, 0.0, 1.0))
		2:
			_parc(ci, c, 18.0, -PI / 2.0, PI * 1.5, col, minf(1.0, u * 1.6))
			var fu := clampf(u * 2.0 - 1.0, 0.0, 1.0)
			for y in range(-14, 16, 2):
				for x in range(-14, 16, 2):
					if Vector2(x, y).length() < 15.0 * fu and ((x + y) / 2) % 2 == 0:
						_dot(ci, c + Vector2(x, y), col)
		3:
			_parc(ci, c, 18.0, -PI / 2.0 + 0.5, PI * 1.5 - 0.5, col, u)

## the glyphs kindling: each face drawn again over itself, added, warm (the gold of its lines lifts most)
func _draw_glow() -> void:
	for g in glows:
		var s: float = g[5]
		if s <= 0.01:
			continue
		glow.draw_set_transform(g[0], g[1], Vector2(maxf(float(g[2]), 0.02), 1.0))
		var sz: Vector2 = g[3]
		glow.draw_texture_rect(g[4], Rect2(-sz / 2.0, sz), false, Color(0.62 * s, 0.46 * s, 0.24 * s, 1.0))
	glow.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

## how strongly a turned face's glyph glows: a kindling as it turns up, then a faint slow pulse
func _gl(rt: float) -> float:
	if rt < 0.0:
		return 0.0
	return 0.13 + 0.06 * sin(t * 1.7 + rt) + 0.7 * exp(-(t - rt) * 2.0)

## a faint occult diagram for an empty place, each its own: the crown a round with its point, the brow an eye, the
## heart a rising triangle, the hands their crescents, the belly a square in a round, the feet a falling triangle
## barred, the place in the Red three waves
func _diagram(ci: CanvasItem, pid: String, c: Vector2, col: Color) -> void:
	var hw := (SH if pid == "under" else SW) / 2.0
	var hh := (SW if pid == "under" else SH) / 2.0
	var q := [Vector2(-hw, -hh), Vector2(hw, -hh), Vector2(hw, hh), Vector2(-hw, hh)]
	for k in 4:
		_pline(ci, c + q[k], c + q[(k + 1) % 4], col, 1.0, 6)
	var m := Color(col, col.a * 1.4)
	match pid:
		"crown":
			_parc(ci, c, 14.0, 0.0, TAU, m)
			_dot(ci, c, m)
		"brow":
			_parc(ci, c + Vector2(0, 16), 24.0, -PI * 0.78, -PI * 0.22, m)
			_parc(ci, c - Vector2(0, 16), 24.0, PI * 0.22, PI * 0.78, m)
			_parc(ci, c, 4.0, 0.0, TAU, m)
		"heart":
			var tri := [c + Vector2(0, -16), c + Vector2(15, 11), c + Vector2(-15, 11)]
			for k in 3:
				_pline(ci, tri[k], tri[(k + 1) % 3], m)
		"lhand":
			_parc(ci, c, 15.0, PI * 0.35, PI * 1.65, m)
			_parc(ci, c - Vector2(6, 0), 11.0, PI * 0.42, PI * 1.58, m)
		"rhand":
			_parc(ci, c, 15.0, -PI * 0.65, PI * 0.65, m)
			_parc(ci, c + Vector2(6, 0), 11.0, -PI * 0.58, PI * 0.58, m)
		"belly":
			_parc(ci, c, 17.0, 0.0, TAU, m)
			var sq := [Vector2(-11, -11), Vector2(11, -11), Vector2(11, 11), Vector2(-11, 11)]
			for k in 4:
				_pline(ci, c + sq[k], c + sq[(k + 1) % 4], m)
		"feet":
			var tr2 := [c + Vector2(-15, -11), c + Vector2(15, -11), c + Vector2(0, 16)]
			for k in 3:
				_pline(ci, tr2[k], tr2[(k + 1) % 3], m)
			_pline(ci, c + Vector2(-9, 1), c + Vector2(9, 1), m)
		"under":
			for row in 3:
				var y := -8.0 + row * 8.0
				for x in range(-22, 24, 2):
					_dot(ci, c + Vector2(x, y + 3.0 * sin(float(x) * 0.28 + t * 0.6)), m)

# ------------------------------------------------------------------ drawing: the cloth

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
			_txt(ci, f, Vector2(at.x, y), ln if left >= ln.length() else ln.substr(0, left), HORIZONTAL_ALIGNMENT_LEFT, width, size, col)
		left -= ln.length() + 1
		y += lh
	return y

## a card drawn whole at its place; gl > 0 also kindles its glyph (the additive pass)
func _card_at(ci: CanvasItem, c: Vector2, texture: Texture2D, ang: float, sx: float, a: float, lift: float = 0.0, sz: Vector2 = Vector2(SW, SH), tint: float = 1.0, shade: bool = true, gl: float = 0.0) -> void:
	ci.draw_set_transform(c + Vector2(0, -lift), ang, Vector2(maxf(sx, 0.02), 1.0))
	if shade:
		ci.draw_rect(Rect2(Vector2(-sz.x / 2.0 + 6, -sz.y / 2.0 + 8 + lift * 0.5), sz), Color(0, 0, 0, 0.5))
	# every card fully opaque (Derek, 2026-10-10: "the cards also appear to be transparent?"): a solid base, the art at
	# full alpha; a card set back (a < 1) is drawn darker instead
	var k := tint * (0.35 + 0.65 * clampf(a, 0.0, 1.0))
	ci.draw_rect(Rect2(-sz / 2.0, sz), Color(0.06, 0.045, 0.04, 1.0))
	ci.draw_texture_rect(texture, Rect2(-sz / 2.0, sz), false, Color(k, k, k, 1.0))
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if gl > 0.0:
		glows.append([c + Vector2(0, -lift), ang, sx, sz, texture, gl * k])

func _alpha() -> float:
	return fade if leaving < 0.0 else fade * (1.0 - clampf(leaving / 1.2, 0.0, 1.0))

## the backdrop: the world dimmed, edge to edge
func _draw_back() -> void:
	root.draw_rect(Rect2(Vector2.ZERO, root.size), Color(0.01, 0.01, 0.015, 0.8 * _alpha()))
	# the words' side of the cloth a shade darker still, so nothing of the cave sits behind a line
	var lw := maxf(0.0, (root.size.x - BASE.x) / 2.0) + 980.0
	for k in 8:
		root.draw_rect(Rect2(0, 0, lw - k * 30.0, root.size.y), Color(0, 0, 0, 0.035 * _alpha()))

## a line of words, over its own shadow
func _txt(ci: CanvasItem, f: Font, at: Vector2, s: String, al: int, w: float, size: int, col: Color) -> void:
	ci.draw_string(f, at + Vector2(2, 2), s, al, w, size, Color(0, 0, 0, 0.92 * col.a))
	ci.draw_string(f, at, s, al, w, size, col)

func _draw_all() -> void:
	var a := 1.0                                     # (the fade is the group's, so cards never show through)
	var ci := stage
	var sc := U.font("sc")
	var fi := body_font
	glows = []
	# where we are: the place, and under it what the place holds
	_txt(ci, sc, Vector2(60, 66), "THE READING", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(MARROW_D, a))
	var p := _place()
	var title := "The Telling" if phase == "end" else String(p.get("name", ""))
	var sub := "" if phase == "end" else String(p.get("what", ""))
	if phase == "end" and _kind(tale_n - 1) in ["calling", "wear", "go"]:
		title = String(S.get("calling_name", {}).get(cls, title))
		sub = "what you have become" if _kind(tale_n - 1) == "calling" else "what waits past the mouth"
	if phase == "rhyme":
		title = "The Count"
		sub = "thread, frame, filling, name"
	elif phase == "open":
		title = "The Crown"
		sub = "what calls you"
	elif phase == "deck":
		title = "The Deck"
		sub = "what draws you"
	_txt(ci, sc, Vector2(60, 112), title, HORIZONTAL_ALIGNMENT_LEFT, -1, 42, Color(MARROW, a))
	if sub != "":
		_txt(ci, ital_font, Vector2(62, 150), sub, HORIZONTAL_ALIGNMENT_LEFT, -1, 29, Color(BONE_D, a))
	# the Red under the body, where the last card lies
	var uc: Vector2 = SLOT["under"]
	for k in 6:
		var rr := 150.0 - k * 18.0
		ci.draw_set_transform(uc, 0.0, Vector2(1.0, 0.45))
		ci.draw_circle(Vector2.ZERO, rr, Color(RED_POOL, (0.14 + k * 0.06) * a))
		ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	# the places not yet laid: each its faint diagram; the one being laid, breathing
	for pl in [{"id": "crown"}] + _places():
		var pid := String(pl["id"])
		if (laid.has(pid) and not (pid == "crown" and phase == "rhyme")) or (not fly.is_empty() and fly["place"] == pid):
			continue
		var on := phase in ["bridge", "draw", "fly", "pick", "flip", "offer"] and pid == String(p.get("id", ""))
		var al := (0.32 + 0.22 * sin(t * 2.4)) if on else 0.13
		_diagram(ci, pid, SLOT[pid], Color(MARROW, al * a))
	# the laid cards: face down until turned, then the face, head down when reversed; the one under lies across
	var in_tale := phase == "end" and (tale_n == 0 or _kind(tale_n - 1) in ["tale", "calling", "wear"])
	for pid in laid:
		if pid == "crown" and phase == "rhyme":
			continue                                 # (the crown comes up when the rhyme is done)
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
		var set_back: bool = in_tale and not told and pid != "crown"
		_card_at(ci, SLOT[pid], shown, ang, sx, a * (0.55 if set_back else 1.0), 0.0, Vector2(SW, SH), 1.0, true,
			(_gl(float(cd.get("rt", -1.0))) * (1.6 if told else 1.0)) if f >= 0.5 else 0.0)
		if f >= 0.999 and (pid != "under" or phase == "end"):
			_label(ci, fi, pid, cd)
	# the card in flight (a chosen one shrinks from the row to the cloth)
	if not fly.is_empty():
		var u: float = fly["t"]
		var e := u * u * (3.0 - 2.0 * u)
		var c3: Vector2 = (fly["from"] as Vector2).lerp(fly["to"], e) + Vector2(0, -60.0 * sin(PI * u))
		var ang2: float = lerpf(0.0, PI / 2.0 if fly["place"] == "under" else 0.0, e) + (PI if fly.get("face", false) and fly["rev"] else 0.0)
		var sz := Vector2(OW, OH).lerp(Vector2(SW, SH), e) if fly.get("big", false) else Vector2(SW, SH)
		_card_at(ci, c3, _face(fly["m"]) if fly.get("face", false) else _tex("_back"), ang2, 1.0, a, 0.0, sz, 1.0, true,
			0.2 if fly.get("face", false) else 0.0)
	# the deck, face down: stacked, then shuffled, then fanned and waiting; a card the mouse passes over ruffles
	if phase != "end":
		if shuf >= SHUF_END:
			var dim := 1.0 if _fan_live() else 0.45
			for i in deck.size():
				var fc: Array = _fan(i, deck.size())
				var rf := _ruf(String(deck[i].get("id", "")))
				_card_at(ci, fc[0], _tex("_back"), float(fc[1]) + rf.x, 1.0, a * dim, rf.y)
		else:
			_draw_shuffle(ci, a)
	# the two passed over, going home to the fan
	for r in back:
		var u2: float = r["t"]
		var e2 := u2 * u2 * (3.0 - 2.0 * u2)
		var home: Vector2 = _fan(deck.size() >> 1, maxi(1, deck.size()))[0]
		_card_at(ci, (r["from"] as Vector2).lerp(home, e2), _face(r["m"]), PI if r.get("rev", false) else 0.0, 1.0, a * (1.0 - u2 * 0.7), 0.0, Vector2(OW, OH).lerp(Vector2(SW, SH), e2))
	# the three drawn for this place: where they will lie, then flying out face down, then turning themselves over
	if phase == "pick" or phase == "flip":
		for k in range(picked.size(), 3):
			var oc0 := _offer_c(k)
			var hw := OW / 2.0
			var hh := OH / 2.0
			var q := [oc0 + Vector2(-hw, -hh), oc0 + Vector2(hw, -hh), oc0 + Vector2(hw, hh), oc0 + Vector2(-hw, hh)]
			for j in 4:
				_pline(ci, q[j], q[(j + 1) % 4], Color(MARROW, 0.24 * a), 1.0, 6)
		for k in picked.size():
			var pk: Dictionary = picked[k]
			var u3: float = pk["t"]
			var e3 := u3 * u3 * (3.0 - 2.0 * u3)
			var c4: Vector2 = (pk["from"] as Vector2).lerp(_offer_c(k), e3) + Vector2(0, -50.0 * sin(PI * u3))
			var fl: float = pk["flip"]
			# a reversed one turns up head down
			var up := PI if pk["rev"] and fl >= 0.5 else 0.0
			_card_at(ci, c4, _tex("_back") if fl < 0.5 else _face(pk["m"]), lerpf(float(pk["ang"]), 0.0, e3) + up, absf(cos(fl * PI)), a, 0.0,
				Vector2(SW, SH).lerp(Vector2(OW, OH), e3), 1.0, true, _gl(float(pk["rt"])) if fl >= 0.5 else 0.0)
			if fl >= 1.0:
				_row_name(ci, fi, k, pk["m"], pk["rev"], false, a)
	# the words
	if phase == "end":
		_draw_end(ci, a, sc, fi)
		return
	# the three, face up, each with its name; the one weighed lifted (on its ruffle) and lit
	if phase == "offer":
		for i in offer.size():
			var rf2 := _ruf(String(offer[i].get("id", "")))
			var oc := _offer_c(i)
			var rv: bool = offer_rev[i] if i < offer_rev.size() else false
			_card_at(ci, oc, _face(offer[i]), (PI if rv else 0.0) + rf2.x, 1.0, a, rf2.y, Vector2(OW, OH), 1.0, true,
				_gl(float(offer_rt[i]) if i < offer_rt.size() else -1.0) * (1.5 if i == hover else 1.0))
			if i == hover:
				ci.draw_set_transform(oc + Vector2(0, -rf2.y), rf2.x, Vector2.ONE)
				ci.draw_rect(Rect2(-Vector2(OW, OH) / 2.0, Vector2(OW, OH)).grow(3), Color(MARROW, 0.8 * a), false, 2.0)
				ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
			_row_name(ci, fi, i, offer[i], rv, i == hover, a)
	# the rhyme: high on the left, a line to a breath, each a step further in
	var words := said if said != "" else prompt
	var budget := _shown()
	if phase == "rhyme":
		for i in rhyme.size():
			var vis := clampi(budget - int(rhyme_at[i]), 0, String(rhyme[i]).length())
			if vis > 0:
				_txt(ci, ital_font, Vector2(86 + i * 40, 246 + i * 58), String(rhyme[i]).substr(0, vis), HORIZONTAL_ALIGNMENT_LEFT, -1, 44,
					Color(BONE.lerp(MARROW, 0.3), a))
		words = said.substr(rhyme_len + 2)
		budget -= rhyme_len + 2
	# his words: under the fan, on the left, clear of the spread; the meaning of a weighed card comes whole
	var mean_c := false
	if phase == "offer" and hover >= 0 and hover < offer.size():
		words = _weigh(hover)
		budget = ALL
		mean_c = true
	if words != "" and budget > 0:
		var wy := _type_draw(ci, words, ital_font if mean_c else fi, FS_WORDS + (2 if mean_c else 0), LH_WORDS, WORDS_AT, WORDS_W, budget,
			Color(MEAN_C if mean_c else BONE, a))
		if mean_c and _shown_fx():
			var rv: bool = offer_rev[hover] if hover < offer_rev.size() else false
			var x := WORDS_AT.x
			for ln in _fx_lines(_fx_of(offer[hover], String(_place().get("id", "")), rv)):
				_txt(ci, stat_font, Vector2(x, wy + 6.0), ln[0], HORIZONTAL_ALIGNMENT_LEFT, -1, 27, GAIN_C if ln[1] else LOSS_C)
				x += stat_font.get_string_size(ln[0], HORIZONTAL_ALIGNMENT_LEFT, -1, 27).x + 36.0
	if _shown_fx():
		_draw_so_far(ci, sc, fi)
	var hint: String = {"rhyme": "click to go on", "open": "click to go on", "deck": "click to go on", "bridge": "click to go on",
		"pick": ["draw three, blind, from the deck", "two more", "one more", ""][mini(picked.size(), 3)],
		"draw": "draw the last card blind from the deck",
		"offer": "choose one", "turn": "click to turn it over", "told": "click to go on"}.get(phase, "")
	if phase == "rhyme" and _typing():
		hint = ""
	if hint != "" and phase in ["pick", "draw", "offer"]:
		hint += "    ·    Esc lets him lay the rest"
	_txt(ci, ital_font, Vector2(0, 1056), hint, HORIZONTAL_ALIGNMENT_CENTER, 1920, 25, Color(ASH, a * (0.6 + 0.2 * sin(t * 2.0))))

## the Reading's effects shown plainly (Settings.reading_effects; Derek, 2026-10-10: "she didnt understand the tarot so
## maybe we should have the stat effects present"); off, it plays blind
func _shown_fx() -> bool:
	if OS.get_environment("GM_READ_FX") != "":
		return OS.get_environment("GM_READ_FX") == "1"       # (tests: GM_READ_FX=0 plays it blind, =1 shows)
	return bool(Settings.get("reading_effects")) if "reading_effects" in Settings else true

## what a card does in this place, this way up, as [text, gives] lines
func _fx_lines(fx: Dictionary) -> Array:
	var out: Array = []
	for k in FX_ORDER:
		if fx.has(k) and not is_zero_approx(float(fx[k])):
			out.append([_fx_line(k, float(fx[k])), float(fx[k]) > 0.0])
	for k in fx:
		if not k in FX_ORDER and not is_zero_approx(float(fx[k])):
			out.append([_fx_line(k, float(fx[k])), float(fx[k]) > 0.0])
	return out

## a laid card's name, beside it (the column) or under it (the hands, the last card), and what it does when shown
func _label(ci: CanvasItem, fi: Font, pid: String, cd: Dictionary) -> void:
	# the column's names beside it, clear of the right hand and the last card; the left hand's under it; the right
	# hand's under it, running right, clear of the column's; the last card's under it
	var side := pid in ["crown", "brow", "heart", "belly", "feet"]
	var w: float = {"feet": 135.0, "belly": 140.0, "heart": 160.0}.get(pid, 185.0) if side else (190.0 if pid == "rhand" else 210.0)   # (clear of the right hand and the card in the Red)
	var x: float = SLOT[pid].x + SW / 2.0 + 10.0 if side else (SLOT[pid].x - SW / 2.0 if pid == "rhand" else SLOT[pid].x - w / 2.0)
	var y: float = SLOT[pid].y - SH / 2.0 + 22.0 if side else SLOT[pid].y + (SW if pid == "under" else SH) / 2.0 + 26.0
	var al := HORIZONTAL_ALIGNMENT_LEFT if side or pid == "rhand" else HORIZONTAL_ALIGNMENT_CENTER
	for ln in _wrap(String(cd.get("name", "")), stat_font, 23, w):
		_txt(ci, stat_font, Vector2(x, y), ln, al, w, 23, MARROW)
		y += 25.0
	if cd["rev"]:
		_txt(ci, ital_font, Vector2(x, y), "reversed", al, w, 21, BONE_D)
		y += 24.0
	if _shown_fx():
		var fx: Dictionary = {}
		for pk in picks:
			if pk["step"] == pid:
				fx = pk["fx"]
		for ln in _fx_lines(fx):
			for part in _wrap(ln[0], stat_font, 20, w):
				_txt(ci, stat_font, Vector2(x, y), part, al, w, 20, GAIN_C if ln[1] else LOSS_C)
				y += 23.0

## what the whole hand has made so far, at the right edge (the end's sum, as it builds)
func _draw_so_far(ci: CanvasItem, sc: Font, fi: Font) -> void:
	var tot := {}
	for pk in picks:
		for k in pk["fx"]:
			tot[k] = float(tot.get(k, 0.0)) + float(pk["fx"][k])
	var caps: Dictionary = R.get("caps", {})
	for k in tot.keys():
		if caps.has(k):
			tot[k] = clampf(tot[k], -float(caps[k]), float(caps[k]))
	var y := 120.0
	_txt(ci, sc, Vector2(1690, y), "SO FAR", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, MARROW)
	y += 32.0
	for ln in _fx_lines(tot):
		for part in _wrap(ln[0], stat_font, 23, 210.0):
			_txt(ci, stat_font, Vector2(1690, y), part, HORIZONTAL_ALIGNMENT_LEFT, 220, 23, GAIN_C if ln[1] else LOSS_C)
			y += 25.0

## a turned card's name under it in the row (and that it lies reversed)
func _row_name(ci: CanvasItem, fi: Font, i: int, m: Dictionary, rev: bool, lit: bool, a: float) -> void:
	var ny := _offer_c(i).y + OH / 2.0 + 32.0
	for ln in _wrap(_name_of(m), stat_font, 25, 228.0):
		_txt(ci, stat_font, Vector2(_offer_c(i).x - 114.0, ny), ln, HORIZONTAL_ALIGNMENT_CENTER, 228, 25, MARROW if lit else MARROW_D.lerp(MARROW, 0.5))
		ny += 27.0
	if rev:
		_txt(ci, ital_font, Vector2(_offer_c(i).x - 114.0, ny), "reversed", HORIZONTAL_ALIGNMENT_CENTER, 228, 22, BONE_D)

## a card's place in the squared stack, j cards up from the cloth (each a little higher: the deck's thickness)
func _lvl(j: int) -> Vector2:
	return Vector2(0.4 * j, -2.0 * j)

## how light a card in a pile is drawn: the lower, the darker (the thickness reads)
func _tone(j: int, m: int) -> float:
	return 0.5 + 0.5 * float(j + 1) / float(maxi(1, m))

## the deck before the spread: the stack, the cut, the riffle (the two halves falling into one, alternately, bottom
## first), the bridge and the squaring, then the fan coming off the stack card by card
func _draw_shuffle(ci: CanvasItem, a: float) -> void:
	var n := deck.size()
	var bk := _tex("_back")
	var h := n >> 1
	var al := a * 0.9
	var card := Vector2(SW, SH)
	var gap := 150.0                                 # how far each half sits from the middle while riffled
	if shuf < SHUF_SPLIT:
		# the stack; then the cut: the top half lifted off to the right, the bottom half slid left
		var u := 0.0 if shuf < 0.0 else smoothstep(0.0, 1.0, shuf / SHUF_SPLIT)
		for k in n:
			var top := k >= h
			var lv := _lvl(k).lerp(_lvl(k - h), u) if top else _lvl(k)
			var c := STACK + lv + Vector2((gap if top else -gap) * u, -40.0 * sin(PI * u) if top else 0.0)
			_card_at(ci, c, bk, (-0.16 if top else 0.16) * u, 1.0, al, 0.0, card,
				_tone(k - h, n - h) if top and u > 0.5 else _tone(k, n), k == 0 or (top and k == h and u > 0.0))
		return
	if shuf < SHUF_RIFFLE:
		# the riffle: the halves bent at the thumbs, letting go into the middle one card at a time, left and right in
		# turn, bottom card first; the pile's edges show the cards' teeth, left, right, left
		var r := (shuf - SHUF_SPLIT) / (SHUF_RIFFLE - SHUF_SPLIT)
		var gone := [0, 0]
		var falling: Array = []
		for j in n:
			var t0 := float(j) / float(n) * 0.88
			if r >= t0:
				var sd := j % 2
				if int(gone[sd]) >= (h if sd == 0 else n - h):
					sd = 1 - sd
				gone[sd] = int(gone[sd]) + 1
				falling.append([j, sd, clampf((r - t0) / 0.12, 0.0, 1.0)])
		for sd in 2:
			var m: int = (h if sd == 0 else n - h) - int(gone[sd])
			var sx := -gap if sd == 0 else gap
			for k in m:
				_card_at(ci, STACK + _lvl(k) + Vector2(sx, -16.0), bk, 0.16 if sd == 0 else -0.16, 1.0, al, 0.0, card, _tone(k, m), k == 0)
		for fl in falling:
			var j: int = fl[0]
			var sd: int = fl[1]
			var e := smoothstep(0.0, 1.0, float(fl[2]))
			var m0: int = (h if sd == 0 else n - h)
			var from := STACK + _lvl(m0 >> 1) + Vector2((-gap + SW * 0.35) if sd == 0 else (gap - SW * 0.35), -16.0)
			var to := STACK + _lvl(j) + Vector2(-14.0 if sd == 0 else 14.0, 0)
			_card_at(ci, from.lerp(to, e) + Vector2(0, -24.0 * sin(PI * e)), bk, lerpf(0.16 if sd == 0 else -0.16, 0.0, e), 1.0, al, 0.0,
				card, _tone(j, n), j == 0)
		return
	if shuf < SHUF_FAN:
		# the bridge (the pile bowed up once) and the squaring (the teeth pushed true)
		var q := clampf((shuf - SHUF_RIFFLE) / (SHUF_SQUARE - SHUF_RIFFLE), 0.0, 1.0)
		var sq := 1.0 - smoothstep(0.0, 1.0, q)
		for j in n:
			var bow := -sin(PI * q) * 18.0 * sin(PI * float(j) / float(maxi(1, n - 1)))
			_card_at(ci, STACK + _lvl(j) + Vector2((-14.0 if j % 2 == 0 else 14.0) * sq, bow), bk, 0.0, 1.0, al, 0.0, card, _tone(j, n), j == 0)
		return
	# the fan, coming off the stack one card after another
	var f := (shuf - SHUF_FAN) / (SHUF_END - SHUF_FAN)
	for i in n:
		var e2 := smoothstep(0.0, 1.0, clampf((f - float(i) / float(n) * 0.4) / 0.6, 0.0, 1.0))
		var fc: Array = _fan(i, n)
		_card_at(ci, (STACK + _lvl(i)).lerp(fc[0], e2), bk, lerpf(0.0, float(fc[1]), e2), 1.0, lerpf(al, a * 0.45, e2), 0.0, card,
			lerpf(_tone(i, n), 1.0, e2), i == 0 or e2 > 0.0)

## the end: the tale a part at a time, then the cards' last words, the hand's sum, and his last words; each waits for
## a click
func _draw_end(ci: CanvasItem, a: float, sc: Font, fi: Font) -> void:
	var y := 200.0                                  # (clear of the title and its line)
	var ck := _kind(tale_n - 1)
	var budget := _shown()
	if ck in ["calling", "wear", "go"]:
		# the calling it has become; then, a page of its own, what the mouth will put on it and his last words
		var pages := ["calling"] if ck == "calling" else ["wear", "go"]
		for i in tale_n:
			if not _kind(i) in pages:
				continue
			var cur := i == tale_n - 1
			var go := _kind(i) == "go"
			y = _type_draw(ci, String(tale[i]["text"]), ital_font if go else fi, FS_WORDS if go else 32, LH_WORDS if go else 39.0,
				Vector2(70, y + (12.0 if go else 0.0)), 690.0, budget if cur else ALL,
				Color(BONE if cur else BONE_D, a * (1.0 if cur else 0.78))) + 14.0
	elif tale_n == 0 or ck == "tale":
		for i in range(maxi(0, tale_n - 4), tale_n):
			var cur := i == tale_n - 1
			y = _type_draw(ci, String(tale[i]["text"]), fi, 34, 41.0, Vector2(70, y), 690.0, budget if cur else ALL,
				Color(BONE if cur else BONE_D, a * (1.0 if cur else 0.78))) + 16.0
	else:
		# the cards' last words, to it
		var intro := String(S.get("tale", {}).get("prophecy", ""))
		var b := budget if ck == "prophecy" else ALL
		var dim := 1.0 if ck == "prophecy" else 0.75
		y = _type_draw(ci, intro, fi, 31, 38.0, Vector2(70, y), 690.0, b, Color(BONE_D, a * dim)) + 10.0
		y = _type_draw(ci, _quote(), ital_font, 40, 47.0, Vector2(70, y), 690.0, b - intro.length() - 1, Color(MARROW, a * dim)) + 18.0
		if ck == "sum":
			# the whole hand, all together (never which card did which)
			y = _type_draw(ci, String(S.get("close_sum", "")), fi, 30, 36.0, Vector2(70, y), 690.0, budget, Color(BONE_D, a)) + 10.0
			var ka := a * sum_a
			var gave: Array = []
			var took: Array = []
			for k in FX_ORDER:
				if fate.has(k):
					(gave if float(fate[k]) > 0.0 else took).append(k)
			_txt(ci, sc, Vector2(70, y), "IT GAVE", HORIZONTAL_ALIGNMENT_LEFT, 400, 17, Color(ASH, ka))
			_txt(ci, sc, Vector2(490, y), "IT TOOK", HORIZONTAL_ALIGNMENT_LEFT, 400, 17, Color(ASH, ka))
			y += 30.0
			for i in gave.size():
				_txt(ci, stat_font, Vector2(70, y + i * 29.0), _fx_line(gave[i], fate[gave[i]]), HORIZONTAL_ALIGNMENT_LEFT, 400, 25, Color(GAIN_C, ka))
			for i in took.size():
				_txt(ci, stat_font, Vector2(490, y + i * 29.0), _fx_line(took[i], fate[took[i]]), HORIZONTAL_ALIGNMENT_LEFT, 400, 25, Color(LOSS_C, ka))
			y += maxi(gave.size(), took.size()) * 29.0
	var last := _at_last()
	if last:
		rise_r = Rect2(70, minf(y + 14.0, 990.0), 220, 64)
		var on2 := hover == 99
		ci.draw_rect(rise_r, Color(0.05, 0.04, 0.05, 0.9 * a))
		ci.draw_rect(rise_r, Color(MARROW if on2 else MARROW_D, a), false, 1.5)
		_txt(ci, sc, rise_r.position + Vector2(0, 44), "Rise", HORIZONTAL_ALIGNMENT_CENTER, rise_r.size.x, 36, Color(BONE if on2 else BONE_D, a))
	var hint := "" if tale_n == 0 else ("click to rise" if last else "click to go on")
	_txt(ci, ital_font, Vector2(0, 1056), hint, HORIZONTAL_ALIGNMENT_CENTER, 1920, 25, Color(ASH, a * (0.6 + 0.2 * sin(t * 2.0))))
