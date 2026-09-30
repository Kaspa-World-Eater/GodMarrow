#!/usr/bin/env python3
# 24 px engraved skill icons for the skills made on 2026-09-30 (tools/skill_trees.py), in the set's own palette,
# with the @dim and @lock states made the way the set's are. Run from the project root.
from PIL import Image, ImageDraw
import math
O = (26, 14, 8, 255); BONE = (207, 198, 174, 255); HI = (236, 230, 212, 255); WOOD = (106, 74, 42, 255)
WOOD2 = (154, 112, 64, 255); IRON = (107, 114, 128, 255); DUST = (42, 36, 32, 255); RED = (122, 22, 26, 255)

def img():
    return Image.new('RGBA', (24, 24), (0, 0, 0, 0))

def px(im, x, y, c):
    if 0 <= x < 24 and 0 <= y < 24:
        im.putpixel((int(x), int(y)), c)

def line(im, x0, y0, x1, y1, c):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / max(1, n)
        px(im, round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)

def outline(im):
    a = im.copy()
    for y in range(24):
        for x in range(24):
            if a.getpixel((x, y))[3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < 24 and 0 <= yy < 24 and a.getpixel((xx, yy))[3] > 0 and a.getpixel((xx, yy)) != O:
                        im.putpixel((x, y), O)
                        break
    return im

def tally():
    im = img()
    for k in range(3):
        line(im, 5 + k, 20, 18 + k, 4, BONE if k != 1 else HI)
    for i, t in enumerate((0.25, 0.4, 0.55, 0.7, 0.85)):
        x = 5 + 13 * t; y = 20 - 16 * t
        line(im, x - 1, y - 1, x + 2, y + 2, O)
    return outline(im)

def ring(n, missing=None, r=8.0, big=False):
    im = img()
    for i in range(9):
        if i == missing:
            continue
        a = -math.pi / 2 + i / 9 * math.tau
        x, y = 12 + math.cos(a) * r, 12 + math.sin(a) * r
        c = HI if i == 0 else BONE
        px(im, x, y, c); px(im, x + 1, y, c); px(im, x, y + 1, c); px(im, x + 1, y + 1, BONE)
    if big:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                px(im, 12 + dx, 12 + dy, BONE if (dx, dy) != (0, 0) else HI)
    return outline(im)

def fewer():
    im = img()
    # one tall frame alone in the middle; two small shades far off
    for y in range(4, 8):
        for x in range(10, 14):
            px(im, x, y, BONE)
    px(im, 11, 5, O); px(im, 12, 5, O)
    line(im, 11, 8, 11, 17, BONE); line(im, 12, 8, 12, 17, HI)
    for y in (10, 12, 14):
        line(im, 9, y, 14, y, BONE)
    line(im, 10, 18, 9, 21, BONE); line(im, 13, 18, 14, 21, BONE)
    for bx in (3, 20):
        px(im, bx, 16, DUST); px(im, bx, 17, DUST); px(im, bx, 18, DUST); px(im, bx, 15, IRON)
    return outline(im)

def weighing():
    im = img()
    line(im, 12, 4, 12, 20, WOOD2); line(im, 9, 20, 15, 20, WOOD)
    line(im, 4, 7, 20, 5, BONE)
    for sx, y in ((5, 7), (19, 5)):
        line(im, sx, y, sx - 2, y + 7, IRON); line(im, sx, y, sx + 2, y + 7, IRON)
    line(im, 1, 14, 7, 14, BONE); line(im, 17, 12, 21, 12, BONE)
    for x in range(2, 7):
        px(im, x, 13, DUST)
    px(im, 4, 12, DUST)
    return outline(im)

def scourge():
    im = img()
    line(im, 3, 21, 8, 16, WOOD); line(im, 4, 21, 9, 16, WOOD2)
    for k, (ex, ey) in enumerate(((20, 5), (21, 11), (15, 3))):
        mx, my = (9 + ex) / 2 + (2 if k == 1 else -1), (16 + ey) / 2 + (2 if k == 0 else 0)
        line(im, 9, 16, mx, my, RED); line(im, mx, my, ex, ey, RED)
        px(im, ex, ey, IRON); px(im, ex + 1, ey, IRON)
    return outline(im)

def states(name, im):
    im.save('art/icons/%s.png' % name)
    dim = im.copy()
    for y in range(24):
        for x in range(24):
            r, g, b, a = dim.getpixel((x, y))
            if a:
                v = int((r * 0.3 + g * 0.59 + b * 0.11) * 0.62)
                dim.putpixel((x, y), (v, v, v, a))
    dim.save('art/icons/%s@dim.png' % name)
    lock = dim.copy()
    for y in range(24):
        for x in range(24):
            r, g, b, a = lock.getpixel((x, y))
            if a:
                lock.putpixel((x, y), (r // 2, g // 2, b // 2, a))
    ref = Image.open('art/icons/blade@lock.png').convert('RGBA')   # the set's own padlock
    for y in range(12, 24):
        for x in range(12, 24):
            c = ref.getpixel((x, y))
            if c[3] and c[0] > 40 and abs(c[0] - c[1]) < 12:
                lock.putpixel((x, y), c)
    lock.save('art/icons/%s@lock.png' % name)

states('tally', tally())
states('opencount', ring(9, missing=4))
states('fewer', fewer())
states('weighing', weighing())
states('countm', ring(9, big=True))
states('scourge', scourge())
print('icons made')
