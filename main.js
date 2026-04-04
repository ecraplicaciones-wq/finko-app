import { S } from './state.js';
import { loadData, save } from './storage.js';
import './ui.js';
import './theme.js';

const CATS={alimentacion:'🍽️ Alimentación',transporte:'🚌 Transporte',vivienda:'🏠 Vivienda',servicios:'💡 Servicios',salud:'🏥 Salud',entretenimiento:'🎬 Entretenimiento',ropa:'👕 Ropa',tecnologia:'💻 Tecnología',hormiga:'🐜 Hormiga',deudas:'💳 Deudas',ahorro:'💰 Ahorro',otro:'📦 Otro'};
const PCATS={comida:'🍽️ Comida',hotel:'🏨 Hotel',transporte:'🚌 Transporte',fiesta:'🎉 Fiesta',compras:'🛍️ Compras',entradas:'🎟️ Entradas',otro:'📦 Otro'};
const CCOLORS={alimentacion:'#00dc82',transporte:'#3b9eff',vivienda:'#b44eff',servicios:'#ffd60a',salud:'#ff6b35',entretenimiento:'#ff4eb8',ropa:'#00e5cc',tecnologia:'#4eb8ff',hormiga:'#ff9944',deudas:'#ff4444',ahorro:'#00dc82',otro:'#666'};
const NAVS=['dash','quin','gast','fijo','meta','deu','proy','agen','calc','stat','hist','cons'];

// --- NUEVO SISTEMA DE PAGO DE GASTOS FIJOS ---
let idFijoPendiente = null;

function abrirModalFijo(id) {
  const fx = S.gastosFijos.find(x => x.id == id);
  if (!fx) return;
  
  idFijoPendiente = id;
  document.getElementById('mf-nombre').innerText = fx.nombre;
  const montoMostrar = fx.cuatroXMil ? (fx.montoTotal || Math.round(fx.monto*1.004)) : fx.monto;
  document.getElementById('mf-monto').innerText = f(montoMostrar);
  
  document.getElementById('modal-pagar-fijo').classList.add('open');
}

function cerrarModalFijo() {
  document.getElementById('modal-pagar-fijo').classList.remove('open');
  idFijoPendiente = null;
}

async function ejecutarPagoFijo(fondoElegido) {
  const fx = S.gastosFijos.find(x => x.id == idFijoPendiente);
  if (!fx) return;

  const montoFinal = fx.cuatroXMil ? (fx.montoTotal || Math.round(fx.monto*1.004)) : fx.monto;

  // 1. Verificar si hay saldo suficiente
  const disp = fondoElegido === 'efectivo' ? S.saldos.efectivo : S.saldos.banco;
  if (disp < montoFinal) {
    const ok = await showConfirm(`⚠️ Saldo insuficiente en ${fondoElegido === 'efectivo' ? 'Efectivo' : 'Banco'} (${f(disp)} disponible).\n\n¿Continuar el pago de todas formas?`, 'Saldo insuficiente');
    if (!ok) return;
  }

  // 2. Registrar el gasto automáticamente en el historial
  const mes = mesStr();
  S.gastos.unshift({
    id: Date.now(),
    desc: `📌 Fijo: ${fx.nombre}`,
    monto: fx.monto,
    montoTotal: montoFinal,
    cat: fx.cat || 'vivienda',
    tipo: fx.tipo || 'necesidad',
    fondo: fondoElegido,
    hormiga: false,
    cuatroXMil: fx.cuatroXMil || false,
    fecha: hoy(),
    autoFijo: true,
    fijoRef: fx.id
  });

  // 3. Descontar el dinero del saldo y registrar el mes como pagado
  desF(fondoElegido, montoFinal);
  if (!fx.pagadoEn) fx.pagadoEn = [];
  fx.pagadoEn.push(mes);
  
  // 4. Cerrar modal y guardar cambios
  cerrarModalFijo();
  save();
  renderFijos();
  renderGastos();
  updateDash();
  sr(`Gasto fijo pagado desde ${fondoElegido === 'efectivo' ? 'Efectivo' : 'Banco'}`);
}

// Esta es la función correcta que busca tu botón HTML
function marcarFijo(id) {
  abrirModalFijo(id);
}

// ── ARRANQUE SEGURO DE LA APP ──
function initApp() {
  if(localStorage.getItem('sb_expanded') === 'true') {
    document.getElementById('sidebar')?.classList.add('expanded');
    document.body.classList.add('sb-expanded');
  }
  
  if(localStorage.getItem('fco_theme') === 'light'){
    document.body.classList.add('light-theme');
    const b = document.getElementById('btn-theme');
    if(b){ const ni = b.querySelector('.ni'); if(ni) ni.textContent='🌙'; }
  }
  
  // Ejecutamos todas tus funciones de inicio
  loadData();
  updateBadge(); // Aquí pintamos el calendario
  populateSelectMetas();
  renderAll();
  renderTips();
  calcScore();
  cCDT(); cCre(); cIC(); cMeta(); cRet(); cGMF();
  
  const hoy = new Date();
  ['g-fe','pg-fe','ag-fe'].forEach(i => { const e=document.getElementById(i); if(e) e.valueAsDate=hoy; });
  
  const mf = new Date(); mf.setMonth(mf.getMonth()+3);
  const mafe = document.getElementById('ma-fe'); if(mafe) mafe.valueAsDate = mf;
  
  if(S.ingreso > 0){ const e = document.getElementById('q-pri'); if(e) e.value = S.ingreso; }
  updSaldo();
  
  setTimeout(() => {
    const nav = document.querySelector('nav');
    if(nav) {
      nav.scrollTo({ left: 30, behavior: 'smooth' });
      setTimeout(() => nav.scrollTo({ left: 0, behavior: 'smooth' }), 500);
    }
  }, 1000);
}

// Verifica si el HTML ya cargó antes de ejecutar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function updateBadge(){
  const n = new Date();
  const txt = `${n.getDate()<=15?'1ra':'2da'} quincena · ${n.toLocaleString('es-CO',{month:'short'})} ${n.getFullYear()}`;
  const el = document.getElementById('hbadge');
  if(el) el.textContent = txt;
}

function renderAll(){renderGastos();updateDash();renderMetas();renderDeudas();renderFijos();renderProyectos();renderPagos();renderHistorial();updSaldo();renderStats();renderCuentas();renderDashCuentas();}

function go(id){
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar')?.classList.remove('open');
    const overlay = document.getElementById('sb-overlay');
    if (overlay) overlay.style.display = 'none';
  }
  NAVS.forEach(n=>{const s=document.getElementById('sec-'+n);if(s)s.classList.toggle('active',n===id);});
  document.querySelectorAll('.nb').forEach((b,i)=>{b.classList.toggle('active',NAVS[i]===id);});
  if(id==='cons')calcScore();
  if(id==='agen')renderCal();
  if(id==='stat')renderStats();
  if(id==='gast'){updSaldo();populateSelectMetas();}
}

function setPer(tipo, el) {
  S.tipoPeriodo = tipo; 
  document.querySelectorAll('.qtab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  el.classList.add('active');
  el.setAttribute('aria-selected', 'true');
  renderDeudas(); 
  updateDash();
}

function onMetCh(){document.getElementById('cus-pct').style.display=document.getElementById('q-met').value==='custom'?'block':'none';calcDist();}
function selM(el,m){document.querySelectorAll('.mcd').forEach(c=>{c.classList.remove('sel');});el.classList.add('sel');document.getElementById('q-met').value=m;onMetCh();}
function getPct(){
  const m=document.getElementById('q-met').value;
  const MAP={
    '50-30-20': {n:50, d:30, a:20},
    '50-20-30': {n:50, d:20, a:30},
    '70-20-10': {n:70, d:20, a:10},
    '60-30-10': {n:60, d:30, a:10}
  };
  if(MAP[m]) return MAP[m];
  return {
    n: +document.getElementById('pn').value || 50,
    d: +document.getElementById('pd').value || 30,
    a: +document.getElementById('pa').value || 20
  };
}

function calcDist(){const t=(+document.getElementById('q-pri').value||0)+(+document.getElementById('q-ext').value||0);if(!t){document.getElementById('q-prev').innerHTML='<div class="emp">Ingresa tu salario para ver la distribución</div>';return;}const p=getPct();document.getElementById('q-prev').innerHTML=`<div style="margin-bottom:16px"><div style="font-family:var(--fm);font-weight:700;font-size:24px;color:var(--a1);letter-spacing:-1px">${f(t)}</div><div class="tm">ingreso total</div></div>${drBar('🏠 Necesidades',p.n,t*p.n/100,'var(--a4)')}${drBar('🎉 Deseos',p.d,t*p.d/100,'var(--a2)')}${drBar('💰 Ahorro',p.a,t*p.a/100,'var(--a1)')}`;}
function drBar(l,pct,m,col){return`<div class="dr"><div class="dl">${l}</div><div class="dbw"><div class="db" style="width:${pct}%;background:${col}"></div></div><div class="dp">${pct}%</div><div class="da">${f(m)}</div></div>`;}

async function guardarQ(){const p=+document.getElementById('q-pri').value||0;if(!p){await showAlert('Ingresa tu salario o ingreso principal primero.','Campo requerido');return;}S.ingreso=p+(+document.getElementById('q-ext').value||0);S.metodo=document.getElementById('q-met').value;calcDist();const efVal=document.getElementById('q-ef').value;const bkVal=document.getElementById('q-bk').value;if(efVal!=='')S.saldos.efectivo=Math.max(0,+efVal);if(bkVal!=='')S.saldos.banco=Math.max(0,+bkVal);if(efVal===''&&bkVal===''&&S.saldos.efectivo===0&&S.saldos.banco===0&&S.ingreso>0){S.saldos.banco=S.ingreso;sr('Saldo banco inicializado con tu ingreso. Ajústalo en Quincena si es diferente.');}document.getElementById('q-ef').value='';document.getElementById('q-bk').value='';save();renderAll();go('dash');sr('Quincena configurada: '+f(S.ingreso));}

async function resetTodo(){
  const ok=await showPromptConfirm('Esta acción eliminará TODOS tus datos:\n\n• Gastos e historial de quincenas\n• Metas de ahorro y deudas\n• Proyectos y ahorros\n• Gastos fijos y agenda\n• Todos los saldos\n\nEsta acción NO se puede deshacer.','BORRAR','🗑️ Borrar TODOS los datos');
  if(!ok)return;
  localStorage.removeItem('fco_v4');
  Object.keys(S).forEach(key => delete S[key]);
  Object.assign(S, {tipoPeriodo:'q1', quincena:1,ingreso:0,metodo:'50-30-20',saldos:{efectivo:0,banco:0},cuentas:[],gastos:[],metas:[],deudas:[],historial:[],gastosFijos:[],pagosAgendados:[],proyectos:[]});
  document.getElementById('q-pri').value='';
  document.getElementById('q-ext').value='';
  renderAll();go('dash');
  await showAlert('✅ Todos los datos han sido eliminados.\nLa app está lista para empezar de cero.','Listo');
}

async function resetQuincena(){
  const ok=await showConfirm('Esto elimina los gastos del período actual y reinicia el ingreso a cero.\n\nTus metas, deudas, proyectos e historial NO se verán afectados.','↺ Resetear período actual');
  if(!ok)return;
  S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>refF(g.fondo,g.montoTotal||g.monto));
  S.gastos=[];
  S.ingreso=0;
  document.getElementById('q-pri').value='';
  document.getElementById('q-ext').value='';
  save();
  renderAll();
  go('dash');
  sr('Período reseteado.');
}

function updSaldo(){const ef=S.saldos.efectivo,bk=S.saldos.banco,tot=ef+bk;['d-ef','g-ef','q-efc'].forEach(i=>{const e=document.getElementById(i);if(e)e.textContent=f(ef);});['d-bk','g-bk','q-bkc'].forEach(i=>{const e=document.getElementById(i);if(e)e.textContent=f(bk);});const te=document.getElementById('d-tot');if(te)te.textContent=f(tot);}
function desF(fo,mo){if(fo==='efectivo'){S.saldos.efectivo=Math.max(0,S.saldos.efectivo-mo);}else if(fo.startsWith('cuenta_')){const cId=+fo.split('_')[1];const c=S.cuentas.find(x=>x.id===cId);if(c)c.saldo=Math.max(0,c.saldo-mo);S.saldos.banco=totalCuentas();}else{S.saldos.banco=Math.max(0,S.saldos.banco-mo);}updSaldo();}
function refF(fo,mo){if(fo==='efectivo'){S.saldos.efectivo+=mo;}else if(fo.startsWith('cuenta_')){const cId=+fo.split('_')[1];const c=S.cuentas.find(x=>x.id===cId);if(c)c.saldo+=mo;S.saldos.banco=totalCuentas();}else{S.saldos.banco+=mo;}updSaldo();}
function prev4k(){const mo=+document.getElementById('g-mo').value||0;const ck=document.getElementById('g-4k').checked;const el=document.getElementById('p4k');if(ck&&mo>0){el.style.display='block';el.innerHTML=`4×1000: +${f(mo*0.004)} → Total debitado: <strong style="color:var(--a1)">${f(mo*1.004)}</strong>`;}else el.style.display='none';}
function populateSelectMetas(){const sel=document.getElementById('g-me');if(!sel)return;const prev=sel.value;sel.innerHTML='<option value="">— Sin meta —</option>';S.metas.forEach(m=>{const pct=Math.round(m.actual/m.objetivo*100);sel.innerHTML+=`<option value="${m.id}">${m.icono} ${he(m.nombre)} (${pct}%)</option>`;});if(prev&&S.metas.find(m=>m.id==prev))sel.value=prev;}

