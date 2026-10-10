// A live 3D body's own surface (entities/body3d.gd): the glb's baked textures (colour, roughness, the fine grain's
// normal) on the game's terms, and the pool's surface: nothing below `surface_y` (world metres in the body's little
// world) is drawn, so it comes up out of the blood with a true waterline, and just above the line it is darker and wet.
shader_type spatial;
render_mode cull_back, depth_draw_opaque;

uniform vec4 albedo : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap;
uniform bool has_albedo_tex = false;
uniform sampler2D rough_tex : hint_roughness_g, filter_linear_mipmap;
uniform bool has_rough_tex = false;
uniform float rough = 0.5;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap;
uniform bool has_normal_tex = false;
uniform float surface_y = -100.0;

varying float wy;

void vertex() {
	wy = (MODEL_MATRIX * vec4(VERTEX, 1.0)).y;
}

void fragment() {
	if (wy < surface_y) discard;
	vec3 c = albedo.rgb;
	if (has_albedo_tex) c *= texture(albedo_tex, UV).rgb;
	float wl = 1.0 - smoothstep(0.0, 0.07, wy - surface_y);
	ALBEDO = mix(c, c * 0.55, wl);
	float r = has_rough_tex ? texture(rough_tex, UV).g : rough;
	ROUGHNESS = mix(r, 0.1, wl);
	if (has_normal_tex) NORMAL_MAP = texture(normal_tex, UV).rgb;
	SPECULAR = 0.4;
}
