/* 글자가 안 나오는 자리를 찾는다.
   빈 라벨은 예외를 던지지 않는다 — 번들도 스모크도 멀쩡히 통과하고,
   화면에서만 조용히 비어 있다. 그래서 진짜로 띄워서 상자마다 들여다본다.
   보는 것: (1) 글자가 들어가야 할 상자가 비었는가
            (2) 글자가 배경과 같은 색인가
            (3) 상자가 좁아 글자가 잘려 나가는가 */
import { execFile } from 'node:child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { promisify } from 'node:util'
const run = promisify(execFile)

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT = new URL('..', import.meta.url).pathname
const WIDE = process.argv.includes('--phone') ? [390,844] : [1280,900]

const PROBE = `<pre id="TEXTOUT" style="display:none"></pre><script>
const TXT='t nm lab d c ttl sub tag req lv btn hd ttx name goal'.split(' ');
const rgb=s=>{const m=String(s).match(/[\\d.]+/g)||[0,0,0,1];return [+m[0],+m[1],+m[2],m[3]==null?1:+m[3]]};
const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};
  return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
function bgOf(e){for(let n=e;n;n=n.parentElement){const c=rgb(getComputedStyle(n).backgroundColor);
  if(c[3]>.5) return c} return [10,10,14,1]}
function scan(tab,out){
  for(const e of document.querySelectorAll('*')){
    const r=e.getBoundingClientRect();
    if(r.width<1||r.height<1) continue;
    const st=getComputedStyle(e);
    if(st.visibility==='hidden'||st.display==='none'||+st.opacity<.05) continue;
    const cls=(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className)||'';
    const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
    const wants=String(cls).split(/\\s+/).some(k=>TXT.includes(k))||e.tagName==='BUTTON';
    const kids=[...e.children].some(k=>k.textContent.trim());
    /* 1. 글자 자리가 비었다 */
    if(wants&&!own&&!kids&&!e.querySelector('img,svg,canvas,i'))
      out.push(tab+' | 빈 자리 | '+e.tagName.toLowerCase()+'.'+String(cls).replace(/\\s+/g,'.'));
    if(!own) continue;
    /* 2. 글자가 배경에 묻혔다 */
    const fg=rgb(st.color), bg=bgOf(e);
    if(fg[3]<.06) out.push(tab+' | 투명한 글자 | '+own.slice(0,24));
    else{ const a=lum(fg),b=lum(bg), ct=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      if(ct<1.35) out.push(tab+' | 배경에 묻힘 ct'+ct.toFixed(2)+' | '+own.slice(0,24)); }
    /* 3. 상자가 좁아 글자가 잘린다 */
    if(st.overflow!=='visible'&&e.scrollWidth>e.clientWidth+6&&st.overflowX!=='auto'&&st.overflowX!=='scroll')
      out.push(tab+' | 잘림 '+e.scrollWidth+'>'+e.clientWidth+' | '+own.slice(0,24));
    if(e.scrollHeight>e.clientHeight+6&&st.overflowY==='hidden')
      out.push(tab+' | 세로 잘림 | '+own.slice(0,24));
  }
}
setTimeout(()=>{
  const out=[], tabs=[...document.querySelectorAll('#tabs .tab')];
  if(!tabs.length) out.push('탭을 하나도 못 찾았다');
  let i=0;
  const step=()=>{
    if(i>=tabs.length){
      document.getElementById('TEXTOUT').textContent='@@'+out.join('\\n')+'\\n@@탭 '+tabs.length+'개';
      return;
    }
    const t=tabs[i++]; t.click();
    setTimeout(()=>{ scan((t.textContent||'?').trim().slice(0,10), out); step() },120);
  };
  step();
},2500)
</script>`

const html = readFileSync(ROOT+'index.html','utf8')
const end = html.lastIndexOf('</body>')
const tmp = ROOT+'_textscan.html'
writeFileSync(tmp, html.slice(0,end)+PROBE+html.slice(end))
let out=''
try{
  const r = await run(CHROME, ['--headless','--disable-gpu','--no-sandbox',
    `--window-size=${WIDE[0]},${WIDE[1]}`,'--allow-file-access-from-files',
    '--virtual-time-budget=40000','--dump-dom','file://'+tmp], {maxBuffer:64*1024*1024})
  out=r.stdout
}catch(e){ out=e.stdout||'' }
finally{ try{ unlinkSync(tmp) }catch{} }

const m = out.match(/<pre id="TEXTOUT"[^>]*>@@([\s\S]*?)<\/pre>/)
if(!m){ console.error('  textscan: 결과를 읽지 못했다'); process.exit(1) }
const de = s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
const lines = de(m[1]).split('\n').filter(Boolean)
const tail = lines.filter(l=>l.startsWith('@@')).join(' ')
const bad = lines.filter(l=>!l.startsWith('@@'))
const seen=new Map()
for(const b of bad) seen.set(b,(seen.get(b)||0)+1)
console.log(`   === ${tail.replace('@@','')} · 글자 문제 ${seen.size}건 ===`)
for(const [k,n] of [...seen].slice(0,40)) console.log('   '+k+(n>1?`  ×${n}`:''))
process.exit(seen.size?1:0)
