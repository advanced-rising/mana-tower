import { INF_LAYERS } from '../layers'
import { PRODUCERS } from '../producers'
import { TABS, tabKeyOf, updaters } from './tabs'
import { exportSave, hardReset, save } from '../save'
import { enterChallenge, exitChallenge } from '../trials'
import { DS, DSF, NM, VERSION, X, ic, icHTML, spriteURL } from '../core'
import { ACHS, CHALLENGES, GEAR, MILESTONES, RELIC_UPS, RESEARCH, RUNES, SOUL_UPS, STAR_UPS, bulkCost, buyAmtFor, chalGoal, gearCost, runeCost } from '../content'
import { LOG, S } from '../state'
import { achCount, bulkCostLog, chalTotal, cntLog, costLogAt, curChal, curL, fmt, fmtLog, fmtTime, gearTotal, logSub, numLog, pctTxt, powTxt, runeTotal, spendRes } from '../num'
import { M, buyProducer, costLogOf, effLevel, gather, gatherAmountLog, manaRateLog, maxAfford, recalc, tierLocked } from '../multipliers'
import { COSMOS, COSMOS_MUL, COSMOS_SP, FOES, chapterOf, chapterSeen, cosmos, dungeonPowerLog, floorHPLog, floorLoot, foeOf, isBoss } from '../dungeon'
import { ASCEND_REQ, REBIRTH_REQ, TRANS_REQ, doAscend, doInfBreak, doRebirth, doTranscend, infGain, infUnlocked, offerGain, offerGainLog, relicGain, relicGainLog, reqTxt, soulGain, soulGainLog, starGain, starGainLog } from '../prestige'
import { AUTO_DEF, AUTO_DEFS, allAuto, autoUnlocked, buyBulkLog } from '../automation'
import { $, btn, el, modal, toast } from './dom'
import { buyAmtRow, card, levelGrid, memo, toggleRow } from './widgets'
import { refresh } from './render'

/* ══════════════ 패널 ══════════════ */
export function buildTower(p){
  const c=card([X('마탑 운영',"Tower Management"),'tower'],X('윗 단계 시설이 아랫 단계를 스스로 지어 올린다. 마나를 직접 뽑아내는 것은 견습 마법사뿐이다.',"Each tier builds the tier below it on its own. Only Apprentice Mages draw mana directly."));
  const ctrl=el('div','row');
  ctrl.appendChild(el('span','dim',X('구매 수량','Buy amount')));
  [1,10,100,'max'].forEach(v=>{
    const b=btn('sm',v==='max'?X('최대','Max'):'×'+v,()=>{S.buyAmt=v});
    updaters.push(()=>b.className='btn sm '+(S.buyAmt===v?'on':''));
    ctrl.appendChild(b);
  });
  const gb=btn('gold','',()=>gather());
  gb.style.marginLeft='auto';
  ctrl.appendChild(gb);
  c.appendChild(ctrl);
  updaters.push(()=>{gb.innerHTML=`${icHTML('mana',16)} ${X('마나 채집','Gather Mana')} <span class="c">+${fmtLog(gatherAmountLog())}</span>`});
  p.appendChild(c);

  const list=el('div','card');
  PRODUCERS.forEach((pr,i)=>{
    const row=el('div','unit');
    const icb=el('div','ico'); icb.appendChild(ic(pr.sp,32)); row.appendChild(icb);
    const mid=el('div');
    mid.appendChild(el('div','nm',NM(pr.nm)));
    const dt=el('div','dt'), own=el('div','own');
    mid.append(dt,own); row.appendChild(mid);
    const b=btn('buy','',()=>buyProducer(i));
    row.appendChild(b);
    list.appendChild(row);
    updaters.push(()=>{
      const m=M(), lock=tierLocked(i);
      const n=S.buyAmt==='max'?Math.max(1,maxAfford(i)):S.buyAmt;
      const cl=costLogOf(i,n);
      const perL=i===0?manaRateLog():cntLog(i)+numLog(pr.rate)+m.tUpLog;
      dt.innerHTML=`${NM(pr.makes)} <b>+${fmtLog(perL)}</b> ${X('/초','/s')}`;
      own.textContent=X('보유 ','Own ')+fmtLog(cntLog(i))+X(' · 구매 ',' · bought ')+fmt(S.bought[i])+X(' · 생성 ',' · made ')+fmtLog(S.genL[i]);
      b.innerHTML=lock?`<span class="c">${X('시련으로 봉인됨','Sealed by trial')}</span>`:`×${fmt(n)} ${X('고용','Hire')}<span class="c">${icHTML('mana')} ${fmtLog(cl)}</span>`;
      const can=!lock&&S.manaL>=cl&&n>0;
      b.disabled=!can; b.classList.toggle('can',can); b.classList.toggle('gold',can);
      row.classList.toggle('can',can);
    });
  });
  p.appendChild(list);
}

export function buildResearch(p){
  const c=card([X('마법 연구',"Arcane Research"),'flask'],X('마나로 사들이는 일회성 강화. <b>환생하면 전부 사라진다.</b> 매 회차 다시 사들이게 된다.',"One-off upgrades bought with mana. <b>All of them vanish on rebirth</b>, so every run buys them again."));
  const g=el('div','grid');
  RESEARCH.forEach(r=>{
    const b=document.createElement('button');
    b.type='button'; b.className='up';
    b.innerHTML=`<span class="ic"></span><span class="bd"><span class="t"></span><span class="d"></span><span class="c"></span></span>`;
    b.querySelector('.ic').appendChild(ic(r.sp,32));
    const _t=memo(b.querySelector('.t')),_d=memo(b.querySelector('.d')),_c=memo(b.querySelector('.c'));
    const _goal=b.querySelector('.goal')&&memo(b.querySelector('.goal'));
    b.addEventListener('click',e=>{
      e.preventDefault();
      if(S.research[r.id]||!(S.manaL>=numLog(r.cost))) return;
      if(r.req&&!S.research[r.req]) return;
      const ch=curChal(); if(ch&&ch.rule.noResearch) return;
      S.manaL=logSub(S.manaL,numLog(r.cost)); S.research[r.id]=1; recalc(); refresh();
      toast(icHTML(r.sp)+' '+NM(r.nm)+X(' 완료',' done'));
    });
    g.appendChild(b);
    updaters.push(()=>{
      const done=!!S.research[r.id], lock=r.req&&!S.research[r.req];
      const ch=curChal(), banned=ch&&ch.rule.noResearch;
      const afford=!done&&!lock&&!banned&&S.manaL>=numLog(r.cost);
      _t.text=NM(r.nm);
      _d.text=DS(r);
      _c.html=done?`<span class="good">${X('연구 완료','Researched')}</span>`
        :banned?`<span class="bad">${X('시련으로 봉인됨','Sealed by trial')}</span>`
        :lock?`<span class="dim">${X('선행','Needs')}: ${NM(RESEARCH.find(x=>x.id===r.req).nm)}</span>`
        :`${icHTML('mana')} ${fmt(r.cost)}`;
      b.classList.toggle('done',done); b.classList.toggle('lock',!!lock||!!banned);
      b.classList.toggle('afford',afford); b.disabled=done||!!lock||!!banned;
    });
  });
  c.appendChild(g); p.appendChild(c);
}

