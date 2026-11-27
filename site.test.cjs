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
const partyGroups = require('./site/party-groups.json');
const groupForParty = new Map(partyGroups.flatMap(group => group.variants.map(id => [id, group])));
const known = new Set([...docs.map(doc => doc.id), ...partyGroups.map(group => group.id), 'aha']);
for (const doc of docs) {
  for (const related of doc.related || []) assert.ok(known.has(related), `${doc.id} has valid related document ${related}`);
}
console.log('PASS archive content has unique IDs, valid related documents and five games');

const pages = ['index.html', 'search/index.html', ...games.map(game => `games/${game.id}/index.html`), ...docs.map(doc => `guides/${doc.id}/index.html`), ...partyGroups.map(group => `guides/${group.id}/index.html`)];
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
const releasedRoster = require('./site/hsr-roster.json');
const assets = require('./site/assets-manifest.json');
const conditionTags = require('./site/build-conditions.json');
const coneLabels = require('./site/cone-labels.json').cones;
for (const [profileId, builds] of Object.entries(conditionTags)) {
  const profile = profiles.find(item => item.id === profileId);
  assert.ok(profile, `condition profile ${profileId} exists`);
  for (const [buildId, tags] of Object.entries(builds)) {
    assert.ok(profile.targetBuilds.some(build => build.id === buildId));
    assert.ok(tags.length > 0 && tags.length <= 4 && tags.every(tag => tag.trim()));
    assert.equal(new Set(tags).size, tags.length);
  }
}
assert.equal(coneLabels['23044'].owner, '파이논');
assert.equal(coneLabels['24000'].owner, undefined, 'Herta shop cones are not character signatures');
assert.equal(new Set(profiles.map(profile => profile.characterId)).size, profiles.length, 'one guide per playable form');
assert.deepEqual(new Set(profiles.map(profile => profile.characterId)), new Set(releasedRoster.characters.map(character => character.id)), 'all released character forms have guides');
for (const character of releasedRoster.characters) {
  const profile = profiles.find(item => item.characterId === character.id);
  assert.equal(profile.path, character.path, `${character.id} Path matches game data`);
  assert.equal(profile.element, character.element, `${character.id} element matches game data`);
  assert.ok(profile.related.length, `${profile.id} links to a party or replacement role`);
}
const { createVisuals, categories, slots, substatsForSlot } = require('./site/visual.cjs');
assert.deepEqual(substatsForSlot('속도', ['속도', '격파 특수효과']), ['격파 특수효과']);
assert.deepEqual(substatsForSlot('속도', ['속도 145까지', 'HP%']), ['HP%']);
assert.deepEqual(substatsForSlot('에너지 회복효율 / 격파 특수효과', ['속도', '격파 특수효과']), ['속도', '격파 특수효과 (주옵션 제외)']);
assert.deepEqual(substatsForSlot('HP%', ['속도', 'HP% / 방어력%']), ['속도', '방어력%']);
for (const profile of profiles) {
  assert.ok(known.has(profile.id));
  assert.ok(assets.characters[profile.characterId]);
  assert.ok(profile.cones.length >= 2 && profile.cones.length <= 5, `${profile.id} has two to five sourced equipment choices`);
  assert.equal(new Set(profile.cones.map(cone => cone.id)).size, profile.cones.length);
  for (const cone of profile.cones) assert.ok(assets.cones[cone.id]);
  for (const cone of profile.cones) assert.ok([3, 4, 5].includes(coneLabels[cone.id]?.rarity));
  const allRelicBuilds = [...profile.relicBuilds, ...(profile.targetBuilds || []).map(build => build.relicBuild).filter(Boolean)];
  for (const build of allRelicBuilds) {
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
for (const profile of profiles) {
  for (const partyId of profile.related) {
    const party = parties.find(doc => doc.id === partyId)?.party;
    assert.ok(party && [...party.members, ...party.alternatives].some(member => member.id === profile.characterId), `${profile.id} actually appears in ${partyId}`);
  }
}
const invalidTarget = structuredClone(parties[0]);
invalidTarget.party.alternatives[0].replaces = 'missing-party-member';
assert.throws(
  () => createVisuals({ profiles, assets, docs, escape: String }).partyDetail(invalidTarget, '../../'),
  /Missing replacement target/,
  'unassigned alternatives must fail the build rather than silently disappear',
);
const multipleReplacements = structuredClone(parties[0]);
const occupiedIds = multipleReplacements.party.members.map(member => member.id);
const replaceableId = occupiedIds.find(id => !multipleReplacements.party.coreMemberIds.includes(id));
const replacementIds = profiles.filter(profile => !occupiedIds.includes(profile.characterId)).slice(0, 3);
multipleReplacements.party.alternatives = replacementIds.map(profile => ({ id: profile.characterId, name: profile.name, replaces: replaceableId, reason: '검증용 교체 조건' }));
const replacementHtml = createVisuals({ profiles, assets, docs, escape: String }).partyDetail(multipleReplacements, '../../');
assert.equal((replacementHtml.match(/data-replacement-badge=/g) || []).length, 3, 'every replacement gets a small portrait');
assert.equal((replacementHtml.match(/data-replaces=/g) || []).length, 3, 'every replacement retains its detail');
multipleReplacements.party.alternatives[0].id = occupiedIds[1];
assert.throws(() => createVisuals({ profiles, assets, docs, escape: String }).partyDetail(multipleReplacements, '../../'), /Invalid replacement/, 'replacement cannot duplicate another occupied slot');
const invalidCoreReplacement = structuredClone(parties.find(doc => doc.id === 'hsr-evanescia-elation'));
invalidCoreReplacement.party.alternatives = [{ id: '1506', name: '은랑 LV.999', replaces: '1505', reason: '다른 메인 딜러' }];
assert.throws(() => createVisuals({ profiles, assets, docs, escape: String }).partyDetail(invalidCoreReplacement, '../../'), /Cannot replace party core/, 'an Evanescia party cannot replace Evanescia');
assert.equal(parties.filter(doc => doc.party.lead === '스파키').length, 1, 'Sparxie has one canonical party guide');
const partyIdentities = parties.map(doc => `${doc.party.category}:${[...doc.party.coreMemberIds].sort().join(',')}`);
assert.equal(new Set(partyIdentities).size, parties.length, 'same core and category are not duplicated');
assert.deepEqual(new Set(parties.map(doc => doc.party.category)), new Set(Object.keys(categories)));
for (const doc of parties) {
  assert.equal(doc.party.members.length, 4);
  assert.equal(new Set(doc.party.members.map(member => member.id)).size, 4);
  for (const member of [...doc.party.members, ...doc.party.alternatives]) {
    if (member.id) assert.ok(assets.characters[member.id], `portrait ${member.id} exists`);
    if (member.guideId) assert.ok(known.has(member.guideId));
  }
  const group = groupForParty.get(doc.id);
  const pageHtml = fs.readFileSync(path.join(root, `guides/${group?.id || doc.id}/index.html`), 'utf8');
  const html = group ? pageHtml.split(`id="party-${doc.id}"`)[1].split('data-choice-panel')[1].split('<div id="party-')[0] : pageHtml;
  for (const alternative of doc.party.alternatives) {
    assert.ok(!doc.party.coreMemberIds.includes(alternative.replaces), `${doc.id}: fixed damage dealers are not replaced`);
    assert.ok(doc.party.members.some(member => member.id === alternative.replaces), `${doc.id} replacement target exists`);
    const slot = html.split(`data-member-id="${alternative.replaces}"`)[1]?.split('data-member-id=')[0];
    assert.ok(slot?.includes(`data-replaces="${alternative.replaces}"`), `${alternative.name} sits under their replacement target`);
    const escapedName = alternative.name.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
    assert.ok(slot.includes(escapedName), `${doc.id}: ${alternative.name} is displayed in its replacement slot`);
    assert.ok(slot.includes(`data-replacement-badge="${alternative.replaces}"`), 'replacement portraits accompany the correct main portrait');
  }
  for (const alias of doc.aliases || []) {
    assert.ok(!known.has(alias), 'merged parties are not searchable duplicate guides');
    const redirect = fs.readFileSync(path.join(root, `guides/${alias}/index.html`), 'utf8');
    const destination = group ? `../${group.id}/index.html?party=${doc.id}` : `../${doc.id}/index.html`;
    assert.ok(redirect.includes(`content="0;url=${destination}"`), 'old party links redirect to the canonical guide');
    assert.ok(redirect.includes(`href="${destination}"`), 'redirect has a usable fallback link');
  }
}
const hsr = fs.readFileSync(path.join(root, 'games/hsr/index.html'), 'utf8');
for (const [newer, older] of [
  ['hsr-hysilens-dot', 'hsr-kafka-black-swan-dot'],
  ['hsr-aventurine-waveflair-team', 'hsr-jing-yuan-team'],
  ['hsr-gilgamesh-team', 'hsr-himeko-nova-team'],
]) {
  assert.ok(hsr.indexOf(`guides/${newer}/index.html`) < hsr.indexOf(`guides/${older}/index.html`), `${newer} precedes older damage dealers`);
}
for (const group of partyGroups) {
  assert.equal((hsr.match(new RegExp(`href="../../guides/${group.id}/index.html"`, 'g')) || []).length, 1, 'one catalog card per party group');
  const groupPage = fs.readFileSync(path.join(root, `guides/${group.id}/index.html`), 'utf8');
  assert.equal((groupPage.match(/data-choice="party-/g) || []).length, group.variants.length, 'every damage dealer has a selector');
  for (const id of group.variants) {
    assert.ok(!hsr.includes(`href="../../guides/${id}/index.html"`), 'group variants are not duplicate catalog cards');
    const variant = parties.find(doc => doc.id === id);
    assert.deepEqual(new Set(variant.party.members.filter(member => !variant.party.coreMemberIds.includes(member.id)).map(member => member.id)), new Set(['1502', '1511', '1503']));
    assert.ok(groupPage.includes(`id="party-${id}"`));
    const redirect = fs.readFileSync(path.join(root, `guides/${id}/index.html`), 'utf8');
    assert.ok(redirect.includes(`?party=${id}`), 'old variant links preserve the selected dealer');
  }
}
const evaAlternatives = parties.find(doc => doc.id === 'hsr-evanescia-elation').party.alternatives;
assert.ok(evaAlternatives.some(item => item.id === '8010' && item.replaces === '1502'), 'Trailblazer can replace Yao Guang for Evanescia');
assert.ok(evaAlternatives.some(item => item.id === '8010' && item.replaces === '1511'), 'Trailblazer can replace Aha for Evanescia');
assert.ok(evaAlternatives.some(item => item.id === '1415' && item.replaces === '1503' && item.reason.includes('생존')), 'Cyrene replacement states the sustain tradeoff');
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
  const coneSection = page.split('id="cones"')[1].split('<section')[0];
  for (const [index, cone] of profile.cones.entries()) {
    const choice = coneSection.match(new RegExp(`<button[^>]+data-choice="cone-${index}"[^>]*>([\\s\\S]*?)</button>`))[1];
    const metadata = coneLabels[cone.id];
    assert.ok(choice.includes('★'.repeat(metadata.rarity)));
    if (metadata.owner === '파이논' && profile.name !== '파이논') assert.ok(choice.includes('(대체) 파이논 광추'));
    if (metadata.rarity === 5) assert.ok(!choice.includes('1재') && !choice.includes('1중첩'));
  }
  let totalNotes = 0;
  for (const build of profile.targetBuilds || [profile]) {
    const panel = page.split(`id="build-target-${build.id}"`)[1]?.split('data-build-panel')[1];
    for (const tag of conditionTags[profile.id]?.[build.id] || []) assert.ok(panel.includes(tag), `${profile.id}/${build.id} exposes its setup condition`);
    const idPrefix = profile.targetBuilds ? `build-${build.id}-` : '';
    let noteCount = 0;
    for (const [index, stat] of build.targetStats.entries()) {
      for (const field of ['value', 'nearFinal', 'final']) assert.ok(stat[field]?.trim());
      for (const [key, text] of [['label', stat.condition], ...['value', 'nearFinal', 'final'].map(key => [key, stat.notes?.[key]])]) {
        const cellId = `${idPrefix}stat-row-${index + 1}-${key}`;
        const cell = page.match(new RegExp(`<t[hd][^>]*id="${cellId}"[^>]*>([\\s\\S]*?)</t[hd]>`))[1];
        assert.equal(cell.includes('data-stat-note'), Boolean(text), `${profile.id}/${cellId} only has a note when needed`);
        if (!text) continue;
        noteCount++;
        assert.ok(cell.includes(`<sup>[${noteCount}]</sup>`));
        assert.ok(cell.includes(`href="#${idPrefix}stat-note-${noteCount}"`));
        assert.ok(page.includes(`id="${idPrefix}stat-note-${noteCount}"`));
        assert.ok(cell.includes(`aria-describedby="${idPrefix}stat-tooltip-${noteCount}"`));
        assert.ok(cell.includes(`id="${idPrefix}stat-ref-${noteCount}"`));
        assert.ok(page.includes(`href="#${idPrefix}stat-ref-${noteCount}"`), 'footnote returns focus to its exact numbered link');
      }
    }
    totalNotes += noteCount;
  }
  assert.equal((page.match(/data-stat-note/g) || []).length, totalNotes);
  assert.equal(page.includes('class="stat-footnotes"'), totalNotes > 0);
  const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${profile.id} has unique IDs across build panels`);
}
console.log('PASS visual guides have real equipment pieces, complete stats, linked parties and no all-category tab');

const noteFixture = {
  ...profiles[0],
  targetBuilds: undefined,
  targetStats: [
    { label: '속도', value: '134', nearFinal: '—', final: '160', condition: '동일 파티 기준', notes: { final: '특정 행동 순서 조건' } },
    { label: '공격력', value: '3000', nearFinal: '—', final: '—' },
  ],
};
const fixturePage = createVisuals({ profiles: [noteFixture], assets, docs, escape: String })
  .characterDetail(docs.find(doc => doc.id === noteFixture.id), '../../');
assert.equal((fixturePage.match(/data-stat-note/g) || []).length, 2, 'common and value-specific notes are numbered without empty notes');
assert.match(fixturePage, /id="stat-row-1-label"[^>]*>속도<span class="stat-note"/);
assert.match(fixturePage, /id="stat-row-1-final"[^>]*>160<span class="stat-note"/);
assert.match(fixturePage, /id="stat-row-1-value"[^>]*>134<\/td>/);
assert.ok(fixturePage.includes('href="#stat-ref-2"'), 'value-specific footnote returns to the value link');
assert.ok(!fixturePage.includes('[*]'), 'numbered superscripts replace large generic markers');
console.log('PASS optional footnotes attach to the exact value or common stat label');

const buildFixture = {
  ...noteFixture,
  targetBuilds: ['slow', 'fast'].map(id => ({
    id, name: id, summary: `${id} 세팅`,
    relicBuildId: noteFixture.relicBuilds[0].id,
    targetStats: [{ label: '속도', value: '134', nearFinal: '143', final: '160', calculated: ['nearFinal'], notes: { nearFinal: '자체 계산: 첫 350AV에 자연 5행동.' } }],
    targetNote: '버프와 행동 당김 없는 기준', sources: [],
  })),
};
const buildsHtml = createVisuals({ profiles: [buildFixture], assets, docs, escape: String })
  .characterDetail(docs.find(doc => doc.id === buildFixture.id), '../../');
for (const id of ['slow', 'fast']) {
  assert.equal((buildsHtml.match(new RegExp(`data-build-choice="${id}"`, 'g')) || []).length, 2, 'equipment and stat sections each have a selector');
  assert.equal((buildsHtml.match(new RegExp(`data-build-panel="${id}"`, 'g')) || []).length, 2);
  assert.ok(buildsHtml.includes(`id="build-${id}-stat-note-1"`));
  assert.ok(buildsHtml.includes(`href="#build-${id}-stat-ref-1"`));
}
assert.equal((buildsHtml.match(/class="calculated-stat"/g) || []).length, 2, 'calculated targets are visibly distinguished');
assert.throws(() => createVisuals({ profiles: [{ ...buildFixture, targetBuilds: [buildFixture.targetBuilds[0], buildFixture.targetBuilds[0]] }], assets, docs, escape: String })
  .characterDetail(docs.find(doc => doc.id === buildFixture.id), '../../'), /Invalid target builds/);
console.log('PASS build panels keep equipment and footnotes unique and label calculated thresholds');

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
const matchingProfiles = (element, path) => profiles.filter(profile => (!element || profile.element === element) && (!path || profile.path === path)).map(profile => profile.id);
assert.deepEqual(visibleCharacters(), matchingProfiles('fire', 'abundance'), 'URL restores element AND path');
abundanceButton.events.click();
assert.deepEqual(visibleCharacters(), matchingProfiles('fire'), 'clicking the selected path clears only that group');
abundanceButton.events.click();
fireButton.events.click();
assert.deepEqual(visibleCharacters(), matchingProfiles(null, 'abundance'), 'element toggle preserves the chosen path');
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
assert.deepEqual(visibleCharacters(), matchingProfiles('quantum', 'elation'), 'newly published combinations are included');
filterLocation.search = '?element=unknown&path=unknown';
browserEvents.popstate();
assert.equal(visibleCharacters().length, profiles.length, 'invalid URL filters fall back to all');
tiles.push(catalogControl({id:'future-fire-erudition',search:'신규 캐릭터',element:'fire',path:'erudition'}));
filterLocation.search = '?element=fire&path=erudition';
browserEvents.popstate();
assert.deepEqual(visibleCharacters(), [...matchingProfiles('fire', 'erudition'), 'future-fire-erudition'], 'future fire erudition characters match both filters');
const invalidProfile = {...profiles[0], element:'unknown'};
assert.throws(() => createVisuals({profiles:[invalidProfile],assets,docs,escape:String}).characterTile(docs.find(doc => doc.id === invalidProfile.id), '../../'), /Invalid character classification/);
console.log('PASS character filters combine name, element and path, restore URLs and reset safely');

const note = catalogControl();
const tooltip = { style: {}, getBoundingClientRect: () => ({ width: 240, height: 80 }) };
note.getBoundingClientRect = () => ({ left: 240, top: 20, bottom: 40, height: 20 });
note.querySelector = selector => selector === 'a' ? note : tooltip;
const secondNote = catalogControl();
secondNote.querySelector = note.querySelector;
secondNote.getBoundingClientRect = note.getBoundingClientRect;
const noteDocumentEvents = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'site/app.js'), 'utf8'), {
  document: {
    documentElement: { clientWidth: 320 },
    querySelectorAll(selector) { return selector === '[data-stat-note]' ? [note, secondNote] : []; },
    querySelector() { return null; },
    addEventListener(name, callback) { noteDocumentEvents[name] = callback; },
  },
});
note.events.pointerenter();
assert.equal(tooltip.style.left, '-176px', 'mobile tooltip stays inside the viewport');
assert.equal(tooltip.style.top, '20px', 'tooltip appears below a trigger near the viewport top');
secondNote.events.pointerenter();
assert.equal(note.dataset.active, undefined, 'hovering another note does not retain a competing focus tooltip');
assert.equal(secondNote.dataset.active, 'true');
secondNote.events.pointerleave();
assert.equal(secondNote.dataset.active, undefined);
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

const searchPageHtml = fs.readFileSync(path.join(root, 'search/index.html'), 'utf8');
assert.ok(!/fetch\(/.test(searchPageHtml), 'search page stays offline file:// compatible');
const gallagherCard = searchPageHtml.slice(searchPageHtml.indexOf('href="../guides/hsr-gallagher/index.html"')).split('</a>')[0];
assert.ok(gallagherCard.includes('알맞은 타이밍'), 'Gallagher search data keeps signature/recommended cone');
assert.ok(gallagherCard.includes('태양과 번개의 여전사'), 'Gallagher search data keeps relic set');
const bodyOnlyDoc = docs.find(doc => doc.sections?.some(section => (section.bullets || []).some(text => text.includes('격파'))));
const bodyOnlyCard = searchPageHtml.slice(searchPageHtml.indexOf(`href="../guides/${bodyOnlyDoc.id}/index.html"`)).split('</a>')[0];
assert.ok(bodyOnlyCard.includes('격파'), 'search data keeps body-only section terms after deduplication');
console.log('PASS deduplicated search page preserves equipment, body-only terms and offline compatibility');

const AhaState = require('./state.js');
const elationGroupHtml = fs.readFileSync(path.join(root, 'guides/hsr-elation-hypercarry/index.html'), 'utf8');
const expectedElationTeams = {
  'hsr-evanescia-elation': ['eva', 'yao', 'aeon', 'pearl'],
  'hsr-silver-wolf-lv-999-team': ['wolf', 'yao', 'aeon', 'pearl'],
  'hsr-sparxie-team': ['sparxie', 'yao', 'aeon', 'pearl'],
  'hsr-aventurine-waveflair-elation': ['wave', 'yao', 'aeon', 'pearl'],
};
for (const [partyId, expectedSlots] of Object.entries(expectedElationTeams)) {
  const linkMatch = elationGroupHtml.match(new RegExp(`href="\\.\\.\\/\\.\\.\\/tools\\/aha\\/index\\.html\\?preview=guide#aha=([A-Za-z0-9_-]+)"[^>]*data-calculator-link="${partyId}"[^>]*>기본 편성으로 열기`));
  assert.ok(linkMatch, `${partyId} links to Aha calculator preview as 기본 편성으로 열기`);
  const decoded = AhaState.decode(linkMatch[1]);
  assert.deepEqual(decoded.config.slots.map(slot => slot.id), expectedSlots, `${partyId} round-trips exact 4-member Elation slots`);
}
assert.ok(calculator.includes('id="previewBanner"') && calculator.includes('id="applyPreview"') && calculator.includes('id="discardPreview"'), 'standalone calculator includes preview banner and explicit apply controls');
const nonElationHtml = fs.readFileSync(path.join(root, 'guides/hsr-firefly-super-break/index.html'), 'utf8');
assert.ok(!nonElationHtml.includes('data-calculator-link='), 'non-Elation parties do not attach Aha calculator links');
console.log('PASS Elation party guides link verified 4-member default formations to the Aha calculator');

// P2-3: OpenGraph metadata under /fluffy-archive/, redirect og:url == canonical destination, and canonical-only sitemap.xml.
const homeOg = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(homeOg, /property="og:url" content="https:\/\/pasame\.github\.io\/fluffy-archive\/"/);
assert.match(homeOg, /property="og:image" content="https:\/\/pasame\.github\.io\/fluffy-archive\/site\/raccoon\.png"/);
const ahaGuideOg = fs.readFileSync(path.join(root, 'guides/hsr-aha/index.html'), 'utf8');
assert.match(ahaGuideOg, /property="og:url" content="https:\/\/pasame\.github\.io\/fluffy-archive\/guides\/hsr-aha\/index\.html"/);
assert.match(ahaGuideOg, /property="og:image" content="https:\/\/pasame\.github\.io\/fluffy-archive\/site\/assets\/hsr\/characters\/1511\.png"/);
for (const group of partyGroups) {
  for (const variantId of group.variants) {
    const redirectHtml = fs.readFileSync(path.join(root, `guides/${variantId}/index.html`), 'utf8');
    const canonicalHref = redirectHtml.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    const ogUrl = redirectHtml.match(/<meta property="og:url" content="([^"]+)">/)?.[1];
    assert.ok(canonicalHref && ogUrl, `${variantId} redirect has canonical and og:url`);
    assert.equal(ogUrl, new URL(canonicalHref, `https://pasame.github.io/fluffy-archive/guides/${variantId}/`).href, `${variantId} redirect og:url matches canonical destination`);
  }
}
for (const doc of docs) {
  for (const alias of doc.aliases || []) {
    const redirectHtml = fs.readFileSync(path.join(root, `guides/${alias}/index.html`), 'utf8');
    const canonicalHref = redirectHtml.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    const ogUrl = redirectHtml.match(/<meta property="og:url" content="([^"]+)">/)?.[1];
    assert.ok(canonicalHref && ogUrl, `${alias} alias redirect has canonical and og:url`);
    assert.equal(ogUrl, new URL(canonicalHref, `https://pasame.github.io/fluffy-archive/guides/${alias}/`).href, `${alias} alias og:url matches canonical destination`);
  }
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.ok(sitemap.includes('<loc>https://pasame.github.io/fluffy-archive/</loc>'));
assert.ok(sitemap.includes('<loc>https://pasame.github.io/fluffy-archive/tools/aha/index.html</loc>'));
assert.ok(sitemap.includes('<loc>https://pasame.github.io/fluffy-archive/guides/hsr-elation-hypercarry/index.html</loc>'));
for (const group of partyGroups) {
  for (const variantId of group.variants) {
    assert.ok(!sitemap.includes(`guides/${variantId}/index.html`), `sitemap excludes dealer redirect ${variantId}`);
  }
}
for (const doc of docs) {
  for (const alias of doc.aliases || []) {
    assert.ok(!sitemap.includes(`guides/${alias}/index.html`), `sitemap excludes alias redirect ${alias}`);
  }
}
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
assert.ok(serverSource.includes("'.xml': 'application/xml; charset=utf-8'"), 'local server maps .xml MIME type');
console.log('PASS OpenGraph metadata uses /fluffy-archive/ URLs, redirect og:url matches canonical, and sitemap.xml lists canonical pages only');

// P2-1 & P3-1: Theme toggle, HEX defaults with @supports light-dark(), single :root, and Canvas host theme isolation.
const stripLightDarkSupports = css => css.replace(/@supports\s*\(\s*color:\s*light-dark\([^)]*\)\s*\)\s*\{(?:[^{}]*|\{[^{}]*\})*\}/g, '');
const siteStyles = fs.readFileSync(path.join(root, 'site/styles.css'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
assert.ok(!stripLightDarkSupports(siteStyles).includes('light-dark('), 'site/styles.css places all light-dark() declarations inside @supports');
assert.ok(!stripLightDarkSupports(appSource).includes('light-dark('), 'app.html places all light-dark() declarations inside @supports');
assert.equal((appSource.match(/:root\{/g) || []).length, 2, 'app.html keeps one base :root and one @supports light-dark :root');
assert.equal((appSource.match(/@media\(max-width:768px\)/g) || []).length, 1, 'app.html consolidates mobile breakpoint rules');
assert.ok(homeOg.includes('data-theme-toggle'), 'archive header includes manual theme toggle');
assert.ok(calculator.includes('data-theme-toggle'), 'standalone calculator includes manual theme toggle');
const canvasFile = path.join(root, 'aha-speed.canvas.tsx');
if (fs.existsSync(canvasFile)) {
  const canvasSource = fs.readFileSync(canvasFile, 'utf8');
  assert.ok(canvasSource.includes('/*__HOST_THEME__*/'), 'Canvas wrapper injects host theme variables');
  assert.ok(canvasSource.includes('data-canvas-host'), 'Canvas wrapper marks host-themed document');
  assert.ok(!canvasSource.includes(':root[data-theme=dark]'), 'Canvas wrapper strips standalone dark theme overrides');
  assert.ok(!canvasSource.includes('light-dark('), 'Canvas wrapper strips standalone light-dark() overrides');
  assert.ok(canvasSource.includes(':root[data-canvas-host] body{--path-bg:var(--canvas-path-bg)}'), 'Canvas path badges use a host color override');
  assert.ok(canvasSource.includes("theme.kind === 'dark' ? '#151a22' : '#414956'"), 'Canvas defines both path badge colors as HEX values');
  assert.ok(canvasSource.includes('--canvas-path-bg:${pathBadgeBackground};'), 'Canvas injects the resolved path badge color');
}
console.log('PASS calculator CSS consolidated and HEX/@supports light-dark/Canvas themes isolated cleanly');
