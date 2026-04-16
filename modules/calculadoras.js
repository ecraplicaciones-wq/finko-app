import { S } from './state.js';
import { f, setHtml } from './utils.js';
import { RETEFUENTE_CDT, SALUD_INDEPEND, PENSION_INDEPEND, SMMLV_2026 } from './constants.js';

// ─── CDT ─────────────────────────────────────────────────────────────────────
export function cCDT() {
  const c   = +document.getElementById('cc-cap')?.value || 0;
  const t   = (+document.getElementById('cc-tas')?.value || 0) / 100;
  const d   = +document.getElementById('cc-dia')?.value || 0;
  const per = document.getElementById('cc-per')?.value;
  const ck  = document.getElementById('cc-ret')?.checked;

  // Interés total al vencimiento usando capitalización compuesta continua por días
  const rendTotal = c * (Math.pow(1 + t, d / 365) - 1);
  const netTotal  = ck ? rendTotal * (1 - RETEFUENTE_CDT) : rendTotal;

  if (per === '30') {
    // Tasa efectiva mensual equivalente a la EA
    const tem         = Math.pow(1 + t, 1 / 12) - 1;
    const rendMensual = c * tem;
    const netMensual  = ck ? rendMensual * (1 - RETEFUENTE_CDT) : rendMensual;
    setHtml('cdt-res', `
      <div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);">
        <div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Recibirás en tu cuenta cada mes:</div>
        <div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(netMensual)}</div>
        <div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px;">Ganancia sumada al final del plazo: <strong>${f(netTotal)}</strong></div>
      </div>`);
  } else {
    setHtml('cdt-res', `
      <div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);">
        <div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Ganancia neta total al final del plazo:</div>
        <div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(netTotal)}</div>
      </div>`);
  }
}

// ─── CRÉDITO ─────────────────────────────────────────────────────────────────
// Sistema francés (cuota fija): M = P × [i(1+i)^n] / [(1+i)^n - 1]
export function cCre() {
  const p  = +document.getElementById('cr-mo')?.value || 0;
  const tm = Number(document.getElementById('cr-ta')?.value) || 0;  // tasa mensual %
  const n  = +document.getElementById('cr-n')?.value || 0;
  if (!p || !n) { setHtml('cre-res', ''); return; }

  const i  = tm / 100; // convertir a decimal
  const cu = i === 0
    ? p / n
    : (p * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);

  const totalPagado  = cu * n;
  const totalInterés = totalPagado - p;

  setHtml('cre-res', `
    <div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);">
      <div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Cuota mensual fija:</div>
      <div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(cu)}</div>
      <div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px; display:flex; flex-direction:column; gap:4px;">
        <div style="display:flex; justify-content:space-between;"><span>Total a pagar en ${n} cuotas:</span><strong style="font-family:var(--fm);">${f(totalPagado)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Total en intereses:</span><strong style="font-family:var(--fm); color:var(--dan);">${f(totalInterés)}</strong></div>
      </div>
    </div>`);
}

// ─── INTERÉS COMPUESTO CON APORTES ───────────────────────────────────────────
// VF = C(1+tm)^n + A × [(1+tm)^n - 1] / tm
export function cIC() {
  const c  = +document.getElementById('ic-cap')?.value || 0;
  const a  = +document.getElementById('ic-apo')?.value || 0;
  const ta = (+document.getElementById('ic-tas')?.value || 0) / 100; // EA
  const m  = +document.getElementById('ic-mes')?.value || 0;

  const tm = Math.pow(1 + ta, 1 / 12) - 1; // tasa mensual equivalente
  const vf = tm > 0
    ? c * Math.pow(1 + tm, m) + a * (Math.pow(1 + tm, m) - 1) / tm
    : c + a * m;

  const totalAportado = c + a * m;
  const ganancia      = vf - totalAportado;

  setHtml('ic-res', `
    <div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);">
      <div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Valor final proyectado:</div>
      <div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(vf)}</div>
      <div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px; display:flex; flex-direction:column; gap:4px;">
        <div style="display:flex; justify-content:space-between;"><span>Total aportado:</span><strong style="font-family:var(--fm);">${f(totalAportado)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Ganancia por interés compuesto:</span><strong style="font-family:var(--fm); color:var(--a1);">${f(ganancia)}</strong></div>
      </div>
    </div>`);
}

