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
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Personas</h1>
          <p className="text-xs text-text-muted mt-0.5">Gestión de gastos compartidos y saldos por cobrar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(people ?? []).map((p) => {
          const totals = totalsByPerson.get(p.id)
          const hasPending = totals && totals.size > 0

          return (
            <Link
              key={p.id}
              href={`/people/${p.id}`}
              className="group flex flex-col justify-between bg-surface-1 border border-border rounded-card p-4 hover:border-accent hover:bg-surface-2/60 transition"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-sm font-semibold text-text-secondary group-hover:bg-accent/15 group-hover:text-accent transition">
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-text-primary group-hover:text-accent transition">
                    {p.name}
                  </span>
                </div>
                {hasPending ? (
                  <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-pending/15 text-pending">
                    Por cobrar
                  </span>
                ) : (
                  <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-surface-2 text-text-muted">
                    Al día
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-baseline">
                <span className="text-xs text-text-muted">Saldo</span>
                <span className={`font-mono text-sm font-medium ${hasPending ? 'text-pending' : 'text-text-muted'}`}>
                  {hasPending
                    ? [...totals.entries()].map(([c, amt]) => formatMoney(amt, c)).join(' · ')
                    : 'Sin deudas'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {(!people || people.length === 0) && (
        <div className="bg-surface-1 border border-border rounded-card p-8 text-center text-sm text-text-muted">
          No tenés gastos compartidos activos con otras personas.
        </div>
      )}
    </main>
  )
}