async function agregarGasto() {
  const de = document.getElementById('g-de').value.trim();
  const mo = +document.getElementById('g-mo').value;
  const ca = document.getElementById('g-ca').value;
  
  if (!de || !mo || !ca) {
    await showAlert('Completa la descripción, el monto y elige una categoría.', 'Campos requeridos');
    return;
  }
  
  const fx = document.getElementById('g-4k').checked;
  const montoTotal = fx ? Math.round(mo * 1.004) : mo;
  const fo = document.getElementById('g-fo').value;
  const ti = document.getElementById('g-ti').value;
  const meId = document.getElementById('g-me').value;
  
  if (ti !== 'ahorro') {
    const disp = fo === 'efectivo' ? S.saldos.efectivo : S.saldos.banco;
    if (disp < montoTotal) {
      const ok = await showConfirm(`⚠️ Saldo insuficiente en ${fo === 'efectivo' ? 'Efectivo' : 'Banco'} (${f(disp)} disponible).\n\nEl saldo se configura en la sección Quincena > Saldos actuales.\nEl ingreso configurado (${f(S.ingreso)}) no se suma automáticamente al saldo hasta que lo guardes.\n\n¿Continuar de todas formas?`, 'Saldo insuficiente');
      if (!ok) return;
    }
  }
  
  S.gastos.unshift({ id: Date.now(), desc: de, monto: mo, montoTotal, cat: ca, tipo: ti, fondo: fo, hormiga: document.getElementById('g-ho').value === 'si', cuatroXMil: fx, fecha: document.getElementById('g-fe').value || hoy(), metaId: meId, autoFijo: false });
  
  if (ti !== 'ahorro') desF(fo, montoTotal);
  if (meId && ti === 'ahorro') {
    const me = S.metas.find(x => x.id == meId);
    if (me) me.actual = Math.min(me.actual + mo, me.objetivo);
  }
  
  document.getElementById('g-de').value = '';
  document.getElementById('g-mo').value = '';
  document.getElementById('g-4k').checked = false;
  document.getElementById('p4k').style.display = 'none';
  document.getElementById('g-me').value = '';
  document.getElementById('g-ca').value = '';
  
  save();
  renderAll();
  populateSelectMetas();
  sr('Gasto registrado: ' + de + ' ' + f(montoTotal));
}

function renderGastos(){
  const tb = document.getElementById('g-tab');
  const q = (document.getElementById('g-search')?.value||'').toLowerCase().trim();
  
  let gastos = S.gastos;
  if (q) {
    gastos = gastos.filter(g =>
      (g.desc||'').toLowerCase().includes(q) ||
      (CATS[g.cat]||g.cat).toLowerCase().includes(q) ||
      (g.fecha||'').includes(q) ||
      (g.tipo||'').toLowerCase().includes(q)
    );
  }

  if (!gastos.length) {
    tb.innerHTML = q
      ? '<tr><td colspan="9" class="emp">Sin resultados para "' + q + '"</td></tr>'
      : '<tr><td colspan="9" class="emp">Sin gastos registrados este período</td></tr>';
    return;
  }

  tb.innerHTML = gastos.slice(0,80).map(g =>
    '<tr>' +
    '<td class="mono" style="font-size:10px">' + g.fecha + '</td>' +
    '<td>' + he(g.desc) + (g.autoFijo ? ' <span class="pill pm" style="font-size:9px">Fijo</span>' : '') + '</td>' +
    '<td style="font-size:10px">' + (CATS[g.cat]||g.cat) + '</td>' +
    '<td><span class="pill ' + (g.tipo==='necesidad'?'pb':g.tipo==='ahorro'?'pg':'py') + '">' + g.tipo + '</span></td>' +
    '<td><span class="pill ' + (g.fondo==='efectivo'?'py':'pb') + '">' + (g.fondo==='efectivo'?'💵':'🏦') + '</span></td>' +
    '<td>' + (g.hormiga?'🐜':'—') + '</td>' +
    '<td>' + (g.cuatroXMil?'<span class="pill pt">✓</span>':'—') + '</td>' +
    '<td class="ac mono" style="color:' + (g.tipo==='ahorro'?'var(--a1)':'var(--a3)') + ';font-weight:600">' + f(g.montoTotal||g.monto) + '</td>' +
    '<td style="display:flex;gap:4px"><button class="btn bg bsm" onclick="abrirEditarGasto(' + g.id + ')">✏️</button><button class="btn bd bsm" onclick="delGasto(' + g.id + ')">×</button></td>' +
    '</tr>'
  ).join('');
}

function delGasto(id){const g=S.gastos.find(x=>x.id===id);if(g&&g.tipo!=='ahorro')refF(g.fondo,g.montoTotal||g.monto);if(g&&g.autoFijo&&g.fijoRef){const mes=mesStr();const fijo=S.gastosFijos.find(x=>x.id===g.fijoRef);if(fijo)fijo.pagadoEn=fijo.pagadoEn.filter(m=>m!==mes);}S.gastos=S.gastos.filter(x=>x.id!==id);save();renderAll();}

function abrirEditarGasto(id) {
  const g = S.gastos.find(x => x.id === id);
  if (!g) return;
  document.getElementById('eg-id').value = id;
  document.getElementById('eg-de').value = g.desc;
  document.getElementById('eg-mo').value = g.monto;
  document.getElementById('eg-ca').value = g.cat;
  document.getElementById('eg-ti').value = g.tipo;
  document.getElementById('eg-fo').value = g.fondo.startsWith('cuenta_') ? 'banco' : g.fondo;
  document.getElementById('eg-ho').value = g.hormiga ? 'si' : 'no';
  document.getElementById('eg-fe').value = g.fecha;
  openM('m-edit-gasto');
}

async function guardarEditarGasto() {
  const id = +document.getElementById('eg-id').value;
  const g = S.gastos.find(x => x.id === id);
  if (!g) return;

  const nuevoMonto = +document.getElementById('eg-mo').value;
  const nuevoFondo = document.getElementById('eg-fo').value;

  if (!nuevoMonto) {
    await showAlert('El monto no puede ser cero.', 'Campo requerido');
    return;
  }

  if (g.tipo !== 'ahorro') refF(g.fondo, g.montoTotal || g.monto);

  g.desc = document.getElementById('eg-de').value.trim();
  g.monto = nuevoMonto;
  g.montoTotal = nuevoMonto;
  g.cat = document.getElementById('eg-ca').value;
  g.tipo = document.getElementById('eg-ti').value;
  g.fondo = nuevoFondo;
  g.hormiga = document.getElementById('eg-ho').value === 'si';
  g.fecha = document.getElementById('eg-fe').value;

  if (g.tipo !== 'ahorro') desF(nuevoFondo, nuevoMonto);

  closeM('m-edit-gasto');
  save();
  renderAll();
  sr('Gasto actualizado correctamente');
}

async function limpiarGastos(){const ok=await showConfirm('¿Eliminar todos los gastos del período actual?\n\nLos saldos se revertirán.','Limpiar gastos');if(!ok)return;S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>refF(g.fondo,g.montoTotal||g.monto));const mes=mesStr();S.gastosFijos.forEach(g=>{g.pagadoEn=g.pagadoEn.filter(m=>m!==mes);});S.gastos=[];save();renderAll();}

async function guardarFijo(){const no=document.getElementById('gf-no').value.trim();const mo=+document.getElementById('gf-mn').value;if(!no||!mo){await showAlert('Completa nombre y monto.','Campos requeridos');return;}const fx=document.getElementById('gf-4k').checked;const montoTotal=fx?Math.round(mo*1.004):mo;S.gastosFijos.push({id:Date.now(),nombre:no,monto:mo,montoTotal,cuatroXMil:fx,dia:+document.getElementById('gf-di').value||1,tipo:document.getElementById('gf-ti').value,cat:document.getElementById('gf-ca').value,fondo:document.getElementById('gf-fo').value,pagadoEn:[]});document.getElementById('gf-no').value='';document.getElementById('gf-mn').value='';document.getElementById('gf-4k').checked=false;closeM('m-fijo');save();renderFijos();updateDash();}

function renderFijos(){
  const mes = mesStr();
  S.gastosFijos.forEach(g => {
    if (!g.pagadoEn) g.pagadoEn = [];
    if (g.pagado) { 
      if (!g.pagadoEn.includes(mes)) g.pagadoEn.push(mes);
      delete g.pagado;
    }
  });

  const tot = S.gastosFijos.reduce((s,g) => s + (Number(g.monto) || 0), 0);
  const pag = S.gastosFijos.filter(g => g.pagadoEn.includes(mes));
  const totP = pag.reduce((s,g) => s + (Number(g.monto) || 0), 0);
  
  setEl('fi-tot', f(tot));
  setEl('fi-pag', f(totP));
  setEl('fi-np', pag.length);
  setEl('fi-nt', S.gastosFijos.length);
  
  const el = document.getElementById('fi-lst');
  if (!S.gastosFijos.length) {
    el.innerHTML = '<div class="emp"><span class="emp-icon">◉</span>Sin gastos fijos configurados.</div>';
    return;
  }
  
  el.innerHTML = S.gastosFijos.map(g => {
    const paid = g.pagadoEn.includes(mes);
    const montoMostrar = g.cuatroXMil ? (g.montoTotal || Math.round(g.monto*1.004)) : g.monto;
    const tipoBadge = (g.tipo || 'necesidad') === 'deseo' ? '<span class="pill py">Deseo</span>' : '<span class="pill pb">Necesidad</span>';
    const cuatroK = g.cuatroXMil ? '<span class="pill pt">4×1k</span>' : '';
    return `<div class="gfc" style="${paid ? 'opacity:.6' : ''}"><div style="font-size:20px">${CATS[g.cat] ? CATS[g.cat].split(' ')[0] : '📦'}</div><div style="flex:1;margin-left:4px"><div style="font-weight:700;font-size:13px;${paid ? 'text-decoration:line-through' : ''}">${he(g.nombre)} ${tipoBadge} ${cuatroK}</div><div class="tm" style="margin-top:2px">Día ${g.dia} · ${g.fondo==='efectivo' ? '💵 Efectivo' : '🏦 Banco'}${g.cuatroXMil ? ` · con GMF: ${f(montoMostrar)}` : ''}</div></div><div style="font-family:var(--fm);font-weight:700;font-size:14px;color:var(--a4)">${f(montoMostrar)}</div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${paid ? `<span class="pill pg">✓ Pagado</span> <button class="btn bg bsm" onclick="desmFijo(${g.id})">Desmarcar</button>` : `<button class="btn bp bsm" onclick="marcarFijo(${g.id})">Marcar pagado</button>`}<button class="btn bd bsm" onclick="delFijo(${g.id})">×</button></div></div>`;
  }).join('');
}

async function toggleFijo(id) {
  const fx = S.gastosFijos.find(x => x.id == id);
  if (!fx) return;

  if (fx.pagado) {
    const ok = await showConfirm(`¿Quieres revertir el pago de "${fx.desc}"?\n\nEl dinero regresará a tu saldo y el gasto desaparecerá del historial.`, 'Revertir pago');
    if (!ok) return;

    const idx = S.gastos.findIndex(g => g.autoFijo && g.fijoId == id);
    if (idx > -1) {
      const g = S.gastos[idx];
      if (g.fondo === 'efectivo') S.saldos.efectivo += g.montoTotal;
      else S.saldos.banco += g.montoTotal;
      S.gastos.splice(idx, 1);
    }
    
    fx.pagado = false;
    save();
    renderAll();
    sr('Pago revertido correctamente');
    return;
  }

  abrirModalFijo(id);
}

function desmFijo(id){const mes=mesStr();const g=S.gastosFijos.find(x=>x.id===id);if(!g)return;g.pagadoEn=g.pagadoEn.filter(m=>m!==mes);const idx=S.gastos.findIndex(x=>x.autoFijo&&x.fijoRef===id&&x.fecha.slice(0,7)===mes);if(idx!==-1){const gasto=S.gastos[idx];refF(gasto.fondo,gasto.montoTotal||gasto.monto);S.gastos.splice(idx,1);}save();renderFijos();renderGastos();updateDash();}
async function delFijo(id){const ok=await showConfirm('¿Eliminar este gasto fijo permanentemente?','Eliminar fijo');if(!ok)return;S.gastosFijos=S.gastosFijos.filter(x=>x.id!==id);save();renderFijos();}

