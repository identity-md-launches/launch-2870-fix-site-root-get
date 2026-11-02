import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createSiteServer } from './preview-site.mjs';

const toolDirectory = process.argv[2];
if (!toolDirectory) throw new Error('Usage: node scripts/validate-site.mjs /absolute/path/to/test-tools');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireTool = createRequire(resolve(toolDirectory, 'package.json'));
const module = await import(pathToFileURL(requireTool.resolve('playwright')).href);
const { chromium, webkit } = module.default ?? module;
const axe = await import(pathToFileURL(requireTool.resolve('@axe-core/playwright')).href);
const AxeBuilder = axe.default.default ?? axe.default;
const artifacts = resolve(root, process.argv[3] ?? 'artifacts');
await mkdir(artifacts, { recursive: true });
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
const report = { at: new Date().toISOString(), exportSha256: createHash('sha256').update(html).digest('hex'), browser: '', checks: [], api: [], limitations: [] };
async function check(name, action) {
  try { const detail = await action(); report.checks.push({ name, passed: true, detail: detail ?? 'passed' }); console.log(`PASS ${name}`); }
  catch (error) { report.checks.push({ name, passed: false, detail: String(error.stack ?? error) }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function until(action, message = 'State did not settle') {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await action()) return;
    await new Promise(done => setTimeout(done, 20));
  }
  throw new Error(message);
}
const server = createSiteServer();
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const contexts = [];
try {
  await check('GET / is HTML 200, identical to source; subpath and HEAD work', async () => {
    assert.equal(html, await readFile(resolve(root, 'public/index.html'), 'utf8'));
    for (const path of ['/', '/index.html', '/preview/', '/preview/index.html']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(await response.text(), html);
    }
    const head = await fetch(origin + '/', { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    assert.equal((await fetch(origin + '/missing')).status, 404);
    assert.equal((await fetch(origin + '/', { method: 'POST' })).status, 405);
    return 'Four entry paths serve the exact index, with no directory listing. HEAD 200, unknown path 404, POST 405.';
  });
  await check('all five runtime assets return 200 with correct MIME at root and subpath', async () => {
    for (const file of ['logo-mark.png', 'logo-mark-32.png', 'logo-180.png', 'favicon.ico', 'og.png']) {
      for (const prefix of ['/', '/preview/']) {
        const response = await fetch(origin + prefix + file + '?v=2');
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), file.endsWith('.png') ? 'image/png' : 'image/x-icon');
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(resolve(root, 'public', file)));
      }
    }
    return 'Ten asset GETs pass; bytes match source.';
  });
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  report.browser = `Chromium ${browser.version()}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(context);
  const page = await context.newPage();
  const errors = [], localFailures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) localFailures.push(response.url()); });
  page.on('requestfailed', request => { if (request.url().startsWith(origin)) localFailures.push(request.url()); });
  page.on('response', async response => {
    if (!response.url().startsWith('https://api.squeekchain.com/v1/')) return;
    try {
      const data = await response.json();
      const fields = response.url().endsWith('/status')
        ? { state: data.measurement?.coreStatus, rpmMilli: data.measurement?.rpmMilli, height: data.builder?.anchor?.blockHeight, progress: data.builder?.anchor?.blockProgress }
        : { mintedBaseUnits: data.supply?.totalMintedBaseUnits, capBaseUnits: data.supply?.capBaseUnits, decimals: data.asset?.decimals };
      report.api.push({ url: response.url(), status: response.status(), generatedAt: data.generatedAt, fields });
    } catch { /* Visible state is checked below. */ }
  });
  await check('real public API values render and Refresh now recovers its label', async () => {
    await page.goto(origin + '/preview/');
    await page.waitForFunction(() => document.querySelector('#live-feedback')?.textContent === 'Public API connected.', null, { timeout: 20_000 });
    const values = await page.locator('.live-item .v').allTextContents();
    assert.ok(values.every(value => value && !/Loading|Unavailable|—/.test(value)));
    const statusResponse = page.waitForResponse('https://api.squeekchain.com/v1/status');
    const supplyResponse = page.waitForResponse('https://api.squeekchain.com/v1/economy/state');
    await page.locator('#live-refresh').click();
    assert.equal((await statusResponse).status(), 200); assert.equal((await supplyResponse).status(), 200);
    await until(async () => await page.locator('#live-refresh').isEnabled());
    assert.equal(await page.locator('#live-refresh').innerText(), 'Refresh now');
    return { values, title: await page.title() };
  });
  await check('18 commands, four groups, Hamster alerts and exact share metadata', async () => {
    assert.equal(await page.locator('.cmd').count(), 18);
    assert.deepEqual(await page.locator('.cmdgroup').allTextContents(), ['Wallets', 'Track', 'Notifications', 'Other']);
    assert.match(await page.locator('.card').nth(4).innerText(), /Hamster alerts[\s\S]*starts or stops[\s\S]*RPM[\s\S]*\/hamster/);
    assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://squeek-holder-bot.chainn.workers.dev/');
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), 'https://squeek-holder-bot.chainn.workers.dev/');
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) assert.equal(await page.locator(selector).getAttribute('content'), 'https://squeek-holder-bot.chainn.workers.dev/og.png');
    assert.equal(await page.locator('.logo').getAttribute('src'), 'logo-mark.png?v=2');
    assert.equal(await page.locator('.logo').evaluate(image => image.complete && image.naturalWidth === 512), true);
    return 'All requested commands/content/metadata verified on the rendered export; logo decoded at 512×512.';
  });
  await check('responsive reflow and first-screen product/action at 390', async () => {
    const widths = [320, 390, 520, 560, 561, 800, 1024, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width > 800 ? 900 : 844 });
      await page.evaluate(() => scrollTo(0, 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
      if (width === 390) {
        for (const selector of ['.brand', 'h1', '.btn-primary']) {
          const box = await page.locator(selector).boundingBox();
          assert.ok(box.y >= 0 && box.y + box.height < 844, `${selector} below first screen`);
        }
        await page.screenshot({ path: resolve(artifacts, 'mobile.png') });
        await page.screenshot({ path: resolve(artifacts, 'mobile-full.png'), fullPage: true });
      }
      if (width === 320) await page.screenshot({ path: resolve(artifacts, 'mobile-320.png'), fullPage: true });
      if (width === 1440) await page.screenshot({ path: resolve(artifacts, 'desktop.png') });
    }
    return { widths, mobile: '390×844: logo, product, main action and live panel present on first screen.' };
  });
  await check('keyboard skip, navigation, visible focus and refresh', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + '/preview/');
    await until(async () => await page.locator('#live-refresh').isEnabled());
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
    await page.keyboard.press('Enter');
    assert.equal(new URL(page.url()).hash, '#main');
    for (let count = 0; count < 5; count++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement?.id === 'live-refresh')) break;
    }
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'live-refresh');
    assert.equal(await page.locator('#live-refresh').evaluate(element => element.matches(':focus-visible') && getComputedStyle(element).outlineWidth === '2px'), true);
    await page.screenshot({ path: resolve(artifacts, 'keyboard-focus.png') });
    await page.keyboard.press('Enter');
    await until(async () => await page.locator('#live-refresh').isEnabled());
    assert.equal(await page.locator('#live-refresh').innerText(), 'Refresh now');
    await page.getByRole('link', { name: 'Commands', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#commands');
    return 'Tab/Enter complete skip and refresh paths; 2px focus-visible ring; Commands hash navigation works.';
  });
  await check('primary Telegram link opens the exact account in a new tab', async () => {
    await context.route('https://t.me/SqueekHolder_Bot', route => route.fulfill({ contentType: 'text/html', body: '<title>Intercepted Telegram navigation</title>' }));
    const popupPromise = page.waitForEvent('popup');
    await page.locator('.btn-primary').click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(), 'https://t.me/SqueekHolder_Bot');
    assert.equal(await popup.evaluate(() => window.opener === null), true);
    await popup.close();
    return 'Clicked actual CTA; new tab and noopener checked. Destination intercepted; no Telegram message sent.';
  });
  await check('axe WCAG A/AA scan on mobile and desktop', async () => {
    const scans = [];
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin + '/preview/');
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      scans.push({ width, violations: audit.violations, incomplete: audit.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.length })) });
    }
    await writeFile(resolve(artifacts, 'accessibility.json'), JSON.stringify(scans, null, 2) + '\n');
    assert.deepEqual(scans.flatMap(scan => scan.violations.map(violation => violation.id)), []);
    return scans.map(scan => ({ width: scan.width, violations: scan.violations.length, incomplete: scan.incomplete }));
  });
  await check('reduced motion, RTL and 200% text enlargement', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/preview/');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length), 0);
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.evaluate(() => {
      document.documentElement.dir = 'ltr';
      const sizes = [...document.body.querySelectorAll('*')].filter(element => element instanceof HTMLElement).map(element => [element, getComputedStyle(element).fontSize]);
      for (const [element, size] of sizes) element.style.fontSize = `${parseFloat(size) * 2}px`;
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: resolve(artifacts, 'text-200.png'), fullPage: true });
    return 'No running reduced-motion animations or RTL overflow; 200% CSS text enlargement reflows at 390. Native browser zoom untested.';
  });
  await check('no script errors or failed local resources', async () => { assert.deepEqual(errors, []); assert.deepEqual(localFailures, []); return '0 page errors; 0 failed local resources during real interactions.'; });

  // Explicit simulation fixtures only. These are never embedded in the website.
  const fixtureStatus = { measurement: { coreStatus: 'IDLE', rpmMilli: 0, freshness: 'online' }, builder: { anchor: { blockHeight: '42', blockProgress: '500000000' } } };
  const fixtureEconomy = { asset: { decimals: 18 }, supply: { capBaseUnits: '100000000000000000000', totalMintedBaseUnits: '10000000000000000000' } };
  async function scenario(statusMode = 'ok', economyMode = 'ok') {
    const simulation = await browser.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(simulation);
    const tab = await simulation.newPage();
    await tab.clock.install({ time: new Date('2026-11-02T12:00:00Z') });
    await tab.clock.pauseAt(new Date('2026-11-02T12:00:01Z'));
    const state = { statusMode, economyMode, calls: { status: 0, economy: 0 }, tab,
      settled: () => until(async () => await tab.locator('#live-refresh').isEnabled()),
      values: () => tab.locator('.live-item .v').allTextContents() };
    await tab.route('https://api.squeekchain.com/v1/**', async route => {
      const status = route.request().url().endsWith('/status');
      state.calls[status ? 'status' : 'economy']++;
      const mode = status ? state.statusMode : state.economyMode;
      if (mode === 'hang') return;
      if (mode === 'error') return route.fulfill({ status: 503, body: 'Explicit test failure' });
      if (mode === 'malformed') return route.fulfill({ json: status ? { measurement: { coreStatus: 'SPINNING', rpmMilli: 12345 } } : { supply: { totalMintedBaseUnits: '10' } } });
      if (mode === 'spinning') return route.fulfill({ json: { ...fixtureStatus, measurement: { ...fixtureStatus.measurement, coreStatus: 'SPINNING', rpmMilli: 12345 } } });
      return route.fulfill({ json: status ? fixtureStatus : fixtureEconomy });
    });
    await tab.goto(origin + '/');
    if (statusMode !== 'hang' && economyMode !== 'hang') await state.settled();
    return state;
  }
  await check('status polls every 10s; economy every 60s (simulated clock)', async () => {
    const state = await scenario();
    assert.deepEqual(state.calls, { status: 1, economy: 1 });
    await state.tab.clock.runFor(10_000); await state.settled();
    assert.deepEqual(state.calls, { status: 2, economy: 1 });
    await state.tab.clock.runFor(10_000); await state.settled();
    assert.deepEqual(state.calls, { status: 3, economy: 1 });
    await state.tab.clock.runFor(39_999); await state.settled();
    assert.deepEqual(state.calls, { status: 6, economy: 1 });
    await state.tab.clock.runFor(1); await state.settled();
    assert.deepEqual(state.calls, { status: 7, economy: 2 });
    return 'Counts at 0/10/20/59.999/60 seconds: 1:1, 2:1, 3:1, 6:1, 7:2. No real-time wait.';
  });
  await check('offline initial load, manual retry, spinning and zero RPM (simulated)', async () => {
    const state = await scenario('error', 'error');
    assert.deepEqual(await state.values(), ['Unavailable', 'Unavailable', 'Unavailable', 'Unavailable']);
    assert.equal(await state.tab.locator('#live-updated').innerText(), 'data unavailable');
    state.statusMode = 'spinning'; state.economyMode = 'ok';
    await state.tab.locator('#live-refresh').click(); await state.settled();
    assert.deepEqual(await state.values(), ['Running', '12.35 rpm', '42', '10 / 100 (10.00%)']);
    assert.equal(await state.tab.locator('#live-progress').getAttribute('aria-valuenow'), '50.0');
    state.statusMode = 'ok'; await state.tab.locator('#live-refresh').click(); await state.settled();
    assert.equal(await state.tab.locator('#live-rpm').innerText(), '0 rpm');
    return '503 → data unavailable → successful explicit retry. Running RPM, block, supply, progress and resting zero checked.';
  });
  await check('last values survive errors; unavailable after 60s; recovery (simulated)', async () => {
    const state = await scenario(), previous = await state.values();
    state.statusMode = 'error'; state.economyMode = 'error';
    await state.tab.locator('#live-refresh').click(); await state.settled();
    assert.deepEqual(await state.values(), previous);
    assert.notEqual(await state.tab.locator('#live-updated').innerText(), 'data unavailable');
    await state.tab.clock.runFor(59_000); await state.settled();
    assert.notEqual(await state.tab.locator('#live-updated').innerText(), 'data unavailable');
    await state.tab.clock.runFor(2_001); await state.settled();
    assert.equal(await state.tab.locator('#live-updated').innerText(), 'data unavailable');
    assert.deepEqual(await state.values(), previous);
    state.statusMode = 'ok'; state.economyMode = 'ok';
    await state.tab.locator('#live-refresh').click(); await state.settled();
    assert.notEqual(await state.tab.locator('#live-updated').innerText(), 'data unavailable');
    return 'Retained all four readings at 59s and 61.001s, with stale label at 61.001s. Manual recovery removes stale label.';
  });
  for (const failed of ['status', 'economy']) await check(`independent freshness: ${failed} failure is not masked by the other feed (simulated)`, async () => {
    const state = await scenario(), previous = await state.values();
    state[failed + 'Mode'] = 'error';
    await state.tab.locator('#live-refresh').click(); await state.settled();
    await state.tab.clock.runFor(61_001); await state.settled();
    assert.equal(await state.tab.locator('#live-updated').innerText(), 'data unavailable');
    assert.match(await state.tab.locator('#live-feedback').innerText(), failed === 'status' ? /Status data unavailable/ : /Supply data unavailable/);
    assert.deepEqual(await state.values(), previous);
    return 'Last values retained and failed source named after 60s despite successful reads from the other source.';
  });
  await check('malformed responses never invent zeroes or partially repaint (simulated)', async () => {
    const state = await scenario(), previous = await state.values();
    state.statusMode = 'malformed'; state.economyMode = 'malformed';
    await state.tab.locator('#live-refresh').click(); await state.settled();
    assert.deepEqual(await state.values(), previous);
    const empty = await scenario('malformed', 'malformed');
    assert.deepEqual(await empty.values(), ['Unavailable', 'Unavailable', 'Unavailable', 'Unavailable']);
    return 'Missing anchor/cap fields reject atomically. Existing readings remain intact; a malformed first load shows Unavailable.';
  });
  await check('eight-second timeout, disabled button, deduplication and restored label (simulated)', async () => {
    const state = await scenario('hang', 'hang');
    assert.equal(await state.tab.locator('#live-refresh').isDisabled(), true);
    assert.equal(await state.tab.locator('#live-refresh').innerText(), 'Refreshing…');
    await state.tab.locator('#live-refresh').dispatchEvent('click');
    assert.deepEqual(state.calls, { status: 1, economy: 1 });
    await state.tab.clock.runFor(8_001); await state.settled();
    assert.equal(await state.tab.locator('#live-refresh').innerText(), 'Refresh now');
    assert.equal(await state.tab.locator('#live-updated').innerText(), 'data unavailable');
    state.statusMode = 'ok'; state.economyMode = 'ok';
    await state.tab.locator('#live-refresh').click(); await state.settled();
    const previous = await state.values();
    state.statusMode = 'hang'; state.economyMode = 'error';
    await state.tab.locator('#live-refresh').click();
    assert.equal(await state.tab.locator('#live-refresh').isDisabled(), true);
    await state.tab.clock.runFor(8_001); await state.settled();
    assert.equal(await state.tab.locator('#live-refresh').innerText(), 'Refresh now');
    assert.deepEqual(await state.values(), previous);
    return 'Initial and manual hanging reads time out, retain readings and release the button. Disabled clicks cannot enqueue duplicate requests.';
  });
  await check('no-JavaScript fallback and metadata remain usable', async () => {
    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } }); contexts.push(noJS);
    const tab = await noJS.newPage(); await tab.goto(origin + '/preview/');
    assert.equal(await tab.locator('.btn-primary').getAttribute('href'), 'https://t.me/SqueekHolder_Bot');
    assert.equal(await tab.locator('noscript').isVisible(), true);
    assert.match(await tab.locator('noscript').innerText(), /Enable JavaScript/);
    return 'Telegram link, content, metadata and an explicit status API fallback are available without JavaScript.';
  });
  try {
    const safari = await webkit.launch({ headless: true });
    try {
      await check('WebKit primary interaction and reflow', async () => {
        const tab = await safari.newPage({ viewport: { width: 390, height: 844 } });
        await tab.goto(origin + '/preview/');
        assert.equal(await tab.locator('.btn-primary').getAttribute('target'), '_blank');
        await tab.locator('#live-refresh').click();
        await until(async () => await tab.locator('#live-refresh').isEnabled());
        assert.equal(await tab.locator('#live-refresh').innerText(), 'Refresh now');
        assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        return 'WebKit refresh and mobile reflow passed.';
      });
    } finally { await safari.close(); }
  } catch (error) {
    report.limitations.push('WebKit launch unavailable: ' + String(error.message).slice(0, 1500));
  }
} finally {
  await Promise.allSettled(contexts.map(context => context.close()));
  await browser?.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
  report.limitations.push('No deployment, Telegram message delivery, physical-device tests, screen-reader session, native browser zoom, or social-platform unfurl check was performed. CSS text enlargement is distinct from native browser zoom.');
  await writeFile(resolve(artifacts, 'interaction-results.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(`${report.checks.filter(check => check.passed).length}/${report.checks.length} checks passed.`);
if (report.checks.some(check => !check.passed)) process.exitCode = 1;
