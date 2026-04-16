import { S } from './state.js';
import { sr } from './utils.js';
import { NAVS } from './constants.js';

const MAS_SECTIONS = ['quin', 'objetivos', 'inve', 'stat'];

export function go(id) {
  if (id === 'fijo') { go('gast'); return; }
  if (id === 'hist') { go('stat'); window.setResumenTab?.('historial'); return; }

  closeMas();

  NAVS.forEach(n => {
    const s = document.getElementById('sec-' + n);
    if (s) s.classList.toggle('active', n === id);
  });

  document.querySelectorAll('.nb[data-section]').forEach(b => {
    const isActive = b.dataset.section === id;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  const btnMas = document.getElementById('btn-mas');
  if (btnMas) {
    const enMas = MAS_SECTIONS.includes(id);
    btnMas.classList.toggle('active', enMas);
    btnMas.setAttribute('aria-current', enMas ? 'page' : 'false');
  }

  document.querySelectorAll('.mas-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset.section === id);
  });

  if (id === 'agen') window.renderCal?.();
  if (id === 'stat') window.setResumenTab?.('analisis');
  if (id === 'gast') window.updSaldo?.();
  sr(`Sección ${id}`);
}

export function toggleMas() {
  const panel   = document.getElementById('mas-panel');
  const overlay = document.getElementById('mas-overlay');
  const btn     = document.getElementById('btn-mas');
  if (!panel || !overlay) return;
  const abierto = panel.classList.contains('open');
  panel.classList.toggle('open', !abierto);
  overlay.classList.toggle('open', !abierto);
  if (btn) btn.setAttribute('aria-expanded', String(!abierto));
}

export function closeMas() {
  const panel   = document.getElementById('mas-panel');
  const overlay = document.getElementById('mas-overlay');
  const btn     = document.getElementById('btn-mas');
  if (!panel) return;
  panel.classList.remove('open');
  overlay?.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

export function setPer(tipo, el) {
  S.tipoPeriodo = tipo;
  document.querySelectorAll('.qtab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
  });
  el.classList.add('active');
  el.setAttribute('aria-selected', 'true');
  el.setAttribute('tabindex', '0');
  window.renderDeudas?.();
  window.updateDash?.();
}

export function setResumenTab(tab) {
  const analisis  = document.getElementById('resumen-tab-analisis');
  const historial = document.getElementById('resumen-tab-historial');
  if (!analisis || !historial) return;

  document.querySelectorAll('.resumen-tab').forEach(t => {
    const isActive = t.getAttribute('data-tab') === tab;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  analisis.style.display  = tab === 'analisis'  ? 'block' : 'none';
  historial.style.display = tab === 'historial' ? 'block' : 'none';

  if (tab === 'analisis')  window.renderStats?.();
  if (tab === 'historial') window.renderHistorial?.();
}

export function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ex = sb.classList.toggle('expanded');
  document.body.classList.toggle('sb-expanded', ex);
  localStorage.setItem('sb_expanded', ex);
  const btn = document.getElementById('btn-sidebar-toggle');
  if (btn) btn.setAttribute('aria-expanded', ex);
}

// ─── EXPOSICIÓN GLOBAL ───────────────────────────────────────────────────────
window.go             = go;
window.toggleMas      = toggleMas;
window.closeMas       = closeMas;
window.setPer         = setPer;
window.setResumenTab  = setResumenTab;
window.toggleSidebar  = toggleSidebar;