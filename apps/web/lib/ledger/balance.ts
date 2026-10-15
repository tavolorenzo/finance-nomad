import type { MasterTransaction } from '../types'
import type { AccountBalance, LedgerBundle } from './types'

// Calcula el delta contable de una fila sobre el saldo nominal de la cuenta
// Solo las filas con status 'COMPLETED' impactan el saldo nominal.
export function calculateRowDelta(row: MasterTransaction): number {
  if (row.status !== 'COMPLETED') return 0

  const amt = Number(row.amount_account)
  if (row.type === 'OUTCOME') {
    return -Math.abs(amt)
  }
  if (row.type === 'INCOME') {
    return Math.abs(amt)
  }
  // En TRANSFER y ADJUSTMENT, amount_account ya contiene el signo correspondiente
  return amt
}

// Aplica el delta de un LedgerBundle sobre una lista de balances en memoria
export function applyBundleDelta(
  currentBalances: AccountBalance[],
  bundle: LedgerBundle
): AccountBalance[] {
  const map = new Map<string, AccountBalance>()
  for (const b of currentBalances) {
    map.set(b.accountId, { ...b })
  }

  for (const row of bundle.rows) {
    // En bundles de liquidación (SETTLEMENT), las filas OUTCOME son deudas preexistentes que solo se amortizan.
    // Solo las filas nuevas (INCOME) representan entrada de fondos a la cuenta receptora.
    if (bundle.type === 'SETTLEMENT' && row.type !== 'INCOME') {
      continue
    }

    const delta = calculateRowDelta(row)
    if (delta === 0) continue

    const existing = map.get(row.account_id)
    if (existing) {
      existing.balance = Math.round((existing.balance + delta) * 100) / 100
    } else {
      map.set(row.account_id, {
        accountId: row.account_id,
        currency: row.currency_account,
        balance: Math.round(delta * 100) / 100
      })
    }
  }

  return Array.from(map.values())
}

// Calcula el monto retenido o compromiso diferido acumulado por filas PENDING en una cuenta
export function calculatePendingDelta(bundle: LedgerBundle, accountId: string): number {
  let pending = 0
  for (const row of bundle.rows) {
    if (row.account_id === accountId && row.status === 'PENDING') {
      pending += Math.abs(Number(row.amount_account))
    }
  }
  return Math.round(pending * 100) / 100
}

// Reversa el impacto contable de una fila eliminada (invierte su delta)
export function revertRowDelta(row: MasterTransaction): number {
  return -calculateRowDelta(row)
}

// Aplica la reversión de una o más filas eliminadas sobre los balances en memoria
export function applyDeletionDelta(
  currentBalances: AccountBalance[],
  deletedRows: MasterTransaction[]
): AccountBalance[] {
  const map = new Map<string, AccountBalance>()
  for (const b of currentBalances) {
    map.set(b.accountId, { ...b })
  }

  for (const row of deletedRows) {
    const reversal = revertRowDelta(row)
    if (reversal === 0) continue

    const existing = map.get(row.account_id)
    if (existing) {
      existing.balance = Math.round((existing.balance + reversal) * 100) / 100
    }
  }

  return Array.from(map.values())
}

// Aplica la confirmación de una fila (de PENDING a COMPLETED) sobre los balances en memoria
export function applyConfirmationDelta(
  currentBalances: AccountBalance[],
  row: MasterTransaction
): AccountBalance[] {
  const map = new Map<string, AccountBalance>()
  for (const b of currentBalances) {
    map.set(b.accountId, { ...b })
  }

  const completedRow: MasterTransaction = { ...row, status: 'COMPLETED' }
  const delta = calculateRowDelta(completedRow)
  if (delta === 0) return currentBalances

  const existing = map.get(row.account_id)
  if (existing) {
    existing.balance = Math.round((existing.balance + delta) * 100) / 100
  } else {
    map.set(row.account_id, {
      accountId: row.account_id,
      currency: row.currency_account,
      balance: Math.round(delta * 100) / 100
    })
  }

  return Array.from(map.values())
}
