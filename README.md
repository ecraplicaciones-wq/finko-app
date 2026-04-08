# Finko Pro 🚀

**Finko Pro** es una Progressive Web App (PWA) de gestión financiera personal, diseñada para ofrecer herramientas avanzadas de finanzas sin depender de bases de datos externas. Toda la información es 100% privada y se procesa localmente en el dispositivo del usuario.

## ✨ Características Principales

* **Coach de Deudas Integrado:** Organiza automáticamente tus deudas sugiriendo el pago mediante el método *Avalancha* (matemáticamente óptimo) o *Bola de Nieve* (psicológicamente motivador).
* **Semáforo de Presupuesto en Tiempo Real:** Calcula instantáneamente el presupuesto disponible según la regla 50/30/20 y lanza alertas de colores (Verde/Naranja/Rojo) *antes* de confirmar una compra.
* **Objetivos Unificados:** Manejo dual de "Ahorro Simple" (ej: fondos) y "Eventos Planeados" (ahorrar el dinero y luego ir descontándolo con los gastos del viaje/evento).
* **Impacto de Gasto Hormiga:** Traduce un pequeño gasto diario a su impacto anual para concientizar al usuario.
* **Alerta Temprana DIAN:** Suma los ingresos del historial y alerta cuando el usuario se acerca al tope para declarar renta (Configurado para topes de Colombia).
* **100% Offline y Privado:** Desarrollado como PWA con un Service Worker robusto. Ningún dato sale del dispositivo.

## 🛠️ Arquitectura Técnica

Finko Pro está construido utilizando **Vanilla JavaScript (ES6+), HTML5 y CSS3 moderno** sin frameworks pesados, aplicando las mejores prácticas de modularidad:

* `state.js`: Gestor del estado global (Single Source of Truth).
* `storage.js`: Motor de hidratación y migración inteligente vía `localStorage`.
* `main.js`: Lógica de negocio, matemáticas financieras y manipulación del DOM.
* `theme.js` & `ui.js`: Control de modo oscuro/claro y accesibilidad por teclado.
* `style.css`: Sistema de diseño basado en CSS Grid, Flexbox y Custom Properties (Tokens de color).

## 🚀 Cómo ejecutar el proyecto

1. Descarga o clona el repositorio.
2. Abre la carpeta del proyecto en tu editor de código (ej. VS Code).
3. Utiliza una extensión como **Live Server** para lanzar el `index.html`.
4. ¡Disfruta Finko Pro desde tu navegador o instálalo en tu celular desde el menú de Chrome/Safari!