import { INF_LAYERS } from './layers'
import { PRODUCERS } from './producers'
import { X } from './core'
import { GEAR, RELIC_UPS, RESEARCH, RUNES, SOUL_UPS, STAR_UPS, bulkCost, bulkMax, gearCost, runeCost } from './content'
import { S } from './state'
import { L10, RES, bulkCostLog, bulkMaxLog, chalTotal, costLogAt, curChal, curL, logSub, numLog, spendRes } from './num'
import { M, costLogOf, gather, maxAfford, recalc, tierLocked } from './multipliers'

import { INF_AUTO_CD, doAscend, doInfBreak, doRebirth, doTranscend, infGain, infUnlocked, relicGain, soulGain, starGain } from './prestige'
import { autoEnterChallenge } from './trials'

/* ══════════════ 자동화 ══════════════
   자동화는 기본값이 아니라 진행으로 얻는 보상이다.
   초반에는 채집·건설·연구·던전을 직접 해야 한다. */
export const AUTO_DEFS=[
 {k:'gather', sp:'mana', g:{ko:"한 회차 안",en:"Within a run"}, nm:{ko:'마나 채집',en:"Mana Gathering"},     d:()=>X('채집 버튼을 대신 눌러 준다',"Presses the gather button for you"),                unlock:()=>S.manaPeakL>=3,                  req:()=>X('누적 마나 1,000',"1,000 total mana")},
 {k:'build', sp:'workshop',  nm:{ko:'시설 건설',en:"Construction"},     d:()=>X('여유 마나로 가장 비싼 시설부터 사들인다',"Buys the priciest affordable building"),   unlock:()=>S.manaPeakL>=numLog(2e4),                  req:()=>X('누적 마나 2만',"20,000 total mana")},
 {k:'research', sp:'flask',nm:{ko:'연구 구매',en:"Research Buying"},    d:()=>X('조건을 만족한 연구를 순서대로 사들인다',"Buys available researches in order"),     unlock:()=>(S.rebirthEver||S.rebirths)>=5||(S.ascendEver||S.ascensions)>0,    req:()=>X('환생 5회',"5 rebirths")},
 {k:'dungeon', sp:'sword',nm:{ko:'던전 연속 탐험',en:"Continuous Delving"},d:()=>X('층을 깬 뒤 멈추지 않고 계속 내려간다',"Keeps descending after each floor"),       unlock:()=>(S.deepestEver||S.deepest)>=20,                    req:()=>X('던전 20층 돌파',"Reach dungeon floor 20")},
 {k:'rebirth', sp:'spiral', g:{ko:"환생",en:"Rebirth"},nm:{ko:'자동 환생',en:"Auto Rebirth"},     d:()=>X('직전 회차보다 1.5배 이상 벌릴 때 환생한다',"Rebirths when the run beats the last by 1.5x"),  unlock:()=>(S.rebirthEver||S.rebirths)>=20||(S.ascendEver||S.ascensions)>0,   req:()=>X('환생 20회',"20 rebirths")},
 {k:'soulup', sp:'soul', nm:{ko:'영혼 강화 구매',en:"Soul Upgrade Buying"},d:()=>X('영혼석으로 가장 싼 강화를 사들인다',"Buys the cheapest soul upgrade"),         unlock:()=>(S.rebirthEver||S.rebirths)>=10||(S.ascendEver||S.ascensions)>0,   req:()=>X('환생 10회',"10 rebirths")},
 {k:'chal', sp:'chain',   nm:{ko:'자동 시련',en:"Auto Trials"},     d:()=>X('환생할 때마다 감당 가능한 시련에 들어간다',"Enters a reachable trial on each rebirth"),  unlock:()=>chalTotal()>=3,                   req:()=>X('시련 3단계 완료',"Clear 3 trial stages")},
 {k:'ascend', sp:'reliquary', g:{ko:"승천",en:"Ascension"}, nm:{ko:'자동 승천',en:"Auto Ascension"},     d:()=>X('유물이 충분히 쌓이면 승천한다',"Ascends once relics pile up"),              unlock:()=>(S.ascendEver||S.ascensions)>=3,                  req:()=>X('승천 3회',"3 ascensions")},
 {k:'relicup', sp:'relic',nm:{ko:'유물 강화 구매',en:"Relic Upgrade Buying"},d:()=>X('유물로 가장 싼 강화를 사들인다',"Buys the cheapest relic upgrade"),             unlock:()=>(S.ascendEver||S.ascensions)>=2,                  req:()=>X('승천 2회',"2 ascensions")},
 {k:'rune', sp:'runering',   nm:{ko:'룬 강화',en:"Rune Upgrading"},       d:()=>X('오퍼링으로 가장 싼 룬부터 새긴다',"Engraves the cheapest rune first"),           unlock:()=>(S.ascendEver||S.ascensions)>=1,                  req:()=>X('승천 1회',"1 ascension")},
 {k:'gear', sp:'anvil',   nm:{ko:'장비 제작',en:"Gear Crafting"},     d:()=>X('결정으로 가장 싼 장비부터 벼린다',"Forges the cheapest gear first"),           unlock:()=>(S.ascendEver||S.ascensions)>=1,                  req:()=>X('승천 1회',"1 ascension")},
 {k:'trans', sp:'starcrown', g:{ko:"초월",en:"Transcendence"},  nm:{ko:'자동 초월',en:"Auto Transcend"}, d:()=>X('직전 주기보다 1.5배 이상 벌릴 때 초월한다',"Transcends when the cycle beats the last by 1.5x"), unlock:()=>(S.transEver||S.transcends)>=1||S.starEver>0, req:()=>X('초월 1회',"1 transcendence")},
 {k:'starup', sp:'starsigil', nm:{ko:'별 강화 구매',en:"Star Upgrade Buying"}, d:()=>X('별가루로 가장 싼 강화를 사들인다',"Buys the cheapest star upgrade"), unlock:()=>(S.transEver||S.transcends)>=1||S.starEver>0, req:()=>X('초월 1회',"1 transcendence")},
 {k:'inf', sp:'infinity', g:{ko:"무한 너머",en:"Beyond Infinity"},    nm:{ko:'자동 무한 돌파',en:"Auto Infinity"}, d:()=>X('수가 넘칠 지경이 되면 알아서 한 칸 올라간다',"Breaks a rung as soon as a number is ready to overflow"), unlock:()=>(S.infEver||0)>0, req:()=>X('무한 돌파 1회',"1 infinity break")},
 {k:'upinf', sp:'inf_core',  nm:{ko:'무한 강화 구매',en:"Infinity Upgrade Buying"}, d:()=>X('무한으로 가장 싼 강화를 사들인다',"Buys the cheapest infinity upgrade"), unlock:()=>(S.infEver||0)>0, req:()=>X('무한 돌파 1회',"1 infinity break")},
 {k:'brketer', sp:'etercrown',  nm:{ko:'자동 영원 돌파',en:"Auto Eternity"}, d:()=>X('한 번 뚫어 본 뒤로는 알아서 뚫는다',"Once you have done it by hand, it repeats itself"), unlock:()=>(S.eterCount||0)>=1, req:()=>X('영원 돌파 1회',"1 eternity break")},
 {k:'upeter', sp:'etersigil', nm:{ko:'영원 강화 구매',en:"Eternity Upgrade Buying"}, d:()=>X('영원으로 가장 싼 강화를 사들인다',"Buys the cheapest eternity upgrade"), unlock:()=>(S.eterEver||0)>0, req:()=>X('영원 돌파 1회',"1 eternity break")},
 {k:'brkreal', sp:'real_gate',  nm:{ko:'자동 현실 돌파',en:"Auto Reality"}, d:()=>X('한 번 뚫어 본 뒤로는 알아서 뚫는다',"Once you have done it by hand, it repeats itself"), unlock:()=>(S.realCount||0)>=1, req:()=>X('현실 돌파 1회',"1 reality break")},
 {k:'upreal', sp:'real_shard', nm:{ko:'현실 강화 구매',en:"Reality Upgrade Buying"}, d:()=>X('현실로 가장 싼 강화를 사들인다',"Buys the cheapest reality upgrade"), unlock:()=>(S.realEver||0)>0, req:()=>X('현실 돌파 1회',"1 reality break")},
 {k:'brkvoid', sp:'void_gate',  nm:{ko:'자동 공허 돌파',en:"Auto Void"}, d:()=>X('한 번 뚫어 본 뒤로는 알아서 뚫는다',"Once you have done it by hand, it repeats itself"), unlock:()=>(S.voidCount||0)>=1, req:()=>X('공허 돌파 1회',"1 void break")},
 {k:'upvoid', sp:'void_star', nm:{ko:'공허 강화 구매',en:"Void Upgrade Buying"}, d:()=>X('공허로 가장 싼 강화를 사들인다',"Buys the cheapest void upgrade"), unlock:()=>(S.voidEver||0)>0, req:()=>X('공허 돌파 1회',"1 void break")},
 {k:'brkorigin', sp:'orig_crown',nm:{ko:'자동 근원 돌파',en:"Auto Origin"}, d:()=>X('한 번 뚫어 본 뒤로는 알아서 뚫는다',"Once you have done it by hand, it repeats itself"), unlock:()=>(S.originCount||0)>=1, req:()=>X('근원 돌파 1회',"1 origin break")},
 {k:'uporigin', sp:'orig_seed',nm:{ko:'근원 강화 구매',en:"Origin Upgrade Buying"}, d:()=>X('근원으로 가장 싼 강화를 사들인다',"Buys the cheapest origin upgrade"), unlock:()=>(S.originEver||0)>0, req:()=>X('근원 돌파 1회',"1 origin break")},
];
export const AUTO_DEF=k=>AUTO_DEFS.find(a=>a.k===k);
/* 승천·초월로 최심층이 초기화되면 자동 탐험이 다시 잠기던 문제.
   한 번 조건을 만족한 자동화는 계속 열려 있다. */