export function buildDungeon(p){
  const c=card([X('심연의 던전',"The Abyssal Dungeon"),'sword'],X('원정대의 공격력은 보유한 시설 총합에서 나온다. 10층마다 <b class="bad">보스</b>가 기다리며, 층이 깊을수록 전체 마나 생산 배율이 영구히 오른다.<br>층수는 <b>어떤 프레스티지로도 초기화되지 않는다</b> — 환생하든 승천하든 서 있던 층에서 그대로 이어 간다.',"Your party power comes from every building you own. A <b class='bad'>boss</b> waits every 10th floor, and depth permanently raises your mana multiplier.<br>Your floor <b>never resets</b> — rebirth, ascension, anything: you carry on from where you stood."));
  const ar=el('div','arena');
  const foe=el('div','foe'); const foeIco=ic(FOES[0].sp,64); foe.appendChild(foeIco);
  const right=el('div');
  const ftitle=el('div'); ftitle.style.cssText='font-family:var(--serif);font-size:16px;margin-bottom:5px';
  const hp=el('div','hpbar','<i></i><span></span>');
  const stat=el('div','row'); stat.style.marginTop='7px';
  right.append(ftitle,hp,stat);
  ar.append(foe,right); c.appendChild(ar);

  const ctl=el('div','row'); ctl.style.marginTop='10px';
  const bDown=btn('sm',X('◀ 이전 층','◀ Prev'),()=>{if(S.floor>1){S.floor--;S.prog=0}});
  const bUp=btn('sm',X('다음 층 ▶','Next ▶'),()=>{if(S.floor<=S.deepest){S.floor++;S.prog=0}});
  const go=btn('','',()=>{S.exploring=!S.exploring;if(!S.exploring)S.prog=0});
  const auto=btn('sm','',()=>{S.auto.dungeon=S.auto.dungeon?0:1});
  ctl.append(bDown,bUp,go,auto); c.appendChild(ctl);
  p.appendChild(c);

  /* 탐사 계층표 — 못 뚫은 칸은 무엇인지 알 수 없다 */
  const tc=card([X('탐사 계층',"The Ladder"),'map'],X('층을 100개 뚫으면 행성 하나를 넘어선다. 그 위로도 계속 이어진다.',"A hundred floors make a planet. It keeps going above that."));
  const tg=el('div','grid');
  const tiers=COSMOS.map((lv,i)=>{
    if(i===0) return null;
    const row=el('div','up'); row.style.cursor='default';
    row.innerHTML='<span class="ic"></span><span class="bd"><span class="t"></span><span class="d"></span><span class="c"></span></span>';
    tg.appendChild(row);
    const icb=row.querySelector('.ic'); const img=ic('unknown',32); icb.appendChild(img);
    return {i,row,img,t:memo(row.querySelector('.t')),d:memo(row.querySelector('.d')),c:memo(row.querySelector('.c')),cls:''};
  }).filter(Boolean);
  tc.appendChild(tg); p.appendChild(tc);
  updaters.push(()=>{
    const seen=chapterSeen(), cur=cosmos(Math.max(1,S.deepest||1));
    tiers.forEach(t=>{
      const open=t.i<=seen, next=t.i===seen+1;
      const want=spriteURL(open?COSMOS_SP[t.i]:'unknown');   // 매 프레임 img 를 새로 만들 이유가 없다
      if(t.img.getAttribute('src')!==want) t.img.setAttribute('src',want);
      t.t.text = open ? X(COSMOS[t.i].ko,COSMOS[t.i].en) : '???';
      t.d.text = open
        ? (COSMOS[t.i].eg?X(`예: ${COSMOS[t.i].eg}`,COSMOS[t.i].eg):'')
        : (next?X('한 칸만 더 올라가면 열린다',"One rung above you"):X('아직 알 수 없다',"Unknown"));
      t.c.text = open
        ? X(`${COSMOS[t.i].ko} ${fmt(cur[COSMOS[t.i].k])} · 전체 ×${powTxt(COSMOS_MUL[t.i],cur[COSMOS[t.i].k]-1)}`,
            `${COSMOS[t.i].en} ${fmt(cur[COSMOS[t.i].k])} · ×${powTxt(COSMOS_MUL[t.i],cur[COSMOS[t.i].k]-1)}`)
        : '';
      const cls='up'+(open?(t.i===seen?' afford':' done'):' lock');
      if(t.cls!==cls){ t.cls=cls; t.row.className=cls; }
    });
  });

  const lc=card([X('탐험 기록',"Delve Log"),'scroll']);
  const lg=el('div','log'); lg.id='dlog';
  lg.innerHTML=LOG.map(l=>`<div class="${l.hl?'hl':''}">${l.html}</div>`).join('');
  lc.appendChild(lg); p.appendChild(lc);

  updaters.push(()=>{
    const f=S.floor,hl=floorHPLog(f),pl=dungeonPowerLog(),l=floorLoot(f),boss=isBoss(f);
    foe.classList.toggle('boss',boss);
    const fo=foeOf(f), want=spriteURL(fo.sp);
    if(foeIco.src!==want) foeIco.src=want;
    const ach=String(chapterOf(Math.max(1,f)));      // 무대 배경도 계층을 따라간다
    if(ar.dataset.ch!==ach) ar.dataset.ch=ach;
    /* 층수가 열 자리를 넘으면 이름에 그대로 붙어 읽히지 않는다.
       줄을 갈라 놓고 숫자는 짧은 표기로 적는다. */
    ftitle.innerHTML=`<b class="gold">${NM(fo.nm)}</b>${boss?' <span class="tag bad" style="vertical-align:2px">'+X('보스','BOSS')+'</span>':''}`
      +`<div class="dim" style="font-size:12px;margin-top:2px">${X('층','Floor')} <b>${fmt(f)}</b> <span style="opacity:.5">·</span> ${X('최심층','Deepest')} <b>${fmt(S.deepest)}</b>`
      +`</div>`;
    const r=Math.max(0,Math.min(1,S.prog||0));
    const gap=pl-hl, per=gap>=8?1e8:(gap<=-300?0:Math.pow(10,gap));
    hp.querySelector('i').style.width=(r*100).toFixed(1)+'%';
    hp.querySelector('span').textContent=`${pctTxt(r*100)}%`;
    stat.innerHTML=`<span class="tag">${X('공격력','Power')} <b>${fmtLog(pl)}</b>${X('/초','/s')}</span>
      <span class="tag">${X('체력','HP')} <b>${fmtLog(hl)}</b></span>
      <span class="tag">${X('소요','ETA')} <b>${per>0?fmtTime((1-r)/per):'—'}</b></span>
      <span class="tag">${icHTML('mana')}<b>${fmtLog(l.manaLog)}</b></span>
      <span class="tag">${icHTML('crystal')}<b>${fmtLog(l.crystalLog)}</b></span>
      ${l.offering?`<span class="tag">${icHTML('offering')}<b>${fmtLog(l.offeringLog)}</b></span>`:''}`;
    bDown.disabled=S.floor<=1; bUp.disabled=S.floor>S.deepest;
    go.textContent=S.exploring?X('탐험 중단','Stop Delving'):X('탐험 시작','Start Delving');
    go.className='btn '+(S.exploring?'':'gold');
    const ud=AUTO_DEF('dungeon').unlock();
    auto.disabled=!ud;
    auto.className='btn sm '+(!ud?'off':(S.auto.dungeon?'on':'off'));
    auto.textContent=!ud?X('연속 탐험 잠김 (20층 돌파)','Auto-delve locked (floor 20)'):(S.auto.dungeon?X('연속 탐험 ON','Auto-delve ON'):X('연속 탐험 OFF','Auto-delve OFF'));
  });
}

