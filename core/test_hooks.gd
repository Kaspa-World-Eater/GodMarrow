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
##   --fx=NAME[,NAME]         PixelForge effects (art/fx/<NAME>.json) playing at the pilgrim, for a look (the Forge's "Preview in game")
##   --attach                 spawn the effects the Forge's effects editor attached to the pilgrim's sprite set
##   --place=NAME[,NAME]      the Forge's objects (art/objects/objects.json) stood beside the pilgrim for a look, nothing saved
##   --shot=PATH [--shot_t=S] [--shot_n=N]   save the screen to PATH after S seconds (default 4), N frames 0.25 s apart
##                            (PATH_1.png ...), then quit. Needs a window (not --headless). --hour=0..1 sets the hour.
##   --show=collision         draw what blocks a body: solid tiles (red diamonds) and posts (yellow rings)
##   --hide=dark,atmos,sky    switch those overlays off (the dark and light map, the air, the weather),
##                            to judge a sprite or an effect in its plain paint

const PANELS := ["choir", "golem", "char", "skills", "inv", "journal", "board"]
const SIGIL_KINDS := ["open", "fewer", "weigh", "stair"]

static func run(g) -> void:
	var a: Dictionary = g.args
	if a.has("menutest"):
		await _menutest(g, a)
	if a.has("demo"):
		_demo(g)
	if a.has("panel"):
		await g.get_tree().create_timer(1.0).timeout
	if a.has("hide"):
		for n in String(a["hide"]).split(","):
			var layer = g.get(n.strip_edges())
			if layer is CanvasLayer:
				layer.visible = false
	if a.has("nolm") and g.dark != null:   # the dark without its light map (the web's older look), for lighting checks
		g.dark.mat.set_shader_parameter("lm_on", false)
	if a.has("darkflat") and g.dark != null:   # the dark as a plain veil, no shader: tells a shader fault from a draw-order one
		g.dark.rect.material = null
		g.dark.rect.color = Color(0, 0, 0, 0.35)
	if a.has("nolamp") and g.hero != null and g.hero.lamp != null:
		g.hero.lamp.enabled = false
	if a.has("fx") or a.has("attach"):
		_forge_preview(g, a)
	if a.has("place"):
		_forge_place(g, a)
	if a.has("lvl"):
		g.hero.st.level = int(a["lvl"])
		g.hero.st.arcana_points = int(a.get("arcana", "3"))
	if a.has("cards") and g.hero.st.arc:
		var arc = g.hero.st.arc
		for id in arc.N:
			if arc.is_card(id):
				arc.cards[id] = a["cards"]
		arc._changed()
	if a.has("wisps") and g.hero.skills.has_method("spawn_wisp"):
		for i in int(a["wisps"]):
			g.hero.skills.spawn_wisp()
	if a.has("near"):
		_near(g, String(a["near"]))      # --near=log|rootplate|stump|snag|tree|rock: stand beside the nearest landkit piece
	if a.get("show", "") == "collision":
		_show_collision(g)
	if a.has("shot"):
		_shot(g, a)
	if a.has("groundfire"):
		_ground_fires(g)                 # --groundfire: three fires set burning near the pilgrim (to see them spread)
	if a.has("icefx"):
		_icefx(g)                        # --icefx: a frost nova, freezing mist and ice shards round the pilgrim
	if a.has("zap"):
		_zap(g)                          # --zap: ball lightning, charged ground and spark novas round the pilgrim
	if a.has("bonefx"):
		_bonefx(g)                       # --bonefx: bone spears, bone rain and a rib cage round the pilgrim
	if a.has("acidfx"):
		_acidfx(g)                       # --acidfx: acid globs, drips and corroding creatures
	if a.has("bloodfx"):
		_bloodfx(g)                      # --bloodfx: blood whips, sprays, boiling blood and veined creatures
	if a.has("threadfx"):
		_threadfx(g)                     # --threadfx (Mystic): soul leashes, a binding, snags, needles and hanging darts
	if a.has("slashfx"):
		_slashfx(g)                      # --slashfx: each kind of slash in turn (sweep, back-sweep, overhead, heavy) and cuts
	if a.has("miasmafx"):
		_miasmafx(g)                     # --miasmafx: a gyre, swelling bladders, breathing vents and stained creatures
	if a.has("radfx"):
		_radfx(g)                        # --radfx: radiance: the glare, lances, a turning halo, gold leaf, erased creatures
	if a.has("voidfx"):
		_voidfx(g)                       # --voidfx: absence: a hush, black sand, a gate, a pinch, creatures unmade
	if a.has("meleefx"):
		_meleefx(g)                      # --meleefx: the pilgrim's string and a charged heavy on creatures at sword's length
	if a.has("lakefx"):
		_lakefx(g)                       # --lakefx: a painted water lake and a blood lake, creatures wading through
	if a.has("meadowfx"):
		_meadowfx(g)                     # --meadowfx: painted meadows (green, dead, ash) swaying, creatures wading through
	if a.has("snowfx"):
		_snowfx(g)                       # --snowfx: a painted snowfield, spindrift, creatures leaving footprints
	if a.has("magic"):
		_magic(g)                        # --magic: phosphor wisps flung at points round the pilgrim
	if a.has("acid"):
		_acid(g)                         # --acid: acid pools beside the pilgrim
	if a.has("bolt"):
		_bolt(g)                         # --bolt: lightning beside the pilgrim every two seconds
	if a.has("blaze"):
		_blaze(g)                        # --blaze: radiant blazes beside the pilgrim, one after another
	if a.has("wildfire"):
		_wildfire(g)                     # --wildfire: grass set alight beside the pilgrim, to watch the front run
	if a.has("burn"):
		_burn_test(g, String(a.get("burn", "hollow")))   # --burn[=KIND]: three creatures beside the pilgrim die by fire
	if a.has("impacts"):
		_impacts(g)                      # --impacts: blows landing beside the pilgrim (world/impacts.gd), to see them
	if a.has("weather"):
		# --weather: a spell of weather at its height now (ash on the moor, a shower in the fen)
		var Wt = load("res://world/weather.gd")
		Wt.spell_on = true
		Wt.spell_age = 20.0
		Wt.spell_len = 120.0
		Wt.spell_peak = 0.6
	if a.has("swing"):
		_swing_loop(g)                   # --swing: the pilgrim swings at the air to the east every 0.7 s (to film blows)
	if a.has("auto_attack"):
		Settings.auto_attack = true      # --auto_attack: the pilgrim turns on what comes near (to film blows)
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

