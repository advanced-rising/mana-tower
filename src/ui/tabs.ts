import { INF_LAYERS } from '../layers'
import { fmt, fmtLog, numLog } from '../num'
import { NM, X, ic } from '../core'
import { S } from '../state'

import { ASCEND_REQ, INF_STACK, REBIRTH_REQ, infUnlocked, transUnlocked } from '../prestige'
import { chalUnlocked } from '../trials'
import { $, el } from './dom'
import { render } from './render'

/* ══════════════ 탭 ══════════════ */
export const TABS=[
 {id:'tower',   sp:'tower',    nm:{ko:'마탑',en:"Mage Tower"},      open:()=>true},
 {id:'research',sp:'flask',    nm:{ko:'연구',en:"Research"},      open:()=>S.manaPeakL>=2},
 {id:'dungeon', sp:'sword',    nm:{ko:'던전',en:"Dungeon"},      open:()=>S.manaPeakL>=numLog(5e3)},
 {id:'relics',  sp:'rune_wealth',nm:{ko:'룬 석판',en:"Rune Tablets"},open:()=>S.offerEver>0},
 {id:'gear',    sp:'anvil',    nm:{ko:'장비',en:"Gear"},        open:()=>S.crystalEver>0},
 {id:'rebirth', sp:'soul',     nm:{ko:'환생',en:"Rebirth"},      open:()=>S.manaPeakL>=numLog(REBIRTH_REQ/20)||(S.rebirthEver||S.rebirths)>0||S.soulEver>0,
   req:()=>X(`마나 ${fmtLog(numLog(REBIRTH_REQ/20))} 모으기`,`Reach ${fmtLog(numLog(REBIRTH_REQ/20))} mana`)},
 {id:'ascend',  sp:'relic',    nm:{ko:'승천',en:"Ascension"},      open:()=>S.soulEver>=ASCEND_REQ/10||(S.ascendEver||S.ascensions)>0||S.relicEver>0,
   req:()=>X(`영혼석 ${fmt(ASCEND_REQ/10)} 모으기`,`Gather ${fmt(ASCEND_REQ/10)} soul shards`)},
 {id:'trans',   sp:'star',     nm:{ko:'초월',en:"Transcend"},   open:()=>transUnlocked(),
   req:()=>X(`승천 ${fmt(S.ascendEver||S.ascensions||0)} / 5 회`,`Ascend ${fmt(S.ascendEver||S.ascensions||0)} / 5 times`)},

 {id:'chal',    sp:'chain',    nm:{ko:'도전',en:"Trials"},      open:()=>chalUnlocked()},
 {id:'ach',     sp:'medal',    nm:{ko:'업적',en:"Feats"},      open:()=>true},
 {id:'auto',    sp:'cog',      nm:{ko:'자동화',en:"Automation"},    open:()=>true},
 {id:'settings',sp:'anvil',    nm:{ko:'설정',en:"Settings"},      open:()=>true},
];
/* 무한 위의 칸들도 저마다 탭이다 — 한 탭에 다섯을 쌓으면 아래쪽이 묻힌다.
   목록을 모듈 평가 시점에 만들면 INF_LAYERS 가 아직 안 채워져 있을 수 있으므로
   (모듈끼리 서로를 물면 먼저 들어간 쪽이 빈 채로 보인다) 처음 그릴 때 끼워 넣는다.
   TABS 는 같은 배열을 계속 쓰므로 다른 모듈이 들고 있는 참조도 함께 갱신된다. */
