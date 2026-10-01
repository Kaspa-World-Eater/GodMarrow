extends Node
## scripts/sfx.gd: the Forge's few soft sounds, the same Kenney CC0 recordings the game uses for its pages and cloth
## (assets/sfx, LICENSE_kenney.txt). FSfx.play("open"). Settings can turn them off.

const TAKES := {
	"hover": ["bookFlip2"], "press": ["cloth1", "cloth2"], "open": ["bookOpen"], "back": ["bookClose"],
	"tick": ["handleSmallLeather"], "done": ["impactBell_heavy_000"], "fail": ["impactWood_medium_000"], "drop": ["impactSoft_heavy_000"],
}
const GAIN := {"hover": -22.0, "press": -14.0, "open": -10.0, "back": -12.0, "tick": -16.0, "done": -22.0, "fail": -14.0, "drop": -12.0}

static var me: Node
static var enabled := true
var pool: Array = []
var bank := {}
var last := {}

func _ready() -> void:
	me = self
	for i in 6:
		var p := AudioStreamPlayer.new()
		add_child(p)
		pool.append(p)

static func play(name: String, vol: float = 1.0, pitch: float = 1.0) -> void:
	if me != null and enabled:
		me._play(name, vol, pitch)

func _stream(file: String) -> AudioStream:
	if bank.has(file):
		return bank[file]
	var path := ProjectSettings.globalize_path("res://assets/sfx/%s.ogg" % file)
	var s: AudioStream = null
	if FileAccess.file_exists(path):
		s = AudioStreamOggVorbis.load_from_file(path)
	bank[file] = s
	return s

func _play(name: String, vol: float, pitch: float) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if now - float(last.get(name, -9.0)) < 0.05:
		return
	last[name] = now
	var takes: Array = TAKES.get(name, [])
	if takes.is_empty():
		return
	var s := _stream(takes[randi() % takes.size()])
	if s == null:
		return
	for p in pool:
		if not p.playing:
			p.stream = s
			p.volume_db = float(GAIN.get(name, -12.0)) + linear_to_db(maxf(vol, 0.01))
			p.pitch_scale = pitch * randf_range(0.96, 1.04)
			p.play()
			return
