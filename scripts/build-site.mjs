import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'public/index.html'), 'utf8');
const title = 'Squeek Holder Bot — Telegram alerts for Squeekchain';
for (const text of [`<title>${title}</title>`, 'id="live-state"', 'id="live-block"', 'id="live-mint"', 'property="og:image"', 'rel="icon"']) {
  if (!html.includes(text)) throw new Error(`Missing required HTML: ${text}`);
}
if (/src="\/|href="\/(?!\/)/.test(html)) throw new Error('Use relative local asset URLs.');
if (!html.includes('const REFRESH_MS = 10_000;')) throw new Error('The live refresh interval must be 10 seconds.');

// UnixFS v1 single-chunk file, DAG-PB, CIDv1, SHA2-256. Deliberately no directory wrapper.
// The page stays below one chunk (256 KiB). Pin this exact file, not its parent folder.
function varint(value) {
  const out = [];
  do { out.push((value & 127) | (value > 127 ? 128 : 0)); value = Math.floor(value / 128); } while (value);
  return Buffer.from(out);
}
function field(number, bytes) { return Buffer.concat([varint(number * 8 + 2), varint(bytes.length), bytes]); }
function base32(bytes) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let value = 0, bits = 0, out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { bits -= 5; out += alphabet[(value >>> bits) & 31]; }
  }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
function unixfsFile(content) {
  if (content.length > 262144) throw new Error('Single-chunk file budget exceeded.');
  const data = Buffer.concat([Buffer.from([8, 2]), field(2, content), Buffer.from([24]), varint(content.length)]);
  const block = field(1, data);
  const digest = createHash('sha256').update(block).digest();
  const cidBytes = Buffer.concat([Buffer.from([1, 112, 18, 32]), digest]);
  return { cid: `b${base32(cidBytes)}`, cidBytes, block };
}
const content = Buffer.from(html);
const file = unixfsFile(content);
const imageBytes = await readFile(resolve(root, 'public/assets/share.png'));
const image = unixfsFile(imageBytes);
await mkdir(resolve(root, 'dist/assets'), { recursive: true });
await mkdir(resolve(root, 'artifacts'), { recursive: true });
await writeFile(resolve(root, 'dist/index.html'), content);
await copyFile(resolve(root, 'public/assets/favicon.svg'), resolve(root, 'dist/assets/favicon.svg'));
await copyFile(resolve(root, 'public/assets/share.png'), resolve(root, 'dist/assets/share.png'));

// CARv1: a real file DAG for an authenticated publisher to import, not a claim that it is pinned.
// The share image is a second root, so importing the CAR preserves both immutable files.
const cborCid = (cid) => Buffer.concat([Buffer.from([0xd8, 0x2a, 0x58, cid.length + 1, 0]), cid]);
const header = Buffer.concat([
  Buffer.from([0xa2, 0x65]), Buffer.from('roots'), Buffer.from([0x82]), cborCid(file.cidBytes), cborCid(image.cidBytes),
  Buffer.from([0x67]), Buffer.from('version'), Buffer.from([0x01]),
]);
const record = ({ cidBytes, block }) => { const body = Buffer.concat([cidBytes, block]); return Buffer.concat([varint(body.length), body]); };
await writeFile(resolve(root, 'artifacts/site-root.car'), Buffer.concat([varint(header.length), header, record(file), record(image)]));
await writeFile(resolve(root, 'artifacts/site-root.json'), JSON.stringify({
  sourceCommit: 'ed8af27b4342500e53e364bf9e3ae724fe791974',
  entry: 'dist/index.html', fileCid: file.cid, fileType: 'UnixFS file (DAG-PB), not a directory',
  import: { cidVersion: 1, rawLeaves: false, wrapWithDirectory: false, chunkSize: 262144 },
  sha256: createHash('sha256').update(content).digest('hex'), bytes: content.length,
  shareImage: { path: 'dist/assets/share.png', fileCid: image.cid },
  rootRequest: { path: '/', status: 200, contentType: 'text/html; charset=utf-8', title },
  hosting: { publishedFileCid: null, rootMappingVerified: false, reason: 'No publishing capability or hosting credential was supplied. The committed dist/ is ready for the assignment publisher.' },
}, null, 2) + '\n');
await copyFile(resolve(root, 'artifacts/site-root.json'), resolve(root, 'deploy/site-root.json'));
const worker = await readFile(resolve(root, 'deploy/site-root-worker.mjs'), 'utf8');
await writeFile(resolve(root, 'artifacts/site-root-worker.mjs'), worker.replace(
  "import site from './site-root.json' with { type: 'json' };",
  `const site = ${JSON.stringify({ fileCid: file.cid, shareImage: { fileCid: image.cid } })};`,
));
console.log(`Built dist/index.html (${content.length} bytes); UnixFS FILE CID ${file.cid}`);
