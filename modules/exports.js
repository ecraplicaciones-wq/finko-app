import { S }    from './state.js';
import { save } from './storage.js';
import { f, hoy } from './utils.js';
import { CATS, GMF_TASA } from './constants.js';

// ─── EXPORTAR JSON (RESPALDO COMPLETO) ───────────────────────────────────────
export function exportarDatos() {
  const data = JSON.stringify(S, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `finko_backup_${hoy()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── IMPORTAR JSON ───────────────────────────────────────────────────────────
export function importarDatos(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const r    = new FileReader();
  r.onload   = function (ev) {
    try {
      const d = JSON.parse(ev.target.result);
      if (typeof d !== 'object' || d === null || Array.isArray(d)) {
        window.showAlert?.('El archivo no tiene un formato válido de Finko Pro.', 'Error de importación');
        return;
      }
      // Fusión segura: preserva estructura de arrays críticos
      Object.keys(d).forEach(key => { S[key] = d[key]; });
      if (!Array.isArray(S.cuentas))        S.cuentas = [];
      if (!Array.isArray(S.gastos))         S.gastos = [];
      if (!Array.isArray(S.objetivos))      S.objetivos = [];
      if (!Array.isArray(S.deudas))         S.deudas = [];
      if (!Array.isArray(S.historial))      S.historial = [];
      if (!Array.isArray(S.gastosFijos))    S.gastosFijos = [];
      if (!Array.isArray(S.pagosAgendados)) S.pagosAgendados = [];
      if (!Array.isArray(S.inversiones))    S.inversiones = [];
      if (!S.saldos)       S.saldos       = { efectivo: 0, banco: 0 };
      if (!S.fondoEmergencia) S.fondoEmergencia = { objetivoMeses: 6, actual: 0 };

      save();
      window.renderAll?.();
      window.go?.('dash');
      window.showAlert?.('✅ Datos importados correctamente. Todos tus registros han sido restaurados.', 'Importación exitosa');
    } catch (err) {
      window.showAlert?.('No se pudo leer el archivo. Asegúrate de que sea un backup válido de Finko Pro (.json).', 'Error de importación');
      console.error('importarDatos:', err);
    }
  };
  r.readAsText(file);
}

// ─── LAZY LOAD DE XLSX ───────────────────────────────────────────────────────
async function _cargarXLSX() {
  if (window.XLSX) return;
  return new Promise((resolve, reject) => {
    const script  = document.createElement('script');
    script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar XLSX'));
    document.head.appendChild(script);
  });
}

// ─── EXPORTAR EXCEL ──────────────────────────────────────────────────────────
// Columnas: Fecha, Descripción, Categoría, Tipo, Fondo, Hormiga, 4x1000, Monto Base, GMF, Monto Total
export async function exportarCSV() {
  if (!S.gastos.length) {
    window.showAlert?.('No hay gastos registrados para exportar.', 'Sin datos');
    return;
  }

  try {
    await _cargarXLSX();
  } catch {
    window.showAlert?.('No se pudo cargar la librería de Excel. Verifica tu conexión e intenta de nuevo.', 'Error de exportación');
    return;
  }

  // Encabezados con formato amigable para contadores
  const filas = [[
    'Fecha',
    'Descripción',
    'Categoría',
    'Tipo',
    'Fondo / Cuenta',
    'Gasto Hormiga',
    'Aplica 4×1000',
    'Monto Base (COP)',
    'GMF Cobrado (COP)',
    'Monto Total (COP)'
  ]];

  S.gastos.forEach(g => {
    // Nombre del fondo con detalle de cuenta
    let nombreFondo = 'Banco';
    if (g.fondo === 'efectivo') {
      nombreFondo = 'Efectivo';
    } else if (g.fondo && g.fondo.startsWith('cuenta_')) {
      const c = S.cuentas.find(x => x.id === +g.fondo.split('_')[1]);
      nombreFondo = c ? `${c.icono} ${c.nombre}` : 'Cuenta eliminada';
    }

    // Cálculo preciso del GMF
    const montoBase  = g.monto || 0;
    const montoTotal = g.montoTotal || g.monto || 0;
    const gmfCobrado = g.cuatroXMil ? Math.round(montoBase * GMF_TASA) : 0;

    filas.push([
      g.fecha,
      g.desc,
      CATS[g.cat] || g.cat,
      g.tipo,
      nombreFondo,
      (g.hormiga || g.tipo === 'hormiga') ? 'Sí' : 'No',
      g.cuatroXMil ? 'Sí' : 'No',
      montoBase,
      gmfCobrado,
      montoTotal
    ]);
  });

  // Fila de totales al final
  const totalBase  = S.gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const totalGMF   = S.gastos.filter(g => g.cuatroXMil).reduce((s, g) => s + Math.round((g.monto || 0) * GMF_TASA), 0);
  const totalFinal = S.gastos.reduce((s, g) => s + (g.montoTotal || g.monto || 0), 0);
  filas.push([]);
  filas.push(['TOTALES', '', '', '', '', '', '', totalBase, totalGMF, totalFinal]);

  // Hoja de resumen por categoría
  const catMap = {};
  S.gastos.filter(g => g.tipo !== 'ahorro').forEach(g => {
    const label = CATS[g.cat] || g.cat;
    catMap[label] = (catMap[label] || 0) + (g.montoTotal || g.monto || 0);
  });
  const filasResumen = [['Categoría', 'Total (COP)', '% del gasto']];
  const totalGastos  = Object.values(catMap).reduce((s, v) => s + v, 0);
  Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, monto]) => {
      const pct = totalGastos > 0 ? ((monto / totalGastos) * 100).toFixed(1) + '%' : '0%';
      filasResumen.push([cat, monto, pct]);
    });

  // Hoja de historial
  const filasHistorial = [['Período', 'Ingreso', 'Gastado', 'Ahorrado', 'Balance', 'Hormiga', '% Ahorro']];
  S.historial.forEach(hx => {
    const balance    = hx.ingreso - hx.gastado;
    const tasaAhorro = hx.ingreso > 0 ? ((hx.ahorro / hx.ingreso) * 100).toFixed(1) + '%' : '0%';
    filasHistorial.push([hx.periodo, hx.ingreso, hx.gastado, hx.ahorro, balance, hx.hormiga || 0, tasaAhorro]);
  });

  // Construir workbook con 3 hojas
  const wb      = XLSX.utils.book_new();
  const wsGastos = XLSX.utils.aoa_to_sheet(filas);
  const wsResumen = XLSX.utils.aoa_to_sheet(filasResumen);
  const wsHist   = XLSX.utils.aoa_to_sheet(filasHistorial);

  // Anchos de columna para hoja de gastos
  wsGastos['!cols'] = [
    { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 12 },
    { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 18 }
  ];
  wsResumen['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 14 }];
  wsHist['!cols']    = [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }];

  XLSX.utils.book_append_sheet(wb, wsGastos,  'Gastos');
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Por Categoría');
  XLSX.utils.book_append_sheet(wb, wsHist,    'Historial');

  XLSX.writeFile(wb, `finko_gastos_${hoy()}.xlsx`);
}

// ─── REPORTE MODAL (tabla HTML interna) ──────────────────────────────────────
export function generarReporteHTML() {
  if (!S.gastos.length) return '<div class="emp">Sin gastos para reportar.</div>';

  const catMap = {};
  let tG = 0, tA = 0, tH = 0;
  S.gastos.forEach(g => {
    const m = g.montoTotal || g.monto;
    if (g.tipo === 'ahorro') tA += m; else tG += m;
    if (g.hormiga || g.tipo === 'hormiga') tH += m;
    const label = CATS[g.cat] || g.cat;
    if (g.tipo !== 'ahorro') catMap[label] = (catMap[label] || 0) + m;
  });

  const filasCat = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, monto]) => {
      const pct = tG > 0 ? ((monto / tG) * 100).toFixed(1) : 0;
      return `<tr><td>${cat}</td><td class="ac mono">${f(monto)}</td><td class="ac">${pct}%</td></tr>`;
    }).join('');

  return `
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px;">
      <div style="padding:14px; background:var(--s2); border-radius:8px; text-align:center;">
        <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; margin-bottom:6px;">Total gastado</div>
        <div style="font-family:var(--fm); font-size:18px; font-weight:800; color:var(--dan);">${f(tG)}</div>
      </div>
      <div style="padding:14px; background:var(--s2); border-radius:8px; text-align:center;">
        <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; margin-bottom:6px;">Ahorrado</div>
        <div style="font-family:var(--fm); font-size:18px; font-weight:800; color:var(--a1);">${f(tA)}</div>
      </div>
      <div style="padding:14px; background:var(--s2); border-radius:8px; text-align:center;">
        <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; margin-bottom:6px;">Hormiga 🐜</div>
        <div style="font-family:var(--fm); font-size:18px; font-weight:800; color:#a1887f;">${f(tH)}</div>
      </div>
    </div>
    <div style="overflow-x:auto;">
      <table>
        <thead><tr><th>Categoría</th><th class="ac">Monto</th><th class="ac">% Gasto</th></tr></thead>
        <tbody>${filasCat}</tbody>
      </table>
    </div>`;
}

// ─── EXPOSICIÓN GLOBAL ───────────────────────────────────────────────────────
window.exportarDatos       = exportarDatos;
window.importarDatos       = importarDatos;
window.exportarCSV         = exportarCSV;
window.descargarCSVDirecto = exportarCSV;
window.generarReporteHTML  = generarReporteHTML;