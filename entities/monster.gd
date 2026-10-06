class_name Monster
extends Node2D
## A creature of the god, spawned from the zone export. Numbers come from data/monsters.json (the web build's final
## makeMon, sampled per rank and level). Behaviour lives in a Brain (entities/ai/*.gd) chosen by the kind's AI.
## The body keeps the shared state every brain and skill reads: poise and reel, statuses, burrowing, facing.

var zone: Zone
var info: Dictionary
var kd: Dictionary        # the kind's row in monsters.json
var kind := ""
var ai := "husk"
var rank := "normal"
var name_shown := ""
var level := 1
var tp := Vector2.ZERO
var home := Vector2.ZERO
var hp := 10.0
var hp_max := 10.0
var dmg := Vector2(1, 2)
var speed := 1.5
var armor := 0.0
var xp := 1
var radius := 0.3
var resists := {}
var mods: Array = []
var pack := ""
var boss := false
var spr: AnimSprite
var shadow: Polygon2D
var face := 1
var view := "front"
var dead := false
var buried := false        # burrowed or not in its hours: untargetable, takes nothing
var flying := false
var z_lift := 0.0          # height above the ground (flyers), in screen px
var awake := false
var brain: Brain

# poise and reel (checklist section 6)
var poise := 10.0
var poise_max := 10.0
var poise_quiet := 0.0     # time since the last poise damage
var reeling := 0.0
var after_reel := 0.0
var reel_grace := 0.0
var finisher_lock := 0.0

# statuses
var stun := 0.0
var root := 0.0
var slow := 0.0
var feared := 0.0
var confused := 0.0
var _confused_t := 0.0
var _confused_to := Vector2.ZERO
var marked := 0.0
var dots: Array = []       # [{dps, t, elem, tick}]
var hit_flash := 0.0
var corpse_t := 0.0

func setup(z: Zone, m: Dictionary) -> void:
	zone = z
	info = m
	kind = m["kind"]
	ai = m.get("ai", "husk")
	rank = m.get("rank", "normal")
	level = int(m.get("level", 1))
	pack = str(m.get("pack", ""))
	boss = bool(m.get("boss", false)) or rank == "boss"
	mods = m.get("mods", [])
	name_shown = m.get("name", kind)
	tp = Vector2(m["x"], m["y"])
	home = tp
	kd = Data.table("monsters").get("kinds", {}).get(kind, {})
	_numbers()
	Affixes.roll(self)
	var sk := kind
	if rank == "champion" or rank == "unique":
		if ResourceLoader.exists("res://art/sprites/%s@%s.json" % [kind, rank]):
			sk = kind + "@" + rank
	# (Cursemark assets): the creature in Cursemark's body (Derek 2026-10-05: "take assets from this game and put them
	# into godmarrow"), its own kind's brain and numbers kept
	if CM_BODY.has(kind) and FileAccess.file_exists("res://cursemark/raw/data.cdb"):
		sk = "cm:" + str(CM_BODY[kind])
	spr = AnimSprite.new(Data.sprite_set(sk))
	add_child(spr)
	_true_size()
	spr.play("idle")
	spr.t = randf()
	spr.face = 1 if randf() < 0.5 else -1
	face = spr.face
	_shadow()
	position = Iso.to_screen(tp)
	add_to_group("monsters")
	brain = Brain.make(self)

## true size (Derek 2026-10-05: "I want the world true to size"). One yard is about 100 px on screen and a man stands
## about two yards (the heroes, ~200 px). The browser's creature sprites were drawn about a quarter too small (a Husk
## ~1.25 yd, a Warden ~1.5): they are drawn at true size here. Bosses and the PixelForge sets (already true) keep theirs.
const TRUE_SIZE := 1.3
## our kinds in Cursemark's bodies, chosen by what each does and is: the Husk a Forsaken peasant, the Weeper a skeleton
## archer, the Gasp a Bound wraith, the Warden a Crusader justiciar, the Pyre-Saint a fire-handed ritualist, the
## Bellwether a charging chevalier, the Vein-Borer a carrion-eater waking from the ground, the Wick-Saint a corrupted
## carrion-wing, the Duelist a headsman, the Ossuary Matron the Tithe Takers... (the Tithe-Hand keeps its own body)
const CM_BODY := {
	"hollow": "forsaken_plebian", "drowned": "bound_widow", "kneeler": "forsaken_maniac", "a5_sapper": "forsaken_executioner",
	"archer": "forsaken_archer", "ossarcher": "forsaken_archer", "dune_kite": "starspawn_injector",
	"caster": "bound_wraith", "bogwitch": "fungal_priest", "chorister": "cultist_ratcatcher", "chalk_wraith": "bound_wraith",
	"bloat": "fungal_colonizer", "bloatling": "corrupted_crawler",
	"knight": "crusader_justiciar", "calc_knight": "crusader_purifier", "trunk_thing": "blighted_effigy",
	"pyre": "crusader_ritualist", "bell": "forsaken_chevalier", "marrow_ghoul": "starspawn_eviscerator",
	"worm": "blighted_carrioneater", "leech": "corrupted_tentacle", "veinworm_elder": "blighted_root", "chalk_worm": "blighted_root",
	"moth": "corrupted_crow", "moth_saint": "corrupted_crow",
	"marrow": "crusader_headsman", "oath_blade": "cultist_bloodform", "stalker_crone": "bound_phantom",
	"boss": "crusader_osric", "matron": "cultist_tithetaker",
}

