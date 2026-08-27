/* 검증 하네스를 한 번에 돌린다.
   npm run verify 는 먼저 빌드하고 스모크를 지난 뒤에야 여기 온다 —
   빌드가 깨진 채로 옛 번들을 검사해 "통과" 라고 답한 적이 있다.
   검사는 지금 코드에 대해서만 뜻이 있다.
   각 하네스는 index.html 의 </body> 앞에 끼워 넣어져 실제 게임 위에서 돌고,
   결과를 <pre id="TESTOUT"> 에 적은 뒤 'DONE' 으로 끝낸다.
   'DONE' 이 없으면 도중에 죽은 것이므로 실패로 친다. */
import { execFile } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { promisify } from 'node:util'
const run = promisify(execFile)

const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT=new URL('..',import.meta.url).pathname
const HARNESS=[
  ['numlint',    'tools/numlint.html',    45,  '축약 안 된 숫자'],
  ['numaudit',   'tools/numaudit.html',   60,  '숫자 연산·비용 수학'],
  ['tabsweep',   'tools/tabsweep.html',   240,  '탭마다 이미지와 표기'],
  ['infsweep',   'tools/infsweep.html',   180, '유한한 값이 ∞ 로 새는 곳'],
  ['matflow',    'tools/matflow.html',    200, '프레스티지 뒤 재료가 흐르는가'],
  ['invariants', 'tools/invariants.html', 500, '한 시간 플레이 불변식'],
]
const only=process.argv.slice(2).filter(a=>!a.startsWith('-'))

let failed=0
for(const [name,rel,secs,what] of HARNESS){
  if(only.length&&!only.includes(name)) continue
  const path=ROOT+rel
  if(!existsSync(path)){ console.log(`  ${name}: 하네스가 없다 (${rel})`); failed++; continue }
  const html=readFileSync(ROOT+'index.html','utf8')
  const at=html.lastIndexOf('</body>')
  const tmp=ROOT+`_verify_${name}.html`
  writeFileSync(tmp, html.slice(0,at)+readFileSync(path,'utf8')+html.slice(at))
  let out=''
  try{
    const r=await run(CHROME,['--headless','--disable-gpu','--no-sandbox',
      '--allow-file-access-from-files','--window-size=1400,1000',
      `--virtual-time-budget=${secs*1000}`,'--dump-dom','file://'+tmp],
      {maxBuffer:256*1024*1024})
    out=r.stdout
  }catch(e){ out=e.stdout||'' }
  finally{ try{ unlinkSync(tmp) }catch{} }

  const m=out.match(/<pre id="TESTOUT"[^>]*>([\s\S]*?)<\/pre>/)
  const body=(m?m[1]:'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').trim()
  const done=/\bDONE\b/.test(body)
  const problems=body.split('\n').filter(l=>l.includes('[!]'))
  const tally=body.split('\n').filter(l=>/^===/.test(l.trim())).pop()||''
  const ok=done&&problems.length===0&&!/[1-9]\d*건/.test(tally.replace(/0건/,''))
  console.log(`\n── ${name}  (${what})`)
  if(!done){ console.log('   [!] 도중에 멈췄다 — 아래는 마지막 출력'); }
  for(const l of body.split('\n').slice(-14)) if(l.trim()) console.log('   '+l)
  if(!ok) failed++
}
console.log(failed?`\n검증 실패 ${failed}건`:'\n모든 검증 통과')
process.exit(failed?1:0)
