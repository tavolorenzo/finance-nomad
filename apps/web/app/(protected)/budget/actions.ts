'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getRate, calculateAccountAmount } from '@/lib/fx'
import type { BudgetEstimateType } from '@/lib/types'

export interface UpsertBudgetEstimateInput {
  name: string
  type: BudgetEstimateType
  estimatedAmount: number
  currency: string
  categoryId: string
  dueDay?: number | null
  preferredAccountId?: string | null
  isActive?: boolean
}

function validateEstimateInput(input: UpsertBudgetEstimateInput) {
  const name = input.name?.trim()
  if (!name) {
    throw new Error('Ingresá un nombre para la estimación.')
  }
  if (input.type !== 'EXPENSE_ESTIMATE' && input.type !== 'INCOME_ESTIMATE') {
    throw new Error('Seleccioná un tipo válido (Gasto fijo o Ingreso proyectado).')
  }
  const amount = Number(input.estimatedAmount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto estimado debe ser mayor a 0.')
  }
  const currency = input.currency?.trim().toUpperCase()
  if (!currency) {
    throw new Error('Seleccioná la moneda de la estimación.')
  }
  if (!input.categoryId?.trim()) {
    throw new Error('Seleccioná una categoría para vincular el progreso del mes.')
  }
  let dueDay: number | null = null
  if (input.dueDay !== undefined && input.dueDay !== null && String(input.dueDay) !== '') {
    const parsed = Number(input.dueDay)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 31) {
      throw new Error('El día de vencimiento debe estar entre 1 y 31.')
    }
    dueDay = parsed
  }

  return {
    name,
    type: input.type,
    estimated_amount: Math.round(amount * 100) / 100,
    currency,
    category_id: input.categoryId.trim(),
    due_day: dueDay,
    preferred_account_id: input.preferredAccountId?.trim() || null
  }
}

export async function createBudgetEstimate(input: UpsertBudgetEstimateInput) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const payload = validateEstimateInput(input)

  const { data, error } = await supabase
    .from('budget_estimates')
    .insert({
      user_id: user.id,
      ...payload,
      is_active: true
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/budget')
  revalidatePath('/dashboard')
  return data
}

export async function updateBudgetEstimate(id: string, input: UpsertBudgetEstimateInput) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')
  if (!id?.trim()) throw new Error('ID de estimación inválido')

  const payload = validateEstimateInput(input)

  const updateData: Record<string, unknown> = {
    ...payload
  }
  if (typeof input.isActive === 'boolean') {
    updateData.is_active = input.isActive
  }

  const { data, error } = await supabase
    .from('budget_estimates')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/budget')
  revalidatePath('/dashboard')
  return data
}

export async function toggleBudgetEstimateActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')
  if (!id?.trim()) throw new Error('ID de estimación inválido')

  const { error } = await supabase
    .from('budget_estimates')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/budget')
  revalidatePath('/dashboard')
}

export interface ExecuteBudgetPaymentOptions {
  accountId?: string
  exchangeRate?: number
  date?: string
}

// "Ejecutar pago" del PRD (sección 4.6): convierte una estimación en una
// transacción real de un solo tap, precargada con los datos del estimado y soporte multi-moneda.
export async function executeBudgetPayment(
  estimateId: string,
  options?: ExecuteBudgetPaymentOptions
) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { data: estimate, error: fetchError } = await supabase
    .from('budget_estimates')
    .select('*')
    .eq('id', estimateId)
    .eq('user_id', user.id)
    .single()
  if (fetchError || !estimate) throw new Error('No se encontró la estimación')

  const targetAccountId = options?.accountId?.trim() || estimate.preferred_account_id
  if (!targetAccountId) {
    throw new Error('Seleccioná una cuenta para ejecutar este movimiento')
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id, institution_id, currency_native')
    .eq('id', targetAccountId)
    .eq('user_id', user.id)
    .single()
  if (!account) throw new Error('Cuenta seleccionada no encontrada')

  const txDate = options?.date || new Date().toISOString().slice(0, 10)
  const currencyOriginal = String(estimate.currency).toUpperCase()
  const currencyAccount = String(account.currency_native).toUpperCase()

  let exchangeRate = 1
  let rateOverridden = false

  if (currencyOriginal !== currencyAccount) {
    if (options?.exchangeRate && options.exchangeRate > 0) {
      exchangeRate = options.exchangeRate
      rateOverridden = true
    } else {
      try {
        exchangeRate = await getRate(txDate, currencyOriginal, currencyAccount)
      } catch {
        throw new Error(
          `No se pudo obtener la cotización ${currencyOriginal} → ${currencyAccount}. Ingresá el tipo de cambio manualmente.`
        )
      }
    }
  }

  const amountOriginal = Number(estimate.estimated_amount)
  const amountAccount = calculateAccountAmount(amountOriginal, 0, exchangeRate)
  const accountingPeriod = txDate.slice(0, 7)

  const { error } = await supabase.from('master_transactions').insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    date: txDate,
    type: estimate.type === 'INCOME_ESTIMATE' ? 'INCOME' : 'OUTCOME',
    amount_original: amountOriginal,
    currency_original: currencyOriginal,
    fee_amount: 0,
    exchange_rate: exchangeRate,
    rate_overridden: rateOverridden,
    amount_account: amountAccount,
    currency_account: currencyAccount,
    institution_id: account.institution_id,
    account_id: account.id,
    category_id: estimate.category_id,
    person_id: null,
    installment_current: 1,
    installment_total: 1,
    status: 'COMPLETED',
    accounting_period: accountingPeriod,
    notes: estimate.name
  })
  if (error) throw new Error(error.message)

  revalidatePath('/budget')
  revalidatePath('/dashboard')
}
