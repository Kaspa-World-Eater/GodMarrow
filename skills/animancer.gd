extends "res://skills/skill_book.gd"
## The Hollow Mystic (class id "animancer"): Essence, the choir of wisps, the Iron Golem, mirrors and threads.
## Ported from the web build's final behaviour: c_game.js (the WS table, derive), d_play.js (wisps, golem, pillars,
## lance, orb, storm, leash, totem, mark, rebuke, great wisp, hurtPlayer's ward), o_skills14.js (Falling Mirror, Cull,
## Unravelling, synergies, costs), zy_anim.js (Mirror tree, darting wisps, fissure glass), zz_zz_light79.js (wisps are
## fuel; the choir shapes the spell), zz_zz_mystic90.js (one choir: snag, pass on, needle, split; Binding Thread),
## zz_zz_thread93.js (Soul Leash as a burst of threads, Procession, burrowed things ignored), zz_tune_v58.js /
## zz_tune_batch_c.js (costs, regen, mirrors that break), k_arcana.js (kill hooks), zz_movespd_curve.js (Wraith speed).
##
## ------------------------------------------------------------------ API for the UI helper (panels V and G, HUD)
## Choir panel (V):
##   wbeh: {x: 0..4 (close..roam), y: 0..4 (guard..attack), focus: bool ("Attack my target"), hold: bool ("Hold fire")}
##     - write it directly; the choir reads it every frame.
##   chances() -> {thread, pass, needle, split}: the four chances on each wisp strike (0..1), for the rows
##     "Snag a thread", "Pass on", "Needle", "Split" (show "-" when 0).
##   wisps.size() / eff_cap() / wisp_cap() / reserved(): the choir now, the room it has, its full size, and how many
##     are held by the great wisp, the golem's charge and the lantern ("N total · M held by skills").
##   wisp_range(4.6): how far the choir seeks when y >= 2 ("Seek out enemies up to N yd away").
##   choir_k(): the spell multiplier from the choir (0.65 .. 1.20), for a HUD hint if wanted.
## Golem orders panel (G):
##   gbeh: {x: 0..4 (close..roam), y: 0..4 (guard..attack), charge, toss, focus, hold: bool}
##     - when toggling hold call set_golem_hold(on) so the golem remembers where it stands.
##   gweapon: "sword" | "axe" | "flail" (WEAPON_NAMES has the names; ws_weapon(id) -> {mult, dur, reach, ...}).
##   golem: null or the golem (skills/animancer/golem.gd): hp, max_hp, state ("active"/"dormant"/...), rt, rt_max
##     (dormant: time left of its sleep), charge / ws_charge_max(), ramp (rampage time left), infused.
##   golem_orders() -> {leash, aggro, guard}: "Engages foes within N yd", guard: "Only fights what threatens you".
## Allies: the golem's view is in group "allies" (tp, radius, take_hit(dmg, elem, from), is_down()).
##   nearest_target(zone, from) (static) gives the monster AI the nearest of the hero and the standing allies, and
##   honours Dazzling Challenge (monster metas "mys_taunt_until" (Time.get_ticks_msec()/1000 based) and "mys_taunt_by").
## Hooks used elsewhere: phases(elem) (core/combat.gd: Wraith Form lets physical blows through untouched).
## Test args (OS.get_cmdline_user_args()): --learn=all[:L] or --learn=id,id[:L] (hard points, default 10),
##   --ess=N (the Essence attribute, for perks), --autocast[=id,id] (cast learned skills at the nearest creature in
##   turn, holds held for 1.6 s), --mystrace (print the choir and the damage each skill dealt every 5 s).

const GolemL = preload("res://skills/animancer/golem.gd")
const GolemView = preload("res://skills/animancer/golem_view.gd")
const WispView = preload("res://skills/animancer/wisp_view.gd")
const PropView = preload("res://skills/animancer/prop_view.gd")
const FxNode = preload("res://skills/animancer/fx.gd")

const WISP_NERF := 0.65 * 0.65
const OWN := ["swarm", "storm", "condense", "attack"]         # keep their own wisp costs: no fuel burned
const HOLD := ["lance", "condense", "proc", "overcharge"]
const WEAPON_NAMES := {"sword": "Knight Sword", "axe": "Headsman Axe", "flail": "Morning Star"}
## elements (zz_mech_resists.js SKILL_ELEMENT): mirrors and the golem cut, soul-light is magic, the phantom's burst void
const ELEM := {"pillars": "phys", "fissure": "phys", "cage": "phys", "anvil": "phys", "golem": "phys", "toss": "phys",
	"thorns": "phys", "challenge": "phys", "phantom": "magic", "wraith": "void"}
const CHOIR_REBOUND := true   # see _maybe_mirror(): the choir rebounds off mirrors as the Mirror tree promises

class Wisp:
	extends RefCounted
	var tp := Vector2.ZERO
	var z := 14.0
	var v := Vector2.ZERO
	var ang := 0.0
	var rad := 1.0
	var wt := 0.0
	var state := "drift"
	var hits := 0
	var target = null
	var dir := Vector2.RIGHT
	var over := 0.0
	var hit_t := {}
	var cd := 0.5
	var cull_t := 0.0
	var cull_pool: Array = []
	var p_t := 0.0
	var bounces := 0
	var mult := 1.0
	var mirror = null
	var used := {}
	var split_done := false
	var gone := false
	var scale := 1.0
	var alpha := 1.0
	var node = null
	var size := 0            # the great wisp
	var life := 0.0
	var pulse := 0.8
	var beam := {}           # a lantern wisp's line
	var armor_t := 0.0       # The Revenant: armoured in bone, it cannot perish
	var wtt := 0.0

class Mirror:
	extends RefCounted
	var kind := "pane"       # pane | great | lantern
	var tp := Vector2.ZERO
	var r := 0.3
	var rise := 0.22
	var rise_max := 0.22
	var fall := 0.0
	var fall_max := 0.5
	var life := 10.0
	var max_life := 10.0
	var dmg := 0.0
	var fresh := true
	var cracked := false
	var hall := false
	var hp := 40.0
	var gone := false
	var node = null
	var seed := 0
	var wisps: Array = []    # the lantern's
	var pulse := 0.0
	func standing() -> bool:
		if gone:
			return false
		if kind == "pane":
			return rise <= 0.0
		if kind == "great":
			return fall <= 0.0
		return false

# ------------------------------------------------------------------ orders (the V and G panels)
var wbeh := {"x": 2, "y": 2, "focus": false, "hold": false}
var gbeh := {"x": 2, "y": 2, "charge": true, "toss": true, "focus": false, "hold": false}
var gweapon := "sword"

# ------------------------------------------------------------------ the world
var zone: Zone
var time := 0.0
var wisps: Array = []
var wisp_t := 0.0
var great: Wisp = null
var golem = null
var golem_mem := {}
var mirrors: Array = []
var totems: Array = []
var cages: Array = []
var fissures: Array = []
var cracks: Array = []
var spikes: Array = []
var glass: Array = []
var gshots: Array = []
var rings: Array = []
var fires: Array = []
var souls: Array = []
var sparks: Array = []
var needles: Array = []
var snags: Array = []
var binds: Array = []
var threads: Array = []
var darts: Array = []
var dart_lines: Array = []
var orbs: Array = []
var shards: Array = []
var storms: Array = []
var words: Array = []
var whips: Array = []
var phantoms: Array = []
var totem_beams: Array = []
# the Arcana (v103: core/arcana.gd cards; the effects below)
var splinters: Array = []      # The Anvil: glass on the ground [{tp, t}]
var shell := 0.0               # The Anvil reversed: the golem worn as a shell (its iron left)
var maiden_t := 0.0            # The Maiden's Kiss reversed: the hall closed on you
var storm_t := 0.0             # Storm: the mirrors' splinter cadence
var choir_t := 0.0             # The Choir: the whole choir strikes together every 2 s
var bell_n := 0                # The Bell-Warden: spells cast (every fifth rings)
var bell_lock := 0.0           # The Bell-Warden reversed: no spells until this time
var lantern_blow := 0          # The Lantern-Bearer reversed: every other blow frees a wisp
var drains: Array = []         # The Aether-Sage reversed: Soul Swarm as a draining thread [{m, t, tick}]
var pyre_t := 0.0              # Pyre reversed: the wraith's trail
var crown_q: Array = []        # The Choir Crown: wisps coming back (times)
var silence_zone := ""         # The Last Silence: the place it was spent
var proc := {"on": false, "tp": Vector2.ZERO, "t": 0.0}
var wraith := false
var infusing := false
var inf_t := 0.0
var condensing := false
var cond_t := 0.0
var lance_t := 0.0
var an_hold := 0.0
var rebuke_acc := 0.0
var phantom_t := 0.0
var last_hit = null
var cf := -1.0               # the choir as a fraction of full while a spell is cast (-1: not casting)
var pending_tap := ""
var fx_air: Node2D
var fx_floor: Node2D
var _virt := {}
var _mons: Array = []
var _mons_t := -1.0
var _was_dead := false
# testing
var hold_force := ""
var demo_at = null
var auto_ids: Array = []
var auto_on := false
var auto_stand := false        # the balance arena: stand and cast, never walk in to strike
var auto_i := 0
var auto_t := 1.0
var trace := false
var trace_t := 5.0
var dmg_log := {}

# ================================================================== setup
func _load() -> void:
	super._load()
	for id in data:
		for p in data[id].get("perks", []):
			_virt[p["id"]] = [id, p]
	if not Bus.monster_killed.is_connected(_on_kill):
		Bus.monster_killed.connect(_on_kill)
	_args()

func _args() -> void:
	for a in OS.get_cmdline_user_args():
		var kv: PackedStringArray = a.trim_prefix("--").split("=")
		var k: String = kv[0]
		var v: String = kv[1] if kv.size() > 1 else ""
		match k:
			"learn":
				var L := 10
				var spec := v
				if ":" in v:
					spec = v.split(":")[0]
					L = int(v.split(":")[1])
				var ids: Array = data.keys() if spec == "all" or spec == "" else Array(spec.split(","))
				for id in ids:
					if data.has(id):
						hard[id] = clampi(L, 1, 20)
			"ess":
				hero.st.ess = int(v)
				hero.st.res = hero.st.res_max()
			"autocast":
				auto_on = true
				if v != "":
					auto_ids = Array(v.split(","))
			"mystrace":
				trace = true
			"myscheck":
				check_numbers()

## prints this port's numbers next to the web's sampled tooltip numbers (skills.json levels) at L1, L10, L20, for a
## fresh hero (the export's reference: Essence 25, skill multiplier x1.30). Marks rows that differ by over 6%.
func check_numbers() -> void:
	var keep := hard.duplicate()
	var rows := {
		"pillars": func(): return [ws_pillar_n(), ws_pillar_dmg(), ws_pillar_life()],
		"golem": func(): return [ws_golem()["max"], ws_golem()["dmg"][0], ws_golem()["dmg"][1], ws_aura_dps(), ws_golem()["recharge"]],
		"fissure": func(): return [ws_fissure_dmg(), ws_fissure_len(), ws_crack_life(), ws_fissure_keep()],
		"toss": func(): return [ws_toss_dmg(), ws_toss_hover()],
		"challenge": func(): return [ws_challenge_r(), ws_challenge_cd()],
		"cage": func(): return [ws_cage_n(), ws_cage_dmg(), ws_cage_life()],
		"thorns": func(): return [ws_thorns_pct()],
		"overcharge": func(): return [ws_charge_max(), ws_ramp_life(), ws_ramp_mult(), ws_det_dmg() * ws_det_k()],
		"anvil": func(): return [ws_anvil_dmg(), 16 if K("anvilquake") > 0 else 8, ws_anvil_dmg() * (0.4 if K("anvilquake") > 0 else 0.22), 16 if K("anvilstay") > 0 else 8],
		"forge": func(): return [8 * K("forge"), 4 * K("forge")],
		"wisps": func(): return [wisp_cap(), ws_rev_dmg(), ch_thread() * 100.0],
		"restless": func(): return [ws_hits(), ch_pass() * 100.0],
		"beam": func(): return [ch_needle() * 100.0, needle_dmg(), needle_len()],
		"prism": func(): return [ch_split() * 100.0, spark_n(), spark_dmg()],
		"condense": func(): return [1, ws_cond_rate(), ws_cond_max(), ws_cond_dmg(), 35],
		"proc": func(): return [ws_rev_dmg() * 0.6, proc_r(), float(data["proc"]["cost"]["base"])],
		"totem": func(): return [ws_totem_n(), ws_totem_dps(), ws_totem_life()],
		"choir": func(): return [8 * K("choir"), 4 * K("choir")],
		"animam": func(): return [10 * K("animam"), 8 * K("animam")],
		"swarm": func(): return [ws_soul_dmg(), ws_souls_per_wisp() - 1],
		"ward": func(): return [ws_ward_pct() * 100.0, 1, ws_ward_eff()],
		"lance": func(): return [ws_lance_dps() * 0.42, ws_lance_pierce() + 1, ws_lance_range(), -18],
		"wraith": func(): return [ws_wraith_drain(), ws_wraith_spd()],
		"storm": func(): return [ws_storm_life(), ws_storm_rate()],
		"mark": func(): return [ws_mark_pct() * 100.0, ws_mark_r(), ws_mark_life()],
		"orb": func(): return [ws_orb_dmg(), 8],
		"leash": func(): return [ws_leash_dps(), ws_leash_dur(), 2 if K("twin") > 0 else 1],
		"chain": func(): return [maxi(0, ws_chain_n() - 1) + (2 if K("chainfork") > 0 else 0), ws_chain_dmg(), 5.5],
		"nmastery": func(): return [10 * K("nmastery"), 5 * K("nmastery")],
	}
	for id in rows:
		for L in [1, 10, 20]:
			hard.clear()
			hard[id] = L
			var mine: Array = rows[id].call()
			var web: Array = []
			for part in data[id].get("levels", {}).get(str(L), {}).get("values", []):
				web.append_array(part)
			var bad := false
			for i in mini(mine.size(), web.size()):
				var a := float(mine[i])
				var b := float(web[i])
				if absf(a - b) > maxf(0.6, absf(b) * 0.06):
					bad = true
			print("%s L%d %s port %s web %s" % ["  " if not bad else "!!", L, id, str(mine.map(func(x): return snappedf(float(x), 0.01))), str(web)])
	hard = keep

# ================================================================== levels, perks, synergies
## a skill's effective level (P.skills in the web); a perk is a virtual skill at its skill's level once it is on
func K(id: String) -> int:
	if _virt.has(id):
		var vv: Array = _virt[id]
		var p: Dictionary = vv[1]
		var L := lvl(vv[0])
		if L < int(p.get("skill_level", 99)):
			return 0
		var rs = p.get("requires_stat")
		if rs is Dictionary and _stat(rs.get("stat", "")) < float(rs.get("value", 0)):
			return 0
		return L
	if id == "sword" or id == "axe" or id == "flail":
		return lvl("golem")
	if not data.has(id):
		return 0
	return lvl(id)

func _stat(s: String) -> float:
	match s:
		"spi":
			return hero.st.e_ess()
		"vit":
			return hero.st.e_vit()
		"con":
			return hero.st.e_con()
	return 0.0

func L1(id: String) -> float:
	return 1.0 + (maxi(1, K(id)) - 1) * 0.6

## D2 synergies: only hard points; syn = 1 + sum(table_pc x hard[from]) / 200 (o_skills14.js)
func syn_bonus(id: String) -> float:
	var b := 0.0
	for y in data.get(id, {}).get("synergies", []):
		b += float(y.get("table_pc", 0)) * int(hard.get(y.get("from", ""), 0))
	return b / 200.0

func syn(id: String) -> float:
	return 1.0 + syn_bonus(id)

func dm() -> float:
	return hero.st.skill_mult()

## the choir shapes the spell (v81): counts +1 at a full choir, -1 at a thin one; durations and sizes follow it
func _cnt(v: float) -> int:
	if cf < 0.0:
		return int(round(v))
	return maxi(1, int(round(v)) + (1 if cf >= 0.8 else 0) - (1 if cf < 0.2 else 0))

func _life(v: float) -> float:
	return v if cf < 0.0 else v * (0.75 + 0.4 * cf)

func _size(v: float) -> float:
	return v if cf < 0.0 else v * (0.8 + 0.3 * cf)

## costs: the data's base (already x1.6 and x1.2), +5% a level; Word of Power: Thread spells cost 10% less
func cost(id: String) -> float:
	var c: float = super.cost(id)
	if K("wordpower") > 0 and int(data.get(id, {}).get("tab", 0)) == 2:
		c *= 0.9
	return c

