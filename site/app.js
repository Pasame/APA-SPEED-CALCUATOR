(() => {
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

  const gameCatalog = document.querySelector('[data-game-catalog]');
  if (gameCatalog) {
    const views = [...gameCatalog.querySelectorAll('[data-view]')];
    const panels = [...gameCatalog.querySelectorAll('[data-view-panel]')];
    const categories = [...gameCatalog.querySelectorAll('[data-category]')];
    const parties = [...gameCatalog.querySelectorAll('[data-party]')];
    const characters = [...gameCatalog.querySelectorAll('[data-character]')];
    const search = gameCatalog.querySelector('[data-character-query]');
    const characterGrid = gameCatalog.querySelector('[data-character-grid]');
    const sort = gameCatalog.querySelector('[data-character-sort]');
    const elementButtons = [...gameCatalog.querySelectorAll('[data-character-element]')];
    const pathButtons = [...gameCatalog.querySelectorAll('[data-character-path]')];
    const clear = gameCatalog.querySelector('[data-character-clear]');
    const normalizeName = text => text.normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s·•・]/g, '');
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
      for (const party of parties) party.hidden = party.dataset.party !== category;
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
        const matchesName = normalizeName(character.dataset.search).includes(query);
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
      selectedElement = elementButtons.some(button => button.dataset.characterElement === params.get('element')) ? params.get('element') : '';
      selectedPath = pathButtons.some(button => button.dataset.characterPath === params.get('path')) ? params.get('path') : '';
      const requestedSort = params.get('sort');
      selectedSort = Object.hasOwn(characterOrders, requestedSort) ? requestedSort : defaultSort;
      renderCatalog();
    }
    for (const button of views) button.addEventListener('click', () => { view = button.dataset.view; renderCatalog(true); });
    for (const button of categories) button.addEventListener('click', () => { category = button.dataset.category; renderCatalog(true); });
    search?.addEventListener('input', () => renderCatalog(true));
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
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/[·•・]/g, '').replace(/\s+/g, ' ').trim();

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
    for (const entry of entries) {
      const text = normalize(entry.dataset.search);
      const matches = (!selectedGame || entry.dataset.game === selectedGame) && (!kind || entry.dataset.kind === kind) && words.every(word => text.includes(word));
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
