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
const NAVS = ['dash','quin','gast','fijo','objetivos','inve','deu','agen','calc','stat','hist','cons'];

// ─── 1. ARRANQUE SEGURO ───
function initApp() {
  loadData();
  if(localStorage.getItem('sb_expanded') === 'true') { document.getElementById('sidebar')?.classList.add('expanded'); document.body.classList.add('sb-expanded'); }
  if(localStorage.getItem('fco_theme') === 'light'){ document.body.classList.add('light-theme'); const b = document.getElementById('btn-theme'); if(b){ const ni = b.querySelector('.ni'); if(ni) ni.textContent='🌙'; } }
  
  updateBadge(); populateSelectObjetivos(); renderAll(); renderTips(); calcScore();
  
  // Precarga blindada de calculadoras (Si alguna no existe en el HTML, no crashea)
  cCDT(); cCre(); cIC(); cMeta(); cPila();
  
  const hoyD = new Date();
  ['g-fe','ag-fe','obj-fe'].forEach(i => { const e=document.getElementById(i); if(e) e.valueAsDate=hoyD; });
  if(S.ingreso > 0){ const e = document.getElementById('q-pri'); if(e) e.value = S.ingreso; }
  updSaldo();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();

function renderAll(){
  renderGastos(); updateDash(); renderObjetivos(); renderInversiones(); 
  renderDeudas(); renderFijos(); renderPagos(); renderHistorial(); 
  updSaldo(); renderStats(); renderCuentas(); renderDashCuentas();
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
  if(id === 'cons') calcScore(); if(id === 'agen') renderCal(); if(id === 'stat') renderStats(); if(id === 'gast') updSaldo();
}

function setPer(tipo, el) {
  S.tipoPeriodo = tipo; 
  document.querySelectorAll('.qtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active'); renderDeudas(); updateDash();
}

function onMetCh(){document.getElementById('cus-pct').style.display=document.getElementById('q-met').value==='custom'?'block':'none';calcDist();}
function selM(el,m){document.querySelectorAll('.mcd').forEach(c=>c.classList.remove('sel'));el.classList.add('sel');document.getElementById('q-met').value=m;onMetCh();}
function getPct(){
  const m=document.getElementById('q-met').value;
  const MAP={'50-30-20':{n:50,d:30,a:20},'50-20-30':{n:50,d:20,a:30},'70-20-10':{n:70,d:20,a:10},'60-30-10':{n:60,d:30,a:10}};
  if(MAP[m]) return MAP[m];
  return { n: +document.getElementById('pn').value||50, d: +document.getElementById('pd').value||30, a: +document.getElementById('pa').value||20 };
}

function calcDist(){
  const t = (+document.getElementById('q-pri').value||0) + (+document.getElementById('q-ext').value||0);
  if(!t) { document.getElementById('q-prev').innerHTML='<div class="emp">Ingresa tu salario para ver la distribución</div>'; return; }
  const p = getPct();
  const html = `<div style="margin-bottom:16px"><div style="font-family:var(--fm);font-weight:700;font-size:24px;color:var(--a1);letter-spacing:-1px">${f(t)}</div><div class="tm">ingreso total</div></div>${drBar('🏠 Necesidades',p.n,t*p.n/100,'var(--a4)')}${drBar('🎉 Deseos',p.d,t*p.d/100,'var(--a2)')}${drBar('💰 Ahorro',p.a,t*p.a/100,'var(--a1)')}`;
  document.getElementById('q-prev').innerHTML = html;
}
function drBar(l,pct,m,col){return`<div class="dr"><div class="dl">${l}</div><div class="dbw"><div class="db" style="width:${pct}%;background:${col}"></div></div><div class="dp">${pct}%</div><div class="da">${f(m)}</div></div>`;}

async function guardarQ() {
  const p = +document.getElementById('q-pri').value||0;
  if(!p) { await showAlert('Ingresa tu salario principal primero.','Campo requerido'); return; }
  S.ingreso = p + (+document.getElementById('q-ext').value||0);
  S.metodo = document.getElementById('q-met').value;
  calcDist();
  
  const efVal = document.getElementById('q-ef').value; 
  const bkVal = document.getElementById('q-bk').value;
  
  if(efVal !== '') S.saldos.efectivo = Math.max(0, +efVal);
  
  // 🛡️ BLINDAJE CONTABLE:
  // Si tienes cuentas creadas (Nequi, Nu), obligamos a que el saldo global 
  // sea estrictamente la suma de esas cuentas para que no haya descuadres.
  if (S.cuentas && S.cuentas.length > 0) {
    S.saldos.banco = totalCuentas();
  } else if (bkVal !== '') {
    // Si no tienes cuentas creadas, usamos el valor manual que pusiste
    S.saldos.banco = Math.max(0, +bkVal);
  }
  
  document.getElementById('q-ef').value=''; document.getElementById('q-bk').value='';
  save(); renderAll(); go('dash'); sr('Quincena configurada');
}

async function resetTodo() {
  const ok = await showPromptConfirm('Esta acción eliminará TODOS tus datos. NO se puede deshacer.','BORRAR','🗑️ Borrar TODOS los datos');
  if(!ok) return;
  localStorage.removeItem('fco_v4'); Object.keys(S).forEach(key => delete S[key]);
  Object.assign(S, {tipoPeriodo:'q1', quincena:1, ingreso:0, metodo:'50-30-20', saldos:{efectivo:0, banco:0}, cuentas:[], gastos:[], objetivos:[], deudas:[], historial:[], gastosFijos:[], pagosAgendados:[], inversiones:[]});
  document.getElementById('q-pri').value=''; document.getElementById('q-ext').value='';
  renderAll(); go('dash'); await showAlert('✅ Todos los datos han sido eliminados.','Listo');
}

async function resetQuincena() {
  const ok = await showConfirm('Esto elimina los gastos del período actual. Tus objetivos y deudas NO se verán afectados.','↺ Resetear período');
  if(!ok) return;
  S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>refF(g.fondo, g.montoTotal||g.monto));
  S.gastos=[]; S.ingreso=0;
  document.getElementById('q-pri').value=''; document.getElementById('q-ext').value='';
  save(); renderAll(); go('dash');
}

