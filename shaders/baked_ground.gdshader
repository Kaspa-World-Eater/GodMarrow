// A baked land's ground (world/baked_ground.gd, painted by tools/worldgen/bog_bake.py): the picture as painted, at
// 4 screen px a texel. Its alpha says what each texel is: 255 land, 254 open water, 0 past the zone's edge. The water
// moves as the tile ground's water moves (shaders/ground_iso.gdshader): its rows slide a little against each other in
// a slow swell, harder in the gust, so the mirror in it trembles; now and then a cold glint, a texel at a time.
shader_type canvas_item;

uniform float wind = 0.5;
uniform float gain = 1.0;

varying vec2 wpos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void vertex() { wpos = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy; }

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	if (c.a < 0.5) discard;
	if (c.a < 0.998) {
		vec2 W = floor(wpos / 4.0);                         // the painted texel
		float sw = sin(TIME * 0.9 + W.y * 0.21 + W.x * 0.05) + 0.6 * sin(TIME * 1.7 - W.y * 0.37);
		float dx = floor(sw * (0.6 + wind * 0.9));
		vec4 c2 = texture(TEXTURE, UV + vec2(dx * TEXTURE_PIXEL_SIZE.x, 0.0));
		if (c2.a > 0.5 && c2.a < 0.998) c = c2;              // water slides over water only: the bank stays put
		float g = vn(W * 0.35 + vec2(TIME * 0.35, -TIME * 0.2));
		float g2 = hash(W + floor(TIME * 3.0));
		if (g > 0.8 && g2 > 0.95) c.rgb = mix(c.rgb, vec3(0.55, 0.62, 0.72), 0.35);
		c.rgb *= 0.95 + 0.05 * sin(TIME * 1.3 + W.x * 0.08 + W.y * 0.13);
	}
	COLOR = vec4(c.rgb * gain, 1.0);
}
