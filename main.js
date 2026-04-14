// ==========================================================================
// ARCHIVO: main.js (EL CEREBRO DE FINKO PRO)
// OBJETIVO: Archivo central unificado, limpio y blindado.
// ==========================================================================

import { S } from './state.js';
import { loadData, save } from './storage.js';
import './ui.js';
import './theme.js';

// ─── CONSTANTES FINANCIERAS COLOMBIA ─────────────────────────────────────────
// Fuentes: DIAN, MinTrabajo, Superfinanciera. Revisar anualmente.
const SMMLV_2026        = 1_750_905;   // Decreto 0159 - MinTrabajo
const UVT_2026          = 52_374;      // Resolución DIAN 000238 dic-2025
const TOPE_DIAN_UVT     = 1_400;       // Art. 594 E.T. - umbral declaración renta
const TOPE_DIAN         = TOPE_DIAN_UVT * UVT_2026; // $73.323.600
const TASA_USURA_EA     = 24.36;       // Q1-2026 crédito consumo - Superfinanciera ⚠️ actualizar trimestral
const GMF_TASA          = 0.004;       // 4x1000 = 0.4% - Art. 872 E.T.
const GMF_EXENTO_UVT    = 350;         // Art. 879 E.T. - una cuenta exenta
const GMF_EXENTO_MONTO  = GMF_EXENTO_UVT * UVT_2026; // $18.330.900
const SALUD_INDEPEND    = 0.125;       // 12.5% - Art. 204 Ley 100/1993
const PENSION_INDEPEND  = 0.16;        // 16%   - Art. 18 Ley 100/1993
const RETEFUENTE_CDT    = 0.04;        // 4%    - Art. 395 E.T. + Decreto 2418/2013. Aplica también a CDAT cooperativas (Decreto 0572/2025)
const RETEFUENTE_AHORRO = 0.07;        // 7%    - Art. 395 E.T. para cuentas de ahorro (con base mínima exenta)
// ─────────────────────────────────────────────────────────────────────────────

// Mapa de constantes inyectables en HTML via data-const="CLAVE"
// Para actualizar un valor en toda la app: cambia solo la constante arriba.
const CONST_MAP = {
  'RETEFUENTE_CDT_PCT':    (RETEFUENTE_CDT * 100).toFixed(0) + '%',
  'RETEFUENTE_AHORRO_PCT': (RETEFUENTE_AHORRO * 100).toFixed(0) + '%',
  'GMF_EXENTO_MONTO':      '$' + Math.round(GMF_EXENTO_MONTO).toLocaleString('es-CO'),
  'GMF_EXENTO_UVT':        GMF_EXENTO_UVT + ' UVT',
  'TASA_USURA_EA':         TASA_USURA_EA + '% E.A.',
  'TOPE_DIAN':             '$' + Math.round(TOPE_DIAN).toLocaleString('es-CO'),
  'SMMLV_2026':            '$' + Math.round(SMMLV_2026).toLocaleString('es-CO'),
  'UVT_2026':              '$' + Math.round(UVT_2026).toLocaleString('es-CO'),
};

// Avisa en consola si las constantes financieras están próximas a vencer.
// Actualizar VENCEN_EN cada vez que se cambien las constantes del año arriba.
function verificarVigenciaConstantes() {
  const VENCEN_EN = '2026-12-31';
  const diasRestantes = Math.ceil((new Date(VENCEN_EN) - new Date()) / 86400000);
  if (diasRestantes <= 60) {
    console.warn(`⚠️ Finko Pro: Las constantes financieras (SMMLV, UVT, tasa de usura) vencen en ${diasRestantes} día(s). Actualizar antes del ${VENCEN_EN}.`);
  }
}

// Rellena todos los elementos con data-const="CLAVE" en el HTML
function inyectarConstantes() {
  document.querySelectorAll('[data-const]').forEach(el => {
    const key = el.getAttribute('data-const');
    if (CONST_MAP[key] !== undefined) el.textContent = CONST_MAP[key];
  });
}

const CATS = { alimentacion:'🍽️ Alimentación', transporte:'🚌 Transporte', vivienda:'🏠 Vivienda', servicios:'💡 Servicios', salud:'🏥 Salud', entretenimiento:'🎬 Entretenimiento', ropa:'👕 Ropa', tecnologia:'💻 Tecnología', hormiga:'🐜 Hormiga', deudas:'💳 Deudas', ahorro:'💰 Ahorro', otro:'📦 Otro' };
const PCATS = { comida:'🍽️ Comida', hotel:'🏨 Hotel', transporte:'🚌 Transporte', fiesta:'🎉 Fiesta', compras:'🛍️ Compras', entradas:'🎟️ Entradas', otro:'📦 Otro' };
const CCOLORS = { alimentacion:'#00dc82', transporte:'#3b9eff', vivienda:'#b44eff', servicios:'#ffd60a', salud:'#ff6b35', entretenimiento:'#ff4eb8', ropa:'#00e5cc', tecnologia:'#4eb8ff', hormiga:'#ff9944', deudas:'#ff4444', ahorro:'#00dc82', otro:'#666' };
const NAVS = ['dash','quin','gast','objetivos','inve','deu','agen','stat'];

let _filtroGasto = '';

function toggleFormGasto() {
  const card = document.getElementById('form-gasto-card');
  if (!card) return;
  const isOpen = card.classList.toggle('form-open');
  const header = card.querySelector('.form-gasto-header');
  const icon = document.getElementById('form-gasto-icon');
  if (header) header.setAttribute('aria-expanded', String(isOpen));
  if (icon) {
    icon.textContent = isOpen ? '✕' : '➕';
    icon.style.background = isOpen ? 'rgba(255,68,68,.15)' : 'rgba(0,220,130,.15)';
    icon.style.borderColor = isOpen ? 'rgba(255,68,68,.3)' : 'rgba(0,220,130,.3)';
  }
}

function toggleFijoInline() {
  const body   = document.getElementById('form-fijo-body');
  const arrow  = document.getElementById('form-fijo-arrow');
  const icon   = document.getElementById('form-fijo-icon');
  const btn    = document.querySelector('#form-fijo-card > button');
  if (!body) return;
  const isOpen = body.style.display === 'block';
  if (!isOpen) {
    body.style.display = 'block';
    requestAnimationFrame(() => { body.style.animation = 'fadeInSlide .25s ease'; });
    if (arrow) arrow.style.transform = 'rotate(180deg)';
    if (icon)  { icon.textContent = '✕'; icon.style.background = 'rgba(255,68,68,.15)'; icon.style.borderColor = 'rgba(255,68,68,.3)'; }
    if (btn)   btn.setAttribute('aria-expanded', 'true');
  } else {
    body.style.display = 'none';
    if (arrow) arrow.style.transform = '';
    if (icon)  { icon.textContent = '📌'; icon.style.background = 'rgba(255,214,10,.15)'; icon.style.borderColor = 'rgba(255,214,10,.3)'; }
    if (btn)   btn.setAttribute('aria-expanded', 'false');
  }
}
window.toggleFijoInline = toggleFijoInline;

function setFiltroGasto(tipo, el) {
  _filtroGasto = tipo;
  document.querySelectorAll('.gfil').forEach(b => {
    b.classList.remove('active-fil');
    b.style.opacity = '.65';
    b.style.fontWeight = '600';
    b.setAttribute('aria-pressed', 'false');
  });
  if (el) {
    el.classList.add('active-fil');
    el.style.opacity = '1';
    el.style.fontWeight = '800';
    el.setAttribute('aria-pressed', 'true');
  }
  renderGastos();
}

// ─── 1. ARRANQUE SEGURO ───
// ─── ARRANQUE: FUNCIONES CON UN SOLO PROPÓSITO ───────────────────────────────
// initApp() las coordina. Si algo falla, sabes exactamente dónde buscar.

// 1. Carga los datos guardados y actualiza los saldos
function initDatos() {
  loadData();
  updSaldo();
}

// 2. Configura la interfaz: tema, menú, fechas, accesibilidad
function initUI() {
  // Restaurar estado del menú lateral
  if (localStorage.getItem('sb_expanded') === 'true') {
    document.getElementById('sidebar')?.classList.add('expanded');
    document.body.classList.add('sb-expanded');
  }

  // Aplicar tema guardado o el preferido del sistema operativo
  applyTheme(getPreferredTheme());

  // Inyectar constantes legales y actualizar el badge de fecha
  inyectarConstantes();
  updateBadge();

  // Poner la fecha de hoy en todos los inputs de fecha
  const hoy = new Date();
  ['g-fe', 'ag-fe', 'obj-fe'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.valueAsDate = hoy;
  });

  // Restaurar el ingreso guardado en el campo de planificación
  if (S.ingreso > 0) {
    const el = document.getElementById('q-pri');
    if (el) el.value = S.ingreso;
  }

  // Accesibilidad: asegurar aria-label en todos los botones de cierre de modales
  document.querySelectorAll('.mclose').forEach(btn => {
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Cerrar ventana');
  });
}

// 3. Precarga las calculadoras financieras
function initCalculadoras() {
  cCDT(); cCre(); cIC(); cMeta(); cPila();
}

// Orquestador principal — coordina los tres pasos de arranque
function initApp() {
  initDatos();
  initUI();
  initCalculadoras();
  populateSelectObjetivos();
  renderAll();
  calcScore();
  verificarVigenciaConstantes();
}

let renderTimer = null;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();

// Renderiza SOLO las secciones necesarias.
// El Dashboard, saldos y cuentas SIEMPRE se actualizan (son el resumen global).
// Llama renderSmart(['gastos', 'deudas']) en vez de renderAll() para operaciones cotidianas.
function renderSmart(sections = []) {
  if (renderTimer) cancelAnimationFrame(renderTimer);
  renderTimer = requestAnimationFrame(() => {
    updSaldo();
    renderCuentas();
    renderDashCuentas();
    actualizarVistaFondo();
    updateDash();
    if (sections.includes('gastos'))      renderGastos();
    if (sections.includes('objetivos'))   renderObjetivos();
    if (sections.includes('inversiones')) renderInversiones();
    if (sections.includes('deudas'))      renderDeudas();
    if (sections.includes('fijos'))       renderFijos();
    if (sections.includes('pagos'))       renderPagos();
    if (sections.includes('historial'))   renderHistorial();
    if (sections.includes('stats'))       renderStats();
  });
}

// Renderiza TODO. Solo para arranque, importaciones y resets completos.
function renderAll() {
  renderSmart(['gastos','objetivos','inversiones','deudas','fijos','pagos','historial','stats']);
}

function updateBadge(){
  const n = new Date();
  const txt = `${n.getDate()<=15?'1ra':'2da'} quincena · ${n.toLocaleString('es-CO',{month:'short'})} ${n.getFullYear()}`;
  const el = document.getElementById('hbadge'); if(el) el.textContent = txt;
}

// ─── 2. NAVEGACIÓN Y QUINCENA ───
const MAS_SECTIONS = ['quin', 'objetivos', 'inve', 'stat'];

function toggleMas() {
  const panel   = document.getElementById('mas-panel');
  const overlay = document.getElementById('mas-overlay');
  const btn     = document.getElementById('btn-mas');
  if (!panel || !overlay) return;
  const abierto = panel.classList.contains('open');
  panel.classList.toggle('open', !abierto);
  overlay.classList.toggle('open', !abierto);
  if (btn) btn.setAttribute('aria-expanded', String(!abierto));
}

function closeMas() {
  const panel   = document.getElementById('mas-panel');
  const overlay = document.getElementById('mas-overlay');
  const btn     = document.getElementById('btn-mas');
  if (!panel) return;
  panel.classList.remove('open');
  overlay?.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function go(id){
  // Alias: 'fijo' ahora vive dentro de 'gast' como pestaña Recurrentes
  if (id === 'fijo') { go('gast'); return; }
  // Alias: 'hist' ahora vive dentro de 'stat' como pestaña Historial
  if (id === 'hist') { go('stat'); setResumenTab('historial'); return; }

  closeMas();

  NAVS.forEach(n => { const s = document.getElementById('sec-'+n); if(s) s.classList.toggle('active', n === id); });

  // Actualiza estado activo en botones del sidebar (desktop y móvil visible)
  document.querySelectorAll('.nb[data-section]').forEach(b => {
    const isActive = b.dataset.section === id;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Botón "Más": se ilumina si la sección activa está dentro del panel
  const btnMas = document.getElementById('btn-mas');
  if (btnMas) {
    const enMas = MAS_SECTIONS.includes(id);
    btnMas.classList.toggle('active', enMas);
    btnMas.setAttribute('aria-current', enMas ? 'page' : 'false');
  }

  // Ítems dentro del panel Más: marca el activo
  document.querySelectorAll('.mas-item[data-section]').forEach(item => {
    item.classList.toggle('active', item.dataset.section === id);
  });

  if(id === 'agen') renderCal();
  if(id === 'stat') { setResumenTab('analisis'); }
  if(id === 'gast') updSaldo();
  sr(`Sección ${id}`);
}

window.toggleFormGasto = toggleFormGasto;
window.setFiltroGasto = setFiltroGasto;

function toggleFijosPanel() {
  const body = document.getElementById('fijos-panel-body');
  const arrow = document.getElementById('fijos-panel-arrow');
  const btn = document.querySelector('.fijos-panel-header');
  if (!body || !arrow) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : '';
  arrow.style.transform = isOpen ? 'rotate(-90deg)' : '';
  if (btn) btn.setAttribute('aria-expanded', String(!isOpen));
}
window.toggleFijosPanel = toggleFijosPanel;

function setResumenTab(tab) {
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

  if (tab === 'analisis')  renderStats();
  if (tab === 'historial') renderHistorial();
}
window.setResumenTab = setResumenTab;

function setPer(tipo, el) {
  S.tipoPeriodo = tipo;
  document.querySelectorAll('.qtab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
  });
  el.classList.add('active');
  el.setAttribute('aria-selected', 'true');
  el.setAttribute('tabindex', '0');
  renderDeudas(); updateDash();
}

function onMetCh(){document.getElementById('cus-pct').style.display=document.getElementById('q-met').value==='custom'?'block':'none';calcDist();}
function selM(el,m){document.querySelectorAll('.mcd').forEach(c=>c.classList.remove('sel'));el.classList.add('sel');document.getElementById('q-met').value=m;onMetCh();}

function getPct(){
  const m = document.getElementById('q-met').value;
  const MAP = {'50-30-20':{n:50,d:30,a:20},'50-20-30':{n:50,d:20,a:30},'70-20-10':{n:70,d:20,a:10}};
  if(MAP[m]) return MAP[m];
  
  // SOLUCIÓN: Leemos el valor exacto como texto primero para que el "0" no se confunda.
  const valN = document.getElementById('pn').value;
  const valD = document.getElementById('pd').value;
  const valA = document.getElementById('pa').value;
  
  return { 
    n: valN === '' ? 50 : Number(valN), 
    d: valD === '' ? 30 : Number(valD), 
    a: valA === '' ? 20 : Number(valA) 
  };
}

async function guardarQ() {
  const total = S.saldos.efectivo + totalCuentas();
  
  if(total <= 0) { 
    const ok = await showConfirm('Tienes $0 disponibles en este momento.\n¿Quieres arrancar la quincena así de todas formas?', 'Saldo en cero');
    if(!ok) return; 
  }
  
  const p = getPct();
  
  // EDUCACIÓN FINANCIERA: Alerta si el ahorro es 0%
  if (p.a === 0) {
    const quiereAhorrar = await showConfirm('🛑 ¡Espera!\n\nEstás arrancando sin guardar ni un peso. Los expertos dicen: págate a ti mismo primero, así sea poquito.\n\n¿Seguro que quieres continuar sin ahorrar nada?', 'Antes de seguir');
    if(!quiereAhorrar) return; // Si el usuario cancela, lo dejamos corregir el 0
  }
  
  S.ingreso = total; 
  S.metodo = document.getElementById('q-met').value;
  
  save(); renderAll(); go('dash'); sr('Quincena configurada');
  await showAlert('¡Presupuesto fijado! 🚀\n\nLas barras del Dashboard ahora medirán tus gastos en base a este dinero.', 'Todo listo');
}

function calcDist(){
  // Toma el dinero real que tienes entre efectivo y cuentas
  const t = S.saldos.efectivo + totalCuentas(); 
  
  const dispEl = document.getElementById('q-total-disp');
  if (dispEl) dispEl.textContent = f(t);

  if(!t || t <= 0) { 
    document.getElementById('q-prev').innerHTML='<div class="emp" style="padding:10px;"><span class="emp-icon">💸</span>Agrega fondos en el Dashboard para ver la distribución</div>'; 
    return; 
  }
  
  const p = getPct();
  
  // 🔥 NUEVO DISEÑO HORIZONTAL (Monto gigante a la izquierda, tarjetas a la derecha)
  const html = `
    <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap; margin-bottom:10px;">
      <div style="flex-shrink:0;">
        <div style="font-family:var(--fm);font-weight:800;font-size:32px;color:var(--a1);letter-spacing:-1px;">${f(t)}</div>
        <div class="tm">Presupuesto a distribuir</div>
      </div>
      
      <div style="display:flex; gap:10px; flex:1; flex-wrap:wrap;">
        <div style="flex:1; min-width:110px; background:rgba(59,158,255,.05); border:1px solid rgba(59,158,255,.2); padding:12px; border-radius:8px;">
          <div style="font-size:10px; font-weight:700; color:var(--a4); margin-bottom:4px; text-transform:uppercase;">🏠 Necesidades (${p.n}%)</div>
          <div style="font-family:var(--fm); font-weight:700; font-size:16px;">${f(t*p.n/100)}</div>
        </div>
        
        <div style="flex:1; min-width:110px; background:rgba(255,214,10,.05); border:1px solid rgba(255,214,10,.2); padding:12px; border-radius:8px;">
          <div style="font-size:10px; font-weight:700; color:var(--a2); margin-bottom:4px; text-transform:uppercase;">🎉 Deseos (${p.d}%)</div>
          <div style="font-family:var(--fm); font-weight:700; font-size:16px;">${f(t*p.d/100)}</div>
        </div>
        
        <div style="flex:1; min-width:110px; background:rgba(0,220,130,.05); border:1px solid rgba(0,220,130,.2); padding:12px; border-radius:8px;">
          <div style="font-size:10px; font-weight:700; color:var(--a1); margin-bottom:4px; text-transform:uppercase;">💰 Ahorro (${p.a}%)</div>
          <div style="font-family:var(--fm); font-weight:700; font-size:16px;">${f(t*p.a/100)}</div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('q-prev').innerHTML = html;
}

function drBar(l,pct,m,col){return`<div class="dr"><div class="dl">${l}</div><div class="dbw"><div class="db" style="width:${pct}%;background:${col}"></div></div><div class="dp">${pct}%</div><div class="da">${f(m)}</div></div>`;}

async function resetTodo() {
  const ok = await showPromptConfirm('Esta acción eliminará TODOS tus datos. NO se puede deshacer.','BORRAR','🗑️ Borrar TODOS los datos');
  if(!ok) return;
  localStorage.removeItem('fco_v4'); Object.keys(S).forEach(key => delete S[key]);
  Object.assign(S, {tipoPeriodo:'q1', quincena:1, ingreso:0, metodo:'50-30-20', saldos:{efectivo:0, banco:0}, cuentas:[], gastos:[], objetivos:[], deudas:[], modoDeuda:'avalancha', historial:[], gastosFijos:[], pagosAgendados:[], inversiones:[], fondoEmergencia:{objetivoMeses:6, actual:0}});
  
  renderAll(); go('dash'); await showAlert('✅ Todos los datos han sido eliminados.','Listo');

}

async function resetQuincena() { 
    const ok = await showConfirm('Esto elimina los gastos del período actual. Tus objetivos y deudas NO se verán afectados.','↺ Resetear período');
    if(!ok) return; 
    S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>refF(g.fondo, g.montoTotal||g.monto)); 
    const mes = mesStr();
    S.gastosFijos.forEach(g => { g.pagadoEn = g.pagadoEn.filter(m => m !== mes); });
    S.gastos=[]; 
    S.ingreso=0; 
    save(); 
    renderAll(); 
    go('dash'); 
}

// ─── 3. SALDOS Y FONDOS ───
function updSaldo(){
  if (S.cuentas && S.cuentas.length > 0) {
    S.saldos.banco = S.cuentas.reduce((s,c) => s + c.saldo, 0);
  }
  const ef=S.saldos.efectivo, bk=S.saldos.banco, tot=ef+bk;
  ['d-ef','g-ef','q-efc'].forEach(i=>{const e=document.getElementById(i);if(e)e.textContent=f(ef);});
  ['d-bk','g-bk','q-bkc'].forEach(i=>{const e=document.getElementById(i);if(e)e.textContent=f(bk);});
  const te=document.getElementById('d-tot');if(te)te.textContent=f(tot);
  
  actualizarListasFondos();
  
  // MAGIA: Actualiza la previsualización de la quincena en tiempo real
  
  if (typeof calcDist === 'function' && document.getElementById('sec-quin')?.classList.contains('active')) {
    calcDist();
  }

}

function desF(fo, mo){
  if(fo==='efectivo') S.saldos.efectivo = Math.max(0, S.saldos.efectivo - mo);
  else if(fo.startsWith('cuenta_')){
    const cId = +fo.split('_')[1]; const c = S.cuentas.find(x=>x.id===cId);
    if(c) c.saldo = Math.max(0, c.saldo - mo);
    S.saldos.banco = totalCuentas();
  } else S.saldos.banco = Math.max(0, S.saldos.banco - mo);
  updSaldo();
}

function refF(fo, mo){
  if(fo==='efectivo') S.saldos.efectivo += mo;
  else if(fo.startsWith('cuenta_')){
    const cId = +fo.split('_')[1]; const c = S.cuentas.find(x=>x.id===cId);
    if(c) c.saldo += mo;
    S.saldos.banco = totalCuentas();
  } else S.saldos.banco += mo;
  updSaldo();
}

// ─── 4. GASTOS, SEMÁFORO Y HORMIGA ───
function actualizarSemaforo() {
  const mInput = document.getElementById('g-mo'); const tInput = document.getElementById('g-ti'); const infoEl = document.getElementById('g-semaforo');
  if(!mInput || !tInput || !infoEl) return;
  const monto = +mInput.value || 0; const tipo = tInput.value;
  if (monto <= 0 || S.ingreso <= 0) { infoEl.style.display = 'none'; return; }
  const p = getPct(); let limite = 0, etiqueta = '';
  
  if (tipo === 'necesidad') { limite = S.ingreso * (p.n / 100); etiqueta = 'gastos del mes'; }
  else if (tipo === 'ahorro') { limite = S.ingreso * (p.a / 100); etiqueta = 'lo que querías ahorrar'; }
  else {
    // Hormiga y Deseo comparten el mismo presupuesto — son antojos de distinto tamaño
    limite = S.ingreso * (p.d / 100);
    etiqueta = 'antojos y gustos';
  }
  // Si es hormiga, sumamos TAMBIÉN los gastos de deseo contra ese mismo límite
  const yaGastado = (tipo === 'hormiga')
    ? S.gastos.filter(g => g.tipo === 'deseo' || g.tipo === 'hormiga' || g.hormiga).reduce((s, g) => s + (g.montoTotal || g.monto), 0)
    : S.gastos.filter(g => g.tipo === tipo).reduce((s, g) => s + (g.montoTotal || g.monto), 0);
  const disponible = (limite - yaGastado) - monto;
  infoEl.style.display = 'block';
  if (disponible < 0) {
    infoEl.style.background = 'rgba(255,68,68,.1)'; infoEl.style.color = 'var(--dan)'; infoEl.style.border = '1px solid rgba(255,68,68,.3)';
    infoEl.innerHTML = `🚨 ¡Ojo! Este gasto se pasa de tu cupo de ${etiqueta} por ${f(Math.abs(disponible))}. Toca revisar.`;
  } else if (disponible <= 100000) {
    infoEl.style.background = 'rgba(255,214,10,.1)'; infoEl.style.color = 'var(--a2)'; infoEl.style.border = '1px solid rgba(255,214,10,.3)';
    infoEl.innerHTML = `⚠️ Vas bien, pero después de esto solo te quedarían ${f(disponible)} para ${etiqueta}.`;
  } else {
    infoEl.style.background = 'rgba(0,220,130,.1)'; infoEl.style.color = 'var(--a1)'; infoEl.style.border = '1px solid rgba(0,220,130,.3)';
    infoEl.innerHTML = `✅ Todo bien. Después de este gasto aún tienes ${f(disponible)} disponibles para ${etiqueta}.`;
  }
}

function prev4k() {
  const mo = +document.getElementById('g-mo').value || 0;
  const ck = document.getElementById('g-4k')?.checked;
  const el = document.getElementById('p4k');
  
  if (ck && mo > 0) {
    el.style.display = 'block';
    // Se agregan atributos de accesibilidad directamente al mostrar la alerta
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    
    el.innerHTML = `
      <span style="font-weight: 700; color: var(--t1);">Impuesto 4x1000 (GMF): +${f(mo * GMF_TASA)}</span> 
      ➔ Total a debitar: <span style="color: var(--a3); font-weight: 800;">${f(mo * 1.004)}</span>
      <br>
      <span style="font-size: 0.85rem; color: var(--t3); display: block; margin-top: 0.5rem;">
        💡 <strong>Tip Legal:</strong> Puedes marcar <strong>una cuenta</strong> como exenta del GMF ante tu banco. Los primeros ${f(GMF_EXENTO_MONTO)}/mes (${GMF_EXENTO_UVT} UVT) en esa cuenta no pagan el impuesto (Art. 879 E.T.).
      </span>
    `;
  } else if (el) {
    el.style.display = 'none';
    el.removeAttribute('role');
    el.innerHTML = '';
  }
}

function calcularImpactoHormiga() {
  const ti = document.getElementById('g-ti')?.value;
  const mo = +document.getElementById('g-mo')?.value || 0;
  const infoEl = document.getElementById('g-hormiga-impact');
  if (!infoEl) return;

  if (ti !== 'hormiga' || mo <= 0) { infoEl.style.display = 'none'; return; }

  const anual = mo * 365;

  // Construimos el mensaje base
  let msg = `🐜 <strong>Impacto real:</strong> Si repites este gasto a diario, en un año habrás perdido <strong>${f(anual)}</strong>.`;

  if (S.objetivos && S.objetivos.length > 0) {
    // Buscamos el objetivo con la meta de ahorro más alta — el más ambicioso
    const metaGrande = S.objetivos.reduce((mayor, o) =>
      (o.objetivoAhorro || 0) > (mayor.objetivoAhorro || 0) ? o : mayor
    , S.objetivos[0]);

    if (metaGrande && metaGrande.objetivoAhorro > 0) {
      const veces = anual / metaGrande.objetivoAhorro;

      if (veces >= 1) {
        // Puede costear la meta completa N veces
        const vecesRedondeado = Math.floor(veces * 10) / 10;
        msg += `<br><br>Con esa plata podrías lograr tu meta <em>"${he(metaGrande.nombre)}"</em> <strong>${vecesRedondeado >= 2 ? Math.floor(veces) + ' veces' : 'completa'}</strong>${vecesRedondeado >= 2 ? ' seguidas' : ''}.`;
      } else {
        // Solo cubre un porcentaje de la meta
        const pct = Math.round(veces * 100);
        const mesesParaMeta = Math.ceil(metaGrande.objetivoAhorro / (mo * 30));
        msg += `<br><br>Eso es el <strong>${pct}%</strong> de tu meta <em>"${he(metaGrande.nombre)}"</em>. Guardando esa plata en vez de gastarla, en <strong>${mesesParaMeta} meses</strong> la tendrías lista.`;
      }
    }
  } else {
    // Sin objetivos: comparamos con referencias cotidianas colombianas
    const smmlv = 1_750_905;
    if (anual >= smmlv) {
      const salarios = (anual / smmlv).toFixed(1);
      msg += `<br><br>Eso equivale a <strong>${salarios} salario${salarios > 1 ? 's' : ''} mínimo${salarios > 1 ? 's' : ''}</strong> al año. Crea un objetivo en Finko para ponerle nombre a ese dinero.`;
    }
  }

  infoEl.innerHTML = msg;
  infoEl.style.display = 'block';
}

async function agregarGasto() {
  const de = document.getElementById('g-de').value.trim(); const mo = +document.getElementById('g-mo').value; const ca = document.getElementById('g-ca').value;
  if (!de || !mo || !ca) { await showAlert('Falta el nombre del gasto, la plata o la categoría. Revísalos y vuelve a intentar.', 'Faltan datos'); return; }
  const fx = document.getElementById('g-4k').checked; const montoTotal = fx ? Math.round(mo * 1.004) : mo;
  const fo = document.getElementById('g-fo').value; const ti = document.getElementById('g-ti').value; 
  
  if (ti !== 'ahorro') {
    let disp = 0;
    if (fo === 'efectivo') {
      disp = S.saldos.efectivo;
    } else if (fo.startsWith('cuenta_')) {
      const cuenta = S.cuentas.find(x => x.id === +fo.split('_')[1]);
      if (!cuenta) { await showAlert('La cuenta seleccionada ya no existe. Selecciona otra.', 'Cuenta no encontrada'); return; }
      disp = cuenta.saldo;
    } else {
      disp = S.saldos.banco;
    }
    if (disp < montoTotal) { const ok = await showConfirm(`⚠️ Saldo insuficiente (${f(disp)} disponible).\n\n¿Continuar de todas formas?`, 'Saldo'); if (!ok) return; }
  }
  
  S.gastos.unshift({ id: Date.now(), desc: de, monto: mo, montoTotal, cat: ca, tipo: ti, fondo: fo, hormiga: (ti === 'hormiga'), cuatroXMil: fx, fecha: document.getElementById('g-fe').value || hoy(), metaId: '', autoFijo: false });
  if (ti !== 'ahorro') desF(fo, montoTotal);
  
  ['g-de','g-mo'].forEach(i=>document.getElementById(i).value=''); document.getElementById('g-4k').checked = false; 
  const p4k = document.getElementById('p4k'); if(p4k) p4k.style.display = 'none'; 
  const sem = document.getElementById('g-semaforo'); if(sem) sem.style.display = 'none'; 
  const hor = document.getElementById('g-hormiga-impact'); if(hor) hor.style.display='none';
  
  save(); renderSmart(['gastos', 'stats']); sr('Gasto registrado');
}

function renderGastos(){
  const tb = document.getElementById('g-tab'); 
  const q = (document.getElementById('g-search')?.value||'').toLowerCase().trim();
  let list = S.gastos;
  
  if (q) list = list.filter(g => (g.desc||'').toLowerCase().includes(q) || (CATS[g.cat]||g.cat).toLowerCase().includes(q));
  if (_filtroGasto === '4x1000') list = list.filter(g => g.cuatroXMil);
  else if (_filtroGasto === 'hormiga') list = list.filter(g => g.hormiga || g.tipo === 'hormiga');
  else if (_filtroGasto) list = list.filter(g => g.tipo === _filtroGasto);
  if (!list.length) {
    tb.innerHTML = q
      ? `<tr><td colspan="9" class="emp">Sin resultados para esa búsqueda</td></tr>`
      : '<tr><td colspan="9" class="emp">Sin gastos registrados este período</td></tr>';
    return;
  }

  const _totalGastos = list.length;
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
      <td style="font-size:10px">${CATS[g.cat]||g.cat}</td>
      <td><span class="pill ${g.tipo==='necesidad'?'pb':g.tipo==='ahorro'?'pg':'py'}">${g.tipo}</span></td>
      <td><span class="pill pm">${cIcono} ${he(cNom)}</span></td>
      <td>${g.hormiga?'🐜':'—'}</td>
      <td>${g.cuatroXMil?'<span class="pill pt">✓</span>':'—'}</td>
      <td class="ac mono" style="color:${g.tipo==='ahorro'?'var(--a1)':'var(--a3)'};font-weight:600">${f(g.montoTotal||g.monto)}</td>
      <td style="display:flex;gap:4px"><button class="btn bg bsm" onclick="abrirEditarGasto(${g.id})">✏️</button><button class="btn bd bsm" onclick="delGasto(${g.id})">×</button></td>
    </tr>`;
  }).join('');

  // Si hay más de 80 gastos, avisarle al usuario — no se pierden, solo no caben en pantalla
  if (_totalGastos > 80) {
    tb.innerHTML += `<tr><td colspan="9" style="text-align:center; padding:12px; color:var(--a2); font-size:11px; font-weight:600;">
      Mostrando 80 de ${_totalGastos} gastos. Usa el buscador para encontrar los demás.
    </td></tr>`;
  }
}

