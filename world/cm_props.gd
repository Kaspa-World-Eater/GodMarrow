extends RefCounted
## Our props in Cursemark's art (Cursemark assets; Derek 2026-10-05: "take assets from this game and put them into
## godmarrow"): each family of the zone's drawn pieces (world/zone.gd _sprites) is stood by its Cursemark kin, a
## variant picked by where it stands so a grove is never a row of clones. The ground, walls and landmarks stay ours.
## A Cursemark pixel is the world's pixel here (4 units); its props are drawn round their middle, ours on a foot, so
## each is lifted onto its foot.

## the start of our key -> Cursemark's doodads (the first that exists, in turn by place), and how much larger it stands
## than Cursemark drew it (Derek 2026-10-05: "make the world objects large so it feels like we are exploring wilderness")
const MAP := [
	["sp_oldgrowth_stump", ["plains/stump_big", "plains/stump_small"], 1.25],
	["sp_oldgrowth_fallen", ["forest/fallen_tree"], 1.3],
	["sp_oldgrowth_snag", ["plains/dead_tree", "forest/tree_dark"], 1.45],
	["sp_oldgrowth", ["forest/tree", "forest/tree_dark"], 1.45],
	["sp_ashoak_stump", ["plains/stump_small", "plains/stump_big"], 1.25],
	["sp_ashoak_fallen", ["forest/fallen_tree"], 1.3],
	["sp_ashoak_snag", ["plains/dead_tree"], 1.35],
	["sp_ashoak", ["plains/small_tree", "plains/birch_tree"], 1.45],
	["sp_bogcypress_stump", ["plains/stump_big"], 1.25],
	["sp_bogcypress", ["forest/tree_dark", "forest/tree"], 1.45],
	["sp_mourncypress_stump", ["plains/stump_big"], 1.25],
	["sp_mourncypress", ["forest/tree_dark"], 1.45],
	["sp_yew_stump", ["plains/stump_small"], 1.25],
	["sp_yew", ["forest/tree"], 1.45],
	["sp_charpine_stump", ["plains/stump_small", "plains/stump_big"], 1.25],
	["sp_charpine", ["plains/dead_tree"], 1.35],
	["sp_willow", ["forest/tree", "forest/tree_dark"], 1.45],
	["grave", ["headstone"], 1.1],
	["rk", ["plains/rock"], 1.25],
	["shrub", ["plains/bush_med", "plains/bush_small", "forest/shrub"], 1.2],
	["p_railing", ["fence_h"], 1.0],
	["p_candles", ["candle"], 1.0],
	["p_cobweb", ["forest/spiderweb"], 1.0],
	["p_fungus", ["forest/mushroom_cap"], 1.0],
	["p_lily", ["lilypad"], 1.0],
	["p_rubble", ["rubble", "ruins_debris"], 1.0],
	["p_cairn", ["rubble"], 1.0],
]

static func scale_for(key: String) -> float:
	for m in MAP:
		if key.begins_with(m[0]):
			return float(m[2])
	return 1.0

static func region_for(key: String, x: float, y: float) -> String:
	for m in MAP:
		if key.begins_with(m[0]):
			var opts: Array = m[1]
			var A: Dictionary = load("res://world/cm_sprites.gd").atlas("Doodads")
			var h := absi(int(x * 73.0 + y * 37.0 + key.length() * 11.0))
			for k in opts.size():
				var base: String = "doodads/" + str(opts[(h + k) % opts.size()])
				# its numbered variants: pick one by place
				var vs: Array = []
				for v in range(1, 9):
					if A.has(base + "_" + str(v)):
						vs.append(base + "_" + str(v))
				if A.has(base):
					vs.append(base)
				if not vs.is_empty():
					return vs[h % vs.size()]
			return ""
	return ""

## a node standing the Cursemark prop on its foot at 0,0, or null when ours keeps the place
static func node_for(key: String, x: float, y: float, flip: bool) -> Node2D:
	var reg := region_for(key, x, y)
	if reg == "":
		return null
	var A: Dictionary = load("res://world/cm_sprites.gd").atlas("Doodads")
	var node := CmFrames.new()
	node.frames = A[reg]
	node.region = reg
	node.flip = flip
	node.fps = 8.0
	node.phase = randf() * 10.0
	var G: Dictionary = load("res://world/cm_sprites.gd").atlas("Doodads_glow")
	if G.has(reg):
		node.glow = G[reg]
	node.setup()
	# lift it onto its foot: the bottom of its frame at 0
	var f: Dictionary = A[reg][0]
	var bottom: float = (f["off"] as Vector2).y - (f["orig"] as Vector2).y * 0.5 + (f["rect"] as Rect2).size.y
	node.spr.position.y -= bottom * 4.0
	if node.gspr:
		node.gspr.position.y -= bottom * 4.0
	node.set_meta("lift", bottom * 4.0)
	return node
