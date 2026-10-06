shader_type canvas_item;
// The living world (the fork; world/cm_life.gd): a prop that bends. One material per kind of bend (grass, tree, cloth),
// shared by every prop of that kind; each prop keeps its own beat from where it stands (MODEL_MATRIX), so a field never
// moves in step. Bodies walking through push the grass aside (pushers: world positions, set each frame).

uniform float amp = 3.0;          // Cursemark px at the top of the sprite
uniform float speed = 1.4;
uniform float stiff = 1.6;        // how the bend grows toward the top (higher: only the tips move)
uniform float flutter = 0.0;      // cloth: a quicker ripple down its length
uniform float wind = 1.0;         // the shared wind's strength
uniform float height_px = 24.0;   // the sprite's drawn height, in local px
uniform int n_push = 0;
uniform vec3 pushers[8];          // world x, y, radius (units)

void vertex() {
	vec2 origin = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xy;
	float beat = origin.x * 0.0123 + origin.y * 0.0071;
	// how far up the sprite this vertex is (0 at its foot, 1 at its top): a sprite's local y runs 0 (top) to its height
	float up = clamp(1.0 - VERTEX.y / max(1.0, height_px), 0.0, 1.0);
	float k = pow(up, stiff);
	float s = sin(TIME * speed + beat) * 0.7 + sin(TIME * speed * 2.3 + beat * 1.7) * 0.3;
	float dx = s * amp * wind * k;
	if (flutter > 0.0) {
		dx += sin(TIME * speed * 3.1 + beat + up * 6.0) * flutter * k;
	}
	// pushed aside by what walks through
	for (int i = 0; i < 8; i++) {
		if (i >= n_push) break;
		vec2 d = origin - pushers[i].xy;
		float r = pushers[i].z;
		float near = 1.0 - clamp(length(d) / r, 0.0, 1.0);
		dx += sign(d.x + 0.001) * near * near * amp * 2.2 * k;
	}
	VERTEX.x += dx;
}
