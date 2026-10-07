"""The Hollow Wood's bark, one painter for every place it appears (the game's towering trees, giant.py, and the
scenes built on the wood's engine), so a pass that improves it improves it everywhere. Twelve graded passes went into
it (tools/landkit/passes/giant.md). From the lore: the god's veins stood up as pale trees.

  pale skin, smooth as beech, its faint grain and damp streaks; raised veins rising from the roots and branching as
  they climb, bruise-warm in the cord, lit on the edge toward the moon, a thin shadow beyond; the limb scars as beech
  carries them (a dark oval, a raised lip lit above, the chevron brow), which on the god's veins look back like eyes;
  stretch wrinkles across the skin; the ground's wet drawn up into the foot; faint grey-green lichen on the lit side.

  form_value(n, moon)                       the pale trunk's value structure (lit third, core, bounce)
  paint(img, wood, bole, v, n, arc, along, r, seed, moon, scars=True)
"""
import numpy as np
from kit import ramp, vn

R_BARK = ramp("#16131a", "#28232a", "#3d3639", "#554c4b", "#6f655f", "#8b7f75", "#a89a8c", "#c2b5a3")   # pale vein-wood
R_VEIN = ramp("#1d1218", "#33202a", "#4d3036", "#694643", "#86604f")                          # the vein: bruised, warm
SAP = ramp("#120406", "#24070b", "#3a0b10", "#541318", "#6e1c1e")                             # sap: dark blood, fresh
SAP_OLD = ramp("#140b0a", "#21110e", "#311a14", "#40241a")                                     # crusted as it dries


def form_value(n, moon):
    """a pale trunk keeps its grey in shade: lit third, a core, the floor's light thrown back on the far edge"""
    ndl = n[..., 0] * moon[0] + n[..., 1] * moon[1]
    back = np.clip(-ndl, 0, 1)
    return 0.34 + np.clip(ndl, 0, 1) ** 0.8 * 0.62 + (ndl > 0.15) * 0.05 + back ** 3 * 0.08 - np.clip(-ndl, 0, 0.4) * 0.12


def veins(r, seed, arc, along, top=24.0):
    """distance (in cord-widths) to the nearest vein, and which side of it (-1 the lit side .. +1 the far side); the
    veins drawn once in the bole's own (arc, height) sheet and looked up"""
    rr = np.random.default_rng(seed + 77)
    circ = 2 * np.pi * r
    RES = 0.02
    nA, nZ = int(circ / RES) + 1, int(top / RES) + 1
    D = np.full((nZ, nA), 9.0)
    S = np.zeros((nZ, nA))
    gz, ga = np.mgrid[0:nZ, 0:nA].astype(float) * RES

    def cord(a0, z0, z1, w0, depth):
        a, z = a0, z0
        while z < z1:
            a += rr.normal(0, 0.012) + np.sin(z * 0.7 + a0) * 0.004
            w = w0 * (1 - (z - z0) / max(z1 - z0, 1e-3) * 0.4)
            j0, j1 = int(max((z - 0.3) / RES, 0)), int(min((z + 0.3) / RES, nZ - 1))
            da = ((ga[j0:j1] - a + circ / 2) % circ) - circ / 2
            dd = np.hypot(da, (gz[j0:j1] - z) * 0.35) / w
            m = dd < D[j0:j1]
            D[j0:j1] = np.where(m, dd, D[j0:j1])
            S[j0:j1] = np.where(m, np.sign(da), S[j0:j1])
            z += 0.05
            if depth < 1 and rr.random() < 0.004:                       # it branches as it climbs
                cord(a + rr.choice([-1, 1]) * w * 0.8, z, min(z + rr.uniform(2, 7), top), w * 0.7, depth + 1)
    for k in range(int(rr.integers(4, 6))):
        cord(rr.uniform(0, circ), 0.0, rr.uniform(min(10, top * 0.6), top), rr.uniform(0.065, 0.11) * float(np.clip(r / 0.9, 0.3, 1.2)), 0)   # veins in proportion to the trunk
    ai = np.clip(((arc % circ) / RES).astype(int), 0, nA - 1)
    zi = np.clip((along / RES).astype(int), 0, nZ - 1)
    return D[zi, ai], S[zi, ai]


