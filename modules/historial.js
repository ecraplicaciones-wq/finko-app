import { S }    from './state.js';
import { save } from './storage.js';
import { f, he, hoy, mesStr, setHtml, showConfirm } from './utils.js';
import { renderSmart } from './render.js';

// ─── RENDER ──────────────────────────────────────────────────────────────────
export function renderHistorial() {
  const el = document.getElementById('hi-lst'); if (!el) return;

  if (!S.historial.length) {
    el.innerHTML = `
      <div style="text-align:center; padding:40px 20px; background:var(--s1); border-radius:16px; border:1px dashed rgba(0,220,130,.3);">
        <div style="font-size:48px; margin-bottom:14px;">🕰️</div>
        <div style="font-weight:800; font-size:17px; color:var(--t1); margin-bottom:8px;">Sin historial aún</div>
        <div style="color:var(--t3); font-size:13px; max-width:260px; margin:0 auto; line-height:1.6;">Cuando cierres un período, aquí quedará el resumen guardado para siempre.</div>
      </div>`;
    return;
  }

  el.innerHTML = S.historial.map(hx => {
    const balance    = hx.ingreso - hx.gastado;
    const colorBal   = balance >= 0 ? 'var(--a1)' : 'var(--dan)';
    const signoBal   = balance >= 0 ? '+' : '';
    const tasaAhorro = hx.ingreso > 0 ? Math.round((hx.ahorro / hx.ingreso) * 100) : 0;
    const tasaGasto  = hx.ingreso > 0 ? Math.round((hx.gastado / hx.ingreso) * 100) : 0;
    const pctGasto   = hx.ingreso > 0 ? Math.min((hx.gastado / hx.ingreso) * 100, 100) : 0;
    const pctAhorro  = hx.ingreso > 0 ? Math.min((hx.ahorro / hx.ingreso) * 100, 100) : 0;
    const pctHormiga = hx.ingreso > 0 ? Math.min(((hx.hormiga || 0) / hx.ingreso) * 100, 100) : 0;

    return `
    <article class="hist-card" aria-label="Historial: ${hx.periodo}">
      <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--b1); flex-wrap:wrap; gap:8px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:44px; height:44px; border-radius:12px; background:var(--s2); border:1px solid var(--b2); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;" aria-hidden="true">📅</div>
          <div>
            <div style="font-weight:800; font-size:14px; color:var(--t1);">${hx.periodo}</div>
            <div style="font-size:11px; color:var(--t3); margin-top:2px;">Balance: <span style="font-family:var(--fm); font-weight:700; color:${colorBal};">${signoBal}${f(balance)}</span></div>
          </div>
        </div>
        <button class="btn-eliminar-deu" onclick="delHistorial(${hx.id})" style="padding:6px 12px;" aria-label="Eliminar historial ${hx.periodo}">🗑️</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--b1);">
        <div style="background:var(--s1); padding:14px 16px;">
          <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Ingreso</div>
          <div style="font-family:var(--fm); font-size:16px; font-weight:800; color:var(--t1);">${f(hx.ingreso)}</div>
        </div>
        <div style="background:var(--s1); padding:14px 16px;">
          <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Gastado</div>
          <div style="font-family:var(--fm); font-size:16px; font-weight:800; color:var(--dan);">${f(hx.gastado)}</div>
          <div style="font-size:10px; color:var(--t3); margin-top:2px;">${tasaGasto}% del ingreso</div>
        </div>
        <div style="background:var(--s1); padding:14px 16px;">
          <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Ahorrado</div>
          <div style="font-family:var(--fm); font-size:16px; font-weight:800; color:var(--a1);">${f(hx.ahorro)}</div>
          <div style="font-size:10px; color:var(--t3); margin-top:2px;">${tasaAhorro}% del ingreso</div>
        </div>
      </div>

      <div style="padding:12px 20px 16px;">
        <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Distribución del período</div>
        <div style="height:8px; border-radius:999px; background:var(--s3); overflow:hidden; display:flex;">
          <div style="width:${pctGasto}%; background:var(--dan); transition:width .6s ease;" title="Gastos ${tasaGasto}%"></div>
          <div style="width:${pctAhorro}%; background:var(--a1); transition:width .6s ease;" title="Ahorro ${tasaAhorro}%"></div>
          <div style="width:${pctHormiga}%; background:var(--a2); transition:width .6s ease;" title="Hormiga"></div>
        </div>
        <div style="display:flex; gap:14px; margin-top:6px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--t3);"><div style="width:8px; height:8px; border-radius:50%; background:var(--dan); flex-shrink:0;"></div> Gastos</div>
          <div style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--t3);"><div style="width:8px; height:8px; border-radius:50%; background:var(--a1); flex-shrink:0;"></div> Ahorro</div>
          ${hx.hormiga > 0 ? `<div style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--t3);"><div style="width:8px; height:8px; border-radius:50%; background:var(--a2); flex-shrink:0;"></div> Hormiga ${f(hx.hormiga || 0)}</div>` : ''}
        </div>

        ${_renderTopCats(hx)}
      </div>
    </article>`;
  }).join('');
}

// ─── TOP CATEGORÍAS POR PERÍODO ───────────────────────────────────────────────
function _renderTopCats(hx) {
  if (!hx.catMap || !Object.keys(hx.catMap).length) return '';
  const CATS = { alimentacion:'🍽️ Alimentación', transporte:'🚌 Transporte', vivienda:'🏠 Vivienda', servicios:'💡 Servicios', salud:'🏥 Salud', entretenimiento:'🎬 Entretenimiento', ropa:'👕 Ropa', tecnologia:'💻 Tecnología', deudas:'💳 Deudas', otro:'📦 Otro' };
  const sorted = Object.entries(hx.catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!sorted.length) return '';
  const filas = sorted.map(([cat, monto]) => `
    <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--t2); margin-bottom:4px;">
      <span>${CATS[cat] || cat}</span>
      <span class="mono" style="font-weight:700;">${f(monto)}</span>
    </div>`).join('');
  return `<div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--b1);">
    <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; margin-bottom:6px;">Top gastos del período</div>
    ${filas}
  </div>`;
}

// ─── CERRAR QUINCENA ─────────────────────────────────────────────────────────
export async function cerrarQ() {
  if (!S.ingreso) return;
  const ok = await showConfirm('¿Archivar período?', 'Cerrar');
  if (!ok) return;

  const tG = S.gastos.filter(g => g.tipo !== 'ahorro').reduce((s, g) => s + (g.montoTotal || g.monto), 0);
  const tA = S.gastos.filter(g => g.tipo === 'ahorro').reduce((s, g) => s + g.monto, 0);
  const tH = S.gastos.filter(g => g.hormiga || g.tipo === 'hormiga').reduce((s, g) => s + g.monto, 0);
  const catMap = {};
  S.gastos.filter(g => g.tipo !== 'ahorro').forEach(g => { catMap[g.cat] = (catMap[g.cat] || 0) + (g.montoTotal || g.monto); });

  S.historial.unshift({
    id:      Date.now(),
    periodo: `Quincena cerrada: ${hoy()}`,
    mes:     mesStr(),
    ingreso: S.ingreso,
    gastado: tG,
    ahorro:  tA,
    hormiga: tH,
    catMap
  });

  S.gastos  = [];
  S.ingreso = 0;
  save();
  renderSmart(['gastos', 'historial', 'stats']);
  window.go?.('stat');
  window.setResumenTab?.('historial');
}

// ─── ELIMINAR REGISTRO ───────────────────────────────────────────────────────
export function delHistorial(id) {
  S.historial = S.historial.filter(h => h.id !== id);
  save();
  renderHistorial();
}

// ─── EXPORTAR ────────────────────────────────────────────────────────────────
export function exportarDatos() {
  const data = JSON.stringify(S, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `finko_${hoy()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importarDatos(e) {
  const file = e.target.files[0]; if (!file) return;
  const r    = new FileReader();
  r.onload   = function (ev) {
    try {
      const d = JSON.parse(ev.target.result);
      if (typeof d !== 'object' || d === null || Array.isArray(d)) {
        window.showAlert?.('El archivo no tiene un formato válido de Finko Pro.', 'Error de importación'); return;
      }
      Object.assign(S, d);
      save();
      window.renderAll?.();
      window.go?.('dash');
      window.showAlert?.('✅ Datos importados correctamente.', 'Importación exitosa');
    } catch (err) {
      window.showAlert?.('No se pudo leer el archivo. Asegúrate de que sea un backup válido de Finko Pro.', 'Error de importación');
      console.error('importarDatos:', err);
    }
  };
  r.readAsText(file);
}

async function _cargarXLSX() {
  if (window.XLSX) return;
  return new Promise((resolve, reject) => {
    const script  = document.createElement('script');
    script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar el exportador'));
    document.head.appendChild(script);
  });
}

export async function exportarCSV() {
  const CATS = { alimentacion:'🍽️ Alimentación', transporte:'🚌 Transporte', vivienda:'🏠 Vivienda', servicios:'💡 Servicios', salud:'🏥 Salud', entretenimiento:'🎬 Entretenimiento', ropa:'👕 Ropa', tecnologia:'💻 Tecnología', hormiga:'🐜 Hormiga', deudas:'💳 Deudas', ahorro:'💰 Ahorro', otro:'📦 Otro' };
  if (!S.gastos.length) { window.showAlert?.('No hay gastos registrados para exportar.', 'Sin datos'); return; }
  try { await _cargarXLSX(); } catch { window.showAlert?.('No se pudo cargar la librería de Excel. Verifica tu conexión.', 'Error'); return; }

  const filas = [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Fondo', 'Hormiga', '4x1000', 'Monto']];
  S.gastos.forEach(g => {
    let nombreFondo = 'Banco';
    if (g.fondo === 'efectivo') nombreFondo = 'Efectivo';
    else if (g.fondo && g.fondo.startsWith('cuenta_')) {
      const c = S.cuentas.find(x => x.id === +g.fondo.split('_')[1]);
      if (c) nombreFondo = c.nombre;
    }
    filas.push([g.fecha, g.desc, CATS[g.cat] || g.cat, g.tipo, nombreFondo, g.hormiga ? 'Sí' : 'No', g.cuatroXMil ? 'Sí' : 'No', g.montoTotal || g.monto]);
  });

  const ws = XLSX.utils.aoa_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
  XLSX.writeFile(wb, `finko_gastos_${hoy()}.xlsx`);
}

// ─── EXPOSICIÓN GLOBAL ───────────────────────────────────────────────────────
window.renderHistorial  = renderHistorial;
window.delHistorial     = delHistorial;
window.cerrarQ          = cerrarQ;
window.exportarDatos    = exportarDatos;
window.importarDatos    = importarDatos;
window.exportarCSV      = exportarCSV;
window.descargarCSVDirecto = exportarCSV;