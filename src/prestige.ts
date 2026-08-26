import { INF_LAYERS } from './layers'
import { PRODUCERS } from './producers'
import { toast } from './ui/dom'
import { autoOK } from './automation'
import { X, icHTML } from './core'
import { ACHS, ACH_NOUN, BADGES, ETER_UPS, INF_UPS, ORIGIN_UPS, REAL_UPS, VOID_UPS, achName } from './content'
import { S } from './state'
import { L10, fmt, gainRes, logAdd, numLog, setRes, startManaLog, syncGen } from './num'
import { M, recalc, safeAdd } from './multipliers'
import { COSMOS, chapterOf } from './dungeon'
import { autoEnterChallenge, exitChallenge } from './trials'
import { log } from './tick'

/* ══════════════ 프레스티지 ══════════════ */
export const REBIRTH_REQ=1e6, ASCEND_REQ=1000;
/* 회차 마나가 1e300 을 넘어도 획득량이 ∞ 로 튀지 않게 자릿수에서 계산한다 */
export function soulGainLog(){
  if(!(S.manaRunL>=numLog(REBIRTH_REQ))) return -Infinity;
  return L10(3)+0.3*(S.manaRunL-numLog(REBIRTH_REQ))+M().soulLog;
}
export function soulGain(){ const l=soulGainLog(); return l<300?Math.floor(Math.pow(10,l)):Infinity }
export function offerGainLog(){
  if(!(S.manaRunL>=numLog(REBIRTH_REQ))) return -Infinity;
  return L10(2)+0.22*(S.manaRunL-numLog(REBIRTH_REQ))+M().offerLog;
}
export function offerGain(){ const l=offerGainLog(); return l<300?Math.floor(Math.pow(10,l)):Infinity }
export function relicGainLog(){
  const a=(typeof S.soulAscL==='number'&&!isNaN(S.soulAscL))?S.soulAscL:-Infinity;
  if(!(a>=numLog(ASCEND_REQ))) return -Infinity;
  return L10(2)+0.35*(a-numLog(ASCEND_REQ))+M().relicLog;
}
export function relicGain(){ const l=relicGainLog(); return l<300?Math.floor(Math.pow(10,l)):Infinity }
export function softReset(){
  const free=8*(S.relicUps.a5||0)+25*(S.starUps.t9||0)+500*((S.eterUps||{}).e13||0)+5000*((S.realUps||{}).r9||0)+1e5*((S.originUps||{}).o6||0);
  S.manaL=Math.max(L10(25),startManaLog(S.soulUps.s7||0));
  S.manaRunL=S.manaL;
  S.bought=PRODUCERS.map(()=>0); S.genL=PRODUCERS.map(()=>-Infinity); syncGen();
  for(let i=0;i<5;i++) S.bought[i]=free;
  S.bought[0]=Math.max(1,free);
  S.research={}; S.floor=1; S.prog=0; S.sinceRebirth=0;
  recalc();
}
export function doRebirth(silent){
  const g=soulGain(), o=offerGain();
  if(g<=0) return false;
  const gl=soulGainLog(), ol=offerGainLog();
  gainRes('soul',gl); S.soulAscL=logAdd(S.soulAscL,gl); S.soulAsc=S.soulAscL<308?Math.pow(10,S.soulAscL):Infinity;
  S.lastSoulGainL=gl; S.lastSoulGain=g; S.rebirthEver=(S.rebirthEver||0)+1;
  gainRes('offering',ol);
  S.rebirths++;
  if(S.chal) exitChallenge(false);
  softReset();
  log(`${icHTML('soul')}<b>${X('환생','Rebirth')}</b> · ${X('영혼석','Soul Shards')} <b class="soul">+${fmt(g)}</b> · ${X('오퍼링','Offerings')} <b class="offer">+${fmt(o)}</b>`,true);
  if(!silent) toast(icHTML('soul')+X(` 환생 · 영혼석 +${fmt(g)}`,` Rebirth · Soul Shards +${fmt(g)}`));
  if(autoOK('chal')) autoEnterChallenge();
  return true;
}
export function doAscend(silent){
  const g=relicGain();
  if(g<=0) return false;
  const rl=relicGainLog();
  gainRes('relic',rl); S.relicTransL=logAdd(S.relicTransL,rl); S.relicTrans=S.relicTransL<308?Math.pow(10,S.relicTransL):Infinity;
  S.lastRelicGainL=rl; S.lastRelicGain=g; S.ascensions++; S.ascendEver=(S.ascendEver||0)+1;
  setRes('soul',-Infinity); S.soulAsc=0; S.soulAscL=-Infinity; S.soulUps={}; S.runes={};
  S.rebirths=0; S.deepest=0; setRes('offering',-Infinity); S.lastSoulGain=0; S.lastSoulGainL=-Infinity; S.sinceAscend=0;
  if(S.chal) exitChallenge(false);
  softReset();
  log(`${icHTML('relic')}<b>${X('승천','Ascension')}</b> · ${X('유물','Relics')} <b class="relic">+${fmt(g)}</b> · ${X('영혼석과 룬이 초기화되었다','soul shards and runes reset')}`,true);
  if(!silent) toast(icHTML('relic')+X(` 승천 · 유물 +${fmt(g)}`,` Ascension · Relics +${fmt(g)}`));
  return true;
}

