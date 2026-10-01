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
console.log(`${passed} tests passed.`);