# ================================================================== the WS table (c_game.js, o_skills14.js, zz_*)
func ws_iron() -> float: return 1.0 + 0.08 * K("forge")
func ws_choir() -> float: return (1.0 + 0.08 * K("choir")) * WISP_NERF
func ws_anima() -> float: return 1.0 + 0.1 * K("animam")
func ws_nether() -> float: return 1.0 + 0.1 * K("nmastery")
func ws_rev_dmg() -> float: return (3.0 + (L1("wisps") - 1.0)) * dm() * ws_choir() * syn("wisps")
func ws_hits() -> int: return 3 + K("restless") / 3
func ws_fly_spd() -> float: return 7.0 * (1.0 + 0.05 * K("restless"))
func ws_burst_dmg() -> float: return (5.0 + 3.0 * (L1("burst") - 1.0)) * dm() * ws_choir()
func ws_burst_r() -> float: return _size(1.2 + 0.05 * K("burst"))
func ws_leech() -> float: return 0.06 + 0.015 * K("leech") if K("leech") > 0 else 0.0
func ws_bounce_mult() -> float: return 1.25 + (0.1 + 0.03 * K("resonance") if K("resonance") > 0 else 0.0)
func ws_max_bounce() -> int: return 3 + (1 if K("resonance") > 0 else 0) + K("resonance") / 8
func ws_golem() -> Dictionary:
	var l := L1("golem")
	var im := K("ironm")
	var b := syn_bonus("golem")
	var mx := roundf((60.0 + 35.0 * l + hero.st.level * 6.0) * (1.0 + 0.1 * im))
	return {"max": roundf(mx * (1.0 + b * 0.6)), "dmg": [(4.0 + 3.0 * l) * (1.0 + 0.08 * im) * (1.0 + b), (8.0 + 4.0 * l) * (1.0 + 0.08 * im) * (1.0 + b)],
		"armor": 40.0 + 8.0 * l + 6.0 * im, "spd": 4.2, "recharge": maxf(8.0, 22.0 - 0.7 * l)}
func ws_weapon(id: String = "") -> Dictionary:
	if id == "":
		id = gweapon
	var l := float(K(id))
	if id == "axe":
		return {"id": id, "dur": 1.05, "reach": 1.15, "mult": 1.2 + 0.12 * l, "arc": 0.9 + 0.02 * l}
	if id == "flail":
		return {"id": id, "dur": 1.35, "reach": 1.7, "mult": 1.4 + 0.18 * l, "aoe": 1.0 + 0.03 * l, "stun": 0.5 + 0.02 * l}
	return {"id": "sword", "dur": 0.75 / (1.0 + 0.03 * l), "reach": 1.05, "mult": 1.0 + 0.15 * l, "twice": 0.2 + 0.01 * l}
func ws_charge_max() -> float: return float(maxi(2, mini(3 + int(0.5 * K("overcharge")), wisp_cap())))
func ws_flow_rate() -> float: return 3.0 + 0.3 * K("overflow") if K("overflow") > 0 else 0.0
func ws_ramp_life() -> float: return minf(30.0, 10.0 + 0.6 * K("overcharge") + 0.75 * K("jugg"))
func ws_ramp_mult() -> float: return 1.3 + 0.03 * K("overcharge") + 0.05 * K("jugg")
func ws_det_dmg() -> float: return (25.0 + 6.0 * L1("golem") + 12.0 * K("overcharge")) * ws_iron()
func ws_det_r() -> float: return (2.4 + 0.05 * K("overcharge")) * (1.5 if K("overload") > 0 else 1.0)
func ws_det_k() -> float: return 2.0 if K("overload") > 0 else 1.0
func ws_flow_n() -> int: return 8 + K("overflow")
func ws_flow_dmg() -> float: return (6.0 + 3.0 * (L1("overflow") - 1.0)) * dm()
func ws_toss_dmg() -> float: return (0.8 + 0.1 * L1("toss")) * syn("toss")
func ws_toss_hover() -> float: return 0.8 + 0.05 * K("toss")
## the web keys the shield's ricochet on the golem's Bulwark; Mirror Shield's own Ricochet perk counts too (else it did nothing)
func ws_ricochet() -> int: return 1 + maxi(K("bulwark"), K("rico")) / 4 if maxi(K("bulwark"), K("rico")) > 0 else 0
func ws_thorns_pct() -> float: return 60.0 + 25.0 * K("thorns")
func ws_fissure_dmg() -> float: return (16.0 + 8.0 * (L1("fissure") - 1.0)) * dm() * ws_iron() * 1.2 * syn("fissure")
func ws_fissure_len() -> float: return _size(5.0 + 0.2 * K("fissure"))
func ws_fissure_keep() -> int: return 1 + K("fissure") / 6
func ws_crack_life() -> float: return 5.0 + 0.25 * K("fissure")
func ws_aura_dps() -> float: return (8.0 + 3.0 * L1("golem") + 4.0 * K("overcharge")) * ws_iron() * (1.0 + 0.05 * K("jugg"))
func ws_aura_r() -> float: return 2.0 + 0.05 * K("jugg")
func ws_pillar_dmg() -> float: return (14.0 + 7.0 * (L1("pillars") - 1.0)) * dm() * ws_iron() * 1.2 * syn("pillars")
func ws_pillar_n() -> int: return _cnt(3 + K("pillars") / 5)
func ws_pillar_life() -> float: return _life((10.0 + 0.5 * K("pillars")) * (1.0 + 0.04 * K("forge")) * (1.5 if K("temper") > 0 else 1.0))
func ws_cage_n() -> int: return _cnt(7 + K("cage") / 5)
func ws_cage_dmg() -> float: return (10.0 + 5.0 * (L1("cage") - 1.0)) * dm() * ws_iron() * 1.2 * syn("cage")
func ws_cage_life() -> float: return _life(6.0 + 0.3 * K("cage"))
func ws_anvil_dmg() -> float: return (22.0 + 11.0 * (L1("anvil") - 1.0)) * dm() * ws_iron() * 1.2 * syn("anvil")
func ws_magnet_r() -> float: return 2.5 + 0.1 * K("magnet")
func ws_magnet_pull() -> float: return 0.7 + 0.04 * K("magnet")
func ws_challenge_r() -> float: return 3.5 + 0.1 * K("challenge")
func ws_challenge_cd() -> float: return maxf(3.0, 6.0 - 0.15 * K("challenge"))
func ws_harvest() -> float: return 0.04 + 0.02 * K("harvest") if K("harvest") > 0 else 0.0
func ws_cond_rate() -> float: return maxf(0.14, 0.32 - 0.009 * K("condense"))
func ws_cond_max() -> int: return int(round((6 + K("condense") + (3 if aM("w_host") else 0)) * (1.2 if K("greatsoul") > 0 else 1.0)))
func ws_cond_dmg() -> float: return (5.0 + 2.5 * (L1("condense") - 1.0)) * dm() * ws_anima() * syn("condense")
func ws_cond_life() -> float: return _life(5.0 + 0.3 * K("condense"))
func ws_rad_dmg() -> float: return (4.0 + 2.0 * (L1("radiance") - 1.0)) * dm() * ws_anima()
func ws_nova_dmg() -> float: return (15.0 + 8.0 * (L1("nova") - 1.0)) * dm() * ws_anima()
func ws_leash_dps() -> float: return (9.0 + 4.0 * (L1("leash") - 1.0)) * dm() * ws_anima() * (1.3 if K("barbs") > 0 else 1.0) * syn("leash")
## the thread's hold (zz_zz_thread93.js leashDur); Stronger Bindings and the choir's shaping ride on it too
func ws_leash_dur() -> float: return _life((3.0 + 0.1 * K("leash")) * (1.5 if K("bindings") > 0 else 1.0))
func ws_totem_n() -> int: return _cnt(3 + K("totem") / 5)
func ws_totem_life() -> float: return _life(14.0 + 0.8 * K("totem")) * (1.5 if aM("w_vigil") else 1.0)
func ws_totem_dps() -> float: return (8.0 + 4.0 * (L1("totem") - 1.0)) * dm() * ws_anima() * syn("totem")
func ws_soul_dmg() -> float: return (7.0 + 3.5 * (L1("swarm") - 1.0)) * dm() * ws_nether() * (1.0 + 0.05 * K("hunger")) * syn("swarm")
func ws_soul_hits() -> int: return (2 + K("hunger") / 5 if K("hunger") > 0 else 1) + (1 if aM("g_swarm") else 0)
func ws_souls_per_wisp() -> int: return 3 + K("soullegion") / 3
func ws_storm_life() -> float: return (3.0 + 0.2 * K("storm")) * (1.5 if K("eye") > 0 else 1.0)
func ws_storm_rate() -> float: return maxf(0.08, 0.2 - 0.005 * K("storm"))
func ws_lance_dps() -> float: return (26.0 + 10.0 * (L1("lance") - 1.0)) * dm() * ws_nether() * syn("lance")
func ws_lance_range() -> float: return 6.0 + 0.2 * L1("lance")
func ws_lance_pierce() -> int: return 2 + K("lance") / 5
func ws_focus_max() -> float: return 0.4 + 0.08 * K("focus") if K("focus") > 0 else 0.0
func ws_prism_ln() -> int: return 1 + K("prismL") / 5
func ws_prism_lpct() -> float: return 0.4 + 0.03 * K("prismL")
func ws_siphon() -> float: return 0.02 + 0.005 * K("lsiphon") if K("lsiphon") > 0 else 0.0
func ws_orb_dmg() -> float: return (5.0 + 2.5 * (L1("orb") - 1.0)) * dm() * ws_nether() * syn("orb")
func ws_orb_rate() -> float: return maxf(0.035, 0.07 - 0.0015 * K("shards"))
func ws_shard_pierce() -> int: return 2 + K("shards") / 6 if K("shards") > 0 else 1
func ws_cascade_n() -> int: return _cnt(2 + K("cascade") / 8) if K("cascade") > 0 else 0
func ws_cascade_pct() -> float: return 0.45 + 0.025 * K("cascade")
func ws_phantom_dmg() -> float: return (8.0 + 4.0 * (L1("phantom") - 1.0)) * dm() * ws_nether()
func ws_rebuke_dmg() -> float: return (10.0 + 5.0 * (L1("rebuke") - 1.0)) * dm() * ws_nether()
func ws_rebuke_need() -> float: return maxf(10.0, 30.0 - 0.8 * K("rebuke"))
func ws_wraith_drain() -> float: return maxf(2.0, 7.0 - 0.25 * K("wraith"))
func ws_wraith_spd() -> float: return minf(1.35, 1.2 + 0.008 * K("wraith") + (0.1 if K("wraithhaste") > 0 else 0.0))
func ws_mark_r() -> float: return _size((2.2 + 0.08 * K("mark")) * (1.5 if K("markwide") > 0 else 1.0))
func ws_mark_pct() -> float: return 0.2 + 0.02 * K("mark")
func ws_mark_life() -> float: return _life(8.0 + 0.4 * K("mark"))
func ws_word_dmg() -> float: return (30.0 + 14.0 * (L1("word") - 1.0)) * dm() * ws_nether() * syn("word")
func ws_chain_dmg() -> float: return (12.0 + 6.0 * (L1("chain") - 1.0)) * dm() * ws_nether() * syn("chain")
func ws_chain_n() -> int: return _cnt(4 + int(L1("chain") / 4.0))
func ws_ward_pct() -> float: return minf(0.97, (0.05 if aM("g_ward") else 0.0) + minf(0.95, 0.68 + 0.015 * K("ward") + (0.04 if K("wardfast") > 0 else 0.0))) if K("ward") > 0 else 0.0
func ws_ward_eff() -> float: return 1.0 + 0.06 * K("ward")
# the one choir's chances on each wisp strike (zz_zz_mystic90.js CH)
func ch_thread() -> float: return minf(0.20, 0.04 + 0.01 * K("wisps")) if K("wisps") > 0 else 0.0
func ch_pass() -> float: return minf(0.45, 0.10 + 0.03 * K("restless")) if K("restless") > 0 else 0.0
func ch_needle() -> float: return minf(0.40, 0.08 + 0.025 * K("beam")) if K("beam") > 0 else 0.0
func ch_split() -> float: return minf(0.40, 0.08 + 0.025 * K("prism")) if K("prism") > 0 else 0.0
func chances() -> Dictionary: return {"thread": ch_thread(), "pass": ch_pass(), "needle": ch_needle(), "split": ch_split()}
func needle_dmg() -> float: return ws_rev_dmg() * (0.6 + 0.04 * K("beam"))
func needle_len() -> float: return (4.5 if K("sweep") > 0 else 2.6) * (1.3 if aM("w_ember") else 1.0)
func spark_dmg() -> float: return ws_rev_dmg() * (0.5 + 0.04 * K("prism")) * (1.3 if K("prismchain") > 0 else 1.0)
func spark_n() -> int: return (2 if K("prismex") > 0 else 1) + (1 if aM("w_ember") else 0)
func proc_r() -> float: return 1.7 + (0.9 if K("procwide") > 0 else 0.0)
func golem_orders() -> Dictionary:
	return {"leash": 1.8 + gbeh["x"] * 1.7, "aggro": 2.5 + gbeh["y"] * 1.5 + gbeh["x"] * 0.6, "guard": gbeh["y"] <= 1}

# ================================================================== the choir's size
## 4 + Wisps/3 + Bright Choir + items (at most 3) + the Shrine of the Wisp (c_game.js derive)
func wisp_cap() -> int:
	return 4 + K("wisps") / 3 + (1 if K("bright") > 0 else 0) + mini(3, int(hero.st.item("wisp"))) + (2 if hero.st.item("shrine_wisp") > 0.0 else 0)

func ws_wisp_regen() -> float:
	var r := maxf(0.4, 2.6 - 0.1 * K("wisps"))
	r /= 1.0 + (hero.st.item("regen") + hero.st.W("wisp") + (20.0 if aM("w_swift") else 0.0) + 4.0 * K("choir") + (100.0 if hero.st.item("shrine_wisp") > 0.0 else 0.0)) / 100.0
	return r / (1.2 if K("swiftw") > 0 else 1.0)

## wisps held by the great wisp, the golem's charge and the lantern stay out of the choir
func reserved() -> int:
	var n := 0
	if great != null:
		n += great.size
	if golem != null and golem.infused > 0:
		n += golem.infused
	for t in totems:
		n += t.wisps.size()
	return n

func eff_cap() -> int:
	return maxi(0, wisp_cap() - reserved())

## wisps are fuel (v80): his spells strike at x(0.65 + 0.55 x the choir's fullness)
func choir_k() -> float:
	var cap := maxi(1, eff_cap())
	return 0.65 + 0.55 * minf(1.0, float(wisps.size()) / cap)

func wisp_range(base: float) -> float:
	return base + (wbeh["x"] - 2) * 1.1

func set_golem_hold(on: bool) -> void:
	gbeh["hold"] = on
	if golem != null:
		golem.hold = golem.tp if on else null

# ================================================================== small helpers
func mons() -> Array:
	if _mons_t != time:
		# once a frame: the creatures within 26 yd (everything the Mystic does happens nearer than that)
		_mons_t = time
		_mons = []
		var c: Vector2 = hero.tp
		for m in hero.get_tree().get_nodes_in_group("monsters"):
			if absf(m.tp.x - c.x) < 26.0 and absf(m.tp.y - c.y) < 26.0:
				_mons.append(m)
	var out: Array = []
	for m in _mons:
		if is_instance_valid(m) and not m.dead and not m.buried:
			out.append(m)
	return out

func is_idle(m) -> bool:
	return m.brain == null or m.brain.state == "sleep"

## a creature coming for the hero (the web's m.tgt === P)
func threatens(m) -> bool:
	return m.awake and m.brain != null and m.brain.state in ["chase", "wind", "strike", "recover", "gap"] and m.tp.distance_to(hero.tp) < 6.0

func wake(m) -> void:
	m.awake = true
	if m.brain and m.brain.state == "sleep":
		m.brain.wake(m)

func taunt(m, by, secs: float) -> void:
	m.set_meta("mys_taunt_until", Time.get_ticks_msec() / 1000.0 + secs)
	m.set_meta("mys_taunt_by", by)
	wake(m)

func shove(m, v: Vector2) -> void:
	if m.flying:
		m.tp += v
	else:
		m.tp = zone.move(m.tp, v, m.radius * 0.6)

