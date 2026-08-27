/* 어디에 시간이 드는지 진짜 시계로 잰다.
   하네스는 --virtual-time-budget 아래서 도는데 그러면 performance.now() 가
   가상 시계라 전부 0 으로 읽힌다. 그래서 여기서는 가상 시간을 쓰지 않고,
   번들을 동기로 불러 load 이벤트가 뜨기 전에 측정을 끝낸다 —
   --dump-dom 이 그 결과를 그대로 가져온다. */
import { execFile } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { promisify } from 'node:util'
const run = promisify(execFile)
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ROOT=new URL('..',import.meta.url).pathname

const BENCH=`<pre id="PROF" style="display:none"></pre><script>
(function(){
var G=window.__game, out=[];
function ms(f,n){ var t=performance.now(); for(var i=0;i<n;i++) f(); return (performance.now()-t)/n }
function row(name,v,n){ out.push(name.padEnd(28)+v.toFixed(3).padStart(9)+' ms'+(n?'   ('+n+')':'')) }
if(!G){ document.getElementById('PROF').textContent='__game 없음'; return }
var S=G.S;
/* 후반부 상태를 만든다 — 항목을 전부 갖고 깊이 내려간 판 */
for(var i=0;i<G.RESEARCH.length;i++) S.research[G.RESEARCH[i].id]=1;
for(var i=0;i<G.RUNES.length;i++) S.runes[G.RUNES[i].id]=200;
for(var i=0;i<G.GEAR.length;i++) S.gear[G.GEAR[i].id]=150;
var sets=[[G.SOUL_UPS,'soulUps'],[G.RELIC_UPS,'relicUps'],[G.STAR_UPS,'starUps'],
          [G.INF_UPS,'infUps'],[G.ETER_UPS,'eterUps'],[G.REAL_UPS,'realUps'],
          [G.VOID_UPS,'voidUps'],[G.ORIGIN_UPS,'originUps']];
for(var i=0;i<sets.length;i++){ var a=sets[i][0]||[];
  for(var j=0;j<a.length;j++) S[sets[i][1]][a[j].id]=1e6 }
for(var i=0;i<G.PRODUCERS.length;i++) S.bought[i]=1e9;
S.deepest=S.deepestEver=8e10; S.floor=8e10; S.rebirths=S.rebirthEver=400;
G.addManaLog(4000); G.recalc();
var owned=0, stn=['research','runes','gear','soulUps','relicUps','starUps',
                  'infUps','eterUps','realUps','voidUps','originUps'];
for(var i=0;i<stn.length;i++) owned+=Object.keys(S[stn[i]]||{}).length;
out.push('가진 항목 '+owned+'개 · 시설 '+G.PRODUCERS.length+'종 · 깊이 8e10');
out.push('');
row('배율 접기 computeM()',  ms(function(){ G.computeM() },60));
row('서명 mSignature()',     ms(function(){ G.mSignature() },3000));
row('틱 tick(0.05)',         ms(function(){ G.tick(0.05) },600));
row('화면 갱신 refresh()',    ms(function(){ G.refresh() },200));
row('패널 다시 그리기 render()',ms(function(){ G.render() },40));
row('저장 save()',           ms(function(){ G.save() },40));
out.push('');
/* 탭마다 다시 그리는 값 — 화면이 무거우면 여기서 드러난다 */
out.push('탭'.padEnd(14)+'다시 그리기'.padStart(12)+'갱신'.padStart(10)+'  노드   이미지');
for(var i=0;i<G.TABS.length;i++){
  var t=G.TABS[i]; if(!t.open()) continue;
  G.switchTab(t.id);
  var rn=ms(function(){ G.render() },12), rf=ms(function(){ G.refresh() },60);
  var nodes=document.querySelectorAll('#main *').length,
      imgs=document.querySelectorAll('#main img').length;
  out.push(String(t.id).padEnd(14)+rn.toFixed(2).padStart(9)+'ms'+rf.toFixed(2).padStart(8)+'ms'
    +String(nodes).padStart(7)+String(imgs).padStart(8)
    +(rn>16.7?'   [!] 무겁다':''));
}
out.push('');
/* 세이브가 커지면 저장·불러오기가 프레임을 잡아먹는다 — 예전에 브라우저를 멈춘 자리다 */
try{
  var blob=G.enc(S);                     /* exportSave 는 파일을 내려받으므로 알맹이만 잰다 */
  out.push('세이브 크기 '+(blob.length/1024).toFixed(1)+'KB');
  row('직렬화 enc(S)',  ms(function(){ G.enc(S) },30));
  row('복원 dec()',     ms(function(){ G.dec(blob) },30));
  row('저장 localStorage', ms(function(){ G.save(true) },30));
}catch(e){ out.push('세이브 측정 실패: '+e.message) }
/* 오래 자리를 비웠다 돌아왔을 때 — 여기서 멈추면 화면이 통째로 얼어붙는다 */
try{
  var offs=[3600,86400,7*86400,30*86400];
  for(var i=0;i<offs.length;i++){
    (function(sec){
      var t=performance.now(); G.offlineCatchUp&&G.offlineCatchUp(sec);
      row('오프라인 복구 '+(sec/3600).toFixed(0)+'시간', performance.now()-t);
    })(offs[i]);
  }
}catch(e){ out.push('오프라인 측정 실패: '+e.message) }
out.push('');
/* render() 는 패널을 통째로 다시 만든다. 매 프레임 불리면 그것만으로 끊긴다. */
try{
  G.switchTab('ach');
  var rn=0, or_=G.render;
  window.__game.render=function(){ rn++; return or_.apply(null,arguments) };
  var t=performance.now(); while(performance.now()-t<1000){ G.tick(0.05); G.refresh() }
  window.__game.render=or_;
  out.push('1초 동안 render() 호출 '+rn+'회'+(rn>2?'   [!] 매 프레임 다시 만들고 있다':''));
}catch(e){ out.push('render 빈도 측정 실패: '+e.message) }
out.push('');
/* 한 프레임에 실제로 무엇이 도는가 — 게임은 0.05초마다 tick+refresh 를 한다 */
var frame=ms(function(){ G.tick(0.05); G.refresh() },200);
row('한 프레임 (tick+refresh)',frame);
out.push('  60fps 예산 16.7ms 대비 '+(frame/16.7*100).toFixed(0)+'%');
if(frame>16.7) out.push('  [!] 한 프레임이 예산을 넘는다 — 끊겨 보인다');
document.getElementById('PROF').textContent=out.join('\\n');
})();
<\/script>`

const html=readFileSync(ROOT+'index.html','utf8')
/* 미뤄서 붙이는 로더 대신 동기로 불러 온다 — load 전에 측정을 끝내야 시계가 진짜다 */
const body=html.replace(/<script id="gameScript"[^>]*><\/script>/,
  '<script src="dist/bundle.js"></script>')
const at=body.lastIndexOf('</body>')
const tmp=ROOT+'_prof.html'
writeFileSync(tmp, body.slice(0,at)+BENCH+body.slice(at))
let out=''
try{
  const r=await run(CHROME,['--headless','--disable-gpu','--no-sandbox',
    '--allow-file-access-from-files','--window-size=1400,1000','--dump-dom','file://'+tmp],
    {maxBuffer:256*1024*1024})
  out=r.stdout
}catch(e){ out=e.stdout||'' }
finally{ try{ unlinkSync(tmp) }catch{} }
const m=out.match(/<pre id="PROF"[^>]*>([\s\S]*?)<\/pre>/)
const txt=(m?m[1]:'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&')
console.log(txt.trim()||'(측정하지 못했다 — 번들이 동기로 뜨지 않았다)')
