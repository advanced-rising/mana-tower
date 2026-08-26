import { $ } from './ui/dom'
import { PRODUCERS } from './producers'
import { log } from './tick'

import { NM, X, icHTML } from './core'
import { S } from './state'
import { L10, cntLog, fmt, fmtLog, gainRes, geoSumLog, logAdd, numLog, safeLog } from './num'
import { M, addManaLog, manaRateLog, recalc } from './multipliers'

/* ══════════════ 던전 ══════════════ */
export const isBoss=f=>f%10===0;
/* 0.05 초는 초당 스무 층이다. 그 속도에서는 어떤 몬스터도 눈에 남지 않아
   내내 같은 것만 보인다. 한 마리가 보일 만큼 머물게 하고, 깊이가 느려지는 몫은
   아래 sweepCount 가 한 걸음에 여러 층을 쓸어 담아 메운다. */
export const FLOOR_MIN_TIME=0.28;  // 한 층이 화면에 머무는 최소 시간(초)
/* 프레스티지는 기록에서 이어 가므로 되밟을 일이 거의 없다. 다만 ◀ 로 손수
   내려간 자리는 이미 가져간 층이다 — 거기서는 싸우지도, 아무것도 나오지도 않는다. */
export const FLOOR_RETREAD=0.05;   // 이미 지나온 층을 다시 지나갈 때
export function floorPace(){ return isRetread(S.floor) ? FLOOR_RETREAD : FLOOR_MIN_TIME }
/* 이미 깬 층은 1 ~ 최심층이다. f < 최심층 으로 두면 최심층 그 자리만 '새 층' 이
   되어, ◀ 로 한 칸 내려갔다 올라오기를 되풀이하면 같은 층의 전리품을 얼마든지
   다시 가져갈 수 있었다. 최심층도 이미 깬 층이다. */
export function isRetread(f){ return f<=(S.deepest||0) }

/* ── 우주 계층 ────────────────────────────────
   실제 천문학의 구조를 그대로 따른다.
     항성계 → 성단 → 은하 → 은하군 → 은하단 → 초은하단 → 필라멘트 → 우주 거대구조
   층 번호를 오도미터로 읽을 뿐이라 기존 계산과 세이브를 건드리지 않는다.
   맨 윗 칸은 자릿수 제한이 없다 — 여기서 끝나지 않는다. */
export const COSMOS=[
 {k:'floor', sp:'tier_floor',   per:1,   ko:'층',        en:"Floor",       eg:''},
 {k:'planet', sp:'tier_planet',  per:100, ko:'행성',      en:"Planet",      eg:'지구'},
 {k:'system', sp:'tier_system',  per:8,   ko:'항성계',    en:"Star System", eg:'태양계'},
 {k:'cluster', sp:'tier_cluster', per:10,  ko:'성단',      en:"Star Cluster",eg:'플레이아데스'},
 {k:'galaxy', sp:'tier_galaxy',  per:10,  ko:'은하',      en:"Galaxy",      eg:'우리 은하'},
 {k:'group', sp:'tier_group',   per:10,  ko:'은하군',    en:"Galaxy Group",eg:'국부은하군'},
 {k:'gcluster', sp:'tier_gcluster',per:10,  ko:'은하단',    en:"Galaxy Cluster",eg:'처녀자리 은하단'},
 {k:'super', sp:'tier_super',   per:10,  ko:'초은하단',  en:"Supercluster",eg:'라니아케아'},
 {k:'filament', sp:'tier_filament',per:10,  ko:'우주 필라멘트',en:"Filament", eg:'슬론 장성'},
 {k:'web', sp:'tier_web',     per:10,  ko:'우주 거대구조',en:"Cosmic Web",eg:'우주 그물'},
 {k:'observ', sp:'tier_observ',  per:10,  ko:'관측 가능한 우주',en:"Observable Universe",eg:''},
 {k:'multi', sp:'tier_multi',   per:10,  ko:'다중우주',  en:"Multiverse",  eg:''},
];
/* 칸을 하나 넘길 때마다 전체 생산에 붙는 배율. 위로 갈수록 가파르다. */
export const COSMOS_SP=['sword','tower','offering','sparkle','spiral','star','crown16','gem','bolt','infinity','portal','soul'];
export const COSMOS_MUL=[1, 1.5, 4, 12, 40, 150, 600, 2500, 1.2e4, 6e4, 3e5, 2e6];

