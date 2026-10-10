// A baked land's ground and its sorted tall bands (world/baked_ground.gd, painted by tools/worldgen/bog_bake.py): the
// picture as painted, at 4 screen px a texel. The ground's alpha says what each texel is: 255 land, 254 open water,
// 0 past the zone's edge. The water moves as the tile ground's water moves (shaders/ground_iso.gdshader): its rows
// slide a little against each other in a slow swell, harder in the gust, so the mirror in it trembles; now and then a
// cold glint, a texel at a time. A band's plants (its normal map's alpha below 255) bend in the one wind, more toward
// their tips; the ground under them was baked without them, so a plant leaves no still copy of itself behind.
shader_type canvas_item;

uniform float wind = 0.5;
uniform float gain = 1.0;
uniform bool band = false;          // a tall band (sorted with the bodies), not a ground chunk
// the Red Water (tools/landkit3d/cove_bake.py, index "water": "red"): blood, thick and slow, on a dying heartbeat
// (Derek, 2026-10-09): no glint (nothing glints on it), the slide only in the beat's two surges, a long stillness
// between, the surface darkening a breath as each surge passes
uniform bool red = false;
// the shore field (Derek, 2026-10-09: the ocean "happening on the world, not in the world"): yards inland of the calm
// waterline at each zone tile (tools/landkit3d/cove_export.py). With it the Red is no longer a picture sliding: swells
// run in along the cove's own shape and wrap round what stands in them, steepen and froth in the last yards, and on each
// surge of the heartbeat the swash runs up the real sand as a thin film with a dull froth at its lip, then drains back,
// leaving the sand dark and wet behind it until the next beat
uniform bool has_shore = false;
// a still pool of blood (the opening cave's; Derek, 2026-10-10: it "moves chunky and doesnt look like a smoothly animated
// pool of blood", its drips' ripples "frozen"): no texel ever slides; a slow sheen drifts over the thick surface and it
// breathes a little on the heartbeat; live rings spread where the faces' blood strikes it and wherever a body moves in it
// (world/pool_life.gd fills `rings`: x, y in world px, age in seconds, strength)
uniform bool pool = false;
uniform vec4 rings[12];
uniform sampler2D shore : filter_linear, repeat_disable;
uniform vec2 shore_size = vec2(1.0);
uniform float shore_span = 24.0;
// the pilgrim's lantern, as every prop reads it (core/main.gd sets these each frame; shaders/landkit_lit.gdshader):
// it lights the painted form through its own normal map, so the light rakes across the bone, the boards and the
// stones as the pilgrim walks, and the far side of every vertebra falls into its own shade (MASTER_RULES 0.2)
global uniform vec2 lamp_world;
global uniform float lamp_reach;
global uniform float lamp_night;
global uniform float world_wind;    // the one wind (core/gust.gd via Game.wind)

varying vec2 wpos;
varying float bottom_row;           // a band: the atlas row of its foot (world/baked_ground.gd passes it in the modulate)
varying float bends;                // 1 when the band's normal map marks its plants (a bake without it stands still)

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
	bottom_row = COLOR.r * 16384.0;
	bends = COLOR.g;
}

