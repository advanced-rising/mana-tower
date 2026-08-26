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
/* 층 지수도 일곱 자리를 넘으면 읽히지 않는다 — 쉼표를 넣되 소수는 남긴다 */
export const grouped=(v,d)=>v.toLocaleString(LANG==='en'?'en-US':'ko-KR',
  {minimumFractionDigits:d,maximumFractionDigits:d});
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
  /* 층을 너무 일찍 쌓으면 큰 값이 전부 같은 글자로 보인다 — e1e8 에서 90% 를
     써도 ee8.00 → ee8.00 이라 아무 일도 안 일어난 것처럼 읽혔다.
     자릿수를 쉼표로 그대로 적을 수 있는 데까지(1e15) 한 겹으로 두고,
     그 위로 층을 쌓을 때도 소수 넷째 자리까지 적어 변화를 잃지 않는다. */
  /* 자릿수를 통째로 적으면 e2,063,726,572,023 처럼 길어져 읽히지 않는다.
     백만을 넘으면 층을 쌓되 소수 넷째 자리까지 남겨, 값이 바뀌면 글자도 바뀐다. */
  let layer=1, v=l;
  while(v>=1e6&&layer<64){ v=L10(v); layer++; }
  const h = layer===1 ? Math.round(v).toLocaleString()
          : grouped(v, v>=1000?2:v>=100?3:4);
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

export function startMana(l){const x=startManaLog(l);return x<300?Math.pow(10,x):Infinity}

/* 환생 뒤에 다시 깔리는 공짜 시설.
   레벨마다 8·25·500·5000·10만 개씩 선형으로 주던 때는, 이 강화들이 승천에도
   살아남는 탓에 승천 직후 시설이 통째로 되돌아왔다 — 그러면 마나도 몇 초 만에
   제자리로 돌아온다. 초기화가 아니라 복원이었다.
   시작 지원금과 같은 뜻이다: 지루한 첫 걸음을 건너뛰라는 것이지 회차를 되돌리라는
   게 아니다. 로그로 붙여 아무리 올려도 몇백 개 언저리에 머물게 한다. */
export const freeRaw=()=>8*((S.relicUps||{}).a5||0)+25*((S.starUps||{}).t9||0)
  +500*((S.eterUps||{}).e13||0)+5000*((S.realUps||{}).r9||0)+1e5*((S.originUps||{}).o6||0);
export function freeFrom(raw){ return (raw>0&&isFinite(raw))?Math.floor(9*Math.log10(1+raw)):0 }
export const freeStart=()=>freeFrom(freeRaw());

/* 룬·장비 최대 레벨. 강화가 더해 준 원값(raw)을 로그로 접는다 —
   25 에서 시작해 원값이 20만이 되어도 350 언저리다. */
export const CAP_BASE=25;
export function capFrom(raw){
  const over=Math.max(0,(typeof raw==='number'&&isFinite(raw)?raw:CAP_BASE)-CAP_BASE);
  return CAP_BASE+Math.floor(60*Math.log10(1+over));
}

/* 체력과 공격력을 그대로 곱하면 1e308 에서 ∞ 가 되고 ∞/∞ 가 NaN 이 된다.
   둘 다 '자릿수'(밑 10 로그)로 다룬다. 로그는 층수에 비례해 선형이라 넘치지 않는다. */
export const L10=Math.log10;
/* 시작 지원금 — 환생 직후의 마나.
   레벨당 2 자릿수씩 선형으로 주던 때는, 777 레벨에서 환생마다 10^1554 를
   돌려받았다. 환생이 초기화가 아니라 복원이 되어 버려서, 갚아야 할 램프 없이
   프레스티지만 반복하면 수치가 끝없이 부풀었다.
   지원금은 지루한 처음 1 분을 건너뛰라고 있는 것이지 회차를 되돌리는 것이 아니다.
   레벨에 로그로 붙여 아무리 올려도 예순 자릿수 언저리에 머물게 한다. */
export const START_MANA_CAP=30;     // 지원금은 아무리 올려도 10^30 을 넘지 않는다
export function startManaLog(l){return l<=0?-Infinity:Math.min(START_MANA_CAP,20*L10(1+l))}
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
  while(v>=1e6&&layer<64){ v=L10(v); layer++; }
  const h = grouped(v, v>=1000?2:v>=100?3:4);
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

/* ── 비용은 초지수로 오른다 ────────────────────────
   비용이 base·g^l 이고 효과도 b^l 이면 둘이 상쇄되어 브레이크가 없다.
   예산이 10^B 일 때 살 수 있는 단계가 B 에 비례해 늘고, 그만큼 생산이
   또 지수로 커져 다음 회차 예산이 더 커진다 — 별 강화가 5.79e17 단계까지
   간 이유가 이것이고, 그래서 어떤 초기화도 0.2 초 만에 지워졌다.
   레벨의 제곱에 비례하는 항을 더하면 예산이 열 배가 돼도 단계는 조금만
   늘어난다(대략 √B). 상한은 여전히 없다 — 다만 천천히 오른다. */