async function guardarMeta(){const no=document.getElementById('mn-no').value.trim();const ob=+document.getElementById('mn-ob').value;if(!no||!ob){await showAlert('Completa nombre y objetivo.','Campos requeridos');return;}S.metas.push({id:Date.now(),nombre:no,objetivo:ob,actual:+document.getElementById('mn-ac').value||0,fecha:document.getElementById('mn-fe').value,icono:document.getElementById('mn-ic').value});['mn-no','mn-ob','mn-ac'].forEach(i=>document.getElementById(i).value='');closeM('m-meta');save();renderAll();populateSelectMetas();}

function renderMetas(){const fn=(m,bt)=>{const pct=Math.min(m.actual/m.objetivo*100,100);const r=Math.max(0,m.objetivo-m.actual);const dias=m.fecha?Math.ceil((new Date(m.fecha)-new Date())/86400000):null;const col=pct>=100?'var(--a1)':pct>60?'var(--a2)':'var(--a4)';return`<article class="gc"><div class="fb"><div><div class="gn">${m.icono} ${he(m.nombre)}</div><div class="gm">${dias!=null?(dias>0?`Faltan ${dias} días · `:'¡Fecha cumplida! · '):''}Falta: <strong>${f(r)}</strong></div></div>${bt?`<div style="display:flex;gap:6px"><button class="btn bpu bsm" onclick="openAbo(${m.id},'${he(m.nombre)}')" aria-label="Abonar">+ Abonar</button><button class="btn bd bsm" onclick="delMeta(${m.id})">×</button></div>`:''}</div><div class="ga"><span class="tm">Ahorrado: <span class="mono">${f(m.actual)}</span></span><span class="tm">Meta: <span class="mono">${f(m.objetivo)}</span></span><strong style="color:${col};font-family:var(--fm)">${Math.round(pct)}%</strong></div><div class="pw" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><div class="pf" style="width:${pct}%;background:${col}"></div></div></article>`;};setHtml('me-lst',S.metas.length?S.metas.map(m=>fn(m,true)).join(''):'<div class="emp"><span class="emp-icon">◯</span>No tienes metas. ¡Crea tu primera!</div>');setHtml('d-met',S.metas.length?S.metas.slice(0,3).map(m=>fn(m,false)).join(''):'<div class="emp" style="padding:10px 0">Sin metas</div>');}
function openAbo(id,n){document.getElementById('abo-id').value=id;document.getElementById('abo-t').textContent='Abonar a: '+n;document.getElementById('abo-m').value='';openM('m-abo');}
function abonarMeta(){const id=+document.getElementById('abo-id').value;const mo=+document.getElementById('abo-m').value;if(!mo)return;
  const foAbo=document.getElementById('abo-fo')?document.getElementById('abo-fo').value:'banco';
  const m=S.metas.find(x=>x.id===id);if(m)m.actual=Math.min(m.actual+mo,m.objetivo);
  if(foAbo){desF(foAbo,mo);S.gastos.unshift({id:Date.now(),desc:`🎯 Ahorro: ${m?m.nombre:'meta'}`,monto:mo,montoTotal:mo,cat:'ahorro',tipo:'ahorro',fondo:foAbo,hormiga:false,cuatroXMil:false,fecha:hoy(),metaId:id,autoFijo:false});}
  closeM('m-abo');save();renderAll();populateSelectMetas();sr('Abono registrado: '+f(mo));}
async function delMeta(id){const ok=await showConfirm('¿Eliminar esta meta de ahorro?\n\nEl dinero ya ahorrado NO se devolverá automáticamente.','Eliminar meta');if(!ok)return;S.metas=S.metas.filter(m=>m.id!==id);save();renderAll();populateSelectMetas();}

async function guardarDeuda(){const no=document.getElementById('dn-no').value.trim();const to=+document.getElementById('dn-to').value;const cu=+document.getElementById('dn-cu').value;if(!no||!to||!cu){await showAlert('Completa nombre, saldo total y cuota.','Campos requeridos');return;}S.deudas.push({id:Date.now(),nombre:no,total:to,cuota:cu,periodicidad:document.getElementById('dn-pe').value,nPeriodos:+document.getElementById('dn-nn').value||0,tasa:+document.getElementById('dn-ta').value||0,tipo:document.getElementById('dn-ti').value,pagado:0});['dn-no','dn-to','dn-cu','dn-ta','dn-nn'].forEach(i=>document.getElementById(i).value='');closeM('m-deu');save();renderAll();}

function renderDeudas() {
  let cPer = 0;
  let cQ = 0;
  let cM = 0;

  if (S.tipoPeriodo === 'mensual') {
    cQ = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + (d.cuota * 2), 0);
    cM = S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0);
    cPer = cQ + cM;
    setEl('de-cpl', 'Mes completo (incluye todas)');
  } else {
    cQ = S.deudas.filter(d => d.periodicidad === 'quincenal').reduce((s, d) => s + d.cuota, 0);
    cM = (S.tipoPeriodo === 'q1' || S.quincena === 1) ? S.deudas.filter(d => d.periodicidad === 'mensual').reduce((s, d) => s + d.cuota, 0) : 0;
    cPer = cQ + cM;
    setEl('de-cpl', (S.tipoPeriodo === 'q1' || S.quincena === 1) ? 'Q1: quincenal + mensual' : 'Q2: solo quincenal');
  }

  const totD = S.deudas.reduce((s, d) => s + Math.max(0, d.total - d.pagado), 0);
  const pct = S.ingreso > 0 ? Math.round(cPer / S.ingreso * 100) : 0;
  
  setEl('de-tot', f(totD));
  setEl('de-cq', f(cQ));
  setEl('de-cm', f(cM));
  setEl('de-cp', f(cPer));
  
  const pe = document.getElementById('de-pct');
  if (pe) {
    pe.textContent = pct + '%';
    pe.style.color = pct > 30 ? 'var(--dan)' : pct > 20 ? 'var(--a2)' : 'var(--a1)';
  }
  
  const TIPOS = { credito: 'Crédito bancario', tarjeta: 'Tarjeta crédito', libranza: 'Libranza', familiar: 'Personal', otro: 'Otro' };
  const el = document.getElementById('de-lst');
  
  if (!S.deudas.length) {
    el.innerHTML = '<div class="emp"><span class="emp-icon">▣</span>Sin deudas registradas 🎉</div>';
    return;
  }
  
  el.innerHTML = S.deudas.map(d => {
    const sa = Math.max(0, d.total - d.pagado);
    const p = Math.min(d.pagado / d.total * 100, 100);
    const esM = d.periodicidad === 'mensual';
    const av = esM && (S.tipoPeriodo === 'q2' || S.quincena === 2) ? '<div class="tm" style="margin-top:4px">ℹ️ Esta deuda es mensual — aplica en Q1</div>' : '';
    
    return `<article class="gc"><div class="fb"><div><div class="gn">💳 ${he(d.nombre)}</div><div class="gm">${TIPOS[d.tipo]} · <span class="pill ${esM ? 'pb' : 'py'}">${esM ? 'Mensual' : 'Quincenal'}</span> · ${d.nPeriodos} períodos rest.</div>${av}</div><div style="display:flex;gap:6px"><button class="btn bg bsm" onclick="abrirPagarCuota(${d.id})">Pagar cuota</button><button class="btn bd bsm" onclick="delDeu(${d.id})">×</button></div></div><div class="ga" style="margin-top:10px"><span class="tm">Saldo: <span class="mono" style="color:var(--dan)">${f(sa)}</span></span><span class="tm">Cuota: <span class="mono">${f(d.cuota)}</span></span><strong style="color:var(--a1);font-family:var(--fm)">${Math.round(p)}% pagado</strong></div><div class="pw" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><div class="pf" style="width:${p}%;background:var(--a1)"></div></div></article>`;
  }).join('');
}

function abrirPagarCuota(id){const d=S.deudas.find(x=>x.id===id);if(!d)return;setEl('pgc-no',d.nombre);setEl('pgc-mo',f(d.cuota));document.getElementById('pgc-id').value=id;openM('m-pgc');}

async function confPagarCuota(fo) {
  const id = +document.getElementById('pgc-id').value;
  const d = S.deudas.find(x => x.id === id);
  if (!d) { closeM('m-pgc'); return; }
  
  const disp = fo === 'efectivo' ? S.saldos.efectivo : S.saldos.banco;
  
  if (disp < d.cuota) {
    closeM('m-pgc');
    const ok = await showConfirm(`⚠️ Saldo insuficiente en ${fo === 'efectivo' ? 'Efectivo' : 'Banco'} (${f(disp)} disponible).\n\nConfigura tus saldos en Quincena > Saldos actuales.\n\n¿Continuar de todas formas?`, 'Saldo insuficiente');
    
    if (!ok) {
      openM('m-pgc');
      return;
    }
  } else {
    closeM('m-pgc');
  }
  
  desF(fo, d.cuota);
  d.pagado = Math.min(d.pagado + d.cuota, d.total);
  d.nPeriodos = Math.max(0, d.nPeriodos - 1);
  S.gastos.unshift({ id: Date.now(), desc: `💳 Cuota: ${d.nombre}`, monto: d.cuota, montoTotal: d.cuota, cat: 'deudas', tipo: 'necesidad', fondo: fo, hormiga: false, cuatroXMil: false, fecha: hoy(), metaId: '', autoFijo: false });
  
  save();
  renderAll();
  sr(`Cuota pagada con ${fo}. Descontados ${f(d.cuota)}.`);
}

async function delDeu(id){const ok=await showConfirm('¿Eliminar esta deuda del tracker?\n\nEsto no afecta tus saldos.','Eliminar deuda');if(!ok)return;S.deudas=S.deudas.filter(d=>d.id!==id);save();renderAll();}

async function guardarProyecto(){const no=document.getElementById('pn-no').value.trim();const bu=+document.getElementById('pn-bu').value;if(!no||!bu){await showAlert('Completa nombre y presupuesto del evento.','Campos requeridos');return;}const mo=+document.getElementById('pn-mo').value||0;S.proyectos.push({id:Date.now(),nombre:no,icono:document.getElementById('pn-ic').value,desc:document.getElementById('pn-de').value,presupuesto:bu,gastos:[],ahorro:{objetivo:mo,actual:0,fechaMeta:document.getElementById('pn-fe').value,abonos:[],activo:mo>0}});['pn-no','pn-bu','pn-de','pn-mo'].forEach(i=>document.getElementById(i).value='');closeM('m-proy');save();renderProyectos();}

