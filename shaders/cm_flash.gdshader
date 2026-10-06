shader_type canvas_item;
// A Cursemark body, lit (the title's lesson: forms are lit, not flat): its own normal map shaded by the pilgrim's
// lantern (warm, from where the lantern stands) and a faint cold sky from high on the left, kept gentle: a slight
// relief, never plastic. A struck body turns white for a blink, as Cursemark flashes it. Bone growth crusts it
// (shaders/ossify.gdshader holds the same block alone, for other sprites).
uniform float flash = 0.0;
uniform vec3 lamp_dir = vec3(0.0, 0.0, 1.0);   // toward the lantern, screen space (x right, y down), z out of the screen
uniform float lamp_k = 0.0;                    // how near and bright the lantern is to this body, 0..1
uniform float sky_k = 0.3;                     // the cold of the sky / the vault
uniform bool face_left = false;
uniform float unmade = 0.0;         // 0..1 absence: holes of nothing eaten into the body
uniform float erase = 0.0;          // 0..1 radiance: the body washed out to white-gold, features first
uniform float mstain = 0.0;         // 0..1 the miasma's violet stain climbing from the feet
uniform float veins = 0.0;          // 0..1 dark veins swelling and pulsing (blood magic)
uniform float corrode = 0.0;         // 0..1 acid pitting
uniform float frost = 0.0;           // 0..1 the glaze of ice climbing from the feet
uniform float growth = 0.0;          // bone growth (shaders/ossify.gdshader's method): 0..1 of the body crusted
uniform vec2 origin = vec2(0.5, 0.5);
uniform float dead_k = 0.0;
uniform float oseed = 0.0;
uniform vec4 region = vec4(0.0, 0.0, 1.0, 1.0);

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + oseed * 7.7) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 5.0) * 0.3 + vn(p * 4.3 + 9.0) * 0.15; }


