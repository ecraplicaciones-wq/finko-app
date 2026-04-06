// storage.js
'use strict';

// Traemos el estado centralizado
import { S } from './state.js';

const memoryStore = {};

const storage = {
  get(key) { 
    try { 
      return window.localStorage ? localStorage.getItem(key) : memoryStore[key] || null; 
    } catch(e) { 
      return memoryStore[key] || null; 
    } 
  },
  set(key, val) { 
    try { 
      if (window.localStorage) localStorage.setItem(key, val); 
      else memoryStore[key] = val; 
    } catch(e) { 
      memoryStore[key] = val; 
    } 
  },
  remove(key) { 
    try { 
      if (window.localStorage) localStorage.removeItem(key); 
      delete memoryStore[key]; 
    } catch(e) { 
      delete memoryStore[key]; 
    } 
  }
};

// Esta función se encarga de rellenar el estado con valores por defecto si faltan datos
function hydrateState(d) {
  const S_actualizado = {
    tipoPeriodo: d.tipoPeriodo || 'q1',
    quincena: d.quincena || 1,
    ingreso: d.ingreso || 0,
    metodo: d.metodo || '50-30-20',
    saldos: d.saldos || { efectivo: 0, banco: 0 },
    gastos: d.gastos || [],
    metas: d.metas || [],
    deudas: d.deudas || [],
    historial: d.historial || [],
    gastosFijos: (d.gastosFijos || []).map(function(g) { 
      return Object.assign({ fondo: 'banco', tipo: 'necesidad', cuatroXMil: false }, g); 
    }),
    cuentas: d.cuentas || [],
    pagosAgendados: d.pagosAgendados || [],
    proyectos: (d.proyectos || []).map(function(p) { 
      return Object.assign({}, p, { 
        ahorro: Object.assign({ objetivo: 0, actual: 0, fechaMeta: '', abonos: [], activo: false }, p.ahorro || {}) 
      }); 
    }),
    fondoEmergencia: d.fondoEmergencia || { objetivoMeses: 6, actual: 0 }
  };

  Object.assign(S, S_actualizado);
}

// Exportamos la función para que main.js pueda llamarla al iniciar
export function loadData() {
  const stored = storage.get('fco_v4'); // Clave de almacenamiento
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      hydrateState(parsed);
    } catch (e) {
      console.error('Error al parsear los datos guardados', e);
    }
  }
}

// Exportamos la función para que main.js pueda guardar cada vez que haya un cambio
export function save() {
  storage.set('fco_v4', JSON.stringify(S));
}

// Exponemos las funciones al objeto window por si las necesitas desde la consola o HTML
window.loadData = loadData;
window.save = save;