var base_scale := Vector2.ONE * Iso.FIG   # the body's drawn size (a swelling or a breath works from it)

## every creature carries the effects shader (shaders/cm_flash.gdshader: the bone crust, the frost glaze, the flash),
## so every death can play on every body, Cursemark's or ours; the lantern lighting in it stays off for ours (no
## normal maps: lamp_k is only set for Cursemark bodies)
var fx_body := false

func _fx_shader() -> void:
	if spr.material == null:
		var fm := ShaderMaterial.new()
		fm.shader = load("res://shaders/cm_flash.gdshader")
		spr.material = fm
	fx_body = true

func _true_size() -> void:
	if spr.set != null and str(spr.set.meta.get("source", "")) != "cursemark":
		_fx_shader()
	if spr.set != null and str(spr.set.meta.get("source", "")) == "cursemark":
		spr.scale = Vector2(4, 4) * Iso.FIG   # a Cursemark pixel is 4 units: its man about our man's height
		base_scale = spr.scale
		cm_body = true
		_fx_shader()
		return
	if boss or spr.set == null:
		return
	if str(spr.set.meta.get("source", "")) == "pixelforge":
		return
	spr.scale = Vector2(TRUE_SIZE, TRUE_SIZE) * Iso.FIG
	base_scale = spr.scale

## the web's ease (data/monsters.json scaling.ease_measured_husk) against ours: the factor to multiply its numbers by
static func ease_k(l: int) -> float:
	var web := 0.5 if l <= 5 else (0.5 + 0.1 * (l - 5) if l <= 10 else minf(1.2, 1.0 + 0.0133 * (l - 10)))
	var ours := 0.5 if l <= 5 else (0.5 + 0.05 * (l - 5) if l <= 10 else (0.75 + 0.025 * (l - 10) if l <= 20 else minf(1.2, 1.0 + 0.02 * (l - 20))))
	return ours / web

func _numbers() -> void:
	var r := rank if rank in ["normal", "champion", "unique", "minion", "boss"] else "normal"
	var row: Dictionary = kd.get("scaled", {}).get(r, {}).get(str(clampi(level, 1, 99)), {})
	if row.is_empty():
		hp_max = float(info.get("hp", 20))
		dmg = Vector2(2, 5)
		speed = 1.5
	else:
		hp_max = float(row.get("life", info.get("hp", 20)))
		var dd: Array = row.get("dmg", [2, 5])
		dmg = Vector2(dd[0], dd[1])
		speed = float(row.get("spd", 1.5))
		armor = float(row.get("armor", 0))
		xp = int(row.get("xp", 1))
	if info.has("hp"):
		hp_max = float(info["hp"])     # the export's own spawned life wins (packs, uniques, bosses)
	# the curve, stretched (2026-10-06; Derek: "slightly easier since it'll have difficulty changes, but gear will
	# change power levels"): the web's ease() doubles a creature between levels 5 and 10, inside Act 1. Here it climbs
	# from 0.5 at 5 to 0.75 at 10, 1.0 at 20 and 1.2 at 30, so the wall comes with the gear and the later difficulties.
	var ek := ease_k(level)
	hp_max = maxf(1.0, roundf(hp_max * ek))
	dmg *= ek * (0.85 if level > 5 else 1.0)   # their blows a little lighter than their life
	hp = hp_max
	radius = float(info.get("r", kd.get("radius", 0.3)))
	var rr = kd.get("resists_at_spawn")
	resists = rr.duplicate() if rr is Dictionary else {}
	for md in mods:
		match md:
			"Extra Fast":
				speed *= 1.4
			"Extra Strong":
				dmg *= 1.5
			"Stone Skin":
				armor += 80.0
	var pk: float = Brain._num(kd.get("poiseK"), 0.5)
	if boss:
		pk *= 1.6
	elif rank == "unique":
		pk *= 1.2
	poise_max = hp_max * pk * 3.0
	poise = poise_max
	flying = ai == "flyer"

func _shadow() -> void:
	shadow = Polygon2D.new()
	var pts := PackedVector2Array()
	var rw := 34.0 * clampf(radius / 0.3, 0.7, 3.5)
	for i in 16:
		var a := i / 16.0 * TAU
		pts.append(Vector2(cos(a) * rw, sin(a) * rw * 0.4 + 6.0))
	shadow.polygon = pts
	shadow.color = Color(0, 0, 0, 0.22)   # the contact shadow under the feet
	add_child(shadow)
	move_child(shadow, 0)
	# the silhouette the hero's lantern (or the sun) throws on the ground (entities/sil_shadow.gd)
	if zone.shadow_layer:
		zone.shadow_layer.add_child(SilShadow.new(spr, self, false))

# ------------------------------------------------------------------ numbers the brain and skills use
func roll_damage() -> float:
	Combat.striker = self   # the blow about to land knows whose it is (the deeds: Thirsting, Nail-Fisted)
	Combat.striker_frame = Engine.get_physics_frames()
	var weak := 0.6 if float(get_meta("k_weak", -1.0)) > Time.get_ticks_msec() / 1000.0 else 1.0   # the Pinch drains it
	return randf_range(dmg.x, dmg.y) * hour_mult() * weak

func hour_mult() -> float:
	if zone == null or not zone.d.get("outdoor", false):
		return 1.0
	var h = kd.get("hours")
	if not (h is Dictionary):
		return 1.0
	var v = h.get(Game.hour_name(), 1.0)
	return float(v) if (v is float or v is int) else 1.0

