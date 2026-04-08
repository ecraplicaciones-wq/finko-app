// ==========================================================================
// ARCHIVO: theme.js 
// OBJETIVO: Manejar el modo visual (Claro / Oscuro) de la aplicación.
// ==========================================================================

'use strict'; // Modo estricto para evitar errores silenciosos

// =========================================================
// 1. APLICAR TEMA
// =========================================================
// Función: Aplica el tema seleccionado y cambia el emoji del botón (Sol/Luna)
export function applyTheme(theme) {
  const isLight = theme === 'light';
  
  // classList.toggle agrega la clase 'light-theme' si isLight es true, o la quita si es false.
  // En tu style.css, esta clase es la que invierte todos los colores.
  document.body.classList.toggle('light-theme', isLight);
  
  // Actualizamos el ícono del botón en el menú lateral
  const btn = document.getElementById('btn-theme');
  if (btn) {
    const ni = btn.querySelector('.ni');
    if (ni) ni.textContent = isLight ? '🌙' : '☀️';
  }
  
  // Guardamos la preferencia en la memoria del navegador para la próxima vez que abra la app
  localStorage.setItem('fco_theme', theme);
}

// =========================================================
// 2. DETECTAR TEMA PREFERIDO
// =========================================================
// Función: Detecta el tema la primera vez que el usuario abre la app
export function getPreferredTheme() {
  // Revisa si ya el usuario había guardado una preferencia manual antes
  const saved = localStorage.getItem('fco_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  
  // Si es la primera vez que entra, le preguntamos al sistema operativo 
  // (Windows, Mac, iOS, Android) si el dispositivo está en modo claro u oscuro.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// =========================================================
// 3. ALTERNAR TEMA (INTERRUPTOR)
// =========================================================
// Función: Cambia de claro a oscuro y viceversa cuando el usuario hace clic
export function toggleTheme() {
  // Revisa si el 'body' tiene la clase 'light-theme' puesta y manda a aplicar la contraria
  applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
}

// =========================================================
// 4. EXPOSICIÓN GLOBAL A WINDOW (HTML)
// =========================================================
// Exponemos las funciones a 'window' para que los botones del HTML (onclick) puedan usarlas
window.applyTheme = applyTheme;
window.getPreferredTheme = getPreferredTheme;
window.toggleTheme = toggleTheme;