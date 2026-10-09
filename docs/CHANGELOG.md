# Registro de Versiones (Changelog) — Finance Nomad

Todas las modificaciones notables, nuevas funcionalidades y correcciones de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y adhiere a [Semantic Versioning](https://semver.org/lang/es/).

> [!IMPORTANT]
> **Instrucción para Agentes y Desarrolladores**:
> Ante cada cambio, refactorización, corrección de bugs o nueva funcionalidad implementada, **es obligatorio actualizar este archivo** agregando los detalles bajo la versión correspondiente o en la sección `[Unreleased]`.

---

## [Unreleased]

## [2.0.0] - 2026-10-10
### Agregado
- **Caché Local de Cotizaciones Cambiarias (FX) con TTL de 24h y Reconciliación en Sincronización**:
  - **Módulo `fx-cache`**: Creación de [`apps/web/lib/storage/fx-cache.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/storage/fx-cache.ts) con almacenamiento persistente en `localStorage`, vencimiento de 24 horas (`FX_CACHE_TTL_MS = 86_400_000`), cálculo automático de tasas inversas y métodos `getCachedRate`, `setCachedRate`, `saveRatesMatrix` y `clearFxCache`.
  - **Matriz de Cotizaciones en Bootstrap**: Ampliación de [`apps/web/lib/fx/index.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/fx/index.ts) con `getRatesMatrix` y endpoint [`/api/bootstrap`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/api/bootstrap/route.ts) para enviar la matriz cambiaria completa entre las 5 divisas del sistema (`AUD`, `EUR`, `USD`, `UYU`, `NZD`). Al cargar la sesión, [`LedgerContext`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/ledger-context.tsx) puebla automáticamente el caché local.
  - **Resolución Zero-Wait en Formulario**: [`TransactionForm`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/TransactionForm.tsx) consulta síncronamente la tasa desde `fx-cache` en 0ms tanto online como offline. Si la tasa guardada expiró y hay conexión activa, se refresca en segundo plano. Muestra etiquetas claras de cotización de referencia o manual.
  - **Respeto Absoluto a Tasas Personalizadas**: Si el usuario edita manualmente la tasa de cambio en `TransactionForm`, se fija `rate_overridden: true` y la tasa queda protegida, asegurando que ni el cliente ni el background sync alteren el valor decidido por el usuario.
  - **Reconciliación Contable en Backend**: Creación de [`apps/web/lib/ledger/reconcile-fx.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/reconcile-fx.ts) e integración en [`/api/ledger/sync`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/api/ledger/sync/route.ts). Si el bundle fue generado con una cotización local expirada (> 24h) y `rate_overridden: false`, el servidor obtiene la tasa oficial y recalcula `amount_account` (contado, cuotas divididas mediante `splitInstallments` o contraparte de transferencias) antes del commit en PostgreSQL. Si la API remota falla temporalmente, se preserva la cotización existente sin abortar la sincronización.
  - **Suites de Pruebas Unitarias**:
    - [`apps/web/lib/storage/fx-cache.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/storage/fx-cache.test.ts): 6 pruebas cubriendo guardado, expiración a las 24h, cálculo de tasas inversas y matriz completa.
    - [`apps/web/lib/ledger/reconcile-fx.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/reconcile-fx.test.ts): 8 pruebas verificando respeto de tasas personalizadas (`rate_overridden: true`), tasas vigentes (< 24h), recálculo de cuotas y transferencias en cotizaciones expiradas y fallbacks ante cortes de red (88 tests pasando en total).

### Corregido
- **Navegación Offline y Autenticación Resiliente (Resolución de Redirección Inesperada a Login)**:
  - **Middleware y Layout Protegido**: Se corrigió el comportamiento donde cualquier navegación entre rutas protegidas (`/dashboard`, `/accounts`, `/transactions`, etc.) estando offline redirigía forzadamente al nodo `/login`. El problema radicaba en que [`updateSession`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/supabase/middleware.ts), [`ProtectedLayout`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/layout.tsx) y [`RootPage`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/page.tsx) ejecutaban exclusivamente `supabase.auth.getUser()`, el cual al fallar por corte de red devolvía `AuthRetryableFetchError` / `fetch failed` con `user: null`, asumiendo falsamente que el usuario no estaba autenticado.
  - **Módulo `auth-helper` y Extracción de Sesión en 0ms**: Creación de [`apps/web/lib/supabase/auth-helper.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/supabase/auth-helper.ts) con las funciones `getAuthenticatedUser` y `extractUserFromCookies`. Si la revalidación online falla por corte de red, el sistema recupera la identidad del usuario a partir de las cookies de sesión de Supabase (`sb-*-auth-token`, con soporte para objetos JSON, arrays de tokens JWT y cookies fragmentadas `.0`, `.1`), permitiendo navegar sin interrupciones.
  - **Tolerancia a Desconexión en Server Components**: Se envolvieron en bloques seguros `try/catch` las consultas síncronas de servidor en [`DashboardPage`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/dashboard/page.tsx), [`AccountsPage`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/accounts/page.tsx), [`TransactionsPage`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/transactions/page.tsx), [`BudgetPage`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/budget/page.tsx) y [`SettingsPage`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/settings/page.tsx). Si no hay conexión con Supabase, los componentes cliente ([`DashboardClient`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/DashboardClient.tsx), [`AccountsClient`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AccountsClient.tsx), [`TransactionsList`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/TransactionsList.tsx)) toman el control y resuelven instantáneamente cuentas, balances y movimientos desde la memoria local e IndexedDB.
  - **Pruebas Automatizadas**: Creación de [`apps/web/lib/supabase/auth-helper.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/supabase/auth-helper.test.ts) con 7 nuevas pruebas unitarias cubriendo extracción de cookies en múltiples formatos y fallbacks de error de red (74 tests pasando en total).

### Agregado
- **Arquitectura Local-First / Optimistic-First & Background Sync (Fase 1: Motor Contable Puro)**:
  - Creación del documento de arquitectura técnica [`docs/architecture.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/architecture.md) detallando el ciclo de vida del *Ledger Bundle*, la cola *Outbox* en IndexedDB, el cálculo de saldos *Baseline + Delta* y el diagrama de sincronización resiliente.
  - Actualización de directivas en [`AGENTS.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/AGENTS.md) con la Sección 5: Reglas obligatorias de *Ledger Bundles*, cálculo de saldos y UI zero-wait.
  - Módulo de tipos contables [`apps/web/lib/ledger/types.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/types.ts) definiendo `LedgerBundle`, `OutboxJob`, `BuildTransactionInput` y `BuildTransferInput`.
  - Módulo puro de construcción de lotes contables [`apps/web/lib/ledger/builder.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/builder.ts):
    - `buildTransactionBundle`: generación determinística de UUIDs con `crypto.randomUUID()`, división de cuotas sin pérdida de centavos y asignación de estado `COMPLETED` (cuota 1) y `PENDING` (cuotas 2..N ligadas por `parent_transaction_id`).
    - `buildTransferBundle`: generación atómica de 2 filas complementarias ligadas (débito negativo en origen y crédito positivo en destino) con soporte multi-moneda y comisiones.
    - `calculateInstallmentDate`: cálculo seguro de fechas de cuotas mensuales evitando corrimientos por desbordes de fin de mes.
  - Módulo puro de cálculo de saldos [`apps/web/lib/ledger/balance.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/balance.ts):
    - `calculateRowDelta`: cálculo de impacto contable nominal exclusivo para transacciones `COMPLETED`.
    - `applyBundleDelta`: mutación y cálculo reactivo en memoria de saldos por cuenta a partir de un bundle.
    - `calculatePendingDelta`: cálculo de compromisos diferidos/retenidos de cuotas futuras para tarjetas de crédito.
  - Hook reactivo de conectividad [`apps/web/lib/hooks/use-online-status.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/hooks/use-online-status.ts) para suscripción en tiempo real a eventos `online`/`offline` del navegador.
  - Suites completas de pruebas unitarias en Vitest con 51 nuevos tests (65 tests totales en el proyecto):
    - [`apps/web/lib/ledger/builder.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/builder.test.ts): 8 pruebas cubriendo gastos simples, cuotas divididas, transferencias bi-monetarias y validaciones de cuentas idénticas.
    - [`apps/web/lib/ledger/balance.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/balance.test.ts): 11 pruebas cubriendo cálculo de deltas en memoria, impacto selectivo de cuotas, reversiones de eliminación y confirmaciones diferidas.
    - [`apps/web/lib/hooks/use-online-status.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/hooks/use-online-status.test.ts): 4 pruebas verificando estados iniciales online/offline y actualización reactiva ante eventos de ventana.
    - [`apps/web/components/InstitutionForm.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/InstitutionForm.test.tsx): 9 pruebas cubriendo renderizado de creación, submit con `createInstitution`, redirección y cierre de modal, manejo de errores de red, edición con `updateInstitution`, desactivación/reactivación y detección/bloqueo offline.
    - [`apps/web/components/PersonForm.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/PersonForm.test.tsx): 11 pruebas cubriendo renderizado de creación, creación y redirección a `/people`, cierre de modal, manejo de errores, edición con `updatePerson`, bloqueo de edición del contacto de sistema 'Personal', validación de saldo pendiente para desactivación, reactivación y detección/bloqueo offline.
    - [`apps/web/components/AccountForm.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AccountForm.test.tsx): 8 pruebas cubriendo creación de cuentas asociadas a instituciones, cierre de modal, campos condicionales de tarjeta de crédito, edición, desactivación y detección/bloqueo offline.

- **Base de Datos y Motor SQL de Agregación (Fase 2: Migración 0008)**:
  - Creación de [`supabase/migrations/0008_ledger_sync_and_snapshot.sql`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/supabase/migrations/0008_ledger_sync_and_snapshot.sql):
    - Función RPC `get_account_balances_summary`: cómputo agregado de saldos por cuenta ejecutado directamente en PostgreSQL indexado, reemplazando la descarga innecesaria de historiales masivos a memoria de servidor.
    - Función RPC `commit_ledger_bundle`: inserción atómica e idempotente (`ON CONFLICT DO NOTHING`) de lotes contables completos (cuotas y transferencias enlazadas) bajo la identidad del usuario autenticado.
- **Route Handlers y Endpoints de Sincronización (Fase 2)**:
  - `GET /api/bootstrap` ([`apps/web/app/api/bootstrap/route.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/api/bootstrap/route.ts)): endpoint unificado que responde en < 80ms con el snapshot del entorno (saldos precalculados, cuentas, categorías, personas, estimaciones y transacciones de los últimos 10 días).
  - `POST /api/ledger/sync` ([`apps/web/app/api/ledger/sync/route.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/api/ledger/sync/route.ts)): endpoint para procesar en bloque las transacciones encoladas del Outbox local mediante la RPC atómica con fallback a inserción por lote.
  - `GET /api/transactions` ([`apps/web/app/api/transactions/route.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/api/transactions/route.ts)): endpoint cursor-based (`beforeDate`, `limit`) para la paginación histórica bajo demanda.
