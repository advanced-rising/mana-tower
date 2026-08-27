import { fmtLog } from './num'
import { COSMOS, chapterOf } from './dungeon'
import { S } from './state'
import { ACHS, ACH_NOUN, BADGES, ETER_UPS, INF_UPS, ORIGIN_UPS, REAL_UPS, VOID_UPS, _ac, achName } from './content'
import { X } from './core'

/* 무한 위의 다섯 칸. 재료 바가 이것을 모듈 평가 시점에 읽으므로
   프레스티지 본체와 떼어 둔다 — 같이 두면 고리가 돌아 undefined 가 된다. */
export const INF_LAYERS=[
 {k:'inf',  ko:'무한',  en:"Infinity",  from:()=>S.manaEver, sp:'tab_inf', ups:()=>INF_UPS,   store:'infUps'},
 {k:'eter', ko:'영원',  en:"Eternity",  from:()=>S.inf,      sp:'tab_eter', ups:()=>ETER_UPS,  store:'eterUps'},
 {k:'real', ko:'현실',  en:"Reality",   from:()=>S.eter,     sp:'tab_real',   ups:()=>REAL_UPS,  store:'realUps'},
 {k:'void', ko:'공허',  en:"The Void",  from:()=>S.real,     sp:'tab_void', ups:()=>VOID_UPS,  store:'voidUps'},
 {k:'origin',ko:'근원', en:"Origin",    from:()=>S.void,     sp:'tab_origin',ups:()=>ORIGIN_UPS,store:'originUps'},
];

/* 무한 계층 업적은 여기서 만든다 — 콘텐츠 쪽에 두면 INF_LAYERS 를 쓰느라
   두 모듈이 서로를 물어 평가 순서가 꼬여 화면이 통째로 죽는다.
   배지 배정도 업적이 전부 들어온 뒤여야 하므로 함께 둔다. */
/* 업적 목록을 만든다. 모듈 평가 시점이 아니라 부팅 때 한 번 부른다 —
   COSMOS 와 INF_LAYERS 를 읽어야 하는데, 순환 고리 안에서 최상위 코드로
   읽으면 아직 비어 있을 수 있다. 배지 배정은 전부 들어온 뒤여야 하므로
   같은 함수 끝에 둔다. */
let _achBuilt=false;
export function buildAchievements(){
  if(_achBuilt) return; _achBuilt=true;
  for(let e=25;e<=300;e+=3){
    const v=Math.pow(10,e);
    ACHS.push({id:'mx'+e, nm:achName('mx',_ac.mx++),
      d:()=>X(`누적 마나 ${fmtLog(e)}`,`${fmtLog(e)} total mana`), f:()=>S.manaPeakL>=e});
  }
  for(let f=100;f<=3000;f+=50){
    ACHS.push({id:'dx'+f, nm:achName('dx',_ac.dx++),
      d:()=>X(`던전 ${f}층`,`Dungeon floor ${f}`), f:()=>(S.deepestEver||S.deepest)>=f});
  }
  for(let n=50;n<=3000;n+=50){
    ACHS.push({id:'rx'+n, nm:achName('rx',_ac.rx++),
      d:()=>X(`환생 ${n}회`,`Rebirth ${n} times`), f:()=>(S.rebirthEver||S.rebirths)>=n});
  }
  for(let n=5;n<=500;n+=5){
    ACHS.push({id:'ax'+n, nm:achName('ax',_ac.ax++),
      d:()=>X(`승천 ${n}회`,`Ascend ${n} times`), f:()=>(S.ascendEver||S.ascensions)>=n});
  }
  /* 우주 계층과 무한 계층을 밟을 때마다 */
  for(let i=1;i<COSMOS.length;i++){
    ACHS.push({id:'cx'+i, sp:COSMOS[i].sp, nm:{ko:`${COSMOS[i].ko}에 닿다`,en:`Reach the ${COSMOS[i].en}`},
      d:()=>X(`탐사에서 ${COSMOS[i].ko} 계층 돌파`,`Break into the ${COSMOS[i].en}`),
      f:()=>chapterOf(Math.max(1,S.deepest||1))>=i});
  }
  for(let n=1;n<=200;n+=1){
    ACHS.push({id:'tx'+n, nm:achName('tx',_ac.tx++),
      d:()=>X(`초월 ${n}회`,`Transcend ${n} times`), f:()=>(S.transEver||S.transcends)>=n});
  }
  for(let i=0;i<INF_LAYERS.length;i++){
    for(const n of [1,5,25,100]){
      ACHS.push({id:'ix'+i+'_'+n, sp:`brk_${INF_LAYERS[i].k}_${n}`, nm:{ko:`${INF_LAYERS[i].ko}의 ${ACH_NOUN[_ac.ix%ACH_NOUN.length][0]}`,en:`${ACH_NOUN[_ac.ix%ACH_NOUN.length][1]} of ${INF_LAYERS[i].en}`}, _n:_ac.ix++,
        d:()=>X(`${INF_LAYERS[i].ko} 돌파 ${n}회`,`Break ${INF_LAYERS[i].en} ${n} times`),
        f:()=>(S[INF_LAYERS[i].k+'Count']||0)>=n});
    }
  }

  /* 그림이 지정되지 않은 업적에 배지를 하나씩 떼어 준다. 앞에서부터 순서대로 주면
     문양이 매번, 색이 열두 개마다, 테두리가 아흔여섯 개마다 바뀐다. */
  let _bi=0;
  for(const a of ACHS) if(!a.sp) a.sp=BADGES[_bi++%BADGES.length];
}