func seg_dist(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var l2 := maxf(ab.length_squared(), 1e-6)
	var t := clampf((p - a).dot(ab) / l2, 0.0, 1.0)
	return p.distance_to(a + ab * t)

func monster_near(p, r: float) -> Variant:
	if not (p is Vector2) or p == Vector2.INF:
		return null
	var best = null
	var bd := r
	for m in mons():
		var d: float = m.tp.distance_to(p)
		if d < bd:
			bd = d
			best = m
	return best

func walkable_near(p: Vector2) -> Vector2:
	if not zone.is_solid(p):
		return p
	var c := Vector2i(int(p.x), int(p.y))
	for r in range(1, 8):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				var q := Vector2(c.x + dx + 0.5, c.y + dy + 0.5)
				if not zone.is_solid(q):
					return q
	return hero.tp

func clamp_cast(a: Vector2, maxd: float) -> Vector2:
	var d := a - hero.tp
	if d.length() > maxd:
		a = hero.tp + d.normalized() * maxd
	return a

## the pale look of a thing breaking: glass that falls and lies a moment
func glass_burst(p: Vector2, n: int, spd: float, z0: float) -> void:
	for i in n:
		var a := randf() * TAU
		var v := spd * randf_range(0.4, 1.2)
		glass.append({"tp": p, "z": z0 * randf_range(0.5, 1.0), "v": Vector2(cos(a), sin(a)) * v, "vz": randf_range(10.0, 40.0), "t": randf_range(0.8, 1.6), "s": 2.0 if randf() < 0.35 else 1.0})
	if glass.size() > 400:
		glass = glass.slice(glass.size() - 400)

func dust(p: Vector2, n: int, spd: float) -> void:
	glass_burst(p, mini(n, 6), spd * 0.5, 4.0)

func ring(p: Vector2, R: float, secs: float, r0: float = 0.3) -> void:
	rings.append({"tp": p, "R": R, "R0": r0, "t": secs, "max": secs})

func ground_fire(p: Vector2, R: float, dps: float, secs: float) -> void:
	if zone.is_solid(p):
		return
	fires.append({"tp": p, "R": R, "dps": dps, "t": secs, "max": secs, "tick": 0.0})
	while fires.size() > 40:
		fires.pop_front()

func new_soul(at: Vector2, ang: float, spd: float, dmg: float, hits: int = -1) -> Dictionary:
	var s := {"tp": at, "v": Vector2(cos(ang), sin(ang)) * spd, "t": 2.2, "target": null, "retarget": randf() * 0.15, "wob": randf() * 6.0,
		"dmg": dmg, "hits": hits if hits > 0 else ws_soul_hits(), "hit": {}}
	souls.append(s)
	return s

func aim_point() -> Vector2:
	if demo_at != null:
		return demo_at
	return hero.mouse_tile()

func say(t: String, secs: float = 1.0) -> void:
	Bus.say.emit(t, secs)

## a hit from the Mystic's side. The choir multiplies everything but his golem's blows (light79); Needle's Mark
## brands for its own share (the body gives x1.3 for any mark: corrected here), the lantern exposes (+15%), Cull marks.
func hurt(m, dmg: float, id: String = "", o: Dictionary = {}) -> float:
	if m == null or not is_instance_valid(m) or m.dead or m.buried or dmg <= 0.0:
		return 0.0
	var d := dmg
	if not o.get("golem", false) and not o.get("nochoir", false):
		d *= choir_k()
	if m.marked > 0.0:
		d *= (1.0 + ws_mark_pct()) / 1.3
	if float(m.get_meta("mys_frail", -1.0)) > time:
		d *= 1.15
	if float(m.get_meta("mys_cull", -1.0)) > time:
		d *= 1.15
	if aM("i_rust"):
		for mo in mirrors:
			if mo.kind == "pane" and mo.standing() and mo.tp.distance_to(m.tp) < 1.3 + m.radius:
				d *= 1.15
				break
	var from: Vector2 = o.get("from", hero.tp)
	var opts := {}
	if o.has("poise"):
		opts["poise"] = o["poise"]
	if o.get("heavy", false):
		opts["heavy"] = true
	var dealt: float = Combat.hit_monster(m, d, ELEM.get(id, "magic"), from, opts)
	if trace:
		dmg_log[id] = float(dmg_log.get(id, 0.0)) + dealt
	if id in ["lance", "orb"] and aR("a_sage"):
		hero.st.hp = minf(hero.st.life_max(), hero.st.hp + dealt * 0.2)
	return dealt

# ================================================================== wisps as fuel
func take_wisp() -> Wisp:
	if wisps.is_empty():
		return null
	var w: Wisp = wisps.pop_back()
	w.gone = true
	glass_burst(w.tp, 2, 1.0, w.z)
	_wisp_lost()
	return w

func spawn_wisp(at = null) -> void:
	if wisps.size() >= eff_cap():
		return
	var w := Wisp.new()
	var a := randf() * TAU
	w.tp = (at if at is Vector2 else hero.tp + Vector2(cos(a), sin(a)) * 0.7)
	w.ang = a
	w.rad = 0.8 + randf() * 0.9
	w.wt = randf() * 10.0
	w.cd = 0.3 + randf()
	wisps.append(w)

## pay for a spell: its Essence, and (v80) a wisp burned as fuel, two for the dearest (cost >= 40). Never refused
## for lack of wisps.
func spend(id: String, amt: float = -1.0) -> bool:
	var need := cost(id) if amt < 0.0 else amt
	if hero.st.res < need:
		say("Not enough %s." % hero.st.res_name(), 1.0)
		return false
	hero.st.res -= need
	dmg_log["_spent"] = float(dmg_log.get("_spent", 0.0)) + need
	if amt < 0.0 and not (id in OWN):
		var n := 2 if cost(id) >= 40.0 else 1
		for i in n:
			take_wisp()
	return true

func end_wraith() -> void:
	if wraith:
		wraith = false
		if aM("g_wraith") and hero:
			for i in 6:
				new_soul(hero.tp, i / 6.0 * TAU, 5.0, ws_soul_dmg())
		if hero and hero.spr:
			hero.spr.modulate = Color.WHITE

# ================================================================== casting
func held(id: String) -> bool:
	if hold_force == id or pending_tap == id:
		return true
	if hero == null or hero.dead:
		return false
	if hero.skills.right == id and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		return true
	if hero.skills.left == id and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		return true
	return false

## the Mystic's own use(): costs are paid inside each cast (as the web's spendMana), held skills run in tick()
func use(id: String, at: Vector2, target: Monster) -> bool:
	if id == "attack" or id == "":
		return false
	if lvl(id) <= 0 or is_passive(id):
		return false
	if id in HOLD:
		if id == "overcharge" and golem == null:
			say("Summon your golem first.", 1.0)
			return false
		pending_tap = id
		return false
	if hero.act != "" and hero.act != "swing" and hero.act != "cast":
		return false
	if aR("a_bell") and time < bell_lock:
		return false
	cf = -1.0 if id in OWN else minf(1.0, float(wisps.size()) / maxi(1, eff_cap()))
	var ok := false
	ok = _cast(id, at, target)
	cf = -1.0
	if ok:
		if id != "wraith":
			end_wraith()
		# The Bell-Warden: every fifth spell rings; reversed, the bell silences you a breath
		if aU("a_bell"):
			bell_n += 1
			if bell_n % 5 == 0:
				ring(hero.tp, 3.5, 0.5, 0.4)
				for m in mons():
					if m.tp.distance_to(hero.tp) < 3.5 + m.radius and not m.boss:
						m.stun = maxf(m.stun, 0.5)
		if aR("a_bell"):
			bell_lock = time + 1.0
		hero.stats_changed.emit()
	return ok

func _cast(id: String, at: Vector2, target: Monster) -> bool:
	if target != null and is_instance_valid(target):
		at = target.tp
	at = _los_point(at)
	match id:
		"pillars": return _cast_pillars(at)
		"golem": return _cast_golem(at)
		"fissure": return _cast_fissure(at)
		"cage": return _cast_cage(at)
		"anvil": return _cast_anvil(at)
		"cull": return _cast_cull(at)
		"swarm": return _cast_swarm(at)
		"wraith": return _toggle_wraith()
		"storm": return _cast_storm(at)
		"mark": return _cast_mark(at)
		"orb": return _cast_orb(at)
		"leash": return _cast_leash(at)
		"word": return _cast_word(at)
		"chain": return _cast_chain(at)
		"totem": return _cast_totem(at)
	return false

## skills need sight: a point behind a wall is pulled back to it (d_play.js losPoint)
func _los_point(a: Vector2) -> Vector2:
	var d := a.distance_to(hero.tp)
	if d < 0.3:
		return a
	var n := int(ceil(d / 0.2))
	var last := hero.tp
	for i in range(1, n + 1):
		var p := hero.tp.lerp(a, float(i) / n)
		if zone.blocks_sight(p):
			return last
		last = p
	return a

# ------------------------------------------------------------------ Mirror tree
func _raise_pane(p: Vector2, life: float, dmg: float, hall: bool = false, cracked: bool = false) -> bool:
	if zone.is_solid(p) or p.distance_to(hero.tp) < hero.radius + 0.3:
		return false
	var o := Mirror.new()
	o.kind = "pane"
	o.tp = p
	o.life = life
	o.max_life = life
	o.dmg = dmg
	o.hall = hall
	o.cracked = cracked
	o.hp = 40.0 + 5.0 * (maxi(1, K("pillars")) - 1)
	o.seed = randi()
	mirrors.append(o)
	var panes := mirrors.filter(func(x): return x.kind == "pane" and not x.gone)
	while panes.size() > 18:
		panes[0].gone = true
		panes.pop_front()
	mirrors = mirrors.filter(func(x): return not x.gone)
	return true

func _cast_pillars(a: Vector2) -> bool:
	if not spend("pillars"):
		return false
	var t := clamp_cast(a, 8.0)
	var d := maxf(0.001, t.distance_to(hero.tp))
	var perp := Vector2(-(t.y - hero.tp.y) / d, (t.x - hero.tp.x) / d)
	var n := ws_pillar_n()
	var life := ws_pillar_life()
	var dmg := ws_pillar_dmg()
	for i in n:
		var off := (i - (n - 1) / 2.0) * 0.8
		_raise_pane(t + perp * off, life, dmg)
	return true

func _cast_cage(a: Vector2) -> bool:
	if not spend("cage"):
		return false
	if aR("a_maiden"):
		a = hero.tp   # the hall closes on you
		maiden_t = ws_cage_life()
	elif aU("a_maiden"):
		for m in mons():
			var dm2: float = m.tp.distance_to(a)
			if dm2 < 3.0 + 1.8 and dm2 > 1.2 and not m.boss:
				shove(m, (a - m.tp) / dm2 * (dm2 - 1.0))
	var n := ws_cage_n()
	var life := ws_cage_life()
	var dmg := ws_cage_dmg()
	for i in n:
		var ang := float(i) / n * TAU
		_raise_pane(a + Vector2(cos(ang), sin(ang)) * 1.8, life, dmg, true)
	cages.append({"tp": a, "t": life, "tick": 1.0})
	return true

func _cast_fissure(a: Vector2) -> bool:
	if not spend("fissure"):
		return false
	var d := (a - hero.tp).normalized() if a.distance_to(hero.tp) > 0.01 else Vector2(1, 1).normalized()
	var L := ws_fissure_len()
	fissures.append({"tp": hero.tp, "d": d, "i": 0, "n": int(round(L / 0.6)), "t": 0.0, "keep": ws_fissure_keep() + (1 if aM("i_spikes") else 0), "hit": {}})
	return true

func _cast_anvil(a: Vector2) -> bool:
	if not spend("anvil"):
		return false
	var p := clamp_cast(a, 9.0)
	_drop_anvil(p, 1.0, 0.0)
	if K("anvilrain") > 0:
		for i in 2:
			var ang := randf() * TAU
			_drop_anvil(clamp_cast(p + Vector2(cos(ang), sin(ang)) * 1.7, 11.0), 0.7, 0.2 + i * 0.2)
	return true

func _drop_anvil(p: Vector2, k: float, delay: float) -> void:
	if zone.is_solid(p):
		return
	var o := Mirror.new()
	o.kind = "great"
	o.tp = p
	o.r = 0.42
	o.fall = 0.5 + delay
	o.fall_max = 0.5
	o.life = 16.0 if K("anvilstay") > 0 else 8.0
	o.max_life = o.life
	o.dmg = ws_anvil_dmg() * k
	o.hp = 1e9
	o.seed = randi()
	mirrors.append(o)
	var gr := mirrors.filter(func(x): return x.kind == "great" and not x.gone)
	while gr.size() > 8:
		gr[0].gone = true
		gr.pop_front()

func _cast_golem(a: Vector2) -> bool:
	if aR("a_anvil"):
		# The Anvil reversed: the golem is worn, not called
		if shell > 0.0:
			say("You already wear the iron.", 1.0)
			return false
		if not spend("golem"):
			return false
		if golem != null:
			golem.node = null
			golem = null
		shell = float(ws_golem()["max"])
		dust(hero.tp, 14, 2.0)
		say("The iron closes round you.", 1.4)
		return true
	if golem != null:
		if golem.tp.distance_to(a) < 1.3:
			# banish: the same golem comes back when called again, its wounds and its sleep kept
			golem_mem = {"frac": golem.hp / maxf(1.0, golem.max_hp), "dormant": golem.state == "dormant", "rt": golem.rt,
				"rt_max": golem.rt_max, "down_t": golem.down_t, "boost": golem.boost, "at": time}
			golem.node = null
			golem = null
			infusing = false
			say("The golem is sent away.", 1.6)
			return true
		return _command_golem(a)
	if not spend("golem"):
		return false
	var t := clamp_cast(a, 6.0)
	var p := walkable_near(Vector2(floor(t.x) + 0.5, floor(t.y) + 0.5))
	golem = GolemL.new(self, p)
	if not golem_mem.is_empty():
		var M := golem_mem
		golem_mem = {}
		var el: float = time - M["at"]
		golem.hp = maxf(1.0, minf(golem.max_hp, golem.max_hp * (M["frac"] + 0.01 * el)))
		if M["dormant"]:
			var left: float = maxf(0.0, M["rt"] - el)
			var dl: float = M["down_t"] + el
			if left > 0.0 or dl < GolemL.MIN_DOWN:
				golem.go_down(maxf(left, 0.1), "Your golem is still dormant.")
				golem.rt_max = M["rt_max"]
				golem.down_t = dl
				golem.boost = M["boost"]
				golem.hp = 0.0
	if gbeh["hold"]:
		golem.hold = golem.tp
	dust(golem.tp, 12, 2.0)
	return true

func _command_golem(a: Vector2) -> bool:
	if golem.state == "dormant":
		say("Your golem is dormant.", 1.0)
		return false
	var p := walkable_near(Vector2(floor(a.x) + 0.5, floor(a.y) + 0.5))
	golem.order = {"tp": p, "t": 7.0}
	golem.atk = {}
	golem.path = PackedVector2Array()
	if golem.state == "charge" or golem.state == "chargeWind":
		golem.state = "active"
	if gbeh["hold"]:
		golem.hold = p
	ring(p, 0.25, 0.5, 0.9)
	return true

# ------------------------------------------------------------------ Soul tree
func _cast_cull(a: Vector2) -> bool:
	var foes: Array = mons().filter(func(m): return m.tp.distance_to(a) < 3.5 and m.tp.distance_to(hero.tp) < 11.0 and zone.sight_clear(hero.tp, m.tp))
	if foes.is_empty():
		say("Nothing near to cull.", 1.0)
		return false
	var revs: Array = wisps.filter(func(w): return w.state == "drift")
	if revs.is_empty():
		say("No wisp drifts free.", 1.0)
		return false
	if not spend("cull"):
		return false
	revs = revs.filter(func(w): return not w.gone)
	var i := 0
	for w in revs:
		w.state = "dive"
		w.target = foes[i % foes.size()]
		w.cull_t = 2.4 if K("cullreturn") > 0 else 1.4
		w.cull_pool = foes
		w.hit_t = {}
		i += 1
	return true

func _infuse_one() -> void:
	var g = golem
	if g == null:
		infusing = false
		return
	if hero.tp.distance_to(g.tp) > 8.0:
		say("Too far from your golem.", 1.0)
		return
	if g.ramp > 0.0:
		say("Your golem already burns.", 0.8)
		return
	if wisps.is_empty():
		say("No wisps to give.", 0.8)
		return
	take_wisp()
	if g.state == "dormant":
		g.boost = minf(1.0 + minf(0.5, 0.025 * K("overcharge")), g.boost + 0.12 + 0.004 * K("wisps"))
	else:
		g.infused += 1
		if g.hp < g.max_hp - 0.5:
			g.hp = minf(g.max_hp, g.hp + g.max_hp * 0.07 + 4.0 * K("wisps"))
		g.add_charge(1.0)

func _condense_one() -> void:
	if wisps.is_empty():
		return
	if great == null:
		great = Wisp.new()
		great.tp = hero.tp
		great.z = 26.0
		great.state = "form"
		great.pulse = 0.8
	if great.state == "hunt":
		great.state = "form"
	if great.size >= ws_cond_max():
		say("The great wisp can hold no more.", 0.8)
		return
	if not spend("condense"):
		return
	take_wisp()
	great.size += 1

# ------------------------------------------------------------------ Thread tree
func _cast_swarm(a: Vector2) -> bool:
	if aR("a_sage"):
		# The Aether-Sage reversed: a thread that drains its creature into you for 3 s
		var t = null
		var bd := 3.0
		for m in mons():
			var dd: float = m.tp.distance_to(a)
			if dd < bd and m.tp.distance_to(hero.tp) < 7.0 and zone.sight_clear(hero.tp, m.tp):
				bd = dd
				t = m
		if t == null:
			say("Nothing near to drink from.", 1.0)
			return false
		if not spend("swarm"):
			return false
		drains.append({"m": t, "t": 3.0, "tick": 0.0})
		return true
	if wisps.is_empty():
		say("Your wisps are spent.", 1.0)
		return false
	if not spend("swarm"):
		return false
	hero.spend_poise(4.0)
	var n := mini(3, wisps.size())
	for i in n:
		take_wisp()
	var count := 1 + n * (ws_souls_per_wisp() - 1) + wisps.size() / 2
	var base := atan2(a.y - hero.tp.y, a.x - hero.tp.x)
	var dmg := ws_soul_dmg()
	for i in count:
		new_soul(hero.tp, base + (randf() - 0.5) * 1.6, 6.0, dmg)
	return true

func _toggle_wraith() -> bool:
	if wraith:
		end_wraith()
		return true
	if not spend("wraith"):
		return false
	wraith = true
	infusing = false
	return true

func _cast_storm(a: Vector2) -> bool:
	if wisps.size() < 2:
		say("The storm needs two wisps.", 1.0)
		return false
	if not spend("storm"):
		return false
	take_wisp()
	take_wisp()
	storms.append({"tp": a, "life": ws_storm_life(), "st": 0.0, "spin": 0.0})
	return true

func _cast_mark(a: Vector2) -> bool:
	if not spend("mark"):
		return false
	var R := ws_mark_r()
	var life := ws_mark_life() * (2.0 if aM("g_mark") else 1.0)
	var n := 0
	for m in mons():
		if m.tp.distance_to(a) < R + m.radius:
			m.marked = life
			m.set_meta("mys_mark", true)
			wake(m)
			n += 1
	ring(a, 0.3, 0.6, R)
	return true

func _cast_orb(a: Vector2) -> bool:
	if not spend("orb"):
		return false
	var d := (a - hero.tp).normalized() if a.distance_to(hero.tp) > 0.01 else Vector2(1, 1).normalized()
	var heavy := aM("g_orb")
	orbs.append({"tp": hero.tp, "v": d * (3.0 if heavy else 4.0), "life": 3.0 if heavy else 2.0, "ang": randf() * 6.0, "st": 0.0, "pow": 1.0, "gen": 0})
	return true

func _cast_leash(_a: Vector2) -> bool:
	if aR("a_rebuke"):
		# The Rebuke reversed: a harpoon that strikes hard and pins
		var tgt = null
		var bd := 9.0
		for m in mons():
			var dd: float = m.tp.distance_to(_a)
			if dd < 2.5 and m.tp.distance_to(hero.tp) < 8.0 and zone.sight_clear(hero.tp, m.tp) and dd < bd:
				bd = dd
				tgt = m
		if tgt == null:
			say("Nothing near to strike.", 1.0)
			return false
		if not spend("leash"):
			return false
		hurt(tgt, ws_leash_dps() * 1.6, "leash", {"heavy": true})
		if not tgt.dead:
			tgt.root = maxf(tgt.root, 2.0)
		dart_lines.append({"a": hero.tp, "za": 12.0, "b": tgt.tp, "zb": 9.0, "t": 0.4})
		hero._face(tgt.tp - hero.tp)
		return true
	var near: Array = mons().filter(func(m): return m.tp.distance_to(hero.tp) < 7.0 and zone.sight_clear(hero.tp, m.tp))
	if near.is_empty():
		say("Nothing near enough to bind.", 1.0)
		return false
	if not spend("leash"):
		return false
	var per := 2 if K("twin") > 0 else 1
	var used := {}
	var dur := ws_leash_dur()
	var srcs: Array = wisps.duplicate()
	var pick := func(src: Vector2):
		var best = null
		var bd := 1e9
		for m in near:
			var dd: float = m.tp.distance_to(src)
			if dd > 5.0:
				continue
			var sc: float = dd + int(used.get(m.get_instance_id(), 0)) * 3.0
			if sc < bd:
				bd = sc
				best = m
		if best != null:
			used[best.get_instance_id()] = int(used.get(best.get_instance_id(), 0)) + 1
		return best
	if not srcs.is_empty():
		for w in srcs:
			for i in per:
				var m = pick.call(w.tp)
				if m != null:
					threads.append({"src": w, "m": m, "life": dur, "max": dur, "tick": 0.05, "k": 1.0, "freed": false})
	else:
		for i in 3 * per:
			var m = pick.call(hero.tp)
			if m != null:
				threads.append({"src": null, "m": m, "life": dur, "max": dur, "tick": 0.05, "k": 0.65, "freed": false})
	hero._face(near[0].tp - hero.tp)
	return true

func thread_src(th: Dictionary) -> Vector3:
	var s = th["src"]
	if s != null and not s.gone:
		return Vector3(s.tp.x, s.tp.y, s.z)
	return Vector3(hero.tp.x, hero.tp.y, 12.0)

func _cast_word(a: Vector2) -> bool:
	if not spend("word"):
		return false
	var p := clamp_cast(a, 9.0)
	var R := 2.4 * (1.5 if K("wordwide") > 0 else 1.0)
	var dmg := ws_word_dmg()
	words.append({"tp": p, "R": R, "t": 0.0, "dur": 1.1, "dmg": dmg, "seed": randf() * 6.0, "done": false})
	if K("wordecho") > 0:
		words.append({"tp": p, "R": R, "t": -0.9, "dur": 1.1, "dmg": dmg * 0.7, "seed": randf() * 6.0, "done": false})
	return true

func _cast_chain(a: Vector2) -> bool:
	var first = null
	var bd := 2.5
	for m in mons():
		var d: float = m.tp.distance_to(a)
		if d < bd and m.tp.distance_to(hero.tp) < 10.0 and zone.sight_clear(hero.tp, m.tp):
			bd = d
			first = m
	if first == null:
		say("Nothing near to bind.", 0.9)
		return false
	if not spend("chain"):
		return false
	var n := maxi(0, ws_chain_n() - 1) + (2 if K("chainfork") > 0 else 0)
	var others: Array = mons().filter(func(o): return o != first and o.tp.distance_to(first.tp) < 5.5 and zone.sight_clear(first.tp, o.tp))
	others.sort_custom(func(p, q): return p.tp.distance_to(first.tp) < q.tp.distance_to(first.tp))
	others = others.slice(0, n)
	var dmg := ws_chain_dmg()
	hurt(first, dmg * 0.4, "chain")
	last_hit = first
	binds.append({"a": first, "bound": others, "t": 0.0, "dur": 0.55, "dmg": dmg, "done": false, "fade": 0.0})
	return true

func _cast_totem(a: Vector2) -> bool:
	if aR("a_lantern"):
		say("Your lantern is in your hand: strike with it.", 1.4)
		return false
	if zone.is_solid(a) or a.distance_to(hero.tp) > 9.0:
		say("It cannot stand there.", 1.0)
		return false
	if not spend("totem"):
		return false
	for t in totems:
		t.gone = true
		for w in t.wisps:
			w.gone = true
	totems.clear()
	var o := Mirror.new()
	o.kind = "lantern"
	o.tp = a
	o.life = ws_totem_life()
	o.max_life = o.life
	o.hp = 1e9
	# it houses its wisps (they are held out of the choir while it stands)
	var n := ws_totem_n()
	for i in n:
		var w := Wisp.new()
		w.state = "totem"
		w.ang = float(i) / n * TAU
		w.tp = a
		w.z = 22.0
		w.scale = 0.8
		w.cd = 0.3 + 0.2 * i
		o.wisps.append(w)
	totems.append(o)
	return true

# ================================================================== the frame
func tick(dt: float) -> void:
	if hero == null or hero.zone == null:
		return
	time += dt
	if zone != hero.zone:
		_enter_zone()
	if _was_dead:
		_was_dead = false
	_upkeep(dt)
	_holds(dt)
	_update_wisps(dt)
	_update_great(dt)
	_update_fx(dt)
	_update_souls(dt)
	_update_mirrors(dt)
	_update_fissures(dt)
	_update_orbs(dt)
	_update_storms(dt)
	_update_words(dt)
	_update_binds(dt)
	_update_threads(dt)
	_update_totems(dt)
	_update_darts(dt)
	_update_whips(dt)
	_update_phantoms(dt)
	_arcana_tick(dt)
	if golem != null:
		golem.tick(dt)
	_push_out()
	_views()
	if auto_on:
		_autocast(dt)
	if trace:
		trace_t -= dt
		if trace_t <= 0.0:
			trace_t = 5.0
			var parts := []
			var sts := {}
			for w in wisps:
				sts[w.state] = int(sts.get(w.state, 0)) + 1
			var near := mons().filter(func(q): return q.tp.distance_to(hero.tp) < 6.0).map(func(q): return "%s:%s:%.1f" % [q.kind, q.brain.state if q.brain else "-", q.tp.distance_to(hero.tp)])
			print("   states ", sts, " near ", near, " hero ", hero.tp, " act ", hero.act)
			for k in dmg_log:
				parts.append("%s=%d" % [k, int(dmg_log[k])])
			print("MYS t=%.0f wisps %d/%d res %.0f/%.0f golem %s great %s mirrors %d souls %d threads %d dmg {%s}" % [time, wisps.size(), eff_cap(),
				hero.st.res, hero.st.res_max(), (golem.state + " " + str(int(golem.hp))) if golem != null else "-",
				str(great.size) if great != null else "-", mirrors.size(), souls.size(), threads.size(), ", ".join(parts)])

func _enter_zone() -> void:
	zone = hero.zone
	# what was cast stays behind; the choir, the golem and the great wisp come along
	for o in mirrors:
		o.gone = true
	mirrors.clear()
	for t in totems:
		t.gone = true
		for w in t.wisps:
			w.gone = true
	totems.clear()
	for arr in [cages, fissures, cracks, spikes, glass, gshots, rings, fires, souls, sparks, needles, snags, binds, threads, darts, dart_lines, orbs, shards, storms, words, whips, phantoms]:
		arr.clear()
	for w in wisps:
		w.tp = hero.tp
		w.state = "drift"
		w.cd = 0.4
		w.node = null
	if great != null:
		great.tp = hero.tp
		great.target = null
		great.node = null
	if golem != null:
		golem.tp = walkable_near(hero.tp + Vector2(0.8, 0))
		golem.atk = {}
		golem.path = PackedVector2Array()
		golem.order = {}
		golem.fly = {}
		golem.shield = true
		if golem.state == "charge" or golem.state == "chargeWind":
			golem.state = "active"
		if gbeh["hold"]:
			golem.hold = golem.tp
		golem.node = null
	fx_air = null
	fx_floor = null
	if wisps.is_empty():
		for i in eff_cap():
			spawn_wisp()

## Essence while in Wraith Form (it drains, and does not come back), Thread Mastery's regen, the Veil's
## looks, the wraith's speed and its afterimages
func _upkeep(dt: float) -> void:
	var st = hero.st
	var base: float = st.res_regen()
	if wraith:
		st.res = maxf(0.0, st.res - base * dt - ws_wraith_drain() * dt)
		if st.res <= 0.0:
			end_wraith()
			say("Your Essence gives out.", 1.2)
		if hero.act in ["atk", "atk2", "swing", "roll", "heavy"]:
			end_wraith()
	elif K("nmastery") > 0:
		st.res = minf(st.res_max(), st.res + base * 0.05 * K("nmastery") * dt)
	if wraith:
		hero.spr.modulate = Color(0.78, 0.86, 1.0, 0.55)
		# the wraith is quicker (x1.2..1.35): the extra stride along the hero's own path
		if hero.walking and hero.path_i < hero.path.size():
			var wp: Vector2 = hero.path[hero.path_i]
			var to := wp - hero.tp
			var extra := st.move_speed() * (ws_wraith_spd() - 1.0) * dt
			if to.length() > 0.05:
				hero.tp = zone.move(hero.tp, to.normalized() * minf(extra, to.length() - 0.02), hero.radius)
		# Phantom Step
		if K("phantom") > 0 and hero.walking:
			phantom_t -= dt
			if phantom_t <= 0.0:
				phantom_t = 0.3
				phantoms.append({"tp": hero.tp, "t": 0.8, "tex": hero.spr.texture, "off": hero.spr.offset, "flip": hero.spr.flip_h})
	if hero.dead:
		end_wraith()
		infusing = false
		condensing = false
		proc["on"] = false

# ------------------------------------------------------------------ held skills: Needle and Thread, Condense, Procession, Overcharge
func _root() -> void:
	hero.walking = false
	hero.target = null
	if hero.act == "":
		hero._start_act("cast", 0.3)

func _holds(dt: float) -> void:
	var rolling: bool = hero.act == "roll" or hero.act == "stun"
	var a := aim_point()
	# Overcharge (or Condense with the cursor on the golem): pour wisps into it
	var cond_on_golem: bool = golem != null and K("overcharge") > 0 and held("condense") and a.distance_to(golem.tp) < 1.6
	var want_inf: bool = (cond_on_golem or (held("overcharge") and K("overcharge") > 0)) and golem != null and not rolling
	if want_inf and not infusing:
		infusing = true
		inf_t = 0.0
		end_wraith()
	if infusing and not want_inf:
		infusing = false
	if infusing:
		_root()
		inf_t -= dt
		if inf_t <= 0.0:
			inf_t = 0.16
			_infuse_one()
		if golem != null:
			hero._face(golem.tp - hero.tp)
	# Needle and Thread: a darting wisp with every pulse while held
	an_hold = an_hold + dt if (held("lance") and K("lance") > 0) else 0.0
	if held("lance") and K("lance") > 0 and not rolling and not infusing:
		lance_t -= dt
		if lance_t <= 0.0 and hero.act in ["", "cast"]:
			if spend("lance"):
				end_wraith()
				hero._face(a - hero.tp)
				var cs: float = 1.0 + hero.st.item("fcr") / 100.0
				lance_t = 0.42 / cs
				hero._start_act("cast", 0.22 / cs)
				hero.walking = false
				hero.target = null
				_lance_pulse(a)
				hero.stats_changed.emit()
			else:
				lance_t = 0.3
	else:
		lance_t = 0.0
	# Condense: crush wisps into the great wisp
	condensing = not infusing and held("condense") and K("condense") > 0 and not rolling
	if condensing:
		end_wraith()
		_root()
		cond_t -= dt
		if cond_t <= 0.0:
			cond_t = ws_cond_rate()
			_condense_one()
			hero.stats_changed.emit()
	else:
		cond_t = 0.0
	# Procession: the choir circles the cursor while held, a little Essence a second
	var want_p: bool = K("proc") > 0 and held("proc") and not rolling and not hero.dead
	if want_p:
		var need: float = float(data.get("proc", {}).get("cost", {}).get("base", 3.6)) * dt
		if hero.st.res < need:
			if proc["on"]:
				say("Your Essence is spent.", 0.8)
			proc["on"] = false
		else:
			hero.st.res -= need
			var d := a - hero.tp
			proc["tp"] = hero.tp + d.normalized() * 8.0 if d.length() > 8.0 else a
			proc["on"] = true
			proc["t"] = float(proc["t"]) + dt
	elif proc["on"]:
		proc["on"] = false
		for w in wisps:
			w.state = "drift"
			w.cd = 0.3
	pending_tap = ""

# ------------------------------------------------------------------ the choir
func _update_wisps(dt: float) -> void:
	var cap := eff_cap()
	while wisps.size() > cap:
		var w: Wisp = wisps.pop_back()
		w.gone = true
	if wisps.size() < cap and not condensing and not infusing:
		wisp_t += dt
		if wisp_t >= ws_wisp_regen():
			wisp_t = 0.0
			spawn_wisp()
	elif wisps.size() >= cap:
		wisp_t = 0.0
	for w in wisps.duplicate():
		if not w.gone:
			_rev(w, dt)

func _drift(w: Wisp, dt: float, calm: bool) -> void:
	w.wt += dt
	w.ang += dt * (0.5 + 0.5 * sin(w.wt * 0.6 + w.rad)) * (0.5 if calm else 1.0)
	var spread: float = 0.6 + 0.2 * wbeh["x"]
	w.rad = clampf(w.rad + (randf() - 0.5) * dt * 2.2, 0.5, 2.3 * spread)
	var tgt: Vector2 = hero.tp + Vector2(cos(w.ang) * w.rad + sin(w.wt * 1.3) * 0.35, sin(w.ang) * w.rad + cos(w.wt * 1.1) * 0.35)
	var k := 3.0 if calm else 6.0
	w.v += ((tgt - w.tp) * k - w.v * 2.6) * dt
	w.tp += w.v * dt
	w.z += (13.0 + sin(w.wt * 2.3) * 3.0 - w.z) * minf(1.0, dt * 4.0)

func _wisp_focus(maxd: float) -> Variant:
	var t = last_hit
	if wbeh["focus"] and t != null and is_instance_valid(t) and not t.dead and not t.buried and t.tp.distance_to(hero.tp) < maxd + 1.5 and zone.sight_clear(hero.tp, t.tp):
		return t
	return null

func _wisp_allowed(m) -> bool:
	if wbeh["hold"]:
		return false
	if wbeh["y"] <= 1:
		if m.tp.distance_to(hero.tp) < 2.6 + wbeh["y"] * 0.8 or threatens(m):
			return true
		return golem != null and golem.state != "dormant" and m.get_meta("mys_taunt_by", null) == golem.node and m.tp.distance_to(golem.tp) < 2.5
	return true

func _wisp_target(w: Wisp, maxd: float, is_great: bool = false) -> Variant:
	if not is_great:
		maxd = wisp_range(maxd)
		var f = _wisp_focus(maxd)
		if f != null:
			return f
	var best: Array = []
	for m in mons():
		if absf(m.tp.x - hero.tp.x) > maxd or absf(m.tp.y - hero.tp.y) > maxd:
			continue
		var d: float = m.tp.distance_to(hero.tp)
		if is_idle(m) and d > 5.0:
			continue
		if not is_great and not _wisp_allowed(m):
			continue
		if d > maxd or not zone.sight_clear(hero.tp, m.tp):
			continue
		best.append([d + m.tp.distance_to(w.tp) * 0.4, m])
	if best.is_empty():
		return null
	best.sort_custom(func(p, q): return p[0] < q[0])
	return best[randi() % mini(3, best.size())][1]

func _perish(w: Wisp) -> void:
	wisps.erase(w)
	w.gone = true
	glass_burst(w.tp, 2, 1.2, w.z)
	_wisp_lost()
	if aM("w_wake"):
		hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.02)
	if aM("a_revenant") and wisps.size() < eff_cap():
		spawn_wisp(w.tp)
		if not wisps.is_empty():
			var nw: Wisp = wisps[wisps.size() - 1]
			nw.armor_t = 5.0
			nw.scale = 1.15
	if K("burst") > 0:
		var r := ws_burst_r()
		var dmg := ws_burst_dmg()
		for m in mons():
			if m.tp.distance_to(w.tp) < r:
				hurt(m, dmg, "restless", {"from": w.tp})
		ring(w.tp, r, 0.35, 0.2)

