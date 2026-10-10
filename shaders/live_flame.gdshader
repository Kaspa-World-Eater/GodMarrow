// A live flame (world/live_flames.gd; Derek, 2026-10-10: the cave's torches "have none of the realistic fire flicker
// and pulsing and waving lightness, like real fire ... we have a whole section on fire alone"). By that section
// (tools/art_study/library/objects/fire-candles-wax.md, fire_study.py): a wide base hugging its fuel, brightest and
// most solid there, narrowing unevenly; torn into licks by turbulence that rises faster than the flame, each lick
// stretching, thinning and breaking off near the top; colour by heat (a small white-yellow core low in the middle,
// yellow, orange, a red edge, the coolest tips darkening into smoke); the base breathing slowly (`breath`, the same
// clock as its light in the dark layer, fx/flame.gd smooth); the whole leaning more the higher it is. The hot core kept
// narrow and the body torn by a second, faster noise, or it reads as a bar (the effects library's lesson). Whole world
// pixels on the 2 x 2 art grid, the short ramp, the 4x4 ordered dither only at the tone edges.
// kind 0: a torch's or a sconce's tongue; 1: a brazier's bed of fire, wide and low; 2: a heap of candles, a few teardrops;
// 3: candles left on the floor or a step: wax stubs of their own heights, run with wax, each with its teardrop.
shader_type canvas_item;

uniform float seed = 0.0;
uniform float breath = 1.0;
uniform float wind = 0.0;           // the lean, -1..1
uniform int kind = 0;
uniform vec2 rect_size = vec2(28.0, 56.0);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 13.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 9.0) * 0.3 + vn(p * 4.3 + 3.0) * 0.15; }

// the heat of one tongue at (x across -1..1, y up 0..1)
float tongue(float x, float y, float t, float s, float hgt) {
	float lean = (wind * 0.35 + 0.18 * sin(t * 1.1 + s)) * y * y;
	float n = fbm(vec2(x * 1.4 + s, y * 1.5 - t * 1.4));              // the slow body's waver
	float n2 = fbm(vec2(x * 2.6 + s * 3.0, y * 3.0 - t * 4.2));       // the licks, racing up faster than the flame
	float w = (0.85 - 0.72 * y) * (0.82 + 0.4 * n) * (0.92 + 0.12 * breath);   // a body on its fuel, a teardrop
	float xx = abs(x - lean - (n - 0.5) * 0.45 * y);
	float body = clamp(1.0 - xx / max(w, 0.02), 0.0, 1.0);
	// the lower half burns whole; above it the licks tear away, more the higher they go
	float tear = mix(1.0, smoothstep(0.1 + 0.5 * y, 0.32 + 0.42 * y, n2), smoothstep(0.3, 0.6, y));
	float top = 1.0 - smoothstep(0.42 * hgt + 0.25 * n, 0.98 * hgt, y);
	float heat = (pow(body, 1.7) * 1.1 + body * 0.35) * tear * top;
	heat += (1.0 - smoothstep(0.0, 0.14, y)) * (1.0 - smoothstep(0.25, 0.8, abs(x - lean))) * 0.55;   // the root on its fuel
	return heat * (0.82 + 0.25 * breath);
}

