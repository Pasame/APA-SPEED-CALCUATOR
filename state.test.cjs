const assert=require('node:assert/strict'),E=require('./engine.js'),S=require('./state.js');
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
test('single calculator round-trips decimal speed, goals, ownership and events',()=>{
  const c=E.defaults();c.ahaOwned=false;c.slots[0].panel=210.123456;c.goal={kind:'timedOrder',actor:4,count:2,until:150,other:1,time:20};c.events=[{time:10,type:'flat',target:0,value:12}];assert.deepEqual(S.decode(S.encode(c)).config,S.normalize(c));
});
test('all presets are valid and Aha is in the main calculator',()=>{
  for(const name of ['default','team','start','aha'])assert.deepEqual(E.validate(S.preset(name)),[]);
  assert.equal(S.preset('aha').slots[3].id,'aeon');assert.throws(()=>S.preset('unknown'));
});
test('unknown schema and data version are rejected',()=>{const p=S.pack(E.defaults());assert.throws(()=>S.unpack({...p,schema:999}));assert.throws(()=>S.unpack({...p,dataVersion:'unknown'}));});
test('nonfinite or duplicate character data are rejected',()=>{
  for(const value of [NaN,Infinity,-Infinity,'<img src=x onerror=alert(1)>']){const c=E.defaults();c.slots[0].panel=value;assert.throws(()=>S.normalize(c));}
  const c=E.defaults();c.slots[1].id='yao';assert.throws(()=>S.normalize(c));
});
test('malformed input style, character, event, goal are rejected',()=>{
  const c=E.defaults();c.slots[0].mode='script';assert.throws(()=>S.normalize(c));c.slots[0].mode='panel';c.slots[0].id='script';assert.throws(()=>S.normalize(c));
  const d=E.defaults();d.events=[{time:0,type:'script',target:0,value:1}];assert.throws(()=>S.normalize(d));d.events=[];d.goal={kind:'script'};assert.throws(()=>S.normalize(d));
});
test('automatic events tolerate inactive values but manual events do not',()=>{
  const c=E.defaults();c.events=[{time:0,type:'yao',target:0,value:NaN}];assert.ok(Number.isNaN(S.decode(S.encode(c)).config.events[0].value));c.events[0].type='advance';assert.throws(()=>S.encode(c));
});
test('corrupt or overlong sharing payload never enters a configuration',()=>{
  for(const text of ['<script>','!!!','a'.repeat(S.MAX_LINK+1),'e30'])assert.throws(()=>S.decode(text));
});
test('prototype keys cannot pollute objects',()=>{
  const c=E.defaults();c.slots[0]=JSON.parse(JSON.stringify(c.slots[0]).replace('"id":"yao"','"id":"yao","__proto__":{"polluted":true}'));assert.throws(()=>S.normalize(c));assert.equal({}.polluted,undefined);
});
test('normalized settings own independent arrays and objects',()=>{
  const source=E.defaults(),copy=S.normalize(source);copy.slots[0].panel=1;copy.events.push({});copy.buffs.extraPct=10;assert.equal(source.slots[0].panel,200);assert.equal(source.events.length,0);assert.equal(source.buffs.extraPct,0);
});
test('restored automatic input stays invalid when switched back to manual',()=>{const c=E.defaults();c.events=[{time:0,type:'yao',target:0,value:NaN}];const restored=S.decode(S.encode(c)).config;assert.deepEqual(E.validate(restored),[]);restored.events[0].type='advance';assert.ok(E.validate(restored).some(t=>t.includes('시간/수치')));restored.events[0].value=10;assert.deepEqual(E.validate(restored),[]);});

test('4.7 start trace round-trips only as an Aha option',()=>{
  const c=E.defaults();c.slots[0]=E.slot('aeon',160);c.slots[0].ahaStart=true;
  const restored=S.decode(S.encode(c)).config;assert.equal(restored.slots[0].ahaStart,true);
  delete c.slots[0].ahaStart;assert.equal(S.normalize(c).slots[0].ahaStart,true);
});
test('last 4.7 preview settings migrate without changing choices or dropping events',()=>{
  const c=E.defaults();c.slots[0]=E.slot('aeon',160);c.slots[0].ahaStart=false;c.slots[0].betaPlanar='joy';delete c.slots[0].planarSet;c.slots[0].joyEligible=true;c.events=[{time:10,type:'ahaAdvance',target:'all',value:100}];c.rumor={enabled:true,owned:false,waveAscension:true};
  const previous={schema:2,mode:'47',dataVersion:'v4.6.53 D16833202',config:c};
  const now=S.migratePrevious(previous).config;
  assert.equal(now.ahaOwned,false);assert.equal(now.waveAscension,true);assert.equal(now.slots[0].ahaStart,false);assert.equal(now.slots[0].planarSet,'joy');assert.equal(now.rumor,undefined);assert.deepEqual(now.events,c.events);
  assert.deepEqual(S.decode(Buffer.from(JSON.stringify(previous)).toString('base64url')).config,now);
  assert.throws(()=>S.migratePrevious({...previous,mode:'46'}));assert.throws(()=>S.migratePrevious({...previous,dataVersion:'v4.6.52 D16755051'}));
});
test('shares remember equipment, refinement, and linked action effects',()=>{
  const c=E.defaults();c.slots[3]=E.slot('asta',160);c.slots[3].cone='ddd';c.slots[3].refine=3;c.slots[3].eagle=true;
  c.events=[{type:'coneAction',time:20,target:3,value:0},{type:'eagleAction',time:20,target:3,value:0}];
  const saved=S.decode(S.encode(c)).config;assert.deepEqual(saved,S.normalize(c));assert.deepEqual(E.simulate(saved),E.simulate(c));
});
console.log(count+' state tests passed.');
