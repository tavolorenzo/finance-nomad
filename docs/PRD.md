# Product Requirement Document (PRD): Personal Finance & Portfolio Manager (Backpacker & Nómada Edition)

## 1. Visión del Producto
Aplicación de finanzas personales, gestión de presupuestos, préstamos y seguimiento de inversiones orientada a usuarios con alta movilidad internacional (backpackers, nómadas digitales, expats). 

El sistema está optimizado para el manejo multi-moneda sin fricción, seguimiento de compras en cuotas diferidas, gestión de gastos compartidos con terceros (extensiones) y trazabilidad contable total a través de un libro diario maestro (*Ledger*). La interfaz busca la máxima simplicidad (registros en 3 segundos) manteniendo buenas prácticas de UI/UX.

---

## 2. Archivo Base de Contexto (Finances 2026 Workbook)
El proyecto toma como referencia directa la hoja de cálculo **`Finances 2026`**, compuesta por las siguientes pestañas y estructuras de origen:

1. **`CONFIG`**: Tabla paramétrica de tipos de cambio referenciales (AUD, EUR, USD, UYU, NZD), lista de bancos (`Commbank`, `N26`, `Wise`, `ANZ`, `Itaú`, `Scotiabank`), tipos de cuenta (`Everyday`, `Saver`, `Investing`, `Visa`, `Amex`), calendario de meses, personas asignadas (`Personal`, `Gladys`, `Diego`, `Ale`, `Romina`) y catálogo de categorías.
2. **`Account_Flow`**: Libro diario primario con registros de `Date`, `Moneda`, `Statement` (ciclo/cierre), `Movment` (Income/Outcome), `Import`, `Bank`, `Account`, `Categoria`, `Pagos` (seguimiento de cuotas, ej. *5 de 6*), `Persona` y `Nota`.
3. **`Expected_Account_Flow`**: Planificación de compromisos futuros y cuotas proyectadas con un indicador de verificación (`DONE: True/False`).
4. **`For_CSV_Import`**: Zona de preparación / staging para procesar y conciliar extractos bancarios descargados.
5. **`Loans`**: Tabla de amortización de préstamos (Período, Cuota, Interés, Pago, Saldo restante, Vencimiento `VTO`, Estado `Paid`).
6. **`Portfolio`**: Ficha de inversiones con tickers (`AAPL`, `TSLA`, `NFLX`, `DBK`, `XRP`, `BYD`), unidades, costo promedio, valor de mercado actual y cálculo de ganancias/pérdidas ($/\%$).
7. **`Monthly_Tracker` & `Dashboard`**: Tableros de control con cálculo de Patrimonio Neto Total, Balance Disponible, cumplimiento de Meta Anual ($59\%$) y desglose mensual por categorías.

---

## 3. Pilares de Arquitectura y Reglas de Negocio

### 3.1. Core Multi-Moneda y Cotizaciones (FX)
* **Moneda Global por Defecto (Display Currency):** Definible desde los ajustes (ej. AUD, EUR, USD). La pantalla principal convierte y consolida todo el Patrimonio Neto y Balance General en esta divisa en tiempo real. Se puede cambiar en 1 clic.
* **Saldos Nominales Reales:** En la vista de Cuentas y Bancos, los saldos se muestran en la moneda nativa de cada producto sin conversión forzada.
* **Soporte Dual en Transacciones:** Toda transacción guarda el importe original (moneda del gasto local) y el importe convertido (moneda de la cuenta impactada).
* **Tipos de Cambio (FX):** Motor de cotizaciones estructurado con `open.er-api.com` (tiempo real y tasas cruzadas fiables para UYU, AUD, NZD, EUR, USD) con fallback a Frankfurter API para cotizaciones del BCE y series históricas. Posee caché en memoria con TTL de 1 hora, paralelización con `Promise.all` y soporte para sobrescritura manual persistente (`rate_overridden: true`) por parte del usuario.

### 3.2. Estructura Jerárquica de Bancos y Productos
Institución Financiera (Banco/Broker) -> Productos:
  - Cuentas (Corriente, Ahorro, Cash)
  - Créditos (Tarjetas, Préstamos)
  - Inversiones (Portafolios/Brokers)

* **Cuenta Cash (Default):** Existe por defecto en el sistema para registrar retiros de cajero (ATM) como transferencias desde cuentas bancarias hacia efectivo.
* **Baja Lógica (Soft Deletes):** Ni instituciones ni cuentas sufren borrado físico en base de datos (`prevent_account_hard_delete`), utilizando siempre el flag `is_active = false`.

