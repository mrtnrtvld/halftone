// ── Field ──
const field       = document.getElementById('field');
const fieldSlider = document.getElementById('fieldSlider');
const fieldVal    = document.getElementById('fieldVal');

let fieldPattern = 'dots';

function applyFieldPattern() {
  const px = +fieldSlider.value;
  if (fieldPattern === 'blank') {
    field.style.backgroundImage = 'none';
    field.style.backgroundSize  = 'auto';
  } else if (fieldPattern === 'dots') {
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

function setFieldPattern(p) {
  fieldPattern = p;
  ['fieldDots', 'fieldLines', 'fieldBlank'].forEach(id => {
    document.getElementById(id).classList.toggle('active', id === 'field' + p.charAt(0).toUpperCase() + p.slice(1));
  });
  applyFieldPattern();
}

document.getElementById('fieldDots').addEventListener('click',  () => setFieldPattern('dots'));
document.getElementById('fieldLines').addEventListener('click', () => setFieldPattern('lines'));
document.getElementById('fieldBlank').addEventListener('click', () => setFieldPattern('blank'));

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
    ang:        0,
    width:      220,
    height:     220,
    resizeEdge: '',
    density:    8,
    mode:       null,
    dragOx:     0,
    dragOy:     0,
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
  // Transform screen coords to wheel-local (unrotated) coords
  function toLocal(ex, ey) {
    const dx  = ex - s.cx;
    const dy  = ey - s.cy;
    const rad = s.ang * Math.PI / 180;
    return {
      lx:  dx * Math.cos(rad) + dy * Math.sin(rad),
      ly: -dx * Math.sin(rad) + dy * Math.cos(rad),
    };
  }

  function updatePropBoxPosition() {
    const rad  = s.ang * Math.PI / 180;
    const dist = (type === 'square' ? s.height : (s.width || s.height)) / 2 - 10;
    const kx   = s.cx + dist * Math.sin(rad);
    const ky   = s.cy - dist * Math.cos(rad);
    propBox.style.left = (kx + 14) + 'px';
    propBox.style.top  = (ky - 10) + 'px';
  }

  function applyTransform() {
    wheel.style.width     = s.width  + 'px';
    wheel.style.height    = s.height + 'px';
    wheel.style.left      = s.cx     + 'px';
    wheel.style.top       = s.cy     + 'px';
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
    if (type === 'square') {
      const { lx, ly } = toLocal(e.clientX, e.clientY);
      const nearH = Math.abs(Math.abs(lx) - s.width  / 2) < 16;
      const nearV = Math.abs(Math.abs(ly) - s.height / 2) < 16;
      if (nearH && !nearV) shapeEl.style.cursor = 'ew-resize';
      else if (nearV && !nearH) shapeEl.style.cursor = 'ns-resize';
      else if (nearH && nearV) shapeEl.style.cursor = 'ew-resize';
      else shapeEl.style.cursor = 'grab';
    } else {
      const dist = Math.hypot(e.clientX - s.cx, e.clientY - s.cy);
      shapeEl.style.cursor = dist > s.width / 2 - 16 ? 'ew-resize' : 'grab';
    }
  });

  // ── Shape: drag or resize ──
  shapeEl.addEventListener('pointerdown', e => {
    if (type === 'square') {
      const { lx, ly } = toLocal(e.clientX, e.clientY);
      const nearH = Math.abs(Math.abs(lx) - s.width  / 2) < 16;
      const nearV = Math.abs(Math.abs(ly) - s.height / 2) < 16;
      if (nearH || nearV) {
        s.mode = 'resize';
        s.resizeEdge = nearV && !nearH ? 'v' : 'h';
      } else {
        s.mode   = 'drag';
        s.dragOx = e.clientX - s.cx;
        s.dragOy = e.clientY - s.cy;
      }
    } else {
      const dist = Math.hypot(e.clientX - s.cx, e.clientY - s.cy);
      if (dist > s.width / 2 - 16) {
        s.mode = 'resize';
      } else {
        s.mode   = 'drag';
        s.dragOx = e.clientX - s.cx;
        s.dragOy = e.clientY - s.cy;
      }
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
      if (type === 'square') {
        const { lx, ly } = toLocal(e.clientX, e.clientY);
        if (s.resizeEdge === 'h') {
          s.width  = Math.max(40, Math.abs(lx) * 2);
        } else {
          s.height = Math.max(40, Math.abs(ly) * 2);
        }
      } else {
        const dx = e.clientX - s.cx;
        const dy = e.clientY - s.cy;
        const r  = Math.max(30, Math.hypot(dx, dy));
        s.width  = r * 2;
        s.height = r * 2;
      }
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

// ── Export helpers ──

function drawHalftonePattern(ctx, pattern, density, x, y, w, h) {
  const tile = document.createElement('canvas');
  tile.width  = density;
  tile.height = density;
  const tc = tile.getContext('2d');
  tc.fillStyle = '#000';
  if (pattern === 'dots') {
    tc.beginPath();
    tc.arc(density / 2, density / 2, density * 0.2, 0, Math.PI * 2);
    tc.fill();
  } else {
    const lw = Math.max(1, Math.round(density * 0.4));
    tc.fillRect(0, 0, density, lw);
  }
  const pat = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
}

function renderToCanvas(canvas) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  if (fieldPattern !== 'blank') {
    const fpx = +fieldSlider.value;
    drawHalftonePattern(ctx, fieldPattern, fpx, 0, 0, W, H);
  }

  for (const s of shapes) {
    if (!s.visible) continue;
    ctx.save();
    ctx.translate(s.cx, s.cy);
    ctx.rotate(s.ang * Math.PI / 180);

    ctx.beginPath();
    if (s.type === 'circle') {
      ctx.arc(0, 0, s.width / 2, 0, Math.PI * 2);
    } else if (s.type === 'square') {
      ctx.rect(-s.width / 2, -s.height / 2, s.width, s.height);
    } else {
      ctx.moveTo(0, -s.height / 2);
      ctx.lineTo(-s.width / 2, s.height / 2);
      ctx.lineTo(s.width / 2, s.height / 2);
      ctx.closePath();
    }
    ctx.clip();

    // white fill covers field pattern beneath, then shape pattern draws on top
    ctx.fillStyle = '#fff';
    ctx.fillRect(-s.width / 2, -s.height / 2, s.width, s.height);
    drawHalftonePattern(ctx, s.pattern, s.density, -s.width / 2, -s.height / 2, s.width, s.height);

    ctx.restore();
  }
}

document.getElementById('savePng').addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  renderToCanvas(canvas);

  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) d[i + 3] = 0;
  }
  ctx.putImageData(imgData, 0, 0);

  canvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'halftone.png';
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
});

