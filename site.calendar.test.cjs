const assert = require('node:assert/strict');
const fs = require('node:fs');
const { TYPES, DEFAULT_TYPES, stamp, windowFor, visible, compareRows, groupEvents, position, weeksFor, period, renderWeeks, renderRow, renderDetails, mount } = require('./site/calendar.js');
const { calendarSection } = require('./site/calendar.cjs');
const data = require('./site/calendar.json');
const pickups = require('./site/calendar-pickups.json');
const now = stamp('2026-11-28T12:00:00+09:00');
const window = windowFor(now), selected = new Set(['hsr']);
const allTypes = new Set(Object.keys(TYPES));
assert.deepEqual([...allTypes], ['gacha', 'event', 'endgame', 'pass', 'web', 'login', 'claim', 'broadcast', 'update', 'offline']);
assert.deepEqual([...DEFAULT_TYPES], ['gacha', 'event', 'broadcast', 'update']);
const onlineTypes = new Set([...allTypes].filter(type => type !== 'offline'));
assert.equal(window.start, stamp('2026-11-27'), 'the axis starts one day before today');
assert.equal(window.today, stamp('2026-11-28'));
assert.equal(window.end, stamp('2027-01-09'));
assert.equal(windowFor(stamp('2026-11-27T16:00:00Z')).start, window.start, 'KST day, not UTC day');
const weeks = weeksFor(window);
const decemberWeek = weeks.find(week => week.sunday === stamp('2026-12-13'));
assert.equal(decemberWeek.number, 51);
assert.equal(decemberWeek.year, 2026);
assert.equal(decemberWeek.range, '26/12/13(일) ~ 26/12/19(토)');
assert.deepEqual(weeks.slice(-2).map(week => [week.year, week.number]), [[2026, 53], [2027, 1]]);
assert.equal(weeks.at(-2).range, '26/12/27(일) ~ 27/01/02(토)');
assert.equal(weeks[0].left, 0);
assert.equal(weeks.at(-1).left + weeks.at(-1).width, 100);
assert.match(renderWeeks(weeks), /data-calendar-week=.*2026년 W51, 26\/12\/13\(일\) ~ 26\/12\/19\(토\)/);
assert.match(renderWeeks(weeks), /calendar-today-label/);
const versionGames = [{ id: 'hsr', name: '붕괴: 스타레일' }, { id: 'zzz', name: '젠레스 존 제로' }];
const versionTimeline = {
  hsr: [{ start: '2026-11-11', version: '4.7' }, { start: '2026-12-16', version: '4.8', estimated: true }],
  zzz: [{ start: '2026-10-21', version: '3.3' }, { start: '2026-12-20T00:00:00', version: '3.4' }],
};
const versionTransition = renderWeeks([decemberWeek], versionGames, versionTimeline, now);
assert.match(versionTransition, /calendar-week-versions/);
assert.match(versionTransition, /붕괴: 스타레일 : 4\.7 → 4\.8/);
assert.doesNotMatch(versionTransition, /4\.8 \(예상\)/, 'transition week stays concise');
assert.match(versionTransition, /젠레스 존 제로 : 3\.3/);
assert.doesNotMatch(versionTransition, /3\.4/, 'a KST Sunday update begins in the next week');
const followUpWeek = weeks.find(week => week.sunday === stamp('2026-12-20'));
const projected = renderWeeks([followUpWeek], versionGames, versionTimeline, now);
assert.match(projected, /붕괴: 스타레일 : 4\.8 \(예상\)/);
assert.match(projected, /젠레스 존 제로 : 3\.3 → 3\.4/);
const yearEndWeek = weeks.at(-2);
const beforeConfirmedStart = renderWeeks([yearEndWeek], versionGames, versionTimeline, now);
assert.match(beforeConfirmedStart, /젠레스 존 제로 : 3\.4 \(예상\)/);
const afterConfirmedStart = renderWeeks([yearEndWeek], versionGames, versionTimeline, stamp('2026-12-22'));
assert.match(afterConfirmedStart, /젠레스 존 제로 : 3\.4/);
assert.doesNotMatch(afterConfirmedStart, /3\.4 \(예상\)/);
assert.match(afterConfirmedStart, /4\.8 \(예상\)/, 'an elapsed estimate remains tentative until it is confirmed');
assert.doesNotMatch(renderWeeks([decemberWeek], [], versionTimeline, now), /calendar-week-versions/);
const boundedTimeline = { hsr: [{ start: '2026-11-11', end: '2026-12-19T21:00:00+09:00', version: '4.7' }] };
assert.match(renderWeeks([decemberWeek], versionGames, boundedTimeline, now), /4\.7 → 미정/);
const afterUnknownEnd = renderWeeks([followUpWeek], versionGames, boundedTimeline, now);
assert.match(afterUnknownEnd, /붕괴: 스타레일 : 미정/);
assert.doesNotMatch(afterUnknownEnd, /4\.7|미정 \(예상\)/);
const ongoing = { id: 'ongoing', game: 'hsr', type: 'event', title: '행사', start: '2026-11-01', end: '2026-12-02' };
assert.equal(visible(ongoing, window, selected, onlineTypes), true);
assert.equal(position(ongoing, window).left, 0);
assert.equal(position(ongoing, window).before, true);
assert.equal(visible({ ...ongoing, end: '2026-11-28T10:00:00+09:00' }, window, selected, allTypes), false, 'already ended today');
assert.equal(visible({ ...ongoing, end: '2026-11-28T12:00:00+09:00' }, window, selected, allTypes), false, 'end is exclusive');
assert.equal(visible({ ...ongoing, start: '2027-01-09', end: '2027-01-10' }, window, selected, allTypes), false);
assert.equal(visible({ ...ongoing, game: 'zzz' }, window, selected, allTypes), false);
assert.equal(visible(ongoing, window, selected, new Set(['gacha'])), false);
const offline = { ...ongoing, type: 'offline' };
assert.equal(visible(offline, window, new Set(), allTypes), true, 'offline ignores all game switches');
assert.equal(visible(offline, window, selected, onlineTypes), false, 'offline off hides even selected game');
const broadcast = { ...ongoing, type: 'broadcast', instant: true, start: '2026-11-29T21:00:00+09:00', end: null };
assert.equal(visible(broadcast, window, selected, onlineTypes), true);
assert.equal(position(broadcast, window).point, true);
assert.equal(position(broadcast, window).width, 0, 'broadcast is a point, not fabricated duration');
assert.equal(visible({ ...broadcast, start: '2026-11-27' }, window, selected, onlineTypes), false);
assert.equal(visible({ ...broadcast, start: '2026-11-28T11:00:00+09:00' }, window, selected, onlineTypes), false, 'finished timed broadcast');
assert.equal(visible({ ...broadcast, start: '2026-11-28' }, window, selected, onlineTypes), true, 'date-only update stays for its date');
const unknown = { ...ongoing, end: null, endUnknown: true };
assert.equal(visible(unknown, window, selected, onlineTypes), false, 'unknown end does not imply indefinitely ongoing');
assert.equal(visible({ ...unknown, start: '2026-11-27' }, window, selected, onlineTypes), false, 'the extra axis day does not revive past start markers');
assert.equal(position(unknown, window).point, true);
assert.equal(position(unknown, window).width, 0);
assert.match(period(unknown), /종료 미공개/);
const observed = { ...unknown, ongoingAsOf: '2026-11-28' };
assert.ok(visible(observed, window, selected, allTypes));
assert.ok(position(observed, window).width > 0);
assert.equal(visible(observed, windowFor(stamp('2026-11-29')), selected, allTypes), false);
assert.equal(period({ ...ongoing, end: '2026-12-02' }), '11/1 → 12/1');
assert.equal(period({ ...ongoing, end: '2026-12-02T13:00:00+09:00' }), '11/1 → 12/2 12:59');
const categories = ['offline', 'update', 'broadcast', 'claim', 'login', 'web', 'event', 'gacha'];
const tiedRows = categories.map(type => ({ ...ongoing, type }));
tiedRows.push({ ...ongoing, id: 'earlier-end', type: 'offline', end: '2026-11-30' });
tiedRows.push({ ...ongoing, id: 'later-start', type: 'gacha', start: '2026-11-30', end: '2026-12-01' });
tiedRows.sort((a, b) => compareRows(a, b, window));
assert.deepEqual(tiedRows.map(event => event.id === ongoing.id ? event.type : event.id),
  ['earlier-end', 'gacha', 'web', 'event', 'claim', 'login', 'update', 'broadcast', 'offline', 'later-start']);
