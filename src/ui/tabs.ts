import { INF_LAYERS } from '../layers'
import { numLog } from '../num'
import { NM, ic } from '../core'
import { S } from '../state'

import { ASCEND_REQ, REBIRTH_REQ, infUnlocked, transUnlocked } from '../prestige'
import { chalUnlocked } from '../trials'
import { $, el } from './dom'
import { render } from './render'

/* ══════════════ 탭 ══════════════ */
export const TABS=[
 {id:'tower',   sp:'tower',    nm:{ko:'마탑',en:"Mage Tower"},      open:()=>true},
 {id:'research',sp:'flask',    nm:{ko:'연구',en:"Research"},      open:()=>S.manaPeakL>=2},
 {id:'dungeon', sp:'sword',    nm:{ko:'던전',en:"Dungeon"},      open:()=>S.manaPeakL>=numLog(5e3)},
 {id:'relics',  sp:'rune_wealth',nm:{ko:'룬 석판',en:"Rune Tablets"},open:()=>S.offerEver>0},
 {id:'rebirth', sp:'soul',     nm:{ko:'환생',en:"Rebirth"},      open:()=>S.manaPeakL>=numLog(REBIRTH_REQ/20)||(S.rebirthEver||S.rebirths)>0||S.soulEver>0},
 {id:'ascend',  sp:'relic',    nm:{ko:'승천',en:"Ascension"},      open:()=>S.soulEver>=ASCEND_REQ/10||(S.ascendEver||S.ascensions)>0||S.relicEver>0},
 {id:'trans',   sp:'star',     nm:{ko:'초월',en:"Transcend"},   open:()=>transUnlocked()},

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
  TABS.splice(at,0,...INF_LAYERS.map((L,i)=>({id:L.k, sp:L.sp, nm:{ko:L.ko,en:L.en}, open:()=>infUnlocked(i)})));
}
export let curTab='tower', updaters=[], alerts={}, pointerDown=false, needRebuild=false;
document.addEventListener('pointerdown',()=>{pointerDown=true});
document.addEventListener('pointerup',()=>{pointerDown=false;if(needRebuild){needRebuild=false;render()}});
export function flagTab(id){if(curTab!==id){alerts[id]=1;buildTabs()}}
export function buildTabs(){
  ensureTabs();
  const box=$('tabs'); box.innerHTML='';
  /* 잠긴 탭도 흐리게 보여 준다. 아예 숨기면 그런 것이 있는 줄도 모른다.
     다만 무엇인지는 알 수 없게 ??? 로 둔다. */
  let shownLocked=0;
  TABS.forEach((t,i)=>{
    const open=t.open();
    if(!open){
      if(shownLocked>=2) return;      // 바로 다음 둘까지만 보여 준다
      shownLocked++;
    }
    const b=el('button','tab'+(open?(t.id===curTab?' on':''):' locked')+(alerts[t.id]?' alert':''));
    b.type='button';
    b.appendChild(ic(open?t.sp:'unknown',16));
    b.appendChild(el('span',null,open?NM(t.nm):'???'));
    b.appendChild(el('span','n',open?(i<9?String(i+1):i===9?'0':''):''));
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
