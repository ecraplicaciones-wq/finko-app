import { S }        from './state.js';
import { save }     from './storage.js';
import { f, he, hoy, mesStr, setEl, setHtml, openM, closeM, showAlert, showConfirm } from './utils.js';
import { CATS, GMF_TASA, GMF_EXENTO_MONTO, GMF_EXENTO_UVT } from './constants.js';
import { renderSmart, updSaldo } from './render.js';

let _filtroGasto = '';

// ─── SEMÁFORO DE PRESUPUESTO ──────────────────────────────────────────────────
export function actualizarSemaforo() {
  const mInput  = document.getElementById('g-mo');
  const tInput  = document.getElementById('g-ti');
  const infoEl  = document.getElementById('g-semaforo');
  if (!mInput || !tInput || !infoEl) return;

  const monto = +mInput.value || 0;
  const tipo  = tInput.value;
  if (monto <= 0 || S.ingreso <= 0) { infoEl.style.display = 'none'; return; }

  const p = _getPct();
  let limite = 0, etiqueta = '';

  if (tipo === 'necesidad')      { limite = S.ingreso * (p.n / 100); etiqueta = 'gastos del mes'; }
  else if (tipo === 'ahorro')    { limite = S.ingreso * (p.a / 100); etiqueta = 'lo que querías ahorrar'; }
  else                           { limite = S.ingreso * (p.d / 100); etiqueta = 'antojos y gustos'; }

  const yaGastado = (tipo === 'hormiga')
    ? S.gastos.filter(g => g.tipo === 'deseo' || g.tipo === 'hormiga' || g.hormiga).reduce((s, g) => s + (g.montoTotal || g.monto), 0)
    : S.gastos.filter(g => g.tipo === tipo).reduce((s, g) => s + (g.montoTotal || g.monto), 0);

  const disponible = (limite - yaGastado) - monto;
  infoEl.style.display = 'block';

  if (disponible < 0) {
    infoEl.style.cssText += '; background:rgba(255,68,68,.1); color:var(--dan); border:1px solid rgba(255,68,68,.3);';
    infoEl.innerHTML = `🚨 ¡Ojo! Este gasto se pasa de tu cupo de ${etiqueta} por ${f(Math.abs(disponible))}. Toca revisar.`;
  } else if (disponible <= 100_000) {
    infoEl.style.cssText += '; background:rgba(255,214,10,.1); color:var(--a2); border:1px solid rgba(255,214,10,.3);';
    infoEl.innerHTML = `⚠️ Vas bien, pero después de esto solo te quedarían ${f(disponible)} para ${etiqueta}.`;
  } else {
    infoEl.style.cssText += '; background:rgba(0,220,130,.1); color:var(--a1); border:1px solid rgba(0,220,130,.3);';
    infoEl.innerHTML = `✅ Todo bien. Después de este gasto aún tienes ${f(disponible)} disponibles para ${etiqueta}.`;
  }
}

// ─── IMPACTO HORMIGA ─────────────────────────────────────────────────────────
export function calcularImpactoHormiga() {
  const ti    = document.getElementById('g-ti')?.value;
  const mo    = +document.getElementById('g-mo')?.value || 0;
  const infoEl = document.getElementById('g-hormiga-impact');
  if (!infoEl) return;
  if (ti !== 'hormiga' || mo <= 0) { infoEl.style.display = 'none'; return; }

  const anual = mo * 365;
  let msg = `🐜 <strong>Impacto real:</strong> Si repites este gasto a diario, en un año habrás perdido <strong>${f(anual)}</strong>.`;

  if (S.objetivos && S.objetivos.length > 0) {
    const metaGrande = S.objetivos.reduce((mayor, o) =>
      (o.objetivoAhorro || 0) > (mayor.objetivoAhorro || 0) ? o : mayor, S.objetivos[0]);
    if (metaGrande && metaGrande.objetivoAhorro > 0) {
      const veces = anual / metaGrande.objetivoAhorro;
      if (veces >= 1) {
        const vr = Math.floor(veces * 10) / 10;
        msg += `<br><br>Con esa plata podrías lograr tu meta <em>"${he(metaGrande.nombre)}"</em> <strong>${vr >= 2 ? Math.floor(veces) + ' veces' : 'completa'}</strong>${vr >= 2 ? ' seguidas' : ''}.`;
      } else {
        const pct = Math.round(veces * 100);
        const mesesParaMeta = Math.ceil(metaGrande.objetivoAhorro / (mo * 30));
        msg += `<br><br>Eso es el <strong>${pct}%</strong> de tu meta <em>"${he(metaGrande.nombre)}"</em>. Guardando esa plata en vez de gastarla, en <strong>${mesesParaMeta} meses</strong> la tendrías lista.`;
      }
    }
  } else {
    const smmlv = 1_750_905;
    if (anual >= smmlv) {
      const salarios = (anual / smmlv).toFixed(1);
      msg += `<br><br>Eso equivale a <strong>${salarios} salario${salarios > 1 ? 's' : ''} mínimo${salarios > 1 ? 's' : ''}</strong> al año.`;
    }
  }

  infoEl.innerHTML = msg;
  infoEl.style.display = 'block';
}

