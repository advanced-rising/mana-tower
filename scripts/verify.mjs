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
import { cpus } from 'node:os'
const run = promisify(execFile)

const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT=new URL('..',import.meta.url).pathname
const HARNESS=[
  ['numlint',    'tools/numlint.html',    45,  '축약 안 된 숫자'],
  ['numaudit',   'tools/numaudit.html',   60,  '숫자 연산·비용 수학'],
  ['tabsweep',   'tools/tabsweep.html',   420,  '탭마다 이미지와 표기'],
  ['infsweep',   'tools/infsweep.html',   180, '유한한 값이 ∞ 로 새는 곳'],
  ['matflow',    'tools/matflow.html',    200, '프레스티지 뒤 재료가 흐르는가'],
  ['stalem',     'tools/stalem.html',     200, '배율 캐시가 낡는 자리'],
  ['updthrow',   'tools/updthrow.html',   300, '화면 갱신이 조용히 멈추는 자리'],
  ['invariants', 'tools/invariants.html', 500, '한 시간 플레이 불변식'],
]
const only=process.argv.slice(2).filter(a=>!a.startsWith('-'))

/* 브라우저 안이 아니라 화면 자체를 보는 검사는 따로 돈다 */
if(!only.length){
  for(const args of [[],['--phone']]){
    try{ const r=await run('node',[ROOT+'scripts/textscan.mjs',...args],{cwd:ROOT,maxBuffer:64*1024*1024})
      console.log(`\n── textscan${args.length?' (휴대폰)':''}  (글자가 안 나오는 자리)`)
      for(const l of r.stdout.split('\n')) if(l.trim()) console.log(l)
    }catch(e){
      console.log(`\n── textscan${args.length?' (휴대폰)':''}  (글자가 안 나오는 자리)`)
      for(const l of ((e.stdout||'')+(e.stderr||'')).split('\n')) if(l.trim()) console.log(l)
      failedText++
    }
  }
}

/* 하네스는 저마다 크롬을 따로 띄우므로 서로 기다릴 이유가 없다. 차례로 돌리면
   합이 팔 분이라 푸시 훅으로 쓰기 어려웠다 — 함께 돌리면 가장 긴 하나로 줄어든다.
   출력은 끝난 순서가 아니라 적어 둔 순서로 낸다. 읽는 쪽이 헷갈리지 않아야 한다. */
async function runOne([name,rel,secs,what],tag=''){
  const path=ROOT+rel
  if(!existsSync(path)) return {name,what,missing:true}
  const html=readFileSync(ROOT+'index.html','utf8')
  const at=html.lastIndexOf('</body>')
  const tmp=ROOT+`_verify_${name}${tag}.html`
  writeFileSync(tmp, html.slice(0,at)+readFileSync(path,'utf8')+html.slice(at))
  let out=''
  try{
    const r=await run(CHROME,['--headless','--disable-gpu','--no-sandbox',
      '--allow-file-access-from-files','--window-size=1400,1000',
      `--virtual-time-budget=${secs*1000}`,'--dump-dom','file://'+tmp],
      {maxBuffer:256*1024*1024, stdio:['ignore','pipe','pipe']})
    out=r.stdout
  }catch(e){ out=e.stdout||'' }
  finally{ try{ unlinkSync(tmp) }catch{} }
  return {name,what,out}
}
/* 하네스가 끝을 못 봤다(DONE 없음)는 것은 코드가 틀렸다는 뜻이 아니라
   크롬 여럿이 기계를 다투다 제 시간에 못 끝났다는 뜻일 때가 많다.
   세 번 중 한 번꼴로 그랬다 — 그때그때 다른 검사가 실패하는 것은
   없느니만 못하다. 아무도 안 믿게 되고, 결국 --no-verify 로 넘겨 버린다.
   끝을 못 본 것만 혼자 다시 돌려 판정한다. 문제를 찾아낸 것은 다시 안 돌린다 —
   진짜 실패를 재시도로 지워 버리면 안 된다. */
function unfinished(out){
  const m=out.match(/<pre id="TESTOUT"[^>]*>([\s\S]*?)<\/pre>/)
  return !/\bDONE\b/.test(m?m[1]:'')
}
/* 한꺼번에 열 개를 띄우면 서로 자원을 다투다 몇 개가 제 시간에 못 끝나고,
   멀쩡한 코드가 실패로 나온다 — 훅 안에서 실제로 다섯 건이 그렇게 났다.
   있는 코어의 절반만 쓴다. 그래도 차례로 도는 것보다 훨씬 빠르다. */
const LANES=Math.max(2,Math.min(4,Math.floor((cpus().length||4)/2)))
const picked=HARNESS.filter(h=>!only.length||only.includes(h[0]))
const results=new Array(picked.length)
let next=0
await Promise.all(Array.from({length:Math.min(LANES,picked.length)},async()=>{
  for(;;){ const i=next++; if(i>=picked.length) return; results[i]=await runOne(picked[i]) }
}))
/* 끝을 못 본 것들만 혼자, 넉넉한 시간으로 다시 */
for(let i=0;i<picked.length;i++){
  const r=results[i]
  if(r.missing||!unfinished(r.out||'')) continue
  const [name,rel,secs,what]=picked[i]
  console.log(`  ${name}: 끝을 못 봐서 혼자 다시 돌린다`)
  results[i]=await runOne([name,rel,Math.round(secs*1.6),what],'_retry')
}

let failed=0, failedText=0
for(const res of results){
  const {name,what}=res
  if(res.missing){ console.log(`  ${name}: 하네스가 없다`); failed++; continue }
  const out=res.out

  const m=out.match(/<pre id="TESTOUT"[^>]*>([\s\S]*?)<\/pre>/)
  const body=(m?m[1]:'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').trim()
  const done=/\bDONE\b/.test(body)
  const problems=body.split('\n').filter(l=>l.includes('[!]'))
  const tally=body.split('\n').filter(l=>/^===/.test(l.trim())).pop()||''
  /* 일을 하나도 안 하고 통과하는 검사가 가장 위험하다. 하네스 둘이 탭을 하나도
     안 밟은 채 "0건" 을 찍고 있던 적이 있다 — TAB_KEYS(단축키)를 switchTab(id) 에
     넘겨 조용히 되돌아나갔다. 그래서 하네스는 얼마나 일했는지도 COVER 줄에 적고,
     그 수가 0 이면 통과로 치지 않는다. */
  const cover=body.split('\n').filter(l=>/^\s*COVER\s/.test(l))
  const zero=[]
  for(const line of cover)
    for(const mm of line.matchAll(/([^\s=]+)=(\d+)/g)) if(+mm[2]===0) zero.push(mm[1])
  const ok=done&&problems.length===0&&zero.length===0
    &&!/[1-9]\d*건/.test(tally.replace(/0건/,''))
  console.log(`\n── ${name}  (${what})`)
  if(!done){ console.log('   [!] 도중에 멈췄다 — 아래는 마지막 출력'); }
  for(const l of body.split("\n").slice(-60)) if(l.trim()&&!/^\s*COVER\s/.test(l)) console.log('   '+l)
  for(const l of cover) console.log('   '+l.trim().replace(/^COVER/,'한 일:'))
  if(zero.length) console.log(`   [!] 일을 안 한 자리: ${zero.join(', ')} = 0`)
  if(!ok){ failed++; console.log(`   >>> 실패: done=${done} 문제=${problems.length} 안한일=${zero.length} tally="${tally}"`) }
}
failed+=failedText
console.log(failed?`\n검증 실패 ${failed}건`:'\n모든 검증 통과')
process.exit(failed?1:0)
