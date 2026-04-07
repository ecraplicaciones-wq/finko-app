// ==========================================================================
// ARCHIVO: storage.js
// OBJETIVO: Gestionar el guardado y la carga de datos en el dispositivo.
// MAGIA: Usa 'localStorage' del navegador para que los datos no se pierdan.
// Además, tiene un sistema de "migración" para no perder datos viejos.
// ==========================================================================

'use strict'; // Obliga a usar JavaScript moderno y seguro

// Importamos el estado central (la caja vacía) de la aplicación
import { S } from './state.js';

// =========================================================
// 1. SISTEMA DE ALMACENAMIENTO SEGURO (PLAN B)
// =========================================================
// Creamos una "memoria temporal" por si el navegador bloquea el localStorage
// (Esto pasa si el usuario usa Modo Incógnito estricto o tiene la memoria llena).
const memoryStore = {};

const storage = {
  // Función para OBTENER datos
  get(key) { 
    try { 
      // Intenta leer del disco duro del navegador. Si falla, usa la memoria temporal.
      return window.localStorage ? localStorage.getItem(key) : memoryStore[key] || null; 
    } 
    catch(e) { 
      return memoryStore[key] || null; 
    } 
  },
  
  // Función para GUARDAR datos
  set(key, val) { 
    try { 
      if (window.localStorage) localStorage.setItem(key, val); 
      else memoryStore[key] = val; 
    } 
    catch(e) { 
      memoryStore[key] = val; 
    } 
  },
  
  // Función para BORRAR datos
  remove(key) { 
    try { 
      if (window.localStorage) localStorage.removeItem(key); 
      delete memoryStore[key]; 
    } 
    catch(e) { 
      delete memoryStore[key]; 
    } 
  }
};

// =========================================================
// 2. HIDRATACIÓN DEL ESTADO (HYDRATE & MIGRATE)
// =========================================================
// Esta función toma el texto guardado en el navegador, lo convierte en 
// datos vivos y rellena el archivo state.js.
function hydrateState(d) {
  
  // 🎯 MIGRACIÓN INTELIGENTE DE OBJETIVOS:
  // Convierte las viejas "Metas" y "Proyectos" al nuevo formato unificado "Objetivos".
  let objetivosMigrados = d.objetivos ? d.objetivos : [];
  
  // 1. Rescatar Metas Viejas -> Convertir a "Ahorro Simple"
  if (!d.objetivos && d.metas && d.metas.length > 0) {
    const metasConvertidas = d.metas.map(m => ({
      id: m.id, 
      nombre: m.nombre, 
      icono: m.icono || '🎯', 
      tipo: 'ahorro',
      objetivoAhorro: m.objetivo || 0, 
      ahorrado: m.actual || 0, 
      fecha: m.fecha || '',
      presupuesto: 0, 
      gastado: 0, 
      gastos: []
    }));
    objetivosMigrados = [...objetivosMigrados, ...metasConvertidas];
  }
  
  // 2. Rescatar Proyectos Viejos -> Convertir a "Eventos Planeados"
  if (!d.objetivos && d.proyectos && d.proyectos.length > 0) {
    const proyectosConvertidos = d.proyectos.map(p => ({
      id: p.id, 
      nombre: p.nombre, 
      icono: p.icono || '🚀', 
      tipo: 'evento',
      objetivoAhorro: p.ahorro ? p.ahorro.objetivo : 0,
      ahorrado: p.ahorro ? p.ahorro.actual : 0,
      fecha: p.ahorro ? p.ahorro.fechaMeta : '',
      presupuesto: p.presupuesto || 0,
      gastado: (p.gastos || []).reduce((s,g) => s + g.monto, 0),
      gastos: p.gastos || []
    }));
    objetivosMigrados = [...objetivosMigrados, ...proyectosConvertidos];
  }

  // =========================================================
  // 3. CONSTRUCCIÓN DEL ESTADO ACTUALIZADO
  // =========================================================
  // Si el dato existe en el disco duro (d), lo usamos. Si no existe (||), 
  // le ponemos un valor por defecto para que la app nunca crashee.
  const S_actualizado = {
    tipoPeriodo: d.tipoPeriodo || 'q1',
    quincena: d.quincena || 1,
    ingreso: d.ingreso || 0,
    metodo: d.metodo || '50-30-20',
    saldos: d.saldos || { efectivo: 0, banco: 0 },
    gastos: d.gastos || [],
    
    // Inyectamos nuestra lista migrada y unificada
    objetivos: objetivosMigrados,
    
    deudas: d.deudas || [],
    modoDeuda: d.modoDeuda || 'avalancha', // Coach de Deudas
    historial: d.historial || [],
    
    // Actualización silenciosa de Gastos Fijos (agrega propiedades faltantes)
    gastosFijos: (d.gastosFijos || []).map(function(g) { 
      return Object.assign({ fondo: 'banco', tipo: 'necesidad', cuatroXMil: false, periodicidad: 'mensual' }, g); 
    }),
    
    cuentas: d.cuentas || [],
    pagosAgendados: d.pagosAgendados || [],
    inversiones: d.inversiones || [],
    fondoEmergencia: d.fondoEmergencia || { objetivoMeses: 6, actual: 0 }
  };

  // Reemplaza los datos vacíos de state.js con los datos reales que acabamos de armar
  Object.assign(S, S_actualizado);
}

// =========================================================
// 4. FUNCIONES PRINCIPALES EXPORTADAS
// =========================================================

// Función que se ejecuta al abrir la app para cargar todo
export function loadData() {
  const stored = storage.get('fco_v4'); // fco_v4 es el nombre del archivo en el navegador
  if (stored) {
    try {
      // Convierte el texto JSON en un objeto vivo de JavaScript
      const parsed = JSON.parse(stored);
      hydrateState(parsed);
    } catch (e) { 
      console.error('Error crítico al leer los datos del navegador:', e); 
    }
  }
}

// Función que se ejecuta cada vez que agregas o borras un gasto/meta
export function save() { 
  storage.set('fco_v4', JSON.stringify(S)); 
}

// Exponemos las funciones al HTML por si se necesitan usar directamente
window.loadData = loadData;
window.save = save;