function renderProyectos(){const el=document.getElementById('pr-lst');if(!S.proyectos.length){el.innerHTML='<div class="emp"><span class="emp-icon">◧</span>Sin proyectos. Crea el primero.</div>';return;}el.innerHTML=S.proyectos.map(p=>{const gastado=p.gastos.reduce((s,g)=>s+g.monto,0);const restPres=Math.max(0,p.presupuesto-gastado);const pctPres=p.presupuesto>0?Math.min(gastado/p.presupuesto*100,100):0;const colPres=pctPres>=100?'var(--dan)':pctPres>75?'var(--a2)':'var(--a1)';const catSum={};p.gastos.forEach(g=>{catSum[g.cat]=(catSum[g.cat]||0)+g.monto;});const catPills=Object.entries(catSum).map(([c,m])=>`<span class="pill pm" style="margin-bottom:3px">${PCATS[c]||c}: ${f(m)}</span>`).join(' ');
let metaHtml='';
const ah=p.ahorro||{objetivo:0,actual:0,fechaMeta:'',abonos:[],activo:false};
if(ah.activo&&ah.objetivo>0){const aP=Math.min(ah.actual/ah.objetivo*100,100);const aC=aP>=100?'var(--a1)':aP>50?'var(--a2)':'var(--a4)';const dias=ah.fechaMeta?Math.ceil((new Date(ah.fechaMeta)-new Date())/86400000):null;const ult=ah.abonos.slice(-3).reverse().map(a=>`<div style="font-size:10px;color:var(--t3);padding:2px 0">+ ${f(a.monto)} · ${a.fecha}${a.nota?' — '+a.nota:''}</div>`).join('');metaHtml=`<div class="pcard-meta"><div class="pcard-section-title"><span style="color:var(--a4)">💰 META DE AHORRO PREVIA</span><div style="display:flex;gap:6px"><button class="btn bbl bsm" onclick="openAhoProy(${p.id})">+ Registrar ahorro</button><button class="btn bd bsm" onclick="resetMetaProy(${p.id})">Eliminar meta</button></div></div><div class="ga"><span class="tm">Objetivo: <strong>${f(ah.objetivo)}</strong></span><span class="tm">Ahorrado: <strong style="color:${aC}">${f(ah.actual)}</strong></span><span class="tm">Falta: <strong>${f(Math.max(0,ah.objetivo-ah.actual))}</strong></span>${dias!=null?`<span class="tm">${dias>0?`Faltan ${dias} días`:'¡Fecha llegada!'}</span>`:''}  <strong style="color:${aC};font-family:var(--fm)">${Math.round(aP)}%</strong></div><div class="pw" style="margin:8px 0"><div class="pf" style="width:${aP}%;background:${aC}"></div></div>${ult?`<div style="margin-top:8px;padding:8px;background:rgba(59,158,255,.06);border-radius:var(--r1)">${ult}</div>`:''}</div>`;}else{metaHtml=`<div class="pcard-meta"><div class="pcard-section-title" style="margin-bottom:8px"><span style="color:var(--a4)">💰 META DE AHORRO PREVIA</span></div><div class="tm" style="margin-bottom:10px">Sin meta configurada para este proyecto.</div><button class="btn bbl bsm" onclick="openAhoProy(${p.id})">+ Añadir meta de ahorro</button></div>`;}
const budgetHtml=`<div class="pcard-budget"><div class="pcard-section-title"><span style="color:var(--a1)">📦 PRESUPUESTO DEL EVENTO</span><button class="btn bp bsm" onclick="openGProy(${p.id},'${he(p.nombre)}')">+ Registrar gasto</button></div><div class="ga"><span class="tm">Presupuesto: <strong>${f(p.presupuesto)}</strong></span><span class="tm">Gastado: <strong style="color:${colPres}">${f(gastado)}</strong></span><span class="tm">Disponible: <strong>${f(restPres)}</strong></span><strong style="color:${colPres};font-family:var(--fm)">${Math.round(pctPres)}% usado</strong></div><div class="pw" style="margin:8px 0"><div class="pf" style="width:${pctPres}%;background:${colPres}"></div></div>${catPills?`<div style="margin-bottom:10px">${catPills}</div>`:''} ${p.gastos.length?`<div style="border-top:1px solid rgba(0,220,130,.12);padding-top:10px;margin-top:6px">${p.gastos.map(g=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px solid rgba(0,220,130,.06)"><span style="color:var(--t3)">${PCATS[g.cat]||g.cat}</span><span>${g.fecha} · ${he(g.desc)}</span><span class="mono" style="color:var(--a3);font-weight:600">${f(g.monto)}</span></div>`).join('')}</div>`:'<div class="tm" style="margin-top:6px">Sin gastos registrados aún</div>'}</div>`;
return`<article class="pcard"><div class="pcard-header"><div><div class="pname">${p.icono} ${he(p.nombre)}</div>${p.desc?`<div class="tm" style="margin-top:3px">${he(p.desc)}</div>`:''}</div><button class="btn bd bsm" onclick="delProy(${p.id})">× Eliminar proyecto</button></div><div style="display:flex;gap:6px;margin-bottom:14px;font-size:10px;color:var(--t3)"><span style="background:rgba(59,158,255,.1);border:1px solid rgba(59,158,255,.2);border-radius:4px;padding:2px 8px;color:var(--a4)">PASO 1 — Ahorra primero</span><span>→</span><span style="background:rgba(0,220,130,.1);border:1px solid rgba(0,220,130,.2);border-radius:4px;padding:2px 8px;color:var(--a1)">PASO 2 — Gasta cuando llegue el momento</span></div>${metaHtml}${budgetHtml}</article>`;}).join('');}
function openGProy(id,n){document.getElementById('pg-id').value=id;document.getElementById('pg-t').textContent='Gasto para: '+n;document.getElementById('pg-fe').valueAsDate=new Date();openM('m-pgasto');}
async function agregarGastoProy(){const id=+document.getElementById('pg-id').value;const de=document.getElementById('pg-de').value.trim();const mo=+document.getElementById('pg-mo').value;const fo=document.getElementById('pg-fo').value;const ca=document.getElementById('pg-ca').value;if(!de||!mo){await showAlert('Completa la descripción y el monto del gasto.','Campos requeridos');return;}const p=S.proyectos.find(x=>x.id===id);if(p){p.gastos.push({desc:de,monto:mo,cat:ca,fecha:document.getElementById('pg-fe').value});desF(fo,mo);S.gastos.unshift({id:Date.now(),desc:`${p.icono} ${de}`,monto:mo,montoTotal:mo,cat:'otro',tipo:'deseo',fondo:fo,hormiga:false,cuatroXMil:false,fecha:document.getElementById('pg-fe').value,metaId:'',autoFijo:false});}['pg-de','pg-mo'].forEach(i=>document.getElementById(i).value='');closeM('m-pgasto');save();renderAll();}
function openAhoProy(id){document.getElementById('pah-id').value=id;const p=S.proyectos.find(x=>x.id===id);document.getElementById('pah-t').textContent='Ahorro para: '+(p?p.nombre:'');['pah-mo','pah-no'].forEach(i=>document.getElementById(i).value='');openM('m-paho');}
function abonarProy(){const id=+document.getElementById('pah-id').value;const mo=+document.getElementById('pah-mo').value;const no=document.getElementById('pah-no').value;if(!mo)return;const p=S.proyectos.find(x=>x.id===id);if(p){if(!p.ahorro)p.ahorro={objetivo:0,actual:0,fechaMeta:'',abonos:[],activo:true};p.ahorro.actual+=mo;p.ahorro.abonos.push({monto:mo,nota:no,fecha:hoy()});p.ahorro.activo=true;}closeM('m-paho');save();renderProyectos();sr('Ahorro registrado: '+f(mo));}
async function resetMetaProy(id){const ok=await showConfirm('¿Eliminar la meta de ahorro de este proyecto?\n\nLos gastos del presupuesto NO se verán afectados.','Eliminar meta del proyecto');if(!ok)return;const p=S.proyectos.find(x=>x.id===id);if(p)p.ahorro={objetivo:0,actual:0,fechaMeta:'',abonos:[],activo:false};save();renderProyectos();}
async function delProy(id){const ok=await showConfirm('¿Eliminar este proyecto y todos sus datos?\n\nSe eliminarán los gastos y el ahorro registrado en él.','Eliminar proyecto');if(!ok)return;S.proyectos=S.proyectos.filter(p=>p.id!==id);save();renderProyectos();}

async function guardarPago(){const de=document.getElementById('ag-de').value.trim();const mo=+document.getElementById('ag-mo').value;const fe=document.getElementById('ag-fe').value;if(!de||!mo||!fe){await showAlert('Completa todos los campos del pago.','Campos requeridos');return;}S.pagosAgendados.push({id:Date.now(),desc:de,monto:mo,fecha:fe,repetir:document.getElementById('ag-re').value,fondo:document.getElementById('ag-fo').value,pagado:false});['ag-de','ag-mo'].forEach(i=>document.getElementById(i).value='');closeM('m-pago');save();renderAll();}
function renderPagos(){const now=new Date();const up=S.pagosAgendados.filter(p=>!p.pagado&&new Date(p.fecha)>=now).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));const row=(p,bt)=>{const d=new Date(p.fecha);const dias=Math.ceil((d-now)/86400000);const badge=dias<=0?'pr':dias<=3?'pr':dias<=7?'py':'pb';const lbl=dias<=0?'Hoy':dias===1?'Mañana':`En ${dias} días`;return`<div class="prow"><div class="mono" style="font-size:10px;color:var(--t3);min-width:48px">${d.getDate()}/${d.getMonth()+1}</div><div style="flex:1"><div style="font-size:13px;font-weight:600">${he(p.desc)}</div><div style="margin-top:3px"><span class="pill ${badge}">${lbl}</span>${p.repetir==='mensual'?' <span class="pill pp">Mensual</span>':''}</div></div><div class="mono" style="font-size:13px;color:var(--a2);font-weight:600">${f(p.monto)}</div>${bt?`<button class="btn bp bsm" onclick="marcarPagado(${p.id})">✓</button><button class="btn bd bsm" onclick="delPago(${p.id})">×</button>`:''}</div>`;};setHtml('pa-lst',up.length?up.map(p=>row(p,true)).join(''):'<div class="emp"><span class="emp-icon">▦</span>Sin pagos próximos agendados</div>');setHtml('d-prox',up.length?up.slice(0,4).map(p=>row(p,false)).join(''):'<div class="emp" style="padding:10px 0">Sin pagos</div>');}
function marcarPagado(id){const p=S.pagosAgendados.find(x=>x.id===id);if(p){p.pagado=true;if(p.repetir==='mensual'){const fd=new Date(p.fecha);fd.setMonth(fd.getMonth()+1);S.pagosAgendados.push({id:Date.now()+1,desc:p.desc,monto:p.monto,fecha:fd.toISOString().split('T')[0],repetir:'mensual',fondo:p.fondo,pagado:false});}}save();renderAll();}
function delPago(id){S.pagosAgendados=S.pagosAgendados.filter(x=>x.id!==id);save();renderPagos();renderCal();}

function renderCal(){const now=new Date(),yr=now.getFullYear(),mo=now.getMonth();const dias=new Date(yr,mo+1,0).getDate();const first=(new Date(yr,mo,1).getDay()+6)%7;const g=document.getElementById('cal-g');if(!g)return;let h='';for(let i=0;i<first;i++)h+=`<div class="cal-day" style="opacity:.2"></div>`;for(let d=1;d<=dias;d++){const isTod=d===now.getDate();const ds=`${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const pags=S.pagosAgendados.filter(p=>p.fecha===ds&&!p.pagado);const fijsH=S.gastosFijos.filter(x=>x.dia===d);let ev=pags.map(p=>`<div class="cev cev-p">${he(p.desc.slice(0,9))}</div>`).join('');ev+=fijsH.map(x=>`<div class="cev cev-f">📌${he(x.nombre.slice(0,7))}</div>`).join('');h+=`<div class="cal-day${ev?' hev':''}${isTod?' tod':''}" role="gridcell"><div class="cal-dn">${d}</div>${ev}</div>`;}g.innerHTML=h;}

async function cerrarQ(){if(!S.ingreso){await showAlert('No hay quincena configurada.\n\nVe a Quincena y configura tu ingreso primero.','Quincena no configurada');return;}const ok=await showConfirm('¿Archivar la quincena actual?\n\nSe archiva el resumen y se limpian los gastos actuales.\nTus metas y deudas se mantienen.','Cerrar período');if(!ok)return;const now=new Date();const tG=S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0);const tA=S.gastos.filter(g=>g.tipo==='ahorro').reduce((s,g)=>s+g.monto,0);const tH=S.gastos.filter(g=>g.hormiga).reduce((s,g)=>s+g.monto,0);const catMap={};S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>{catMap[g.cat]=(catMap[g.cat]||0)+(g.montoTotal||g.monto);});S.historial.unshift({id:Date.now(),periodo:`${S.quincena===1?'1ra':'2da'} quincena · ${now.toLocaleString('es-CO',{month:'long',year:'numeric'})}`,mes:mesStr(),ingreso:S.ingreso,gastado:tG,ahorro:tA,hormiga:tH,n:S.gastos.length,metodo:S.metodo,quincena:S.quincena,catMap});S.gastos=[];S.ingreso=0;document.getElementById('q-pri').value='';document.getElementById('q-ext').value='';save();renderAll();go('hist');sr('Quincena archivada');}

function renderHistorial(){const el=document.getElementById('hi-lst');if(!S.historial.length){el.innerHTML='<div class="emp"><span class="emp-icon">≡</span>Sin períodos archivados.</div>';return;}el.innerHTML=S.historial.map((hx,idx)=>{const t=hx.ingreso>0?Math.round(hx.ahorro/hx.ingreso*100):0;const bx=t>=20?'pg':t>=10?'py':'pr';return`<article class="gc"><div class="fb mb"><div><div style="font-weight:800;font-size:14px">📅 ${hx.periodo}</div><div class="tm" style="margin-top:2px">Método: ${hx.metodo}</div></div><div style="display:flex;gap:8px;align-items:center"><span class="pill ${bx}">Ahorro ${t}%</span><button class="btn bd bsm" onclick="delHistorial(${hx.id})" aria-label="Eliminar este período del historial">× Eliminar</button></div></div><div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--t3)"><span>Ingreso <span class="mono" style="color:var(--t1)">${f(hx.ingreso)}</span></span><span>Gastado <span class="mono" style="color:var(--a3)">${f(hx.gastado)}</span></span><span>Ahorrado <span class="mono" style="color:var(--a1)">${f(hx.ahorro)}</span></span><span>Hormiga <span class="mono" style="color:var(--a2)">${f(hx.hormiga)}</span></span></div></article>`;}).join('');}
async function delHistorial(id){const ok=await showConfirm('¿Eliminar este período del historial?\n\nEsta acción no se puede deshacer.','Eliminar historial');if(!ok)return;S.historial=S.historial.filter(h=>h.id!==id);save();renderHistorial();renderStats();sr('Período eliminado del historial');}

function consolMes(){const mes=mesStr();const hist=S.historial.filter(h=>h.mes===mes);let ing=0,eg=0;hist.forEach(h=>{ing+=h.ingreso;eg+=h.gastado;});const gasAct=S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0);ing+=S.ingreso;eg+=gasAct;return{ing,eg,bal:ing-eg,q:hist.length+(S.ingreso>0?1:0)};}

