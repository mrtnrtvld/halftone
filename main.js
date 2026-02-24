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
  if (selected) {
    if (selected.exitEditMode) selected.exitEditMode();
    selected.wheel.classList.remove('selected');
  }
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
function createShape(type, initState = {}) {
  const n = shapes.length;   // capture before push
  const s = {
    cx:      initState.cx ?? (window.innerWidth  / 2 + n * 30),
    cy:      initState.cy ?? (window.innerHeight / 2 + n * 20),
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
    points:   initState.points ?? [],   // path-specific
    editMode: false,
    editSvg:  null,
    wheel:   null,
    propBox: null,
    listEl:  null,
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

  // ── Edit mode (path only) ──
  function enterEditMode() {
    s.editMode = true;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:5';
    wheel.append(svg);
    s.editSvg = svg;
    renderEditHandles();
  }

  function exitEditMode() {
    s.editMode = false;
    if (s.editSvg) { s.editSvg.remove(); s.editSvg = null; }
  }
  s.exitEditMode = exitEditMode;

  function renderEditHandles() {
    const svg = s.editSvg;
    if (!svg) return;
    svg.innerHTML = '';
    const ox = s.width / 2, oy = s.height / 2;

    // Lines (drawn behind handles)
    for (const pt of s.points) {
      if (Math.hypot(pt.cp1x - pt.x, pt.cp1y - pt.y) > 2)
        svgLine(svg, pt.x+ox, pt.y+oy, pt.cp1x+ox, pt.cp1y+oy);
      if (Math.hypot(pt.cp2x - pt.x, pt.cp2y - pt.y) > 2)
        svgLine(svg, pt.x+ox, pt.y+oy, pt.cp2x+ox, pt.cp2y+oy);
    }

    // Handle circles and anchor squares
    s.points.forEach((pt, idx) => {
      if (Math.hypot(pt.cp1x - pt.x, pt.cp1y - pt.y) > 2) {
        const c = svgEditHandle(pt.cp1x+ox, pt.cp1y+oy, 'circle');
        c.addEventListener('pointerdown', e => startEditDrag(e, idx, 'cp1'));
        svg.append(c);
      }
      if (Math.hypot(pt.cp2x - pt.x, pt.cp2y - pt.y) > 2) {
        const c = svgEditHandle(pt.cp2x+ox, pt.cp2y+oy, 'circle');
        c.addEventListener('pointerdown', e => startEditDrag(e, idx, 'cp2'));
        svg.append(c);
      }
      const sq = svgEditHandle(pt.x+ox, pt.y+oy, 'square');
      sq.addEventListener('pointerdown', e => startEditDrag(e, idx, 'anchor'));
      svg.append(sq);
    });
  }

  function svgLine(svg, x1, y1, x2, y2) {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', x1.toFixed(1)); l.setAttribute('y1', y1.toFixed(1));
    l.setAttribute('x2', x2.toFixed(1)); l.setAttribute('y2', y2.toFixed(1));
    l.setAttribute('stroke', '#888'); l.setAttribute('stroke-width', '1');
    svg.append(l);
  }

  function svgEditHandle(x, y, shape) {
    let el;
    if (shape === 'circle') {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', y.toFixed(1));
      el.setAttribute('r', '4');
    } else {
      el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('x', (x-4).toFixed(1)); el.setAttribute('y', (y-4).toFixed(1));
      el.setAttribute('width', '8'); el.setAttribute('height', '8');
    }
    el.setAttribute('fill', '#fff'); el.setAttribute('stroke', '#000');
    el.setAttribute('stroke-width', '1.5');
    el.style.cursor = 'move';
    el.style.pointerEvents = 'all';
    return el;
  }

  function startEditDrag(e, ptIdx, which) {
    e.stopPropagation(); e.preventDefault();
    const svg = s.editSvg;
    svg.setPointerCapture(e.pointerId);
    const pt    = s.points[ptIdx];
    const sx    = e.clientX, sy = e.clientY;
    const rad   = s.ang * Math.PI / 180;
    const orig  = { x: pt.x, y: pt.y, cp1x: pt.cp1x, cp1y: pt.cp1y, cp2x: pt.cp2x, cp2y: pt.cp2y };
    const c1ox  = pt.cp1x - pt.x, c1oy = pt.cp1y - pt.y;
    const c2ox  = pt.cp2x - pt.x, c2oy = pt.cp2y - pt.y;

    function onMove(me) {
      const dxS = me.clientX - sx, dyS = me.clientY - sy;
      // Rotate screen delta into wheel-local space
      const dlx =  dxS * Math.cos(rad) + dyS * Math.sin(rad);
      const dly = -dxS * Math.sin(rad) + dyS * Math.cos(rad);
      if (which === 'anchor') {
        pt.x = orig.x + dlx; pt.y = orig.y + dly;
        pt.cp1x = pt.x + c1ox; pt.cp1y = pt.y + c1oy;
        pt.cp2x = pt.x + c2ox; pt.cp2y = pt.y + c2oy;
      } else if (which === 'cp1') {
        pt.cp1x = orig.cp1x + dlx; pt.cp1y = orig.cp1y + dly;
        if (pt.smooth) { pt.cp2x = 2*pt.x - pt.cp1x; pt.cp2y = 2*pt.y - pt.cp1y; }
      } else {
        pt.cp2x = orig.cp2x + dlx; pt.cp2y = orig.cp2y + dly;
        if (pt.smooth) { pt.cp1x = 2*pt.x - pt.cp2x; pt.cp1y = 2*pt.y - pt.cp2y; }
      }
      applyTransform();
      renderEditHandles();
    }
    function onUp() {
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
    }
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
  }

  function deleteShape() {
    if (selected === s) selectShape(null);
    exitEditMode();
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

  // ── Path helpers ──
  function getPathBBox(pts) {
    if (!pts.length) return { minX: -110, minY: -110, maxX: 110, maxY: 110 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x, p.cp1x, p.cp2x);
      minY = Math.min(minY, p.y, p.cp1y, p.cp2y);
      maxX = Math.max(maxX, p.x, p.cp1x, p.cp2x);
      maxY = Math.max(maxY, p.y, p.cp1y, p.cp2y);
    }
    return { minX, minY, maxX, maxY };
  }

  function buildPathD(pts, ox, oy) {
    let d = `M ${(pts[0].x + ox).toFixed(1)} ${(pts[0].y + oy).toFixed(1)}`;
    for (let i = 0; i < pts.length; i++) {
      const c = pts[i], nx = pts[(i + 1) % pts.length];
      d += ` C ${(c.cp2x+ox).toFixed(1)} ${(c.cp2y+oy).toFixed(1)} ${(nx.cp1x+ox).toFixed(1)} ${(nx.cp1y+oy).toFixed(1)} ${(nx.x+ox).toFixed(1)} ${(nx.y+oy).toFixed(1)}`;
    }
    return d + ' Z';
  }

  function applyClipPath() {
    if (s.points.length < 3) { shapeEl.style.clipPath = 'none'; return; }
    shapeEl.style.clipPath = `path("${buildPathD(s.points, s.width/2, s.height/2)}")`;
  }

  function isInsidePath(lx, ly) {
    if (s.points.length < 3) return false;
    const tc = document.createElement('canvas').getContext('2d');
    const pts = s.points;
    tc.beginPath();
    tc.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length; i++) {
      const c = pts[i], nx = pts[(i + 1) % pts.length];
      tc.bezierCurveTo(c.cp2x, c.cp2y, nx.cp1x, nx.cp1y, nx.x, nx.y);
    }
    tc.closePath();
    return tc.isPointInPath(lx, ly);
  }

  function updatePropBoxPosition() {
    const rad  = s.ang * Math.PI / 180;
    const dist = s.height / 2 - 10;
    const kx   = s.cx + dist * Math.sin(rad);
    const ky   = s.cy - dist * Math.cos(rad);
    propBox.style.left = (kx + 14) + 'px';
    propBox.style.top  = (ky - 10) + 'px';
  }

  function applyTransform() {
    if (type === 'path' && s.points.length) {
      const bb  = getPathBBox(s.points);
      const pad = 50;
      s.width  = Math.max(80, bb.maxX - bb.minX + pad * 2);
      s.height = Math.max(80, bb.maxY - bb.minY + pad * 2);
      applyClipPath();
    }
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
    if (type === 'path') {
      const { lx, ly } = toLocal(e.clientX, e.clientY);
      shapeEl.style.cursor = isInsidePath(lx, ly) ? 'grab' : 'default';
      return;
    }
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
    if (s.editMode) return;   // edit handles take over in edit mode
    if (type === 'path') {
      const { lx, ly } = toLocal(e.clientX, e.clientY);
      if (!isInsidePath(lx, ly)) { selectShape(null); return; }
    }
    selectShape(s);
    if (type === 'path') {
      s.mode   = 'drag';
      s.dragOx = e.clientX - s.cx;
      s.dragOy = e.clientY - s.cy;
      shapeEl.setPointerCapture(e.pointerId);
      e.stopPropagation();
      e.preventDefault();
      return;
    }
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

  // ── Path: double-click toggles edit mode ──
  if (type === 'path') {
    shapeEl.addEventListener('dblclick', e => {
      if (s.editMode) exitEditMode(); else enterEditMode();
      e.stopPropagation();
    });
  }

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
  btn.addEventListener('click', () => {
    if (btn.dataset.shape === 'path') startPathBuild();
    else createShape(btn.dataset.shape);
  });
});

