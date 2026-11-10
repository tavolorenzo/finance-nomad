# Registro de Versiones (Changelog) — Finance Nomad

Todas las modificaciones notables, nuevas funcionalidades y correcciones de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y adhiere a [Semantic Versioning](https://semver.org/lang/es/).

> [!IMPORTANT]
> **Instrucción para Agentes y Desarrolladores**:
> Ante cada cambio, refactorización, corrección de bugs o nueva funcionalidad implementada, **es obligatorio actualizar este archivo** agregando los detalles bajo la versión correspondiente o en la sección `[Unreleased]`.

---

## [Unreleased]

## [2.23.0] - 2026-11-10
### Agregado
- **Soporte PWA Completo y Resiliencia Offline con Service Worker (`apps/web/public/sw.js`, `manifest.ts`, `ServiceWorkerRegister.tsx`, `layout.tsx`)**:
  - **Service Worker Nativo (`public/sw.js`)**:
    - Estrategia `CacheFirst` para assets inmutables de Next.js (`/_next/static/*`, fuentes `.woff2`, iconos y estilos).
    - Estrategia `NetworkFirst` con timeout de 2.5s y fallback a caché para navegación HTML, evitando la pantalla nativa de error del navegador ante recargas (F5) o pérdida repentina de conexión a internet.
    - Exclusión estricta de peticiones con método distinto a `GET` (Server Actions `POST`), endpoints de autenticación (`/auth/*`, Supabase Auth) y el endpoint `/api/bootstrap` para no interferir con la sincronización controlada de datos.
    - Página de contingencia offline elegante en caso de intentar acceder sin red a una ruta no visitada previamente.
  - **Manifiesto Web PWA (`apps/web/app/manifest.ts`)**:
    - Configuración nativa de Next.js MetadataRoute: `display: 'standalone'`, orientación portrait, colores `--surface-0` (`#09090b`) y `--accent` (`#3b82f6`), apto para instalación en Android, iOS y escritorio.
  - **Componente de Registro (`ServiceWorkerRegister.tsx`)**:
    - Registro optimizado tras el evento `window.load` para no competir con el TTI (Time to Interactive).
- **Integración de Préstamos en Almacenamiento Local IndexedDB (`apps/web/app/api/bootstrap/route.ts`, `ledger-context.tsx`, `LoansClient.tsx`)**:
  - **Préstamos en Snapshot de Arranque (`/api/bootstrap`)**: Inclusión de la consulta optimizada a `loans` y `loan_installments` activos junto a instituciones y personas en el payload inicial.
  - **Persistencia en `LedgerContext` e IndexedDB**: Almacenamiento de `loans` en `app_snapshot` para disponibilidad en 0 ms y exposición reactiva en `useLedger()` / `useOptionalLedger()`.
  - **Hidratación Offline en `/loans` (`LoansClient.tsx`)**: Si la conexión con Supabase falla por corte de red, `LoansClient` detecta la lista vacía del servidor y se hidrata automáticamente desde `useOptionalLedger()`, manteniendo visibles los préstamos, cuotas y KPIs.
  - **Protección Online-First en Creación de Préstamos (`LoanForm.tsx`)**: Se mantiene la deshabilitación del submit y el aviso preventivo cuando `!isOnline`.
- **Pruebas Automatizadas**:
  - [`apps/web/components/ServiceWorkerRegister.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ServiceWorkerRegister.test.tsx): Pruebas de registro en ventana y tolerancia en entornos sin Service Worker.
  - [`apps/web/components/LoansClient.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/LoansClient.test.tsx): Pruebas de renderizado inicial, sembrado en ledger e hidratación offline desde `useOptionalLedger()`.
- **Documentación y Centro de Ayuda (`docs/architecture.md`, `AGENTS.md`, `apps/web/lib/help-data.ts`)**:
  - Enriquecimiento del artículo `wiki-offline` y nueva FAQ `faq-offline-pwa` sobre instalación PWA, comportamiento ante F5 y consulta de préstamos sin conexión.
  - Formalización en [`docs/architecture.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/architecture.md) y [`AGENTS.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/AGENTS.md) de la directiva de mantenimiento continuo de la arquitectura PWA/offline ante nuevos módulos o cambios de entidades.

## [2.22.0] - 2026-11-10
### Agregado
- **Master Switch en Análisis y Datos (`/analytics`, `AnalyticsDashboard.tsx`, `page.tsx`, `lib/analytics.ts`, PRD §4.15)**:
  - **Alternador de Alcance de Transacciones (Personales vs. Terceros)**:
    - Control segmented switch en la cabecera de `/analytics` que permite alternar en 0ms entre **"Solo personales"** (aísla el costo de vida real excluyendo consumos por cuenta de terceros) y **"Todos"** (audita el volumen financiero bruto total operado).
    - Estado activo por defecto en **"Solo personales"**, garantizando que las métricas de gasto, ahorro y promedios reflejen los consumos puramente propios del usuario.
    - Indicador informativo dinámico que exhibe la cantidad de movimientos de terceros excluidos en el período seleccionado.
  - **Motor de Filtrado Reactivo y Soporte Offline (`apps/web/lib/analytics.ts`, `apps/web/lib/ledger/ledger-context.tsx`)**:
    - Funciones `isThirdPartyTransaction` y `filterTransactionsByScope` para filtrar atómicamente por asignación de personas (`person_id` y catálogo de `people`).
    - Tolerancia total sin conexión: combina catálogo de personas de servidor con el almacenamiento local `IndexedDB` a través de `useLedger().people`.
    - Recálculo reactivo instantáneo en cliente de las 5 KPI cards (Gastos, Ingresos, Flujo Neto, Tasa de Ahorro, Promedio Diario), Gastos por Categoría, Flujo de Caja Mensual, Distribución Multi-Moneda y Métodos de Pago.
  - **Pruebas Automatizadas**:
    - Nuevos tests unitarios en [`apps/web/lib/analytics.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/analytics.test.ts) y [`apps/web/components/AnalyticsDashboard.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AnalyticsDashboard.test.tsx) validando el comportamiento del Master Switch y la consistencia de totales.
- **Centro de Ayuda y Documentación (`docs/PRD.md`, `apps/web/lib/help-data.ts`)**:
  - Actualización de §4.15 del PRD marcando el Master Switch como funcionalidad activa y formalmente implementada.
  - Enriquecimiento del artículo de la Wiki `wiki-analytics` con sección detallada del Master Switch y nueva FAQ `faq-analytics-scope-switch`.

## [2.21.0] - 2026-11-10
### Agregado
- **Rediseño Integral y Modernización del Dashboard Principal (`/dashboard`, `DashboardClient.tsx`, `DashboardKpiGrid.tsx`, `AccountsCardList.tsx`, `CreditCardsSummaryList.tsx`, `ExpensesAnalyticsWidget.tsx`, `QuickLoansWidget.tsx`, `RecentTransactionsWidget.tsx`, `metrics.ts`, PRD §4.1)**:
  - **Franja Superior de Balances y KPIs (4 Cards Estratégicas)**:
    - *Patrimonio Neto*: Valor patrimonial consolidado en divisa global (activos líquidos menos pasivos).
    - *Cash Flow del Período*: Flujo neto ($\text{Ingresos} - \text{Gastos Propios}$), tasa de ahorro y desglose de entradas y salidas.
    - *Total Adeudado (Cálculo Híbrido)*: Importe principal con la deuda corriente a pagar (tarjetas de crédito y cuotas de préstamos tomados) con badge secundario indicando el importe de cuotas futuras ya comprometidas.
    - *Por Cobrar*: Cuentas por cobrar acumuladas de terceros (gastos compartidos asumidos con `settled_at is null`) y préstamos otorgados pendientes de cobro, con acceso directo a `/people`.
  - **Separación Nítida de Cuentas y Tarjetas de Crédito**:
    - *Cuentas & Efectivo*: Bloque exclusivo para cuentas corrientes, cajas de ahorro, billeteras e inversiones, con cómputo de liquidez total disponible en divisa global y accesos directos.
    - *Tarjetas de Crédito*: Sección dedicada para plásticos con detección automática de red (VISA, Mastercard, AMEX), saldo corriente a pagar, estado del período contable o alerta destacada para verificar el resumen mensual.
  - **Switch de Período Rápido (Mes Actual vs. Últimos 30 Días)**:
    - Selector en la cabecera que permite alternar la ventana de análisis entre el mes calendario en curso y los últimos 30 días móviles, cubriendo la bisagra del cambio de mes.
  - **Radiografía de Gastos: Consumo Propio vs. Terceros y Gráfico por Categorías**:
    - Barra comparativa visual del esfuerzo financiero que discrimina gastos personales frente a compras asumidas por cuenta de terceros a cobrar.
    - Gráfico por categorías estilizado con barras de progreso relativas, iconos semánticos y montos exactos aplicados estrictamente sobre consumos personales.
  - **Widget de Vista Rápida de Préstamos**:
    - Resumen compacto de préstamos activos tomados (`borrowed`) y otorgados (`lent`), con alerta destacada de la próxima cuota a vencer (monto, fecha y contraparte).
  - **Módulo de Métricas Puras y Cobertura de Tests**:
    - Módulo `apps/web/lib/dashboard/metrics.ts` con funciones puras para cash flow, pasivos híbridos, cuentas a cobrar y resúmenes de préstamos.
    - Suite de pruebas unitarias exhaustiva en `apps/web/lib/dashboard/metrics.test.ts` y actualización de tests de integración en `DashboardClient.test.tsx` y `page.test.tsx`.
- **Centro de Ayuda y Wiki (`apps/web/lib/help-data.ts`)**:
  - Nuevo artículo de wiki `wiki-dashboard` (*Dashboard Principal y Torre de Control*).
  - Tres nuevas preguntas frecuentes: `faq-dashboard-periods`, `faq-dashboard-third-party`, `faq-dashboard-card-debt`.
- **Sincronización de Versión SemVer**:
  - Actualización a `2.21.0` en `apps/web/package.json`, `apps/web/lib/version.ts` y `apps/web/lib/version.test.ts`.

## [2.20.0] - 2026-11-10
### Agregado
- **Paginación en Vistas con Histórico de Movimientos (`PaginationControl.tsx`, `TransactionsList.tsx`, `AccountDetailClient.tsx`, `PersonDetailClient.tsx`, PRD §4.2, §4.3, §4.5)**:
  - **Componente Reutilizable `PaginationControl.tsx`**:
    - Control accesible con ARIA (`aria-label`, `aria-current`), números de página dinámicos con elipsis, botones *Anterior* y *Siguiente*, diseño responsive para móviles y cifras monetarias y de conteo con `font-mono tabular-nums`.
    - Cumplimiento total de tokens del sistema de diseño (`--surface-1`, `--surface-2`, `--border`, `--text-primary`, `--text-muted`, `--accent`).
    - Suite de pruebas unitarias exhaustiva (`PaginationControl.test.tsx`).
  - **Paginación en Lista General de Movimientos (`/transactions`, `TransactionsList.tsx`)**:
    - Paginación local en bloques de 20 movimientos por página, previniendo el scroll infinito y la acumulación desmedida de nodos en el DOM.
    - Soporte integrado de carga de lotes remotos en background al alcanzar las páginas finales si existen más movimientos en el servidor (`hasMoreTransactions`).
    - Pruebas unitarias de navegación y paginado en `TransactionsList.test.tsx`.
  - **Paginación en Ficha de Cuentas (`/accounts/[id]`, `AccountDetailClient.tsx`)**:
    - Paginación a 20 movimientos por página sobre `visibleTransactions` tanto en el filtro *"Este período"* como en *"Todos los movimientos"*.
    - Reajuste y reseteo defensivo automático a la página 1 ante cambios de filtro (`filterMode`), cambio de período contable (`selectedPeriod`) o reducción de lista.
    - Pruebas unitarias en `AccountDetailClient.test.tsx`.
  - **Paginación en Ficha de Personas (`/people/[id]`, `PersonDetailClient.tsx`)**:
    - Paginación a 10 movimientos por página en la sección de *"Historial cobrado"* (`settled`), manteniendo visible y despejado el panel superior de cobros pendientes.
    - Suite de pruebas unitarias en `PersonDetailClient.test.tsx`.
  - **Reglas del Proyecto para Agentes (`AGENTS.md`)**:
    - Incorporación de la regla obligatoria §1: *Presentación Previa Obligatoria de Plan de Implementación e Impacto*, exigiendo presentar objetivo, alcance, análisis de impacto y plan secuencial antes de ejecutar modificaciones de código.
  - **Centro de Ayuda y Wiki (`apps/web/lib/help-data.ts`)**:
    - Nueva sección de Wiki en `wiki-ledger` y nueva pregunta frecuente `faq-transactions-pagination` documentando la paginación de movimientos y prevención de scroll infinito.

## [2.19.0] - 2026-11-08
### Agregado
- **Carga Rápida y Pegado Mágico para Cuentas Bancarias y Billeteras (`/accounts/[id]/bulk`, `AccountBulkWizard.tsx`, `SmartPasteModal.tsx`, `card-statement-parser.ts`, `bulk-card-actions.ts`, `AccountDetailClient.tsx`, PRD §4.2, §4.12)**:
  - **Extensión de Carga Rápida a Cuentas no-tarjeta (`/accounts/[id]/bulk`)**: Se eliminó la restricción exclusiva a tarjetas de crédito en la ruta bulk, permitiendo que cualquier cuenta bancaria (cuenta corriente, caja de ahorro, billetera virtual, efectivo o inversión) utilice el asistente de carga rápida en bloque.
  - **Asistente Especializado `AccountBulkWizard`**:
    - Grilla spreadsheet-like diseñada para movimientos bancarios con columnas de Fecha, Período Contable, selector de Tipo (`OUTCOME` / Gasto en rojo vs. `INCOME` / Ingreso en verde), Concepto con auto-sugerencia heurística de categorías, Categoría (con modal `CategoryModal` integrado para dar de alta nuevas en el momento), Persona asignada (para imputar gastos compartidos o ingresos), Divisa y Monto.
    - Tarjeta de Impacto Financiero en vivo que discrimina Total Gastos, Total Ingresos y Saldo Neto Resultante (+/- en la cuenta), alertando además sobre gastos asignados a terceros a cobrar.
    - Navegación ágil por teclado (Enter en monto agrega fila inmediatamente), botón para limpiar grilla y confirmación visual instantánea.
  - **Pegado Mágico Adaptado a Home Banking (`SmartPasteModal.tsx`, `card-statement-parser.ts`)**:
    - Detección de fechas con formato de punto (`DD.MM.AAAA`, `DD.MM.AA`, `DD.MM`) habituales en extractos bancarios de Argentina, Uruguay y Europa.
    - Heurística de ingresos vs. débitos de home banking: interpreta importes negativos (`-15.000`) o palabras de débito/compra/transferencia enviada como gastos (`OUTCOME`), e importes con signo positivo o palabras clave (sueldo, haberes, acreditación, transferencia recibida, rendimientos, intereses, cobro, reintegro) como ingresos (`INCOME`).
    - Vista previa con badges interactivos que permiten alternar con 1 clic entre "Gasto" e "Ingreso" antes de volcar las filas a la grilla.
    - Textos, recordatorios y ejemplos adaptados a extractos bancarios y billeteras electrónicas.
  - **Acceso Rápido en Ficha de Cuentas (`AccountDetailClient.tsx`)**: Botón *"Carga rápida"* con ícono de chispas en la cabecera de todas las cuentas no-tarjeta junto a *"Ajuste Express"*.
  - **Acción de Servidor Generalizada (`bulk-card-actions.ts`)**: Soporte de campo `type?: 'OUTCOME' | 'INCOME'` para registro atómico en `master_transactions` y exportación del alias `saveBulkAccountMovementsAction`.
  - **Centro de Ayuda, Wiki y Recetas Rápidas (`apps/web/lib/help-data.ts`)**:
    - Nuevo apartado en el artículo de la Wiki `wiki-accounts` sobre Carga Rápida y Pegado Mágico de Home Banking.
    - Nuevas FAQs `faq-acc-bulk` y `faq-acc-magic-paste`.
    - Nueva guía paso a paso `guide-account-bulk-ingest`.
    - Suites de pruebas unitarias (`AccountBulkWizard.test.tsx`, `SmartPasteModal.test.tsx`, `card-statement-parser.test.ts`, `AccountDetailClient.test.tsx`, `help-data.test.ts`).

### Corregido
- **Falsos positivos de subpalabras cortas en `suggestCategory` (`card-statement-parser.ts`)**: Se corrigió el emparejamiento de subpalabras cortas (ej. `'metro'` de Transporte dentro de `'metrogas'` de Servicios) exigiendo límites de palabra para keywords $\le 5$ caracteres y permitiendo prefijos con límite inicial para palabras compuestas o plurales.

## [2.18.0] - 2026-11-08
### Agregado
- **Período Contable en Detalle de Cuentas y Tarjetas (`/accounts/[id]`, `AccountDetailClient.tsx`, `app/(protected)/accounts/[id]/page.tsx`, PRD §4.2, §4.4)**:
  - **Barra de Control de Período Contable Unificada**: Incorporación del selector de período contable (`Calendar`, botones de anterior/siguiente `ChevronLeft`/`ChevronRight`, mes formateado y acceso rápido *"Volver a [Mes actual]"*), homologando el diseño e interacción de `/cards` y `/people/[id]`.
  - **Soporte de Parámetro URL (`?period=YYYY-MM`) y Navegación Cruzada**: Conservación automática del período seleccionado al navegar desde el centro de tarjetas (`/cards?period=...`) hacia el detalle individual de cada plástico o viceversa.
  - **Métricas y Resúmenes Contextuales al Período**:
    - **Tarjetas de crédito**: Cómputo bimonetario de los consumos del resumen seleccionado (`selectedPeriod`), proyección de compromisos en cuotas posteriores (`> selectedPeriod`) y paso del período al enlace *"Verificar resumen"* (`/accounts/[id]/verify?period=...`) y a `RegisterCardPaymentModal` (`initialPeriod`).
    - **Cuentas bancarias y efectivo**: El panel lateral calcula ingresos, egresos y balance neto correspondientes al período contable activo.
  - **Selector de Alcance en el Historial de Movimientos**: Alternador de 1 clic entre *"Este período (N)"* (filtrado por `effectivePeriod === selectedPeriod` para conciliación rápida) y *"Todos (M)"* (auditoría completa del historial).
  - **Arquitectura Reactiva y Zero-Wait UI (`AccountDetailClient.tsx`)**: Integración con `useOptionalLedger()` para soporte offline-first y reactividad inmediata en IndexedDB.
- **Centro de Ayuda, Wiki y Pruebas (`apps/web/lib/help-data.ts`, `AccountDetailClient.test.tsx`)**:
  - Nueva sección en la Wiki (`wiki-accounts`) y nueva FAQ (`faq-acc-period`) explicando la navegación de meses contables en cuentas y tarjetas.
  - Suite de pruebas unitarias cubriendo conmutación de períodos, filtros y propagación a modales de pago y verificación.

### Modificado
- **Unificación de Nomenclatura a "Tarjetas de crédito" (`Navigation.tsx`, `CreditCardsDashboard.tsx`, `AccountsClient.tsx`, `RegisterCardPaymentModal.tsx`, `DashboardClient.tsx`, `WelcomeWizard.tsx`, `help-data.ts`, PRD §4.14)**:
  - **Claridad Terminológica**: Reemplazo de la denominación genérica *"Tarjetas"* por *"Tarjetas de crédito"* en menús principales (desktop y móvil), encabezados de dashboard (`CreditCardsDashboard`), selectores de filtro, botones de acción rápida (`AccountsClient`), modal de pago (`RegisterCardPaymentModal`), banners de resumen (`DashboardClient`), asistente inicial (`WelcomeWizard`) y Centro de Ayuda (`help-data.ts`) para evitar cualquier ambigüedad con tarjetas de débito.

## [2.17.0] - 2026-11-05
### Agregado
- **Módulo Integral de Presupuesto y Gastos Fijos (`/budget`, `BudgetClient.tsx`, `BudgetEstimateModal.tsx`, `lib/budget/calculations.ts`, `budget/actions.ts`, PRD §4.6)**:
  - **ABM / CRUD Completo de Estimaciones (`BudgetEstimateModal.tsx`, `budget/actions.ts`)**: Creación, edición y baja/reactivación lógica (`is_active`) para **Gastos fijos recurrentes** (`EXPENSE_ESTIMATE`) e **Ingresos proyectados** (`INCOME_ESTIMATE`), con selector de día de vencimiento/cobro (`1..31`), cuenta preferida opcional, creación de categoría en el momento (`CategoryModal`) y protección preventiva offline (`useOnlineStatus()`).
  - **Motor de Cálculo Multi-Moneda (`lib/budget/calculations.ts`)**: Cruza cada estimación con los movimientos reales propios del período contable (`YYYY-MM`) asociados a su categoría (excluyendo `TRANSFER`, `ADJUSTMENT` y consumos de terceros), convirtiendo divisas con tasas manuales (`active_currencies`) o de mercado (`open.er-api.com`) y calculando insignias de estado de vencimiento (*Cubierto*, *Vence hoy*, *Vencido*, *En X días*).
  - **KPIs Consolidados y Compromisos Automáticos en Cuotas (`BudgetClient.tsx`)**: Cuatro tarjetas de métricas en moneda global (*Gastos fijos del mes*, *Compromisos en cuotas*, *Ingresos proyectados* y *Margen proyectado*) más sección automática que unifica las cuotas vigentes de tarjetas de crédito y los vencimientos de préstamos (`loan_installments`) del mes.
  - **Ejecución 1-Tap Bimonetaria (`ExecutePaymentButton.tsx`, `executeBudgetPayment`)**: Ejecución directa en 1 clic con **Zero-Wait UI** (`ledger.addTransaction`) cuando el estimado tiene cuenta preferida en la misma moneda, o modal rápido de confirmación con selector de cuenta y tipo de cambio sugerido cuando la moneda de la cuenta difiere.
- **Sincronización Multi-Moneda en Dashboard (`app/(protected)/dashboard/page.tsx`, `DashboardClient.tsx`)**:
  - Conversión de estimaciones y gastos reales del mes a `displayCurrency` antes de consolidar el indicador de *"Presupuesto del mes"*, y enlace directo desde la tarjeta del Dashboard hacia `/budget`.
- **Centro de Ayuda, Documentación y Pruebas (`apps/web/lib/help-data.ts`, `docs/PRD.md`, `docs/prd-gap-analysis.md`)**:
  - Nuevo artículo en la Wiki (`wiki-budget`), 2 nuevas FAQs (`faq-budget-create`, `faq-budget-execute-fx`), nueva guía paso a paso (`guide-budget`) y suites de pruebas unitarias (`calculations.test.ts`, `budget/actions.test.ts`, `BudgetEstimateModal.test.tsx`).

## [2.16.0] - 2026-11-05
### Agregado
- **Soporte de Mes Contable en el Registro de Pago de Tarjeta (`RegisterCardPaymentModal.tsx`, `TransactionForm.tsx`, `lib/ledger/builder.ts`, `lib/ledger/types.ts`, PRD §4.14)**:
  - **Selector de Resumen a Cancelar en `RegisterCardPaymentModal`**: Incorporación de selector visual de mes contable con accesos directos de 1 clic para *Mes anterior* (ej. `Octubre 2026 · Resumen cerrado`) y *Mes actual* (ej. `Noviembre 2026 · En curso`), más selector libre de mes (`YYYY-MM`).
  - **Detección inteligente de vencimiento**: Si la fecha actual se encuentra dentro de los primeros días del mes (o antes de la fecha de cierre de la tarjeta), la app sugiere automáticamente el mes anterior como el resumen a pagar, evitando que figure como impago.
  - **Separación de fecha de caja vs. período imputado en `buildTransferBundle`**: En transferencias donde la cuenta destino es una tarjeta de crédito (`type === 'credit_card'`), la cuenta origen (banco) mantiene la fecha y mes real de la salida de fondos (`date.slice(0, 7)`), mientras que la tarjeta acredita la cancelación con el `accounting_period` del resumen seleccionado.
  - **Formulario general de transferencias (`TransactionForm.tsx`)**: Se habilitó el selector de mes contable imputado cuando el destino de una transferencia sea una tarjeta de crédito (`toAccount.type === 'credit_card'`).
  - **Cálculo de Pagos y Estado del Resumen en `computeCardPeriodSummary` (`lib/credit-cards/analytics.ts`)**: Se incorporó el cómputo de transferencias entrantes del período (`periodPaymentsByCurrency`, `periodPaymentsInDisplay` y bandera `isStatementPaid`), reflejando con exactitud si el resumen mensual está saldado o con pago parcial.
  - **Insignia de Resumen Pagado en `CreditCardsDashboard.tsx`**: Visualización de badge `Resumen pagado` o `Pago parcial: $X` directamente en la tarjeta de cada plástico dentro de `/cards`.
  - **Centro de Ayuda, Wiki y Recetas Rápidas (`apps/web/lib/help-data.ts`)**: Actualización de la sección de pago en `wiki-cards`, nueva FAQ (`faq-card-payment-period`) y nueva guía paso a paso (`guide-pay-card-statement`).

### Corregido
- **Resúmenes anteriores mostrados como impagos al pagar a principio de mes**: Se solucionó la discordancia contable por la cual pagar el resumen de un mes cerrado durante los primeros días del mes subsiguiente hacía que el mes anterior figurase como impago y el mes en curso absorbiese un crédito indebido.

## [2.15.0] - 2026-11-04
### Agregado
- **Filtro de Período Contable en Módulo de Personas (`/people`, `/people/[id]`, `PeopleDirectoryClient.tsx`, `PersonDetailClient.tsx`, `PersonActions.tsx`, `RegisterPersonPaymentModal.tsx`, `lib/ledger/settlement.ts`, PRD §4.5)**:
  - **Resolución de período efectivo (`resolveEffectiveAccountingPeriod`)**: Todo movimiento sin `accounting_period` explícito toma automáticamente el mes de la fecha del gasto (`date.slice(0, 7)`).
  - **Selector de Período Contable unificado con Tarjetas**: Incorporación de la barra interactiva `< Período contable: Mes Año >` en la vista general (`/people`) y dentro de la ficha de cada persona (`/people/[id]`), manteniendo el período sincronizado al navegar entre ambas pantallas (`?period=YYYY-MM`).
  - **Separación estricta entre período seleccionado, anteriores y futuros**: Evita que al revisar durante los primeros días del mes se mezclen los saldos del período contable anterior con los del período actual, discriminando el saldo del período elegido (`=== YYYY-MM`), los saldos impagos de períodos anteriores (`< YYYY-MM`) y las cuotas de próximos meses (`> YYYY-MM`).
  - **WhatsApp y Registro de Cobro contextualizados al período**: `PersonActions` genera el mensaje de WhatsApp exclusivamente con los movimientos del período contable seleccionado, y `RegisterPersonPaymentModal` precarga el saldo del período con accesos rápidos para cobrar el período, el acumulado o el total global.
- **Centro de Ayuda y Documentación (`apps/web/lib/help-data.ts`, `docs/PRD.md`)**:
  - Actualización de `wiki-people` y §4.5 del PRD documentando el filtro por período contable y la inferencia por mes del gasto.

## [2.14.4] - 2026-11-03
### Modificado
- **Diseño Compacto del Banner de Verificación de Resumen de Tarjeta (`apps/web/components/DashboardClient.tsx`, `apps/web/components/DashboardClient.test.tsx`, PRD §4.13)**:
  - Se reorganizó el contenedor del banner en dos bloques verticales: un bloque superior a ancho completo con el título y subtítulo uno debajo del otro, seguido de un contenedor inferior con la grilla horizontal de botones de verificación por tarjeta, evitando el desplazamiento lateral del texto.
  - Se reemplazó el botón textual *"Ahora no"* por un botón circular con ícono de cierre (`X`) ubicado en la esquina superior derecha del banner.

## [2.14.3] - 2026-11-03
### Corregido
- **Tipado de Cuentas con Institución en Modal de Pago de Tarjeta (`apps/web/components/RegisterCardPaymentModal.tsx`, `apps/web/components/cards/CreditCardsDashboard.tsx`, PRD §4.14)**:
  - Se amplió la interfaz `RegisterCardPaymentModalProps` para admitir `institutions?: { name: string } | null` en `fundingAccounts`, resolviendo el error de compilación de TypeScript en el build de producción de Vercel al pasar `CardAccountWithInstitution[]` desde `CreditCardsDashboard`.

## [2.14.2] - 2026-11-03
### Modificado
- **Texto de Botones en Banner de Verificación de Tarjeta (`apps/web/components/DashboardClient.tsx`, `apps/web/components/DashboardClient.test.tsx`, PRD §4.13)**:
  - En el banner *"¿Te llegó el resumen de la tarjeta?"* del Dashboard, todos los botones generados por tarjeta (tanto con una sola tarjeta como con múltiples) muestran ahora el formato `Verificar {Nombre de Tarjeta} - {Institución}`, preservando además el nombre de la institución al hidratarse con el estado reactivo de `LedgerContext`.

## [2.14.1] - 2026-11-02
### Corregido
- **Saldo por Cobrar según Mes Contable en Personas (`/people`, `/people/[id]`, `PersonActions.tsx`, `RegisterPersonPaymentModal.tsx`, `lib/ledger/settlement.ts`, PRD §4.5)**:
  - Incorporación de `isCurrentCollectibleDebt` en `lib/ledger/settlement.ts`: evalúa como deuda exigible actual los movimientos pendientes con `accounting_period <= YYYY-MM` actual más aquellos que no tienen `accounting_period` asignado, separando las cuotas y consumos diferidos a meses contables futuros (`accounting_period > YYYY-MM`).
  - **Directorio de Personas (`/people/page.tsx`)**: La tarjeta de cada persona muestra en **Saldo por cobrar** únicamente el total exigible del mes contable actual (y anteriores impagos) + movimientos sin mes contable, exhibiendo en una línea secundaria discreta (*"Próximos meses"*) el saldo diferido en períodos futuros y la insignia **Cuotas futuras** cuando el mes actual está al día.
  - **Ficha de Persona (`/people/[id]/page.tsx`, `PersonActions.tsx`, `RegisterPersonPaymentModal.tsx`)**: Unificación del indicador principal de cabecera, el mensaje de notificación por WhatsApp, la separación entre *"Pendiente ahora"* vs. *"Cuotas futuras"* y la precarga de `allocateSettlement` bajo el mismo criterio de mes contable.
- **Centro de Ayuda y Documentación (`apps/web/lib/help-data.ts`, `docs/PRD.md`)**:
  - Actualización de `wiki-people` y §4.5 del PRD reflejando el cálculo del saldo por cobrar por período contable.

## [2.14.0] - 2026-11-02
### Agregado
- **Centro de Control y Análisis de Tarjetas de Crédito (`/cards`, `apps/web/app/(protected)/cards/page.tsx`, `CreditCardsDashboard.tsx`, `CardBrandSeal.tsx`, `lib/credit-cards/analytics.ts`, PRD §4.14)**:
  - **Navegación principal dinámica (`Navigation.tsx`, `AccountsClient.tsx`)**: Incorporación del ítem **Tarjetas** (`/cards`) en el bloque principal del menú lateral y barra móvil, visible únicamente si el usuario cuenta con al menos un producto de tipo `credit_card`.
  - **Bloque A — KPIs Globales Consolidados**: Total de consumos del resumen según el período contable (`accounting_period`), desglose entre gastos propios (`Personal`) y de terceros (extensiones / *Split Pay*), compromisos diferidos en cuotas futuras, porcentaje de utilización del límite global y avance de conciliación (`is_verified`).
  - **Bloque B — Proyección de Liberación de Cuotas (*Run-off* a 6 y 12 meses)**: Gráfico de barras apiladas mes a mes e hitos automáticos de alivio financiero (*Drop-off Insights*) que informan cuántos planes de cuotas terminan en cada mes y cuánto saldo mensual se libera.
  - **Bloque C — Matriz Visual de Plásticos con Detección de Sello de Red**: Tarjeta estética por cada plástico con chip EMV vectorial y detección automática del sello de red (**VISA**, **AMEX**, **Mastercard** y **Maestro**) a partir del nombre del producto (`detectCardBrand`), contador de días hasta el próximo cierre (`closing_day`), pills bimonetarias, barra de límite y acciones en 1 clic (`Verificar`, `Carga rápida`, `Detalle`, `Registrar pago`).
  - **Bloque D — Radiografía Analítica**: Tabla maestra de planes de cuotas activos (`Cuota C de T`, saldo remanente y mes de finalización) y desglose de consumos de tarjeta por persona y por categoría (excluyendo `TRANSFER` y `ADJUSTMENT`).
- **Centro de Ayuda y Documentación (`apps/web/lib/help-data.ts`, `docs/PRD.md`)**:
  - Enriquecimiento de la Wiki de tarjetas (`wiki-cards`), nueva FAQ (`faq-card-analytics-center`) y documentación de §4.14 en `docs/PRD.md` incluyendo nota de evolución futura para `due_day` (día de vencimiento de pago).

## [2.13.2] - 2026-11-02
### Agregado
- **Columna de Mes Contable en Carga Rápida y Selector de Persona por Movimiento en Pegado Mágico (`BulkMovementRow.tsx`, `CreditCardBulkWizard.tsx`, `SmartPasteModal.tsx`, PRD §4.12)**:
  - **Mes contable en cada fila de Carga Rápida**: Incorporación de la columna **Mes contable** (`accountingPeriod`) en `BulkMovementRow` y `CreditCardBulkWizard`, mostrando el período contable asignado a la fila (ej. *Noviembre 2026 (Actual)*) y permitiendo cambiarlo fila por fila.
  - **Dropdown de Persona en Movimientos Detectados del Pegado Mágico**: En la vista previa de `SmartPasteModal` (*Movimientos detectados*), cada ítem incluye un selector individual de **Persona** para reasignar consumos puntuales a otro contacto antes de volcarlos a la grilla.

## [2.13.1] - 2026-11-02
### Modificado
- **Disposición de Selectores en Pegado Mágico y Limpieza de Grilla de Carga Rápida (`SmartPasteModal.tsx`, `CreditCardBulkWizard.tsx`, PRD §4.12)**:
  - En `SmartPasteModal`, los selectores **Moneda a importar** y **Persona a asignar** se disponen en dos filas dedicadas dentro de su contenedor flex para evitar recortes visuales en los dropdowns.
  - En `CreditCardBulkWizard`, se retiraron el selector masivo redundante *"Moneda para todas"* y el banner duplicado de recordatorio de verificación (que permanece únicamente dentro del modal de Pegado Mágico).

## [2.13.0] - 2026-11-02
### Agregado
- **Flujo Continuo Institución $\rightarrow$ Productos Financieros y Saldo Inicial (`apps/web/components/InstitutionForm.tsx`, `apps/web/components/AccountForm.tsx`, `apps/web/app/(protected)/institutions/actions.ts`, `apps/web/app/(protected)/accounts/actions.ts`, PRD §4.2)**:
  - **Redirección automática post-creación de institución**: Al crear una institución desde `/accounts`, `createInstitution` devuelve el `id` creado y `InstitutionForm` redirige automáticamente a `/accounts/new?institutionId={id}` para cargar de inmediato los productos financieros de esa entidad.
  - **Saldo inicial opcional al crear cuenta (`initialBalance`)**: Incorporación del campo numérico **Saldo inicial (opcional)** en `AccountForm.tsx` (para cuentas corrientes, cajas de ahorro, inversión y efectivo). Si se informa un monto distinto de cero, `createAccount` asienta automáticamente una transacción `ADJUSTMENT` (`COMPLETED`) en `master_transactions`, evitando el *cold start* sin distorsionar el presupuesto de gastos.
  - **Botón "Crear y agregar otro producto"**: Permite guardar una cuenta y permanecer en `AccountForm` con la misma institución seleccionada para dar de alta múltiples productos financieros de corrido.
### Modificado
- **Cuenta Efectivo Opcional al Crear Institución (`InstitutionForm.tsx`, `institutions/actions.ts`)**:
  - Se eliminó la creación forzada de una cuenta `Efectivo` al dar de alta una institución (ya que el `WelcomeWizard` crea la billetera de efectivo inicial), reemplazándola por una casilla opcional desmarcada por defecto (*"Incluir una cuenta de Efectivo en esta institución"*).
- **Centro de Ayuda y Documentación (`apps/web/lib/help-data.ts`, `docs/PRD.md`)**:
  - Actualización del artículo `wiki-accounts` y de la sección §4.2 del PRD detallando el alta continua de institución a productos financieros, el saldo inicial sin *cold start* y la casilla opcional de efectivo.

## [2.12.2] - 2026-11-02
### Modificado
- **Parser Secuencial de Estado de Cuenta y Carga Rápida de Tarjetas (`apps/web/lib/parsers/card-statement-parser.ts`, `SmartPasteModal.tsx`, `CreditCardBulkWizard.tsx`, `BulkMovementRow.tsx`, `bulk-card-actions.ts`, `builder.ts`, PRD §4.12)**:
  - **Orden de parseo estructurado**:
    1. **Fecha inicial**: Soporte de formatos con año de 2 dígitos (`DD/MM/AA`, `DD MM AA`, `DD-MM-AA`, ej. `10/11/25` o `27/08/26`), además de `DD/MM/AAAA`, `YYYY-MM-DD` y `DD/MM`, evaluada siempre al principio de la línea para no confundirse con el patrón de cuotas.
    2. **Número de tarjeta opcional (`XXXX`)**: Detección y limpieza automática de los 4 dígitos de tarjeta posteriores a la fecha (ej. `5029`, `5045`) para que no ensucien el nombre del comercio.
    3. **Cuotas con o sin espacio (`X/X` o `X/ X`)**: Reconocimiento y limpieza de patrones como `12/12`, `2/ 3`, `01 / 06`, `C.04/12` y `CUOTA 4 DE 12`.
    4. **Moneda opcional y Selector de Moneda Masivo**: Detección de divisas explícitas (`UYU`, `$U`, `$UY`, `USD`, `U$S`, `US$`, `EUR`, `ARS`, `AUD`, `NZD`) e incorporación de un selector tanto en `SmartPasteModal` (`Moneda a importar`) como en la barra de `CreditCardBulkWizard` (`Moneda para todas`) para asignar una moneda a todas las filas cuando no está presente en cada línea.
    5. **Importes negativos (Pago / Refund)**: Si el importe final es negativo (precedido o seguido por `-`), el movimiento se marca como `isRefund: true`, destacando visualmente la fila con borde e insignia **Pago / Refund** tanto en la vista previa del Pegado Mágico como en la grilla de Carga Rápida, e imputándose como crédito (`INCOME`) en caso de guardarse.
    6. **Asignación al período contable actual y proyección de cuotas**: En `saveBulkCardMovementsAction` y `buildTransactionBundle`, la cuota del resumen importado conserva su fecha original de compra (`date`) pero se imputa al `accounting_period` actual, proyectando las cuotas futuras restantes (`C+1..T`) a partir del mes contable siguiente.
    7. **Leyenda de verificación manual**: Incorporación de aviso preventivo en `SmartPasteModal` y `CreditCardBulkWizard` recordando al usuario verificar los datos antes de confirmar.
- **Centro de Ayuda y Documentación (`apps/web/lib/help-data.ts`, `docs/PRD.md`)**:
  - Actualización de la Wiki de tarjetas y la FAQ `faq-card-magic-paste` con el detalle de los formatos soportados, selector de moneda y destacado de pagos/refunds.

## [2.12.1] - 2026-11-02
### Corregido
- **Carga Rápida y Pegado Mágico de Tarjetas (`/accounts/[id]/bulk`, `CreditCardBulkWizard.tsx`, `QuotaBadgeSelector.tsx`, `BulkImpactSummary.tsx`, `BulkMovementRow.tsx`, `builder.ts`, PRD §4.12)**:
  - **Popover de cuotas en eje Z y reflejo en vivo**: El selector `QuotaBadgeSelector` ahora flota en el eje Z con posicionamiento fijo (`fixed z-50`) anclado al botón disparador para evitar recortes por `overflow` o scroll interno en la tabla, y aplica al instante las cuotas personalizadas (`actual` y `total`) a medida que el usuario escribe sin requerir clic en "OK".
  - **Cálculo en vivo discriminado por moneda**: `CreditCardBulkWizard` y `BulkImpactSummary` desglosan en tiempo real los consumos del resumen actual, cuotas diferidas futuras y asignaciones a personas por cada moneda operada (ej. moneda local `ARS`/`UYU` y `USD`), evitando sumar divisas distintas en un mismo monto nominal.
  - **Creación rápida de categoría desde el dropdown**: Incorporación de la opción `+ Crear categoría...` directamente en el selector de categoría de cada fila (`BulkMovementRow.tsx` y modales de `CreditCardStatementVerifier.tsx`), abriendo `CategoryModal` y seleccionando automáticamente la nueva categoría creada en la fila activa.
  - **Valor de cuota en pegado de estado de cuenta (`amountIsPerInstallment`)**: En `buildTransactionBundle` (`lib/ledger/builder.ts`), cuando se cargan movimientos desde estado de cuenta o Carga Rápida (`saveBulkCardMovementsAction` y `addMissingStatementTransactionAction`), el importe ingresado se toma siempre como el valor de la cuota individual (incluso cuando arranca en cuota `1/N`), evitando dividir el importe de la cuota por la cantidad de pagos.
  - **Alineación y padding de navegación superior**: En `apps/web/app/(protected)/accounts/[id]/bulk/page.tsx`, se agregó el contenedor `<main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">` para que el enlace `"← Volver a [Tarjeta]"` mantenga el mismo margen y alineación que el resto de las vistas.
- **Pills Bimonetarias y Consolidado Discreto en Tarjetas de Crédito (`/accounts/[id]/page.tsx`, `CreditCardStatementVerifier.tsx`, PRD §4.2, §4.13)**:
  - En la ficha de tarjeta de crédito y en el verificador de resumen se muestra en **pills destacadas** el total adeudado en cada moneda de la tarjeta (usualmente moneda local y `USD`), mientras que el total consolidado se convierte y exhibe discretamente en la moneda default configurada por el usuario (`user_settings.display_currency`).
- **Soporte de Cascada al Eliminar Usuarios en Base de Datos (`supabase/migrations/0015_allow_user_cascade_delete.sql`, `supabase/setup_production.sql`, PRD §3.2)**:
  - Actualización de la función de trigger [`prevent_hard_delete_ledger_entities()`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/supabase/migrations/0015_allow_user_cascade_delete.sql) con `SECURITY DEFINER` para mantener bloqueado el borrado físico (`DELETE`) de `institutions`, `accounts` y `people` durante el uso normal de la aplicación (`is_active = false`), pero permitiendo la purga física cuando el usuario propietario es eliminado de `auth.users` (`ON DELETE CASCADE`), cuando opera `supabase_auth_admin` desde el panel de Supabase Auth, o cuando se habilita explícitamente en la sesión SQL (`SET LOCAL app.allow_hard_delete = 'on'`).
  - Configuración de `ON DELETE CASCADE` / `ON DELETE SET NULL` en las claves foráneas internas de `master_transactions`, `budget_estimates` y `portfolio_transactions` para evitar bloqueos por orden de tablas al eliminar un usuario con historial de movimientos.
### Modificado
- **Documentación y Roadmap de Baja de Usuario (`docs/PRD.md`, `docs/prd-gap-analysis.md`, `apps/web/lib/help-data.ts`)**:
  - Registro en `docs/PRD.md` (§4.9 Ajustes y Sistema) y `docs/prd-gap-analysis.md` del requerimiento pendiente de implementar en el frontend la función de **Baja de Cuenta / Eliminar Usuario** desde `/settings` para usuarios que deseen darse de baja definitiva del sistema.
  - Actualización de la FAQ `faq-acc-delete` en `help-data.ts` aclarando el comportamiento entre baja lógica de entidades individuales y baja completa en cascada del usuario.

## [2.12.0] - 2026-10-31
### Agregado
- **Módulo de Verificación de Estado de Cuenta y Mes Contable (`/accounts/[id]/verify`, PRD §4.2, §4.13)**:
  - **Mes Contable (`accounting_period` en `master_transactions`)**:
    - Persistencia del período contable (`YYYY-MM`) en el que impacta cada consumo en el resumen mensual de la tarjeta de crédito.
    - En el formulario de transacciones (`TransactionForm.tsx`), al elegir una tarjeta de crédito se despliega el selector de **Mes actual** y **Próximo mes**, con preselección automática del próximo mes cuando la fecha de compra supera el `closing_day` configurado en la tarjeta.
    - Proyección automática de planes de cuotas encadenados a partir del mes contable seleccionado (`calculateAccountingPeriod`).
  - **Día de Cierre en Tarjetas de Crédito (`closing_day` en `accounts`)**:
    - Nuevo campo opcional (1 a 31) en `AccountForm.tsx` y `accounts/actions.ts` para tarjetas de crédito.
  - **Pantalla de Verificación de Resumen (`/accounts/[id]/verify`, `CreditCardStatementVerifier.tsx`, `verify-card-actions.ts`)**:
    - **Summary con Pills**: Total consolidado en moneda nativa, desglose separado por moneda de origen cuando existen consumos bimonetarios (ej. UYU + USD), progreso de ítems confirmados vs. pendientes y total de gastos compartidos a recuperar.
    - **Confirmar gasto**: Marca individual o masivamente los consumos auditados (`is_verified = true`, `verified_at`).
    - **Corregir gasto**: Modal de edición rápida para enmendar descripción, fecha, monto original/convertido, moneda, categoría o persona asignada, confirmándolo en el acto.
    - **Asignar al próximo mes (Opción A en cascada)**: Desplaza el consumo al mes contable siguiente; si pertenece a una compra en cuotas, desplaza en cascada esa cuota y todas las cuotas posteriores del plan.
    - **Agregar gasto faltante**: Modal para incorporar directamente en el estado de cuenta auditado un consumo que no había sido registrado previamente.
  - **Deuda del Resumen en Curso en Ficha de Tarjeta (`/accounts/[id]/page.tsx`)**:
    - El indicador principal de la tarjeta muestra específicamente la **Deuda del resumen en curso** (filtrada por el `accounting_period` actual), separando en compromisos futuros los consumos diferidos al próximo resumen y las cuotas pendientes.
    - Botón de acceso directo **Verificar resumen** en la cabecera de la tarjeta.
  - **Banner Recordatorio en Dashboard (`DashboardClient.tsx`)**:
    - Detección automática de ventana de cierre (`isStatementVerificationWindow`: primeros 5 días o últimos 5 días del mes) para usuarios con tarjetas de crédito activas, mostrando un banner con enlace directo a la verificación del estado de cuenta.
- **Base de Datos y Migraciones**:
  - Creación de [`supabase/migrations/0014_credit_card_statement_verification.sql`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/supabase/migrations/0014_credit_card_statement_verification.sql) y actualización de [`supabase/setup_production.sql`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/supabase/setup_production.sql).
- **Centro de Ayuda, Wiki y FAQ (`help-data.ts`)**:
  - Nueva sección en Wiki de tarjetas, 2 nuevas FAQs (`faq-card-accounting-period`, `faq-card-verify-statement`) y nueva receta paso a paso (`guide-verify-statement`).

## [2.11.0] - 2026-10-31
### Agregado
- **Módulo Integral de Préstamos (`/loans`, PRD §4.7)**:
  - **Doble Sentido y Roles**: Gestión completa de préstamos tomados (`BORROWED`, deudas propias/pasivos) y préstamos otorgados a terceros (`LENT`, acreencias por cobrar).
  - **Soporte de Intermediación Financiera**: Capacidad de registrar préstamos tomados de un banco o institución (ej. Banco Itaú) pero asignados a una persona del directorio (`beneficiary_person_id`) actuando como intermediario/garante.
  - **Motor de Amortización Francés — Banco Itaú Uruguay (`lib/loans/itau-amortization.ts`)**:
    - Cálculo matemático exacto de cuotas constantes fijas con base en Tasa Efectiva Anual (TEA), cálculo exponencial de tasa mensual ($i = (1 + \text{TEA})^{1/12} - 1$), desglose de interés decreciente y amortización de capital creciente.
    - Soporte integrado de IVA del 22% sobre intereses reglamentario en Uruguay para préstamos personales al consumo.
    - Cálculo de fechas de vencimiento con ajuste seguro a fines de mes (Feb 28/29, Abr 30).
    - Suite de pruebas unitarias exhaustivas con 11 casos de prueba en `lib/loans/itau-amortization.test.ts`.
  - **Imputación Contable de Cuotas — Opción B (`payLoanInstallmentAction`, `lib/loans/actions.ts`)**:
    - Generación atómica en `master_transactions` de dos filas ligadas mediante `parent_transaction_id`:
      - *Fila 1 (Amortización de Capital)*: Disminuye la deuda nominal sin computar como consumo o gasto del mes.
      - *Fila 2 (Costo Financiero)*: Imputa los intereses devengados (+ IVA) en la categoría de gastos financieros para reflejar el costo real en `/analytics` y en `/budget`.
  - **Orden Secuencial Estricto de Cancelación**:
    - Validación en servidor que impide pagos salteados o desordenados; las cuotas se abonan en estricto orden cronológico correlativo (1, 2, ..., N).
    - Actualización automática del estado del préstamo a `PAID` cuando se completa la última cuota.
  - **Desembolso Inicial Opcional en Cuenta**:
    - Casilla interactiva en el alta para acreditar automáticamente el capital recibido (`INCOME`) o debitarlo (`OUTCOME` si es prestado) en la cuenta bancaria seleccionada con conversión FX si difiere la divisa.
  - **Formulario con Simulación en Vivo (`LoanForm.tsx`, `/loans/new`)**:
    - Previsualización dinámica de marcha y métricas clave (cuota nivelada, total de intereses, IVA 22% y total a pagar) recalculadas en tiempo real mientras el usuario escribe.
    - Protección preventiva para usuarios sin conexión mediante `useOnlineStatus()`.
  - **Vista Principal y Directorio (`LoansClient.tsx`, `LoanCard.tsx`, `/loans`)**:
    - Tarjetas KPI consolidadas: Deuda Activa (en divisa preferida), Total por Cobrar y Próximo Vencimiento más urgente.
    - Filtros por tabs: *Activos*, *Mis Deudas*, *Por Cobrar*, *Intermediados* y *Finalizados*, con buscador en tiempo real.
    - Barra de avance porcentual de amortización y botón rápido 1-tap para abonar la próxima cuota.
  - **Ficha de Detalle y Tabla de Amortización (`LoanDetailClient.tsx`, `AmortizationTable.tsx`, `/loans/[id]`)**:
    - Vista panorámica de todas las cuotas con badges de estado (`Pagada`, `Próxima`, `Vencida`, `Pendiente`).
    - Modal interactivo `PayLoanInstallmentModal.tsx` con desglose de cuota y selector de cuenta de débito/crédito.
    - Baja lógica con diálogo de confirmación (`is_active = false`).
  - **Navegación Activa (`Navigation.tsx`)**:
    - Habilitación oficial de la ruta `/loans` con `ready: true` en el menú principal y móvil.
- **Base de Datos y Migraciones**:
  - Creación de [`supabase/migrations/0013_loans_enhancement.sql`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/supabase/migrations/0013_loans_enhancement.sql) con soporte multi-moneda, TEA, IVA 22%, contrapartes e índices de rendimiento.
  - Sincronización completa de [`supabase/setup_production.sql`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/supabase/setup_production.sql) para inicializaciones directas en producción con v2.11.0.
- **Centro de Ayuda, Wiki y Preguntas Frecuentes (`help-data.ts`, `docs/PRD.md`)**:
  - Nuevo artículo en la Wiki: *Préstamos y Amortizaciones (Itaú Uruguay)* (`wiki-loans`).
  - Nueva categoría de ayuda *Préstamos & Marcha* (`loans`).
  - 4 nuevas preguntas frecuentes interactivas (`faq-loans-calc`, `faq-loans-ledger`, `faq-loans-intermediary`, `faq-loans-extraordinary`).
  - Nueva guía paso a paso `guide-loans`: *Crear un préstamo y registrar el pago de cuotas*.
  - Actualización de cobertura al 96% en [`docs/prd-gap-analysis.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/prd-gap-analysis.md) y cierre de especificación en [`docs/PRD.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/PRD.md).
- **Cobertura de Pruebas Unitarias Automatizadas**:
  - Nuevas suites de pruebas en Vitest:
    - `lib/loans/itau-amortization.test.ts` (11 tests)
    - `app/(protected)/loans/actions.test.ts` (6 tests)
    - `components/LoanCard.test.tsx` (2 tests)
    - `components/LoanForm.test.tsx` (3 tests)
    - `components/AmortizationTable.test.tsx` (1 test)
    - `components/PayLoanInstallmentModal.test.tsx` (1 test)
  - Suite global pasando al 100% (63 suites y más de 325 tests).

## [2.10.0] - 2026-10-28
### Agregado
- **Protección de Palabra Reservada del Sistema "Personal" (`PersonForm.tsx`, `people/actions.ts`, `WelcomeWizard.tsx`, `welcome/actions.ts`)**:
  - **Reserva Estricta en Catálogo**: Protección integral que impide crear contactos o renombrar personas existentes con el nombre *"Personal"* (insensible a mayúsculas/minúsculas y espacios: *"personal"*, *" PERSONAL "*), reservándolo exclusivamente para los consumos propios del usuario configurados por defecto.
  - **Mensajes Preventivos y Claros**: Mensaje contextual en Rioplatense explicando que *"Personal"* es una palabra reservada del sistema asignada a consumos propios e invitando a elegir otro nombre.
- **Aviso Reactivo y Prevención de Nombres Duplicados (`PersonForm.tsx`, `WelcomeWizard.tsx`)**:
  - **Aviso en Tiempo Real con Sugerencia de Inicial**: Detección dinámica conforme el usuario escribe en el campo `Nombre`. Si coincide con un contacto existente (activo o desactivado), se muestra una tarjeta semántica con ícono de advertencia: *"Ya existe una persona con ese nombre. Agregá una inicial para que puedas distinguirla."*
  - **Desbloqueo Inmediato**: Al agregar una inicial o apellido (ej. *"Diego M."*), el aviso desaparece de inmediato y habilita el guardado.
  - **Detección de Contactos Desactivados**: Si el nombre coincide con una persona desactivada, el aviso detalla *"Ya existe una persona con ese nombre (desactivada)"* para prevenir duplicidades con historiales contables previos.
  - **Validación Segura en Server Actions**: Doble chequeo en `createPerson` y `updatePerson` mediante consultas `ilike` en Supabase garantizando coherencia en la base de datos sin permitir colisiones homónimas.
  - **Pre-carga de Personas en Formularios**: Consulta y paso optimizado de `existingPeople` en `NewPersonPage`, `NewPersonModal`, `EditPersonPage` y `EditPersonModal`, con fallback al contexto transaccional `ledger.people`.
- **Centro de Ayuda, Wiki y Preguntas Frecuentes (`help-data.ts`, `docs/PRD.md`)**:
  - Nueva sección en el artículo wiki de Personas (`wiki-people`): *"Contacto de Sistema Personal y Prevención de Duplicados"*.
  - Nueva pregunta frecuente interactiva `faq-people-reserved` detallando el rol del contacto *"Personal"* y la recomendación de usar iniciales para homónimos.
  - Actualización de la especificación técnica en la sección 4.5 de [`docs/PRD.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/PRD.md).
- **Cobertura de Pruebas Unitarias Automatizadas**:
  - [`components/PersonForm.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/PersonForm.test.tsx): 15 pruebas unitarias cubriendo bloqueo de palabra reservada "Personal", aviso reactivo de homónimos, distinción con iniciales y desactivación.
  - [`app/(protected)/people/actions.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/people/actions.test.ts): 7 pruebas unitarias de server actions validando rechazo de "Personal" y duplicados en `createPerson` y `updatePerson`.
  - [`components/WelcomeWizard.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/WelcomeWizard.test.tsx): prueba de validación y error al ingresar "Personal" o contactos duplicados en el onboarding.
  - [`lib/version.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/version.test.ts): actualización de pruebas a la versión `2.10.0`.

## [2.9.1] - 2026-10-27
### Agregado
- **Integración con Personas y Split Pay en Asistente de Carga Rápida (`components/credit-card-bulk/`, `lib/parsers/card-statement-parser.ts`, `app/(protected)/accounts/bulk-card-actions.ts`)**:
  - **Asignación de Persona por Defecto ("Personal")**: Cada fila nueva o pegada adopta por defecto el registro *"Personal"*, evitando selecciones huérfanas y garantizando coherencia contable con el ledger.
  - **Selector de Personas sin Duplicados (`BulkMovementRow.tsx`)**: Filtrado automático que previene la aparición duplicada de la opción "Personal" cuando ya existe una entidad con ese nombre en el catálogo maestro de contactos.
  - **Diferenciación Visual de Consumos Compartidos**: Resaltado con estilo de acento (`bg-accent/10 border-accent/40 text-accent font-semibold`) en las filas asignadas a personas/amigos para identificar rápidamente gastos a cobrar.
  - **Desglose en Vivo de Consumos Personales vs. a Cobrar (`BulkImpactSummary.tsx`)**: Nueva sección informativa en la barra de impacto con ícono de contactos que discrimina el monto propio del resumen frente al saldo a cobrar a terceros y el recuento de consumos compartidos.
  - **Selector de Persona en Pegado Mágico (`SmartPasteModal.tsx`)**: Selector desplegable en la cabecera del modal para preasignar la persona destino a todos los movimientos parseados de la tanda, con badges individuales en la previsualización interactiva.
  - **Revalidación Automática de Cuentas por Cobrar (`bulk-card-actions.ts`)**: Inclusión de `revalidatePath('/people')` al persistir los movimientos para sincronizar de inmediato los saldos adeudados en la vista de Personas.
  - **Cobertura de Pruebas Unitarias Automatizadas**:
    - Nuevos casos de prueba en [`CreditCardBulkWizard.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/credit-card-bulk/CreditCardBulkWizard.test.tsx), [`SmartPasteModal.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/credit-card-bulk/SmartPasteModal.test.tsx) y [`card-statement-parser.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/parsers/card-statement-parser.test.ts) validando asignación de personas, desglose de montos y persistencia.

## [2.9.0] - 2026-10-27
### Agregado
- **Asistente de Carga Rápida (Bulk Ingest) y Resumen de Tarjetas de Crédito (`components/credit-card-bulk/`, `app/welcome/credit-card/`, `app/(protected)/accounts/[id]/bulk/`)**:
  - **Grilla Spreadsheet-like con Atajos de Teclado**: Carga ágil de múltiples consumos con navegación fluida (`Tab` / `Enter`), selector de planes de cuotas e inputs numéricos directos.
  - **Selector Inteligente de Cuotas (`QuotaBadgeSelector.tsx`)**: Chips rápidos (`1 pago`, `3`, `6`, `12`, `18`) y popover para cuotas intermedias personalizadas (ej. cuota 4 de 12).
  - **Motor Heurístico de Parseo de Resúmenes (`lib/parsers/card-statement-parser.ts`)**: Extracción automática de fecha, comercio, plan de cuotas (`C.04/12`, `CUOTA 4 DE 12`), divisas y montos en formatos rioplatenses e internacionales.
  - **Pegado Mágico de Resumen (`SmartPasteModal.tsx`)**: Modal interactivo para pegar texto copiado del extracto bancario o notificaciones por email con previsualización en tiempo real y volcado instantáneo a la tabla.
  - **Auto-Categorización Heurística**: Detección de palabras clave de comercios comunes (Supermercado, Transporte, Servicios, Salidas) asignando automáticamente la categoría correspondiente.
  - **Barra de Impacto Financiero en Vivo (`BulkImpactSummary.tsx`)**: Cálculo en tiempo real de consumos del resumen actual, compromisos diferidos futuros y límite disponible restante de la tarjeta.
  - **Persistencia en Ledger y Cuotas Futuras (`app/(protected)/accounts/bulk-card-actions.ts`, `lib/ledger/builder.ts`)**: Soporte contable para cuotas intermedias en `buildTransactionBundle`, generando la cuota actual en el período en curso y agendando las cuotas restantes en estado `PENDING` para meses futuros sin ensuciar el pasado.
  - **Flujo Opcional Post-Onboarding (`WelcomeWizard.tsx`, `app/welcome/credit-card/page.tsx`)**: Prompt interactivo no invasivo al finalizar la siembra del espacio si el usuario creó tarjetas de crédito, permitiendo cargar consumos o ir directo al Dashboard.
  - **Punto de Re-acceso Permanente (`app/(protected)/accounts/[id]/bulk/page.tsx`)**: Botón *"Carga rápida"* en la cabecera de cuentas de tipo tarjeta de crédito para reingresar consumos en cualquier momento.
  - **Suites de Pruebas Unitarias Automatizadas**:
    - [`card-statement-parser.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/parsers/card-statement-parser.test.ts): 17 pruebas unitarias de parseo, fechas, montos y cuotas.
    - [`CreditCardBulkWizard.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/credit-card-bulk/CreditCardBulkWizard.test.tsx): 6 pruebas de renderizado, cálculo de impacto, adición/eliminación de filas y guardado.
    - [`SmartPasteModal.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/credit-card-bulk/SmartPasteModal.test.tsx): 2 pruebas de carga de ejemplo, parseo y volcado a grilla.
    - [`app/welcome/credit-card/page.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/welcome/credit-card/page.test.tsx): 3 pruebas de redirección y renderizado en servidor.
    - [`lib/ledger/builder.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/builder.test.ts): prueba unitaria de cuota intermedia en `buildTransactionBundle`.
- **Centro de Ayuda, FAQ y PRD (`lib/help-data.ts`, `docs/PRD.md`)**:
  - Incorporación de sección en el artículo de la Wiki de tarjetas sobre Carga Rápida y Pegado Mágico.
  - Nuevas preguntas frecuentes `faq-card-bulk` y `faq-card-magic-paste`.
  - Nueva guía rápida interactiva `guide-card-bulk-ingest`.
  - Documentación en PRD sección 4.12 y actualización de la sección 4.11.

## [2.8.0] - 2026-10-23
### Modificado
- **Diferenciación de Tarjetas de Crédito y Exclusión de Inversión en Asistente Inicial (`components/WelcomeWizard.tsx`, `app/welcome/actions.ts`)**:
  - **Límite de Crédito Dinámico en Tarjetas (`credit_card`)**: El formulario del paso 2 conmuta el campo de importe a *"Límite de crédito"* cuando el tipo de cuenta es tarjeta de crédito, vinculándolo directamente a la columna estructural `accounts.credit_limit` y eliminando valores preestablecidos hardcodeados.
  - **Integridad Contable en Ledger (`seedUserSpaceAction`)**: Se evita la creación indebida de asientos iniciales `ADJUSTMENT` positivos en `master_transactions` para tarjetas de crédito, garantizando que el saldo inicial de la tarjeta arranque en cero de deuda y su crédito disponible coincida exactamente con el límite establecido (`availableCredit = creditLimit - totalCommitted`).
  - **Exclusión del Tipo Inversión (`investing`)**: Se remueve la opción de inversión del selector de tipos de cuenta del wizard de bienvenida, posponiéndola para el futuro módulo especializado de inversiones que contará con su propio asistente dedicado.
  - **Accesibilidad e Interacción en Formulario**: Se enlazan etiquetas accesibles (`htmlFor` / `id`) y se limpian automáticamente los valores cruzados de saldo o límite al alternar entre tarjeta y cuentas transaccionales (`checking`, `savings`, `cash`).

### Agregado
- **Cobertura Total de Pruebas Unitarias para Componentes UI (100% de componentes testeados)**:
  - Se crearon 23 suites de pruebas dedicadas para alcanzar la cobertura completa de los 33 componentes en [`apps/web/components/`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components):
    - **Formularios y flujos clave**: [`TransactionForm.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/TransactionForm.test.tsx), [`RegisterCardPaymentModal.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/RegisterCardPaymentModal.test.tsx), [`ExpressAdjustModal.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ExpressAdjustModal.test.tsx), [`CurrencySelector.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/CurrencySelector.test.tsx), [`UpdatePasswordForm.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/UpdatePasswordForm.test.tsx), [`WhatsAppTemplateForm.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/WhatsAppTemplateForm.test.tsx).
    - **Vistas cliente y listados**: [`DashboardClient.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/DashboardClient.test.tsx), [`AccountsClient.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AccountsClient.test.tsx), [`TransactionsList.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/TransactionsList.test.tsx), [`CategoryList.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/CategoryList.test.tsx), [`Navigation.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/Navigation.test.tsx), [`PersonActions.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/PersonActions.test.tsx), [`WhatsAppNotifyModal.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/WhatsAppNotifyModal.test.tsx).
    - **Botones y controles de UI**: [`Modal.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/Modal.test.tsx), [`ConfirmTransactionButton.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ConfirmTransactionButton.test.tsx), [`DeleteTransactionButton.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/DeleteTransactionButton.test.tsx), [`ExecutePaymentButton.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ExecutePaymentButton.test.tsx), [`LogoutButton.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/LogoutButton.test.tsx), [`SendResetLinkButton.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/SendResetLinkButton.test.tsx), [`SyncStatusBadge.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/SyncStatusBadge.test.tsx), [`SystemInfoCard.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/SystemInfoCard.test.tsx), [`ThemeToggle.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/ThemeToggle.test.tsx), [`TourTriggerButton.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/TourTriggerButton.test.tsx).
  - La suite global alcanza **52 archivos de pruebas y 258 tests automatizados** ejecutándose al 100% de éxito.
- **Configuración Automatizada de ESLint (`.eslintrc.json`)**:
  - Incorporación de reglas `next/core-web-vitals` para validación estática continua sin bloqueos interactivos.
- **Suites de Pruebas Unitarias de Asistente Inicial (`components/WelcomeWizard.test.tsx`)**:
  - Verificación de la no inclusión de la opción *Inversión* en el selector de tipo de cuenta.
  - Verificación de la conmutación a *"Límite de crédito"* al añadir o editar una tarjeta de crédito y la correcta transmisión del payload hacia `seedUserSpaceAction`.
- **Centro de Ayuda y FAQ (`lib/help-data.ts`)**:
  - Actualización de la pregunta frecuente `faq-welcome-wizard` y la guía interactiva `guide-welcome-wizard` para documentar la carga de límites de crédito en tarjetas.

## [2.7.1] - 2026-10-22
### Corregido
- **Desacople de `/welcome` del Layout Protegido (`app/welcome/page.tsx`, `app/welcome/actions.ts`)**:
  - Resuelve el error crítico de hidratación React (`Expected server HTML to contain a matching <div> in <div>`) provocado por el anidamiento de `/welcome` dentro de `ProtectedLayout` (`apps/web/app/(protected)/layout.tsx`), donde colisionaban el slot paralelo `@modal` y el árbol de `<Navigation />`.
  - Proporciona una experiencia de incorporación a pantalla completa (*full-screen*) limpia y enfocada, eliminando el desplazamiento horizontal de 224px (`md:pl-56`), la cabecera móvil y el tab bar inferior que interferían con los controles del asistente.
  - Mantiene la seguridad y control de acceso validando la sesión del usuario mediante `getAuthenticatedUser()` y redirigiendo a `/dashboard` si el onboarding ya fue completado o si ya posee cuentas configuradas.
- **Corrección de Redirección Inteligente en Cold Start (`app/(protected)/dashboard/page.tsx`)**:
  - Incorpora `rethrowIfRedirect(error)` en el bloque `catch` de consultas iniciales en `DashboardPage`, evitando que el error interno `NEXT_REDIRECT` de Next.js sea silenciado por el fallback offline.
  - Asegura que cualquier usuario nuevo sin cuentas ni configuración inicial sea redirigido de forma inmediata a `/welcome` al ingresar a la plataforma.
- **Protección de Ruta en Middleware (`lib/supabase/middleware.ts`)**:
  - Agrega `'/welcome'` a `PROTECTED_PREFIXES` en `updateSession` para rechazar accesos no autenticados directamente en el Edge sin costo de renderizado.
- **Suites de Pruebas Unitarias de Redirección y Servidor**:
  - Añade [`app/welcome/page.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/welcome/page.test.tsx) validando las cuatro ramas de redirección y renderizado en servidor.
  - Añade [`app/(protected)/dashboard/page.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/dashboard/page.test.tsx) validando la redirección inteligente hacia `/welcome` para usuarios nuevos.

## [2.7.0] - 2026-10-22
### Agregado
- **Soporte Dinámico de Divisas y Monedas Regionales (PRD §3.1, `currency-catalog.ts`, `0012_active_currencies.sql`)**:
  - **Catálogo Global de +30 Monedas (`lib/currency-catalog.ts`)**: Base de datos de más de 30 divisas mundiales y regionales (Pesos Argentinos - ARS, Reales Brasileños - BRL, Pesos Chilenos - CLP, Pesos Colombianos - COP, Pesos Mexicanos - MXN, Soles Peruanos - PEN, Francos Suizos - CHF, Libras Esterlinas - GBP, etc.) con banderas, símbolos y búsqueda en tiempo real por código y nombre.
  - **Estructura en Base de Datos (`supabase/migrations/0012_active_currencies.sql`)**: Nueva columna `active_currencies jsonb` en la tabla `user_settings` con valores por defecto y migración segura.
  - **Modal de Selección y Búsqueda de Catálogo (`CurrencySelector.tsx`)**: Diálogo accesible y estilizado con filtrado en vivo, chips de divisas activas e inserción directa en el listado activo del usuario.
  - **Gestor de Divisas Activas en Ajustes (`CurrencyManagerCard.tsx`, `/settings`)**: Módulo interactivo en la pantalla de Ajustes que permite agregar divisas del catálogo, alternar cada divisa secundaria entre modo *Auto (Mercado)* y *Manual*, y definir tipos de cambio personalizados con persistencia instantánea mediante Server Action (`updateActiveCurrencies`).
- **Gestión de Tipos de Cambio Manuales Directos contra la Divisa Global (`lib/storage/fx-cache.ts`, `lib/networth.ts`)**:
  - **Anclaje Directo a Moneda Global**: Los tipos de cambio manuales se expresan directamente en términos de la moneda global del usuario (`1 [GLOBAL] = X [DIVISA]`, e.g., `1 USD = 1.280 ARS` para Dólar Blue/MEP), facilitando la lectura e ingreso natural sin necesidad de calcular tasas inversas.
  - **Inmunidad contra Sobreescrituras de Mercado (`fx-cache.ts`)**: Implementación del flag `isManual` en el caché local de cotizaciones con bypass de TTL (24h), impidiendo que consultas en segundo plano a la API de mercado sobreescriban los tipos de cambio fijados por el usuario.
  - **Inyección en Servidor y Contexto Ledger (`api/bootstrap/route.ts`, `ledger-context.tsx`, `dashboard/page.tsx`)**: El endpoint de arranque precarga las cotizaciones manuales del perfil en la matriz FX y en el almacenamiento local del cliente (`isManual = true`), garantizando que la consolidación del patrimonio neto y el balance general respeten la cotización manual tanto en Server Components como en cliente offline.
- **Evolución del Asistente Inicial de Bienvenida (`WelcomeWizard.tsx`)**:
  - **Detección Regional de Argentina**: Inferencia automática de `ARS` y sugerencia de `USD` / `ARS` ante locales o husos horarios de Argentina (`es-AR`, `America/Buenos_Aires`, etc.).
  - **Selector de Moneda con Catálogo Modal**: Integración del selector dinámico con modal de catálogo completo en el Paso 1.
  - **Píldora de Cotización Directa en Paso 2**: Para cuentas creadas en una divisa diferente a la divisa global elegida, se muestra una píldora contextual interactiva con el contravalor calculado y la opción de ingresar una cotización manual directa en el acto.
- **Suites de Pruebas Unitarias**:
  - `currency-catalog.test.ts` (3 tests)
  - `CurrencyManagerCard.test.tsx` (3 tests)
  - `fx-cache.test.ts` (8 tests actualizados)
  - `fx.test.ts` (5 tests de Networth con custom rates)
  - `WelcomeWizard.test.tsx` (11 tests actualizados)

### Modificado
- **Formulario de Movimientos (`TransactionForm.tsx`, `/transactions/new`)**:
  - Reemplazo del listado estático de 5 divisas por las monedas activas del usuario y monedas nativas de sus cuentas bancarias.
  - Detección de cotizaciones manuales del perfil (`isManualProfileRate`), bloqueando consultas de mercado automáticas que pisen la tasa del usuario.
- **Formulario de Cuentas (`AccountForm.tsx`)**:
  - Desplegable de divisas alimentado dinámicamente desde las monedas activas de `user_settings` o cuentas existentes del usuario.
- **Centro de Ayuda, FAQ y Wiki (`lib/help-data.ts`)**:
  - Enriquecimiento del artículo `wiki-fx` ("Multi-moneda y Cotizaciones en Vivo").
  - Incorporación de preguntas frecuentes `faq-fx-custom-currency` y `faq-fx-manual-profile-rate`.
  - Nueva guía rápida `guide-manage-currencies` ("Agregar una moneda personalizada y fijar su cotización").
- **Documento de Requisitos de Producto (`docs/PRD.md`)**:
  - Actualización de las secciones 3.1, 4.11 y 5 con la especificación de monedas dinámicas, `active_currencies` y cotizaciones directas manuales.
- **Sincronización Total de Versión**: Incremento a `2.7.0` en `package.json`, `version.ts`, `version.test.ts` y documentación.

### Corregido
- **Blindaje ante Cuentas en Divisas Nuevas en `transactions/new`**: Eliminada la restricción de 5 divisas fijas en el formulario de transacciones que provocaba desincronización visual cuando se seleccionaba una cuenta con una divisa como ARS o BRL.

## [2.6.0] - 2026-10-22
### Agregado
- **Asistente Inicial de Bienvenida Interactivo en 5 Pasos (`/welcome`, `WelcomeWizard.tsx`)** (PRD §4.11):
  - **Acceso Exclusivo para Nuevos Usuarios (`welcome/page.tsx`)**: Blindaje de ruta que verifica si el usuario ya posee cuentas activas o completó el onboarding, redirigiendo de inmediato a `/dashboard` para evitar duplicaciones accidentales de datos. Se removió el acceso redundante desde Ajustes (`settings/page.tsx`).
  - **Validación de Conectividad en Vivo**: Integración de `useOnlineStatus()` mostrando banner preventivo y deshabilitando la inicialización en caso de estar offline (requiere conexión con Supabase).
  - **Paso 1 — Moneda Universal con Detección Regional**: Inferencia automática de divisa según el timezone y locale del navegador (`detectRecommendedCurrency`) sugiriendo la moneda local (EUR, USD, AUD, UYU, GBP, NZD) con badge *"Sugerida por tu región"*.
  - **Paso 2 — Instituciones, Cuentas y Saldo Inicial**: Constructor interactivo y dinámico que permite definir múltiples instituciones (bancos, fintechs, billetera de efectivo) con sus respectivas cuentas, tipos, divisas nativas y saldo real actual.
  - **Integración Contable de Saldo Inicial en Ledger (`welcome/actions.ts`)**: Para cuentas con saldo inicial distinto de cero, el backend genera asientos contables atómicos de tipo `ADJUSTMENT` (`status: 'COMPLETED'`) con fecha actual y nota `"Saldo inicial de configuración"`, permitiendo arrancar con el saldo real de inmediato sin distorsionar gastos ni presupuesto del mes.
  - **Paso 3 — Categorías**: Catálogo estándar de vida nómada seleccionable con formulario en línea para añadir categorías personalizadas al vuelo.
  - **Paso 4 — Personas y Gastos Compartidos (Split Pay)**: Explicación didáctica sobre compras grupales, préstamos y extensiones de tarjeta de crédito, manteniendo `Personal` para consumo propio y permitiendo agregar contactos con chips dinámicos.
  - **Paso 5 — Cierre, Transición y Arquitectura para Wizards Secundarios**: Resumen interactivo de configuración, botón *"Configurá mi espacio →"* y animación interactiva por etapas (*"Configurando moneda..."* $\rightarrow$ *"Creando cuentas..."* $\rightarrow$ *"Asentando saldos en el ledger..."* $\rightarrow$ *"¡Todo listo!"*), con hook preparado para futuros wizards de compromisos de tarjeta, primer movimiento y presupuesto.
- **Suite de Pruebas Unitarias (`WelcomeWizard.test.tsx`)**: 9 tests cubriendo la detección regional de moneda, progreso de 5 pasos, edición dinámica de instituciones y cuentas, saldo inicial, agregado de categorías y personas, animación de confirmación y resiliencia offline.

### Modificado
- **Centro de Ayuda & Wiki (`lib/help-data.ts`)**: Actualización de la FAQ `faq-welcome-wizard` y de la receta paso a paso `guide-welcome-wizard` para reflejar el flujo interactivo de 5 pasos.
- **Sincronización Total de Versión**: Incremento a `2.6.0` en `package.json`, `version.ts`, `version.test.ts` y `PRD.md`.


## [2.5.1] - 2026-10-21
### Modificado
- **Refinamiento de UX en Recuperación de Contraseña (`LoginPage.tsx`)**:
  - **Jerarquía y Foco Automático Post-Envío**: Una vez enviado el correo de restablecimiento, el botón *"Volver al inicio de sesión"* pasa a ser la acción primaria destacada y recibe el foco del teclado inmediatamente para guiar al usuario de forma natural.
  - **Minimización de Atención en Reenvío**: El botón de envío inicial se minimiza a una acción secundaria sutil (*"¿No te llegó? Reenviar link"*), evitando reenvíos innecesarios o confusión visual.
  - **Suite de Pruebas**: Test unitario específico en `app/login/page.test.tsx` verificando el cambio de foco y jerarquía visual tras el envío del enlace.
  - **Sincronización Total de Versión**: Incremento a `2.5.1` en `package.json`, `version.ts` y pruebas unitarias.

## [2.5.0] - 2026-10-21
### Agregado
- **Flujo Progresivo Email-First en Login y Registro (`LoginPage.tsx`)**:
  - **Punto de Entrada Unificado**: Acceso prioritario con *"Continuar con Google"* en la parte superior con divisor semántico, seguido por el campo de email con validación reactiva de formato que habilita dinámicamente el botón *"Continuar"*.
  - **Detección Automática de Estado de Usuario**: Consulta en segundo plano mediante la función RPC `check_user_exists` para bifurcar la experiencia sin fricción ni pestañas:
    - *Usuario Registrado*: Despliegue animado del campo de contraseña con foco automático, enlace contextual *"¿Olvidaste tu contraseña?"* y botón *"Iniciar sesión"*, incorporando botón *"Cambiar"* para rectificar el email sin recargar.
    - *Usuario Nuevo*: Título orientativo *"Creá tu contraseña para empezar"*, dos campos de contraseña (creación y confirmación) con advertencias preventivas de complejidad y botón *"Crear cuenta"*.
    - *Finalización de Registro*: Limpieza de credenciales y retorno automático al estado inicial con aviso positivo de verificación por correo.
- **Función RPC en Base de Datos (`supabase/migrations/0011_check_user_exists.sql`)**:
  - Función PostgreSQL `check_user_exists(lookup_email text)` con `SECURITY DEFINER` para responder de forma rápida y segura a clientes anónimos y autenticados sobre la existencia de un usuario en `auth.users`.
- **Módulo y Tests de Verificación de Email (`lib/auth/user-lookup.ts` y `.test.ts`)**:
  - Funciones `isValidEmail` y `checkUserExists` con suite completa de pruebas unitarias cubriendo sintaxis, respuestas afirmativas/negativas y tolerancia a fallos.
- **Suites de Pruebas de Integración de Login (`app/login/page.test.tsx`)**:
  - 6 tests validando el comportamiento dinámico del botón de continuar, transiciones automáticas a login o registro, cambio de correo y retorno al estado inicial tras signup.
- **Centro de Ayuda y FAQ (`lib/help-data.ts`)**:
  - Pregunta frecuente `faq-login-progressive-flow` explicando el nuevo flujo de acceso y registro en un solo paso.

### Modificado
- **Script Maestro de Producción (`supabase/setup_production.sql`)**: Incorporación de la función `check_user_exists` en la sección de funciones RPC del ledger.
- **Sincronización Total de Versión**: Incremento a `2.5.0` en `package.json`, `version.ts` y pruebas unitarias de versión.

## [2.4.1] - 2026-10-21
### Corregido
- **Mapeo y Feedback de Errores de Contraseñas en Supabase Auth (`UpdatePasswordForm.tsx`, `lib/auth/password-errors.ts`)**:
  - **Diagnóstico y fin del error genérico opaco**: Reemplazo del mensaje estático `"No pudimos actualizar la contraseña. Intentá de nuevo."` por el módulo `getPasswordErrorMessage` que inspecciona códigos y mensajes de Supabase (`weak_password`, status 422, `same_password`, `session_expired` / 401, rate limits).
  - **Causas reales y claras**: Ahora el usuario recibe feedback exacto cuando su contraseña no alcanza la longitud mínima requerida por la política, cuando no cumple la combinación de caracteres, cuando fue vulnerada en brechas públicas (HaveIBeenPwned / HIBP), o cuando intenta utilizar la misma contraseña previa.
  - **Resiliencia ante links expirados**: Incorporación de mensaje explicativo y enlace directo para pedir un nuevo link de recuperación si el token temporal caducó.
- **Traducción de Errores en Registro y Login (`LoginPage.tsx`)**:
  - Integración de `getSignUpErrorMessage` y `getSignInErrorMessage` para advertir sobre emails ya registrados, confirmaciones pendientes de correo o contraseñas débiles al crear cuentas.

### Agregado
- **Avisos Preventivos en Formularios**:
  - Textos de orientación bajo los campos de contraseña en `UpdatePasswordForm` y `LoginPage` (modo registro) indicando el mínimo de 6 caracteres y sugiriendo 8 o más combinando letras y números.
- **Módulo y Tests de Errores de Autenticación (`lib/auth/password-errors.ts` y `.test.ts`)**:
  - Suite de pruebas unitarias cubriendo casos de contraseña repetida, longitud mínima, complejidad, brechas HIBP, sesiones vencidas y control de tasa.
- **Centro de Ayuda y FAQ (`lib/help-data.ts`)**:
  - Incorporación de la pregunta frecuente `faq-password-requirements` detallando los requisitos de seguridad de contraseñas y el flujo de recuperación.

### Modificado
- **Copy Deck (`docs/design-system.md`)**: Incorporación de claves para `error.password_weak`, `error.password_same` y `error.password_session_expired`.
- **Sincronización Total de Versión**: Incremento a `2.4.1` en `package.json`, `version.ts` y pruebas unitarias de versión.

## [2.4.0] - 2026-10-19
### Agregado
- **Autenticación Rápida con OAuth (Google)**:
  - **Botón de Inicio Social en Login (`LoginPage.tsx`)**: Incorporación de botón de un clic para continuar con Google con icono vectorial oficial SVG, adaptabilidad a modo oscuro y claro, y separador semántico hacia el flujo de email. (El botón de Apple queda comentado y deshabilitado temporalmente hasta su posterior configuración en Supabase).
  - **Manejador `handleOAuth`**: Integración con `supabase.auth.signInWithOAuth` apuntando a `/auth/confirm` con intercambio automático de tokens y persistencia segura de cookies.
- **Asistente Inicial de Bienvenida (`/welcome`) — Sembrado User-Friendly (`seedUserSpaceAction`)**:
  - **Componente `WelcomeWizard` (`components/WelcomeWizard.tsx`)**: Asistente interactivo en 3 pasos para configurar un nuevo espacio en menos de 30 segundos sin necesidad de scripts SQL:
    - *Paso 1*: Selección visual de divisa base (EUR, USD, AUD, UYU, GBP, NZD).
    - *Paso 2*: Packs inteligentes de cuentas (Nómada Digital con Wise, Tradicional / Local con tarjeta de crédito, o Personalizado).
    - *Paso 3*: Selección de categorías estándar de vida nómada y definición de contactos para gastos compartidos (Split Pay).
  - **Server Actions Atómicas (`app/(protected)/welcome/actions.ts`)**: `seedUserSpaceAction` para crear instituciones, cuentas, categorías y personas en lote marcando `onboarding_completed: true` en `user_settings`, y `skipWelcomeAction` para omitir y comenzar en blanco.
  - **Enrutamiento Inteligente**: Detección automática en `/dashboard` para nuevos usuarios sin cuentas activas, redirigiendo al asistente de bienvenida. Acceso directo añadido en `/settings`.
- **Centro de Ayuda & Wiki (`lib/help-data.ts`)**:
  - FAQs sobre login con Google/Apple y configuración inicial con el Asistente.
  - Receta rápida ilustrada para sembrar el espacio en 30 segundos.
  - Suite de pruebas unitarias actualizada (`apps/web/components/WelcomeWizard.test.tsx`).

## [2.3.1] - 2026-10-19
### Corregido
- **Flujo de Confirmación de Correo y Autenticación en Producción (`/auth/confirm`)**:
  - **Persistencia de Cookies de Sesión en Route Handler**: Corrección en [`apps/web/app/auth/confirm/route.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/auth/confirm/route.ts) para asociar el almacenamiento de cookies directamente a la instancia `NextResponse.redirect` mediante `createServerClient`, garantizando que los encabezados `Set-Cookie` de Supabase se envíen al navegador al redirigir al `/dashboard` y evitando rebotes involuntarios al `/login`.
  - **Soporte Híbrido de Verificación**: Integración nativa de `verifyOtp({ type, token_hash })` para flujos cross-device y enlaces directos de correo, junto al intercambio de código PKCE `exchangeCodeForSession(code)`.
  - **Resiliencia y Feedback Positivo**: Incorporación de redirección preventiva con `confirmed=true` hacia `/login` en caso de enlaces abiertos en clientes de correo externos o navegadores desvinculados del verifier PKCE, mostrando mensaje claro de confirmación exitosa (`LoginPage.tsx`).
- **Sincronización de Versión**: Incremento a `2.3.1` en `package.json`, `version.ts` y pruebas unitarias.

## [2.3.0] - 2026-10-18
### Agregado
- **Centro de Ayuda, FAQ Interactivo y Wiki Funcional (`/help`)** (PRD §4.10):
  - **Módulo de Datos y Motor de Búsqueda (`lib/help-data.ts`)**:
    - `WIKI_ARTICLES`: 8 artículos detallados cubriendo multi-moneda FX, cuentas e instituciones, transacciones y Zero-Wait UI, tarjetas y cuotas, personas y cuentas por cobrar, Ajuste Express, categorías personalizadas y modo offline.
    - `FAQ_ITEMS`: 17 preguntas frecuentes categorizadas y etiquetadas con `tags` temáticos y referencias cruzadas directas a la Wiki.
    - `QUICK_GUIDES`: 5 recetas paso a paso ilustradas para los casos de uso recurrentes (cenas compartidas, compras en cuotas, conciliación en 10s, cambio de país/divisa y modo avión).
    - `searchHelp`: función de búsqueda en vivo con filtrado multi-criterio por término, tags, subsecciones y categoría.
  - **Componente Visual Premium `HelpCenter` (`components/HelpCenter.tsx`)**:
    - Buscador hero en tiempo real con botón de limpieza y contador de coincidencias en vivo.
    - Filtro horizontal por categoría con badges semánticos.
    - 3 Pestañas interactivas: *Wiki & Guías*, *Preguntas Frecuentes* (con acordeón y botones para expandir/colapsar todas), y *Recetas Rápidas* con enlaces contextuales directos a los formularios.
    - Banner interactivo integrado con `TourTriggerButton` para relanzar el Onboarding Tour en cualquier momento.
    - Estado vacío ilustrado con restablecimiento de filtros en un clic.
    - Respeto estricto del sistema de diseño (variables semánticas `--surface-0`, `--surface-1`, `--surface-2`, `--border`, `--accent`, `--income`, etc.).
  - **Ruta Protegida `/help` (`app/(protected)/help/page.tsx`)**:
    - Acceso autenticado con detección de moneda global del usuario y tolerancia offline.
  - **Suites de Pruebas Automatizadas**:
    - [`apps/web/lib/help-data.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/help-data.test.ts): 8 pruebas unitarias validando la integridad del contenido, unicidad de IDs y exactitud del motor de búsqueda.
    - [`apps/web/components/HelpCenter.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/HelpCenter.test.tsx): 6 pruebas cubriendo renderizado, navegación por pestañas, expansión de FAQs, filtrado en tiempo real y estados vacíos (132 tests pasando en total).
- **Directivas y Skills de Mantenimiento Continuo de la Base de Conocimiento**:
  - **Regla 6 en `AGENTS.md`**: Obligatoriedad para cualquier agente de IA o desarrollador de mantener actualizados `WIKI_ARTICLES`, `FAQ_ITEMS` y `QUICK_GUIDES` en `apps/web/lib/help-data.ts` ante cada nueva funcionalidad, ajuste o cambio de regla contable.
  - **Skill de Claude Code (`.claude/skills/help-maintenance/SKILL.md`)**: Guía detallada con la estructura requerida, categorías disponibles, tono rioplatense y comandos de verificación.
  - **Actualización de Agentes Especializados**: Sincronización de [`.claude/agents/ui-builder.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/.claude/agents/ui-builder.md), [`.claude/agents/ledger-logic.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/.claude/agents/ledger-logic.md) y [`docs/agents-and-skills.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/agents-and-skills.md).

### Modificado
- **Navegación Desktop y Móvil (`Navigation.tsx`)**: Incorporación de enlace directo a *Ayuda & Wiki* (`/help`, icono `HelpCircle`) en el menú lateral y en el panel desplegable de Más en móviles.
- **Pantalla de Ajustes (`settings/page.tsx`)**: Integración de botón destacado hacia el Centro de Ayuda & Wiki dentro de la tarjeta de *Guía y Aprendizaje*.
- **Documentación del PRD (`docs/PRD.md`)**: Incorporación formal de la sección §4.10 detallando el alcance del Centro de Ayuda, FAQ y Wiki.
- **Sincronización de Versión**: Incremento de versión a `2.3.0` en `package.json`, `version.ts` y pruebas unitarias.

## [2.2.0] - 2026-10-15
### Agregado
- **Tour de Bienvenida e Inicio Guiado (`OnboardingTour`)**:
  - **Componente Modal Interactivo**: Creación de [`apps/web/components/OnboardingTour.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/OnboardingTour.tsx) con recorrido de 5 pasos explicativos: bienvenida al nomadismo digital, selector de divisa global en vivo (EUR, USD, AUD, UYU, NZD), jerarquía de cuentas/efectivo, registro en 3 segundos con cuotas automáticas y presentación de categorías y análisis de datos.
  - **Accesibilidad y Navegación por Teclado**: Soporte para teclas `Escape` (cerrar/omitir), flechas `ArrowRight`/`ArrowLeft` para avanzar o retroceder, barra de progreso y persistencia en `localStorage` (`finance_nomad_tour_completed`).
  - **Banner Preventivo en Dashboard**: Incorporación de banner en [`DashboardClient.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/DashboardClient.tsx) para invitar a nuevos usuarios a realizar el tour o descartarlo.
  - **Disparador en Ajustes (`TourTriggerButton`)**: Creación de [`apps/web/components/TourTriggerButton.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/TourTriggerButton.tsx) e integración en [`/settings`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/settings/page.tsx) para repetir el tour en cualquier momento.
  - **Pruebas Automatizadas**: [`apps/web/components/OnboardingTour.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/OnboardingTour.test.tsx) con 5 pruebas verificando renderizado, avance, selección de divisa, navegación y persistencia.

- **Módulo y Catálogo de Categorías de Gastos (`/categories`)**:
  - **Página de Gestión**: Creación de [`apps/web/app/(protected)/categories/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/categories/page.tsx) con métricas de movimientos asociados por categoría.
  - **Componente Reactivo `CategoryList`**: [`apps/web/components/CategoryList.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/CategoryList.tsx) con filtrado en tiempo real por estado (Activas, Inactivas, Todas), buscador por texto, renderizado de iconos Lucide y colores semánticos (`accent`, `income`, `expense`, `pending`).
  - **Modal de Creación y Edición `CategoryModal`**: [`apps/web/components/CategoryModal.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/CategoryModal.tsx) con selector visual de 13 iconos, 4 tokens de color, validación online (`useOnlineStatus`) y alternancia de baja lógica.
  - **Server Actions de Catálogo**: [`apps/web/app/(protected)/categories/actions.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/categories/actions.ts) con `createCategory`, `updateCategory`, `toggleCategoryActive` y sembrado de categorías recomendadas (`seedDefaultCategories`).
  - **Migración de Base de Datos 0010**: [`supabase/migrations/0010_categories_and_onboarding.sql`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/supabase/migrations/0010_categories_and_onboarding.sql) incorporando `icon`, `color` y `is_active` a `categories`, índice compuesto y `onboarding_completed` a `user_settings`.
  - **Pruebas Automatizadas**: [`apps/web/components/CategoryModal.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/CategoryModal.test.tsx) con 5 pruebas unitarias.

- **Dashboard de Análisis de Datos y Reportes Financieros (`/analytics`)**:
  - **Página de Reportes**: Creación de [`apps/web/app/(protected)/analytics/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/analytics/page.tsx) con tolerancia offline y carga paralela.
  - **Componente `AnalyticsDashboard`**: [`apps/web/components/AnalyticsDashboard.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AnalyticsDashboard.tsx) sincronizado con `useLedger()` para reflejar nuevos movimientos en 0ms.
  - **5 Tarjetas de KPIs Clave**: Gasto Total, Ingreso Total, Flujo Neto (+ Superávit / - Déficit), Tasa de Ahorro (%) y Promedio de Gasto Diario.
  - **Filtros Temporales Rápidos**: Selector interactivo para Este mes, Últimos 3 meses, Últimos 6 meses, Este año e Histórico completo.
  - **Gráficos SVG Nativos Semánticos (Zero Hardcoded Colors)**:
    - *Gastos por Categoría*: Barra stacked porcentual interactiva y lista de progreso detallada.
    - *Flujo de Caja Mensual*: Gráfico de barras comparativo de Ingresos (`--income`) vs Gastos (`--expense`) mes a mes.
    - *Distribución Multi-Moneda*: Desglose de gastos en divisas locales (EUR, USD, AUD, UYU, NZD).
    - *Métodos de Pago*: Distribución porcentual entre tarjetas de crédito, cuentas bancarias y efectivo.
  - **Módulo de Cálculo Puro**: [`apps/web/lib/analytics.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/analytics.ts) con cálculo de rangos, agregaciones y KPIs.
  - **Pruebas Automatizadas**: [`apps/web/lib/analytics.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/analytics.test.ts) (5 pruebas) y [`apps/web/components/AnalyticsDashboard.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/AnalyticsDashboard.test.tsx) (3 pruebas).

### Modificado
- **Navegación Desktop y Móvil (`Navigation.tsx`)**: Incorporación de enlaces directos a *Análisis* (`/analytics`, icono `BarChart3`) y *Categorías* (`/categories`, icono `Tags`).
- **Dashboard Principal (`DashboardClient.tsx`)**: Integración del banner de bienvenida y tarjeta de acceso rápido al Dashboard de Análisis.
- **Tipos del Sistema (`lib/types.ts`)**: Ampliación de `Category` y `UserSettings`.
- **Sincronización de Versión**: Incremento de versión a `2.2.0` en `package.json`, `version.ts` y pruebas unitarias (118 tests pasando en total).
### Agregado
- **Flujo Transaccional Completo de Registro de Cobro a Personas (`RegisterPersonPaymentModal`)** (PRD §4.5):
  - **Modal Transaccional Local-First**: Creación de [`apps/web/components/RegisterPersonPaymentModal.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/RegisterPersonPaymentModal.tsx) para registrar cobros en 0ms sin requerir conectividad previa. Precarga de saldo actual (`date <= hoy`), selección de cuenta receptora (excluye tarjetas), selección de moneda, conversión cambiaria FX en vivo (automática y manual), selector de fecha y descripción.
  - **Diagnóstico y Soporte de 3 Casos Contables en Vivo**:
    - *Caso A*: Pago total del saldo actual con badge verde de confirmación e imputación al 100% de movimientos vencidos y devengados.
    - *Caso B*: Pago parcial con badge ámbar de advertencia, detalle de saldo restante por cobrar y amortización FIFO cronológica.
    - *Caso C*: Pago con adelanto a cuotas futuras con badge azul e imputación primero al saldo actual y el excedente a cuotas diferidas.
  - **Validación de Excedente Absoluto**: Bloqueo preventivo de envío si el importe ingresado supera la deuda total consolidada (saldo actual + cuotas futuras), con mensaje orientativo para registrar excedentes como ingreso estándar.
  - **Motor de Amortización Contable FIFO**: Creación de [`apps/web/lib/ledger/settlement.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/settlement.ts) con las funciones `allocateSettlement` y `buildPersonSettlementBundle` para imputación exacta de deudas y generación de lotes atómicos de tipo `SETTLEMENT`.
  - **Integración con Ledger Engine y Outbox**: Incorporación del método `addPersonSettlement` en [`LedgerContext`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/ledger-context.tsx) y actualización de `applyBundleDelta` en [`balance.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/balance.ts) para acreditar el ingreso en la cuenta receptora en memoria (< 16ms) sin alterar tarjetas originales, sincronizando atómicamente vía Outbox e IndexedDB.
  - **Migración de Base de Datos (0009)**: [`supabase/migrations/0009_person_settled_amount.sql`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/supabase/migrations/0009_person_settled_amount.sql) incorporando `settled_amount numeric(12,2) not null default 0` a `master_transactions`, backfill de registros históricos y actualización de la RPC `commit_ledger_bundle` con soporte de `on conflict (id) do update`.
  - **Suites de Pruebas Automatizadas**:
    - [`apps/web/lib/ledger/settlement.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/ledger/settlement.test.ts): 6 pruebas cubriendo los casos A, B, C, validación de excedente y delta contable selectivo.
    - [`apps/web/components/RegisterPersonPaymentModal.test.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/RegisterPersonPaymentModal.test.tsx): 6 pruebas cubriendo renderizado, detección de casos, bloqueo de excedente y despacho al ledger (100 tests pasando en total).

### Modificado
- **Ficha de Persona y Acciones Contextuales (`/people/[id]`)**:
  - En [`PersonActions.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/PersonActions.tsx), reemplazo de la Server Action síncrona por la apertura de `RegisterPersonPaymentModal` (sin bloqueo por estado de red `!isOnline`), y cálculo de saldo pendiente real restando `settled_amount` en la plantilla de notificación de WhatsApp.
  - En [`people/[id]/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/people/[id]/page.tsx), paralelización de carga de cuentas y categorías, cálculo de saldo por cobrar con `settled_amount` y renderizado de badges de *"Parcial"* en el desglose de movimientos.
  - En [`people/page.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/people/page.tsx), cálculo de saldos consolidados considerando amortizaciones parciales.

### Eliminado
- **Server Actions Obsoletas de Mutación Contable**:
  - Eliminación de `createTransaction` y `createTransferTransaction` en [`apps/web/app/(protected)/transactions/new/actions.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/app/(protected)/transactions/new/actions.ts), junto con sus interfaces asociadas (`NewTransactionInput`, `TransferTransactionInput`) y función auxiliar redundante `calculateInstallmentDate`. Estas funciones representaban código legado de etapas tempranas que contradecían la directiva obligatoria de *Zero-Wait UI* y el modelo transaccional por *Ledger Bundles* (PRD §3.1, §3.3 y `docs/architecture.md` §1.1).

### Modificado
- **Unificación de Registro de Pagos de Tarjeta en Ledger Engine**:
  - En [`RegisterCardPaymentModal.tsx`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/components/RegisterCardPaymentModal.tsx), se removió la importación y la rama de fallback a `createTransferTransaction`. El modal ahora despacha transferencias contables exclusivamente mediante `ledger.addTransfer`, garantizando actualización inmediata en memoria (< 16ms), persistencia en el Outbox local de IndexedDB y sincronización asíncrona hacia Supabase vía `/api/ledger/sync`.

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