export const COST_CURVE=0.0016;                 // 제곱항의 세기
export function ratioOf(costFn){ const c0=costFn(0); return costFn(1)/c0 }
export function costLogAt(costFn,l){
  const lg=L10(ratioOf(costFn));
  return numLog(costFn(0))+l*lg+COST_CURVE*lg*l*l;
}
/* 레벨 l 부터 n 단계를 사는 값의 자릿수.
   항이 초지수로 커지므로 합은 맨 윗 항이 지배한다 — 위에서부터 예순네 항만
   더해도 나머지는 스무 자리 아래라 묻힌다. */
export function bulkCostLog(costFn,l,n){
  if(!(n>0)) return -Infinity;
  const lg=L10(ratioOf(costFn)), c0=numLog(costFn(0)), K=COST_CURVE*lg;
  const at=(x)=>c0+x*lg+K*x*x;
  const top=at(l+n-1);
  if(n===1) return top;
  /* 합은 맨 윗 항이 지배한다. 얼마나 빨리 지배하는지는 위 두 항의 차이가 말해 준다. */
  const step=top-at(l+n-2);
  /* 차이가 0 이면 항이 줄지 않는다 — 배정도가 바닥난 것이다. 위 항이 n 개 있는 셈.
     예전에는 이 경우에 break 가 영영 걸리지 않아 n 번을 다 돌았고, n 이 1e130 쯤
     되는 세이브 하나가 브라우저를 통째로 멈춰 세웠다. */
  if(!(step>1e-12)) return top+L10(n);
  /* 열여덟 자리 아래로 떨어지기까지 필요한 걸음 수. 이만큼만 실제로 더하면 정확하다. */
  const need=Math.ceil(18/step)+2;
  if(need>4096){
    /* 너무 천천히 줄어든다 — 항별로 더하면 걸음이 수천을 넘는다.
       이 구간에서는 곡선이 사실상 등비여서 닫힌식이 정확하다. */
    const tail=step*n>300?0:Math.pow(10,-step*n);
    return top+L10((1-tail)/(1-Math.pow(10,-step)));
  }
  let acc=0;
  for(let k=0;k<need&&k<n;k++){
    const d=at(l+n-1-k)-top;
    if(d<-18) break;                 // 남은 항을 다 더해도 끝자리 아래다
    acc+=Math.pow(10,d);
  }
  return top+L10(acc);
}
/* 예산(자릿수) 으로 살 수 있는 단계 수.
   맨 윗 항이 예산을 넘지 않는 지점을 이차식으로 풀고, 반올림 몫만 손으로 맞춘다. */
export function bulkMaxLog(costFn,l,budgetLog){
  const g=ratioOf(costFn); if(!(g>1)) return 0;
  if(!(budgetLog>-Infinity)) return 0;
  const lg=L10(g), c0=numLog(costFn(0));
  const T=budgetLog-L10(g/(g-1));                // 합이 아니라 맨 윗 항 기준
  const a=COST_CURVE*lg, b=lg, cc=c0-T;
  let m=-Infinity;                                // a·m² + b·m + cc = 0 의 양의 근
  if(a>0){ const disc=b*b-4*a*cc; if(disc>0) m=(-b+Math.sqrt(disc))/(2*a); }
  else m=-cc/b;
  /* 어림이 0 이하로 나와도 곧바로 0 을 돌려주면 안 된다 — 맨 윗 항만 본 어림이라
     실제로는 한두 개 살 수 있는 자리가 있다. '최대' 를 눌러도 아무것도 안 사지고
     자원이 그대로이던 것이 이 자리였다. 0 에서 시작해 아래 걸음으로 올려 본다. */
  let n=isFinite(m)?Math.floor(m-l+1):0;
  if(!(n>0)) n=0;
  n=Math.min(n,1e12);                // 한 번에 살 수 있는 개수를 묶어 둔다
  /* 이차식 몫은 맨 윗 항만 본 어림이라 한두 걸음 어긋난다. 여덟 걸음만 맞추던
     때는 천팔백 조합 중 열일곱 자리에서 살 수 있는데도 덜 샀다 — 넉넉히 걷는다. */
  let k=0;
  while(n>0&&bulkCostLog(costFn,l,n)>budgetLog&&k++<64) n--;
  k=0;
  while(bulkCostLog(costFn,l,n+1)<=budgetLog&&k++<64) n++;
  return Math.max(0,n);
}
