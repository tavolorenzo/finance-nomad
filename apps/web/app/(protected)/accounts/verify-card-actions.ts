'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { revalidatePath } from 'next/cache'
import { buildTransactionBundle, calculateAccountingPeriod } from '@/lib/ledger/builder'
import { fetchExchangeRate } from '@/app/(protected)/transactions/new/actions'
import type { MasterTransaction } from '@/lib/types'

export interface VerifyStatementItemInput {
  transactionId: string
  verified: boolean
}

export async function verifyCardStatementItemAction({
  transactionId,
  verified
}: VerifyStatementItemInput) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No hay sesión activa.')

  const { data: tx, error: fetchErr } = await supabase
    .from('master_transactions')
    .select('id, account_id')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !tx) {
    throw new Error('No se encontró el movimiento a verificar.')
  }

  const { error: updateErr } = await supabase
    .from('master_transactions')
    .update({
      is_verified: verified,
      verified_at: verified ? new Date().toISOString() : null
    })
    .eq('id', transactionId)
    .eq('user_id', user.id)

  if (updateErr) {
    throw new Error('No se pudo actualizar el estado de verificación.')
  }

  revalidatePath(`/accounts/${tx.account_id}`)
  revalidatePath(`/accounts/${tx.account_id}/verify`)
  revalidatePath('/dashboard')

  return { success: true, verified }
}

export async function verifyAllStatementItemsAction({
  accountId,
  accountingPeriod,
  transactionIds
}: {
  accountId: string
  accountingPeriod: string
  transactionIds: string[]
}) {
  if (!transactionIds.length) return { success: true, count: 0 }

  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No hay sesión activa.')

  const { error } = await supabase
    .from('master_transactions')
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      accounting_period: accountingPeriod
    })
    .in('id', transactionIds)
    .eq('account_id', accountId)
    .eq('user_id', user.id)

  if (error) {
    throw new Error('No se pudieron confirmar los movimientos del resumen.')
  }

  revalidatePath(`/accounts/${accountId}`)
  revalidatePath(`/accounts/${accountId}/verify`)
  revalidatePath('/dashboard')

  return { success: true, count: transactionIds.length }
}

// Opción A: Al asignar al próximo mes un gasto en cuotas, se desplazan en cascada
// todas las cuotas desde la cuota seleccionada en adelante (+1 mes contable cada una).
export async function shiftTransactionToNextMonthAction({
  transactionId
}: {
  transactionId: string
}) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No hay sesión activa.')

  const { data: tx, error: fetchErr } = await supabase
    .from('master_transactions')
    .select('id, parent_transaction_id, account_id, date, accounting_period, installment_current, installment_total')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !tx) {
    throw new Error('No se encontró el gasto a reprogramar.')
  }

  const rootId = tx.parent_transaction_id || tx.id

  if (tx.installment_total > 1) {
    const { data: planRows, error: planErr } = await supabase
      .from('master_transactions')
      .select('id, date, accounting_period, installment_current')
      .eq('user_id', user.id)
      .or(`id.eq.${rootId},parent_transaction_id.eq.${rootId}`)
      .gte('installment_current', tx.installment_current)
      .order('installment_current', { ascending: true })

    if (planErr || !planRows || planRows.length === 0) {
      throw new Error('No se pudieron obtener las cuotas asociadas al plan.')
    }

    for (const row of planRows) {
      const currentPeriod = row.accounting_period || String(row.date).slice(0, 7)
      const nextPeriod = calculateAccountingPeriod(currentPeriod, 1)

      const { error: updErr } = await supabase
        .from('master_transactions')
        .update({
          accounting_period: nextPeriod,
          is_verified: false,
          verified_at: null
        })
        .eq('id', row.id)
        .eq('user_id', user.id)

      if (updErr) {
        throw new Error('Error al desplazar las cuotas al próximo mes.')
      }
    }

    revalidatePath(`/accounts/${tx.account_id}`)
    revalidatePath(`/accounts/${tx.account_id}/verify`)
    revalidatePath('/dashboard')
    revalidatePath('/transactions')

    return {
      success: true,
      shiftedCount: planRows.length,
      newPeriod: calculateAccountingPeriod(tx.accounting_period || String(tx.date).slice(0, 7), 1)
    }
  }

  const currentPeriod = tx.accounting_period || String(tx.date).slice(0, 7)
  const nextPeriod = calculateAccountingPeriod(currentPeriod, 1)

  const { error: singleErr } = await supabase
    .from('master_transactions')
    .update({
      accounting_period: nextPeriod,
      is_verified: false,
      verified_at: null
    })
    .eq('id', tx.id)
    .eq('user_id', user.id)

  if (singleErr) {
    throw new Error('No se pudo asignar el gasto al próximo mes.')
  }

  revalidatePath(`/accounts/${tx.account_id}`)
  revalidatePath(`/accounts/${tx.account_id}/verify`)
  revalidatePath('/dashboard')
  revalidatePath('/transactions')

  return {
    success: true,
    shiftedCount: 1,
    newPeriod: nextPeriod
  }
}

