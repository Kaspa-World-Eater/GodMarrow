shader_type canvas_item;
// The pilgrim lit by their own lantern through the sheet's normal map (tools/title_study/normals.py), as the creatures
// and the props are lit: the side toward the lantern warms, the side away sinks into the plate's own shade, and a faint
// cold rim from the sky. UV is the sheet's (the frames are regions of it), so the normal sheet lines up pixel for pixel.
uniform sampler2D normal_sheet : filter_nearest;
uniform vec3 lamp_dir = vec3(0.0, -0.5, 1.0);
uniform float lamp_k = 0.5;
uniform float sky_k = 0.3;
uniform bool face_left = false;

void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	vec4 nn = texture(normal_sheet, UV);
	if (nn.a > 0.5) {
		vec3 n = nn.rgb * 2.0 - 1.0;
		n.y = -n.y;
		if (face_left) n.x = -n.x;
		n = normalize(n);
		float lam = max(0.0, dot(n, normalize(lamp_dir)));
		float sky = max(0.0, dot(n, normalize(vec3(-0.6, -0.7, 0.4))));
		c.rgb *= mix(1.0, 0.7 + 0.6 * lam, lamp_k) * mix(vec3(1.0), vec3(1.0, 0.88, 0.7), lamp_k * lam * 0.35);
		c.rgb += vec3(0.5, 0.6, 0.85) * pow(sky, 4.0) * sky_k * 0.14;
	}
	COLOR = c;
}
