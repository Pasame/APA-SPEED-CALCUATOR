const assert = require('node:assert/strict');
const fs = require('node:fs');
const { TYPES, stamp, windowFor, visible, compareRows, position, weeksFor, period, renderWeeks, renderRow, renderDetails, mount } = require('./site/calendar.js');
const data = require('./site/calendar.json');
const pickups = require('./site/calendar-pickups.json');
const now = stamp('2026-11-28T12:00:00+09:00');
const window = windowFor(now), selected = new Set(['hsr']);
const allTypes = new Set(Object.keys(TYPES));
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
assert.equal(period({ ...ongoing, end: '2026-12-02' }), '11/1 → 12/1');
assert.equal(period({ ...ongoing, end: '2026-12-02T13:00:00+09:00' }), '11/1 → 12/2 12:59');
const categories = ['offline', 'update', 'broadcast', 'login', 'event', 'gacha'];
const tiedRows = categories.map(type => ({ ...ongoing, type }));
tiedRows.push({ ...ongoing, id: 'earlier-end', type: 'offline', end: '2026-11-30' });
tiedRows.push({ ...ongoing, id: 'later-start', type: 'gacha', start: '2026-11-30', end: '2026-12-01' });
tiedRows.sort((a, b) => compareRows(a, b, window));
assert.deepEqual(tiedRows.map(event => event.id === ongoing.id ? event.type : event.id),
  ['earlier-end', 'gacha', 'event', 'login', 'update', 'broadcast', 'offline', 'later-start']);
const games = ['hsr', 'zzz', 'genshin', 'nte', 'wuwa'].map(id => ({ id, name: id, image: `site/assets/games/${id}.jpg` }));
const fixture = { ...ongoing, sourceUrl: 'https://example.org/?a=1&b=2', title: '<img onerror=x>', rewards: [{ name: '성옥', quantity: null }], pickups: [{ name: '아하', image: 'site/assets/test.png' }] };
const row = renderRow(fixture, window, games);
assert.ok(!row.includes('<img onerror'));
assert.ok(!row.includes('×0'));
assert.match(row, /calendar-short-label/);
assert.match(row, /calendar-today/);
assert.match(row, /calendar-banner/);
assert.match(row, /aria-controls="calendar-tooltip"/);
const details = renderDetails(fixture, games);
assert.ok(details.includes('&amp;b=2'));
assert.match(details, /11\/1 → 12\/1/);
assert.match(details, /아하/);
assert.match(details, /성옥/);
const manyRewards = { ...ongoing, rewards: Array.from({ length: 13 }, (_, i) => ({ name: `보상${i}` })) };
assert.match(renderRow(manyRewards, window, games), /calendar-reward-extra">\+10/);
assert.match(renderDetails(manyRewards, games), /보상12/);
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
for (const [id, featured] of Object.entries(pickups)) {
  assert.equal(data.events.find(event => event.id === id)?.type, 'gacha', id);
  for (const pickup of featured) {
    assert.ok(pickup.name, id);
    if (pickup.image) {
      assert.match(pickup.image, /^site\/assets\//);
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
const typeButtons = [...allTypes].map(type => control({ calendarType: type }));
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
const sourceLink = { focus() { documentStub.activeElement = sourceLink; } };
tooltip.contains = node => node === sourceLink;
tooltip.querySelector = () => sourceLink;
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
const mounted = mount(section, { checkedAt: today, games, events: [{ ...unknown, start: today, pickups: fixture.pickups, rewards: fixture.rewards }, { ...unknown, id: 'offline-row', start: today, type: 'offline' }] });
const initialHTML = nodes['[data-calendar-rows]'].innerHTML;
let replacements = 0;
Object.defineProperty(nodes['[data-calendar-rows]'], 'innerHTML', { get() { return this.html ?? initialHTML; }, set(value) { replacements++; this.html = value; } });
mounted.render();
assert.equal(replacements, 0, 'focus refresh must preserve open disclosures and keyboard focus');
const rowEvents = nodes['[data-calendar-rows]'].events;
rowEvents.pointerover({ target: trigger, pointerType: 'mouse', relatedTarget: null });
assert.equal(tooltip.hidden, false, 'hover reveals details');
assert.match(tooltip.innerHTML, /종료 미공개/);
assert.match(tooltip.innerHTML, /아하/);
assert.match(tooltip.innerHTML, /성옥/);
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
assert.equal(documentStub.activeElement, sourceLink, 'keyboard activation reaches the source link');
documentStub.events.keydown({ key: 'Escape' });
assert.equal(tooltip.hidden, true);
assert.equal(documentStub.activeElement, trigger, 'Escape restores focus from the source link');
documentStub.activeElement = null;
buttons.forEach(b => b.events.click());
assert.ok(!nodes['[data-calendar-rows]'].innerHTML.includes('data-calendar-row="ongoing"'));
assert.ok(nodes['[data-calendar-rows]'].innerHTML.includes('offline-row'));
const offlineButton = typeButtons.find(button => button.dataset.calendarType === 'offline');
offlineButton.events.click();
assert.equal(nodes['[data-calendar-rows]'].innerHTML, '');
assert.equal(nodes['[data-calendar-empty]'].hidden, false);
buttons[0].events.click();
assert.equal(nodes['[data-calendar-empty]'].hidden, true);
assert.equal(offlineButton.getAttribute('aria-pressed'), 'false');
const eventButton = typeButtons.find(button => button.dataset.calendarType === 'event');
eventButton.events.click();
assert.equal(nodes['[data-calendar-empty]'].hidden, false);
assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
assert.equal(offlineButton.getAttribute('aria-pressed'), 'false');
globalThis.addEventListener = oldFocus;
delete globalThis.document;
delete globalThis.innerWidth;
delete globalThis.innerHeight;
console.log(`PASS calendar: ${ids.size} source-backed events, KST and week-year boundaries, ordering, independent filters, details and assets`);
