import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import type { MasterTransaction, Person } from '@/lib/types'

export default async function PeoplePage() {
  const supabase = await createClient()

  const { data: people } = await supabase
    .from('people')
    .select('*')
    .neq('name', 'Personal')
    .returns<Person[]>()

  const { data: pending } = await supabase
    .from('master_transactions')
    .select('person_id, amount_account, currency_account')
    .is('settled_at', null)
    .eq('type', 'OUTCOME')
    .not('person_id', 'is', null)
    .returns<Pick<MasterTransaction, 'person_id' | 'amount_account' | 'currency_account'>[]>()

  const totalsByPerson = new Map<string, Map<string, number>>()
  for (const t of pending ?? []) {
    if (!t.person_id) continue
    const byCurrency = totalsByPerson.get(t.person_id) ?? new Map<string, number>()
    byCurrency.set(t.currency_account, (byCurrency.get(t.currency_account) ?? 0) + t.amount_account)
    totalsByPerson.set(t.person_id, byCurrency)
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="font-display text-xl font-medium mb-3">Personas</h1>
      <div className="space-y-2">
        {(people ?? []).map((p) => {
          const totals = totalsByPerson.get(p.id)
          return (
            <Link key={p.id} href={`/people/${p.id}`}
              className="flex justify-between items-center bg-surface-1 border border-border rounded-card p-3">
              <span className="text-sm font-medium">{p.name}</span>
              <span className="font-mono amount text-sm text-expense">
                {totals && totals.size > 0
                  ? [...totals.entries()].map(([c, amt]) => formatMoney(amt, c)).join(' · ')
                  : '$0.00'}
              </span>
            </Link>
          )
        })}
        {(!people || people.length === 0) && (
          <p className="text-sm text-text-muted">No tenés gastos compartidos activos.</p>
        )}
      </div>
    </main>
  )
}
