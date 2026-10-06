shader_type canvas_item;
// A meadow, to the painted standard (docs/PAINTED_STANDARD.md): a patch of standing grass, each blade a tapered stroke
// in whole world pixels, dark where it is rooted (the pigment pooled at the base) and lit at the tip, swaying with the
// one wind (Gust) in slow waves that roll across the patch, and parting round anything that walks through it.
uniform float t = 0.0;
uniform float seed = 0.0;
uniform vec2 rect_size = vec2(400.0, 240.0);
uniform vec2 half_px = vec2(160.0, 80.0);       // the patch's ground ellipse
uniform float blade_h = 36.0;                    // tallest blade, px
uniform vec2 wind = vec2(1.0, 0.5);              // Gust: way, strength
uniform vec2 world_ofs = vec2(0.0);
uniform vec4 bodies[6];                          // x, y (px in the rect, at the feet), radius px, strength
uniform vec3 c0 : source_color = vec3(0.06, 0.08, 0.05);
uniform vec3 c1 : source_color = vec3(0.14, 0.18, 0.09);
uniform vec3 c2 : source_color = vec3(0.23, 0.29, 0.13);
uniform vec3 c3 : source_color = vec3(0.37, 0.43, 0.2);
uniform vec3 c4 : source_color = vec3(0.6, 0.62, 0.32);

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 13.1) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }

vec3 ramp(float v) {
	if (v > 0.84) return c4;
	if (v > 0.6) return c3;
	if (v > 0.36) return c2;
	if (v > 0.14) return c1;
	return c0;
}

void fragment() {
	vec2 cell = floor(UV * rect_size / 4.0);
	vec4 col = vec4(0.0);
	float best = -1.0;
	int H = int(blade_h / 4.0);
	// look down the columns near this cell for a blade rooted below that reaches up to it
	for (int k = 0; k <= 12; k++) {
		if (k > H) break;
		for (int dx = -3; dx <= 3; dx++) {
			vec2 root = cell + vec2(float(dx), float(k));
			vec2 rq = (root * 4.0 + 2.0 - rect_size * vec2(0.5, 1.0) + vec2(0.0, half_px.y)) / half_px;
			float re = length(rq);
			if (re > 1.0) continue;
			vec2 wr = root + world_ofs / 4.0;
			float hh = h21(wr);
			float clump = vn(wr * 0.16 + seed);                        // blades gather in tufts, ground between
			if (clump < 0.45 || hh < 0.62 - (clump - 0.45) * 0.5) continue;
			float hgt = float(H) * (0.4 + 0.6 * smoothstep(0.45, 0.8, clump)) * (0.75 + 0.25 * h21(wr + 7.0)) * (1.0 - re * re * 0.6);   // taller in a tuft's heart
			float f = float(k) / max(hgt, 1.0);                       // 0 at the root .. 1 at the tip
			if (f > 1.0) continue;
			// the sway: a wave rolling across the patch with the wind, each blade with its own phase
			float wave = sin(wr.x * 0.12 - t * (1.4 + wind.y) + h21(wr + 3.0) * 1.2) * (0.5 + wind.y);
			float lean = (wind.x * (0.8 + wind.y) + wave) * 1.6 + (h21(wr + 11.0) - 0.5) * 1.5;
			// parting round bodies: blades near a body lean away from it
			for (int b = 0; b < 6; b++) {
				vec4 bd = bodies[b];
				if (bd.w <= 0.0) continue;
				vec2 dv = (root * 4.0 + 2.0) - bd.xy;
				dv.y *= 2.0;
				float dd = length(dv);
				float near = 1.0 - smoothstep(bd.z * 0.4, bd.z, dd);
				lean += sign(dv.x) * near * 4.5 * bd.w;
			}
			float xoff = lean * f * f;
			if (abs(float(dx) + xoff) > 0.5) continue;
			float w = (1.0 - f) * 1.0;                                // taper (one cell; the taper is in the tone)
			// tone: pooled dark at the root, rising to a lit tip; blades leaning toward the light (left) brighter
			float broad = vn(wr * 0.05 + 40.0);                        // broad light across the patch, not per blade
			float v = 0.05 + f * 0.62 + (broad - 0.5) * 0.3 + (h21(wr + 5.0) - 0.5) * 0.06 - clamp(lean, -2.0, 2.0) * 0.05;
			// nearer rows (lower on screen) draw over farther ones
			float order = root.y + f * 0.01;
			if (order > best) {
				best = order;
				col = vec4(ramp(clamp(v, 0.0, 0.99)), 1.0);
			}
		}
	}
	COLOR = col;
}
