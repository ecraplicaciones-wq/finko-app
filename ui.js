// ==========================================================================
// ARCHIVO: ui.js 
// OBJETIVO: Controlar el comportamiento de la app ante el uso del teclado
// para mejorar la Accesibilidad (a11y) y la experiencia de usuario (UX).
// ==========================================================================

'use strict'; // Mantiene el código seguro y estricto

// =========================================================
// 1. TRAMPA DE FOCO PARA VENTANAS EMERGENTES (MODALES)
// =========================================================
// Función: Evita que el usuario seleccione cosas invisibles detrás de un modal 
// cuando navega usando la tecla "Tab" (Tabulador).
export function trapModalFocus(ev) {
  // Busca si hay alguna ventana abierta en este momento
  const open = document.querySelector('.modal-ov.open');
  
  // Si no hay ventanas abiertas o la tecla presionada NO es 'Tab', ignorar
  if(!open || ev.key !== 'Tab') return;
  
  // Busca todos los elementos interactivos dentro de la ventana abierta
  const focusables = open.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if(!focusables.length) return;
  
  const first = focusables[0]; // Primer elemento (Ej: un input)
  const last = focusables[focusables.length - 1]; // Último elemento (Ej: el botón de cerrar)
  
  // Si presiona 'Shift + Tab' (Retroceder) estando en el primer elemento, lo envía al último
  if(ev.shiftKey && document.activeElement === first) { 
    ev.preventDefault(); 
    last.focus(); 
  }
  // Si presiona solo 'Tab' (Avanzar) estando en el último elemento, lo regresa al primero
  else if(!ev.shiftKey && document.activeElement === last) { 
    ev.preventDefault(); 
    first.focus(); 
  }
}

// =========================================================
// 2. ATAJOS DE TECLADO GLOBALES
// =========================================================
// Función: Escucha el teclado en toda la aplicación para ejecutar atajos.
export function bindGlobalKeyboard() {
  window.addEventListener('keydown', e => {
    
    // Si el usuario presiona la tecla 'Escape' (Esc)
    if(e.key === 'Escape') {
      // 1. Cierra cualquier modal normal que esté abierto
      document.querySelectorAll('.modal-ov.open').forEach(ov => ov.classList.remove('open'));
      
      // 2. Cierra las alertas personalizadas del sistema (Coach / Confirmaciones)
      const cdlg = document.getElementById('cdlg-ov');
      if(cdlg?.classList.contains('open') && typeof window._cdlgRes === 'function') {
        window._cdlgRes(false);
      }
    }
    
    // Ejecutamos la validación de la trampa de foco en cada pulsación
    trapModalFocus(e);
  });
}

// =========================================================
// 3. INICIALIZACIÓN
// =========================================================
// Exponemos la función a la ventana global por si se necesita
window.bindGlobalKeyboard = bindGlobalKeyboard;

// Cuando el HTML termina de cargar, activamos los atajos de teclado
window.addEventListener('DOMContentLoaded', () => { 
  bindGlobalKeyboard(); 
});