// Real rendered app; visualViewport/keyboard events and GAS storage are simulated.
// This is not a physical iOS Safari test.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createGasHarness } from '../helpers/guestbook-gas-harness.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = process.env.GUESTBOOK_TEST_OUTPUT || root + 'outputs/guestbook-keyboard';
const baselineOnly = process.env.GUESTBOOK_CAPTURE_BASELINE === '1';
await fs.mkdir(out, { recursive: true });
const origin = process.env.GUESTBOOK_TEST_ORIGIN || 'http://127.0.0.1:4174';
const child = 'https://local-fixture-script.googleusercontent.com';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'], ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } } : {}) });
const results = [];
async function fixture(width) {
  const h = createGasHarness(); h.props.setProperty('ALLOWED_ORIGINS', origin);
  const context = await browser.newContext({ viewport: { width, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  await context.addInitScript(() => {
    window.__subscriptions = { vvResize: new Set(), vvScroll: new Set(), selection: new Set(), windowResize: new Set() };
    function track(target, type, set) {
      const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
      target.addEventListener = function (name, listener, options) { if (name === type) set.add(listener); return add(name, listener, options); };
      target.removeEventListener = function (name, listener, options) { if (name === type) set.delete(listener); return remove(name, listener, options); };
    }
    track(window.visualViewport, 'resize', window.__subscriptions.vvResize);
    track(window.visualViewport, 'scroll', window.__subscriptions.vvScroll);
    track(document, 'selectionchange', window.__subscriptions.selection);
    track(window, 'resize', window.__subscriptions.windowResize);
    window.__subscriptionCounts = () => Object.fromEntries(Object.entries(window.__subscriptions).map(([key, value]) => [key, value.size]));
  });
  await context.exposeBinding('__GAS_LOCAL_ADAPTER__', (_source, payload) => h.rpc(payload));
  await context.route('https://script.google.com/**', route => {
    const url = new URL(route.request().url());
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><iframe src="${child}/bridge${url.search.replaceAll('&', '&amp;')}"></iframe>` });
  });
  await context.route(child + '/**', route => {
    const url = new URL(route.request().url());
    const rendered = h.renderBridge(url.searchParams.get('origin'), url.searchParams.get('nonce'));
    const stub = `<script>window.google={script:{run:{withSuccessHandler(fn){this.success=fn;return this},withFailureHandler(fn){this.failure=fn;return this},guestbookRpc(payload){const success=this.success,failure=this.failure;window.__GAS_LOCAL_ADAPTER__(payload).then(success,failure)}}}};</script>`;
    return route.fulfill({ contentType: 'text/html', body: rendered.content.replace('<body>', '<body>' + stub) });
  });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  await page.goto(origin + '/wedding/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '초대장 열기', exact: true }).tap();
  await page.locator('.inv-curtain').waitFor({ state: 'detached' });
  await page.locator('.inv-guestbook').scrollIntoViewIfNeeded();
  await page.getByText('아직 등록된 메시지가 없습니다.', { exact: true }).waitFor();
  await page.getByRole('button', { name: '축하 메시지 남기기', exact: true }).scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  const subscriptions = await page.evaluate(() => window.__subscriptionCounts());
  const background = await page.locator('.inv-rsvp').evaluate(e => e.getBoundingClientRect().top);
  const styles = await pageStyles(page);
  await page.getByRole('button', { name: '축하 메시지 남기기', exact: true }).tap();
  await page.getByRole('dialog', { name: '축하 메시지 남기기', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  h.advance(3000);
  return { h, page, context, scroll, errors, subscriptions, background, styles };
}
async function pageStyles(page) {
  return page.evaluate(() => ({
    body: Object.fromEntries(['position', 'top', 'left', 'right', 'width', 'overflow'].map(name => [name, document.body.style.getPropertyValue(name)])),
    html: Object.fromEntries(['min-height', 'overflow'].map(name => [name, document.documentElement.style.getPropertyValue(name)])),
  }));
}
async function geometry(page) {
  return page.locator('.gb-dialog').evaluate(panel => {
    const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const s = getComputedStyle(panel);
    return { panel: rect(panel), header: rect(panel.querySelector('.gb-dialog-header')), name: rect(panel.querySelector('#gb-name')), password: rect(panel.querySelector('#gb-password')), message: rect(panel.querySelector('#gb-message')), submit: rect(panel.querySelector('[type=submit]')), style: { background: s.backgroundColor, radius: s.borderRadius, padding: s.padding, border: s.border, font: s.font } };
  });
}
async function setViewport(page, height, top = 0, event = 'resize') {
  await page.evaluate(({ height, top, event }) => {
    if (!window.__keyboardViewport) {
      window.__keyboardViewport = { height: visualViewport.height, top: visualViewport.offsetTop };
      Object.defineProperty(visualViewport, 'height', { configurable: true, get: () => window.__keyboardViewport.height });
      Object.defineProperty(visualViewport, 'offsetTop', { configurable: true, get: () => window.__keyboardViewport.top });
    }
    window.__keyboardViewport.height = height; window.__keyboardViewport.top = top;
    visualViewport.dispatchEvent(new Event(event));
  }, { height, top, event });
  await page.waitForFunction(({ height, top }) => {
    const box = document.querySelector('.gb-overlay').getBoundingClientRect();
    return Math.abs(box.height - height) < 1 && Math.abs(box.top - top) < 1;
  }, { height, top });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function visible(page, selector, caret = false) {
  const result = await page.locator(selector).evaluate((element, caret) => {
    const area = document.querySelector('.gb-dialog-body'), a = area.getBoundingClientRect(), r = element.getBoundingClientRect();
    const style = getComputedStyle(element), areaStyle = getComputedStyle(area);
    const top = a.top + parseFloat(areaStyle.paddingTop), bottom = a.bottom - parseFloat(areaStyle.paddingBottom);
    let controlTop = r.top, controlBottom = r.bottom;
    if (caret) {
      controlBottom = r.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom) - Math.max(0, element.scrollHeight - element.clientHeight - element.scrollTop);
      controlTop = controlBottom - parseFloat(style.lineHeight);
    }
    const h = document.querySelector('.gb-dialog-header').getBoundingClientRect(), p = document.querySelector('.gb-dialog').getBoundingClientRect();
    const viewport = window.__keyboardViewport;
    return { top, bottom, controlTop, controlBottom, focused: document.activeElement === element,
      headerTop: h.top, headerBottom: h.bottom, panelTop: p.top, panelBottom: p.bottom, viewport };
  }, caret);
  assert(result.focused, 'focus must not be lost');
  assert(result.controlTop >= result.top - 2 && result.controlBottom <= result.bottom + 2, 'focused field/caret stays visible: ' + JSON.stringify(result));
  assert(result.panelTop >= result.viewport.top && result.panelBottom <= result.viewport.top + result.viewport.height + 1);
  assert(result.headerTop >= result.viewport.top && result.headerBottom < result.viewport.top + result.viewport.height);
  return result;
}
function compareGeometry(actual, expected) {
  for (const key of ['panel', 'header', 'name', 'password', 'message', 'submit'])
    for (const property of ['x', 'y', 'width', 'height'])
      assert(Math.abs(actual[key][property] - expected[key][property]) <= .5, `${key}.${property}: ${actual[key][property]} versus ${expected[key][property]}`);
  assert.deepEqual(actual.style, expected.style);
}
async function swipeForm(page) {
  const box = await page.locator('.gb-dialog-body').boundingBox();
  const x = box.x + 4, y = box.y + box.height - 18, end = box.y + 18;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (end - y) * i / 8 }] });
    await page.waitForTimeout(18);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  await page.waitForTimeout(250);
}
try {
  const baseline = baselineOnly ? null : JSON.parse(await fs.readFile(new URL('../fixtures/guestbook-modal-baseline.json', import.meta.url), 'utf8'));
  for (const width of [320, 390]) {
    const f = await fixture(width), { page } = f;
    const closed = await geometry(page);
    await page.locator('.gb-dialog').screenshot({ path: `${out}/${baselineOnly ? 'baseline' : 'closed'}-${width}.png` });
    if (baselineOnly) {
      results.push({ width, closed, scroll: f.scroll, errors: f.errors }); await f.context.close(); continue;
    }
    compareGeometry(closed, baseline.find(row => row.width === width).closed);
    assert.equal(await page.evaluate(() => innerHeight), 780);
    assert.equal(await page.evaluate(() => document.body.style.position), 'fixed');
    assert(Math.abs((await page.evaluate(() => scrollY)) - f.scroll) < 1, 'body lock does not clamp the original scroll');
    const openSubscriptions = await page.evaluate(() => window.__subscriptionCounts());
    assert.equal(openSubscriptions.vvResize, f.subscriptions.vvResize + 1);
    assert.equal(openSubscriptions.vvScroll, f.subscriptions.vvScroll + 1);
    assert.equal(openSubscriptions.selection, f.subscriptions.selection + 1);
    // Layout viewport stays 780px: only visualViewport shrinks, as with iOS keyboards.
    await page.locator('#gb-name').fill('홍길동');
    await setViewport(page, 340);
    await visible(page, '#gb-name');
    await page.screenshot({ path: `${out}/name-keyboard-${width}.png` });
    await page.locator('#gb-password').fill('test-password-1234');
    await setViewport(page, 300, 35);
    await visible(page, '#gb-password');
    await page.screenshot({ path: `${out}/password-keyboard-${width}.png` });
    const message = ('축\n').repeat(49) + '축하';
    assert.equal(Array.from(message).length, 100);
    await page.locator('#gb-message').fill(message);
    await setViewport(page, 240, 54);
    await visible(page, '#gb-message', true);
    const text = await page.locator('#gb-message').evaluate(e => ({ length: Array.from(e.value).length, start: e.selectionStart, end: e.selectionEnd, scroll: e.scrollTop }));
    assert.equal(text.length, 100); assert.equal(text.start, 100); assert.equal(text.end, 100); assert(text.scroll > 0);
    assert.equal(await page.locator('label[for="gb-message"] .gb-field-help').textContent(), '100 / 100');
    await page.screenshot({ path: `${out}/message-caret-${width}.png` });
    // offsetTop changes from viewport pan alone, without a resize.
    await setViewport(page, 240, 76, 'scroll'); await visible(page, '#gb-message', true);
    // Move the caret between the first and last line; selection/focus must survive.
    await page.locator('#gb-message').evaluate(e => { e.setSelectionRange(0, 0); document.dispatchEvent(new Event('selectionchange')); });
    await page.waitForFunction(() => document.querySelector('#gb-message').scrollTop < 1);
    assert.equal(await page.locator('#gb-message').evaluate(e => document.activeElement === e && e.selectionStart === 0), true);
    await page.locator('#gb-message').evaluate(e => { e.setSelectionRange(e.value.length, e.value.length); document.dispatchEvent(new Event('selectionchange')); });
    await page.waitForFunction(() => document.querySelector('#gb-message').scrollTop > 100);
    await visible(page, '#gb-message', true);
    // Manual form scrolling must not snap back to a still-focused textarea.
    await page.locator('.gb-dialog-body').evaluate(e => { e.scrollTop = 0; });
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.gb-dialog-body').evaluate(e => e.scrollTop), 0);
    const headerBefore = await page.locator('.gb-dialog-header').boundingBox();
    await swipeForm(page);
    assert(await page.locator('.gb-dialog-body').evaluate(e => e.scrollTop > 10));
    const headerAfter = await page.locator('.gb-dialog-header').boundingBox();
    assert(Math.abs(headerBefore.y - headerAfter.y) < .5, 'header stays pinned while form scrolls');
    assert(Math.abs((await page.evaluate(() => scrollY)) - f.scroll) < 1);
    assert(Math.abs((await page.locator('.inv-rsvp').evaluate(e => e.getBoundingClientRect().top)) - f.background) < 1);
    await page.locator('.gb-dialog-body').evaluate(e => { e.scrollTop = e.scrollHeight; });
    const button = await page.getByRole('button', { name: '메시지 등록하기', exact: true }).boundingBox();
    const bounds = await page.locator('.gb-dialog-body').boundingBox();
    assert(button.y >= bounds.y && button.y + button.height <= bounds.y + bounds.height + 1);
    await page.screenshot({ path: `${out}/submit-keyboard-${width}.png` });
    await setViewport(page, 780);
    compareGeometry(await geometry(page), closed);
    assert.equal(await page.locator('#gb-message').evaluate(e => document.activeElement === e && e.selectionStart === 100), true);
    await page.locator('.gb-dialog').screenshot({ path: `${out}/restored-${width}.png` });
    await page.getByRole('button', { name: '축하 메시지 남기기 닫기', exact: true }).tap();
    await page.locator('.gb-overlay').waitFor({ state: 'detached' }); await page.waitForTimeout(80);
    assert.deepEqual(await page.evaluate(() => window.__subscriptionCounts()), f.subscriptions);
    assert.equal(await page.evaluate(() => document.body.style.position), '');
    assert.deepEqual(await pageStyles(page), f.styles);
    assert(Math.abs((await page.evaluate(() => scrollY)) - f.scroll) < 1);
    // Repeat open/close: no leaked listeners, stale viewport or page movement.
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.getByRole('button', { name: '축하 메시지 남기기', exact: true }).tap();
      await page.locator('.gb-dialog-body').waitFor();
      compareGeometry(await geometry(page), closed);
      await page.locator('#gb-password').fill('test-password-1234');
      await setViewport(page, 300, 24); await visible(page, '#gb-password');
      await setViewport(page, 780);
      if (attempt === 0) {
        await page.getByRole('button', { name: '축하 메시지 남기기 닫기', exact: true }).tap();
        await page.locator('.gb-overlay').waitFor({ state: 'detached' }); await page.waitForTimeout(60);
        assert.deepEqual(await page.evaluate(() => window.__subscriptionCounts()), f.subscriptions);
      }
    }
    // Submit with a reduced visual viewport: all real form fields still participate.
    await setViewport(page, 260, 20);
    await page.locator('.gb-dialog-body').evaluate(e => { e.scrollTop = e.scrollHeight; });
    await page.getByRole('button', { name: '메시지 등록하기', exact: true }).tap();
    await page.locator('.gb-overlay').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '홍길동님의 메시지 삭제', exact: true }).waitFor();
    assert.equal(f.h.sheet().rows.length, 2);
    assert.equal(JSON.parse(f.h.sheet().rows[1][3]), message);
    await page.waitForTimeout(80);
    assert.deepEqual(await page.evaluate(() => window.__subscriptionCounts()), f.subscriptions);
    assert.equal(await page.evaluate(() => document.body.style.position), '');
    assert.deepEqual(await pageStyles(page), f.styles);
    assert.equal(await page.evaluate(() => document.querySelector('.gb-overlay')), null);
    assert.deepEqual(f.errors, []);
    results.push({ width, status: 'passed', closedGeometryUnchanged: true, backgroundScrollPreserved: true, fieldAndCaretVisible: true, headerPinned: true, submitReachable: true, keyboardCloseRestored: true, repeatedOpenAndCleanup: true, submitted100Characters: true, runtime: 'Chromium, visualViewport simulated with unchanged layout viewport; GAS locally mocked', realIOSSafari: 'UNVERIFIED' });
    await f.context.close();
  }
  await fs.writeFile(`${out}/${baselineOnly ? 'baseline' : 'results'}.json`, JSON.stringify(results, null, 2));
  assert(results.every(result => !result.errors || result.errors.length === 0));
  console.log(JSON.stringify({ baselineOnly, widths: results.map(r => r.width), status: 'passed', realIOSSafari: 'UNVERIFIED' }));
} finally { await browser.close(); }