void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	vec3 n = texture(NORMAL_TEXTURE, UV).rgb;
	if (length(n) > 0.05) {
		n = n * 2.0 - 1.0;
		n.y = -n.y;                                  // the maps' green points up the screen
		if (face_left) n.x = -n.x;                   // a flipped body turns its normals with it
		n = normalize(n);
		float lam = max(0.0, dot(n, normalize(lamp_dir)));
		float sky = max(0.0, dot(n, normalize(vec3(-0.6, -0.7, 0.4))));
		// the side toward the lantern takes its warmth; the side away sinks; the sky's edge is a faint cold rim
		float shade = mix(1.0, 0.72 + 0.55 * lam, lamp_k);
		vec3 warm = vec3(1.0, 0.86, 0.68);
		c.rgb *= shade * mix(vec3(1.0), warm, lamp_k * lam * 0.45);
		c.rgb += vec3(0.55, 0.65, 0.9) * pow(sky, 3.0) * sky_k * 0.18;
	}
	if (growth > 0.0 || dead_k > 0.0) {
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
			// the ghost-light in it (as Diablo II's bone spells): a pale cyan breath along the crust, pulsing
			col += vec3(0.22, 0.36, 0.42) * (0.55 + 0.45 * sin(TIME * 3.0 + lp * 8.0)) * smoothstep(0.0, 0.25, inside);
			}
		}
		// breaking apart when calcified dead: pieces along the cracks fall away from the top down
		if (dead_k > 0.0) {
			col = mix(col, vec3(0.72, 0.74, 0.78) * (0.7 + 0.35 * fbm(tp * 0.16)), smoothstep(0.0, 0.3, dead_k));
			float piece = fbm(floor(tp / 3.0) * 0.7 + 2.0);              // chunky pieces, not pixels
			float line = smoothstep(0.35, 1.0, dead_k) * 1.3 - (1.0 - fu.y) * 0.0;
			if (piece + fu.y * 0.6 < line) c.a = 0.0;
		}
		c.rgb = col;
	}
	if (unmade > 0.0 && c.a > 0.0) {
		vec2 tu = floor(UV / TEXTURE_PIXEL_SIZE);
		float hole = vn(tu * 0.16 + vec2(oseed * 7.0, TIME * 0.15)) * 0.7 + vn(tu * 0.4 + 9.0) * 0.3;
		float th = 1.0 - unmade * 0.75;
		if (hole > th + 0.04) c.rgb = vec3(0.02, 0.012, 0.03);
		else if (hole > th) c.rgb = vec3(0.38, 0.32, 0.5);
	}
	if (erase > 0.0 && c.a > 0.0) {
		vec2 te = floor(UV / TEXTURE_PIXEL_SIZE);
		float le = dot(c.rgb, vec3(0.3, 0.59, 0.11));
		float de = B4[(int(te.y) & 3) * 4 + (int(te.x) & 3)] / 16.0;
		// Derek: like the miasma's stain, it climbs the body from the feet; behind its edge the dark goes first
		float ey = clamp((UV.y - region.y) / max(region.w, 1e-5), 0.0, 1.0);
		float edge = 1.0 - erase * 1.05 + (vn(te * 0.2 + 3.0) - 0.5) * 0.24 + sin(te.x * 0.9 + TIME * 6.0) * 0.025;
		float below = ey - edge;
		if (below > 0.0) {
			float amt = clamp(below * 5.0 + (1.0 - le) * 0.35, 0.0, 1.0);
			float lift = le * (1.0 - amt) + amt;
			vec3 wg = lift > 0.85 ? vec3(1.0, 0.99, 0.93) : lift > 0.65 ? vec3(1.0, 0.89, 0.62) : lift > 0.45 ? vec3(0.9, 0.7, 0.38) : vec3(0.58, 0.4, 0.2);
			if (amt > de) c.rgb = wg;
			if (below < 0.035) c.rgb = vec3(1.0, 1.0, 0.96);                        // its burning lip, white fire
		} else if (below > -0.05 && de < 0.5 + 0.5 * sin(TIME * 9.0 + te.x)) {
			c.rgb = mix(c.rgb, vec3(1.0, 0.86, 0.5), 0.55);                          // the glare reaching just ahead of it
		}
	}
	if (mstain > 0.0 && c.a > 0.0) {
		vec2 ts = floor(UV / TEXTURE_PIXEL_SIZE);
		float sy = clamp((UV.y - region.y) / max(region.w, 1e-5), 0.0, 1.0);
		float edge = 1.0 - mstain * 0.95 + (vn(ts * 0.18 + 5.0) - 0.5) * 0.22 + sin(ts.x * 0.7 + TIME * 1.3) * 0.02;
		if (sy > edge) {
			float l3 = dot(c.rgb, vec3(0.3, 0.59, 0.11));
			vec3 bruise = mix(vec3(0.1, 0.07, 0.24), vec3(0.44, 0.38, 0.74), clamp(l3 * 1.5, 0.0, 1.0));
			float blot = vn(ts * 0.35 + 17.0);
			if (blot > 0.72) bruise *= 0.6;                                    // darker blotches in it
			c.rgb = mix(c.rgb, bruise, 0.7);
			if (sy - edge < 0.03) c.rgb = mix(c.rgb, vec3(0.6, 0.52, 1.0), 0.55 + 0.25 * sin(TIME * 2.2));   // its creeping lip, faintly lit
		}
	}
	if (veins > 0.0 && c.a > 0.0) {
		vec2 tv = floor(UV / TEXTURE_PIXEL_SIZE);
		float vv = 1.0 - abs(vn(tv * 0.22 + 7.0) * 2.0 - 1.0);
		float beat = pow(0.5 + 0.5 * sin(TIME * 7.0), 3.0);
		if (vv > 0.92 - veins * 0.08) c.rgb = mix(c.rgb, mix(vec3(0.28, 0.02, 0.05), vec3(0.85, 0.12, 0.12), beat * veins), 0.8);
	}
	if (corrode > 0.0) {
		vec2 tq2 = floor(UV / TEXTURE_PIXEL_SIZE);
		float pit = vn(tq2 * 0.45 + 31.0);
		if (pit > 1.0 - corrode * 0.55) {
			float deep = (pit - (1.0 - corrode * 0.55)) / max(0.01, corrode * 0.55);
			c.rgb = deep > 0.5 ? vec3(0.08, 0.1, 0.03) : mix(c.rgb * 0.5, vec3(0.5, 0.75, 0.12), 0.7);   // the pit, its sizzling rim
		}
	}
	if (frost > 0.0) {
		vec2 tq = floor(UV / TEXTURE_PIXEL_SIZE);
		float dq = B4[(int(tq.y) & 3) * 4 + (int(tq.x) & 3)] / 16.0;
		float fy = clamp((UV.y - region.y) / max(region.w, 1e-5), 0.0, 1.0);
		float line = 1.0 - frost * 1.1 + (vn(tq * 0.3) - 0.5) * 0.15;
		if (fy > line) {
			float l2 = dot(c.rgb, vec3(0.3, 0.59, 0.11));
			vec3 ice = mix(vec3(0.2, 0.36, 0.62), vec3(0.7, 0.88, 1.0), clamp(l2 * 1.6 + dq * 0.3, 0.0, 1.0));
			c.rgb = mix(c.rgb, ice, 0.75);
			if (fy < line + 0.03) c.rgb = vec3(0.95, 0.98, 1.0);       // the climbing rim
		}
	}
	COLOR = vec4(mix(c.rgb, vec3(1.0), flash), c.a);
}
