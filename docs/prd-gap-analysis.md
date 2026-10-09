# PRD vs. implementación

Comparación de `docs/PRD.md` (pilares 3.1–3.4 y pantallas de la sección 4, cruzadas con el inventario de `docs/design-system.md` §6) contra el código en `apps/web` y `supabase/migrations`.

Fecha: 27 ago 2026.

| Cobertura ponderada | Hecho | Parcial | Falta |
|---|---|---|---|
| 78% | 16 | 4 | 3 |

Ponderación: hecho = 1, parcial = 0.5, falta = 0. Sobre 23 requisitos (arquitectura + pantallas).

El núcleo del ledger multi-moneda ya corre: cotización, override, cuotas básicas, patrimonio neto, cuentas por institución con detalle y ajuste express, transferencias inter-cuenta y pago de tarjeta de crédito (2 filas ligadas), personas con cobro y WhatsApp, y presupuesto con «ejecutar pago». Auth y RLS están en pie. Lo que falta es sobre todo el modelo contable de extensiones, y las dos pantallas de fase 4 (préstamos y portafolio).

El PRD en `docs/PRD.md` es un índice: el detalle de pantallas vive en `design-system.md` §6 y las reglas de asientos en `.claude/skills/fx-ledger-rules`.

---

## Pilares de arquitectura (PRD §3)

| Área | Requisito | Estado | En el código |
|---|---|---|---|
| 3.1 FX | Moneda global configurable + conversión en dashboard | Hecho | `user_settings.display_currency`, Ajustes, `convertToDisplayCurrency` |
| 3.1 FX | Saldos nominales por producto, sin conversión forzada en Cuentas | Hecho | `getAccountBalances` usa `amount_account` en `currency_native` |
| 3.1 FX | Toda transacción guarda amount_original + amount_account | Hecho | `master_transactions` + `createTransaction` + `calculateAccountAmount` |
| 3.1 FX | Tipo de cambio API + override manual persistente | Hecho | frankfurter.app + `rate_overridden` en el formulario |
| 3.2 Jerarquía | Institución → Cuentas / Créditos / Inversiones | Parcial | CRUD instituciones y cuentas (incl. `credit_card` e `investing`). Sin UI de créditos ni inversiones. |
| 3.2 Jerarquía | Cuenta Cash por defecto | Hecho | `createInstitution` crea una cuenta "Efectivo" por institución nueva |
| 3.3 Cuotas | N cuotas = N registros ligados, un mes cada uno | Hecho | N cuotas ligadas mediante `parent_transaction_id`. Cuota 1 `COMPLETED` y cuotas 2..N `PENDING`; no restan saldo nominal anticipado. |
| 3.3 Extensiones | Gasto a persona incrementa CxC sin alterar deuda con el banco | Parcial | `person_id` + `settled_at`. El mismo `OUTCOME` baja el saldo de la cuenta; no hay asiento de cuenta por cobrar separado. |
| 3.3 Tarjetas | Pagos de tarjeta = transferencias inter-cuenta | Hecho | `createTransferTransaction` genera 2 filas ligadas por `parent_transaction_id`. Modal en `/accounts/[id]` para tarjetas. |
| 3.4 Ledger | `master_transactions` es fuente de verdad | Hecho | Dashboard, presupuesto, personas y patrimonio leen el ledger |
| 2 Workbook | Import del Excel Finances_2026.xlsx | Falta | `SETUP.md` lo deja pendiente. Hoy se usa `seed.sql` de prueba. |

---

## Pantallas (PRD §4 + design system §6)

| Pantalla | Ruta | Estado | Notas |
|---|---|---|---|
| Dashboard | `/dashboard` | Hecho | Patrimonio, presupuesto del mes, cuentas, feed. Enlaces directos a cuentas. |
| Cuentas y bancos | `/accounts` | Hecho | Acordeón por institución, CRUD, baja lógica `is_active`. |
| Detalle de cuenta | `/accounts/[id]` | Hecho | Header con saldo nominal, feed filtrado, métricas del mes, Ajuste Express y Registrar pago en tarjetas. |
| Formulario universal | `/transactions/new` | Hecho | Gasto/ingreso/transferencia, FX en vivo, fees, cuotas (1 hoy + N-1 pendientes), persona y cuentas origen/destino. |
| Transferencias | — | Hecho | Regla de 2 filas ligadas por `parent_transaction_id` en `createTransferTransaction` e integrada en UI. |
| Personas | `/people` | Hecho | Directorio, saldos pendientes por moneda, CRUD completo (alta, edición de nombre y teléfono, y baja lógica condicional a saldo 0). |
| Ficha de persona | `/people/[id]` | Hecho | Pendiente / cuotas futuras / historial, WhatsApp, registrar cobro, acceso a edición y estado activo/desactivado. |
| Gastos fijos / Presupuesto | `/budget` | Hecho | Estimados vs real + Ejecutar pago. Sin alta/edición de estimados en UI. |
| Préstamos | `/loans` | Falta | Tablas `loans` + `loan_installments` y RLS. Nav dice «pronto». |
| Portafolio | `/portfolio` | Falta | Tabla `portfolio_transactions` y RLS. Nav dice «pronto». |
| Ajustes | `/settings` | Hecho | Moneda global y selector de tema claro / oscuro persistente. |
| Movimientos | `/transactions` | Hecho | Lista con badges de cuotas y estado PENDING, y botón de confirmación. |

---

## Huecos de negocio pendientes

**Extensiones vs. deuda del banco.** Asignar persona etiqueta el mismo gasto. El saldo de la tarjeta baja igual. El PRD pide CxC sin tocar la deuda bancaria.


---

## Schema sin pantalla

| Estado | Qué | Detalle |
|---|---|---|
| Falta | Préstamos — `loans` / `loan_installments` | Principal, dirección `BORROWED`/`LENT`, tabla de amortización. Cero rutas ni actions. |
| Falta | Portafolio — `portfolio_transactions` | `BUY`/`SELL`, ticker, units, `funding_account`. Cero rutas ni P&L. |
| Parcial | Presupuesto — alta de estimados | Se leen y se ejecutan. No hay formulario para crear o editar `budget_estimates` (solo seed). |

---

## Implementado además del PRD corto

| Extra | Dónde |
|---|---|
| Auth (login, middleware, confirm) | `apps/web/app/login`, `middleware.ts` |
| Intercepting routes / modal de formularios | `app/(protected)/@modal` |
| Registrar cobro (`settled_at`) | `people/actions.ts` |
| Notificar por WhatsApp | `PersonActions.tsx` |
| Ejecutar pago de estimado | `budget/actions.ts` |

---

## Orden sugerido para cerrar el PRD

1. Transferencias (2 filas ligadas) y pago de tarjeta como transferencia.
2. Ligar cuotas con `parent_transaction_id` y marcar futuras `PENDING` hasta que venzan o se confirmen.
3. Modelo de extensión: CxC sin duplicar la deuda de la tarjeta.
4. Detalle de cuenta + ajuste express.
5. CRUD de estimados de presupuesto.
6. Fase 4: Préstamos y Portafolio (schema ya listo).
7. Import del workbook Finances_2026.xlsx.
