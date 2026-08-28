import { PRODUCERS } from './producers'
import { flagTab } from './ui/tabs'
import { checkChallenge, exitChallenge } from './trials'
import { achToast } from './ui/dom'
import { DS, NM, X, icHTML } from './core'
import { ACHS } from './content'
import { LOG, S } from './state'
import { cntLog, curChal, logAdd, numLog, syncGen } from './num'
import { M, addManaLog, invalidateM, manaRateLog, mSignature, recalc, syncMana } from './multipliers'
import { notePeaks } from './num'
import { clearFloor, dungeonPowerLog, floorHPLog, floorPace, isRetread, retreadSteps } from './dungeon'
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
    /* 기록 아래의 층은 이미 이긴 곳이다 — 다시 싸우지 않는다.
       프레스티지로 공격력이 0 이 된 채로 다시 싸우게 두면, 되밟기가 아니라
       처음부터 다시 오르는 것이 된다(실제로 90 층 언저리에서 막혔다).
       걸음의 속도만 남기고 전투는 건너뛴다. */
    if(isRetread(S.floor)){
      /* 이미 깬 구간은 싸우지 않고 지나간다. 한 틱에 한 층씩이면 기록이 깊을수록
         돌아가는 데만 몇 분씩 걸리므로, 이 구간만 걸음을 넓혀 시간을 일정하게 둔다.
         전리품이 없어 아무것도 불어나지 않는다. */
      let steps=retreadSteps(dt);
      while(steps-->0&&isRetread(S.floor)) clearFloor(0);
      S.prog=0; S.floorCd=0;
      if(!isRetread(S.floor)) recalc();     // 최전선에 닿았을 때 한 번만 다시 잰다
    }else{
      const gap=dungeonPowerLog()-floorHPLog(S.floor);
      const per=gap>=8?1e8:(gap<=-300?0:Math.pow(10,gap));   // 초당 채우는 비율
      S.prog=Math.min(1,(S.prog||0)+per*d);
    }
    S.floorCd=Math.max(0,(S.floorCd||0)-dt);
    if(!isRetread(S.floor)&&(S.floorCd||0)<=0&&S.prog>=1){
      S.prog=0; S.floorCd=floorPace();
      clearFloor(1);                       // 최전선은 한 번에 한 층.
      /* 예전에는 한 층을 깨면 탐험이 꺼졌다 — '연속 탐험' 자동화를 열기 전까지는
         한 층마다 다시 눌러야 했다. 던전은 층수가 초기화되지 않고 계속 도전하는
         곳이므로, 한 번 내려가기 시작하면 멈추라고 할 때까지 계속 내려간다. */
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
    /* 파생값으로 재면 1e308 위에서 둘 다 ∞ 가 되어 기록이 멈춘다 */
    if(!(S.bestRunL>=S.manaRunL)) S.bestRunL=S.manaRunL;
    /* 승천·초월의 조건도 여태 낸 최고치를 따라간다 — 그 최고치를 여기서 기른다 */
    if(!(S.bestAscL>=S.soulAscL)) S.bestAscL=S.soulAscL;
    if(!(S.bestTransL>=S.relicTransL)) S.bestTransL=S.relicTransL;
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
  /* 예전에는 여기서 조건 없이 recalc() 를 불렀다. 후반부에는 한 프레임마다
     강화·연구·장비 548 항목을 전부 다시 접어 초당 삼만 번을 넘겼다 — 화면이
     끊기고 세이브를 여는 데 한참 걸리던 것이 이것이었다.
     시설·강화·프레스티지·층 돌파는 저마다 그 자리에서 이미 recalc() 를 부르고,
     업적은 checkAchs() 가 낡았다고 표시한다. 여기서는 그 밖의 입력이 바뀐
     프레임에만 다시 잰다. 파생값(S.mana 등)은 값이 싸므로 늘 맞춰 둔다. */
  syncMana();
  notePeaks();          // 상한이 기대는 기록 — 어떤 돌파도 이것만은 못 지운다
  const sig=mSignature();
  if(sig!==lastSig){ lastSig=sig; recalc(); }
}
let lastSig='';
export function checkAchs(){
  for(const a of ACHS) if(!S.achs[a.id]&&a.f()){
    S.achs[a.id]=1;
    invalidateM();                       // 업적 하나마다 마나 생산 +2%

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
