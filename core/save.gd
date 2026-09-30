extends RefCounted
## The save (checklist 12): one slot per machine, `user://godmarrow.save`, written with store_var (types kept: int keys,
## Vector2s). Saved: order, level, xp, attributes, points, skill points and binds, the order's own choices (golem orders,
## weapon), gold, pack, equipment, belt, Hollow Tokens, what the lantern keeps, the errands and waystones and lanterns,
## the return point. Not saved: the map (every start rolls a new world), creatures, things on the ground.
## Continue loads it into a freshly rolled world at the Ashen Moor camp. Load by path: load("res://core/save.gd").

const FILE := "user://godmarrow.save"
const VERSION := 1

static func exists() -> bool:
	return FileAccess.file_exists(FILE)

static func write(main: Node) -> bool:
	var hero = main.hero
	if hero == null or hero.st == null:
		return false
	var st: HeroStats = hero.st
	var inv: Inventory = st.inv
	var bag := []
	for e in inv.bag:
		bag.append({"item": e["item"].to_dict(), "pos": e["pos"]})
	var equip := {}
	for slot in inv.equip:
		if inv.equip[slot] != null:
			equip[slot] = inv.equip[slot].to_dict()
	var sk = hero.skills
	var own := {}
	for k in ["gbeh", "gweapon", "wbeh"]:
		if sk != null and k in sk:
			own[k] = sk.get(k)
	var d := {
		"v": VERSION, "time": Time.get_unix_time_from_system(),
		"cls": st.cls, "level": st.level, "xp": st.xp, "vit": st.vit, "ess": st.ess, "con": st.con,
		"attr_points": st.attr_points, "skill_points": st.skill_points, "hollow_tokens": st.hollow_tokens,
		"arcana_points": st.arcana_points, "kept": st.kept, "dim_wick": st.dim_wick,
		"gold": inv.gold, "bag": bag, "equip": equip, "belt": inv.belt.duplicate(true),
		"hard": sk.hard.duplicate() if sk else {}, "left": sk.left if sk else "attack", "right": sk.right if sk else "attack",
		"keys": sk.keys.duplicate() if sk else {}, "own": own,
		"quests": load("res://world/quests.gd").to_dict(),
		"arc": st.arc.to_dict() if st.arc != null else {},
		"last_lantern": main.last_lantern.duplicate(), "remnant": main.remnant.duplicate(),
		"clock": Game.clock,
	}
	var f := FileAccess.open(FILE, FileAccess.WRITE)
	if f == null:
		return false
	f.store_var(d)
	return true

static func read() -> Dictionary:
	if not exists():
		return {}
	var f := FileAccess.open(FILE, FileAccess.READ)
	if f == null:
		return {}
	var d = f.get_var()
	return d if d is Dictionary and int(d.get("v", 0)) >= 1 else {}

## pour a save into a hero that has just been set up (its stats and book already made)
static func apply(main: Node, d: Dictionary) -> void:
	var hero = main.hero
	var st: HeroStats = hero.st
	for k in ["level", "xp", "vit", "ess", "con", "attr_points", "skill_points", "hollow_tokens", "arcana_points", "kept", "dim_wick"]:
		if d.has(k):
			st.set(k, d[k])
	var inv: Inventory = st.inv
	inv.bag.clear()
	for e in d.get("bag", []):
		inv.bag.append({"item": Item.from_dict(e["item"]), "pos": e["pos"]})
	inv.equip.clear()
	for slot in d.get("equip", {}):
		inv.equip[slot] = Item.from_dict(d["equip"][slot])
	var b: Array = d.get("belt", [])
	for i in 4:
		inv.belt[i] = b[i] if i < b.size() else null
	inv.gold = int(d.get("gold", 0))
	var sk = hero.skills
	if sk:
		sk.hard = d.get("hard", {}).duplicate()
		sk.left = d.get("left", sk.left)
		sk.right = d.get("right", sk.right)
		if not d.get("keys", {}).is_empty():
			sk.keys = d["keys"].duplicate()
		var own: Dictionary = d.get("own", {})
		for k in own:
			if k in sk:
				sk.set(k, own[k])
	if st.arc != null and d.has("arc"):
		st.arc.from_dict(d["arc"])
	var Q = load("res://world/quests.gd")
	Q.from_dict(d.get("quests", {}))
	# the errands' lasting gifts live in the errand store; lay them back on the pilgrim
	var qs: Dictionary = Q.state()
	qs["buffs"] = {}   # shrine blessings do not outlive the world they were given in
	if int(qs.get("life", 0)) != 0:
		st.extra["life"] = float(qs["life"])
	if int(qs.get("res", 0)) != 0:
		for el in Q.ELEMS:
			st.extra["res_" + el] = float(qs["res"])
	# the return point and the remnant belonged to the old world's maps: a new world starts at the camp
	Game.clock = float(d.get("clock", Game.clock))
	st.hp = st.life_max()
	st.res = st.res_max()
	st.poise = st.poise_max()
	inv.changed.emit()
	hero.stats_changed.emit()