func walks_now() -> bool:
	var hh = kd.get("hours")
	if not (hh is Dictionary):
		return true
	var when: Array = hh.get("when", [])
	if when.is_empty() or zone == null or not zone.d.get("outdoor", false):
		return true
	return Game.hour_name() in when

func move_speed() -> float:
	var s := speed * (Game.hour_speed() if zone.d.get("outdoor", false) else 1.0)
	if slow > 0.0:
		s *= 1.0 - minf(0.6, slow)
	if after_reel > 0.0:
		s *= 0.55
	return s

func can_act() -> bool:
	return not dead and stun <= 0.0 and reeling <= 0.0

## the raised dead: bone and husk the Ossuary stood back up (the Reading's "damage to the raised dead", the Unraised)
const RAISED := ["hollow", "drowned", "archer", "ossarcher", "marrow", "knight", "hbone", "hhollow", "calc_knight", "marrow_ghoul", "chalk_wraith", "osteo"]
func is_raised() -> bool:
	if kind in RAISED:
		return true
	var n := name_shown.to_lower()
	return n.contains("husk") or n.contains("ossuary") or n.contains("weeper") or n.contains("bone") or n.contains("marrow")

func damage_taken_mult(elem: String, from: Vector2, opts: Dictionary) -> float:
	var k := 1.0
	var h := hero()
	if h and h.st and not opts.get("dot", false) and h.st.fate.has("raised") and is_raised():
		k *= 1.0 + float(h.st.fate["raised"]) / 100.0
	if marked > 0.0:
		k *= 1.3
	if brain:
		k *= brain.damage_taken_mult(self, elem, from, opts)
	return k

# ------------------------------------------------------------------ poise, reel and stagger
func add_poise_damage(pd: float, heavy: bool) -> void:
	if reel_grace > 0.0 or reeling > 0.0:
		return
	poise -= pd * (2.5 if heavy else 1.0)
	poise_quiet = 0.0
	if poise <= 0.0:
		var base := 0.2 if boss else (0.25 if rank == "unique" else 0.35)
		reeling = base * Combat.STAGGER
		Sfx.play("break", 0.8)
		poise = poise_max
		if brain:
			brain.on_reel(self)

func on_hit(d: float, elem: String, from: Vector2, opts: Dictionary) -> void:
	hit_flash = 0.12
	awake = true
	if brain:
		brain.on_hit(self, d, from, opts)
	var dir := Vector2.UP
	if from != Vector2.INF:
		dir = (Iso.to_screen(tp) - Iso.to_screen(from)).normalized()
	if not opts.get("dot", false):
		if cm_body:
			# (Cursemark assets): its hit spark where the blow lands; flesh bleeds, spirits and constructs don't
			var CmFx = load("res://world/cm_fx.gd")
			CmFx.play(zone.sorted, "hit" if d >= hp_max * 0.15 else "hit_small", position + Vector2(randf_range(-10, 10), -90),
				{"rot": dir.angle(), "fps": 24.0, "z": 30, "scale": 0.8})
			var cms := str(CM_BODY.get(kind, ""))
			if not (cms.begins_with("bound") or cms.contains("totem") or cms.contains("tree")):
				Fx.blood(zone.sorted, position + Vector2(0, -40), dir, 2)
		else:
			Fx.blood(zone.sorted, position + Vector2(0, -40), dir, 3)
	if Settings.damage_numbers:
		Fx.number(zone.sorted, position + Vector2(0, -110), d)

func add_dot(dps: float, secs: float, elem: String) -> void:
	dots.append({"dps": dps, "t": secs, "elem": elem, "tick": 0.5})

## bone growth (Derek 2026-10-06: "bone growth like cancer"): every bone blow crusts the body from the side it came from
## (the creature shader's growth); it recedes slowly unless struck again; spurs push out through the silhouette as it
## spreads; killed while overgrown, the body calcifies and breaks apart into bone dust instead of falling
var ossify := 0.0
var _oss_origin := Vector2(0.5, 0.5)
var calc_k := -1.0
var _spurs: Node2D

var frost_k := 0.0
var corrode_k := 0.0
var veins_k := 0.0
var mstain_k := 0.0

func acid_hit(dmg: float) -> void:
	corrode_k = minf(1.0, corrode_k + 0.2 + dmg / maxf(1.0, hp_max))
var rot_k := -1.0
var gut_k := -1.0

func cold_hit(dmg: float) -> void:
	frost_k = minf(1.0, frost_k + 0.25 + dmg / maxf(1.0, hp_max))

func bone_hit(from: Vector2, dmg: float) -> void:
	if dead:
		return
	if ossify <= 0.02:
		var sv: Vector2 = (Iso.to_screen(from) - Iso.to_screen(tp)).normalized() if from != Vector2.INF else Vector2.ZERO
		_oss_origin = Vector2(0.5 + 0.35 * sv.x * float(face), 0.45 + 0.3 * sv.y)
	ossify = minf(1.0, ossify + 0.12 + dmg / maxf(1.0, hp_max) * 0.6)
	if _spurs == null:
		_spurs = Node2D.new()
		_spurs.z_index = 1
		_spurs.draw.connect(_draw_spurs)
		add_child(_spurs)
	_spurs.set_meta("seed", randi() % 997)

