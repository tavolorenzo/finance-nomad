import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/currency'
import { isCurrentCollectibleDebt } from '@/lib/ledger/settlement'
import { formatAccountingPeriodLabel } from '@/lib/ledger/builder'
import { PersonActions } from '@/components/PersonActions'
import type { Account, Category, MasterTransaction, Person } from '@/lib/types'

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: person },
    { data: transactions },
    { data: settings },
    { data: accounts },
    { data: categories }
  ] = await Promise.all([
    supabase.from('people').select('*').eq('id', id).single<Person>(),
    supabase
      .from('master_transactions')
      .select('*')
      .eq('person_id', id)
      .order('date', { ascending: true })
      .returns<MasterTransaction[]>(),
    supabase.from('user_settings').select('whatsapp_template').maybeSingle(),
    supabase
      .from('accounts')
      .select('*, institutions(name)')
      .eq('is_active', true)
      .returns<(Account & { institutions?: { name: string } })[]>(),
    supabase.from('categories').select('*').returns<Category[]>()
  ])
  if (!person) notFound()

  const all = (transactions ?? []).filter((t) => t.type === 'OUTCOME')
  const today = new Date().toISOString().slice(0, 10)
  const pending = all.filter((t) => !t.settled_at)
  const overdueOrToday = pending.filter((t) => isCurrentCollectibleDebt(t, today))
  const upcoming = pending.filter((t) => !isCurrentCollectibleDebt(t, today))
  const settled = all.filter((t) => t.settled_at)

  const getRemaining = (t: MasterTransaction) =>
    Math.max(0, t.amount_account - (t.settled_amount ?? 0))

  const currentByCurrency = new Map<string, number>()
  for (const t of overdueOrToday) {
    const rem = getRemaining(t)
    if (rem <= 0) continue
    currentByCurrency.set(t.currency_account, (currentByCurrency.get(t.currency_account) ?? 0) + rem)
  }

  const futureByCurrency = new Map<string, number>()
  for (const t of upcoming) {
    const rem = getRemaining(t)
    if (rem <= 0) continue
    futureByCurrency.set(t.currency_account, (futureByCurrency.get(t.currency_account) ?? 0) + rem)
  }

  const totalCurrentPending = overdueOrToday.reduce((sum, t) => sum + getRemaining(t), 0)
  const fallbackCurrency = pending[0]?.currency_account ?? 'UYU'

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/people"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition"
          >
            <span>←</span>
            <span>Volver a Personas</span>
          </Link>
          <Link
            href={`/people/${person.id}/edit`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary border border-border px-3 py-1.5 rounded-control bg-surface-1 hover:bg-surface-2 transition"
          >
            <Pencil size={13} />
            <span>Editar</span>
          </Link>
        </div>

        <div className="bg-surface-1 border border-border rounded-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-xs font-semibold text-text-secondary">
                {person.name.slice(0, 2).toUpperCase()}
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight">{person.name}</h1>
              {person.is_active === false && (
                <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-surface-2 text-text-muted border border-border">
                  Desactivada
                </span>
              )}
            </div>
            {person.phone && (
              <p className="text-xs text-text-secondary mt-1">{person.phone}</p>
            )}
            <p className="text-xs text-text-muted mt-1 uppercase tracking-wider font-medium">
              Saldo por cobrar (mes contable actual)
            </p>
          </div>
          <div className="sm:text-right space-y-1">
            <p className={`font-mono tabular-nums amount text-3xl font-semibold ${totalCurrentPending > 0 ? 'text-pending' : 'text-text-muted'}`}>
              {currentByCurrency.size > 0
                ? [...currentByCurrency.entries()].map(([c, amt]) => formatMoney(amt, c)).join(' · ')
                : formatMoney(0, fallbackCurrency)}
            </p>
            {futureByCurrency.size > 0 && (
              <p className="text-xs text-text-muted">
                Próximos meses:{' '}
                <span className="font-mono tabular-nums amount font-medium text-text-secondary">
                  {[...futureByCurrency.entries()].map(([c, amt]) => formatMoney(amt, c)).join(' · ')}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <PersonActions
        person={person}
        pending={pending}
        whatsappTemplate={settings?.whatsapp_template ?? null}
        accounts={accounts ?? []}
        categories={categories ?? []}
      />

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
  const isPartial = !t.settled_at && (t.settled_amount ?? 0) > 0
  const remaining = Math.max(0, t.amount_account - (t.settled_amount ?? 0))

  return (
    <div className="flex justify-between items-center py-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium ${muted ? 'text-text-muted' : 'text-text-primary'}`}>
            {t.notes ?? 'Movimiento'}
          </p>
          {isPartial && (
            <span className="text-[10px] font-medium bg-pending/15 text-pending px-2 py-0.5 rounded-full">
              Parcial ({formatMoney(t.settled_amount!, t.currency_account)} cobrado)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-text-muted">{t.date}</p>
          {t.accounting_period && (
            <span className="text-[10px] font-medium bg-surface-2 text-text-secondary border border-border px-2 py-0.5 rounded-full">
              Resumen {formatAccountingPeriodLabel(t.accounting_period)}
            </span>
          )}
          {t.installment_total > 1 && (
            <span className="text-[10px] font-medium bg-pending/15 text-pending px-2 py-0.5 rounded-full">
              Cuota {t.installment_current} de {t.installment_total}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className={`font-mono tabular-nums amount text-sm font-medium ${muted ? 'text-text-muted' : 'text-pending'}`}>
          {formatMoney(muted ? t.amount_account : remaining, t.currency_account)}
        </p>
        {isPartial && (
          <p className="font-mono tabular-nums amount text-[11px] text-text-muted">
            de {formatMoney(t.amount_account, t.currency_account)}
          </p>
        )}
      </div>
    </div>
  )
}
