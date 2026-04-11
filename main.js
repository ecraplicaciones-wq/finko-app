// ==========================================================================
// ARCHIVO: main.js (EL CEREBRO DE FINKO PRO)
// OBJETIVO: Archivo central unificado, limpio y blindado.
// ==========================================================================

import { S } from './state.js';
import { loadData, save } from './storage.js';
import './ui.js';
import './theme.js';

const CATS = { alimentacion:'🍽️ Alimentación', transporte:'🚌 Transporte', vivienda:'🏠 Vivienda', servicios:'💡 Servicios', salud:'🏥 Salud', entretenimiento:'🎬 Entretenimiento', ropa:'👕 Ropa', tecnologia:'💻 Tecnología', hormiga:'🐜 Hormiga', deudas:'💳 Deudas', ahorro:'💰 Ahorro', otro:'📦 Otro' };
const PCATS = { comida:'🍽️ Comida', hotel:'🏨 Hotel', transporte:'🚌 Transporte', fiesta:'🎉 Fiesta', compras:'🛍️ Compras', entradas:'🎟️ Entradas', otro:'📦 Otro' };
const CCOLORS = { alimentacion:'#00dc82', transporte:'#3b9eff', vivienda:'#b44eff', servicios:'#ffd60a', salud:'#ff6b35', entretenimiento:'#ff4eb8', ropa:'#00e5cc', tecnologia:'#4eb8ff', hormiga:'#ff9944', deudas:'#ff4444', ahorro:'#00dc82', otro:'#666' };
const NAVS = ['dash','quin','gast','fijo','objetivos','inve','deu','agen','stat','hist'];

// ─── 1. ARRANQUE SEGURO ───
function initApp() {
  loadData();
  if(localStorage.getItem('sb_expanded') === 'true') { document.getElementById('sidebar')?.classList.add('expanded'); document.body.classList.add('sb-expanded'); }
  if(localStorage.getItem('fco_theme') === 'light'){ document.body.classList.add('light-theme'); const b = document.getElementById('btn-theme'); if(b){ const ni = b.querySelector('.ni'); if(ni) ni.textContent='🌙'; } }
  
  updateBadge(); populateSelectObjetivos(); renderAll(); calcScore();
  
  // Precarga blindada de calculadoras (Si alguna no existe en el HTML, no crashea)
  cCDT(); cCre(); cIC(); cMeta(); cPila();
  
  const hoyD = new Date();
  ['g-fe','ag-fe','obj-fe'].forEach(i => { const e=document.getElementById(i); if(e) e.valueAsDate=hoyD; });
  if(S.ingreso > 0){ const e = document.getElementById('q-pri'); if(e) e.value = S.ingreso; }
  updSaldo();
}

let renderTimer = null;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();

function renderAll() {
  // EFICIENCIA: Si el sistema pide repintar la pantalla varias veces seguidas, 
  // cancelamos las anteriores y hacemos una sola repintada fluida.
  if (renderTimer) cancelAnimationFrame(renderTimer);
  
  renderTimer = requestAnimationFrame(() => {
    renderGastos(); updateDash(); renderObjetivos(); renderInversiones(); 
    renderDeudas(); renderFijos(); renderPagos(); renderHistorial(); 
    updSaldo(); renderStats(); renderCuentas(); renderDashCuentas();
  });
}

function updateBadge(){
  const n = new Date();
  const txt = `${n.getDate()<=15?'1ra':'2da'} quincena · ${n.toLocaleString('es-CO',{month:'short'})} ${n.getFullYear()}`;
  const el = document.getElementById('hbadge'); if(el) el.textContent = txt;
}

// ─── 2. NAVEGACIÓN Y QUINCENA ───
function go(id){
  if (window.innerWidth <= 768) document.getElementById('sidebar')?.classList.remove('open');
  NAVS.forEach(n => { const s = document.getElementById('sec-'+n); if(s) s.classList.toggle('active', n === id); });
  document.querySelectorAll('.nb').forEach((b,i) => { b.classList.toggle('active', NAVS[i] === id); });
  if(id === 'agen') renderCal(); if(id === 'stat') renderStats(); if(id === 'gast') updSaldo();
}

