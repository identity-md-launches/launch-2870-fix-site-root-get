import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
export function createSiteServer() {
return createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url ?? '/', 'http://preview.invalid').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  // The exact same export works at / and at a static gateway subpath.
  if (path === '/preview') { res.writeHead(308, { location: './preview/' }).end(); return; }
  if (path.startsWith('/preview/')) path = path.slice('/preview'.length);
  if (path === '/') path = '/index.html';
  const file = resolve(directory, '.' + path);
  if (!file.startsWith(directory + sep)) { res.writeHead(403).end('Forbidden'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') res.end(); else res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createSiteServer();
  const port = Number(process.argv[2] ?? 4173);
  server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    console.log(`Preview: http://127.0.0.1:${typeof address === 'object' ? address.port : port}/ (also /preview/)`);
  });
}
