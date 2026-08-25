import { S } from './state'
import { ORIGIN_UPS, INF_UPS, ETER_UPS, REAL_UPS, VOID_UPS, ACHS, ACH_NOUN, BADGES, _ac } from './content'
import { X } from './core'

/* 무한 위의 다섯 칸. 자원 바가 이것을 모듈 평가 시점에 읽으므로
   프레스티지 본체와 떼어 둔다 — 같이 두면 고리가 돌아 undefined 가 된다. */
export const INF_LAYERS=[
 {k:'inf',  ko:'무한',  en:"Infinity",  from:()=>S.manaEver, sp:'infinity', ups:()=>INF_UPS,   store:'infUps'},
 {k:'eter', ko:'영원',  en:"Eternity",  from:()=>S.inf,      sp:'hourglass', ups:()=>ETER_UPS,  store:'eterUps'},
 {k:'real', ko:'현실',  en:"Reality",   from:()=>S.eter,     sp:'portal',   ups:()=>REAL_UPS,  store:'realUps'},
 {k:'void', ko:'공허',  en:"The Void",  from:()=>S.real,     sp:'abysseye', ups:()=>VOID_UPS,  store:'voidUps'},
 {k:'origin',ko:'근원', en:"Origin",    from:()=>S.void,     sp:'orig_tree',ups:()=>ORIGIN_UPS,store:'originUps'},
];

/* 무한 계층 업적은 여기서 만든다 — 콘텐츠 쪽에 두면 INF_LAYERS 를 쓰느라
   두 모듈이 서로를 물어 평가 순서가 꼬여 화면이 통째로 죽는다.
   배지 배정도 업적이 전부 들어온 뒤여야 하므로 함께 둔다. */
for(let i=0;i<INF_LAYERS.length;i++){
  for(const n of [1,5,25,100]){
    ACHS.push({id:'ix'+i+'_'+n, sp:INF_LAYERS[i].sp, nm:{ko:`${INF_LAYERS[i].ko}의 ${ACH_NOUN[_ac.ix%ACH_NOUN.length][0]}`,en:`${ACH_NOUN[_ac.ix%ACH_NOUN.length][1]} of ${INF_LAYERS[i].en}`}, _n:_ac.ix++,
      d:()=>X(`${INF_LAYERS[i].ko} 돌파 ${n}회`,`Break ${INF_LAYERS[i].en} ${n} times`),
      f:()=>(S[INF_LAYERS[i].k+'Count']||0)>=n});
  }
}

/* 그림이 지정되지 않은 업적에 배지를 하나씩 떼어 준다. 앞에서부터 순서대로 주면
   문양이 매번, 색이 열두 개마다, 테두리가 아흔여섯 개마다 바뀐다. */
export let _bi=0;
for(const a of ACHS) if(!a.sp) a.sp=BADGES[_bi++%BADGES.length];