void fragment() {
	vec2 uv = UV;
	vec4 c = texture(TEXTURE, uv);
	if (band && bends > 0.5) {
		// the plants bend: each texel above a plant's foot is taken from a little upwind, more the higher it stands
		float row = uv.y / TEXTURE_PIXEL_SIZE.y;
		float up = max(bottom_row - row, 0.0);
		float beat = wpos.x * 0.0031 + wpos.y * 0.0017;
		float wave = sin(TIME * 1.3 + beat) * 0.65 + sin(TIME * 2.7 + beat * 2.3) * 0.35;
		float dx = floor((wave * 0.6 + 0.45) * up * 0.05 * (0.4 + world_wind) + 0.5);
		vec2 uv1 = uv - vec2(dx * TEXTURE_PIXEL_SIZE.x, 0.0);
		vec4 c1 = texture(TEXTURE, uv1);
		bool bends1 = c1.a > 0.5 && texture(NORMAL_TEXTURE, uv1).a < 0.99;
		bool bends0 = c.a > 0.5 && texture(NORMAL_TEXTURE, uv).a < 0.99;
		if (bends1) {
			c = c1;
			uv = uv1;
		} else if (bends0) {
			discard;                                      // the plant has bent away from here
		}
		if (c.a < 0.5) discard;
	} else if (band) {
		if (c.a < 0.5) discard;
	} else {
		if (c.a < 0.5) discard;
		if (red && has_shore) {
			// thick blood on a dying heartbeat (Derek, 2026-10-09: "slower and gentler since it's thick blood and a heart
			// beat"): one slow beat, a surge and a weaker one, then a long stillness; the swells barely sag in, the swash
			// creeps up a yard or so and drains back slower than it came, and leaves the sand dark
			vec2 tl = vec2(wpos.x / 72.0 + wpos.y / 36.0, wpos.y / 36.0 - wpos.x / 72.0) * 0.5;
			float din = (texture(shore, tl / shore_size).r - 0.5) * shore_span;
			float P = 6.5;
			float n1 = floor(TIME / P);
			float ph = fract(TIME / P);
			vec2 W = floor(wpos / 4.0);
			float s1 = smoothstep(0.02, 0.22, ph) * (1.0 - smoothstep(0.22, 0.8, ph));
			float s2 = smoothstep(0.3, 0.42, ph) * (1.0 - smoothstep(0.42, 0.85, ph));
			if (c.a < 0.998) {
				// the swells: low, broad, sagging in toward the line only while the heart pushes
				float hc = n1 + 0.6 * smoothstep(0.02, 0.22, ph) + 0.25 * smoothstep(0.3, 0.42, ph);
				float crest = 0.5 + 0.5 * sin(din * 0.45 - hc * 6.2832 + 0.4 * sin(W.x * 0.02 + n1));
				float cr = crest * crest;
				c.rgb *= 0.95 + 0.07 * cr;
				// in the last yard a dull skin gathers on the swell's back, never white
				if (din > -1.5 && cr > 0.85 && vn(vec2(W.x * 0.12, W.y * 0.5) + vec2(n1 * 7.0, 0.0)) > 0.6)
					c.rgb = mix(c.rgb, vec3(0.32, 0.17, 0.17), 0.22);
			} else if (din < 4.0) {
				float rag = 0.85 + 0.3 * vn(vec2(W.x * 0.025, n1 * 3.7));
				float R = (1.5 * s1 + 0.7 * s2) * rag;
				float wetR = 1.5 * rag * (1.0 - smoothstep(0.22, 1.0, ph));
				if (din < R) {
					float lip = R - din;
					c.rgb = mix(c.rgb, vec3(0.13, 0.015, 0.025), clamp(lip / 0.7, 0.35, 0.85));   // the film of blood
					if (lip < 0.18 && s1 + s2 > 0.3)
						c.rgb = mix(c.rgb, vec3(0.3, 0.12, 0.12), 0.3);                      // its blunt lip
				} else if (din < wetR) {
					c.rgb = c.rgb * 0.78 + vec3(0.02, 0.0, 0.002);                       // the sand left wet
				}
			}
		} else if (c.a < 0.998 && red && pool) {
			vec2 W = floor(wpos / 2.0);                     // the 2 x 2 art grid
			float ph = fract(TIME / 3.6);
			float d1 = ph - 0.06;
			float d2 = ph - 0.27;
			float pulse = exp(-d1 * d1 / 0.002) + 0.5 * exp(-d2 * d2 / 0.0012);
			// the sheen: broad, slow, drifting; the thick surface shifting under the fires, never sliding
			float sh = vn(W * 0.045 + vec2(TIME * 0.05, TIME * 0.032)) * 0.65 + vn(W * 0.11 - vec2(TIME * 0.035, TIME * 0.06)) * 0.35;
			c.rgb *= 0.92 + 0.13 * sh - 0.035 * pulse;
			// the rings: each a lifted crest with a dark trough inside, spreading slowly on thick blood, fading
			float lift_ = 0.0;
			for (int i = 0; i < 12; i++) {
				vec4 r = rings[i];
				if (r.w <= 0.0) continue;
				vec2 dv = (W * 2.0 + 1.0) - r.xy;
				float d = length(vec2(dv.x, dv.y * 2.0));
				float R_ = 6.0 + r.z * 46.0;
				float fade = r.w * (1.0 - smoothstep(0.2, 1.7, r.z));
				float x = (d - R_) / 5.0;
				lift_ += fade * (exp(-x * x) - 0.6 * exp(-(x + 1.6) * (x + 1.6)));
			}
			c.rgb *= 1.0 + 0.6 * lift_;
			c.rgb += vec3(0.1, 0.028, 0.026) * max(lift_, 0.0);   // the crest catches the fire: wet, a shade lighter
		} else if (c.a < 0.998 && red) {
			vec2 W = floor(wpos / 4.0);
			float ph = fract(TIME / 3.6);                   // one beat: a surge, a weaker surge, then the stillness
			float d1 = ph - 0.06;
			float d2 = ph - 0.27;
			float pulse = exp(-d1 * d1 / 0.002) + 0.5 * exp(-d2 * d2 / 0.0012);
			// the swell comes IN, toward the beach (down the screen; Derek: "The wave should be coming in not from the
			// side"): on each surge the whole Red heaves a few texels shoreward and slides back in the stillness
			float heave = smoothstep(0.02, 0.12, ph) * (1.0 - smoothstep(0.3, 0.95, ph)) + 0.5 * smoothstep(0.24, 0.31, ph) * (1.0 - smoothstep(0.31, 0.9, ph));
			float dy = floor(heave * 3.0 + 0.5 * sin(W.x * 0.05 + W.y * 0.02));
			vec4 c2 = texture(TEXTURE, uv - vec2(0.0, dy * TEXTURE_PIXEL_SIZE.y));
			if (c2.a > 0.5 && c2.a < 0.998) c = c2;
			// long swell bands travelling in from the open Red, a band a beat, moving only in the surges
			float hc = floor(TIME / 3.6) + 0.3 * ph + 0.5 * smoothstep(0.02, 0.12, ph) + 0.2 * smoothstep(0.24, 0.31, ph);
			float swb = sin(W.y * 0.21 + W.x * 0.025 + 0.6 * sin(W.x * 0.011) - hc * 6.2832);
			c.rgb *= 0.97 - 0.05 * pulse + 0.045 * swb;
		} else if (c.a < 0.998) {
			vec2 W = floor(wpos / 4.0);                     // the painted texel
			float sw = sin(TIME * 0.9 + W.y * 0.21 + W.x * 0.05) + 0.6 * sin(TIME * 1.7 - W.y * 0.37);
			float dx = floor(sw * (0.6 + wind * 0.9));
			vec4 c2 = texture(TEXTURE, uv + vec2(dx * TEXTURE_PIXEL_SIZE.x, 0.0));
			if (c2.a > 0.5 && c2.a < 0.998) c = c2;          // water slides over water only: the bank stays put
			float g = vn(W * 0.35 + vec2(TIME * 0.35, -TIME * 0.2));
			float g2 = hash(W + floor(TIME * 3.0));
			if (g > 0.8 && g2 > 0.95) c.rgb = mix(c.rgb, vec3(0.55, 0.62, 0.72), 0.35);
			c.rgb *= 0.95 + 0.05 * sin(TIME * 1.3 + W.x * 0.08 + W.y * 0.13);
		}
	}
	vec3 n = texture(NORMAL_TEXTURE, uv).rgb;
	if (length(n) > 0.05 && lamp_reach > 1.0) {
		n = n * 2.0 - 1.0;
		n.y = -n.y;
		n = normalize(n);
		vec2 dv = lamp_world - wpos;
		float dist = length(dv * vec2(1.0, 2.0));
		float k = clamp(1.2 - dist / lamp_reach, 0.0, 1.0) * (0.4 + 0.6 * lamp_night);
		float lam = max(0.0, dot(n, normalize(vec3(dv, 140.0))));
		c.rgb *= mix(1.0, 0.74 + 0.5 * lam, k) * mix(vec3(1.0), vec3(1.0, 0.86, 0.68), k * lam * 0.4);
	}
	COLOR = vec4(c.rgb * gain, 1.0);
}
