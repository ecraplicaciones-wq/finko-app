import { S } from './state.js';
import { f, mesStr, setEl } from './utils.js';

// ─── SALDO TOTAL ─────────────────────────────────────────────────────────────
export function totalCuentas() {
  return (S.cuentas || []).reduce((s, c) => s + c.saldo, 0);
}

export function updSaldo() {
  if (S.cuentas && S.cuentas.length > 0) {
    S.saldos.banco = totalCuentas();
  }
  const ef  = S.saldos.efectivo;
  const bk  = S.saldos.banco;
  const tot = ef + bk;

  ['d-ef', 'g-ef', 'q-efc'].forEach(id => setEl(id, f(ef)));
  ['d-bk', 'g-bk', 'q-bkc'].forEach(id => setEl(id, f(bk)));
  setEl('d-tot', f(tot));

  // Actualiza preview de quincena si la sección está activa
  if (typeof window.actualizarListasFondos === 'function') {
    window.actualizarListasFondos();
  }
  if (typeof window.calcDist === 'function' &&
      document.getElementById('sec-quin')?.classList.contains('active')) {
    window.calcDist();
  }
}

// ─── BADGE DE PERÍODO ────────────────────────────────────────────────────────
export function updateBadge() {
  const n   = new Date();
  const txt = `${n.getDate() <= 15 ? '1ra' : '2da'} quincena · ${n.toLocaleString('es-CO', { month: 'short' })} ${n.getFullYear()}`;
  setEl('hbadge', txt);
}

// ─── RENDER SELECTIVO ────────────────────────────────────────────────────────
let _renderTimer = null;

/**
 * Renderiza solo las secciones indicadas.
 * El dashboard y saldos siempre se actualizan.
 * @param {string[]} sections - Claves: 'gastos','objetivos','inversiones','deudas','fijos','pagos','historial','stats'
 */
export function renderSmart(sections = []) {
  if (_renderTimer) cancelAnimationFrame(_renderTimer);
  _renderTimer = requestAnimationFrame(() => {
    updSaldo();
    if (typeof window.renderCuentas      === 'function') window.renderCuentas();
    if (typeof window.renderDashCuentas  === 'function') window.renderDashCuentas();
    if (typeof window.actualizarVistaFondo === 'function') window.actualizarVistaFondo();
    if (typeof window.updateDash         === 'function') window.updateDash();

    if (sections.includes('gastos'))      window.renderGastos?.();
    if (sections.includes('objetivos'))   window.renderObjetivos?.();
    if (sections.includes('inversiones')) window.renderInversiones?.();
    if (sections.includes('deudas'))      window.renderDeudas?.();
    if (sections.includes('fijos'))       window.renderFijos?.();
    if (sections.includes('pagos'))       window.renderPagos?.();
    if (sections.includes('historial'))   window.renderHistorial?.();
    if (sections.includes('stats'))       window.renderStats?.();
  });
}

/**
 * Renderiza todo. Solo para arranque inicial, imports y resets.
 */
export function renderAll() {
  renderSmart(['gastos', 'objetivos', 'inversiones', 'deudas', 'fijos', 'pagos', 'historial', 'stats']);
}

// ─── EXPOSICIÓN GLOBAL ───────────────────────────────────────────────────────
window.renderSmart = renderSmart;
window.renderAll   = renderAll;
window.updSaldo    = updSaldo;
window.totalCuentas = totalCuentas;
window.updateBadge = updateBadge;