function setPer(tipo, el) {
  S.tipoPeriodo = tipo; 
  document.querySelectorAll('.qtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active'); renderDeudas(); updateDash();
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
    const ok = await showConfirm('Tu saldo disponible actual es $0.\n¿Estás seguro de iniciar la quincena sin dinero?', 'Saldo en Cero'); 
    if(!ok) return; 
  }
  
  const p = getPct();
  
  // EDUCACIÓN FINANCIERA: Alerta si el ahorro es 0%
  if (p.a === 0) {
    const quiereAhorrar = await showConfirm('🛑 ¡Alto ahí!\n\nLos expertos recomiendan "Pagarte a ti mismo primero". Estás dejando 0% para tu ahorro.\n\n¿Seguro que quieres continuar así sin guardar nada?', 'Regla de Oro: Ahorro');
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
  
  S.gastos=[]; S.ingreso=0;
  save(); renderAll(); go('dash');

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
  
  if(typeof actualizarListasFondos === 'function') actualizarListasFondos();
  
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
  
  if (tipo === 'necesidad') { limite = S.ingreso * (p.n / 100); etiqueta = 'Necesidades'; }
  else if (tipo === 'ahorro') { limite = S.ingreso * (p.a / 100); etiqueta = 'Ahorros'; }
  else { 
    limite = S.ingreso * (p.d / 100); 
    etiqueta = 'Deseos'; 
  }
  const yaGastado = S.gastos.filter(g => g.tipo === tipo).reduce((s, g) => s + (g.montoTotal || g.monto), 0);
  const disponible = (limite - yaGastado) - monto;
  infoEl.style.display = 'block';
  if (disponible < 0) {
    infoEl.style.background = 'rgba(255,68,68,.1)'; infoEl.style.color = 'var(--dan)'; infoEl.style.border = '1px solid rgba(255,68,68,.3)';
    infoEl.innerHTML = `🚨 ¡Alerta! Este gasto supera tu presupuesto de ${etiqueta} por ${f(Math.abs(disponible))}.`;
  } else if (disponible <= 100000) {
    infoEl.style.background = 'rgba(255,214,10,.1)'; infoEl.style.color = 'var(--a2)'; infoEl.style.border = '1px solid rgba(255,214,10,.3)';
    infoEl.innerHTML = `⚠️ Cuidado. Solo te quedarán ${f(disponible)} para ${etiqueta}.`;
  } else {
    infoEl.style.background = 'rgba(0,220,130,.1)'; infoEl.style.color = 'var(--a1)'; infoEl.style.border = '1px solid rgba(0,220,130,.3)';
    infoEl.innerHTML = `✅ Tienes presupuesto. Te quedarán ${f(disponible)} libres en ${etiqueta}.`;
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
      <span style="font-weight: 700; color: var(--t1);">Impuesto 4x1000: +${f(mo * 0.004)}</span> 
      ➔ Total a debitar: <span style="color: var(--a3); font-weight: 800;">${f(mo * 1.004)}</span>
      <br>
      <span style="font-size: 0.85rem; color: var(--t3); display: block; margin-top: 0.5rem;">
        💡 <strong>Tip Legal:</strong> Desde dic. 2024 puedes tener varias cuentas exentas de este impuesto, siempre que entre todas no superen $18.3 millones al mes (350 UVT · 2026).
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
  if(!infoEl) return;
  
  if(ti === 'hormiga' && mo > 0) {
     const anual = mo * 365; let msg = `🐜 <strong>Impacto Anual:</strong> Si repites este gasto a diario, perderás <strong>${f(anual)}</strong> al año. `;
     if(S.objetivos && S.objetivos.length > 0) {
        const meta = S.objetivos[0];
        if(meta.objetivoAhorro > 0) {
          const pct = Math.round((anual / meta.objetivoAhorro) * 100);
          if(pct > 0) msg += `<br><br>¡Esa plata equivale al <strong>${pct}%</strong> de tu meta <em>"${meta.nombre}"</em>!`;
        }
     }
     infoEl.innerHTML = msg; infoEl.style.display = 'block';
  } else { infoEl.style.display = 'none'; }
}

async function agregarGasto() {
  const de = document.getElementById('g-de').value.trim(); const mo = +document.getElementById('g-mo').value; const ca = document.getElementById('g-ca').value;
  if (!de || !mo || !ca) { await showAlert('Completa la descripción, el monto y la categoría.', 'Faltan datos'); return; }
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
  
  save(); renderAll(); sr('Gasto registrado');
}

function renderGastos(){
  const tb = document.getElementById('g-tab'); 
  const q = (document.getElementById('g-search')?.value||'').toLowerCase().trim();
  let list = S.gastos;
  
  if (q) list = list.filter(g => (g.desc||'').toLowerCase().includes(q) || (CATS[g.cat]||g.cat).toLowerCase().includes(q));
  if (!list.length) { tb.innerHTML = q ? `<tr><td colspan="9" class="emp">Sin resultados</td></tr>` : '<tr><td colspan="9" class="emp">Sin gastos registrados este período</td></tr>'; return; }
  
  tb.innerHTML = list.slice(0,80).map(g => {
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
}

function delGasto(id){
  const g = S.gastos.find(x => x.id === id); if(g && g.tipo !== 'ahorro') refF(g.fondo, g.montoTotal || g.monto);
  if(g && g.autoFijo && g.fijoRef){ const mes = mesStr(); const fijo = S.gastosFijos.find(x => x.id === g.fijoRef); if(fijo) fijo.pagadoEn = fijo.pagadoEn.filter(m => m !== mes); }
  S.gastos = S.gastos.filter(x => x.id !== id); save(); renderAll();
}

function abrirEditarGasto(id) {
  const g = S.gastos.find(x => x.id === id);
  if (!g) return;
  document.getElementById('eg-id').value = id;
  document.getElementById('eg-de').value = g.desc;
  document.getElementById('eg-mo').value = g.monto;
  document.getElementById('eg-ca').value = g.cat;
  document.getElementById('eg-ti').value = g.tipo;
  document.getElementById('eg-ho').value = g.hormiga ? 'si' : 'no';
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
  g.hormiga = document.getElementById('eg-ho').value === 'si';
  g.fecha = document.getElementById('eg-fe').value;
  if (g.tipo !== 'ahorro') desF(nFondo, nMonto);
  closeM('m-edit-gasto');
  save();
  renderAll();
}

async function limpiarGastos(){ const ok = await showConfirm('¿Eliminar todos los gastos del período actual?', 'Limpiar'); if(!ok) return; S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>refF(g.fondo,g.montoTotal||g.monto)); const mes=mesStr(); S.gastosFijos.forEach(g=>{g.pagadoEn=(g.pagadoEn||[]).filter(m=>m!==mes);}); S.gastos=[]; save(); renderAll(); }

// ─── 5. GASTOS FIJOS ───
let idFijoPendiente = null;
async function guardarFijo(){
  const no = document.getElementById('gf-no').value.trim(); const mo = +document.getElementById('gf-mn').value;
  if(!no || !mo) return;
  const fx = document.getElementById('gf-4k').checked; const montoTotal = fx ? Math.round(mo * 1.004) : mo;
  S.gastosFijos.push({ id: Date.now(), nombre: no, monto: mo, montoTotal, cuatroXMil: fx, dia: +document.getElementById('gf-di').value || 1, periodicidad: document.getElementById('gf-pe') ? document.getElementById('gf-pe').value : 'mensual', tipo: document.getElementById('gf-ti').value, cat: document.getElementById('gf-ca').value, fondo: document.getElementById('gf-fo').value, pagadoEn: [] });
  ['gf-no','gf-mn'].forEach(i=>document.getElementById(i).value=''); document.getElementById('gf-4k').checked=false;
  closeM('m-fijo'); save(); renderFijos(); updateDash();
}

function renderFijos(){
  const mes = mesStr();
  const tot = S.gastosFijos.reduce((s,g) => s + (Number(g.monto) || 0), 0);
  const pag = S.gastosFijos.filter(g => g.pagadoEn.includes(mes));
  setEl('fi-tot', f(tot)); setEl('fi-pag', f(pag.reduce((s,g)=>s+(Number(g.monto)||0),0))); setEl('fi-np', pag.length); setEl('fi-nt', S.gastosFijos.length);
  const el = document.getElementById('fi-lst');
  if (!S.gastosFijos.length) { el.innerHTML = '<div class="emp"><span class="emp-icon">◉</span>Sin gastos fijos.</div>'; return; }
  
  el.innerHTML = S.gastosFijos.map(g => {
    const paid = g.pagadoEn.includes(mes); const mMostrar = g.cuatroXMil ? (g.montoTotal || Math.round(g.monto*1.004)) : g.monto;
    const tiBadge = (g.tipo || 'necesidad') === 'deseo' ? '<span class="pill py">Deseo</span>' : '<span class="pill pb">Necesidad</span>';
    const perBadge = g.periodicidad === 'quincenal' ? '<span class="pill pm">Quincenal</span>' : ''; 
    return `<div class="gfc" style="${paid ? 'opacity:.6' : ''}">
      <div style="font-size:20px">${CATS[g.cat] ? CATS[g.cat].split(' ')[0] : '📦'}</div>
      <div style="flex:1;margin-left:4px">
        <div style="font-weight:700;font-size:13px;${paid?'text-decoration:line-through':''}">${he(g.nombre)} ${tiBadge} ${perBadge}</div>
        <div class="tm" style="margin-top:2px">Día ${g.dia} · ${g.fondo==='efectivo'?'💵 Efectivo':'🏦 Banco'}</div>
      </div>
      <div style="font-family:var(--fm);font-weight:700;font-size:14px;color:var(--a4)">${f(mMostrar)}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${paid ? `<span class="pill pg">✓ Pagado</span> <button class="btn bg bsm" onclick="desmFijo(${g.id})">Desmarcar</button>` : `<button class="btn bp bsm" onclick="abrirModalFijo(${g.id})">Marcar pagado</button>`}
        <button class="btn bd bsm" onclick="delFijo(${g.id})">×</button>
      </div>
    </div>`;
  }).join('');
}

function abrirModalFijo(id) { 
  const fx = S.gastosFijos.find(x => x.id == id); 
  if (!fx) return; 
  idFijoPendiente = id; 
  document.getElementById('mf-nombre').innerText = fx.nombre; 
  document.getElementById('mf-monto').innerText = f(fx.cuatroXMil ? (fx.montoTotal || Math.round(fx.monto*1.004)) : fx.monto); 
  actualizarListasFondos();
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

function desmFijo(id){ const mes = mesStr(); const g = S.gastosFijos.find(x=>x.id===id); if(!g) return; g.pagadoEn = g.pagadoEn.filter(m=>m!==mes); const idx = S.gastos.findIndex(x => x.autoFijo && x.fijoRef === id && x.fecha.slice(0,7) === mes); if(idx !== -1){ const gasto = S.gastos[idx]; refF(gasto.fondo, gasto.montoTotal || gasto.monto); S.gastos.splice(idx,1); } save(); renderFijos(); renderGastos(); updateDash(); }
async function delFijo(id){ const ok = await showConfirm('¿Eliminar gasto fijo?','Eliminar'); if(!ok) return; S.gastosFijos = S.gastosFijos.filter(x=>x.id!==id); save(); renderFijos(); }

// ─── 6. OBJETIVOS UNIFICADOS ───
function toggleTipoObjetivo() { const isEvento = document.getElementById('obj-tipo').value === 'evento'; document.getElementById('obj-pres-container').style.display = isEvento ? 'block' : 'none'; }
function openNuevoObjetivo() { document.getElementById('obj-tipo').value = 'ahorro'; toggleTipoObjetivo(); ['obj-no','obj-ahorro','obj-pres','obj-fe'].forEach(i=>document.getElementById(i).value=''); openM('m-objetivo'); }

async function guardarObjetivo() {
  const nombre = document.getElementById('obj-no').value.trim(); const tipo = document.getElementById('obj-tipo').value; const objAhorro = +document.getElementById('obj-ahorro').value || 0;
  if (!nombre || !objAhorro) { await showAlert('Completa el nombre y la meta de ahorro.', 'Campos requeridos'); return; }
  S.objetivos.push({ id: Date.now(), nombre, tipo, icono: document.getElementById('obj-ic').value, fecha: document.getElementById('obj-fe').value, objetivoAhorro: objAhorro, ahorrado: 0, presupuesto: tipo === 'evento' ? (+document.getElementById('obj-pres').value || 0) : 0, gastado: 0, gastos: [] });
  closeM('m-objetivo'); save(); renderObjetivos(); populateSelectObjetivos(); sr('Objetivo creado');
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

// ─── 7. COACH DE DEUDAS ───
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

function selTipoDeudaEdit(tipo, el) {
  document.getElementById('ed-ti').value = tipo;
  document.querySelectorAll('.btn-tipo-deuda-edit').forEach(b => {
    b.style.background = 'var(--s2)';
    b.style.border = '2px solid var(--b2)';
    b.querySelector('span:last-child').style.color = 'var(--t3)';
  });
  el.style.background = 'rgba(59,158,255,.1)';
  el.style.border = '2px solid var(--a4)';
  el.querySelector('span:last-child').style.color = 'var(--a4)';
}

function selFrecDeudaEdit(frec, el) {
  document.getElementById('ed-pe').value = frec;
  const btnMensual = document.getElementById('btn-edit-frec-mensual');
  const btnQuincenal = document.getElementById('btn-edit-frec-quincenal');
  if (frec === 'mensual') {
    btnMensual.style.border = '2px solid var(--a1)';
    btnMensual.style.background = 'rgba(0,220,130,.1)';
    btnMensual.style.color = 'var(--a1)';
    btnQuincenal.style.border = '2px solid var(--b2)';
    btnQuincenal.style.background = 'var(--s2)';
    btnQuincenal.style.color = 'var(--t3)';
  } else {
    btnQuincenal.style.border = '2px solid var(--a1)';
    btnQuincenal.style.background = 'rgba(0,220,130,.1)';
    btnQuincenal.style.color = 'var(--a1)';
    btnMensual.style.border = '2px solid var(--b2)';
    btnMensual.style.background = 'var(--s2)';
    btnMensual.style.color = 'var(--t3)';
  }
}

function selTipoDeuda(tipo, el) {
  document.getElementById('dn-ti').value = tipo;
  document.querySelectorAll('.btn-tipo-deuda').forEach(b => {
    b.style.background = 'var(--s2)';
    b.style.border = '2px solid var(--b2)';
    b.querySelector('span:last-child').style.color = 'var(--t3)';
  });
  el.style.background = 'rgba(59,158,255,.1)';
  el.style.border = '2px solid var(--a4)';
  el.querySelector('span:last-child').style.color = 'var(--a4)';
}

function selFrecDeuda(frec, el) {
  document.getElementById('dn-pe').value = frec;
  const btnMensual = document.getElementById('btn-frec-mensual');
  const btnQuincenal = document.getElementById('btn-frec-quincenal');
  if (frec === 'mensual') {
    btnMensual.style.border = '2px solid var(--a1)';
    btnMensual.style.background = 'rgba(0,220,130,.1)';
    btnMensual.style.color = 'var(--a1)';
    btnQuincenal.style.border = '2px solid var(--b2)';
    btnQuincenal.style.background = 'var(--s2)';
    btnQuincenal.style.color = 'var(--t3)';
  } else {
    btnQuincenal.style.border = '2px solid var(--a1)';
    btnQuincenal.style.background = 'rgba(0,220,130,.1)';
    btnQuincenal.style.color = 'var(--a1)';
    btnMensual.style.border = '2px solid var(--b2)';
    btnMensual.style.background = 'var(--s2)';
    btnMensual.style.color = 'var(--t3)';
  }
}

async function guardarDeuda(){
  const no = document.getElementById('dn-no').value.trim(); 
  const to = +document.getElementById('dn-to').value; 
  const cu = +document.getElementById('dn-cu').value;
  const diaPago = +document.getElementById('dn-dia').value || 1; // Si no pone nada, asume el 1
  
  if(!no || !to || !cu){ await showAlert('Completa nombre, saldo y cuota.','Requerido'); return; }
  
  S.deudas.push({
    id: Date.now(), 
    nombre: no, 
    total: to, 
    cuota: cu, 
    periodicidad: document.getElementById('dn-pe').value, 
    tasa: +document.getElementById('dn-ta').value || 0, 
    tipo: document.getElementById('dn-ti').value, 
    diaPago: diaPago,
    pagado: 0
  });
  
  ['dn-no','dn-to','dn-cu','dn-ta', 'dn-dia'].forEach(i => { const e = document.getElementById(i); if(e) e.value=''; }); 
  closeM('m-deu'); save(); renderAll();
}

// 🎯 NUEVO: Función inteligente que calcula la mora basándose en el día de corte y si ya se pagó este mes
function obtenerAlertaMora(deuda) {
  const diaPago = deuda.diaPago || 1;
  const hoy = new Date();
  
  // Creamos la fecha límite asumiendo que es en el mes actual
  let fechaLimite = new Date(hoy.getFullYear(), hoy.getMonth(), diaPago);
  
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
    if (diasMora < 30) return `<div class="alerta-mora alerta-leve" role="status" aria-live="polite" style="margin-top:10px; padding:10px; background:rgba(255,214,10,.1); color:var(--a2); border-radius:8px; border:1px solid rgba(255,214,10,.3); font-size:12px;"><span aria-hidden="true">⏳</span> <strong>Llevas ${diasMora} días de retraso.</strong> Paga pronto para evitar intereses de mora.</div>`;
    if (diasMora < 60) return `<div class="alerta-mora alerta-media" role="alert" aria-live="assertive" style="margin-top:10px; padding:10px; background:rgba(255,107,53,.1); color:var(--a3); border-radius:8px; border:1px solid rgba(255,107,53,.3); font-size:12px;"><span aria-hidden="true">⚠️</span> <strong>${diasMora} días en mora.</strong> Tu puntaje en Datacrédito está siendo afectado.</div>`;
    
    return `<div class="alerta-mora alerta-grave" role="alert" aria-live="assertive" style="margin-top:10px; padding:10px; background:rgba(255,68,68,.1); color:var(--dan); border-radius:8px; border:1px solid rgba(255,68,68,.3); font-size:12px;"><span aria-hidden="true">🚨</span> <strong>¡Alerta Legal! (${diasMora} días).</strong> Tienes 20 días por ley para pagar antes del reporte a centrales de riesgo.</div>`;
  }
  
  return ''; // Si la fecha límite aún no llega
}

function renderDeudas() {
  const sq = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + d.cuota, 0);
  const sm = S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0);
  const diaActual = new Date().getDate();
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
      const interesMensual = (d.total - d.pagado) * (d.tasa / 100);
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
            <div style="font-size:11px; color:var(--t3); line-height:1.6;">Solo el <strong style="color:var(--a1);">${pct}%</strong> de tu ingreso va en deudas. Excelente. Cuando las termines de pagar, redirige esas cuotas al ahorro o a inversiones — ya tienes el hábito de "no tener ese dinero disponible".</div>
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
        const fechaLimiteMes = new Date(hoyMora.getFullYear(), hoyMora.getMonth(), diaPago);
        const retrocedeMes = hoyMora < fechaLimiteMes;

        // Determinamos la fecha límite real y el mes a verificar
        let fechaLimite, mesVerificar;
        if (retrocedeMes) {
          // El pago de este mes aún no vence → revisamos si pagó el mes pasado
          const mPrev = hoyMora.getMonth() - 1;
          const aPrev = mPrev < 0 ? hoyMora.getFullYear() - 1 : hoyMora.getFullYear();
          const mPrevReal = ((mPrev % 12) + 12) % 12;
          fechaLimite = new Date(aPrev, mPrevReal, diaPago);
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
            <div style="font-size:11px; color:var(--t3); line-height:1.6;"><strong style="color:var(--t2);">${enMora90.map(x => x.d.nombre).join(', ')}</strong> lleva${enMora90.length > 1 ? 'n' : ''} más de 90 días sin pago. Por ley, el banco debe avisarte con <strong style="color:var(--dan);">20 días hábiles de anticipación</strong> antes de reportarte. Si te reportan y pagas después, el registro negativo dura el doble del tiempo en mora (máximo 4 años). Actúa hoy.</div>
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
    tarjeta: `💳 <strong>Truco clave:</strong> Compra siempre a <strong>1 sola cuota</strong> y paga el total antes del corte. Nunca saques plata en efectivo con la tarjeta. Eso cobra intereses desde el primer día sin período de gracia.`,

    credito: `🏦 <strong>Tu derecho:</strong> Puedes pagar más del mínimo sin multa. Llama al banco y pide <strong>"abono extraordinario a capital con reducción de plazo"</strong>. Así pagas menos tiempo y menos intereses. Nunca pidas "reducción de cuota".`,

    hipoteca: `🏠 <strong>Ahorra millones:</strong> Si llevas más de un año pagando, puedes llevar tu crédito a otro banco con mejor tasa. Primero pregúntale a tu banco actual. A veces ellos mismos te mejoran la tasa para no perderte.`,

    vehiculo: `🚗 <strong>Sal más rápido:</strong> Haz abonos extra a capital cuando puedas. Si el carro tiene más de 3 años y debes menos de lo que vale, considera venderlo y comprar algo más económico de contado.`,

    educacion: `🎓 <strong>Busca alivios:</strong> Llama a tu entidad y pregunta por refinanciación o períodos de gracia si estás pasando un momento difícil. El ICETEX tiene varios programas de apoyo que poca gente conoce.`,

    persona: `👤 <strong>Regla de oro:</strong> Aunque sea con un familiar, escribe en un papel cuánto debes y cuándo pagas. Ambos firman. Si no puedes pagar a tiempo, avisa antes. El silencio es lo que daña las relaciones.`,

    salud: `🏥 <strong>Negocia sin miedo:</strong> Las clínicas prefieren recibir algo a no recibir nada. Llama al área de cartera y pregunta por descuento de contado o plan sin intereses. En muchos casos aceptan entre el 60% y 80% del valor.`,

    otro: `📦 <strong>3 reglas que siempre aplican:</strong> Nunca ignores una deuda, crece sola. Siempre negocia, la mayoría prefiere un acuerdo. Paga primero la de mayor tasa, es la que más te cuesta cada día.`
  };

  el.innerHTML = copia.map(d => { 
    const pend = Math.max(0, d.total - d.pagado);
    const p = d.total > 0 ? Math.min((d.pagado / d.total) * 100, 100) : 0; 
    const esPrioridad = (d.id === primeraVivaId); 
    const icono = iconoTipoMap[d.tipo] || '📦'; 
    const nombreTipo = nombreTipoMap[d.tipo] || 'Otra Deuda'; 
    const consejo = consejoMap[d.tipo] || ''; 

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

    return `
    <article class="deuda-card-animada" style="background:var(--s1); border:1px solid var(--b1); border-radius:16px; margin-bottom:16px; overflow:hidden; ${borderPrioridad} transition: transform .3s ease, box-shadow .3s ease; animation-delay:${copia.indexOf(d) * 0.08}s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.12)'" onmouseout="this.style.transform='';this.style.boxShadow=''">

      <!-- CABECERA: Nombre + Cuota -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:20px 20px 16px; border-bottom:1px solid var(--b1);">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:44px; height:44px; border-radius:12px; background:var(--s2); border:1px solid var(--b2); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">${icono}</div>
          <div>
            <div style="font-weight:800; font-size:17px; color:var(--t1); line-height:1.2;">${he(d.nombre)}</div>
            <div style="font-size:11px; color:var(--t3); margin-top:3px;">${nombreTipo} · ${d.tasa}% anual · ${d.periodicidad}</div>
            <div style="margin-top:6px;">${badgePrioridad}</div>
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0; margin-left:12px;">
          <div style="font-size:10px; font-weight:700; color:var(--t3); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Cuota a pagar</div>
          <div style="font-family:var(--fm); font-size:26px; font-weight:800; color:var(--a2); line-height:1;">${f(d.cuota)}</div>
        </div>
      </div>

      <!-- CUERPO: Progreso + Saldo -->
      <div style="padding:16px 20px; border-bottom:1px solid var(--b1);">
        
        <!-- Saldo pendiente grande -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <div>
            <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Saldo pendiente</div>
            <div style="font-family:var(--fm); font-size:22px; font-weight:800; color:var(--t1);">${f(pend)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px; color:var(--t3); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Ya pagaste</div>
            <div style="font-family:var(--fm); font-size:22px; font-weight:800; color:${colorBarra};">${f(d.pagado)}</div>
          </div>
        </div>

        <!-- Barra de progreso -->
        <div style="height:10px; background:var(--s3); border-radius:999px; overflow:hidden; margin-bottom:8px;">
          <div style="height:100%; width:${p}%; background:${colorBarra}; border-radius:999px; transition:width .6s ease;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="font-size:11px; color:${p > 0 ? colorBarra : 'var(--t3)'}; font-weight:${p > 0 ? '700' : '400'};">${textoBarra || 'Aún no has abonado a esta deuda'}</span>
          <span style="font-size:11px; color:var(--t3);">Total: ${f(d.total)}</span>
        </div>

        <!-- Tiempo estimado -->
        <div style="font-size:12px; line-height:1.5;">${tiempoTexto}</div>
      </div>

      <!-- PIE: Consejo plegable + Botones -->
      <div style="padding:14px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          
          <!-- Consejo plegable -->
          ${consejo ? `
          <button onclick="const c=this.nextElementSibling; const isOpen=c.style.display==='block'; c.style.display=isOpen?'none':'block'; this.textContent=isOpen?'💡 Ver consejo':'💡 Ocultar consejo';"
            style="background:none; border:none; color:var(--a4); font-size:12px; font-weight:600; cursor:pointer; padding:0; text-align:left;">
            💡 Ver consejo
          </button>
          <div style="display:none; width:100%; padding:10px 12px; background:rgba(59,158,255,.05); border:1px solid rgba(59,158,255,.15); border-radius:8px; font-size:12px; color:var(--t2); line-height:1.5; margin-bottom:4px;">
            ${consejo}
          </div>` : '<div></div>'}

          <!-- Botones -->
          <div style="display:flex; gap:8px; align-items:center; margin-left:auto;">
            <button class="btn bg bsm" style="padding:6px 14px; font-size:12px;" onclick="abrirEditarDeuda(${d.id})">✏️ Editar</button>
            <button 
              style="background:rgba(255,68,68,.06); border:1px solid rgba(255,68,68,.2); color:var(--dan); padding:6px 14px; font-size:11px; font-weight:600; border-radius:6px; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:4px;"
              onmouseover="this.style.background='rgba(255,68,68,.14)'; this.style.borderColor='rgba(255,68,68,.4)';"
              onmouseout="this.style.background='rgba(255,68,68,.06)'; this.style.borderColor='rgba(255,68,68,.2)';"
              onclick="delDeu(${d.id})">
              🗑️ Borrar
            </button>
            <button class="btn bp" style="padding:10px 20px; font-size:14px; font-weight:700; border-radius:8px;" onclick="abrirPagarCuota(${d.id})">
              Pagar Cuota →
            </button>
          </div>
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
  closeM('m-pgc'); save(); renderAll(); 
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
  d.total = nuevoTotal;
  d.cuota = nuevaCuota;
  d.periodicidad = document.getElementById('ed-pe').value;
  d.tasa = +document.getElementById('ed-ta').value || 0;
  d.diaPago = +document.getElementById('ed-dia').value || 1;
  closeM('m-edit-deu');
  save();
  renderAll();
}

async function delDeu(id){const ok=await showConfirm('¿Eliminar deuda?','Eliminar');if(!ok)return;S.deudas=S.deudas.filter(d=>d.id!==id);save();renderAll();}

// ─── 8. INVERSIONES, AGENDA, CUENTAS ───
async function guardarInversion(){const no=document.getElementById('inv-no').value.trim();const pl=document.getElementById('inv-pl').value.trim();const cap=+document.getElementById('inv-cap').value||0;const ta=+document.getElementById('inv-ta').value||0;if(!no||!pl||!cap)return;const fo=document.getElementById('inv-fo').value;if(fo)desF(fo,cap);S.inversiones.push({id:Date.now(),nombre:no,plataforma:pl,capital:cap,rendimiento:0,tasa:ta});closeM('m-inversion');save();renderAll();}
function renderInversiones(){const el=document.getElementById('inv-lst');if(!el)return;const tc=S.inversiones.reduce((s,i)=>s+i.capital,0),tr=S.inversiones.reduce((s,i)=>s+i.rendimiento,0);setEl('inv-tot-cap',f(tc));setEl('inv-tot-rend',f(tr));setEl('inv-tot-gral',f(tc+tr));if(!S.inversiones.length){el.innerHTML='<div class="emp">Sin inversiones.</div>';return;}el.innerHTML=S.inversiones.map(i=>`<article class="gc"><div class="fb"><div><div class="gn">📊 ${he(i.nombre)}</div><div class="gm">${he(i.plataforma)}</div></div><div style="display:flex;gap:6px"><button class="btn bg bsm" onclick="openRendimiento(${i.id},'${he(i.nombre)}')">Actualizar</button><button class="btn bd bsm" onclick="delInversion(${i.id})">×</button></div></div><div style="display:flex;justify-content:space-between;margin-top:12px;background:var(--s3);padding:10px;border-radius:var(--r1)"><div><div class="tm">Capital</div><div class="mono" style="font-weight:600">${f(i.capital)}</div></div><div><div class="tm">Ganancia</div><div class="mono" style="font-weight:600;color:var(--a1)">+${f(i.rendimiento)}</div></div></div></article>`).join('');}
function openRendimiento(id,n){document.getElementById('rend-id').value=id;document.getElementById('rend-t').textContent='Actualizar: '+n;openM('m-rendimiento');}
function guardarRendimiento(){const id=+document.getElementById('rend-id').value;const nv=+document.getElementById('rend-val').value;if(!nv)return;const inv=S.inversiones.find(x=>x.id===id);if(inv)inv.rendimiento=nv-inv.capital;closeM('m-rendimiento');save();renderInversiones();}
function delInversion(id){S.inversiones=S.inversiones.filter(x=>x.id!==id);save();renderInversiones();}

async function guardarPago(){const de=document.getElementById('ag-de').value;const mo=+document.getElementById('ag-mo').value;const fe=document.getElementById('ag-fe').value;if(!de||!mo)return;S.pagosAgendados.push({id:Date.now(),desc:de,monto:mo,fecha:fe,repetir:document.getElementById('ag-re').value,fondo:document.getElementById('ag-fo').value,pagado:false});closeM('m-pago');save();renderAll();}

function renderPagos() {
  const now = new Date();
  now.setHours(0, 0, 0, 0); 
  
  const up = S.pagosAgendados
    .filter(p => !p.pagado)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const totalLiquidez = up.reduce((sum, p) => sum + p.monto, 0);

  const row = (p, bt) => {
    const d = new Date(p.fecha + 'T12:00:00');
    const opts = { month: 'short', day: 'numeric' };
    const fechaFormateada = d.toLocaleDateString('es-CO', opts);

    const dTime = new Date(d);
    dTime.setHours(0, 0, 0, 0);
    const dias = Math.ceil((dTime - now) / 86400000);
    
    let textoDias = ''; let colorFecha = 'var(--t3)'; let colorMonto = 'var(--a2)'; 
    // Por defecto, un borde muy sutil
    let styleAlerta = 'border-left:4px solid transparent;'; 

    if (dias < 0) {
      textoDias = `⚠️ Vencido hace ${Math.abs(dias)} día(s)`;
      colorFecha = 'var(--dan)'; colorMonto = 'var(--dan)';
      styleAlerta = 'background:rgba(255,68,68,0.05); border-left:4px solid var(--dan);'; 
    } else if (dias === 0) { 
      textoDias = 'Hoy'; colorFecha = 'var(--a1)';
      // NUEVO: Destacar el día de HOY con borde verde y fondo sutil
      styleAlerta = 'background:rgba(0,220,130,0.05); border-left:4px solid var(--a1);';
    } else if (dias === 1) { 
      textoDias = 'Mañana'; colorFecha = 'var(--a3)';
    } else { 
      textoDias = `En ${dias} días`; 
    }

    let pill = '';
    if (p.repetir === 'mensual') pill = '<span class="pill pb" style="font-size:9px; padding:2px 6px; margin-left:6px;">Mensual</span>';
    else if (p.repetir === 'quincenal') pill = '<span class="pill py" style="font-size:9px; padding:2px 6px; margin-left:6px;">Quincenal</span>';
    else pill = '<span class="pill pg" style="font-size:9px; padding:2px 6px; margin-left:6px;">Único</span>';

    let cIcono = '🏦', cNom = 'Banco General';
    if (p.fondo === 'efectivo') {
      cIcono = '💵'; cNom = 'Efectivo';
    } else if (p.fondo && p.fondo.startsWith('cuenta_')) {
      const cId = +p.fondo.split('_')[1];
      const c = S.cuentas.find(x => x.id === cId);
      if (c) { cIcono = c.icono; cNom = c.nombre; }
    }
    let fondoPill = `${cIcono} ${he(cNom)}`;

    return `<div class="prow" style="display:flex; align-items:center; padding:10px; border-bottom:1px solid var(--b1); ${styleAlerta}">
      <div style="font-size:12px; color:${colorFecha}; min-width:65px; text-align:center; text-transform:capitalize; font-weight:700;">${fechaFormateada}</div>
      <div style="flex:1;">
        <div style="font-size:13px; font-weight:600; display:flex; align-items:center;">${he(p.desc)} ${pill}</div>
        <div style="font-size:10px; color:var(--t3); margin-top:4px;">Se descontará de: <strong style="color:var(--t2);">${fondoPill}</strong></div>
        <div class="tm" style="color:${dias < 0 ? 'var(--dan)' : 'var(--t2)'}; font-size:11px; margin-top:2px; font-weight:${dias < 0 ? '700' : 'normal'};">${textoDias}</div>
      </div>
      <div class="mono" style="color:${colorMonto}; font-weight:700; font-size:14px; margin-right:12px;">${f(p.monto)}</div>
      ${bt ? `<div style="display:flex; gap:6px;"><button class="btn bp bsm" onclick="marcarPagado(${p.id})" title="Marcar pagado" style="padding:4px 8px;">✓</button><button class="btn bd bsm" onclick="delPago(${p.id})" title="Eliminar" style="padding:4px 8px;">×</button></div>` : ''}
    </div>`;
  };

  let htmlLista = '';
  if (up.length > 0) {
    htmlLista += `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--s2); padding:12px; border-radius:8px; margin-bottom:10px; border:1px solid var(--b2);"><div style="font-size:12px; color:var(--t2); font-weight:600;">💰 Total pendiente por pagar:</div><div style="font-size:18px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(totalLiquidez)}</div></div>`;
    htmlLista += up.map(p => row(p, true)).join('');
  } else {
    htmlLista = '<div class="emp" style="padding:20px; text-align:center;">Sin pagos agendados pendientes</div>';
  }

  setHtml('pa-lst', htmlLista);
  setHtml('d-prox', up.length ? up.slice(0, 4).map(p => row(p, false)).join('') : '<div class="emp">Sin pagos próximos</div>');

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
    if (p.repetir === 'mensual') nextDate.setMonth(nextDate.getMonth() + 1);
    if (p.repetir === 'quincenal') nextDate.setDate(nextDate.getDate() + 15);
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    S.pagosAgendados.push({ id: Date.now() + Math.random(), desc: p.desc, monto: p.monto, fecha: `${yyyy}-${mm}-${dd}`, repetir: p.repetir, fondo: p.fondo, pagado: false });
  }

  closeM('m-conf-pago'); 
  save(); 
  renderAll();
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

    // Evitamos que el hover (gris) sobreescriba el color verde de selección
    html += `<div class="cal-day-box${todayClass}" style="${style}" onclick="showDayDetails(${day}, this)" onmouseover="if(!this.classList.contains('selected-day')) this.style.background='var(--s3)'" onmouseout="if(!this.classList.contains('selected-day')) this.style.background='${baseBg}'">${daySpan}${dots}</div>`;
  }

  el.innerHTML = html;
  el.style.display = 'grid'; el.style.gridTemplateColumns = 'repeat(7, 1fr)'; el.style.gap = '6px';
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
async function editSaldoCuentaDash(id) { const c = S.cuentas.find(x => x.id === id); if (!c) return; const val = await showPrompt(`Saldo actual: ${f(c.saldo)}\n\nIngresa el nuevo saldo:`, `Editar ${c.nombre}`, c.saldo); if (!val) return; c.saldo = Math.max(0, +val || 0); S.saldos.banco = totalCuentas(); save(); renderDashCuentas(); updSaldo(); updateDash(); }

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

function guardarPrima(){const m=+document.getElementById('prm-mo').value||0;if(!m)return;S.ingreso+=m;S.gastos.unshift({id:Date.now(),desc:'🎉 Prima/Bono',monto:m,montoTotal:m,cat:'otro',tipo:'ahorro',fondo:'banco',hormiga:false,cuatroXMil:false,fecha:hoy(),metaId:'',autoFijo:false});refF('banco',m);closeM('m-prima');save();renderAll();}
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
  setEl('d-hor', f(tH));
  setEl('d-phc', `${S.ingreso > 0 ? Math.round(tH / S.ingreso * 100) : 0}% del ingreso`);
  
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
  const aEl=document.getElementById('d-ant'); 
  if(aEl){ aEl.innerHTML=Object.keys(antI).length?Object.entries(antI).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([d,m])=>`<div class="fb" style="margin-bottom:8px;font-size:12px"><span>🐜 ${he(d)}</span><span class="mono" style="color:var(--a3);font-weight:600">${f(m)}</span></div>`).join(''):''; document.getElementById('d-ante').style.display=Object.keys(antI).length?'none':'block'; }
  
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
function consolMes(){const mes=mesStr();const hist=S.historial.filter(h=>h.mes===mes);let ing=0,eg=0;hist.forEach(h=>{ing+=h.ingreso;eg+=h.gastado;});const gasAct=S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0);return{ing:ing+S.ingreso,eg:eg+gasAct,bal:(ing+S.ingreso)-(eg+gasAct),q:hist.length+(S.ingreso>0?1:0)};}
function renderHistorial(){const el=document.getElementById('hi-lst');if(!el)return;el.innerHTML=S.historial.length?S.historial.map(hx=>`<article class="gc"><div class="fb mb"><div style="font-weight:800">📅 ${hx.periodo}</div><button class="btn bd bsm" onclick="delHistorial(${hx.id})">×</button></div><div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--t3)"><span>Ingreso <span class="mono" style="color:var(--t1)">${f(hx.ingreso)}</span></span><span>Gastado <span class="mono" style="color:var(--a3)">${f(hx.gastado)}</span></span><span>Ahorrado <span class="mono" style="color:var(--a1)">${f(hx.ahorro)}</span></span></div></article>`).join(''):'<div class="emp">Sin historial</div>';}
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
  const diaActual = new Date().getDate();
  let cPer = 0;
  if (S.tipoPeriodo === 'mensual') {
    cPer = (sq * 2) + sm;
  } else if (S.tipoPeriodo === 'q1') {
    cPer = sq + sm;
  } else {
    cPer = sq;
  }
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
  const netTotal = ck ? rendTotal * 0.93 : rendTotal; 
  
  if (per === '30') {
    const tem = Math.pow(1 + t, 1 / 12) - 1;
    const rendMensual = c * tem;
    const netMensual = ck ? rendMensual * 0.93 : rendMensual;
    
    setHtml('cdt-res', `<div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);"><div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Recibirás en tu cuenta cada mes:</div><div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(netMensual)}</div><div style="font-size:12px; color:var(--t2); margin-top:10px; border-top:1px solid var(--b1); padding-top:10px;">Ganancia sumada al final del plazo: <strong>${f(netTotal)}</strong></div></div>`);
  } else {
    setHtml('cdt-res', `<div style="margin-top:14px; padding:16px; background:var(--s2); border-radius:8px; border:1px solid var(--b2);"><div style="font-size:12px; color:var(--t3); margin-bottom:4px;">Ganancia neta total al final del plazo:</div><div style="font-size:24px; color:var(--a1); font-family:var(--fm); font-weight:700;">${f(netTotal)}</div></div>`);
  }
}
function cCre(){const p=+document.getElementById('cr-mo')?.value||0;const tm=+document.getElementById('cr-ta')?.value/100||0;const n=+document.getElementById('cr-n')?.value||0;const cu=tm===0?p/n:(p*(tm*Math.pow(1+tm,n))/(Math.pow(1+tm,n)-1));setHtml('cre-res',`<div class="crv">${f(cu)} cuota mensual</div>`);}
function cIC(){const c=+document.getElementById('ic-cap')?.value||0;const a=+document.getElementById('ic-apo')?.value||0;const ta=+document.getElementById('ic-tas')?.value/100||0;const m=+document.getElementById('ic-mes')?.value||0;const tm=Math.pow(1+ta,1/12)-1;const vf=tm>0?c*Math.pow(1+tm,m)+a*(Math.pow(1+tm,m)-1)/tm:c+a*m;setHtml('ic-res',`<div class="crv">${f(vf)} valor final</div>`);}
function cMeta(){const e=document.getElementById('ma-tot');if(!e)return;const M=+e.value||0;const T=+document.getElementById('ma-ten')?.value||0;const fe=document.getElementById('ma-fe')?.value;const falta=Math.max(0,M-T);const dias=Math.max(0,Math.ceil((new Date(fe)-new Date())/86400000));const q=Math.max(1,Math.floor(dias/15));setHtml('ma-res',`<div class="crv">${f(falta/q)} por quincena</div>`);}
function cPila(){const ing=+document.getElementById('pl-ing')?.value||0;const arl=+document.getElementById('pl-arl')?.value||0.00522;const ibc=Math.max(ing*0.4, 1300000);const tot=ibc*(0.125+0.16+arl);setHtml('pila-res',`<div class="crv">${f(tot)} a pagar (PILA)</div>`);}

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