export function autoUnlocked(k){
  const d=AUTO_DEF(k); if(!d) return false;
  if(S.autoUnlocked&&S.autoUnlocked[k]) return true;
  if(d.unlock()){
    (S.autoUnlocked=S.autoUnlocked||{})[k]=1;
    if(S.auto[k]===undefined||S.auto[k]===0) S.auto[k]=1;   // 열리는 순간 켠다
    return true;
  }
  return false;
}
/* 전부 열렸는가 — 그때부터는 손댈 것이 없다 */
export const allAuto=()=>AUTO_DEFS.every(d=>autoUnlocked(d.k));
export const autoOK=k=>autoUnlocked(k)&&!!S.auto[k];
/* 강화 나무는 여덟인데 자동 구매는 영혼·유물 둘뿐이었다.
   나머지도 같은 규칙으로 — 가장 싼 것부터, 살 수 있는 만큼. */
/* 한 번에 여덟 단계씩만 사고 있었다. 자원이 남아돌아도 강화가 기어가서
   결국 손으로 눌러야 했다. 이제는 예산이 닿는 만큼 한 번에 산다 —
   비용이 등비수열이라 몇 단계를 살 수 있는지는 닫힌 식으로 바로 나온다.
   한 항목이 예산을 독차지하지 않도록 회차마다 남은 항목 수로 나눠 쓴다. */