// ── Path building ──
let pathBuilder = null;

function startPathBuild() {
  if (pathBuilder) return;
  const pathBtn = document.getElementById('pathBtn');
  if (pathBtn) pathBtn.classList.add('active');

  const previewSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  previewSvg.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;width:100%;height:100%';
  document.body.append(previewSvg);

  pathBuilder = { pts: [], draggingPt: null, mouseX: 0, mouseY: 0, previewSvg };
  document.body.style.cursor = 'crosshair';

  document.addEventListener('pointerdown', onBuildDown,    true);
  document.addEventListener('pointermove', onBuildMove,    true);
  document.addEventListener('pointerup',   onBuildUp,      true);
  document.addEventListener('dblclick',    onBuildDblClick,true);
  document.addEventListener('keydown',     onBuildKey,     true);
}

function onBuildDown(e) {
  if (!pathBuilder) return;
  if (e.target.closest('.panel') || e.target.closest('.prop-box') || e.target.closest('.info-modal')) return;
  if (e.detail >= 2) return;   // second click of dblclick handled separately
  e.stopPropagation(); e.preventDefault();

  const { pts } = pathBuilder;
  // Click on first point closes path
  if (pts.length >= 3 && Math.hypot(e.clientX - pts[0].x, e.clientY - pts[0].y) < 12) {
    finishPath(); return;
  }
  const pt = { x: e.clientX, y: e.clientY,
               cp1x: e.clientX, cp1y: e.clientY,
               cp2x: e.clientX, cp2y: e.clientY, smooth: false };
  pts.push(pt);
  pathBuilder.draggingPt = pt;
  updateBuildPreview();
}

