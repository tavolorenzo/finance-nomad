'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { AccountType } from '@/lib/types'

export interface AccountInput {
  institutionId: string
  name: string
  type: AccountType
  currencyNative: string
  creditLimit: number | null
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')
  return { supabase, user }
}

export async function createAccount(input: AccountInput) {
  const { supabase, user } = await requireUser()
  if (!input.name.trim()) throw new Error('Completá este campo para continuar.')

  const { data: institution } = await supabase
    .from('institutions')
    .select('id, is_active')
    .eq('id', input.institutionId)
    .eq('user_id', user.id)
    .single()

  if (!institution?.is_active) {
    throw new Error('Esta institución está desactivada. Reactivala para agregarle cuentas.')
  }

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,
    institution_id: input.institutionId,
    name: input.name.trim(),
    type: input.type,
    currency_native: input.currencyNative,
    credit_limit: input.type === 'credit_card' ? input.creditLimit : null
  })
  if (error) throw new Error('No se pudo guardar. Intentá de nuevo.')

  revalidatePath('/accounts')
  redirect('/accounts')
}

export async function updateAccount(id: string, input: Omit<AccountInput, 'institutionId'>) {
  const { supabase, user } = await requireUser()
  if (!input.name.trim()) throw new Error('Completá este campo para continuar.')

  const { error } = await supabase
    .from('accounts')
    .update({
      name: input.name.trim(),
      type: input.type,
      currency_native: input.currencyNative,
      credit_limit: input.type === 'credit_card' ? input.creditLimit : null
    })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error('No se pudo guardar. Intentá de nuevo.')

  revalidatePath('/accounts')
  redirect('/accounts')
}

// Baja lógica: nunca DELETE (un DELETE en accounts rompería o dejaría
// huérfanas las filas de master_transactions). Reactivar una cuenta exige
// que la institución padre esté activa.
export async function setAccountActive(id: string, isActive: boolean) {
  const { supabase, user } = await requireUser()

  if (isActive) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id, institutions(is_active)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const parent = account?.institutions as { is_active: boolean } | null
    if (!parent?.is_active) {
      throw new Error('Reactivá la institución antes de reactivar esta cuenta.')
    }
  }

  const { error } = await supabase
    .from('accounts')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error('No se pudo desactivar. Intentá de nuevo.')

  revalidatePath('/accounts')
  revalidatePath('/dashboard')
  redirect('/accounts')
}
