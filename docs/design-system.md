# Sistema de diseño — Finance Nomad

Documento de referencia único. Cualquier pantalla nueva se construye leyendo esto, no reinventando.

---

## 1. Principios

1. **Carga en 3 segundos.** El formulario universal es la pantalla más usada de la app — cada campo de más es fricción. Valores por defecto inteligentes (fecha hoy, persona "Personal", moneda de la cuenta seleccionada) antes que campos vacíos.
2. **Mobile-first, web es el mismo sistema ampliado.** No se diseñan dos apps — se diseña un layout de 1 columna que en pantallas anchas gana una barra lateral y grillas de 2-3 columnas. Ningún componente cambia de forma entre plataformas, solo de densidad.
3. **Calma, no ansiedad.** Es una app de plata usada por alguien viviendo con incertidumbre migratoria — nada de rojos agresivos gritando "estás gastando de más", nada de gamificación de metas. Los negativos se muestran con color, no con alarmismo.
4. **Los números mandan, el resto es contexto.** Toda cifra monetaria va en tipografía monoespaciada con tabular-nums — así se puede escanear una columna de montos sin leer cada uno.
5. **Identidad "en tránsito".** El signo distintivo del producto es tratar los saldos como un panel de salidas de aeropuerto: cifras en mono sobre un chip oscuro, mismo lenguaje visual que ya usás en tu contenido de Instagram — sobrio, no motivacional.

---

## 2. Color

Dos temas completos, no solo "modo oscuro invertido" — cada uno tunado por separado.

### Tokens

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--surface-0` | `#F5F5F2` | `#10161F` | Fondo de página |
| `--surface-1` | `#FFFFFF` | `#171F2B` | Cards, inputs |
| `--surface-2` | `#FFFFFF` + borde | `#1D2634` | Cards elevadas, modales |
| `--text-primary` | `#1A1D22` | `#EDEFF2` | Texto principal |
| `--text-secondary` | `#5B5F66` | `#9CA3AE` | Labels, subtítulos |
| `--text-muted` | `#93969C` | `#6B7280` | Placeholders, hints |
| `--border` | `#E2E1DC` | `#2A3340` | Líneas divisorias |
| `--accent` | `#C4791E` | `#F0B454` | Acciones primarias, foco |
| `--on-accent` | `#FFFFFF` | `#1A1200` | Texto sobre accent |
| `--income` | `#1F8A6F` | `#3FBE9B` | Ingresos, saldos a favor |
| `--expense` | `#B84438` | `#E17364` | Gastos, deuda |
| `--pending` | `#6E6AA6` | `#9D98D6` | Cuotas pendientes, "en tránsito" |

```css
:root {
  --surface-0: #F5F5F2; --surface-1: #FFFFFF; --surface-2: #FFFFFF;
  --text-primary: #1A1D22; --text-secondary: #5B5F66; --text-muted: #93969C;
  --border: #E2E1DC; --accent: #C4791E; --on-accent: #FFFFFF;
  --income: #1F8A6F; --expense: #B84438; --pending: #6E6AA6;
  --radius-card: 16px; --radius-control: 10px;
}
[data-theme="dark"] {
  --surface-0: #10161F; --surface-1: #171F2B; --surface-2: #1D2634;
  --text-primary: #EDEFF2; --text-secondary: #9CA3AE; --text-muted: #6B7280;
  --border: #2A3340; --accent: #F0B454; --on-accent: #1A1200;
  --income: #3FBE9B; --expense: #E17364; --pending: #9D98D6;
}
```

**Regla de uso:** `--income`/`--expense` solo tocan el número y un ícono pequeño (flecha), nunca el fondo entero de una fila — evita que el feed se vea como un semáforo.

---

## 3. Tipografía

| Rol | Fuente | Peso | Tamaño (mobile / web) |
|---|---|---|---|
| Montos grandes (patrimonio, balance) | `IBM Plex Mono` | 500 | 28px / 34px, `font-variant-numeric: tabular-nums` |
| Montos en filas/listas | `IBM Plex Mono` | 400 | 15px / 15px |
| Títulos de pantalla (H1) | `Space Grotesk` | 500 | 20px / 24px |
| Subtítulos de sección (H2) | `Space Grotesk` | 500 | 16px / 18px |
| Cuerpo, labels, botones | `Inter` | 400 / 500 | 14–15px |
| Captions, metadata | `Inter` | 400 | 12–13px |

