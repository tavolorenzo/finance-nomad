'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Landmark,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  ChevronRight
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { PayLoanInstallmentModal } from './PayLoanInstallmentModal'
import type { Account, LoanWithInstallments } from '@/lib/types'

interface LoanCardProps {
  loan: LoanWithInstallments
  accounts: (Account & { institutions?: { name: string } | null })[]
}

export function LoanCard({ loan, accounts }: LoanCardProps) {
  const [payingInstallment, setPayingInstallment] = useState(false)

  const isBorrowed = loan.direction === 'BORROWED'
  const isPaid = loan.status === 'PAID'

  const installments = loan.installments || []
  const paidCount = installments.filter((i) => i.paid).length
  const totalCount = loan.total_installments || installments.length || 1
  const progressPercent = Math.min(100, Math.round((paidCount / totalCount) * 100))

  // Siguiente cuota pendiente
  const nextInstallment = installments
    .filter((i) => !i.paid)
    .sort((a, b) => a.period - b.period)[0]

  // Saldo restante actual (balance de la última cuota pagada o saldo de la próxima cuota + amortización)
  const remainingBalance = nextInstallment
    ? nextInstallment.balance + nextInstallment.payment
    : isPaid
    ? 0
    : loan.principal

  return (
    <div className="bg-surface-1 border border-border rounded-panel p-5 space-y-4 hover:border-border-subtle transition shadow-sm">
      {/* Cabecera de la Card */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold ${
                isBorrowed
                  ? 'bg-expense/15 text-expense border border-expense/20'
                  : 'bg-income/15 text-income border border-income/20'
              }`}
            >
              {isBorrowed ? (
                <>
                  <ArrowUpRight size={11} /> Mi Deuda
                </>
              ) : (
                <>
                  <ArrowDownLeft size={11} /> Por Cobrar
                </>
              )}
            </span>

            {loan.institution?.name && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-medium bg-surface-2 text-text-secondary border border-border">
                <Landmark size={10} /> {loan.institution.name}
              </span>
            )}

            {loan.person?.name && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
                <User size={10} /> {loan.person.name}
              </span>
            )}

            {isPaid && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold bg-income/15 text-income">
                <CheckCircle2 size={11} /> Finalizado
              </span>
            )}
          </div>

          <Link
            href={`/loans/${loan.id}`}
            className="font-display text-base font-bold text-text-primary hover:text-accent transition flex items-center gap-1 group"
          >
            <span>{loan.name}</span>
            <ChevronRight size={15} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-text-muted block">Saldo Restante</span>
          <span className="font-mono tabular-nums amount text-base font-bold text-text-primary">
            {formatMoney(remainingBalance, loan.currency)}
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Progreso de amortización</span>
          <span className="font-mono tabular-nums font-medium text-text-secondary">
            {paidCount} de {totalCount} cuotas ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden border border-border-subtle">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isBorrowed ? 'bg-expense' : 'bg-income'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Próximo vencimiento o estado finalizado */}
      <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {nextInstallment ? (
          <div>
            <span className="text-text-muted flex items-center gap-1 text-[11px]">
              <Clock size={12} className="text-pending" /> Próxima cuota {nextInstallment.period}/{totalCount}:
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono tabular-nums amount font-bold text-text-primary">
                {formatMoney(nextInstallment.installment_amount, loan.currency)}
              </span>
              <span className="text-[11px] text-text-secondary">
                {nextInstallment.due_date ? `Vence el ${nextInstallment.due_date}` : 'Sin fecha'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-text-muted text-[11px] flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-income" /> Todas las cuotas se encuentran canceladas
          </div>
        )}

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            href={`/loans/${loan.id}`}
            className="px-3 py-1.5 border border-border rounded-control text-xs font-medium text-text-secondary hover:bg-surface-2 transition"
          >
            Ver Tabla
          </Link>

          {nextInstallment && (
            <button
              onClick={() => setPayingInstallment(true)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-control text-xs font-semibold text-white transition ${
                isBorrowed
                  ? 'bg-expense hover:brightness-110'
                  : 'bg-income hover:brightness-110'
              }`}
            >
              {isBorrowed ? (
                <>
                  <ArrowUpRight size={13} /> Pagar Cuota
                </>
              ) : (
                <>
                  <ArrowDownLeft size={13} /> Cobrar Cuota
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {payingInstallment && nextInstallment && (
        <PayLoanInstallmentModal
          loan={loan}
          installment={nextInstallment}
          accounts={accounts}
          isOpen={payingInstallment}
          onClose={() => setPayingInstallment(false)}
        />
      )}
    </div>
  )
}
