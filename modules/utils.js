// ─── FORMATO Y FECHAS ─────────────────────────────────────────────────────────
export function f(n) {
  return '$' + Math.round(n || 0).toLocaleString('es-CO');
}

export function hoy() {
  return new Date().toISOString().split('T')[0];
}

export function mesStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export function he(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── DOM HELPERS ─────────────────────────────────────────────────────────────
export function setEl(id, v) {
  const e = document.getElementById(id);
  if (e) e.textContent = v;
}

export function setHtml(id, v) {
  const e = document.getElementById(id);
  if (e) e.innerHTML = v;
}

export function sr(msg) {
  const el = document.getElementById('sr-announcer');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

// ─── MODALES ─────────────────────────────────────────────────────────────────
let _lastFocused = null;

export function openM(id) {
  _lastFocused = document.activeElement;
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  requestAnimationFrame(() => {
    const focusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
  });
}

export function closeM(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  if (_lastFocused && typeof _lastFocused.focus === 'function') {
    _lastFocused.focus();
    _lastFocused = null;
  }
}

// ─── DIÁLOGOS ASÍNCRONOS ─────────────────────────────────────────────────────
let _cdlgResolve = null;
let _cdlgPromptMode = false;
let _cdlgExpected = null;

// Expuesto en window porque el HTML llama a _cdlgRes(true/false) inline
window._cdlgRes = function (ok) {
  if (_cdlgPromptMode && _cdlgExpected && ok) {
    const v = document.getElementById('cdlg-input').value;
    if (v !== _cdlgExpected) {
      document.getElementById('cdlg-input').style.border = '1px solid var(--dan)';
      return;
    }
  }
  document.getElementById('cdlg-ov').classList.remove('open');
  document.getElementById('cdlg-cancel').style.display = '';
  document.getElementById('cdlg-input').style.border = '';
  if (_cdlgPromptMode) {
    const v = document.getElementById('cdlg-input').value;
    if (_cdlgResolve) _cdlgResolve(ok ? v : null);
  } else {
    if (_cdlgResolve) _cdlgResolve(ok);
  }
  _cdlgResolve = null;
};

export function showConfirm(msg, title = 'Confirmar') {
  return new Promise(r => {
    _cdlgResolve = r; _cdlgPromptMode = false;
    setEl('cdlg-title', title); setEl('cdlg-msg', msg);
    document.getElementById('cdlg-input-wrap').style.display = 'none';
    document.getElementById('cdlg-cancel').style.display = '';
    document.getElementById('cdlg-ov').classList.add('open');
  });
}

export function showAlert(msg, title = 'Aviso') {
  return new Promise(r => {
    _cdlgResolve = r; _cdlgPromptMode = false;
    setEl('cdlg-title', title); setEl('cdlg-msg', msg);
    document.getElementById('cdlg-input-wrap').style.display = 'none';
    document.getElementById('cdlg-cancel').style.display = 'none';
    document.getElementById('cdlg-ov').classList.add('open');
  });
}

export function showPromptConfirm(msg, exp, title = 'Peligro') {
  return new Promise(r => {
    _cdlgResolve = r; _cdlgPromptMode = true; _cdlgExpected = exp;
    setEl('cdlg-title', title); setEl('cdlg-msg', msg);
    document.getElementById('cdlg-input-wrap').style.display = 'block';
    document.getElementById('cdlg-cancel').style.display = '';
    document.getElementById('cdlg-ov').classList.add('open');
  });
}

export function showPrompt(msg, title = 'Editar', valorInicial = '') {
  return new Promise(r => {
    _cdlgResolve = r; _cdlgPromptMode = true; _cdlgExpected = null;
    setEl('cdlg-title', title); setEl('cdlg-msg', msg);
    const inp = document.getElementById('cdlg-input');
    inp.value = valorInicial; inp.placeholder = '';
    document.getElementById('cdlg-input-wrap').style.display = 'block';
    document.getElementById('cdlg-cancel').style.display = '';
    document.getElementById('cdlg-ov').classList.add('open');
    setTimeout(() => inp.focus(), 80);
  });
}

// ─── EXPOSICIÓN GLOBAL (compatibilidad con onclick en HTML) ──────────────────
window.openM  = openM;
window.closeM = closeM;
window.showConfirm       = showConfirm;
window.showAlert         = showAlert;
window.showPromptConfirm = showPromptConfirm;
window.showPrompt        = showPrompt;