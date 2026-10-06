shader_type canvas_item;
render_mode unshaded;
// Cursemark's effects turned to bone (the fork): an effect's own light and shade kept, its colour taken away and laid on
// a bone ramp (the shadowed brown of old bone to its pale lit edge). Ice spikes become bone spurs; a holy spear, a lance
// of packed bone.

uniform vec4 dark : source_color = vec4(0.36, 0.32, 0.26, 1.0);
uniform vec4 mid : source_color = vec4(0.74, 0.70, 0.60, 1.0);
uniform vec4 light : source_color = vec4(0.95, 0.93, 0.85, 1.0);

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	float l = dot(c.rgb, vec3(0.3, 0.55, 0.15));
	vec3 b = l < 0.5 ? mix(dark.rgb, mid.rgb, l / 0.5) : mix(mid.rgb, light.rgb, (l - 0.5) / 0.5);
	COLOR = vec4(b, c.a) * COLOR;
}
