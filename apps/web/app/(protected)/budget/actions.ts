'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// "Ejecutar pago" del PRD (sección 4.6): convierte una estimación en una
// transacción real de un solo tap, precargada con los datos del estimado.
export async function executeBudgetPayment(estimateId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { data: estimate, error: fetchError } = await supabase
    .from('budget_estimates')
    .select('*')
    .eq('id', estimateId)
    .single()
  if (fetchError || !estimate) throw new Error('No se encontró la estimación')
  if (!estimate.preferred_account_id) {
    throw new Error('Esta estimación no tiene cuenta preferida configurada')
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('institution_id, currency_native')
    .eq('id', estimate.preferred_account_id)
    .single()
  if (!account) throw new Error('Cuenta preferida no encontrada')

  const { error } = await supabase.from('master_transactions').insert({
    user_id: user.id,
    date: new Date().toISOString().slice(0, 10),
    type: estimate.type === 'INCOME_ESTIMATE' ? 'INCOME' : 'OUTCOME',
    amount_original: estimate.estimated_amount,
    currency_original: estimate.currency,
    fee_amount: 0,
    exchange_rate: 1,
    rate_overridden: false,
    amount_account: estimate.estimated_amount,
    currency_account: account.currency_native,
    institution_id: account.institution_id,
    account_id: estimate.preferred_account_id,
    category_id: estimate.category_id,
    person_id: null,
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    notes: estimate.name
  })
  if (error) throw new Error(error.message)

  revalidatePath('/budget')
  revalidatePath('/dashboard')
}
