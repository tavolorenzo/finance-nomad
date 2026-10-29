'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { revalidatePath } from 'next/cache'

export interface InitialAccountInput {
  institutionName: string
  name: string
  type: 'checking' | 'savings' | 'investing' | 'credit_card' | 'cash'
  currencyNative: string
  initialBalance?: number
  creditLimit?: number
}

export interface InitialCategoryInput {
  name: string
  icon: string
  color: string
}

export interface SeedSpaceInput {
  displayCurrency: string
  accounts: InitialAccountInput[]
  categories: InitialCategoryInput[]
  people: string[]
  activeCurrencies?: import('@/lib/types').ActiveCurrency[]
}

export async function seedUserSpaceAction(input: SeedSpaceInput) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No autenticado')

  // Derivar divisas activas si no vienen explícitas
  const { getCurrencyInfo } = await import('@/lib/currency-catalog')
  const uniqueCurrencyCodes = Array.from(
    new Set([input.displayCurrency, ...input.accounts.map((a) => a.currencyNative)])
  ).filter(Boolean)

  const activeCurrencies = input.activeCurrencies ?? uniqueCurrencyCodes.map((code) => {
    const info = getCurrencyInfo(code)
    return {
      code,
      name: info?.name ?? code,
      symbol: info?.symbol ?? code,
      flag: info?.flag,
      rate_mode: 'auto' as const
    }
  })

  // 1. Guardar settings con onboarding_completed = true, moneda elegida y divisas activas
  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      display_currency: input.displayCurrency,
      onboarding_completed: true,
      active_currencies: activeCurrencies,
      updated_at: new Date().toISOString()
    })

  // 2. Crear instituciones únicas necesarias y mapear sus IDs
  const institutionNames = Array.from(new Set(input.accounts.map((a) => a.institutionName.trim()))).filter(Boolean)
  const institutionMap = new Map<string, string>()

  for (const name of institutionNames) {
    const { data: inst, error: instErr } = await supabase
      .from('institutions')
      .insert({ user_id: user.id, name, is_active: true })
      .select('id')
      .single()

    if (!instErr && inst) {
      institutionMap.set(name, inst.id)
    }
  }

  // 3. Crear cuentas asociadas a las instituciones creadas y asentar saldo inicial
  const today = new Date().toISOString().slice(0, 10)
  const adjustmentRows: any[] = []

  for (const accInput of input.accounts) {
    const instName = accInput.institutionName.trim()
    const accName = accInput.name.trim()
    const institutionId = institutionMap.get(instName)

    if (!accName || !institutionId) continue

    const isCredit = accInput.type === 'credit_card'
    const creditLimit = isCredit && typeof accInput.creditLimit === 'number' && !isNaN(accInput.creditLimit)
      ? accInput.creditLimit
      : null

    const { data: createdAcc, error: accErr } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        institution_id: institutionId,
        name: accName,
        type: accInput.type,
        currency_native: accInput.currencyNative,
        credit_limit: creditLimit,
        is_active: true
      })
      .select('id')
      .single()

    if (!accErr && createdAcc && !isCredit) {
      const initialBal = Number(accInput.initialBalance)
      if (!isNaN(initialBal) && initialBal !== 0) {
        adjustmentRows.push({
          user_id: user.id,
          institution_id: institutionId,
          account_id: createdAcc.id,
          date: today,
          type: 'ADJUSTMENT',
          amount_original: initialBal,
          currency_original: accInput.currencyNative,
          fee_amount: 0,
          exchange_rate: 1,
          rate_overridden: false,
          amount_account: initialBal,
          currency_account: accInput.currencyNative,
          category_id: null,
          person_id: null,
          installment_current: 1,
          installment_total: 1,
          status: 'COMPLETED',
          notes: 'Saldo inicial de configuración'
        })
      }
    }
  }

  // 4. Asentar transacciones de saldo inicial en el ledger si existen
  if (adjustmentRows.length > 0) {
    await supabase.from('master_transactions').insert(adjustmentRows)
  }

  // 5. Crear categorías
  if (input.categories && input.categories.length > 0) {
    const categoriesToInsert = input.categories
      .filter((c) => c.name.trim())
      .map((c) => ({
        user_id: user.id,
        name: c.name.trim(),
        icon: c.icon || 'tag',
        color: c.color || 'accent',
        is_active: true
      }))

    if (categoriesToInsert.length > 0) {
      await supabase.from('categories').insert(categoriesToInsert)
    }
  }

  // 6. Crear personas (por defecto Personal + contactos extras sin duplicados)
  const rawPeople = input.people.map((p) => p.trim()).filter(Boolean)
  const customPeople = rawPeople.filter((p) => p.toLowerCase() !== 'personal')
  const seenNames = new Set<string>()
  const deduplicatedCustomPeople: string[] = []
  for (const p of customPeople) {
    const lower = p.toLowerCase()
    if (!seenNames.has(lower)) {
      seenNames.add(lower)
      deduplicatedCustomPeople.push(p)
    }
  }

  const peopleNames = ['Personal', ...deduplicatedCustomPeople]

  const peopleToInsert = peopleNames.map((name) => ({
    user_id: user.id,
    name,
    is_active: true
  }))
  await supabase.from('people').insert(peopleToInsert)

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function skipWelcomeAction() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No autenticado')

  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    })

  revalidatePath('/', 'layout')
  return { success: true }
}