async function delGasto(id){
  const ok = await showConfirm('¿Eliminar este gasto del historial? Esta acción no se puede deshacer.', 'Eliminar gasto');
  if (!ok) return;
  const g = S.gastos.find(x => x.id === id); if(g && g.tipo !== 'ahorro') refF(g.fondo, g.montoTotal || g.monto);
  if(g && g.autoFijo && g.fijoRef){ const mes = mesStr(); const fijo = S.gastosFijos.find(x => x.id === g.fijoRef); if(fijo) fijo.pagadoEn = fijo.pagadoEn.filter(m => m !== mes); }
  S.gastos = S.gastos.filter(x => x.id !== id); save(); renderSmart(['gastos', 'stats']);
}

function abrirEditarGasto(id) {
  const g = S.gastos.find(x => x.id === id);
  if (!g) return;
  document.getElementById('eg-id').value = id;
  document.getElementById('eg-de').value = g.desc;
  document.getElementById('eg-mo').value = g.monto;
  document.getElementById('eg-ca').value = g.cat;
  document.getElementById('eg-ti').value = g.tipo;
  // hormiga se deriva del tipo al guardar
  document.getElementById('eg-fe').value = g.fecha;
  const hiddenFo = document.getElementById('eg-fo');
  if (hiddenFo) hiddenFo.value = g.fondo || 'efectivo';
  actualizarListasFondos();
  openM('m-edit-gasto');
}
async function guardarEditarGasto() {
  const id = +document.getElementById('eg-id').value;
  const g = S.gastos.find(x => x.id === id);
  if (!g) return;
  const nMonto = +document.getElementById('eg-mo').value;
  const nFondo = document.getElementById('eg-fo').value;
  if (!nMonto) return;
  if (g.tipo !== 'ahorro') refF(g.fondo, g.montoTotal || g.monto);
  g.desc = document.getElementById('eg-de').value.trim();
  g.monto = nMonto;
  g.montoTotal = nMonto;
  g.cat = document.getElementById('eg-ca').value;
  g.tipo = document.getElementById('eg-ti').value;
  g.fondo = nFondo;
  g.hormiga = (document.getElementById('eg-ti').value === 'hormiga');
  g.fecha = document.getElementById('eg-fe').value;
  if (g.tipo !== 'ahorro') desF(nFondo, nMonto);
  closeM('m-edit-gasto');
  save();
  renderSmart(['gastos', 'stats']);
}

async function limpiarGastos() {
  const ok = await showConfirm(
    '¿Eliminar todos los gastos del período actual? Tus fijos y objetivos no se tocan.',
    'Limpiar período'
  );
  if (!ok) return;

  // Devolver el dinero al fondo correspondiente (los ahorros no se revierten)
  S.gastos
    .filter(g => g.tipo !== 'ahorro')
    .forEach(g => refF(g.fondo, g.montoTotal || g.monto));

  // Marcar los gastos fijos de este mes como pendientes de nuevo
  const mes = mesStr();
  S.gastosFijos.forEach(g => {
    g.pagadoEn = (g.pagadoEn || []).filter(m => m !== mes);
  });

  S.gastos = [];
  save();
  renderSmart(['gastos', 'stats']);
}

// ─── 5. GASTOS FIJOS ───
let idFijoPendiente = null;
async function guardarFijo(){
  const no = document.getElementById('gf-no').value.trim(); const mo = +document.getElementById('gf-mn').value;
  if(!no || !mo) return;
  const fx = document.getElementById('gf-4k').checked; const montoTotal = fx ? Math.round(mo * 1.004) : mo;
  S.gastosFijos.push({ id: Date.now(), nombre: no, monto: mo, montoTotal, cuatroXMil: fx, dia: +document.getElementById('gf-di').value || 1, periodicidad: document.getElementById('gf-pe') ? document.getElementById('gf-pe').value : 'mensual', tipo: document.getElementById('gf-ti').value, cat: document.getElementById('gf-ca').value, fondo: document.getElementById('gf-fo').value, pagadoEn: [] });
  ['gf-no','gf-mn'].forEach(i=>document.getElementById(i).value=''); document.getElementById('gf-4k').checked=false;
  setDayPicker('gf-di', '');
  // Colapsa el acordeón inline
  const _fb = document.getElementById('form-fijo-body');
  const _fa = document.getElementById('form-fijo-arrow');
  const _fi = document.getElementById('form-fijo-icon');
  if (_fb) _fb.style.display = 'none';
  if (_fa) _fa.style.transform = '';
  if (_fi) { _fi.textContent = '📌'; _fi.style.background = 'rgba(255,214,10,.15)'; _fi.style.borderColor = 'rgba(255,214,10,.3)'; }
  save(); renderFijos(); updateDash();
}

function renderFijos(){
  const mes = mesStr();
  const tot = S.gastosFijos.reduce((s,g) => s + (Number(g.monto) || 0), 0);
  const pag = S.gastosFijos.filter(g => g.pagadoEn.includes(mes));
  const totPag = pag.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const pend = tot - totPag;
  setEl('fi-tot', f(tot));
  setEl('fi-pag', f(totPag));
  setEl('fi-np', pag.length);
  setEl('fi-nt', S.gastosFijos.length);
  setEl('fi-pend', f(pend));
  setEl('fi-pend-txt', pend <= 0 ? '✅ Todo pagado' : `${S.gastosFijos.length - pag.length} fijo${S.gastosFijos.length - pag.length !== 1 ? 's' : ''} por cubrir`);

  // Mantiene sincronizado el resumen en Deudas cuando cambia el estado de los fijos
  renderFijosEnDeudas();

  const el = document.getElementById('fi-lst');
  if (!S.gastosFijos.length) {
    el.innerHTML = `
      <div style="text-align:center; padding:40px 20px; background:var(--s1); border-radius:16px; border:1px dashed rgba(0,220,130,.3);">
        <div style="font-size:48px; margin-bottom:14px;">📌</div>
        <div style="font-weight:800; font-size:17px; color:var(--t1); margin-bottom:8px;">Sin gastos fijos</div>
        <div style="color:var(--t3); font-size:13px; max-width:260px; margin:0 auto; line-height:1.6;">Agrega tus gastos recurrentes para tenerlos siempre bajo control.</div>
      </div>`;
    return;
  }

  el.innerHTML = S.gastosFijos.map(g => {
    const paid = g.pagadoEn.includes(mes);
    const mMostrar = g.cuatroXMil ? (g.montoTotal || Math.round(g.monto*1.004)) : g.monto;
    const icono = CATS[g.cat] ? CATS[g.cat].split(' ')[0] : '📦';
    const tiBadge = (g.tipo || 'necesidad') === 'deseo'
      ? '<span class="pill py">Deseo</span>'
      : '<span class="pill pb">Necesidad</span>';
    const perBadge = g.periodicidad === 'quincenal'
      ? '<span class="pill pm">↻ Quincenal</span>'
      : '<span class="pill pg">↻ Mensual</span>';
    const fondoLabel = g.fondo === 'efectivo' ? '💵 Efectivo' : '🏦 Banco';
    const gmfBadge = g.cuatroXMil ? '<span class="pill pt">+4×1000</span>' : '';

    return `
    <article class="fijo-card${paid ? ' pagado' : ''}" aria-label="Gasto fijo: ${he(g.nombre)}">

      <!-- CABECERA -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:16px 20px 14px; border-bottom:1px solid var(--b1); gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
          <div style="width:44px; height:44px; border-radius:12px; background:var(--s2); border:1px solid var(--b2); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;" aria-hidden="true">${icono}</div>
          <div style="min-width:0;">
            <div class="fijo-nombre" style="font-weight:800; font-size:15px; color:var(--t1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${he(g.nombre)}">${he(g.nombre)}</div>
            <div style="margin-top:5px; display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
              ${tiBadge} ${perBadge} ${gmfBadge}
            </div>
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-family:var(--fm); font-size:26px; font-weight:800; color:${paid ? 'var(--t3)' : 'var(--a4)'}; letter-spacing:-1px; line-height:1;">${f(mMostrar)}</div>
          <div style="font-size:10px; color:var(--t3); margin-top:4px;">📅 Día ${g.dia} · ${fondoLabel}</div>
        </div>
      </div>

      <!-- PIE -->
      <div style="padding:14px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        ${paid
          ? `<div style="display:flex; align-items:center; gap:8px; background:rgba(0,220,130,.1); border:1px solid rgba(0,220,130,.25); border-radius:8px; padding:6px 12px; flex-shrink:0;">
               <span style="font-size:14px;" aria-hidden="true">✅</span>
               <span style="font-size:12px; font-weight:700; color:var(--a1);">Pagado este mes</span>
             </div>`
          : `<div style="display:flex; align-items:center; gap:6px;">
               <div style="width:8px; height:8px; border-radius:50%; background:var(--a2); flex-shrink:0;" aria-hidden="true"></div>
               <span style="font-size:12px; font-weight:600; color:var(--a2);">Pendiente</span>
             </div>`
        }
        <div style="display:flex; gap:8px; margin-left:auto; align-items:center;">
          ${paid
            ? `<button class="btn bsm" onclick="desmFijo(${g.id})" style="color:var(--t3); background:transparent; border:1px solid var(--b2); font-size:11px; padding:5px 10px; border-radius:6px;" aria-label="Revertir pago de ${he(g.nombre)}" title="Marcar como NO pagado este mes">↩ Revertir</button>`
            : `<button class="btn bp bsm" onclick="abrirModalFijo(${g.id})" aria-label="Marcar como pagado ${he(g.nombre)}">✓ Pagar</button>`
          }
          <button class="btn-eliminar-deu" onclick="delFijo(${g.id})" style="padding:6px 12px;" aria-label="Eliminar ${he(g.nombre)}">🗑️</button>
        </div>
      </div>

    </article>`;
  }).join('');
}

function abrirModalFijo(id) { 
    const fx = S.gastosFijos.find(x => x.id == id); 
    if (!fx) return; 
    idFijoPendiente = id;
    document.getElementById('mf-nombre').innerText = fx.nombre;
    document.getElementById('mf-monto').innerText = f(fx.cuatroXMil ? (fx.montoTotal || Math.round(fx.monto*1.004)) : fx.monto); 
    actualizarListasFondos();
    
    // ESTA ES LA LÍNEA CRÍTICA QUE RELLENA EL BOTÓN VACÍO
    if(typeof updCustomFundButton === 'function') {
        updCustomFundButton('mf-fo');
    }
    
    openM('modal-pagar-fijo'); 
}

function cerrarModalFijo() { closeM('modal-pagar-fijo'); idFijoPendiente = null; }

async function ejecutarPagoFijo() {
  const fx = S.gastosFijos.find(x => x.id == idFijoPendiente); 
  if (!fx) return;
  
  const fo = document.getElementById('mf-fo').value;
  const m = fx.cuatroXMil ? (fx.montoTotal || Math.round(fx.monto*1.004)) : fx.monto;
  
  let disp = fo === 'efectivo' ? S.saldos.efectivo : (fo.startsWith('cuenta_') ? S.cuentas.find(x => x.id === +fo.split('_')[1])?.saldo : S.saldos.banco);
  if (disp < m) { 
    const ok = await showConfirm(`⚠️ Saldo insuficiente en la cuenta seleccionada (${f(disp)} disponible).\n¿Pagar de todas formas?`, 'Saldo'); 
    if (!ok) return; 
  }
  
  S.gastos.unshift({ id: Date.now(), desc: `📌 Fijo: ${fx.nombre}`, monto: fx.monto, montoTotal: m, cat: fx.cat || 'vivienda', tipo: fx.tipo || 'necesidad', fondo: fo, hormiga: false, cuatroXMil: fx.cuatroXMil || false, fecha: hoy(), autoFijo: true, fijoRef: fx.id });
  desF(fo, m); if (!fx.pagadoEn) fx.pagadoEn = []; fx.pagadoEn.push(mesStr());
  cerrarModalFijo(); save(); renderFijos(); renderGastos(); updateDash();
}

async function desmFijo(id){
  const g = S.gastosFijos.find(x=>x.id===id);
  if(!g) return;
  const ok = await showConfirm(`¿Marcar "${g.nombre}" como NO pagado?\n\nEsto revertirá el descuento de tu saldo.`, 'Desmarcar pago');
  if(!ok) return;
  const mes = mesStr();
  g.pagadoEn = g.pagadoEn.filter(m=>m!==mes);
  const idx = S.gastos.findIndex(x => x.autoFijo && x.fijoRef === id && x.fecha.slice(0,7) === mes);
  if(idx !== -1){ const gasto = S.gastos[idx]; refF(gasto.fondo, gasto.montoTotal || gasto.monto); S.gastos.splice(idx,1); }
  save(); renderFijos(); renderGastos(); updateDash();
}
async function delFijo(id){ const ok = await showConfirm('¿Eliminar gasto fijo?','Eliminar'); if(!ok) return; S.gastosFijos = S.gastosFijos.filter(x=>x.id!==id); save(); renderFijos(); }

// ─── 6. OBJETIVOS UNIFICADOS ───
function toggleTipoObjetivo() { const isEvento = document.getElementById('obj-tipo').value === 'evento'; document.getElementById('obj-pres-container').style.display = isEvento ? 'block' : 'none'; }
function openNuevoObjetivo() { document.getElementById('obj-tipo').value = 'ahorro'; toggleTipoObjetivo(); ['obj-no','obj-ahorro','obj-pres','obj-fe'].forEach(i=>document.getElementById(i).value=''); openM('m-objetivo'); }

async function guardarObjetivo() {
  const nombre = document.getElementById('obj-no').value.trim(); const tipo = document.getElementById('obj-tipo').value; const objAhorro = +document.getElementById('obj-ahorro').value || 0;
  if (!nombre || !objAhorro) { await showAlert('Completa el nombre y la meta de ahorro.', 'Campos requeridos'); return; }
  S.objetivos.push({ id: Date.now(), nombre, tipo, icono: document.getElementById('obj-ic').value, fecha: document.getElementById('obj-fe').value, objetivoAhorro: objAhorro, ahorrado: 0, presupuesto: tipo === 'evento' ? (+document.getElementById('obj-pres').value || 0) : 0, gastado: 0, gastos: [] });
  closeM('m-objetivo'); save(); renderObjetivos(); populateSelectObjetivos(); updateDash(); sr('Objetivo creado');
}

function renderObjetivos() {
  const el = document.getElementById('obj-lst'); if (!el) return;
  if (!S.objetivos || !S.objetivos.length) { el.innerHTML = '<div class="emp"><span class="emp-icon">🎯</span>Sin objetivos. ¡Crea el primero!</div>'; return; }
  
  el.innerHTML = S.objetivos.map(o => {
    const pctAhorro = o.objetivoAhorro > 0 ? Math.min((o.ahorrado / o.objetivoAhorro) * 100, 100) : 0;
    const colAhorro = pctAhorro >= 100 ? 'var(--a1)' : pctAhorro > 50 ? 'var(--a2)' : 'var(--a4)';
    let html = `<article class="pcard"><div class="pcard-header"><div><div class="pname">${o.icono} ${he(o.nombre)} <span class="pill ${o.tipo==='evento'?'pb':'pp'}">${o.tipo==='evento'?'Evento':'Ahorro'}</span></div></div><button class="btn bd bsm" onclick="delObjetivo(${o.id})">×</button></div>`;
    html += `<div class="pcard-meta" style="margin-bottom: ${o.tipo === 'evento' ? '12px' : '0'}"><div class="pcard-section-title"><span style="color:var(--a4)">💰 FASE DE AHORRO</span><button class="btn bbl bsm" onclick="abrirAccionObj(${o.id}, 'abonar')">+ Abonar</button></div><div class="ga"><span class="tm">Meta: <strong>${f(o.objetivoAhorro)}</strong></span><span class="tm">Ahorrado: <strong style="color:${colAhorro}">${f(o.ahorrado)}</strong></span><strong style="color:${colAhorro};font-family:var(--fm)">${Math.round(pctAhorro)}%</strong></div><div class="pw" style="margin-top:8px"><div class="pf" style="width:${pctAhorro}%;background:${colAhorro}"></div></div></div>`;
    if (o.tipo === 'evento') {
      const pctGasto = o.presupuesto > 0 ? Math.min((o.gastado / o.presupuesto) * 100, 100) : 0;
      const colGasto = pctGasto >= 100 ? 'var(--dan)' : pctGasto > 75 ? 'var(--a2)' : 'var(--a1)';
      html += `<div class="pcard-budget"><div class="pcard-section-title"><span style="color:var(--a1)">📦 PRESUPUESTO DE GASTOS</span><button class="btn bp bsm" onclick="abrirAccionObj(${o.id}, 'gastar')">+ Gastar</button></div><div class="ga"><span class="tm">Presupuesto: <strong>${f(o.presupuesto)}</strong></span><span class="tm">Gastado: <strong style="color:${colGasto}">${f(o.gastado)}</strong></span><strong style="color:${colGasto};font-family:var(--fm)">${Math.round(pctGasto)}% usado</strong></div><div class="pw" style="margin-top:8px"><div class="pf" style="width:${pctGasto}%;background:${colGasto}"></div></div></div>`;
    }
    // ── Simulador de frecuencias al final de cada tarjeta ──
    const falta = Math.max(0, o.objetivoAhorro - o.ahorrado);
    if (falta > 0) {
      const tienesFecha = o.fecha && new Date(o.fecha + 'T12:00:00') > new Date();
      const diasRestantes = tienesFecha
        ? Math.ceil((new Date(o.fecha + 'T12:00:00') - new Date()) / 86400000)
        : 0;

      html += `<div style="padding:0 20px 20px;">`;

      if (tienesFecha) {
        // Tiene fecha: mostrar las 4 frecuencias calculadas automáticamente
        const frecs = [
          { label: 'Diario',    dias: 1  },
          { label: 'Semanal',   dias: 7  },
          { label: 'Quincenal', dias: 15 },
          { label: 'Mensual',   dias: 30 },
        ];
        const celdas = frecs.map(fr => {
          const periodos = Math.max(1, diasRestantes / fr.dias);
          return `
            <div style="background:rgba(157,115,235,.06); border:1px solid rgba(157,115,235,.15); border-radius:8px; padding:10px; text-align:center;">
              <div style="font-size:9px; color:var(--a5); font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px;">${fr.label}</div>
              <div style="font-family:var(--fm); font-size:15px; font-weight:800; color:var(--t1);">${f(falta / periodos)}</div>
            </div>`;
        }).join('');
        html += `
          <div style="background:rgba(157,115,235,.04); border:1px solid rgba(157,115,235,.12); border-radius:var(--r2); padding:14px;">
            <div style="font-size:11px; font-weight:700; color:var(--a5); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
              <span>📅 ¿Cuánto apartar para llegar a tiempo?</span>
              <span style="font-weight:400; color:var(--t3);">${diasRestantes} días restantes</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:6px;">${celdas}</div>
          </div>`;
      } else {
        // Sin fecha: calculadora interactiva
        html += `
          <div style="background:rgba(157,115,235,.04); border:1px solid rgba(157,115,235,.12); border-radius:var(--r2); padding:14px;">
            <div style="font-size:11px; font-weight:700; color:var(--a5); margin-bottom:10px;">📅 Simula cómo llegar a tu meta</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <input type="number" id="sim-ap-${o.id}" placeholder="¿Cuánto puedes apartar?" inputmode="decimal"
                style="flex:1; min-width:130px; font-size:12px;" oninput="calcSimObj(${o.id}, ${falta})">
              <select id="sim-fr-${o.id}" onchange="calcSimObj(${o.id}, ${falta})" style="flex:1; min-width:110px; font-size:12px;">
                <option value="30">Mensual</option>
                <option value="15" selected>Quincenal</option>
                <option value="7">Semanal</option>
                <option value="1">Diario</option>
              </select>
            </div>
            <div id="sim-rs-${o.id}"></div>
          </div>`;
      }
      html += `</div>`;
    }

    return html + `</article>`;
  }).join('');
}

