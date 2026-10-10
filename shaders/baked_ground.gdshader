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
uniform bool live_sea = false;          // the Red drawn live in 3D over this (world/red_sea.gd): no painted swash
// a still pool of blood (the opening cave's; Derek, 2026-10-10: it "moves chunky and doesnt look like a smoothly animated
// pool of blood", its drips' ripples "frozen"): no texel ever slides; a slow sheen drifts over the thick surface and it
// breathes a little on the heartbeat; live rings spread where the faces' blood strikes it and wherever a body moves in it
// (world/pool_life.gd fills `rings`: x, y in world px, age in seconds, strength)
// the fires relight the painted form (Derek, 2026-10-10: "the torch light of the faces and walls doesnt seem to create
// depth or shadow movement as the flicker"): each near fire (world/live_flames.gd) lights the carvings it faces through
// their normal maps, its shading swelling and guttering with the flame's breath, and its source jittering a few pixels
// with the flicker, so the shadows in the eyes, the mouths and the folds shift as torchlight's do
uniform int n_fires = 0;
uniform vec4 fires[16];        // x, y (world px of the flame), height (px), reach (px)
uniform vec4 fire_f[16];       // breath (about 0.8 to 1.2), jitter x, jitter y (px), 0
uniform bool pool = false;
uniform sampler2D pool_state : filter_nearest;   // the simulated surface (world/pool_life.gd, shaders/pool_sim.gdshader)
uniform sampler2D pool_field : filter_linear;    // R, G its flow; B the blood mask (pool_sim.png)
uniform vec4 pool_rect = vec4(0.0, 0.0, 1.0, 1.0);   // the simulated area, world px
uniform vec2 pool_cells = vec2(192.0, 96.0);
uniform float pool_level = 0.0;      // the tide: -1 drained down, +1 welled up
uniform float pool_welling = 0.0;    // rising (+) or sinking (-)
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

// what lies in the blood at a point (strokes, clots, skin): sampled where the flow has carried it
float pool_pat(vec2 q, float T) {
	vec2 wd = normalize(vec2(1.0, 0.35));
	vec2 ax = vec2(dot(q, wd), dot(q, vec2(-wd.y, wd.x)));
	float stroke = vn(vec2(ax.x * 0.012 - T * 0.25, ax.y * 0.16));
	float stroke2 = vn(vec2(ax.x * 0.03 + T * 0.4, ax.y * 0.3 + 5.0));
	float v = (stroke - 0.5) * 0.18 + (stroke2 - 0.5) * 0.05;
	float clot = vn(q * 0.035 + 40.0);
	if (clot > 0.76) v -= 0.12;
	float wr = 1.0 - abs(vn(q * 0.06) * 2.0 - 1.0);
	if (wr > 0.92) v += 0.08;
	return v;
}

