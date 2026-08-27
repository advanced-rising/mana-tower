import { S } from './state'

/* ══════════════ 소리 ══════════════
   배경 음악은 곡을 이어서 튼다 — 한 곡만 되풀이하면 금방 물린다.
   지금 장(章)의 곡부터 시작해 나머지를 차례로 돌고, 끝나면 처음으로 돌아온다.
   효과음은 파일 없이 그 자리에서 만든다. 짧은 소리라 내려받게 할 이유가 없고,
   도트 그림과도 결이 맞는다.
   브라우저는 사람이 한 번 건드리기 전에는 소리를 내주지 않으므로,
   첫 클릭·첫 글쇠 전까지는 아무것도 하지 않는다. */
export const TRACKS=[
  {k:'tower',  ko:'마탑',  src:'audio/tower.mp3',  upto:1},   // 0~1 장
  {k:'depths', ko:'심층',  src:'audio/depths.mp3', upto:4},   // 2~4 장
  {k:'cosmos', ko:'우주',  src:'audio/cosmos.mp3', upto:99},  // 그 위
];
export const trackFor=ch=>TRACKS.find(t=>ch<=t.upto)||TRACKS[TRACKS.length-1];

let el=null, started=false, order=[], at=0, chap=0;

export function bgmOn(){ return S.bgm!==0 }
export function sfxOn(){ return S.sfx!==0 }
export function vol(){ const v=S.bgmVol; return (typeof v==='number'&&v>=0&&v<=1)?v:0.35 }
export function sfxVol(){ const v=S.sfxVol; return (typeof v==='number'&&v>=0&&v<=1)?v:0.4 }
export function nowTrack(){ return order[at]||trackFor(chap) }

function ensure(){
  if(el) return el;
  el=new Audio(); el.preload='none'; el.volume=vol();
  el.addEventListener('ended',()=>{ at=(at+1)%order.length; spin() });   // 다음 곡으로
  el.addEventListener('error',()=>{ at=(at+1)%order.length });
  return el;
}
/* 지금 장의 곡을 맨 앞에 두고 나머지를 차례로 잇는다 */
function buildOrder(ch){
  const first=trackFor(ch);
  const i=TRACKS.indexOf(first);
  order=TRACKS.slice(i).concat(TRACKS.slice(0,i));
  at=0;
}
function spin(){
  if(!started||!bgmOn()||!order.length) return;
  const a=ensure(), t=order[at];
  if(a.src.indexOf(t.src)<0) a.src=t.src;
  a.volume=vol();
  const p=a.play(); if(p&&p.catch) p.catch(()=>{});
}
export function setChapterMusic(ch){
  const was=order.length?order[0].k:'';
  chap=ch|0;
  buildOrder(chap);
  if(order[0].k===was&&el&&!el.paused) return;   // 같은 자리면 흐름을 끊지 않는다
  spin();
}
export function stopMusic(){ if(el) el.pause() }
export function applyBgm(){ if(!bgmOn()){ stopMusic(); return } spin() }
export function setVol(v){ S.bgmVol=Math.max(0,Math.min(1,v)); if(el) el.volume=S.bgmVol }
export function setSfxVol(v){ S.sfxVol=Math.max(0,Math.min(1,v)) }
/* 다음 곡으로 건너뛴다 */
export function nextTrack(){ if(!order.length) buildOrder(chap); at=(at+1)%order.length; spin() }

/* ── 효과음 ──────────────────────────────────
   파형 하나에 봉투 하나. 16 칸 도트처럼, 짧고 분명하게. */
let ctx=null;
function ac(){
  if(ctx) return ctx;
  const C=window.AudioContext||(window as any).webkitAudioContext;
  if(!C) return null;
  try{ ctx=new C() }catch(e){ ctx=null }
  return ctx;
}
const TONE={
  click:  {type:'square',   f:220, to:300, dur:0.055, gain:0.16},
  buy:    {type:'square',   f:330, to:500, dur:0.085, gain:0.18},
  floor:  {type:'triangle', f:180, to:120, dur:0.10,  gain:0.16},
  boss:   {type:'sawtooth', f:120, to:70,  dur:0.26,  gain:0.20},
  prestige:{type:'triangle',f:520, to:130, dur:0.42,  gain:0.20},
  deny:   {type:'square',   f:150, to:110, dur:0.07,  gain:0.12},
};
export function sfx(kind){
  if(!started||!sfxOn()) return;
  const c=ac(); if(!c) return;
  const t=TONE[kind]||TONE.click;
  try{
    const now=c.currentTime;
    const o=c.createOscillator(), g=c.createGain();
    o.type=t.type;
    o.frequency.setValueAtTime(t.f,now);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,t.to),now+t.dur);
    const peak=Math.max(0.0001,t.gain*sfxVol());
    g.gain.setValueAtTime(0.0001,now);
    g.gain.exponentialRampToValueAtTime(peak,now+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,now+t.dur);
    o.connect(g); g.connect(c.destination);
    o.start(now); o.stop(now+t.dur+0.02);
  }catch(e){}
}
/* 사람이 처음 건드린 순간 — 여기서부터 소리를 낼 수 있다 */
export function unlockAudio(){
  if(started) return;
  started=true;
  const c=ac(); if(c&&c.state==='suspended'){ try{ c.resume() }catch(e){} }
  if(!order.length) buildOrder(chap);
  if(bgmOn()) spin();
}
