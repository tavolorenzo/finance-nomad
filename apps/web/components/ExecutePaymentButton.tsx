'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Play, X } from 'lucide-react'
import { rethrowIfRedirect } from '@/lib/next/rethrow-redirect'
import { executeBudgetPayment } from '@/app/(protected)/budget/actions'
import { useOptionalLedger } from '@/lib/ledger/ledger-context'
import { formatMoney } from '@/lib/currency'
import { calculateAccountAmount } from '@/lib/fx'
import { convertAmountSync } from '@/lib/budget/calculations'
import type { Account } from '@/lib/types'

export interface EstimateSummary {
  id: string
  name: string
  type: string
  estimated_amount: number
  currency: string
  preferred_account_id: string | null
  category_id: string | null
}

export function ExecutePaymentButton({
  estimateId,
  estimate,
  disabled,
  accounts = [],
  ratesMap = {},
  displayCurrency = 'USD'
}: {
  estimateId: string
  estimate?: EstimateSummary
  disabled: boolean
  accounts?: (Account & { institutions?: { name: string } | null })[]
  ratesMap?: Record<string, number>
  displayCurrency?: string
}) {
  const router = useRouter()
  const ledger = useOptionalLedger()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const availableAccounts = useMemo(() => {
    const list = accounts.length > 0 ? accounts : (ledger?.accounts ?? [])
    return list.filter((a) => a.is_active !== false)
  }, [accounts, ledger?.accounts])

  const defaultAccountId =
    estimate?.preferred_account_id &&
    availableAccounts.some((a) => a.id === estimate.preferred_account_id)
      ? estimate.preferred_account_id
      : availableAccounts[0]?.id ?? ''

  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId)
  const [customRate, setCustomRate] = useState<string>('')

  const selectedAccount = useMemo(
    () => availableAccounts.find((a) => a.id === (selectedAccountId || defaultAccountId)),
    [availableAccounts, selectedAccountId, defaultAccountId]
  )

  const isIncome = estimate?.type === 'INCOME_ESTIMATE'
  const actionLabel = isIncome ? 'Registrar ingreso' : 'Ejecutar pago'
  const doneLabel = isIncome ? 'Acreditado' : 'Ya ejecutado'

  const suggestedRate = useMemo(() => {
    if (!estimate || !selectedAccount) return 1
    const from = estimate.currency.toUpperCase()
    const to = selectedAccount.currency_native.toUpperCase()
    if (from === to) return 1
    const convertedOne = convertAmountSync(1, from, to, ratesMap, displayCurrency)
    return convertedOne > 0 ? Math.round(convertedOne * 10000) / 10000 : 1
  }, [estimate, selectedAccount, ratesMap, displayCurrency])

  async function runExecution(targetAccount: Account, rate: number) {
    setLoading(true)
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      if (ledger && estimate) {
        const isMultiCurrency =
          estimate.currency.toUpperCase() !== targetAccount.currency_native.toUpperCase()
        const finalRate = isMultiCurrency ? rate : 1
        const amountAccount = calculateAccountAmount(estimate.estimated_amount, 0, finalRate)

        await ledger.addTransaction({
          type: estimate.type === 'INCOME_ESTIMATE' ? 'INCOME' : 'OUTCOME',
          amountOriginal: estimate.estimated_amount,
          currencyOriginal: estimate.currency,
          feeAmount: 0,
          exchangeRate: finalRate,
          rateOverridden: isMultiCurrency,
          amountAccount,
          currencyAccount: targetAccount.currency_native,
          date: today,
          institutionId: targetAccount.institution_id,
          accountId: targetAccount.id,
          categoryId: estimate.category_id,
          personId: null,
          installmentTotal: 1,
          accountingPeriod: today.slice(0, 7),
          notes: estimate.name
        })
      } else {
        await executeBudgetPayment(estimateId, {
          accountId: targetAccount.id,
          exchangeRate: rate,
          date: today
        })
        await ledger?.refresh().catch(() => {})
      }
      setModalOpen(false)
      router.refresh()
    } catch (err) {
      rethrowIfRedirect(err)
      setError(err instanceof Error ? err.message : 'No se pudo ejecutar el pago')
    } finally {
      setLoading(false)
    }
  }

  async function handlePrimaryClick() {
    setError(null)
    if (!estimate) {
      setLoading(true)
      try {
        await executeBudgetPayment(estimateId)
        await ledger?.refresh().catch(() => {})
        router.refresh()
      } catch (err) {
        rethrowIfRedirect(err)
        setError(err instanceof Error ? err.message : 'No se pudo ejecutar el pago')
      } finally {
        setLoading(false)
      }
      return
    }

    const preferredAcc = estimate.preferred_account_id
      ? availableAccounts.find((a) => a.id === estimate.preferred_account_id)
      : undefined

    // Si tiene cuenta preferida y es de la misma moneda, ejecución 1-Tap directa
    if (
      preferredAcc &&
      preferredAcc.currency_native.toUpperCase() === estimate.currency.toUpperCase()
    ) {
      await runExecution(preferredAcc, 1)
      return
    }

    // Si no tiene cuenta preferida o las monedas difieren, abrimos confirmación rápida
    const initialAcc = preferredAcc ?? availableAccounts[0]
    if (initialAcc) {
      setSelectedAccountId(initialAcc.id)
      const from = estimate.currency.toUpperCase()
      const to = initialAcc.currency_native.toUpperCase()
      if (from !== to) {
        const conv = convertAmountSync(1, from, to, ratesMap, displayCurrency)
        setCustomRate(String(conv > 0 ? Math.round(conv * 10000) / 10000 : 1))
      } else {
        setCustomRate('1')
      }
    }
    setModalOpen(true)
  }

  async function handleConfirmModal(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAccount) {
      setError('Seleccioná una cuenta para continuar.')
      return
    }
    const isDiffCurrency =
      estimate &&
      estimate.currency.toUpperCase() !== selectedAccount.currency_native.toUpperCase()
    const parsedRate = isDiffCurrency ? Number(customRate || suggestedRate) : 1
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setError('Ingresá un tipo de cambio válido mayor a 0.')
      return
    }
    await runExecution(selectedAccount, parsedRate)
  }

  const effectiveRate =
    selectedAccount &&
    estimate &&
    estimate.currency.toUpperCase() !== selectedAccount.currency_native.toUpperCase()
      ? Number(customRate || suggestedRate) || 1
      : 1

  const previewAccountAmount = estimate
    ? calculateAccountAmount(estimate.estimated_amount, 0, effectiveRate)
    : 0

  return (
    <div>
      <button
        type="button"
        onClick={handlePrimaryClick}
        disabled={disabled || loading}
        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-control font-medium transition ${
          disabled
            ? 'bg-income/15 text-income cursor-default'
            : 'bg-accent text-[color:var(--on-accent)] hover:opacity-95 disabled:opacity-40'
        }`}
      >
        {disabled ? <Check size={13} /> : <Play size={12} />}
        <span>{loading ? 'Ejecutando...' : disabled ? doneLabel : actionLabel}</span>
      </button>
      {error && !modalOpen && <p className="text-xs text-expense mt-1">{error}</p>}

      {modalOpen && estimate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h3 className="font-display text-sm font-semibold text-text-primary">
                  {actionLabel}: {estimate.name}
                </h3>
                <p className="text-xs text-text-muted font-mono tabular-nums amount">
                  Importe estimado: {formatMoney(estimate.estimated_amount, estimate.currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar confirmación"
                className="p-1 text-text-muted hover:text-text-primary rounded-control"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmModal} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Cuenta a impactar
                </label>
                <select
                  value={selectedAccount?.id ?? ''}
                  onChange={(e) => {
                    const nextId = e.target.value
                    setSelectedAccountId(nextId)
                    const nextAcc = availableAccounts.find((a) => a.id === nextId)
                    if (nextAcc) {
                      const from = estimate.currency.toUpperCase()
                      const to = nextAcc.currency_native.toUpperCase()
                      if (from !== to) {
                        const conv = convertAmountSync(1, from, to, ratesMap, displayCurrency)
                        setCustomRate(String(conv > 0 ? Math.round(conv * 10000) / 10000 : 1))
                      } else {
                        setCustomRate('1')
                      }
                    }
                  }}
                  className="w-full bg-surface-0 border border-border rounded-control px-3 py-2 text-xs text-text-primary"
                >
                  {availableAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency_native})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAccount &&
                selectedAccount.currency_native.toUpperCase() !==
                  estimate.currency.toUpperCase() && (
                  <div className="space-y-2 p-3 rounded-control bg-surface-2/60 border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-text-secondary">
                        Tipo de cambio (1 {estimate.currency} → {selectedAccount.currency_native})
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        value={customRate}
                        onChange={(e) => setCustomRate(e.target.value)}
                        className="w-28 bg-surface-0 border border-border rounded-control px-2 py-1 text-xs text-right font-mono tabular-nums text-text-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle">
                      <span className="text-text-muted">Monto en cuenta:</span>
                      <span className="font-mono tabular-nums amount font-semibold text-text-primary">
                        {formatMoney(previewAccountAmount, selectedAccount.currency_native)}
                      </span>
                    </div>
                  </div>
                )}

              {error && <p className="text-xs text-expense">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary rounded-control"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedAccount}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-accent text-[color:var(--on-accent)] rounded-control disabled:opacity-40"
                >
                  {loading ? 'Registrando...' : 'Confirmar movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
