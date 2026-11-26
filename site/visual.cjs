const characterFilters = require('./character-filters.json');
const releaseDates = require('./hsr-release-order.json').dates;
const categories = {
  dot: '지속 피해',
  followup: '추가 공격',
  elation: '환락',
  remembrance: '기억',
  hp: 'HP 소모',
  break: '격파',
  hypercarry: '하이퍼캐리',
};
const slots = {
  head: '머리', hands: '손', body: '몸통', feet: '다리', sphere: '구체', rope: '매듭',
};

function substatsForSlot(mainStat, substats) {
  const mainOptions = mainStat.split(/\s*\/\s*/);
  return substats.flatMap(stat => {
    const options = stat.split(/\s*\/\s*/);
    const isMainStat = option => mainOptions.includes(option.replace(/\s+\d.*$/, '').trim());
    if (!options.some(isMainStat)) return [stat];
    if (mainOptions.length > 1) return [`${stat} (주옵션 제외)`];
    const remaining = options.filter(option => !isMainStat(option));
    return remaining.length ? [remaining.join(' / ')] : [];
  });
}

function createVisuals({ profiles, assets, docs, escape, partyGroups = [] }) {
  const groupForParty = new Map(partyGroups.flatMap(group => group.variants.map(id => [id, group])));
  const byName = new Intl.Collator('ko').compare;
  function image(group, id, prefix, className = '', alt = '') {
    const asset = assets[group][id];
    if (!asset) throw new Error(`Missing ${group} image: ${id}`);
    return `<img class="${className}" src="${prefix}${asset.path}" alt="${escape(alt)}" loading="lazy" width="256" height="256">`;
  }

  function characterTile(doc, prefix) {
    const profile = profiles.find(item => item.id === doc.id);
    if (!profile) throw new Error(`Missing character profile: ${doc.id}`);
    const filters = characterFilters[doc.game];
    if (filters && (!Object.hasOwn(filters.elements, profile.element) || !Object.hasOwn(filters.paths, profile.path))) {
      throw new Error(`Invalid character classification: ${doc.id}`);
    }
    const releaseDate = releaseDates[profile.characterId];
    if (doc.game === 'hsr' && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate || '')) throw new Error(`Missing release date: ${profile.id}`);
    return `<a class="character-tile" href="${prefix}guides/${doc.id}/index.html" data-character data-search="${escape([profile.name, ...(doc.tags || [])].join(' '))}" data-name="${escape(profile.name)}" data-release-date="${escape(releaseDate || '')}" data-element="${escape(profile.element || '')}" data-path="${escape(profile.path || '')}">
      ${image('characters', profile.characterId, prefix)}<span>${escape(profile.name)}</span>
    </a>`;
  }

  function partyTile(doc, prefix) {
    if (doc.partyGroup) {
      const leaders = doc.partyGroup.variants.map(id => {
        const variant = docs.find(item => item.id === id);
        return variant.party.members.find(member => member.id === variant.party.coreMemberIds[0]);
      });
      return `<a class="party-tile" href="${prefix}guides/${doc.id}/index.html" data-party="${doc.party.category}">
        <div class="party-faces">${leaders.map(member => image('characters', member.id, prefix, 'member-face', member.name)).join('')}</div>
        <strong>${escape(doc.title)}</strong><span>효광 · 아하 · 펄 <span aria-hidden="true">→</span></span>
      </a>`;
    }
    const group = groupForParty.get(doc.id);
    const destination = group ? `${group.id}/index.html?party=${doc.id}` : `${doc.id}/index.html`;
    return `<a class="party-tile" href="${prefix}guides/${destination}" data-party="${doc.party.category}">
      <div class="party-faces">${doc.party.members.map(member => partyPortrait(member, doc.party.alternatives || [], prefix)).join('')}</div>
      <strong>${escape(doc.party.lead)}</strong><span>${escape(doc.party.variant || '메인 딜러 편성')} <span aria-hidden="true">→</span></span>
    </a>`;
  }

  function partyPortrait(member, alternatives, prefix) {
    const replacements = alternatives.filter(candidate => candidate.replaces === member.id);
    const badges = replacements.map(candidate => {
      const label = `${member.name} 대체: ${candidate.name}`;
      const portrait = image('characters', candidate.id, prefix, 'alternative-face', label);
      return `<span title="${escape(label)}" data-replacement-badge="${member.id}">${portrait}</span>`;
    }).join('');
    const options = badges ? `<span class="portrait-options">${badges}</span>` : '';
    const portrait = image('characters', member.id, prefix, 'member-face', member.name);
    return `<span class="party-portrait">${portrait}${options}</span>`;
  }

  function gameCatalog(ownDocs, prefix, kinds, card) {
    const available = Object.keys(kinds).filter(kind => ownDocs.some(doc => doc.kind === kind));
    const defaultKind = available[0];
    const parties = ownDocs.filter(doc => doc.party);
    const partyCategories = Object.entries(categories).filter(([key]) => parties.some(doc => doc.party.category === key));
    return `<section class="visual-catalog" data-game-catalog data-default-kind="${defaultKind}" aria-label="게임 자료">
      <div class="filter-chips catalog-tabs" role="group" aria-label="자료 종류">${available.map(kind => `<button type="button" data-view="${kind}" aria-controls="catalog-${kind}" aria-pressed="${kind === defaultKind}">${kinds[kind]}</button>`).join('')}</div>
      ${available.map(kind => {
        const entries = ownDocs.filter(doc => doc.kind === kind);
        let content;
        if (kind === 'character') {
          const profileFor = new Map(profiles.map(profile => [profile.id, profile]));
          entries.sort((left, right) => {
            const a = profileFor.get(left.id);
            const b = profileFor.get(right.id);
            return (releaseDates[b.characterId] || '').localeCompare(releaseDates[a.characterId] || '') || byName(a.name, b.name);
          });
          const filters = characterFilters[entries[0].game];
          const filterControls = filters ? `<div class="character-filters">
              <fieldset class="character-facet"><legend>속성</legend><div class="facet-options">
                ${Object.entries(filters.elements).map(([key, name]) => `<button type="button" data-character-element="${key}" aria-pressed="false">${image('filters', 'element-' + key, prefix)}<span>${name}</span></button>`).join('')}
              </div></fieldset>
              <fieldset class="character-facet"><legend>운명의 길</legend><div class="facet-options">
                ${Object.entries(filters.paths).map(([key, name]) => `<button type="button" data-character-path="${key}" aria-pressed="false">${image('filters', 'path-' + key, prefix)}<span>${name}</span></button>`).join('')}
              </div></fieldset>
            </div>` : '';
          content = `<div class="search-box character-search"><label class="sr-only" for="character-query">캐릭터 검색</label><span aria-hidden="true">⌕</span><input id="character-query" type="search" placeholder="캐릭터 이름 검색" maxlength="80" data-character-query></div>
            ${filterControls}
            <div class="character-results"><p class="result-count" role="status" data-character-count>${entries.length}명</p>
              <label class="character-sort"><span>정렬</span><select data-character-sort>
                <option value="release-desc">출시순 (최신 먼저)</option><option value="release-asc">출시순 (오래된 먼저)</option>
                <option value="name-asc">가나다순 (오름차순)</option><option value="name-desc">가나다순 (내림차순)</option>
              </select></label><button type="button" data-character-clear hidden>조건 초기화</button></div>
            <div class="character-grid" data-character-grid>${entries.map(doc => characterTile(doc, prefix)).join('')}</div>
            <p class="empty-state" data-character-empty hidden>이 조건에 맞는 육성 가이드가 없어요. 검색어나 필터를 바꿔 주세요.</p>`;
        } else if (kind === 'party') {
          content = `<div class="filter-chips party-categories" role="group" aria-label="파티 유형">${partyCategories.map(([key, name], index) => `<button type="button" data-category="${key}" aria-pressed="${index === 0}">${name}</button>`).join('')}</div>
            <div class="section-heading"><h2 data-party-heading>메인 딜러 선택</h2><p class="eyebrow">작은 얼굴은 대체 후보</p></div>
            <div class="party-grid">${parties.map(doc => partyTile(doc, prefix)).join('')}</div>`;
        } else {
          content = `<div class="doc-grid">${entries.map(doc => card(doc, prefix)).join('')}</div>`;
        }
        return `<div id="catalog-${kind}" data-view-panel="${kind}"${kind === defaultKind ? '' : ' hidden'}>${content}</div>`;
      }).join('')}
    </section>`;
  }

  function sources(doc, profile) {
    const all = [...doc.sources, ...(profile?.sources || [])];
    const unique = all.filter((source, index) => all.findIndex(item => item.url === source.url) === index);
    return `<details class="article-sources"><summary>기준과 출처 · ${escape(doc.updated)}</summary><p>${escape(doc.basis)}</p><ul>${unique.map(source => `<li><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.label)} ↗</a></li>`).join('')}</ul></details>`;
  }

  function detailedSections(sections) {
    return sections.map(section => {
      const paragraphs = (section.paragraphs || []).map(text => `<p>${escape(text)}</p>`).join('');
      const bullets = section.bullets?.length
        ? `<ul>${section.bullets.map(text => `<li>${escape(text)}</li>`).join('')}</ul>`
        : '';
      return `<h3>${escape(section.title)}</h3>${paragraphs}${bullets}`;
    }).join('');
  }

  function characterDetail(doc, prefix) {
    const profile = profiles.find(item => item.id === doc.id);
    for (const stat of profile.targetStats) {
      if ([stat.value, stat.nearFinal, stat.final].some(value => typeof value !== 'string' || !value.trim())) {
        throw new Error(`Missing stat tier: ${doc.id}/${stat.label}`);
      }
    }
    const statNotes = [];
    function statNote(text, label) {
      if (!text) return '';
      const number = statNotes.length + 1;
      statNotes.push({ number, text, label, target: `stat-ref-${number}` });
      return `<span class="stat-note" data-stat-note><a class="stat-note-link" id="stat-ref-${number}" href="#stat-note-${number}" aria-label="${escape(label)} 각주 ${number}" aria-describedby="stat-tooltip-${number}"><sup>[${number}]</sup></a><span class="stat-tooltip" id="stat-tooltip-${number}" role="tooltip">${escape(text)}</span></span>`;
    }
    const tiers = [['value', '추천 스탯'], ['nearFinal', '준종결'], ['final', '종결']];
    const statRows = profile.targetStats.map((stat, index) => {
      const rowId = `stat-row-${index + 1}`;
      const label = `<th scope="row" id="${rowId}-label">${escape(stat.label)}${statNote(stat.condition, stat.label)}</th>`;
      const cells = tiers.map(([key, title]) => {
        const cellId = `${rowId}-${key}`;
        return `<td id="${cellId}" data-tier="${title}">${escape(stat[key])}${statNote(stat.notes?.[key], `${stat.label} · ${title}`)}</td>`;
      }).join('');
      return `<tr id="${rowId}">${label}${cells}</tr>`;
    }).join('');
    const coneButtons = profile.cones.map((cone, index) => `<button class="cone-choice" type="button" data-choice="cone-${index}" aria-controls="cone-${index}" aria-pressed="${index === 0}">
      ${image('cones', cone.id, prefix)}<span>${escape(cone.name)}</span><small>${escape(cone.tag)}</small></button>`).join('');
    const conePanels = profile.cones.map((cone, index) => `<div class="equipment-description" id="cone-${index}" data-choice-panel${index ? ' hidden' : ''}>
      <h3>${escape(cone.name)}</h3><p>${escape(cone.short)}</p><details><summary>효과 자세히</summary><p>${escape(cone.detail)}</p></details></div>`).join('');
    const relicPanels = profile.relicBuilds.map((build, index) => {
      const cavern = build.cavernSets.flatMap(set => Array(set.pieces).fill(set.id));
      const pieces = Object.keys(slots).map((slot, slotIndex) => {
        const setId = slotIndex < 4 ? cavern[slotIndex] : build.planarSet;
        const set = assets.relicSets[setId];
        if (!set?.pieces[slot]) throw new Error(`Missing relic piece: ${setId}/${slot}`);
        const substats = substatsForSlot(build.mainStats[slot], build.substats);
        return `<li class="relic-piece"><span class="eyebrow">${slots[slot]}</span><img src="${prefix}${set.pieces[slot]}" alt="${escape(set.name)} · ${slots[slot]}" width="128" height="128" loading="lazy">
          <span class="eyebrow">주옵션</span><strong>${escape(build.mainStats[slot])}</strong><span class="relic-substats"><span class="stat-label">부옵션</span>${escape(substats.join(' · '))}</span></li>`;
      }).join('');
      return `<div id="relic-${index}" data-choice-panel${index ? ' hidden' : ''}>
        <p class="set-names">${build.cavernSets.map(set => `${escape(assets.relicSets[set.id].name)} ${set.pieces}`).join(' + ')} · ${escape(assets.relicSets[build.planarSet].name)} 2</p>
        <ul class="relic-grid">${pieces}</ul><details class="equipment-reason"><summary>이 조합을 추천하는 이유</summary><p>${escape(build.reason)}</p></details>
      </div>`;
    }).join('');
    const relatedParties = docs.filter(item => item.party && (profile.related.includes(item.id) || item.party.members.some(member => member.guideId === doc.id)));
    return `<a class="back-link" href="${prefix}games/hsr/index.html?view=character">← 캐릭터 육성</a>
      <header class="profile-header">${image('characters', profile.characterId, prefix, 'profile-portrait')}<div><p class="eyebrow">캐릭터 육성</p><h1>${escape(profile.name)}</h1><p>${escape(profile.role)}</p></div></header>
      <nav class="profile-nav" aria-label="육성 항목"><a href="#cones">광추</a><a href="#relics">유물</a><a href="#targets">이잘키</a><a href="#eidolons">성혼</a><a href="#parties">추천 파티</a></nav>
      <article class="visual-article">
        <section class="visual-section" id="cones" data-choice-group>
          <h2>추천 광추</h2>
          <div class="cone-grid" style="--cone-columns:${profile.cones.length}">${coneButtons}</div>
          ${conePanels}
        </section>
        <section class="visual-section" id="relics" data-choice-group><h2>추천 유물</h2><div class="filter-chips build-choices" role="group" aria-label="유물 세팅">${profile.relicBuilds.map((build, index) => `<button type="button" data-choice="relic-${index}" aria-controls="relic-${index}" aria-pressed="${index === 0}">${escape(build.name)}</button>`).join('')}</div>${relicPanels}</section>
        <section class="visual-section" id="targets">
          <h2>이 정도면 잘 키웠다</h2>
          <p class="eyebrow">세팅에 따른 목표값 · —는 출처에 별도 기준 없음</p>
          <table class="stat-tier-table">
            <caption class="sr-only">${escape(profile.name)} 추천 스탯·준종결·종결 비교</caption>
            <thead><tr><th scope="col">스탯</th><th scope="col">추천 스탯</th><th scope="col">준종결</th><th scope="col">종결</th></tr></thead>
            <tbody>${statRows}</tbody>
          </table>
          <details class="equipment-reason"><summary>육성 단계의 기준</summary><p>${escape(profile.targetNote)}</p></details>
${statNotes.length ? `          <div class="stat-footnotes">
            <h3>스탯 조건과 각주</h3>
            <ol>${statNotes.map(note => `<li id="stat-note-${note.number}" tabindex="-1"><strong>${escape(note.label)}</strong> ${escape(note.text)} <a href="#${note.target}" aria-label="${escape(note.label)} 스탯으로 돌아가기">↑</a></li>`).join('')}</ol>
          </div>` : ''}
        </section>
        <section class="visual-section" id="eidolons"><h2>성혼과 추천 돌파</h2><p class="investment-note">${escape(profile.eidolonAdvice)}</p><div class="eidolon-list">${profile.eidolons.map(eidolon => `<details><summary><span class="eidolon-number">${eidolon.level}</span><span>${escape(eidolon.short)}</span>${eidolon.recommended ? '<span class="recommend-tag">추천</span>' : ''}</summary><p>${escape(eidolon.detail)}</p></details>`).join('')}</div></section>
        <section class="visual-section" id="parties"><h2>추천 파티</h2><div class="party-grid">${relatedParties.map(party => partyTile(party, prefix)).join('')}</div></section>
        <details class="article-sources">
          <summary>기본 운영과 행적</summary>
          ${detailedSections(doc.sections)}
          <a class="text-link" href="${prefix}tools/aha/index.html">아하 속도 계산기 →</a>
        </details>
        ${sources(doc, profile)}
      </article>`;
  }

  function partyDetail(doc, prefix) {
    const party = doc.party;
    const memberIds = new Set(party.members.map(member => member.id));
    if (party.members.length !== 4 || memberIds.size !== 4) {
      throw new Error(`Invalid party members: ${doc.id}`);
    }
    if (party.members.filter(member => Number(member.id) >= 8000).length > 1) {
      throw new Error(`Duplicate Trailblazer: ${doc.id}`);
    }
    const coreIds = new Set(party.coreMemberIds);
    if (!coreIds.size || coreIds.size !== party.coreMemberIds.length || [...coreIds].some(id => !memberIds.has(id))) {
      throw new Error(`Invalid party core: ${doc.id}`);
    }
    const replacementPairs = new Set();
    for (const alternative of party.alternatives || []) {
      if (!memberIds.has(alternative.replaces)) {
        throw new Error(`Missing replacement target: ${doc.id}/${alternative.name}`);
      }
      if (coreIds.has(alternative.replaces)) {
        throw new Error(`Cannot replace party core: ${doc.id}/${alternative.name}`);
      }
      const pair = `${alternative.replaces}:${alternative.id}`;
      if (memberIds.has(alternative.id) || replacementPairs.has(pair) || !alternative.reason?.trim()) {
        throw new Error(`Invalid replacement: ${doc.id}/${alternative.name}`);
      }
      if (Number(alternative.id) >= 8000 && party.members.some(member => Number(member.id) >= 8000 && member.id !== alternative.replaces)) {
        throw new Error(`Duplicate Trailblazer replacement: ${doc.id}/${alternative.name}`);
      }
      replacementPairs.add(pair);
    }
    const roster = party.members.map(member => {
      const content = `${partyPortrait(member, party.alternatives || [], prefix)}<strong>${escape(member.name)}</strong><span>${escape(member.role)}</span>`;
      const card = member.guideId
        ? `<a class="roster-member" href="${prefix}guides/${member.guideId}/index.html">${content}<small>육성 보기 →</small></a>`
        : `<div class="roster-member">${content}</div>`;
      const alternatives = (party.alternatives || []).filter(alternative => alternative.replaces === member.id);
      const alternativesHtml = alternatives.length ? `
        <div class="slot-alternatives">
          <p class="replacement-label">${escape(member.name)} 대체</p>
          <ul>${alternatives.map(alternative => {
            const profile = profiles.find(item => item.characterId === alternative.id);
            return `<li data-replaces="${member.id}">
              <div class="replacement-character">${image('characters', alternative.id, prefix)}<strong>${escape(alternative.name)}</strong></div>
              <details><summary>교체할 때 확인</summary><p>${escape(alternative.reason)}</p></details>${profile ? `<a class="text-link" href="${prefix}guides/${profile.id}/index.html">육성 보기 →</a>` : ''}
            </li>`;
          }).join('')}</ul>
        </div>` : '';
      return `<div class="roster-slot" data-member-id="${member.id}">${card}${alternativesHtml}</div>`;
    }).join('');
    const grouped = groupForParty.has(doc.id);
    const heading = grouped ? `<h2>${escape(party.lead)}</h2>` : `<h1>${escape(party.lead)}</h1>`;
    return `${grouped ? '' : `<a class="back-link" href="${prefix}games/hsr/index.html?view=party&category=${party.category}">← ${categories[party.category]} 파티</a>`}
      <header class="party-header">${heading}<p>${escape(doc.summary)}</p></header>
      <article class="visual-article">
        <section class="visual-section">
          <h2>추천 편성</h2><div class="roster-grid">${roster}</div>
          <p class="party-note">${escape(party.note)}</p>
        </section>
        <section class="visual-section">
          <h2>이렇게 운영하세요</h2>
          <ol class="rotation-steps">${party.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol>${doc.sections.length ? `
          <details class="equipment-reason"><summary>편성과 운영 자세히</summary>${detailedSections(doc.sections)}</details>` : ''}
        </section>
        ${sources(doc)}
      </article>`;
  }
  function partyGroupDetail(group, prefix) {
    const variants = group.variants.map(id => docs.find(doc => doc.id === id));
    const buttons = variants.map((doc, index) => {
      const member = doc.party.members.find(item => item.id === doc.party.coreMemberIds[0]);
      return `<button type="button" class="party-lead-choice" data-choice="party-${doc.id}" aria-controls="party-${doc.id}" aria-pressed="${index === 0}">${image('characters', member.id, prefix)}<span>${escape(doc.party.lead)}</span></button>`;
    }).join('');
    const panels = variants.map((doc, index) => `<div id="party-${doc.id}" data-choice-panel${index ? ' hidden' : ''}>${partyDetail(doc, prefix)}</div>`).join('');
    return `<a class="back-link" href="${prefix}games/hsr/index.html?view=party&category=${group.category}">← ${categories[group.category]} 파티</a>
      <header class="party-header"><h1>${escape(group.title)}</h1><p>효광 · 아하 · 펄 기본 편성</p></header>
      <section data-choice-group data-party-group aria-label="메인 딜러별 파티">
        <div class="party-lead-choices" role="group" aria-label="메인 딜러 선택">${buttons}</div>${panels}
      </section>`;
  }
  return { characterTile, partyTile, gameCatalog, characterDetail, partyDetail, partyGroupDetail };
}

module.exports = { createVisuals, categories, slots, substatsForSlot };
