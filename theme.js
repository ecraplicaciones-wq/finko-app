// theme.js
'use strict';

export function applyTheme(theme) {
  const light = theme === 'light';
  document.body.classList.toggle('light-theme', light);
  const btn = document.getElementById('btn-theme');
  if (btn) {
    const ni = btn.querySelector('.ni');
    // Actualizamos SOLO el contenedor del ícono para no borrar el texto del menú
    if (ni) ni.textContent = light ? '🌙' : '☀️';
  }
  localStorage.setItem('fco_theme', theme);
}

export function getPreferredTheme() {
  const saved = localStorage.getItem('fco_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function toggleTheme() {
  applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
}

// Exponemos las funciones al entorno global
window.applyTheme = applyTheme;
window.getPreferredTheme = getPreferredTheme;
window.toggleTheme = toggleTheme;