## a standing mirror, the golem and its shield: what the wisps and darts rebound from (d_play.js metals)
func metals() -> Array:
	var out: Array = []
	if golem != null and golem.state != "dormant":
		out.append({"key": golem, "tp": golem.tp, "r": golem.r, "cracked": false, "hall": false, "z": 20.0})
		if not golem.fly.is_empty():
			out.append({"key": "shield", "tp": golem.fly["tp"], "r": 0.42, "cracked": false, "hall": false, "z": 14.0})
	for o in mirrors:
		if o.standing():
			out.append({"key": o, "tp": o.tp, "r": o.r, "cracked": o.cracked or o.kind == "great", "hall": o.hall, "z": 22.0 if o.kind == "great" else 18.0})
	return out

func _metal(key) -> Variant:
	for mt in metals():
		var k2 = mt["key"]
		if typeof(k2) == typeof(key) and k2 == key:
			return mt
	return null

func _next_foe(from: Vector2, hit: Dictionary, R: float) -> Variant:
	var best = null
	var bd := R
	for m in mons():
		if hit.has(m.get_instance_id()):
			continue
		var d: float = m.tp.distance_to(from)
		if d < bd and zone.sight_clear(from, m.tp):
			bd = d
			best = m
	return best

func _near_mirror(from: Vector2, used: Dictionary, R: float) -> Variant:
	var best = null
	var bd := R
	for mt in metals():
		if used.has(mt["key"]):
			continue
		var d: float = mt["tp"].distance_to(from)
		if d < bd and d > 0.2 and zone.sight_clear(from, mt["tp"]) and _next_foe(mt["tp"], {}, 6.5) != null:
			bd = d
			best = mt
	return best

