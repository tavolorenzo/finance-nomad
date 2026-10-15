'use server'

import { createClient } from '@/lib/supabase/server'
import { getRate } from '@/lib/fx'
import { revalidatePath } from 'next/cache'

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