func _tick_ossify(dt: float) -> void:
	if not (spr.material is ShaderMaterial):
		return
	var m := spr.material as ShaderMaterial
	if not dead:
		ossify = maxf(0.0, ossify - dt * 0.05)
	m.set_shader_parameter("growth", ossify)
	if not dead:
		frost_k = maxf(0.0, frost_k - dt * 0.08)
	m.set_shader_parameter("frost", frost_k)
	if not dead:
		corrode_k = maxf(0.0, corrode_k - dt * 0.06)
	m.set_shader_parameter("corrode", corrode_k)
	if not dead:
		veins_k = maxf(0.0, veins_k - dt * 0.07)
	m.set_shader_parameter("veins", veins_k)
	if not dead:
		mstain_k = maxf(0.0, mstain_k - dt * 0.03)
	m.set_shader_parameter("mstain", mstain_k)
	if mstain_k > 0.2 and randf() < dt * 6.0 * mstain_k:   # the sickness breathing off the stained part
		var I2 = load("res://world/impacts.gd").of(zone)
		var r2 := spr.get_rect()
		var q2 := position + spr.position + (r2.position + Vector2(randf() * r2.size.x, r2.size.y * (1.0 - randf() * mstain_k))) * spr.scale.abs()
		I2.wsmoke.append({"q": q2, "v": Vector2(randf_range(-5, 5), -randf_range(10, 22)), "t": 0.0, "life": randf_range(1.0, 1.6), "r": randf_range(1.5, 2.4), "ph": randf() * TAU, "col": Color(0.66, 0.54, 0.98)})
		I2._ensure_sky()
	if corrode_k > 0.15 and randf() < dt * 10.0 * corrode_k:
		var I = load("res://world/impacts.gd").of(zone)
		var r := spr.get_rect()
		var q := position + spr.position + (r.position + Vector2(randf() * r.size.x, randf() * r.size.y * 0.7)) * spr.scale.abs()
		I.wsmoke.append({"q": q, "v": Vector2(randf_range(-6, 6), -randf_range(16, 30)), "t": 0.0, "life": randf_range(0.8, 1.4), "r": randf_range(1.5, 2.5), "ph": randf() * TAU, "col": Color(0.55, 0.75, 0.3)})
		I._ensure_sky()
	m.set_shader_parameter("origin", _oss_origin)
	m.set_shader_parameter("oseed", float(get_instance_id() % 97))
	var at := spr.texture as AtlasTexture
	if at and at.atlas:
		var sz := at.atlas.get_size()
		m.set_shader_parameter("region", Vector4(at.region.position.x / sz.x, at.region.position.y / sz.y, at.region.size.x / sz.x, at.region.size.y / sz.y))
	# the ghost-light of the bone (as Diablo II's): a pale cyan breath round the crusted body, over the darkness
	if ossify > 0.08 or calc_k >= 0.0:
		if _ghost_glow == null:
			_ghost_glow = Node2D.new()
			_ghost_glow.draw.connect(_draw_ghost_glow)
			load("res://world/impacts.gd").of(zone)._ghost_layer().add_child(_ghost_glow)
		_ghost_glow.global_position = global_position
		_ghost_glow.queue_redraw()
	elif _ghost_glow:
		_ghost_glow.queue_free()
		_ghost_glow = null
	if _spurs:
		_spurs.visible = ossify > 0.25 and calc_k < 0.4
		_spurs.queue_redraw()

var _ghost_glow: Node2D

func _exit_tree() -> void:
	if _ghost_glow and is_instance_valid(_ghost_glow):
		_ghost_glow.queue_free()

func _draw_ghost_glow() -> void:
	var r := spr.get_rect()
	var sc := spr.scale.abs()
	var box := Rect2(spr.position + r.position * sc, r.size * sc)
	var k: float = ossify if calc_k < 0.0 else 1.0 - calc_k
	var pulse := 0.6 + 0.4 * sin(Time.get_ticks_msec() * 0.004 + float(get_instance_id() % 7))
	var c := box.get_center() - Vector2(0, box.size.y * 0.12)
	var rx := box.size.x * 0.62
	var ry := box.size.y * 0.55
	var n := 0
	for yy in range(int(-ry), int(ry), 4):
		for xx in range(int(-rx), int(rx), 4):
			var e := pow(xx / rx, 2) + pow(yy / ry, 2)
			if e > 1.0:
				continue
			n += 1
			var dens := (1.0 - e) * k * pulse
			# a soft halo: every cell, its light falling off toward the rim in four steps (pixel rings, no screen door)
			var lv := floorf(dens * 4.0) / 4.0
			if lv > 0.0:
				_ghost_glow.draw_rect(Rect2(c + Vector2(xx, yy) - Vector2(2, 2), Vector2(4, 4)), Color(0.42, 0.8, 1.0, 0.08 + 0.26 * lv))
	# soul-motes rising through the halo (Diablo II's bone spells): pale cells drifting up and winking out
	var now := Time.get_ticks_msec() / 1000.0
	var sd := float(get_instance_id() % 97)
	for i in int(4 + k * 8):
		var ph := fmod(now * (0.35 + fmod(i * 0.137, 0.3)) + i * 0.618 + sd, 1.0)
		var mx := (fmod(i * 0.381 + sd * 0.1, 1.0) * 2.0 - 1.0) * rx * 0.8 + sin(now * 2.0 + i) * 4.0
		var my := ry * 0.8 - ph * ry * 1.9
		var q := (c + Vector2(mx, my) - Vector2(2, 2)).snapped(Vector2(4, 4))
		var al := sin(PI * ph) * k
		_ghost_glow.draw_rect(Rect2(q, Vector2(4, 4)), Color(0.85, 0.98, 1.0, 0.85 * al))
		if al > 0.7 and i % 3 == 0:
			for o in [Vector2(-4, 0), Vector2(4, 0), Vector2(0, -4), Vector2(0, 4)]:
				_ghost_glow.draw_rect(Rect2(q + o, Vector2(4, 4)), Color(0.6, 0.9, 1.0, 0.35 * al))

