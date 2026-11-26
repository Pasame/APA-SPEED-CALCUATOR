const assert = require('node:assert/strict');
const profiles = require('./site/profiles.json');
const engine = require('./engine.js');

function simulateMilestone(calculation, speed) {
  const cfg = engine.defaults();
  cfg.slots = [engine.slot('custom', speed), ...Array.from({ length: 3 }, () => engine.slot('empty', 0))];
  cfg.horizon = calculation.windowAV || calculation.limitAV;
  cfg.events = [];
  const initial = (calculation.advances || []).filter(advance => advance.afterAction === 0).reduce((sum, advance) => sum + advance.fraction, 0);
  cfg.slots[0].initialAdvance = initial * 100;
  const firstAction = 10000 * (1 - initial) / speed;
  for (const advance of calculation.advances || []) {
    if (!advance.afterAction) continue;
    assert.ok(Number.isInteger(advance.afterAction) && advance.afterAction < calculation.actions, 'the manual ultimate occurs before the last modeled action');
    const previousAdvance = (calculation.advances || [])
      .filter(item => item.afterAction < advance.afterAction)
      .reduce((sum, item) => sum + item.fraction, 0);
    const actionTime = (advance.afterAction - previousAdvance) * 10000 / speed;
    cfg.events.push({ type: 'advance', time: actionTime + 0.000001, target: 0, value: advance.fraction * 100 });
  }
  if (calculation.kind === 'first-action-speed-buff') {
    cfg.events.push({ type: 'flat', time: firstAction + 0.000001, target: 0, value: calculation.buff });
  }
  const result = engine.simulate(cfg);
  assert.deepEqual(result.errors || [], [], 'milestone scenario is a valid existing-engine configuration');
  return result.counts[0].natural;
}

let calculated = 0;
let simulated = 0;
for (const profile of profiles) {
  for (const build of profile.targetBuilds || []) {
    for (const stat of build.targetStats) {
      if (!stat.calculated?.includes('nearFinal')) continue;
      calculated++;
      assert.notEqual(stat.nearFinal, '—');
      assert.match(stat.notes?.nearFinal || '', /자체 (계산|분류|산정)/, `${profile.id}/${build.id}: explain the derived target`);
      assert.ok(build.sources.length, 'derived targets retain sources for their conditions');
      const calculation = stat.calculation;
      if (!calculation) continue;
      if (['natural-actions', 'advanced-actions', 'first-action-speed-buff'].includes(calculation.kind)) {
        simulated++;
        assert.equal(simulateMilestone(calculation, calculation.speed), calculation.actions, `${profile.id}/${build.id} reaches the stated natural actions`);
        if (calculation.kind === 'first-action-speed-buff') {
          assert.equal(calculation.buff, calculation.baseSpeed * calculation.buffRatio);
          assert.equal(simulateMilestone(calculation, calculation.speed - 0.01), calculation.actions - 1, 'one hundredth below the calculated threshold loses the last turn');
          assert.equal(simulateMilestone(calculation, calculation.recommendedSpeed), calculation.actions - 1, 'the recommended build has not already reached the milestone');
        } else {
          const advance = (calculation.advances || []).reduce((sum, item) => sum + item.fraction, 0);
          const boundary = (calculation.actions - advance) * 10000 / calculation.windowAV;
          assert.equal(simulateMilestone(calculation, boundary - 0.01), calculation.actions - 1, 'the stated threshold is an action breakpoint');
        }
      } else if (calculation.kind === 'additive-threshold') {
        assert.equal(calculation.base + calculation.bonus, calculation.total);
        assert.equal(parseFloat(stat.nearFinal), calculation.base);
      } else if (calculation.kind === 'linear-cap') {
        assert.equal(calculation.base + calculation.step * calculation.stacks, calculation.threshold);
        assert.equal(calculation.startingBonus + calculation.stacks, calculation.cap);
        assert.equal(parseFloat(stat.nearFinal), calculation.threshold);
      }
    }
  }
}
assert.ok(calculated > 0 && simulated > 0, 'real researched milestones are covered');
console.log(`PASS ${calculated} explained near-final targets, including ${simulated} independent engine action replays`);
