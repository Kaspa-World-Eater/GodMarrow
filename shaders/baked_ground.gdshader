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
		if (c.a < 0.998) {
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
