#!/usr/bin/env python3
"""
UI 도트 프레임 · 로고 빌드

  python3 tools/build_ui.py

art/ui/ 에 9-slice 테두리 PNG 와 로고를 굽는다.
테두리는 CSS border-image 로 쓴다. 가운데는 비워 두어 원래 배경이 비친다.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'art','ui')
os.makedirs(OUT,exist_ok=True)

def rgb(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
T=(0,0,0,0)

INK   = rgb('#08080a')
def frame(name,n,slice_,ink=INK,hi='#6e6858',lo='#17171c',body='#2a2a33',
          line=None,corner=None,pad=1):
    """n×n, 바깥 slice_ px 만 칠한다. d=가장자리까지 거리."""
    im=Image.new('RGBA',(n,n),T); px=im.load()
    hi,lo,body=rgb(hi),rgb(lo),rgb(body)
    line=rgb(line) if line else None
    corner=rgb(corner) if corner else None
    for y in range(n):
        for x in range(n):
            d=min(x,y,n-1-x,n-1-y)
            if d>=slice_: continue
            top = (x+y) < (n-1)
            if   d==0: c=ink
            elif d==1: c=hi if top else lo
            elif d==2: c=body
            elif d==3 and line: c=line
            else: continue
            px[x,y]=c
    if corner:
        for cx,cy in ((0,0),(n-1,0),(0,n-1),(n-1,n-1)):
            sx=1 if cx==0 else -1; sy=1 if cy==0 else -1
            for k in range(1,5):
                px[cx+sx*k, cy+sy*1]=corner
                px[cx+sx*1, cy+sy*k]=corner
            px[cx+sx*2,cy+sy*2]=corner
    im.save(os.path.join(OUT,name+'.png'))
    return im

# ── 패널 · 모달 ──────────────────────────────
frame('panel',24,8, body='#2a2a33', line='#3d3a33', corner='#7a5f28')
frame('modal',24,8, hi='#8a7a52', body='#33302a', line='#7a5f28', corner='#d4a94a')
frame('plate',18,6, body='#26262e', line='#3d3a33', corner='#7a5f28')

# ── 버튼 ────────────────────────────────────
frame('btn',18,6,        hi='#7d7666', lo='#16161b', body='#2e2e37', line='#4a4a44')
frame('btn_hover',18,6,  hi='#9a9280', lo='#1c1c22', body='#3a3a45', line='#a9822f')
frame('btn_active',18,6, hi='#16161b', lo='#7d7666', body='#22222a', line='#3d3a33')
frame('btn_gold',18,6,   hi='#ecd08a', lo='#3a2d10', body='#4a3a18', line='#d4a94a', corner='#f6e6b4')
frame('btn_gold_hover',18,6, hi='#fbeec2', lo='#4a3a18', body='#5c4820', line='#ecd08a', corner='#fbeec2')

# ── 탭 ──────────────────────────────────────
frame('tab',18,6,    hi='#3a3a45', lo='#101014', body='#1e1e24', line='#26262e')
frame('tab_on',18,6, hi='#8a7a52', lo='#1c1c22', body='#332c1c', line='#d4a94a', corner='#ecd08a')

# ── 목록 항목 ────────────────────────────────
frame('unit',18,6,      hi='#4a4740', lo='#131317', body='#22222a', line='#302d26')
frame('up',18,6,        hi='#4a4740', lo='#131317', body='#22222a', line='#302d26')
frame('up_afford',18,6, hi='#8a7a52', lo='#1c1c22', body='#2e2a1e', line='#d4a94a', corner='#ecd08a')
frame('up_done',18,6,   hi='#6f8a66', lo='#141a12', body='#1f2a1c', line='#4e6b46', corner='#8fae86')

# ── 로고 ────────────────────────────────────
FONT='/System/Library/Fonts/AppleSDGothicNeo.ttc'
def bitmap_text(txt,size,idx=6,thr=110):
    """트루타입을 안티에일리어스 없이 도트로 굳힌다"""
    f=ImageFont.truetype(FONT,size,index=idx)
    x0,y0,x1,y1=f.getbbox(txt)
    w,h=x1-x0+2,y1-y0+2
    m=Image.new('L',(w,h),0)
    ImageDraw.Draw(m).text((-x0+1,-y0+1),txt,font=f,fill=255)
    return m.point(lambda v:255 if v>=thr else 0)

GOLD=['#7a5f28','#a8823a','#d4a94a','#ecd08a','#fbeec2']
def stamp(dst,mask,ox,oy,ramp,outline='#08080a',shine=True):
    w,h=mask.size; mp=mask.load()
    ram=[rgb(c) for c in ramp]
    hit={(x,y) for y in range(h) for x in range(w) if mp[x,y]}
    def put(x,y,c):
        if 0<=x<dst.width and 0<=y<dst.height: dst.putpixel((x,y),c)
    for (x,y) in hit:                       # 외곽선 먼저
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
            if (x+dx,y+dy) not in hit: put(ox+x+dx,oy+y+dy,rgb(outline))
    ys=[y for _,y in hit]; y0,y1=min(ys),max(ys)
    for (x,y) in hit:
        t=(y-y0)/max(1,(y1-y0))
        i=len(ram)-1-int(t*(len(ram)-.001))
        put(ox+x,oy+y,ram[max(0,min(len(ram)-1,i))])
    if shine:
        for (x,y) in hit:
            if (x,y-1) not in hit: put(ox+x,oy+y,ram[-1])

t1=bitmap_text('마탑',21)
t2=bitmap_text('심연의 왕국',12)
EMB=32; GAP=7; PADX=1; PADY=2
tx=PADX+EMB+GAP
W=tx+max(t1.width,t2.width)+3
H=max(EMB, PADY+t1.height+4+t2.height+PADY)
logo=Image.new('RGBA',(W,H),T)
tw=Image.open(os.path.join(ROOT,'art','sprites','tower.png'))
logo.alpha_composite(tw,(PADX,(H-EMB)//2))
ty=(H-(t1.height+4+t2.height))//2
stamp(logo, t1, tx, ty, GOLD)
stamp(logo, t2, tx+1, ty+t1.height+4, ['#6b5222','#a8823a','#d4a94a','#ecd08a'], shine=False)
for x in range(tx, W-2):
    logo.putpixel((x, min(H-1, ty+t1.height+2)), rgb('#7a5f28'))
logo.save(os.path.join(OUT,'logo.png'))

print('art/ui 에',len(os.listdir(OUT)),'개 저장 · 로고',logo.size)