function abrirAccionObj(id, accion) {
  const obj = S.objetivos.find(x => x.id === id); if (!obj) return;
  document.getElementById('oa-id').value = id; 
  document.getElementById('oa-tipo-accion').value = accion;
  document.getElementById('oa-tit').textContent = accion === 'abonar' ? `Abonar a: ${obj.nombre}` : `Gasto en: ${obj.nombre}`;
  document.getElementById('oa-lbl-mo').textContent = accion === 'abonar' ? 'Monto a guardar (COP)' : 'Monto gastado (COP)';
  document.getElementById('oa-fg-desc').style.display = accion === 'gastar' ? 'block' : 'none';
  document.getElementById('oa-mo').value = ''; 
  document.getElementById('oa-desc').value = '';
  
  const coachEl = document.getElementById('oa-coach-msg');
  if (coachEl) coachEl.style.display = 'none';

  openM('m-obj-accion');
  if (accion === 'gastar') evaluarGastoEvento();
}

function evaluarGastoEvento() {
  const accion = document.getElementById('oa-tipo-accion').value;
  if (accion !== 'gastar') return;

  const id = +document.getElementById('oa-id').value;
  const obj = S.objetivos.find(x => x.id === id);
  const coachEl = document.getElementById('oa-coach-msg');

  if (!obj || obj.tipo !== 'evento' || !coachEl || obj.presupuesto <= 0) {
     if(coachEl) coachEl.style.display = 'none';
     return;
  }

  const inputMonto = +document.getElementById('oa-mo').value || 0;
  const totalProyectado = obj.gastado + inputMonto;
  const porcentaje = (totalProyectado / obj.presupuesto) * 100;
  const disponibleReal = obj.presupuesto - obj.gastado;

  coachEl.style.display = 'block';

  if (totalProyectado > obj.presupuesto) {
     coachEl.style.background = 'rgba(255,68,68,.1)'; coachEl.style.color = 'var(--dan)'; coachEl.style.border = '1px solid rgba(255,68,68,.3)';
     coachEl.innerHTML = `🚨 <strong>¡Presupuesto superado!</strong> Te estás pasando por ${f(totalProyectado - obj.presupuesto)}.`;
  } else if (porcentaje >= 80) {
     coachEl.style.background = 'rgba(255,214,10,.1)'; coachEl.style.color = 'var(--a2)'; coachEl.style.border = '1px solid rgba(255,214,10,.3)';
     coachEl.innerHTML = `⚠️ <strong>¡Cuidado!</strong> Alcanzarás el ${Math.round(porcentaje)}% de tu presupuesto. Solo te quedarán ${f(obj.presupuesto - totalProyectado)} para el resto del evento.`;
  } else {
     coachEl.style.background = 'rgba(0,220,130,.1)'; coachEl.style.color = 'var(--a1)'; coachEl.style.border = '1px solid rgba(0,220,130,.3)';
     coachEl.innerHTML = `✅ <strong>Vas súper bien.</strong> Tienes ${f(disponibleReal)} disponibles. Al registrar esto, te seguirán quedando ${f(obj.presupuesto - totalProyectado)}.`;
  }
}

async function ejecutarAccionObjetivo() {
  const id = +document.getElementById('oa-id').value; 
  const accion = document.getElementById('oa-tipo-accion').value; 
  const monto = +document.getElementById('oa-mo').value; 
  const fondo = document.getElementById('oa-fo').value; 
  const desc = document.getElementById('oa-desc').value.trim();
  
  const obj = S.objetivos.find(x => x.id === id); 
  if (!obj || !monto) return;
  
  if (accion === 'gastar') {
    if (!desc) { await showAlert('Escribe en qué gastaste el dinero.', 'Falta descripción'); return; }
    
    if (obj.tipo === 'evento' && obj.presupuesto > 0) {
       if ((obj.gastado + monto) > obj.presupuesto) {
          const ok = await showConfirm(`🚨 Vas a superar el presupuesto de este evento por ${f((obj.gastado + monto) - obj.presupuesto)}.\n\n¿Estás completamente seguro de registrar este gasto?`, 'Presupuesto Roto');
          if (!ok) return;
       }
    }
  }

  if (accion === 'abonar') {
    obj.ahorrado = Math.min(obj.ahorrado + monto, obj.objetivoAhorro); desF(fondo, monto); 
    S.gastos.unshift({ id: Date.now(), desc: `🎯 Ahorro: ${obj.nombre}`, monto, montoTotal: monto, cat: 'ahorro', tipo: 'ahorro', fondo, hormiga: false, cuatroXMil: false, fecha: hoy(), metaId: id, autoFijo: false });
  } else {
    obj.gastado += monto; if(!obj.gastos) obj.gastos = []; obj.gastos.push({ desc, monto, fecha: hoy() }); desF(fondo, monto);
    S.gastos.unshift({ id: Date.now(), desc: `${obj.icono} ${desc} (${obj.nombre})`, monto, montoTotal: monto, cat: 'otro', tipo: 'deseo', fondo, hormiga: false, cuatroXMil: false, fecha: hoy(), metaId: '', autoFijo: false });
  }
  
  closeM('m-obj-accion'); save(); renderObjetivos(); updateDash();
}

async function delObjetivo(id) { const ok = await showConfirm('¿Eliminar este objetivo por completo?', 'Eliminar Objetivo'); if (!ok) return; S.objetivos = S.objetivos.filter(o => o.id !== id); save(); renderObjetivos(); populateSelectObjetivos(); updateDash(); }

function populateSelectObjetivos() {
  const sel = document.getElementById('g-me'); if (!sel) return; const prev = sel.value; sel.innerHTML = '<option value="">— Sin objetivo —</option>';
  if(S.objetivos) S.objetivos.forEach(o => { const pct = o.objetivoAhorro > 0 ? Math.round((o.ahorrado / o.objetivoAhorro) * 100) : 0; sel.innerHTML += `<option value="${o.id}">${o.icono} ${he(o.nombre)} (${pct}%)</option>`; });
  if (prev && S.objetivos.find(o => o.id == prev)) sel.value = prev;
}

// Simulador inline dentro de cada tarjeta de objetivo (cuando el usuario escribe un aporte)
function calcSimObj(objId, falta) {
  const aporteEl = document.getElementById(`sim-ap-${objId}`);
  const frecEl   = document.getElementById(`sim-fr-${objId}`);
  const resEl    = document.getElementById(`sim-rs-${objId}`);
  if (!aporteEl || !frecEl || !resEl) return;

  const aporte   = +aporteEl.value || 0;
  const diasPer  = +frecEl.value || 15;
  if (aporte <= 0 || falta <= 0) { resEl.innerHTML = ''; return; }

  const periodos  = Math.ceil(falta / aporte);
  const diasTotal = periodos * diasPer;
  const nombres   = { 30: 'mes', 15: 'quincena', 7: 'semana', 1: 'día' };
  const frecNom   = nombres[diasPer] || 'período';

  let tiempoStr = '';
  if (diasTotal < 30) tiempoStr = `${diasTotal} días`;
  else if (diasTotal < 365) { const m = Math.ceil(diasTotal / 30); tiempoStr = `${m} mes${m !== 1 ? 'es' : ''}`; }
  else { const a = Math.floor(diasTotal / 365); const mr = Math.floor((diasTotal % 365) / 30); tiempoStr = `${a} año${a !== 1 ? 's' : ''}${mr > 0 ? ` y ${mr} mes${mr !== 1 ? 'es' : ''}` : ''}`; }

  resEl.innerHTML = `
    <div style="background:rgba(157,115,235,.1); border:1px solid rgba(157,115,235,.2); border-radius:8px; padding:10px; text-align:center; margin-top:8px;">
      <div style="font-size:11px; color:var(--t2); margin-bottom:3px;">Ahorrando <strong>${f(aporte)}</strong> por ${frecNom} llegarás en:</div>
      <div style="font-family:var(--fm); font-size:20px; font-weight:800; color:var(--a5);">${tiempoStr}</div>
      <div style="font-size:10px; color:var(--t3); margin-top:3px;">${periodos} ${frecNom}${periodos !== 1 ? 's' : ''}</div>
    </div>`;
}

