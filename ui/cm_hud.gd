extends Control
## The HUD (Cursemark assets): its own composition, D2's arrangement, every piece Cursemark's (UI.atlas).
##  bottom left: the kneeling knight's frame; its orb fills red with life, draining from the top
##  bottom right: the goddess statue; a pale orb in her halo holds Marrow
##  bottom centre: the dragon's skill frame (left skill, the belt's draught, right skill); a hair of experience under it
##  above the knight: shards as Cursemark's energy pips, poise a slim bone rule under them
##  by the frame: the pack, the map, the notebook (journal); the belt's draughts with their counts
##  overhead: a boss's bar at the top; Cursemark's small health bars over the wounded; its cursor
## Clicks go where the old bar sent them (ui/hud.gd): skills open the picker, menus open panels, draughts drink.

const S := 3.0                    # screen px per UI art px
var hud                           # ui/hud.gd
var hero
var zone
var t := 0.0
var hover := ""

const ICONS := {
	"attack": "icons/talisman_crackedblade", "offering": "icons/talisman_spirit_vessel", "raise": "icons/rune_following",
	"tithe": "icons/talisman_coinpurse", "unearth": "icons/rune_fragments", "colossus": "icons/talisman_knight_fig",
	"horn": "icons/blessing_horn", "reasm": "icons/rune_echos", "legion": "icons/rune_matriarch", "spear": "icons/spell_lancea",
	"siphon": "icons/rune_leech", "ribcage": "icons/rune_iron", "ossify": "icons/rune_glacier", "spikes": "icons/rune_pierce",
	"sstorm": "icons/rune_shatter", "bonerain": "icons/rune_starfall", "spirit": "icons/talisman_ghost_quartz",
	"marrowm": "icons/rune_bloodpore", "barmor": "icons/talisman_buckler", "aura": "icons/rune_spirals",
	"blade": "icons/spell_castigladius", "gcharge": "icons/rune_force", "crush": "icons/spell_sanctomalleus",
	"host": "icons/rune_ootheca", "bscythe": "icons/spell_brumalus", "leap": "icons/rune_dash", "lash": "icons/spell_viperia",
	"tally": "icons/rune_judgement", "opencount": "icons/curse_bleed", "fewer": "icons/curse_blind",
	"weighing": "icons/curse_condem", "countm": "icons/rune_focus", "ninthstair": "icons/rune_ultimate",
}

static var _tex := {}

## our gear in Cursemark's pictures: its weapons for weapons, fitting talismans for the rest (it has no armour art)
const ITEM_ICONS := {
	"wand": "icons/wep_charging_stars", "dagger": "icons/wep_shadow_blade", "staff": "icons/wep_divine",
	"claw": "icons/wep_dragon", "talons": "icons/talisman_savage_claws", "relic": "icons/talisman_spirit_vessel",
	"hood": "icons/talisman_liminal_likeness", "mask": "icons/talisman_glass_eye", "robe": "icons/talisman_bloodied_hide",
	"mail": "icons/talisman_turtle", "gloves": "icons/talisman_finger", "boots": "icons/talisman_hare",
	"belt": "icons/talisman_dark_buckle", "amulet": "icons/talisman_glowstone", "ring": "icons/talisman_darklight_ring",
	"wraps": "icons/talisman_thumbscrew", "iwraps": "icons/talisman_thumbscrew", "spade": "icons/wep_heavy_blade",
	"shakujo": "icons/wep_divine_spear",
}

static func item_tex(it) -> Texture2D:
	if it == null:
		return null
	if str(it.potion) != "":
		return tex("botyl")
	return tex(ITEM_ICONS.get(str(it.base), "icons/talisman_blank"))

func _init(h) -> void:
	hud = h
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	# the mouse is caught only over the frames themselves (_has_point), so the world under the rest still takes clicks
	mouse_filter = Control.MOUSE_FILTER_STOP
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

static func tex(name: String) -> AtlasTexture:
	if _tex.has(name):
		return _tex[name]
	var A: Dictionary = load("res://world/cm_sprites.gd").atlas("UI")
	var at: AtlasTexture = null
	if A.has(name):
		var f: Dictionary = A[name][0]
		at = AtlasTexture.new()
		at.atlas = f["tex"]
		at.region = f["rect"]
		at.set_meta("off", f["off"])
		at.set_meta("orig", f["orig"])
	_tex[name] = at
	return at

## a UI piece with its top-left (of its original canvas) at p, in screen px
func piece(name: String, p: Vector2, sc := S, mod := Color.WHITE) -> void:
	var at := tex(name)
	if at == null:
		return
	var off: Vector2 = at.get_meta("off")
	draw_texture_rect(at, Rect2(p + off * sc, at.region.size * sc), false, mod)