/* 장비는 던전에서 캐낸 결정으로 벼린다 — 재료가 나오는 곳에 두는 편이 찾기 쉽다 */
export function buildGear(p){
  const c2=card([X('장비',"Gear"),'staff'],X('던전에서 캐낸 <b class="crystal">결정</b>으로 벼려낸다. 승천해도 사라지지 않는 영구 강화.',"Forged from <b class='crystal'>crystals</b> mined in the dungeon. Kept forever, even through ascension."));
  const info2=el('div','row'); info2.style.marginBottom='9px'; c2.appendChild(info2);
  c2.appendChild(buyAmtRow());
  const g2=el('div','grid wide');
  GEAR.forEach(gr=>{
    const b=document.createElement('button'); b.type='button'; b.className='up';
    b.innerHTML=`<span class="ic"></span><span class="bd"><span class="t"></span><span class="d"></span><span class="c"></span></span>`;
    b.querySelector('.ic').appendChild(ic(gr.sp,32));
    const _t=memo(b.querySelector('.t')),_d=memo(b.querySelector('.d')),_c=memo(b.querySelector('.c'));
    const _goal=b.querySelector('.goal')&&memo(b.querySelector('.goal'));
    b.addEventListener('click',e=>{
      e.preventDefault();
      const l=S.gear[gr.id]||0, cap=Math.floor(M().gearCap);
      if(l>=cap) return;
      const want=Math.min(cap-l,(S.buyAmt==='max')?Infinity:S.buyAmt);
      const {n,costLog}=buyBulkLog(gearCost,l,curL('crystal'),want);
      if(!(n>0)) return;
      spendRes('crystal',costLog); S.gear[gr.id]=l+n; recalc(); refresh();
    });
    g2.appendChild(b);
    updaters.push(()=>{
      const l=S.gear[gr.id]||0, pw=M().gearExp;      // 지수는 자릿수만 실린 평범한 수다
      const cap=Math.floor(M().gearCap), maxed=l>=cap;
      const want=Math.min(cap-l,(S.buyAmt==='max')?Infinity:S.buyAmt);
      const bb=maxed?{n:0,costLog:Infinity}:buyBulkLog(gearCost,l,curL('crystal'),want);
      const n=Math.max(1,bb.n), costL=bb.n>0?bb.costLog:costLogAt(gearCost,l);
      _t.html=`${NM(gr.nm)} <span class="lv">Lv.${fmt(l)} / ${fmt(cap)}</span>`;
      _d.text=gr.d(effLevel(l),pw);
      _c.html=maxed?`<span class="good">${X('최대','Maxed')}</span>`
        :`${icHTML('crystal')} ${fmtLog(costL)}${n>1?` <span class="dim">×${fmt(n)}</span>`:''}`;
      b.classList.toggle('afford',!maxed&&curL('crystal')>=costL);
    });
  });
  c2.appendChild(g2); p.appendChild(c2);
  updaters.push(()=>{info2.innerHTML=`<span class="tag">${icHTML('crystal')} ${X('보유','Held')} <b>${fmtLog(curL('crystal'))}</b></span>
    <span class="tag">${X('합계 레벨',"Total level")} <b>${fmt(gearTotal())}</b></span>
    <span class="tag">${X('효과 지수',"Effect exponent")} <b>×${fmt(M().gearExp)}</b></span>`});

}

