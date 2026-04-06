// ui.js
'use strict';

export function trapModalFocus(ev) {
  const open = document.querySelector('.modal-ov.open');
  if(!open || ev.key !== 'Tab') return;
  
  const focusables = open.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if(!focusables.length) return;
  
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  
  if(ev.shiftKey && document.activeElement === first) { 
    ev.preventDefault(); 
    last.focus(); 
  }
  else if(!ev.shiftKey && document.activeElement === last) { 
    ev.preventDefault(); 
    first.focus();
  }
}

export function bindGlobalKeyboard() {
  window.addEventListener('keydown', e => {
    if(e.key === 'Escape') {
      document.querySelectorAll('.modal-ov.open').forEach(ov => ov.classList.remove('open'));
      const cdlg = document.getElementById('cdlg-ov');
      if(cdlg?.classList.contains('open') && typeof window._cdlgRes === 'function') {
        window._cdlgRes(false);
      }
    }
    trapModalFocus(e);
  });
}

// Exponemos la función globalmente
window.bindGlobalKeyboard = bindGlobalKeyboard;

// Inicialización automática de los eventos de teclado
window.addEventListener('DOMContentLoaded', () => {
  bindGlobalKeyboard();
});
// Función para calcular la salud del Fondo de Emergencia
export function calcularFondoEmergencia() {
  // 1. Sumamos el valor de todos los gastos fijos
  // Asumiendo que la app maneja montos quincenales o mensuales en gastosFijos,
  // adaptaremos esto para proyectar el gasto mensual real.
  const gastoMensualFijo = S.gastosFijos.reduce((acc, gasto) => {
    // Si el gasto es quincenal lo multiplicamos por 2, si es mensual se queda igual.
    // Ajusta esta lógica según cómo guardes la frecuencia en tu array de gastosFijos.
    const montoMensual = gasto.quincenal ? gasto.monto * 2 : gasto.monto;
    return acc + montoMensual;
  }, 0);

  const montoObjetivoTotal = gastoMensualFijo * S.fondoEmergencia.objetivoMeses;
  const porcentajeCompletado = montoObjetivoTotal > 0 
    ? (S.fondoEmergencia.actual / montoObjetivoTotal) * 100 
    : 0;
    
  const mesesCubiertos = gastoMensualFijo > 0 
    ? S.fondoEmergencia.actual / gastoMensualFijo 
    : 0;

  return {
    gastoMensualFijo,
    montoObjetivoTotal,
    porcentajeCompletado: Math.min(porcentajeCompletado, 100).toFixed(1),
    mesesCubiertos: mesesCubiertos.toFixed(1)
  };
}

// Recuerda exponerla a window si la invocarás desde el HTML directamente
window.calcularFondoEmergencia = calcularFondoEmergencia;
