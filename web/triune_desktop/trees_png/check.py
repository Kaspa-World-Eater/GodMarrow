import json,sys
from collections import defaultdict
d=json.load(open(sys.argv[1]))
col=lambda c:30+c*58; row=lambda r:42+r*31
ROWREQ=[1,6,12,18,24,30]
probs=[]
def path(pa,ch,tabskills):
    px,py,cx,cy=col(pa['c']),row(pa['r']),col(ch['c']),row(ch['r'])
    between=any(s['c']==ch['c'] and pa['r']<s['r']<ch['r'] for s in tabskills)
    if pa['c']==ch['c'] and not between: return [(px,py+13),(cx,cy-14)]
    gy=py+15.5; gx=cx+(-20.5 if ch['c']>=pa['c'] else 20.5)
    return [(px,py+13),(px,gy),(gx,gy),(gx,cy),(cx-14 if gx<cx else cx+14,cy)]
def segs(p): return list(zip(p,p[1:]))
def inter(a,b):
    (x1,y1),(x2,y2)=a;(x3,y3),(x4,y4)=b
    # axis-aligned segments: check overlap/cross
    if x1==x2 and x3==x4:
        return abs(x1-x3)<1.5 and max(min(y1,y2),min(y3,y4))<min(max(y1,y2),max(y3,y4))-0.5
    if y1==y2 and y3==y4:
        return abs(y1-y3)<1.5 and max(min(x1,x2),min(x3,x4))<min(max(x1,x2),max(x3,x4))-0.5
    if x1==x2: (x1,y1),(x2,y2),(x3,y3),(x4,y4)=b[0],b[1],a[0],a[1]
    # now a horizontal (y1==y2), b vertical x3
    return min(x1,x2)+0.5<x3<max(x1,x2)-0.5 and min(y3,y4)+0.5<y1<max(y3,y4)-0.5
g=defaultdict(list)
for k,s in d.items(): s['id']=k; g[(s['cls'],s['tab'])].append(s)
for (cls,tab),L in sorted(g.items()):
    cells=defaultdict(list)
    for s in L: cells[(s['r'],s['c'])].append(s['id'])
    for c,v in cells.items():
        if len(v)>1: probs.append(f"{cls}/{tab} overlap {v} at {c}")
    arrows=[]
    for s in L:
        if s['req']!=ROWREQ[s['r']]: probs.append(f"{cls}/{tab} {s['id']} req {s['req']} != row {s['r']}")
        p=s.get('pre')
        if not p:
            if s['r']>0 and s['r']<5: probs.append(f"{cls}/{tab} orphan {s['id']} (r{s['r']})")
            continue
        pa=d[p]
        if pa['cls']!=cls: probs.append(f"{s['id']} pre other class")
        if pa['tab']!=tab: probs.append(f"note {cls}/{tab} {s['id']} cross-tab pre {p} (tab {pa['tab']}, r{pa['r']}) vs r{s['r']}"); 
        if pa['r']>=s['r']: probs.append(f"{cls}/{tab} {s['id']} pre {p} not above (r{pa['r']} >= r{s['r']})")
        if pa['tab']==tab: arrows.append((p,s['id'],path(pa,s,L)))
    # arrow vs icon boxes
    for p,c,pts in arrows:
        for sg in segs(pts):
            for s in L:
                if s['id'] in (p,c): continue
                x,y=col(s['c']),row(s['r'])
                (a,b),(e,f)=sg
                if max(min(a,e),x-12)<=min(max(a,e),x+12) and max(min(b,f),y-12)<=min(max(b,f),y+12):
                    probs.append(f"{cls}/{tab} arrow {p}->{c} crosses icon {s['id']}")
    for i in range(len(arrows)):
        for j in range(i+1,len(arrows)):
            A,B=arrows[i],arrows[j]
            if A[0]==B[0]: continue
            for s1 in segs(A[2]):
                for s2 in segs(B[2]):
                    if inter(s1,s2): probs.append(f"{cls}/{tab} arrows {A[0]}->{A[1]} and {B[0]}->{B[1]} cross/overlap")
    # rows use
    rows=[sum(1 for s in L if s['r']==r) for r in range(6)]
    probs.append(f"info {cls}/{tab} per-row {rows} routed={[a[1] for a in arrows if len(a[2])>2]}")
print('\n'.join(probs))
