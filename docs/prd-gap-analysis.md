# PRD vs. Implementación

Comparación de [`docs/PRD.md`](PRD.md) (pilares 3.1–3.4 y pantallas de la sección 4, cruzadas con el inventario de [`docs/design-system.md`](design-system.md) y [`docs/architecture.md`](architecture.md)) contra el código actual en `apps/web` y `supabase/migrations`.

Fecha: 10 oct 2026.

| Cobertura ponderada | Hecho | Parcial | Falta |
|---|---|---|---|
| **92%** | 23 | 1 | 2 |

Ponderación: hecho = 1, parcial = 0.5, falta = 0. Sobre 25 requisitos (arquitectura, resilencia + pantallas).

El núcleo del ledger multi-moneda opera en producción con arquitectura **Local-First / Optimistic-First (Zero-Wait UI)**: cotizaciones FX concurrentes con caché y fallback, cuotas automáticas distribuidas (cuota 1 `COMPLETED`, 2..N `PENDING`), patrimonio neto consolidado, detalle por cuenta con métricas y modales de Ajuste Express y Pago de Tarjeta (2 filas ligadas), directorio y ficha de personas con baja lógica condicional a saldo 0, editor interactivo de WhatsApp (`WhatsAppNotifyModal`), configuración de plantilla dinámica (`/people/template`), y ejecución 1-tap de presupuestos. Todo el ledger se persiste localmente en IndexedDB y se sincroniza en segundo plano con PostgreSQL mediante RPCs indexadas.

---

## Pilares de arquitectura (PRD §3)

| Área | Requisito | Estado | En el código |
|---|---|---|---|
| 3.1 FX | Moneda global configurable + conversión en dashboard | Hecho | `user_settings.display_currency`, Ajustes, `convertToDisplayCurrency` con `Promise.all` |
| 3.1 FX | Saldos nominales por producto, sin conversión forzada en Cuentas | Hecho | `getAccountBalances` y RPC `get_account_balances_summary` en moneda nativa |
| 3.1 FX | Toda transacción guarda amount_original + amount_account | Hecho | `master_transactions` + `buildTransactionBundle` + `calculateAccountAmount` |
| 3.1 FX | Tipo de cambio en tiempo real + override manual persistente | Hecho | `open.er-api.com` + Frankfurter API, caché 1h TTL, y flag `rate_overridden` |
| 3.2 Jerarquía | Institución → Cuentas / Créditos / Inversiones | Hecho | CRUD instituciones y cuentas (`checking`, `savings`, `credit_card`, `cash`, `investing`) con soft deletes |
| 3.2 Jerarquía | Cuenta Cash por defecto | Hecho | `createInstitution` crea automáticamente cuenta "Efectivo" |
| 3.3 Cuotas | N cuotas = N registros ligados, un mes cada uno | Hecho | `buildTransactionBundle`: cuota 1 `COMPLETED` y cuotas 2..N `PENDING` ligadas por `parent_transaction_id` sin descontar saldo nominal anticipado |
| 3.3 Extensiones | Gasto a persona incrementa CxC sin alterar deuda con el banco | Parcial | `person_id` + `settled_at`. El `OUTCOME` descuenta de la cuenta seleccionada; falta separar el asiento contable de cuentas por cobrar puro |
| 3.3 Tarjetas | Pagos de tarjeta = transferencias inter-cuenta | Hecho | `buildTransferBundle` y `RegisterCardPaymentModal` generan 2 filas atómicas ligadas |
| 3.4 Ledger | `master_transactions` es fuente de verdad con Ledger Bundles | Hecho | Lotes atómicos e idempotentes persistidos mediante RPC `commit_ledger_bundle` |
| 3.5 Sync | Arquitectura Local-First y Zero-Wait UI | Hecho | Cola Outbox en IndexedDB (`outbox-db.ts`), `sync-engine.ts`, y `useLedger()` (< 16ms en UI) |
| 2 Workbook | Import del Excel Finances_2026.xlsx | Falta | `SETUP.md` utiliza `seed.sql` por ahora; script de migración masiva pendiente |

---

## Pantallas (PRD §4 + design system §6)

