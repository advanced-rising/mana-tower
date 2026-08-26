#!/usr/bin/env python3
"""
연구 인장 240종 — 16×16

qx0..qx239 는 여덟 종류의 아이콘을 서른 번씩 돌려 쓰고, 이름도 뒤에 숫자만
붙여 '지상 정제 5' 처럼 읽혔다. 여기서는 조합으로 240칸을 모두 다르게 만든다.

  속   : 연구 갈래 여덟 (생산·전투·영혼·결정·봉헌·시간·물류·룬)
  테   : 여섯 단계마다 바뀌는 다섯 가지 테두리
  표식 : 테 안에서 여섯 번 도는 표식

  8 × 5 × 6 = 240 — 겹치는 칸이 없다.

  python3 tools/research.py [--show]
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixkit import *

N=16
set_scale(1.0)

def ring(cx,cy,rx,ry,w=1.0):
    return m_ellipse(cx,cy,rx,ry)-m_ellipse(cx,cy,max(.1,rx-w),max(.1,ry-w))

# ── 갈래 여덟: 한가운데 놓이는 속 ──────────────────
def g_prod(c):      # 생산 — 마나 방울
    mat(c,sm(m_poly([(8,3),(11,8),(8,12),(5,8)])),'blue',n=3); c.px(7,7,'f')
def g_battle(c):    # 전투 — 교차한 칼
    mat(c,m_line(5,11,11,5,1),'steel',n=3); mat(c,m_line(5,5,11,11,1),'iron',n=3)
def g_soul(c):      # 영혼 — 넋
    mat(c,sm(m_ellipse(8,7,2.6,3.0)),'spirit',n=3)
    for x in (6,8,10): c.px(x,11,'w')
def g_crystal(c):   # 결정 — 각진 보석
    mat(c,m_poly([(8,3),(12,7),(10,12),(6,12),(4,7)]),'ice',n=4); c.px(8,6,'9')
def g_offer(c):     # 봉헌 — 잔
    mat(c,sm(m_poly([(5,5),(11,5),(9,10),(7,10)])),'gold',n=3)
    mat(c,m_rect(6,11,10,12),'gold2',n=2)
def g_time(c):      # 시간 — 모래시계
    mat(c,m_poly([(5,4),(11,4),(8,8),(11,12),(5,12),(8,8)]),'bone',n=3); c.px(8,8,'e')
def g_logi(c):      # 물류 — 상자
    mat(c,m_poly([(4,6),(12,6),(12,12),(4,12)]),'wood',n=3)
    for y in range(6,13): c.px(8,y,'A')
def g_rune(c):      # 룬 — 새긴 돌
    mat(c,m_rect(5,4,11,12),'stone',n=3)
    for x,y in ((8,5),(7,6),(8,7),(9,8),(8,9),(8,10)): c.px(x,y,'t')

GLYPH=[('prod',g_prod),('battle',g_battle),('soul',g_soul),('crystal',g_crystal),
       ('offer',g_offer),('time',g_time),('logi',g_logi),('rune',g_rune)]

# ── 테 다섯: 여섯 단계마다 격이 오른다 ─────────────
def f_plain(c):     # 단순한 원
    mat(c,ring(8,8,7.2,7.2,1.1),'stone',n=3)
def f_double(c):    # 두 겹
    mat(c,ring(8,8,7.4,7.4,1.0),'iron',n=3); mat(c,ring(8,8,5.4,5.4,.9),'steel',n=3)
def f_toothed(c):   # 톱니 낀 원
    m=ring(8,8,7.0,7.0,1.2)
    for i in range(12):
        a=i*math.pi/6; m|=m_ellipse(8+math.cos(a)*7.3,8+math.sin(a)*7.3,.9,.9)
    mat(c,smooth_mask(m,rounds=1),'gold',n=4)
def f_starred(c):   # 별 박힌 원
    mat(c,ring(8,8,7.2,7.2,1.1),'purple',n=3)
    for i in range(4):
        a=math.pi/4+i*math.pi/2; c.px(8+math.cos(a)*7.2,8+math.sin(a)*7.2,'f')
def f_halo(c):      # 후광
    mat(c,ring(8,8,7.4,7.4,1.0),'gold2',n=3)
    for p in ring(8,8,6.0,6.0,.8): c.px(*p,'e',raw=True)

FRAME=[f_plain,f_double,f_toothed,f_starred,f_halo]

# ── 표식 여섯: 테 안쪽 네 귀퉁이 ──────────────────
def marks(c,i):
    pts={0:[], 1:[(8,2)], 2:[(8,2),(8,13)], 3:[(8,2),(8,13),(2,8)],
         4:[(8,2),(8,13),(2,8),(13,8)], 5:[(4,4),(11,4),(4,11),(11,11)]}[i]
    col='fedcb'[i%5]
    for x,y in pts: c.px(x,y,col)

def build(show=False):
    out={}
    for gi,(gk,gf) in enumerate(GLYPH):
        for step in range(1,31):
            c=C(N)
            FRAME[(step-1)//6](c)
            marks(c,(step-1)%6)
            gf(c)
            out[f'rx_{gk}_{step}']=c.rows()
    if show:
        for k in ('rx_prod_1','rx_battle_14','rx_rune_30'):
            print('──',k)
            for r in out[k]: print('  '+r.replace('.',' '))
    save(out,{k:N for k in out})
    print(f'연구 인장 {len(out)}종')

if __name__=='__main__':
    build(show='--show' in sys.argv)
