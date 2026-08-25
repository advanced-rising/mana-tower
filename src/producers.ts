/* 시설 여섯 단계. 상태(newState)가 배열 길이를 여기서 얻으므로
   다른 콘텐츠와 떼어 둔다 — 같이 두면 state 와 content 가 서로를 물어
   초기화 순서가 꼬인다. */
export const PRODUCERS=[
 {id:'apprentice',sp:'apprentice',nm:{ko:'견습 마법사',en:"Apprentice Mage"},base:15,   g:1.15,rate:1,    makes:{ko:'마나',en:"Mana"}},
 {id:'workshop',  sp:'workshop',  nm:{ko:'마법 공방',en:"Arcane Workshop"},  base:400,  g:1.18,rate:0.12, makes:{ko:'견습 마법사',en:"Apprentices"}},
 {id:'tower',     sp:'tower',     nm:{ko:'마탑',en:"Mage Tower"},       base:2.5e4,g:1.21,rate:0.07, makes:{ko:'마법 공방',en:"Workshops"}},
 {id:'academy',   sp:'academy',   nm:{ko:'아카데미',en:"Academy"},   base:3e6,  g:1.25,rate:0.045,makes:{ko:'마탑',en:"Towers"}},
 {id:'council',   sp:'council',   nm:{ko:'대현자 회의',en:"Archsage Council"},base:1.5e9,g:1.30,rate:0.03, makes:{ko:'아카데미',en:"Academies"}},
 {id:'spire',     sp:'spire',     nm:{ko:'별빛 첨탑',en:"Starlight Spire"},base:1.2e12,g:1.36,rate:0.02, makes:{ko:'대현자 회의',en:"Councils"}},
];
