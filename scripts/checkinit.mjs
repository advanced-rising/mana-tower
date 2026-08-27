/* 모듈 평가 시점에 import 된 이름을 읽는 코드를 찾는다.

   이 저장소의 모듈 그래프에는 고리가 많다. 고리 안에서는 먼저 들어간 쪽이
   아직 채워지지 않은 상태로 보이므로, 최상위에서 import 를 읽으면 undefined 가
   온다. 함수 안에서 읽는 것은 안전하다 — 그때는 모두 채워져 있다.

   이번 작업에서만 다섯 번 터졌다 (INF_LAYERS · PRODUCERS · ACHS · RES · BUILDERS).
   그래서 빌드가 이것을 막는다. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const files = []
;(function walk(d){ for(const f of readdirSync(d)){ const p=join(d,f)
  statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') && files.push(p) } })('src')

/* 진입점은 모든 모듈이 평가된 뒤에 돈다 — 여기서는 읽어도 된다 */
const ENTRY = new Set(['src/main.ts'])

const bad = []
for (const f of files.sort()) {
  if (ENTRY.has(f)) continue
  const src = readFileSync(f, 'utf8')
  const imported = new Set()
  for (const m of src.matchAll(/import \{ (.+?) \} from/g))
    for (const n of m[1].split(',')) imported.add(n.trim())
  if (!imported.size) continue

  /* 최상위 for/while/if 블록 안도 평가 시점에 도는 코드다. 예전에는 문장의
     첫 줄만 보아서, 루프 몸통에서 COSMOS[ch] 를 읽는 코드를 그냥 지나쳤고
     페이지가 첫 줄에서 죽었다. 블록이 닫힐 때까지 계속 본다. */
  let depth = 0, eagerUntil = -1
  src.split('\n').forEach((line, i) => {
    const st = line.trim()
    const open = () => { depth += (line.match(/\{/g)||[]).length - (line.match(/\}/g)||[]).length }
    if (st.startsWith('import ') || st.startsWith('//') || st.startsWith('/*') || st.startsWith('*')) return open()
    const inEagerBlock = eagerUntil >= 0 && depth > eagerUntil
    if ((depth === 0 || inEagerBlock) && st && !/^(export\s+)?(function|class)\b/.test(st)) {
      /* 최상위 실행문: for / while / if / 대입 / 직접 호출 */
      if (/^(for|while|if|switch|try|\})/.test(st) || /^(export\s+)?(const|let|var)\s/.test(st) || /^[A-Za-z_$][\w$.]*\s*\(/.test(st) || inEagerBlock) {
        if (depth === 0 && /^(for|while|if|switch|try)\b/.test(st) && /\{\s*$/.test(line)) eagerUntil = depth
        /* 함수 몸통 안에서 읽는 것은 안전하다 — 화살표든 메서드든 잘라 낸다 */
        const eager = st.replace(/=>[\s\S]*/, '').replace(/\)\s*\{[\s\S]*/, '')
        for (const n of imported) {
          const esc = n.replace(/\$/g, '\\$')
          /* 객체 열쇠(`gather:`)는 그 이름을 읽는 것이 아니다 */
          if (new RegExp(`(?<![\\w$.])${esc}\\b(?!\\s*:)`).test(eager))
            bad.push(`${f}:${i+1}  ${n}  ${st.slice(0,64)}`)
        }
      }
    }
    open()
    if (eagerUntil >= 0 && depth <= eagerUntil) eagerUntil = -1
  })
}

if (bad.length) {
  console.error('\n모듈 평가 시점에 import 를 읽는 코드가 있습니다 — 순환 고리에서 undefined 가 됩니다:')
  for (const b of [...new Set(bad)]) console.error('  ' + b)
  console.error('\n함수 안으로 옮기거나, 처음 쓸 때 채우도록 미루세요.\n')
  process.exit(1)
}
console.log('  init check: 최상위에서 import 를 읽는 곳 없음')
