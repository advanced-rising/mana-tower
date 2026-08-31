#!/usr/bin/env python3
# 그림이 배경에 묻혀 있지 않은지 본다.
#
# 파일이 있는지, 받아지는지만 보던 검사는 이 문제를 못 잡았다 — 3,413 장이
# 전부 멀쩡히 받아졌고, 그 중 1,231 장이 UI 바탕 위에서 보이지 않았을 뿐이다.
# 왼쪽 탭의 마탑·던전·도전·자동화가 거의 검은 얼룩이었다.
# 여기서는 '떠 보이는 칸이 몇 개인가' 를 센다. 배경 대비 3:1 을 넘는 칸이다.
import os, sys, struct, zlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'art', 'sprites')
BG = (0x14, 0x14, 0x19)
MIN_SEEN = 40
ALLOW = 40          # 일부러 어두운 공허 계열 서른셋. 그보다 늘면 되돌아간 것이다.

def lum(c):
    f = lambda v: ((v/255+0.055)/1.055)**2.4 if v/255 > 0.04045 else v/255/12.92
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])
BGL = lum(BG)
def cr(c):
    a = lum(c)
    return (max(a, BGL)+0.05)/(min(a, BGL)+0.05)

def rgba(path):
    data = open(path,'rb').read(); pos=8; w=h=bd=ct=None; idat=b''
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos+4])[0]; typ = data[pos+4:pos+8]
        body = data[pos+8:pos+8+ln]; pos += 12+ln
        if typ==b'IHDR': w,h,bd,ct = struct.unpack('>IIBB', body[:10])
        elif typ==b'IDAT': idat += body
        elif typ==b'IEND': break
    if ct!=6 or bd!=8: return None
    raw = zlib.decompress(idat); st=w*4; out=bytearray(); prev=bytearray(st); i=0
    for _ in range(h):
        f=raw[i]; i+=1; line=bytearray(raw[i:i+st]); i+=st
        if f==1:
            for x in range(4,st): line[x]=(line[x]+line[x-4])&255
        elif f==2:
            for x in range(st): line[x]=(line[x]+prev[x])&255
        elif f==3:
            for x in range(st):
                a=line[x-4] if x>=4 else 0
                line[x]=(line[x]+((a+prev[x])>>1))&255
        elif f==4:
            for x in range(st):
                a=line[x-4] if x>=4 else 0
                c=prev[x-4] if x>=4 else 0
                b=prev[x]; p=a+b-c
                pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[x]=(line[x]+pr)&255
        out+=line; prev=line
    return out

faint=[]; total=0
for fn in sorted(os.listdir(D)):
    if not fn.endswith('.png'): continue
    px = rgba(os.path.join(D, fn))
    if px is None: continue
    total += 1
    seen = sum(1 for k in range(0,len(px),4) if px[k+3]>=128 and cr(px[k:k+3])>=3.0)
    if seen < MIN_SEEN: faint.append((seen, fn[:-4]))
faint.sort()
print(f'  그림 {total}장 · 배경에 묻힌 것 {len(faint)}장 (허용 {ALLOW})')
for s,n in faint[:8]: print(f'     {s:3d}칸  {n}')
print(f'  COVER 그림={total}')
if len(faint) > ALLOW:
    print(f'  [!] 묻힌 그림이 {len(faint)}장 — 팔레트가 어두워졌다. tools/brighten.py 를 돌려라')
    sys.exit(1)
