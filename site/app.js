(() => {
  const catalog = document.querySelector('[data-catalog]');
  if (!catalog) return;
  const query = catalog.querySelector('[data-query]');
  const game = catalog.querySelector('[data-game-filter]');
  const type = catalog.querySelector('[data-type-filter]');
  const entries = [...catalog.querySelectorAll('[data-entry]')];
  const chips = [...catalog.querySelectorAll('[data-kind-filter]')];
  let selectedKind = '';
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, ' ').trim();

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