// ─── 7. COACH DE DEUDAS ───
// Muestra un resumen de gastos fijos pendientes dentro de la sección Deudas.
// Así el usuario ve el panorama completo de compromisos del mes sin mezclar las secciones.
function renderFijosEnDeudas() {
  const el = document.getElementById('deu-fijos-resumen');
  if (!el) return;

  const mes = mesStr();
  const pendientes = S.gastosFijos.filter(g => !g.pagadoEn.includes(mes));

  // Si no hay fijos pendientes, ocultamos el bloque para no saturar
  if (!pendientes.length) { el.style.display = 'none'; return; }

  el.style.display = 'block';

  const totalPendiente = pendientes.reduce((s, g) => s + (g.monto || 0), 0);

  const filas = pendientes.map(g => {
    const icono = CATS[g.cat] ? CATS[g.cat].split(' ')[0] : '📦';
    const mMostrar = g.cuatroXMil ? (g.montoTotal || Math.round(g.monto * 1.004)) : g.monto;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--b1);">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:16px;" aria-hidden="true">${icono}</span>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--t1);">${he(g.nombre)}</div>
            <div style="font-size:10px; color:var(--t3);">📅 Día ${g.dia} · ${g.periodicidad}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--fm); font-weight:700; font-size:14px; color:var(--a2);">${f(mMostrar)}</div>
          ${g.cuatroXMil ? '<div style="font-size:9px; color:var(--t3);">incluye 4×1000</div>' : ''}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
      <div>
        <div class="ct" style="margin-bottom:2px;">📌 Fijos pendientes este mes</div>
        <div class="tm">Compromisos fijos que aún no has cubierto</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; margin-bottom:2px;">${pendientes.length} pendiente${pendientes.length > 1 ? 's' : ''}</div>
        <div style="font-family:var(--fm); font-weight:800; font-size:18px; color:var(--a2);">${f(totalPendiente)}</div>
      </div>
    </div>
    ${filas}
    <div style="display:flex; justify-content:flex-end; margin-top:12px;">
      <button class="btn bg bsm" onclick="go('gast')" style="font-size:11px;">Ver todos los fijos →</button>
    </div>`;
}

function setModoDeuda(m) {
  S.modoDeuda = m;
  const btnAva = document.getElementById('btn-ava');
  const btnBola = document.getElementById('btn-bola');
  if(btnAva) btnAva.className = m === 'avalancha' ? 'btn bp' : 'btn bg';
  if(btnBola) btnBola.className = m === 'bola' ? 'btn bp' : 'btn bg';

  const lista = document.getElementById('de-lst');
  if (lista) {
    lista.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    lista.style.opacity = '0';
    lista.style.transform = 'translateY(6px)';
    setTimeout(() => {
      save();
      renderDeudas();
      requestAnimationFrame(() => {
        lista.style.opacity = '1';
        lista.style.transform = 'translateY(0)';
      });
    }, 300);
  } else {
    save();
    renderDeudas();
  }
}

// ── Helpers internos — evitan repetir la misma lógica dos veces ──

function _selTipoDeudaBase(inputId, selectorClass, tipo, el) {
  document.getElementById(inputId).value = tipo;
  document.querySelectorAll(selectorClass).forEach(b => {
    b.style.background = 'var(--s2)';
    b.style.border = '2px solid var(--b2)';
    b.querySelector('span:last-child').style.color = 'var(--t3)';
  });
  el.style.background = 'rgba(59,158,255,.1)';
  el.style.border = '2px solid var(--a4)';
  el.querySelector('span:last-child').style.color = 'var(--a4)';
}

function _selFrecDeudaBase(inputId, idMensual, idQuincenal, frec) {
  document.getElementById(inputId).value = frec;
  const btnM = document.getElementById(idMensual);
  const btnQ = document.getElementById(idQuincenal);
  if (!btnM || !btnQ) return;
  const activo   = { border: '2px solid var(--a1)', background: 'rgba(0,220,130,.1)', color: 'var(--a1)' };
  const inactivo = { border: '2px solid var(--b2)', background: 'var(--s2)',           color: 'var(--t3)' };
  const esMensual = frec === 'mensual';
  Object.assign(btnM.style, esMensual ? activo : inactivo);
  Object.assign(btnQ.style, esMensual ? inactivo : activo);
}

// API pública — el HTML las sigue llamando igual, sin cambios en index.html
function selTipoDeuda(tipo, el)     { _selTipoDeudaBase('dn-ti', '.btn-tipo-deuda',      tipo, el); }
function selTipoDeudaEdit(tipo, el) { _selTipoDeudaBase('ed-ti', '.btn-tipo-deuda-edit', tipo, el); }
function selFrecDeuda(frec, el)     { _selFrecDeudaBase('dn-pe', 'btn-frec-mensual',      'btn-frec-quincenal',      frec); }
function selFrecDeudaEdit(frec, el) { _selFrecDeudaBase('ed-pe', 'btn-edit-frec-mensual', 'btn-edit-frec-quincenal', frec); }

async function guardarDeuda(){
  const no = document.getElementById('dn-no').value.trim(); 
  const to = +document.getElementById('dn-to').value; 
  const cu = +document.getElementById('dn-cu').value;
  const diaPago = +document.getElementById('dn-dia').value || 1; // Si no pone nada, asume el 1
  
  if(!no || !to || !cu){ await showAlert('Completa nombre, saldo y cuota.','Requerido'); return; }
  
  S.deudas.push({ id: Date.now(), nombre: no, total: Number(to), cuota: Number(cu),
    periodicidad: document.getElementById('dn-pe').value, 
    tasa: Number(document.getElementById('dn-ta').value) || 0, 
    tipo: document.getElementById('dn-ti').value, 
    diaPago: diaPago,
    pagado: 0
  });
  
  ['dn-no','dn-to','dn-cu','dn-ta', 'dn-dia'].forEach(i => { const e = document.getElementById(i); if(e) e.value=''; }); 
  closeM('m-deu'); save(); renderSmart(['deudas']);
}

// 🎯 NUEVO: Función inteligente que calcula la mora basándose en el día de corte y si ya se pagó este mes
function obtenerAlertaMora(deuda) {
  const diaPago = deuda.diaPago || 1;
  const hoy = new Date();
  
  // Clampea el día al último día real del mes (ej: día 30 en febrero → día 28)
  const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const diaReal = Math.min(diaPago, ultimoDiaMes);
  let fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth(), diaReal);
  
  // Si el día límite ya pasó, hay que revisar si el usuario hizo un abono a esta deuda ESTE MES
  if (hoy > fechaLimite) {
    const mesStr = hoy.toISOString().substring(0, 7); // ej: "2024-04"
    
    // Buscamos si en los gastos de este mes hay alguno que pertenezca a esta deuda
    const pagoHechoEsteMes = S.gastos.find(g => 
      g.cat === 'deudas' && 
      g.fecha.startsWith(mesStr) && 
      g.desc.includes(deuda.nombre)
    );

    // Si YA pagó este mes, o si el saldo total de la deuda ya es 0 (está saldada), no hay mora
    if (pagoHechoEsteMes || (deuda.total - deuda.pagado <= 0)) {
      return '';
    }

    // Si NO ha pagado, calculamos los días de mora
    const diasMora = Math.floor((hoy - fechaLimite) / (1000 * 60 * 60 * 24));
    
    if (diasMora <= 0) return ''; 
    if (diasMora < 30) return `<div class="alerta-mora alerta-leve" role="status" aria-live="polite" style="margin-top:10px; padding:10px; background:rgba(255,214,10,.1); color:var(--a2); border-radius:8px; border:1px solid rgba(255,214,10,.3); font-size:12px;"><span aria-hidden="true">⏳</span> <strong>Llevas ${diasMora} día${diasMora !== 1 ? 's' : ''} sin cubrir esta cuota.</strong> Entre más esperes, más se acumulan los intereses de mora.</div>`;
    if (diasMora < 90) return `<div class="alerta-mora alerta-media" role="alert" aria-live="assertive" style="margin-top:10px; padding:10px; background:rgba(255,107,53,.1); color:var(--a3); border-radius:8px; border:1px solid rgba(255,107,53,.3); font-size:12px;"><span aria-hidden="true">⚠️</span> <strong>${diasMora} días sin pagar.</strong> Tu historial en Datacrédito puede estar siendo afectado. Habla con el banco antes de que sea peor.</div>`;
    
    return `<div class="alerta-mora alerta-grave" role="alert" aria-live="assertive" style="margin-top:10px; padding:10px; background:rgba(255,68,68,.1); color:var(--dan); border-radius:8px; border:1px solid rgba(255,68,68,.3); font-size:12px;"><span aria-hidden="true">🚨</span> <strong>¡Cuidado! Llevas ${diasMora} días en mora.</strong> La ley obliga al banco a avisarte con 20 días de anticipación antes de reportarte a Datacrédito. Si no has recibido esa notificación, tienes derecho a exigirla.</div>`;
  }
  
  return ''; // Si la fecha límite aún no llega
}

function renderDeudas() {
  const sq = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + d.cuota, 0);
  const sm = S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0);
  let cPer = 0;
  if (S.tipoPeriodo === 'mensual') cPer = (sq * 2) + sm;
  else if (S.tipoPeriodo === 'q1') cPer = sq + sm;
  else cPer = sq;

  const totD = S.deudas.reduce((s, d) => s + Math.max(0, d.total - d.pagado), 0);
  const cuotaMensualReal = (sq * 2) + sm;
  let ingresoBase = S.ingreso > 0 ? S.ingreso : (S.saldos.efectivo + totalCuentas());
  let ingresoMensual = (S.tipoPeriodo === 'q1' || S.tipoPeriodo === 'q2') ? ingresoBase * 2 : ingresoBase;
  const pct = ingresoMensual > 0 ? Math.round((cuotaMensualReal / ingresoMensual) * 100) : 0;

  setEl('de-tot', f(totD));
  setEl('de-cp', f(cPer));

  const pe = document.getElementById('de-pct');
  const cardPct = document.getElementById('card-pct-ingreso');
  const cardMsg = document.getElementById('de-pct-msg');
  if (pe && cardPct) {
    if (pct > 100) {
      pe.innerHTML = `🚨 ${pct}<span style="font-size:16px; font-weight:600; margin-left:2px;">%</span>`;
      pe.style.color = 'var(--dan)';
      cardPct.style.background = 'rgba(255,68,68,.08)';
      cardPct.style.borderColor = 'rgba(255,68,68,.3)';
      if (cardMsg) { cardMsg.textContent = 'Tus deudas cuestan más de lo que ganas. ¡Hay que actuar urgente!'; cardMsg.style.color = 'var(--dan)'; }
    } else if (pct > 40) {
      pe.innerHTML = `⚠️ ${pct}<span style="font-size:16px; font-weight:600; margin-left:2px;">%</span>`;
      pe.style.color = 'var(--a2)';
      cardPct.style.background = 'rgba(255,214,10,.08)';
      cardPct.style.borderColor = 'rgba(255,214,10,.3)';
      if (cardMsg) { cardMsg.textContent = 'Más del 40% de tu plata se va en deudas. Intenta no adquirir más.'; cardMsg.style.color = 'var(--a2)'; }
    } else if (pct > 0) {
      pe.innerHTML = `✅ ${pct}<span style="font-size:16px; font-weight:600; margin-left:2px;">%</span>`;
      pe.style.color = 'var(--a1)';
      cardPct.style.background = 'var(--s1)';
      cardPct.style.borderColor = 'var(--b1)';
      if (cardMsg) { cardMsg.textContent = '¡Tus deudas están bajo control!'; cardMsg.style.color = 'var(--a1)'; }
    } else {
      pe.innerHTML = `✅ 0<span style="font-size:16px; font-weight:600; margin-left:2px;">%</span>`;
      pe.style.color = 'var(--a1)';
      cardPct.style.background = 'var(--s1)';
      cardPct.style.borderColor = 'var(--b1)';
      if (cardMsg) { cardMsg.textContent = ''; }
    }
  }

  // ── AVISOS FINANCIEROS INTELIGENTES ──
  const avisosEl = document.getElementById('de-avisos');
  if (avisosEl) {
    const avisos = [];
    const deudasVivas = S.deudas.filter(d => (d.total - d.pagado) > 0);
    const totalPendiente = deudasVivas.reduce((s, d) => s + (d.total - d.pagado), 0);

    // 0. TASA DE USURA — alerta si alguna deuda supera el límite legal
    // Usa la constante global TASA_USURA_EA (línea ~17). Actualizar allí cada trimestre.
    const deudasUsura = deudasVivas.filter(d => (d.tasa || 0) > TASA_USURA_EA);
    if (deudasUsura.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(255,68,68,.03);">
          <span style="font-size:20px; flex-shrink:0;">⚖️</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--dan); margin-bottom:3px;">Posible cobro ilegal — Tasa de Usura</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;"><strong style="color:var(--t2);">${deudasUsura.map(d => d.nombre).join(', ')}</strong> tiene una tasa registrada por encima del límite legal vigente (${TASA_USURA_EA}% E.A.). En Colombia, cobrar por encima de la tasa de usura es un delito. Consulta con la Superfinanciera o un abogado. <span style="background:var(--s2); border:1px solid var(--b2); border-radius:4px; padding:2px 6px; font-size:10px; font-weight:700; font-family:var(--fm);">⚖️ Art. 305 Código Penal</span></div>
          </div>
        </div>`);
    }

    // 1. UNIFICACIÓN — 2+ deudas con tasa >= 2%
    const deudasCaras = deudasVivas.filter(d => (d.tasa || 0) >= 2);
    if (deudasCaras.length >= 2) {
      const totalCaro = deudasCaras.reduce((s, d) => s + (d.total - d.pagado), 0);
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(59,158,255,.03);">
          <span style="font-size:20px; flex-shrink:0;">🏦</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a4); margin-bottom:3px;">Oportunidad: une tus deudas caras en una sola</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">Tienes <strong style="color:var(--t2);">${deudasCaras.length} deudas con tasas altas</strong> que suman <strong style="color:var(--t2);">${f(totalCaro)}</strong>. Ve a cualquier banco y pregunta por una <strong style="color:var(--a4);">compra de cartera</strong>: ellos pagan todas tus deudas y te dejan una sola cuota con tasa más baja. Es legal, gratuito pedirlo y puede reducir lo que pagas cada mes.</div>
          </div>
        </div>`);
    }

    // 2. SOLO PAGANDO MÍNIMOS — cuando la cuota apenas cubre intereses
    const deudasEstancadas = deudasVivas.filter(d => {
      if (!d.tasa || d.tasa <= 0 || !d.cuota) return false;
      const tasaMensual = Math.pow(1 + d.tasa / 100, 1 / 12) - 1;
      const interesMensual = (d.total - d.pagado) * tasaMensual;
      return d.cuota <= interesMensual * 1.1;
    });
    if (deudasEstancadas.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(255,68,68,.03);">
          <span style="font-size:20px; flex-shrink:0;">🚨</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--dan); margin-bottom:3px;">Trampa del mínimo — tu deuda casi no baja</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">En <strong style="color:var(--t2);">${deudasEstancadas.map(d => d.nombre).join(', ')}</strong> tu cuota solo alcanza a cubrir los intereses del mes. El saldo real casi no se mueve. Pagar $20.000 o $50.000 extra sobre la cuota puede cambiar completamente cuándo te liberas.</div>
          </div>
        </div>`);
    }

    // 3. REFINANCIACIÓN — cuando llevas más del 50% pagado en una deuda cara
    const candidatasRefin = deudasVivas.filter(d => {
      const pct = d.total > 0 ? (d.pagado / d.total) * 100 : 0;
      return pct >= 50 && (d.tasa || 0) >= 1.5;
    });
    if (candidatasRefin.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(0,220,130,.03);">
          <span style="font-size:20px; flex-shrink:0;">🔄</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a1); margin-bottom:3px;">Momento ideal para negociar una mejor tasa</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">Ya llevas más del 50% pagado en <strong style="color:var(--t2);">${candidatasRefin.map(d => d.nombre).join(', ')}</strong>. Eso te convierte en buen cliente. Llama al banco y pide que te bajen la tasa o mejoren las condiciones. Si no acceden, amenaza con llevar la deuda a otro banco. Eso suele funcionar.</div>
          </div>
        </div>`);
    }

    // 4. REGLA DEL 20% — deudas superan el 20% del ingreso
    if (pct > 20 && pct <= 40 && S.ingreso > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(255,214,10,.03);">
          <span style="font-size:20px; flex-shrink:0;">⚠️</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a2); margin-bottom:3px;">Más del 20% de tu ingreso va en deudas</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">Estás en el <strong style="color:var(--t2);">${pct}%</strong>. La regla general es no superar el 20%. No es una crisis, pero no adquieras nuevas deudas por ahora. Cada cuota que liquides libera espacio para ahorrar o invertir.</div>
          </div>
        </div>`);
    }

    // 5. FONDO DE EMERGENCIA — no tiene fondo pero sí tiene deudas
    const fondoActual = S.fondoEmergencia?.actual || 0;
    if (fondoActual === 0 && deudasVivas.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(180,78,255,.03);">
          <span style="font-size:20px; flex-shrink:0;">🛡️</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a5); margin-bottom:3px;">Sin colchón de emergencia — riesgo alto</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">Pagar deudas es importante, pero sin un fondo de emergencia cualquier imprevisto te obliga a endeudarte más. Guarda aunque sea <strong style="color:var(--t2);">entre el 5% y el 10% de tu ingreso mensual</strong> en un lugar separado. Empieza pequeño, lo que importa es el hábito.</div>
          </div>
        </div>`);
    }

    // 6. FELICITACIÓN — si el porcentaje de deuda es saludable
    if (pct > 0 && pct <= 20 && deudasVivas.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(0,220,130,.03);">
          <span style="font-size:20px; flex-shrink:0;">🌟</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a1); margin-bottom:3px;">Tus deudas están bajo control</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">Solo el <strong style="color:var(--a1);">${pct}%</strong> de tu ingreso va en deudas. Excelente. Cuando las termines de pagar, redirige esas cuotas al ahorro o a inversiones ya tienes el hábito de "no tener ese dinero disponible".</div>
          </div>
        </div>`);
    }

    // 7. MORA REAL — calculada desde el diaPago registrado en cada deuda
    const tiposFormales = ['tarjeta', 'credito', 'hipoteca', 'vehiculo', 'educacion', 'salud'];
    const hoyMora = new Date(); hoyMora.setHours(0,0,0,0);

    const deudasConMora = deudasVivas
      .filter(d => tiposFormales.includes(d.tipo) && d.diaPago)
      .map(d => {
        const diaPago = d.diaPago;
        // Clampea el día al último día real del mes actual
        const ultimoDiaActual = new Date(hoyMora.getFullYear(), hoyMora.getMonth() + 1, 0).getDate();
        const diaRealActual = Math.min(diaPago, ultimoDiaActual);
        const fechaLimiteMes = new Date(hoyMora.getFullYear(), hoyMora.getMonth(), diaRealActual);
        const retrocedeMes = hoyMora < fechaLimiteMes;

        // Determinamos la fecha límite real y el mes a verificar
        let fechaLimite, mesVerificar;
        if (retrocedeMes) {
          // El pago de este mes aún no vence → revisamos si pagó el mes pasado
          const mPrev = hoyMora.getMonth() - 1;
          const aPrev = mPrev < 0 ? hoyMora.getFullYear() - 1 : hoyMora.getFullYear();
          const mPrevReal = ((mPrev % 12) + 12) % 12;
          // Clampea también para el mes anterior
          const ultimoDiaPrev = new Date(aPrev, mPrevReal + 1, 0).getDate();
          const diaRealPrev = Math.min(diaPago, ultimoDiaPrev);
          fechaLimite = new Date(aPrev, mPrevReal, diaRealPrev);
          mesVerificar = `${aPrev}-${String(mPrevReal + 1).padStart(2,'0')}`;
        } else {
          // El pago de este mes ya venció → revisamos si pagó este mes
          fechaLimite = fechaLimiteMes;
          mesVerificar = `${hoyMora.getFullYear()}-${String(hoyMora.getMonth()+1).padStart(2,'0')}`;
        }

        // Si tiene pago registrado en el período correcto, no hay mora
        const pagadoEnPeriodo = S.gastos.some(g =>
          g.cat === 'deudas' &&
          g.fecha.startsWith(mesVerificar) &&
          g.desc.includes(d.nombre)
        );
        if (pagadoEnPeriodo) return null;

        // Si no tiene NINGÚN pago registrado Y el vencimiento no ha llegado aún, no es mora
        const tienePagosHistoricos = S.gastos.some(g => g.cat === 'deudas' && g.desc.includes(d.nombre));
        if (!tienePagosHistoricos && retrocedeMes) return null;

        const diasMora = Math.floor((hoyMora - fechaLimite) / 86400000);
        return diasMora > 0 ? { d, diasMora } : null;
      })
      .filter(Boolean);

    const enMora30 = deudasConMora.filter(x => x.diasMora >= 30 && x.diasMora < 60);
    const enMora60 = deudasConMora.filter(x => x.diasMora >= 60 && x.diasMora < 90);
    const enMora90 = deudasConMora.filter(x => x.diasMora >= 90);

    if (enMora90.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(255,68,68,.03);">
          <span style="font-size:20px; flex-shrink:0;">🚨</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--dan); margin-bottom:3px;">Riesgo de reporte en Datacrédito</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;"><strong style="color:var(--t2);">${enMora90.map(x => x.d.nombre).join(', ')}</strong> lleva${enMora90.length > 1 ? 'n' : ''} más de 90 días sin pago. Por ley, el banco debe avisarte con strong style="color:var(--dan)">20 días calendario de anticipación </strong> antes de reportarte (Ley 1266/2008, Art. 13) antes de reportarte. Si te reportan y pagas después, el registro negativo dura el doble del tiempo en mora (máximo 4 años). Actúa hoy.</div>
          </div>
        </div>`);
    }
    if (enMora60.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(255,107,53,.03);">
          <span style="font-size:20px; flex-shrink:0;">📞</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a3); margin-bottom:3px;">El banco puede llamarte a negociar</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;"><strong style="color:var(--t2);">${enMora60.map(x => x.d.nombre).join(', ')}</strong> lleva${enMora60.length > 1 ? 'n' : ''} entre 60 y 90 días sin pago. A los 2 meses, los bancos activan cobranza activa. <strong style="color:var(--t2);">Adelántate:</strong> llama tú primero y negocia un acuerdo antes de llegar a los 90 días críticos.</div>
          </div>
        </div>`);
    }
    if (enMora30.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(255,214,10,.03);">
          <span style="font-size:20px; flex-shrink:0;">⏳</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a2); margin-bottom:3px;">Retraso detectado</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;"><strong style="color:var(--t2);">${enMora30.map(x => x.d.nombre).join(', ')}</strong> lleva${enMora30.length > 1 ? 'n' : ''} más de 30 días sin pago. Paga pronto para evitar intereses de mora y no llegar a los 90 días críticos.</div>
          </div>
        </div>`);
    }

    avisosEl.innerHTML = avisos.length > 0 ? avisos.join('') : '';
  }

  // Sincroniza el resumen de fijos pendientes cada vez que se actualiza Deudas
  renderFijosEnDeudas();

  const el = document.getElementById('de-lst');
  if (!S.deudas.length) {
    el.innerHTML = `
      <div style="text-align:center; padding:48px 20px; background:var(--s1); border-radius:16px; border:1px dashed var(--a1); margin-top:20px;">
        <div style="font-size:64px; margin-bottom:16px;">🏆</div>
        <h3 style="color:var(--t1); margin-bottom:8px; font-size:22px;">¡Eres libre de deudas!</h3>
        <p style="color:var(--t3); font-size:14px; max-width:320px; margin:0 auto; line-height:1.6;">Has alcanzado uno de los logros financieros más importantes. Ahora enfócate en hacer crecer tu dinero.</p>
      </div>`;
    return;
  }

  const modo = S.modoDeuda || 'avalancha';
  let copia = [...S.deudas];

  const btnAva = document.getElementById('btn-ava');
  const btnBola = document.getElementById('btn-bola');
  if (btnAva) btnAva.className = modo === 'avalancha' ? 'btn bp' : 'btn bg';
  if (btnBola) btnBola.className = modo === 'bola' ? 'btn bp' : 'btn bg';

  const msgEl = document.getElementById('deu-coach-msg');
  
  if (modo === 'avalancha') {
    copia.sort((a, b) => {
      const tasaA = a.tasa || 0;
      const tasaB = b.tasa || 0;
      if (tasaA !== tasaB) return tasaB - tasaA; // Mayor tasa primero
      const saldoA = a.total - a.pagado;
      const saldoB = b.total - b.pagado;
      return saldoB - saldoA; // Si la tasa es igual, mayor saldo primero (genera más intereses)
    });
    if (msgEl) msgEl.innerHTML = `
      <div style="display:flex; gap:10px; align-items:flex-start;">
        <span style="font-size:20px; flex-shrink:0;">🔥</span>
        <div>
          <div style="font-weight:700; font-size:12px; color:var(--t1); margin-bottom:4px;">Método Avalancha — El más inteligente matemáticamente</div>
          <div style="font-size:11px; color:var(--t3); line-height:1.6;">Paga el <strong style="color:var(--t2);">mínimo en todas</strong> y mete todo el dinero extra a la deuda con la <strong style="color:var(--dan);">tasa más alta</strong>. Cuando la liquides, ese dinero se suma a la siguiente. Es el método que menos intereses te cobra en total. Al principio los resultados se ven lentos, pero es el más poderoso a largo plazo.</div>
        </div>
      </div>`;
  
  } else {
    copia.sort((a, b) => {
      const saldoA = a.total - a.pagado;
      const saldoB = b.total - b.pagado;
      if (saldoA !== saldoB) return saldoA - saldoB;
      return (b.tasa || 0) - (a.tasa || 0);
    });
    if (msgEl) msgEl.innerHTML = `
      <div style="display:flex; gap:10px; align-items:flex-start;">
        <span style="font-size:20px; flex-shrink:0;">⛄</span>
        <div>
          <div style="font-weight:700; font-size:12px; color:var(--t1); margin-bottom:4px;">Método Bola de Nieve — El más motivador psicológicamente</div>
          <div style="font-size:11px; color:var(--t3); line-height:1.6;">Paga el <strong style="color:var(--t2);">mínimo en todas</strong> y liquida primero la deuda <strong style="color:var(--a1);">más pequeña</strong>. Cada deuda que eliminas te da energía y flujo de caja para atacar la siguiente. Ideal si necesitas victorias rápidas para mantenerte motivado.</div>
        </div>
      </div>`;
  }

  const primeraVivaId = copia.find(d => (d.total - d.pagado) > 0)?.id;

  const iconoTipoMap = { tarjeta:'💳', credito:'🏦', hipoteca:'🏠', vehiculo:'🚗', educacion:'🎓', persona:'👤', salud:'🏥', otro:'📦' };
  const nombreTipoMap = { tarjeta:'Tarjeta de Crédito', credito:'Crédito Libre Inversión', hipoteca:'Crédito Hipotecario', vehiculo:'Crédito Vehicular', educacion:'Crédito Educativo', persona:'Préstamo Personal', salud:'Deuda Médica', otro:'Otra Deuda' };
  
  const consejoMap = {
    tarjeta: {
      texto: `💳 <strong>Truco clave:</strong> Compra siempre a <strong>1 sola cuota</strong> y paga el total antes del corte. Nunca saques plata en efectivo con la tarjeta cobra intereses desde el primer día sin período de gracia.`,
      ley: ''
    },
    credito: {
      texto: `🏦 <strong>Tu derecho:</strong> Puedes pagar más del mínimo sin multa. Llama al banco y pide <strong>"abono extraordinario a capital con reducción de plazo"</strong>. Así pagas menos tiempo y menos intereses. Nunca pidas "reducción de cuota".`,
      ley: 'Ley 546/1999'
    },
    hipoteca: {
      texto: `🏠 <strong>Ahorra millones:</strong> Puedes llevar tu crédito hipotecario a otro banco con mejor tasa sin penalización. Primero pregúntale a tu banco a veces ellos mismos te mejoran la tasa para no perderte.`,
      ley: 'Ley 546/1999, Art. 20'
    },
    vehiculo: {
      texto: `🚗 <strong>Sal más rápido:</strong> Haz abonos extra a capital cuando puedas. Si el carro tiene más de 3 años y debes menos de lo que vale, considera venderlo y comprar algo más económico de contado.`,
      ley: ''
    },
    educacion: {
      texto: `🎓 <strong>Busca alivios:</strong> Si estás pasando un momento difícil, el ICETEX tiene períodos de gracia y programas de apoyo que poca gente conoce. Llama y pregunta antes de entrar en mora.`,
      ley: 'Ley 1002/2005'
    },
    persona: {
      texto: `👤 <strong>Regla de oro:</strong> Aunque sea con un familiar, escribe en un papel cuánto debes y cuándo pagas. Ambos firman. Si no puedes pagar a tiempo, avisa antes, el silencio es lo que daña las relaciones.`,
      ley: ''
    },
    salud: {
      texto: `🏥 <strong>Negocia sin miedo:</strong> Las clínicas prefieren recibir algo a no recibir nada. Llama al área de cartera y pregunta por descuento de contado o plan sin intereses en muchos casos aceptan entre el 60% y 80% del valor.`,
      ley: ''
    },
    otro: {
      texto: `📦 <strong>3 reglas que siempre aplican:</strong> Nunca ignores una deuda, crece sola. Siempre negocia, la mayoría prefiere un acuerdo. Paga primero la de mayor tasa — es la que más te cuesta cada día.`,
      ley: ''
    }
  };

  el.innerHTML = copia.map(d => { 
    const pend = Math.max(0, d.total - d.pagado);
    const p = d.total > 0 ? Math.min((d.pagado / d.total) * 100, 100) : 0; 
    const esPrioridad = (d.id === primeraVivaId); 
    const icono = iconoTipoMap[d.tipo] || '📦'; 
    const nombreTipo = nombreTipoMap[d.tipo] || 'Otra Deuda'; 
    const { texto: consejoTexto, ley: consejoLey } = consejoMap[d.tipo] || { texto: '', ley: '' };

    // 🆘 RECUPERAMOS TUS VARIABLES DE DISEÑO
    const colorBarra = p >= 100 ? 'var(--a1)' : p > 50 ? 'var(--a2)' : 'var(--a4)';
    const textoBarra = p >= 100 ? '🏆 ¡Pagada!' : p > 0 ? `${Math.round(p)}% pagado` : '';
    const mesesRestantes = d.cuota > 0 ? Math.ceil(pend / d.cuota) : 0;
    let tiempoTexto = '';
    if (pend <= 0) {
      tiempoTexto = `<span style="color:var(--a1); font-weight:700;">🏆 ¡Esta deuda está saldada!</span>`;
    } else if (mesesRestantes === 1) {
      tiempoTexto = `<span style="color:var(--a1); font-weight:700;">🔥 ¡Solo te falta 1 mes para liquidarla!</span>`;
    } else if (mesesRestantes <= 6) {
      tiempoTexto = `<span style="color:var(--a2);">📅 Pagando tu cuota cada mes, en <strong>${mesesRestantes} meses</strong> quedas libre.</span>`;
    } else {
      const anos = Math.floor(mesesRestantes / 12);
      const meses = mesesRestantes % 12;
      const tiempo = anos > 0 ? `${anos} año${anos > 1 ? 's' : ''}${meses > 0 ? ` y ${meses} mes${meses > 1 ? 'es' : ''}` : ''}` : `${mesesRestantes} meses`;
      tiempoTexto = `<span style="color:var(--t3);">📅 Pagando tu cuota cada mes, en <strong style="color:var(--t2);">${tiempo}</strong> quedas libre.</span>`;
    }
    const modo = S.modoDeuda || 'avalancha';
    const borderPrioridad = esPrioridad ? (modo === 'avalancha' ? 'border-left: 4px solid var(--dan);' : 'border-left: 4px solid var(--a1);') : 'border-left: 4px solid transparent;';
    const badgePrioridad = esPrioridad ? (modo === 'avalancha' ? `<span style="background:rgba(255,68,68,.12); color:var(--dan); border:1px solid rgba(255,68,68,.2); font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px;">🔥 ATACAR PRIMERO</span>` : `<span style="background:rgba(0,220,130,.12); color:var(--a1); border:1px solid rgba(0,220,130,.2); font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px;">⛄ ATACAR PRIMERO</span>`) : '';

   // 🎯 NUEVO: Calculamos la alerta de mora analizando el día de pago de la deuda
  const alertaMoraHTML = obtenerAlertaMora(d);

    const consejoAbierto = esPrioridad && consejoTexto;

    return `
    <article class="deuda-card-animada gc" 
      style="background:var(--s1); border:1px solid var(--b1); border-radius:16px; margin-bottom:16px; overflow:hidden; ${borderPrioridad} animation-delay:${copia.indexOf(d) * 0.08}s;"
      aria-label="Deuda: ${he(d.nombre)}">

      <!-- CABECERA: Nombre + Cuota -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:20px 20px 16px; border-bottom:1px solid var(--b1); flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
          <div style="width:44px; height:44px; border-radius:12px; background:var(--s2); border:1px solid var(--b2); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;" aria-hidden="true">${icono}</div>
          <div style="min-width:0;">
            <div style="font-weight:800; font-size:17px; color:var(--t1); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${he(d.nombre)}</div>
            <div style="font-size:11px; color:var(--t3); margin-top:3px;">${nombreTipo}${d.tasa > 0 ? ` · ${d.tasa}% E.A.` : ''} · ${d.periodicidad}</div>
            <div style="margin-top:6px;">${badgePrioridad}</div>
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:10px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Cuota a pagar</div>
          <div style="font-family:var(--fm); font-size:26px; font-weight:800; color:var(--t1); line-height:1;">${f(d.cuota)}</div>
          ${d.diaPago ? `<div style="font-size:10px; color:var(--t3); margin-top:4px;">📅 Día ${d.diaPago} de cada mes</div>` : ''}
        </div>
      </div>

      <!-- CUERPO: Progreso + Saldo -->
      <div style="padding:16px 20px; border-bottom:1px solid var(--b1);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:12px;">
          <div>
            <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Saldo pendiente</div>
            <div style="font-family:var(--fm); font-size:24px; font-weight:800; color:var(--dan);">${f(pend)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Ya pagaste</div>
            <div style="font-family:var(--fm); font-size:24px; font-weight:800; color:${colorBarra};">${f(d.pagado)}</div>
          </div>
        </div>
        <div style="height:10px; background:var(--s3); border-radius:999px; overflow:hidden; margin-bottom:8px;" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso de pago">
          <div style="height:100%; width:${p}%; background:${colorBarra}; border-radius:999px; transition:width .6s ease;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="font-size:11px; color:${p > 0 ? colorBarra : 'var(--t3)'}; font-weight:${p > 0 ? '700' : '400'};">${textoBarra || 'Aún no has abonado a esta deuda'}</span>
          <span style="font-size:11px; color:var(--t3);">Total: ${f(d.total)}</span>
        </div>
        <div style="font-size:12px; line-height:1.5;">${tiempoTexto}</div>
        ${alertaMoraHTML}
      </div>

      <!-- PIE: Consejo + Botones -->
      <div style="padding:14px 20px;">
        ${consejoTexto ? `
        <div style="margin-bottom:12px;">
          <button 
            id="btn-consejo-${d.id}"
            aria-expanded="${consejoAbierto ? 'true' : 'false'}"
            aria-controls="consejo-${d.id}"
            onclick="
              const c = document.getElementById('consejo-${d.id}');
              const btn = document.getElementById('btn-consejo-${d.id}');
              const abierto = c.style.display === 'block';
              c.style.display = abierto ? 'none' : 'block';
              btn.setAttribute('aria-expanded', abierto ? 'false' : 'true');
              btn.querySelector('.consejo-txt').textContent = abierto ? '💡 Ver consejo' : '💡 Ocultar consejo';
            "
            style="background:none; border:none; color:var(--a4); font-size:12px; font-weight:600; cursor:pointer; padding:0; text-align:left; display:flex; align-items:center; gap:6px;">
            <span class="consejo-txt">${consejoAbierto ? '💡 Ocultar consejo' : '💡 Ver consejo'}</span>
          </button>
          <div id="consejo-${d.id}" style="display:${consejoAbierto ? 'block' : 'none'}; margin-top:8px; padding:12px; background:var(--s2); border:1px solid var(--b2); border-left:3px solid var(--a4); border-radius:8px; font-size:12px; color:var(--t2); line-height:1.6;">
            ${consejoTexto}
            ${consejoLey ? `<div style="margin-top:8px;"><span style="display:inline-flex; align-items:center; gap:4px; background:var(--s3); border:1px solid var(--b2); border-radius:6px; padding:3px 8px; font-size:10px; font-weight:700; color:var(--t3); font-family:var(--fm);">⚖️ ${consejoLey}</span></div>` : ''}
          </div>
        </div>` : ''}

        <div class="deu-card-footer">
          <button class="btn bg bsm" onclick="abrirEditarDeuda(${d.id})" aria-label="Editar deuda ${he(d.nombre)}">✏️ Editar</button>
          <button class="btn-eliminar-deu" onclick="delDeu(${d.id})" aria-label="Eliminar deuda ${he(d.nombre)}">🗑️ Eliminar</button>
          <button class="btn bp btn-pagar-cuota" onclick="abrirPagarCuota(${d.id})" aria-label="Pagar cuota de ${he(d.nombre)}">
            Pagar Cuota →
          </button>
        </div>
      </div>

    </article>`;
  }).join('');
}

function abrirPagarCuota(id) { 
  const d = S.deudas.find(x => x.id === id); 
  if (!d) return;
  
  const pendiente = Math.max(0, d.total - d.pagado);
  const pct = d.total > 0 ? Math.min(Math.round((d.pagado / d.total) * 100), 100) : 0;
  const nuevoPct = d.total > 0 ? Math.min(Math.round(((d.pagado + d.cuota) / d.total) * 100), 100) : 0;

  setEl('pgc-no', d.nombre); 
  setEl('pgc-mo', f(d.cuota));
  setEl('pgc-pagado', f(d.pagado));
  setEl('pgc-pct', `${pct}% pagado → ${nuevoPct}% al confirmar`);
  setEl('pgc-pendiente', `Pendiente: ${f(pendiente)}`);

  const barra = document.getElementById('pgc-barra');
  if (barra) barra.style.width = `${pct}%`;

  document.getElementById('pgc-id').value = id; 
  actualizarListasFondos();
  openM('m-pgc'); 
}

async function confPagarCuota() { 
  const id = +document.getElementById('pgc-id').value; 
  const d = S.deudas.find(x => x.id === id); 
  if (!d) { closeM('m-pgc'); return; } 
  
  const fo = document.getElementById('pgc-fo').value;
  
  let disp = fo === 'efectivo' ? S.saldos.efectivo : (fo.startsWith('cuenta_') ? (S.cuentas.find(x => x.id === +fo.split('_')[1])?.saldo ?? 0) : S.saldos.banco);
  if (disp < d.cuota) {
    const ok = await showConfirm(`⚠️ Saldo insuficiente en la cuenta seleccionada (${f(disp)} disponible).\n¿Pagar de todas formas?`, 'Saldo');
    if (!ok) return;
  }

  desF(fo, d.cuota); 
  d.pagado = Math.min(d.pagado + d.cuota, d.total); 
  S.gastos.unshift({ id: Date.now(), desc: `💳 Cuota: ${d.nombre}`, monto: d.cuota, montoTotal: d.cuota, cat: 'deudas', tipo: 'necesidad', fondo: fo, hormiga: false, cuatroXMil: false, fecha: hoy(), metaId: '', autoFijo: false }); 
  closeM('m-pgc'); save(); renderSmart(['deudas', 'gastos']);
}

function abrirEditarDeuda(id) {
  const d = S.deudas.find(x => x.id === id);
  if (!d) return;
  document.getElementById('ed-id').value = id;
  document.getElementById('ed-no').value = d.nombre;
  document.getElementById('ed-ti').value = d.tipo;
  document.getElementById('ed-to').value = d.total;
  document.getElementById('ed-cu').value = d.cuota;
  document.getElementById('ed-pe').value = d.periodicidad;
  document.getElementById('ed-ta').value = d.tasa;
  document.getElementById('ed-dia').value = d.diaPago || 1;
  openM('m-edit-deu');
}

async function guardarEditarDeuda() {
  const id = +document.getElementById('ed-id').value;
  const d = S.deudas.find(x => x.id === id);
  if (!d) return;
  const nuevoTotal = +document.getElementById('ed-to').value;
  const nuevaCuota = +document.getElementById('ed-cu').value;
  if (!nuevoTotal || !nuevaCuota) { await showAlert('El saldo y la cuota no pueden estar vacíos.', 'Faltan datos'); return; }
  d.nombre = document.getElementById('ed-no').value.trim();
  d.tipo = document.getElementById('ed-ti').value;
  d.total = Number(nuevoTotal);
  d.cuota = Number(nuevaCuota);
  d.periodicidad = document.getElementById('ed-pe').value;
  d.tasa = +document.getElementById('ed-ta').value || 0;
  d.diaPago = +document.getElementById('ed-dia').value || 1;
  closeM('m-edit-deu');
  save();
  renderSmart(['deudas']);
}

async function delDeu(id){const ok=await showConfirm('¿Eliminar deuda?','Eliminar');if(!ok)return;S.deudas=S.deudas.filter(d=>d.id!==id);save();renderSmart(['deudas']);}

// ─── 8. INVERSIONES, AGENDA, CUENTAS ───
async function guardarInversion(){const no=document.getElementById('inv-no').value.trim();const pl=document.getElementById('inv-pl').value.trim();const cap=+document.getElementById('inv-cap').value||0;const ta=+document.getElementById('inv-ta').value||0;if(!no||!pl||!cap)return;const fo=document.getElementById('inv-fo').value;if(fo)desF(fo,cap);S.inversiones.push({id:Date.now(),nombre:no,plataforma:pl,capital:cap,rendimiento:0,tasa:ta});closeM('m-inversion');save();renderSmart(['inversiones']);}
function renderInversiones() {
  const el = document.getElementById('inv-lst');
  if (!el) return;

  const tc = S.inversiones.reduce((s,i) => s + i.capital, 0);
  const tr = S.inversiones.reduce((s,i) => s + i.rendimiento, 0);
  setEl('inv-tot-cap', f(tc));
  setEl('inv-tot-rend', f(tr));
  setEl('inv-tot-gral', f(tc + tr));

  if (!S.inversiones.length) {
    el.innerHTML = `
      <div style="text-align:center; padding:40px 20px; background:var(--s1); border-radius:16px; border:1px dashed rgba(59,158,255,.3);">
        <div style="font-size:48px; margin-bottom:14px;">📈</div>
        <div style="font-weight:800; font-size:17px; color:var(--t1); margin-bottom:8px;">Sin inversiones registradas</div>
        <div style="color:var(--t3); font-size:13px; max-width:260px; margin:0 auto; line-height:1.6;">Registra tus CDTs, FICs o acciones para ver cómo crece tu dinero.</div>
      </div>`;
    return;
  }

  el.innerHTML = S.inversiones.map(i => {
    const valorTotal = i.capital + i.rendimiento;
    const rendPct = i.capital > 0 ? ((i.rendimiento / i.capital) * 100).toFixed(1) : 0;
    const colorRend = i.rendimiento >= 0 ? 'var(--a1)' : 'var(--dan)';
    const signo = i.rendimiento >= 0 ? '+' : '';
    const tasaBadge = i.tasa > 0
      ? `<span class="pill pg" style="font-size:9px;">${i.tasa}% E.A.</span>`
      : '';

    return `
    <article class="inv-card" aria-label="Inversión: ${he(i.nombre)}">

      <!-- CABECERA -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:16px 20px 14px; border-bottom:1px solid var(--b1); gap:12px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
          <div style="width:44px; height:44px; border-radius:12px; background:rgba(59,158,255,.1); border:1px solid rgba(59,158,255,.2); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;" aria-hidden="true">📊</div>
          <div style="min-width:0;">
            <div style="font-weight:800; font-size:15px; color:var(--t1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${he(i.nombre)}">${he(i.nombre)}</div>
            <div style="margin-top:5px; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span style="font-size:11px; color:var(--t3);">📍 ${he(i.plataforma)}</span>
              ${tasaBadge}
            </div>
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:10px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Valor total</div>
          <div style="font-family:var(--fm); font-size:26px; font-weight:800; color:var(--t1); letter-spacing:-1px; line-height:1;">${f(valorTotal)}</div>
        </div>
      </div>

      <!-- CUERPO: Capital + Rendimiento -->
      <div style="padding:14px 20px; border-bottom:1px solid var(--b1); display:flex; gap:12px; flex-wrap:wrap;">
        <div style="flex:1; min-width:120px; background:var(--s2); border:1px solid var(--b1); border-radius:10px; padding:12px;">
          <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Capital invertido</div>
          <div style="font-family:var(--fm); font-size:18px; font-weight:800; color:var(--a4);">${f(i.capital)}</div>
        </div>
        <div style="flex:1; min-width:120px; background:${i.rendimiento >= 0 ? 'rgba(0,220,130,.05)' : 'rgba(255,96,96,.05)'}; border:1px solid ${i.rendimiento >= 0 ? 'rgba(0,220,130,.2)' : 'rgba(255,96,96,.2)'}; border-radius:10px; padding:12px;">
          <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Rendimiento</div>
          <div style="font-family:var(--fm); font-size:18px; font-weight:800; color:${colorRend};">${signo}${f(i.rendimiento)}</div>
          <div style="font-size:11px; color:${colorRend}; margin-top:2px; font-weight:600;">${signo}${rendPct}%</div>
        </div>
      </div>

      <!-- PIE: Acciones -->
      <div style="padding:12px 20px; display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn bg bsm" onclick="openRendimiento(${i.id},'${he(i.nombre)}')" aria-label="Actualizar valor de ${he(i.nombre)}">📊 Actualizar valor</button>
        <button class="btn-eliminar-deu" onclick="delInversion(${i.id})" style="padding:6px 12px;" aria-label="Eliminar ${he(i.nombre)}">🗑️</button>
      </div>

    </article>`;
  }).join('');
}
function openRendimiento(id,n){document.getElementById('rend-id').value=id;document.getElementById('rend-t').textContent='Actualizar: '+n;openM('m-rendimiento');}
function guardarRendimiento(){const id=+document.getElementById('rend-id').value;const nv=+document.getElementById('rend-val').value;if(!nv)return;const inv=S.inversiones.find(x=>x.id===id);if(inv)inv.rendimiento=nv-inv.capital;closeM('m-rendimiento');save();renderInversiones();}
async function delInversion(id) {
  const inv = S.inversiones.find(x => x.id === id);
  if (!inv) return;
  const ok = await showConfirm(`¿Eliminar la inversión "${he(inv.nombre)}"? Esta acción no se puede deshacer.`, 'Eliminar inversión');
  if (!ok) return;
  S.inversiones = S.inversiones.filter(x => x.id !== id);
  save();
  renderInversiones();
}

async function guardarPago(){const de=document.getElementById('ag-de').value;const mo=+document.getElementById('ag-mo').value;const fe=document.getElementById('ag-fe').value;if(!de||!mo||!fe){ await showAlert('Completa la descripción, el monto y la fecha del pago.','Faltan datos'); return; }S.pagosAgendados.push({id:Date.now(),desc:de,monto:mo,fecha:fe,repetir:document.getElementById('ag-re').value,fondo:document.getElementById('ag-fo').value,pagado:false});closeM('m-pago');save();renderSmart(['pagos']);}

function renderPagos() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const up = S.pagosAgendados
    .filter(p => !p.pagado)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const totalLiquidez = up.reduce((sum, p) => sum + p.monto, 0);

  // ── MÉTRICAS ──
  const prox7 = up.filter(p => {
    const d = new Date(p.fecha + 'T12:00:00'); d.setHours(0,0,0,0);
    const dias = Math.ceil((d - now) / 86400000);
    return dias >= 0 && dias <= 7;
  });
  const vencidos = up.filter(p => {
    const d = new Date(p.fecha + 'T12:00:00'); d.setHours(0,0,0,0);
    return d < now;
  });

  setEl('ag-tot-monto', f(totalLiquidez));
  setEl('ag-prox7', f(prox7.reduce((s, p) => s + p.monto, 0)));
  setEl('ag-prox7-count', `${prox7.length} pago${prox7.length !== 1 ? 's' : ''}`);

  const vencMonto = vencidos.reduce((s, p) => s + p.monto, 0);
  const vencMontoEl = document.getElementById('ag-vencidos-monto');
  const vencMsg = document.getElementById('ag-vencidos-msg');
  const vencCount = document.getElementById('ag-vencidos-count');

  if (vencMontoEl) {
    vencMontoEl.textContent = f(vencMonto);
    vencMontoEl.style.color = vencidos.length > 0 ? 'var(--dan)' : 'var(--a1)';
  }
  if (vencMsg) {
    vencMsg.textContent = vencidos.length > 0 ? 'requieren atención urgente' : 'sin pagos vencidos ✅';
    vencMsg.style.color = vencidos.length > 0 ? 'var(--dan)' : 'var(--t3)';
  }
  if (vencCount) {
    vencCount.textContent = vencidos.length > 0 ? `${vencidos.length} pago${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''}` : '';
    vencCount.style.color = 'var(--dan)';
  }

  // ── AVISOS INTELIGENTES ──
  const avisosEl = document.getElementById('ag-avisos');
  if (avisosEl) {
    const avisos = [];
    if (vencidos.length > 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(255,68,68,.03);">
          <span style="font-size:20px; flex-shrink:0;">🚨</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--dan); margin-bottom:3px;">Tienes ${vencidos.length} pago${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''}</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;"><strong style="color:var(--t2);">${vencidos.map(p => he(p.desc)).join(', ')}</strong> ya pasaron su fecha límite. Págalos lo antes posible para no perder el control de tu liquidez.</div>
          </div>
        </div>`);
    }
    if (prox7.length > 0 && vencidos.length === 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(255,214,10,.03);">
          <span style="font-size:20px; flex-shrink:0;">📆</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a2); margin-bottom:3px;">Tienes ${prox7.length} pago${prox7.length > 1 ? 's' : ''} en los próximos 7 días</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">Asegúrate de tener <strong style="color:var(--t2);">${f(prox7.reduce((s,p)=>s+p.monto,0))}</strong> disponibles esta semana para cubrirlos sin problema.</div>
          </div>
        </div>`);
    }
    if (up.length === 0) {
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; background:rgba(0,220,130,.03);">
          <span style="font-size:20px; flex-shrink:0;">🌟</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a1); margin-bottom:3px;">Sin pagos pendientes</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">Todo al día. Agenda tus próximos compromisos para no olvidarlos cuando lleguen.</div>
          </div>
        </div>`);
    }

    // Aviso de pagos que caen en fin de semana
    const pagosFinSemana = up.filter(p => {
      const d = new Date(p.fecha + 'T12:00:00');
      const dia = d.getDay(); // 0=domingo, 6=sábado
      const dias = Math.ceil((d - now) / 86400000);
      return (dia === 0 || dia === 6) && dias >= 0 && dias <= 14;
    });
    if (pagosFinSemana.length > 0) {
      const nombres = pagosFinSemana.map(p => he(p.desc)).join(', ');
      avisos.push(`
        <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 24px; border-bottom:1px solid var(--b1); background:rgba(59,158,255,.03);">
          <span style="font-size:20px; flex-shrink:0;">📆</span>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:12px; color:var(--a4); margin-bottom:3px;">Pago en fin de semana — revisa con tu banco</div>
            <div style="font-size:11px; color:var(--t3); line-height:1.6;"><strong style="color:var(--t2);">${nombres}</strong> cae en sábado o domingo. Algunos bancos lo procesan el siguiente día hábil, pero los intereses corren desde la fecha original. Paga antes del viernes para estar seguro.</div>
          </div>
        </div>`);
    }

    avisosEl.innerHTML = avisos.join('');
  }

  // ── HELPER DE FONDO ──
  const getFondo = (fondo) => {
    if (fondo === 'efectivo') return { icon: '💵', name: 'Efectivo' };
    if (fondo && fondo.startsWith('cuenta_')) {
      const c = S.cuentas.find(x => x.id === +fondo.split('_')[1]);
      if (c) return { icon: c.icono, name: c.nombre };
    }
    return { icon: '🏦', name: 'Banco' };
  };

  // ── CARDS MODERNAS ──
  const iconoFrecuencia = { mensual: '↻', quincenal: '↻', unico: '✦' };
  const classFrecuencia = { mensual: 'pill pb', quincenal: 'pill py', unico: 'pill pg' };
  const labelFrecuencia = { mensual: 'Mensual', quincenal: 'Quincenal', unico: 'Único' };

  let htmlLista = '';
  if (up.length > 0) {
    htmlLista = up.map(p => {
      const dObj = new Date(p.fecha + 'T12:00:00'); dObj.setHours(0,0,0,0);
      const dias = Math.ceil((dObj - now) / 86400000);
      const fechaFmt = new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', month: 'short', day: 'numeric' });
      const fondo = getFondo(p.fondo);

      let colorEstado = 'var(--a2)', textoEstado = `En ${dias} días`, borderLeft = 'transparent';
      if (dias < 0)        { colorEstado = 'var(--dan)'; textoEstado = `Vencido hace ${Math.abs(dias)} día${Math.abs(dias)>1?'s':''}`;  borderLeft = 'var(--dan)'; }
      else if (dias === 0) { colorEstado = 'var(--a1)';  textoEstado = '¡Hoy!';        borderLeft = 'var(--a1)'; }
      else if (dias === 1) { colorEstado = 'var(--a3)';  textoEstado = 'Mañana';       borderLeft = 'var(--a3)'; }
      else if (dias <= 7)  { colorEstado = 'var(--a2)';  textoEstado = `En ${dias} días`; }

      const frec = p.repetir || 'unico';
      const frecBadge = `<span class="${classFrecuencia[frec]||'pill pg'}" style="font-size:9px;">${iconoFrecuencia[frec]||'✦'} ${labelFrecuencia[frec]||'Único'}</span>`;

      return `
      <article class="pago-card" style="border-left: 4px solid ${borderLeft};" aria-label="Pago: ${he(p.desc)}">

        <!-- CABECERA -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:16px 20px 14px; border-bottom:1px solid var(--b1); flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
            <div style="width:44px; height:44px; border-radius:12px; background:var(--s2); border:1px solid var(--b2); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;" aria-hidden="true">📅</div>
            <div style="min-width:0;">
              <div style="font-weight:700; font-size:14px; color:var(--t1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${he(p.desc)}">${he(p.desc)}</div>
              <div style="margin-top:5px; display:flex; align-items:center; gap:6px;">
                ${frecBadge}
                <span style="font-size:10px; color:var(--t3); text-transform:capitalize;">${fechaFmt}</span>
              </div>
            </div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-family:var(--fm); font-size:22px; font-weight:800; color:var(--t1); letter-spacing:-1px; line-height:1;">${f(p.monto)}</div>
          </div>
        </div>

        <!-- PIE -->
        <div style="padding:12px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:20px;" aria-hidden="true">${fondo.icon}</span>
            <div>
              <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Sale de</div>
              <div style="font-size:12px; font-weight:600; color:var(--t2);">${he(fondo.name)}</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:8px; height:8px; border-radius:50%; background:${colorEstado}; flex-shrink:0;" aria-hidden="true"></div>
            <span style="font-size:12px; font-weight:700; color:${colorEstado};">${textoEstado}</span>
          </div>

          <div style="display:flex; gap:8px; margin-left:auto;">
            <button class="btn bp bsm" onclick="marcarPagado(${p.id})" style="padding:8px 16px;" aria-label="Pagar ${he(p.desc)}">✓ Pagar</button>
            <button class="btn-eliminar-deu" onclick="delPago(${p.id})" style="padding:6px 12px;" aria-label="Eliminar ${he(p.desc)}">🗑️</button>
          </div>
        </div>

      </article>`;
    }).join('');
  } else {
    htmlLista = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:48px; margin-bottom:14px;">🗓️</div>
        <div style="font-weight:800; font-size:17px; color:var(--t1); margin-bottom:8px;">Sin pagos pendientes</div>
        <div style="color:var(--t3); font-size:13px; max-width:260px; margin:0 auto; line-height:1.6;">Agenda tus próximos compromisos para no perder el control de tu liquidez.</div>
      </div>`;
  }

  const countEl = document.getElementById('pa-lst-count');
  if (countEl) countEl.textContent = up.length > 0 ? `${up.length} pago${up.length !== 1 ? 's' : ''} pendiente${up.length !== 1 ? 's' : ''}` : '';

  setHtml('pa-lst', htmlLista);

  // ── PREVIEW DEL DASHBOARD (filas simples) ──
  const rowDash = (p) => {
    const dObj = new Date(p.fecha + 'T12:00:00'); dObj.setHours(0,0,0,0);
    const dias = Math.ceil((dObj - now) / 86400000);
    const col = dias < 0 ? 'var(--dan)' : dias === 0 ? 'var(--a1)' : dias <= 3 ? 'var(--a3)' : 'var(--t3)';
    const fechaFmt = new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
    return `<div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--b1);">
      <div style="font-size:11px; color:${col}; min-width:55px; font-weight:700; text-transform:capitalize;">${fechaFmt}</div>
      <div style="flex:1; font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${he(p.desc)}</div>
      <div style="font-family:var(--fm); font-weight:700; font-size:13px; color:var(--a2); flex-shrink:0;">${f(p.monto)}</div>
    </div>`;
  };

  setHtml('d-prox', up.length ? up.slice(0, 4).map(p => rowDash(p)).join('') : '<div class="emp">Sin pagos próximos</div>');

  if (typeof renderCal === 'function') renderCal();
}

function marcarPagado(id) {
  const p = S.pagosAgendados.find(x => x.id === id);
  if (!p) return;
  
  const hiddenFo = document.getElementById('cp-fo');
  if (hiddenFo) hiddenFo.value = p.fondo || 'efectivo';
  actualizarListasFondos();
  
  document.getElementById('cp-desc').innerHTML = `Vas a pagar <strong style="color:var(--t1); font-size:15px;">${f(p.monto)}</strong> por "${he(p.desc)}".`;
  document.getElementById('cp-id').value = id;
  openM('m-conf-pago');
}

async function ejecutarPagoAgendado() {
  const id = +document.getElementById('cp-id').value;
  const p = S.pagosAgendados.find(x => x.id === id);
  if (!p) return;

  const fondoSeleccionado = document.getElementById('cp-fo').value;

  let disp = 0;
  let nombreCuenta = 'Efectivo';
  
  if (fondoSeleccionado === 'efectivo') {
    disp = S.saldos.efectivo;
  } else if (fondoSeleccionado.startsWith('cuenta_')) {
    const idCuenta = +fondoSeleccionado.split('_')[1];
    const cuentaReal = S.cuentas.find(x => x.id === idCuenta);
    if (cuentaReal) { disp = cuentaReal.saldo; nombreCuenta = cuentaReal.nombre; }
  } else {
    disp = S.saldos.banco; nombreCuenta = 'Banco';
  }

  if (disp < p.monto) {
    const ok = await showConfirm(`⚠️ Saldo insuficiente en ${nombreCuenta} (${f(disp)} disponible).\n¿Pagar de todas formas?`, 'Saldo');
    if (!ok) return; 
  }

  desF(fondoSeleccionado, p.monto);

  S.gastos.unshift({
    id: Date.now(), desc: `📅 Pago: ${p.desc}`, monto: p.monto, montoTotal: p.monto, cat: 'otro', tipo: 'necesidad', fondo: fondoSeleccionado, hormiga: false, cuatroXMil: false, fecha: hoy(), metaId: '', autoFijo: false
  });

  p.pagado = true;

  if (p.repetir === 'mensual' || p.repetir === 'quincenal') {
    const nextDate = new Date(p.fecha + 'T12:00:00');
    if (p.repetir === 'mensual') {
    const diaOriginal = nextDate.getDate();
    nextDate.setDate(1);
    nextDate.setMonth(nextDate.getMonth() + 1);
    const maxDia = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
    nextDate.setDate(Math.min(diaOriginal, maxDia));
  }
    if (p.repetir === 'quincenal') nextDate.setDate(nextDate.getDate() + 15);
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    S.pagosAgendados.push({ id: Date.now() + Math.random(), desc: p.desc, monto: p.monto, fecha: `${yyyy}-${mm}-${dd}`, repetir: p.repetir, fondo: p.fondo, pagado: false });
  }

  closeM('m-conf-pago');
  save();
  renderSmart(['pagos', 'gastos']);
}

async function delPago(id){
  const p = S.pagosAgendados.find(x => x.id === id);
  if(!p) return;
  const seguro = await showConfirm(`⚠️ ¿Estás completamente seguro de eliminar el pago "${he(p.desc)}"?`, 'Eliminar Pago');
  if(!seguro) return;
  S.pagosAgendados = S.pagosAgendados.filter(x => x.id !== id);
  save(); 
  renderPagos(); 
  if(typeof renderCal === 'function') renderCal();
}

// --- SISTEMA DEL CALENDARIO DINÁMICO (BLINDADO) ---
var calDate = null; 
var currentDaysEvents = {}; 

function prevMonth() { if(!calDate) calDate = new Date(); calDate.setMonth(calDate.getMonth() - 1); renderCal(); document.getElementById('cal-details').style.display = 'none'; }
function nextMonth() { if(!calDate) calDate = new Date(); calDate.setMonth(calDate.getMonth() + 1); renderCal(); document.getElementById('cal-details').style.display = 'none'; }

function renderCal() {
  const el = document.getElementById('cal-g');
  if (!el) return;

  if (!calDate) calDate = new Date(); 

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  setEl('cal-month-title', `${monthNames[month]} ${year}`);

  const now = new Date();
  const isCurrentMonth = (now.getFullYear() === year && now.getMonth() === month);
  const todayDate = now.getDate();
  const calMesStr = `${year}-${String(month + 1).padStart(2, '0')}`; 

  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  currentDaysEvents = {}; 

  if(S.pagosAgendados) {
    S.pagosAgendados.forEach(p => {
      if (!p.pagado) {
        const pDate = new Date(p.fecha + 'T12:00:00'); 
        if (pDate.getFullYear() === year && pDate.getMonth() === month) {
          const d = pDate.getDate();
          if(!currentDaysEvents[d]) currentDaysEvents[d] = { agendados: [], fijos: [], deudas: [] };
          currentDaysEvents[d].agendados.push(p);
        }
      }
    });
  }

  if(S.gastosFijos) {
    S.gastosFijos.forEach(fijo => {
      if (!fijo.pagadoEn || !fijo.pagadoEn.includes(calMesStr)) {
        const diaReal = Math.min(fijo.dia, daysInMonth);
        if(!currentDaysEvents[diaReal]) currentDaysEvents[diaReal] = { agendados: [], fijos: [], deudas: [] };
        currentDaysEvents[diaReal].fijos.push(fijo);
        
        if (fijo.periodicidad === 'quincenal') {
          const diaQ2 = diaReal + 15;
          if (diaQ2 <= daysInMonth) {
            if(!currentDaysEvents[diaQ2]) currentDaysEvents[diaQ2] = { agendados: [], fijos: [], deudas: [] };
            currentDaysEvents[diaQ2].fijos.push(fijo);
          }
        }
      }
    });
  }

  if(S.deudas) {
    S.deudas.forEach(deuda => {
      if ((deuda.total - deuda.pagado) <= 0) return;
      const diaPago = Math.min(deuda.diaPago || 1, daysInMonth);
      const pagadoEsteMes = S.gastos.some(g => g.cat === 'deudas' && g.fecha.startsWith(calMesStr) && g.desc.includes(deuda.nombre));
      if (!pagadoEsteMes) {
        if(!currentDaysEvents[diaPago]) currentDaysEvents[diaPago] = { agendados: [], fijos: [], deudas: [] };
        if(!currentDaysEvents[diaPago].deudas) currentDaysEvents[diaPago].deudas = [];
        currentDaysEvents[diaPago].deudas.push(deuda);
      }
    });
  }

  let html = '';
  for (let i = 0; i < startOffset; i++) { html += `<div></div>`; } 

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = (isCurrentMonth && day === todayDate);
    const ev = currentDaysEvents[day]; 

    let baseBg = isToday ? 'var(--s2)' : 'rgba(255,255,255,0.02)';
    let todayClass = isToday ? ' today' : '';
    let style = `padding:6px 0; border-radius:8px; text-align:center; font-size:13px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:48px; cursor:pointer; transition:all 0.2s; background:${baseBg}; border:2px solid transparent;`;

    // Círculo transparente con borde y sombra para el día de HOY
    let daySpan = isToday
      ? `<span style="background:rgba(0,0,0,0); border: 2px solid var(--a1); color:var(--a1); width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-weight:800; box-shadow: 0 3px 8px rgba(0,220,130,.5);">${day}</span>`
      : `<span>${day}</span>`;

    if (isToday) { style += ' color:var(--a1);'; } 
    else { style += ' color:var(--t2);'; }

    let dots = '';
    if (ev) {
      dots += `<div style="display:flex; gap:3px; margin-top:4px; height:5px;">`;
      if (ev.agendados.length > 0) dots += `<div style="width:5px; height:5px; border-radius:50%; background:var(--dan); box-shadow:0 0 4px var(--dan);"></div>`;
      if (ev.fijos.length > 0) dots += `<div style="width:5px; height:5px; border-radius:50%; background:var(--a4); box-shadow:0 0 4px var(--a4);"></div>`;
      if (ev.deudas && ev.deudas.length > 0) dots += `<div style="width:5px; height:5px; border-radius:50%; background:var(--a2); box-shadow:0 0 4px var(--a2);"></div>`;
      dots += `</div>`;
    } else { dots = `<div style="height:5px; margin-top:4px;"></div>`; }

    html += `<div 
      class="cal-day-box${todayClass}" 
      role="button" 
      tabindex="0"
      aria-label="Día ${day}${ev ? ', tiene compromisos' : ''}"
      onclick="showDayDetails(${day}, this)"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showDayDetails(${day}, this)}"
    >${daySpan}${dots}</div>`;
  }

  el.innerHTML = html;
}
  
  function showDayDetails(day, element = null) {
  const el = document.getElementById('cal-details');
  if (!el) return;

  // 1. Lógica visual de selección (la burbuja verde)
  if (element) {
    document.querySelectorAll('.cal-day-box').forEach(box => {
      box.classList.remove('selected-day');
      box.style.border = '2px solid transparent';
      // Restaurar el fondo original según si es el día de hoy
      box.style.background = box.classList.contains('today') ? 'var(--s2)' : 'rgba(255,255,255,0.02)';
    });
    element.classList.add('selected-day');
    element.style.border = '2px solid transparent';
    element.style.background = 'rgba(0,220,130,.15)';
    element.style.borderRadius = '16px';
  }

  // 2. Revisamos si hay eventos en ese día
  const ev = currentDaysEvents[day];
  
  // Si NO hay eventos, mostramos este mensaje amigable
  if (!ev || (ev.agendados.length === 0 && ev.fijos.length === 0 && (!ev.deudas || ev.deudas.length === 0))) {
    el.innerHTML = `<div style="padding:16px; text-align:center; color:var(--t3); font-size:13px; font-weight:500; background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed var(--b2); display:flex; flex-direction:column; align-items:center; gap:8px;">
      <span style="font-size:20px;">☕</span>
      <span>No hay pagos programados para el día ${day}. ¡Un respiro para tu bolsillo!</span>
    </div>`;
    el.style.display = 'block'; 
    return;
  }

  // 3. Si SÍ hay eventos, construimos la lista
  let html = `<div style="font-weight:700; font-size:14px; margin-bottom:10px; color:var(--t1);">📅 Compromisos del día ${day}</div>`;
  
  function getFondoLabel(fondo) {
    if (fondo === 'efectivo') return '💵 Efectivo';
    if (fondo && fondo.startsWith('cuenta_')) {
      const c = S.cuentas.find(x => x.id === +fondo.split('_')[1]);
      if (c) return `${c.icono} ${c.nombre}`;
    }
    return '🏦 Banco';
  }

  if (ev.agendados.length > 0) {
    html += `<div style="font-size:11px; font-weight:700; color:var(--dan); margin-bottom:6px; text-transform:uppercase;">Pagos Agendados</div>`;
    ev.agendados.forEach(p => {
      html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,68,68,0.05); padding:8px; border-radius:6px; margin-bottom:6px; border:1px solid rgba(255,68,68,0.1);">
        <div><div style="font-size:13px; font-weight:600; color:var(--t1);">${he(p.desc)}</div><div style="font-size:10px; color:var(--t3);">${getFondoLabel(p.fondo)}</div></div>
        <div style="font-family:var(--fm); font-weight:700; color:var(--dan);">${f(p.monto)}</div>
      </div>`;
    });
  }

  if (ev.fijos.length > 0) {
    html += `<div style="font-size:11px; font-weight:700; color:var(--a4); margin-bottom:6px; margin-top:10px; text-transform:uppercase;">Gastos Fijos</div>`;
    ev.fijos.forEach(fx => {
      const m = fx.cuatroXMil ? Math.round(fx.monto * 1.004) : fx.monto;
      html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(59,158,255,0.05); padding:8px; border-radius:6px; margin-bottom:6px; border:1px solid rgba(59,158,255,0.1);">
        <div><div style="font-size:13px; font-weight:600; color:var(--t1);">${he(fx.nombre)}</div><div style="font-size:10px; color:var(--t3);">${getFondoLabel(fx.fondo)}</div></div>
        <div style="font-family:var(--fm); font-weight:700; color:var(--a4);">${f(m)}</div>
      </div>`;
    });
  }

  if (ev.deudas && ev.deudas.length > 0) {
    html += `<div style="font-size:11px; font-weight:700; color:var(--a2); margin-bottom:6px; margin-top:10px; text-transform:uppercase;">💳 Cuotas de Deudas</div>`;
    ev.deudas.forEach(d => {
      html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,214,10,0.05); padding:8px; border-radius:6px; margin-bottom:6px; border:1px solid rgba(255,214,10,0.15);">
        <div>
          <div style="font-size:13px; font-weight:600; color:var(--t1);">${he(d.nombre)}</div>
          <div style="font-size:10px; color:var(--t3);">Vence el día ${d.diaPago || 1} · ${d.periodicidad || 'mensual'}</div>
        </div>
        <div style="font-family:var(--fm); font-weight:700; color:var(--a2);">${f(d.cuota)}</div>
      </div>`;
    });
  }

  el.innerHTML = html; 
  el.style.display = 'block';
}

