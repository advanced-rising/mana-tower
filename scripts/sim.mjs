/* 장기 시뮬레이터를 돌린다 — 게임 시간 며칠치를 압축해서 굴리고,
   곡선이 어디서 멎는지 불변식이 어디서 깨지는지 본다.
   빠른 검사(npm run verify) 와 따로 두는 이유는 몇 분씩 걸리기 때문이다.
     npm run sim          3 일
     npm run sim -- 7     7 일  */
import { execFile } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { promisify } from 'node:util'
const run=promisify(execFile)
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT=new URL('..',import.meta.url).pathname
const days=+(process.argv[2]||3)
const html=readFileSync(ROOT+'index.html','utf8')
const at=html.lastIndexOf('</body>')
const tmp=ROOT+'_sim.html'
writeFileSync(tmp, html.slice(0,at)+readFileSync(ROOT+'tools/longrun.html','utf8')+html.slice(at))
const t0=Date.now()
let out=''
try{
  const r=await run(CHROME,['--headless','--disable-gpu','--no-sandbox','--allow-file-access-from-files',
    `--virtual-time-budget=${Math.max(600,days*300)*1000}`,'--dump-dom',`file://${tmp}?days=${days}`],
    {maxBuffer:256*1024*1024})
  out=r.stdout
}catch(e){ out=e.stdout||'' }
finally{ try{ unlinkSync(tmp) }catch{} }
const m=out.match(/<pre id="TESTOUT"[^>]*>([\s\S]*?)<\/pre>/)
const body=(m?m[1]:'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim()
console.log(body||'(출력 없음 — 시뮬이 끝나지 못했다)')
console.log(`\n실제로 걸린 시간 ${((Date.now()-t0)/1000).toFixed(1)}초`)
process.exit(/위반 0건/.test(body)?0:1)
