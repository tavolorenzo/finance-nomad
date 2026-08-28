import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import { PersonActions } from '@/components/PersonActions'
import type { MasterTransaction, Person } from '@/lib/types'

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: person } = await supabase.from('people').select('*').eq('id', id).single<Person>()
  if (!person) notFound()

  const { data: transactions } = await supabase
    .from('master_transactions')
    .select('*')
    .eq('person_id', id)
    .order('date', { ascending: true })
    .returns<MasterTransaction[]>()

  const all = transactions ?? []
  const today = new Date().toISOString().slice(0, 10)
  const pending = all.filter((t) => !t.settled_at)
  const upcoming = pending.filter((t) => t.date > today)
  const overdueOrToday = pending.filter((t) => t.date <= today)
  const settled = all.filter((t) => t.settled_at)

  const totalPending = pending.reduce((sum, t) => sum + t.amount_account, 0)
  const currency = pending[0]?.currency_account ?? 'UYU'

  return (
    <main className="max-w-md mx-auto p-4 space-y-4">
      <div>
        <h1 className="font-display text-xl font-medium">{person.name}</h1>
        <p className="font-mono amount text-2xl text-expense mt-1">
          {formatMoney(totalPending, currency)}
        </p>
        <p className="text-xs text-text-muted mt-0.5">Deuda pendiente</p>
      </div>

      <PersonActions person={person} pending={pending} />

      {overdueOrToday.length > 0 && (
        <section>
          <p className="font-display text-base font-medium mb-2">Pendiente ahora</p>
          {overdueOrToday.map((t) => (
            <Row key={t.id} t={t} />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <p className="font-display text-base font-medium mb-2">Cuotas futuras</p>
          {upcoming.map((t) => (
            <Row key={t.id} t={t} />
          ))}
        </section>
      )}

      {settled.length > 0 && (
        <section>
          <p className="font-display text-base font-medium mb-2 text-text-muted">Historial cobrado</p>
          {settled.map((t) => (
            <Row key={t.id} t={t} muted />
          ))}
        </section>
      )}

      {all.length === 0 && (
        <p className="text-sm text-text-muted">No hay movimientos asignados a {person.name} todavía.</p>
      )}
    </main>
  )
}

function Row({ t, muted = false }: { t: MasterTransaction; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border">
      <div>
        <p className={`text-sm ${muted ? 'text-text-muted' : ''}`}>{t.notes ?? 'Movimiento'}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-text-muted">{t.date}</p>
          {t.installment_total > 1 && (
            <span className="text-xs bg-pending/15 text-pending px-2 py-0.5 rounded-full">
              {t.installment_current} de {t.installment_total}
            </span>
          )}
        </div>
      </div>
      <p className={`font-mono amount text-sm ${muted ? 'text-text-muted' : 'text-expense'}`}>
        {formatMoney(t.amount_account, t.currency_account)}
      </p>
    </div>
  )
}
