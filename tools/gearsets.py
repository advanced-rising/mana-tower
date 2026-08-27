#!/usr/bin/env python3
"""
층(章)마다 다른 장비 36종 — 16×16

여태 장비 열여덟은 처음부터 전부 열려 있고 그림도 이름도 계층과 무관했다.
깊이 내려가는 일이 장비에 아무 흔적도 남기지 않은 셈이다.
열두 장 × 세 자리(무기·방어구·장신구) 로 나눠, 장마다 실루엣과 색이 갈리게 한다.

  자리  : 무기(날붙이) · 방어구(몸을 감싼 것) · 장신구(작고 둥근 것)
  장    : 색과 덧붙는 표식이 바뀐다 — 지상은 쇠와 나무, 위로 갈수록 빛과 공허

  python3 tools/gearsets.py [--show]
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixkit import *

N = 16
set_scale(1.0)

def bbox(m):
    xs=[p[0] for p in m]; ys=[p[1] for p in m]
    return min(xs),min(ys),max(xs),max(ys)
def topline(m,fx):
    ys=[p[1] for p in m if p[0]==fx]
    return min(ys) if ys else None

def ring(cx, cy, rx, ry, w=1.0):
    return m_ellipse(cx, cy, rx, ry) - m_ellipse(cx, cy, max(.1, rx-w), max(.1, ry-w))

# 장마다의 결 — (본체 재질, 표식 색, 표식 모양)
CHAP = [
 ('iron',   '7', 'none'),    # 0 층      — 맨 쇠
 ('wood',   'c', 'stud'),    # 1 행성    — 나무와 못
 ('steel',  't', 'spark'),   # 2 항성계  — 강철에 불꽃
 ('blue',   '9', 'shard'),   # 3 성단    — 얼음 조각
 ('gold',   'f', 'gem'),     # 4 은하    — 금과 보석
 ('purple', 'y', 'rune'),    # 5 은하군  — 룬 각인
 ('ember',  'W', 'flame'),   # 6 은하단  — 불길
 ('bone',   '9', 'crack'),   # 7 초은하단 — 금 간 뼈
 ('ice',    'f', 'halo'),    # 8 필라멘트 — 후광
 ('spirit', 't', 'orbit'),   # 9 거대구조 — 도는 점
 ('gold2',  'f', 'ray'),     #10 관측우주 — 빛살
 ('purple', '0', 'void'),    #11 다중우주 — 구멍
]

def mark(c, mask, kind, col):
    x0,y0,x1,y1 = bbox(mask); cx=(x0+x1)//2; cy=(y0+y1)//2
    if kind=='stud':
        for dy in (y0+3, cy, y1-3): c.px(cx, dy, col)
    elif kind=='spark':
        for dx,dy in ((-3,-3),(3,-2),(0,3)): c.px(cx+dx, cy+dy, col)
    elif kind=='shard':
        for dx in (-2,2):
            for dy in (-2,1): c.px(cx+dx, cy+dy, col)
    elif kind=='gem':
        for dx,dy in ((0,-1),(0,0),(0,1),(-1,0),(1,0)): c.px(cx+dx, cy+dy, col)
    elif kind=='rune':
        for dx,dy in ((0,-3),(0,-1),(-1,0),(1,1),(0,3)): c.px(cx+dx, cy+dy, col)
    elif kind=='flame':
        ty = topline(mask, cx)
        if ty is not None:
            for dy in range(max(0,ty-3), ty): c.px(cx, dy, col)
    elif kind=='crack':
        for i,dy in enumerate(range(y0+2, y1-1, 2)): c.px(cx+(1 if i%2 else -1), dy, col)
    elif kind=='halo':
        for p in ring(cx, y0+1, 4.0, 1.6, .9):
            if p not in mask: c.px(*p, col, raw=True)
    elif kind=='orbit':
        for i in range(4):
            a=i*math.pi/2+.4
            c.px(cx+round(math.cos(a)*6), cy+round(math.sin(a)*6), col)
    elif kind=='ray':
        for dx in (-4,-2,0,2,4):
            ty = topline(mask, cx+dx)
            if ty is not None and ty>=2: c.px(cx+dx, ty-2, col)
    elif kind=='void':
        for p in m_ellipse(cx, cy, 1.8, 1.8) & mask: c.px(*p, '0', raw=True)

# ── 자리 셋 ────────────────────────────────────
def weapon(c, matn):
    blade = m_poly([(7,13),(9,13),(9,5),(8,1),(7,5)])
    grip  = m_rect(5,12,10,13)
    mat(c, blade, matn, n=4)
    mat(c, grip, 'wood2', n=2)
    return sm(blade, grip)

def armor(c, matn):
    body = sm(m_poly([(3,3),(12,3),(12,9),(8,14),(3,9)]))
    mat(c, body, matn, n=4)
    for y in (6,9):
        for x in range(4,12): c.px(x,y,'0')
    return body

def trinket(c, matn):
    band = ring(8,9,4.4,4.4,1.4)
    top  = m_poly([(6,5),(10,5),(8,1)])
    mat(c, band, matn, n=3)
    mat(c, top, matn, n=3)
    return sm(band, top)

SLOTS = [('wp', weapon), ('ar', armor), ('tr', trinket)]

def build(show=False):
    out = {}
    for ci,(matn, col, mk) in enumerate(CHAP):
        for sk, fn in SLOTS:
            c = C(N)
            m = fn(c, matn)
            mark(c, m, mk, col)
            out[f'gs_{ci}_{sk}'] = c.rows()
    if show:
        for k in ('gs_0_wp','gs_4_ar','gs_11_tr'):
            print('──', k)
            for r in out[k]: print('  ' + r.replace('.', ' '))
    save(out, {k: N for k in out})
    print(f'장비 그림 {len(out)}종 = 장 {len(CHAP)} × 자리 {len(SLOTS)}')

if __name__ == '__main__':
    build(show='--show' in sys.argv)