// ─── 3. SALDOS Y FONDOS ───
function updSaldo(){
  const ef=S.saldos.efectivo, bk=S.saldos.banco, tot=ef+bk;
  ['d-ef','g-ef','q-efc'].forEach(i=>{const e=document.getElementById(i);if(e)e.textContent=f(ef);});
  ['d-bk','g-bk','q-bkc'].forEach(i=>{const e=document.getElementById(i);if(e)e.textContent=f(bk);});
  const te=document.getElementById('d-tot');if(te)te.textContent=f(tot);
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
  else if (tipo === 'deseo') { limite = S.ingreso * (p.d / 100); etiqueta = 'Deseos'; }
  else { limite = S.ingreso * (p.a / 100); etiqueta = 'Ahorros'; }
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

function prev4k(){
  const mo = +document.getElementById('g-mo').value || 0; const ck = document.getElementById('g-4k')?.checked; const el = document.getElementById('p4k');
  if(ck && mo > 0){ el.style.display='block'; el.innerHTML=`GMF 4×1000: +${f(mo*0.004)} → Total a debitar: <strong style="color:var(--a1)">${f(mo*1.004)}</strong>`; } 
  else if(el) el.style.display='none';
}

function calcularImpactoHormiga() {
  const ti = document.getElementById('g-ti')?.value; 
  const mo = +document.getElementById('g-mo')?.value || 0; 
  const infoEl = document.getElementById('g-hormiga-impact');
  if(!infoEl) return;
  
  if(ti === 'hormiga' && mo > 0) {
     const anual = mo * 365; let msg = `🐜 <strong>Impacto Anual:</strong> Si repites este gasto a diario, perderás <strong>${f(anual)}</strong> al año. `;
     if(S.objetivos && S.objetivos.length > 0) {
        const meta = S.objetivos[0]; const pct = Math.round((anual / meta.objetivoAhorro) * 100);
        if(pct > 0) msg += `<br><br>¡Esa plata equivale al <strong>${pct}%</strong> de tu meta <em>"${meta.nombre}"</em>!`;
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
    const disp = fo === 'efectivo' ? S.saldos.efectivo : S.saldos.banco;
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
    // Buscamos la cuenta real
    let cIcono = '🏦', cNom = 'Banco';
    if (g.fondo === 'efectivo') { cIcono = '💵'; cNom = 'Efectivo'; }
    else if (g.fondo.startsWith('cuenta_')) {
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

function abrirEditarGasto(id) { const g = S.gastos.find(x => x.id === id); if (!g) return; document.getElementById('eg-id').value = id; document.getElementById('eg-de').value = g.desc; document.getElementById('eg-mo').value = g.monto; document.getElementById('eg-ca').value = g.cat; document.getElementById('eg-ti').value = g.tipo; document.getElementById('eg-fo').value = g.fondo.startsWith('cuenta_') ? 'banco' : g.fondo; document.getElementById('eg-ho').value = g.hormiga ? 'si' : 'no'; document.getElementById('eg-fe').value = g.fecha; openM('m-edit-gasto'); }
async function guardarEditarGasto() { const id = +document.getElementById('eg-id').value; const g = S.gastos.find(x => x.id === id); if (!g) return; const nMonto = +document.getElementById('eg-mo').value; const nFondo = document.getElementById('eg-fo').value; if (!nMonto) return; if (g.tipo !== 'ahorro') refF(g.fondo, g.montoTotal || g.monto); g.desc = document.getElementById('eg-de').value.trim(); g.monto = nMonto; g.montoTotal = nMonto; g.cat = document.getElementById('eg-ca').value; g.tipo = document.getElementById('eg-ti').value; g.fondo = nFondo; g.hormiga = document.getElementById('eg-ho').value === 'si'; g.fecha = document.getElementById('eg-fe').value; if (g.tipo !== 'ahorro') desF(nFondo, nMonto); closeM('m-edit-gasto'); save(); renderAll(); }
async function limpiarGastos(){ const ok = await showConfirm('¿Eliminar todos los gastos del período actual?', 'Limpiar'); if(!ok) return; S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>refF(g.fondo,g.montoTotal||g.monto)); const mes=mesStr(); S.gastosFijos.forEach(g=>{g.pagadoEn=g.pagadoEn.filter(m=>m!==mes);}); S.gastos=[]; save(); renderAll(); }

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

function abrirModalFijo(id) { const fx = S.gastosFijos.find(x => x.id == id); if (!fx) return; idFijoPendiente = id; document.getElementById('mf-nombre').innerText = fx.nombre; document.getElementById('mf-monto').innerText = f(fx.cuatroXMil ? (fx.montoTotal || Math.round(fx.monto*1.004)) : fx.monto); openM('modal-pagar-fijo'); }
function cerrarModalFijo() { closeM('modal-pagar-fijo'); idFijoPendiente = null; }
async function ejecutarPagoFijo(fo) {
  const fx = S.gastosFijos.find(x => x.id == idFijoPendiente); if (!fx) return;
  const m = fx.cuatroXMil ? (fx.montoTotal || Math.round(fx.monto*1.004)) : fx.monto;
  const disp = fo === 'efectivo' ? S.saldos.efectivo : S.saldos.banco;
  if (disp < m) { const ok = await showConfirm(`⚠️ Saldo insuficiente en ${fo}.\n¿Pagar de todas formas?`, 'Saldo'); if (!ok) return; }
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
  document.getElementById('oa-id').value = id; document.getElementById('oa-tipo-accion').value = accion;
  document.getElementById('oa-tit').textContent = accion === 'abonar' ? `Abonar a: ${obj.nombre}` : `Gasto en: ${obj.nombre}`;
  document.getElementById('oa-lbl-mo').textContent = accion === 'abonar' ? 'Monto a guardar (COP)' : 'Monto gastado (COP)';
  document.getElementById('oa-fg-desc').style.display = accion === 'gastar' ? 'block' : 'none';
  document.getElementById('oa-mo').value = ''; document.getElementById('oa-desc').value = '';
  openM('m-obj-accion');
}

async function ejecutarAccionObjetivo() {
  const id = +document.getElementById('oa-id').value; const accion = document.getElementById('oa-tipo-accion').value; const monto = +document.getElementById('oa-mo').value; const fondo = document.getElementById('oa-fo').value; const desc = document.getElementById('oa-desc').value.trim();
  const obj = S.objetivos.find(x => x.id === id);
  if (!obj || !monto) return;
  if (accion === 'gastar' && !desc) { await showAlert('Escribe en qué gastaste el dinero.', 'Falta descripción'); return; }

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
  const btnAva = document.getElementById('btn-ava'); const btnBola = document.getElementById('btn-bola');
  if(btnAva) btnAva.className = m === 'avalancha' ? 'btn bp' : 'btn bg'; 
  if(btnBola) btnBola.className = m === 'bola' ? 'btn bp' : 'btn bg'; 
  save(); renderDeudas();
}

async function guardarDeuda(){
  const no=document.getElementById('dn-no').value.trim(); const to=+document.getElementById('dn-to').value; const cu=+document.getElementById('dn-cu').value;
  if(!no||!to||!cu){ await showAlert('Completa nombre, saldo y cuota.','Requerido'); return; }
  S.deudas.push({id:Date.now(), nombre:no, total:to, cuota:cu, periodicidad:document.getElementById('dn-pe').value, nPeriodos:+document.getElementById('dn-nn').value||0, tasa:+document.getElementById('dn-ta').value||0, tipo:document.getElementById('dn-ti').value, pagado:0});
  ['dn-no','dn-to','dn-cu','dn-ta','dn-nn'].forEach(i=>document.getElementById(i).value=''); closeM('m-deu'); save(); renderAll();
}

function renderDeudas() {
  const sq = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + d.cuota, 0);
  const sm = S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0);
  let cPer = 0;
  if (S.tipoPeriodo === 'mensual') { cPer = (sq * 2) + sm; setEl('de-cpl', 'Quincenales x2 + Mensuales'); } 
  else { if (S.tipoPeriodo === 'q1' || S.quincena === 1) { cPer = sq + sm; setEl('de-cpl', 'Q1: quincenal + mensual'); } else { cPer = sq; setEl('de-cpl', 'Q2: solo quincenal'); } }

  const totD = S.deudas.reduce((s, d) => s + Math.max(0, d.total - d.pagado), 0);
  const pct = S.ingreso > 0 ? Math.round(cPer / S.ingreso * 100) : 0;
  setEl('de-tot', f(totD)); setEl('de-cq', f(sq)); setEl('de-cm', f(sm)); setEl('de-cp', f(cPer));
  const pe = document.getElementById('de-pct'); if (pe) { pe.textContent = pct + '%'; pe.style.color = pct > 30 ? 'var(--dan)' : 'var(--a1)'; }
  
  const el = document.getElementById('de-lst'); if (!S.deudas.length) { el.innerHTML = '<div class="emp">Sin deudas registradas 🎉</div>'; return; }

  const modo = S.modoDeuda || 'avalancha'; let copia = [...S.deudas];
  
  if (modo === 'avalancha') { 
    // AVALANCHA: Mayor tasa de interés primero
    copia.sort((a, b) => (b.tasa || 0) - (a.tasa || 0)); 
    
    const msgEl = document.getElementById('deu-coach-msg'); 
    if(msgEl) msgEl.innerHTML = `🔥 <strong>Avalancha:</strong> Paga el mínimo en todas, y mete extra a la más cara.`; 
  } 
  else { 
    // BOLA DE NIEVE: Menor saldo primero (Con desempate inteligente)
    copia.sort((a, b) => {
      const saldoA = a.total - a.pagado;
      const saldoB = b.total - b.pagado;
      
      // 🎯 Si los saldos son exactamente iguales, desempata por la tasa más alta
      if (saldoA === saldoB) {
        return (b.tasa || 0) - (a.tasa || 0); 
      }
      // Si no son iguales, ordena por el saldo más pequeño
      return saldoA - saldoB; 
    }); 
    
    const msgEl = document.getElementById('deu-coach-msg'); 
    if(msgEl) msgEl.innerHTML = `⛄ <strong>Bola de Nieve:</strong> Destruye la más pequeña primero para motivación.`; 
  }
  
  const primeraVivaId = copia.find(d => (d.total - d.pagado) > 0)?.id;
  el.innerHTML = copia.map(d => {
    const pend = Math.max(0, d.total - d.pagado); const p = Math.min(d.pagado / d.total * 100, 100);
    const esPrioridad = (d.id === primeraVivaId); 
    let avisoCoach = '';
    if (esPrioridad) { avisoCoach = modo === 'avalancha' ? `<div style="margin-top:10px;padding:8px;background:rgba(255,68,68,.1);border:1px solid rgba(255,68,68,.3);border-radius:6px;font-size:11px;color:var(--dan);">🔥 <strong>OBJETIVO AVALANCHA:</strong> Esta es la deuda que más sangre te chupa (${d.tasa}%).</div>` : `<div style="margin-top:10px;padding:8px;background:rgba(0,220,130,.1);border:1px solid rgba(0,220,130,.3);border-radius:6px;font-size:11px;color:var(--a1);">⛄ <strong>OBJETIVO BOLA DE NIEVE:</strong> Esta es tu deuda más pequeña. ¡Destrúyela!</div>`; }
    return `<article class="gc" style="${esPrioridad ? (modo === 'avalancha' ? 'border-left: 3px solid var(--dan)' : 'border-left: 3px solid var(--a1)') : ''}"><div class="fb"><div><div class="gn">💳 ${he(d.nombre)}</div><div class="gm">Tasa: ${d.tasa}%</div></div><div style="display:flex;gap:6px"><button class="btn bg bsm" onclick="abrirPagarCuota(${d.id})">Pagar</button><button class="btn bd bsm" onclick="delDeu(${d.id})">×</button></div></div><div class="ga" style="margin-top:10px"><span class="tm">Saldo: <span class="mono" style="color:var(--dan)">${f(pend)}</span></span><span class="tm">Cuota: <span class="mono">${f(d.cuota)}</span></span></div><div class="pw"><div class="pf" style="width:${p}%;background:var(--a1)"></div></div>${avisoCoach}</article>`;
  }).join('');
}

function abrirPagarCuota(id){const d=S.deudas.find(x=>x.id===id);if(!d)return;setEl('pgc-no',d.nombre);setEl('pgc-mo',f(d.cuota));document.getElementById('pgc-id').value=id;openM('m-pgc');}
async function confPagarCuota(fo){const id=+document.getElementById('pgc-id').value; const d=S.deudas.find(x=>x.id===id); if(!d){closeM('m-pgc');return;} desF(fo, d.cuota); d.pagado = Math.min(d.pagado + d.cuota, d.total); S.gastos.unshift({ id: Date.now(), desc: `💳 Cuota: ${d.nombre}`, monto: d.cuota, montoTotal: d.cuota, cat: 'deudas', tipo: 'necesidad', fondo: fo, hormiga: false, cuatroXMil: false, fecha: hoy(), metaId: '', autoFijo: false }); closeM('m-pgc'); save(); renderAll(); }
async function delDeu(id){const ok=await showConfirm('¿Eliminar deuda?','Eliminar');if(!ok)return;S.deudas=S.deudas.filter(d=>d.id!==id);save();renderAll();}

// ─── 8. INVERSIONES, AGENDA, CUENTAS ───
async function guardarInversion(){const no=document.getElementById('inv-no').value.trim();const pl=document.getElementById('inv-pl').value.trim();const cap=+document.getElementById('inv-cap').value||0;const ta=+document.getElementById('inv-ta').value||0;if(!no||!pl||!cap)return;const fo=document.getElementById('inv-fo').value;if(fo)desF(fo,cap);S.inversiones.push({id:Date.now(),nombre:no,plataforma:pl,capital:cap,rendimiento:0,tasa:ta});closeM('m-inversion');save();renderAll();}
function renderInversiones(){const el=document.getElementById('inv-lst');if(!el)return;const tc=S.inversiones.reduce((s,i)=>s+i.capital,0),tr=S.inversiones.reduce((s,i)=>s+i.rendimiento,0);setEl('inv-tot-cap',f(tc));setEl('inv-tot-rend',f(tr));setEl('inv-tot-gral',f(tc+tr));if(!S.inversiones.length){el.innerHTML='<div class="emp">Sin inversiones.</div>';return;}el.innerHTML=S.inversiones.map(i=>`<article class="gc"><div class="fb"><div><div class="gn">📊 ${he(i.nombre)}</div><div class="gm">${he(i.plataforma)}</div></div><div style="display:flex;gap:6px"><button class="btn bg bsm" onclick="openRendimiento(${i.id},'${he(i.nombre)}')">Actualizar</button><button class="btn bd bsm" onclick="delInversion(${i.id})">×</button></div></div><div style="display:flex;justify-content:space-between;margin-top:12px;background:var(--s3);padding:10px;border-radius:var(--r1)"><div><div class="tm">Capital</div><div class="mono" style="font-weight:600">${f(i.capital)}</div></div><div><div class="tm">Ganancia</div><div class="mono" style="font-weight:600;color:var(--a1)">+${f(i.rendimiento)}</div></div></div></article>`).join('');}
function openRendimiento(id,n){document.getElementById('rend-id').value=id;document.getElementById('rend-t').textContent='Actualizar: '+n;openM('m-rendimiento');}
function guardarRendimiento(){const id=+document.getElementById('rend-id').value;const nv=+document.getElementById('rend-val').value;if(!nv)return;const inv=S.inversiones.find(x=>x.id===id);if(inv)inv.rendimiento=nv-inv.capital;closeM('m-rendimiento');save();renderInversiones();}
function delInversion(id){S.inversiones=S.inversiones.filter(x=>x.id!==id);save();renderInversiones();}

async function guardarPago(){const de=document.getElementById('ag-de').value;const mo=+document.getElementById('ag-mo').value;const fe=document.getElementById('ag-fe').value;if(!de||!mo)return;S.pagosAgendados.push({id:Date.now(),desc:de,monto:mo,fecha:fe,repetir:document.getElementById('ag-re').value,fondo:document.getElementById('ag-fo').value,pagado:false});closeM('m-pago');save();renderAll();}
function renderPagos(){const now=new Date();const up=S.pagosAgendados.filter(p=>!p.pagado&&new Date(p.fecha)>=now).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));const row=(p,bt)=>{const d=new Date(p.fecha);const dias=Math.ceil((d-now)/86400000);return`<div class="prow"><div class="mono" style="font-size:10px;color:var(--t3);min-width:48px">${d.getDate()}/${d.getMonth()+1}</div><div style="flex:1"><div style="font-size:13px;font-weight:600">${he(p.desc)}</div><div class="tm">En ${dias} días</div></div><div class="mono" style="color:var(--a2);font-weight:600">${f(p.monto)}</div>${bt?`<button class="btn bp bsm" onclick="marcarPagado(${p.id})">✓</button><button class="btn bd bsm" onclick="delPago(${p.id})">×</button>`:''}</div>`;};setHtml('pa-lst',up.length?up.map(p=>row(p,true)).join(''):'<div class="emp">Sin pagos agendados</div>');setHtml('d-prox',up.length?up.slice(0,4).map(p=>row(p,false)).join(''):'<div class="emp">Sin pagos próximos</div>');}
function marcarPagado(id){const p=S.pagosAgendados.find(x=>x.id===id);if(p){p.pagado=true;}save();renderAll();} function delPago(id){S.pagosAgendados=S.pagosAgendados.filter(x=>x.id!==id);save();renderPagos();renderCal();}
function renderCal(){/* Visual placeholder */}

