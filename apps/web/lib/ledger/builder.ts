import { calculateAccountAmount, splitInstallments } from '../fx'
import type { MasterTransaction } from '../types'
import type {
  BuildTransactionInput,
  BuildTransferInput,
  LedgerBundle
} from './types'

// Calcula la fecha de una cuota de manera segura evitando corrimientos por zona horaria
export function calculateInstallmentDate(baseDateStr: string, monthOffset: number): string {
  if (monthOffset === 0) return baseDateStr
  const [y, m, d] = baseDateStr.split('-').map(Number)
  const totalMonths = m - 1 + monthOffset
  const targetYear = y + Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate()
  const targetDay = Math.min(d, daysInTargetMonth)
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

// Construye un LedgerBundle atómico para transacciones de tipo Gasto, Ingreso o Ajuste
export function buildTransactionBundle(input: BuildTransactionInput): LedgerBundle {
  const today = input.today || new Date().toISOString().slice(0, 10)
  const fee = input.feeAmount ?? 0
  const rate = input.exchangeRate && input.exchangeRate > 0 ? input.exchangeRate : 1

  const totalAccountAmount =
    input.amountAccount !== undefined
      ? input.amountAccount
      : calculateAccountAmount(input.amountOriginal, fee, rate)

  const installmentTotal = Math.max(1, input.installmentTotal ?? 1)
  const installmentCurrent = Math.min(installmentTotal, Math.max(1, input.installmentCurrent ?? 1))

  let accountAmounts: number[]
  let originalAmounts: number[]

  if (installmentCurrent > 1) {
    // Si arranca en una cuota intermedia (ej. 4 de 12), amountOriginal ya representa el valor de la cuota
    const remainingCount = installmentTotal - installmentCurrent + 1
    originalAmounts = Array(remainingCount).fill(input.amountOriginal)
    accountAmounts = Array(remainingCount).fill(totalAccountAmount)
  } else {
    accountAmounts =
      installmentTotal === 1
        ? [totalAccountAmount]
        : splitInstallments(totalAccountAmount, installmentTotal)
    originalAmounts =
      installmentTotal === 1
        ? [input.amountOriginal]
        : splitInstallments(input.amountOriginal, installmentTotal)
  }

  const parentId = crypto.randomUUID()
  const parentDate = calculateInstallmentDate(input.date, 0)
  const parentStatus = parentDate <= today ? ('COMPLETED' as const) : ('PENDING' as const)

  const parentRow: MasterTransaction = {
    id: parentId,
    parent_transaction_id: null,
    date: parentDate,
    type: input.type,
    amount_original: originalAmounts[0],
    currency_original: input.currencyOriginal,
    fee_amount: fee,
    exchange_rate: rate,
    rate_overridden: input.rateOverridden ?? false,
    amount_account: accountAmounts[0],
    currency_account: input.currencyAccount,
    institution_id: input.institutionId,
    account_id: input.accountId,
    category_id: input.categoryId ?? null,
    person_id: input.personId ?? null,
    installment_current: installmentCurrent,
    installment_total: installmentTotal,
    status: parentStatus,
    notes: input.notes?.trim() || null,
    settled_at: null
  }

  const childRows: MasterTransaction[] = []
  const countToGenerate = installmentTotal - installmentCurrent
  for (let i = 1; i <= countToGenerate; i++) {
    const instDate = calculateInstallmentDate(input.date, i)
    childRows.push({
      id: crypto.randomUUID(),
      parent_transaction_id: parentId,
      date: instDate,
      type: input.type,
      amount_original: originalAmounts[i],
      currency_original: input.currencyOriginal,
      fee_amount: 0,
      exchange_rate: rate,
      rate_overridden: input.rateOverridden ?? false,
      amount_account: accountAmounts[i],
      currency_account: input.currencyAccount,
      institution_id: input.institutionId,
      account_id: input.accountId,
      category_id: input.categoryId ?? null,
      person_id: input.personId ?? null,
      installment_current: installmentCurrent + i,
      installment_total: installmentTotal,
      status: 'PENDING',
      notes: input.notes?.trim() || null,
      settled_at: null
    })
  }

  const rows = [parentRow, ...childRows]
  return {
    id: parentId,
    type: input.type === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'TRANSACTION',
    createdAt: new Date().toISOString(),
    rateFetchedAt: input.rateFetchedAt ?? new Date().toISOString(),
    description: input.notes?.trim() || `${input.type === 'INCOME' ? 'Ingreso' : 'Gasto'} (${input.currencyOriginal} ${input.amountOriginal})`,
    rows
  }
}

// Construye un LedgerBundle atómico para transferencias y pagos de tarjeta (2 filas ligadas)
export function buildTransferBundle(input: BuildTransferInput): LedgerBundle {
  const { fromAccount, toAccount } = input
  if (fromAccount.id === toAccount.id) {
    throw new Error('La cuenta de origen y destino deben ser distintas.')
  }
  if (input.amountOriginal <= 0) {
    throw new Error('El monto debe ser mayor a cero.')
  }

  const fromCurrency = fromAccount.currency_native
  const toCurrency = toAccount.currency_native
  const feeAmount = input.feeAmount ?? 0
  const rate = input.exchangeRate && input.exchangeRate > 0 ? input.exchangeRate : 1

  let amountFromAccount: number
  let amountToAccount: number

  if (input.amountFrom !== undefined && input.amountTo !== undefined) {
    amountFromAccount = Math.abs(input.amountFrom)
    amountToAccount = Math.abs(input.amountTo)
  } else if (input.currencyOriginal === toCurrency && fromCurrency !== toCurrency) {
    // Si se especificó el monto a recibir en destino (ej: pago de tarjeta en UYU con EUR)
    amountToAccount = input.amountOriginal
    const baseFrom = input.amountOriginal / rate
    amountFromAccount = Math.round((baseFrom + feeAmount) * 100) / 100
  } else {
    // Caso estándar: monto especificado en moneda de origen
    amountFromAccount = Math.round((input.amountOriginal + feeAmount) * 100) / 100
    const net = Math.max(0, input.amountOriginal - feeAmount)
    amountToAccount = Math.round(net * rate * 100) / 100
  }

  const isCreditCardPayment = toAccount.type === 'credit_card'
  const sourceNotes =
    input.notes?.trim() ||
    (isCreditCardPayment
      ? `Pago de tarjeta ${toAccount.name}`
      : `Transferencia a ${toAccount.name}`)

  const destNotes =
    input.notes?.trim() ||
    (isCreditCardPayment
      ? `Pago recibido desde ${fromAccount.name}`
      : `Transferencia desde ${fromAccount.name}`)

  const sourceId = crypto.randomUUID()
  const destId = crypto.randomUUID()

  // Fila 1: Origen (débito negativo)
  const sourceRow: MasterTransaction = {
    id: sourceId,
    parent_transaction_id: null,
    date: input.date,
    type: 'TRANSFER',
    amount_original: input.amountOriginal,
    currency_original: input.currencyOriginal,
    fee_amount: feeAmount,
    exchange_rate: rate,
    rate_overridden: input.rateOverridden ?? false,
    amount_account: -Math.abs(amountFromAccount),
    currency_account: fromCurrency,
    institution_id: fromAccount.institution_id,
    account_id: fromAccount.id,
    category_id: null,
    person_id: null,
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    notes: sourceNotes,
    settled_at: null
  }

  // Fila 2: Destino (crédito positivo, ligada por parent_transaction_id)
  const destRow: MasterTransaction = {
    id: destId,
    parent_transaction_id: sourceId,
    date: input.date,
    type: 'TRANSFER',
    amount_original: input.amountOriginal,
    currency_original: input.currencyOriginal,
    fee_amount: 0,
    exchange_rate: rate,
    rate_overridden: input.rateOverridden ?? false,
    amount_account: Math.abs(amountToAccount),
    currency_account: toCurrency,
    institution_id: toAccount.institution_id,
    account_id: toAccount.id,
    category_id: null,
    person_id: null,
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    notes: destNotes,
    settled_at: null
  }

  return {
    id: sourceId,
    type: 'TRANSFER',
    createdAt: new Date().toISOString(),
    rateFetchedAt: input.rateFetchedAt ?? new Date().toISOString(),
    description: sourceNotes,
    rows: [sourceRow, destRow]
  }
}
