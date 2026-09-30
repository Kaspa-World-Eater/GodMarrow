extends RefCounted
## core/test_hooks.gd: the test and capture hooks (user args after --), kept out of the game scene.
## core/main.gd calls TestHooks.run(main) once the first zone is entered. Nothing here runs in normal play.
##   --lvl=N [--arcana=N]     start at that level (with that many Major points)
##   --cards=u|r              hold every card of the order, upright or reversed
##   --arena=N                balance: N tireless, harmless creatures round the pilgrim; after --arena_t seconds
##                            (default 20) print the HERO line and what each skill dealt (BAL), then quit.
##     --arena_kind=K --arena_lvl=N --arena_rank=normal|champion   what stands in the ring
##     --arena_live           real, hostile creatures instead (a fight test; FELL lines name the killer)
##     --sigils               the Ossuarch's count sigils over them, counting up on their own
##   --boardtest              lay a road to the right hand of the body board and take three cards
##   --panel=ID               open a panel (skills, inv, char, board, journal, choir, golem) or a town window
##   --demo [--trace]         the pilgrim fights the nearest creatures, for captures

const PANELS := ["choir", "golem", "char", "skills", "inv", "journal", "board"]
const SIGIL_KINDS := ["open", "fewer", "weigh", "stair"]

static func run(g) -> void:
	var a: Dictionary = g.args
	if a.has("demo"):
		_demo(g)
	if a.has("panel"):
		await g.get_tree().create_timer(1.0).timeout
	if a.has("lvl"):
		g.hero.st.level = int(a["lvl"])
		g.hero.st.arcana_points = int(a.get("arcana", "3"))
	if a.has("cards") and g.hero.st.arc:
		var arc = g.hero.st.arc
		for id in arc.N:
			if arc.is_card(id):
				arc.cards[id] = a["cards"]
		arc._changed()
	if a.has("arena"):
		await _arena(g, a)
	if a.has("boardtest") and g.hero.st.arc:
		var arc = g.hero.st.arc
		for l in arc.N["i_quake"]["links"]:
			if arc.is_knot(l):
				arc.lay(l)
		g.hero.st.arcana_points = 6
		for c in ["i_quake", "i_rust", "a_anvil"]:
			arc.take_card(c, "u")
	if a.has("panel"):
		if a["panel"] in PANELS:
			g.hud.toggle_panel(a["panel"])
		else:
			Bus.panel_requested.emit(a["panel"], "Maren the Gravekeeper" if a["panel"] == "vendor" else "Brannoc of the Nail")

## the balance arena: a ring of creatures, every order's skills logging what they dealt
static func _arena(g, a: Dictionary) -> void:
	var hero = g.hero   # the pilgrim at the start (after a fall, g.hero is the one who returned)
	var tree: SceneTree = g.get_tree()
	for m in tree.get_nodes_in_group("monsters"):
		m.queue_free()
	await tree.process_frame
	var n := int(a["arena"])
	var live := a.has("arena_live")
	for i in n:
		var ang := float(i) / n * TAU
		var at: Vector2 = hero.tp + Vector2(cos(ang), sin(ang)) * (3.0 + (i % 3))
		var m = Brain.spawn(g.zone, a.get("arena_kind", "husk"), at, int(a.get("arena_lvl", "12")), String(a.get("arena_rank", "normal")), "arena", -1.0 if live else 1e7)
		if m and live:
			m.brain.wake(m)
		elif m:
			m.dmg = Vector2.ZERO
			m.speed = 0.0
	hero.st.hp = hero.st.life_max()
	if a.has("sigils"):
		var j := 0
		for m in tree.get_nodes_in_group("monsters"):
			CountSigil.on(m, SIGIL_KINDS[j % 4]).set_meta("demo", j * 2)
			j += 1
	var book = hero.skills
	if "auto_stand" in book:
		book.auto_stand = true
	book.trace = true
	book.dmg_log.clear()
	hero.target = null
	var T := float(a.get("arena_t", "20"))
	var tally := {"falls": 0, "lost": 0.0, "kills": 0}
	Bus.hero_died.connect(func():
		tally["falls"] += 1
		print("FELL slain by ", g.hero.last_blow))
	Bus.hero_hit.connect(func(v): tally["lost"] += float(v))
	Bus.monster_killed.connect(func(_m): tally["kills"] += 1)
	await tree.create_timer(T).timeout
	hero = g.hero   # a fall and return makes a new pilgrim
	var dl: Dictionary = hero.skills.dmg_log
	var tot := 0.0
	for k in dl:
		if k != "_spent":
			tot += float(dl[k])
	var left: int = tree.get_nodes_in_group("monsters").filter(func(x): return not x.dead).size()
	print("HERO %s lvl %d life %.0f armor %.0f res %.0f poise %.0f | now hp %.0f dead %s | creatures left %d | falls %d, life lost %.0f, kills %d" % [hero.cls, hero.st.level, hero.st.life_max(), hero.st.armor(), hero.st.res_max(), hero.st.poise_max(), hero.st.hp, str(hero.dead), left, tally["falls"], tally["lost"], tally["kills"]])
	var spent := float(dl.get("_spent", 0.0))
	print("BAL %s dps %.1f spent %.0f per_ess %.2f parts %s" % [a.get("autocast", "-"), tot / T, spent, tot / maxf(1.0, spent), str(dl)])
	tree.quit()

## --demo: fight the nearest creatures, for captures (--trace prints the state every 1.5 s)
static func _demo(g) -> void:
	for i in 300:
		await g.get_tree().create_timer(0.3).timeout
		var hero = g.hero
		if hero == null or hero.dead:
			continue
		var m := Combat.nearest_monster(g.zone, hero.tp, 40.0)
		if m:
			hero.target = m
		if g.args.has("trace") and i % 5 == 0:
			print("T ", i, " hero ", hero.tp, " act ", hero.act, " walk ", hero.walking, " path ", hero.path.size(), " tgt ", (m.kind + " " + str(m.tp)) if m else "none", " hp ", hero.st.hp, " mons ", g.get_tree().get_nodes_in_group("monsters").size(), " thp ", (m.hp if m else -1.0), " missiles ", g.zone.sorted.get_children().filter(func(c): return c is Missile).size())
