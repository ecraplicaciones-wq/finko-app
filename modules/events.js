// Orquestador principal: importa todos los módulos, expone globals, arranca la app.

// ─── CIMIENTOS ───────────────────────────────────────────────────────────────
import { S, resetAppState }   from './state.js';
import { save, loadData }     from './storage.js';
import { inyectarConstantes, verificarVigenciaConstantes } from './constants.js';
import { f, hoy, mesStr, he, setEl, setHtml, sr, openM, closeM, showAlert, showConfirm, showPrompt, showPromptConfirm } from './utils.js';
import { updSaldo, updateBadge, renderSmart, renderAll, totalCuentas } from './render.js';

// ─── NAVEGACIÓN ──────────────────────────────────────────────────────────────
import { go, toggleMas, closeMas, setPer, setResumenTab, toggleSidebar } from './sections.js';

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
import { updateDash, calcScore, renderDashCuentas } from './dashboard.js';

// ─── GASTOS ──────────────────────────────────────────────────────────────────
import { agregarGasto, delGasto, abrirEditarGasto, guardarEditarGasto, limpiarGastos, setFiltroGasto, renderGastos, prev4k, actualizarSemaforo, calcularImpactoHormiga } from './gastos.js';

// ─── FIJOS ───────────────────────────────────────────────────────────────────
import { guardarFijo, renderFijos, abrirModalFijo, cerrarModalFijo, ejecutarPagoFijo, desmFijo, delFijo } from './fijos.js';

// ─── DEUDAS ──────────────────────────────────────────────────────────────────
import { guardarDeuda, renderDeudas, setModoDeuda, abrirPagarCuota, confPagarCuota, abrirEditarDeuda, guardarEditarDeuda, delDeu, selTipoDeuda, selTipoDeudaEdit, selFrecDeuda, selFrecDeudaEdit } from './deudas.js';

// ─── OBJETIVOS ───────────────────────────────────────────────────────────────
import { guardarObjetivo, toggleTipoObjetivo, openNuevoObjetivo, renderObjetivos, abrirAccionObj, evaluarGastoEvento, ejecutarAccionObjetivo, delObjetivo, calcSimObj, populateSelectObjetivos } from './objetivos.js';

// ─── INVERSIONES ─────────────────────────────────────────────────────────────
import { guardarInversion, renderInversiones, openRendimiento, guardarRendimiento, delInversion } from './inversiones.js';

// ─── AGENDA ──────────────────────────────────────────────────────────────────
import { renderCal, prevMonth, nextMonth, showDayDetails, guardarPago, marcarPagado, ejecutarPagoAgendado, delPago, renderPagos } from './agenda.js';

// ─── CUENTAS ─────────────────────────────────────────────────────────────────
import { guardarCuenta, delCuenta, editSaldoCuenta, editSaldoCuentaDash, renderCuentas, actualizarListasFondos, toggleFundSelect, selFundOpt } from './cuentas.js';

// ─── HISTORIAL ───────────────────────────────────────────────────────────────
import { renderHistorial, delHistorial, cerrarQ, exportarDatos, importarDatos, exportarCSV } from './historial.js';

// ─── FONDO DE EMERGENCIA ─────────────────────────────────────────────────────
import { calcularFondoEmergencia, actualizarVistaFondo, registrarAbonoFondo } from './fondo.js';

// ─── CALCULADORAS ────────────────────────────────────────────────────────────
import { cCDT, cCre, cIC, cMeta, cMetaAporte, cPila, cInf, cR72, toggleCalc, calcPrima, guardarPrima } from './calculadoras.js';

// ─── ESTADÍSTICAS ────────────────────────────────────────────────────────────
import { renderStats } from './stats.js';

// ─── UI COMPONENTS ───────────────────────────────────────────────────────────
import { toggleDayPicker, selectDay, setDayPicker, updCustomFundButton, toggleFormGasto, toggleFijoInline, toggleFijosPanel, calcDist, onMetCh, selM, guardarQ, resetTodo, resetQuincena, toggleTheme, applyTheme, getPreferredTheme, initClickOutside } from './ui-components.js';