function onBuildMove(e) {
  if (!pathBuilder) return;
  pathBuilder.mouseX = e.clientX;
  pathBuilder.mouseY = e.clientY;
  const pt = pathBuilder.draggingPt;
  if (pt && Math.hypot(e.clientX - pt.x, e.clientY - pt.y) > 4) {
    pt.cp2x = e.clientX; pt.cp2y = e.clientY;
    pt.cp1x = 2*pt.x - pt.cp2x; pt.cp1y = 2*pt.y - pt.cp2y;
    pt.smooth = true;
  }
  updateBuildPreview();
}

function onBuildUp(e) {
  if (!pathBuilder) return;
  pathBuilder.draggingPt = null;
}

function onBuildDblClick(e) {
  if (!pathBuilder) return;
  if (e.target.closest('.panel') || e.target.closest('.prop-box')) return;
  e.stopPropagation(); e.preventDefault();
  if (pathBuilder.pts.length >= 3) finishPath(); else cleanupBuild();
}

function onBuildKey(e) {
  if (!pathBuilder) return;
  if (e.key === 'Enter' && pathBuilder.pts.length >= 3) {
    e.stopPropagation(); e.preventDefault(); finishPath();
  } else if (e.key === 'Escape') {
    e.stopPropagation(); e.preventDefault(); cleanupBuild();
  }
}

