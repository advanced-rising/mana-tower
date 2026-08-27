import { applyBgm, bgmOn, setChapterMusic, setVol, trackFor, TRACKS, unlockAudio, vol } from './audio'
import { chalUnlocked, checkChallenge, enterChallenge, exitChallenge } from './trials'
import { INF_LAYERS, buildAchievements } from './layers'
import { PRODUCERS } from './producers'
import { DS, DSF, LANG, NM, VERSION, X, ic, icHTML, setLang, spriteURL } from './core'
import { ACHS, BADGES, chalGoal, chalGoalLog, CHALLENGES, ETER_UPS, GEAR, INF_UPS, MILESTONES, ORIGIN_UPS, REAL_UPS, RELIC_UPS, RESEARCH, RUNES, SOUL_UPS, STAR_UPS, VOID_UPS } from './content'
import { S, setS } from './state'
import { achCount, bulkCostLog, bulkMaxLog, capFrom, chalTotal, cnt, cntLog, costLogAt, curL, cutTxt, everLogOf, fmt, fmtLog, freeFrom, freeRaw, freeStart, gainRes, gearTotal, geoSumLog, L10, logAdd, logSub, numLog, pctTxt, powTxt, ratioOf, RES, runeTotal, safeLog, setRes, spendRes, START_MANA_CAP, syncGen, syncRes, upCapFrom, upMaxOf } from './num'
import { addManaLog, buyProducer, computeM, costLogOf, effLevel, gather, gatherAmountLog, growth, M, manaRateLog, maxAfford, recalc, syncMana } from './multipliers'
import { COSMOS, FOES, chapterOf, chapterSeen, clearFloor, cosmos, cosmosBonusLog, dungeonPowerLog, floorHPLog, floorLoot, floorLootManaLog, foeOf, syncChapter } from './dungeon'
import { ASCEND_REQ, breakAmount, doAscend, doInfBreak, doRebirth, doTranscend, INF_STACK, infBonusLog, infGain, infUnlocked, offerGainLog, REBIRTH_REQ, relicGain, relicGainLog, reqFor, reqLog, softReset, soulGain, soulGainLog, starGain, starGainLog, TRANS_REQ, transUnlocked } from './prestige'
import { AUTO_DEF, AUTO_DEFS, autoBuyTree, autoOK, autoUnlocked, buyBulkLog, runAutomation } from './automation'
import { checkAchs, log, tick } from './tick'
import { $, modal, modalOpen } from './ui/dom'
import { TABS, TAB_KEYS, buildTabs, ensureTabs, switchTab, tabByKey, tabKeyOf, updaters } from './ui/tabs'
import { buildRes } from './ui/resbar'
import { refresh, render } from './ui/render'
import { crumb, dec, enc, exportSave, importSave, lastCrumb, load, mergeState, offlineCatchUp, safeMode, save, skippedSave } from './save'

/* ══════════════ 루프 & 입력 ══════════════ */
export let lastFrame=Date.now();
setInterval(()=>{
  const now=Date.now();
  let dt=(now-lastFrame)/1000; lastFrame=now;
  if(dt<0) dt=0;
  /* 탭이 묻히거나 기기가 잠들면 타이머가 아예 멈춘다. 깨어났을 때 그 간격을
     2 초로 잘라 버리면 그동안의 진행이 통째로 사라진다 — 자리를 비운 것으로
     치고 오프라인과 같은 상한 안에서 나눠 따라잡는다. */
  if(dt>10){
    const left=Math.min(dt, M().offline*3600);
    const steps=Math.min(140,Math.max(2,Math.ceil(left/60)));
    for(let i=0;i<steps;i++) tick(left/steps);
    S.lastTick=now;
    return;
  }
  if(dt>2) dt=2;
  tick(dt);
},50);
setInterval(refresh,100);
setInterval(()=>save(true),15000);
window.addEventListener('beforeunload',()=>save(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)save(true)});

document.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(e.target.tagName==='INPUT') return;
  if(modalOpen()) return;              // 창이 떠 있으면 글쇠는 창이 가져간다
  const k=e.key.toLowerCase();
  /* 열린 탭에 보이는 순서대로 1~9,0,Q…P 가 붙는다 */
  if(!['b','s'].includes(k)){
    const t=tabByKey(k);
    if(t){ switchTab(t.id); refresh(); return }
  }
  if(e.key===' '){e.preventDefault();gather();refresh();return}
  if(k==='b'){const o=[1,10,100,'max'];S.buyAmt=o[(o.indexOf(S.buyAmt)+1)%o.length];refresh()}
  if(k==='x'){S.exploring=!S.exploring;if(!S.exploring)S.prog=0;refresh()}   // 탐험 토글 (E 는 탭에 쓰인다)
  if(k==='s'){save()}
});
$('fileIn').addEventListener('change',ev=>{
  const f=ev.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>importSave(String(r.result));
  r.readAsText(f); ev.target.value='';
});