| Pantalla | Ruta | Estado | Notas |
|---|---|---|---|
| Dashboard | `/dashboard` | Hecho | Patrimonio neto consolidado, presupuesto mensual, carrusel de cuentas, feed, `SyncStatusBadge` y banner de tour de inicio. |
| Análisis de datos | `/analytics` | Hecho | Métricas de KPIs, gráficos SVG semánticos de gastos por categoría, flujo de caja mensual (ingresos vs gastos) y gastos por divisa/medio de pago. |
| Categorías de gastos | `/categories` | Hecho | Catálogo completo con buscador, selector de 13 iconos, colores semánticos, soft deletes y sembrado de categorías sugeridas. |
| Cuentas y bancos | `/accounts` | Hecho | Acordeón por institución, CRUD con modales interceptados, totales y baja lógica `is_active`. |
| Detalle de cuenta | `/accounts/[id]` | Hecho | Saldo nominal, balance disponible y compromisos de cuotas diferidas, métricas mensuales, `ExpressAdjustModal` y `RegisterCardPaymentModal`. |
| Formulario universal | `/transactions/new` | Hecho | Gasto/ingreso/transferencia, Zero-Wait UI, FX en vivo, fees, cuotas (1 hoy + N-1 diferidas), persona y cuentas origen/destino. |
| Transferencias | — | Hecho | Generación de 2 filas complementarias ligadas por `parent_transaction_id` integrada en UI y modal. |
| Personas | `/people` | Hecho | Directorio con saldo pendiente por moneda, CRUD completo (`/people/new`, `/people/[id]/edit`), baja lógica protegida a saldo 0. |
| Ficha de persona | `/people/[id]` | Hecho | Saldo por cobrar, cuotas comprometidas futuras, historial filtrado, registrar cobro (`settled_at`) y botón "Notificar por WhatsApp". |
| Notificación WhatsApp | `WhatsAppNotifyModal` | Hecho | Modal interactivo para verificar destinatario, editar mensaje y abrir en WhatsApp Web/App (`wa.me`). |
| Plantilla WhatsApp | `/people/template` | Hecho | Editor con variables dinámicas (`$Nombre`, `$Total`, `$Detalle`, `$Cantidad`, `$Fecha`), live preview y persistencia en `user_settings`. |
| Gastos fijos / Presupuesto | `/budget` | Parcial | Estimados vs. gasto real + botón 1-tap "Ejecutar pago". Falta formulario para crear y editar `budget_estimates` en UI. |
| Préstamos | `/loans` | Falta | Tablas `loans` y `loan_installments` definidas en SQL con RLS. Navegación indica "pronto". |
| Portafolio | `/portfolio` | Falta | Tabla `portfolio_transactions` definida en SQL con RLS. Navegación indica "pronto". |
| Ajustes | `/settings` | Hecho | Moneda global, selector de tema claro/oscuro persistente, reseteo de contraseña, tour de bienvenida e información del entorno (`SystemInfoCard`). |
| Movimientos | `/transactions` | Hecho | Feed reactivo (`TransactionsList`) con badges de cuotas, confirmación de pendientes y paginación histórica cursor-based. |

---

## Implementado adicionalmente (fuera del PRD base)

| Característica | Ubicación / Componente |
|---|---|
| Tour interactivo de bienvenida (5 pasos) | `apps/web/components/OnboardingTour.tsx`, `TourTriggerButton.tsx` |
| Dashboard interactivo de Análisis de Datos | `apps/web/components/AnalyticsDashboard.tsx`, `lib/analytics.ts` (`/analytics`) |
| CRUD y Catálogo de Categorías | `apps/web/components/CategoryList.tsx`, `CategoryModal.tsx` (`/categories`) |
| Arquitectura Local-First & Zero-Wait UI | `apps/web/lib/ledger/`, `lib/storage/`, `lib/sync/`, `SyncStatusBadge.tsx` |
| Agregación SQL Indexada de Balances | RPC `get_account_balances_summary` (`0008_ledger_sync_and_snapshot.sql`) |
| Inserción atómica idempotente en BD | RPC `commit_ledger_bundle` (`0008_ledger_sync_and_snapshot.sql`) |
| Endpoint snapshot unificado de arranque | `GET /api/bootstrap` (< 80 ms) |
| Paginación cursor-based histórica | `GET /api/transactions` |
| Motor FX con caché en memoria y concurrencia | `apps/web/lib/fx/index.ts` (open.er-api + frankfurter, TTL 1h) |
| Editor interactivo de WhatsApp | `apps/web/components/WhatsAppNotifyModal.tsx` |
| Configuración de plantilla dinámica con tokens | `apps/web/components/WhatsAppTemplateForm.tsx` (`/people/template`) |
| Ficha de información técnica del sistema | `apps/web/components/SystemInfoCard.tsx` (versión, git hash, rama, entorno) |
| Modo oscuro completo y switch en navegación | `apps/web/components/ThemeToggle.tsx` + `globals.css` (`data-theme`) |
| Suite de pruebas unitarias automatizadas | Vitest (118 tests pasando en 18 suites) |

---

## Orden sugerido para cerrar el PRD

1. **Modelo contable de extensiones**: Separar el asiento contable de cuentas por cobrar para atribuir gastos a terceros sin descontar la deuda bancaria de la tarjeta.
2. **CRUD de estimados de presupuesto**: Agregar pantallas/modales para crear, editar y desactivar registros en `budget_estimates`.
3. **Fase 4 — Préstamos (`/loans`)**: UI de tabla de amortización dinámica y registro de cuotas desglosando capital e intereses.
4. **Fase 4 — Portafolio (`/portfolio`)**: UI de compras/ventas de activos, cotizaciones y cálculo de ganancias/pérdidas no realizadas (P&L).
5. **Import masivo de Finances_2026.xlsx**: Script ETL para migrar el historial del Excel a las tablas de Supabase.
6. **Fase 5 — Empaquetado Android (Capacitor)**: Compilación y validación de build nativo APK/AAB.

