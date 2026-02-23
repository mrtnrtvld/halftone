// ── Field ──
const field            = document.getElementById('field');
const fieldSizeSlider  = document.getElementById('fieldSizeSlider');
const fieldSizeVal     = document.getElementById('fieldSizeVal');
const fieldGapSlider   = document.getElementById('fieldGapSlider');
const fieldGapVal      = document.getElementById('fieldGapVal');

let fieldPattern = 'dots';

function applyFieldPattern() {
  const size    = +fieldSizeSlider.value;
  const spacing = +fieldGapSlider.value;
  if (fieldPattern === 'blank') {
    field.style.backgroundImage = 'none';
    field.style.backgroundSize  = 'auto';
  } else if (fieldPattern === 'dots') {
    field.style.backgroundImage = `radial-gradient(circle ${size / 2}px at center, #000 99%, transparent 100%)`;
    field.style.backgroundSize  = `${spacing}px ${spacing}px`;
  } else {
    field.style.backgroundImage = `repeating-linear-gradient(0deg, #000 0px, #000 ${size}px, transparent ${size}px, transparent ${spacing}px)`;
    field.style.backgroundSize  = 'auto';
  }
}

fieldSizeSlider.addEventListener('input', e => {
  fieldSizeVal.textContent = e.target.value;
  applyFieldPattern();
});
fieldGapSlider.addEventListener('input', e => {
  fieldGapVal.textContent = e.target.value;
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
let selected     = null;

function selectShape(sh) {
  if (selected) selected.wheel.classList.remove('selected');
  selected = sh;
  if (selected) selected.wheel.classList.add('selected');
}

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
    dotSize:    4,
    spacing:    8,
    mode:       null,
    dragOx:     0,
    dragOy:     0,
    type,
    pattern: 'dots',
    solidBg:  false,
    inverted: false,
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

  const propClose  = document.createElement('button');
  propClose.className   = 'prop-close';
  propClose.textContent = '×';
  propClose.addEventListener('click', () => propBox.classList.remove('open'));

  const propTitle  = document.createElement('div');
  propTitle.className   = 'prop-label';
  propTitle.textContent = 'Halftone';

  const propHeader = document.createElement('div');
  propHeader.className = 'prop-header';
  propHeader.append(propTitle, propClose);

  // Size row
  const propSizeSpan   = document.createElement('span');
  propSizeSpan.textContent = s.dotSize;
  const propSizeLabel  = document.createElement('div');
  propSizeLabel.className = 'prop-label';
  propSizeLabel.append('Size\u00a0', propSizeSpan);
  const propSizeSlider = document.createElement('input');
  propSizeSlider.type  = 'range';
  propSizeSlider.min   = '1';
  propSizeSlider.max   = '20';
  propSizeSlider.value = String(s.dotSize);
  propSizeSlider.step  = '1';
  const propSizeRow    = document.createElement('div');
  propSizeRow.className = 'prop-slider-row';
  propSizeRow.append(propSizeLabel, propSizeSlider);

  // Gap row
  const propGapSpan   = document.createElement('span');
  propGapSpan.textContent = s.spacing;
  const propGapLabel  = document.createElement('div');
  propGapLabel.className = 'prop-label';
  propGapLabel.append('Gap\u00a0', propGapSpan);
  const propGapSlider = document.createElement('input');
  propGapSlider.type  = 'range';
  propGapSlider.min   = '2';
  propGapSlider.max   = '40';
  propGapSlider.value = String(s.spacing);
  propGapSlider.step  = '1';
  const propGapRow    = document.createElement('div');
  propGapRow.className = 'prop-slider-row';
  propGapRow.append(propGapLabel, propGapSlider);

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

  // BG and invert toggles
  const propToggleRow = document.createElement('div');
  propToggleRow.className = 'prop-toggle-row';

  const bgBtn = document.createElement('button');
  bgBtn.className   = 'prop-toggle';
  bgBtn.textContent = '■';
  bgBtn.title       = 'Solid background';

  const invBtn = document.createElement('button');
  invBtn.className   = 'prop-toggle';
  invBtn.textContent = '◑';
  invBtn.title       = 'Invert colours';

  bgBtn.addEventListener('click', () => {
    s.solidBg = !s.solidBg;
    bgBtn.classList.toggle('active', s.solidBg);
    applyShapePattern();
  });

  invBtn.addEventListener('click', () => {
    s.inverted = !s.inverted;
    invBtn.classList.toggle('active', s.inverted);
    applyShapePattern();
  });

  propToggleRow.append(bgBtn, invBtn);
  propBox.append(propHeader, propSizeRow, propGapRow, propPatternBtns, propToggleRow);
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

  function deleteShape() {
    if (selected === s) selectShape(null);
    wheel.remove();
    propBox.remove();
    s.listEl.remove();
    const idx = shapes.indexOf(s);
    if (idx !== -1) shapes.splice(idx, 1);
    updateZIndices();
  }

  const delBtn = document.createElement('button');
  delBtn.className   = 'layer-btn';
  delBtn.textContent = '×';
  delBtn.title       = 'Delete';
  delBtn.addEventListener('click', deleteShape);

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
    const size    = s.dotSize;
    const spacing = s.spacing;
    const ink = s.inverted ? '#fff' : '#000';
    const bg  = !s.solidBg ? 'transparent' : (s.inverted ? '#000' : '#fff');

    shapeEl.style.backgroundColor = bg;

    if (s.pattern === 'dots') {
      const offset = (spacing / 2).toFixed(1);
      shapeEl.style.backgroundImage    = `radial-gradient(circle ${size / 2}px at center, ${ink} 99%, transparent 100%)`;
      shapeEl.style.backgroundSize     = `${spacing}px ${spacing}px`;
      shapeEl.style.backgroundPosition = `${offset}px ${offset}px`;
    } else {
      shapeEl.style.backgroundImage    = `repeating-linear-gradient(0deg, ${ink} 0px, ${ink} ${size}px, transparent ${size}px, transparent ${spacing}px)`;
      shapeEl.style.backgroundSize     = 'auto';
      shapeEl.style.backgroundPosition = '0 0';
    }
  }

  propSizeSlider.addEventListener('input', e => {
    s.dotSize = +e.target.value;
    propSizeSpan.textContent = s.dotSize;
    applyShapePattern();
  });
  propGapSlider.addEventListener('input', e => {
    s.spacing = +e.target.value;
    propGapSpan.textContent = s.spacing;
    applyShapePattern();
  });
  applyShapePattern();

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

  // Expose on s for keyboard handler
  s.applyTransform = applyTransform;
  s.deleteShape    = deleteShape;

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
    selectShape(s);
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
    selectShape(s);
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

function drawHalftonePattern(ctx, pattern, dotSize, spacing, ink, x, y, w, h) {
  const tile = document.createElement('canvas');
  tile.width  = spacing;
  tile.height = spacing;
  const tc = tile.getContext('2d');
  tc.fillStyle = ink;
  if (pattern === 'dots') {
    tc.beginPath();
    tc.arc(spacing / 2, spacing / 2, dotSize / 2, 0, Math.PI * 2);
    tc.fill();
  } else {
    tc.fillRect(0, 0, spacing, dotSize);
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
    const fSize = +fieldSizeSlider.value;
    const fGap  = +fieldGapSlider.value;
    drawHalftonePattern(ctx, fieldPattern, fSize, fGap, '#000', 0, 0, W, H);
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

    const ink = s.inverted ? '#fff' : '#000';
    const bg  = !s.solidBg ? '#fff' : (s.inverted ? '#000' : '#fff');
    ctx.fillStyle = bg;
    ctx.fillRect(-s.width / 2, -s.height / 2, s.width, s.height);
    drawHalftonePattern(ctx, s.pattern, s.dotSize, s.spacing, ink, -s.width / 2, -s.height / 2, s.width, s.height);

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

  function patDef(id, pattern, dotSize, spacing, ink, tx, ty) {
    const r     = (dotSize / 2).toFixed(2);
    const inner = pattern === 'dots'
      ? `<circle cx="${spacing / 2}" cy="${spacing / 2}" r="${r}" fill="${ink}"/>`
      : `<rect x="0" y="0" width="${spacing}" height="${dotSize}" fill="${ink}"/>`;
    const xform = (tx || ty) ? ` patternTransform="translate(${tx},${ty})"` : '';
    return `<pattern id="${id}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${xform}>${inner}</pattern>`;
  }

  let defs = '<defs>';
  let body = '';

  if (fieldPattern !== 'blank') {
    const fSize = +fieldSizeSlider.value;
    const fGap  = +fieldGapSlider.value;
    defs += patDef('fp', fieldPattern, fSize, fGap, '#000', 0, 0);
    body += `<rect width="${W}" height="${H}" fill="url(#fp)"/>`;
  }

  shapes.forEach((s, i) => {
    if (!s.visible) return;
    const ink = s.inverted ? '#fff' : '#000';
    defs += patDef(`sp${i}`, s.pattern, s.dotSize, s.spacing, ink, 0, 0);

    const t  = `translate(${s.cx.toFixed(1)},${s.cy.toFixed(1)}) rotate(${s.ang.toFixed(2)})`;
    const bg = s.solidBg ? (s.inverted ? '#000' : '#fff') : 'none';
    const hw = (s.width  / 2).toFixed(1);
    const hh = (s.height / 2).toFixed(1);
    let bgEl = '', el = '';
    if (s.type === 'circle') {
      if (bg !== 'none') bgEl = `<circle cx="0" cy="0" r="${hw}" fill="${bg}"/>`;
      el = `<circle cx="0" cy="0" r="${hw}" fill="url(#sp${i})"/>`;
    } else if (s.type === 'square') {
      if (bg !== 'none') bgEl = `<rect x="-${hw}" y="-${hh}" width="${s.width.toFixed(1)}" height="${s.height.toFixed(1)}" fill="${bg}"/>`;
      el = `<rect x="-${hw}" y="-${hh}" width="${s.width.toFixed(1)}" height="${s.height.toFixed(1)}" fill="url(#sp${i})"/>`;
    } else {
      const pts = `0,-${hh} -${hw},${hh} ${hw},${hh}`;
      if (bg !== 'none') bgEl = `<polygon points="${pts}" fill="${bg}"/>`;
      el = `<polygon points="${pts}" fill="url(#sp${i})"/>`;
    }
    body += `<g transform="${t}">${bgEl}${el}</g>`;
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

// ── Deselect on canvas click ──
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.wheel') && !e.target.closest('.prop-box') && !e.target.closest('.panel')) {
    selectShape(null);
  }
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (!selected) return;

  if (e.key === 'Delete' || e.key === 'Backspace') {
    selected.deleteShape();
    e.preventDefault();
    return;
  }

  const step = e.shiftKey ? 10 : 1;
  if (e.key === 'ArrowLeft')  { selected.cx -= step; selected.applyTransform(); e.preventDefault(); }
  if (e.key === 'ArrowRight') { selected.cx += step; selected.applyTransform(); e.preventDefault(); }
  if (e.key === 'ArrowUp')    { selected.cy -= step; selected.applyTransform(); e.preventDefault(); }
  if (e.key === 'ArrowDown')  { selected.cy += step; selected.applyTransform(); e.preventDefault(); }
});

// ── Info modal ──
const infoModal = document.getElementById('infoModal');
document.getElementById('infoBtn').addEventListener('click',   () => infoModal.classList.add('open'));
document.getElementById('infoClose').addEventListener('click', () => infoModal.classList.remove('open'));
infoModal.addEventListener('click', e => { if (e.target === infoModal) infoModal.classList.remove('open'); });