## a piece drawn only up to a fraction of its height, from the bottom (an orb's fill)
func piece_fill(name: String, p: Vector2, frac: float, sc := S, mod := Color.WHITE) -> void:
	var at := tex(name)
	if at == null or frac <= 0.0:
		return
	var off: Vector2 = at.get_meta("off")
	var r := at.region
	var keep := clampf(frac, 0.0, 1.0) * r.size.y
	var src := Rect2(r.position.x, r.position.y + r.size.y - keep, r.size.x, keep)
	draw_texture_rect_region(at.atlas, Rect2(p + (off + Vector2(0, r.size.y - keep)) * sc, Vector2(r.size.x, keep) * sc), src, mod)

## Marrow's orb: Cursemark's orb laid on bone once (its light and shade kept, its red taken away), so it reads pale
static var _marrow_tex: ImageTexture

static func marrow_tex() -> ImageTexture:
	if _marrow_tex != null:
		return _marrow_tex
	var at := tex("hud/health_orb")
	if at == null:
		return null
	var img := at.atlas.get_image().get_region(Rect2i(at.region))
	img.convert(Image.FORMAT_RGBA8)
	var dark := Color(0.36, 0.32, 0.26)
	var mid := Color(0.78, 0.74, 0.64)
	var lite := Color(0.97, 0.95, 0.88)
	for y in img.get_height():
		for x in img.get_width():
			var c := img.get_pixel(x, y)
			if c.a <= 0.0:
				continue
			var l := clampf(c.r * 0.7 + c.g * 0.2 + c.b * 0.1, 0.0, 1.0)
			var b2 := dark.lerp(mid, l / 0.5) if l < 0.5 else mid.lerp(lite, (l - 0.5) / 0.5)
			img.set_pixel(x, y, Color(b2.r, b2.g, b2.b, c.a))
	_marrow_tex = ImageTexture.create_from_image(img)
	return _marrow_tex

func bind(h, z) -> void:
	hero = h
	zone = z

func _process(dt: float) -> void:
	t += dt
	visible = hero != null and is_instance_valid(hero) and zone != null and is_instance_valid(zone) and Sfx.cm
	if visible:
		queue_redraw()

# ------------------------------------------------------------------ layout (1920 x 1080 canvas)
func _vp() -> Vector2:
	return get_viewport_rect().size
func _frame_l() -> Vector2:
	return Vector2(8, _vp().y - 117 * S + 6)
func _frame_r() -> Vector2:
	return Vector2(_vp().x - 122 * S - 8, _vp().y - 81 * S + 4)
func _skills() -> Vector2:
	return Vector2(_vp().x * 0.5 - 63 * S, _vp().y - 81 * S + 2)