const games = ['hsr', 'zzz', 'genshin', 'nte', 'wuwa'].map(id => ({ id, name: id, image: `site/assets/games/${id}.jpg` }));
const calendarHTML = calendarSection({ events: [], coverage: [{ note: '검증 설명' }] }, games, String, 'test');
const typeControls = [...calendarHTML.matchAll(/data-calendar-type="([^"]+)" data-kind="[^"]+" aria-pressed="(true|false)"/g)];
assert.deepEqual(typeControls.map(match => match[1]), [...allTypes]);
assert.deepEqual(typeControls.filter(match => match[2] === 'true').map(match => match[1]), [...DEFAULT_TYPES]);
assert.doesNotMatch(calendarHTML, /calendar-sources/);
assert.match(calendarHTML, /id="calendar-tooltip"[^>]*tabindex="-1"/);
const fixture = { ...ongoing, sourceUrl: 'https://example.org/?a=1&b=2', sourceLabel: '공식 공지 상세', notes: '장황한 일정 설명', title: '<img onerror=x>', rewards: [{ name: '성옥', quantity: null }], pickups: [{ name: '아하', image: 'site/assets/test.png' }] };
const row = renderRow(fixture, window, games);
assert.ok(!row.includes('<img onerror'));
assert.ok(!row.includes('×0'));
for (const duration of [fixture, { ...fixture, end: '2027-03-01' }, { ...fixture, instant: true, end: null }]) {
  const bar = renderRow(duration, window, games);
  assert.equal((bar.match(/class="calendar-bar-heading"/g) || []).length, 1);
  assert.equal((bar.match(/class="calendar-bar-meta"/g) || []).length, 1);
  assert.doesNotMatch(bar, /calendar-short-label|is-short/);
}
assert.match(row, /calendar-today/);
assert.match(row, /calendar-banner/);
assert.match(row, /aria-controls="calendar-tooltip"/);
const details = renderDetails(fixture, games);
assert.doesNotMatch(details, /href=|공식 공지 상세|장황한 일정 설명/);
assert.match(details, /11\/1 → 12\/1/);
assert.match(details, /아하/);
assert.match(details, /성옥/);
assert.match(details, /수량 미확인/);
const capped = { ...fixture, rewards: [{ name: '원석', quantity: 800, maximum: true, note: '36별' }] };
assert.match(renderDetails(capped, games), /× 800.*36별/);
assert.match(renderRow(capped, window, games), /× 800/);
assert.doesNotMatch(renderDetails(capped, games), /최대/);
const manyRewards = { ...ongoing, rewards: Array.from({ length: 13 }, (_, i) => ({ name: `보상${i}` })) };
assert.match(renderRow(manyRewards, window, games), /calendar-reward-extra">\+10/);
assert.match(renderDetails(manyRewards, games), /보상12/);
const versionedPickup = {
  ...fixture,
  id: 'warp-aha',
  type: 'gacha',
  title: '아하 워프',
  version: '4.7',
  start: '2026-11-30T12:00:00+09:00',
  end: '2026-12-03',
};
const samePeriodPickup = {
  ...versionedPickup,
  id: 'warp-sparxie',
  title: '스파키 복각',
  start: '2026-11-30T03:00:00Z',
  end: '2026-12-02T15:00:00Z',
  rewards: [{ name: '성옥', quantity: 500, note: '기간 한정' }],
  pickups: [
    { name: '스파키', image: 'site/assets/sparxie.png' },
    { name: '공용 이미지의 다른 픽업 대상', image: 'site/assets/test.png' },
    ...versionedPickup.pickups,
  ],
};
const separateEvents = [
  { ...versionedPickup, id: 'estimated-end', endEstimated: true },
  { ...versionedPickup, id: 'different-end', end: '2026-12-03T00:01:00+09:00' },
  { ...versionedPickup, id: 'different-start', start: '2026-11-30T12:01:00+09:00' },
  { ...versionedPickup, id: 'different-type', type: 'event' },
  { ...versionedPickup, id: 'different-version', version: '4.8' },
  { ...versionedPickup, id: 'different-game', game: 'zzz' },
  { ...versionedPickup, id: 'unverified-version-a', version: undefined },
  { ...versionedPickup, id: 'unverified-version-b', version: undefined },
  { ...versionedPickup, id: 'offline-a', type: 'offline' },
  { ...versionedPickup, id: 'offline-b', type: 'offline' },
  { ...versionedPickup, id: 'unknown-end-a', end: null, endUnknown: true },
  { ...versionedPickup, id: 'unknown-end-b', end: null, endUnknown: true },
  { ...versionedPickup, id: 'instant-a', end: null, instant: true },
  { ...versionedPickup, id: 'instant-b', end: null, instant: true },
];
const groupFixture = [versionedPickup, samePeriodPickup, ...separateEvents];
const [grouped, ...singles] = groupEvents(groupFixture, window.today);
assert.deepEqual(singles, separateEvents, 'only identical known game, version, category, start and end can be grouped');
assert.deepEqual(grouped.members.map(event => event.id), ['warp-aha', 'warp-sparxie']);
assert.equal(stamp(grouped.start), stamp(samePeriodPickup.start), 'offset timestamps normalize to the same start instant');
assert.equal(stamp(grouped.end), stamp(samePeriodPickup.end), 'date-only and explicitly offset exclusive ends group by instant');
assert.equal(grouped.representativeTitle, '아하 · 스파키 픽업');
const groupedRow = renderRow(grouped, window, games);
assert.match(groupedRow, /아하 · 스파키 픽업/);
assert.equal([...groupedRow.matchAll(/src="site\/assets\/test\.png"/g)].length, 1);
assert.equal([...groupedRow.matchAll(/src="site\/assets\/sparxie\.png"/g)].length, 1);
const groupedDetails = renderDetails(grouped, games);
assert.match(groupedDetails, /11\/30 12:00 → 12\/2/);
assert.equal([...groupedDetails.matchAll(/calendar-tooltip-period/g)].length, 1);
assert.equal([...groupedDetails.matchAll(/>아하<\/span>/g)].length, 1);
assert.match(groupedDetails, /공용 이미지의 다른 픽업 대상/);
assert.match(groupedDetails, /스파키 복각/);
assert.doesNotMatch(groupedDetails, /href=|장황한 일정 설명/);
assert.match(groupedDetails, /기간 한정/);
const titleOnlyMembers = [
  { ...versionedPickup, rewards: [] },
  { ...samePeriodPickup, pickups: [], rewards: [] },
];
const titleOnlyDetails = renderDetails(groupEvents(titleOnlyMembers, window.today)[0], games);
assert.match(titleOnlyDetails, /스파키 복각/, 'a member without pickup data keeps its original title');
assert.doesNotMatch(titleOnlyDetails, /아하 워프/, 'a pictured pickup without rewards or location does not repeat its title');
const clippedTogether = [
  { ...versionedPickup, start: '2026-11-02' },
  { ...samePeriodPickup, start: '2026-11-03' },
];
assert.ok(clippedTogether.every(event => position(event, window).left === 0));
const [pastGroup] = groupEvents(clippedTogether, window.today);
assert.deepEqual(pastGroup.members, clippedTogether);
assert.match(period(pastGroup), /종료$/);
for (const event of clippedTogether) assert.ok(renderDetails(pastGroup, games).includes(period(event)));
const todayStart = { ...versionedPickup, start: '2026-11-28T00:00:00+09:00' };
const todayLater = { ...versionedPickup, start: '2026-11-28T01:00:00+09:00' };
assert.equal(groupEvents([...clippedTogether, todayStart, todayLater], window.today).length, 3);
assert.equal(groupEvents([...clippedTogether, todayStart, todayLater], stamp('2026-11-29')).length, 1);
assert.equal(groupEvents([clippedTogether[0], { ...clippedTogether[1], type: 'event' }], window.today).length, 2);
const screenshotIds = ['zzz-33-spooky-funhouse', 'zzz-33-hobbling-crow', 'zzz-33-drifting-art', 'zzz-33-combat-bounty', 'genshin-72-block-smashing'];
const screenshotRows = groupEvents(data.events.filter(event => screenshotIds.includes(event.id)), window.today);
assert.equal(screenshotRows.length, 2);
assert.equal(screenshotRows.find(event => event.game === 'zzz').members.length, 4);
const actualWarps = data.events.filter(event => event.type === 'gacha').map(event => ({ ...event, pickups: pickups[event.id] }));
const actualWarpRows = groupEvents(actualWarps, window.today);
const ahaWarp = actualWarpRows.find(event => event.id === 'hsr-47-aha');
const phaseTwoWarp = actualWarpRows.find(event => event.id === 'hsr-47-phase-2-reruns');
assert.ok(ahaWarp && phaseTwoWarp, 'Aha and phase two reruns must appear as separate rows');
assert.equal(ahaWarp.end, phaseTwoWarp.end);
assert.notEqual(ahaWarp.start, phaseTwoWarp.start);
const severianAndNorma = actualWarpRows.find(event => event.members?.some(member => member.id === 'zzz-33-severian'));
assert.deepEqual(severianAndNorma?.members.map(member => member.id), ['zzz-33-severian', 'zzz-33-norma']);
assert.equal(severianAndNorma.representativeTitle, '세베리안 · 노르마 픽업');
for (const pickup of severianAndNorma.members.flatMap(event => event.pickups)) {
  assert.ok(renderRow(severianAndNorma, window, games).includes(pickup.image), pickup.name);
  assert.ok(renderDetails(severianAndNorma, games).includes(pickup.name), pickup.name);
}
const ids = new Set();
for (const event of data.events) {
  assert.ok(!ids.has(event.id)); ids.add(event.id);
  assert.ok(games.some(g => g.id === event.game));
  assert.ok(TYPES[event.type]);
  assert.ok(Number.isFinite(stamp(event.start)));
  assert.ok(event.end ? stamp(event.end) > stamp(event.start) : event.instant || event.endUnknown, event.id);
  assert.match(event.sourceUrl, /^https:\/\//);
  if (event.type === 'offline') assert.ok(event.location, event.id);
  for (const reward of event.rewards) {
    assert.ok(reward.quantity == null || Number.isFinite(reward.quantity) && reward.quantity > 0);
    if (reward.image) { assert.match(reward.image, /^site\/assets\//); assert.ok(fs.existsSync(reward.image)); }
  }
}
assert.equal(ids.size, data.events.length);
assert.deepEqual(new Set(data.events.filter(e => e.type === 'pass').map(e => e.game)), new Set(games.map(g => g.id)));
const zzzUpdate = data.events.find(e => e.id === 'zzz-version-34-launch');
assert.ok(position(zzzUpdate, window).width > 0);
assert.match(period(zzzUpdate), /12\/2 → 1\/13 \(예상\)/);
assert.equal(data.versionTimeline.zzz.find(v => v.version === '3.4').end, zzzUpdate.end);
assert.ok(stamp(data.events.find(e => e.id === 'zzz-34-kafka').end) > stamp(zzzUpdate.end));
for (const [id, featured] of Object.entries(pickups)) {
  assert.equal(data.events.find(event => event.id === id)?.type, 'gacha', id);
  for (const pickup of featured) {
    assert.ok(pickup.name, id);
    if (pickup.image) {
      assert.match(pickup.image, /^site\/assets\//);
      assert.doesNotMatch(pickup.image, /\/games\//, 'a game logo cannot identify a featured item');
      assert.ok(fs.existsSync(pickup.image), pickup.image);
    }
  }
}
// Exercise actual control handlers, including repeated game switches and independent offline state.
function control(dataset = {}) {
  return {
    dataset, attrs: { 'aria-pressed': 'true' }, events: {}, style: { setProperty() {} },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(k, v) { this.events[k] = v; },
    contains() { return false; },
    querySelectorAll() { return []; },
    matches() { return false; },
  };
}
const buttons = games.map(g => control({ calendarGame: g.id }));
const typeButtons = [...allTypes].map(type => {
  const button = control({ calendarType: type });
  button.setAttribute('aria-pressed', String(DEFAULT_TYPES.has(type)));
  return button;
});
const nodes = Object.fromEntries(['rows', 'axis', 'range', 'count', 'empty', 'checked', 'tooltip'].map(id => [`[data-calendar-${id}]`, control()]));
nodes['.calendar-scroll'] = control();
const bounds = { left: 0, top: 0, right: 800, bottom: 560, width: 800, height: 560 };
nodes['.calendar-scroll'].getBoundingClientRect = () => bounds;
const tooltip = nodes['[data-calendar-tooltip]'];
tooltip.getBoundingClientRect = () => ({ width: 320, height: 250 });
const trigger = control({ calendarEvent: 'ongoing' });
trigger.closest = () => trigger;
trigger.getBoundingClientRect = () => ({ left: 40, right: 100, top: 140, bottom: 185 });
const documentStub = control();
trigger.focus = () => { documentStub.activeElement = trigger; };
tooltip.focus = () => { documentStub.activeElement = tooltip; };
tooltip.contains = node => node === tooltip;
const section = {
  querySelectorAll(s) { return s === '[data-calendar-game]' ? buttons : typeButtons; },
  querySelector(s) { return nodes[s]; },
};
const oldFocus = globalThis.addEventListener;
globalThis.addEventListener = () => {};
globalThis.document = documentStub;
globalThis.innerWidth = 800;
globalThis.innerHeight = 600;
const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const testEvents = [...allTypes].map(type => ({
  ...unknown,
  id: type === 'event' ? unknown.id : `${type}-row`,
  type,
  start: today,
  ...(type === 'event' ? { pickups: fixture.pickups, rewards: fixture.rewards } : {}),
}));
const activeTimeline = { hsr: [{ start: '2020-01-01', version: '4.7' }], zzz: [{ start: '2020-01-01', version: '3.3' }] };
const mounted = mount(section, { checkedAt: today, games, events: testEvents, versionTimeline: activeTimeline });
const rowsNode = nodes['[data-calendar-rows]'];
const axisNode = nodes['[data-calendar-axis]'];
const initialAxis = axisNode.innerHTML;
assert.match(initialAxis, /hsr : 4\.7/);
assert.match(initialAxis, /zzz : 3\.3/);
for (const event of testEvents) {
  assert.equal(rowsNode.innerHTML.includes(`data-calendar-row="${event.id}"`), DEFAULT_TYPES.has(event.type));
}
typeButtons.filter(button => !DEFAULT_TYPES.has(button.dataset.calendarType)).forEach(button => button.events.click());
const initialHTML = rowsNode.innerHTML;
let replacements = 0;
Object.defineProperty(rowsNode, 'innerHTML', { get() { return this.html ?? initialHTML; }, set(value) { replacements++; this.html = value; } });
mounted.render();
assert.equal(replacements, 0, 'focus refresh must preserve open disclosures and keyboard focus');
const rowEvents = rowsNode.events;
rowEvents.pointerover({ target: trigger, pointerType: 'mouse', relatedTarget: null });
assert.equal(tooltip.hidden, false, 'hover reveals details');
assert.match(tooltip.innerHTML, /종료 미공개/);
assert.match(tooltip.innerHTML, /아하/);
assert.match(tooltip.innerHTML, /성옥/);
const weekButton = control({ calendarWeek: 'test-week' });
weekButton.setAttribute('aria-expanded', 'false');
weekButton.closest = () => weekButton;
weekButton.getBoundingClientRect = () => ({ left: 745, right: 790, top: 10, bottom: 50 });
const weekPopup = control();
const weekPlacement = {};
weekPopup.getBoundingClientRect = () => ({ width: 250, height: 180 });
weekPopup.style.setProperty = (property, value) => { weekPlacement[property] = value; };
weekButton.querySelector = () => weekPopup;
axisNode.querySelectorAll = () => weekButton.getAttribute('aria-expanded') === 'true' ? [weekButton] : [];
axisNode.events.click({ target: weekButton });
assert.equal(tooltip.hidden, true, 'opening a week closes the event details');
assert.equal(weekButton.getAttribute('aria-expanded'), 'true');
assert.equal(weekPlacement['--week-popup-x'], '542px', 'the week popup is clamped to the viewport');
rowEvents.pointerover({ target: trigger, pointerType: 'mouse', relatedTarget: null });
assert.equal(weekButton.getAttribute('aria-expanded'), 'false', 'opening an event closes the week details');
assert.equal(tooltip.hidden, false);
documentStub.events.keydown({ key: 'Escape' });
assert.equal(tooltip.hidden, true);
rowEvents.click({ target: trigger, detail: 1 });
assert.equal(tooltip.hidden, false, 'tap reveals the same details');
rowEvents.click({ target: trigger, detail: 1 });
assert.equal(tooltip.hidden, true, 'the same tap target can close its details');
rowEvents.focusout({ target: trigger, relatedTarget: null });
trigger.focus();
rowEvents.focusin({ target: trigger });
assert.equal(tooltip.hidden, false, 'keyboard focus reveals details');
rowEvents.click({ target: trigger, detail: 0 });
assert.equal(documentStub.activeElement, tooltip, 'keyboard activation focuses the details');
documentStub.events.keydown({ key: 'Escape' });
assert.equal(tooltip.hidden, true);
assert.equal(documentStub.activeElement, trigger, 'Escape restores focus from the details');
documentStub.activeElement = null;
for (const button of typeButtons) {
  const type = button.dataset.calendarType;
  button.events.click();
  for (const event of testEvents) {
    assert.equal(rowsNode.innerHTML.includes(`data-calendar-row="${event.id}"`), event.type !== type, `${type} only filters its own rows`);
  }
  button.events.click();
  assert.equal(rowsNode.innerHTML, initialHTML, `${type} can be restored independently`);
  assert.equal(axisNode.innerHTML, initialAxis, 'categories do not change game version lines');
}
buttons.forEach(b => b.events.click());
assert.doesNotMatch(axisNode.innerHTML, /calendar-week-versions/, 'no selected games leaves only the dates');
assert.deepEqual([...rowsNode.innerHTML.matchAll(/data-calendar-row="([^"]+)"/g)].map(match => match[1]), ['offline-row']);
const offlineButton = typeButtons.find(button => button.dataset.calendarType === 'offline');
offlineButton.events.click();
assert.equal(rowsNode.innerHTML, '');
assert.equal(nodes['[data-calendar-empty]'].hidden, false);
buttons[0].events.click();
assert.match(axisNode.innerHTML, /hsr : 4\.7/);
assert.doesNotMatch(axisNode.innerHTML, /zzz : 3\.3/);
assert.equal(nodes['[data-calendar-empty]'].hidden, true);
assert.equal(offlineButton.getAttribute('aria-pressed'), 'false');
typeButtons.filter(button => button !== offlineButton).forEach(button => button.events.click());
assert.equal(nodes['[data-calendar-empty]'].hidden, false);
assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
assert.equal(offlineButton.getAttribute('aria-pressed'), 'false');
globalThis.addEventListener = oldFocus;
delete globalThis.document;
delete globalThis.innerWidth;
delete globalThis.innerHeight;

const builtHome = fs.readFileSync('index.html', 'utf8');
const embeddedMatch = builtHome.match(/<script type="application\/json" id="game-calendar-data">([\s\S]*?)<\/script>/);
assert.ok(embeddedMatch, 'built index.html embeds compact calendar data');
const embeddedCalendar = JSON.parse(embeddedMatch[1]);
assert.equal('coverage' in embeddedCalendar, false, 'embedded calendar omits maintenance coverage metadata');
assert.ok(embeddedCalendar.versionTimeline && Object.keys(embeddedCalendar.versionTimeline).length >= 5, 'embedded calendar preserves versionTimeline');
assert.equal(embeddedCalendar.events.length, data.events.length);
const sourcePass = data.events.find(event => event.purchaseEnd && event.webPurchaseEnd);
assert.ok(sourcePass, 'source calendar has a pass with purchaseEnd and webPurchaseEnd');
const embeddedPass = embeddedCalendar.events.find(event => event.id === sourcePass.id);
assert.equal(embeddedPass.purchaseEnd, sourcePass.purchaseEnd, 'embedded calendar preserves purchaseEnd');
assert.equal(embeddedPass.webPurchaseEnd, sourcePass.webPurchaseEnd, 'embedded calendar preserves webPurchaseEnd');
assert.match(renderDetails(embeddedPass, games), /구매 마감.*웹 구매/, 'pass purchase deadlines still render from embedded data');
assert.ok(embeddedCalendar.events.every(event => !('verificationUrls' in event) && !('sourceUrl' in event)), 'embedded calendar strips verification provenance URLs');
assert.ok(embeddedCalendar.events.every(event => (event.rewards || []).every(reward => !('imageUrl' in reward) && !('verificationUrls' in reward))), 'embedded rewards strip remote image and verification URLs');

console.log(`PASS calendar: ${ids.size} source-backed events, KST and week-year boundaries, ordering, independent filters, details and assets`);
