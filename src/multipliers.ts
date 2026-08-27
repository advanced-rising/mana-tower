import { INF_LAYERS } from './layers'
import { PRODUCERS } from './producers'
import { CHALLENGES, GEAR, MILESTONES, RELIC_UPS, RESEARCH, RUNES, SOUL_UPS, STAR_UPS } from './content'
import { MC, S, setMC } from './state'
import { L10, achCount, capFrom, cntLog, curChal, gearOpen, geoSumLog, logAdd, logSub, numLog } from './num'
import { cosmosBonus, cosmosBonusLog, floorLoot } from './dungeon'
import { infBonus, infBonusLog } from './prestige'
import { log } from './tick'

/* ══════════════ 배율 계산 ══════════════ */
/* 배율도 마나·비용처럼 자릿수(log10)가 진실이다.
   강화 정의(apply)는 하나도 건드리지 않는다. 대신 항목을 하나씩 빈 그릇에 따로 적용해
   그 항목이 만든 배수만 재고, 로그로 더한다. 한 항목이 혼자 1e308 을 넘기면
   레벨을 잘게 줄여 재고 로그를 그만큼 도로 키운다 — 이 게임의 곱셈 강화는 전부
   base^(레벨에 선형인 식) 꼴이라 이렇게 재도 값이 같다.
   m.<필드>Log 가 진실이고 m.<필드> 는 읽기 전용 파생값이다. */
export const MUL_FIELDS=['prod','t0','tUp','speed','soul','offer','crystal','dungeon','relic',
                  'floorLoot','boss','gearPow','autoSpeed','chalPow','costMul'];
export const ADD_FIELDS=['runeCap','offline'];
/* floorPct 만 예외 — 곱셈(×1.07^l)·덧셈(+0.02l)·max 가 섞여 있다.
   섞여 있어도 '적용 전 값 대비 배수'로 재면 셋 다 그대로 로그가 된다.
   그래서 되먹임되는 두 값(floorPct·gearPow)만 진짜 값을 그릇에 넣어 준다. */
export const SEED_CAP=1e250;                    // 되먹임 값이 이보다 커지면 여기서 자른다
export const deriveNum=l=>(isNaN(l)?1:(l<308?Math.pow(10,l):Infinity));   // double 이 버티는 끝까지는 옛 값 그대로 준다
export const deriveSeed=l=>(isNaN(l)?1:(l<250?Math.pow(10,l):SEED_CAP));
export const _sm={prod:1,t0:1,tUp:1,speed:1,soul:1,offer:1,crystal:1,dungeon:1,relic:1,
  floorPct:0.02,floorLoot:1,boss:1,costMul:1,runeCap:25,gearPow:1,gearExp:1,
  autoSpeed:1,offline:4,chalPow:1,autoMax:false};      // 항목 하나를 잴 때만 쓰는 그릇
/* 장비 강화는 지수 자체를 곱한다 — 지수의 지수라 어떤 비용 곡선으로도 못 막는다.
   지수 배율을 그대로 쓰지 않고 그 자릿수만 더해 준다: ×1e248 이 ×249 가 된다.
   여전히 끝없이 자라지만 한 겹만 자란다. */
export const gearExpOf=gp=>1+Math.max(0,(gp>0&&isFinite(gp))?L10(gp):250);
export function _seedM(gp,fp,rc,off){
  for(let i=0;i<MUL_FIELDS.length;i++) _sm[MUL_FIELDS[i]]=1;
  _sm.gearPow=gp; _sm.gearExp=gearExpOf(gp); _sm.floorPct=fp; _sm.runeCap=rc; _sm.offline=off; _sm.autoMax=false;
}
/* ── 레벨이 배율에 실리는 방식 ────────────────────────
   강화 하나하나가 레벨에 지수로 붙는데(1.15^l 꼴) 레벨이 조 단위까지 오른다.
   백 개가 곱으로 쌓이면 어떤 비용 곡선을 써도 배율이 터진다 — 한 틱에 레벨이
   1,269 에서 6조로 뛰고 생산 배율이 10^(2.5e249) 이 되던 자리다.
   천 단계까지는 설계한 대로 그대로 세고, 그 위로는 레벨이 열 배가 될 때마다
   천 단계씩만 더 쳐 준다. 여전히 끝없이 오르지만 로그로 오른다.
   여기 한 곳만 고치면 apply 백여든 개를 건드리지 않아도 전부에 적용된다. */