/* 예산도 비용도 자릿수로 다룬다. 평범한 수로 하면 자원이 1e308 을 넘는 순간
   예산이 ∞ 가 되고, 살 수 있는 단계도 ∞ 가 되어 n 을 절반씩 줄이는 고리가
   Infinity/2 = Infinity 로 영원히 돌았다 — 게임이 통째로 멈추던 자리다. */
/* 모듈 평가 시점에 RES 를 읽으면, 순환 의존에 걸렸을 때 undefined 가 되어
   new Set(undefined) 즉 빈 집합이 된다 — 그러면 모든 화폐가 자릿수가 아닌 것으로
   취급되어 차감이 조용히 틀린다. 처음 쓸 때 만든다. */
let _logged=null;
const LOGGED={ has(k){ return (_logged||(_logged=new Set(RES))).has(k) } };
export function budgetLogOf(k){ return LOGGED.has(k)?curL(k):numLog(S[k]||0) }
export function payFrom(k,costLog){
  if(LOGGED.has(k)) spendRes(k,costLog);
  else S[k]=Math.max(0,(S[k]||0)-(costLog<300?Math.pow(10,costLog):Infinity));
}
const STEP_CAP=1e12;          // 한 번에 사들이는 단계 수 상한 — 정수 정밀도를 지킨다
export function buyBulkLog(costFn,l,budgetLog,cap){
  if(!(budgetLog>-Infinity)) return {n:0,costLog:-Infinity};
  let n=bulkMaxLog(costFn,l,budgetLog);
  n=Math.min(n, isFinite(cap)?cap:STEP_CAP, STEP_CAP);
  if(!(n>0)) return {n:0,costLog:-Infinity};
  let costLog=bulkCostLog(costFn,l,n);
  if(!(costLog<=budgetLog)){                        // 반올림으로 살짝 넘칠 때만 한 단계 물러선다
    n-=1; if(n<=0) return {n:0,costLog:-Infinity};
    costLog=bulkCostLog(costFn,l,n);
    if(!(costLog<=budgetLog)) return {n:0,costLog:-Infinity};
  }
  return {n,costLog};
}
export function autoBuyTree(defs,store,curKey){
  let bought=0;
  for(let round=0;round<6;round++){
    const st=S[store]=S[store]||{};
    const open=defs.filter(u=>(st[u.id]||0)<u.max);
    if(!open.length) break;
    open.sort((a,b)=>costLogAt(a.c,st[a.id]||0)-costLogAt(b.c,st[b.id]||0));
    let did=0;
    for(const u of open){
      const l=st[u.id]||0;
      const share=budgetLogOf(curKey)-L10(open.length);   // 한 항목이 예산을 독차지하지 않게
      const {n,costLog}=buyBulkLog(u.c,l,share,u.max-l);
      if(!(n>0)) continue;
      payFrom(curKey,costLog); st[u.id]=l+n; bought+=n; did+=n;
    }
    if(!did) break;
  }
  if(bought) recalc();
  return bought;
}
export const AUTO_INTERVAL={gather:0.2,build:0.25,research:0.8,rune:1.2,gear:1.5};
export function runAutomation(dt){
  const m=M(), ch=curChal();
  if(ch&&ch.rule.noAuto) return;
  const t=S.timers;
  for(const k in AUTO_INTERVAL) t[k]=(t[k]||0)+dt;
  const iv=k=>AUTO_INTERVAL[k]*m.autoSpeed;

  if(autoOK('gather')&&t.gather>=iv('gather')){t.gather=0;gather()}
  if(autoOK('build')&&t.build>=iv('build')){
    t.build=0;
    /* 하나 사고 멈추면 마나가 넉넉할 때 늘 위 단계에서 끊겨 아래 단계가 방치된다.
       위에서 아래로 훑되 예산(남은 마나의 일부) 이 허락하는 단계는 모두 산다. */
    for(let i=PRODUCERS.length-1;i>=0;i--){
      if(tierLocked(i)) continue;
      if(m.autoMax){
        const n=maxAfford(i), cn=n>0?costLogOf(i,n):Infinity;
        if(n>0&&cn<=S.manaL+L10(0.5)){S.manaL=logSub(S.manaL,cn);S.bought[i]+=n;recalc();continue}
      }
      const c=costLogOf(i,1);
      if(c<=S.manaL+L10(0.25)){S.manaL=logSub(S.manaL,c);S.bought[i]++;recalc()}
    }
  }
  if(autoOK('research')&&t.research>=iv('research')){
    t.research=0;
    if(!(ch&&ch.rule.noResearch))
      /* 하나 사고 멈추면 마나가 넘쳐도 연구가 0.8 초에 하나씩 기어간다.
         선행이 풀리는 것까지 이어 사도록 살 수 있는 만큼 훑는다. */
      for(let pass=0;pass<8;pass++){
        let did=0;
        for(const r of RESEARCH){
          if(S.research[r.id]||(r.req&&!S.research[r.req])) continue;
          const rl=numLog(r.cost);
          if(S.manaL>=rl){ S.manaL=logSub(S.manaL,rl); S.research[r.id]=1; did++ }
        }
        if(!did) break;
        recalc();
      }
  }
  if(autoOK('rune')&&t.rune>=iv('rune')){
    t.rune=0;
    const cap=Math.floor(m.runeCap);
    let did=0;
    for(const r of [...RUNES].sort((a,b)=>costLogAt(runeCost,S.runes[a.id]||0)-costLogAt(runeCost,S.runes[b.id]||0))){
      const l=S.runes[r.id]||0; if(l>=cap) continue;
      const {n,costLog}=buyBulkLog(runeCost,l,curL('offering')-L10(RUNES.length),cap-l);
      if(n>0){ spendRes('offering',costLog); S.runes[r.id]=l+n; did+=n }
    }
    if(did) recalc()
  }
  if(autoOK('gear')&&t.gear>=iv('gear')){
    t.gear=0;
    let did=0;
    for(const g of [...GEAR].sort((a,b)=>costLogAt(gearCost,S.gear[a.id]||0)-costLogAt(gearCost,S.gear[b.id]||0))){
      const l=S.gear[g.id]||0;
      const {n,costLog}=buyBulkLog(gearCost,l,curL('crystal')-L10(GEAR.length),Infinity);
      if(n>0){ spendRes('crystal',costLog); S.gear[g.id]=l+n; did+=n }
    }
    if(did) recalc()
  }
  // 영혼 / 유물 강화 자동 (가장 싼 것부터)
  if(autoOK('soulup'))  autoBuyTree(SOUL_UPS,'soulUps','soul');
  if(autoOK('relicup')) autoBuyTree(RELIC_UPS,'relicUps','relic');
  // 환생 / 승천 · 직전 회차보다 확실히 나아졌을 때만
  /* "직전 회차의 1.5 배" 만 조건으로 두면 이득이 정체되는 순간 영영 넘어가지
     않는다. 실제로 삼십 분을 돌려도 환생이 다섯 번뿐이었고, 환생·승천 횟수를
     보는 업적이 통째로 멈췄다. 나아지면 바로 넘어가되, 회차가 충분히 길어지면
     더 나아지지 않아도 넘어간다. */
  if(autoOK('rebirth')&&!S.chal&&S.sinceRebirth>60){
    const g=soulGain();
    if(g>=10&&(g>=1.2*(S.lastSoulGain||0)||S.sinceRebirth>240)) doRebirth(true);
  }
  if(autoOK('ascend')&&!S.chal&&S.sinceAscend>90){
    const g=relicGain();
    if(g>=3&&(g>=1.2*(S.lastRelicGain||0)||S.sinceAscend>360)) doAscend(true);
  }
  /* 첫 돌파는 손으로 해야 한다 — 아래 계층을 통째로 갈아 넣는 결정이기 때문이다.
     한 번 해 본 뒤로는 그 계층을 자동으로 뚫는다. 위 계층부터 살핀다.
     단, 시련 중에는 미룬다. 돌파가 시련을 즉시 깨뜨리는 바람에 자동 시련이
     들어가자마자 쫓겨나고 쿨다운만 다시 차오르길 반복해, 스물다섯 달을 돌려도
     시련이 두 단계에서 멈춰 있었다. 시련에는 900 초 제한이 있으니 오래 밀리지 않는다. */
  if(!S.chal && S.sinceInf>=INF_AUTO_CD){
    for(let i=INF_LAYERS.length-1;i>=0;i--){
      const L=INF_LAYERS[i];
      const key = i===0 ? 'inf' : 'brk'+L.k;
      if(!autoOK(key)) continue;
      if(i>0 && (S[L.k+'Count']||0)<1) continue;   // 아직 손으로 한 번도 안 뚫었다
      if(!infUnlocked(i)||infGain(i)<=0) continue;
      doInfBreak(i); break;
    }
  }
  if(autoOK('starup')) autoBuyTree(STAR_UPS,'starUps','star');
  for(const L of INF_LAYERS){
    if(!L.ups) continue;
    if(autoOK('up'+L.k)) autoBuyTree(L.ups(), L.store, L.k);
  }
  /* 자동 시련이 환생 직후에만 걸려 있었다. 자동 환생을 끄면 영영 발동하지 않는다.
     자동화 고리에서도 직접 걸되, 들어가기 전에 회차를 정산해 손해가 없게 한다. */
  if(autoOK('chal')&&!S.chal&&(S.chalCd||0)<=0){
    if(soulGain()>0) doRebirth(true);      // doRebirth 안에서 시련 진입을 시도한다
    if(!S.chal) autoEnterChallenge();
  }
  if(autoOK('trans')&&!S.chal&&S.sinceTrans>180){
    const g=starGain();
    if(g>=2&&(g>=1.2*(S.lastStarGain||0)||S.sinceTrans>600)) doTranscend(true);
  }
}