float pool_dec(vec2 uv) {
	vec4 v = texture(pool_state, uv);
	return v.r;                                     // (a float target: the height as it is)
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
		if (red && has_shore && !live_sea) {
			// thick blood on a dying heartbeat (Derek, 2026-10-09: "slower and gentler since it's thick blood and a heart
			// beat"): one slow beat, a surge and a weaker one, then a long stillness; the swells barely sag in, the swash
			// creeps up a yard or so and drains back slower than it came, and leaves the sand dark
			vec2 tl = vec2(wpos.x / 72.0 + wpos.y / 36.0, wpos.y / 36.0 - wpos.x / 72.0) * 0.5;
			float din = (texture(shore, tl / shore_size).r - 0.5) * shore_span;
			// (2026-10-10, Derek: the swash "just looks like a line of jello, needs way more realisticness and some foam,
			// you can increase the speed a bit"; "the surf also have a low pixel look"): the beat a little quicker (5.2 s;
			// core/sfx.gd _red_surge keeps step); every mark on the 2 x 2 art grid; the film thin at its lip with the wet
			// sand showing through it, thickening seaward, a sheen of the sky on it; a dirty froth riding its lip, broken,
			// heaviest in the surge, left in scraps as it drains; foam lines on the swells' backs in the last two yards
			// running in; and the film laid over the last half yard of the sea's own texels too, so the water's edge is
			// the swash's soft line and never the bake's staircase
			float P = 5.2;
			float n1 = floor(TIME / P);
			float ph = fract(TIME / P);
			vec2 W = floor(wpos / 2.0);
			float s1 = smoothstep(0.02, 0.22, ph) * (1.0 - smoothstep(0.22, 0.8, ph));
			float s2 = smoothstep(0.3, 0.42, ph) * (1.0 - smoothstep(0.42, 0.85, ph));
			float rag = 0.8 + 0.35 * vn(vec2(W.x * 0.03 + W.y * 0.015, n1 * 3.7)) + 0.12 * vn(W * 0.12 + vec2(n1 * 5.0, 0.0));
			float R = (1.5 * s1 + 0.7 * s2) * rag;
			float wetR = 1.6 * rag * (1.0 - smoothstep(0.22, 1.0, ph));
			float surge = s1 + 0.6 * s2;
			vec3 film = vec3(0.12, 0.014, 0.022);
			if (c.a < 0.998 && din < -0.6) {
				// the swells: low, broad, sagging in toward the line only while the heart pushes
				float hc = n1 + 0.6 * smoothstep(0.02, 0.22, ph) + 0.25 * smoothstep(0.3, 0.42, ph);
				float crest = 0.5 + 0.5 * sin(din * 0.45 - hc * 6.2832 + 0.4 * sin(W.x * 0.02 + n1));
				float cr = crest * crest;
				c.rgb *= 0.95 + 0.07 * cr;
				// foam lines on the swells' backs in the last two yards, broken, carried in on the surge
				if (din > -2.4 && cr > 0.82 && vn(vec2(W.x * 0.09, W.y * 0.32) + vec2(n1 * 7.0, hc * 2.0)) > 0.52)
					c.rgb = mix(c.rgb, vec3(0.4, 0.26, 0.26), 0.35 + 0.25 * surge);
			} else if (din < 4.0) {
				if (din < R) {
					// the film: thin at the lip (the wet sand through it), thicker seaward, the sky's sheen on it
					float depth = R - din;
					float a = clamp(0.3 + depth / 0.9, 0.3, 0.9);
					vec3 under = c.rgb * 0.62;
					c.rgb = mix(under, film, a);
					float sheen = vn(vec2(W.x * 0.05, W.y * 0.2) + vec2(TIME * 0.18, 0.0));
					c.rgb += vec3(0.07, 0.03, 0.035) * smoothstep(0.6, 0.85, sheen) * (1.0 - a * 0.5);
					// the froth riding the lip: a ragged band, broken by its own noise, heaviest in the surge
					float fr = vn(W * 0.22 + vec2(n1 * 9.0, 0.0)) * 0.6 + vn(W * 0.55 - vec2(0.0, n1 * 4.0)) * 0.4;
					float fband = 1.0 - smoothstep(0.08, 0.32 + 0.2 * surge, depth);
					if (fr * fband > 0.32 - 0.12 * surge)
						c.rgb = mix(c.rgb, vec3(0.46, 0.31, 0.3), 0.55 + 0.25 * fband);
				} else if (din < wetR) {
					c.rgb = c.rgb * 0.74 + vec3(0.02, 0.0, 0.002);                       // the sand left wet
					// scraps of froth left behind as the film drains, fading
					float fr = vn(W * 0.3 + vec2(n1 * 9.0, 0.0));
					if (din < wetR * 0.8 && fr > 0.72 && ph < 0.75)
						c.rgb = mix(c.rgb, vec3(0.36, 0.24, 0.24), 0.4 * (1.0 - ph));
				}
			} else {
				// (the sea's own texels within half a yard of the line: covered by the film, so no staircase shows)
			}
			if (c.a < 0.998 && din >= -0.6 && din < 0.2) {
				float a = clamp(0.55 + (-din) * 0.5, 0.55, 0.85);
				c.rgb = mix(c.rgb, film, a);
			}
		} else if (c.a > 0.998 && red && pool) {
			// the shore and the stumps: as the blood wells up it creeps up over their feet in a thin dark film and draws
			// back as it sinks, leaving them wet (the mask's soft edge, read further out the higher the tide)
			vec2 su0 = (wpos - pool_rect.xy) / pool_rect.zw;
			if (su0.x > 0.0 && su0.y > 0.0 && su0.x < 1.0 && su0.y < 1.0) {
				float m = texture(pool_field, su0).b;
				float reach = 0.62 - 0.32 * pool_level;
				if (m > reach) {
					float th = clamp((m - reach) / 0.12, 0.0, 1.0);
					c.rgb = mix(c.rgb * 0.62, vec3(0.16, 0.02, 0.03) * (0.6 + max(max(c.r, c.g), c.b) * 1.8), 0.35 + 0.5 * th);
				} else if (m > reach - 0.1 - 0.08 * max(-pool_welling, 0.0) * 6.0) {
					c.rgb *= 0.78;                              // wet, where the blood has just drawn back
				}
			}
		} else if (c.a < 0.998 && red && pool) {
			// the pool from its simulation (world/pool_life.gd): its height read from the wave field, so every swell from
			// the spring, every fall of the faces' blood, every step and the wake round a wading body is a real wave,
			// reflected by the stumps and the shore; lit by the surface's slope (crests toward the fires lit, troughs in
			// shade, a dull glint on the steepest faces), the blood's pattern refracted by the slope and carried along
			// the field's flow, out from where the faces pour and round the stumps; all on the 2 x 2 grid
			vec2 W = floor(wpos / 2.0);
			vec2 wp = W * 2.0 + 1.0;
			float lum = max(max(c.r, c.g), c.b);
			vec2 su = (wp - pool_rect.xy) / pool_rect.zw;
			vec2 cpx = 1.0 / pool_cells;
			float h0 = pool_dec(su);
			float hx = pool_dec(su + vec2(cpx.x, 0.0)) - pool_dec(su - vec2(cpx.x, 0.0));
			float hy = pool_dec(su + vec2(0.0, cpx.y)) - pool_dec(su - vec2(0.0, cpx.y));
			vec2 grad = vec2(hx, hy) * 0.5;
			vec3 nrm = normalize(vec3(-grad.x * 5.0, -grad.y * 5.0, 1.0));   // the heavy swells' slopes
			vec4 fld = texture(pool_field, su);
			vec2 flow = (fld.rg - 0.5) * 2.0;
			// the flow: two phases of the flow cross-faded so it never stretches (a flow map); the pattern refracted
			float T = TIME * 0.35;
			vec2 q = wp + grad * 22.0;
			vec2 fl = flow * vec2(1.0, 0.5) * 50.0;
			// the flow runs out from the faces and the heart as the blood wells up, and is drawn back as it sinks
			fl *= clamp(0.35 + pool_welling * 2.5, -1.0, 1.0);
			float f1 = fract(TIME * 0.03);                   // slow: thick blood creeping, not water running
			float f2 = fract(TIME * 0.03 + 0.5);
			float pa = pool_pat(q - fl * f1, T);
			float pb = pool_pat(q - fl * f2 + 17.0, T);
			float v = 0.22 + mix(pa, pb, abs(1.0 - 2.0 * f1));
			// streaks drawn out along a fast flow: the fresh blood from the faces running across the old
			float fm = length(flow);
			float streak = vn(vec2(dot(q - fl * f1, normalize(flow + 1e-4)) * 0.02, dot(q - fl * f1, vec2(-flow.y, flow.x) / max(fm, 1e-4)) * 0.22));
			v += (streak - 0.5) * 0.08 * smoothstep(0.15, 0.6, fm);
			// lit by its own slope: the fires' side (upper left) lifts, the far side falls
			vec3 L = normalize(vec3(-0.55, -0.45, 0.7));
			v += (dot(nrm, L) - L.z) * 0.9;
			vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));
			float spec = pow(max(dot(nrm, Hh), 0.0), 60.0);
			v += step(0.5, spec) * 0.2 * smoothstep(0.12, 0.5, lum * 3.0);
			// the pigment pooled dark toward the edge (the mask's soft edge)
			v -= 0.14 * (1.0 - smoothstep(0.35, 0.9, fld.b));
			float dth = (float((int(W.x) % 4) * 4 + (int(W.y) % 4)) + 0.5) / 16.0;
			float lv = clamp(v + (dth - 0.5) * 0.06, 0.0, 1.0);
			vec3 bc = lv > 0.6 ? vec3(0.52, 0.1, 0.1) : (lv > 0.43 ? vec3(0.36, 0.05, 0.06) : (lv > 0.27 ? vec3(0.22, 0.025, 0.04) : vec3(0.1, 0.012, 0.02)));
			c.rgb = bc * clamp(0.72 + lum * 1.5, 0.65, 1.45);
		} else if (c.a < 0.998 && red) {
			vec2 W = floor(wpos / 4.0);   // 2x2-debt: the Sunken Bog's old bake is at 4 px a texel; its water moves on its own texels until its rebuild
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
			vec2 W = floor(wpos / 4.0);   // 2x2-debt: the Sunken Bog's old bake is at 4 px a texel; its water moves on its own texels until its rebuild                     // the painted texel
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
	if (length(n) > 0.05 && n_fires > 0) {
		vec3 nf = n * 2.0 - 1.0;
		nf.y = -nf.y;
		nf = normalize(nf);
		for (int i = 0; i < 16; i++) {
			if (i >= n_fires) break;
			vec4 F = fires[i];
			vec2 dv = F.xy + fire_f[i].yz - wpos;
			float k = clamp(1.0 - length(dv * vec2(1.0, 2.0)) / F.w, 0.0, 1.0);
			k *= k;
			if (k <= 0.0) continue;
			float lam = max(0.0, dot(nf, normalize(vec3(dv, F.z))));
			float br = fire_f[i].x;
			c.rgb *= 1.0 + k * ((lam - 0.42) * 0.75 + (br - 1.0) * 1.4 * (0.3 + lam));
		}
	}
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
