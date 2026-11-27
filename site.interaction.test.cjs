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
    getAttribute(name) { return attributes[name] ?? null; },
    removeAttribute(name) { delete attributes[name]; },
    closest() { return null; },
    addEventListener(name, callback) { events[name] = callback; },
    focus() { this.focused = true; },
  };
}

function runPage({ query, hash = '', catalog = null, searchCatalog = null, groups = [], buildButtons = [], buildPanels = [], statNotes = [], previews = [] }) {
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
      addEventListener() {},
      createElement() { return { children: [], append(...children) { this.children.push(...children); } }; },
      querySelector(selector) {
        if (selector === '[data-game-catalog]') return catalog;
        if (selector === '[data-catalog]') return searchCatalog;
        return null;
      },
      querySelectorAll(selector) {
        if (selector === '[data-choice-group]') return groups;
        if (selector === '[data-build-choice]') return buildButtons;
        if (selector === '[data-build-panel]') return buildPanels;
        if (selector === '[data-stat-note]') return statNotes;
        if (selector === '[data-party-preview]') return previews;
        return [];
      },
    },
  });
  return {
    url: () => currentUrl,
    navigate(search) {
      location.search = search;
      location.hash = '';
      events.popstate();
    },
    followHash(hash) {
      location.hash = hash;
      events.hashchange();
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

const buildButtons = ['slow', 'fast', 'slow', 'fast'].map(buildChoice => control({ buildChoice }));
const buildPanels = ['slow', 'fast', 'slow', 'fast'].map(buildPanel => ({ dataset: { buildPanel } }));
const independentCones = choiceGroup(['cone-0', 'cone-1']);
const buildNote = control();
const buildPage = runPage({ query: '?source=guide&build=fast', hash: '#targets', buildButtons, buildPanels, groups: [independentCones], statNotes: [buildNote] });
assert.deepEqual(buildPanels.map(panel => panel.hidden), [true, false, true, false], 'equipment and stat panels restore the same build');
assert.deepEqual(buildButtons.map(button => button.attributes['aria-pressed']), ['false', 'true', 'false', 'true']);
independentCones.buttons[1].events.click();
buildButtons[2].events.click();
assert.deepEqual(buildPanels.map(panel => panel.hidden), [false, true, false, true], 'either selector updates both sections');
assert.equal(buildPage.url().searchParams.get('build'), 'slow');
assert.equal(buildPage.url().searchParams.get('source'), 'guide');
assert.deepEqual(independentCones.panels.map(panel => panel.hidden), [true, false], 'build selection does not overwrite light cone choices');
buildPage.followHash('#build-fast-stat-note-1');
assert.deepEqual(buildPanels.map(panel => panel.hidden), [true, false, true, false], 'linked footnotes reveal the matching build');
buildNote.dataset.active = 'true';
buildPage.followHash('#build-fast-stat-ref-1');
assert.equal(buildNote.dataset.active, 'true', 'returning to the same build preserves the focused tooltip');
buildButtons[0].events.click();
assert.equal(buildNote.dataset.active, undefined, 'switching builds closes the old tooltip');
assert.equal(buildPage.url().hash, '#targets', 'switching builds cannot leave a hidden footnote as the hash target');
buildPage.navigate('?build=unknown');
assert.deepEqual(buildPanels.map(panel => panel.hidden), [false, true, false, true], 'unknown builds fall back safely');
console.log('PASS build selectors synchronize equipment and stats, preserve cones, and restore linked footnotes');

const partyQuery = control();
const partyClear = control();
const partyCount = {};
const partyEmpty = {};
const partyTiles = [
  control({ party: 'dot', partySearch: '히실렌스 카프카 블랙 스완 곽향' }),
  control({ party: 'elation', partySearch: '환락 하이퍼캐리 에바네시아 은랑 LV.999 스파키 웨이브 효광 아하 펄', partyVariants: JSON.stringify([
    { search: '환락 하이퍼캐리 에바네시아 효광 아하 펄', href: '/party?party=eva' },
    { search: '환락 하이퍼캐리 스파키 효광 아하 펄', href: '/party?party=sparxie' },
  ]) }),
];
const partyCategories = ['dot', 'elation'].map(category => control({ category }));
const partyCatalog = {
  dataset: { defaultKind: 'party' },
  querySelector(selector) { return ({ '[data-party-query]': partyQuery, '[data-party-clear]': partyClear, '[data-party-count]': partyCount, '[data-party-empty]': partyEmpty })[selector]; },
  querySelectorAll(selector) { return ({ '[data-view]': [control({ view: 'party' })], '[data-category]': partyCategories, '[data-party]': partyTiles })[selector] || []; },
};
const searchPartyPage = runPage({ catalog: partyCatalog, query: '?view=party&category=elation&pq=효광%20펄' });
assert.deepEqual(partyTiles.map(tile => tile.hidden), [true, false], 'party name and multiple member terms combine with category');
partyQuery.value = '곽향';
partyQuery.events.input();
assert.equal(partyEmpty.hidden, false);
partyCategories[0].events.click();
assert.deepEqual(partyTiles.map(tile => tile.hidden), [false, true]);
assert.equal(searchPartyPage.url().searchParams.get('pq'), '곽향');
partyClear.events.click();
assert.equal(partyQuery.value, '');
assert.equal(partyQuery.focused, true);
assert.equal(partyCount.textContent, '1개 파티');
partyCategories[1].events.click();
partyQuery.value = '에바네시아 스파키';
partyQuery.events.input();
assert.equal(partyEmpty.hidden, false, 'grouped dealers do not create a nonexistent combined party');
partyQuery.value = '스파키';
partyQuery.events.input();
assert.equal(partyTiles[1].getAttribute('href'), '/party?party=sparxie', 'matching grouped dealer opens directly');
console.log('PASS party search restores its URL and combines member names with category without changing sort order');

function previewFixture(data) {
  const buttons = [];
  const slots = data.members.map(member => {
    const candidates = data.alternatives.filter(item => item.replaces === member.id);
    const cards = [member, ...candidates].map(item => ({ dataset: { memberPreview: item.id }, hidden: item.id !== member.id }));
    for (const candidate of [member, ...candidates]) buttons.push(control({ slot: member.id, partyOption: candidate.id }));
    return { dataset: { memberId: member.id }, cards, querySelectorAll() { return cards; } };
  });
  const operations = { children: [], replaceChildren() { this.children = []; }, append(child) { this.children.push(child); } };
  const fields = {
    '[data-preview-data]': { textContent: JSON.stringify(data) },
    '[data-preview-status]': control(), '[data-party-reset]': control(),
    '[data-preview-operation]': { querySelector: () => operations },
    '[data-base-note]': {}, '[data-base-operation]': {}, '[data-operation-heading]': {}, '[data-base-summary]': {}, '[data-preview-scope]': {},
    '.roster-member:not([hidden]) a': control(),
  };
  return {
    fields, slots, buttons, operations,
    querySelector(selector) { return fields[selector]; },
    querySelectorAll(selector) { return selector === '[data-member-id]' ? slots : buttons; },
    pick(slot, id) { buttons.find(button => button.dataset.slot === slot && button.dataset.partyOption === id).events.click(); },
    selected() { return slots.map(slot => slot.cards.find(card => !card.hidden).dataset.memberPreview); },
  };
}
const partyData = require('./site/content.json').find(doc => doc.id === 'hsr-evanescia-elation').party;
const preview = previewFixture(partyData);
const otherPreview = previewFixture(partyData);
runPage({ query: '', previews: [preview, otherPreview] });
preview.pick('1502', '8010');
assert.deepEqual(preview.selected(), ['1505', '8010', '1511', '1503']);
assert.equal(preview.fields['[data-base-operation]'].hidden, true, 'original rotation does not describe a replaced character');
assert.match(preview.operations.children[0].children[1].textContent, /효광의 추가 아하 타임/);
preview.pick('1511', '8010');
assert.deepEqual(preview.selected(), ['1505', '8010', '1511', '1503'], 'duplicate characters are rejected');
assert.match(preview.fields['[data-preview-status]'].textContent, /이미/);
preview.pick('1503', '1415');
assert.equal(preview.operations.children.length, 2);
assert.match(preview.fields['[data-preview-scope]'].textContent, /조합 전체의 운영은 미검증/);
assert.equal(preview.fields['[data-base-summary]'].hidden, true, 'original party summary is not presented as the changed setup');
assert.match(preview.operations.children[1].children[1].textContent, /생존 없는 단기전/);
assert.deepEqual(otherPreview.selected(), partyData.members.map(member => member.id), 'dealer variants own independent preview choices');
preview.fields['[data-party-reset]'].events.click();
assert.deepEqual(preview.selected(), partyData.members.map(member => member.id));
assert.equal(preview.fields['[data-base-operation]'].hidden, false);

const trailblazerData = structuredClone(partyData);
trailblazerData.alternatives.push({ id: '8008', replaces: '1511', name: '개척자(기억)', reason: '테스트용 다른 운명' });
trailblazerData.alternatives.push({ id: '1004', replaces: '1505', name: '웰트', reason: '테스트용 메인 교체' });
const restrictedPreview = previewFixture(trailblazerData);
runPage({ query: '', previews: [restrictedPreview] });
restrictedPreview.pick('1502', '8010');
restrictedPreview.pick('1511', '8008');
assert.match(restrictedPreview.fields['[data-preview-status]'].textContent, /개척자는 한 명/);
restrictedPreview.pick('1505', '1004');
assert.equal(restrictedPreview.selected()[0], '1505', 'core damage dealers remain fixed even for an invalid option');
console.log('PASS replacement previews update four-member portraits and conditions, prevent duplicates, isolate variants and reset');

// P2-2: Korean Chosung search across character, party (multi-word same formation), and global search.
search.value = 'ㄱㄹㄱ';
search.events.input();
assert.deepEqual(visibleNames(), ['갤러거'], 'character Chosung search matches Gallagher');
search.value = 'ㅇㅇㅈㅇㅎ';
search.events.input();
assert.deepEqual(visibleNames(), ['에이언즈★아하'], 'character Chosung search treats ★ as a separator');
search.value = '';
search.events.input();

const elationGroupTile = control({
  party: 'elation',
  partySearch: '환락 하이퍼캐리 에바네시아 효광 에이언즈★아하 펄 스파키',
  partyVariants: JSON.stringify([
    { search: '환락 하이퍼캐리 에바네시아 효광 에이언즈★아하 펄', href: '../../guides/hsr-elation-hypercarry/index.html?party=hsr-evanescia-elation' },
    { search: '환락 하이퍼캐리 스파키 효광 에이언즈★아하 펄', href: '../../guides/hsr-elation-hypercarry/index.html?party=hsr-sparxie-team' },
  ]),
});
elationGroupTile.setAttribute('href', '../../guides/hsr-elation-hypercarry/index.html');
const partyQueryInput = control();
const partyClearButton = control();
const partyCountNode = {};
const partyEmptyNode = {};
const elationTab = control({ category: 'elation' });
const partyViewTab = control({ view: 'party' });
const partyPanel = { dataset: { viewPanel: 'party' } };
const chosungPartyCatalog = {
  dataset: { defaultKind: 'party' },
  querySelector(selector) {
    return {
      '[data-party-query]': partyQueryInput,
      '[data-party-clear]': partyClearButton,
      '[data-party-count]': partyCountNode,
      '[data-party-empty]': partyEmptyNode,
    }[selector];
  },
  querySelectorAll(selector) {
    return {
      '[data-view]': [partyViewTab],
      '[data-view-panel]': [partyPanel],
      '[data-category]': [elationTab],
      '[data-party]': [elationGroupTile],
    }[selector] || [];
  },
};
runPage({ query: '?view=party&category=elation', catalog: chosungPartyCatalog });
partyQueryInput.value = 'ㅇㅂㄴㅅㅇ ㅎㄱ';
partyQueryInput.events.input();
assert.equal(elationGroupTile.hidden, false, 'multi-word Chosung matches within the same party variant');
assert.equal(elationGroupTile.getAttribute('href'), '../../guides/hsr-elation-hypercarry/index.html?party=hsr-evanescia-elation');
partyQueryInput.value = 'ㅇㅂㄴㅅㅇ ㅅㅍㅋ';
partyQueryInput.events.input();
assert.equal(elationGroupTile.hidden, true, 'multi-word Chosung across different variants does not match');
assert.equal(partyEmptyNode.hidden, false);

const globalEntries = [
  control({ game: 'hsr', kind: 'character', search: '갤러거 붕괴: 스타레일 알맞은 타이밍 태양과 번개의 여전사' }),
  control({ game: 'hsr', kind: 'character', search: '에이언즈★아하 붕괴: 스타레일 환락 서포터' }),
  control({ game: 'hsr', kind: 'character', search: '효광 붕괴: 스타레일 환락 서포터' }),
];
const globalQuery = control();
const globalGame = control();
const globalType = control();
const globalCount = {};
const globalEmpty = {};
const globalSearchCatalog = {
  querySelector(selector) {
    return {
      '[data-query]': globalQuery,
      '[data-game-filter]': globalGame,
      '[data-type-filter]': globalType,
      '[data-count]': globalCount,
      '[data-empty]': globalEmpty,
    }[selector];
  },
  querySelectorAll(selector) { return selector === '[data-entry]' ? globalEntries : []; },
};
let chosungConversions = 0;
const instrumentedScript = script.replace('function toChosung(text) {', 'function toChosung(text) { __onChosung();');
runInNewContext(instrumentedScript, {
  URLSearchParams,
  __onChosung: () => { chosungConversions++; },
  location: { pathname: '/search/index.html', search: '', hash: '' },
  history: { replaceState() {} },
  window: { addEventListener() {} },
  document: {
    addEventListener() {},
    querySelector(selector) { return selector === '[data-catalog]' ? globalSearchCatalog : null; },
    querySelectorAll() { return []; },
  },
});
assert.equal(chosungConversions, 0, 'empty global search runs 0 Chosung conversions');
globalQuery.value = '갤';
globalQuery.events.input();
assert.deepEqual(globalEntries.map(e => !e.hidden), [true, false, false]);
assert.equal(chosungConversions, 0, 'normal syllable search runs 0 Chosung conversions');
globalQuery.value = 'ㅇㅇㅈㅇㅎ';
globalQuery.events.input();
assert.deepEqual(globalEntries.map(e => !e.hidden), [false, true, false], 'global Chosung search treats ★ as separator');
const afterFirstChosung = chosungConversions;
assert.ok(afterFirstChosung > 0, 'first Chosung query computes cached Chosung');
globalQuery.value = 'ㄱㄹㄱ ㅇㅁㅇ';
globalQuery.events.input();
assert.deepEqual(globalEntries.map(e => !e.hidden), [true, false, false], 'global search matches multi-word Chosung');
globalQuery.value = 'ㅎㄱ';
globalQuery.events.input();
assert.deepEqual(globalEntries.map(e => !e.hidden), [false, false, true]);
const afterAllItemsCached = chosungConversions;
globalQuery.value = 'ㅇㅇㅈㅇㅎ';
globalQuery.events.input();
assert.equal(chosungConversions, afterAllItemsCached, 'repeat Chosung queries reuse per-item cache with 0 recomputations');
console.log('PASS Korean Chosung search works lazily with caching across character, same-formation party, and global search');
