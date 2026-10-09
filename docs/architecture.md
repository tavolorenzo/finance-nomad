# Arquitectura Técnica — Finance Nomad

Este documento define la arquitectura técnica del sistema, con especial énfasis en el modelo **Optimistic-First / Local-First** con sincronización en segundo plano (*Background Sync*).

---

## 1. Visión General

Finance Nomad combina Next.js (App Router), Supabase (PostgreSQL) y almacenamiento en el cliente (IndexedDB) para lograr:
* **Fluidez absoluta (60 FPS)**: Las acciones del usuario (registrar gastos, transferencias o ajustes) responden inmediatamente en la UI ($< 16\text{ ms}$) sin esperar roundtrips de red.
* **Integridad Contable ACID**: Las transacciones complejas (cuotas múltiples, transferencias con dos cuentas ligadas) se empaquetan en unidades atómicas denominadas **Ledger Bundles**.
* **Resiliencia Offline**: Los movimientos se persisten en una cola local (*Outbox*) antes de enviarse a Supabase. Si no hay conexión o el servidor falla, se reintentan automáticamente con *exponential backoff*.
* **Carga Inicial Liviana**: El cliente obtiene un *Bootstrap Snapshot* (saldos consolidados en SQL + transacciones de los últimos 10 días).

### 1.1. Modelo Híbrido: Capa Transaccional vs. Capa Estructural

El sistema implementa una arquitectura híbrida intencional que distingue entre acciones operativas de alta frecuencia y configuración administrativa:

1. **Capa Transaccional (Ledger)** — *Local-First / Zero-Wait*:
   - **Alcance**: Gastos (`INCOME`/`OUTCOME`), cuotas con tarjeta, transferencias entre cuentas y ajustes de saldo.
   - **Comportamiento**: 100% tolerante a desconexión (*Offline-Ready*). Los UUIDs se generan en el cliente (`crypto.randomUUID()`), el delta de saldo se aplica en memoria en $< 16\text{ ms}$, la mutación se encola en el *Outbox* (IndexedDB) y se despacha asíncronamente en segundo plano.
2. **Capa Estructural / Catálogos Maestros** — *Online-First*:
   - **Alcance**: Creación y edición de Instituciones, Cuentas bancarias, Personas y Ajustes de usuario.
   - **Comportamiento**: Requiere conectividad activa. Se gestiona mediante Server Actions síncronas directas a Supabase para garantizar integridad referencial (Foreign Keys), reglas de negocio atómicas (ej. creación automática de cuenta en efectivo asociada a la institución) y triggers de seguridad (`prevent_account_hard_delete`).
   - **Protección UI**: Si el usuario está offline (`navigator.onLine === false`), los formularios muestran feedback preventivo rioplatense y deshabilitan el envío para evitar fallos de red confusos.

---

## 2. El Concepto de Ledger Bundle

Un **Ledger Bundle** representa una unidad atómica de mutación contable que genera 1 o más filas en la tabla `master_transactions`:

```
                 ┌────────────────────────────────────────┐
                 │             Ledger Bundle              │
                 │  id: UUID                              │
                 │  type: TRANSACTION | TRANSFER          │
                 │  createdAt: ISO String                 │
                 │  rows: MasterTransaction[]             │
                 └──────────────────┬─────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
[Gasto en N Cuotas]                                 [Transferencia / Pago Tarjeta]
Row 1: Cuota 1 (COMPLETED/PENDING)                  Row 1: Débito Origen (negativo)
Row 2: Cuota 2 (PENDING, parent_id = Row 1)         Row 2: Crédito Destino (positivo, parent_id = Row 1)
Row N: Cuota N (PENDING, parent_id = Row 1)
```

### Reglas de los Bundles:
1. **Generación Determinística de IDs**: Todos los UUIDs (`id` y `parent_transaction_id`) son generados en el cliente mediante `crypto.randomUUID()` antes de cualquier interacción de red.
2. **Indivisibilidad**: Un bundle se inserta en Supabase como un todo (o mediante la función RPC `commit_ledger_bundle` o inserción por batch). No pueden existir filas huérfanas.
3. **Idempotencia**: Si el cliente reintenta enviar un bundle ya guardado por un error transitorio de red, la base de datos ignora duplicados mediante cláusulas de conflicto (`ON CONFLICT (id) DO NOTHING`).

---

## 3. Cálculo de Saldos: Baseline + Delta

Para evitar descargar todo el historial de la base de datos:

1. **Baseline Snapshot (Postgres)**:
   - Al cargar la app, Postgres ejecuta la agregación en el motor SQL indexado:
     $$\text{Baseline} = \sum_{\text{COMPLETED, date} \le \text{hoy}} \text{amount\_account}$$
   - El resultado es una lista compacta de `{ accountId, currency, balance }`.
2. **Delta Local (Memoria / Contexto)**:
   - El cliente mantiene los saldos actuales. Al emitir un nuevo bundle:
     $$\text{Saldo Visible} = \text{Baseline} + \sum \Delta(\text{Filas COMPLETED del Bundle})$$
   - Si una compra es en 6 cuotas:
     - Cuota 1 (`COMPLETED`): se resta del saldo disponible inmediatamente.
     - Cuotas 2 a 6 (`PENDING`): no alteran el saldo nominal disponible, pero se suman a la retención de crédito.
   - Si es una transferencia:
     - Fila de origen (débito): se resta de la cuenta origen.
     - Fila de destino (crédito): se suma en la cuenta destino.