const BANCOS_CO = [
  { id: 'nequi', nombre: 'Nequi', icono: '📱', color: '#b44eff' },
  { id: 'daviplata', nombre: 'Daviplata', icono: '🔴', color: '#ff4444' },
  { id: 'nu', nombre: 'Nubank', icono: '💜', color: '#820ad1' },
  { id: 'lulo', nombre: 'Lulo Bank', icono: '🍋', color: '#ccff00' },
  { id: 'bancolombia', nombre: 'Bancolombia', icono: '🟡', color: '#ffd60a' },
  { id: 'davivienda', nombre: 'Davivienda', icono: '🔴', color: '#ff4444' },
  { id: 'bogota', nombre: 'Banco de Bogotá', icono: '🏛️', color: '#002855' },
  { id: 'avvillas', nombre: 'AV Villas', icono: '🏙️', color: '#00478F' },
  { id: 'cajasocial', nombre: 'Caja Social', icono: '🦉', color: '#003B7A' },
  { id: 'bbva', nombre: 'BBVA', icono: '🔵', color: '#072146' },
  { id: 'colpatria', nombre: 'Colpatria', icono: '🔴', color: '#df0024' },
  { id: 'popular', nombre: 'Banco Popular', icono: '🟢', color: '#00A859' },
  { id: 'occidente', nombre: 'Banco de Occidente', icono: '🔵', color: '#0062A5' },
  { id: 'confiar', nombre: 'Confiar Coop.', icono: '🤝', color: '#e30421' },
  { id: 'jfk', nombre: 'JFK Cooperativa', icono: '🤝', color: '#f39200' },
  { id: 'cotrafa', nombre: 'Cotrafa', icono: '🤝', color: '#0061a9' },
  { id: 'otro', nombre: 'Otro banco', icono: '🏦', color: '#888888' }
];
function totalCuentas(){return S.cuentas.reduce((s,c)=>s+c.saldo,0);}
function guardarCuenta(){const banco=document.getElementById('cu-banco').value;const alias=document.getElementById('cu-alias').value.trim();const saldo=+document.getElementById('cu-saldo').value||0;if(!banco)return;const info=BANCOS_CO.find(b=>b.id===banco)||{id:banco,nombre:alias||banco,icono:'🏦',color:'#888'};S.cuentas.push({id:Date.now(),banco,nombre:alias||info.nombre,icono:info.icono,color:info.color,saldo});S.saldos.banco=totalCuentas();closeM('m-cuenta');save();renderAll();}
function delCuenta(id){S.cuentas=S.cuentas.filter(x=>x.id!==id);S.saldos.banco=totalCuentas();save();renderAll();}
function renderCuentas() {
  const el=document.getElementById('cu-lst');
  if(!el)return;
  if(!S.cuentas.length){
    el.innerHTML='<div class="tm" style="padding:8px 0">Sin cuentas. Agrega tus bancos o entidades.</div>';
  } else {
    el.innerHTML=S.cuentas.map(c=>`<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r1);margin-bottom:6px"><span style="font-size:18px">${c.icono}</span><div style="flex:1"><div>${he(c.nombre)}</div><div class="mono" style="color:${c.color||'var(--a1)'}">${f(c.saldo)}</div></div><button class="btn bg bsm" onclick="editSaldoCuenta(${c.id})" title="Editar">✏️</button><button class="btn bd bsm" onclick="delCuenta(${c.id})">×</button></div>`).join('');
  }
  
  // ¡Magia! Cada vez que creas o borras una cuenta, actualiza todos los formularios de gastos
  actualizarListasFondos();
}
// ─── PINTAR CUENTAS EN EL DASHBOARD (DISEÑO PREMIUM) ───
function renderDashCuentas() {
  const el = document.getElementById('d-cuentas');
  if (!el) return;
  
  if (!S.cuentas || S.cuentas.length === 0) {
    el.innerHTML = '<div class="tm" style="padding:10px 0;">Agrega tus cuentas en la sección Quincena.</div>';
    return;
  }
  
  const total = totalCuentas();
  
  // Dibujamos cada cuenta con su barra de porcentaje
  let html = S.cuentas.map(c => {
    // Calculamos qué porcentaje representa esta cuenta del total que tienes
    const pct = total > 0 ? (c.saldo / total * 100).toFixed(1) : 0;
    
    return `
    <div style="margin-bottom: 14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--t2);">
          <span style="font-size:16px;">${c.icono}</span>
          <span>${he(c.nombre)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="mono" style="color:var(--a1); font-weight:600; font-size:13px;">${f(c.saldo)}</span>
          <button class="btn bg bsm" onclick="editSaldoCuentaDash(${c.id})" style="padding:3px 8px; border-radius:6px; font-size:11px;" title="Editar saldo">✏️</button>
        </div>
      </div>
      <div class="pw" style="height:4px; margin-top:0; background:var(--s3); border-radius:4px;">
        <div class="pf" style="width:${pct}%; background:${c.color || 'var(--a1)'}; border-radius:4px;"></div>
      </div>
    </div>`;
  }).join('');
  
  // Dibujamos el totalizador en la parte de abajo
  html += `
    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--b1); padding-top:14px; margin-top:8px;">
      <span style="font-size:11px; font-weight:800; color:var(--t3); text-transform:uppercase; letter-spacing:1px;">Total Cuentas</span>
      <span class="mono" style="font-size:14px; font-weight:700; color:var(--a4);">${f(total)}</span>
    </div>`;
    
  el.innerHTML = html;
}
async function editSaldoCuentaDash(id) { const c = S.cuentas.find(x => x.id === id); if (!c) return; const val = await showPrompt(`Saldo actual: ${f(c.saldo)}\n\nIngresa el nuevo saldo:`, `Editar ${c.nombre}`, c.saldo); if (!val) return; c.saldo = Math.max(0, +val || 0); S.saldos.banco = totalCuentas(); save(); renderDashCuentas(); updSaldo(); updateDash(); }
async function editSaldoCuenta(id) { const c = S.cuentas.find(x => x.id === id); if (!c) return; const val = await showPrompt(`Saldo actual: ${f(c.saldo)}\n\nIngresa el nuevo saldo:`, `Editar ${c.nombre}`, c.saldo); if (!val) return; c.saldo = Math.max(0, +val || 0); S.saldos.banco = totalCuentas(); save(); renderAll(); }