export function buildRelics(p){
  const c=card([X('룬 석판',"Rune Tablets"),'rune_wealth'],X('환생에서 얻는 <b class="offer">오퍼링</b>으로 새긴다. 승천하면 사라진다.',"Engraved with <b class='offer'>offerings</b> earned on rebirth. Lost on ascension."));
  const info=el('div','row'); info.style.marginBottom='9px'; c.appendChild(info);
  c.appendChild(buyAmtRow());
  const g=el('div','grid wide');
  RUNES.forEach(r=>{
    const b=document.createElement('button'); b.type='button'; b.className='up';
    b.innerHTML=`<span class="ic"></span><span class="bd"><span class="t"></span><span class="d"></span><span class="c"></span></span>`;
    b.querySelector('.ic').appendChild(ic(r.sp,32));
    const _t=memo(b.querySelector('.t')),_d=memo(b.querySelector('.d')),_c=memo(b.querySelector('.c'));
    const _goal=b.querySelector('.goal')&&memo(b.querySelector('.goal'));
    b.addEventListener('click',e=>{
      e.preventDefault();
      const l=S.runes[r.id]||0, cap=Math.floor(M().runeCap);
      if(l>=cap) return;
      const want=(S.buyAmt==='max')?Infinity:S.buyAmt;
      let n=buyBulkLog(runeCost,l,curL('offering'),want).n;
      n=Math.min(n,cap-l);
      if(n<=0) return;
      spendRes('offering',bulkCostLog(runeCost,l,n)); S.runes[r.id]=l+n; recalc(); refresh();
    });
    g.appendChild(b);
    updaters.push(()=>{
      const l=S.runes[r.id]||0, cap=Math.floor(M().runeCap), maxed=l>=cap;
      const want2=(S.buyAmt==='max')?Infinity:S.buyAmt;
      const n=Math.max(1,Math.min(buyBulkLog(runeCost,l,curL('offering'),want2).n,Math.max(0,cap-l)));
      const costL=bulkCostLog(runeCost,l,n);
      _t.html=`${NM(r.nm)} <span class="lv">Lv.${fmt(l)} / ${fmt(cap)}</span>`;
      _d.text=r.d(effLevel(l));
      _c.html=maxed?`<span class="good">${X('최대 레벨','Max level')}</span>`
        :`${icHTML('offering')} ${fmtLog(costL)}${n>1?` <span class="dim">×${fmt(n)}</span>`:''}`;
      b.classList.toggle('done',maxed); b.classList.toggle('afford',!maxed&&curL('offering')>=costL); b.disabled=maxed;
    });
  });
  c.appendChild(g); p.appendChild(c);
  updaters.push(()=>{info.innerHTML=`<span class="tag">${icHTML('offering')} ${X('보유','Held')} <b>${fmtLog(curL('offering'))}</b></span>
    <span class="tag">${X('합계 레벨',"Total level")} <b>${fmt(runeTotal())}</b></span>
    <span class="tag">${X('최대 레벨',"Level cap")} <b>${fmt(Math.floor(M().runeCap))}</b></span>`});

}

export function buildRebirth(p){
  const c=card([X('환생',"Rebirth"),'soul'],X(`마나·시설·연구를 모두 버리고 <b class="soul">영혼석</b>과 <b class="offer">오퍼링</b>을 얻는다. 영혼 강화는 승천 전까지 남는다.<br>필요 조건: 이번 회차 누적 마나 ${fmt(REBIRTH_REQ)}`,`Throw away mana, buildings and research for <b class="soul">soul shards</b> and <b class="offer">offerings</b>. Soul upgrades last until you ascend.<br>Requires ${fmt(REBIRTH_REQ)} total mana this run.`));
  const info=el('div','row'); info.style.margin='6px 0 10px'; c.appendChild(info);
  const b=btn('gold big','',()=>{
    if(soulGain()<=0) return;
    modal(X('환생하시겠습니까?','Rebirth?'),X(`영혼석 <b class="soul">${fmtLog(soulGainLog())}</b> · 오퍼링 <b class="offer">${fmtLog(offerGainLog())}</b>을 얻고<br>마나 · 시설 · 연구가 초기화됩니다.<br>던전 <b class="gold">${fmt(S.floor)}</b>층은 그대로 유지됩니다.`,`You gain <b class="soul">${fmtLog(soulGainLog())}</b> soul shards and <b class="offer">${fmtLog(offerGainLog())}</b> offerings.<br>Mana, buildings and research reset. You keep dungeon floor <b class="gold">${fmt(S.floor)}</b>.`),()=>doRebirth());
  });
  c.appendChild(b); p.appendChild(c);
  const uc=card([X('영혼 강화',"Soul Upgrades"),'gem'],X('환생해도 유지된다. 승천할 때만 초기화된다.',"Kept through rebirths. Only ascension resets them."));
  uc.appendChild(buyAmtRow()); uc.appendChild(levelGrid(SOUL_UPS,id=>S.soulUps[id]||0,'soul',(id,n)=>{S.soulUps[id]=(S.soulUps[id]||0)+(n||1)},'soul'));
  p.appendChild(uc);
  updaters.push(()=>{
    const g=soulGain();
    info.innerHTML=`<span class="tag">${X('회차 누적',"Run total")} ${icHTML('mana')}<b>${fmtLog(S.manaRunL)}</b></span>
      <span class="tag">${X('획득 예정',"You gain")} ${icHTML('soul')}<b class="soul">${fmtLog(soulGainLog())}</b></span>
      <span class="tag">${icHTML('offering')}<b class="offer">${fmtLog(offerGainLog())}</b></span>
      <span class="tag">${X('영혼석 배율',"Shard multiplier")} <b>×${fmtLog(M().soulLog)}</b></span>
      <span class="tag">${X(`환생 <b>${fmt(S.rebirths)}</b>회 · 생산 +${5*S.rebirths}%`,`<b>${fmt(S.rebirths)}</b> rebirths · output +${5*S.rebirths}%`)}</span>`;
    b.disabled=g<=0;
    b.innerHTML=icHTML('soul',24)+' '+(g>0?X(`환생하여 영혼석 ${fmtLog(soulGainLog())} 획득`,`Rebirth for ${fmtLog(soulGainLog())} soul shards`)
      :X(`누적 마나 ${fmt(REBIRTH_REQ)} 필요`,`Needs ${fmt(REBIRTH_REQ)} total mana`));
  });
}

