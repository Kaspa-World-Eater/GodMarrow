"""A painting -> a coloured 3D model (.glb) through the free TRELLIS demo on Hugging Face (trellis-community/TRELLIS),
no account needed (a token in ~/.huggingface/token buys more daily GPU time). Images are cutouts or plain-background figures; with several (front, side, back) they are used
together. The free queue can be busy: it retries.

  .venv/Scripts/python trellis_gen.py OUT.glb FRONT.png [SIDE.png BACK.png ...] [--seed N] [--tex 1024]
"""
import argparse, os, shutil, sys, time
from gradio_client import Client, handle_file

ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('images', nargs='+')
ap.add_argument('--seed', type=int, default=0); ap.add_argument('--tex', type=int, default=1024); ap.add_argument('--simplify', type=float, default=0.95)
ap.add_argument('--space', default='trellis-community/TRELLIS'); ap.add_argument('--tries', type=int, default=4)
A = ap.parse_args()
# a Hugging Face token (more free GPU time a day than anonymous use) from ~/.huggingface/token or HF_TOKEN; never printed
TOK = os.environ.get('HF_TOKEN') or (open(os.path.expanduser('~/.huggingface/token')).read().strip() if os.path.exists(os.path.expanduser('~/.huggingface/token')) else None)

for t in range(A.tries):
    try:
        c = Client(A.space, token=TOK) if TOK else Client(A.space)
        try:
            c.predict(api_name='/start_session')
        except Exception:
            pass
        multi = [{'image': handle_file(p), 'caption': None} for p in A.images[1:]]
        if multi:
            multi = [{'image': handle_file(A.images[0]), 'caption': None}] + multi
        r = c.predict(image=handle_file(A.images[0]), multiimages=multi, seed=A.seed, ss_guidance_strength=7.5,
                      ss_sampling_steps=12, slat_guidance_strength=3.0, slat_sampling_steps=12,
                      multiimage_algo='stochastic', mesh_simplify=A.simplify, texture_size=A.tex,
                      api_name='/generate_and_extract_glb')
        glb = r[2] if isinstance(r[2], str) else (r[2] or {}).get('value') or r[1]
        if isinstance(glb, dict):
            glb = glb.get('value') or glb.get('path')
        shutil.copy(glb, A.out)
        print('wrote', A.out)
        sys.exit(0)
    except Exception as e:
        print('try', t + 1, 'failed:', str(e)[:300])
        time.sleep(20)
sys.exit(1)
