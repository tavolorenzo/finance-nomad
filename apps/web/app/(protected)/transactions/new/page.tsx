import { createClient } from '@/lib/supabase/server'
import { TransactionForm } from '@/components/TransactionForm'
import type { Account, Category, Person } from '@/lib/types'

// Fallback de página completa -- solo se ve si se entra directo por URL
// (refresh, deep link, sin JS). La experiencia normal es el modal
// interceptado en @modal/(.)transactions/new/page.tsx.
export default async function NewTransactionPage() {
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*, institutions!inner(id, name)')
    .eq('is_active', true)
    .eq('institutions.is_active', true)
    .returns<(Account & { institutions: { id: string; name: string } })[]>()

  const { data: categories } = await supabase.from('categories').select('*').returns<Category[]>()
  const { data: people } = await supabase.from('people').select('*').returns<Person[]>()

  return (
    <main className="max-w-md mx-auto py-4">
      <h1 className="font-display text-xl font-medium px-4 mb-3">Nuevo movimiento</h1>
      <div className="bg-surface-2 border border-border rounded-card">
        <TransactionForm
          accounts={accounts ?? []}
          categories={categories ?? []}
          people={people ?? []}
          defaultDate={new Date().toISOString().slice(0, 10)}
        />
      </div>
    </main>
  )
}
