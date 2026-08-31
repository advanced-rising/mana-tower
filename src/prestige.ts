import { sfx } from './audio'
import { INF_LAYERS } from './layers'
import { PRODUCERS } from './producers'
import { toast } from './ui/dom'
import { autoOK } from './automation'
import { X, icHTML } from './core'
import { ACHS, ACH_NOUN, BADGES, ETER_UPS, INF_UPS, ORIGIN_UPS, REAL_UPS, VOID_UPS, achName } from './content'
import { S } from './state'
import { L10, fmt, fmtLog, freeStart, gainRes, logAdd, numLog, setRes, startManaLog, syncGen } from './num'
import { M, recalc, setAnchor } from './multipliers'
import { COSMOS, chapterOf } from './dungeon'
import { autoEnterChallenge, exitChallenge } from './trials'
import { log } from './tick'

/* ══════════════ 프레스티지 ══════════════ */
export const REBIRTH_REQ=1e6, ASCEND_REQ=300;
/* 회차 마나가 1e300 을 넘어도 획득량이 ∞ 로 튀지 않게 자릿수에서 계산한다 */
/* ── 돌파 조건은 돌파할수록 멀어진다 ────────────────
   환생·승천·초월·무한·영원·현실·공허·근원 — 이 게임의 모든 단계는 '돌파' 다.
   그런데 아래 셋만 조건이 고정이었다. 처음 정한 마나 100만, 영혼석 300,
   유물 500 은 후반에 한 틱이면 넘는 값이라, 돌파가 '더 멀리 가는 일' 이 아니라
   그냥 눌러야 하는 버튼이 되었다.
   여태 낸 최고치의 아홉 할을 요구한다 — 기록이 자라면 조건도 함께 자라므로
   언제나 '거의 최고만큼' 다시 가야 한다. 처음 정한 값이 하한으로 남는다. */
/* 0.9 로 두었더니 초기화 뒤 한 회차에 그만큼을 다시 벌지 못해 영영 막혔다.
   돌파는 '거의 최고만큼' 이 아니라 '제법 멀리' 면 된다. */
export const REQ_REL=0.55;
/* 최고치를 넘지 못한 돌파라도 조건은 한 걸음 밀린다 — '돌파할 때마다 더 멀리' 다.
   자릿수로 0.3(=약 두 배) 씩이라, 쉰 번을 해도 열다섯 자릿수만 오른다. */
/* 자릿수 0.3 은 돌파마다 조건을 두 배로 만든다. 보상이 1, 2, 3 개로 세어지는
   경제에서는 스무 번이면 손이 닿지 않는다. 5% 씩만 민다. */
export const REQ_STEP=0.02;
export function pushReq(field,reached){
  const b=S[field], now=(typeof reached==='number'&&isFinite(reached))?reached:-Infinity;
  const base=(typeof b==='number'&&isFinite(b))?b:-Infinity;
  S[field]=Math.max(base,now)+REQ_STEP;
}
/* 하한도 돌파 횟수를 따라 오른다. 처음 정한 값만 하한으로 두면 초반에는
   그 값이 계속 이겨서, 돌파를 아무리 해도 조건이 그대로였다. */
function reqOf(base,best,count){
  const floor=numLog(base)+Math.max(0,count||0)*REQ_STEP;
  const rel=(typeof best==='number'&&isFinite(best)&&best>0)?REQ_REL*best:-Infinity;
  return Math.max(floor,rel);
}
export const rebirthReqLog=()=>reqOf(REBIRTH_REQ,S.bestRunL,  S.rebirthEver||S.rebirths);
export const ascendReqLog =()=>reqOf(ASCEND_REQ, S.bestAscL,  S.ascendEver ||S.ascensions);
export const transReqLog  =()=>reqOf(TRANS_REQ,  S.bestTransL,S.transEver  ||S.transcends);