export function buildMilestones(p){
  if(S.rebirths<1 && !S.ascensions) return;
  const c=card([X('환생 마일스톤',"Rebirth Milestones"),'milestone'],
    X('환생 횟수만으로 열리는 영구 보너스. 승천하면 다시 처음부터 쌓는다.',
      "Permanent bonuses that unlock from rebirth count alone. Ascension starts the count over."));
  const g=el('div','grid');
  MILESTONES.forEach(ms=>{
    const d=el('div','ach');
    d.appendChild(ic('milestone',32));
    const t=el('div');
    d.appendChild(t); g.appendChild(d);
    updaters.push(()=>{
      const got=S.rebirths>=ms.n;
      d.classList.toggle('got',got);
      t.innerHTML=`<div class="t">${X('환생 '+ms.n+'회','Rebirth ×'+ms.n)}</div><div class="d">${ms.d()}</div>`;
    });
  });
  c.appendChild(g); p.appendChild(c);
}
export function buildAscend(p){
  const c=card([X('승천',"Ascension"),'relic'],X(`영혼석·영혼 강화·룬을 전부 버리고 <b class="relic">유물</b>을 얻는다. 유물 강화는 <b>영원히</b> 남는다.<br>필요 조건: 이번 주기 누적 영혼석 ${fmt(ASCEND_REQ)}`,`Give up soul shards, soul upgrades and runes for <b class="relic">relics</b>. Relic upgrades last <b>forever</b>.<br>Requires ${fmt(ASCEND_REQ)} soul shards this cycle.`));
  const info=el('div','row'); info.style.margin='6px 0 10px'; c.appendChild(info);
  const b=btn('gold big','',()=>{
    if(relicGain()<=0) return;
    modal(X('승천하시겠습니까?','Ascend?'),X(`유물 <b class="relic">${fmtLog(relicGainLog())}</b>을 얻고<br>영혼석 · 영혼 강화 · 룬이 초기화됩니다. 던전 층수는 그대로입니다.`,`You gain <b class="relic">${fmtLog(relicGainLog())}</b> relics.<br>Soul shards, soul upgrades and runes reset. Your dungeon floor stays.`),()=>doAscend());
  });
  c.appendChild(b); p.appendChild(c);
  const uc=card([X('유물 강화',"Relic Upgrades"),'relic'],X('무엇을 해도 사라지지 않는 영구 강화.',"Permanent upgrades that nothing ever takes away."));
  uc.appendChild(buyAmtRow()); uc.appendChild(levelGrid(RELIC_UPS,id=>S.relicUps[id]||0,'relic',(id,n)=>{S.relicUps[id]=(S.relicUps[id]||0)+(n||1)},'relic'));
  p.appendChild(uc);
  updaters.push(()=>{
    const g=relicGain();
    info.innerHTML=`<span class="tag">${X('주기 누적',"Cycle total")} ${icHTML('soul')}<b>${fmtLog(S.soulAscL)}</b></span>
      <span class="tag">${X('획득 예정',"You gain")} ${icHTML('relic')}<b class="relic">${fmtLog(relicGainLog())}</b></span>
      <span class="tag">${X(`승천 <b>${fmt(S.ascensions)}</b>회`,`<b>${fmt(S.ascensions)}</b> ascensions`)}</span>`;
    b.disabled=g<=0;
    b.innerHTML=icHTML('relic',24)+' '+(g>0?X(`승천하여 유물 ${fmtLog(g>0?Math.log10(g):-Infinity)} 획득`,`Ascend for ${fmtLog(g>0?Math.log10(g):-Infinity)} relics`)
      :X(`누적 영혼석 ${fmt(ASCEND_REQ)} 필요`,`Needs ${fmt(ASCEND_REQ)} soul shards`));
  });
}

export function buildTrans(p){
  const c=card([X('초월',"Transcendence"),'star'],X(`유물·유물 강화·승천 횟수까지 전부 버리고 <b class="gold">별가루</b>를 얻는다. 별 강화는 <b>무엇을 해도</b> 사라지지 않는다.<br>필요 조건: 이번 주기 누적 유물 ${fmt(TRANS_REQ)}`,`Give up relics, relic upgrades and ascensions for <b class="gold">stardust</b>. Star upgrades survive <b>everything</b>.<br>Requires ${fmt(TRANS_REQ)} relics this cycle.`));
  const info=el('div','row'); info.style.margin='6px 0 10px'; c.appendChild(info);
  const b=btn('gold big','',()=>{
    if(starGain()<=0) return;
    modal(X('초월하시겠습니까?','Transcend?'),X(`별가루 <b class="gold">${fmtLog(starGainLog())}</b>를 얻고<br>유물 · 유물 강화 · 승천 · 영혼석 · 룬 · 장비가 초기화됩니다.`,`You gain <b class="gold">${fmtLog(starGainLog())}</b> stardust.<br>Relics, relic upgrades, ascensions, soul shards, runes and gear reset.`),()=>doTranscend());
  });
  c.appendChild(b); p.appendChild(c);
  const uc=card([X('별 강화',"Star Upgrades"),'sparkle'],X('가장 깊은 층의 강화. 초월해도 남는다.',"The deepest layer. Even transcending cannot take these away."));
  uc.appendChild(buyAmtRow()); uc.appendChild(levelGrid(STAR_UPS,id=>S.starUps[id]||0,'star',(id,n)=>{S.starUps[id]=(S.starUps[id]||0)+(n||1)},'star'));
  p.appendChild(uc);
  updaters.push(()=>{
    const g=starGain();
    info.innerHTML=`<span class="tag">${X('주기 누적',"Cycle total")} ${icHTML('relic')}<b class="relic">${fmtLog(S.relicTransL)}</b></span>
      <span class="tag">${X('획득 예정',"You gain")} ${icHTML('star')}<b class="gold">${fmtLog(starGainLog())}</b></span>
      <span class="tag">${X(`초월 <b>${fmt(S.transcends)}</b>회`,`<b>${fmt(S.transcends)}</b> transcends`)}</span>`;
    b.disabled=g<=0;
    b.innerHTML=icHTML('star',16)+' '+(g>0?X(`초월하여 별가루 ${fmtLog(g>0?Math.log10(g):-Infinity)} 획득`,`Transcend for ${fmtLog(g>0?Math.log10(g):-Infinity)} stardust`)
      :X(`누적 유물 ${fmt(TRANS_REQ)} 필요`,`Needs ${fmt(TRANS_REQ)} relics`));
  });
}

