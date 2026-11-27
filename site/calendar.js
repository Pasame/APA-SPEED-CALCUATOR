(function (root) {
  'use strict';
  const DAY = 86400000;
  const WEEK = 7 * DAY;
  const KST_OFFSET = 9 * 3600000;
  const TYPES = {
    gacha: '픽업·뽑기',
    event: '인게임 이벤트',
    endgame: '엔드 콘텐츠',
    web: '웹 이벤트',
    login: '누적 출석',
    claim: '접속 보상',
    broadcast: '공식 방송',
    update: '버전 업데이트',
    offline: '국내 공식행사',
  };
  const DEFAULT_TYPES = new Set(['gacha', 'event', 'broadcast', 'update']);
  const TYPE_PRIORITY = { gacha: 0, event: 1, endgame: 1, web: 1, login: 2, claim: 2, broadcast: 3, update: 3, offline: 4 };
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

  function groupEvents(events, today = windowFor().today) {
    const groups = new Map();
    for (const event of events) {
      const start = stamp(event.start);
      const end = event.end ? stamp(event.end) : NaN;
      const confirmedVersion = typeof event.version === 'string' && event.version.trim();
      const canGroup = confirmedVersion && Number.isFinite(start) && Number.isFinite(end) && !event.instant && !event.endUnknown && event.type !== 'offline';
      const startKey = start < today ? 'ongoing' : start;
      const key = canGroup ? 'group:' + JSON.stringify([event.game, confirmedVersion, event.type, startKey, end]) : 'event:' + event.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    }
    return [...groups].map(([key, members]) => {
      if (members.length === 1) return members[0];
      const representative = members[0];
      const earliest = members.reduce((a, b) => stamp(a.start) <= stamp(b.start) ? a : b);
      const differentStarts = members.some(event => stamp(event.start) !== stamp(earliest.start));
      const pickups = new Map();
      for (const pickup of members.flatMap(event => event.pickups || [])) {
        if (!pickups.get(pickup.name)?.image) pickups.set(pickup.name, pickup);
      }
      let representativeTitle = representative.title;
      if (representative.type === 'gacha') {
        const names = members.map(event => event.pickups?.[0]?.name);
        representativeTitle = names.every(Boolean)
          ? [...new Set(names)].join(' · ') + ' 픽업'
          : [...new Set(members.map(event => event.title))].join(' · ');
      }
      return {
        ...representative,
        id: key,
        title: representative.version.trim() + ' · ' + members.length + '개 일정',
        representativeTitle,
        start: earliest.start,
        differentStarts,
        endDisplay: members.every(event => event.endDisplay === representative.endDisplay) ? representative.endDisplay : undefined,
        pickups: [...pickups.values()],
        members,
      };
    });
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
    if (event.differentStarts) return (event.endDisplay || dateText(event.end, true)) + ' 종료';
    return dateText(event.start) + ' → ' + (event.endDisplay || (event.end ? dateText(event.end, true) : '종료 미공개'));
  }

  function todayLine(header = false) {
    return '<span class="calendar-today" aria-hidden="true">' + (header ? '<span class="calendar-today-label">오늘</span>' : '') + '</span>';
  }

  function versionInWeek(timeline, sunday, now) {
    const before = timeline.findLast(entry => entry.time < sunday);
    const transitions = timeline.filter(entry => entry.time >= sunday && entry.time < sunday + WEEK);
    if (transitions.length) return [before, ...transitions].filter(Boolean).map(entry => entry.version).join(' → ');
    if (!before) return '';
    return before.version + (!before.unknown && (before.estimated || before.time > now) ? ' (예상)' : '');
  }

  function versionStamp(value) {
    if (!value) return NaN;
    const kst = value.length > 10 && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value + '+09:00' : value;
    return stamp(kst);
  }

  function renderWeeks(weeks, games = [], versionTimeline = {}, now = Date.now()) {
    const timelines = games.map(game => {
      const entries = (versionTimeline[game.id] || []).map(entry => ({ ...entry, time: versionStamp(entry.start) }))
        .filter(entry => entry.version && Number.isFinite(entry.time)).sort((a, b) => a.time - b.time);
      const last = entries.at(-1);
      const end = versionStamp(last?.end);
      if (last && end > last.time) entries.push({ version: '미정', time: end, unknown: true });
      return { name: game.name, entries };
    });
    return weeks.map(week => {
      const label = week.year + '년 W' + week.number;
      const versionLines = timelines.flatMap(({ name, entries }) => {
        const version = versionInWeek(entries, week.sunday, now);
        return version ? [name + ' : ' + version] : [];
      });
      const versions = versionLines.length
        ? '<span class="calendar-week-versions">' + versionLines.map(line => '<span class="calendar-week-version">' + esc(line) + '</span>').join('') + '</span>'
        : '';
      const announcement = [label, week.range, ...versionLines].map(esc).join(', ');
      return '<button type="button" class="calendar-week" data-calendar-week="' + week.sunday + '" aria-label="' + announcement + '" aria-expanded="false" style="--left:' + week.left + '%;--width:' + week.width + '%">' +
        '<span class="calendar-week-label" aria-hidden="true"><span class="calendar-week-year">' + week.year + '</span><span class="calendar-week-number">W' + week.number + '</span></span>' +
        '<span class="calendar-week-range" aria-hidden="true"><span class="calendar-week-date">' + week.range + '</span>' + versions + '</span></button>';
    }).join('') + todayLine(true);
  }

  function image(path, size) {
    return path ? '<img src="' + esc(path) + '" width="' + size + '" height="' + size + '" alt="" loading="lazy">' : '';
  }

  function rewardItems(event, limit) {
    const rewards = event.rewards || [];
    return rewards.slice(0, limit ?? rewards.length).map(reward => {
      const amount = reward.quantity?.toLocaleString('ko-KR');
      const quantity = amount != null
        ? '<b>' + (reward.maximum ? ' 최대 ' + esc(amount) + '개' : ' ×' + esc(amount)) + '</b>'
        : (/\d+배$/.test(reward.name) ? '' : ' <span class="calendar-reward-unknown">수량 미확인</span>');
      const note = limit == null && reward.note ? '<small>' + esc(reward.note) + '</small>' : '';
      return '<span class="calendar-reward">' + image(reward.image, 32) + '<span>' + esc(reward.name) + quantity + note + '</span></span>';
    }).join('');
  }

  function pickupItems(event, showNames = false) {
    const items = [];
    const pictures = new Set();
    for (const pickup of event.pickups || []) {
      if (!showNames && (!pickup.image || pictures.has(pickup.image))) continue;
      pictures.add(pickup.image);
      items.push('<span class="calendar-pickup">' + image(pickup.image, showNames ? 44 : 28) + (showNames ? '<span>' + esc(pickup.name) + '</span>' : '') + '</span>');
    }
    return items.join('');
  }

  function renderRow(event, window, games) {
    const pos = position(event, window);
    const game = games.find(g => g.id === event.game);
    const rewardCount = event.rewards?.length || 0;
    const extra = rewardCount > 3 ? '<span class="calendar-reward-extra">+' + (rewardCount - 3) + '</span>' : '';
    const types = (event.types || [event.type]).map(type => TYPES[type]).join(' · ');
    const label = [game.name, types, event.title, event.representativeTitle, period(event)].filter(Boolean).map(esc).join(' · ');
    const content = '<span class="calendar-bar-content"><span class="calendar-bar-heading"><span class="calendar-bar-game">' + image(game.image, 22) + '</span>' +
      '<span class="calendar-bar-title">' + esc(event.representativeTitle || event.title) + '</span>' +
      (event.members ? '<span class="calendar-group-count">' + esc(event.title) + '</span>' : '') +
      '</span><span class="calendar-bar-meta"><span class="calendar-bar-period">' + esc(period(event)) + '</span>' +
      (event.pickups?.length ? '<span class="calendar-banner">' + pickupItems(event) + '</span>' : '') +
      (rewardCount ? '<span class="calendar-rewards">' + rewardItems(event, 3) + extra + '</span>' : '') + '</span></span>';
    const classes = ['calendar-bar', pos.point && 'is-point', event.endUnknown && 'is-unknown'].filter(Boolean).join(' ');
    return '<article class="calendar-row" data-calendar-row="' + esc(event.id) + '" data-game="' + esc(event.game) + '" data-kind="' + esc(event.type) + '">' +
      '<div class="calendar-track" style="--left:' + pos.left + '%;--width:' + pos.width + '%">' + todayLine() +
      '<button type="button" class="' + classes + '" data-calendar-event="' + esc(event.id) + '" aria-label="' + label + '" aria-expanded="false" aria-controls="calendar-tooltip">' +
      '<span class="calendar-duration" aria-hidden="true">' +
      (pos.before && !pos.point ? '<span class="bar-edge" aria-hidden="true">‹</span>' : '') +
      (pos.after ? '<span class="bar-edge end" aria-hidden="true">›</span>' : '') + '</span>' + content + '</button></div></article>';
  }

  function renderDetails(event, games) {
    const game = games.find(g => g.id === event.game);
    const headingClass = event.members ? 'calendar-tooltip-heading calendar-tooltip-group-heading' : 'calendar-tooltip-heading';
    const header = '<div class="' + headingClass + '">' + image(game.image, 28) +
      '<div><small>' + esc(game.name) + ' · ' + TYPES[event.type] + '</small><strong>' + esc(event.title) + '</strong></div></div>' +
      '<p class="calendar-tooltip-period">' + esc(period(event)) + '</p>';
    const pickups = event.pickups?.length ? '<div class="calendar-tooltip-pickups"><strong>픽업 대상</strong><div>' + pickupItems(event, true) + '</div></div>' : '';
    if (!event.members) return header + pickups + locationAndRewards(event);
    const entries = event.members.filter(member => event.differentStarts || member.rewards?.length || member.location || !member.pickups?.length);
    return '<div class="calendar-tooltip-group">' + header + (event.differentStarts ? '' : pickups) +
      entries.map(member => '<article class="calendar-tooltip-entry" data-kind="' + esc(member.type) + '"><strong>' +
        esc(member.title) + '</strong>' +
        (event.differentStarts ? '<p class="calendar-tooltip-period">' + esc(period(member)) + '</p>' : '') +
        (event.differentStarts && member.pickups?.length ? '<div class="calendar-tooltip-pickups"><div>' + pickupItems(member, true) + '</div></div>' : '') +
        locationAndRewards(member) + '</article>').join('') + '</div>';
  }

  function locationAndRewards(event) {
    const location = event.location ? '<p>' + esc(event.location) + '</p>' : '';
    return location + (event.rewards?.length
      ? '<div class="calendar-tooltip-rewards"><strong>보상</strong><div class="calendar-rewards">' + rewardItems(event) + '</div></div>'
      : event.type === 'endgame' ? '<p class="calendar-tooltip-period">보상 미확인</p>' : '');
  }

  function mount(section, data) {
    const games = [...section.querySelectorAll('[data-calendar-game]')];
    const types = [...section.querySelectorAll('[data-calendar-type]')];
    const rows = section.querySelector('[data-calendar-rows]');
    const axis = section.querySelector('[data-calendar-axis]');
    const scroll = section.querySelector('.calendar-scroll');
    const tooltip = section.querySelector('[data-calendar-tooltip]');
    const selected = (buttons, key) => new Set(buttons.filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.dataset[key]));
    let rowById;
    let signature;
    let axisStart;
    let axisMarkup;
    let weeks;
    let activeTrigger;
    let dismissedTrigger;
    let sticky = false;
    let closeTimer;

    function positionPopup(anchor, popup, prefix) {
      const size = popup.getBoundingClientRect();
      const viewportWidth = root.document?.documentElement?.clientWidth || root.innerWidth;
      const x = Math.max(8, Math.min(anchor.left, viewportWidth - size.width - 8));
      const below = anchor.bottom + 8;
      const maxTop = root.innerHeight - size.height - 8;
      const y = Math.max(8, Math.min(below <= maxTop ? below : anchor.top - size.height - 8, maxTop));
      popup.style.setProperty('--' + prefix + '-x', x + 'px');
      popup.style.setProperty('--' + prefix + '-y', y + 'px');
    }

    function positionWeek(button) {
      positionPopup(button.getBoundingClientRect(), button.querySelector('.calendar-week-range'), 'week-popup');
    }

    function dismissWeeks(except) {
      for (const week of axis.querySelectorAll('[aria-expanded="true"], [data-calendar-week]:focus, [data-calendar-week]:hover')) {
        if (week === except) continue;
        week.setAttribute('aria-expanded', 'false');
        week.dataset.dismissed = '';
      }
    }

    function showWeek(week) {
      if ('dismissed' in week.dataset) return;
      dismissWeeks(week);
      if (activeTrigger) {
        dismissedTrigger = activeTrigger;
        const restoreFocus = tooltip.contains(root.document?.activeElement);
        hideDetails();
        if (restoreFocus) dismissedTrigger.focus({ preventScroll: true });
      }
      positionWeek(week);
    }

    function reposition() {
      for (const button of axis.querySelectorAll('[aria-expanded="true"], [data-calendar-week]:hover, [data-calendar-week]:focus-visible')) positionWeek(button);
      if (!activeTrigger) return;
      const anchor = activeTrigger.getBoundingClientRect();
      const bounds = scroll.getBoundingClientRect();
      if (anchor.bottom < Math.max(0, bounds.top) || anchor.top > Math.min(root.innerHeight, bounds.bottom) ||
          anchor.right < Math.max(0, bounds.left) || anchor.left > Math.min(root.innerWidth, bounds.right)) {
        hideDetails();
        return;
      }
      positionPopup(anchor, tooltip, 'tooltip');
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
      dismissWeeks();
      root.clearTimeout(closeTimer);
      if (trigger !== activeTrigger) {
        activeTrigger?.setAttribute('aria-expanded', 'false');
        activeTrigger = trigger;
        trigger.setAttribute('aria-expanded', 'true');
        tooltip.innerHTML = renderDetails(rowById.get(trigger.dataset.calendarEvent), data.games);
        tooltip.scrollTop = 0;
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
      const events = data.events.filter(event => visible(event, window, gameFilter, typeFilter));
      const items = groupEvents(events, window.today).sort((a, b) => compareRows(a, b, window));
      if (axisStart !== window.start) {
        axisStart = window.start;
        weeks = weeksFor(window);
        const grid = weeks.filter(week => week.left > 0).map(week => {
          const before = 'calc(' + week.left + '% - .5px)';
          const after = 'calc(' + week.left + '% + .5px)';
          return 'linear-gradient(to right, transparent ' + before + ', var(--line) ' + before + ' ' + after + ', transparent ' + after + ')';
        }).join(', ');
        scroll.style.setProperty('--today', pct(window.today, window) + '%');
        scroll.style.setProperty('--calendar-grid', grid);
      }
      const nextAxisMarkup = renderWeeks(weeks, data.games.filter(game => gameFilter.has(game.id)), data.versionTimeline, window.now);
      if (axisMarkup !== nextAxisMarkup) {
        const focusedWeek = root.document?.activeElement?.dataset.calendarWeek;
        axis.innerHTML = nextAxisMarkup;
        axisMarkup = nextAxisMarkup;
        if (focusedWeek) {
          const replacement = [...axis.querySelectorAll('[data-calendar-week]')].find(button => button.dataset.calendarWeek === focusedWeek);
          (replacement || scroll).focus({ preventScroll: true });
        }
      }
      section.querySelector('[data-calendar-range]').textContent = shortDate(window.today) + '–' + shortDate(window.end - DAY) + ' · 한국 시간';
      const grouped = items.filter(item => item.members).length;
      section.querySelector('[data-calendar-count]').textContent = events.length + '개 일정' +
        (grouped ? ' · ' + items.length + '개 막대 (묶음 ' + grouped + '개)' : '');
      const nextSignature = JSON.stringify([window.start, items.map(item => item.members?.map(member => member.id) || item.id)]);
      if (nextSignature !== signature) {
        const focusedEvent = root.document?.activeElement?.dataset.calendarEvent;
        const detailFocused = tooltip.contains?.(root.document?.activeElement);
        const restore = focusedEvent || (detailFocused && activeTrigger?.dataset.calendarEvent);
        hideDetails();
        rowById = new Map(items.map(item => [item.id, item]));
        rows.innerHTML = items.map(item => renderRow(item, window, data.games)).join('');
        if (restore) {
          const replacement = [...rows.querySelectorAll('[data-calendar-event]')].find(button => button.dataset.calendarEvent === restore);
          (replacement || scroll).focus({ preventScroll: true });
        }
        signature = nextSignature;
      }
      section.querySelector('[data-calendar-empty]').hidden = events.length > 0;
      section.querySelector('[data-calendar-checked]').textContent = data.checkedAt.replaceAll('-', '.') + ' 확인';
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
      week.setAttribute('aria-expanded', String(open));
      if (open) {
        delete week.dataset.dismissed;
        showWeek(week);
      }
      else week.dataset.dismissed = '';
    });
    axis.addEventListener('pointerover', event => {
      const week = event.target.closest('[data-calendar-week]');
      if (week && event.pointerType !== 'touch' && !week.contains(event.relatedTarget)) showWeek(week);
    });
    axis.addEventListener('focusin', event => {
      const week = event.target.closest('[data-calendar-week]');
      if (week) showWeek(week);
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
        if (event.detail === 0 && !tooltip.hidden) tooltip.focus({ preventScroll: true });
      }
    });
    tooltip.addEventListener('pointerenter', () => root.clearTimeout(closeTimer));
    tooltip.addEventListener('pointerleave', closeSoon);
    tooltip.addEventListener('focusout', event => {
      if (!tooltip.contains(event.relatedTarget)) hideDetails();
    });
    root.document?.addEventListener('pointerdown', event => {
      if (activeTrigger && !activeTrigger.contains(event.target) && !tooltip.contains(event.target)) hideDetails();
      if (!axis.contains(event.target)) dismissWeeks();
    });
    root.document?.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (activeTrigger) {
        dismissedTrigger = activeTrigger;
        const restoreFocus = tooltip.contains(root.document.activeElement);
        hideDetails();
        if (restoreFocus) dismissedTrigger.focus({ preventScroll: true });
      }
      dismissWeeks();
    });
    root.addEventListener('resize', reposition);
    root.addEventListener('scroll', reposition, true);
    root.addEventListener('focus', render);
    render();
    return { render };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TYPES, DEFAULT_TYPES, stamp, windowFor, visible, compareRows, groupEvents, position, weeksFor, period, renderWeeks, renderRow, renderDetails, mount };
  } else {
    const section = document.querySelector('[data-game-calendar]');
    if (section) mount(section, JSON.parse(document.getElementById('game-calendar-data').textContent));
  }
})(typeof window !== 'undefined' ? window : globalThis);
