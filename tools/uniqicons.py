#!/usr/bin/env python3
"""
겹쳐 쓰던 아이콘 56종을 각자의 그림으로 — 16×16

업적 서른 개는 시설·강화의 아이콘을 그대로 빌려 쓰고 있었다. 자동화 스물한 개와
계층 탭 다섯 개도 마찬가지라, 목록을 보면 같은 그림이 세 번씩 나왔다.
원래 주인(시설·강화)이 이름을 지키고, 빌려 쓰던 쪽이 새 그림을 갖는다.

  자동화 : 톱니 테두리 + 저마다 다른 속 — 한눈에 '자동'으로 읽히는 가족
  계층 탭 : 무한·영원·현실·공허·근원 각각의 상징
  업적    : 이름이 말하는 것을 그대로

  python3 tools/uniqicons.py [--show]
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixkit import *

N=16
set_scale(1.0)

def ring(cx,cy,rx,ry,w=1.0):
    return m_ellipse(cx,cy,rx,ry)-m_ellipse(cx,cy,max(.1,rx-w),max(.1,ry-w))

def star(c,x,y,col,dim=None):
    c.px(x,y,col)
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)): c.px(x+dx,y+dy,dim or col)

def sparkle(c,pts,col='f'):
    for x,y in pts: c.px(x,y,col)

# ══ 자동화: 톱니 테두리 ═══════════════════════════
def cog(c,ramp='steel'):
    """바깥 톱니 여덟 개 — 속은 비워 둔다"""
    R=RAMP[ramp]
    body=ring(8,8,7.2,7.2,2.1)
    teeth=set()
    for i in range(8):
        a=i*math.pi/4
        tx,ty=8+math.cos(a)*7.4, 8+math.sin(a)*7.4
        teeth|=m_ellipse(tx,ty,1.25,1.25)
    m=smooth_mask(body|teeth,rounds=1)
    m-=m_ellipse(8,8,4.6,4.6)
    bands(c,m,R[1:5],n=4,mode='glow',cx=5,cy=5,r=11)
    edge(c,m,R[0])
    return m

# 자동화 스물한 종의 '속'
def core_build(c):
    mat(c,m_poly([(6,12),(10,12),(9,5),(7,5)]),'stone',n=3)   # 탑
    mat(c,m_poly([(6.5,5),(9.5,5),(8,3)]),'blue',n=3)         # 지붕
def core_research(c):
    mat(c,sm(m_poly([(7,5),(9,5),(10,11),(6,11)]),m_rect(7,4,8,5)),'ice',n=3)
    for x,y in ((7,9),(8,10),(9,9)): c.px(x,y,'t')
def core_dungeon(c):
    mat(c,m_line(6,11,10,5,1),'steel',n=3)                    # 칼날
    mat(c,m_line(6,7,9,10,1),'gold',n=2)                      # 손잡이
def core_rebirth(c):
    for i in range(14):                                        # 소용돌이
        a=i*.62; r=1.0+i*.28
        c.px(8+math.cos(a)*r, 8+math.sin(a)*r, 'wxy'[min(2,i//5)])
def core_soulup(c):
    mat(c,m_ellipse(8,8,3.0,3.4),'spirit',n=3); c.px(7,7,'y'); c.px(9,9,'v')
def core_chal(c):
    for cx,cy in ((6.4,6.4),(9.6,9.6)): mat(c,ring(cx,cy,2.2,2.2,1.0),'iron',n=3)
def core_ascend(c):
    mat(c,m_poly([(5,11),(11,11),(10,6),(6,6)]),'gold',n=3)
    mat(c,m_rect(7,4,8,6),'red',n=2)
def core_relicup(c):
    mat(c,m_ellipse(8,8,3.4,2.6),'gold',n=3); sparkle(c,[(6,7),(10,9)])
def core_rune(c):
    mat(c,ring(8,8,3.4,3.4,1.1),'blue',n=3); c.px(8,6,'f'); c.px(8,10,'f')
def core_gear(c):
    mat(c,m_rect(5,9,11,11),'iron',n=3)                       # 모루
    mat(c,m_poly([(7,4),(10,4),(10,7),(7,7)]),'steel',n=3)    # 망치머리
def core_trans(c):
    mat(c,m_poly([(8,3),(9.6,7),(13,7),(10,9.6),(11,13),(8,10.6),(5,13),(6,9.6),(3,7),(6.4,7)]),'gold',n=4)
def core_starup(c):
    star(c,8,8,'f','e'); sparkle(c,[(5,5),(11,11),(11,5),(5,11)],'d')
def core_inf(c):
    for cx in (6.4,9.6): mat(c,ring(cx,8,2.3,2.6,1.0),'purple',n=3)
def core_upinf(c):
    mat(c,m_ellipse(8,8,2.8,2.8),'purple',n=3); c.px(8,8,'f')
    for cx in (5.2,10.8): c.px(cx,8,'y')
def core_brketer(c):
    mat(c,m_poly([(6,4),(10,4),(8,8),(10,12),(6,12),(8,8)]),'gold',n=3)  # 모래시계
def core_upeter(c):
    mat(c,ring(8,8,3.2,3.2,1.0),'gold',n=3); c.px(8,8,'f'); c.px(8,5,'f')
def core_brkreal(c):
    mat(c,ring(8,8,3.4,3.6,1.1),'blue',n=3)
    for y in range(6,11): c.px(8,y,'9')                        # 갈라진 틈
def core_upreal(c):
    mat(c,m_poly([(8,4),(11,8),(8,12),(5,8)]),'ice',n=3); c.px(7,7,'f')
def core_brkvoid(c):
    mat(c,ring(8,8,3.6,3.6,1.2),'purple',n=3)
    for p in m_ellipse(8,8,2.2,2.2): c.px(*p,'0',raw=True)     # 속은 아무것도 없다
def core_upvoid(c):
    mat(c,m_ellipse(8,8,2.6,2.6),'purple',n=3)
    for a in range(6):
        t=a*math.pi/3; c.px(8+math.cos(t)*4.4,8+math.sin(t)*4.4,'y')
def core_brkorigin(c):
    mat(c,m_line(8,12,8,6,1),'wood',n=2)
    mat(c,sm(m_ellipse(8,5.4,3.0,2.4)),'moss',n=3)
def core_uporigin(c):
    mat(c,m_ellipse(8,9,2.4,2.8),'moss',n=3); mat(c,m_line(8,6,8,4,1),'wood',n=2)
def core_gather(c):
    mat(c,sm(m_ellipse(8,8,3.0,3.4)),'blue',n=3); c.px(7,7,'f')

AUTO=[('gather',core_gather),('build',core_build),('research',core_research),
 ('dungeon',core_dungeon),('rebirth',core_rebirth),('soulup',core_soulup),
 ('chal',core_chal),('ascend',core_ascend),('relicup',core_relicup),('rune',core_rune),
 ('gear',core_gear),('trans',core_trans),('starup',core_starup),('inf',core_inf),
 ('upinf',core_upinf),('brketer',core_brketer),('upeter',core_upeter),
 ('brkreal',core_brkreal),('upreal',core_upreal),('brkvoid',core_brkvoid),
 ('upvoid',core_upvoid),('brkorigin',core_brkorigin),('uporigin',core_uporigin)]

# ══ 계층 탭 다섯 ═══════════════════════════════════
def tab_inf(c):
    for cx in (5.6,10.4): mat(c,ring(cx,8,3.0,3.4,1.3),'purple',n=4)
    c.px(8,8,'f')
def tab_eter(c):
    mat(c,m_rect(4,3,11,4),'gold',n=2); mat(c,m_rect(4,12,11,13),'gold',n=2)
    mat(c,m_poly([(5,5),(10,5),(8,8),(10,11),(5,11),(7,8)]),'ice',n=3)
    for x,y in ((7,9),(8,10),(7,10),(8,6)): c.px(x,y,'e')
def tab_real(c):
    m=m_ellipse(8,8,6.0,6.4)-m_ellipse(8,8,4.4,4.8)
    mat(c,m,'blue',n=4)
    for p in m_ellipse(8,8,4.2,4.6): c.px(*p,'p',raw=True)
    for x,y in ((8,4),(8,5),(7,6),(8,7),(9,8),(8,9),(8,10),(7,11)): c.px(x,y,'9')
def tab_void(c):
    mat(c,sm(m_ellipse(8,8,6.4,4.6)),'purple',n=4)             # 눈
    for p in m_ellipse(8,8,2.6,2.6): c.px(*p,'0',raw=True)     # 텅 빈 동공
    for p in ring(8,8,3.0,3.0,.9): c.px(*p,'y',raw=True)
def tab_origin(c):
    mat(c,m_line(8,13,8,8,2),'wood',n=3)                       # 줄기
    mat(c,sm(m_ellipse(8,6,5.0,3.6),m_ellipse(5.5,8,2.6,2.0),m_ellipse(10.5,8,2.6,2.0)),'moss',n=4)
    sparkle(c,[(6,5),(10,6),(8,3)],'f')

TABS=[('inf',tab_inf),('eter',tab_eter),('real',tab_real),('void',tab_void),('origin',tab_origin)]

# ══ 업적 서른 ═════════════════════════════════════
def h1(c):   # 첫 걸음 — 발자국
    mat(c,sm(m_ellipse(6,6,2.0,2.6)),'skin',n=3)
    mat(c,sm(m_ellipse(10,11,2.0,2.6)),'skin',n=3)
    for x,y in ((5,3),(7,3),(9,8),(11,8)): c.px(x,y,'G')
def h2(c):   # 소규모 길드 — 작은 깃발
    mat(c,m_line(5,13,5,3,1),'wood',n=2)
    mat(c,m_poly([(6,3),(12,5),(6,7)]),'red',n=3)
def h3(c):   # 마나 부자 — 동전 세 닢
    for cx,cy in ((5.5,9),(8,7),(10.5,9)): mat(c,m_ellipse(cx,cy,2.4,2.4),'gold',n=3)
def h4(c):   # 대부호 — 금괴 더미
    mat(c,m_poly([(3,12),(13,12),(12,9),(4,9)]),'gold',n=3)
    mat(c,m_poly([(5,9),(11,9),(10,6),(6,6)]),'gold2',n=3)
def h5(c):   # 천문학자 — 망원경
    mat(c,m_line(4,12,11,5,2),'steel',n=3)
    mat(c,m_ellipse(11.5,4.5,2.0,2.0),'blue',n=3); star(c,4,4,'f','e')
def h6(c):   # 무한의 문턱 — 문 너머의 ∞
    mat(c,m_rect(3,3,4,13),'stone',n=3); mat(c,m_rect(12,3,13,13),'stone',n=3)
    for cx in (6.6,9.4): mat(c,ring(cx,8,2.0,2.4,.9),'purple',n=3)
def h7(c):   # 공방장 — 망치와 못
    mat(c,m_poly([(3,4),(8,4),(8,7),(3,7)]),'iron',n=3)
    mat(c,m_line(5,7,11,13,2),'wood',n=3)
def h8(c):   # 탑주 — 높은 탑
    mat(c,m_poly([(5,13),(11,13),(10,5),(6,5)]),'stone',n=4)
    mat(c,m_poly([(5,5),(11,5),(8,1)]),'blue',n=3)
    for y in (7,10): c.px(8,y,'f')
def h9(c):   # 학장 — 학사모
    mat(c,m_poly([(2,7),(8,4),(14,7),(8,10)]),'purple',n=3)
    mat(c,m_rect(6,10,10,12),'spirit',n=2); mat(c,m_line(13,7,13,12,1),'gold',n=2)
def h10(c):  # 대현자 — 수염 난 얼굴
    mat(c,sm(m_ellipse(8,6,3.4,3.0)),'skin',n=3)
    mat(c,sm(m_poly([(5,8),(11,8),(8,14)])),'bone',n=3)
    c.px(7,6,'0'); c.px(9,6,'0')
def h11(c):  # 첫 환생 — 알에서 나온 빛
    mat(c,sm(m_ellipse(8,9,3.8,4.4)),'bone',n=3)
    for x,y in ((6,7),(8,6),(10,8),(7,11),(9,12)): c.px(x,y,'f')
def h12(c):  # 윤회 — 두 겹 고리
    mat(c,ring(8,8,6.2,6.2,1.4),'spirit',n=3)
    mat(c,ring(8,8,3.2,3.2,1.1),'purple',n=3)
def h13(c):  # 영원한 순환 — 꼬리를 문 뱀
    mat(c,ring(8,8,5.8,5.8,2.0),'moss',n=4)
    c.px(12,6,'k'); c.px(13,7,'m')
def h14(c):  # 승천자 — 위로 뻗은 날개
    mat(c,sm(m_poly([(7,13),(3,8),(5,4),(7,7)])),'ice',n=3)
    mat(c,sm(m_poly([(9,13),(13,8),(11,4),(9,7)])),'ice',n=3)
    star(c,8,4,'f','e')
def h15(c):  # 초월자 — 후광 두른 형상
    mat(c,ring(8,5,3.6,2.4,1.0),'gold',n=3)
    mat(c,sm(m_poly([(8,7),(12,14),(4,14)])),'spirit',n=3)
def h16(c):  # 탐험가 — 배낭과 지팡이
    mat(c,m_line(3,13,6,3,2),'wood',n=3)
    mat(c,sm(m_rect(7,7,13,13)),'moss',n=3); mat(c,m_rect(8,5,12,7),'wood2',n=2)
def h17(c):  # 보스 사냥꾼 — 뿔 달린 해골
    mat(c,sm(m_ellipse(8,9,3.8,3.6)),'bone',n=3)
    mat(c,m_line(4,7,2,3,1),'rock',n=2); mat(c,m_line(12,7,14,3,1),'rock',n=2)
    c.px(6,9,'0'); c.px(10,9,'0'); c.px(8,12,'0')
def h18(c):  # 심연 정복자 — 심연에 꽂은 깃발
    for p in m_ellipse(8,11,6.4,4.0): c.px(*p,'0',raw=True)
    mat(c,m_line(8,13,8,2,1),'steel',n=2)
    mat(c,m_poly([(9,2),(14,4),(9,6)]),'red',n=3)
def h19(c):  # 룬 수집가 — 늘어놓은 룬돌 셋
    for x0 in (2,6.5,11):
        mat(c,sm(m_rect(x0,5,x0+2.4,11)),'stone',n=3)
        c.px(x0+1,7,'t'); c.px(x0+1,9,'t')
def h20(c):  # 룬 대가 — 빛나는 큰 룬
    mat(c,sm(m_poly([(4,3),(12,3),(12,13),(4,13)])),'rock',n=4)
    for x,y in ((8,5),(8,6),(7,7),(8,8),(9,9),(8,10),(8,11)): c.px(x,y,'9')
    sparkle(c,[(5,4),(11,12)])
def h21(c):  # 무장 — 방패와 검
    mat(c,sm(m_poly([(4,3),(10,3),(10,9),(7,13),(4,9)])),'steel',n=4)
    mat(c,m_line(10,12,14,4,1),'iron',n=3)
def h22(c):  # 전설의 장비 — 빛나는 대검
    mat(c,m_poly([(7,13),(9,13),(9,5),(8,2),(7,5)]),'gold2',n=4)
    mat(c,m_rect(5,12,11,13),'iron',n=2)
    sparkle(c,[(6,4),(10,6),(8,1)])
def h23(c):  # 학자 — 펼친 책과 깃펜
    mat(c,m_poly([(2,10),(8,8),(8,13),(2,13)]),'paper',n=3)
    mat(c,m_poly([(8,8),(14,10),(14,13),(8,13)]),'paper',n=3)
    mat(c,m_line(11,7,13,2,1),'bone',n=2)
def h24(c):  # 전지 — 책장 가득
    for y0 in (2.5,7.5):
        for x0 in (3,6,9,12):
            mat(c,m_rect(x0,y0,x0+1.6,y0+4.4),'wood',n=3)
    for x in (4,7,10,13): c.px(x,4,'f'); c.px(x,9,'f')
def h25(c):  # 봉헌자 — 향로
    mat(c,sm(m_ellipse(8,11,4.4,2.6)),'gold',n=3)
    for x,y in ((6,7),(8,5),(10,7),(7,4),(9,3)): c.px(x,y,'x')
def h26(c):  # 보석상 — 다듬은 보석
    mat(c,m_poly([(8,2),(13,7),(8,14),(3,7)]),'ice',n=4)
    for y in range(4,12): c.px(8,y,'9')
    sparkle(c,[(5,6),(11,8)])
def h27(c):  # 도전자 — 끊어진 사슬
    mat(c,ring(4.5,6,2.6,2.6,1.0),'iron',n=3)
    mat(c,ring(11.5,10,2.6,2.6,1.0),'iron',n=3)
    sparkle(c,[(8,8),(7,7),(9,9)],'e')
def h28(c):  # 시련의 주인 — 사슬 위의 관
    mat(c,m_poly([(3,10),(13,10),(12,5),(10,8),(8,4),(6,8),(4,5)]),'gold',n=4)
    mat(c,m_rect(3,11,13,12),'iron',n=2)
def h29(c):  # 유물 사냥꾼 — 유물 담긴 자루
    mat(c,sm(m_ellipse(8,10,5.0,4.4)),'wood2',n=3)
    mat(c,m_rect(6,4,10,6),'blood',n=2)
    sparkle(c,[(6,10),(9,9),(10,12)])
def h30(c):  # 왕국의 지배자 — 왕좌
    mat(c,m_poly([(4,13),(12,13),(12,6),(4,6)]),'blood',n=3)
    mat(c,m_rect(3,3,4,13),'gold',n=3); mat(c,m_rect(12,3,13,13),'gold',n=3)
    mat(c,m_rect(4,2,13,3),'gold2',n=2)

ACH=[('h%d'%i,globals()['h%d'%i]) for i in range(1,31)]

# ══ 계층 돌파 업적 스무 종 ═════════════════════════
# 계층 그림 다섯을 1·5·25·100 회 네 단계와 곱한다. 예전에는 스무 칸이
# 계층 아이콘 다섯 개를 네 번씩 돌려 써서, 목록에 같은 그림이 줄줄이 났다.
BRK_TIER=[
  lambda c: None,                                                   # 1회 — 맨 그림
  lambda c: [c.px(8+round(math.cos(a)*7),8+round(math.sin(a)*7),'e')  # 5회 — 점 다섯
             for a in [i*2*math.pi/5-math.pi/2 for i in range(5)]],
  lambda c: mat(c,ring(8,8,7.4,7.4,1.0),'gold',n=3),                # 25회 — 금테
  lambda c: (mat(c,ring(8,8,7.4,7.4,1.0),'gold2',n=3),              # 100회 — 금테와 관
             mat(c,m_poly([(4,3),(12,3),(11,0),(8,2),(5,0)]),'gold',n=3)),
]

def build_brk(out):
    for k,fn in TABS:
        for i,n in enumerate((1,5,25,100)):
            c=C(N); fn(c); BRK_TIER[i](c)
            out[f'brk_{k}_{n}']=c.rows()

def build(show=False):
    out={}
    for k,fn in AUTO:
        c=C(N); cog(c); fn(c); out['auto_'+k]=c.rows()
    for k,fn in TABS:
        c=C(N); fn(c); out['tab_'+k]=c.rows()
    for k,fn in ACH:
        c=C(N); fn(c); out['ach_'+k]=c.rows()
    build_brk(out)
    if show:
        for k in out:
            print('──',k)
            for r in out[k]: print('  '+r.replace('.',' '))
    save(out,{k:N for k in out})
    print(f'고유 아이콘 {len(out)}종')

if __name__=='__main__':
    build(show='--show' in sys.argv)