// ─── EXPOSICIÓN GLOBAL ───────────────────────────────────────────────────────

// utils
window.f                   = f;
window.hoy                 = hoy;
window.mesStr              = mesStr;
window.he                  = he;
window.setEl               = setEl;
window.setHtml             = setHtml;
window.sr                  = sr;
window.openM               = openM;
window.closeM              = closeM;
window.showAlert           = showAlert;
window.showConfirm         = showConfirm;
window.showPrompt          = showPrompt;
window.showPromptConfirm   = showPromptConfirm;
window.save                = save;

// render
window.updSaldo            = updSaldo;
window.updateBadge         = updateBadge;
window.renderSmart         = renderSmart;
window.renderAll           = renderAll;
window.totalCuentas        = totalCuentas;

// sections
window.go                  = go;
window.toggleMas           = toggleMas;
window.closeMas            = closeMas;
window.setPer              = setPer;
window.setResumenTab       = setResumenTab;
window.toggleSidebar       = toggleSidebar;

// dashboard
window.updateDash          = updateDash;
window.calcScore           = calcScore;
window.renderDashCuentas   = renderDashCuentas;

// gastos
window.agregarGasto        = agregarGasto;
window.delGasto            = delGasto;
window.abrirEditarGasto    = abrirEditarGasto;
window.guardarEditarGasto  = guardarEditarGasto;
window.limpiarGastos       = limpiarGastos;
window.setFiltroGasto      = setFiltroGasto;
window.renderGastos        = renderGastos;
window.prev4k              = prev4k;
window.actualizarSemaforo  = actualizarSemaforo;
window.calcularImpactoHormiga = calcularImpactoHormiga;

// fijos
window.guardarFijo         = guardarFijo;
window.renderFijos         = renderFijos;
window.abrirModalFijo      = abrirModalFijo;
window.cerrarModalFijo     = cerrarModalFijo;
window.ejecutarPagoFijo    = ejecutarPagoFijo;
window.desmFijo            = desmFijo;
window.delFijo             = delFijo;

// deudas
window.guardarDeuda        = guardarDeuda;
window.renderDeudas        = renderDeudas;
window.setModoDeuda        = setModoDeuda;
window.abrirPagarCuota     = abrirPagarCuota;
window.confPagarCuota      = confPagarCuota;
window.abrirEditarDeuda    = abrirEditarDeuda;
window.guardarEditarDeuda  = guardarEditarDeuda;
window.delDeu              = delDeu;
window.selTipoDeuda        = selTipoDeuda;
window.selTipoDeudaEdit    = selTipoDeudaEdit;
window.selFrecDeuda        = selFrecDeuda;
window.selFrecDeudaEdit    = selFrecDeudaEdit;

// objetivos
window.guardarObjetivo          = guardarObjetivo;
window.toggleTipoObjetivo       = toggleTipoObjetivo;
window.openNuevoObjetivo        = openNuevoObjetivo;
window.renderObjetivos          = renderObjetivos;
window.abrirAccionObj           = abrirAccionObj;
window.evaluarGastoEvento       = evaluarGastoEvento;
window.ejecutarAccionObjetivo   = ejecutarAccionObjetivo;
window.delObjetivo              = delObjetivo;
window.calcSimObj               = calcSimObj;
window.populateSelectObjetivos  = populateSelectObjetivos;

// inversiones
window.guardarInversion    = guardarInversion;
window.renderInversiones   = renderInversiones;
window.openRendimiento     = openRendimiento;
window.guardarRendimiento  = guardarRendimiento;
window.delInversion        = delInversion;

// agenda
window.renderCal            = renderCal;
window.prevMonth            = prevMonth;
window.nextMonth            = nextMonth;
window.showDayDetails       = showDayDetails;
window.guardarPago          = guardarPago;
window.marcarPagado         = marcarPagado;
window.ejecutarPagoAgendado = ejecutarPagoAgendado;
window.delPago              = delPago;
window.renderPagos          = renderPagos;