// ─── META DE AHORRO ───────────────────────────────────────────────────────────
export function cMeta() {
  const totEl = document.getElementById('ma-tot'); if (!totEl) return;
  const M     = +totEl.value || 0;
  const T     = +document.getElementById('ma-ten')?.value || 0;
  const fe    = document.getElementById('ma-fe')?.value;
  const falta = Math.max(0, M - T);

  if (!falta || falta <= 0) { setHtml('ma-res', ''); return; }

  if (fe) {
    const dias = Math.max(0, Math.ceil((new Date(fe + 'T12:00:00') - new Date()) / 86_400_000));
    if (dias <= 0) {
      setHtml('ma-res', `<div style="color:var(--dan); font-size:12px; padding:10px; text-align:center;">La fecha ya pasó. Elige una fecha futura.</div>`);
      return;
    }
    const frecs = [{ label: 'Por día', dias: 1 }, { label: 'Por semana', dias: 7 }, { label: 'Por quincena', dias: 15 }, { label: 'Por mes', dias: 30 }];
    const grid  = frecs.map(fr => {
      const periodos = Math.max(1, dias / fr.dias);
      return `<div style="background:rgba(157,115,235,.08); border:1px solid rgba(157,115,235,.2); border-radius:10px; padding:12px; text-align:center;">
        <div style="font-size:10px; color:var(--a5); font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px;">${fr.label}</div>
        <div style="font-family:var(--fm); font-size:18px; font-weight:800; color:var(--t1);">${f(falta / periodos)}</div>
      </div>`;
    }).join('');
    setHtml('ma-res', `
      <div style="margin-top:4px;">
        <div style="font-size:11px; color:var(--t3); margin-bottom:10px; text-align:center;">Faltan <strong style="color:var(--t2);">${dias} días</strong> · Por ahorrar: <strong style="color:var(--a5);">${f(falta)}</strong></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">${grid}</div>
      </div>`);
  } else {
    setHtml('ma-res', `
      <div style="margin-top:4px;">
        <div style="font-size:11px; color:var(--t3); margin-bottom:10px;">Por ahorrar: <strong style="color:var(--a5);">${f(falta)}</strong>. ¿Cuánto puedes apartar por período?</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input type="number" id="ma-aporte" placeholder="Ej: 200.000" inputmode="decimal" style="flex:1; min-width:120px;" oninput="cMetaAporte()">
          <select id="ma-frec" onchange="cMetaAporte()" style="flex:1; min-width:120px;">
            <option value="30">Mensual</option>
            <option value="15" selected>Quincenal</option>
            <option value="7">Semanal</option>
            <option value="1">Diario</option>
          </select>
        </div>
        <div id="ma-aporte-res" style="margin-top:10px;"></div>
      </div>`);
  }
}

export function cMetaAporte() {
  const falta  = Math.max(0, (+document.getElementById('ma-tot')?.value || 0) - (+document.getElementById('ma-ten')?.value || 0));
  const aporte = +document.getElementById('ma-aporte')?.value || 0;
  const diasPer = +document.getElementById('ma-frec')?.value || 15;
  const resEl  = document.getElementById('ma-aporte-res');
  if (!resEl || aporte <= 0 || falta <= 0) { if (resEl) resEl.innerHTML = ''; return; }

  const periodos  = Math.ceil(falta / aporte);
  const diasTotal = periodos * diasPer;
  const nombres   = { 30: 'mes', 15: 'quincena', 7: 'semana', 1: 'día' };
  const frecNombre = nombres[diasPer] || 'período';
  let tiempoStr = '';
  if (diasTotal < 30)       tiempoStr = `${diasTotal} días`;
  else if (diasTotal < 365) { const m = Math.ceil(diasTotal / 30); tiempoStr = `${m} mes${m !== 1 ? 'es' : ''}`; }
  else { const a = Math.floor(diasTotal / 365); const mr = Math.floor((diasTotal % 365) / 30); tiempoStr = `${a} año${a !== 1 ? 's' : ''}${mr > 0 ? ` y ${mr} mes${mr !== 1 ? 'es' : ''}` : ''}`; }

  resEl.innerHTML = `
    <div style="background:rgba(157,115,235,.1); border:1px solid rgba(157,115,235,.2); border-radius:8px; padding:12px; text-align:center;">
      <div style="font-size:12px; color:var(--t2); margin-bottom:4px;">Ahorrando <strong>${f(aporte)}</strong> por ${frecNombre} llegarás en:</div>
      <div style="font-family:var(--fm); font-size:22px; font-weight:800; color:var(--a5);">${tiempoStr}</div>
      <div style="font-size:11px; color:var(--t3); margin-top:4px;">${periodos} ${frecNombre}${periodos !== 1 ? 's' : ''}</div>
    </div>`;
}

