import { S, resetAppState } from './state.js';

const STORAGE_KEY = 'fco_v4';

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  } catch (e) {
    console.error('Finko: Error al guardar datos', e);
  }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { resetAppState(); return; }
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      resetAppState(); return;
    }
    resetAppState();
    Object.assign(S, parsed);
    // Garantizar arrays críticos si el JSON estaba incompleto
    if (!Array.isArray(S.cuentas))        S.cuentas = [];
    if (!Array.isArray(S.gastos))         S.gastos = [];
    if (!Array.isArray(S.objetivos))      S.objetivos = [];
    if (!Array.isArray(S.deudas))         S.deudas = [];
    if (!Array.isArray(S.historial))      S.historial = [];
    if (!Array.isArray(S.gastosFijos))    S.gastosFijos = [];
    if (!Array.isArray(S.pagosAgendados)) S.pagosAgendados = [];
    if (!Array.isArray(S.inversiones))    S.inversiones = [];
    if (!S.saldos)                        S.saldos = { efectivo: 0, banco: 0 };
    if (!S.fondoEmergencia)              S.fondoEmergencia = { objetivoMeses: 6, actual: 0 };
  } catch (e) {
    console.error('Finko: Error al cargar datos', e);
    resetAppState();
  }
}