## the Mirror tree promises that the choir rebounds off mirrors renewed (the v90 choir lost it with the lantern
## wisps): after a strike, a wisp near a standing mirror flies to it, rebounds x1.25 (Resonance more) with more
## strikes left in it (a leap, two with Resonance, one more off the Hall), up to 3 rebounds (4+ with Resonance) a sortie.
func _maybe_mirror(w: Wisp) -> void:
	if not CHOIR_REBOUND or w.bounces >= ws_max_bounce():
		return
	var mt = _near_mirror(w.tp, w.used, 3.0)
	if mt != null:
		w.state = "mirror"
		w.mirror = mt["key"]

func _rebound(w: Wisp, mt: Dictionary) -> void:
	w.used[mt["key"]] = true
	w.bounces += 1
	w.mult = maxf(1.0, w.mult) * ws_bounce_mult()
	w.hits -= 1 + (1 if K("resonance") > 0 else 0) + (1 if mt["hall"] else 0)
	if mt["cracked"]:
		_spark_split(w.tp, {}, 2, ws_rev_dmg() * 0.6)
		glass_burst(mt["tp"], 3, 1.2, mt["z"])
	var n = _next_foe(mt["tp"], {}, 6.5)
	if n != null:
		w.state = "dive"
		w.target = n
		w.dir = (n.tp - w.tp).normalized()
	else:
		w.state = "drift"
		w.cd = 0.2

func _rev(w: Wisp, dt: float) -> void:
	if w.armor_t > 0.0:
		w.armor_t -= dt
		if w.armor_t <= 0.0:
			w.scale = 1.0
			w.hits = 0
	if proc["on"]:
		_proc_wisp(w, dt)
		return
	var spd := ws_fly_spd()
	if w.state == "drift" or w.state == "proc":
		if w.state == "proc":
			w.state = "drift"
		_drift(w, dt, false)
		w.cd -= dt
		w.bounces = 0
		w.used = {}
		w.mult = 1.0
		w.split_done = false
		if w.cd <= 0.0:
			var t = _wisp_target(w, 4.6)
			if t != null:
				w.state = "dive"
				w.target = t
			else:
				w.cd = 0.25
		return
	if w.cull_t > 0.0:
		w.cull_t -= dt
		if w.cull_t <= 0.0:
			w.state = "drift"
			w.cd = 0.4
			w.cull_pool = []
			return
	if w.state == "mirror":
		var mt = _metal(w.mirror)
		if mt == null:
			w.state = "over"
			w.over = 0.0
		else:
			var dv: Vector2 = mt["tp"] - w.tp
			w.dir = dv.normalized() if dv.length() > 0.001 else w.dir
			if dv.length() < mt["r"] + 0.25:
				_rebound(w, mt)
	if w.state == "dive":
		var t = w.target
		if t == null or not is_instance_valid(t) or t.dead or t.buried:
			var n = _wisp_target(w, 5.0)
			if n != null:
				w.target = n
			else:
				w.state = "drift"
				w.cd = 0.2
				return
		var dv2: Vector2 = w.target.tp - w.tp
		var l := dv2.length()
		if l > 0.001:
			w.dir = dv2 / l
		if l < 0.3:
			w.state = "over"
			w.over = 0.22 + randf() * 0.15
	elif w.state == "over":
		w.over -= dt
		if w.over <= 0.0:
			var n2 = null
			if w.cull_t > 0.0:
				var cp: Array = w.cull_pool.filter(func(q): return is_instance_valid(q) and not q.dead and not q.buried)
				if not cp.is_empty():
					n2 = cp[randi() % cp.size()]
			if n2 == null:
				n2 = _wisp_target(w, 5.2)
			if n2 != null:
				w.state = "dive"
				w.target = n2
				_maybe_mirror(w)
			else:
				w.state = "drift"
				w.cd = 0.15
	w.v = w.dir * spd
	w.tp += w.v * dt
	w.z += (9.0 - w.z) * minf(1.0, dt * 8.0)
	# cracked mirror-glass fissures a wisp that crosses it into sparks
	if CHOIR_REBOUND and not w.split_done:
		for c in cracks:
			if c["tp"].distance_to(w.tp) < 0.45:
				w.split_done = true
				_spark_split(w.tp, {}, 2, ws_rev_dmg() * 0.6)
				break
	for m in mons():
		if absf(m.tp.x - w.tp.x) > 1.0 or absf(m.tp.y - w.tp.y) > 1.0:
			continue
		if m.tp.distance_to(w.tp) > m.radius + 0.22:
			continue
		var key: int = m.get_instance_id()
		if time - float(w.hit_t.get(key, -9.0)) < 0.45:
			continue
		w.hit_t[key] = time
		var dmg := ws_rev_dmg() * w.mult
		w.mult = 1.0
		hurt(m, dmg, "wisps", {"from": w.tp})
		var lp := ws_leech()
		if lp > 0.0:
			hero.st.hp = minf(hero.st.life_max(), hero.st.hp + dmg * lp)
			hero.st.res = minf(hero.st.res_max(), hero.st.res + dmg * lp)
		_chances(w, m, true)
		if aR("a_choir") and not m.boss and not m.dead:
			m.confused = maxf(m.confused, 3.0)   # held: it turns on its own kind
		if w.cull_t > 0.0:
			if K("cullmark") > 0:
				m.set_meta("mys_cull", time + 4.0)
		else:
			w.hits += 1
		if w.hits >= ws_hits() and w.armor_t <= 0.0:
			_perish(w)
			return
	if w.tp.distance_to(hero.tp) > (12.0 if w.cull_t > 0.0 else 7.5):
		w.state = "drift"
		w.cd = 0.3
		w.cull_t = 0.0

## the one choir (v90): chances rolled on each wisp strike
func _chances(w: Wisp, m, with_pass: bool) -> void:
	if with_pass and randf() < ch_pass():
		w.hits -= 1
	if not m.dead and randf() < ch_thread():
		m.slow = maxf(m.slow, 0.6)
		m.add_poise_damage(10.0 * 1.2, false)
		snags.append({"w": w, "m": m, "tp": w.tp, "t": 0.0, "dur": 0.5})
	if randf() < ch_needle():
		_needle(w, m)
	if randf() < ch_split():
		_spark_split(m.tp, {m.get_instance_id(): true}, spark_n(), spark_dmg())

func _needle(w: Wisp, m) -> void:
	var d: Vector2 = w.dir if w.dir.length() > 0.01 else (m.tp - hero.tp).normalized()
	var len := needle_len()
	var end := len
	var s := 0.25
	while s < len:
		if zone.blocks_sight(m.tp + d * s):
			end = s
			break
		s += 0.25
	var dmg := needle_dmg()
	for o in mons():
		if o == m:
			continue
		var p: Vector2 = o.tp - m.tp
		var t := p.dot(d)
		if t < 0.0 or t > end or absf(p.x * d.y - p.y * d.x) > o.radius + 0.2:
			continue
		hurt(o, dmg, "beam", {"from": m.tp})
		if K("beamburn") > 0 and not o.dead:
			o.add_dot(dmg * 0.5, 2.0, "fire")
	if K("beamburn") > 0 and not m.dead:
		m.add_dot(dmg * 0.5, 2.0, "fire")
	needles.append({"tp": m.tp, "d": d, "end": end, "t": 0.0, "dur": 0.05 + end * 0.035})

func _spark_split(from: Vector2, skip: Dictionary, n: int, dmg: float) -> void:
	var near: Array = mons().filter(func(o): return not skip.has(o.get_instance_id()) and o.tp.distance_to(from) < 4.5)
	near.sort_custom(func(p, q): return p.tp.distance_to(from) < q.tp.distance_to(from))
	for i in mini(n, near.size()):
		sparks.append({"tp": from, "z": 9.0, "tgt": near[i], "dmg": dmg, "t": 0.0})

## Procession: the choir walks a slow ring about the cursor and strikes what is inside it
func _proc_wisp(w: Wisp, dt: float) -> void:
	var n := maxi(1, wisps.size())
	var i := wisps.find(w)
	var R := proc_r()
	var ang: float = float(i) / n * TAU + float(proc["t"]) * 1.1
	var tgt: Vector2 = proc["tp"] + Vector2(cos(ang), sin(ang)) * R
	var dv := tgt - w.tp
	var d := maxf(dv.length(), 0.0001)
	var st := minf(d, ws_fly_spd() * 1.15 * dt)
	w.dir = dv / d
	w.tp += w.dir * st
	w.z += (9.0 - w.z) * minf(1.0, dt * 6.0)
	w.state = "proc"
	w.p_t -= dt
	if w.p_t > 0.0:
		return
	var best = null
	var bd := 1.6
	for m in mons():
		if m.tp.distance_to(proc["tp"]) > R + m.radius:
			continue
		var dm2: float = m.tp.distance_to(w.tp)
		if dm2 < bd:
			bd = dm2
			best = m
	if best == null:
		w.p_t = 0.15
		return
	w.p_t = 0.45
	hurt(best, ws_rev_dmg() * 0.6, "proc", {"from": w.tp})
	if K("procslow") > 0:
		best.slow = maxf(best.slow, 0.45)
	if not best.dead:
		_chances(w, best, false)

# ------------------------------------------------------------------ the great wisp (Condense)
func _update_great(dt: float) -> void:
	var gw := great
	if gw == null:
		return
	gw.wt += dt
	gw.scale = minf(3.5, 1.0 + 0.12 * gw.size)
	if gw.state == "form":
		var tgt := hero.tp - Vector2(0.35, 0.35)
		gw.v += ((tgt - gw.tp) * 8.0 - gw.v * 4.0) * dt
		gw.tp += gw.v * dt
		gw.z += (26.0 + gw.size * 0.4 - gw.z) * minf(1.0, dt * 4.0)
		if not condensing:
			if gw.size <= 0:
				gw.gone = true
				great = null
				return
			gw.state = "hunt"
			gw.life = ws_cond_life() + 0.15 * gw.size
			gw.hit_t = {}
			gw.target = null
		return
	gw.life -= dt
	var spd := 5.5
	var R := 0.3 + 0.035 * gw.size
	if gw.over > 0.0:
		gw.over -= dt
		if gw.over <= 0.0:
			gw.target = _wisp_target(gw, 7.5, true)
	else:
		if gw.target == null or not is_instance_valid(gw.target) or gw.target.dead or gw.target.buried:
			gw.target = _wisp_target(gw, 7.5, true)
		if gw.target != null:
			var dv: Vector2 = gw.target.tp - gw.tp
			if dv.length() > 0.001:
				gw.dir = dv.normalized()
			if dv.length() < 0.3:
				gw.over = 0.35
	if gw.target != null or gw.over > 0.0:
		gw.tp += gw.dir * spd * dt
	else:
		var t2 := hero.tp + Vector2(cos(gw.wt), sin(gw.wt)) * 1.2
		gw.tp += (t2 - gw.tp) * minf(1.0, dt * 3.0)
	gw.z += (14.0 + gw.size * 0.3 - gw.z) * minf(1.0, dt * 5.0)
	var dmg := ws_cond_dmg() * (1.0 + 0.35 * gw.size)
	if gw.target != null and is_instance_valid(gw.target):
		last_hit = gw.target
	for m in mons():
		if m.tp.distance_to(gw.tp) > m.radius + R:
			continue
		var key: int = m.get_instance_id()
		if time - float(gw.hit_t.get(key, -9.0)) < 0.5:
			continue
		gw.hit_t[key] = time
		hurt(m, dmg, "condense", {"from": gw.tp})
	if K("radiance") > 0:
		gw.pulse -= dt
		if gw.pulse <= 0.0:
			gw.pulse = 0.8
			var r := 1.2 + 0.05 * gw.size
			var pd := ws_rad_dmg() * (1.0 + 0.15 * gw.size)
			for m in mons():
				if m.tp.distance_to(gw.tp) < r:
					hurt(m, pd, "condense", {"from": gw.tp})
	if gw.tp.distance_to(hero.tp) > 11.0:
		gw.tp += (hero.tp - gw.tp) * 0.5
	if gw.life <= 0.0:
		if K("nova") > 0:
			var r2 := 1.5 + 0.08 * gw.size
			var nd := ws_nova_dmg() * (1.0 + 0.25 * gw.size)
			for m in mons():
				if m.tp.distance_to(gw.tp) < r2:
					hurt(m, nd, "condense", {"from": gw.tp})
			ring(gw.tp, r2, 0.5, 0.2)
		glass_burst(gw.tp, 6, 2.0, gw.z)
		gw.gone = true
		great = null

