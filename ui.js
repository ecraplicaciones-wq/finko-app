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