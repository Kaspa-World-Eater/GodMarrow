shader_type canvas_item;
// A landkit object (world/landkit.gd) lit; the same as shaders/cm_prop_lit.gdshader but its colour taken once (that
// one multiplies the texture into COLOR a second time, squaring every value: right for the Cursemark art it was tuned
// on, not for pieces painted at their final values). Otherwise: a prop lit by the pilgrim's lantern through its own normal map, the same as the
// creatures (shaders/cm_flash.gdshader): every prop reads the lantern's place from global values (core/main.gd sets
// them each frame) and lights itself from where it stands, so the light rakes across bark and stone as you walk.
global uniform vec2 lamp_world;
global uniform float lamp_reach;    // screen px
global uniform float lamp_night;    // 0 by day .. 1 at night
global uniform float world_wind;    // the one wind (core/gust.gd via Game.wind)
uniform bool flipped = false;
uniform float sway = 0.0;           // how far a top bends, in the sprite's own px (trees, bushes; 0 for stone)
// a crown: thinned to a ghost round the pilgrim (an ellipse on the ground, cut_in..cut_out screen px), through a
// 4x4 dither in the art's own pixels, so the floor they stand on stays readable under a canopy at true scale
uniform bool canopy = false;
uniform float cut_in = 420.0;
uniform float cut_out = 720.0;
uniform float ghost = 0.14;
varying vec2 world;

void vertex() {
	world = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
	if (sway > 0.0 && VERTEX.y < 0.5) {      // the top edge bends; the foot stays where it stands
		vec2 origin = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xy;
		float beat = origin.x * 0.0123 + origin.y * 0.0071;
		float s = sin(TIME * 1.1 + beat) * 0.7 + sin(TIME * 2.5 + beat * 1.7) * 0.3;
		VERTEX.x += (s * 0.6 + 0.6) * sway * world_wind;
	}
}

void fragment() {
	vec4 c = COLOR;                         // already the texture times the modulate (Godot 4)
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
	if (canopy) {
		vec2 dh = (lamp_world + vec2(-28.0, 150.0) - world) * vec2(1.0, 1.6);   // from the pilgrim's middle
		float k = smoothstep(cut_in, cut_out, length(dh));
		ivec2 px = ivec2(floor(UV / TEXTURE_PIXEL_SIZE)) % 4;
		int b[16] = int[](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
		float th = (float(b[px.y * 4 + px.x]) + 0.5) / 16.0;
		if (k < th) c.a *= ghost;
	}
	COLOR = c;
}