# ------------------------------------------------------------------ sparks, needles, snags, rings, glass, fires
func _update_fx(dt: float) -> void:
	for s in sparks:
		s["t"] += dt
		var g = s["tgt"]
		if g == null or not is_instance_valid(g) or g.dead or g.buried:
			s["t"] = 9.0
			continue
		var dv: Vector2 = g.tp - s["tp"]
		var d := maxf(dv.length(), 0.001)
		s["tp"] += dv / d * minf(d, 11.0 * dt)
		if d < 0.3:
			hurt(g, s["dmg"], "prism", {"from": s["tp"]})
			s["t"] = 9.0
	sparks = sparks.filter(func(s): return s["t"] < 1.0)
	for n in needles:
		n["t"] += dt
	needles = needles.filter(func(n): return n["t"] < n["dur"])
	for s in snags:
		s["t"] += dt
		if not s["w"].gone:
			s["tp"] = s["w"].tp
	snags = snags.filter(func(s): return s["t"] < s["dur"] and is_instance_valid(s["m"]) and not s["m"].dead)
	for r in rings:
		r["t"] -= dt
	rings = rings.filter(func(r): return r["t"] > 0.0)
	for g in glass:
		g["t"] -= dt
		g["vz"] -= 70.0 * dt
		g["z"] += g["vz"] * dt
		g["tp"] += g["v"] * dt
		if g["z"] <= 0.0:
			g["z"] = 0.0
			g["vz"] = -g["vz"] * 0.3 if absf(g["vz"]) > 8.0 else 0.0
			g["v"] *= 0.4
	glass = glass.filter(func(g): return g["t"] > 0.0)
	for gs in gshots:
		gs["t"] -= dt
		gs["tp"] += gs["v"] * dt
		if zone.is_solid(gs["tp"]):
			gs["t"] = 0.0
			continue
		for m in mons():
			var k: int = m.get_instance_id()
			if gs["hit"].has(k) or m.tp.distance_to(gs["tp"]) > m.radius + 0.15:
				continue
			gs["hit"][k] = true
			hurt(m, gs["dmg"], gs["id"], {"from": gs["tp"]})
	gshots = gshots.filter(func(g): return g["t"] > 0.0)
	for f in fires:
		f["t"] -= dt
		f["tick"] -= dt
		if f["tick"] <= 0.0:
			f["tick"] = 0.5
			for m in mons():
				if m.tp.distance_to(f["tp"]) < f["R"] + m.radius:
					hurt(m, f["dps"] * 0.5, "overcharge", {"from": f["tp"], "golem": true})
	fires = fires.filter(func(f): return f["t"] > 0.0)
	for dl in dart_lines:
		dl["t"] -= dt
	dart_lines = dart_lines.filter(func(d): return d["t"] > 0.0)
	for tb in totem_beams:
		tb["t"] -= dt
	totem_beams = totem_beams.filter(func(t): return t["t"] > 0.0)

# ------------------------------------------------------------------ seeking souls (d_play.js updateProjectiles)
func _update_souls(dt: float) -> void:
	for s in souls:
		s["t"] -= dt
		s["retarget"] -= dt
		s["wob"] += dt * 9.0
		var tg = s["target"]
		if tg == null or not is_instance_valid(tg) or tg.dead or tg.buried or s["retarget"] <= 0.0:
			var opts: Array = mons().filter(func(m): return m.tp.distance_to(s["tp"]) < 6.5)
			var fresh: Array = opts.filter(func(m): return not s["hit"].has(m.get_instance_id()))
			s["target"] = fresh[randi() % fresh.size()] if not fresh.is_empty() else (opts[randi() % opts.size()] if not opts.is_empty() else null)
			s["retarget"] = 0.5
			tg = s["target"]
		if tg != null:
			var dv: Vector2 = (tg.tp - s["tp"]).normalized()
			s["v"] += (dv * 9.0 - s["v"]) * minf(1.0, dt * 5.0)
		var n: Vector2 = s["tp"] + (s["v"] + Vector2(cos(s["wob"]), sin(s["wob"])) * 1.2) * dt
		if zone.blocks_sight(n):
			s["t"] = 0.0
			continue
		s["tp"] = n
		for m in mons():
			var k: int = m.get_instance_id()
			if s["hit"].has(k) or absf(m.tp.x - n.x) > 1.0 or absf(m.tp.y - n.y) > 1.0:
				continue
			if m.tp.distance_to(n) < m.radius + 0.15:
				var got := hurt(m, s["dmg"], "swarm", {"from": n})
				if aM("a_hunger"):
					hero.st.hp = minf(hero.st.life_max(), hero.st.hp + got * 0.05)
				if s.get("storm", false) and aU("a_pyre") and not m.dead:
					m.add_dot(s["dmg"] * 0.4, 3.0, "fire")
				if aU("a_sage") and not s.get("jumped", false) and s["hits"] <= 1:
					for jj in 2:
						var js := new_soul(m.tp, randf() * TAU, 6.0, s["dmg"] * 0.6, 1)
						js["jumped"] = true
						js["hit"][k] = true
				last_hit = m
				s["hits"] -= 1
				s["hit"][k] = true
				if s["hits"] <= 0:
					s["t"] = 0.0
					break
				s["target"] = null
				s["retarget"] = 0.0
	souls = souls.filter(func(s): return s["t"] > 0.0)
	if souls.size() > 300:
		souls = souls.slice(souls.size() - 300)

# ------------------------------------------------------------------ mirrors: rise, stand, break; the great mirror falls
func _update_mirrors(dt: float) -> void:
	for o in mirrors:
		if o.gone:
			continue
		if o.kind == "pane":
			if o.rise > 0.0:
				o.rise -= dt
				if o.rise <= 0.0 and o.fresh:
					o.fresh = false
					glass_burst(o.tp, 4, 1.5, 12.0)
					for m in mons():
						var dd: float = m.tp.distance_to(o.tp)
						if dd > 0.9 + m.radius:
							continue
						if o.dmg > 0.0:
							hurt(m, o.dmg, "pillars", {"from": o.tp})
							m.stun = maxf(m.stun, 1.0 if aM("i_quake") else 0.5)
						if dd < o.r + m.radius:
							shove(m, ((m.tp - o.tp).normalized() if dd > 0.001 else Vector2.RIGHT) * (o.r + m.radius - dd + 0.05))
			else:
				o.life -= dt
		elif o.kind == "great":
			if o.fall > 0.0:
				o.fall -= dt
				if o.fall <= 0.0 and o.fresh:
					o.fresh = false
					o.cracked = true
					glass_burst(o.tp, 30, 4.0, 22.0)
					if Settings.screen_shake:
						Game.hitstop(0.06)
					for m in mons():
						var d: float = m.tp.distance_to(o.tp)
						if d > 1.25 + m.radius:
							continue
						hurt(m, o.dmg, "anvil", {"from": o.tp, "heavy": true})
						m.stun = maxf(m.stun, 0.4 if m.boss else 1.2)
						if d < o.r + m.radius:
							shove(m, ((m.tp - o.tp).normalized() if d > 0.001 else Vector2.RIGHT) * (o.r + m.radius - d + 0.05))
					if aU("a_anvil"):
						_splinter_ring(o.tp, 1.4, 7)
					var q := K("anvilquake") > 0
					var n := 16 if q else 8
					var k := 0.4 if q else 0.22
					for i in n:
						var ang := float(i) / n * TAU + 0.2
						var dv := Vector2(cos(ang), sin(ang))
						gshots.append({"tp": o.tp + dv * 0.4, "v": dv * 8.0, "dmg": o.dmg * k, "t": 0.4 if q else 0.3, "hit": {}, "id": "anvil"})
				continue
			o.life -= dt
			if K("anvilstay") > 0:
				for m in mons():
					if m.tp.distance_to(o.tp) < 1.8 + m.radius:
						m.slow = maxf(m.slow, 0.4)
		if o.life <= 0.0 or o.hp <= 0.0:
			o.gone = true
			glass_burst(o.tp, 12 if o.kind == "pane" else 24, 2.0, 18.0)
	mirrors = mirrors.filter(func(o): return not o.gone)
	# mirrors break: creatures within 0.9 yd bash them every 0.4 s (zz_tune_batch_c.js)
	if int(time / 0.4) != int((time - dt) / 0.4):
		for o in mirrors:
			if o.kind != "pane" or not o.standing():
				continue
			for m in mons():
				if m.tp.distance_to(o.tp) > 0.9 + m.radius or is_idle(m):
					continue
				var bd: float = maxf(1.0, randf_range(m.dmg.x, m.dmg.y)) * 0.6
				if (m.boss or m.ai == "charger") and bd >= (40.0 + 5.0 * (maxi(1, K("pillars")) - 1)) * 0.75:
					o.hp = 0.0
				else:
					o.hp -= bd
	# Lure of the Glass: the mirrors drag creatures toward their reflections
	if K("magnet") > 0:
		var R := ws_magnet_r()
		var pull := ws_magnet_pull() * dt
		for m in mons():
			if m.boss:
				continue
			var best = null
			var bd2 := R
			for o in mirrors:
				if o.kind != "pane" or not o.standing():
					continue
				var dd: float = m.tp.distance_to(o.tp)
				if dd < bd2:
					bd2 = dd
					best = o
			if best != null and bd2 > best.r + m.radius + 0.08:
				shove(m, (best.tp - m.tp) / bd2 * pull)
	# the Hall of Mirrors: Razor Glass cuts what is caged; the Shattering Hall falls inward at its end
	for c in cages:
		c["t"] -= dt
		c["tick"] -= dt
		if c["tick"] <= 0.0 and K("spikedcage") > 0:
			c["tick"] = 1.0
			for m in mons():
				if m.tp.distance_to(c["tp"]) < 1.7:
					hurt(m, ws_cage_dmg() * 0.3, "cage", {"from": c["tp"]})
		if c["t"] <= 0.0 and K("maidcrush") > 0:
			for m in mons():
				if m.tp.distance_to(c["tp"]) < 1.9:
					hurt(m, ws_cage_dmg() * 1.5, "cage", {"from": c["tp"]})
					if not m.boss:
						m.stun = maxf(m.stun, 1.0)
			glass_burst(c["tp"], 24, 3.0, 14.0)
	cages = cages.filter(func(c): return c["t"] > 0.0)

# ------------------------------------------------------------------ Mirror Fissure: a crack of mirror-glass racing out
func _update_fissures(dt: float) -> void:
	for f in fissures:
		f["t"] -= dt
		while f["t"] <= 0.0 and f["i"] < f["n"]:
			f["t"] += 0.045
			f["i"] += 1
			var d: Vector2 = f["d"]
			var p: Vector2 = f["tp"] + d * f["i"] * 0.6
			if zone.is_solid(p):
				f["i"] = f["n"]
				break
			spikes.append({"tp": p, "t": 0.5, "max": 0.5, "v": (int(f["i"]) * 7 + randi() % 3) % 4})
			var life := ws_crack_life()
			cracks.append({"tp": p + Vector2(randf_range(-0.08, 0.08), randf_range(-0.08, 0.08)), "t": life, "max": life, "v": randi()})
			while cracks.size() > 90:
				cracks.pop_front()
			glass_burst(p, 3, 2.0, 8.0)
			for m in mons():
				var k: int = m.get_instance_id()
				if f["hit"].has(k) or m.tp.distance_to(p) >= 0.7 + m.radius:
					continue
				f["hit"][k] = true
				hurt(m, ws_fissure_dmg(), "fissure", {"from": p})
				m.stun = maxf(m.stun, 0.8 if K("fdeep") > 0 else 0.4)
			if K("fshrap") > 0:
				for sg in [1.0, -1.0]:
					gshots.append({"tp": p, "v": Vector2(-d.y, d.x) * 9.0 * sg, "dmg": ws_fissure_dmg() * 0.3, "t": 0.45, "hit": {}, "id": "fissure"})
			if f["i"] > f["n"] - f["keep"]:
				_raise_pane(p + Vector2(d.y, 0) * 0.01, ws_pillar_life() * 0.7, 0.0, false, true)
	fissures = fissures.filter(func(f): return f["i"] < f["n"])
	for c in cracks:
		c["t"] -= dt
	cracks = cracks.filter(func(c): return c["t"] > 0.0)
	for s in spikes:
		s["t"] -= dt
		if s["t"] <= 0.0:
			glass_burst(s["tp"], 3, 1.4, 6.0)
	spikes = spikes.filter(func(s): return s["t"] > 0.0)

# ------------------------------------------------------------------ Spool
func _shard(p: Vector2, ang: float, pw: float) -> void:
	shards.append({"tp": p, "v": Vector2(cos(ang), sin(ang)) * 6.5, "t": 0.75, "dmg": ws_orb_dmg() * pw, "pierce": ws_shard_pierce(), "hit": {}})

func _orb_burst(o: Dictionary) -> void:
	for i in 14:
		_shard(o["tp"], i / 14.0 * TAU, o["pow"] * 1.2)
	glass_burst(o["tp"], 4, 2.0, 12.0)
	if o["gen"] == 0 and ws_cascade_n() > 0 and not aR("a_sage"):
		var k := ws_cascade_n()
		var base: float = o["v"].angle()
		for i in k:
			var a := base + (i - (k - 1) / 2.0) * 0.9
			orbs.append({"tp": o["tp"], "v": Vector2(cos(a), sin(a)) * 4.5, "life": 0.9, "ang": randf() * 6.0, "st": 0.0, "pow": ws_cascade_pct(), "gen": 1})

func _update_orbs(dt: float) -> void:
	var burst: Array = []
	for o in orbs:
		o["life"] -= dt
		o["st"] -= dt
		var n: Vector2 = o["tp"] + o["v"] * dt
		if zone.blocks_sight(n):
			o["life"] = 0.0
		else:
			o["tp"] = n
		while o["st"] <= 0.0 and o["life"] > 0.0:
			o["st"] += ws_orb_rate() * (1.6 if o["gen"] else 1.0)
			o["ang"] += 2.3
			_shard(o["tp"], o["ang"], o["pow"])
		if o["life"] <= 0.0:
			burst.append(o)
	orbs = orbs.filter(func(o): return o["life"] > 0.0)
	for o in burst:
		_orb_burst(o)
	for s in shards:
		s["t"] -= dt
		var n2: Vector2 = s["tp"] + s["v"] * dt
		if zone.blocks_sight(n2):
			s["t"] = 0.0
			continue
		s["tp"] = n2
		for m in mons():
			var k: int = m.get_instance_id()
			if s["hit"].has(k) or absf(m.tp.x - n2.x) > 1.0 or m.tp.distance_to(n2) > m.radius + 0.1:
				continue
			s["hit"][k] = true
			hurt(m, s["dmg"], "orb", {"from": n2})
			if aU("a_pyre") and not m.dead:
				m.add_dot(s["dmg"] * 0.3, 3.0, "fire")
			if aU("a_sage") and not s.get("jumped", false) and s["pierce"] <= 1:
				for jj in 2:
					var ang := randf() * TAU
					shards.append({"tp": n2, "v": Vector2(cos(ang), sin(ang)) * 6.5, "t": 0.5, "dmg": s["dmg"] * 0.6, "pierce": 1, "hit": s["hit"].duplicate(), "jumped": true})
			s["pierce"] -= 1
			if s["pierce"] <= 0:
				s["t"] = 0.0
				break
	shards = shards.filter(func(s): return s["t"] > 0.0)
	if shards.size() > 400:
		shards = shards.slice(shards.size() - 400)

# ------------------------------------------------------------------ Soul Storm
func _update_storms(dt: float) -> void:
	for s in storms:
		s["life"] -= dt
		s["st"] -= dt
		if aM("g_storm"):
			s["tp"] = s["tp"].move_toward(hero.tp, 3.5 * dt)
		s["spin"] += dt * 6.0
		while s["st"] <= 0.0:
			s["st"] += ws_storm_rate()
			var so := new_soul(s["tp"], randf() * TAU, 5.0, ws_soul_dmg() * 0.75)
			so["storm"] = true
			if K("tempest") > 0:
				so["hits"] += 1
	storms = storms.filter(func(s): return s["life"] > 0.0)

# ------------------------------------------------------------------ Unravelling
func _update_words(dt: float) -> void:
	for w in words:
		w["t"] += dt
		if w["t"] < 0.0:
			continue
		if w["t"] < w["dur"]:
			for m in mons():
				if m.boss:
					continue
				var d: float = m.tp.distance_to(w["tp"])
				if d < w["R"] + 1.2 and d > 0.2:
					shove(m, (w["tp"] - m.tp) / d * minf(d - 0.15, 2.6 * dt))
					m.slow = maxf(m.slow, 0.5)
		elif not w["done"]:
			w["done"] = true
			for m in mons():
				if m.tp.distance_to(w["tp"]) < w["R"] + m.radius:
					hurt(m, w["dmg"], "word", {"from": w["tp"], "heavy": true})
					if not m.boss:
						m.stun = maxf(m.stun, 0.6)
			glass_burst(w["tp"], 8, 2.5, 10.0)
			if Settings.screen_shake:
				Game.hitstop(0.05)
	words = words.filter(func(w): return not w["done"] or w["t"] < w["dur"] + 0.3)

