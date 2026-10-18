import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { CategoryList } from '@/components/CategoryList'
import type { Category } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  let categoriesWithStats: (Category & { transaction_count?: number })[] = []

  try {
    const [{ data: categories }, { data: txGroup }] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true }),
      supabase
        .from('master_transactions')
        .select('category_id')
        .eq('user_id', user.id)
        .not('category_id', 'is', null)
    ])

    const countMap = new Map<string, number>()
    for (const t of txGroup ?? []) {
      if (t.category_id) {
        countMap.set(t.category_id, (countMap.get(t.category_id) ?? 0) + 1)
      }
    }

    categoriesWithStats = (categories ?? []).map((cat) => ({
      ...cat,
      transaction_count: countMap.get(cat.id) ?? 0
    }))
  } catch {
    // Modo offline o error de red
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Categorías de Gastos
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Organizá tus consumos para presupuestos, seguimiento de cuotas y reportes financieros.
        </p>
      </div>

      <CategoryList categories={categoriesWithStats} />
    </main>
  )
}
