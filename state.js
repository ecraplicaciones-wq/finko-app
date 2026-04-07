// ==========================================================================
// ARCHIVO: state.js
// OBJETIVO: Manejar el "Estado Global" (State) de la aplicación.
// Aquí se define la "caja organizadora" vacía de Finko Pro. 
// ==========================================================================

'use strict'; 

// Exportamos la constante 'S' (State). 
export const S = {
  
  // --- CONFIGURACIÓN DE LA QUINCENA ---
  tipoPeriodo: 'q1', 
  quincena: 1,       
  ingreso: 0,        
  metodo: '50-30-20',
  
  // --- SALDOS DISPONIBLES ---
  saldos: { 
    efectivo: 0,     
    banco: 0         
  },
  
  // --- LISTAS DE DATOS (ARREGLOS) ---
  gastos: [],          // Historial de gastos de la quincena
  
  // 🎯 MEJORA: Lista unificada de Objetivos (Reemplaza a Metas y Proyectos)
  objetivos: [],       
  
  deudas: [],          // Tarjetas, créditos
  modoDeuda: 'avalancha', // 🧠 MEJORA: Guarda la estrategia elegida en el Coach de Deudas
  
  historial: [],       // Resúmenes de quincenas cerradas
  gastosFijos: [],     // Gastos recurrentes
  cuentas: [],         // Cuentas bancarias individuales
  pagosAgendados: [],  // Calendario de pagos
  inversiones: [],     // Portafolio de inversiones
  
  // --- MÓDULOS ESPECIALES ---
  fondoEmergencia: {
    objetivoMeses: 6,  
    actual: 0          
  }
};

// Adjuntamos el objeto 'S' a 'window' para poder leerlo desde la consola del navegador (F12)
window.S = S;