- **Almacenamiento Local y Motor de Background Sync (Fase 3)**:
  - Almacén de datos IndexedDB tipado [`apps/web/lib/storage/outbox-db.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/storage/outbox-db.ts) para persistencia tolerante a caídas de pestañas y cierres intempestivos de la cola de salida y snapshot de arranque.
  - Motor [`apps/web/lib/sync/sync-engine.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/sync/sync-engine.ts): despachador en segundo plano con reintentos exponenciales automáticos, reanudación automática ante eventos `online` del navegador y eventos `visibilitychange`.
- **Integración Reactiva en UI y Experiencia Zero-Wait (Fases 4 y 5)**:
  - Contexto global y hook `useLedger()` ([`apps/web/lib/ledger/ledger-context.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/ledger-context.tsx)) integrado en [`apps/web/app/(protected)/layout.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/layout.tsx), proveyendo saldos reactivos calculados con deltas locales y gestión transparente del outbox.
  - Actualización de [`apps/web/components/TransactionForm.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/TransactionForm.tsx): el guardado de gastos, cuotas y transferencias ahora actualiza saldos y movimientos en < 16ms en memoria, encola en IndexedDB y cierra el modal o navega al Dashboard de inmediato sin bloqueos de red.
  - Componente [`apps/web/components/SyncStatusBadge.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/SyncStatusBadge.tsx) integrado en la barra de navegación de desktop y en la cabecera móvil de [`apps/web/components/Navigation.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/Navigation.tsx) para brindar feedback visual sutil y opción de reintento manual.
  - Creación de [`apps/web/components/DashboardClient.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/DashboardClient.tsx) y refactorización de [`apps/web/app/(protected)/dashboard/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/dashboard/page.tsx): conexión reactiva a `useLedger()`. Los saldos por cuenta, el patrimonio neto y la lista de movimientos recientes se actualizan en 0ms en pantalla al registrar una transacción sin depender de recargas ni de respuestas de red.
  - Creación de [`apps/web/components/AccountsClient.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AccountsClient.tsx) y refactorización de [`apps/web/app/(protected)/accounts/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/accounts/page.tsx): actualización en tiempo real de saldos en la vista de cuentas e instituciones vinculada al almacén reactivo.
  - Implementación de `seedInitialData` y fusión segura de mutaciones pendientes de Outbox en `LedgerContext` ([`apps/web/lib/ledger/ledger-context.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/ledger-context.tsx)), garantizando que snapshots demorados del servidor no sobreescriban los deltas locales no conciliados.
  - Optimización de [`apps/web/lib/networth.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/networth.ts) (`getAccountBalances` y `getSingleAccountBalance`) para priorizar la agregación indexada en SQL.

- **Reconciliación, Accesibilidad y Detección Offline en Formularios Maestros (`InstitutionForm`, `PersonForm`, `AccountForm`, `ledger-context.tsx`)**:
  - Incorporación del hook seguro [`useOptionalLedger`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/ledger-context.tsx) para permitir consumo condicional del contexto de ledger sin lanzar excepción en entornos aislados o de testing.
  - Actualización de [`InstitutionForm.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/InstitutionForm.tsx), [`PersonForm.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/PersonForm.tsx) y [`AccountForm.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AccountForm.tsx) asociando atributos accesibles `htmlFor` e `id` en controles de formulario, conectando la recarga en segundo plano de `ledger?.refresh()` tras altas, ediciones y cambios de estado activo, e integrando el hook [`useOnlineStatus`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/hooks/use-online-status.ts) con banner explicativo (`CloudOff`) y deshabilitación preventiva de envío si el usuario no tiene conexión a internet.