export interface AmendCardTransactionInput {
  transactionId: string
  notes: string
  date: string
  amountOriginal: number
  currencyOriginal: string
  amountAccount: number
  categoryId: string | null
  personId: string | null
}

export async function amendCardTransactionAction(input: AmendCardTransactionInput) {
  if (input.amountOriginal <= 0 || input.amountAccount <= 0) {
    throw new Error('El monto debe ser mayor a cero.')
  }

  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No hay sesión activa.')

  const { data: tx, error: fetchErr } = await supabase
    .from('master_transactions')
    .select('id, account_id, amount_original, amount_account')
    .eq('id', input.transactionId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !tx) {
    throw new Error('No se encontró el gasto a corregir.')
  }

  const rate =
    input.amountOriginal > 0
      ? Math.round((input.amountAccount / input.amountOriginal) * 1000000) / 1000000
      : 1

  const { error: updateErr } = await supabase
    .from('master_transactions')
    .update({
      notes: input.notes.trim() || null,
      date: input.date,
      amount_original: input.amountOriginal,
      currency_original: input.currencyOriginal,
      amount_account: input.amountAccount,
      exchange_rate: rate,
      category_id: input.categoryId || null,
      person_id: input.personId || null,
      is_verified: true,
      verified_at: new Date().toISOString()
    })
    .eq('id', input.transactionId)
    .eq('user_id', user.id)

  if (updateErr) {
    throw new Error('No se pudo guardar la corrección del gasto.')
  }

  revalidatePath(`/accounts/${tx.account_id}`)
  revalidatePath(`/accounts/${tx.account_id}/verify`)
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/people')

  return { success: true }
}

export interface AddMissingStatementTransactionInput {
  accountId: string
  accountingPeriod: string
  date: string
  description: string
  amountOriginal: number
  currencyOriginal: string
  amountAccount?: number
  installmentCurrent?: number
  installmentTotal?: number
  categoryId?: string | null
  personId?: string | null
}

export async function addMissingStatementTransactionAction(
  input: AddMissingStatementTransactionInput
) {
  if (input.amountOriginal <= 0 || !input.description.trim()) {
    throw new Error('Completá la descripción y un monto válido.')
  }

  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No hay sesión activa.')

  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, institution_id, currency_native, type')
    .eq('id', input.accountId)
    .eq('user_id', user.id)
    .single()

  if (accErr || !account) {
    throw new Error('No se encontró la tarjeta de crédito.')
  }

  let rate = 1
  if (input.currencyOriginal !== account.currency_native) {
    if (input.amountAccount && input.amountAccount > 0) {
      rate = Math.round((input.amountAccount / input.amountOriginal) * 1000000) / 1000000
    } else {
      try {
        rate = await fetchExchangeRate(input.currencyOriginal, account.currency_native, input.date)
      } catch {
        rate = 1
      }
    }
  }

  const bundle = buildTransactionBundle({
    type: 'OUTCOME',
    amountOriginal: input.amountOriginal,
    currencyOriginal: input.currencyOriginal,
    amountAccount: input.amountAccount,
    currencyAccount: account.currency_native,
    exchangeRate: rate,
    date: input.date,
    accountingPeriod: input.accountingPeriod,
    institutionId: account.institution_id,
    accountId: account.id,
    categoryId: input.categoryId || null,
    personId: input.personId || null,
    installmentCurrent: input.installmentCurrent ?? 1,
    installmentTotal: input.installmentTotal ?? 1,
    notes: input.description.trim()
  })

  const nowIso = new Date().toISOString()
  const rowsToInsert: (MasterTransaction & { user_id: string; verified_at?: string | null })[] =
    bundle.rows.map((row, idx) => ({
      ...row,
      user_id: user.id,
      // La primera cuota (que corresponde a este resumen que estamos auditando) nace verificada
      is_verified: idx === 0,
      verified_at: idx === 0 ? nowIso : null
    }))

  const { error: insertErr } = await supabase
    .from('master_transactions')
    .insert(rowsToInsert)

  if (insertErr) {
    throw new Error('No se pudo agregar el gasto al estado de cuenta.')
  }

  revalidatePath(`/accounts/${account.id}`)
  revalidatePath(`/accounts/${account.id}/verify`)
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/people')

  return { success: true, count: rowsToInsert.length }
}

