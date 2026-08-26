import { LANG, X } from './core'
import { CHALLENGES, GEAR, RUNES } from './content'
import { S } from './state'

/* ══════════════ 유틸 ══════════════ */
/* ── 숫자 표기 사다리 ─────────────────────────
   1,234 → 1.23M → 1.23B → 1.23T → 1.23aa … 1.23zz(1e2040)
   → 1.23aaa … 1.23zzz(1e54,768) → e54,771 → ee4.74 → eee → (e^12)3.4
   문자는 세 자리까지 쓰고 그 위로는 지수를 층으로 쌓는다. 끝은 없다. */
export const SUF1=['K','M','B','T'];
export const SUF_MAX_TIER=4+676+17576;          // T 다음 aa..zz 676개, aaa..zzz 17576개
export function suffixOf(tier){
  if(tier<=4) return SUF1[tier-1];
  let n=tier-5, len=2, count=676;
  while(n>=count){ n-=count; len++; count=Math.pow(26,len); }
  let s='';
  for(let i=0;i<len;i++){ s=String.fromCharCode(97+(n%26))+s; n=Math.floor(n/26); }
  return s;
}
export function headNum(m){
  return m<10?m.toFixed(2):m<100?m.toFixed(1):String(Math.round(m));
}
/* 자릿수(밑 10 로그)를 글자로 */
export function fmtLog(l){
  if(typeof l!=='number'||isNaN(l)) return '0';
  if(l===Infinity) return '∞';
  if(l===-Infinity) return '0';
  if(l<6){                                  // 백만 아래는 쉼표로 그대로 읽힌다
    const v=Math.pow(10,l);
    if(v<10) return (Math.round(v*100)/100).toString();
    if(v<100) return (Math.round(v*10)/10).toString();
    return Math.round(v).toLocaleString(LANG==='en'?'en-US':'ko-KR');
  }
  const tier=Math.floor(l/3);
  if(tier<=SUF_MAX_TIER) return headNum(Math.pow(10,l-tier*3))+suffixOf(tier);
  let layer=1, v=l;
  while(v>=1e6&&layer<1e9){ v=L10(v); layer++; }   // 1e6 아래는 e 한 겹으로 읽힌다 (e54,771)
  const h=v>=1000?Math.round(v).toLocaleString():v>=100?v.toFixed(1):v.toFixed(2);
  return layer<=4?'e'.repeat(layer)+h:'(e^'+layer+')'+h;
}
/* 설명 문구도 자릿수로 적는다. b^e 는 e 가 조금만 커져도 ∞ 가 되어
   화면에 "×∞ → ×∞" 만 남고, 백분율은 2.1e+73% 같은 날 숫자가 새어 나왔다. */
export const powTxt=(b,e)=>fmtLog(e*L10(b));
export const pctTxt=v=>(!isFinite(v)?'∞':Math.abs(v)<1e4?v.toFixed(1):fmt(v));
/* 절감률은 99.9% 를 넘어서면 100.0% 에 붙어 버려 더 나아지는 것이 안 보인다.
   그때부터는 깎인 몫이 아니라 남는 몫을 "1/1e12" 처럼 적는다. */
export const cutTxt=(b,e)=>{ const l=-e*L10(b); return l<3 ? (Math.pow(10,-l)*100).toFixed(1)+'%' : '1/'+fmtLog(l); };
export function fmt(n){
  if(n===Infinity) return '∞';
  if(n===-Infinity) return '-∞';
  if(typeof n!=='number'||isNaN(n)) return '0';   // 망가진 값만 0. 무한대는 무한대로 보여 준다.
  if(n<0) return '-'+fmt(-n);
  if(n===0) return '0';
  if(n<1e3){
    if(n<10) return (Math.round(n*100)/100).toString();
    if(n<100) return (Math.round(n*10)/10).toString();
    return Math.floor(n).toString();
  }
  if(n<1e6) return Math.floor(n).toLocaleString(LANG==='en'?'en-US':'ko-KR');
  return fmtLog(Math.log10(n));                 // 백만 위로는 같은 사다리를 탄다
}

/* 일(日) 위로 단위가 없어서, 층을 못 깨는 상황의 소요 시간이
   "2.3996858804125987e+37일 2시간" 처럼 날 지수 그대로 새어 나왔다.
   년까지 올리고, 그 위로는 숫자를 읽는 의미가 없으니 말로 적는다. */