// ─── 4×1000 PREVIEW ──────────────────────────────────────────────────────────
export function prev4k() {
  const mo  = +document.getElementById('g-mo')?.value || 0;
  const ck  = document.getElementById('g-4k')?.checked;
  const el  = document.getElementById('p4k');
  if (!el) return;
  if (ck && mo > 0) {
    el.style.display = 'block';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <span style="font-weight:700; color:var(--t1);">Impuesto 4x1000 (GMF): +${f(mo * GMF_TASA)}</span> 
      ➔ Total a debitar: <span style="color:var(--a3); font-weight:800;">${f(mo * 1.004)}</span>
      <br>
      <span style="font-size:0.85rem; color:var(--t3); display:block; margin-top:0.5rem;">
        💡 <strong>Tip Legal:</strong> Puedes marcar <strong>una cuenta</strong> como exenta del GMF. Los primeros ${f(GMF_EXENTO_MONTO)}/mes (${GMF_EXENTO_UVT} UVT) no pagan el impuesto (Art. 879 E.T.).
      </span>`;
  } else {
    el.style.display = 'none';
    el.removeAttribute('role');
    el.innerHTML = '';
  }
}

// ─── AGREGAR GASTO ────────────────────────────────────────────────────────────
export async function agregarGasto() {
  const de = document.getElementById('g-de').value.trim();
  const mo = +document.getElementById('g-mo').value;
  const ca = document.getElementById('g-ca').value;
  if (!de || !mo || !ca) { await showAlert('Falta el nombre del gasto, la plata o la categoría.', 'Faltan datos'); return; }

  const fx         = document.getElementById('g-4k').checked;
  const montoTotal = fx ? Math.round(mo * (1 + GMF_TASA)) : mo;
  const fo         = document.getElementById('g-fo').value;
  const ti         = document.getElementById('g-ti').value;

  if (ti !== 'ahorro') {
    let disp = 0;
    if (fo === 'efectivo') {
      disp = S.saldos.efectivo;
    } else if (fo.startsWith('cuenta_')) {
      const cuenta = S.cuentas.find(x => x.id === +fo.split('_')[1]);
      if (!cuenta) { await showAlert('La cuenta seleccionada ya no existe.', 'Cuenta no encontrada'); return; }
      disp = cuenta.saldo;
    } else {
      disp = S.saldos.banco;
    }
    if (disp < montoTotal) {
      const ok = await showConfirm(`⚠️ Saldo insuficiente (${f(disp)} disponible).\n\n¿Continuar de todas formas?`, 'Saldo');
      if (!ok) return;
    }
  }

  S.gastos.unshift({
    id: Date.now(), desc: de, monto: mo, montoTotal, cat: ca,
    tipo: ti, fondo: fo, hormiga: (ti === 'hormiga'), cuatroXMil: fx,
    fecha: document.getElementById('g-fe').value || hoy(), metaId: '', autoFijo: false
  });

  if (ti !== 'ahorro') _desF(fo, montoTotal);

  ['g-de', 'g-mo'].forEach(i => { const e = document.getElementById(i); if (e) e.value = ''; });
  document.getElementById('g-4k').checked = false;
  ['p4k', 'g-semaforo', 'g-hormiga-impact'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = 'none';
  });

  save(); renderSmart(['gastos', 'stats']);
}

// ─── ELIMINAR GASTO ───────────────────────────────────────────────────────────
export async function delGasto(id) {
  const ok = await showConfirm('¿Eliminar este gasto del historial? Esta acción no se puede deshacer.', 'Eliminar gasto');
  if (!ok) return;
  const g = S.gastos.find(x => x.id === id);
  if (g && g.tipo !== 'ahorro') _refF(g.fondo, g.montoTotal || g.monto);
  if (g && g.autoFijo && g.fijoRef) {
    const mes  = mesStr();
    const fijo = S.gastosFijos.find(x => x.id === g.fijoRef);
    if (fijo) fijo.pagadoEn = fijo.pagadoEn.filter(m => m !== mes);
  }
  S.gastos = S.gastos.filter(x => x.id !== id);
  save(); renderSmart(['gastos', 'stats']);
}

// ─── EDITAR GASTO ─────────────────────────────────────────────────────────────
export function abrirEditarGasto(id) {
  const g = S.gastos.find(x => x.id === id); if (!g) return;
  document.getElementById('eg-id').value  = id;
  document.getElementById('eg-de').value  = g.desc;
  document.getElementById('eg-mo').value  = g.monto;
  document.getElementById('eg-ca').value  = g.cat;
  document.getElementById('eg-ti').value  = g.tipo;
  document.getElementById('eg-fe').value  = g.fecha;
  const hiddenFo = document.getElementById('eg-fo');
  if (hiddenFo) hiddenFo.value = g.fondo || 'efectivo';
  window.actualizarListasFondos?.();
  openM('m-edit-gasto');
}

export async function guardarEditarGasto() {
  const id     = +document.getElementById('eg-id').value;
  const g      = S.gastos.find(x => x.id === id); if (!g) return;
  const nMonto = +document.getElementById('eg-mo').value;
  const nFondo = document.getElementById('eg-fo').value;
  if (!nMonto) return;
  if (g.tipo !== 'ahorro') _refF(g.fondo, g.montoTotal || g.monto);
  g.desc       = document.getElementById('eg-de').value.trim();
  g.monto      = nMonto; g.montoTotal = nMonto;
  g.cat        = document.getElementById('eg-ca').value;
  g.tipo       = document.getElementById('eg-ti').value;
  g.fondo      = nFondo;
  g.hormiga    = g.tipo === 'hormiga';
  g.fecha      = document.getElementById('eg-fe').value;
  if (g.tipo !== 'ahorro') _desF(nFondo, nMonto);
  closeM('m-edit-gasto'); save(); renderSmart(['gastos', 'stats']);
}

// ─── LIMPIAR PERÍODO ─────────────────────────────────────────────────────────
export async function limpiarGastos() {
  const ok = await showConfirm('¿Eliminar todos los gastos del período actual? Tus fijos y objetivos no se tocan.', 'Limpiar período');
  if (!ok) return;
  S.gastos.filter(g => g.tipo !== 'ahorro').forEach(g => _refF(g.fondo, g.montoTotal || g.monto));
  const mes = mesStr();
  S.gastosFijos.forEach(g => { g.pagadoEn = (g.pagadoEn || []).filter(m => m !== mes); });
  S.gastos = [];
  save(); renderSmart(['gastos', 'stats']);
}

// ─── FILTRO ──────────────────────────────────────────────────────────────────
export function setFiltroGasto(tipo, el) {
  _filtroGasto = tipo;
  document.querySelectorAll('.gfil').forEach(b => {
    b.classList.remove('active-fil');
    b.style.opacity = '.65'; b.style.fontWeight = '600';
    b.setAttribute('aria-pressed', 'false');
  });
  if (el) {
    el.classList.add('active-fil');
    el.style.opacity = '1'; el.style.fontWeight = '800';
    el.setAttribute('aria-pressed', 'true');
  }
  renderGastos();
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
export function renderGastos() {
  const tb = document.getElementById('g-tab');
  if (!tb) return;
  const q = (document.getElementById('g-search')?.value || '').toLowerCase().trim();
  let list = [...S.gastos];

  if (q)                           list = list.filter(g => (g.desc || '').toLowerCase().includes(q) || (CATS[g.cat] || g.cat).toLowerCase().includes(q));
  if (_filtroGasto === '4x1000')   list = list.filter(g => g.cuatroXMil);
  else if (_filtroGasto === 'hormiga') list = list.filter(g => g.hormiga || g.tipo === 'hormiga');
  else if (_filtroGasto)           list = list.filter(g => g.tipo === _filtroGasto);

  if (!list.length) {
    tb.innerHTML = q
      ? `<tr><td colspan="9" class="emp">Sin resultados para esa búsqueda</td></tr>`
      : '<tr><td colspan="9" class="emp">Sin gastos registrados este período</td></tr>';
    return;
  }

  const total = list.length;
  tb.innerHTML = list.slice(0, 80).map(g => {
    let cIcono = '🏦', cNom = 'Banco';
    if (g.fondo === 'efectivo') { cIcono = '💵'; cNom = 'Efectivo'; }
    else if (g.fondo?.startsWith('cuenta_')) {
      const c = S.cuentas.find(x => x.id === +g.fondo.split('_')[1]);
      if (c) { cIcono = c.icono; cNom = c.nombre; }
    }
    return `<tr>
      <td class="mono" style="font-size:10px">${g.fecha}</td>
      <td>${he(g.desc)}${g.autoFijo ? ' <span class="pill pm" style="font-size:9px">Fijo</span>' : ''}</td>
      <td style="font-size:10px">${CATS[g.cat] || g.cat}</td>
      <td><span class="pill ${g.tipo === 'necesidad' ? 'pb' : g.tipo === 'ahorro' ? 'pg' : 'py'}">${g.tipo}</span></td>
      <td><span class="pill pm">${cIcono} ${he(cNom)}</span></td>
      <td>${g.hormiga ? '🐜' : '—'}</td>
      <td>${g.cuatroXMil ? '<span class="pill pt">✓</span>' : '—'}</td>
      <td class="ac mono" style="color:${g.tipo === 'ahorro' ? 'var(--a1)' : 'var(--a3)'};font-weight:600">${f(g.montoTotal || g.monto)}</td>
      <td style="display:flex;gap:4px">
        <button class="btn bg bsm" onclick="abrirEditarGasto(${g.id})">✏️</button>
        <button class="btn bd bsm" onclick="delGasto(${g.id})">×</button>
      </td>
    </tr>`;
  }).join('');

  if (total > 80) {
    tb.innerHTML += `<tr><td colspan="9" style="text-align:center; padding:12px; color:var(--a2); font-size:11px; font-weight:600;">
      Mostrando 80 de ${total} gastos. Usa el buscador para encontrar los demás.</td></tr>`;
  }
}

// ─── HELPERS INTERNOS ─────────────────────────────────────────────────────────
function _getPct() {
  const m   = document.getElementById('q-met')?.value || '50-30-20';
  const MAP = { '50-30-20': { n: 50, d: 30, a: 20 }, '50-20-30': { n: 50, d: 20, a: 30 }, '70-20-10': { n: 70, d: 20, a: 10 } };
  if (MAP[m]) return MAP[m];
  const valN = document.getElementById('pn')?.value;
  const valD = document.getElementById('pd')?.value;
  const valA = document.getElementById('pa')?.value;
  return {
    n: valN === '' || valN == null ? 50 : Number(valN),
    d: valD === '' || valD == null ? 30 : Number(valD),
    a: valA === '' || valA == null ? 20 : Number(valA)
  };
}

function _desF(fo, mo) {
  if (fo === 'efectivo') S.saldos.efectivo = Math.max(0, S.saldos.efectivo - mo);
  else if (fo.startsWith('cuenta_')) {
    const c = S.cuentas.find(x => x.id === +fo.split('_')[1]);
    if (c) c.saldo = Math.max(0, c.saldo - mo);
    S.saldos.banco = S.cuentas.reduce((s, c) => s + c.saldo, 0);
  } else {
    S.saldos.banco = Math.max(0, S.saldos.banco - mo);
  }
  updSaldo();
}

function _refF(fo, mo) {
  if (fo === 'efectivo') S.saldos.efectivo += mo;
  else if (fo.startsWith('cuenta_')) {
    const c = S.cuentas.find(x => x.id === +fo.split('_')[1]);
    if (c) c.saldo += mo;
    S.saldos.banco = S.cuentas.reduce((s, c) => s + c.saldo, 0);
  } else {
    S.saldos.banco += mo;
  }
  updSaldo();
}

// ─── EXPOSICIÓN GLOBAL ────────────────────────────────────────────────────────
window.agregarGasto         = agregarGasto;
window.delGasto             = delGasto;
window.abrirEditarGasto     = abrirEditarGasto;
window.guardarEditarGasto   = guardarEditarGasto;
window.limpiarGastos        = limpiarGastos;
window.setFiltroGasto       = setFiltroGasto;
window.renderGastos         = renderGastos;
window.prev4k               = prev4k;
window.actualizarSemaforo   = actualizarSemaforo;
window.calcularImpactoHormiga = calcularImpactoHormiga;