/* ── 무한 계층 ────────────────────────────────
   자바스크립트 수는 약 1.8e308 에서 Infinity 가 된다.
   그 벽을 게임의 관문으로 쓴다 — 수가 넘칠 지경이 되면 한 칸 위로 올라가고,
   아래는 전부 초기화된다. 칸은 얼마든지 이어 붙일 수 있다. */
export const INF_CAP=1e300;
export const INF_AUTO_CD=60;                  // 자동 돌파는 60초에 한 번까지
/* 무한만 마나가 넘칠 때 열린다. 그 위로는 아래 계층을 열 개 모아야 한 칸 오른다. */
export const INF_STACK=10;
/* 차례는 환생 → 승천 → 초월 → 무한 이다. 무한이 마나만 보고 열려 있어서
   초월을 한 번도 하지 않았는데 무한 돌파가 먼저 일어나고, 그 돌파가 회차를
   갈아엎어 초월에 필요한 유물이 다시 쌓이지 않는 앞뒤가 바뀐 상태가 되었다.
   앞 칸을 밟았을 때만 다음 칸이 열린다. 마나도 회차마다 초기화되는 manaEver
   대신 줄지 않는 최고 기록을 본다. */
export const infUnlocked=i=>i===0
  ? (S.inf>0 || ((S.transEver||S.transcends)>0 && S.manaPeakL>=numLog(INF_CAP/1e40)))
  : (S[INF_LAYERS[i-1].k+'Ever']||0)>=INF_STACK;
/* 돌파 요구치는 돌파할수록 오른다 — 1e300 → 1e303 → 1e306 … (돌파 1회마다 1000배).
   1e308 을 넘어가면 double 로는 못 적으므로 지수(로그) 로 다룬다. */
