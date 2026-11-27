const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.AHA_PORT || 8767);
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.xml': 'application/xml; charset=utf-8' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  if (pathname.startsWith('/fluffy-archive/')) pathname = pathname.slice('/fluffy-archive'.length);
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(404); res.end(); return; }
  if (pathname.endsWith('/')) file = path.join(file, 'index.html');
  const type = types[path.extname(file)];
  if (!type || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Fluffy Archive: http://127.0.0.1:${port}/`));
