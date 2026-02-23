// ── Field ──
const field       = document.getElementById('field');
const fieldSlider = document.getElementById('fieldSlider');
const fieldVal    = document.getElementById('fieldVal');

fieldSlider.addEventListener('input', e => {
  const px = +e.target.value;
  field.style.backgroundSize = `${px}px ${px}px`;
  fieldVal.textContent = px;
});

// ── Panel toggle ──
const panel       = document.getElementById('panel');
const panelToggle = document.getElementById('panelToggle');

panelToggle.addEventListener('click', () => {
  const collapsed = panel.classList.toggle('collapsed');
  panelToggle.textContent = collapsed ? '▶' : '◀';
});

// Stop panel interactions reaching the page
panel.addEventListener('pointerdown', e => e.stopPropagation());

// ── Shape factory ──
const shapes = [];

function createShape(type) {
  const n = shapes.length;
  const s = {
    cx:     window.innerWidth  / 2 + n * 30,
    cy:     window.innerHeight / 2 + n * 20,
    ang:    0,
    size:   220,
    density: 8,
    mode:   null,
    dragOx: 0,
    dragOy: 0,
  };
  shapes.push(s);

  // ── Wheel ──
  const wheel   = document.createElement('div');
  wheel.className   = 'wheel';
  wheel.style.zIndex = 10 + n;

  const shapeEl = document.createElement('div');
  shapeEl.className = `shape ${type}`;

  const handle  = document.createElement('div');
  handle.className  = 'handle';

  wheel.append(shapeEl, handle);
  document.body.append(wheel);

  // ── Property box ──
  const propBox    = document.createElement('div');
  propBox.className = 'prop-box';

  const propSpan   = document.createElement('span');
  propSpan.textContent = s.density;

  const propLabel  = document.createElement('div');
  propLabel.className = 'prop-label';
  propLabel.append('Density\u00a0', propSpan, '\u00a0px');

  const propClose  = document.createElement('button');
  propClose.className   = 'prop-close';
  propClose.textContent = '×';
  propClose.addEventListener('click', () => propBox.classList.remove('open'));

  const propHeader = document.createElement('div');
  propHeader.className = 'prop-header';
  propHeader.append(propLabel, propClose);

  const propSlider = document.createElement('input');
  propSlider.type  = 'range';
  propSlider.min   = '3';
  propSlider.max   = '30';
  propSlider.value = String(s.density);
  propSlider.step  = '1';

  propBox.append(propHeader, propSlider);
  document.body.append(propBox);

  propBox.addEventListener('pointerdown', e => e.stopPropagation());

  // ── Density ──
  function setDensity(px) {
    const offset = (px / 2).toFixed(1);
    shapeEl.style.backgroundSize     = `${px}px ${px}px`;
    shapeEl.style.backgroundPosition = `${offset}px ${offset}px`;
    s.density          = px;
    propSpan.textContent = px;
  }
  setDensity(s.density);

  propSlider.addEventListener('input', e => setDensity(+e.target.value));

  // ── Transform ──
  function updatePropBoxPosition() {
    // Calculate the handle knob's world position
    const rad  = s.ang * Math.PI / 180;
    const dist = s.size / 2 + 45;           // radius + handle stem to knob centre
    const kx   = s.cx + dist * Math.sin(rad);
    const ky   = s.cy - dist * Math.cos(rad);
    propBox.style.left = (kx + 14) + 'px';
    propBox.style.top  = (ky - 10) + 'px';
  }

  function applyTransform() {
    wheel.style.width     = s.size + 'px';
    wheel.style.height    = s.size + 'px';
    wheel.style.left      = s.cx   + 'px';
    wheel.style.top       = s.cy   + 'px';
    wheel.style.transform = `translate(-50%, -50%) rotate(${s.ang}deg)`;
    updatePropBoxPosition();
  }
  applyTransform();

  // ── Hover: fade outline in/out ──
  shapeEl.addEventListener('pointerenter', () => wheel.classList.add('hovered'));
  shapeEl.addEventListener('pointerleave', () => wheel.classList.remove('hovered'));

  // ── Cursor hint: edge = resize ──
  shapeEl.addEventListener('pointermove', e => {
    if (s.mode) return;
    const dist = Math.hypot(e.clientX - s.cx, e.clientY - s.cy);
    shapeEl.style.cursor = dist > s.size / 2 - 16 ? 'ew-resize' : 'grab';
  });

  // ── Shape: drag or resize ──
  shapeEl.addEventListener('pointerdown', e => {
    const dist = Math.hypot(e.clientX - s.cx, e.clientY - s.cy);
    if (dist > s.size / 2 - 16) {
      s.mode = 'resize';
    } else {
      s.mode   = 'drag';
      s.dragOx = e.clientX - s.cx;
      s.dragOy = e.clientY - s.cy;
    }
    shapeEl.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  });

  // ── Handle: rotate ──
  handle.addEventListener('pointerdown', e => {
    s.mode = 'rotate';
    handle.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  });

  // ── Handle: double-click → toggle prop box ──
  handle.addEventListener('dblclick', e => {
    propBox.classList.toggle('open');
    updatePropBoxPosition();
    e.stopPropagation();
  });

  // ── Global pointer events (per shape) ──
  window.addEventListener('pointermove', e => {
    if (s.mode === 'drag') {
      s.cx = e.clientX - s.dragOx;
      s.cy = e.clientY - s.dragOy;
      applyTransform();
    } else if (s.mode === 'rotate') {
      const dx = e.clientX - s.cx;
      const dy = e.clientY - s.cy;
      s.ang = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      applyTransform();
    } else if (s.mode === 'resize') {
      const dx = e.clientX - s.cx;
      const dy = e.clientY - s.cy;
      s.size = Math.max(60, Math.hypot(dx, dy) * 2);
      applyTransform();
    }
  });

  window.addEventListener('pointerup', () => { s.mode = null; });
}

// ── Shape buttons ──
document.querySelectorAll('.shape-btn').forEach(btn => {
  btn.addEventListener('click', () => createShape(btn.dataset.shape));
});

// ── Initial circle ──
createShape('circle');
