import { LANG } from './core'
import { CHALLENGES, GEAR, RUNES } from './content'
import { S } from './state'
import { L10, logAdd, numLog } from './dungeon'

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

export function fmtTime(s){
  s=Math.floor(s);
  const U=LANG==='en'?['s','m','h','d']:['초','분','시간','일'];
  const j=(a,b)=>LANG==='en'?a+' '+b:a+' '+b;
  if(s<60) return s+U[0];
  if(s<3600) return j(Math.floor(s/60)+U[1], (s%60)+U[0]);
  if(s<86400) return j(Math.floor(s/3600)+U[2], Math.floor(s%3600/60)+U[1]);
  return j(Math.floor(s/86400)+U[3], Math.floor(s%86400/3600)+U[2]);
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