function updateBuildPreview() {
  const { previewSvg, pts, mouseX: mx, mouseY: my, draggingPt } = pathBuilder;
  previewSvg.innerHTML = '';
  if (!pts.length) return;

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const pv = pts[i-1], cu = pts[i];
    d += ` C ${pv.cp2x.toFixed(1)} ${pv.cp2y.toFixed(1)} ${cu.cp1x.toFixed(1)} ${cu.cp1y.toFixed(1)} ${cu.x.toFixed(1)} ${cu.y.toFixed(1)}`;
  }
  if (!draggingPt) {
    const last = pts[pts.length-1];
    d += ` C ${last.cp2x.toFixed(1)} ${last.cp2y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }

  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('d', d); pathEl.setAttribute('fill', 'none');
  pathEl.setAttribute('stroke', '#000'); pathEl.setAttribute('stroke-width', '1.5');
  pathEl.setAttribute('stroke-dasharray', '5 3');
  previewSvg.append(pathEl);

  pts.forEach((pt, i) => {
    if (pt.smooth) {
      buildPreviewLine(previewSvg, pt.x, pt.y, pt.cp1x, pt.cp1y);
      buildPreviewLine(previewSvg, pt.x, pt.y, pt.cp2x, pt.cp2y);
      buildPreviewDot(previewSvg, pt.cp1x, pt.cp1y);
      buildPreviewDot(previewSvg, pt.cp2x, pt.cp2y);
    }
    const isFirst = i === 0 && pts.length >= 3;
    const sq = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const hs = isFirst ? 6 : 4;
    sq.setAttribute('x', pt.x - hs); sq.setAttribute('y', pt.y - hs);
    sq.setAttribute('width', hs*2); sq.setAttribute('height', hs*2);
    sq.setAttribute('fill', '#fff'); sq.setAttribute('stroke', '#000');
    sq.setAttribute('stroke-width', isFirst ? '2' : '1.5');
    previewSvg.append(sq);
  });
}

function buildPreviewLine(svg, x1, y1, x2, y2) {
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l.setAttribute('x1', x1.toFixed(1)); l.setAttribute('y1', y1.toFixed(1));
  l.setAttribute('x2', x2.toFixed(1)); l.setAttribute('y2', y2.toFixed(1));
  l.setAttribute('stroke', '#888'); l.setAttribute('stroke-width', '1');
  svg.append(l);
}

function buildPreviewDot(svg, cx, cy) {
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', cx.toFixed(1)); c.setAttribute('cy', cy.toFixed(1));
  c.setAttribute('r', '3.5'); c.setAttribute('fill', '#fff');
  c.setAttribute('stroke', '#000'); c.setAttribute('stroke-width', '1.5');
  svg.append(c);
}

function finishPath() {
  const { pts } = pathBuilder;
  if (pts.length < 3) { cleanupBuild(); return; }
  cleanupBuild();
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const localPts = pts.map(p => ({
    x: p.x - cx, y: p.y - cy,
    cp1x: p.cp1x - cx, cp1y: p.cp1y - cy,
    cp2x: p.cp2x - cx, cp2y: p.cp2y - cy,
    smooth: p.smooth,
  }));
  createShape('path', { cx, cy, points: localPts });
}

function cleanupBuild() {
  if (!pathBuilder) return;
  pathBuilder.previewSvg.remove();
  document.removeEventListener('pointerdown', onBuildDown,    true);
  document.removeEventListener('pointermove', onBuildMove,    true);
  document.removeEventListener('pointerup',   onBuildUp,      true);
  document.removeEventListener('dblclick',    onBuildDblClick,true);
  document.removeEventListener('keydown',     onBuildKey,     true);
  document.body.style.cursor = '';
  const pathBtn = document.getElementById('pathBtn');
  if (pathBtn) pathBtn.classList.remove('active');
  pathBuilder = null;
}

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
    } else if (s.type === 'path') {
      if (s.points.length < 3) { ctx.restore(); continue; }
      const pathPts = s.points;
      ctx.moveTo(pathPts[0].x, pathPts[0].y);
      for (let pi = 0; pi < pathPts.length; pi++) {
        const c = pathPts[pi], nx = pathPts[(pi + 1) % pathPts.length];
        ctx.bezierCurveTo(c.cp2x, c.cp2y, nx.cp1x, nx.cp1y, nx.x, nx.y);
      }
      ctx.closePath();
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
    } else if (s.type === 'path') {
      if (s.points.length < 3) return;
      const svgPts = s.points;
      let d = `M ${svgPts[0].x.toFixed(1)},${svgPts[0].y.toFixed(1)}`;
      for (let pi = 0; pi < svgPts.length; pi++) {
        const c = svgPts[pi], nx = svgPts[(pi + 1) % svgPts.length];
        d += ` C ${c.cp2x.toFixed(1)},${c.cp2y.toFixed(1)} ${nx.cp1x.toFixed(1)},${nx.cp1y.toFixed(1)} ${nx.x.toFixed(1)},${nx.y.toFixed(1)}`;
      }
      d += ' Z';
      if (bg !== 'none') bgEl = `<path d="${d}" fill="${bg}"/>`;
      el = `<path d="${d}" fill="url(#sp${i})"/>`;
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

  if (e.key === 'Escape' && selected.editMode) {
    selected.exitEditMode();
    e.preventDefault();
    return;
  }

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
