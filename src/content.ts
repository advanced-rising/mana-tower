import { INF_LAYERS } from './prestige'
import { COSMOS, chapterOf } from './dungeon'
import { X } from './core'
import { S } from './state'
import { chalTotal, cnt, cutTxt, fmt, fmtLog, gearTotal, pctTxt, powTxt, runeTotal, startManaLog } from './num'
import { M } from './multipliers'

/* ══════════════ 콘텐츠 정의 ══════════════
   모든 항목은 apply(m, lv)로 배율 객체 m을 직접 수정한다.
   새 요소는 배열에 한 줄 추가하면 UI·계산에 자동 반영. */

export const RESEARCH=[
 {id:'q1', sp:'flask',    nm:{ko:'마나 정제',en:"Mana Refinement"},   cost:100,  d:()=>X('마나 생산 ×2',"Mana output ×2"),        apply:m=>m.prod*=2},
 {id:'q2', sp:'feather',  nm:{ko:'룬 각인',en:"Rune Engraving"},     cost:4e3,  d:()=>X('마나 생산 ×2.5',"Mana output ×2.5"), req:'q1', apply:m=>m.prod*=2.5},
 {id:'q3', sp:'book',     nm:{ko:'견습 훈련소',en:"Apprentice Drill"}, cost:5e4,  d:()=>X('견습 마법사 효율 ×3',"Apprentice output ×3"), req:'q1', apply:m=>m.t0*=3},
 {id:'q4', sp:'cog',      nm:{ko:'공방 확장',en:"Workshop Expansion"},   cost:8e5,  d:()=>X('상위 시설 효율 ×2.5',"Higher tiers ×2.5"), req:'q2', apply:m=>m.tUp*=2.5},
 {id:'q5', sp:'spiral',   nm:{ko:'자동 소환진',en:"Summoning Circle"}, cost:1e7,  d:()=>X('자동 구매가 한 번에 최대 수량 구매',"Auto-buy purchases the max amount at once"), apply:m=>m.autoMax=true},
 {id:'q6', sp:'lantern',  nm:{ko:'심연의 등불',en:"Abyssal Lantern"}, cost:1e8,  d:()=>X('던전 공격력 ×3',"Dungeon power ×3"),      apply:m=>m.dungeon*=3},
 {id:'q7', sp:'incense', nm:{ko:'봉헌의 예법',en:"Rites of Offering"}, cost:6e8,  d:()=>X('오퍼링 획득 ×2',"Offerings ×2"),      apply:m=>m.offer*=2},
 {id:'q8', sp:'bolt',     nm:{ko:'마나 폭풍',en:"Mana Storm"},   cost:2e9,  d:()=>X('마나 생산 ×4',"Mana output ×4"),   req:'q4', apply:m=>m.prod*=4},
 {id:'q9', sp:'hourglass',nm:{ko:'시간 왜곡',en:"Time Warp"},   cost:5e10, d:()=>X('게임 속도 ×1.25',"Game speed ×1.25"),     apply:m=>m.speed*=1.25},
 {id:'q10',sp:'loupe',  nm:{ko:'결정 감정법',en:"Crystal Appraisal"}, cost:2e11, d:()=>X('결정 획득 ×2',"Crystals ×2"),        apply:m=>m.crystal*=2},
 {id:'q11',sp:'vial',     nm:{ko:'영혼 추출기',en:"Soul Extractor"}, cost:1e12, d:()=>X('영혼석 획득 ×1.5',"Soul Shards ×1.5"),    apply:m=>m.soul*=1.5},
 {id:'q12',sp:'swordup',  nm:{ko:'심연 검술',en:"Abyssal Swordplay"},   cost:5e12, d:()=>X('던전 공격력 ×5',"Dungeon power ×5"), req:'q6', apply:m=>m.dungeon*=5},
 {id:'q13',sp:'star',     nm:{ko:'대마법 이론',en:"Grand Magic Theory"}, cost:2e13, d:()=>X('마나 생산 ×8',"Mana output ×8"),   req:'q8', apply:m=>m.prod*=8},
 {id:'q14',sp:'runebook',nm:{ko:'룬 해독학',en:"Rune Decipherment"}, cost:1e14, d:()=>X('룬 최대 레벨 +10',"Rune level cap +10"),    apply:m=>m.runeCap+=10},
 {id:'q15',sp:'map',      nm:{ko:'무한 회랑',en:"Endless Corridor"},   cost:5e14, d:()=>X('층당 배율 2% → 5%',"Depth bonus 2% → 5%"),   apply:m=>m.floorPct=Math.max(m.floorPct,0.05)},
 {id:'q16',sp:'scroll',   nm:{ko:'봉헌 의식',en:"Offering Ritual"},   cost:2e15, d:()=>X('오퍼링 획득 ×3',"Offerings ×3"), req:'q7', apply:m=>m.offer*=3},
 {id:'q17',sp:'anvil', nm:{ko:'장비 연성',en:"Gear Transmutation"},   cost:1e16, d:()=>X('장비 효과 지수 ×1.5',"Gear effect exponent ×1.5"), apply:m=>m.gearPow*=1.5},
 {id:'q18',sp:'portal',   nm:{ko:'차원 균열',en:"Dimensional Rift"},   cost:5e16, d:()=>X('마나 생산 ×15',"Mana output ×15"), req:'q13',apply:m=>m.prod*=15},
 {id:'q19',sp:'bone',    nm:{ko:'보스 해부학',en:"Boss Anatomy"}, cost:5e17, d:()=>X('보스 보상 ×5',"Boss rewards ×5"),        apply:m=>m.boss*=5},
 {id:'q20',sp:'infinity', nm:{ko:'무한의 계시',en:"Infinite Revelation"}, cost:1e19, d:()=>X('마나 생산 ×50',"Mana output ×50"), req:'q18',apply:m=>m.prod*=50},
];

/* 룬 · 오퍼링으로 강화, 승천 시 초기화 */
export const RUNES=[
 {id:'speed', sp:'rune_speed', nm:{ko:'신속의 룬',en:"Rune of Haste"}, d:l=>`${X('게임 속도',"Game speed")} +${pctTxt(1.5*l)}% → +${pctTxt(1.5*(l+1))}%`,        apply:(m,l)=>m.speed*=1+0.015*l},
 {id:'wealth',sp:'rune_wealth',nm:{ko:'풍요의 룬',en:"Rune of Plenty"}, d:l=>`${X('마나 생산',"Mana output")} ×${powTxt(1.06,l)} → ×${powTxt(1.06,l+1)}`,      apply:(m,l)=>m.prod*=Math.pow(1.06,l)},
 {id:'wisdom',sp:'rune_wisdom',nm:{ko:'지혜의 룬',en:"Rune of Wisdom"}, d:l=>`${X('오퍼링 획득',"Offerings")} +${(8*l)}% → +${(8*(l+1))}%`,                   apply:(m,l)=>m.offer*=1+0.08*l},
 {id:'guard', sp:'rune_guard', nm:{ko:'수호의 룬',en:"Rune of Warding"}, d:l=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(1.12,l)} → ×${powTxt(1.12,l+1)}`,    apply:(m,l)=>m.dungeon*=Math.pow(1.12,l)},
 {id:'abyss', sp:'rune_abyss', nm:{ko:'심연의 룬',en:"Rune of the Abyss"}, d:l=>`${X('영혼석 획득',"Soul Shards")} ×${powTxt(1.08,l)} → ×${powTxt(1.08,l+1)}`,    apply:(m,l)=>m.soul*=Math.pow(1.08,l)},
];
RUNES.push(
 {id:'might', sp:'rune_might', nm:{ko:'맹위의 룬',en:"Rune of Fury"},
  d:l=>`${X('던전 보상',"Dungeon rewards")} ×${powTxt(1.10,l)} → ×${powTxt(1.10,l+1)}`, apply:(m,l)=>m.floorLoot*=Math.pow(1.10,l)},
 {id:'mind',  sp:'rune_mind',  nm:{ko:'사색의 룬',en:"Rune of Contemplation"},
  d:l=>`${X('아래 두 단계 효율',"Bottom two tiers")} ×${powTxt(1.09,l)} → ×${powTxt(1.09,l+1)}`, apply:(m,l)=>m.t0*=Math.pow(1.09,l)},
 {id:'flow',  sp:'rune_flow',  nm:{ko:'물결의 룬',en:"Rune of Currents"},
  d:l=>`${X('자동화 주기',"Automation interval")} ×${Math.pow(0.985,l).toFixed(3)} → ×${Math.pow(0.985,l+1).toFixed(3)}`, apply:(m,l)=>m.autoSpeed*=Math.pow(0.985,l)},
 {id:'hollow',sp:'rune_void',  nm:{ko:'공동의 룬',en:"Rune of the Hollow"},
  d:l=>`${X('보스 보상',"Boss rewards")} ×${powTxt(1.11,l)} → ×${powTxt(1.11,l+1)}`, apply:(m,l)=>m.boss*=Math.pow(1.11,l)},
 {id:'gate',  sp:'rune_gate',  nm:{ko:'관문의 룬',en:"Rune of Gates"},
  d:l=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(1.07,l)} → ×${powTxt(1.07,l+1)}`, apply:(m,l)=>m.floorPct*=Math.pow(1.07,l)},
 {id:'temper',sp:'rune_forge', nm:{ko:'담금질의 룬',en:"Rune of Tempering"},
  d:l=>`${X('장비 효과 지수',"Gear exponent")} ×${powTxt(1.05,l)} → ×${powTxt(1.05,l+1)}`, apply:(m,l)=>m.gearPow*=Math.pow(1.05,l)},
 {id:'echo',  sp:'rune_echo',  nm:{ko:'메아리의 룬',en:"Rune of Echoes"},
  d:l=>`${X('도전 보상',"Trial rewards")} ×${powTxt(1.08,l)} → ×${powTxt(1.08,l+1)}`, apply:(m,l)=>m.chalPow*=Math.pow(1.08,l)},
);
export const runeCost=l=>12*Math.pow(1.30,l);

