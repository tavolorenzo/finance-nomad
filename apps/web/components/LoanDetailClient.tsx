'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Landmark,
  User,
  Calendar,
  Percent,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  FileText
} from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import { deleteLoanAction } from '@/app/(protected)/loans/actions'
import { AmortizationTable } from './AmortizationTable'
import { PayLoanInstallmentModal } from './PayLoanInstallmentModal'
import type { Account, LoanWithInstallments } from '@/lib/types'

interface LoanDetailClientProps {
  loan: LoanWithInstallments
  accounts: (Account & { institutions?: { name: string } | null })[]
}

export function LoanDetailClient({ loan, accounts }: LoanDetailClientProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [payingNext, setPayingNext] = useState(false)

  const isBorrowed = loan.direction === 'BORROWED'
  const isPaid = loan.status === 'PAID'

  const installments = [...(loan.installments || [])].sort((a, b) => a.period - b.period)
  const paidCount = installments.filter((i) => i.paid).length
  const totalCount = loan.total_installments || installments.length || 1
  const progressPercent = Math.min(100, Math.round((paidCount / totalCount) * 100))

  const nextInstallment = installments.find((i) => !i.paid)
  const remainingBalance = nextInstallment
    ? nextInstallment.balance + nextInstallment.payment
    : isPaid
    ? 0
    : loan.principal

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteLoanAction(loan.id)
      router.push('/loans')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al desactivar el préstamo.')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de navegación superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/loans"
            className="inline-flex items-center justify-center w-8 h-8 rounded-control border border-border bg-surface-1 text-text-secondary hover:text-text-primary transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
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
                  <CheckCircle2 size={11} /> Cancelado
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
              {loan.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {nextInstallment && (
            <button
              onClick={() => setPayingNext(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-white transition shadow-sm ${
                isBorrowed ? 'bg-expense hover:brightness-110' : 'bg-income hover:brightness-110'
              }`}
            >
              {isBorrowed ? (
                <>
                  <ArrowUpRight size={14} /> Pagar Cuota {nextInstallment.period}
                </>
              ) : (
                <>
                  <ArrowDownLeft size={14} /> Registrar Cobro Cuota {nextInstallment.period}
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 border border-border text-text-muted hover:text-expense hover:bg-expense/10 rounded-control transition"
            title="Desactivar préstamo"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="p-3 bg-expense/10 border border-expense/20 rounded-control text-expense text-xs">
          {deleteError}
        </div>
      )}

      {/* Tarjetas Resumen del Contrato */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-1 border border-border rounded-panel p-4 space-y-1">
          <span className="text-[11px] text-text-muted block">Capital Inicial</span>
          <div className="font-mono tabular-nums amount text-xl font-bold text-text-primary">
            {formatMoney(loan.principal, loan.currency)}
          </div>
          <span className="text-[10px] text-text-secondary">Moneda: {loan.currency}</span>
        </div>

        <div className="bg-surface-1 border border-border rounded-panel p-4 space-y-1">
          <span className="text-[11px] text-text-muted block">Saldo Restante</span>
          <div className="font-mono tabular-nums amount text-xl font-bold text-text-primary">
            {formatMoney(remainingBalance, loan.currency)}
          </div>
          <div className="text-[10px] text-text-muted">
            {paidCount} de {totalCount} cuotas canceladas ({progressPercent}%)
          </div>
        </div>

        <div className="bg-surface-1 border border-border rounded-panel p-4 space-y-1">
          <span className="text-[11px] text-text-muted block">Condiciones Financieras</span>
          <div className="font-mono tabular-nums text-base font-bold text-text-primary">
            {(loan.tea_rate * 100).toFixed(2)}% TEA
          </div>
          <div className="text-[10px] text-text-muted">
            Sistema Francés Itaú {loan.includes_vat_22 ? '· con IVA 22%' : ''}
          </div>
        </div>

        <div className="bg-surface-1 border border-border rounded-panel p-4 space-y-1">
          <span className="text-[11px] text-text-muted block">Próximo Vencimiento</span>
          {nextInstallment ? (
            <div>
              <div className="font-mono tabular-nums amount text-base font-bold text-pending">
                {formatMoney(nextInstallment.installment_amount, loan.currency)}
              </div>
              <div className="text-[10px] text-text-secondary">
                {nextInstallment.due_date ? `Vence el ${nextInstallment.due_date}` : 'Sin fecha'}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold text-income">Al día</div>
              <span className="text-[10px] text-text-muted">Préstamo totalmente amortizado</span>
            </div>
          )}
        </div>
      </div>

      {/* Notas u observaciones si existen */}
      {loan.notes && (
        <div className="p-3 bg-surface-1 border border-border rounded-control flex items-start gap-2 text-xs text-text-secondary">
          <FileText size={15} className="mt-0.5 text-text-muted shrink-0" />
          <span>{loan.notes}</span>
        </div>
      )}

      {/* Tabla de Marcha y Amortización */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-text-primary">
            Tabla de Amortización Dinámica
          </h2>
          <span className="text-xs text-text-muted">
            {installments.length} cuotas consecutivas
          </span>
        </div>

        <AmortizationTable
          loan={loan}
          installments={installments}
          accounts={accounts}
        />
      </div>

      {/* Modal de Pago de la próxima cuota */}
      {payingNext && nextInstallment && (
        <PayLoanInstallmentModal
          loan={loan}
          installment={nextInstallment}
          accounts={accounts}
          isOpen={payingNext}
          onClose={() => setPayingNext(false)}
        />
      )}

      {/* Modal de confirmación de borrado suave */}
      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-surface-1 border border-border rounded-panel p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-expense/15 text-expense flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-text-primary">
                ¿Desactivar este préstamo?
              </h3>
              <p className="text-xs text-text-muted mt-1">
                El préstamo se ocultará de tus listas activas. Los movimientos que ya asentaste en tu libro contable no se borrarán.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-3.5 py-1.5 border border-border rounded-control text-xs font-medium text-text-secondary hover:bg-surface-2 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3.5 py-1.5 rounded-control text-xs font-semibold text-white bg-expense hover:brightness-110 transition"
              >
                {deleting ? 'Desactivando...' : 'Sí, desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
