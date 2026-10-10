// A live 3D body's picture (entities/body3d.gd) made the game's pixel art: hard edges (no half-alpha), the dark
// outline the sprite heroes carry (#08060a, as PixelForge's), and each colour stepped to a few tones of form so the
// smooth render reads as painted pixels.
shader_type canvas_item;

uniform float steps = 7.0;
const vec3 OUTLINE = vec3(0.031, 0.024, 0.039);

float a_at(sampler2D tex, vec2 uv) {
	return texture(tex, uv).a;
}

void fragment() {
	vec2 px = TEXTURE_PIXEL_SIZE;
	float a = a_at(TEXTURE, UV);
	if (a < 0.5) {
		// the outline: an empty pixel beside a solid one
		float n = max(max(a_at(TEXTURE, UV + vec2(px.x, 0.0)), a_at(TEXTURE, UV - vec2(px.x, 0.0))),
					  max(a_at(TEXTURE, UV + vec2(0.0, px.y)), a_at(TEXTURE, UV - vec2(0.0, px.y))));
		if (n < 0.5) discard;
		COLOR = vec4(OUTLINE, 1.0);
	} else {
		vec3 c = texture(TEXTURE, UV).rgb;
		// the tones of form: the value stepped, the hue kept
		float v = max(max(c.r, c.g), c.b);
		float vs = floor(v * steps + 0.5) / steps;
		c = (v > 0.0001) ? c * (max(vs, 0.5 / steps) / v) : c;
		COLOR = vec4(c, 1.0);
	}
}