## what blocks: a node in the zone's ground layer, redrawn as the camera moves
## --near=KIND [--near_n=N] [--near_off=X,Y]: the pilgrim stands beside the Nth nearest landkit piece of that kind
## (world/landkit.gd), for a look at it in the game
static func _near(g, kind: String) -> void:
	var hero = g.hero
	var found: Array = []
	for c in g.zone.sorted.get_children():
		if c.has_meta("landkit") and String(c.get_meta("landkit")).begins_with(kind):
			found.append(c)
	if found.is_empty():
		print("NEAR none ", kind)
		return
	found.sort_custom(func(p, q): return p.position.distance_to(hero.position) < q.position.distance_to(hero.position))
	var c: Node2D = found[mini(int(g.args.get("near_n", "0")), found.size() - 1)]
	var off := Vector2(1.5, 2.5)
	if g.args.has("near_off"):
		var v := String(g.args["near_off"]).split(",")
		off = Vector2(float(v[0]), float(v[1]))
	# the holder sits at (screen x, depth * HY); its tile from the screen x and the depth
	var dep: float = c.position.y / Iso.HY
	var dx: float = c.position.x / Iso.HX
	var tp := Vector2((dep + dx) * 0.5, (dep - dx) * 0.5) + off
	var free := tp
	for ring in range(0, 12):                  # the nearest open ground (not water, not inside a post)
		var got := false
		for k in maxi(1, ring * 8):
			var q := tp + Vector2.from_angle(TAU * k / maxf(1.0, ring * 8.0)) * ring * 0.5
			if g.zone.room_at(q, 0.35):
				free = q
				got = true
				break
		if got:
			break
	tp = free
	hero.tp = tp
	hero.target = null
	hero.walking = false
	hero._sync()
	g.eye.cut(hero)
	g.cam.position = g.eye.update(0.016, hero, null, g.zone)
	g.cam.reset_smoothing()
	print("NEAR ", kind, " ", c.get_meta("landkit"), " at ", tp)