Stack de fallback: `'IBM Plex Mono', ui-monospace, monospace` / `'Space Grotesk', 'Inter', system-ui, sans-serif`.

---

## 4. Espaciado y componentes base

- **Radios:** cards y modales `16px` · inputs, botones, selects `10px` · chips y badges `999px` (pill).
- **Grilla de espaciado:** 4 / 8 / 12 / 16 / 24 / 32px. Padding interno de card: `16px` mobile, `20px` web.
- **Bordes:** `1px solid var(--border)` — nunca sombras para separar superficies, solo borde + diferencia de `surface`.
- **Botón primario:** fondo `--accent`, texto `--on-accent`, radio `10px`, altura `44px` (mobile) / `40px` (web). Máximo uno por pantalla.
- **Botón secundario:** transparente, borde `1px solid var(--border)`, texto `--text-primary`.
- **Chip de persona/categoría:** pill, seleccionado = fondo `--accent` al 15% + texto `--accent`; no seleccionado = borde `--border` + texto `--text-secondary`.
- **Badge de estado:** "Pendiente" = `--pending` sobre fondo al 12%; "Pagado"/"Cobrado" = `--income` sobre fondo al 12%.
- **Inputs:** altura `44px`, fondo `--surface-1`, borde `--border`, foco = borde `--accent` + `box-shadow: 0 0 0 3px` accent al 20%.

---

## 5. Navegación — mobile vs. web

**Mobile (< 768px):** tab bar inferior fija, 5 ítems: `Inicio · Cuentas · + (acción central, FAB) · Movimientos · Más`. "Más" despliega Personas, Presupuesto, Préstamos, Portafolio, Ajustes. El formulario universal se abre como bottom sheet full-screen, no modal centrado.

**Web (≥ 1024px):** sidebar fija izquierda con los mismos ítems sin colapsar (no hace falta el menú "Más" — hay lugar para los 9). Contenido central en grilla de hasta 3 columnas para cards de cuentas. El formulario universal se abre como panel modal centrado de 480px, no bottom sheet.

**Tablet (768–1023px):** sidebar colapsada a solo íconos, mismo contenido central que web a 2 columnas.

Breakpoints: `sm 375px` (mobile base) · `md 768px` · `lg 1024px` · `xl 1440px`.

---

## 6. Inventario de pantallas

| Pantalla | Ruta | Mobile | Web |
|---|---|---|---|
| Dashboard | `/dashboard` | Scroll vertical: balance → acciones → presupuesto → cuentas (2 col) → feed | 3 columnas: balance+presupuesto / cuentas / feed, lado a lado |
| Cuentas y bancos | `/accounts` | Acordeón por institución | Tabla con acordeón, saldo alineado a la derecha en mono |
| Detalle de cuenta | `/accounts/[id]` | Header + feed filtrado + botón flotante "Ajuste express" | Header + feed + panel lateral con gráfico de evolución |
| Formulario de transacción | `/transactions/new` | Bottom sheet full-screen | Modal centrado 480px |
| Personas | `/people` | Lista con saldo pendiente a la derecha | Grilla de cards 3 columnas |
| Ficha de persona | `/people/[id]` | Header + historial + botón "Notificar por WhatsApp" | Igual + panel de cuotas futuras a la derecha |
| Presupuesto | `/budget` | Lista de estimados con barra de progreso c/u | Tabla comparativa real vs. proyectado |
| Préstamos | `/loans` | Cards apiladas con VTO próximo destacado | Tabla de amortización completa visible sin scroll |
| Portafolio | `/portfolio` | Lista de tickers, tap para expandir P&L | Tabla con columnas fijas + gráfico de asignación |

---

## 7. Textos estáticos (copy deck)

**Tono:** vos, rioplatense, directo, verbo primero, sin exclamaciones, sin "por favor". Los montos nunca se redondean en el texto — se muestran con la precisión real.