function updateDash(){const tG=S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0);const tA=S.gastos.filter(g=>g.tipo==='ahorro').reduce((s,g)=>s+g.monto,0);const tH=S.gastos.filter(g=>g.hormiga).reduce((s,g)=>s+g.monto,0);const pG=S.ingreso>0?Math.round(tG/S.ingreso*100):0;const pH=S.ingreso>0?(tH/S.ingreso*100).toFixed(1):0;setEl('d-ing',f(S.ingreso));setEl('d-gas',f(tG));setEl('d-pgc',`${pG}% del ingreso`);setEl('d-aho',f(tA));setEl('d-hor',f(tH));setEl('d-phc',`${pH}% del ingreso`);updSaldo();const cm=consolMes();setEl('m-ing',f(cm.ing));setEl('m-eg',f(cm.eg));const balEl=document.getElementById('m-bal');if(balEl){balEl.textContent=f(cm.bal);balEl.style.color=cm.bal>=0?'var(--a1)':'var(--dan)';}setHtml('m-det',`${cm.q} quincena(s) del mes · Fijos mensuales: <strong>${f(S.gastosFijos.reduce((s,g)=>s+g.monto,0))}</strong>`);if(S.ingreso>0){
  const p=getPct();
  const bN=S.ingreso*p.n/100,bD=S.ingreso*p.d/100,bA=S.ingreso*p.a/100;
  const rN=S.gastos.filter(g=>g.tipo==='necesidad').reduce((s,g)=>s+(g.montoTotal||g.monto),0);
  const rD=S.gastos.filter(g=>g.tipo==='deseo').reduce((s,g)=>s+(g.montoTotal||g.monto),0);
  const bar=(l,g,b,col)=>{const u=b>0?Math.min(g/b*100,100):0;const ov=g>b;return`<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px"><span style="font-weight:600">${l}</span><span class="mono" style="color:${ov?'var(--dan)':'var(--t3)'}">${f(g)} / ${f(b)}</span></div><div class="pw"><div class="pf" style="width:${u}%;background:${ov?'var(--dan)':col}"></div></div></div>`;};
  setHtml('d-bud',bar('🏠 Necesidades',rN,bN,'var(--a4)')+bar('🎉 Deseos',rD,bD,'var(--a2)')+bar('💰 Ahorro',tA,bA,'var(--a1)'));
  } else {
  setHtml('d-bud', '<div class="emp"><span class="emp-icon">◎</span>Configura tu quincena para ver la distribución</div>');
  }const antI={};S.gastos.filter(g=>g.hormiga).forEach(g=>{antI[g.desc]=(antI[g.desc]||0)+g.monto;});const aEl=document.getElementById('d-ant'),aEmp=document.getElementById('d-ante');if(!Object.keys(antI).length){if(aEl)aEl.innerHTML='';if(aEmp)aEmp.style.display='block';}else{if(aEmp)aEmp.style.display='none';if(aEl)aEl.innerHTML=Object.entries(antI).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([d,m])=>`<div class="fb" style="margin-bottom:8px;font-size:12px"><span>🐜 ${he(d)}</span><span class="mono" style="color:var(--a3);font-weight:600">${f(m)}</span></div>`).join('');}setHtml('d-rec',S.gastos.length?S.gastos.slice(0,6).map(g=>`<tr><td class="mono" style="font-size:10px">${g.fecha}</td><td>${he(g.desc)}</td><td><span class="pill ${g.tipo==='necesidad'?'pb':g.tipo==='ahorro'?'pg':'py'}">${g.tipo}</span></td><td><span class="pill ${g.fondo==='efectivo'?'py':'pb'}">${g.fondo==='efectivo'?'💵':'🏦'}</span></td><td class="ac mono" style="color:${g.tipo==='ahorro'?'var(--a1)':'var(--a3)'};font-weight:600">${f(g.montoTotal||g.monto)}</td></tr>`).join(''):'<tr><td colspan="5" class="emp">Sin movimientos</td></tr>');const al=[];if(S.saldos.efectivo===0&&S.saldos.banco===0&&S.ingreso>0)al.push(`<div class="al alb"><span class="al-icon">💡</span>Saldos en $0. Ve a <strong>Quincena</strong> y configura cuánto tienes en efectivo y banco.</div>`);if(tG>S.ingreso*0.9&&S.ingreso>0)al.push(`<div class="al ald"><span class="al-icon">🚨</span>Gastas más del 90% de tu ingreso esta quincena. Revisa urgente.</div>`);if(tH>S.ingreso*0.15&&S.ingreso>0)al.push(`<div class="al alw"><span class="al-icon">🐜</span>Gastos hormiga superan el 15% del ingreso (${f(tH)}).</div>`);if(tA===0&&S.gastos.length>3)al.push(`<div class="al alw"><span class="al-icon">💰</span>Sin ahorro registrado esta quincena. ¡Págate a ti primero!</div>`);const cPer=S.deudas.filter(d=>d.periodicidad==='quincenal').reduce((s,d)=>s+d.cuota,0)+(S.quincena===1?S.deudas.filter(d=>d.periodicidad==='mensual').reduce((s,d)=>s+d.cuota,0):0);if(cPer>S.ingreso*0.3&&S.ingreso>0)al.push(`<div class="al ald"><span class="al-icon">💳</span>Cuotas superan el 30% del ingreso — zona de riesgo.</div>`);const mes=mesStr();const fijNP=S.gastosFijos.filter(g=>!g.pagadoEn.includes(mes));if(fijNP.length)al.push(`<div class="al alb"><span class="al-icon">📌</span><strong>${fijNP.length}</strong> gasto(s) fijo(s) sin pagar este mes: ${fijNP.map(g=>g.nombre).join(', ')}.</div>`);setHtml('d-alr',al.join(''));}

function toggleCalc(id){const body=document.getElementById(id+'-body');const arr=document.getElementById(id+'-arr');const isOpen=body.classList.contains('open');body.classList.toggle('open',!isOpen);body.classList.toggle('closed',isOpen);if(arr)arr.style.transform=isOpen?'':'rotate(180deg)';if(!isOpen){if(id==='cdt')cCDT();if(id==='cre')cCre();if(id==='ic')cIC();if(id==='ma')cMeta();if(id==='rt')cRet();if(id==='gf')cGMF();}}
function cCDT(){const cap=+document.getElementById('cc-cap').value||0;const tA=+document.getElementById('cc-tas').value||0;const d=+document.getElementById('cc-dia').value||0;const ret=document.getElementById('cc-ret').checked;if(!cap||!tA||!d){setHtml('cdt-res','<div class="tm">Completa los campos para calcular</div>');return;}const td=Math.pow(1+tA/100,1/365)-1;const rend=(cap*Math.pow(1+td,d))-cap;const r7=ret?rend*0.07:0;const neto=rend-r7;setHtml('cdt-res',`<div style="display:flex;flex-wrap:wrap;gap:14px"><div><div class="crl">Rendimiento bruto</div><div class="mono" style="font-size:16px;font-weight:700">${f(rend)}</div></div>${ret?`<div><div class="crl">Retención 7%</div><div class="mono" style="font-size:16px;font-weight:700;color:var(--dan)">-${f(r7)}</div></div>`:''}<div><div class="crl">💰 Neto a recibir</div><div class="crv">${f(neto)}</div></div><div><div class="crl">Capital final</div><div class="mono" style="font-size:16px;font-weight:700">${f(cap+neto)}</div></div></div>`);}
function cCre(){const P=+document.getElementById('cr-mo').value||0;const tm=+document.getElementById('cr-ta').value/100||0;const n=+document.getElementById('cr-n').value||0;if(!P||!tm||!n){setHtml('cre-res','<div class="tm">Completa los campos</div>');return;}const cu=tm===0?P/n:(P*(tm*Math.pow(1+tm,n))/(Math.pow(1+tm,n)-1));const totP=cu*n;const int=totP-P;setHtml('cre-res',`<div style="display:flex;flex-wrap:wrap;gap:14px"><div><div class="crl">💳 Cuota mensual</div><div class="crv">${f(cu)}</div></div><div><div class="crl">Total a pagar</div><div class="mono" style="font-size:16px;font-weight:700;color:var(--a3)">${f(totP)}</div></div><div><div class="crl">Intereses totales</div><div class="mono" style="font-size:16px;font-weight:700;color:var(--dan)">${f(int)}</div></div><div><div class="crl">Costo real</div><div class="mono" style="font-size:16px;font-weight:700">${Math.round(int/P*100)}%</div></div></div>`);}
function cIC(){const C=+document.getElementById('ic-cap').value||0;const A=+document.getElementById('ic-apo').value||0;const tA=+document.getElementById('ic-tas').value||0;const m=+document.getElementById('ic-mes').value||0;if(!m||!tA){setHtml('ic-res','<div class="tm">Completa los campos</div>');return;}const tm=Math.pow(1+tA/100,1/12)-1;const vf=tm>0?C*Math.pow(1+tm,m)+A*(Math.pow(1+tm,m)-1)/tm:C+A*m;const ap=C+A*m;setHtml('ic-res',`<div style="display:flex;flex-wrap:wrap;gap:14px"><div><div class="crl">Total aportado</div><div class="mono" style="font-size:16px;font-weight:700">${f(ap)}</div></div><div><div class="crl">🌱 Valor final</div><div class="crv">${f(vf)}</div></div><div><div class="crl">Ganancia por interés</div><div class="mono" style="font-size:16px;font-weight:700;color:var(--a1)">${f(vf-ap)}</div></div></div>`);}
function cMeta(){const M=+document.getElementById('ma-tot').value||0;const T=+document.getElementById('ma-ten').value||0;const fe=document.getElementById('ma-fe').value;if(!M||!fe){setHtml('ma-res','<div class="tm">Completa meta y fecha</div>');return;}const falta=Math.max(0,M-T);const dias=Math.max(0,Math.ceil((new Date(fe)-new Date())/86400000));const q=Math.max(1,Math.floor(dias/15));const ms=Math.max(1,Math.floor(dias/30));setHtml('ma-res',`<div style="display:flex;flex-wrap:wrap;gap:14px"><div><div class="crl">Falta ahorrar</div><div class="mono" style="font-size:16px;font-weight:700;color:var(--a3)">${f(falta)}</div></div><div><div class="crl">💰 Por quincena</div><div class="crv">${f(falta/q)}</div></div><div><div class="crl">Por mes</div><div class="mono" style="font-size:16px;font-weight:700">${f(falta/ms)}</div></div><div><div class="crl">Tiempo</div><div class="mono" style="font-size:16px;font-weight:700">${q} quincenas</div></div></div>`);}
function cRet(){const ren=+document.getElementById('rt-ren').value||0;const ta=+document.getElementById('rt-tip').value||0;const ret=ren*ta;setHtml('rt-res',`<div style="display:flex;gap:14px;flex-wrap:wrap"><div><div class="crl">Retención</div><div class="mono" style="font-size:16px;font-weight:700;color:var(--dan)">${f(ret)}</div></div><div><div class="crl">💰 Neto a recibir</div><div class="crv">${f(ren-ret)}</div></div></div>`);}
function cGMF(){const mo=+document.getElementById('gf-mo').value||0;const gmf=mo*0.004;setHtml('gf-res',`<div style="display:flex;gap:14px;flex-wrap:wrap"><div><div class="crl">GMF 4×1000</div><div class="mono" style="font-size:16px;font-weight:700;color:var(--a2)">${f(gmf)}</div></div><div><div class="crl">Total debitado</div><div class="crv">${f(mo+gmf)}</div></div></div>`);}

