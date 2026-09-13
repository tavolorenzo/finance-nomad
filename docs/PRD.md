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
* **Tipos de Cambio (FX):** Integración con Google Finance API para obtener cotizaciones históricas según la fecha del gasto, con opción de sobrescritura manual por parte del usuario.

### 3.2. Estructura Jerárquica de Bancos y Productos
Institución Financiera (Banco/Broker) -> Productos:
  - Cuentas (Corriente, Ahorro, Cash)
  - Créditos (Tarjetas, Préstamos)
  - Inversiones (Portafolios/Brokers)

* **Cuenta Cash (Default):** Existe por defecto en el sistema para registrar retiros de cajero (ATM) como transferencias desde cuentas bancarias hacia efectivo.

### 3.3. Tarjetas de Crédito, Cuotas y Extensiones
* **Compras en Cuotas Diferidas:** Un gasto de N pagos genera automáticamente N registros en la Base de Datos Maestra distribuida mes a mes (1 de N, 2 de N, ...).
* **Gasto Asignado a Terceros (Extensiones / Personas):** Permite atribuir una compra (o sus cuotas) a un contacto (ej. Gladys). Incrementa la "Cuenta por Cobrar" de esa persona sin alterar el saldo deudor total ante el banco.
* **Pagos de Tarjeta:** Tratados como transferencias inter-cuenta (Disminuye saldo en cuenta bancaria, aumenta saldo disponible en la tarjeta).

### 3.4. Tabla Maestra de Transacciones (master_transactions)
Todos los eventos de la app alimentan un *Ledger* o Libro Diario Unificado para garantizar consistencia contable, auditoría y análisis estadístico.

---

## 4. Especificación de Pantallas y Navegación

### 4.1. Dashboard General (Home)
* Banner de Balance Disponible y Patrimonio Neto en Moneda Global.
* Barra de acciones rápidas (+ Gasto, ↔ Transferencia, 💳 Pago Tarjeta, ⚖️ Ajuste Express).
* Resumen de Presupuesto Mensual (Gastos Reales + Gastos Fijos Estimados vs. Ingresos Proyectados).
* Carrusel/Lista de Cuentas principales con saldo nominal.
* Feed de últimas transacciones con doble indicador de moneda.

### 4.2. Cuentas, Bancos e Instituciones
* Acordeones agrupados por Institución Financiera.
* **Cuentas (Débito/Efectivo/Cash):** Saldo real nominal + Botón de **"Ajuste Express de Saldo"** (crea un movimiento automático de corrección por la diferencia con el Homebanking).
* **Crédito (Tarjetas/Préstamos):** Saldo deudor, Límite de Crédito, **Disponible Estimado** + Botón **"Registrar Pago"** (precargado inteligente).
* **Inversiones:** Valor de mercado y P&L.

### 4.3. Formulario Universal de Transacciones (Modal / Input Screen)
* Toggle Gasto | Ingreso.
* Selector de Producto (Cuenta / Tarjeta).
* Importe Original + Moneda del Gasto.
* Campo opcional de **Fee / Comisión**.
* Tipo de Cambio (API + Edición Manual).
* Monto Final Convertido Resultante.
* Date Picker (Fecha).
* Categoría & Descripción.
* Asignación a Persona (Por defecto: *Personal*).
* Selector de Cuotas (N Pagos — Habilitado para Tarjetas).

### 4.4. Transferencias (Locales & Overseas)
* Selector de Cuenta Origen y Cuenta Destino.
* Monto Enviado + Fee opcional.
* Tipo de Cambio Aplicado.
* Monto Recibido.
* Genera 2 registros enlazados por `parent_transaction_id` en el *Ledger*.

### 4.5. Personas & Cuentas por Cobrar
* Directorio de contactos con Saldo Pendiente Total.
* Ficha de Persona: Deuda actual, cuotas comprometidas futuras e historial de movimientos.
* Acciones: **"Registrar Cobro / Liquidación"** y **"Notificar por WhatsApp"** (envío de desglose).

### 4.6. Gastos Fijos & Presupuestos (Monthly Estimates)
* Plantilla de Ingresos Proyectados y Gastos Recurrentes (Alquiler, Servicios, Suscripciones).
* Carga automática de las cuotas vigentes del mes desde la BD Maestra.
* Acción 1-Tap **"Ejecutar Pago"** para convertir la estimación en transacción real.

### 4.7. Préstamos Formales (Loans)
* Control de Préstamos Tomados (Deudas) y Otorgados.
* Tabla de Amortización Dinámica (Capital, Interés, Cuota Total, Vencimiento VTO, Estado Paid/Unpaid).
* Botón de Pago de Cuota (Desglosa capital e interés como gasto operativo en *Fees*).

### 4.8. Portafolio de Inversiones (Portfolio)
* Integración con Google Finance API.
* Operaciones de **Compra (BUY)** y **Venta (SELL)** que transfieren capital hacia/desde las cuentas bancarias.
* KPIs: Valor de Mercado Total, Inversión Inicial, Ganancia/Pérdida No Realizada ($/%).
* Tabla de Activos (Tickers, Unidades, Costo Medio, Precio Actual, Rendimiento).
* Historial de Transacciones de Inversión.

---

## 5. Esquema Simplificado de Base de Datos

```sql
-- Tabla Maestra de Transacciones (Ledger)
CREATE TABLE master_transactions (
    id UUID PRIMARY KEY,
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
    notes TEXT NULL
);

-- Tabla de Estimaciones / Gastos Fijos
CREATE TABLE budget_estimates (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- INCOME_ESTIMATE, EXPENSE_ESTIMATE
    estimated_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(5) NOT NULL,
    category_id UUID NOT NULL,
    due_day INT CHECK (due_day BETWEEN 1 AND 31),
    preferred_account_id UUID NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabla de Inversiones
CREATE TABLE portfolio_transactions (
    id UUID PRIMARY KEY,
    portfolio_product_id UUID NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL, -- BUY, SELL
    units DECIMAL(12,4) NOT NULL,
    price_per_unit DECIMAL(12,2) NOT NULL,
    fee_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(5) NOT NULL,
    funding_account_id UUID NOT NULL,
    date DATE NOT NULL
);