const BANCOS_CO = [
  { id: 'nequi', nombre: 'Nequi', icono: '📱', color: '#b44eff' },
  { id: 'daviplata', nombre: 'Daviplata', icono: '💳', color: '#ff4444' },
  { id: 'nu', nombre: 'Nubank', icono: '💜', color: '#820ad1' },
  { id: 'lulo', nombre: 'Lulo Bank', icono: '🍋', color: '#ccff00' },
  { id: 'bancolombia', nombre: 'Bancolombia', icono: '🌻', color: '#ffd60a' },
  { id: 'davivienda', nombre: 'Davivienda', icono: '🏠', color: '#ff4444' },
  { id: 'bogota', nombre: 'Banco de Bogotá', icono: '🏛️', color: '#002855' },
  { id: 'avvillas', nombre: 'AV Villas', icono: '🏡', color: '#00478F' },
  { id: 'cajasocial', nombre: 'Caja Social', icono: '🤲', color: '#003B7A' },
  { id: 'bbva', nombre: 'BBVA', icono: '🌊', color: '#072146' },
  { id: 'colpatria', nombre: 'Colpatria', icono: '🏢', color: '#df0024' },
  { id: 'popular', nombre: 'Banco Popular', icono: '🌿', color: '#00A859' },
  { id: 'occidente', nombre: 'Banco de Occidente', icono: '🌅', color: '#0062A5' },
  { id: 'confiar', nombre: 'Confiar Coop.', icono: '🛡️', color: '#e30421' },
  { id: 'jfk', nombre: 'JFK Cooperativa', icono: '✈️', color: '#f39200' },
  { id: 'cotrafa', nombre: 'Cotrafa', icono: '⚙️', color: '#0061a9' },
  { id: 'otro', nombre: 'Otro banco', icono: '🏦', color: '#888888' }
];

