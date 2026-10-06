shader_type canvas_item;
// The incinerating radiant blaze (Derek 2026-10-06: fire as "incinerating radiant"): a column of white-gold fire that
// burns from a hot white core out through gold to a thin orange skin, its tongues racing upward; above and round it the
// air shimmers (the scene behind is read and bent). Whole world pixels, the ordered dither, as the title paints.
uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform float t = 0.0;
uniform float life = 1.0;          // 0..1: rises in, holds, gutters out
uniform float seed = 0.0;
uniform vec2 rect_size = vec2(200.0, 320.0);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 13.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0;
	// x: -1..1 across, y: 0 at the foot .. 1 at the top
	float x = (px.x / rect_size.x) * 2.0 - 1.0;
	float y = 1.0 - px.y / rect_size.y;
	// the column narrows as it rises; its edge wavers; torn into tongues racing upward
	float n = fbm(vec2(px.x * 0.035, px.y * 0.02 + t * 3.2));
	float n2 = fbm(vec2(px.x * 0.08 + 7.0, px.y * 0.045 + t * 5.5));
	float w = (0.6 - 0.42 * y) * (0.75 + 0.5 * n);
	float xx = abs(x + (n - 0.5) * 0.35 * y);
	float body = clamp(1.0 - xx / max(w, 0.01), 0.0, 1.0);
	float core = pow(body, 1.6);                                 // hottest along the middle
	float tear = smoothstep(0.05 + 0.5 * y, 0.35 + 0.35 * y, n2);  // the higher, the more it tears into tongues
	float top = 1.0 - smoothstep(0.5 + 0.3 * n, 0.95, y);
	float heat = (core * 1.05 + body * 0.4) * tear * top * life;
	heat += (1.0 - smoothstep(0.0, 0.1, y)) * (1.0 - smoothstep(0.35, 0.85, abs(x))) * 0.45 * life;   // the white root
	vec4 col = vec4(0.0);
	float lv = heat * 3.4 + d * 0.9;
	if (lv > 3.2) col = vec4(1.0, 0.98, 0.9, 1.0);
	else if (lv > 2.3) col = vec4(1.0, 0.86, 0.48, 1.0);
	else if (lv > 1.5) col = vec4(0.96, 0.62, 0.22, 0.95);
	else if (lv > 0.9) col = vec4(0.62, 0.26, 0.08, 0.6);
	// the shimmer: round and above the fire, the scene behind bends (a little, in whole pixels)
	float near = (1.0 - smoothstep(0.3, 1.0, abs(x))) * smoothstep(0.1, 0.6, y) * life;
	if (col.a < 0.9 && near > 0.05) {
		vec2 off = vec2(sin(px.y * 0.09 + t * 9.0), cos(px.x * 0.07 + t * 7.0)) * 4.0 * near / vec2(textureSize(screen_tex, 0));
		vec3 bent = texture(screen_tex, SCREEN_UV + off).rgb;
		col = vec4(mix(bent, col.rgb, col.a), 1.0);
		col.rgb += vec3(0.08, 0.05, 0.0) * near;               // the air glows a little warm
	}
	COLOR = col;
}