let _tabsReady=false;
export function ensureTabs(){
  if(_tabsReady) return; _tabsReady=true;
  const at=TABS.findIndex(t=>t.id==='chal');
  TABS.splice(at,0,...INF_LAYERS.map((L,i)=>({id:L.k, sp:L.sp, nm:{ko:L.ko,en:L.en},
    open:()=>infUnlocked(i),
    req:()=>i===0?X('초월 1회 · 그리고 마나가 넘칠 지경까지',"Transcend once, then push mana to the brink")
                 :X(`${INF_LAYERS[i-1].ko} ${fmt(S[INF_LAYERS[i-1].k+'Ever']||0)} / ${fmt(INF_STACK)}`,
                    `${INF_LAYERS[i-1].en} ${fmt(S[INF_LAYERS[i-1].k+'Ever']||0)} / ${fmt(INF_STACK)}`)})));
}
export let curTab='tower', updaters=[], alerts={}, pointerDown=false, needRebuild=false;
document.addEventListener('pointerdown',()=>{pointerDown=true});
document.addEventListener('pointerup',()=>{pointerDown=false;if(needRebuild){needRebuild=false;render()}});
export function flagTab(id){if(curTab!==id){alerts[id]=1;buildTabs()}}
/* 탭이 열여섯 개라 숫자만으로는 모자란다. 1~9,0 다음은 자판 윗줄을 이어 쓴다.
   잠긴 탭은 자리를 차지하지 않으므로, 보이는 순서대로 붙는다. */
export const TAB_KEYS=['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','y','u','i','o','p'];
export function tabKeyOf(id){
  ensureTabs();
  const open=TABS.filter(t=>t.open());
  const i=open.findIndex(t=>t.id===id);
  return i>=0&&i<TAB_KEYS.length?TAB_KEYS[i]:'';
}
export function tabByKey(k){
  ensureTabs();
  const i=TAB_KEYS.indexOf(k);
  if(i<0) return null;
  const open=TABS.filter(t=>t.open());
  return open[i]||null;
}
export function buildTabs(){
  ensureTabs();
  const box=$('tabs'); box.innerHTML='';
  /* 잠긴 탭도 흐리게 보여 준다. 아예 숨기면 그런 것이 있는 줄도 모른다.
     다만 무엇인지는 알 수 없게 ??? 로 둔다. */
  let shownLocked=0, shownChain=0;
  TABS.forEach((t,i)=>{
    const open=t.open();
    const chain=typeof t.req==='function';     // 프레스티지 사슬
    if(!open){
      if(chain){
        if(shownChain>=2) return;     // 사슬은 다음 둘까지 — 그래야 순서가 읽힌다
        shownChain++;
      }else{
        if(shownLocked>=2) return;    // 이름 없는 잠긴 탭도 다음 둘까지
        shownLocked++;
      }
    }
    /* 사슬은 언제나 보여 준다. 잠긴 자리 둘을 룬 석판·장비가 차지하는 바람에
       승천 다음이 초월이라는 것이 화면에 한 번도 나오지 않았고,
       그래서 다음 단계가 무한인 것처럼 읽혔다. */
    const b=el('button','tab'+(open?(t.id===curTab?' on':''):' locked')+(alerts[t.id]?' alert':''));
    b.type='button';
    /* 프레스티지 사슬은 잠겨 있어도 이름과 조건을 보여 준다. ??? 로만 두면
       다음 단계가 초월인지 무한인지 알 수가 없어, 순서를 짐작하게 된다. */
    const named=!open&&typeof t.req==='function';
    b.appendChild(ic(open||named?t.sp:'unknown',16));
    const lab=el('span',null,open?NM(t.nm):(named?NM(t.nm):'???'));
    b.appendChild(lab);
    if(named){ const r=el('span','req',t.req()); b.appendChild(r); b.title=NM(t.nm)+' — '+t.req(); }
    b.appendChild(el('span','n',open?tabKeyOf(t.id).toUpperCase():''));
    b.appendChild(el('span','dot'));
    if(open) b.addEventListener('click',()=>switchTab(t.id));
    box.appendChild(b);
  });
}
export function switchTab(id){
  ensureTabs();
  const t=TABS.find(x=>x.id===id);
  if(!t||!t.open()) return;
  curTab=id; delete alerts[id]; render();
}

export function setCurTab(v){ curTab=v }
export function setUpdaters(v){ updaters=v }
export function setNeedRebuild(v){ needRebuild=v }
export function setPointerDown(v){ pointerDown=v }
