const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createVisuals } = require('./visual.cjs');
const { calendarSection } = require('./calendar.cjs');

const games = [
  {
    id: 'hsr',
    name: '붕괴: 스타레일',
    short: 'HSR',
    subtitle: '별을 잇는 여행',
    color: 'violet',
    icon: '✦',
    official: 'https://hsr.hoyoverse.com/ko-kr/',
  },
  {
    id: 'zzz',
    name: '젠레스 존 제로',
    short: 'ZZZ',
    subtitle: '뉴에리두의 일상',
    color: 'orange',
    icon: 'Z',
    official: 'https://zenless.hoyoverse.com/ko-kr/main',
  },
  {
    id: 'genshin',
    name: '원신',
    short: 'GENSHIN',
    subtitle: '티바트의 모험',
    color: 'blue',
    icon: '✧',
    official: 'https://genshin.hoyoverse.com/kr/home',
  },
  {
    id: 'nte',
    name: '이환',
    short: 'NTE',
    subtitle: '도시에서 만나는 이상',
    color: 'pink',
    icon: 'N',
    official: 'https://nte.perfectworld.com/kr/',
  },
  {
    id: 'wuwa',
    name: '명조',
    short: 'WUWA',
    subtitle: '파도를 넘어서는 여정',
    color: 'green',
    icon: '≈',
    official: 'https://wutheringwaves.kurogames.com/kr/main',
  },
];
const SITE_ORIGIN = 'https://pasame.github.io/fluffy-archive/';
const kinds = {
  character: '캐릭터 육성',
  party: '파티',
  guide: '입문 가이드',
  tool: '도구',
};
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