export function cosmos(f){
  const o={}; let div=1;
  for(let i=0;i<COSMOS.length;i++){
    if(i) div*=COSMOS[i].per;
    const cap = i+1<COSMOS.length ? COSMOS[i+1].per : Infinity;
    o[COSMOS[i].k] = Math.floor((f-1)/div) % cap + 1;
  }
  return o;
}
/* 지금 어느 장(章)에 있는가 — 1 보다 큰 가장 높은 칸 */
export function chapterOf(f){
  const c=cosmos(f);
  let top=0;
  for(let i=1;i<COSMOS.length;i++) if(c[COSMOS[i].k]>1) top=i;
  if(top===0 && f<=100) return 0;          // 지구
  return Math.max(1,top);
}
/* 가 본 곳 중 가장 높은 장 */
export const chapterSeen=()=>chapterOf(Math.max(1,S.deepest||1));
export function chapterName(i,reveal){
  if(!reveal&&i>chapterSeen()) return '???';       // 못 뚫은 계층은 무엇인지 알 수 없다
  if(i===0) return X('지구','Earth');
  return X(COSMOS[i].ko, COSMOS[i].en);
}
export function cosmosLabel(f){
  const c=cosmos(f), ch=chapterOf(f);
  if(ch===0) return X(`지구 · ${c.floor}층`, `Earth · F${c.floor}`);
  const p=[];
  for(let i=ch;i>=2;i--) p.push(X(`${COSMOS[i].ko} ${c[COSMOS[i].k]}`,`${COSMOS[i].en} ${c[COSMOS[i].k]}`));
  p.push(X(`행성 ${c.planet}`,`Planet ${c.planet}`));
  p.push(X(`${c.floor}층`,`F${c.floor}`));
  return p.join(' · ');
}
/* 예전에는 1e120 에서 잘랐다 — 평범한 수로 곱하면 1e308 에서 ∞ 가 되기 때문이다.
   배율이 전부 자릿수로 옮겨 갔으므로 자를 이유가 없다. 자릿수로 더해 돌려준다. */
export function cosmosBonusLog(f){
  const c=cosmos(f); let v=0;
  for(let i=1;i<COSMOS.length;i++) v+=(c[COSMOS[i].k]-1)*L10(COSMOS_MUL[i]);
  return v;
}
export function cosmosBonus(f){ const l=cosmosBonusLog(f); return l<300?Math.pow(10,l):Infinity; }

/* 층마다 다른 적이 나온다 */
/* 던전 몬스터 : 기본 6종 × 속성 6종 = 36종. 보스는 2종 × 6 = 12종.
   그림은 tools/foes.py 가 같은 실루엣에 팔레트와 파츠(불꽃·독액·얼음·
   그림자·바위·룬)를 갈아 끼워 굽는다. 여기에는 이름만 둔다. */