def paint(img, wood, bole, v, n, arc, along, r, seed, moon, scars=True, top=24.0, scar_band=(4.5, 15.0), px_per_yd=18.0):
    """the pale vein-bark onto img where `wood` (the bole: `bole`, its round side above the flare); v the light"""
    ndl = n[..., 0] * moon[0] + n[..., 1] * moon[1]
    grain = vn(arc * 15.0 + along * 0.35, along * 1.6)
    fine = vn(arc * 34.0 + along * 0.5, along * 3.6)
    furrow = (grain < 0.32) | ((fine < 0.22) & (grain < 0.45))
    streak = (vn(arc * 7.0, along * 0.25 + 3) > 0.78) * -0.07
    skin = (vn(arc * 3.0, along * 0.5) - 0.5) * 0.06 + (vn(arc * 20, along * 6) - 0.5) * 0.03
    bv = v + skin + streak * 0.6 - (furrow & (grain < 0.2)) * 0.05
    img[wood] = R_BARK[np.clip((bv * len(R_BARK)).astype(int), 0, len(R_BARK) - 1)][wood]
    # the veins: raised cords, dark and warm in the cord, lit along the edge toward the moon, a thin shadow beyond
    vd, vside = veins(r, seed, arc, along, top)
    facing = (n[..., 0] + n[..., 1]) / np.sqrt(2)                       # toward the eye (the iso view is +x +y)
    cord = wood & bole & (vd < 1.0) & (facing > 0.45)                   # a vein turning away is lost, not squashed
    # a cord one or two pixels wide cannot hold a lit edge, a dark middle and a cast shadow: it breaks into a checker.
    # So a thin cord is one clean tone, dark and warm, following the trunk's light; the edge and shadow come in only
    # where the cord is wide enough on the screen to carry them (px_per_yd: screen pixels across a yard of bark)
    vt = np.clip(v * 0.7 + 0.05, 0, 0.99)
    img[cord] = R_VEIN[np.clip((vt[cord] * len(R_VEIN)).astype(int), 0, len(R_VEIN) - 1)]
    if px_per_yd * 0.09 >= 3.0:
        vlit = cord & (vside < -0.3) & (ndl > 0.1)
        img[vlit] = np.minimum(R_BARK[np.clip((v[vlit] * len(R_BARK)).astype(int) + 1, 0, len(R_BARK) - 1)] * 1.05, 1)
        vsh = wood & bole & (vd >= 1.0) & (vd < 1.7) & (vside > 0) & (facing > 0.45)
        img[vsh] = img[vsh] * 0.8
    # the ground's wet drawn up into the foot, deeper on the side turned from the moon
    away = np.clip(-ndl, 0, 1)
    damp = wood & (along < 0.35 + away * 0.5 + (vn(arc * 5, 1) - 0.5) * 0.3)
    img[damp] = img[damp] * np.array([0.78, 0.78, 0.82])
    # faint grey-green lichen on the lit side
    lich = wood & ~cord & (np.clip(ndl, 0, 1) > 0.2) & (vn(arc * 4 + 9, along * 2.5) > 0.83) & (along < 12)
    img[lich] = img[lich] * np.array([0.92, 1.0, 0.92])
    # the limb scars, eyes on the god's veins
    if scars:
        rs = np.random.default_rng(seed + 13)
        circ = 2 * np.pi * r
        for k in range(int(rs.integers(2, 5))):
            a_s, z_s = rs.uniform(-0.6, 0.9) * r, rs.uniform(*scar_band)
            w_s = rs.uniform(0.2, 0.3) * min(1.0, r / 0.6)
            da = ((arc - a_s + circ / 2) % circ) - circ / 2
            dz = along - z_s
            e = (da / w_s) ** 2 + (dz / (w_s * 0.55)) ** 2
            hole = bole & (e < 1.0)
            lip = bole & (e >= 1.0) & (e < 2.0)
            img[lip] = np.minimum(img[lip] * np.where(dz[lip] > 0, 1.28, 0.7)[:, None], 1)
            img[hole] = R_BARK[1] * np.where(e[hole] < 0.45, 0.55, 0.9)[:, None]
            brow = bole & (np.abs(da) < w_s * 1.7) & (np.abs(dz - (w_s * 0.85 + np.abs(da) * 0.4)) < 0.05)
            img[brow] = img[brow] * 0.72
            # the scar weeps: sap is dark blood in this world (Derek 2026-10-07), runs from the scar's lower lip down
            # the skin, glossy red-black where fresh, a lit bead on the moon side, crusting brown as it dries and thins
            for q in range(int(rs.integers(1, 4))):
                a_r = a_s + rs.uniform(-0.6, 0.6) * w_s
                L_r = rs.uniform(0.4, 2.6)
                z0 = z_s - w_s * 0.45
                f_ = np.clip((z0 - along) / L_r, 0, 1)                   # 0 at the scar .. 1 at the run's end
                wig = np.sin(along * 7 + q * 2.3) * 0.02 + np.sin(along * 2.1 + a_r) * 0.015
                wr = (0.045 - f_ * 0.03) * min(1.0, r / 0.6)
                run = wood & bole & (along < z0) & (along > z0 - L_r) & (np.abs(((arc - a_r - wig + circ / 2) % circ) - circ / 2) < wr) & (facing > 0.2)
                fresh = run & (f_ < 0.45)
                img[run] = SAP_OLD[np.clip(((v[run] * 0.6 + 0.15) * len(SAP_OLD)).astype(int), 0, len(SAP_OLD) - 1)]
                img[fresh] = SAP[np.clip(((v[fresh] * 0.7 + 0.1) * len(SAP)).astype(int), 0, len(SAP) - 1)]
                bead = fresh & (ndl > 0.25) & (np.abs(((arc - a_r - wig + circ / 2) % circ) - circ / 2) > wr * 0.35) & ((((arc - a_r - wig + circ / 2) % circ) - circ / 2) * np.sign(ndl) < 0)
                img[bead] = np.minimum(img[bead] * 1.9 + np.array([0.08, 0.02, 0.02]), 1)
    # the skin's stretch: faint wrinkles across it, closest at the foot
    wrin = bole & (np.sin(along * 38 + vn(arc * 2, along * 0.6) * 9) > 0.93) & (vn(arc * 3, along * 0.8) > 0.45 + np.clip(along / 12, 0, 0.4))
    img[wrin] = img[wrin] * 0.86
    return img, cord
