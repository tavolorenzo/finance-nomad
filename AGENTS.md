# Reglas de Proyecto para Agentes — Finance Nomad

Este archivo contiene las directivas y restricciones obligatorias para cualquier agente de IA o desarrollador trabajando en este repositorio.

---

## 1. Presentación Previa Obligatoria de Plan de Implementación e Impacto

> [!IMPORTANT]
> **Antes de ejecutar cualquier modificación en el código fuente, refactorización, migración de base de datos o desarrollo de nuevas funcionalidades, es OBLIGATORIO presentar previamente un Plan de Implementación detallado junto con su Evaluación de Impacto.**
>
> * **Contenido mínimo del Plan**:
>   - **Objetivo y Alcance**: Definición precisa de la necesidad y delimitación de módulos y rutas involucradas.
>   - **Nodos y Componentes Afectados**: Lista exhaustiva de archivos a crear o modificar.
>   - **Propuesta Técnica y Arquitectura**: Diseño de componentes, flujos de estado (ej. React, IndexedDB, Server Actions) y apego a las directivas de diseño.
>   - **Análisis de Impacto**: Evaluación de rendimiento (DOM, renders, memoria), compatibilidad con el modo offline, efectos secundarios en la base de datos o en otros flujos contables, y posibles riesgos con sus mitigaciones.
>   - **Estrategia de Verificación**: Pruebas unitarias o de integración a ejecutar para validar que no haya regresiones.
>   - **Plan de Acción por Pasos**: Desglose secuencial y verificable de la ejecución.
> * **Alineación con el Usuario**: Esperar confirmación o feedback del usuario cuando existan alternativas de diseño o decisiones clave de UX/arquitectura.

---

## 2. Registro Obligatorio de Versiones y Mantenimiento de Versión (CHANGELOG y Proyecto)

