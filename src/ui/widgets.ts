import { updaters } from './tabs'
import { DS, DSF, NM, X, ic, icHTML } from '../core'
import { S } from '../state'
import { costLogAt, fmt, fmtLog, upMaxOf } from '../num'
import { effLevel, recalc } from '../multipliers'
import { BELOW_RATIO, LAYER_BELOW, autoUnlocked, budget2Log, budgetLogOf, buyBulkLog, pay2, payFrom } from '../automation'
import { btn, el, toast } from './dom'
import { refresh } from './render'

/* ══════════════ 공용 위젯 ══════════════ */
/* 0.1 초마다 갱신 함수가 전부 돈다. 그때마다 querySelector 로 노드를 다시 찾고
   값이 그대로여도 innerHTML 을 다시 써서 브라우저에 HTML 파싱을 시키고 있었다.
   노드는 만들 때 한 번만 찾고, 값이 달라졌을 때만 쓴다. */
/* memo 는 노드에 마지막 값을 적어 두고 같으면 안 쓴다. 그래서 그 노드가 화면에서
   떨어져 나가면(부모를 innerHTML 로 다시 그리는 경우) 글자는 계속 허공으로 들어가고
   화면의 자리는 빈 채로 남는다 — 예외도 안 나고 콘솔도 조용하다.
   떨어진 노드를 찾을 수 있도록 만든 것을 적어 둔다. render 마다 비운다. */
export const MEMOS:any[]=[];
export function clearMemos(){ MEMOS.length=0 }
export function memo(node){
  if(node) MEMOS.push(node);
  return {
    set html(v){ if(node._h!==v){ node._h=v; node.innerHTML=v; } },
    set text(v){ if(node._h!==v){ node._h=v; node.textContent=v; } },
    node,
  };
}
export function card(title,hint){
  const c=el('div','card');
  if(title){const h=el('h2');h.appendChild(ic(title[1],16));h.appendChild(el('span',null,title[0]));c.appendChild(h)}
  if(hint) c.appendChild(el('div','hint',hint));
  return c;
}
/* 레벨식 업그레이드 격자 (영혼/유물 공용) */
export function levelGrid(defs,lvOf,curKey,setLv,curSp){
  const g=el('div','grid wide');
  defs.forEach(u=>{
    const b=document.createElement('button');
    b.type='button'; b.className='up';
    b.innerHTML=`<span class="ic"></span><span class="bd"><span class="t"></span><span class="d"></span><span class="c"></span></span>`;
    b.querySelector('.ic').appendChild(ic(u.sp,32));
    const _t=memo(b.querySelector('.t')),_d=memo(b.querySelector('.d')),_c=memo(b.querySelector('.c'));
    const _goal=b.querySelector('.goal')&&memo(b.querySelector('.goal'));
    /* 예전에는 비용을 한 단계씩 평범한 수로 더했다. 레벨이 1,340 을 넘으면
       c(l) 자체가 ∞ 라 그 위로는 아무것도 살 수 없었고, 재료가 ∞ 이면
       ∞ - ∞ = NaN 이 되어 잔액이 통째로 망가졌다. 전부 자릿수로 다룬다. */
    b.addEventListener('click',e=>{
      e.preventDefault();
      const l=lvOf(u.id), lim=upMaxOf(u,curKey);
      if(l>=lim) return;
      const want=(S.buyAmt==='max')?Infinity:S.buyAmt;
      const cap=Math.min(lim-l, want);
      const {n,costLog}=buyBulkLog(u.c,l,budget2Log(curKey),cap);
      if(!(n>0)) return;
      pay2(curKey,costLog); setLv(u.id,n); recalc(); refresh();
      toast(icHTML(u.sp)+' '+NM(u.nm)+' Lv.'+fmt(l+n));
    });
    g.appendChild(b);
    updaters.push(()=>{
      const l=lvOf(u.id), lim=upMaxOf(u,curKey), maxed=l>=lim;
      const bud=budget2Log(curKey), cl=costLogAt(u.c,l), afford=!maxed&&bud>=cl;
      _t.html=`${NM(u.nm)} <span class="lv">Lv.${fmt(l)} / ${fmt(lim)}</span>`;
      _d.text=u.d(effLevel(l));
      const want=(S.buyAmt==='max')?Infinity:S.buyAmt;
      const {n:bn,costLog:bs}=buyBulkLog(u.c,l,bud,Math.min(lim-l,want));
      _c.html=maxed?`<span class="good">${X('최대치 도달','Maxed')}</span>`
        :`${icHTML(curSp)} ${fmtLog(bn>0?bs:cl)}`
          +(LAYER_BELOW[curKey]?` ${icHTML(LAYER_BELOW[curKey])} ${fmtLog((bn>0?bs:cl)*BELOW_RATIO)}`:'')
          +(bn>1?` <span class="dim">×${fmt(bn)}</span>`:'');
      b.classList.toggle('done',maxed); b.classList.toggle('afford',afford); b.disabled=maxed;
    });
  });
  return g;
}
export function toggleRow(def){
  const r=el('div','row');
  r.style.cssText='justify-content:space-between;padding:7px 2px;gap:12px';
  const left=el('div'); left.style.cssText='min-width:0;display:flex;align-items:center;gap:9px';
  const icb=el('div'); icb.style.cssText='flex:0 0 auto;line-height:0';
  icb.appendChild(ic(def.sp||'cog',24));            // 줄마다 제 그림이 있어야 눈으로 갈린다
  const txt=el('div'); txt.style.minWidth='0';
  const nm=el('div'); nm.style.cssText='font-family:var(--serif);font-size:14px';
  const ds=el('div','hint'); ds.style.margin='0';
  txt.append(nm,ds); left.append(icb,txt);
  const b=btn('sm','',()=>{ S.auto[def.k]=S.auto[def.k]?0:1; });   // 잠김과 무관하게 토글
  r.append(left,b);
  const _nm=memo(nm), _ds=memo(ds), _b=memo(b);
  let _cls='';
  updaters.push(()=>{
    const un=autoUnlocked(def.k), on=!!S.auto[def.k];   // 잠겨 있어도 미리 켜 둘 수 있다
    _nm.html=NM(def.nm)+(un?'':' <span class="lv">🔒</span>');
    _ds.html=un?DS(def):`<span class="dim">${X('해금 조건','Unlocks at')}: <b>${DSF(def.req)}</b></span>`;
    b.disabled=false;
    const cls='btn sm '+(on?'on':'off');
    if(_cls!==cls){ _cls=cls; b.className=cls; }
    const lab=on?(un?X('자동 ON','AUTO'):X('대기 중','ARMED')):X('수동 OFF','MANUAL');
    _b.html=`<img class="px sw" src="art/ui/sw_${on?'on':'off'}.png" width="22" height="12" alt="">${lab}`;
  });
  return r;
}

/* 구매 수량 고르개. 마탑에만 있어서 다른 곳에서는 한 단계씩만 눌러야 했다.
   S.buyAmt 는 하나뿐이므로 어느 쪽에서 바꾸든 모든 상점에 함께 적용된다. */
export function buyAmtRow(){
  const r=el('div','row'); r.style.margin='2px 0 9px';
  r.appendChild(el('span','dim',X('구매 수량','Buy amount')));
  [1,10,100,'max'].forEach(v=>{
    const b=btn('sm',v==='max'?X('최대','Max'):'×'+v,()=>{S.buyAmt=v;refresh()});
    let cls='';
    updaters.push(()=>{ const n='btn sm '+(S.buyAmt===v?'on':''); if(cls!==n){cls=n;b.className=n} });
    r.appendChild(b);
  });
  return r;
}
