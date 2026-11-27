const { TYPES } = require('./calendar.js');

function calendarSection(data, games, escape, scriptVersion) {
  const payload = { ...data, games: games.map(game => ({ id: game.id, name: game.name, image: `site/assets/games/${game.id}.jpg` })) };
  return `<section class="home-section game-calendar" data-game-calendar aria-labelledby="calendar-title">
    <div class="section-heading horizontal"><div><p class="eyebrow">놓치지 말아야 할 일정</p><h2 id="calendar-title">지금부터 6주</h2></div><span class="calendar-range" data-calendar-range></span></div>
    <div class="calendar-controls"><div class="calendar-games" role="group" aria-label="게임 일정 표시">${games.map(game => `<button type="button" data-calendar-game="${game.id}" aria-pressed="true"><img src="site/assets/games/${game.id}.jpg" width="28" height="28" alt=""><span>${escape(game.name)}</span></button>`).join('')}</div><label class="calendar-offline"><input type="checkbox" data-calendar-offline checked> 국내 공식행사</label></div>
    <div class="calendar-key">${Object.entries(TYPES).map(([id, label]) => `<span data-kind="${id}"><i aria-hidden="true"></i>${label}</span>`).join('')}</div>
    <div class="calendar-scroll" tabindex="0" role="region" aria-label="6주 일정표. 위아래로 스크롤할 수 있습니다."><div class="calendar-head"><span>일정 · 공지 바로가기</span><div class="calendar-axis" data-calendar-axis></div><span>보상</span></div><div data-calendar-rows></div><p class="calendar-empty" data-calendar-empty hidden>선택한 항목의 확정 일정이 없습니다.</p></div>
    <div class="calendar-footer"><span data-calendar-count role="status" aria-live="polite"></span><span data-calendar-checked></span></div>
    <details class="calendar-sources"><summary>일정 안내</summary><p>공식 발표에서 날짜와 보상을 확인한 일정입니다. 행사명을 누르면 공지로 이동합니다. 보상은 참여 조건에 따라 지급되며, 미공개 수량은 표시하지 않습니다. 점 표시는 방송·업데이트 또는 종료일 미공개 일정입니다. 국내 공식행사는 게임 선택과 별도로 표시합니다.</p>${(data.coverage || []).map(item => `<p><strong>${escape(games.find(game => game.id === item.game)?.name || '국내 공식행사')}</strong> · ${escape(item.note)} ${item.sourceUrls?.length ? `<a href="${escape(item.sourceUrls[0])}" target="_blank" rel="noopener noreferrer">공식 안내 ↗</a>` : ''}</p>`).join('')}</details>
    <noscript><p>일정표의 게임 선택과 기간 표시에는 JavaScript가 필요합니다.</p></noscript>
    <script type="application/json" id="game-calendar-data">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script><script src="site/calendar.js?v=${scriptVersion}" defer></script>
  </section>`;
}
module.exports = { calendarSection };
