'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { buildPersonSettlementBundle } from '@/lib/ledger/settlement'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa')
  return { supabase, user }
}

export async function ensureThirdPartyCollectionCategory(): Promise<string> {
  const { supabase, user } = await requireUser()
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', 'Cobros a terceros')
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, name: 'Cobros a terceros' })
    .select('id')
    .single()

  if (error || !created) throw new Error('No se pudo inicializar la categoría de cobros a terceros')
  return created.id
}

export async function registerPersonPaymentAction({
  personId,
  personName,
  destinationAccountId,
  amountOriginal,
  currencyOriginal,
  exchangeRate,
  date,
  notes
}: {
  personId: string
  personName: string
  destinationAccountId: string
  amountOriginal: number
  currencyOriginal: string
  exchangeRate?: number
  date: string
  notes?: string | null
}) {
  const { supabase, user } = await requireUser()

  // 1. Obtener transacciones pendientes de esa persona
  const { data: pending, error: pendingErr } = await supabase
    .from('master_transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('person_id', personId)
    .is('settled_at', null)
    .order('date', { ascending: true })

  if (pendingErr) throw new Error(pendingErr.message)

  // 2. Obtener cuenta de destino
  const { data: destAccount, error: accErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', destinationAccountId)
    .single()

  if (accErr || !destAccount) throw new Error('Cuenta de destino no encontrada')

  // 3. Resolver categoría 'Cobros a terceros'
  const categoryId = await ensureThirdPartyCollectionCategory()

  // 4. Construir bundle atómico
  const { bundle } = buildPersonSettlementBundle({
    userId: user.id,
    personId,
    personName,
    destinationAccount: {
      id: destAccount.id,
      name: destAccount.name,
      currency_native: destAccount.currency_native,
      institution_id: destAccount.institution_id,
      type: destAccount.type
    },
    amountOriginal,
    currencyOriginal,
    currencyAccount: destAccount.currency_native,
    exchangeRate,
    date,
    categoryId,
    notes,
    pendingTransactions: pending ?? []
  })

  // 5. Persistir bundle atómicamente
  const sanitizedRows = bundle.rows.map((r) => ({ ...r, user_id: user.id }))
  const { error: rpcErr } = await supabase.rpc('commit_ledger_bundle', { p_rows: sanitizedRows })
  if (rpcErr) {
    const { error: upsertErr } = await supabase
      .from('master_transactions')
      .upsert(sanitizedRows, { onConflict: 'id', ignoreDuplicates: false })
    if (upsertErr) throw new Error(upsertErr.message)
  }

  revalidatePath(`/people/${personId}`)
  revalidatePath('/people')
  revalidatePath(`/accounts/${destinationAccountId}`)
}

// "Registrar cobro / liquidación directa" (compatibilidad hacia atrás)
export async function registerCollection(personId: string) {
  const { supabase, user } = await requireUser()

  const { data: pending } = await supabase
    .from('master_transactions')
    .select('id, amount_account')
    .eq('person_id', personId)
    .eq('user_id', user.id)
    .is('settled_at', null)

  const now = new Date().toISOString()
  if (pending && pending.length > 0) {
    for (const p of pending) {
      await supabase
        .from('master_transactions')
        .update({ settled_at: now, settled_amount: p.amount_account })
        .eq('id', p.id)
    }
  }

  revalidatePath(`/people/${personId}`)
  revalidatePath('/people')
}

export async function createPerson(name: string, phone?: string | null) {
  const { supabase, user } = await requireUser()
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Completá el nombre para continuar.')

  if (trimmedName.toLowerCase() === 'personal') {
    throw new Error('"Personal" es una palabra reservada del sistema para tus consumos propios. Elegí otro nombre.')
  }

  // Prevenir duplicados (case-insensitive) para el usuario
  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .eq('user_id', user.id)
    .ilike('name', trimmedName)
    .maybeSingle()

  if (existing) {
    throw new Error('Ya existe una persona con ese nombre. Agregá una inicial para que puedas distinguirla.')
  }

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

  if (current?.name === 'Personal' && trimmedName.toLowerCase() !== 'personal') {
    throw new Error('No podés renombrar el contacto de sistema Personal.')
  }

  if (current?.name !== 'Personal' && trimmedName.toLowerCase() === 'personal') {
    throw new Error('"Personal" es una palabra reservada del sistema para tus consumos propios. Elegí otro nombre.')
  }

  // Verificar si ya existe otra persona con ese nombre (case-insensitive, excluyendo la actual)
  const { data: duplicate } = await supabase
    .from('people')
    .select('id')
    .eq('user_id', user.id)
    .neq('id', id)
    .ilike('name', trimmedName)
    .maybeSingle()

  if (duplicate) {
    throw new Error('Ya existe una persona con ese nombre. Agregá una inicial para que puedas distinguirla.')
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