/* ── 돌파가 주는 양은 개수로 센다 ────────────────────
   여태는 조건을 넘긴 폭이 그대로 지수로 들어가, 첫 환생부터 천문학적인 수가
   쏟아졌다. 보통은 첫 환생에 영혼석 한 개가 쌓이고 회차를 거듭하며 천천히
   늘어난다 — 무한 계층이 이미 그렇게 세고 있었으니, 아래 돌파도 같게 맞춘다.
   넘긴 폭의 로그에 비례하므로 1, 2, 3 … 으로 오르되 폭주하지 않는다.
   배율은 넘긴 폭에 얹어, 강화가 쌓일수록 같은 회차가 조금 더 준다. */
function gainCount(excessLog){
  return (typeof excessLog==='number'&&excessLog>=0)?breakAmount(excessLog):0;
}
export function soulGain(){ return gainCount(S.manaRunL-rebirthReqLog()+Math.max(0,M().soulLog)) }
export function soulGainLog(){ const g=soulGain(); return g>0?L10(g):-Infinity }

export function offerGain(){ return gainCount(S.manaRunL-rebirthReqLog()+Math.max(0,M().offerLog)) }
export function offerGainLog(){ const g=offerGain(); return g>0?L10(g):-Infinity }

export function relicGain(){
  const a=(typeof S.soulAscL==='number'&&!isNaN(S.soulAscL))?S.soulAscL:-Infinity;
  return gainCount(a-ascendReqLog()+Math.max(0,M().relicLog));
}
export function relicGainLog(){ const g=relicGain(); return g>0?L10(g):-Infinity }
export function softReset(){
  const free=freeStart();
  S.manaL=Math.max(L10(25),startManaLog(S.soulUps.s7||0));
  /* '회차 누적' 은 이번 회차에 **번** 마나다. 받은 지원금은 번 것이 아니다.
     예전에는 지원금을 그대로 회차 누적에 얹었는데, 지원금이 로그로 바뀌면서
     레벨 1 만 되어도 10^6.02 —— 환생 조건(10^6) 을 지원금만으로 넘겨,
     환생하자마자 또 환생할 수 있었다. 무한 환생이 그것이었다.
     회차 누적은 0 에서 시작하고, 지원금은 손에 쥔 잔액으로만 남는다. */
  S.manaRunL=-Infinity;
  S.bought=PRODUCERS.map(()=>0); S.genL=PRODUCERS.map(()=>-Infinity); syncGen();
  /* 공짜 시설은 0 단계에만 준다. 위 단계는 아래 단계를 '비용 없이' 만들어 내므로,
     거기에 씨앗을 뿌리면 남은 배율만큼 한 틱에 폭발한다 — 값에 묶어 두어도
     생성은 값을 내지 않기 때문에 막을 방법이 없다.
     0 단계는 손으로 채집하는 것을 대신할 뿐이라 연쇄에 불을 붙이지 않는다. */
  S.bought[0]=Math.max(1,free);
  /* 던전도 1 층으로 초기화된다. 이미 깬 층(1 ~ 최심층)은 되밟는 길이라
     싸우지도 않고 아무것도 나오지 않으며, 기록이 얼마나 깊든 제자리로
     돌아가는 데 걸리는 시간이 같도록 그 구간만 빠르게 지나간다.
     전리품이 없으니 '한 층씩' 규칙이 막으려던 폭주와는 무관하다. */
  S.research={}; S.sinceRebirth=0;
  S.floor=1; S.prog=0; S.floorCd=0; S.lootFloor=0;   // 보상도 이번 회차에 다시 받는다
  S.anchorL=0; recalc();      // 먼저 풀고 다시 재야 이번 회차가 들고 온 배율이 나온다
  setAnchor(); recalc();
}
export function doRebirth(silent){
  const g=soulGain(), o=offerGain();
  if(g<=0) return false;
  /* 조건은 여태 낸 최고치를 따라간다. 그 최고치는 tick 이 기르는데, 돌파가
     manaRunL 을 먼저 지워 버리면 이번에 닿은 높이가 기록되지 않는다 —
     그래서 조건이 그대로 남고 같은 값을 계속 얻게 된다. 여기서 새긴다. */
  const gl=soulGainLog(), ol=offerGainLog();
  gainRes('soul',gl); S.soulAscL=logAdd(S.soulAscL,gl); S.soulAsc=S.soulAscL<308?Math.pow(10,S.soulAscL):Infinity;
  S.lastSoulGainL=gl; S.lastSoulGain=g; S.rebirthEver=(S.rebirthEver||0)+1;
  gainRes('offering',ol);
  sfx('prestige');
  pushReq('bestRunL',S.manaRunL);      // 다음 환생은 여기보다 멀리
  S.rebirths++;
  if(S.chal) exitChallenge(false);
  softReset();
  log(`${icHTML('soul')}<b>${X('환생','Rebirth')}</b> · ${X('영혼석','Soul Shards')} <b class="soul">+${fmtLog(gl)}</b> · ${X('오퍼링','Offerings')} <b class="offer">+${fmtLog(ol)}</b>`,true);
  if(!silent) toast(icHTML('soul')+X(` 환생 · 영혼석 +${fmtLog(gl)}`,` Rebirth · Soul Shards +${fmtLog(gl)}`));
  if(autoOK('chal')) autoEnterChallenge();
  return true;
}
export function doAscend(silent){
  const g=relicGain();
  if(g<=0) return false;
  const rl=relicGainLog();
  /* 돌파마다 갚는 재료가 달라야 한다. 승천은 유물과 함께 결정을 얹는다 —
     장비를 벼릴 밑천이 되어, 승천이 던전 쪽 경제와도 이어진다. */
  gainRes('crystal',rl*0.3);      // 유물 자릿수의 3 할
  gainRes('relic',rl); S.relicTransL=logAdd(S.relicTransL,rl); S.relicTrans=S.relicTransL<308?Math.pow(10,S.relicTransL):Infinity;
  sfx('prestige');
  pushReq('bestAscL',S.soulAscL);
  S.lastRelicGainL=rl; S.lastRelicGain=g; S.ascensions++; S.ascendEver=(S.ascendEver||0)+1;
  setRes('soul',-Infinity); S.soulAsc=0; S.soulAscL=-Infinity; S.soulUps={}; S.runes={};
  S.rebirths=0;  setRes('offering',-Infinity); S.lastSoulGain=0; S.lastSoulGainL=-Infinity; S.sinceAscend=0;
  if(S.chal) exitChallenge(false);
  softReset();
  log(`${icHTML('relic')}<b>${X('승천','Ascension')}</b> · ${X('유물','Relics')} <b class="relic">+${fmtLog(rl)}</b> · ${X('영혼석과 룬이 초기화되었다','soul shards and runes reset')}`,true);
  if(!silent) toast(icHTML('relic')+X(` 승천 · 유물 +${fmtLog(rl)}`,` Ascension · Relics +${fmtLog(rl)}`));
  return true;
}

