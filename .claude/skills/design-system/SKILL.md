---
name: design-system
description: Usar siempre que se cree o edite cualquier componente, página o estilo en apps/web. Contiene los tokens de color, tipografía y reglas de componentes del proyecto Finance Nomad. Disparadores — crear un componente nuevo, agregar una pantalla, tocar globals.css o tailwind.config.
---

Ver docs/design-system.md completo. Resumen ejecutable:

- Tokens de color en apps/web/app/globals.css, nunca hex hardcodeado en
  componentes.
- Montos monetarios: font-family IBM Plex Mono, font-variant-numeric: tabular-nums.
- Radios: cards 16px, controles 10px, chips/badges pill (999px).
- Un solo botón primario (--accent) por pantalla; el resto secundarios.
- Mobile: tab bar inferior de 5 ítems + bottom sheet full-screen para el
  formulario de transacción. Web: sidebar fija + modal centrado 480px.
- Breakpoints: sm 375 / md 768 / lg 1024 / xl 1440.
