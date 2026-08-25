import { updaters } from './tabs'
import { DS, DSF, NM, X, ic, icHTML } from '../core'
import { S } from '../state'
import { fmt } from '../num'
import { recalc } from '../multipliers'
import { autoUnlocked } from '../automation'
import { btn, el, toast } from './dom'
import { refresh } from './render'

/* ══════════════ 공용 위젯 ══════════════ */
/* 0.1 초마다 갱신 함수가 전부 돈다. 그때마다 querySelector 로 노드를 다시 찾고
   값이 그대로여도 innerHTML 을 다시 써서 브라우저에 HTML 파싱을 시키고 있었다.
   노드는 만들 때 한 번만 찾고, 값이 달라졌을 때만 쓴다. */
export function memo(node){
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
export function levelGrid(defs,lvOf,curOf,pay,curSp){
  const g=el('div','grid wide');
  defs.forEach(u=>{
    const b=document.createElement('button');
    b.type='button'; b.className='up';
    b.innerHTML=`<span class="ic"></span><span class="bd"><span class="t"></span><span class="d"></span><span class="c"></span></span>`;
    b.querySelector('.ic').appendChild(ic(u.sp,32));
    const _t=memo(b.querySelector('.t')),_d=memo(b.querySelector('.d')),_c=memo(b.querySelector('.c'));
    const _goal=b.querySelector('.goal')&&memo(b.querySelector('.goal'));
    b.addEventListener('click',e=>{
      e.preventDefault();
      const l=lvOf(u.id);
      if(l>=u.max) return;
      /* 한 번에 여러 단계. 비용 곡선이 등비가 아니어도 되게 하나씩 더해 본다. */
      let n=0,spent=0,want=(S.buyAmt==='max')?1e9:S.buyAmt;
      while(n<want&&l+n<u.max){
        const c=u.c(l+n);
        if(!isFinite(c)||spent+c>curOf()) break;
        spent+=c; n++;
        if(n>=1000) break;
      }
      if(n<=0) return;
      pay(spent,u.id,n); recalc(); refresh();
      toast(icHTML(u.sp)+' '+NM(u.nm)+' Lv.'+fmt(l+n));
    });
    g.appendChild(b);
    updaters.push(()=>{
      const l=lvOf(u.id),maxed=l>=u.max,c=u.c(l),afford=!maxed&&curOf()>=c;
      _t.html=`${NM(u.nm)} <span class="lv">Lv.${fmt(l)}${u.max!==Infinity?' / '+u.max:''}</span>`;
      _d.text=u.d(l);
      let bn=0,bs=0,bw=(S.buyAmt==='max')?1e9:S.buyAmt;
      while(bn<bw&&l+bn<u.max&&bn<1000){ const cc=u.c(l+bn); if(!isFinite(cc)||bs+cc>curOf())break; bs+=cc; bn++; }
      _c.html=maxed?`<span class="good">${X('최대치 도달','Maxed')}</span>`
        :`${icHTML(curSp)} ${fmt(bn>0?bs:c)}${bn>1?` <span class="dim">×${bn}</span>`:''}`;
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
