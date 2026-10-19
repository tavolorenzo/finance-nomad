'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { revalidatePath } from 'next/cache'

export interface InitialAccountInput {
  institutionName: string
  name: string
  type: 'checking' | 'savings' | 'investing' | 'credit_card' | 'cash'
  currencyNative: string
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
}

export async function seedUserSpaceAction(input: SeedSpaceInput) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No autenticado')

  // 1. Guardar settings con onboarding_completed = true y moneda elegida
  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      display_currency: input.displayCurrency,
      onboarding_completed: true,
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

  // 3. Crear cuentas asociadas a las instituciones creadas
  const accountsToInsert = input.accounts
    .filter((a) => a.name.trim() && institutionMap.has(a.institutionName.trim()))
    .map((a) => ({
      user_id: user.id,
      institution_id: institutionMap.get(a.institutionName.trim())!,
      name: a.name.trim(),
      type: a.type,
      currency_native: a.currencyNative,
      credit_limit: a.creditLimit ?? null,
      is_active: true
    }))

  if (accountsToInsert.length > 0) {
    await supabase.from('accounts').insert(accountsToInsert)
  }

  // 4. Crear categorías
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

  // 5. Crear personas (por defecto Personal + contactos extras)
  const peopleNames = Array.from(new Set(input.people.map((p) => p.trim()).filter(Boolean)))
  if (!peopleNames.includes('Personal')) {
    peopleNames.unshift('Personal')
  }

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
