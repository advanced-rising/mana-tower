#!/usr/bin/env python3
"""
던전 몬스터 생성 — 16×16, 측면 전신

정면 얼굴만 그리면 다 비슷해 보인다. 던파·리니지처럼 **옆에서 본 전신**에
다리·꼬리·날개를 붙여 실루엣으로 구분한다. 16칸이라 한 픽셀이 크게 보이므로
형태를 굵게 잡고 톤은 3개만 쓴다.

기본 12종 + 보스 4종 × 속성 6종 = 96종.

  python3 tools/foes.py
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixkit import *

N = 16
set_scale(1.0)                      # 16칸 좌표로 직접 그린다

# 속성 : (몸통 톤 3, 외곽선, 눈빛, 파츠색, 파츠)
# 어두운 배경(#0e0e11)에서 실루엣이 뜨도록 가장 어두운 톤도 충분히 밝게 잡는다.
# 어두운 몫은 외곽선이 맡는다.
AFFIX = {
 'fire'  : (['T','U','V'], 'S', 'W', ['T','U','V','W'], 'flame'),
 'venom' : (['O','P','Q'], 'B', 'R', ['N','O','P','Q'], 'drip'),
 'frost' : (['q','r','s'], 'D', '9', ['q','r','s','t'], 'shard'),
 'shadow': (['v','w','x'], 'E', 't', ['u','v','w','y'], 'wisp'),
 'stone' : (['I','J','K'], 'M', 'd', ['I','J','K','L'], 'plate'),
 'arcane': (['w','x','y'], 'E', 't', ['v','w','x','y'], 'rune'),
 'thunder': (['r','s','t'], 'D', 'f', ['r','s','t','9'], 'spark'),
 'blood'  : (['l','m','n'], 'C', 'o', ['l','m','n','o'], 'gore'),
}

def put(c, mask, t, o):
    bands(c, mask, t, n=3); edge(c, mask, o); return mask

# ══ 기본 생물 (오른쪽을 본다) ═══════════════════
def ooze(c,t,o):
    m=sm(m_ellipse(7.5,11,6.5,4.2), m_ellipse(6,8,4.4,3.4))
    put(c,m,t,o); c.rect(3,14,11,14,o)
    return m,[(9,8)],1.6

def bat(c,t,o):
    m=sm(m_poly([(0,2),(6,6),(5,11),(2,9)]), m_poly([(15,2),(9,6),(10,11),(13,9)]),
         m_ellipse(7.5,8,2.6,4), m_poly([(6,4),(7,1),(9,4)]))
    put(c,m,t,o)
    return m,[(6,7),(9,7)],1.1

def beast(c,t,o):
    m=sm(m_poly([(2,7),(10,6),(12,8),(11,12),(3,12)]),          # 몸통
         m_ellipse(12,6,3,2.6),                                  # 머리
         m_poly([(11,4),(12,1),(14,4)]),                         # 귀
         m_poly([(2,7),(0,3),(2,9)]))                            # 꼬리
    m |= m_rect(3,12,4,15)|m_rect(6,12,7,15)|m_rect(9,12,10,15)  # 다리
    put(c,m,t,o)
    c.rect(13,8,15,8,o)
    return m,[(13,6)],1.3

def wraith(c,t,o):
    m=sm(m_ellipse(8,5,4,4), m_poly([(8,1),(12,6),(4,6)]),
         m_poly([(4,7),(12,7),(14,14),(2,14)]))
    put(c,m,t,o)
    for x in (3,6,9,12):
        for y in (13,14,15): c.px(x,y,'.')
    for (x,y) in m_ellipse(8,5,2.4,2.6): c.px(x,y,o)
    return m,[(7,5),(10,5)],1.0

def serpent(c,t,o):
    m=sm(m_poly([(1,14),(6,10),(11,13),(14,9)]),
         m_poly([(11,13),(14,9),(13,5),(9,7)]),
         m_ellipse(12,3,3,2.4))
    put(c,m,t,o)
    c.px(15,4,'n'); c.px(15,5,'n')
    return m,[(13,2)],1.0

def golem(c,t,o):
    m=sm(m_poly([(3,5),(12,4),(13,11),(3,12)]),
         m_poly([(5,2),(11,2),(12,5),(4,5)]),
         m_rect(0,6,2,11), m_rect(13,6,15,11))
    m |= m_rect(4,12,6,15)|m_rect(9,12,11,15)
    put(c,m,t,o)
    c.line(6,6,8,10,o); c.line(8,10,7,12,o)
    return m,[(6,3),(10,3)],1.2

def spider(c,t,o):
    legs=set()
    for x0,y0,x1,y1 in ((5,9,1,4),(5,10,0,9),(5,11,1,14),(6,11,4,15),
                        (10,9,14,4),(10,10,15,9),(10,11,14,14),(9,11,11,15)):
        legs|=m_line(x0,y0,x1,y1,1)
    m=sm(m_ellipse(8,11,4.2,3.2), m_ellipse(8,6.5,3,2.6)) | legs
    put(c,m,t,o)
    return m,[(7,6),(10,6)],1.0

def imp(c,t,o):
    m=sm(m_ellipse(8,5,3.4,3), m_poly([(5,8),(11,8),(12,13),(4,13)]),
         m_poly([(4,3),(5,0),(7,3)]), m_poly([(12,3),(11,0),(9,3)]),
         m_poly([(12,9),(15,7),(14,12)]))
    m |= m_rect(5,13,6,15)|m_rect(10,13,11,15)
    put(c,m,t,o)
    c.rect(6,7,10,7,o)
    return m,[(6,5),(10,5)],1.1

def mushroom(c,t,o):
    cap=sm(m_ellipse(8,6,7,4.4)-m_rect(0,7,15,15))
    m=sm(cap, m_rect(6,7,10,13), m_rect(4,13,11,14))
    put(c,m,t,o)
    for cx,cy in ((4,5),(11,4),(8,3)):
        for p in (m_ellipse(cx,cy,1.4,1.1)&cap): c.px(*p,t[2])
    return m,[(6,11),(9,11)],1.0

def eyeball(c,t,o):
    ten=set()
    for a in range(5):
        ang=0.5+a*0.5
        ten|=m_line(8,9,int(8+8*math.cos(ang)),int(9+7*math.sin(ang)),1)
    m=sm(m_ellipse(8,7,5.4,5), ten)
    put(c,m,t,o)
    for p in m_ellipse(8,7,3.4,3.2): c.px(*p,'z')
    for p in m_ellipse(8,7,1.6,1.6): c.px(*p,o)
    return m,[(8,7)],1.6

def crab(c,t,o):
    legs=set()
    for x in (4,7,10): legs|=m_line(x,12,x-1,15,1)
    m=sm(m_ellipse(8,10,5.4,3.4), m_ellipse(13,5,2.8,2.4), m_line(11,8,13,6,2),
         m_ellipse(2,8,2.2,1.8)) | legs
    put(c,m,t,o)
    c.px(14,3,o); c.px(12,3,o)
    return m,[(6,9),(9,9)],1.0

def worm(c,t,o):
    seg=set()
    for cx,cy,r in ((2,14,2.4),(5,11,2.8),(8,8,3.2),(11,5,3.4)):
        seg|=m_ellipse(cx,cy,r,r)
    m=sm(seg)
    put(c,m,t,o)
    for p in m_ellipse(12,4,2,2): c.px(*p,o)
    for k in range(4):
        a=k*1.5; c.px(int(12+1.6*math.cos(a)),int(4+1.6*math.sin(a)),'z')
    return m,[(13,2)],0.9

def skeleton(c,t,o):
    m=sm(m_ellipse(7,3,2.6,2.4))
    m|=m_rect(6,6,9,10)|m_rect(7,5,8,6)                     # 갈비 · 목
    for y in (7,9): m|=m_rect(5,y,10,y)
    m|=m_rect(5,11,6,15)|m_rect(9,11,10,15)                 # 다리
    m|=m_rect(11,4,12,11)|m_rect(10,3,13,4)                 # 든 무기
    put(c,m,t,o)
    return m,[(6,3),(8,3)],0.9

def zombie(c,t,o):
    m=sm(m_ellipse(7,4,2.8,2.6), m_poly([(4,7),(11,7),(12,13),(3,13)]))
    m|=m_rect(11,7,15,9)|m_rect(3,12,5,15)|m_rect(8,12,10,15)
    put(c,m,t,o)
    c.rect(5,6,9,6,o)
    return m,[(6,4),(9,4)],0.9

def goblin(c,t,o):
    m=sm(m_ellipse(7,5,3,2.8), m_poly([(5,8),(10,8),(11,13),(4,13)]),
         m_poly([(4,3),(1,5),(5,7)]), m_poly([(10,3),(14,5),(9,7)]))
    m|=m_rect(4,13,5,15)|m_rect(9,13,10,15)|m_rect(11,6,12,11)|m_rect(10,5,13,7)
    put(c,m,t,o)
    c.rect(6,7,9,7,o)
    return m,[(6,5),(9,5)],0.9

def rat(c,t,o):
    m=sm(m_poly([(3,8),(10,7),(12,9),(11,12),(3,12)]), m_ellipse(12,8,2.6,2.2),
         m_poly([(11,5),(13,2),(14,6)]))
    m|=m_rect(4,12,5,15)|m_rect(8,12,9,15)|m_line(3,9,0,5,1)
    put(c,m,t,o)
    c.rect(14,9,15,9,o)
    return m,[(13,8)],0.9

def harpy(c,t,o):
    m=sm(m_ellipse(8,4,2.6,2.4), m_poly([(6,6),(10,6),(11,11),(5,11)]),
         m_poly([(0,1),(6,6),(4,10),(1,6)]), m_poly([(15,1),(10,6),(12,10),(14,6)]))
    m|=m_rect(6,11,7,14)|m_rect(9,11,10,14)|m_rect(4,14,7,15)|m_rect(9,14,12,15)
    put(c,m,t,o)
    c.rect(10,4,11,4,'d')
    return m,[(7,4),(9,4)],0.8

def treant(c,t,o):
    crown=m_ellipse(8,4,5.4,3.4)
    m=sm(crown, m_rect(6,7,9,14))
    m|=m_line(6,9,2,6,1)|m_line(9,9,13,6,1)|m_rect(4,14,11,15)
    put(c,m,t,o)
    for p in (m_ellipse(4,3,1.4,1.1)|m_ellipse(11,5,1.4,1.1))&crown: c.px(*p,t[2])
    return m,[(6,9),(9,9)],0.9

def gargoyle(c,t,o):
    m=sm(m_ellipse(8,5,3,2.6), m_poly([(5,8),(11,8),(12,13),(4,13)]),
         m_poly([(0,2),(5,7),(3,11)]), m_poly([(15,2),(11,7),(13,11)]),
         m_poly([(5,3),(6,0),(8,3)]), m_poly([(11,3),(10,0),(8,3)]))
    m|=m_rect(4,13,6,15)|m_rect(10,13,12,15)
    put(c,m,t,o)
    c.rect(6,7,10,7,o)
    return m,[(6,5),(10,5)],0.9

def lich(c,t,o):
    m=sm(m_ellipse(8,4,2.6,2.6), m_poly([(5,7),(11,7),(13,15),(3,15)]),
         m_poly([(6,1),(8,-1),(10,1)]))
    m|=m_rect(12,2,13,13)
    put(c,m,t,o)
    for p in m_ellipse(8,4,1.9,2): c.px(*p,'0')
    for p in m_ellipse(12.5,1,1.7,1.7): c.px(*p,t[2])
    c.rect(4,10,12,11,'d')
    return m,[(7,4),(9,4)],0.8

def wisp(c,t,o):
    m=sm(m_ellipse(8,6,4,4), m_poly([(6,9),(10,9),(9,15),(7,15)]))
    bands(c,m,t,n=3,mode='glow',cx=7,cy=5,r=9); edge(c,m,o)
    for p in ((2,3),(13,4),(3,11),(12,12)): c.px(*p,t[2])
    return m,[(6,5),(10,5)],0.8

def scorpion(c,t,o):
    m=sm(m_ellipse(7,11,4.4,2.8), m_ellipse(2,9,2,1.6), m_ellipse(2,13,2,1.6))
    m|=m_line(11,11,14,8,1)|m_line(14,8,14,4,1)|m_ellipse(14,3,1.6,1.6)
    for x in (5,7,9): m|=m_rect(x,13,x,15)
    put(c,m,t,o)
    return m,[(6,10),(9,10)],0.8

def hound(c,t,o):
    m=sm(m_poly([(3,8),(10,7),(12,10),(11,13),(3,13)]),
         m_ellipse(12,6,2.4,2), m_ellipse(12,10,2.4,2))
    m|=m_rect(4,13,5,15)|m_rect(8,13,9,15)|m_line(3,9,0,6,1)
    put(c,m,t,o)
    c.rect(14,6,15,6,o); c.rect(14,10,15,10,o)
    return m,[(12,5),(12,10)],0.8

def knight(c,t,o):
    m=sm(m_ellipse(8,4,2.8,2.6), m_poly([(5,7),(11,7),(12,13),(4,13)]))
    m|=m_rect(4,13,6,15)|m_rect(9,13,11,15)
    m|=m_rect(12,3,13,12)|m_rect(11,2,14,4)                  # 창
    m|=m_ellipse(3,9,2.2,3)                                   # 방패
    put(c,m,t,o)
    c.rect(6,4,10,5,'0'); c.rect(7,4,9,4,o)
    return m,[(7,4),(9,4)],0.8

BASE={'ooze':ooze,'bat':bat,'beast':beast,'wraith':wraith,'serpent':serpent,'golem':golem,
      'spider':spider,'imp':imp,'mushroom':mushroom,'eyeball':eyeball,'crab':crab,'worm':worm,
      'skeleton':skeleton,'zombie':zombie,'goblin':goblin,'rat':rat,'harpy':harpy,
      'treant':treant,'gargoyle':gargoyle,'lich':lich,'wisp':wisp,'scorpion':scorpion,
      'hound':hound,'knight':knight}

# ══ 보스 ══════════════════════════════════════
def skull(c,t,o):
    m=sm(m_ellipse(8,6,5.4,4.6), m_poly([(4,10),(12,10),(11,14),(5,14)]))
    bands(c,m,['J','8','z'],n=3); edge(c,m,'I')
    for dx in(-3,3):
        for p in m_ellipse(8+dx,6,1.9,2): c.px(*p,'0')
    for p in m_poly([(8,8),(9,10),(7,10)]): c.px(*p,'0')
    c.rect(5,11,11,11,'0'); c.rect(5,13,11,13,'0')
    for x in range(5,12,2): c.rect(x,11,x,14,'0')
    return m,[(5,6),(11,6)],1.3

def demon(c,t,o):
    m=sm(m_ellipse(8,5,4.2,3.6), m_poly([(4,0),(7,4),(3,4)]), m_poly([(12,0),(9,4),(13,4)]),
         m_poly([(4,8),(12,8),(13,14),(3,14)]),
         m_rect(0,8,2,12), m_rect(13,8,15,12))
    m |= m_rect(4,14,6,15)|m_rect(10,14,12,15)
    put(c,m,t,o)
    c.rect(6,7,10,7,o)
    for x in (6,8,10): c.px(x,7,'z')
    return m,[(6,5),(10,5)],1.2

def dragon(c,t,o):
    m=sm(m_poly([(0,1),(6,5),(4,10),(1,7)]), m_poly([(15,1),(10,5),(12,10),(14,7)]),
         m_ellipse(8,7,3.4,4), m_ellipse(11,3,2.8,2.2),
         m_poly([(6,12),(10,12),(9,15),(7,15)]))
    put(c,m,t,o)
    c.rect(12,4,15,4,o)
    return m,[(12,2)],1.0

def titan(c,t,o):
    m=sm(m_poly([(2,5),(13,4),(14,12),(1,13)]),
         m_poly([(6,1),(11,1),(12,4),(5,4)]),
         m_ellipse(0,8,2.2,3), m_ellipse(15,9,2.2,3))
    m |= m_rect(3,13,6,15)|m_rect(9,13,12,15)
    put(c,m,t,o)
    c.line(5,6,7,10,o); c.line(10,6,11,9,o)
    return m,[(7,2),(11,2)],1.1

def hydra(c,t,o):
    m=sm(m_ellipse(8,12,5,3.4))
    for hx,hy in ((3,3),(8,1),(13,3)):
        m|=m_line(hx,hy+2,8,11,2)|m_ellipse(hx,hy,2,1.8)
    put(c,m,t,o)
    return m,[(3,3),(8,1),(13,3)],0.8

def behemoth(c,t,o):
    m=sm(m_poly([(2,6),(11,5),(13,8),(12,13),(2,13)]), m_ellipse(13,6,2.8,2.4),
         m_poly([(11,3),(13,0),(15,3)]))
    m|=m_rect(3,13,5,15)|m_rect(9,13,11,15)|m_line(2,7,0,3,1)
    put(c,m,t,o)
    c.rect(14,8,15,8,o)
    return m,[(13,6)],1.0

def archlich(c,t,o):
    m=sm(m_ellipse(8,5,3,2.8), m_poly([(4,8),(12,8),(14,15),(2,15)]))
    m|=m_rect(12,2,13,13)
    put(c,m,t,o)
    for p in m_ellipse(8,5,2.2,2.2): c.px(*p,'0')
    cr=m_poly([(4,2),(5,0),(6,2),(8,0),(10,2),(11,0),(12,2)])
    bands(c,cr,['c','d','e'],n=3); edge(c,cr,'A')
    for p in m_ellipse(12.5,1,1.9,1.9): c.px(*p,t[2])
    c.rect(3,11,13,12,'d')
    return m,[(7,5),(9,5)],0.9

def wyrm(c,t,o):
    coil=sm(m_ellipse(7,12,6,3.6)-m_ellipse(7,12,2.6,1.4))
    m=coil|sm(m_poly([(11,11),(14,7),(11,3),(7,5)]), m_ellipse(11,2,2.8,2.2))
    m|=m_poly([(0,3),(5,7),(2,10)])
    put(c,m,t,o)
    c.rect(13,3,15,3,o)
    return m,[(12,1)],0.9

BOSS={'skull':skull,'demon':demon,'dragon':dragon,'titan':titan,
      'hydra':hydra,'behemoth':behemoth,'archlich':archlich,'wyrm':wyrm}


# ══ 우주 계층 생물 ══════════════════════════════
# 항성계 위로는 지구의 짐승이 나오면 어색하다. 기계·천체·현상으로 바꾼다.
def probe(c,t,o):
    m=sm(m_ellipse(8,8,3.4,3), m_rect(2,7,13,9))
    m|=m_rect(0,5,2,11)|m_rect(13,5,15,11)|m_rect(7,11,8,14)
    put(c,m,t,o)
    c.rect(1,6,1,10,o); c.rect(14,6,14,10,o)
    return m,[(8,8)],1.1

def asteroid(c,t,o):
    m=sm(m_poly([(2,7),(5,3),(11,2),(14,6),(13,12),(8,14),(3,12)]))
    put(c,m,t,o)
    for cx,cy in ((5,6),(10,9),(7,11)):
        for p in m_ellipse(cx,cy,1.4,1.1): c.px(*p,o)
    return m,[(9,5),(12,8)],0.8

def nebula(c,t,o):
    m=sm(m_ellipse(7,7,5,4), m_ellipse(11,10,4,3.4), m_ellipse(5,11,3.4,2.6))
    bands(c,m,t,n=3,mode='glow',cx=7,cy=7,r=11); edge(c,m,o)
    for p in ((1,3),(14,5),(2,14),(13,14)): c.px(*p,t[2])
    return m,[(6,7),(10,9)],1.0

def stareater(c,t,o):
    m=sm(m_ellipse(8,9,6,5.4))
    for a in range(6):
        ang=3.6+a*0.42
        m|=m_line(8,9,int(8+9*math.cos(ang)),int(9+8*math.sin(ang)),1)
    put(c,m,t,o)
    c.rect(5,10,11,12,o)
    for x in (5,7,9,11): c.px(x,10,'z')
    return m,[(6,7),(10,7)],1.0

def satellite(c,t,o):
    m=sm(m_ellipse(8,8,2.6,3.4))
    m|=m_rect(0,6,4,10)|m_rect(11,6,15,10)|m_line(4,8,11,8,1)
    put(c,m,t,o)
    for x in (1,3,12,14): c.rect(x,6,x,10,o)
    return m,[(8,7)],1.1

def gravity(c,t,o):
    m=set()
    for r in (7,5,3):
        m|=m_ellipse(8,8,r,r*0.55)-m_ellipse(8,8,r-1.2,(r-1.2)*0.55)
    m|=m_ellipse(8,8,2,2)
    bands(c,m,t,n=3,mode='glow',cx=8,cy=8,r=8); edge(c,m,o)
    return m,[(8,8)],1.0

def blackhole(c,t,o):
    ring=m_ellipse(8,8,7,7)-m_ellipse(8,8,4,4)
    disc=m_ellipse(8,8,7.6,2)-m_ellipse(8,8,3.4,1)
    m=sm(ring|disc)
    bands(c,m,t,n=3,mode='glow',cx=8,cy=8,r=9); edge(c,m,o)
    for p in m_ellipse(8,8,3.4,3.4): c.px(*p,'0')
    return m,[],1.0

def guardian(c,t,o):
    m=sm(m_poly([(8,0),(13,5),(13,11),(8,16),(3,11),(3,5)]))
    put(c,m,t,o)
    inner=m_poly([(8,3),(11,6),(11,10),(8,13),(5,10),(5,6)])
    bands(c,inner,t,n=3)
    return m,[(8,8)],1.6

def rift(c,t,o):
    m=sm(m_poly([(7,0),(10,5),(8,8),(11,11),(6,16),(5,10),(7,8),(4,4)]))
    bands(c,m,t,n=3,mode='glow',cx=8,cy=8,r=9); edge(c,m,o)
    for p in ((2,3),(13,6),(3,13),(12,12)): c.px(*p,t[2])
    return m,[(7,4),(8,11)],0.8

def dyson(c,t,o):
    m=sm(m_ellipse(8,8,7,7)-m_ellipse(8,8,4.4,4.4))
    for a in range(4): 
        ang=a*0.79
        m|=m_line(int(8-7*math.cos(ang)),int(8-7*math.sin(ang)),int(8+7*math.cos(ang)),int(8+7*math.sin(ang)),1)
    put(c,m,t,o)
    core=m_ellipse(8,8,2.6,2.6)
    bands(c,core,['d','e','f'],n=3,mode='glow',cx=8,cy=8,r=3)
    return m,[],1.0

def spore(c,t,o):
    m=sm(m_ellipse(8,9,4.4,5))
    for a in range(8):
        ang=a*0.79
        m|=m_line(8,9,int(8+7*math.cos(ang)),int(9+7*math.sin(ang)),1)
    put(c,m,t,o)
    return m,[(7,8),(10,8)],0.9

def sentinel(c,t,o):
    m=sm(m_rect(5,2,10,13), m_poly([(3,5),(5,3),(5,12),(3,10)]), m_poly([(12,5),(10,3),(10,12),(12,10)]))
    m|=m_rect(6,13,9,15)
    put(c,m,t,o)
    c.rect(5,7,10,7,o)
    return m,[(7,5),(9,5)],1.0

COSMIC={'probe':probe,'asteroid':asteroid,'nebula':nebula,'stareater':stareater,
        'satellite':satellite,'gravity':gravity,'blackhole':blackhole,'guardian':guardian,
        'rift':rift,'dyson':dyson,'spore':spore,'sentinel':sentinel}

def supernova(c,t,o):
    m=set()
    for a in range(8):
        ang=a*0.79
        m|=m_line(8,8,int(8+8*math.cos(ang)),int(8+8*math.sin(ang)),2)
    m|=m_ellipse(8,8,4,4)
    bands(c,m,t,n=3,mode='glow',cx=8,cy=8,r=9); edge(c,m,o)
    return m,[],1.0

def quasar(c,t,o):
    m=sm(m_ellipse(8,8,5,4), m_poly([(7,0),(9,0),(9,4),(7,4)]), m_poly([(7,12),(9,12),(9,16),(7,16)]))
    bands(c,m,t,n=3,mode='glow',cx=8,cy=8,r=9); edge(c,m,o)
    return m,[(8,8)],1.4

def gcore(c,t,o):
    m=sm(m_ellipse(8,8,7.6,3), m_ellipse(8,8,3.4,3.4))
    for a in range(3):
        ang=a*1.05
        m|=m_line(int(8-7*math.cos(ang)),int(8-3*math.sin(ang)),int(8+7*math.cos(ang)),int(8+3*math.sin(ang)),1)
    bands(c,m,t,n=3,mode='glow',cx=8,cy=8,r=8); edge(c,m,o)
    return m,[],1.0

def watcher(c,t,o):
    m=sm(m_ellipse(8,8,7,7)-m_ellipse(8,8,5,5))
    m|=m_ellipse(8,8,3.4,4.4)
    put(c,m,t,o)
    for p in m_ellipse(8,8,1.6,1.6): c.px(*p,'0')
    return m,[(8,8)],1.6

COSMIC_BOSS={'supernova':supernova,'quasar':quasar,'gcore':gcore,'watcher':watcher}

def draw_eyes(c, spots, r, col):
    """16칸에서 눈은 1픽셀이면 충분하다. 크게 찍으면 얼굴이 통째로 눈이 된다."""
    for (ex,ey) in spots:
        x,y=round(ex),round(ey)
        for dx,dy in ((0,-1),(0,1),(-1,0),(1,0)): c.px(x+dx,y+dy,'0')
        c.px(x,y,col)

def bbox(m):
    xs=[x for x,_ in m]; ys=[y for _,y in m]
    return min(xs),min(ys),max(xs),max(ys)
def topline(m,fx):
    ys=[y for (x,y) in m if x==fx]
    return min(ys) if ys else None

def part(c, mask, kind, acc):
    x0,y0,x1,y1=bbox(mask); cx=(x0+x1)//2; my=(y0+y1)//2
    if kind=='flame':
        for dx,want in ((-4,3),(-1,4),(2,4),(5,3)):
            fx=cx+dx; ty=topline(mask,fx)
            if ty is None: continue
            h=min(want,ty)
            if h<2: continue
            f=sm(m_poly([(fx,ty-h),(fx+1.4,ty),(fx-1.4,ty)]))-mask
            if not f: continue
            bands(c,f,acc[1:],n=3,mode='glow',cx=fx,cy=ty-1,r=h+1); edge(c,f,'C')
    elif kind=='drip':
        for dx in (-4,0,4):
            fx=cx+dx
            d=m_ellipse(fx,y1+1,1.1,1.4)-mask
            if not d: continue
            bands(c,d,acc[1:],n=3,mode='glow',cx=fx,cy=y1+1,r=2); edge(c,d,'B')
    elif kind=='shard':
        for dx,want in ((-4,3),(0,4),(4,3)):
            fx=cx+dx; ty=topline(mask,fx)
            if ty is None: continue
            h=min(want,ty)
            if h<2: continue
            s=m_poly([(fx,ty-h),(fx+1.2,ty),(fx-1.2,ty)])-mask
            if not s: continue
            bands(c,s,acc[1:],n=3,mode='axis'); edge(c,s,'D')
    elif kind=='wisp':
        for dx,dy in ((-6,-2),(6,-1),(-5,5),(6,5)):
            w=m_ellipse(cx+dx,my+dy,1.4,1.6)-mask
            if not w: continue
            bands(c,w,acc[1:],n=3,mode='glow',cx=cx+dx,cy=my+dy,r=2); edge(c,w,'E')
    elif kind=='plate':
        for dx,dy in ((-3,-1),(3,1),(-1,4)):
            p=m_ellipse(cx+dx,my+dy,1.7,1.4)&mask
            if not p: continue
            bands(c,p,acc[1:],n=3); edge(c,p,'0')
    elif kind=='spark':
        for dx,dy in ((-5,-3),(5,-2),(-4,4),(5,5),(0,-6)):
            gx,gy=cx+dx,my+dy
            z=(m_line(gx-1,gy-1,gx,gy,1)|m_line(gx,gy,gx+1,gy+2,1))-mask
            if not z: continue
            for p in z: c.px(*p,acc[-2])
            c.px(gx,gy,acc[-1])
    elif kind=='gore':
        for dx in (-4,1,5):
            fx=cx+dx
            g=(m_ellipse(fx,y1+1,1.1,1.5)|m_rect(fx,y1-1,fx,y1))-mask
            if not g: continue
            bands(c,g,acc[1:],n=3,mode='glow',cx=fx,cy=y1+1,r=2); edge(c,g,'C')
        for dx,dy in ((-5,-2),(5,0)):
            sp=m_ellipse(cx+dx,my+dy,1.0,1.0)-mask
            for p in sp: c.px(*p,acc[-1])
    elif kind=='rune':
        for dx,dy in ((-6,-3),(6,-2),(-5,5),(6,5)):
            gx,gy=cx+dx,my+dy
            ring=(m_ellipse(gx,gy,1.7,1.7)-m_ellipse(gx,gy,0.8,0.8))-mask
            if not ring: continue
            bands(c,ring,acc[1:],n=3,mode='glow',cx=gx,cy=gy,r=2)

def build():
    out={}
    for group,pre in ((BASE,'foe'),(BOSS,'boss'),(COSMIC,'cos'),(COSMIC_BOSS,'cboss')):
        for bk,fn in group.items():
            for ak,(t,o,eye,acc,pk) in AFFIX.items():
                c=C(N)
                mask,spots,r=fn(c,t,o)
                part(c,mask,pk,acc)
                draw_eyes(c,spots,r,eye)
                out[f'{pre}_{bk}_{ak}']=c.rows()
    save(out,{k:N for k in out})
    print(f'몬스터 {len(out)}종 = 지상 {len(BASE)}+{len(BOSS)} · 우주 {len(COSMIC)}+{len(COSMIC_BOSS)} × 속성 {len(AFFIX)}')

if __name__=='__main__':
    build()
