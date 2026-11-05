import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { previewServer } from './preview-server.mjs';
import {
  STORAGE_KEY, STATUS_URL, STALLS, savedBook, newGame, advance, openStall, addEvent,
  parseReading, wheelState, practiceWheel, wheelLabel, wheelSentence, serializeBook,
  signatureMessage, hexMessage, settleRound,
} from '../src/model.ts';

const results = [];
async function test(name, fn) {
  try { await fn(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
const baseTime = Date.now();
const payload = (overrides = {}, round = '286') => ({
  measurement: { coreStatus: 'ACTIVE', rpmMilli: 12400, freshness: 'online', observedAt: new Date(baseTime).toISOString(), staleAfterSeconds: 120, ...overrides },
  builder: { anchor: { settledThroughRound: round } },
  oracle: { latestClosure: { lastRound: '285' } },
});
const freshWheel = wheelState(parseReading(payload()), 'ready', baseTime);
const idleWheel = wheelState(parseReading(payload({ coreStatus: 'IDLE' })), 'ready', baseTime);
const blank = () => newGame(savedBook(null), baseTime);
const address = `0x${randomBytes(20).toString('hex')}`; // Test-only provider fixture; never a recipient.
const signature = `0x${randomBytes(65).toString('hex')}`;

await test('fresh ACTIVE uses the exact rpm conversion, rate and 40 rpm cap', () => {
  assert.equal(freshWheel.rpm, 12.4);
  assert.equal(freshWheel.rate, 0.09 + 12.4 / 180);
  assert.equal(wheelLabel(freshWheel), 'Running · 12.4 rpm · round 286');
  assert.equal(wheelState(parseReading(payload({ rpmMilli: 90000 })), 'ready', baseTime).rate, 0.09 + 40 / 180);
});
await test('freshness, missing fields, failed fetch and expiry all hold a low rate', () => {
  for (const patch of [
    { freshness: 'offline' }, { observedAt: new Date(baseTime - 121000).toISOString() },
    { observedAt: 'invalid' }, { observedAt: new Date(baseTime + 10000).toISOString() },
    { rpmMilli: null }, { rpmMilli: -1 }, { rpmMilli: Infinity }, { coreStatus: 'UNKNOWN' },
  ]) {
    const wheel = wheelState(parseReading(payload(patch)), 'ready', baseTime);
    assert.equal(wheel.running, false);
    assert.equal(wheel.rate, 0.025);
    assert.equal(wheel.rpm, null);
  }
  assert.equal(wheelState(parseReading({}), 'ready', baseTime).mode, 'unread');
  assert.equal(wheelState(parseReading(payload()), 'failed', baseTime).mode, 'stale');
  assert.equal(wheelState(null, 'failed', baseTime).mode, 'unread');
  assert.equal(wheelState(parseReading(payload()), 'ready', baseTime + 120001).mode, 'stale');
  assert.equal(wheelState(parseReading(payload({ staleAfterSeconds: undefined })), 'ready', baseTime + 119999).running, true);
});
await test('idle copy uses the open stall name and round precedence falls back correctly', () => {
  assert.equal(wheelLabel(idleWheel), 'Idle · the flame stays low · round 286');
  assert.equal(wheelSentence(idleWheel, 'wick'), 'He is resting. Wick keeps a slow flame. Nothing spoils.');
  assert.equal(parseReading(payload()).round, '286');
  assert.equal(parseReading({ ...payload(), builder: {} }).round, '285');
  assert.equal(parseReading({ ...payload({}, '0') }).round, '0');
});
await test('open stall fills at 1×, closed at 0.22×, and only the open one scores/logs', () => {
  let game = advance(blank(), 1, freshWheel, baseTime);
  assert.equal(game.fills.oil, freshWheel.rate);
  assert.equal(game.fills.wick, freshWheel.rate * 0.22);
  game = { ...blank(), fills: { oil: 0.99, wick: 0.99, glass: 0.99 } };
  const next = advance(game, 1, freshWheel, baseTime);
  assert.deepEqual(next.counts, { wick: 1, oil: 1, glass: 1 });
  assert.equal(next.points, 3);
  assert.equal(next.events[0].text, 'Oil finished a piece. +3.');
  assert.equal(next.events.length, 2);
  assert.equal(next.reward.points, 3);
  assert.ok(next.fills.oil < 1 && next.fills.oil >= 0);
});
await test('idle, unread and stale completions give +1 without spoiling stock', () => {
  for (const wheel of [idleWheel, wheelState(null, 'failed', baseTime), wheelState(parseReading(payload()), 'ready', baseTime + 121000)]) {
    const next = advance({ ...blank(), fills: { oil: 0.99, wick: 0.4, glass: 0.7 } }, 1, wheel, baseTime);
    assert.equal(next.points, 1);
    assert.equal(next.counts.oil, 1);
    assert.equal(next.events[0].text, 'Oil finished a piece. +1.');
    assert.ok(next.fills.wick >= 0.4 && next.fills.glass >= 0.7);
  }
});
await test('switching is immediate, preserves fill, and activity is newest first with 8 entries', () => {
  let game = advance(blank(), 1, freshWheel, baseTime);
  const fill = game.fills.wick;
  game = openStall(game, 'wick', baseTime);
  assert.equal(game.open, 'wick');
  assert.equal(game.fills.wick, fill);
  assert.equal(game.events[0].text, 'Opened the wick stall.');
  assert.equal(openStall(game, 'wick', baseTime), game);
  for (let i = 0; i < 12; i++) game = addEvent(game, `Event ${i}`, 'wheel', baseTime + i);
  assert.equal(game.events.length, 8);
  assert.equal(game.events[0].text, 'Event 11');
  assert.equal(game.events[7].text, 'Event 4');
});
await test('book serialization saves only the requested data and rejects damaged values', () => {
  const game = { ...advance(blank(), 1, freshWheel, baseTime), points: 21, address, round: '286', open: 'glass' };
  const encoded = serializeBook(game);
  assert.deepEqual(Object.keys(JSON.parse(encoded)).sort(), ['address', 'counts', 'open', 'points', 'round']);
  const restored = newGame(savedBook(encoded), baseTime);
  assert.equal(restored.points, 21);
  assert.equal(restored.open, 'glass');
  assert.equal(restored.address, address);
  assert.deepEqual(restored.fills, { wick: 0, oil: 0, glass: 0 });
  assert.equal(savedBook('{broken').open, 'oil');
  assert.equal(savedBook('{"points":-10,"counts":{"oil":1.5},"open":"elsewhere"}').points, 0);
  assert.equal(savedBook('{"points":-10,"counts":{"oil":1.5},"open":"elsewhere"}').counts.oil, 0);
});
await test('round changes log once; practice is a sine wave around 18 with no round', () => {
  const game = settleRound(blank(), '286', baseTime);
  assert.equal(game.events[0].text, 'Round 286 started.');
  assert.equal(settleRound(game, '286', baseTime), game);
  assert.equal(practiceWheel(0).rpm, 18);
  assert.equal(practiceWheel(0).round, null);
  assert.notEqual(practiceWheel(10).rpm, practiceWheel(0).rpm);
});
await test('personal_sign message is the exact required UTF-8 text encoded as hex', () => {
  const message = signatureMessage(address);
  assert.equal(message, `Night Market\n${address}\nThis signature only names the stall book. It does not spend tokens.`);
  assert.equal(Buffer.from(hexMessage(message).slice(2), 'hex').toString('utf8'), message);
});

const server = await previewServer();
const browser = await chromium.launch({ headless: true });
const browserErrors = [];
const resourceErrors = [];
await mkdir('test/scratch/checks', { recursive: true });
async function makePage({ data = payload(), status = 200, body, init, reducedMotion = 'no-preference', width = 390, height = 844, clock = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(server.url) && response.status() >= 400) resourceErrors.push(response.url().split('/preview/')[1]); });
  if (clock) await page.clock.install({ time: new Date(baseTime) });
  await page.addInitScript(() => {
    const original = window.fetch;
    window.__fetches = [];
    window.fetch = function(url, options) { window.__fetches.push({ url: String(url), cache: options?.cache, at: Date.now() }); return original.apply(this, arguments); };
  });
  if (init) await page.addInitScript(init.fn, init.arg);
  await page.route(STATUS_URL, route => route.fulfill({ status: typeof status === 'function' ? status() : status, contentType: 'application/json', body: body ?? JSON.stringify(typeof data === 'function' ? data() : data) }));
  await page.goto(server.url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.stall-button').first().waitFor();
  await page.waitForFunction(() => document.querySelector('.status-text')?.textContent !== 'Reading the wheel…');
  return { page, context };
}
const text = (page, selector) => page.locator(selector).innerText();
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY);
async function runFor(page, ms) { await page.clock.runFor(ms); await page.waitForTimeout(30); }

try {
  await test('browser: default guest market, exact live label, three controls and cache:no-store', async () => {
    const { page, context } = await makePage();
    assert.equal(await text(page, 'h1'), 'Night Market✧');
    assert.equal(await text(page, '.status-text'), 'Running · 12.4 rpm · round 286');
    assert.equal(await page.getByRole('button', { name: 'Open oil', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('progressbar').count(), 3);
    assert.deepEqual(await page.evaluate(() => window.__fetches.map(({ url, cache }) => ({ url, cache }))), [{ url: STATUS_URL, cache: 'no-store' }]);
    for (const stall of STALLS) assert.ok(await page.getByRole('button', { name: `Open ${stall}`, exact: true }).isEnabled());
    assert.equal((await stored(page)).round, '286');
    await context.close();
  });
  await test('browser: running pieces award +3, float feedback, immediate switching, closed craft', async () => {
    const { page, context } = await makePage();
    await runFor(page, 7000);
    let book = await stored(page);
    assert.equal(book.counts.oil, 1);
    assert.equal(book.points, 3);
    assert.equal(await text(page, '.floating-points'), '+3');
    assert.match(await text(page, '.event-log'), /Oil finished a piece\. \+3\./);
    await page.getByRole('button', { name: 'Open wick', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Open wick', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await text(page, '.event-log li:first-child .event-message'), 'Opened the wick stall.');
    await runFor(page, 33000);
    book = await stored(page);
    assert.ok(book.counts.glass >= 1, 'Closed glass must complete a piece.');
    assert.equal(await page.locator('.event-log li').count(), 8);
    assert.doesNotMatch(await text(page, '.event-log'), /Glass finished/);
    assert.equal(book.points, (book.counts.wick + 1) * 3);
    const fetches = await page.evaluate(() => window.__fetches);
    assert.equal(fetches[1].at - fetches[0].at, 8000);
    assert.ok(fetches.every(request => request.cache === 'no-store'));
    await context.close();
  });
  await test('browser: practice toggle stays labeled and never changes the saved live round', async () => {
    let round = '286';
    const { page, context } = await makePage({ data: () => payload({}, round) });
    await page.getByRole('button', { name: 'Practice', exact: true }).click();
    assert.equal(await text(page, '.status-text'), 'Practice — simulated, not live');
    assert.ok(await page.getByRole('button', { name: 'Back to live', exact: true }).isEnabled());
    round = '287';
    await runFor(page, 8500);
    assert.equal((await stored(page)).round, '286');
    assert.ok((await stored(page)).points >= 3);
    await page.getByRole('button', { name: 'Back to live', exact: true }).click();
    assert.equal((await stored(page)).round, '287');
    assert.match(await text(page, '.event-log'), /Live wheel again\./);
    assert.match(await text(page, '.event-log'), /Round 287 started\./);
    await context.close();
  });
  await test('browser: idle completes at +1, keeps closed stock, and uses the open stall in its sentence', async () => {
    const { page, context } = await makePage({ data: payload({ coreStatus: 'IDLE' }) });
    assert.equal(await text(page, '.status-text'), 'Idle · the flame stays low · round 286');
    await page.getByRole('button', { name: 'Open glass', exact: true }).click();
    assert.equal(await text(page, '.wheel-sentence'), 'He is resting. Glass keeps a slow flame. Nothing spoils.');
    await runFor(page, 40500);
    assert.equal((await stored(page)).points, 1);
    assert.equal((await stored(page)).counts.glass, 1);
    assert.match(await text(page, '.event-log'), /Glass finished a piece\. \+1\./);
    await context.close();
  });
  await test('browser: stale, missing measurement, HTTP failure and malformed JSON remain playable', async () => {
    for (const scenario of [
      { data: payload({ observedAt: new Date(baseTime - 121000).toISOString() }), expected: 'Stale reading · holding a low flame' },
      { data: {}, expected: 'Wheel unread' },
      { status: 503, expected: 'Wheel unread' },
      { body: 'not JSON', expected: 'Wheel unread' },
    ]) {
      const { page, context } = await makePage(scenario);
      assert.equal(await text(page, '.status-text'), scenario.expected);
      assert.doesNotMatch(await text(page, '.status-text'), /rpm/);
      await page.getByRole('button', { name: 'Open wick', exact: true }).click();
      await page.getByRole('button', { name: 'Practice', exact: true }).click();
      assert.equal(await text(page, '.status-text'), 'Practice — simulated, not live');
      await runFor(page, 6000);
      assert.ok((await stored(page)).points > 0);
      await context.close();
    }
  });
  await test('browser: freshness expires between polls, and a later good response recovers', async () => {
    let data = payload({ staleAfterSeconds: 1 });
    const { page, context } = await makePage({ data: () => data });
    await runFor(page, 1600);
    assert.equal(await text(page, '.status-text'), 'Stale reading · holding a low flame');
    data = payload({ observedAt: new Date(baseTime + 8000).toISOString() });
    await runFor(page, 6700);
    assert.match(await text(page, '.status-text'), /^Running/);
    await context.close();
  });
  await test('browser: loading and a timed-out wheel request keep stall selection and practice available', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.clock.install({ time: new Date(baseTime) });
    await page.route(STATUS_URL, () => {});
    await page.goto(server.url, { waitUntil: 'load' });
    await page.getByRole('button', { name: 'Open wick', exact: true }).waitFor();
    assert.equal(await text(page, '.status-text'), 'Reading the wheel…');
    await page.getByRole('button', { name: 'Open wick', exact: true }).click();
    assert.equal((await stored(page)).open, 'wick');
    await runFor(page, 6800);
    assert.equal(await text(page, '.status-text'), 'Wheel unread');
    await page.getByRole('button', { name: 'Practice', exact: true }).click();
    assert.equal(await text(page, '.status-text'), 'Practice — simulated, not live');
    await context.close();
  });
  await test('browser: a failed poll invalidates a formerly fresh reading and recovers on the next good poll', async () => {
    let responseStatus = 200;
    let data = payload();
    const { page, context } = await makePage({ data: () => data, status: () => responseStatus });
    responseStatus = 503;
    await runFor(page, 8200);
    assert.equal(await text(page, '.status-text'), 'Stale reading · holding a low flame');
    responseStatus = 200;
    data = payload({ observedAt: new Date(baseTime + 16000).toISOString() });
    await runFor(page, 8100);
    assert.match(await text(page, '.status-text'), /^Running/);
    await context.close();
  });
  await test('browser: missing wallet logs the exact guest message and crafting continues', async () => {
    const { page, context } = await makePage();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    assert.equal(await text(page, '.event-log li:first-child .event-message'), 'This browser has no wallet. The market still runs as a guest.');
    await runFor(page, 7000);
    assert.equal((await stored(page)).points, 3);
    await context.close();
  });
  await test('browser: wallet success requests accounts then the exact personal_sign, saving only the address', async () => {
    const { page, context } = await makePage({ init: { arg: { address, signature }, fn: ({ address, signature }) => {
      window.__walletCalls = [];
      window.ethereum = { request: async args => { window.__walletCalls.push(args); if (args.method === 'eth_requestAccounts') return [address]; if (args.method === 'personal_sign') return signature; throw new Error('Forbidden wallet method'); } };
    } } });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.signin-button')?.textContent.includes('…'));
    const calls = await page.evaluate(() => window.__walletCalls);
    assert.deepEqual(calls.map(call => call.method), ['eth_requestAccounts', 'personal_sign']);
    assert.deepEqual(calls[1].params, [hexMessage(signatureMessage(address)), address]);
    assert.equal((await stored(page)).address, address);
    assert.equal(await text(page, '.signin-button'), `${address.slice(0, 6)}…${address.slice(-4)}`);
    assert.ok((await page.locator('.signin-button').getAttribute('aria-label')).includes(`${address.slice(0, 6)}…${address.slice(-4)}`));
    assert.ok(!(await page.evaluate(() => localStorage.getItem('night-market.v1'))).includes(signature));
    await context.close();
  });
  await test('browser: pending and rejected wallet signature never block the market', async () => {
    const { page, context } = await makePage({ init: { arg: address, fn: address => {
      window.ethereum = { request: async ({ method }) => method === 'eth_requestAccounts' ? [address] : new Promise((_, reject) => { window.__rejectWallet = reject; }) };
    } } });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    assert.ok(await page.locator('.signin-button').isDisabled());
    await page.getByRole('button', { name: 'Open wick', exact: true }).click();
    await page.getByRole('button', { name: 'Practice', exact: true }).click();
    await runFor(page, 7000);
    assert.ok((await stored(page)).points > 0);
    await page.evaluate(() => window.__rejectWallet({ code: 4001, message: 'User rejected the signature.' }));
    await page.waitForFunction(() => !document.querySelector('.signin-button').disabled);
    assert.match(await text(page, '.event-log'), /User rejected the signature/);
    assert.equal((await stored(page)).address, null);
    await context.close();
  });
  await test('browser: all book fields survive reload, while every in-progress fill resets', async () => {
    const { page, context } = await makePage();
    await runFor(page, 3000);
    await page.evaluate(({ key, address }) => localStorage.setItem(key, JSON.stringify({ points: 42, counts: { wick: 4, oil: 6, glass: 7 }, open: 'glass', round: '286', address })), { key: STORAGE_KEY, address });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('.points-number')?.textContent === '42');
    assert.deepEqual(await stored(page), { points: 42, counts: { wick: 4, oil: 6, glass: 7 }, open: 'glass', round: '286', address });
    // Navigation and font/layout inspection can let a few new frames run. The old Oil
    // fill was nearly 50%; a fresh fill must still be below 6%, with no fill saved.
    for (const meter of await page.getByRole('progressbar').all()) assert.ok(Number(await meter.getAttribute('aria-valuenow')) < 6);
    assert.ok(!('fills' in await stored(page)));
    await context.close();
  });
  await test('browser: blocked localStorage shows an honest save warning and remains playable', async () => {
    const { page, context } = await makePage({ init: { fn: () => { Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable'); }; Storage.prototype.getItem = () => { throw new DOMException('Storage unavailable'); }; } } });
    assert.match(await text(page, '.save-warning'), /this visit cannot be saved/);
    await page.getByRole('button', { name: 'Open glass', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Open glass', exact: true }).getAttribute('aria-pressed'), 'true');
    await runFor(page, 7000);
    assert.equal(await text(page, '.points-number'), '3');
    await context.close();
  });
  await test('browser: keyboard skip link, focus ring and Space activate a stall', async () => {
    const { page, context } = await makePage();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Open wick');
    assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth), '2px');
    await page.screenshot({ path: 'test/scratch/checks/keyboard-focus.png', fullPage: true });
    await page.keyboard.press('Space');
    assert.equal((await stored(page)).open, 'wick');
    await context.close();
  });
  await test('browser: reduced motion stops all decorative animation; pause/resume works', async () => {
    for (const reducedMotion of ['reduce', 'no-preference']) {
      const { page, context } = await makePage({ reducedMotion });
      const animations = () => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length);
      if (reducedMotion === 'reduce') {
        assert.equal(await animations(), 0);
        const before = await page.locator('.oil-level').evaluate(element => getComputedStyle(element).transform);
        await runFor(page, 1500);
        assert.equal(await page.locator('.oil-level').evaluate(element => getComputedStyle(element).transform), before);
      }
      else {
        assert.ok(await animations() > 0);
        await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
        assert.equal(await animations(), 0);
        const before = await page.locator('.oil-level').evaluate(element => getComputedStyle(element).transform);
        await runFor(page, 1500);
        assert.equal(await page.locator('.oil-level').evaluate(element => getComputedStyle(element).transform), before);
        await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
        assert.ok(await animations() > 0);
      }
      await context.close();
    }
  });
  await test('browser: responsive export has no overflow at 320, 390, 576, 768 and 1440; all phone actions are on the first screen', async () => {
    for (const width of [320, 390, 576, 768, 1440]) {
      const { page, context } = await makePage({ width, height: width === 1440 ? 900 : 844 });
      const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('.stall-button')].map(button => { const b = button.getBoundingClientRect(); return { width: b.width, height: b.height, bottom: b.bottom }; }) }));
      assert.equal(layout.scrollWidth, width);
      assert.ok(layout.controls.every(button => button.height >= 44));
      if (width === 390) assert.ok(layout.controls.every(button => button.bottom < 844));
      await page.screenshot({ path: `test/scratch/checks/${width}.png`, fullPage: true });
      await context.close();
    }
  });
  await test('browser: automated WCAG A/AA accessibility scan reports no violations', async () => {
    const { page, context } = await makePage();
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    await writeFile('test/scratch/checks/axe.json', JSON.stringify(audit.violations, null, 2));
    assert.deepEqual(audit.violations.map(({ id, nodes }) => ({ id, elements: nodes.map(node => node.target) })), []);
    await context.close();
  });
  await test('browser: 200% text enlargement, long saved counts, RTL and forced colors preserve access', async () => {
    for (const width of [320, 390]) {
      const { page, context } = await makePage({ width });
      await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      for (const stall of STALLS) {
        await page.getByRole('button', { name: `Open ${stall}`, exact: true }).click();
        assert.equal((await stored(page)).open, stall);
      }
      await context.close();
    }
    const { page, context } = await makePage({ init: { fn: () => localStorage.setItem('night-market.v1', JSON.stringify({ points: Number.MAX_SAFE_INTEGER, counts: { wick: Number.MAX_SAFE_INTEGER, oil: Number.MAX_SAFE_INTEGER, glass: Number.MAX_SAFE_INTEGER }, open: 'oil', round: null, address: null })) } });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.getByRole('button', { name: 'Open glass', exact: true }).click();
    assert.equal((await stored(page)).open, 'glass');
    await context.close();
  });
  await test('browser: all local assets work at a gateway-style /preview/ subpath, no script errors', () => {
    assert.deepEqual(browserErrors, []);
    assert.deepEqual(resourceErrors, []);
  });
} finally { await browser.close(); await server.close(); }

const report = { checkedAt: new Date().toISOString(), passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length, results };
await writeFile('test/scratch/checks/results.json', JSON.stringify(report, null, 2));
console.log(`${report.passed}/${results.length} checks passed.`);
process.exitCode = report.failed ? 1 : 0;
