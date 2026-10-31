import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.env.MOBILE_SHOTS_DIR || path.join(tmpdir(), 'room-planner-mobile-shots');
await mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright').catch(() => import('file:///C:/Users/bacch/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

async function dragStick(page, selector, dx, dy) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box, `${selector} deve essere visibile`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.waitForTimeout(450);
  await page.mouse.up();
  assert.equal(await page.locator(`${selector} .mobile-stick-knob`).evaluate(el => el.style.transform), '', 'Il joystick deve tornare al centro');
}

async function verify() {
  const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const port = server.httpServer.address().port;
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('.rotate-notice').isVisible(), true, 'Il telefono verticale deve chiedere la rotazione');
    await page.screenshot({ path: `${shots}/public-portrait.png` });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.rotate-notice').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Nessuno scroll orizzontale');
    const stage = await page.locator('article').boundingBox();
    assert.ok(stage.width >= 840, 'Il canvas deve occupare tutta la larghezza sotto il pannello');
    await page.screenshot({ path: `${shots}/public-plan.png` });

    const menu = page.locator('.mobile-menu');
    await menu.click();
    assert.equal(await page.locator('main>aside').isVisible(), true);
    await page.waitForFunction(() => document.querySelector('main>aside').getBoundingClientRect().right <= innerWidth + 1);
    assert.ok((await page.locator('article').boundingBox()).width >= 840, 'Il pannello deve sovrapporsi al canvas');
    await page.screenshot({ path: `${shots}/public-drawer.png` });
    await page.locator('#add [name="name"]').fill('Tavolo prova');
    await page.locator('#add button').click();
    assert.equal(await page.locator('#plan [data-id]').count(), 1, 'Il form mobile deve aggiungere un mobile');
    await page.locator('.mobile-close').click();

    await page.locator('[data-mobile-view="walk"]').click();
    assert.equal(await page.locator('.mobile-stick').count(), 2);
    assert.equal(await page.locator('.mobile-stick-move').isVisible(), true);
    assert.equal(await page.locator('.mobile-stick-look').isVisible(), true);
    const moveBox = await page.locator('.mobile-stick-move').boundingBox();
    const lookBox = await page.locator('.mobile-stick-look').boundingBox();
    const mx = moveBox.x + moveBox.width / 2, my = moveBox.y + moveBox.height / 2;
    const lx = lookBox.x + lookBox.width / 2, ly = lookBox.y + lookBox.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: mx, y: my, id: 1 }, { x: lx, y: ly, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: mx, y: my - 30, id: 1 }, { x: lx + 30, y: ly, id: 2 }] });
    assert.notEqual(await page.locator('.mobile-stick-move .mobile-stick-knob').evaluate(el => el.style.transform), '', 'Il primo dito deve comandare il movimento');
    assert.notEqual(await page.locator('.mobile-stick-look .mobile-stick-knob').evaluate(el => el.style.transform), '', 'Il secondo dito deve comandare la visuale');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    const canvas = page.locator('#view');
    await page.waitForTimeout(400);
    const before = await canvas.screenshot();
    await dragStick(page, '.mobile-stick-move', 0, -35);
    await page.waitForTimeout(200);
    const afterMove = await canvas.screenshot();
    assert.equal(before.equals(afterMove), false, 'Il joystick sinistro deve muovere la camera');
    await dragStick(page, '.mobile-stick-look', 35, 0);
    const afterLook = await canvas.screenshot();
    assert.equal(afterMove.equals(afterLook), false, 'Il joystick destro deve ruotare la visuale');
    await page.screenshot({ path: `${shots}/public-walk.png` });
    assert.deepEqual(errors, [], 'Errori JavaScript nel template pubblico');
    await page.close();
    console.log('public: portrait, plan, drawer, walk and both sticks OK');
  } finally {
    await server.close();
  }
}

try {
  await verify();
} finally {
  await browser.close();
}
