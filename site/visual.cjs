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

function createVisuals({ profiles, assets, docs, escape }) {
  function image(group, id, prefix, className = '', alt = '') {
    const asset = assets[group][id];
    if (!asset) throw new Error(`Missing ${group} image: ${id}`);
    return `<img class="${className}" src="${prefix}${asset.path}" alt="${escape(alt)}" loading="lazy" width="256" height="256">`;
  }

  function characterTile(doc, prefix) {
    const profile = profiles.find(item => item.id === doc.id);
    if (!profile) throw new Error(`Missing character profile: ${doc.id}`);
    return `<a class="character-tile" href="${prefix}guides/${doc.id}/index.html" data-character data-search="${escape([profile.name, ...(doc.tags || [])].join(' '))}">
      ${image('characters', profile.characterId, prefix)}<span>${escape(profile.name)}</span>
    </a>`;
  }

  function partyTile(doc, prefix) {
    return `<a class="party-tile" href="${prefix}guides/${doc.id}/index.html" data-party="${doc.party.category}">
      <div class="party-faces">${doc.party.members.map(member => image('characters', member.id, prefix, '', member.name)).join('')}</div>
      <strong>${escape(doc.party.lead)}</strong><span>${escape(doc.party.variant || '메인 딜러 편성')} <span aria-hidden="true">→</span></span>
    </a>`;
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
          content = `<div class="search-box character-search"><label class="sr-only" for="character-query">캐릭터 검색</label><span aria-hidden="true">⌕</span><input id="character-query" type="search" placeholder="캐릭터 이름 검색" maxlength="80" data-character-query></div>
            <p class="result-count" role="status" data-character-count>${entries.length}명</p>
            <div class="character-grid">${entries.map(doc => characterTile(doc, prefix)).join('')}</div>
            <p class="empty-state" data-character-empty hidden>찾는 캐릭터가 없어요. 이름을 다시 확인해 주세요.</p>`;
        } else if (kind === 'party') {
          content = `<div class="filter-chips party-categories" role="group" aria-label="파티 유형">${partyCategories.map(([key, name], index) => `<button type="button" data-category="${key}" aria-pressed="${index === 0}">${name}</button>`).join('')}</div>
            <div class="section-heading"><h2 data-party-heading>메인 딜러 선택</h2><p class="eyebrow">얼굴을 누르면 편성과 운영을 볼 수 있어요.</p></div>
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
        <section class="visual-section" id="cones" data-choice-group><h2>추천 광추</h2><div class="cone-grid">${coneButtons}</div>${conePanels}</section>
        <section class="visual-section" id="relics" data-choice-group><h2>추천 유물</h2><div class="filter-chips build-choices" role="group" aria-label="유물 세팅">${profile.relicBuilds.map((build, index) => `<button type="button" data-choice="relic-${index}" aria-controls="relic-${index}" aria-pressed="${index === 0}">${escape(build.name)}</button>`).join('')}</div>${relicPanels}</section>
        <section class="visual-section" id="targets"><h2>이 정도면 잘 키웠다</h2><div class="target-grid">${profile.targetStats.map(stat => `<div><span>${escape(stat.label)}</span><strong>${escape(stat.value)}</strong><p>${escape(stat.condition)}</p></div>`).join('')}</div><details class="equipment-reason"><summary>목표 스탯을 볼 때</summary><p>${escape(profile.targetNote)}</p></details></section>
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
    const roster = party.members.map(member => {
      const content = `${image('characters', member.id, prefix)}<strong>${escape(member.name)}</strong><span>${escape(member.role)}</span>`;
      return member.guideId ? `<a class="roster-member" href="${prefix}guides/${member.guideId}/index.html">${content}<small>육성 보기 →</small></a>` : `<div class="roster-member">${content}</div>`;
    }).join('');
    const alternates = (party.alternatives || []).map(member => `<div class="alternative-member">${member.id ? image('characters', member.id, prefix) : ''}<div><strong>${escape(member.name)}</strong><p>${escape(member.reason)}</p></div></div>`).join('');
    return `<a class="back-link" href="${prefix}games/hsr/index.html?view=party&category=${party.category}">← ${categories[party.category]} 파티</a>
      <header class="party-header"><p class="eyebrow">${categories[party.category]}</p><h1>${escape(party.lead)}</h1><p>${escape(doc.summary)}</p></header>
      <article class="visual-article">
        <section class="visual-section">
          <h2>추천 편성</h2><div class="roster-grid">${roster}</div>
          <p class="party-note">${escape(party.note)}</p>
        </section>
        <section class="visual-section">
          <h2>이렇게 운영하세요</h2>
          <ol class="rotation-steps">${party.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol>
          <details class="equipment-reason"><summary>편성과 운영 자세히</summary>${detailedSections(doc.sections)}</details>
        </section>
        ${alternates ? `<section class="visual-section"><h2>대체 멤버</h2><div class="alternative-grid">${alternates}</div></section>` : ''}
        ${sources(doc)}
      </article>`;
  }
  return { characterTile, partyTile, gameCatalog, characterDetail, partyDetail };
}

module.exports = { createVisuals, categories, slots, substatsForSlot };