function totalCuentas(){return S.cuentas.reduce((s,c)=>s+c.saldo,0);}
function guardarCuenta(){const banco=document.getElementById('cu-banco').value;const alias=document.getElementById('cu-alias').value.trim();const saldo=+document.getElementById('cu-saldo').value||0;if(!banco)return;const info=BANCOS_CO.find(b=>b.id===banco)||{id:banco,nombre:alias||banco,icono:'🏦',color:'#888'};S.cuentas.push({id:Date.now(),banco,nombre:alias||info.nombre,icono:info.icono,color:info.color,saldo});S.saldos.banco=totalCuentas();closeM('m-cuenta');save();renderAll();}

async function delCuenta(id) {
  const c = S.cuentas.find(x => x.id === id);
  if (!c) return;
  
  // 🌟 Alerta inteligente de confirmación
  const ok = await showConfirm(`⚠️ ¿Estás completamente seguro de eliminar la cuenta "${he(c.nombre)}"?\n\nEsto restará su saldo de tu Total Disponible.`, 'Eliminar Cuenta');
  if (!ok) return;
  
  S.cuentas = S.cuentas.filter(x => x.id !== id);
  S.saldos.banco = totalCuentas();
  save();
  renderAll(); // Esto refresca el Dashboard al instante
}

function renderCuentas() {
  const el=document.getElementById('cu-lst');
  if(!el)return;
  if(!S.cuentas.length){
    el.innerHTML='<div class="tm" style="padding:8px 0">Sin cuentas. Agrega tus bancos o entidades.</div>';
  } else {
    el.innerHTML=S.cuentas.map(c=>`<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r1);margin-bottom:6px"><span style="font-size:18px">${c.icono}</span><div style="flex:1"><div>${he(c.nombre)}</div><div class="mono" style="color:${c.color||'var(--a1)'}">${f(c.saldo)}</div></div><button class="btn bg bsm" onclick="editSaldoCuenta(${c.id})" title="Editar">✏️</button><button class="btn bd bsm" onclick="delCuenta(${c.id})">×</button></div>`).join('');
  }
  actualizarListasFondos();
  const campoBancoGenerico = document.getElementById('q-bk')?.parentElement;
  if (campoBancoGenerico) { campoBancoGenerico.style.display = (S.cuentas && S.cuentas.length > 0) ? 'none' : 'block'; }
}

function renderDashCuentas() {
  const el = document.getElementById('d-cuentas');
  if (!el) return;
  if (!S.cuentas || S.cuentas.length === 0) { el.innerHTML = '<div class="tm" style="padding:10px 0;">Agrega tus cuentas en la sección Quincena.</div>'; return; }
  const total = totalCuentas();
  let html = S.cuentas.map(c => {
    const pct = total > 0 ? (c.saldo / total * 100).toFixed(1) : 0;
    return `
    <div style="margin-bottom: 14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--t2);">
          <span style="font-size:16px;">${c.icono}</span><span>${he(c.nombre)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="mono" style="color:var(--a1); font-weight:600; font-size:13px;">${f(c.saldo)}</span>
          <button class="btn bg bsm" onclick="editSaldoCuentaDash(${c.id})" style="padding:3px 8px; border-radius:6px; font-size:11px;" title="Editar saldo">✏️</button>
          <button class="btn bd bsm" onclick="delCuenta(${c.id})" style="padding:3px 8px; border-radius:6px; font-size:12px; font-weight:bold;" title="Eliminar cuenta">×</button>
        </div>
      </div>
      <div class="pw" style="height:4px; margin-top:0; background:var(--s3); border-radius:4px;">
        <div class="pf" style="width:${pct}%; background:${c.color || 'var(--a1)'}; border-radius:4px;"></div>
      </div>
    </div>`;
  }).join('');
  html += `<div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--b1); padding-top:14px; margin-top:8px;"><span style="font-size:11px; font-weight:800; color:var(--t3); text-transform:uppercase; letter-spacing:1px;">Total Cuentas</span><span class="mono" style="font-size:14px; font-weight:700; color:var(--a4);">${f(total)}</span></div>`;
  el.innerHTML = html;
}

// === ZONA LIMPIA Y BLINDADA DE FUNCIONES DE EDICIÓN ===
async function editSaldoCuentaDash(id) {
  const c = S.cuentas.find(x => x.id === id);
  if (!c) return;
  const nuevoNombre = await showPrompt(`Nombre actual: "${c.nombre}"\n\nCambia el nombre (o déjalo igual):`, `Editar cuenta`, c.nombre);
  if (nuevoNombre === null) return;
  if (nuevoNombre.trim()) c.nombre = nuevoNombre.trim();
  const val = await showPrompt(`Saldo actual: ${f(c.saldo)}\n\nIngresa el nuevo saldo:`, `Saldo de ${c.nombre}`, c.saldo);
  if (val === null) return;
  c.saldo = Math.max(0, +val || 0);
  S.saldos.banco = totalCuentas();
  save();
  renderDashCuentas();
  updSaldo();
  updateDash();
}

async function editSaldoCuenta(id) { const c = S.cuentas.find(x => x.id === id); if (!c) return; const val = await showPrompt(`Saldo actual: ${f(c.saldo)}\n\nIngresa el nuevo saldo:`, `Editar ${c.nombre}`, c.saldo); if (!val) return; c.saldo = Math.max(0, +val || 0); S.saldos.banco = totalCuentas(); save(); renderAll(); }

window.editEfectivoDash = async function() { 
  const val = await showPrompt(`Efectivo registrado: ${f(S.saldos.efectivo)}\n\nIngresa el dinero físico exacto que tienes ahora en tu billetera:`, `💵 Actualizar Efectivo`, S.saldos.efectivo); 
  if (val === null) return; 
  S.saldos.efectivo = Math.max(0, +val || 0); 
  save(); 
  updSaldo(); 
  updateDash(); 
};

function calcPrima(){const m=+document.getElementById('prm-mo').value||0;if(!m)return;setHtml('prm-res',`<div style="margin-top:14px;padding:14px;background:var(--s2);border-radius:var(--r2)"><div class="tm">Sugerencia (30/40/30)</div><div class="fb"><span>💳 Deudas</span><span class="mono">${f(m*0.3)}</span></div><div class="fb"><span>🛡️ Ahorro</span><span class="mono">${f(m*0.4)}</span></div><div class="fb"><span>🎉 Gustos</span><span class="mono">${f(m*0.3)}</span></div></div>`);}

function guardarPrima() {
    const m = +document.getElementById('prm-mo').value || 0;
    if(!m) return;
    const fo = document.getElementById('prm-fo') ? document.getElementById('prm-fo').value : 'banco';
    S.ingreso += m;
    S.gastos.unshift({ id: Date.now(), desc: '🎉 Prima/Bono', monto: m, montoTotal: m, cat: 'otro', tipo: 'ahorro', fondo: fo, hormiga: false, cuatroXMil: false, fecha: hoy(), metaId: '', autoFijo: false });
    refF(fo, m);
    closeM('m-prima');
    save();
    renderAll();
}
// =======================================================


// ─── 9. DASHBOARD Y DIAN ───
function updateDash() {
  // EFICIENCIA: Contamos todo en una sola pasada (Loop)
  let tG = 0, tA = 0, tH = 0, tN = 0, tD = 0;
  
  for (let i = 0; i < S.gastos.length; i++) {
    const g = S.gastos[i];
    const m = g.montoTotal || g.monto;
    
    if (g.tipo === 'ahorro') tA += m;
    else tG += m;
    
    if (g.tipo === 'hormiga' || g.hormiga) tH += m;
    if (g.tipo === 'necesidad') tN += m;
    if (g.tipo === 'deseo') tD += m;
  }
  
  setEl('d-ing', f(S.ingreso));
  setEl('d-gas', f(tG));
  setEl('d-pgc', `${S.ingreso > 0 ? Math.round(tG / S.ingreso * 100) : 0}% del ingreso`);
  setEl('d-aho', f(tA));
  const pctHormiga = S.ingreso > 0 ? Math.min(Math.round(tH / S.ingreso * 100), 100) : 0;
  setEl('d-hor', f(tH));
  setEl('d-phc', `${pctHormiga}% del ingreso`);
  const horBarra = document.getElementById('d-hor-barra');
  if (horBarra) horBarra.style.width = `${pctHormiga}%`;
  
  updSaldo();
  
  if(S.ingreso>0){
    const p=getPct();
    const bar = (l, g, b, col) => {
      const u = b > 0 ? Math.min(g / b * 100, 100) : 0;
      const ov = g > b;
      return `
      <div style="margin-bottom: 20px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:10px;">
          <span style="font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--t2);">${l}</span>
          <div style="text-align:right;">
            <div class="mono" style="font-size:18px; font-weight:800; color:${ov ? 'var(--dan)' : col}; line-height:1;">${f(g)}</div>
            <div class="tm" style="font-size:11px; color:var(--t3); margin-top:4px;">de ${f(b)} presupuestado</div>
          </div>
        </div>
        <div class="pw" style="height:8px; border-radius:8px; background:var(--s3);">
          <div class="pf" style="width:${u}%; background:${ov ? 'var(--dan)' : col}; border-radius:8px; transition: width 0.5s ease;"></div>
        </div>
      </div>`;
    };

    setHtml('d-bud',bar('🏠 Necesidades',S.gastos.filter(g=>g.tipo==='necesidad').reduce((s,g)=>s+(g.montoTotal||g.monto),0),S.ingreso*p.n/100,'var(--a4)')+bar('🎉 Deseos',S.gastos.filter(g=>g.tipo==='deseo').reduce((s,g)=>s+(g.montoTotal||g.monto),0),S.ingreso*p.d/100,'var(--a2)')+bar('💰 Ahorro',tA,S.ingreso*p.a/100,'var(--a1)'));
  }
  
  const cm=consolMes();
  setEl('m-ing',f(cm.ing));
  setEl('m-eg',f(cm.eg));
  const balEl=document.getElementById('m-bal');
  if(balEl){balEl.textContent=f(cm.bal);balEl.style.color=cm.bal>=0?'var(--a1)':'var(--dan)';}
  setHtml('m-det',`${cm.q} quincena(s) del mes`);
  
  const antI={};S.gastos.filter(g=>g.hormiga).forEach(g=>{antI[g.desc]=(antI[g.desc]||0)+g.monto;});
  
  const filasMovimientos = S.gastos.slice(0, 6).map(g => {
    let cIcono = '🏦', cNom = 'Banco';
    if (g.fondo === 'efectivo') { cIcono = '💵'; cNom = 'Efectivo'; }
    else if (g.fondo?.startsWith('cuenta_')) {
      const c = S.cuentas.find(x => x.id === +g.fondo.split('_')[1]);
      if (c) { cIcono = c.icono; cNom = c.nombre; }
    }
    const colorMonto = g.tipo === 'ahorro' ? 'var(--a1)' : 'var(--a3)';
    const colorPill = g.tipo === 'necesidad' ? 'pb' : (g.tipo === 'ahorro' ? 'pg' : 'py');
    const nomCat = CATS[g.cat] || '📦 Otro';
    return `<tr>
      <td class="mono" style="font-size:10px">${g.fecha}</td>
      <td><div style="font-weight:600">${he(g.desc)}</div><div style="font-size:10px; color:var(--t3); margin-top:2px;">${nomCat}</div></td>
      <td><span class="pill ${colorPill}">${g.tipo}</span></td>
      <td><span class="pill pm" style="background:var(--s2); border:1px solid var(--b2); color:var(--t1)">${cIcono} ${he(cNom)}</span></td>
      <td class="ac mono" style="color:${colorMonto};font-weight:600">${f(g.montoTotal||g.monto)}</td>
    </tr>`;
  });
  setHtml('d-rec', S.gastos.length ? filasMovimientos.join('') : '<tr><td colspan="5" class="emp">Sin movimientos</td></tr>');
  
  // Preview de Objetivos en el Dashboard
  const dMetEl = document.getElementById('d-met');
  if(dMetEl) {
    if(!S.objetivos || !S.objetivos.length) {
      dMetEl.innerHTML = '<div class="emp"><span class="emp-icon">◯</span>Sin objetivos creados</div>';
    } else {
      dMetEl.innerHTML = S.objetivos.slice(0,3).map(o => {
        const pct = o.objetivoAhorro > 0 ? Math.min((o.ahorrado / o.objetivoAhorro) * 100, 100) : 0;
        const col = pct >= 100 ? 'var(--a1)' : pct > 50 ? 'var(--a2)' : 'var(--a4)';
        return `<div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:12px; font-weight:600;">${o.icono} ${he(o.nombre)}</span>
            <span style="font-family:var(--fm); font-size:11px; font-weight:700; color:${col};">${Math.round(pct)}%</span>
          </div>
          <div class="pw" style="height:4px;"><div class="pf" style="width:${pct}%; background:${col};"></div></div>
          <div style="display:flex; justify-content:space-between; margin-top:4px;">
            <span class="tm" style="font-size:10px;">${f(o.ahorrado)} ahorrado</span>
            <span class="tm" style="font-size:10px;">Meta: ${f(o.objetivoAhorro)}</span>
          </div>
        </div>`;
      }).join('') + (S.objetivos.length > 3 ? `<div class="tm" style="text-align:center; margin-top:4px;">+${S.objetivos.length - 3} objetivos más</div>` : '');
    }
  }

  const al=[];
  const mesActual = new Date().getMonth() + 1; 
  if (mesActual === 6 || mesActual === 12) {
    al.push(`<div class="al alg" style="align-items:center; border-width:2px;"><span class="al-icon" style="font-size:24px;">🎉</span><div style="flex:1"><strong>¡Es época de Prima/Bono!</strong> Si recibiste este dinero extra, regístralo aquí para simular su distribución inteligente.</div><button class="btn bp bsm" onclick="openM('m-prima')" style="white-space:nowrap; padding:8px 12px; font-size:12px;">+ Registrar Prima</button></div>`);
  }
  
  const anioActual = new Date().getFullYear().toString(); 
  let ingresosAnio = S.ingreso; 
  S.historial.forEach(h => { if(h.periodo && h.periodo.includes(anioActual)) ingresosAnio += h.ingreso; });
  const topeDian = 73323600; // 1.400 UVT × $52.374 (UVT 2026, Resolución DIAN 000238 dic-2025)

  if(ingresosAnio >= topeDian) {
    al.push(`<div class="al ald"><span class="al-icon">🏛️</span><div><strong>Alerta DIAN (Declaración de Renta):</strong> Tus ingresos este año suman <strong>${f(ingresosAnio)}</strong>. Has superado el tope legal aproximado (${f(topeDian)}). Contacta a un contador público.</div></div>`);
  } else if(ingresosAnio >= 50000000) { 
    al.push(`<div class="al alw"><span class="al-icon">🏛️</span><div><strong>Aviso DIAN:</strong> Llevas <strong>${f(ingresosAnio)}</strong> este año. Estás próximo a superar el tope legal para declarar renta (aprox. ${f(topeDian)}). Ve reuniendo tus soportes.</div></div>`);
  }

  if(S.saldos.efectivo===0 && S.saldos.banco===0 && S.ingreso>0) {
    al.push(`<div class="al alb"><span class="al-icon">💡</span><div>Saldos en $0. Ve a <strong>Quincena</strong> y configura cuánto tienes en efectivo y banco.</div></div>`);
  }
  
  if(tG > S.ingreso * 0.9 && S.ingreso > 0) {
    al.push(`<div class="al ald"><span class="al-icon">🚨</span><div>Gastas más del 90% de tu ingreso esta quincena. Revisa tus finanzas urgente.</div></div>`);
  }

  if(tH > S.ingreso * 0.15 && S.ingreso > 0) {
    const pctHormiga = Math.round((tH / S.ingreso) * 100);
    al.push(`<div class="al alw"><span class="al-icon">🐜</span><div>Tus gastos hormiga ya representan el <strong>${pctHormiga}%</strong> de tu ingreso (${f(tH)}). ¡Es una fuga de capital muy alta!</div></div>`);
  }

  if(tA === 0 && S.gastos.length > 3) {
    al.push(`<div class="al alw"><span class="al-icon">💰</span><div>No has registrado ningún ahorro esta quincena. ¡Págate a ti primero!</div></div>`);
  }

  const sq = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + d.cuota, 0);
  const sm = S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0);
  let cPer = 0;
  if (S.tipoPeriodo === 'mensual') cPer = (sq * 2) + sm;
  else if (S.tipoPeriodo === 'q1' || S.quincena === 1) cPer = sq + sm;
  else cPer = sq;

  if(cPer > S.ingreso * 0.3 && S.ingreso > 0) {
    al.push(`<div class="al ald"><span class="al-icon">💳</span><div>Las cuotas de tus deudas (${f(cPer)}) superan el 30% de tu ingreso. Estás en zona de riesgo financiero.</div></div>`);
  }

  const mes = mesStr();
  const fijNP = S.gastosFijos.filter(g => !g.pagadoEn.includes(mes));
  if(fijNP.length) {
    al.push(`<div class="al alb"><span class="al-icon">📌</span><div><strong>${fijNP.length}</strong> gasto(s) fijo(s) sin pagar este mes: ${fijNP.map(g=>g.nombre).join(', ')}.</div></div>`);
  }
  
  setHtml('d-alr', al.join(''));
}

