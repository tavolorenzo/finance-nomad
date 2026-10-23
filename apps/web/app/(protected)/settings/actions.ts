'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateDisplayCurrency(currency: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, display_currency: currency, updated_at: new Date().toISOString() })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/settings')
}

export async function updateActiveCurrencies(currencies: import('@/lib/types').ActiveCurrency[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, active_currencies: currencies, updated_at: new Date().toISOString() })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/settings')
  revalidatePath('/transactions')
}
