'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Pencil, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import {
  calculateAccountingPeriod,
  formatAccountingPeriodLabel
} from '@/lib/ledger/builder'
import { resolveEffectiveAccountingPeriod } from '@/lib/ledger/settlement'
import { PersonActions } from '@/components/PersonActions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import type { Account, Category, MasterTransaction, Person } from '@/lib/types'

interface PersonDetailClientProps {
  person: Person
  initialTransactions: MasterTransaction[]
  whatsappTemplate: string | null
  initialAccounts: (Account & { institutions?: { name: string } })[]
  initialCategories: Category[]
  initialPeriod: string
  todayStr: string
}

export function PersonDetailClient({
  person,
  initialTransactions,
  whatsappTemplate,
  initialAccounts,
  initialCategories,
  initialPeriod,
  todayStr
}: PersonDetailClientProps) {
  const ledger = useOptionalLedger()
  const currentPeriod = todayStr.slice(0, 7)
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod)

  const transactions = useMemo<MasterTransaction[]>(() => {
    if (ledger && ledger.recentTransactions.length > 0) {
      const localForPerson = ledger.recentTransactions.filter(
        (t) => t.person_id === person.id
      )
      if (initialTransactions.length === 0) return localForPerson
      const byId = new Map<string, MasterTransaction>()
      for (const tx of initialTransactions) {
        byId.set(tx.id, tx)
      }
      for (const local of localForPerson) {
        byId.set(local.id, local)
      }
      return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date))
    }
    return initialTransactions
  }, [initialTransactions, ledger, person.id])

  const all = useMemo(
    () => transactions.filter((t) => t.type === 'OUTCOME'),
    [transactions]
  )
  const pending = useMemo(
    () => all.filter((t) => !t.settled_at),
    [all]
  )
  const settled = useMemo(
    () => all.filter((t) => Boolean(t.settled_at)),
    [all]
  )

  const {
    periodPending,
    previousPending,
    upcoming,
    periodByCurrency,
    previousByCurrency,
    futureByCurrency,
    totalPeriodPending,
    oldestPreviousPeriod
  } = useMemo(() => {
    const getRemaining = (t: MasterTransaction) =>
      Math.max(0, t.amount_account - (t.settled_amount ?? 0))

    const periodItems: MasterTransaction[] = []
    const prevItems: MasterTransaction[] = []
    const futureItems: MasterTransaction[] = []

    const periodCurr = new Map<string, number>()
    const prevCurr = new Map<string, number>()
    const futureCurr = new Map<string, number>()

    let sumPeriod = 0
    let oldestPrev: string | null = null

    for (const t of pending) {
      const rem = getRemaining(t)
      if (rem <= 0) continue

      const effectivePeriod = resolveEffectiveAccountingPeriod(t)
      if (effectivePeriod === selectedPeriod) {
        periodItems.push(t)
        periodCurr.set(t.currency_account, (periodCurr.get(t.currency_account) ?? 0) + rem)
        sumPeriod += rem
      } else if (effectivePeriod < selectedPeriod) {
        prevItems.push(t)
        prevCurr.set(t.currency_account, (prevCurr.get(t.currency_account) ?? 0) + rem)
        if (!oldestPrev || effectivePeriod < oldestPrev) {
          oldestPrev = effectivePeriod
        }
      } else {
        futureItems.push(t)
        futureCurr.set(t.currency_account, (futureCurr.get(t.currency_account) ?? 0) + rem)
      }
    }

    return {
      periodPending: periodItems,
      previousPending: prevItems,
      upcoming: futureItems,
      periodByCurrency: periodCurr,
      previousByCurrency: prevCurr,
      futureByCurrency: futureCurr,
      totalPeriodPending: sumPeriod,
      oldestPreviousPeriod: oldestPrev
    }
  }, [pending, selectedPeriod])

  const fallbackCurrency =
    periodPending[0]?.currency_account ??
    pending[0]?.currency_account ??
    all[0]?.currency_account ??
    'UYU'

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Link
            href={`/people?period=${selectedPeriod}`}
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

        {/* Barra de Control Superior: Selector de Período Contable */}
        <div className="bg-surface-1 border border-border rounded-card p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-text-muted flex items-center gap-1.5">
              <Calendar size={14} className="text-accent" />
              <span>Período contable:</span>
            </span>
            <div className="inline-flex items-center bg-surface-2 border border-border rounded-control p-0.5">
              <button
                type="button"
                onClick={() => setSelectedPeriod((p) => calculateAccountingPeriod(p, -1))}
                aria-label="Período anterior"
                className="p-1.5 text-text-secondary hover:text-text-primary rounded-control hover:bg-surface-1 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 text-xs font-display font-semibold text-text-primary min-w-[125px] text-center">
                {formatAccountingPeriodLabel(selectedPeriod)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPeriod((p) => calculateAccountingPeriod(p, 1))}
                aria-label="Período siguiente"
                className="p-1.5 text-text-secondary hover:text-text-primary rounded-control hover:bg-surface-1 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {selectedPeriod !== currentPeriod && (
              <button
                type="button"
                onClick={() => setSelectedPeriod(currentPeriod)}
                className="text-[11px] font-medium text-accent hover:underline px-2 py-1"
              >
                Volver a {formatAccountingPeriodLabel(currentPeriod)}
              </button>
            )}
          </div>

          {oldestPreviousPeriod && (
            <button
              type="button"
              onClick={() => setSelectedPeriod(oldestPreviousPeriod)}
              className="text-[11px] font-medium text-pending hover:underline self-start sm:self-auto"
            >
              Ver saldo de {formatAccountingPeriodLabel(oldestPreviousPeriod)} →
            </button>
          )}
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
              Saldo por cobrar ({formatAccountingPeriodLabel(selectedPeriod)})
            </p>
          </div>
          <div className="sm:text-right space-y-1">
            <p
              className={`font-mono tabular-nums amount text-3xl font-semibold ${
                totalPeriodPending > 0 ? 'text-pending' : 'text-text-muted'
              }`}
            >
              {periodByCurrency.size > 0
                ? [...periodByCurrency.entries()].map(([c, amt]) => formatMoney(amt, c)).join(' · ')
                : formatMoney(0, fallbackCurrency)}
            </p>
            {previousByCurrency.size > 0 && (
              <p className="text-xs text-pending">
                Períodos anteriores:{' '}
                <span className="font-mono tabular-nums amount font-medium">
                  {[...previousByCurrency.entries()].map(([c, amt]) => formatMoney(amt, c)).join(' · ')}
                </span>
              </p>
            )}
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
        selectedPeriod={selectedPeriod}
        whatsappTemplate={whatsappTemplate}
        accounts={initialAccounts}
        categories={initialCategories}
      />

      {periodPending.length > 0 && (
        <section className="space-y-2">
          <p className="font-display text-sm font-semibold tracking-tight text-text-primary">
            Pendiente en {formatAccountingPeriodLabel(selectedPeriod)}
          </p>
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
            {periodPending.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {previousPending.length > 0 && (
        <section className="space-y-2">
          <p className="font-display text-sm font-semibold tracking-tight text-pending">
            Pendiente de períodos anteriores
          </p>
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
            {previousPending.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <p className="font-display text-sm font-semibold tracking-tight text-text-primary">
            Cuotas futuras
          </p>
          <div className="bg-surface-1 border border-border rounded-card divide-y divide-border px-4 py-1">
            {upcoming.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {settled.length > 0 && (
        <section className="space-y-2">
          <p className="font-display text-sm font-semibold tracking-tight text-text-muted">
            Historial cobrado
          </p>
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
    </div>
  )
}

function Row({ t, muted = false }: { t: MasterTransaction; muted?: boolean }) {
  const isPartial = !t.settled_at && (t.settled_amount ?? 0) > 0
  const remaining = Math.max(0, t.amount_account - (t.settled_amount ?? 0))
  const effectivePeriod = resolveEffectiveAccountingPeriod(t)
  const hasExplicitPeriod = Boolean(t.accounting_period?.trim())

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
          <span className="text-[10px] font-medium bg-surface-2 text-text-secondary border border-border px-2 py-0.5 rounded-full">
            {hasExplicitPeriod ? 'Resumen' : 'Período'} {formatAccountingPeriodLabel(effectivePeriod)}
          </span>
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

