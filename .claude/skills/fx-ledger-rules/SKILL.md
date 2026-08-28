---
name: fx-ledger-rules
description: Usar siempre que se toque apps/web/lib/fx, lib/currency.ts, o cualquier hook/función que calcule montos, cuotas o transferencias. Disparadores — conversión de moneda, generación de cuotas, cálculo de patrimonio neto.
---

Ver docs/PRD.md sección 3 para el detalle completo. Reglas críticas:

- amount_account = (amount_original - fee_amount) * exchange_rate
- Cuotas: generar installment_total filas en una sola transacción SQL,
  cada una con installment_current incremental y date corrida un mes.
  La suma de las N filas debe igualar el monto total exacto (ajustar el
  redondeo en la última cuota, no distribuirlo parejo si no divide exacto).
- rate_overridden = true una vez que el usuario edita el tipo de cambio a
  mano — no se vuelve a pisar aunque cambie la fecha del formulario.
- Transferencias generan 2 filas ligadas por parent_transaction_id, signos
  opuestos, cada una en la moneda de su propia cuenta.
