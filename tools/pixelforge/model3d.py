"""A painting -> a coloured 3D model for the sprite road, in one command (the road chosen 2026-10-05).

  .venv/Scripts/python model3d.py NAME --front F.png [--side S.png] [--back B.png] [--out DIR]
  .venv/Scripts/python model3d.py NAME --sheet SHEET.png      # a turnaround sheet: front, side, back side by side
  options: --faces 120000  --seed 1234  --side-from -x|+x  --steps 30  --octree 256  --keep-raw

1. the figure is set on plain white (a sheet is split into its views first: pixelforge.sheet.split_sheet);
2. Hunyuan3D-2 (the free Hugging Face demo, tencent/Hunyuan3D-2) makes the shape from the front view; a Hugging Face
   token in ~/.huggingface/token (never printed) gives more free GPU time a day than anonymous use;
3. Blender (pixelforge/blender/model_from_views.py) cleans it, colours it from the views, and reduces it;
4. pictures to judge it by: the painting beside the model from front, three-quarter, side and back, unlit, and the
   same front at the game's figure height.
Writes DIR/NAME.glb (the model), DIR/NAME_raw.glb (the shape as generated, with --keep-raw), DIR/NAME_views.png,
DIR/NAME_size.png, and DIR/views/{front,side,back}.png. DIR defaults to docs/concepts/NAME/model3d in the game repo.
"""
import argparse, os, shutil, subprocess, sys, time
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BLENDER_SCRIPTS = HERE / 'pixelforge' / 'blender'


def blender_exe():
    for p in [os.environ.get('BLENDER', ''), r'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe',
              r'C:/Program Files/Blender Foundation/Blender 4.4/blender.exe', '/usr/bin/blender', shutil.which('blender') or '']:
        if p and Path(p).exists():
            return p
    sys.exit('Blender not found: set BLENDER=path')


def on_white(src: Image.Image, dst: Path, pad=24):
    """the figure on plain white, a little room round it (what both the generator and the projection expect)"""
    im = src.convert('RGBA')
    bb = im.getchannel('A').getbbox() or (0, 0, im.width, im.height)
    im = im.crop(bb)
    bg = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), (255, 255, 255, 255))
    bg.alpha_composite(im, (pad, pad))
    dst.parent.mkdir(parents=True, exist_ok=True)
    bg.convert('RGB').save(dst)
    return dst


def views_from_args(a, vdir: Path):
    out = {}
    vdir.mkdir(parents=True, exist_ok=True)
    if a.sheet:
        sys.path.insert(0, str(HERE))
        from pixelforge.sheet import split_sheet, normalize_heights
        vs = normalize_heights(split_sheet(Image.open(a.sheet), expected=a.views or None))
        names = {3: ['front', 'side', 'back'], 2: ['front', 'side'], 1: ['front'], 4: ['front', 'quarter', 'side', 'back']}.get(len(vs))
        if not names:
            sys.exit(f'the sheet split into {len(vs)} views; give --front/--side/--back instead')
        for v, n in zip(vs, names):
            if n != 'quarter':
                out[n] = on_white(v.image, vdir / f'{n}.png')
    for n in ('front', 'side', 'back'):
        p = getattr(a, n)
        if p:
            im = Image.open(p)
            if im.mode != 'RGBA':                       # already on a plain ground: keep it as it is
                im.convert('RGB').save(vdir / f'{n}.png') if Path(p).resolve() != (vdir / f'{n}.png').resolve() else None
                out[n] = vdir / f'{n}.png'
            else:
                out[n] = on_white(im, vdir / f'{n}.png')
    if 'front' not in out:
        sys.exit('a front view is needed (--front or --sheet)')
    if 'back' not in out:
        # no back view: the front, mirrored, stands for it (a tree, a stone, most props read true that way; a figure's
        # back is better painted, so give one when there is one)
        from PIL import ImageOps
        ImageOps.mirror(Image.open(out['front']).convert('RGB')).save(vdir / 'back.png')
        out['back'] = vdir / 'back.png'
        print('  no back view: the front mirrored stands for it', flush=True)
    return out


