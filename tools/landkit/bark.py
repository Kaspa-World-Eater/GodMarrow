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
EYE_Y = ramp("#241f12", "#3b3319", "#554a22", "#6e622c", "#877938", "#9c8e48")                 # the white, jaundiced: sallow, not lit yellow
EYE_I = ramp("#140f10", "#241a1a", "#352626", "#463434")                                     # a rheumy iris
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


def paint(img, wood, bole, v, n, arc, along, r, seed, moon, scars=True, top=24.0, scar_band=(4.5, 15.0), px_per_yd=18.0,
          dying=0.0, disease=0.0, eyes=None):
    """the pale vein-bark onto img where `wood` (the bole: `bole`, its round side above the flare); v the light.
    eyes: a list; when given, a weeping scar is painted as its socket only (the swollen bark lids, the dark hollow) and
    its place is appended (dict a=arc, z=along, w=half-width, k) so the scene ray-casts the god's 3D eye there
    (landkit eye.py: a true ball that blinks; Derek 2026-10-07: "that same three-dimensional blinking quality ... true
    for basically any organic stuff")"""
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
        n_sc = int(rs.integers(2, 5)) + int(round(dying * 3))
        placed = []
        for k in range(n_sc):
            weeping = dying > 0 and k < 1 + int(dying * 1)                # the dying tree's scars open into eyes: two at most (Derek: "maybe two eyeballs ... spaced out pretty well")
            # no two scars overlap (Derek: the eyes "overlap and they shouldn't"): each keeps clear of the others by
            # its lids, brow and the runs beneath it, or it is not placed
            for _try in range(24):
                a_s, z_s = rs.uniform(-0.6, 0.9) * r, rs.uniform(*scar_band)
                w_s = rs.uniform(0.2, 0.3) * min(1.0, r / 0.6) * (2.4 if weeping else 1.0)   # an eye big enough to be one
                clear = all((((a_s - pa + circ / 2) % circ - circ / 2) / ((w_s + pw) * 1.9)) ** 2 +
                            ((z_s - pz_) / ((w_s + pw) * 2.6)) ** 2 > 1.0 for (pa, pz_, pw) in placed)   # well apart
                if clear:
                    break
            if not clear:
                continue
            placed.append((a_s, z_s, w_s))
            da = ((arc - a_s + circ / 2) % circ) - circ / 2
            dz = along - z_s
            e = (da / w_s) ** 2 + (dz / (w_s * 0.55)) ** 2
            hole = bole & (e < 1.0)
            lip = bole & (e >= 1.0) & (e < 2.0)
            img[lip] = np.minimum(img[lip] * np.where(dz[lip] > 0, 1.28, 0.7)[:, None], 1)
            img[hole] = R_BARK[1] * np.where(e[hole] < 0.45, 0.55, 0.9)[:, None]
            if weeping and eyes is not None:
                # the socket for the 3D eye: swollen bark lids round a dark hollow; the eye itself is ray-cast by the scene
                ex, ey = da / w_s, dz / (w_s * 0.55)
                er = np.hypot(ex, ey)
                lids = bole & (er >= 0.82) & (er < 1.35)
                img[lids] = img[lids] * np.where(ey[lids] > 0, 1.12, 0.62)[:, None]
                sk = bole & (er < 0.82)                                           # the socket: dark bark, healed over where no eye shows
                img[sk] = img[sk] * 0.8                                           # healed over: only a little darker where no eye shows
                eyes.append(dict(a=a_s, z=z_s, w=w_s, k=k, mask=bole & (er < 1.0)))   # the socket's own pixels
            elif weeping:
                # THE WEEPING EYE (Derek: "a yellowing gross eye weeping, leaking blood sap"): the scar opened into an
                # eye under swollen lids of bark; the white gone jaundiced yellow, threaded with bloodshot veins; a
                # rheumy iris filmed milky at its ring; a wet glint on the moon side; the lower lid raw and red
                ex, ey = da / w_s, dz / (w_s * 0.55)
                er = np.hypot(ex, ey)
                lids = bole & (er >= 0.82) & (er < 1.35)
                img[lids] = img[lids] * np.where(ey[lids] > 0, 1.12, 0.62)[:, None]      # puffed upper lid, dark crease below
                white = bole & (er < 0.82)
                yv = np.clip(v * 0.75 + 0.18 - np.clip(-ey, 0, 1) * 0.1, 0, 0.99)
                img[white] = EYE_Y[np.clip((yv[white] * len(EYE_Y)).astype(int), 0, len(EYE_Y) - 1)]
                vein_e = white & (np.abs(np.sin(np.arctan2(ey, ex) * 7 + er * 4)) < 0.16) & (er > 0.4)
                img[vein_e] = img[vein_e] * 0.45 + np.array([0.55, 0.1, 0.08]) * 0.55
                iris = bole & (np.hypot(ex - 0.06, ey + 0.05) < 0.42)
                img[iris] = EYE_I[np.clip((v[iris] * 0.8 * len(EYE_I)).astype(int), 0, len(EYE_I) - 1)]
                film = iris & (np.hypot(ex - 0.06, ey + 0.05) > 0.3)
                img[film] = img[film] * 0.55 + np.array([0.62, 0.62, 0.58]) * 0.45   # the rheum, milky
                pupil = bole & (np.hypot(ex - 0.06, ey + 0.05) < 0.16)
                img[pupil] = np.array([0.03, 0.02, 0.02])
                glint = bole & (np.hypot(ex + 0.18, ey - 0.2) < 0.12) & (ndl > 0)
                img[glint] = np.array([0.92, 0.9, 0.82])
                raw = bole & (ey < -0.6) & (er >= 0.7) & (er < 1.0)
                img[raw] = SAP[3]
            brow = bole & (np.abs(da) < w_s * 1.7) & (np.abs(dz - (w_s * 0.85 + np.abs(da) * 0.4)) < 0.05)
            img[brow] = img[brow] * 0.72
            # the scar weeps: sap is dark blood in this world (Derek 2026-10-07), runs from the scar's lower lip down
            # the skin, glossy red-black where fresh, a lit bead on the moon side, crusting brown as it dries and thins
            for q in range(int(rs.integers(1, 4)) + (2 if weeping else 0)):
                a_r = a_s + rs.uniform(-0.6, 0.6) * w_s
                L_r = rs.uniform(0.4, 2.6) * (1.8 if weeping else 1.0)
                z0 = z_s - w_s * 0.45
                f_ = np.clip((z0 - along) / L_r, 0, 1)                   # 0 at the scar .. 1 at the run's end
                wig = np.sin(along * 2.2 + q * 2.3) * 0.025 + np.sin(along * 0.9 + a_r) * 0.02   # a slow wander, not a ladder
                wr = (0.045 - f_ * 0.03) * min(1.0, r / 0.6)
                run = wood & bole & (along < z0) & (along > z0 - L_r) & (np.abs(((arc - a_r - wig + circ / 2) % circ) - circ / 2) < wr) & (facing > 0.2)
                fresh = run & (f_ < 0.45)
                img[run] = SAP_OLD[np.clip(((v[run] * 0.6 + 0.15) * len(SAP_OLD)).astype(int), 0, len(SAP_OLD) - 1)]
                img[fresh] = SAP[np.clip(((v[fresh] * 0.7 + 0.1) * len(SAP)).astype(int), 0, len(SAP) - 1)]
                bead = fresh & (ndl > 0.25) & (np.abs(((arc - a_r - wig + circ / 2) % circ) - circ / 2) > wr * 0.35) & ((((arc - a_r - wig + circ / 2) % circ) - circ / 2) * np.sign(ndl) < 0)
                img[bead] = np.minimum(img[bead] * 1.9 + np.array([0.08, 0.02, 0.02]), 1)
    # DISEASE (Derek 2026-10-07: "add ... some disease to the trees"): on the god's veins, what is under the skin is meat
    if disease > 0:
        rd = np.random.default_rng(seed + 211)
        circ = 2 * np.pi * r
        # cankers: sunken dark lesions with swollen, cracked callus rims, bleeding black-red down the skin
        for q in range(int(1 + disease * 4)):
            a_c, z_c = rd.uniform(-0.7, 1.0) * r, rd.uniform(0.6, 6.0)
            w_c, h_c = rd.uniform(0.18, 0.32) * min(1.0, r / 0.5), rd.uniform(0.3, 0.6)
            da = ((arc - a_c + circ / 2) % circ) - circ / 2
            ec = (da / w_c) ** 2 + ((along - z_c) / h_c) ** 2 + (vn(arc * 8 + q, along * 8) - 0.5) * 0.4
            core = wood & bole & (ec < 0.7) & (facing > 0.2)
            rimc = wood & bole & (ec >= 0.7) & (ec < 1.25) & (facing > 0.2)
            img[core] = SAP[np.clip(((v[core] * 0.5 + 0.05) * len(SAP)).astype(int), 0, len(SAP) - 1)] * 0.8
            img[rimc] = np.minimum(img[rimc] * np.where((along[rimc] - z_c) > 0, 1.22, 0.8)[:, None] + np.array([0.03, 0.01, 0.0]), 1)
            crack = rimc & (np.abs(np.sin(np.arctan2(along - z_c, da) * 9)) < 0.15)
            img[crack] = img[crack] * 0.5
            ooze = wood & bole & (facing > 0.2) & (np.abs(da - np.sin(along * 2) * 0.02) < 0.03 * min(1.0, r / 0.5)) & (along < z_c - h_c * 0.6) & (along > z_c - h_c - rd.uniform(0.4, 1.4))
            img[ooze] = SAP_OLD[np.clip(((v[ooze] * 0.6 + 0.1) * len(SAP_OLD)).astype(int), 0, len(SAP_OLD) - 1)]
        # galls: lumpy swellings, lit on their upper side, dark crease round their foot
        for q in range(int(disease * 4)):
            a_g, z_g = rd.uniform(-0.6, 1.0) * r, rd.uniform(1.0, 9.0)
            r_g = rd.uniform(0.1, 0.2) * min(1.0, r / 0.5)
            da = ((arc - a_g + circ / 2) % circ) - circ / 2
            eg = np.hypot(da, (along - z_g) * 1.2) / r_g + (vn(arc * 12 + q, along * 12) - 0.5) * 0.3
            gall = wood & bole & (eg < 1.0) & (facing > 0.1)
            up = np.clip((along - z_g) / r_g, -1, 1)
            img[gall] = np.minimum(img[gall] * (1.0 + up[gall, None] * 0.25) * np.array([1.0, 0.96, 0.92]), 1)
            gring = wood & bole & (eg >= 1.0) & (eg < 1.25) & (facing > 0.1)
            img[gring] = img[gring] * 0.6
        # peeling: flaps of bark lifted off the raw dark flesh beneath
        peel = wood & bole & (facing > 0.15) & (vn(arc * 2.5 + seed, along * 0.8) > 0.86 - disease * 0.08) & (along < 10)
        RAW = np.array([0.24, 0.11, 0.1])
        img[peel] = RAW * np.clip(v[peel] * 1.2 + 0.25, 0.3, 1.0)[:, None]
        flap = wood & bole & (facing > 0.15) & (vn(arc * 2.5 + seed, along * 0.8) > 0.83 - disease * 0.08) & ~peel & (along < 10)
        img[flap] = np.minimum(img[flap] * 1.25, 1)
    # the skin's stretch: faint wrinkles across it, closest at the foot
    wrin = bole & (np.sin(along * 38 + vn(arc * 2, along * 0.6) * 9) > 0.93) & (vn(arc * 3, along * 0.8) > 0.45 + np.clip(along / 12, 0, 0.4))
    img[wrin] = img[wrin] * 0.86
    return img, cord
