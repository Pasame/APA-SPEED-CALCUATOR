const assert = require('node:assert/strict');
const E = require('./engine.js');
let passed = 0;
function test(name, f) { f(); passed++; console.log('PASS', name); }
function approx(a, b, tolerance = 1e-8) { assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`); }
function duo(a = 200, b = 134) { const c = E.defaults(); c.slots = [E.slot('yao', a), E.slot('sparxie', b), E.slot('empty', 0), E.slot('empty', 0)]; return c; }
test('two Elation weighted speed 133.4', () => approx(E.snapshot(duo()).aha, 133.4));
test('four Elation weighted speed and sort independent of slots', () => {
  const c = E.defaults(); approx(E.snapshot(c).aha, 151.35);
  c.slots.reverse(); approx(E.snapshot(c).aha, 151.35);
});
test('non-Elation does not contribute', () => { const c = duo(); c.slots[2] = E.slot('huohuo', 400); approx(E.snapshot(c).aha, 133.4); });
test('Yao E2 and Huohuo E1 add on base, not panel and do not multiply', () => {
  const c = duo(); c.slots[2] = E.slot('huohuo', 160); c.buffs.yao = c.buffs.huohuo = true;
  approx(E.snapshot(c).chars[0].speed, 224.24); approx(E.snapshot(c).chars[1].speed, 159.68);
  approx(E.snapshot(c).aha, 140.816);
});
test('inactive or absent buff owner has no effect', () => { const c = duo(); c.buffs.huohuo = true; approx(E.snapshot(c).aha, 133.4); });
test('rank crossing after buffs', () => { const c = duo(170, 168); c.slots[1].pct = 20; assert.equal(E.snapshot(c).ranked[0].id, 'sparxie'); approx(E.snapshot(c).aha, 134.88); });
test('panel mode ignores gear and LC fields to prevent duplicate counting', () => { const c = duo(); c.slots[0].lc = 18; c.slots[0].gear = 12; approx(E.snapshot(c).chars[0].speed, 200); });
test('build mode percent effects exclude flat trace and boots', () => { const s = E.slot('yao', 200); s.mode = 'build'; s.lc = 18; s.boots = 25.032; approx(E.panelSpeed(s), 179.272); });
test('snapshot solve re-ranks and returns safe 0.01 panel step', () => {
  const c = duo(140, 200); const r = E.solve(c, 0, 160); assert.ok(r.panel > 200);
  assert.ok(E.snapshot(c, { 0: r.combat }).aha >= 160);
  assert.ok(E.snapshot(c, { 0: r.combat - 0.01 }).aha < 160);
});
test('strict before-Aha inverse', () => { const c = E.defaults(); const r = E.solve(c, 2, 0, 'ahead'); assert.ok(r.combat > E.snapshot(c, { 2: r.combat }).aha); });
test('133.4 yields two natural Aha turns before 150 AV', () => { const c = duo(); const r = E.simulate(c); assert.equal(r.counts[4].natural, 2); });
test('exact cycle boundary excluded and just beyond included', () => {
  const c = duo(200, 1000 / 7.5 - 1200); // override via panel to avoid rounding the rational
  c.slots[1].panel = (400 / 3 - 120) * 10;
  assert.equal(E.simulate(c).counts[4].natural, 1);
  c.slots[1].panel += 0.001; assert.equal(E.simulate(c).counts[4].natural, 2);
});
test('Vonwacq changes character first turn but not Aha speed', () => {
  const c = duo(); c.slots[0].vonwacq = true;
  const r = E.simulate(c); approx(r.log.find(x => x.actor === 0 && x.type === 'normal').time, 30); approx(E.snapshot(c).aha, 133.4);
});
test('DDD advances allies but never Aha', () => {
  const c = duo(); c.events = [{ time: 0, type: 'ddd', target: 'all', value: 24 }];
  const r = E.simulate(c); approx(r.log.find(x => x.actor === 4 && x.type === 'normal').time, 10000 / 133.4);
  approx(r.log.find(x => x.actor === 0 && x.type === 'normal').time, 38);
});
test('Yao bonus Aha turn preserves natural Aha gauge', () => {
  const c = duo(); c.events = [{ time: 20, type: 'yao', target: 0, value: 0 }]; const r = E.simulate(c);
  assert.equal(r.counts[4].bonus, 1); approx(r.log.find(x => x.actor === 4 && x.type === 'normal').time, 10000 / 133.4);
});
test('Sparxie E2 bonus on both natural and bonus Aha instants', () => {
  const c = duo(); c.sparxieE2 = true; c.events = [{ time: 20, type: 'yao', target: 0, value: 0 }];
  const r = E.simulate(c); assert.equal(r.counts[1].bonus, 3);
});
test('Pearl four Elation gives 30 percent advance PLUS bonus', () => {
  const c = E.defaults(); c.events = [{ time: 0, type: 'pearl', target: 1, value: 0 }];
  const r = E.simulate(c); assert.equal(r.counts[1].bonus, 1);
  approx(r.log.find(x => x.actor === 1 && x.type === 'normal').time, 35);
});
test('Pearl E2 advances other Elation but not Pearl or Aha', () => {
  const c = E.defaults(); c.pearlE2 = true; c.events = [{ time: 0, type: 'pearl', target: 1, value: 0 }];
  const r = E.simulate(c); approx(r.log.find(x => x.actor === 0 && x.type === 'normal').time, 35);
  approx(r.log.find(x => x.actor === 3 && x.type === 'normal').time, 62.5);
  approx(r.log.find(x => x.actor === 4 && x.type === 'normal').time, 10000 / 151.35);
});
test('speed change preserves progress and recalculates Aha', () => {
  const c = duo(); c.events = [{ time: 20, type: 'pct', target: 0, value: 12 }]; const r = E.simulate(c);
  approx(r.log.find(x => x.actor === 0 && x.type === 'normal').time, 20 + 6000 / 212.12);
  approx(r.log.find(x => x.actor === 4 && x.type === 'normal').time, 20 + (10000 - 133.4 * 20) / 135.824);
});
test('Wave solo direct speed exists only for solo, resets after instant', () => {
  const c = duo(); c.slots = [E.slot('wave', 140), E.slot('huohuo', 160), E.slot('other', 130), E.slot('empty', 0)]; c.soloWaveBonus = 25;
  approx(E.snapshot(c).aha, 133); const r = E.simulate(c); approx(r.finalSpeed[4], 108);
  c.slots[3] = E.slot('pearl', 160); assert.equal(E.snapshot(c).direct, 0);
});
test('invalid duplicate and zero speed inputs report errors', () => {
  const c = duo(); c.slots[1] = E.slot('yao', 0); assert.ok(E.validate(c).length >= 2);
});
test('deterministic equal speed ties', () => { const c = duo(150, 150); const r = E.simulate(c); assert.deepEqual(r.log.filter(x => x.type === 'normal').slice(0, 2).map(x => x.actor), [0, 1]); });
test('event negative speed produces error, not a fake timeline', () => { const c = duo(); c.events = [{ time: 0, type: 'pct', target: 0, value: -1000 }]; assert.ok(E.simulate(c).errors.length); });
test('Amphoreus and Summeretto LC team percentages are additive on base', () => {
  const c = E.defaults(); c.buffs.amphoreus = true; c.buffs.summerLC = 20; c.buffs.yao = true;
  assert.ok(Math.abs(E.snapshot(c).chars[0].speed - 240.4) < 1e-9);
});
test('invalid event target and Wave direct input report validation errors', () => {
  const c = E.defaults(); c.events = [{time:0,type:'bonus',target:99,value:0}];
  assert.ok(E.simulate(c).errors.length); c.events=[]; c.soloWaveBonus=NaN;
  assert.ok(E.simulate(c).errors.length);
});
test('all-target event logs on an occupied slot', () => {
  const c = duo(); c.slots[0]=E.slot('empty',0); c.events=[{time:0,type:'pct',target:'all',value:12}];
  assert.equal(E.simulate(c).log[0].actor, 1);
});
test('inverse minimum includes the entered speed traces', () => {
  const c = E.defaults(); const r = E.solve(c,0,90);
  assert.equal(r.panel,110);
});
test('inline eidolons apply team speed to non-Elation members too', () => {
  const c=E.defaults();c.slots[3]=E.slot('huohuo',160);c.slots[0].eidolon=true;c.slots[3].eidolon=true;
  const snap=E.snapshot(c);approx(snap.aha,155.688);approx(snap.chars[3].speed,183.52);
});
test('Hyacine E2 applies to all eligible party members with an individual opt-out', () => {
  const c=E.defaults();c.slots[3]=E.slot('hyacine',160);c.slots[3].eidolon=true;
  E.snapshot(c).chars.forEach((s,i)=>approx(s.speed,c.slots[i].panel+c.slots[i].base*.3));
  c.slots[0].hyacineEligible=false;approx(E.snapshot(c).chars[0].speed,200);
  c.slots[3].buffActive=false;approx(E.snapshot(c).chars[1].speed,200);
});
test('signature refinement does not double-add town speed but affects conditional speed', () => {
  const c=E.defaults();c.slots[0].signature=true;c.slots[0].refine=5;approx(E.snapshot(c).aha,151.35);
  c.slots[0].mode='build';approx(E.panelSpeed(c.slots[0]),191.36);
  c.slots[0]=E.slot('wave',160);c.slots[0].signature=true;c.slots[0].refine=5;approx(E.snapshot(c).chars[0].speed,202.8);
});
test('Summeretto signature applies to all members; duplicate equipment buffs do not stack', () => {
  const c=E.defaults();c.slots[3]=E.slot('summeretto',160);c.slots[3].signature=true;c.slots[3].refine=5;
  E.snapshot(c).chars.forEach((s,i)=>approx(s.speed,c.slots[i].panel+c.slots[i].base*.4));
  c.slots[0].messenger=c.slots[1].messenger=true;approx(E.snapshot(c).chars[0].speed,252.52);
});
test('Tingyun E1 target and Hanya E2 self speed remain scoped', () => {
  const c=E.defaults();c.slots[3]=E.slot('tingyun',160);c.slots[3].eidolon=true;c.slots[3].buffTarget=1;
  approx(E.snapshot(c).chars[0].speed,200);approx(E.snapshot(c).chars[1].speed,222);
  c.slots[3]=E.slot('hanya',160);c.slots[3].eidolon=true;approx(E.snapshot(c).chars[3].speed,182);
});

function betaParty(){const c=E.rumorConfig(duo());c.slots[1]=E.slot('aeon',160);return c;}
test('legacy options absent or disabled always retain base 80',()=>{
  const c=E.defaults();approx(E.ahaBase(c),80);c.rumor={enabled:false,owned:true};approx(E.snapshot(c).aha,151.35);
});
test('4.6 regression fixture preserves snapshots, inverse, and simulation',()=>{
  const old=require('./engine-4.6.fixture.cjs');
  for(let n=0;n<24;n++){
    const c=E.defaults();c.slots[0].panel=120+n*7;c.slots[1].panel=140+n*3;
    c.slots[0].eidolon=n%2===0;c.slots[2].signature=n%3===0;c.slots[3].vonwacq=n%4===0;
    c.buffs.extraPct=n;c.slots[3].eidolon=true;c.events=[{time:30,type:'pearl',target:1,value:0},{time:60,type:'pct',target:'all',value:12}];
    const current=E.snapshot(c);delete current.base;assert.deepEqual(current,old.snapshot(c));
    assert.deepEqual(E.solve(c,0,160.01),old.solve(c,0,160.01));assert.deepEqual(E.simulate(c),old.simulate(c));
  }
});
test('beta character is rejected in legacy configuration',()=>{
  const c=duo();c.slots[1]=E.slot('aeon',160);assert.ok(E.validate(c).some(x=>x.includes('찌라시')));
});
test('ownership-only beta base uses 94 without adding a fifth party member',()=>{
  const c=E.rumorConfig(duo());approx(E.snapshot(c).aha,147.4);assert.equal(E.snapshot(c).ranked.length,2);
  c.rumor.owned=false;approx(E.snapshot(c).aha,133.4);
});
test('equipped Aha references effective base independent of ownership-only flag',()=>{
  const c=betaParty();c.rumor.owned=false;approx(E.ahaBase(c),94);
  c.slots[1].signature=true;approx(E.ahaBase(c),106);
  for(let r=1;r<=5;r++){c.slots[1].refine=r;approx(E.ahaBase(c),104+2*r);}
});
test('town speed does not add permanent signature, traces or gear twice',()=>{
  const c=betaParty(),s=c.slots[1];s.signature=true;s.gear=99;s.lc=99;s.trace=99;
  approx(E.panelSpeed(s),160);approx(E.snapshot(c).chars[1].speed,160);approx(E.ahaBase(c),106);
});
test('base-SPD increase changes percentage basis exactly once in build mode',()=>{
  const s=E.slot('aeon',160);s.signature=true;s.mode='build';s.gear=6;s.lc=99;
  approx(E.panelSpeed(s),106*1.06+5+25+20);
  s.signature=false;s.lc=0;approx(E.panelSpeed(s),94*1.06+5+25+20);
});
test('team and timed speed buffs use effective base, not town SPD',()=>{
  const c=betaParty();c.slots[1].signature=true;c.slots[0].eidolon=true;
  approx(E.snapshot(c).chars[1].speed,160+106*.12);
  c.events=[{time:1,type:'pct',target:1,value:20}];approx(E.simulate(c).finalSpeed[1],160+106*.32);
});
test('signature changes ranking under the same percentage buff',()=>{
  const c=betaParty();c.slots[0].panel=207;c.slots[1].panel=206.6;c.slots[0].eidolon=true;
  assert.equal(E.snapshot(c).ranked[0].id,'yao');c.slots[1].signature=true;assert.equal(E.snapshot(c).ranked[0].id,'aeon');
});
test('same-party comparison changes only Aha Instant base',()=>{
  const c=betaParty();c.slots[1].signature=true;c.slots[0].eidolon=true;
  const r=E.compareBase(c);assert.deepEqual(r.legacy.chars,r.beta.chars);assert.deepEqual(r.legacy.ranked,r.beta.ranked);
  approx(r.beta.aha-r.legacy.aha,26);approx(r.legacy.base,80);approx(r.beta.base,106);
});
test('inverse uses beta base and returns safe result after rank changes',()=>{
  const c=betaParty();c.slots[1].signature=true;const result=E.solve(c,1,180.01);
  c.slots[1].panel=result.panel;assert.ok(E.snapshot(c).aha>=180.01);c.slots[1].panel-=.01;assert.ok(E.snapshot(c).aha<180.01);
});
test('simulation first natural Aha Instant agrees with snapshot AV',()=>{
  const c=betaParty();c.slots[1].signature=true;approx(E.simulate(c).log.find(l=>l.actor===4&&l.type==='normal').time,E.snapshot(c).av);
});
test('manual beta extra instant retains natural gauge and triggers Sparxie E2 once',()=>{
  const c=E.rumorConfig(duo());c.slots[1].eidolon=true;c.events=[{time:10,type:'ahaBonus',target:'all',value:0}];
  const sim=E.simulate(c);approx(sim.log.find(l=>l.actor===4&&l.type==='normal').time,E.snapshot(c).av);
  assert.equal(sim.log.filter(l=>l.actor===4&&l.type==='bonus').length,1);assert.equal(sim.log.filter(l=>l.actor===1&&l.type==='bonus'&&l.time===10).length,1);
});
test('beta manual gauge event advances Aha Instant only',()=>{
  const c=betaParty();c.events=[{time:0,type:'ahaAdvance',target:'all',value:20}];
  approx(E.simulate(c).log.find(l=>l.actor===4&&l.type==='normal').time,E.snapshot(c).av*.8);
  approx(E.simulate(c).log.find(l=>l.actor===0&&l.type==='normal').time,50);
  c.events[0].value=101;assert.ok(E.validate(c).length);
});
test('legacy mode rejects beta manual event kinds',()=>{
  const c=duo();c.events=[{time:0,type:'ahaBonus',target:'all',value:0}];assert.ok(E.validate(c).some(x=>x.includes('종류')));
});
test('Wave ascension exception is scoped and not the legacy solo rule',()=>{
  const c=betaParty();c.slots[0]=E.slot('wave',160);c.slots[2]=E.slot('huohuo',150);
  assert.equal(E.isSoloWave(c),false);assert.equal(E.canWaveDirect(c),false);
  c.rumor.waveAscension=true;assert.equal(E.canWaveDirect(c),true);approx(E.snapshot(c).chars[2].speed,150+98*.15);
  c.slots[1].eidolon=true;approx(E.snapshot(c).chars[2].speed,150+98*.25);
  c.slots[3]=E.slot('yao',200);assert.equal(E.canWaveDirect(c),false);approx(E.snapshot(c).chars[2].speed,150);
});
test('no automatic technique ultimate resource or extra instant assumption',()=>{
  const c=betaParty();c.slots[1].eidolon=true;assert.equal(E.simulate(c).counts[4].bonus,0);
});
test('beta configuration and public snapshots do not share input state',()=>{
  const original=E.defaults(),copied=E.rumorConfig(original);copied.slots[0].panel=1;copied.events.push({});copied.buffs.extraPct=99;
  assert.equal(original.slots[0].panel,200);assert.equal(original.events.length,0);assert.equal(original.buffs.extraPct,0);
});
test('automatic events ignore stale manual values without changing their results',()=>{
  for(const type of ['yao','pearl','bonus','ahaBonus']){
    const c=type==='ahaBonus'?E.rumorConfig(E.defaults()):E.defaults();
    c.events=[{time:10,type,target:1,value:NaN}];
    assert.deepEqual(E.validate(c),[]);
    const actual=E.simulate(c);assert.deepEqual(actual.errors,[]);
    c.events[0].value=0;assert.deepEqual(actual,E.simulate(c));
  }
});
test('automatic events continue rejecting invalid times',()=>{
  for(const type of ['yao','pearl','bonus','ahaBonus']){
    const c=E.rumorConfig(E.defaults());
    for(const time of [NaN,-1,151,Infinity]){
      c.events=[{time,type,target:1,value:NaN}];assert.ok(E.validate(c).some(x=>x.includes('시간')));
    }
  }
});
test('switching back to manual events keeps missing values invalid',()=>{
  const c=E.rumorConfig(E.defaults()),event={time:10,type:'yao',target:1,value:NaN};c.events=[event];
  assert.deepEqual(E.validate(c),[]);
  for(const type of ['pct','flat','advance','ddd','wave','ahaAdvance']){
    event.type=type;assert.ok(E.validate(c).some(x=>x.includes('시간/수치')));assert.ok(Number.isNaN(event.value));
  }
});
test('missing town speed produces one slot error and recovers in both modes',()=>{
  for(const c of [E.defaults(),E.rumorConfig(E.defaults())]){
    c.slots[0].panel=NaN;assert.deepEqual(E.validate(c),['슬롯 1: 마을 속도를 입력해 주세요.']);
    c.slots[0].panel=200;assert.deepEqual(E.validate(c),[]);assert.ok(E.snapshot(c).aha>0);
  }
});
test('zero or negative town speed differs from other invalid slot fields',()=>{
  const c=E.defaults();
  for(const panel of [0,-1]){c.slots[0].panel=panel;assert.deepEqual(E.validate(c),['슬롯 1: 마을 속도는 0보다 커야 합니다.']);}
  for(const panel of [Infinity,'bad']){c.slots[0].panel=panel;assert.deepEqual(E.validate(c),['슬롯 1: 마을 속도를 올바른 숫자로 입력해 주세요.']);}
  c.slots[0].panel=200;c.slots[0].pct=NaN;assert.deepEqual(E.validate(c),['슬롯 1: 숫자를 올바르게 입력해 주세요.']);
  c.slots[0].pct=-300;assert.deepEqual(E.validate(c),['슬롯 1: 전투 속도는 0보다 커야 합니다.']);
});
test('build mode validates its active fields instead of an unused town input',()=>{
  const c=E.defaults();c.slots[0].panel=NaN;c.slots[0].mode='build';assert.deepEqual(E.validate(c),[]);
  c.slots[0].gear=NaN;assert.deepEqual(E.validate(c),['슬롯 1: 숫자를 올바르게 입력해 주세요.']);
});
console.log(passed+' tests passed.');

