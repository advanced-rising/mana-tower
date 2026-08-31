import { recalc } from './multipliers'

import { NM, X, icHTML } from './core'
import { chalGoal, chalGoalLog, chalPenaltyLog, CHALLENGES } from './content'
import { S } from './state'
import { L10, chalTotal, curChal, fmt, fmtLog, numLog } from './num'
import { softReset } from './prestige'
import { autoOK } from './automation'
import { log } from './tick'
import { achToast, toast } from './ui/dom'

/* ══════════════ 도전 ══════════════ */
export const chalUnlocked=()=>(S.ascendEver||S.ascensions)>=1||chalTotal()>0;
/* 시련은 돌파를 지날 때마다 열린다 — 스무 개가 승천 한 번에 쏟아지면
   무엇이 새로 생겼는지 알 수가 없고, 위 계층에는 아무 일도 일어나지 않는다. */
export function chalOpen(ch){
  switch(ch.at){
    case 'trans':  return (S.transEver||S.transcends)>=1;
    case 'inf':    return (S.infEver||0)>0;
    case 'eter':   return (S.eterEver||0)>0;
    case 'real':   return (S.realEver||0)>0;
    case 'void':   return (S.voidEver||0)>0;
    case 'origin': return (S.originEver||0)>0;
    default:       return chalUnlocked();
  }
}
export function enterChallenge(id){
  const ch=CHALLENGES.find(c=>c.id===id);
  if(!ch||!chalUnlocked()) return;
  if((S.chalDone[id]||0)>=ch.max) return;
  if(!chalOpen(ch)) return;
  S.chal=id; S.chalTime=0;
  sealDungeon();
  softReset();
  /* 목표는 '들어온 뒤' 의 값으로 한 번만 못박는다.
     밖의 생산에서 시련이 빼앗을 몫을 빼는 식으로 추정해 봤는데, 규칙마다 실제로
     깎이는 양이 달라 번번이 어긋났다 — 어떤 시련은 첫 틱에 깨지고 어떤 시련은
     열다섯 분을 굴려도 못 깼다. 추정할 것 없이 여기서 재면 된다.
     softReset 이 방금 배율을 다시 접었으니 S.rate1L 은 이 시련의 제약 아래
     실제로 벌 수 있는 속도다. 매 틱 다시 재지는 않는다 — 그러면 견딜수록
     목표가 내려가 시련이 아니게 된다. */
  S.chalGoalL=chalGoalLog(ch,S.chalDone[id]||0);
  log(`${icHTML('chain')}<b>${NM(ch.nm)}</b> ${X('시작 · 목표','started · goal')} ${icHTML('mana')}${fmtLog(chalGoalLog(ch,S.chalDone[id]||0))}`,true);
  toast(icHTML('chain')+' '+NM(ch.nm)+X(' 시작',' started'));
}
/* ── 시련 동안에는 던전을 봉인한다 ──────────────────
   시련은 '제약을 걸고 목표 마나에 닿는 것' 이다. 그런데 목표는 이번 회차에 번
   마나로 재고, 쥐고 있는 땅은 가만있어도 그 값을 밀어 올린다 — 사천 층을 쥔 채로
   들어가면 한 틱 만에 목표를 넘는다. 스물여섯 개가 전부 그랬다.
   제약을 견디는 것이 아니라 그냥 눌리는 버튼이었다.
   그래서 시련 안에서는 1 층에서 다시 시작한다. 프레스티지가 층을 되돌리지
   않기로 한 것과 어긋나지 않는다 — 시련은 스스로 골라 들어가는 다른 판이고,
   나오면 쥐고 있던 층을 그대로 돌려받는다. 최심층 기록(deepestEver)은
   어차피 아무것도 지우지 않는다. */
export function sealDungeon(){
  S.chalKeep={floor:S.floor|0, deepest:S.deepest|0, lootFloor:S.lootFloor|0};
  S.floor=1; S.deepest=0; S.lootFloor=0; S.prog=0; S.floorCd=0;
}
export function unsealDungeon(){
  const k=S.chalKeep; if(!k) return;
  S.chalKeep=null;
  /* 시련 안에서 더 깊이 갔더라도 밖의 기록을 깎지 않는다 */
  S.deepest=Math.max(k.deepest|0, S.deepest|0);
  S.floor=Math.max(k.floor|0, 1);
  S.lootFloor=Math.max(k.lootFloor|0, 0);
  S.prog=0; S.floorCd=0;
}
export const CHAL_CD=300;   // 너무 잦으면 회차가 초기화돼 던전 진행이 망가진다                     // 시련을 나온 뒤 자동 재진입까지 최소 대기(초)
export function exitChallenge(reset=true){
  S.chal=null; S.chalTime=0; S.chalCd=CHAL_CD; S.chalGoalL=null;
  unsealDungeon();                 // 쥐고 있던 층을 돌려준다
  if(reset) softReset();
  recalc();
}
export function checkChallenge(){
  const ch=curChal(); if(!ch) return;
  const c=S.chalDone[ch.id]||0;
  const g=S.chalGoalL;
  const goal=(typeof g==='number'&&isFinite(g))?g:chalGoalLog(ch,c);
  if(S.manaRunL>=goal){
    S.chalDone[ch.id]=c+1;
    log(`${icHTML('medal')}<b class="gold">${NM(ch.nm)} ${X(`${c+1}단계 돌파!`,`stage ${c+1} cleared!`)}</b> · ${ch.rw(c+1)}`,true);
    achToast(NM(ch.nm)+X(' 돌파',' cleared'), ch.rw(c+1),'medal');
    exitChallenge(true);
    if(autoOK('chal')) autoEnterChallenge();
  }
}
/* 도달 가능성 판정 · 최고 회차 기록 대비 목표가 현실적인 시련만 고른다 */
export function chalReachable(ch){
  const n=S.chalDone[ch.id]||0;
  if(n>=ch.max||!chalOpen(ch)) return false;
  const penalty=chalPenaltyLog(ch);   // 자릿수로 잰다 — 목표와 같은 자를 쓴다
  /* 목표가 1e308 을 넘으면 평범한 수로는 ∞ 가 되어 어떤 시련도 "닿을 수 없음" 이
     되고, 반대로 기록이 ∞ 면 전부 "닿을 수 있음" 이 된다. 자릿수로 견준다. */
  return chalGoalLog(ch,n)+penalty <= (S.bestRunL||-Infinity)+L10(0.6);
}
export function autoEnterChallenge(){
  if(!chalUnlocked()||S.chal) return;
  if((S.chalCd||0)>0) return;          // 쿨다운 중에는 자동 진입 금지 (수동 진입은 언제든 가능)
  const avail=CHALLENGES.filter(chalReachable);
  if(!avail.length) return;
  avail.sort((a,b)=>(S.chalDone[a.id]||0)-(S.chalDone[b.id]||0)||a.base-b.base);
  enterChallenge(avail[0].id);
}
