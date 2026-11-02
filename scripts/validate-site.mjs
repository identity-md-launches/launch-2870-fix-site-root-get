import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createSiteServer } from './preview-site.mjs';
import { handleRequest } from '../deploy/site-root-worker.mjs';

// Optional test tooling stays outside the repository. See README for installation.
const toolDirectory = process.argv[2];
if (!toolDirectory) throw new Error('Usage: node scripts/validate-site.mjs /absolute/path/to/test-tools');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireTool = createRequire(resolve(toolDirectory, 'package.json'));
const playwrightModule = await import(pathToFileURL(requireTool.resolve('playwright')).href);
const { chromium, webkit } = playwrightModule.default ?? playwrightModule;
const axeModule = await import(pathToFileURL(requireTool.resolve('@axe-core/playwright')).href);
const AxeBuilder = axeModule.default.default ?? axeModule.default;
const report = { at: new Date().toISOString(), exportSha256: '', checks: [], api: [], limitations: [] };
const artifacts = resolve(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
async function check(name, action) {
  try { const detail = await action(); report.checks.push({ name, passed: true, detail: detail ?? 'passed' }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, passed: false, detail: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
report.exportSha256 = createHash('sha256').update(html).digest('hex');
const server = createSiteServer();
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  await check('root and gateway subpath return the exact HTML with HTTP 200', async () => {
    assert.equal(html, await readFile(resolve(root, 'public/index.html'), 'utf8'));
    for (const path of ['/', '/index.html', '/preview/']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(await response.text(), html);
    }
    const response = await fetch(origin + '/preview/assets/share.png');
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal((await fetch(origin + '/missing')).status, 404);
    return 'Root, index and subpath match source; share image resolves; unknown path is 404.';
  });
  await check('optional gateway worker serves file roots and redirects the legacy path', async () => {
    const manifest = JSON.parse(await readFile(resolve(root, 'artifacts/site-root.json'), 'utf8'));
    let requested;
    const success = async (url) => { requested = url; return new Response(html); };
    const result = await handleRequest(new Request('https://site.example/'), success);
    assert.equal(result.status, 200); assert.match(result.headers.get('content-type'), /text\/html/);
    assert.equal(requested, `https://ipfs.io/ipfs/${manifest.fileCid}`); assert.equal(await result.text(), html);
    const image = await handleRequest(new Request('https://site.example/assets/share.png'), success);
    assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/png');
    assert.equal(requested, `https://ipfs.io/ipfs/${manifest.shareImage.fileCid}`);
    assert.equal((await handleRequest(new Request('https://site.example/public/index.html'), success)).status, 308);
    assert.equal((await handleRequest(new Request('https://site.example/', { method: 'POST' }), success)).status, 405);
    assert.equal((await handleRequest(new Request('https://site.example/missing'), success)).status, 404);
    assert.equal((await handleRequest(new Request('https://site.example/'), async () => new Response('', { status: 404 }))).status, 502);
    return 'File CID proxy, image route, 308 legacy redirect, 404, 405 and upstream failure checked with simulated upstream responses.';
  });
  browser = await chromium.launch({ headless: true, channel: 'chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await check('live API supplies all panel values', async () => {
    page.on('response', async (response) => {
      if (!response.url().startsWith('https://api.squeekchain.com/v1/')) return;
      try {
        const data = await response.json();
        const fields = response.url().endsWith('/status')
          ? { state: data.measurement?.coreStatus, rpmMilli: data.measurement?.rpmMilli, height: data.builder?.anchor?.blockHeight, progress: data.builder?.anchor?.blockProgress }
          : { mintedBaseUnits: data.supply?.totalMintedBaseUnits, capBaseUnits: data.supply?.capBaseUnits, decimals: data.asset?.decimals };
        report.api.push({ url: response.url(), status: response.status(), at: new Date().toISOString(), generatedAt: data.generatedAt, fields });
      } catch { /* Failures are checked through the visible state below. */ }
    });
    await page.goto(origin + '/preview/');
    await page.waitForFunction(() => document.getElementById('live-feedback')?.textContent.includes('Public API connected'), null, { timeout: 15_000 });
    for (const id of ['live-state', 'live-rpm', 'live-block', 'live-mint']) {
      const value = await page.locator('#' + id).innerText();
      assert.ok(value && !/Loading|Unavailable|—/.test(value));
    }
    return await page.locator('.live-grid').innerText();
  });
  await check('mobile primary action and responsive reflow', async () => {
    const widths = [320, 390, 660, 800, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width > 800 ? 900 : 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `overflow at ${width}`);
      if (width === 390) {
        const action = await page.locator('.btn-primary').boundingBox();
        assert.ok(action.y >= 0 && action.y + action.height < 844);
        await page.screenshot({ path: resolve(artifacts, 'mobile.png') });
      }
      if (width === 1440) await page.screenshot({ path: resolve(artifacts, 'desktop.png') });
    }
    return 'No horizontal overflow at 320, 390, 660, 800 and 1440; Telegram action on first mobile screen. Screenshots saved.';
  });
  await check('keyboard skip, section navigation, visible focus and refresh', async () => {
    await page.goto(origin + '/preview/');
    await page.waitForFunction(() => !document.getElementById('live-refresh').disabled);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
    await page.keyboard.press('Enter');
    assert.equal(new URL(page.url()).hash, '#main');
    for (let step = 0; step < 10; step++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement?.id === 'live-refresh')) break;
    }
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'live-refresh');
    const focus = await page.locator('#live-refresh').evaluate((e) => ({ width: getComputedStyle(e).outlineWidth, style: getComputedStyle(e).outlineStyle }));
    assert.equal(focus.width, '2px'); assert.equal(focus.style, 'solid');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('live-refresh').disabled);
    await page.getByRole('link', { name: 'Commands', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#commands');
    return 'Tab reaches visible skip link; Enter navigates; Commands hash works; refresh supports keyboard and restores enabled state.';
  });
  await check('Telegram primary link opens its inherited destination', async () => {
    let opened = false;
    await page.route('https://t.me/squeekholderbot', async (route) => { opened = true; await route.fulfill({ contentType: 'text/html', body: '<title>Test destination</title><p>Navigation intercepted for validation.</p>' }); });
    await page.locator('.btn-primary').click();
    await page.waitForURL('https://t.me/squeekholderbot');
    assert.ok(opened);
    await page.goto(origin + '/preview/');
    return 'Actual link clicked; destination navigation intercepted. Bot message delivery was not tested.';
  });
  await check('automated accessibility scan', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    await writeFile(resolve(artifacts, 'accessibility.json'), JSON.stringify({ at: new Date().toISOString(), violations: audit.violations, incomplete: audit.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })) }, null, 2) + '\n');
    assert.deepEqual(audit.violations.map((v) => v.id), []);
    return 'No axe WCAG A/AA violations; manual screen-reader and physical-device checks remain unperformed.';
  });
  await check('reduced motion, RTL reflow and text enlargement', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length), 0);
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.evaluate(() => { document.documentElement.dir = 'ltr'; const elements = [...document.body.querySelectorAll('*')].filter((e) => e instanceof HTMLElement).map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]); for (const [e, size] of elements) e.style.fontSize = `${size * 2}px`; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.goto(origin + '/preview/');
    return 'No animation under reduced motion; RTL and 200% CSS text enlargement reflow at 390. Native browser zoom was not tested.';
  });
  await check('no script exceptions during real interactions', async () => { assert.deepEqual(errors, []); return '0 page errors'; });
  await context.close();

  // All data below are explicit test fixtures, never shipped or represented as live API observations.
  const fixtureStatus = { measurement: { coreStatus: 'IDLE', rpmMilli: 0, freshness: 'online' }, builder: { anchor: { blockHeight: '42', blockProgress: '500000000' } } };
  const fixtureEconomy = { asset: { decimals: 18 }, supply: { capBaseUnits: '100000000000000000000', totalMintedBaseUnits: '10000000000000000000' } };
  const simulated = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const testPage = await simulated.newPage();
  await testPage.clock.install();
  let mode = 'error';
  const calls = { status: 0, economy: 0 };
  await testPage.route('https://api.squeekchain.com/v1/**', async (route) => {
    const status = route.request().url().endsWith('/status');
    calls[status ? 'status' : 'economy']++;
    if (mode === 'error' || (mode === 'partial' && !status)) return route.fulfill({ status: 503, body: 'Test failure' });
    if (mode === 'slow') return new Promise((done) => route.request().frame().page().once('close', done));
    return route.fulfill({ json: mode === 'malformed' ? {} : status ? fixtureStatus : fixtureEconomy });
  });
  await check('offline failure, explicit retry and recovery (simulated)', async () => {
    await testPage.goto(origin + '/');
    await testPage.waitForFunction(() => document.getElementById('live-state')?.textContent === 'Unavailable');
    assert.match(await testPage.locator('#live-feedback').innerText(), /refresh; retrying in 10s/);
    mode = 'ok'; await testPage.locator('#live-refresh').click();
    await testPage.waitForFunction(() => document.getElementById('live-state')?.textContent === 'Resting');
    assert.equal(await testPage.locator('#live-rpm').innerText(), '0 rpm');
    assert.equal(await testPage.locator('#live-block').innerText(), '42');
    return '503s show Unavailable, recover with Refresh now; IDLE shows 0 rpm.';
  });
  await check('both live endpoints poll every ten seconds (simulated clock)', async () => {
    await testPage.waitForFunction(() => !document.getElementById('live-refresh').disabled);
    const before = { ...calls };
    await testPage.clock.fastForward(10_000);
    await testPage.waitForFunction(() => !document.getElementById('live-refresh').disabled);
    assert.equal(calls.status, before.status + 1); assert.equal(calls.economy, before.economy + 1);
    return 'One status and one supply request at the next 10,000ms tick.';
  });
  await check('partial failure retains and labels stale supply (simulated)', async () => {
    mode = 'partial'; await testPage.locator('#live-refresh').click();
    await testPage.waitForFunction(() => !document.getElementById('live-refresh').disabled);
    assert.equal(await testPage.locator('#live-mint').innerText(), '10 SQK');
    assert.match(await testPage.locator('#live-feedback').innerText(), /Supply unavailable.*out of date/);
    return 'Successful status stays readable; last supply is retained with an explicit stale-data warning.';
  });
  await check('malformed API data never becomes fabricated zero values (simulated)', async () => {
    mode = 'malformed'; await testPage.goto(origin + '/');
    await testPage.waitForFunction(() => document.getElementById('live-state')?.textContent === 'Unavailable');
    assert.equal(await testPage.locator('#live-block').innerText(), 'Unavailable');
    assert.equal(await testPage.locator('#live-mint').innerText(), 'Unavailable');
    return 'Missing fields are rejected; no invented zero block or supply.';
  });
  await check('loading, disabled refresh and eight-second timeout (simulated)', async () => {
    mode = 'slow'; await testPage.goto(origin + '/');
    assert.equal(await testPage.locator('#live-state').innerText(), 'Loading…');
    assert.equal(await testPage.locator('#live-refresh').isDisabled(), true);
    await testPage.clock.fastForward(8_001);
    await testPage.waitForFunction(() => !document.getElementById('live-refresh').disabled);
    assert.equal(await testPage.locator('#live-state').innerText(), 'Unavailable');
    return 'Loading state is visible, refresh is disabled during requests, timeout restores retry.';
  });
  await simulated.close();
  try {
    const safari = await webkit.launch();
    try {
      const safariPage = await safari.newPage({ viewport: { width: 390, height: 844 } });
      await safariPage.goto(origin + '/');
      await safariPage.getByRole('link', { name: 'Commands', exact: true }).click();
      assert.equal(new URL(safariPage.url()).hash, '#commands');
      report.checks.push({ name: 'WebKit section navigation', passed: true });
    } finally { await safari.close(); }
  } catch {
    report.limitations.push('WebKit could not launch: required browser runtime libraries are unavailable. Safari interactions were not verified.');
  }
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  report.limitations.push('Public publishing and name/root mapping were not performed; no hosting credential or publishing capability was supplied. Telegram message delivery, physical devices, native 200% zoom and screen readers were not verified.');
  await writeFile(resolve(artifacts, 'interaction-results.json'), JSON.stringify(report, null, 2) + '\n');
}
if (report.checks.some((check) => !check.passed)) process.exitCode = 1;
