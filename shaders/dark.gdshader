// The dark layer, ported from the web build's zz_zx_dark64.js: the scene is drawn, then darkness is laid over it with
// holes cut where light falls. In a pool's heart the painted colours show untouched; the dark rises in four gentle
// steps to the rim (with a faint bright ring just inside it), then keeps gathering out to `far` x the radius, where it
// settles at the open dark (never full black). Walls, trunks and stones stop the lantern's light: behind them the dark
// stays. The darkness is quantised to 12 steps with a 4x4 Bayer dither in 4-px cells. Each pool breathes a little of
// its own colour over the scene (an overlay tint), so the lamp reads warm or ghostly against the cold.
shader_type canvas_item;

uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform int n_holes = 0;
uniform vec4 hA[48];     // x, y (window px), r (px, semi-major), far
uniform vec4 hB[48];     // core, ring, w (tint weight), shadowed (1 if it has occluders)
uniform vec4 hC[48];     // rgb 0..1, floor (the least dark this pool can leave: faint lights never clear the dark)
uniform vec4 hD[48];     // lift (how much the flame's own colour pours over what it lights, the web's light map), 0, 0, 0
uniform int n_occ = 0;
uniform vec4 occ[128];   // a.xy, b.xy of an occluding edge (window px)
uniform float occ_h[128];// which hole it belongs to
uniform float dark_a = 0.82;
uniform vec3 dark_rgb = vec3(0.031, 0.051, 0.106);
uniform float tint_a = 0.25;
uniform float cell = 4.0;
uniform vec3 amb = vec3(1.0);        // the land's shade by the hour (the web's ambient), lifted inside the pools
uniform float amb_lift = 0.35;      // how much of the plain colour the open dark keeps          // dither cell in window px (one web art px)

const float BAY[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

float cross2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }

// does the segment L->P cross the edge A-B?
bool crosses(vec2 L, vec2 P, vec2 A, vec2 B) {
	vec2 r = P - L;
	vec2 s = B - A;
	float den = cross2(r, s);
	if (abs(den) < 1e-5) return false;
	vec2 q = A - L;
	float t = cross2(q, s) / den;
	float u = cross2(q, r) / den;
	return t > 0.0 && t < 1.0 && u >= 0.0 && u <= 1.0;
}

float overlay_ch(float b, float t) {
	return b < 0.5 ? 2.0 * b * t : 1.0 - 2.0 * (1.0 - b) * (1.0 - t);
}

void fragment() {
	// the dark is reckoned once per art pixel (a cell), like the web's dark map, so its edges are pixel-art chunky
	vec2 p = (floor(FRAGCOORD.xy / cell) + 0.5) * cell;
	vec3 scene = texture(screen_tex, SCREEN_UV).rgb;
	float dark = 1.0;
	float warm = 0.0;
	vec3 wc = vec3(0.0);
	vec3 lift = vec3(0.0);
	for (int i = 0; i < n_holes; i++) {
		vec4 a = hA[i];
		float r = a.z;
		float far = a.w;
		vec2 dd = vec2((p.x - a.x) / r, (p.y - a.y) / (r * 0.56));
		float d = length(dd);
		if (d >= far) continue;
		vec4 b = hB[i];
		float core = b.x;
		float v;
		float band;
		if (d < core) {
			v = 0.0;
			band = 1.0;
		} else if (d < 1.0) {
			float u = (d - core) / (1.0 - core);
			float q = u * 3.0;
			float fi = floor(q);
			float f = q - fi;
			float r0 = max(0.0, (f - 0.86) / 0.14);
			float s = fi + r0 * r0 * (3.0 - 2.0 * r0);
			v = 0.64 * pow(s / 3.0, 1.15);
			band = 1.0 - u * u;
			if (b.y > 0.0) {
				float rg = exp(-pow((d - 0.9) / 0.06, 2.0)) * b.y;
				v = max(0.0, v - rg);
				band = max(band, rg * 2.2);
			}
		} else {
			float u = (d - 1.0) / (far - 1.0);
			v = 0.64 + 0.36 * pow(u, 0.6);
			band = 0.0;
		}
		if (b.w > 0.5) {
			for (int k = 0; k < n_occ; k++) {
				if (int(occ_h[k]) != i) continue;
				vec4 e = occ[k];
				if (crosses(a.xy, p, e.xy, e.zw)) {
					float sf = d <= 1.0 ? 0.9 : max(0.0, 0.9 * (1.0 - (d - 1.0) / (far - 1.0) * 1.6));
					v = v + (1.0 - v) * sf;
					band *= 1.0 - sf;
					break;
				}
			}
		}
		v = max(v, hC[i].w);
		if (v < dark) dark = v;
		if (hD[i].x > 0.0) lift = max(lift, hC[i].rgb * hD[i].x * (1.0 - v / 0.64 * 0.85) * step(v, 0.99));
		band *= b.z;
		if (band > warm) {
			warm = band;
			wc = hC[i].rgb;
		}
	}
	ivec2 c = ivec2(floor(FRAGCOORD.xy / cell));
	float th = (BAY[(c.y & 3) * 4 + (c.x & 3)] + 0.5) / 16.0;
	float vq = min(1.0, floor(dark * 12.0 + th) / 12.0);
	// the lamp's breath of colour (overlay blend), then the dark over it
	vec3 shade = mix(amb, vec3(1.0), amb_lift);
	// the flame's colour shifts what it lights toward itself (warmer, not brighter: pale stone must not burn white)
	vec3 col = scene * mix(shade, vec3(1.0), 1.0 - dark) * (vec3(1.0) + lift * 1.2 - vec3(max(max(lift.r, lift.g), lift.b)) * 0.6);
	if (warm > 0.0) {
		float ta = tint_a * 0.5 * warm;
		vec3 ov = vec3(overlay_ch(scene.r, wc.r), overlay_ch(scene.g, wc.g), overlay_ch(scene.b, wc.b));
		col = mix(col, ov, ta);
	}
	col = mix(col, dark_rgb, dark_a * vq);
	COLOR = vec4(col, 1.0);
}
