import { createClient } from '@/lib/supabase/server'
import { TransactionForm } from '@/components/TransactionForm'
import { Modal } from '@/components/Modal'
import type { Account, Category, Person } from '@/lib/types'

// Ruta interceptora: (.) intercepta /transactions/new cuando la navegación
// pasa por un <Link> dentro de (protected) -- lo muestra encima de la
// pantalla actual en vez de navegar. Si alguien entra directo por URL
// (refresh, deep link), Next.js ignora esta ruta y renderiza el fallback
// completo en app/(protected)/transactions/new/page.tsx.
export default async function TransactionModal() {
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
    <Modal title="Nuevo movimiento">
      <TransactionForm
        accounts={accounts ?? []}
        categories={categories ?? []}
        people={people ?? []}
        defaultDate={new Date().toISOString().slice(0, 10)}
      />
    </Modal>
  )
}
