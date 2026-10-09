---
name: fx-ledger-rules
description: Usar siempre que se toque apps/web/lib/fx, lib/currency.ts, o cualquier hook/función que calcule montos, cuotas o transferencias. Disparadores — conversión de moneda, generación de cuotas, cálculo de patrimonio neto.
---

Ver docs/PRD.md sección 3 y docs/architecture.md para el detalle completo. Reglas críticas:

- amount_account = (amount_original - fee_amount) * exchange_rate
- Ledger Bundles: Toda mutación contable se genera en el cliente como un LedgerBundle atómico con UUIDs determinísticos (crypto.randomUUID()).
- Cuotas: Generar installment_total filas ligadas por parent_transaction_id:
  - Cuota 1: status = 'COMPLETED' (afecta el saldo disponible de inmediato).
  - Cuotas 2..N: status = 'PENDING' (no restan saldo nominal disponible; se computan como compromisos diferidos/retención de crédito).
  - La suma de las N cuotas debe igualar el total exacto (centavos residuales ajustados en la última cuota).
- Saldos (Baseline + Delta): Solo las filas COMPLETED con fecha <= hoy impactan el saldo nominal disponible. No descargar historiales completos; usar agregación en SQL más deltas en memoria.
- Transferencias: Generan 2 filas atómicas ligadas por parent_transaction_id con signos opuestos, debitando en moneda de cuenta origen y acreditando en moneda de cuenta destino.
- rate_overridden = true una vez que el usuario edita el tipo de cambio a mano — no se vuelve a pisar automáticamente.

