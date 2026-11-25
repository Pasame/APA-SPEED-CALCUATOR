const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildArchive, games } = require('./site/build.cjs');
const art = require('./art.json');
const root = __dirname;

const result = buildArchive(root, art);
assert.equal(result.games, 5);
assert.ok(result.documents >= 9, 'initial published guides exist');
const docs = require('./site/content.json');
const known = new Set([...docs.map(doc => doc.id), 'aha']);
for (const doc of docs) {
  for (const related of doc.related || []) assert.ok(known.has(related), `${doc.id} has valid related document ${related}`);
}
console.log('PASS archive content has unique IDs, valid related documents and five games');

const pages = ['index.html', 'search/index.html', ...games.map(game => `games/${game.id}/index.html`), ...docs.map(doc => `guides/${doc.id}/index.html`)];
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.ok(html.includes('lang="ko"'));
  for (const asset of ['styles.css', 'app.js']) {
    const version = require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root, 'site', asset))).digest('hex').slice(0, 12);
    assert.ok(html.includes(`site/${asset}?v=${version}`), `${page} loads the matching ${asset} version`);
  }
  for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|data:|#)/.test(link)) continue;
    const relative = link.split(/[?#]/)[0];
    const target = path.resolve(root, path.dirname(page), relative);
    assert.ok(target.startsWith(root + path.sep), `${page} link stays in project`);
    assert.ok(fs.existsSync(target), `${page} has existing relative target ${link}`);
  }
}
console.log('PASS generated pages have valid links and assets under a Pages project path');

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const redirect = home.match(/<script>\s*(function forwardCalculatorShare[\s\S]*?)<\/script>/)[1];
for (const base of ['https://pasame.github.io/fluffy-archive/', 'https://pasame.github.io/fluffy-archive/index.html']) {
  let destination;
  const location = { href: base + '?from=old#aha=encoded-value', hash: '#aha=encoded-value', search: '?from=old', replace(value) { destination = value; } };
  vm.runInNewContext(redirect, { location, URL, addEventListener() {} });
  assert.equal(destination, 'https://pasame.github.io/fluffy-archive/tools/aha/index.html?from=old#aha=encoded-value');
}
let redirected = false;
let onHashChange;
const location = { href: 'https://pasame.github.io/fluffy-archive/', hash: '#games', search: '', replace() { redirected = true; } };
vm.runInNewContext(redirect, { location, URL, addEventListener(name, callback) { if (name === 'hashchange') onHashChange = callback; } });
assert.equal(redirected, false, 'normal archive hash does not open calculator');
location.hash = '#aha=another-share';
onHashChange();
assert.equal(redirected, true, 'shares opened on the already loaded home still reach the calculator');
console.log('PASS legacy Aha shares preserve query and hash without redirecting normal visitors');

const calculator = fs.readFileSync(path.join(root, 'tools/aha/index.html'), 'utf8');
for (const source of ['engine.js', 'state.js', 'app.js']) {
  assert.ok(calculator.includes(fs.readFileSync(path.join(root, source), 'utf8')), `standalone calculator contains current ${source}`);
}
assert.ok(!/<script[^>]+src=/.test(calculator));
assert.ok(!/<link[^>]+rel="stylesheet"/.test(calculator));
console.log('PASS moved calculator remains self-contained and includes unmodified source modules');

