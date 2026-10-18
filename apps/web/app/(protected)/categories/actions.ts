'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'

const DEFAULT_CATEGORIES = [
  { name: 'Supermercado & Comida', icon: 'shopping-cart', color: 'accent' },
  { name: 'Alquiler & Hospedaje', icon: 'home', color: 'expense' },
  { name: 'Vuelos & Transporte', icon: 'plane', color: 'accent' },
  { name: 'Restaurantes & Cafés', icon: 'utensils', color: 'income' },
  { name: 'Entretenimiento & Ocio', icon: 'ticket', color: 'pending' },
  { name: 'Salud & Seguro de Viaje', icon: 'heart-pulse', color: 'expense' },
  { name: 'Tecnología & Trabajo', icon: 'laptop', color: 'accent' },
  { name: 'Servicios & Suscripciones', icon: 'receipt', color: 'pending' }
]

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No autorizado')

  const name = String(formData.get('name') ?? '').trim()
  const icon = String(formData.get('icon') ?? 'tag').trim()
  const color = String(formData.get('color') ?? 'accent').trim()

  if (!name) {
    throw new Error('El nombre de la categoría es obligatorio')
  }

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name,
    icon,
    color,
    is_active: true
  })

  if (error) {
    throw new Error(`Error al crear la categoría: ${error.message}`)
  }

  revalidatePath('/categories')
  revalidatePath('/transactions/new')
  revalidatePath('/budget')
  revalidatePath('/analytics')
  revalidatePath('/dashboard')
}

export async function updateCategory(formData: FormData) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No autorizado')

  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const icon = String(formData.get('icon') ?? 'tag').trim()
  const color = String(formData.get('color') ?? 'accent').trim()
  const isActive = formData.get('is_active') !== 'false'

  if (!id) throw new Error('ID de categoría inválido')
  if (!name) throw new Error('El nombre de la categoría es obligatorio')

  const { error } = await supabase
    .from('categories')
    .update({
      name,
      icon,
      color,
      is_active: isActive
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Error al actualizar la categoría: ${error.message}`)
  }

  revalidatePath('/categories')
  revalidatePath('/transactions/new')
  revalidatePath('/budget')
  revalidatePath('/analytics')
  revalidatePath('/dashboard')
}

export async function toggleCategoryActive(id: string, is_active: boolean) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No autorizado')

  const { error } = await supabase
    .from('categories')
    .update({ is_active })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Error al cambiar estado de la categoría: ${error.message}`)
  }

  revalidatePath('/categories')
  revalidatePath('/transactions/new')
  revalidatePath('/budget')
  revalidatePath('/analytics')
  revalidatePath('/dashboard')
}

export async function seedDefaultCategories() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('No autorizado')

  const rows = DEFAULT_CATEGORIES.map((c) => ({
    user_id: user.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    is_active: true
  }))

  const { error } = await supabase.from('categories').insert(rows)

  if (error) {
    throw new Error(`Error al sembrar categorías sugeridas: ${error.message}`)
  }

  revalidatePath('/categories')
  revalidatePath('/transactions/new')
  revalidatePath('/budget')
  revalidatePath('/analytics')
  revalidatePath('/dashboard')
}
