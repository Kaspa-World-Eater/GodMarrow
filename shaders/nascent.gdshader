// The new pilgrim before the cards have made it (Derek, 2026-10-10: "a suggestion of a person ... gore covered and thus
// undefined", until the last card is drawn): the calling's own sprite and motion, so it walks and turns as a body, but
// drawn as a shape of blood. Every detail flattened into three dark tones of blood by how light the sprite was there,
// a wet sheen running slowly down it in thin streaks, and its outline ragged and never still, eaten at the edge, so
// nothing of the calling (its armour, its weapon, its face) can be told. Set on the hero's sprite by core/main.gd.
shader_type canvas_item;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	if (c.a < 0.5) discard;
	vec2 px = TEXTURE_PIXEL_SIZE;
	vec2 cell = floor(UV / px);
	// the edge: any of the near pixels empty
	float edge = 0.0;
	for (int i = 0; i < 4; i++) {
		vec2 o = vec2(i == 0 ? 2.0 : (i == 1 ? -2.0 : 0.0), i == 2 ? 2.0 : (i == 3 ? -2.0 : 0.0));
		if (texture(TEXTURE, UV + o * px).a < 0.5) edge = 1.0;
	}
	// the outline eaten away, a little differently every few frames: undefined, never still
	if (edge > 0.5 && hash(cell + floor(TIME * 5.0)) > 0.55) discard;
	float lum = dot(c.rgb, vec3(0.3, 0.59, 0.11));
	vec3 col = lum < 0.2 ? vec3(0.09, 0.016, 0.022) : (lum < 0.45 ? vec3(0.2, 0.03, 0.04) : vec3(0.34, 0.07, 0.065));
	// the wet edge that is left catches whatever light there is: a dull red rim, so it reads as a shape, not a hole
	if (edge > 0.5) col = vec3(0.42, 0.1, 0.09);
	// the wet: thin streaks of sheen running slowly down, each column its own
	float colk = hash(vec2(floor(cell.x / 2.0), 7.0));
	float run = fract(UV.y / px.y * 0.025 - TIME * (0.18 + 0.2 * colk) + colk * 9.0);
	float sheen = smoothstep(0.9, 1.0, run) * step(0.55, colk);
	col += vec3(0.22, 0.05, 0.05) * sheen;
	COLOR = vec4(col, 1.0);
}
