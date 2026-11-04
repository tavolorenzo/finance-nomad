import type { MasterTransaction } from '../types'
import type { BuildPersonSettlementInput, LedgerBundle } from './types'
import { calculateAccountAmount } from '../fx'

export interface AllocationResult {
  caseType: 'A' | 'B' | 'C'
  /** Deuda perteneciente estrictamente al período contable seleccionado (=== targetPeriod) */
  periodDebt: number
  /** Deuda arrastrada de períodos anteriores al seleccionado (< targetPeriod) */
  previousDebt: number
  /** Deuda exigible acumulada hasta el período seleccionado inclusive (<= targetPeriod) */
  currentDebt: number
  /** Deuda diferida en períodos posteriores al seleccionado (> targetPeriod) */
  futureDebt: number
  totalDebt: number
  remainingDebtAfter: number
  excessToFuture: number
  updatedTransactions: MasterTransaction[]
  fullySettledIds: string[]
  partiallySettledId: string | null
}

/**
 * Resuelve el período contable efectivo (YYYY-MM) de un movimiento:
 * - Si tiene `accounting_period` válido (`YYYY-MM`), usa ese valor.
 * - Si no tiene `accounting_period` (anterior o no registrado), asume el mes de la fecha del gasto (`date.slice(0, 7)`).
 */
export function resolveEffectiveAccountingPeriod(
  t: Pick<MasterTransaction, 'accounting_period' | 'date'>
): string {
  const raw = t.accounting_period?.trim()
  if (raw && /^\d{4}-\d{2}/.test(raw)) {
    return raw.slice(0, 7)
  }
  return t.date.slice(0, 7)
}

/**
 * Determina si un movimiento pertenece exactamente al período contable indicado (`YYYY-MM`).
 */
export function isDebtOfAccountingPeriod(
  t: Pick<MasterTransaction, 'accounting_period' | 'date'>,
  period: string
): boolean {
  return resolveEffectiveAccountingPeriod(t) === period.slice(0, 7)
}

/**
 * Determina si un movimiento pendiente es exigible hasta el período contable objetivo (`YYYY-MM` o fecha `YYYY-MM-DD`):
 * - Usa `resolveEffectiveAccountingPeriod(t)` (el `accounting_period` o el mes del gasto `date.slice(0, 7)`).
 * - Es exigible si su período efectivo es `<= targetPeriod`.
 */
export function isCurrentCollectibleDebt(
  t: Pick<MasterTransaction, 'accounting_period' | 'date'> &
    Partial<Pick<MasterTransaction, 'installment_total'>>,
  todayOrPeriod: string = new Date().toISOString().slice(0, 10)
): boolean {
  const targetPeriod = todayOrPeriod.slice(0, 7)
  const effectivePeriod = resolveEffectiveAccountingPeriod(t)
  return effectivePeriod <= targetPeriod
}

/**
 * Calcula la amortización de deudas pendientes de una persona aplicando FIFO.
 * - Caso A: Pago exacto del saldo exigible hasta el período seleccionado (`currentDebt` o `periodDebt`).
 * - Caso B: Pago parcial menor al saldo exigible.
 * - Caso C: Pago mayor al saldo exigible (adelanto a cuotas o períodos futuros).
 */