export function reqLog(i){ return 300+3*(S[INF_LAYERS[i].k+'Count']||0); }
export function reqFor(i){
  if(i>0) return INF_STACK*Math.pow(3,S[INF_LAYERS[i].k+'Count']||0);   // 10 → 30 → 90 …
  return Math.pow(10,reqLog(i));
}
export function reqTxt(i){ const r=reqFor(i); return isFinite(r)?fmt(r):('1e'+reqLog(i)); }
export function infGain(i){
  const v=INF_LAYERS[i].from();
  if(i>0){                                    // 위 칸은 아래 계층을 세어 바꾼다
    const r=reqFor(i);
    if(!isFinite(v)) return 1;
    return v<r ? 0 : Math.floor(v/r);
  }
  const rl=reqLog(i), vl=S.manaEverL;   // 마나는 자릿수가 진실이므로 1e300 위에서도 정확히 센다
  if(isNaN(vl)||!(vl>=rl)) return 0;
  return Math.max(1,1+Math.floor(vl-rl));
}
export function doInfBreak(i){
  const g=infGain(i);
  if(g<=0) return false;
  const L=INF_LAYERS[i];
  S[L.k]=(S[L.k]||0)+g; S[L.k+'Ever']=(S[L.k+'Ever']||0)+g; S[L.k+'Count']=(S[L.k+'Count']||0)+1;
  S.sinceInf=0;                        // 자동 돌파 쿨다운 시작 (수동 버튼은 즉시 가능)
  /* 무한 돌파에서는 별가루와 별 강화가 남는다 — 초월 탭이 약속한 것이 그것이다.
     그러나 영원 위로는 진짜 처음부터다. 별 강화까지 전부 접힌다. */
  for(let j=i-1;j>=0;j--){ S[INF_LAYERS[j].k]=0; if(INF_LAYERS[j].store) S[INF_LAYERS[j].store]={}; }
  if(i>0){ setRes('star',-Infinity); S.starUps={}; }

  setRes('relic',-Infinity); S.relicTrans=0; S.relicTransL=-Infinity; S.relicUps={};
  setRes('soul',-Infinity); S.soulAsc=0; S.soulAscL=-Infinity; S.soulUps={}; S.runes={}; S.gear={};
  setRes('crystal',-Infinity); setRes('offering',-Infinity); S.manaEver=0; S.manaEverL=-Infinity;
  S.rebirths=0; S.ascensions=0; S.transcends=0; S.deepest=0;
  if(S.chal) exitChallenge(false);
  softReset();
  log(`${icHTML(L.sp)}<b class="gold">${X(L.ko,L.en)} ${X('돌파','Break')}</b> · <b>+${fmt(g)}</b> · ${i>0?X('모든 것이 처음으로 돌아갔다','everything returned to the beginning'):X('아래 계층이 접혔다 · 별 강화는 남았다','everything below folded away, star upgrades kept')}`,true);
  toast(icHTML(L.sp)+X(` ${L.ko} 돌파 +${fmt(g)}`,` ${L.en} +${fmt(g)}`));
  return true;
}
/* 무한 계층은 그 자체가 전체 배율이 된다 */
export function infBonusLog(){
  let v=0;
  // 배율이 너무 세면 돌파 직후 곧바로 되돌아와 초기화가 체감되지 않는다
  for(let i=0;i<INF_LAYERS.length;i++) v+=(S[INF_LAYERS[i].k+'Ever']||0)*L10(1.6+i*0.9);
  return v;
}
/* 1e120 에서 자르던 천장을 걷었다 — 배율이 자릿수로 다뤄지므로 넘칠 일이 없다 */
export function infBonus(){ const l=infBonusLog(); return l<300?Math.pow(10,l):Infinity; }

export const TRANS_REQ=500;
export function starGainLog(){
  const r=(typeof S.relicTransL==='number'&&!isNaN(S.relicTransL))?S.relicTransL:-Infinity;
  if(!(r>=numLog(TRANS_REQ))) return -Infinity;
  return L10(2)+0.4*(r-numLog(TRANS_REQ));
}
export function starGain(){ const l=starGainLog(); return l<300?Math.floor(Math.pow(10,l)):Infinity }
export function doTranscend(silent){
  const g=starGain();
  if(g<=0) return false;
  const sl=starGainLog();
  gainRes('star',sl); S.lastStarGainL=sl; S.lastStarGain=g; S.transcends++; S.transEver=(S.transEver||0)+1;
  /* 자릿수가 진실이므로 파생값만 0 으로 두면 아무것도 초기화되지 않는다.
     초월 뒤에도 영혼석과 유물이 그대로 남아 있던 자리다. */
  setRes('relic',-Infinity); S.relicTrans=0; S.relicTransL=-Infinity; S.relicUps={};
  setRes('soul',-Infinity); S.soulAsc=0; S.soulAscL=-Infinity; S.soulUps={}; S.runes={}; S.gear={};
  setRes('crystal',-Infinity); setRes('offering',-Infinity);
  S.rebirths=0; S.ascensions=0; S.deepest=0;
  S.lastSoulGain=0; S.lastRelicGain=0; S.sinceAscend=0; S.sinceTrans=0;
  if(S.chal) exitChallenge(false);
  softReset();
  log(`${icHTML('star')}<b>${X('초월','Transcendence')}</b> · ${X('별가루','Stardust')} <b class="gold">+${fmt(g)}</b> · ${X('유물과 승천까지 초기화되었다','relics and ascensions reset')}`,true);
  if(!silent) toast(icHTML('star')+X(` 초월 · 별가루 +${fmt(g)}`,` Transcend · Stardust +${fmt(g)}`));
  return true;
}
export const transUnlocked=()=>(S.ascendEver||S.ascensions)>=5||S.starEver>0;