/* 접두 속성 · 이름과 그림뿐 아니라 체력과 보상도 바꾼다 */
export const FOE_AFFIX=[
 /* 속성마다 체력과 보상이 다르다. 돌은 단단하고 결정을 많이 주고,
    그림자는 무르지만 마나를 많이 준다. */
 ['fire',   '불타는',  "Burning",   {hp:1.15,loot:1.20,crystal:1.00,offer:1.00}],
 ['venom',  '맹독의',  "Venomous",  {hp:0.90,loot:1.00,crystal:1.30,offer:1.00}],
 ['frost',  '얼어붙은',"Frozen",    {hp:1.30,loot:1.00,crystal:1.00,offer:1.30}],
 ['shadow', '그림자',  "Shadow",    {hp:0.85,loot:1.35,crystal:1.00,offer:1.00}],
 ['stone',  '석화된',  "Petrified", {hp:1.60,loot:1.00,crystal:1.60,offer:1.00}],
 ['arcane', '비전의',  "Arcane",    {hp:1.10,loot:1.10,crystal:1.10,offer:1.40}],
 ['thunder','뇌전의',  "Thundering",{hp:1.00,loot:1.25,crystal:1.00,offer:1.15}],
 ['blood',  '피의',    "Bloody",    {hp:1.45,loot:1.15,crystal:1.20,offer:1.00}],
];
export const FOE_BASE=[
 ['ooze',    '점액 덩어리',"Ooze"],        ['bat',     '심연 박쥐',  "Abyss Bat"],
 ['beast',   '마수',       "Beast"],       ['wraith',  '망령',       "Wraith"],
 ['serpent', '독니 뱀',    "Fanged Serpent"],['golem',  '골렘',       "Golem"],
 ['spider',  '거미',       "Spider"],      ['imp',     '임프',       "Imp"],
 ['mushroom','균사체',     "Fungus"],      ['eyeball', '부유안',     "Floating Eye"],
 ['crab',    '갑각귀',     "Carapace"],    ['worm',    '굴벌레',     "Burrow Worm"],
 ['skeleton','해골 병사',  "Skeleton"],    ['zombie',  '시귀',       "Ghoul"],
 ['goblin',  '고블린',     "Goblin"],      ['rat',     '거대 쥐',    "Giant Rat"],
 ['harpy',   '하피',       "Harpy"],       ['treant',  '나무 정령',  "Treant"],
 ['gargoyle','가고일',     "Gargoyle"],    ['lich',    '리치',       "Lich"],
 ['wisp',    '도깨비불',   "Wisp"],        ['scorpion','전갈',       "Scorpion"],
 ['hound',   '쌍두견',     "Twin Hound"],  ['knight',  '망령 기사',  "Wraith Knight"],
];
export const BOSS_BASE=[
 ['skull',   '해골 군주',  "Bone Lord"],   ['demon',   '심연의 마왕',"Abyssal Demon"],
 ['dragon',  '심연룡',     "Abyssal Dragon"],['titan', '거신',       "Titan"],
 ['hydra',   '히드라',     "Hydra"],       ['behemoth','베히모스',   "Behemoth"],
 ['archlich','대리치',     "Archlich"],    ['wyrm',    '심연의 뱀룡',"Abyssal Wyrm"],
];
export const mkFoes = (bases, pre) => FOE_AFFIX.flatMap(([ak,ako,aen,af]) =>
  bases.map(([bk,bko,ben]) => ({sp:`${pre}_${bk}_${ak}`, af,
    nm:{ko:`${ako} ${bko}`, en:`${aen} ${ben}`}})));