### 3.3. Tarjetas de Crédito, Cuotas y Extensiones
* **Compras en Cuotas Diferidas:** Un gasto de N pagos genera automáticamente N registros en la Base de Datos Maestra distribuidos mes a mes (1 de N, 2 de N, ...). La primera cuota se marca como `COMPLETED` y descuenta del saldo inmediatamente; las cuotas 2 a N se marcan como `PENDING` ligadas por `parent_transaction_id` y computan como compromisos diferidos/crédito sin restar saldo nominal por adelantado.
* **Gasto Asignado a Terceros (Extensiones / Personas):** Permite atribuir una compra (o sus cuotas) a un contacto (ej. Gladys). Incrementa la "Cuenta por Cobrar" de esa persona.
* **Pagos de Tarjeta:** Tratados como transferencias inter-cuenta (Disminuye saldo en cuenta bancaria, aumenta saldo disponible en la tarjeta) mediante dos filas enlazadas por `parent_transaction_id`.

### 3.4. Tabla Maestra de Transacciones (master_transactions) y Ledger Bundles
Todos los eventos de la app alimentan un *Ledger* o Libro Diario Unificado para garantizar consistencia contable, auditoría y análisis estadístico.
Las mutaciones se empaquetan en el cliente como **Ledger Bundles** atómicos e idempotentes, calculando saldos reactivos con la fórmula *Baseline + Delta* y sincronizándose de forma transparente mediante una cola *Outbox* local en IndexedDB.

---

## 4. Especificación de Pantallas y Navegación

### 4.1. Dashboard General (Home)
* Banner de Balance Disponible y Patrimonio Neto en Moneda Global.
* Indicador de sincronización en tiempo real (`SyncStatusBadge` con estados Al día, Sincronizando, Guardado local y Reintento).
* Barra de acciones rápidas (+ Gasto, ↔ Transferencia, 💳 Pago Tarjeta, ⚖️ Ajuste Express).
* Resumen de Presupuesto Mensual (Gastos Reales + Gastos Fijos Estimados vs. Ingresos Proyectados).
* Carrusel/Lista de Cuentas principales con saldo nominal.
* Feed de últimas transacciones con doble indicador de moneda y badges de cuotas.

### 4.2. Cuentas, Bancos e Instituciones
* Acordeones agrupados por Institución Financiera con totales consolidados y soporte de baja lógica (`is_active`).
* **Ficha de Detalle de Cuenta (`/accounts/[id]`):** Saldo nominal, balance disponible y compromisos diferidos/retención (para tarjetas de crédito), métricas del mes en curso, feed de transacciones filtrado y acceso directo a modales de acción:
  - **Ajuste Express de Saldo (`ExpressAdjustModal`):** Crea un movimiento automático de corrección contable (`ADJUSTMENT`) por la diferencia con el extracto bancario.
  - **Registrar Pago de Tarjeta (`RegisterCardPaymentModal`):** Precarga inteligente del saldo adeudado y genera la transferencia inter-cuenta de liquidación.
* **Inversiones:** Valor de mercado y P&L.

### 4.3. Formulario Universal de Transacciones (`/transactions/new` y `@modal`)
* Interfaz **Zero-Wait UI** (< 16ms): persistencia inmediata en memoria y cola local Outbox (IndexedDB) sin congelar la interacción esperando la red.
* Toggle Gasto | Ingreso | Transferencia.
* Selector de Producto (Cuenta / Tarjeta).
* Importe Original + Moneda del Gasto.
* Campo opcional de **Fee / Comisión**.
* Tipo de Cambio en vivo con selector de tasa y edición manual (`rate_overridden`).
* Monto Final Convertido Resultante.
* Date Picker (Fecha).
* Categoría & Descripción.
* Asignación a Persona (Por defecto: *Personal*).
* Selector de Cuotas (N Pagos — Habilitado para Tarjetas, distribuidas mes a mes).

### 4.4. Transferencias (Locales & Overseas)
* Selector de Cuenta Origen y Cuenta Destino.
* Monto Enviado + Fee opcional.
* Tipo de Cambio Aplicado.
* Monto Recibido.
* Genera 2 registros enlazados por `parent_transaction_id` en el *Ledger* (débito negativo en origen y crédito positivo en destino).