/* ══════════════ 시작 ══════════════ */
$('verTag').textContent='v'+VERSION;
$('langBtn').addEventListener('click',()=>setLang(LANG==='ko'?'en':'ko'));
document.documentElement.lang=LANG;
document.title=X('무한의 탑','Tower of Infinity');

{ // 파비콘도 직접 찍은 도트로
  const fav=document.querySelector('link[rel="icon"]')||document.createElement('link');
  fav.rel='icon'; fav.type='image/png'; fav.href=spriteURL('tower');
  document.head.appendChild(fav);
}
/* ══════════════ 개발용 손잡이 ══════════════
   번들이 IIFE 라 안쪽 이름이 밖에서 안 보인다. 콘솔에서 상태를 들여다보거나
   검증 하네스가 내부를 찔러 볼 수 있도록 하나만 창에 걸어 둔다. */
(window as any).__game = {
  get S(){ return S }, set S(v){ setS(v) },
  get updaters(){ return updaters },
  PRODUCERS, RESEARCH, RUNES, GEAR, SOUL_UPS, RELIC_UPS, STAR_UPS,
  INF_UPS, ETER_UPS, REAL_UPS, VOID_UPS, ORIGIN_UPS,
  CHALLENGES, ACHS, AUTO_DEFS, TABS, COSMOS, INF_LAYERS, FOES, BADGES,
  M, computeM, recalc, tick, tabKeyOf, tabByKey, TAB_KEYS, costLogOf, maxAfford, buyProducer, growth, refresh, render, switchTab, buildTabs, save, load,
  fmt, fmtLog, powTxt, cutTxt, pctTxt, NM, DS, DSF, X, ic, icHTML, spriteURL,
  foeOf, clearFloor, floorLoot, floorLootManaLog, floorHPLog,
  dungeonPowerLog, cnt, cntLog, syncGen, logAdd, logSub, geoSumLog, numLog, safeLog, L10,
  autoBuyTree, runAutomation, autoOK, autoUnlocked, AUTO_DEF, buyBulkLog,
  costLogAt, bulkCostLog, bulkMaxLog, curL, spendRes, gainRes, setRes, syncRes, RES, ratioOf,
  infGain, infUnlocked, doInfBreak, doRebirth, doAscend, doTranscend,
  achCount, runeTotal, gearTotal, chalTotal, chapterSeen, chapterOf, cosmos, cosmosBonusLog, infBonusLog, gatherAmountLog, manaRateLog,
  transUnlocked, starGain, starGainLog, relicGain, relicGainLog, soulGain, soulGainLog, offerGainLog, breakAmount, TRANS_REQ, ASCEND_REQ, REBIRTH_REQ,
  gather, addManaLog, syncMana, effLevel, START_MANA_CAP, freeStart, freeFrom, freeRaw, upMaxOf, upCapFrom, everLogOf, capFrom, softReset, checkAchs, MILESTONES, RESEARCH_ALL: RESEARCH,
  importSave, mergeState, load, offlineCatchUp, dec, enc, crumb, lastCrumb, exportSave, safeMode, skippedSave,
  enterChallenge, exitChallenge, checkChallenge, chalUnlocked, chalGoalLog, chalGoal,
  trackFor, TRACKS, bgmOn, vol, setVol, applyBgm, unlockAudio, setChapterMusic,
  INF_STACK, reqFor, reqLog,
}

/* 부팅이 어디서 터지든 남는 것은 흰 화면뿐이었다 — 무엇이 잘못됐는지도,
   세이브를 꺼낼 방법도 없다. 터진 자리를 화면에 적고, 세이브를 복사하거나
   지우고 다시 시작할 길을 준다. 게임을 못 여는 것보다 나쁜 건 없다. */