export const COS_BASE=[
 ['probe',    '탐사정',    "Probe"],        ['asteroid', '소행성체',  "Asteroid"],
 ['nebula',   '성운체',    "Nebula Being"], ['stareater','항성 포식자',"Star Eater"],
 ['satellite','위성 병기',  "War Satellite"],['gravity',  '중력체',    "Gravity Well"],
 ['blackhole','블랙홀',    "Black Hole"],   ['guardian', '은하 수호자',"Guardian"],
 ['rift',     '차원 균열',  "Rift"],         ['dyson',    '항성 기계',  "Dyson Engine"],
 ['spore',    '성간 포자',  "Void Spore"],   ['sentinel', '감시자',    "Sentinel"],
];
export const CBOSS_BASE=[
 ['supernova','초신성',    "Supernova"],    ['quasar',  '퀘이사',     "Quasar"],
 ['gcore',    '은하핵',    "Galactic Core"],['watcher', '우주의 눈',  "The Watcher"],
];
export const FOES=mkFoes(FOE_BASE,'foe');
export const COSFOES=mkFoes(COS_BASE,'cos');
export const CBOSSES=mkFoes(CBOSS_BASE,'cboss');
export const DEEP_BASE=[
 ['swarm',    '성간 군체',  "Swarm"],       ['tendril',  '은하 촉수',  "Tendril"],
 ['legion',   '항성 군단',  "Star Legion"], ['darkmatter','암흑 물질체',"Dark Matter"],
 ['lens',     '중력 렌즈',  "Gravity Lens"],['breaker',  '은하 파괴자',"Breaker"],
 ['fracture', '시공 균열',  "Spacetime Fracture"],['primeval','원시 거인',"Primeval"],
 ['ascendant','초월체',     "Ascendant"],   ['wall',     '우주 장벽',  "Great Wall"],
 ['devourer', '차원 포식자',"Devourer"],    ['circuit',  '무한 회로',  "Infinite Circuit"],
];
export const DBOSS_BASE=[
 ['worldeater','세계를 먹는 것',"World Eater"], ['origin','근원의 것',"The Origin"],
];
export const FAR_BASE=[
 ['weaver',    '짜는 자',      "Weaver"],        ['knot',      '매듭',        "Knot"],
 ['strand',    '가닥',         "Strand"],        ['lattice',   '격자',        "Lattice"],
 ['spinner',   '그물 짜는 것',  "Spinner"],       ['greatvoid', '거대 공동',    "Great Void"],
 ['pulse',     '맥동',         "Pulse"],         ['shroud',    '장막',        "Shroud"],
 ['horizon',   '지평선',       "Horizon"],       ['cosmiclens','우주 렌즈',    "Cosmic Lens"],
 ['firstecho', '태초의 메아리', "First Echo"],    ['edgeofall', '관측의 끝',    "Edge of All"],
 ['mirroruni', '거울 우주',     "Mirror Cosmos"], ['branching', '갈라지는 것',  "Branching"],
 ['uniswarm',  '우주 떼',      "Cosmic Swarm"],  ['theend',    '종말',        "The End"],
];
export const FBOSS_BASE=[
 ['loomgod','짜는 신',"The Loom"], ['allmind','전체의 마음',"All-Mind"],
];

/* 장(章)마다 나오는 무리가 다르다. 위로 갈수록 형체가 커진다.
   속성이 아니라 생물 종류로 갈라야 계층마다 다르게 보인다. */
export const CH_POOL=[
 [FOE_BASE.slice(0,12),  'foe',  BOSS_BASE.slice(0,2),  'boss'],   // 0 지구
 [FOE_BASE.slice(12),    'foe',  BOSS_BASE.slice(2),    'boss'],   // 1 행성
 [COS_BASE.slice(0,4),   'cos',  CBOSS_BASE.slice(0,1), 'cboss'],  // 2 항성계
 [COS_BASE.slice(4,8),   'cos',  CBOSS_BASE.slice(1,2), 'cboss'],  // 3 성단
 [COS_BASE.slice(8),     'cos',  CBOSS_BASE.slice(2,3), 'cboss'],  // 4 은하
 [DEEP_BASE.slice(0,4),  'deep', CBOSS_BASE.slice(3),   'cboss'],  // 5 은하군
 [DEEP_BASE.slice(4,8),  'deep', DBOSS_BASE.slice(0,1), 'dboss'],  // 6 은하단
 [DEEP_BASE.slice(8),    'deep', DBOSS_BASE.slice(1),   'dboss'],  // 7 초은하단
 [FAR_BASE.slice(0,4),   'far',  FBOSS_BASE.slice(0,1), 'fboss'],  // 8 필라멘트
 [FAR_BASE.slice(4,8),   'far',  FBOSS_BASE.slice(1),   'fboss'],  // 9 우주 거대구조
 [FAR_BASE.slice(8,12),  'far',  FBOSS_BASE,            'fboss'],  // 10 관측 가능한 우주
 [FAR_BASE.slice(12),    'far',  FBOSS_BASE,            'fboss'],  // 11 다중우주
];
export const _poolCache={};
export function poolsFor(ch){
  ch=Math.max(0,Math.min(CH_POOL.length-1,ch));
  if(!_poolCache[ch]){
    const [fb,fp,bb,bp]=CH_POOL[ch];
    _poolCache[ch]=[mkFoes(fb,fp), mkFoes(bb,bp)];
  }
  return _poolCache[ch];
}
export const BOSSES=mkFoes(BOSS_BASE,'boss');
export const elemOf=f=>foeOf(f).af;
/* 계층마다 다른 무리가 나온다. 지구의 짐승 → 천체와 기계 → 은하 규모의 것들.
   고정 간격으로 명단을 훑으면 걸음 폭과 명단 길이가 맞물려 몇 종류만 돌고 만다 —
   힘이 세지면 한 걸음이 수천·수만 층이 되고 그 폭이 거의 일정해서, 96 층씩
   건너뛸 때는 스물네 걸음 동안 세 종류밖에 안 나왔다. 층 번호를 곱셈 해시로
   흩어 놓으면 어떤 폭으로 밟아도 고르게 나오고, 층마다의 결과는 그대로 정해져
   있어 체력·속성은 흔들리지 않는다. */
