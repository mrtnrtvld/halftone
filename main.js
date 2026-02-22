const field        = document.getElementById('field');
const wheel        = document.getElementById('wheel');
const circle       = document.getElementById('circle');
const handle       = document.getElementById('handle');
const consoleEl    = document.getElementById('console');
const fieldSlider  = document.getElementById('fieldSlider');
const circleSlider = document.getElementById('circleSlider');
const fieldVal     = document.getElementById('fieldVal');
const circleVal    = document.getElementById('circleVal');

// ── Pattern update ──
function setFieldDensity(px) {
  field.style.backgroundSize = `${px}px ${px}px`;
  fieldVal.textContent = px;
}

function setCircleDensity(px) {
  const offset = (px / 2).toFixed(1);
  circle.style.backgroundSize     = `${px}px ${px}px`;
  circle.style.backgroundPosition = `${offset}px ${offset}px`;
  circleVal.textContent = px;
}

fieldSlider.addEventListener('input',  e => setFieldDensity(+e.target.value));
circleSlider.addEventListener('input', e => setCircleDensity(+e.target.value));

// ── Drag & rotate state ──
let cx  = window.innerWidth  / 2;
let cy  = window.innerHeight / 2;
let ang = 0;
let mode = null;
let dragOx = 0, dragOy = 0;

function applyTransform() {
  wheel.style.left      = cx + 'px';
  wheel.style.top       = cy + 'px';
  wheel.style.transform = `translate(-50%, -50%) rotate(${ang}deg)`;
}
applyTransform();

circle.addEventListener('pointerdown', e => {
  mode   = 'drag';
  dragOx = e.clientX - cx;
  dragOy = e.clientY - cy;
  circle.setPointerCapture(e.pointerId);
  e.stopPropagation();
  e.preventDefault();
});

handle.addEventListener('pointerdown', e => {
  mode = 'rotate';
  handle.setPointerCapture(e.pointerId);
  e.stopPropagation();
  e.preventDefault();
});

// Block console clicks from reaching the page
consoleEl.addEventListener('pointerdown', e => e.stopPropagation());

window.addEventListener('pointermove', e => {
  if (mode === 'drag') {
    cx = e.clientX - dragOx;
    cy = e.clientY - dragOy;
    applyTransform();
  } else if (mode === 'rotate') {
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    ang = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    applyTransform();
  }
});

window.addEventListener('pointerup', () => { mode = null; });
