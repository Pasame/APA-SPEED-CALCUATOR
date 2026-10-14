(function () {
  'use strict';
  const E = window.AhaEngine, S = window.AhaState;
  let activeMode='46', models={standard:E.defaults(),rumor:null};
  const notice=(text)=>{const el=document.getElementById('sessionNotice');el.hidden=!text;el.textContent=text;};
  try {
    const raw=localStorage.getItem(S.STORAGE_KEY);
    if(raw){const saved=JSON.parse(raw);if(saved.schema!==S.SCHEMA)throw Error('저장된 설정 버전을 지원하지 않습니다.');
      if(saved.standard?.mode!=='46'||(saved.rumor&&saved.rumor.mode!=='47'))throw Error('저장 모드가 올바르지 않습니다.');models.standard=S.unpack(saved.standard).config;
      models.rumor=saved.rumor?S.unpack(saved.rumor).config:null;
      activeMode=saved.mode==='47'&&models.rumor?'47':'46';}
  }catch(error){notice('저장 설정을 복원하지 못해 기본값을 사용합니다. '+error.message);models={standard:E.defaults(),rumor:null};}
  if(location.hash.startsWith('#aha='))try{const shared=S.decode(location.hash.slice(5));models[shared.mode==='47'?'rumor':'standard']=shared.config;activeMode=shared.mode;notice('공유 설정을 가져왔습니다. 저장된 설정보다 우선합니다.');try{history.replaceState(null,'',location.href.split('#')[0]);}catch(error){/* Some file hosts do not allow history updates. */}}catch(error){notice('공유 설정을 적용하지 않았습니다. '+error.message);}
  function persist(){try{localStorage.setItem(S.STORAGE_KEY,JSON.stringify({schema:S.SCHEMA,mode:activeMode,standard:S.pack(models.standard,'46'),rumor:models.rumor?S.pack(models.rumor,'47'):null}));}catch(error){notice('자동 저장을 사용할 수 없습니다. 현재 계산과 공유 링크는 사용할 수 있습니다.');}}
  function changed(config,rumor){if(E.validate(config).length)return;try{models[rumor?'rumor':'standard']=S.normalize(config,rumor?'47':'46');persist();}catch(error){/* Keep the last valid settings while a field is incomplete. */}}

  function createCalculator(root, initial, prefix = '', rumor = false) {
  const $ = id => document.getElementById(prefix + id);
  let cfg = structuredClone(initial), expanded = new Set(), solved=null, compareIdx=0; cfg.goal ||= S.goalDefaults();
  const key=()=>JSON.stringify(cfg);
  const focusEditor=(i,key)=>{renderParty();(key?$('equipment'+i).querySelector(`[data-key="${key}"]`):$('party').querySelector(`[data-editor="${i}"]`))?.focus({preventScroll:true});updateResults();};
  const f=(n,d=3,min=d)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:min,maximumFractionDigits:d}):'—';
  const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const eidolons={aeon:['아하 2돌','웨이브 승격 속도 +25% 선택 · 그 외 효과는 정보만 제공'],yao:['효광 2돌','결계 활성 시 모든 아군 +12%'],huohuo:['곽향 1돌','양명 활성 시 모든 아군 +12%'],hyacine:['히아킨 2돌','선택 시 HP 감소한 아군 +30%'],sparxie:['스파키 2돌','선택 시 아하 타임 후 보너스 턴 · SPD 변화 없음'],pearl:['펄 2돌','선택 시 필살기에 다른 환락 동료도 행동 증가'],wolf:['은랑 2돌','버프 연장·조건부 보너스 턴은 세부에서 수동 지정'],sparkle:['스파클 1돌','선택·활성 시 전투 진입 / 스킬 후 본인 +15%'],hanya:['한아 2돌','선택·활성 시 전투 스킬 후 본인 +20%'],tingyun:['정운 1돌','선택·활성 시 축복 대상 필살기 후 대상 +20%']};
  const signatureNotes={aeon:'전광 속도는 마을 SPD에 포함',yao:'전무 상시 속도는 마을 SPD에 포함',wolf:'전무 상시 속도는 마을 SPD에 포함',hyacine:'전무 상시 속도는 마을 SPD에 포함',wave:'전무 착용·활성 시 환락 스킬 후 본인 +24~40%',summeretto:'전무 착용·새로운 소리 활성 시 모든 아군 +20~40%'};
  const noSignature=['asta','hanya','tingyun','custom','other','empty'];
  function field(label,key,value,extra=''){return `<label>${label}<input data-key="${key}" type="number" step="0.001" value="${value}" ${extra}></label>`;}
  function check(label,key,value,disabled=false){return `<label class="check"><input data-key="${key}" type="checkbox" ${value?'checked':''} ${disabled?'disabled':''}><span>${label}</span></label>`;}
  function set(el,obj,key){obj[key]=el.type==='checkbox'?el.checked:el.tagName==='SELECT'&&['mode','type'].includes(key)?el.value:el.value===''?NaN:Number(el.value);}
  function targets(value){return cfg.slots.map((s,i)=>`<option value="${i}" ${value===i?'selected':''} ${s.id==='empty'?'disabled':''}>${i+1} · ${E.CHARACTERS[s.id].name}</option>`).join('');}
  function renderParty(){
    $('party').innerHTML=cfg.slots.map((s,i)=>{
      const c=E.CHARACTERS[s.id], e=eidolons[s.id];
      const options=Object.entries(E.CHARACTERS).filter(([,c])=>rumor||!c.betaOnly).map(([id,c])=>{const taken=id!=='empty'&&cfg.slots.some((x,j)=>j!==i&&x.id===id);return `<option value="${id}" ${s.id===id?'selected':''} ${taken?'disabled':''}>${c.name}${taken?' · 편성 중':''}</option>`}).join('');
      return `<div class="slot" data-party-slot="${i}"><div class="partyrow"><label><span><b class="slotnum">${i+1}</b>캐릭터</span><select data-slot="${i}" aria-label="슬롯 ${i+1} 캐릭터">${options}</select></label><label><span>마을 SPD</span><input data-panel="${i}" aria-label="슬롯 ${i+1} 마을 SPD" type="number" step="0.001" min="1" value="${s.mode==='build'?E.panelSpeed(s).toFixed(3):s.panel}" ${s.id==='empty'||s.mode==='build'?'disabled':''}></label></div>${s.id==='empty'?'':`<div class="slotconfig">${e?check(e[0],'eidolon',s.eidolon):'<small>돌파 속도 없음</small>'}<label>전광<select data-key="signature" ${noSignature.includes(s.id)?'disabled':''}><option value="0" ${!s.signature?'selected':''}>${noSignature.includes(s.id)?'해당 없음':'미착용'}</option><option value="1" ${s.signature?'selected':''}>착용</option></select></label><label>재련<select data-key="refine" ${!s.signature?'disabled':''}>${[1,2,3,4,5].map(n=>`<option value="${n}" ${s.refine===n?'selected':''}>${n}재</option>`).join('')}</select></label></div>`}<div class="slot-bottom"><div class="combatline" ${s.id==='empty'?'hidden':''}>전투 SPD <strong id="${prefix}combat${i}"></strong></div><button data-editor="${i}" aria-expanded="${expanded.has(i)}" aria-controls="${prefix}equipment${i}" ${s.id==='empty'?'disabled':''}>장비·효과</button></div><p id="${prefix}slotError${i}" class="slot-error" hidden></p><p id="${prefix}effectSummary${i}" class="slot-summary" hidden></p><div id="${prefix}equipment${i}" class="equipment" ${!expanded.has(i)||s.id==='empty'?'hidden':''}></div></div>`;

    }).join('');
    $('party').querySelectorAll('[data-slot]').forEach(el=>el.addEventListener('change',()=>{
      const i=+el.dataset.slot;
      if(el.value!=='empty'&&cfg.slots.some((s,j)=>j!==i&&s.id===el.value)){renderParty();return;}
      cfg.slots[i]=E.slot(el.value,E.panelSpeed(cfg.slots[i])); cfg.slots[i].buffTarget=cfg.slots.findIndex(s=>s.id!=='empty');
      renderAll();$('party').querySelector(`[data-slot="${i}"]`).focus({preventScroll:true});
    }));
    $('party').querySelectorAll('[data-panel]').forEach(el=>el.addEventListener('input',()=>{cfg.slots[+el.dataset.panel].panel=el.validity.badInput?Infinity:el.value===''?NaN:+el.value;updateResults();}));
    $('party').querySelectorAll('[data-editor]').forEach(el=>el.addEventListener('click',()=>{const i=+el.dataset.editor;expanded.has(i)?expanded.delete(i):expanded.add(i);renderParty();$('party').querySelector(`[data-editor="${i}"]`).focus({preventScroll:true});updateResults();}));
    $('party').querySelectorAll('.slotconfig [data-key],.slot-note [data-key]').forEach(el=>el.addEventListener(el.type==='number'?'input':'change',()=>{
      const i=+el.closest('[data-party-slot]').dataset.partySlot,s=cfg.slots[i],key=el.dataset.key;
      if(key==='signature')s.signature=el.value==='1';else if(key==='astaFlat')cfg.buffs.asta=el.value===''?NaN:+el.value;else set(el,s,key);
      if(['signature','eidolon','refine'].includes(key)){renderParty();$('party').querySelector(`[data-party-slot="${i}"] [data-key="${key}"]`).focus({preventScroll:true});}
      updateResults();
    }));
    cfg.slots.forEach((s,i)=>{if(expanded.has(i)&&s.id!=='empty')renderEquipment(i);});
  }
  function renderEquipment(i){
    const s=cfg.slots[i],build=s.mode==='build',root=$('equipment'+i);
    root.innerHTML=`<div class="effect-notes">${eidolons[s.id]?`<p class="help">${eidolons[s.id][1]}</p>`:''}${signatureNotes[s.id]?`<p class="help">${signatureNotes[s.id]}</p>`:''}</div><div class="grid condition-controls">${['yao','huohuo','hyacine','sparxie','pearl','sparkle','hanya','tingyun','ruan','wave','summeretto'].includes(s.id)?check(s.id==='ruan'?'특성 10레벨 활성 · 본인 제외 +10%':'조건부 효과 활성 가정','buffActive',s.buffActive):''}${s.id==='asta'?field('필살기 고정 SPD (0이면 비활성)','astaFlat',cfg.buffs.asta):''}${s.id==='tingyun'&&s.eidolon?`<label>축복 대상<select data-key="buffTarget">${targets(s.buffTarget)}</select></label>`:''}</div><h3>장비의 전투 중 효과</h3><div class="grid">${check('바커공 · 120 SPD 이상 첫 행동 +40%','vonwacq',s.vonwacq)}${rumor?`<label>베타 장신구<select data-key="betaPlanar"><option value="none" ${!s.betaPlanar||s.betaPlanar==='none'?'selected':''}>직접 입력 / 기타</option>${Object.entries(E.PLANARS).map(([id,c])=>`<option value="${id}" ${s.betaPlanar===id?'selected':''}>${c.name} · SPD +6%</option>`).join('')}</select></label>${s.betaPlanar==='joy'?check('환락도 40% 이상 충족 가정 · 첫 행동 +40%','joyEligible',s.joyEligible):''}<p class="help">상시 +6%는 마을 SPD에 포함, 구성 입력에서는 한 번만 계산합니다. 바커공과 동시 장착하지 않습니다.</p>`:''}${check('메신저 4세트 · 모든 아군 +12% 활성','messenger',s.messenger)}${check('앰포리어스 · 기억 정령 필드, 모든 아군 +8%','amphoreus',s.amphoreus)}${check('여전사 4세트 · 착용자 +6% 활성','warrior',s.warrior)}</div><p class="help">속도 2세트와 상시 장신구 효과는 마을 SPD에 포함됩니다. 메신저·앰포리어스의 동일 효과는 여러 명이 착용해도 한 번만 적용합니다. 매 4세트·댄댄댄은 하단 행동 순서에서 발동 시점을 지정하세요.</p><details><summary>매우 세부적인 개인 설정</summary><div class="grid">${field('캐릭터 기초 SPD','base',s.base,'min="1"')}${field('추가 개인 속도 %','pct',s.pct)}${field('추가 개인 고정 SPD','flat',s.flat)}${field('기타 첫 행동 증가 %','initialAdvance',s.initialAdvance,'min="0" max="100"')}${check('히아킨 2돌 HP 감소 조건을 이 대상이 충족','hyacineEligible',s.hyacineEligible,!cfg.slots.some(x=>x.id==='hyacine'))}${check('장신구 착용자의 기억 정령 필드','memospriteActive',s.memospriteActive)}<label>속도 입력 방식<select data-key="mode"><option value="panel" ${!build?'selected':''}>마을 SPD 입력</option><option value="build" ${build?'selected':''}>장비 구성으로 계산</option></select></label></div><p class="help">위 돌파·전무 설정에 포함된 속도 효과를 추가 개인 값에 중복 입력하지 마세요. HP 감소·결계·양명 등은 활성 상태로 가정하며 이곳에서 해제할 수 있습니다.</p>${s.id==='aeon'?`<p class="help">기초 SPD ${f(E.effectiveBase(s))}. 전광 증가분은 기초 SPD 입력에 다시 포함하지 마세요. 구성 입력은 (기초 SPD + 전광 증가) × (1 + 상시 %) + 고정 속도입니다.</p>`:''}${build?`<div class="grid">${field('행적 고정 SPD','trace',s.trace)}${field('신발 고정 SPD','boots',s.boots)}${field('속도 부옵 합계','sub',s.sub)}${field('유물 세트 속도 %','gear',s.gear)}${field('장신구 상시 속도 %','planar',E.PLANARS[s.betaPlanar]?.pct??s.planar,E.PLANARS[s.betaPlanar]?'disabled':'')}${field('기타 광추 상시 속도 %','lc',s.lc)}${field('기타 패널 속도 %','extraPanelPct',s.extraPanelPct)}${field('기타 패널 고정 SPD','extraPanelFlat',s.extraPanelFlat)}</div><p class="help">${rumor?'아하의 전광은 기초 속도에 더하고, ':''}효광·은랑·히아킨의 전무를 선택하면 해당 상시 속도를 구성 계산에 반영합니다. 전무가 있으면 기타 광추 수치는 사용하지 않습니다. 신발 +25는 표시값입니다.</p>`:''}</details>`;
    root.querySelectorAll('[data-key]').forEach(el=>el.addEventListener(el.type==='number'?'input':'change',()=>{if(el.dataset.key==='astaFlat')set(el,cfg.buffs,'asta');else if(el.dataset.key==='betaPlanar'){s.betaPlanar=el.value;if(el.value!=='none')s.vonwacq=false;focusEditor(i,'betaPlanar');return;}else{set(el,s,el.dataset.key);if(el.dataset.key==='vonwacq'&&s.vonwacq){s.betaPlanar='none';focusEditor(i,'vonwacq');return;}}if(el.dataset.key==='mode'){renderParty();$('equipment'+i).querySelector('details').open=true;$('equipment'+i).querySelector('[data-key="mode"]').focus({preventScroll:true});}if(el.dataset.key==='buffActive')$('party').querySelectorAll(`[data-party-slot="${i}"] [data-key="buffActive"]`).forEach(x=>x.checked=s.buffActive);updateResults();}));
  }
  function renderBuffs(){
    $('buffs').innerHTML=check('추가 메신저 4세트 효과 활성','messenger',cfg.buffs.messenger)+check('추가 앰포리어스 효과 활성','amphoreus',cfg.buffs.amphoreus)+field('기타 기억 캐릭터에 장착한 서머레토 전무 · 전체 속도 %','summerLC',cfg.buffs.summerLC);
    $('buffs').querySelectorAll('[data-key]').forEach(el=>el.addEventListener(el.type==='number'?'input':'change',()=>{set(el,cfg.buffs,el.dataset.key);updateResults();}));
  }
  function renderSelects(){
    const allowed=s=>s.id!=='empty'&&(cfg.goal.kind!=='aha'||E.CHARACTERS[s.id].elation);
    if(!cfg.slots[cfg.solveSlot]||!allowed(cfg.slots[cfg.solveSlot]))cfg.solveSlot=cfg.slots.findIndex(allowed);
    $('solveSlot').innerHTML=cfg.slots.map((s,i)=>`<option value="${i}" ${i===cfg.solveSlot?'selected':''} ${allowed(s)?'':'disabled'}>${E.CHARACTERS[s.id].name}</option>`).join('');
    $('waveControl').hidden=!E.canWaveDirect(cfg);
    $('compareSlot').innerHTML=cfg.slots.map((s,i)=>`<option value="${i}" ${i===compareIdx?'selected':''} ${s.id==='empty'?'disabled':''}>${E.CHARACTERS[s.id].name}</option>`).join('');
    renderGoalFields();
  }
  const eventNames={pct:'속도 % 증감',flat:'고정 SPD 증감',advance:'행동 게이지 조정 %',bonus:'보너스 턴',yao:'효광 필살기',pearl:'펄 필살기',ddd:'댄댄댄 전체 행동 증가 %',wave:'웨이브 직접 가산 총량',...(rumor?{ahaBonus:'추가 아하 타임 (수동)',ahaAdvance:'아하 타임 행동 증가 % (수동)'}:{})};
  function renderEvents(){
    $('events').innerHTML=cfg.events.map((e,i)=>{const automatic=E.automaticEvent(e.type), fixedAha=['ahaBonus','ahaAdvance'].includes(e.type);return `<div class="event"><input data-event="${i}" data-field="time" type="number" step="0.001" aria-label="이벤트 ${i+1} 누적 AV" value="${e.time}"><select data-event="${i}" data-field="type" aria-label="이벤트 ${i+1} 종류">${Object.entries(eventNames).map(([k,v])=>`<option value="${k}" ${k===e.type?'selected':''}>${v}</option>`).join('')}</select><select class="eventtarget" data-event="${i}" data-field="target" aria-label="이벤트 ${i+1} 대상" ${fixedAha?'disabled':''}>${fixedAha?'<option value="all">아하 타임</option>':`<option value="all" ${e.target==='all'?'selected':''}>아군 전체</option>${targets(e.target)}`}</select><input class="eventvalue" data-event="${i}" data-field="value" type="number" step="0.01" aria-label="이벤트 ${i+1} 수치" value="${automatic?'':e.value}" placeholder="자동" ${automatic?'disabled':''}><button data-remove="${i}" aria-label="이벤트 ${i+1} 삭제">×</button></div>`}).join('');
    $('events').querySelectorAll('[data-event]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{const e=cfg.events[+el.dataset.event],k=el.dataset.field;
      if(k==='type'){e.type=el.value;if(e.type==='pearl')e.target=cfg.slots.findIndex(s=>s.id!=='pearl'&&s.id!=='empty');if(e.type==='bonus')e.target=cfg.slots.findIndex(s=>s.id!=='empty');if(e.type==='ddd')e.value=24;if(e.type==='ahaAdvance')e.value=20;renderEvents();$('events').querySelector(`[data-event="${el.dataset.event}"][data-field="type"]`)?.focus({preventScroll:true});}
      else if(k==='target')e.target=el.value==='all'?'all':+el.value;else e[k]=el.value===''?NaN:+el.value;updateResults();
    }));
    $('events').querySelectorAll('[data-remove]').forEach(el=>el.addEventListener('click',()=>{cfg.events.splice(+el.dataset.remove,1);renderEvents();updateResults();}));
  }
  function updateResults(){
    const errors=E.validate(cfg),snap=E.snapshot(cfg);
    const globalErrors=errors.filter(t=>!/^슬롯 \d+:/.test(t));$('errors').hidden=!globalErrors.length;$('errors').innerHTML=globalErrors.map(esc).join('<br>');
    cfg.slots.forEach((s,i)=>{const local=errors.filter(t=>t.startsWith('슬롯 '+(i+1)+':')),error=$('slotError'+i),input=$('party').querySelector(`[data-panel="${i}"]`);error.hidden=!local.length;error.textContent=local.join(' ');input.setAttribute('aria-invalid',String(!!local.length));input.setAttribute('aria-describedby',error.id);});
    changed(cfg,rumor);
    cfg.slots.forEach((s,i)=>{if($('combat'+i))$('combat'+i).textContent=f(snap.chars[i].speed);const inp=$('party').querySelector(`[data-panel="${i}"]`);if(s.mode==='build')inp.value=Number.isFinite(E.panelSpeed(s))?E.panelSpeed(s).toFixed(3):'';});
    cfg.slots.forEach((s,i)=>{const notes=[],c=snap.chars[i];
      if(s.eidolon){if(s.id==='wolf')notes.push('은랑 2돌 선택 · 행동 효과 수동');else if(s.id==='aeon')notes.push('아하 2돌 선택 · 웨이브 승격 '+(E.isWaveAscended(cfg)?'+25% 반영':'미적용'));else notes.push((eidolons[s.id]?.[0]||'돌파 선택')+(s.buffActive?' · 활성 가정':' · 비활성')+(s.id==='pearl'?' · 필살기 시 반영':s.id==='sparxie'?' · 아하 타임 후 반영':''));}
      if(s.signature)notes.push('전광 '+s.refine+'재'+(['aeon','yao','wolf','hyacine'].includes(s.id)&&s.mode==='panel'?' · 마을 SPD 포함':['wave','summeretto'].includes(s.id)?s.buffActive?' · 활성 가정':' · 비활성':' 선택'));
      if(c.pct)notes.push('속도 '+(c.pct>0?'+':'')+f(c.pct,2,0)+'% 반영 (조건 설정 기준)');
      if(c.flat)notes.push('고정 SPD '+(c.flat>0?'+':'')+f(c.flat,2,0)+' 반영');
      if(s.vonwacq)notes.push(c.speed>=120?'바커공 첫 행동 +40%':'바커공 · 120 SPD 미달, 미적용');
      if(E.PLANARS[s.betaPlanar])notes.push(E.PLANARS[s.betaPlanar].name+' · 상시 +6% '+(s.mode==='panel'?'마을 SPD 포함':'구성 반영')+(s.betaPlanar==='joy'?(s.joyEligible?' · 첫 행동 +40% (조건 충족 가정)':' · 환락도 조건 미선택, 행동 증가 미적용'):''));
      if(s.initialAdvance)notes.push('첫 행동 '+f(s.initialAdvance,2,0)+'%');
      if(s.amphoreus&&!s.memospriteActive)notes.push('앰포리어스 · 정령 없음, 미적용');
      const summary=$('effectSummary'+i);summary.hidden=s.id==='empty'||!notes.length;summary.textContent=notes.join(' · ');
    });
    $('aha').textContent=errors.length?'—':f(snap.aha);
    const count=snap.aha?Math.max(0,Math.ceil(150*snap.aha/10000-1e-10)-1):0;
    $('natural').textContent=errors.length?'—':count+'회';
    $('status').textContent=errors.length?'입력값을 확인하세요.':'현재 속도 유지 기준 · 150 AV 미만';
    $('av').textContent=errors.length?'—':f(snap.av)+' AV';$('second').textContent=errors.length?'—':f(snap.av*2)+' AV';$('n').textContent=snap.ranked.length+'명';
    $('characterEvidence').innerHTML=snap.chars.filter(c=>c.id!=='empty').map(c=>`<div class="evidence-row"><strong>${esc(c.name)}</strong><br>기초 ${f(c.base)} · 마을 ${f(c.panel)}<br>전투 % ${f(c.pct,2)} · 고정 ${f(c.flat)} → 전투 ${f(c.speed)}<br>첫 행동 증가 ${f((1-E.initialGauge(cfg,c.i,snap)/10000)*100,2)}% (100% 상한)</div>`).join('');
    $('ranks').innerHTML=snap.ranked.map(c=>`<div class="rankrow"><span>${c.name} · ${f(c.speed,2)}</span><span>× ${c.weight*100}%</span></div>`).join('');
    $('formula').textContent=snap.base+' + '+snap.ranked.map(c=>f(c.contribution)).join(' + ')+(snap.direct?' + '+snap.direct:'')+' = '+f(snap.aha);
    const effects=[];
    if(cfg.slots.some(s=>s.id==='yao'&&s.eidolon&&s.buffActive))effects.push('효광 2돌 · 전체 +12%');
    if(cfg.slots.some(s=>s.id==='huohuo'&&s.eidolon&&s.buffActive))effects.push('곽향 1돌 · 전체 +12%');
    if(cfg.slots.some(s=>s.id==='hyacine'&&s.eidolon&&s.buffActive))effects.push('히아킨 2돌 · HP 감소 대상 +30%');
    if(cfg.slots.some(s=>s.id==='ruan'&&s.buffActive))effects.push('완·매 · 본인 제외 +10%');
    const summer=cfg.slots.find(s=>s.id==='summeretto');if(summer?.signature&&summer.buffActive)effects.push(`서머레토 전무 · 전체 +${20+5*(summer.refine-1)}%`);
    if(cfg.buffs.messenger||cfg.slots.some(s=>s.id!=='empty'&&s.messenger))effects.push('메신저 · 전체 +12%');
    if(cfg.buffs.amphoreus||cfg.slots.some(s=>s.id!=='empty'&&s.amphoreus&&s.memospriteActive))effects.push('앰포리어스 · 전체 +8%');
    if(cfg.buffs.extraPct)effects.push(`추가 전체 ${cfg.buffs.extraPct}%`);if(cfg.buffs.extraFlat)effects.push(`추가 전체 고정 ${cfg.buffs.extraFlat}`);if(cfg.buffs.summerLC)effects.push(`기타 서머레토 전무 · 전체 +${cfg.buffs.summerLC}%`);
    if(rumor&&E.isWaveAscended(cfg))effects.push('웨이브 승격 · 전체 +'+(cfg.slots.find(s=>s.id==='aeon').eidolon?25:15)+'% (수동 활성)');
    $('activeeffects').hidden=!effects.length;$('activeeffects').innerHTML=effects.map(t=>`<li>${esc(t)}</li>`).join('');
    const r=errors.length||cfg.solveSlot<0||cfg.goal.kind!=='aha'?null:E.solve(cfg,cfg.solveSlot,cfg.target),ahead=errors.length||cfg.solveSlot<0||cfg.goal.kind!=='aha'?null:E.solve(cfg,cfg.solveSlot,0,'ahead');
    $('inverse').innerHTML=r?`<strong>${E.CHARACTERS[cfg.slots[cfg.solveSlot].id].name} 마을 SPD ${f(r.panel,2)}</strong> → 전투 ${f(r.combat,2)}<div class="help">현재보다 ${r.delta>0?'+':''}${f(r.delta,2)} · 목표 아하 ${f(cfg.target)} 이상</div>${ahead?`<div class="help">아하보다 먼저 자연 행동: 마을 SPD ${f(ahead.panel,2)} 이상 (첫 행동 증가 없는 조건)</div>`:''}`:'환락 캐릭터와 입력값을 확인하세요.';
    if(rumor) renderRumorSummary(errors);
    const sim=E.simulate(cfg);renderGoal(snap,errors,sim,r);aha.previousElementSibling.textContent=cfg.events.length?'아하 타임 시작 SPD':'아하 타임 SPD';av.previousElementSibling.textContent=cfg.events.length?'초기 간격':'자연 간격';if(sim.errors.length){$('aha').textContent='—';$('av').textContent='—';$('natural').textContent='—';$('edgeWarnings').hidden=true;$('plot').innerHTML='';$('simSummary').textContent=sim.errors.join(' ');$('log').innerHTML='';return;}
    const roundZero=cfg.horizon<150?E.simulate({...cfg,horizon:150}):sim;
    $('natural').textContent=roundZero.log.filter(l=>l.actor===4&&l.type==='normal'&&l.time<150-1e-9).length+'회';
    const warnings=E.diagnostics(cfg,sim);$('edgeWarnings').hidden=!warnings.length;$('edgeWarnings').innerHTML=warnings.map(t=>`<li>${esc(t)}</li>`).join('');
    $('simSummary').textContent=`${cfg.horizon} AV 미만 · 아하 자연 ${sim.counts[4].natural}회 + 보너스 ${sim.counts[4].bonus}회`;
    $('log').innerHTML=sim.log.map(l=>`<tr><td>${f(l.time)}</td><td>${l.name}</td><td>${{normal:'자연',bonus:'보너스',event:'효과'}[l.type]}</td><td>${esc(l.note)}</td></tr>`).join('');draw(sim);
  }
  function draw(sim) {
    const w=Math.max(680,$('plot').clientWidth||900),left=150,right=22,top=38,row=56;
    const actors=[0,1,2,3,4].filter(i=>i===4||cfg.slots[i].id!=='empty'),h=top+actors.length*row+58,x=t=>left+t/cfg.horizon*(w-left-right);
    let svg='<svg class="timeline" viewBox="0 0 '+w+' '+h+'" role="group" aria-label="누적 AV별 자연 행동, 보너스, 수동 효과"><title>캐릭터별 행동 시점, '+cfg.horizon+' AV 미만</title>';
    actors.forEach((actor,j)=>{const y=top+j*row,name=actor===4?'아하 타임':E.CHARACTERS[cfg.slots[actor].id].name;svg+='<text x="0" y="'+(y+5)+'">'+esc(name)+'</text><line x1="'+left+'" x2="'+(w-right)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>';
      const seen=new Map();sim.log.forEach((l,index)=>{if(l.actor!==actor)return;const count=seen.get(l.time)||0;seen.set(l.time,count+1);const py=y+(count%3)*9,px=x(l.time),label=esc(name+' · '+f(l.time)+' AV · '+l.note);
        svg+='<g tabindex="0" role="button" aria-label="'+label+'" data-tooltip="'+label+'">'+(l.type==='event'?'<line x1="'+px+'" x2="'+px+'" y1="'+(py-10)+'" y2="'+(py+10)+'" stroke="var(--muted)" stroke-width="3"/>':'<circle cx="'+px+'" cy="'+py+'" r="'+(l.type==='bonus'?7:5)+'" fill="'+(l.type==='bonus'?'var(--surface)':actor===4?'var(--accent)':'var(--muted)')+'" stroke="var(--accent)" stroke-width="'+(l.type==='bonus'?2:0)+'"/>')+'<title>'+label+'</title></g>';
      });});
    const bottom=top+(actors.length-1)*row+24;for(let b=150;b<cfg.horizon;b+=100)svg+='<line x1="'+x(b)+'" x2="'+x(b)+'" y1="18" y2="'+bottom+'" stroke="var(--line)" stroke-dasharray="3 4"/><text x="'+x(b)+'" y="14" text-anchor="middle">'+((b-150)/100)+'라 끝</text>';
    [0,cfg.horizon/4,cfg.horizon/2,cfg.horizon*3/4,cfg.horizon].forEach(t=>svg+='<text x="'+x(t)+'" y="'+(bottom+20)+'" text-anchor="'+(t===0?'start':t===cfg.horizon?'end':'middle')+'">'+f(t,0)+'</text>');
    svg+='<text x="'+left+'" y="'+(h-5)+'">누적 행동값 (AV)</text></svg>';$('plot').innerHTML=svg;
    const tooltip=$('timelineTooltip');$('plot').querySelectorAll('[data-tooltip]').forEach(el=>{const show=()=>{tooltip.hidden=false;tooltip.textContent=el.dataset.tooltip;};el.addEventListener('pointerenter',show);el.addEventListener('focus',show);el.addEventListener('click',show);el.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();show();}if(event.key==='Escape')tooltip.hidden=true;});});
  }
  function renderGoalFields(){
    $('goalKind').value=cfg.goal.kind;$('targetWrapper').hidden=cfg.goal.kind!=='aha';
    const options=actor=>cfg.slots.map((s,i)=>'<option value="'+i+'" '+(actor===i?'selected':'')+' '+(s.id==='empty'?'disabled':'')+'>'+esc(E.CHARACTERS[s.id].name)+'</option>').join('')+'<option value="4" '+(actor===4?'selected':'')+'>아하 타임</option>';
    const kind=cfg.goal.kind;
    $('goalFields').innerHTML=(kind==='count'?'<label>행동 횟수 대상<select data-goal="actor">'+options(cfg.goal.actor)+'</select></label><label>최소 자연 횟수<input type="number" data-goal="count" min="1" max="100" value="'+cfg.goal.count+'"></label><label>이 AV 미만<input type="number" data-goal="until" step="0.001" value="'+cfg.goal.until+'"></label>':'')+(['beforeActor','timedOrder'].includes(kind)?'<label>이 대상보다 먼저<select data-goal="other">'+options(cfg.goal.other)+'</select></label>':'')+(kind==='timedOrder'?'<label>이 시점 이후 다음 자연 행동<input type="number" data-goal="time" step="0.001" value="'+cfg.goal.time+'"></label>':'');
    $('goalFields').querySelectorAll('[data-goal]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{cfg.goal[el.dataset.goal]=el.value===''?NaN:+el.value;updateResults();}));
  }
  function renderGoal(snap,errors,sim,basic){
    const checked=errors.length||cfg.solveSlot<0||sim.errors.length?null:E.goalCheck(cfg,cfg.solveSlot,cfg.goal,sim);
    const near=checked&&cfg.goal.kind!=='count'&&Number.isFinite(checked.margin)&&Math.abs(checked.margin)<(cfg.goal.kind==='aha'?0.001:0.01);
    $('goalStatus').textContent=!checked?'입력값 확인':checked.error?'목표 조건 확인':(near?'△ 경계 근접 · ':checked.met?'✓ 달성 · ':'○ 미달 · ')+(cfg.goal.kind==='aha'?'목표 '+f(cfg.target,2):$('goalKind').selectedOptions[0].textContent);
    $('goalComparison').textContent='';$('applyGoal').disabled=true;
    if(solved?.key===key()){
      const v=solved.result;if(v.error){$('inverse').textContent=v.error;return;}
      $('inverse').innerHTML='<strong>'+esc(E.CHARACTERS[cfg.slots[cfg.solveSlot].id].name)+' 실제 마을 SPD '+f(v.panel,2)+'</strong> → 전투 '+f(v.combat)+'<p class="help">현재 대비 '+(v.delta>0?'+':'')+f(v.delta,2)+' · 현재 '+(v.currentMet?'달성':'미달')+' · 재대입 달성 / '+(v.previousAvailable?'직전 0.01 미달':'입력 기초·고정 장비의 최소 범위')+(v.rankChanged?' · 순위 변경':'')+'</p><p class="help">'+esc(v.method)+' · '+esc(v.precision)+'<br>'+esc(v.assumed)+'</p>';
      $('goalComparison').textContent='현재 아하 '+f(snap.aha)+' → 역산 설정 '+f(v.checked.snap.aha)+' SPD · '+f(snap.av)+' → '+f(v.checked.snap.av)+' AV';$('applyGoal').disabled=false;
    }else if(cfg.goal.kind!=='aha')$('inverse').textContent='목표와 시점을 지정한 뒤 역산·재검증을 누르세요.';
    else if(basic)$('goalComparison').textContent='부족한 실제 마을 SPD '+f(Math.max(0,basic.delta),2)+' (정적 SPD 목표). 수동 이벤트를 포함한 행동 목표는 재검증하세요.';
    const off=structuredClone(cfg),on=structuredClone(cfg);off.slots[compareIdx].buffActive=false;on.slots[compareIdx].buffActive=true;
    const no=E.snapshot(off),yes=E.snapshot(on);$('buffComparison').textContent='활성 OFF '+f(no.aha)+' → ON '+f(yes.aha)+' 아하 SPD · 자연 간격 '+f(no.av)+' → '+f(yes.av)+' AV';
  }

  function renderRumorSummary(errors) {
    const own = cfg.slots.find(s=>s.id==='aeon'), wave = E.isWaveAscended(cfg);
    document.querySelectorAll('[data-owned]').forEach(button=>button.setAttribute('aria-pressed',String(cfg.rumor.owned===(button.dataset.owned==='1'))));
    document.getElementById('rumorOwnedControl').hidden=!!own;
    const ownedStatus=document.getElementById('rumorOwnedStatus');
    ownedStatus.textContent=(own?'아하 편성 중 · ':cfg.rumor.owned?'보유 · ':'')+'기초항 '+f(E.ahaBase(cfg),3,0)+(own?' (참조 가정)':cfg.rumor.owned?' (가정)':'');
    const waveInput=document.getElementById('rumorWaveAscension');
    waveInput.checked=E.isWaveAscended(cfg);
    const eligible=cfg.slots.some(s=>s.id==='wave')&&!!own&&cfg.slots.filter(s=>E.CHARACTERS[s.id].elation).length===2;
    waveInput.disabled=!eligible;
    document.getElementById('rumorWaveControl').hidden=!eligible;
    document.getElementById('rumorAssumption').textContent=own?
      '편성 아하의 기초 SPD '+f(E.effectiveBase(own))+'를 아하 타임 기초항으로 참조합니다. 행적·상시 속도 %·전투 버프는 기초항에 직접 더하지 않습니다. 전광의 % 기준 변경은 문구에 따른 해석이며 실기 미검증입니다.' :
      cfg.rumor.owned?'보유만 / 미편성: 참조 방식이 실기 미검증이므로 행적·장비·전광을 제외한 94로 제한합니다. 미편성 전광은 선택할 수 없습니다.':'미보유 / 미편성: 기존 기초항 80을 사용합니다.';
    const pair=E.compareBase(cfg), old=pair.legacy, beta=pair.beta;
    document.getElementById('rumorComparison').innerHTML=errors.length?'<p>입력 오류를 수정하면 비교할 수 있습니다.</p>':
      '<div><small>기초항 80 · 동일 파티</small><strong>'+f(old.aha)+'</strong><small>아하 타임 SPD · '+f(old.av)+' AV</small></div>'+ 
      '<div><small>찌라시 기초항 '+f(beta.base)+'</small><strong>'+f(beta.aha)+'</strong><small>아하 타임 SPD · '+f(beta.av)+' AV</small></div>'+ 
      '<div><small>기초항 변경 차이</small><strong>'+((beta.aha-old.aha)>=0?'+':'')+f(beta.aha-old.aha)+' SPD</strong><small>'+f(beta.av-old.av)+' AV · 자연 간격 변화</small></div>';
    document.getElementById('rumorCharacterSummary').textContent=own?
      '아하 캐릭터 전투 SPD: '+f(beta.chars.find(s=>s.id==='aeon').speed)+' · 환락 순위 '+beta.ranked.find(s=>s.id==='aeon').rank+'위 · 가중 기여 '+f(beta.ranked.find(s=>s.id==='aeon').contribution)+' SPD'+(wave?' · 웨이브 승격 속도 버프 반영':''):
      '아하 미편성: 캐릭터 자신의 행동·환락 속도 기여는 없습니다.';
    $('aha').previousElementSibling.textContent='아하 타임 SPD';
  }
  function sync(){['extraPct','extraFlat'].forEach(k=>$(k).value=cfg.buffs[k]);['target','horizon','soloWaveBonus'].forEach(k=>$(k).value=cfg[k]);}
  function renderAll(){sync();renderParty();renderBuffs();renderSelects();renderEvents();updateResults();}
  $('toggleAdvanced').addEventListener('click',()=>{$('advanced').hidden=!$('advanced').hidden;$('toggleAdvanced').setAttribute('aria-expanded',String(!$('advanced').hidden));updateResults();if(!$('advanced').hidden){$('advanced').focus({preventScroll:true});$('advanced').scrollIntoView({block:'start'});}});
  root.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>{root.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==prefix+el.dataset.tab);root.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b===el);b.setAttribute('aria-pressed',String(b===el));});updateResults();}));
  ['extraPct','extraFlat'].forEach(id=>$(id).addEventListener('input',()=>{cfg.buffs[id]=$(id).value===''?NaN:+$(id).value;updateResults();}));
  ['target','solveSlot','horizon','soloWaveBonus'].forEach(id=>$(id).addEventListener(id==='target'||id==='soloWaveBonus'?'input':'change',()=>{cfg[id]=$(id).value===''?NaN:+$(id).value;updateResults();}));
  $('reset').addEventListener('click',()=>{cfg=rumor?E.rumorConfig(E.defaults()):E.defaults();cfg.goal=S.goalDefaults();expanded=new Set();solved=null;renderAll();});
  $('addEvent').addEventListener('click',()=>{cfg.events.push({time:0,type:'advance',target:cfg.slots.findIndex(s=>s.id!=='empty'),value:25});renderEvents();updateResults();});
  root.querySelectorAll('[data-target]').forEach(el=>el.addEventListener('click',()=>{cfg.target=+el.dataset.target;sync();updateResults();}));
  $('goalKind').addEventListener('change',()=>{cfg.goal.kind=$('goalKind').value;solved=null;renderSelects();updateResults();});
  $('runGoal').addEventListener('click',()=>{
    const before=key(),search=E.goalSearch(structuredClone(cfg),cfg.solveSlot,structuredClone(cfg.goal));
    $('runGoal').disabled=true;$('runGoal').textContent='검증 중…';$('inverse').setAttribute('aria-busy','true');
    const finish=()=>{$('runGoal').disabled=false;$('runGoal').textContent='역산·재검증';$('inverse').removeAttribute('aria-busy');updateResults();};
    const step=()=>{if(before!==key()||!root.getClientRects().length){search.return();finish();return;}try{const value=search.next();if(value.done){solved={key:before,result:value.value};finish();}else{$('runGoal').textContent='전수 탐색 '+Math.floor(value.value.progress*100)+'%';setTimeout(step,0);}}catch(error){solved={key:before,result:{error:'역산을 완료하지 못했습니다. '+error.message}};finish();}};
    setTimeout(step,0);
  });
  $('applyGoal').addEventListener('click',()=>{if(solved?.key!==key()||solved.result.error)return;const slot=cfg.slots[cfg.solveSlot];if(slot.mode==='build')slot.sub+=solved.result.panel-E.panelSpeed(slot);else slot.panel=solved.result.panel;solved=null;renderAll();});
  $('compareSlot').addEventListener('change',()=>{compareIdx=+$('compareSlot').value;updateResults();});
  if(rumor)$('preset').insertAdjacentHTML('beforeend','<option value="aha">아하 전광 1재 + Joy · 환락도 충족 가정</option>');
  $('applyPreset').addEventListener('click',()=>{cfg=S.preset($('preset').value,rumor?'47':'46');expanded=new Set();solved=null;renderAll();$('utilityStatus').textContent='현재 모드에 예시 설정을 적용했습니다.';});
  $('share').addEventListener('click',async()=>{try{const url=new URL(location.href);url.hash='aha='+S.encode(cfg,rumor?'47':'46');$('shareURL').value=url.href;$('shareFallback').hidden=false;try{await navigator.clipboard.writeText(url.href);$('utilityStatus').textContent='공유 링크를 복사했습니다.';}catch(error){$('utilityStatus').textContent='자동 복사가 허용되지 않았습니다. 아래 주소를 선택해 복사하세요.';$('shareURL').focus();$('shareURL').select();}}catch(error){$('utilityStatus').textContent='공유할 수 없습니다. '+error.message;}});
  const dock=root.querySelector('aside');new ResizeObserver(()=>{if(dock.getClientRects().length&&matchMedia('(max-width:768px)').matches)document.documentElement.style.setProperty('--dock-height',dock.getBoundingClientRect().height+'px');}).observe(dock);
  $('sources').innerHTML=E.SOURCES.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`).join('');
  const timeline=$('turns');
  new ResizeObserver(()=>{if(timeline.isConnected&&timeline.getClientRects().length)updateResults();}).observe($('plot'));
  if(rumor){
    document.querySelectorAll('[data-owned]').forEach(button=>button.addEventListener('click',()=>{if(cfg.slots.some(s=>s.id==='aeon'))return;cfg.rumor.owned=button.dataset.owned==='1';renderSelects();updateResults();}));
    document.getElementById('rumorWaveAscension').addEventListener('change',e=>{cfg.rumor.waveAscension=e.target.checked;renderSelects();updateResults();});
  }
  renderAll();
  return { getConfig:()=>structuredClone(cfg), setConfig:value=>{cfg=structuredClone(value);cfg.goal ||= S.goalDefaults();solved=null;renderAll();} };
  }
  const originalRoot=document.getElementById('standardCalculator');
  // Capture static markup before the main controller fills inputs and computed fields.
  const rumorTemplate=originalRoot.cloneNode(true);
  window.AhaApp=createCalculator(originalRoot,models.standard);
  const panel=document.getElementById('rumorPanel'), toggle=document.getElementById('toggleRumor');
  function enterRumor(){
    if(!window.AhaRumorApp){
      rumorTemplate.removeAttribute('id');
      rumorTemplate.querySelectorAll('[id]').forEach(el=>el.id='rumor-'+el.id);
      rumorTemplate.querySelectorAll('[aria-controls]').forEach(el=>el.setAttribute('aria-controls','rumor-'+el.getAttribute('aria-controls')));
      rumorTemplate.querySelector('.footer').textContent='4.7 찌라시 계산 · 비공식 베타 / 출시 전 변경 가능';
      rumorTemplate.querySelector('#rumor-calc details p').textContent='전투 SPD = 마을 SPD + 유효 기초 SPD × 전투 중 속도 % + 고정 SPD. 아하 타임 SPD = 선택한 기초항 + 환락 캐릭터 전투 SPD의 20% / 10% / 5% / 2.5%. 전광의 기초 SPD 증가를 % 기준에 포함합니다.';
      document.getElementById('rumorCalculator').append(rumorTemplate);
      rumorTemplate.querySelector('#rumor-party').before(document.querySelector('.rumor-options'));
      rumorTemplate.querySelector('.footer').before(document.getElementById('rumorComparisonDetails'));
      window.AhaRumorApp=createCalculator(rumorTemplate,models.rumor||E.rumorConfig(window.AhaApp.getConfig()),'rumor-',true);
    }
    activeMode='47';persist();showInfo(false);originalRoot.hidden=true;document.getElementById('standardButtons').hidden=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-pressed','true');document.getElementById('closeRumor').setAttribute('aria-pressed','false');panel.focus({preventScroll:true});
  }
  function closeRumor(focusTarget=toggle){activeMode='46';persist();panel.hidden=true;originalRoot.hidden=false;document.getElementById('standardButtons').hidden=false;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-pressed','false');document.getElementById('closeRumor').setAttribute('aria-pressed','true');focusTarget.focus({preventScroll:true});}
  toggle.addEventListener('click',enterRumor);
  document.getElementById('closeRumor').addEventListener('click',()=>closeRumor(document.getElementById('closeRumor')));
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeRumor();}});
  document.getElementById('importRumor').addEventListener('click',()=>{window.AhaRumorApp.setConfig(E.rumorConfig(window.AhaApp.getConfig()));document.getElementById('rumorImportStatus').hidden=false;document.getElementById('rumorImportStatus').textContent='기존 설정을 다시 가져왔습니다.';});
  function showInfo(info){
    document.getElementById('rumorCalculation').hidden=info;document.getElementById('rumorInformation').hidden=!info;
    document.getElementById('showRumorCalc').setAttribute('aria-pressed',String(!info));document.getElementById('showRumorInfo').setAttribute('aria-pressed',String(info));
    document.getElementById('rumorTools').hidden=info;
  }
  document.getElementById('showRumorCalc').addEventListener('click',()=>showInfo(false));
  document.getElementById('showRumorInfo').addEventListener('click',()=>showInfo(true));
  const fullHeight=window.innerHeight;const keyboard=()=>document.documentElement.classList.toggle('keyboard-open',!!window.visualViewport&&window.visualViewport.height<fullHeight-150&&document.activeElement?.matches('input,select,textarea'));
  window.visualViewport?.addEventListener('resize',keyboard);document.addEventListener('focusout',()=>requestAnimationFrame(keyboard));
  window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#aha='))return;try{const shared=S.decode(location.hash.slice(5));models[shared.mode==='47'?'rumor':'standard']=shared.config;activeMode=shared.mode;if(shared.mode==='47'){enterRumor();window.AhaRumorApp.setConfig(shared.config);}else{window.AhaApp.setConfig(shared.config);closeRumor(document.getElementById('closeRumor'));}notice('공유 설정을 가져왔습니다. 저장된 설정보다 우선합니다.');history.replaceState(null,'',location.href.split('#')[0]);}catch(error){notice('공유 설정을 적용하지 않았습니다. '+error.message);}});
  const scroller=document.querySelector('main');let previousHeight=scroller.clientHeight;
  new ResizeObserver(()=>{const height=scroller.clientHeight;if(height<previousHeight&&Math.abs(scroller.scrollHeight-scroller.scrollTop-previousHeight)<32)scroller.scrollTop=scroller.scrollHeight;previousHeight=height;}).observe(scroller);
  if(activeMode==='47')enterRumor();
})();
