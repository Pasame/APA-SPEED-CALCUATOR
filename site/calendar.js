(function (root) {
  'use strict';
  const DAY = 86400000;
  const TYPES = { gacha: '픽업·뽑기', event: '플레이', login: '출석', broadcast: '공식 방송', update: '버전 업데이트', offline: '국내 공식행사' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stamp = value => Date.parse(value.length === 10 ? `${value}T00:00:00+09:00` : value);
  const dateKey = value => new Date(value + 9 * 3600000).toISOString().slice(0, 10);
  const shortDate = value => { const s = dateKey(value); return `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`; };
  function windowFor(now = Date.now()) {
    const start = stamp(dateKey(now));
    return { start, end: start + 42 * DAY, now };
  }
  function visible(event, window, selected, offline) {
    if (event.type === 'offline' ? !offline : !selected.has(event.game)) return false;
    const start = stamp(event.start);
    if (start >= window.end) return false;
    if (event.instant) return start >= (event.start.length === 10 ? window.start : window.now);
    return event.end ? stamp(event.end) > window.now : Boolean(event.endUnknown && start >= window.start);
  }
  function position(event, window) {
    const start = stamp(event.start);
    const end = event.end ? stamp(event.end) : start;
    const point = event.instant || !event.end;
    const left = Math.max(0, Math.min(100, (start - window.start) / (42 * DAY) * 100));
    return { left, width: point ? 0 : Math.max(0, (Math.min(end, window.end) - Math.max(start, window.start)) / (42 * DAY) * 100), point, before: start < window.start, after: end > window.end };
  }
  function dateText(value, exclusive = false) {
    let time = stamp(value);
    if (exclusive) time -= value.length === 10 ? DAY : 60000;
    const date = new Date(time + 9 * 3600000);
    return shortDate(time) + (value.length === 10 ? '' : ` ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`);
  }
  function period(event) {
    if (event.instant) return dateText(event.start);
    return `${dateText(event.start)} → ${event.endDisplay || (event.end ? dateText(event.end, true) : '종료 미공개')}`;
  }
  function rewards(event) {
    const items = (event.rewards || []).map(reward => `<span class="calendar-reward">${reward.image ? `<img src="${esc(reward.image)}" width="32" height="32" alt="" loading="lazy">` : ''}<span>${esc(reward.name)}${reward.quantity != null ? `<b> ×${esc(reward.quantity.toLocaleString('ko-KR'))}</b>` : ''}${reward.note ? `<small>${esc(reward.note)}</small>` : ''}</span></span>`);
    return items.slice(0, 3).join('') + (items.length > 3 ? `<details class="calendar-more" data-calendar-detail="rewards"><summary>보상 ${items.length - 3}개 더</summary>${items.slice(3).join('')}</details>` : '');
  }
  function renderRow(event, window, games) {
    const pos = position(event, window), game = games.find(g => g.id === event.game);
    const status = event.endUnknown ? '종료 미공개' : event.instant ? TYPES[event.type] : stamp(event.start) > window.now ? '예정' : '진행 중';
    return `<article class="calendar-row" data-calendar-row="${esc(event.id)}" data-game="${esc(event.game)}" data-kind="${esc(event.type)}">
      <div class="calendar-label"><div class="calendar-meta"><img src="${esc(game.image)}" width="22" height="22" alt="${esc(game.name)}"><span class="calendar-type">${TYPES[event.type]}</span></div><a href="${esc(event.sourceUrl)}" target="_blank" rel="noopener noreferrer" title="${esc(event.sourceLabel || '공식 안내')} 새 창">${esc(event.title)} <span aria-hidden="true">↗</span></a><small>${esc(period(event))}${event.location ? `<br>${esc(event.location)}` : ''}</small>${event.notes ? `<details class="calendar-note"><summary>참여 안내</summary><p>${esc(event.notes)}</p></details>` : ''}</div>
      <div class="calendar-track" role="img" aria-label="${esc(event.title)}: ${esc(period(event))}"><span class="calendar-bar${pos.point ? ' is-point' : ''}${event.endUnknown ? ' is-unknown' : ''}" style="--left:${pos.left}%;--width:${pos.width}%" title="${esc(period(event))}">${pos.before && !pos.point ? '<span class="bar-edge">‹</span>' : ''}<span class="sr-only">${esc(status)}</span>${pos.after ? '<span class="bar-edge end">›</span>' : ''}</span></div>
      <div class="calendar-rewards" aria-label="확인된 보상">${rewards(event)}</div>
    </article>`;
  }
  function mount(section, data) {
    const buttons = [...section.querySelectorAll('[data-calendar-game]')];
    const checkbox = section.querySelector('[data-calendar-offline]');
    const rows = section.querySelector('[data-calendar-rows]');
    const axis = section.querySelector('[data-calendar-axis]');
    let signature;
    function render() {
      const window = windowFor();
      const selected = new Set(buttons.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.calendarGame));
      const events = data.events.filter(e => visible(e, window, selected, checkbox.checked)).sort((a, b) => {
        const aUpcoming = stamp(a.start) > window.now, bUpcoming = stamp(b.start) > window.now;
        if (aUpcoming !== bUpcoming) return Number(aUpcoming) - Number(bUpcoming);
        const aDate = aUpcoming ? stamp(a.start) : a.end ? stamp(a.end) : Infinity;
        const bDate = bUpcoming ? stamp(b.start) : b.end ? stamp(b.end) : Infinity;
        return aDate - bDate || data.games.findIndex(g => g.id === a.game) - data.games.findIndex(g => g.id === b.game) || stamp(a.start) - stamp(b.start);
      });
      axis.innerHTML = Array.from({ length: 6 }, (_, i) => `<span>${shortDate(window.start + i * 7 * DAY)}${i === 0 ? '<small>오늘</small>' : ''}</span>`).join('');
      section.querySelector('[data-calendar-range]').textContent = `${shortDate(window.start)}–${shortDate(window.end - DAY)} · 한국 시간`;
      section.querySelector('[data-calendar-count]').textContent = `${events.length}개 일정`;
      const nextSignature = `${window.start}:${events.map(event => event.id).join(',')}`;
      if (nextSignature !== signature) {
        const detailKey = note => `${note.closest('[data-calendar-row]').dataset.calendarRow}:${note.dataset.calendarDetail || 'notes'}`;
        const expanded = new Set([...rows.querySelectorAll?.('details[open]') || []].map(detailKey));
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        const focusedRow = active?.closest?.('[data-calendar-row]')?.dataset.calendarRow;
        const focusedTag = active?.tagName === 'SUMMARY' ? 'summary' : 'a';
        const focusedReward = active?.closest?.('[data-calendar-detail="rewards"]');
        rows.innerHTML = events.map(event => renderRow(event, window, data.games)).join('');
        for (const row of rows.querySelectorAll?.('[data-calendar-row]') || []) {
          for (const note of row.querySelectorAll('details')) if (expanded.has(detailKey(note))) note.open = true;
          if (row.dataset.calendarRow === focusedRow) row.querySelector(focusedReward ? '.calendar-more summary' : focusedTag)?.focus();
        }
        signature = nextSignature;
      }
      section.querySelector('[data-calendar-empty]').hidden = events.length > 0;
      const stale = window.now - stamp(data.checkedAt) >= 7 * DAY;
      section.querySelector('[data-calendar-checked]').textContent = `${data.checkedAt.replaceAll('-', '.')} 확인${stale ? ' · 새 일정은 공식 공지도 확인해 주세요.' : ''}`;
    }
    for (const button of buttons) button.addEventListener('click', () => { button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true')); render(); });
    checkbox.addEventListener('change', render);
    render();
    // Update day/status after returning to a tab; no network request is needed.
    root.addEventListener('focus', render);
    return { render };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { TYPES, stamp, windowFor, visible, position, dateText, period, renderRow, mount };
  else {
    const section = document.querySelector('[data-game-calendar]');
    if (section) mount(section, JSON.parse(document.getElementById('game-calendar-data').textContent));
  }
})(typeof window !== 'undefined' ? window : globalThis);
