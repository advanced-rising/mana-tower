import { ETER_UPS, GEAR, INF_UPS, ORIGIN_UPS, REAL_UPS, RELIC_UPS, RUNES, SOUL_UPS, STAR_UPS, VOID_UPS , matOf} from './content'
import { PRODUCERS } from './producers'
import { SAVE_KEY, X, icHTML } from './core'

import { S, newState, setLOG, setS } from './state'
import { fmt, fmtLog, fmtTime, genNum, logSub, numLog, upMaxOf } from './num'
import { M, gather, recalc } from './multipliers'

import { tick } from './tick'
import { modal, toast } from './ui/dom'
import { render } from './ui/render'

/* ══════════════ 세이브 ══════════════ */
export const enc=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o))));
export const dec=s=>JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
export function save(quiet){
  S.lastTick=Date.now();
  try{localStorage.setItem(SAVE_KEY,enc(S)); if(!quiet)toast(X('저장했습니다',"Saved")); return true}
  catch(e){toast(X('저장 실패: ','Save failed: ')+e.message); return false}
}
/* 부팅 도중 어디까지 갔는지 남긴다. 메인 스레드가 멈춰 버리면 화면도 콘솔도
   아무 말을 못 하므로, 멈추기 '전에' 적어 둔 것만이 단서가 된다. */
export function crumb(where){
  try{ localStorage.setItem('manaTowerBoot', where+' @ '+new Date().toISOString()) }catch(e){}
}
export function lastCrumb(){
  try{ return localStorage.getItem('manaTowerBoot')||'' }catch(e){ return '' }
}
/* 안전 모드에서 건너뛴 세이브를 그대로 들고 있는다 — 내보내기가 새 게임이 아니라
   원래 진행을 파일로 써야 하기 때문이다. 안 그러면 구하러 들어가서 빈 파일을 얻는다. */
let skipped='';
export function safeMode(){ try{ return /[?&]safe=1/.test(location.search) }catch(e){ return false } }
export function skippedSave(){ return skipped }
export function load(){
  /* ?safe=1 로 열면 세이브를 건드리지 않는다. 세이브가 게임을 멈추게 만들 때
     들어가서 내보내기라도 할 수 있는 유일한 문이다. */
  if(safeMode()){
    try{ skipped=localStorage.getItem(SAVE_KEY)||'' }catch(e){ skipped='' }
    return false;
  }
  const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;
  try{
    setS(mergeState(dec(raw))); clampToCaps(); return true;
  }catch(e){console.error(e);toast(X('세이브를 읽지 못했습니다',"Could not read the save"));return false}
}
/* 새 상한보다 높이 쌓인 레벨을 상한에 맞춘다.
   상한은 '더 사는 것' 만 막으므로, 상한이 생기기 전에 저장된 룬 2.85e14 레벨 같은
   값은 그대로 남아 배율도 그대로다 — 프레스티지를 해도 마나가 즉시 꼭대기로
   돌아오던 것이 그 때문이었다. 불러올 때 한 번 맞춰 준다. */