/* ── 무한 계층 ────────────────────────────────
   자바스크립트 수는 약 1.8e308 에서 Infinity 가 된다.
   그 벽을 게임의 관문으로 쓴다 — 수가 넘칠 지경이 되면 한 칸 위로 올라가고,
   아래는 전부 초기화된다. 칸은 얼마든지 이어 붙일 수 있다. */
export const INF_CAP=1e300;
export const INF_AUTO_CD=60;                  // 자동 돌파 최소 간격
export const INF_AUTO_WAIT=900;               // 나아지지 않아도 이만큼 지나면 뚫는다                  // 자동 돌파는 60초에 한 번까지
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
/* 돌파 조건.
   돌파마다 3 자릿수(1000배) 씩만 올랐다. 생산은 그보다 훨씬 빨리 자라므로
   후반에는 돌파한 그 자리에서 곧바로 조건이 다시 차고, 같은 값을 계속 얻는다 —
   그러면 초기화가 아니라 버튼이 된다.
   그래서 '지난번에 실제로 닿았던 높이' 를 기준으로 삼는다. 다음 돌파는 그보다
   확실히 더 멀리 가야 한다. 자릿수에 곱으로 붙으므로 생산이 아무리 커져도
   따라잡는 데 시간이 든다. */
/* 자릿수에 곱으로 붙으므로 조금만 커도 금세 손이 닿지 않는다 —
   1.15 배씩이면 서른네 번 만에 116 배가 되어 게임이 여섯 시간에 멎었다. */
