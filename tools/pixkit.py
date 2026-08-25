"""
도트 드로잉 툴킷

tools/sprites.json 의 문자 격자를 손으로 찍는 대신, 마스크(타원·다각형·선)를 짜고
광원 계산으로 명암을 입혀 격자를 만들어 낸다. 지금 들어 있는 스프라이트 77종이
이걸로 그려졌다. 구운 결과는 sprites.json 에 그대로 남으므로, 이 파일 없이도
게임은 돌아간다. 다시 그릴 때만 쓰면 된다.

  from pixkit import *
  c = C(32)
  paint(c, m_ellipse(16,16,10,10), 'blue')   # 실루엣에 형태 음영
  glow (c, m_ellipse(16,16,4,4), 'gold', 16,16,5)   # 스스로 빛나는 것
  c.outline('D')
  save({'mana': c.rows()}, {'mana': 32})

  paint      광원 방향으로 나가는 거리를 재 ramp 에 대응 (임의 모양)
  paint_cyl  한 축 위치만으로 명암 (원기둥 · 벽면)
  glow       중심이 가장 밝은 방사 그라디언트
  outline    바깥 한 겹을 색조별 어두운 색으로
"""
import math, json, os

# 격자를 기록할 파일. 프로젝트마다 다르므로 환경변수나 set_data() 로 바꾼다.
DATA = os.environ.get('PIXKIT_DATA') or os.path.join(os.getcwd(), 'tools', 'sprites.json')
def set_data(path):
    global DATA
    DATA = path
LX,LY=-0.55,-0.72          # 광원: 왼쪽 위

# 도안은 24칸(또는 32칸) 기준으로 짜 두고, 배율만 바꿔 다른 크기로 다시 찍는다.
# set_scale(16/24) 하면 같은 코드가 16칸 도트로 나온다.
SCALE = 1.0
def set_scale(k):
    global SCALE
    SCALE = k
def _s(v):
    return v*SCALE

# 색 ramp (어두움 -> 밝음)
RAMP={
 'gold'  : list('abcdef'),
 'stone' : list('MIJKL8'),
 'steel' : list('1234567'),
 'blue'  : list('Dpqrst'),
 'green' : list('Bghijk'),
 'red'   : list('Clmno'),
 'purple': list('Euvwxy'),
 'skin'  : list('HGF'),
 'bone'  : list('IJK8z9'),
 'ooze'  : list('NOPQR'),
 'ember' : list('STUVW'),
}
OUT={'gold':'A','stone':'M','steel':'0','blue':'D','green':'B','red':'C',
     'purple':'E','skin':'H','bone':'I','black':'0'}