def hunyuan(front: Path, out: Path, a):
    from gradio_client import Client, handle_file
    tokf = Path.home() / '.huggingface' / 'token'
    tok = os.environ.get('HF_TOKEN') or (tokf.read_text().strip() if tokf.exists() else None)
    last = None
    for t in range(a.tries):
        try:
            c = Client('tencent/Hunyuan3D-2', token=tok) if tok else Client('tencent/Hunyuan3D-2')
            r = c.predict(caption=None, image=handle_file(str(front)), mv_image_front=None, mv_image_back=None,
                          mv_image_left=None, mv_image_right=None, steps=a.steps, guidance_scale=5.0, seed=a.seed,
                          octree_resolution=a.octree, check_box_rembg=True, num_chunks=8000, randomize_seed=False,
                          api_name='/shape_generation')
            p = r[0].get('value') if isinstance(r[0], dict) else r[0]
            shutil.copy(p, out)
            return r[2]
        except Exception as e:                           # a busy queue or a spent daily quota: say so, wait, again
            last = str(e)
            print(f'  generator try {t + 1}: {last[:200]}', flush=True)
            if 'quota' in last.lower():
                break
            time.sleep(15)
    sys.exit('the generator failed: ' + (last or '?'))


def pictures(model: Path, front: Path, name: str, odir: Path):
    look = BLENDER_SCRIPTS / 'look_views.py'
    subprocess.run([blender_exe(), '-b', '-P', str(look), '--', str(model), str(odir / f'_{name}_v')],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ims = [Image.open(front).convert('RGB')]
    ims[0] = ims[0].resize((max(1, round(ims[0].width * 800 / ims[0].height)), 800))
    vs = [Image.open(odir / f'_{name}_v_{a}.png').convert('RGB') for a in (0, 45, 90, 180)]
    row = Image.new('RGB', (sum(i.width for i in ims + vs), 800), (40, 40, 48))
    x = 0
    for i in ims + vs:
        row.paste(i, (x, 0)); x += i.width
    row.save(odir / f'{name}_views.png')
    # the front at the game's figure height (195 px), three times larger to look at
    v = vs[0]
    bb = Image.eval(v.convert('L'), lambda q: 255 if q > 60 else 0).getbbox() or (0, 0, v.width, v.height)
    c = v.crop(bb)
    s = c.resize((max(1, round(c.width * 195 / c.height)), 195), Image.BOX)
    s.resize((s.width * 3, s.height * 3), Image.NEAREST).save(odir / f'{name}_size.png')
    for a in (0, 45, 90, 180):
        (odir / f'_{name}_v_{a}.png').unlink(missing_ok=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('name')
    ap.add_argument('--front'); ap.add_argument('--side'); ap.add_argument('--back'); ap.add_argument('--sheet')
    ap.add_argument('--views', type=int, default=0, help='how many figures the sheet holds (default: as found)')
    ap.add_argument('--out'); ap.add_argument('--faces', type=int, default=120000)
    ap.add_argument('--seed', type=int, default=1234); ap.add_argument('--steps', type=int, default=30)
    ap.add_argument('--octree', type=int, default=256); ap.add_argument('--tries', type=int, default=3)
    ap.add_argument('--side-from', default='-x'); ap.add_argument('--keep-raw', action='store_true')
    ap.add_argument('--raw', help='skip the generator: use this .glb as the shape')
    a = ap.parse_args()
    odir = Path(a.out) if a.out else ROOT / 'docs' / 'concepts' / a.name / 'model3d'
    odir.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    views = views_from_args(a, odir / 'views')
    print('views:', ', '.join(views), flush=True)
    raw = odir / f'{a.name}_raw.glb'
    if a.raw:
        shutil.copy(a.raw, raw)
    else:
        print('generating the shape (Hunyuan3D-2)...', flush=True)
        st = hunyuan(views['front'], raw, a)
        print(f'  {st.get("number_of_faces", "?")} faces in {time.time() - t0:.0f}s', flush=True)
    model = odir / f'{a.name}.glb'
    cmd = [blender_exe(), '-b', '-P', str(BLENDER_SCRIPTS / 'model_from_views.py'), '--', str(raw), str(model),
           f'faces={a.faces}', f'side_from={a.side_from}'] + [f'{k}={v}' for k, v in views.items()]
    print('cleaning, colouring, reducing (Blender)...', flush=True)
    r = subprocess.run(cmd, capture_output=True, text=True)
    for line in r.stdout.splitlines():
        if line.startswith('[model]'):
            print(' ', line[8:], flush=True)
    if r.returncode or not model.exists():
        print(r.stdout[-2000:], r.stderr[-2000:])
        sys.exit('Blender failed')
    pictures(model, views['front'], a.name, odir)
    if not a.keep_raw and not a.raw:
        raw.unlink(missing_ok=True)
    mb = model.stat().st_size / 1e6
    print(f'done in {time.time() - t0:.0f}s: {model} ({mb:.1f} MB), {odir / (a.name + "_views.png")}, {odir / (a.name + "_size.png")}')


if __name__ == '__main__':
    main()
