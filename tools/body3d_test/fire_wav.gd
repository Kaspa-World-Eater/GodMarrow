extends SceneTree
## the fire loops written out as .wav files to listen to (core/sfx.gd loop): godot --path . -s tools/body3d_test/fire_wav.gd -- OUT_DIR
func _initialize() -> void:
	var out: String = OS.get_cmdline_user_args()[0]
	for k in ["fire_torch", "fire_brazier", "fire_candle", "red_surge"]:
		var w: AudioStreamWAV = load("res://core/sfx.gd").loop(k)
		print("WAV ", k, " ", w.save_to_wav(out + "/" + k + ".wav"))
	quit()
