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
    assert.equal(await page.locator('.rotate-notice').count(), 0, 'La vista verticale non deve bloccare lo schermo');
    assert.equal(await page.locator('#plan').isVisible(), true);
    assert.ok((await page.locator('#plan').boundingBox()).width>=380,'La pianta deve riempire la larghezza disponibile');
    await page.screenshot({ path: `${shots}/public-portrait.png` });
    await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('room-template-v1'))||{room:{width:500,depth:500,height:280},items:[]};data.room.width=600;data.room.depth=300;data.items=[{id:'mobile-drag',name:'Prova',kind:'generic',x:300,y:150,w:80,d:60,h:75,color:'#b9a88e',elevation:0,angle:0}];localStorage.setItem('room-template-v1',JSON.stringify(data));});
    await page.reload();await page.waitForSelector('#plan');
    assert.equal(await page.locator('#plan').evaluate(el=>el.style.transform),'rotate(90deg)','Una stanza larga deve ruotare su schermo verticale');
    const rotatedItem=await page.locator('#plan [data-id="mobile-drag"]').boundingBox();
    await page.mouse.move(rotatedItem.x+rotatedItem.width/2,rotatedItem.y+rotatedItem.height/2);await page.mouse.down();
    await page.mouse.move(rotatedItem.x+rotatedItem.width/2+25,rotatedItem.y+rotatedItem.height/2+30,{steps:6});await page.mouse.up();
    assert.notDeepEqual(await page.evaluate(()=>{const x=JSON.parse(localStorage.getItem('room-template-v1')).items[0];return [x.x,x.y];}),[300,150],'Il trascinamento deve funzionare anche con la pianta ruotata');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#plan').evaluate(el=>el.style.transform),'none','La stanza larga deve restare orizzontale su schermo largo');
    await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('room-template-v1'));data.room.width=500;data.room.depth=500;data.items=[];localStorage.setItem('room-template-v1',JSON.stringify(data));});
    await page.reload();await page.waitForSelector('.mobile-menu');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Nessuno scroll orizzontale');
    const stage = await page.locator('article').boundingBox();
    assert.ok(stage.width >= 840, 'Il canvas deve occupare tutta la larghezza sotto il pannello');
    await page.screenshot({ path: `${shots}/public-plan.png` });

    const menu = page.locator('.mobile-menu');
    await menu.click();
    assert.equal(await page.locator('main>aside').isVisible(), true);
    await page.waitForFunction(() => document.querySelector('main>aside').getBoundingClientRect().right <= innerWidth + 1);
    assert.equal(Math.round((await page.locator('article').boundingBox()).width),Math.round(stage.width),'Il pannello deve sovrapporsi alla pianta');
    const sheet=await page.locator('main>aside').boundingBox();
    assert.ok(sheet.y>0&&sheet.height>300,'Il pannello deve salire dal basso');
    await page.screenshot({ path: `${shots}/public-drawer.png` });
    await page.locator('#add [name="name"]').fill('Tavolo prova');
    await page.locator('#add [name="kind"]').selectOption('table');
    await page.locator('#add button').click();
    assert.equal(await page.locator('#plan [data-id]').count(), 7, 'Il tavolo deve includere sei sedie');
    await page.locator('#open-chairs').click();
    const open = await page.evaluate(() => JSON.parse(localStorage.getItem('room-template-v1')));
    assert.equal(open.openChairs, true);
    assert.equal(open.items.filter(item => item.kind === 'chair').length, 6);
    await page.locator('#inspector [data-item="x"]').fill('270');
    await page.locator('#inspector [data-item="x"]').press('Tab');
    const moved = await page.evaluate(() => JSON.parse(localStorage.getItem('room-template-v1')));
    assert.equal(moved.items.find(item => item.kind === 'chair').x - open.items.find(item => item.kind === 'chair').x, 270-open.items.find(item => item.kind === 'table').x);
    await page.locator('#add [name="name"]').fill('Armadio prova');
    await page.locator('#add [name="kind"]').selectOption('cabinet');
    await page.locator('#add button').click();
    await page.locator('#open-cabinets').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('room-template-v1')).openCabinets), true);
    const tableId=moved.items.find(item=>item.kind==='table').id;
    await page.locator('details').filter({hasText:'Livelli'}).locator('summary').click();
    await page.locator(`[data-layer="${tableId}"]`).click();
    await page.locator('.mobile-close').click();

    const tableAngle=moved.items.find(item=>item.kind==='table').angle;
    await page.locator('.plan-rotate').click();
    const rotated=await page.evaluate(()=>JSON.parse(localStorage.getItem('room-template-v1')));
    assert.equal(rotated.items.find(item=>item.id===tableId).angle,(tableAngle+90)%360);
    assert.equal(rotated.items.find(item=>item.kind==='chair').angle,(moved.items.find(item=>item.kind==='chair').angle+90)%360);
    await page.locator('.plan-rotate').click();
    const positions=await page.evaluate((id)=>{const svg=document.querySelector('#plan'),table=JSON.parse(localStorage.getItem('room-template-v1')).items.find(item=>item.id===id);const p=svg.createSVGPoint();p.x=table.x+35;p.y=table.y;const start=p.matrixTransform(svg.getScreenCTM());p.x=77;p.y=table.y;const end=p.matrixTransform(svg.getScreenCTM());return {start:{x:start.x,y:start.y},end:{x:end.x,y:end.y}};},tableId);
    await page.mouse.move(positions.start.x,positions.start.y);await page.mouse.down();
    await page.mouse.move(positions.end.x,positions.end.y,{steps:8});await page.mouse.up();
    assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('room-template-v1')).items.find(item=>item.id===id).x,tableId),40,'Il tavolo deve agganciarsi al muro');

    await page.locator('[data-mobile-view="walk"]').click();
    const walkingStage=await page.locator('article').boundingBox();
    await page.locator('.mobile-menu').click();
    assert.equal(Math.round((await page.locator('article').boundingBox()).width),Math.round(walkingStage.width),'Nel 3D il pannello deve sovrapporsi');
    await page.locator('.mobile-close').click();
    assert.equal(await page.locator('.mobile-stick').count(), 1);
    assert.equal(await page.locator('.mobile-stick-move').isVisible(), true);
    assert.equal(await page.locator('.mobile-stick-look').count(), 0);
    const moveBox = await page.locator('.mobile-stick-move').boundingBox();
    const mx = moveBox.x + moveBox.width / 2, my = moveBox.y + moveBox.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: mx, y: my, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: mx, y: my - 30, id: 1 }] });
    assert.notEqual(await page.locator('.mobile-stick-move .mobile-stick-knob').evaluate(el => el.style.transform), '', 'Il primo dito deve comandare il movimento');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    const canvas = page.locator('#view');
    await page.waitForTimeout(400);
    const before = await canvas.screenshot();
    await dragStick(page, '.mobile-stick-move', 0, -35);
    await page.waitForTimeout(200);
    const afterMove = await canvas.screenshot();
    assert.equal(before.equals(afterMove), false, 'Il joystick sinistro deve muovere la camera');
    const canvasBox=await canvas.boundingBox();
    await page.mouse.move(canvasBox.x+canvasBox.width*.7,canvasBox.y+canvasBox.height*.45);
    await page.mouse.down();await page.mouse.move(canvasBox.x+canvasBox.width*.8,canvasBox.y+canvasBox.height*.5,{steps:6});await page.mouse.up();
    const afterLook = await canvas.screenshot();
    assert.equal(afterMove.equals(afterLook), false, 'Trascinare sulla vista deve ruotare la visuale');
    await page.screenshot({ path: `${shots}/public-walk.png` });
    assert.deepEqual(errors, [], 'Errori JavaScript nel template pubblico');
    await page.close();
    console.log('public: portrait, rotated plan, bottom sheet, walk and canvas look OK');
  } finally {
    await server.close();
  }
}

try {
  await verify();
} finally {
  await browser.close();
}
