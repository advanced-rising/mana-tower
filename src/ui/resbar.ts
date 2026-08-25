import { $, el } from './dom'
import { cosmosLabel, floorHP, foeOf } from '../dungeon'
import { AUTO_DEFS } from '../automation'
import { DSF, NM, X, ic, icHTML } from '../core'
import { S } from '../state'
import { curChal, fmt, fmtLog, gearTotal, numLog, pctTxt, runeTotal } from '../num'
import { M, manaRateLog } from '../multipliers'
import { INF_LAYERS, infUnlocked, transUnlocked } from '../prestige'

/* ══════════════ 자원 바 ══════════════ */
export const RES=[
 {id:'mana',   sp:'mana',   nm:{ko:'마나',en:"Mana"},   cls:'mana',   show:()=>true,
  val:()=>fmtLog(S.manaL), sub:()=>'+'+fmtLog(manaRateLog())+X(' /초',' /s')},
 {id:'offer',  sp:'offering',nm:{ko:'오퍼링',en:"Offerings"},cls:'offer',  show:()=>S.offerEver>0,
  val:()=>fmt(S.offering), sub:()=>X('룬 합계 Lv.','Runes Lv.')+runeTotal()},
 {id:'crystal',sp:'crystal',nm:{ko:'결정',en:"Crystals"},   cls:'crystal',show:()=>S.crystalEver>0,
  val:()=>fmt(S.crystal), sub:()=>X('장비 합계 Lv.','Gear Lv.')+gearTotal()},
 {id:'soul',   sp:'soul',   nm:{ko:'영혼석',en:"Soul Shards"}, cls:'soul',   show:()=>S.soulEver>0||(S.rebirthEver||S.rebirths)>0,
  val:()=>fmt(S.soul), sub:()=>X('환생 ','Rebirths ')+S.rebirths+X(' · 주기 ',' · cycle ')+fmt(S.soulAsc)},
 {id:'relic',  sp:'relic',  nm:{ko:'유물',en:"Relics"},   cls:'relic',  show:()=>S.relicEver>0||(S.ascendEver||S.ascensions)>0,
  val:()=>fmt(S.relic), sub:()=>X('승천 ','Ascensions ')+S.ascensions},
 {id:'star',   sp:'star',   nm:{ko:'별가루',en:"Stardust"}, cls:'gold',   show:()=>S.starEver>0||transUnlocked(),
  val:()=>fmt(S.star), sub:()=>X('초월 ','Transcends ')+S.transcends},
 ...INF_LAYERS.map((L,i)=>({id:L.k, sp:L.sp, nm:{ko:L.ko,en:L.en}, cls:'gold',
   show:()=>(S[L.k+'Ever']||0)>0||infUnlocked(i),
   val:()=>fmt(S[L.k]||0), sub:()=>X(`돌파 ${S[L.k+'Count']||0}회`,`${S[L.k+'Count']||0} breaks`)})),
 {id:'floor',  sp:'sword',  nm:{ko:'탐사 깊이',en:"Depth"}, cls:'floor',  show:()=>S.manaPeakL>=numLog(5e3),
  val:()=>fmt(S.deepest), sub:()=>cosmosLabel(S.deepest||1)},
];
export let resNodes={};
export function buildRes(){
  const box=$('res'); box.innerHTML=''; resNodes={};
  RES.forEach(r=>{
    const d=el('div','res '+r.cls);
    d.appendChild(ic(r.sp,32));   // 16px 원본을 2배로 (정수배라 도트가 안 뭉갠다)
    const t=el('div','txt');
    t.innerHTML=`<div class="lab">${NM(r.nm)}</div><div class="val"></div><div class="sub"></div>`;
    d.appendChild(t); box.appendChild(d);
    resNodes[r.id]={box:d,lab:t.querySelector('.lab'),val:t.querySelector('.val'),sub:t.querySelector('.sub')};
  });
}
export function updateSide(){
  const box=$('sidestat'); if(!box) return;
  const m=M(), f=S.floor, hp=floorHP(f), fo=foeOf(f);
  const pr=Math.max(0,Math.min(1,S.prog||0));
  const nextAuto=AUTO_DEFS.find(d=>!d.unlock());
  const ch=curChal();
  box.innerHTML=`
    <div class="k">${X('마나 생산',"Mana output")}</div><div class="v">${fmtLog(manaRateLog())}${X(' /초',' /s')}</div>
    <hr>
    <div class="k">${S.exploring?X('교전 중','In combat'):X('대기 중','Idle')} · ${X(f+'층','F'+f)}</div>
    <div class="v" style="display:flex;align-items:center;gap:5px">${icHTML(fo.sp)}${NM(fo.nm)}</div>
    <div class="mini"><i style="width:${pctTxt(pr*100)}%"></i></div>
    <div class="k">${X('전체 배율',"Total multiplier")}</div><div class="v">×${fmtLog(m.prodLog)}</div>
    <hr>
    ${ch?`<div class="k">${X('진행 중인 시련',"Active trial")}</div><div class="v bad">${NM(ch.nm)}</div>`
        :`<div class="k">${X('다음 해금',"Next unlock")}</div><div class="v">${nextAuto?NM(nextAuto.nm):X('전부 해금','All unlocked')}</div>
          <div class="k">${nextAuto?DSF(nextAuto.req):''}</div>`}`;
}
export function updateRes(){
  RES.forEach(r=>{
    const n=resNodes[r.id]; if(!n) return;
    const sh=r.show();
    n.box.style.display=sh?'':'none';
    if(sh){n.lab.textContent=NM(r.nm);n.val.textContent=r.val();n.sub.textContent=r.sub()}
  });
}
