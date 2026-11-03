import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const key = 'room-template-v1';
const initial = { room: { width: 500, depth: 500, height: 280 }, items: [], openChairs: false, openCabinets: false };
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let data;
try { data = { ...structuredClone(initial), ...JSON.parse(localStorage.getItem(key)) }; }
catch { data = structuredClone(initial); }
if (!data.room || !Array.isArray(data.items)) data = structuredClone(initial);
let selected = null;
const save = () => { syncChairs(); localStorage.setItem(key, JSON.stringify(data)); };
const parentOf = item => item?.parent ? data.items.find(other => other.id === item.parent) : item;
const item = () => parentOf(data.items.find(entry => entry.id === selected));

function syncChairs() {
  for (const chair of data.items.filter(entry => entry.kind === 'chair' && entry.parent)) {
    const table = data.items.find(entry => entry.id === chair.parent);
    if (!table) continue;
    const x = chair.offsetX, y = chair.offsetY;
    const length = Math.max(1, Math.hypot(x, y));
    const spread = data.openChairs ? 24 : 0;
    const angle = table.angle * Math.PI / 180;
    const localX = x + x / length * spread, localY = y + y / length * spread;
    chair.x = Math.round(table.x + localX * Math.cos(angle) - localY * Math.sin(angle));
    chair.y = Math.round(table.y + localX * Math.sin(angle) + localY * Math.cos(angle));
    chair.angle = (chair.baseAngle + table.angle) % 360;
    chair.hidden = Boolean(table.hidden);
  }
}
function snapToWalls(piece) {
  const a = piece.angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const corners = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy]) => ({
    x: piece.x + sx * piece.w / 2 * c - sy * piece.d / 2 * s,
    y: piece.y + sx * piece.w / 2 * s + sy * piece.d / 2 * c
  }));
  const left = Math.min(...corners.map(point => point.x)), right = Math.max(...corners.map(point => point.x));
  const top = Math.min(...corners.map(point => point.y)), bottom = Math.max(...corners.map(point => point.y));
  const nearestX = [{ gap: left, delta: -left }, { gap: data.room.width-right, delta: data.room.width-right }].sort((a,b) => Math.abs(a.gap)-Math.abs(b.gap))[0];
  const nearestY = [{ gap: top, delta: -top }, { gap: data.room.depth-bottom, delta: data.room.depth-bottom }].sort((a,b) => Math.abs(a.gap)-Math.abs(b.gap))[0];
  return { ...piece, x: piece.x + (Math.abs(nearestX.gap) <= 12 ? nearestX.delta : 0),
    y: piece.y + (Math.abs(nearestY.gap) <= 12 ? nearestY.delta : 0) };
}
function addChairs(table) {
  const positions = [
    [-.25, -1, 0], [.25, -1, 0], [-.25, 1, 180], [.25, 1, 180], [-1, 0, 90], [1, 0, 270]
  ];
  positions.forEach(([x,y,angle], index) => data.items.push({
    id: crypto.randomUUID(), name: `Sedia ${index + 1}`, kind: 'chair', parent: table.id,
    offsetX: x * (x === -1 || x === 1 ? table.w / 2 + 28 : table.w),
    offsetY: y * (y === -1 || y === 1 ? table.d / 2 + 28 : table.d),
    baseAngle: angle, w: 44, d: 40, h: 87, elevation: 0, angle,
    x: table.x, y: table.y, color: '#8b664d'
  }));
  syncChairs();
}

