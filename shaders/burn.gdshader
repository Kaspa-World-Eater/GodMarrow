shader_type canvas_item;
// A body burning out (Derek 2026-10-06: fire comes as "an ember and ash filled corpse or object"). Over the burn
// (0 -> 1): the body chars toward black; cracks of ember open across it, glowing and pulsing, then cooling; from the top
// down it crumbles to ash with a burning lip at the edge. In the sprite's own pixels with the 4x4 ordered dither, as
// the title paints. Works on any sprite (region or atlas): the noise is laid on the texture's own pixel grid.
uniform float burn = 0.0;
uniform float t = 0.0;
uniform float seed = 0.0;
uniform vec4 region = vec4(0.0, 0.0, 1.0, 1.0);   // the frame's UV rect in its sheet: x, y, w, h (top-down crumble)

const float B4[16] = float[](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);

float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + seed * 7.13) * 43758.5453); }
float vn(vec2 p) {
	vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { return vn(p) * 0.55 + vn(p * 2.1 + 11.0) * 0.3 + vn(p * 4.3 + 5.0) * 0.15; }

void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	vec2 tp = floor(UV / TEXTURE_PIXEL_SIZE);                   // the texel, so it all sits on the art's grid
	float d = B4[(int(tp.y) & 3) * 4 + (int(tp.x) & 3)] / 16.0;
	float vy = clamp((UV.y - region.y) / max(region.w, 1e-5), 0.0, 1.0);   // 0 top .. 1 foot of the frame
	// char
	float charr = smoothstep(0.0, 0.3, burn);
	float lum = dot(c.rgb, vec3(0.3, 0.59, 0.11));
	vec3 col = mix(c.rgb, vec3(lum * 0.35, lum * 0.22, lum * 0.18), charr);
	// ember cracks: thin bands where the noise folds; brightest mid-burn, they cool as it ends
	float n = fbm(tp * 0.32);
	float vein = 1.0 - abs(n * 2.0 - 1.0);
	float heat = smoothstep(0.1, 0.35, burn) * (1.0 - smoothstep(0.7, 1.0, burn));
	float pulse = 0.8 + 0.2 * sin(t * 6.0 + n * 12.0);
	float crack = step(0.955 - 0.04 * heat + d * 0.03, vein) * heat * pulse;
	vec3 ember = mix(vec3(0.55, 0.12, 0.04), vec3(1.0, 0.72, 0.32), clamp(vein * 1.4 - 0.4, 0.0, 1.0));
	col = mix(col, ember, crack);
	// crumble to ash from the top: the line falls with the burn, ragged; a burning lip just below it
	float line = smoothstep(0.6, 1.0, burn) * 1.2 + (fbm(tp * 0.25 + 3.0) - 0.5) * 0.25;
	float gone = line - vy;
	if (gone > d * 0.08) {
		c.a = 0.0;
	} else if (gone > -0.05) {
		col = mix(vec3(1.0, 0.55, 0.18), vec3(0.4, 0.38, 0.36), step(0.5, d));   // the lip: ember and grey ash
	}
	COLOR = vec4(col, c.a);
}
