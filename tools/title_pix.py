import numpy as np
from PIL import Image
from scipy import ndimage as nd
# the pilgrims at the chapel's grain: cut paintings -> pixel figures lit by the fire from one side and from below
SPEC={'hemo':(112,+1,5),'mystic':(118,+1,1),'ossu':(124,-1,2)}     # height in chapel px, fire side (+1 right, -1 left)
def pix(k,H,side,trim=1):
    im=Image.open(f'{k}_cut2.png'); a=np.asarray(im)
    ys=np.where(a[...,3].sum(1)>0)[0]; xs=np.where(a[...,3].sum(0)>0)[0]
    im=im.crop((xs[0],ys[0],xs[-1]+1,ys[-1]+1))
    W=max(1,round(im.width*H/im.height))
    # premultiplied downscale
    f=np.asarray(im).astype(np.float32)/255; f[...,:3]*=f[...,3:]
    sm=np.asarray(Image.fromarray((f*255).astype(np.uint8),'RGBA').resize((W,H),Image.LANCZOS)).astype(np.float32)/255
    al=sm[...,3]; rgb=np.where(al[...,None]>0.02, sm[...,:3]/np.maximum(al[...,None],1e-3),0)
    m=al>0.5
    # the painted plinth under the feet: the last rows go (the chapel floor and a cast shadow take their place)
    rows=np.where(m.any(1))[0]
    m[rows[-1]-trim:]=False
    # light: from the fire's side and from below; the far side and the head fall into shadow
    yy,xx=np.mgrid[0:H,0:W]
    sx=(xx/(W-1)) if side>0 else (1-xx/(W-1))
    sy=yy/(H-1)
    L=0.5+0.7*sx*(0.5+0.5*sy)+0.18*sy
    warm=np.array([1.08,0.86,0.66])
    col=rgb*L[...,None]*(0.55+0.45*warm)
    col=np.clip(col*1.25,0,1)
    # rim on the fire side, a dark edge on the far side
    nb=np.roll(m,-side,axis=1) if True else m
    edge_fire=m & ~np.roll(m, side, axis=1)   # neighbour toward the fire is empty? (roll shifts content)
    edge_fire=m & ~np.pad(m,((0,0),(1,1)))[:, (2 if side>0 else 0):(2 if side>0 else 0)+W]
    edge_far=m & ~np.pad(m,((0,0),(1,1)))[:, (0 if side>0 else 2):(0 if side>0 else 2)+W]
    edge_top=m & ~np.pad(m,((1,1),(0,0)))[0:H,:]
    col[edge_fire]=np.clip(col[edge_fire]*1.35+np.array([0.16,0.09,0.03]),0,1)
    col[edge_far|edge_top&~edge_fire]*=0.55
    out=np.dstack([(col*255).astype(np.uint8),(m*255).astype(np.uint8)])
    img=Image.fromarray(out,'RGBA')
    # a small palette, no dither: flat pixel-art passes
    q=img.convert('RGB').quantize(colors=32,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
    out=np.dstack([np.asarray(q),(m*255).astype(np.uint8)])
    Image.fromarray(out,'RGBA').save(f'{k}_pix.png')
    return Image.fromarray(out,'RGBA')
figs={k:pix(k,*v) for k,v in SPEC.items()}
import shutil
for k in SPEC: shutil.copy(f'{k}_pix.png', f'/tmp/gd/Godmarrow/art/ui/pilgrim_{k}.png')
bg=Image.open('/tmp/gd/chapel.png').convert('RGBA')
POS={'hemo':(230,214),'mystic':(288,207),'ossu':(392,207)}
for k in sorted(POS,key=lambda k:POS[k][1]):
    f=figs[k]; x,y=POS[k]; bg.alpha_composite(f,(x-f.width//2,y-f.height))
bg.resize((1920,1080),Image.NEAREST).save('/tmp/ossport/compose.png')
print({k:v.size for k,v in figs.items()})