$('#app').innerHTML = `
<header><div><small>ROOM PLANNER</small><h1>La tua stanza</h1><p>Una base vuota da personalizzare con le tue misure.</p></div><span>Prototipo · misure in cm</span></header>
<main><aside>
  <section><h2>Dimensioni stanza</h2><p>Queste misure sono un esempio. Inserisci quelle reali.</p><div class="fields" id="room-fields"></div></section>
  <section><h2>Aggiungi un elemento</h2><form id="add"><label>Nome<input name="name" required placeholder="Es. tavolo"></label>
    <label>Tipo<select name="kind"><option value="generic">Elemento semplice</option><option value="table">Tavolo con 6 sedie</option><option value="cabinet">Mobile con ante</option></select></label>
    <div class="fields"><label>Larghezza<input name="w" type="number" min="1" value="80" required></label><label>Profondità<input name="d" type="number" min="1" value="60" required></label><label>Altezza<input name="h" type="number" min="1" value="75" required></label></div>
    <label>Colore<input name="color" type="color" value="#b9a88e"></label><button>Aggiungi</button></form></section>
  <details open><summary>Posizione e dimensioni</summary><div id="inspector"></div></details>
  <details open><summary>Aperture</summary><div class="opening-actions"><button id="open-chairs" class="secondary" type="button"></button><button id="open-cabinets" class="secondary" type="button"></button></div></details>
  <details><summary>Disposizioni salvate</summary><button id="save-layout">Salva disposizione</button><div id="saved-list"></div></details>
  <details><summary>Livelli</summary><div id="layers"></div></details>
  <details><summary>Materiali</summary><div id="materials"></div></details>
</aside><article>
  <div class="panel"><div class="panel-title"><div><small>VISTA DALL'ALTO</small><h2>Pianta 2D</h2></div><span>Trascina un elemento per spostarlo</span></div><svg id="plan" aria-label="Pianta della stanza"></svg></div>
  <div class="panel"><div class="panel-title"><div><small>ESPLORA</small><h2>Vista 3D</h2></div><span>Trascina per ruotare · rotellina per zoom</span></div><canvas id="view"></canvas></div>
  <p class="note">Le forme sono volumi semplificati. Controlla sempre misure, aperture e ingombri reali.</p>
</article></main>`;