static func _show_collision(g) -> void:
	var z: Zone = g.zone
	var n := Node2D.new()
	n.z_index = 4000
	n.z_as_relative = false
	z.add_child(n)
	n.draw.connect(func():
		var c: Vector2 = g.hero.tp
		for y in range(int(c.y) - 14, int(c.y) + 15):
			for x in range(int(c.x) - 14, int(c.x) + 15):
				if z.is_solid(Vector2(x + 0.5, y + 0.5)):
					var pts := PackedVector2Array([Iso.to_screen(Vector2(x, y)), Iso.to_screen(Vector2(x + 1, y)), Iso.to_screen(Vector2(x + 1, y + 1)), Iso.to_screen(Vector2(x, y + 1)), Iso.to_screen(Vector2(x, y))])
					n.draw_polyline(pts, Color(1, 0.2, 0.2, 0.8), 2.0)
		for k in z.posts:
			if (Vector2(k) - c).length() > 16.0:
				continue
			for po in z.posts[k]:
				var ring := PackedVector2Array()
				for i in 25:
					var a2 := TAU * i / 24.0
					ring.append(Iso.to_screen((po[0] as Vector2) + Vector2(cos(a2), sin(a2)) * float(po[1])))
				n.draw_polyline(ring, Color(1, 0.9, 0.2, 0.95), 2.0)
		var hr := PackedVector2Array()
		for i in 25:
			var a3 := TAU * i / 24.0
			hr.append(Iso.to_screen(c + Vector2(cos(a3), sin(a3)) * float(g.hero.radius)))
		n.draw_polyline(hr, Color(0.3, 1, 0.5, 0.95), 2.0))
	g.get_tree().process_frame.connect(func(): if is_instance_valid(n): n.queue_redraw())

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
		var m = Brain.spawn(g.zone, a.get("arena_kind", "hollow"), at, int(a.get("arena_lvl", "12")), String(a.get("arena_rank", "normal")), "arena", -1.0 if live else 1e7)
		if m and live:
			m.brain.wake(m)
		elif m:
			m.dmg = Vector2.ZERO
			m.hp = 1e6
			m.hp_max = 1e6
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


## --menutest=pause|title[=row]: clicks a menu row the way a mouse does (window pixels through Input), prints MENU lines
static func _click_at(g, w: Vector2) -> void:
	var m := InputEventMouseMotion.new()
	m.position = w
	m.global_position = w
	Input.parse_input_event(m)
	await g.get_tree().process_frame
	for down in [true, false]:
		var e := InputEventMouseButton.new()
		e.position = w
		e.global_position = w
		e.button_index = MOUSE_BUTTON_LEFT
		e.pressed = down
		Input.parse_input_event(e)
		await g.get_tree().process_frame

