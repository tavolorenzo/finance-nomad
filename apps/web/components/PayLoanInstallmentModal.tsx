'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, AlertCircle, ArrowUpRight, ArrowDownLeft, Landmark } from 'lucide-react'
import { payLoanInstallmentAction } from '@/app/(protected)/loans/actions'
import { formatMoney } from '@/lib/currency'
import type { Account, Loan, LoanInstallment } from '@/lib/types'

interface PayLoanInstallmentModalProps {
  loan: Loan
  installment: LoanInstallment
  accounts: (Account & { institutions?: { name: string } | null })[]
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PayLoanInstallmentModal({
  loan,
  installment,
  accounts,
  isOpen,
  onClose,
  onSuccess
}: PayLoanInstallmentModalProps) {
  const router = useRouter()
  const isBorrowed = loan.direction === 'BORROWED'
  const isOutcome = isBorrowed

  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Escape listener
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const interestPlusVat = Math.round(((installment.interest || 0) + (installment.vat_amount || 0)) * 100) / 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountId) {
      setError('Elegí una cuenta para registrar la operación.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await payLoanInstallmentAction({
        loanId: loan.id,
        installmentId: installment.id,
        accountId,
        paidDate
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        if (onSuccess) onSuccess()
        router.refresh()
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-installment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-surface-1 border border-border rounded-panel w-full max-w-md p-6 shadow-xl relative animate-scale-up space-y-5">
        <button
          onClick={onClose}
          disabled={saving}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition p-1"
        >
          <X size={18} />
        </button>

        {/* Cabecera */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-[11px] font-medium bg-accent/15 text-accent mb-2">
            <Landmark size={12} /> Cuota {installment.period} de {loan.total_installments}
          </div>
          <h2 id="pay-installment-title" className="font-display text-xl font-bold tracking-tight text-text-primary">
            {isOutcome ? 'Pagar Cuota de Préstamo' : 'Registrar Cobro de Cuota'}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">{loan.name}</p>
        </div>

        {/* Desglose de la cuota (Opción B) */}
        <div className="p-3.5 bg-surface-2 rounded-control border border-border-subtle space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Amortización Capital</span>
            <span className="font-mono tabular-nums amount font-medium text-text-primary">
              {formatMoney(installment.payment, loan.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Intereses {installment.vat_amount ? '(con IVA 22%)' : ''}</span>
            <span className="font-mono tabular-nums amount font-medium text-text-primary">
              {formatMoney(interestPlusVat, loan.currency)}
            </span>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-semibold">
            <span className="text-text-primary">Total Cuota</span>
            <span className={`font-mono tabular-nums amount ${isOutcome ? 'text-expense' : 'text-income'}`}>
              {formatMoney(installment.installment_amount, loan.currency)}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-expense/10 border border-expense/20 rounded-control text-expense text-xs">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pay-account-select" className="block text-xs font-medium text-text-secondary mb-1">
              {isOutcome ? 'Cuenta de débito (desde dónde pagás)' : 'Cuenta receptora (dónde cobrás)'}
            </label>
            <select
              id="pay-account-select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={saving || success}
              className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              required
            >
              <option value="" disabled>Elegí una cuenta</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency_native}) {acc.institutions?.name ? `· ${acc.institutions.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pay-date-input" className="block text-xs font-medium text-text-secondary mb-1">
              Fecha de la operación
            </label>
            <input
              id="pay-date-input"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              disabled={saving || success}
              className="w-full bg-surface-2 border border-border rounded-control px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || success}
              className="px-4 py-2 border border-border rounded-control text-xs font-medium text-text-secondary hover:bg-surface-2 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-white transition ${
                success
                  ? 'bg-income'
                  : isOutcome
                  ? 'bg-expense hover:brightness-110'
                  : 'bg-income hover:brightness-110'
              }`}
            >
              {success ? (
                <>
                  <Check size={14} /> ¡Registrado!
                </>
              ) : saving ? (
                'Procesando...'
              ) : isOutcome ? (
                <>
                  <ArrowUpRight size={14} /> Confirmar Pago
                </>
              ) : (
                <>
                  <ArrowDownLeft size={14} /> Confirmar Cobro
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