/* 강화 트리와 그 화폐 이름 */
export const TREES=()=>[
  [SOUL_UPS,'soulUps','soul'], [RELIC_UPS,'relicUps','relic'], [STAR_UPS,'starUps','star'],
  [INF_UPS,'infUps','inf'], [ETER_UPS,'eterUps','eter'], [REAL_UPS,'realUps','real'],
  [VOID_UPS,'voidUps','void'], [ORIGIN_UPS,'originUps','origin'],
];
export function clampToCaps(){
  recalc();
  const rc=Math.floor(M().runeCap), gc=Math.floor(M().gearCap);
  let n=0;
  for(const r of RUNES){ const l=S.runes[r.id]||0; if(l>rc){ S.runes[r.id]=rc; n++ } }
  for(const g of GEAR){ const l=S.gear[g.id]||0; if(l>gc){ S.gear[g.id]=gc; n++ } }
  /* 강화 트리도 마찬가지다 — 상한이 생기기 전에 쌓인 레벨은 그대로 남는다 */
  for(const [defs,store,cur] of TREES()){
    const st=S[store]; if(!st) continue;
    for(const u of defs){
      const l=st[u.id]||0, lim=upMaxOf(u,matOf(u,cur));
      if(l>lim){ st[u.id]=lim; n++ }
    }
  }
  if(n) recalc();
  return n;
}
export function mergeState(o){
  const base=newState(), s=Object.assign(base,o);
  for(const k of ['bought','gen']){        // 단계가 늘어난 세이브도 진행을 잃지 않게 길이만 맞춘다
    if(!Array.isArray(s[k])) s[k]=[];
    while(s[k].length<PRODUCERS.length) s[k].push(0);
    s[k].length=PRODUCERS.length;
    for(let i=0;i<s[k].length;i++) if(typeof s[k][i]!=='number'||isNaN(s[k][i])) s[k][i]=0;
  }
  /* 시설 수도 자릿수 필드가 진실이다. 유한한 자릿수가 실려 있을 때만 그것을 믿고,
     없거나 망가졌으면(옛 세이브, JSON 이 null 로 적은 -Infinity) 평범한 수에서 다시 만든다. */
  if(!Array.isArray(s.genL)) s.genL=[];
  s.genL.length=PRODUCERS.length;
  for(let i=0;i<PRODUCERS.length;i++){
    const v=s.genL[i];
    s.genL[i]=(typeof v==='number'&&isFinite(v))?v:numLog(s.gen[i]);
  }
  s.rebirthEver=Math.max(s.rebirthEver||0, s.rebirths||0);   // 옛 세이브 보정
  s.ascendEver =Math.max(s.ascendEver ||0, s.ascensions||0);
  s.transEver  =Math.max(s.transEver  ||0, s.transcends||0);
  s.deepestEver=Math.max(s.deepestEver||0, s.deepest||0);
  /* 누적 기록은 나중에 들어온 필드다. 옛 세이브는 그것이 없어서 불러올 때
     그 시점의 회차 값에서 다시 시작했고, "환생 100회" 같은 업적이 이미
     달성돼 있는데도 조건이 다시 거짓이 되었다. 업적은 되돌아가지 않는 것이므로
     이미 딴 업적이 보증하는 만큼을 거꾸로 채워 넣는다. */
  const got=s.achs||{};
  const atLeast=(pre,cur)=>{
    let best=0;
    for(const k in got){ if(!got[k]||!k.startsWith(pre)) continue;
      const n=parseFloat(k.slice(pre.length)); if(isFinite(n)&&n>best) best=n; }
    return Math.max(cur||0,best);
  };
  s.rebirthEver=atLeast('rx',s.rebirthEver);
  s.ascendEver =atLeast('ax',s.ascendEver);
  s.transEver  =atLeast('tx',s.transEver);
  s.deepestEver=atLeast('dx',s.deepestEver);
  if(got.h11) s.rebirthEver=Math.max(s.rebirthEver,1);
  if(got.h12) s.rebirthEver=Math.max(s.rebirthEver,25);
  if(got.h13) s.rebirthEver=Math.max(s.rebirthEver,100);
  if(got.h14) s.ascendEver =Math.max(s.ascendEver,1);
  if(got.h15) s.ascendEver =Math.max(s.ascendEver,10);
  if(got.h16) s.deepestEver=Math.max(s.deepestEver,10);
  if(got.h17) s.deepestEver=Math.max(s.deepestEver,30);
  if(got.h18) s.deepestEver=Math.max(s.deepestEver,75);
  /* manaPeakL 은 -Infinity 가 기본값인데 JSON 은 그것을 null 로 적는다 */
  const pk=(typeof s.manaPeakL==='number'&&!isNaN(s.manaPeakL))?s.manaPeakL:-Infinity;
  const ev=(typeof s.manaEverL==='number'&&!isNaN(s.manaEverL))?s.manaEverL:-Infinity;
  s.manaPeakL=Math.max(pk,ev);
  /* 화폐도 자릿수가 진실이 되었다. 옛 세이브는 그 값이 없으니 평범한 수에서
     만들어 주고, 이미 자릿수가 실려 있으면 둘 중 큰 쪽을 믿는다. */
  for(const [k,e] of [['soul','soulEver'],['relic','relicEver'],['star','starEver'],
                      ['crystal','crystalEver'],['offering','offerEver'],
                      ['soulAsc','relicTrans']]){
    for(const f of [k,e]){
      const L=f+'L', have=s[L];
      const fromNum=(typeof s[f]==='number'&&s[f]>0)?(isFinite(s[f])?Math.log10(s[f]):308):-Infinity;
      s[L]=(typeof have==='number'&&!isNaN(have))?Math.max(have,fromNum):fromNum;
      s[f]=s[L]<308?Math.pow(10,s[L]):Infinity;
    }
  }  for(const f of ['lastSoulGain','lastRelicGain','lastStarGain']){
    const L=f+'L', have=s[L];
    const fromNum=(typeof s[f]==='number'&&s[f]>0)?(isFinite(s[f])?Math.log10(s[f]):308):-Infinity;
    s[L]=(typeof have==='number'&&!isNaN(have))?Math.max(have,fromNum):fromNum;
  }

  for(const k in got){ if(!got[k]||!k.startsWith('mx')) continue;
    const e=parseFloat(k.slice(2)); if(isFinite(e)&&e>s.manaPeakL) s.manaPeakL=e; }
  if(got.h2) s.manaPeakL=Math.max(s.manaPeakL,3);
  if(got.h3) s.manaPeakL=Math.max(s.manaPeakL,6);
  if(got.h4) s.manaPeakL=Math.max(s.manaPeakL,12);
  if(got.h5) s.manaPeakL=Math.max(s.manaPeakL,20);
  if(got.h6) s.manaPeakL=Math.max(s.manaPeakL,40);
  for(const k of ['research','runes','gear','soulUps','relicUps','starUps','infUps','eterUps','realUps','voidUps','originUps','achs','chalDone','autoUnlocked'])
    if(!s[k]||typeof s[k]!=='object') s[k]={};
  for(const k of ['mana','manaRun','manaEver','offering','offerEver','crystal','crystalEver',
                  'soul','soulAsc','soulEver','relic','relicEver','relicTrans','star','starEver',
                  'chalCd','chalTime','floorCd','sinceInf'])
    if(typeof s[k]!=='number'||isNaN(s[k])) s[k]=0;   // 망가진 값만 되돌린다. 무한대는 돌파 조건이므로 살려 둔다.
  /* 마나는 자릿수 필드가 진실이다. 로그 필드가 있으면 그것을 쓰고, 없는 옛 세이브는 평범한 수에서 만든다.
     -Infinity 는 JSON 에서 null 이 되므로 되돌아올 때 여기서 다시 세운다. */
  for(const k of ['mana','manaRun','manaEver']){
    const lk=k+'L'; const v=s[lk];
    /* 유한한 자릿수가 실려 있을 때만 그것을 믿는다.
       옛 세이브에는 아예 없고(=newState 의 -Infinity 가 남는다), JSON 은 -Infinity 를 null 로 적는다. */
    s[lk]=(typeof v==='number'&&isFinite(v))?v:numLog(o?o[k]:0);
  }
  for(let i=0;i<PRODUCERS.length;i++) s.gen[i]=genNum(s.genL[i]);   // 파생값을 자릿수에 맞춘다
  s.auto=Object.assign(newState().auto,o.auto||{});
  s.timers=Object.assign({build:0,research:0,rune:0,gear:0,gather:0},o.timers||{});
  return s;
}
export function offlineCatchUp(){
  recalc();
  const cap=M().offline*3600;
  const dt=Math.min(cap,Math.max(0,(Date.now()-(S.lastTick||Date.now()))/1000));
  if(dt<60) return;
  const b={manaL:S.manaL,soul:S.soulEver,deep:S.deepest,reb:S.rebirths,cry:S.crystalEver};
  const steps=140;
  for(let i=0;i<steps;i++) tick(dt/steps);
  modal(`${icHTML('moon',16)} ${X('자리를 비운 사이','While you were away')}`,`
    ${X('경과','Away')} <b>${fmtTime(dt)}</b> <span class="dim">(${X('상한','cap')} ${fmtTime(cap)})</span><br>
    ${icHTML('mana')} ${X('마나','Mana')} <b class="mana">+${fmtLog(logSub(S.manaL,b.manaL))}</b><br>
    ${icHTML('crystal')} ${X('결정','Crystals')} <b class="crystal">+${fmt(S.crystalEver-b.cry)}</b><br>
    ${icHTML('soul')} ${X('영혼석','Soul Shards')} <b class="soul">+${fmt(S.soulEver-b.soul)}</b> <span class="dim">(${X(`환생 ${S.rebirths-b.reb}회`,`${S.rebirths-b.reb} rebirths`)})</span><br>
    ${S.deepest>b.deep?`${icHTML('sword')} ${X('최심층','Deepest')} <b class="gold">${X(fmt(b.deep)+'층 → '+fmt(S.deepest)+'층','F'+fmt(b.deep)+' → F'+fmt(S.deepest))}</b>`:''}
  `);
}
export function exportSave(){
  /* 안전 모드에서는 화면에 보이는 새 게임이 아니라, 건너뛴 원래 세이브를 내보낸다 */
  const body=(safeMode()&&skipped)?skipped:enc(S);
  const blob=new Blob([body],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  const t=new Date(),p=n=>String(n).padStart(2,'0');
  a.download=`마탑-세이브-${t.getFullYear()}${p(t.getMonth()+1)}${p(t.getDate())}-${p(t.getHours())}${p(t.getMinutes())}.txt`;
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast(X('세이브를 내보냈습니다',"Save exported"));
}
export function importSave(txt){
  try{
    const o=dec(txt);
    if(typeof o!=='object'||!('mana' in o)) throw new Error('형식이 다릅니다');
    setS(mergeState(o)); clampToCaps(); save(true); render();
    modal(X('불러오기 완료','Import complete'),X('세이브를 성공적으로 불러왔습니다.','The save was loaded successfully.'));
  }catch(e){modal(X('불러오기 실패','Import failed'),X('올바른 마탑 세이브 파일이 아닙니다.<br>','This is not a valid Tower of the Abyss save.<br>')+'<span class="dim">'+e.message+'</span>')}
}
export function hardReset(){
  localStorage.removeItem(SAVE_KEY); setS(newState()); setLOG([]); recalc(); render();
  toast(X('처음부터 다시 시작합니다',"Starting over"));
}
