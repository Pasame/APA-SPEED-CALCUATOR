const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const repo = __dirname;
const script = readFileSync(join(repo, 'site/app.js'), 'utf8');
const { dates } = require(join(repo, 'site/hsr-release-order.json'));
const { characters } = require(join(repo, 'site/hsr-roster.json'));

assert.deepEqual(Object.keys(dates).sort(), characters.map(character => character.id).sort());
for (const date of Object.values(dates)) {
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(date).toISOString().slice(0, 10), date);
}
assert.deepEqual(['8002', '8004', '8006', '8008', '8010'].map(id => dates[id]), [
  '2023-04-26', '2023-04-26', '2024-05-08', '2025-01-15', '2026-04-22',
]);

function control(dataset = {}) {
  const attributes = {};
  const events = {};
  return {
    dataset, attributes, events, value: '',
    setAttribute(name, value) { attributes[name] = value; },
    addEventListener(name, callback) { events[name] = callback; },
    focus() { this.focused = true; },
  };
}

function runPage({ query, hash = '', catalog = null, groups = [] }) {
  const location = { pathname: '/example/index.html', search: query, hash };
  const events = {};
  let currentUrl;
  runInNewContext(script, {
    URLSearchParams,
    location,
    history: {
      replaceState(_state, _title, value) {
        currentUrl = new URL(value, 'https://example.com');
        location.search = currentUrl.search;
        location.hash = currentUrl.hash;
      },
    },
    window: { addEventListener(name, callback) { events[name] = callback; } },
    document: {
      querySelector(selector) { return selector === '[data-game-catalog]' ? catalog : null; },
      querySelectorAll(selector) { return selector === '[data-choice-group]' ? groups : []; },
    },
  });
  return {
    url: () => currentUrl,
    navigate(search) {
      location.search = search;
      events.popstate();
    },
  };
}

const fixtures = [
  ['1511', '에이언즈★아하', 'quantum', 'elation'],
  ['1503', '펄', 'ice', 'elation'],
  ['1508', '토오사카 린', 'quantum', 'erudition'],
  ['1222', '영사', 'fire', 'abundance'],
  ['1301', '갤러거', 'fire', 'abundance'],
  ['1202', '정운', 'lightning', 'harmony'],
  ['1003', '히메코', 'fire', 'erudition'],
];
const tiles = fixtures.map(([id, name, element, path]) => (
  control({name, search: name, element, path, releaseDate: dates[id]})
));
const sort = control();
const search = control();
const clear = control();
const resultCount = {};
const empty = {};
const fire = control({ characterElement: 'fire' });
const abundance = control({ characterPath: 'abundance' });
let order = tiles;
const fields = {
  '[data-character-grid]': { append(...sorted) { order = sorted; } },
  '[data-character-sort]': sort,
  '[data-character-query]': search,
  '[data-character-clear]': clear,
  '[data-character-count]': resultCount,
  '[data-character-empty]': empty,
};
const fieldLists = {
  '[data-character]': tiles,
  '[data-character-element]': [fire],
  '[data-character-path]': [abundance],
};
const catalog = {
  dataset: { defaultKind: 'character' },
  querySelector(selector) { return fields[selector]; },
  querySelectorAll(selector) { return fieldLists[selector] || []; },
};
const page = runPage({catalog, query: '?sort=release-asc&element=fire&path=abundance'});
const visibleNames = () => order.filter(tile => !tile.hidden).map(tile => tile.dataset.name);
const selectSort = value => {
  sort.value = value;
  sort.events.change();
};
assert.equal(sort.value, 'release-asc');
assert.deepEqual(visibleNames(), ['갤러거', '영사']);
selectSort('name-desc');
assert.deepEqual(visibleNames(), ['영사', '갤러거']);
assert.equal(page.url().searchParams.get('sort'), 'name-desc');
assert.equal(page.url().searchParams.get('element'), 'fire');
assert.equal(page.url().searchParams.get('path'), 'abundance');
search.value = '갤';
search.events.input();
assert.deepEqual(visibleNames(), ['갤러거']);
assert.equal(resultCount.textContent, '1명');
assert.equal(page.url().searchParams.get('q'), '갤');
search.value = '정운';
search.events.input();
assert.deepEqual(visibleNames(), []);
assert.equal(empty.hidden, false);
clear.events.click();
assert.equal(search.focused, true);
assert.equal(sort.value, 'name-desc');
assert.deepEqual(visibleNames(), ['히메코', '펄', '토오사카 린', '정운', '영사', '에이언즈★아하', '갤러거']);
selectSort('name-asc');
assert.deepEqual(visibleNames(), ['갤러거', '에이언즈★아하', '영사', '정운', '토오사카 린', '펄', '히메코']);
page.navigate('?sort=release-asc');
assert.deepEqual(visibleNames(), ['정운', '히메코', '갤러거', '영사', '토오사카 린', '펄', '에이언즈★아하']);
page.navigate('?sort=invalid');
assert.equal(sort.value, 'release-desc');
assert.deepEqual(visibleNames(), fixtures.map(([, name]) => name));

function choiceGroup(ids, dataset = {}) {
  const buttons = ids.map(choice => control({ choice }));
  const panels = ids.map(id => ({ id }));
  return {
    dataset, buttons, panels,
    querySelectorAll(selector) { return selector === '[data-choice]' ? buttons : panels; },
  };
}
const parties = choiceGroup([
  'party-hsr-evanescia-elation', 'party-hsr-silver-wolf-lv-999-team',
  'party-hsr-sparxie-team', 'party-hsr-aventurine-waveflair-elation',
], { partyGroup: '' });
const equipment = choiceGroup(['cone-1', 'cone-2']);
const partyPage = runPage({
  groups: [equipment, parties],
  query: '?source=guide&party=hsr-silver-wolf-lv-999-team',
  hash: '#teams',
});
assert.equal(parties.buttons[1].attributes['aria-pressed'], 'true');
assert.deepEqual(parties.panels.map(panel => panel.hidden), [true, false, true, true]);
equipment.buttons[1].events.click();
assert.deepEqual(equipment.panels.map(panel => panel.hidden), [true, false]);
assert.equal(partyPage.url(), undefined, 'equipment selection leaves the party URL alone');
parties.buttons[3].events.click();
assert.equal(partyPage.url().searchParams.get('party'), 'hsr-aventurine-waveflair-elation');
assert.equal(partyPage.url().searchParams.get('source'), 'guide');
assert.equal(partyPage.url().hash, '#teams');
assert.deepEqual(parties.panels.map(panel => panel.hidden), [true, true, true, false]);
assert.deepEqual(equipment.panels.map(panel => panel.hidden), [true, false]);
partyPage.navigate('?party=hsr-sparxie-team');
assert.deepEqual(parties.panels.map(panel => panel.hidden), [true, true, false, true]);
partyPage.navigate('?party=unknown');
assert.deepEqual(parties.panels.map(panel => panel.hidden), [false, true, true, true]);

console.log('PASS 94 release dates, four character sort options, intersecting filters, and party choice URL behavior');