# ------------------------------------------------------------------ Binding Thread (zz_zz_mystic90.js)
func _update_binds(dt: float) -> void:
	for b in binds:
		if b["done"]:
			b["fade"] += dt
			continue
		b["t"] += dt
		var A = b["a"]
		var alive_a: bool = is_instance_valid(A) and not A.dead
		for m in b["bound"]:
			if not is_instance_valid(m) or m.dead or not alive_a:
				continue
			m.slow = maxf(m.slow, 0.5)
			if m.boss:
				continue     # the great are held, not dragged
			var dv: Vector2 = A.tp - m.tp
			var d := maxf(dv.length(), 0.001)
			var stop: float = A.radius + m.radius + 0.15
			if d <= stop:
				continue
			var left := maxf(0.06, b["dur"] - b["t"])
			var step := minf(d - stop, minf(9.0, (d - stop) / left) * dt) * (0.6 if m.rank in ["champion", "unique"] else 1.0)
			shove(m, dv / d * step)
		if b["t"] >= b["dur"]:
			b["done"] = true
			var all: Array = [A] + b["bound"]
			for m in all:
				if not is_instance_valid(m) or m.dead:
					continue
				hurt(m, b["dmg"], "chain", {"from": A.tp if alive_a else hero.tp})
				if not m.dead:
					m.add_poise_damage(18.0 * 1.2, false)
					m.slow = maxf(m.slow, 0.8)
					if K("chainmark") > 0:
						m.marked = maxf(m.marked, 3.0)
			if Settings.screen_shake and all.size() > 1:
				Game.hitstop(0.04)
	binds = binds.filter(func(b): return not b["done"] or b["fade"] < 0.3)

# ------------------------------------------------------------------ Soul Leash (zz_zz_thread93.js): threads from the wisps
func _update_threads(dt: float) -> void:
	for th in threads:
		th["life"] -= dt
		var src = th["src"]
		if src != null and src.gone:
			th["life"] = minf(th["life"], 0.15)     # its wisp is gone: the thread falls slack
		var m = th["m"]
		if not is_instance_valid(m) or m.dead:
			if is_instance_valid(m) and m.dead and not th["freed"] and K("snare") > 0 and wisps.size() < eff_cap():
				th["freed"] = true
				spawn_wisp(m.tp)
			th["life"] = minf(th["life"], 0.15)
			continue
		if m.buried:
			th["life"] = minf(th["life"], 0.15)
			continue
		var s3 := thread_src(th)
		var s := Vector2(s3.x, s3.y)
		if m.tp.distance_to(s) > 6.5:
			th["life"] = minf(th["life"], 0.15)
			continue
		if K("barbs") > 0:
			m.slow = maxf(m.slow, 0.4)
		# The Rebuke: the rope cracks like a whip every second
		if aU("a_rebuke"):
			th["crack"] = float(th.get("crack", 1.0)) - dt
			if th["crack"] <= 0.0:
				th["crack"] = 1.0
				for o in mons():
					if seg_dist(o.tp, s, m.tp) < o.radius + 0.3:
						hurt(o, ws_leash_dps() * 0.6, "leash", {"from": s, "poise": ws_leash_dps() * 0.5})
						if not o.boss and not o.dead:
							var away: Vector2 = o.tp - hero.tp
							shove(o, away.normalized() * 0.9 if away.length() > 0.01 else Vector2.RIGHT * 0.9)
		th["tick"] -= dt
		if th["tick"] > 0.0 or th["life"] <= 0.15:
			continue
		th["tick"] = 0.25
		var dmg := ws_leash_dps() * 0.25 * float(th["k"])
		hurt(m, dmg, "leash", {"from": s, "poise": dmg * 0.4})
		for o in mons():
			if o == m:
				continue
			if seg_dist(o.tp, s, m.tp) < o.radius + 0.18:
				hurt(o, dmg * 0.7, "leash", {"from": s, "poise": dmg * 0.3})
				if K("barbs") > 0:
					o.slow = maxf(o.slow, 0.5)
	threads = threads.filter(func(th): return th["life"] > 0.0)

# ------------------------------------------------------------------ Soul Lantern
func _update_totems(dt: float) -> void:
	for t in totems:
		t.life -= dt
		if aU("a_lantern"):
			var want: Vector2 = hero.tp + Vector2(0.9, -0.6)
			if t.tp.distance_to(want) > 0.2:
				t.tp = t.tp.move_toward(want, 4.5 * dt)
		t.pulse -= dt
		if t.pulse <= 0.0:
			t.pulse = 0.4
			for m in mons():
				var d: float = m.tp.distance_to(t.tp)
				if d > 4.2:
					continue
				m.set_meta("mys_frail", time + 0.5)
				m.set_meta("mys_lantern", time + 0.5)
				if K("lantgrasp") > 0 and not m.boss and d > 0.8:
					shove(m, (t.tp - m.tp) / d * 0.35)
		# its housed wisps turn about it and loose thin lines at what stands in its light
		for w in t.wisps:
			w.ang += dt * 1.6
			w.tp = t.tp + Vector2(cos(w.ang), sin(w.ang)) * 0.5
			w.z = 20.0 + sin(time * 3.0 + w.ang) * 2.0
			if w.beam.is_empty():
				w.cd -= dt
				if w.cd > 0.0:
					continue
				var best = null
				var bd := 5.5
				for m in mons():
					var dd: float = m.tp.distance_to(w.tp)
					if dd < bd and not (is_idle(m) and m.tp.distance_to(hero.tp) > 6.0) and zone.sight_clear(w.tp, m.tp):
						bd = dd
						best = m
				if best != null:
					w.beam = {"t": 0.0, "dur": 0.8, "tick": 0.0, "target": best}
				else:
					w.cd = 0.3
				continue
			var b: Dictionary = w.beam
			b["t"] += dt
			b["tick"] -= dt
			var tg = b["target"]
			if tg == null or not is_instance_valid(tg) or tg.dead or tg.buried or b["t"] >= b["dur"]:
				w.beam = {}
				w.cd = 1.1
				continue
			totem_beams.append({"a": w.tp, "za": w.z, "b": tg.tp, "t": 0.05})
			if b["tick"] <= 0.0:
				b["tick"] = 0.15
				hurt(tg, ws_totem_dps() * 0.15 * (1.0 - 0.6 * b["t"] / b["dur"]), "totem", {"from": w.tp})
		if K("beacon") > 0:
			if hero.tp.distance_to(t.tp) < 3.0:
				hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.02 * dt)
			if golem != null and golem.state != "dormant" and golem.tp.distance_to(t.tp) < 3.0:
				golem.hp = minf(golem.max_hp, golem.hp + golem.max_hp * 0.02 * dt)
		if t.life <= 0.0:
			t.gone = true
			for w in t.wisps:
				w.gone = true
	totems = totems.filter(func(t): return not t.gone)

# ------------------------------------------------------------------ Needle and Thread: darting wisps that ricochet (zy_anim.js)
func _dart(o: Dictionary) -> Dictionary:
	var M := {"tp": hero.tp, "z": 12.0, "t": 0.0, "tk": "pt", "tgt": null, "hops": 1, "mult": 1.0, "decay": 0.85, "dmg": 1.0,
		"hit": {}, "used": {}, "bounces": 0, "maxB": 3, "mir_hops": 1, "bounce_k": 1.0, "mir_r": 3.0, "leap": 4.2, "spd": 14.0,
		"turn": 10.0, "gen": 0, "v": Vector2.RIGHT, "split": false, "small": false, "split_n": 2, "kind": "lance", "last": hero.tp}
	M.merge(o, true)
	return M

func _launch(M: Dictionary, tgt, tk: String, bend: float) -> void:
	M["tgt"] = tgt
	M["tk"] = tk
	var p: Vector2 = tgt if tgt is Vector2 else (tgt["tp"] if tgt is Dictionary else tgt.tp)
	var a := atan2(p.y - M["tp"].y, p.x - M["tp"].x) + bend
	M["v"] = Vector2(cos(a), sin(a))

func _lance_pulse(a: Vector2) -> void:
	if aR("a_blade"):
		_spirit_sword(a)
		return
	if aU("a_blade"):
		var end := hero.tp + (a - hero.tp).limit_length(ws_lance_range())
		for i in 3:
			ground_fire(hero.tp.lerp(end, (i + 1) / 3.5), 0.55, ws_lance_dps() * 0.25, 1.5)
	var R0 := ws_lance_range()
	var first = null
	var bd := 2.2
	for m in mons():
		var dc: float = m.tp.distance_to(a)
		var dp: float = m.tp.distance_to(hero.tp)
		if dp > R0 + m.radius or dc > bd or not zone.sight_clear(hero.tp, m.tp):
			continue
		bd = dc
		first = m
	var focus := 1.0 + ws_focus_max() * minf(1.0, an_hold / 2.0)
	var M := _dart({"tp": hero.tp + Vector2(hero.face * 0.15, 0), "z": 13.0, "dmg": ws_lance_dps() * 0.42 * focus, "hops": ws_lance_pierce() + 1,
		"decay": 0.82, "maxB": 99, "mir_hops": 2, "bounce_k": 1.0, "mir_r": 3.2, "leap": 4.2, "spd": 16.0, "turn": 12.0, "kind": "lance"})
	if first != null:
		_launch(M, first, "mon", (randf() - 0.5) * 0.8)
	else:
		var d := minf(R0, a.distance_to(hero.tp))
		var dir := (a - hero.tp).normalized() if a.distance_to(hero.tp) > 0.01 else Vector2(1, 1).normalized()
		_launch(M, hero.tp + dir * maxf(d, 1.0), "pt", 0.0)
	darts.append(M)

func _dart_split(M: Dictionary, n: int, pct: float) -> void:
	var from: Vector2 = M["tp"]
	var foes: Array = mons().filter(func(m): return not M["hit"].has(m.get_instance_id()) and m.tp.distance_to(from) < 5.0 and zone.sight_clear(from, m.tp))
	foes.sort_custom(func(p, q): return p.tp.distance_to(from) < q.tp.distance_to(from))
	foes = foes.slice(0, n)
	var i := 0
	for m in foes:
		var s := _dart({"tp": from, "z": M["z"], "dmg": M["dmg"] * pct, "hops": 1, "decay": 0.8, "maxB": 1, "mir_hops": 0, "spd": M["spd"] * 1.15,
			"turn": 14.0, "gen": M["gen"] + 1, "hit": M["hit"].duplicate(), "small": true, "used": M["used"].duplicate(), "kind": M["kind"]})
		_launch(s, m, "mon", (i - (foes.size() - 1) / 2.0) * 0.9 + (randf() - 0.5) * 0.3)
		darts.append(s)
		i += 1

func _dart_fly(M: Dictionary, dt: float) -> bool:
	M["t"] += dt
	if M["t"] > 5.0:
		return true
	var T = M["tgt"]
	if M["tk"] == "mon" and (T == null or not is_instance_valid(T) or T.dead or T.buried):
		var n = _next_foe(M["tp"], M["hit"], 4.5)
		if n == null:
			return true
		M["tgt"] = n
		T = n
	if M["tk"] == "mir":
		var mt = _metal(T["key"]) if T is Dictionary else null
		if mt == null:
			var n2 = _next_foe(M["tp"], M["hit"], 5.0)
			if n2 == null:
				return true
			M["tk"] = "mon"
			M["tgt"] = n2
			T = n2
		else:
			M["tgt"] = mt
			T = mt
	if T == null:
		return true
	var tpos: Vector2 = T if T is Vector2 else (T["tp"] if T is Dictionary else T.tp)
	var tz: float = 9.0 if M["tk"] == "mon" else (T["z"] if M["tk"] == "mir" else 8.0)
	var dv: Vector2 = tpos - M["tp"]
	var l := maxf(dv.length(), 1e-6)
	var step: float = M["spd"] * dt
	var reach: float = (T.radius * 0.5 + 0.08) if M["tk"] == "mon" else 0.25
	if l <= step + reach:
		M["tp"] = tpos - dv / l * reach
		M["z"] += (tz - M["z"]) * 0.6
		return _dart_arrive(M)
	var k := 1.0 if l < 1.1 else minf(1.0, dt * M["turn"])
	M["v"] = (M["v"] + (dv / l - M["v"]) * k).normalized()
	M["tp"] += M["v"] * step
	M["z"] += (tz + sin(M["t"] * 21.0) * 1.5 - M["z"]) * minf(1.0, dt * 9.0)
	# cracked mirror-glass fissures it into more wisps
	if M["gen"] == 0 and not M["split"]:
		for c in cracks:
			if c["tp"].distance_to(M["tp"]) <= 0.45:
				M["split"] = true
				glass_burst(c["tp"], 4, 1.5, 3.0)
				_dart_split(M, M["split_n"], 0.6)
				break
	return false

func _dart_arrive(M: Dictionary) -> bool:
	if M["tk"] == "pt":
		return true
	if M["tk"] == "mon":
		var m = M["tgt"]
		var dmg: float = M["dmg"] * M["mult"]
		hurt(m, dmg, "lance", {"from": M["last"]})
		M["hit"][m.get_instance_id()] = true
		# Siphon: part of it comes back as life and Essence
		var sp := ws_siphon()
		if sp > 0.0:
			hero.st.hp = minf(hero.st.life_max(), hero.st.hp + dmg * sp)
			hero.st.res = minf(hero.st.res_max(), hero.st.res + dmg * sp)
		last_hit = m
		dart_lines.append({"a": M["last"], "za": 10.0, "b": m.tp, "zb": 9.0, "t": 0.35})
		M["last"] = m.tp
		if aU("a_sage") and int(M["gen"]) == 0 and not M.get("sage", false):
			M["sage"] = true
			_dart_split(M, 2, 0.6)
		M["hops"] -= 1
		M["mult"] *= M["decay"]
		if M["bounces"] < M["maxB"]:
			var mir = _near_mirror(m.tp, M["used"], M["mir_r"])
			if mir != null:
				M["tk"] = "mir"
				M["tgt"] = mir
				return false
		if M["hops"] > 0:
			var n = _next_foe(m.tp, M["hit"], M["leap"])
			if n != null:
				M["tgt"] = n
				return false
		return true
	# a mirror: the wisp rebounds renewed
	var o: Dictionary = M["tgt"]
	M["used"][o["key"]] = true
	M["bounces"] += 1
	M["mult"] = maxf(1.0, M["mult"]) * M["bounce_k"]
	M["hops"] += M["mir_hops"] + (1 if o["hall"] else 0)
	dart_lines.append({"a": M["last"], "za": 10.0, "b": o["tp"], "zb": o["z"], "t": 0.35})
	M["last"] = o["tp"]
	if o["cracked"] and M["gen"] == 0:
		_dart_split(M, M["split_n"], 0.6)
		glass_burst(o["tp"], 3, 1.2, o["z"])
	if K("prismL") > 0 and M["kind"] == "lance":
		_dart_split(M, ws_prism_ln(), ws_prism_lpct())
	var n3 = _next_foe(o["tp"], M["hit"], 6.5)
	if n3 == null:
		return true
	M["tk"] = "mon"
	M["tgt"] = n3
	M["v"] = (n3.tp - o["tp"]).normalized()
	return false

func _update_darts(dt: float) -> void:
	for d in darts.duplicate():
		if _dart_fly(d, dt):
			d["done"] = true
	darts = darts.filter(func(d): return not d.get("done", false))
	if darts.size() > 160:
		darts = darts.slice(darts.size() - 160)

# ------------------------------------------------------------------ the Veil's Rebuke, and Phantom Step
func _update_whips(dt: float) -> void:
	for w in whips:
		w["t"] += dt
		var k := minf(1.0, w["t"] / w["dur"])
		var pts: Array = []
		var sweep: float = w["base"] - 1.1 + 2.2 * k
		for i in 13:
			var t := i / 12.0
			var a := sweep - sin(t * PI) * 0.35 * (1.0 - k) + t * t * 0.5 * (k - 0.5)
			pts.append(hero.tp + Vector2(cos(a), sin(a)) * w["len"] * t)
		w["pts"] = pts
		for m in mons():
			var key: int = m.get_instance_id()
			if w["hit"].has(key):
				continue
			for i in pts.size() - 1:
				if seg_dist(m.tp, pts[i], pts[i + 1]) < m.radius + 0.15:
					w["hit"][key] = true
					hurt(m, w["dmg"], "rebuke")
					var away: Vector2 = (m.tp - hero.tp).normalized()
					for j in 5:
						shove(m, away * 0.22)
					m.stun = maxf(m.stun, 0.3)
					break
	whips = whips.filter(func(w): return w["t"] < w["dur"] + 0.12)

func _update_phantoms(dt: float) -> void:
	for p in phantoms:
		p["t"] -= dt
		if p["t"] <= 0.0:
			for m in mons():
				if m.tp.distance_to(p["tp"]) < 1.2 + m.radius:
					hurt(m, ws_phantom_dmg(), "phantom", {"from": p["tp"]})
			ring(p["tp"], 1.2, 0.3, 0.2)
	phantoms = phantoms.filter(func(p): return p["t"] > 0.0)

