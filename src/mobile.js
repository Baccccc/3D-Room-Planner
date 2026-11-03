import { createMobileControls } from './mobile-controls.js';

export function initMobile({ camera, controls, getRoom, rotateSelected }) {
  const main = document.querySelector('main');
  const aside = main.querySelector('aside');
  const article = main.querySelector('article');
  const planPanel = article.querySelector('.panel:first-child');
  const viewPanel = article.querySelector('.panel:nth-child(2)');
  const canvas = viewPanel.querySelector('canvas');
  const sticks = createMobileControls(viewPanel);
  const mobile = matchMedia('(pointer: coarse) and (max-width: 1024px)');

  const menu = document.createElement('button');
  menu.className = 'mobile-menu';
  menu.type = 'button';
  menu.textContent = '☰';
  menu.setAttribute('aria-label', 'Apri pannello');
  menu.setAttribute('aria-expanded', 'false');
  const close = document.createElement('button');
  close.className = 'mobile-close';
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Chiudi pannello');
  const backdrop = document.createElement('button');
  backdrop.className = 'mobile-backdrop';
  backdrop.type = 'button';
  backdrop.setAttribute('aria-label', 'Chiudi pannello');
  const tabs = document.createElement('div');
  tabs.className = 'mobile-view-tabs';
  tabs.innerHTML = '<button data-mobile-view="plan" class="active">Pianta</button><button data-mobile-view="walk">3D</button>';
  const planRotate = document.createElement('button');
  planRotate.className = 'plan-rotate';
  planRotate.type = 'button';
  planRotate.textContent = '↻ Ruota';
  planRotate.setAttribute('aria-label', 'Ruota l’elemento selezionato di 90 gradi');
  planRotate.onclick = () => rotateSelected();
  planPanel.append(planRotate);
  main.append(menu, backdrop, tabs);
  aside.prepend(close);

  function setDrawer(open) {
    main.classList.toggle('mobile-drawer-open', open);
    menu.setAttribute('aria-expanded', String(open));
    aside.setAttribute('aria-hidden', String(mobile.matches && !open));
  }
  menu.onclick = () => setDrawer(true);
  close.onclick = backdrop.onclick = () => setDrawer(false);

  let walking = false;
  let yaw = 0;
  let pitch = 0;
  function setView(view) {
    walking = mobile.matches && view === 'walk';
    main.classList.toggle('mobile-walking', walking);
    main.classList.toggle('mobile-plan', mobile.matches && !walking);
    tabs.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.mobileView === view));
    controls.enabled = !walking;
    if (walking) {
      const room = getRoom();
      camera.position.set(room.width / 200, 1.6, Math.max(.3, room.depth / 100 - .5));
      yaw = 0;
      pitch = 0;
      camera.rotation.order = 'YXZ';
      camera.rotation.set(0, 0, 0);
    } else {
      camera.position.set(7, 7, 8);
      const room = getRoom();
      controls.target.set(room.width / 200, room.height / 300, room.depth / 200);
      controls.update();
    }
    setDrawer(false);
  }
  tabs.querySelectorAll('button').forEach(button => button.onclick = () => setView(button.dataset.mobileView));
  mobile.addEventListener('change', () => setView('plan'));
  setView('plan');

  let pointer = null;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', event => {
    if (!walking || pointer !== null) return;
    pointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(pointer);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    yaw -= (event.clientX - lastX) * .004;
    pitch = Math.max(-1.3, Math.min(1.3, pitch - (event.clientY - lastY) * .004));
    lastX = event.clientX;
    lastY = event.clientY;
  });
  const endPointer = event => { if (event.pointerId === pointer) pointer = null; };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', endPointer);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (walking) {
      const room = getRoom();
      const speed = 1.4;
      const forward = -sticks.move.y;
      const side = sticks.move.x;
      const length = Math.max(1, Math.hypot(forward, side));
      camera.position.x = Math.max(.12, Math.min(room.width / 100 - .12, camera.position.x + (-Math.sin(yaw) * forward + Math.cos(yaw) * side) / length * speed * dt));
      camera.position.z = Math.max(.12, Math.min(room.depth / 100 - .12, camera.position.z + (-Math.cos(yaw) * forward - Math.sin(yaw) * side) / length * speed * dt));
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