export const REQ_GROWTH=1.02;         // 다음 돌파는 지난번 높이보다 2% 더 멀리
/* ── 칸마다 재는 자가 다르다 ────────────────────────
   무한은 마나의 '자릿수' 를 본다 — 1e300 부터, 뚫을 때마다 세 자리씩.
   그 위 칸들은 아래 계층을 '몇 개' 모았는지를 본다 — 열 개부터, 뚫을 때마다 세 배.
   그런데 바닥값이 한 줄뿐이라 어느 칸에나 300 이 깔렸고, markReq 가 그 300 을
   그대로 다음 조건으로 새겼다. 영원을 한 번 뚫는 순간 다음 조건이 '무한 열 개'
   에서 '무한 10^306 개' 로 뛰어, 두 번째 영원은 영영 오지 않는다.
   현실은 영원 열 개를 원하므로 그 위 세 칸은 아무도 본 적이 없다 —
   사흘을 굴려도 영원 1, 현실 0 이던 것이 이것이다. 칸에 맞는 자로 잰다. */
export function reqBaseLog(i){
  const n=S[INF_LAYERS[i].k+'Count']||0;
  return i>0 ? L10(INF_STACK)+n*L10(3) : 300+3*n;
}
export function reqLog(i){
  const base=reqBaseLog(i);
  const a=S[INF_LAYERS[i].k+'ReqL'];
  return (typeof a==='number'&&isFinite(a))?Math.max(base,a):base;
}
/* 돌파한 순간의 높이를 다음 조건으로 새긴다 */
export function markReq(i,reachedLog){
  const k=INF_LAYERS[i].k;
  const now=(typeof reachedLog==='number'&&isFinite(reachedLog))?reachedLog:reqLog(i);
  S[k+'ReqL']=Math.max(reqLog(i),now)*REQ_GROWTH;
}
export function reqFor(i){
  const l=reqLog(i);
  return l<300?Math.pow(10,l):Infinity;
}
/* 옛 세이브에는 잘못 새겨진 조건이 그대로 남아 있다. 위 칸의 조건은 개수의
   자릿수라 스무 자리를 넘을 일이 없다 — 300 이 넘게 적힌 것은 그 버그가
   남긴 자국이므로 지운다. 지우면 바닥값(열 개, 서른 개 …) 부터 다시 센다. */
export function fixReqs(){
  for(let i=1;i<INF_LAYERS.length;i++){
    const k=INF_LAYERS[i].k+'ReqL', a=S[k];
    if(typeof a==='number'&&a>reqBaseLog(i)+40) delete S[k];
  }
}
export function reqTxt(i){ const r=reqFor(i); return isFinite(r)?fmt(r):('1e'+reqLog(i)); }
/* ── 돌파로 얻는 양은 넘긴 폭의 로그에 비례한다 ──────────
   예전에는 요구치를 넘긴 자릿수만큼 그대로 주었다. 마나가 1e102 자릿수면
   무한을 1e102 개 받고, 무한 보너스는 그 개수의 지수라 배율이 10^(2e101) 이
   되었다 — 스물한 번째 분에 생산 배율의 전부가 이 한 항이었다.
   넘긴 폭의 로그를 쓰면 자릿수가 백 배가 되어도 얻는 양은 두 배쯤만 는다.
   그래도 끝은 없다 — 다만 사람이 따라갈 수 있는 속도로 는다. */