function foeHash(f){
  const lo=f%4294967296, hi=Math.floor(f/4294967296)%4294967296;
  let h=((lo^hi)>>>0)^0x9e3779b9;
  h=Math.imul(h^(h>>>15),0x85ebca6b)>>>0;
  h=Math.imul(h^(h>>>13),0xc2b2ae35)>>>0;
  return (h^(h>>>16))>>>0;
}
export function foeOf(f){
  const [foes,bosses]=poolsFor(chapterOf(f));
  return isBoss(f) ? bosses[foeHash(Math.floor(f/10))%bosses.length]
                   : foes[foeHash(f)%foes.length];
}
export function dungeonPowerLog(){
  let ul=-Infinity;for(let i=0;i<PRODUCERS.length;i++)ul=logAdd(ul,cntLog(i));
  return logAdd(0,0.45*ul)+M().dungeonLog+0.75*Math.max(0,manaRateLog());   // log10(1+u^0.45)
}
export function dungeonPower(){ const l=dungeonPowerLog(); return l<300?Math.pow(10,l):Infinity; }
export function floorHPLog(f){
  const a=Math.min(f-1,200), b=Math.max(0,f-1-200);
  return L10(40)+a*L10(1.35)+b*L10(1.09)+(isBoss(f)?L10(8):0)+safeLog(elemOf(f).hp);
}
export function floorHP(f){ const l=floorHPLog(f); return l<300?Math.pow(10,l):Infinity; }
/* ── 던전 보상은 체력보다 천천히 오른다 ────────────────
   층당 보상이 ×1.40 이고 체력이 ×1.09 였다. 힘이 P 자릿수면 닿는 층은
   P/0.0374 이고 그 층의 보상은 P×3.9 자릿수 — 던전 한 번이 힘의 네 배를
   돌려주고 그 마나가 다시 힘이 되니, 이것이 폭주의 지배항이었다.
   보상 기울기를 체력 아래(×1.08 → 힘 대비 0.89 배)로 내리면 고리가 수렴한다.
   깊이는 여전히 이득이지만, 스스로를 밀어 올리지는 못한다. */