---

## 4. Ciclo de Vida del Outbox y Sync Engine

```
[Acción de Usuario]
        │
        ▼
[buildTransactionBundle / buildTransferBundle]
        │
        ├─────────────────────────────────────────────────┐
        ▼                                                 ▼
[Actualizar Estado en Memoria]                 [Guardar en IndexedDB (Outbox)]
(UI se actualiza en < 16ms)                     Status: 'PENDING', attempts: 0
        │                                                 │
        ▼                                                 ▼
[Cerrar Modal / Redirigir]                     [Sync Engine Dispatcher]
                                                          │
                                         ┌────────────────┴────────────────┐
                                         ▼                                 ▼
                                   [Online y 200 OK]             [Offline o Error 5xx]
                                         │                                 │
                                         ▼                                 ▼
                             [Status: 'SYNCED' -> Purge]     [Status: 'FAILED', Backoff]
                                                             - Reintento: 1s, 3s, 10s...
                                                             - Escucha evento 'online'
```

### Estados de un Job en el Outbox:
* `PENDING`: Encolado y listo para ser enviado.
* `SYNCING`: En proceso de transmisión por red.
* `FAILED`: Falló tras un intento; esperando temporizador de reintento o evento de conectividad.
* `SYNCED`: Confirmado por el servidor; se purga del almacenamiento local.

---

## 5. Módulos y Estructura del Código

```
apps/web/
├── lib/
│   ├── ledger/
│   │   ├── types.ts              Definiciones de LedgerBundle, OutboxJob, BuildTransactionInput
│   │   ├── builder.ts            Funciones puras de construcción determinística de bundles
│   │   ├── balance.ts            Cálculo puro de saldos (Baseline + Delta)
│   │   └── ledger-context.tsx    Proveedor React global y hook useLedger() para mutaciones zero-wait
│   ├── storage/
│   │   └── outbox-db.ts          Almacén IndexedDB estructurado ('finance_nomad_local')
│   ├── sync/
│   │   └── sync-engine.ts        Motor de reintentos exponenciales y escucha de conectividad
│   ├── fx/
│   │   └── index.ts              Motor de cotizaciones multi-moneda con caché en memoria
│   └── networth.ts               Consolidación patrimonial y consulta agregada de balances
├── app/
│   └── api/
│       ├── bootstrap/route.ts    Snapshot inicial unificado (< 80ms)
│       ├── ledger/sync/route.ts  Procesamiento en lote del Outbox
│       └── transactions/route.ts Paginación histórica cursor-based
└── components/
    ├── SyncStatusBadge.tsx       Feedback visual del estado de sincronización
    └── TransactionsList.tsx      Feed optimista con carga histórica bajo demanda
```

---

## 6. Endpoints de Sincronización y API

| Endpoint | Método | Propósito | Tiempo objetivo |
|---|---|---|---|
| `/api/bootstrap` | `GET` | Descarga el snapshot inicial consolidado: cuentas, categorías, personas, estimaciones, saldos precalculados y transacciones de los últimos 10 días. | < 80 ms |
| `/api/ledger/sync` | `POST` | Recibe un lote de `LedgerBundle` desde el Outbox local y los persiste atómicamente en PostgreSQL mediante `commit_ledger_bundle`. | < 120 ms |
| `/api/transactions` | `GET` | Paginación histórica bajo demanda basada en cursor (`beforeDate`, `limit`) para explorar movimientos antiguos sin penalizar la carga inicial. | < 100 ms |

---

## 7. Motor de Conversión de Monedas (FX Engine)

* **Fuentes de Datos**:
  - `open.er-api.com`: Datos JSON estructurados en tiempo real para UYU, EUR, USD, AUD, NZD.
  - `api.frankfurter.app`: Fallback para monedas oficiales del Banco Central Europeo y tipos de cambio históricos por fecha.
* **Caché en Memoria**:
  - `Map<string, { rate: number, expiresAt: number }>` con TTL de 1 hora.
  - Elimina llamadas externas repetitivas (tiempo de resolución en caché: ~0.01 ms).
* **Concurrencia**:
  - `convertToDisplayCurrency` paraleliza el cálculo de saldos de todas las cuentas usando `Promise.all`.

---

## 8. Base de Datos y Funciones RPC (Migración 0008)

La migración `supabase/migrations/0008_ledger_sync_and_snapshot.sql` delega las operaciones críticas al motor relacional indexado:

1. `get_account_balances_summary()`:
   - Ejecuta un `GROUP BY account_id, currency_account` en PostgreSQL filtrando por `status = 'COMPLETED'` y `date <= CURRENT_DATE`.
   - Calcula simultáneamente los compromisos futuros (`pending_credit_hold`) para tarjetas de crédito.
2. `commit_ledger_bundle(p_bundle_id, p_bundle_type, p_rows)`:
   - Valida el usuario autenticado (`auth.uid() = user_id`).
   - Inserta todas las filas del bundle de forma atómica e idempotente (`ON CONFLICT (id) DO NOTHING`).

