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
uniform bool cold = false;           // wisp-fire (world/red_wisps.gd): white core, pale blue-white body, dim blue-grey edge
uniform float life = 1.0;            // 0..1: flaring in, burning, guttering out
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
	float coal = 0.0;
	bool cut = false;
	vec4 wax = vec4(0.0);
	if (kind == 3) {
		// candles left by those before (Derek, 2026-10-10: "add more variety to the candle"): each cluster its own make,
		// one to six, of their own heights and girths, some leaning, the wax of each its own (old ivory, yellowed, red,
		// blackened with age), a few snuffed, drips down their sides, the wax pooled and spread at their feet
		float hs = fract(sin(seed * 12.9898) * 43758.5453);
		int n = 1 + int(floor(hs * 5.99));
		// the pool of wax at the feet: low, wide, uneven
		float py = (y - 0.06) / 0.08;
		if (abs(py) < 1.0 && abs(x) < 0.85 * (1.0 - py * py * 0.4) * (0.6 + 0.4 * float(n) / 6.0)) {
			wax = vec4(vec3(0.32, 0.27, 0.22) * (0.8 + 0.2 * vn(vec2(x * 9.0, seed))), 1.0);
		}
		for (int i = 0; i < 6; i++) {
			if (i >= n) break;
			float fi = float(i);
			float r1 = fract(sin(seed * 1.7 + fi * 5.3) * 71.7);
			float r2 = fract(sin(seed * 2.9 + fi * 3.7) * 53.1);
			float r3 = fract(sin(seed * 0.7 + fi * 7.1) * 91.3);
			float cx = (float(n) > 1.0 ? -0.62 + 1.24 * fi / (float(n) - 1.0) : 0.0) + (r2 - 0.5) * 0.18;
			float wh = 0.12 + 0.62 * r1 * r1;                        // a stub, a half-burnt, a tall one
			float ww = r3 > 0.75 ? 0.15 : (r3 > 0.3 ? 0.1 : 0.065);  // girth
			float lean = (r2 - 0.5) * 0.25 * step(0.6, r3);
			vec3 wc = r2 < 0.4 ? vec3(0.66, 0.58, 0.46) : (r2 < 0.65 ? vec3(0.62, 0.5, 0.3) : (r2 < 0.85 ? vec3(0.46, 0.1, 0.09) : vec3(0.2, 0.16, 0.13)));
			float xc = x - cx - lean * y;
			if (abs(xc) < ww && y < wh) {
				float lit = xc < 0.0 ? 1.0 : 0.7;
				vec3 cc = wc * lit * (0.75 + 0.25 * y / wh);
				// a drip down its side, a shade lighter, ending in a bead
				float dx = ww * (r1 > 0.5 ? -0.7 : 0.7);
				if (abs(xc - dx) < 0.035 && y > wh * (0.25 + 0.4 * r3)) cc = wc * 1.15;
				wax = vec4(cc, 1.0);
			}
			if (r3 > 0.84) continue;                                 // snuffed: a wick, no flame
			float sx = (xc) * 3.6;
			float sy = (y - wh) * 2.6;
			if (sy < 0.0 || sy > 1.0) continue;
			float fl = 0.85 + 0.15 * sin(t * (5.0 + fi) + fi * 1.7) + 0.08 * sin(t * 13.0 + fi);
			float w = (0.5 - 0.42 * sy) * fl * (0.8 + 0.4 * ww / 0.15);
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
		// a brazier: the fire down in its bowl (Derek, 2026-10-10: it "has no depth to it, looks like its pasted on
		// top"; the bog ruin's fire in the eye the example). The bowl's opening is an ellipse (47 x 23 px, centred three
		// quarters down the rect); below its front lip nothing is drawn, so the baked bowl's own wall hides the fire's
		// root; inside the opening a bed of coals glows and stirs; the tongues rise out of it, the middle ones tallest
		float ex = (px.x - rect_size.x * 0.5) / 47.0;
		float ey = (px.y - rect_size.y * 0.75) / 23.0;
		float front = sqrt(max(0.0, 1.0 - ex * ex));
		if (ey > front || abs(ex) > 1.0) {
			cut = true;
		} else {
			float yy = (rect_size.y * 0.75 - px.y) / (rect_size.y * 0.75);       // up from the opening's middle
			for (int i = 0; i < 5; i++) {
				float fi = float(i);
				float cx = -0.62 + 0.31 * fi + 0.06 * sin(t * 0.7 + fi * 2.1 + seed);
				float hgt = 0.55 + 0.45 * (1.0 - abs(cx)) * (0.8 + 0.3 * sin(t * 0.9 + fi * 2.3 + seed));
				heat = max(heat, tongue((ex - cx) * 2.6, max(yy, 0.0) + max(-ey, 0.0) * 0.0, t, seed + fi * 5.1, hgt));
			}
			if (ex * ex + ey * ey < 1.0) {
				// the coals: dark red to orange, stirring, brightest under the tongues' roots
				float cn = vn(vec2(px.x * 0.18 + seed, px.y * 0.36 - t * 0.6)) * 0.7 + vn(vec2(px.x * 0.5, px.y * 0.9 + t * 1.7)) * 0.3;
				coal = cn * (0.75 + 0.25 * breath) * (1.0 - 0.6 * (ex * ex));
			}
			smoke = smoothstep(0.62, 1.0, yy) * fbm(vec2(x * 2.0, y * 3.0 - t * 0.8)) * 0.5;
		}
	} else {
		heat = tongue(x, y, t, seed, 1.0);
		smoke = smoothstep(0.7, 1.0, y) * fbm(vec2(x * 2.4, y * 3.0 - t * 0.9)) * 0.45;
	}
	heat *= life;
	float lv = heat * 3.5 + d * 0.9;
	vec4 col = vec4(0.0);
	if (cold) {
		// wisp-fire: a cold teardrop off the blood, torn at the tip, the dither only at its border; no smoke
		if (lv > 3.4 && y < 0.45) col = vec4(0.96, 0.98, 1.0, 1.0);
		else if (lv > 2.3) col = vec4(0.66, 0.8, 0.96, 0.95);
		else if (lv > 1.4) col = vec4(0.36, 0.46, 0.62, 0.8);
	} else if (lv > 3.75 && y < 0.4) col = vec4(1.0, 0.93, 0.62, 1.0);         // the white-yellow core, small and low
	else if (lv > 2.4) col = vec4(1.0, 0.84, 0.42, 1.0);                 // yellow
	else if (lv > 1.6) col = vec4(0.98, 0.56, 0.17, 1.0);                // orange
	else if (lv > 1.0) col = vec4(0.72, 0.22, 0.06, 0.92);               // the red edge
	else if (smoke + d * 0.25 > 0.42) col = vec4(0.09, 0.07, 0.07, 0.55); // the tips darkening into smoke
	if (!cold && col.a < 0.5 && wax.a > 0.5) col = wax;
	if (col.a < 0.5 && coal > 0.0) {
		// the bed of coals in the bowl, seen through its opening, dithered between its few tones
		float cv = coal + (d - 0.5) * 0.18;
		col = cv > 0.62 ? vec4(1.0, 0.62, 0.2, 1.0) : (cv > 0.42 ? vec4(0.78, 0.25, 0.07, 1.0) : vec4(0.32, 0.07, 0.04, 1.0));
	}
	if (cut) col = vec4(0.0);
	COLOR = col;
}