## bone spurs through the outline: pale spikes from the body's edges, longer as the growth spreads
func _draw_spurs() -> void:
	var r := spr.get_rect()
	var sc := spr.scale
	var box := Rect2(spr.position + r.position * sc, r.size * sc)
	var sd: int = int(_spurs.get_meta("seed", 1))
	var n := int(3 + ossify * 7)
	var L := (10.0 + ossify * 30.0)
	for i in n:
		var h1 := fmod(sin(float(sd + i * 31)) * 43758.5453, 1.0)
		var h2 := fmod(sin(float(sd * 3 + i * 17)) * 24634.6345, 1.0)
		h1 = absf(h1); h2 = absf(h2)
		var side := i % 3
		var base := Vector2(box.position.x + box.size.x * (0.15 + 0.7 * h1), box.position.y + box.size.y * (0.2 + 0.55 * h2))
		var dir := Vector2(-1.0 if side == 0 else (1.0 if side == 1 else (h1 - 0.5)), -0.6 - h2 * 0.6).normalized()
		if side == 0:
			base.x = box.position.x + box.size.x * 0.22
		elif side == 1:
			base.x = box.position.x + box.size.x * 0.78
		var ln := L * (0.6 + 0.6 * h2)
		var steps := int(ln / 4.0)
		for k in steps:
			var w := int(ceilf((1.0 - float(k) / steps) * 2.0))
			var p := ((base + dir * k * 4.0) / 4.0).floor() * 4.0
			for ww in range(-w + 1, w):
				var q := p + Vector2(-dir.y, dir.x) * ww * 4.0
				q = (q / 4.0).floor() * 4.0
				var lit := ww <= 0
				_spurs.draw_rect(Rect2(q - Vector2(4, 0), Vector2(12, 4)), Color(0.55, 0.85, 1.0, 0.18))     # ghost-light round it
				_spurs.draw_rect(Rect2(q, Vector2(4, 4)), Color(0.88, 0.94, 0.96) if lit else Color(0.46, 0.52, 0.58))
		_spurs.draw_rect(Rect2(((base + dir * ln) / 4.0).floor() * 4.0, Vector2(4, 4)), Color(1, 0.98, 0.92))

## burning out (shaders/burn.gdshader): a body killed by fire chars, its ember cracks glow and cool, it crumbles to ash
## from the top over a few seconds, smoking and shedding embers; the fire's light dims with it
var last_elem := ""
var burn_k := -1.0
var _burn_light: PointLight2D

func _start_burn() -> void:
	burn_k = 0.0
	spr.set_index(mini(1, spr.frame_count() - 1))
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/burn.gdshader")
	m.set_shader_parameter("seed", randf() * 50.0)
	spr.material = m
	_burn_light = PointLight2D.new()
	_burn_light.color = Color(1.0, 0.5, 0.2)
	_burn_light.set_meta("dark_r", 22.0)
	_burn_light.set_meta("dark_far", 1.5)
	_burn_light.position = Vector2(0, -40)
	_burn_light.enabled = false
	add_child(_burn_light)

func _tick_burn(dt: float) -> void:
	burn_k = minf(1.0, burn_k + dt / 7.0)
	var m := spr.material as ShaderMaterial
	if m:
		m.set_shader_parameter("burn", burn_k)
		m.set_shader_parameter("t", Time.get_ticks_msec() / 1000.0)
		var at := spr.texture as AtlasTexture
		if at and at.atlas:
			var sz := at.atlas.get_size()
			m.set_shader_parameter("region", Vector4(at.region.position.x / sz.x, at.region.position.y / sz.y, at.region.size.x / sz.x, at.region.size.y / sz.y))
	if _burn_light:
		_burn_light.visible = burn_k < 0.9
		_burn_light.set_meta("dark_r", 22.0 * (1.0 - burn_k * 0.7))
	# embers and ash off the body, and the smoke (world/impacts.gd's chips, light and grey)
	if randf() < dt * 14.0 * (1.0 - burn_k * 0.6):
		var I = load("res://world/impacts.gd").of(zone)
		I.ash(tp + Vector2(randf_range(-0.3, 0.3), randf_range(-0.3, 0.3)), burn_k)
	if burn_k >= 1.0:
		corpse_t = minf(corpse_t, 3.0)
		modulate.a = maxf(0.0, modulate.a - dt * 0.6)
		if modulate.a <= 0.0:
			queue_free()