func _draw() -> void:
	if hero == null or not is_instance_valid(hero):
		return
	var st = hero.st
	var L := _frame_l()
	# life: the dark behind, the red orb in the well (draining from the top), the knight's frame over it
	piece("hud/player_frame_back", L)
	var lf: float = clampf(st.hp / maxf(1.0, st.life_max()), 0.0, 1.0)
	var orb_p := L + Vector2(64.5 - 22.5, 82.0 - 22.5) * S
	var pulse := 1.0 + (0.12 * pow(maxf(0.0, sin(t * 5.0)), 6.0) if lf < 0.3 and not hero.dead else 0.0)
	piece_fill("hud/health_orb", orb_p, lf, S, Color(pulse, pulse, pulse))
	piece("hud/player_frame", L)
	_num(str(maxi(0, ceili(st.hp))), L + Vector2(64.5, 112) * S, Color(0.95, 0.75, 0.72))
	# shards (the Ossuarch's): Cursemark's energy pips in a row above the knight, five shards a pip
	var book = hero.skills
	if book and book.get("shards") != null:
		var cap := maxi(1, int(book.mantle_cap()))
		var pips := int(ceil(cap / 5.0))
		var full: float = float(book.shards) / 5.0
		for i in pips:
			var pp := L + Vector2(12 + i * 11, 40) * S
			piece("hud/energy_pip_container", pp)
			if float(i) + 1.0 <= full:
				piece("hud/energy_pip", pp)
			elif float(i) < full:
				piece("hud/energy_pip", pp, S, Color(1, 1, 1, 0.4))
	# poise (our own, not Cursemark's curse-meter; Derek: "the resource bar for poise ... doesnt seem right"): a slim bone
	# rule under the pips. It drains as blows land and you are near to being staggered; it flushes red when it breaks.
	var pk: float = clampf(st.poise / maxf(1.0, st.poise_max()), 0.0, 1.0)
	var pr := Rect2(L + Vector2(12, 50) * S, Vector2(56 * S, 2 * S))
	draw_rect(pr.grow(S), Color(0.03, 0.025, 0.03, 0.85))
	var pc := Color(0.86, 0.82, 0.7) if pk > 0.3 else Color(0.82, 0.3, 0.22).lerp(Color(0.86, 0.82, 0.7), pk / 0.3)
	draw_rect(Rect2(pr.position, Vector2(pr.size.x * pk, pr.size.y)), pc)
	draw_rect(Rect2(pr.position, Vector2(pr.size.x * pk, S * 0.67)), Color(1, 1, 0.95, 0.35))
	# Marrow: the pale orb in the goddess's halo
	var R := _frame_r()
	var rf: float = clampf(st.res / maxf(1.0, st.res_max()), 0.0, 1.0)
	var mt := marrow_tex()
	if mt and rf > 0.0:
		var msc := S * 0.49
		var keep := rf * mt.get_height()
		var mp2 := R + Vector2(73 - 11, 13 - 11) * S
		draw_texture_rect_region(mt, Rect2(mp2 + Vector2(0, mt.get_height() - keep) * msc, Vector2(mt.get_width(), keep) * msc),
			Rect2(0, mt.get_height() - keep, mt.get_width(), keep))
	piece("hud/resource_frame", R)
	_num(str(maxi(0, ceili(st.res))), R + Vector2(73, 34) * S, Color(0.92, 0.9, 0.82))
	# the skill frame: left skill, a draught, right skill; experience as a hair under it
	var K := _skills()
	piece("hud/skill_back", K + Vector2(2, 30) * S)
	_skill_icon(hero.skills.left, K + Vector2(19.5, 55.5) * S, 22.0, hover == "skillL")
	_skill_icon(hero.skills.right, K + Vector2(91.5, 51.5) * S, 28.0, hover == "skillR")
	var draught := tex("botyl")
	if draught:
		draw_texture_rect(draught, Rect2(K + Vector2(53.5, 56) * S - Vector2(8, 8) * S, Vector2(16, 16) * S), false)
	piece("hud/skill_frame", K)
	var xk: float = clampf(float(st.xp) / maxf(1.0, st.xp_to_next()), 0.0, 1.0)
	var xr := Rect2(K + Vector2(10, 79) * S, Vector2(106 * S, 4))
	draw_rect(xr, Color(0.05, 0.04, 0.06, 0.8))
	draw_rect(Rect2(xr.position, Vector2(xr.size.x * xk, 4)), Color(0.85, 0.72, 0.42))
	_num("%d" % st.level, K + Vector2(63, 8) * S, Color(0.9, 0.8, 0.55))
	# the belt: four draughts to the right of the skills
	for i in 4:
		var b = st.inv.belt[i]
		var bp := K + Vector2(126 * S + 14 + i * 58, 81 * S - 64)
		draw_rect(Rect2(bp, Vector2(52, 52)), Color(0.04, 0.03, 0.05, 0.7))
		piece("button_up", bp, 3.25)
		if b != null and int(b.get("n", 0)) > 0 and draught:
			draw_texture_rect(draught, Rect2(bp + Vector2(6, 4), Vector2(40, 40)), false, _draught_col(str(b.get("kind", ""))))
			_num(str(int(b["n"])), bp + Vector2(42, 46), Color(0.9, 0.86, 0.78), 16)
		_num(str(i + 1), bp + Vector2(8, 14), Color(0.6, 0.56, 0.5), 14)
	# the pack, the map, the notebook
	var M := L + Vector2(150 * S + 30, 117 * S - 60 * S)
	piece("hud/menu_buttons_frame", M)
	for j in 3:
		var nm: String = ["hud/inventory", "hud/map", "hud/notebook"][j]
		var mp := M + Vector2(-6, 2 + j * 18) * S
		piece(nm, mp, S * 0.55, Color(1.15, 1.15, 1.15) if hover == "menu%d" % j else Color.WHITE)
	# a boss's bar at the top
	if hud and hud.boss != null and is_instance_valid(hud.boss) and not hud.boss.dead:
		var bp2 := Vector2(_vp().x * 0.5 - 160 * S * 0.75, 40)
		var bf: float = clampf(hud.boss.hp / maxf(1.0, hud.boss.hp_max), 0.0, 1.0)
		piece("boss_frame", bp2, S * 0.75)
		var bar := tex("boss_bar")
		if bar:
			var r := bar.region
			draw_texture_rect_region(bar.atlas, Rect2(bp2 + (bar.get_meta("off") as Vector2) * S * 0.75, Vector2(r.size.x * bf, r.size.y) * S * 0.75), Rect2(r.position, Vector2(r.size.x * bf, r.size.y)))
		_num(str(hud.boss.name_shown), bp2 + Vector2(160, -6) * S * 0.75, Color(0.9, 0.84, 0.74), 22)
	_overheads()