async function cerrarQ(){if(!S.ingreso)return;const ok=await showConfirm('¿Archivar período?','Cerrar');if(!ok)return;const tG=S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0);const tA=S.gastos.filter(g=>g.tipo==='ahorro').reduce((s,g)=>s+g.monto,0);const tH=S.gastos.filter(g=>g.hormiga).reduce((s,g)=>s+g.monto,0);const catMap={};S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>{catMap[g.cat]=(catMap[g.cat]||0)+(g.montoTotal||g.monto);});S.historial.unshift({id:Date.now(),periodo:`Quincena cerrada: ${hoy()}`,mes:mesStr(),ingreso:S.ingreso,gastado:tG,ahorro:tA,hormiga:tH,catMap});S.gastos=[];S.ingreso=0;save();renderAll();go('hist');}
function consolMes(){const mes=mesStr();const hist=S.historial.filter(h=>h.mes===mes);let ing=0,eg=0;hist.forEach(h=>{ing+=h.ingreso;eg+=h.gastado;});const gasAct = S.gastos.filter(g => g.tipo !== 'ahorro').reduce((s, g) => s + (g.montoTotal ?? g.monto), 0);return{ing:ing+S.ingreso,eg:eg+gasAct,bal:(ing+S.ingreso)-(eg+gasAct),q:hist.length+(S.ingreso>0?1:0)};}
function renderHistorial() {
  const el = document.getElementById('hi-lst');
  if (!el) return;

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
    const balance = hx.ingreso - hx.gastado;
    const colorBal = balance >= 0 ? 'var(--a1)' : 'var(--dan)';
    const signoBal = balance >= 0 ? '+' : '';
    const tasaAhorro = hx.ingreso > 0 ? Math.round((hx.ahorro / hx.ingreso) * 100) : 0;
    const tasaGasto = hx.ingreso > 0 ? Math.round((hx.gastado / hx.ingreso) * 100) : 0;

    // Barra de distribución visual
    const pctGasto = hx.ingreso > 0 ? Math.min((hx.gastado / hx.ingreso) * 100, 100) : 0;
    const pctAhorro = hx.ingreso > 0 ? Math.min((hx.ahorro / hx.ingreso) * 100, 100) : 0;
    const pctHormiga = hx.ingreso > 0 ? Math.min(((hx.hormiga || 0) / hx.ingreso) * 100, 100) : 0;

    return `
    <article class="hist-card" aria-label="Historial: ${hx.periodo}">

      <!-- CABECERA -->
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

      <!-- CUERPO: 4 métricas -->
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

      <!-- BARRA DE DISTRIBUCIÓN -->
      <div style="padding:12px 20px 16px;">
        <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Distribución del período</div>
        <div style="height:8px; border-radius:999px; background:var(--s3); overflow:hidden; display:flex;">
          <div style="width:${pctGasto}%; background:var(--dan); transition:width .6s ease;" title="Gastos ${tasaGasto}%"></div>
          <div style="width:${pctAhorro}%; background:var(--a1); transition:width .6s ease;" title="Ahorro ${tasaAhorro}%"></div>
          <div style="width:${pctHormiga}%; background:var(--a2); transition:width .6s ease;" title="Hormiga"></div>
        </div>
        <div style="display:flex; gap:14px; margin-top:6px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--t3);">
            <div style="width:8px; height:8px; border-radius:50%; background:var(--dan); flex-shrink:0;"></div> Gastos
          </div>
          <div style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--t3);">
            <div style="width:8px; height:8px; border-radius:50%; background:var(--a1); flex-shrink:0;"></div> Ahorro
          </div>
          ${hx.hormiga > 0 ? `<div style="display:flex; align-items:center; gap:4px; font-size:10px; color:var(--t3);">
            <div style="width:8px; height:8px; border-radius:50%; background:var(--a2); flex-shrink:0;"></div> Hormiga ${f(hx.hormiga||0)}
          </div>` : ''}
        </div>
      </div>

    </article>`;
  }).join('');
}
function delHistorial(id){S.historial=S.historial.filter(h=>h.id!==id);save();renderHistorial();}

// =========================================================
// ALGORITMO DE SALUD FINANCIERA (CON CHECKLIST INTELIGENTE)
// =========================================================
function calcScore() {
  const elScore = document.getElementById('stat-score');
  const elLabel = document.getElementById('stat-score-label');
  const elMsg = document.getElementById('stat-score-msg');
  if(!elScore || !elMsg || !elLabel) return;

  const tG = S.gastos.filter(g => g.tipo !== 'ahorro').reduce((s, g) => s + (g.montoTotal || g.monto), 0);
  const tA = S.gastos.filter(g => g.tipo === 'ahorro').reduce((s, g) => s + g.monto, 0);
  const tH = S.gastos.filter(g => g.tipo === 'hormiga' || g.hormiga).reduce((s, g) => s + g.monto, 0);

  if(S.ingreso === 0 && S.gastos.length === 0) {
    elScore.textContent = '-'; elLabel.textContent = 'Sin datos'; elMsg.innerHTML = ''; return;
  }

  const ptsAhorro = S.ingreso > 0 ? Math.min(((tA / S.ingreso) / 0.20) * 40, 40) : 0;
  
  const sq = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + d.cuota, 0);
  const sm = S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0);
  let cPer = 0;
  if (S.tipoPeriodo === 'mensual') cPer = (sq * 2) + sm;
  else if (S.tipoPeriodo === 'q1') cPer = sq + sm;
  else cPer = sq;
  const pctDeuda = S.ingreso > 0 ? (cPer / S.ingreso) : 0;

  const ptsDeuda = pctDeuda <= 0.30 ? 30 : Math.max(0, 30 - ((pctDeuda - 0.30) * 100));
  const statsFondo = calcularFondoEmergencia();
  const ptsFondo = Math.min(((parseFloat(statsFondo.porcentajeCompletado) || 0) / 100) * 30, 30);

  const totalScore = Math.round(ptsAhorro + ptsDeuda + ptsFondo);
  elScore.textContent = totalScore;
  
  let colorClass = ''; let frase = '';
  if (totalScore >= 80) { colorClass = 'fs-excellent'; frase = 'Excelente — Finanzas muy saludables'; }
  else if (totalScore >= 60) { colorClass = 'fs-acceptable'; frase = 'Buen camino — Hay margen de mejora'; }
  else if (totalScore >= 40) { colorClass = 'fs-bad'; frase = 'Alerta — Revisa tus gastos pronto'; }
  else { colorClass = 'fs-very-bad'; frase = 'Riesgo — Necesitas un plan de acción'; }

  elScore.className = `fin-score ${colorClass}`;
  elLabel.textContent = frase;
  elLabel.style.color = 'var(--t3)';
  elLabel.style.textTransform = 'none';
  elLabel.style.fontWeight = '500';
  elLabel.style.fontSize = '12px';
  
  let checklist = [];
  if (S.ingreso > 0 && tG > S.ingreso * 0.9) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">❌</span><span style="color:var(--t3); font-size:13px;">Gastos exceden el 90%</span></div>`);
  else checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--a1); font-size:13px;">✅</span><span style="color:var(--a1); font-size:13px;">Gastos bajo control</span></div>`);
  if (tA > 0) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--a1); font-size:13px;">✅</span><span style="color:var(--a1); font-size:13px;">Ahorro constante</span></div>`);
  else checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">❌</span><span style="color:var(--t3); font-size:13px;">Sin ahorro registrado</span></div>`);
  if (S.ingreso > 0 && tH > S.ingreso * 0.15) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">❌</span><span style="color:var(--t3); font-size:13px;">Fuga hormiga alta</span></div>`);
  else checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--a1); font-size:13px;">✅</span><span style="color:var(--a1); font-size:13px;">Hormiga controlada</span></div>`);
  if (cPer > 0) {
    if (cPer > S.ingreso * 0.3) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">💳</span><span style="color:var(--t3); font-size:13px;">Deudas >30% del ingreso</span></div>`);
    else checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--a1); font-size:13px;">✅</span><span style="color:var(--a1); font-size:13px;">Deudas bajo control</span></div>`);
  }
  if (S.objetivos && S.objetivos.length > 0) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">🎯</span><span style="color:var(--a1); font-size:13px;">Metas de ahorro activas</span></div>`);
  
  elMsg.className = 'score-checklist';
  elMsg.innerHTML = checklist.join('');
}

