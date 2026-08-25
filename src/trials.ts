import { recalc } from './multipliers'

import { NM, X, icHTML } from './core'
import { CHALLENGES, chalGoal } from './content'
import { S } from './state'
import { chalTotal, curChal, fmt, numLog } from './num'
import { softReset } from './prestige'
import { autoOK } from './automation'
import { log } from './tick'
import { achToast, toast } from './ui/dom'

/* ══════════════ 도전 ══════════════ */
export const chalUnlocked=()=>(S.ascendEver||S.ascensions)>=1||chalTotal()>0;
export function enterChallenge(id){
  const ch=CHALLENGES.find(c=>c.id===id);
  if(!ch||!chalUnlocked()) return;
  if((S.chalDone[id]||0)>=ch.max) return;
  S.chal=id; S.chalTime=0; softReset();
  log(`${icHTML('chain')}<b>${NM(ch.nm)}</b> ${X('시작 · 목표','started · goal')} ${icHTML('mana')}${fmt(chalGoal(ch,S.chalDone[id]||0))}`,true);
  toast(icHTML('chain')+' '+NM(ch.nm)+X(' 시작',' started'));
}
export const CHAL_CD=300;   // 너무 잦으면 회차가 초기화돼 던전 진행이 망가진다                     // 시련을 나온 뒤 자동 재진입까지 최소 대기(초)
export function exitChallenge(reset=true){
  S.chal=null; S.chalTime=0; S.chalCd=CHAL_CD;   // 곧바로 다시 들어가면 던전이 영영 1층에 묶인다
  if(reset) softReset();
  recalc();
}
export function checkChallenge(){
  const ch=curChal(); if(!ch) return;
  const c=S.chalDone[ch.id]||0;
  if(S.manaRunL>=numLog(chalGoal(ch,c))){
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
  if(n>=ch.max) return false;
  const penalty=(ch.rule.drain||1)*(ch.rule.noResearch?4:1)*(ch.rule.noAuto?3:1)*(ch.rule.maxTier!==undefined?3:1);
  return chalGoal(ch,n)*penalty <= S.bestRun*0.6;
}
export function autoEnterChallenge(){
  if(!chalUnlocked()||S.chal) return;
  if((S.chalCd||0)>0) return;          // 쿨다운 중에는 자동 진입 금지 (수동 진입은 언제든 가능)
  const avail=CHALLENGES.filter(chalReachable);
  if(!avail.length) return;
  avail.sort((a,b)=>(S.chalDone[a.id]||0)-(S.chalDone[b.id]||0)||a.base-b.base);
  enterChallenge(avail[0].id);
}
