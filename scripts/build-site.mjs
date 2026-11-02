import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html', 'logo-mark.png', 'logo-mark-32.png', 'logo-180.png', 'favicon.ico', 'og.png'];
const html = await readFile(resolve(root, 'public/index.html'), 'utf8');
const title = 'Squeek Holder Bot — Telegram alerts for Squeekchain';
const canonical = 'https://squeek-holder-bot.chainn.workers.dev/';
assert.ok(html.includes(`<title>${title}</title>`), 'Exact page title');
for (const marker of ['id="live-state"', 'id="live-block"', 'id="live-mint"', 'property="og:image"', 'name="twitter:card"', 'name="description"', 'rel="icon"', 'const STATUS_MS = 10_000;', 'const ECONOMY_MS = 60_000;']) {
  assert.ok(html.includes(marker), `Missing ${marker}`);
}
for (const needle of ['t.me/SqueekHolder_Bot', '/hamster on|off', 'rel="canonical"']) {
  assert.equal(html.split('\n').filter(line => line.includes(needle)).length, 1, `${needle} must appear on exactly one line`);
}
assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`));
assert.ok(html.includes(`<meta property="og:image" content="${canonical}og.png">`));
assert.ok(html.includes(`<meta name="twitter:image" content="${canonical}og.png">`));
assert.match(html, /<img class="logo" src="logo-mark\.png\?v=2"/);
assert.match(html, /href="https:\/\/t\.me\/SqueekHolder_Bot" target="_blank" rel="noopener"/);
assert.doesNotMatch(html, /(?:src|href)="\//, 'Asset URLs must be relative');
assert.doesNotMatch(html, /\bTODO\b|placeholder|t\.me\/(?!SqueekHolder_Bot)[\w]+/i);
const commands = [...html.slice(html.indexOf('<section id="commands">'), html.indexOf('<section id="how">')).matchAll(/class="cmd"><code>\/(\w+)/g)].map(match => match[1]);
assert.deepEqual([...commands].sort(), ['watch', 'unwatch', 'list', 'status', 'claim', 'mergecheck', 'ladder', 'threshold', 'alerts', 'hamster', 'block', 'digest', 'quiet', 'start', 'lang', 'privacy', 'delete', 'help'].sort());
const assets = [];
for (const file of files) {
  const content = await readFile(resolve(root, 'public', file));
  if (file.endsWith('.png')) assert.equal(content.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `PNG signature: ${file}`);
  if (file.endsWith('.ico')) assert.equal(content.subarray(0, 4).toString('hex'), '00000100', 'ICO signature');
  assets.push({ file, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex') });
}
await rm(resolve(root, 'dist'), { recursive: true, force: true });
await mkdir(resolve(root, 'dist'), { recursive: true });
for (const file of files) await copyFile(resolve(root, 'public', file), resolve(root, 'dist', file));
await mkdir(resolve(root, 'artifacts'), { recursive: true });
await writeFile(resolve(root, 'artifacts/site-build.json'), JSON.stringify({
  upstream: { repository: 'https://github.com/DinhTienhz/squeek-holder-bot', branch: 'master', commit: 'ad869b547c3b123df946c060dd5c07711134bc4a', assetsUnmodified: true },
  entry: 'index.html', source: 'public/', export: 'dist/', files: assets,
  totalExportBytes: assets.reduce((sum, file) => sum + file.bytes, 0),
}, null, 2) + '\n');
console.log(`Built dist/: ${files.length} files, ${assets.reduce((sum, file) => sum + file.bytes, 0)} bytes. HTML and runtime assets copied byte-for-byte from public/.`);