/* 계층 하나를 그린다. 다섯 칸을 한 탭에 쌓아 두면 화면이 길어져
   아래쪽은 스크롤해야 보였다 — 왼쪽 메뉴에서 칸마다 따로 연다. */
export function buildLayer(p,i){
  const L=INF_LAYERS[i];
  if(i===0) p.appendChild(card([X('넘침이라는 문',"The Overflow Door"),'inf_frame'],X(`수가 <b>${fmtLog(300)}</b> 을 넘길 지경이 되면 그 자체가 관문이 된다. 한 칸 위로 올라가고 아래가 접힌다. <b class="gold">별가루와 별 강화는 남는다.</b> 칸을 넘길 때마다 모든 생산에 큰 배율이 영구히 붙는다.`,`When a number is about to overflow past <b>${fmtLog(300)}</b>, that ceiling becomes a door. You rise one rung and everything below folds away — <b class="gold">stardust and star upgrades stay</b> — leaving a permanent multiplier.`)));
  const lc=card([X(L.ko,L.en),L.sp]);
  const info=el('div','row'); info.style.margin='4px 0 9px'; lc.appendChild(info);
  const b=btn('gold big','',()=>{
    if(infGain(i)<=0) return;
    modal(X(`${L.ko} 돌파`,`${L.en} Break`),
      X(`<b class="gold">${L.ko} +${fmt(infGain(i))}</b> 을 얻고<br>그 아래 계층이 초기화됩니다.<br><span class="gold">별가루와 별 강화는 남습니다.</span>`,
        `Gain <b class="gold">+${fmt(infGain(i))} ${L.en}</b>.<br>Everything below resets — stardust and star upgrades stay.`),
      ()=>doInfBreak(i));
  });
  lc.appendChild(b);
  if(L.ups){
    lc.appendChild(el('div','hint',X(`${L.ko}으로만 살 수 있다. 아래 계층을 통째로 갈아 넣고 얻는 것이라 효과가 크다.`,
                                     `Bought with ${L.en} alone. You fed whole layers into this, so it hits hard.`)));
    const eu=el('div'); eu.style.marginTop='8px';
    eu.appendChild(buyAmtRow());
    eu.appendChild(levelGrid(L.ups(),id=>(S[L.store]||{})[id]||0,L.k,
      (id,n)=>{(S[L.store]=S[L.store]||{})[id]=((S[L.store]||{})[id]||0)+(n||1)},L.sp));
    lc.appendChild(eu);
  }
  p.appendChild(lc);
  updaters.push(()=>{
    const g=infGain(i), v=L.from();
    info.innerHTML=`<span class="tag">${X('현재',"Now")} <b>${i===0?fmtLog(S.manaEverL):fmt(v)}</b></span>
      <span class="tag">${X('필요',"Needs")} <b>${reqTxt(i)}</b></span>
      <span class="tag">${X('보유',"Held")} <b class="gold">${fmt(S[L.k]||0)}</b></span>
      <span class="tag">${X('전체 배율',"Total")} ×<b>${powTxt(4+i*4,S[L.k+'Ever']||0)}</b></span>`;
    b.disabled=g<=0;
    b.innerHTML=icHTML(L.sp,16)+' '+(g>0?X(`${L.ko} 돌파 · +${fmtLog(g>0?Math.log10(g):-Infinity)}`,`${L.en} Break · +${fmtLog(g>0?Math.log10(g):-Infinity)}`)
      :X(`${reqTxt(i)} 필요`,`Needs ${reqTxt(i)}`));
  });
}
export function buildChal(p){
  const c=card([X('시련',"Trials"),'chain'],X('제약을 받아들이고 목표 마나에 도달하면 <b>영구 보상</b>을 얻는다. 시련에 들어가거나 나오면 회차가 초기화된다.',"Accept a handicap, reach the goal mana, keep a <b>permanent reward</b>. Entering or leaving a trial resets the run."));
  const info=el('div','row'); info.style.marginBottom='9px'; c.appendChild(info);
  const g=el('div','grid wide');
  CHALLENGES.forEach(ch=>{
    const b=document.createElement('button'); b.type='button'; b.className='up chal';
    b.innerHTML=`<span class="ic"></span><span class="bd"><span class="t"></span><span class="d"></span><span class="goal"></span><span class="c"></span></span>`;
    b.querySelector('.ic').appendChild(ic(ch.sp,32));
    const _t=memo(b.querySelector('.t')),_d=memo(b.querySelector('.d')),_c=memo(b.querySelector('.c'));
    const _goal=b.querySelector('.goal')&&memo(b.querySelector('.goal'));
    b.addEventListener('click',e=>{
      e.preventDefault();
      if(S.chal===ch.id){exitChallenge(true);toast(X('시련 포기',"Trial abandoned"));refresh();return}
      if((S.chalDone[ch.id]||0)>=ch.max) return;
      enterChallenge(ch.id); refresh();
    });
    g.appendChild(b);
    updaters.push(()=>{
      const n=S.chalDone[ch.id]||0, maxed=n>=ch.max, active=S.chal===ch.id;
      _t.html=`${NM(ch.nm)} <span class="lv">${X(`${n} / ${ch.max} 단계`,`stage ${n} / ${ch.max}`)}</span>`;
      _d.text=DSF(ch.desc);
      _goal.html=maxed?'':`${X('목표',"Goal")} ${icHTML('mana')} ${fmt(chalGoal(ch,n))}`;
      _c.html=maxed?`<span class="good">${X('완주',"Complete")} · ${ch.rw(n)}</span>`
        :active?`<span class="bad">진행 중 · 눌러서 포기</span>`
        :`${X('현재 보상','Current reward')} ${n?ch.rw(n):X('없음','none')}`;
      b.classList.toggle('done',maxed); b.classList.toggle('active',active); b.disabled=maxed;
    });
  });
  c.appendChild(g); p.appendChild(c);
  updaters.push(()=>{
    const ch=curChal();
    info.innerHTML=`<span class="tag">${X('완료',"Cleared")} <b>${fmt(chalTotal())}</b> / ${CHALLENGES.reduce((a,c2)=>a+c2.max,0)}</span>
      <span class="tag">${X('보상 지수',"Reward exponent")} <b>×${fmtLog(M().chalPowLog)}</b></span>
      ${ch?`<span class="tag bad">${X('진행 중','In trial')}: <b>${NM(ch.nm)}</b> · ${icHTML('mana')}${fmtLog(S.manaRunL)} / ${fmt(chalGoal(ch,S.chalDone[ch.id]||0))}</span>`:''}`;
  });
}