const profiles = require('./site/profiles.json');
const assets = require('./site/assets-manifest.json');
const { createVisuals, categories, slots, substatsForSlot } = require('./site/visual.cjs');
assert.deepEqual(substatsForSlot('속도', ['속도', '격파 특수효과']), ['격파 특수효과']);
assert.deepEqual(substatsForSlot('속도', ['속도 145까지', 'HP%']), ['HP%']);
assert.deepEqual(substatsForSlot('에너지 회복효율 / 격파 특수효과', ['속도', '격파 특수효과']), ['속도', '격파 특수효과 (주옵션 제외)']);
assert.deepEqual(substatsForSlot('HP%', ['속도', 'HP% / 방어력%']), ['속도', '방어력%']);
for (const profile of profiles) {
  assert.ok(known.has(profile.id));
  assert.ok(assets.characters[profile.characterId]);
  assert.ok(profile.cones.length >= 4 && profile.cones.length <= 5, `${profile.id} has four or five sourced equipment choices`);
  assert.equal(new Set(profile.cones.map(cone => cone.id)).size, profile.cones.length);
  for (const cone of profile.cones) assert.ok(assets.cones[cone.id]);
  for (const build of profile.relicBuilds) {
    assert.equal(build.cavernSets.reduce((sum, set) => sum + set.pieces, 0), 4);
    const cavern = build.cavernSets.flatMap(set => Array(set.pieces).fill(set.id));
    const pieces = Object.keys(slots).map((slot, index) => {
      assert.ok(build.mainStats[slot], `${profile.id}: ${slot} has a main stat`);
      const set = assets.relicSets[index < 4 ? cavern[index] : build.planarSet];
      assert.ok(set?.pieces[slot], `${profile.id}: actual ${slot} image exists`);
      return set.pieces[slot];
    });
    assert.equal(new Set(pieces).size, 6, 'six distinct relic pieces, not repeated set icons');
    assert.ok(build.substats.length);
  }
  assert.deepEqual(profile.eidolons.map(item => item.level), [1, 2, 3, 4, 5, 6]);
  assert.ok(profile.related.every(id => docs.some(doc => doc.id === id && doc.party)));
}
const parties = docs.filter(doc => doc.party);
const invalidTarget = structuredClone(parties[0]);
invalidTarget.party.alternatives[0].replaces = 'missing-party-member';
assert.throws(
  () => createVisuals({ profiles, assets, docs, escape: String }).partyDetail(invalidTarget, '../../'),
  /Missing replacement target/,
  'unassigned alternatives must fail the build rather than silently disappear',
);
assert.deepEqual(new Set(parties.map(doc => doc.party.category)), new Set(Object.keys(categories)));
for (const doc of parties) {
  assert.equal(doc.party.members.length, 4);
  assert.equal(new Set(doc.party.members.map(member => member.id)).size, 4);
  for (const member of [...doc.party.members, ...doc.party.alternatives]) {
    if (member.id) assert.ok(assets.characters[member.id], `portrait ${member.id} exists`);
    if (member.guideId) assert.ok(known.has(member.guideId));
  }
  const html = fs.readFileSync(path.join(root, `guides/${doc.id}/index.html`), 'utf8');
  for (const alternative of doc.party.alternatives) {
    assert.ok(doc.party.members.some(member => member.id === alternative.replaces), `${doc.id} replacement target exists`);
    const slot = html.split(`data-member-id="${alternative.replaces}"`)[1]?.split('data-member-id=')[0];
    assert.ok(slot?.includes(`data-replaces="${alternative.replaces}"`), `${alternative.name} sits under their replacement target`);
    assert.ok(slot.includes(alternative.name));
  }
}
const hsr = fs.readFileSync(path.join(root, 'games/hsr/index.html'), 'utf8');
assert.ok(!/>전체<\/button>/.test(hsr));
assert.ok(hsr.includes('data-character-query'));
assert.equal((hsr.match(/data-character data-search/g) || []).length, profiles.length);
const searchPage = fs.readFileSync(path.join(root, 'search/index.html'), 'utf8');
const gallagherSearch = searchPage.match(/<a class="doc-card"[^>]+href="[^\"]*hsr-gallagher[^>]+>/)[0];
assert.ok(gallagherSearch.includes('알맞은 타이밍'));
assert.ok(gallagherSearch.includes('태양과 번개의 여전사'));
for (const profile of profiles) {
  const page = fs.readFileSync(path.join(root, `guides/${profile.id}/index.html`), 'utf8');
  assert.ok(page.includes('기본 운영과 행적'));
  assert.ok(page.includes('tools/aha/index.html'));
  assert.ok(!page.includes('undefined'));
  for (const [index, stat] of profile.targetStats.entries()) {
    for (const field of ['value', 'nearFinal', 'final', 'condition']) assert.ok(stat[field]?.trim());
    assert.ok(page.includes(`href="#stat-note-${index + 1}"`));
    assert.ok(page.includes(`id="stat-note-${index + 1}"`));
    assert.ok(page.includes(`aria-describedby="stat-tooltip-${index + 1}"`));
  }
}
console.log('PASS visual guides have real equipment pieces, complete stats, linked parties and no all-category tab');

// Detail pages do not have a catalog. Their equipment controls must still work,
// and changing one group must not change another group's selection.
function choiceGroup(ids) {
  const buttons = ids.map(id => ({
    dataset: { choice: id },
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this[name] = callback; },
  }));
  const panels = ids.map((id, index) => ({ id, hidden: index !== 0 }));
  return {
    buttons, panels,
    querySelectorAll(selector) { return selector === '[data-choice]' ? buttons : panels; },
  };
}
const cones = choiceGroup(['cone-0', 'cone-1']);
const relics = choiceGroup(['relic-0', 'relic-1']);
vm.runInNewContext(fs.readFileSync(path.join(root, 'site/app.js'), 'utf8'), {
  document: { querySelectorAll(selector) { return selector === '[data-choice-group]' ? [cones, relics] : []; }, querySelector() { return null; } },
});
cones.buttons[1].click();
assert.deepEqual(cones.panels.map(panel => panel.hidden), [true, false]);
assert.deepEqual(relics.panels.map(panel => panel.hidden), [false, true]);
assert.equal(cones.buttons[1].attributes['aria-pressed'], 'true');
relics.buttons[1].click();
cones.buttons[0].click();
assert.deepEqual(relics.panels.map(panel => panel.hidden), [true, false]);
assert.deepEqual(cones.panels.map(panel => panel.hidden), [false, true]);
console.log('PASS equipment choices work without a catalog and keep cone/relic selections independent');

