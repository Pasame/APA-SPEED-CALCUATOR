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
    empty: { name: '빈 슬롯', base: 0, trace: 0, elation: false }
  };
  const SOURCES = [
    ['펄 출시판 · 필살기/2돌/행적/연극인', 'https://hsr.gachabase.net/characters/1503/pearl/release/4.6.0/16688351?lang=ko'],
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
      warrior: false, memospriteActive: true };
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
  function panelSpeed(s) {
    if (s.mode !== 'build') return Number(s.panel);
    const lc = s.signature && ['yao','wolf','hyacine'].includes(s.id) ? 18 + 3 * (s.refine - 1) : s.lc;
    return s.base * (1 + (s.gear + s.planar + lc + s.extraPanelPct) / 100)
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
    if (present(cfg, 'asta')) flat += Number(b.asta);
    return { pct, flat };
  }
  function isSoloWave(cfg) {
    return present(cfg, 'wave') && cfg.slots.filter(s => CHARACTERS[s.id].elation).length === 1;
  }
  function snapshot(cfg, overrides = {}) {
    const chars = cfg.slots.map((s, i) => {
      const c = CHARACTERS[s.id], a = additions(cfg, i), panel = panelSpeed(s);
      const speed = overrides[i] === undefined ? panel + s.base * a.pct / 100 + a.flat : overrides[i];
      return { i, id: s.id, name: c.name, elation: c.elation, base: s.base, panel,
        pct: a.pct, flat: a.flat, speed, weight: 0, contribution: 0 };
    });
    const ranked = chars.filter(c => c.elation).sort((a, b) => b.speed - a.speed || a.i - b.i);
    ranked.forEach((c, rank) => { c.rank = rank + 1; c.weight = WEIGHTS[rank]; c.contribution = c.speed * c.weight; });
    const direct = isSoloWave(cfg) ? cfg.soloWaveBonus : 0;
    const aha = ranked.length ? 80 + direct + ranked.reduce((v, c) => v + c.contribution, 0) : null;
    return { chars, ranked, aha, direct, av: aha ? 10000 / aha : null };
  }
  function solve(cfg, idx, target, kind = 'aha') {
    const s = cfg.slots[idx];
    if (!CHARACTERS[s.id].elation) return null;
    const add = additions(cfg, idx), offset = s.base * add.pct / 100 + add.flat;
    const predicate = panel => {
      const snap = snapshot(cfg, { [idx]: panel + offset });
      return kind === 'ahead' ? panel + offset > snap.aha + 1e-9 : snap.aha >= target;
    };
    let lo = s.base + s.trace, hi = Math.max(lo, 1000);
    if (predicate(lo)) return { panel: lo, combat: lo + offset, delta: lo - panelSpeed(s) };
    while (!predicate(hi) && hi < 1000000) hi *= 2;
    if (!predicate(hi)) return null;
    for (let j = 0; j < 80; j++) { const mid = (lo + hi) / 2; if (predicate(mid)) hi = mid; else lo = mid; }
    const panel = Math.ceil((hi - 1e-8) * 100) / 100;
    // Strictly earlier is a different condition from reaching a speed breakpoint.
    const safePanel = !predicate(panel) ? panel + 0.01 : panel;
    return { panel: safePanel, combat: safePanel + offset, delta: safePanel - panelSpeed(s) };
  }
  function validate(cfg) {
    const errors = [], seen = new Set();
    cfg.slots.forEach((s, i) => {
      if (!CHARACTERS[s.id]) { errors.push(`슬롯 ${i + 1}: 알 수 없는 캐릭터`); return; }
      if (s.id === 'empty') return;
      if (!['custom', 'other'].includes(s.id) && seen.has(s.id)) errors.push('같은 캐릭터를 중복 편성할 수 없습니다.');
      seen.add(s.id);
      const numbers = [s.panel, s.base, s.trace, s.boots, s.sub, s.gear, s.planar, s.lc, s.extraPanelPct,
        s.extraPanelFlat, s.pct, s.flat, s.initialAdvance, s.waveRefine, s.refine];
      if (numbers.some(v => !Number.isFinite(Number(v)))) errors.push(`슬롯 ${i + 1}: 숫자를 입력해 주세요.`);
      if (!(s.base > 0) || !(panelSpeed(s) > 0)) errors.push(`슬롯 ${i + 1}: 기초/패널 속도는 0보다 커야 합니다.`);
      if (s.initialAdvance < 0 || s.initialAdvance > 100) errors.push(`슬롯 ${i + 1}: 첫 행동 증가는 0~100%입니다.`);
      if (!(s.refine>=1 && s.refine<=5 && Number.isInteger(s.refine))) errors.push(`슬롯 ${i + 1}: 재련은 1~5재입니다.`);
      if (s.id==='tingyun' && s.eidolon && (!Number.isInteger(s.buffTarget) || !cfg.slots[s.buffTarget] || cfg.slots[s.buffTarget].id==='empty')) errors.push('정운 1돌의 축복 대상을 지정해 주세요.');
      if (!(snapshot(cfg).chars[i].speed > 0)) errors.push(`슬롯 ${i + 1}: 전투 속도가 0 이하입니다.`);
    });
    if (!cfg.slots.some(s => CHARACTERS[s.id]?.elation)) errors.push('환락 캐릭터를 최소 1명 편성해 주세요.');
    if (!(cfg.horizon > 0 && cfg.horizon <= 2000)) errors.push('계산 구간은 0 초과, 2000 AV 이하입니다.');
    if (!(cfg.target > 80 && cfg.target <= 1000)) errors.push('목표 아하 속도는 80 초과, 1000 이하입니다.');
    if (Object.values(cfg.buffs).some(v => typeof v === 'number' && !Number.isFinite(v))) errors.push('버프 값은 유효한 숫자여야 합니다.');
    if (!Number.isFinite(cfg.soloWaveBonus) || cfg.soloWaveBonus < 0) errors.push('웨이브 직접 가산은 0 이상의 숫자여야 합니다.');
    cfg.events.forEach((e, i) => {
      if (!Number.isFinite(e.time) || e.time < 0 || e.time > cfg.horizon || !Number.isFinite(e.value)) errors.push(`이벤트 ${i + 1}: 시간/수치를 확인해 주세요.`);
      if (!['pct', 'flat', 'advance', 'bonus', 'yao', 'pearl', 'ddd', 'wave'].includes(e.type)) errors.push(`이벤트 ${i + 1}: 종류를 확인해 주세요.`);
      if (!['yao', 'wave', 'ddd'].includes(e.type) && e.target !== 'all' && (!Number.isInteger(e.target) || !cfg.slots[e.target])) errors.push(`이벤트 ${i + 1}: 대상을 확인해 주세요.`);
      if ((e.type === 'advance' || e.type === 'ddd') && (e.value < -100 || e.value > 100)) errors.push(`이벤트 ${i + 1}: 행동 조정은 -100~100%입니다.`);
      if (e.type === 'yao' && !present(cfg, 'yao')) errors.push('효광 필살기 이벤트에는 효광 편성이 필요합니다.');
      if (e.type === 'pearl' && (!present(cfg, 'pearl') || cfg.slots[e.target]?.id === 'pearl' || e.target === 'all')) errors.push('펄 필살기는 펄 외의 한 캐릭터를 지정해야 합니다.');
      if (e.type === 'wave' && !isSoloWave(cfg)) errors.push('아하 직접 가산은 웨이브 단독 환락 편성에서만 사용합니다.');
      if (!['yao', 'wave', 'ddd'].includes(e.type) && e.target !== 'all' && cfg.slots[e.target]?.id === 'empty') errors.push('빈 슬롯은 이벤트 대상이 될 수 없습니다.');
      if (e.type === 'bonus' && e.target === 'all') errors.push('보너스 턴의 대상은 캐릭터 1명이어야 합니다.');
    });
    return [...new Set(errors)];
  }
  function simulate(cfg) {
    const errors = validate(cfg); if (errors.length) return { errors, log: [], counts: [] };
    const snap = snapshot(cfg), gauges = cfg.slots.map((s, i) => s.id === 'empty' ? Infinity :
      Math.max(0, 10000 * (1 - (s.initialAdvance + (s.vonwacq && snap.chars[i].speed >= 120 ? 40 : 0)) / 100)));
    gauges.push(10000);
    const pct = [0, 0, 0, 0], flat = [0, 0, 0, 0];
    let solo = snap.direct, time = 0, cursor = 0;
    const events = cfg.events.map((e, order) => ({ ...e, order })).sort((a, b) => a.time - b.time || a.order - b.order);
    const log = [], counts = Array.from({ length: 5 }, () => ({ natural: 0, bonus: 0 }));
    function speeds() {
      const chars = snap.chars.map((c, i) => c.speed + c.base * pct[i] / 100 + flat[i]);
      const ranked = snap.ranked.map(c => chars[c.i]).sort((a, b) => b - a);
      return [...chars, 80 + ranked.reduce((v, s, i) => v + s * WEIGHTS[i], 0) + solo];
    }
    function add(actor, type, note) {
      log.push({ time, actor, name: actor === 4 ? '아하' : snap.chars[actor].name, type, note,
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
        if (e.type === 'yao') { add(4, 'bonus', '효광 필살기 · 자연 게이지 유지'); afterInstant(); }
        if (e.type === 'wave') { solo = e.value; add(4, 'event', `웨이브 단독 환락 · 직접 가산 총량 ${e.value}`); }
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
  const api = { WEIGHTS, CHARACTERS, SOURCES, slot, defaults, panelSpeed, additions, snapshot, solve, validate, simulate, isSoloWave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AhaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
