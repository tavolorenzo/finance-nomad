'use client'

import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  ArrowRightLeft,
  Plus,
  ArrowRight
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import type { MasterTransaction, Person } from '@/lib/types'

interface RecentTransactionsWidgetProps {
  transactions: MasterTransaction[]
  peopleById: Map<string, Person>
}

export function RecentTransactionsWidget({
  transactions,
  peopleById
}: RecentTransactionsWidgetProps) {
  return (
    <div className="bg-surface-1 border border-border rounded-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-text-primary">
            Últimos Movimientos
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Registro contable reciente
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/transactions/new"
            aria-label="Cargar movimiento"
            className="p-1.5 rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-border transition"
            title="Nuevo movimiento"
          >
            <Plus size={15} />
          </Link>
          <Link
            href="/transactions"
            className="text-xs text-accent font-medium hover:underline inline-flex items-center gap-1"
          >
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 text-center text-xs text-text-muted bg-surface-2/40 rounded-card border border-border-subtle">
          Todavía no cargaste movimientos este mes.{' '}
          <Link href="/transactions/new" className="text-accent font-medium hover:underline">
            Cargar el primero
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {transactions.slice(0, 6).map((t) => {
            const isOutcome = t.type === 'OUTCOME'
            const isIncome = t.type === 'INCOME'
            const isAdjustment = t.type === 'ADJUSTMENT'
            const isTransfer = t.type === 'TRANSFER'
            const isPositiveAdj = isAdjustment && Number(t.amount_account || 0) >= 0
            const isTransferIn = isTransfer && Number(t.amount_account || 0) >= 0
            const isPending = t.status === 'PENDING'

            const person = t.person_id ? peopleById.get(t.person_id) : null
            const isThirdParty = Boolean(
              person && person.name.trim().toLowerCase() !== 'personal'
            )

            return (
              <div key={t.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-full shrink-0 ${
                      isOutcome
                        ? 'bg-expense/10 text-expense'
                        : isIncome
                          ? 'bg-income/10 text-income'
                          : isAdjustment
                            ? 'bg-pending/15 text-pending'
                            : 'bg-accent/15 text-accent'
                    }`}
                  >
                    {isOutcome && <ArrowUpRight size={13} />}
                    {isIncome && <ArrowDownLeft size={13} />}
                    {isAdjustment && <SlidersHorizontal size={12} />}
                    {isTransfer && <ArrowRightLeft size={12} />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {t.notes ||
                          (isAdjustment
                            ? 'Ajuste de saldo'
                            : isTransfer
                              ? 'Transferencia'
                              : 'Movimiento')}
                      </p>
                      {isThirdParty && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-pending/15 text-pending font-medium">
                          {person?.name}
                        </span>
                      )}
                      {t.installment_total > 1 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-2 text-text-muted font-medium">
                          {t.installment_current}/{t.installment_total}
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-pending/15 text-pending font-medium">
                          Pendiente
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">{t.date}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`font-mono amount text-xs font-semibold tabular-nums ${
                      isOutcome || (isAdjustment && !isPositiveAdj) || (isTransfer && !isTransferIn)
                        ? 'text-expense'
                        : 'text-income'
                    }`}
                  >
                    {isOutcome
                      ? '-'
                      : isAdjustment
                        ? isPositiveAdj
                          ? '+'
                          : '-'
                        : isTransfer
                          ? isTransferIn
                            ? '+'
                            : '-'
                          : '+'}
                    {formatMoney(Math.abs(t.amount_account), t.currency_account)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

