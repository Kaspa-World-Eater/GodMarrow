// A live 3D body's own surface (entities/body3d.gd): the glb's baked textures (colour, roughness, the fine grain's
// normal) on the game's terms, and the pool's surface: nothing below `surface_y` (world metres in the body's little
// world) is drawn, so it comes up out of the blood with a true waterline, and just above the line it is darker and wet.
shader_type spatial;
render_mode cull_back, depth_draw_opaque;

uniform vec4 albedo : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear;   // no mipmaps: at the game.s size they bled the black between the bake.s islands into seams
uniform bool has_albedo_tex = false;
uniform sampler2D rough_tex : hint_roughness_g, filter_linear;
uniform bool has_rough_tex = false;
uniform float rough = 0.5;
uniform sampler2D normal_tex : hint_normal, filter_linear;
uniform bool has_normal_tex = false;
uniform float surface_y = -100.0;
uniform float stroke = 0.22;          // the dry-brush strokes' strength on the colour (pass 10)
uniform float tooth = 0.07;

varying float wy;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void vertex() {
	wy = (MODEL_MATRIX * vec4(VERTEX, 1.0)).y;
}

void fragment() {
	if (wy < surface_y) discard;
	vec3 c = albedo.rgb;
	if (has_albedo_tex) c *= texture(albedo_tex, UV).rgb;
	float wl = 1.0 - smoothstep(0.0, 0.07, wy - surface_y);
	// the paint, fixed to the skin (pass 10): dry-brush strokes long along the limb (UV2: along and around the bone
	// that carries the skin, newborn3d.py stroke_uv), and a fine tooth on the bake's own UV
	float st = vnoise(vec2(UV2.x * 2.2, UV2.y * 46.0)) - 0.5;
	float th = hash(floor(UV * 900.0)) - 0.5;
	c *= 1.0 + st * stroke + th * tooth;
	ALBEDO = mix(c, c * 0.55, wl);
	float r = has_rough_tex ? texture(rough_tex, UV).g : rough;
	ROUGHNESS = mix(r, 0.1, wl);
	if (has_normal_tex) NORMAL_MAP = texture(normal_tex, UV).rgb;
	SPECULAR = 0.4;
}