/* 장비 · 결정으로 강화, 영구 유지 */
export const GEAR=[
 {id:'grimoire',sp:'grimoire',nm:{ko:'마도서',en:"Grimoire"}, d:(l,p)=>`${X('마나 생산',"Mana output")} ×${powTxt(1.15,l*p)} → ×${powTxt(1.15,(l+1)*p)}`,    apply:(m,l)=>m.prod*=Math.pow(1.15,l*m.gearPow)},
 {id:'staff',   sp:'staff',   nm:{ko:'지팡이',en:"Staff"}, d:(l,p)=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(1.25,l*p)} → ×${powTxt(1.25,(l+1)*p)}`,  apply:(m,l)=>m.dungeon*=Math.pow(1.25,l*m.gearPow)},
 {id:'amulet',  sp:'amulet',  nm:{ko:'부적',en:"Amulet"},   d:(l,p)=>`${X('결정·오퍼링',"Crystals & Offerings")} ×${powTxt(1.12,l*p)} → ×${powTxt(1.12,(l+1)*p)}`,  apply:(m,l)=>{const v=Math.pow(1.12,l*m.gearPow);m.crystal*=v;m.offer*=v;}},
];
GEAR.push(
 {id:'shield', sp:'shield',  nm:{ko:'수호 방패',en:"Aegis"},
  d:(l,p)=>`${X('던전 보상',"Dungeon rewards")} ×${powTxt(1.18,l*p)} → ×${powTxt(1.18,(l+1)*p)}`, apply:(m,l)=>m.floorLoot*=Math.pow(1.18,l*m.gearPow)},
 {id:'gauntlet',sp:'gauntlet',nm:{ko:'강철 건틀릿',en:"Steel Gauntlet"},
  d:(l,p)=>`${X('보스 보상',"Boss rewards")} ×${powTxt(1.22,l*p)} → ×${powTxt(1.22,(l+1)*p)}`, apply:(m,l)=>m.boss*=Math.pow(1.22,l*m.gearPow)},
 {id:'ring',   sp:'ring',    nm:{ko:'현자의 반지',en:"Sage Ring"},
  /* 상한을 장비 지수에 비례시키면 고리가 돈다 — 상한이 오르면 담금질 룬을 더 올릴 수 있고,
     그 룬이 다시 지수를 올린다. 지수가 1e70 까지 뛴 것이 이 고리 때문이었다. 끊는다. */
  d:(l,p)=>`${X('룬 최대 레벨',"Rune level cap")} +${2*l} → +${2*(l+1)}`, apply:(m,l)=>m.runeCap+=2*l},
 {id:'robe',   sp:'robe',    nm:{ko:'별빛 로브',en:"Starlit Robe"},
  d:(l,p)=>`${X('영혼석 획득',"Soul Shards")} ×${powTxt(1.16,l*p)} → ×${powTxt(1.16,(l+1)*p)}`, apply:(m,l)=>m.soul*=Math.pow(1.16,l*m.gearPow)},
 {id:'crown',  sp:'crown16', nm:{ko:'왕관',en:"Crown"},
  d:(l,p)=>`${X('오퍼링 획득',"Offerings")} ×${powTxt(1.16,l*p)} → ×${powTxt(1.16,(l+1)*p)}`, apply:(m,l)=>m.offer*=Math.pow(1.16,l*m.gearPow)},
 {id:'lantern2',sp:'voyager',nm:{ko:'항해 등불',en:"Voyager Lantern"},
  d:(l,p)=>`${X('게임 속도',"Game speed")} +${pctTxt(2*l*p)}% → +${pctTxt(2*(l+1)*p)}%`, apply:(m,l)=>m.speed*=1+0.02*l*m.gearPow},
 {id:'compass2',sp:'compass',nm:{ko:'항성 나침반',en:"Stellar Compass"},
  d:(l,p)=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(1.12,l*p)} → ×${powTxt(1.12,(l+1)*p)}`, apply:(m,l)=>m.floorPct*=Math.pow(1.12,l*m.gearPow)},
);
GEAR.push(
 {id:'helm',  sp:'helm',  nm:{ko:'파쇄 투구',en:"Breaker Helm"},
  d:(l,p)=>`${X('보스 보상',"Boss rewards")} ×${powTxt(1.20,l*p)} → ×${powTxt(1.20,(l+1)*p)}`, apply:(m,l)=>m.boss*=Math.pow(1.20,l*m.gearPow)},
 {id:'boots', sp:'boots', nm:{ko:'질주의 장화',en:"Striding Boots"},
  d:(l,p)=>`${X('게임 속도',"Game speed")} +${pctTxt(1.8*l*p)}% → +${pctTxt(1.8*(l+1)*p)}%`, apply:(m,l)=>m.speed*=1+0.018*l*m.gearPow},
 {id:'cloak', sp:'cloak', nm:{ko:'그림자 망토',en:"Shadow Cloak"},
  d:(l,p)=>`${X('던전 보상',"Dungeon rewards")} ×${powTxt(1.17,l*p)} → ×${powTxt(1.17,(l+1)*p)}`, apply:(m,l)=>m.floorLoot*=Math.pow(1.17,l*m.gearPow)},
 {id:'belt',  sp:'belt',  nm:{ko:'절약의 허리띠',en:"Thrift Belt"},
  d:(l,p)=>`${X('남는 시설 비용',"Building cost left")} ${cutTxt(0.985,l*p)} → ${cutTxt(0.985,(l+1)*p)}`, apply:(m,l)=>m.costMul*=Math.pow(0.985,l*m.gearPow)},
 {id:'tome',  sp:'tome',  nm:{ko:'대현자의 비망록',en:"Archsage Codex"},
  d:(l,p)=>`${X('상위 시설 효율',"Higher tiers")} ×${powTxt(1.14,l*p)} → ×${powTxt(1.14,(l+1)*p)}`, apply:(m,l)=>m.tUp*=Math.pow(1.14,l*m.gearPow)},
 {id:'horn',  sp:'horn',  nm:{ko:'시련의 뿔피리',en:"Trialhorn"},
  d:(l,p)=>`${X('도전 보상',"Trial rewards")} ×${powTxt(1.13,l*p)} → ×${powTxt(1.13,(l+1)*p)}`, apply:(m,l)=>m.chalPow*=Math.pow(1.13,l*m.gearPow)},
 {id:'mirror',sp:'mirror',nm:{ko:'결정 거울',en:"Crystal Mirror"},
  d:(l,p)=>`${X('결정 획득',"Crystals")} ×${powTxt(1.19,l*p)} → ×${powTxt(1.19,(l+1)*p)}`, apply:(m,l)=>m.crystal*=Math.pow(1.19,l*m.gearPow)},
 {id:'sigil', sp:'sigil', nm:{ko:'만상의 인장',en:"Sigil of All Things"},
  d:(l,p)=>`${X('모든 생산·획득',"All output")} ×${powTxt(1.09,l*p)} → ×${powTxt(1.09,(l+1)*p)}`,
  apply:(m,l)=>{const v=Math.pow(1.09,l*m.gearPow);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
);
export const gearCost=l=>8*Math.pow(1.6,l);
/* 등비수열이라 n 단계를 한 번에 사는 값은 닫힌 식으로 구한다.
   장비를 100 단계씩 올리고 싶을 때 백 번 누르지 않아도 된다. */
export function bulkCost(costFn,from,n,g){
  const c0=costFn(from);
  return c0*(Math.pow(g,n)-1)/(g-1);
}
export function bulkMax(costFn,from,budget,g){
  const c0=costFn(from);
  const v=budget*(g-1)/c0+1;
  return v<=1?0:Math.max(0,Math.floor(Math.log(v)/Math.log(g)));
}
export function buyAmtFor(costFn,from,budget,g){
  if(S.buyAmt==='max') return bulkMax(costFn,from,budget,g);
  const n=S.buyAmt;
  return bulkCost(costFn,from,n,g)<=budget?n:0;
}

/* 영혼 강화 · 환생 통화, 승천 시 초기화 */
export const SOUL_UPS=[
 {id:'s1', sp:'gem',      nm:{ko:'영혼 각인',en:"Soul Sigil"},  max:Infinity,c:l=>2*Math.pow(1.7,l),  d:l=>`${X('마나 생산',"Mana output")} ×${powTxt(1.15,l)} → ×${powTxt(1.15,l+1)}`, apply:(m,l)=>m.prod*=Math.pow(1.15,l)},
 {id:'s2', sp:'coinpurse',   nm:{ko:'값싼 주문서',en:"Cheap Scrolls"},max:Infinity,      c:l=>6*Math.pow(2.1,l),  d:l=>`${X('시설 비용 증가율',"Cost growth")} ×${cutTxt(0.93,l)} → ×${cutTxt(0.93,l+1)}`, apply:(m,l)=>m.costMul*=Math.pow(0.93,l)},
 {id:'s3', sp:'fastfwd',  nm:{ko:'신속한 손길',en:"Swift Hands"},max:Infinity,c:l=>10*Math.pow(2.1,l), d:l=>`${X('자동화 주기',"Automation interval")} ${pctTxt(Math.pow(0.88,l)*100)}% → ${pctTxt(Math.pow(0.88,l+1)*100)}%`, apply:(m,l)=>m.autoSpeed*=Math.pow(0.88,l)},
 {id:'s4', sp:'sparkle',  nm:{ko:'영혼 공명',en:"Soul Resonance"},  max:Infinity,c:l=>14*Math.pow(2.2,l), d:l=>`${X('영혼석 획득',"Soul Shards")} ×${powTxt(1.3,l)} → ×${powTxt(1.3,l+1)}`, apply:(m,l)=>m.soul*=Math.pow(1.3,l)},
 {id:'s5', sp:'mastery',  nm:{ko:'던전 숙련',en:"Dungeon Mastery"},  max:Infinity,c:l=>9*Math.pow(1.95,l), d:l=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(1.35,l)} → ×${powTxt(1.35,l+1)}`, apply:(m,l)=>m.dungeon*=Math.pow(1.35,l)},
 {id:'s6', sp:'moon',     nm:{ko:'오프라인 계약',en:"Offline Pact"},max:Infinity,    c:l=>18*Math.pow(1.8,l), d:l=>`${X('오프라인 상한',"Offline cap")} ${4+2*l}${X("시간","h")} → ${6+2*l}${X("시간","h")}`, apply:(m,l)=>m.offline=4+2*l},
 {id:'s7', sp:'gift',     nm:{ko:'시작 지원금',en:"Starting Grant"},max:Infinity,c:l=>22*Math.pow(2.6,l), d:l=>`${X('환생 직후 마나',"Mana right after rebirth")} ${fmtLog(startManaLog(l))} → ${fmtLog(startManaLog(l+1))}`, apply:()=>{}},
 {id:'s8', sp:'runering',nm:{ko:'룬 친화',en:"Rune Affinity"}, max:Infinity,       c:l=>25*Math.pow(2.4,l), d:l=>`${X('룬 최대 레벨',"Rune level cap")} +${5*l} → +${5*(l+1)}`, apply:(m,l)=>m.runeCap+=5*l},
 {id:'s9', sp:'chisel',  nm:{ko:'결정 세공',en:"Crystal Cutting"},  max:Infinity,c:l=>16*Math.pow(2.3,l), d:l=>`${X('결정 획득',"Crystals")} ×${powTxt(1.5,l)} → ×${powTxt(1.5,l+1)}`, apply:(m,l)=>m.crystal*=Math.pow(1.5,l)},
 {id:'s10',sp:'chalice', nm:{ko:'봉헌의 축복',en:"Blessing of Offering"},max:Infinity,c:l=>20*Math.pow(2.35,l),d:l=>`${X('오퍼링 획득',"Offerings")} ×${powTxt(1.4,l)} → ×${powTxt(1.4,l+1)}`, apply:(m,l)=>m.offer*=Math.pow(1.4,l)},
];

SOUL_UPS.push(
 {id:'s11',sp:'bulwark',   nm:{ko:'영혼 방벽',en:"Soul Bulwark"}, max:Infinity,c:l=>18*Math.pow(2.4,l),
  d:l=>`${X('던전 보상',"Dungeon rewards")} ×${powTxt(1.6,l)} → ×${powTxt(1.6,l+1)}`, apply:(m,l)=>m.floorLoot*=Math.pow(1.6,l)},
 {id:'s12',sp:'spoils',     nm:{ko:'전리품 감식',en:"Spoils Appraisal"}, max:Infinity,c:l=>24*Math.pow(2.5,l),
  d:l=>`${X('보스 보상',"Boss rewards")} ×${powTxt(1.8,l)} → ×${powTxt(1.8,l+1)}`, apply:(m,l)=>m.boss*=Math.pow(1.8,l)},
 {id:'s13',sp:'starshard',     nm:{ko:'별의 조각',en:"Shard of Stars"}, max:Infinity,c:l=>30*Math.pow(2.7,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(1.25,l)} → ×${powTxt(1.25,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(1.25,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'s14',sp:'route',      nm:{ko:'항로 기록',en:"Charted Routes"}, max:Infinity,c:l=>26*Math.pow(2.45,l),
  d:l=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(1.3,l)} → ×${powTxt(1.3,l+1)}`, apply:(m,l)=>m.floorPct*=Math.pow(1.3,l)},
 {id:'s15',sp:'unsealed', nm:{ko:'금서 해방',en:"Unsealed Tome"}, max:Infinity,c:l=>34*Math.pow(2.8,l),
  d:l=>`${X('상위 시설 효율',"Higher tiers")} ×${powTxt(1.7,l)} → ×${powTxt(1.7,l+1)}`, apply:(m,l)=>m.tUp*=Math.pow(1.7,l)},
 {id:'s16',sp:'soulforge',    nm:{ko:'혼의 벼림',en:"Soulforge"}, max:Infinity,c:l=>40*Math.pow(2.9,l),
  d:l=>`${X('장비 효과 지수',"Gear exponent")} ×${powTxt(1.2,l)} → ×${powTxt(1.2,l+1)}`, apply:(m,l)=>m.gearPow*=Math.pow(1.2,l)},
);

/* 유물 강화 · 승천 통화, 영구 */
export const RELIC_UPS=[
 {id:'a1', sp:'idol',    nm:{ko:'고대 유물',en:"Ancient Relic"},  max:Infinity,c:l=>1*Math.pow(3,l),    d:l=>`${X('마나 생산',"Mana output")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`, apply:(m,l)=>m.prod*=Math.pow(2,l)},
 {id:'a2', sp:'pickaxe',  nm:{ko:'영혼 광맥',en:"Soul Vein"},  max:Infinity,c:l=>2*Math.pow(3.2,l),  d:l=>`${X('영혼석 획득',"Soul Shards")} ×${powTxt(2.5,l)} → ×${powTxt(2.5,l+1)}`, apply:(m,l)=>m.soul*=Math.pow(2.5,l)},
 {id:'a3', sp:'clock',nm:{ko:'시간 가속',en:"Time Acceleration"},  max:Infinity,      c:l=>3*Math.pow(4,l),    d:l=>`${X('게임 속도',"Game speed")} +${12*l}% → +${12*(l+1)}%`, apply:(m,l)=>m.speed*=1+0.12*l},
 {id:'a4', sp:'voyage',  nm:{ko:'심연 항해',en:"Abyssal Voyage"},  max:Infinity,c:l=>4*Math.pow(3.4,l),  d:l=>`${X('던전 보상',"Dungeon rewards")} ×${powTxt(3,l)} → ×${powTxt(3,l+1)}`, apply:(m,l)=>m.floorLoot*=Math.pow(3,l)},
 {id:'a5', sp:'blessing',  nm:{ko:'왕국의 축복',en:"Kingdom's Blessing"},max:Infinity,c:l=>5*Math.pow(3.5,l),  d:l=>X(`환생 후 각 시설 ${8*l}개 → ${8*(l+1)}개 무료`,`Free buildings after rebirth: ${8*l} → ${8*(l+1)}`), apply:()=>{}},
 {id:'a6', sp:'banner',      nm:{ko:'심연의 지도',en:"Map of the Abyss"},max:Infinity,c:l=>6*Math.pow(3.8,l),  d:l=>`${X('층당 배율',"Depth bonus")} +${2*l}%p → +${2*(l+1)}%p`, apply:(m,l)=>m.floorPct+=0.02*l},
 {id:'a7', sp:'engrave',nm:{ko:'룬 각인술',en:"Rune Inscription"}, max:Infinity,       c:l=>10*Math.pow(4.5,l), d:l=>`${X('룬 최대 레벨',"Rune level cap")} +${10*l} → +${10*(l+1)}`, apply:(m,l)=>m.runeCap+=10*l},
 {id:'a8', sp:'treasure',      nm:{ko:'보물 감식',en:"Treasure Appraisal"},  max:Infinity,c:l=>8*Math.pow(3.6,l),  d:l=>`${X('결정 획득',"Crystals")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`, apply:(m,l)=>m.crystal*=Math.pow(2,l)},
 {id:'a9', sp:'chain',    nm:{ko:'시련의 인장',en:"Seal of Trials"},max:Infinity,c:l=>12*Math.pow(4,l),   d:l=>`${X('도전 보상',"Trial rewards")} ×${powTxt(1.5,l)} → ×${powTxt(1.5,l+1)}`, apply:(m,l)=>m.chalPow*=Math.pow(1.5,l)},
 {id:'a10',sp:'seed',     nm:{ko:'초월의 씨앗',en:"Seed of Transcendence"},max:Infinity,c:l=>20*Math.pow(5,l),   d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(1.35,l)} → ×${powTxt(1.35,l+1)}`, apply:(m,l)=>{const v=Math.pow(1.35,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
];

RELIC_UPS.push(
 {id:'a11',sp:'beacon', nm:{ko:'심연의 등대',en:"Abyssal Beacon"}, max:Infinity,c:l=>7*Math.pow(3.4,l),
  d:l=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(1.8,l)} → ×${powTxt(1.8,l+1)}`,
  apply:(m,l)=>m.floorPct*=Math.pow(1.8,l)},
 {id:'a12',sp:'forge',   nm:{ko:'불멸의 벼림',en:"Undying Forge"}, max:Infinity,c:l=>9*Math.pow(3.7,l),
  d:l=>`${X('장비 효과 지수',"Gear exponent")} ×${powTxt(1.35,l)} → ×${powTxt(1.35,l+1)}`,
  apply:(m,l)=>m.gearPow*=Math.pow(1.35,l)},
 {id:'a13',sp:'eternalhand', nm:{ko:'영원한 손길',en:"Eternal Hands"}, max:Infinity,c:l=>11*Math.pow(3.9,l),
  d:l=>`${X('자동화 주기',"Automation interval")} ×${(Math.pow(0.85,l)).toFixed(3)} → ×${(Math.pow(0.85,l+1)).toFixed(3)}`,
  apply:(m,l)=>m.autoSpeed*=Math.pow(0.85,l)},
 {id:'a14',sp:'giantbone',    nm:{ko:'거인의 유해',en:"Bones of Giants"}, max:Infinity,c:l=>13*Math.pow(4.1,l),
  d:l=>`${X('보스 보상',"Boss rewards")} ×${powTxt(3,l)} → ×${powTxt(3,l+1)}`,
  apply:(m,l)=>m.boss*=Math.pow(3,l)},
 {id:'a15',sp:'nosleep',    nm:{ko:'잠들지 않는 탑',en:"Sleepless Tower"}, max:Infinity,c:l=>10*Math.pow(3.2,l),
  d:l=>`${X('오프라인 상한',"Offline cap")} +${4*l}${X('시간','h')} → +${4*(l+1)}${X('시간','h')}`,
  apply:(m,l)=>m.offline+=4*l},
 {id:'a16',sp:'relicheart',     nm:{ko:'유물의 심장',en:"Heart of Relics"}, max:Infinity,c:l=>16*Math.pow(4.6,l),
  d:l=>`${X('승천 유물 획득',"Relics on ascension")} ×${powTxt(1.6,l)} → ×${powTxt(1.6,l+1)}`,
  apply:(m,l)=>m.relic*=Math.pow(1.6,l)},
);

