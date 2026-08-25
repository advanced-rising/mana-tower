import { X, spriteURL } from '../core'
import { refresh, render } from './render'

/* ══════════════ DOM 헬퍼 ══════════════ */
export const $=id=>document.getElementById(id);
export function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
export function btn(cls,html,onClick){
  const b=document.createElement('button');
  b.type='button'; b.className='btn '+(cls||''); if(html!=null)b.innerHTML=html;
  if(onClick) b.addEventListener('click',e=>{e.preventDefault();onClick();refresh()});
  return b;
}
export function toast(html){
  const box=$('toast'), t=el('div',null,html);
  box.appendChild(t); while(box.children.length>4) box.firstChild.remove();
  setTimeout(()=>t.remove(),2600);
}
/* 업적 배너 (큰 알림) */
export let achQueue=[],achBusy=false;
export function achToast(title,desc,sprite){
  achQueue.push({title,desc,sprite}); if(!achBusy) nextAch();
}
export function nextAch(){
  if(!achQueue.length){achBusy=false;return}
  achBusy=true;
  const a=achQueue.shift();
  const w=el('div','achpop');
  w.innerHTML=`<img class="px" src="${spriteURL(a.sprite||'medal')}" width="32" height="32" alt="">
    <div><div class="ttl">${X('업적 달성','FEAT UNLOCKED')}</div><div class="nm">${a.title}</div><div class="ds">${a.desc}</div></div>`;
  document.body.appendChild(w);
  setTimeout(()=>w.classList.add('out'),2400);
  setTimeout(()=>{w.remove();nextAch()},2900);
}
export let modalCb=null;
export function modal(title,body,onOk){
  $('modalTitle').innerHTML=title; $('modalBody').innerHTML=body;
  $('modalOk').textContent=X('확인','OK'); $('modalNo').textContent=X('취소','Cancel');
  $('modalWrap').classList.add('on');
  $('modalNo').style.display=onOk?'':'none';
  modalCb=onOk||null;
}
$('modalOk').addEventListener('click',()=>{
  $('modalWrap').classList.remove('on');
  const f=modalCb; modalCb=null; if(f){f();render()}
});
$('modalNo').addEventListener('click',()=>{$('modalWrap').classList.remove('on');modalCb=null});
$('modalWrap').addEventListener('click',e=>{if(e.target.id==='modalWrap'){$('modalWrap').classList.remove('on');modalCb=null}});
