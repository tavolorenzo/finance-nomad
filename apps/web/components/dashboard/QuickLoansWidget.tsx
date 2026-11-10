'use client'

import Link from 'next/link'
import { Landmark, ArrowUpRight, ArrowDownLeft, Calendar, ArrowRight, AlertCircle } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import type { QuickLoansSummary } from '@/lib/dashboard/metrics'

interface QuickLoansWidgetProps {
  summary: QuickLoansSummary
  displayCurrency: string
}

export function QuickLoansWidget({ summary, displayCurrency }: QuickLoansWidgetProps) {
  const { loans, nextUpcomingInstallment, activeBorrowedCount, activeLentCount } = summary

  return (
    <div className="bg-surface-1 border border-border rounded-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-text-primary">
              Préstamos
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              {activeBorrowedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-expense/10 text-expense font-medium">
                  {activeBorrowedCount} tomados
                </span>
              )}
              {activeLentCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-income/10 text-income font-medium">
                  {activeLentCount} prestados
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Compromisos financieros y préstamos personales
          </p>
        </div>

        <Link
          href="/loans"
          className="text-xs text-accent font-medium hover:underline inline-flex items-center gap-1"
        >
          Ver todos <ArrowRight size={12} />
        </Link>
      </div>

      {/* Próxima cuota a vencer */}
      {nextUpcomingInstallment && (
        <div className="p-3 rounded-control bg-accent/10 border border-accent/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-full bg-accent/20 text-accent shrink-0">
              <Calendar size={14} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                Próxima cuota: {nextUpcomingInstallment.loanName}
              </p>
              <p className="text-[11px] text-text-muted">
                Vence el {nextUpcomingInstallment.dueDate} · {nextUpcomingInstallment.direction === 'BORROWED' ? 'A pagar' : 'A cobrar'}
              </p>
            </div>
          </div>

          <span className="font-mono amount text-xs font-semibold tabular-nums shrink-0 text-text-primary">
            {formatMoney(nextUpcomingInstallment.amount, nextUpcomingInstallment.currency)}
          </span>
        </div>
      )}

      {loans.length === 0 ? (
        <div className="p-5 text-center text-xs text-text-muted bg-surface-2/40 rounded-card border border-border-subtle">
          No tenés préstamos registrados actualmente.{' '}
          <Link href="/loans/new" className="text-accent font-medium hover:underline">
            Crear préstamo
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {loans.slice(0, 3).map((l) => {
            const isBorrowed = l.direction === 'BORROWED'

            return (
              <div
                key={l.id}
                className="p-3 rounded-control bg-surface-0/60 border border-border flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`p-1.5 rounded-full shrink-0 ${
                      isBorrowed ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'
                    }`}
                  >
                    {isBorrowed ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">
                      {l.name}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">
                      {l.counterparty} · {isBorrowed ? 'Por pagar' : 'Por cobrar'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`font-mono amount text-xs font-semibold tabular-nums ${
                      isBorrowed ? 'text-expense' : 'text-income'
                    }`}
                  >
                    {formatMoney(l.remainingBalance, l.currency)}
                  </p>
                  {l.nextInstallment?.dueDate && (
                    <p className="text-[10px] text-text-muted">
                      Cuota {l.nextInstallment.period}: {l.nextInstallment.dueDate}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
