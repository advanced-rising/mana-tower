import { LANG, X } from '../core'
import { recalc } from '../multipliers'
import { flushLog } from '../tick'
import { $, el } from './dom'
import { TABS, buildTabs, curTab, setCurTab, setUpdaters, updaters } from './tabs'
import { BUILDERS, wireLayerPanels } from './panels'
import { clearMemos } from './widgets'
import { updateRes, updateSide } from './resbar'

/* ══════════════ 렌더 ══════════════ */
export let tabSig='';
export const updFails:any={};
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
  setUpdaters([]); clearMemos(); buildTabs();
  const main=$('main'); main.innerHTML='';
  const p=el('div','panel on'); p.id='p-'+curTab;
  wireLayerPanels();
  BUILDERS[curTab](p); main.appendChild(p);
  refresh();
}
export function refresh(){
  flushLog();
  recalc(); updateRes(); updateSide();
  /* 갱신 함수 하나가 터져도 나머지는 돌려야 한다 — 패널 하나 때문에 화면 전체가
     멈출 이유는 없다. 다만 조용히 삼키면 그 패널만 숫자가 굳고 라벨이 빈 채로
     남는데 아무 표시도 없다(임포트 하나 빠뜨려 네 번 물린 자리다).
     매 프레임 같은 오류를 쏟지 않도록 처음 한 번만 적고, 무엇이 터졌는지 남겨 둔다. */
  for(const u of updaters){try{u()}catch(e){
    const k=(e&&(e.message||e))+'';
    if(!updFails[k]){ updFails[k]=0; console.error('갱신이 멈춘 자리:',e) }
    updFails[k]++;
  }}
  const sig=TABS.map(t=>t.open()?1:0).join('');   // 잠금 상태가 바뀌면 탭을 다시 그린다
  if(sig!==tabSig){tabSig=sig;buildTabs()}
}
