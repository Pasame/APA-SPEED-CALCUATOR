const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildArchive, games } = require('./site/build.cjs');
const art = require('./art.json');
const root = __dirname;

const result = buildArchive(root, art);
assert.equal(result.games, 5);
assert.ok(result.documents >= 9, 'initial published guides exist');
const docs = require('./site/content.json');
const known = new Set([...docs.map(doc => doc.id), 'aha']);
for (const doc of docs) {
  for (const related of doc.related || []) assert.ok(known.has(related), `${doc.id} has valid related document ${related}`);
}
console.log('PASS archive content has unique IDs, valid related documents and five games');

const pages = ['index.html', 'search/index.html', ...games.map(game => `games/${game.id}/index.html`), ...docs.map(doc => `guides/${doc.id}/index.html`)];
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.ok(html.includes('lang="ko"'));
  for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|data:|#)/.test(link)) continue;
    const relative = link.split(/[?#]/)[0];
    const target = path.resolve(root, path.dirname(page), relative);
    assert.ok(target.startsWith(root + path.sep), `${page} link stays in project`);
    assert.ok(fs.existsSync(target), `${page} has existing relative target ${link}`);
  }
}
console.log('PASS generated pages have valid links and assets under a Pages project path');

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const redirect = home.match(/<script>(function forwardCalculatorShare[\s\S]*?)<\/script>/)[1];
for (const base of ['https://pasame.github.io/fluffy-archive/', 'https://pasame.github.io/fluffy-archive/index.html']) {
  let destination;
  const location = { href: base + '?from=old#aha=encoded-value', hash: '#aha=encoded-value', search: '?from=old', replace(value) { destination = value; } };
  vm.runInNewContext(redirect, { location, URL, addEventListener() {} });
  assert.equal(destination, 'https://pasame.github.io/fluffy-archive/tools/aha/index.html?from=old#aha=encoded-value');
}
let redirected = false;
let onHashChange;
const location = { href: 'https://pasame.github.io/fluffy-archive/', hash: '#games', search: '', replace() { redirected = true; } };
vm.runInNewContext(redirect, { location, URL, addEventListener(name, callback) { if (name === 'hashchange') onHashChange = callback; } });
assert.equal(redirected, false, 'normal archive hash does not open calculator');
location.hash = '#aha=another-share';
onHashChange();
assert.equal(redirected, true, 'shares opened on the already loaded home still reach the calculator');
console.log('PASS legacy Aha shares preserve query and hash without redirecting normal visitors');

const calculator = fs.readFileSync(path.join(root, 'tools/aha/index.html'), 'utf8');
for (const source of ['engine.js', 'state.js', 'app.js']) {
  assert.ok(calculator.includes(fs.readFileSync(path.join(root, source), 'utf8')), `standalone calculator contains current ${source}`);
}
assert.ok(!/<script[^>]+src=/.test(calculator));
assert.ok(!/<link[^>]+rel="stylesheet"/.test(calculator));
console.log('PASS moved calculator remains self-contained and includes unmodified source modules');
