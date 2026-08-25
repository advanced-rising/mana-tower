import { PRODUCERS } from './producers'
import { SAVE_KEY, X, icHTML } from './core'

import { S, newState, setLOG, setS } from './state'
import { fmt, fmtLog, fmtTime, genNum } from './num'
import { M, gather, recalc } from './multipliers'
import { logSub, numLog } from './dungeon'
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
export function load(){
  const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;
  try{
    setS(mergeState(dec(raw))); return true;
  }catch(e){console.error(e);toast(X('세이브를 읽지 못했습니다',"Could not read the save"));return false}
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
  /* manaPeakL 은 -Infinity 가 기본값인데 JSON 은 그것을 null 로 적는다 */
  const pk=(typeof s.manaPeakL==='number'&&!isNaN(s.manaPeakL))?s.manaPeakL:-Infinity;
  const ev=(typeof s.manaEverL==='number'&&!isNaN(s.manaEverL))?s.manaEverL:-Infinity;
  s.manaPeakL=Math.max(pk,ev);
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
    ${S.deepest>b.deep?`${icHTML('sword')} ${X('최심층','Deepest')} <b class="gold">${X(b.deep+'층 → '+S.deepest+'층','F'+b.deep+' → F'+S.deepest)}</b>`:''}
  `);
}
export function exportSave(){
  const blob=new Blob([enc(S)],{type:'text/plain'});
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
    setS(mergeState(o)); save(true); render();
    modal(X('불러오기 완료','Import complete'),X('세이브를 성공적으로 불러왔습니다.','The save was loaded successfully.'));
  }catch(e){modal(X('불러오기 실패','Import failed'),X('올바른 마탑 세이브 파일이 아닙니다.<br>','This is not a valid Tower of the Abyss save.<br>')+'<span class="dim">'+e.message+'</span>')}
}
export function hardReset(){
  localStorage.removeItem(SAVE_KEY); setS(newState()); setLOG([]); recalc(); render();
  toast(X('처음부터 다시 시작합니다',"Starting over"));
}