void fragment() {
	vec2 px = floor(UV * rect_size / 2.0) * 2.0;
	ivec2 g = ivec2(px / 2.0);
	float d = B4[(g.y & 3) * 4 + (g.x & 3)] / 16.0;
	float x = (px.x / rect_size.x) * 2.0 - 1.0;
	float y = 1.0 - px.y / rect_size.y;
	float t = TIME + seed * 7.3;
	float heat = 0.0;
	float smoke = 0.0;
	vec4 wax = vec4(0.0);
	if (kind == 3) {
		// three stubs: wax columns two or four pixels wide, their own heights, lit on the flame's side, a teardrop on each
		for (int i = 0; i < 3; i++) {
			float fi = float(i);
			float cx = -0.5 + 0.5 * fi + 0.1 * sin(seed * 2.3 + fi * 1.9);
			float wh = 0.22 + 0.3 * fract(sin(seed * 1.7 + fi * 5.3) * 71.7);   // the stub's height, of the rect
			float ww = (fract(sin(seed + fi * 3.1) * 37.9) > 0.5) ? 0.14 : 0.1;
			if (abs(x - cx) < ww && y < wh) {
				float lit = (x - cx) < 0.0 ? 1.0 : 0.72;
				wax = vec4(vec3(0.62, 0.52, 0.4) * lit * (0.75 + 0.25 * y / wh), 1.0);
			}
			float sx = (x - cx) * 3.6;
			float sy = (y - wh) * 2.6;
			if (sy < 0.0 || sy > 1.0) continue;
			float fl = 0.85 + 0.15 * sin(t * (5.0 + fi) + fi * 1.7) + 0.08 * sin(t * 13.0 + fi);
			float w = (0.5 - 0.42 * sy) * fl;
			float b = clamp(1.0 - abs(sx + 0.15 * sy * sin(t * 2.0 + fi)) / max(w, 0.02), 0.0, 1.0);
			float top = 1.0 - smoothstep(0.55 * fl, 0.95 * fl, sy);
			heat = max(heat, (pow(b, 1.4) * 1.2 + b * 0.3) * top);
		}
	} else if (kind == 2) {
		// a heap of candles: three or four small teardrops at their own heights, each its own flicker
		for (int i = 0; i < 4; i++) {
			float fi = float(i);
			float cx = -0.62 + 0.42 * fi + 0.12 * sin(seed * 3.0 + fi * 2.1);
			float cy = 0.08 + 0.22 * fract(sin(seed + fi * 4.7) * 91.3);
			float sx = (x - cx) * 3.2;
			float sy = (y - cy) * 2.2;
			if (sy < 0.0 || sy > 1.0) continue;
			float fl = 0.85 + 0.15 * sin(t * (5.0 + fi) + fi * 1.7) + 0.08 * sin(t * 13.0 + fi);
			float w = (0.5 - 0.42 * sy) * fl;
			float b = clamp(1.0 - abs(sx + 0.15 * sy * sin(t * 2.0 + fi)) / max(w, 0.02), 0.0, 1.0);
			float top = 1.0 - smoothstep(0.55 * fl, 0.95 * fl, sy);
			heat = max(heat, (pow(b, 1.4) * 1.2 + b * 0.3) * top);
		}
	} else if (kind == 1) {
		// a brazier: a bed of licks along the bowl's width, low, the middle ones tallest
		for (int i = 0; i < 4; i++) {
			float fi = float(i);
			float cx = -0.6 + 0.4 * fi;
			float hgt = 0.6 + 0.4 * (1.0 - abs(cx)) * (0.8 + 0.3 * sin(t * 0.9 + fi * 2.3 + seed));
			heat = max(heat, tongue((x - cx) * 2.0, y, t, seed + fi * 5.1, hgt));
		}
		smoke = smoothstep(0.65, 1.0, y) * fbm(vec2(x * 2.0, y * 3.0 - t * 0.8)) * 0.5;
	} else {
		heat = tongue(x, y, t, seed, 1.0);
		smoke = smoothstep(0.7, 1.0, y) * fbm(vec2(x * 2.4, y * 3.0 - t * 0.9)) * 0.45;
	}
	float lv = heat * 3.5 + d * 0.9;
	vec4 col = vec4(0.0);
	if (lv > 3.75 && y < 0.4) col = vec4(1.0, 0.93, 0.62, 1.0);         // the white-yellow core, small and low
	else if (lv > 2.4) col = vec4(1.0, 0.84, 0.42, 1.0);                 // yellow
	else if (lv > 1.6) col = vec4(0.98, 0.56, 0.17, 1.0);                // orange
	else if (lv > 1.0) col = vec4(0.72, 0.22, 0.06, 0.92);               // the red edge
	else if (smoke + d * 0.25 > 0.42) col = vec4(0.09, 0.07, 0.07, 0.55); // the tips darkening into smoke
	if (col.a < 0.5 && wax.a > 0.5) col = wax;
	COLOR = col;
}
