/* 검증 하네스를 한 번에 돌린다.
   npm run verify 는 먼저 빌드하고 스모크를 지난 뒤에야 여기 온다 —
   빌드가 깨진 채로 옛 번들을 검사해 "통과" 라고 답한 적이 있다.
   검사는 지금 코드에 대해서만 뜻이 있다.
   각 하네스는 index.html 의 </body> 앞에 끼워 넣어져 실제 게임 위에서 돌고,
   결과를 <pre id="TESTOUT"> 에 적은 뒤 'DONE' 으로 끝낸다.
   'DONE' 이 없으면 도중에 죽은 것이므로 실패로 친다. */
import { execFile, spawn } from 'node:child_process'
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
  ['itemcurve',  'tools/itemcurve.html',  240, '아이템이 열리는 방식과 상한'],
  ['stalem',     'tools/stalem.html',     200, '배율 캐시가 낡는 자리'],
  ['resets',     'tools/resets.html',      60, '돌파가 그 앞의 재료를 지우는가'],
  ['updthrow',   'tools/updthrow.html',   300, '화면 갱신이 조용히 멈추는 자리'],
  ['invariants', 'tools/invariants.html', 500, '한 시간 플레이 불변식'],
  ['longrun',    'tools/longrun.html',    400, '하루를 굴려 벽이 생기는가'],
]
const only=process.argv.slice(2).filter(a=>!a.startsWith('-'))

let failed=0, failedText=0
/* 브라우저 안이 아니라 화면 자체를 보는 검사는 따로 돈다 */
if(!only.length){
  for(const args of [[],['--phone']]){
    const label=`\n── textscan${args.length?' (휴대폰)':''}  (글자가 안 나오는 자리)`
    /* 크롬이 여럿 뜬 뒤라 부팅이 늦어 결과를 못 읽는 일이 있다 — 한 번 더 준다.
       진짜로 글자 문제를 찾아낸 것은 다시 돌리지 않는다. */
    let last=''
    for(let attempt=0;attempt<2;attempt++){
      try{
        const r=await run('node',[ROOT+'scripts/textscan.mjs',...args],
          {cwd:ROOT,maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']})
        console.log(label)
        for(const l of r.stdout.split('\n')) if(l.trim()) console.log(l)
        last=''; break
      }catch(e){
        last=((e.stdout||'')+(e.stderr||''))
        if(/읽지 못했다/.test(last)&&attempt===0){ console.log(label+'  (다시 돌린다)'); continue }
        console.log(label)
        for(const l of last.split('\n')) if(l.trim()) console.log(l)
        failedText++; break
      }
    }
  }
}

/* 그림이 배경에 묻혀 있지 않은지는 브라우저 없이 파일에서 바로 본다 */
if(!only.length){
  console.log('\n── artscan  (그림이 배경에 묻힌 자리)')
  try{
    const r=await run('python3',[ROOT+'tools/artscan.py'],{cwd:ROOT,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']})
    for(const l of r.stdout.split('\n')) if(l.trim()) console.log(l)
  }catch(e){
    for(const l of ((e.stdout||'')+(e.stderr||'')).split('\n')) if(l.trim()) console.log(l)
    failedText++
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
  /* execFile 은 자식에게 이 프로세스의 stdin 을 물려준다. 백그라운드나 훅에서 돌면
     그 stdin 이 영영 안 닫히고, 크롬이 그걸 기다리며 CPU 0% 로 멈춰 선다 —
     아홉 개가 스무 남짓 분을 그렇게 서 있었다. spawn 으로 stdin 을 아예 없앤다.
     그래도 안 끝나면 시간을 재서 끊는다. 멈춘 검사는 실패보다 나쁘다. */
  const out=await new Promise(res=>{
    const ch=spawn(CHROME,['--headless','--disable-gpu','--no-sandbox',
      '--allow-file-access-from-files','--window-size=1400,1000',
      `--virtual-time-budget=${secs*1000}`,'--dump-dom','file://'+tmp],
      {stdio:['ignore','pipe','pipe']})
    let buf=''
    ch.stdout.on('data',d=>{ buf+=d; if(buf.length>256*1024*1024) ch.kill('SIGKILL') })
    ch.stderr.on('data',()=>{})
    /* 이 제한은 '가상 시간 예산' 이 아니라 '진짜로 멈춰 선 것' 만 잡으라고 있다.
       예산을 그대로 실제 시간으로 쓰면 기계가 바쁠 때 멀쩡한 검사가 잘려 나가
       재시도로 들어가고, 푸시가 십 분을 넘긴다 — 실제로 그렇게 세 개가 잘렸다.
       넉넉히 두 배 남짓 준다. 멈춘 것은 어차피 영영 안 끝난다. */
    const timer=setTimeout(()=>{ try{ ch.kill('SIGKILL') }catch{} }, Math.max(180,secs*2)*1000)
    ch.on('close',()=>{ clearTimeout(timer); res(buf) })
    ch.on('error',()=>{ clearTimeout(timer); res(buf) })
  })
  try{ unlinkSync(tmp) }catch{}
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
  const body=m?m[1]:''
  /* '__game 없음' 은 게임이 고장났다는 뜻이 아니라, 크롬 넷이 함께 뜨느라
     부팅이 하네스의 대기 시간보다 늦었다는 뜻이다 — 혼자 돌리면 잘 뜬다.
     끝을 못 본 것과 같이 취급해 다시 돌린다. 스모크가 이미 부팅을 따로 본다. */
  return !/\bDONE\b/.test(body) || /__game\s*없음/.test(body)
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
