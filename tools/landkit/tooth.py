"""The god's teeth (landkit). THE LORE (docs/wiki/11-codex-voices.md): the Ashen Moor is the god's cheek, and the
ground swells to "a long rise I have marked the Jaw"; below the Broken Kneeler, "stones like teeth round a pit of ash,
and something under the ash that breathes out when you breathe in". The stones are teeth.

A tooth erupting from the cheek's ash, true scale (2.5-4.5 yd tall): a FANG (a long cone, its flank curving, the tip
worn or snapped) or a MOLAR (a broad block with four worn cusps and the fissures between). Enamel ivory gone yellow and
brown in its grooves, crazed with fine cracks, chipped to the dentin at the edges; at its root the gum: swollen,
dark-red flesh in a collar, receding from the tooth, ash caked in its folds.

  F, info = tooth(kind, seed)     F.H heights, F.M materials (ENAMEL, GUM, DENTIN)
  paint_tooth(img, m, v, n, lx, ly, lz, M, info, side)
"""
import numpy as np
from kit import Field, ramp, vn, fbm

ENAMEL, GUM, DENTIN = 1, 2, 3
R_ENAMEL = ramp("#1c1914", "#2e2a22", "#463f32", "#625846", "#80745b", "#9c8f72", "#b6a98a", "#cbc0a3")
R_STAIN = ramp("#1a120c", "#2c1e12", "#43301c", "#5c4426")
R_GUM = ramp("#140809", "#240d10", "#3a1418", "#521d21", "#6b2a2b", "#843a37")
R_DENT = ramp("#3a3026", "#5a4a38", "#7a654b")


def tooth(kind="fang", seed=1, height=None):
    rr = np.random.default_rng(seed)
    F = Field(1.9, res=0.025)
    X, Y = F.X, F.Y
    d = np.hypot(X, Y)
    ang = np.arctan2(Y, X)
    if kind == "fang":
        h0 = height or rr.uniform(3.0, 4.5)
        R = rr.uniform(0.75, 1.0)
        lean = (rr.uniform(-1, 1) * 0.35, rr.uniform(-1, 1) * 0.35)
        # a cone with a bulging flank, its tip snapped or worn
        prof = np.clip(1 - d / R, 0, 1)
        top = h0 * prof ** 0.62 * (1 + 0.06 * np.cos(ang * 2 + seed))
        snap = rr.uniform(0.75, 1.0)
        top = np.minimum(top, h0 * snap + (fbm(X * 4, Y * 4) - 0.5) * 0.3)
        top = top + (X * lean[0] + Y * lean[1]) * prof * 0.6
    else:
        h0 = height or rr.uniform(2.2, 3.0)
        R = rr.uniform(1.0, 1.3)
        sq = np.maximum(np.abs(X), np.abs(Y) * 0.92) / R
        body = np.clip(1 - sq ** 6, 0, 1) ** 0.3
        cusp = sum(np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / 0.12) for cx, cy in ((0.4, 0.4), (-0.4, 0.4), (0.4, -0.4), (-0.4, -0.4))) * R
        fiss = (np.abs(X) < 0.07) | (np.abs(Y) < 0.07)
        top = body * h0 + cusp * 0.35 - fiss * 0.18 * body
        d = sq * R
    m = top > 0.05
    # the gum's collar round its foot: swollen flesh, receding
    gum_r = R * rr.uniform(1.15, 1.35)
    collar = (d < gum_r + 0.35) & (d > R * 0.82)
    gz = 0.45 * np.exp(-((d - gum_r * 0.98) / 0.28) ** 2) + (fbm(X * 3 + seed, Y * 3) - 0.5) * 0.12
    H = np.where(m, top, -9.0)
    M = np.where(m, ENAMEL, 0)
    upd = collar & (gz > 0.05) & (gz > H)
    H = np.where(upd, gz, H)
    M = np.where(upd, GUM, M)
    # chips: where the enamel broke away to the dentin, on the edges and the snapped tip
    chip = m & (M == ENAMEL) & (vn(X * 5 + seed, Y * 5) > 0.78) & (top > h0 * 0.5)
    M = np.where(chip, DENTIN, M)
    F.H, F.M = H, M
    return F, dict(kind=kind, seed=seed, height=h0, R=R)


def paint_tooth(img, m, v, n, lx, ly, lz, M, info, side):
    h = np.clip(lz / max(info["height"], 0.1), 0, 1)
    ang = np.arctan2(ly, lx)
    en = m & (M == ENAMEL)
    # enamel: long faint striations up the tooth, crazing, the grooves stained brown, yellowing toward the gum
    # enamel is smooth and hard: broad clean tones following the form, a long gloss highlight on the moon side, a few
    # long craze-lines (not speckle), stain only in the deep grooves near the gum
    stri = (vn(ang * 5 + info["seed"], lz * 0.4) - 0.5) * 0.03
    craze = (np.abs(np.sin(ang * 9 + lz * 1.2 + vn(ang * 2, lz * 0.5) * 3)) < 0.025) & (vn(ang * 3 + 5, lz) > 0.5)
    ev = v * 1.0 + 0.08 + stri - (1 - h) * 0.05
    ev = np.round(ev * 7) / 7
    img[en] = R_ENAMEL[np.clip((ev[en] * len(R_ENAMEL)).astype(int), 0, len(R_ENAMEL) - 1)]
    img[en & craze] = img[en & craze] * 0.72
    gloss = en & (v > 0.62) & (np.abs(np.sin(ang * 1.0 + 0.6)) > 0.93)
    img[gloss] = np.minimum(img[gloss] * 1.25 + 0.06, 1)
    groove = en & (h < 0.3) & (vn(ang * 4 + 9, lz * 2) < 0.3)
    img[groove] = R_STAIN[np.clip((v[groove] * len(R_STAIN)).astype(int), 0, len(R_STAIN) - 1)]
    yel = en & (h < 0.35)
    img[yel] = img[yel] * np.array([1.0, 0.92, 0.72])
    de = m & (M == DENTIN)
    img[de] = R_DENT[np.clip((v[de] * len(R_DENT)).astype(int), 0, len(R_DENT) - 1)]
    gm = m & (M == GUM)
    gv = v * 0.85 + 0.05 + (vn(lx * 9, ly * 9) - 0.5) * 0.12
    img[gm] = R_GUM[np.clip((gv[gm] * len(R_GUM)).astype(int), 0, len(R_GUM) - 1)]
    fold = gm & (np.abs(np.sin(ang * 11 + vn(lx * 3, ly * 3) * 4)) < 0.12)
    img[fold] = img[fold] * 0.5 + np.array([0.18, 0.16, 0.15]) * 0.5   # ash caked in the folds
    wet = gm & (v > 0.55) & (vn(lx * 17, ly * 17) > 0.7)
    img[wet] = np.minimum(img[wet] * 1.4, 1)                            # a wet gleam on the swollen flesh
    return img
