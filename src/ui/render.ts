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
/* 죽은 패널을 화면에 알린다. 같은 오류로 매 프레임 DOM 을 건드리지 않도록
   글이 달라졌을 때만 쓴다. */
let brokeShown='';
function showBroken(msg){
  if(msg===brokeShown) return;
  brokeShown=msg;
  let b=document.getElementById('brokebar');
  if(!msg){ if(b) b.remove(); return }
  if(!b){
    b=el('div',null,''); b.id='brokebar';
    b.style.cssText='margin:0 0 10px;padding:8px 11px;border-radius:8px;font-size:12px;'
      +'background:#3a1414;border:1px solid #7d2b2b;color:#f0c9c9';
    const m=$('main'); if(m) m.insertBefore(b,m.firstChild); else return;
  }
  b.innerHTML=X('이 화면의 일부가 갱신을 멈췄습니다 — 남은 곳은 그대로 돕니다.',
                "Part of this screen stopped updating — the rest still runs.")
    +'<br><span style="opacity:.65">'+String(msg).slice(0,140).replace(/[<>&]/g,'')+'</span>';
}
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
  /* 갱신 함수 하나가 터져도 나머지는 돌려야 한다 — 패널 하나 때문에 화면 전체가
     멈출 이유는 없다. 다만 조용히 삼키면 그 패널만 숫자가 굳고 라벨이 빈 채로 남는데
     아무 표시가 없다. 그러면 플레이하는 쪽에서는 '멈췄다' 로만 보이고, 무엇이
     멈췄는지 알 길이 없다 — 실제로 그렇게 두 번 겪었다.
     터진 것을 화면에 적는다. 굳은 화면보다 못생긴 화면이 낫다. */
  let broke='';
  for(const u of updaters){try{u()}catch(e){
    const k=(e&&(e.message||e))+'';
    if(!updFails[k]){ updFails[k]=0; console.error('갱신이 멈춘 자리:',e) }
    updFails[k]++; if(!broke) broke=k;
  }}
  showBroken(broke);
  const sig=TABS.map(t=>t.open()?1:0).join('');   // 잠금 상태가 바뀌면 탭을 다시 그린다
  if(sig!==tabSig){tabSig=sig;buildTabs()}
}
