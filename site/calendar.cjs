const { TYPES, DEFAULT_TYPES } = require('./calendar.js');
const pickups = require('./calendar-pickups.json');

function calendarSection(data, games, escape, scriptVersion) {
  const payload = {
    ...data,
    games: games.map(game => ({ id: game.id, name: game.name, image: `site/assets/games/${game.id}.jpg` })),
    events: data.events.map(event => pickups[event.id] ? { ...event, pickups: pickups[event.id] } : event)
  };
  return `<section class="home-section game-calendar" data-game-calendar aria-labelledby="calendar-title">
    <div class="section-heading horizontal"><h2 id="calendar-title">지금부터 6주</h2><span class="calendar-range" data-calendar-range></span></div>
    <div class="calendar-controls"><div class="calendar-games" role="group" aria-label="게임 일정 표시">${games.map(game => `<button type="button" data-calendar-game="${game.id}" aria-pressed="true"><img src="site/assets/games/${game.id}.jpg" width="28" height="28" alt=""><span>${escape(game.name)}</span></button>`).join('')}</div></div>
    <div class="calendar-categories" role="group" aria-label="일정 유형 표시">${Object.entries(TYPES).map(([id, label]) => `<button type="button" data-calendar-type="${id}" data-kind="${id}" aria-pressed="${DEFAULT_TYPES.has(id)}"><i aria-hidden="true"></i>${label}</button>`).join('')}</div>
    <div class="calendar-scroll" tabindex="0" role="region" aria-label="6주 일정표. 상하좌우로 스크롤할 수 있습니다."><div class="calendar-head"><div class="calendar-axis" data-calendar-axis></div></div><div data-calendar-rows></div><p class="calendar-empty" data-calendar-empty hidden>선택한 항목의 확정 일정이 없습니다.</p></div>
    <div class="calendar-tooltip" id="calendar-tooltip" data-calendar-tooltip role="region" aria-label="일정 상세" tabindex="-1" hidden></div>
    <div class="calendar-footer"><span data-calendar-count role="status" aria-live="polite"></span><span data-calendar-checked></span></div>
    <noscript><p>일정표의 게임 선택과 기간 표시에는 JavaScript가 필요합니다.</p></noscript>
    <script type="application/json" id="game-calendar-data">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script><script src="site/calendar.js?v=${scriptVersion}" defer></script>
  </section>`;
}
module.exports = { calendarSection };