// ─── PILA (SEGURIDAD SOCIAL INDEPENDIENTES) ───────────────────────────────────
// IBC = max(ingreso × 40%, 1 SMMLV). Salud: 12.5%, Pensión: 16%, ARL: variable.
export function cPila() {
  const ingEl = document.getElementById('pl-ing');
  const arlEl = document.getElementById('pl-arl');
  const resEl = document.getElementById('pila-res');
  if (!ingEl || !resEl) return;

  const ing = +ingEl.value || 0;
  const arl = +(arlEl?.value || 0.00522); // Clase I por defecto
  if (ing <= 0) { resEl.innerHTML = ''; return; }

  const ibc     = Math.max(ing * 0.40, SMMLV_2026); // Art. 18 Ley 1122/2007
  const salud   = ibc * SALUD_INDEPEND;
  const pension = ibc * PENSION_INDEPEND;
  const arlVal  = ibc * arl;
  const tot     = salud + pension + arlVal;

  resEl.innerHTML = `
    <div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);">
      <div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Base de cotización (IBC):</div>
      <div style="font-family:var(--fm); font-size:18px; font-weight:700; color:var(--a4); margin-bottom:14px;">${f(ibc)}</div>
      <div style="display:flex; flex-direction:column; gap:8px; font-size:12px; color:var(--t2);">
        <div style="display:flex; justify-content:space-between;"><span>🏥 Salud (12.5%)</span><strong style="font-family:var(--fm);">${f(salud)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>🛡️ Pensión (16%)</span><strong style="font-family:var(--fm);">${f(pension)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>⚠️ ARL (${(arl * 100).toFixed(3)}%)</span><strong style="font-family:var(--fm);">${f(arlVal)}</strong></div>
        <div style="border-top:1px solid var(--b1); padding-top:8px; display:flex; justify-content:space-between;">
          <strong>Total a pagar</strong>
          <strong style="font-family:var(--fm); color:var(--dan); font-size:16px;">${f(tot)}</strong>
        </div>
      </div>
      <div style="font-size:11px; color:var(--t3); margin-top:10px; line-height:1.5;">
        💡 Si tienes empleados o cotizas por nómina, tu empleador cubre el 8.5% de salud y el 12% de pensión. Como independiente, pagas el 100% de la cotización.
      </div>
    </div>`;
}

// ─── RENTABILIDAD REAL VS INFLACIÓN ──────────────────────────────────────────
// Fórmula de Fisher: r_real = (1 + r_nominal)/(1 + inflación) - 1
export function cInf() {
  const cap = +document.getElementById('in-cap')?.value || 0;
  const tas = +document.getElementById('in-tas')?.value || 0;
  const inf = +document.getElementById('in-inf')?.value || 0;

  const real            = (((1 + tas / 100) / (1 + inf / 100)) - 1) * 100;
  const gananciaNominal = cap * (tas / 100);
  const gananciaReal    = cap * (real / 100);
  const perdidaInflacion = gananciaNominal - gananciaReal;
  const color = real > 0 ? 'var(--a1)' : 'var(--dan)';
  const msg   = real > 0
    ? '✅ ¡Genial! Tu dinero está creciendo por encima de la inflación.'
    : '🚨 ¡Cuidado! Aunque el banco te pague intereses, estás perdiendo poder adquisitivo.';

  let html = `
    <div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);">
      <div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Tu rentabilidad REAL exacta es:</div>
      <div style="font-size:24px; color:${color}; font-family:var(--fm); font-weight:700;">${real.toFixed(2)}%</div>`;

  if (cap > 0) {
    html += `
      <div style="margin-top:14px; font-size:13px; color:var(--t2); line-height:1.6; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px; border:1px dashed var(--b1);">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>🏦 Ganancia en el banco (Nominal):</span><strong style="color:var(--a1); font-family:var(--fm)">+${f(gananciaNominal)}</strong></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--b1);"><span>🚨 Se lo "come" la inflación:</span><strong style="color:var(--dan); font-family:var(--fm)">-${f(perdidaInflacion)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>🛒 Poder de compra (Ganancia Real):</span><strong style="color:${color}; font-family:var(--fm)">+${f(gananciaReal)}</strong></div>
      </div>`;
  }
  html += `<div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px;">${msg}</div></div>`;
  setHtml('inf-res', html);
}

