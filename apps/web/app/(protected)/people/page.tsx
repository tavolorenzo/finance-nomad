import Link from 'next/link'
import { Plus, Pencil, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import type { MasterTransaction, Person } from '@/lib/types'

export default async function PeoplePage() {
  const supabase = await createClient()

  let people: Person[] = []
  let pending: Pick<MasterTransaction, 'person_id' | 'amount_account' | 'currency_account'>[] = []

  try {
    const [{ data: peopleData }, { data: pendingData }] = await Promise.all([
      supabase
        .from('people')
        .select('*')
        .neq('name', 'Personal')
        .returns<Person[]>(),
      supabase
        .from('master_transactions')
        .select('person_id, amount_account, currency_account')
        .is('settled_at', null)
        .eq('type', 'OUTCOME')
        .not('person_id', 'is', null)
        .returns<Pick<MasterTransaction, 'person_id' | 'amount_account' | 'currency_account'>[]>()
    ])
    people = peopleData ?? []
    pending = pendingData ?? []
  } catch {
    // Si la conexión falla (offline), mostramos estado vacío seguro
  }

  const totalsByPerson = new Map<string, Map<string, number>>()
  for (const t of pending ?? []) {
    if (!t.person_id) continue
    const byCurrency = totalsByPerson.get(t.person_id) ?? new Map<string, number>()
    byCurrency.set(t.currency_account, (byCurrency.get(t.currency_account) ?? 0) + t.amount_account)
    totalsByPerson.set(t.person_id, byCurrency)
  }

  const activePeople = (people ?? []).filter((p) => p.is_active !== false)
  const inactivePeople = (people ?? []).filter((p) => p.is_active === false)

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Personas</h1>
          <p className="text-xs text-text-muted mt-0.5">Gestión de gastos compartidos y saldos por cobrar</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/people/template"
            className="inline-flex items-center justify-center gap-1.5 border border-border bg-surface-1 text-text-primary text-xs font-medium px-3.5 py-2 rounded-control hover:bg-surface-2 transition"
          >
            <MessageSquare size={14} className="text-income" /> Plantilla WhatsApp
          </Link>
          <Link
            href="/people/new"
            className="inline-flex items-center justify-center gap-1.5 bg-accent text-[color:var(--on-accent)] text-xs font-medium px-3.5 py-2 rounded-control hover:opacity-90 transition"
          >
            <Plus size={15} /> Nueva persona
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activePeople.map((p) => (
          <PersonCard key={p.id} person={p} totals={totalsByPerson.get(p.id)} />
        ))}
      </div>

      {activePeople.length === 0 && (
        <div className="bg-surface-1 border border-border rounded-card p-8 text-center text-sm text-text-muted">
          No tenés personas activas para gastos compartidos. Agregá una para empezar.
        </div>
      )}

      {inactivePeople.length > 0 && (
        <details className="pt-2">
          <summary className="text-xs font-medium text-text-muted cursor-pointer hover:text-text-primary transition select-none">
            Personas desactivadas ({inactivePeople.length})
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
            {inactivePeople.map((p) => (
              <PersonCard key={p.id} person={p} totals={totalsByPerson.get(p.id)} />
            ))}
          </div>
        </details>
      )}
    </main>
  )
}

function PersonCard({
  person,
  totals
}: {
  person: Person
  totals?: Map<string, number>
}) {
  const hasPending = totals && totals.size > 0
  const isDeactivated = person.is_active === false

  return (
    <div className="group flex flex-col justify-between bg-surface-1 border border-border rounded-card p-4 hover:border-accent hover:bg-surface-2/60 transition">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <Link href={`/people/${person.id}`} className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-9 h-9 rounded-full bg-surface-2 flex-shrink-0 flex items-center justify-center text-sm font-semibold text-text-secondary group-hover:bg-accent/15 group-hover:text-accent transition">
              {person.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="truncate">
              <span className="text-sm font-medium text-text-primary group-hover:text-accent transition truncate block">
                {person.name}
              </span>
              {person.phone && (
                <span className="text-[11px] text-text-muted truncate block">
                  {person.phone}
                </span>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isDeactivated ? (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-surface-2 text-text-muted border border-border">
                Desactivada
              </span>
            ) : hasPending ? (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-pending/15 text-pending">
                Por cobrar
              </span>
            ) : (
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-surface-2 text-text-muted">
                Al día
              </span>
            )}
            <Link
              href={`/people/${person.id}/edit`}
              title="Editar persona"
              className="p-1.5 rounded-control text-text-muted hover:text-text-primary hover:bg-surface-2 transition"
            >
              <Pencil size={13} />
            </Link>
          </div>
        </div>
      </div>

      <Link
        href={`/people/${person.id}`}
        className="pt-2 border-t border-border flex justify-between items-baseline"
      >
        <span className="text-xs text-text-muted">Saldo</span>
        <span className={`font-mono text-sm font-medium ${hasPending ? 'text-pending' : 'text-text-muted'}`}>
          {hasPending
            ? [...totals.entries()].map(([c, amt]) => formatMoney(amt, c)).join(' · ')
            : 'Sin deudas'}
        </span>
      </Link>
    </div>
  )
}
