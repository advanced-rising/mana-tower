import { LANG, X } from '../core'
import { recalc } from '../multipliers'
import { flushLog } from '../tick'
import { $, el } from './dom'
import { TABS, buildTabs, curTab, setCurTab, setUpdaters, updaters } from './tabs'
import { BUILDERS, wireLayerPanels } from './panels'
import { updateRes, updateSide } from './resbar'

/* ══════════════ 렌더 ══════════════ */
export let tabSig='';
export function render(){
  const lb=$('langBtn'); if(lb) lb.textContent = LANG==='ko' ? 'EN' : '한국어';
  const bt=$('brandLogo');
  if(bt){                                   // 제목도 언어를 따라간다
    bt.alt=X('무한의 탑','Tower of Infinity');
    bt.src=X('art/ui/logo.png','art/ui/logo_en.png');
    bt.width =X(129,201); bt.height=X(43,33);
  }
  const sb=document.querySelector('#brand .sub'); if(sb) sb.style.display='none';
  const t=TABS.find(x=>x.id===curTab);
  if(!t||!t.open()) setCurTab('tower');
  setUpdaters([]); buildTabs();
  const main=$('main'); main.innerHTML='';
  const p=el('div','panel on'); p.id='p-'+curTab;
  wireLayerPanels();
  BUILDERS[curTab](p); main.appendChild(p);
  refresh();
}
export function refresh(){
  flushLog();
  recalc(); updateRes(); updateSide();
  for(const u of updaters){try{u()}catch(e){console.error(e)}}
  const sig=TABS.map(t=>t.open()?1:0).join('');   // 잠금 상태가 바뀌면 탭을 다시 그린다
  if(sig!==tabSig){tabSig=sig;buildTabs()}
}
