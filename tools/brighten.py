#!/usr/bin/env python3
# 배경에 묻힌 그림을 램프 위로 밀어 올린다.
#
# 스프라이트 3,413 장 중 1,231 장이 UI 바탕(#141419) 위에서 읽히는 칸이 마흔
# 미만이었다 — 왼쪽 탭의 마탑·던전·도전·자동화가 거의 검은 얼룩이었다.
# 생성기가 만드는 것은 pixkit.bands 가 규칙을 지키게 했지만, tower·chain 처럼
# sprites.json 에 손으로 그려 둔 격자는 지날 길이 없다. 그래서 여기서 직접 민다.
#
# 미는 방법: 그림에 쓰인 글자를 저마다의 램프에서 k 칸씩 위로 옮긴다.
# 전부 같은 폭으로 옮기므로 그림 안의 명암 관계는 그대로다 — 외곽선은 여전히
# 몸통보다 어둡다. 읽히기 시작하는 첫 k 에서 멈춘다.
#
#   python3 tools/brighten.py          고칠 것을 세어만 본다
#   python3 tools/brighten.py --write  sprites.json 에 적는다
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from pixkit import RAMP, OUT, _cr, MIN_CR

MIN_SEEN = 40          # 16×16=256 칸 중 이만큼은 배경에서 떠야 한다
MAX_LIFT = 4

def full(nm):
    r = list(RAMP[nm]); o = OUT.get(nm)
    return ([o] + r) if (o and o not in r) else r
RAMPS = [full(n) for n in RAMP]

def shifted(ch, k):
    for r in RAMPS:
        if ch in r:
            return r[min(len(r) - 1, r.index(ch) + k)]
    return ch

def seen(rows):
    return sum(1 for row in rows for ch in row if ch != '.' and _cr(ch) >= 3.0)

def main():
    write = '--write' in sys.argv
    path = os.path.join(ROOT, 'tools', 'sprites.json')
    with open(path, encoding='utf-8') as f: d = json.load(f)
    fixed = givenup = 0
    for name, sp in d['sprites'].items():
        rows = sp.get('rows')
        if not rows or seen(rows) >= MIN_SEEN: continue
        for k in range(1, MAX_LIFT + 1):
            cand = [''.join('.' if c == '.' else shifted(c, k) for c in row) for row in rows]
            if seen(cand) >= MIN_SEEN:
                sp['rows'] = cand; fixed += 1; break
        else:
            # 램프 끝까지 밀어도 못 미치면 갈 수 있는 데까지만 — 원래보다는 낫다
            cand = [''.join('.' if c == '.' else shifted(c, MAX_LIFT) for c in row) for row in rows]
            if seen(cand) > seen(rows): sp['rows'] = cand
            givenup += 1
    print(f'밀어 올린 그림 {fixed}장 · 끝까지 밀어도 모자란 것 {givenup}장')
    if write:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
        print('sprites.json 에 적었다')
    else:
        print('(--write 를 주면 적는다)')

main()
