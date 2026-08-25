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
    if isinstance(ink,str): ink=rgb(ink)
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


# ══ 레이아웃 UI ═════════════════════════════════
def tile(name,w,h,fn):
    im=Image.new('RGBA',(w,h),T); px=im.load()
    for y in range(h):
        for x in range(w):
            c=fn(x,y)
            if c: px[x,y]=rgb(c) if isinstance(c,str) else c
    im.save(os.path.join(OUT,name+'.png')); return im

# 진행바 — 테두리(9-slice) + 안쪽을 가로로 반복하는 채움 타일
frame('bar',12,4,      hi='#16161b', lo='#4a4740', body='#0c0c0e')
frame('bar_sm',8,2,    hi='#16161b', lo='#3d3a33', body='#0c0c0e')

def fillbar(name,ramp,h):
    def f(x,y):
        t=y/max(1,h-1)
        i=min(len(ramp)-1,int(t*len(ramp)))
        c=ramp[i]
        if y==0: c=ramp[-1]
        if x%8==0 and y>0: c=ramp[max(0,i-1)]   # 세로 눈금
        return c
    tile(name,8,h,f)
fillbar('fill_hp',   ['#e0917a','#cf7a63','#a54a36','#7a2a20'],12)
fillbar('fill_hp_sm',['#e0917a','#cf7a63','#a54a36','#7a2a20'],6)
fillbar('fill_gold', ['#fbeec2','#ecd08a','#d4a94a','#7a5f28'],12)

# 아이콘 우물 — 안쪽으로 파인 액자
frame('well',16,5, ink='#0b0b0d', hi='#16161b', lo='#5c5748', body='#141419', line='#2a2a33')
# 로그 · 입력칸 — 깊게 파인 판
frame('inset',16,5, ink='#0b0b0d', hi='#141419', lo='#4a4740', body='#0c0c0e', line='#1a1a20')
# 태그 칩
frame('tag',10,3, hi='#4a4740', lo='#16161b', body='#1c1c22')

# 구분선 : 가로 반복 + 가운데 장식
tile('rule',8,5,lambda x,y:('#7a5f28' if y==2 else ('#3d3a33' if y==1 or y==3 else None)))
def diamond(x,y):
    d=abs(x-5)+abs(y-4)
    if d==0: return '#fbeec2'
    if d<=1: return '#ecd08a'
    if d<=2: return '#d4a94a'
    if d<=3: return '#7a5f28'
    if d<=4: return '#08080a'
    return None
tile('rule_mid',11,9,diamond)

# 상단 바 아래 테두리
def topedge(x,y):
    return ['#3d3a33','#7a5f28','#1a1a20','#0e0e11'][y] if y<4 else None
tile('topedge',8,4,topedge)

# 배경 타일 — 어두운 돌결. 32칸에서 이어 붙는다.
def bg(x,y):
    v=(x*7+y*13)%23
    if (x-y)%8==0: return '#131318'
    if (x+y)%16==0: return '#121216'
    if v==0: return '#141419'
    if v==11: return '#0d0d10'
    return '#0f0f13'
tile('bg',32,32,bg)

# 모달 뒷막 — 체크무늬 디더
tile('dither',4,4,lambda x,y:(8,5,14,232) if (x+y)%2==0 else (0,0,0,0))

# 탭 알림 점
def dot(x,y):
    d=(x-3)**2+(y-3)**2
    if d<=1: return '#fbeec2'
    if d<=4: return '#ecd08a'
    if d<=8: return '#d4a94a'
    if d<=12: return '#7a5f28'
    return None
tile('dot',7,7,dot)

# 스크롤바
tile('scroll_track',12,8,lambda x,y:'#0c0c0e' if x else '#1c1a16')
def sthumb(x,y):
    if x in (0,11): return '#0c0c0e'
    if x==1: return '#6e6858'
    if x==10: return '#26241f'
    if y%8==2: return '#5c5748'
    return '#403d34'
tile('scroll_thumb',12,8,sthumb)

# 상단 광채 — 4x4 순서 디더. 부드러운 그라디언트 대신 도트로 계조를 낸다.
BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]
def glow_px(x,y):
    t=max(0.0,1.0-y/190.0)**2.2
    if BAYER[y%4][x%4]/16.0 < t*0.85:
        return (212,169,74, int(40+70*t))
    return None
tile('bg_glow',32,190,glow_px)

# 자동화 스위치
def switch(on):
    W,H=22,12
    im=Image.new('RGBA',(W,H),T); px=im.load()
    body = '#3a2d14' if on else '#17171c'
    edge_= '#d4a94a' if on else '#4a4740'
    for y in range(H):
        for x in range(W):
            d=min(x,y,W-1-x,H-1-y)
            if d==0: px[x,y]=rgb('#08080a')
            elif d==1: px[x,y]=rgb(edge_)
            else: px[x,y]=rgb(body)
    kx = W-9 if on else 2
    for y in range(2,H-2):
        for x in range(kx,kx+7):
            t=(y-2)/(H-5)
            ramp=['#fbeec2','#ecd08a','#d4a94a','#7a5f28'] if on else ['#b6b6c2','#8a8a9a','#66667a','#35353f']
            px[x,y]=rgb(ramp[min(len(ramp)-1,int(t*len(ramp)))])
    for x in range(kx,kx+7):
        px[x,1]=rgb('#08080a'); px[x,H-2]=rgb('#08080a')
    im.save(os.path.join(OUT,('sw_on' if on else 'sw_off')+'.png'))
switch(True); switch(False)

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