export function buildAch(p){
  const c=card([X('업적',"Feats"),'medal']);
  const sub=el('div','hint'); c.appendChild(sub);
  const g=el('div','grid');
  /* 다 보여 주면 목표가 안 된다. 달성한 것과 바로 다음 몇 개만 드러내고
     그 너머는 무엇인지 알 수 없게 둔다. */
  const AHEAD=6;
  const rows=ACHS.map((a,i)=>{
    const d=el('div','ach');
    const icb=el('span'); const img=ic('unknown',32); icb.appendChild(img);
    d.appendChild(icb);
    const t=el('div'); d.appendChild(t); g.appendChild(d);
    return {a,i,d,img,t,key:-1};
  });
  /* 오백일흔두 줄을 0.1 초마다 통째로 다시 그리고 있었다 — 매번 이미지 노드를
     새로 만들어 붙이기까지 했다. 초당 오천 개다. 줄의 상태가 바뀌었을 때만 손댄다. */
  updaters.push(()=>{
    let shown=0;
    for(const r of rows){
      const got=!!S.achs[r.a.id];
      const reveal=got||shown<AHEAD;
      if(!got&&reveal) shown++;
      const key=(got?2:0)|(reveal?1:0);
      if(r.key===key) continue;
      r.key=key;
      r.d.classList.toggle('got',got);
      const want=spriteURL(reveal?(r.a.sp||'medal'):'unknown');
      if(r.img.getAttribute('src')!==want) r.img.setAttribute('src',want);
      /* 무엇을 요구하는지만 적혀 있고 무엇을 주는지는 어디에도 없었다.
         업적은 하나당 마나 생산 +2% 다 — 줄마다 그 몫을 적어 준다. */
      r.t.innerHTML = reveal
        ? `<div class="t">${NM(r.a.nm)}</div><div class="d">${DS(r.a)}`
          +`<span class="${got?'good':'dim'}" style="margin-left:6px">${X('마나 +2%','Mana +2%')}</span></div>`
        : `<div class="t">???</div><div class="d">${X('아직 알 수 없다',"Unknown")}</div>`;
    }
  });
  c.appendChild(g); p.appendChild(c);
  updaters.push(()=>{sub.innerHTML=X(`달성 <b class="gold">${fmt(achCount())}</b> / ${ACHS.length} · 하나당 마나 생산 <b>+2%</b> (현재 +${2*achCount()}%)`,`<b class="gold">${fmt(achCount())}</b> / ${ACHS.length} unlocked · <b>+2%</b> mana output each (now +${2*achCount()}%)`)});
}

export function buildAuto(p){
  const c=card([X('자동화',"Automation"),'cog'],X('자동화는 <b>진행으로 얻어내는 보상</b>이다. 처음에는 채집·건설·연구·던전을 직접 해야 하고, 조건을 만족할 때마다 하나씩 열린다.',"Automation is a <b>reward you earn</b>. At first you gather, build, research and delve by hand; each one unlocks as you progress."));
  const bar=el('div','row'); bar.style.marginBottom='8px';
  const onAll=btn('sm',X('모두 켜기','All on'),()=>{AUTO_DEFS.forEach(d=>{S.auto[d.k]=1});refresh()});
  const offAll=btn('sm',X('모두 끄기','All off'),()=>{AUTO_DEFS.forEach(d=>S.auto[d.k]=0);refresh()});
  const note=el('span','tag');
  bar.append(onAll,offAll,note); c.appendChild(bar);
  updaters.push(()=>{
    const n=AUTO_DEFS.filter(d=>autoUnlocked(d.k)).length;
    note.innerHTML = allAuto()
      ? X('<b class="gold">전부 열렸다</b> · 이제부터는 손댈 것이 없다',"<b class='gold'>All unlocked</b> · nothing left to do by hand")
      : X(`해금 <b>${n}</b> / ${AUTO_DEFS.length}`,`<b>${n}</b> / ${AUTO_DEFS.length} unlocked`);
  });
  /* 진행 순서대로 묶어서 보여 준다 — 스물세 줄이 한 덩어리로 있으면 뭐가 뭔지 모른다.
     아직 열리지 않은 것은 감춘다. 열릴 때마다 줄이 하나씩 늘어난다. */
  const rows=AUTO_DEFS.map(def=>{
    const head=def.g?(()=>{ const h=el('div','hint');
      h.style.cssText='margin:12px 0 2px;font-family:var(--serif);font-size:12px;letter-spacing:.06em;color:var(--gold);opacity:.85';
      h.textContent=NM(def.g).toUpperCase(); c.appendChild(h); return h })():null;
    const div=el('div','divider'); c.appendChild(div);
    const row=toggleRow(def); c.appendChild(row);
    return {def,head,div,row};
  });
  updaters.push(()=>{
    /* 뒤에서 앞으로 훑으면 "이 머리말 아래에 보이는 줄이 있는가" 를 한 번에 안다 */
    let anyBelow=false, firstShown=true;
    for(let i=rows.length-1;i>=0;i--){
      const r=rows[i], un=autoUnlocked(r.def.k);
      r.row.style.display=un?'':'none';
      if(un) anyBelow=true;
      if(r.head){ r.head.style.display=anyBelow?'':'none'; anyBelow=false; }
    }
    for(const r of rows){                      // 첫 줄 위에는 구분선을 두지 않는다
      const un=autoUnlocked(r.def.k);
      r.div.style.display=(un&&!firstShown)?'':'none';
      if(un) firstShown=false;
    }
  });

  p.appendChild(c);
  const s=card([X('자동화 상태',"Automation Status"),'fastfwd']);
  const st=el('div','row'); s.appendChild(st); p.appendChild(s);
  updaters.push(()=>{
    const m=M();
    st.innerHTML=`<span class="tag">${X('자동화 주기',"Automation interval")} <b>×${fmtLog(m.autoSpeedLog)}</b></span>
      <span class="tag">${X('마지막 환생 이후',"Since last rebirth")} <b>${fmtTime(S.sinceRebirth)}</b></span>
      <span class="tag">${X('마지막 승천 이후',"Since last ascension")} <b>${fmtTime(S.sinceAscend)}</b></span>
      <span class="tag">${X('직전 환생 보상',"Last rebirth gain")} <b>${fmt(S.lastSoulGain)}</b></span>`;
  });
}

