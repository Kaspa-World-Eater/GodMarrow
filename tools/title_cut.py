import numpy as np, cv2, sys
from PIL import Image
from scipy import ndimage as nd
def cut(k, pr=6, sure=26, bgt=3):
    a=np.asarray(Image.open(f'{k}_src.png')).astype(np.float32)
    bg=np.median(np.concatenate([a[:8].reshape(-1,3),a[:, :8].reshape(-1,3),a[:, -8:].reshape(-1,3)]),axis=0)
    d=np.sqrt(((a-bg)**2).sum(-1))
    d=cv2.GaussianBlur(d,(5,5),0)
    mask=np.full(d.shape, cv2.GC_PR_BGD, np.uint8)
    mask[d>pr]=cv2.GC_PR_FGD; mask[d>sure]=cv2.GC_FGD; mask[d<bgt]=cv2.GC_BGD
    bgm=np.zeros((1,65)); fgm=np.zeros((1,65))
    img=np.asarray(Image.open(f'{k}_src.png'))[:,:,::-1].copy()
    cv2.grabCut(img,mask,None,bgm,fgm,5,cv2.GC_INIT_WITH_MASK)
    m=(mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD)
    m=nd.binary_opening(m,iterations=1)
    lab,n=nd.label(m); sizes=nd.sum(m,lab,range(1,n+1)); m=lab==(1+int(np.argmax(sizes)))
    m=nd.binary_fill_holes(m)
    H,W=m.shape; rows=m.sum(1); ys=np.where(rows>0)[0]; top,bot=ys[0],ys[-1]
    low=[y for y in range(int(top+0.75*(bot-top)),bot+1) if rows[y]>0.4*W]
    if low:
        pt=min(low); cols=nd.binary_dilation(m[pt-50:pt].any(0),iterations=10); m[pt:]&=cols[None,:]
        lab,n=nd.label(m); sizes=nd.sum(m,lab,range(1,n+1)); m=lab==(1+int(np.argmax(sizes)))
    out=np.dstack([a.astype(np.uint8),(m*255).astype(np.uint8)])
    Image.fromarray(out,'RGBA').save(f'{k}_cut2.png')
if __name__=='__main__':
    res=[]
    for k in ['mystic','hemo','ossu']:
        cut(k)
        i2=Image.open(f'{k}_cut2.png'); b2=Image.new('RGBA',i2.size,(120,20,60,255)); b2.alpha_composite(i2)
        res.append(b2.convert('RGB').resize((int(i2.width*400/i2.height),400)))
    o=Image.new('RGB',(sum(i.width for i in res),400)); x=0
    for i in res: o.paste(i,(x,0)); x+=i.width
    o.save('/tmp/ossport/cuts.png')
