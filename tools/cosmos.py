#!/usr/bin/env python3
"""
우주 계층 아이콘 12종 — 16×16

던전의 깊이는 층 → 행성 → 항성계 → … → 다중우주로 읽힌다.
그 열두 칸에는 여태 그림이 없어서 챕터도 업적도 전부 같은 메달을 달고 있었다.
16칸에서는 형태가 곧 이름이다. 실루엣만으로 갈리도록 굵게 잡는다.

  python3 tools/cosmos.py
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixkit import *

N = 16
set_scale(1.0)

def dot(c, x, y, col):
    c.px(x, y, col)

def star(c, x, y, col, arms=True, dim=None):
    """1픽셀 심지에 십자 팔 — 16칸에서 별은 이 이상 커지면 덩어리가 된다"""
    c.px(x, y, col)
    if arms:
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            c.px(x+dx, y+dy, dim or col)

def ring(cx, cy, rx, ry, w=0.9):
    return m_ellipse(cx, cy, rx, ry) - m_ellipse(cx, cy, max(0.1,rx-w), max(0.1,ry-w))

# ── 12 계층 ────────────────────────────────────────────
def t_floor(c):
    """층 — 발밑의 돌바닥. 유일하게 우주가 아닌 칸이라 네모로 둔다."""
    top = m_rect(2, 6, 13, 8)
    bot = m_rect(1, 9, 14, 12)
    mat(c, top, 'stone', n=3)
    mat(c, bot, 'rock', n=3)
    for x in (4, 8, 12):                       # 이음매
        for y in range(9, 13): c.px(x, y, 'M')
    for x in (6, 10):
        for y in range(6, 9): c.px(x, y, 'M')

def t_planet(c):
    """행성 — 구 하나. 빛은 좌상단."""
    c.ball(8, 8, 5.6, 5.6, 'blue')
    edge(c, m_ellipse(8, 8, 5.6, 5.6), 'D')
    for p in (m_ellipse(6.5, 10.5, 2.2, 1.4) & m_ellipse(8, 8, 5.2, 5.2)):
        c.px(*p, 'q')                          # 바다 그림자
    star(c, 13, 3, 'f', dim='e')

def t_system(c):
    """항성계 — 별 하나와 그것을 도는 궤도"""
    orb = ring(8, 8, 7.0, 3.6, 1.2)
    mat(c, orb, (['4','6','7'],'0'), n=3, mode='form')
    c.ball(8, 8, 3.0, 3.0, 'gold')
    edge(c, m_ellipse(8, 8, 3.0, 3.0), 'A')
    pl = m_ellipse(13, 8, 1.6, 1.6)                     # 궤도 위 행성
    bands(c, pl, ['p','r','t'], n=3, mode='glow', cx=12.4, cy=7.4, r=2)
    edge(c, pl, 'D')

def t_cluster(c):
    """성단 — 별이 빽빽하게 모여 있다. 크기를 달리해 깊이를 준다."""
    big = ((4,4),(11,5),(7,9),(12,12))
    for x, y in big:
        h = m_ellipse(x, y, 1.9, 1.9)
        bands(c, h, ['a','c','e'], n=3, mode='glow', cx=x, cy=y, r=2)
        c.px(x, y, 'f')
    for x, y in ((8,2),(14,8),(3,11),(9,14)):
        c.px(x, y, 'e')
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)): c.px(x+dx, y+dy, 'b')

def t_galaxy(c):
    """은하 — 나선 두 팔. 팔은 굵게, 핵은 밝게."""
    arms = set()
    for k in range(2):
        for i in range(20):
            t = i / 19
            a = t * 3.5 + k * math.pi
            r = 1.3 + t * 6.0
            arms |= m_ellipse(8 + r*math.cos(a), 8 + r*math.sin(a)*0.62, 1.15, 0.95)
    arms = smooth_mask(arms, rounds=1)
    bands(c, arms, ['u','v','w','x'], n=4, mode='glow', cx=8, cy=8, r=8)
    c.ball(8, 8, 2.4, 1.9, 'gold')

def t_group(c):
    """은하군 — 은하 몇 개가 서로를 붙든다"""
    for cx, cy, rx, ry in ((4.5,4.5,2.9,2.0),(11.5,6.0,2.5,1.7),(7.5,11.5,3.1,2.1)):
        halo = m_ellipse(cx, cy, rx, ry)
        bands(c, halo, ['v','w','x'], n=3, mode='glow', cx=cx, cy=cy, r=rx)
        edge(c, halo, 'E')
        c.px(round(cx), round(cy), 'f')
    for p in m_line(6, 6, 10, 8, 1) | m_line(6, 9, 8, 10, 1):
        if c.get(*p) == '.': c.px(*p, 'u')

def t_gcluster(c):
    """은하단 — 무리가 하나의 덩어리로 뭉친다. 중앙이 무겁다."""
    swarm = set()
    for cx, cy, r in ((8,8,3.4),(4.2,5.6,2.4),(11.8,5.6,2.4),
                      (4.6,11,2.3),(11.4,11,2.4),(8,3,2.0),(8,13,2.0)):
        swarm |= m_ellipse(cx, cy, r, r*0.86)
    swarm = smooth_mask(swarm, rounds=2)
    bands(c, swarm, ['u','v','w','x'], n=4, mode='glow', cx=8, cy=8, r=8)
    edge(c, swarm, 'E')
    for x, y in ((8,8),(4,6),(12,6),(5,11),(11,11),(8,3),(8,13)): c.px(x, y, 'f')
    c.px(8, 7, 'f'); c.px(9, 8, 'f')

def t_super(c):
    """초은하단 — 여러 은하단을 잇는 마디"""
    lines = set()
    for a in range(0, 360, 45):
        r = math.radians(a)
        lines |= m_line(8, 8, round(8 + 7*math.cos(r)), round(8 + 7*math.sin(r)), 1)
    bands(c, lines, ['u','v','w'], n=3, mode='glow', cx=8, cy=8, r=8)
    for a in range(0, 360, 45):
        r = math.radians(a)
        c.px(round(8 + 6.5*math.cos(r)), round(8 + 6.5*math.sin(r)), 'e')
    c.ball(8, 8, 2.6, 2.6, 'gold')
    edge(c, m_ellipse(8, 8, 2.6, 2.6), 'A')

def t_filament(c):
    """필라멘트 — 우주가 실처럼 늘어선 가닥"""
    strand = set()
    for i in range(28):
        t = i / 27
        x = 1 + t * 14
        y = 12.5 - t * 9 + math.sin(t * 5.2) * 1.6
        strand |= m_ellipse(x, y, 1.15, 1.15)
    strand = smooth_mask(strand, rounds=1)
    bands(c, strand, ['u','v','w','x'], n=4, mode='form')
    edge(c, strand, 'E')
    for i in (4, 12, 20, 26):
        t = i / 27
        c.px(round(1 + t*14), round(12.5 - t*9 + math.sin(t*5.2)*1.6), 'f')

def t_web(c):
    """우주 거대 구조 — 마디와 마디를 잇는 성긴 격자"""
    node = ((3,3),(12,3),(8,8),(3,12),(13,11))
    link = ((0,2),(1,2),(2,3),(2,4),(0,1),(3,4))
    web = set()
    for a, b in link:
        web |= m_line(*node[a], *node[b], 1)
    bands(c, web, ['E','u','v'], n=3, mode='form')
    for x, y in node:
        h = m_ellipse(x, y, 1.8, 1.8)
        bands(c, h, ['u','w','x'], n=3, mode='glow', cx=x, cy=y, r=2)
        edge(c, h, 'E')
        c.px(x, y, 'f')

def t_observ(c):
    """관측 가능한 우주 — 지평선 안쪽에 든 전부"""
    horizon = ring(8, 8, 7.3, 7.3, 1.1)
    bands(c, horizon, ['c','d','e','f'], n=4, mode='glow', cx=8, cy=8, r=7)
    inner = m_ellipse(8, 8, 5.4, 5.4)
    bands(c, inner, ['E','u','v'], n=3, mode='glow', cx=6.5, cy=6.5, r=6)
    for x, y in ((6,6),(10,7),(7,10),(11,11),(5,9)): c.px(x, y, 'f')
    c.ball(8, 8, 1.7, 1.7, 'gold')

def t_multi(c):
    """다중우주 — 우주가 하나가 아니다. 거품 셋이 서로를 파고든다."""
    bubbles = ((5.2,6.2,4.2,['E','u','v','w']),
               (10.8,6.4,3.8,['D','p','q','r']),
               (8.0,11.4,4.0,['A','a','b','c']))
    for cx, cy, r, ramp in bubbles:                 # 먼저 속을 채우고
        disc = m_ellipse(cx, cy, r, r)
        bands(c, disc, ramp[:3], n=3, mode='glow', cx=cx-1, cy=cy-1, r=r)
    for cx, cy, r, ramp in bubbles:                 # 그 위에 경계를 긋는다
        edge(c, m_ellipse(cx, cy, r, r), ramp[0])
        rg = ring(cx, cy, r, r, 1.0)
        for px_ in rg: c.px(*px_, ramp[-1])
        c.px(round(cx), round(cy), 'f')

TIERS = [('floor',t_floor),('planet',t_planet),('system',t_system),('cluster',t_cluster),
         ('galaxy',t_galaxy),('group',t_group),('gcluster',t_gcluster),('super',t_super),
         ('filament',t_filament),('web',t_web),('observ',t_observ),('multi',t_multi)]

def build(show=False):
    out = {}
    for k, fn in TIERS:
        c = C(N); fn(c)
        out['tier_'+k] = c.rows()
        if show:
            print('──', k)
            for r in c.rows(): print('  ' + r.replace('.', ' '))
    save(out, {k: N for k in out})
    print(f'우주 계층 아이콘 {len(out)}종')

if __name__ == '__main__':
    build(show='--show' in sys.argv)
