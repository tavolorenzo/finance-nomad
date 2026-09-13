import Link from 'next/link'
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
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition mb-3"
        >
          <span>←</span>
          <span>Volver a Personas</span>
        </Link>
        <div className="bg-surface-1 border border-border rounded-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-xs font-semibold text-text-secondary">
                {person.name.slice(0, 2).toUpperCase()}
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight">{person.name}</h1>
            </div>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-wider font-medium">Saldo por cobrar</p>
          </div>
          <div>
            <p className={`font-mono text-3xl font-semibold ${totalPending > 0 ? 'text-pending' : 'text-text-muted'}`}>
              {formatMoney(totalPending, currency)}
            </p>
          </div>
        </div>
      </div>

      <PersonActions person={person} pending={pending} />

      {overdueOrToday.length > 0 && (
        <section className="space-y-2">
          <p className="font-display text-sm font-semibold tracking-tight text-text-primary">Pendiente ahora</p>
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
            {overdueOrToday.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <p className="font-display text-sm font-semibold tracking-tight text-text-primary">Cuotas futuras</p>
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
            {upcoming.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section className="space-y-2">
          <p className="font-display text-sm font-semibold tracking-tight text-text-muted">Historial cobrado</p>
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1 opacity-75">
            {settled.map((t) => (
              <Row key={t.id} t={t} muted />
            ))}
          </div>
        </section>
      )}

      {all.length === 0 && (
        <div className="bg-surface-1 border border-border rounded-card p-6 text-center text-sm text-text-muted">
          No hay movimientos asignados a {person.name} todavía.
        </div>
      )}
    </main>
  )
}

function Row({ t, muted = false }: { t: MasterTransaction; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center py-3">
      <div className="space-y-1">
        <p className={`text-sm font-medium ${muted ? 'text-text-muted' : 'text-text-primary'}`}>
          {t.notes ?? 'Movimiento'}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-text-muted">{t.date}</p>
          {t.installment_total > 1 && (
            <span className="text-[10px] font-medium bg-pending/15 text-pending px-2 py-0.5 rounded-full">
              Cuota {t.installment_current} de {t.installment_total}
            </span>
          )}
        </div>
      </div>
      <p className={`font-mono text-sm font-medium ${muted ? 'text-text-muted' : 'text-pending'}`}>
        {formatMoney(t.amount_account, t.currency_account)}
      </p>
    </div>
  )
}
