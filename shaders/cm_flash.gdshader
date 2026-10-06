shader_type canvas_item;
// A struck body turns white for a blink, as Cursemark flashes it (engine/render/task/FlashObject): its shape, filled white.
uniform float flash = 0.0;

void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	COLOR = vec4(mix(c.rgb, vec3(1.0), flash), c.a);
}