const renderer = new THREE.WebGLRenderer({ canvas: $('#view'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#ebe8e0');
scene.add(new THREE.HemisphereLight(0xffffff, 0x81776b, 2));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(4, 8, 5); scene.add(light);
const camera = new THREE.PerspectiveCamera(45, 1, .01, 100);
camera.position.set(7, 7, 8);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
let group = new THREE.Group();
scene.add(group);

function inspector() {
  const current = item();
  $('#inspector').innerHTML = current ? `<strong>${esc(current.name)}</strong><div class="fields">${[['x','X'],['y','Y'],['w','Larghezza'],['d','Profondità'],['h','Altezza'],['angle','Rotazione °']].map(([field,label]) => `<label>${label}<input type="number" data-item="${field}" value="${current[field]}"></label>`).join('')}</div>
    <button id="rot-left">↶ Ruota 90°</button> <button id="rot-right">Ruota 90° ↷</button>
    <details><summary>Altezza dal pavimento</summary><label>Altezza dal pavimento<input type="number" data-item="elevation" value="${current.elevation || 0}"></label></details>
    <button id="remove" class="secondary">Rimuovi dalla stanza</button>` : '<p>Seleziona un elemento nella pianta.</p>';
  $('#materials').innerHTML = current ? `<label>Colore principale<input id="color-item" type="color" value="${current.color}"></label><label>Dettaglio<input id="accent-item" type="color" value="${current.accent || '#b9a88e'}"></label>` : '<p>Seleziona un elemento.</p>';
  if (!current) return;
  document.querySelectorAll('[data-item]').forEach(input => input.onchange = () => {
    const field = input.dataset.item, value = Number(input.value);
    if (!Number.isFinite(value) || (['w','d','h'].includes(field) && value <= 0)) return;
    current[field] = value;
    if (field === 'angle') current.angle = ((value % 360) + 360) % 360;
    save(); draw();
  });
  $('#rot-left').onclick = () => rotateSelected(-90);
  $('#rot-right').onclick = () => rotateSelected(90);
  for (const [id, field] of [['color-item','color'],['accent-item','accent']]) {
    $('#' + id).oninput = event => { current[field] = event.target.value; save(); draw(); };
  }
  $('#remove').onclick = () => {
    data.items = data.items.filter(entry => entry.id !== current.id && entry.parent !== current.id);
    selected = null; save(); draw();
  };
}
function rotateSelected(degrees = 90) {
  const current = item();
  if (!current) return;
  current.angle = (current.angle + degrees + 360) % 360;
  syncChairs(); save(); draw();
}
function box(parent, w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: .85 }));
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}
function draw3d() {
  scene.remove(group);
  group.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
  group = new THREE.Group(); scene.add(group);
  const room = data.room, w = room.width / 100, d = room.depth / 100, h = room.height / 100;
  box(group, w, .03, d, '#d8c9b4', w/2, -.015, d/2);
  box(group, w, h, .04, '#f6f3ec', w/2, h/2, 0);
  box(group, .04, h, d, '#f1eee7', 0, h/2, d/2);
  for (const current of data.items.filter(entry => !entry.hidden)) {
    const furniture = new THREE.Group(); furniture.position.set(current.x/100, current.elevation/100, current.y/100);
    furniture.rotation.y = -current.angle * Math.PI / 180; group.add(furniture);
    const iw = current.w/100, ih = current.h/100, id = current.d/100;
    if (current.kind === 'table') {
      box(furniture, iw, .1, id, current.color, 0, ih-.05, 0);
      for (const x of [-iw/2+.06,iw/2-.06]) for (const z of [-id/2+.06,id/2-.06]) box(furniture,.06,ih-.1,.06,current.color,x,(ih-.1)/2,z);
    } else if (current.kind === 'chair') {
      box(furniture,iw,.07,id,current.color,0,.48,0);
      for (const x of [-iw/2+.04,iw/2-.04]) for (const z of [-id/2+.04,id/2-.04]) box(furniture,.04,.47,.04,current.color,x,.235,z);
      box(furniture,iw,.35,.05,current.color,0,.68,-id/2+.02);
    } else if (current.kind === 'cabinet') {
      box(furniture,iw,ih,id,current.color,0,ih/2,0);
      const door = new THREE.Group();
      door.position.set(-iw/2, 0, id/2+.012); door.rotation.y = data.openCabinets ? -1.2 : 0; furniture.add(door);
      box(door,iw-.02,ih-.03,.02,current.accent || '#e5ded2',(iw-.02)/2,ih/2,0);
      if (data.openCabinets) box(furniture,iw-.08,ih-.09,.01,'#514e49',0,ih/2,id/2+.008);
    } else box(furniture,iw,ih,id,current.color,0,ih/2,0);
  }
  controls.target.set(w/2,h/3,d/2); controls.update();
}
function fitPlan() {
  const svg = $('#plan'), panel = svg.parentElement;
  if (!matchMedia('(pointer:coarse) and (max-width:1024px)').matches) {
    svg.style.width = ''; svg.style.height = ''; svg.style.transform = '';
    return;
  }
  const bounds = panel.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const width = data.room.width + 12, height = data.room.depth + 12;
  const rotate = (width > height && bounds.height > bounds.width) || (height > width && bounds.width > bounds.height);
  const scale = Math.min(bounds.width / (rotate ? height : width), bounds.height / (rotate ? width : height));
  svg.style.width = `${width * scale}px`;
  svg.style.height = `${height * scale}px`;
  svg.style.transform = rotate ? 'rotate(90deg)' : 'none';
}
function draw() {
  syncChairs();
  const room = data.room;
  $('#layers').innerHTML = data.items.filter(entry => !entry.parent).map(entry => `<button class="secondary" data-layer="${esc(entry.id)}">${esc(entry.name)}${entry.kind === 'table' ? ' + 6 sedie' : ''}</button>`).join('') || '<p>Nessun elemento.</p>';
  document.querySelectorAll('[data-layer]').forEach(button => button.onclick = () => { selected = button.dataset.layer; draw(); });
  const layouts = JSON.parse(localStorage.getItem(key + '-layouts') || '[]');
  $('#saved-list').innerHTML = layouts.map((layout,index) => `<button class="secondary" data-layout="${index}">${esc(layout.name)}</button>`).join('') || '<p>Nessuna disposizione salvata.</p>';
  document.querySelectorAll('[data-layout]').forEach(button => button.onclick = () => {
    data = structuredClone(layouts[Number(button.dataset.layout)].data); selected = null; save(); draw();
  });
  $('#room-fields').innerHTML = [['width','Larghezza'],['depth','Lunghezza'],['height','Altezza']].map(([field,label]) => `<label>${label}<input data-room="${field}" type="number" min="1" value="${room[field]}"></label>`).join('');
  document.querySelectorAll('[data-room]').forEach(input => input.onchange = () => {
    const value = Number(input.value); if (value > 0) { room[input.dataset.room] = value; save(); draw(); }
  });
  $('#open-chairs').textContent = data.openChairs ? 'Avvicina sedie' : 'Apri sedie';
  $('#open-cabinets').textContent = data.openCabinets ? 'Chiudi mobili' : 'Apri mobili';
  const svg = $('#plan');
  svg.setAttribute('viewBox', `-6 -6 ${room.width+12} ${room.depth+12}`);
  svg.innerHTML = `<rect width="${room.width}" height="${room.depth}" fill="#f6f2ea" stroke="#6b5b49" stroke-width="4"/>` +
    data.items.filter(entry => !entry.hidden).map(entry => `<g data-id="${esc(entry.id)}" transform="translate(${entry.x} ${entry.y}) rotate(${entry.angle})">
      <rect x="${-entry.w/2}" y="${-entry.d/2}" width="${entry.w}" height="${entry.d}" fill="${esc(entry.color)}" stroke="${selected === (entry.parent || entry.id) ? '#3874ab' : '#786b5d'}" stroke-width="3"/>
      ${entry.kind === 'cabinet' && data.openCabinets ? `<path d="M${-entry.w/2} ${entry.d/2}l${-entry.w*.7} ${entry.d*.2}" stroke="#5b483e" stroke-width="5"/>` : ''}
      <text text-anchor="middle" dominant-baseline="middle" font-size="14" pointer-events="none">${entry.kind === 'chair' ? '' : esc(entry.name)}</text></g>`).join('');
  fitPlan();
  svg.querySelectorAll('g').forEach(element => element.onpointerdown = event => {
    event.preventDefault();
    const touched = data.items.find(entry => entry.id === element.dataset.id);
    const current = parentOf(touched);
    selected = current.id;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const start = point.matrixTransform(svg.getScreenCTM().inverse());
    const dx = current.x-start.x, dy = current.y-start.y;
    element.setPointerCapture(event.pointerId);
    element.onpointermove = move => {
      if (move.pointerId !== event.pointerId) return;
      point.x = move.clientX; point.y = move.clientY;
      const position = point.matrixTransform(svg.getScreenCTM().inverse());
      const candidate = snapToWalls({ ...current, x: Math.round(position.x+dx), y: Math.round(position.y+dy) });
      current.x = Math.round(candidate.x); current.y = Math.round(candidate.y);
      syncChairs(); save();
      for (const related of svg.querySelectorAll('g[data-id]')) {
        const piece = data.items.find(entry => entry.id === related.dataset.id);
        related.setAttribute('transform', `translate(${piece.x} ${piece.y}) rotate(${piece.angle})`);
      }
    };
    element.onpointerup = () => draw();
    element.onpointercancel = () => draw();
    inspector();
  });
  inspector();
  draw3d();
}