function renderStats(){const mes=mesStr();const catT={};S.gastos.filter(g=>g.tipo!=='ahorro'&&g.fecha&&g.fecha.startsWith(mes)).forEach(g=>{catT[g.cat]=(catT[g.cat]||0)+(g.montoTotal||g.monto);});S.historial.filter(h=>h.mes===mes&&h.catMap).forEach(h=>{Object.entries(h.catMap).forEach(([cat,val])=>{catT[cat]=(catT[cat]||0)+val;});});const tot=Object.values(catT).reduce((s,v)=>s+v,0);if(tot>0){const segs=Object.entries(catT).map(([c,v])=>({v,color:CCOLORS[c]||'#666',label:CATS[c]||c,pct:Math.round(v/tot*100)})).sort((a,b)=>b.v-a.v);setHtml('pie-c',donut(segs));setHtml('pie-l',segs.map(s=>`<div class="leg-row"><div class="leg-dot" style="background:${s.color}"></div><span style="flex:1;font-size:12px">${s.label}</span><span class="mono" style="font-size:11px;color:var(--t3)">${s.pct}%</span><span class="mono" style="font-size:11px;margin-left:8px;font-weight:600">${f(s.v)}</span></div>`).join(''));
const maxCat=Math.max(...Object.values(catT),1);setHtml('stat-cats',Object.entries(catT).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>{const pct=val/maxCat*100;const exceso=S.ingreso>0?val/S.ingreso*100:0;const alerta=exceso>30?'<span class="pill pr" style="font-size:9px">Alto</span>':exceso>15?'<span class="pill py" style="font-size:9px">Moderado</span>':'';return`<div class="stat-bar-row"><div class="stat-bar-label">${CATS[cat]||cat} ${alerta}</div><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${pct}%;background:${CCOLORS[cat]||'#666'}"></div></div><div class="stat-bar-val">${f(val)}<span class="mono" style="color:var(--t3);font-size:10px;margin-left:4px">${exceso>0?Math.round(exceso)+'%':''}</span></div></div>`;}).join(''));}else{setHtml('pie-c','<div class="emp"><span class="emp-icon">◱</span>Sin gastos este mes para graficar</div>');setHtml('stat-cats','<div class="emp">Sin datos</div>');}
const bEl=document.getElementById('bar-c');if(S.historial.length&&bEl){const rec=S.historial.slice(0,8).reverse();bEl.innerHTML=`<div style="overflow-x:auto" tabindex="0"><table><thead><tr><th>Período</th><th>Ingreso</th><th>Gastado</th><th>Ahorro</th><th>% Ahorro</th><th>% Hormiga</th><th>Tendencia</th></tr></thead><tbody>${rec.map(hx=>{const pA=hx.ingreso>0?Math.round(hx.ahorro/hx.ingreso*100):0;const pH=hx.ingreso>0?Math.round(hx.hormiga/hx.ingreso*100):0;const w=hx.ingreso>0?Math.min(hx.ahorro/hx.ingreso*100,100):0;const col=pA>=20?'var(--a1)':pA>=10?'var(--a2)':'var(--dan)';return`<tr><td style="font-size:11px;font-weight:600">${hx.periodo}</td><td class="ac mono" style="font-size:11px">${f(hx.ingreso)}</td><td class="ac mono" style="font-size:11px;color:var(--a3)">${f(hx.gastado)}</td><td class="ac mono" style="font-size:11px;color:var(--a1)">${f(hx.ahorro)}</td><td class="ac"><strong style="color:${col}">${pA}%</strong></td><td class="ac"><span style="color:${pH>15?'var(--dan)':pH>10?'var(--a2)':'var(--t3)'}">${pH}%</span></td><td style="min-width:80px;padding-right:12px"><div style="height:8px;background:var(--s3);border-radius:999px;overflow:hidden"><div style="height:100%;border-radius:999px;width:${w}%;background:${col};transition:width .6s ease"></div></div></td></tr>`;}).join('')}</tbody></table></div>`;const promA=rec.reduce((s,h)=>s+h.ahorro,0)/rec.length;const promH=rec.reduce((s,h)=>s+h.hormiga,0)/rec.length;const mejor=rec.reduce((b,h)=>h.ahorro>b.ahorro?h:b,rec[0]);setEl('st-ap',f(promA));setEl('st-hp',f(promH));setEl('st-mj',f(mejor.ahorro));
const tendHtml=rec.map(hx=>{const pA=hx.ingreso>0?Math.round(hx.ahorro/hx.ingreso*100):0;const col=pA>=20?'var(--a1)':pA>=10?'var(--a2)':'var(--dan)';const w=Math.min(pA*2,100);return`<div class="stat-bar-row"><div class="stat-bar-label" style="font-size:10px">${hx.periodo.split('·')[0].trim()}</div><div class="stat-bar-wrap"><div class="stat-bar-fill" style="width:${w}%;background:${col}"></div></div><div class="stat-bar-val" style="color:${col};font-weight:700">${pA}%</div></div>`;}).join('');setHtml('stat-trend',tendHtml);}else if(bEl){bEl.innerHTML='<div class="emp"><span class="emp-icon">≡</span>Cierra tu primera quincena para ver comparativos.</div>';}
const insights=[];const tG=S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0);const tH=S.gastos.filter(g=>g.hormiga).reduce((s,g)=>s+g.monto,0);const tA=S.gastos.filter(g=>g.tipo==='ahorro').reduce((s,g)=>s+g.monto,0);if(S.ingreso>0){if(tH>S.ingreso*0.1)insights.push({color:'var(--a2)',icon:'🐜',text:`Gastos hormiga: ${f(tH)} (${Math.round(tH/S.ingreso*100)}% del ingreso). Al mes: ~${f(tH*2)}. Al año: ~${f(tH*24)}.`});if(tG>0&&S.ingreso>0){const catMax=Object.entries(catT).sort((a,b)=>b[1]-a[1])[0];if(catMax)insights.push({color:'var(--a4)',icon:'📊',text:`Tu mayor gasto del mes es <strong>${CATS[catMax[0]]||catMax[0]}</strong> con ${f(catMax[1])} (${Math.round(catMax[1]/S.ingreso*100)}% del ingreso).`});}if(tA/S.ingreso<0.1)insights.push({color:'var(--dan)',icon:'⚠️',text:`Tasa de ahorro: ${Math.round(tA/S.ingreso*100)}%. La meta mínima recomendada es 10–20%. Ajusta tus gastos de deseo.`});else insights.push({color:'var(--a1)',icon:'✅',text:`Tasa de ahorro: ${Math.round(tA/S.ingreso*100)}%. ${tA/S.ingreso>=0.2?'¡Excelente! Superas el 20% recomendado.':'Vas bien. La meta ideal es 20%.'}`});const cPer=S.deudas.filter(d=>d.periodicidad==='quincenal').reduce((s,d)=>s+d.cuota,0)+(S.quincena===1?S.deudas.filter(d=>d.periodicidad==='mensual').reduce((s,d)=>s+d.cuota,0):0);if(cPer/S.ingreso>0.3)insights.push({color:'var(--dan)',icon:'💳',text:`Cuotas de deuda = ${Math.round(cPer/S.ingreso*100)}% del ingreso. Superas el límite del 30% — hay riesgo de sobreendeudamiento.`});}if(!insights.length)insights.push({color:'var(--t3)',icon:'📝',text:'Registra gastos y configura tu quincena para ver insights personalizados.'});setHtml('stat-insights',insights.map(i=>`<div class="insight-card" style="border-left-color:${i.color}"><span style="font-size:15px;margin-right:6px">${i.icon}</span>${i.text}</div>`).join(''));calcScore();}

function donut(segs){const W=220,cx=110,cy=110,R=85,r=50;const tot=segs.reduce((s,x)=>s+x.v,0);if(!tot)return'';let ang=-Math.PI/2,paths='';segs.forEach(s=>{const a=(s.v/tot)*2*Math.PI;if(a<0.01){ang+=a;return;}const x1=cx+R*Math.cos(ang),y1=cy+R*Math.sin(ang),x2=cx+R*Math.cos(ang+a),y2=cy+R*Math.sin(ang+a);const xi1=cx+r*Math.cos(ang),yi1=cy+r*Math.sin(ang),xi2=cx+r*Math.cos(ang+a),yi2=cy+r*Math.sin(ang+a);const lg=a>Math.PI?1:0;paths+=`<path d="M${xi1},${yi1} L${x1},${y1} A${R},${R},0,${lg},1,${x2},${y2} L${xi2},${yi2} A${r},${r},0,${lg},0,${xi1},${yi1}Z" fill="${s.color}" opacity="0.88"><title>${s.label}: ${f(s.v)} (${s.pct}%)</title></path>`;ang+=a;});return`<svg viewBox="0 0 ${W} ${W}" style="max-width:220px;display:block;margin:0 auto" role="img"><title>Distribución de gastos</title>${paths}<text x="${cx}" y="${cy-7}" text-anchor="middle" fill="var(--t1)" font-family="DM Mono" font-weight="700" font-size="15">${f(tot)}</text><text x="${cx}" y="${cy+12}" text-anchor="middle" fill="var(--t3)" font-family="Inter" font-size="11">total</text></svg>`;}

function calcScore(){if(!S.ingreso){const sn=document.getElementById('sc-circle');if(sn){sn.textContent='—';sn.style.borderColor='var(--b2)';}setEl('sc-l','Configura tu quincena para ver el puntaje');setHtml('sc-d','');return;}const tG=S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0);const tA=S.gastos.filter(g=>g.tipo==='ahorro').reduce((s,g)=>s+g.monto,0);const tH=S.gastos.filter(g=>g.hormiga).reduce((s,g)=>s+g.monto,0);const cPer=S.deudas.filter(d=>d.periodicidad==='quincenal').reduce((s,d)=>s+d.cuota,0)+(S.quincena===1?S.deudas.filter(d=>d.periodicidad==='mensual').reduce((s,d)=>s+d.cuota,0):0);const p=getPct();let sc=100;const det=[];const pg=tG/S.ingreso;if(pg>0.9){sc-=25;det.push({t:'⚠️ Gastas >90% del ingreso',ok:false});}else if(pg>0.75){sc-=12;det.push({t:'🟡 Gastas >75%',ok:false});}else det.push({t:'✅ Gastos bajo control',ok:true});const pa=tA/S.ingreso;if(pa>=p.a/100)det.push({t:`✅ Meta de ahorro ${p.a}% cumplida`,ok:true});else if(pa>0){sc-=10;det.push({t:'🟡 Ahorro por debajo de meta',ok:false});}else{sc-=25;det.push({t:'❌ Sin ahorro registrado',ok:false});}if(tH/S.ingreso>0.2){sc-=20;det.push({t:'🐜 Hormiga muy alta +20%',ok:false});}else if(tH/S.ingreso>0.1){sc-=8;det.push({t:'🟡 Hormiga moderada',ok:false});}else det.push({t:'✅ Hormiga controlada',ok:true});if(cPer/S.ingreso>0.3){sc-=15;det.push({t:'💳 Deudas >30% del ingreso',ok:false});}else if(cPer>0)det.push({t:'✅ Deudas bajo el 30%',ok:true});if(S.metas.length>0)det.push({t:'🎯 Metas de ahorro activas',ok:true});else{sc-=5;det.push({t:'🎯 Sin metas definidas',ok:false});}sc=Math.max(0,Math.min(100,Math.round(sc)));const col=sc>=75?'var(--a1)':sc>=50?'var(--a2)':'var(--dan)';const sn=document.getElementById('sc-circle');if(sn){sn.textContent=sc;sn.style.borderColor=col;sn.style.color=col;}setEl('sc-l',sc>=80?'¡Excelente control financiero! 🏆':sc>=60?'Buen camino — hay margen de mejora':'Necesitas ajustes importantes');setHtml('sc-d',det.map(d=>`<div style="color:${d.ok?'var(--a1)':'var(--t3)'};margin-bottom:4px;font-size:12px">${d.t}</div>`).join(''));}

function renderTips(){const tips=[{i:'🏦',t:'Págate a ti primero',b:'Apenas recibas tu quincena, transfiere el % de ahorro antes de gastar en cualquier otra cosa.'},{i:'📌',t:'Los fijos son la base',b:'Configura todos tus gastos fijos antes de planear cualquier otra cosa. Son tu piso inamovible.'},{i:'🐜',t:'La hormiga te drena sin que la veas',b:'Un tinto diario = ~$540k/año. Registra todo 15 días y te sorprenderá el total.'},{i:'📅',t:'Anticipa los pagos grandes',b:'Agéndalos con meses de anticipación. Si en octubre pagas matrícula, empieza a separar en julio.'},{i:'💳',t:'Estrategia avalancha',b:'Paga mínimos en todas y concentra el excedente en la deuda de mayor tasa. Pagas menos intereses.'},{i:'🗂️',t:'Proyectos: ahorra antes de gastar',b:'Primero completa la meta de ahorro del proyecto, luego registra los gastos del evento.'},{i:'🌱',t:'El tiempo vale más que el monto',b:'$200k/quincena a 12% E.A. = ~$5.2M al año. Empieza hoy aunque sea con poco.'},{i:'🔒',t:'Fondo de emergencia primero',b:'Asegura 3–6 meses de gastos en Nu Cajitas. Sin colchón, cualquier imprevisto destruye todo.'},{i:'📊',t:'Revisa tus estadísticas mensualmente',b:'El gráfico de categorías te muestra dónde crece el gasto sin que te des cuenta.'},{i:'💡',t:'30% máximo en cuotas',b:'Si tus cuotas superan el 30% del ingreso, hay riesgo de sobreendeudamiento. Renegocia.'}];setHtml('tip-lst',tips.map(t=>`<div class="tip"><i style="font-style:normal;font-size:20px;display:block;margin-bottom:6px">${t.i}</i><strong>${t.t}</strong><br><span style="color:var(--t3)">${t.b}</span></div>`).join(''));}