function calcPrima(){const m=+document.getElementById('prm-mo').value||0;if(!m)return;setHtml('prm-res',`<div style="margin-top:14px;padding:14px;background:var(--s2);border-radius:var(--r2)"><div class="tm">Sugerencia (30/40/30)</div><div class="fb"><span>💳 Deudas</span><span class="mono">${f(m*0.3)}</span></div><div class="fb"><span>🛡️ Ahorro</span><span class="mono">${f(m*0.4)}</span></div><div class="fb"><span>🎉 Gustos</span><span class="mono">${f(m*0.3)}</span></div></div>`);}
function guardarPrima(){const m=+document.getElementById('prm-mo').value||0;if(!m)return;S.ingreso+=m;S.gastos.unshift({id:Date.now(),desc:'🎉 Prima/Bono',monto:m,montoTotal:m,cat:'otro',tipo:'ahorro',fondo:'banco',hormiga:false,cuatroXMil:false,fecha:hoy(),metaId:'',autoFijo:false});refF('banco',m);closeM('m-prima');save();renderAll();}

// ─── 9. DASHBOARD Y DIAN ───
function updateDash() {
  const tG=S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0); 
  const tA=S.gastos.filter(g=>g.tipo==='ahorro').reduce((s,g)=>s+g.monto,0); 
  const tH=S.gastos.filter(g=>g.hormiga).reduce((s,g)=>s+g.monto,0);
  
  setEl('d-ing',f(S.ingreso));
  setEl('d-gas',f(tG));
  setEl('d-pgc',`${S.ingreso>0?Math.round(tG/S.ingreso*100):0}% del ingreso`);
  setEl('d-aho',f(tA));
  setEl('d-hor',f(tH));
  // El porcentaje hormiga arreglado
  setEl('d-phc',`${S.ingreso>0?Math.round(tH/S.ingreso*100):0}% del ingreso`);
  
  updSaldo();
  
  if(S.ingreso>0){
    const p=getPct();
    const bar=(l,g,b,col)=>{const u=b>0?Math.min(g/b*100,100):0;const ov=g>b;return`<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px"><span style="font-weight:600">${l}</span><span class="mono" style="color:${ov?'var(--dan)':'var(--t3)'}">${f(g)} / ${f(b)}</span></div><div class="pw"><div class="pf" style="width:${u}%;background:${ov?'var(--dan)':col}"></div></div></div>`;};
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
  
  // ==========================================
  // 💳 TABLA DE ÚLTIMOS MOVIMIENTOS PREMIUM
  // ==========================================
  const filasMovimientos = S.gastos.slice(0, 6).map(g => {
    let cIcono = '🏦', cNom = 'Banco';
    if (g.fondo === 'efectivo') { cIcono = '💵'; cNom = 'Efectivo'; }
    else if (g.fondo.startsWith('cuenta_')) {
      const c = S.cuentas.find(x => x.id === +g.fondo.split('_')[1]);
      if (c) { cIcono = c.icono; cNom = c.nombre; }
    }
    const colorMonto = g.tipo === 'ahorro' ? 'var(--a1)' : 'var(--a3)';
    const colorPill = g.tipo === 'necesidad' ? 'pb' : (g.tipo === 'ahorro' ? 'pg' : 'py');
    const nomCat = CATS[g.cat] || '📦 Otro';
    return `<tr>
      <td class="mono" style="font-size:10px">${g.fecha}</td>
      <td>
        <div style="font-weight:600">${he(g.desc)}</div>
        <div style="font-size:10px; color:var(--t3); margin-top:2px;">${nomCat}</div>
      </td>
      <td><span class="pill ${colorPill}">${g.tipo}</span></td>
      <td><span class="pill pm" style="background:var(--s2); border:1px solid var(--b2); color:var(--t1)">${cIcono} ${he(cNom)}</span></td>
      <td class="ac mono" style="color:${colorMonto};font-weight:600">${f(g.montoTotal||g.monto)}</td>
    </tr>`;
  });
  setHtml('d-rec', S.gastos.length ? filasMovimientos.join('') : '<tr><td colspan="5" class="emp">Sin movimientos</td></tr>');
  
  // ==========================================
  // 🚨 ALERTAS DINÁMICAS DEL DASHBOARD 🚨
  // ==========================================
  const al=[];
  
  // 1. ALERTA DIAN
  const anioActual = new Date().getFullYear().toString(); 
  let ingresosAnio = S.ingreso; 
  S.historial.forEach(h => { if(h.periodo && h.periodo.includes(anioActual)) ingresosAnio += h.ingreso; });
  const topeDian = 65891000; 

  if(ingresosAnio >= topeDian) {
    al.push(`<div class="al ald"><span class="al-icon">🏛️</span><div><strong>Alerta DIAN (Declaración de Renta):</strong> Tus ingresos este año suman <strong>${f(ingresosAnio)}</strong>. Has superado el tope legal aproximado (${f(topeDian)}). Contacta a un contador público.</div></div>`);
  } else if(ingresosAnio >= 50000000) { 
    al.push(`<div class="al alw"><span class="al-icon">🏛️</span><div><strong>Aviso DIAN:</strong> Llevas <strong>${f(ingresosAnio)}</strong> este año. Estás próximo a superar el tope legal para declarar renta (aprox. ${f(topeDian)}). Ve reuniendo tus soportes.</div></div>`);
  }

  // 2. ALERTA DE SALDOS EN CERO
  if(S.saldos.efectivo===0 && S.saldos.banco===0 && S.ingreso>0) {
    al.push(`<div class="al alb"><span class="al-icon">💡</span><div>Saldos en $0. Ve a <strong>Quincena</strong> y configura cuánto tienes en efectivo y banco.</div></div>`);
  }
  
  // 3. ALERTA DE GASTO EXCESIVO
  if(tG > S.ingreso * 0.9 && S.ingreso > 0) {
    al.push(`<div class="al ald"><span class="al-icon">🚨</span><div>Gastas más del 90% de tu ingreso esta quincena. Revisa tus finanzas urgente.</div></div>`);
  }

  // 4. ALERTA HORMIGA (Con <div> para evitar que se separen por Flexbox)
  if(tH > S.ingreso * 0.15 && S.ingreso > 0) {
    const pctHormiga = Math.round((tH / S.ingreso) * 100);
    al.push(`<div class="al alw"><span class="al-icon">🐜</span><div>Tus gastos hormiga ya representan el <strong>${pctHormiga}%</strong> de tu ingreso (${f(tH)}). ¡Es una fuga de capital muy alta!</div></div>`);
  }

  // 5. ALERTA DE CERO AHORRO
  if(tA === 0 && S.gastos.length > 3) {
    al.push(`<div class="al alw"><span class="al-icon">💰</span><div>No has registrado ningún ahorro esta quincena. ¡Págate a ti primero!</div></div>`);
  }

  // 6. ALERTA SOBREENDEUDAMIENTO
  const sq = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + d.cuota, 0);
  const sm = S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0);
  let cPer = 0;
  if (S.tipoPeriodo === 'mensual') cPer = (sq * 2) + sm;
  else if (S.tipoPeriodo === 'q1' || S.quincena === 1) cPer = sq + sm;
  else cPer = sq;

  if(cPer > S.ingreso * 0.3 && S.ingreso > 0) {
    al.push(`<div class="al ald"><span class="al-icon">💳</span><div>Las cuotas de tus deudas (${f(cPer)}) superan el 30% de tu ingreso. Estás en zona de riesgo financiero.</div></div>`);
  }

  // 7. ALERTA GASTOS FIJOS
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
  const cPer = (S.tipoPeriodo === 'mensual') ? (sq * 2) + sm : (S.tipoPeriodo === 'q1' || S.quincena === 1 ? sq + sm : sq);
  const pctDeuda = S.ingreso > 0 ? (cPer / S.ingreso) : 0;
  const ptsDeuda = pctDeuda <= 0.30 ? 30 : Math.max(0, 30 - ((pctDeuda - 0.30) * 100));
  const statsFondo = calcularFondoEmergencia();
  const ptsFondo = Math.min(((parseFloat(statsFondo.porcentajeCompletado) || 0) / 100) * 30, 30);

  const totalScore = Math.round(ptsAhorro + ptsDeuda + ptsFondo);
  elScore.textContent = totalScore;
  
  // Asignación de colores y frases sutiles
  let colorClass = ''; let frase = '';
  if (totalScore >= 80) { colorClass = 'fs-excellent'; frase = 'Excelente — finanzas muy saludables'; }
  else if (totalScore >= 60) { colorClass = 'fs-acceptable'; frase = 'Buen camino — hay margen de mejora'; }
  else if (totalScore >= 40) { colorClass = 'fs-bad'; frase = 'Alerta — necesitas ajustes pronto'; }
  else { colorClass = 'fs-very-bad'; frase = 'Crítico — alto riesgo financiero'; }

  elScore.className = `fin-score ${colorClass}`;
  elLabel.textContent = frase;
  elLabel.style.color = 'var(--t3)';
  elLabel.style.textTransform = 'none';
  elLabel.style.fontWeight = '500';
  elLabel.style.fontSize = '12px';
  
  // Construcción de la Checklist Inteligente
  let checklist = [];
  
  // 1. Gastos
  if (S.ingreso > 0 && tG > S.ingreso * 0.9) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">❌</span><span style="color:var(--t3); font-size:13px;">Gastos exceden el 90%</span></div>`);
  else checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--a1); font-size:13px;">✅</span><span style="color:var(--a1); font-size:13px;">Gastos bajo control</span></div>`);
  
  // 2. Ahorro
  if (tA > 0) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--a1); font-size:13px;">✅</span><span style="color:var(--a1); font-size:13px;">Ahorro constante</span></div>`);
  else checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">❌</span><span style="color:var(--t3); font-size:13px;">Sin ahorro registrado</span></div>`);
  
  // 3. Hormiga
  if (S.ingreso > 0 && tH > S.ingreso * 0.15) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">❌</span><span style="color:var(--t3); font-size:13px;">Fuga hormiga alta</span></div>`);
  else checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--a1); font-size:13px;">✅</span><span style="color:var(--a1); font-size:13px;">Hormiga controlada</span></div>`);
  
  // 4. Deudas
  if (cPer > 0) {
    if (cPer > S.ingreso * 0.3) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">💳</span><span style="color:var(--t3); font-size:13px;">Deudas >30% del ingreso</span></div>`);
    else checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="color:var(--a1); font-size:13px;">✅</span><span style="color:var(--a1); font-size:13px;">Deudas bajo control</span></div>`);
  }
  
  // 5. Metas
  if (S.objetivos && S.objetivos.length > 0) checklist.push(`<div style="margin-bottom:12px; display:flex; align-items:center; gap:8px;"><span style="font-size:13px;">🎯</span><span style="color:var(--a1); font-size:13px;">Metas de ahorro activas</span></div>`);
  
  elMsg.className = 'score-checklist';
  elMsg.innerHTML = checklist.join('');
}

function renderTips(){document.getElementById('tip-lst').innerHTML='<div class="tip"><strong>💡 Págate a ti primero:</strong> Apenas recibas tu quincena, transfiere el porcentaje de ahorro antes de gastar en otra cosa.</div>';}

// ─── 10. CALCULADORAS (BLINDADAS) ───
// Si un elemento de HTML no existe, el ? evita que se crashee.
function toggleCalc(id){const body=document.getElementById(id+'-body');body.classList.toggle('open');body.classList.toggle('closed');if(id==='cdt')cCDT();if(id==='cre')cCre();if(id==='ic')cIC();if(id==='pila')cPila();}
function cCDT(){const c=+document.getElementById('cc-cap')?.value||0;const t=+document.getElementById('cc-tas')?.value/100||0;const d=+document.getElementById('cc-dia')?.value||0;const rend=c*(Math.pow(1+t,d/365)-1);const ck=document.getElementById('cc-ret')?.checked;const net=ck?rend*0.93:rend;setHtml('cdt-res',`<div class="crv">${f(net)} ganancia neta</div>`);}
function cCre(){const p=+document.getElementById('cr-mo')?.value||0;const tm=+document.getElementById('cr-ta')?.value/100||0;const n=+document.getElementById('cr-n')?.value||0;const cu=tm===0?p/n:(p*(tm*Math.pow(1+tm,n))/(Math.pow(1+tm,n)-1));setHtml('cre-res',`<div class="crv">${f(cu)} cuota mensual</div>`);}
function cIC(){const c=+document.getElementById('ic-cap')?.value||0;const a=+document.getElementById('ic-apo')?.value||0;const ta=+document.getElementById('ic-tas')?.value/100||0;const m=+document.getElementById('ic-mes')?.value||0;const tm=Math.pow(1+ta,1/12)-1;const vf=tm>0?c*Math.pow(1+tm,m)+a*(Math.pow(1+tm,m)-1)/tm:c+a*m;setHtml('ic-res',`<div class="crv">${f(vf)} valor final</div>`);}
function cMeta(){const e=document.getElementById('ma-tot');if(!e)return;const M=+e.value||0;const T=+document.getElementById('ma-ten')?.value||0;const fe=document.getElementById('ma-fe')?.value;const falta=Math.max(0,M-T);const dias=Math.max(0,Math.ceil((new Date(fe)-new Date())/86400000));const q=Math.max(1,Math.floor(dias/15));setHtml('ma-res',`<div class="crv">${f(falta/q)} por quincena</div>`);}
function cPila(){const ing=+document.getElementById('pl-ing')?.value||0;const arl=+document.getElementById('pl-arl')?.value||0.00522;const ibc=Math.max(ing*0.4, 1300000);const tot=ibc*(0.125+0.16+arl);setHtml('pila-res',`<div class="crv">${f(tot)} a pagar (PILA)</div>`);}

// ─── 11. EXPORTACIÓN ───
function exportarDatos(){const data=JSON.stringify(S,null,2);const blob=new Blob([data],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`finko_${hoy()}.json`;a.click();URL.revokeObjectURL(url);}
function importarDatos(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=function(ev){Object.assign(S,JSON.parse(ev.target.result));save();renderAll();go('dash');};r.readAsText(f);}
function exportarCSV(){/* Lógica Excel genérica */}
function descargarCSVDirecto(){/* Lógica Excel puro */}

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
  
  // 🧠 MEJORA: Calculamos cuánto falta para llegar a la meta
  const faltaPorAhorrar = Math.max(0, montoObjetivoTotal - dineroActual);
  
  const porcentajeCompletado = montoObjetivoTotal > 0 ? (dineroActual / montoObjetivoTotal) * 100 : 0;
  const mesesCubiertos = gFijo > 0 ? dineroActual / gFijo : 0;
  
  return { 
    gastoMensualFijo: gFijo, 
    montoObjetivoTotal, 
    actual: dineroActual, 
    faltaPorAhorrar, // Pasamos el nuevo dato
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
  // 🧠 MEJORA: Ahora pintamos lo que FALTA en vez de la meta total estática
  setEl('fe-dinero-objetivo', f(stats.faltaPorAhorrar));
}

// ─── ABONO AL FONDO DE EMERGENCIA CON CONTABILIDAD ESTRICTA ───
function registrarAbonoFondo() {
  const inputAbono = document.getElementById('fe-monto-abono');
  const monto = +(inputAbono?.value || 0);
  const fondoOrigen = document.getElementById('fe-fo')?.value; // Saber de qué banco sale
  
  if(monto <= 0) { showAlert('Ingresa un monto válido.', 'Inválido'); return; }
  
  // Descontar el dinero del banco seleccionado
  if(fondoOrigen) desF(fondoOrigen, monto);
  
  // Registrarlo como un gasto tipo Ahorro para que cuadre todo
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
function sr(msg){console.log('SR:', msg);}
function f(n){return'$'+Math.round(n||0).toLocaleString('es-CO');}
function hoy(){return new Date().toISOString().split('T')[0];}
function mesStr(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;}
function he(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function setHtml(id,v){const e=document.getElementById(id);if(e)e.innerHTML=v;}
function setEl(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}

let _cdlgRes=null,_cdlgPMode=false,_cdlgExp=null;
window._cdlgRes=function(ok){document.getElementById('cdlg-ov').classList.remove('open');if(_cdlgPMode){const v=document.getElementById('cdlg-input').value;if(_cdlgExp&&ok&&v!==_cdlgExp){if(_cdlgRes)_cdlgRes(false);return;}if(_cdlgRes)_cdlgRes(ok?v:null);}else{if(_cdlgRes)_cdlgRes(ok);}_cdlgRes=null;};
function showConfirm(msg,title='Confirmar'){return new Promise(r=>{_cdlgRes=r;_cdlgPMode=false;setEl('cdlg-title',title);setEl('cdlg-msg',msg);document.getElementById('cdlg-input-wrap').style.display='none';document.getElementById('cdlg-ov').classList.add('open');});}
function showAlert(msg,title='Aviso'){return new Promise(r=>{_cdlgRes=r;_cdlgPMode=false;setEl('cdlg-title',title);setEl('cdlg-msg',msg);document.getElementById('cdlg-input-wrap').style.display='none';document.getElementById('cdlg-cancel').style.display='none';document.getElementById('cdlg-ov').classList.add('open');});}
function showPromptConfirm(msg,exp,title='Peligro'){return new Promise(r=>{_cdlgRes=r;_cdlgPMode=true;_cdlgExp=exp;setEl('cdlg-title',title);setEl('cdlg-msg',msg);document.getElementById('cdlg-input-wrap').style.display='block';document.getElementById('cdlg-ov').classList.add('open');});}
function showPrompt(msg, title='Editar', valorInicial='') { return new Promise(r => { _cdlgRes = r; _cdlgPMode = true; _cdlgExp = null; setEl('cdlg-title', title); setEl('cdlg-msg', msg); const inp = document.getElementById('cdlg-input'); inp.value = valorInicial; inp.placeholder = ''; document.getElementById('cdlg-input-wrap').style.display = 'block'; document.getElementById('cdlg-ov').classList.add('open'); setTimeout(() => inp.focus(), 80); }); }

function toggleSidebar(){const sb=document.getElementById('sidebar');const ex=sb.classList.toggle('expanded');document.body.classList.toggle('sb-expanded',ex);localStorage.setItem('sb_expanded',ex);}

// ─── SINCRONIZADOR DE FONDOS ESTRICTO ───
function actualizarListasFondos() {
  // Estos son los IDs de todos los selectores de "Fondo de pago" en tu HTML
  const selectores = ['g-fo', 'gf-fo', 'oa-fo', 'ag-fo', 'inv-fo', 'prm-fo', 'fe-fo'];
  
  selectores.forEach(id => {
    const sel = document.getElementById(id);
    if(!sel) return;
    
    const valorActual = sel.value;
    let opciones = '<option value="efectivo">💵 Efectivo</option>';
    
    // Si el usuario tiene cuentas reales creadas (Nequi, Nu), las mostramos.
    if(S.cuentas && S.cuentas.length > 0) {
      opciones += S.cuentas.map(c => `<option value="cuenta_${c.id}">${c.icono} ${he(c.nombre)}</option>`).join('');
    } else {
      // Si no ha creado cuentas, mostramos el banco genérico
      opciones += '<option value="banco">🏦 Banco (General)</option>';
    }
    
    // Excepción para Inversiones (que tiene una opción extra)
    if(id === 'inv-fo') {
      opciones = '<option value="">No descontar (solo registrar)</option>' + opciones;
    }
    
    sel.innerHTML = opciones;
    
    // Intentamos dejar seleccionado lo que el usuario ya tenía marcado
    if(valorActual && sel.querySelector(`option[value="${valorActual}"]`)) {
      sel.value = valorActual;
    }
  });
}

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
    
    // Inyectar HTML Donut moderno con Texto Central
    setHtml('stat-pie-container', `
      <div class="pie-wrapper">
        <div class="pie-chart" style="background:${gradient};"></div>
        <div class="pie-center-text">
           <span style="font-size:9px; font-weight:700; color:var(--t3); letter-spacing:0.5px;">TOTAL GASTOS</span>
           <span style="font-family:var(--fm); font-size:14px; font-weight:800; color:var(--t1); margin-top:2px;">${f(tG)}</span>
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

// =========================================================
// 14. EXPOSICIÓN GLOBAL A WINDOW (HTML)
// =========================================================
window.go=go; window.setPer=setPer; window.toggleSidebar=toggleSidebar; window.openM=openM; window.closeM=closeM;
window.guardarQ=guardarQ; window.resetTodo=resetTodo; window.resetQuincena=resetQuincena; window.onMetCh=onMetCh; window.selM=selM; window.calcDist=calcDist;
window.agregarGasto=agregarGasto; window.delGasto=delGasto; window.abrirEditarGasto=abrirEditarGasto; window.guardarEditarGasto=guardarEditarGasto; window.limpiarGastos=limpiarGastos; window.prev4k=prev4k; window.actualizarSemaforo=actualizarSemaforo; window.calcularImpactoHormiga=calcularImpactoHormiga; window.renderGastos=renderGastos;
window.guardarFijo=guardarFijo; window.abrirModalFijo=abrirModalFijo; window.cerrarModalFijo=cerrarModalFijo; window.ejecutarPagoFijo=ejecutarPagoFijo; window.delFijo=delFijo; window.desmFijo=desmFijo;
window.setModoDeuda=setModoDeuda; window.guardarDeuda=guardarDeuda; window.abrirPagarCuota=abrirPagarCuota; window.confPagarCuota=confPagarCuota; window.delDeu=delDeu;
window.guardarPago=guardarPago; window.marcarPagado=marcarPagado; window.delPago=delPago;
window.toggleTipoObjetivo=toggleTipoObjetivo; window.openNuevoObjetivo=openNuevoObjetivo; window.guardarObjetivo=guardarObjetivo; window.abrirAccionObj=abrirAccionObj; window.ejecutarAccionObjetivo=ejecutarAccionObjetivo; window.delObjetivo=delObjetivo;
window.toggleCalc=toggleCalc; window.cCDT=cCDT; window.cCre=cCre; window.cIC=cIC; window.cMeta=cMeta; window.cPila=cPila;
window.exportarDatos=exportarDatos; window.importarDatos=importarDatos; window.cerrarQ=cerrarQ; window.guardarInversion=guardarInversion; window.openRendimiento=openRendimiento; window.guardarRendimiento=guardarRendimiento; window.delInversion=delInversion; window.calcPrima=calcPrima; window.guardarPrima=guardarPrima; window.guardarCuenta=guardarCuenta; window.delCuenta=delCuenta; window.editSaldoCuenta=editSaldoCuenta; window.editSaldoCuentaDash=editSaldoCuentaDash; window.exportarCSV=exportarCSV; window.descargarCSVDirecto=descargarCSVDirecto;
window.calcularFondoEmergencia=calcularFondoEmergencia; window.actualizarVistaFondo=actualizarVistaFondo; window.registrarAbonoFondo=registrarAbonoFondo; window.actualizarListasFondos=actualizarListasFondos; window.renderCuentas=renderCuentas; window.renderDashCuentas=renderDashCuentas; window.renderStats=renderStats;