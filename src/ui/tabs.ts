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
 {id:'inf',     sp:'infinity', nm:{ko:'무한',en:"Infinity"},   open:()=>infUnlocked(0)},
 {id:'chal',    sp:'chain',    nm:{ko:'도전',en:"Trials"},      open:()=>chalUnlocked()},
 {id:'ach',     sp:'medal',    nm:{ko:'업적',en:"Feats"},      open:()=>true},
 {id:'auto',    sp:'cog',      nm:{ko:'자동화',en:"Automation"},    open:()=>true},
 {id:'settings',sp:'anvil',    nm:{ko:'설정',en:"Settings"},      open:()=>true},
];
export let curTab='tower', updaters=[], alerts={}, pointerDown=false, needRebuild=false;
document.addEventListener('pointerdown',()=>{pointerDown=true});
document.addEventListener('pointerup',()=>{pointerDown=false;if(needRebuild){needRebuild=false;render()}});
export function flagTab(id){if(curTab!==id){alerts[id]=1;buildTabs()}}
export function buildTabs(){
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
    b.appendChild(el('span','n',open?(i===9?'0':String(i+1)):''));
    b.appendChild(el('span','dot'));
    if(open) b.addEventListener('click',()=>switchTab(t.id));
    box.appendChild(b);
  });
}
export function switchTab(id){
  const t=TABS.find(x=>x.id===id);
  if(!t||!t.open()) return;
  curTab=id; delete alerts[id]; render();
}

export function setCurTab(v){ curTab=v }
export function setUpdaters(v){ updaters=v }
export function setNeedRebuild(v){ needRebuild=v }
export function setPointerDown(v){ pointerDown=v }