export const SOFT_LEVEL=1000;
export function effLevel(l){
  if(!(typeof l==='number'&&l>SOFT_LEVEL)) return l;
  return SOFT_LEVEL*(1+L10(l/SOFT_LEVEL));
}
/* 항목 하나를 재서 st 에 로그로 얹는다. lv 를 주면 넘칠 때 잘게 줄여 잰다. */
export function foldUp(st,fn,lv0){
  const lv=effLevel(lv0);
  const scalable=(typeof lv==='number'&&isFinite(lv)&&lv>0);
  let f=1;
  for(let it=0;it<400;it++){
    const sg=st.gearPow, sf=st.floorPct;
    _seedM(sg,sf,st.runeCap,st.offline);
    try{ fn(_sm, scalable?lv*f:lv); }catch(e){ return; }
    let ok=(_sm.floorPct>0&&isFinite(_sm.floorPct)&&_sm.gearPow>0&&isFinite(_sm.gearPow));
    if(ok) for(let i=0;i<MUL_FIELDS.length;i++){
      const v=_sm[MUL_FIELDS[i]]; if(!(v>0)||!isFinite(v)){ ok=false; break; }
    }
    if(!ok){
      if(!scalable) return;              // 레벨이 없는 항목은 줄일 수 없다
      f*=(it<10?0.5:1e-3);               // 처음엔 반씩, 그래도 넘치면 크게 줄인다
      continue;
    }
    const inv=1/f;
    for(let i=0;i<MUL_FIELDS.length;i++){
      const k=MUL_FIELDS[i];
      if(k==='gearPow'){ if(_sm.gearPow!==sg) st.gearPowL+=L10(_sm.gearPow/sg)*inv; }
      else if(_sm[k]!==1) st[k+'L']+=L10(_sm[k])*inv;
    }
    if(_sm.floorPct!==sf) st.floorPctL+=L10(_sm.floorPct/sf)*inv;
    for(let i=0;i<ADD_FIELDS.length;i++){ const k=ADD_FIELDS[i]; if(_sm[k]!==st[k]) st[k]=_sm[k]; }
    if(_sm.autoMax) st.autoMax=true;
    st.gearPow=deriveSeed(st.gearPowL);
    st.floorPct=deriveSeed(st.floorPctL);
    return;
  }
}
export function computeM(){
  const st={runeCap:25,offline:4,autoMax:false,gearPow:1,floorPct:0.02,floorPctL:L10(0.02)};
  for(let i=0;i<MUL_FIELDS.length;i++) st[MUL_FIELDS[i]+'L']=0;
  const ch=curChal();
  if(!(ch&&ch.rule.noResearch)) for(const r of RESEARCH) if(S.research[r.id]) foldUp(st,r.apply);
  if(!(ch&&ch.rule.noRelicGear)){
    for(const r of RUNES){const l=S.runes[r.id]||0; if(l) foldUp(st,r.apply,l);}
    /* 지금 장의 장비만 힘이 된다 — 물러난 장비는 창고에 남을 뿐이다.
       레벨은 지우지 않는다. 그 장으로 되돌아가면 그대로 다시 쓰인다. */
    for(const g of GEAR){const l=S.gear[g.id]||0; if(l&&gearOpen(g)) foldUp(st,g.apply,l);}
  }
  for(const u of SOUL_UPS){const l=S.soulUps[u.id]||0; if(l) foldUp(st,u.apply,l);}
  for(const u of RELIC_UPS){const l=S.relicUps[u.id]||0; if(l) foldUp(st,u.apply,l);}
  for(const u of STAR_UPS){const l=S.starUps[u.id]||0; if(l) foldUp(st,u.apply,l);}
  for(const L of INF_LAYERS){
    if(!L.ups) continue;
    const store=S[L.store]||{};
    for(const u of L.ups()){ const l=store[u.id]||0; if(l) foldUp(st,u.apply,l); }
  }
  { const v=infBonusLog();               // 자릿수로 받는다 — 이제 상한이 없다
    st.prodL+=v; st.soulL+=v; st.offerL+=v; st.crystalL+=v; st.dungeonL+=v; st.relicL+=v; }
  { const cp=deriveSeed(st.chalPowL);
    for(const c of CHALLENGES){const n=S.chalDone[c.id]||0; if(n) foldUp(st,c.apply,n*cp);} }
  /* 이정표는 "환생 200회" 처럼 영구 보상으로 읽히는데 회차 값을 보고 있어서
     승천 한 번에 전부 사라졌다. 줄지 않는 누적 횟수를 본다. */
  for(const ms of MILESTONES) if((S.rebirthEver||S.rebirths)>=ms.n) foldUp(st,ms.apply);
  st.prodL+=L10(1+0.02*achCount());
  st.prodL+=L10(1+0.05*S.rebirths);
  /* 던전을 깬 보람(깊이 배율) 은 기록을 따른다. 층은 프레스티지마다 1 층으로
     돌아가지만 그때마다 배율까지 떨어뜨리면, 되밟는 십여 초 동안 애써 내려간
     몫이 통째로 사라진다. 깊이는 최전선에서 실제 시간으로만 자라 폭주하지
     않으므로, 기록을 배율로 두어도 안전하다. */
  const depth=Math.max(S.floor||1,S.deepest||1);
  st.prodL+=logAdd(0,st.floorPctL+numLog(depth));      // 1+floorPct*최심층
  { const v=cosmosBonusLog(depth);                     // 행성·행성계·은하를 넘길 때마다
    st.prodL+=v; st.soulL+=v; st.offerL+=v; st.crystalL+=v; st.dungeonL+=v; }
  st.dungeonL+=L10(1+0.03*depth);
  if(ch&&ch.rule.drain) st.prodL-=L10(ch.rule.drain);   // 나누기는 로그에서 빼기다
  if(ch&&ch.rule.slow) st.speedL-=L10(ch.rule.slow);
  st.autoSpeedL=Math.max(L10(0.15),st.autoSpeedL);
  /* 룬·장비 최대 레벨은 강화 레벨에 선형으로 붙어 있었다(+200 씩). 강화가 수천
     레벨이 되면 상한이 수십만이 되고, 한 레벨마다 붙는 고정 배수가 그대로 곱해져
     배율이 10^600 을 넘는다 — 승천을 해도 그 배율이 남아 한 틱 만에 제자리가 된다.
     상한도 로그로 묶는다. 강화를 아무리 올려도 몇백 레벨 언저리에 머문다.
     장비는 상한이 아예 없었다 — 룬과 같은 상한을 쓴다(결정 쪽이 넉넉하니 1.5배). */
  const rc=capFrom(st.runeCap);
  const m={autoMax:st.autoMax,runeCap:rc,gearCap:Math.floor(rc*1.5),offline:st.offline,
           floorPctLog:st.floorPctL,floorPct:deriveNum(st.floorPctL),
           gearExp:1+Math.max(0,st.gearPowL)};      // 지수는 자릿수만 실린다
  for(let i=0;i<MUL_FIELDS.length;i++){
    const k=MUL_FIELDS[i], l=st[k+'L'];
    m[k+'Log']=l; m[k]=deriveNum(l);     // 옛 코드가 읽는 평범한 수는 파생값으로 남긴다
  }
  return m;
}
export function recalc(){setMC(computeM()); syncMana();}
/* 배율을 지금 다시 재지 않고 '낡았다' 고만 표시한다 — 다음에 M() 을 읽을 때
   한 번만 다시 접는다. 업적처럼 틱 도중에 조용히 바뀌는 입력에 쓴다. */