export function allocateSettlement(
  pendingTransactions: MasterTransaction[],
  amountToSettle: number,
  todayOrPeriod: string = new Date().toISOString().slice(0, 10),
  settleDate: string = new Date().toISOString().slice(0, 10)
): AllocationResult {
  const targetPeriod = todayOrPeriod.slice(0, 7)

  // Ordenar cronológicamente por período contable efectivo y luego por fecha (FIFO)
  const sorted = [...pendingTransactions].sort((a, b) => {
    const periodA = resolveEffectiveAccountingPeriod(a)
    const periodB = resolveEffectiveAccountingPeriod(b)
    if (periodA !== periodB) return periodA.localeCompare(periodB)
    return a.date.localeCompare(b.date)
  })

  const currentAndPast = sorted.filter((t) => isCurrentCollectibleDebt(t, targetPeriod))
  const future = sorted.filter((t) => !isCurrentCollectibleDebt(t, targetPeriod))

  function getPendingBalance(t: MasterTransaction): number {
    const settled = Number(t.settled_amount ?? 0)
    return Math.max(0, Math.round((Number(t.amount_account) - settled) * 100) / 100)
  }

  const periodDebt =
    Math.round(
      currentAndPast
        .filter((t) => resolveEffectiveAccountingPeriod(t) === targetPeriod)
        .reduce((sum, t) => sum + getPendingBalance(t), 0) * 100
    ) / 100
  const previousDebt =
    Math.round(
      currentAndPast
        .filter((t) => resolveEffectiveAccountingPeriod(t) < targetPeriod)
        .reduce((sum, t) => sum + getPendingBalance(t), 0) * 100
    ) / 100
  const currentDebt = Math.round((periodDebt + previousDebt) * 100) / 100
  const futureDebt = Math.round(future.reduce((sum, t) => sum + getPendingBalance(t), 0) * 100) / 100
  const totalDebt = Math.round((currentDebt + futureDebt) * 100) / 100

  if (amountToSettle > totalDebt + 0.009) {
    throw new Error(
      `El importe ingresado (${amountToSettle}) supera la deuda total acumulada (${totalDebt}). No se permite registrar excedentes absolutos como cobro.`
    )
  }

  let caseType: 'A' | 'B' | 'C' = 'A'
  if (Math.abs(amountToSettle - currentDebt) < 0.01) {
    caseType = 'A'
  } else if (amountToSettle < currentDebt - 0.009) {
    caseType = 'B'
  } else {
    caseType = 'C'
  }

  let remainingToApply = Math.round(amountToSettle * 100) / 100
  const updatedTransactions: MasterTransaction[] = []
  const fullySettledIds: string[] = []
  let partiallySettledId: string | null = null

  // Imputar primero al saldo actual / vencido (date <= today)
  for (const t of currentAndPast) {
    const debt = getPendingBalance(t)
    if (debt <= 0) continue

    if (remainingToApply >= debt - 0.009) {
      // Cubre completamente
      const newSettledAmount = Number(t.amount_account)
      updatedTransactions.push({
        ...t,
        settled_amount: newSettledAmount,
        settled_at: settleDate
      })
      fullySettledIds.push(t.id)
      remainingToApply = Math.max(0, Math.round((remainingToApply - debt) * 100) / 100)
    } else if (remainingToApply > 0) {
      // Cubre parcialmente
      const currentSettled = Number(t.settled_amount ?? 0)
      const newSettledAmount = Math.round((currentSettled + remainingToApply) * 100) / 100
      updatedTransactions.push({
        ...t,
        settled_amount: newSettledAmount,
        settled_at: null
      })
      partiallySettledId = t.id
      remainingToApply = 0
      break
    }
  }

  // Si sobró dinero (Caso C), amortizar cuotas futuras (date > today)
  const excessToFuture = remainingToApply
  if (remainingToApply > 0) {
    for (const t of future) {
      const debt = getPendingBalance(t)
      if (debt <= 0) continue

      if (remainingToApply >= debt - 0.009) {
        const newSettledAmount = Number(t.amount_account)
        updatedTransactions.push({
          ...t,
          settled_amount: newSettledAmount,
          settled_at: settleDate
        })
        fullySettledIds.push(t.id)
        remainingToApply = Math.max(0, Math.round((remainingToApply - debt) * 100) / 100)
      } else if (remainingToApply > 0) {
        const currentSettled = Number(t.settled_amount ?? 0)
        const newSettledAmount = Math.round((currentSettled + remainingToApply) * 100) / 100
        updatedTransactions.push({
          ...t,
          settled_amount: newSettledAmount,
          settled_at: null
        })
        partiallySettledId = t.id
        remainingToApply = 0
        break
      }
    }
  }

  const remainingDebtAfter = Math.max(0, Math.round((totalDebt - amountToSettle) * 100) / 100)

  return {
    caseType,
    periodDebt,
    previousDebt,
    currentDebt,
    futureDebt,
    totalDebt,
    remainingDebtAfter,
    excessToFuture,
    updatedTransactions,
    fullySettledIds,
    partiallySettledId
  }
}

/**
 * Construye el LedgerBundle atómico para un cobro de persona:
 * 1 Fila INCOME en la cuenta receptora + N filas amortizadas en las cuentas originales.
 */
export function buildPersonSettlementBundle(input: BuildPersonSettlementInput): {
  bundle: LedgerBundle
  allocationResult: AllocationResult
} {
  const today = input.today || new Date().toISOString().slice(0, 10)
  const rate = input.exchangeRate && input.exchangeRate > 0 ? input.exchangeRate : 1

  const totalAccountAmount =
    input.amountAccount !== undefined
      ? input.amountAccount
      : calculateAccountAmount(input.amountOriginal, 0, rate)

  // Amortizar sobre las deudas pendientes
  const allocationResult = allocateSettlement(
    input.pendingTransactions,
    input.amountOriginal,
    today,
    input.date
  )

  const parentId = crypto.randomUUID()
  const incomeRow: MasterTransaction = {
    id: parentId,
    parent_transaction_id: null,
    date: input.date,
    type: 'INCOME',
    amount_original: input.amountOriginal,
    currency_original: input.currencyOriginal,
    fee_amount: 0,
    exchange_rate: rate,
    rate_overridden: input.rateOverridden ?? false,
    amount_account: totalAccountAmount,
    currency_account: input.currencyAccount,
    institution_id: input.destinationAccount.institution_id,
    account_id: input.destinationAccount.id,
    category_id: input.categoryId ?? null,
    person_id: input.personId,
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    notes: input.notes?.trim() || `Cobro de ${input.personName}`,
    settled_at: input.date,
    settled_amount: totalAccountAmount
  }

  const bundle: LedgerBundle = {
    id: parentId,
    type: 'SETTLEMENT',
    createdAt: new Date().toISOString(),
    rateFetchedAt: input.rateFetchedAt ?? new Date().toISOString(),
    description: `Cobro de ${input.personName} (${input.currencyOriginal} ${input.amountOriginal})`,
    rows: [incomeRow, ...allocationResult.updatedTransactions]
  }

  return { bundle, allocationResult }
}
