shader_type canvas_item;
// A snowfield, to the painted standard (docs/PAINTED_STANDARD.md): wind-scoured snow in long strokes, blue shadow
// pooled in the furrows and at the drift's edge, a few glints of ice; spindrift (loose snow) running across it in
// streaks with the wind; footprints pressed into it where anything walks, blue in their hollows, filling back in.
uniform float t = 0.0;
uniform float seed = 0.0;
uniform vec2 rect_size = vec2(400.0, 200.0);
uniform vec2 half_px = vec2(180.0, 90.0);
uniform vec2 wind = vec2(1.0, 0.5);
uniform vec2 world_ofs = vec2(0.0);
uniform vec4 prints[32];                      // x, y (px in the rect), age (s), 1 (live)

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 13.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

vec3 ramp(float v) {
	if (v > 0.86) return vec3(0.93, 0.95, 0.97);
	if (v > 0.66) return vec3(0.76, 0.8, 0.86);
	if (v > 0.44) return vec3(0.55, 0.61, 0.71);
	if (v > 0.22) return vec3(0.37, 0.43, 0.54);
	return vec3(0.22, 0.26, 0.35);
}

void fragment() {
	vec2 px = floor(UV * rect_size / 4.0) * 4.0;
	ivec2 g = ivec2(px / 4.0);
	float d = (B4[(g.y & 3) * 4 + (g.x & 3)] + 0.5) / 16.0;
	vec2 c = rect_size * 0.5;
	vec2 q = (px + 2.0 - c) / half_px;
	float r = length(q);
	vec2 dir = q / max(r, 0.001);
	float edge = 0.8 + 0.28 * fbm(dir * 2.0 + seed);
	vec2 wp = px + world_ofs;
	vec4 col = vec4(0.0);
	if (r < edge) {
		vec2 W = vec2(wp.x, wp.y * 2.0);
		float ang = 0.22;
		vec2 ax = vec2(W.x * cos(ang) + W.y * sin(ang), -W.x * sin(ang) + W.y * cos(ang));
		float drift = fbm(W * 0.012 + seed);
		float scour = vn(vec2(ax.x * 0.012, ax.y * 0.11));
		float furrow = vn(vec2(ax.x * 0.025, ax.y * 0.22) + 9.0);
		float v = 0.62 + (drift - 0.5) * 0.4 + (scour - 0.5) * 0.28 + (vn(W * 0.05) - 0.5) * 0.04;
		if (furrow < 0.2) v -= 0.22;                                       // blue shadow in the furrows
		// spindrift: loose snow streaming across with the wind, brighter streaks moving
		float sd = vn(vec2(ax.x * 0.02 - t * (1.2 + wind.y * 2.0) * sign(wind.x + 0.001), ax.y * 0.3 + 17.0));
		if (sd > 0.74 - wind.y * 0.08) v += 0.2;
		// footprints: an oval hollow, blue pooled inside, a lit lip on the far side; filling back in with age
		for (int i = 0; i < 32; i++) {
			vec4 pr = prints[i];
			if (pr.w <= 0.0) continue;
			vec2 dv = (px + 2.0 - pr.xy) * vec2(1.0, 1.7);
			float dd = length(dv);
			float fill = smoothstep(4.0, 14.0, pr.z);                       // seconds until the wind fills it
			if (dd < 10.0 * (1.0 - fill * 0.5)) v = mix(0.12, v, fill);
			else if (dd < 13.0 && dv.y > 0.0) v = mix(min(v + 0.2, 0.99), v, fill);
		}
		// the drift's edge pools blue, then a thin lit lip
		float toE = edge - r;
		if (toE < 0.08) v -= 0.25 * (1.0 - toE / 0.08);
		if (vn(W * 0.9) > 0.94 && drift > 0.5) v = 0.99;                     // glints of ice
		col = vec4(ramp(clamp(v + (d - 0.5) * 0.07, 0.0, 0.99)), 1.0);
	} else if (r < edge + 0.06) {
		if ((edge + 0.06 - r) / 0.06 > d) col = vec4(0.62, 0.68, 0.76, 0.5);   // a dusting at the rim
	}
	COLOR = col;
}
