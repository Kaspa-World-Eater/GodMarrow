shader_type canvas_item;
// A Cursemark prop (tree, stone, stump, grave) lit by the pilgrim's lantern through its own normal map, the same as the
// creatures (shaders/cm_flash.gdshader): every prop reads the lantern's place from global values (core/main.gd sets
// them each frame) and lights itself from where it stands, so the light rakes across bark and stone as you walk.
global uniform vec2 lamp_world;
global uniform float lamp_reach;    // screen px
global uniform float lamp_night;    // 0 by day .. 1 at night
uniform bool flipped = false;
varying vec2 world;

void vertex() {
	world = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
}

void fragment() {
	vec4 c = texture(TEXTURE, UV) * COLOR;
	vec3 n = texture(NORMAL_TEXTURE, UV).rgb;
	if (length(n) > 0.05 && lamp_reach > 1.0) {
		n = n * 2.0 - 1.0;
		n.y = -n.y;
		if (flipped) n.x = -n.x;
		n = normalize(n);
		vec2 dv = lamp_world - world;
		float dist = length(dv * vec2(1.0, 2.0));
		float k = clamp(1.2 - dist / lamp_reach, 0.0, 1.0) * (0.4 + 0.6 * lamp_night);
		float lam = max(0.0, dot(n, normalize(vec3(dv, 140.0))));
		float sky = max(0.0, dot(n, normalize(vec3(-0.6, -0.7, 0.4))));
		c.rgb *= mix(1.0, 0.74 + 0.5 * lam, k) * mix(vec3(1.0), vec3(1.0, 0.86, 0.68), k * lam * 0.4);
		c.rgb += vec3(0.55, 0.65, 0.9) * pow(sky, 3.0) * lamp_night * 0.05;
	}
	COLOR = c;
}