function openM(id){const el=document.getElementById(id);el.classList.add('open');const first=el.querySelector('input,select,textarea,button:not(.mclose)');if(first)setTimeout(()=>first.focus(),80);}
function closeM(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-ov').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});m.addEventListener('keydown',e=>{if(e.key==='Escape')m.classList.remove('open');if(e.key==='Tab'){const fs=m.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])');const fi=fs[0],la=fs[fs.length-1];if(e.shiftKey&&document.activeElement===fi){e.preventDefault();la.focus();}else if(!e.shiftKey&&document.activeElement===la){e.preventDefault();fi.focus();}}});});

function sr(msg){let el=document.getElementById('sr-live');if(!el){el=document.createElement('div');el.id='sr-live';el.className='sr-only';el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');document.body.appendChild(el);}el.textContent='';setTimeout(()=>{el.textContent=msg;},100);}

function f(n){return'$'+Math.round(n||0).toLocaleString('es-CO');}
function hoy(){return new Date().toISOString().split('T')[0];}
function mesStr(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;}
function he(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function setHtml(id,v){const e=document.getElementById(id);if(e)e.innerHTML=v;}
function setEl(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}

let _cdlgResolve=null,_cdlgPromptMode=false,_cdlgExpected=null;
function _cdlgRes(ok){
  const ov=document.getElementById('cdlg-ov');
  ov.classList.remove('open');
  if(_cdlgPromptMode){
    const val=document.getElementById('cdlg-input').value;
    if(_cdlgExpected&&ok&&val!==_cdlgExpected){showAlert('Texto incorrecto. Operación cancelada.');if(_cdlgResolve)_cdlgResolve(false);_cdlgResolve=null;return;}
    if(_cdlgResolve)_cdlgResolve(ok?val:null);
  }else{if(_cdlgResolve)_cdlgResolve(ok);}
  _cdlgResolve=null;_cdlgPromptMode=false;_cdlgExpected=null;
}
function showConfirm(msg,title='Confirmar'){
  return new Promise(r=>{
    _cdlgResolve=r;_cdlgPromptMode=false;
    document.getElementById('cdlg-title').textContent=title;
    document.getElementById('cdlg-msg').textContent=msg;
    document.getElementById('cdlg-input-wrap').style.display='none';
    document.getElementById('cdlg-cancel').style.display='';
    document.getElementById('cdlg-ok').textContent='Aceptar';
    document.getElementById('cdlg-ov').classList.add('open');
    setTimeout(()=>document.getElementById('cdlg-ok').focus(),80);
  });
}
function showAlert(msg,title='Aviso'){
  return new Promise(r=>{
    _cdlgResolve=r;_cdlgPromptMode=false;
    document.getElementById('cdlg-title').textContent=title;
    document.getElementById('cdlg-msg').textContent=msg;
    document.getElementById('cdlg-input-wrap').style.display='none';
    document.getElementById('cdlg-cancel').style.display='none';
    document.getElementById('cdlg-ok').textContent='Entendido';
    document.getElementById('cdlg-ov').classList.add('open');
    setTimeout(()=>document.getElementById('cdlg-ok').focus(),80);
  });
}
function showPromptConfirm(msg,expected,title='Confirmar'){
  return new Promise(r=>{
    _cdlgResolve=r;_cdlgPromptMode=true;_cdlgExpected=expected;
    document.getElementById('cdlg-title').textContent=title;
    document.getElementById('cdlg-msg').textContent=msg;
    const inp=document.getElementById('cdlg-input');
    inp.value='';inp.placeholder=`Escribe: ${expected}`;
    document.getElementById('cdlg-input-wrap').style.display='block';
    document.getElementById('cdlg-cancel').style.display='';
    document.getElementById('cdlg-ok').textContent='Confirmar';
    document.getElementById('cdlg-ov').classList.add('open');
    setTimeout(()=>inp.focus(),80);
  });
}
function showPrompt(msg, title='Editar', valorInicial='') {
  return new Promise(r => {
    _cdlgResolve = r;
    _cdlgPromptMode = true;
    _cdlgExpected = null;
    document.getElementById('cdlg-title').textContent = title;
    document.getElementById('cdlg-msg').textContent = msg;
    const inp = document.getElementById('cdlg-input');
    inp.value = valorInicial;
    inp.placeholder = '';
    inp.type = 'text';
    document.getElementById('cdlg-input-wrap').style.display = 'block';
    document.getElementById('cdlg-cancel').style.display = '';
    document.getElementById('cdlg-ok').textContent = 'Guardar';
    document.getElementById('cdlg-ov').classList.add('open');
    setTimeout(() => inp.focus(), 80);
  });
}

function exportarDatos() {
  const dataStr = JSON.stringify(S, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fecha = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `finanzasco_respaldo_${fecha}.json`;
  a.click();
  URL.revokeObjectURL(url);
  sr('Respaldo descargado exitosamente.');
}

function exportarCSV() {
  if (!S.gastos.length && !S.historial.length) {
    showAlert('No hay gastos para exportar.', 'Sin datos');
    return;
  }
  const limpiar = txt => String(txt||'').replace(/[^\x00-\x7F]/g,'').trim();
  const fc = n => '$' + Math.round(n||0).toLocaleString('es-CO');
  const tG = S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0)
         + S.historial.reduce((s,h)=>s+(h.gastado||0),0);
const tA = S.gastos.filter(g=>g.tipo==='ahorro').reduce((s,g)=>s+g.monto,0)
         + S.historial.reduce((s,h)=>s+(h.ahorro||0),0);
const tH = S.gastos.filter(g=>g.hormiga).reduce((s,g)=>s+g.monto,0)
         + S.historial.reduce((s,h)=>s+(h.hormiga||0),0);

  const resumen = {};
  S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>{
    const cat = limpiar(CATS[g.cat]||g.cat);
    resumen[cat] = (resumen[cat]||0) + (g.montoTotal||g.monto);
  });

  let html = '';
  html += '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">';
  html += '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 18px;min-width:120px"><div style="font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Total Gastado</div><div style="font-size:18px;font-weight:700;color:#991b1b;font-family:var(--fm)">' + fc(tG) + '</div></div>';
  html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 18px;min-width:120px"><div style="font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Total Ahorrado</div><div style="font-size:18px;font-weight:700;color:#065f46;font-family:var(--fm)">' + fc(tA) + '</div></div>';
  html += '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px 18px;min-width:120px"><div style="font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Gastos Hormiga</div><div style="font-size:18px;font-weight:700;color:#854d0e;font-family:var(--fm)">' + fc(tH) + '</div></div>';
  html += '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 18px;min-width:120px"><div style="font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">Movimientos</div><div style="font-size:18px;font-weight:700;color:#1e40af;font-family:var(--fm)">' + S.gastos.length + '</div></div>';
  html += '</div>';

  html += '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Detalle de Gastos</div>';
  html += '<div style="overflow-x:auto"><table><thead><tr><th>Fecha</th><th>Descripcion</th><th>Categoria</th><th>Tipo</th><th>Fondo</th><th>Monto</th></tr></thead><tbody>';

  S.gastos.forEach(function(g) {
    const tc = g.tipo==='necesidad'?'pb':g.tipo==='ahorro'?'pg':'py';
    const mc = g.tipo==='ahorro'?'var(--a1)':'var(--a3)';
    html += '<tr>';
    html += '<td style="font-family:var(--fm);font-size:10px;color:var(--t3)">' + g.fecha + '</td>';
    html += '<td style="font-weight:600">' + (g.desc||'') + '</td>';
    html += '<td>' + limpiar(CATS[g.cat]||g.cat) + '</td>';
    html += '<td><span class="pill ' + tc + '">' + g.tipo + '</span></td>';
    html += '<td>' + (g.fondo==='efectivo'?'💵 Efectivo':'🏦 Banco') + '</td>';
    html += '<td style="text-align:right;font-family:var(--fm);font-weight:700;color:' + mc + '">' + fc(g.montoTotal||g.monto) + '</td>';
    html += '</tr>';
  });

  S.historial.forEach(function(hx) {
    if (!hx.catMap) return;
    Object.entries(hx.catMap).forEach(function(entry) {
      html += '<tr style="opacity:.6"><td style="font-family:var(--fm);font-size:10px;color:var(--t3)">' + hx.mes + '</td>';
      html += '<td style="font-style:italic;color:var(--t3)">Historial: ' + hx.periodo + '</td>';
      html += '<td>' + limpiar(CATS[entry[0]]||entry[0]) + '</td>';
      html += '<td><span class="pill pm">historico</span></td><td>—</td>';
      html += '<td style="text-align:right;font-family:var(--fm);font-weight:700;color:var(--a3)">' + fc(entry[1]) + '</td></tr>';
    });
  });

  html += '</tbody></table></div>';

  html += '<div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin:20px 0 8px">Resumen por Categoria</div>';
  html += '<table style="width:500px"><thead><tr><th>Categoria</th><th>Total</th><th>%</th><th>Distribucion</th></tr></thead><tbody>';

  Object.entries(resumen).sort((a,b)=>b[1]-a[1]).forEach(function(entry) {
    const pct = tG>0?Math.round(entry[1]/tG*100):0;
    html += '<tr><td style="font-weight:600">' + entry[0] + '</td>';
    html += '<td style="text-align:right;font-family:var(--fm);font-weight:700;color:var(--a3)">' + fc(entry[1]) + '</td>';
    html += '<td style="text-align:center;font-weight:700">' + pct + '%</td>';
    html += '<td style="padding:6px 12px"><div style="background:var(--s3);border-radius:999px;height:8px;width:160px"><div style="background:var(--a1);height:8px;border-radius:999px;width:' + pct + '%"></div></div></td>';
    html += '</tr>';
  });

  html += '</tbody></table>';

  document.getElementById('reporte-contenido').innerHTML = html;
  openM('m-reporte');
  sr('Reporte generado correctamente');
}

function descargarCSVDirecto() {
  const limpiar = txt => String(txt||'').replace(/[\u{1F300}-\u{1FFFF}]/gu,'').replace(/[^\x20-\xFF]/g,'').trim();
  const fc = n => '$' + Math.round(n||0).toLocaleString('es-CO');
  const fecha = new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'});

  const wb = XLSX.utils.book_new();

  const tG = S.gastos.filter(g=>g.tipo!=='ahorro').reduce((s,g)=>s+(g.montoTotal||g.monto),0)
           + S.historial.reduce((s,h)=>s+(h.gastado||0),0);
  const tA = S.gastos.filter(g=>g.tipo==='ahorro').reduce((s,g)=>s+g.monto,0)
           + S.historial.reduce((s,h)=>s+(h.ahorro||0),0);
  const tH = S.gastos.filter(g=>g.hormiga).reduce((s,g)=>s+g.monto,0)
           + S.historial.reduce((s,h)=>s+(h.hormiga||0),0);

  const resData = [
    ['FinanzasCO — Reporte de Gastos', '', '', ''],
    ['Generado:', fecha, 'Ingreso del periodo:', S.ingreso],
    ['', '', '', ''],
    ['RESUMEN', '', '', ''],
    ['Total Gastado', tG, 'Total Ahorrado', tA],
    ['Gastos Hormiga', tH, 'Movimientos', S.gastos.length],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(resData);
  ws1['!cols'] = [{wch:22},{wch:18},{wch:22},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

  const headers = ['Fecha','Descripcion','Categoria','Tipo','Fondo','Hormiga','4x1000','Monto'];
  const rows = [headers];

  S.gastos.forEach(g => {
    rows.push([
      g.fecha,
      limpiar(g.desc||''),
      limpiar(CATS[g.cat]||g.cat),
      g.tipo,
      g.fondo==='efectivo'?'Efectivo':'Banco',
      g.hormiga?'Si':'No',
      g.cuatroXMil?'Si':'No',
      g.montoTotal||g.monto
    ]);
  });

  S.historial.forEach(hx => {
    if (!hx.catMap) return;
    Object.entries(hx.catMap).forEach(([cat,monto]) => {
      rows.push([hx.mes, 'Historial: '+limpiar(hx.periodo), limpiar(CATS[cat]||cat), 'historico','—','No','No', monto]);
    });
  });

  const ws2 = XLSX.utils.aoa_to_sheet(rows);
  ws2['!cols'] = [{wch:12},{wch:32},{wch:18},{wch:12},{wch:10},{wch:9},{wch:8},{wch:14}];
  ws2['!freeze'] = {xSplit:0, ySplit:1};
  XLSX.utils.book_append_sheet(wb, ws2, 'Detalle de Gastos');

  const resumen = {};
  S.gastos.filter(g=>g.tipo!=='ahorro').forEach(g=>{
    const cat = limpiar(CATS[g.cat]||g.cat);
    resumen[cat] = (resumen[cat]||0) + (g.montoTotal||g.monto);
  });
  S.historial.forEach(hx => {
    if (!hx.catMap) return;
    Object.entries(hx.catMap).forEach(([cat,monto]) => {
      const c = limpiar(CATS[cat]||cat);
      resumen[c] = (resumen[c]||0) + monto;
    });
  });

  const catRows = [['Categoria','Total','% del gasto']];
  Object.entries(resumen).sort((a,b)=>b[1]-a[1]).forEach(([cat,monto]) => {
    const pct = tG>0 ? Math.round(monto/tG*100) : 0;
    catRows.push([cat, monto, pct+'%']);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(catRows);
  ws3['!cols'] = [{wch:22},{wch:16},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Por Categoria');

  const histRows = [['Periodo','Ingreso','Gastado','Ahorrado','Hormiga','% Ahorro','Metodo']];
  S.historial.forEach(hx => {
    const pct = hx.ingreso>0 ? Math.round(hx.ahorro/hx.ingreso*100)+'%' : '0%';
    histRows.push([limpiar(hx.periodo), hx.ingreso, hx.gastado, hx.ahorro, hx.hormiga, pct, hx.metodo]);
  });
  const ws4 = XLSX.utils.aoa_to_sheet(histRows);
  ws4['!cols'] = [{wch:28},{wch:14},{wch:14},{wch:14},{wch:12},{wch:10},{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws4, 'Historial');

  XLSX.writeFile(wb, 'FinanzasCO_'+new Date().toISOString().split('T')[0]+'.xlsx');
  sr('Excel descargado correctamente');
}

async function importarDatos(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ok = await showConfirm('¿Estás seguro de cargar este respaldo?\n\nEsto reemplazará TODOS tus datos actuales. Te recomendamos descargar un respaldo de tus datos de hoy antes de continuar.', 'Cargar Respaldo');
  if (!ok) {
    event.target.value = ''; // Resetear el input
    return;
  }
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data && data.saldos !== undefined) {
        Object.keys(S).forEach(key => delete S[key]);
        Object.assign(S, data);
        save();
        renderAll();
        go('dash');
        await showAlert('✅ Datos cargados correctamente. Tu aplicación ha sido restaurada.', 'Éxito');
      } else {
        await showAlert('El archivo no parece ser un respaldo válido de FinanzasCO.', 'Error de formato');
      }
    } catch (error) {
      await showAlert('Error al leer el archivo. Puede que esté corrupto.', 'Error');
    }
    event.target.value = ''; // Resetear el input
  };
  reader.readAsText(file);
}

const BANCOS_CO=[
  {id:'nequi',nombre:'Nequi',icono:'📱',color:'#b44eff'},
  {id:'nu',nombre:'Nu',icono:'💜',color:'#820ad1'},
  {id:'bogota',nombre:'Banco de Bogotá',icono:'🏛️',color:'#3b9eff'},
  {id:'bancolombia',nombre:'Bancolombia',icono:'🟡',color:'#ffd60a'},
  {id:'davivienda',nombre:'Davivienda',icono:'🔴',color:'#ff4444'},
  {id:'bbva',nombre:'BBVA',icono:'🔵',color:'#1a5fa0'},
  {id:'colpatria',nombre:'Scotiabank Colpatria',icono:'🏦',color:'#e63946'},
  {id:'popular',nombre:'Banco Popular',icono:'🏦',color:'#2d6a4f'},
  {id:'occidente',nombre:'Banco de Occidente',icono:'🏦',color:'#457b9d'},
  {id:'jfk',nombre:'Cooperativa JFK',icono:'🤝',color:'#00b4d8'},
  {id:'confiar',nombre:'Confiar',icono:'🤝',color:'#06d6a0'},
  {id:'cotrafa',nombre:'Cotrafa',icono:'🤝',color:'#118ab2'},
  {id:'fna',nombre:'FNA',icono:'🏠',color:'#f4a261'},
  {id:'otro',nombre:'Otro banco/entidad',icono:'🏦',color:'#888'},
];

function totalCuentas(){return S.cuentas.reduce((s,c)=>s+c.saldo,0);}

function guardarCuenta(){
  const banco=document.getElementById('cu-banco').value;
  const alias=document.getElementById('cu-alias').value.trim();
  const saldo=+document.getElementById('cu-saldo').value||0;
  if(!banco){return;}
  const info=BANCOS_CO.find(b=>b.id===banco)||{id:banco,nombre:alias||banco,icono:'🏦',color:'#888'};
  S.cuentas.push({id:Date.now(),banco:banco,nombre:alias||info.nombre,icono:info.icono,color:info.color,saldo});
  S.saldos.banco=totalCuentas();
  document.getElementById('cu-alias').value='';
  document.getElementById('cu-saldo').value='';
  closeM('m-cuenta');save();renderCuentas();updSaldo();updateDash();renderDashCuentas();
  sr('Cuenta agregada: '+( alias||info.nombre));
}

function editSaldoCuenta(id){
  const c=S.cuentas.find(x=>x.id===id);if(!c)return;
  const val=prompt(`Saldo actual de ${c.nombre}:\nIngresa el nuevo saldo:`);
  if(val===null||val==='')return;
  c.saldo=Math.max(0,+val||0);
  S.saldos.banco=totalCuentas();
  save();renderCuentas();updSaldo();updateDash();
}

async function editSaldoCuentaDash(id) {
  const c = S.cuentas.find(x => x.id === id);
  if (!c) return;
  const val = await showPrompt(
    `Saldo actual: ${f(c.saldo)}\n\nIngresa el nuevo saldo en pesos:`,
    `Editar saldo — ${c.nombre}`,
    c.saldo
  );
  if (!val) return;
  c.saldo = Math.max(0, +val || 0);
  S.saldos.banco = totalCuentas();
  save();
  renderDashCuentas();
  updSaldo();
  updateDash();
  sr(`Saldo de ${c.nombre} actualizado a ${f(c.saldo)}`);
}

async function delCuenta(id){
  const c=S.cuentas.find(x=>x.id===id);
  const ok=await showConfirm(`¿Eliminar la cuenta "${c?c.nombre:''}?`,'Eliminar cuenta');
  if(!ok)return;
  S.cuentas=S.cuentas.filter(x=>x.id!==id);
  S.saldos.banco=totalCuentas();
  save();renderCuentas();updSaldo();updateDash();
}

function renderCuentas(){
  const el=document.getElementById('cu-lst');
  if(!el)return;
  if(!S.cuentas.length){
    el.innerHTML='<div class="tm" style="padding:8px 0">Sin cuentas. Agrega tus bancos o entidades.</div>';
    return;
  }
  el.innerHTML=S.cuentas.map(c=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 13px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r1);margin-bottom:6px">
      <span style="font-size:18px">${c.icono}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${he(c.nombre)}</div>
        <div style="font-family:var(--fm);font-size:14px;font-weight:700;color:${c.color||'var(--a1)'}">${f(c.saldo)}</div>
      </div>
      <button class="btn bg bsm" onclick="editSaldoCuenta(${c.id})" title="Editar saldo">✏️</button>
      <button class="btn bd bsm" onclick="delCuenta(${c.id})">×</button>
    </div>`).join('');
  
  const sel=document.getElementById('g-fo');
  if(sel&&S.cuentas.length){
    const cur=sel.value;
    sel.innerHTML='<option value="efectivo">💵 Efectivo</option>'+
      S.cuentas.map(c=>`<option value="cuenta_${c.id}">${c.icono} ${he(c.nombre)}</option>`).join('');
    if(cur)sel.value=cur;
  }
}

function renderDashCuentas(){
  const el=document.getElementById('d-cuentas');if(!el)return;
  if(!S.cuentas.length){
    el.innerHTML='<div class="tm" style="padding:6px 0">Agrega tus cuentas en Quincena.</div>';
    return;
  }
  const total=totalCuentas();
  el.innerHTML=S.cuentas.map(c=>{
    const pct=total>0?Math.round(c.saldo/total*100):0;
    return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:14px;flex-shrink:0">${c.icono}</span>
      <div style="flex:1;min-width:0">
       <div style="display:flex;justify-content:space-between;margin-bottom:2px;align-items:center">
          <span style="font-size:11px;font-weight:500;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${he(c.nombre)}</span>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:6px">
            <span style="font-family:var(--fm);font-size:11px;font-weight:400;color:var(--a1)">${f(c.saldo)}</span>
            <button class="btn bg bsm" onclick="editSaldoCuentaDash(${c.id})" style="padding:2px 7px;font-size:11px;min-height:unset">✏️</button>
          </div>
        </div>
        <div class="pw" style="height:4px;margin-top:0"><div class="pf" style="width:${pct}%;background:${c.color||'var(--a1)'}"></div></div>
      </div>
    </div>`;
  }).join('')+`<div style="border-top:1px solid var(--b1);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--t3);font-weight:600">TOTAL CUENTAS</span><span style="font-family:var(--fm);font-weight:400;color:var(--a4)">${f(total)}</span></div>`;
}

function toggleTheme(){const isLight=document.body.classList.toggle('light-theme');const btn=document.getElementById('btn-theme');if(btn)btn.textContent=isLight?'🌙':'☀️';localStorage.setItem('fco_theme',isLight?'light':'dark');}
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const expanded = sb.classList.toggle('expanded');
  document.body.classList.toggle('sb-expanded', expanded);
  localStorage.setItem('sb_expanded', expanded);

  const icon = document.getElementById('sb-icon');
  if(icon) {
    icon.innerHTML = expanded
      ? '<rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/><line x1="11" y1="1" x2="11" y2="15" stroke="currentColor" stroke-width="1.5"/>'
      : '<rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="1" x2="5" y2="15" stroke="currentColor" stroke-width="1.5"/>';
  }
}
window.toggleSidebar = toggleSidebar;
if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/service-worker.js').then(r=>console.log('SW ok:',r.scope)).catch(e=>console.error('SW error:',e));});}
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;const b=document.getElementById('btn-install');if(b)b.style.display='flex';});
window.instalarApp=async function(){if(!deferredPrompt)return;deferredPrompt.prompt();deferredPrompt=null;};

