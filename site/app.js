(() => {
  const chosungCache = new Map();
  function toChosung(text) {
    let cached = chosungCache.get(text);
    if (cached !== undefined) return cached;
    let result = '';
    for (const char of text) {
      const code = char.charCodeAt(0);
      result += code >= 0xac00 && code <= 0xd7a3 ? String.fromCharCode(0x1100 + Math.floor((code - 0xac00) / 588)) : char;
    }
    chosungCache.set(text, result);
    return result;
  }
  const hasChosung = text => /[\u1100-\u1112]/.test(text);
  function matchesQueryText(normalizedTarget, normalizedQuery) {
    if (!normalizedQuery) return true;
    if (normalizedTarget.includes(normalizedQuery)) return true;
    return hasChosung(normalizedQuery) && toChosung(normalizedTarget).includes(normalizedQuery);
  }

  const statNotes = [...document.querySelectorAll('[data-stat-note]')];
  if (statNotes.length) {
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      for (const note of statNotes) {
        note.dataset.dismissed = 'true';
        delete note.dataset.active;
      }
    });
  }
  for (const note of statNotes) {
    for (const event of ['pointerenter', 'focusin']) {
      note.addEventListener(event, () => {
        for (const other of statNotes) delete other.dataset.active;
        delete note.dataset.dismissed;
        note.dataset.active = 'true';
        const tooltip = note.querySelector('.stat-tooltip');
        const anchor = note.getBoundingClientRect();
        const trigger = note.querySelector('a').getBoundingClientRect();
        const box = tooltip.getBoundingClientRect();
        const left = Math.max(16, Math.min(trigger.left, document.documentElement.clientWidth - box.width - 16));
        tooltip.style.left = `${left - anchor.left}px`;
        tooltip.style.bottom = 'auto';
        const top = trigger.top >= box.height + 8 ? trigger.top - box.height : trigger.bottom;
        tooltip.style.top = `${top - anchor.top}px`;
      });
    }
    for (const event of ['pointerleave', 'focusout']) {
      note.addEventListener(event, () => { delete note.dataset.active; });
    }
  }
  const buildButtons = [...document.querySelectorAll('[data-build-choice]')];
  if (buildButtons.length) {
    const buildPanels = [...document.querySelectorAll('[data-build-panel]')];
    function showBuild(id) {
      const selected = buildButtons.find(button => button.dataset.buildChoice === id) || buildButtons[0];
      for (const button of buildButtons) button.setAttribute('aria-pressed', String(button.dataset.buildChoice === selected.dataset.buildChoice));
      for (const panel of buildPanels) panel.hidden = panel.dataset.buildPanel !== selected.dataset.buildChoice;
      for (const note of statNotes) delete note.dataset.active;
      return selected.dataset.buildChoice;
    }
    function readBuildLocation() {
      const linked = buildButtons.find(button => location.hash.startsWith(`#build-${button.dataset.buildChoice}-stat-`));
      const requested = linked?.dataset.buildChoice || new URLSearchParams(location.search).get('build');
      const selected = buildButtons.find(button => button.dataset.buildChoice === requested) || buildButtons[0];
      if (selected.getAttribute('aria-pressed') !== 'true') showBuild(selected.dataset.buildChoice);
    }
    for (const button of buildButtons) button.addEventListener('click', () => {
      const id = showBuild(button.dataset.buildChoice);
      const params = new URLSearchParams(location.search);
      params.set('build', id);
      const hash = location.hash.startsWith('#build-') ? '#targets' : location.hash;
      try { history.replaceState(null, '', location.pathname + '?' + params.toString() + hash); } catch { /* Offline files may restrict history. */ }
    });
    window.addEventListener('popstate', readBuildLocation);
    window.addEventListener('hashchange', readBuildLocation);
    readBuildLocation();
  }
  for (const group of document.querySelectorAll('[data-choice-group]')) {
    const buttons = [...group.querySelectorAll('[data-choice]')];
    const panels = [...group.querySelectorAll('[data-choice-panel]')];
    const isPartyGroup = group.dataset?.partyGroup !== undefined;

    function showChoice(button) {
      for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
      for (const panel of panels) panel.hidden = panel.id !== button.dataset.choice;
    }
    function readPartyLocation() {
      const party = new URLSearchParams(location.search).get('party');
      const selected = buttons.find(button => button.dataset.choice === `party-${party}`) || buttons[0];
      if (selected) showChoice(selected);
    }
    for (const button of buttons) button.addEventListener('click', () => {
      showChoice(button);
      if (!isPartyGroup) return;
      const params = new URLSearchParams(location.search);
      params.set('party', button.dataset.choice.slice('party-'.length));
      try { history.replaceState(null, '', location.pathname + '?' + params.toString() + location.hash); } catch { /* Local files may restrict history. */ }
    });
    if (isPartyGroup) {
      window.addEventListener('popstate', readPartyLocation);
      readPartyLocation();
    }
  }

  for (const preview of document.querySelectorAll('[data-party-preview]')) {
    const data = JSON.parse(preview.querySelector('[data-preview-data]').textContent);
    const selected = new Map(data.members.map(member => [member.id, member.id]));
    const slots = [...preview.querySelectorAll('[data-member-id]')];
    const buttons = [...preview.querySelectorAll('[data-party-option]')];
    const status = preview.querySelector('[data-preview-status]');
    const reset = preview.querySelector('[data-party-reset]');
    const operation = preview.querySelector('[data-preview-operation]');
    const operations = operation.querySelector('ul');

    function blockedReason(slot, id) {
      if (data.coreMemberIds.includes(slot) && id !== slot) return '메인 딜러는 변경할 수 없습니다.';
      if (id !== slot && !data.alternatives.some(item => item.replaces === slot && item.id === id)) return '이 자리의 대체 후보가 아닙니다.';
      for (const [otherSlot, otherId] of selected) {
        if (otherSlot === slot) continue;
        if (otherId === id) return '이미 다른 자리에 편성된 캐릭터입니다.';
        if (Number(otherId) >= 8000 && Number(id) >= 8000) return '개척자는 한 명만 편성할 수 있습니다.';
      }
      return '';
    }

    function renderPreview() {
      const changes = data.members.filter(member => selected.get(member.id) !== member.id);
      for (const slot of slots) {
        for (const card of slot.querySelectorAll('[data-member-preview]')) card.hidden = card.dataset.memberPreview !== selected.get(slot.dataset.memberId);
      }
      for (const button of buttons) {
        const blocked = blockedReason(button.dataset.slot, button.dataset.partyOption);
        button.setAttribute('aria-pressed', String(selected.get(button.dataset.slot) === button.dataset.partyOption));
        button.setAttribute('aria-disabled', String(Boolean(blocked)));
        if (blocked) button.setAttribute('title', blocked);
        else button.removeAttribute('title');
      }
      reset.hidden = !changes.length;
      preview.querySelector('[data-base-summary]').hidden = Boolean(changes.length);
      preview.querySelector('[data-base-note]').hidden = Boolean(changes.length);
      preview.querySelector('[data-base-operation]').hidden = Boolean(changes.length);
      preview.querySelector('[data-operation-heading]').textContent = changes.length > 1 ? '후보별 교체 조건' : changes.length ? '교체 후 운영·주의사항' : '이렇게 운영하세요';
      preview.querySelector('[data-preview-scope]').textContent = changes.length > 1
        ? '아래는 각 후보를 한 자리만 바꿀 때의 조건입니다. 여러 자리를 바꾼 조합 전체의 운영은 미검증입니다.'
        : '기본 편성에서 이 자리만 바꿀 때의 조건입니다.';
      operation.hidden = !changes.length;
      operations.replaceChildren();
      for (const member of changes) {
        const replacement = data.alternatives.find(item => item.replaces === member.id && item.id === selected.get(member.id));
        const item = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = `${member.name} → ${replacement.name}`;
        const reason = document.createElement('p');
        reason.textContent = replacement.reason;
        item.append(title, reason);
        operations.append(item);
      }
    }

    for (const button of buttons) button.addEventListener('click', () => {
      const slot = button.dataset.slot;
      const id = button.dataset.partyOption;
      const blocked = blockedReason(slot, id);
      if (blocked) { status.textContent = blocked; return; }
      selected.set(slot, id);
      renderPreview();
      const member = data.members.find(item => item.id === slot);
      const name = id === slot ? member.name : data.alternatives.find(item => item.replaces === slot && item.id === id).name;
      status.textContent = id === slot ? `${member.name} 기본 편성으로 복원했습니다.` : `${member.name} 대신 ${name} 편성`;
      if (button.closest('[hidden]')) buttons.find(item => item.dataset.slot === slot && item.dataset.partyOption === id && !item.closest('[hidden]'))?.focus();
    });
    reset.addEventListener('click', () => {
      for (const member of data.members) selected.set(member.id, member.id);
      renderPreview();
      status.textContent = '기본 편성으로 복원했습니다.';
      preview.querySelector('.roster-member:not([hidden]) a')?.focus();
    });
    renderPreview();
  }

  const gameCatalog = document.querySelector('[data-game-catalog]');
  if (gameCatalog) {
    const views = [...gameCatalog.querySelectorAll('[data-view]')];
    const panels = [...gameCatalog.querySelectorAll('[data-view-panel]')];
    const categories = [...gameCatalog.querySelectorAll('[data-category]')];
    const parties = [...gameCatalog.querySelectorAll('[data-party]')];
    const partyLinks = new Map(parties.map(party => [party, party.getAttribute('href')]));
    const partyVariants = new Map(parties.filter(party => party.dataset.partyVariants).map(party => [party, JSON.parse(party.dataset.partyVariants)]));
    const partySearch = gameCatalog.querySelector('[data-party-query]');
    const partyClear = gameCatalog.querySelector('[data-party-clear]');
    const characters = [...gameCatalog.querySelectorAll('[data-character]')];
    const search = gameCatalog.querySelector('[data-character-query]');
    const characterGrid = gameCatalog.querySelector('[data-character-grid]');
    const sort = gameCatalog.querySelector('[data-character-sort]');
    const elementButtons = [...gameCatalog.querySelectorAll('[data-character-element]')];
    const pathButtons = [...gameCatalog.querySelectorAll('[data-character-path]')];
    const clear = gameCatalog.querySelector('[data-character-clear]');
    const normalizeName = text => text.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s·•・★☆]/g, '');
    const byName = new Intl.Collator('ko').compare;
    const nameOrder = (left, right) => byName(left.dataset.name, right.dataset.name);
    const releaseOrder = (left, right, direction) => (
      direction * left.dataset.releaseDate.localeCompare(right.dataset.releaseDate) || nameOrder(left, right)
    );
    const characterOrders = {
      'release-desc': (left, right) => releaseOrder(left, right, -1),
      'release-asc': (left, right) => releaseOrder(left, right, 1),
      'name-asc': nameOrder,
      'name-desc': (left, right) => nameOrder(right, left),
    };
    const defaultSort = 'release-desc';
    let view = gameCatalog.dataset.defaultKind;
    let category = categories[0]?.dataset.category;
    let selectedElement = '';
    let selectedPath = '';
    let selectedSort = defaultSort;
    let renderedSort = defaultSort;

    function renderCatalog(writeLocation = false) {
      for (const button of views) button.setAttribute('aria-pressed', String(button.dataset.view === view));
      for (const panel of panels) panel.hidden = panel.dataset.viewPanel !== view;
      for (const button of categories) button.setAttribute('aria-pressed', String(button.dataset.category === category));
      const partyWords = (partySearch?.value || '').trim().split(/\s+/).filter(Boolean).map(normalizeName);
      let partyCount = 0;
      for (const party of parties) {
        const variants = partyVariants.get(party);
        const matchingVariant = variants?.find(variant => {
          const target = normalizeName(variant.search);
          return partyWords.every(word => matchesQueryText(target, word));
        });
        const partyTarget = variants ? '' : normalizeName(party.dataset.partySearch || '');
        const matches = variants ? Boolean(matchingVariant) : partyWords.every(word => matchesQueryText(partyTarget, word));
        party.hidden = party.dataset.party !== category || !matches;
        if (variants) party.setAttribute('href', partyWords.length && matchingVariant ? matchingVariant.href : partyLinks.get(party));
        if (!party.hidden) partyCount++;
      }
      if (partySearch) {
        gameCatalog.querySelector('[data-party-count]').textContent = `${partyCount}개 파티`;
        gameCatalog.querySelector('[data-party-empty]').hidden = partyCount !== 0;
        partyClear.hidden = !partySearch.value;
      }
      for (const button of elementButtons) button.setAttribute('aria-pressed', String(button.dataset.characterElement === selectedElement));
      for (const button of pathButtons) button.setAttribute('aria-pressed', String(button.dataset.characterPath === selectedPath));
      if (sort) {
        sort.value = selectedSort;
        if (selectedSort !== renderedSort) {
          characterGrid.append(...[...characters].sort(characterOrders[selectedSort]));
          renderedSort = selectedSort;
        }
      }
      let count = 0;
      const query = normalizeName(search?.value || '');
      for (const character of characters) {
        const matchesName = matchesQueryText(normalizeName(character.dataset.search), query);
        const matchesElement = !selectedElement || character.dataset.element === selectedElement;
        const matchesPath = !selectedPath || character.dataset.path === selectedPath;
        character.hidden = !(matchesName && matchesElement && matchesPath);
        if (!character.hidden) count++;
      }
      if (search) {
        gameCatalog.querySelector('[data-character-count]').textContent = `${count}명`;
        gameCatalog.querySelector('[data-character-empty]').hidden = count !== 0;
        clear.hidden = !search.value.trim() && !selectedElement && !selectedPath;
      }
      if (writeLocation) {
        const params = new URLSearchParams();
        params.set('view', view);
        if (view === 'party' && category) params.set('category', category);
        if (search?.value.trim()) params.set('q', search.value.trim());
        if (partySearch?.value.trim()) params.set('pq', partySearch.value.trim());
        if (selectedElement) params.set('element', selectedElement);
        if (selectedPath) params.set('path', selectedPath);
        if (sort && selectedSort !== defaultSort) params.set('sort', selectedSort);
        try { history.replaceState(null, '', location.pathname + '?' + params.toString()); } catch { /* Local files may restrict history. */ }
      }
    }

    function readCatalogLocation() {
      const params = new URLSearchParams(location.search);
      view = views.some(button => button.dataset.view === params.get('view')) ? params.get('view') : gameCatalog.dataset.defaultKind;
      category = categories.some(button => button.dataset.category === params.get('category')) ? params.get('category') : categories[0]?.dataset.category;
      if (search) search.value = (params.get('q') || '').slice(0, 80);
      if (partySearch) partySearch.value = (params.get('pq') || '').slice(0, 80);
      selectedElement = elementButtons.some(button => button.dataset.characterElement === params.get('element')) ? params.get('element') : '';
      selectedPath = pathButtons.some(button => button.dataset.characterPath === params.get('path')) ? params.get('path') : '';
      const requestedSort = params.get('sort');
      selectedSort = Object.hasOwn(characterOrders, requestedSort) ? requestedSort : defaultSort;
      renderCatalog();
    }
    for (const button of views) button.addEventListener('click', () => { view = button.dataset.view; renderCatalog(true); });
    for (const button of categories) button.addEventListener('click', () => { category = button.dataset.category; renderCatalog(true); });
    search?.addEventListener('input', () => renderCatalog(true));
    partySearch?.addEventListener('input', () => renderCatalog(true));
    partyClear?.addEventListener('click', () => {
      partySearch.value = '';
      renderCatalog(true);
      partySearch.focus();
    });
    sort?.addEventListener('change', () => {
      selectedSort = sort.value;
      renderCatalog(true);
    });
    for (const button of elementButtons) button.addEventListener('click', () => {
      selectedElement = selectedElement === button.dataset.characterElement ? '' : button.dataset.characterElement;
      renderCatalog(true);
    });
    for (const button of pathButtons) button.addEventListener('click', () => {
      selectedPath = selectedPath === button.dataset.characterPath ? '' : button.dataset.characterPath;
      renderCatalog(true);
    });
    clear?.addEventListener('click', () => {
      search.value = '';
      selectedElement = '';
      selectedPath = '';
      renderCatalog(true);
      search.focus();
    });
    window.addEventListener('popstate', readCatalogLocation);
    readCatalogLocation();
  }

  const catalog = document.querySelector('[data-catalog]');
  if (!catalog) return;
  const query = catalog.querySelector('[data-query]');
  const game = catalog.querySelector('[data-game-filter]');
  const type = catalog.querySelector('[data-type-filter]');
  const entries = [...catalog.querySelectorAll('[data-entry]')];
  const chips = [...catalog.querySelectorAll('[data-kind-filter]')];
  let selectedKind = '';
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/[·•・★☆]/g, '').replace(/\s+/g, ' ').trim();
  const indexedEntries = entries.map(entry => ({
    entry,
    text: normalize(entry.dataset.search),
    compact: null,
    chosung: null,
    compactChosung: null,
  }));

  function readLocation() {
    const params = new URLSearchParams(location.search);
    if (query) query.value = (params.get('q') || '').slice(0, 120);
    if (game) { game.value = params.get('game') || ''; if (game.selectedIndex < 0) game.value = ''; }
    if (type) { type.value = params.get('kind') || ''; if (type.selectedIndex < 0) type.value = ''; }
  }
  function update(writeLocation = false) {
    const words = normalize(query?.value || '').split(' ').filter(Boolean);
    const selectedGame = game?.value || '';
    const kind = type?.value || selectedKind;
    let count = 0;
    for (const item of indexedEntries) {
      const { entry, text } = item;
      const matches = (!selectedGame || entry.dataset.game === selectedGame) && (!kind || entry.dataset.kind === kind) && words.every(word => {
        if (text.includes(word)) return true;
        if (!hasChosung(word)) return false;
        if (item.chosung === null) item.chosung = toChosung(text);
        if (item.chosung.includes(word)) return true;
        if (item.compactChosung === null) {
          item.compact = text.replace(/\s+/g, '');
          item.compactChosung = toChosung(item.compact);
        }
        return item.compactChosung.includes(word);
      });
      entry.hidden = !matches;
      if (matches) count++;
    }
    catalog.querySelector('[data-count]').textContent = `자료 ${count}개`;
    catalog.querySelector('[data-empty]').hidden = count !== 0;
    if (writeLocation && query) {
      const params = new URLSearchParams();
      if (query.value.trim()) params.set('q', query.value.trim());
      if (selectedGame) params.set('game', selectedGame);
      if (kind) params.set('kind', kind);
      try { history.replaceState(null, '', location.pathname + (params.size ? '?' + params.toString() : '')); } catch { /* Offline files may restrict history updates. */ }
    }
  }
  for (const field of [query, game, type].filter(Boolean)) field.addEventListener(field === query ? 'input' : 'change', () => update(true));
  catalog.querySelector('[data-search-form]')?.addEventListener('submit', event => { event.preventDefault(); update(true); });
  for (const chip of chips) chip.addEventListener('click', () => {
    selectedKind = chip.dataset.kindFilter;
    for (const item of chips) item.setAttribute('aria-pressed', String(item === chip));
    update();
  });
  catalog.querySelector('[data-clear]')?.addEventListener('click', () => { query.value = ''; game.value = ''; type.value = ''; update(true); query.focus(); });
  window.addEventListener('popstate', () => { readLocation(); update(); });
  readLocation();
  update();
})();
