#!/usr/bin/env python3
"""
업적 배지 576종 — 16×16

업적이 572개인데 그림은 48장이었다. starcrown 한 장을 202개가 나눠 쓰니
무엇을 딴 것인지 글자를 읽어야만 알 수 있었다. 몬스터를 기본형×속성으로
불린 것과 같은 방법으로, 배지도 테두리×문양×색으로 조합해 만든다.

  테두리 6 × 문양 12 × 색 8 = 576

16칸에서 테두리는 2픽셀만 쓴다. 남는 10×10 안에 문양을 넣어야 하므로
문양은 굵고 단순해야 한다. 가는 선은 이 크기에서 그냥 사라진다.

  python3 tools/badges.py [--show]
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixkit import *

N = 16
set_scale(1.0)
CX = CY = 8.0

# 색 — (테두리 톤 4, 외곽선, 문양 밝은색, 문양 어두운색)
PAL = {
 'gold' : (['b','c','d','e'], 'A', 'f', 'c'),
 'steel': (['2','4','6','7'], '0', '7', '4'),
 'wood' : (['A','a','b','c'], '0', 'd', 'a'),
 'blue' : (['p','q','r','s'], 'D', 't', 'q'),
 'lilac': (['u','v','w','x'], 'E', 'y', 'v'),
 'moss' : (['g','h','i','j'], 'B', 'k', 'h'),
 'rust' : (['l','m','n','o'], 'C', 'o', 'm'),
 'void' : (['u','v','w','x'], '0', 'y', 'v'),
}
# 배지도 같은 규칙을 지난다 — 415 장이 배경에 묻혀 있었다.
PAL = {k:(lift(v[0]),v[1],v[2],v[3]) for k,v in PAL.items()}

def ring_m(rx, ry, w):
    return m_ellipse(CX, CY, rx, ry) - m_ellipse(CX, CY, rx-w, ry-w)

# ── 테두리 6종 : (바깥 마스크, 안쪽 빈 칸) ────────────────
def f_disc():
    o = m_ellipse(CX, CY, 7.4, 7.4)
    return o - m_ellipse(CX, CY, 5.2, 5.2), m_ellipse(CX, CY, 5.2, 5.2)

def f_ring():
    o = ring_m(7.4, 7.4, 2.6)
    return o, m_ellipse(CX, CY, 4.9, 4.9)

def f_shield():
    pts = [(2,1),(14,1),(14,8),(8,15),(2,8)]
    o = m_poly(pts)
    inner = m_poly([(4,3),(12,3),(12,8),(8,12.5),(4,8)])
    return o - inner, inner

def f_hex():
    pts = [(8,0.6),(14.4,4.2),(14.4,11.8),(8,15.4),(1.6,11.8),(1.6,4.2)]
    o = m_poly(pts)
    inner = m_poly([(8,3),(12.2,5.4),(12.2,10.6),(8,13),(3.8,10.6),(3.8,5.4)])
    return o - inner, inner

def f_gem():
    o = m_poly([(8,0.4),(15.6,8),(8,15.6),(0.4,8)])
    inner = m_poly([(8,3.2),(12.8,8),(8,12.8),(3.2,8)])
    return o - inner, inner

def f_burst():
    o = ring_m(6.2, 6.2, 1.7)
    for k in range(4):                       # 살은 네 방향으로만, 굵게
        a = k * math.pi / 2 + math.pi/4
        o |= m_line(CX + 5.4*math.cos(a), CY + 5.4*math.sin(a),
                    CX + 7.3*math.cos(a), CY + 7.3*math.sin(a), 2)
    inner = m_ellipse(CX, CY, 4.6, 4.6)
    return o - inner, inner

FRAMES = [('disc',f_disc), ('ring',f_ring), ('shield',f_shield),
          ('hex',f_hex), ('gem',f_gem), ('burst',f_burst)]

# ── 문양 12종 : 가운데 10칸 안에서만 그린다 ─────────────
def e_dot():   return m_ellipse(CX, CY, 2.1, 2.1)
def e_cross(): return m_rect(7,5,8,10) | m_rect(5,7,10,8)
def e_chev():  return m_line(5.4,9.6,8,6.6,2) | m_line(8,6.6,10.6,9.6,2)
def e_moon():  return m_ellipse(CX-0.5, CY, 2.9, 3.0) - m_ellipse(CX+1.5, CY-0.4, 2.5, 2.7)
def e_flame(): return m_ellipse(CX, CY+0.8, 2.1, 2.3) | m_poly([(8,4.4),(9.6,7.6),(6.4,7.6)])
def e_eye():
    # 7칸에서 눈은 다각형으로 그리면 그냥 타원이 된다. 윤곽을 직접 찍는다.
    return {(7,6),(8,6),(9,6), (6,7),(10,7), (5,8),(11,8),
            (6,9),(10,9), (7,10),(8,10),(9,10), (8,8)}
def e_spiral():
    m = set()
    for i in range(14):
        t = i/13; a = t*4.0; r = 0.5+t*2.5
        m |= m_ellipse(CX+r*math.cos(a), CY+r*math.sin(a), 0.8, 0.8)
    return m
def e_bolt():  return m_poly([(9.6,4.6),(6.6,8.2),(8.2,8.2),(6.8,11.4),(10.0,7.6),(8.4,7.6)])
def e_tri():
    m = set()
    for x, y in ((8,5.6),(5.9,9.8),(10.1,9.8)): m |= m_ellipse(x, y, 1.4, 1.4)
    return m
def e_ring():  return ring_m(3.0, 3.0, 1.4)
def e_bar():   return m_rect(5,6,10,7) | m_rect(5,9,10,10)
def e_crown():
    # 봉우리 셋에 띠 하나. 이보다 작게는 왕관으로 안 읽힌다.
    m = {(x,10) for x in range(5,12)} | {(x,9) for x in range(5,12)}
    m |= {(5,8),(5,7),(5,6), (8,8),(8,7), (11,8),(11,7),(11,6)}
    m |= {(6,8),(10,8)}
    return m

EMBLEMS = [('dot',e_dot),('cross',e_cross),('chev',e_chev),('moon',e_moon),
           ('flame',e_flame),('eye',e_eye),('spiral',e_spiral),('bolt',e_bolt),
           ('tri',e_tri),('ring',e_ring),('bar',e_bar),('crown',e_crown)]

def draw(fr, em, pal):
    c = C(N)
    tones, out, hi, lo = PAL[pal]
    frame, field = fr()
    frame = frame - set()
    bands(c, frame, tones, n=4, mode='glow', cx=CX-2.4, cy=CY-2.4, r=9)
    edge(c, frame, out)
    mark = em()                               # 문양은 7칸 안이라 어떤 테두리에도 들어간다
    for x, y in mark: c.px(x, y, hi)
    """속이 있는 문양만 아래·오른쪽을 한 톤 낮춘다. 획이 가는 문양까지 낮추면
       모든 픽셀이 그늘이 되어 문양 자체가 사라진다."""
    inner = {(x,y) for x,y in mark
             if all((x+dx,y+dy) in mark for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)))}
    if inner:
        for x, y in mark:
            if (x+1,y) not in mark or (x,y+1) not in mark: c.px(x, y, lo)
    return c

def build(show=False):
    out = {}
    for fk, fr in FRAMES:
        for pk in PAL:
            for ek, em in EMBLEMS:
                out[f'badge_{fk}_{pk}_{ek}'] = draw(fr, em, pk).rows()
    save(out, {k: N for k in out})
    print(f'업적 배지 {len(out)}종 = 테두리 {len(FRAMES)} × 색 {len(PAL)} × 문양 {len(EMBLEMS)}')
    if show:
        for k in ('badge_disc_gold_crown','badge_shield_blue_bolt','badge_gem_lilac_eye','badge_burst_rust_flame'):
            print('──', k)
            for r in json_rows(out[k]): print('  ' + r.replace('.', ' '))

def json_rows(rows): return rows

if __name__ == '__main__':
    build(show='--show' in sys.argv)