### 4.5. Personas & Cuentas por Cobrar
* Directorio de contactos (`/people`) con Saldo Pendiente Total consolidado por moneda.
* CRUD completo de contactos (`/people/new`, `/people/[id]/edit`) con baja lógica protegida (la desactivación se bloquea si la persona tiene movimientos pendientes de cobro).
* Ficha de Persona (`/people/[id]`): Deuda actual, cuotas comprometidas futuras e historial de movimientos.
* Acciones en ficha de persona:
  - **"Registrar Cobro / Liquidación"** (marca los movimientos como saldados con `settled_at`).
  - **"Notificar por WhatsApp" (`WhatsAppNotifyModal`):** Modal interactivo previo para verificar el destinatario, validar el teléfono y editar el mensaje antes de disparar el link a WhatsApp (`wa.me`).
* **Configuración de Plantilla WhatsApp (`/people/template`):** Pantalla y modal para personalizar el mensaje predeterminado con variables dinámicas (`$Nombre`, `$Total`, `$Detalle`, `$Cantidad`, `$Fecha`), previsualización en vivo (*Live Preview*) y persistencia por usuario en `user_settings`.

### 4.6. Gastos Fijos & Presupuestos (Monthly Estimates)
* Plantilla de Ingresos Proyectados y Gastos Recurrentes (Alquiler, Servicios, Suscripciones).
* Carga automática de las cuotas vigentes del mes desde la BD Maestra.
* Acción 1-Tap **"Ejecutar Pago"** para convertir la estimación en transacción real.

### 4.7. Préstamos Formales (Loans)
* Control de Préstamos Tomados (Deudas) y Otorgados.
* Tabla de Amortización Dinámica (Capital, Interés, Cuota Total, Vencimiento VTO, Estado Paid/Unpaid).
* Botón de Pago de Cuota (Desglosa capital e interés como gasto operativo en *Fees*).

### 4.8. Portafolio de Inversiones (Portfolio)
* Integración de cotizaciones y valor de mercado.
* Operaciones de **Compra (BUY)** y **Venta (SELL)** que transfieren capital hacia/desde las cuentas bancarias.
* KPIs: Valor de Mercado Total, Inversión Inicial, Ganancia/Pérdida No Realizada ($/%).
* Tabla de Activos (Tickers, Unidades, Costo Medio, Precio Actual, Rendimiento).
* Historial de Transacciones de Inversión.

### 4.9. Ajustes y Sistema (`/settings`)
* Selector de divisa global preferida (`display_currency`).
* Selector de tema visual Claro / Oscuro con persistencia en preferencias (`ThemeToggle`).
* Envío de correo para restablecimiento de contraseña (`SendResetLinkButton` y flujo `/auth/update-password`).
* Ficha de Información del Sistema (`SystemInfoCard`): versión actual de la aplicación, commit de Git, rama activa y entorno de ejecución.

---

## 5. Esquema Simplificado de Base de Datos

```sql
-- Configuración de Usuario
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_currency VARCHAR(5) NOT NULL DEFAULT 'EUR',
    theme VARCHAR(10) NOT NULL DEFAULT 'dark',
    whatsapp_template TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Instituciones y Cuentas
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL, -- checking, savings, credit_card, cash, investing
    currency VARCHAR(5) NOT NULL,
    credit_limit DECIMAL(12,2) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Personas / Contactos
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla Maestra de Transacciones (Ledger)
CREATE TABLE master_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_transaction_id UUID NULL,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL, -- INCOME, OUTCOME, TRANSFER, ADJUSTMENT
    amount_original DECIMAL(12,2) NOT NULL,
    currency_original VARCHAR(5) NOT NULL,
    fee_amount DECIMAL(12,2) DEFAULT 0,
    exchange_rate DECIMAL(12,6) DEFAULT 1,
    amount_account DECIMAL(12,2) NOT NULL,
    currency_account VARCHAR(5) NOT NULL,
    institution_id UUID NOT NULL,
    account_id UUID NOT NULL,
    category_id UUID NULL,
    person_id UUID NULL,
    installment_current INT DEFAULT 1,
    installment_total INT DEFAULT 1,
    status VARCHAR(20) NOT NULL, -- COMPLETED, PENDING
    notes TEXT NULL,
    settled_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Funciones RPC Clave (Migración 0008)
-- get_account_balances_summary(): Agregación en SQL de saldos y compromisos diferidos por cuenta.
-- commit_ledger_bundle(p_bundle_id, p_bundle_type, p_rows): Inserción atómica e idempotente de bundles.
```