class C:
    def __init__(s,n):
        s.n=n; s.g=[['.']*n for _ in range(n)]
    def px(s,x,y,c,raw=False):
        if not raw: x,y=round(_s(x)),round(_s(y))
        if 0<=x<s.n and 0<=y<s.n and c: s.g[y][x]=c
    def get(s,x,y):
        return s.g[y][x] if 0<=x<s.n and 0<=y<s.n else '.'

    # ── 구 셰이딩 타원 ───────────────────────
    def ball(s,cx,cy,rx,ry,ramp,lo=0.0,hi=1.0,rim=None):
        R=RAMP[ramp] if isinstance(ramp,str) else ramp
        for y in range(s.n):
            for x in range(s.n):
                nx=(x+.5-cx)/rx; ny=(y+.5-cy)/ry
                d2=nx*nx+ny*ny
                if d2>1: continue
                nz=math.sqrt(max(0.,1-d2))
                l=nx*LX+ny*LY+nz*.78
                t=(l+.55)/1.45
                t=lo+(hi-lo)*max(0.,min(1.,t))
                s.px(x,y,R[max(0,min(len(R)-1,int(t*len(R))))],raw=True)
        if rim: s.rimlight(rim)

    # ── 방향 그라디언트 면 ───────────────────
    def face(s,pts,ramp,a=0.0,b=1.0,axis='y'):
        """볼록 다각형을 위→아래(또는 좌→우) 그라디언트로 채운다"""
        R=RAMP[ramp] if isinstance(ramp,str) else ramp
        ys=[p[1] for p in pts]; xs=[p[0] for p in pts]
        for y in range(int(min(ys)),int(max(ys))+1):
            for x in range(int(min(xs)),int(max(xs))+1):
                if not inpoly(x+.5,y+.5,pts): continue
                t=(y-min(ys))/max(1,(max(ys)-min(ys))) if axis=='y' else (x-min(xs))/max(1,(max(xs)-min(xs)))
                t=b+(a-b)*t
                s.px(x,y,R[max(0,min(len(R)-1,int(t*len(R))))],raw=True)

    def rect(s,x0,y0,x1,y1,c):
        x0,y0,x1,y1=round(_s(x0)),round(_s(y0)),round(_s(x1)),round(_s(y1))
        for y in range(y0,max(y0,y1)+1):
            for x in range(x0,max(x0,x1)+1): s.px(x,y,c,raw=True)

    def line(s,x0,y0,x1,y1,c):
        x0,y0,x1,y1=round(_s(x0)),round(_s(y0)),round(_s(x1)),round(_s(y1))
        dx,dy=abs(x1-x0),abs(y1-y0); sx=1 if x0<x1 else -1; sy=1 if y0<y1 else -1
        err=dx-dy
        while True:
            s.px(x0,y0,c,raw=True)
            if x0==x1 and y0==y1: break
            e2=2*err
            if e2>-dy: err-=dy; x0+=sx
            if e2<dx:  err+=dx; y0+=sy

    def disc(s,cx,cy,r,c):
        cx,cy,r=_s(cx),_s(cy),max(.5,_s(r))
        for y in range(s.n):
            for x in range(s.n):
                if (x+.5-cx)**2+(y+.5-cy)**2<=r*r: s.px(x,y,c,raw=True)

    # ── 외곽선 ──────────────────────────────
    def outline(s,c,only=None):
        o=[]
        for y in range(s.n):
            for x in range(s.n):
                if s.g[y][x]!='.': continue
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    v=s.get(x+dx,y+dy)
                    if v!='.' and (only is None or v in only): o.append((x,y)); break
        for x,y in o: s.px(x,y,c,raw=True)

    # ── 림라이트: 그림자 쪽 가장자리를 한 톤 밝게 ─
    def rimlight(s,ramp):
        R=RAMP[ramp] if isinstance(ramp,str) else ramp
        idx={c:i for i,c in enumerate(R)}
        hits=[]
        for y in range(s.n):
            for x in range(s.n):
                c=s.g[y][x]
                if c not in idx or idx[c]>1: continue
                if s.get(x+1,y)=='.' or s.get(x,y+1)=='.':
                    hits.append((x,y,R[min(len(R)-1,idx[c]+2)]))
        for x,y,c in hits: s.px(x,y,c,raw=True)

    def rows(s):
        return [''.join(r).rstrip('.') for r in s.g]

def inpoly(px,py,pts):
    n=len(pts); ins=False; j=n-1
    for i in range(n):
        xi,yi=pts[i]; xj,yj=pts[j]
        if ((yi>py)!=(yj>py)) and (px < (xj-xi)*(py-yi)/(yj-yi+1e-9)+xi): ins=not ins
        j=i
    return ins

