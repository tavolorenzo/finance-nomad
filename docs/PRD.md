# Product Requirement Document (PRD): Personal Finance & Portfolio Manager (Backpacker & Nómada Edition)

## 1. Visión del Producto
Aplicación de finanzas personales, gestión de presupuestos, préstamos y seguimiento de inversiones orientada a usuarios con alta movilidad internacional (backpackers, nómadas digitales, expats).

El sistema está optimizado para el manejo multi-moneda sin fricción, seguimiento de compras en cuotas diferidas, gestión de gastos compartidos con terceros (extensiones) y trazabilidad contable total a través de un libro diario maestro (*Ledger*). La interfaz busca la máxima simplicidad (registros en 3 segundos) manteniendo buenas prácticas de UI/UX.

## 2. Archivo Base de Contexto (Finances 2026 Workbook)
Pestañas de origen: `CONFIG`, `Account_Flow`, `Expected_Account_Flow`, `For_CSV_Import`, `Loans`, `Portfolio`, `Monthly_Tracker`, `Dashboard`.

## 3. Pilares de Arquitectura y Reglas de Negocio

### 3.1 Core Multi-Moneda y Cotizaciones (FX)
- Moneda Global por Defecto configurable, conversión en tiempo real.
- Saldos nominales reales por producto, sin conversión forzada en la vista de Cuentas.
- Toda transacción guarda amount_original + amount_account.
- Tipo de cambio con fuente API + override manual persistente.

### 3.2 Estructura Jerárquica
Institución -> Cuentas / Créditos / Inversiones. Cuenta Cash por defecto.

### 3.3 Tarjetas, Cuotas y Extensiones
- N cuotas generan N registros ligados, distribuidos mes a mes.
- Gasto asignado a persona incrementa cuenta por cobrar sin alterar deuda con el banco.
- Pagos de tarjeta = transferencias inter-cuenta.

### 3.4 Ledger unificado
`master_transactions` es la fuente de verdad para todo cálculo derivado (dashboard, presupuesto, reportes).

## 4. Pantallas (ver docs/design-system.md sección 6 para el mapeo mobile/web)
Dashboard, Cuentas y Bancos, Formulario Universal de Transacciones, Transferencias, Personas, Gastos Fijos, Préstamos, Portafolio.

## 5. Esquema de referencia
Ver `supabase/migrations/0001_init_schema.sql` — implementación real del esquema descripto acá, extendido con tablas de soporte (institutions, accounts, categories, people) necesarias para las foreign keys.