static func _menutest(g, a: Dictionary) -> void:
	await g.get_tree().create_timer(2.0).timeout
	var what: String = a["menutest"]
	print("MENU window ", DisplayServer.window_get_size(), " viewport ", g.get_viewport().get_visible_rect().size)
	if what == "quitdirect":
		print("MENU calling _act(quit) directly")
		g.hud.pause.open()
		g.hud.pause._act("quit", false)
		await g.get_tree().create_timer(2.0).timeout
		print("MENU STILL RUNNING after direct quit")
		return
	if what == "pause":
		g.hud.pause.open()
		await g.get_tree().create_timer(0.5).timeout
		var P = g.hud.pause
		P._build()
		for i in P.rows.size():
			if P.rows[i][1] == "quit":
				var w: Vector2 = g.get_viewport().get_screen_transform() * P.get_global_transform_with_canvas() * P._row_rect(i).get_center()
				print("MENU clicking Save and quit at ", w)
				var mm := InputEventMouseMotion.new()
				mm.position = w
				Input.parse_input_event(mm)
				await g.get_tree().process_frame
				await g.get_tree().process_frame
				var hc = g.get_viewport().gui_get_hovered_control()
				print("MENU hovered control: ", hc, " ", hc.get_path() if hc else "", " filter ", hc.mouse_filter if hc else -1, " pause visible ", P.visible, " pause path ", P.get_path(), " rect ", P.get_global_rect(), " parent ", P.get_parent().get_global_rect(), " pfilter ", P.get_parent().mouse_filter, " layer vis ", P.get_parent().get_parent().visible, " row ", P._row_rect(0))
				await _click_at(g, w)
		await g.get_tree().create_timer(2.0).timeout
		print("MENU STILL RUNNING after Save and quit")
	elif what.begins_with("title"):
		var T = null
		for c in g.get_children():
			if c.get_script() and str(c.get_script().resource_path).ends_with("ui/title.gd"):
				T = c
		if T == null:
			print("MENU no title")
			return
		await g.get_tree().create_timer(3.0).timeout
		print("MENU title rows ", T.rows.map(func(r): return r[1] if r.size() > 1 else r))
		var k := int(a.get("row", "0"))
		var w2: Vector2 = g.get_viewport().get_screen_transform() * T.root.get_global_transform_with_canvas() * T._row_rect(k).get_center()
		print("MENU clicking row ", k, " at ", w2, " mode ", T.mode)
		await _click_at(g, w2)
		await g.get_tree().create_timer(1.5).timeout
		print("MENU after click: mode ", T.mode if is_instance_valid(T) else "(title gone)", " leaving ", T.leaving if is_instance_valid(T) else -1.0)

## the screen, saved (--shot): for side-by-side checks against the browser build
static func _shot(g, a: Dictionary) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(float(a.get("shot_t", "4"))).timeout
	var n := int(a.get("shot_n", "1"))
	var path := String(a["shot"])
	for i in n:
		await RenderingServer.frame_post_draw
		var p := path if n == 1 else path.get_basename() + "_%d.png" % i
		g.get_viewport().get_texture().get_image().save_png(p)
		if i < n - 1:
			await tree.create_timer(float(a.get("shot_dt", "0.25"))).timeout
	tree.quit()

## PixelForge's "See it in the game" for an object (--place=a,b): each stands a few tiles from the pilgrim, drawn
## the way the world draws its painted objects (world/objects/manager_build.gd), a swaying one through the addon
static func _forge_place(g, a: Dictionary) -> void:
	var manifest := "res://art/objects/objects.json"
	var meta: Dictionary = PFObjects.manifest(manifest)
	var mgr = g.zone.get_node_or_null("WorldObjects")
	var i := 0
	for name in String(a["place"]).split(","):
		name = name.strip_edges()
		if name == "":
			continue
		var e: Dictionary = meta.get(name, {})
		if e.is_empty():
			print("FORGE object missing: ", name)
			continue
		var tp: Vector2 = g.hero.tp + Vector2(2.0 + 1.5 * float(i % 3), -1.0 + 1.5 * floorf(float(i) / 3.0))
		if int(e.get("frames", 1)) <= 1 and mgr != null and mgr.has_method("_art_node"):
			mgr._art_node(name, tp)
		else:
			PFObjects.place(g.zone.sorted, manifest, name, Iso.to_screen(tp), Iso.WPX)
		print("FORGE placed: ", name, " at ", tp)
		i += 1

