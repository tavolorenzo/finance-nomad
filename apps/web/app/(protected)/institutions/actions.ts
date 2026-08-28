'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')
  return { supabase, user }
}

export async function createInstitution(name: string) {
  const { supabase, user } = await requireUser()
  if (!name.trim()) throw new Error('Completá este campo para continuar.')

  const { error } = await supabase.from('institutions').insert({ user_id: user.id, name: name.trim() })
  if (error) throw new Error('No se pudo guardar. Intentá de nuevo.')

  revalidatePath('/accounts')
  redirect('/accounts')
}

export async function updateInstitution(id: string, name: string) {
  const { supabase, user } = await requireUser()
  if (!name.trim()) throw new Error('Completá este campo para continuar.')

  const { error } = await supabase
    .from('institutions')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error('No se pudo guardar. Intentá de nuevo.')

  revalidatePath('/accounts')
  redirect('/accounts')
}

// Baja lógica: nunca DELETE. Primero se desactivan las cuentas y después
// la institución, para que no quede una cuenta activa colgando (aparecería
// en el formulario de movimientos).
export async function setInstitutionActive(id: string, isActive: boolean) {
  const { supabase, user } = await requireUser()

  if (!isActive) {
    const { error: accountsError } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('institution_id', id)
      .eq('user_id', user.id)
    if (accountsError) throw new Error('No se pudo desactivar. Intentá de nuevo.')
  }

  const { error } = await supabase
    .from('institutions')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error('No se pudo desactivar. Intentá de nuevo.')

  revalidatePath('/accounts')
  revalidatePath('/dashboard')
  redirect('/accounts')
}
