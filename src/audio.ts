import { S } from './state'

/* ══════════════ 배경 음악 ══════════════
   장(章)이 오를수록 곡이 바뀐다 — 지상은 마을, 던전 깊은 곳은 동굴,
   우주 위로는 넓은 소리.
   브라우저는 사람이 한 번 건드리기 전에는 소리를 내주지 않는다. 그래서
   첫 클릭·첫 글쇠에서 시작하고, 그 전까지는 아무 일도 하지 않는다.
   파일은 셋뿐이고 필요할 때 하나씩만 받는다 — 처음 여는 데 5MB 를
   기다리게 할 이유가 없다. */
export const TRACKS=[
  {k:'tower',  src:'audio/tower.mp3',  upto:1},    // 0~1 장 : 지상 · 행성
  {k:'depths', src:'audio/depths.mp3', upto:4},    // 2~4 장 : 항성계 · 성단 · 은하
  {k:'cosmos', src:'audio/cosmos.mp3', upto:99},   // 그 위 전부
];
export const trackFor=ch=>TRACKS.find(t=>ch<=t.upto)||TRACKS[TRACKS.length-1];

let el=null, cur='', started=false, wanted='';

function ensure(){
  if(el) return el;
  el=new Audio(); el.loop=true; el.preload='none';
  el.volume=vol();
  return el;
}
export function vol(){
  const v=S.bgmVol;
  return (typeof v==='number'&&v>=0&&v<=1)?v:0.35;
}
export function bgmOn(){ return S.bgm!==0 }

/* 장이 바뀌면 곡을 갈아 끼운다. 같은 곡이면 아무것도 하지 않는다. */
export function setChapterMusic(ch){
  const t=trackFor(ch|0);
  wanted=t.src;
  if(!started||!bgmOn()) return;
  play(t.src);
}
function play(src){
  const a=ensure();
  if(cur===src&&!a.paused) return;
  cur=src;
  if(a.src.indexOf(src)<0) a.src=src;
  a.volume=vol();
  const p=a.play();
  if(p&&p.catch) p.catch(()=>{});     // 아직 허락이 없으면 조용히 넘어간다
}
export function stopMusic(){ if(el){ el.pause() } }
export function applyBgm(){
  if(!bgmOn()){ stopMusic(); return }
  if(started&&wanted) play(wanted);
}
export function setVol(v){
  S.bgmVol=Math.max(0,Math.min(1,v));
  if(el) el.volume=S.bgmVol;
}
/* 사람이 처음 건드린 순간 — 여기서부터 소리를 낼 수 있다 */
export function unlockAudio(){
  if(started) return;
  started=true;
  if(bgmOn()&&wanted) play(wanted);
}
