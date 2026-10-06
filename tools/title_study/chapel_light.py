"""The chapel's light, taken apart (for the title's live relighting, shaders/title_chapel.gdshader).

    python tools/title_study/chapel_light.py            # export art/ui/title_light/*.bin.gz and verify

chapel.py paints the chapel once with five lights baked in. Here every pixel keeps each light's share separately, so a
shader can sum them again every frame with each light's strength (the candles flicker, gutter in the wind, the blood's
glow breathes) and snap the result onto the same 12-tone stone ramp with the same 4x4 dither: the god's face is truly
lit by the candles, not glowed over. With every strength at 1 the recombination must give the painting back exactly.

Layers (480x270, float32 RGBA, gzip):
  kA   : k0 k1 k2 k3   (the light shares: left cluster, right cluster, the blood, the two front stubs)
  kB   : k4 pre0 cold mult    val = (pre0 + g * sum(w_i k_i)) * mult + add
  kC   : add rf g speck        rf: the blood's red on this pixel (1 facing down, 0.4 up, 0 on the floor)
  kD   : crack stain 0 0       the floor's cracks (x0.4 each) and old blood stains, after the light
  over : RGBA8 painted things over the stone (tears, chains, the throat, the bowl, the candles), alpha 255 = painted
  shaft: the cold shaft's added light, RGB float (in kE)
"""
import gzip, math, sys
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import chapel  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "art" / "ui" / "title_light"


def recombine(rec, w=(1, 1, 1, 1, 1)):
    H, W = rec["pre0"].shape
    k = rec["k"]
    s = sum(k[..., i] * w[i] for i in range(5))
    pre = rec["pre0"] + rec["g"] * s
    val = pre * rec["mult"] + rec["add"]
    jj, ii = np.mgrid[0:H, 0:W]
    dith = np.array(chapel.B4)[(jj & 3) * 4 + (ii & 3)]
    t = np.floor(np.sqrt(np.maximum(0, val)) * 12.5 + dith * 1.1 + rec["speck"]).astype(int)
    t = np.clip(t, 0, 11)
    col = np.array(chapel.STONE, dtype=float)[t]
    red = np.minimum(0.8, 1.6 * k[..., 2] * w[2] * rec["rf"])
    rm = red > 0
    col[rm, 0] = np.minimum(255, col[rm, 0] * (1 + red[rm] * 0.55))
    col[rm, 1] = col[rm, 1] * (1 - red[rm] * 0.3)
    col[rm, 2] = col[rm, 2] * (1 - red[rm] * 0.25)
    col = np.clip(np.round(col), 0, 255)      # the painter stores each pixel as a byte here
    cf = rec["cold"] / (pre + 0.0001)
    cm = cf > 0.05
    c2 = col.copy()
    c2[cm, 0] = col[cm, 0] * (1 - 0.4 * cf[cm])
    c2[cm, 1] = col[cm, 1] * (1 - 0.12 * cf[cm])
    c2[cm, 2] = np.minimum(255, col[cm, 2] * (1 + 0.35 * cf[cm]))
    col = np.clip(np.round(c2), 0, 255)
    for n in range(1, 4):
        m = rec["crack"] >= n
        col[m] = np.clip(np.round(col[m] * 0.4), 0, 255)
    m = rec["stain"] > 0
    col[m, 0] = np.clip(np.round(col[m, 0] * 0.7 + 14), 0, 255)
    col[m, 1] = np.clip(np.round(col[m, 1] * 0.35), 0, 255)
    col[m, 2] = np.clip(np.round(col[m, 2] * 0.4), 0, 255)
    ov = rec["over"][..., 3] > 0
    col[ov] = rec["over"][ov, :3]
    col = np.clip(np.round(col + rec["shaft"]), 0, 255)
    return col.astype(np.uint8)


def main():
    rec = {}
    img = chapel.build(rec)
    me = recombine(rec)
    ref = np.array(Image.open(ROOT / "art" / "ui" / "title_bowl.png").convert("RGB")).astype(int)
    d = np.abs(ref - me.astype(int)).max(axis=2)
    print("recombined exact:", int((d == 0).sum()), "of", d.size, " within 2:", int((d <= 2).sum()), " max", int(d.max()))
    OUT.mkdir(parents=True, exist_ok=True)

    def save(name, arr):
        a = np.ascontiguousarray(arr.astype(np.float32))
        (OUT / (name + ".bin.gz")).write_bytes(gzip.compress(a.tobytes(), 9))
    k = rec["k"]
    save("kA", np.stack([k[..., 0], k[..., 1], k[..., 2], k[..., 3]], -1))
    save("kB", np.stack([k[..., 4], rec["pre0"], rec["cold"], rec["mult"]], -1))
    save("kC", np.stack([rec["add"], rec["rf"], rec["g"], rec["speck"]], -1))
    save("kD", np.stack([rec["crack"], rec["stain"], np.zeros_like(rec["crack"]), np.zeros_like(rec["crack"])], -1))
    save("kE", np.concatenate([rec["shaft"], np.zeros(rec["shaft"].shape[:2] + (1,))], -1))
    Image.fromarray(rec["over"].astype(np.uint8), "RGBA").save(OUT / "over.png")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