export const BREAK_SCALE=10;
export function breakAmount(excessLog){
  if(!(excessLog>0)) return 1;
  return Math.max(1, 1+Math.floor(BREAK_SCALE*L10(1+excessLog)));
}
export function infGain(i){
  const v=INF_LAYERS[i].from();
  if(i>0){                                    // 위 칸은 아래 계층을 세어 바꾼다
    const r=reqFor(i);
    if(!isFinite(v)) return 1;
    if(!(v>=r)) return 0;
    return breakAmount(L10(v/r));
  }
  const rl=reqLog(i), vl=S.manaEverL;   // 마나는 자릿수가 진실이므로 1e300 위에서도 정확히 센다
  if(isNaN(vl)||!(vl>=rl)) return 0;
  return breakAmount(vl-rl);
}
export function doInfBreak(i){
  const g=infGain(i);
  if(g<=0) return false;
  const L=INF_LAYERS[i];
  markReq(i, i===0?S.manaEverL:numLog(L.from()));   // 다음은 여기보다 멀리 가야 한다
  S[L.k]=(S[L.k]||0)+g; S[L.k+'Ever']=(S[L.k+'Ever']||0)+g; S[L.k+'Count']=(S[L.k+'Count']||0)+1;
  /* 이번 회차에 모은 총량 — 위 칸이 세는 것이 이것이다. 강화에 써도 줄지 않는다. */
  S[L.k+'Run']=(S[L.k+'Run']||0)+g;
  /* 계층 돌파는 아래를 통째로 지우므로, 다시 굴릴 씨앗을 계층마다 다르게 준다 */
  /* 씨앗은 다시 굴릴 만큼이면 된다. 서른 자릿수를 주었더니 룬 상한(약 35 자릿수)
     을 한 번에 채워, 돌파하자마자 모든 아이템이 최대가 되었다. */
  { const seed=L10(1+g)*2+2;
    if(i===0){ gainRes('crystal',seed); gainRes('offering',seed*0.9) }
    else if(i===1){ gainRes('soul',seed); gainRes('crystal',seed*0.9) }
    else if(i===2){ gainRes('relic',seed); gainRes('offering',seed*0.9) }
    else if(i===3){ gainRes('star',seed); gainRes('soul',seed*0.9) }
    else { gainRes('relic',seed); gainRes('crystal',seed*0.9); gainRes('offering',seed*0.8) } }
  sfx('prestige');
  S.sinceInf=0;                        // 자동 돌파 쿨다운 시작 (수동 버튼은 즉시 가능)
  /* 무한 돌파에서는 별가루와 별 강화가 남는다 — 초월 탭이 약속한 것이 그것이다.
     그러나 영원 위로는 진짜 처음부터다. 별 강화까지 전부 접힌다. */
  for(let j=i-1;j>=0;j--){ S[INF_LAYERS[j].k]=0; S[INF_LAYERS[j].k+'Run']=0; if(INF_LAYERS[j].store) S[INF_LAYERS[j].store]={}; }
  if(i>0){ setRes('star',-Infinity); S.starUps={}; }

  setRes('relic',-Infinity); S.relicTrans=0; S.relicTransL=-Infinity; S.relicUps={};
  setRes('soul',-Infinity); S.soulAsc=0; S.soulAscL=-Infinity; S.soulUps={}; S.runes={}; S.gear={};
  setRes('crystal',-Infinity); setRes('offering',-Infinity); S.manaEver=0; S.manaEverL=-Infinity;
  S.rebirths=0; S.ascensions=0; S.transcends=0; 
  if(S.chal) exitChallenge(false);
  softReset();
  log(`${icHTML(L.sp)}<b class="gold">${X(L.ko,L.en)} ${X('돌파','Break')}</b> · <b>+${fmt(g)}</b> · ${i>0?X('모든 것이 처음으로 돌아갔다','everything returned to the beginning'):X('아래 계층이 접혔다 · 별 강화는 남았다','everything below folded away, star upgrades kept')}`,true);
  toast(icHTML(L.sp)+X(` ${L.ko} 돌파 +${fmt(g)}`,` ${L.en} +${fmt(g)}`));
  return true;
}
/* 무한 계층은 그 자체가 전체 배율이 된다 */
export function infBonusLog(){
  /* 돌파 횟수에 자릿수가 선형으로 붙어 있었다. 무한을 4.99e264 번 뚫은 세이브에서는
     그것만으로 배율이 10^(1.06e264) 이 되어, 룬·장비를 상한에 맞춰도 마나가
     프레스티지 직후 그대로 꼭대기였다. 다른 곳과 같이 로그로 접는다 —
     쉰 번 뚫으면 예순 자릿수쯤, 그 위로는 천천히 는다. */
  let v=0;
  for(let i=0;i<INF_LAYERS.length;i++){
    const n=S[INF_LAYERS[i].k+'Ever']||0;
    if(n>0&&isFinite(n)) v+=35*(1+i*0.5)*L10(1+n);
  }
  return v;
}
/* 1e120 에서 자르던 천장을 걷었다 — 배율이 자릿수로 다뤄지므로 넘칠 일이 없다 */
export function infBonus(){ const l=infBonusLog(); return l<300?Math.pow(10,l):Infinity; }