export function invalidateM(){ setMC(null) }
/* ── 배율이 낡았는지 알아보는 서명 ────────────────────
   여기는 '틱이 바꿀 수 있는 입력' 을 손으로 적어 둔 목록이었다. 목록은 손으로 적는
   한 반드시 뒤처진다 — 연구·장비·영혼·별·무한·영원 강화 여섯 갈래가 빠져 있었고,
   그래서 아이템을 올려도 배율은 옛 값에 굳어 있었다. 화면의 숫자가 멈춘 채로 있다가
   환생을 누르는 순간 되살아난 것이 이것이다: 돌파 횟수는 목록에 들어 있었으니까.
   이제 목록을 적지 않는다. computeM 이 읽는 창고를 그대로 훑어 서명을 만든다.
   빠뜨릴 목록이 없으니 다시 뒤처질 수 없다.
   값은 가진 항목 수에만 비례한다 — 항목마다 배율을 접는 computeM 에 비하면
   거의 공짜다(548 항목에서 훑기 0.02ms, 접기 6ms). */
const SIG_STORES=['research','runes','gear','soulUps','relicUps','starUps','chalDone','achs'];
function storeSig(o){
  let sum=0, mix=0;
  if(o) for(const k in o){
    const v=(o as any)[k];
    if(!v) continue;
    let h=0; for(let i=0;i<k.length;i++) h=(h*31+k.charCodeAt(i))|0;
    /* 레벨 합만 보면 하나 오르고 하나 내린 것이 서로 지워진다 — 이름도 섞는다.
       레벨이 조 단위까지 가므로 자릿수로 눌러 담아야 정밀도가 남는다. */
    sum+=v; mix+=h*(1+Math.log(1+v));
  }
  return sum+'~'+(mix|0);
}
export function mSignature(){
  const ch=curChal();
  let s=`${S.floor|0}|${S.deepest|0}|${S.deepestEver|0}|${S.rebirths|0}|${S.rebirthEver|0}|`
    +`${S.ascensions|0}|${S.transcends|0}|`
    +`${S.inf||0}|${S.eter||0}|${S.real||0}|${S.void||0}|${S.origin||0}|${ch?ch.id:''}`;
  for(let i=0;i<SIG_STORES.length;i++) s+='|'+storeSig(S[SIG_STORES[i]]);
  for(let i=0;i<INF_LAYERS.length;i++) s+='|'+storeSig(S[INF_LAYERS[i].store]);
  return s;
}
export function M(){ if(!MC) setMC(computeM()); return MC }

