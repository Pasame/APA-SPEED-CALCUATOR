(function () {
  'use strict';
  const E = window.AhaEngine, S = window.AhaState;
  const $=id=>document.getElementById(id);
  const notice=text=>{$('sessionNotice').hidden=!text;$('sessionNotice').textContent=text;};
  let initial=E.defaults();
  try {
    const raw=localStorage.getItem(S.STORAGE_KEY);
    if(raw)initial=S.unpack(JSON.parse(raw)).config;
    else {
      const previous=localStorage.getItem(S.PREVIOUS_STORAGE_KEY);
      if(previous){const saved=JSON.parse(previous);if(saved?.rumor){initial=S.migratePrevious(saved.rumor).config;}}
    }
  }catch{ /* A first visit and unusable storage both use the sample party. */ }
  function readShare(){const shared=S.decode(location.hash.slice(5));try{history.replaceState(null,'',location.href.split('#')[0]);}catch(error){/* Some file hosts restrict history. */}notice('공유된 파티를 불러왔어요.');return shared.config;}
  if(location.hash.startsWith('#aha='))try{initial=readShare();}catch(error){notice('이 공유 링크를 열 수 없어요.');}
  function changed(config){if(E.validate(config).length)return;try{localStorage.setItem(S.STORAGE_KEY,JSON.stringify(S.pack(config)));}catch(error){/* Keep last valid settings or allow offline use without storage. */}}
  const root=$('calculator');
  let cfg = structuredClone(initial), expanded = new Set(), solved=null, compareIdx=0; cfg.goal ||= S.goalDefaults();
  const key=()=>JSON.stringify(cfg);
  const focusEditor=(i,key)=>{renderParty();(key?$('equipment'+i).querySelector(`[data-key="${key}"]`):$('party').querySelector(`[data-editor="${i}"]`))?.focus({preventScroll:true});updateResults();};
  const f=(n,d=3,min=d)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:min,maximumFractionDigits:d}):'—';
  const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const eidolons={aeon:['아하 2돌','웨이브 승격 중 아군 속도 +25%'],yao:['효광 2돌','결계 활성 시 모든 아군 +12%'],huohuo:['곽향 1돌','양명 활성 시 모든 아군 +12%'],hyacine:['히아킨 2돌','선택 시 HP 감소한 아군 +30%'],sparxie:['스파키 2돌','선택 시 아하 타임 후 보너스 턴 · SPD 변화 없음'],pearl:['펄 2돌','선택 시 필살기에 다른 환락 동료도 행동 증가'],wolf:['은랑 2돌','버프 연장·조건부 보너스 턴은 세부에서 수동 지정'],sparkle:['스파클 1돌','선택·활성 시 전투 진입 / 스킬 후 본인 +15%'],hanya:['한아 2돌','선택·활성 시 전투 스킬 후 본인 +20%'],tingyun:['정운 1돌','선택·활성 시 축복 대상 필살기 후 대상 +20%']};
  const art=window.AhaArt||{};
  function icon(id,cls=''){return art[id]?'<img class="game-icon '+cls+'" src="'+art[id]+'" width="40" height="40" alt="">':'<span class="game-icon icon-placeholder '+cls+'" aria-hidden="true"></span>';}
  const {aeon,...otherCharacters}=E.CHARACTERS;
  const characterChoices=Object.entries({aeon,...otherCharacters});
  const characterElements={aeon:'quantum',yao:'physical',sparxie:'fire',pearl:'ice',wolf:'imaginary',eva:'physical',trail:'lightning',wave:'quantum',huohuo:'wind',ruan:'ice',asta:'fire',hyacine:'wind',summeretto:'wind',tingyun:'lightning',hanya:'physical',sparkle:'quantum',sunday:'imaginary'};
  const supportPaths={huohuo:'abundance',hyacine:'remembrance',summeretto:'remembrance',ruan:'harmony',asta:'harmony',tingyun:'harmony',hanya:'harmony',sparkle:'harmony',sunday:'harmony'};
  const pathNames={elation:'환락',harmony:'화합',remembrance:'기억',abundance:'풍요'};
  const elementNames={physical:'물리',fire:'화염',ice:'얼음',lightning:'번개',wind:'바람',quantum:'양자',imaginary:'허수'};
  function badges(artId){
    const id=artId.slice(5),isCharacter=artId.startsWith('char-');
    const path=isCharacter?(E.CHARACTERS[id]?.elation?'elation':supportPaths[id]):artId.startsWith('cone-')?E.LIGHT_CONES[id]?.path:null;
    const element=isCharacter?characterElements[id]:null;
    const items=[];
    if(path)items.push(['path-'+path,'운명의 길: '+pathNames[path]]);
    if(element)items.push(['element-'+element,'속성: '+elementNames[element]]);
    if(!items.length)return '';
    return '<span class="game-badges">'+items.map(([key,label])=>'<img class="game-badge '+key+'" src="'+art[key]+'" width="20" height="20" alt="'+label+'" title="'+label+'">').join('')+'</span>';
  }
  function choice(value,label,artId,selected,disabled=false){
    return '<option value="'+value+'" data-image="'+artId+'" '+(selected?'selected ':'')+(disabled?'disabled':'')+'>'+esc(label)+'</option>';
  }
  function pictureSelect(label,attr,artId,options,cls,id,value){
    return '<div class="picture-field '+cls+'"><span class="control-label">'+label+'</span>'+
      '<button type="button" class="picker-trigger" data-picker="'+id+'" data-title="'+label+'" aria-haspopup="dialog" aria-controls="picturePicker" aria-label="'+esc(label+': '+value)+'">'+icon(artId)+'<span class="picker-value">'+esc(value)+'</span>'+badges(artId)+'<span class="picker-chevron" aria-hidden="true"></span></button>'+
      '<select '+attr+' hidden>'+options+'</select></div>';
  }
  function coneLabel(id,slot){
    const {name,path}=E.LIGHT_CONES[id], character=path&&E.CHARACTERS[id];
    return name+(character?(id===slot.id?' (전광)':' ('+character.name+' 전광)'):'');
  }
  const picker=$('picturePicker'),pickList=$('pickerOptions');
  let openChoice=null;
  function openPicker(trigger){
    const control=trigger.parentElement.querySelector('select');
    openChoice={id:trigger.dataset.picker,control};
    $('pickerTitle').textContent=trigger.dataset.title+' 선택';
    pickList.innerHTML=Array.from(control.options,option=>'<button type="button" class="picker-option" data-choice="'+esc(option.value)+'" aria-pressed="'+option.selected+'" '+(option.disabled?'disabled':'')+'>'+icon(option.dataset.image)+'<span class="picker-option-name">'+esc(option.textContent)+'</span>'+badges(option.dataset.image)+'</button>').join('');
    picker.showModal();
    const current=pickList.querySelector('[aria-pressed="true"]:not(:disabled)');
    const first=pickList.querySelector('button:not(:disabled)');
    pickList.scrollTop=0;
    (trigger.dataset.picker.startsWith('char-')?first:current||first)?.focus();
  }
  root.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-picker]');
    if(trigger)openPicker(trigger);
  });
  pickList.addEventListener('click',event=>{
    const option=event.target.closest('[data-choice]');
    if(!option||!openChoice)return;
    const {control}=openChoice;
    if(control.value!==option.dataset.choice){control.value=option.dataset.choice;control.dispatchEvent(new Event('change',{bubbles:true}));}
    picker.close();
  });
  pickList.addEventListener('keydown',event=>{
    const choices=[...pickList.querySelectorAll('button:not(:disabled)')],i=choices.indexOf(document.activeElement);
    const next=event.key==='Home'?0:event.key==='End'?choices.length-1:event.key==='ArrowDown'?Math.min(choices.length-1,i+1):event.key==='ArrowUp'?Math.max(0,i-1):-1;
    if(next>=0){event.preventDefault();choices[next]?.focus();}
  });
  $('pickerClose').addEventListener('click',()=>picker.close());
  picker.addEventListener('click',event=>{if(event.target===picker)picker.close();});
  picker.addEventListener('close',()=>{
    if(picker.open)return;
    const id=openChoice?.id;
    if(id)root.querySelector('[data-picker="'+id+'"]')?.focus({preventScroll:true});
    openChoice=null;
  });
  function coneHelp(cone){
    if(!cone)return '';
    if(cone.key==='other')return '기타 광추 효과는 마을 속도 또는 구성 입력에 직접 반영할 수 있어요.';
    if(cone.kind==='display')return '속도·행동 순서에 영향 없음';
    const {kind,value,start}=cone;
    if(kind==='base')return '기초 속도 +'+value;
    if(kind==='panel')return '상시 속도 +'+value+'%';
    if(kind==='combat')return '환락 스킬 후 내 속도 +'+value+'%';
    if(kind==='team')return '첫 행동 '+start+'% 당김 · 새로운 소리 활성 시 아군 속도 +'+value+'%';
    if(kind==='entry')return '전투 시작 시 아군 속도 +'+value+' · 각자 첫 행동까지';
    if(kind==='teamAdvance')return '필살기 사용 시 아군 행동 '+value+'% 당김';
    if(kind==='ultSpeed')return '필살기 사용 시 아군 속도 +'+value+' · 각자 다음 행동까지';
    return (cone.trigger==='basic'?'일반 공격 후':'기억 정령이 사라질 때')+' 내 행동 '+value+'% 당김';
  }
  function addEquipmentEvent(i,type){
    if(cfg.events.length>=50){notice('효과를 추가하려면 기존 효과를 하나 지워 주세요.');return;}
    cfg.events.push({time:0,type,target:i,value:0});renderEvents();updateResults();
    const time=$('events').querySelector('[data-event="'+(cfg.events.length-1)+'"][data-field="time"]');
    time?.focus();
  }
  function field(label,key,value,extra=''){return `<label>${label}<input data-key="${key}" type="number" step="0.001" value="${value}" ${extra}></label>`;}
  function check(label,key,value,disabled=false,image=''){return `<label class="check"><input data-key="${key}" type="checkbox" ${value?'checked':''} ${disabled?'disabled':''}>${image?icon(image):''}<span>${label}</span></label>`;}
  function set(el,obj,key){obj[key]=el.type==='checkbox'?el.checked:el.tagName==='SELECT'&&['mode','type'].includes(key)?el.value:el.value===''?NaN:Number(el.value);}
  function targets(value){return cfg.slots.map((s,i)=>`<option value="${i}" ${value===i?'selected':''} ${s.id==='empty'?'disabled':''}>${i+1} · ${E.CHARACTERS[s.id].name}</option>`).join('');}
  function renderParty(){
    $('party').innerHTML=cfg.slots.map((s,i)=>{
      const e=eidolons[s.id],cone=E.selectedCone(s);
      const options=characterChoices.map(([id,c])=>{
        const taken=!['empty','custom','other'].includes(id)&&cfg.slots.some((x,j)=>j!==i&&x.id===id);
        return choice(id,c.name+(taken?' · 편성 중':''),'char-'+id,s.id===id,taken);
      }).join('');
      const priority=id=>id===s.id&&id!=='other'?0:id==='other'?1:2;
      const cones=choice('none','선택 안 함','',!cone)+Object.entries(E.LIGHT_CONES).filter(([id])=>E.coneAllowed(s.id,id)).sort(([a],[b])=>priority(a)-priority(b)).map(([id])=>choice(id,coneLabel(id,s),'cone-'+id,cone?.key===id)).join('');
      return `<article class="slot" data-party-slot="${i}">
        <div class="partyrow">
          ${pictureSelect('캐릭터 '+(i+1),'data-slot="'+i+'" aria-label="슬롯 '+(i+1)+' 캐릭터"','char-'+s.id,options,'character-choice','char-'+i,E.CHARACTERS[s.id].name)}
          <label><span>마을 속도</span><input data-panel="${i}" aria-label="슬롯 ${i+1} 마을 속도" type="number" step="0.001" min="1" inputmode="decimal" value="${s.mode==='build'?E.panelSpeed(s).toFixed(3):s.panel}" ${s.id==='empty'||s.mode==='build'?'disabled':''}></label>
        </div>
        ${s.id==='empty'?'':`<div class="slotconfig">${pictureSelect('광추','data-key="cone" aria-label="슬롯 '+(i+1)+' 광추"',cone?'cone-'+cone.key:'',cones,'cone-choice','cone-'+i,cone?coneLabel(cone.key,s):'선택 안 함')}
          <label>재련<select data-key="refine" ${!cone||cone.key==='other'?'disabled':''}>${[1,2,3,4,5].map(n=>`<option value="${n}" ${s.refine===n?'selected':''}>${n}재</option>`).join('')}</select></label></div>
          <div class="slot-bottom"><div class="combatline">전투 속도 <strong id="combat${i}"></strong></div>${e?check(e[0],'eidolon',s.eidolon):''}<button type="button" class="secondary gear-button" data-editor="${i}" aria-expanded="${expanded.has(i)}" aria-controls="equipment${i}">유물·효과</button></div>
          ${cone&&['teamAdvance','selfAdvance','ultSpeed'].includes(cone.kind)?`<div class="cone-action"><span>${coneHelp(cone)}</span><button type="button" data-cone-action="${i}">${cone.kind==='selfAdvance'?(cone.trigger==='basic'?'일반 공격 직후 추가':'정령 퇴장 시점 추가'):'필살기 시점 추가'}</button></div>`:''}
          <p id="slotError${i}" class="slot-error" hidden></p><p id="effectSummary${i}" class="slot-summary" hidden></p>
          <div id="equipment${i}" class="equipment" ${!expanded.has(i)?'hidden':''}></div>`}
      </article>`;
    }).join('');
    $('party').querySelectorAll('[data-slot]').forEach(el=>el.addEventListener('change',()=>{
      const i=+el.dataset.slot;
      if(!['empty','custom','other'].includes(el.value)&&cfg.slots.some((s,j)=>j!==i&&s.id===el.value)){renderParty();return;}
      expanded.delete(i);
      cfg.events=cfg.events.filter(e=>!(['coneAction','eagleAction'].includes(e.type)&&e.target===i));
      cfg.slots[i]=E.slot(el.value,E.panelSpeed(cfg.slots[i])); cfg.slots[i].buffTarget=cfg.slots.findIndex(s=>s.id!=='empty');
      renderAll();$('party').querySelector(`[data-slot="${i}"]`).focus({preventScroll:true});
    }));
    $('party').querySelectorAll('[data-panel]').forEach(el=>el.addEventListener('input',()=>{cfg.slots[+el.dataset.panel].panel=el.validity.badInput?Infinity:el.value===''?NaN:+el.value;updateResults();}));
    $('party').querySelectorAll('[data-editor]').forEach(el=>el.addEventListener('click',()=>{const i=+el.dataset.editor;expanded.has(i)?expanded.delete(i):expanded.add(i);renderParty();$('party').querySelector(`[data-editor="${i}"]`).focus({preventScroll:true});updateResults();}));
    $('party').querySelectorAll('.slotconfig [data-key],.slot-bottom [data-key]').forEach(el=>el.addEventListener(el.type==='number'?'input':'change',()=>{
      const i=+el.closest('[data-party-slot]').dataset.partySlot,s=cfg.slots[i],key=el.dataset.key;
      if(key==='cone'){const old=E.selectedCone(s)?.key;s.cone=el.value;s.signature=false;s.coneActive=true;if(old!==E.selectedCone(s)?.key){cfg.events=cfg.events.filter(e=>e.type!=='coneAction'||e.target!==i);renderEvents();}}else if(key==='astaFlat')cfg.buffs.asta=el.value===''?NaN:+el.value;else set(el,s,key);
      if(['cone','eidolon','refine'].includes(key)){renderParty();$('party').querySelector(`[data-party-slot="${i}"] [data-key="${key}"]`).focus({preventScroll:true});}
      updateResults();
    }));
    $('party').querySelectorAll('[data-cone-action]').forEach(el=>el.addEventListener('click',()=>addEquipmentEvent(+el.dataset.coneAction,'coneAction')));
    cfg.slots.forEach((s,i)=>{if(expanded.has(i)&&s.id!=='empty')renderEquipment(i);});
  }
  function renderEquipment(i){
    const s=cfg.slots[i],build=s.mode==='build',root=$('equipment'+i),cone=E.selectedCone(s);
    const planar= s.vonwacq?'vonwacq':s.amphoreus?'amphoreus':s.planarSet;
    const planars=[['none','선택 안 함'],['vonwacq','생명의 바커 공'],['amphoreus','영원의 땅 앰포리어스'],...Object.entries(E.PLANARS).map(([id,c])=>[id,c.name])];
    root.innerHTML=`<div class="effect-notes">${eidolons[s.id]?`<p class="help">${eidolons[s.id][1]}</p>`:''}${cone?`<p class="help">${coneHelp(cone)}</p>`:''}</div><div class="grid condition-controls">${cone&&['combat','team'].includes(cone.kind)?check('광추 속도 효과 적용','coneActive',s.cone==='none'?s.buffActive:s.coneActive):''}${['yao','huohuo','hyacine','sparxie','pearl','sparkle','hanya','tingyun','ruan','wave','summeretto'].includes(s.id)?check(s.id==='ruan'?'특성 10레벨 활성 · 본인 제외 +10%':'이 캐릭터의 조건부 효과 적용','buffActive',s.buffActive):''}${s.id==='aeon'?check('진입 행적 · 본인 첫 행동 +30%','ahaStart',s.ahaStart):''}${s.id==='asta'?field('필살기 고정 SPD (0이면 비활성)','astaFlat',cfg.buffs.asta):''}${s.id==='tingyun'&&s.eidolon?`<label>축복 대상<select data-key="buffTarget">${targets(s.buffTarget)}</select></label>`:''}</div>${s.id==='aeon'?'<p class="help">진입 행적은 아하 캐릭터의 첫 행동만 당깁니다. 기타 첫 행동 증가에 중복 입력하지 마세요.</p>':''}<h3>유물 고르기</h3>
    <div class="gear-choices">
    ${pictureSelect('차원 장신구','data-key="planarSet"',planar,planars.map(([id,name])=>choice(id,name,id,planar===id)).join(''),'planar-choice','planar-'+i,planars.find(([id])=>id===planar)?.[1]||'선택 안 함')}
    ${planar==='vonwacq'?'<p class="help">속도 120 이상이면 첫 행동을 40% 당겨요.</p>':''}
    ${planar==='joy'?check('환락도 40% 이상 · 첫 행동 40% 당김','joyEligible',s.joyEligible):''}
    ${planar==='amphoreus'?check('기억 정령이 있어 아군 속도 +8%','memospriteActive',s.memospriteActive):''}
    <div class="relic-options">
    ${check('메신저 4세트 · 아군 속도 +12%','messenger',s.messenger,false,'messenger')}
    ${check('여전사 4세트 · 내 속도 +6%','warrior',s.warrior,false,'warrior')}
    ${check('매 4세트 · 필살기 후 내 행동 25% 당김','eagle',s.eagle,false,'eagle')}
    </div>
    ${s.eagle?'<button type="button" data-eagle-action>매 필살기 시점 추가</button>':''}
    </div><details><summary>속도 직접 계산하기</summary><div class="grid">${field('캐릭터 기초 SPD','base',s.base,'min="1"')}${field('추가 개인 속도 %','pct',s.pct)}${field('추가 개인 고정 SPD','flat',s.flat)}${field('기타 첫 행동 증가 %','initialAdvance',s.initialAdvance,'min="0" max="100"')}${check('히아킨 2돌 HP 감소 조건을 이 대상이 충족','hyacineEligible',s.hyacineEligible,!cfg.slots.some(x=>x.id==='hyacine'))}${check('기억 정령이 전장에 있음','memospriteActive',s.memospriteActive)}<label>속도 입력 방식<select data-key="mode"><option value="panel" ${!build?'selected':''}>마을 SPD 입력</option><option value="build" ${build?'selected':''}>장비 구성으로 계산</option></select></label></div><p class="help">선택한 장비 효과는 다시 입력하지 않아도 돼요.</p>${s.id==='aeon'?`<p class="help">기초 SPD ${f(E.effectiveBase(s))}. 전광 증가분은 기초 SPD 입력에 다시 포함하지 마세요. 구성 입력은 (기초 SPD + 전광 증가) × (1 + 상시 %) + 고정 속도입니다.</p>`:''}${build?`<div class="grid">${field('행적 고정 SPD','trace',s.trace)}${field('신발 고정 SPD','boots',s.boots)}${field('속도 부옵 합계','sub',s.sub)}${field('유물 세트 속도 %','gear',s.gear)}${field('장신구 상시 속도 %','planar',E.PLANARS[s.planarSet]?.pct??s.planar,E.PLANARS[s.planarSet]?'disabled':'')}${field('기타 광추 상시 속도 %','lc',s.lc)}${field('기타 패널 속도 %','extraPanelPct',s.extraPanelPct)}${field('기타 패널 고정 SPD','extraPanelFlat',s.extraPanelFlat)}</div><p class="help">광추를 고른 경우 해당 광추 효과를 사용해요.</p>`:''}</details>`;
    root.querySelector('[data-eagle-action]')?.addEventListener('click',()=>addEquipmentEvent(i,'eagleAction'));
    root.querySelectorAll('[data-key]').forEach(el=>el.addEventListener(el.type==='number'?'input':'change',()=>{if(el.dataset.key==='astaFlat')set(el,cfg.buffs,'asta');else if(el.dataset.key==='planarSet'){s.vonwacq=el.value==='vonwacq';s.amphoreus=el.value==='amphoreus';s.planarSet=Object.hasOwn(E.PLANARS,el.value)?el.value:'none';focusEditor(i,'planarSet');return;}else{set(el,s,el.dataset.key);if(el.dataset.key==='coneActive'&&s.cone==='none')s.buffActive=s.coneActive;if(el.dataset.key==='eagle'){if(!s.eagle){cfg.events=cfg.events.filter(e=>e.type!=='eagleAction'||e.target!==i);renderEvents();}focusEditor(i,'eagle');return;}}if(el.dataset.key==='mode'){renderParty();$('equipment'+i).querySelector('details').open=true;$('equipment'+i).querySelector('[data-key="mode"]').focus({preventScroll:true});}if(el.dataset.key==='buffActive')$('party').querySelectorAll(`[data-party-slot="${i}"] [data-key="buffActive"]`).forEach(x=>x.checked=s.buffActive);updateResults();}));
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
  const eventNames={pct:'속도 % 증감',flat:'고정 SPD 증감',advance:'행동 게이지 조정 %',bonus:'보너스 턴',yao:'효광 필살기',pearl:'펄 필살기',ddd:'댄댄댄 전체 행동 증가 %',wave:'웨이브 직접 가산 총량',coneAction:'장착 광추 효과',eagleAction:'매 4세트 필살기',ahaBonus:'추가 아하 타임',ahaAdvance:'아하 타임 행동 증가 % (필살기 20 / 6돌 첫 100)'};
  function renderEvents(){
    $('events').innerHTML=cfg.events.map((e,i)=>{const automatic=E.automaticEvent(e.type), fixedAha=['ahaBonus','ahaAdvance'].includes(e.type);return `<div class="event"><input data-event="${i}" data-field="time" type="number" step="0.001" aria-label="이벤트 ${i+1} 누적 AV" value="${e.time}"><select data-event="${i}" data-field="type" aria-label="이벤트 ${i+1} 종류">${Object.entries(eventNames).map(([k,v])=>`<option value="${k}" ${k===e.type?'selected':''}>${v}</option>`).join('')}</select><select class="eventtarget" data-event="${i}" data-field="target" aria-label="이벤트 ${i+1} 대상" ${fixedAha?'disabled':''}>${fixedAha?'<option value="all">아하 타임</option>':`<option value="all" ${e.target==='all'?'selected':''}>아군 전체</option>${targets(e.target)}`}</select><input class="eventvalue" data-event="${i}" data-field="value" type="number" step="0.01" aria-label="이벤트 ${i+1} 수치" value="${automatic?'':e.value}" placeholder="자동" ${automatic?'disabled':''}><button data-remove="${i}" aria-label="이벤트 ${i+1} 삭제">×</button></div>`}).join('');
    $('events').querySelectorAll('[data-event]').forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{const e=cfg.events[+el.dataset.event],k=el.dataset.field;
      if(k==='type'){e.type=el.value;if(e.type==='pearl')e.target=cfg.slots.findIndex(s=>s.id!=='pearl'&&s.id!=='empty');if(['bonus','coneAction','eagleAction'].includes(e.type))e.target=cfg.slots.findIndex(s=>s.id!=='empty');if(e.type==='ddd')e.value=24;if(e.type==='ahaAdvance')e.value=20;renderEvents();$('events').querySelector(`[data-event="${el.dataset.event}"][data-field="type"]`)?.focus({preventScroll:true});}
      else if(k==='target')e.target=el.value==='all'?'all':+el.value;else e[k]=el.value===''?NaN:+el.value;updateResults();
    }));
    $('events').querySelectorAll('[data-remove]').forEach(el=>el.addEventListener('click',()=>{cfg.events.splice(+el.dataset.remove,1);renderEvents();updateResults();}));
  }
  function updateResults(){
    const errors=E.validate(cfg),snap=E.snapshot(cfg);
    const globalErrors=errors.filter(t=>!/^슬롯 \d+:/.test(t));$('errors').hidden=!globalErrors.length;$('errors').innerHTML=globalErrors.map(esc).join('<br>');
    cfg.slots.forEach((s,i)=>{const local=errors.filter(t=>t.startsWith('슬롯 '+(i+1)+':')),error=$('slotError'+i),input=$('party').querySelector(`[data-panel="${i}"]`);if(!error)return;error.hidden=!local.length;error.textContent=local.join(' ');input.setAttribute('aria-invalid',String(!!local.length));input.setAttribute('aria-describedby',error.id);});
    changed(cfg);
    cfg.slots.forEach((s,i)=>{if($('combat'+i))$('combat'+i).textContent=f(snap.chars[i].speed);const inp=$('party').querySelector(`[data-panel="${i}"]`);if(s.mode==='build')inp.value=Number.isFinite(E.panelSpeed(s))?E.panelSpeed(s).toFixed(3):'';});
    cfg.slots.forEach((s,i)=>{const notes=[],c=snap.chars[i];
      if(s.eidolon){if(s.id==='wolf')notes.push('은랑 2돌 선택 · 행동 효과 수동');else if(s.id==='aeon')notes.push('아하 2돌 선택 · 웨이브 승격 '+(E.isWaveAscended(cfg)?'+25% 반영':'미적용'));else notes.push((eidolons[s.id]?.[0]||'돌파 선택')+(s.buffActive?' · 적용 중':' · 비활성')+(s.id==='pearl'?' · 필살기 시 반영':s.id==='sparxie'?' · 아하 타임 후 반영':''));}
      const cone=E.selectedCone(s);if(cone&&['base','panel','combat','team','entry'].includes(cone.kind)){const active=s.cone==='none'?s.buffActive:s.coneActive;notes.push(!active&&['combat','team'].includes(cone.kind)?'광추 속도 효과 꺼짐':coneHelp(cone)+(s.mode==='panel'&&['base','panel'].includes(cone.kind)?' (마을 속도에 포함)':''));}
      if(c.pct)notes.push('속도 '+(c.pct>0?'+':'')+f(c.pct,2,0)+'% 반영');
      if(c.flat)notes.push('고정 SPD '+(c.flat>0?'+':'')+f(c.flat,2,0)+' 반영');
      if(s.vonwacq)notes.push(c.speed>=120?'바커공 첫 행동 +40%':'바커공 · 120 SPD 미달, 미적용');
      if(E.PLANARS[s.planarSet])notes.push(E.PLANARS[s.planarSet].name+' · 상시 +6% '+(s.mode==='panel'?'마을 SPD 포함':'구성 반영')+(s.planarSet==='joy'?(s.joyEligible?' · 첫 행동 +40%':' · 환락도 조건 미선택, 행동 증가 미적용'):''));
      if(s.id==='aeon')notes.push(s.ahaStart?'진입 행적 첫 행동 +30% 반영':'진입 행적 미적용 · 장비·효과에서 선택');
      if(s.initialAdvance)notes.push('첫 행동 '+f(s.initialAdvance,2,0)+'%');
      if(s.amphoreus&&!s.memospriteActive)notes.push('앰포리어스 · 정령 없음, 미적용');
      const summary=$('effectSummary'+i);if(!summary)return;summary.hidden=s.id==='empty'||!notes.length;summary.textContent=notes.join(' · ');
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
    const team=Math.max(0,...cfg.slots.map(s=>{const c=E.selectedCone(s);return c?.kind==='team'&&(s.cone==='none'?s.buffActive:s.coneActive)?c.value:0;}));if(team)effects.push('새로운 소리 · 아군 속도 +'+team+'%');
    if(E.entrySpeed(cfg))effects.push('어울림 · 아군 첫 행동까지 속도 +'+E.entrySpeed(cfg));
    if(cfg.buffs.messenger||cfg.slots.some(s=>s.id!=='empty'&&s.messenger))effects.push('메신저 · 전체 +12%');
    if(cfg.buffs.amphoreus||cfg.slots.some(s=>s.id!=='empty'&&s.amphoreus&&s.memospriteActive))effects.push('앰포리어스 · 전체 +8%');
    if(cfg.buffs.extraPct)effects.push(`추가 전체 ${cfg.buffs.extraPct}%`);if(cfg.buffs.extraFlat)effects.push(`추가 전체 고정 ${cfg.buffs.extraFlat}`);if(cfg.buffs.summerLC)effects.push(`기타 서머레토 전무 · 전체 +${cfg.buffs.summerLC}%`);
    if(E.isWaveAscended(cfg))effects.push('웨이브 승격 · 전체 +'+(cfg.slots.find(s=>s.id==='aeon').eidolon?25:15)+'%');
    $('activeeffects').hidden=!effects.length;$('activeeffects').innerHTML=effects.map(t=>`<li>${esc(t)}</li>`).join('');
    const r=errors.length||cfg.solveSlot<0||cfg.goal.kind!=='aha'?null:E.solve(cfg,cfg.solveSlot,cfg.target),ahead=errors.length||cfg.solveSlot<0||cfg.goal.kind!=='aha'?null:E.solve(cfg,cfg.solveSlot,0,'ahead');
    $('inverse').innerHTML=r?`<strong>${E.CHARACTERS[cfg.slots[cfg.solveSlot].id].name} 마을 SPD ${f(r.panel,2)}</strong> → 전투 ${f(r.combat,2)}<div class="help">현재보다 ${r.delta>0?'+':''}${f(r.delta,2)} · 목표 아하 ${f(cfg.target)} 이상</div>${ahead?`<div class="help">아하보다 먼저 자연 행동: 마을 SPD ${f(ahead.panel,2)} 이상 (첫 행동 증가 없는 조건)</div>`:''}`:'환락 캐릭터와 입력값을 확인하세요.';
    renderAhaOptions();
    $('goalStatus').hidden=$('advanced').hidden;
    const sim=E.simulate(cfg);renderGoal(snap,errors,sim,r);const timed=cfg.events.length||E.entrySpeed(cfg);$('aha').previousElementSibling.textContent=timed?'아하 타임 시작 속도':'아하 타임 속도';$('av').previousElementSibling.textContent=timed?'시작 행동 간격':'행동 간격';if(sim.errors.length){$('aha').textContent='—';$('av').textContent='—';$('natural').textContent='—';$('edgeWarnings').hidden=true;$('plot').innerHTML='';$('firstActions').innerHTML='';$('simSummary').textContent=sim.errors.join(' ');$('log').innerHTML='';return;}
    const roundZero=cfg.horizon<150?E.simulate({...cfg,horizon:150}):sim;
    $('natural').textContent=roundZero.log.filter(l=>l.actor===4&&l.type==='normal'&&l.time<150-1e-9).length+'회';
    const warnings=E.diagnostics(cfg,sim);$('edgeWarnings').hidden=!warnings.length;$('edgeWarnings').innerHTML=warnings.map(t=>`<li>${esc(t)}</li>`).join('');
    $('simSummary').textContent=`${cfg.horizon} AV 미만 · 아하 자연 ${sim.counts[4].natural}회 + 보너스 ${sim.counts[4].bonus}회`;
    $('firstActions').innerHTML=sim.log.filter(l=>l.type!=='event').slice(0,5).map((l,i)=>'<li><span class="turn-index">'+(i+1)+'</span>'+icon('char-'+(l.actor===4?'aeon':cfg.slots[l.actor].id))+'<strong>'+esc(l.name)+'</strong><span class="turn-time">'+f(l.time,1,0)+' AV'+(l.type==='bonus'?' · 추가':'')+'</span></li>').join('');
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
    }else if(cfg.goal.kind!=='aha')$('inverse').textContent='목표를 고른 뒤 필요한 속도를 계산해 보세요.';
    else if(basic)$('goalComparison').textContent='부족한 실제 마을 SPD '+f(Math.max(0,basic.delta),2)+'';
    const off=structuredClone(cfg),on=structuredClone(cfg);off.slots[compareIdx].buffActive=false;on.slots[compareIdx].buffActive=true;
    const no=E.snapshot(off),yes=E.snapshot(on);$('buffComparison').textContent='활성 OFF '+f(no.aha)+' → ON '+f(yes.aha)+' 아하 SPD · 자연 간격 '+f(no.av)+' → '+f(yes.av)+' AV';
  }

  function renderAhaOptions(){
    const own=cfg.slots.some(s=>s.id==='aeon');
    root.querySelectorAll('[data-owned]').forEach(button=>button.setAttribute('aria-pressed',String(cfg.ahaOwned===(button.dataset.owned==='1'))));
    $('ahaOwnedControl').hidden=own;
    $('ahaOwnedStatus').textContent=(own?'아하 편성 중 · ':cfg.ahaOwned?'보유 · ':'미보유 · ')+'아하 기본 속도 '+f(E.ahaBase(cfg),3,0);
    const eligible=own&&cfg.slots.some(s=>s.id==='wave')&&cfg.slots.filter(s=>E.CHARACTERS[s.id].elation).length===2;
    $('waveAscension').checked=E.isWaveAscended(cfg);
    $('waveAscension').disabled=!eligible;
    $('waveAscensionControl').hidden=!eligible;
  }
  function sync(){['extraPct','extraFlat'].forEach(k=>$(k).value=cfg.buffs[k]);['target','horizon','soloWaveBonus'].forEach(k=>$(k).value=cfg[k]);}
  function renderAll(){sync();renderParty();renderBuffs();renderSelects();renderEvents();updateResults();}
  $('toggleAdvanced').addEventListener('click',()=>{$('advanced').hidden=!$('advanced').hidden;$('toggleAdvanced').setAttribute('aria-expanded',String(!$('advanced').hidden));updateResults();if(!$('advanced').hidden){$('advanced').focus({preventScroll:true});$('advanced').scrollIntoView({block:'start'});}});
  ['extraPct','extraFlat'].forEach(id=>$(id).addEventListener('input',()=>{cfg.buffs[id]=$(id).value===''?NaN:+$(id).value;updateResults();}));
  ['target','solveSlot','horizon','soloWaveBonus'].forEach(id=>$(id).addEventListener(id==='target'||id==='soloWaveBonus'?'input':'change',()=>{cfg[id]=$(id).value===''?NaN:+$(id).value;updateResults();}));
  $('reset').addEventListener('click',()=>{cfg=E.defaults();cfg.goal=S.goalDefaults();expanded=new Set();solved=null;renderAll();});
  $('addEvent').addEventListener('click',()=>{cfg.events.push({time:0,type:'advance',target:cfg.slots.findIndex(s=>s.id!=='empty'),value:25});renderEvents();updateResults();});
  root.querySelectorAll('[data-target]').forEach(el=>el.addEventListener('click',()=>{cfg.target=+el.dataset.target;sync();updateResults();}));
  $('goalKind').addEventListener('change',()=>{cfg.goal.kind=$('goalKind').value;solved=null;renderSelects();updateResults();});
  $('runGoal').addEventListener('click',()=>{
    const before=key(),search=E.goalSearch(structuredClone(cfg),cfg.solveSlot,structuredClone(cfg.goal));
    $('runGoal').disabled=true;$('runGoal').textContent='계산 중…';$('inverse').setAttribute('aria-busy','true');
    const finish=()=>{$('runGoal').disabled=false;$('runGoal').textContent='필요한 속도 계산';$('inverse').removeAttribute('aria-busy');updateResults();};
    const step=()=>{if(before!==key()||!root.getClientRects().length){search.return();finish();return;}try{const value=search.next();if(value.done){solved={key:before,result:value.value};finish();}else{$('runGoal').textContent='계산 중 '+Math.floor(value.value.progress*100)+'%';setTimeout(step,0);}}catch(error){solved={key:before,result:{error:'필요한 속도를 찾지 못했어요.'}};finish();}};
    setTimeout(step,0);
  });
  $('applyGoal').addEventListener('click',()=>{if(solved?.key!==key()||solved.result.error)return;const slot=cfg.slots[cfg.solveSlot];if(slot.mode==='build')slot.sub+=solved.result.panel-E.panelSpeed(slot);else slot.panel=solved.result.panel;solved=null;renderAll();});
  $('compareSlot').addEventListener('change',()=>{compareIdx=+$('compareSlot').value;updateResults();});
  $('applyPreset').addEventListener('click',()=>{cfg=S.preset($('preset').value);expanded=new Set();solved=null;renderAll();$('utilityStatus').textContent='예시 설정을 적용했습니다.';});
  $('share').addEventListener('click',async()=>{try{const url=new URL(location.href);url.hash='aha='+S.encode(cfg);$('shareURL').value=url.href;$('shareFallback').hidden=false;try{await navigator.clipboard.writeText(url.href);$('utilityStatus').textContent='공유 링크를 복사했습니다.';}catch(error){$('utilityStatus').textContent='아래 주소를 복사해 주세요.';$('shareURL').focus();$('shareURL').select();}}catch(error){$('utilityStatus').textContent='공유 링크를 만들 수 없어요.';}});
  const dock=root.querySelector('aside');new ResizeObserver(()=>{if(dock.getClientRects().length&&matchMedia('(max-width:768px)').matches)document.documentElement.style.setProperty('--dock-height',dock.getBoundingClientRect().height+'px');}).observe(dock);
  const timeline=$('turns');
  new ResizeObserver(()=>{if(timeline.isConnected&&timeline.getClientRects().length)updateResults();}).observe($('plot'));
  root.querySelectorAll('[data-owned]').forEach(button=>button.addEventListener('click',()=>{cfg.ahaOwned=button.dataset.owned==='1';renderSelects();updateResults();}));
  $('waveAscension').addEventListener('change',e=>{cfg.waveAscension=e.target.checked;renderSelects();updateResults();});
  window.AhaApp={getConfig:()=>structuredClone(cfg),setConfig:value=>{cfg=S.normalize(value);expanded=new Set();solved=null;renderAll();}};
  renderAll();
  const fullHeight=window.innerHeight;const keyboard=()=>document.documentElement.classList.toggle('keyboard-open',!!window.visualViewport&&window.visualViewport.height<fullHeight-150&&document.activeElement?.matches('input,select,textarea'));
  window.visualViewport?.addEventListener('resize',keyboard);document.addEventListener('focusout',()=>requestAnimationFrame(keyboard));
  window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#aha='))return;try{cfg=readShare();expanded=new Set();solved=null;renderAll();}catch(error){notice('이 공유 링크를 열 수 없어요.');}});
  const scroller=document.querySelector('main');let previousHeight=scroller.clientHeight;
  new ResizeObserver(()=>{const height=scroller.clientHeight;if(height<previousHeight&&Math.abs(scroller.scrollHeight-scroller.scrollTop-previousHeight)<32)scroller.scrollTop=scroller.scrollHeight;previousHeight=height;}).observe(scroller);
})();
