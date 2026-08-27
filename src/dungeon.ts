import { setChapterMusic, sfx } from './audio'
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
/* 이미 깬 층은 1 ~ 최심층이다. f < 최심층 으로 두면 최심층 그 자리만 '새 층' 이
   되어, ◀ 로 한 칸 내려갔다 올라오기를 되풀이하면 같은 층의 전리품을 얼마든지
   다시 가져갈 수 있었다. 최심층도 이미 깬 층이다.
   되밟는 길에서는 싸우지도 않고 아무것도 나오지 않는다. */
export function isRetread(f){ return f<=(S.deepest||0) }
export function floorPace(){ return isRetread(S.floor) ? 0 : FLOOR_MIN_TIME }
/* 되밟기는 기록이 얼마나 깊든 이만큼 걸린다. 한 틱에 한 층씩만 지나가면
   5,000 층이 몇 분, 50 만 층이면 몇 시간이다 — 그건 등반이 아니라 대기다.
   한 틱에 지나갈 층수를 기록에서 거꾸로 정해 걸리는 시간을 일정하게 둔다.
   층수는 여전히 눈에 보이게 올라가고, 전리품이 없으므로 아무것도 불어나지 않는다. */
export const SOUL_FLOOR=100;      // 이 층부터 영혼석이 나온다
export const RETREAD_SECONDS=10;   // 최심층까지 되밟는 데 걸리는 시간
export const RETREAD_MAX_STEP=4096;
export function retreadSteps(dt){
  const rec=S.deepest||0;
  if(!(rec>0)) return 1;
  return Math.max(1,Math.min(RETREAD_MAX_STEP,Math.ceil(rec*(dt/RETREAD_SECONDS))));
}

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
/* 장이 시작하는 층. per 를 곱해 나가면 그 장의 첫 층이 나온다.
   (0 장은 1 층, 1 장은 100 층, 2 장은 800 층 …) */
