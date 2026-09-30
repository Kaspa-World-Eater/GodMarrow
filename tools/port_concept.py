from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage as nd
a=np.array(Image.open('src.png').convert('RGB')).astype(int)
H,W,_=a.shape
lum=a.sum(2)
r,g,b=a[...,0],a[...,1],a[...,2]
m=lum>11
# the ground ellipse: dark teal pool under the feet (g,b high relative to r, dim)
ell=(np.arange(H)[:,None]>1112)&(r<9)&(g<46)
m&=~ell
m=nd.binary_opening(m,iterations=1)
lab,n=nd.label(m);sz=nd.sum(m,lab,range(1,n+1))
keep=np.zeros(n+1,bool);keep[1:]=sz>400
m=keep[lab]
m=nd.binary_closing(m,iterations=7);m=nd.binary_fill_holes(m)
ys,xs=np.where(m);y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
print('bbox',y0,y1,x0,x1)
TH=int(__import__('sys').argv[1]) if len(__import__('sys').argv)>1 else 195
k=TH/(y1-y0+1)
rgba=np.dstack([a,m*255]).astype(np.uint8)[y0:y1+1,x0:x1+1]
im=Image.fromarray(rgba,'RGBA')
w2,h2=round(im.width*k),TH
# premultiplied downscale
pm=np.array(im).astype(float);al=pm[...,3:4]/255;pm[...,:3]*=al
s=np.array(Image.fromarray(pm[...,:3].astype(np.uint8)).resize((w2,h2),Image.BOX)).astype(float)
sa=np.array(Image.fromarray(rgba[...,3]).resize((w2,h2),Image.BOX)).astype(float)/255
col=np.where(sa[...,None]>0.01,s/np.maximum(sa[...,None],1e-3),0).clip(0,255)
A=sa>0.45
# palette: 48 colours, no dither
rgb=Image.fromarray(col.astype(np.uint8))
q=rgb.quantize(56,method=Image.FASTOCTREE,dither=Image.NONE).convert('RGB')
out=np.dstack([np.array(q),A*255]).astype(np.uint8)
# dark outline where an opaque pixel touches empty
edge=A&~nd.binary_erosion(A)
out[edge,:3]=(out[edge,:3]*0.35).astype(np.uint8)
Image.fromarray(out,'RGBA').save('oss_front.png')
# foot anchor: the midpoint between the boots' lowest opaque row
ys2,xs2=np.where(A);fy=ys2.max();fx=int(xs2[ys2>=fy-3].mean())
open('anchor.txt','w').write('%d %d %d %d'%(fx,fy,w2,h2))
print('size',w2,h2,'anchor',fx,fy)
