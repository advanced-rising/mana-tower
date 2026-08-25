#!/usr/bin/env python3
"""tsc 가 "Cannot find name" 이라고 지목한 이름들을 찾아 import 를 채운다.
어느 모듈이 그 이름을 export 하는지는 파일을 훑어 만든다."""
import re, subprocess, glob, os, sys
from collections import defaultdict

files = sorted(glob.glob('src/**/*.ts', recursive=True))
owner = {}
for f in files:
    for m in re.finditer(r'(?m)^export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', open(f,encoding='utf-8').read()):
        owner[m.group(1)] = f
    # `export let a=1, b=2` 형태
    for m in re.finditer(r'(?m)^export\s+(?:const|let|var)\s+(.+)$', open(f,encoding='utf-8').read()):
        for part in m.group(1).split(','):
            n = part.strip().split('=')[0].strip()
            if re.fullmatch(r'[A-Za-z_$][\w$]*', n): owner.setdefault(n, f)

def relpath(frm, to):
    d = os.path.relpath(os.path.dirname(to), os.path.dirname(frm)) or '.'
    p = (d + '/' + os.path.basename(to)[:-3]).replace('\\','/')
    return p if p.startswith('.') else './' + p

out = subprocess.run(['npx','tsc','--noEmit'], capture_output=True, text=True).stdout
missing = defaultdict(set)
for m in re.finditer(r"^(src/[\w/]+\.ts)\(\d+,\d+\): error TS(?:2304|2581): Cannot find name '([^']+)'", out, re.M):
    missing[m.group(1)].add(m.group(2))

added = 0
for f, names in sorted(missing.items()):
    text = open(f, encoding='utf-8').read()
    by_mod = defaultdict(list)
    for n in sorted(names):
        o = owner.get(n)
        if o and o != f: by_mod[o].append(n)
        elif not o: print(f'  ?? {f}: {n} 의 주인을 못 찾음', file=sys.stderr)
    if not by_mod: continue
    lines = text.split('\n')
    # 이미 있는 import 줄에 합치거나 새 줄을 만든다
    for mod, ns in by_mod.items():
        spec = relpath(f, mod)
        pat = re.compile(r"^import \{ (.+?) \} from '" + re.escape(spec) + r"'$", re.M)
        mm = pat.search(text)
        if mm:
            have = [x.strip() for x in mm.group(1).split(',')]
            text = pat.sub("import { " + ', '.join(sorted(set(have) | set(ns))) + " } from '" + spec + "'", text, count=1)
        else:
            text = "import { " + ', '.join(sorted(ns)) + " } from '" + spec + "'\n" + text
        added += len(ns)
    open(f, 'w', encoding='utf-8').write(text)
    print(f'  {f}: {sum(len(v) for v in by_mod.values())}개 채움')
print(f'총 {added}개 import 추가')
