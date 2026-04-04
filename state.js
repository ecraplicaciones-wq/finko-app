// state.js
'use strict';

// Exportamos la constante S para que otros archivos puedan importarla
export const S = {
  tipoPeriodo: 'q1',
  quincena: 1,
  ingreso: 0,
  metodo: '50-30-20',
  saldos: { efectivo: 0, banco: 0 },
  gastos: [],
  metas: [],
  deudas: [],
  historial: [],
  gastosFijos: [], // Aseguramos que el nombre coincide con el que usas en main.js
  cuentas: [],
  pagosAgendados: [],
  proyectos: []
};

// Exponemos S al objeto window (opcional, pero muy útil si quieres 
// abrir la consola del navegador F12 y escribir "S" para ver tus datos en vivo)
window.S = S;