function catalogControl(dataset = {}) {
  return {
    dataset, value: '', hidden: false, events: {}, attributes: {},
    addEventListener(name, callback) { this.events[name] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; },
    focus() { this.focused = true; },
  };
}
const filterData = require('./site/character-filters.json').hsr;
const characterSearch = catalogControl();
const elementFilters = Object.keys(filterData.elements).map(characterElement => catalogControl({characterElement}));
const pathFilters = Object.keys(filterData.paths).map(characterPath => catalogControl({characterPath}));
const fireButton = elementFilters.find(button => button.dataset.characterElement === 'fire');
const abundanceButton = pathFilters.find(button => button.dataset.characterPath === 'abundance');
const resetFilters = catalogControl();
const resultCount = {};
const emptyResults = {};
const tiles = profiles.map(profile => catalogControl({ search: profile.name, element: profile.element, path: profile.path, id: profile.id }));
const viewButtons = ['character','party'].map(view => catalogControl({view}));
const viewPanels = ['character','party'].map(viewPanel => catalogControl({viewPanel}));
const fields = {
  '[data-character-query]': characterSearch,
  '[data-character-clear]': resetFilters,
  '[data-character-count]': resultCount,
  '[data-character-empty]': emptyResults,
};
const catalog = {
  dataset: {defaultKind:'character'},
  querySelector(selector) { return fields[selector] || null; },
  querySelectorAll(selector) {
    return ({'[data-view]':viewButtons, '[data-view-panel]':viewPanels, '[data-character]':tiles, '[data-character-element]':elementFilters, '[data-character-path]':pathFilters})[selector] || [];
  },
};
const filterLocation = {pathname:'/games/hsr/index.html',search:'?view=character&element=fire&path=abundance'};
const browserEvents = {};
let savedFilterUrl;
vm.runInNewContext(fs.readFileSync(path.join(root, 'site/app.js'), 'utf8'), {
  document: {querySelectorAll() { return []; },querySelector(selector) { return selector === '[data-game-catalog]' ? catalog : null; }},
  location: filterLocation,
  history: {replaceState(state, title, url) { savedFilterUrl = url; }},
  window: {addEventListener(name, callback) { browserEvents[name] = callback; }},
  URLSearchParams,
});
const visibleCharacters = () => tiles.filter(tile => !tile.hidden).map(tile => tile.dataset.id);
assert.deepEqual(visibleCharacters(), ['hsr-gallagher'], 'URL restores element AND path');
abundanceButton.events.click();
assert.deepEqual(visibleCharacters(), ['hsr-firefly','hsr-gallagher'], 'clicking the selected path clears only that group');
abundanceButton.events.click();
fireButton.events.click();
assert.deepEqual(new Set(visibleCharacters()), new Set(['hsr-huohuo','hsr-gallagher']), 'element toggle preserves the chosen path');
fireButton.events.click();
characterSearch.value = '반디';
characterSearch.events.input();
assert.deepEqual(visibleCharacters(), [], 'name search also applies to both filters');
assert.equal(emptyResults.hidden, false);
assert.equal(resultCount.textContent, '0명');
assert.ok(savedFilterUrl.includes('element=fire') && savedFilterUrl.includes('path=abundance'));
viewButtons[1].events.click();
viewButtons[0].events.click();
assert.equal(fireButton.attributes['aria-pressed'], 'true', 'switching categories keeps character filters');
resetFilters.events.click();
assert.equal(visibleCharacters().length, profiles.length);
assert.equal(characterSearch.focused, true);
assert.equal(resetFilters.hidden, true);
assert.ok(!savedFilterUrl.includes('element=') && !savedFilterUrl.includes('path='));
filterLocation.search = '?view=character&element=quantum&path=elation';
browserEvents.popstate();
assert.equal(visibleCharacters().length, 0, 'unpublished combinations show empty results');
filterLocation.search = '?element=unknown&path=unknown';
browserEvents.popstate();
assert.equal(visibleCharacters().length, profiles.length, 'invalid URL filters fall back to all');
tiles.push(catalogControl({id:'future-fire-erudition',search:'신규 캐릭터',element:'fire',path:'erudition'}));
filterLocation.search = '?element=fire&path=erudition';
browserEvents.popstate();
assert.deepEqual(visibleCharacters(), ['future-fire-erudition'], 'future fire erudition characters match both filters');
const invalidProfile = {...profiles[0], element:'unknown'};
assert.throws(() => createVisuals({profiles:[invalidProfile],assets,docs,escape:String}).characterTile(docs.find(doc => doc.id === invalidProfile.id), '../../'), /Invalid character classification/);
console.log('PASS character filters combine name, element and path, restore URLs and reset safely');

const note = catalogControl();
const noteDocumentEvents = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'site/app.js'), 'utf8'), {
  document: {
    querySelectorAll(selector) { return selector === '[data-stat-note]' ? [note] : []; },
    querySelector() { return null; },
    addEventListener(name, callback) { noteDocumentEvents[name] = callback; },
  },
});
note.events.pointerenter();
noteDocumentEvents.keydown({key:'Escape', target:{tagName:'INPUT'}});
assert.equal(note.dataset.dismissed, 'true', 'Escape dismisses hover tooltips even when another element has focus');
note.events.focusin();
noteDocumentEvents.keydown({key:'Escape'});
assert.equal(note.dataset.dismissed, 'true');
note.events.focusin();
assert.equal(note.dataset.dismissed, undefined);
for (const key of Object.keys(filterData.elements)) assert.ok(assets.filters['element-' + key]);
for (const key of Object.keys(filterData.paths)) assert.ok(assets.filters['path-' + key]);
console.log('PASS stat tiers have linked footnotes and dismissible keyboard tooltips; all filter icons exist');
