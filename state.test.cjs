const assert=require('node:assert/strict'),E=require('./engine.js'),S=require('./state.js');
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
test('both modes round-trip decimal speed, goals, and manual events',()=>{
  for(const mode of ['46','47']){const c=mode==='47'?E.rumorConfig(E.defaults()):E.defaults();c.slots[0].panel=210.123456;c.goal={kind:'timedOrder',actor:4,count:2,until:150,other:1,time:20};c.events=[{time:10,type:'flat',target:0,value:12}];assert.deepEqual(S.decode(S.encode(c,mode)).config,S.normalize(c,mode));}
});
test('all presets are valid and Aha examples cannot leak into 4.6',()=>{
  for(const mode of ['46','47'])for(const name of ['default','team','start',...(mode==='47'?['aha']:[])])assert.deepEqual(E.validate(S.preset(name,mode)),[]);
  assert.throws(()=>S.preset('aha','46'));assert.throws(()=>S.pack(S.preset('aha','47'),'46'));
});
test('schema one migrates missing new fields using defaults',()=>{
  const c=E.defaults();c.slots.forEach(s=>{delete s.betaPlanar;delete s.joyEligible;});const v=S.unpack({schema:1,mode:'46',config:c});assert.equal(v.config.slots[0].betaPlanar,'none');assert.equal(v.config.goal.kind,'aha');
});
test('future schema and different beta data versions are rejected',()=>{
  const p=S.pack(E.rumorConfig(E.defaults()),'47');assert.throws(()=>S.unpack({...p,schema:999}));assert.throws(()=>S.unpack({...p,dataVersion:'v4.7.99'}));
});
test('nonfinite or duplicate character data are rejected',()=>{
  for(const value of [NaN,Infinity,-Infinity,'<img src=x onerror=alert(1)>']){const c=E.defaults();c.slots[0].panel=value;assert.throws(()=>S.normalize(c,'46'));}
  const c=E.defaults();c.slots[1].id='yao';assert.throws(()=>S.normalize(c,'46'));
});
test('malformed mode, input style, character, event, goal are rejected',()=>{
  const c=E.defaults();assert.throws(()=>S.normalize(c,'99'));c.slots[0].mode='script';assert.throws(()=>S.normalize(c,'46'));c.slots[0].mode='panel';c.slots[0].id='script';assert.throws(()=>S.normalize(c,'46'));
  const d=E.defaults();d.events=[{time:0,type:'script',target:0,value:1}];assert.throws(()=>S.normalize(d,'46'));d.events=[];d.goal={kind:'script'};assert.throws(()=>S.normalize(d,'46'));
});
test('automatic events tolerate inactive values but manual events do not',()=>{
  const c=E.defaults();c.events=[{time:0,type:'yao',target:0,value:NaN}];assert.equal(S.decode(S.encode(c,'46')).config.events[0].value,0);c.events[0].type='advance';assert.throws(()=>S.encode(c,'46'));
});
test('corrupt or overlong sharing payload never enters a configuration',()=>{
  for(const text of ['<script>','!!!','a'.repeat(S.MAX_LINK+1),'e30'])assert.throws(()=>S.decode(text));
});
test('prototype keys cannot pollute objects',()=>{
  const c=E.defaults();c.slots[0]=JSON.parse(JSON.stringify(c.slots[0]).replace('"id":"yao"','"id":"yao","__proto__":{"polluted":true}'));assert.throws(()=>S.normalize(c,'46'));assert.equal({}.polluted,undefined);
});
test('normalized modes own independent arrays and objects',()=>{
  const source=E.defaults(),legacy=S.normalize(source,'46'),beta=S.normalize(E.rumorConfig(source),'47');beta.slots[0].panel=1;beta.events.push({});beta.buffs.extraPct=10;assert.equal(legacy.slots[0].panel,200);assert.equal(source.events.length,0);
});
console.log(count+' state tests passed.');