// ─── REGLA DEL 72 ────────────────────────────────────────────────────────────
// Años para duplicar = 72 / tasa_anual. Aproximación válida para tasas 6%–20%.
export function cR72() {
  const cap = +document.getElementById('r72-cap')?.value || 0;
  const tas = +document.getElementById('r72-tas')?.value || 0;
  if (tas <= 0) { setHtml('r72-res', ''); return; }

  const years    = 72 / tas;
  const fullYears = Math.floor(years);
  const months   = Math.round((years % 1) * 12);
  let timeStr    = `${fullYears} año${fullYears !== 1 ? 's' : ''}`;
  if (months > 0) timeStr += ` y ${months} mes${months !== 1 ? 'es' : ''}`;

  // Cálculo exacto complementario via logaritmo natural
  const yearsExacto = Math.log(2) / Math.log(1 + tas / 100);

  let html = `
    <div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);">
      <div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Tu dinero se duplicará en (aprox.):</div>
      <div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${timeStr}</div>
      <div style="font-size:11px; color:var(--t3); margin-top:6px;">Exacto: ${yearsExacto.toFixed(2)} años</div>`;

  if (cap > 0) {
    html += `
      <div style="margin-top:14px; font-size:13px; color:var(--t2); line-height:1.6; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px; border:1px dashed var(--b1);">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--b1);">
          <span>💰 Capital inicial:</span><strong style="color:var(--t3); font-family:var(--fm)">${f(cap)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>🎯 Se convertirá en:</span><strong style="color:var(--a1); font-family:var(--fm)">${f(cap * 2)}</strong>
        </div>
      </div>`;
  }
  html += `<div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px;">🚀 ¡Sin hacer nada más! Solo dejando que el interés compuesto haga su magia a una tasa del ${tas}%.</div></div>`;
  setHtml('r72-res', html);
}

// ─── TOGGLE ACORDEÓN ─────────────────────────────────────────────────────────
export function toggleCalc(id) {
  const body = document.getElementById(id + '-body'); if (!body) return;
  body.classList.toggle('open');
  body.classList.toggle('closed');
  const arr = document.getElementById(id + '-arr');
  if (arr) arr.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
  // Ejecutar calculadora al abrir para mostrar resultado inmediato
  const calcMap = { cdt: cCDT, cre: cCre, ic: cIC, pila: cPila, inf: cInf, r72: cR72 };
  if (body.classList.contains('open') && calcMap[id]) calcMap[id]();
}

// ─── PRIMA / BONO ────────────────────────────────────────────────────────────
export function calcPrima() {
  const m = +document.getElementById('prm-mo')?.value || 0;
  if (!m) return;
  setHtml('prm-res', `
    <div style="margin-top:14px; padding:14px; background:var(--s2); border-radius:var(--r2)">
      <div class="tm">Sugerencia (30/40/30)</div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px; font-size:13px;">
        <div style="display:flex; justify-content:space-between;"><span>💳 Deudas (30%)</span><span class="mono" style="font-weight:700;">${f(m * 0.3)}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>🛡️ Ahorro (40%)</span><span class="mono" style="font-weight:700;">${f(m * 0.4)}</span></div>
        <div style="display:flex; justify-content:space-between;"><span>🎉 Gustos (30%)</span><span class="mono" style="font-weight:700;">${f(m * 0.3)}</span></div>
      </div>
    </div>`);
}

export function guardarPrima() {
  const m  = +document.getElementById('prm-mo')?.value || 0; if (!m) return;
  const fo = document.getElementById('prm-fo')?.value || 'banco';
  S.ingreso += m;
  S.gastos.unshift({ id: Date.now(), desc: '🎉 Prima/Bono', monto: m, montoTotal: m, cat: 'otro', tipo: 'ahorro', fondo: fo, hormiga: false, cuatroXMil: false, fecha: new Date().toISOString().split('T')[0], metaId: '', autoFijo: false });

  // Sumar al saldo
  if (fo === 'efectivo') S.saldos.efectivo += m;
  else if (fo.startsWith('cuenta_')) {
    const c = S.cuentas.find(x => x.id === +fo.split('_')[1]);
    if (c) c.saldo += m;
    S.saldos.banco = S.cuentas.reduce((s, c) => s + c.saldo, 0);
  } else { S.saldos.banco += m; }

  window.closeM?.('m-prima');
  window.save?.();
  window.renderAll?.();
}

// ─── EXPOSICIÓN GLOBAL ───────────────────────────────────────────────────────
window.cCDT       = cCDT;
window.cCre       = cCre;
window.cIC        = cIC;
window.cMeta      = cMeta;
window.cMetaAporte = cMetaAporte;
window.cPila      = cPila;
window.cInf       = cInf;
window.cR72       = cR72;
window.toggleCalc = toggleCalc;
window.calcPrima  = calcPrima;
window.guardarPrima = guardarPrima;