## a look at an effect (--fx): a looping one plays on; a one-shot (a nova, a burst) plays again every 1.5 s for
## twenty seconds, so it is on screen for a --shot and for a person's glance, not gone in a blink
static func _forge_fx_look(g, fx_dir: String, names: PackedStringArray) -> void:
	var again: Array = []
	for name in names:
		if name == "":
			continue
		var sp = PFFx.spawn(g.hero, fx_dir, name, Vector2(0, -60), 1.0, 2)
		if sp == null:
			print("FORGE fx missing: ", name)
		elif not sp.sprite_frames.get_animation_loop("play"):
			again.append(name)
	for i in 13:
		if again.is_empty():
			return
		await g.get_tree().create_timer(1.5).timeout
		if g.hero == null or not is_instance_valid(g.hero):
			return
		for name in again:
			PFFx.spawn(g.hero, fx_dir, name, Vector2(0, -60), 1.0, 2)

static func _forge_preview(g, a: Dictionary) -> void:
	## PixelForge's "Preview in game": effects at the pilgrim (--fx=a,b) and the sprite set's attached effects (--attach).
	var fx_dir := "res://art/fx"
	if a.has("fx"):
		_forge_fx_look(g, fx_dir, String(a["fx"]).split(","))
	if a.has("attach"):
		var kind := String(a.get("skin", g.hero.cls))
		var set := PFSpriteSet.new()
		if set.load_file("res://art/sprites/%s.json" % kind):
			var nodes := PFFx.spawn_attachments(g.hero, set.fx_dir(fx_dir), set, "down", 1.0, 2)
			g.hero.set_meta("forge_attachments", nodes)
			print("FORGE attachments: ", nodes.size())


