"""A small painting kit for stand-in props and buildings in the game's colours: stone, planks, shingles,
thatch, lit windows, arches, posts. Pictures come out as a white-background 'painting' that PixelForge's `prop`
tool cuts and pixelates like a Midjourney image. Replace with real paintings when they exist."""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pixelforge.vfx import periodic_noise

BONE, IRON, DARK, MOSS, TEAL, WOOD, WOOD_D, STONE, STONE_D, STONE_L, THATCH, THATCH_D, SLATE, SLATE_L, GLOW, GLOW_D = (
    "#cbbfa3", "#4a4c52", "#1c1a18", "#3b4a30", "#2a5c5a", "#4b3a28", "#2e2318", "#55585f", "#33353b", "#7a7d85",
    "#6e5a33", "#4a3c21", "#2c2f36", "#454953", "#f3c75c", "#b07a2a")
rng = np.random.default_rng(11)


def hexc(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class Canvas:
    def __init__(self, w, h, bg=(255, 255, 255)):
        self.im = Image.new("RGB", (w, h), bg)
        self.d = ImageDraw.Draw(self.im)
        self.w, self.h = w, h

    # materials ------------------------------------------------------------
    def stone(self, box, light=STONE_L, mid=STONE, dark=STONE_D, course=12, seed=1):
        x0, y0, x1, y1 = box
        self.d.rectangle(box, fill=hexc(mid))
        y = y0
        row = 0
        while y < y1:
            x = x0 - (course if row % 2 else 0)
            while x < x1:
                w = course * 2 + int(rng.integers(-4, 6))
                bx = (max(x, x0), y, min(x + w, x1), min(y + course, y1))
                if bx[2] > bx[0]:
                    shade = [light, mid, mid, dark][int(rng.integers(0, 4))]
                    self.d.rectangle(bx, fill=hexc(shade), outline=hexc(dark))
                x += w
            y += course
            row += 1

    def planks(self, box, vertical=False, step=9, light=WOOD, dark=WOOD_D):
        x0, y0, x1, y1 = box
        self.d.rectangle(box, fill=hexc(light))
        if vertical:
            for x in range(x0, x1, step):
                self.d.line([x, y0, x, y1], fill=hexc(dark), width=2)
        else:
            for y in range(y0, y1, step):
                self.d.line([x0, y, x1, y], fill=hexc(dark), width=2)

    def shingles(self, poly, light=SLATE_L, dark=SLATE, step=7):
        self.d.polygon(poly, fill=hexc(dark))
        xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
        mask = Image.new("L", (self.w, self.h), 0)
        ImageDraw.Draw(mask).polygon(poly, fill=255)
        layer = Image.new("RGB", (self.w, self.h), hexc(dark))
        ld = ImageDraw.Draw(layer)
        for y in range(min(ys), max(ys), step):
            off = (y // step % 2) * step
            for x in range(min(xs) - step, max(xs), step * 2):
                ld.rectangle([x + off, y, x + off + step * 2 - 2, y + step - 2], fill=hexc(light), outline=hexc(dark))
        self.im.paste(layer, (0, 0), mask)

    def thatch(self, poly, light=THATCH, dark=THATCH_D):
        self.d.polygon(poly, fill=hexc(light))
        ys = [p[1] for p in poly]; xs = [p[0] for p in poly]
        mask = Image.new("L", (self.w, self.h), 0)
        ImageDraw.Draw(mask).polygon(poly, fill=255)
        layer = self.im.copy(); ld = ImageDraw.Draw(layer)
        for _ in range(int((max(xs) - min(xs)) * (max(ys) - min(ys)) / 60)):
            x = int(rng.integers(min(xs), max(xs))); y = int(rng.integers(min(ys), max(ys)))
            ld.line([x, y, x + int(rng.integers(-3, 3)), y + int(rng.integers(5, 12))], fill=hexc(dark), width=1)
        self.im.paste(layer, (0, 0), mask)

    def window(self, box, lit=True, arch=False):
        x0, y0, x1, y1 = box
        self.d.rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], fill=hexc(STONE_D))
        if arch:
            self.d.pieslice([x0 - 2, y0 - (x1 - x0) // 2 - 2, x1 + 2, y0 + (x1 - x0) // 2 + 2], 180, 360, fill=hexc(STONE_D))
            self.d.pieslice([x0, y0 - (x1 - x0) // 2, x1, y0 + (x1 - x0) // 2], 180, 360, fill=hexc(GLOW if lit else DARK))
        self.d.rectangle(box, fill=hexc(GLOW if lit else DARK))
        if lit:
            cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
            self.d.line([cx, y0, cx, y1], fill=hexc(GLOW_D), width=2); self.d.line([x0, cy, x1, cy], fill=hexc(GLOW_D), width=2)

    def door(self, box, arch=True):
        x0, y0, x1, y1 = box
        self.d.rectangle(box, fill=hexc(WOOD_D))
        for x in range(x0 + 3, x1, 6):
            self.d.line([x, y0, x, y1], fill=hexc(WOOD), width=2)
        if arch:
            r = (x1 - x0) // 2
            self.d.pieslice([x0, y0 - r, x1, y0 + r], 180, 360, fill=hexc(WOOD_D))
        self.d.ellipse([x1 - 9, (y0 + y1) // 2 - 2, x1 - 5, (y0 + y1) // 2 + 2], fill=hexc(IRON))

    def post(self, x, y0, y1, w=6, col=WOOD_D):
        self.d.rectangle([x - w // 2, y0, x + w // 2, y1], fill=hexc(col))

    def ground_shadow(self, cx, cy, rx, ry, col=MOSS):
        self.d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=hexc(col))

    def finish(self, blur=0.6, light_from_left=True):
        arr = np.asarray(self.im).astype(np.float32)
        mask = arr.sum(-1) < 740
        shade = np.linspace(1.08, 0.84, self.w)[None, :, None] if light_from_left else 1.0
        arr = np.where(mask[..., None], np.clip(arr * shade, 0, 255), arr)
        g = (periodic_noise(self.w, self.h, 10, np.random.default_rng(3)) - 0.5) * 14
        arr = np.where(mask[..., None], np.clip(arr + g[..., None], 0, 255), arr)
        return Image.fromarray(arr.astype(np.uint8), "RGB").filter(ImageFilter.GaussianBlur(blur))
