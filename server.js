const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.AHA_PORT || 8767);
const html = path.join(__dirname, 'index.html');
http.createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/index.html') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'});
  fs.createReadStream(html).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Aha calculator: http://127.0.0.1:${port}/`));