function bootFail(e){
  try{ console.error('boot',e) }catch(_){}
  let raw=''; try{ raw=localStorage.getItem('manaTowerSave2')||'' }catch(_){}
  const msg=(e&&(e.message||e))+'';
  const at=((e&&e.stack)||'').split('\n').slice(1,3).join(' / ');
  document.body.innerHTML=
    '<div style="max-width:640px;margin:40px auto;padding:20px;font:14px/1.7 system-ui,sans-serif;color:#ddd">'
    +'<h2 style="margin:0 0 10px">게임을 여는 중에 문제가 생겼습니다</h2>'
    +'<p style="color:#f88;word-break:break-all"><b>'+msg.replace(/[<>]/g,'')+'</b></p>'
    +'<p style="color:#888;font-size:12px;word-break:break-all">'+at.replace(/[<>]/g,'')+'</p>'
    +'<p>세이브는 아직 그대로 있습니다 ('+raw.length+'자). 먼저 <b>세이브 복사</b>를 눌러 어딘가에 붙여넣어 두세요.</p>'
    +'<p><button id="bfCopy" style="padding:8px 14px;margin-right:8px">세이브 복사</button>'
    +'<button id="bfWipe" style="padding:8px 14px">세이브 지우고 새로 시작</button></p>'
    +'<textarea id="bfRaw" readonly style="width:100%;height:120px;font:11px monospace">'+raw+'</textarea>'
    +'</div>';
  const c=document.getElementById('bfCopy'), w=document.getElementById('bfWipe');
  if(c) c.onclick=()=>{ const t=document.getElementById('bfRaw'); t.select();
    try{ document.execCommand('copy'); c.textContent='복사했습니다' }catch(_){ c.textContent='직접 선택해 복사해 주세요' } };
  if(w) w.onclick=()=>{ if(!confirm('세이브를 지우고 처음부터 시작합니다. 계속할까요?')) return;
    try{ localStorage.removeItem('manaTowerSave2') }catch(_){} location.reload() };
}
export function syncTopH(){
  document.documentElement.style.setProperty('--topH', $('top').offsetHeight+'px');
}
try{
crumb('시작');
buildAchievements(); crumb('업적 구성'); ensureTabs(); crumb('탭 구성');
recalc(); crumb('배율 계산'); buildRes(); crumb('재료 바'); syncChapter(true); crumb('장 표시');
/* 눌린 느낌 — :active 만으로는 손가락을 떼는 순간 사라져서, 빠르게 누르면
   아무 일도 없었던 것처럼 보인다. 누를 때 표시를 달아 두고 애니메이션이
   끝나면 뗀다. 버튼의 동작 자체에는 손대지 않는다(듣기만 하고 막지 않는다). */
/* 브라우저는 사람이 한 번 건드리기 전에는 소리를 내주지 않는다.
   첫 클릭이나 첫 글쇠에서 음악을 연다 — 한 번만 하고 스스로 물러난다. */
const _unlock=()=>{ unlockAudio();
  document.removeEventListener('pointerdown',_unlock,true);
  document.removeEventListener('keydown',_unlock,true); };
document.addEventListener('pointerdown',_unlock,true);
document.addEventListener('keydown',_unlock,true);

document.addEventListener('pointerdown',e=>{
  const b=(e.target as any)?.closest?.('button');
  if(!b||b.disabled) return;
  b.classList.remove('tapped');
  void (b as any).offsetWidth;         // 연달아 눌러도 다시 재생되도록 되감는다
  b.classList.add('tapped');
  setTimeout(()=>b.classList.remove('tapped'),400);   // 애니메이션 이벤트가 안 와도 반드시 뗀다
},{passive:true,capture:true});
document.addEventListener('animationend',e=>{
  const t=e.target as any;
  if(t&&t.classList&&t.classList.contains('tapped')&&e.animationName==='tapRing') t.classList.remove('tapped');
},true);
window.addEventListener('resize',syncTopH);
setTimeout(syncTopH,0); setInterval(syncTopH,2000);
const had=load(); crumb('세이브 읽기 '+(had?'있음':'없음'));
recalc(); crumb('세이브 뒤 배율');
if(had){ offlineCatchUp(); crumb('오프라인 보정'); }
else{
  log(icHTML('tower')+X('심연 위에 마탑을 세운다. 견습 마법사부터 불러들이자.','You raise a tower above the abyss. Summon an Apprentice Mage first.'),true);
  modal(`${icHTML('tower',16)} 무한의 탑`,`
    <b>견습 마법사</b>가 마나를 뽑아내고, 그 위 시설들이 아래 시설을 스스로 지어 올립니다.<br><br>
    처음에는 <b class="gold">직접</b> 해야 합니다. 마나를 채집하고, 시설을 올리고, 연구를 사고, 던전에 출격하고.<br>
    진행할수록 <b>자동화</b>가 하나씩 열립니다. 무엇이 언제 열리는지는 자동화 탭에서 볼 수 있습니다.<br><br>
    마나가 쌓이면 연구가 열리고, 던전 깊이가 곧 배율이 됩니다.
    한계에 닿으면 <b class="soul">환생</b>, 그 위에 <b class="relic">승천</b>, 다시 그 위에 <b>시련</b>이 기다립니다.
  `);
}
render(); crumb('그리기');
/* 여기까지 왔으면 화면이 다 그려졌다 — 정적 부팅 화면을 걷는다 */
const boot=document.getElementById('boot'); if(boot) boot.remove();
const prevCrumb=lastCrumb();                                 // 지우기 전에 읽어 둔다
try{ localStorage.removeItem('manaTowerBoot') }catch(e){}    // 무사히 떴으니 지운다
if(/[?&]safe=1/.test(location.search))
  modal('안전 모드', '세이브를 읽지 않고 열었습니다. 지금 보이는 진행은 새 게임입니다.<br>'
    +'설정 탭의 <b>세이브 내보내기</b>를 누르면 화면에 보이는 새 게임이 아니라 <b>원래 세이브</b>가 파일로 나갑니다.<br><br>'
    +'<span class="dim">직전 부팅이 멈춘 지점: <b>'+(prevCrumb||'기록 없음')+'</b></span>');
}catch(e){ bootFail(e) }