/* 증가율을 덧셈으로 깎으면 하한(1.05)에 금방 막혀 더 사도 아무 일이 없다.
   증가분(g-1) 자체를 곱으로 깎아 계속 줄어들되 1 아래로는 안 가게 한다. */
export function growth(i){return Math.max(1.0005,1+(PRODUCERS[i].g-1)*M().costMul)}
/* ── 시설 값을 남은 배율에 묶는다 ──────────────────
   프레스티지가 마나와 시설을 0 으로 되돌려도, 살아남은 배율이 10^400 이면
   한 틱 만에 전부 되사진다 — 초기화가 눈속임이 된다. 실제로 승천 직후 시설
   서른세 개로 생산이 10^414/초였고, 0.4 초 만에 원래 자리로 돌아왔다.
   값이 생산력을 따라 오르면 다시 오르는 데 걸리는 시간이 회차마다 비슷해진다.
   지수를 1 보다 조금 작게 두어, 그 차이만큼이 프레스티지의 순이득이 된다. */
export const COST_ANCHOR=0.6;
/* 값을 정하는 것은 '이번 회차를 시작할 때 들고 온 배율' 이다. 회차 중에 번 배율까지
   값에 얹으면 회차 안 진행까지 같이 눌려, 한 시간을 돌려도 제자리였다.
   들고 온 만큼만 값에 얹으면, 회차 안에서는 예전처럼 뻗어 나가고
   프레스티지 직후에는 처음처럼 다시 올라야 한다. */
/* 값의 기준은 단계마다 다르다. 0 단계는 마나를 뽑을 뿐이지만, 위 단계는 아래
   단계를 '비용 없이' 만들어 낸다 — 그 생성 배율(tUp)까지 값에 얹지 않으면 위
   단계가 제 값을 안 내고, 한 틱 만에 연쇄에 불이 붙는다. */
