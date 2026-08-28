'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// "Registrar cobro / liquidación" del PRD (sección 4.5): liquida de una
// todo lo pendiente de esa persona. No borra ni modifica el monto original
// del ledger -- solo marca settled_at, así el historial contable queda intacto.
export async function registerCollection(personId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')

  const { error } = await supabase
    .from('master_transactions')
    .update({ settled_at: new Date().toISOString() })
    .eq('person_id', personId)
    .eq('user_id', user.id)
    .is('settled_at', null)

  if (error) throw new Error(error.message)

  revalidatePath(`/people/${personId}`)
  revalidatePath('/people')
}