$('#open-chairs').onclick = () => { data.openChairs = !data.openChairs; save(); draw(); };
$('#open-cabinets').onclick = () => { data.openCabinets = !data.openCabinets; save(); draw(); };
$('#save-layout').onclick = () => {
  const name = prompt('Nome della disposizione'); if (!name?.trim()) return;
  const layouts = JSON.parse(localStorage.getItem(key+'-layouts') || '[]');
  layouts.push({ name: name.trim(), data: structuredClone(data) });
  localStorage.setItem(key+'-layouts', JSON.stringify(layouts)); draw();
};
$('#add').onsubmit = event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget), room = data.room;
  const current = { id: crypto.randomUUID(), name: String(form.get('name')).trim(), kind: String(form.get('kind')),
    w: Number(form.get('w')), d: Number(form.get('d')), h: Number(form.get('h')),
    color: String(form.get('color')), x: room.width/2, y: room.depth/2, elevation: 0, angle: 0 };
  if (!current.name || current.w <= 0 || current.d <= 0 || current.h <= 0) return;
  data.items.push(current);
  if (current.kind === 'table') addChairs(current);
  selected = current.id; save(); draw(); event.currentTarget.reset();
};
function animate() {
  requestAnimationFrame(animate);
  const canvas = renderer.domElement, bounds = canvas.getBoundingClientRect();
  renderer.setSize(Math.max(1,bounds.width),Math.max(1,bounds.height),false);
  camera.aspect = bounds.width/Math.max(1,bounds.height); camera.updateProjectionMatrix();
  if (controls.enabled) controls.update();
  renderer.render(scene,camera);
}
draw(); animate();
new ResizeObserver(fitPlan).observe($('#plan').parentElement);
window.addEventListener('resize', fitPlan);
import('./mobile.js').then(({ initMobile }) => initMobile({ camera, controls, getRoom: () => data.room, rotateSelected }));