export const LOOT_PER_FLOOR=1.08;
export function floorLootManaLog(f){
  const m=M(), bl=isBoss(f)?L10(10)+m.bossLog:0, e=elemOf(f);
  return L10(80)+(f-1)*L10(LOOT_PER_FLOOR)+m.prodLog+m.floorLootLog+bl+numLog(e.loot);
}
export function floorLoot(f){
  const m=M(), b=isBoss(f)?10*m.boss:1, e=elemOf(f);
  const ml=floorLootManaLog(f);
  /* 결정·오퍼링도 자릿수를 함께 들고 다닌다. 평범한 수만 두면 1e308 위에서
     화면에 ∞ 만 남는다 (보유량 자체를 로그로 옮기는 일은 아직 남아 있다). */
  const bl=isBoss(f)?L10(10)+m.bossLog:0;
  const cl=numLog(1+f*0.5)+m.crystalLog+m.floorLootLog+bl+numLog(e.crystal)-L10(8);
  const ol=isBoss(f)?numLog(f*0.8)+m.offerLog+bl+numLog(e.offer)-L10(6):-Infinity;
  return{
    manaLog:ml, mana:ml<300?Math.pow(10,ml):Infinity,
    crystalLog:cl, crystal:Math.max(1,Math.floor((1+f*0.5)*m.crystal*m.floorLoot*b*e.crystal/8)),
    offeringLog:ol, offering:isBoss(f)?Math.max(1,Math.floor(f*0.8*m.offer*b*e.offer/6)):0,
  };
}
export let curChapter=-1;
export function syncChapter(force){
  const ch=chapterOf(Math.max(1,S.deepest||1));
  if(ch===curChapter&&!force) return;
  const first=curChapter<0;
  curChapter=ch;
  document.documentElement.dataset.chapter=ch;
  if(first) return;
  const box=$('chapter'); if(!box) return;
  box.querySelector('.k').textContent=X(`제 ${ch+1} 장`,`CHAPTER ${ch+1}`);
  box.querySelector('.t').textContent=chapterName(ch,true);
  box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
  log(`${icHTML('star')}<b class="gold">${X(`제 ${ch+1} 장 · ${chapterName(ch,true)}`,`Chapter ${ch+1} · ${chapterName(ch,true)}`)}</b> ${X('에 들어섰다','reached')}`,true);
}

/* 던전은 한 번에 한 층만 오른다. 예전에는 힘이 닿는 데까지 쓸어 담았는데,
   그러면 깊이가 힘에 비례해 늘고 그 층의 보상이 다시 힘이 되어 폭주했다.
   시간에 묶어 두면 깊이가 초당 한 층씩만 자라 고리가 끊긴다. */
export function clearFloor(show){
  const f=S.floor,l=floorLoot(f);
  /* 되밟는 층에서는 아무것도 나오지 않는다 — 보물은 이미 가져갔다.
     여기서도 전리품을 주면 최심층까지 열두 초 만에 던전 수입이 통째로 돌아와,
     회차를 지운 보람이 없어진다. 기록이 주는 것은 '빨리 돌아간다' 는 것뿐이다. */
  const back=isRetread(f);
  if(!back){
    addManaLog(l.manaLog);
    gainRes('crystal',l.crystalLog);
    if(l.offeringLog>-Infinity) gainRes('offering',l.offeringLog);
  }
  const nw=f>S.deepest;
  if(nw){ S.deepest=f; if(f>(S.deepestEver||0)) S.deepestEver=f; syncChapter(); }
  const foe=foeOf(f);
  if(show!==0)
    log(`${icHTML(foe.sp)}${isBoss(f)?`<b class="bad">${X('보스','BOSS')}</b> `:''}<b>${NM(foe.nm)}</b> ${back?X('지나감','passed'):X('격파','defeated')}${show>1?` <span class="dim">${X(`외 ${show-1}층`,`and ${show-1} more`)}</span>`:''} <span class="dim">${cosmosLabel(f)}</span>${back?` <span class="dim">${X('되밟는 길','retreading')}</span>`:` · ${icHTML('mana')}${fmtLog(l.manaLog)} ${icHTML('crystal')}${fmtLog(l.crystalLog)}${l.offering?' '+icHTML('offering')+fmtLog(l.offeringLog):''}`}`, isBoss(f)&&!back);
  S.floor=f+1;
  /* 쓸어 담는 중간에는 배율을 다시 재지 않는다. computeM 은 강화 백여든 개를
     하나씩 따로 재므로 256 층을 쓸면 256 번 도는 셈이 된다. 마지막에 한 번만. */
  if(show!==0) recalc();
}
