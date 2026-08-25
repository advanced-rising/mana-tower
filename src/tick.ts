import { PRODUCERS } from './producers'
import { flagTab } from './ui/tabs'
import { checkChallenge, exitChallenge } from './trials'
import { achToast } from './ui/dom'
import { DS, NM, X, icHTML } from './core'
import { ACHS } from './content'
import { LOG, S } from './state'
import { cntLog, curChal, logAdd, numLog, syncGen } from './num'
import { M, addManaLog, manaRateLog, recalc } from './multipliers'
import { FLOOR_MAX_STEPS, FLOOR_MIN_TIME, clearFloor, dungeonPowerLog, floorHPLog, sweepCount, sweepFloors } from './dungeon'
import { autoOK, runAutomation } from './automation'

/* ══════════════ 진행 ══════════════ */
export function tick(dt){
  const m=M(), d=dt*m.speed, ch=curChal();
  /* 생성도 로그로 — 곱하는 순간 넘치던 자리가 여기서 풀린다 */
  for(let i=PRODUCERS.length-1;i>=1;i--)
    S.genL[i-1]=logAdd(S.genL[i-1], cntLog(i)+numLog(PRODUCERS[i].rate)+m.tUpLog+numLog(d));
  syncGen();
  addManaLog(manaRateLog()+numLog(d));
  if(S.exploring&&!(ch&&ch.rule.noDungeon)){
    /* 진행도를 절대 피해량으로 쌓으면 깊은 층에서 ∞ 가 된다.
       공격력과 체력의 자릿수 차이만 보고 0~1 비율로 채운다. */
    /* 한 걸음이 화면에 머무는 시간은 게임 속도와 무관해야 한다. 예전에는
       쿨다운을 속도가 곱해진 시간으로 깎아서, 속도 배율이 커지면 한 틱에
       마흔 걸음이 몰렸고 승천 직후 0.5 초 만에 예전 최심층까지 되돌아갔다.
       진행도는 속도를 타되(d), 걸음 사이 간격은 실제 시간(dt)으로만 식는다. */
    const gap=dungeonPowerLog()-floorHPLog(S.floor);
    const per=gap>=8?1e8:(gap<=-300?0:Math.pow(10,gap));   // 초당 채우는 비율
    S.prog=Math.min(1,(S.prog||0)+per*d);
    S.floorCd=Math.max(0,(S.floorCd||0)-dt);
    if((S.floorCd||0)<=0&&S.prog>=1){
      S.prog=0; S.floorCd=FLOOR_MIN_TIME;
      sweepFloors(sweepCount());
      if(!autoOK('dungeon')) S.exploring=false;
    }
    S.prog=Math.max(0,Math.min(1,S.prog||0));
  }

  runAutomation(dt);
  if(ch){
    S.chalTime+=dt;
    // 15분 안에 못 깨면 승산이 없다고 보고 물러난다
    if(S.chalTime>900){
      log(`${icHTML('chain')}<b>${NM(ch.nm)}</b> ${X('철수','withdrawn')} · 아직 감당할 수 없다`,true);
      exitChallenge(true);
    }
  }else{
    S.chalTime=0;
    if(S.manaRun>S.bestRun) S.bestRun=S.manaRun;   // 파생값 기준 — 시련 도달 판정용
  }
  checkChallenge();
  S.chalCd=Math.max(0,(S.chalCd||0)-dt);
  S.playtime+=dt; S.sinceRebirth+=dt; S.sinceAscend+=dt; S.sinceTrans+=dt; S.sinceInf+=dt;
  /* 업적은 되돌아가는 것이 아니다 — 회차 값이 초기화돼도 기록은 그대로 둔다 */
  if(S.rebirths>(S.rebirthEver||0)) S.rebirthEver=S.rebirths;
  if(S.ascensions>(S.ascendEver||0)) S.ascendEver=S.ascensions;
  if(S.transcends>(S.transEver||0)) S.transEver=S.transcends;
  if(S.deepest>(S.deepestEver||0)) S.deepestEver=S.deepest;
  if(!(S.manaPeakL>=S.manaEverL)) S.manaPeakL=S.manaEverL;
  checkAchs();
  recalc();
}
export function checkAchs(){
  for(const a of ACHS) if(!S.achs[a.id]&&a.f()){
    S.achs[a.id]=1;
    const tier=ACHS.indexOf(a);
    achToast(NM(a.nm),DS(a)+X(' · 마나 생산 +2%',' · Mana output +2%'),tier<10?'medal_b':tier<20?'medal_s':'medal');
    log(`${icHTML('medal')}${X('업적','Feat')} <b class="gold">${NM(a.nm)}</b> ${X('달성 · 마나 생산 +2%','unlocked · Mana output +2%')}`,true);
    flagTab('ach');
  }
}
/* 층을 초당 스무 번 깨면 로그도 그만큼 쌓인다. 그때마다 패널을 통째로 다시 그리면
   저사양 기기에서 눈에 띄게 무거워진다. 쌓아 두었다가 한 번에 그린다. */
export let logDirty=false;
export function flushLog(){
  if(!logDirty) return;
  logDirty=false;
  const el=document.getElementById('dlog');
  if(el) el.innerHTML=LOG.map(l=>`<div class="${l.hl?'hl':''}">${l.html}</div>`).join('');
}
export function log(html,hl){
  LOG.unshift({html,hl}); if(LOG.length>80) LOG.pop();
  logDirty=true;
}