export function chapterStart(i){
  let f=1;
  for(let k=1;k<=i&&k<COSMOS.length;k++) f*=COSMOS[k].per;
  return f;
}
/* 그 장을 얼마나 지났는가 — 0(막 들어섬) ~ 1(다음 장 문턱) */
export function chapterProgress(f){
  const i=chapterOf(f), a=chapterStart(i), b=chapterStart(i+1);
  if(!(b>a)) return 1;
  return Math.max(0,Math.min(1,(f-a)/(b-a)));
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
 ['gilded', '황금빛',  "Gilded",    {hp:1.25,loot:1.45,crystal:1.15,offer:1.00}],
 ['crystal','수정의',  "Crystalline",{hp:1.35,loot:1.00,crystal:1.55,offer:1.10}],
 ['plague', '역병의',  "Plagued",   {hp:0.80,loot:1.10,crystal:1.00,offer:1.55}],
 ['void',   '공허의',  "Void-Touched",{hp:1.70,loot:1.30,crystal:1.30,offer:1.30}],
 ['water',  '물의',    "Drowned",   {hp:0.95,loot:1.05,crystal:1.10,offer:1.25}],
 ['lava',   '용암의',  "Molten",    {hp:1.50,loot:1.40,crystal:1.05,offer:1.00}],
 ['earth',  '대지의',  "Earthen",   {hp:1.75,loot:1.00,crystal:1.45,offer:1.00}],
 ['wind',   '바람의',  "Gale",      {hp:0.75,loot:1.20,crystal:1.00,offer:1.20}],
 ['light',  '빛의',    "Radiant",   {hp:1.20,loot:1.30,crystal:1.00,offer:1.35}],
 ['sand',   '모래의',  "Sandworn",  {hp:1.05,loot:1.00,crystal:1.35,offer:1.05}],
];
export const FOE_BASE=[
 ['slug',    '거대 민달팽이',"Great Slug"], ['mantis', '낫사마귀',   "Mantis"],
 ['boar',    '멧돼지 마수', "Tusked Boar"], ['raven',  '흉조',       "Ill Raven"],
 ['centipede','지네',       "Centipede"],   ['troll',  '트롤',       "Troll"],
 ['banshee', '밴시',        "Banshee"],     ['hornet', '거대 말벌',  "Giant Hornet"],
 ['basilisk','바실리스크',  "Basilisk"],    ['mimic',  '미믹',       "Mimic"],
 ['ghoul',   '구울',        "Ghoul"],       ['warden', '옥지기',     "Warden"],
 ['toad',    '늪 두꺼비',  "Mire Toad"],   ['crow',    '큰까마귀',   "Great Crow"],
 ['urchin',  '가시덩이',   "Spineball"],   ['leech',   '흡혈 거머리',"Blood Leech"],
 ['stalker', '긴다리 추적자',"Stalker"],   ['maggot',  '시체벌레',   "Carrion Grub"],
 ['warlock', '흑마법사',   "Warlock"],     ['chimera', '쌍두 키메라',"Chimera"],
 ['moth',    '심연 나방',  "Abyss Moth"],  ['anchorite','사슬 고행자',"Anchorite"],
 ['coral',   '산호귀',     "Coral Fiend"], ['sentry',  '파수 골렘',  "Sentry Golem"],
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
 ['colossus','거상',       "Colossus"],    ['leviathan','레비아탄',  "Leviathan"],
 ['skull',   '해골 군주',  "Bone Lord"],   ['demon',   '심연의 마왕',"Abyssal Demon"],
 ['dragon',  '심연룡',     "Abyssal Dragon"],['titan', '거신',       "Titan"],
 ['hydra',   '히드라',     "Hydra"],       ['behemoth','베히모스',   "Behemoth"],
 ['archlich','대리치',     "Archlich"],    ['wyrm',    '심연의 뱀룡',"Abyssal Wyrm"],
];
export const mkFoes = (bases, pre) => FOE_AFFIX.flatMap(([ak,ako,aen,af]) =>
  bases.map(([bk,bko,ben]) => ({sp:`${pre}_${bk}_${ak}`, af,
    nm:{ko:`${ako} ${bko}`, en:`${aen} ${ben}`}})));
