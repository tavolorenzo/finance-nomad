'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getSingleAccountBalance } from '@/lib/networth'
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

    const parent = (account?.institutions as unknown) as { is_active: boolean } | null
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
}

export interface BalanceAdjustmentInput {
  accountId: string
  targetBalance: number
  date?: string
  notes?: string
}

// "Ajuste express" del PRD (§3.2 / design-system §6):
// Permite sincronizar el saldo real de un banco o billetera contra el sistema.
// Calcula la diferencia (delta) e inserta un asiento de tipo ADJUSTMENT en el ledger.
export async function createBalanceAdjustment(input: BalanceAdjustmentInput) {
  const { supabase, user } = await requireUser()

  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, name, institution_id, currency_native, is_active')
    .eq('id', input.accountId)
    .eq('user_id', user.id)
    .single()

  if (accError || !account) throw new Error('Cuenta no encontrada')
  if (!account.is_active) throw new Error('No se puede ajustar una cuenta desactivada.')

  const targetDate = input.date || new Date().toISOString().slice(0, 10)
  const currentBalance = await getSingleAccountBalance(supabase, account.id, targetDate)
  const delta = Math.round((input.targetBalance - currentBalance) * 100) / 100

  if (delta === 0) {
    throw new Error('El saldo ingresado es igual al saldo actual de la cuenta.')
  }

  const { error: insertError } = await supabase.from('master_transactions').insert({
    user_id: user.id,
    institution_id: account.institution_id,
    account_id: account.id,
    date: targetDate,
    type: 'ADJUSTMENT',
    amount_original: delta,
    currency_original: account.currency_native,
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: delta,
    currency_account: account.currency_native,
    category_id: null,
    person_id: null,
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    notes: input.notes?.trim() || 'Ajuste express de saldo'
  })

  if (insertError) throw new Error('No se pudo guardar. Intentá de nuevo.')

  revalidatePath('/accounts')
  revalidatePath(`/accounts/${account.id}`)
  revalidatePath('/dashboard')
  revalidatePath('/transactions')

  return { success: true, delta }
}
