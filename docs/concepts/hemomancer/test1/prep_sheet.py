"""Cut Derek's Hemomancer sheet into front / side / back on pure white, floor removed, for the Forge.
Below the floor line only the columns under each figure's legs are kept (sand removed there); the rest is paper."""
from PIL import Image
import numpy as np
import os

SRC = r'C:\Users\derek\OneDrive\Desktop\Godmarrow Art\Hemomancer\hemomancer_test1_sheet.png'
OUT = r'C:\Users\derek\OneDrive\Desktop\Godmarrow Art\Hemomancer\hemomancer_test1_views'
os.makedirs(OUT, exist_ok=True)
im = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
FY = 848
clean = im.copy()
clean[im.min(axis=2) >= 205] = 255
sand = (r > 150) & (g > 110) & (b < 170) & (r - b > 35)
for (x0, x1) in [(0, 445), (445, 800), (800, W)]:
    # leg columns: non-paper pixels in the band just above the floor
    band = (im[820:FY, x0:x1].min(axis=2) < 205).any(axis=0)
    xs = np.nonzero(band)[0]
    lo, hi = max(x0, x0 + xs.min() - 12), min(x1, x0 + xs.max() + 12)
    clean[FY:, x0:max(x0, lo)] = 255
    clean[FY:, min(x1, hi):x1] = 255
    sub = clean[FY:, lo:hi]
    cool = (b[FY:, lo:hi] >= r[FY:, lo:hi] - 4) & (im[FY:, lo:hi].max(axis=2) < 200)
    sub[sand[FY:, lo:hi] | cool] = 255
    print('panel', x0, x1, 'legs', lo, hi)
for name, (x0, x1) in zip(['front', 'side', 'back'], [(0, 445), (445, 800), (800, W)]):
    Image.fromarray(clean[:, x0:x1].astype(np.uint8)).save(os.path.join(OUT, f'{name}.png'))
Image.fromarray(clean.astype(np.uint8)).save(os.path.join(OUT, 'sheet_clean.png'))
