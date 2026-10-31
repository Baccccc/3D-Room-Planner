// Two independent touch sticks. Values stay in [-1, 1] until the pointer is released.
export function createMobileControls(container) {
  const state = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 } };
  const wrapper = document.createElement('div');
  wrapper.className = 'mobile-sticks';

  for (const [kind, label] of [['move', 'Muoviti'], ['look', 'Visuale']]) {
    const stick = document.createElement('div');
    stick.className = `mobile-stick mobile-stick-${kind}`;
    stick.setAttribute('role', 'group');
    stick.setAttribute('aria-label', `Joystick ${label.toLowerCase()}`);
    stick.innerHTML = `<span class="mobile-stick-label">${label}</span><span class="mobile-stick-knob"></span>`;
    const knob = stick.querySelector('.mobile-stick-knob');
    let activePointer = null;
    const update = event => {
      const bounds = stick.getBoundingClientRect();
      const radius = Math.max(1, Math.min(bounds.width, bounds.height) * .32);
      const x = (event.clientX - bounds.left - bounds.width / 2) / radius;
      const y = (event.clientY - bounds.top - bounds.height / 2) / radius;
      const length = Math.max(1, Math.hypot(x, y));
      state[kind].x = x / length;
      state[kind].y = y / length;
      knob.style.transform = `translate(${state[kind].x * radius}px, ${state[kind].y * radius}px)`;
    };
    const release = event => {
      if (event.pointerId !== activePointer) return;
      activePointer = null;
      state[kind].x = 0;
      state[kind].y = 0;
      knob.style.transform = '';
    };
    stick.addEventListener('pointerdown', event => {
      if (activePointer !== null) return;
      event.preventDefault();
      activePointer = event.pointerId;
      stick.setPointerCapture(event.pointerId);
      update(event);
    });
    stick.addEventListener('pointermove', event => {
      if (event.pointerId === activePointer) update(event);
    });
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);
    stick.addEventListener('lostpointercapture', release);
    wrapper.append(stick);
  }

  container.append(wrapper);
  return state;
}
