// state.js
'use strict';

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
  gastosFijos: [], 
  cuentas: [],
  pagosAgendados: [],
  proyectos: [],
  inversiones: [],
  fondoEmergencia: {
    objetivoMeses: 6, // El estándar recomendado de meses a cubrir
    actual: 0         // Dinero real acumulado para este fondo
  }
};

window.S = S;
