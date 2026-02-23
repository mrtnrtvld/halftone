// ── Field ──
const field       = document.getElementById('field');
const fieldSlider = document.getElementById('fieldSlider');
const fieldVal    = document.getElementById('fieldVal');

let fieldPattern = 'dots';

function applyFieldPattern() {
  const px = +fieldSlider.value;
  if (fieldPattern === 'dots') {
    field.style.backgroundImage = `radial-gradient(circle, #000 40%, transparent 41%)`;
    field.style.backgroundSize  = `${px}px ${px}px`;
  } else {
    const lw = Math.max(1, Math.round(px * 0.4));
    field.style.backgroundImage = `repeating-linear-gradient(0deg, #000 0px, #000 ${lw}px, transparent ${lw}px, transparent ${px}px)`;
    field.style.backgroundSize  = 'auto';
  }
}

fieldSlider.addEventListener('input', e => {
  fieldVal.textContent = e.target.value;
  applyFieldPattern();
});

document.getElementById('fieldDots').addEventListener('click', () => {
  fieldPattern = 'dots';
  document.getElementById('fieldDots').classList.add('active');
  document.getElementById('fieldLines').classList.remove('active');
  applyFieldPattern();
});

document.getElementById('fieldLines').addEventListener('click', () => {
  fieldPattern = 'lines';
  document.getElementById('fieldLines').classList.add('active');
  document.getElementById('fieldDots').classList.remove('active');
  applyFieldPattern();
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

// ── Shapes & layer ordering ──
const shapes = [];
let draggedShape = null;

function updateZIndices() {
  // shapes[0] = bottom of canvas, shapes[last] = top
  shapes.forEach((s, i) => {
    s.wheel.style.zIndex = 10 + i;
  });
}

function syncShapesFromDOM() {
  // Layer list DOM order: first child = visually top entry = canvas front
  // Rebuild shapes array so shapes[last] = canvas front
  const list = document.getElementById('layersList');
  const reordered = [...list.children]
    .map(el => shapes.find(s => s.listEl === el))
    .filter(Boolean)
    .reverse();
  shapes.length = 0;
  shapes.push(...reordered);
}

// ── Shape factory ──
function createShape(type) {
  const n = shapes.length;   // capture before push
  const s = {
    cx:      window.innerWidth  / 2 + n * 30,
    cy:      window.innerHeight / 2 + n * 20,
    ang:     0,
    size:    220,
    density: 8,
    mode:    null,
    dragOx:  0,
    dragOy:  0,
    type,
    pattern: 'dots',
    visible: true,
    wheel:   null,   // assigned below
    propBox: null,   // assigned below
    listEl:  null,   // assigned below
  };

  // ── Wheel ──
  const wheel   = document.createElement('div');
  wheel.className   = 'wheel';

  const shapeEl = document.createElement('div');
  shapeEl.className = `shape ${type}`;

  const handle  = document.createElement('div');
  handle.className  = 'handle';

  wheel.append(shapeEl, handle);
  document.body.append(wheel);
  s.wheel = wheel;

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

  const propPatternBtns = document.createElement('div');
  propPatternBtns.className = 'pattern-btns';

  const propDotBtn  = document.createElement('button');
  propDotBtn.className   = 'pattern-btn active';
  const propDotIcon = document.createElement('span');
  propDotIcon.className  = 'pattern-icon dots';
  propDotBtn.append(propDotIcon);

  const propLineBtn  = document.createElement('button');
  propLineBtn.className  = 'pattern-btn';
  const propLineIcon = document.createElement('span');
  propLineIcon.className = 'pattern-icon lines';
  propLineBtn.append(propLineIcon);

  propDotBtn.addEventListener('click', () => {
    s.pattern = 'dots';
    propDotBtn.classList.add('active');
    propLineBtn.classList.remove('active');
    applyShapePattern();
  });
  propLineBtn.addEventListener('click', () => {
    s.pattern = 'lines';
    propLineBtn.classList.add('active');
    propDotBtn.classList.remove('active');
    applyShapePattern();
  });

  propPatternBtns.append(propDotBtn, propLineBtn);
  propBox.append(propHeader, propSlider, propPatternBtns);
  document.body.append(propBox);
  s.propBox = propBox;

  propBox.addEventListener('pointerdown', e => e.stopPropagation());

  // ── Layer entry ──
  const layerEntry = document.createElement('div');
  layerEntry.className = 'layer-entry';
  layerEntry.draggable = true;

  const layerDrag = document.createElement('div');
  layerDrag.className = 'layer-drag';

  const layerIcon = document.createElement('div');
  layerIcon.className = `layer-icon ${type}`;

  const layerName = document.createElement('span');
  layerName.className   = 'layer-name';
  layerName.textContent = type;

  const visBtn = document.createElement('button');
  visBtn.className   = 'layer-btn';
  visBtn.textContent = '●';
  visBtn.title       = 'Toggle visibility';
  visBtn.addEventListener('click', () => {
    s.visible = !s.visible;
    wheel.style.display = s.visible ? '' : 'none';
    if (!s.visible) propBox.classList.remove('open');
    visBtn.textContent = s.visible ? '●' : '○';
  });

  const delBtn = document.createElement('button');
  delBtn.className   = 'layer-btn';
  delBtn.textContent = '×';
  delBtn.title       = 'Delete';
  delBtn.addEventListener('click', () => {
    wheel.remove();
    propBox.remove();
    layerEntry.remove();
    const idx = shapes.indexOf(s);
    if (idx !== -1) shapes.splice(idx, 1);
    updateZIndices();
  });

  layerEntry.append(layerDrag, layerIcon, layerName, visBtn, delBtn);
  s.listEl = layerEntry;

  // ── Layer drag-and-drop ──
  layerEntry.addEventListener('dragstart', e => {
    draggedShape = s;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => layerEntry.classList.add('dragging'), 0);
  });

  layerEntry.addEventListener('dragend', () => {
    layerEntry.classList.remove('dragging');
    draggedShape = null;
  });

  layerEntry.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    layerEntry.classList.add('drag-over');
  });

  layerEntry.addEventListener('dragleave', e => {
    if (!layerEntry.contains(e.relatedTarget)) {
      layerEntry.classList.remove('drag-over');
    }
  });

  layerEntry.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    layerEntry.classList.remove('drag-over');
    if (!draggedShape || draggedShape === s) return;
    const list = document.getElementById('layersList');
    const rect = layerEntry.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      list.insertBefore(draggedShape.listEl, layerEntry);
    } else {
      list.insertBefore(draggedShape.listEl, layerEntry.nextSibling);
    }
    syncShapesFromDOM();
    updateZIndices();
  });

  // ── Density / pattern ──
  function applyShapePattern() {
    const px = s.density;
    if (s.pattern === 'dots') {
      const offset = (px / 2).toFixed(1);
      shapeEl.style.backgroundImage    = `radial-gradient(circle, #000 40%, transparent 41%)`;
      shapeEl.style.backgroundSize     = `${px}px ${px}px`;
      shapeEl.style.backgroundPosition = `${offset}px ${offset}px`;
    } else {
      const lw = Math.max(1, Math.round(px * 0.4));
      shapeEl.style.backgroundImage    = `repeating-linear-gradient(0deg, #000 0px, #000 ${lw}px, transparent ${lw}px, transparent ${px}px)`;
      shapeEl.style.backgroundSize     = 'auto';
      shapeEl.style.backgroundPosition = '0 0';
    }
  }

  function setDensity(px) {
    s.density            = px;
    propSpan.textContent = px;
    applyShapePattern();
  }
  setDensity(s.density);

  propSlider.addEventListener('input', e => setDensity(+e.target.value));

  // ── Transform ──
  function updatePropBoxPosition() {
    const rad  = s.ang * Math.PI / 180;
    const dist = s.size / 2 - 10;  // knob centre is 10px from wheel top
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

  // ── Hover: fade outline + handle ──
  wheel.addEventListener('pointerenter', () => wheel.classList.add('hovered'));
  wheel.addEventListener('pointerleave', () => wheel.classList.remove('hovered'));

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

  // ── Register: new shapes go to front ──
  shapes.push(s);
  document.getElementById('layersList').prepend(s.listEl);
  updateZIndices();
}

// ── Shape buttons ──
document.querySelectorAll('.shape-btn').forEach(btn => {
  btn.addEventListener('click', () => createShape(btn.dataset.shape));
});

// ── Initial circle ──
createShape('circle');
