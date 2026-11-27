(function (root) {
  'use strict';
  const DAY = 86400000;
  const WEEK = 7 * DAY;
  const KST_OFFSET = 9 * 3600000;
  const TYPES = { gacha: '픽업·뽑기', event: '이벤트', login: '출석', broadcast: '공식 방송', update: '버전 업데이트', offline: '국내 공식행사' };
  const TYPE_PRIORITY = { gacha: 0, event: 1, login: 2, broadcast: 3, update: 3, offline: 4 };
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stamp = value => Date.parse(value.length === 10 ? value + 'T00:00:00+09:00' : value);
  const kstDate = value => new Date(value + KST_OFFSET);
  const shortDate = value => {
    const date = kstDate(value);
    return (date.getUTCMonth() + 1) + '/' + date.getUTCDate();
  };
  const pct = (value, window) => (value - window.start) / (window.end - window.start) * 100;

  function windowFor(now = Date.now()) {
    const today = stamp(kstDate(now).toISOString().slice(0, 10));
    return { start: today - DAY, today, end: today + 6 * WEEK, now };
  }

  function visible(event, window, selectedGames, selectedTypes) {
    if (!selectedTypes.has(event.type) || (event.type !== 'offline' && !selectedGames.has(event.game))) return false;
    const start = stamp(event.start);
    if (start >= window.end) return false;
    if (event.instant) return start >= (event.start.length === 10 ? window.today : window.now);
    return event.end ? stamp(event.end) > window.now : Boolean(event.endUnknown && start >= window.today);
  }

  function compareRows(a, b, window) {
    const displayedStart = event => Math.max(stamp(event.start), window.start);
    const end = event => event.end ? stamp(event.end) : Infinity;
    return displayedStart(a) - displayedStart(b) || end(a) - end(b) || TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
  }

  function position(event, window) {
    const start = stamp(event.start);
    const end = event.end ? stamp(event.end) : start;
    const point = event.instant || !event.end;
    const left = Math.max(0, Math.min(100, pct(start, window)));
    const width = point ? 0 : Math.max(0, pct(Math.min(end, window.end), window) - left);
    return { left, width, point, before: start < window.start, after: end > window.end };
  }

  function weeksFor(window) {
    const weeks = [];
    const firstSunday = window.start - kstDate(window.start).getUTCDay() * DAY;
    for (let sunday = firstSunday; sunday < window.end; sunday += WEEK) {
      // Thursday names the week-year, including the week that contains January 4.
      const thursday = kstDate(sunday + 4 * DAY);
      const year = thursday.getUTCFullYear();
      const number = Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / WEEK) + 1;
      const left = pct(Math.max(sunday, window.start), window);
      const width = pct(Math.min(sunday + WEEK, window.end), window) - left;
      weeks.push({ sunday, year, number, left, width, range: weekDate(sunday) + ' ~ ' + weekDate(sunday + 6 * DAY) });
    }
    return weeks;
  }

  function weekDate(value) {
    const date = kstDate(value);
    const numeric = date.toISOString().slice(2, 10).replaceAll('-', '/');
    return numeric + '(' + WEEKDAYS[date.getUTCDay()] + ')';
  }

  function dateText(value, exclusive = false) {
    let time = stamp(value);
    if (exclusive) time -= value.length === 10 ? DAY : 60000;
    const date = kstDate(time);
    const clock = date.toISOString().slice(11, 16);
    return shortDate(time) + (value.length === 10 ? '' : ' ' + clock);
  }

  function period(event) {
    if (event.instant) return dateText(event.start);
    return dateText(event.start) + ' → ' + (event.endDisplay || (event.end ? dateText(event.end, true) : '종료 미공개'));
  }

  function todayLine(header = false) {
    return '<span class="calendar-today" aria-hidden="true">' + (header ? '<span class="calendar-today-label">오늘</span>' : '') + '</span>';
  }

  function renderWeeks(weeks) {
    return weeks.map(week => {
      const label = week.year + '년 W' + week.number;
      return '<button type="button" class="calendar-week" data-calendar-week="' + week.sunday + '" aria-label="' + label + ', ' + week.range + '" aria-expanded="false" style="--left:' + week.left + '%;--width:' + week.width + '%">' +
        '<span class="calendar-week-label" aria-hidden="true"><span class="calendar-week-year">' + week.year + '</span><span class="calendar-week-number">W' + week.number + '</span></span>' +
        '<span class="calendar-week-range" aria-hidden="true">' + week.range + '</span></button>';
    }).join('') + todayLine(true);
  }

  function image(path, size) {
    return path ? '<img src="' + esc(path) + '" width="' + size + '" height="' + size + '" alt="" loading="lazy">' : '';
  }

  function rewardItems(event, limit) {
    const rewards = event.rewards || [];
    return rewards.slice(0, limit ?? rewards.length).map(reward => {
      const quantity = reward.quantity == null ? '' : '<b> ×' + esc(reward.quantity.toLocaleString('ko-KR')) + '</b>';
      const note = limit == null && reward.note ? '<small>' + esc(reward.note) + '</small>' : '';
      return '<span class="calendar-reward">' + image(reward.image, 32) + '<span>' + esc(reward.name) + quantity + note + '</span></span>';
    }).join('');
  }

  function pickupItems(event, showNames = false) {
    const pickups = event.pickups || [];
    return pickups.map(pickup => '<span class="calendar-pickup">' + image(pickup.image, showNames ? 44 : 28) + (showNames ? '<span>' + esc(pickup.name) + '</span>' : '') + '</span>').join('');
  }

  function renderRow(event, window, games) {
    const pos = position(event, window);
    const game = games.find(g => g.id === event.game);
    const short = pos.width < 29;
    const alignBefore = short && pos.left >= 40 && pos.left + pos.width > 65;
    const rewardCount = event.rewards?.length || 0;
    const extra = rewardCount > 3 ? '<span class="calendar-reward-extra">+' + (rewardCount - 3) + '</span>' : '';
    const label = [game.name, TYPES[event.type], event.title, period(event)].map(esc).join(' · ');
    const content = '<span class="calendar-bar-content"><span class="calendar-bar-game">' + image(game.image, 22) + '</span>' +
      '<span class="calendar-bar-title">' + esc(event.title) + '</span><span class="calendar-bar-period">' + esc(period(event)) + '</span>' +
      (event.pickups?.length ? '<span class="calendar-banner">' + pickupItems(event) + '</span>' : '') +
      (rewardCount ? '<span class="calendar-rewards">' + rewardItems(event, 3) + extra + '</span>' : '') + '</span>';
    const classes = ['calendar-bar', pos.point && 'is-point', event.endUnknown && 'is-unknown', short && 'is-short', alignBefore && 'align-label-before'].filter(Boolean).join(' ');
    return '<article class="calendar-row" data-calendar-row="' + esc(event.id) + '" data-game="' + esc(event.game) + '" data-kind="' + esc(event.type) + '">' +
      '<div class="calendar-track" style="--left:' + pos.left + '%;--width:' + pos.width + '%">' + todayLine() +
      '<button type="button" class="' + classes + '" data-calendar-event="' + esc(event.id) + '" aria-label="' + label + '" aria-expanded="false" aria-controls="calendar-tooltip">' +
      (short ? '<span class="calendar-short-label">' + content + '</span>' : content) +
      (pos.before && !pos.point ? '<span class="bar-edge" aria-hidden="true">‹</span>' : '') +
      (pos.after ? '<span class="bar-edge end" aria-hidden="true">›</span>' : '') + '</button></div></article>';
  }

  function renderDetails(event, games) {
    const game = games.find(g => g.id === event.game);
    const pickups = event.pickups?.length ? '<div class="calendar-tooltip-pickups"><strong>픽업 대상</strong><div>' + pickupItems(event, true) + '</div></div>' : '';
    const rewards = event.rewards?.length ? '<div class="calendar-tooltip-rewards"><strong>보상</strong><div class="calendar-rewards">' + rewardItems(event) + '</div></div>' : '';
    return '<div class="calendar-tooltip-heading">' + image(game.image, 28) + '<div><small>' + esc(game.name) + ' · ' + TYPES[event.type] + '</small><strong>' + esc(event.title) + '</strong></div></div>' +
      '<p class="calendar-tooltip-period">' + esc(period(event)) + '</p>' + (event.location ? '<p>' + esc(event.location) + '</p>' : '') + pickups + rewards +
      (event.notes ? '<p>' + esc(event.notes) + '</p>' : '') +
      '<a class="calendar-tooltip-source" href="' + esc(event.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(event.sourceLabel || '공식 안내') + ' ↗</a>';
  }

  function mount(section, data) {
    const games = [...section.querySelectorAll('[data-calendar-game]')];
    const types = [...section.querySelectorAll('[data-calendar-type]')];
    const rows = section.querySelector('[data-calendar-rows]');
    const axis = section.querySelector('[data-calendar-axis]');
    const scroll = section.querySelector('.calendar-scroll');
    const tooltip = section.querySelector('[data-calendar-tooltip]');
    const eventById = new Map(data.events.map(event => [event.id, event]));
    const selected = (buttons, key) => new Set(buttons.filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.dataset[key]));
    let signature;
    let axisStart;
    let activeTrigger;
    let dismissedTrigger;
    let sticky = false;
    let closeTimer;

    function reposition() {
      if (!activeTrigger) return;
      const anchor = activeTrigger.getBoundingClientRect();
      const bounds = scroll.getBoundingClientRect();
      if (anchor.bottom < Math.max(0, bounds.top) || anchor.top > Math.min(root.innerHeight, bounds.bottom) ||
          anchor.right < Math.max(0, bounds.left) || anchor.left > Math.min(root.innerWidth, bounds.right)) {
        hideDetails();
        return;
      }
      const size = tooltip.getBoundingClientRect();
      const x = Math.max(8, Math.min(anchor.left, root.innerWidth - size.width - 8));
      const below = anchor.bottom + 8;
      const y = below + size.height <= root.innerHeight - 8 ? below : Math.max(8, anchor.top - size.height - 8);
      tooltip.style.setProperty('--tooltip-x', x + 'px');
      tooltip.style.setProperty('--tooltip-y', y + 'px');
    }

    function hideDetails() {
      root.clearTimeout(closeTimer);
      activeTrigger?.setAttribute('aria-expanded', 'false');
      activeTrigger = undefined;
      sticky = false;
      tooltip.hidden = true;
    }

    function showDetails(trigger, pin = false) {
      if (!pin && (sticky || trigger === dismissedTrigger)) return;
      root.clearTimeout(closeTimer);
      if (trigger !== activeTrigger) {
        activeTrigger?.setAttribute('aria-expanded', 'false');
        activeTrigger = trigger;
        trigger.setAttribute('aria-expanded', 'true');
        tooltip.innerHTML = renderDetails(eventById.get(trigger.dataset.calendarEvent), data.games);
      }
      sticky = pin;
      tooltip.hidden = false;
      reposition();
    }

    function closeSoon() {
      if (!sticky && !activeTrigger?.matches(':focus-visible')) {
        root.clearTimeout(closeTimer);
        closeTimer = root.setTimeout(hideDetails, 160);
      }
    }

    function render() {
      const window = windowFor();
      const gameFilter = selected(games, 'calendarGame');
      const typeFilter = selected(types, 'calendarType');
      const events = data.events.filter(event => visible(event, window, gameFilter, typeFilter)).sort((a, b) => compareRows(a, b, window));
      if (axisStart !== window.start) {
        axisStart = window.start;
        const weeks = weeksFor(window);
        const grid = weeks.filter(week => week.left > 0).map(week => {
          const before = 'calc(' + week.left + '% - .5px)';
          const after = 'calc(' + week.left + '% + .5px)';
          return 'linear-gradient(to right, transparent ' + before + ', var(--line) ' + before + ' ' + after + ', transparent ' + after + ')';
        }).join(', ');
        scroll.style.setProperty('--today', pct(window.today, window) + '%');
        scroll.style.setProperty('--calendar-grid', grid);
        axis.innerHTML = renderWeeks(weeks);
      }
      section.querySelector('[data-calendar-range]').textContent = shortDate(window.today) + '–' + shortDate(window.end - DAY) + ' · 한국 시간';
      section.querySelector('[data-calendar-count]').textContent = events.length + '개 일정';
      const nextSignature = window.start + ':' + events.map(event => event.id).join(',');
      if (nextSignature !== signature) {
        const focusedEvent = root.document?.activeElement?.dataset.calendarEvent;
        const detailFocused = tooltip.contains?.(root.document?.activeElement);
        const restore = focusedEvent || (detailFocused && activeTrigger?.dataset.calendarEvent);
        hideDetails();
        rows.innerHTML = events.map(event => renderRow(event, window, data.games)).join('');
        if (restore) {
          const replacement = [...rows.querySelectorAll('[data-calendar-event]')].find(button => button.dataset.calendarEvent === restore);
          (replacement || scroll).focus({ preventScroll: true });
        }
        signature = nextSignature;
      }
      section.querySelector('[data-calendar-empty]').hidden = events.length > 0;
      const stale = window.now - stamp(data.checkedAt) >= WEEK;
      section.querySelector('[data-calendar-checked]').textContent = data.checkedAt.replaceAll('-', '.') + ' 확인' + (stale ? ' · 새 일정은 공식 공지도 확인해 주세요.' : '');
    }

    for (const button of [...games, ...types]) {
      button.addEventListener('click', () => {
        button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
        render();
      });
    }
    axis.addEventListener('click', event => {
      const week = event.target.closest('[data-calendar-week]');
      if (!week) return;
      const open = week.getAttribute('aria-expanded') !== 'true';
      for (const button of axis.querySelectorAll('[data-calendar-week]')) button.setAttribute('aria-expanded', 'false');
      week.setAttribute('aria-expanded', String(open));
      if (open) delete week.dataset.dismissed;
      else week.dataset.dismissed = '';
    });
    axis.addEventListener('pointerout', event => {
      const week = event.target.closest('[data-calendar-week]');
      if (week && !week.contains(event.relatedTarget)) delete week.dataset.dismissed;
    });
    axis.addEventListener('focusout', event => {
      const week = event.target.closest('[data-calendar-week]');
      if (week) delete week.dataset.dismissed;
    });
    rows.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch') return;
      const trigger = event.target.closest('[data-calendar-event]');
      if (!trigger || trigger.contains(event.relatedTarget)) return;
      dismissedTrigger = undefined;
      showDetails(trigger);
    });
    rows.addEventListener('pointerout', event => {
      const trigger = event.target.closest('[data-calendar-event]');
      if (trigger && !trigger.contains(event.relatedTarget)) closeSoon();
    });
    rows.addEventListener('focusin', event => {
      const trigger = event.target.closest('[data-calendar-event]');
      if (trigger) showDetails(trigger);
    });
    rows.addEventListener('focusout', event => {
      if (event.target === dismissedTrigger) dismissedTrigger = undefined;
      if (!tooltip.contains(event.relatedTarget)) closeSoon();
    });
    rows.addEventListener('click', event => {
      const trigger = event.target.closest('[data-calendar-event]');
      if (!trigger) return;
      if (sticky && trigger === activeTrigger) {
        dismissedTrigger = trigger;
        hideDetails();
      } else {
        dismissedTrigger = undefined;
        showDetails(trigger, true);
        if (event.detail === 0 && !tooltip.hidden) tooltip.querySelector('a')?.focus();
      }
    });
    tooltip.addEventListener('pointerenter', () => root.clearTimeout(closeTimer));
    tooltip.addEventListener('pointerleave', closeSoon);
    tooltip.addEventListener('focusout', event => {
      if (!tooltip.contains(event.relatedTarget)) hideDetails();
    });
    root.document?.addEventListener('pointerdown', event => {
      if (activeTrigger && !activeTrigger.contains(event.target) && !tooltip.contains(event.target)) hideDetails();
      if (!axis.contains(event.target)) {
        for (const week of axis.querySelectorAll('[aria-expanded="true"]')) week.setAttribute('aria-expanded', 'false');
      }
    });
    root.document?.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (activeTrigger) {
        dismissedTrigger = activeTrigger;
        const restoreFocus = tooltip.contains(root.document.activeElement);
        hideDetails();
        if (restoreFocus) dismissedTrigger.focus({ preventScroll: true });
      }
      for (const week of axis.querySelectorAll('[aria-expanded="true"], [data-calendar-week]:focus, [data-calendar-week]:hover')) {
        week.setAttribute('aria-expanded', 'false');
        week.dataset.dismissed = '';
      }
    });
    root.addEventListener('resize', reposition);
    root.addEventListener('scroll', reposition, true);
    root.addEventListener('focus', render);
    render();
    return { render };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TYPES, stamp, windowFor, visible, compareRows, position, weeksFor, period, renderWeeks, renderRow, renderDetails, mount };
  } else {
    const section = document.querySelector('[data-game-calendar]');
    if (section) mount(section, JSON.parse(document.getElementById('game-calendar-data').textContent));
  }
})(typeof window !== 'undefined' ? window : globalThis);