def save(new, sizes=None):
    d=json.load(open(DATA,encoding='utf-8'))
    pal=set(d['palette'])|{'.'}
    bad=[]
    for name,rows in new.items():
        n=(sizes or {}).get(name) or d['sprites'].get(name,{}).get('size')
        if name not in d['sprites']: d['sprites'][name]={'size':n,'rows':[]}
        d['sprites'][name]['size']=n
        for i,r in enumerate(rows):
            if len(r)>n: bad.append(f'{name} y{i}: {len(r)}>{n}')
            for ch in r:
                if ch not in pal: bad.append(f'{name}: 팔레트 밖 {ch!r}')
        if len(rows)>n: bad.append(f'{name}: {len(rows)}행>{n}')
        d['sprites'][name]['rows']=rows
    if bad:
        raise SystemExit('\n'.join(dict.fromkeys(bad)))
    json.dump(d,open(DATA,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print(f'{len(new)}종 저장')

# ══ 마스크 기반 조형 ══════════════════════════════
def m_ellipse(cx,cy,rx,ry,n=64):
    cx,cy,rx,ry=_s(cx),_s(cy),max(.5,_s(rx)),max(.5,_s(ry))
    return {(x,y) for y in range(n) for x in range(n)
            if ((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1}
def m_rect(x0,y0,x1,y1):
    x0,y0,x1,y1=round(_s(x0)),round(_s(y0)),round(_s(x1)),round(_s(y1))
    return {(x,y) for y in range(y0,max(y0,y1)+1) for x in range(x0,max(x0,x1)+1)}
def m_poly(pts,n=64):
    pts=[(_s(a),_s(b)) for a,b in pts]
    return {(x,y) for y in range(n) for x in range(n) if inpoly(x+.5,y+.5,pts)}
def m_line(x0,y0,x1,y1,w=1):
    x0,y0,x1,y1=round(_s(x0)),round(_s(y0)),round(_s(x1)),round(_s(y1))
    w=max(1,round(w*SCALE)) if SCALE<1 else w
    out=set(); dx,dy=abs(x1-x0),abs(y1-y0); sx=1 if x0<x1 else -1; sy=1 if y0<y1 else -1
    err=dx-dy
    while True:
        for a in range(-(w//2),w-w//2):
            for b in range(-(w//2),w-w//2): out.add((x0+a,y0+b))
        if x0==x1 and y0==y1: break
        e2=2*err
        if e2>-dy: err-=dy; x0+=sx
        if e2<dx:  err+=dx; y0+=sy
    return out

def _walk(mask,x,y,dx,dy,lim=40):
    d=0.0; fx,fy=x+.5,y+.5
    while d<lim:
        fx+=dx; fy+=dy; d+=1
        if (int(fx),int(fy)) not in mask: break
    return d

def paint(c,mask,ramp,lo=0.0,hi=1.0,gamma=1.0):
    """임의 실루엣을 광원 방향 깊이로 명암 처리한다"""
    R=RAMP[ramp] if isinstance(ramp,str) else ramp
    for (x,y) in mask:
        if not (0<=x<c.n and 0<=y<c.n): continue
        dl=_walk(mask,x,y,LX,LY)       # 빛 쪽으로 나가는 거리
        ds=_walk(mask,x,y,-LX,-LY)     # 반대쪽
        t=ds/(ds+dl)
        t=t**gamma
        t=lo+(hi-lo)*t
        c.px(x,y,R[max(0,min(len(R)-1,int(t*len(R))))],raw=True)

def paint_cyl(c,mask,ramp,lo=0.0,hi=1.0,peak=.32,axis='x'):
    """원기둥/벽면: 한 축 위치만으로 명암을 준다"""
    R=RAMP[ramp] if isinstance(ramp,str) else ramp
    lines={}
    for (x,y) in mask:
        k=y if axis=='x' else x
        lines.setdefault(k,[]).append(x if axis=='x' else y)
    for k,vs in lines.items():
        v0,v1=min(vs),max(vs)
        for v in vs:
            u=(v-v0)/max(1,(v1-v0))
            t=1-abs(u-peak)/max(peak,1-peak)
            t=lo+(hi-lo)*max(0.,min(1.,t))
            x,y=(v,k) if axis=='x' else (k,v)
            c.px(x,y,R[max(0,min(len(R)-1,int(t*len(R))))],raw=True)

def glow(c,mask,ramp,cx,cy,r,lo=0.0,hi=1.0,gamma=1.0):
    """스스로 빛나는 것: 중심이 가장 밝다"""
    R=RAMP[ramp] if isinstance(ramp,str) else ramp
    for (x,y) in mask:
        d=math.hypot(x+.5-cx,y+.5-cy)/r
        t=max(0.,min(1.,1-d))**gamma
        t=lo+(hi-lo)*t
        c.px(x,y,R[max(0,min(len(R)-1,int(t*len(R))))],raw=True)


# ══ 도트 정리 ═══════════════════════════════════
# 수학으로 찍은 형태는 가장자리에 1픽셀 톱니가 남는다.
# 아래는 그것을 "손으로 찍은 것처럼" 다듬는 후처리다.

def _n8(x,y):
    return [(x+dx,y+dy) for dx in(-1,0,1) for dy in(-1,0,1) if dx or dy]
def _n4(x,y):
    return [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]

def smooth_mask(mask, rounds=2, keep=5, grow=6):
    """실루엣의 1픽셀 톱니를 편다. 이웃 8칸의 다수결."""
    m=set(mask)
    for _ in range(rounds):
        add,rm=set(),set()
        box={p for (x,y) in m for p in _n8(x,y)}|m
        for (x,y) in box:
            k=sum((p in m) for p in _n8(x,y))
            if (x,y) in m:
                if k<=8-keep: rm.add((x,y))        # 튀어나온 돌기
            else:
                if k>=grow: add.add((x,y))         # 파인 홈
        if not add and not rm: break
        m=(m|add)-rm
    return m

def bands(c, mask, ramp, n=4, mode='form', cx=None, cy=None, r=None,
          lo=0.0, hi=1.0, gamma=1.0, rounds=3):
    """명암을 n 단계 '평평한 띠'로 자르고, 띠 경계의 톱니를 편다."""
    R=RAMP[ramp] if isinstance(ramp,str) else ramp
    step=max(1,(len(R)-1)//max(1,n-1))
    pick=[R[min(len(R)-1,i*step)] for i in range(n)]
    rowx=None
    if mode=='axis':
        rowx={}
        for (a,b) in mask: rowx.setdefault(b,[]).append(a)
        rowx={b:(min(v),max(v)) for b,v in rowx.items()}
    val={}
    for (x,y) in mask:
        if mode=='glow':
            d=math.hypot(x+.5-cx,y+.5-cy)/r
            t=max(0.,min(1.,1-d))**gamma
        elif mode=='axis':
            x0,x1=rowx[y]
            u=(x-x0)/max(1,(x1-x0))
            t=1-abs(u-.32)/.68
        else:
            dl=_walk(mask,x,y,LX,LY); ds=_walk(mask,x,y,-LX,-LY)
            t=(ds/(ds+dl))**gamma
        t=lo+(hi-lo)*max(0.,min(1.,t))
        val[(x,y)]=max(0,min(n-1,int(t*n)))
    for _ in range(rounds):                        # 띠 경계 다수결
        nv={}
        for (x,y) in mask:
            cnt={}
            for p in _n8(x,y)+[(x,y)]:
                if p in val: cnt[val[p]]=cnt.get(val[p],0)+1
            best=max(cnt.items(), key=lambda kv:(kv[1],-abs(kv[0]-val[(x,y)])))
            nv[(x,y)] = best[0] if best[1]>=5 else val[(x,y)]
        if nv==val: break
        val=nv
    for (x,y),v in val.items(): c.px(x,y,pick[v],raw=True)
    return val

def edge(c, mask, col, hi=None):
    """읽히는 외곽선 한 겹. hi 를 주면 좌상단 가장자리를 밝게 남긴다."""
    ring={p for (x,y) in mask for p in _n4(x,y) if p not in mask}
    for (x,y) in ring: c.px(x,y,col,raw=True)
    if hi:
        for (x,y) in mask:
            if (x-1,y) not in mask or (x,y-1) not in mask:
                if (x+1,y) in mask and (x,y+1) in mask: c.px(x,y,hi,raw=True)


# ══ 재질 ════════════════════════════════════════
# 스프라이트 전체가 같은 규율을 쓰도록 톤과 외곽선을 재질로 고정한다.
# 톤은 3~4개만. 외곽선은 배경(#101013)에서 읽히는 어두운 색.
MAT={
 'gold'  : (['b','c','d','e'],'A'), 'gold2': (['c','d','e','f'],'A'),
 'stone' : (['I','J','K','L'],'M'), 'rock' : (['M','I','J','K'],'0'),
 'steel' : (['2','4','6','7'],'0'), 'iron' : (['1','3','5','6'],'0'),
 'blue'  : (['q','r','s','t'],'p'), 'ice'  : (['r','s','t','9'],'q'),
 'moss'  : (['h','i','j','k'],'g'), 'ooze' : (['O','P','Q'],    'N'),
 'red'   : (['m','n','o'],    'C'), 'blood': (['l','m','n','o'],'C'),
 'purple': (['u','v','w','x'],'E'), 'spirit':(['v','w','x','y'],'E'),
 'bone'  : (['J','K','8','z'],'I'), 'skin' : (['H','G','F'],    'A'),
 'ember' : (['T','U','V','W'],'S'), 'wood' : (['a','b','c'],    'A'),
 'wood2' : (['A','a','b'],    '0'),
 'paper' : (['J','K','L','8'],'I'),
}
def mat(c,mask,name,n=None,out=True,**kw):
    # name 은 MAT 키, 또는 (톤 목록, 외곽선색) 튜플
    tones,o = MAT[name] if isinstance(name,str) else name
    bands(c,mask,tones,n=n or len(tones),**kw)
    if out: edge(c,mask,o)
    return mask
def sm(*masks,rounds=1):
    m=set()
    for x in masks: m|=x
    return smooth_mask(m,rounds=rounds)