> [!IMPORTANT]
> **En cada cambio funcional, refactorización, corrección de bugs o nueva funcionalidad implementada, es OBLIGATORIO mantener actualizada la versión tanto en el código del proyecto como en la documentación.**
> 
> * **Versión del Proyecto (SemVer)**:
>   * Ante cualquier funcionalidad nueva o cambio funcional notable, incrementá la versión (`MAJOR.MINOR.PATCH`) en:
>     - [`apps/web/package.json`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/package.json) (`version`)
>     - [`apps/web/lib/version.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/version.ts) (valor por defecto retornado por `getAppVersion()`)
>     - [`apps/web/lib/version.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/version.test.ts) (pruebas unitarias de versión)
> * **Registro en Changelog**:
>   * Actualizá obligatoriamente [`docs/CHANGELOG.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/CHANGELOG.md) con la cabecera de versión formal `## [X.Y.Z] - YYYY-MM-DD` (o en `[Unreleased]` si es un cambio intermedio sin corte de versión formal).
>   * Clasificá las entradas usando las categorías estándar: `Agregado`, `Modificado`, `Corregido`, `Eliminado`.
>   * Indicá los componentes, rutas o módulos impactados y la sección del PRD relacionada si aplica.
> * **Sincronización Total**: No des por finalizada una tarea sin haber sincronizado la versión en código, UI (`SystemInfoCard`) y documentación.

---

## 3. Reglas de Diseño y UI (`apps/web`)

* **Tokens de Color**: Cero colores hardcodeados. Utilizar exclusivamente las variables CSS semánticas definidas en `globals.css`:
  * Fondos: `--surface-0`, `--surface-1`, `--surface-2`, `--surface-card`
  * Bordes: `--border`, `--border-subtle`
  * Textos: `--text-primary`, `--text-secondary`, `--text-muted`
  * Semántica: `--accent`, `--income`, `--expense`, `--pending`
* **Montos Monetarios**: Todo monto monetario debe renderizarse con `font-mono tabular-nums amount` usando `formatMoney(monto, divisa)`.
* **Copy Deck**: Todo texto visible al usuario debe respetar el tono rioplatense definido en `docs/design-system.md` (tratar de "vos", conciso, sin formalismos como "por favor").
* **Server Actions**: Seguir el patrón mutar $\rightarrow$ `revalidatePath` $\rightarrow$ `redirect`. Si se invoca desde cliente en un `try/catch`, siempre relanzar con `rethrowRedirect(err)` antes de tratarlo como error.

---

## 4. Reglas de Negocio y Ledger Contable

* **Transacciones**: Toda fila en `master_transactions` debe persistir tanto `amount_original` + `currency_original` como `amount_account` + `currency_account`.
* **Transferencias y Pagos**: Se registran como 2 filas atómicas enlazadas por `parent_transaction_id` (débito negativo en origen, crédito positivo en destino).
* **Multi-moneda**: En transferencias con divisas diferentes, debitar en moneda nativa de la cuenta origen (`amountFrom`) y acreditar en moneda nativa de la cuenta destino (`amountTo`).
* **Presupuesto**: Los pagos de tarjeta y transferencias internas (`TRANSFER`) y ajustes de saldo (`ADJUSTMENT`) **nunca** deben computarse como gastos de consumo (`OUTCOME`).

---

## 5. Base de Datos y Supabase

* **Seguridad (RLS)**: Toda tabla mutable lleva `user_id` y política RLS restringida al usuario autenticado.
* **Integridad y Soft Deletes**: No realizar borrados físicos (`DELETE`) en `institutions` ni `accounts` (el trigger SQL `prevent_account_hard_delete` lanzará excepción). Utilizar siempre `is_active = false`.
* **Migraciones**: Nuevas estructuras deben crearse en un archivo versionado `supabase/migrations/NNNN_descripcion.sql`. Nunca modificar migraciones ya aplicadas.
* **Recordatorio Obligatorio de Scripts SQL**: En cada tarea, funcionalidad o bugfix que requiera una migración o actualización en la base de datos (`supabase/migrations/*.sql`), **es OBLIGATORIO recordar explícitamente al usuario ejecutar el script SQL** en el SQL Editor de Supabase, incluyendo siempre las instrucciones y el bloque de código SQL completo listo para copiar y ejecutar.

---

## 6. Directivas de Sincronización y Mutaciones en Cliente

* **Ledger Bundles**: Toda operación contable generada en la UI debe encapsularse en un `LedgerBundle` con UUIDs asignados mediante `crypto.randomUUID()` en el cliente. Queda prohibido persistir o sincronizar filas huérfanas de cuotas o transferencias.
* **Cálculo de Saldos (Baseline + Delta)**: No descargar historiales completos para computar saldos en memoria de Node o browser. Usar siempre el baseline provisto por el backend más los deltas de las filas locales `COMPLETED`.
* **Zero-Wait UI (Exclusivo Ledger Transaccional)**: Los formularios y acciones de registro contable (`master_transactions`) no deben congelar la UI esperando respuestas de red. Las mutaciones se reflejan al instante en la memoria local y se encolan en el Outbox para su respaldo en background.
* **Catálogos Maestros (Online-First)**: La creación y edición de instituciones, cuentas, personas y préstamos se procesa de forma síncrona mediante Server Actions contra Supabase. En formularios de catálogo (`InstitutionForm`, `PersonForm`, `AccountForm`, `LoanForm`), se debe validar conectividad con `useOnlineStatus()` mostrando feedback preventivo y deshabilitando el botón de submit si el usuario está offline para evitar fallos de red silenciosos.
* **Mantenimiento Obligatorio de Arquitectura PWA y Persistencia Offline**:
  - Ante cualquier nuevo módulo, vista o entidad contable (ej. inversiones, pasivos, suscripciones):
    1. **Snapshot de arranque**: Extender `apps/web/app/api/bootstrap/route.ts` para devolver la entidad activa en paralelo.
    2. **Persistencia en IndexedDB**: Incorporar la entidad en `BootstrapData`, `LedgerContextType` y `seedInitialData` dentro de `apps/web/lib/ledger/ledger-context.tsx` para persistirla en `app_snapshot` (`outbox-db.ts`).
    3. **Hidratación en cliente**: El componente cliente de la vista debe consumir `useOptionalLedger()` y montar los datos locales si el servidor devuelve lista vacía por desconexión.
    4. **Service Worker (`sw.js`)**: Mantener el cacheo de assets estáticos y navegación `NetworkFirst` con fallback a caché y exclusión estricta de llamadas mutables (`POST`) o autenticación.

---

## 7. Mantenimiento Obligatorio del Centro de Ayuda, FAQ y Wiki (`apps/web/lib/help-data.ts`)

> [!IMPORTANT]
> **En cada nueva funcionalidad, flujo transaccional, parámetro de configuración o cambio de regla de negocio, es OBLIGATORIO mantener actualizado el Centro de Ayuda, su Wiki y sus Preguntas Frecuentes.**
>
> * **Artículos de la Wiki (`WIKI_ARTICLES`)**:
>   - Si se agrega un módulo, vista o comportamiento nuevo (ej. préstamos, inversiones, nuevas formas de pago o reglas cambiarias), agregá o enriquecé el artículo correspondiente en [`apps/web/lib/help-data.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/help-data.ts).
>   - Incluí explicaciones claras, consideraciones clave y notas/tips orientativos (`tip`).
>   - Mantené los enlaces directos de acción (`targetRoute` y `targetLabel`) apuntando a las pantallas reales.
> * **Preguntas Frecuentes (`FAQ_ITEMS`)**:
>   - Incorporá preguntas frecuentes que resuelvan dudas operativas sobre la nueva función, sus casos borde y cómo interactúa con el resto de la app (multi-moneda, offline, cuotas, etc.).
>   - Asigná etiquetas semánticas (`tags`) para facilitar la búsqueda en tiempo real.
> * **Recetas Rápidas (`QUICK_GUIDES`)**:
>   - Si la funcionalidad introduce un caso de uso común (ej. conciliar saldo, registrar cobro compartido, pagar cuotas), agregá una receta paso a paso para el usuario.
> * **Tono y Estilo**:
>   - Todo texto debe respetar el tono rioplatense (tratar de "vos", directo, conciso, sin formalismos como "por favor").
> * **Sincronización con el PRD y Tests**:
>   - Reflejá la nueva funcionalidad en [`docs/PRD.md`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/docs/PRD.md) y asegurá que las pruebas unitarias de [`apps/web/lib/help-data.test.ts`](file:///Users/gustavolorenzo/Documents/GitHub/finance-nomad/apps/web/lib/help-data.test.ts) continúen pasando.