func die(from: Vector2 = Vector2.INF) -> void:
	if dead:
		return
	dead = true
	hp = 0.0
	remove_from_group("monsters")
	add_to_group("corpses")
	var back := from != Vector2.INF and (tp - from).dot(Vector2(1, 1)) < 0.0
	if spr.set and spr.set.has("death_back") and back:
		spr.play("death_back", true, false)
	else:
		spr.play("death", true, false)
	corpse_t = 30.0
	if zone:
		load("res://world/impacts.gd").of(zone).soul(position, "pale")
	if last_elem == "fire":
		_start_burn()
	elif last_elem == "blood":
		gut_k = 0.0                           # tumours swell through it, then it bursts
		spr.set_index(mini(1, spr.frame_count() - 1))
	elif last_elem in ["miasma", "poison"]:
		rot_k = 0.0                           # it swells green, then bursts in a cloud of its own breath
		spr.set_index(mini(1, spr.frame_count() - 1))
	elif last_elem == "cold" or frost_k > 0.6:
		# frozen through: it shatters (shards that keep the ice's colour, a ring of frost where it stood)
		var I = load("res://world/impacts.gd").of(zone)
		for k in 3:
			I.hit(tp + Vector2(randf_range(-0.2, 0.2), randf_range(-0.2, 0.2)), from, true, "ice")
		I.frost(tp, 1.2, 7.0)
		visible = false
		corpse_t = 0.5
	elif ossify > 0.35 and spr.material is ShaderMaterial:
		calc_k = 0.0                          # calcified: it breaks apart instead of falling
		spr.set_index(mini(1, spr.frame_count() - 1))
	var sp = load("res://world/splats.gd").at(zone)   # the ground it bleeds or scatters bone into (za_death21.js)
	if sp:
		sp.death(kind, tp, radius > 0.35)
	if brain:
		brain.on_death(self)
	if not mods.is_empty():
		Affixes.on_death(self)
	Bus.monster_killed.emit(self)
	z_index = -5

# ------------------------------------------------------------------ the frame
## (Cursemark assets): knockback (Cursemark's EnemyReactions: an impulse away from the blow, doubled on the killing
## one), in yards a second, spent quickly
var push := Vector2.ZERO

func knock(from: Vector2, speed_yd: float) -> void:
	var dir := (tp - from).normalized() if tp.distance_to(from) > 0.01 else Vector2.RIGHT
	var mass := 4.0 if boss else (1.6 if rank == "champion" else 1.0)
	push += dir * speed_yd / mass

