import { INF_LAYERS, buildAchievements } from './layers'
import { PRODUCERS } from './producers'
import { DS, DSF, LANG, NM, VERSION, X, ic, icHTML, setLang, spriteURL } from './core'
import { ACHS, BADGES, CHALLENGES, ETER_UPS, GEAR, INF_UPS, ORIGIN_UPS, REAL_UPS, RELIC_UPS, RESEARCH, RUNES, SOUL_UPS, STAR_UPS, VOID_UPS } from './content'
import { S, setS } from './state'
import { L10, RES, achCount, bulkCostLog, bulkMaxLog, chalTotal, cnt, cntLog, costLogAt, curL, cutTxt, fmt, fmtLog, gainRes, gearTotal, geoSumLog, logAdd, logSub, numLog, pctTxt, powTxt, ratioOf, runeTotal, safeLog, setRes, spendRes, syncGen, syncRes } from './num'
import { M, buyProducer, computeM, costLogOf, gather, gatherAmountLog, growth, manaRateLog, maxAfford, recalc } from './multipliers'
import { COSMOS, FOES, chapterOf, chapterSeen, clearFloor, cosmos, cosmosBonusLog, dungeonPowerLog, floorHPLog, floorLoot, floorLootManaLog, foeOf, sweepCount, sweepFloors, sweepPace, syncChapter } from './dungeon'
import { ASCEND_REQ, TRANS_REQ, doAscend, doInfBreak, doRebirth, doTranscend, infBonusLog, infGain, infUnlocked, relicGain, relicGainLog, soulGain, starGain, starGainLog, transUnlocked } from './prestige'
import { AUTO_DEF, AUTO_DEFS, autoBuyTree, autoOK, autoUnlocked, buyBulkLog, runAutomation } from './automation'
import { log, tick } from './tick'
import { $, modal, modalOpen } from './ui/dom'
import { TABS, TAB_KEYS, buildTabs, ensureTabs, switchTab, tabByKey, tabKeyOf, updaters } from './ui/tabs'
import { buildRes } from './ui/resbar'
import { refresh, render } from './ui/render'
import { importSave, load, offlineCatchUp, save } from './save'

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
buildAchievements(); ensureTabs(); recalc(); buildRes(); syncChapter(true);
export function syncTopH(){
  document.documentElement.style.setProperty('--topH', $('top').offsetHeight+'px');
}
window.addEventListener('resize',syncTopH);
setTimeout(syncTopH,0); setInterval(syncTopH,2000);
export const had=load();
recalc();
if(had) offlineCatchUp();
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
render();

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
  foeOf, sweepCount, sweepPace, sweepFloors, clearFloor, floorLoot, floorLootManaLog, floorHPLog,
  dungeonPowerLog, cnt, cntLog, syncGen, logAdd, logSub, geoSumLog, numLog, safeLog, L10,
  autoBuyTree, runAutomation, autoOK, autoUnlocked, AUTO_DEF, buyBulkLog,
  costLogAt, bulkCostLog, bulkMaxLog, curL, spendRes, gainRes, setRes, syncRes, RES, ratioOf,
  infGain, infUnlocked, doInfBreak, doRebirth, doAscend, doTranscend,
  achCount, runeTotal, gearTotal, chalTotal, chapterSeen, chapterOf, cosmos, cosmosBonusLog, infBonusLog, gatherAmountLog, manaRateLog,
  transUnlocked, starGain, starGainLog, relicGain, relicGainLog, soulGain, TRANS_REQ, ASCEND_REQ,
}