function buildArchive(root, art) {
  const calendar = JSON.parse(fs.readFileSync(path.join(root, 'site/calendar.json'), 'utf8'));
  const calendarVersion = createHash('sha256').update(fs.readFileSync(path.join(root, 'site/calendar.js'))).digest('hex').slice(0, 12);
  const styleVersion = createHash('sha256').update(fs.readFileSync(path.join(root, 'site/styles.css'))).digest('hex').slice(0, 12);
  const scriptVersion = createHash('sha256').update(fs.readFileSync(path.join(root, 'site/app.js'))).digest('hex').slice(0, 12);
  const docs = JSON.parse(fs.readFileSync(path.join(root, 'site/content.json'), 'utf8'));
  const profiles = JSON.parse(fs.readFileSync(path.join(root, 'site/profiles.json'), 'utf8'));
  const assets = JSON.parse(fs.readFileSync(path.join(root, 'site/assets-manifest.json'), 'utf8'));
  const partyGroups = JSON.parse(fs.readFileSync(path.join(root, 'site/party-groups.json'), 'utf8'));
  const visual = createVisuals({ profiles, assets, docs, escape, partyGroups });
  const ids = new Set();
  const partyKeys = new Set();
  for (const doc of docs) {
    if (!/^[a-z0-9-]+$/.test(doc.id) || ids.has(doc.id)) {
      throw new Error(`문서 ID를 확인해 주세요: ${doc.id}`);
    }
    ids.add(doc.id);
    if (doc.party) {
      const key = `${doc.game}:${doc.party.category}:${[...(doc.party.coreMemberIds || [])].sort().join(',')}`;
      if (partyKeys.has(key)) throw new Error(`Duplicate party core: ${doc.id}`);
      partyKeys.add(key);
    }

    if (
      !games.some(game => game.id === doc.game) ||
      !kinds[doc.kind] ||
      !doc.title ||
      !doc.summary ||
      (!doc.sections?.length && !doc.party?.steps?.length) ||
      !doc.sources?.length
    ) {
      throw new Error(`문서 필수 항목 누락: ${doc.id}`);
    }

    for (const source of doc.sources) {
      if (!/^https:\/\//.test(source.url)) {
        throw new Error(`출처 주소 오류: ${doc.id}`);
      }
    }
  }

  const aliases = new Set();
  for (const doc of docs) {
    for (const alias of doc.aliases || []) {
      if (!/^[a-z0-9-]+$/.test(alias) || ids.has(alias) || aliases.has(alias)) {
        throw new Error(`Invalid guide alias: ${alias}`);
      }
      aliases.add(alias);
    }
  }

  const groupedParties = new Map();
  const groupDocs = partyGroups.map(group => {
    if (!/^[a-z0-9-]+$/.test(group.id) || ids.has(group.id) || aliases.has(group.id) || !group.variants?.length) {
      throw new Error(`Invalid party group: ${group.id}`);
    }
    ids.add(group.id);
    const variants = group.variants.map(id => {
      const doc = docs.find(item => item.id === id);
      if (!doc?.party || doc.party.category !== group.category || groupedParties.has(id)) {
        throw new Error(`Invalid party variant: ${id}`);
      }
      groupedParties.set(id, group);
      return doc;
    });
    return {
      id: group.id, game: 'hsr', kind: 'party', title: group.title,
      summary: '메인 딜러를 선택하면 운영과 대체 후보가 함께 바뀝니다.',
      tags: variants.flatMap(doc => [doc.party.lead, ...(doc.tags || [])]),
      party: { category: group.category, lead: group.title },
      partyGroup: group,
    };
  });

  const calculator = {
    id: 'aha',
    game: 'hsr',
    kind: 'tool',
    title: '아하 속도 계산기',
    summary: '파티의 속도와 행동 순서를 확인하고, 목표에 필요한 속도를 찾아보세요.',
    tags: ['아하', '속도', 'SPD', '행동 순서', '계산기'],
    href: 'tools/aha/index.html',
    art: 'char-aeon',
  };
  const entries = [...docs.filter(doc => !groupedParties.has(doc.id)), ...groupDocs, calculator];
  const hrefFor = doc => doc.href || `guides/${doc.id}/index.html`;
  const badge = game => `<span class="game-symbol ${game.color}" aria-hidden="true">${game.icon}</span>`;
  const imageFor = (doc, prefix) => {
    const profile = profiles.find(item => item.id === doc.id);
    if (profile) {
      const portrait = assets.characters[profile.characterId];
      return `<img class="doc-avatar" src="${prefix}${portrait.path}" alt="" width="64" height="64" loading="lazy">`;
    }
    const key = doc.art || ({
      'huohuo': 'char-huohuo',
      'ruan-mei': 'char-ruan',
      'hyacine': 'char-hyacine',
    })[doc.id];
    return key && art[key]
      ? `<img class="doc-avatar" src="${art[key]}" alt="" width="64" height="64" loading="lazy">`
      : '';
  };

  const dedupeSearchText = parts => {
    const seen = new Set();
    const tokens = [];
    for (const part of parts) {
      for (const token of String(part || '').trim().split(/\s+/)) {
        if (!token) continue;
        const key = token.normalize('NFKC').toLocaleLowerCase('ko');
        if (seen.has(key)) continue;
        seen.add(key);
        tokens.push(token);
      }
    }
    return tokens.join(' ');
  };

  const card = (doc, prefix, searchable = false) => {
    const game = games.find(item => item.id === doc.game);
    const profile = profiles.find(item => item.id === doc.id);
    const equipmentNames = profile ? [
      ...profile.cones.map(cone => cone.name),
      ...profile.relicBuilds.flatMap(build => [
        build.name,
        ...build.cavernSets.map(set => assets.relicSets[set.id].name),
        assets.relicSets[build.planarSet].name,
      ]),
      ...(profile.targetBuilds || []).flatMap(build => build.relicBuild ? [
        build.name,
        ...build.relicBuild.cavernSets.map(set => assets.relicSets[set.id].name),
        assets.relicSets[build.relicBuild.planarSet].name,
      ] : []),
    ] : [];
    const equipmentDetails = profile ? profile.cones.flatMap(cone => [cone.short, cone.detail]) : [];
    const sectionText = (doc.sections || []).flatMap(section => [
      section.title,
      ...(section.paragraphs || []),
      ...(section.bullets || []),
    ]);
    const searchableText = dedupeSearchText([
      doc.title,
      game.name,
      game.short,
      kinds[doc.kind],
      ...(doc.tags || []),
      ...equipmentNames,
      doc.summary,
      ...sectionText,
      ...equipmentDetails,
    ]);
    const searchAttributes = searchable
      ? ` data-entry data-game="${doc.game}" data-kind="${doc.kind}" data-search="${escape(searchableText)}"`
      : '';
    const actionLabel = doc.kind === 'tool' ? '계산기 열기' : '읽어보기';
    return `
      <a class="doc-card" href="${prefix}${hrefFor(doc)}"${searchAttributes}>
        <div class="doc-top">
          <span class="eyebrow">${escape(game.name)} · ${kinds[doc.kind]}</span>${imageFor(doc, prefix)}
        </div>
        <h3>${escape(doc.title)}</h3>
        <p>${escape(doc.summary)}</p>
        <span class="doc-more">${actionLabel} <span aria-hidden="true">↗</span></span>
      </a>`;
  };

  function layout({ title, description, prefix = '', body, active = '', legacy = false, canonicalPath = '', ogImage = 'site/raccoon.png', ogType = 'website' }) {
    const legacyScript = legacy
      ? `
        <script>
          function forwardCalculatorShare() {
            if (location.hash.startsWith('#aha=')) {
              location.replace(new URL('tools/aha/index.html' + location.search + location.hash, location.href).href);
            }
          }
          forwardCalculatorShare();
          addEventListener('hashchange', forwardCalculatorShare);
        </script>`
      : '';
    const gamesCurrent = active === 'games' ? ' aria-current="page"' : '';
    const searchCurrent = active === 'search' ? ' aria-current="page"' : '';
    const pageTitle = `${title} · Fluffy Archive`;
    const shareUrl = new URL(canonicalPath, SITE_ORIGIN).href;
    const shareImage = new URL(ogImage, SITE_ORIGIN).href;

    return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <title>${escape(pageTitle)}</title>
    <meta name="description" content="${escape(description)}">
    <meta property="og:site_name" content="Fluffy Archive">
    <meta property="og:type" content="${escape(ogType)}">
    <meta property="og:title" content="${escape(pageTitle)}">
    <meta property="og:description" content="${escape(description)}">
    <meta property="og:url" content="${escape(shareUrl)}">
    <meta property="og:image" content="${escape(shareImage)}">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escape(pageTitle)}">
    <meta name="twitter:description" content="${escape(description)}">
    <meta name="twitter:image" content="${escape(shareImage)}">
    <link rel="icon" href="${prefix}site/favicon.svg" type="image/svg+xml">
    <script>try{const t=localStorage.getItem('fluffy-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch{}</script>
    <link rel="stylesheet" href="${prefix}site/styles.css?v=${styleVersion}">${legacyScript}
    <script src="${prefix}site/app.js?v=${scriptVersion}" defer></script>
  </head>
  <body>
    <a class="skip-link" href="#main">본문으로 건너뛰기</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="${prefix}index.html" aria-label="Fluffy Archive 홈">
          <img src="${prefix}site/favicon.svg" width="40" height="40" alt=""><span>Fluffy <strong>Archive</strong></span>
        </a>
        <nav aria-label="주 메뉴">
          <a href="${prefix}index.html#games"${gamesCurrent}>게임</a>
          <a href="${prefix}index.html#tools">도구</a>
          <a class="nav-search" aria-label="검색" href="${prefix}search/index.html"${searchCurrent}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="10" cy="10" r="6"></circle>
              <path d="m15 15 5 5"></path>
            </svg><span>검색</span>
          </a>
          <button type="button" class="theme-toggle" data-theme-toggle aria-label="화면 테마 변경 (현재: 시스템)">시스템</button>
        </nav>
      </div>
    </header>
    <main id="main" tabindex="-1">${body}</main>
    <footer class="site-footer">
      <a class="footer-brand" href="${prefix}index.html">Fluffy Archive</a>
      <p>좋아하는 게임을 오래, 즐겁게.</p>
      <small>게임 팬이 만드는 비공식 자료실입니다. 게임 이미지와 명칭의 권리는 각 권리자에게 있습니다.</small>
    </footer>
  </body>
</html>`;
  }

  function write(relative, html) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, html);
  }

  function writeRedirect(id, destination, doc) {
    const resolved = new URL(destination, `${SITE_ORIGIN}guides/${id}/`).href;
    const canonicalPath = resolved.startsWith(SITE_ORIGIN) ? resolved.slice(SITE_ORIGIN.length) : destination;
    const profile = profiles.find(item => item.id === doc.id);
    const ogImage = profile
      ? assets.characters[profile.characterId]?.path
      : assets.characters[doc.party?.coreMemberIds?.[0]]?.path || `site/assets/games/${doc.game}.jpg`;
    const html = layout({
      title: doc.title,
      description: doc.summary,
      canonicalPath,
      ogImage,
      ogType: 'article',
      prefix: '../../',
      body: `<a class="button" href="${escape(destination)}">${escape(doc.title)} →</a>`,
    }).replace('</head>', `    <meta http-equiv="refresh" content="0;url=${escape(destination)}">\n    <link rel="canonical" href="${escape(destination)}">\n  </head>`);
    write(`guides/${id}/index.html`, html);
  }

  const gameCards = games.map(game => `
    <a class="game-card ${game.color}" href="games/${game.id}/index.html">
      <img class="game-cover" src="site/assets/games/${game.id}.jpg" alt="" width="64" height="64">
      <span><strong>${game.name}</strong><small>${game.short}</small></span>
      <span class="arrow" aria-hidden="true">↗</span>
    </a>`).join('');
  const heroArt = `
    <img class="hero-raccoon" src="site/raccoon.png" alt="카메라를 든 너구리" width="493" height="645">
    <img class="evanescia-sticker" src="${art['char-eva']}" alt="에바네시아" width="80" height="80">`;

  write('index.html', layout({
    title: '복슬복슬호 자료실',
    description: '다섯 게임의 육성 가이드, 파티 구성과 아하 속도 계산기를 한곳에서 만나보세요.',
    canonicalPath: '',
    ogImage: 'site/raccoon.png',
    legacy: true,
    body: `
      <section class="home-hero">
        <div class="hero-copy">
          <p class="eyebrow">복슬복슬호 자료실</p>
          <h1>좋아하는 게임의 <br>다음 한 걸음.</h1>
          <p class="hero-description">오늘의 일정, 캐릭터 육성, 추천 파티.</p>
          <form class="search-box" action="search/index.html" role="search">
            <label class="sr-only" for="home-search">가이드와 도구 검색</label>
            <input id="home-search" type="search" name="q" placeholder="캐릭터, 파티, 도구 검색" maxlength="120">
            <button type="submit" aria-label="검색">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="10" cy="10" r="6"></circle>
                <path d="m15 15 5 5"></path>
              </svg>
            </button>
          </form>
        </div>
        <div class="hero-visual">
          ${heroArt}
          <span class="hero-stamp" aria-hidden="true">FLUFFY<br>ARCHIVE <span>✦</span></span>
        </div>
      </section>
      <section id="games" class="home-section home-game-links">
        <div class="section-heading">
          <h2>게임 자료실</h2>
        </div>
        <div class="game-grid">${gameCards}</div>
      </section>
      ${calendarSection(calendar, games, escape, calendarVersion)}
      <section id="tools" class="tool-banner">
        <div class="tool-icon" aria-hidden="true">✦</div>
        <div>
          <p class="eyebrow">붕괴: 스타레일 · 도구</p>
          <h2>아하 타임, 얼마나 빨라질까요?</h2>
          <p>파티를 고르고 속도를 입력하면 바로 확인할 수 있어요.</p>
        </div>
        <a class="button primary" href="tools/aha/index.html">속도 계산기 열기 <span aria-hidden="true">↗</span></a>
      </section>
      <section class="home-section">
        <div class="section-heading horizontal">
          <div>
            <p class="eyebrow">한 장씩 쌓아가는 기록</p>
            <h2>먼저 읽어보세요</h2>
          </div>
          <a class="text-link" href="search/index.html">전체 가이드 <span aria-hidden="true">→</span></a>
        </div>
        <div class="doc-grid">${docs.slice(0, 3).map(doc => card(doc, '')).join('')}</div>
      </section>`,
  }));

  for (const game of games) {
    const ownDocs = entries.filter(doc => doc.game === game.id);

    write(`games/${game.id}/index.html`, layout({
      title: game.name,
      description: `${game.name} 육성과 파티 가이드`,
      canonicalPath: `games/${game.id}/index.html`,
      ogImage: `site/assets/games/${game.id}.jpg`,
      prefix: '../../',
      active: 'games',
      body: `
        <div class="page-heading">
          <a class="back-link" href="../../index.html#games">← 모든 게임</a>
          <div class="game-title">
            ${badge(game)}
            <div>
              <p class="eyebrow">${game.short}</p>
              <h1>${game.name}</h1>
            </div>
          </div>
          <p>육성과 파티, 필요한 도구를 함께 확인하세요.</p>
        </div>
        <div class="game-page">
          ${visual.gameCatalog(ownDocs, '../../', kinds, card)}
          <aside class="info-board">
            <p class="eyebrow">정보판</p>
            <h2>공식 소식 확인하기</h2>
            <p>업데이트와 이벤트 일정은 공식 홈페이지에서 확인하실 수 있어요.</p>
            <a class="text-link" href="${game.official}" target="_blank" rel="noopener noreferrer">공식 홈페이지 <span aria-hidden="true">↗</span></a>
            <div class="board-note">
              <strong>가이드의 기준을 확인해 주세요</strong>
              <p>각 문서에서 확인일과 추천 조건을 볼 수 있어요. 파티와 장비에 따라 필요한 세팅은 달라질 수 있습니다.</p>
            </div>
          </aside>
        </div>`,
    }));
  }

  for (const doc of docs) {
    const group = groupedParties.get(doc.id);
    if (group) {
      writeRedirect(doc.id, `../${group.id}/index.html?party=${doc.id}`, doc);
      continue;
    }
    const profile = profiles.find(item => item.id === doc.id);
    if (profile || doc.party) {
      const ogImage = profile
        ? assets.characters[profile.characterId]?.path
        : assets.characters[doc.party.coreMemberIds?.[0]]?.path;
      write(`guides/${doc.id}/index.html`, layout({
        title: doc.title,
        description: doc.summary,
        canonicalPath: `guides/${doc.id}/index.html`,
        ogImage: ogImage || `site/assets/games/${doc.game}.jpg`,
        ogType: 'article',
        prefix: '../../',
        body: doc.party ? visual.partyDetail(doc, '../../') : visual.characterDetail(doc, '../../'),
      }));
      continue;
    }
    const game = games.find(item => item.id === doc.game);
    const related = (doc.related || [])
      .map(id => entries.find(entry => entry.id === id))
      .filter(Boolean);
    const sections = doc.sections.map((section, index) => {
      const paragraphs = (section.paragraphs || []).map(text => `<p>${escape(text)}</p>`).join('');
      const bullets = section.bullets?.length
        ? `<ul>${section.bullets.map(text => `<li>${escape(text)}</li>`).join('')}</ul>`
        : '';
      return `
        <section class="article-section" id="section-${index + 1}">
          <h2>${escape(section.title)}</h2>
          ${paragraphs}
          ${bullets}
        </section>`;
    }).join('');
    const quickFacts = doc.quickFacts?.length ? `
      <section class="quick-facts" aria-label="핵심 요약">
        <h2>먼저 확인하세요</h2>
        <dl>
          ${doc.quickFacts.map(([label, value]) => `
            <div>
              <dt>${escape(label)}</dt>
              <dd>${escape(value)}</dd>
            </div>`).join('')}
        </dl>
      </section>` : '';
    const sources = doc.sources.map(source => `
      <li>
        <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.label)} ↗</a>
      </li>`).join('');
    const contents = doc.sections.map((section, index) => `
      <a href="#section-${index + 1}">${escape(section.title)}</a>`).join('');
    const relatedSection = related.length ? `
      <section class="home-section related">
        <h2>함께 보면 좋아요</h2>
        <div class="doc-grid">${related.map(entry => card(entry, '../../')).join('')}</div>
      </section>` : '';

    write(`guides/${doc.id}/index.html`, layout({
      title: doc.title,
      description: doc.summary,
      canonicalPath: `guides/${doc.id}/index.html`,
      ogImage: `site/assets/games/${doc.game}.jpg`,
      ogType: 'article',
      prefix: '../../',
      body: `
        <div class="article-header">
          <a class="back-link" href="../../games/${doc.game}/index.html">← ${game.name}</a>
          <p class="eyebrow">${kinds[doc.kind]}</p>
          <h1>${escape(doc.title)}</h1>
          <p class="article-summary">${escape(doc.summary)}</p>
          <div class="article-meta">
            <span>확인 ${escape(doc.updated)}</span>
            <span>${escape(doc.basis)}</span>
          </div>
        </div>
        <div class="article-layout">
          <article>
            ${quickFacts}
            ${sections}
            <details class="article-sources">
              <summary>출처와 확인 범위</summary>
              <p>${escape(doc.basis)}</p>
              <ul>${sources}</ul>
            </details>
          </article>
          <aside class="article-nav">
            <p class="eyebrow">이 문서에서</p>
            <nav aria-label="문서 목차">${contents}</nav>
            <a class="text-link" href="../../games/${doc.game}/index.html">${game.name} 자료 더 보기 →</a>
          </aside>
        </div>${relatedSection}`,
    }));
  }

  for (const doc of docs) {
    for (const alias of doc.aliases || []) {
      const group = groupedParties.get(doc.id);
      const destination = group ? `../${group.id}/index.html?party=${doc.id}` : `../${doc.id}/index.html`;
      writeRedirect(alias, destination, doc);
    }
  }

  for (const group of partyGroups) {
    const firstVariant = docs.find(item => item.id === group.variants[0]);
    const ogImage = assets.characters[firstVariant?.party?.coreMemberIds?.[0]]?.path || 'site/assets/games/hsr.jpg';
    write(`guides/${group.id}/index.html`, layout({
      title: group.title,
      description: '메인 딜러별 운영법과 지원 캐릭터의 대체 후보를 확인하세요.',
      canonicalPath: `guides/${group.id}/index.html`,
      ogImage,
      ogType: 'article',
      prefix: '../../',
      body: visual.partyGroupDetail(group, '../../'),
    }));
  }

  const gameOptions = games.map(game => `
    <option value="${game.id}">${game.name}</option>`).join('');
  const kindOptions = Object.entries(kinds).map(([key, value]) => `
    <option value="${key}">${value}</option>`).join('');

  write('search/index.html', layout({
    title: '자료 검색',
    description: '게임, 캐릭터, 파티와 도구를 검색하세요.',
    canonicalPath: 'search/index.html',
    ogImage: 'site/raccoon.png',
    prefix: '../',
    active: 'search',
    body: `
      <div class="page-heading">
        <p class="eyebrow">복슬복슬호 자료실</p>
        <h1>무엇을 찾으세요?</h1>
      </div>
      <section data-catalog class="search-page">
        <h2 class="sr-only">검색 결과</h2>
        <form class="search-box" role="search" data-search-form>
          <label class="sr-only" for="archive-query">자료 검색</label>
          <input id="archive-query" name="q" type="search" placeholder="캐릭터, 파티, 도구 검색" maxlength="120" data-query>
          <button type="submit">검색</button>
        </form>
        <div class="search-filters">
          <label>게임<select data-game-filter>
              <option value="">모든 게임</option>${gameOptions}
            </select></label>
          <label>종류<select data-type-filter>
              <option value="">모든 자료</option>${kindOptions}
            </select></label>
        </div>
        <p class="result-count" data-count role="status">자료 ${entries.length}개</p>
        <div class="doc-grid">${entries.map(doc => card(doc, '../', true)).join('')}</div>
        <div class="empty-state" data-empty hidden>
          <h2>검색 결과가 없어요</h2>
          <p>캐릭터 이름을 짧게 입력하거나 다른 게임·종류를 선택해 주세요.</p>
          <button class="button" type="button" data-clear>검색 조건 지우기</button>
        </div>
      </section>`,
  }));

  const sitemapPaths = [
    '',
    'search/index.html',
    'tools/aha/index.html',
    ...games.map(game => `games/${game.id}/index.html`),
    ...docs.filter(doc => !groupedParties.has(doc.id)).map(doc => `guides/${doc.id}/index.html`),
    ...partyGroups.map(group => `guides/${group.id}/index.html`),
  ];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapPaths.map(relative => `  <url><loc>${escape(new URL(relative, SITE_ORIGIN).href)}</loc></url>`).join('\n')}\n</urlset>\n`;
  write('sitemap.xml', sitemapXml);
  return { documents: docs.length, games: games.length };
}

module.exports = { buildArchive, games };
