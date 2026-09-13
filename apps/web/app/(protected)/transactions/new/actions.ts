'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateAccountAmount, splitInstallments, getRate } from '@/lib/fx'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function fetchExchangeRate(from: string, to: string, date?: string): Promise<number> {
  const targetDate = date || new Date().toISOString().slice(0, 10)
  return getRate(targetDate, from, to)
}

export interface NewTransactionInput {
  type: 'INCOME' | 'OUTCOME'
  amountOriginal: number
  currencyOriginal: string
  feeAmount: number
  exchangeRate: number
  rateOverridden: boolean
  currencyAccount: string
  date: string
  institutionId: string
  accountId: string
  categoryId: string | null
  personId: string | null
  installmentTotal: number
  notes: string | null
}

export async function createTransaction(input: NewTransactionInput) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const totalAccountAmount = calculateAccountAmount(
    input.amountOriginal,
    input.feeAmount,
    input.exchangeRate
  )

  const installmentTotal = Math.max(1, input.installmentTotal)
  const amounts =
    installmentTotal === 1
      ? [totalAccountAmount]
      : splitInstallments(totalAccountAmount, installmentTotal)

  const rows = amounts.map((amount, i) => {
    const installmentDate = new Date(input.date)
    installmentDate.setMonth(installmentDate.getMonth() + i)

    return {
      user_id: user.id,
      date: installmentDate.toISOString().slice(0, 10),
      type: input.type,
      amount_original: installmentTotal === 1 ? input.amountOriginal : amount,
      currency_original: input.currencyOriginal,
      fee_amount: i === 0 ? input.feeAmount : 0,
      exchange_rate: input.exchangeRate,
      rate_overridden: input.rateOverridden,
      amount_account: amount,
      currency_account: input.currencyAccount,
      institution_id: input.institutionId,
      account_id: input.accountId,
      category_id: input.categoryId,
      person_id: input.personId,
      installment_current: i + 1,
      installment_total: installmentTotal,
      status: 'COMPLETED' as const,
      notes: input.notes
    }
  })

  // Un solo INSERT con todas las filas -> una sola sentencia SQL, atómica.
  const { error } = await supabase.from('master_transactions').insert(rows)
  if (error) throw new Error(error.message)

  redirect('/dashboard')
}

export interface TransferTransactionInput {
  fromAccountId: string
  toAccountId: string
  amountOriginal: number
  currencyOriginal: string
  amountFrom?: number
  amountTo?: number
  feeAmount?: number
  exchangeRate: number
  rateOverridden?: boolean
  date: string
  notes?: string | null
  shouldRedirect?: boolean
}

// "Transferencias inter-cuenta y Pago de tarjeta" (PRD §3.1, §3.3):
// Genera 2 filas contables complementarias ligadas por parent_transaction_id.
// Fila 1 (Origen): amount_account negativo (débito) en fromAccount.currency_native.
// Fila 2 (Destino): amount_account positivo (crédito) en toAccount.currency_native.
export async function createTransferTransaction(input: TransferTransactionInput) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  if (input.fromAccountId === input.toAccountId) {
    throw new Error('La cuenta de origen y destino deben ser distintas.')
  }
  if (input.amountOriginal <= 0) {
    throw new Error('El monto debe ser mayor a cero.')
  }

  const { data: accounts, error: accError } = await supabase
    .from('accounts')
    .select('id, name, type, currency_native, institution_id, is_active')
    .in('id', [input.fromAccountId, input.toAccountId])
    .eq('user_id', user.id)

  if (accError || !accounts || accounts.length < 2) {
    throw new Error('No se encontraron las cuentas seleccionadas.')
  }

  const fromAccount = accounts.find((a) => a.id === input.fromAccountId)
  const toAccount = accounts.find((a) => a.id === input.toAccountId)

  if (!fromAccount || !toAccount) {
    throw new Error('Cuentas no válidas.')
  }
  if (!fromAccount.is_active || !toAccount.is_active) {
    throw new Error('Ambas cuentas deben estar activas para realizar una transferencia.')
  }

  const fromCurrency = fromAccount.currency_native
  const toCurrency = toAccount.currency_native
  const feeAmount = input.feeAmount ?? 0
  const rate = input.exchangeRate > 0 ? input.exchangeRate : 1

  // Cálculo de montos en sus respectivas divisas
  let amountFromAccount: number
  let amountToAccount: number

  if (input.amountFrom !== undefined && input.amountTo !== undefined) {
    amountFromAccount = Math.abs(input.amountFrom)
    amountToAccount = Math.abs(input.amountTo)
  } else if (input.currencyOriginal === toCurrency && fromCurrency !== toCurrency) {
    // Si se especificó el monto a recibir en destino (ej: pago de tarjeta en UYU cancelado con EUR)
    // toAmount es el monto indicado en destino
    amountToAccount = input.amountOriginal
    // fromAmount es el equivalente en la moneda de origen al cambio más comisiones
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

  // Fila 1: Origen (débito en la moneda de la cuenta emisora)
  const { data: sourceRow, error: sourceError } = await supabase
    .from('master_transactions')
    .insert({
      user_id: user.id,
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
      notes: sourceNotes
    })
    .select('id')
    .single()

  if (sourceError || !sourceRow) {
    throw new Error('No se pudo registrar la salida de fondos: ' + (sourceError?.message || 'Error desconocido'))
  }

  // Fila 2: Destino (crédito en la moneda de la cuenta receptora, ligada por parent_transaction_id)
  const { error: destError } = await supabase.from('master_transactions').insert({
    user_id: user.id,
    parent_transaction_id: sourceRow.id,
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
    notes: destNotes
  })

  if (destError) {
    // Revertir fila de origen para mantener atomicidad contable
    await supabase.from('master_transactions').delete().eq('id', sourceRow.id)
    throw new Error('No se pudo registrar la acreditación de fondos: ' + destError.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  revalidatePath(`/accounts/${fromAccount.id}`)
  revalidatePath(`/accounts/${toAccount.id}`)
  revalidatePath('/transactions')

  if (input.shouldRedirect !== false) {
    redirect('/dashboard')
  }

  return { success: true, transferId: sourceRow.id }
}

// Permite eliminar una transacción del ledger (si es transferencia ligada, elimina ambas filas)
export async function deleteTransaction(transactionId: string) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { data: tx } = await supabase
    .from('master_transactions')
    .select('id, parent_transaction_id, account_id')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single()

  if (!tx) throw new Error('Transacción no encontrada')

  // Si tiene parent_transaction_id (es la fila hija de una transferencia), borramos el padre
  // y por ON DELETE CASCADE en la BD se borra la hija también.
  if (tx.parent_transaction_id) {
    await supabase.from('master_transactions').delete().eq('id', tx.parent_transaction_id).eq('user_id', user.id)
  }
  // Borramos la fila principal (si es padre de otra, borra a la hija automáticamente)
  await supabase.from('master_transactions').delete().eq('id', tx.id).eq('user_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  revalidatePath('/transactions')
  if (tx.account_id) {
    revalidatePath(`/accounts/${tx.account_id}`)
  }

  return { success: true }
}