function exportarCSV() {
  if (!S.gastos.length) { showAlert('No hay gastos registrados para exportar.', 'Sin datos'); return; }
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
  if (typeof XLSX === 'undefined') {
    showAlert('No se pudo cargar la librería de Excel. Verifica tu conexión a internet e intenta de nuevo.', 'Error de exportación');
    return;
  }
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
setTimeout(actualizarVistaFondo, 500);

// ─── 13. HELPERS Y MODALES ───
function openM(id){document.getElementById(id).classList.add('open');}
function closeM(id){document.getElementById(id).classList.remove('open');}
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

function toggleSidebar(){const sb=document.getElementById('sidebar');const ex=sb.classList.toggle('expanded');document.body.classList.toggle('sb-expanded',ex);localStorage.setItem('sb_expanded',ex);}

function actualizarListasFondos() {
  // Construir opciones disponibles
  const opcionesBase = [
    { value: 'efectivo', icon: '💵', nombre: 'Efectivo', saldo: S.saldos.efectivo }
  ];
  if (S.cuentas && S.cuentas.length > 0) {
    S.cuentas.forEach(c => opcionesBase.push({ value: `cuenta_${c.id}`, icon: c.icono, nombre: c.nombre, saldo: c.saldo }));
  } else {
    opcionesBase.push({ value: 'banco', icon: '🏦', nombre: 'Banco (General)', saldo: S.saldos.banco });
  }

  const selectores = ['g-fo','gf-fo','oa-fo','ag-fo','inv-fo','prm-fo','fe-fo','pgc-fo','mf-fo','cp-fo','eg-fo'];

  selectores.forEach(id => {
    const wrap = document.getElementById(id + '-wrap');
    if (!wrap) return;

    const hidden = document.getElementById(id);
    const valorActual = hidden ? hidden.value : '';
    const opciones = id === 'inv-fo'
      ? [{ value: '', icon: '➖', nombre: 'No descontar (solo registrar)', saldo: null }, ...opcionesBase]
      : opcionesBase;

    const opSel = opciones.find(o => o.value === valorActual) || opciones[0];

    // Actualizar trigger
    const trigger = wrap.querySelector('.fund-sel-trigger');
    if (trigger) {
      trigger.querySelector('.fund-sel-icon').textContent = opSel.icon;
      trigger.querySelector('.fund-sel-name').textContent = opSel.nombre;
      trigger.querySelector('.fund-sel-bal').textContent = opSel.saldo !== null && opSel.saldo !== undefined ? `Disponible: ${f(opSel.saldo)}` : 'Solo registro';
    }

    // Actualizar opciones del menú
    const opts = wrap.querySelector('.fund-sel-opts');
    if (opts) {
      opts.innerHTML = opciones.map(o => {
        const esSel = o.value === (hidden ? hidden.value : '');
        const balTexto = o.saldo !== null && o.saldo !== undefined ? `Disponible: ${f(o.saldo)}` : 'Solo registro';
        return `<div class="fund-sel-opt${esSel ? ' fso-sel' : ''}" onclick="selFundOpt('${id}','${o.value}','${o.icon.replace(/'/g,"\\'")}','${o.nombre.replace(/'/g,"\\'")}',${o.saldo !== null && o.saldo !== undefined ? o.saldo : 'null'})">
          <span class="fund-sel-opt-icon">${o.icon}</span>
          <div class="fund-sel-opt-info">
            <div class="fund-sel-opt-name">${he(o.nombre)}</div>
            <div class="fund-sel-opt-bal">${balTexto}</div>
          </div>
          ${esSel ? '<span class="fund-sel-check">✓</span>' : ''}
        </div>`;
      }).join('');
    }

    // Sincronizar hidden input al primer valor si está vacío
    if (hidden && !hidden.value && opciones.length > 0) hidden.value = opciones[0].value;
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
    }
  });
  wrap.querySelector('.fund-sel-trigger')?.classList.toggle('open');
  wrap.querySelector('.fund-sel-opts')?.classList.toggle('open');
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

// Cerrar al hacer clic fuera
document.addEventListener('click', e => {
  if (!e.target.closest('.fund-select')) {
    document.querySelectorAll('.fund-sel-opts.open').forEach(el => {
      el.classList.remove('open');
      el.closest('.fund-select')?.querySelector('.fund-sel-trigger')?.classList.remove('open');
    });
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

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-ov')) {
    if (e.target.id !== 'cdlg-ov') {
      e.target.classList.remove('open');
    }
  }
});

// =========================================================
// 14. EXPOSICIÓN GLOBAL A WINDOW (HTML)
// =========================================================
window.go=go; window.setPer=setPer; window.toggleSidebar=toggleSidebar; window.openM=openM; window.closeM=closeM;
window.guardarQ=guardarQ; window.resetTodo=resetTodo; window.resetQuincena=resetQuincena; window.onMetCh=onMetCh; window.selM=selM; window.calcDist=calcDist;
window.agregarGasto=agregarGasto; window.delGasto=delGasto; window.abrirEditarGasto=abrirEditarGasto; window.guardarEditarGasto=guardarEditarGasto; window.limpiarGastos=limpiarGastos; window.prev4k=prev4k; window.actualizarSemaforo=actualizarSemaforo; window.calcularImpactoHormiga=calcularImpactoHormiga; window.renderGastos=renderGastos;
window.guardarFijo=guardarFijo; window.abrirModalFijo=abrirModalFijo; window.cerrarModalFijo=cerrarModalFijo; window.ejecutarPagoFijo=ejecutarPagoFijo; window.delFijo=delFijo; window.desmFijo=desmFijo;

window.setModoDeuda=setModoDeuda; window.guardarDeuda=guardarDeuda; window.abrirPagarCuota=abrirPagarCuota; window.confPagarCuota=confPagarCuota; window.delDeu=delDeu; window.abrirEditarDeuda=abrirEditarDeuda; window.guardarEditarDeuda=guardarEditarDeuda; window.selTipoDeuda=selTipoDeuda; window.selFrecDeuda=selFrecDeuda; window.selTipoDeudaEdit=selTipoDeudaEdit; window.selFrecDeudaEdit=selFrecDeudaEdit;

window.guardarPago=guardarPago; window.marcarPagado=marcarPagado; window.delPago=delPago;
window.toggleTipoObjetivo=toggleTipoObjetivo; window.openNuevoObjetivo=openNuevoObjetivo; window.guardarObjetivo=guardarObjetivo; window.abrirAccionObj=abrirAccionObj; window.ejecutarAccionObjetivo=ejecutarAccionObjetivo; window.delObjetivo=delObjetivo;
window.toggleCalc=toggleCalc; window.cCDT=cCDT; window.cCre=cCre; window.cIC=cIC; window.cMeta=cMeta; window.cPila=cPila;
window.exportarDatos=exportarDatos; window.importarDatos=importarDatos; window.cerrarQ=cerrarQ; window.guardarInversion=guardarInversion; window.openRendimiento=openRendimiento; window.guardarRendimiento=guardarRendimiento; window.delInversion=delInversion; window.calcPrima=calcPrima; window.guardarPrima=guardarPrima; window.guardarCuenta=guardarCuenta; window.delCuenta=delCuenta; window.editSaldoCuenta=editSaldoCuenta; window.editSaldoCuentaDash=editSaldoCuentaDash; window.exportarCSV=exportarCSV; window.descargarCSVDirecto=descargarCSVDirecto;
window.calcularFondoEmergencia=calcularFondoEmergencia; window.actualizarVistaFondo=actualizarVistaFondo; window.registrarAbonoFondo=registrarAbonoFondo; window.actualizarListasFondos=actualizarListasFondos; window.toggleFundSelect=toggleFundSelect; window.selFundOpt=selFundOpt; window.renderCuentas=renderCuentas; window.renderDashCuentas=renderDashCuentas; window.renderStats=renderStats; window.cInf = cInf; window.cR72 = cR72; window.evaluarGastoEvento = evaluarGastoEvento; window.prevMonth = prevMonth; window.nextMonth = nextMonth; window.showDayDetails = showDayDetails; window.ejecutarPagoAgendado = ejecutarPagoAgendado;