export function fmtTime(s){
  if(typeof s!=='number'||isNaN(s)) return '—';
  if(s<0) return '—';
  if(!isFinite(s)) return X('닿지 않는다','out of reach');
  s=Math.floor(s);
  const U=LANG==='en'?['s','m','h','d','y']:['초','분','시간','일','년'];
  if(s<60) return s+U[0];
  if(s<3600) return Math.floor(s/60)+U[1]+' '+(s%60)+U[0];
  if(s<86400) return Math.floor(s/3600)+U[2]+' '+Math.floor(s%3600/60)+U[1];
  const YEAR=86400*365;
  if(s<YEAR) return Math.floor(s/86400)+U[3]+' '+Math.floor(s%86400/3600)+U[2];
  const y=s/YEAR;
  if(y>1.38e10) return X('닿지 않는다','out of reach');   // 우주 나이를 넘으면 그냥 못 깬다
  return fmt(y)+U[4];
}
/* 시설 수도 자릿수가 진실이다. 산 것(bought)은 정수라 그대로 두고,
   윗 단계가 만들어 낸 것(genL)만 로그로 센다 — 이쪽이 1e308 을 넘어간다.
   S.gen 은 세이브 호환과 옛 조건식을 위한 읽기 전용 파생값. */
export const genNum=l=>((typeof l!=='number'||isNaN(l)||l===-Infinity)?0:(l<300?Math.pow(10,l):Infinity));
export function syncGen(){ for(let i=0;i<S.genL.length;i++) S.gen[i]=genNum(S.genL[i]); }
export const cntLog=i=>logAdd(numLog(S.bought[i]),S.genL[i]);
export const cnt=i=>S.bought[i]+S.gen[i];
export const achCount=()=>Object.keys(S.achs).length;
export const runeTotal=()=>RUNES.reduce((a,r)=>a+(S.runes[r.id]||0),0);
export const gearTotal=()=>GEAR.reduce((a,g)=>a+(S.gear[g.id]||0),0);
export const chalTotal=()=>CHALLENGES.reduce((a,c)=>a+(S.chalDone[c.id]||0),0);
export const curChal=()=>S.chal?CHALLENGES.find(c=>c.id===S.chal):null;
export function startManaLog(l){return l<=0?-Infinity:2*l}
export function startMana(l){const x=startManaLog(l);return x<300?Math.pow(10,x):Infinity}

/* 체력과 공격력을 그대로 곱하면 1e308 에서 ∞ 가 되고 ∞/∞ 가 NaN 이 된다.
   둘 다 '자릿수'(밑 10 로그)로 다룬다. 로그는 층수에 비례해 선형이라 넘치지 않는다. */
export const L10=Math.log10;
export function safeLog(v){ return (typeof v==='number'&&v>0&&isFinite(v))?L10(v):(v>0?308:0); }
/* 마나 계열은 0 이 진짜 0 이어야 한다 — safeLog 는 0 을 0(=10^0) 으로 돌려주므로 따로 쓴다. */
export function numLog(v){ return (typeof v==='number'&&v>0)?(isFinite(v)?L10(v):308):-Infinity; }
/* 로그 공간 덧셈·뺄셈. a,b 는 각각 log10 값이다. */
export function logAdd(a,b){            // log10(10^a + 10^b)
  if(isNaN(a)) return b; if(isNaN(b)) return a;
  if(a===-Infinity) return b;
  if(b===-Infinity) return a;
  const hi=Math.max(a,b), lo=Math.min(a,b);
  if(hi-lo>17) return hi;        // 차이가 크면 작은 쪽은 묻힌다
  return hi+L10(1+Math.pow(10,lo-hi));
}
export function logSub(a,b){            // log10(10^a - 10^b), a>=b
  if(isNaN(a)||isNaN(b)) return isNaN(a)?-Infinity:a;
  if(b===-Infinity) return a;
  if(a<=b) return -Infinity;
  if(a-b>17) return a;
  return a+L10(1-Math.pow(10,b-a));
}
/* 등비합 log10((g^n-1)/(g-1)) — g^n 이 넘쳐도 자릿수는 멀쩡하다 */
export function geoSumLog(g,n){
  if(!(n>0)) return -Infinity;
  const lg=L10(g);
  if(n*lg>15) return n*lg-L10(g-1);
  return numLog((Math.pow(g,n)-1)/(g-1));
}

/* ── 지수가 double 을 넘을 때의 표기 ────────────────
   장비 효과 지수(gearPow)는 강화 다섯 갈래가 곱으로 쌓여 금세 1e308 을 넘는다.
   그러면 평범한 수로는 ∞ 가 되어 화면이 "×∞ → ×∞" 로만 남는다.
   지수를 그대로 받지 않고 지수의 자릿수를 받아, 필요하면 층을 더 쌓아 적는다. */