export const COS_BASE=[
 ['pulsar',  '펄서',        "Pulsar"],      ['comet',  '혜성체',     "Comet"],
 ['ringworld','고리 세계',  "Ringworld"],   ['magnetar','마그네타',  "Magnetar"],
 ['pulsarite','맥동체',    "Pulsarite"],   ['voidnet',  '공허 그물',  "Void Net"],
 ['starcoil', '항성 코일',  "Star Coil"],   ['gravelord','중력군주',   "Gravelord"],
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
 ['maw',     '아가리',      "The Maw"],     ['helix',  '나선체',     "Helix"],
 ['eidolon', '에이돌론',    "Eidolon"],     ['cinder', '잿불',       "Cinder"],
 ['unmaker', '해체자',     "Unmaker"],     ['echoform','메아리체',   "Echoform"],
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
 ['braid',   '땋인 실',     "The Braid"],   ['veil',   '장막',       "The Veil"],
 ['causal',  '인과체',      "Causal"],      ['firstlight','첫 빛',   "First Light"],
 ['firstword','첫 말씀',   "First Word"],  ['endlessone','끝없는 것',"The Endless"],
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
/* 장(章)마다 나오는 무리가 다르다. 위로 갈수록 형체가 커진다.
   형태를 더할 때마다 슬라이스 번호를 손보면 반드시 한쪽이 치우친다 —
   표 길이의 몇 분의 몇으로 잘라, 몇 종이 되든 고르게 나뉘게 한다. */
const part_=(arr,i,n)=>{
  const a=Math.floor(arr.length*i/n), b=i===n-1?arr.length:Math.floor(arr.length*(i+1)/n);
  return arr.slice(a,Math.max(a+1,b));
};
export const CH_POOL=[
 [part_(FOE_BASE,0,2), 'foe',  part_(BOSS_BASE,0,2), 'boss'],   // 0 지구
 [part_(FOE_BASE,1,2), 'foe',  part_(BOSS_BASE,1,2), 'boss'],   // 1 행성
 [part_(COS_BASE,0,3), 'cos',  part_(CBOSS_BASE,0,4),'cboss'],  // 2 항성계
 [part_(COS_BASE,1,3), 'cos',  part_(CBOSS_BASE,1,4),'cboss'],  // 3 성단
 [part_(COS_BASE,2,3), 'cos',  part_(CBOSS_BASE,2,4),'cboss'],  // 4 은하
 [part_(DEEP_BASE,0,3),'deep', part_(CBOSS_BASE,3,4),'cboss'],  // 5 은하군
 [part_(DEEP_BASE,1,3),'deep', part_(DBOSS_BASE,0,2),'dboss'],  // 6 은하단
 [part_(DEEP_BASE,2,3),'deep', part_(DBOSS_BASE,1,2),'dboss'],  // 7 초은하단
 [part_(FAR_BASE,0,4), 'far',  part_(FBOSS_BASE,0,2),'fboss'],  // 8 필라멘트
 [part_(FAR_BASE,1,4), 'far',  part_(FBOSS_BASE,1,2),'fboss'],  // 9 우주 거대구조
 [part_(FAR_BASE,2,4), 'far',  FBOSS_BASE,           'fboss'],  // 10 관측 가능한 우주
 [part_(FAR_BASE,3,4), 'far',  FBOSS_BASE,           'fboss'],  // 11 다중우주
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
/* ── 층마다 무엇이 나오는가 ──────────────────────
   예전에는 마나만 층수에 지수로 자라고 결정은 선형, 오퍼링은 보스에서만 나왔다.
   그러니 깊이 내려가도 결국 마나만 불어나고 나머지는 뒤처졌다.
   셋 다 같은 기울기로 자라게 하되, 층마다 '광맥' 이 달라 무엇이 두터운지 갈린다. */
export const VEINS=[
 {k:'mana',   ko:'마나맥',  en:"Mana Vein",    mana: 0.55, crystal:-0.35, offer:-0.35},
 {k:'crystal',ko:'결정맥',  en:"Crystal Vein", mana:-0.35, crystal: 0.55, offer:-0.20},
 {k:'offer',  ko:'봉헌맥',  en:"Votive Vein",  mana:-0.35, crystal:-0.20, offer: 0.55},
 {k:'rich',   ko:'풍요로운 층',en:"Rich Floor", mana: 0.20, crystal: 0.20, offer: 0.20},
 {k:'even',   ko:'고른 층', en:"Even Floor",   mana: 0,    crystal: 0,    offer: 0},
];
export function veinOf(f){
  /* foeHash 와 다른 씨앗을 써야 같은 적이 늘 같은 광맥을 물고 나오지 않는다 */
  const h=((f*2654435761)^(f>>>7))>>>0;
  return VEINS[h%VEINS.length];
}
export function floorLootManaLog(f){
  const m=M(), bl=isBoss(f)?L10(10)+m.bossLog:0, e=elemOf(f), v=veinOf(f);
  return L10(80)+(f-1)*L10(LOOT_PER_FLOOR)+m.prodLog+m.floorLootLog+bl+numLog(e.loot)+v.mana;
}
export function floorLoot(f){
  const m=M(), b=isBoss(f)?10*m.boss:1, e=elemOf(f), v=veinOf(f);
  const ml=floorLootManaLog(f);
  const bl=isBoss(f)?L10(10)+m.bossLog:0;
  const grow=(f-1)*L10(LOOT_PER_FLOOR);
  /* 결정과 오퍼링도 마나와 같은 기울기로 자란다 — 시작점만 낮게 둔다.
     오퍼링은 보스에서만 나던 것을 모든 층으로 넓히고, 보스는 그 위에 얹는다. */
  const cl=L10(6)+grow+m.crystalLog+m.floorLootLog+bl+numLog(e.crystal)+v.crystal;
  const ol=L10(2)+grow+m.offerLog+m.floorLootLog+bl+numLog(e.offer)+v.offer;
  /* 깊은 곳에서는 영혼석도 나온다. 여태 영혼석은 오직 환생에서만 나왔고,
     던전은 아무리 내려가도 그쪽 경제에 한 방울도 보태지 못했다.
     100 층부터, 보스에서 더 두텁게. */
  const sl=f>=SOUL_FLOOR
    ? L10(0.5)+(f-SOUL_FLOOR)*L10(LOOT_PER_FLOOR)+m.soulLog+m.floorLootLog+bl
    : -Infinity;
  const num=l=>l<300?Math.pow(10,l):Infinity;
  return{
    manaLog:ml, mana:num(ml),
    crystalLog:cl, crystal:num(cl),
    offeringLog:ol, offering:num(ol),
    soulLog:sl, soul:num(sl),
    vein:v,
  };
}
export let curChapter=-1;
export function syncChapter(force){
  const ch=chapterOf(Math.max(1,S.deepest||1));
  if(ch===curChapter&&!force) return;
  const first=curChapter<0;
  curChapter=ch;
  document.documentElement.dataset.chapter=ch;
  setChapterMusic(ch);                 // 장이 오르면 곡도 바뀐다
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
  const f=S.floor;
  /* 보상은 회차마다 층당 한 번이다.
     던전이 1 층으로 초기화되므로 그 층들의 보상도 다시 받는 것이 맞다 — 그것이
     새 회차를 굴리는 밑천이다. 다만 ◀ 로 내려갔다 올라오기를 되풀이해 같은 층을
     계속 캐내면 안 되므로, 이번 회차에 이미 받은 데까지는 다시 주지 않는다.
     기록보다 깊이 갈 수 없고 기록은 최전선에서 실제 시간에 묶여 있으니,
     한 회차가 받는 총량은 그 시간만큼으로 저절로 묶인다. */
  const paid=(S.lootFloor||0);
  const l=(f>paid)?floorLoot(f):null;
  if(f>paid) S.lootFloor=f;
  const back=!l;                     // 이번 회차에 이미 받은 층
  if(l){
    addManaLog(l.manaLog);
    gainRes('crystal',l.crystalLog);
    if(l.offeringLog>-Infinity) gainRes('offering',l.offeringLog);
    if(l.soulLog>-Infinity){ gainRes('soul',l.soulLog); S.soulAscL=logAdd(S.soulAscL,l.soulLog); }
  }
  if(show!==0) sfx(isBoss(f)?'boss':'floor');    // 되밟는 중에는 조용히 지나간다
  const nw=f>S.deepest;
  if(nw){ S.deepest=f; if(f>(S.deepestEver||0)) S.deepestEver=f; syncChapter(); }
  const foe=foeOf(f);
  if(show!==0)
    log(`${icHTML(foe.sp)}${isBoss(f)?`<b class="bad">${X('보스','BOSS')}</b> `:''}<b>${NM(foe.nm)}</b> ${back?X('지나감','passed'):X('격파','defeated')}${show>1?` <span class="dim">${X(`외 ${show-1}층`,`and ${show-1} more`)}</span>`:''} <span class="dim">${cosmosLabel(f)}</span>${back?` <span class="dim">${X('이미 받은 층','already collected')}</span>`:` · ${icHTML('mana')}${fmtLog(l.manaLog)} ${icHTML('crystal')}${fmtLog(l.crystalLog)}${l.offering?' '+icHTML('offering')+fmtLog(l.offeringLog):''}`}`, isBoss(f)&&!back);
  S.floor=f+1;
  /* 쓸어 담는 중간에는 배율을 다시 재지 않는다. computeM 은 강화 백여든 개를
     하나씩 따로 재므로 256 층을 쓸면 256 번 도는 셈이 된다. 마지막에 한 번만. */
  if(show!==0) recalc();
}
