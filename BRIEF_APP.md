# Finko Pro - Brief

## ¿Qué es?
PWA de finanzas personales para Colombia. App web instalable que funciona offline.

## Stack técnico
- Vanilla JavaScript (sin frameworks)
- localStorage para guardar datos
- Service Worker para funcionamiento offline
- CSS puro, tema claro/oscuro

## Secciones principales (11)
1. Dashboard - resumen finanzas
2. Planificar - metas y presupuesto
3. Gastos - registro diario
4. Fijos - gastos fijos mensuales
5. Objetivos - metas de ahorro
6. Inversiones - rendimiento, portafolio
7. Deudas - gestión con métodos avalancha/bola nieve
8. Me Deben - deudas entre amigos/familia
9. Agenda - recordatorios de pago
10. Estadísticas - gráficos y análisis
11. Historial - log de todas las transacciones

## Modelo financiero
- Mercado: Colombia
- Períodos: Quincenas (1-15, 16-31)
- Regulaciones: GMF, Datacrédito, DIAN, Ley 1266
- Tasas en E.A. (Efectivo Anual)

## Base de datos
Un objeto llamado `S` (state) en localStorage con estructura:
- usuarios
- transacciones
- deudas
- inversiones
- metas
- configuración (tema, preferencias)

## Archivo actual a dividir
main.js - 3490 líneas → 21 módulos en carpeta /modules