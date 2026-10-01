const fs = require('node:fs');
const path = require('node:path');
const dir = __dirname;
const template = fs.readFileSync(path.join(dir, 'app.html'), 'utf8');
const engine = fs.readFileSync(path.join(dir, 'engine.js'), 'utf8');
const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
const output = template.replace('/*__ENGINE__*/', () => engine).replace('/*__APP__*/', () => app);
fs.writeFileSync(path.join(dir, 'index.html'), output);
const canvasHtml = output.replace(/:root\{[^}]+\}/, ':root{/*__HOST_THEME__*/}');
const canvas = `import { useHostTheme } from "cursor/canvas";
const documentSource = ${JSON.stringify(canvasHtml)};
export default function AhaSpeedCalculator() {
  const theme = useHostTheme();
  const variables = \`color-scheme:\${theme.kind};--bg:\${theme.bg.editor};--surface:\${theme.bg.elevated};--text:\${theme.text.primary};--muted:\${theme.text.secondary};--line:\${theme.stroke.tertiary};--accent:\${theme.accent.primary};--soft:\${theme.fill.tertiary};--error:\${theme.text.primary};\`;
  const source = documentSource.replace('/*__HOST_THEME__*/', variables);
  return <iframe title="아하 속도 계산기 · 스타레일 4.6" srcDoc={source} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style={{width:"100%",height:"100vh",minHeight:700,border:0,display:"block",background:theme.bg.editor}} />;
}
`;
fs.writeFileSync(path.join(dir, 'aha-speed.canvas.tsx'), canvas);
console.log('Built standalone index.html (' + Buffer.byteLength(output) + ' bytes)');
