(function (root) {
  'use strict';
  const WEIGHTS = [0.2, 0.1, 0.05, 0.025];
  const CHARACTERS = {
    yao: { name: '효광', base: 101, trace: 9, elation: true },
    sparxie: { name: '스파키', base: 107, trace: 0, elation: true },
    pearl: { name: '펄', base: 99, trace: 9, elation: true },
    wolf: { name: '은랑 LV.999', base: 110, trace: 9, elation: true },
    eva: { name: '에바네시아', base: 104, trace: 5, elation: true },
    trail: { name: '환락 개척자', base: 106, trace: 0, elation: true },
    wave: { name: '어벤츄린·웨이브', base: 107, trace: 9, elation: true },
    huohuo: { name: '곽향', base: 98, trace: 5, elation: false },
    ruan: { name: '완·매', base: 104, trace: 5, elation: false },
    asta: { name: '아스타', base: 106, trace: 0, elation: false },
    hyacine: { name: '히아킨', base: 110, trace: 14, elation: false },
    summeretto: { name: '로빈·서머레토', base: 95, trace: 14, elation: false },
    tingyun: { name: '정운', base: 112, trace: 0, elation: false },
    hanya: { name: '한아', base: 110, trace: 9, elation: false },
    sparkle: { name: '스파클', base: 101, trace: 0, elation: false },
    sunday: { name: '선데이', base: 96, trace: 0, elation: false },
    custom: { name: '직접 입력 (환락)', base: 100, trace: 0, elation: true },
    other: { name: '직접 입력 (비환락)', base: 100, trace: 0, elation: false },
    aeon: { name: '에이언즈★아하', base: 94, trace: 5, elation: true, betaOnly: true },
    empty: { name: '빈 슬롯', base: 0, trace: 0, elation: false }
  };
  const SOURCES = [
    ['펄 · 스타레일 4.6 · 필살기/2돌/행적/연극인', 'https://hsr.gachabase.net/characters/1503/pearl/release/4.6.0/16688351?lang=ko'],
    ['효광 · 결계 중 2돌 +12%, 전용 광추', 'https://hsr.gachabase.net/characters/1502/yao-guang/release?lang=ko'],
    ['곽향 · 양명 중 1돌 +12%', 'https://hsr.gachabase.net/characters/1217/huohuo/release/4.4.0?lang=ko'],
    ['웨이브 · 출시 기초속도 107 / 단독 환락 예외', 'https://hsr.gachabase.net/characters/1513/aventurine-waveflair/release/4.5.0/16247584?lang=ko'],
    ['웨이브 전광 · 환락 스킬 후 속도 +24% (1재)', 'https://hsr.gachabase.net/lightcones/23064/summer-rides-the-surf/release/4.5.0/16247584?lang=ko'],
    ['은랑 LV.999 · 기초속도 110 / 전광 +18% (1재)', 'https://hsr.gachabase.net/characters/1506/silver-wolf-lv999/release?branch=release&lang=ko'],
    ['스파키 · 2돌 보너스 턴', 'https://hsr.gachabase.net/characters/1501/sparxie/release?lang=ko'],
    ['히아킨 · HP 감소 후 2돌 +30%', 'https://hsr.gachabase.net/characters/1409/hyacine/release?lang=ko'],
    ['환락 튜토리얼 · 4.6 출시 데이터', 'https://hsr.gachabase.net/tutorials/battle/2260/path-of-elation/release?lang=en'],
    ['속도 순위 계수 · 2026-09 관측 정리 (공식 숫자 명시 아님)', 'https://hohzuki-tries.com/hsr-aha-speed-formula/'],
    ['행동 게이지·속도 변경 공식 · KQM 연구', 'https://hsr.keqingmains.com/misc/speed-guide/'],
    ['개척자 6돌 · 테스트 중 속도 효과 삭제 이력', 'https://hsr.gachabase.net/diff/characters/8010/stelle-elation?cur=beta_4.1.54_14611439&lang=ko&prev=beta_4.1.53_14536466'],
    ['완·매 · 자신 제외 +10% (특성 10레벨)', 'https://hsr.gachabase.net/characters/1303/ruan-mei/release/4.5.0/16247584?lang=ko'],
    ['댄댄댄·메신저·매 · 출시판 장비 문구', 'https://hsr.gachabase.net/characters/1306/sparkle/release/4.3.0/15245519?lang=ko'],
    ['서머레토 전광·앰포리어스 · 전체 속도 조건부 효과', 'https://hsr.gachabase.net/characters/1512/robin-summeretto/release/4.6.0/16688351?lang=ko']
  ];
  function slot(id, speed) {
    const c = CHARACTERS[id];
    return { id, mode: 'panel', panel: speed, base: c.base, trace: c.trace, boots: 25,
      sub: 20, gear: 6, planar: 0, lc: 0, extraPanelPct: 0, extraPanelFlat: 0,
      pct: 0, flat: 0, hyacine: false, waveLC: false, waveRefine: 1,
      vonwacq: false, initialAdvance: 0, eidolon: false, signature: false, refine: 1,
      buffActive: true, hyacineEligible: true, messenger: false, amphoreus: false,
      warrior: false, memospriteActive: true, betaPlanar: 'none', joyEligible: false, ...(id === 'aeon' ? { ahaStart: false } : {}) };
  }
  function defaults() {
    return { slots: [slot('yao', 200), slot('wolf', 200), slot('sparxie', 134), slot('pearl', 160)],
      buffs: { yao: false, huohuo: false, ruan: false, messenger: false, amphoreus: false, summerLC: 0, asta: 0, extraPct: 0, extraFlat: 0 },
      sparxieE2: false, pearlE2: false, soloWaveBonus: 0, horizon: 150,
      target: 133.4, solveSlot: 0, events: [] };
  }
  function present(cfg, id) { return cfg.slots.some(s => s.id === id); }
  function owner(cfg, id) { return cfg.slots.find(s => s.id === id); }
  function eidolonActive(cfg, id) { const s = owner(cfg, id); return !!(s?.eidolon && s.buffActive !== false); }
  // A base-SPD increase changes the percentage basis; flat traces stay outside it.
  function effectiveBase(s) {
    return Number(s.base) + (s.id === 'aeon' && s.signature ? 12 + 2 * (s.refine - 1) : 0);
  }
  function rumorConfig(cfg) {
    const copy = structuredClone(cfg);
    copy.rumor = { enabled: true, owned: true, waveAscension: false };
    return copy;
  }
  function ahaBase(cfg) {
    if (!cfg.rumor?.enabled || cfg.rumor.legacyBase) return 80;
    const aha = owner(cfg, 'aeon');
    // Ownership-only gear/trace references have no verified combat implementation.
    return aha ? effectiveBase(aha) : cfg.rumor.owned ? 94 : 80;
  }
  function isWaveAscended(cfg) {
    return !!(cfg.rumor?.enabled && cfg.rumor.waveAscension && present(cfg, 'aeon') &&
      present(cfg, 'wave') && cfg.slots.filter(s => CHARACTERS[s.id].elation).length === 2);
  }
  function canWaveDirect(cfg) { return isSoloWave(cfg) || isWaveAscended(cfg); }
  function compareBase(cfg) {
    return { legacy: snapshot({ ...cfg, rumor: { ...cfg.rumor, legacyBase: true } }), beta: snapshot(cfg) };
  }
  function panelSpeed(s) {
    if (s.mode !== 'build') return Number(s.panel);
    const lc = s.id === 'aeon' && s.signature ? 0 : s.signature && ['yao','wolf','hyacine'].includes(s.id) ? 18 + 3 * (s.refine - 1) : s.lc;
    return effectiveBase(s) * (1 + (s.gear + (PLANARS[s.betaPlanar]?.pct ?? s.planar) + lc + s.extraPanelPct) / 100)
      + s.trace + s.boots + s.sub + s.extraPanelFlat;
  }
  function additions(cfg, i) {
    const s = cfg.slots[i], b = cfg.buffs;
    let pct = Number(s.pct) + Number(b.extraPct), flat = Number(s.flat) + Number(b.extraFlat);
    if ((b.yao && present(cfg, 'yao')) || eidolonActive(cfg, 'yao')) pct += 12;
    if ((b.huohuo && present(cfg, 'huohuo')) || eidolonActive(cfg, 'huohuo')) pct += 12;
    if ((b.ruan || owner(cfg,'ruan')?.buffActive) && present(cfg, 'ruan') && s.id !== 'ruan') pct += 10;
    if (b.messenger || cfg.slots.some(x=>x.id!=='empty' && x.messenger)) pct += 12;
    if (b.amphoreus || cfg.slots.some(x=>x.id!=='empty' && x.amphoreus && x.memospriteActive)) pct += 8;
    const summer = owner(cfg,'summeretto');
    pct += Number(b.summerLC || 0) + (summer?.signature && summer.buffActive !== false ? 20 + 5 * (summer.refine - 1) : 0);
    if ((s.hyacine && present(cfg, 'hyacine')) || (eidolonActive(cfg,'hyacine') && s.hyacineEligible !== false)) pct += 30;
    if (s.waveLC && CHARACTERS[s.id].elation) pct += 24 + 4 * (s.waveRefine - 1);
    else if (s.id==='wave' && s.signature && s.buffActive !== false) pct += 24 + 4 * (s.refine - 1);
    if (s.id==='sparkle' && s.eidolon && s.buffActive !== false) pct += 15;
    if (s.id==='hanya' && s.eidolon && s.buffActive !== false) pct += 20;
    const tingyun=owner(cfg,'tingyun');
    if (eidolonActive(cfg,'tingyun') && tingyun.buffTarget===i) pct += 20;
    if (s.warrior) pct += 6;
    if (isWaveAscended(cfg)) pct += owner(cfg, 'aeon').eidolon ? 25 : 15;
    if (present(cfg, 'asta')) flat += Number(b.asta);
    return { pct, flat };
  }
  function isSoloWave(cfg) {
    return present(cfg, 'wave') && cfg.slots.filter(s => CHARACTERS[s.id].elation).length === 1;
  }
  function snapshot(cfg, overrides = {}) {
    const chars = cfg.slots.map((s, i) => {
      const c = CHARACTERS[s.id], a = additions(cfg, i), panel = panelSpeed(s);
      const speed = overrides[i] === undefined ? panel + effectiveBase(s) * a.pct / 100 + a.flat : overrides[i];
      return { i, id: s.id, name: c.name, elation: c.elation, base: effectiveBase(s), panel,
        pct: a.pct, flat: a.flat, speed, weight: 0, contribution: 0 };
    });
    const ranked = chars.filter(c => c.elation).sort((a, b) => b.speed - a.speed || a.i - b.i);
    ranked.forEach((c, rank) => { c.rank = rank + 1; c.weight = WEIGHTS[rank]; c.contribution = c.speed * c.weight; });
    const direct = canWaveDirect(cfg) ? cfg.soloWaveBonus : 0;
    const base = ahaBase(cfg);
    const aha = ranked.length ? base + direct + ranked.reduce((v, c) => v + c.contribution, 0) : null;
    return { chars, ranked, aha, base, direct, av: aha ? 10000 / aha : null };
  }
  function solve(cfg, idx, target, kind = 'aha') {
    const s = cfg.slots[idx];
    if (!CHARACTERS[s.id].elation) return null;
    const add = additions(cfg, idx), offset = effectiveBase(s) * add.pct / 100 + add.flat;
    const predicate = panel => {
      const snap = snapshot(cfg, { [idx]: panel + offset });
      return kind === 'ahead' ? panel + offset > snap.aha + 1e-9 : snap.aha >= target;
    };
    let lo = effectiveBase(s) + s.trace, hi = Math.max(lo, 1000);
    if (predicate(lo)) return { panel: lo, combat: lo + offset, delta: lo - panelSpeed(s) };
    while (!predicate(hi) && hi < 1000000) hi *= 2;
    if (!predicate(hi)) return null;
    for (let j = 0; j < 80; j++) { const mid = (lo + hi) / 2; if (predicate(mid)) hi = mid; else lo = mid; }
    const panel = Math.ceil((hi - 1e-8) * 100) / 100;
    // Strictly earlier is a different condition from reaching a speed breakpoint.
    const safePanel = !predicate(panel) ? panel + 0.01 : panel;
    return { panel: safePanel, combat: safePanel + offset, delta: safePanel - panelSpeed(s) };
  }
  function automaticEvent(type) { return ['yao', 'pearl', 'bonus', 'ahaBonus'].includes(type); }
  function validate(cfg) {
    const errors = [], seen = new Set();
    cfg.slots.forEach((s, i) => {
      if (!CHARACTERS[s.id]) { errors.push(`슬롯 ${i + 1}: 알 수 없는 캐릭터`); return; }
      if (CHARACTERS[s.id].betaOnly && !cfg.rumor?.enabled) errors.push('아하 캐릭터는 4.7 찌라시에서만 편성할 수 있습니다.');
      if (s.id === 'empty') return;
      if (s.ahaStart !== undefined && (typeof s.ahaStart !== 'boolean' || (s.ahaStart && (s.id !== 'aeon' || !cfg.rumor?.enabled)))) errors.push(`슬롯 ${i + 1}: 아하 진입 행적은 찌라시의 아하에게만 적용할 수 있습니다.`);
      if (s.betaPlanar && s.betaPlanar !== 'none') {
        if (!cfg.rumor?.enabled || !PLANARS[s.betaPlanar]) errors.push(`슬롯 ${i + 1}: 베타 장신구는 찌라시 모드에서만 선택할 수 있습니다.`);
        if (s.vonwacq) errors.push(`슬롯 ${i + 1}: 바커공과 베타 장신구는 동시에 장착할 수 없습니다.`);
      }
      if (!['custom', 'other'].includes(s.id) && seen.has(s.id)) errors.push('같은 캐릭터를 중복 편성할 수 없습니다.');
      seen.add(s.id);
      const numbers = [s.base, s.trace, s.boots, s.sub, s.gear, s.planar, s.lc, s.extraPanelPct,
        s.extraPanelFlat, s.pct, s.flat, s.initialAdvance, s.waveRefine, s.refine];
      let problem = '';
      if (s.mode !== 'build' && (s.panel === '' || s.panel == null || Number.isNaN(s.panel))) problem = '마을 속도를 입력해 주세요.';
      else if (s.mode !== 'build' && !Number.isFinite(Number(s.panel))) problem = '마을 속도를 올바른 숫자로 입력해 주세요.';
      else if (s.mode !== 'build' && !(s.panel > 0)) problem = '마을 속도는 0보다 커야 합니다.';
      else if (numbers.some(v => v === '' || v == null || !Number.isFinite(Number(v)))) problem = '숫자를 올바르게 입력해 주세요.';
      else if (!(s.base > 0)) problem = '기초 속도는 0보다 커야 합니다.';
      else if (!(panelSpeed(s) > 0) || !Number.isFinite(panelSpeed(s))) problem = '구성 속도는 0보다 큰 유효한 숫자여야 합니다.';
      else if (s.initialAdvance < 0 || s.initialAdvance > 100) problem = '첫 행동 증가는 0~100%입니다.';
      else if (!(s.refine>=1 && s.refine<=5 && Number.isInteger(s.refine))) problem = '재련은 1~5재입니다.';
      else {
        const a = additions(cfg, i), speed = panelSpeed(s) + effectiveBase(s) * a.pct / 100 + a.flat;
        if (!Number.isFinite(speed) || !(speed > 0)) problem = '전투 속도는 0보다 커야 합니다.';
      }
      if (problem) errors.push(`슬롯 ${i + 1}: ${problem}`);
      if (s.id==='tingyun' && s.eidolon && (!Number.isInteger(s.buffTarget) || !cfg.slots[s.buffTarget] || cfg.slots[s.buffTarget].id==='empty')) errors.push('정운 1돌의 축복 대상을 지정해 주세요.');
    });
    if (!cfg.slots.some(s => CHARACTERS[s.id]?.elation)) errors.push('환락 캐릭터를 최소 1명 편성해 주세요.');
    if (!(cfg.horizon > 0 && cfg.horizon <= 2000)) errors.push('계산 구간은 0 초과, 2000 AV 이하입니다.');
    if (!(cfg.target > 80 && cfg.target <= 1000)) errors.push('목표 아하 속도는 80 초과, 1000 이하입니다.');
    if (Object.values(cfg.buffs).some(v => typeof v === 'number' && !Number.isFinite(v))) errors.push('버프 값은 유효한 숫자여야 합니다.');
    if (!Number.isFinite(cfg.soloWaveBonus) || cfg.soloWaveBonus < 0) errors.push('웨이브 직접 가산은 0 이상의 숫자여야 합니다.');
    cfg.events.forEach((e, i) => {
      if (!Number.isFinite(e.time) || e.time < 0 || e.time > cfg.horizon || (!automaticEvent(e.type) && !Number.isFinite(e.value))) errors.push(`이벤트 ${i + 1}: 시간/수치를 확인해 주세요.`);
      if (!['pct', 'flat', 'advance', 'bonus', 'yao', 'pearl', 'ddd', 'wave', ...(cfg.rumor?.enabled ? ['ahaBonus', 'ahaAdvance'] : [])].includes(e.type)) errors.push(`이벤트 ${i + 1}: 종류를 확인해 주세요.`);
      if (!['yao', 'wave', 'ddd', 'ahaBonus', 'ahaAdvance'].includes(e.type) && e.target !== 'all' && (!Number.isInteger(e.target) || !cfg.slots[e.target])) errors.push(`이벤트 ${i + 1}: 대상을 확인해 주세요.`);
      if ((e.type === 'advance' || e.type === 'ddd' || e.type === 'ahaAdvance') && (e.value < -100 || e.value > 100)) errors.push(`이벤트 ${i + 1}: 행동 조정은 -100~100%입니다.`);
      if (e.type === 'yao' && !present(cfg, 'yao')) errors.push('효광 필살기 이벤트에는 효광 편성이 필요합니다.');
      if (e.type === 'pearl' && (!present(cfg, 'pearl') || cfg.slots[e.target]?.id === 'pearl' || e.target === 'all')) errors.push('펄 필살기는 펄 외의 한 캐릭터를 지정해야 합니다.');
      if (e.type === 'wave' && !canWaveDirect(cfg)) errors.push('아하 직접 가산은 웨이브 단독 환락 또는 찌라시의 아하·웨이브 승격 조건에서만 사용합니다.');
      if (!['yao', 'wave', 'ddd', 'ahaBonus', 'ahaAdvance'].includes(e.type) && e.target !== 'all' && cfg.slots[e.target]?.id === 'empty') errors.push('빈 슬롯은 이벤트 대상이 될 수 없습니다.');
      if (e.type === 'bonus' && e.target === 'all') errors.push('보너스 턴의 대상은 캐릭터 1명이어야 합니다.');
    });
    return [...new Set(errors)];
  }
  function simulate(cfg) {
    const errors = validate(cfg); if (errors.length) return { errors, log: [], counts: [] };
    const snap = snapshot(cfg), gauges = cfg.slots.map((s, i) => s.id === 'empty' ? Infinity : initialGauge(cfg, i, snap));
    gauges.push(10000);
    const pct = [0, 0, 0, 0], flat = [0, 0, 0, 0];
    let solo = snap.direct, time = 0, cursor = 0;
    const events = cfg.events.map((e, order) => ({ ...e, order })).sort((a, b) => a.time - b.time || a.order - b.order);
    const log = [], counts = Array.from({ length: 5 }, () => ({ natural: 0, bonus: 0 }));
    function speeds() {
      const chars = snap.chars.map((c, i) => c.speed + c.base * pct[i] / 100 + flat[i]);
      const ranked = snap.ranked.map(c => chars[c.i]).sort((a, b) => b - a);
      return [...chars, snap.base + ranked.reduce((v, s, i) => v + s * WEIGHTS[i], 0) + solo];
    }
    function add(actor, type, note) {
      log.push({ time, actor, name: actor === 4 ? (cfg.rumor?.enabled ? '아하 타임' : '아하') : snap.chars[actor].name, type, note,
        speed: speeds()[actor] });
      if (type === 'normal') counts[actor].natural++;
      if (type === 'bonus') counts[actor].bonus++;
    }
    function afterInstant() {
      solo = 0;
      if (cfg.sparxieE2 || eidolonActive(cfg,'sparxie')) { const i = cfg.slots.findIndex(s => s.id === 'sparxie'); if (i >= 0) add(i, 'bonus', '스파키 2돌 · 게이지 유지'); }
    }
    function advance(i, value) { if (Number.isFinite(gauges[i])) gauges[i] = Math.max(0, gauges[i] - value * 100); }
    for (let guard = 0; guard < 2000; guard++) {
      const sp = speeds();
      if (sp.some((v, i) => Number.isFinite(gauges[i]) && (!(v > 0) || !Number.isFinite(v)))) return { errors: ['이벤트 적용 후 속도가 0 이하입니다.'], log: [], counts: [] };
      const avs = gauges.map((g, i) => g / sp[i]);
      const min = Math.min(...avs), nextAction = time + min, nextEvent = events[cursor]?.time ?? Infinity;
      const next = Math.min(nextAction, nextEvent);
      // A turn exactly at a cycle boundary belongs to the following cycle.
      if (next >= cfg.horizon - 1e-9) break;
      const dt = Math.max(0, next - time);
      for (let i = 0; i < 5; i++) if (Number.isFinite(gauges[i])) gauges[i] = Math.max(0, gauges[i] - sp[i] * dt);
      time = next;
      if (nextEvent <= nextAction + 1e-9) {
        const e = events[cursor++], targets = e.target === 'all' ? [0, 1, 2, 3].filter(i => cfg.slots[i].id !== 'empty') : [Number(e.target)];
        if (e.type === 'pct' || e.type === 'flat') { targets.forEach(i => { (e.type === 'pct' ? pct : flat)[i] += e.value; }); add(targets[0], 'event', `${e.type === 'pct' ? '속도 %' : '고정 속도'} ${e.value >= 0 ? '+' : ''}${e.value} · ${e.target === 'all' ? '아군 전체' : '지정 대상'}`); }
        if (e.type === 'advance') { targets.forEach(i => advance(i, e.value)); add(targets[0], 'event', `행동 게이지 ${e.value}% 조정`); }
        if (e.type === 'ddd') { [0, 1, 2, 3].forEach(i => advance(i, e.value)); add(cfg.slots.findIndex(s => s.id !== 'empty'), 'event', `댄댄댄 · 아군 ${e.value}% 행동 증가`); }
        if (e.type === 'bonus') add(targets[0], 'bonus', '사용자 지정 보너스 턴 · 게이지 유지');
        if (e.type === 'ahaBonus') { add(4, 'bonus', '수동 추가 아하 타임 · 자연 게이지 유지'); afterInstant(); }
        if (e.type === 'ahaAdvance') { advance(4, e.value); add(4, 'event', '수동 아하 타임 행동 게이지 ' + e.value + '% 조정'); }
        if (e.type === 'yao') { add(4, 'bonus', '효광 필살기 · 자연 게이지 유지'); afterInstant(); }
        if (e.type === 'wave') { solo = e.value; add(4, 'event', `웨이브 ${isWaveAscended(cfg) ? '승격 예외' : '단독 환락'} · 직접 가산 총량 ${e.value}`); }
        if (e.type === 'pearl') {
          const n = snap.ranked.length, amount = [0, 10, 15, 30, 30][n], target = Number(e.target);
          advance(target, amount);
          const pearlE2 = cfg.pearlE2 || eidolonActive(cfg,'pearl');
          if (pearlE2) snap.ranked.forEach(c => { if (c.i !== target && c.id !== 'pearl') advance(c.i, amount); });
          add(cfg.slots.findIndex(s => s.id === 'pearl'), 'event', `펄 필살기 · ${snap.chars[target].name} ${amount}% 행동 증가${pearlE2 ? ' / 2돌 동료 적용' : ''}`);
          if (n >= 4) add(target, 'bonus', '펄 4환락 보너스 턴 · 자연 게이지 유지');
        }
      } else {
        // Ties use the party-slot order, then Aha; actual game ties can differ.
        const actor = avs.findIndex(v => Math.abs(v - min) < 1e-8);
        gauges[actor] = 10000;
        add(actor, 'normal', actor === 4 ? '자연 아하 타임' : '자연 행동');
        if (actor === 4) afterInstant();
      }
      if (guard === 1999) return { errors: ['행동 수가 너무 많습니다. 입력 속도나 계산 구간을 줄여 주세요.'], log: [], counts: [] };
    }
    return { errors: [], log, counts, finalSpeed: speeds(), remainingGauge: gauges };
  }
  const BETA = Object.freeze({ version: 'v4.6.53', data: 'D16833202', resource: 'R16818953', checked: '2026-10-17 (KST)' });
  const PLANARS = Object.freeze({ joy: { name: "God's Moment of Joy", pct: 6 }, asc: { name: 'Subspace ASC Center', pct: 6 } });
  function initialGauge(cfg, i, snap = snapshot(cfg)) {
    const s = cfg.slots[i];
    const advance = s.initialAdvance + (s.vonwacq && snap.chars[i].speed >= 120 ? 40 : 0) +
      (cfg.rumor?.enabled && s.betaPlanar === 'joy' && s.joyEligible ? 40 : 0) +
      (cfg.rumor?.enabled && s.id === 'aeon' && s.ahaStart ? 30 : 0);
    return Math.max(0, 10000 * (1 - advance / 100));
  }
  // Goal search is over displayed 0.01 SPD steps. Timed order can have islands.
  function goalProblem(cfg,idx,goal){
    if(!cfg.slots[idx]||cfg.slots[idx].id==='empty')return {error:'역산할 편성 캐릭터를 선택해 주세요.'};
    const kinds = ['aha','beforeAha','count','beforeActor','timedOrder'];
    if (!kinds.includes(goal.kind)) return { error: '지원하지 않는 목표입니다.' };
    if (goal.kind === 'aha' && !CHARACTERS[cfg.slots[idx].id].elation) return { error: '아하 SPD 역산은 환락 캐릭터를 선택해 주세요.' };
    if (goal.kind === 'count' && (!Number.isInteger(goal.count) || goal.count < 1 || goal.count > 100 || !Number.isInteger(goal.actor) || goal.actor < 0 || goal.actor > 4 || !(goal.until > 0 && goal.until <= cfg.horizon))) return { error: '횟수는 1~100, AV는 계산 구간 이내, 행동 대상은 편성 캐릭터 또는 아하 타임으로 지정해 주세요.' };
    if (['beforeActor','timedOrder'].includes(goal.kind) && (!Number.isInteger(goal.other) || goal.other === idx || goal.other < 0 || goal.other > 4 || (goal.other < 4 && cfg.slots[goal.other].id === 'empty'))) return { error: '서로 다른 편성 대상을 선택해 주세요.' };
    if (goal.kind === 'timedOrder' && !(Number.isFinite(goal.time) && goal.time >= 0 && goal.time < cfg.horizon)) return { error: '비교 시점은 0 이상, 계산 구간 미만이어야 합니다.' };
    if(goal.kind==='count'&&goal.actor<4&&cfg.slots[goal.actor].id==='empty')return {error:'빈 슬롯의 행동 횟수는 역산할 수 없습니다.'};
    return null;
  }
  function goalCheck(cfg, idx, goal, simulated) {
    const problem=goalProblem(cfg,idx,goal);if(problem)return {met:false,...problem};
    const snap = snapshot(cfg), sim = simulated || simulate(cfg);
    if (sim.errors.length) return { met: false, error: sim.errors.join(' ') };
    const next = (actor, from = 0) => sim.log.find(l => l.actor === actor && l.type === 'normal' && l.time >= from)?.time ?? Infinity;
    let margin, observed;
    if (goal.kind === 'aha') { margin = snap.aha - cfg.target; observed = snap.aha; }
    else if (goal.kind === 'count') {
      observed = sim.log.filter(l => l.actor === goal.actor && l.type === 'normal' && l.time < goal.until - 1e-9).length;
      margin = observed - goal.count;
    } else {
      const from = goal.kind === 'timedOrder' ? goal.time : 0;
      const actor = goal.kind === 'beforeAha' ? 4 : goal.other;
      const mine = next(idx, from), theirs = next(actor, from);
      if (!Number.isFinite(mine) || !Number.isFinite(theirs)) return { met: false, error: '비교할 자연 행동이 계산 구간 안에 없습니다. 계산 구간을 늘려 주세요.' };
      margin = theirs - mine; observed = { mine, theirs };
    }
    return { met: ['aha','count'].includes(goal.kind) ? margin >= 0 : margin > 1e-8, margin, observed, snap, sim };
  }
  function* goalSearch(cfg, idx, goal = { kind: 'aha' }) {
    if (validate(cfg).length || !Number.isInteger(idx) || !cfg.slots[idx] || cfg.slots[idx].id === 'empty') return { error: '파티와 이벤트 입력을 확인해 주세요.' };
    const problem=goalProblem(cfg,idx,goal);if(problem)return problem;
    const current = goalCheck(cfg, idx, goal), copy = structuredClone(cfg), s = copy.slots[idx];
    const minimum = Math.max(1, Math.ceil((s.mode==='build'?panelSpeed({...s,sub:0}):effectiveBase(s)+s.trace) * 100 - 1e-8)), maximum = 100000;
    if (minimum > maximum) return { error: '기초 속도와 행적이 탐색 상한 1000 SPD를 넘습니다.' };
    s.mode = 'panel';
    const probe = units => { s.panel = units / 100; return goalCheck(copy, idx, goal); };
    const wave = canWaveDirect(cfg) && (cfg.soloWaveBonus !== 0 || cfg.events.some(e => e.type === 'wave'));
    // Aha weighted speed and fixed-schedule natural counts are monotone without
    // Wave's action-dependent reset. Static first turns also are monotone.
    const monotone = !wave && (['aha','count'].includes(goal.kind) || (goal.kind !== 'timedOrder' && cfg.events.length === 0));
    let units;
    if (monotone) {
      let lo = minimum, hi = maximum;
      if (!probe(hi).met) return { error: '1000 마을 SPD 이내에서 목표를 달성하지 못합니다. 구간·대상·수동 조건을 확인해 주세요.' };
      while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (probe(mid).met) hi = mid; else lo = mid + 1; }
      units = lo;
    } else {
      for (let n = minimum; n <= maximum; n++) { if (probe(n).met) { units=n;break; } if ((n-minimum)%500===0) yield {progress:(n-minimum)/Math.max(1,maximum-minimum)}; }
      if (units === undefined) return { error: '0.01 단위 전수 탐색, 1000 마을 SPD 이내에 해가 없습니다. 미세한 연속 구간의 해까지 보장하지는 않습니다.' };
    }
    const checked = probe(units), previous = units > minimum ? probe(units - 1) : null;
    if (!checked.met || previous?.met) return { error: '최소값 재검증에 실패했습니다. 이 조건의 단조성을 확인할 수 없습니다.' };
    const panel = units / 100, originalRank = snapshot(cfg).ranked.map(c => c.i).join(), finalRank = checked.snap.ranked.map(c => c.i).join();
    return { panel, combat: checked.snap.chars[idx].speed, delta: panel - panelSpeed(cfg.slots[idx]), currentMet: current.met,
      checked, previousMet: previous?.met ?? false, previousAvailable: previous!==null, rankChanged: originalRank !== finalRank, method: monotone ? '단조 목표의 표시 단위 탐색' : '0.01 단위 전수 탐색',
      precision: '입력한 실제 소수점 SPD 기준, 정수 표시 SPD만 알면 추정', assumed: '현재 조건부 버프와 수동 이벤트, 자연 행동만 비교. 탐색 상한 1000 SPD.' };
  }
  function solveGoal(cfg,idx,goal){const search=goalSearch(cfg,idx,goal);let step;do{step=search.next();}while(!step.done);return step.value;}
  function diagnostics(cfg, sim = simulate(cfg)) {
    if (sim.errors.length) return [];
    const notes = [], snap = snapshot(cfg), rank = values => values.filter(c => c.elation).sort((a,b)=>b.speed-a.speed||a.i-b.i).map(c=>c.i).join();
    if (rank(snap.chars) !== rank(snap.chars.map(c=>({...c,speed:c.panel})))) notes.push('마을 SPD와 전투 SPD의 환락 순위가 달라 가중치가 재배정되었습니다.');
    if (rank(snap.chars) !== rank(snap.chars.map(c=>({...c,speed:sim.finalSpeed[c.i]})))) notes.push('수동 이벤트 적용 후 환락 순위가 바뀌었습니다.');
    const first = sim.log.filter(l=>l.type==='normal').filter((l,i,a)=>a.findIndex(x=>x.actor===l.actor)===i).sort((a,b)=>a.time-b.time);
    if (first.some((l,i)=>i&&l.time-first[i-1].time<=0.01)) notes.push('첫 자연 행동 간격이 0.01 AV 이하입니다. 숨은 소수점·동속 규칙에 따라 순서가 달라질 수 있습니다.');
    if (cfg.events.length) {
      const baseline = simulate({...cfg,events:[]});
      const order = logs => logs.filter(l=>l.type==='normal').filter((l,i,a)=>a.findIndex(x=>x.actor===l.actor)===i).map(l=>l.actor).join();
      if (order(baseline.log)!==order(sim.log)) notes.push('입력한 이벤트로 첫 자연 행동 순서가 기본 상태와 달라졌습니다.');
    }
    if ([cfg.buffs.messenger,...cfg.slots.map(s=>s.messenger)].filter(Boolean).length>1) notes.push('메신저 중복 선택은 속도 +12% 한 번만 적용합니다.');
    if ([cfg.buffs.amphoreus,...cfg.slots.map(s=>s.amphoreus&&s.memospriteActive)].filter(Boolean).length>1) notes.push('앰포리어스 중복 선택은 속도 +8% 한 번만 적용합니다.');
    return notes;
  }

  const api = { BETA, PLANARS, initialGauge, goalProblem, goalCheck, solveGoal, goalSearch, diagnostics, WEIGHTS, CHARACTERS, SOURCES, slot, defaults, panelSpeed, additions, snapshot, solve, validate, simulate, isSoloWave, effectiveBase, ahaBase, rumorConfig, compareBase, isWaveAscended, canWaveDirect, automaticEvent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AhaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
