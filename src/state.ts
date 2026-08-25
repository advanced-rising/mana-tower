import { PRODUCERS } from './producers'
import { VERSION } from './core'

import { gather } from './multipliers'
import { autoUnlocked } from './automation'

/* ══════════════ 상태 ══════════════ */
export function newState(){return{
  v:VERSION,
  mana:0, manaRun:0, manaEver:0,
  manaL:-Infinity, manaRunL:-Infinity, manaEverL:-Infinity,   // 진실의 원천 (log10, 0 은 -Infinity)
  offering:0, offerEver:0, crystal:0, crystalEver:0,
  bought:PRODUCERS.map(()=>0), gen:PRODUCERS.map(()=>0),
  genL:PRODUCERS.map(()=>-Infinity),   // 상위 시설이 만들어 낸 수 · 자릿수(log10)가 진실. 0 은 -Infinity
  research:{}, runes:{}, gear:{},
  soul:0, soulAsc:0, soulEver:0, soulUps:{},
  relic:0, relicEver:0, relicUps:{}, relicTrans:0,
  star:0, starEver:0, starUps:{},
  inf:0, infEver:0, infCount:0,
  infUps:{}, eterUps:{}, realUps:{}, voidUps:{}, originUps:{}, eter:0, eterEver:0, eterCount:0,
  real:0, realEver:0, realCount:0, void:0, voidEver:0, voidCount:0,
  origin:0, originEver:0, originCount:0,
  rebirths:0, ascensions:0, transcends:0,
  rebirthEver:0, ascendEver:0, transEver:0,   // 어떤 초기화에도 줄지 않는다
  deepestEver:0, manaPeakL:-Infinity,         // 업적이 기다릴 수 있는 최고 기록
  lastSoulGain:0, lastRelicGain:0, lastStarGain:0,
  sinceRebirth:0, sinceAscend:0, sinceTrans:0, sinceInf:0,
  deepest:0, floor:1, prog:0, exploring:false,
  chal:null, chalDone:{}, chalTime:0, chalCd:0, bestRun:0, floorCd:0, autoUnlocked:{},
  achs:{},
  auto:{gather:1,build:1,research:1,rune:1,gear:1,dungeon:1,soulup:1,rebirth:1,relicup:1,starup:1,upinf:1,upeter:1,upreal:1,upvoid:1,uporigin:1,brketer:1,brkreal:1,brkvoid:1,brkorigin:1,ascend:1,trans:1,inf:1,chal:1},
  timers:{build:0,research:0,rune:0,gear:0,gather:0},
  buyAmt:'max',
  started:Date.now(), lastTick:Date.now(), playtime:0, clicks:0,
}}
export let S=newState(), LOG=[], MC=null;

/* 모듈 경계 너머에서는 import 된 이름에 다시 대입할 수 없다.
   세이브를 불러올 때처럼 상태를 통째로 갈아 끼우는 자리만 이 문을 쓴다. */
export function setS(v){ S=v }
export function setLOG(v){ LOG=v }
export function setMC(v){ MC=v }