export function anchorLog(i){
  const a=S.anchorL, b=S.anchorUpL;
  const base=(typeof a==='number'&&a>0)?a:0;
  if(!(i>0)) return base;
  return base+((typeof b==='number'&&b>0)?b:0);
}
export function setAnchor(){
  const m=M();
  const p=(m.prodLog||0)+(m.t0Log||0), u=(m.tUpLog||0);
  S.anchorL   = p>0?COST_ANCHOR*p:0;
  S.anchorUpL = u>0?COST_ANCHOR*u:0;
}
/* 비용은 자릿수(log10)로 센다. g^bought 는 금방 1e308 을 넘지만 자릿수는 넘지 않는다. */
export function costLogOf(i,n){
  const g=growth(i),b=S.bought[i];
  return numLog(PRODUCERS[i].base)+anchorLog(i)+b*L10(g)+geoSumLog(g,n);
}
export function costOf(i,n){ const l=costLogOf(i,n); return l<300?Math.pow(10,l):Infinity; }
export function maxAfford(i){
  const g=growth(i),b=S.bought[i],lg=L10(g);
  const x=S.manaL-numLog(PRODUCERS[i].base)-anchorLog(i)-b*lg;   // log10(mana / (base*g^bought))
  if(isNaN(x)||x===-Infinity) return 0;
  let n;
  if(x>300){ n=Math.floor((x+L10(g-1))/lg); }       // 10^x 가 넘치는 구간은 근사식으로
  else{ const v=Math.pow(10,x)*(g-1)+1; n=v<=1?0:Math.floor(Math.log(v)/Math.log(g)); }
  if(!isFinite(n)||n<0) n=0;
  n=Math.min(n,1e12);
  let k=0;                                          // 부동소수 오차만큼만 되돌린다
  while(n>0&&costLogOf(i,n)>S.manaL&&k++<64) n--;
  k=0;
  while(costLogOf(i,n+1)<=S.manaL&&k++<64) n++;
  return n;
}
export function tierLocked(i){const ch=curChal();return !!(ch&&ch.rule.maxTier!==undefined&&i>ch.rule.maxTier)}
export function buyProducer(i){
  if(tierLocked(i)) return false;
  const n=S.buyAmt==='max'?maxAfford(i):S.buyAmt;
  if(n<=0) return false;
  const cl=costLogOf(i,n);
  if(!(S.manaL>=cl)) return false;
  S.manaL=logSub(S.manaL,cl); S.bought[i]+=n; recalc(); return true;
}
/* 각 항을 따로 로그로 바꿔 더한다 — 곱하는 순간 넘치던 자리가 여기서 풀린다 */
export function manaRateLog(){
  const m=M(), cl=cntLog(0);
  if(isNaN(cl)||cl===-Infinity) return -Infinity;
  return cl+numLog(PRODUCERS[0].rate)+m.t0Log+m.prodLog;
}
export function manaRate(){ const l=manaRateLog(); return l<300?Math.pow(10,l):Infinity; }
export function gatherAmountLog(){ return Math.max(0,manaRateLog()+L10(0.5)); }
export function gatherAmount(){ const l=gatherAmountLog(); return l<300?Math.pow(10,l):Infinity; }
export function gather(){addManaLog(gatherAmountLog());S.clicks++}
/* safeAdd 는 1e300 에서 값을 자르던 함수였다. 화폐가 전부 자릿수로 옮겨 가면서
   쓰이는 곳이 없어졌다 — 남겨 두면 다시 천장을 만드는 데 쓰이므로 지운다. */
/* 마나의 진실은 manaL / manaRunL / manaEverL (log10) 이다.
   S.mana / S.manaRun / S.manaEver 는 세이브 호환과 옛 조건식을 위한 읽기 전용 파생값. */
export function syncMana(){
  const f=l=>(isNaN(l)?0:(l<300?Math.pow(10,l):Infinity));
  S.mana=f(S.manaL); S.manaRun=f(S.manaRunL); S.manaEver=f(S.manaEverL);
}
export function addManaLog(vLog){
  if(isNaN(vLog)||vLog===-Infinity) return;
  S.manaL=logAdd(S.manaL,vLog);
  S.manaRunL=logAdd(S.manaRunL,vLog);
  S.manaEverL=logAdd(S.manaEverL,vLog);
  if(!(S.manaPeakL>=S.manaEverL)) S.manaPeakL=S.manaEverL;   // 돌파해도 줄지 않는다
  syncMana();
}
export function addMana(v){ addManaLog(numLog(v)); }