export const TRANS_REQ=500;
export function starGain(){
  const r=(typeof S.relicTransL==='number'&&!isNaN(S.relicTransL))?S.relicTransL:-Infinity;
  return gainCount(r-transReqLog());
}
export function starGainLog(){ const g=starGain(); return g>0?L10(g):-Infinity }
export function doTranscend(silent){
  const g=starGain();
  if(g<=0) return false;
  const sl=starGainLog();
  sfx('prestige');
  pushReq('bestTransL',S.relicTransL);
  /* 초월은 별가루와 함께 오퍼링·영혼석을 얹는다 — 룬과 영혼 강화를 다시
     세울 밑천이다. 아래를 전부 갈아엎는 돌파이니 씨앗은 돌려준다. */
  gainRes('offering',sl*0.35); gainRes('soul',sl*0.3);
  gainRes('star',sl); S.lastStarGainL=sl; S.lastStarGain=g; S.transcends++; S.transEver=(S.transEver||0)+1;
  /* 자릿수가 진실이므로 파생값만 0 으로 두면 아무것도 초기화되지 않는다.
     초월 뒤에도 영혼석과 유물이 그대로 남아 있던 자리다. */
  setRes('relic',-Infinity); S.relicTrans=0; S.relicTransL=-Infinity; S.relicUps={};
  setRes('soul',-Infinity); S.soulAsc=0; S.soulAscL=-Infinity; S.soulUps={}; S.runes={}; S.gear={};
  setRes('crystal',-Infinity); setRes('offering',-Infinity);
  S.rebirths=0; S.ascensions=0; 
  S.lastSoulGain=0; S.lastRelicGain=0; S.sinceAscend=0; S.sinceTrans=0;
  if(S.chal) exitChallenge(false);
  softReset();
  log(`${icHTML('star')}<b>${X('초월','Transcendence')}</b> · ${X('별가루','Stardust')} <b class="gold">+${fmtLog(sl)}</b> · ${X('유물과 승천까지 초기화되었다','relics and ascensions reset')}`,true);
  if(!silent) toast(icHTML('star')+X(` 초월 · 별가루 +${fmtLog(sl)}`,` Transcend · Stardust +${fmtLog(sl)}`));
  return true;
}
export const transUnlocked=()=>(S.ascendEver||S.ascensions)>=5||S.starEver>0;
