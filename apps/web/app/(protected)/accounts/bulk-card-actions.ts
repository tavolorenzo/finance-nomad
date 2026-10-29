'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { revalidatePath } from 'next/cache'
import { buildTransactionBundle } from '@/lib/ledger/builder'
import { fetchExchangeRate } from '@/app/(protected)/transactions/new/actions'
import type { MasterTransaction } from '@/lib/types'

export interface BulkCardMovementInput {
  date: string
  description: string
  amount: number
  currency: string
  installmentCurrent: number
  installmentTotal: number
  categoryId?: string | null
  personId?: string | null
}

export interface SaveBulkCardMovementsParams {
  accountId: string
  movements: BulkCardMovementInput[]
}

export async function saveBulkCardMovementsAction({
  accountId,
  movements
}: SaveBulkCardMovementsParams) {
  if (!accountId) {
    throw new Error('Tenés que especificar la cuenta de tarjeta de crédito.')
  }

  const validMovements = movements.filter((m) => m.amount > 0 && m.description.trim().length > 0)
  if (validMovements.length === 0) {
    return { success: true, count: 0, movementsCount: 0 }
  }

  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) {
    throw new Error('No hay sesión activa.')
  }

  // 1. Obtener la cuenta para validar propiedad e institución
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, name, type, currency_native, institution_id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (accError || !account) {
    throw new Error('No se encontró la tarjeta de crédito seleccionada.')
  }

  const allRowsToInsert: (MasterTransaction & { user_id: string })[] = []

  // 2. Construir los bundles de transacciones y cuotas
  for (const m of validMovements) {
    let rate = 1
    if (m.currency !== account.currency_native) {
      try {
        rate = await fetchExchangeRate(m.currency, account.currency_native, m.date)
      } catch {
        rate = 1
      }
    }

    const bundle = buildTransactionBundle({
      type: 'OUTCOME',
      amountOriginal: m.amount,
      currencyOriginal: m.currency,
      currencyAccount: account.currency_native,
      exchangeRate: rate,
      date: m.date,
      institutionId: account.institution_id,
      accountId: account.id,
      categoryId: m.categoryId || null,
      personId: m.personId || null,
      installmentCurrent: m.installmentCurrent,
      installmentTotal: m.installmentTotal,
      notes: m.description.trim() || null
    })

    for (const row of bundle.rows) {
      allRowsToInsert.push({
        ...row,
        user_id: user.id
      })
    }
  }

  // 3. Inserción en lote en Supabase
  if (allRowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('master_transactions')
      .insert(allRowsToInsert)

    if (insertError) {
      console.error('Error insertando movimientos bulk:', insertError)
      throw new Error('No pudimos guardar los movimientos: ' + insertError.message)
    }
  }

  // 4. Revalidación de rutas
  revalidatePath('/dashboard')
  revalidatePath('/accounts')
  revalidatePath(`/accounts/${accountId}`)
  revalidatePath('/transactions')
  revalidatePath('/people')

  return {
    success: true,
    count: allRowsToInsert.length,
    movementsCount: validMovements.length
  }
}