func _physics_process(dt: float) -> void:
	if push.length_squared() > 0.0004:
		tp = zone.move(tp, push * dt, radius)
		position = Iso.to_screen(tp)
		push = push.move_toward(Vector2.ZERO, (14.0 + push.length() * 6.0) * dt)
	if fx_body:
		_tick_ossify(dt)
	if dead and gut_k >= 0.0:
		# lumps swell under the skin, each on its own throb, faster and harder; the body darkens and reddens; it splits
		gut_k += dt / 1.4
		var th := sin(gut_k * gut_k * 60.0)
		var lump := Vector2(1.0 + 0.22 * gut_k + 0.07 * th * gut_k, 1.0 + 0.12 * gut_k - 0.05 * th * gut_k)
		spr.scale = base_scale * lump
		spr.skew = 0.06 * sin(gut_k * 23.0) * gut_k
		modulate = Color(1, 1, 1).lerp(Color(1.0, 0.55, 0.5), gut_k)
		if gut_k >= 1.0:
			var I = load("res://world/impacts.gd").of(zone)
			I.gut_burst(tp)
			queue_free()
		return
	if dead and rot_k >= 0.0:
		# the breath drawn out (Derek: "their breath is being sucked out of their bodies, and ethereal"): pale violet
		# threads pulled from the mouth; the body arches back, withers, greys and goes thin as glass; at the end an
		# outline of it lifts away and dissolves into the haze
		rot_k += dt / 2.6
		var I = load("res://world/impacts.gd").of(zone)
		var top: float = spr.get_rect().position.y * absf(spr.scale.y)
		var mouth := position + Vector2(0, top * 0.82)
		if rot_k < 0.85 and randf() < dt * 40.0:
			I.breath_out(mouth, rot_k)
		var wither := smoothstep(0.0, 1.0, rot_k)
		spr.scale = base_scale * Vector2(1.0 - 0.18 * wither, 1.0 + 0.04 * sin(rot_k * 9.0) * (1.0 - wither) - 0.08 * wither)
		spr.skew = -0.12 * sin(minf(1.0, rot_k * 2.0) * PI * 0.5) * (1.0 - wither * 0.5)      # thrown back as it is drawn out
		modulate = Color(1, 1, 1).lerp(Color(0.62, 0.6, 0.78), wither)
		modulate.a = 1.0 - smoothstep(0.55, 1.0, rot_k) * 0.85
		if rot_k >= 1.0:
			I.soul(position, "breath")
			I.miasma(tp, 0.9, 5.0, "breath")
			queue_free()
		return
	if dead and calc_k >= 0.0:
		calc_k = minf(1.0, calc_k + dt / 2.2)
		(spr.material as ShaderMaterial).set_shader_parameter("growth", 1.0)
		(spr.material as ShaderMaterial).set_shader_parameter("dead_k", calc_k)
		if randf() < dt * 18.0 * (1.0 - calc_k * 0.5):
			load("res://world/impacts.gd").of(zone).hit(tp + Vector2(randf_range(-0.3, 0.3), randf_range(-0.3, 0.3)), Vector2.INF, false, "bone")
		if calc_k >= 1.0:
			modulate.a = maxf(0.0, modulate.a - dt * 1.5)
			if modulate.a <= 0.0:
				if _ghost_glow:
					_ghost_glow.queue_free()
				queue_free()
		return
	if dead:
		if burn_k < 0.0:
			spr.step(dt)     # a burning body holds its fall (Cursemark's death shrinks it to a remnant; it burns out instead)
		if cm_body and bounce_t < 0.25:
			bounce_t = maxf(0.0, bounce_t) + dt
			var v := clampf(bounce_t / 0.25, 0.0, 1.0)
			spr.position.y = -40.0 * (1.0 - pow(2.0 * v - 1.0, 2.0))
		corpse_t -= dt
		if burn_k >= 0.0:
			_tick_burn(dt)
			return
		# the corpse darkens, browns and sinks as it lies (za_death21.js: brightness 0.62 -> 0.28, saturation down,
		# sepia up, a flattening of 45% from 4 s after death to 10 s before it goes)
		var rot := clampf((26.0 - corpse_t) / 20.0, 0.0, 1.0)
		var br := 0.62 - 0.34 * rot
		modulate = Color(br * (1.0 + 0.12 * rot), br * (1.0 + 0.04 * rot), br * (1.0 - 0.1 * rot), modulate.a)
		spr.scale.y = absf(spr.scale.x) * (1.0 - 0.45 * rot)
		if corpse_t < 0.0:
			modulate.a = maxf(0.0, modulate.a - dt * 0.2)
			if modulate.a <= 0.0:
				queue_free()
		return
	_tick_status(dt)
	if feared > 0.0 and not boss and can_act():
		# feared: it flees from the hero, and does nothing else (checklist 5)
		var h := hero()
		if h:
			step_toward(tp + (tp - h.tp).normalized() * 2.0, dt)
			if spr.set.has("walk"):
				spr.play("walk")
	elif confused > 0.0 and not boss and can_act():
		# confused: it wanders and strikes whatever creature it meets
		_confused_t -= dt
		if _confused_t <= 0.0:
			_confused_t = 0.6
			_confused_to = tp + Vector2(randf_range(-2, 2), randf_range(-2, 2))
			for o in get_tree().get_nodes_in_group("monsters"):
				if o != self and not o.dead and o.tp.distance_to(tp) < 1.4:
					Combat.hit_monster(o, roll_damage(), "phys", tp, {"poise": 0.0})
					break
		step_toward(_confused_to, dt)
	elif brain:
		brain.tick(self, dt)
		if not mods.is_empty():
			Affixes.tick(self, dt)
		if brain.state != _heard_state:
			# (Cursemark assets): a blow drawn back shows Cursemark's aim mark over it, so it can be read and rolled
			if cm_body and str(brain.state) in ["wind", "lwind", "cwind", "swind", "charge"]:
				var CmFx = load("res://world/cm_fx.gd")
				CmFx.play(self, "enemy_aim", Vector2(0, -float(spr.get_rect().size.y) * 4.0 - 30.0), {"fps": 16.0, "z": 40, "scale": 0.8})
			_heard_state = brain.state
			_voice(_heard_state)
	spr.face = face
	spr.view = view
	position = Iso.to_screen(tp) + Vector2(0, -z_lift)
	if shadow:
		shadow.position = Vector2(0, z_lift)
		shadow.visible = not buried
	spr.visible = not buried
	if cm_body:
		_cm_presence(dt)
		_cm_light()
	if hit_flash > 0.0:
		hit_flash -= dt
		if fx_body:
			# a struck body fills with white for a blink, as Cursemark's do (shaders/cm_flash.gdshader)
			if spr.material is ShaderMaterial:
				spr.material.set_shader_parameter("flash", (0.9 if hit_flash > 0.06 else 0.5) if hit_flash > 0.0 and Settings.hit_flash else 0.0)
		else:
			spr.self_modulate = Color(1.35, 1.2, 1.15) if hit_flash > 0.0 and Settings.hit_flash else Color.WHITE

## the body lit by the pilgrim's lantern through its own normal map (shaders/cm_flash.gdshader)
func _cm_light() -> void:
	if not (spr.material is ShaderMaterial):
		return
	var m: ShaderMaterial = spr.material
	var h = zone.hero_ref if zone else null
	var k := 0.0
	var dir := Vector3(0, 0, 1)
	if h != null and is_instance_valid(h) and not h.dead:
		var lamp: Vector2 = h.position + Vector2(-20 * float(h.face), -150)
		var body: Vector2 = position + Vector2(0, -60)
		var dv := lamp - body
		dir = Vector3(dv.x, dv.y, 120.0)
		var reach: float = maxf(2.0, h.light_radius())
		var night := 1.0 - (Game.day_k() if zone.d.get("outdoor", false) else 0.0)
		k = clampf(1.15 - tp.distance_to(h.tp) / reach, 0.0, 1.0) * (0.45 + 0.55 * night)
	m.set_shader_parameter("lamp_dir", dir)
	m.set_shader_parameter("lamp_k", k)
	m.set_shader_parameter("sky_k", 0.25 + 0.45 * (1.0 - Game.day_k()) if zone.d.get("outdoor", false) else 0.2)
	m.set_shader_parameter("face_left", spr.flip_h)

## (Cursemark assets): a body drawn by Cursemark. Most stand on a single frame, so a standing creature breathes (a slow
## swell and settle, each on its own beat); the killing blow throws it up in a short arc before it falls.
var cm_body := false
var _breath := randf() * TAU
var bounce_t := -1.0

