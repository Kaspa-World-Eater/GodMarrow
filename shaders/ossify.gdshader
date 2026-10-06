shader_type canvas_item;
// Bone growth (Derek 2026-10-06: "bone growth like cancer ... an effect for bone skills on enemies"). An ivory crust
// creeps over the body from where the bone struck it: lumpy, ridged, its spreading edge a raw pink-grey line with a
// lit lip; cracks run through it. Killed while overgrown, the body calcifies white and splits along those cracks,
// falling away in pieces from the top (dead_k). On the sprite's own texel grid with the ordered dither.
uniform float growth = 0.0;          // 0..1: how much of the body the crust has taken
uniform vec2 origin = vec2(0.5, 0.5);   // where it began, in the frame (0..1)
uniform float dead_k = 0.0;          // 0..1: the calcified body breaking apart
uniform float seed = 0.0;
uniform vec4 region = vec4(0.0, 0.0, 1.0, 1.0);
uniform float flash = 0.0;           // the white blink when struck (as cm_flash)

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 7.7) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 5.0) * 0.3 + vn(p * 4.3 + 9.0) * 0.15; }

void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	vec2 tp = floor(UV / TEXTURE_PIXEL_SIZE);
	float d = B4[(int(tp.y) & 3) * 4 + (int(tp.x) & 3)] / 16.0;
	vec2 fu = clamp((UV - region.xy) / max(region.zw, vec2(1e-5)), 0.0, 1.0);   // 0..1 within the frame
	float dist = length((fu - origin) * vec2(1.0, 1.4));
	float lump = fbm(tp * 0.22);
	float reach = growth * 1.15 + (lump - 0.5) * 0.3;          // the front, lumpy as it spreads
	vec3 col = c.rgb;
	if (c.a > 0.0 && growth > 0.0) {
		float inside = reach - dist;
		if (inside > 0.0) {
			// the crust: ivory, ridged by the noise, darker in its folds, a lit upper side
			float lp = fbm(tp * 0.16 + 3.0);                       // lumps: a coarse field, embossed
			float emb = (lp - fbm((tp + vec2(1.5, 1.5)) * 0.16 + 3.0)) * 9.0;   // lit upper-left, shadowed lower-right
			float lv = 1.6 + emb + lp * 0.8 + (1.0 - fu.y) * 0.5 + d * 0.7;
			// cool bone (the scene's warm lantern and grade bring it back to ivory)
			vec3 b0 = vec3(0.2, 0.21, 0.26), b1 = vec3(0.44, 0.46, 0.52), b2 = vec3(0.66, 0.68, 0.72), b3 = vec3(0.86, 0.88, 0.9);
			col = lv > 2.6 ? b3 : lv > 1.8 ? b2 : lv > 1.0 ? b1 : b0;
			// cracks through it
			float vein = 1.0 - abs(fbm(tp * 0.3 + 11.0) * 2.0 - 1.0);
			if (vein > 0.94 - d * 0.03) col = vec3(0.16, 0.12, 0.11);
			// the raw spreading edge: a pink-grey band, its lip lit
			if (inside < 0.06) col = mix(vec3(0.55, 0.36, 0.36), vec3(0.88, 0.8, 0.72), step(0.5, d));
		}
	}
	// breaking apart when calcified dead: pieces along the cracks fall away from the top down
	if (dead_k > 0.0) {
		col = mix(col, vec3(0.72, 0.74, 0.78) * (0.7 + 0.35 * fbm(tp * 0.16)), smoothstep(0.0, 0.3, dead_k));
		float piece = fbm(floor(tp / 3.0) * 0.7 + 2.0);              // chunky pieces, not pixels
		float line = smoothstep(0.35, 1.0, dead_k) * 1.3 - (1.0 - fu.y) * 0.0;
		if (piece + fu.y * 0.6 < line) c.a = 0.0;
	}
	col = mix(col, vec3(1.0), flash);
	COLOR = vec4(col, c.a);
}