export function buildSettings(p){
  const c=card([X('세이브',"Save Data"),'anvil'],X('15초마다, 그리고 창을 닫을 때 자동 저장된다.',"Saves every 15 seconds and whenever you close the tab."));
  const row=el('div','row');
  row.append(
    btn('sm',X('지금 저장','Save now'),()=>save()),
    btn('sm',X('파일로 내보내기','Export file'),()=>exportSave()),
    btn('sm',X('파일에서 불러오기','Import file'),()=>$('fileIn').click()),
    btn('sm',X('처음부터 다시','Hard reset'),()=>modal(X('정말 초기화할까요?','Reset everything?'),X('유물까지 <b>전부</b> 사라지며 되돌릴 수 없습니다.<br>먼저 내보내기로 백업해 두세요.','<b>Everything</b> goes, relics included. This cannot be undone.<br>Export a backup first.'),hardReset))
  );
  c.appendChild(row); p.appendChild(c);
  const sc=card([X('기록',"Records"),'scroll']);
  const st=el('div','hint'); st.style.cssText='margin:0;line-height:2'; sc.appendChild(st); p.appendChild(sc);
  const hc=card([X('단축키',"Hotkeys"),'book']);
  const hk=el('div','hint'); hc.appendChild(hk);
  const hl=el('div'); hl.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-top:8px'; hc.appendChild(hl);
  p.appendChild(hc);
  updaters.push(()=>{
    hk.innerHTML=X('<b>스페이스</b> 마나 채집 · <b>B</b> 구매 수량 · <b>X</b> 탐험 토글 · <b>S</b> 저장 · 아래 글쇠로 탭을 옮긴다',
                   '<b>Space</b> gather · <b>B</b> buy amount · <b>X</b> toggle delving · <b>S</b> save · tab keys below');
    hl.innerHTML=TABS.filter(t=>t.open()).map(t=>
      `<span class="tag">${icHTML(t.sp,16)} ${NM(t.nm)} <b class="gold">${tabKeyOf(t.id).toUpperCase()}</b></span>`).join('');
  });
  updaters.push(()=>{
    const m=M();
    const tot=`${icHTML('mana')}<b>${fmtLog(S.manaEverL)}</b> · ${icHTML('offering')}<b>${fmt(S.offerEver)}</b> · ${icHTML('crystal')}<b>${fmt(S.crystalEver)}</b> · ${icHTML('soul')}<b>${fmt(S.soulEver)}</b> · ${icHTML('relic')}<b>${fmt(S.relicEver)}</b>`;
    st.innerHTML=X(
      `플레이 시간 <b>${fmtTime(S.playtime)}</b> · 채집 <b>${fmt(S.clicks)}</b>회<br>
       누적 ${tot}<br>
       환생 <b>${fmt(S.rebirths)}</b>회 · 승천 <b>${fmt(S.ascensions)}</b>회 · 최심층 <b class="gold">${fmt(S.deepest)}층</b> · 시련 <b>${fmt(chalTotal())}</b>단계<br>
       마나 배율 <b class="gold">×${fmtLog(m.prodLog)}</b> · 게임 속도 <b>×${fmtLog(m.speedLog)}</b> · 던전 배율 <b>×${fmtLog(m.dungeonLog)}</b><br>
       오프라인 상한 <b>${m.offline}시간</b> · 버전 <b>v${VERSION}</b>`,
      `Playtime <b>${fmtTime(S.playtime)}</b> · <b>${fmt(S.clicks)}</b> gathers<br>
       Lifetime ${tot}<br>
       <b>${fmt(S.rebirths)}</b> rebirths · <b>${fmt(S.ascensions)}</b> ascensions · deepest <b class="gold">F${fmt(S.deepest)}</b> · <b>${fmt(chalTotal())}</b> trial stages<br>
       Mana <b class="gold">×${fmtLog(m.prodLog)}</b> · speed <b>×${fmtLog(m.speedLog)}</b> · dungeon <b>×${fmtLog(m.dungeonLog)}</b><br>
       Offline cap <b>${m.offline}h</b> · version <b>v${VERSION}</b>`);
  });
}

export const BUILDERS={tower:buildTower,gear:buildGear,research:buildResearch,dungeon:buildDungeon,relics:buildRelics,
  rebirth:buildRebirth,ascend:buildAscend,trans:buildTrans,chal:buildChal,ach:buildAch,auto:buildAuto,settings:buildSettings};
/* 모듈 평가 시점에 INF_LAYERS 를 읽으면 아직 비어 있을 수 있다 (순환 의존).
   패널을 그릴 때 없으면 그때 채운다. */
let _layersWired=false;
export function wireLayerPanels(){
  if(_layersWired) return; _layersWired=true;
  INF_LAYERS.forEach((L,i)=>{ BUILDERS[L.k]=p=>buildLayer(p,i) });
}