static func _swing_loop(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(2.0).timeout
	while is_instance_valid(g) and g.hero and not g.hero.dead:
		if g.hero.act == "":
			var m = Combat.nearest_monster(g.zone, g.hero.tp, 2.6)
			if m:
				g.hero._start_attack(m, m.tp)
			else:
				g.hero._start_attack(null, g.hero.tp + Vector2(1.0, -1.0))
		await tree.create_timer(0.7).timeout


static func _ground_fires(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.5).timeout
	var AW = load("res://entities/ai/ai_world.gd")
	var w = AW.of(g.zone)
	var c: Vector2 = g.hero.tp
	for o in [Vector2(2.2, 0.6), Vector2(1.0, 2.4), Vector2(3.0, 2.2)]:
		w.fire(c + o, 1.3, 0.0, 30.0)
		await tree.create_timer(0.5).timeout


static func _impacts(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.5).timeout
	var I = load("res://world/impacts.gd")
	var i := 0
	while is_instance_valid(g) and g.hero:
		I.of(g.zone).hit(g.hero.tp + Vector2(1.4, 0.4), g.hero.tp, i % 2 == 1, "bone" if i % 3 == 0 else "flesh")
		i += 1
		await tree.create_timer(0.45).timeout


static func _burn_test(g, kind: String) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	if kind == "" or kind == "1":
		kind = "hollow"
	var bleed := kind.begins_with("bleed")
	if bleed:
		kind = "hollow"
	var forced := ""                             # --burn=bone:hound picks the creature
	if kind.contains(":"):
		forced = kind.split(":")[1]
		kind = kind.split(":")[0]
	var bone := kind.begins_with("bone")
	var ice := kind.begins_with("ice")
	var zap := kind.begins_with("chain")
	var rot := kind.begins_with("rot")
	var gut := kind.begins_with("gut")
	if gut:
		kind = "hollow"
	if bone or ice or zap or rot:
		kind = "knight"
	if forced != "":
		kind = forced
	var c: Vector2 = g.hero.tp
	if rot:
		load("res://world/impacts.gd").of(g.zone).miasma(c + Vector2(0.8, 1.8), 2.6, 30.0, "breath")
	var ms: Array = []
	for o in [Vector2(2.0, 0.4), Vector2(0.6, 2.2), Vector2(2.6, 2.0)]:
		var m = Brain.spawn(g.zone, kind, c + o, 6, "normal", "burn", -1.0)
		if m:
			m.speed = 0.0
			ms.append(m)
	await tree.create_timer(0.6).timeout
	if zap:
		var I2 = load("res://world/impacts.gd").of(g.zone)
		for k in 4:
			I2.chain(c, ms)
			for m in ms:
				if is_instance_valid(m) and not m.dead:
					Combat.hit_monster(m, 1.0, "ltng", c, {})
			await tree.create_timer(0.6).timeout
	if ice:
		load("res://world/impacts.gd").of(g.zone).frost(c + Vector2(1.6, 1.2), 2.4, 12.0)
		for k in 6:
			for m in ms:
				if is_instance_valid(m) and not m.dead:
					Combat.hit_monster(m, 1.0, "cold", c, {})
			await tree.create_timer(0.4).timeout
	if bone:
		# bone blows grow the crust over a few seconds, then the last one kills
		for k in 8:
			for m in ms:
				if is_instance_valid(m) and not m.dead:
					Combat.hit_monster(m, 1.0, "phys", c, {"bone": true})
			await tree.create_timer(0.45).timeout
	for m in ms:
		if is_instance_valid(m) and not m.dead:
			Combat.hit_monster(m, 9999.0, "blood" if gut else "miasma" if rot else "cold" if ice else ("ltng" if zap else ("phys" if (bleed or bone) else "fire")), c, {"bone": bone})
		await tree.create_timer(0.35).timeout


static func _wildfire(g) -> void:
	await g.get_tree().create_timer(1.2).timeout
	var w = load("res://entities/ai/ai_world.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	for r in range(2, 8):
		for o in [Vector2(r, 0), Vector2(0, r), Vector2(-r, 0), Vector2(0, -r), Vector2(r, r)]:
			if w.BURNS.has(g.zone.type_at(c + o)):
				w.wildfire(c + o, 70, 0.0)
				return


static func _blaze(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	while is_instance_valid(g) and g.hero:
		I.blaze(g.hero.tp + Vector2(2.2, 0.8), 3.0, 1.0)
		await tree.create_timer(3.6).timeout


static func _bolt(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var i := 0
	while is_instance_valid(g) and g.hero:
		I.lightning(g.hero.tp + Vector2(2.0 + (i % 3) * 0.8, 0.6 + (i % 2)))
		i += 1
		await tree.create_timer(2.0).timeout


static func _acid(g) -> void:
	await g.get_tree().create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	I.acid(g.hero.tp + Vector2(2.0, 0.8), 1.4, 20.0)
	await g.get_tree().create_timer(0.6).timeout
	I.acid(g.hero.tp + Vector2(0.4, 2.6), 0.9, 20.0)


static func _magic(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var i := 0
	while is_instance_valid(g) and g.hero:
		for k in 3:
			I.phosphor(g.hero.tp, g.hero.tp + Vector2(2.5 + k * 0.6, 1.5 - k * 1.2 + (i % 2)))
		i += 1
		await tree.create_timer(1.1).timeout


static func _icefx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	I.cold_mist(c + Vector2(-1.5, 2.0), 2.2, 20.0)
	while is_instance_valid(g) and g.hero:
		I.frost_nova(c + Vector2(2.5, 1.0), 3.0)
		await tree.create_timer(0.8).timeout
		for k in 3:
			I.ice_shard(c, c + Vector2(3.5, -1.0 + k * 1.2))
			await tree.create_timer(0.15).timeout
		await tree.create_timer(2.0).timeout


static func _zap(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	I.charged_ground(c + Vector2(-1.5, 2.2), 1.8, 30.0)
	I.ball_lightning(c + Vector2(2.5, 0.0), 30.0)
	while is_instance_valid(g) and g.hero:
		I.spark_nova(c + Vector2(2.8, 2.4), 2.4)
		await tree.create_timer(1.6).timeout


static func _bonefx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	while is_instance_valid(g) and g.hero:
		I.bone_spears(c + Vector2(2.6, 0.6), 1.2, 4.0)
		await tree.create_timer(0.7).timeout
		I.rib_cage(c + Vector2(0.4, 2.8), 1.0, 3.5)
		await tree.create_timer(0.6).timeout
		I.bone_rain(c + Vector2(-1.8, 1.4), 2.0, 20, 1.6)
		await tree.create_timer(3.0).timeout


static func _acidfx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	var ms: Array = []
	for o in [Vector2(-1.6, 2.2), Vector2(-0.6, 2.8)]:
		var m = Brain.spawn(g.zone, "knight", c + o, 6, "normal", "acid", -1.0)
		if m:
			m.speed = 0.0
			ms.append(m)
	I.acid_drip(c + Vector2(2.8, -0.5), 0.8, 30.0)
	while is_instance_valid(g) and g.hero:
		I.acid_glob(c, c + Vector2(3.0, 1.8))
		for m in ms:
			if is_instance_valid(m) and not m.dead:
				Combat.hit_monster(m, 1.0, "acid", c, {})
		await tree.create_timer(1.4).timeout


static func _bloodfx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	var ms: Array = []
	for o in [Vector2(4.2, 0.2), Vector2(3.2, 3.0)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "blood", -1.0)
		if m:
			m.speed = 0.0
			ms.append(m)
	I.boil(c + Vector2(-1.6, 2.2), 1.2, 30.0)
	while is_instance_valid(g) and g.hero:
		for m in ms:
			if is_instance_valid(m) and not m.dead:
				I.blood_whip(c, m.tp)
				Combat.hit_monster(m, 1.0, "blood", c, {})
				await tree.create_timer(0.5).timeout
		await tree.create_timer(0.8).timeout


static func _threadfx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var b = g.hero.skills
	if not "threads" in b:
		return
	var c: Vector2 = g.hero.tp
	var ms: Array = []
	for o in [Vector2(3.0, 0.4), Vector2(2.6, 2.2), Vector2(0.8, 3.2), Vector2(-1.4, 2.8)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "thread", 1e7)
		if m:
			m.speed = 0.0
			m.dmg = Vector2.ZERO
			m.hp = 1e6
			m.hp_max = 1e6
			ms.append(m)
	while is_instance_valid(g) and g.hero:
		for m in ms.slice(0, 2):
			b.threads.append({"src": null, "m": m, "life": 2.6, "max": 2.6, "tick": 99.0, "k": 0.65, "freed": false})
		b.binds.append({"a": ms[2], "bound": [ms[3]], "t": 0.0, "dur": 0.55, "dmg": 0.0, "done": false, "fade": 0.0})
		await tree.create_timer(0.5).timeout
		if b.wisps.size() > 0:
			b.snags.append({"w": b.wisps[0], "m": ms[1], "tp": b.wisps[0].tp, "t": 0.0, "dur": 0.5})
		b.needles.append({"tp": c, "d": Vector2(1, -0.3).normalized(), "end": 4.0, "t": 0.0, "dur": 0.05 + 4.0 * 0.035})
		b.dart_lines.append({"a": c + Vector2(-0.5, 0.5), "za": 12.0, "b": ms[3].tp, "zb": 9.0, "t": 0.35})
		await tree.create_timer(2.4).timeout


static func _slashfx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp + Vector2(1.6, -1.6)
	var d := Vector2(1, 0.6).normalized()
	var k := 0
	while is_instance_valid(g) and g.hero:
		var kind := k % 4
		I.slash(c, d, mini(kind, 2), kind == 3, 1.5)
		await tree.create_timer(0.12).timeout
		I.cut(c + d * 1.2, d, kind >= 2)
		await tree.create_timer(0.5).timeout
		k += 1


static func _miasmafx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	var ms: Array = []
	for o in [Vector2(1.3, -0.1), Vector2(0.3, 1.1)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "miasma", 1e6)
		if m:
			m.speed = 0.0
			m.dmg = Vector2.ZERO
			ms.append(m)
	I.gyre(c + Vector2(2.8, 0.2), 1.6, 40.0)
	I.vent(c + Vector2(1.6, 2.6), 40.0)
	var n := 0
	while is_instance_valid(g) and g.hero:
		if n % 6 == 0:
			I.bladder(c + Vector2(3.2, 2.2), 2.4)
		for m in ms:
			if is_instance_valid(m) and not m.dead:
				Combat.hit_monster(m, 0.5, "miasma", c, {"dot": true})
		n += 1
		await tree.create_timer(0.6).timeout


static func _radfx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	var ms: Array = []
	for o in [Vector2(1.3, -0.1), Vector2(0.3, 1.1)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "radiance", 1e6)
		if m:
			m.speed = 0.0
			m.dmg = Vector2.ZERO
			ms.append(m)
	I.halo(c, 1.0, 60.0)
	var n := 0
	while is_instance_valid(g) and g.hero:
		if n % 5 == 0:
			I.glare(c + Vector2(3.0, 1.2), 1.4, 3.0)
		if n % 5 == 2:
			I.lance(c, c + Vector2(3.2, -1.4))
		for m in ms:
			if is_instance_valid(m) and not m.dead:
				Combat.hit_monster(m, 0.5, "radiance", c, {"dot": true})
		n += 1
		await tree.create_timer(0.6).timeout


static func _voidfx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	var ms: Array = []
	for o in [Vector2(1.3, -0.1), Vector2(0.3, 1.1)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "void", 1e6)
		if m:
			m.speed = 0.0
			m.dmg = Vector2.ZERO
			ms.append(m)
	var n := 0
	while is_instance_valid(g) and g.hero:
		if n % 8 == 0:
			I.hush(c + Vector2(3.0, 1.2), 1.4, 4.4)
		if n % 4 == 1:
			I.gate(c + Vector2(3.4, -1.2))
		if n % 4 == 3:
			I.pinch(c + Vector2(1.0, 2.4))
		for m in ms:
			if is_instance_valid(m) and not m.dead:
				Combat.hit_monster(m, 0.5, "void", c, {"dot": true})
		n += 1
		await tree.create_timer(0.6).timeout


static func _meleefx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.2).timeout
	var h = g.hero
	var c: Vector2 = h.tp
	var ms: Array = []
	for o in [Vector2(1.1, 0.3), Vector2(0.4, 1.2)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "melee", 1e6)
		if m:
			m.speed = 0.0
			m.dmg = Vector2.ZERO
			ms.append(m)
	var k := 0
	while is_instance_valid(g) and g.hero:
		var m = ms[(k / 4) % ms.size()]
		if g.hero.act == "" and is_instance_valid(m):
			if k % 4 == 3:
				g.hero.target = m
				g.hero.charge = 1.0
				g.hero._release_heavy(1.0)
			else:
				g.hero._start_attack(m, m.tp)
			k += 1
		await tree.create_timer(0.15).timeout


static func _lakefx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.0).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	I.lake(c + Vector2(3.6, -2.2), 3.0, "water")
	I.lake(c + Vector2(4.4, 2.6), 2.4, "blood")
	await tree.create_timer(0.5).timeout
	for o in [Vector2(7.0, -3.0), Vector2(7.2, 3.6)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "lake", 1e6)
		if m:
			m.dmg = Vector2.ZERO


static func _meadowfx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.0).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	I.meadow(c + Vector2(2.6, -0.4), 2.6, "grass", 52.0)
	I.meadow(c + Vector2(0.2, 2.8), 2.0, "dead", 44.0)
	I.meadow(c + Vector2(-2.4, 0.2), 1.8, "ash", 36.0)
	await tree.create_timer(0.4).timeout
	for o in [Vector2(5.4, -0.8), Vector2(0.6, 5.4)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "meadow", 1e6)
		if m:
			m.dmg = Vector2.ZERO


static func _snowfx(g) -> void:
	var tree: SceneTree = g.get_tree()
	await tree.create_timer(1.0).timeout
	var I = load("res://world/impacts.gd").of(g.zone)
	var c: Vector2 = g.hero.tp
	I.snowfield(c + Vector2(2.4, 0.6), 3.0)
	await tree.create_timer(0.4).timeout
	for o in [Vector2(6.0, 1.0), Vector2(5.0, 3.4)]:
		var m = Brain.spawn(g.zone, "hollow", c + o, 6, "normal", "snow", 1e6)
		if m:
			m.dmg = Vector2.ZERO