document.getElementById('saveSvg').addEventListener('click', () => {
  const W = window.innerWidth;
  const H = window.innerHeight;

  function patDef(id, pattern, density, tx, ty) {
    const r  = (density * 0.2).toFixed(2);
    const lw = Math.max(1, Math.round(density * 0.4));
    const inner = pattern === 'dots'
      ? `<circle cx="${density / 2}" cy="${density / 2}" r="${r}" fill="#000"/>`
      : `<rect x="0" y="0" width="${density}" height="${lw}" fill="#000"/>`;
    const xform = (tx || ty) ? ` patternTransform="translate(${tx},${ty})"` : '';
    return `<pattern id="${id}" width="${density}" height="${density}" patternUnits="userSpaceOnUse"${xform}>${inner}</pattern>`;
  }

  let defs = '<defs>';
  let body = '';

  if (fieldPattern !== 'blank') {
    const fpx = +fieldSlider.value;
    defs += patDef('fp', fieldPattern, fpx, 0, 0);
    body += `<rect width="${W}" height="${H}" fill="url(#fp)"/>`;
  }

  shapes.forEach((s, i) => {
    if (!s.visible) return;
    defs += patDef(`sp${i}`, s.pattern, s.density, 0, 0);

    const t = `translate(${s.cx.toFixed(1)},${s.cy.toFixed(1)}) rotate(${s.ang.toFixed(2)})`;
    let el = '';
    if (s.type === 'circle') {
      el = `<circle cx="0" cy="0" r="${(s.width / 2).toFixed(1)}" fill="url(#sp${i})"/>`;
    } else if (s.type === 'square') {
      const hw = (s.width / 2).toFixed(1), hh = (s.height / 2).toFixed(1);
      el = `<rect x="-${hw}" y="-${hh}" width="${s.width.toFixed(1)}" height="${s.height.toFixed(1)}" fill="url(#sp${i})"/>`;
    } else {
      const hw = (s.width / 2).toFixed(1), hh = (s.height / 2).toFixed(1);
      el = `<polygon points="0,-${hh} -${hw},${hh} ${hw},${hh}" fill="url(#sp${i})"/>`;
    }
    body += `<g transform="${t}">${el}</g>`;
  });

  defs += '</defs>';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${defs}\n${body}\n</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'halftone.svg';
  a.click();
  URL.revokeObjectURL(a.href);
});

// ── Info modal ──
const infoModal = document.getElementById('infoModal');
document.getElementById('infoBtn').addEventListener('click',   () => infoModal.classList.add('open'));
document.getElementById('infoClose').addEventListener('click', () => infoModal.classList.remove('open'));
infoModal.addEventListener('click', e => { if (e.target === infoModal) infoModal.classList.remove('open'); });