const navM = document.querySelector('nav');
if (navM) {
  navM.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    navM.scrollLeft += evt.deltaY;
  });
}

// =========================================================
// EXPOSICIÓN GLOBAL PARA EL HTML
// =========================================================
window.go = go;
window.setPer = setPer;
window.toggleTheme = window.toggleTheme || toggleTheme; 
window.openM = openM;
window.closeM = closeM;
window.showAlert = showAlert;
window.showConfirm = showConfirm;
window._cdlgRes = window._cdlgRes || _cdlgRes; 

window.guardarQ = guardarQ;
window.resetTodo = resetTodo;
window.resetQuincena = resetQuincena;
window.onMetCh = onMetCh;
window.selM = selM;
window.calcDist = calcDist;

window.agregarGasto = agregarGasto;
window.delGasto = delGasto;
window.abrirEditarGasto = abrirEditarGasto;
window.guardarEditarGasto = guardarEditarGasto;
window.limpiarGastos = limpiarGastos;
window.prev4k = prev4k;

window.guardarFijo = guardarFijo;
window.toggleFijo = toggleFijo;
window.desmFijo = desmFijo;
window.delFijo = delFijo;
window.marcarFijo = marcarFijo;
window.abrirModalFijo = abrirModalFijo;
window.cerrarModalFijo = cerrarModalFijo;
window.ejecutarPagoFijo = ejecutarPagoFijo;

window.guardarMeta = guardarMeta;
window.openAbo = openAbo;
window.abonarMeta = abonarMeta;
window.delMeta = delMeta;

window.guardarDeuda = guardarDeuda;
window.abrirPagarCuota = abrirPagarCuota;
window.confPagarCuota = confPagarCuota;
window.delDeu = delDeu;

window.guardarProyecto = guardarProyecto;
window.openGProy = openGProy;
window.agregarGastoProy = agregarGastoProy;
window.openAhoProy = openAhoProy;
window.abonarProy = abonarProy;
window.resetMetaProy = resetMetaProy;
window.delProy = delProy;

window.guardarPago = guardarPago;
window.marcarPagado = marcarPagado;
window.delPago = delPago;

window.toggleCalc = toggleCalc;
window.cCDT = window.cCDT || (()=>console.log('cCDT'));
window.cCre = window.cCre || (()=>console.log('cCre'));
window.cIC = window.cIC || (()=>console.log('cIC'));
window.cMeta = window.cMeta || (()=>console.log('cMeta'));
window.cRet = window.cRet || (()=>console.log('cRet'));
window.cGMF = window.cGMF || (()=>console.log('cGMF'));

window.exportarDatos = exportarDatos;
window.exportarCSV = exportarCSV;
window.cerrarQ = cerrarQ;

window.importarDatos = importarDatos;
window.guardarCuenta = guardarCuenta;
window.descargarCSVDirecto = descargarCSVDirecto;
window.editSaldoCuenta = editSaldoCuenta;
window.editSaldoCuentaDash = editSaldoCuentaDash;
window.delCuenta = delCuenta;
window.renderGastos = renderGastos;