export function layerTxt(LL){          // 값의 자릿수가 10^LL 일 때 그 값을 적는다
  if(!isFinite(LL)) return LL>0?'∞':'1';
  if(LL<300) return fmtLog(Math.pow(10,LL));
  let layer=2, v=LL;
  while(v>=1e6&&layer<1e9){ v=L10(v); layer++; }
  const h=v>=1000?Math.round(v).toLocaleString():v>=100?v.toFixed(1):v.toFixed(2);
  return layer<=4?'e'.repeat(layer)+h:'(e^'+layer+')'+h;
}
/* b^(l·p) · p 는 10^pLog */
export function powTxtL(b,l,pLog){
  if(!(l>0)) return '1';
  return layerTxt(numLog(l)+pLog+numLog(L10(b)));
}
/* l·p 그 자체 (백분율 따위) */
export function mulTxtL(l,pLog){
  if(!(l>0)) return '0';
  return fmtLog(numLog(l)+pLog);
}
/* b^(l·p) 가 1 보다 작을 때 — 남는 몫을 "1/..." 로 적는다 */
export function cutTxtL(b,l,pLog){
  if(!(l>0)) return '100.0%';
  const LL=numLog(l)+pLog+numLog(-L10(b));    // log10( 남는 몫의 자릿수 )
  if(LL<0.5){ const d=Math.pow(10,LL); return (Math.pow(10,-d)*100).toFixed(1)+'%' }
  return '1/'+layerTxt(LL);
}

/* 1 보다 작아지는 배수 — 0.88^100 은 2e-6 이라 toFixed(3) 로는 "×0.000" 이 된다.
   작아지면 "1/..." 로 뒤집어 적는다. */
export function smallMul(v){
  if(!(v>0)) return '0';
  if(v>=0.001) return v.toFixed(3);
  return '1/'+fmt(1/v);
}

/* ── 화폐와 비용을 자릿수로 ────────────────────────
   영혼석·유물·별가루·결정·오퍼링은 평범한 수여서 safeAdd 의 1e300 상한에
   붙어 버렸고, 강화 비용도 레벨 1340 쯤에서 그대로 ∞ 가 되어 더 살 수 없었다.
   비용 곡선은 전부 base·g^l 꼴이라 레벨 0 과 1 만 보면 어떤 레벨의 비용도
   자릿수로 정확히 나온다 — c(l) 을 직접 부를 이유가 없다. */
export const RES=['soul','relic','star','crystal','offering'];
export function curL(k){ const v=S[k+'L']; return (typeof v==='number'&&!isNaN(v))?v:-Infinity }
export function syncRes(k){ const l=curL(k); S[k]=l<308?Math.pow(10,l):Infinity }
export function gainRes(k,addLog){
  if(!(addLog>-Infinity)) return;
  S[k+'L']=logAdd(curL(k),addLog);
  const e=k==='offering'?'offerEver':k+'Ever';
  S[e+'L']=logAdd((typeof S[e+'L']==='number'&&!isNaN(S[e+'L']))?S[e+'L']:-Infinity,addLog);
  S[e]=S[e+'L']<308?Math.pow(10,S[e+'L']):Infinity;
  syncRes(k);
}
export function spendRes(k,costLog){ S[k+'L']=logSub(curL(k),costLog); syncRes(k) }
export function setRes(k,l){ S[k+'L']=l; syncRes(k) }

/* base·g^l 의 자릿수 */
export function ratioOf(costFn){ const c0=costFn(0); return costFn(1)/c0 }
export function costLogAt(costFn,l){ return numLog(costFn(0))+l*L10(ratioOf(costFn)) }
/* 레벨 l 부터 n 단계를 사는 값의 자릿수 */
export function bulkCostLog(costFn,l,n){ return costLogAt(costFn,l)+geoSumLog(ratioOf(costFn),n) }
/* 예산(자릿수) 으로 살 수 있는 단계 수 */
export function bulkMaxLog(costFn,l,budgetLog){
  const g=ratioOf(costFn); if(!(g>1)) return 0;
  const lg=L10(g);
  const A=budgetLog+L10(g-1)-costLogAt(costFn,l);   // log10( 예산·(g-1)/c(l) )
  if(!(A>-300)) return 0;
  const n = A>15 ? A/lg : L10(1+Math.pow(10,A))/lg;
  return Math.max(0,Math.floor(n));
}
