"""Poses for a standing figure seen from the front (Marrowpress). Angles in degrees (positive turns clockwise on
screen), shifts in concept pixels, scale along the bone (below 1: the part foreshortens toward us).
After the motion study (wiki/07 §7): the pelvis rides over the planted foot (highest mid-stance, lowest just after
the heel strikes), sways toward the stance leg and drops on the swing side; the chest counter-twists; arms swing
against the legs with the elbow trailing; the head stays steady; a heavy man leans a little into his walk. Cloth and
the plume follow late."""
import math

TAU = math.tau


def walk_pose(t):
    f = t * TAU
    s = math.sin(f)
    lift_r = max(0.0, s)          # his right leg (screen-left) swings toward us in the first half
    lift_l = max(0.0, -s)
    lag = lambda d: math.sin(f - d)
    return {
        'pelvis': {'move': (7.0 * s, -10.0 * abs(s) + 6.0), 'rot': -1.6 * s},
        'spine': {'rot': 2.2 * s},
        'chest': {'rot': 0.8 * s},
        'head': {'rot': -1.3 * s},
        'plume': {'rot': 2.5 * math.sin(2 * f + 0.7) - 2.0 * s},
        # the planted foot stays where it is; the swinging one rises and comes a little in under him
        'ik': {'leg_r_up': (6.0 * lift_r, -46.0 * lift_r), 'leg_l_up': (-6.0 * lift_l, -46.0 * lift_l)},
        'foot_r': {'scale': 1.0 - 0.3 * lift_r},
        'foot_l': {'scale': 1.0 - 0.3 * lift_l},
        # arms against the legs: the arm swinging toward us shortens, its elbow bends a little later
        'arm_r_up': {'scale': 1.0 - 0.05 * lift_l, 'rot': 2.5 * s},
        'arm_r_lo': {'rot': -7.0 * max(0.0, -lag(0.5)), 'scale': 1.0 - 0.08 * lift_l},
        'arm_l_up': {'scale': 1.0 - 0.05 * lift_r, 'rot': 2.5 * s},
        'arm_l_lo': {'rot': 7.0 * max(0.0, lag(0.5)), 'scale': 1.0 - 0.08 * lift_r},
        'skirt': {'rot': -2.5 * lag(0.6), 'scale': 1.0 - 0.02 * abs(s)},
        'cloak_r1': {'rot': 2.0 * lag(0.9)},
        'cloak_r2': {'rot': 3.5 * lag(1.3)},
        'cloak_l1': {'rot': 2.0 * lag(0.9)},
        'cloak_l2': {'rot': 3.5 * lag(1.3)},
    }


def idle_pose(t):
    f = t * TAU
    b = math.sin(f)
    return {
        'chest': {'move': (0.0, -2.5 * b), 'scale': 1.0 + 0.01 * b},
        'spine': {'scale': 1.0 + 0.006 * b},
        'head': {'rot': 0.6 * math.sin(f - 0.8)},
        'plume': {'rot': 2.5 * math.sin(2 * f) + 1.5 * math.sin(3 * f + 1.0)},
        'arm_r_lo': {'rot': -1.2 * math.sin(f - 0.6)},
        'arm_l_lo': {'rot': 1.2 * math.sin(f - 0.6)},
        'cloak_r1': {'rot': 1.2 * math.sin(f - 0.5)},
        'cloak_r2': {'rot': 1.8 * math.sin(f - 1.0)},
        'cloak_l1': {'rot': -1.0 * math.sin(f - 0.5)},
        'cloak_l2': {'rot': -1.5 * math.sin(f - 1.0)},
        'skirt': {'rot': 0.8 * math.sin(f - 0.7)},
    }


ANIMS = {
    'idle': [idle_pose(i / 8) for i in range(8)],
    'walk': [walk_pose(i / 8) for i in range(8)],
}
FPS = {'idle': 5.0}