func _draught_col(kind: String) -> Color:
	if kind.contains("res") or kind.contains("mana") or kind.contains("marrow"):
		return Color(0.75, 0.8, 1.15)
	return Color.WHITE

func _skill_icon(id: String, c: Vector2, r_px: float, hot: bool) -> void:
	var at := tex(ICONS.get(id, "icons/talisman_blank"))
	if at == null:
		return
	var sz := at.region.size * S * (r_px * 2.0 / maxf(at.region.size.x, at.region.size.y)) / S * 0.95
	draw_texture_rect(at, Rect2(c - sz * 0.5 * S / S, sz), false, Color(1.2, 1.2, 1.2) if hot else Color.WHITE)

func _num(s: String, c: Vector2, col: Color, fs := 20) -> void:
	var font: Font = load("res://ui/uikit.gd").font("sc")
	var w: float = font.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
	draw_string(font, c + Vector2(-w * 0.5 + 2, 2), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(0, 0, 0, 0.8))
	draw_string(font, c + Vector2(-w * 0.5, 0), s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, col)

## Cursemark's small health bar over each wounded creature near
func _overheads() -> void:
	var vp := get_viewport()
	var xf := vp.get_canvas_transform()
	var fr := tex("health_frame")
	var hb := tex("health_bar")
	if fr == null or hb == null:
		return
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.dead or m.buried or m.hp >= m.hp_max - 0.01 or m.boss:
			continue
		var top: float = m.spr.get_rect().position.y * absf(m.spr.scale.y)
		var p: Vector2 = xf * (m.position + Vector2(0, top - 24))
		if p.x < 0 or p.y < 0 or p.x > _vp().x or p.y > _vp().y:
			continue
		var k: float = clampf(m.hp / maxf(1.0, m.hp_max), 0.0, 1.0)
		var tl := p - Vector2(35, 8) * 1.5
		draw_texture_rect(fr, Rect2(tl, fr.region.size * 3.0), false)
		var r := hb.region
		draw_texture_rect_region(hb.atlas, Rect2(tl, Vector2(r.size.x * k, r.size.y) * 3.0), Rect2(r.position, Vector2(r.size.x * k, r.size.y)))

# ------------------------------------------------------------------ clicks
func _has_point(p: Vector2) -> bool:
	return visible and hit_test(p) != ""

func _gui_input(ev: InputEvent) -> void:
	if ev is InputEventMouseMotion:
		hover = hit_test(ev.position)
	elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		if click(hit_test(ev.position)):
			accept_event()

func hit_test(p: Vector2) -> String:
	var K := _skills()
	if p.distance_to(K + Vector2(19.5, 55.5) * S) < 13 * S:
		return "skillL"
	if p.distance_to(K + Vector2(91.5, 51.5) * S) < 16 * S:
		return "skillR"
	for i in 4:
		var bp := K + Vector2(126 * S + 14 + i * 58, 81 * S - 64)
		if Rect2(bp, Vector2(52, 52)).has_point(p):
			return "belt%d" % i
	var M := _frame_l() + Vector2(150 * S + 30, 117 * S - 60 * S)
	for j in 3:
		if Rect2(M + Vector2(-6, 2 + j * 18) * S, Vector2(18, 18) * S).has_point(p):   # where the icons are drawn
			return "menu%d" % j
	var L := _frame_l()
	if Rect2(L, Vector2(150, 117) * S).has_point(p) or Rect2(_frame_r(), Vector2(122, 81) * S).has_point(p) or Rect2(K, Vector2(126, 81) * S).has_point(p):
		return "frame"
	return ""

func click(what: String) -> bool:
	match what:
		"skillL":
			hud.toggle_picker("L")
		"skillR":
			hud.toggle_picker("R")
		"menu0":
			hud.toggle_panel("inv")
		"menu1":
			hud.toggle_panel("map")
		"menu2":
			hud.toggle_panel("journal")
		"frame":
			pass
		_:
			if what.begins_with("belt"):
				hero.drink(int(what.substr(4)))
			else:
				return false
	return true