RELIC_UPS.push(
 {id:'a17',sp:'oldseal',  nm:{ko:'고대의 인장',en:"Ancient Seal"}, max:Infinity,c:l=>15*Math.pow(4.2,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(1.5,l)} → ×${powTxt(1.5,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(1.5,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'a18',sp:'throne',   nm:{ko:'부서진 왕좌',en:"Broken Throne"}, max:Infinity,c:l=>18*Math.pow(4.4,l),
  d:l=>`${X('상위 시설 효율',"Higher tiers")} ×${powTxt(2.2,l)} → ×${powTxt(2.2,l+1)}`,
  apply:(m,l)=>m.tUp*=Math.pow(2.2,l)},
 {id:'a19',sp:'voidheart',nm:{ko:'심연의 심장',en:"Heart of the Abyss"}, max:Infinity,c:l=>20*Math.pow(4.6,l),
  d:l=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(3,l)} → ×${powTxt(3,l+1)}`,
  apply:(m,l)=>m.dungeon*=Math.pow(3,l)},
 {id:'a20',sp:'firstseed',nm:{ko:'시원의 씨앗',en:"Primordial Seed"}, max:Infinity,c:l=>22*Math.pow(4.8,l),
  d:l=>`${X('아래 두 단계 효율',"Bottom two tiers")} ×${powTxt(2.5,l)} → ×${powTxt(2.5,l+1)}`,
  apply:(m,l)=>m.t0*=Math.pow(2.5,l)},
 {id:'a21',sp:'reliquary',nm:{ko:'유물함',en:"Reliquary"}, max:Infinity,c:l=>14*Math.pow(4,l),
  d:l=>`${X('결정 획득',"Crystals")} ×${powTxt(2.4,l)} → ×${powTxt(2.4,l+1)}`,
  apply:(m,l)=>m.crystal*=Math.pow(2.4,l)},
 {id:'a22',sp:'pillar',   nm:{ko:'무너진 기둥',en:"Fallen Pillar"}, max:Infinity,c:l=>17*Math.pow(4.3,l),
  d:l=>`${X('오퍼링 획득',"Offerings")} ×${powTxt(2.4,l)} → ×${powTxt(2.4,l+1)}`,
  apply:(m,l)=>m.offer*=Math.pow(2.4,l)},
 {id:'a23',sp:'starcompass',nm:{ko:'별의 나침반',en:"Star Compass"}, max:Infinity,c:l=>19*Math.pow(4.5,l),
  d:l=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`,
  apply:(m,l)=>m.floorPct*=Math.pow(2,l)},
 {id:'a24',sp:'glory',    nm:{ko:'영광의 깃발',en:"Banner of Glory"}, max:Infinity,c:l=>25*Math.pow(5,l),
  d:l=>`${X('도전 보상',"Trial rewards")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`,
  apply:(m,l)=>m.chalPow*=Math.pow(2,l)},
);

/* 별 강화 · 초월 통화. 무엇을 해도 사라지지 않는다 */
export const STAR_UPS=[
 {id:'t1', sp:'starsigil',     nm:{ko:'별의 인장',en:"Star Sigil"},     max:Infinity,c:l=>1*Math.pow(3,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(2,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'t2', sp:'constellation',  nm:{ko:'성좌의 축복',en:"Constellation"},max:Infinity,c:l=>2*Math.pow(3.5,l),
  d:l=>`${X('마나 생산',"Mana output")} ×${powTxt(3,l)} → ×${powTxt(3,l+1)}`,
  apply:(m,l)=>m.prod*=Math.pow(3,l)},
 {id:'t3', sp:'riverclock',nm:{ko:'시간의 강',en:"River of Time"},  max:Infinity, c:l=>3*Math.pow(5,l),
  d:l=>`${X('게임 속도',"Game speed")} +${20*l}% → +${20*(l+1)}%`, apply:(m,l)=>m.speed*=1+0.20*l},
 {id:'t4', sp:'soul',     nm:{ko:'영혼의 대양',en:"Sea of Souls"}, max:Infinity,c:l=>3*Math.pow(3.6,l),
  d:l=>`${X('영혼석 획득',"Soul Shards")} ×${powTxt(3,l)} → ×${powTxt(3,l+1)}`,
  apply:(m,l)=>m.soul*=Math.pow(3,l)},
 {id:'t5', sp:'relic',    nm:{ko:'유물 감응',en:"Relic Attunement"},max:Infinity,c:l=>5*Math.pow(4,l),
  d:l=>`${X('승천 유물 획득',"Relics on ascension")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`,
  apply:(m,l)=>m.relic*=Math.pow(2,l)},
 {id:'t6', sp:'ledger',nm:{ko:'무한 서고',en:"Endless Library"},max:Infinity,  c:l=>4*Math.pow(4.5,l),
  d:l=>`${X('시설 비용 증가율',"Cost growth")} ×${cutTxt(0.88,l)} → ×${cutTxt(0.88,l+1)}`,
  apply:(m,l)=>m.costMul*=Math.pow(0.88,l)},
 {id:'t7', sp:'abysseye2', nm:{ko:'심연의 눈',en:"Eye of the Abyss"},max:Infinity,c:l=>4*Math.pow(3.8,l),
  d:l=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(4,l)} → ×${powTxt(4,l+1)}`,
  apply:(m,l)=>m.dungeon*=Math.pow(4,l)},
 {id:'t8', sp:'crystal',  nm:{ko:'별빛 광맥',en:"Starlit Vein"},   max:Infinity,c:l=>4*Math.pow(3.7,l),
  d:l=>`${X('결정 획득',"Crystals")} ×${powTxt(3,l)} → ×${powTxt(3,l+1)}`,
  apply:(m,l)=>m.crystal*=Math.pow(3,l)},
 {id:'t9', sp:'touch',  nm:{ko:'초월의 손길',en:"Transcendent Touch"},max:Infinity,c:l=>6*Math.pow(4.2,l),
  d:l=>`${X('환생 후 각 시설',"Free buildings after rebirth:")} ${25*l} → ${25*(l+1)}${X('개 무료',' free')}`,
  apply:()=>{}},
 {id:'t10',sp:'starcrown', nm:{ko:'별의 왕관',en:"Crown of Stars"}, max:Infinity,  c:l=>8*Math.pow(5,l),
  d:l=>`${X('룬 최대 레벨',"Rune level cap")} +${25*l} → +${25*(l+1)}`, apply:(m,l)=>m.runeCap+=25*l},
];

STAR_UPS.push(
 {id:'t11',sp:'fold',  nm:{ko:'차원 접기',en:"Folded Space"}, max:Infinity,c:l=>7*Math.pow(4.4,l),
  d:l=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(2.5,l)} → ×${powTxt(2.5,l+1)}`, apply:(m,l)=>m.floorPct*=Math.pow(2.5,l)},
 {id:'t12',sp:'skull',   nm:{ko:'거신 사냥',en:"Titan Hunt"}, max:Infinity,c:l=>9*Math.pow(4.6,l),
  d:l=>`${X('보스 보상',"Boss rewards")} ×${powTxt(4,l)} → ×${powTxt(4,l+1)}`, apply:(m,l)=>m.boss*=Math.pow(4,l)},
 {id:'t13',sp:'vault',nm:{ko:'별의 금고',en:"Vault of Stars"}, max:Infinity,c:l=>10*Math.pow(4.2,l),
  d:l=>`${X('던전 보상',"Dungeon rewards")} ×${powTxt(3.5,l)} → ×${powTxt(3.5,l+1)}`, apply:(m,l)=>m.floorLoot*=Math.pow(3.5,l)},
 {id:'t14',sp:'trialcrown',   nm:{ko:'시련의 왕관',en:"Crown of Trials"}, max:Infinity,c:l=>12*Math.pow(4.8,l),
  d:l=>`${X('도전 보상',"Trial rewards")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`, apply:(m,l)=>m.chalPow*=Math.pow(2,l)},
 {id:'t15',sp:'library',    nm:{ko:'무한 서고 확장',en:"Library Expansion"}, max:Infinity,c:l=>11*Math.pow(4.3,l),
  d:l=>`${X('아래 두 단계 효율',"Bottom two tiers")} ×${powTxt(3,l)} → ×${powTxt(3,l+1)}`, apply:(m,l)=>m.t0*=Math.pow(3,l)},
 {id:'t16',sp:'night',    nm:{ko:'영원한 밤',en:"Endless Night"}, max:Infinity,c:l=>14*Math.pow(4.0,l),
  d:l=>`${X('오프라인 상한',"Offline cap")} +${8*l}${X('시간','h')} → +${8*(l+1)}${X('시간','h')}`, apply:(m,l)=>m.offline+=8*l},
);

/* 영원 강화 · 영원으로만 산다. 계층을 통째로 갈아 넣고 얻는 것이라 효과가 크다.
   영원 돌파에도 살아남지 않는다 — 그때는 정말 처음부터다. */
export const ETER_UPS=[
 {id:'e1', sp:'etersigil', nm:{ko:'영원의 각인',en:"Eternal Sigil"}, max:Infinity,c:l=>1*Math.pow(2.5,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(10,l)} → ×${powTxt(10,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(10,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'e2', sp:'timecrown',nm:{ko:'시간의 지배',en:"Mastery of Time"}, max:Infinity,c:l=>2*Math.pow(3,l),
  d:l=>`${X('게임 속도',"Game speed")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`,
  apply:(m,l)=>m.speed*=Math.pow(2,l)},
 {id:'e3', sp:'abysscrown', nm:{ko:'심연의 지배',en:"Dominion of the Abyss"}, max:Infinity,c:l=>2*Math.pow(2.8,l),
  d:l=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(20,l)} → ×${powTxt(20,l+1)}`,
  apply:(m,l)=>m.dungeon*=Math.pow(20,l)},
 {id:'e4', sp:'agespoils', nm:{ko:'영겁의 전리품',en:"Spoils of Ages"}, max:Infinity,c:l=>3*Math.pow(3,l),
  d:l=>`${X('던전·보스 보상',"Dungeon & boss rewards")} ×${powTxt(8,l)} → ×${powTxt(8,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(8,l);m.floorLoot*=v;m.boss*=v;}},
 {id:'e5', sp:'omniforge',    nm:{ko:'전지의 벼림',en:"Omniscient Forge"}, max:Infinity,c:l=>4*Math.pow(3.4,l),
  d:l=>`${X('장비 효과 지수',"Gear exponent")} ×${powTxt(2,l)} → ×${powTxt(2,l+1)}`,
  apply:(m,l)=>m.gearPow*=Math.pow(2,l)},
 {id:'e6', sp:'etercrown',nm:{ko:'영원의 왕관',en:"Eternal Crown"}, max:Infinity,c:l=>4*Math.pow(3.2,l),
  d:l=>`${X('룬 최대 레벨',"Rune level cap")} +${200*l} → +${200*(l+1)}`, apply:(m,l)=>m.runeCap+=200*l},
 {id:'e7', sp:'nulleconomy',   nm:{ko:'무의 경제',en:"Economy of Nothing"}, max:Infinity,c:l=>5*Math.pow(3.6,l),
  d:l=>`${X('남는 시설 비용',"Building cost left")} ${cutTxt(0.7,l)} → ${cutTxt(0.7,l+1)}`,
  apply:(m,l)=>m.costMul*=Math.pow(0.7,l)},
 {id:'e8', sp:'eternight',    nm:{ko:'잠들지 않는 영원',en:"Sleepless Eternity"}, max:Infinity,c:l=>3*Math.pow(2.6,l),
  d:l=>`${X('오프라인 상한',"Offline cap")} +${24*l}${X('시간','h')} → +${24*(l+1)}${X('시간','h')}`,
  apply:(m,l)=>m.offline+=24*l},
];
ETER_UPS.push(
 {id:'e9', sp:'eonring',   nm:{ko:'영겁의 고리',en:"Ring of Aeons"}, max:Infinity,c:l=>4*Math.pow(3,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(6,l)} → ×${powTxt(6,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(6,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'e10',sp:'timeaxis',  nm:{ko:'시간의 축',en:"Axis of Time"}, max:Infinity,c:l=>5*Math.pow(3.2,l),
  d:l=>`${X('자동화 주기',"Automation interval")} ×${Math.pow(0.6,l).toFixed(3)} → ×${Math.pow(0.6,l+1).toFixed(3)}`,
  apply:(m,l)=>m.autoSpeed*=Math.pow(0.6,l)},
 {id:'e11',sp:'genesis',   nm:{ko:'창세의 불',en:"Fire of Genesis"}, max:Infinity,c:l=>6*Math.pow(3.4,l),
  d:l=>`${X('마나 생산',"Mana output")} ×${powTxt(25,l)} → ×${powTxt(25,l+1)}`,
  apply:(m,l)=>m.prod*=Math.pow(25,l)},
 {id:'e12',sp:'scales',    nm:{ko:'만상의 저울',en:"Scales of All"}, max:Infinity,c:l=>5*Math.pow(3.1,l),
  d:l=>`${X('영혼석·오퍼링 획득',"Soul Shards & Offerings")} ×${powTxt(12,l)} → ×${powTxt(12,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(12,l);m.soul*=v;m.offer*=v;}},
 {id:'e13',sp:'formless',  nm:{ko:'무형의 손',en:"Formless Hand"}, max:Infinity,c:l=>7*Math.pow(3.6,l),
  d:l=>`${X('환생 후 각 시설',"Free buildings after rebirth:")} ${500*l} → ${500*(l+1)}${X('개 무료',' free')}`,
  apply:()=>{}},
 {id:'e14',sp:'scythe',    nm:{ko:'종언의 낫',en:"Scythe of Ending"}, max:Infinity,c:l=>6*Math.pow(3.3,l),
  d:l=>`${X('보스 보상',"Boss rewards")} ×${powTxt(15,l)} → ×${powTxt(15,l+1)}`,
  apply:(m,l)=>m.boss*=Math.pow(15,l)},
 {id:'e15',sp:'starcog',   nm:{ko:'별의 태엽',en:"Stellar Mainspring"}, max:Infinity,c:l=>8*Math.pow(3.8,l),
  d:l=>`${X('승천 유물 획득',"Relics on ascension")} ×${powTxt(5,l)} → ×${powTxt(5,l+1)}`,
  apply:(m,l)=>m.relic*=Math.pow(5,l)},
 {id:'e16',sp:'eontear',   nm:{ko:'영원의 눈물',en:"Tear of Eternity"}, max:Infinity,c:l=>6*Math.pow(3.5,l),
  d:l=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(8,l)} → ×${powTxt(8,l+1)}`,
  apply:(m,l)=>m.floorPct*=Math.pow(8,l)},
);

/* 무한·현실·공허·근원 강화 — 계층마다 자기 통화로만 사는 나무.
   위로 갈수록 수가 적고 효과가 크다. 한 칸 올라가면 그 아래 나무는 접힌다. */
export const INF_UPS=[
 {id:'i1', sp:'inf_core',  nm:{ko:'무한의 핵',en:"Infinite Core"}, max:Infinity,c:l=>1*Math.pow(2.2,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(4,l)} → ×${powTxt(4,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(4,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'i2', sp:'inf_prism', nm:{ko:'무한 프리즘',en:"Infinite Prism"}, max:Infinity,c:l=>1*Math.pow(2.4,l),
  d:l=>`${X('마나 생산',"Mana output")} ×${powTxt(8,l)} → ×${powTxt(8,l+1)}`, apply:(m,l)=>m.prod*=Math.pow(8,l)},
 {id:'i3', sp:'inf_cross', nm:{ko:'교차하는 길',en:"Crossing Paths"}, max:Infinity,c:l=>2*Math.pow(2.6,l),
  d:l=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(10,l)} → ×${powTxt(10,l+1)}`, apply:(m,l)=>m.dungeon*=Math.pow(10,l)},
 {id:'i4', sp:'inf_disc',  nm:{ko:'무한 원반',en:"Infinite Disc"}, max:Infinity,c:l=>2*Math.pow(2.5,l),
  d:l=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(4,l)} → ×${powTxt(4,l+1)}`, apply:(m,l)=>m.floorPct*=Math.pow(4,l)},
 {id:'i5', sp:'inf_burst', nm:{ko:'터지는 빛',en:"Bursting Light"}, max:Infinity,c:l=>3*Math.pow(2.7,l),
  d:l=>`${X('던전·보스 보상',"Dungeon & boss rewards")} ×${powTxt(5,l)} → ×${powTxt(5,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(5,l);m.floorLoot*=v;m.boss*=v;}},
 {id:'i6', sp:'inf_glass', nm:{ko:'모래시계 유리',en:"Hourglass Pane"}, max:Infinity,c:l=>3*Math.pow(3,l),
  d:l=>`${X('게임 속도',"Game speed")} ×${powTxt(1.5,l)} → ×${powTxt(1.5,l+1)}`, apply:(m,l)=>m.speed*=Math.pow(1.5,l)},
 {id:'i7', sp:'inf_orbit', nm:{ko:'무한 궤도',en:"Infinite Orbit"}, max:Infinity,c:l=>3*Math.pow(2.8,l),
  d:l=>`${X('영혼석·오퍼링 획득',"Soul Shards & Offerings")} ×${powTxt(6,l)} → ×${powTxt(6,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(6,l);m.soul*=v;m.offer*=v;}},
 {id:'i8', sp:'inf_seal',  nm:{ko:'무한의 인장',en:"Infinite Seal"}, max:Infinity,c:l=>4*Math.pow(3.1,l),
  d:l=>`${X('결정 획득',"Crystals")} ×${powTxt(6,l)} → ×${powTxt(6,l+1)}`, apply:(m,l)=>m.crystal*=Math.pow(6,l)},
 {id:'i9', sp:'inf_frame', nm:{ko:'경계의 틀',en:"Frame of Bounds"}, max:Infinity,c:l=>4*Math.pow(2.9,l),
  d:l=>`${X('남는 시설 비용',"Building cost left")} ${cutTxt(0.8,l)} → ${cutTxt(0.8,l+1)}`,
  apply:(m,l)=>m.costMul*=Math.pow(0.8,l)},
 {id:'i10',sp:'inf_twin',  nm:{ko:'쌍둥이 고리',en:"Twin Rings"}, max:Infinity,c:l=>5*Math.pow(3.2,l),
  d:l=>`${X('룬 최대 레벨',"Rune level cap")} +${50*l} → +${50*(l+1)}`, apply:(m,l)=>m.runeCap+=50*l},
];
export const REAL_UPS=[
 {id:'r1', sp:'real_gate',  nm:{ko:'현실의 문',en:"Gate of Reality"}, max:Infinity,c:l=>1*Math.pow(2.6,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(30,l)} → ×${powTxt(30,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(30,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'r2', sp:'real_cube',  nm:{ko:'세계의 정육면체',en:"World Cube"}, max:Infinity,c:l=>2*Math.pow(2.8,l),
  d:l=>`${X('마나 생산',"Mana output")} ×${powTxt(80,l)} → ×${powTxt(80,l+1)}`, apply:(m,l)=>m.prod*=Math.pow(80,l)},
 {id:'r3', sp:'real_wave',  nm:{ko:'실재의 파동',en:"Wave of Being"}, max:Infinity,c:l=>2*Math.pow(3,l),
  d:l=>`${X('게임 속도',"Game speed")} ×${powTxt(3,l)} → ×${powTxt(3,l+1)}`, apply:(m,l)=>m.speed*=Math.pow(3,l)},
 {id:'r4', sp:'real_eye',   nm:{ko:'현실을 보는 눈',en:"Eye of Reality"}, max:Infinity,c:l=>3*Math.pow(3.1,l),
  d:l=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(60,l)} → ×${powTxt(60,l+1)}`, apply:(m,l)=>m.dungeon*=Math.pow(60,l)},
 {id:'r5', sp:'real_pillar',nm:{ko:'세계의 기둥',en:"World Pillar"}, max:Infinity,c:l=>3*Math.pow(2.9,l),
  d:l=>`${X('상위 시설 효율',"Higher tiers")} ×${powTxt(10,l)} → ×${powTxt(10,l+1)}`, apply:(m,l)=>m.tUp*=Math.pow(10,l)},
 {id:'r6', sp:'real_spiral',nm:{ko:'회귀의 나선',en:"Spiral of Return"}, max:Infinity,c:l=>4*Math.pow(3.2,l),
  d:l=>`${X('자동화 주기',"Automation interval")} ×${Math.pow(0.5,l).toFixed(3)} → ×${Math.pow(0.5,l+1).toFixed(3)}`,
  apply:(m,l)=>m.autoSpeed*=Math.pow(0.5,l)},
 {id:'r7', sp:'real_shard', nm:{ko:'현실 파편',en:"Reality Shard"}, max:Infinity,c:l=>4*Math.pow(3,l),
  d:l=>`${X('결정 획득',"Crystals")} ×${powTxt(30,l)} → ×${powTxt(30,l+1)}`, apply:(m,l)=>m.crystal*=Math.pow(30,l)},
 {id:'r8', sp:'real_net',   nm:{ko:'인과의 그물',en:"Net of Causes"}, max:Infinity,c:l=>5*Math.pow(3.3,l),
  d:l=>`${X('도전 보상',"Trial rewards")} ×${powTxt(4,l)} → ×${powTxt(4,l+1)}`, apply:(m,l)=>m.chalPow*=Math.pow(4,l)},
 {id:'r9', sp:'real_bloom', nm:{ko:'만개하는 세계',en:"Blooming World"}, max:Infinity,c:l=>5*Math.pow(3.4,l),
  d:l=>`${X('환생 후 각 시설',"Free buildings after rebirth:")} ${5000*l} → ${5000*(l+1)}${X('개 무료',' free')}`, apply:()=>{}},
 {id:'r10',sp:'real_key',   nm:{ko:'현실의 열쇠',en:"Key of Reality"}, max:Infinity,c:l=>6*Math.pow(3.6,l),
  d:l=>`${X('승천 유물 획득',"Relics on ascension")} ×${powTxt(10,l)} → ×${powTxt(10,l+1)}`, apply:(m,l)=>m.relic*=Math.pow(10,l)},
];
export const VOID_UPS=[
 {id:'v1', sp:'void_maw',   nm:{ko:'공허의 아가리',en:"Maw of the Void"}, max:Infinity,c:l=>1*Math.pow(3,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(200,l)} → ×${powTxt(200,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(200,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'v2', sp:'void_rift',  nm:{ko:'공허의 균열',en:"Void Rift"}, max:Infinity,c:l=>2*Math.pow(3.2,l),
  d:l=>`${X('탐사 깊이 배율',"Depth multiplier")} ×${powTxt(40,l)} → ×${powTxt(40,l+1)}`, apply:(m,l)=>m.floorPct*=Math.pow(40,l)},
 {id:'v3', sp:'void_hand',  nm:{ko:'삼키는 손',en:"Swallowing Hand"}, max:Infinity,c:l=>2*Math.pow(3.1,l),
  d:l=>`${X('남는 시설 비용',"Building cost left")} ${cutTxt(0.5,l)} → ${cutTxt(0.5,l+1)}`,
  apply:(m,l)=>m.costMul*=Math.pow(0.5,l)},
 {id:'v4', sp:'void_crown', nm:{ko:'공허의 관',en:"Crown of the Void"}, max:Infinity,c:l=>3*Math.pow(3.4,l),
  d:l=>`${X('보스 보상',"Boss rewards")} ×${powTxt(100,l)} → ×${powTxt(100,l+1)}`, apply:(m,l)=>m.boss*=Math.pow(100,l)},
 {id:'v5', sp:'void_chain', nm:{ko:'끊긴 사슬',en:"Severed Chain"}, max:Infinity,c:l=>3*Math.pow(3.3,l),
  d:l=>`${X('도전 보상',"Trial rewards")} ×${powTxt(8,l)} → ×${powTxt(8,l+1)}`, apply:(m,l)=>m.chalPow*=Math.pow(8,l)},
 {id:'v6', sp:'void_star',  nm:{ko:'꺼진 별',en:"Dead Star"}, max:Infinity,c:l=>4*Math.pow(3.5,l),
  d:l=>`${X('영혼석 획득',"Soul Shards")} ×${powTxt(150,l)} → ×${powTxt(150,l+1)}`, apply:(m,l)=>m.soul*=Math.pow(150,l)},
 {id:'v7', sp:'void_gate',  nm:{ko:'없음의 문',en:"Door of Nothing"}, max:Infinity,c:l=>4*Math.pow(3.6,l),
  d:l=>`${X('게임 속도',"Game speed")} ×${powTxt(5,l)} → ×${powTxt(5,l+1)}`, apply:(m,l)=>m.speed*=Math.pow(5,l)},
 {id:'v8', sp:'void_tear',  nm:{ko:'공허의 눈물',en:"Tear of the Void"}, max:Infinity,c:l=>5*Math.pow(3.8,l),
  d:l=>`${X('룬 최대 레벨',"Rune level cap")} +${2000*l} → +${2000*(l+1)}`, apply:(m,l)=>m.runeCap+=2000*l},
];
export const ORIGIN_UPS=[
 {id:'o1', sp:'orig_seed',  nm:{ko:'근원의 씨',en:"Seed of Origin"}, max:Infinity,c:l=>1*Math.pow(3.5,l),
  d:l=>`${X('모든 생산·획득',"All output")} ×${powTxt(2000,l)} → ×${powTxt(2000,l+1)}`,
  apply:(m,l)=>{const v=Math.pow(2000,l);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
 {id:'o2', sp:'orig_flame', nm:{ko:'첫 불꽃',en:"First Flame"}, max:Infinity,c:l=>2*Math.pow(3.6,l),
  d:l=>`${X('마나 생산',"Mana output")} ×${powTxt(5000,l)} → ×${powTxt(5000,l+1)}`, apply:(m,l)=>m.prod*=Math.pow(5000,l)},
 {id:'o3', sp:'orig_tree',  nm:{ko:'세계수',en:"World Tree"}, max:Infinity,c:l=>2*Math.pow(3.7,l),
  d:l=>`${X('아래 두 단계 효율',"Bottom two tiers")} ×${powTxt(500,l)} → ×${powTxt(500,l+1)}`, apply:(m,l)=>m.t0*=Math.pow(500,l)},
 {id:'o4', sp:'orig_eye',   nm:{ko:'처음을 본 눈',en:"Eye That Saw First"}, max:Infinity,c:l=>3*Math.pow(3.8,l),
  d:l=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(1000,l)} → ×${powTxt(1000,l+1)}`, apply:(m,l)=>m.dungeon*=Math.pow(1000,l)},
 {id:'o5', sp:'orig_crown', nm:{ko:'근원의 왕관',en:"Crown of Origin"}, max:Infinity,c:l=>4*Math.pow(4,l),
  d:l=>`${X('게임 속도',"Game speed")} ×${powTxt(10,l)} → ×${powTxt(10,l+1)}`, apply:(m,l)=>m.speed*=Math.pow(10,l)},
 {id:'o6', sp:'orig_all',   nm:{ko:'모든 것의 시작',en:"Beginning of All"}, max:Infinity,c:l=>6*Math.pow(4.5,l),
  d:l=>`${X('환생 후 각 시설',"Free buildings after rebirth:")} ${fmt(1e5*l)} → ${fmt(1e5*(l+1))}${X('개 무료',' free')}`, apply:()=>{}},
];

/* 도전 · 승천 1회 후 해금. 제약을 걸고 목표 마나 달성 시 영구 보상 */
export const CHALLENGES=[
 {id:'c1',sp:'sealedbook',   nm:{ko:'침묵의 시련',en:"Trial of Silence"}, rule:{noResearch:1}, base:1e9,  max:100,
  desc:()=>X('연구를 사용할 수 없다',"Research cannot be used"),            rw:c=>`${X('마나 생산',"Mana output")} ×${powTxt(1.8,c)}`, apply:(m,c)=>m.prod*=Math.pow(1.8,c)},
 {id:'c2',sp:'emptypouch',   nm:{ko:'빈곤의 시련',en:"Trial of Poverty"}, rule:{maxTier:2},    base:1e8,  max:100,
  desc:()=>X('마탑 이상 시설을 지을 수 없다',"Towers and above cannot be built"),    rw:c=>`${X('시설 비용 증가율',"Cost growth")} ×${cutTxt(0.92,c)}`, apply:(m,c)=>m.costMul*=Math.pow(0.92,c)},
 {id:'c3',sp:'brokencog',    nm:{ko:'고독의 시련',en:"Trial of Solitude"}, rule:{noAuto:1},     base:1e10, max:100,
  desc:()=>X('모든 자동화가 멈춘다',"All automation halts"),             rw:c=>`${X('자동화 주기',"Automation interval")} -${(10*c)}%`, apply:(m,c)=>m.autoSpeed*=Math.pow(0.9,c)},
 {id:'c4',sp:'darkeye',  nm:{ko:'어둠의 시련',en:"Trial of Darkness"}, rule:{noDungeon:1},  base:1e12, max:100,
  desc:()=>X('던전에 들어갈 수 없다',"The dungeon is sealed"),            rw:c=>`${X('던전 공격력',"Dungeon power")} ×${powTxt(2.2,c)}`, apply:(m,c)=>m.dungeon*=Math.pow(2.2,c)},
 {id:'c5',sp:'crackedvial',   nm:{ko:'고갈의 시련',en:"Trial of Drought"}, rule:{drain:1e3},    base:1e7,  max:100,
  desc:()=>X('마나 생산이 1000분의 1로 줄어든다',"Mana output is cut to 1/1000"),rw:c=>`${X('오퍼링 획득',"Offerings")} ×${powTxt(2,c)}`, apply:(m,c)=>m.offer*=Math.pow(2,c)},
 {id:'c6',sp:'abysseye',  nm:{ko:'심연의 시련',en:"Trial of the Abyss"}, rule:{noResearch:1,noAuto:1,noDungeon:1,drain:10}, base:1e13, max:100,
  desc:()=>X('위의 시련이 한꺼번에 몰아친다',"All of the above at once"),    rw:c=>`${X('모든 생산·획득',"All output")} ×${powTxt(2,c)}`, apply:(m,c)=>{const v=Math.pow(2,c);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
];
CHALLENGES.push(
 {id:'c7',sp:'torpor',nm:{ko:'무기력의 시련',en:"Trial of Torpor"}, rule:{noAuto:1,drain:100}, base:1e11, max:100,
  desc:()=>X('자동화가 멈추고 마나 생산이 100분의 1이 된다',"No automation, and mana output cut to 1/100"),
  rw:c=>`${X('게임 속도',"Game speed")} +${(6*c)}%`, apply:(m,c)=>m.speed*=1+0.06*c},
 {id:'c8',sp:'narrow',nm:{ko:'좁은 길의 시련',en:"Trial of the Narrow Path"}, rule:{maxTier:1}, base:1e7, max:100,
  desc:()=>X('견습 마법사와 공방만 지을 수 있다',"Only the two lowest buildings can be built"),
  rw:c=>`${X('아래 두 단계 효율',"Bottom two tiers")} ×${powTxt(2.2,c)}`, apply:(m,c)=>m.t0*=Math.pow(2.2,c)},
 {id:'c9',sp:'weight',nm:{ko:'무게의 시련',en:"Trial of Weight"}, rule:{maxTier:3,noAuto:1}, base:1e9, max:100,
  desc:()=>X('아카데미 이상을 지을 수 없고 자동화도 멈춘다',"No Academy or above, and no automation"),
  rw:c=>`${X('상위 시설 효율',"Higher tiers")} ×${powTxt(2,c)}`, apply:(m,c)=>m.tUp*=Math.pow(2,c)},
 {id:'c10',sp:'blind',nm:{ko:'눈먼 시련',en:"Trial of the Blind"}, rule:{noDungeon:1,noResearch:1}, base:1e12, max:100,
  desc:()=>X('던전도 연구도 막힌다',"Neither the dungeon nor research"),
  rw:c=>`${X('던전 보상',"Dungeon rewards")} ×${powTxt(2.5,c)}`, apply:(m,c)=>m.floorLoot*=Math.pow(2.5,c)},
 {id:'c11',sp:'silentstar',nm:{ko:'침묵하는 별',en:"The Silent Star"}, rule:{noResearch:1,noRelicGear:1}, base:1e13, max:100,
  desc:()=>X('연구와 룬·장비가 모두 봉인된다',"Research, runes and gear all sealed"),
  rw:c=>`${X('결정·오퍼링 획득',"Crystals & Offerings")} ×${powTxt(2.2,c)}`,
  apply:(m,c)=>{const v=Math.pow(2.2,c);m.crystal*=v;m.offer*=v;}},
 {id:'c12',sp:'origintrial',nm:{ko:'근원의 시련',en:"Trial of the Origin"},
  rule:{noResearch:1,noAuto:1,noDungeon:1,noRelicGear:1,drain:1e4}, base:1e15, max:100,
  desc:()=>X('모든 것이 막히고 생산은 만분의 일이 된다',"Everything sealed, output cut to 1/10000"),
  rw:c=>`${X('모든 생산·획득',"All output")} ×${powTxt(3,c)}`,
  apply:(m,c)=>{const v=Math.pow(3,c);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
);

CHALLENGES.push(
 {id:'c13',sp:'dryspring',nm:{ko:'메마른 샘',en:"The Dry Spring"}, rule:{drain:1e6}, base:1e10, max:100,
  desc:()=>X('마나 생산이 백만분의 일이 된다',"Mana output cut to one millionth"),
  rw:c=>`${X('마나 생산',"Mana output")} ×${powTxt(2.6,c)}`, apply:(m,c)=>m.prod*=Math.pow(2.6,c)},
 {id:'c14',sp:'lone',nm:{ko:'홀로 선 자',en:"The Lone Apprentice"}, rule:{maxTier:0}, base:1e6, max:100,
  desc:()=>X('견습 마법사만 고용할 수 있다',"Only apprentices can be hired"),
  rw:c=>`${X('견습 마법사 효율',"Apprentice output")} ×${powTxt(2.6,c)}`, apply:(m,c)=>m.t0*=Math.pow(2.6,c)},
 {id:'c15',sp:'cogstop',nm:{ko:'멈춘 톱니',en:"Seized Gears"}, rule:{noAuto:1,noResearch:1}, base:1e11, max:100,
  desc:()=>X('자동화도 연구도 없다',"No automation, no research"),
  rw:c=>`${X('자동화 주기',"Automation interval")} ×${(Math.pow(0.88,c)).toFixed(3)}`, apply:(m,c)=>m.autoSpeed*=Math.pow(0.88,c)},
 {id:'c16',sp:'sealedvein',nm:{ko:'닫힌 광맥',en:"The Sealed Vein"}, rule:{noDungeon:1,drain:1e3}, base:1e9, max:100,
  desc:()=>X('던전이 막히고 생산이 천분의 일이 된다',"The dungeon is sealed and output cut to 1/1000"),
  rw:c=>`${X('결정 획득',"Crystals")} ×${powTxt(2.8,c)}`, apply:(m,c)=>m.crystal*=Math.pow(2.8,c)},
 {id:'c17',sp:'barehand',nm:{ko:'맨손의 시련',en:"Bare Hands"}, rule:{noRelicGear:1,noAuto:1}, base:1e10, max:100,
  desc:()=>X('룬·장비가 봉인되고 자동화도 멈춘다',"Runes and gear sealed, no automation"),
  rw:c=>`${X('장비 효과 지수',"Gear exponent")} ×${powTxt(1.5,c)}`, apply:(m,c)=>m.gearPow*=Math.pow(1.5,c)},
 {id:'c18',sp:'dryaltar',nm:{ko:'마른 제단',en:"The Dry Altar"}, rule:{maxTier:4,noDungeon:1}, base:1e12, max:100,
  desc:()=>X('별빛 첨탑을 지을 수 없고 던전도 막힌다',"No Starlight Spire, and the dungeon is sealed"),
  rw:c=>`${X('오퍼링 획득',"Offerings")} ×${powTxt(2.6,c)}`, apply:(m,c)=>m.offer*=Math.pow(2.6,c)},
 {id:'c19',sp:'withersoul',nm:{ko:'혼이 마르는 곳',en:"Where Souls Wither"}, rule:{noResearch:1,drain:1e8}, base:1e13, max:100,
  desc:()=>X('연구가 막히고 생산이 억분의 일이 된다',"No research, output cut to one hundred-millionth"),
  rw:c=>`${X('영혼석 획득',"Soul Shards")} ×${powTxt(2.8,c)}`, apply:(m,c)=>m.soul*=Math.pow(2.8,c)},
 {id:'c20',sp:'nothing',nm:{ko:'무의 시련',en:"Trial of Nothing"},
  rule:{noResearch:1,noAuto:1,noDungeon:1,noRelicGear:1,maxTier:1,drain:1e6}, base:1e16, max:100,
  desc:()=>X('아무것도 없이, 생산은 백만분의 일로',"Nothing at all, and output at one millionth"),
  rw:c=>`${X('모든 생산·획득',"All output")} ×${powTxt(4,c)}`,
  apply:(m,c)=>{const v=Math.pow(4,c);m.prod*=v;m.soul*=v;m.offer*=v;m.crystal*=v;m.dungeon*=v;}},
);

export const chalGoal=(ch,c)=>ch.base*Math.pow(120,c);

/* ── 끝이 없도록 ──────────────────────────────
   손으로 만든 항목이 바닥나면 게임이 끝난 느낌이 든다.
   그 뒤로는 같은 규칙으로 단계를 계속 찍어 낸다. */
/* 한 가지 효과만 240번 반복하면 그냥 숫자놀음이다.
   여덟 갈래를 돌려 가며 이름도 계층에 맞춰 바꾼다. */
export const RX_KINDS=[
 ['star',    '대이론',    "Grand Theory",   ()=>X('마나 생산 ×3',"Mana output ×3"),      m=>m.prod*=3],
 ['swordup', '전술 교본',  "Battle Doctrine",()=>X('던전 공격력 ×4',"Dungeon power ×4"),   m=>m.dungeon*=4],
 ['soul',    '영혼 해석',  "Soul Analysis",  ()=>X('영혼석 획득 ×2.5',"Soul Shards ×2.5"), m=>m.soul*=2.5],
 ['crystal', '결정 공학',  "Crystal Engineering",()=>X('결정 획득 ×2.5',"Crystals ×2.5"),  m=>m.crystal*=2.5],
 ['offering','봉헌 확장',  "Offering Rites", ()=>X('오퍼링 획득 ×2.5',"Offerings ×2.5"),   m=>m.offer*=2.5],
 ['hourglass','시간 압축', "Time Compression",()=>X('게임 속도 +8%',"Game speed +8%"),     m=>m.speed*=1.08],
 ['coinpurse','물류 최적화',"Logistics",     ()=>X('시설 비용 증가율 -3%',"Building cost growth -3%"), m=>m.costMul*=0.97],
 ['runering','룬 확장',    "Rune Expansion", ()=>X('룬 최대 레벨 +5',"Rune level cap +5"),  m=>m.runeCap+=5],
];
export const RX_ERA=[['지상','Terrestrial'],['항성','Stellar'],['은하','Galactic'],['초월','Transcendent'],['무한','Infinite']];
for(let k=0;k<240;k++){
  const kind=RX_KINDS[k%RX_KINDS.length];
  const era=RX_ERA[Math.min(RX_ERA.length-1,Math.floor(k/48))];
  const step=Math.floor(k/RX_KINDS.length)+1;
  RESEARCH.push({
    id:'qx'+k, sp:kind[0],
    nm:{ko:`${era[0]} ${kind[1]} ${step}`, en:`${era[1]} ${kind[2]} ${step}`},
    cost:5e19*Math.pow(12,k),
    d:kind[3], req: k===0 ? 'q20' : 'qx'+(k-1),
    apply:kind[4],
  });
}

/* 환생 마일스톤 · 환생 횟수만으로 열리는 영구 보너스 (승천 시 초기화) */
export const MILESTONES=[
 {n:5,   d:()=>X('마나 생산 ×2',"Mana output ×2"),        apply:m=>m.prod*=2},
 {n:10,  d:()=>X('던전 공격력 ×2',"Dungeon power ×2"),     apply:m=>m.dungeon*=2},
 {n:25,  d:()=>X('오퍼링 획득 ×2',"Offerings ×2"),         apply:m=>m.offer*=2},
 {n:50,  d:()=>X('마나 생산 ×5',"Mana output ×5"),         apply:m=>m.prod*=5},
 {n:100, d:()=>X('결정 획득 ×3',"Crystals ×3"),            apply:m=>m.crystal*=3},
 {n:200, d:()=>X('모든 생산·획득 ×2',"All output ×2"),     apply:m=>{m.prod*=2;m.soul*=2;m.offer*=2;m.crystal*=2;m.dungeon*=2}},
 {n:500, d:()=>X('마나 생산 ×25',"Mana output ×25"),       apply:m=>m.prod*=25},
];

/* ── 업적 이름과 배지 ──────────────────────────
   "초월 137회" 는 이름이 아니라 세는 소리다. 이백 개가 그렇게 붙어 있었고
   그림도 starcrown 한 장을 이백 개가 나눠 썼다. 이름은 형용사×명사로 짓고
   (몬스터를 기본형×속성으로 불린 것과 같은 방법이다), 배지는 테두리×색×문양
   576 종에서 하나씩 떼어 준다. 무엇을 요구하는지는 설명 줄이 그대로 말한다. */
export const ACH_NOUN=[['계약',"Pact"],['인장',"Sigil"],['서약',"Oath"],['왕관',"Crown"],
 ['문장',"Emblem"],['발자국',"Footfall"],['이정표',"Milestone"],['관문',"Gate"],
 ['궤적',"Arc"],['유산',"Legacy"],['표식',"Mark"],['서사',"Saga"]];
export const ACH_ADJ={
 mx:[['넘치는',"Overflowing"],['마르지 않는',"Unfailing"],['샘솟는',"Welling"],['깊은',"Deep"],
     ['광대한',"Vast"],['눈부신',"Radiant"],['끝없는',"Endless"],['범람하는',"Flooding"]],
 dx:[['내려가는',"Descending"],['가라앉은',"Sunken"],['어두워진',"Darkened"],['흔들리지 않는',"Steadfast"],
     ['심연의',"Abyssal"]],
 rx:[['되풀이되는',"Recurring"],['다시 도는',"Returning"],['낡지 않는',"Unworn"],['이어지는',"Continuing"],
     ['거듭난',"Reborn"],['순환하는',"Cycling"]],
 ax:[['오르는',"Rising"],['드높은',"Lofty"],['벼려진',"Tempered"],['성스러운',"Hallowed"],
     ['굽히지 않는',"Unbending"],['빛나는',"Gleaming"],['우뚝한',"Towering"],['승리한',"Triumphant"],
     ['정련된',"Refined"]],
 tx:[['넘어선',"Surpassing"],['별을 삼킨',"Star-eating"],['경계 밖의',"Outward"],['이름 없는',"Nameless"],
     ['처음의',"Primordial"],['마지막의',"Final"],['헤아릴 수 없는',"Unfathomed"],['접히지 않는',"Unfolding"],
     ['스스로 있는',"Self-existent"],['오래된',"Elder"],['남겨진',"Remaining"],['무너지지 않는',"Unbroken"],
     ['아득한',"Distant"],['저편의',"Beyond"],['태초의',"Primeval"],['완전한',"Whole"],['조용한',"Silent"]],
 ix:[['봉인된',"Sealed"],['열린',"Opened"],['되찾은',"Reclaimed"],['잠긴',"Locked"]],
};
export function achName(fam,i){
  const A=ACH_ADJ[fam], a=A[Math.floor(i/ACH_NOUN.length)%A.length], n=ACH_NOUN[i%ACH_NOUN.length];
  return {ko:`${a[0]} ${n[0]}`, en:`${a[1]} ${n[1]}`};
}
export const BADGE_FRAME=['disc','ring','shield','hex','gem','burst'];
export const BADGE_PAL=['gold','steel','wood','blue','lilac','moss','rust','void'];
export const BADGE_EMB=['dot','cross','chev','moon','flame','eye','spiral','bolt','tri','ring','bar','crown'];
export const BADGES=[];
for(const f of BADGE_FRAME) for(const c of BADGE_PAL) for(const e of BADGE_EMB) BADGES.push(`badge_${f}_${c}_${e}`);
export const ACHS=[
 {id:'h1', sp:'apprentice', nm:{ko:'첫 걸음',en:"First Step"},      d:()=>X('견습 마법사 고용',"Hire an Apprentice Mage"),      f:()=>S.bought[0]>=1},
 {id:'h2', sp:'coinpurse', nm:{ko:'소규모 길드',en:"Small Guild"},  d:()=>X('마나 1,000',"1,000 mana"),            f:()=>S.manaPeakL>=3},
 {id:'h3', sp:'treasure', nm:{ko:'마나 부자',en:"Mana Rich"},    d:()=>X('마나 1e6',"1e6 mana"),              f:()=>S.manaPeakL>=6},
 {id:'h4', sp:'vault', nm:{ko:'대부호',en:"Magnate"},       d:()=>X('마나 1e12',"1e12 mana"),             f:()=>S.manaPeakL>=12},
 {id:'h5', sp:'starcompass', nm:{ko:'천문학자',en:"Astronomer"},     d:()=>X('마나 1e20',"1e20 mana"),             f:()=>S.manaPeakL>=20},
 {id:'h6', sp:'inf_frame', nm:{ko:'무한의 문턱',en:"Brink of Infinity"},  d:()=>X('마나 1e40',"1e40 mana"),             f:()=>S.manaPeakL>=40},
 {id:'h7', sp:'workshop', nm:{ko:'공방장',en:"Workshop Master"},       d:()=>X('마법 공방 25개',"25 Arcane Workshops"),        f:()=>cnt(1)>=25},
 {id:'h8', sp:'tower', nm:{ko:'탑주',en:"Tower Lord"},         d:()=>X('마탑 25개',"25 Mage Towers"),             f:()=>cnt(2)>=25},
 {id:'h9', sp:'academy', nm:{ko:'학장',en:"Dean"},         d:()=>X('아카데미 25개',"25 Academies"),         f:()=>cnt(3)>=25},
 {id:'h10', sp:'council',nm:{ko:'대현자',en:"Archsage"},       d:()=>X('대현자 회의 10개',"10 Archsage Councils"),      f:()=>cnt(4)>=10},
 {id:'h11', sp:'soul',nm:{ko:'첫 환생',en:"First Rebirth"},      d:()=>X('환생 1회',"Rebirth once"),              f:()=>(S.rebirthEver||S.rebirths)>=1},
 {id:'h12', sp:'spiral',nm:{ko:'윤회',en:"Samsara"},         d:()=>X('환생 25회',"Rebirth 25 times"),             f:()=>(S.rebirthEver||S.rebirths)>=25},
 {id:'h13', sp:'eonring',nm:{ko:'영원한 순환',en:"Eternal Cycle"},  d:()=>X('환생 100회',"Rebirth 100 times"),            f:()=>(S.rebirthEver||S.rebirths)>=100},
 {id:'h14', sp:'reliquary',nm:{ko:'승천자',en:"Ascendant"},       d:()=>X('승천 1회',"Ascend once"),              f:()=>(S.ascendEver||S.ascensions)>=1},
 {id:'h15', sp:'starcrown',nm:{ko:'초월자',en:"Transcendent"},       d:()=>X('승천 10회',"Ascend 10 times"),             f:()=>(S.ascendEver||S.ascensions)>=10},
 {id:'h16', sp:'compass',nm:{ko:'탐험가',en:"Explorer"},       d:()=>X('던전 10층',"Dungeon floor 10"),             f:()=>(S.deepestEver||S.deepest)>=10},
 {id:'h17', sp:'skull',nm:{ko:'보스 사냥꾼',en:"Boss Hunter"},  d:()=>X('던전 30층',"Dungeon floor 30"),             f:()=>(S.deepestEver||S.deepest)>=30},
 {id:'h18', sp:'abysscrown',nm:{ko:'심연 정복자',en:"Abyss Conqueror"},  d:()=>X('던전 75층',"Dungeon floor 75"),             f:()=>(S.deepestEver||S.deepest)>=75},
 {id:'h19', sp:'runebook',nm:{ko:'룬 수집가',en:"Rune Collector"},    d:()=>X('룬 합계 레벨 25',"25 total rune levels"),       f:()=>runeTotal()>=25},
 {id:'h20', sp:'rune_forge',nm:{ko:'룬 대가',en:"Rune Master"},      d:()=>X('룬 합계 레벨 100',"100 total rune levels"),      f:()=>runeTotal()>=100},
 {id:'h21', sp:'helm',nm:{ko:'무장',en:"Armed"},         d:()=>X('장비 합계 레벨 15',"15 total gear levels"),     f:()=>gearTotal()>=15},
 {id:'h22', sp:'omniforge',nm:{ko:'전설의 장비',en:"Legendary Gear"},  d:()=>X('장비 합계 레벨 45',"45 total gear levels"),     f:()=>gearTotal()>=45},
 {id:'h23', sp:'book',nm:{ko:'학자',en:"Scholar"},         d:()=>X('연구 10개 완료',"Complete 10 researches"),        f:()=>Object.keys(S.research).length>=10},
 {id:'h24', sp:'library',nm:{ko:'전지',en:"Omniscient"},         d:()=>X('연구 20개 모두 완료',"Complete all 20 researches"),   f:()=>Object.keys(S.research).length>=20},
 {id:'h25', sp:'offering',nm:{ko:'봉헌자',en:"Devotee"},       d:()=>X('오퍼링 1,000 획득',"Earn 1,000 offerings"),     f:()=>S.offerEver>=1e3},
 {id:'h26', sp:'gem',nm:{ko:'보석상',en:"Jeweler"},       d:()=>X('결정 1,000 획득',"Earn 1,000 crystals"),       f:()=>S.crystalEver>=1e3},
 {id:'h27', sp:'chain',nm:{ko:'도전자',en:"Challenger"},       d:()=>X('도전 1회 완료',"Clear 1 trial stage"),         f:()=>chalTotal()>=1},
 {id:'h28', sp:'trialcrown',nm:{ko:'시련의 주인',en:"Master of Trials"},  d:()=>X('도전 15회 완료',"Clear 15 trial stages"),        f:()=>chalTotal()>=15},
 {id:'h29', sp:'relicheart',nm:{ko:'유물 사냥꾼',en:"Relic Hunter"},  d:()=>X('유물 50개 획득',"Earn 50 relics"),        f:()=>S.relicEver>=50},
 {id:'h30', sp:'throne',nm:{ko:'왕국의 지배자',en:"Ruler of the Kingdom"},d:()=>X('전체 배율 1e6 돌파',"Total multiplier past 1e6"),    f:()=>M().prod>=1e6},
];

export const _ac={mx:0,dx:0,rx:0,ax:0,tx:0,ix:0};
/* 업적도 바닥나지 않는다. 마나·최심층·환생·승천·초월 이정표를 이어 붙인다.
   업적 하나당 마나 생산 +2% 이므로 이 자체가 끝없는 사다리가 된다. */
for(let e=25;e<=300;e+=3){
  const v=Math.pow(10,e);
  ACHS.push({id:'mx'+e, nm:achName('mx',_ac.mx++),
    d:()=>X(`누적 마나 1e${e}`,`1e${e} total mana`), f:()=>S.manaPeakL>=e});
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
for(let i=0;i<INF_LAYERS.length;i++){
  for(const n of [1,5,25,100]){
    ACHS.push({id:'ix'+i+'_'+n, sp:INF_LAYERS[i].sp, nm:{ko:`${INF_LAYERS[i].ko}의 ${ACH_NOUN[_ac.ix%ACH_NOUN.length][0]}`,en:`${ACH_NOUN[_ac.ix%ACH_NOUN.length][1]} of ${INF_LAYERS[i].en}`}, _n:_ac.ix++,
      d:()=>X(`${INF_LAYERS[i].ko} 돌파 ${n}회`,`Break ${INF_LAYERS[i].en} ${n} times`),
      f:()=>(S[INF_LAYERS[i].k+'Count']||0)>=n});
  }
}
for(let n=1;n<=200;n+=1){
  ACHS.push({id:'tx'+n, nm:achName('tx',_ac.tx++),
    d:()=>X(`초월 ${n}회`,`Transcend ${n} times`), f:()=>(S.transEver||S.transcends)>=n});
}

/* 그림이 지정되지 않은 업적에 배지를 하나씩 떼어 준다. 앞에서부터 순서대로 주면
   문양이 매번, 색이 열두 개마다, 테두리가 아흔여섯 개마다 바뀐다. */
export let _bi=0;
for(const a of ACHS) if(!a.sp) a.sp=BADGES[_bi++%BADGES.length];