func _cm_presence(dt: float) -> void:
	_breath += dt * 2.4
	var still: bool = spr.anim == "idle" and spr.frame_count() <= 1
	var k := 1.0 + (0.03 * sin(_breath) if still else 0.0)
	# a blow's weight in the body (as the pilgrim's, entities/hero.gd _blow_body): drawn back through the wind-up, thrown
	# at what it strikes, a recoil, home. Most of Cursemark's creatures stand on one frame, so this is their swing.
	var off := 0.0
	var sq := 0.0
	var lean := 0.0
	if brain and not dead and stun <= 0.0:
		var bs: String = str(brain.get("state"))
		var bst: float = float(brain.get("st")) if brain.get("st") != null else 0.0
		if bs == "wind":
			var wl: float = maxf(0.05, float(brain.get("wind")))
			var u := clampf(1.0 - bst / wl, 0.0, 1.0)
			off = -10.0 * smoothstep(0.0, 1.0, u)
			sq = 0.05 * u
			lean = -0.09 * u
			if u > 0.85:
				off += sin(Time.get_ticks_msec() * 0.08) * 1.5   # the shiver before it lets go
		elif bs == "strike":
			var u2 := clampf(1.0 - bst / 0.18, 0.0, 1.0)
			off = lerpf(-10.0, 18.0, minf(1.0, u2 * 2.5))
			sq = -0.06
			lean = 0.12
		elif bs == "recover":
			var rl: float = maxf(0.05, float(brain.get("rec")) if brain.get("rec") != null else 0.4)
			var u3 := clampf(1.0 - bst / rl, 0.0, 1.0)
			off = 18.0 * (1.0 - smoothstep(0.0, 1.0, u3))
			sq = -0.06 * (1.0 - u3)
			lean = 0.12 * (1.0 - smoothstep(0.0, 1.0, u3))
	var aim_v: Vector2 = brain.get("aim") if brain and brain.get("aim") is Vector2 else tp + Vector2(float(face), 0)
	var sd := (Iso.to_screen(aim_v) - Iso.to_screen(tp)).normalized()
	if bounce_t < 0.0:
		spr.position = sd * off * Vector2(1.0, 0.5)
	spr.skew = lean * signf(sd.x if absf(sd.x) > 0.2 else float(face))
	k += -sq
	spr.scale = Vector2(4.0 * (1.0 - (k - 1.0) * 0.5) * (1.0 + sq * 0.5), 4.0 * k) * Iso.FIG

func _tick_status(dt: float) -> void:
	stun = maxf(0.0, stun - dt)
	root = maxf(0.0, root - dt)
	feared = maxf(0.0, feared - dt)
	confused = maxf(0.0, confused - dt)
	marked = maxf(0.0, marked - dt)
	reel_grace = maxf(0.0, reel_grace - dt)
	finisher_lock = maxf(0.0, finisher_lock - dt)
	slow = maxf(0.0, slow - 0.8 * dt)
	if reeling > 0.0:
		reeling -= dt
		if reeling <= 0.0:
			after_reel = 0.8
			reel_grace = 0.9 if boss else (1.4 if rank == "unique" else 2.0)
	elif after_reel > 0.0:
		after_reel -= dt
	poise_quiet += dt
	if poise_quiet > 2.2:
		poise = minf(poise_max, poise + poise_max * 0.5 * dt)
	for d in dots:
		d["t"] -= dt
		d["tick"] -= dt
		if d["tick"] <= 0.0:
			d["tick"] += 0.5
			Combat.hit_monster(self, float(d["dps"]) * 0.5, d["elem"], Vector2.INF, {"dot": true, "poise": 0.0})
			if dead:
				return
	dots = dots.filter(func(d): return d["t"] > 0.0)

## move toward a tile point by speed*dt, sliding on walls; flyers ignore terrain
func step_toward(p: Vector2, dt: float, spd: float = -1.0) -> bool:
	if root > 0.0:
		return false
	var s := (move_speed() if spd < 0.0 else spd) * dt
	var to := p - tp
	if to.length() < 0.02:
		return false
	var v := to.normalized() * minf(s, to.length())
	if flying:
		tp += v
	else:
		tp = zone.move(tp, v, radius * 0.6)
	look(v)
	return true

func look(dir: Vector2) -> void:
	# a hand-drawn set (PixelForge, eight views) turns eight ways; the old painted sets have front and back only
	var r := AnimSprite.hero_view(dir, face, spr.set) if spr and spr.set and spr.set.has_view("side") else AnimSprite.mon_view(dir, face)
	if r[0] != "":
		view = r[0]
		face = r[1]

func hero() -> Hero:
	return zone.hero_ref


# ------------------------------------------------------------------ what you hear it do
var _heard_state := ""
## a wind-up creaks and scrapes (the tell you can hear), the blow itself cuts the air; quieter the farther it is
func _voice(s: String) -> void:
	var h = zone.hero_ref if zone else null
	if h == null or not is_instance_valid(h):
		return
	var k := clampf(1.0 - tp.distance_to(h.tp) / 12.0, 0.0, 1.0)
	if k <= 0.05:
		return
	var low := 0.75 if boss else (0.9 if radius > 0.45 else 1.1)
	if s.ends_with("wind"):
		Sfx.play("m_wind", k, low)
	elif s in ["strike", "lunge", "charge", "lash", "dash", "swoop"]:
		Sfx.play("swing", k * 0.9, low * 0.72)