- **Sincronización y Actualización Integral de Documentación**:
  - [`docs/architecture.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/architecture.md): Incorporación de la Sección 1.1 formalizando el modelo híbrido por capas: Capa Transaccional (Ledger = Local-First / Zero-Wait con Outbox) vs. Capa Estructural (Catálogos maestros = Online-First con Server Actions).
  - [`AGENTS.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/AGENTS.md): Clarificación de la regla de Zero-Wait UI exclusiva para transacciones contables y directiva obligatoria de validación offline en formularios de catálogo.
  - [`README.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/README.md): Incorporación de enlaces y resumen de [`docs/architecture.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/architecture.md) y [`docs/prd-gap-analysis.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/prd-gap-analysis.md), precisión sobre la ejecución de todas las migraciones SQL (0001 a 0008) y comando de ejecución de tests unitarios (`npm test`).
  - [`SETUP.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/SETUP.md): Corrección de título, desglose secuencial de scripts de migración (0001 a 0008) en Supabase SQL Editor, verificación de suites de tests de Vitest y clarificación del estado de dependencias de Capacitor.
  - [`apps/web/.env.example`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/.env.example): Creación de archivo plantilla de variables de entorno para despliegue y configuración inicial.

### Corregido
- **Consistencia Reactiva en Eliminación y Confirmación de Transacciones (Optimistic UI & Background Sync)**:
  - Corrección del bug donde la eliminación de un movimiento mediante `DeleteTransactionButton` se completaba con éxito en el backend pero no se reflejaba de inmediato en el Dashboard ni actualizaba los saldos de las cuentas en memoria.
  - Implementación de `applyDeletionDelta`, `revertRowDelta` y `applyConfirmationDelta` en [`apps/web/lib/ledger/balance.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/balance.ts) para computar la reversión contable matemática exacta en 0ms (soportando reversión atómica de transferencias bi-monetarias ligadas por `parent_transaction_id` y anulación de impacto nominal en transacciones pendientes).
  - Incorporación de métodos reactivos `deleteTransaction(transactionId)` y `confirmTransaction(transactionId)` en [`apps/web/lib/ledger/ledger-context.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/ledger-context.tsx): purgan o revierten el movimiento de la memoria del cliente (`recentTransactions` y `balances`), limpian trabajos pendientes de la cola de Outbox en IndexedDB si aún no se despacharon, ejecutan la Server Action en background y concilian con un bootstrap asíncrono.
  - Conexión del hook seguro `useOptionalLedger` en [`apps/web/components/DeleteTransactionButton.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/DeleteTransactionButton.tsx) y [`apps/web/components/ConfirmTransactionButton.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ConfirmTransactionButton.tsx).
  - Conexión de `ledger?.refresh()` en [`apps/web/components/ExpressAdjustModal.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ExpressAdjustModal.tsx) y [`apps/web/components/RegisterCardPaymentModal.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/RegisterCardPaymentModal.tsx) para mantener la consistencia inmediata del Dashboard al registrar ajustes de saldo o pagos de tarjeta.
  - Incorporación de 5 nuevas pruebas unitarias en [`apps/web/lib/ledger/balance.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/balance.test.ts) validando reversión de `OUTCOME`, `INCOME`, transferencias entre cuentas y confirmación de `PENDING` (49 pruebas totales superadas).
- **Auditoría y Reconciliación Global de Componentes con Server Actions (Consistencia Optimistic UI & Background Sync)**:
  - Detección y corrección de desincronizaciones en componentes que invocaban Server Actions directas al backend sin notificar al contexto reactivo de ledger:
    - [`AccountForm.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AccountForm.tsx): Incorporación de `useOptionalLedger` y sincronización de fondo con `ledger?.refresh()` tras altas (`createAccount`), ediciones (`updateAccount`) y bajas lógicas (`setAccountActive`), resolviendo la falta de actualización del selector de cuentas en `TransactionForm` y la lista de cuentas en `DashboardClient` y `AccountsClient`.
    - [`ExecutePaymentButton.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ExecutePaymentButton.tsx): Conexión de `ledger?.refresh()` tras ejecutar un pago presupuestario (`executeBudgetPayment`), garantizando que el nuevo movimiento y la deducción de saldo se reflejen de inmediato en el Dashboard y patrimonio neto.
    - [`CurrencySelector.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/CurrencySelector.tsx): Conexión de `ledger?.refresh()` al actualizar la divisa principal del sistema (`updateDisplayCurrency`), evitando discrepancias en el cálculo consolidado del patrimonio neto en memoria.
    - [`PersonActions.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/PersonActions.tsx): Conexión de `ledger?.refresh()` tras registrar liquidaciones de cobro de personas (`registerCollection`), actualizando el estado `settled_at` en la caché de movimientos.
    - [`WhatsAppTemplateForm.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/WhatsAppTemplateForm.tsx): Conexión de `ledger?.refresh()` tras guardar la plantilla de WhatsApp (`updateWhatsAppTemplate`).
    - [`TransactionsList.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/TransactionsList.tsx): Integración directa de `DeleteTransactionButton` para habilitar el borrado y reversión contable en 0 ms desde la vista principal de `/transactions`.
    - [`LogoutButton.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/LogoutButton.tsx) y [`outbox-db.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/storage/outbox-db.ts): Implementación de la función `clearLedgerDb()` que purga el Outbox y el snapshot en IndexedDB al cerrar sesión, previniendo fuga o desactualización de datos locales en entornos multi-usuario.
- **Evolución Local-First de Operaciones Transaccionales Especiales (`RegisterCardPaymentModal`, `ExpressAdjustModal`, `ExecutePaymentButton`)**:
  - Migración completa de los 3 flujos transaccionales al motor puro de lotes contables `LedgerBundle`:
    - [`RegisterCardPaymentModal.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/RegisterCardPaymentModal.tsx): El pago de tarjeta ahora invoca `ledger.addTransfer()` en el cliente, debitando la cuenta de origen y cancelando la deuda de la tarjeta en 0 ms en memoria, persistiendo en IndexedDB y sincronizando en background (100% offline-ready).
    - [`ExpressAdjustModal.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ExpressAdjustModal.tsx): El ajuste express ahora calcula la diferencia exacta contra el saldo en memoria en tiempo real (`ledger.getBalance`) y despacha un bundle de tipo `ADJUSTMENT` vía `ledger.addTransaction()`, actualizando el saldo de la cuenta de inmediato en 0 ms y encolando en Outbox.
    - [`ExecutePaymentButton.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ExecutePaymentButton.tsx): La ejecución de un gasto fijo proyectado ahora pasa los datos de la estimación y genera la transacción en memoria en 0 ms vía `ledger.addTransaction()`, impactando el balance y encolando en IndexedDB sin requerir conexión inmediata a internet.
  - Incorporación de pruebas unitarias para creación de bundles de `ADJUSTMENT` con deltas firmados (+ / -) y aplicación de saldos en memoria en [`apps/web/lib/ledger/builder.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/builder.test.ts) y [`apps/web/lib/ledger/balance.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/balance.test.ts) (67 pruebas unitarias aprobadas en total).
  - [`docs/PRD.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/PRD.md): Actualización del motor FX (`open.er-api.com` + Frankfurter, TTL de 1h y concurrencia `Promise.all`), modales de cuenta (`ExpressAdjustModal`, `RegisterCardPaymentModal`), gestión integral de contactos y WhatsApp (`WhatsAppNotifyModal`, `/people/template`), interfaz Zero-Wait UI con lotes contables, pantalla `/settings` (tema e información de sistema), y esquema completo de tablas y RPCs.
  - [`docs/architecture.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/architecture.md): Documentación ampliada con estructura de archivos por módulo (`lib/ledger`, `lib/storage`, `lib/sync`), catálogo de endpoints de API (`/api/bootstrap`, `/api/ledger/sync`, `/api/transactions`), arquitectura del motor FX y detalle de funciones RPC en PostgreSQL.
  - [`docs/design-system.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/design-system.md): Inclusión del catálogo exhaustivo de 22 componentes en `apps/web/components`, inventario actualizado de pantallas y rutas interceptadas (`@modal/*`), y ampliación del copy deck rioplatense (sincronización, WhatsApp, contactos y ajustes de sistema).
  - [`docs/prd-gap-analysis.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/prd-gap-analysis.md): Actualización de métricas de cobertura al 84% ponderado (20 cumplidos, 2 parciales, 3 pendientes), incorporación de las capas de resiliencia Local-First y nuevos componentes, y reordenamiento de los próximos pasos prioritarios.
  - [`docs/agents-and-skills.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/agents-and-skills.md) y `.claude/skills/`: Reflejo de `architecture.md`, reglas de lotes contables determinísticos (`LedgerBundle`), directivas de soft-delete en base de datos y funciones RPC en los skills de Claude Code.

---

## [1.3.1] - 2026-10-09
### Optimizado
- **Motor de Divisas (FX) y Conversión Concurrente** (`apps/web/lib/fx/index.ts`, `apps/web/lib/networth.ts`):
  - Reemplazo del scraper HTML de Google Finance (que se bloqueaba por timeout de 6s al no encontrar selectores obsoletos) por la API JSON estructurada `open.er-api.com` con soporte en tiempo real para UYU, EUR, USD, AUD y NZD, y fallback a Frankfurter para monedas del BCE e histórico.
  - Implementación de caché en memoria con TTL de 1 hora para eliminar llamadas de red en consultas sucesivas de cotizaciones (tiempo de respuesta en caché: ~0.01 ms).
  - Paralelización de conversiones multi-divisa en `convertToDisplayCurrency` ([`apps/web/lib/networth.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/networth.ts)) usando `Promise.all` en lugar de un bucle secuencial `for...of`.
  - Reducción del tiempo de cálculo de divisas en el Dashboard de más de 7.200 ms a < 1 ms (en caché) o ~350–650 ms (cold fetch).
- **Eliminación de Consultas en Cascada (Waterfalls) en Server Components y Modales**:
  - **Modal y formulario de movimientos** ([`@modal/(.)transactions/new/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/@modal/(.)transactions/new/page.tsx) y [`transactions/new/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/transactions/new/page.tsx)): Unificación de las consultas de `accounts`, `categories` y `people` dentro de un único `Promise.all` (tiempo de apertura reducido de ~2.4s a ~0.8s).
  - **Ficha de Cuenta** ([`accounts/[id]/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/accounts/[id]/page.tsx)): Paralelización de `account`, `allAccounts` y `transactions` con `Promise.all`. Deduplicación del saldo actual y compromisos diferidos calculándolos directamente en memoria a partir del arreglo de transacciones ya descargado, eliminando 3 peticiones redundantes a `master_transactions` (tiempo de carga reducido de ~4.5s a < 0.9s).
  - **Dashboard Principal** ([`dashboard/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/dashboard/page.tsx)): Reestructuración de 6 fases secuenciales a solo 2 fases concurrentes (`settings`, `accounts`, `transactions`, `estimates` y `balances` en paralelo, seguido de `convertToDisplayCurrency` y `monthTx` en paralelo).
  - **Directorio de Personas** ([`people/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/people/page.tsx)): Paralelización simultánea de `people` y transacciones pendientes `master_transactions`.
  - **Presupuesto Mensual** ([`budget/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/budget/page.tsx)): Consulta paralela de `budget_estimates` y gastos del mes en `master_transactions`, resolviendo el filtrado de categorías en memoria.
  - **Formularios de Edición** ([`accounts/[id]/edit/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/accounts/[id]/edit/page.tsx) y [`people/[id]/edit/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/people/[id]/edit/page.tsx)): Paralelización de consultas de entidades primarias y datos relacionales/pendientes.
- **Middleware y Prefetching en el Edge** ([`apps/web/lib/supabase/middleware.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/supabase/middleware.ts)):
  - Fast-path para solicitudes no autenticadas en rutas protegidas: si la cookie `sb-*-auth-token` no existe, redirige de inmediato a `/login` sin consultar al servidor remoto de Supabase (0 ms vs. ~480 ms).
  - Fast-path para `/login`: omite la verificación remota de usuario si no hay cookie de sesión activa.
  - Bypass de revalidación remota de sesión en peticiones automáticas de prefetch de Next.js (`purpose: prefetch` / `next-router-prefetch`) cuando ya existe una sesión en cookies, evitando saturar el pool de conexiones del tier gratuito de Supabase.

### Agregado
- **Suite de Pruebas Unitarias de Divisas y Patrimonio** ([`apps/web/lib/fx.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/fx.test.ts)):
  - 4 pruebas automatizadas con Vitest cubriendo conversión idéntica, cálculo de montos contables (`calculateAccountAmount`), partición exacta de cuotas sin pérdida de centavos (`splitInstallments`) y consolidación concurrente de patrimonio neto (`convertToDisplayCurrency`).

---

## [1.3.0] - 2026-10-09
### Agregado
- **Modal de Previsualización y Edición previa para WhatsApp (`WhatsAppNotifyModal`)** (PRD §4.5):
  - Al presionar **"Notificar por WhatsApp"** en la ficha de persona ([PersonActions.tsx](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/PersonActions.tsx)), ahora se despliega un modal interactivo antes de abrir la aplicación externa.
  - Permite revisar el destinatario, validar su número de teléfono y editar libremente el contenido final del mensaje en un editor integrado.
  - Opción de "Restablecer plantilla" para volver al texto generado originalmente si se desea descartar cambios manuales.
  - Enlace rápido hacia la configuración de la plantilla base en `/people/template`.
  - Botón de confirmación **"Abrir en WhatsApp"** que redirige a la API de WhatsApp (`wa.me`) con el texto final editado.
- **Configuración de Plantilla Dinámica para WhatsApp (`/people/template`)** (PRD §4.5):
  - Botón de acceso directo **"Plantilla WhatsApp"** en el encabezado de `/people` y atajo con ícono de configuración en la barra de acciones de la ficha de persona (`PersonActions.tsx`).
  - Pantalla y modal de configuración (`/people/template` y `@modal/(.)people/template`) para editar la plantilla de mensaje predeterminada.
  - Soporte de variables dinámicas: `$Nombre`, `$Total`, `$Detalle`, `$Cantidad`, y `$Fecha`, con chips interactivos para insertar en la posición del cursor.
  - Previsualización en tiempo real (*Live Preview*) que renderiza el mensaje formateado con datos de muestra.
  - Botón para "Restablecer por defecto" la plantilla sugerida por el sistema.
  - Persistencia de la plantilla por usuario en `user_settings.whatsapp_template` mediante Server Action `updateWhatsAppTemplate`.
  - Migración SQL `supabase/migrations/0007_whatsapp_template.sql` para añadir la columna a `user_settings`.
  - Módulo utilitario [apps/web/lib/whatsapp.ts](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/whatsapp.ts) y suite de pruebas unitarias en Vitest (`apps/web/lib/whatsapp.test.ts`).
- **CRUD Completo de Personas y Contactos (`/people`)** (PRD §4.5):
  - Botón **"Nueva persona"** en la cabecera de `/people` con modal interactivo (`@modal/(.)people/new`) y ruta de fallback directo (`/people/new`).
  - Componente `PersonForm.tsx` para alta y edición de nombre y teléfono (con tip contextual para formatear con código de país para WhatsApp).
  - Modal y ruta de edición individual (`/people/[id]/edit` y `@modal/(.)people/[id]/edit`).
  - Acceso directo a edición mediante ícono de lápiz en el directorio de `/people` y botón "Editar" en la cabecera de la ficha `/people/[id]`.
  - **Baja lógica y desactivación condicional a saldo 0**:
    - Server Action `setPersonActive(id, isActive)` que bloquea la desactivación si la persona registra movimientos pendientes por cobrar (`saldo > 0`), arrojando mensaje explicativo.
    - Protección contra la desactivación o renombramiento del contacto de sistema `Personal`.
    - Sección colapsable en `/people` para explorar "Personas desactivadas" (patrón visual idéntico a Cuentas e Instituciones).
    - Badge semántico `Desactivada` en la ficha de detalle de la persona.
    - Exclusión automática de contactos desactivados de las opciones de nuevos gastos en `TransactionForm.tsx`.
    - Migración `supabase/migrations/0006_people_is_active.sql` con columna `is_active`, índice y trigger SQL `prevent_hard_delete_ledger_entities()` para evitar borrados físicos (`DELETE`) que rompan el historial contable.
- **Cuotas de Tarjetas Ligadas y Estado PENDING** (PRD §3.3):
  - Las compras en $N$ cuotas ahora enlazan todas las cuotas secundarias ($2..N$) a la cuota inicial mediante `parent_transaction_id`.
  - Las cuotas de meses futuros se generan con estado `PENDING`, evitando que descuenten saldo nominal de meses posteriores desde el día 1.
  - Cálculo robusto de fechas de vencimiento de cuotas (`calculateInstallmentDate`) que evita desfases de zona horaria y desbordes de fin de mes (ej. 31 de enero $\rightarrow$ 28 de febrero).
  - División proporcional tanto del importe en moneda original (`amount_original`) como en moneda de cuenta (`amount_account`) usando `splitInstallments`.
  - **Línea de crédito en Tarjetas de Crédito**: La ficha de cuenta calcula el disponible descontando tanto el saldo líquido adeudado del mes como los compromisos retenidos en cuotas futuras pendientes.
  - **Componente y Server Action `confirmTransaction`**: Botón interactivo para confirmar y activar cuotas pendientes cuyo ciclo o fecha ya llegó al día actual (`date <= today`).
  - Badge visual `Pendiente` en los listados de transacciones de Cuenta, Dashboard y Movimientos.
  - Texto informativo dinámico en el selector de cuotas de `TransactionForm.tsx` explicitando el número de cuotas completadas hoy vs. cuotas pendientes diferidas.
- Enlaces directos de navegación en las tarjetas de cuentas del Dashboard (`/dashboard`) hacia la pantalla de detalle individual (`/accounts/{id}`).
- Enlace de acceso rápido "Ver todas" en el encabezado de la columna de Cuentas del Dashboard hacia `/accounts`.
- Resaltado visual en rojo (`text-expense`) para cuentas con saldo negativo (deuda de tarjeta o sobregiros) en el Dashboard.
- **Identificador Visual de Entorno y Versión (`/settings`)** (PRD §6):
  - Componente `SystemInfoCard` en la pantalla de Ajustes con badge semántico dinámico para distinguir entornos (`Desarrollo`, `Pre-producción` y `Producción`).
  - Banner contextual informativo que explicita si la app está operando con datos de prueba o contabilidad real.
  - Visualización en monospace de la versión instalada (`vX.Y.Z`) y host de la base de datos Supabase conectada.
  - Módulo centralizado de detección de entorno y versión (`apps/web/lib/version.ts`) con suite de tests en Vitest.
  - Micro-indicador discreto de versión y entorno en el pie de la barra lateral de navegación (`Navigation.tsx`).

### Modificado
- **Reglas de Proyecto para Agentes (`AGENTS.md`, `.claude/`)**: Establecimiento de la directiva obligatoria que exige recordar explícitamente al usuario la ejecución de cualquier script SQL de migración en Supabase, entregando siempre el bloque de código listo para copiar y pegar.
- **Idempotencia de Migración (`supabase/migrations/0006_people_is_active.sql`)**: Inclusión autocontenida de la función `prevent_hard_delete_ledger_entities()` para garantizar ejecución exitosa independientemente de si la migración `0005` fue corrida previamente o no.
- **Sincronización de Versión del Paquete (`apps/web/package.json`)**: Actualización de versión a `1.3.0` (alineada con el changelog de lanzamientos) e inyección automática en compilación vía `next.config.js`.
- **Cálculo de Patrimonio y Saldos (`apps/web/lib/networth.ts`)**: `getAccountBalances` y `getSingleAccountBalance` ahora filtran estrictamente transacciones con `status = 'COMPLETED'`, preservando la liquidez real.
- **Presupuesto del Mes (`/dashboard`)**: `realSpent` computa únicamente consumos ejecutados con `status = 'COMPLETED'`.


---

## [1.2.0] - 2026-09-13
### Agregado
- **Pantalla de Detalle de Cuenta (`/accounts/[id]`)** (PRD §3.2):
  - Encabezado con nombre, institución bancaria asociada, tipo de producto y divisa nativa.
  - Saldo nominal actual con destaque visual diferenciado para tarjetas de crédito (deuda).
  - Indicadores clave del mes: Gastos, Ingresos, y para tarjetas: Deuda acumulada y Pagos realizados.
  - Historial filtrado de movimientos (`master_transactions`) exclusivo de la cuenta con paginación/scroll.
  - Botón de acción contextual en cabecera: **"Registrar pago"** para cuentas de tipo `credit_card`, y **"Ajuste express"** para el resto de cuentas (`checking`, `savings`, `cash`, `investing`).
- **Transferencias Inter-Cuenta y Asientos Contables Ligados** (PRD §3.1):
  - Server Action `createTransferTransaction`: genera 2 filas atómicas en `master_transactions` enlazadas mediante `parent_transaction_id` (débito con signo negativo en cuenta origen, crédito con signo positivo en cuenta destino).
  - Soporte multi-divisa con conversión de tipo de cambio en tiempo real o ingresado manualmente.
  - Pestaña "Transferencia" en el formulario universal de transacciones (`apps/web/components/TransactionForm.tsx`).
- **Modal de Pago de Tarjeta de Crédito (`RegisterCardPaymentModal`)** (PRD §3.3):
  - Precarga automática del saldo adeudado de la tarjeta con botón de atajo "Pagar total".
  - Selector de cuenta bancaria pagadora (filtrado por cuentas líquidas activas).
  - Cálculo automático multi-moneda con preview en vivo del débito en moneda origen y crédito exacto en la tarjeta destino (`amountFrom` vs `amountTo`).
  - Al registrarse como transferencia (`TRANSFER`), no infla ni duplica los reportes de gastos del presupuesto mensual.
- **Modal de Ajuste Express (`ExpressAdjustModal`)** (PRD §3.2):
  - Cálculo de la diferencia entre el saldo del sistema y el saldo real que informa el banco.
  - Generación de movimiento contable de ajuste (`ADJUSTMENT`) para conciliar saldos sin alterar categorías de presupuesto.
- **Botón y Acción de Eliminación de Movimientos (`DeleteTransactionButton`)**:
  - Permite eliminar transacciones individuales desde el feed de la cuenta.
  - En transferencias y pagos enlazados, elimina automáticamente en cascada ambos asientos vinculados por `parent_transaction_id`.
- **Selector de Tema Claro / Oscuro (`ThemeToggle`)**:
  - Toggle accesible en la barra de navegación que persiste la preferencia en `localStorage` y actualiza la clase `dark` en el elemento raíz `<html>`.

### Corregido
- **Conversión de Divisas en Pagos de Tarjeta**: Corrección del cálculo contable en transferencias con monedas dispares donde la moneda original ingresada pertenecía a la cuenta destino (ej. pagar tarjeta en UYU con fondos de cuenta en EUR). Ahora debita el monto exacto convertido en la cuenta bancaria y acredita el 100% de la deuda en la tarjeta.
- **Eliminación de Signos Duplicados en Feeds**: Corrección del renderizado en las listas de transacciones del Dashboard y Movimientos para filas `TRANSFER` y `ADJUSTMENT`.
- **Manejo de Redirecciones en Server Actions**: Adición del helper `rethrowRedirect` para asegurar que las redirecciones en formularios cliente no sean capturadas por bloques `try/catch`.

---

## [1.1.0] - 2026-08-28
### Agregado
- **Estructura Base del Proyecto**:
  - Aplicación Next.js 14 con App Router y Tailwind CSS en `apps/web`.
  - Sistema de diseño financiero Finance Nomad con paleta de tokens semánticos (CSS variables) y tipografía mono para montos numéricos.
  - Módulo de autenticación Supabase con soporte para email/password, confirmación de correo y restablecimiento de contraseña.
- **Módulo de Cuentas e Instituciones** (PRD §1):
  - CRUD de instituciones financieras (bancos, billeteras, fintechs).
  - CRUD de cuentas monetarias asociadas a instituciones con soporte multi-moneda (`EUR`, `USD`, `UYU`, etc.).
  - Filtro de instituciones y cuentas activas / inactivas con triggers SQL de protección contra hard deletes.
- **Módulo de Movimientos / Ledger Mínimo** (PRD §2):
  - Formulario de registro de ingresos y gastos con conversión FX automática.
  - Listado de transacciones con filtros y detalle de cuotas (`installment_current` de `installment_total`).
- **Dashboard Principal** (PRD §6):
  - Visualización del Patrimonio Neto total consolidado en la moneda de preferencia del usuario (`display_currency`).
  - Resumen mensual de presupuesto gastado vs. proyectado.
  - Columnas de cuentas e historial reciente de movimientos.
- **Módulo de Personas y Préstamos Base** (PRD §4):
  - Listado y creación de personas para control de deudas/préstamos.
  - Ficha de persona con saldos consolidados y liquidación de deudas.
- **Módulo de Configuración de Usuario (`/settings`)**:
  - Selección de moneda global de presentación (`user_settings`).
- **Base de Datos y Migraciones**:
  - Esquema SQL inicial (`0001_init_schema.sql` a `0005_prevent_hard_delete.sql`) con RLS exhaustivo y protección contra borrado físico.