// ─── 10. CALCULADORAS (BLINDADAS) ───
function toggleCalc(id){const body=document.getElementById(id+'-body');body.classList.toggle('open');body.classList.toggle('closed');if(id==='cdt')cCDT();if(id==='cre')cCre();if(id==='ic')cIC();if(id==='pila')cPila();if(id==='inf')cInf();if(id==='r72')cR72();}
function cCDT() {
  const c = +document.getElementById('cc-cap')?.value || 0;
  const t = +document.getElementById('cc-tas')?.value / 100 || 0;
  const d = +document.getElementById('cc-dia')?.value || 0;
  const per = document.getElementById('cc-per')?.value;
  const ck = document.getElementById('cc-ret')?.checked;
  
  const rendTotal = c * (Math.pow(1 + t, d / 365) - 1);
  const netTotal = ck ? rendTotal * (1 - RETEFUENTE_CDT) : rendTotal;
  
  if (per === '30') {
    const tem = Math.pow(1 + t, 1 / 12) - 1;
    const rendMensual = c * tem;
    const netMensual = ck ? rendMensual * (1 - RETEFUENTE_CDT) : rendMensual;
    
    setHtml('cdt-res', `<div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);"><div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Recibirás en tu cuenta cada mes:</div><div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(netMensual)}</div><div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px;">Ganancia sumada al final del plazo: <strong>${f(netTotal)}</strong></div></div>`);
  } else {
    setHtml('cdt-res', `<div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);"><div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Ganancia neta total al final del plazo:</div><div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(netTotal)}</div></div>`);
  }
}
function cCre(){const p=+document.getElementById('cr-mo')?.value||0;const tm = Number(document.getElementById('cr-ta')?.value) || 0;const n=+document.getElementById('cr-n')?.value||0;const cu=tm===0?p/n:(p*(tm*Math.pow(1+tm,n))/(Math.pow(1+tm,n)-1));setHtml('cre-res',`<div class="crv">${f(cu)} cuota mensual</div>`);}
function cIC(){const c=+document.getElementById('ic-cap')?.value||0;const a=+document.getElementById('ic-apo')?.value||0;const ta=+document.getElementById('ic-tas')?.value/100||0;const m=+document.getElementById('ic-mes')?.value||0;const tm=Math.pow(1+ta,1/12)-1;const vf=tm>0?c*Math.pow(1+tm,m)+a*(Math.pow(1+tm,m)-1)/tm:c+a*m;setHtml('ic-res',`<div class="crv">${f(vf)} valor final</div>`);}
function cMeta() {
  const e = document.getElementById('ma-tot');
  if (!e) return;
  const M = +e.value || 0;
  const T = +document.getElementById('ma-ten')?.value || 0;
  const fe = document.getElementById('ma-fe')?.value;
  const falta = Math.max(0, M - T);

  if (!falta || falta <= 0) { setHtml('ma-res', ''); return; }

  if (fe) {
    const dias = Math.max(0, Math.ceil((new Date(fe + 'T12:00:00') - new Date()) / 86400000));
    if (dias <= 0) {
      setHtml('ma-res', `<div style="color:var(--dan); font-size:12px; padding:10px; text-align:center;">La fecha ya pasó. Elige una fecha futura.</div>`);
      return;
    }
    const frecs = [
      { label: 'Por día',      dias: 1  },
      { label: 'Por semana',   dias: 7  },
      { label: 'Por quincena', dias: 15 },
      { label: 'Por mes',      dias: 30 },
    ];
    const grid = frecs.map(fr => {
      const periodos = Math.max(1, dias / fr.dias);
      return `
        <div style="background:rgba(157,115,235,.08); border:1px solid rgba(157,115,235,.2); border-radius:10px; padding:12px; text-align:center;">
          <div style="font-size:10px; color:var(--a5); font-weight:700; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px;">${fr.label}</div>
          <div style="font-family:var(--fm); font-size:18px; font-weight:800; color:var(--t1);">${f(falta / periodos)}</div>
        </div>`;
    }).join('');
    setHtml('ma-res', `
      <div style="margin-top:4px;">
        <div style="font-size:11px; color:var(--t3); margin-bottom:10px; text-align:center;">
          Faltan <strong style="color:var(--t2);">${dias} días</strong> · Por ahorrar: <strong style="color:var(--a5);">${f(falta)}</strong>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">${grid}</div>
      </div>`);
  } else {
    // Sin fecha: calculadora interactiva con frecuencia elegible
    setHtml('ma-res', `
      <div style="margin-top:4px;">
        <div style="font-size:11px; color:var(--t3); margin-bottom:10px;">
          Por ahorrar: <strong style="color:var(--a5);">${f(falta)}</strong>. ¿Cuánto puedes apartar por período?
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <input type="number" id="ma-aporte" placeholder="Ej: 200.000" inputmode="decimal"
            style="flex:1; min-width:120px;" oninput="cMetaAporte()">
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

// Calculadora interactiva cuando el usuario no tiene fecha definida
function cMetaAporte() {
  const falta = Math.max(0,
    (+document.getElementById('ma-tot')?.value || 0) -
    (+document.getElementById('ma-ten')?.value || 0)
  );
  const aporte = +document.getElementById('ma-aporte')?.value || 0;
  const diasPer = +document.getElementById('ma-frec')?.value || 15;
  const resEl = document.getElementById('ma-aporte-res');
  if (!resEl || aporte <= 0 || falta <= 0) { if (resEl) resEl.innerHTML = ''; return; }

  const periodos = Math.ceil(falta / aporte);
  const diasTotal = periodos * diasPer;
  const nombres = { 30: 'mes', 15: 'quincena', 7: 'semana', 1: 'día' };
  const frecNombre = nombres[diasPer] || 'período';

  let tiempoStr = '';
  if (diasTotal < 30) tiempoStr = `${diasTotal} días`;
  else if (diasTotal < 365) { const m = Math.ceil(diasTotal / 30); tiempoStr = `${m} mes${m !== 1 ? 'es' : ''}`; }
  else { const a = Math.floor(diasTotal / 365); const mr = Math.floor((diasTotal % 365) / 30); tiempoStr = `${a} año${a !== 1 ? 's' : ''}${mr > 0 ? ` y ${mr} mes${mr !== 1 ? 'es' : ''}` : ''}`; }

  resEl.innerHTML = `
    <div style="background:rgba(157,115,235,.1); border:1px solid rgba(157,115,235,.2); border-radius:8px; padding:12px; text-align:center;">
      <div style="font-size:12px; color:var(--t2); margin-bottom:4px;">Ahorrando <strong>${f(aporte)}</strong> por ${frecNombre} llegarás en:</div>
      <div style="font-family:var(--fm); font-size:22px; font-weight:800; color:var(--a5);">${tiempoStr}</div>
      <div style="font-size:11px; color:var(--t3); margin-top:4px;">${periodos} ${frecNombre}${periodos !== 1 ? 's' : ''}</div>
    </div>`;
}
function cPila(){
  const ingEl = document.getElementById('pl-ing');
  const arlEl = document.getElementById('pl-arl');
  const resEl = document.getElementById('pila-res');
  if(!ingEl || !resEl) return;
  const ing = +ingEl.value || 0;
  const arl = +(arlEl?.value || 0.00522);
  if(ing <= 0){ resEl.innerHTML = ''; return; }
  const SMMLV_2026 = 1_750_905;
  const ibc = Math.max(ing * 0.40, SMMLV_2026);
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
        <div style="display:flex; justify-content:space-between;"><span>⚠️ ARL</span><strong style="font-family:var(--fm);">${f(arlVal)}</strong></div>
        <div style="border-top:1px solid var(--b1); padding-top:8px; display:flex; justify-content:space-between;"><strong>Total a pagar</strong><strong style="font-family:var(--fm); color:var(--dan); font-size:16px;">${f(tot)}</strong></div>
      </div>
    </div>`;
}

function cInf() {
  const cap = +document.getElementById('in-cap')?.value || 0;
  const tas = +document.getElementById('in-tas')?.value || 0;
  const inf = +document.getElementById('in-inf')?.value || 0;
  
  const real = (((1 + (tas/100)) / (1 + (inf/100))) - 1) * 100;
  const gananciaNominal = cap * (tas/100);
  const gananciaReal = cap * (real/100);
  const perdidaInflacion = gananciaNominal - gananciaReal;

  const color = real > 0 ? 'var(--a1)' : 'var(--dan)';
  const msg = real > 0 ? '✅ ¡Genial! Tu dinero está creciendo por encima de la inflación.' : '🚨 ¡Cuidado! Aunque el banco te pague intereses, estás perdiendo poder adquisitivo.';

  let html = `<div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);"><div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Tu rentabilidad REAL exacta es:</div><div style="font-size:24px; color:${color}; font-family:var(--fm); font-weight:700;">${real.toFixed(2)}%</div>`;

  if (cap > 0) {
    html += `<div style="margin-top:14px; font-size:13px; color:var(--t2); line-height:1.6; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px; border:1px dashed var(--b1);"><div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>🏦 Ganancia en el banco (Nominal):</span><strong style="color:var(--a1); font-family:var(--fm)">+${f(gananciaNominal)}</strong></div><div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--b1);"><span>🚨 Se lo "come" la inflación:</span><strong style="color:var(--dan); font-family:var(--fm)">-${f(perdidaInflacion)}</strong></div><div style="display:flex; justify-content:space-between;"><span>🛒 Poder de compra (Ganancia Real):</span><strong style="color:${color}; font-family:var(--fm)">+${f(gananciaReal)}</strong></div></div>`;
  }
  html += `<div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px;">${msg}</div></div>`;
  setHtml('inf-res', html);
}

function cR72() {
  const cap = +document.getElementById('r72-cap')?.value || 0;
  const tas = +document.getElementById('r72-tas')?.value || 0;
  if (tas <= 0) { setHtml('r72-res', ''); return; }
  const years = 72 / tas;
  const fullYears = Math.floor(years);
  const months = Math.round((years % 1) * 12);

  let timeStr = `${fullYears} años`;
  if (months > 0) timeStr += ` y ${months} meses`;

  let html = `<div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);"><div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Tu dinero se duplicará en:</div><div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${timeStr}</div>`;
  if (cap > 0) {
    const finalAmount = cap * 2;
    html += `<div style="margin-top:14px; font-size:13px; color:var(--t2); line-height:1.6; background:rgba(255,255,255,0.03); padding:12px; border-radius:6px; border:1px dashed var(--b1);"><div style="display:flex; justify-content:space-between; margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--b1);"><span>💰 Capital inicial:</span><strong style="color:var(--t3); font-family:var(--fm)">${f(cap)}</strong></div><div style="display:flex; justify-content:space-between;"><span>🎯 Se convertirá mágicamente en:</span><strong style="color:var(--a1); font-family:var(--fm)">${f(finalAmount)}</strong></div></div>`;
  }
  html += `<div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px;">🚀 ¡Sin hacer nada más! Solo dejando que el interés compuesto haga su magia a una tasa del ${tas}%.</div></div>`;
  setHtml('r72-res', html);
}

// ─── 11. EXPORTACIÓN ───
function exportarDatos(){const data=JSON.stringify(S,null,2);const blob=new Blob([data],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`finko_${hoy()}.json`;a.click();URL.revokeObjectURL(url);}

function importarDatos(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=function(ev){try{const d=JSON.parse(ev.target.result);if(typeof d!=='object'||d===null||Array.isArray(d)){showAlert('El archivo no tiene un formato válido de Finko Pro.','Error de importación');return;}Object.assign(S,d);save();renderAll();go('dash');showAlert('✅ Datos importados correctamente.','Importación exitosa');}catch(err){showAlert('No se pudo leer el archivo. Asegúrate de que sea un backup válido de Finko Pro.','Error de importación');console.error('importarDatos:',err);}};r.readAsText(f);}

// Carga XLSX solo cuando se necesita (lazy-load). Libera ~1.2MB de carga inicial.
async function cargarXLSX() {
  if (window.XLSX) return; // Ya estaba cargado, no hacer nada
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar el exportador'));
    document.head.appendChild(script);
  });
}

async function exportarCSV() {
  if (!S.gastos.length) { showAlert('No hay gastos registrados para exportar.', 'Sin datos'); return; }

  try {
    await cargarXLSX();
  } catch (err) {
    showAlert('No se pudo cargar la librería de Excel. Verifica tu conexión a internet e intenta de nuevo.', 'Error de exportación');
    return;
  }

  const filas = [
    ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Fondo', 'Hormiga', '4x1000', 'Monto']
  ];
  S.gastos.forEach(g => {
    let nombreFondo = 'Banco';
    if (g.fondo === 'efectivo') nombreFondo = 'Efectivo';
    else if (g.fondo && g.fondo.startsWith('cuenta_')) {
      const c = S.cuentas.find(x => x.id === +g.fondo.split('_')[1]);
      if (c) nombreFondo = c.nombre;
    }
    filas.push([
      g.fecha,
      g.desc,
      CATS[g.cat] || g.cat,
      g.tipo,
      nombreFondo,
      g.hormiga ? 'Sí' : 'No',
      g.cuatroXMil ? 'Sí' : 'No',
      g.montoTotal || g.monto
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
  XLSX.writeFile(wb, `finko_gastos_${hoy()}.xlsx`);
}

function descargarCSVDirecto() {
  exportarCSV();
}

// ─── 12. FONDO DE EMERGENCIA ───
function calcularFondoEmergencia() {
  const gFijo = (S.gastosFijos||[]).reduce((acc, g) => {
    const monto = Number(g.monto) || 0; 
    const montoMensual = (g.periodicidad === 'quincenal') ? (monto * 2) : monto;
    return acc + montoMensual;
  }, 0);
  
  const mesesMeta = S.fondoEmergencia?.objetivoMeses || 6;
  const montoObjetivoTotal = gFijo * mesesMeta;
  const dineroActual = Number(S.fondoEmergencia?.actual) || 0;
  const faltaPorAhorrar = Math.max(0, montoObjetivoTotal - dineroActual);
  const porcentajeCompletado = montoObjetivoTotal > 0 ? (dineroActual / montoObjetivoTotal) * 100 : 0;
  const mesesCubiertos = gFijo > 0 ? dineroActual / gFijo : 0;
  
  return { 
    gastoMensualFijo: gFijo, 
    montoObjetivoTotal, 
    actual: dineroActual, 
    faltaPorAhorrar,
    porcentajeCompletado: Math.min(porcentajeCompletado, 100).toFixed(1), 
    mesesCubiertos: mesesCubiertos.toFixed(1) 
  };
}

function actualizarVistaFondo() {
  const stats = calcularFondoEmergencia();
  const elMeses = document.getElementById('fe-meses-cobertura');
  const elBarra = document.getElementById('fe-barra-progreso');
  
  if(elMeses) elMeses.innerHTML = `<strong>${stats.mesesCubiertos}</strong> de 6 meses cubiertos`;
  if(elBarra) elBarra.style.width = `${stats.porcentajeCompletado}%`;
  
  setEl('fe-dinero-actual', f(stats.actual)); 
  setEl('fe-dinero-objetivo', f(stats.faltaPorAhorrar));
}

function registrarAbonoFondo() {
  const inputAbono = document.getElementById('fe-monto-abono');
  const monto = +(inputAbono?.value || 0);
  const fondoOrigen = document.getElementById('fe-fo')?.value; 
  
  if(monto <= 0) { showAlert('Ingresa un monto válido.', 'Inválido'); return; }
  
  if(fondoOrigen) desF(fondoOrigen, monto);
  S.gastos.unshift({ id: Date.now(), desc: `🛡️ Abono Fondo Emergencia`, monto, montoTotal: monto, cat: 'ahorro', tipo: 'ahorro', fondo: fondoOrigen || 'banco', hormiga: false, cuatroXMil: false, fecha: hoy(), metaId: '', autoFijo: false });
  
  if(!S.fondoEmergencia) S.fondoEmergencia = { objetivoMeses: 6, actual: 0 };
  S.fondoEmergencia.actual += monto;
  
  save(); actualizarVistaFondo(); renderAll();
  if(inputAbono) inputAbono.value = '';
  closeM('m-fondo-emergencia');
  showAlert('¡Dinero blindado con éxito en tu Fondo de Emergencia! 🛡️', 'Fondo Actualizado');
}

// ─── 13. HELPERS Y MODALES ───
let _lastFocused = null;

function openM(id) {
  _lastFocused = document.activeElement;
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  requestAnimationFrame(() => {
    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  });
}

function closeM(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('open');
  if (_lastFocused && typeof _lastFocused.focus === 'function') {
    _lastFocused.focus();
    _lastFocused = null;
  }
}
function sr(msg){ const el = document.getElementById('sr-announcer'); if(!el) return; el.textContent = ''; requestAnimationFrame(() => { el.textContent = msg; }); }
function f(n){return'$'+Math.round(n||0).toLocaleString('es-CO');}
function hoy(){return new Date().toISOString().split('T')[0];}
function mesStr(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;}
function he(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function setHtml(id,v){const e=document.getElementById(id);if(e)e.innerHTML=v;}
function setEl(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}

let _cdlgRes=null,_cdlgPMode=false,_cdlgExp=null;
window._cdlgRes=function(ok){
  if(_cdlgPMode&&_cdlgExp&&ok){
    const v=document.getElementById('cdlg-input').value;
    if(v!==_cdlgExp){
      document.getElementById('cdlg-input').style.border='1px solid var(--dan)';
      return;
    }
  }
  document.getElementById('cdlg-ov').classList.remove('open');
  document.getElementById('cdlg-cancel').style.display='';
  document.getElementById('cdlg-input').style.border='';
  if(_cdlgPMode){
    const v=document.getElementById('cdlg-input').value;
    if(_cdlgRes)_cdlgRes(ok?v:null);
  }else{
    if(_cdlgRes)_cdlgRes(ok);
  }
  _cdlgRes=null;
};
function showConfirm(msg,title='Confirmar'){return new Promise(r=>{_cdlgRes=r;_cdlgPMode=false;setEl('cdlg-title',title);setEl('cdlg-msg',msg);document.getElementById('cdlg-input-wrap').style.display='none';document.getElementById('cdlg-cancel').style.display='';document.getElementById('cdlg-ov').classList.add('open');});}
function showAlert(msg,title='Aviso'){return new Promise(r=>{_cdlgRes=r;_cdlgPMode=false;setEl('cdlg-title',title);setEl('cdlg-msg',msg);document.getElementById('cdlg-input-wrap').style.display='none';document.getElementById('cdlg-cancel').style.display='none';document.getElementById('cdlg-ov').classList.add('open');});}
function showPromptConfirm(msg,exp,title='Peligro'){return new Promise(r=>{_cdlgRes=r;_cdlgPMode=true;_cdlgExp=exp;setEl('cdlg-title',title);setEl('cdlg-msg',msg);document.getElementById('cdlg-input-wrap').style.display='block';document.getElementById('cdlg-cancel').style.display='';document.getElementById('cdlg-ov').classList.add('open');});}
function showPrompt(msg,title='Editar',valorInicial=''){return new Promise(r=>{_cdlgRes=r;_cdlgPMode=true;_cdlgExp=null;setEl('cdlg-title',title);setEl('cdlg-msg',msg);const inp=document.getElementById('cdlg-input');inp.value=valorInicial;inp.placeholder='';document.getElementById('cdlg-input-wrap').style.display='block';document.getElementById('cdlg-cancel').style.display='';document.getElementById('cdlg-ov').classList.add('open');setTimeout(()=>inp.focus(),80);});}

function toggleSidebar(){const sb=document.getElementById('sidebar');const ex=sb.classList.toggle('expanded');document.body.classList.toggle('sb-expanded',ex);localStorage.setItem('sb_expanded',ex);const btn=document.getElementById('btn-sidebar-toggle');if(btn)btn.setAttribute('aria-expanded',ex);}

function actualizarListasFondos() {
  // ── 1. Selectores nativos (<select>) ──
  const selectores = ['gf-fo', 'oa-fo', 'ag-fo', 'inv-fo', 'prm-fo', 'fe-fo', 'mf-fo'];

  selectores.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const valorActual = sel.value;
    let opciones = `<option value="efectivo">💵 Efectivo (Disponible: ${f(S.saldos.efectivo)})</option>`;
    if (S.cuentas && S.cuentas.length > 0) {
      opciones += S.cuentas.map(c => `<option value="cuenta_${c.id}">${c.icono} ${he(c.nombre)} (Disponible: ${f(c.saldo)})</option>`).join('');
    } else {
      opciones += `<option value="banco">🏦 Banco (General) (Disponible: ${f(S.saldos.banco)})</option>`;
    }
    if (id === 'inv-fo') opciones = '<option value="">No descontar (solo registrar)</option>' + opciones;
    sel.innerHTML = opciones;
    if (valorActual && sel.querySelector(`option[value="${valorActual}"]`)) sel.value = valorActual;
  });

  // ── 2. Selectores personalizados (fund-select) ──
  const fondosDisponibles = () => {
    const lista = [{ value: 'efectivo', icon: '💵', nombre: 'Efectivo', tipo: 'Bolsillo personal', saldo: S.saldos.efectivo }];
    if (S.cuentas && S.cuentas.length > 0) {
      S.cuentas.forEach(c => lista.push({ value: `cuenta_${c.id}`, icon: c.icono, nombre: he(c.nombre), tipo: 'Entidad bancaria', saldo: c.saldo }));
    } else {
      lista.push({ value: 'banco', icon: '🏦', nombre: 'Banco (General)', tipo: 'Fondo predeterminado', saldo: S.saldos.banco });
    }
    return lista;
  };

  ['g-fo', 'eg-fo', 'pgc-fo', 'cp-fo'].forEach(id => {
    const wrap = document.getElementById(id + '-wrap');
    const hidden = document.getElementById(id);
    if (!wrap || !hidden) return;
    const optsEl = wrap.querySelector('.fund-sel-opts');
    if (!optsEl) return;

    const fondos = fondosDisponibles();
    optsEl.innerHTML = fondos.map(fo => `
      <div class="fund-sel-opt" onclick="selFundOpt('${id}','${fo.value}','${fo.icon}','${fo.nombre}',${fo.saldo})">
        <span class="fund-sel-opt-icon">${fo.icon}</span>
        <div class="fund-sel-opt-info">
          <div class="fund-sel-opt-name">${fo.nombre}</div>
          <div class="fund-sel-opt-bal">${f(fo.saldo)}</div>
        </div>
      </div>`).join('');

    const actual = fondos.find(fo => fo.value === hidden.value) || fondos[0];
    if (!hidden.value) hidden.value = actual.value;
    const trigger = wrap.querySelector('.fund-sel-trigger');
    if (trigger) {
      trigger.querySelector('.fund-sel-icon').textContent = actual.icon;
      trigger.querySelector('.fund-sel-name').textContent = actual.nombre;
      trigger.querySelector('.fund-sel-bal').textContent = `Disponible: ${f(actual.saldo)}`;
    }
  });
}

function toggleFundSelect(id) {
  const wrap = document.getElementById(id + '-wrap');
  if (!wrap) return;

  // Cerrar todos los demás abiertos
  document.querySelectorAll('.fund-sel-opts.open').forEach(el => {
    if (el !== wrap.querySelector('.fund-sel-opts')) {
      el.classList.remove('open');
      el.closest('.fund-select')?.querySelector('.fund-sel-trigger')?.classList.remove('open');
      // Limpiar posicionamiento fixed si estaba activo
      el.style.cssText = '';
    }
  });

  const trigger = wrap.querySelector('.fund-sel-trigger');
  const opts = wrap.querySelector('.fund-sel-opts');
  if (!trigger || !opts) return;

  const yaEstabaAbierto = opts.classList.contains('open');
  trigger.classList.toggle('open');
  opts.classList.toggle('open');

  if (!yaEstabaAbierto && opts.classList.contains('open')) {
    // Si está dentro de un modal, usar position:fixed para escapar del overflow
    if (wrap.closest('.modal')) {
      const rect = trigger.getBoundingClientRect();
      const alturaOpts = 280;
      const espacioAbajo = window.innerHeight - rect.bottom;
      const abrirArriba = espacioAbajo < alturaOpts && rect.top > alturaOpts;

      opts.style.position = 'fixed';
      opts.style.left = rect.left + 'px';
      opts.style.width = rect.width + 'px';
      opts.style.zIndex = '600';
      opts.style.top = abrirArriba
        ? (rect.top - alturaOpts) + 'px'
        : rect.bottom + 'px';
    }
  } else if (yaEstabaAbierto) {
    opts.style.cssText = '';
  }
}

function selFundOpt(id, value, icon, nombre, saldo) {
  const wrap = document.getElementById(id + '-wrap');
  if (!wrap) return;
  const hidden = document.getElementById(id);
  if (hidden) hidden.value = value;
  const trigger = wrap.querySelector('.fund-sel-trigger');
  if (trigger) {
    trigger.querySelector('.fund-sel-icon').textContent = icon;
    trigger.querySelector('.fund-sel-name').textContent = nombre;
    trigger.querySelector('.fund-sel-bal').textContent = saldo !== null ? `Disponible: ${f(saldo)}` : 'Solo registro';
    trigger.classList.remove('open');
  }
  wrap.querySelector('.fund-sel-opts')?.classList.remove('open');
  // Marcar seleccionado visualmente
  wrap.querySelectorAll('.fund-sel-opt').forEach(opt => opt.classList.remove('fso-sel'));
  wrap.querySelectorAll('.fund-sel-check').forEach(el => el.remove());
  const optSel = [...wrap.querySelectorAll('.fund-sel-opt')].find(opt => opt.querySelector('.fund-sel-opt-name')?.textContent === nombre);
  if (optSel) { optSel.classList.add('fso-sel'); optSel.insertAdjacentHTML('beforeend','<span class="fund-sel-check">✓</span>'); }
}

// Cerrar selectores de fondos y modales al hacer clic fuera
document.addEventListener('click', e => {
  // 1. Cierra el selector de fondos si el clic fue fuera de él
  if (!e.target.closest('.fund-select')) {
    document.querySelectorAll('.fund-sel-opts.open').forEach(el => {
      el.classList.remove('open');
      el.closest('.fund-select')?.querySelector('.fund-sel-trigger')?.classList.remove('open');
    });
  }

  // 2. Cierra modales al hacer clic en el overlay (fondo oscuro)
  if (e.target.classList.contains('modal-ov') && e.target.id !== 'cdlg-ov') {
    closeM(e.target.id);
  }
});

// =========================================================
// TENDENCIAS, PRONÓSTICOS Y TORTA MODERNA 
// =========================================================
function renderStats() {
  calcScore(); 
  
  const tN = S.gastos.filter(g => g.tipo === 'necesidad' && !g.hormiga).reduce((s, g) => s + (g.montoTotal || g.monto), 0);
  const tD = S.gastos.filter(g => g.tipo === 'deseo' && !g.hormiga).reduce((s, g) => s + (g.montoTotal || g.monto), 0);
  const tH = S.gastos.filter(g => g.tipo === 'hormiga' || g.hormiga).reduce((s, g) => s + (g.montoTotal || g.monto), 0);
  const tA = S.gastos.filter(g => g.tipo === 'ahorro').reduce((s, g) => s + g.monto, 0);
  const tG = tN + tD + tH; const totalPie = tN + tD + tH + tA; 

  const cats = {}; S.gastos.filter(g => g.tipo !== 'ahorro').forEach(g => { cats[g.cat] = (cats[g.cat] || 0) + (g.montoTotal || g.monto); });
  const sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  let htmlBars = sortedCats.length === 0 ? '<div class="emp">Registra gastos para ver la distribución.</div>' : sortedCats.map(([cat, monto]) => { const pct = tG > 0 ? (monto / tG) * 100 : 0; return `<div class="stat-bar-row"><div class="stat-bar-label">${CATS[cat]||cat}</div><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${pct}%; background:${CCOLORS[cat]||'var(--a4)'}"></div></div><div class="stat-bar-val">${f(monto)}</div></div>`; }).join('');
  setHtml('stat-bars', htmlBars);

  const pieCard = document.getElementById('stat-pie-card');
  if (totalPie > 0) {
    if(pieCard) pieCard.style.display = 'block';
    
    const colorNeeds = '#00bcd4'; const colorDesires = '#ff9800'; const colorHormiga = '#795548'; const colorSavings = '#4caf50'; 
    const pctN = (tN / totalPie) * 100; const pctD = (tD / totalPie) * 100; const pctH = (tH / totalPie) * 100; const pctA = (tA / totalPie) * 100;
    
    const stop1 = Math.round(pctN); const stop2 = Math.round(pctN + pctD); const stop3 = Math.round(pctN + pctD + pctH);
    const gradient = `conic-gradient(${colorNeeds} 0% ${stop1}%, ${colorDesires} ${stop1}% ${stop2}%, ${colorHormiga} ${stop2}% ${stop3}%, ${colorSavings} ${stop3}% 100%)`;
    
    setHtml('stat-pie-container', `
      <div class="pie-wrapper">
        <div class="pie-chart" style="background:${gradient};"></div>
        <div class="pie-center-text">
           <span style="font-size:10px; font-weight:800; color:var(--t3); letter-spacing:1px; margin-bottom: 2px;">TOTAL GASTADO</span>
           <span style="font-family:var(--fm); font-size:18px; font-weight:800; color:var(--t1);">${f(tG)}</span>
        </div>
      </div>
      <div class="pie-legend">
        <div class="fb" style="margin-bottom:8px;"><span style="color:${colorNeeds}; font-weight:700;">■ Necesidades</span> <span class="mono">${Math.round(pctN)}%</span></div>
        <div class="fb" style="margin-bottom:8px;"><span style="color:${colorDesires}; font-weight:700;">■ Deseos</span> <span class="mono">${Math.round(pctD)}%</span></div>
        <div class="fb" style="margin-bottom:8px;"><span style="color:${colorHormiga}; font-weight:700;">■ Fuga Hormiga 🐜</span> <span class="mono">${Math.round(pctH)}%</span></div>
        <div class="fb" style="margin-bottom:8px;"><span style="color:${colorSavings}; font-weight:700;">■ Ahorros</span> <span class="mono">${Math.round(pctA)}%</span></div>
      </div>
    `);
  } else { if(pieCard) pieCard.style.display = 'none'; }

  let insights = [];
  if (S.ingreso > 0 || tG > 0) {
     if (tA > 0) insights.push(`<div class="insight-card" style="border-left-color:var(--a1)">📈 <strong>Proyección:</strong> En 1 año tendrás <strong>${f(tA * 24)}</strong> extra si mantienes este ritmo.</div>`);
     else insights.push(`<div class="insight-card" style="border-left-color:var(--a2)">⚠️ <strong>Estancamiento:</strong> Guardar al menos el 10% (${f(S.ingreso * 0.1)}) cambiaría tu futuro.</div>`);
     const totalDeuda = S.deudas.reduce((s, d) => s + Math.max(0, d.total - d.pagado), 0);
     const sq = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + d.cuota, 0);
     const sm = S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0);
     const ccm = (sq * 2) + sm;
     if (totalDeuda > 0 && ccm > 0) insights.push(`<div class="insight-card" style="border-left-color:var(--a5)">⏳ <strong>Libertad:</strong> Al ritmo actual, serás 100% libre de deudas en aprox. <strong>${Math.ceil(totalDeuda / ccm)} meses</strong>.</div>`);
     if (S.historial && S.historial.length > 0) { const gMP = S.historial[0].gastado; if (gMP > 0) { const dif = Math.round(((tG - gMP) / gMP) * 100); if (dif > 0) insights.push(`<div class="insight-card" style="border-left-color:var(--dan)">📉 <strong>Tendencia:</strong> Gastas un <strong>${dif}% más</strong> que el período anterior.</div>`); else if (dif < 0) insights.push(`<div class="insight-card" style="border-left-color:var(--a1)">📈 <strong>Tendencia:</strong> Gastas un <strong>${Math.abs(dif)}% menos</strong>.</div>`); } }
     if(typeof calcularFondoEmergencia === 'function') { const sF = calcularFondoEmergencia(); if(sF.gastoMensualFijo > 0) insights.push(`<div class="insight-card" style="border-left-color:var(--a4)">🛡️ <strong>Supervivencia:</strong> Podrías sobrevivir <strong>${Math.floor((sF.actual / sF.gastoMensualFijo) * 30)} días</strong> sin ingresos.</div>`); }
  }
  setHtml('stat-insights', insights.length ? insights.join('') : '<div class="emp" style="padding:10px;">Faltan datos para pronósticos.</div>');
}

// ── DAY PICKER ──
const _DP_COMUNES = [];

function toggleDayPicker(id) {
  const wrap = document.getElementById('dp-' + id);
  const hidden = document.getElementById(id);
  if (!wrap || !hidden) return;
  const trigger = wrap.querySelector('.day-pick-trigger');
  const grid = wrap.querySelector('.day-pick-grid');
  if (!trigger || !grid) return;

  const yaAbierto = grid.classList.contains('open');

  // Cerrar todos los day pickers abiertos
  document.querySelectorAll('.day-pick-grid.open').forEach(el => {
    el.classList.remove('open');
    el.closest('.day-picker')?.querySelector('.day-pick-trigger')?.classList.remove('open');
  });

  if (yaAbierto) return;

  // Generar el grid de días si está vacío
  if (!grid.children.length) {
    grid.innerHTML = `
      <div class="day-pick-header">Día de pago mensual</div>
      <div class="day-pick-days">
        ${Array.from({length: 31}, (_, i) => i + 1).map(d => `
          <button type="button" class="day-pick-btn${_DP_COMUNES.includes(d) ? ' common' : ''}"
            data-day="${d}" onclick="selectDay('${id}',${d})">${d}</button>
        `).join('')}
      </div>`;
  }

  // Sincronizar el día ya seleccionado
  const currentVal = +hidden.value;
  if (currentVal) {
    grid.querySelectorAll('.day-pick-btn').forEach(btn => {
      btn.classList.toggle('selected', +btn.dataset.day === currentVal);
    });
    const valEl = trigger.querySelector('.day-pick-val');
    if (valEl) valEl.textContent = `Día ${currentVal} de cada mes`;
  }

  trigger.classList.add('open');
  grid.classList.add('open');

  // Posicionar con fixed para escapar del overflow del modal
  const rect = trigger.getBoundingClientRect();
  const gridW = Math.max(268, rect.width);
  let left = rect.left;
  if (left + gridW > window.innerWidth - 10) left = window.innerWidth - gridW - 10;
  const espacioAbajo = window.innerHeight - rect.bottom;

  grid.style.position = 'fixed';
  grid.style.width = gridW + 'px';
  grid.style.left = left + 'px';
  grid.style.zIndex = '600';
  if (espacioAbajo < 220 && rect.top > 220) {
    grid.style.top = 'auto';
    grid.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
  } else {
    grid.style.top = (rect.bottom + 4) + 'px';
    grid.style.bottom = 'auto';
  }
}

function selectDay(id, day) {
  const hidden = document.getElementById(id);
  const wrap = document.getElementById('dp-' + id);
  if (!hidden || !wrap) return;
  hidden.value = day;
  const valEl = wrap.querySelector('.day-pick-val');
  if (valEl) valEl.textContent = `Día ${day} de cada mes`;
  wrap.querySelectorAll('.day-pick-btn').forEach(btn => {
    btn.classList.toggle('selected', +btn.dataset.day === day);
  });
  const grid = wrap.querySelector('.day-pick-grid');
  const trigger = wrap.querySelector('.day-pick-trigger');
  if (grid) grid.classList.remove('open');
  if (trigger) trigger.classList.remove('open');
}

function setDayPicker(id, day) {
  const hidden = document.getElementById(id);
  const wrap = document.getElementById('dp-' + id);
  if (!hidden) return;
  hidden.value = day || '';
  if (!wrap) return;
  const valEl = wrap.querySelector('.day-pick-val');
  if (valEl) valEl.textContent = day ? `Día ${day} de cada mes` : 'Selecciona el día';
  wrap.querySelectorAll('.day-pick-btn').forEach(btn => {
    btn.classList.toggle('selected', +btn.dataset.day === +day);
  });
}

// Cerrar day picker al hacer clic fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.day-picker')) {
    document.querySelectorAll('.day-pick-grid.open').forEach(el => {
      el.classList.remove('open');
      el.closest('.day-picker')?.querySelector('.day-pick-trigger')?.classList.remove('open');
    });
  }
});

// ── NUEVA LÓGICA PARA EL SELECTOR DE FONDOS PREMIUM (BottomSheet) ──

function updCustomFundButton(selectorId) {
    const customId = selectorId + '-custom';
    const original = document.getElementById(selectorId);
    const custom = document.getElementById(customId);
    if (!original || !custom) return;

    const val = original.value;
    let icon = '💵', name = 'Efectivo', bal = f(S.saldos.efectivo);
    let specialClass = '';

    if (val && val.startsWith('cuenta_')) {
        const cId = +val.replace('cuenta_', '');
        const cuenta = S.cuentas.find(c => c.id === cId);
        if (cuenta) { icon = cuenta.icono; name = he(cuenta.nombre); bal = f(cuenta.saldo); }
    } else if (val === 'banco') {
        icon = '🏦'; name = 'Banco (General)'; bal = f(S.saldos.banco);
    } else if (val === 'efectivo') {
        specialClass = 'fnd-sel-saldo-custom';
    }

    custom.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.2rem;">${icon}</span>
            <div style="display:flex; flex-direction:column; text-align:left;">
                <span style="font-size:14px; font-weight:500; color:var(--t1);">${name}</span>
                <span class="${specialClass}" style="font-size:12px; color:var(--t2); font-family:'DM Mono', monospace;">${bal}</span>
            </div>
        </div>
        <span style="font-size:0.8rem; color:var(--t2);">▼</span>
    `;
}

// openSelectorFondo y seleccionarFondo eliminadas — modal nunca implementado en HTML.
// El sistema de fund-select custom (toggleFundSelect / selFundOpt) cubre este caso.

// =========================================================
// 14. EXPOSICIÓN GLOBAL A WINDOW (HTML)
// =========================================================
window.go=go; window.toggleMas=toggleMas; window.closeMas=closeMas; window.setPer=setPer; window.toggleSidebar=toggleSidebar; window.openM=openM; window.closeM=closeM;
window.guardarQ=guardarQ; window.resetTodo=resetTodo; window.resetQuincena=resetQuincena; window.onMetCh=onMetCh; window.selM=selM; window.calcDist=calcDist;
window.agregarGasto=agregarGasto; window.delGasto=delGasto; window.abrirEditarGasto=abrirEditarGasto; window.guardarEditarGasto=guardarEditarGasto; window.limpiarGastos=limpiarGastos; window.prev4k=prev4k; window.actualizarSemaforo=actualizarSemaforo; window.calcularImpactoHormiga=calcularImpactoHormiga; window.renderGastos=renderGastos;
window.guardarFijo=guardarFijo; window.abrirModalFijo=abrirModalFijo; window.cerrarModalFijo=cerrarModalFijo; window.ejecutarPagoFijo=ejecutarPagoFijo; window.delFijo=delFijo; window.desmFijo=desmFijo;

window.setModoDeuda=setModoDeuda; window.guardarDeuda=guardarDeuda; window.abrirPagarCuota=abrirPagarCuota; window.confPagarCuota=confPagarCuota; window.delDeu=delDeu; window.abrirEditarDeuda=abrirEditarDeuda; window.guardarEditarDeuda=guardarEditarDeuda; window.selTipoDeuda=selTipoDeuda; window.selFrecDeuda=selFrecDeuda; window.selTipoDeudaEdit=selTipoDeudaEdit; window.selFrecDeudaEdit=selFrecDeudaEdit;

window.guardarPago=guardarPago; window.marcarPagado=marcarPagado; window.delPago=delPago;
window.toggleTipoObjetivo=toggleTipoObjetivo; window.openNuevoObjetivo=openNuevoObjetivo; window.guardarObjetivo=guardarObjetivo; window.abrirAccionObj=abrirAccionObj; window.ejecutarAccionObjetivo=ejecutarAccionObjetivo; window.delObjetivo=delObjetivo; window.calcSimObj=calcSimObj; window.cMetaAporte=cMetaAporte;
window.toggleCalc=toggleCalc; window.cCDT=cCDT; window.cCre=cCre; window.cIC=cIC; window.cMeta=cMeta; window.cPila=cPila;
window.exportarDatos=exportarDatos; window.importarDatos=importarDatos; window.cerrarQ=cerrarQ; window.guardarInversion=guardarInversion; window.openRendimiento=openRendimiento; window.guardarRendimiento=guardarRendimiento; window.delInversion=delInversion; window.calcPrima=calcPrima; window.guardarPrima=guardarPrima; window.guardarCuenta=guardarCuenta; window.delCuenta=delCuenta; window.editSaldoCuenta=editSaldoCuenta; window.editSaldoCuentaDash=editSaldoCuentaDash; window.exportarCSV=exportarCSV; window.descargarCSVDirecto=descargarCSVDirecto;
window.toggleDayPicker=toggleDayPicker; window.selectDay=selectDay; window.setDayPicker=setDayPicker;
window.calcularFondoEmergencia=calcularFondoEmergencia; window.actualizarVistaFondo=actualizarVistaFondo; window.registrarAbonoFondo=registrarAbonoFondo; window.actualizarListasFondos=actualizarListasFondos; window.toggleFundSelect=toggleFundSelect; window.selFundOpt=selFundOpt; window.renderCuentas=renderCuentas; window.renderDashCuentas=renderDashCuentas; window.renderStats=renderStats; window.cInf = cInf; window.cR72 = cR72; window.evaluarGastoEvento = evaluarGastoEvento; window.prevMonth = prevMonth; window.nextMonth = nextMonth; window.showDayDetails = showDayDetails; window.ejecutarPagoAgendado = ejecutarPagoAgendado; window.updCustomFundButton = updCustomFundButton;
