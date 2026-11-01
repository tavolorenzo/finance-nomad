'use client'

import { useState, useMemo } from 'react'
import { Check, Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { PayLoanInstallmentModal } from './PayLoanInstallmentModal'
import type { Account, Loan, LoanInstallment } from '@/lib/types'

interface AmortizationTableProps {
  loan: Loan
  installments: LoanInstallment[]
  accounts: (Account & { institutions?: { name: string } | null })[]
}

export function AmortizationTable({ loan, installments, accounts }: AmortizationTableProps) {
  const [selectedInstallment, setSelectedInstallment] = useState<LoanInstallment | null>(null)

  // Ordenar cuotas por período ascendente
  const sorted = useMemo(() => {
    return [...installments].sort((a, b) => a.period - b.period)
  }, [installments])

  // Identificar la primera cuota pendiente (la única habilitada para pagar secuencialmente)
  const nextPendingPeriod = useMemo(() => {
    const firstUnpaid = sorted.find((inst) => !inst.paid)
    return firstUnpaid ? firstUnpaid.period : null
  }, [sorted])

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const isBorrowed = loan.direction === 'BORROWED'

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border border-border rounded-panel bg-surface-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-text-muted font-medium">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Vencimiento</th>
              <th className="py-2.5 px-3 text-right">Cuota Total</th>
              <th className="py-2.5 px-3 text-right">Capital</th>
              <th className="py-2.5 px-3 text-right">Intereses (+ IVA)</th>
              <th className="py-2.5 px-3 text-right">Saldo Restante</th>
              <th className="py-2.5 px-3 text-center">Estado</th>
              <th className="py-2.5 px-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {sorted.map((inst) => {
              const interestPlusVat = Math.round(((inst.interest || 0) + (inst.vat_amount || 0)) * 100) / 100
              const isNext = inst.period === nextPendingPeriod
              const isOverdue = !inst.paid && inst.due_date && inst.due_date < todayStr

              return (
                <tr
                  key={inst.id}
                  className={`transition-colors ${
                    inst.paid
                      ? 'bg-surface-1/40 text-text-muted'
                      : isNext
                      ? 'bg-accent/5 font-medium'
                      : 'hover:bg-surface-2/40'
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono font-medium text-text-primary">
                    {inst.period}
                  </td>
                  <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                    {inst.due_date || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums amount font-semibold text-text-primary">
                    {formatMoney(inst.installment_amount, loan.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums amount text-text-secondary">
                    {formatMoney(inst.payment, loan.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums amount text-text-muted">
                    {formatMoney(interestPlusVat, loan.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums amount text-text-secondary">
                    {formatMoney(inst.balance, loan.currency)}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {inst.paid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-medium bg-income/15 text-income">
                        <Check size={11} /> Pagada
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-medium bg-expense/15 text-expense">
                        <AlertTriangle size={11} /> Vencida
                      </span>
                    ) : isNext ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-medium bg-pending/15 text-pending">
                        <Clock size={11} /> Próxima
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-medium bg-surface-2 text-text-muted">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    {inst.paid ? (
                      <span className="text-[11px] text-text-muted">
                        {inst.paid_at ? new Date(inst.paid_at).toLocaleDateString() : 'Cancelada'}
                      </span>
                    ) : isNext ? (
                      <button
                        onClick={() => setSelectedInstallment(inst)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-control text-[11px] font-medium transition ${
                          isBorrowed
                            ? 'bg-expense text-white hover:brightness-110'
                            : 'bg-income text-white hover:brightness-110'
                        }`}
                      >
                        {isBorrowed ? (
                          <>
                            <ArrowUpRight size={12} /> Pagar
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft size={12} /> Cobrar
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-text-muted opacity-50">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedInstallment && (
        <PayLoanInstallmentModal
          loan={loan}
          installment={selectedInstallment}
          accounts={accounts}
          isOpen={!!selectedInstallment}
          onClose={() => setSelectedInstallment(null)}
        />
      )}
    </div>
  )
}