### Navegación

| Clave | Texto |
|---|---|
| nav.home | Inicio |
| nav.accounts | Cuentas |
| nav.transactions | Movimientos |
| nav.people | Personas |
| nav.budget | Presupuesto |
| nav.loans | Préstamos |
| nav.portfolio | Portafolio |
| nav.more | Más |
| nav.settings | Ajustes |

### Acciones

| Clave | Texto |
|---|---|
| action.new_transaction | Cargar movimiento |
| action.new_expense | Gasto |
| action.new_income | Ingreso |
| action.transfer | Transferencia |
| action.card_payment | Pago tarjeta |
| action.express_adjust | Ajuste express |
| action.save_transaction | Guardar transacción |
| action.register_collection | Registrar cobro |
| action.notify_whatsapp | Notificar por WhatsApp |
| action.execute_payment | Ejecutar pago |
| action.register_loan_payment | Registrar pago de cuota |
| action.edit_rate | Editar |
| action.forgot_password | Olvidé la contraseña |
| action.send_reset_link | Mandar link |
| action.send_reset_link_settings | Mandar link de restablecimiento |
| action.save_password | Guardar contraseña |
| action.create_institution | Crear institución |
| action.deactivate_institution | Desactivar institución |
| action.reactivate_institution | Reactivar institución |
| action.deactivate_account | Desactivar cuenta |
| action.reactivate_account | Reactivar cuenta |

### Estados vacíos

| Clave | Texto |
|---|---|
| empty.transactions | Todavía no cargaste movimientos este mes. Cargá el primero. |
| empty.people | No tenés gastos compartidos activos. |
| empty.budget | Definí tus gastos fijos para ver el avance del mes. |
| empty.portfolio | Todavía no registraste inversiones. |
| empty.institutions | No tenés instituciones activas. Creá una para empezar a cargar cuentas. |

### Confirmaciones

| Clave | Texto |
|---|---|
| confirm.transaction_saved | Movimiento guardado |
| confirm.collection_registered | Cobro registrado |
| confirm.payment_executed | Pago ejecutado |
| confirm.adjustment_created | Ajuste creado |
| confirm.reset_email_sent | Te mandamos un link al email para restablecer la contraseña. |
| confirm.password_updated | Contraseña actualizada |

### Errores

| Clave | Texto |
|---|---|
| error.rate_unavailable | No pudimos obtener el tipo de cambio. Ingresalo a mano. |
| error.required_field | Completá este campo para continuar. |
| error.sync_failed | No se pudo sincronizar. Revisá tu conexión y volvé a intentar. |
| error.invalid_amount | El monto tiene que ser mayor a cero. |
| error.login_failed | No pudimos iniciar sesión. Revisá el email y la contraseña. |
| error.signup_failed | No pudimos crear la cuenta. Revisá el email e intentá de nuevo. |
| error.reset_failed | No pudimos enviar el link. Revisá el email e intentá de nuevo. |
| error.password_update_failed | No pudimos actualizar la contraseña. Intentá de nuevo. |
| error.password_mismatch | Las contraseñas no coinciden. |
| error.confirmacion_invalida | El link no es válido o ya se usó. Pedí uno nuevo. |
| error.save_failed | No se pudo guardar. Intentá de nuevo. |
| error.deactivate_failed | No se pudo desactivar. Intentá de nuevo. |
| error.institution_inactive | Esta institución está desactivada. Reactivala para agregarle cuentas. |
| error.account_parent_inactive | Reactivá la institución antes de reactivar esta cuenta. |

---

## 8. Accesibilidad y modo oscuro

- Contraste mínimo AA (4.5:1) verificado para `--text-primary`/`--text-secondary` sobre ambos `--surface-0` y `--surface-1`.
- Todo control interactivo tiene foco visible (`box-shadow` con `--accent`), nunca `outline: none` sin reemplazo.
- El tema sigue `prefers-color-scheme` por defecto, con override manual guardado en `localStorage` (mobile: `Capacitor Preferences` para persistencia nativa).
- Ningún color es el único portador de significado: ingreso/gasto llevan además el signo (+/–) y un ícono de flecha.
