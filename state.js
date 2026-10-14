(function(root){
  'use strict';
  const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.AhaEngine;
  const SCHEMA = 2, STORAGE_KEY = 'aha-calculator-v2', MAX_LINK = 24000;
  const goalDefaults = () => ({kind:'aha',actor:4,count:2,until:150,other:4,time:20});
  function plain(value){ return value && typeof value==='object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value)); }
  function normalize(input, mode) {
    if (!plain(input) || !['46','47'].includes(mode) || !Array.isArray(input.slots) || input.slots.length!==4 || !plain(input.buffs) || !Array.isArray(input.events) || input.events.length>50) throw Error('파티·버프·이벤트 형식이 올바르지 않습니다.');
    const cfg = mode==='47'?E.rumorConfig(E.defaults()):E.defaults();
    function fields(source,target){
      if (!plain(source)) throw Error('설정 형식이 올바르지 않습니다.');
      for (const key of Object.keys(source)) {
        if (['__proto__','constructor','prototype'].includes(key)) throw Error('허용하지 않는 설정입니다.');
        if (!(key in target)) continue;
        const value=source[key], type=typeof target[key];
        if (typeof value!==type || (type==='number'&&!Number.isFinite(value))) throw Error('설정 값의 종류를 확인해 주세요.');
        if (['number','string','boolean'].includes(type)) target[key]=value;
      }
    }
    cfg.slots=input.slots.map(s=>{
      if (!plain(s) || !E.CHARACTERS[s.id]) throw Error('알 수 없는 캐릭터입니다.');
      const copy=E.slot(s.id,200);copy.buffTarget=0;fields(s,copy);
      if (!['panel','build'].includes(copy.mode)) throw Error('지원하지 않는 입력 방식입니다.');
      return copy;
    });
    fields(input.buffs,cfg.buffs);
    for(const k of ['target','solveSlot','soloWaveBonus','horizon','sparxieE2','pearlE2']) if(k in input) fields({[k]:input[k]},cfg);
    if (!Number.isInteger(cfg.solveSlot)||cfg.solveSlot<0||cfg.solveSlot>3) throw Error('역산 슬롯을 확인해 주세요.');
    cfg.events=input.events.map(e=>{
      if (!plain(e) || typeof e.type!=='string' || !(e.target==='all'||Number.isInteger(e.target))) throw Error('이벤트 형식이 올바르지 않습니다.');
      return {time:e.time,type:e.type,target:e.target,value:E.automaticEvent(e.type)?0:e.value};
    });
    if(mode==='47'&&input.rumor){fields(input.rumor,cfg.rumor);cfg.rumor.enabled=true;}
    cfg.goal=goalDefaults(); if(input.goal)fields(input.goal,cfg.goal);
    if(!['aha','beforeAha','count','beforeActor','timedOrder'].includes(cfg.goal.kind))throw Error('지원하지 않는 목표입니다.');
    const goalProblem=E.goalProblem(cfg,cfg.solveSlot,cfg.goal);if(goalProblem)throw Error(goalProblem.error);
    const errors=E.validate(cfg);if(errors.length)throw Error(errors.join(' '));
    return cfg;
  }
  function pack(cfg,mode){return {schema:SCHEMA,mode,dataVersion:mode==='47'?E.BETA.version+' '+E.BETA.data:'4.6',config:normalize(cfg,mode)};}
  function unpack(value){
    if(!plain(value)||![1,SCHEMA].includes(value.schema))throw Error('지원하지 않는 설정 버전입니다.');
    if(value.mode==='46'&&value.dataVersion&&value.dataVersion!=='4.6')throw Error('정식 데이터 버전을 지원하지 않습니다.');
    if(value.mode==='47'&&value.dataVersion!==E.BETA.version+' '+E.BETA.data)throw Error('베타 데이터 버전이 다릅니다. 해당 버전 설정을 현재 계산에 자동 적용하지 않습니다.');
    return {mode:value.mode,config:normalize(value.config,value.mode)};
  }
  function encode(cfg,mode){
    const json=JSON.stringify(pack(cfg,mode));
    const bytes=new TextEncoder().encode(json);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    const text=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    if(text.length>MAX_LINK)throw Error('설정이 너무 길어 공유 링크를 만들 수 없습니다. 이벤트를 줄여 주세요.');
    return text;
  }
  function decode(text){
    if(typeof text!=='string'||text.length>MAX_LINK||!/^[A-Za-z0-9_-]+$/.test(text))throw Error('공유 링크 형식 또는 길이를 확인해 주세요.');
    const raw=atob(text.replace(/-/g,'+').replace(/_/g,'/'));
    return unpack(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0)))));
  }
  function preset(name,mode){
    const c=mode==='47'?E.rumorConfig(E.defaults()):E.defaults();
    if(name==='team'){c.slots[3]=E.slot('huohuo',160);c.slots[0].eidolon=true;c.slots[3].eidolon=true;}
    else if(name==='start'){c.slots[0].vonwacq=true;c.events=[{time:0,type:'ddd',target:'all',value:24}];}
    else if(name==='aha'){
      if(mode!=='47')throw Error('아하 예시는 찌라시 모드 전용입니다.');
      c.slots[3]=E.slot('aeon',160);c.slots[3].signature=true;c.slots[3].betaPlanar='joy';c.slots[3].joyEligible=true;
    }else if(name!=='default')throw Error('지원하지 않는 예시입니다.');
    return normalize(c,mode);
  }
  const api={SCHEMA,STORAGE_KEY,MAX_LINK,normalize,pack,unpack,encode,decode,preset,goalDefaults};
  root.AhaState=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