// cuentas
window.guardarCuenta          = guardarCuenta;
window.delCuenta              = delCuenta;
window.editSaldoCuenta        = editSaldoCuenta;
window.editSaldoCuentaDash    = editSaldoCuentaDash;
window.renderCuentas          = renderCuentas;
window.actualizarListasFondos = actualizarListasFondos;
window.toggleFundSelect       = toggleFundSelect;
window.selFundOpt             = selFundOpt;

// historial / export
window.renderHistorial     = renderHistorial;
window.delHistorial        = delHistorial;
window.cerrarQ             = cerrarQ;
window.exportarDatos       = exportarDatos;
window.importarDatos       = importarDatos;
window.exportarCSV         = exportarCSV;
window.descargarCSVDirecto = exportarCSV;

// fondo de emergencia
window.calcularFondoEmergencia = calcularFondoEmergencia;
window.actualizarVistaFondo    = actualizarVistaFondo;
window.registrarAbonoFondo     = registrarAbonoFondo;

// calculadoras
window.cCDT         = cCDT;
window.cCre         = cCre;
window.cIC          = cIC;
window.cMeta        = cMeta;
window.cMetaAporte  = cMetaAporte;
window.cPila        = cPila;
window.cInf         = cInf;
window.cR72         = cR72;
window.toggleCalc   = toggleCalc;
window.calcPrima    = calcPrima;
window.guardarPrima = guardarPrima;

// stats
window.renderStats = renderStats;

// ui-components
window.toggleDayPicker     = toggleDayPicker;
window.selectDay           = selectDay;
window.setDayPicker        = setDayPicker;
window.updCustomFundButton = updCustomFundButton;
window.toggleFormGasto     = toggleFormGasto;
window.toggleFijoInline    = toggleFijoInline;
window.toggleFijosPanel    = toggleFijosPanel;
window.calcDist            = calcDist;
window.onMetCh             = onMetCh;
window.selM                = selM;
window.guardarQ            = guardarQ;
window.resetTodo           = resetTodo;
window.resetQuincena       = resetQuincena;
window.toggleTheme         = toggleTheme;
window.applyTheme          = applyTheme;
window.getPreferredTheme   = getPreferredTheme;

// efectivo — atajo directo del Dashboard
window.editEfectivoDash = async function () {
  const val = await showPrompt(
    `Efectivo registrado: ${f(S.saldos.efectivo)}\n\nIngresa el dinero físico exacto que tienes ahora en tu billetera:`,
    '💵 Actualizar Efectivo',
    S.saldos.efectivo
  );
  if (val === null) return;
  S.saldos.efectivo = Math.max(0, +val || 0);
  save(); updSaldo(); updateDash();
};

// ─── ARRANQUE ────────────────────────────────────────────────────────────────
function _initDatos() {
  loadData();
  updSaldo();
}

function _initUI() {
  if (localStorage.getItem('sb_expanded') === 'true') {
    document.getElementById('sidebar')?.classList.add('expanded');
    document.body.classList.add('sb-expanded');
  }
  applyTheme(getPreferredTheme());
  inyectarConstantes();
  updateBadge();
  const today = new Date();
  ['g-fe', 'ag-fe', 'obj-fe'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.valueAsDate = today;
  });
  if (S.ingreso > 0) {
    const el = document.getElementById('q-pri'); if (el) el.value = S.ingreso;
  }
  document.querySelectorAll('.mclose').forEach(btn => {
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Cerrar ventana');
  });
  initClickOutside();
}

function _initCalculadoras() {
  try { cCDT(); } catch (_) {}
  try { cCre(); } catch (_) {}
  try { cIC();  } catch (_) {}
  try { cMeta(); } catch (_) {}
  try { cPila(); } catch (_) {}
}

function initApp() {
  _initDatos();
  _initUI();
  _initCalculadoras();
  populateSelectObjetivos();
  renderAll();
  calcScore();
  verificarVigenciaConstantes();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// ─── SERVICE WORKER ──────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../service-worker.js')
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw?.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              nw.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch(err => console.warn('[SW] Error al registrar:', err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
  });
}