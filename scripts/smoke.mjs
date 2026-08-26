/* 페이지가 실제로 뜨는지 본다.
   esbuild 는 모르는 이름을 전역 참조로 두고 조용히 넘어간다. main.ts 에서
   import 를 빠뜨리면 번들은 멀쩡히 만들어지지만 첫 줄에서 ReferenceError 가
   나고 화면이 죽는다 — 빌드도 타입 검사도 이걸 못 잡았다.
   그래서 진짜로 한 번 띄워 보고 __game 이 걸렸는지 확인한다. */
import { execFile } from 'node:child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { promisify } from 'node:util'
const run = promisify(execFile)

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT = new URL('..', import.meta.url).pathname
const PROBE = `<script>window.__errs=[];addEventListener('error',e=>window.__errs.push(
  (e.message||e.type)+' @ '+String(e.filename||'').split('/').pop()+':'+e.lineno),true)</script>`
const REPORT = `<pre id="SMOKE" style="display:none"></pre><script>setTimeout(()=>{
  document.getElementById('SMOKE').textContent =
    (window.__game?'BOOT_OK':'BOOT_FAIL')+'|'+(window.__errs||[]).join(' ;; ');
},1200)</script>`

const html = readFileSync(ROOT+'index.html','utf8')
const at = html.indexOf('<script src="dist/bundle.js')
const end = html.lastIndexOf('</body>')
if (at < 0 || end < 0) { console.error('  스모크: index.html 모양이 예상과 다르다'); process.exit(1) }
const tmp = ROOT+'_smoke.html'
writeFileSync(tmp, html.slice(0,at)+PROBE+html.slice(at,end)+REPORT+html.slice(end))

let out=''
try{
  const r = await run(CHROME, ['--headless','--disable-gpu','--no-sandbox',
    '--allow-file-access-from-files','--virtual-time-budget=15000',
    '--dump-dom','file://'+tmp], {maxBuffer:64*1024*1024})
  out = r.stdout
}catch(e){ out = e.stdout||'' }
finally{ try{ unlinkSync(tmp) }catch{} }

const m = out.match(/<pre id="SMOKE"[^>]*>([\s\S]*?)<\/pre>/)
if(!m){ console.error('  스모크: 결과를 읽지 못했다 (크롬이 없거나 페이지가 멈췄다)'); process.exit(1) }
const [state, errs] = m[1].split('|')
if(state !== 'BOOT_OK'){
  console.error('  스모크 실패: 페이지가 뜨지 않는다')
  for(const e of (errs||'').split(' ;; ').filter(Boolean)) console.error('    '+e.replace(/&quot;/g,'"').replace(/&amp;/g,'&'))
  process.exit(1)
}
if(errs && errs.trim()){
  console.error('  스모크 실패: 콘솔 오류')
  for(const e of errs.split(' ;; ').filter(Boolean)) console.error('    '+e)
  process.exit(1)
}
console.log('  smoke: 페이지가 뜨고 콘솔 오류 없음')
