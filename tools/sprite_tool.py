#!/usr/bin/env python3
"""
마탑 스프라이트 도구 (Aseprite 불필요)

게임의 도트는 index.html 안에 문자 격자로 들어 있다. 이 도구는 그 격자를
PNG로 빼내고, 아무 에디터에서 고친 PNG를 다시 격자로 되돌려 넣는다.
Pixelorama, Piskel, GIMP, Photoshop 등 PNG를 저장할 수 있으면 무엇이든 쓸 수 있다.

  python3 tools/sprite_tool.py list
  python3 tools/sprite_tool.py palette            팔레트를 .gpl / .png 로 내보낸다
  python3 tools/sprite_tool.py export             전체를 PNG 로 내보낸다
  python3 tools/sprite_tool.py export mana tower  일부만
  python3 tools/sprite_tool.py sheet              한 장짜리 대조표
  python3 tools/sprite_tool.py import art/mana.png mana --apply
"""
import re, sys, os, argparse
from PIL import Image

import json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'tools', 'sprites.json')
ART  = os.path.join(ROOT, 'art')

def read_game():
    return json.load(open(DATA, encoding='utf-8'))

def parse_palette(d):
    return {k: tuple(int(v[i:i+2], 16) for i in (1, 3, 5)) for k, v in d['palette'].items()}

def parse_sprites(d):
    return {k: (v['rows'], v['size']) for k, v in d['sprites'].items()}

def to_image(rows, size, pal, scale=1):
    img = Image.new('RGBA', (size * scale, size * scale), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        line = (rows[y] if y < len(rows) else '').ljust(size, '.')
        for x in range(size):
            c = pal.get(line[x])
            if c:
                for dy in range(scale):
                    for dx in range(scale):
                        px[x*scale+dx, y*scale+dy] = c + (255,)
    return img

def nearest(rgb, pal):
    best, bd = '.', 1 << 30
    for ch, c in pal.items():
        if ch == '.':
            continue
        d = sum((a-b)**2 for a, b in zip(rgb, c))
        if d < bd:
            bd, best = d, ch
    return best

def guess_size(w, want=None):
    """그림 폭에서 원래 스프라이트 크기를 추정한다. want 가 있으면 그것을 우선한다."""
    if want and w % want == 0:
        return want
    for base in (24, 16):
        if w % base == 0:
            return base
    return 24 if w > 20 else 16

def from_image(path, pal, want=None):
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    if w != h:
        raise SystemExit(f'정사각형 그림이어야 합니다 (지금 {w}x{h})')
    size = guess_size(w, want)
    f = w // size                      # 4배·8배로 그린 그림도 그대로 받아준다
    if f > 1:
        img = img.resize((size, size), Image.NEAREST)
    px = img.load()
    rows = []
    for y in range(size):
        line = ''
        for x in range(size):
            r, g, b, a = px[x, y]
            line += '.' if a < 128 else nearest((r, g, b), pal)
        rows.append(line.rstrip('.'))
    while rows and rows[-1] == '':
        rows.pop()
    return rows, size

def patch(d, name, rows):
    """sprites.json 을 갱신한다. 실제 PNG 는 build_sprites.py 가 굽는다."""
    if name not in d['sprites']:
        raise SystemExit(f"'{name}' 스프라이트가 sprites.json 에 없습니다")
    d['sprites'][name]['rows'] = rows
    json.dump(d, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return d

def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument('cmd', nargs='?', default='list')
    ap.add_argument('args', nargs='*')
    ap.add_argument('--scale', type=int, default=1)
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--out', default=ART)
    a = ap.parse_args()

    src = read_game()
    pal = parse_palette(src)
    spr = parse_sprites(src)
    os.makedirs(a.out, exist_ok=True)

    if a.cmd == 'list':
        print(f'팔레트 {len(pal)}색 / 스프라이트 {len(spr)}종')
        for n, (rows, size) in sorted(spr.items(), key=lambda kv: (-kv[1][1], kv[0])):
            print(f'  {size}x{size}  {n:14s} 색 {len(set("".join(rows))-{"."})}단계')

    elif a.cmd == 'palette':
        gpl = os.path.join(a.out, 'mana-tower.gpl')
        with open(gpl, 'w') as f:
            f.write('GIMP Palette\nName: Mana Tower (obsidian gold)\nColumns: 8\n#\n')
            for ch, c in pal.items():
                if ch != '.':
                    f.write(f'{c[0]:3d} {c[1]:3d} {c[2]:3d}\t{ch}\n')
        n = len(pal) - (1 if '.' in pal else 0)
        img = Image.new('RGB', (n * 16, 16))
        for i, (ch, c) in enumerate([kv for kv in pal.items() if kv[0] != '.']):
            for x in range(16):
                for y in range(16):
                    img.putpixel((i * 16 + x, y), c)
        img.save(os.path.join(a.out, 'mana-tower-palette.png'))
        print(f'팔레트 {n}색 저장: {gpl}')
        print('  Pixelorama/GIMP: 팔레트 불러오기에서 .gpl 선택')

    elif a.cmd == 'export':
        names = a.args or sorted(spr)
        for n in names:
            if n not in spr:
                print(f'  건너뜀(없음): {n}'); continue
            rows, size = spr[n]
            to_image(rows, size, pal, a.scale).save(os.path.join(a.out, f'{n}.png'))
        print(f'{len([n for n in names if n in spr])}종을 {a.out} 에 PNG 로 저장 (배율 {a.scale})')

    elif a.cmd == 'sheet':
        names = sorted(spr, key=lambda n: (-spr[n][1], n))
        cols, cell, sc = 8, 32, 1
        rowsn = (len(names) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * cell, rowsn * cell), (11, 11, 13, 255))
        for i, n in enumerate(names):
            rows, size = spr[n]
            im = to_image(rows, size, pal, 1)
            x, y = (i % cols) * cell, (i // cols) * cell
            sheet.paste(im, (x + (cell - size) // 2, y + (cell - size) // 2), im)
        out = os.path.join(a.out, 'sheet.png')
        sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(out)
        print(f'대조표 저장: {out} ({len(names)}종)')

    elif a.cmd == 'import':
        if len(a.args) < 2:
            raise SystemExit('사용법: import <png> <스프라이트이름> [--apply]')
        path, name = a.args[0], a.args[1]
        want = spr.get(name, (None, None))[1]
        rows, size = from_image(path, pal, want)
        want = want or size
        if size != want:
            print(f'주의: {name} 은 {want}x{want} 인데 들어온 그림은 {size}x{size} 입니다')
        print(f'{name} ({size}x{size}) 변환 결과:')
        for r in rows:
            print('   ' + r)
        if a.apply:
            patch(src, name, rows)
            os.system(f'python3 {os.path.join(ROOT,"tools","build_sprites.py")} >/dev/null')
            print(f'{name} 을 교체하고 PNG 를 다시 구웠습니다 (가운데 정렬 자동 적용)')
        else:
            print('실제 반영하려면 --apply 를 붙이세요')
    else:
        print(__doc__)

if __name__ == '__main__':
    main()