# ------------------------------------------------------------------ bodies keep their space: mirrors and the golem are cover
func _push_out() -> void:
	var obs: Array = []
	for o in mirrors:
		if o.standing():
			obs.append([o.tp, o.r])
	if golem != null and golem.state == "dormant":
		obs.append([golem.tp, golem.r])
	var bodies: Array = mons()
	for b in obs:
		var c: Vector2 = b[0]
		for m in bodies:
			if m.flying:
				continue
			var d: float = m.tp.distance_to(c)
			var mm: float = m.radius + b[1]
			if d < mm:
				shove(m, ((m.tp - c) / d if d > 0.001 else Vector2.RIGHT) * (mm - d))
		var dh: float = hero.tp.distance_to(c)
		var mh: float = hero.radius + b[1]
		if dh < mh and not wraith:
			hero.tp = zone.move(hero.tp, ((hero.tp - c) / dh if dh > 0.001 else Vector2.RIGHT) * (mh - dh), hero.radius)
	# creatures give way to the standing golem
	if golem != null and golem.state != "dormant":
		for m in bodies:
			if m.flying:
				continue
			var d2: float = m.tp.distance_to(golem.tp)
			var mm2: float = m.radius + golem.r
			if d2 < mm2 and d2 > 0.001:
				shove(m, (m.tp - golem.tp) / d2 * (mm2 - d2) * 0.6)

# ------------------------------------------------------------------ the views in the zone
func _views() -> void:
	if zone == null:
		return
	if fx_floor == null or not is_instance_valid(fx_floor):
		fx_floor = FxNode.new()
		fx_floor.book = self
		fx_floor.floor_mode = true
		zone.floor_layer.add_child(fx_floor)
	if fx_air == null or not is_instance_valid(fx_air):
		fx_air = FxNode.new()
		fx_air.book = self
		fx_air.z_index = 40
		zone.add_child(fx_air)
	for w in wisps:
		_wisp_view(w)
	if great != null:
		_wisp_view(great)
	for t in totems:
		_prop_view(t)
		for w in t.wisps:
			_wisp_view(w)
	for o in mirrors:
		_prop_view(o)
	if golem != null and (golem.node == null or not is_instance_valid(golem.node)):
		var gv := GolemView.new()
		zone.sorted.add_child(gv)
		gv.setup(golem)

func _wisp_view(w: Wisp) -> void:
	if w.node == null or not is_instance_valid(w.node):
		var v := WispView.new()
		zone.sorted.add_child(v)
		v.setup(w)

func _prop_view(o: Mirror) -> void:
	if o.node == null or not is_instance_valid(o.node):
		var v := PropView.new()
		zone.sorted.add_child(v)
		v.setup(o)

# ================================================================== the Veil, Wraith Form, weapon blows, kills
## Wraith Form: physical blows pass through untouched (core/combat.gd asks this before anything lands)
func phases(elem: String) -> bool:
	return wraith and elem == "phys"

## the Veil: Essence answers the blow first (70% -> 95% of it; 1 Essence stops 1.06 -> 2.2); the wraith takes magic x1.5
func absorb(d: float, elem: String) -> float:
	# The Anvil reversed: the worn iron takes half of every blow
	if shell > 0.0:
		var half := d * 0.5
		shell -= half
		d -= half
		if shell <= 0.0:
			shell = 0.0
			glass_burst(hero.tp, 16, 2.5, 20.0)
			say("The iron shell splits and falls away.", 1.6)
	# The Maiden's Kiss reversed: what strikes you in melee takes 60% of the blow back
	if maiden_t > 0.0 and elem == "phys":
		for m in mons():
			if m.tp.distance_to(hero.tp) < 1.8 + m.radius:
				hurt(m, d * 0.6, "cage", {"nochoir": true})
				break
	if wraith:
		if elem == "phys":
			return 0.0
		d *= 1.5
	var pct := ws_ward_pct()
	if pct > 0.0 and hero.st.res > 0.0:
		var eff := ws_ward_eff()
		var use_e := minf(hero.st.res, d * pct / eff)
		hero.st.res -= use_e
		d -= use_e * eff
		_rebuke(use_e * eff)
	return maxf(0.0, d)

func _rebuke(a: float) -> void:
	if K("rebuke") <= 0:
		return
	rebuke_acc += a
	if rebuke_acc < ws_rebuke_need():
		return
	rebuke_acc = 0.0
	var tgt = null
	var bd := 5.0
	for m in mons():
		var d: float = m.tp.distance_to(hero.tp)
		if d < bd:
			bd = d
			tgt = m
	var base: float = atan2(tgt.tp.y - hero.tp.y, tgt.tp.x - hero.tp.x) if tgt != null else randf() * TAU
	whips.append({"base": base, "t": 0.0, "dur": 0.32, "hit": {}, "dmg": ws_rebuke_dmg(), "len": 4.5})

func on_weapon_hit(m: Monster, d: float) -> void:
	last_hit = m
	end_wraith()
	# The Lantern-Bearer reversed: the lantern swung as a flail
	if aR("a_lantern") and m != null:
		for o in mons():
			if o != m and o.tp.distance_to(m.tp) < 1.3 + o.radius:
				hurt(o, d * 0.5, "totem", {"from": m.tp, "nochoir": true})
		lantern_blow += 1
		if lantern_blow % 2 == 0:
			spawn_wisp(m.tp)
	# the finishing blow gives the Mystic a wisp (zz_zz_study82.js)
	if m != null and m.finisher_lock >= 1.49:
		spawn_wisp(m.tp)

func _on_kill(m) -> void:
	if hero == null or m == null or not is_instance_valid(m) or hero.zone == null or m.zone != hero.zone:
		return
	if aU("v_unwritten"):
		hero.st.res = minf(hero.st.res_max(), hero.st.res + hero.st.res_max() * 0.05)
	if m.marked > 0.0 and m.has_meta("mys_mark") and K("markSoul") > 0:
		new_soul(m.tp, randf() * TAU, 5.0, ws_soul_dmg())
	var hv := ws_harvest()
	if hv > 0.0 and randf() < hv and wisps.size() < eff_cap():
		spawn_wisp(m.tp)
	# the Soul Lantern: each death in its light frees a wisp and mends a little
	if float(m.get_meta("mys_lantern", -1.0)) > time and not totems.is_empty() and m.tp.distance_to(totems[0].tp) < 4.5:
		if wisps.size() < eff_cap():
			spawn_wisp(m.tp)
		hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.02)
	if K("hymn") > 0:
		hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.01 * (wisps.size() / 3))
	if K("lastword") > 0:
		hero.st.res = minf(hero.st.res_max(), hero.st.res + 3.0)
	if last_hit == m:
		last_hit = null

# ================================================================== the test driver (--autocast)
func _autocast(dt: float) -> void:
	if hero.dead:
		return
	auto_t -= dt
	# go to the nearest creature the hero can see (the demo's own pick may sit behind rocks)
	var seen = Combat.nearest_monster(zone, hero.tp, 40.0, true)
	if seen != null and hold_force == "" and not auto_stand:
		hero.target = seen
	var m = Combat.nearest_monster(zone, hero.tp, 9.0, true)
	if hold_force != "":
		if m != null:
			demo_at = m.tp
		if auto_t <= 0.0:
			hold_force = ""
			demo_at = null
			auto_t = 0.4
		return
	if auto_t > 0.0 or m == null:
		return
	var ids: Array = auto_ids if not auto_ids.is_empty() else data.keys().filter(func(k): return not is_passive(k))
	ids = ids.filter(func(k): return lvl(k) > 0)
	if ids.is_empty():
		return
	auto_i = (auto_i + 1) % ids.size()
	var id: String = ids[auto_i]
	auto_t = 1.1
	if id in HOLD:
		hold_force = id
		demo_at = m.tp
		auto_t = 1.6
		return
	if id == "wraith" and wraith:
		return
	var at: Vector2 = m.tp
	if id == "golem" and golem != null:
		at = hero.tp + (m.tp - hero.tp) * 0.5
	if hero.act == "" or hero.act == "cast":
		hero.act = ""
		hero._face(at - hero.tp)
		if use(id, at, m):
			hero._start_act("cast", 0.55 / hero.st.cast_speed())
			hero.walking = false

# ================================================================== for the monster AI helper
## the nearest of the hero and the standing allies to a creature (or a point); Dazzling Challenge draws a
## challenged creature to the golem for its 3 s
static func nearest_target(z, from):
	var p: Vector2 = from.tp if (from is Node2D and "tp" in from) else from
	if from is Node2D and from.has_meta("mys_taunt_by"):
		var by = from.get_meta("mys_taunt_by")
		var until := float(from.get_meta("mys_taunt_until", 0.0))
		if is_instance_valid(by) and by.is_in_group("allies") and Time.get_ticks_msec() / 1000.0 < until:
			return by
	var best = null
	var bd := INF
	var h = z.hero_ref
	if h != null and not h.dead:
		best = h
		bd = p.distance_to(h.tp)
	for a in z.get_tree().get_nodes_in_group("allies"):
		if a.has_method("is_down") and a.is_down():
			continue
		var d: float = p.distance_to(a.tp)
		if d < bd:
			bd = d
			best = a
	return best


# ================================================================== the lantern and death (checklist 18.4, 18.5)
func on_lantern() -> void:
	while wisps.size() < eff_cap():
		spawn_wisp()
	if golem != null:
		if golem.state == "dormant":
			golem.rise()
		golem.hp = golem.max_hp
	elif not golem_mem.is_empty():
		golem_mem["frac"] = 1.0
		golem_mem["dormant"] = false

func on_death() -> void:
	for w in wisps:
		w.gone = true
		if w.node != null and is_instance_valid(w.node):
			w.node.queue_free()
	wisps.clear()
	great = null
	if golem != null:
		if golem.node != null and is_instance_valid(golem.node):
			golem.node.queue_free()
		golem.node = null
		golem = null
	golem_mem = {}
	infusing = false
	for arr in [mirrors, totems, cages, fissures, cracks, spikes, glass, gshots, rings, fires]:
		for o in arr:
			if o is Object and "gone" in o:
				o.gone = true


## the bar's gauge (ui/bar.gd): the choir's wisps as pips
func hud_gauge() -> Dictionary:
	return {"text": "WISPS %d/%d" % [wisps.size(), wisp_cap()], "pips": wisps.size(), "max": wisp_cap(), "col": Color8(191, 232, 255)}


# ================================================================== the Arcana (v103): what the Mystic's cards change
func arc():
	return hero.st.arc if hero and hero.st else null

func aU(id: String) -> bool:
	var a = arc()
	return a != null and a.aU(id)

func aR(id: String) -> bool:
	var a = arc()
	return a != null and a.aR(id)

func aM(id: String) -> bool:
	var a = arc()
	return a != null and a.aM(id)

## the hero's weapon, when a card makes it heavier (The Anvil reversed, the golem worn as a shell)
func melee_k() -> float:
	return 1.5 if shell > 0.0 else 1.0

## the hero's walk (The Maiden's Kiss reversed: the hall closed on him)
func move_k() -> float:
	return 0.8 if maiden_t > 0.0 else 1.0

func _arcana_tick(dt: float) -> void:
	# The Anvil: glass on the ground cuts what walks through it
	for s in splinters:
		s["t"] -= dt
		s["tick"] -= dt
		if s["tick"] <= 0.0:
			s["tick"] = 0.5
			for m in mons():
				if m.tp.distance_to(s["tp"]) < 0.55 + m.radius and not m.flying:
					hurt(m, ws_anvil_dmg() * 0.06, "anvil", {"from": s["tp"], "poise": 0.0})
	splinters = splinters.filter(func(s): return s["t"] > 0.0)
	maiden_t = maxf(0.0, maiden_t - dt)
	# Storm: every standing mirror sheds a splinter at the nearest creature within 5 yd each second
	if aU("a_storm"):
		storm_t -= dt
		if storm_t <= 0.0:
			storm_t = 1.0
			var n := 0
			for o in mirrors:
				if o.kind != "pane" or not o.standing() or n >= 8:
					continue
				var best = null
				var bd := 5.0
				for m in mons():
					var d: float = m.tp.distance_to(o.tp)
					if d < bd and not is_idle(m) and zone.sight_clear(o.tp, m.tp):
						bd = d
						best = m
				if best != null:
					n += 1
					var dv: Vector2 = (best.tp - o.tp).normalized()
					gshots.append({"tp": o.tp + dv * 0.3, "v": dv * 11.0, "dmg": ws_pillar_dmg() * 0.5, "t": 0.6, "hit": {}, "id": "pillars"})
	# The Choir: the whole choir dives together every 2 s
	if aU("a_choir"):
		choir_t -= dt
		if choir_t <= 0.0:
			choir_t = 2.0
			var t = null
			var bd2 := 6.0
			for m in mons():
				var d2: float = m.tp.distance_to(hero.tp)
				if d2 < bd2 and _wisp_allowed(m) and not is_idle(m):
					bd2 = d2
					t = m
			if t != null:
				for w in wisps:
					if w.state == "drift":
						w.state = "dive"
						w.target = t
	# The Aether-Sage reversed: the draining thread
	for d3 in drains:
		d3["t"] -= dt
		d3["tick"] -= dt
		var m3 = d3["m"]
		if not is_instance_valid(m3) or m3.dead or m3.tp.distance_to(hero.tp) > 7.5:
			d3["t"] = 0.0
			continue
		if d3["tick"] <= 0.0:
			d3["tick"] = 0.25
			var got := hurt(m3, ws_soul_dmg() * 0.35, "swarm", {"from": hero.tp})
			hero.st.hp = minf(hero.st.life_max(), hero.st.hp + got)
	drains = drains.filter(func(d4): return d4["t"] > 0.0)
	# Pyre reversed: the wraith leaves pale fire where it walks
	if aR("a_pyre") and wraith and hero.walking:
		pyre_t -= dt
		if pyre_t <= 0.0:
			pyre_t = 0.3
			ground_fire(hero.tp, 0.6, ws_soul_dmg() * 0.8, 2.5)
	# Silver Tether: near the golem it mends
	if aM("w_tether") and golem != null and golem.state != "dormant" and golem.tp.distance_to(hero.tp) < 3.0:
		golem.hp = minf(golem.max_hp, golem.hp + golem.max_hp * 0.02 * dt)
	# The Choir Crown: upright, wisps come back and drain; reversed, they mend
	if aM("v_crown"):
		var k := 0.003 * wisps.size() * hero.st.life_max() * dt
		if aU("v_crown"):
			hero.st.hp = maxf(1.0, hero.st.hp - k)
		else:
			hero.st.hp = minf(hero.st.life_max(), hero.st.hp + k)
	if not crown_q.is_empty():
		var keep: Array = []
		for tq in crown_q:
			if time >= tq:
				spawn_wisp()
			else:
				keep.append(tq)
		crown_q = keep
	# The Bell-Warden reversed: nothing near casts or shoots (entities/missile.gd hush)
	if aR("a_bell"):
		Missile.hush = {"tp": hero.tp, "r": 5.0, "until": Time.get_ticks_msec() / 1000.0 + 0.2}

## a wisp lost or spent: the Crown may call it back
func _wisp_lost() -> void:
	if aU("v_crown") and hero.st.hp > hero.st.life_max() * 0.5:
		crown_q.append(time + 3.0)


## The Anvil: a ring of glass splinters on the ground (cut what walks through; drawn as cracked glass)
func _splinter_ring(c: Vector2, R: float, n: int) -> void:
	for i in n:
		var ang := float(i) / n * TAU + randf() * 0.4
		var p := c + Vector2(cos(ang), sin(ang)) * R * randf_range(0.4, 1.0)
		if zone.is_solid(p):
			continue
		splinters.append({"tp": p, "t": 4.0, "tick": 0.0})
		cracks.append({"tp": p, "t": 4.0, "max": 4.0, "v": randi()})
	while splinters.size() > 40:
		splinters.pop_front()

## The Hollow Blade reversed: Needle and Thread swung as a spirit sword in wide arcs (melee: it costs poise)
func _spirit_sword(a: Vector2) -> void:
	var dir := (a - hero.tp).normalized() if a.distance_to(hero.tp) > 0.01 else Vector2(1, 1).normalized()
	hero.spend_poise(4.0)
	hero._start_act("atk", 0.3)
	for m in mons():
		var dv: Vector2 = m.tp - hero.tp
		if dv.length() > 2.1 + m.radius:
			continue
		if dv.length() > 0.2 and dv.normalized().dot(dir) < 0.35:
			continue
		hurt(m, ws_lance_dps() * 0.55, "lance", {"from": hero.tp, "poise": ws_lance_dps() * 0.4})
