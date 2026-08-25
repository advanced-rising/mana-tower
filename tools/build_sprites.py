#!/usr/bin/env python3
"""
도트 스프라이트 빌드

tools/sprites.json 의 문자 격자를 읽어 art/sprites/<이름>.png 로 굽는다.
각 그림은 실제 그려진 영역(바운딩 박스)을 계산해 캔버스 정중앙에 배치한다.
격자를 왼쪽 위부터 채워도 결과물은 항상 가운데 정렬된다.

  python3 tools/build_sprites.py            전부 빌드
  python3 tools/build_sprites.py --check    정렬 상태만 점검
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'tools', 'sprites.json')
OUT  = os.path.join(ROOT, 'art', 'sprites')

def load():
    d = json.load(open(DATA, encoding='utf-8'))
    return d['palette'], d['sprites']

def grid(rows, n):
    return [ (rows[y] if y < len(rows) else '').ljust(n, '.')[:n] for y in range(n) ]

def bbox(g, n):
    xs = [x for y in range(n) for x in range(n) if g[y][x] != '.']
    ys = [y for y in range(n) for x in range(n) if g[y][x] != '.']
    if not xs:
        return None
    return min(xs), min(ys), max(xs), max(ys)

def center(g, n):
    """그려진 영역을 캔버스 정중앙으로 옮긴다."""
    bb = bbox(g, n)
    if not bb:
        return g, (0, 0)
    x0, y0, x1, y1 = bb
    w, h = x1 - x0 + 1, y1 - y0 + 1
    dx = (n - w) // 2 - x0
    dy = (n - h) // 2 - y0
    if dx == 0 and dy == 0:
        return g, (0, 0)
    out = [['.'] * n for _ in range(n)]
    for y in range(n):
        for x in range(n):
            c = g[y][x]
            if c != '.':
                ny, nx = y + dy, x + dx
                if 0 <= ny < n and 0 <= nx < n:
                    out[ny][nx] = c
    return [''.join(r) for r in out], (dx, dy)

def render(g, n, pal):
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    px = img.load()
    for y in range(n):
        for x in range(n):
            c = g[y][x]
            if c != '.' and c in pal:
                v = pal[c]
                px[x, y] = (int(v[1:3],16), int(v[3:5],16), int(v[5:7],16), 255)
    return img

def main():
    pal, sprites = load()
    check = '--check' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    moved = []
    manifest = {}
    for name, sp in sorted(sprites.items()):
        n = sp['size']
        g = grid(sp['rows'], n)
        g, (dx, dy) = center(g, n)
        if dx or dy:
            moved.append((name, dx, dy))
        manifest[name] = n
        if not check:
            render(g, n, pal).save(os.path.join(OUT, f'{name}.png'), optimize=True)
    print(f'스프라이트 {len(sprites)}종 (24x24 {sum(1 for v in sprites.values() if v["size"]==24)}, '
          f'16x16 {sum(1 for v in sprites.values() if v["size"]==16)})')
    if moved:
        print(f'가운데로 옮긴 그림 {len(moved)}종:')
        for nm, dx, dy in moved[:60]:
            print(f'   {nm:14s} x{dx:+d} y{dy:+d}')
    else:
        print('전부 이미 가운데 정렬되어 있습니다')
    if not check:
        json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=0)
        total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.png'))
        print(f'{OUT} 에 PNG {len(sprites)}개 저장 (합계 {total:,} bytes)')

if __name__ == '__main__':
    main()
