'use server'

import { createClient } from '@/lib/supabase/server'
import { getRate } from '@/lib/fx'
import { revalidatePath } from 'next/cache'
import type { UpdateTransactionInput } from '@/lib/ledger/types'

export async function fetchExchangeRate(from: string, to: string, date?: string): Promise<number> {
  const targetDate = date || new Date().toISOString().slice(0, 10)
  return getRate(targetDate, from, to)
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

// Permite confirmar una cuota diferida o movimiento pendiente cuando llega su ciclo
export async function confirmTransaction(transactionId: string) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { data: tx, error: fetchErr } = await supabase
    .from('master_transactions')
    .select('id, account_id, status')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !tx) throw new Error('Transacción no encontrada')

  const { error: updateErr } = await supabase
    .from('master_transactions')
    .update({ status: 'COMPLETED' })
    .eq('id', transactionId)
    .eq('user_id', user.id)

  if (updateErr) throw new Error('No se pudo confirmar la transacción: ' + updateErr.message)

  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  revalidatePath('/transactions')
  if (tx.account_id) {
    revalidatePath(`/accounts/${tx.account_id}`)
  }

  return { success: true }
}

// Permite actualizar una transacción existente (categoría, persona, notas, fecha y/o monto)
export async function updateTransaction(input: UpdateTransactionInput) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { data: tx, error: fetchErr } = await supabase
    .from('master_transactions')
    .select(
      'id, parent_transaction_id, account_id, type, installment_total, amount_original, amount_account, currency_original, currency_account'
    )
    .eq('id', input.transactionId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !tx) {
    throw new Error('Transacción no encontrada')
  }

  const updatePayload: Record<string, unknown> = {}

  if (input.categoryId !== undefined) {
    updatePayload.category_id = input.categoryId || null
  }
  if (input.personId !== undefined) {
    updatePayload.person_id = input.personId || null
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes?.trim() || null
  }
  if (input.date !== undefined && input.date.trim()) {
    updatePayload.date = input.date.trim()
  }

  // Solo permitir edición de montos en movimientos simples (1 cuota, no transferencias)
  if (
    tx.type !== 'TRANSFER' &&
    (tx.installment_total ?? 1) <= 1 &&
    typeof input.amountOriginal === 'number' &&
    input.amountOriginal > 0 &&
    typeof input.amountAccount === 'number' &&
    input.amountAccount > 0
  ) {
    const sign = tx.type === 'ADJUSTMENT' && Number(tx.amount_account) < 0 ? -1 : 1
    const orig = Math.abs(input.amountOriginal)
    const acc = Math.abs(input.amountAccount)
    const rate = orig > 0 ? Math.round((acc / orig) * 1000000) / 1000000 : 1

    updatePayload.amount_original = tx.type === 'ADJUSTMENT' ? orig * sign : orig
    updatePayload.amount_account = tx.type === 'ADJUSTMENT' ? acc * sign : acc
    updatePayload.exchange_rate = rate
    if (input.currencyOriginal) {
      updatePayload.currency_original = input.currencyOriginal
    }
  }

  const { error: updateErr } = await supabase
    .from('master_transactions')
    .update(updatePayload)
    .eq('id', tx.id)
    .eq('user_id', user.id)

  if (updateErr) {
    throw new Error('No se pudo actualizar el movimiento: ' + updateErr.message)
  }

  // Propagación opcional a todas las cuotas hermanas del plan (categoría, nota y persona no liquidada)
  if (input.propagateToInstallments && (tx.installment_total ?? 1) > 1) {
    const rootId = tx.parent_transaction_id || tx.id
    const planPayload: Record<string, unknown> = {}
    if (input.categoryId !== undefined) {
      planPayload.category_id = input.categoryId || null
    }
    if (input.notes !== undefined) {
      planPayload.notes = input.notes?.trim() || null
    }
    if (input.personId !== undefined) {
      planPayload.person_id = input.personId || null
    }

    if (Object.keys(planPayload).length > 0) {
      await supabase
        .from('master_transactions')
        .update(planPayload)
        .eq('user_id', user.id)
        .is('settled_at', null)
        .or(`id.eq.${rootId},parent_transaction_id.eq.${rootId}`)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  revalidatePath('/transactions')
  revalidatePath('/budget')
  revalidatePath('/analytics')
  revalidatePath('/people')
  if (tx.account_id) {
    revalidatePath(`/accounts/${tx.account_id}`)
  }

  return { success: true }
}


