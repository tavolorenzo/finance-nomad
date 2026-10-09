'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')
  return { supabase, user }
}

// "Registrar cobro / liquidación" del PRD (sección 4.5): liquida de una
// todo lo pendiente de esa persona. No borra ni modifica el monto original
// del ledger -- solo marca settled_at, así el historial contable queda intacto.
export async function registerCollection(personId: string) {
  const { supabase, user } = await requireUser()

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

export async function createPerson(name: string, phone?: string | null) {
  const { supabase, user } = await requireUser()
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Completá el nombre para continuar.')

  const { data, error } = await supabase
    .from('people')
    .insert({
      user_id: user.id,
      name: trimmedName,
      phone: phone?.trim() || null
    })
    .select('id')
    .single()

  if (error || !data) throw new Error('No se pudo guardar la persona. Intentá de nuevo.')

  revalidatePath('/people')
  revalidatePath('/transactions/new')
  return data
}

export async function updatePerson(id: string, name: string, phone?: string | null) {
  const { supabase, user } = await requireUser()
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Completá el nombre para continuar.')

  // Proteger nombre del contacto de sistema "Personal"
  const { data: current } = await supabase
    .from('people')
    .select('name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (current?.name === 'Personal' && trimmedName !== 'Personal') {
    throw new Error('No podés renombrar el contacto de sistema Personal.')
  }

  const { error } = await supabase
    .from('people')
    .update({
      name: trimmedName,
      phone: phone?.trim() || null
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error('No se pudo guardar los cambios. Intentá de nuevo.')

  revalidatePath(`/people/${id}`)
  revalidatePath('/people')
  revalidatePath('/transactions/new')
}

// Baja lógica: nunca DELETE. Solo se permite si la persona tiene saldo 0.
export async function setPersonActive(id: string, isActive: boolean) {
  const { supabase, user } = await requireUser()

  if (!isActive) {
    const { data: person } = await supabase
      .from('people')
      .select('name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (person?.name === 'Personal') {
      throw new Error('No podés desactivar el contacto de sistema Personal.')
    }

    // Verificar que el saldo pendiente esté en 0
    const { data: pending, error: pendingErr } = await supabase
      .from('master_transactions')
      .select('amount_account')
      .eq('person_id', id)
      .eq('user_id', user.id)
      .eq('type', 'OUTCOME')
      .is('settled_at', null)

    if (pendingErr) throw new Error('No se pudo verificar el saldo de la persona.')

    const totalPending = (pending ?? []).reduce((sum, t) => sum + (t.amount_account || 0), 0)
    if (totalPending > 0) {
      throw new Error('Solo podés desactivar a una persona si su saldo por cobrar está en 0. Liquidá los cobros pendientes primero.')
    }
  }

  const { error } = await supabase
    .from('people')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    if (error.message.includes('is_active')) {
      throw new Error('Falta aplicar la migración 0006_people_is_active.sql en Supabase para soportar desactivación.')
    }
    throw new Error('No se pudo modificar el estado de la persona. Intentá de nuevo.')
  }

  revalidatePath(`/people/${id}`)
  revalidatePath('/people')
  revalidatePath('/transactions/new')
  revalidatePath('/dashboard')
}

export async function updateWhatsAppTemplate(template: string) {
  const { supabase, user } = await requireUser()
  const cleanTemplate = template.trim()

  const { data: existing } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('user_settings')
      .update({
        whatsapp_template: cleanTemplate || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      if (error.message.includes('whatsapp_template')) {
        throw new Error('Falta aplicar la migración 0007_whatsapp_template.sql en Supabase.')
      }
      throw new Error('No se pudo guardar la plantilla. Intentá de nuevo.')
    }
  } else {
    const { error } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        whatsapp_template: cleanTemplate || null,
        updated_at: new Date().toISOString()
      })

    if (error) {
      if (error.message.includes('whatsapp_template')) {
        throw new Error('Falta aplicar la migración 0007_whatsapp_template.sql en Supabase.')
      }
      throw new Error('No se pudo guardar la plantilla. Intentá de nuevo.')
    }
  }

  revalidatePath('/people')
  revalidatePath('/people/template')
}

