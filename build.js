const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const template = fs.readFileSync(path.join(dir, 'app.html'), 'utf8');
const engine = fs.readFileSync(path.join(dir, 'engine.js'), 'utf8');
const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
const state = fs.readFileSync(path.join(dir, 'state.js'), 'utf8');
const art = JSON.parse(fs.readFileSync(path.join(dir, 'art.json'), 'utf8'));
const output = template.replace('/*__ART__*/', () => 'window.AhaArt='+JSON.stringify(art)+';').replace('/*__ENGINE__*/', () => engine).replace('/*__STATE__*/', () => state).replace('/*__APP__*/', () => app);
const calculatorDir = path.join(dir, 'tools', 'aha');
fs.mkdirSync(calculatorDir, { recursive: true });
fs.writeFileSync(path.join(calculatorDir, 'index.html'), output);
const { buildArchive } = require('./site/build.cjs');
const archive = buildArchive(dir, art);
const canvasHtml = output
  .replace('<html lang="ko">', '<html lang="ko" data-canvas-host>')
  .replace(/<!--__STANDALONE_THEME_SCRIPT_START__-->[\s\S]*?<!--__STANDALONE_THEME_SCRIPT_END__-->/, '')
  .replace(
    /\/\*__STANDALONE_THEME_START__\*\/[\s\S]*?\/\*__STANDALONE_THEME_END__\*\//,
    '[data-theme-toggle]{display:none!important}\n:root[data-canvas-host] body{--path-bg:var(--canvas-path-bg)}',
  )
  .replace(/:root\{[^}]+\}/, ':root{/*__HOST_THEME__*/}');
const canvas = `import { useHostTheme } from "cursor/canvas";
const documentSource = ${JSON.stringify(canvasHtml)};
export default function AhaSpeedCalculator() {
  const theme = useHostTheme();
  const pathBadgeBackground = theme.kind === 'dark' ? '#151a22' : '#414956';
  const variables = \`color-scheme:\${theme.kind};--bg:\${theme.bg.editor};--surface:\${theme.bg.elevated};--text:\${theme.text.primary};--muted:\${theme.text.secondary};--line:\${theme.stroke.tertiary};--accent:\${theme.accent.primary};--soft:\${theme.fill.tertiary};--error:\${theme.text.primary};--canvas-path-bg:\${pathBadgeBackground};\`;
  const source = documentSource.replace('/*__HOST_THEME__*/', variables);
  return <iframe title="아하 속도 계산기 · 스타레일 4.7" srcDoc={source} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style={{width:"100%",height:"100vh",minHeight:700,border:0,display:"block",background:theme.bg.editor}} />;
}
`;
fs.writeFileSync(path.join(dir, 'aha-speed.canvas.tsx'), canvas);
console.log('Built standalone tools/aha/index.html (' + Buffer.byteLength(output) + ' bytes)');
console.log(`Built archive: ${archive.games} games, ${archive.documents} guides`);
